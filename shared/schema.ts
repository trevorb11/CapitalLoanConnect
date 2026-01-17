import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, integer, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Partners table for referral partner portal
export const partners = pgTable("partners", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  companyName: text("company_name").notNull(),
  contactName: text("contact_name").notNull(),
  phone: text("phone"),
  profession: text("profession"), // 'cpa', 'realtor', 'vendor', 'consultant', 'other'
  clientBaseSize: text("client_base_size"), // '1-10', '10-50', '50+'
  logoUrl: text("logo_url"),
  inviteCode: text("invite_code").notNull().unique(), // Unique code for referral links
  commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }).default("3.00"), // Default 3%
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPartnerSchema = createInsertSchema(partners).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPartner = z.infer<typeof insertPartnerSchema>;
export type Partner = typeof partners.$inferSelect;

export const loanApplications = pgTable("loan_applications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),

  // --- Referral Partner Tracking ---
  referralPartnerId: varchar("referral_partner_id").references(() => partners.id),

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

  // --- Plaid Integration ---
  plaidItemId: text("plaid_item_id"), // Link to Plaid access token for retrieving statements

  // --- Agent Tracking ---
  agentName: text("agent_name"), // Name of the agent who sent the application
  agentEmail: text("agent_email"), // Email of the agent
  agentGhlId: text("agent_ghl_id"), // GoHighLevel user ID of the agent

  // --- System Fields ---
  agentViewUrl: text("agent_view_url"), // To store the generated PDF link
  fundingReportUrl: text("funding_report_url"), // Custom funding report URL for this application
  currentStep: integer("current_step").default(1),
  isCompleted: boolean("is_completed").default(false),
  isFullApplicationCompleted: boolean("is_full_application_completed").default(false),
  ghlContactId: text("ghl_contact_id"),

  // --- Bot Detection ---
  isBotAttempt: boolean("is_bot_attempt").default(false), // Honeypot triggered

  // --- UTM Tracking Parameters ---
  utmSource: text("utm_source"),      // e.g., google, facebook, newsletter
  utmMedium: text("utm_medium"),      // e.g., cpc, email, social
  utmCampaign: text("utm_campaign"),  // e.g., spring_sale, product_launch
  utmTerm: text("utm_term"),          // Paid search keywords
  utmContent: text("utm_content"),    // A/B test or ad variation identifier
  referrerUrl: text("referrer_url"),  // The full referring URL

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertLoanApplicationSchema = createInsertSchema(loanApplications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
  utmTerm: z.string().optional(),
  utmContent: z.string().optional(),
  referrerUrl: z.string().optional(),
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

// Plaid Items - Store access tokens for bank connections
export const plaidItems = pgTable("plaid_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  itemId: text("item_id").notNull(),
  accessToken: text("access_token").notNull(),
  institutionName: text("institution_name"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Funding Analyses - Store calculated results from Plaid data
export const fundingAnalyses = pgTable("funding_analyses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessName: text("business_name"),
  email: text("email"),
  
  // Calculated Metrics from Plaid
  calculatedMonthlyRevenue: decimal("calculated_monthly_revenue", { precision: 12, scale: 2 }),
  calculatedAvgBalance: decimal("calculated_avg_balance", { precision: 12, scale: 2 }),
  negativeDaysCount: integer("negative_days_count"),
  
  // The "Report" - Storing the full recommendation object
  analysisResult: jsonb("analysis_result"),
  plaidItemId: text("plaid_item_id"), // Link to the token
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPlaidItemSchema = createInsertSchema(plaidItems).omit({
  id: true,
  createdAt: true,
});

export const insertFundingAnalysisSchema = createInsertSchema(fundingAnalyses).omit({
  id: true,
  createdAt: true,
});

export type InsertPlaidItem = z.infer<typeof insertPlaidItemSchema>;
export type PlaidItem = typeof plaidItems.$inferSelect;
export type InsertFundingAnalysis = z.infer<typeof insertFundingAnalysisSchema>;
export type FundingAnalysis = typeof fundingAnalyses.$inferSelect;

// Bank Statement Uploads - Store uploaded PDF bank statements
export const bankStatementUploads = pgTable("bank_statement_uploads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  loanApplicationId: varchar("loan_application_id").references(() => loanApplications.id),
  email: text("email").notNull(),
  businessName: text("business_name"),
  originalFileName: text("original_file_name").notNull(),
  storedFileName: text("stored_file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size").notNull(),
  source: text("source").default("Upload"), // "Upload" for regular uploads, "Checker" for funding check
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertBankStatementUploadSchema = createInsertSchema(bankStatementUploads).omit({
  id: true,
  createdAt: true,
});

export type InsertBankStatementUpload = z.infer<typeof insertBankStatementUploadSchema>;
export type BankStatementUpload = typeof bankStatementUploads.$inferSelect;

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

// Bot Attempts - Track honeypot triggers for monitoring
export const botAttempts = pgTable("bot_attempts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  honeypotValue: text("honeypot_value"), // What they put in the fax field
  formType: text("form_type"), // 'intake', 'full_application', 'quiz'
  additionalData: jsonb("additional_data"), // Any other form data submitted
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertBotAttemptSchema = createInsertSchema(botAttempts).omit({
  id: true,
  createdAt: true,
});

export type InsertBotAttempt = z.infer<typeof insertBotAttemptSchema>;
export type BotAttempt = typeof botAttempts.$inferSelect;

// Lender Approvals - Track funding approvals from lender emails
export const lenderApprovals = pgTable("lender_approvals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Business/Merchant Info
  businessName: text("business_name").notNull(),
  businessEmail: text("business_email"),
  loanApplicationId: varchar("loan_application_id").references(() => loanApplications.id),
  
  // Lender Info
  lenderName: text("lender_name").notNull(),
  lenderEmail: text("lender_email"),
  
  // Approval Details
  approvedAmount: decimal("approved_amount", { precision: 12, scale: 2 }),
  termLength: text("term_length"), // e.g., "6 months", "12 months"
  factorRate: text("factor_rate"), // e.g., "1.25"
  paybackAmount: decimal("payback_amount", { precision: 12, scale: 2 }),
  paymentFrequency: text("payment_frequency"), // "Daily", "Weekly", "Monthly"
  paymentAmount: decimal("payment_amount", { precision: 12, scale: 2 }),
  interestRate: text("interest_rate"), // e.g., "15% APR"
  productType: text("product_type"), // "MCA", "LOC", "Term Loan", "SBA"
  
  // Status & Notes
  status: text("status").default("pending"), // "pending", "accepted", "declined", "expired"
  expirationDate: text("expiration_date"),
  conditions: text("conditions"), // Any conditions/requirements
  notes: text("notes"),
  
  // Email Metadata
  emailId: text("email_id"), // Gmail message ID to prevent duplicates
  emailSubject: text("email_subject"),
  emailReceivedAt: timestamp("email_received_at"),
  rawEmailContent: text("raw_email_content"), // Store original email for reference

  // GHL Sync Tracking
  ghlSynced: boolean("ghl_synced").default(false), // Whether synced to GHL opportunity
  ghlSyncedAt: timestamp("ghl_synced_at"), // When it was synced
  ghlSyncMessage: text("ghl_sync_message"), // Success/error message from sync attempt
  ghlOpportunityId: text("ghl_opportunity_id"), // The opportunity ID it was synced to

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertLenderApprovalSchema = createInsertSchema(lenderApprovals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertLenderApproval = z.infer<typeof insertLenderApprovalSchema>;
export type LenderApproval = typeof lenderApprovals.$inferSelect;
