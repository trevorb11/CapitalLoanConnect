import { type User, type InsertUser, type LoanApplication, type InsertLoanApplication } from "@shared/schema";
import { randomUUID } from "crypto";

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

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private loanApplications: Map<string, LoanApplication>;

  constructor() {
    this.users = new Map();
    this.loanApplications = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getLoanApplication(id: string): Promise<LoanApplication | undefined> {
    return this.loanApplications.get(id);
  }

  async getLoanApplicationByEmail(email: string): Promise<LoanApplication | undefined> {
    return Array.from(this.loanApplications.values()).find(
      (app) => app.email === email && !app.isCompleted,
    );
  }

  async createLoanApplication(insertApplication: Partial<InsertLoanApplication>): Promise<LoanApplication> {
    const id = randomUUID();
    const now = new Date();
    const application: LoanApplication = {
      id,
      email: insertApplication.email || "",
      fullName: insertApplication.fullName || null,
      phone: insertApplication.phone || null,
      businessName: insertApplication.businessName || null,
      businessType: insertApplication.businessType || null,
      industry: insertApplication.industry || null,
      ein: insertApplication.ein || null,
      timeInBusiness: insertApplication.timeInBusiness || null,
      monthlyRevenue: insertApplication.monthlyRevenue || null,
      averageMonthlyRevenue: insertApplication.averageMonthlyRevenue || null,
      creditScore: insertApplication.creditScore || null,
      requestedAmount: insertApplication.requestedAmount || null,
      useOfFunds: insertApplication.useOfFunds || null,
      hasOutstandingLoans: insertApplication.hasOutstandingLoans || null,
      outstandingLoansAmount: insertApplication.outstandingLoansAmount || null,
      bankName: insertApplication.bankName || null,
      businessAddress: insertApplication.businessAddress || null,
      city: insertApplication.city || null,
      state: insertApplication.state || null,
      zipCode: insertApplication.zipCode || null,
      ownership: insertApplication.ownership || null,
      currentStep: insertApplication.currentStep || 1,
      isCompleted: insertApplication.isCompleted || false,
      ghlContactId: insertApplication.ghlContactId || null,
      createdAt: now,
      updatedAt: now,
    };
    this.loanApplications.set(id, application);
    return application;
  }

  async updateLoanApplication(id: string, updates: Partial<InsertLoanApplication>): Promise<LoanApplication | undefined> {
    const existing = this.loanApplications.get(id);
    if (!existing) {
      return undefined;
    }

    const updated: LoanApplication = {
      ...existing,
      ...updates,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
    };

    this.loanApplications.set(id, updated);
    return updated;
  }

  async getAllLoanApplications(): Promise<LoanApplication[]> {
    return Array.from(this.loanApplications.values());
  }
}

export const storage = new MemStorage();
