# Today Capital Group MCA Loan Intake Form

## Overview

This is a multi-step loan application intake form for Today Capital Group's Merchant Cash Advance (MCA) program. The application guides users through a 5-step process to collect contact information, business details, financial data, funding requirements, and business address. The form features automatic saving, progress tracking, and integration with GoHighLevel CRM for lead management.

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

**Routing**: Wouter for lightweight client-side routing with two main routes:
- `/` - Main intake form
- `/success` - Completion confirmation page

**Auto-Save Pattern**: Debounced auto-save functionality that persists form data to the backend as users progress through steps. Visual feedback provided through an auto-save status indicator showing "saving", "saved", or "error" states.

### Backend Architecture

**Framework**: Express.js with TypeScript running on Node.js.

**API Design**: RESTful endpoints for loan application management:
- `GET /api/applications/:id` - Retrieve application by ID
- `POST /api/applications` - Create new application (returns existing incomplete application if user has one)
- `PUT /api/applications/:id` - Update existing application

**Storage Layer**: Abstracted storage interface (`IStorage`) with in-memory implementation (`MemStorage`). Designed to support future database integration with Drizzle ORM and PostgreSQL based on the Drizzle configuration present in the codebase.

**Session Persistence**: Applications are tracked by email address to allow users to resume incomplete applications. Application ID stored in localStorage on the client side.

### Database Schema

**ORM**: Drizzle ORM configured for PostgreSQL dialect.

**Main Table**: `loan_applications` with comprehensive fields including:
- Contact information (email, fullName, phone)
- Business details (businessName, businessType, industry, ein, timeInBusiness)
- Financial data (monthlyRevenue, averageMonthlyRevenue, creditScore)
- Loan information (requestedAmount, useOfFunds, hasOutstandingLoans, outstandingLoansAmount)
- Address details (businessAddress, city, state, zipCode)
- Metadata (currentStep, isCompleted, ghlContactId, createdAt, updatedAt)

**Validation**: Step-by-step Zod schemas derived from Drizzle schema using `drizzle-zod` for type-safe validation that matches database constraints.

### Design System

**Typography**: Inter font family loaded from Google Fonts, chosen for its professional, modern fintech aesthetic.

**Color System**: Implemented using CSS custom properties with HSL values for light mode. Neutral base colors with a primary blue accent (217 91% 35%) inspired by fintech platforms like Stripe and Plaid.

**Spacing**: Tailwind utility classes with consistent spacing scale (2, 4, 6, 8, 12, 16, 20).

**Layout**: Centered form container with max-width of 2xl (max-w-2xl), ensuring readability and focus. Progressive disclosure through multi-step form reduces cognitive load.

**Component Patterns**: Professional, restrained design with clear visual hierarchy. Each step features a large heading, descriptive subtext, and well-spaced form fields with adequate touch targets (h-12 inputs).

## External Dependencies

### Third-Party Services

**GoHighLevel CRM Integration**: 
- Service class (`GoHighLevelService`) handles contact creation and updates
- Requires `GHL_API_KEY` and `GHL_LOCATION_ID` environment variables
- Gracefully degrades if credentials not configured
- Syncs loan application data to CRM contacts with custom fields
- Stores GHL contact ID in loan application record for future reference

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