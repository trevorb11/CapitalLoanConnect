# GigFi Submission Guide — Today Capital Group

This document describes how to take a TCG loan application and package it into a valid GigFi API submission. It is written for an LLM or automated process that has access to application data and needs to call the GigFi decision API.

---

## API Details

| Field | Value |
|---|---|
| **Endpoint** | `https://risk.bf9baa41.decide.taktile.com/run/api/v1/flows/gigfileads/decide` |
| **Method** | `POST` |
| **Content-Type** | `application/json` |
| **Auth** | Bearer token (set in server environment as `GIGFI_API_KEY`) |
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
