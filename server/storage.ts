import {
  users, loanApplications, plaidItems, fundingAnalyses, bankStatementUploads, botAttempts, partners,
  type User, type InsertUser, type LoanApplication, type InsertLoanApplication,
  type PlaidItem, type InsertPlaidItem, type FundingAnalysis, type InsertFundingAnalysis,
  type BankStatementUpload, type InsertBankStatementUpload,
  type BotAttempt, type InsertBotAttempt,
  type Partner, type InsertPartner
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc } from "drizzle-orm";

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
  getAllBankStatementUploads(): Promise<BankStatementUpload[]>;
  getBankStatementUploadsByEmail(email: string): Promise<BankStatementUpload[]>;

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
  }

  async updateLoanApplication(id: string, updates: Partial<InsertLoanApplication>): Promise<LoanApplication | undefined> {
    const [updated] = await db
      .update(loanApplications)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(loanApplications.id, id))
      .returning();
    return updated || undefined;
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

  async getAllBankStatementUploads(): Promise<BankStatementUpload[]> {
    return await db
      .select()
      .from(bankStatementUploads)
      .orderBy(desc(bankStatementUploads.createdAt));
  }

  async getBankStatementUploadsByEmail(email: string): Promise<BankStatementUpload[]> {
    return await db
      .select()
      .from(bankStatementUploads)
      .where(eq(bankStatementUploads.email, email))
      .orderBy(desc(bankStatementUploads.createdAt));
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
}

export const storage = new DatabaseStorage();
