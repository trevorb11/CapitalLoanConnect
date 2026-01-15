# Today Capital Group MCA Loan Intake Form

## Overview

This project provides a multi-step loan application intake form for Today Capital Group's Merchant Cash Advance (MCA) program. It streamlines the application process, collects essential user data across five steps, and integrates with a GoHighLevel CRM for efficient lead management. The system also includes an agent dashboard and specific views for application review and agent performance tracking. The primary goal is to enhance lead management efficiency and equip agents with robust tools for processing applications.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

The frontend is a React and TypeScript application utilizing Vite, Shadcn UI, and Tailwind CSS for a consistent design. It features a 5-step application process managed by React Hook Form with Zod validation. React Query handles server state, and Wouter manages client-side routing for various application flows, including a full application, quiz, retargeting pages, and agent-specific views. A debounced auto-save feature ensures data persistence. Key variations include a one-question-per-slide "Homepage" application and a two-page "Agent Application" format. Additional features include a marketing landing page, an 8-step quiz form with branching logic, a "complete application" retargeting page with agent attribution, an application status checker, and a standalone bank statement upload page.

### Backend Architecture

The backend is an Express.js application in TypeScript, providing RESTful APIs for loan application management. It integrates with GoHighLevel CRM using a two-tier API and webhook approach for contact creation and updates. The system generates agent-specific URLs and attributes applications to agents. The storage layer is designed to be pluggable, currently in-memory, but with planned integration with Drizzle ORM and PostgreSQL.

### Database Schema

The database schema, defined using Drizzle ORM for PostgreSQL, includes:
- `loan_applications`: Stores comprehensive application data, including contact, business, financial, and owner information, as well as application status, GHL contact ID, and agent view URL.
- `plaid_items`: Stores Plaid access tokens and institution data for bank connections.
- `funding_analyses`: Stores calculated funding analysis results like monthly revenue and funding recommendations.

### Design System

The application uses the Inter font and a HSL-based color system with a primary blue accent. Tailwind CSS manages spacing, and layout focuses on a centered, max-width form container. The Full Application features a dark gradient design.

## External Dependencies

### Third-Party Services

**GoHighLevel CRM Integration**:
- Manages contact creation, updates, and webhook submissions.
- Field mapping includes application details, business details, survey information, owner info, UTM parameters, and additional fields.
- Handles duplicate contacts by searching existing records by email and phone.
- Employs a 3-tier tagging system for application status ("App Started", "lead-source-website" + "interest form", "application complete").

**Google Sheets Integration**:
- Syncs lender approval data from a specified Google Sheet hourly.
- Displays approvals in the dashboard, grouped by business or lender.
- Supports status tracking and row deduplication.

**Plaid Integration**:
- Provides instant funding eligibility analysis via bank account connections.
- Stores access tokens and analyzes transaction history for financial metrics.
- Automatically links applications to Plaid items via email matching.

**Google reCAPTCHA v3 Integration**:
- Provides invisible bot protection on all application forms (QuizIntake, FullApplication, AgentApplication).
- Verifies tokens on final form submissions only, with a score threshold of 0.5.

**Google Analytics (gtag.js) Integration**:
- Tracks custom events such as `application_submitted`, `intake_form_submitted`, `form_step_completed`, `bank_connected`, `bank_statement_uploaded`, and `form_abandoned`.

### Database

**Neon Database**:
- Configured for serverless PostgreSQL.

### UI Dependencies

- **Radix UI**: Unstyled, accessible React components.
- **Tailwind CSS**: Utility-first CSS framework.
- **Lucide React**: Icon library.

### Rep Console

An internal tool for sales representatives and admins to view comprehensive GoHighLevel CRM contact information. Features include:
- **Contact360 View**: Unified display of contact info, deals, tasks, notes, conversations, and lender approvals.
- **Two Search Modes**: Direct search by email/phone/business name and AI Smart Search using natural language queries.
- **AI-Powered Query Parsing**: Utilizes OpenAI to convert natural language into GHL search filters.
- **Authentication**: Requires admin or agent role.