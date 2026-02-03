import {
  users, loanApplications, plaidItems, fundingAnalyses, bankStatementUploads, botAttempts, partners, lenderApprovals, businessUnderwritingDecisions, lenders, visitLogs,
  type User, type InsertUser, type LoanApplication, type InsertLoanApplication,
  type PlaidItem, type InsertPlaidItem, type FundingAnalysis, type InsertFundingAnalysis,
  type BankStatementUpload, type InsertBankStatementUpload,
  type BotAttempt, type InsertBotAttempt,
  type Partner, type InsertPartner,
  type LenderApproval, type InsertLenderApproval,
  type BusinessUnderwritingDecision, type InsertBusinessUnderwritingDecision,
  type Lender, type InsertLender,
  type VisitLog, type InsertVisitLog
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc, sql } from "drizzle-orm";

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
  getLoanApplicationByEmailOrPhone(emailOrPhone: string): Promise<LoanApplication | undefined>;
  createLoanApplication(application: Partial<InsertLoanApplication>): Promise<LoanApplication>;
  updateLoanApplication(id: string, application: Partial<InsertLoanApplication>): Promise<LoanApplication | undefined>;
  getAllLoanApplications(): Promise<LoanApplication[]>;
  
  // Plaid methods
  createPlaidItem(item: InsertPlaidItem): Promise<PlaidItem>;
  getPlaidItem(itemId: string): Promise<PlaidItem | undefined>;
  getPlaidItemById(id: string): Promise<PlaidItem | undefined>;
  getAllPlaidItems(): Promise<PlaidItem[]>;
  createFundingAnalysis(analysis: InsertFundingAnalysis): Promise<FundingAnalysis>;
  getFundingAnalysisByEmail(email: string): Promise<FundingAnalysis | undefined>;
  getAllFundingAnalyses(): Promise<FundingAnalysis[]>;
  
  // Bank Statement Upload methods
  createBankStatementUpload(upload: InsertBankStatementUpload): Promise<BankStatementUpload>;
  getBankStatementUpload(id: string): Promise<BankStatementUpload | undefined>;
  getBankStatementUploadByViewToken(viewToken: string): Promise<BankStatementUpload | undefined>;
  getAllBankStatementUploads(): Promise<BankStatementUpload[]>;
  getBankStatementUploadsByEmail(email: string): Promise<BankStatementUpload[]>;
  getBankStatementUploadsByAgentEmail(agentEmail: string): Promise<BankStatementUpload[]>;
  updateBankStatementApproval(id: string, approvalStatus: string | null, approvalNotes: string | null, reviewedBy: string | null): Promise<BankStatementUpload | undefined>;

  // Bot Attempts methods
  createBotAttempt(attempt: InsertBotAttempt): Promise<BotAttempt>;
  getAllBotAttempts(): Promise<BotAttempt[]>;
  getBotAttemptsCount(): Promise<number>;

  // Partner methods
  createPartner(partner: InsertPartner): Promise<Partner>;
  getPartner(id: string): Promise<Partner | undefined>;
  getPartnerByEmail(email: string): Promise<Partner | undefined>;
  getPartnerByInviteCode(inviteCode: string): Promise<Partner | undefined>;
  updatePartner(id: string, updates: Partial<InsertPartner>): Promise<Partner | undefined>;
  getAllPartners(): Promise<Partner[]>;
  getApplicationsByPartnerId(partnerId: string): Promise<LoanApplication[]>;

  // Lender Approval methods
  createLenderApproval(approval: InsertLenderApproval): Promise<LenderApproval>;
  getLenderApproval(id: string): Promise<LenderApproval | undefined>;
  getLenderApprovalByEmailId(emailId: string): Promise<LenderApproval | undefined>;
  getAllLenderApprovals(): Promise<LenderApproval[]>;
  getLenderApprovalsByBusinessName(businessName: string): Promise<LenderApproval[]>;
  getLenderApprovalsByLender(lenderName: string): Promise<LenderApproval[]>;
  updateLenderApproval(id: string, updates: Partial<InsertLenderApproval>): Promise<LenderApproval | undefined>;

  // Business Underwriting Decision methods
  createOrUpdateBusinessUnderwritingDecision(decision: InsertBusinessUnderwritingDecision): Promise<BusinessUnderwritingDecision>;
  getBusinessUnderwritingDecision(id: string): Promise<BusinessUnderwritingDecision | undefined>;
  getBusinessUnderwritingDecisionByEmail(email: string): Promise<BusinessUnderwritingDecision | undefined>;
  getBusinessUnderwritingDecisionBySlug(slug: string): Promise<BusinessUnderwritingDecision | undefined>;
  getAllBusinessUnderwritingDecisions(): Promise<BusinessUnderwritingDecision[]>;
  updateBusinessUnderwritingDecision(id: string, updates: Partial<InsertBusinessUnderwritingDecision>): Promise<BusinessUnderwritingDecision | undefined>;
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
    const [application] = await db
      .select()
      .from(loanApplications)
      .where(
        and(
          eq(loanApplications.email, email),
          eq(loanApplications.isCompleted, false)
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

  async getApplicationByEmail(email: string): Promise<LoanApplication | undefined> {
    const [application] = await db
      .select()
      .from(loanApplications)
      .where(eq(loanApplications.email, email))
      .orderBy(desc(loanApplications.createdAt));
    return application || undefined;
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
      .orderBy(desc(bankStatementUploads.createdAt));
  }

  async updateBankStatementViewToken(id: string, viewToken: string): Promise<void> {
    await db
      .update(bankStatementUploads)
      .set({ viewToken })
      .where(eq(bankStatementUploads.id, id));
  }

  async getBankStatementUploadsByEmail(email: string): Promise<BankStatementUpload[]> {
    return await db
      .select()
      .from(bankStatementUploads)
      .where(eq(bankStatementUploads.email, email))
      .orderBy(desc(bankStatementUploads.createdAt));
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
      .orderBy(desc(bankStatementUploads.createdAt));
    
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
    const existing = await this.getBusinessUnderwritingDecisionByEmail(decision.businessEmail);
    
    let approvalSlug = existing?.approvalSlug;
    if (decision.status === 'approved' && !approvalSlug) {
      approvalSlug = this.generateApprovalSlug(decision.businessName || null, decision.businessEmail);
    } else if (decision.status === 'declined') {
      approvalSlug = null;
    }
    
    if (existing) {
      const [updated] = await db
        .update(businessUnderwritingDecisions)
        .set({
          ...decision,
          approvalSlug,
          updatedAt: new Date(),
        })
        .where(eq(businessUnderwritingDecisions.id, existing.id))
        .returning();
      return updated;
    } else {
      const [newDecision] = await db
        .insert(businessUnderwritingDecisions)
        .values({ ...decision, approvalSlug })
        .returning();
      return newDecision;
    }
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
      .where(sql`LOWER(${businessUnderwritingDecisions.businessEmail}) = LOWER(${email})`);
    return decision || undefined;
  }

  async getBusinessUnderwritingDecisionBySlug(slug: string): Promise<BusinessUnderwritingDecision | undefined> {
    const [decision] = await db
      .select()
      .from(businessUnderwritingDecisions)
      .where(eq(businessUnderwritingDecisions.approvalSlug, slug));
    return decision || undefined;
  }

  async getAllBusinessUnderwritingDecisions(): Promise<BusinessUnderwritingDecision[]> {
    return await db
      .select()
      .from(businessUnderwritingDecisions)
      .orderBy(desc(businessUnderwritingDecisions.updatedAt));
  }

  async updateBusinessUnderwritingDecision(id: string, updates: Partial<InsertBusinessUnderwritingDecision>): Promise<BusinessUnderwritingDecision | undefined> {
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
}

export const storage = new DatabaseStorage();
