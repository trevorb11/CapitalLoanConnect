# Today Capital Group MCA Loan Intake Form

## Overview

This is a multi-step loan application intake form for Today Capital Group's Merchant Cash Advance (MCA) program. The application guides users through a 5-step process to collect contact information, business details, financial data, funding requirements, and business address. The form features automatic saving, progress tracking, and integration with GoHighLevel CRM for lead management.

## Recent Changes

### Critical Storage Bug Fix (November 20, 2025)
- **Issue**: Agent view was not displaying most business information fields (only EIN, Business Email, and Industry were showing)
- **Root Cause**: The `createLoanApplication` method in `server/storage.ts` was using an explicit hardcoded field list that only included OLD fields, ignoring new fields added for FullApplication
- **Fields That Were Being Ignored**:
  - legalBusinessName, doingBusinessAs, companyWebsite, businessStartDate
  - stateOfIncorporation, doYouProcessCreditCards
  - businessStreetAddress, businessCsz, companyEmail
  - And all other newly added schema fields
- **Fix Applied**: Changed from explicit field list to spread operator pattern:
  ```typescript
  // Spread all fields first, then apply required defaults
  .values({
    ...insertApplication,
    email: insertApplication.email ?? "",
    currentStep: insertApplication.currentStep ?? 1,
    isCompleted: insertApplication.isCompleted ?? false,
  })
  ```
- **Impact**: All current and future schema fields are now automatically saved during application creation

### Agent View Field Mapping Fix (November 20, 2025)
- **Additional Fix**: Agent view HTML was using incorrect field names for display
- **Fixed Field Mappings**:
  - Business Email: Now correctly reads from `companyEmail` field
  - Business Address: Now correctly reads from `businessStreetAddress` field
  - City/State/ZIP: Added parser for combined `businessCsz` format ("City, ST 12345")
  - Owner Address: Added parser for combined `ownerCsz` format
  - Owner Information: Added fallbacks for `ownerSsn`, `ownerDob`, `personalCreditScoreRange`, `ownerPercentage`
- **Agent View URL**: Changed from absolute URLs to relative paths (`/agent/application/:id`) to work in all environments
- **Dual Form Support**: Both "/" (IntakeForm) and "/application" (FullApplication) now generate agent view URLs when completed

### Dashboard Implementation (November 20, 2025)
- Created comprehensive agent dashboard at `/dashboard` route
- Features: Real-time search, filtering (All/Intake/Full), stats overview, application cards
- Displays application details with "View Application" button for accessing agent view URLs
- Full data-testid coverage for automated testing

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript, using Vite as the build tool and development server.

**UI Component Library**: Shadcn UI with Radix UI primitives for accessible, unstyled components. Uses the "new-york" style variant with a neutral color scheme and Tailwind CSS for styling.

**Form Management**: React Hook Form with Zod for validation. The application is split into 5 distinct steps, each with its own form instance and validation schema:
- Step 1: Contact Information (email, name, phone)
- Step 2: Business Details (business name, type, industry, EIN, time in business)
- Step 3: Financial Information (monthly revenue, credit score, outstanding loans)
- Step 4: Funding Request (requested amount, use of funds)
- Step 5: Business Address (street address, city, state, zip code)

**State Management**: React Query (@tanstack/react-query) for server state management and API interactions. Local state managed with React hooks for form steps and auto-save status.

**Routing**: Wouter for lightweight client-side routing with four main routes:
- `/` - 5-step initial intake form
- `/application` - 2-step Full Application form (dark gradient design)
- `/success` - Completion confirmation page
- `/agent/application/:id` - Agent view for completed applications (no authentication)

**Auto-Save Pattern**: Debounced auto-save functionality that persists form data to the backend as users progress through steps. Visual feedback provided through an auto-save status indicator showing "saving", "saved", or "error" states.

### Backend Architecture

**Framework**: Express.js with TypeScript running on Node.js.

**API Design**: RESTful endpoints for loan application management:
- `GET /api/applications/:id` - Retrieve application by ID
- `POST /api/applications` - Create new application (returns existing incomplete application if user has one)
- `PATCH /api/applications/:id` - Update existing application
- `GET /api/applications` - Get all applications (admin/debugging)
- `GET /agent/application/:id` - Serve agent view HTML page
- `GET /api/applications/:id/view` - Get application data for agent view (no auth required)

**Integration Flow**:
1. User completes intake form → Creates application in database → Syncs to GHL API
2. User completes full application → Updates database → Syncs to GHL API → Triggers webhooks (non-blocking) → Generates agent view URL
3. Webhooks fire in background without blocking user response
4. Agent view URL generated for sharing with loan officers

**Storage Layer**: Abstracted storage interface (`IStorage`) with in-memory implementation (`MemStorage`). Designed to support future database integration with Drizzle ORM and PostgreSQL based on the Drizzle configuration present in the codebase.

**Session Persistence**: Applications are tracked by email address to allow users to resume incomplete applications. Application ID stored in localStorage on the client side.

### Database Schema

**ORM**: Drizzle ORM configured for PostgreSQL dialect.

**Main Table**: `loan_applications` with comprehensive fields including:
- Contact information (email, fullName, phone, companyEmail)
- Business details (businessName, businessType, industry, ein, timeInBusiness, legalBusinessName, doingBusinessAs, companyWebsite, businessStartDate, businessCsz, businessStreetAddress)
- Financial data (monthlyRevenue, averageMonthlyRevenue, creditScore, personalCreditScoreRange, mcaBalance, mcaBalanceAmount)
- Loan information (requestedAmount, useOfFunds, hasOutstandingLoans, outstandingLoansAmount)
- Owner information (ownerFullName, ownerSsn, ownerCsz, ownerPercentage, ownerDob)
- Address details (businessAddress, city, state, zipCode)
- Metadata (currentStep, isCompleted, isFullApplicationCompleted, ghlContactId, agentViewUrl, createdAt, updatedAt)

**Validation**: Step-by-step Zod schemas derived from Drizzle schema using `drizzle-zod` for type-safe validation that matches database constraints.

### Design System

**Typography**: Inter font family loaded from Google Fonts, chosen for its professional, modern fintech aesthetic.

**Color System**: Implemented using CSS custom properties with HSL values for light mode. Neutral base colors with a primary blue accent (217 91% 35%) inspired by fintech platforms like Stripe and Plaid.

**Full Application Design**: Dark gradient aesthetic (#192F56 to #19112D) with 2-step structure:
- Step 1: Business Information (legal name, DBA, website, start date, EIN, location, revenue, credit, MCA balance)
- Step 2: Owner Information (name, SSN, location, ownership %, date of birth)
- Includes consent checkbox and data validation
- Success screen with agent view shareable URL

**Spacing**: Tailwind utility classes with consistent spacing scale (2, 4, 6, 8, 12, 16, 20).

**Layout**: Centered form container with max-width of 2xl (max-w-2xl), ensuring readability and focus. Progressive disclosure through multi-step form reduces cognitive load.

**Component Patterns**: Professional, restrained design with clear visual hierarchy. Each step features a large heading, descriptive subtext, and well-spaced form fields with adequate touch targets (h-12 inputs).

## External Dependencies

### Third-Party Services

**GoHighLevel CRM Integration**: 
- Service class (`GoHighLevelService`) handles contact creation, updates, and webhook submissions
- Requires `GHL_API_KEY` and `GHL_LOCATION_ID` environment variables
- **Two-tier integration approach**:
  - **API Integration**: Creates/updates contacts in GHL using Private Integration Token
  - **Webhook Integration**: Triggers GHL workflows via webhook endpoints (fire-and-forget, non-blocking)
- Webhooks sent to both primary GHL endpoint and backup Google Sheets endpoint
- Gracefully degrades if credentials not configured
- Syncs loan application data to CRM contacts with custom fields
- Stores GHL contact ID in loan application record for future reference
- **Security**: Webhook URLs stored server-side in environment variables, never exposed to browser

**GoHighLevel Field Mappings**:

*Standard Contact Fields* (built-in to GHL):
- `businessName` → `contact.company_name`
- `industry` → `contact.industry`
- `businessAddress` → `contact.address1`
- `city` → `contact.city`
- `state` → `contact.state`
- `zipCode` → `contact.postal_code`

*Custom Fields* (require setup in GHL):
- `ein` → `contact.ein`
- `timeInBusiness` → `contact.time_in_business_years`
- `businessType` → `contact.business_type`
- `ownership` → `contact.ownership_percentage`
- `monthlyRevenue` → `contact.monthly_revenue_usd`
- `averageMonthlyRevenue` → `contact.monthly_revenue_approx`
- `creditScore` → `contact.personal_credit_score`
- `hasOutstandingLoans` → `contact.has_outstanding_loans`
- `outstandingLoansAmount` → `contact.outstanding_loans_amount`
- `requestedAmount` → `contact.amount_requested`
- `useOfFunds` → `contact.purpose_of_funds`
- `currentStep` → `contact.application_current_step`
- `isCompleted` → `contact.application_status`

### Database

**Neon Database**: Configured for serverless PostgreSQL via `@neondatabase/serverless` driver. Connection string expected in `DATABASE_URL` environment variable.

### UI Dependencies

**Radix UI**: Comprehensive set of unstyled, accessible React components for all interactive elements (dialogs, dropdowns, forms, etc.)

**Tailwind CSS**: Utility-first CSS framework with custom configuration for the design system

**Lucide React**: Icon library for consistent iconography throughout the application

### Development Tools

**Vite**: Fast development server with HMR and optimized production builds

**Replit Plugins**: Development-specific plugins for runtime error overlay, cartographer, and dev banner (only in development mode)