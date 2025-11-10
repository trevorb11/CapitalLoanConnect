import { users, loanApplications, type User, type InsertUser, type LoanApplication, type InsertLoanApplication } from "@shared/schema";
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
        email: insertApplication.email || "",
        fullName: insertApplication.fullName,
        phone: insertApplication.phone,
        businessName: insertApplication.businessName,
        businessType: insertApplication.businessType,
        industry: insertApplication.industry,
        ein: insertApplication.ein,
        timeInBusiness: insertApplication.timeInBusiness,
        monthlyRevenue: insertApplication.monthlyRevenue,
        averageMonthlyRevenue: insertApplication.averageMonthlyRevenue,
        creditScore: insertApplication.creditScore,
        requestedAmount: insertApplication.requestedAmount,
        useOfFunds: insertApplication.useOfFunds,
        hasOutstandingLoans: insertApplication.hasOutstandingLoans,
        outstandingLoansAmount: insertApplication.outstandingLoansAmount,
        bankName: insertApplication.bankName,
        businessAddress: insertApplication.businessAddress,
        city: insertApplication.city,
        state: insertApplication.state,
        zipCode: insertApplication.zipCode,
        ownership: insertApplication.ownership,
        currentStep: insertApplication.currentStep || 1,
        isCompleted: insertApplication.isCompleted || false,
        ghlContactId: insertApplication.ghlContactId,
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
}

export const storage = new DatabaseStorage();
