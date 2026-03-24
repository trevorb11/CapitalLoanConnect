# Sitemap

This document provides a full reference for every page and route in the platform, organized by section.

---

## Public & Merchant-Facing

| Route | Description | Access Level |
|-------|-------------|--------------|
| `/` | Full loan application | Public |
| `/intake` | Intake landing page | Public |
| `/intake/quiz` | Quiz-style intake form | Public |
| `/funding-quiz` | Interactive funding quiz for lead generation | Public |
| `/check-status` | Application status tracker | Public |
| `/connect-bank` | Plaid bank account connection | Public |
| `/upload-statements` | Manual bank statement PDF upload | Public |
| `/congratulations` | Approval success page with document upload | Public |
| `/success` | General post-submission success page | Public |
| `/sba` | SBA loan landing page | Public |
| `/sig` | Simplified signature application | Public |
| `/approved/:slug` | Shareable public approval letter | Public |

---

## Source-Tracked Intake Routes

All routes in this section are public and used for marketing attribution tracking. Each channel has a canonical path and a short alias that renders the same page.

| Route | Alias | Description | Access Level |
|-------|-------|-------------|--------------|
| `/intake/google-ads` | `/gga` | Google Ads source-tracked intake form | Public |
| `/intake/email` | `/email` | Email campaign source-tracked intake form | Public |
| `/intake/social-media` | `/social` | Social media source-tracked intake form | Public |
| `/intake/website` | `/site` | Website source-tracked intake form | Public |
| `/intake/blog` | `/blog` | Blog source-tracked intake form | Public |
| `/intake/referral` | `/ref` | Referral source-tracked intake form | Public |
| `/intake/direct` | `/direct` | Direct source-tracked intake form | Public |
| `/intake/reddit` | `/rddt` | Reddit source-tracked intake form | Public |

---

## Merchant Portal

| Route | Description | Access Level |
|-------|-------------|--------------|
| `/merchant` | Merchant main dashboard | Merchant (login required) |
| `/merchant/activate` | First-time account activation | Merchant |
| `/merchant/reset-password` | Password recovery | Merchant |

---

## Admin & Rep Console

| Route | Description | Access Level |
|-------|-------------|--------------|
| `/dashboard` | Admin login and overview | Admin |
| `/rep-console` | Main CRM/Pipeline view | Admin, Rep |
| `/rep-console/:contactId` | Individual contact detail view | Admin, Rep |
| `/lead-sources` | Lead source performance analytics | Admin |
| `/approvals` | Approved deals list | Admin, Rep |
| `/declines` | Declined deals list | Admin, Rep |
| `/unqualified` | Unqualified leads list | Admin, Rep |
| `/funded` | Successfully funded deals | Admin, Rep |
| `/messaging` | Centralized merchant messaging | Admin, Rep |
| `/triggers` | Automated SMS/Email trigger configuration | Admin |
| `/leaderboard` | Rep/agent performance stats | Admin |
| `/internal-upload` | Admin tool to upload statements on behalf of merchants | Admin |

---

## Agent & Partner Pages

| Route | Description | Access Level |
|-------|-------------|--------------|
| `/:initials` | Rep-specific custom landing page (e.g. `/dl` for Dillon LeBlanc) | Public |
| `/agents` | Agent directory | Public |
| `/partner` | Referral partner dashboard | Partner (login required) |
| `/apply/:slug` | Partner-branded application page | Public |
| `/r/:code` | Partner referral link landing page | Public |
