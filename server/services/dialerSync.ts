/**
 * Dialer Contact Sync — keeps dialer_contacts (Neon DB) in sync with
 * dashboard events (applications, underwriting decisions).
 *
 * dialer_contacts is the master contact hub. When something happens in
 * the dashboard, we update the corresponding dialer_contacts row so both
 * CRMs (GHL + SF) can see the latest state.
 *
 * Writes go through neonPool — the dedicated Neon connection for dialer tables.
 */

import { neonPool } from "../db";

function log(msg: string) {
  console.log(`[Dialer Sync] ${msg}`);
}

/**
 * After a loan_application is saved, update the matching dialer_contacts row
 * with the latest application data and any SF IDs from the sync.
 */
export async function syncApplicationToDialer(
  app: Record<string, any>,
  sfResult?: { accountId?: string; contactId?: string; oppId?: string }
): Promise<{ updated: boolean; dialerId?: number; error?: string }> {
  if (!neonPool) {
    return { updated: false, error: "neonPool not configured" };
  }

  try {
    const ghlId = app.ghlContactId || app.ghl_contact_id;
    const email = (app.email || app.business_email || "").toLowerCase().trim();

    if (!ghlId && !email) {
      return { updated: false, error: "no ghl_contact_id or email to match" };
    }

    // Find the dialer_contacts row
    let row: any = null;
    if (ghlId) {
      const result = await neonPool.query(
        "SELECT id FROM dialer_contacts WHERE ghl_contact_id = $1 LIMIT 1",
        [ghlId]
      );
      row = result.rows[0];
    }
    if (!row && email) {
      const result = await neonPool.query(
        "SELECT id FROM dialer_contacts WHERE LOWER(email) = $1 LIMIT 1",
        [email]
      );
      row = result.rows[0];
    }

    if (!row) {
      log(`No dialer_contacts match for ghl=${ghlId || "?"} email=${email || "?"} — skipping`);
      return { updated: false, error: "no matching dialer_contacts row" };
    }

    // Build SET clause — only update non-null fields
    const sets: string[] = [];
    const vals: any[] = [];
    let idx = 1;

    function set(col: string, val: any) {
      if (val !== undefined && val !== null && val !== "") {
        sets.push(`${col} = $${idx}`);
        vals.push(val);
        idx++;
      }
    }

    // Business fields from application
    set("business_name", app.businessName || app.business_name || app.legalBusinessName || app.legal_business_name);
    set("doing_business_as", app.doingBusinessAs || app.doing_business_as);
    set("first_name", app.fullName?.split?.(" ")?.[0] || app.full_name?.split?.(" ")?.[0]);
    set("last_name", app.fullName?.split?.(" ")?.slice?.(1)?.join?.(" ") || app.full_name?.split?.(" ")?.slice?.(1)?.join?.(" "));
    set("email", email);
    set("phone", app.phone);
    set("monthly_revenue", app.monthlyRevenue || app.monthly_revenue);
    set("amount_requested", app.requestedAmount || app.requested_amount);
    set("industry_dropdown", app.industry);
    set("personal_credit_score_range", app.creditScore || app.credit_score || app.personalCreditScoreRange || app.personal_credit_score_range);
    set("street_address", app.businessAddress || app.business_address || app.businessStreetAddress || app.business_street_address);
    set("city", app.city);
    set("state", app.state);
    set("postal_code", app.zipCode || app.zip_code);
    set("ein", app.ein);
    set("primary_business_bank", app.bankName || app.bank_name);
    set("website", app.companyWebsite || app.company_website);

    // SF IDs if provided
    if (sfResult?.accountId) set("sf_account_id", sfResult.accountId);
    if (sfResult?.contactId) set("sf_contact_id", sfResult.contactId);
    if (sfResult?.oppId) {
      set("sf_opportunity_id", sfResult.oppId);
      const sfBase = process.env.SF_INSTANCE_URL || "";
      if (sfBase) set("sf_opportunity_url", `${sfBase}/lightning/r/Opportunity/${sfResult.oppId}/view`);
    }

    // Always update timestamp
    sets.push(`updated_at = NOW()`);
    if (sfResult?.oppId) sets.push(`sf_last_synced_at = NOW()`);

    if (sets.length <= 1) {
      // Only updated_at — nothing meaningful to sync
      return { updated: false, error: "no fields to update" };
    }

    const sql = `UPDATE dialer_contacts SET ${sets.join(", ")} WHERE id = $${idx}`;
    vals.push(row.id);

    await neonPool.query(sql, vals);
    log(`Updated dialer_contacts id=${row.id} (${sets.length - 1} fields)`);
    return { updated: true, dialerId: row.id };

  } catch (err: any) {
    console.error("[Dialer Sync] Error:", err.message);
    return { updated: false, error: err.message };
  }
}

/**
 * After an underwriting decision is created/updated, update the matching
 * dialer_contacts row with the decision status and SF IDs.
 */
export async function syncDecisionToDialer(
  decision: Record<string, any>,
  sfResult?: { oppId?: string; action?: string }
): Promise<{ updated: boolean; dialerId?: number; error?: string }> {
  if (!neonPool) {
    return { updated: false, error: "neonPool not configured" };
  }

  try {
    const email = (decision.business_email || decision.businessEmail || "").toLowerCase().trim();
    const ghlOppId = decision.ghl_opportunity_id || decision.ghlOpportunityId;

    if (!email) {
      return { updated: false, error: "no business_email to match" };
    }

    // Find the dialer_contacts row by email
    const result = await neonPool.query(
      "SELECT id, ghl_contact_id FROM dialer_contacts WHERE LOWER(email) = $1 LIMIT 1",
      [email]
    );
    const row = result.rows[0];

    if (!row) {
      log(`No dialer_contacts match for decision email=${email} — skipping`);
      return { updated: false, error: "no matching dialer_contacts row" };
    }

    const status = decision.status || "";
    const sets: string[] = [];
    const vals: any[] = [];
    let idx = 1;

    function set(col: string, val: any) {
      if (val !== undefined && val !== null && val !== "") {
        sets.push(`${col} = $${idx}`);
        vals.push(val);
        idx++;
      }
    }

    // Map decision status to GHL-style opp stage for dialer display
    const stageMap: Record<string, string> = {
      approved: "Approved",
      declined: "Declined",
      funded: "Funded",
      unqualified: "Unqualified",
    };
    set("opp_stage_selection", stageMap[status] || status);

    // SF sync results
    if (sfResult?.oppId) {
      set("sf_opportunity_id", sfResult.oppId);
      const sfBase = process.env.SF_INSTANCE_URL || "";
      if (sfBase) set("sf_opportunity_url", `${sfBase}/lightning/r/Opportunity/${sfResult.oppId}/view`);

      // Map decision status to SF stage for display
      const sfStageMap: Record<string, string> = {
        approved: "Present Offer",
        declined: "Closed Lost",
        funded: "Closed Won",
        unqualified: "Closed Lost",
      };
      set("sf_stage", sfStageMap[status] || "Application & Docs");
      set("sf_opp_stage", sfStageMap[status] || "Application & Docs");
    }

    // Financial fields
    const amount = decision.advance_amount || decision.advanceAmount;
    if (amount) {
      set("sf_opp_amount", parseFloat(String(amount).replace(/[$,]/g, "")) || null);
      set("sf_amount_requested", parseFloat(String(amount).replace(/[$,]/g, "")) || null);
    }

    // Timestamps
    sets.push("updated_at = NOW()");
    sets.push("sf_last_synced_at = NOW()");

    if (sets.length <= 2) {
      return { updated: false, error: "no fields to update" };
    }

    const sql = `UPDATE dialer_contacts SET ${sets.join(", ")} WHERE id = $${idx}`;
    vals.push(row.id);

    await neonPool.query(sql, vals);
    log(`Updated dialer_contacts id=${row.id} for decision: status=${status}`);
    return { updated: true, dialerId: row.id };

  } catch (err: any) {
    console.error("[Dialer Sync] Decision error:", err.message);
    return { updated: false, error: err.message };
  }
}

/**
 * Update dialer_contacts with SF data from an inbound poll.
 * Called by Phase 5 (SF → dashboard) when SF records have changed.
 */
export async function updateDialerFromSfOpp(
  oppData: { oppId: string; stage: string; amount?: number; closeDate?: string; ownerName?: string },
  matchBy: { email?: string; ghlContactId?: string; sfOpportunityId?: string }
): Promise<{ updated: boolean; error?: string }> {
  if (!neonPool) return { updated: false, error: "neonPool not configured" };

  try {
    let row: any = null;

    // Match priority: sf_opportunity_id > ghl_contact_id > email
    if (matchBy.sfOpportunityId) {
      const r = await neonPool.query(
        "SELECT id FROM dialer_contacts WHERE sf_opportunity_id = $1 LIMIT 1",
        [matchBy.sfOpportunityId]
      );
      row = r.rows[0];
    }
    if (!row && matchBy.ghlContactId) {
      const r = await neonPool.query(
        "SELECT id FROM dialer_contacts WHERE ghl_contact_id = $1 LIMIT 1",
        [matchBy.ghlContactId]
      );
      row = r.rows[0];
    }
    if (!row && matchBy.email) {
      const r = await neonPool.query(
        "SELECT id FROM dialer_contacts WHERE LOWER(email) = $1 LIMIT 1",
        [matchBy.email.toLowerCase().trim()]
      );
      row = r.rows[0];
    }

    if (!row) return { updated: false, error: "no match" };

    const sfBase = process.env.SF_INSTANCE_URL || "";
    await neonPool.query(
      `UPDATE dialer_contacts SET
        sf_opportunity_id = COALESCE($1, sf_opportunity_id),
        sf_opp_stage = $2,
        sf_stage = $2,
        sf_opp_amount = COALESCE($3, sf_opp_amount),
        sf_close_date = COALESCE($4, sf_close_date),
        sf_owner_name = COALESCE($5, sf_owner_name),
        sf_opportunity_url = COALESCE($6, sf_opportunity_url),
        sf_last_synced_at = NOW(),
        updated_at = NOW()
      WHERE id = $7`,
      [
        oppData.oppId,
        oppData.stage,
        oppData.amount || null,
        oppData.closeDate || null,
        oppData.ownerName || null,
        sfBase ? `${sfBase}/lightning/r/Opportunity/${oppData.oppId}/view` : null,
        row.id,
      ]
    );

    return { updated: true };
  } catch (err: any) {
    return { updated: false, error: err.message };
  }
}
