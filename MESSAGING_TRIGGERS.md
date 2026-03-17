# Automated Messaging Triggers

This document describes the automated SMS and email trigger system used to engage merchants throughout the loan application lifecycle.

## Architecture

```
routes.ts (event happens)
    ↓
messaging-triggers.ts (decides SMS + email content)
    ├── SMS → sms-middleware.ts → External middleware (Twilio)
    └── Email → Gmail API (via Replit connectors)
```

**Key files:**
- `server/messaging-triggers.ts` — Trigger logic, message templates, scheduled checks
- `server/sms-middleware.ts` — HTTP POST to external SMS middleware
- `client/src/pages/AutomatedTriggers.tsx` — Admin UI for toggling triggers

## Toggle System

Each trigger has a key in the `system_settings` table. The system uses an **opt-out model**: triggers are **enabled by default** unless explicitly set to `"false"`.

Toggles are cached in memory with a 60-second TTL to avoid hitting the database on every trigger fire. Admins manage toggles at `/automated-triggers` in the dashboard.

| Toggle Key | Description |
|---|---|
| `trigger.app_abandoned` | Application abandoned SMS + email |
| `trigger.approval_congratulations` | Approval congrats SMS + email |
| `trigger.funded_congratulations` | Funded congrats SMS + email |
| `trigger.bank_statements_reminder` | Bank statement reminder (scheduled) |
| `trigger.approval_stale_reminder` | Stale approval reminders at 24/48/72h (scheduled) |
| `trigger.scheduled_checks` | **Master toggle** — disables the entire 30-min background scan |
| `trigger.portal_after_intake` | Auto-send portal link after interest form |
| `trigger.portal_after_application` | Auto-send portal link after full application |

## Trigger Details

### 1. Application Abandoned

**When:** Called from `POST /api/applications/:id/abandon`

**Conditions:** Fires when a merchant leaves the application before completing it (e.g., before uploading bank statements).

**SMS:** Under 160 chars. Links to bank statement upload page.
- If abandoned on bank statements page: "Almost there! Upload your bank statements to get funded: {link}"
- Otherwise: "Finish your funding app & upload bank statements here: {link}"

**Email:** HTML email with CTA buttons for both "Upload Bank Statements" and "Complete Your Application".

---

### 2. Approval Congratulations

**When:** Called from `POST /api/underwriting-decisions` and `PATCH /api/underwriting-decisions/:id` when status = `approved`.

**SMS:** "Congrats! Approved for $X! Accept your offer: {booking link}"

**Email:** HTML email with approval amount, lender name (if available), and link to view/accept the offer via the approval letter URL.

---

### 3. Funded Congratulations

**When:** Called from the same underwriting decision endpoints when status = `funded`.

**SMS:** "Congrats! Your $X funding is complete! Funds arriving shortly. Reply w/ questions -TCG"

**Email:** HTML email with funding amount, next steps (deposit timeline, portal invite, rep availability).

---

### 4. Bank Statements Reminder (Scheduled)

**When:** Scheduled check runs every 30 minutes. Fires 2-3 hours after application creation if:
- Application is **not** completed (`isCompleted = false` and `isFullApplicationCompleted = false`)
- Merchant has a phone number
- No bank statements have been uploaded for that email

**SMS:** "Reminder: Upload your bank statements to move forward with funding: {link}"

**Email:** HTML email with upload CTA and option to reply with photos of statements.

**Dedup:** In-memory `Set` keyed by `app-incomplete:{applicationId}` prevents re-sending.

---

### 5. Stale Approval Reminders (Scheduled)

**When:** Scheduled check runs every 30 minutes. Fires at 24h, 48h, and 72h after approval for decisions with status = `approved`.

**Escalation:**

| Hours | SMS | Email Subject |
|---|---|---|
| 24h | "Your funding approval is waiting!" | "Reminder: Your $X funding offer is waiting!" |
| 48h | "Your funding offer won't last forever." | "Your $X funding offer won't last forever" |
| 72h | "Final reminder: Your funding approval expires soon!" | "Final reminder: Your $X funding approval is expiring soon" |

**Dedup:** In-memory `Set` keyed by `{decisionId}:{bucket}`. Each bucket (24/48/72) fires once per server lifecycle.

---

## Scheduled Check System

A background interval runs every **30 minutes** (first run 60 seconds after server start).

The master function `runScheduledTriggerChecks()` calls:
1. `checkStaleApprovals()` — Scans all underwriting decisions with status `approved`
2. `checkIncompleteApplications()` — Scans all incomplete loan applications

Both are guarded by the `trigger.scheduled_checks` master toggle. Each sub-trigger also has its own toggle.

**Important:** The dedup `Set` is in-memory only. Server restarts reset it, which could cause a one-time re-send for any active reminders that fall within their time window.

## SMS Middleware

All SMS messages are routed through an external middleware server via `fireSmsStageEvent()`:

- **Endpoint:** Configured via `SMS_MIDDLEWARE_URL` env var
- **Auth:** `X-Webhook-Secret` header with `SMS_WEBHOOK_SECRET`
- **Timeout:** 5 seconds
- **Behavior:** Non-blocking, fire-and-forget. Errors are logged but never thrown.

The `sms_body` field is passed in `metadata` so the middleware can send the exact message text.

### SMS Stage Names

| Stage | Trigger |
|---|---|
| `app_abandoned` | Application abandoned |
| `bank_statements_reminder` | Bank statement upload reminder |
| `approval_congratulations` | Approval issued |
| `approval_stale_reminder` | Stale approval follow-up |
| `funded_congratulations` | Deal funded |

## Email Delivery

Emails are sent via Gmail API using OAuth tokens from Replit connectors. All emails:
- Use a branded HTML template with Today Capital Group header/footer
- Include teal (#14B8A6) CTA buttons
- Are non-blocking (errors logged, never thrown)
- Are sent from the connected Gmail account

## Link Constants

| Purpose | SMS (bit.ly) | Full URL |
|---|---|---|
| Upload Statements | `bit.ly/4sqQzuR` | `https://app.todaycapitalgroup.com/upload-statements` |
| Application | `bit.ly/49KSVfH` | `http://app.todaycapitalgroup.com/` |
| Interest Form | `bit.ly/4qbbqAP` | `https://app.todaycapitalgroup.com/intake/quiz` |
| Book Appointment | `bit.ly/4aLcV3i` | `https://api.leadconnectorhq.com/widget/bookings/tcg-financing-appointment` |

SMS messages use bit.ly short links to stay under the 160-character limit.

## Adding a New Trigger

1. Add a toggle key to `TRIGGER_KEYS` in `messaging-triggers.ts`
2. Create an exported `async function trigger*()` that:
   - Checks `isTriggerEnabled(key)` first
   - Sends SMS via `fireSmsStageEvent()` with `sms_body` in metadata
   - Sends email via `sendTriggerEmail()` with `wrapEmailHtml()` template
3. Call the trigger from the appropriate route in `routes.ts`
4. Add the trigger config to the `TRIGGERS` array in `AutomatedTriggers.tsx`
5. If it's a scheduled trigger, add the check to `runScheduledTriggerChecks()`
