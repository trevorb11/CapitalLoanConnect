/**
 * Chirp Instant Financial Verification (IFV) Service
 *
 * Replaces the previous Plaid integration. Chirp uses a request-based model:
 *   1. Create a verification request for a customer -> receive a `requestCode`
 *      plus hosted verification URLs (redirect or iframe widget).
 *   2. The customer completes bank verification on Chirp's hosted flow.
 *   3. Chirp notifies the lender (webhook) or the lender polls `getRequestStatus`.
 *   4. Once `Verified`, call `getRequestDetails` / `getSummaryInfoByRequestCode`
 *      to pull accounts, transactions, and pre-computed activity metrics.
 *
 * All Chirp API calls are routed through the chirp-middleware proxy, which has
 * a static IPv4 address whitelisted with Chirp. This eliminates the 403 errors
 * caused by Replit's rotating IPs and IPv6 addresses.
 *
 * Env vars:
 *   CHIRP_MIDDLEWARE_URL   - URL of the middleware proxy (e.g. https://your-server:3456/chirp)
 *   CHIRP_MIDDLEWARE_KEY   - API key for authenticating with the middleware
 *   CHIRP_API_TOKEN        - Fallback: direct Chirp API token (used if middleware not configured)
 *   CHIRP_BASE_URL         - Fallback: direct Chirp API URL (default: https://chirp.digital/api)
 *   CHIRP_ENV              - Informational only (sandbox | production)
 */

import axiosLib from "axios";

// ── Middleware config (preferred) ──────────────────────────────────────────────
const CHIRP_MIDDLEWARE_URL = process.env.CHIRP_MIDDLEWARE_URL || "";
const CHIRP_MIDDLEWARE_KEY = process.env.CHIRP_MIDDLEWARE_KEY || "";
const useMiddleware = !!(CHIRP_MIDDLEWARE_URL && CHIRP_MIDDLEWARE_KEY);

// ── Direct Chirp config (fallback) ────────────────────────────────────────────
const CHIRP_BASE_URL = process.env.CHIRP_BASE_URL || "https://chirp.digital/api";
const CHIRP_ENV = process.env.CHIRP_ENV || "production";
const IS_PROD = process.env.NODE_ENV === "production";
const CHIRP_API_TOKEN = !IS_PROD && process.env.CHIRP_SANDBOX_API_TOKEN
  ? process.env.CHIRP_SANDBOX_API_TOKEN
  : process.env.CHIRP_API_TOKEN || "";
const tokenHint = CHIRP_API_TOKEN ? `...${CHIRP_API_TOKEN.slice(-4)}` : "NOT SET";

if (useMiddleware) {
  console.log(`[CHIRP] Routing through middleware: ${CHIRP_MIDDLEWARE_URL}`);
} else {
  console.log(`[CHIRP] Direct mode — token: ${tokenHint} | base: ${CHIRP_BASE_URL}`);
  if (IS_PROD) {
    console.warn(`[CHIRP] WARNING: No middleware configured in production. You may hit 403s from Chirp's IP whitelist.`);
  }
}

// ── Axios instances ───────────────────────────────────────────────────────────

// Middleware client — clean, no WAF workarounds needed
const middlewareAxios = axiosLib.create({
  baseURL: CHIRP_MIDDLEWARE_URL,
  timeout: 35_000,
  headers: {
    "Content-Type": "application/json",
    "Accept": "application/json",
    "X-API-Key": CHIRP_MIDDLEWARE_KEY,
  },
});

// Direct Chirp client — fallback when middleware is not configured
const directAxios = axiosLib.create({
  baseURL: CHIRP_BASE_URL,
  timeout: 30_000,
  headers: {
    "Content-Type": "application/json",
    "Accept": "application/json",
  },
});

// Shared analysis types - kept compatible with the previous PlaidService so
// downstream consumers (funding analysis, AI summaries, merchant insights)
// keep working without refactors.
export interface AnalysisMetrics {
  monthlyRevenue: number;
  avgBalance: number;
  negativeDays: number;
}

export interface Recommendation {
  status: "High" | "Medium" | "Low";
  reason: string;
}

export interface AnalysisResult {
  metrics: AnalysisMetrics;
  recommendations: {
    sba: Recommendation;
    loc: Recommendation;
    mca: Recommendation;
  };
}

export interface BankStatement {
  accounts: Array<{
    accountId: string;
    name: string;
    type: string;
    subtype: string;
    currentBalance: number;
    availableBalance: number | null;
  }>;
  transactions: Array<{
    transactionId: string;
    date: string;
    name: string;
    amount: number;
    category: string[];
    pending: boolean;
  }>;
  institutionName: string;
  dateRange: {
    startDate: string;
    endDate: string;
  };
}

// Chirp-specific request/response shapes
export interface ChirpCreateRequestPayload {
  cusFirstName: string;
  cusLastName: string;
  cusEmail: string;
  cusPhone: string;
  cusAccNumber?: string;
  cusAbaNumber?: string;
  cusAccType?: string;
  bankName?: string;
  customerId?: string;
  productId?: string;
  leadId?: string;
  leadProvider?: string;
  notificationEmail?: string;
  notifyIf?: Array<"ALL" | "VERIFIED" | "ATTEMPTED">;
  requestXtraHistory?: boolean;
  requestAccountVerification?: boolean;
  requestAccountOwner?: boolean;
  lastFourDigitsOfDebitCard?: string;
  customerEnteredEmploymentInfo?: Array<{
    employerName: string;
    monthlyIncome: string;
  }>;
}

export interface ChirpCreateRequestResult {
  requestCode: string;
  verificationUrl: string; // ChirpVerificationURL - use for redirect
  widgetUrl: string;        // WidgetURL - use for iframe embed
  emailAddress: string;
  firstName: string;
  lastName: string;
  status: number;           // 0 unverified, 1 verified, 2 rejected, 3 expired
  addedOn: string;
}

export interface ChirpRequestStatus {
  requestCode: string;
  status: "Verified" | "Attempted" | "Rejected" | "Unverified - No Customer Action" | "Unverified - Incomplete Customer Action" | "Expired" | string;
  firstName: string;
  lastName: string;
  selectedBank: string;
  isAccountConnected: boolean;
  isLinkExpired: boolean;
  verificationLink: string;
  lastAggregatedAt?: string;
  connectionStatus?: string;
  statusDetails?: string;
}

export class ChirpApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown,
  ) {
    super(message);
    this.name = "ChirpApiError";
  }
}

export class ChirpService {
  private readonly baseUrl: string;
  private readonly token: string;

  constructor(baseUrl: string = CHIRP_BASE_URL, token: string = CHIRP_API_TOKEN) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.token = token;
  }

  /**
   * Core request method. Routes through middleware when configured,
   * falls back to direct Chirp API calls otherwise.
   */
  private async request<T>(
    path: string,
    init: { method?: string; body?: string; query?: Record<string, string | number | undefined>; headers?: Record<string, string> } = {},
  ): Promise<T> {
    const { query, headers: extraHeaders, method = "GET", body } = init;

    // Build query string
    let url = path;
    if (query) {
      const qs = Object.entries(query)
        .filter(([, v]) => v !== undefined && v !== null)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join("&");
      if (qs) url += `?${qs}`;
    }

    const bodyObj = body ? JSON.parse(body) : undefined;

    if (useMiddleware) {
      return this.requestViaMiddleware<T>(url, method, bodyObj, extraHeaders);
    }
    return this.requestDirect<T>(url, method, bodyObj, extraHeaders);
  }

  /**
   * Route request through the chirp-middleware proxy.
   * The middleware handles IPv4, Chirp auth, and WAF issues.
   */
  private async requestViaMiddleware<T>(
    url: string,
    method: string,
    body?: any,
    extraHeaders?: Record<string, string>,
  ): Promise<T> {
    try {
      const response = await middlewareAxios.request<T>({
        method: method as any,
        url,
        data: body,
        headers: extraHeaders,
        validateStatus: () => true,
      });

      if (response.status >= 400) {
        const respBody = response.data;
        const message = (respBody && typeof respBody === "object" && ((respBody as any).message || (respBody as any).error)) || `Chirp API error ${response.status}`;
        console.error(`[CHIRP via middleware] ${response.status} ${url}`, typeof respBody === "string" ? respBody.slice(0, 200) : respBody);
        throw new ChirpApiError(String(message), response.status, respBody);
      }

      return response.data;
    } catch (err: any) {
      if (err instanceof ChirpApiError) throw err;
      throw new ChirpApiError(err.message || "Network error calling Chirp middleware", 502);
    }
  }

  /**
   * Direct request to Chirp API (fallback when middleware is not configured).
   */
  private async requestDirect<T>(
    url: string,
    method: string,
    body?: any,
    extraHeaders?: Record<string, string>,
  ): Promise<T> {
    if (!this.token) {
      throw new ChirpApiError("CHIRP_API_TOKEN is not configured", 500);
    }

    try {
      const response = await directAxios.request<T>({
        method: method as any,
        url,
        baseURL: this.baseUrl,
        data: body,
        headers: { Authorization: this.token, ...extraHeaders },
        validateStatus: () => true,
      });

      if (response.status >= 400) {
        const respBody = response.data;
        const message = (respBody && typeof respBody === "object" && ((respBody as any).message || (respBody as any).error)) || `Chirp API error ${response.status}`;
        console.error(`[CHIRP direct] ${response.status} ${url}`, typeof respBody === "string" ? respBody.slice(0, 200) : respBody);
        throw new ChirpApiError(String(message), response.status, respBody);
      }

      return response.data;
    } catch (err: any) {
      if (err instanceof ChirpApiError) throw err;
      throw new ChirpApiError(err.message || "Network error calling Chirp API", 500);
    }
  }

  // ---------------------------------------------------------------------------
  // Verification request lifecycle
  // ---------------------------------------------------------------------------

  async createVerificationRequest(payload: ChirpCreateRequestPayload): Promise<ChirpCreateRequestResult> {
    const body = await this.request<any>("/createRequest", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const data = body?.response || body?.result || body;

    return {
      requestCode: data.RequestCode || data.requestCode,
      verificationUrl: data.ChirpVerificationURL || data.LendMateVerificationURL || data.verificationUrl,
      widgetUrl: data.WidgetURL || data.widgetUrl,
      emailAddress: data.EmailAddress || data.emailAddress,
      firstName: data.FirstName || data.firstName,
      lastName: data.LastName || data.lastName,
      status: Number(data.Status ?? 0),
      addedOn: data.AddedOn || data.addedOn,
    };
  }

  async createMerchantVerificationRequest(
    merchantEmail: string,
    customer: { firstName: string; lastName: string; phone: string },
    opts: Partial<ChirpCreateRequestPayload> = {},
  ): Promise<ChirpCreateRequestResult> {
    return this.createVerificationRequest({
      cusFirstName: customer.firstName,
      cusLastName: customer.lastName,
      cusEmail: merchantEmail,
      cusPhone: customer.phone,
      bankName: opts.bankName,
      customerId: opts.customerId,
      productId: opts.productId,
      notificationEmail: opts.notificationEmail,
      notifyIf: opts.notifyIf,
      ...opts,
    });
  }

  /**
   * Fetch the current status of a verification request.
   * When using middleware, this hits POST /getRequestStatus/:code (the endpoint
   * pattern Chirp support confirmed works without WAF issues).
   */
  async getRequestStatus(requestCode: string): Promise<ChirpRequestStatus> {
    // Middleware exposes POST /getRequestStatus/:code which maps to the
    // Chirp POST endpoint that bypasses WAF restrictions on GET.
    const path = useMiddleware
      ? `/getRequestStatus/${encodeURIComponent(requestCode)}`
      : `/request/${encodeURIComponent(requestCode)}/status`;
    const method = useMiddleware ? "POST" : "GET";

    const body = await this.request<any>(path, { method });
    const data = body?.response || body?.result || body;
    return {
      requestCode: data.RequestCode || requestCode,
      status: data.Status,
      firstName: data.FirstName,
      lastName: data.LastName,
      selectedBank: data.SelectedBank,
      isAccountConnected: Boolean(data.isAccountConnected),
      isLinkExpired: Boolean(data.isLinkExpired),
      verificationLink: data.VerificationLink,
      lastAggregatedAt: data.LastAggregatedAt,
      connectionStatus: data.connectionStatus,
      statusDetails: data.statusDetails,
    };
  }

  async getRequestDetails(
    requestCode: string,
    opts: { numberOfDays?: number; numberOfTransactions?: number; sort?: "ASCENDING" | "DESCENDING" } = {},
  ): Promise<any> {
    // Middleware maps /request/:code/details -> Chirp GET /request/:code
    const path = useMiddleware
      ? `/request/${encodeURIComponent(requestCode)}/details`
      : `/request/${encodeURIComponent(requestCode)}`;

    const body = await this.request<any>(path, {
      query: {
        numberOfDays: opts.numberOfDays,
        numberOfTransactions: opts.numberOfTransactions,
        sort: opts.sort,
      },
    });
    return body?.response || body?.result || body;
  }

  async getSummaryInfoByRequestCode(
    requestCode: string,
    accountNumber?: string,
    chirpAccountId?: string,
  ): Promise<any> {
    const body = await this.request<any>(`/request/${encodeURIComponent(requestCode)}/summary`, {
      query: { accountNumber, chirpAccountId },
    });
    return body?.response || body?.result || body;
  }

  // ---------------------------------------------------------------------------
  // Drop-in compatibility with the old PlaidService shape
  // ---------------------------------------------------------------------------

  async getBankStatements(requestCode: string, months: number = 3): Promise<BankStatement> {
    const days = months * 31;
    const details = await this.getRequestDetails(requestCode, { numberOfDays: days, sort: "DESCENDING" });

    const chirpAccounts: any[] = details?.Accounts || details?.accounts || [];
    const transactionSummaries: any[] = details?.TransactionSummaries || details?.transactionSummaries || [];

    const accounts = chirpAccounts.map((acc: any) => ({
      accountId: acc.chirpAccountId || acc.guid || acc.account_id || "",
      name: acc.name || acc.accountName || "Unknown Account",
      type: acc.type || "",
      subtype: acc.subtype || "",
      currentBalance: Number(acc.balance ?? acc.available_balance ?? 0),
      availableBalance: acc.available_balance != null ? Number(acc.available_balance) : null,
    }));

    // Chirp returns TransactionSummaries as a flat array where each item
    // IS a transaction directly (not a wrapper with a nested sub-array).
    const transactions = transactionSummaries.map((txn: any) => ({
      transactionId: txn.chirpTransactionId || txn.guid || txn.id || "",
      date: txn.date || txn.transacted_at || txn.posted_at || "",
      name: txn.description || txn.original_description || "",
      amount: Number(txn.amount ?? 0),
      category: [txn.top_level_category, txn.category].filter(Boolean),
      pending: String(txn.status || "").toUpperCase() === "PENDING",
      type: txn.type || (txn.is_income ? "CREDIT" : "DEBIT"),
    }));

    const dates = transactions.map(t => t.date).filter(Boolean).sort();
    const endDate = dates[dates.length - 1] || new Date().toISOString().split("T")[0];
    const startDate = dates[0] || (() => {
      const d = new Date();
      d.setMonth(d.getMonth() - months);
      return d.toISOString().split("T")[0];
    })();

    return {
      accounts,
      transactions,
      institutionName: details?.institutionName || details?.InstitutionName || "Unknown Bank",
      dateRange: { startDate, endDate },
    };
  }

  async analyzeFinancials(requestCode: string, accountNumber?: string): Promise<AnalysisResult> {
    const summary = await this.getSummaryInfoByRequestCode(requestCode, accountNumber);

    const activityByMonth: any[] = summary?.activityByMonth || [];
    const overall = activityByMonth.find((m: any) => (m.month || "").toLowerCase() === "all") || activityByMonth[0];

    const parseMoney = (value: unknown): number => {
      if (typeof value === "number") return value;
      if (typeof value !== "string") return 0;
      const cleaned = value.replace(/[^0-9.\-]/g, "");
      const n = Number.parseFloat(cleaned);
      return Number.isFinite(n) ? n : 0;
    };

    const perMonthCredits = activityByMonth
      .filter((m: any) => (m.month || "").toLowerCase() !== "all")
      .map((m: any) => parseMoney(m.totalCredit));
    const monthlyRevenue = perMonthCredits.length
      ? perMonthCredits.reduce((a, b) => a + b, 0) / perMonthCredits.length
      : parseMoney(overall?.totalCredit);

    const avgBalance = parseMoney(overall?.averageDailyBalance ?? overall?.averageMonthlyBalance);
    const currentBalance = parseMoney(summary?.currentBalance);

    const negativeDays = currentBalance < 0 ? 5 : 0;

    const recommendations = this.generateRecommendations(monthlyRevenue, avgBalance, negativeDays);

    return {
      metrics: {
        monthlyRevenue: Math.round(monthlyRevenue * 100) / 100,
        avgBalance: Math.round(avgBalance * 100) / 100,
        negativeDays,
      },
      recommendations,
    };
  }

  private generateRecommendations(
    monthlyRevenue: number,
    avgBalance: number,
    negativeDays: number,
  ): { sba: Recommendation; loc: Recommendation; mca: Recommendation } {
    let sba: Recommendation = {
      status: "Low",
      reason: "Requires higher consistent daily balances and at least 2 years of business history.",
    };
    let loc: Recommendation = {
      status: "Low",
      reason: "Revenue is promising, but cash reserves are below typical requirements.",
    };
    let mca: Recommendation = {
      status: "High",
      reason: "Your deposit history shows strong consistent cash flow, making you a great candidate.",
    };

    if (monthlyRevenue >= 50000 && avgBalance >= 10000 && negativeDays <= 5) {
      sba = { status: "High", reason: "Strong financials indicate high likelihood of SBA approval." };
      loc = { status: "High", reason: "Your cash flow and reserves support a healthy Line of Credit." };
    } else if (monthlyRevenue >= 25000 && avgBalance >= 5000) {
      sba = { status: "Medium", reason: "Revenue is solid; we'd need to verify 2+ years of business history." };
      loc = { status: "High", reason: "Your monthly deposits support a Line of Credit application." };
    } else if (monthlyRevenue >= 15000) {
      loc = { status: "Medium", reason: "Revenue supports a smaller line; higher deposits would help." };
    }

    if (negativeDays > 15) {
      mca = {
        status: "Medium",
        reason: "Your deposit pattern is good, but frequent negative balances may affect terms.",
      };
    }

    return { sba, loc, mca };
  }

  // ---------------------------------------------------------------------------
  // Reports
  // ---------------------------------------------------------------------------

  async getRequestReportAsPDF(
    requestCode: string,
    account: { accountNumber?: string; chirpAccountId?: string },
  ): Promise<{ fileDownloadLink: string; requestCode: string }> {
    const body = await this.request<any>(`/request/${encodeURIComponent(requestCode)}/report/pdf`, {
      method: "POST",
      body: JSON.stringify({
        requestCode,
        ...(account.chirpAccountId ? { chirpAccountId: account.chirpAccountId } : { accountNumber: account.accountNumber }),
      }),
    });
    return {
      fileDownloadLink: body?.fileDownloadLink || body?.result?.fileDownloadLink,
      requestCode: body?.requestCode || requestCode,
    };
  }

  async downloadReportPdfBytes(requestCode: string, account: { accountNumber?: string; chirpAccountId?: string }): Promise<Buffer> {
    const { fileDownloadLink } = await this.getRequestReportAsPDF(requestCode, account);
    if (!fileDownloadLink) {
      throw new ChirpApiError("Chirp did not return a PDF download link", 502);
    }
    const res = await fetch(fileDownloadLink);
    if (!res.ok) {
      throw new ChirpApiError(`Failed to download Chirp PDF: ${res.status}`, res.status);
    }
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  // ---------------------------------------------------------------------------
  // Refresh / lifecycle
  // ---------------------------------------------------------------------------

  async refreshRequest(requestCode: string, metaInfo?: Record<string, string>): Promise<{
    status: string;
    aggregatedAt: string;
    bankName: string;
    isBeingAggregated: boolean;
  }> {
    const body = await this.request<any>(`/request/${encodeURIComponent(requestCode)}/refresh`, {
      method: "POST",
      body: JSON.stringify(metaInfo ? { metaInfo } : {}),
    });
    return {
      status: body?.status || body?.Status,
      aggregatedAt: body?.aggregatedAt || body?.AggregatedAt,
      bankName: body?.bankName || body?.BankName,
      isBeingAggregated: Boolean(body?.isBeingAggregated),
    };
  }

  async unsubscribeRequest(requestCode: string): Promise<{ success: boolean; message: string }> {
    const body = await this.request<any>(`/request/${encodeURIComponent(requestCode)}/unsubscribe`, {
      method: "POST",
    });
    return {
      success: Boolean(body?.success),
      message: body?.message || "",
    };
  }

  async updateRequestStatus(requestCode: string, statusToUpdate: "REJECTED"): Promise<{ success: boolean; message: string }> {
    const body = await this.request<any>(`/request/status/update`, {
      method: "POST",
      body: JSON.stringify({ requestCode, statusToUpdate }),
    });
    return {
      success: Boolean(body?.success),
      message: body?.message || "",
    };
  }

  async getRequestTrackInfo(requestCodes: string[]): Promise<any[]> {
    const body = await this.request<any>(`/request/trackInfo`, {
      method: "POST",
      body: JSON.stringify({ requestCodes: JSON.stringify(requestCodes) }),
    });
    return body?.result || body?.response || [];
  }

  // ---------------------------------------------------------------------------
  // Customer notifications (webhooks & email alerts)
  // ---------------------------------------------------------------------------

  async createCustomerNotification(config: {
    name: string;
    requestCode: string;
    type: string;
    rule: string;
    amount?: number;
    webhookUrl?: string[];
    emails?: string[];
    notifyIf?: string[];
    notifyViaEmail?: boolean;
    notifyViaWebhook?: boolean;
    active?: boolean;
    keywords?: string[];
    enableRetryTimeout?: boolean;
    retryTimeout?: number;
    authorizationType?: "NONE" | "BASIC" | "OAUTH2" | "JWT" | "KEY_VALUE";
    authorizationToken?: string;
    authorizationHeaderKey?: string;
    authorizationHeaderValue?: string;
    retryLimit?: number;
    retryEmail?: string;
  }): Promise<{ success: boolean; message: string }> {
    const body = await this.request<any>(`/customer/notification`, {
      method: "POST",
      body: JSON.stringify(config),
    });
    return {
      success: Boolean(body?.success),
      message: body?.message || "",
    };
  }

  // ---------------------------------------------------------------------------
  // ChirpLink widget token
  // ---------------------------------------------------------------------------

  async genAuthTokenForChirpLink(requestCode: string): Promise<{
    success: boolean;
    token: string;
    requestCode: string;
    validUpto: string;
  }> {
    // Middleware uses /genAuthTokenForChirpLink/:code
    // which internally maps to Chirp's /genAuthTokenForChirpLink/chirpLink/:code
    const path = useMiddleware
      ? `/genAuthTokenForChirpLink/${encodeURIComponent(requestCode)}`
      : `/genAuthTokenForChirpLink/chirpLink/${encodeURIComponent(requestCode)}`;
    const body = await this.request<any>(path, { method: "POST", body: JSON.stringify({}) });
    return {
      success: Boolean(body?.success),
      token: body?.token || "",
      requestCode: body?.requestCode || requestCode,
      validUpto: body?.validUpto || "",
    };
  }

  // ---------------------------------------------------------------------------
  // Misc helpers
  // ---------------------------------------------------------------------------

  get environment(): string {
    return CHIRP_ENV;
  }
}

export const chirpService = new ChirpService();
