/**
 * Salesforce Sync — creates/updates SF records when a new application is saved.
 *
 * Auth: uses SF_REFRESH_TOKEN to auto-refresh the access token via OAuth2.
 * Falls back to SF_ACCESS_TOKEN if refresh token is not configured.
 * Tokens are cached in memory and refreshed on 401 or expiry.
 */

const SF_INSTANCE_URL = process.env.SF_INSTANCE_URL;
const SF_REFRESH_TOKEN = process.env.SF_REFRESH_TOKEN;
const SF_LOGIN_URL = process.env.SF_LOGIN_URL || "https://test.salesforce.com"; // test.salesforce.com for sandbox

let cachedAccessToken = process.env.SF_ACCESS_TOKEN || "";
let tokenExpiresAt = 0; // epoch ms — 0 = needs refresh on first call

const US_STATES = new Set([
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS",
  "KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY",
  "NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC"
]);

// ---------------------------------------------------------------------------
// Token management — auto-refresh via OAuth2 refresh_token grant
// ---------------------------------------------------------------------------
async function refreshAccessToken(): Promise<string> {
  if (!SF_REFRESH_TOKEN) {
    return cachedAccessToken;
  }
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
      tokenExpiresAt = Date.now() + 90 * 60 * 1000; // refresh at 90min
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

async function getAccessToken(): Promise<string> {
  if (!cachedAccessToken || Date.now() > tokenExpiresAt) {
    return refreshAccessToken();
  }
  return cachedAccessToken;
}

function sfHeaders(token: string) {
  return {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

async function sfApi(method: string, path: string, body?: object): Promise<{ success: boolean; id?: string; data?: any; error?: string }> {
  try {
    let token = await getAccessToken();
    let res = await fetch(`${SF_INSTANCE_URL}/services/data/v66.0${path}`, {
      method,
      headers: sfHeaders(token),
      body: body ? JSON.stringify(body) : undefined,
    });

    // Auto-retry on 401 with a fresh token
    if (res.status === 401 && SF_REFRESH_TOKEN) {
      console.log("[SF API] 401 — refreshing token and retrying...");
      tokenExpiresAt = 0;
      token = await refreshAccessToken();
      res = await fetch(`${SF_INSTANCE_URL}/services/data/v66.0${path}`, {
        method,
        headers: sfHeaders(token),
        body: body ? JSON.stringify(body) : undefined,
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
      const freshToken = await refreshAccessToken();
      const retry = await fetch(
        `${SF_INSTANCE_URL}/services/data/v66.0/query?q=${encodeURIComponent(soql)}`,
        { headers: sfHeaders(freshToken) }
      );
      const data = await retry.json();
      return data.records || [];
    }

    const data = await res.json();
    return data.records || [];
  } catch {
    return [];
  }
}

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

    // No existing Lead or Opportunity found — skip (update-only mode)
    console.log(`[SF Sync] No existing Lead or Opportunity found for ${email || phone} — skipping (update-only mode)`);
    return { synced: false, reason: "no existing SF record to update" };

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

    // Fallback: search by Contact email (catches Opps where Email__c is null but Contact has email)
    if (!oppId) {
      for (const e of [email, secondaryEmail].filter(Boolean)) {
        const byContactEmail = await sfQuery(
          `SELECT Id FROM Opportunity WHERE Primary_Contact__r.Email = '${e.replace(/'/g, "\\'")}' LIMIT 1`
        );
        if (byContactEmail.length) { oppId = byContactEmail[0].Id; break; }
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

    // Fallback: look up phone from loan_applications if decision has no phone
    if (!oppId && !phone && email) {
      try {
        const appPhone = await sfQuery(
          `SELECT Id, Phone_Number__c FROM Opportunity WHERE AccountId IN (SELECT AccountId FROM Opportunity WHERE Primary_Contact__r.Email = '${email.replace(/'/g, "\\'")}') AND Phone_Number__c != null LIMIT 1`
        );
        if (appPhone.length) oppId = appPhone[0].Id;
      } catch {}
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
    term: any;
    declineReason?: string;
    date?: any;
    notes?: string;
  }> = [];

  // Primary decision
  if (decision.lender) {
    submissions.push({
      lender: decision.lender,
      status: decision.status || "approved",
      amount: decision.advance_amount || decision.advanceAmount,
      factorRate: decision.factor_rate || decision.factorRate,
      term: decision.term,
      declineReason: decision.decline_reason || decision.declineReason,
      date: decision.approval_date || decision.approvalDate || decision.created_at || decision.createdAt,
      notes: decision.notes,
    });
  }

  // Additional approvals (JSONB array) — skip if same lender as primary to avoid duplicates
  const primaryLender = (decision.lender || "").toLowerCase().trim();
  const additionalApprovals = decision.additional_approvals || decision.additionalApprovals;
  if (Array.isArray(additionalApprovals)) {
    for (const aa of additionalApprovals) {
      if (aa.lender && aa.lender.toLowerCase().trim() !== primaryLender) {
        submissions.push({
          lender: aa.lender,
          status: "approved",
          amount: aa.amount || aa.advanceAmount,
          factorRate: aa.factorRate || aa.factor_rate,
          term: aa.term,
          date: aa.date || decision.approval_date || decision.approvalDate,
        });
      }
    }
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
