/**
 * GigFi Partner API Integration Service
 *
 * Handles submission of low-revenue merchant leads to GigFi's lending platform
 * via the Taktile Decide API. Merchants with $2K-$10K monthly revenue are routed
 * here instead of the standard "you don't qualify" dead-end.
 */

const GIGFI_SANDBOX_URL = "https://risk.bf9baa41.decide.taktile.com/run/api/v1/flows/gigfileads/sandbox/decide";
const GIGFI_LIVE_URL = "https://risk.bf9baa41.decide.taktile.com/run/api/v1/flows/gigfileads/decide";

// Environment-driven config
const GIGFI_API_KEY = process.env.GIGFI_API_KEY || "";
const GIGFI_LEAD_PROVIDER = process.env.GIGFI_LEAD_PROVIDER || "TodayCapitalGroup";
const GIGFI_LEAD_AFFILIATE = process.env.GIGFI_LEAD_AFFILIATE || "TodayCapitalGroup";
const GIGFI_ENVIRONMENT = process.env.GIGFI_ENVIRONMENT || "sandbox"; // "sandbox" or "live"

export interface GigFiLeadData {
  // From the original quiz intake
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  businessName: string;
  monthlyRevenue: number;
  financingAmount: number;
  businessAge?: string;

  // From the supplemental GigFi form
  ssn: string;            // 9 digits, no dashes
  dob: string;            // YYYY-MM-DD
  homeAddress: string;
  homeCity: string;
  homeState: string;      // 2-char state code
  homeZip: string;        // 5 digits
  bankName?: string;
  abaNumber?: string;      // 9-digit routing number
  accountNumber?: string;
  accountType?: string;    // "C" for Checking, "S" for Savings
  payFrequency: string;   // "1"=Weekly, "2"=Bi-weekly, "3"=Semi-monthly, "4"=Monthly
  nextPayDay: string;     // mm/dd/yyyy

  // Optional
  homePhone?: string;
  cellPhone?: string;
  clientIpAddress?: string;
}

export interface GigFiResponse {
  success: boolean;
  status: "ACCEPTED" | "REJECTED" | "ERROR";
  redirectUrl?: string;
  bidAmount?: number;
  decisionId?: string;
  errorMessage?: string;
}

function deriveEmploymentLength(businessAge?: string): number {
  if (!businessAge) return 12;
  const mapping: Record<string, number> = {
    "Less than 3 months": 2,
    "3-5 months": 4,
    "6-12 months": 9,
    "1-2 years": 18,
    "2-5 years": 42,
    "More than 5 years": 72,
  };
  return mapping[businessAge] ?? 12;
}

function formatPhoneForGigFi(phone: string): string {
  const digits = phone.replace(/\D/g, "").slice(0, 10);
  if (digits.length !== 10) return phone;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function buildGigFiPayload(data: GigFiLeadData, refId: string) {
  const cellPhone = formatPhoneForGigFi(data.cellPhone || data.phone);

  return {
    data: {
      RefID: refId,
      LeadProvider: GIGFI_LEAD_PROVIDER,
      LeadAffiliate: GIGFI_LEAD_AFFILIATE,
      LeadCost: 0,
      Firstname: data.firstName,
      Lastname: data.lastName,
      SSN: data.ssn.replace(/\D/g, ""),
      Email: data.email,
      DOB: data.dob,
      Language: "e",
      Military: "n",
      HomeAddress: data.homeAddress,
      HomeCity: data.homeCity,
      HomeState: data.homeState,
      HomeZip: data.homeZip,
      ...(data.homePhone && { HomePhone: formatPhoneForGigFi(data.homePhone) }),
      CellPhone: cellPhone,
      BankInfo: {
        AccountToUse: "C",
      },
      EmploymentInfo: {
        MonthlyIncome: data.monthlyRevenue,
        PayFrequency: data.payFrequency,
        IncomeType: "5", // Self-Employed (business owners)
        PayrollType: "3", // Direct Deposit
        NextPayDay: data.nextPayDay,
        Employer: data.businessName,
        EmploymentLength: deriveEmploymentLength(data.businessAge),
      },
      LoanInfo: {
        Amount: data.financingAmount,
      },
      ...(data.clientIpAddress && { ClientIPAddress: data.clientIpAddress }),
    },
    metadata: {
      entity_id: refId,
    },
    control: {
      execution_mode: "sync",
    },
    ...(GIGFI_ENVIRONMENT === "sandbox" && { mock_data: {} }),
  };
}

export async function submitToGigFi(data: GigFiLeadData, applicationId: string): Promise<GigFiResponse> {
  if (!GIGFI_API_KEY) {
    console.error("[GIGFI] API key not configured. Set GIGFI_API_KEY environment variable.");
    return {
      success: false,
      status: "ERROR",
      errorMessage: "GigFi integration is not configured. Please contact support.",
    };
  }

  const endpoint = GIGFI_ENVIRONMENT === "live" ? GIGFI_LIVE_URL : GIGFI_SANDBOX_URL;
  const refId = `TCG-${applicationId}`;
  const payload = buildGigFiPayload(data, refId);

  console.log(`[GIGFI] Submitting lead ${refId} to ${GIGFI_ENVIRONMENT} environment → ${endpoint}`);
  console.log(`[GIGFI] Outbound payload for ${refId}:`, JSON.stringify(payload));

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": GIGFI_API_KEY,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    console.log(`[GIGFI] Response for ${refId}: HTTP ${response.status}, status=${result?.data?.status || result?.status}`);
    console.log(`[GIGFI] Full response body for ${refId}:`, JSON.stringify(result));

    // Log the decision ID for debugging
    const decisionId = result?.metadata?.decision_id;
    if (decisionId) {
      console.log(`[GIGFI] Decision ID: ${decisionId}`);
    }

    if (!response.ok) {
      const errorMsg = result?.detail?.msg || result?.detail || result?.message || result?.error || `HTTP ${response.status}`;
      console.error(`[GIGFI] Error response for ${refId}:`, errorMsg);
      return {
        success: false,
        status: "ERROR",
        decisionId,
        errorMessage: typeof errorMsg === "string" ? errorMsg : JSON.stringify(errorMsg),
      };
    }

    const dataStatus = result?.data?.status;

    if (dataStatus === "ACCEPTED") {
      console.log(`[GIGFI] Lead ${refId} ACCEPTED. Redirect URL: ${result.data.redirect_url}`);
      return {
        success: true,
        status: "ACCEPTED",
        redirectUrl: result.data.redirect_url,
        bidAmount: result.data.bid_amount,
        decisionId,
      };
    }

    if (dataStatus === "REJECTED") {
      console.log(`[GIGFI] Lead ${refId} REJECTED`);
      return {
        success: true,
        status: "REJECTED",
        decisionId,
      };
    }

    // Error or unexpected status
    const errMsg = result?.detail?.msg || "Unexpected response from GigFi";
    console.error(`[GIGFI] Unexpected status for ${refId}:`, dataStatus, errMsg);
    return {
      success: false,
      status: "ERROR",
      decisionId,
      errorMessage: errMsg,
    };
  } catch (error: any) {
    console.error(`[GIGFI] Network error submitting ${refId}:`, error.message);
    return {
      success: false,
      status: "ERROR",
      errorMessage: "Unable to connect to GigFi. Please try again.",
    };
  }
}

export function isGigFiConfigured(): boolean {
  return !!GIGFI_API_KEY;
}
