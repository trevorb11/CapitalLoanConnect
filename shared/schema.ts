import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const loanApplications = pgTable("loan_applications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull(),
  fullName: text("full_name"),
  phone: text("phone"),
  businessName: text("business_name"),
  businessType: text("business_type"),
  industry: text("industry"),
  ein: text("ein"),
  timeInBusiness: text("time_in_business"),
  monthlyRevenue: decimal("monthly_revenue", { precision: 12, scale: 2 }),
  averageMonthlyRevenue: decimal("average_monthly_revenue", { precision: 12, scale: 2 }),
  creditScore: text("credit_score"),
  requestedAmount: decimal("requested_amount", { precision: 12, scale: 2 }),
  useOfFunds: text("use_of_funds"),
  hasOutstandingLoans: boolean("has_outstanding_loans"),
  outstandingLoansAmount: decimal("outstanding_loans_amount", { precision: 12, scale: 2 }),
  bankName: text("bank_name"),
  businessAddress: text("business_address"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  ownership: text("ownership"),
  
  // Broker-useful fields
  fundingUrgency: text("funding_urgency"), // How soon they need funding
  referralSource: text("referral_source"), // How they heard about us
  bestTimeToContact: text("best_time_to_contact"), // Preferred contact time
  
  currentStep: integer("current_step").default(1),
  isCompleted: boolean("is_completed").default(false),
  ghlContactId: text("ghl_contact_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertLoanApplicationSchema = createInsertSchema(loanApplications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertLoanApplication = z.infer<typeof insertLoanApplicationSchema>;
export type LoanApplication = typeof loanApplications.$inferSelect;

// Step-by-step validation schemas
export const step1Schema = z.object({
  email: z.string().email("Please enter a valid email address"),
  fullName: z.string().min(2, "Please enter your full name"),
  phone: z.string().min(10, "Please enter a valid phone number"),
});

export const step2Schema = z.object({
  businessName: z.string().min(2, "Please enter your business name"),
  businessType: z.string().min(1, "Please select a business type"),
  industry: z.string().min(1, "Please select your industry"),
  ein: z.string().optional(),
  timeInBusiness: z.string().min(1, "Please select how long you've been in business"),
  ownership: z.string().min(1, "Please select your ownership percentage"),
});

export const step3Schema = z.object({
  monthlyRevenue: z.string().min(1, "Please enter your monthly revenue"),
  averageMonthlyRevenue: z.string().min(1, "Please enter your average monthly revenue"),
  creditScore: z.string().min(1, "Please select your credit score range"),
  hasOutstandingLoans: z.boolean(),
  outstandingLoansAmount: z.string().optional(),
});

export const step4Schema = z.object({
  requestedAmount: z.string().min(1, "Please enter the amount you need"),
  useOfFunds: z.string().min(10, "Please describe how you'll use the funds"),
  fundingUrgency: z.string().min(1, "Please select when you need funding"),
  referralSource: z.string().optional(),
  bestTimeToContact: z.string().optional(),
  bankName: z.string().optional(),
});

export const step5Schema = z.object({
  businessAddress: z.string().min(5, "Please enter your business address"),
  city: z.string().min(2, "Please enter your city"),
  state: z.string().min(2, "Please select your state"),
  zipCode: z.string().min(5, "Please enter a valid zip code"),
});

export type Step1Data = z.infer<typeof step1Schema>;
export type Step2Data = z.infer<typeof step2Schema>;
export type Step3Data = z.infer<typeof step3Schema>;
export type Step4Data = z.infer<typeof step4Schema>;
export type Step5Data = z.infer<typeof step5Schema>;

// For legacy user schema compatibility
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
