/**
 * Salesforce Sync — creates/updates SF records when a new application is saved.
 *
 * Auth: uses SF_REFRESH_TOKEN to auto-refresh the access token via OAuth2.
 * Falls back to SF_ACCESS_TOKEN if refresh token is not configured.
 * Tokens are cached in memory and refreshed on 401 or expiry.
 */

const SF_INSTANCE_URL = process.env.SF_INSTANCE_URL;
const SF_REFRESH_TOKEN = process.env.SF_REFRESH_TOKEN;
const SF_LOGIN_URL = process.env.SF_LOGIN_URL || "https://test.salesforce.com";

let cachedAccessToken = process.env.SF_ACCESS_TOKEN || "";
let tokenExpiresAt = 0;

async function refreshAccessToken(): Promise<string> {
  if (!SF_REFRESH_TOKEN) return cachedAccessToken;
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
      cachedAccessToken = data.access_token;
      tokenExpiresAt = Date.now() + 90 * 60 * 1000;
      console.log("[SF Auth] Token refreshed successfully");
      return cachedAccessToken;
    }
    console.error("[SF Auth] Refresh failed:", data.error, data.error_description);
    return cachedAccessToken;
  } catch (err: any) {
    console.error("[SF Auth] Refresh error:", err.message);
    return cachedAccessToken;
  }
}

export async function getAccessToken(): Promise<string> {
  if (!cachedAccessToken || Date.now() > tokenExpiresAt) {
    return refreshAccessToken();
  }
  return cachedAccessToken;
}

function sfHeaders(token: string) {
  return { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" };
}

async function sfApi(method: string, path: string, body?: object): Promise<{ success: boolean; id?: string; data?: any; error?: string }> {
  try {
    let token = await getAccessToken();
    let res = await fetch(`${SF_INSTANCE_URL}/services/data/v66.0${path}`, {
      method, headers: sfHeaders(token), body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 401 && SF_REFRESH_TOKEN) {
      tokenExpiresAt = 0;
      token = await refreshAccessToken();
      res = await fetch(`${SF_INSTANCE_URL}/services/data/v66.0${path}`, {
        method, headers: sfHeaders(token), body: body ? JSON.stringify(body) : undefined,
      });
    }
    if (res.status === 204) return { success: true };
    const data = await res.json();
    if (res.ok) return { success: true, id: data.id, data };
    const msg = Array.isArray(data) ? data.map((e: any) => e.message).join("; ") : data.message || JSON.stringify(data);
    return { success: false, error: msg };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

async function sfQuery(soql: string): Promise<any[]> {
  try {
    const token = await getAccessToken();
    const res = await fetch(
      `${SF_INSTANCE_URL}/services/data/v66.0/query?q=${encodeURIComponent(soql)}`,
      { headers: sfHeaders(token) }
    );
    if (res.status === 401 && SF_REFRESH_TOKEN) {
      tokenExpiresAt = 0;
      const fresh = await refreshAccessToken();
      const retry = await fetch(
        `${SF_INSTANCE_URL}/services/data/v66.0/query?q=${encodeURIComponent(soql)}`,
        { headers: sfHeaders(fresh) }
      );
      return ((await retry.json()) as any).records || [];
    }
    return ((await res.json()) as any).records || [];
  } catch { return []; }
}

const US_STATES = new Set([
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS",
  "KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY",
  "NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC"
]);

function parseNum(v: any): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(String(v).replace(/[$,]/g, ""));
  return isNaN(n) ? null : n;
}

function mapCreditScore(v: any): string | null {
  if (!v) return null;
  const n = parseInt(v);
  if (isNaN(n)) return String(v);
  if (n >= 800) return "800+";
  if (n >= 750) return "750-799";
  if (n >= 700) return "700-749";
  if (n >= 650) return "650-699";
  if (n >= 600) return "600-649";
  if (n >= 550) return "550-599";
  if (n >= 500) return "500-549";
  return "Below 500";
}

function mapIndustry(v: any): string | null {
  if (!v) return null;
  const map: Record<string, string> = {
    "Construction": "Construction",
    "Transportation": "Transportation",
    "Health Services": "Healthcare",
    "Retail": "Retail",
    "Professional Services": "Professional Services",
    "Utilities and Home Services": "Construction",
    "Hospitality": "Hospitality",
    "Restaurant": "Restaurant",
  };
  return map[v] || v;
}

function clean(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== null && v !== undefined && v !== "") result[k] = v;
  }
  return result;
}

/**
 * Stage mapping: dashboard underwriting decision status → SF Opportunity stage.
 */
export function dashboardStatusToSfStage(status: string): string {
  const map: Record<string, string> = {
    approved: "Present Offer",
    declined: "Closed Lost",
    funded: "Closed Won",
    unqualified: "Closed Lost",
  };
  return map[status?.toLowerCase()] || "Application & Docs";
}

/**
 * Auto-compute Pipeline Bucket (Engagement_Status__c) from stage + approval data.
 * Reps can override manually; this sets the default whenever stage changes.
 */
export function computePipelineBucket(stage: string, hasApproval?: boolean): string {
  switch (stage) {
    case "Present Offer":
    case "Contracts Out":
    case "Contracts In":
    case "Final Review":
    case "Negotiate":
      return hasApproval ? "Hot Pipeline" : "Warm Pipeline";
    case "Underwriting":
      return "Underwriting";
    case "Application & Docs":
      return "Working";
    case "Renewal Prospecting":
      return "Renewal";
    case "Closed Won":
      return "Closed Won";
    case "Closed Lost":
      return "Closed Lost";
    default:
      return "Working";
  }
}

/**
 * Main sync function — call this after saving a loan_application.
 * UPDATE-ONLY: searches for existing SF Leads and Opportunities by email/phone,
 * updates them with application data. Does NOT create new records.
 */
export async function syncApplicationToSalesforce(app: Record<string, any>): Promise<{ synced: boolean; action?: string; accountId?: string; contactId?: string; oppId?: string; leadId?: string; reason?: string; error?: string }> {
  if (!SF_INSTANCE_URL || (!cachedAccessToken && !SF_REFRESH_TOKEN)) {
    console.log("[SF Sync] Skipped — no SF credentials configured");
    return { synced: false, reason: "no credentials" };
  }

  try {
    const email = app.email || app.business_email || "";
    const phone = app.phone || "";
    const fullName = app.fullName || app.full_name || "";
    const businessName = app.businessName || app.business_name || app.legalBusinessName || "";
    const state = (app.state || "").toUpperCase().trim();

    if (!email && !phone) {
      return { synced: false, reason: "no email or phone to match" };
    }

    console.log(`[SF Sync] Processing (update-only): ${businessName || fullName || email}`);

    // Application fields to push to both Leads and Opportunities
    const appFields = clean({
      Amount_Requested__c: parseNum(app.requestedAmount || app.requested_amount),
      Monthly_Revenue__c: parseNum(app.monthlyRevenue || app.monthly_revenue),
      Personal_Credit_Score_Range__c: mapCreditScore(app.creditScore || app.credit_score || app.personalCreditScoreRange || app.personal_credit_score_range),
      Primary_Business_Bank__c: app.bankName || app.bank_name || null,
      Purpose_Of_Funds__c: app.useOfFunds || app.use_of_funds || null,
      Funding_Time_Frame__c: app.fundingUrgency || app.funding_urgency || null,
      MCA_Balance_Amount__c: parseNum(app.mcaBalanceAmount || app.mca_balance_amount),
    });

    // Additional fields only applicable to Leads
    const leadOnlyFields = clean({
      Company: businessName || null,
      Company_Name__c: businessName || null,
      Doing_Business_As__c: app.doingBusinessAs || app.doing_business_as || null,
      EIN__c: app.ein || null,
      Industry: mapIndustry(app.industry),
      Business_Start_Date__c: app.businessStartDate || app.business_start_date || null,
      Ownership_Percentage__c: parseNum(app.ownership || app.ownerPercentage || app.owner_percentage),
      Do_You_Process_Credit_Cards__c: app.doYouProcessCreditCards || app.do_you_process_credit_cards || null,
      UTM_Source__c: app.utmSource || app.utm_source || null,
      Application_URL__c: app.agentViewUrl || app.agent_view_url || null,
    });

    // Additional fields only applicable to Opportunities
    const oppOnlyFields = clean({
      Industry__c: mapIndustry(app.industry),
      Doing_Business_As_DBA__c: businessName || null,
      Phone_Number__c: phone || null,
      Email__c: email || null,
    });

    const digits = phone ? phone.replace(/\D/g, "").slice(-10) : "";
    let updated = false;
    let leadId: string | undefined;
    let oppId: string | undefined;

    // --- 1. Search and update existing Lead ---
    let existingLead: any = null;

    if (email) {
      const byEmail = await sfQuery(
        `SELECT Id, Name FROM Lead WHERE Email = '${email.replace(/'/g, "\\'")}' AND IsConverted = false LIMIT 1`
      );
      if (byEmail.length) existingLead = byEmail[0];
    }

    if (!existingLead && digits.length === 10) {
      const byPhone = await sfQuery(
        `SELECT Id, Name FROM Lead WHERE Phone LIKE '%${digits}' AND IsConverted = false LIMIT 1`
      );
      if (byPhone.length) existingLead = byPhone[0];
    }

    if (existingLead) {
      const leadUpdate = clean({ ...appFields, ...leadOnlyFields });
      if (Object.keys(leadUpdate).length > 0) {
        const res = await sfApi("PATCH", `/sobjects/Lead/${existingLead.Id}`, leadUpdate);
        if (res.success) {
          console.log(`[SF Sync] Updated Lead: ${existingLead.Name} (${existingLead.Id}) — ${Object.keys(leadUpdate).length} fields`);
          leadId = existingLead.Id;
          updated = true;
        } else {
          console.log(`[SF Sync] Lead update failed: ${res.error}`);
        }
      }
    }

    // --- 2. Search and update existing Opportunity ---
    let existingOpp: any = null;

    if (email) {
      const byEmail = await sfQuery(
        `SELECT Id, Name, AccountId FROM Opportunity WHERE Email__c = '${email.replace(/'/g, "\\'")}' LIMIT 1`
      );
      if (byEmail.length) existingOpp = byEmail[0];
    }

    if (!existingOpp && digits.length === 10) {
      const byPhone = await sfQuery(
        `SELECT Id, Name, AccountId FROM Opportunity WHERE Phone_Number__c LIKE '%${digits}' LIMIT 1`
      );
      if (byPhone.length) existingOpp = byPhone[0];
    }

    // Fallback: Contact email → Account → Opportunity
    if (!existingOpp && email) {
      const byAcctContact = await sfQuery(
        `SELECT Id, Name, AccountId FROM Opportunity WHERE AccountId IN (SELECT AccountId FROM Contact WHERE Email = '${email.replace(/'/g, "\\'")}') LIMIT 1`
      );
      if (byAcctContact.length) existingOpp = byAcctContact[0];
    }

    if (existingOpp) {
      const oppUpdate = clean({ ...appFields, ...oppOnlyFields });
      if (Object.keys(oppUpdate).length > 0) {
        const res = await sfApi("PATCH", `/sobjects/Opportunity/${existingOpp.Id}`, oppUpdate);
        if (res.success) {
          console.log(`[SF Sync] Updated Opp: ${existingOpp.Name} (${existingOpp.Id}) — ${Object.keys(oppUpdate).length} fields`);
          oppId = existingOpp.Id;
          updated = true;
        } else {
          console.log(`[SF Sync] Opp update failed: ${res.error}`);
        }
      }

      // Also update the parent Account if we have business details
      if (existingOpp.AccountId) {
        const acctUpdate = clean({
          Company_Name__c: businessName || null,
          Doing_Business_As__c: app.doingBusinessAs || app.doing_business_as || null,
          EIN__c: app.ein || null,
          Industry: mapIndustry(app.industry),
          Monthly_Revenue__c: parseNum(app.monthlyRevenue || app.monthly_revenue),
          Primary_Business_Bank__c: app.bankName || app.bank_name || null,
          Phone: phone || null,
          Website: app.companyWebsite || app.company_website || null,
          BillingCity: app.city || null,
          ...(US_STATES.has(state) ? { BillingStateCode: state } : {}),
          BillingPostalCode: app.zipCode || app.zip_code || null,
          ...((state || app.city) ? { BillingCountryCode: "US" } : {}),
        });
        if (Object.keys(acctUpdate).length > 0) {
          await sfApi("PATCH", `/sobjects/Account/${existingOpp.AccountId}`, acctUpdate);
        }
      }
    }

    if (updated) {
      return {
        synced: true,
        action: "updated",
        leadId,
        oppId,
        accountId: existingOpp?.AccountId,
      };
    }

    // --- Auto-create for Dillon's apps only ---
    const agentName = (app.agentName || app.agent_name || "").toLowerCase();
    const agentEmail = (app.agentEmail || app.agent_email || "").toLowerCase();
    const isDillon = agentName.includes("dillon") || agentEmail.includes("dillon");

    if (!isDillon) {
      console.log(`[SF Sync] No existing Lead or Opportunity found for ${email || phone} — skipping (update-only, not Dillon's)`);
      return { synced: false, reason: "no existing SF record to update" };
    }

    console.log(`[SF Sync] Dillon's app — auto-creating SF records for ${businessName || email}`);

    // If we found a Lead earlier, convert it first
    if (existingLead) {
      try {
        const token = await getAccessToken();
        // Convert Lead via SOAP API
        const soapBody = `<?xml version="1.0" encoding="utf-8"?>
          <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:sf="urn:partner.soap.sforce.com">
            <soapenv:Header><sf:SessionHeader><sf:sessionId>${token}</sf:sessionId></sf:SessionHeader></soapenv:Header>
            <soapenv:Body>
              <sf:convertLead><sf:leadConverts>
                <sf:leadId>${existingLead.Id}</sf:leadId>
                <sf:convertedStatus>Qualified</sf:convertedStatus>
                <sf:doNotCreateOpportunity>false</sf:doNotCreateOpportunity>
              </sf:leadConverts></sf:convertLead>
            </soapenv:Body>
          </soapenv:Envelope>`;

        const convRes = await fetch(`${SF_INSTANCE_URL}/services/Soap/u/66.0`, {
          method: "POST",
          headers: { "Content-Type": "text/xml", "SOAPAction": "convertLead" },
          body: soapBody,
        });
        const convText = await convRes.text();

        // Parse SOAP response for IDs
        const getTag = (tag: string) => {
          const m = convText.match(new RegExp(`<${tag}>(.*?)</${tag}>`));
          return m ? m[1] : null;
        };

        const convOppId = getTag("opportunityId");
        const convAcctId = getTag("accountId");
        const convCtId = getTag("contactId");
        const convSuccess = getTag("success") === "true";

        if (convSuccess && convOppId) {
          console.log(`[SF Sync] Converted Lead ${existingLead.Id} → Opp ${convOppId}`);
          return {
            synced: true,
            action: "lead-converted",
            leadId: existingLead.Id,
            oppId: convOppId,
            accountId: convAcctId || undefined,
            contactId: convCtId || undefined,
          };
        } else {
          console.log(`[SF Sync] Lead conversion failed, falling through to create`);
        }
      } catch (convErr: any) {
        console.error(`[SF Sync] Lead conversion error: ${convErr.message}`);
      }
    }

    // No Lead to convert — create new Account + Contact + Opportunity
    const rts = await sfQuery(
      "SELECT Id FROM RecordType WHERE SObjectType='Account' AND Name='Merchant' AND IsActive=true"
    );
    const merchantRtId = rts[0]?.Id;

    const accountName = (businessName || fullName || email || "Unknown").slice(0, 255);

    // Ensure we have a real name, not an email address
    let resolvedName = fullName;
    if (!resolvedName || resolvedName.includes("@")) {
      // Try to get name from GHL via the neonPool (dialer_contacts)
      try {
        const { neonPool } = await import("../db");
        if (neonPool) {
          const nameResult = await neonPool.query(
            "SELECT first_name, last_name FROM dialer_contacts WHERE LOWER(email) = $1 AND first_name IS NOT NULL AND first_name != '' LIMIT 1",
            [email.toLowerCase()]
          );
          if (nameResult.rows[0]) {
            const fn = nameResult.rows[0].first_name || "";
            const ln = nameResult.rows[0].last_name || "";
            if (fn && !fn.includes("@")) {
              resolvedName = `${fn} ${ln}`.trim();
            }
          }
        }
      } catch {}
    }

    const nameParts = (resolvedName || "").split(/\s+/).filter(p => p && !p.includes("@"));
    const today = new Date();
    const dateStr = `${today.getMonth() + 1}/${today.getDate()}/${String(today.getFullYear()).slice(2)}`;

    const account = clean({
      Name: accountName,
      ...(merchantRtId ? { RecordTypeId: merchantRtId } : {}),
      Company_Name__c: businessName || null,
      Doing_Business_As__c: app.doingBusinessAs || app.doing_business_as || null,
      EIN__c: app.ein || null,
      Industry: mapIndustry(app.industry),
      Monthly_Revenue__c: parseNum(app.monthlyRevenue || app.monthly_revenue),
      Primary_Business_Bank__c: app.bankName || app.bank_name || null,
      Phone: phone || null,
      Website: app.companyWebsite || app.company_website || null,
      BillingCity: app.city || null,
      ...(US_STATES.has(state) ? { BillingStateCode: state } : {}),
      BillingPostalCode: app.zipCode || app.zip_code || null,
      ...((state || app.city) ? { BillingCountryCode: "US" } : {}),
      Account_Status__c: "Pending",
    });

    const acctRes = await sfApi("POST", "/sobjects/Account", account);
    if (!acctRes.success) {
      console.log(`[SF Sync] Account creation failed: ${acctRes.error}`);
      return { synced: false, error: `Account: ${acctRes.error}` };
    }

    const contact = clean({
      AccountId: acctRes.id,
      FirstName: nameParts[0] || null,
      LastName: nameParts.slice(1).join(" ") || (nameParts[0] ? "Unknown" : businessName || "Unknown"),
      Email: email || null,
      Phone: phone || null,
      Personal_Credit_Score_Range__c: mapCreditScore(app.creditScore || app.credit_score),
      Scrubbed__c: false,
      Opted_In_for_AI_Calls__c: false,
      Do_Not_Contact__c: false,
      Consent_to_Text__c: false,
      MailingCity: app.city || null,
      ...(US_STATES.has(state) ? { MailingStateCode: state } : {}),
      ...((state || app.city) ? { MailingCountryCode: "US" } : {}),
    });

    const ctRes = await sfApi("POST", "/sobjects/Contact", contact);

    const closeDate = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];
    const opportunity = clean({
      AccountId: acctRes.id,
      Primary_Contact__c: ctRes.success ? ctRes.id : null,
      Name: `${accountName} - ${dateStr}`.slice(0, 120),
      StageName: "Application & Docs",
      CloseDate: closeDate,
      ...appFields,
      ...oppOnlyFields,
      LeadSource: app.referralSource || app.referral_source || "Website",
      Revenue_Verified__c: false,
      Bank_Statement_Tampering_Flag__c: false,
      Engagement_Status__c: "Working",
    });

    const oppRes = await sfApi("POST", "/sobjects/Opportunity", opportunity);

    console.log(`[SF Sync] Created (Dillon): Account=${acctRes.id}, Contact=${ctRes.id || "failed"}, Opp=${oppRes.id || "failed"}`);
    return {
      synced: true,
      action: "created",
      accountId: acctRes.id,
      contactId: ctRes.id,
      oppId: oppRes.id,
    };

  } catch (err: any) {
    console.error(`[SF Sync] Error: ${err.message}`);
    return { synced: false, error: err.message };
  }
}

/**
 * Sync a business_underwriting_decision to Salesforce.
 * Updates the linked Opportunity's stage, amounts, and funded details.
 * If no SF Opportunity exists yet, attempts to find one via email/phone.
 */
export async function syncDecisionToSalesforce(decision: Record<string, any>, app?: Record<string, any>): Promise<{ synced: boolean; action?: string; oppId?: string; error?: string }> {
  if (!SF_INSTANCE_URL || (!cachedAccessToken && !SF_REFRESH_TOKEN)) {
    return { synced: false, error: "no credentials" };
  }

  try {
    const email = decision.business_email || decision.businessEmail || app?.email || "";
    const secondaryEmail = decision.secondary_email || decision.secondaryEmail || app?.business_email || app?.company_email || "";
    const phone = decision.business_phone || decision.businessPhone || app?.phone || "";
    const status = decision.status || "";
    const sfStage = dashboardStatusToSfStage(status);

    console.log(`[SF Decision Sync] ${decision.business_name || email} → status=${status}, sfStage=${sfStage}`);

    // Find the SF Opportunity — first from tracking column, then by search
    let oppId = decision.sf_opportunity_id || decision.sfOpportunityId || app?.sf_opportunity_id || app?.sfOpportunityId;

    if (!oppId && email) {
      const byEmail = await sfQuery(
        `SELECT Id FROM Opportunity WHERE Email__c = '${email.replace(/'/g, "\\'")}'  LIMIT 1`
      );
      if (byEmail.length) oppId = byEmail[0].Id;
    }

    if (!oppId && phone) {
      const digits = phone.replace(/\D/g, "").slice(-10);
      if (digits.length === 10) {
        const byPhone = await sfQuery(
          `SELECT Id FROM Opportunity WHERE Phone_Number__c LIKE '%${digits}' LIMIT 1`
        );
        if (byPhone.length) oppId = byPhone[0].Id;
      }
    }

    // Fallback: search by secondary email on the Opportunity
    if (!oppId && secondaryEmail) {
      const bySecondary = await sfQuery(
        `SELECT Id FROM Opportunity WHERE Email__c = '${secondaryEmail.replace(/'/g, "\\'")}' LIMIT 1`
      );
      if (bySecondary.length) oppId = bySecondary[0].Id;
    }

    // Fallback: search by Contact email → Account → Opportunity
    // This catches Opps where Email__c is null but a Contact on the same Account has the email
    if (!oppId) {
      for (const e of [email, secondaryEmail].filter(Boolean)) {
        // First try Primary_Contact__r.Email directly on the Opp
        const byContactEmail = await sfQuery(
          `SELECT Id FROM Opportunity WHERE Primary_Contact__r.Email = '${e.replace(/'/g, "\\'")}' LIMIT 1`
        );
        if (byContactEmail.length) { oppId = byContactEmail[0].Id; break; }

        // Then try Contact → Account → Opportunity (catches converted Leads where Contact is on Account)
        const byAcctContact = await sfQuery(
          `SELECT Id FROM Opportunity WHERE AccountId IN (SELECT AccountId FROM Contact WHERE Email = '${e.replace(/'/g, "\\'")}') LIMIT 1`
        );
        if (byAcctContact.length) { oppId = byAcctContact[0].Id; break; }
      }
    }

    // Fallback: search by business name (normalized — catches Opps with no email/phone)
    if (!oppId) {
      const bizName = decision.business_name || decision.businessName || "";
      if (bizName && bizName.length > 3) {
        const byName = await sfQuery(
          `SELECT Id FROM Opportunity WHERE Name LIKE '${bizName.replace(/'/g, "\\'").slice(0, 80)}%' AND IsClosed = false LIMIT 1`
        );
        if (byName.length) oppId = byName[0].Id;
      }
    }

    if (!oppId) {
      console.log("[SF Decision Sync] No matching SF Opportunity found — skipping");
      return { synced: false, error: "no matching Opportunity" };
    }

    // Build update payload based on decision status
    const hasApproval = !!(decision.advance_amount || decision.advanceAmount);
    const updateFields: Record<string, any> = {
      StageName: sfStage,
      Engagement_Status__c: computePipelineBucket(sfStage, hasApproval),
    };

    // Approval fields
    if (status === "approved" || status === "funded") {
      if (decision.advance_amount || decision.advanceAmount) {
        updateFields.Highest_Approval__c = parseNum(decision.advance_amount || decision.advanceAmount);
      }
      if (decision.factor_rate || decision.factorRate) {
        updateFields.Factor_Rate__c = parseNum(decision.factor_rate || decision.factorRate);
      }
      if (decision.total_payback || decision.totalPayback) {
        updateFields.Payback_Amount__c = parseNum(decision.total_payback || decision.totalPayback);
      }
      if (decision.lender) {
        updateFields.Description = `Lender: ${decision.lender}`;
      }
      if (decision.term) {
        updateFields.Term_Length__c = parseNum(decision.term?.replace?.(/[^\d]/g, ""));
      }
      if (decision.payment_frequency || decision.paymentFrequency) {
        updateFields.Payment_Frequency__c = decision.payment_frequency || decision.paymentFrequency;
      }
    }

    // Funded-specific fields
    if (status === "funded") {
      if (decision.advance_amount || decision.advanceAmount) {
        updateFields.Amount_Funded__c = parseNum(decision.advance_amount || decision.advanceAmount);
      }
      if (decision.funded_date || decision.fundedDate) {
        const fd = new Date(decision.funded_date || decision.fundedDate);
        if (!isNaN(fd.getTime())) {
          updateFields.Funded_Date__c = fd.toISOString().split("T")[0];
          updateFields.CloseDate = fd.toISOString().split("T")[0];
        }
      }
    }

    // Declined/unqualified fields
    if (status === "declined" || status === "unqualified") {
      if (decision.decline_reason || decision.declineReason) {
        updateFields.Declined_Reason__c = decision.decline_reason || decision.declineReason;
      }
      updateFields.CloseDate = new Date().toISOString().split("T")[0];
    }

    // Clean nulls
    const cleaned = clean(updateFields);

    const res = await sfApi("PATCH", `/sobjects/Opportunity/${oppId}`, cleaned);
    if (res.success) {
      console.log(`[SF Decision Sync] Updated Opp ${oppId}: stage=${sfStage}, fields=${Object.keys(cleaned).join(",")}`);

      // Also sync lender submissions for this decision
      await syncLenderSubmissionsToSalesforce(oppId, decision).catch(err =>
        console.error(`[SF Lender Sync] Error (non-fatal): ${err.message}`)
      );

      return { synced: true, action: "updated", oppId };
    } else {
      console.error(`[SF Decision Sync] Failed: ${res.error}`);
      return { synced: false, oppId, error: res.error };
    }

  } catch (err: any) {
    console.error(`[SF Decision Sync] Error: ${err.message}`);
    return { synced: false, error: err.message };
  }
}

// ---------------------------------------------------------------------------
// Lender Submission sync — creates/updates Lender_Submission__c records
// ---------------------------------------------------------------------------

// Cache: lender name (lowercased) → SF Account Id
let funderAccountCache: Map<string, string> | null = null;
let funderRecordTypeId: string | null = null;

async function getFunderAccountId(lenderName: string): Promise<string | null> {
  if (!lenderName) return null;

  // Build cache on first call
  if (!funderAccountCache) {
    funderAccountCache = new Map();
    const funders = await sfQuery(
      "SELECT Id, Name FROM Account WHERE RecordType.Name = 'Funder'"
    );
    for (const f of funders) {
      funderAccountCache.set(f.Name.toLowerCase().trim(), f.Id);
    }
    console.log(`[SF Lender Sync] Cached ${funderAccountCache.size} Funder accounts`);
  }

  const key = lenderName.toLowerCase().trim();

  // Exact match
  if (funderAccountCache.has(key)) return funderAccountCache.get(key)!;

  // Fuzzy: check if cache key contains or is contained by the search name
  for (const [cachedName, id] of funderAccountCache) {
    if (cachedName.includes(key) || key.includes(cachedName)) return id;
  }

  // No match — create a new Funder Account
  console.log(`[SF Lender Sync] Creating new Funder account: ${lenderName}`);
  if (!funderRecordTypeId) {
    const rts = await sfQuery(
      "SELECT Id FROM RecordType WHERE SObjectType='Account' AND Name='Funder' AND IsActive=true"
    );
    funderRecordTypeId = rts[0]?.Id || null;
  }

  const newAcct = await sfApi("POST", "/sobjects/Account", clean({
    Name: lenderName,
    ...(funderRecordTypeId ? { RecordTypeId: funderRecordTypeId } : {}),
    Account_Status__c: "Active",
  }));

  if (newAcct.success && newAcct.id) {
    funderAccountCache.set(key, newAcct.id);
    return newAcct.id;
  }
  return null;
}

function mapDecisionStatusToSubmissionStatus(status: string): string {
  const map: Record<string, string> = {
    approved: "Approved",
    declined: "Declined",
    funded: "Approved", // funded deals were approved first
    unqualified: "Declined",
  };
  return map[status?.toLowerCase()] || "Submitted";
}

function parseTermMonths(term: any): number | null {
  if (!term) return null;
  const s = String(term);
  const n = parseInt(s.replace(/[^\d]/g, ""));
  return isNaN(n) ? null : n;
}

/**
 * Sync lender submissions for a decision to SF Lender_Submission__c records.
 * Handles both the primary lender and any additional_approvals.
 */
export async function syncLenderSubmissionsToSalesforce(
  oppId: string,
  decision: Record<string, any>
): Promise<{ created: number; updated: number; errors: number }> {
  const results = { created: 0, updated: 0, errors: 0 };

  // Gather all lender submissions from the decision
  const submissions: Array<{
    lender: string;
    status: string;
    amount: any;
    factorRate: any;
    buyRate?: any;
    term: any;
    declineReason?: string;
    date?: any;
    notes?: string;
    paymentFrequency?: string;
  }> = [];

  // Use additional_approvals as the source of truth when available —
  // it contains per-lender details including the primary (isPrimary: true)
  const additionalApprovals = decision.additional_approvals || decision.additionalApprovals;
  const seenLenders = new Set<string>();

  if (Array.isArray(additionalApprovals) && additionalApprovals.length > 0) {
    for (const aa of additionalApprovals) {
      if (!aa.lender) continue;
      const lenderKey = aa.lender.toLowerCase().trim();
      if (seenLenders.has(lenderKey)) continue;
      seenLenders.add(lenderKey);

      submissions.push({
        lender: aa.lender,
        status: aa.isPrimary ? (decision.status || "approved") : "approved",
        amount: aa.advanceAmount || aa.amount || aa.advance_amount,
        factorRate: aa.factorRate || aa.factor_rate,
        buyRate: aa.buyRate || aa.buy_rate,
        term: aa.term,
        date: aa.approvalDate || aa.approval_date || aa.date || decision.approval_date || decision.approvalDate,
        notes: aa.notes || null,
        paymentFrequency: aa.paymentFrequency || aa.payment_frequency,
        declineReason: aa.declineReason || aa.decline_reason,
      });
    }
  }

  // Fallback: if no additional_approvals, use the top-level decision fields
  if (submissions.length === 0 && decision.lender) {
    submissions.push({
      lender: decision.lender,
      status: decision.status || "approved",
      amount: decision.advance_amount || decision.advanceAmount,
      factorRate: decision.factor_rate || decision.factorRate,
      term: decision.term,
      declineReason: decision.decline_reason || decision.declineReason,
      date: decision.approval_date || decision.approvalDate || decision.created_at || decision.createdAt,
      notes: decision.notes,
      paymentFrequency: decision.payment_frequency || decision.paymentFrequency,
    });
  }

  if (submissions.length === 0) return results;

  // Fetch existing submissions for this Opportunity to avoid duplicates
  const existing = await sfQuery(
    `SELECT Id, Name FROM Lender_Submission__c WHERE Opportunity__c = '${oppId}'`
  );
  const existingByName = new Map<string, string>();
  for (const e of existing) {
    existingByName.set(e.Name?.toLowerCase()?.trim(), e.Id);
  }

  for (const sub of submissions) {
    try {
      const lenderAccountId = await getFunderAccountId(sub.lender);
      const submissionStatus = mapDecisionStatusToSubmissionStatus(sub.status);
      const subDate = sub.date ? new Date(sub.date) : new Date();
      const dateStr = !isNaN(subDate.getTime()) ? subDate.toISOString().split("T")[0] : null;

      const record = clean({
        Opportunity__c: oppId,
        Lender__c: lenderAccountId,
        Status__c: submissionStatus,
        Offer_Amount__c: parseNum(sub.amount),
        Factor_Rate__c: parseNum(sub.factorRate),
        Buy_Rate__c: parseNum(sub.buyRate),
        Term_Months__c: parseTermMonths(sub.term),
        Submitted_Date__c: dateStr,
        Response_Date__c: dateStr,
        Submission_Notes__c: sub.notes || null,
        ...(submissionStatus === "Declined" && sub.declineReason
          ? { Decline_Reason__c: sub.declineReason }
          : {}),
      });

      // Check if this lender already has a submission for this Opp
      const existingId = existingByName.get(sub.lender.toLowerCase().trim());

      if (existingId) {
        // Update existing
        const res = await sfApi("PATCH", `/sobjects/Lender_Submission__c/${existingId}`, record);
        if (res.success) {
          results.updated++;
          console.log(`[SF Lender Sync] Updated: ${sub.lender} on Opp ${oppId}`);
        } else {
          results.errors++;
          console.error(`[SF Lender Sync] Update failed for ${sub.lender}: ${res.error}`);
        }
      } else {
        // Create new — Name field is auto-set or we use lender name
        const createRecord = { ...record, Name: sub.lender };
        const res = await sfApi("POST", "/sobjects/Lender_Submission__c", createRecord);
        if (res.success) {
          results.created++;
          console.log(`[SF Lender Sync] Created: ${sub.lender} on Opp ${oppId}`);
        } else {
          results.errors++;
          console.error(`[SF Lender Sync] Create failed for ${sub.lender}: ${res.error}`);
        }
      }
    } catch (err: any) {
      results.errors++;
      console.error(`[SF Lender Sync] Error for ${sub.lender}: ${err.message}`);
    }
  }

  console.log(`[SF Lender Sync] Done: ${results.created} created, ${results.updated} updated, ${results.errors} errors`);
  return results;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRODUCTION ORG SYNC — mirrors decisions to the live SF org in parallel
// Uses separate credentials (SF_PROD_*) so sandbox sync is unaffected.
// ═══════════════════════════════════════════════════════════════════════════════

const SF_PROD_INSTANCE_URL = process.env.SF_PROD_INSTANCE_URL || "";
const SF_PROD_ACCESS_TOKEN_ENV = process.env.SF_PROD_ACCESS_TOKEN || "";

let prodCachedToken = SF_PROD_ACCESS_TOKEN_ENV;
let prodTokenExpiry = SF_PROD_ACCESS_TOKEN_ENV ? Date.now() + 90 * 60 * 1000 : 0;
let prodRefreshPromise: Promise<string> | null = null;

async function getProdAccessToken(): Promise<string> {
  if (prodCachedToken && Date.now() < prodTokenExpiry) return prodCachedToken;
  if (prodRefreshPromise) return await prodRefreshPromise;

  prodRefreshPromise = (async () => {
    try {
      // Strategy 1: Refresh token with Connected App
      const refreshToken = process.env.SF_PROD_REFRESH_TOKEN;
      const clientId = process.env.SF_PROD_CLIENT_ID;
      if (refreshToken && clientId) {
        const loginUrl = process.env.SF_PROD_LOGIN_URL || "https://login.salesforce.com";
        const params: Record<string, string> = {
          grant_type: "refresh_token",
          client_id: clientId,
          refresh_token: refreshToken,
        };
        if (process.env.SF_PROD_CLIENT_SECRET) params.client_secret = process.env.SF_PROD_CLIENT_SECRET;
        const res = await fetch(`${loginUrl}/services/oauth2/token`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams(params),
        });
        if (res.ok) {
          const data = await res.json() as any;
          prodCachedToken = data.access_token;
          prodTokenExpiry = Date.now() + 90 * 60 * 1000;
          console.log("[SF Prod Auth] Token refreshed");
          return prodCachedToken;
        }
      }

      // Strategy 2: Username-password flow
      const username = process.env.SF_PROD_USERNAME;
      const password = process.env.SF_PROD_PASSWORD;
      if (username && password) {
        const loginUrl = process.env.SF_PROD_LOGIN_URL || "https://login.salesforce.com";
        const res = await fetch(`${loginUrl}/services/oauth2/token`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            grant_type: "password",
            client_id: process.env.SF_PROD_CLIENT_ID || "PlatformCLI",
            username,
            password: password + (process.env.SF_PROD_SECURITY_TOKEN || ""),
          }),
        });
        if (res.ok) {
          const data = await res.json() as any;
          prodCachedToken = data.access_token;
          prodTokenExpiry = Date.now() + 90 * 60 * 1000;
          console.log("[SF Prod Auth] Token obtained via password flow");
          return prodCachedToken;
        }
      }

      // Strategy 3: Direct access token (env var, short-lived)
      if (SF_PROD_ACCESS_TOKEN_ENV) {
        prodCachedToken = SF_PROD_ACCESS_TOKEN_ENV;
        prodTokenExpiry = Date.now() + 60 * 60 * 1000;
        return prodCachedToken;
      }

      return "";
    } catch (err: any) {
      console.error("[SF Prod Auth] Error:", err.message);
      return prodCachedToken;
    } finally {
      prodRefreshPromise = null;
    }
  })();

  return await prodRefreshPromise;
}

async function prodSfApi(method: string, path: string, body?: object): Promise<{ success: boolean; id?: string; data?: any; error?: string }> {
  try {
    const token = await getProdAccessToken();
    if (!token) return { success: false, error: "no prod token" };
    const res = await fetch(`${SF_PROD_INSTANCE_URL}/services/data/v66.0${path}`, {
      method,
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 204) return { success: true };
    const data = await res.json();
    if (res.ok) return { success: true, id: data.id, data };
    const msg = Array.isArray(data) ? data.map((e: any) => e.message).join("; ") : data.message || JSON.stringify(data);
    return { success: false, error: msg };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

async function prodSfQuery(soql: string): Promise<any[]> {
  try {
    const token = await getProdAccessToken();
    if (!token) return [];
    const res = await fetch(
      `${SF_PROD_INSTANCE_URL}/services/data/v66.0/query?q=${encodeURIComponent(soql)}`,
      { headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" } }
    );
    return ((await res.json()) as any).records || [];
  } catch { return []; }
}

/**
 * Sync a decision to the PRODUCTION SF org.
 * Mirrors the same logic as syncDecisionToSalesforce but against SF_PROD_*.
 */
export async function syncDecisionToProductionSf(decision: Record<string, any>): Promise<{ synced: boolean; action?: string; oppId?: string; error?: string }> {
  if (!SF_PROD_INSTANCE_URL) {
    return { synced: false, error: "SF_PROD_INSTANCE_URL not configured" };
  }

  try {
    const email = decision.business_email || decision.businessEmail || "";
    const secondaryEmail = decision.secondary_email || decision.secondaryEmail || "";
    const phone = decision.business_phone || decision.businessPhone || "";
    const status = decision.status || "";
    const sfStage = dashboardStatusToSfStage(status);

    console.log(`[SF Prod Sync] ${decision.business_name || email} → status=${status}, sfStage=${sfStage}`);

    // Find Opportunity in production — same multi-fallback chain
    let oppId = "";

    if (email) {
      const byEmail = await prodSfQuery(`SELECT Id FROM Opportunity WHERE Email__c = '${email.replace(/'/g, "\\'")}' LIMIT 1`);
      if (byEmail.length) oppId = byEmail[0].Id;
    }

    if (!oppId && phone) {
      const digits = phone.replace(/\D/g, "").slice(-10);
      if (digits.length === 10) {
        const byPhone = await prodSfQuery(`SELECT Id FROM Opportunity WHERE Phone_Number__c LIKE '%${digits}' LIMIT 1`);
        if (byPhone.length) oppId = byPhone[0].Id;
      }
    }

    // Contact email → Account → Opportunity
    if (!oppId) {
      for (const e of [email, secondaryEmail].filter(Boolean)) {
        const byAcctContact = await prodSfQuery(
          `SELECT Id FROM Opportunity WHERE AccountId IN (SELECT AccountId FROM Contact WHERE Email = '${e.replace(/'/g, "\\'")}') LIMIT 1`
        );
        if (byAcctContact.length) { oppId = byAcctContact[0].Id; break; }
      }
    }

    // Business name fallback
    if (!oppId) {
      const bizName = decision.business_name || decision.businessName || "";
      if (bizName && bizName.length > 3) {
        const byName = await prodSfQuery(
          `SELECT Id FROM Opportunity WHERE Name LIKE '${bizName.replace(/'/g, "\\'").slice(0, 80)}%' AND IsClosed = false LIMIT 1`
        );
        if (byName.length) oppId = byName[0].Id;
      }
    }

    if (!oppId) {
      console.log("[SF Prod Sync] No matching Opportunity in production — skipping");
      return { synced: false, error: "no matching Opportunity in production" };
    }

    // Build update payload
    const hasApproval = !!(decision.advance_amount || decision.advanceAmount);
    const updateFields: Record<string, any> = {
      StageName: sfStage,
      Engagement_Status__c: computePipelineBucket(sfStage, hasApproval),
    };

    if (status === "approved" || status === "funded") {
      if (decision.advance_amount || decision.advanceAmount)
        updateFields.Highest_Approval__c = parseNum(decision.advance_amount || decision.advanceAmount);
      if (decision.factor_rate || decision.factorRate)
        updateFields.Factor_Rate__c = parseNum(decision.factor_rate || decision.factorRate);
      if (decision.lender)
        updateFields.Description = `Lender: ${decision.lender}`;
      if (decision.term)
        updateFields.Term_Length__c = parseNum(decision.term?.replace?.(/[^\d]/g, ""));
      if (decision.payment_frequency || decision.paymentFrequency)
        updateFields.Payment_Frequency__c = decision.payment_frequency || decision.paymentFrequency;
    }

    if (status === "funded") {
      if (decision.advance_amount || decision.advanceAmount)
        updateFields.Amount_Funded__c = parseNum(decision.advance_amount || decision.advanceAmount);
      if (decision.funded_date || decision.fundedDate) {
        const fd = new Date(decision.funded_date || decision.fundedDate);
        if (!isNaN(fd.getTime())) {
          updateFields.Funded_Date__c = fd.toISOString().split("T")[0];
          updateFields.CloseDate = fd.toISOString().split("T")[0];
        }
      }
    }

    if (status === "declined" || status === "unqualified") {
      if (decision.decline_reason || decision.declineReason)
        updateFields.Declined_Reason__c = decision.decline_reason || decision.declineReason;
      updateFields.CloseDate = new Date().toISOString().split("T")[0];
    }

    const cleaned = clean(updateFields);
    const res = await prodSfApi("PATCH", `/sobjects/Opportunity/${oppId}`, cleaned);

    if (res.success) {
      console.log(`[SF Prod Sync] Updated Opp ${oppId}: stage=${sfStage}`);

      // Sync lender submissions to production
      await syncLenderSubmissionsToProductionSf(oppId, decision).catch(err =>
        console.error(`[SF Prod Lender Sync] Error (non-fatal): ${err.message}`)
      );

      return { synced: true, action: "updated", oppId };
    } else {
      console.error(`[SF Prod Sync] Failed: ${res.error}`);
      return { synced: false, oppId, error: res.error };
    }
  } catch (err: any) {
    console.error(`[SF Prod Sync] Error: ${err.message}`);
    return { synced: false, error: err.message };
  }
}

/**
 * Sync lender submissions to PRODUCTION SF org.
 */
async function syncLenderSubmissionsToProductionSf(oppId: string, decision: Record<string, any>): Promise<void> {
  // Gather submissions from additional_approvals
  const additionalApprovals = decision.additional_approvals || decision.additionalApprovals;
  const submissions: Array<{ lender: string; amount: any; factorRate: any; buyRate?: any; term: any; date?: any; notes?: string; status: string }> = [];
  const seenLenders = new Set<string>();

  if (Array.isArray(additionalApprovals) && additionalApprovals.length > 0) {
    for (const aa of additionalApprovals) {
      if (!aa.lender) continue;
      const key = aa.lender.toLowerCase().trim();
      if (seenLenders.has(key)) continue;
      seenLenders.add(key);
      submissions.push({
        lender: aa.lender,
        status: aa.isPrimary ? (decision.status || "approved") : "approved",
        amount: aa.advanceAmount || aa.amount,
        factorRate: aa.factorRate || aa.factor_rate,
        buyRate: aa.buyRate || aa.buy_rate,
        term: aa.term,
        date: aa.approvalDate || aa.approval_date || aa.date,
        notes: aa.notes,
      });
    }
  }

  if (submissions.length === 0 && decision.lender) {
    submissions.push({
      lender: decision.lender,
      status: decision.status || "approved",
      amount: decision.advance_amount || decision.advanceAmount,
      factorRate: decision.factor_rate || decision.factorRate,
      term: decision.term,
      date: decision.approval_date || decision.approvalDate,
      notes: decision.notes,
    });
  }

  if (submissions.length === 0) return;

  // Get existing submissions for this opp
  const existing = await prodSfQuery(`SELECT Id, Name FROM Lender_Submission__c WHERE Opportunity__c = '${oppId}'`);
  const existingByName = new Map<string, string>();
  for (const e of existing) existingByName.set(e.Name?.toLowerCase()?.trim(), e.Id);

  // Get funder accounts from production
  const funders = await prodSfQuery("SELECT Id, Name FROM Account WHERE RecordType.Name = 'Funder'");
  const funderMap = new Map<string, string>();
  for (const f of funders) funderMap.set(f.Name.toLowerCase().trim(), f.Id);

  function findFunder(name: string): string | null {
    const key = name.toLowerCase().trim();
    if (funderMap.has(key)) return funderMap.get(key)!;
    for (const [k, id] of funderMap) {
      if (k.includes(key) || key.includes(k)) return id;
    }
    return null;
  }

  const statusMap: Record<string, string> = { approved: "Approved", declined: "Declined", funded: "Approved", unqualified: "Declined" };

  for (const sub of submissions) {
    try {
      const lenderId = findFunder(sub.lender);
      const subStatus = statusMap[sub.status?.toLowerCase()] || "Submitted";
      const subDate = sub.date ? new Date(sub.date) : new Date();
      const dateStr = !isNaN(subDate.getTime()) ? subDate.toISOString().split("T")[0] : null;

      const record = clean({
        Opportunity__c: oppId,
        Lender__c: lenderId,
        Status__c: subStatus,
        Offer_Amount__c: parseNum(sub.amount),
        Factor_Rate__c: parseNum(sub.factorRate),
        Buy_Rate__c: parseNum(sub.buyRate),
        Term_Months__c: parseTermMonths(sub.term),
        Submitted_Date__c: dateStr,
        Response_Date__c: dateStr,
        Submission_Notes__c: sub.notes || null,
      });

      const existingId = existingByName.get(sub.lender.toLowerCase().trim());
      if (existingId) {
        await prodSfApi("PATCH", `/sobjects/Lender_Submission__c/${existingId}`, record);
        console.log(`[SF Prod Lender] Updated: ${sub.lender}`);
      } else {
        await prodSfApi("POST", "/sobjects/Lender_Submission__c", { ...record, Name: sub.lender });
        console.log(`[SF Prod Lender] Created: ${sub.lender}`);
      }
    } catch (err: any) {
      console.error(`[SF Prod Lender] Error for ${sub.lender}: ${err.message}`);
    }
  }
}

// ─── Shared opportunity lookup ────────────────────────────────────────────────

async function findSfOpportunityByEmail(email: string): Promise<{ Id: string; AccountId?: string } | null> {
  if (!email) return null;
  const safeEmail = email.replace(/'/g, "\\'");

  const byEmail = await sfQuery(
    `SELECT Id, AccountId FROM Opportunity WHERE Email__c = '${safeEmail}' ORDER BY LastModifiedDate DESC LIMIT 1`
  );
  if (byEmail.length) return byEmail[0];

  const byContact = await sfQuery(
    `SELECT Id, AccountId FROM Opportunity WHERE AccountId IN (SELECT AccountId FROM Contact WHERE Email = '${safeEmail}') ORDER BY LastModifiedDate DESC LIMIT 1`
  );
  if (byContact.length) return byContact[0];

  return null;
}

// ─── Deal Qualification sync (called on UW submission / shop file) ─────────────

/**
 * Push Deal Qualification fields to the SF Opportunity when a file is submitted
 * to underwriting. Accepts the application record plus an optional saved AI
 * snapshot and/or the shop-dialog dealOverview object.
 */
export async function syncUwSubmissionToSalesforce(
  email: string,
  application: Record<string, any> | null,
  options?: {
    snapshot?: Record<string, any> | null;
    dealOverview?: Record<string, any> | null;
  }
): Promise<void> {
  if (!SF_INSTANCE_URL || (!cachedAccessToken && !SF_REFRESH_TOKEN)) return;

  const { snapshot, dealOverview } = options || {};
  const safeEmail = email.toLowerCase().trim();

  try {
    const opp = await findSfOpportunityByEmail(safeEmail);
    if (!opp) {
      console.log(`[SF UW Sync] No opportunity found for ${safeEmail} — skipping`);
      return;
    }

    const ov = dealOverview || {};
    const app = application || {};
    const snap = snapshot || {};

    // Average monthly deposit count from snapshot monthly breakdown
    let avgMonthlyDeposits: number | null = null;
    if (snap.monthlyData?.length) {
      const counts = (snap.monthlyData as any[])
        .map((m: any) => parseNum(m.numDeposits))
        .filter((n): n is number => n !== null);
      if (counts.length) {
        avgMonthlyDeposits = Math.round(counts.reduce((a, b) => a + b, 0) / counts.length);
      }
    }

    // Build a readable summary of existing MCA positions detected by the snapshot
    let positionSummary: string | null = null;
    if (snap.existingPositions?.length) {
      positionSummary = (snap.existingPositions as any[])
        .map((p: any) => `${p.funder}: ~$${p.estimatedPayment}/${p.frequency}`)
        .join('; ');
    }

    const fields = clean({
      // Application-level deal qualification
      Amount_Requested__c:           parseNum(ov.amountSeeking || app.requestedAmount || app.requested_amount),
      Monthly_Revenue__c:            parseNum(snap.avgMonthlyRevenue || app.monthlyRevenue || app.monthly_revenue),
      Personal_Credit_Score_Range__c: mapCreditScore(ov.creditScore || app.creditScore || app.credit_score || app.personalCreditScoreRange),
      Time_in_Business_Months__c:    ov.timeInBusiness || app.timeInBusiness || app.time_in_business || null,

      // Position & stacking (from shop-dialog deal overview)
      Position__c:                   ov.positionSeeking || null,
      Active_Positions_Count__c:     snap.existingPositions?.length != null ? Number(snap.existingPositions.length) : null,
      Stacking_Policy__c:            ov.outstandingBalance ? `Outstanding Balance: ${ov.outstandingBalance}` : null,

      // Bank-analysis fields (from saved AI snapshot, if available)
      Average_Daily_Balance__c:      parseNum(snap.avgDailyBalance),
      Monthly_Deposit_Count__c:      avgMonthlyDeposits,
      Number_of_NSFs__c:             snap.nsfCount != null ? Number(snap.nsfCount) : null,
      Revenue_Trend__c:              snap.revenueTrend || null,
      Total_Monthly_Debt__c:         parseNum(snap.totalMonthlyDebtPayments),
      Factor_Rate__c:                parseNum(snap.estimatedFactor),
      Existing_Positions__c:         positionSummary,
    });

    if (Object.keys(fields).length === 0) return;

    const res = await sfApi("PATCH", `/sobjects/Opportunity/${opp.Id}`, fields);
    if (res.success) {
      console.log(`[SF UW Sync] Deal Qualification updated on Opp ${opp.Id} — ${Object.keys(fields).length} fields`);
    } else {
      console.warn(`[SF UW Sync] Opp ${opp.Id} update failed: ${res.error}`);
    }
  } catch (err: any) {
    console.error("[SF UW Sync] Error:", err.message);
  }
}

// ─── AI Snapshot sync (called after generateUnderwritingSnapshot is saved) ───

/**
 * Push AI Snapshot fields to the SF Opportunity after the AI underwriting
 * snapshot is generated and persisted. Also refreshes snapshot-derived Deal
 * Qualification fields so both sections stay in sync.
 */
export async function syncAiSnapshotToSalesforce(
  email: string,
  snapshot: Record<string, any>
): Promise<void> {
  if (!SF_INSTANCE_URL || (!cachedAccessToken && !SF_REFRESH_TOKEN)) return;

  const safeEmail = email.toLowerCase().trim();

  try {
    const opp = await findSfOpportunityByEmail(safeEmail);
    if (!opp) {
      console.log(`[SF Snapshot Sync] No opportunity found for ${safeEmail} — skipping`);
      return;
    }

    // Format red flags as a newline-separated list
    const redFlagsText = Array.isArray(snapshot.redFlags) && snapshot.redFlags.length
      ? (snapshot.redFlags as any[]).map((f: any) => `${f.flag} [${f.severity}]`).join('\n')
      : null;

    // Average monthly deposit count
    let avgMonthlyDeposits: number | null = null;
    if (snapshot.monthlyData?.length) {
      const counts = (snapshot.monthlyData as any[])
        .map((m: any) => parseNum(m.numDeposits))
        .filter((n): n is number => n !== null);
      if (counts.length) {
        avgMonthlyDeposits = Math.round(counts.reduce((a, b) => a + b, 0) / counts.length);
      }
    }

    // Existing position summary
    let positionSummary: string | null = null;
    if (snapshot.existingPositions?.length) {
      positionSummary = (snapshot.existingPositions as any[])
        .map((p: any) => `${p.funder}: ~$${p.estimatedPayment}/${p.frequency}`)
        .join('; ');
    }

    const worthLabel = snapshot.worthSubmitting != null
      ? (snapshot.worthSubmitting ? "Worth Submitting" : "Not Worth Submitting")
      : null;
    const underwrtingValue = worthLabel && snapshot.qualificationTier
      ? `${worthLabel} — ${snapshot.qualificationTier}`
      : (worthLabel || snapshot.qualificationTier || null);

    const fields = clean({
      // AI Snapshot section
      UW_Recommendation__c:   snapshot.recommendedProduct || null,
      UW_Score__c:            snapshot.overallScore != null ? Number(snapshot.overallScore) : null,
      Last_UW_Run__c:         new Date().toISOString(),
      UW_Summary__c:          snapshot.summary || null,
      Red_Flags__c:           redFlagsText,
      Underwriting__c:        underwrtingValue,

      // Keep Deal Qualification in sync with snapshot data
      Monthly_Revenue__c:         parseNum(snapshot.avgMonthlyRevenue),
      Average_Daily_Balance__c:   parseNum(snapshot.avgDailyBalance),
      Monthly_Deposit_Count__c:   avgMonthlyDeposits,
      Number_of_NSFs__c:          snapshot.nsfCount != null ? Number(snapshot.nsfCount) : null,
      Revenue_Trend__c:           snapshot.revenueTrend || null,
      Total_Monthly_Debt__c:      parseNum(snapshot.totalMonthlyDebtPayments),
      Factor_Rate__c:             parseNum(snapshot.estimatedFactor),
      Active_Positions_Count__c:  snapshot.existingPositions?.length != null ? Number(snapshot.existingPositions.length) : null,
      Existing_Positions__c:      positionSummary,
    });

    if (Object.keys(fields).length === 0) return;

    const res = await sfApi("PATCH", `/sobjects/Opportunity/${opp.Id}`, fields);
    if (res.success) {
      console.log(`[SF Snapshot Sync] AI Snapshot + Deal Qual updated on Opp ${opp.Id} — ${Object.keys(fields).length} fields`);
    } else {
      console.warn(`[SF Snapshot Sync] Opp ${opp.Id} update failed: ${res.error}`);
    }
  } catch (err: any) {
    console.error("[SF Snapshot Sync] Error:", err.message);
  }
}
