/**
 * Chirp Insights — turns raw Chirp transaction/summary data into
 * underwriting-grade metrics.
 *
 * Everything here is pure (no I/O) so it can run at sync time in routes.ts,
 * inside the webhook handler, or against stored snapshot data — and can be
 * unit-tested without touching the Chirp API.
 *
 * The output is designed to answer the questions an underwriter answers from
 * bank statement PDFs today:
 *   - What are real monthly deposits (excluding self-transfers / MCA funding)?
 *   - How many NSF / overdraft events?
 *   - What existing MCA positions are being paid, and what's the daily load?
 *   - Is revenue growing or declining month over month?
 */

// ── Normalized transaction shape stored on merchant_bank_snapshots ─────────
export interface NormalizedTxn {
  id: string;
  date: string; // YYYY-MM-DD
  description: string;
  amount: number; // absolute value
  isCredit: boolean;
  category: string;
  pending: boolean;
}

export interface DetectedMcaPattern {
  description: string;
  amount: number; // average payment amount
  frequency: "daily" | "weekly" | "bi-weekly" | "monthly";
  count: number;
  firstDate: string;
  lastDate: string;
  monthlyLoad: number; // amount × payments-per-month
  funderGuess: string | null;
}

export interface MonthlyBreakdown {
  month: string; // YYYY-MM
  deposits: number;
  depositCount: number;
  trueRevenue: number; // deposits minus transfers-in and MCA funding credits
  withdrawals: number;
  netFlow: number;
  nsfCount: number;
  mcaDebits: number; // total debited by detected MCA positions this month
}

export interface UnderwritingMetrics {
  monthly: MonthlyBreakdown[];
  totalNsfCount: number;
  avgMonthlyDeposits: number;
  avgMonthlyTrueRevenue: number;
  avgDepositCount: number;
  mcaPositions: DetectedMcaPattern[];
  totalMcaMonthlyLoad: number;
  mcaLoadPercentOfRevenue: number | null; // monthly MCA load / true revenue
  transactionCount: number;
  oldestTxnDate: string | null;
  newestTxnDate: string | null;
}

const parseMoney = (v: unknown): number => {
  if (typeof v === "number") return v;
  if (typeof v !== "string") return 0;
  const n = Number.parseFloat(v.replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

const normalizeDesc = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim().slice(0, 40);

// Known MCA funder name fragments — used to label detected patterns and to
// exclude funding deposits from "true revenue"
const KNOWN_FUNDERS = [
  "ondeck", "on deck", "kapitus", "forward financ", "fora financial", "rapid finance",
  "credibly", "fundbox", "bluevine", "kabbage", "square capital", "paypal working",
  "stripe capital", "shopify capital", "lendr", "fundworks", "fintegra", "velocity",
  "specialty capital", "river advance", "fenix", "highland hill", "libertas",
  "everest business", "expansion capital", "mantis", "cfg merchant", "cheetah capital",
  "wide merchant", "gud capital", "byzfunder", "torro", "mulligan", "vader",
  "spartan capital", "unique funding", "granite merchant", "capify", "reliant funding",
  "national funding", "balboa capital", "channel partners", "iou financial",
  "knight capital", "merchant marketplace", "pearl capital", "quicksilver",
  "sos capital", "vital cap", "webfunder", "yes funding", "arsenal funding",
  "clear fund", "diesel funding", "dlp funding", "emerald group", "family funding",
  "fund fi", "good funding", "green grass", "instant advance", "jd capital",
  "kalamata", "legend advance", "lifetime funding", "loan me", "merchant capital",
];

// Descriptions that indicate NSF / overdraft events
const NSF_PATTERNS = /nsf|insufficient|overdraft|od fee|returned item|return item|unpaid item|uncollected/i;

// Descriptions that indicate internal transfers (excluded from true revenue)
const TRANSFER_PATTERNS = /transfer from|xfer from|online transfer|internal transfer|zelle from own|from savings|from checking|mobile deposit reversal/i;

/**
 * Normalize Chirp's TransactionSummaries array (field names vary) into a
 * compact, stable shape suitable for JSONB storage. Caps at `cap` entries
 * (newest first) to bound row size.
 */
export function normalizeChirpTransactions(rawTxns: any[], cap = 2000): NormalizedTxn[] {
  const txns: NormalizedTxn[] = [];
  for (const txn of rawTxns || []) {
    const rawAmt = parseMoney(txn.amount);
    if (rawAmt === 0) continue;
    const date = String(txn.date || txn.transacted_at || txn.posted_at || "").slice(0, 10);
    if (!date) continue;
    const typeStr = String(txn.type || txn.transaction_type || "").toUpperCase();
    const desc = String(txn.description || txn.original_description || txn.name || "").slice(0, 160);
    const catsRaw = Array.isArray(txn.category) ? txn.category.join(" ") : String(txn.category || "");
    const isCredit =
      typeStr === "CREDIT" ||
      txn.is_income === true ||
      txn.is_direct_deposit === true ||
      (rawAmt > 0 && typeStr !== "DEBIT" && typeStr !== "WITHDRAWAL" && typeStr !== "ACH_DEBIT");
    txns.push({
      id: String(txn.chirpTransactionId || txn.guid || txn.id || `${date}-${txns.length}`),
      date,
      description: desc,
      amount: Math.abs(rawAmt),
      isCredit,
      category: catsRaw.slice(0, 60),
      pending: String(txn.status || "").toUpperCase() === "PENDING",
    });
  }
  // Newest first, capped
  txns.sort((a, b) => (a.date < b.date ? 1 : -1));
  return txns.slice(0, cap);
}

function guessFunder(desc: string): string | null {
  const d = desc.toLowerCase();
  for (const funder of KNOWN_FUNDERS) {
    if (d.includes(funder)) return funder.replace(/\b\w/g, c => c.toUpperCase()).trim();
  }
  // ACH debits with "capital", "funding", "advance", "merchant" in the name are
  // very likely MCA funders even if we don't recognize the exact name
  if (/(capital|funding|advance|merch|lend)/i.test(desc)) return null;
  return null;
}

function looksLikeMcaName(desc: string): boolean {
  const d = desc.toLowerCase();
  if (KNOWN_FUNDERS.some(f => d.includes(f))) return true;
  return /(capital|funding|advance|fnd|mca|merchant cash|daily pay)/i.test(d);
}

/**
 * Detect recurring MCA-style debit patterns: 3+ debits with consistent amounts
 * (±15%) at a daily/weekly/bi-weekly/monthly cadence.
 */
export function detectMcaPatterns(txns: NormalizedTxn[]): DetectedMcaPattern[] {
  const debits = txns.filter(t => !t.isCredit && !t.pending && t.amount >= 50 && t.amount <= 100_000);

  const groups = new Map<string, { desc: string; amounts: number[]; dates: string[] }>();
  for (const t of debits) {
    const key = normalizeDesc(t.description || "unknown");
    const g = groups.get(key) || { desc: t.description, amounts: [], dates: [] };
    g.amounts.push(t.amount);
    g.dates.push(t.date);
    groups.set(key, g);
  }

  const patterns: DetectedMcaPattern[] = [];
  for (const [, g] of groups) {
    if (g.amounts.length < 3) continue;
    const avg = g.amounts.reduce((s, a) => s + a, 0) / g.amounts.length;
    if (!g.amounts.every(a => Math.abs(a - avg) / avg < 0.15)) continue;

    const sortedDates = g.dates.filter(Boolean).sort();
    if (sortedDates.length < 3) continue;
    const diffs: number[] = [];
    for (let i = 1; i < sortedDates.length; i++) {
      const a = new Date(sortedDates[i - 1]).getTime();
      const b = new Date(sortedDates[i]).getTime();
      if (Number.isFinite(a) && Number.isFinite(b) && b > a) diffs.push((b - a) / 86_400_000);
    }
    if (diffs.length < 2) continue;
    const avgDiff = diffs.reduce((s, d) => s + d, 0) / diffs.length;

    let frequency: DetectedMcaPattern["frequency"];
    if (avgDiff <= 2) frequency = "daily";
    else if (avgDiff <= 10) frequency = "weekly";
    else if (avgDiff <= 18) frequency = "bi-weekly";
    else if (avgDiff <= 35) frequency = "monthly";
    else continue;

    // Only a daily fixed-amount debit is MCA-like on cadence alone. Weekly,
    // bi-weekly, and monthly recurring debits (payroll, rent, utilities,
    // insurance) must also carry a funder-looking name to qualify.
    if (frequency !== "daily" && !looksLikeMcaName(g.desc)) continue;

    const paymentsPerMonth = frequency === "daily" ? 21 : frequency === "weekly" ? 4.33 : frequency === "bi-weekly" ? 2.17 : 1;
    patterns.push({
      description: g.desc.slice(0, 80),
      amount: Math.round(avg * 100) / 100,
      frequency,
      count: g.amounts.length,
      firstDate: sortedDates[0],
      lastDate: sortedDates[sortedDates.length - 1],
      monthlyLoad: Math.round(avg * paymentsPerMonth),
      funderGuess: guessFunder(g.desc),
    });
  }

  // Highest monthly load first
  patterns.sort((a, b) => b.monthlyLoad - a.monthlyLoad);
  return patterns;
}

/**
 * Compute the full underwriting metrics block from normalized transactions.
 */
export function computeUnderwritingMetrics(txns: NormalizedTxn[]): UnderwritingMetrics {
  const mcaPositions = detectMcaPatterns(txns);
  const mcaDescKeys = new Set(mcaPositions.map(p => normalizeDesc(p.description)));

  const byMonth = new Map<string, MonthlyBreakdown>();
  for (const t of txns) {
    if (t.pending) continue;
    const month = t.date.slice(0, 7);
    if (!month) continue;
    const m = byMonth.get(month) || {
      month, deposits: 0, depositCount: 0, trueRevenue: 0,
      withdrawals: 0, netFlow: 0, nsfCount: 0, mcaDebits: 0,
    };
    if (t.isCredit) {
      m.deposits += t.amount;
      m.depositCount += 1;
      const isTransfer = TRANSFER_PATTERNS.test(t.description);
      const isFunderCredit = looksLikeMcaName(t.description) && t.amount >= 2000;
      if (!isTransfer && !isFunderCredit) m.trueRevenue += t.amount;
    } else {
      m.withdrawals += t.amount;
      if (NSF_PATTERNS.test(t.description)) m.nsfCount += 1;
      if (mcaDescKeys.has(normalizeDesc(t.description))) m.mcaDebits += t.amount;
    }
    byMonth.set(month, m);
  }

  const monthly = Array.from(byMonth.values())
    .map(m => ({
      ...m,
      deposits: Math.round(m.deposits),
      trueRevenue: Math.round(m.trueRevenue),
      withdrawals: Math.round(m.withdrawals),
      netFlow: Math.round(m.deposits - m.withdrawals),
      mcaDebits: Math.round(m.mcaDebits),
    }))
    .sort((a, b) => (a.month < b.month ? 1 : -1)); // newest first

  // Exclude the newest month from averages if it's partial (fewer than 20 days of data)
  const fullMonths = monthly.filter((m, i) => i > 0 || txns.filter(t => t.date.startsWith(m.month)).length >= 10);
  const avgSource = fullMonths.length > 0 ? fullMonths : monthly;

  const avgMonthlyDeposits = avgSource.length ? Math.round(avgSource.reduce((s, m) => s + m.deposits, 0) / avgSource.length) : 0;
  const avgMonthlyTrueRevenue = avgSource.length ? Math.round(avgSource.reduce((s, m) => s + m.trueRevenue, 0) / avgSource.length) : 0;
  const avgDepositCount = avgSource.length ? Math.round(avgSource.reduce((s, m) => s + m.depositCount, 0) / avgSource.length) : 0;
  const totalNsfCount = monthly.reduce((s, m) => s + m.nsfCount, 0);
  const totalMcaMonthlyLoad = mcaPositions.reduce((s, p) => s + p.monthlyLoad, 0);

  const dates = txns.map(t => t.date).filter(Boolean).sort();

  return {
    monthly,
    totalNsfCount,
    avgMonthlyDeposits,
    avgMonthlyTrueRevenue,
    avgDepositCount,
    mcaPositions,
    totalMcaMonthlyLoad,
    mcaLoadPercentOfRevenue: avgMonthlyTrueRevenue > 0
      ? Math.round((totalMcaMonthlyLoad / avgMonthlyTrueRevenue) * 1000) / 10
      : null,
    transactionCount: txns.length,
    oldestTxnDate: dates[0] || null,
    newestTxnDate: dates[dates.length - 1] || null,
  };
}
