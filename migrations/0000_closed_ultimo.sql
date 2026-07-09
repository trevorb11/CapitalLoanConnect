CREATE TABLE "ach_authorizations" (
	"id" serial PRIMARY KEY NOT NULL,
	"bank_name" text NOT NULL,
	"bank_address" text,
	"bank_city" text,
	"bank_state" text,
	"bank_zip" text,
	"account_type" text DEFAULT 'checking',
	"routing_number" text NOT NULL,
	"account_number" text NOT NULL,
	"debit_date" text,
	"amount" text,
	"business_name" text NOT NULL,
	"business_address" text,
	"business_city" text,
	"business_state" text,
	"business_zip" text,
	"contact_name" text,
	"contact_email" text,
	"contact_phone" text,
	"signature_data" text,
	"signed_at" timestamp,
	"ip_address" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ads_leads" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text,
	"first_name" text,
	"last_name" text,
	"phone" text,
	"business_name" text,
	"city" text,
	"state" text,
	"monthly_revenue" text,
	"source" text,
	"lead_batch" text,
	"lead_type" text DEFAULT 'Clicked through Email' NOT NULL,
	"notes" text,
	"last_activity" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "ads_leads_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "application_submissions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"loan_application_id" varchar NOT NULL,
	"email" text,
	"submission_type" text NOT NULL,
	"requested_amount" numeric(12, 2),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "bank_statement_uploads" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"loan_application_id" varchar,
	"email" text NOT NULL,
	"business_name" text,
	"original_file_name" text NOT NULL,
	"stored_file_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"file_size" integer NOT NULL,
	"source" text DEFAULT 'Upload',
	"view_token" text,
	"received_at" timestamp,
	"approval_status" text,
	"approval_notes" text,
	"reviewed_by" text,
	"reviewed_at" timestamp,
	"lender_id" varchar,
	"lender_name" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "bot_attempts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text,
	"ip_address" text,
	"user_agent" text,
	"honeypot_value" text,
	"form_type" text,
	"additional_data" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "business_underwriting_decisions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_email" text NOT NULL,
	"business_name" text,
	"business_phone" text,
	"status" text NOT NULL,
	"advance_amount" numeric(12, 2),
	"term" text,
	"payment_frequency" text,
	"factor_rate" numeric(5, 4),
	"buy_rate" numeric(5, 4),
	"sell_rate" numeric(5, 4),
	"max_upsell" numeric(12, 2),
	"total_payback" numeric(12, 2),
	"net_after_fees" numeric(12, 2),
	"lender" text,
	"notes" text,
	"approval_date" timestamp,
	"approval_deadline" timestamp,
	"funded_date" timestamp,
	"assigned_rep" text,
	"assigned_rep_2" text,
	"rep_followers" text[],
	"show_on_letter" boolean DEFAULT true,
	"additional_approvals" jsonb,
	"additional_fundings" jsonb,
	"decline_reason" text,
	"additional_declines" jsonb,
	"follow_up_worthy" boolean,
	"follow_up_date" timestamp,
	"approval_slug" text,
	"merchant_email" text,
	"merchant_password_hash" text,
	"merchant_portal_token" text,
	"ghl_synced" boolean DEFAULT false,
	"ghl_synced_at" timestamp,
	"ghl_sync_message" text,
	"ghl_opportunity_id" text,
	"secondary_email" text,
	"sf_synced" boolean DEFAULT false,
	"sf_synced_at" timestamp,
	"sf_sync_message" text,
	"sf_account_id" text,
	"sf_contact_id" text,
	"sf_opportunity_id" text,
	"reviewed_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "business_underwriting_decisions_approval_slug_unique" UNIQUE("approval_slug")
);
--> statement-breakpoint
CREATE TABLE "congratulations_uploads" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"business_name" text,
	"doc_type" text NOT NULL,
	"object_name" text NOT NULL,
	"original_file_name" text NOT NULL,
	"file_size" integer NOT NULL,
	"contact_id" text,
	"opportunity_id" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "funding_analyses" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_name" text,
	"email" text,
	"calculated_monthly_revenue" numeric(12, 2),
	"calculated_avg_balance" numeric(12, 2),
	"negative_days_count" integer,
	"analysis_result" jsonb,
	"plaid_item_id" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "lead_otp_codes" (
	"phone" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"email" text NOT NULL,
	"attempts" integer DEFAULT 0,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "lead_portal_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text,
	"first_name" text,
	"last_name" text,
	"phone" text,
	"business_name" text,
	"industry" text,
	"monthly_revenue" text,
	"time_in_business" text,
	"referral_source" text,
	"qualification_score" integer,
	"qualification_tier" text,
	"is_qualified" boolean DEFAULT false,
	"qualified_at" timestamp,
	"qualified_notified_at" timestamp,
	"nurture_steps_sent" text,
	"assigned_rep" text,
	"notes" text,
	"status" text DEFAULT 'active',
	"last_active_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "lead_portal_accounts_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "lead_positions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_email" text NOT NULL,
	"funder_name" text NOT NULL,
	"product_type" text,
	"funded_amount" numeric(12, 2),
	"payback_amount" numeric(12, 2),
	"factor_rate" text,
	"payment_amount" numeric(12, 2),
	"payment_frequency" text,
	"funded_date" text,
	"estimated_payoff_date" text,
	"remaining_balance" numeric(12, 2),
	"status" text DEFAULT 'active',
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "lender_approvals" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_name" text NOT NULL,
	"business_email" text,
	"loan_application_id" varchar,
	"lender_name" text NOT NULL,
	"lender_email" text,
	"approved_amount" numeric(12, 2),
	"term_length" text,
	"factor_rate" text,
	"payback_amount" numeric(12, 2),
	"payment_frequency" text,
	"payment_amount" numeric(12, 2),
	"interest_rate" text,
	"product_type" text,
	"status" text DEFAULT 'pending',
	"expiration_date" text,
	"conditions" text,
	"notes" text,
	"email_id" text,
	"email_subject" text,
	"email_received_at" timestamp,
	"raw_email_content" text,
	"ghl_synced" boolean DEFAULT false,
	"ghl_synced_at" timestamp,
	"ghl_sync_message" text,
	"ghl_opportunity_id" text,
	"sf_synced" boolean DEFAULT false,
	"sf_synced_at" timestamp,
	"sf_sync_message" text,
	"sf_opportunity_id" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "lenders" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"contact_info" text,
	"requirements" text,
	"notes" text,
	"tier" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "lenders_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "loan_applications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"merchant_id" varchar,
	"referral_partner_id" varchar,
	"email" text NOT NULL,
	"full_name" text,
	"phone" text,
	"business_name" text,
	"business_type" text,
	"industry" text,
	"ein" text,
	"time_in_business" text,
	"monthly_revenue" numeric(12, 2),
	"average_monthly_revenue" numeric(12, 2),
	"credit_score" text,
	"requested_amount" numeric(12, 2),
	"use_of_funds" text,
	"has_outstanding_loans" boolean,
	"outstanding_loans_amount" numeric(12, 2),
	"bank_name" text,
	"business_address" text,
	"city" text,
	"state" text,
	"zip_code" text,
	"ownership" text,
	"funding_urgency" text,
	"referral_source" text,
	"best_time_to_contact" text,
	"legal_business_name" text,
	"doing_business_as" text,
	"company_website" text,
	"business_start_date" text,
	"state_of_incorporation" text,
	"do_you_process_credit_cards" text,
	"mca_balance_amount" numeric(12, 2),
	"mca_balance_bank_name" text,
	"social_security_number" text,
	"fico_score_exact" text,
	"date_of_birth" text,
	"owner_percentage" text,
	"owner_address_1" text,
	"owner_address_2" text,
	"owner_city" text,
	"owner_state" text,
	"owner_zip" text,
	"business_email" text,
	"company_email" text,
	"business_street_address" text,
	"business_csz" text,
	"owner_csz" text,
	"personal_credit_score_range" text,
	"applicant_signature" text,
	"signature_date" text,
	"plaid_item_id" text,
	"chirp_request_code" text,
	"gigfi_status" text,
	"gigfi_decision_id" text,
	"gigfi_redirect_url" text,
	"gigfi_submitted_at" timestamp,
	"gigfi_bank_connected_at" timestamp,
	"gigfi_approved_at" timestamp,
	"agent_name" text,
	"agent_email" text,
	"agent_ghl_id" text,
	"agent_view_url" text,
	"funding_report_url" text,
	"current_step" integer DEFAULT 1,
	"is_completed" boolean DEFAULT false,
	"is_full_application_completed" boolean DEFAULT false,
	"ghl_contact_id" text,
	"sf_account_id" text,
	"sf_contact_id" text,
	"sf_opportunity_id" text,
	"sf_synced_at" timestamp,
	"sf_sync_message" text,
	"uw_submitted_at" timestamp,
	"is_bot_attempt" boolean DEFAULT false,
	"utm_source" text,
	"utm_medium" text,
	"utm_campaign" text,
	"utm_term" text,
	"utm_content" text,
	"referrer_url" text,
	"last_submission_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "merchant_bank_snapshots" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"merchant_email" text NOT NULL,
	"chirp_request_code" text NOT NULL,
	"institution_name" text,
	"status" text,
	"is_account_connected" boolean DEFAULT false,
	"accounts_data" jsonb,
	"summary_data" jsonb,
	"metrics" jsonb,
	"transactions_data" jsonb,
	"widget_url" text,
	"verification_url" text,
	"statement_filed_at" timestamp,
	"last_synced_at" timestamp,
	"last_refresh_at" timestamp,
	"connected_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "merchant_bank_snapshots_merchant_email_unique" UNIQUE("merchant_email")
);
--> statement-breakpoint
CREATE TABLE "merchant_financial_insights" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"merchant_email" text NOT NULL,
	"source_type" text NOT NULL,
	"insights_data" jsonb NOT NULL,
	"generated_at" timestamp DEFAULT now(),
	"expires_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "merchant_messages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"merchant_email" text NOT NULL,
	"deal_id" text,
	"sender_role" text NOT NULL,
	"sender_name" text,
	"message" text NOT NULL,
	"is_read" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "merchant_plaid_connections" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"merchant_email" text NOT NULL,
	"plaid_item_id" text NOT NULL,
	"institution_name" text,
	"is_active" boolean DEFAULT true,
	"connected_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "merchant_portal_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text,
	"portal_token" text,
	"name" text,
	"phone" text,
	"business_name" text,
	"application_id" varchar,
	"decision_id" text,
	"portal_link_sent_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "merchant_portal_accounts_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "merchant_positions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_email" text NOT NULL,
	"business_name" text,
	"funder_name" text NOT NULL,
	"product_type" text,
	"payment_amount" numeric(12, 2),
	"payment_amount_display" text,
	"payment_frequency" text,
	"estimated_funding_amount" numeric(12, 2),
	"estimated_total_payback" numeric(12, 2),
	"estimated_remaining_balance" numeric(12, 2),
	"percent_complete" integer,
	"first_payment_seen" text,
	"last_payment_seen" text,
	"estimated_start_date" text,
	"estimated_payoff_date" text,
	"renewal_eligible_date" text,
	"funding_deposit_amount" numeric(12, 2),
	"funding_deposit_date" text,
	"tier" text,
	"outreach_status" text DEFAULT 'not_contacted',
	"outreach_notes" text,
	"anomalies" text,
	"source" text DEFAULT 'ai_extraction',
	"status" text DEFAULT 'active',
	"uw_status" text,
	"uw_lender" text,
	"uw_amount" numeric(12, 2),
	"uw_approval_count" integer DEFAULT 0,
	"uw_decline_count" integer DEFAULT 0,
	"uw_funded_date" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "merchants" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_name" text,
	"primary_email" text,
	"primary_phone" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "page_visits" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text,
	"phone" text,
	"interest" text,
	"page_path" text,
	"full_url" text,
	"referrer" text,
	"utm_source" text,
	"utm_campaign" text,
	"utm_medium" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "partners" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"company_name" text NOT NULL,
	"contact_name" text NOT NULL,
	"phone" text,
	"profession" text,
	"client_base_size" text,
	"logo_url" text,
	"slug" text,
	"invite_code" text NOT NULL,
	"commission_rate" numeric(5, 2) DEFAULT '3.00',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "partners_email_unique" UNIQUE("email"),
	CONSTRAINT "partners_slug_unique" UNIQUE("slug"),
	CONSTRAINT "partners_invite_code_unique" UNIQUE("invite_code")
);
--> statement-breakpoint
CREATE TABLE "plaid_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" text NOT NULL,
	"access_token" text NOT NULL,
	"institution_name" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "plaid_statements" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plaid_item_id" text NOT NULL,
	"statement_id" text NOT NULL,
	"account_id" text NOT NULL,
	"account_name" text,
	"account_type" text,
	"account_mask" text,
	"month" integer NOT NULL,
	"year" integer NOT NULL,
	"institution_id" text,
	"institution_name" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "plaid_statements_statement_id_unique" UNIQUE("statement_id")
);
--> statement-breakpoint
CREATE TABLE "rep_call_stats" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"rep_name" text,
	"rep_email" text,
	"call_id" text,
	"call_type" text,
	"direction" text,
	"duration" integer,
	"caller_number" text,
	"callee_number" text,
	"caller_name" text,
	"callee_name" text,
	"result" text,
	"start_time" timestamp,
	"end_time" timestamp,
	"recording_url" text,
	"zoom_user_id" text,
	"zoom_user_email" text,
	"raw_payload" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "service_interests" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"phone" text,
	"business_name" text,
	"service" text NOT NULL,
	"other_details" text,
	"source" text,
	"utm_campaign" text,
	"utm_source" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "visit_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text,
	"phone" text,
	"page_path" text NOT NULL,
	"full_url" text,
	"referrer" text,
	"user_agent" text,
	"ip_address" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "bank_statement_uploads" ADD CONSTRAINT "bank_statement_uploads_loan_application_id_loan_applications_id_fk" FOREIGN KEY ("loan_application_id") REFERENCES "public"."loan_applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_statement_uploads" ADD CONSTRAINT "bank_statement_uploads_lender_id_lenders_id_fk" FOREIGN KEY ("lender_id") REFERENCES "public"."lenders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lender_approvals" ADD CONSTRAINT "lender_approvals_loan_application_id_loan_applications_id_fk" FOREIGN KEY ("loan_application_id") REFERENCES "public"."loan_applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_applications" ADD CONSTRAINT "loan_applications_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_applications" ADD CONSTRAINT "loan_applications_referral_partner_id_partners_id_fk" FOREIGN KEY ("referral_partner_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_app_subs_email" ON "application_submissions" USING btree (LOWER("email"));--> statement-breakpoint
CREATE INDEX "idx_bsu_email" ON "bank_statement_uploads" USING btree (LOWER("email"));--> statement-breakpoint
CREATE INDEX "idx_bsu_created_at" ON "bank_statement_uploads" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_bud_business_email" ON "business_underwriting_decisions" USING btree (LOWER("business_email"));--> statement-breakpoint
CREATE INDEX "idx_bud_status" ON "business_underwriting_decisions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_bud_created_at" ON "business_underwriting_decisions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_lender_approvals_email" ON "lender_approvals" USING btree (LOWER("business_email"));--> statement-breakpoint
CREATE INDEX "idx_la_email" ON "loan_applications" USING btree (LOWER("email"));--> statement-breakpoint
CREATE INDEX "idx_la_created_at" ON "loan_applications" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_la_gigfi_status" ON "loan_applications" USING btree ("gigfi_status") WHERE gigfi_status IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_mp_business_email" ON "merchant_positions" USING btree (LOWER("business_email"));--> statement-breakpoint
CREATE INDEX "idx_mp_tier" ON "merchant_positions" USING btree ("tier");--> statement-breakpoint
CREATE INDEX "idx_mp_status" ON "merchant_positions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_visit_logs_email" ON "visit_logs" USING btree (LOWER("email"));--> statement-breakpoint
CREATE INDEX "idx_visit_logs_created_at" ON "visit_logs" USING btree ("created_at");