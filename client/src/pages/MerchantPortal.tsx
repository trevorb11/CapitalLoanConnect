import { useState, useEffect, useRef, useCallback } from "react";

// ── CALC ENGINE ──────────────────────────────────────────────────────────
function isWeekday(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  return day !== 0 && day !== 6;
}

function businessDaysBetween(start: Date | string, end: Date | string) {
  let count = 0;
  const cur = new Date(start);
  const endDate = new Date(end);
  while (cur <= endDate) {
    if (isWeekday(cur)) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

function addBusinessDays(startDate: Date | string, days: number) {
  const d = new Date(startDate);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    if (isWeekday(d)) added++;
  }
  return d;
}

interface Deal {
  id: string;
  businessName: string;
  lender: string;
  advanceAmount: number;
  factorRate: number;
  totalPayback: number;
  paymentFrequency: string;
  fundedDate: string;
  term: string;
  status: string;
  assignedRep: string | null;
  maxUpsell: number | null;
  approvalDeadline: string | null;
  additionalApprovals: AdditionalApproval[];
  decisionId: number;
}

interface AdditionalApproval {
  lender: string;
  amount: number | string;
  term?: string;
  factorRate?: number | string;
}

interface ActivityItem {
  id: string;
  type: 'milestone' | 'message' | 'offer';
  icon: string;
  title: string;
  description: string;
  timestamp: string;
}

interface BankStatement {
  id: string;
  originalFileName: string;
  fileSize: number;
  viewToken: string | null;
  receivedAt: string | null;
  createdAt: string;
}

interface CalcResult {
  totalPayback: number;
  paymentAmount: number;
  paymentsMade: number;
  totalPayments: number;
  amountPaid: number;
  remaining: number;
  pctComplete: number;
  paymentsRemaining: number;
  projectedPayoff: Date;
  isComplete: boolean;
}

function calcDeal(deal: Deal): CalcResult {
  const today = new Date();
  const funded = new Date(deal.fundedDate);
  // Payoff timeline must reflect the total amount the merchant owes — i.e.
  // the funded/advance amount multiplied by the factor rate. Always compute
  // from advance × factorRate when we have a valid factor rate (> 1) so the
  // timeline never accidentally shows just the funded amount, and fall back
  // to the stored totalPayback only when we don't have enough info to derive it.
  const derivedPayback = deal.advanceAmount * deal.factorRate;
  const totalPayback =
    deal.advanceAmount > 0 && deal.factorRate > 1
      ? derivedPayback
      : (deal.totalPayback || derivedPayback || 0);
  const isDaily = deal.paymentFrequency === "daily";

  let paymentsMade: number, paymentAmount: number, totalPayments: number;

  const isWeekly = deal.paymentFrequency === "weekly";
  const isBiWeekly = deal.paymentFrequency === "bi-weekly" || deal.paymentFrequency === "biweekly";
  const isMonthly = deal.paymentFrequency === "monthly";

  // Parse the term string (e.g. "6 months", "80 days", "52 weeks", "12") into
  // a { value, unit } pair. Defaults to months if no unit is specified.
  const parseTerm = (termStr: string | null | undefined): { value: number; unit: 'days' | 'weeks' | 'months' } => {
    if (!termStr) return { value: 6, unit: 'months' };
    const s = termStr.toLowerCase().trim();
    const match = s.match(/(\d+(?:\.\d+)?)/);
    if (!match) return { value: 6, unit: 'months' };
    const value = parseFloat(match[1]);
    if (/day/.test(s)) return { value, unit: 'days' };
    if (/week/.test(s) || /wk/.test(s)) return { value, unit: 'weeks' };
    if (/month/.test(s) || /mo\b/.test(s)) return { value, unit: 'months' };
    // No unit — infer from payment frequency
    if (isDaily) return { value, unit: 'days' };
    if (isWeekly || isBiWeekly) return { value, unit: 'weeks' };
    return { value, unit: 'months' };
  };

  const parsedTerm = parseTerm(deal.term);

  // Convert parsed term to total number of payments based on payment frequency
  const termToTotalPayments = (): number => {
    const { value, unit } = parsedTerm;
    if (isDaily) {
      // Daily payments are business days
      if (unit === 'days') return Math.round(value);
      if (unit === 'weeks') return Math.round(value * 5); // 5 business days per week
      if (unit === 'months') return Math.round(value * 21); // ~21 business days per month
    }
    if (isWeekly) {
      if (unit === 'weeks') return Math.round(value);
      if (unit === 'months') return Math.round(value * 4.33);
      if (unit === 'days') return Math.round(value / 7);
    }
    if (isBiWeekly) {
      if (unit === 'weeks') return Math.round(value / 2);
      if (unit === 'months') return Math.round(value * 2);
      if (unit === 'days') return Math.round(value / 14);
    }
    if (isMonthly) {
      if (unit === 'months') return Math.round(value);
      if (unit === 'weeks') return Math.round(value / 4.33);
      if (unit === 'days') return Math.round(value / 30);
    }
    return Math.round(value);
  };

  if (isDaily) {
    totalPayments = termToTotalPayments();
    paymentAmount = totalPayback / totalPayments;
    paymentsMade = businessDaysBetween(funded, today);
  } else {
    totalPayments = termToTotalPayments();
    paymentAmount = totalPayback / totalPayments;

    if (isMonthly) {
      const monthsElapsed = (today.getFullYear() - funded.getFullYear()) * 12 + (today.getMonth() - funded.getMonth());
      paymentsMade = Math.max(0, monthsElapsed);
    } else {
      const msPerPeriod = isBiWeekly ? 14 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
      paymentsMade = Math.floor((today.getTime() - funded.getTime()) / msPerPeriod);
    }
  }

  paymentsMade = Math.min(paymentsMade, totalPayments);
  const amountPaid = Math.min(paymentsMade * paymentAmount, totalPayback);
  const remaining = Math.max(totalPayback - amountPaid, 0);
  const pctComplete = (amountPaid / totalPayback) * 100;
  const paymentsRemaining = Math.max(totalPayments - paymentsMade, 0);

  let projectedPayoff: Date;
  if (isDaily) {
    projectedPayoff = addBusinessDays(today, paymentsRemaining);
  } else if (isMonthly) {
    projectedPayoff = new Date(today);
    projectedPayoff.setMonth(projectedPayoff.getMonth() + paymentsRemaining);
  } else {
    const msPerPeriod = isBiWeekly ? 14 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
    projectedPayoff = new Date(today.getTime() + paymentsRemaining * msPerPeriod);
  }

  if (deal.status === "completed") {
    return {
      totalPayback,
      paymentAmount,
      paymentsMade: totalPayments,
      totalPayments,
      amountPaid: totalPayback,
      remaining: 0,
      pctComplete: 100,
      paymentsRemaining: 0,
      projectedPayoff: new Date(deal.fundedDate),
      isComplete: true,
    };
  }

  return {
    totalPayback,
    paymentAmount,
    paymentsMade,
    totalPayments,
    amountPaid,
    remaining,
    pctComplete,
    paymentsRemaining,
    projectedPayoff,
    isComplete: pctComplete >= 100,
  };
}

// ── FORMATTERS ───────────────────────────────────────────────────────────
function fmt$(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

function fmtDate(d: Date | string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ── STYLES ───────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');

  .merchant-portal * { box-sizing: border-box; margin: 0; padding: 0; }

  .merchant-portal {
    font-family: 'DM Sans', sans-serif;
    background: #080d18;
    color: #e8eaf0;
    min-height: 100vh;
  }

  .portal-root {
    min-height: 100vh;
    background: radial-gradient(ellipse at 20% 0%, rgba(20, 184, 166, 0.12) 0%, transparent 60%),
                radial-gradient(ellipse at 80% 100%, rgba(15, 23, 41, 0.9) 0%, transparent 60%),
                #080d18;
  }

  .login-wrap {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
  }

  .login-card {
    width: 100%;
    max-width: 420px;
    background: rgba(15, 23, 41, 0.8);
    border: 1px solid rgba(45, 212, 191, 0.2);
    border-radius: 20px;
    padding: 48px 40px;
    backdrop-filter: blur(20px);
    box-shadow: 0 32px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(45,212,191,0.05) inset;
  }

  .login-logo {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 36px;
  }

  .login-logo-mark {
    width: 38px;
    height: 38px;
    background: linear-gradient(135deg, #14B8A6, #2dd4bf);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Syne', sans-serif;
    font-weight: 800;
    font-size: 16px;
    color: #080d18;
    flex-shrink: 0;
  }

  .login-logo-text {
    font-family: 'Syne', sans-serif;
    font-weight: 700;
    font-size: 13px;
    line-height: 1.3;
    color: #e8eaf0;
    letter-spacing: 0.02em;
  }

  .login-logo-sub {
    font-size: 10px;
    color: #14B8A6;
    font-weight: 400;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .login-title {
    font-family: 'Syne', sans-serif;
    font-size: 26px;
    font-weight: 700;
    color: #fff;
    margin-bottom: 8px;
  }

  .login-sub {
    font-size: 14px;
    color: #7b8499;
    margin-bottom: 36px;
  }

  .field-label {
    display: block;
    font-size: 12px;
    font-weight: 600;
    color: #9ba3b8;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 8px;
  }

  .field-input {
    width: 100%;
    padding: 13px 16px;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 10px;
    color: #e8eaf0;
    font-size: 15px;
    font-family: 'DM Sans', sans-serif;
    outline: none;
    transition: border-color 0.2s;
    margin-bottom: 20px;
  }

  .field-input:focus {
    border-color: rgba(45, 212, 191, 0.5);
    background: rgba(45,212,191,0.04);
  }

  .login-btn {
    width: 100%;
    padding: 14px;
    background: linear-gradient(135deg, #14B8A6, #0d9488);
    border: none;
    border-radius: 10px;
    color: #080d18;
    font-family: 'Syne', sans-serif;
    font-weight: 700;
    font-size: 15px;
    cursor: pointer;
    transition: opacity 0.2s, transform 0.1s;
    letter-spacing: 0.02em;
  }

  .login-btn:hover { opacity: 0.9; transform: translateY(-1px); }
  .login-btn:active { transform: translateY(0); }

  .login-error {
    padding: 12px 14px;
    background: rgba(239,68,68,0.1);
    border: 1px solid rgba(239,68,68,0.25);
    border-radius: 8px;
    color: #fca5a5;
    font-size: 13px;
    margin-top: 12px;
  }

  .login-hint {
    font-size: 12px;
    color: #4b5568;
    text-align: center;
    margin-top: 24px;
  }

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 32px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    background: rgba(8, 13, 24, 0.7);
    backdrop-filter: blur(12px);
    position: sticky;
    top: 0;
    z-index: 100;
  }

  .header-logo {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .header-logo-mark {
    width: 32px;
    height: 32px;
    background: linear-gradient(135deg, #14B8A6, #2dd4bf);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Syne', sans-serif;
    font-weight: 800;
    font-size: 13px;
    color: #080d18;
  }

  .header-brand {
    font-family: 'Syne', sans-serif;
    font-weight: 700;
    font-size: 13px;
    color: #e8eaf0;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .header-user {
    font-size: 13px;
    color: #7b8499;
  }

  .logout-btn {
    padding: 7px 14px;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 8px;
    color: #9ba3b8;
    font-size: 12px;
    font-family: 'DM Sans', sans-serif;
    cursor: pointer;
    transition: all 0.2s;
  }

  .logout-btn:hover {
    background: rgba(255,255,255,0.1);
    color: #e8eaf0;
  }

  .page-wrap {
    max-width: 960px;
    margin: 0 auto;
    padding: 40px 24px 80px;
  }

  .page-title {
    font-family: 'Syne', sans-serif;
    font-size: 28px;
    font-weight: 700;
    color: #fff;
    margin-bottom: 6px;
  }

  .page-subtitle {
    font-size: 14px;
    color: #7b8499;
    margin-bottom: 40px;
  }

  .deals-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .deal-card {
    background: rgba(15, 23, 41, 0.7);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 16px;
    padding: 28px;
    cursor: pointer;
    transition: all 0.2s;
    position: relative;
    overflow: hidden;
  }

  .deal-card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 2px;
    background: linear-gradient(90deg, #14B8A6, #2dd4bf);
    opacity: 0;
    transition: opacity 0.2s;
  }

  .deal-card:hover {
    border-color: rgba(45,212,191,0.3);
    transform: translateY(-2px);
    box-shadow: 0 12px 32px rgba(0,0,0,0.3);
  }

  .deal-card:hover::before { opacity: 1; }

  .deal-card.completed {
    opacity: 0.6;
    border-color: rgba(255,255,255,0.05);
  }

  .deal-card-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 20px;
  }

  .deal-lender {
    font-family: 'Syne', sans-serif;
    font-weight: 600;
    font-size: 18px;
    letter-spacing: -0.01em;
    color: #e8eaf0;
  }

  .deal-funded-date {
    font-size: 12px;
    color: #7b8499;
    margin-top: 3px;
  }

  .deal-badge {
    padding: 5px 12px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .badge-active {
    background: rgba(20,184,166,0.15);
    color: #2dd4bf;
    border: 1px solid rgba(45,212,191,0.25);
  }

  .badge-complete {
    background: rgba(100,116,139,0.15);
    color: #94a3b8;
    border: 1px solid rgba(100,116,139,0.2);
  }

  .deal-stats-row {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    margin-bottom: 20px;
  }

  .deal-stat-label {
    font-size: 11px;
    color: #7b8499;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: 4px;
  }

  .deal-stat-val {
    font-family: 'DM Sans', sans-serif;
    font-weight: 600;
    font-size: 16px;
    color: #e8eaf0;
  }

  .deal-stat-val.teal { color: #2dd4bf; }

  .deal-stat-sub {
    font-size: 10px;
    color: #4b5568;
    margin-top: 3px;
    letter-spacing: 0.02em;
  }

  .progress-wrap { margin-bottom: 12px; }

  .progress-label-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
    font-size: 12px;
    color: #7b8499;
  }

  .progress-pct {
    font-family: 'Syne', sans-serif;
    font-weight: 700;
    font-size: 13px;
    color: #2dd4bf;
  }

  .progress-track {
    height: 8px;
    background: rgba(255,255,255,0.07);
    border-radius: 99px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #14B8A6, #2dd4bf);
    border-radius: 99px;
    transition: width 1s ease;
    box-shadow: 0 0 12px rgba(45,212,191,0.4);
  }

  .deal-card-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 4px;
  }

  .remaining-label {
    font-size: 13px;
    color: #9ba3b8;
  }

  .remaining-amount {
    font-family: 'DM Sans', sans-serif;
    font-weight: 600;
    font-size: 15px;
    color: #e8eaf0;
  }

  .view-detail {
    font-size: 12px;
    color: #14B8A6;
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .section-label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: #4b5568;
    margin-bottom: 14px;
    margin-top: 36px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .section-label::after {
    content: '';
    flex: 1;
    height: 1px;
    background: rgba(255,255,255,0.06);
  }

  .back-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    background: none;
    border: none;
    color: #9ba3b8;
    font-size: 13px;
    font-family: 'DM Sans', sans-serif;
    cursor: pointer;
    padding: 0;
    margin-bottom: 28px;
    transition: color 0.2s;
  }

  .back-btn:hover { color: #2dd4bf; }

  .detail-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 32px;
    flex-wrap: wrap;
    gap: 16px;
  }

  .detail-title {
    font-family: 'Syne', sans-serif;
    font-size: 26px;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: #fff;
  }

  .detail-sub {
    font-size: 14px;
    color: #7b8499;
    margin-top: 4px;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    margin-bottom: 28px;
  }

  @media (min-width: 600px) {
    .stats-grid { grid-template-columns: repeat(4, 1fr); }
  }

  .stat-card {
    background: rgba(15,23,41,0.7);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 14px;
    padding: 18px 20px;
  }

  .stat-card-label {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: #7b8499;
    margin-bottom: 6px;
    font-weight: 600;
  }

  .stat-card-val {
    font-family: 'DM Sans', sans-serif;
    font-weight: 600;
    font-size: 20px;
    color: #e8eaf0;
  }

  .stat-card-val.teal { color: #2dd4bf; }

  .stat-card-sub {
    font-size: 11px;
    color: #4b5568;
    margin-top: 3px;
  }

  .tracker-card {
    background: rgba(15,23,41,0.7);
    border: 1px solid rgba(45,212,191,0.15);
    border-radius: 20px;
    padding: 36px;
    margin-bottom: 20px;
    position: relative;
    overflow: hidden;
  }

  .tracker-card::after {
    content: '';
    position: absolute;
    top: -60px; right: -60px;
    width: 200px; height: 200px;
    background: radial-gradient(circle, rgba(20,184,166,0.08) 0%, transparent 70%);
    pointer-events: none;
  }

  .tracker-pct-display {
    font-family: 'DM Sans', sans-serif;
    font-size: 64px;
    font-weight: 700;
    line-height: 1;
    margin-bottom: 6px;
    background: linear-gradient(135deg, #2dd4bf, #14B8A6);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .tracker-pct-label {
    font-size: 14px;
    color: #7b8499;
    margin-bottom: 28px;
  }

  .tracker-big-bar {
    height: 16px;
    background: rgba(255,255,255,0.06);
    border-radius: 99px;
    overflow: hidden;
    margin-bottom: 20px;
  }

  .tracker-big-fill {
    height: 100%;
    background: linear-gradient(90deg, #0d9488, #14B8A6, #2dd4bf);
    border-radius: 99px;
    transition: width 1.2s cubic-bezier(0.34, 1.56, 0.64, 1);
    box-shadow: 0 0 24px rgba(45,212,191,0.5);
    position: relative;
  }

  .tracker-big-fill::after {
    content: '';
    position: absolute;
    right: 0; top: 0; bottom: 0;
    width: 4px;
    background: #fff;
    border-radius: 99px;
    opacity: 0.6;
  }

  .tracker-amounts {
    display: flex;
    justify-content: space-between;
    margin-bottom: 32px;
  }

  .tracker-paid {
    font-size: 13px;
    color: #9ba3b8;
  }

  .tracker-paid strong {
    font-family: 'DM Sans', sans-serif;
    color: #2dd4bf;
    font-weight: 600;
  }

  .tracker-total {
    font-size: 13px;
    color: #7b8499;
    text-align: right;
  }

  .tracker-metrics {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
    padding-top: 24px;
    border-top: 1px solid rgba(255,255,255,0.06);
  }

  .tracker-metric-label {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: #4b5568;
    margin-bottom: 6px;
    font-weight: 600;
  }

  .tracker-metric-val {
    font-family: 'DM Sans', sans-serif;
    font-weight: 600;
    font-size: 18px;
    color: #e8eaf0;
  }

  .tracker-metric-sub {
    font-size: 11px;
    color: #4b5568;
    margin-top: 2px;
  }

  .balance-callout {
    background: rgba(8,13,24,0.8);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 16px;
    padding: 24px 28px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 16px;
    margin-bottom: 20px;
  }

  .balance-left-label {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: #7b8499;
    font-weight: 600;
    margin-bottom: 4px;
  }

  .balance-amount {
    font-family: 'DM Sans', sans-serif;
    font-size: 36px;
    font-weight: 700;
    color: #fff;
  }

  .balance-sub {
    font-size: 12px;
    color: #4b5568;
    margin-top: 2px;
  }

  .payoff-date-wrap {
    text-align: right;
  }

  .payoff-date-label {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: #7b8499;
    font-weight: 600;
    margin-bottom: 4px;
  }

  .payoff-date-val {
    font-family: 'DM Sans', sans-serif;
    font-size: 22px;
    font-weight: 600;
    color: #2dd4bf;
  }

  .payoff-date-sub {
    font-size: 12px;
    color: #4b5568;
    margin-top: 2px;
  }

  .contact-strip {
    background: rgba(20,184,166,0.05);
    border: 1px solid rgba(45,212,191,0.12);
    border-radius: 14px;
    padding: 20px 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;
  }

  .contact-strip-text {
    font-size: 13px;
    color: #9ba3b8;
  }

  .contact-strip-text strong {
    color: #e8eaf0;
  }

  .contact-cta {
    padding: 9px 18px;
    background: linear-gradient(135deg, #14B8A6, #0d9488);
    border: none;
    border-radius: 8px;
    color: #080d18;
    font-family: 'Syne', sans-serif;
    font-weight: 700;
    font-size: 12px;
    cursor: pointer;
    letter-spacing: 0.04em;
    transition: opacity 0.2s;
  }

  .contact-cta:hover { opacity: 0.9; }

  .completion-banner {
    background: rgba(20,184,166,0.08);
    border: 1px solid rgba(45,212,191,0.2);
    border-radius: 16px;
    padding: 28px;
    text-align: center;
    margin-bottom: 20px;
  }

  .completion-icon {
    font-size: 40px;
    margin-bottom: 12px;
  }

  .completion-title {
    font-family: 'Syne', sans-serif;
    font-size: 22px;
    font-weight: 700;
    color: #2dd4bf;
    margin-bottom: 6px;
  }

  .completion-sub {
    font-size: 14px;
    color: #7b8499;
  }

  .loading-wrap {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #7b8499;
    font-size: 14px;
  }

  .documents-section {
    margin-top: 40px;
  }

  .documents-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 10px;
    margin-top: 4px;
  }

  @media (min-width: 600px) {
    .documents-grid { grid-template-columns: repeat(2, 1fr); }
  }

  .document-row {
    display: flex;
    align-items: center;
    gap: 14px;
    background: rgba(15,23,41,0.7);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 12px;
    padding: 14px 18px;
    text-decoration: none;
    color: inherit;
    transition: border-color 0.2s, background 0.2s;
  }

  .document-row:hover {
    border-color: rgba(45,212,191,0.3);
    background: rgba(15,23,41,0.9);
  }

  .document-icon {
    width: 36px;
    height: 36px;
    background: rgba(20,184,166,0.12);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: #2dd4bf;
    font-size: 16px;
  }

  .document-info {
    flex: 1;
    min-width: 0;
  }

  .document-name {
    font-size: 14px;
    font-weight: 500;
    color: #e8eaf0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .document-meta {
    font-size: 11px;
    color: #4b5568;
    margin-top: 2px;
  }

  .document-open {
    font-size: 12px;
    color: #14B8A6;
    flex-shrink: 0;
    white-space: nowrap;
  }

  .no-documents {
    font-size: 14px;
    color: #4b5568;
    padding: 16px 0;
  }

  /* ── RENEWAL ELIGIBILITY ── */
  .renewal-tracker {
    background: rgba(15,23,41,0.7);
    border: 1px solid rgba(168,85,247,0.15);
    border-radius: 16px;
    padding: 24px 28px;
    margin-top: 20px;
    position: relative;
    overflow: hidden;
  }

  .renewal-tracker::after {
    content: '';
    position: absolute;
    top: -40px; right: -40px;
    width: 140px; height: 140px;
    background: radial-gradient(circle, rgba(168,85,247,0.06) 0%, transparent 70%);
    pointer-events: none;
  }

  .renewal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
    flex-wrap: wrap;
    gap: 8px;
  }

  .renewal-title {
    font-family: 'Syne', sans-serif;
    font-weight: 700;
    font-size: 16px;
    color: #e8eaf0;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .renewal-badge {
    padding: 4px 10px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .renewal-badge.eligible {
    background: rgba(52,211,153,0.15);
    color: #34d399;
    border: 1px solid rgba(52,211,153,0.25);
  }

  .renewal-badge.progress {
    background: rgba(168,85,247,0.15);
    color: #c084fc;
    border: 1px solid rgba(168,85,247,0.25);
  }

  .renewal-bar-wrap {
    margin-bottom: 12px;
  }

  .renewal-bar-labels {
    display: flex;
    justify-content: space-between;
    margin-bottom: 6px;
    font-size: 12px;
    color: #7b8499;
  }

  .renewal-bar-pct {
    font-weight: 700;
    color: #c084fc;
  }

  .renewal-bar-track {
    height: 10px;
    background: rgba(255,255,255,0.06);
    border-radius: 99px;
    overflow: hidden;
    position: relative;
  }

  .renewal-bar-fill {
    height: 100%;
    background: linear-gradient(90deg, #7c3aed, #a855f7, #c084fc);
    border-radius: 99px;
    transition: width 1s ease;
    box-shadow: 0 0 12px rgba(168,85,247,0.4);
  }

  .renewal-bar-milestone {
    position: absolute;
    top: -2px;
    bottom: -2px;
    width: 3px;
    background: rgba(255,255,255,0.3);
    border-radius: 2px;
  }

  .renewal-detail {
    font-size: 13px;
    color: #9ba3b8;
    margin-top: 8px;
    line-height: 1.5;
  }

  .renewal-eligible-msg {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 16px 20px;
    background: rgba(52,211,153,0.06);
    border: 1px solid rgba(52,211,153,0.15);
    border-radius: 12px;
    margin-top: 12px;
  }

  .renewal-eligible-msg-text {
    font-size: 14px;
    color: #34d399;
    font-weight: 500;
  }

  .renewal-eligible-msg-sub {
    font-size: 12px;
    color: #7b8499;
    margin-top: 2px;
  }

  /* ── RESOURCES ── */
  .resources-section {
    margin-top: 8px;
  }

  .resources-intro {
    display: flex;
    align-items: flex-start;
    gap: 16px;
    padding: 24px 28px;
    background: rgba(15,23,41,0.7);
    border: 1px solid rgba(45,212,191,0.15);
    border-radius: 16px;
    margin-bottom: 24px;
  }

  .resources-intro-icon {
    font-size: 28px;
    flex-shrink: 0;
    margin-top: 2px;
  }

  .resources-intro-title {
    font-family: 'Syne', sans-serif;
    font-weight: 700;
    font-size: 18px;
    color: #e8eaf0;
    margin-bottom: 4px;
  }

  .resources-intro-sub {
    font-size: 14px;
    color: #7b8499;
    line-height: 1.5;
  }

  .resources-group {
    margin-bottom: 28px;
  }

  .resources-group-title {
    font-family: 'Syne', sans-serif;
    font-weight: 700;
    font-size: 14px;
    color: #9ba3b8;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .resources-group-title::after {
    content: '';
    flex: 1;
    height: 1px;
    background: rgba(255,255,255,0.06);
  }

  .resources-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .resource-card {
    display: block;
    background: rgba(15,23,41,0.7);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 14px;
    padding: 20px 24px;
    text-decoration: none;
    color: inherit;
    transition: all 0.2s;
    cursor: pointer;
  }

  .resource-card:hover {
    border-color: rgba(45,212,191,0.3);
    transform: translateY(-1px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.2);
  }

  .resource-card-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 8px;
  }

  .resource-card-title {
    font-family: 'Syne', sans-serif;
    font-weight: 600;
    font-size: 15px;
    color: #e8eaf0;
    line-height: 1.3;
  }

  .resource-tag {
    flex-shrink: 0;
    padding: 3px 10px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.03em;
    border: 1px solid;
    white-space: nowrap;
  }

  .resource-card-desc {
    font-size: 13px;
    color: #7b8499;
    line-height: 1.5;
    margin-bottom: 10px;
  }

  .resource-card-link {
    font-size: 13px;
    color: #14B8A6;
    font-weight: 500;
    transition: color 0.2s;
  }

  .resource-card:hover .resource-card-link {
    color: #2dd4bf;
  }

  @media (min-width: 640px) {
    .resources-grid {
      grid-template-columns: 1fr 1fr;
    }
  }

  /* ── MESSAGING ── */
  .messaging-section {
    margin-top: 20px;
  }

  .messaging-card {
    background: rgba(15,23,41,0.7);
    border: 1px solid rgba(59,130,246,0.15);
    border-radius: 16px;
    overflow: hidden;
  }

  .messaging-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 18px 24px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    cursor: pointer;
    transition: background 0.2s;
  }

  .messaging-header:hover {
    background: rgba(59,130,246,0.04);
  }

  .messaging-header-left {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .messaging-header-title {
    font-family: 'Syne', sans-serif;
    font-weight: 700;
    font-size: 15px;
    color: #e8eaf0;
  }

  .messaging-unread {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 20px;
    height: 20px;
    padding: 0 6px;
    background: #3b82f6;
    border-radius: 10px;
    font-size: 11px;
    font-weight: 700;
    color: #fff;
  }

  .messaging-toggle {
    font-size: 12px;
    color: #7b8499;
  }

  .messaging-body {
    max-height: 400px;
    overflow-y: auto;
    padding: 16px 24px;
  }

  .messaging-empty {
    text-align: center;
    padding: 32px 16px;
    color: #4b5568;
    font-size: 14px;
  }

  .msg-bubble {
    max-width: 80%;
    padding: 12px 16px;
    border-radius: 14px;
    margin-bottom: 10px;
    font-size: 14px;
    line-height: 1.5;
    word-wrap: break-word;
  }

  .msg-bubble.merchant {
    background: rgba(20,184,166,0.12);
    border: 1px solid rgba(45,212,191,0.15);
    color: #e8eaf0;
    margin-left: auto;
    border-bottom-right-radius: 4px;
  }

  .msg-bubble.rep {
    background: rgba(59,130,246,0.1);
    border: 1px solid rgba(59,130,246,0.15);
    color: #e8eaf0;
    margin-right: auto;
    border-bottom-left-radius: 4px;
  }

  .msg-meta {
    font-size: 11px;
    color: #4b5568;
    margin-bottom: 16px;
  }

  .msg-meta.merchant { text-align: right; }

  .messaging-input-wrap {
    display: flex;
    gap: 10px;
    padding: 16px 24px;
    border-top: 1px solid rgba(255,255,255,0.06);
    background: rgba(8,13,24,0.5);
  }

  .messaging-input {
    flex: 1;
    padding: 11px 16px;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 10px;
    color: #e8eaf0;
    font-size: 14px;
    font-family: 'DM Sans', sans-serif;
    outline: none;
    resize: none;
    min-height: 42px;
    max-height: 120px;
  }

  .messaging-input:focus {
    border-color: rgba(59,130,246,0.4);
  }

  .messaging-send {
    padding: 0 18px;
    background: linear-gradient(135deg, #3b82f6, #2563eb);
    border: none;
    border-radius: 10px;
    color: #fff;
    font-family: 'Syne', sans-serif;
    font-weight: 700;
    font-size: 13px;
    cursor: pointer;
    transition: opacity 0.2s;
    white-space: nowrap;
  }

  .messaging-send:hover { opacity: 0.9; }
  .messaging-send:disabled { opacity: 0.4; cursor: not-allowed; }

  /* ── DOCUMENT VAULT ── */
  .vault-section {
    margin-top: 20px;
  }

  .vault-card {
    background: rgba(15,23,41,0.7);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 16px;
    padding: 24px 28px;
  }

  .vault-title {
    font-family: 'Syne', sans-serif;
    font-weight: 700;
    font-size: 16px;
    color: #e8eaf0;
    margin-bottom: 4px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .vault-sub {
    font-size: 13px;
    color: #7b8499;
    margin-bottom: 20px;
  }

  .vault-category {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #4b5568;
    margin-bottom: 10px;
    margin-top: 18px;
  }

  .vault-category:first-of-type { margin-top: 0; }

  .vault-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 8px;
  }

  @media (min-width: 600px) {
    .vault-grid { grid-template-columns: repeat(2, 1fr); }
  }

  .vault-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    background: rgba(8,13,24,0.5);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 10px;
    text-decoration: none;
    color: inherit;
    transition: border-color 0.2s;
  }

  .vault-item:hover { border-color: rgba(45,212,191,0.25); }

  .vault-icon {
    width: 34px;
    height: 34px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    font-size: 15px;
  }

  .vault-icon.check { background: rgba(52,211,153,0.12); color: #34d399; }
  .vault-icon.id { background: rgba(251,191,36,0.12); color: #fbbf24; }
  .vault-icon.statement { background: rgba(20,184,166,0.12); color: #2dd4bf; }

  .vault-item-info { flex: 1; min-width: 0; }

  .vault-item-name {
    font-size: 13px;
    font-weight: 500;
    color: #e8eaf0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .vault-item-meta {
    font-size: 11px;
    color: #4b5568;
    margin-top: 2px;
  }

  .vault-item-action {
    font-size: 11px;
    color: #14B8A6;
    flex-shrink: 0;
  }

  /* ── NAV TABS ── */
  .portal-nav {
    display: flex;
    gap: 4px;
    margin-bottom: 28px;
    background: rgba(15,23,41,0.7);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 12px;
    padding: 4px;
  }

  .portal-nav-btn {
    flex: 1;
    padding: 10px 16px;
    background: none;
    border: none;
    border-radius: 8px;
    color: #7b8499;
    font-family: 'DM Sans', sans-serif;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    position: relative;
  }

  .portal-nav-btn:hover {
    color: #e8eaf0;
    background: rgba(255,255,255,0.04);
  }

  .portal-nav-btn.active {
    background: rgba(45,212,191,0.1);
    color: #2dd4bf;
    font-weight: 600;
  }

  .nav-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    background: #3b82f6;
    border-radius: 9px;
    font-size: 10px;
    font-weight: 700;
    color: #fff;
  }

  /* ── OFFER BANNER ── */
  .offer-banner {
    background: linear-gradient(135deg, rgba(20,184,166,0.12) 0%, rgba(168,85,247,0.08) 100%);
    border: 1px solid rgba(45,212,191,0.25);
    border-radius: 20px;
    padding: 32px;
    margin-bottom: 24px;
    position: relative;
    overflow: hidden;
  }

  .offer-banner::before {
    content: '';
    position: absolute;
    top: -80px; right: -80px;
    width: 240px; height: 240px;
    background: radial-gradient(circle, rgba(20,184,166,0.1) 0%, transparent 70%);
    pointer-events: none;
  }

  .offer-banner-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 5px 12px;
    background: rgba(20,184,166,0.2);
    border: 1px solid rgba(45,212,191,0.3);
    border-radius: 20px;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #2dd4bf;
    margin-bottom: 16px;
  }

  .offer-banner-title {
    font-family: 'Syne', sans-serif;
    font-size: 22px;
    font-weight: 700;
    color: #fff;
    margin-bottom: 8px;
  }

  .offer-banner-amount {
    font-family: 'DM Sans', sans-serif;
    font-size: 40px;
    font-weight: 700;
    background: linear-gradient(135deg, #2dd4bf, #14B8A6);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: 12px;
    line-height: 1.1;
  }

  .offer-banner-desc {
    font-size: 14px;
    color: #9ba3b8;
    margin-bottom: 20px;
    line-height: 1.5;
  }

  .offer-countdown {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 20px;
    flex-wrap: wrap;
  }

  .offer-countdown-item {
    text-align: center;
    min-width: 56px;
  }

  .offer-countdown-num {
    font-family: 'DM Sans', sans-serif;
    font-size: 28px;
    font-weight: 700;
    color: #fff;
    line-height: 1;
  }

  .offer-countdown-label {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #7b8499;
    margin-top: 4px;
  }

  .offer-countdown-sep {
    font-size: 24px;
    color: #4b5568;
    font-weight: 300;
    margin-top: -8px;
  }

  .offer-claim-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 14px 28px;
    background: linear-gradient(135deg, #14B8A6, #0d9488);
    border: none;
    border-radius: 12px;
    color: #080d18;
    font-family: 'Syne', sans-serif;
    font-weight: 700;
    font-size: 15px;
    cursor: pointer;
    transition: opacity 0.2s, transform 0.1s;
    letter-spacing: 0.02em;
  }

  .offer-claim-btn:hover { opacity: 0.9; transform: translateY(-1px); }
  .offer-claim-btn:active { transform: translateY(0); }

  .offer-expired {
    font-size: 13px;
    color: #ef4444;
    font-weight: 500;
  }

  .offer-additional {
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px solid rgba(255,255,255,0.06);
  }

  .offer-additional-title {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #7b8499;
    font-weight: 600;
    margin-bottom: 12px;
  }

  .offer-additional-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 10px;
  }

  @media (min-width: 600px) {
    .offer-additional-grid { grid-template-columns: repeat(2, 1fr); }
  }

  .offer-additional-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 18px;
    background: rgba(8,13,24,0.6);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 12px;
  }

  .offer-additional-lender {
    font-size: 14px;
    font-weight: 600;
    color: #e8eaf0;
  }

  .offer-additional-amount {
    font-family: 'DM Sans', sans-serif;
    font-size: 16px;
    font-weight: 700;
    color: #2dd4bf;
  }

  .offer-additional-term {
    font-size: 11px;
    color: #7b8499;
    margin-top: 2px;
  }

  /* ── ACTIVITY FEED ── */
  .activity-feed {
    background: rgba(15,23,41,0.7);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 16px;
    padding: 24px 28px;
    margin-bottom: 20px;
  }

  .activity-feed-title {
    font-family: 'Syne', sans-serif;
    font-weight: 700;
    font-size: 16px;
    color: #e8eaf0;
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
  }

  .activity-feed-sub {
    font-size: 13px;
    color: #7b8499;
    margin-bottom: 20px;
  }

  .activity-item {
    display: flex;
    gap: 14px;
    padding: 14px 0;
    border-bottom: 1px solid rgba(255,255,255,0.04);
    position: relative;
  }

  .activity-item:last-child { border-bottom: none; }

  .activity-icon {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    font-size: 16px;
  }

  .activity-icon.dollar { background: rgba(52,211,153,0.12); color: #34d399; }
  .activity-icon.message { background: rgba(59,130,246,0.12); color: #60a5fa; }
  .activity-icon.star { background: rgba(251,191,36,0.12); color: #fbbf24; }
  .activity-icon.check { background: rgba(20,184,166,0.12); color: #2dd4bf; }

  .activity-content { flex: 1; min-width: 0; }

  .activity-title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    flex-wrap: wrap;
  }

  .activity-title {
    font-size: 14px;
    font-weight: 500;
    color: #e8eaf0;
  }

  .activity-time {
    font-size: 11px;
    color: #4b5568;
    flex-shrink: 0;
  }

  .activity-desc {
    font-size: 13px;
    color: #7b8499;
    margin-top: 3px;
    line-height: 1.4;
  }

  .activity-empty {
    text-align: center;
    padding: 32px 16px;
    color: #4b5568;
    font-size: 14px;
  }

  /* ── PAYOFF COUNTDOWN WIDGET ── */
  .payoff-countdown-widget {
    background: linear-gradient(135deg, rgba(15,23,41,0.9) 0%, rgba(20,184,166,0.06) 100%);
    border: 1px solid rgba(45,212,191,0.2);
    border-radius: 20px;
    padding: 32px;
    margin-bottom: 20px;
    text-align: center;
    position: relative;
    overflow: hidden;
  }

  .payoff-countdown-widget::after {
    content: '';
    position: absolute;
    bottom: -60px; left: 50%;
    transform: translateX(-50%);
    width: 300px; height: 150px;
    background: radial-gradient(ellipse, rgba(20,184,166,0.08) 0%, transparent 70%);
    pointer-events: none;
  }

  .payoff-countdown-days {
    font-family: 'DM Sans', sans-serif;
    font-size: 72px;
    font-weight: 700;
    line-height: 1;
    background: linear-gradient(135deg, #2dd4bf, #14B8A6, #0d9488);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: 4px;
  }

  .payoff-countdown-unit {
    font-size: 16px;
    font-weight: 600;
    color: #7b8499;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 16px;
  }

  .payoff-countdown-date {
    font-size: 14px;
    color: #9ba3b8;
    margin-bottom: 4px;
  }

  .payoff-countdown-date strong {
    color: #2dd4bf;
    font-weight: 600;
  }

  .payoff-countdown-sub {
    font-size: 12px;
    color: #4b5568;
  }

  /* ── APPLICATION STATUS BANNER ── */
  .app-status-banner {
    background: linear-gradient(135deg, rgba(59,130,246,0.08) 0%, rgba(20,184,166,0.06) 100%);
    border: 1px solid rgba(59,130,246,0.2);
    border-radius: 20px;
    padding: 32px;
    margin-bottom: 24px;
    position: relative;
    overflow: hidden;
  }

  .app-status-banner::before {
    content: '';
    position: absolute;
    top: -80px; right: -80px;
    width: 240px; height: 240px;
    background: radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%);
    pointer-events: none;
  }

  .app-status-title {
    font-family: 'Syne', sans-serif;
    font-size: 20px;
    font-weight: 700;
    color: #fff;
    margin-bottom: 6px;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .app-status-desc {
    font-size: 14px;
    color: #9ba3b8;
    margin-bottom: 24px;
    line-height: 1.5;
  }

  .app-status-steps {
    display: flex;
    gap: 8px;
    margin-bottom: 24px;
    flex-wrap: wrap;
  }

  .app-status-step {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    background: rgba(8,13,24,0.6);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 12px;
    flex: 1;
    min-width: 140px;
  }

  .app-status-step.done {
    border-color: rgba(52,211,153,0.3);
    background: rgba(52,211,153,0.06);
  }

  .app-status-step.current {
    border-color: rgba(59,130,246,0.3);
    background: rgba(59,130,246,0.06);
  }

  .app-status-step-icon {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    flex-shrink: 0;
  }

  .app-status-step-icon.done {
    background: rgba(52,211,153,0.2);
    color: #34d399;
  }

  .app-status-step-icon.current {
    background: rgba(59,130,246,0.2);
    color: #60a5fa;
  }

  .app-status-step-icon.pending {
    background: rgba(255,255,255,0.06);
    color: #4b5568;
  }

  .app-status-step-text {
    font-size: 13px;
    font-weight: 500;
  }

  .app-status-step-text.done { color: #34d399; }
  .app-status-step-text.current { color: #60a5fa; }
  .app-status-step-text.pending { color: #4b5568; }

  .app-status-cta {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 14px 28px;
    background: linear-gradient(135deg, #3b82f6, #2563eb);
    border: none;
    border-radius: 12px;
    color: #fff;
    font-family: 'Syne', sans-serif;
    font-weight: 700;
    font-size: 15px;
    cursor: pointer;
    transition: opacity 0.2s, transform 0.1s;
    letter-spacing: 0.02em;
    text-decoration: none;
  }

  .app-status-cta:hover { opacity: 0.9; transform: translateY(-1px); }
  .app-status-cta:active { transform: translateY(0); }

  .app-status-cta.secondary {
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.15);
    color: #e8eaf0;
    margin-left: 12px;
  }

  /* ── FINANCIALS TAB ─── */
  .financials-section {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 4px 0;
  }

  .insight-card {
    background: rgba(15, 23, 41, 0.7);
    border: 1px solid rgba(45, 212, 191, 0.15);
    border-radius: 16px;
    padding: 20px;
    backdrop-filter: blur(12px);
  }

  .health-indicator {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    margin: 0 auto;
    display: block;
  }
  .health-strong { background: linear-gradient(135deg, #14B8A6, #2dd4bf); box-shadow: 0 0 16px rgba(45, 212, 191, 0.4); }
  .health-moderate { background: linear-gradient(135deg, #f59e0b, #fbbf24); box-shadow: 0 0 16px rgba(245, 158, 11, 0.4); }
  .health-needs-attention { background: linear-gradient(135deg, #ef4444, #f87171); box-shadow: 0 0 16px rgba(239, 68, 68, 0.4); }

  .plaid-connection-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 0;
    border-bottom: 1px solid rgba(45, 212, 191, 0.08);
  }
  .plaid-connection-row:last-child { border-bottom: none; }

  .connect-bank-cta {
    background: linear-gradient(135deg, #14B8A6, #0d9488);
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 10px;
    font-family: 'DM Sans', sans-serif;
    font-weight: 600;
    font-size: 14px;
    cursor: pointer;
    transition: opacity 0.2s, transform 0.1s;
  }
  .connect-bank-cta:hover { opacity: 0.9; transform: translateY(-1px); }
  .connect-bank-cta:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

  .observation-badge {
    display: inline-block;
    padding: 5px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 500;
    line-height: 1.4;
  }
  .observation-positive {
    background: rgba(45, 212, 191, 0.12);
    border: 1px solid rgba(45, 212, 191, 0.25);
    color: #2dd4bf;
  }
  .observation-warning {
    background: rgba(245, 158, 11, 0.12);
    border: 1px solid rgba(245, 158, 11, 0.25);
    color: #fbbf24;
  }

  .renewal-nudge {
    background: rgba(45, 212, 191, 0.08);
    border: 1px solid rgba(45, 212, 191, 0.2);
    border-radius: 12px;
    padding: 16px 20px;
    font-size: 14px;
    color: #e8eaf0;
    cursor: pointer;
    transition: background 0.2s;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
  }
  .renewal-nudge:hover { background: rgba(45, 212, 191, 0.12); }

  .analyze-btn {
    background: rgba(45, 212, 191, 0.12);
    border: 1px solid rgba(45, 212, 191, 0.3);
    color: #2dd4bf;
    padding: 8px 16px;
    border-radius: 8px;
    font-family: 'DM Sans', sans-serif;
    font-weight: 500;
    font-size: 13px;
    cursor: pointer;
    transition: background 0.2s;
  }
  .analyze-btn:hover { background: rgba(45, 212, 191, 0.2); }
  .analyze-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  .skeleton-line {
    height: 14px;
    background: rgba(255, 255, 255, 0.06);
    border-radius: 6px;
    animation: pulse 1.5s ease-in-out infinite;
  }
  @keyframes pulse {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 0.8; }
  }
`;

// ── COMPONENTS ───────────────────────────────────────────────────────────

function ProgressBar({ pct, big = false }: { pct: number; big?: boolean }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(Math.min(pct, 100)), 100);
    return () => clearTimeout(t);
  }, [pct]);

  if (big) {
    return (
      <div className="tracker-big-bar">
        <div className="tracker-big-fill" style={{ width: `${width}%` }} />
      </div>
    );
  }

  return (
    <div className="progress-track">
      <div className="progress-fill" style={{ width: `${width}%` }} />
    </div>
  );
}

function DealCard({ deal, onClick }: { deal: Deal; onClick: (deal: Deal) => void }) {
  const calc = calcDeal(deal);
  return (
    <div className={`deal-card ${calc.isComplete ? "completed" : ""}`} onClick={() => onClick(deal)}>
      <div className="deal-card-header">
        <div>
          <div className="deal-lender">{deal.lender}</div>
          <div className="deal-funded-date">Funded {fmtDate(deal.fundedDate)}</div>
        </div>
        <span className={`deal-badge ${calc.isComplete ? "badge-complete" : "badge-active"}`}>
          {calc.isComplete ? "Paid Off" : "Active"}
        </span>
      </div>

      <div className="deal-stats-row">
        <div>
          <div className="deal-stat-label">Advance</div>
          <div className="deal-stat-val">{fmt$(deal.advanceAmount)}</div>
          <div className="deal-stat-sub">Funded amount</div>
        </div>
        <div>
          <div className="deal-stat-label">Total Payback</div>
          <div className="deal-stat-val">{fmt$(calc.totalPayback)}</div>
          <div className="deal-stat-sub">
            {fmt$(deal.advanceAmount)} &times; {deal.factorRate}x factor
          </div>
        </div>
        <div>
          <div className="deal-stat-label">Remaining</div>
          <div className={`deal-stat-val ${!calc.isComplete ? "teal" : ""}`}>
            {calc.isComplete ? "\u2014" : fmt$(calc.remaining)}
          </div>
          <div className="deal-stat-sub">
            {calc.isComplete ? "Paid in full" : "of total owed"}
          </div>
        </div>
      </div>

      <div className="progress-wrap">
        <div className="progress-label-row">
          <span>Paid off</span>
          <span className="progress-pct">{calc.pctComplete.toFixed(1)}%</span>
        </div>
        <ProgressBar pct={calc.pctComplete} />
      </div>

      <div className="deal-card-footer">
        <div>
          {!calc.isComplete ? (
            <>
              <div className="remaining-label">Est. payoff</div>
              <div className="remaining-amount">{fmtDate(calc.projectedPayoff)}</div>
            </>
          ) : (
            <div className="remaining-label">Position fully paid off</div>
          )}
        </div>
        <div className="view-detail">View details &rarr;</div>
      </div>
    </div>
  );
}

function DealDetail({ deal, onBack }: { deal: Deal; onBack: () => void }) {
  const calc = calcDeal(deal);

  return (
    <div>
      <button className="back-btn" onClick={onBack}>
        &larr; Back to my positions
      </button>

      <div className="detail-header">
        <div>
          <div className="detail-title">{deal.lender}</div>
          <div className="detail-sub">Funded {fmtDate(deal.fundedDate)} &middot; {deal.paymentFrequency.charAt(0).toUpperCase() + deal.paymentFrequency.slice(1)} payments &middot; {deal.term}</div>
        </div>
        <span className={`deal-badge ${calc.isComplete ? "badge-complete" : "badge-active"}`}>
          {calc.isComplete ? "Paid Off" : "Active"}
        </span>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-label">Advance Amount</div>
          <div className="stat-card-val">{fmt$(deal.advanceAmount)}</div>
          <div className="stat-card-sub">Original funded</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Total Payback</div>
          <div className="stat-card-val">{fmt$(calc.totalPayback)}</div>
          <div className="stat-card-sub">{deal.factorRate}x factor rate</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Per Payment</div>
          <div className="stat-card-val teal">{fmt$(calc.paymentAmount)}</div>
          <div className="stat-card-sub">{deal.paymentFrequency}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Payments Made</div>
          <div className="stat-card-val">{calc.paymentsMade}</div>
          <div className="stat-card-sub">of {calc.totalPayments} total</div>
        </div>
      </div>

      {calc.isComplete ? (
        <div className="completion-banner">
          <div className="completion-icon">&#10003;</div>
          <div className="completion-title">Position Fully Paid Off</div>
          <div className="completion-sub">This advance has been paid in full. Thank you for your business.</div>
        </div>
      ) : (
        <>
          <div className="tracker-card">
            <div className="tracker-pct-display">{calc.pctComplete.toFixed(1)}%</div>
            <div className="tracker-pct-label">of total payback complete</div>

            <ProgressBar pct={calc.pctComplete} big />

            <div className="tracker-amounts">
              <div className="tracker-paid">
                <strong>{fmt$(calc.amountPaid)}</strong> paid
              </div>
              <div className="tracker-total">
                {fmt$(calc.totalPayback)} total owed ({fmt$(deal.advanceAmount)} &times; {deal.factorRate}x)
              </div>
            </div>

            <div className="tracker-metrics">
              <div>
                <div className="tracker-metric-label">Remaining</div>
                <div className="tracker-metric-val">{fmt$(calc.remaining)}</div>
                <div className="tracker-metric-sub">balance left</div>
              </div>
              <div>
                <div className="tracker-metric-label">Payments Left</div>
                <div className="tracker-metric-val">{calc.paymentsRemaining}</div>
                <div className="tracker-metric-sub">{deal.paymentFrequency} payments</div>
              </div>
              <div>
                <div className="tracker-metric-label">Est. Payoff</div>
                <div className="tracker-metric-val" style={{ fontSize: "15px" }}>{fmtDate(calc.projectedPayoff)}</div>
                <div className="tracker-metric-sub">projected date</div>
              </div>
            </div>
          </div>

          <div className="balance-callout">
            <div>
              <div className="balance-left-label">Remaining Balance</div>
              <div className="balance-amount">{fmt$(calc.remaining)}</div>
              <div className="balance-sub">
                {fmt$(calc.amountPaid)} paid of {fmt$(calc.totalPayback)} total owed
                {" "}({fmt$(deal.advanceAmount)} funded &times; {deal.factorRate}x factor)
              </div>
            </div>
            <div className="payoff-date-wrap">
              <div className="payoff-date-label">Projected Payoff</div>
              <div className="payoff-date-val">{fmtDate(calc.projectedPayoff)}</div>
              <div className="payoff-date-sub">{calc.paymentsRemaining} {deal.paymentFrequency} payments remaining</div>
            </div>
          </div>
        </>
      )}

      {/* Payoff Countdown */}
      <PayoffCountdownWidget deal={deal} />

      {/* Payoff coverage from bank revenue (only shown if merchant has connected via Chirp) */}
      <PayoffCoverageInsight deal={deal} />

      {/* Renewal Eligibility Tracker */}
      <RenewalEligibilityTracker deal={deal} />

      <div className="contact-strip" style={{ marginTop: "20px" }}>
        <div className="contact-strip-text">
          Questions about your position?{" "}
          <strong>
            {deal.assignedRep
              ? `${deal.assignedRep} at Today Capital Group is here to help.`
              : "Your rep at Today Capital Group is here to help."}
          </strong>
        </div>
        <button
          className="contact-cta"
          onClick={() => {
            const subject = encodeURIComponent(`Question about my position — ${deal.lender}`);
            const body = encodeURIComponent(
              `Hi${deal.assignedRep ? ` ${deal.assignedRep.split(" ")[0]}` : ""},\n\nI have a question about my funded position with ${deal.lender}.\n\nBusiness: ${deal.businessName}\n\nThank you`
            );
            window.location.href = `mailto:info@todaycapitalgroup.com?subject=${subject}&body=${body}`;
          }}
        >
          Contact My Rep
        </button>
      </div>
    </div>
  );
}

// ── RENEWAL ELIGIBILITY TRACKER ──────────────────────────────────────────
function RenewalEligibilityTracker({ deal }: { deal: Deal }) {
  const calc = calcDeal(deal);
  const renewalThreshold = 65; // percent paid off to be eligible for renewal
  const isEligible = calc.pctComplete >= renewalThreshold;
  const progressToRenewal = Math.min((calc.pctComplete / renewalThreshold) * 100, 100);

  return (
    <div className="renewal-tracker">
      <div className="renewal-header">
        <div className="renewal-title">
          <span style={{ fontSize: "16px" }}>&#9733;</span>
          Renewal Eligibility
        </div>
        <span className={`renewal-badge ${isEligible ? "eligible" : "progress"}`}>
          {isEligible ? "Eligible" : `${calc.pctComplete.toFixed(0)}% of ${renewalThreshold}%`}
        </span>
      </div>

      <div className="renewal-bar-wrap">
        <div className="renewal-bar-labels">
          <span>Progress to renewal</span>
          <span className="renewal-bar-pct">{progressToRenewal.toFixed(0)}%</span>
        </div>
        <div className="renewal-bar-track">
          <div className="renewal-bar-fill" style={{ width: `${progressToRenewal}%` }} />
          <div className="renewal-bar-milestone" style={{ left: `${renewalThreshold}%` }} title={`${renewalThreshold}% threshold`} />
        </div>
      </div>

      {isEligible ? (
        <div className="renewal-eligible-msg" style={{ flexWrap: "wrap" }}>
          <span style={{ fontSize: "22px" }}>&#10003;</span>
          <div style={{ flex: 1 }}>
            <div className="renewal-eligible-msg-text">You qualify for a renewal or second position</div>
            <div className="renewal-eligible-msg-sub">You've hit the {renewalThreshold}% threshold. Claim your renewal offer now.</div>
          </div>
          <button
            className="offer-claim-btn"
            style={{ marginTop: "8px", fontSize: "12px", padding: "10px 20px" }}
            onClick={() => {
              const subject = encodeURIComponent(`Renewal inquiry — ${deal.businessName}`);
              const body = encodeURIComponent(
                `Hi,\n\nI've reached ${calc.pctComplete.toFixed(0)}% payoff on my position with ${deal.lender} and would like to discuss renewal options.\n\nBusiness: ${deal.businessName}\n\nThank you`
              );
              window.location.href = `mailto:info@todaycapitalgroup.com?subject=${subject}&body=${body}`;
            }}
          >
            Explore Renewal &rarr;
          </button>
        </div>
      ) : (
        <div className="renewal-detail">
          You'll be eligible for renewal at {renewalThreshold}% payoff — that's about{" "}
          <strong style={{ color: "#c084fc" }}>
            {fmt$(calc.totalPayback * (renewalThreshold / 100) - calc.amountPaid)}
          </strong>{" "}
          more in payments. At your current pace, you'll hit this around{" "}
          <strong style={{ color: "#c084fc" }}>
            {fmtDate((() => {
              const remainingToThreshold = Math.max(0, (calc.totalPayback * (renewalThreshold / 100)) - calc.amountPaid);
              const paymentsNeeded = Math.ceil(remainingToThreshold / calc.paymentAmount);
              const isDaily = deal.paymentFrequency === "daily";
              if (isDaily) return addBusinessDays(new Date(), paymentsNeeded);
              const isBiWeekly = deal.paymentFrequency === "bi-weekly" || deal.paymentFrequency === "biweekly";
              const isMonthly = deal.paymentFrequency === "monthly";
              const msPerPeriod = isMonthly ? 30 * 24 * 60 * 60 * 1000 : isBiWeekly ? 14 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
              return new Date(Date.now() + paymentsNeeded * msPerPeriod);
            })())}
          </strong>.
        </div>
      )}
    </div>
  );
}

// ── MERCHANT MESSAGING ──────────────────────────────────────────────────
interface Message {
  id: string;
  merchantEmail: string;
  dealId: string | null;
  senderRole: string;
  senderName: string | null;
  message: string;
  isRead: boolean;
  createdAt: string;
}

function MessagingPanel({ merchantEmail, merchantName, assignedRep, autoExpand = false, previewToken }: { merchantEmail: string; merchantName: string; assignedRep: string | null; autoExpand?: boolean; previewToken?: string | null }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [expanded, setExpanded] = useState(autoExpand);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  const previewHeaders = previewToken ? { "x-admin-preview-token": previewToken } : {};

  const fetchMessages = () => {
    setLoading(true);
    fetch("/api/merchant/messages", { headers: previewHeaders })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setMessages(data);
          setUnreadCount(0); // Messages are marked read on fetch
        }
      })
      .catch(err => console.error("Failed to fetch messages:", err))
      .finally(() => setLoading(false));
  };

  const fetchUnread = () => {
    fetch("/api/merchant/messages/unread", { headers: previewHeaders })
      .then(r => r.json())
      .then(data => setUnreadCount(data.count || 0))
      .catch(() => {});
  };

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (expanded) {
      fetchMessages();
    }
  }, [expanded]);

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!newMsg.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/merchant/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: newMsg.trim() }),
      });
      const data = await res.json();
      if (data.id) {
        setMessages(prev => [...prev, data]);
        setNewMsg("");
      }
    } catch {
      console.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const repName = assignedRep || "Today Capital Group";

  return (
    <div className="messaging-section">
      <div className="messaging-card">
        <div className="messaging-header" onClick={() => setExpanded(!expanded)}>
          <div className="messaging-header-left">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            <span className="messaging-header-title">
              Message {repName}
            </span>
            {unreadCount > 0 && <span className="messaging-unread">{unreadCount}</span>}
          </div>
          <span className="messaging-toggle">{expanded ? "Collapse" : "Expand"}</span>
        </div>

        {expanded && (
          <>
            <div className="messaging-body" ref={bodyRef}>
              {loading ? (
                <div className="messaging-empty">Loading messages...</div>
              ) : messages.length === 0 ? (
                <div className="messaging-empty">
                  No messages yet. Send a message to your rep and they'll respond here.
                </div>
              ) : (
                messages.map(msg => (
                  <div key={msg.id}>
                    <div className={`msg-bubble ${msg.senderRole === 'merchant' ? 'merchant' : 'rep'}`}>
                      {msg.message}
                    </div>
                    <div className={`msg-meta ${msg.senderRole === 'merchant' ? 'merchant' : ''}`}>
                      {msg.senderName || (msg.senderRole === 'merchant' ? 'You' : repName)} &middot;{" "}
                      {new Date(msg.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="messaging-input-wrap">
              <textarea
                className="messaging-input"
                placeholder="Type a message..."
                value={newMsg}
                onChange={e => setNewMsg(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                rows={1}
                maxLength={2000}
              />
              <button
                className="messaging-send"
                onClick={handleSend}
                disabled={!newMsg.trim() || sending}
              >
                {sending ? "..." : "Send"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── DOCUMENT VAULT ──────────────────────────────────────────────────────
interface VaultDocument {
  id: string;
  type: string;
  name: string;
  fileSize: number;
  category: 'closing' | 'statements';
  createdAt: string;
  downloadUrl: string | null;
}

function DocumentVault({ documents, loading }: { documents: VaultDocument[]; loading: boolean }) {
  if (loading) return null;

  const closingDocs = documents.filter(d => d.category === 'closing');
  const statementDocs = documents.filter(d => d.category === 'statements');

  if (documents.length === 0) return null;

  const iconForType = (type: string) => {
    if (type === 'voided_check') return { cls: 'check', label: '&#10003;' };
    if (type === 'drivers_license') return { cls: 'id', label: 'ID' };
    return { cls: 'statement', label: '&#9776;' };
  };

  const labelForType = (type: string) => {
    if (type === 'voided_check') return 'Voided Check';
    if (type === 'drivers_license') return "Driver's License";
    return 'Bank Statement';
  };

  const renderDoc = (doc: VaultDocument) => {
    const icon = iconForType(doc.type);
    const dateStr = new Date(doc.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const content = (
      <>
        <div className={`vault-icon ${icon.cls}`} dangerouslySetInnerHTML={{ __html: icon.label }} />
        <div className="vault-item-info">
          <div className="vault-item-name">{doc.name}</div>
          <div className="vault-item-meta">{labelForType(doc.type)} &middot; {dateStr} &middot; {fmtFileSize(doc.fileSize)}</div>
        </div>
        {doc.downloadUrl && <div className="vault-item-action">View &#8599;</div>}
      </>
    );

    if (doc.downloadUrl) {
      return (
        <a key={doc.id} className="vault-item" href={doc.downloadUrl} target="_blank" rel="noopener noreferrer">
          {content}
        </a>
      );
    }
    return <div key={doc.id} className="vault-item" style={{ opacity: 0.7 }}>{content}</div>;
  };

  return (
    <div className="vault-section">
      <div className="vault-card">
        <div className="vault-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2dd4bf" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
          Document Vault
        </div>
        <div className="vault-sub">All your funding documents securely stored in one place.</div>

        {closingDocs.length > 0 && (
          <>
            <div className="vault-category">Closing Documents</div>
            <div className="vault-grid">
              {closingDocs.map(renderDoc)}
            </div>
          </>
        )}

        {statementDocs.length > 0 && (
          <>
            <div className="vault-category">Bank Statements</div>
            <div className="vault-grid">
              {statementDocs.map(renderDoc)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── PRE-QUALIFIED OFFER BANNER ────────────────────────────────────────────
function PreQualifiedOfferBanner({ deals }: { deals: Deal[] }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Find the best active offer across all deals
  const activeOffers = deals
    .filter(d => d.maxUpsell && d.maxUpsell > 0)
    .sort((a, b) => (b.maxUpsell || 0) - (a.maxUpsell || 0));

  const bestOffer = activeOffers[0];
  if (!bestOffer) return null;

  const hasDeadline = bestOffer.approvalDeadline;
  const deadline = hasDeadline ? new Date(bestOffer.approvalDeadline!) : null;
  const isExpired = deadline ? now > deadline : false;

  // Calculate countdown
  let days = 0, hours = 0, minutes = 0, seconds = 0;
  if (deadline && !isExpired) {
    const diff = deadline.getTime() - now.getTime();
    days = Math.floor(diff / (1000 * 60 * 60 * 24));
    hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    minutes = Math.floor((diff / (1000 * 60)) % 60);
    seconds = Math.floor((diff / 1000) % 60);
  }

  // Collect additional approvals from all deals
  const allAdditionalApprovals = deals.flatMap(d => d.additionalApprovals || []);

  return (
    <div className="offer-banner">
      <div className="offer-banner-badge">
        <span style={{ fontSize: "14px" }}>&#9733;</span>
        Pre-Qualified Offer
      </div>

      <div className="offer-banner-title">You're pre-qualified for additional funding</div>
      <div className="offer-banner-amount">{fmt$(bestOffer.maxUpsell!)}</div>
      <div className="offer-banner-desc">
        Based on your payment history with {bestOffer.lender}, you qualify for up to {fmt$(bestOffer.maxUpsell!)} in additional capital.
        {deadline && !isExpired && " Claim before the deadline to lock in this offer."}
      </div>

      {deadline && !isExpired && (
        <div className="offer-countdown">
          <div className="offer-countdown-item">
            <div className="offer-countdown-num">{String(days).padStart(2, '0')}</div>
            <div className="offer-countdown-label">Days</div>
          </div>
          <div className="offer-countdown-sep">:</div>
          <div className="offer-countdown-item">
            <div className="offer-countdown-num">{String(hours).padStart(2, '0')}</div>
            <div className="offer-countdown-label">Hours</div>
          </div>
          <div className="offer-countdown-sep">:</div>
          <div className="offer-countdown-item">
            <div className="offer-countdown-num">{String(minutes).padStart(2, '0')}</div>
            <div className="offer-countdown-label">Min</div>
          </div>
          <div className="offer-countdown-sep">:</div>
          <div className="offer-countdown-item">
            <div className="offer-countdown-num">{String(seconds).padStart(2, '0')}</div>
            <div className="offer-countdown-label">Sec</div>
          </div>
        </div>
      )}

      {isExpired ? (
        <div className="offer-expired">This offer has expired. Contact your rep for current options.</div>
      ) : (
        <button
          className="offer-claim-btn"
          onClick={() => {
            const subject = encodeURIComponent(`I'd like to claim my pre-qualified offer — ${bestOffer.businessName}`);
            const body = encodeURIComponent(
              `Hi${bestOffer.assignedRep ? ` ${bestOffer.assignedRep.split(" ")[0]}` : ""},\n\nI'd like to learn more about my pre-qualified offer of ${fmt$(bestOffer.maxUpsell!)}.\n\nBusiness: ${bestOffer.businessName}\n\nThank you`
            );
            window.location.href = `mailto:info@todaycapitalgroup.com?subject=${subject}&body=${body}`;
          }}
        >
          Claim This Offer &rarr;
        </button>
      )}

      {allAdditionalApprovals.length > 0 && (
        <div className="offer-additional">
          <div className="offer-additional-title">Additional Lender Offers</div>
          <div className="offer-additional-grid">
            {allAdditionalApprovals.map((ap, i) => (
              <div key={i} className="offer-additional-card">
                <div>
                  <div className="offer-additional-lender">{ap.lender}</div>
                  <div className="offer-additional-term">
                    {ap.term || "Flexible terms"}{ap.factorRate ? ` · ${ap.factorRate}x` : ""}
                  </div>
                </div>
                <div className="offer-additional-amount">
                  {fmt$(typeof ap.amount === 'string' ? parseFloat(ap.amount) : ap.amount)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── CHIRP CONNECT BUTTON ──────────────────────────────────────────────────
// Replaces the previous PlaidLinkButton. Opens Chirp's hosted verification
// widget in a popup and polls our server for connection status. Once the
// merchant finishes verifying their bank on Chirp's side, we trigger a sync
// to populate our local snapshot so subsequent portal views are cheap.
function ChirpConnectButton({ onSuccess, label = "Connect Your Bank" }: { onSuccess: () => void; label?: string }) {
  const [starting, setStarting] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Phone capture: shown when server tells us a phone number is needed
  const [needsPhone, setNeedsPhone] = useState(false);
  const [phone, setPhone] = useState("");
  const pollRef = useRef<number | null>(null);
  const popupRef = useRef<Window | null>(null);

  useEffect(() => () => {
    if (pollRef.current) window.clearInterval(pollRef.current);
  }, []);

  const startPolling = useCallback(() => {
    setWaiting(true);
    let attempts = 0;
    const MAX_ATTEMPTS = 60; // ~5 minutes at 5s interval
    pollRef.current = window.setInterval(async () => {
      attempts += 1;
      try {
        const res = await fetch("/api/merchant/banking/insights", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          if (data.connected) {
            if (pollRef.current) window.clearInterval(pollRef.current);
            pollRef.current = null;
            setWaiting(false);
            onSuccess();
            return;
          }
        }
      } catch (_) { /* ignore transient errors */ }
      // If the popup was closed and we still have no connection, bail out.
      if (popupRef.current && popupRef.current.closed && attempts > 2) {
        // Try one sync pull before giving up, in case status just flipped.
        try {
          await fetch("/api/merchant/chirp/sync", { method: "POST", credentials: "include" });
        } catch (_) { /* ignore */ }
        const finalRes = await fetch("/api/merchant/banking/insights", { credentials: "include" });
        if (finalRes.ok) {
          const data = await finalRes.json();
          if (data.connected) {
            onSuccess();
          }
        }
        if (pollRef.current) window.clearInterval(pollRef.current);
        pollRef.current = null;
        setWaiting(false);
        return;
      }
      if (attempts >= MAX_ATTEMPTS) {
        if (pollRef.current) window.clearInterval(pollRef.current);
        pollRef.current = null;
        setWaiting(false);
      }
    }, 5000);
  }, [onSuccess]);

  const doConnect = useCallback(async (phoneOverride?: string) => {
    setStarting(true);
    setError(null);
    try {
      const res = await fetch("/api/merchant/chirp/connect", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(phoneOverride ? { phone: phoneOverride } : {}),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        // If the server says we need a phone number, show the inline form
        if (res.status === 400 && err.error?.toLowerCase().includes("phone")) {
          setNeedsPhone(true);
          setStarting(false);
          return;
        }
        throw new Error(err.error || "Could not start bank connection.");
      }
      const data = await res.json();
      const url = data.widgetUrl || data.verificationUrl;
      if (!url) throw new Error("Chirp did not return a connection URL.");

      setNeedsPhone(false);
      popupRef.current = window.open(url, "chirp-connect", "width=480,height=720,menubar=no,toolbar=no");
      if (!popupRef.current) {
        // Popup blocked — fall back to a new tab.
        window.open(url, "_blank", "noopener,noreferrer");
      }
      startPolling();
    } catch (e: any) {
      setError(e.message || "Could not start bank connection.");
    } finally {
      setStarting(false);
    }
  }, [startPolling]);

  const handleConnect = useCallback(() => doConnect(), [doConnect]);

  const handlePhoneSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) {
      setError("Please enter a valid 10-digit phone number.");
      return;
    }
    setError(null);
    doConnect(digits.length === 10 ? `+1${digits}` : `+${digits}`);
  }, [phone, doConnect]);

  if (needsPhone) {
    return (
      <div style={{ maxWidth: 340 }}>
        <p style={{ color: "#94a3b8", fontSize: 13, marginBottom: 10 }}>
          We need a phone number to verify your identity with Chirp. This won't be shared with anyone else.
        </p>
        <form onSubmit={handlePhoneSubmit} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <input
            type="tel"
            placeholder="(555) 000-0000"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              border: "1.5px solid #334155",
              background: "#1e293b",
              color: "#f8fafc",
              fontSize: 14,
              outline: "none",
            }}
            autoFocus
          />
          {error && <p style={{ color: "#f87171", fontSize: 12, margin: 0 }}>{error}</p>}
          <button
            type="submit"
            className="connect-bank-cta"
            disabled={starting}
            style={{ marginTop: 4 }}
          >
            {starting ? "Connecting..." : "Continue →"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div>
      <button className="connect-bank-cta" onClick={handleConnect} disabled={starting || waiting}>
        {starting ? "Initializing..." : waiting ? "Waiting for Chirp..." : label}
      </button>
      {waiting && (
        <p style={{ color: "#94a3b8", fontSize: 12, marginTop: 8 }}>
          Finish connecting in the Chirp window — we'll update this page automatically.
        </p>
      )}
      {error && <p style={{ color: "#f87171", fontSize: 13, marginTop: 8 }}>{error}</p>}
    </div>
  );
}

// ── FINANCIALS TAB ────────────────────────────────────────────────────────
interface StatementFile {
  id: string;
  fileName: string;
  fileSize: number;
  uploadedAt: string | null;
  viewToken: string | null;
}

interface FinancialInsights {
  hasStatements: boolean;
  hasPlaidConnection: boolean;
  pdfInsights: {
    cashFlowHealth: 'strong' | 'moderate' | 'needs-attention';
    estimatedMonthlyRevenue: number;
    averageDailyBalance: number;
    positiveIndicators: string[];
    concerns: string[];
    tips: string[];
    summary: string;
    analyzedAt: string;
  } | null;
  plaidInsights: {
    accounts: { name: string; type: string; currentBalance: number; institutionName: string }[];
    monthlyRevenue: number;
    avgBalance: number;
    revenueTrend: 'growing' | 'stable' | 'declining';
    lastUpdated: string;
  } | null;
  renewalNudge: { eligible: boolean; message: string };
  statements: StatementFile[];
}

interface BankingInsights {
  connected: boolean;
  hasPendingConnection?: boolean;
  status?: string | null;
  institutionName?: string | null;
  connectedAt?: string | null;
  lastSyncedAt?: string | null;
  accounts?: Array<{ name: string; type: string; balance: number }>;
  metrics?: {
    monthlyRevenue: number;
    monthlyExpenses: number;
    netCashFlow: number;
    avgBalance: number;
    currentBalance: number;
    monthsAnalyzed: number;
    revenueTrend?: "growing" | "stable" | "declining" | null;
    healthScore?: number;
  };
}

type DataSource = "chirp" | "statements";

function FinancialsTab({ merchantEmail, merchantName, assignedRep, onSwitchToMessages, previewToken, uploadedStatements }: {
  merchantEmail: string;
  merchantName: string;
  assignedRep: string | null;
  onSwitchToMessages: () => void;
  previewToken?: string | null;
  uploadedStatements?: VaultDocument[];
}) {
  const [insights, setInsights] = useState<FinancialInsights | null>(null);
  const [banking, setBanking] = useState<BankingInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [showBanks, setShowBanks] = useState(false);
  const [dataSource, setDataSource] = useState<DataSource>("chirp");

  const previewHeaders = previewToken ? { "x-admin-preview-token": previewToken } : {};

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [insightsRes, bankingRes] = await Promise.all([
        fetch("/api/merchant/financial-insights", { credentials: "include", headers: previewHeaders }),
        fetch("/api/merchant/banking/insights", { credentials: "include", headers: previewHeaders }),
      ]);
      if (insightsRes.ok) setInsights(await insightsRes.json());
      if (bankingRes.ok) setBanking(await bankingRes.json());
    } catch (e) {
      console.error("Failed to load financial data:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    setSyncError(null);
    try {
      const res = await fetch("/api/merchant/chirp/sync", { method: "POST", credentials: "include" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Sync failed");
      }
      await fetchData();
    } catch (e: any) {
      setSyncError(e.message || "Sync failed");
    } finally {
      setSyncing(false);
    }
  }, [fetchData]);

  const handleDisconnectChirp = useCallback(async () => {
    try {
      await fetch("/api/merchant/chirp/connection", { method: "DELETE", credentials: "include" });
      await fetchData();
    } catch (e) {
      console.error("Failed to disconnect Chirp:", e);
    }
  }, [fetchData]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // When the portal loads and we have a pending connection (requestCode exists
  // but not yet confirmed), auto-register the webhook so Chirp can push the
  // status update to us even if the server can't poll Chirp's read API.
  useEffect(() => {
    if (banking?.hasPendingConnection) {
      fetch("/api/merchant/chirp/register-webhook", {
        method: "POST",
        credentials: "include",
      }).catch(() => {});
    }
  }, [banking?.hasPendingConnection]);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setAnalyzeError(null);
    try {
      const res = await fetch("/api/merchant/bank-statements/analyze", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Analysis failed");
      }
      await fetchData(); // Refresh insights
    } catch (e: any) {
      setAnalyzeError(e.message || "Analysis failed. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="financials-section">
        <div className="insight-card" style={{ textAlign: "center", padding: 40 }}>
          <div className="skeleton-line" style={{ width: "60%", margin: "0 auto 12px" }} />
          <div className="skeleton-line" style={{ width: "40%", margin: "0 auto 12px" }} />
          <div className="skeleton-line" style={{ width: "50%", margin: "0 auto" }} />
        </div>
      </div>
    );
  }

  const hasAnyData = insights?.pdfInsights || insights?.plaidInsights || (banking?.connected && banking?.metrics);
  const pdf = insights?.pdfInsights;
  const plaid = insights?.plaidInsights;
  const chirpConnected = Boolean(banking?.connected);
  const chirpMetrics = banking?.metrics;

  // Merge statement sources: prefer vault docs passed from parent (already verified working),
  // fall back to what financial-insights returned
  const vaultStatements: StatementFile[] = (uploadedStatements || []).map(d => ({
    id: d.id,
    fileName: d.name,
    fileSize: d.fileSize,
    uploadedAt: d.createdAt,
    viewToken: d.downloadUrl ? d.downloadUrl.split('/').pop() || null : null,
  }));
  const displayStatements: StatementFile[] =
    vaultStatements.length > 0 ? vaultStatements : (insights?.statements || []);
  const showStatementsSection = displayStatements.length > 0 || insights?.hasStatements;

  // Determine which data sources are available
  const hasChirpData = chirpConnected && chirpMetrics && chirpMetrics.monthlyRevenue > 0;
  const hasPdfData = Boolean(pdf?.estimatedMonthlyRevenue);
  const hasBothSources = hasChirpData && hasPdfData;

  // Auto-select best source if user hasn't toggled, or if selected source has no data
  const activeSource = hasBothSources ? dataSource : hasChirpData ? "chirp" : hasPdfData ? "statements" : "chirp";

  // Compute metrics based on active data source
  const useChirp = activeSource === "chirp" && (hasChirpData || chirpConnected);
  const monthlyRevenue = useChirp
    ? (chirpMetrics?.monthlyRevenue || plaid?.monthlyRevenue || 0)
    : (pdf?.estimatedMonthlyRevenue || plaid?.monthlyRevenue || 0);
  const monthlyExpenses = useChirp ? (chirpMetrics?.monthlyExpenses || 0) : 0;
  const netCashFlow = useChirp ? (chirpMetrics?.netCashFlow || 0) : 0;
  const avgBalance = useChirp
    ? (chirpMetrics?.avgBalance || plaid?.avgBalance || 0)
    : (pdf?.averageDailyBalance || plaid?.avgBalance || 0);
  const currentBalance = useChirp ? (chirpMetrics?.currentBalance || 0) : 0;
  const revenueTrend = useChirp ? (chirpMetrics?.revenueTrend || plaid?.revenueTrend || null) : (plaid?.revenueTrend || null);
  const healthScore = useChirp ? (chirpMetrics?.healthScore || 0) : 0;
  const monthsAnalyzed = useChirp ? (chirpMetrics?.monthsAnalyzed || 0) : 0;
  const cashFlowHealth = useChirp
    ? (chirpConnected || plaid ? 'moderate' : null)
    : (pdf?.cashFlowHealth || null);
  const dataSourceLabel = useChirp ? "Live Bank Data" : "Statement Analysis";

  // Relative time helper for data freshness
  const timeAgoShort = (ts: string | null | undefined) => {
    if (!ts) return null;
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  // Health score label
  const healthLabel = healthScore >= 70 ? "Strong" : healthScore >= 45 ? "Moderate" : healthScore > 0 ? "Needs Attention" : null;
  const healthColor = healthScore >= 70 ? "#2dd4bf" : healthScore >= 45 ? "#facc15" : "#f87171";
  const trendIcon = revenueTrend === "growing" ? "\u2197" : revenueTrend === "declining" ? "\u2198" : revenueTrend === "stable" ? "\u2192" : "";
  const trendColor = revenueTrend === "growing" ? "#2dd4bf" : revenueTrend === "declining" ? "#f87171" : "#94a3b8";

  return (
    <div className="financials-section">
      {/* ── Bank Connection (Chirp) ── */}
      <div className="insight-card" style={{ padding: 0 }}>
        <button
          onClick={() => setShowBanks(prev => !prev)}
          data-testid="button-toggle-connected-banks"
          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", background: "none", border: "none", cursor: "pointer", padding: "16px 20px", textAlign: "left" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 600, margin: 0 }}>
              Bank Connection
            </h3>
            {chirpConnected && (
              <span style={{ background: "rgba(45,212,191,0.15)", color: "#2dd4bf", borderRadius: 20, padding: "2px 10px", fontSize: 12, fontWeight: 600 }}>
                Connected
              </span>
            )}
            {!chirpConnected && banking?.hasPendingConnection && (
              <span style={{ background: "rgba(251,191,36,0.15)", color: "#fbbf24", borderRadius: 20, padding: "2px 10px", fontSize: 12, fontWeight: 600 }}>
                Pending
              </span>
            )}
          </div>
          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: showBanks ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease", flexShrink: 0 }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        {showBanks && (
          <div style={{ padding: "0 20px 20px" }}>
            {chirpConnected ? (
              <>
                <div className="plaid-connection-row">
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span className="health-indicator health-strong" style={{ width: 8, height: 8 }} />
                    <span style={{ fontWeight: 500 }}>{banking?.institutionName || "Connected Bank"}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 13, color: "#94a3b8" }}>
                    {banking?.lastSyncedAt && (
                      <span>Updated {new Date(banking.lastSyncedAt).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
                {banking?.accounts && banking.accounts.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    {banking.accounts.map((acct, i) => (
                      <div key={i} className="plaid-connection-row" style={{ padding: "6px 0" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontWeight: 500, fontSize: 13 }}>{acct.name}</span>
                          {acct.type && (
                            <span style={{ color: "#94a3b8", fontSize: 11 }}>{acct.type}</span>
                          )}
                        </div>
                        <span style={{ fontWeight: 600, color: "#2dd4bf", fontSize: 13 }}>
                          ${Number(acct.balance).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12 }}>
                  <button
                    className="analyze-btn"
                    onClick={handleSync}
                    disabled={syncing}
                    style={{ fontSize: 12, padding: "8px 14px" }}
                  >
                    {syncing ? "Syncing..." : "Sync now"}
                  </button>
                  <button
                    onClick={handleDisconnectChirp}
                    style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: 12 }}
                  >
                    Disconnect
                  </button>
                </div>
                {syncError && <p style={{ color: "#f87171", fontSize: 12, marginTop: 8 }}>{syncError}</p>}
              </>
            ) : banking?.hasPendingConnection ? (
              <div style={{ textAlign: "center", padding: "24px 16px" }}>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
                <p style={{ color: "#e8eaf0", fontSize: 15, fontWeight: 600, marginBottom: 6 }}>
                  Awaiting Bank Verification
                </p>
                <p style={{ color: "#94a3b8", fontSize: 13, lineHeight: 1.7, marginBottom: 16, maxWidth: 320, margin: "0 auto 16px" }}>
                  You started linking your bank account. Once Chirp confirms the connection, your financial data will appear here automatically.
                </p>
                <p style={{ color: "#64748b", fontSize: 12, marginBottom: 16 }}>
                  Status: <span style={{ color: "#fbbf24" }}>{banking.status || "Unverified"}</span>
                </p>
                <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
                  <ChirpConnectButton onSuccess={fetchData} label="Reconnect Bank" />
                  <button
                    className="analyze-btn"
                    onClick={handleSync}
                    disabled={syncing}
                    style={{ fontSize: 12, padding: "8px 14px" }}
                    data-testid="button-retry-sync"
                  >
                    {syncing ? "Checking..." : "Check Status"}
                  </button>
                </div>
                {syncError && <p style={{ color: "#f87171", fontSize: 12, marginTop: 8 }}>{syncError}</p>}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <p style={{ color: "#e8eaf0", marginBottom: 8, fontSize: 14, lineHeight: 1.6, fontWeight: 500 }}>
                  Connect your bank to unlock your financial dashboard.
                </p>
                <ul style={{ color: "#94a3b8", fontSize: 13, lineHeight: 1.8, textAlign: "left", display: "inline-block", margin: "8px 0 16px", paddingLeft: 18 }}>
                  <li>Live revenue &amp; expense tracking</li>
                  <li>Cash flow trends month over month</li>
                  <li>See how your deposits stack up against your payments</li>
                  <li>Faster approvals on renewals &mdash; no re-uploading statements</li>
                </ul>
                <ChirpConnectButton onSuccess={fetchData} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Uploaded Statements ── */}
      {showStatementsSection && (
        <div className="insight-card">
          <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
            Uploaded Statements
          </h3>

          {/* File list */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
            {displayStatements.map(stmt => (
              <div key={stmt.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: "rgba(255,255,255,0.04)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2dd4bf" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                  </svg>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 200 }}>
                      {stmt.fileName}
                    </p>
                    <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                      {stmt.uploadedAt ? new Date(stmt.uploadedAt).toLocaleDateString() : "Uploaded"}
                      {stmt.fileSize ? ` · ${(stmt.fileSize / 1024).toFixed(0)} KB` : ""}
                    </p>
                  </div>
                </div>
                {stmt.viewToken && (
                  <a
                    href={`/api/bank-statements/public/view/${stmt.viewToken}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: 12, color: "#2dd4bf", textDecoration: "none", flexShrink: 0, marginLeft: 8 }}
                  >
                    View
                  </a>
                )}
              </div>
            ))}
          </div>

          {/* Analyze / re-analyze */}
          {pdf ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
              <span style={{ color: "#94a3b8", fontSize: 13 }}>
                Last analyzed: {new Date(pdf.analyzedAt).toLocaleDateString()}
              </span>
              <button className="analyze-btn" onClick={handleAnalyze} disabled={analyzing}>
                {analyzing ? "Re-analyzing..." : "Re-analyze"}
              </button>
            </div>
          ) : (
            <div style={{ textAlign: "center", paddingTop: 4 }}>
              <p style={{ color: "#94a3b8", marginBottom: 12, fontSize: 14 }}>
                Click below to generate insights from your bank statements.
              </p>
              <button className="analyze-btn" onClick={handleAnalyze} disabled={analyzing}>
                {analyzing ? "Analyzing..." : "Analyze My Statements"}
              </button>
              {analyzeError && <p style={{ color: "#f87171", fontSize: 13, marginTop: 8 }}>{analyzeError}</p>}
            </div>
          )}
        </div>
      )}

      {/* ── Financial Insights ── */}
      {hasAnyData ? (
        <>
          {/* Data Source Toggle — only shown when both Chirp and PDF data exist */}
          {hasBothSources && (
            <div className="insight-card" style={{ padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ color: "#94a3b8", fontSize: 13 }}>Data Source</span>
              <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)" }}>
                <button
                  onClick={() => setDataSource("chirp")}
                  style={{
                    padding: "6px 14px", fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer",
                    background: activeSource === "chirp" ? "#2dd4bf" : "transparent",
                    color: activeSource === "chirp" ? "#0f172a" : "#94a3b8",
                  }}
                >
                  Live Bank Data
                </button>
                <button
                  onClick={() => setDataSource("statements")}
                  style={{
                    padding: "6px 14px", fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer",
                    background: activeSource === "statements" ? "#2dd4bf" : "transparent",
                    color: activeSource === "statements" ? "#0f172a" : "#94a3b8",
                  }}
                >
                  Statement Analysis
                </button>
              </div>
            </div>
          )}

          {/* Financial Health Score + Data Freshness */}
          {(healthScore > 0 || cashFlowHealth || monthlyRevenue > 0) && (
            <div className="insight-card">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 600, margin: 0 }}>
                  Financial Health
                  {hasBothSources && (
                    <span style={{ fontSize: 11, color: "#64748b", fontWeight: 400, marginLeft: 8 }}>
                      ({dataSourceLabel})
                    </span>
                  )}
                </h3>
                {banking?.lastSyncedAt && useChirp && (
                  <span style={{ color: "#64748b", fontSize: 11 }}>
                    Updated {timeAgoShort(banking.lastSyncedAt)}
                    {monthsAnalyzed > 0 && ` \u00B7 ${monthsAnalyzed} mo analyzed`}
                  </span>
                )}
              </div>
              {healthScore > 0 ? (
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  {/* Score circle */}
                  <div style={{
                    width: 72, height: 72, borderRadius: "50%",
                    border: `3px solid ${healthColor}`,
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 24, fontWeight: 700, color: healthColor, lineHeight: 1 }}>
                      {healthScore}
                    </span>
                    <span style={{ fontSize: 9, color: "#94a3b8", marginTop: 2 }}>/ 100</span>
                  </div>
                  <div>
                    <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 600, color: healthColor, marginBottom: 4 }}>
                      {healthLabel}
                    </p>
                    <p style={{ color: "#94a3b8", fontSize: 12, lineHeight: 1.5 }}>
                      {healthScore >= 70
                        ? "Your cash flow and balances show a healthy financial position."
                        : healthScore >= 45
                        ? "Your financials are in a reasonable range with room for improvement."
                        : "There may be some areas to focus on to strengthen your position."}
                    </p>
                    {revenueTrend && (
                      <p style={{ fontSize: 12, marginTop: 6 }}>
                        Revenue trend: <span style={{ color: trendColor, fontWeight: 600 }}>{trendIcon} {revenueTrend}</span>
                      </p>
                    )}
                  </div>
                </div>
              ) : cashFlowHealth ? (
                <div style={{ textAlign: "center" }}>
                  <div className={`health-indicator health-${cashFlowHealth}`} />
                  <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 600, marginTop: 8, textTransform: "capitalize" }}>
                    {cashFlowHealth === 'needs-attention' ? 'Needs Attention' : cashFlowHealth}
                  </p>
                </div>
              ) : null}
            </div>
          )}

          {/* Revenue, Expenses, Cash Flow, Balance — 2x2 grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="insight-card" style={{ textAlign: "center" }}>
              <p style={{ color: "#94a3b8", fontSize: 12, marginBottom: 4 }}>Monthly Revenue</p>
              <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 700, color: "#2dd4bf" }}>
                ${monthlyRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
              {revenueTrend && (
                <p style={{ color: trendColor, fontSize: 11, fontWeight: 600, marginTop: 4 }}>
                  {trendIcon} {revenueTrend}
                </p>
              )}
            </div>
            <div className="insight-card" style={{ textAlign: "center" }}>
              <p style={{ color: "#94a3b8", fontSize: 12, marginBottom: 4 }}>Monthly Expenses</p>
              <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 700, color: monthlyExpenses > 0 ? "#e8eaf0" : "#64748b" }}>
                {monthlyExpenses > 0 ? `$${monthlyExpenses.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "\u2014"}
              </p>
            </div>
            <div className="insight-card" style={{ textAlign: "center" }}>
              <p style={{ color: "#94a3b8", fontSize: 12, marginBottom: 4 }}>Net Cash Flow</p>
              <p style={{
                fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 700,
                color: netCashFlow > 0 ? "#2dd4bf" : netCashFlow < 0 ? "#f87171" : "#64748b",
              }}>
                {netCashFlow !== 0
                  ? `${netCashFlow >= 0 ? "+" : "-"}$${Math.abs(netCashFlow).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                  : "\u2014"}
              </p>
              {netCashFlow !== 0 && <p style={{ color: "#4b5568", fontSize: 10, marginTop: 4 }}>revenue - expenses / mo</p>}
            </div>
            <div className="insight-card" style={{ textAlign: "center" }}>
              <p style={{ color: "#94a3b8", fontSize: 12, marginBottom: 4 }}>Current Balance</p>
              <p style={{
                fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 700,
                color: currentBalance > 0 ? "#2dd4bf" : currentBalance < 0 ? "#f87171" : "#64748b",
              }}>
                {currentBalance !== 0 ? `$${currentBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "\u2014"}
              </p>
              {avgBalance > 0 && (
                <p style={{ color: "#4b5568", fontSize: 10, marginTop: 4 }}>
                  avg daily: ${avgBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
              )}
            </div>
          </div>

          {/* Account Balances (Plaid) */}
          {plaid && plaid.accounts.length > 0 && (
            <div className="insight-card">
              <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
                Account Balances
              </h3>
              {plaid.accounts.map((acct, i) => (
                <div key={i} className="plaid-connection-row">
                  <div>
                    <span style={{ fontWeight: 500 }}>{acct.name}</span>
                    <span style={{ color: "#94a3b8", fontSize: 12, marginLeft: 8 }}>{acct.type}</span>
                  </div>
                  <span style={{ fontWeight: 600, color: "#2dd4bf" }}>
                    ${acct.currentBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Transaction History (scaffold — populates once Chirp details endpoint is unblocked) */}
          {chirpConnected && (
            <div className="insight-card">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 600, margin: 0 }}>
                  Recent Transactions
                </h3>
              </div>
              <div style={{ textAlign: "center", padding: "20px 0", color: "#64748b", fontSize: 13 }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#4b5568" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 8, display: "block", margin: "0 auto 8px" }}>
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
                </svg>
                <p>Transaction details will appear here once your bank data finishes syncing.</p>
                <button
                  className="analyze-btn"
                  onClick={handleSync}
                  disabled={syncing}
                  style={{ fontSize: 12, padding: "8px 14px", marginTop: 12 }}
                >
                  {syncing ? "Syncing..." : "Sync Now"}
                </button>
              </div>
            </div>
          )}

          {/* Key Observations */}
          {pdf && (pdf.positiveIndicators.length > 0 || pdf.concerns.length > 0) && (
            <div className="insight-card">
              <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
                Key Observations
              </h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {pdf.positiveIndicators.map((item, i) => (
                  <span key={`pos-${i}`} className="observation-badge observation-positive">{item}</span>
                ))}
                {pdf.concerns.map((item, i) => (
                  <span key={`warn-${i}`} className="observation-badge observation-warning">{item}</span>
                ))}
              </div>
            </div>
          )}

          {/* Tips */}
          {pdf && pdf.tips.length > 0 && (
            <div className="insight-card">
              <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
                Tips to Strengthen Your Position
              </h3>
              <ul style={{ paddingLeft: 18, lineHeight: 1.8, color: "#94a3b8", fontSize: 14 }}>
                {pdf.tips.map((tip, i) => <li key={i}>{tip}</li>)}
              </ul>
            </div>
          )}

          {/* Summary */}
          {pdf?.summary && (
            <div className="insight-card">
              <p style={{ lineHeight: 1.7, fontSize: 14, color: "#94a3b8" }}>{pdf.summary}</p>
            </div>
          )}
        </>
      ) : (
        <div className="insight-card" style={{ textAlign: "center", padding: "32px 20px" }}>
          <p style={{ color: "#94a3b8", fontSize: 15, lineHeight: 1.7 }}>
            {showStatementsSection
              ? "Click 'Analyze' above to generate insights from your bank statements."
              : "Upload bank statements or connect your bank to see financial insights."}
          </p>
        </div>
      )}

      {/* ── Renewal Nudge ── */}
      {(insights?.renewalNudge?.eligible || (chirpConnected && monthlyRevenue > 10000 && healthScore >= 60)) && (
        <div className="renewal-nudge" onClick={onSwitchToMessages} role="button" tabIndex={0}>
          <span>{insights?.renewalNudge?.message || "Your financials look great! You may qualify for additional funding."}</span>
          <span style={{ color: "#2dd4bf", fontWeight: 600, marginLeft: 8, cursor: "pointer" }}>Talk to your rep &rarr;</span>
        </div>
      )}
    </div>
  );
}

// ── ACTIVITY FEED ─────────────────────────────────────────────────────────
function ActivityFeed({ merchantEmail, previewToken }: { merchantEmail: string; previewToken?: string | null }) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const headers = previewToken ? { "x-admin-preview-token": previewToken } : {};
    fetch("/api/merchant/activity", { headers })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setActivities(data); })
      .catch(err => console.error("Failed to fetch activity:", err))
      .finally(() => setLoading(false));
  }, [merchantEmail, previewToken]);

  const iconContent: Record<string, string> = {
    dollar: '$',
    message: '\u2709',
    star: '\u2605',
    check: '\u2713',
  };

  const timeAgo = (ts: string) => {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return fmtDate(ts);
  };

  if (loading) return null;

  return (
    <div className="activity-feed">
      <div className="activity-feed-title">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2dd4bf" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
        Activity
      </div>
      <div className="activity-feed-sub">Recent updates and milestones for your account</div>

      {activities.length === 0 ? (
        <div className="activity-empty">No activity yet. Your milestones will appear here.</div>
      ) : (
        activities.slice(0, 15).map(item => (
          <div key={item.id} className="activity-item">
            <div className={`activity-icon ${item.icon}`}>
              {iconContent[item.icon] || '\u2022'}
            </div>
            <div className="activity-content">
              <div className="activity-title-row">
                <div className="activity-title">{item.title}</div>
                <div className="activity-time">{timeAgo(item.timestamp)}</div>
              </div>
              <div className="activity-desc">{item.description}</div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ── PAYOFF COUNTDOWN WIDGET ───────────────────────────────────────────────
function PayoffCountdownWidget({ deal }: { deal: Deal }) {
  const calc = calcDeal(deal);
  if (calc.isComplete) return null;

  const now = new Date();
  const payoff = calc.projectedPayoff;
  const diffMs = payoff.getTime() - now.getTime();
  const daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

  return (
    <div className="payoff-countdown-widget">
      <div className="payoff-countdown-days">{daysLeft}</div>
      <div className="payoff-countdown-unit">Days Remaining</div>
      <div className="payoff-countdown-date">
        Estimated payoff: <strong>{fmtDate(payoff)}</strong>
      </div>
      <div className="payoff-countdown-sub">
        {calc.paymentsRemaining} {deal.paymentFrequency} payments &middot; {fmt$(calc.remaining)} of {fmt$(calc.totalPayback)} owed ({deal.factorRate}x factor)
      </div>
    </div>
  );
}

// ── PAYOFF COVERAGE INSIGHT ───────────────────────────────────────────────
// Uses cached Chirp banking data to show how well the merchant's typical
// monthly revenue covers this deal's monthly payment load. Renders nothing
// until the merchant has connected their bank.
function PayoffCoverageInsight({ deal }: { deal: Deal }) {
  const [banking, setBanking] = useState<BankingInsights | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/merchant/banking/insights", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setBanking(data); })
      .catch(() => { /* silent — tile just won't render */ })
      .finally(() => setLoaded(true));
  }, []);

  if (!loaded) return null;
  if (!banking?.connected || !banking.metrics?.monthlyRevenue) return null;

  const calc = calcDeal(deal);
  if (calc.isComplete) return null;

  // Normalize the payment amount to a monthly equivalent so the comparison
  // works regardless of payment frequency (daily ACH vs. monthly ACH).
  const freq = deal.paymentFrequency;
  const paymentsPerMonth =
    freq === "daily" ? 21 :
    freq === "weekly" ? 4.33 :
    freq === "bi-weekly" || freq === "biweekly" ? 2.17 :
    1;
  const monthlyPaymentLoad = calc.paymentAmount * paymentsPerMonth;
  const monthlyRevenue = banking.metrics.monthlyRevenue;
  const coverageMultiple = monthlyPaymentLoad > 0 ? monthlyRevenue / monthlyPaymentLoad : 0;
  const paymentShareOfRevenue = monthlyRevenue > 0 ? (monthlyPaymentLoad / monthlyRevenue) * 100 : 0;

  // Simple health label — not financial advice, just a visual cue.
  const health: "strong" | "moderate" | "tight" =
    coverageMultiple >= 10 ? "strong" :
    coverageMultiple >= 5 ? "moderate" :
    "tight";
  const healthColor = health === "strong" ? "#2dd4bf" : health === "moderate" ? "#facc15" : "#f87171";
  const healthLabel = health === "strong" ? "Healthy coverage" : health === "moderate" ? "Comfortable coverage" : "Tight coverage";

  return (
    <div className="insight-card" style={{ marginTop: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 600, margin: 0 }}>
          Payment Coverage
        </h3>
        <span style={{ color: healthColor, fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {healthLabel}
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <div>
          <div style={{ color: "#94a3b8", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>
            Monthly Revenue
          </div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 700, color: "#2dd4bf" }}>
            {fmt$(monthlyRevenue)}
          </div>
        </div>
        <div>
          <div style={{ color: "#94a3b8", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>
            Monthly Payment Load
          </div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 700, color: "#e8eaf0" }}>
            {fmt$(monthlyPaymentLoad)}
          </div>
        </div>
        <div>
          <div style={{ color: "#94a3b8", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>
            Coverage
          </div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 700, color: healthColor }}>
            {coverageMultiple.toFixed(1)}&times;
          </div>
        </div>
      </div>
      {/* Expenses context — show how much revenue is left after both expenses and loan payments */}
      {banking.metrics.monthlyExpenses > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
          <div>
            <div style={{ color: "#94a3b8", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>
              Operating Expenses
            </div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 700, color: "#e8eaf0" }}>
              {fmt$(banking.metrics.monthlyExpenses)}
            </div>
          </div>
          <div>
            <div style={{ color: "#94a3b8", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>
              After Expenses + Payment
            </div>
            <div style={{
              fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 700,
              color: (monthlyRevenue - banking.metrics.monthlyExpenses - monthlyPaymentLoad) >= 0 ? "#2dd4bf" : "#f87171",
            }}>
              {fmt$(Math.max(0, monthlyRevenue - banking.metrics.monthlyExpenses - monthlyPaymentLoad))}
            </div>
          </div>
        </div>
      )}
      <div style={{ marginTop: 12, padding: "10px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 8, fontSize: 12, color: "#94a3b8", lineHeight: 1.5 }}>
        Your payments on this position take up about <strong style={{ color: "#e8eaf0" }}>{paymentShareOfRevenue.toFixed(1)}%</strong> of your average monthly revenue. Based on bank data from {banking.institutionName || "your connected bank"}.
      </div>
    </div>
  );
}

// ── APPLICATION STATUS BANNER ──────────────────────────────────────────────
function ApplicationStatusBanner({ appStatus }: {
  appStatus: {
    hasApplication: boolean;
    applicationId?: number;
    businessName?: string;
    isIntakeCompleted?: boolean;
    isFullApplicationCompleted?: boolean;
    currentStep?: number;
    bankStatementsUploaded?: boolean;
    bankStatementCount?: number;
  };
}) {
  if (!appStatus.hasApplication) {
    // No application yet - show prompt to start
    return (
      <div className="app-status-banner">
        <div className="app-status-title">
          <span style={{ fontSize: "22px" }}>&#128221;</span>
          Start Your Funding Application
        </div>
        <div className="app-status-desc">
          Get started with your business funding application. It takes just a few minutes to see what you qualify for.
        </div>
        <a href="/" className="app-status-cta" style={{ textDecoration: "none" }}>
          Start Application &rarr;
        </a>
      </div>
    );
  }

  const steps = [
    { label: "Interest Form", done: !!appStatus.isIntakeCompleted },
    { label: "Full Application", done: !!appStatus.isFullApplicationCompleted },
    { label: "Bank Statements", done: !!appStatus.bankStatementsUploaded },
  ];

  // Determine the current step
  let currentIdx = steps.findIndex(s => !s.done);
  if (currentIdx === -1) currentIdx = steps.length; // all done

  // If everything is done, don't show this banner
  if (steps.every(s => s.done)) return null;

  // Determine CTA
  let ctaHref = "/";
  let ctaLabel = "Continue Application";
  if (!appStatus.isIntakeCompleted) {
    ctaHref = "/intake/quiz";
    ctaLabel = "Complete Interest Form";
  } else if (!appStatus.isFullApplicationCompleted) {
    ctaHref = "/";
    ctaLabel = "Complete Application";
  } else if (!appStatus.bankStatementsUploaded) {
    ctaHref = "/upload-statements";
    ctaLabel = "Upload Bank Statements";
  }

  return (
    <div className="app-status-banner">
      <div className="app-status-title">
        <span style={{ fontSize: "22px" }}>&#128203;</span>
        {appStatus.businessName ? `${appStatus.businessName} — Application Progress` : "Your Application Progress"}
      </div>
      <div className="app-status-desc">
        {!appStatus.isFullApplicationCompleted
          ? "Complete your application to move forward with funding. Pick up right where you left off."
          : "Your application is submitted! Upload your bank statements to speed up the review process."
        }
      </div>

      <div className="app-status-steps">
        {steps.map((step, i) => {
          const status = step.done ? 'done' : i === currentIdx ? 'current' : 'pending';
          return (
            <div key={step.label} className={`app-status-step ${status}`}>
              <div className={`app-status-step-icon ${status}`}>
                {step.done ? '\u2713' : i === currentIdx ? '\u25CF' : String(i + 1)}
              </div>
              <div className={`app-status-step-text ${status}`}>{step.label}</div>
            </div>
          );
        })}
      </div>

      <div>
        <a href={ctaHref} className="app-status-cta" style={{ textDecoration: "none" }}>
          {ctaLabel} &rarr;
        </a>
        {appStatus.isFullApplicationCompleted && !appStatus.bankStatementsUploaded && (
          <a href="/connect-bank" className="app-status-cta secondary" style={{ textDecoration: "none" }}>
            Connect Bank Instead
          </a>
        )}
      </div>
    </div>
  );
}

// ── RESOURCES TAB ────────────────────────────────────────────────────────
function ResourcesTab() {
  const resources = [
    {
      category: "Credit Monitoring",
      items: [
        {
          title: "Nav.com — Free Business Credit Scores",
          description: "See your Dun & Bradstreet and Experian business credit scores for free. Understand what lenders see when they review your business.",
          url: "https://www.nav.com/business-credit-scores/",
          tag: "Free",
          tagColor: "#34d399",
        },
        {
          title: "Experian Business Credit",
          description: "Monitor your Experian business credit profile. Get alerts when your score changes and see what factors are impacting it.",
          url: "https://www.experian.com/business/check-business-credit.html",
          tag: "Free Report",
          tagColor: "#60a5fa",
        },
        {
          title: "Dun & Bradstreet — Get Your D-U-N-S Number",
          description: "A D-U-N-S number is essential for building business credit. Get yours for free if you don't have one yet.",
          url: "https://www.dnb.com/duns-number/get-a-duns.html",
          tag: "Free",
          tagColor: "#34d399",
        },
      ],
    },
    {
      category: "SBA & Government Programs",
      items: [
        {
          title: "SBA Loan Programs Overview",
          description: "Explore SBA 7(a), 504, and Microloan programs. Government-backed loans with lower rates and longer terms for qualifying businesses.",
          url: "https://www.sba.gov/funding-programs/loans",
          tag: "Gov",
          tagColor: "#a78bfa",
        },
        {
          title: "Grants.gov — Federal Business Grants",
          description: "Search for federal grant opportunities. Unlike loans, grants don't need to be repaid.",
          url: "https://www.grants.gov/",
          tag: "Grants",
          tagColor: "#fbbf24",
        },
      ],
    },
    {
      category: "Financial Tools",
      items: [
        {
          title: "Wave — Free Accounting Software",
          description: "Free invoicing, accounting, and receipt scanning for small businesses. No credit card required.",
          url: "https://www.waveapps.com/",
          tag: "Free",
          tagColor: "#34d399",
        },
        {
          title: "IRS Tax Calendar for Businesses",
          description: "Never miss a tax deadline. See all federal tax due dates for your business type at a glance.",
          url: "https://www.irs.gov/businesses/small-businesses-self-employed/tax-calendars",
          tag: "IRS",
          tagColor: "#a78bfa",
        },
      ],
    },
    {
      category: "Business Growth",
      items: [
        {
          title: "Google Business Profile",
          description: "Claim and optimize your free Google Business listing. Show up in local search results and Google Maps.",
          url: "https://business.google.com/",
          tag: "Free",
          tagColor: "#34d399",
        },
        {
          title: "NEXT Insurance — Business Insurance",
          description: "Get affordable business insurance in minutes. General liability, professional liability, workers' comp, and more.",
          url: "https://www.nextinsurance.com/",
          tag: "Quote",
          tagColor: "#60a5fa",
        },
      ],
    },
  ];

  return (
    <div className="resources-section">
      <div className="resources-intro">
        <div className="resources-intro-icon">&#128218;</div>
        <div>
          <div className="resources-intro-title">Business Resources</div>
          <div className="resources-intro-sub">
            Free tools and resources to help you monitor credit, find funding programs, and grow your business.
          </div>
        </div>
      </div>

      {resources.map((group) => (
        <div key={group.category} className="resources-group">
          <div className="resources-group-title">{group.category}</div>
          <div className="resources-grid">
            {group.items.map((item) => (
              <a
                key={item.title}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="resource-card"
              >
                <div className="resource-card-header">
                  <div className="resource-card-title">{item.title}</div>
                  <div className="resource-tag" style={{ background: `${item.tagColor}20`, color: item.tagColor, borderColor: `${item.tagColor}40` }}>
                    {item.tag}
                  </div>
                </div>
                <div className="resource-card-desc">{item.description}</div>
                <div className="resource-card-link">
                  Visit &rarr;
                </div>
              </a>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ForgotPasswordScreen({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleReset = async () => {
    if (!email) {
      setError("Please enter your email address.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/merchant/reset-password/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.success) {
        setSent(true);
      } else {
        setError(data.error || "Something went wrong. Please try again.");
      }
    } catch {
      setError("Request failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-mark">TCG</div>
          <div>
            <div className="login-logo-text">Today Capital Group</div>
            <div className="login-logo-sub">Merchant Portal</div>
          </div>
        </div>

        {sent ? (
          <>
            <div className="login-title">Check Your Email</div>
            <div className="login-sub" style={{ marginBottom: "24px" }}>
              If an account exists with that email, we've sent a password reset link. Please check your inbox.
            </div>
            <button className="login-btn" onClick={onBack}>
              Back to Sign In
            </button>
          </>
        ) : (
          <>
            <div className="login-title">Reset Password</div>
            <div className="login-sub">Enter your email and we'll send you a link to reset your password.</div>

            <label className="field-label">Email address</label>
            <input
              className="field-input"
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(""); }}
              placeholder="you@yourbusiness.com"
              onKeyDown={e => e.key === "Enter" && handleReset()}
            />

            {error && <div className="login-error">{error}</div>}

            <button
              className="login-btn"
              onClick={handleReset}
              disabled={loading}
              style={{ marginTop: error ? "16px" : "0" }}
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </button>

            <div className="login-hint">
              <button
                onClick={onBack}
                style={{ background: "none", border: "none", color: "#14B8A6", cursor: "pointer", fontFamily: "inherit", fontSize: "12px" }}
              >
                Back to Sign In
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);

  if (showForgot) {
    return <ForgotPasswordScreen onBack={() => setShowForgot(false)} />;
  }

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/merchant/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.success) {
        onLogin();
      } else {
        setError(data.error || "Invalid email or password.");
      }
    } catch {
      setError("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-mark">TCG</div>
          <div>
            <div className="login-logo-text">Today Capital Group</div>
            <div className="login-logo-sub">Merchant Portal</div>
          </div>
        </div>

        <div className="login-title">Welcome back</div>
        <div className="login-sub">Sign in to track your funded position</div>

        <label className="field-label">Email address</label>
        <input
          className="field-input"
          type="email"
          value={email}
          onChange={e => { setEmail(e.target.value); setError(""); }}
          placeholder="you@yourbusiness.com"
        />

        <label className="field-label">Password</label>
        <input
          className="field-input"
          type="password"
          value={password}
          onChange={e => { setPassword(e.target.value); setError(""); }}
          placeholder="••••••••"
          onKeyDown={e => e.key === "Enter" && handleLogin()}
        />

        {error && <div className="login-error">{error}</div>}

        <button
          className="login-btn"
          onClick={handleLogin}
          disabled={loading}
          style={{ marginTop: error ? "16px" : "0" }}
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>

        <div className="login-hint" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
          <button
            onClick={() => setShowForgot(true)}
            style={{ background: "none", border: "none", color: "#14B8A6", cursor: "pointer", fontFamily: "inherit", fontSize: "12px" }}
          >
            Forgot your password?
          </button>
          <span>
            Don't have an account? Your login is created automatically<br />when your deal is funded. Contact your rep for help.
          </span>
        </div>
      </div>
    </div>
  );
}

// ── MAIN APP ─────────────────────────────────────────────────────────────
function fmtFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MerchantPortal() {
  const [authChecked, setAuthChecked] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [isAdminPreview, setIsAdminPreview] = useState(false);
  const [adminPreviewToken, setAdminPreviewToken] = useState<string | null>(null);
  const [merchantEmail, setMerchantEmail] = useState("");
  const [merchantName, setMerchantName] = useState("");
  const [deals, setDeals] = useState<Deal[]>([]);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [loadingDeals, setLoadingDeals] = useState(false);
  const [statements, setStatements] = useState<BankStatement[]>([]);
  const [loadingStatements, setLoadingStatements] = useState(false);
  const [vaultDocs, setVaultDocs] = useState<VaultDocument[]>([]);
  const [loadingVault, setLoadingVault] = useState(false);
  const [activeTab, setActiveTab] = useState<'positions' | 'messages' | 'documents' | 'financials' | 'resources'>('positions');
  const [appStatus, setAppStatus] = useState<{
    hasApplication: boolean;
    applicationId?: number;
    businessName?: string;
    isIntakeCompleted?: boolean;
    isFullApplicationCompleted?: boolean;
    currentStep?: number;
    bankStatementsUploaded?: boolean;
    bankStatementCount?: number;
  } | null>(null);

  // Check for admin preview token in URL — fetches bundled data without touching session
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const previewToken = params.get('adminPreview');
    if (previewToken) {
      setIsAdminPreview(true);
      setAdminPreviewToken(previewToken);
      fetch(`/api/merchant/admin-preview-data?token=${encodeURIComponent(previewToken)}`)
        .then(r => r.json())
        .then(data => {
          if (data.error) {
            setAuthChecked(true);
            return;
          }
          setMerchantEmail(data.merchant?.email || '');
          setMerchantName(data.merchant?.name || '');
          if (Array.isArray(data.deals)) setDeals(data.deals);
          if (Array.isArray(data.statements)) setStatements(data.statements);
          if (Array.isArray(data.documents)) setVaultDocs(data.documents);
          setLoggedIn(true);
          setAuthChecked(true);
        })
        .catch(() => setAuthChecked(true));
      return; // Skip normal auth check
    }

    // Normal auth check
    fetch("/api/merchant/auth/check")
      .then(r => r.json())
      .then(data => {
        if (data.isAuthenticated) {
          setLoggedIn(true);
          setMerchantEmail(data.email || "");
          setMerchantName(data.name || "");
        }
        setAuthChecked(true);
      })
      .catch(() => setAuthChecked(true));
  }, []);

  // Fetch deals and statements when logged in (skip in admin preview — data already loaded)
  useEffect(() => {
    if (!loggedIn || isAdminPreview) return;

    setLoadingDeals(true);
    fetch("/api/merchant/deals")
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setDeals(data); })
      .catch(err => console.error("Failed to fetch deals:", err))
      .finally(() => setLoadingDeals(false));

    setLoadingStatements(true);
    fetch("/api/merchant/statements")
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setStatements(data); })
      .catch(err => console.error("Failed to fetch statements:", err))
      .finally(() => setLoadingStatements(false));

    setLoadingVault(true);
    fetch("/api/merchant/documents")
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setVaultDocs(data); })
      .catch(err => console.error("Failed to fetch vault docs:", err))
      .finally(() => setLoadingVault(false));

    // Fetch application status (for non-funded merchants)
    fetch("/api/merchant/application-status")
      .then(r => r.json())
      .then(data => setAppStatus(data))
      .catch(() => {});
  }, [loggedIn, isAdminPreview]);

  const handleLogin = () => {
    // Re-check auth to get merchant info
    fetch("/api/merchant/auth/check")
      .then(r => r.json())
      .then(data => {
        setMerchantEmail(data.email || "");
        setMerchantName(data.name || "");
        setLoggedIn(true);
      });
  };

  const handleLogout = () => {
    fetch("/api/merchant/auth/logout", { method: "POST" }).then(() => {
      setLoggedIn(false);
      setSelectedDeal(null);
      setDeals([]);
      setStatements([]);
      setVaultDocs([]);
      setMerchantEmail("");
      setMerchantName("");
      setActiveTab('positions');
      setAppStatus(null);
    });
  };

  if (!authChecked) {
    return (
      <div className="merchant-portal">
        <style>{CSS}</style>
        <div className="portal-root">
          <div className="loading-wrap">Loading...</div>
        </div>
      </div>
    );
  }

  const activeDeals = deals.filter(d => d.status === "active");
  const completedDeals = deals.filter(d => d.status === "completed");

  return (
    <div className="merchant-portal">
      <style>{CSS}</style>

      <div className="portal-root">
        {!loggedIn ? (
          <LoginScreen onLogin={handleLogin} />
        ) : (
          <>
            {isAdminPreview && (
              <div style={{
                background: '#f59e0b',
                color: '#000',
                padding: '8px 20px',
                fontSize: '13px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                justifyContent: 'center',
                letterSpacing: '0.01em',
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                Admin Preview Mode — this is how {merchantName || merchantEmail} sees their portal. Token expires in 30 minutes.
                <button onClick={() => window.close()} style={{ marginLeft: 'auto', background: 'rgba(0,0,0,0.15)', border: 'none', borderRadius: '4px', padding: '2px 10px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>Close Tab</button>
              </div>
            )}
            <header className="header">
              <div className="header-logo">
                <div className="header-logo-mark">TCG</div>
                <div className="header-brand">Today Capital Group</div>
              </div>
              <div className="header-right">
                <span className="header-user">{merchantEmail}</span>
                {!isAdminPreview && (
                  <button className="logout-btn" onClick={handleLogout}>
                    Sign out
                  </button>
                )}
              </div>
            </header>

            <div className="page-wrap">
              {selectedDeal ? (
                <DealDetail deal={selectedDeal} onBack={() => { setSelectedDeal(null); setActiveTab('positions'); }} />
              ) : (
                <>
                  <div className="page-title">My Portal</div>
                  <div className="page-subtitle">
                    Hello, {merchantName ? merchantName.split(" ")[0] : "there"}. Welcome to your funded merchant portal.
                  </div>

                  {/* Navigation Tabs */}
                  <div className="portal-nav">
                    <button
                      className={`portal-nav-btn ${activeTab === 'positions' ? 'active' : ''}`}
                      onClick={() => setActiveTab('positions')}
                    >
                      Positions
                    </button>
                    <button
                      className={`portal-nav-btn ${activeTab === 'messages' ? 'active' : ''}`}
                      onClick={() => setActiveTab('messages')}
                    >
                      Messages
                    </button>
                    <button
                      className={`portal-nav-btn ${activeTab === 'documents' ? 'active' : ''}`}
                      onClick={() => setActiveTab('documents')}
                    >
                      Documents
                    </button>
                    <button
                      className={`portal-nav-btn ${activeTab === 'financials' ? 'active' : ''}`}
                      onClick={() => setActiveTab('financials')}
                    >
                      Financials
                    </button>
                    <button
                      className={`portal-nav-btn ${activeTab === 'resources' ? 'active' : ''}`}
                      onClick={() => setActiveTab('resources')}
                    >
                      Resources
                    </button>
                  </div>

                  {/* ── POSITIONS TAB ── */}
                  {activeTab === 'positions' && (
                    <>
                      {/* Application Status Banner - for non-funded merchants */}
                      {!loadingDeals && appStatus && appStatus.hasApplication && deals.length === 0 && (
                        <ApplicationStatusBanner appStatus={appStatus} />
                      )}
                      {!loadingDeals && appStatus && !appStatus.hasApplication && deals.length === 0 && (
                        <ApplicationStatusBanner appStatus={appStatus} />
                      )}
                      {/* Application progress for funded merchants who haven't uploaded statements */}
                      {!loadingDeals && appStatus && appStatus.hasApplication && deals.length > 0 && !appStatus.bankStatementsUploaded && appStatus.isFullApplicationCompleted && (
                        <ApplicationStatusBanner appStatus={appStatus} />
                      )}

                      {/* Pre-Qualified Offer Banner */}
                      {!loadingDeals && deals.length > 0 && (
                        <PreQualifiedOfferBanner deals={deals} />
                      )}

                      {/* Payoff Countdown Widget - show for primary active deal */}
                      {!loadingDeals && activeDeals.length > 0 && (
                        <PayoffCountdownWidget deal={activeDeals[0]} />
                      )}

                      {/* Activity Feed */}
                      {!loadingDeals && deals.length > 0 && (
                        <ActivityFeed merchantEmail={merchantEmail} previewToken={adminPreviewToken} />
                      )}

                      {loadingDeals ? (
                        <div className="loading-wrap" style={{ minHeight: "200px" }}>Loading your positions...</div>
                      ) : deals.length === 0 ? (
                        <div className="no-documents" style={{ marginTop: appStatus?.hasApplication ? "8px" : "0" }}>
                          {appStatus?.hasApplication
                            ? "Your funded positions will appear here once your deal closes."
                            : "No funded deals found for your account yet."}
                        </div>
                      ) : (
                        <>
                          {activeDeals.length > 0 && (
                            <>
                              <div className="section-label">Active</div>
                              <div className="deals-grid">
                                {activeDeals.map(d => (
                                  <DealCard key={d.id} deal={d} onClick={setSelectedDeal} />
                                ))}
                              </div>
                            </>
                          )}

                          {completedDeals.length > 0 && (
                            <>
                              <div className="section-label">Completed</div>
                              <div className="deals-grid">
                                {completedDeals.map(d => (
                                  <DealCard key={d.id} deal={d} onClick={setSelectedDeal} />
                                ))}
                              </div>
                            </>
                          )}
                        </>
                      )}
                    </>
                  )}

                  {/* ── MESSAGES TAB ── */}
                  {activeTab === 'messages' && (
                    <MessagingPanel
                      merchantEmail={merchantEmail}
                      merchantName={merchantName}
                      assignedRep={deals.length > 0 ? deals[0].assignedRep : null}
                      autoExpand
                      previewToken={adminPreviewToken}
                    />
                  )}

                  {/* ── DOCUMENTS TAB ── */}
                  {activeTab === 'documents' && (
                    <DocumentVault documents={vaultDocs} loading={loadingVault} />
                  )}

                  {/* ── FINANCIALS TAB ── */}
                  {activeTab === 'financials' && (
                    <FinancialsTab
                      merchantEmail={merchantEmail}
                      merchantName={merchantName}
                      assignedRep={deals.length > 0 ? deals[0].assignedRep : null}
                      onSwitchToMessages={() => setActiveTab('messages')}
                      previewToken={adminPreviewToken}
                      uploadedStatements={vaultDocs.filter(d => d.category === 'statements')}
                    />
                  )}

                  {/* ── RESOURCES TAB ── */}
                  {activeTab === 'resources' && (
                    <ResourcesTab />
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
