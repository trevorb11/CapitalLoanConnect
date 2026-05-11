# GigFi Submission Guide — Today Capital Group

This document describes how to take a TCG loan application and package it into a valid GigFi API submission. It is written for an LLM or automated process that has access to application data and needs to call the GigFi decision API.

---

## API Details

| Field | Value |
|---|---|
| **Endpoint** | `https://risk.bf9baa41.decide.taktile.com/run/api/v1/flows/gigfileads/decide` |
| **Method** | `POST` |
| **Content-Type** | `application/json` |
| **Auth** | Bearer token- GIGFI_API_KEY: fcaa4dea-c9b4-47f5-997d-69f534f6c370| GIGFI_ENVIRONMENT: live
| **Policy** | Policy 3 / GigFi Leads v1.2 |
| **Execution mode** | `sync` (response is immediate) |

---

## Payload Structure

```json
{
  "data": {
    "RefID": "TCG-{application-uuid}",
    "LeadProvider": "TodayCapital",
    "LeadAffiliate": "TodayCapital",
    "LeadCost": 0,
    "Firstname": "ELIZABETH",
    "Lastname": "MADDEN",
    "SSN": "405455928",
    "Email": "brightbeginningsdaycare23@gmail.com",
    "DOB": "1993-06-12",
    "Language": "e",
    "Military": "n",
    "HomeAddress": "1479 Old Madisonville Rd",
    "HomeCity": "Providence",
    "HomeState": "KY",
    "HomeZip": "42450",
    "CellPhone": "2708369709",
    "BankInfo": {
      "AccountToUse": "C"
    },
    "EmploymentInfo": {
      "MonthlyIncome": 25000,
      "PayFrequency": "2",
      "IncomeType": "5",
      "PayrollType": "3",
      "NextPayDay": "04/15/2026",
      "Employer": "Bright Beginnings Daycare",
      "EmploymentLength": 18
    },
    "LoanInfo": {
      "Amount": 20000
    },
    "ClientIPAddress": "174.51.29.59"
  },
  "metadata": {
    "entity_id": "TCG-{application-uuid}"
  },
  "control": {
    "execution_mode": "sync"
  }
}
```

---

## Always-Hardcoded Fields

These never change regardless of the applicant:

| Field | Value | Reason |
|---|---|---|
| `LeadProvider` | `"TodayCapital"` | TCG identity |
| `LeadAffiliate` | `"TodayCapital"` | TCG identity |
| `LeadCost` | `0` | No cost per lead |
| `Language` | `"e"` | English |
| `Military` | `"n"` | Not military |
| `BankInfo.AccountToUse` | `"C"` | Checking account |
| `EmploymentInfo.IncomeType` | `"5"` | Self-employed / business owner |
| `EmploymentInfo.PayrollType` | `"3"` | Check/direct deposit |
| `execution_mode` | `"sync"` | Synchronous decision |

---

## Field Mapping From Application Data

### Identity Fields

| GigFi Field | Source Field(s) | Notes |
|---|---|---|
| `RefID` | `id` | Format as `TCG-{id}` |
| `Firstname` | `full_name` | Split on last space; everything before = first name |
| `Lastname` | `full_name` | Last word in the name |
| `SSN` | `social_security_number` | Strip all non-digits — must be exactly 9 digits |
| `Email` | `email` | Use as-is |
| `DOB` | `date_of_birth` | Format: `YYYY-MM-DD` |
| `CellPhone` | `phone` | Strip all non-digits |

### Address Fields

Priority order — use the first one that has data:

1. `owner_address_1` → `HomeAddress`, `owner_city` → `HomeCity`, `owner_state` → `HomeState`, `owner_zip` → `HomeZip`
2. Parse `business_csz` (format: `"City, ST 12345"`) → split city / state / zip; use `business_street_address` for address

### Employment / Business Fields

| GigFi Field | Source / Logic |
|---|---|
| `Employer` | `legal_business_name` → `business_name` → `full_name` (last fallback) |
| `MonthlyIncome` | `average_monthly_revenue` → `monthly_revenue` → ask or estimate |
| `EmploymentLength` | Convert `time_in_business` (see table below) |
| `Amount` | `requested_amount` |

### Employment Length Conversion

| `time_in_business` value | `EmploymentLength` (months) |
|---|---|
| `"Less than 3 months"` | `2` |
| `"3-6 months"` | `4` |
| `"6-12 months"` | `9` |
| `"1-2 years"` | `18` |
| `"2-3 years"` | `30` |
| `"3-5 years"` | `48` |
| `"More than 5 years"` | `72` |
| Missing / unknown | `18` (safe default) |

### Pay Frequency Options

| `PayFrequency` value | Meaning |
|---|---|
| `"1"` | Weekly |
| `"2"` | Bi-weekly (default — use this when unknown) |
| `"3"` | Semi-monthly |
| `"4"` | Monthly |

### Next Pay Date

Format: `MM/DD/YYYY`

Use the next upcoming date that falls on a standard payday. For bi-weekly, the 1st and 15th of the month are safe defaults (e.g. `04/15/2026`). Always use a future date.

---

## Validation — Block Submission If Any of These Are True

| Condition | Why |
|---|---|
| SSN after stripping non-digits is not exactly 9 characters | GigFi will error |
| `date_of_birth` is missing | Required field |
| `date_of_birth` year is in the future or current year | Clearly invalid data (e.g. `2025-12-14`) — do not submit |
| `date_of_birth` results in age under 18 | Will be rejected |

---

## Data Cleanup Rules

### Name Splitting
```
full_name = "Elizabeth Madden"
→ Firstname = "Elizabeth", Lastname = "Madden"

full_name = "Willie HOPKINS"
→ Firstname = "Willie", Lastname = "HOPKINS"

full_name = "Debra M Wall"
→ Firstname = "Debra", Lastname = "M Wall"   ← middle initial stays with last name
```
Rule: split on the LAST space only. Everything left of the last space = Firstname.

### SSN Cleanup
```
"489-04-7034"  →  "489047034"   ✓
"489 04 7034"  →  "489047034"   ✓
"489047034"    →  "489047034"   ✓
"12345"        →  BLOCK — not 9 digits
```

### Phone Cleanup
```
"573-968-6134"  →  "5739686134"
"(573) 968-6134"  →  "5739686134"
```
Strip everything except digits.

### Business Name Fallback Chain
```
1. legal_business_name   (preferred — formal registered name)
2. business_name         (intake name)
3. full_name             (last resort — person applied under their own name)
```

### Monthly Revenue
- Use `average_monthly_revenue` if present (more reliable — calculated from statements)
- Fall back to `monthly_revenue` (self-reported)
- If both are missing, do not guess — flag for human review before submitting

### Address Fallback
If `owner_city` / `owner_state` / `owner_zip` are empty, parse from `business_csz`:
```
"Jefferson City , MO 65109"
→ city = "Jefferson City", state = "MO", zip = "65109"

Parse: split on comma → left side = city, right side split on space → [state, zip]
```

---

## Response Handling

```json
{
  "data": { "status": "ACCEPTED" },
  "metadata": {
    "decision_id": "019d4f91-036a-73ea-8490-318daa768dc4",
    "traffic_policy": "Policy 3",
    "version": "GigFi_Leads v1.2"
  }
}
```

| `status` | Meaning |
|---|---|
| `"ACCEPTED"` | GigFi will fund — retrieve `redirectUrl` from response if present and send to applicant |
| `"REJECTED"` | Declined under current policy — log the `decision_id` for records |
| HTTP error / no status | Submission failed — log full response body for debugging |

Always log the `decision_id` regardless of outcome. It is the only persistent record of the submission on GigFi's side.

---

## RefID Format

```
TCG-{application-uuid}
```

Example: `TCG-fa56d120-b4b0-4a08-9550-3f2925ae645c`

The `entity_id` in `metadata` must match `RefID` in `data` exactly.

---

## Known Edge Cases

| Situation | Handling |
|---|---|
| Applicant used their personal name as business name | Use name + "LLC" or just the name — GigFi accepts it |
| `business_csz` has garbled data (e.g. `"846 Leola Ave eVa aloEl 648"`) | Use the clean `business_csz` field instead — it's the structured version |
| Application has two addresses (owner vs business) | Always prefer owner/home address for `Home*` fields |
| `time_in_business` is empty | Default to `18` months (1-2 years) |
| Email has unusual casing (e.g. `Deenawall11@gmail.com`) | Use as-is — case doesn't matter for email |
| Application submitted under wrong/maiden name | Use the name exactly as in the application — GigFi cross-references identity |

---

## TCG Internal Submission Endpoint (Alternative to Direct API)

If operating within the TCG platform, you can POST to the internal route instead of calling GigFi directly:

```
POST /api/gigfi/submit
Content-Type: application/json
(requires active TCG session — admin, agent, or user role)
```

Body:
```json
{
  "applicationId": "fa56d120-b4b0-4a08-9550-3f2925ae645c",
  "firstName": "Debra",
  "lastName": "Aslanidis",
  "email": "DebraAslanidis@aol.com",
  "phone": "5739686134",
  "businessName": "Debra Aslanidis Photography LLC",
  "monthlyRevenue": 10000,
  "financingAmount": 25000,
  "businessAge": "1-2 years",
  "ssn": "489047034",
  "dob": "1990-06-11",
  "homeAddress": "135 Douglas Drive",
  "homeCity": "Jefferson City",
  "homeState": "MO",
  "homeZip": "65109",
  "payFrequency": "2",
  "nextPayDay": "04/15/2026"
}
```

The platform wraps this into the full GigFi payload, applies all hardcoded fields, and returns:
```json
{ "status": "ACCEPTED", "decisionId": "...", "redirectUrl": "..." }
{ "status": "REJECTED", "decisionId": "..." }
```

---

## External Program Integration — Pull Candidates + Report Results Back

This section is for external programs (scripts, automations, other services) that want to:
1. **Poll the TCG underwriting database** for newly declined or unqualified applications that are GigFi candidates
2. **Submit those applications to GigFi directly** (using the payload structure above)
3. **Report the result back to TCG** so it appears on the GigFi Submissions page

### Authentication

All external endpoints use Bearer token authentication. The token is the TCG admin password:

```
Authorization: Bearer <ADMIN_PASSWORD>
```

The admin password is the same one used to log into the TCG admin dashboard. Store it as a secret in your external system — never hardcode it.

---

### Step 1 — Pull Declined/Unqualified Candidates

```
GET https://app.todaycapitalgroup.com/api/gigfi/external/pending
Authorization: Bearer <ADMIN_PASSWORD>
```

**Optional query parameter:**

| Parameter | Default | Max | Description |
|---|---|---|---|
| `lookbackDays` | `30` | `365` | How many calendar days back to search for decisions |

**Example:**
```
GET /api/gigfi/external/pending?lookbackDays=14
```

**Response:**
```json
{
  "count": 3,
  "lookbackDays": 14,
  "decisions": [
    {
      "id": "uuid-of-decision-record",
      "businessEmail": "owner@example.com",
      "businessName": "Example LLC",
      "status": "declined",
      "declineReason": "Insufficient revenue",
      "createdAt": "2026-04-15T18:00:00.000Z",
      "applicationId": "fa56d120-b4b0-4a08-9550-3f2925ae645c",
      "applicationData": {
        "id": "fa56d120-b4b0-4a08-9550-3f2925ae645c",
        "email": "owner@example.com",
        "fullName": "Jane Smith",
        "businessName": "Example LLC",
        "legalBusinessName": "Example LLC DBA",
        "phone": "5551234567",
        "monthlyRevenue": "18000.00",
        "averageMonthlyRevenue": "17500.00",
        "requestedAmount": "50000.00",
        "timeInBusiness": "1-2 years",
        "socialSecurityNumber": "123456789",
        "dateOfBirth": "1985-03-22",
        "ownerAddress1": "123 Main St",
        "ownerCity": "Austin",
        "ownerState": "TX",
        "ownerZip": "78701",
        "businessStreetAddress": null,
        "businessCsz": null,
        "creditScore": "550 - 650"
      }
    }
  ]
}
```

**Filtering logic:**
- Only returns decisions with status `"declined"` or `"unqualified"`
- Only returns entries created within the `lookbackDays` window
- Only returns entries where the matching loan application has **not already been submitted to GigFi** (no existing `gigfiStatus` on record) — so you will never get duplicates
- If a decision has no matching loan application (e.g. they never filled out the full form), `applicationId` and `applicationData` will be `null` — skip these or handle separately

---

### Step 2 — Build the GigFi Payload

Use the `applicationData` fields from the response above to construct the GigFi payload per the **Field Mapping** section earlier in this document.

Key mappings from `applicationData`:

| GigFi Field | `applicationData` field |
|---|---|
| `RefID` | `"TCG-" + id` |
| `Firstname` / `Lastname` | Split `fullName` on last space |
| `SSN` | `socialSecurityNumber` (strip non-digits) |
| `Email` | `email` |
| `DOB` | `dateOfBirth` |
| `CellPhone` | `phone` (strip non-digits) |
| `Employer` | `legalBusinessName` → `businessName` |
| `MonthlyIncome` | `averageMonthlyRevenue` → `monthlyRevenue` |
| `EmploymentLength` | Convert `timeInBusiness` (see conversion table) |
| `Amount` | `requestedAmount` |
| `HomeAddress` | `ownerAddress1` → parse from `businessStreetAddress` |
| `HomeCity` | `ownerCity` → parse from `businessCsz` |
| `HomeState` | `ownerState` → parse from `businessCsz` |
| `HomeZip` | `ownerZip` → parse from `businessCsz` |

Always run validation before submitting (SSN = 9 digits, DOB present and valid, age ≥ 18).

---

### Step 3 — Report the Result Back to TCG

After receiving a response from GigFi, call this endpoint to record the result. This makes the submission appear on the **GigFi Submissions** page in the TCG admin dashboard immediately.

```
POST https://app.todaycapitalgroup.com/api/gigfi/external/record
Authorization: Bearer <ADMIN_PASSWORD>
Content-Type: application/json
```

**Body — by Application ID (preferred if you have it):**
```json
{
  "applicationId": "fa56d120-b4b0-4a08-9550-3f2925ae645c",
  "status": "ACCEPTED",
  "decisionId": "019d4f91-036a-73ea-8490-318daa768dc4",
  "redirectUrl": "https://gigfi.app/apply/..."
}
```

**Body — by Email (if you only have the email):**
```json
{
  "email": "owner@example.com",
  "status": "REJECTED",
  "decisionId": "019d4f91-036a-73ea-8490-318daa768dc4"
}
```

| Field | Required | Notes |
|---|---|---|
| `applicationId` | Either this or `email` | UUID from Step 1 response. Takes precedence if both provided. |
| `email` | Either this or `applicationId` | Will find the most recent unsubmitted application for this email |
| `status` | Yes | Must be `"ACCEPTED"`, `"REJECTED"`, or `"ERROR"` (case-insensitive) |
| `decisionId` | Recommended | The `decision_id` from the GigFi response metadata |
| `redirectUrl` | If ACCEPTED | The redirect URL from GigFi for accepted applicants |

**Response (success):**
```json
{ "ok": true, "applicationId": "fa56d120-b4b0-4a08-9550-3f2925ae645c" }
```

**Response (not found):**
```json
{
  "error": "No un-submitted application found for that email. It may already have a GigFi result recorded, or may not exist in the database."
}
```

---

### Complete External Workflow (Pseudocode)

```python
import requests

BASE_URL = "https://app.todaycapitalgroup.com"
HEADERS = {
  "Authorization": f"Bearer {ADMIN_PASSWORD}",
  "Content-Type": "application/json"
}

# 1. Pull candidates added in the last 14 days
resp = requests.get(f"{BASE_URL}/api/gigfi/external/pending?lookbackDays=14", headers=HEADERS)
candidates = resp.json()["decisions"]

for candidate in candidates:
  app = candidate.get("applicationData")
  if not app:
    continue  # No linked application — skip

  # 2. Validate required fields
  ssn = (app.get("socialSecurityNumber") or "").replace("-", "").replace(" ", "")
  dob = app.get("dateOfBirth")
  if len(ssn) != 9 or not dob:
    continue  # Skip — missing required GigFi fields

  # 3. Build GigFi payload (see Field Mapping section)
  name_parts = app["fullName"].rsplit(" ", 1)
  payload = {
    "data": {
      "RefID": f"TCG-{app['id']}",
      "LeadProvider": "TodayCapital",
      "LeadAffiliate": "TodayCapital",
      "LeadCost": 0,
      "Firstname": name_parts[0],
      "Lastname": name_parts[1] if len(name_parts) > 1 else name_parts[0],
      "SSN": ssn,
      "Email": app["email"],
      "DOB": dob,
      "Language": "e",
      "Military": "n",
      "HomeAddress": app.get("ownerAddress1", ""),
      "HomeCity": app.get("ownerCity", ""),
      "HomeState": app.get("ownerState", ""),
      "HomeZip": app.get("ownerZip", ""),
      "CellPhone": "".join(filter(str.isdigit, app.get("phone", ""))),
      "BankInfo": { "AccountToUse": "C" },
      "EmploymentInfo": {
        "MonthlyIncome": float(app.get("averageMonthlyRevenue") or app.get("monthlyRevenue") or 0),
        "PayFrequency": "2",
        "IncomeType": "5",
        "PayrollType": "3",
        "NextPayDay": "05/01/2026",  # next upcoming pay date
        "Employer": app.get("legalBusinessName") or app.get("businessName") or app["fullName"],
        "EmploymentLength": 18       # convert timeInBusiness — see conversion table
      },
      "LoanInfo": { "Amount": float(app.get("requestedAmount") or 10000) }
    },
    "metadata": { "entity_id": f"TCG-{app['id']}" },
    "control": { "execution_mode": "sync" }
  }

  # 4. Submit to GigFi
  gigfi_resp = requests.post(
    "https://risk.bf9baa41.decide.taktile.com/run/api/v1/flows/gigfileads/decide",
    json=payload,
    headers={"Authorization": f"Bearer {GIGFI_API_KEY}"}
  )
  gigfi_data = gigfi_resp.json()
  gigfi_status = gigfi_data.get("data", {}).get("status", "ERROR")
  decision_id = gigfi_data.get("metadata", {}).get("decision_id")
  redirect_url = gigfi_data.get("data", {}).get("redirectUrl")

  # 5. Report result back to TCG (shows up on GigFi Submissions page)
  requests.post(
    f"{BASE_URL}/api/gigfi/external/record",
    json={
      "applicationId": app["id"],
      "status": gigfi_status,
      "decisionId": decision_id,
      "redirectUrl": redirect_url,
    },
    headers=HEADERS
  )
```

---

### Status Values Reference

| `status` value in TCG | Meaning |
|---|---|
| `"ACCEPTED"` | GigFi approved — `redirectUrl` is available for the applicant |
| `"REJECTED"` | GigFi declined — log `decisionId` for records |
| `"ERROR"` | Submission failed or GigFi returned no status |

Once recorded, the result is visible on the **GigFi Submissions** page in the TCG admin dashboard and is deduplicated — submitting the same email again via `/api/gigfi/external/pending` will not return that applicant again.


### Accessing the Application Dashboard:

There are two separate systems built for remote Claude access. Here's the full spec for both:

1. Claude Admin Data API (REST)
Base URL: https://app.todaycapitalgroup.com
Auth: Header X-Claude-API-Key: <value of CLAUDE_API_KEY env var>

Method	Endpoint	Description
GET	/api/admin/claude/ping	Auth test — confirms the key works
GET	/api/admin/claude/context	Full system context: schema descriptions, table row counts, business logic summary, all endpoint docs
GET	/api/admin/claude/table/:tableName	Read any table. Params: limit (max 500), offset, orderBy, order, search
POST	/api/admin/claude/sql	Run a read-only SELECT/WITH/EXPLAIN query. Body: { query, params[] }
POST	/api/admin/claude/mutate	Run an UPDATE/INSERT/DELETE. Body: { sql, params[] }. DDL blocked.
POST	/api/admin/claude/upsert/:tableName	Convenience update. Body: { where: {col: val}, set: {col: val} }
Readable tables: loan_applications, business_underwriting_decisions, bank_statement_uploads, lender_approvals, lenders, partners, merchant_messages, merchant_portal_accounts, merchant_financial_insights, merchant_plaid_connections, plaid_items, plaid_statements, funding_analyses, congratulations_uploads, visit_logs, bot_attempts, system_settings, users

Writable tables: loan_applications, business_underwriting_decisions, bank_statement_uploads, lender_approvals, lenders, partners, merchant_messages, merchant_financial_insights, system_settings

2. MCP Server (Claude Desktop / SSE)
Auth: Header Authorization: Bearer <value of MCP_API_KEY env var> (or ?key= query param)

Method	Endpoint	Description
GET	/api/mcp/health	No auth required. Health check.
GET	/api/mcp	SSE connection endpoint — Claude Desktop connects here
POST	/api/mcp/message?sessionId=...	Message endpoint — Claude posts messages here after connecting
MCP Tools exposed:

list_loan_applications — list/search/filter all applications
get_loan_application — fetch single app by ID or email
update_loan_application_status — update status + notes
list_lender_approvals — list/filter approvals
get_lender_approval — fetch single approval by ID or business name
list_bank_statement_uploads — list uploads, filter by email
get_database_stats — counts across all key tables
ghl_search_contact — find a GHL contact by email/phone/business
ghl_get_opportunities — get deals for a GHL contact
ghl_get_opportunity — get a single GHL opportunity
ghl_update_opportunity — update custom fields on a GHL opportunity
ghl_sync_approval_to_opportunity — sync a DB approval record into GHL
Two separate API keys are needed — CLAUDE_API_KEY for the REST admin API and MCP_API_KEY for the MCP server. Both are environment secrets in the project.


❯ CLAUDE_API_KEY - claude_99efff1a004422bdb67acf3f345f8a20e4fe8c29a734a82c132b2500d9fbd4bf