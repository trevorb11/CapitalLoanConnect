# Today Capital Group MCA Loan Intake Form

## Overview

This project is a multi-step loan application intake form for Today Capital Group's Merchant Cash Advance (MCA) program. It guides users through a 5-step process to collect contact information, business details, financial data, funding requirements, and business address. The form features automatic saving, progress tracking, and integrates with a GoHighLevel CRM for lead management. The system also includes an agent dashboard and a dedicated agent view for reviewing applications, and tracks agent performance through specific routes. The business vision is to streamline the MCA loan application process, improve lead management efficiency, and provide agents with robust tools for tracking and processing applications.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

The frontend is built with React and TypeScript, using Vite for bundling. It leverages Shadcn UI (with Radix UI primitives) and Tailwind CSS for a consistent, accessible design. Form management is handled by React Hook Form with Zod for validation across a 5-step application process (Contact Info, Business Details, Financials, Funding, Address) and a 2-step Full Application. React Query manages server state, while Wouter handles client-side routing for the intake form, full application, success page, and agent views. A debounced auto-save feature persists form data, providing real-time feedback.

**Application Form Variants:**
- **Homepage (FullApplication)**: One-question-per-slide format with smooth transitions
- **Agent Routes (AgentApplication)**: Two-page format (Step 1: Business Info, Step 2: Owner Info + Signature) for agent-specific URLs like /DL, /GD, etc.

**Additional Pages:**
- **/intake**: Marketing landing page promoting financing solutions with hero section (stats), benefits cards, funding options comparison, 4-step process explanation, and CTAs directing users to the quiz form.
- **/intake/quiz**: Quiz-style 5-step intake form with slider for financing amount, radio selections for business age/revenue/credit score, and contact info. Submits to GHL and redirects to full application page.
- **/complete-application**: Retargeting landing page for leads who completed the intake form but haven't filled out the full application. Features progress indicator, benefits of completing, FAQ section, testimonials, and multiple CTAs directing to the full application.
- **/upload-statements**: Standalone bank statement upload page (no Plaid integration) for manual PDF uploads while Plaid is in sandbox mode. Features drag-and-drop, multi-file support, and success confirmation.

**Dashboard Stats:**
- "Banks Connected" counter includes both Plaid connections and uploaded bank statement PDFs.

### Backend Architecture

The backend is an Express.js application written in TypeScript, providing RESTful APIs for loan application management (create, retrieve, update). It integrates with GoHighLevel CRM for contact creation, updates, and webhook submissions, designed with a two-tier API and webhook approach. The system generates agent view URLs and allows for agent attribution via specific routes. The storage layer uses an abstracted interface, currently in-memory, but designed for future Drizzle ORM and PostgreSQL integration. Application progress is persistent, allowing users to resume incomplete applications via localStorage.

### Database Schema

The database schema, defined using Drizzle ORM for PostgreSQL, includes:
- `loan_applications` table: Stores comprehensive data covering contact information, business details, financial data, loan requests, owner information, address details, and base64-encoded applicant signatures. Metadata fields track current step, completion status, GHL contact ID, and agent view URL.
- `plaid_items` table: Stores Plaid access tokens and institution information for bank connections.
- `funding_analyses` table: Stores calculated funding analysis results including monthly revenue, average balance, and funding recommendations (SBA, LOC, MCA).
- Validation uses Zod schemas derived from the Drizzle schema.

### Design System

The application uses the Inter font from Google Fonts and a color system based on CSS custom properties with HSL values, featuring a primary blue accent for a modern fintech aesthetic. The Full Application utilizes a dark gradient design. Spacing is managed with Tailwind utility classes, and layout features a centered form container with a maximum width for readability. Component patterns emphasize a professional, clear visual hierarchy with well-spaced form fields.

## External Dependencies

### Third-Party Services

**GoHighLevel CRM Integration**:
- Manages contact creation, updates, and webhook submissions.
- Requires `GHL_API_KEY` and `GHL_LOCATION_ID` environment variables.
- Syncs various loan application fields to standard and custom GHL contact fields (e.g., `businessName` to `company_name`, `ein` to `contact.ein`).
- Supports both direct API integration and webhook-based workflow triggers.

**Plaid Integration**:
- Provides instant funding eligibility analysis by connecting to business bank accounts.
- Requires `PLAID_CLIENT_ID`, `PLAID_SECRET`, and `PLAID_ENV` (sandbox/development/production) environment variables.
- Uses Plaid Link widget for secure bank connection.
- Analyzes transaction history to calculate monthly revenue, average balance, and funding recommendations.
- Stores access tokens for future statement retrieval (for lender submissions).
- Bank statements are viewable on demand from the Dashboard via "View Statements" button.
- Applications are automatically linked to Plaid items via email matching when users connect their bank.
- Database tables: `plaid_items` (stores access tokens) and `funding_analyses` (stores calculated results).
- Schema field `plaidItemId` on loan_applications links to connected bank data.

**Google reCAPTCHA v3 Integration**:
- Provides invisible bot protection on all application forms without user friction.
- Requires `VITE_RECAPTCHA_SITE_KEY` (frontend) and `RECAPTCHA_SECRET_KEY` (backend) environment variables.
- Tokens generated on final form submissions only (not during auto-save).
- Backend verification uses fail-closed security: rejects submissions if verification fails or service is unavailable.
- Score threshold of 0.5 filters potential bots while allowing legitimate users.
- Forms protected: QuizIntake, FullApplication, AgentApplication.

**Google Analytics (gtag.js) Integration**:
- Tracking ID: `G-CR5Q49Y3J5`
- Embedded in `client/index.html` for all pages.
- Custom events tracked:
  - `application_submitted`: Full application or agent application completed (with `application_type`, `agent_code`, `business_name`, `requested_amount`)
  - `intake_form_submitted`: Quiz intake form completed (with `requested_amount`, `credit_score`, `time_in_business`, `monthly_revenue`)
  - `form_step_completed`: Individual form step progression (with `form_type`, `step_number`, `step_name`)
  - `page_view`: Enhanced page view tracking with custom page paths and titles
  - `bank_connected`: Plaid bank connection success
  - `bank_statement_uploaded`: Manual bank statement upload
  - `form_abandoned`: Form abandonment with last step reached
- Analytics utility functions in `client/src/lib/analytics.ts` for type-safe event tracking from React components.

### Database

**Neon Database**:
- Configured for serverless PostgreSQL using `@neondatabase/serverless` driver.
- Requires `DATABASE_URL` environment variable.

### UI Dependencies

**Radix UI**: Unstyled, accessible React components.
**Tailwind CSS**: Utility-first CSS framework.
**Lucide React**: Icon library.

### Development Tools

**Vite**: Fast development server and build tool.