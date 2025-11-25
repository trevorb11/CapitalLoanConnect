import { 
  users, loanApplications, plaidItems, fundingAnalyses,
  type User, type InsertUser, type LoanApplication, type InsertLoanApplication,
  type PlaidItem, type InsertPlaidItem, type FundingAnalysis, type InsertFundingAnalysis
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getLoanApplication(id: string): Promise<LoanApplication | undefined>;
  getLoanApplicationByEmail(email: string): Promise<LoanApplication | undefined>;
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
}

export const storage = new DatabaseStorage();
