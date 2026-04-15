/**
 * Salesforce Inbound Poll (Phase 5)
 *
 * Periodically queries SF for recently modified Opportunities and pushes
 * changes back to the dashboard DB + dialer_contacts.
 *
 * Designed to run as a cron-like endpoint: POST /api/admin/sf-poll
 * Can also be called from a setInterval in the server process.
 *
 * Direction: SF → dashboard main DB → dialer_contacts → (optionally) GHL
 */

import { db } from "../db";
import { businessUnderwritingDecisions } from "@shared/schema";
import { eq, sql as drizzleSql } from "drizzle-orm";
import { updateDialerFromSfOpp } from "./dialerSync";
import { computePipelineBucket } from "./salesforce";

const SF_INSTANCE_URL = process.env.SF_INSTANCE_URL;
const SF_REFRESH_TOKEN = process.env.SF_REFRESH_TOKEN;
const SF_LOGIN_URL = process.env.SF_LOGIN_URL || "https://test.salesforce.com";

let cachedToken = "";
let tokenExp = 0;

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExp) return cachedToken;
  if (!SF_REFRESH_TOKEN) return process.env.SF_ACCESS_TOKEN || "";

  try {
    const res = await fetch(`${SF_LOGIN_URL}/services/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: SF_REFRESH_TOKEN,
        client_id: "PlatformCLI",
      }),
    });
    const data = await res.json() as any;
    if (data.access_token) {
      cachedToken = data.access_token;
      tokenExp = Date.now() + 90 * 60 * 1000;
      return cachedToken;
    }
  } catch {}
  return cachedToken || process.env.SF_ACCESS_TOKEN || "";
}

async function sfQuery(soql: string): Promise<any[]> {
  const token = await getToken();
  if (!token || !SF_INSTANCE_URL) return [];
  try {
    const res = await fetch(
      `${SF_INSTANCE_URL}/services/data/v66.0/query?q=${encodeURIComponent(soql)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (res.status === 401 && SF_REFRESH_TOKEN) {
      tokenExp = 0;
      const fresh = await getToken();
      const retry = await fetch(
        `${SF_INSTANCE_URL}/services/data/v66.0/query?q=${encodeURIComponent(soql)}`,
        { headers: { Authorization: `Bearer ${fresh}` } }
      );
      return ((await retry.json()) as any).records || [];
    }
    return ((await res.json()) as any).records || [];
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// State: last poll timestamp stored in system_settings via main DB
// ---------------------------------------------------------------------------
async function getLastPollTime(): Promise<string> {
  try {
    const result = await db.execute(
      drizzleSql`SELECT value FROM system_settings WHERE key = 'sf_poll_last_run'`
    );
    const rows = result.rows as any[];
    if (rows.length && rows[0].value) return rows[0].value;
  } catch {}
  // Default: 1 hour ago
  return new Date(Date.now() - 60 * 60 * 1000).toISOString();
}

async function setLastPollTime(ts: string): Promise<void> {
  try {
    await db.execute(
      drizzleSql`INSERT INTO system_settings (key, value, updated_at)
        VALUES ('sf_poll_last_run', ${ts}, NOW())
        ON CONFLICT (key) DO UPDATE SET value = ${ts}, updated_at = NOW()`
    );
  } catch (err: any) {
    console.error("[SF Poll] Failed to save last-poll time:", err.message);
  }
}

// ---------------------------------------------------------------------------
// SF stage → dashboard status mapping (reverse of dashboardStatusToSfStage)
// ---------------------------------------------------------------------------
function sfStageToStatus(stage: string): string | null {
  const map: Record<string, string> = {
    "Present Offer": "approved",
    "Closed Won": "funded",
    "Closed Lost": "declined",
    "Application & Docs": null as any,
    "Underwriting": null as any,
    "Contracts Out": null as any,
    "Contracts In": null as any,
    "Final Review": null as any,
  };
  return map[stage] ?? null;
}

// ---------------------------------------------------------------------------
// Main poll function
// ---------------------------------------------------------------------------
export async function pollSalesforceChanges(): Promise<{
  polled: number;
  dashboardUpdated: number;
  dialerUpdated: number;
  errors: number;
  since: string;
}> {
  const results = { polled: 0, dashboardUpdated: 0, dialerUpdated: 0, errors: 0, since: "" };

  if (!SF_INSTANCE_URL) {
    console.log("[SF Poll] Skipped — SF_INSTANCE_URL not configured");
    return results;
  }

  const since = await getLastPollTime();
  results.since = since;
  const sinceFormatted = since.replace("T", " ").replace("Z", "+00:00").slice(0, 23) + "+00:00";

  console.log(`[SF Poll] Checking for Opportunities modified since ${since}`);

  // Query SF for recently modified Opportunities
  const opps = await sfQuery(
    `SELECT Id, Name, StageName, CloseDate, Amount_Requested__c, Amount_Funded__c,
            Highest_Approval__c, Factor_Rate__c, Email__c, Phone_Number__c,
            GHL_Id__c, Primary_Contact__c, AccountId, Owner.Name,
            Engagement_Status__c, LastModifiedDate
     FROM Opportunity
     WHERE LastModifiedDate > ${sinceFormatted}
     ORDER BY LastModifiedDate ASC`
  );

  results.polled = opps.length;
  console.log(`[SF Poll] Found ${opps.length} modified Opportunities`);

  for (const opp of opps) {
    try {
      const email = (opp.Email__c || "").toLowerCase().trim();
      const stage = opp.StageName || "";
      const dashboardStatus = sfStageToStatus(stage);
      const hasApproval = !!(opp.Highest_Approval__c && parseFloat(opp.Highest_Approval__c) > 0);
      const expectedBucket = computePipelineBucket(stage, hasApproval);
      const currentBucket = opp.Engagement_Status__c || "";

      // Auto-set Pipeline Bucket if it doesn't match the computed value
      if (currentBucket !== expectedBucket) {
        try {
          const token = await getToken();
          await fetch(`${SF_INSTANCE_URL}/services/data/v66.0/sobjects/Opportunity/${opp.Id}`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ Engagement_Status__c: expectedBucket }),
          });
        } catch {}
      }
      const ownerName = opp.Owner?.Name || "";

      // --- Update dashboard main DB (business_underwriting_decisions) ---
      // Only update if SF stage maps to a meaningful dashboard status
      if (dashboardStatus && email) {
        try {
          // Find the matching decision by email
          const decisions = await db
            .select({ id: businessUnderwritingDecisions.id, status: businessUnderwritingDecisions.status })
            .from(businessUnderwritingDecisions)
            .where(eq(businessUnderwritingDecisions.businessEmail, email))
            .limit(1);

          if (decisions.length > 0) {
            const d = decisions[0];
            // Only update if the status actually changed (SF wins for rep-driven changes)
            if (d.status !== dashboardStatus) {
              await db
                .update(businessUnderwritingDecisions)
                .set({
                  status: dashboardStatus,
                  sfSynced: true,
                  sfSyncedAt: new Date(),
                  sfSyncMessage: `Inbound poll: stage=${stage}`,
                  sfOpportunityId: opp.Id,
                  updatedAt: new Date(),
                })
                .where(eq(businessUnderwritingDecisions.id, d.id));

              console.log(`[SF Poll] Dashboard updated: ${email} → status=${dashboardStatus} (was ${d.status})`);
              results.dashboardUpdated++;
            }
          }
        } catch (dbErr: any) {
          console.error(`[SF Poll] Dashboard update error for ${email}:`, dbErr.message);
          results.errors++;
        }
      }

      // --- Update dialer_contacts ---
      try {
        const dialerResult = await updateDialerFromSfOpp(
          {
            oppId: opp.Id,
            stage: stage,
            amount: opp.Amount_Requested__c ? parseFloat(opp.Amount_Requested__c) : undefined,
            closeDate: opp.CloseDate || undefined,
            ownerName: ownerName,
          },
          {
            sfOpportunityId: opp.Id,
            ghlContactId: opp.GHL_Id__c || undefined,
            email: email || undefined,
          }
        );

        if (dialerResult.updated) {
          results.dialerUpdated++;
        }
      } catch (dialerErr: any) {
        console.error(`[SF Poll] Dialer update error for ${opp.Name}:`, dialerErr.message);
        results.errors++;
      }

    } catch (err: any) {
      console.error(`[SF Poll] Error processing ${opp.Name}:`, err.message);
      results.errors++;
    }
  }

  // Save the poll timestamp (use now, not the last opp's modified date, to avoid gaps)
  await setLastPollTime(new Date().toISOString());

  console.log(`[SF Poll] Done: polled=${results.polled}, dashboard=${results.dashboardUpdated}, dialer=${results.dialerUpdated}, errors=${results.errors}`);
  return results;
}
