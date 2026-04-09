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
 * Unlike Plaid, Chirp does not issue a long-lived access token. The
 * `requestCode` is the sole identifier and all calls are authenticated with the
 * Entity API token via the `Authorization: Bearer` header.
 *
 * Env vars:
 *   CHIRP_API_TOKEN  - Entity API token (sandbox or production)
 *   CHIRP_BASE_URL   - Optional override. Defaults to https://chirp.digital/api
 *   CHIRP_ENV        - Informational only (sandbox | production). Token determines environment.
 */

const CHIRP_BASE_URL = process.env.CHIRP_BASE_URL || "https://chirp.digital/api";
const CHIRP_API_TOKEN = process.env.CHIRP_API_TOKEN || "";
const CHIRP_ENV = process.env.CHIRP_ENV || "sandbox";

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

  private async request<T>(
    path: string,
    init: RequestInit & { query?: Record<string, string | number | undefined> } = {},
  ): Promise<T> {
    if (!this.token) {
      throw new ChirpApiError("CHIRP_API_TOKEN is not configured", 500);
    }

    const { query, headers, ...rest } = init;
    let url = `${this.baseUrl}${path}`;
    if (query) {
      const qs = Object.entries(query)
        .filter(([, v]) => v !== undefined && v !== null)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join("&");
      if (qs) url += `?${qs}`;
    }

    const response = await fetch(url, {
      ...rest,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Authorization: this.token,
        ...headers,
      },
    });

    const text = await response.text();
    let body: any = null;
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = text;
      }
    }

    if (!response.ok) {
      const message = (body && typeof body === "object" && (body.message || body.error)) || `Chirp API error ${response.status}`;
      console.error(`[CHIRP] ${response.status} ${path}`, body);
      throw new ChirpApiError(String(message), response.status, body);
    }

    return body as T;
  }

  // ---------------------------------------------------------------------------
  // Verification request lifecycle
  // ---------------------------------------------------------------------------

  /**
   * Create a verification request for a customer. Returns the verification URL
   * that the customer should be redirected to (or loaded into an iframe via
   * widgetUrl). Replaces `PlaidService.createLinkToken`.
   */
  async createVerificationRequest(payload: ChirpCreateRequestPayload): Promise<ChirpCreateRequestResult> {
    const body = await this.request<any>("/createRequest", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    // The Chirp API wraps results inconsistently across endpoints - some
    // return fields at the top level, some under `response` or `result`.
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

  /**
   * Convenience wrapper for creating a merchant-level verification request.
   * Keeps naming parity with the previous `createMerchantLinkToken`.
   */
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
   * Fetch the current status of a verification request. Use this for polling
   * if you are not wired up to webhooks.
   */
  async getRequestStatus(requestCode: string): Promise<ChirpRequestStatus> {
    const body = await this.request<any>(`/request/${encodeURIComponent(requestCode)}/status`);
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

  /**
   * Fetch full verification details - accounts, transactions, analysis
   * summaries and institution. Only valid for verified requests.
   * Equivalent to calling Plaid's transactionsGet + accountsGet + institutionsGetById.
   */
  async getRequestDetails(
    requestCode: string,
    opts: { numberOfDays?: number; numberOfTransactions?: number; sort?: "ASCENDING" | "DESCENDING" } = {},
  ): Promise<any> {
    const body = await this.request<any>(`/request/${encodeURIComponent(requestCode)}`, {
      query: {
        numberOfDays: opts.numberOfDays,
        numberOfTransactions: opts.numberOfTransactions,
        sort: opts.sort,
      },
    });
    return body?.response || body?.result || body;
  }

  /**
   * Pre-computed summary info for a verified request. Includes monthly
   * activity (avg daily balance, total credit/debit/payroll/net) which Chirp
   * calculates server-side - saves the custom aggregation we used to do in
   * PlaidService.analyzeFinancials.
   */
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

  /**
   * Drop-in replacement for `PlaidService.getBankStatements`. Maps the Chirp
   * `getRequestDetails` response into the existing BankStatement shape so
   * downstream consumers don't need to change.
   */
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

    const transactions = transactionSummaries.flatMap((summary: any) => {
      const list: any[] = summary.transactions || summary.transaction || [];
      return list.map((txn: any) => ({
        transactionId: txn.chirpTransactionId || txn.guid || txn.id || "",
        date: txn.date || txn.transacted_at || txn.posted_at || "",
        name: txn.description || txn.original_description || "",
        amount: Number(txn.amount ?? 0),
        category: [txn.top_level_category, txn.category].filter(Boolean),
        pending: String(txn.status || "").toUpperCase() === "PENDING",
      }));
    });

    // Compute date range from the transactions we received
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

  /**
   * Drop-in replacement for `PlaidService.analyzeFinancials`. Prefers Chirp's
   * pre-computed `activityByMonth` from the summary endpoint instead of
   * recomputing totals from raw transactions.
   */
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

    // Chirp returns totalCredit as the deposit aggregate, which is analogous
    // to what we previously called "monthly revenue" after dividing by months.
    const perMonthCredits = activityByMonth
      .filter((m: any) => (m.month || "").toLowerCase() !== "all")
      .map((m: any) => parseMoney(m.totalCredit));
    const monthlyRevenue = perMonthCredits.length
      ? perMonthCredits.reduce((a, b) => a + b, 0) / perMonthCredits.length
      : parseMoney(overall?.totalCredit);

    const avgBalance = parseMoney(overall?.averageDailyBalance ?? overall?.averageMonthlyBalance);
    const currentBalance = parseMoney(summary?.currentBalance);

    // Chirp does not expose negative-day counts in the summary. Fall back to a
    // conservative heuristic based on current balance until we wire up the
    // detailed per-day aggregation from `getRequestDetails`.
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

  /**
   * Request a PDF verification report. Replaces the Plaid asset-report flow
   * (createAssetReport -> poll getAssetReport -> getAssetReportPdf). Chirp
   * returns a downloadable link in a single call. Link + file are valid for
   * 12 hours.
   */
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

  /**
   * Fetch the raw PDF bytes. Convenience wrapper that follows the download
   * link returned by `getRequestReportAsPDF`.
   */
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

  /**
   * Trigger a synchronous refresh of transactions/accounts for a verified
   * request. Attempts within 3 hours of a prior refresh will 405. `metaInfo`
   * can carry up to 5 custom key/value pairs for traceability back to the LMS.
   */
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

  /**
   * Permanently unsubscribe (subscription) or disconnect (PAYG) a request.
   * Historical transactions are retained but no further refreshes are allowed.
   */
  async unsubscribeRequest(requestCode: string): Promise<{ success: boolean; message: string }> {
    const body = await this.request<any>(`/request/${encodeURIComponent(requestCode)}/unsubscribe`, {
      method: "POST",
    });
    return {
      success: Boolean(body?.success),
      message: body?.message || "",
    };
  }

  /**
   * Update request status. Currently Chirp only supports Attempted -> Rejected.
   */
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

  /**
   * Bulk fetch of request metadata. Use this to hydrate the admin dashboard
   * instead of per-request lookups. Accepts up to 1000 request codes.
   */
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
    type: string; // e.g. "DEPOSIT", "REQUEST_STATUS", "REFRESH"
    rule: string; // e.g. "GREATER_THAN", "LESS_THAN"
    amount?: number;
    webhookUrl?: string[];
    emails?: string[];
    notifyViaEmail: boolean;
    notifyViaWebhook: boolean;
    active: boolean;
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

  /**
   * Generate a one-time token for the ChirpLink™ frontend widget.
   * Must be called after `createVerificationRequest` to obtain a requestCode.
   * Endpoint: POST /genAuthTokenForChirpLink/chirpLink/<requestCode>
   * Note: Chirp uses bare token (no "Bearer" prefix) for this specific endpoint.
   */
  async genAuthTokenForChirpLink(requestCode: string): Promise<{
    success: boolean;
    token: string;
    requestCode: string;
    validUpto: string;
  }> {
    const url = `${this.baseUrl}/genAuthTokenForChirpLink/chirpLink/${encodeURIComponent(requestCode)}`;
    if (!this.token) {
      throw new ChirpApiError("CHIRP_API_TOKEN is not configured", 500);
    }
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: this.token,
      },
    });
    const text = await response.text();
    let body: any = null;
    try { body = JSON.parse(text); } catch { body = text; }
    if (!response.ok) {
      const message = (body && typeof body === "object" && (body.message || body.error)) || `Chirp genAuthToken error ${response.status}`;
      throw new ChirpApiError(String(message), response.status, body);
    }
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

  /** Exposes configured environment for logging / health checks. */
  get environment(): string {
    return CHIRP_ENV;
  }
}

export const chirpService = new ChirpService();
