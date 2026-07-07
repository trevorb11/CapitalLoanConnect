import {
  users, loanApplications, plaidItems, fundingAnalyses, bankStatementUploads, botAttempts, partners, lenderApprovals, businessUnderwritingDecisions, lenders, visitLogs, plaidStatements, congratulationsUploads, merchantMessages, systemSettings, merchantPortalAccounts, merchantPlaidConnections, merchantFinancialInsights, merchantBankSnapshots,
  type User, type InsertUser, type LoanApplication, type InsertLoanApplication,
  type PlaidItem, type InsertPlaidItem, type FundingAnalysis, type InsertFundingAnalysis,
  type BankStatementUpload, type InsertBankStatementUpload,
  type BotAttempt, type InsertBotAttempt,
  type Partner, type InsertPartner,
  type LenderApproval, type InsertLenderApproval,
  type BusinessUnderwritingDecision, type InsertBusinessUnderwritingDecision,
  type Lender, type InsertLender,
  type VisitLog, type InsertVisitLog,
  type PlaidStatement as PlaidStatementRecord, type InsertPlaidStatement,
  type CongratulationsUpload, type InsertCongratulationsUpload,
  type MerchantMessage, type InsertMerchantMessage,
  type SystemSetting,
  type MerchantPortalAccount, type InsertMerchantPortalAccount,
  type MerchantPlaidConnection, type InsertMerchantPlaidConnection,
  type MerchantFinancialInsight, type InsertMerchantFinancialInsight,
  type MerchantBankSnapshot, type InsertMerchantBankSnapshot,
  repCallStats,
  type RepCallStat, type InsertRepCallStat,
  applicationSubmissions,
  type ApplicationSubmission,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc, sql, ilike, getTableColumns, isNotNull, isNull, gte, inArray } from "drizzle-orm";

// Retry wrapper for database operations to handle connection drops
async function withRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  maxRetries: number = 3,
  delayMs: number = 500
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      const isRetryable = 
        error.message?.includes('terminating connection') ||
        error.message?.includes('connection') ||
        error.code === 'ECONNRESET' ||
        error.code === '57P01' || // admin_shutdown
        error.code === '08006' || // connection_failure
        error.code === '08003';   // connection_does_not_exist
      
      if (isRetryable && attempt < maxRetries) {
        console.log(`[DB RETRY] ${operationName} failed (attempt ${attempt}/${maxRetries}), retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
        continue;
      }
      
      console.error(`[DB ERROR] ${operationName} failed after ${attempt} attempts:`, error.message);
      throw error;
    }
  }
  
  throw lastError;
}

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getLoanApplication(id: string): Promise<LoanApplication | undefined>;
  getLoanApplicationByEmail(email: string): Promise<LoanApplication | undefined>;
  getAnyLoanApplicationByEmail(email: string): Promise<LoanApplication | undefined>;
  getLoanApplicationByEmailOrPhone(emailOrPhone: string): Promise<LoanApplication | undefined>;
  createLoanApplication(application: Partial<InsertLoanApplication>): Promise<LoanApplication>;
  updateLoanApplication(id: string, application: Partial<InsertLoanApplication>): Promise<LoanApplication | undefined>;
  getAllLoanApplications(): Promise<LoanApplication[]>;
  getAllLoanApplicationsSummary(): Promise<Omit<LoanApplication, 'applicantSignature'>[]>;
  getSubmissionsForApplicationIds(ids: string[]): Promise<ApplicationSubmission[]>;
  getApplicationsSummaryFiltered(opts: { search?: string; limit?: number; agentEmail?: string }): Promise<Omit<LoanApplication, 'applicantSignature'>[]>;
  getApplicationsCount(opts?: { search?: string; agentEmail?: string }): Promise<number>;
  getApplicationEmailsByAgentEmail(agentEmail: string): Promise<string[]>;
  searchFullApplicationsForGigFi(query: string): Promise<LoanApplication[]>;
  
  // Chirp methods
  saveChirpRequestCode(email: string, phone: string, requestCode: string): Promise<void>;
  getApplicationsWithChirpCode(): Promise<LoanApplication[]>;

  // Merchant bank snapshot (Chirp cache) methods
  getMerchantBankSnapshot(merchantEmail: string): Promise<MerchantBankSnapshot | undefined>;
  getMerchantBankSnapshotByRequestCode(chirpRequestCode: string): Promise<MerchantBankSnapshot | undefined>;
  upsertMerchantBankSnapshot(data: InsertMerchantBankSnapshot): Promise<MerchantBankSnapshot>;
  deleteMerchantBankSnapshot(merchantEmail: string): Promise<void>;

  // GigFi methods
  saveGigFiResult(applicationId: string, status: string, decisionId?: string, redirectUrl?: string): Promise<void>;
  saveGigFiResultByEmail(email: string, status: string, decisionId?: string, redirectUrl?: string): Promise<{ applicationId: string } | null>;
  getGigFiSubmissions(): Promise<LoanApplication[]>;
  getDeclinedDecisionsForExternalGigFi(lookbackDays: number): Promise<Array<BusinessUnderwritingDecision & { applicationId?: string; applicationData?: Record<string, unknown> }>>;

  // Plaid methods
  createPlaidItem(item: InsertPlaidItem): Promise<PlaidItem>;
  getPlaidItem(itemId: string): Promise<PlaidItem | undefined>;
  getPlaidItemById(id: string): Promise<PlaidItem | undefined>;
  getAllPlaidItems(): Promise<PlaidItem[]>;
  createFundingAnalysis(analysis: InsertFundingAnalysis): Promise<FundingAnalysis>;
  getFundingAnalysisByEmail(email: string): Promise<FundingAnalysis | undefined>;
  getAllFundingAnalyses(): Promise<FundingAnalysis[]>;
  updateFundingAnalysis(id: string, updates: { businessName?: string; email?: string }): Promise<FundingAnalysis | undefined>;
  deleteFundingAnalysis(id: string): Promise<void>;
  
  // Plaid Statements methods
  createPlaidStatement(statement: InsertPlaidStatement): Promise<PlaidStatementRecord>;
  getPlaidStatementsByItemId(plaidItemId: string): Promise<PlaidStatementRecord[]>;
  getPlaidStatementByStatementId(statementId: string): Promise<PlaidStatementRecord | undefined>;
  deletePlaidStatementsByItemId(plaidItemId: string): Promise<void>;
  
  // Bank Statement Upload methods
  createBankStatementUpload(upload: InsertBankStatementUpload): Promise<BankStatementUpload>;
  getBankStatementUpload(id: string): Promise<BankStatementUpload | undefined>;
  getBankStatementUploadByViewToken(viewToken: string): Promise<BankStatementUpload | undefined>;
  getAllBankStatementUploads(): Promise<BankStatementUpload[]>;
  getBankStatementUploadsByEmail(email: string): Promise<BankStatementUpload[]>;
  getBankStatementUploadsByAgentEmail(agentEmail: string): Promise<BankStatementUpload[]>;
  updateBankStatementApproval(id: string, approvalStatus: string | null, approvalNotes: string | null, reviewedBy: string | null): Promise<BankStatementUpload | undefined>;
  updateBankStatementUpload(id: string, updates: { businessName?: string; email?: string }): Promise<BankStatementUpload | undefined>;
  deleteBankStatementUpload(id: string): Promise<void>;

  // Bot Attempts methods
  createBotAttempt(attempt: InsertBotAttempt): Promise<BotAttempt>;
  getAllBotAttempts(): Promise<BotAttempt[]>;
  getBotAttemptsCount(): Promise<number>;

  // Partner methods
  createPartner(partner: InsertPartner): Promise<Partner>;
  getPartner(id: string): Promise<Partner | undefined>;
  getPartnerByEmail(email: string): Promise<Partner | undefined>;
  getPartnerByInviteCode(inviteCode: string): Promise<Partner | undefined>;
  getPartnerBySlug(slug: string): Promise<Partner | undefined>;
  updatePartner(id: string, updates: Partial<InsertPartner>): Promise<Partner | undefined>;
  getAllPartners(): Promise<Partner[]>;
  getApplicationsByPartnerId(partnerId: string): Promise<LoanApplication[]>;

  // Lender Approval methods
  createLenderApproval(approval: InsertLenderApproval): Promise<LenderApproval>;
  getLenderApproval(id: string): Promise<LenderApproval | undefined>;
  getLenderApprovalByEmailId(emailId: string): Promise<LenderApproval | undefined>;
  getAllLenderApprovals(): Promise<LenderApproval[]>;
  getLenderApprovalsByBusinessName(businessName: string): Promise<LenderApproval[]>;
  getLenderApprovalsByBusinessEmail(email: string): Promise<LenderApproval[]>;
  getLenderApprovalsByLender(lenderName: string): Promise<LenderApproval[]>;
  updateLenderApproval(id: string, updates: Partial<InsertLenderApproval>): Promise<LenderApproval | undefined>;

  // Business Underwriting Decision methods
  createOrUpdateBusinessUnderwritingDecision(decision: InsertBusinessUnderwritingDecision): Promise<BusinessUnderwritingDecision>;
  getBusinessUnderwritingDecision(id: string): Promise<BusinessUnderwritingDecision | undefined>;
  getBusinessUnderwritingDecisionByEmail(email: string): Promise<BusinessUnderwritingDecision | undefined>;
  getBusinessUnderwritingDecisionsByEmail(email: string): Promise<BusinessUnderwritingDecision[]>;
  getBusinessUnderwritingDecisionByMerchantEmail(email: string): Promise<BusinessUnderwritingDecision | undefined>;
  getBusinessUnderwritingDecisionsByMerchantEmail(email: string): Promise<BusinessUnderwritingDecision[]>;
  getBusinessUnderwritingDecisionByMerchantToken(token: string): Promise<BusinessUnderwritingDecision | undefined>;
  getBusinessUnderwritingDecisionBySlug(slug: string): Promise<BusinessUnderwritingDecision | undefined>;
  getAllBusinessUnderwritingDecisions(status?: string): Promise<BusinessUnderwritingDecision[]>;
  getDecisionStatusCounts(): Promise<Record<string, number>>;
  getDecisionsForView(view: 'approvals' | 'funded'): Promise<BusinessUnderwritingDecision[]>;
  updateBusinessUnderwritingDecision(id: string, updates: Partial<InsertBusinessUnderwritingDecision> & { ghlSynced?: boolean; ghlSyncedAt?: Date | null; ghlSyncMessage?: string | null; ghlOpportunityId?: string | null; sfSynced?: boolean; sfSyncedAt?: Date | null; sfSyncMessage?: string | null; sfOpportunityId?: string | null }): Promise<BusinessUnderwritingDecision | undefined>;
  deleteBusinessUnderwritingDecision(id: string): Promise<boolean>;

  // Lender methods
  createLender(lender: InsertLender): Promise<Lender>;
  getLender(id: string): Promise<Lender | undefined>;
  getLenderByName(name: string): Promise<Lender | undefined>;
  getAllLenders(): Promise<Lender[]>;
  upsertLender(lender: InsertLender): Promise<Lender>;
  createVisitLog(log: InsertVisitLog): Promise<VisitLog>;
  getVisitLogsByEmail(email: string): Promise<VisitLog[]>;
  getVisitLogsByPhone(phone: string): Promise<VisitLog[]>;

  // Congratulations uploads
  createCongratulationsUpload(upload: InsertCongratulationsUpload): Promise<CongratulationsUpload>;
  getCongratulationsUploadsByEmail(email: string): Promise<CongratulationsUpload[]>;
  getAllCongratulationsUploads(): Promise<CongratulationsUpload[]>;

  // Merchant Messages
  createMerchantMessage(msg: InsertMerchantMessage): Promise<MerchantMessage>;
  getMerchantMessagesByEmail(merchantEmail: string): Promise<MerchantMessage[]>;
  markMerchantMessagesRead(merchantEmail: string, role: string): Promise<void>;
  getUnreadMerchantMessageCount(merchantEmail: string, role: string): Promise<number>;

  // System Settings
  getSetting(key: string): Promise<string | null>;
  setSetting(key: string, value: string, updatedBy?: string): Promise<void>;
  getAllSettings(): Promise<SystemSetting[]>;

  // Merchant Portal Accounts
  createMerchantPortalAccount(account: InsertMerchantPortalAccount): Promise<MerchantPortalAccount>;
  getMerchantPortalAccountByEmail(email: string): Promise<MerchantPortalAccount | undefined>;
  getMerchantPortalAccountByToken(token: string): Promise<MerchantPortalAccount | undefined>;
  updateMerchantPortalAccount(id: number, updates: Partial<InsertMerchantPortalAccount>): Promise<MerchantPortalAccount | undefined>;

  // Merchant Plaid Connections
  createMerchantPlaidConnection(data: InsertMerchantPlaidConnection): Promise<MerchantPlaidConnection>;
  getMerchantPlaidConnectionsByEmail(email: string): Promise<MerchantPlaidConnection[]>;
  deactivateMerchantPlaidConnection(id: string): Promise<void>;

  // Merchant Financial Insights
  createOrUpdateMerchantInsight(data: InsertMerchantFinancialInsight): Promise<MerchantFinancialInsight>;
  getMerchantInsight(email: string, sourceType: string): Promise<MerchantFinancialInsight | undefined>;
  getPlaidAccessTokensForMerchant(email: string): Promise<{ accessToken: string; institutionName: string | null }[]>;

  // Rep Call Stats
  getAllRepCallStats(): Promise<RepCallStat[]>;
  getRepCallStatsByEmail(email: string): Promise<RepCallStat[]>;
  insertRepCallStat(stat: InsertRepCallStat): Promise<RepCallStat>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getLoanApplication(id: string): Promise<LoanApplication | undefined> {
    const [application] = await db
      .select()
      .from(loanApplications)
      .where(eq(loanApplications.id, id));
    return application || undefined;
  }

  async getLoanApplicationByEmail(email: string): Promise<LoanApplication | undefined> {
    // Case-insensitive and matches the business contact email too, so intake
    // re-submissions find agent-created files (which often only set companyEmail)
    const normalized = email?.trim().toLowerCase();
    if (!normalized) return undefined;
    const [application] = await db
      .select()
      .from(loanApplications)
      .where(
        and(
          or(
            sql`lower(trim(${loanApplications.email})) = ${normalized}`,
            sql`lower(trim(${loanApplications.companyEmail})) = ${normalized}`
          ),
          eq(loanApplications.isCompleted, false)
        )
      )
      .orderBy(desc(loanApplications.createdAt))
      .limit(1);
    return application || undefined;
  }

  async getAnyLoanApplicationByEmail(email: string): Promise<LoanApplication | undefined> {
    const normalized = email?.trim().toLowerCase();
    if (!normalized) return undefined;
    const [application] = await db
      .select()
      .from(loanApplications)
      .where(
        or(
          sql`lower(trim(${loanApplications.email})) = ${normalized}`,
          sql`lower(trim(${loanApplications.companyEmail})) = ${normalized}`
        )
      )
      .orderBy(desc(loanApplications.createdAt))
      .limit(1);
    return application || undefined;
  }

  async getLoanApplicationByEmailOrPhone(emailOrPhone: string): Promise<LoanApplication | undefined> {
    // Normalize phone number by removing non-digits for comparison
    const normalizedPhone = emailOrPhone.replace(/\D/g, '');
    
    const [application] = await db
      .select()
      .from(loanApplications)
      .where(
        or(
          eq(loanApplications.email, emailOrPhone),
          eq(loanApplications.phone, emailOrPhone),
          eq(loanApplications.phone, normalizedPhone)
        )
      )
      .orderBy(desc(loanApplications.createdAt))
      .limit(1);
    return application || undefined;
  }

  async createLoanApplication(insertApplication: Partial<InsertLoanApplication>): Promise<LoanApplication> {
    return withRetry(async () => {
      const [application] = await db
        .insert(loanApplications)
        .values({
          ...insertApplication,
          email: insertApplication.email ?? "",
          currentStep: insertApplication.currentStep ?? 1,
          isCompleted: insertApplication.isCompleted ?? false,
        })
        .returning();
      return application;
    }, 'createLoanApplication');
  }

  async updateLoanApplication(id: string, updates: Partial<InsertLoanApplication>): Promise<LoanApplication | undefined> {
    return withRetry(async () => {
      const [updated] = await db
        .update(loanApplications)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(loanApplications.id, id))
        .returning();
      
      // Log important updates for debugging
      if (updates.isFullApplicationCompleted) {
        console.log(`[DB] Application ${id} marked as FULL APPLICATION COMPLETED`);
      }
      
      return updated || undefined;
    }, `updateLoanApplication(${id})`);
  }

  async getAllLoanApplications(): Promise<LoanApplication[]> {
    return await db
      .select()
      .from(loanApplications)
      .orderBy(desc(loanApplications.createdAt));
  }

  // Lightweight list for the dashboard — excludes the heavy applicantSignature column
  // (base64 image ~272KB total across all records). Signature is only needed on single-app view.
  async getAllLoanApplicationsSummary(): Promise<Omit<LoanApplication, 'applicantSignature'>[]> {
    const { applicantSignature, ...cols } = getTableColumns(loanApplications);
    return await db
      .select(cols)
      .from(loanApplications)
      .orderBy(desc(sql`COALESCE(${loanApplications.lastSubmissionAt}, ${loanApplications.createdAt})`));
  }

  // Submission history for a set of applications (dashboard dropdown)
  async getSubmissionsForApplicationIds(ids: string[]): Promise<ApplicationSubmission[]> {
    if (ids.length === 0) return [];
    return await db
      .select()
      .from(applicationSubmissions)
      .where(inArray(applicationSubmissions.loanApplicationId, ids))
      .orderBy(desc(applicationSubmissions.createdAt));
  }

  async getApplicationsSummaryFiltered(opts: {
    search?: string;
    limit?: number;
    offset?: number;
    agentEmail?: string;
  }): Promise<Omit<LoanApplication, 'applicantSignature'>[]> {
    const { applicantSignature, ...cols } = getTableColumns(loanApplications);
    const conditions: any[] = [];
    if (opts.agentEmail) {
      conditions.push(sql`LOWER(${loanApplications.agentEmail}) = ${opts.agentEmail.toLowerCase()}`);
    }
    if (opts.search) {
      const pattern = `%${opts.search}%`;
      conditions.push(or(
        ilike(loanApplications.fullName, pattern),
        ilike(loanApplications.email, pattern),
        ilike(loanApplications.businessName, pattern),
        ilike(loanApplications.legalBusinessName, pattern),
        ilike(loanApplications.phone, pattern),
      ));
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const base = db.select(cols).from(loanApplications);
    const recency = desc(sql`COALESCE(${loanApplications.lastSubmissionAt}, ${loanApplications.createdAt})`);
    const ordered = where
      ? base.where(where).orderBy(recency)
      : base.orderBy(recency);
    const limited  = opts.limit  ? ordered.limit(opts.limit)   : ordered;
    const paginated = opts.offset ? limited.offset(opts.offset) : limited;
    return await paginated;
  }

  async getApplicationsCount(opts: { search?: string; agentEmail?: string } = {}): Promise<number> {
    const conditions: any[] = [];
    if (opts.agentEmail) {
      conditions.push(sql`LOWER(${loanApplications.agentEmail}) = ${opts.agentEmail.toLowerCase()}`);
    }
    if (opts.search) {
      const pattern = `%${opts.search}%`;
      conditions.push(or(
        ilike(loanApplications.fullName, pattern),
        ilike(loanApplications.email, pattern),
        ilike(loanApplications.businessName, pattern),
        ilike(loanApplications.legalBusinessName, pattern),
        ilike(loanApplications.phone, pattern),
      ));
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const base = db.select({ count: sql<number>`count(*)` }).from(loanApplications);
    const [row] = where ? await base.where(where) : await base;
    return Number(row.count);
  }

  // Returns only the applicant emails for a given agent — avoids full table scans when
  // checking which underwriting decisions belong to an agent.
  async getApplicationEmailsByAgentEmail(agentEmail: string): Promise<string[]> {
    const rows = await db
      .select({ email: loanApplications.email })
      .from(loanApplications)
      .where(
        and(
          sql`LOWER(${loanApplications.agentEmail}) = ${agentEmail.toLowerCase()}`,
          sql`${loanApplications.email} IS NOT NULL`
        )
      );
    return rows.map(r => (r.email || '').toLowerCase()).filter(Boolean);
  }

  async searchFullApplicationsForGigFi(query: string): Promise<LoanApplication[]> {
    const pattern = `%${query}%`;
    return await db
      .select()
      .from(loanApplications)
      .where(
        and(
          sql`${loanApplications.isFullApplicationCompleted} = true`,
          or(
            ilike(loanApplications.fullName, pattern),
            ilike(loanApplications.email, pattern),
            ilike(loanApplications.phone, pattern),
            ilike(loanApplications.businessName, pattern),
            ilike(loanApplications.legalBusinessName, pattern)
          )
        )
      )
      .orderBy(desc(loanApplications.createdAt))
      .limit(25);
  }

  // Plaid methods
  async createPlaidItem(item: InsertPlaidItem): Promise<PlaidItem> {
    const [plaidItem] = await db
      .insert(plaidItems)
      .values(item)
      .returning();
    return plaidItem;
  }

  async getPlaidItem(itemId: string): Promise<PlaidItem | undefined> {
    const [item] = await db
      .select()
      .from(plaidItems)
      .where(eq(plaidItems.itemId, itemId));
    return item || undefined;
  }

  async getPlaidItemById(id: string): Promise<PlaidItem | undefined> {
    const [item] = await db
      .select()
      .from(plaidItems)
      .where(eq(plaidItems.id, id));
    return item || undefined;
  }

  async getAllPlaidItems(): Promise<PlaidItem[]> {
    return await db
      .select()
      .from(plaidItems)
      .orderBy(desc(plaidItems.createdAt));
  }

  async createFundingAnalysis(analysis: InsertFundingAnalysis): Promise<FundingAnalysis> {
    const [fundingAnalysis] = await db
      .insert(fundingAnalyses)
      .values(analysis)
      .returning();
    return fundingAnalysis;
  }

  async getFundingAnalysisByEmail(email: string): Promise<FundingAnalysis | undefined> {
    const [analysis] = await db
      .select()
      .from(fundingAnalyses)
      .where(eq(fundingAnalyses.email, email))
      .orderBy(desc(fundingAnalyses.createdAt));
    return analysis || undefined;
  }

  async getAllFundingAnalyses(): Promise<FundingAnalysis[]> {
    return await db
      .select()
      .from(fundingAnalyses)
      .orderBy(desc(fundingAnalyses.createdAt));
  }

  async getFundingAnalysisByPlaidItemId(plaidItemId: string): Promise<FundingAnalysis | undefined> {
    const [analysis] = await db
      .select()
      .from(fundingAnalyses)
      .where(eq(fundingAnalyses.plaidItemId, plaidItemId))
      .orderBy(desc(fundingAnalyses.createdAt));
    return analysis || undefined;
  }

  async updateFundingAnalysis(id: string, updates: { businessName?: string; email?: string }): Promise<FundingAnalysis | undefined> {
    const [updated] = await db
      .update(fundingAnalyses)
      .set(updates)
      .where(eq(fundingAnalyses.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteFundingAnalysis(id: string): Promise<void> {
    await db.delete(fundingAnalyses).where(eq(fundingAnalyses.id, id));
  }

  async getApplicationByEmail(email: string): Promise<LoanApplication | undefined> {
    const [application] = await db
      .select()
      .from(loanApplications)
      .where(eq(loanApplications.email, email))
      .orderBy(desc(loanApplications.createdAt));
    return application || undefined;
  }

  // Chirp methods
  async saveChirpRequestCode(email: string, phone: string, requestCode: string): Promise<void> {
    // Normalise phone to digits only for matching
    const digitsOnly = (p: string) => p.replace(/\D/g, "");
    const phoneDigits = digitsOnly(phone);

    // Try email match first (most reliable), then phone
    const all = await db.select().from(loanApplications).orderBy(desc(loanApplications.createdAt));
    const match = all.find(a =>
      (a.email && a.email.toLowerCase() === email.toLowerCase()) ||
      (a.phone && digitsOnly(a.phone) === phoneDigits)
    );

    if (match) {
      await db
        .update(loanApplications)
        .set({ chirpRequestCode: requestCode } as any)
        .where(eq(loanApplications.id, match.id));
      console.log(`[CHIRP] Saved requestCode ${requestCode} to application ${match.id} (${match.email})`);
    } else {
      console.warn(`[CHIRP] No application found for email=${email} phone=${phone} — requestCode ${requestCode} not stored`);
    }
  }

  async getApplicationsWithChirpCode(): Promise<LoanApplication[]> {
    return await db
      .select()
      .from(loanApplications)
      .where(sql`chirp_request_code IS NOT NULL AND chirp_request_code != ''`)
      .orderBy(desc(loanApplications.createdAt));
  }

  // Merchant bank snapshot (Chirp cache) methods
  async getMerchantBankSnapshot(merchantEmail: string): Promise<MerchantBankSnapshot | undefined> {
    const [row] = await db
      .select()
      .from(merchantBankSnapshots)
      .where(eq(merchantBankSnapshots.merchantEmail, merchantEmail.toLowerCase()))
      .limit(1);
    return row || undefined;
  }

  async getMerchantBankSnapshotByRequestCode(chirpRequestCode: string): Promise<MerchantBankSnapshot | undefined> {
    const [row] = await db
      .select()
      .from(merchantBankSnapshots)
      .where(eq(merchantBankSnapshots.chirpRequestCode, chirpRequestCode))
      .limit(1);
    return row || undefined;
  }

  async upsertMerchantBankSnapshot(data: InsertMerchantBankSnapshot): Promise<MerchantBankSnapshot> {
    const normalized = { ...data, merchantEmail: data.merchantEmail.toLowerCase() };
    // Preserve-when-undefined: only fields explicitly passed get overwritten on
    // conflict, so partial updates (e.g. a webhook status ping) never wipe
    // stored transactions/metrics. Pass an explicit null to clear a field.
    const set: Record<string, any> = { updatedAt: new Date() };
    const assignIfDefined = (key: keyof typeof normalized, column: string) => {
      if (normalized[key] !== undefined) set[column] = normalized[key];
    };
    assignIfDefined("chirpRequestCode", "chirpRequestCode");
    assignIfDefined("institutionName", "institutionName");
    assignIfDefined("status", "status");
    assignIfDefined("isAccountConnected", "isAccountConnected");
    assignIfDefined("accountsData", "accountsData");
    assignIfDefined("summaryData", "summaryData");
    assignIfDefined("metrics", "metrics");
    assignIfDefined("transactionsData", "transactionsData");
    assignIfDefined("widgetUrl", "widgetUrl");
    assignIfDefined("verificationUrl", "verificationUrl");
    assignIfDefined("statementFiledAt", "statementFiledAt");
    assignIfDefined("connectedAt", "connectedAt");
    assignIfDefined("lastSyncedAt", "lastSyncedAt");
    assignIfDefined("lastRefreshAt", "lastRefreshAt");

    const [row] = await db
      .insert(merchantBankSnapshots)
      .values(normalized)
      .onConflictDoUpdate({
        target: merchantBankSnapshots.merchantEmail,
        set,
      })
      .returning();
    return row;
  }

  async deleteMerchantBankSnapshot(merchantEmail: string): Promise<void> {
    await db
      .delete(merchantBankSnapshots)
      .where(eq(merchantBankSnapshots.merchantEmail, merchantEmail.toLowerCase()));
  }

  async saveGigFiResult(applicationId: string, status: string, decisionId?: string, redirectUrl?: string): Promise<void> {
    await db
      .update(loanApplications)
      .set({
        gigfiStatus: status,
        gigfiDecisionId: decisionId || null,
        gigfiRedirectUrl: redirectUrl || null,
        gigfiSubmittedAt: new Date(),
      } as any)
      .where(eq(loanApplications.id, applicationId));
    console.log(`[GIGFI] Saved result status=${status} decisionId=${decisionId} to application ${applicationId}`);
  }

  async getGigFiSubmissions(): Promise<LoanApplication[]> {
    return await db
      .select()
      .from(loanApplications)
      .where(isNotNull(loanApplications.gigfiStatus))
      .orderBy(sql`gigfi_submitted_at DESC NULLS LAST, gigfi_decision_id DESC NULLS LAST, created_at DESC`);
  }

  async saveGigFiResultByEmail(email: string, status: string, decisionId?: string, redirectUrl?: string): Promise<{ applicationId: string } | null> {
    const normalizedEmail = email.toLowerCase().trim();
    const [app] = await db
      .select({ id: loanApplications.id })
      .from(loanApplications)
      .where(and(
        eq(loanApplications.email, normalizedEmail),
        isNull(loanApplications.gigfiStatus),
      ))
      .orderBy(desc(loanApplications.createdAt))
      .limit(1);

    if (!app) {
      console.warn(`[GIGFI] No un-submitted application found for email: ${normalizedEmail}`);
      return null;
    }

    await db
      .update(loanApplications)
      .set({
        gigfiStatus: status,
        gigfiDecisionId: decisionId || null,
        gigfiRedirectUrl: redirectUrl || null,
        gigfiSubmittedAt: new Date(),
      } as any)
      .where(eq(loanApplications.id, app.id));

    console.log(`[GIGFI] Saved external result status=${status} decisionId=${decisionId} to application ${app.id} (by email ${normalizedEmail})`);
    return { applicationId: app.id };
  }

  async getDeclinedDecisionsForExternalGigFi(lookbackDays: number): Promise<Array<BusinessUnderwritingDecision & { applicationId?: string; applicationData?: Record<string, unknown> }>> {
    const lookbackDate = new Date();
    lookbackDate.setDate(lookbackDate.getDate() - lookbackDays);

    const decisions = await db
      .select()
      .from(businessUnderwritingDecisions)
      .where(and(
        or(
          eq(businessUnderwritingDecisions.status, 'declined'),
          eq(businessUnderwritingDecisions.status, 'unqualified'),
        ),
        gte(businessUnderwritingDecisions.createdAt, lookbackDate),
      ))
      .orderBy(desc(businessUnderwritingDecisions.createdAt));

    const enriched = await Promise.all(decisions.map(async (dec) => {
      const [app] = await db
        .select()
        .from(loanApplications)
        .where(and(
          eq(loanApplications.email, dec.businessEmail.toLowerCase()),
          isNull(loanApplications.gigfiStatus),
        ))
        .orderBy(desc(loanApplications.createdAt))
        .limit(1);

      return {
        ...dec,
        applicationId: app?.id || undefined,
        applicationData: app ? {
          id: app.id,
          email: app.email,
          fullName: app.fullName,
          businessName: app.businessName,
          legalBusinessName: app.legalBusinessName,
          phone: app.phone,
          monthlyRevenue: app.monthlyRevenue,
          averageMonthlyRevenue: app.averageMonthlyRevenue,
          requestedAmount: app.requestedAmount,
          timeInBusiness: app.timeInBusiness,
          socialSecurityNumber: app.socialSecurityNumber,
          dateOfBirth: app.dateOfBirth,
          ownerAddress1: app.ownerAddress1,
          ownerCity: app.ownerCity,
          ownerState: app.ownerState,
          ownerZip: app.ownerZip,
          businessStreetAddress: app.businessStreetAddress,
          businessCsz: app.businessCsz,
          creditScore: app.creditScore,
        } : undefined,
      };
    }));

    return enriched;
  }

  // Plaid Statements methods
  async createPlaidStatement(statement: InsertPlaidStatement): Promise<PlaidStatementRecord> {
    const [created] = await db
      .insert(plaidStatements)
      .values(statement)
      .onConflictDoUpdate({
        target: plaidStatements.statementId,
        set: {
          accountName: statement.accountName,
          accountType: statement.accountType,
          institutionName: statement.institutionName,
        }
      })
      .returning();
    return created;
  }

  async getPlaidStatementsByItemId(plaidItemId: string): Promise<PlaidStatementRecord[]> {
    return await db
      .select()
      .from(plaidStatements)
      .where(eq(plaidStatements.plaidItemId, plaidItemId))
      .orderBy(desc(plaidStatements.year), desc(plaidStatements.month));
  }

  async getPlaidStatementByStatementId(statementId: string): Promise<PlaidStatementRecord | undefined> {
    const [statement] = await db
      .select()
      .from(plaidStatements)
      .where(eq(plaidStatements.statementId, statementId));
    return statement || undefined;
  }

  async deletePlaidStatementsByItemId(plaidItemId: string): Promise<void> {
    await db
      .delete(plaidStatements)
      .where(eq(plaidStatements.plaidItemId, plaidItemId));
  }

  // Bank Statement Upload methods
  async createBankStatementUpload(upload: InsertBankStatementUpload): Promise<BankStatementUpload> {
    const [bankUpload] = await db
      .insert(bankStatementUploads)
      .values(upload)
      .returning();
    return bankUpload;
  }

  async getBankStatementUpload(id: string): Promise<BankStatementUpload | undefined> {
    const [upload] = await db
      .select()
      .from(bankStatementUploads)
      .where(eq(bankStatementUploads.id, id));
    return upload || undefined;
  }

  async getBankStatementUploadByViewToken(viewToken: string): Promise<BankStatementUpload | undefined> {
    const [upload] = await db
      .select()
      .from(bankStatementUploads)
      .where(eq(bankStatementUploads.viewToken, viewToken));
    return upload || undefined;
  }

  async getAllBankStatementUploads(): Promise<BankStatementUpload[]> {
    return await db
      .select()
      .from(bankStatementUploads)
      .orderBy(desc(sql`COALESCE(${bankStatementUploads.receivedAt}, ${bankStatementUploads.createdAt})`));
  }

  async updateBankStatementViewToken(id: string, viewToken: string): Promise<void> {
    await db
      .update(bankStatementUploads)
      .set({ viewToken })
      .where(eq(bankStatementUploads.id, id));
  }

  async getBankStatementUploadsByEmail(email: string): Promise<BankStatementUpload[]> {
    const normalized = email.toLowerCase().trim();
    return await db
      .select()
      .from(bankStatementUploads)
      .where(sql`LOWER(${bankStatementUploads.email}) = ${normalized}`)
      .orderBy(desc(sql`COALESCE(${bankStatementUploads.receivedAt}, ${bankStatementUploads.createdAt})`));
  }

  async getBankStatementUploadsByAgentEmail(agentEmail: string): Promise<BankStatementUpload[]> {
    // Get all applications for this agent
    const agentApplications = await db
      .select({ id: loanApplications.id, email: loanApplications.email })
      .from(loanApplications)
      .where(sql`LOWER(${loanApplications.agentEmail}) = LOWER(${agentEmail})`);
    
    if (agentApplications.length === 0) {
      return [];
    }

    // Get uploads that match either:
    // 1. Have a loanApplicationId that belongs to this agent
    // 2. Have an email that matches any of the agent's application emails
    const applicationIds = agentApplications.map(app => app.id);
    const applicationEmails = agentApplications.map(app => app.email?.toLowerCase()).filter(Boolean) as string[];
    
    // Fetch all uploads and filter in JavaScript (more flexible for complex OR conditions)
    const allUploads = await db
      .select()
      .from(bankStatementUploads)
      .orderBy(desc(sql`COALESCE(${bankStatementUploads.receivedAt}, ${bankStatementUploads.createdAt})`));
    
    return allUploads.filter(upload => 
      applicationIds.includes(upload.loanApplicationId || '') ||
      applicationEmails.includes(upload.email?.toLowerCase() || '')
    );
  }

  async updateBankStatementApproval(
    id: string,
    approvalStatus: string | null,
    approvalNotes: string | null,
    reviewedBy: string | null
  ): Promise<BankStatementUpload | undefined> {
    const [updated] = await db
      .update(bankStatementUploads)
      .set({
        approvalStatus,
        approvalNotes,
        reviewedBy,
        reviewedAt: approvalStatus ? new Date() : null,
      })
      .where(eq(bankStatementUploads.id, id))
      .returning();
    return updated || undefined;
  }

  async updateBankStatementUpload(id: string, updates: { businessName?: string; email?: string }): Promise<BankStatementUpload | undefined> {
    const [updated] = await db
      .update(bankStatementUploads)
      .set(updates)
      .where(eq(bankStatementUploads.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteBankStatementUpload(id: string): Promise<void> {
    await db.delete(bankStatementUploads).where(eq(bankStatementUploads.id, id));
  }

  // Bot Attempts methods
  async createBotAttempt(attempt: InsertBotAttempt): Promise<BotAttempt> {
    const [botAttempt] = await db
      .insert(botAttempts)
      .values(attempt)
      .returning();
    return botAttempt;
  }

  async getAllBotAttempts(): Promise<BotAttempt[]> {
    return await db
      .select()
      .from(botAttempts)
      .orderBy(desc(botAttempts.createdAt));
  }

  async getBotAttemptsCount(): Promise<number> {
    const results = await db.select().from(botAttempts);
    return results.length;
  }

  // Partner methods
  async createPartner(partner: InsertPartner): Promise<Partner> {
    const [newPartner] = await db
      .insert(partners)
      .values(partner)
      .returning();
    return newPartner;
  }

  async getPartner(id: string): Promise<Partner | undefined> {
    const [partner] = await db
      .select()
      .from(partners)
      .where(eq(partners.id, id));
    return partner || undefined;
  }

  async getPartnerByEmail(email: string): Promise<Partner | undefined> {
    const [partner] = await db
      .select()
      .from(partners)
      .where(eq(partners.email, email.toLowerCase()));
    return partner || undefined;
  }

  async getPartnerByInviteCode(inviteCode: string): Promise<Partner | undefined> {
    const [partner] = await db
      .select()
      .from(partners)
      .where(eq(partners.inviteCode, inviteCode));
    return partner || undefined;
  }

  async getPartnerBySlug(slug: string): Promise<Partner | undefined> {
    const [partner] = await db
      .select()
      .from(partners)
      .where(eq(partners.slug, slug.toLowerCase()));
    return partner || undefined;
  }

  async updatePartner(id: string, updates: Partial<InsertPartner>): Promise<Partner | undefined> {
    const [updated] = await db
      .update(partners)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(partners.id, id))
      .returning();
    return updated || undefined;
  }

  async getAllPartners(): Promise<Partner[]> {
    return await db
      .select()
      .from(partners)
      .orderBy(desc(partners.createdAt));
  }

  async getApplicationsByPartnerId(partnerId: string): Promise<LoanApplication[]> {
    return await db
      .select()
      .from(loanApplications)
      .where(eq(loanApplications.referralPartnerId, partnerId))
      .orderBy(desc(loanApplications.createdAt));
  }

  // Lender Approval methods
  async createLenderApproval(approval: InsertLenderApproval): Promise<LenderApproval> {
    const [newApproval] = await db
      .insert(lenderApprovals)
      .values(approval)
      .returning();
    return newApproval;
  }

  async getLenderApproval(id: string): Promise<LenderApproval | undefined> {
    const [approval] = await db
      .select()
      .from(lenderApprovals)
      .where(eq(lenderApprovals.id, id));
    return approval || undefined;
  }

  async getLenderApprovalByEmailId(emailId: string): Promise<LenderApproval | undefined> {
    const [approval] = await db
      .select()
      .from(lenderApprovals)
      .where(eq(lenderApprovals.emailId, emailId));
    return approval || undefined;
  }

  async getAllLenderApprovals(): Promise<LenderApproval[]> {
    return await db
      .select()
      .from(lenderApprovals)
      .orderBy(desc(lenderApprovals.createdAt));
  }

  async getLenderApprovalsByBusinessName(businessName: string): Promise<LenderApproval[]> {
    return await db
      .select()
      .from(lenderApprovals)
      .where(eq(lenderApprovals.businessName, businessName))
      .orderBy(desc(lenderApprovals.createdAt));
  }

  async getLenderApprovalsByBusinessEmail(email: string): Promise<LenderApproval[]> {
    return await db
      .select()
      .from(lenderApprovals)
      .where(eq(lenderApprovals.businessEmail, email.toLowerCase()))
      .orderBy(desc(lenderApprovals.createdAt));
  }

  async getLenderApprovalsByLender(lenderName: string): Promise<LenderApproval[]> {
    return await db
      .select()
      .from(lenderApprovals)
      .where(eq(lenderApprovals.lenderName, lenderName))
      .orderBy(desc(lenderApprovals.createdAt));
  }

  async updateLenderApproval(id: string, updates: Partial<InsertLenderApproval>): Promise<LenderApproval | undefined> {
    const [updated] = await db
      .update(lenderApprovals)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(lenderApprovals.id, id))
      .returning();
    return updated || undefined;
  }

  // Business Underwriting Decision methods
  private generateApprovalSlug(businessName: string | null, businessEmail: string): string {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const businessIndicator = businessName 
      ? businessName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15)
      : businessEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15);
    const approvalCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${businessIndicator}-${dateStr}-${approvalCode}`;
  }

  async createOrUpdateBusinessUnderwritingDecision(decision: InsertBusinessUnderwritingDecision): Promise<BusinessUnderwritingDecision> {
    console.log(`[STORAGE] createOrUpdateBusinessUnderwritingDecision: email=${decision.businessEmail}, status=${decision.status}, additionalApprovals=${Array.isArray(decision.additionalApprovals) ? decision.additionalApprovals.length : 'null'}`);

    // Check for an existing record by email first (the DB has a unique constraint on business_email)
    const existing = decision.businessEmail
      ? await this.getBusinessUnderwritingDecisionByEmail(decision.businessEmail)
      : undefined;

    let approvalSlug: string | null = null;
    if (decision.status === 'approved') {
      approvalSlug = this.generateApprovalSlug(decision.businessName || null, decision.businessEmail);
    }

    if (existing) {
      console.log(`[STORAGE] Record exists (id=${existing.id}) for ${decision.businessEmail} — updating`);

      let mergedFundings = existing.additionalFundings as any[] | null;

      // When adding a new funded deal, accumulate rather than overwrite
      if (decision.status === 'funded' && decision.additionalFundings) {
        const incomingEntries = Array.isArray(decision.additionalFundings) ? decision.additionalFundings : [];
        const existingEntries = Array.isArray(mergedFundings) ? mergedFundings : [];

        // Migration: if the existing record has no additionalFundings entries yet but has
        // top-level funded columns, preserve that data as a legacy entry so it isn't lost
        let legacyEntries: any[] = [];
        if (existingEntries.length === 0 && existing.status === 'funded' &&
            (existing.advanceAmount || existing.lender || existing.fundedDate)) {
          legacyEntries = [{
            id: `legacy-${existing.id}`,
            lender: existing.lender || null,
            advanceAmount: existing.advanceAmount != null ? String(existing.advanceAmount) : null,
            term: existing.term || null,
            paymentFrequency: existing.paymentFrequency || null,
            factorRate: existing.factorRate != null ? String(existing.factorRate) : null,
            maxUpsell: existing.maxUpsell != null ? String(existing.maxUpsell) : null,
            totalPayback: existing.totalPayback != null ? String(existing.totalPayback) : null,
            netAfterFees: existing.netAfterFees != null ? String(existing.netAfterFees) : null,
            notes: existing.notes || null,
            fundedDate: existing.fundedDate
              ? new Date(existing.fundedDate).toISOString()
              : existing.createdAt
                ? new Date(existing.createdAt).toISOString()
                : new Date().toISOString(),
            assignedRep: existing.assignedRep || null,
            createdAt: existing.createdAt
              ? new Date(existing.createdAt).toISOString()
              : new Date().toISOString(),
          }];
        }

        // Prepend new entries so newest is first; legacy entry goes at the end
        mergedFundings = [...incomingEntries, ...existingEntries, ...legacyEntries];
      }

      const [updated] = await db
        .update(businessUnderwritingDecisions)
        .set({
          ...decision,
          // Preserve existing approval packages and approval columns when not explicitly
          // provided — adding a funded deal should never wipe what was approved.
          additionalApprovals: decision.additionalApprovals ?? existing.additionalApprovals,
          advanceAmount:       decision.advanceAmount       ?? existing.advanceAmount,
          lender:              decision.lender              ?? existing.lender,
          term:                decision.term                ?? existing.term,
          paymentFrequency:    decision.paymentFrequency    ?? existing.paymentFrequency,
          factorRate:          decision.factorRate          ?? existing.factorRate,
          totalPayback:        decision.totalPayback        ?? existing.totalPayback,
          netAfterFees:        decision.netAfterFees        ?? existing.netAfterFees,
          additionalFundings:  mergedFundings,
          approvalSlug:        approvalSlug ?? existing.approvalSlug,
          updatedAt:           new Date(),
        })
        .where(eq(businessUnderwritingDecisions.id, existing.id))
        .returning();
      console.log(`[STORAGE] Updated decision ${updated.id}`);
      return updated;
    }

    console.log(`[STORAGE] Creating new decision for ${decision.businessEmail}`);
    const [newDecision] = await db
      .insert(businessUnderwritingDecisions)
      .values({ ...decision, approvalSlug })
      .returning();
    console.log(`[STORAGE] Created decision ${newDecision.id}, additionalApprovals saved: ${Array.isArray(newDecision.additionalApprovals) ? (newDecision.additionalApprovals as any[]).length : 'null'}`);
    return newDecision;
  }

  async getBusinessUnderwritingDecision(id: string): Promise<BusinessUnderwritingDecision | undefined> {
    const [decision] = await db
      .select()
      .from(businessUnderwritingDecisions)
      .where(eq(businessUnderwritingDecisions.id, id));
    return decision || undefined;
  }

  async getBusinessUnderwritingDecisionByEmail(email: string): Promise<BusinessUnderwritingDecision | undefined> {
    const [decision] = await db
      .select()
      .from(businessUnderwritingDecisions)
      .where(sql`LOWER(${businessUnderwritingDecisions.businessEmail}) = LOWER(${email})`)
      .orderBy(desc(businessUnderwritingDecisions.updatedAt))
      .limit(1);
    return decision || undefined;
  }

  async getBusinessUnderwritingDecisionsByEmail(email: string): Promise<BusinessUnderwritingDecision[]> {
    return await db
      .select()
      .from(businessUnderwritingDecisions)
      .where(sql`LOWER(${businessUnderwritingDecisions.businessEmail}) = LOWER(${email})`)
      .orderBy(desc(businessUnderwritingDecisions.updatedAt));
  }

  async getBusinessUnderwritingDecisionByMerchantEmail(email: string): Promise<BusinessUnderwritingDecision | undefined> {
    const [decision] = await db
      .select()
      .from(businessUnderwritingDecisions)
      .where(sql`LOWER(${businessUnderwritingDecisions.merchantEmail}) = LOWER(${email})`)
      .orderBy(desc(businessUnderwritingDecisions.updatedAt))
      .limit(1);
    return decision || undefined;
  }

  async getBusinessUnderwritingDecisionsByMerchantEmail(email: string): Promise<BusinessUnderwritingDecision[]> {
    return await db
      .select()
      .from(businessUnderwritingDecisions)
      .where(sql`LOWER(${businessUnderwritingDecisions.merchantEmail}) = LOWER(${email})`)
      .orderBy(desc(businessUnderwritingDecisions.updatedAt));
  }

  async getBusinessUnderwritingDecisionByMerchantToken(token: string): Promise<BusinessUnderwritingDecision | undefined> {
    const [decision] = await db
      .select()
      .from(businessUnderwritingDecisions)
      .where(eq(businessUnderwritingDecisions.merchantPortalToken, token))
      .limit(1);
    return decision || undefined;
  }

  async getBusinessUnderwritingDecisionBySlug(slug: string): Promise<BusinessUnderwritingDecision | undefined> {
    const [decision] = await db
      .select()
      .from(businessUnderwritingDecisions)
      .where(eq(businessUnderwritingDecisions.approvalSlug, slug));
    return decision || undefined;
  }

  async getAllBusinessUnderwritingDecisions(status?: string): Promise<BusinessUnderwritingDecision[]> {
    if (status) {
      return await db
        .select()
        .from(businessUnderwritingDecisions)
        .where(eq(businessUnderwritingDecisions.status, status))
        .orderBy(desc(businessUnderwritingDecisions.updatedAt));
    }
    return await db
      .select()
      .from(businessUnderwritingDecisions)
      .orderBy(desc(businessUnderwritingDecisions.updatedAt));
  }

  async getDecisionStatusCounts(): Promise<Record<string, number>> {
    const rows = await db.execute(sql`SELECT status, COUNT(*)::int AS count FROM business_underwriting_decisions GROUP BY status`);
    const counts: Record<string, number> = {};
    for (const row of (rows as any).rows || []) {
      if (row.status) counts[row.status] = Number(row.count);
    }
    return counts;
  }

  // Dual-visibility views: a business can be funded AND still have approvals worth showing.
  // "approvals" = status approved OR any entries in additional_approvals
  // "funded"    = status funded OR any entries in additional_fundings
  async getDecisionsForView(view: 'approvals' | 'funded'): Promise<BusinessUnderwritingDecision[]> {
    const jsonbCol = view === 'approvals' ? sql.raw('additional_approvals') : sql.raw('additional_fundings');
    const statusVal = view === 'approvals' ? 'approved' : 'funded';
    return await db
      .select()
      .from(businessUnderwritingDecisions)
      .where(sql`(
        ${businessUnderwritingDecisions.status} = ${statusVal}
        OR (jsonb_typeof(${jsonbCol}) = 'array' AND jsonb_array_length(${jsonbCol}) > 0)
      )`)
      .orderBy(desc(businessUnderwritingDecisions.updatedAt));
  }

  async updateBusinessUnderwritingDecision(id: string, updates: Partial<InsertBusinessUnderwritingDecision> & { ghlSynced?: boolean; ghlSyncedAt?: Date | null; ghlSyncMessage?: string | null; ghlOpportunityId?: string | null; sfSynced?: boolean; sfSyncedAt?: Date | null; sfSyncMessage?: string | null; sfOpportunityId?: string | null }): Promise<BusinessUnderwritingDecision | undefined> {
    const [updated] = await db
      .update(businessUnderwritingDecisions)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(businessUnderwritingDecisions.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteBusinessUnderwritingDecision(id: string): Promise<boolean> {
    const result = await db
      .delete(businessUnderwritingDecisions)
      .where(eq(businessUnderwritingDecisions.id, id))
      .returning();
    return result.length > 0;
  }

  // Lender methods
  async createLender(lender: InsertLender): Promise<Lender> {
    const [created] = await db.insert(lenders).values(lender).returning();
    return created;
  }

  async getLender(id: string): Promise<Lender | undefined> {
    const [lender] = await db.select().from(lenders).where(eq(lenders.id, id));
    return lender || undefined;
  }

  async getLenderByName(name: string): Promise<Lender | undefined> {
    const [lender] = await db
      .select()
      .from(lenders)
      .where(sql`LOWER(${lenders.name}) = LOWER(${name})`);
    return lender || undefined;
  }

  async getAllLenders(): Promise<Lender[]> {
    return await db
      .select()
      .from(lenders)
      .where(eq(lenders.isActive, true))
      .orderBy(lenders.name);
  }

  async upsertLender(lender: InsertLender): Promise<Lender> {
    const existing = await this.getLenderByName(lender.name);
    if (existing) {
      const [updated] = await db
        .update(lenders)
        .set({
          contactInfo: lender.contactInfo,
          requirements: lender.requirements,
          notes: lender.notes,
          tier: lender.tier,
          isActive: lender.isActive ?? true,
          updatedAt: new Date(),
        })
        .where(eq(lenders.id, existing.id))
        .returning();
      return updated;
    }
    return await this.createLender(lender);
  }

  async createVisitLog(log: InsertVisitLog): Promise<VisitLog> {
    const [visitLog] = await db
      .insert(visitLogs)
      .values(log)
      .returning();
    return visitLog;
  }

  async getVisitLogsByEmail(email: string): Promise<VisitLog[]> {
    return await db
      .select()
      .from(visitLogs)
      .where(eq(visitLogs.email, email.toLowerCase()))
      .orderBy(desc(visitLogs.createdAt));
  }

  async getVisitLogsByPhone(phone: string): Promise<VisitLog[]> {
    return await db
      .select()
      .from(visitLogs)
      .where(eq(visitLogs.phone, phone))
      .orderBy(desc(visitLogs.createdAt));
  }

  async createCongratulationsUpload(upload: InsertCongratulationsUpload): Promise<CongratulationsUpload> {
    const [record] = await db
      .insert(congratulationsUploads)
      .values(upload)
      .returning();
    return record;
  }

  async getCongratulationsUploadsByEmail(email: string): Promise<CongratulationsUpload[]> {
    return await db
      .select()
      .from(congratulationsUploads)
      .where(eq(congratulationsUploads.email, email.toLowerCase()))
      .orderBy(desc(congratulationsUploads.createdAt));
  }

  async getAllCongratulationsUploads(): Promise<CongratulationsUpload[]> {
    return await db
      .select()
      .from(congratulationsUploads)
      .orderBy(desc(congratulationsUploads.createdAt));
  }

  async createMerchantMessage(msg: InsertMerchantMessage): Promise<MerchantMessage> {
    const [record] = await db
      .insert(merchantMessages)
      .values(msg)
      .returning();
    return record;
  }

  async getMerchantMessagesByEmail(merchantEmail: string): Promise<MerchantMessage[]> {
    return await db
      .select()
      .from(merchantMessages)
      .where(eq(merchantMessages.merchantEmail, merchantEmail.toLowerCase()))
      .orderBy(merchantMessages.createdAt);
  }

  async markMerchantMessagesRead(merchantEmail: string, role: string): Promise<void> {
    // Mark messages as read where the reader is the opposite role of the sender
    const readerIsRep = role === 'rep' || role === 'admin' || role === 'underwriting';
    const senderRole = readerIsRep ? 'merchant' : 'rep';
    await db
      .update(merchantMessages)
      .set({ isRead: true })
      .where(
        and(
          eq(merchantMessages.merchantEmail, merchantEmail.toLowerCase()),
          eq(merchantMessages.senderRole, senderRole),
          eq(merchantMessages.isRead, false)
        )
      );
  }

  async getUnreadMerchantMessageCount(merchantEmail: string, role: string): Promise<number> {
    const readerIsRep = role === 'rep' || role === 'admin' || role === 'underwriting';
    const senderRole = readerIsRep ? 'merchant' : 'rep';
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(merchantMessages)
      .where(
        and(
          eq(merchantMessages.merchantEmail, merchantEmail.toLowerCase()),
          eq(merchantMessages.senderRole, senderRole),
          eq(merchantMessages.isRead, false)
        )
      );
    return result[0]?.count || 0;
  }

  // System Settings
  async getSetting(key: string): Promise<string | null> {
    const [row] = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.key, key));
    return row?.value ?? null;
  }

  async setSetting(key: string, value: string, updatedBy?: string): Promise<void> {
    await db
      .insert(systemSettings)
      .values({ key, value, updatedAt: new Date(), updatedBy: updatedBy || null })
      .onConflictDoUpdate({
        target: systemSettings.key,
        set: { value, updatedAt: new Date(), updatedBy: updatedBy || null },
      });
  }

  async getAllSettings(): Promise<SystemSetting[]> {
    return await db.select().from(systemSettings).orderBy(systemSettings.key);
  }

  // Merchant Portal Accounts
  async createMerchantPortalAccount(account: InsertMerchantPortalAccount): Promise<MerchantPortalAccount> {
    const [record] = await db
      .insert(merchantPortalAccounts)
      .values(account)
      .onConflictDoUpdate({
        target: merchantPortalAccounts.email,
        set: {
          name: account.name || undefined,
          phone: account.phone || undefined,
          businessName: account.businessName || undefined,
          applicationId: account.applicationId || undefined,
          decisionId: account.decisionId || undefined,
          portalToken: account.portalToken || undefined,
        },
      })
      .returning();
    return record;
  }

  async getMerchantPortalAccountByEmail(email: string): Promise<MerchantPortalAccount | undefined> {
    const [record] = await db
      .select()
      .from(merchantPortalAccounts)
      .where(eq(merchantPortalAccounts.email, email.toLowerCase()));
    return record;
  }

  async getMerchantPortalAccountByToken(token: string): Promise<MerchantPortalAccount | undefined> {
    const [record] = await db
      .select()
      .from(merchantPortalAccounts)
      .where(eq(merchantPortalAccounts.portalToken, token));
    return record;
  }

  async updateMerchantPortalAccount(id: number, updates: Partial<InsertMerchantPortalAccount>): Promise<MerchantPortalAccount | undefined> {
    const [record] = await db
      .update(merchantPortalAccounts)
      .set(updates)
      .where(eq(merchantPortalAccounts.id, id))
      .returning();
    return record;
  }

  // Merchant Plaid Connections
  async createMerchantPlaidConnection(data: InsertMerchantPlaidConnection): Promise<MerchantPlaidConnection> {
    const [record] = await db.insert(merchantPlaidConnections).values(data).returning();
    return record;
  }

  async getMerchantPlaidConnectionsByEmail(email: string): Promise<MerchantPlaidConnection[]> {
    return await db
      .select()
      .from(merchantPlaidConnections)
      .where(and(
        eq(merchantPlaidConnections.merchantEmail, email.toLowerCase()),
        eq(merchantPlaidConnections.isActive, true)
      ))
      .orderBy(desc(merchantPlaidConnections.connectedAt));
  }

  async deactivateMerchantPlaidConnection(id: string): Promise<void> {
    await db
      .update(merchantPlaidConnections)
      .set({ isActive: false })
      .where(eq(merchantPlaidConnections.id, id));
  }

  // Merchant Financial Insights
  async createOrUpdateMerchantInsight(data: InsertMerchantFinancialInsight): Promise<MerchantFinancialInsight> {
    // Check for existing insight with same email + sourceType
    const [existing] = await db
      .select()
      .from(merchantFinancialInsights)
      .where(and(
        eq(merchantFinancialInsights.merchantEmail, data.merchantEmail.toLowerCase()),
        eq(merchantFinancialInsights.sourceType, data.sourceType)
      ));

    if (existing) {
      const [updated] = await db
        .update(merchantFinancialInsights)
        .set({
          insightsData: data.insightsData,
          generatedAt: new Date(),
          expiresAt: data.expiresAt,
        })
        .where(eq(merchantFinancialInsights.id, existing.id))
        .returning();
      return updated;
    }

    const [record] = await db.insert(merchantFinancialInsights).values({
      ...data,
      merchantEmail: data.merchantEmail.toLowerCase(),
    }).returning();
    return record;
  }

  async getMerchantInsight(email: string, sourceType: string): Promise<MerchantFinancialInsight | undefined> {
    const [record] = await db
      .select()
      .from(merchantFinancialInsights)
      .where(and(
        eq(merchantFinancialInsights.merchantEmail, email.toLowerCase()),
        eq(merchantFinancialInsights.sourceType, sourceType)
      ))
      .orderBy(desc(merchantFinancialInsights.generatedAt));
    return record;
  }

  async getPlaidAccessTokensForMerchant(email: string): Promise<{ accessToken: string; institutionName: string | null }[]> {
    const connections = await this.getMerchantPlaidConnectionsByEmail(email);
    const results: { accessToken: string; institutionName: string | null }[] = [];

    for (const conn of connections) {
      const [item] = await db
        .select()
        .from(plaidItems)
        .where(eq(plaidItems.itemId, conn.plaidItemId));
      if (item?.accessToken) {
        results.push({ accessToken: item.accessToken, institutionName: conn.institutionName });
      }
    }

    // Also check fundingAnalyses as fallback for intake-linked items
    const analyses = await db
      .select()
      .from(fundingAnalyses)
      .where(eq(fundingAnalyses.email, email.toLowerCase()));

    for (const analysis of analyses) {
      if (analysis.plaidItemId && !results.some(r => r.accessToken === analysis.plaidItemId)) {
        const [item] = await db
          .select()
          .from(plaidItems)
          .where(eq(plaidItems.itemId, analysis.plaidItemId));
        if (item?.accessToken) {
          results.push({ accessToken: item.accessToken, institutionName: item.institutionName });
        }
      }
    }

    return results;
  }

  // Rep Call Stats
  async getAllRepCallStats(): Promise<RepCallStat[]> {
    return await db
      .select()
      .from(repCallStats)
      .orderBy(desc(repCallStats.createdAt));
  }

  async getRepCallStatsByEmail(email: string): Promise<RepCallStat[]> {
    return await db
      .select()
      .from(repCallStats)
      .where(sql`LOWER(${repCallStats.repEmail}) = LOWER(${email})`)
      .orderBy(desc(repCallStats.createdAt));
  }

  async insertRepCallStat(stat: InsertRepCallStat): Promise<RepCallStat> {
    const [record] = await db
      .insert(repCallStats)
      .values(stat)
      .onConflictDoUpdate({
        target: repCallStats.id,
        set: {
          duration: stat.duration,
          result: stat.result,
          endTime: stat.endTime,
          rawPayload: stat.rawPayload,
        },
      })
      .returning();
    return record;
  }
}

export const storage = new DatabaseStorage();
