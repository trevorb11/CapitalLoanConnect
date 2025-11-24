# Today Capital Group MCA Loan Intake Form

## Overview

This project is a multi-step loan application intake form for Today Capital Group's Merchant Cash Advance (MCA) program. It guides users through a 5-step process to collect contact information, business details, financial data, funding requirements, and business address. The form features automatic saving, progress tracking, and integrates with a GoHighLevel CRM for lead management. The system also includes an agent dashboard and a dedicated agent view for reviewing applications, and tracks agent performance through specific routes. The business vision is to streamline the MCA loan application process, improve lead management efficiency, and provide agents with robust tools for tracking and processing applications.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

The frontend is built with React and TypeScript, using Vite for bundling. It leverages Shadcn UI (with Radix UI primitives) and Tailwind CSS for a consistent, accessible design. Form management is handled by React Hook Form with Zod for validation across a 5-step application process (Contact Info, Business Details, Financials, Funding, Address) and a 2-step Full Application. React Query manages server state, while Wouter handles client-side routing for the intake form, full application, success page, and agent views. A debounced auto-save feature persists form data, providing real-time feedback.

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
- Database tables: `plaid_items` (stores access tokens) and `funding_analyses` (stores calculated results).

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