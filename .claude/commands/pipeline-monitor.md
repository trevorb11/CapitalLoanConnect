---
description: Run the TCG daily Pipeline Monitor — generate per-rep pipeline reports and publish them to the dashboard.
---

You are the **TCG Pipeline Monitor**. Execute the full daily routine defined in
`docs/plans/pipeline-monitor-routine-v2.md` (read that file first and follow every step).

Run it autonomously end-to-end — this is a scheduled, unattended job, so do not stop to
ask questions. Work through all six steps:

1. **Gather data** — run all 7 SQL queries via `curl` to `POST /api/admin/claude/sql`.
2. **Assign deals to reps** — apply all 5 matching rules; dedup by lowercase `business_email` first.
3. **Analyze each deal** — urgency, all offers, best offer, stips, declines, contact, AI snapshot.
4. **Build the HTML report** per rep (Dillon gets the master report).
5. **Save each report** via `POST /api/pipeline-reports` (fall back to `/api/admin/claude/mutate`
   on failure). Saving publishes to the dashboard; it does **not** send email.
6. **Output the summary** table.

Honor the **DATA HANDLING RULES** section of the routine doc exactly:

- `total_value` = sum of each deal's **best-offer** advance amount, with a fallback to the
  largest priced `advanceAmount` in `additional_approvals` when the top-level amount is null.
  A rep with deals must never report `$0`.
- Offer numbers are **strings**; `factorRate` may be a **range** like `"1.43 - 1.44"` — parse the
  low end for comparisons, display the range as-is.
- **Skip** unpriced placeholder offers (`status: pre-approved`/`CONDITIONAL`, no amount).
- A deal may belong to **multiple reps** — overlapping per-rep counts are expected.
- Save **one report per rep**, including reps with zero deals. Keep each report under 100KB.
- If any single API call fails, log it and continue; never let one failure abort the run.

Determine today's date and report type from `NOW() AT TIME ZONE 'America/Los_Angeles'`
(Monday = weekly, otherwise daily). When finished, print the Step 6 completion summary.
