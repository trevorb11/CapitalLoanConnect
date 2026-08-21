# Approval Pulling Guidelines

How to read lender approval emails and enter them onto the dashboard
(`/approvals` → `business_underwriting_decisions`). Follow these rules every
time approvals are pulled from the underwriting inbox so the data is
consistent and reps can trust the offer details.

These guidelines sit on top of the normal intake flow. They do **not**
replace the existing parsing logic — they pin down the edge cases that have
caused bad data in the past.

---

## Where each value is stored

The `business_underwriting_decisions` record (and each entry in its
`additionalApprovals` JSONB array) has these offer fields:

| Field | Column / JSONB key | Notes |
|-------|--------------------|-------|
| Lender | `lender` | Canonical lender name |
| Advance amount | `advanceAmount` | Dollars |
| Term | `term` | e.g. `"12 months"` |
| Payment frequency | `paymentFrequency` | `daily` / `weekly` / `biweekly` / `monthly` |
| Factor rate | `factorRate` | e.g. `1.499` |
| Max upsell | `maxUpsell` | Dedicated column — use it |
| Total payback | `totalPayback` | Dollars |
| Net after fees | `netAfterFees` | Dollars |
| Approval date | `approvalDate` | |
| **Buy rate** | `notes` | No dedicated column — record in notes |
| **Sell rate** | `notes` | No dedicated column — record in notes |
| **Commission / payout %** | `notes` | No dedicated column — record in notes |
| **Approval / portal link** | `notes` | No dedicated column — record in notes |

> There is no `buyRate` or `sellRate` column today. Until one exists, keep
> those values in the `notes` field using a clear, consistent label (see
> Rule 3) so nothing is lost.

---

## Rule 1 — Westwood is always 1.499 @ 12%

**Westwood Funding** (`Masoncap@westwoodfunding.com`) always structures their
offers the same way:

- **Factor rate: `1.499`**
- **Paying 12%** (commission / payout)

Whenever an approval comes from Westwood, record `factorRate = 1.499` and note
the **12% payout** in `notes`, regardless of how the email phrases it. If the
email appears to show a different factor rate, treat 1.499 / 12% as the truth
and flag the discrepancy in the notes rather than overwriting it silently.

---

## Rule 2 — When a lender gives several options, take the most aggressive one

Some lenders present multiple tiers/options in a single approval (e.g. a 6-,
9-, and 12-month option, or escalating advance amounts). Record **one** offer
per lender on the dashboard, and choose the option with:

1. **The highest approval (advance) amount**, then
2. **The longest term**, then
3. **Rates maxed out** — the highest buy/sell/factor rate the lender allows.

This is the most aggressive option on purpose: it maximizes the advance for
the merchant and the commission room for the broker. Pick the single option
that is simultaneously the biggest, longest, and highest-rate offer the lender
extended. If the options aren't on a single dominating tier, prioritize in the
order above (amount → term → rate).

---

## Rule 3 — Preserve buy rate, sell rate, and max upsell

If an offer includes a **buy rate**, **sell rate**, and **max upsell**, save
**all three**:

- **Max upsell** → the `maxUpsell` column.
- **Buy rate** and **sell rate** → the `notes` field (no dedicated columns
  yet). Use an explicit, parseable label so they survive, e.g.:

  ```
  Buy rate: 1.35 | Sell rate: 1.49 | Max upsell: 1.49
  ```

Never drop the buy/sell rate just because there's no column for it. These
drive the commission math and reps rely on them.

---

## Rule 4 — Open every link before saving, then store the link

If an approval email contains a **link** (lender portal, approval PDF, offer
summary, e-sign page, etc.):

1. **Open the link first** and read the approval details from the linked
   page/document — the email body is often just a notification and the real
   amount/term/rate/stips live behind the link.
2. Pull the offer fields from the linked details using Rules 1–3.
3. **Put the link itself in the submission `notes`** on the dashboard so the
   underwriting team and reps can reopen the source, e.g.:

   ```
   Approval link: https://lenderportal.example.com/offer/abc123
   ```

Do not enter an offer from a link-only email without opening the link first.

---

## Quick checklist per approval

- [ ] Identified the lender (canonical name).
- [ ] If Westwood → `factorRate = 1.499`, note **12% payout**.
- [ ] If multiple options → kept the highest amount / longest term / maxed rate.
- [ ] Opened any link and pulled details from it.
- [ ] `maxUpsell` populated; buy rate + sell rate captured in `notes`.
- [ ] Approval link (if any) saved in `notes`.
- [ ] Set `isPrimary` on the best offer if the business has multiple lenders.
