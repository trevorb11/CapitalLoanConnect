import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const loanApplications = pgTable("loan_applications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // --- Existing Intake Fields ---
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
  fundingUrgency: text("funding_urgency"),
  referralSource: text("referral_source"),
  bestTimeToContact: text("best_time_to_contact"),
  
  // --- NEW: Full Application Fields ---
  legalBusinessName: text("legal_business_name"),
  doingBusinessAs: text("doing_business_as"),
  companyWebsite: text("company_website"),
  businessStartDate: text("business_start_date"),
  stateOfIncorporation: text("state_of_incorporation"),
  doYouProcessCreditCards: text("do_you_process_credit_cards"),
  mcaBalanceAmount: decimal("mca_balance_amount", { precision: 12, scale: 2 }),
  mcaBalanceBankName: text("mca_balance_bank_name"),
  
  // Owner Specifics
  socialSecurityNumber: text("social_security_number"),
  ficoScoreExact: text("fico_score_exact"),
  dateOfBirth: text("date_of_birth"),
  ownerPercentage: text("owner_percentage"),
  ownerAddress1: text("owner_address_1"),
  ownerAddress2: text("owner_address_2"),
  ownerCity: text("owner_city"),
  ownerState: text("owner_state"),
  ownerZip: text("owner_zip"),
  businessEmail: text("business_email"),
  
  // NEW: Additional fields to match webhook form
  companyEmail: text("company_email"),
  businessStreetAddress: text("business_street_address"),
  businessCsz: text("business_csz"), // Combined City, State, Zip for business
  ownerCsz: text("owner_csz"), // Combined City, State, Zip for owner
  personalCreditScoreRange: text("personal_credit_score_range"),
  
  // Signature
  applicantSignature: text("applicant_signature"), // Base64 encoded signature

  // --- Agent Tracking ---
  agentName: text("agent_name"), // Name of the agent who sent the application
  agentEmail: text("agent_email"), // Email of the agent
  agentGhlId: text("agent_ghl_id"), // GoHighLevel user ID of the agent

  // --- System Fields ---
  agentViewUrl: text("agent_view_url"), // To store the generated PDF link
  currentStep: integer("current_step").default(1),
  isCompleted: boolean("is_completed").default(false),
  isFullApplicationCompleted: boolean("is_full_application_completed").default(false),
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

// Step-by-step validation schemas for intake form
export const step1Schema = z.object({
  email: z.string().email("Please enter a valid email address"),
  fullName: z.string().min(2, "Please enter your full name"),
  phone: z.string().min(10, "Please enter a valid phone number"),
});

export const step2Schema = z.object({
  businessName: z.string().min(2, "Please enter your business name"),
  businessType: z.string().min(1, "Please select your business type"),
  industry: z.string().min(1, "Please select your industry"),
  ein: z.string().optional(),
  timeInBusiness: z.string().min(1, "Please enter time in business"),
  ownership: z.string().min(1, "Please enter ownership percentage"),
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
  zipCode: z.string().min(5, "Please enter your ZIP code"),
});

export type Step1Data = z.infer<typeof step1Schema>;
export type Step2Data = z.infer<typeof step2Schema>;
export type Step3Data = z.infer<typeof step3Schema>;
export type Step4Data = z.infer<typeof step4Schema>;
export type Step5Data = z.infer<typeof step5Schema>;

// Validation schema for the Full Application Form
export const fullApplicationSchema = z.object({
  legalBusinessName: z.string().min(2, "Legal name is required"),
  doingBusinessAs: z.string().optional(),
  companyWebsite: z.string().optional(),
  businessStartDate: z.string().min(1, "Start date is required"),
  ein: z.string().min(1, "EIN is required"),
  stateOfIncorporation: z.string().min(2, "State of Inc is required"),
  doYouProcessCreditCards: z.enum(["Yes", "No"]).optional(),
  industry: z.string().optional(),
  businessAddress: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(2, "State is required"),
  zipCode: z.string().min(5, "Zip is required"),
  requestedAmount: z.string().optional(),
  mcaBalanceAmount: z.string().optional(),
  mcaBalanceBankName: z.string().optional(),
  
  fullName: z.string().min(1, "Full name is required"),
  businessEmail: z.string().email().optional(),
  phone: z.string().min(10, "Phone is required"),
  socialSecurityNumber: z.string().min(9, "SSN is required"),
  ficoScoreExact: z.string().optional(),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  ownership: z.string().optional(),
  ownerAddress1: z.string().min(1, "Home address is required"),
  ownerAddress2: z.string().optional(),
  ownerCity: z.string().min(1, "City is required"),
  ownerState: z.string().min(2, "State is required"),
  ownerZip: z.string().min(5, "Zip is required"),
});

export type FullApplicationData = z.infer<typeof fullApplicationSchema>;

// User schema for authentication (if needed)
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
