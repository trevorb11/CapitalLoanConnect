/**
 * Salesforce Sync — creates/updates SF records when a new application is saved.
 */

const SF_INSTANCE_URL = process.env.SF_INSTANCE_URL;
const SF_ACCESS_TOKEN = process.env.SF_ACCESS_TOKEN;

const US_STATES = new Set([
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS",
  "KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY",
  "NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC"
]);

function sfHeaders() {
  return {
    'Authorization': `Bearer ${SF_ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
  };
}

async function sfApi(method: string, path: string, body?: object): Promise<{ success: boolean; id?: string; data?: any; error?: string }> {
  try {
    const res = await fetch(`${SF_INSTANCE_URL}/services/data/v66.0${path}`, {
      method,
      headers: sfHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 204) return { success: true };
    const data = await res.json();
    if (res.ok) return { success: true, id: data.id, data };
    const msg = Array.isArray(data) ? data.map((e: any) => e.message).join('; ') : data.message || JSON.stringify(data);
    return { success: false, error: msg };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

async function sfQuery(soql: string): Promise<any[]> {
  try {
    const res = await fetch(
      `${SF_INSTANCE_URL}/services/data/v66.0/query?q=${encodeURIComponent(soql)}`,
      { headers: sfHeaders() }
    );
    const data = await res.json();
    return data.records || [];
  } catch {
    return [];
  }
}

function parseNum(v: any): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(String(v).replace(/[$,]/g, ''));
  return isNaN(n) ? null : n;
}

function mapCreditScore(v: any): string | null {
  if (!v) return null;
  const n = parseInt(v);
  if (isNaN(n)) return String(v);
  if (n >= 800) return '800+';
  if (n >= 750) return '750-799';
  if (n >= 700) return '700-749';
  if (n >= 650) return '650-699';
  if (n >= 600) return '600-649';
  if (n >= 550) return '550-599';
  if (n >= 500) return '500-549';
  return 'Below 500';
}

function mapIndustry(v: any): string | null {
  if (!v) return null;
  const map: Record<string, string> = {
    'Construction': 'Construction',
    'Transportation': 'Transportation',
    'Health Services': 'Healthcare',
    'Retail': 'Retail',
    'Professional Services': 'Professional Services',
    'Utilities and Home Services': 'Construction',
    'Hospitality': 'Hospitality',
    'Restaurant': 'Restaurant',
  };
  return map[v] || v;
}

function clean(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== null && v !== undefined && v !== '') result[k] = v;
  }
  return result;
}

/**
 * Main sync function — call this after saving a loan_application.
 */
export async function syncApplicationToSalesforce(app: Record<string, any>): Promise<{ synced: boolean; action?: string; accountId?: string; contactId?: string; oppId?: string; reason?: string; error?: string }> {
  if (!SF_INSTANCE_URL || !SF_ACCESS_TOKEN) {
    console.log('[SF Sync] Skipped — no SF credentials configured');
    return { synced: false, reason: 'no credentials' };
  }

  try {
    const email = app.email || app.business_email || '';
    const phone = app.phone || '';
    const fullName = app.fullName || app.full_name || '';
    const businessName = app.businessName || app.business_name || app.legalBusinessName || '';
    const state = (app.state || '').toUpperCase().trim();

    console.log(`[SF Sync] Processing: ${businessName || fullName || email}`);

    // 1. Check for existing Opportunity by email or phone
    let existingOpp: any = null;

    if (email) {
      const byEmail = await sfQuery(
        `SELECT Id, Name FROM Opportunity WHERE Email__c = '${email.replace(/'/g, "\\'")}' LIMIT 1`
      );
      if (byEmail.length) existingOpp = byEmail[0];
    }

    if (!existingOpp && phone) {
      const digits = phone.replace(/\D/g, '').slice(-10);
      if (digits.length === 10) {
        const byPhone = await sfQuery(
          `SELECT Id, Name FROM Opportunity WHERE Phone_Number__c LIKE '%${digits}' LIMIT 1`
        );
        if (byPhone.length) existingOpp = byPhone[0];
      }
    }

    if (existingOpp) {
      const updateFields = clean({
        Amount_Requested__c: parseNum(app.requestedAmount || app.requested_amount),
        Monthly_Revenue__c: parseNum(app.monthlyRevenue || app.monthly_revenue),
        Industry__c: mapIndustry(app.industry),
        Personal_Credit_Score_Range__c: mapCreditScore(app.creditScore || app.credit_score),
        Primary_Business_Bank__c: app.bankName || app.bank_name || null,
        Purpose_Of_Funds__c: app.useOfFunds || app.use_of_funds || null,
        Funding_Time_Frame__c: app.fundingUrgency || app.funding_urgency || null,
      });

      if (Object.keys(updateFields).length > 0) {
        const res = await sfApi('PATCH', `/sobjects/Opportunity/${existingOpp.Id}`, updateFields);
        console.log(`[SF Sync] Updated existing Opp: ${existingOpp.Name} (${existingOpp.Id}) — ${res.success ? 'OK' : res.error}`);
        return { synced: true, action: 'updated', oppId: existingOpp.Id };
      }
      return { synced: true, action: 'no-update-needed', oppId: existingOpp.Id };
    }

    // 2. No match — create new Account + Contact + Opportunity

    // Get Merchant RecordTypeId
    const rts = await sfQuery(
      "SELECT Id FROM RecordType WHERE SObjectType='Account' AND Name='Merchant' AND IsActive=true"
    );
    const merchantRtId = rts[0]?.Id;

    const accountName = (businessName || fullName || email || 'Unknown').slice(0, 255);
    const nameParts = fullName.split(/\s+/);
    const today = new Date();
    const dateStr = `${today.getMonth() + 1}/${today.getDate()}/${String(today.getFullYear()).slice(2)}`;

    // Create Account
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
      ...((state || app.city) ? { BillingCountryCode: 'US' } : {}),
      Account_Status__c: 'Pending',
    });

    const acctRes = await sfApi('POST', '/sobjects/Account', account);
    if (!acctRes.success) {
      console.log(`[SF Sync] Account creation failed: ${acctRes.error}`);
      return { synced: false, error: `Account: ${acctRes.error}` };
    }

    // Create Contact
    const contact = clean({
      AccountId: acctRes.id,
      FirstName: nameParts[0] || null,
      LastName: nameParts.slice(1).join(' ') || email || 'Unknown',
      Email: email || null,
      Phone: phone || null,
      Personal_Credit_Score_Range__c: mapCreditScore(app.creditScore || app.credit_score),
      Scrubbed__c: false,
      Scrubbed1__c: false,
      Opted_In_for_AI_Calls__c: false,
      Opted_In_for_AI_Calls1__c: false,
      Do_Not_Contact__c: false,
      Consent_to_Text__c: false,
      MailingCity: app.city || null,
      ...(US_STATES.has(state) ? { MailingStateCode: state } : {}),
      ...((state || app.city) ? { MailingCountryCode: 'US' } : {}),
    });

    const ctRes = await sfApi('POST', '/sobjects/Contact', contact);

    // Create Opportunity
    const closeDate = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
    const opportunity = clean({
      AccountId: acctRes.id,
      Primary_Contact__c: ctRes.success ? ctRes.id : null,
      Name: `${accountName} - ${dateStr}`.slice(0, 120),
      StageName: 'Application & Docs',
      CloseDate: closeDate,
      Amount_Requested__c: parseNum(app.requestedAmount || app.requested_amount),
      Monthly_Revenue__c: parseNum(app.monthlyRevenue || app.monthly_revenue),
      Industry__c: mapIndustry(app.industry),
      Personal_Credit_Score_Range__c: mapCreditScore(app.creditScore || app.credit_score),
      Primary_Business_Bank__c: app.bankName || app.bank_name || null,
      Purpose_Of_Funds__c: app.useOfFunds || app.use_of_funds || null,
      Funding_Time_Frame__c: app.fundingUrgency || app.funding_urgency || null,
      MCA_Balance_Amount__c: parseNum(app.mcaBalanceAmount || app.mca_balance_amount),
      Phone_Number__c: phone || null,
      Email__c: email || null,
      LeadSource: app.referralSource || app.referral_source || 'Website',
      Revenue_Verified__c: false,
      Bank_Statement_Tampering_Flag__c: false,
    });

    const oppRes = await sfApi('POST', '/sobjects/Opportunity', opportunity);

    console.log(`[SF Sync] Created: Account=${acctRes.id}, Contact=${ctRes.id || 'failed'}, Opp=${oppRes.id || 'failed'}`);
    return {
      synced: true,
      action: 'created',
      accountId: acctRes.id,
      contactId: ctRes.id,
      oppId: oppRes.id,
    };

  } catch (err: any) {
    console.error(`[SF Sync] Error: ${err.message}`);
    return { synced: false, error: err.message };
  }
}
