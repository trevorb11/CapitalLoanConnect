import { useState, useEffect, useRef, useCallback } from "react";
import { usePlaidLink } from "react-plaid-link";

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
  const totalPayback = deal.totalPayback || deal.advanceAmount * deal.factorRate;
  const isDaily = deal.paymentFrequency === "daily";

  let paymentsMade: number, paymentAmount: number, totalPayments: number;

  const isWeekly = deal.paymentFrequency === "weekly";
  const isBiWeekly = deal.paymentFrequency === "bi-weekly" || deal.paymentFrequency === "biweekly";
  const isMonthly = deal.paymentFrequency === "monthly";

  if (isDaily) {
    totalPayments = businessDaysBetween(funded, new Date(funded.getTime() + 180 * 24 * 60 * 60 * 1000));
    paymentAmount = totalPayback / totalPayments;
    paymentsMade = businessDaysBetween(funded, today);
  } else {
    const termMonths = deal.term ? parseInt(deal.term) : 6;
    const paymentsPerMonth = isWeekly ? 4.33 : isBiWeekly ? 2 : 1;
    totalPayments = Math.round(termMonths * paymentsPerMonth);
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

  /* ── EARLY PAYOFF CALCULATOR ── */
  .payoff-calc {
    background: rgba(15,23,41,0.7);
    border: 1px solid rgba(45,212,191,0.15);
    border-radius: 16px;
    padding: 28px;
    margin-top: 20px;
  }

  .payoff-calc-title {
    font-family: 'Syne', sans-serif;
    font-weight: 700;
    font-size: 16px;
    color: #e8eaf0;
    margin-bottom: 6px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .payoff-calc-sub {
    font-size: 13px;
    color: #7b8499;
    margin-bottom: 20px;
  }

  .payoff-slider-wrap {
    margin-bottom: 20px;
  }

  .payoff-slider-label {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: #7b8499;
    margin-bottom: 8px;
  }

  .payoff-slider-val {
    font-weight: 600;
    color: #2dd4bf;
  }

  .payoff-slider {
    width: 100%;
    -webkit-appearance: none;
    appearance: none;
    height: 8px;
    background: rgba(255,255,255,0.07);
    border-radius: 99px;
    outline: none;
    cursor: pointer;
  }

  .payoff-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: linear-gradient(135deg, #14B8A6, #2dd4bf);
    cursor: pointer;
    box-shadow: 0 0 12px rgba(45,212,191,0.5);
  }

  .payoff-slider::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: linear-gradient(135deg, #14B8A6, #2dd4bf);
    cursor: pointer;
    border: none;
    box-shadow: 0 0 12px rgba(45,212,191,0.5);
  }

  .payoff-results {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    padding-top: 20px;
    border-top: 1px solid rgba(255,255,255,0.06);
  }

  .payoff-result-card {
    text-align: center;
  }

  .payoff-result-label {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: #7b8499;
    margin-bottom: 4px;
    font-weight: 600;
  }

  .payoff-result-val {
    font-family: 'DM Sans', sans-serif;
    font-weight: 700;
    font-size: 20px;
    color: #e8eaf0;
  }

  .payoff-result-val.savings { color: #34d399; }
  .payoff-result-val.teal { color: #2dd4bf; }

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
        </div>
        <div>
          <div className="deal-stat-label">Total Payback</div>
          <div className="deal-stat-val">{fmt$(calc.totalPayback)}</div>
        </div>
        <div>
          <div className="deal-stat-label">Remaining</div>
          <div className={`deal-stat-val ${!calc.isComplete ? "teal" : ""}`}>
            {calc.isComplete ? "\u2014" : fmt$(calc.remaining)}
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
              <div className="tracker-total">{fmt$(calc.totalPayback)} total</div>
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
              <div className="balance-sub">{fmt$(calc.amountPaid)} paid of {fmt$(calc.totalPayback)} total</div>
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

      {/* Early Payoff Calculator */}
      <EarlyPayoffCalculator deal={deal} />

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

// ── EARLY PAYOFF CALCULATOR ──────────────────────────────────────────────
function EarlyPayoffCalculator({ deal }: { deal: Deal }) {
  const calc = calcDeal(deal);
  if (calc.isComplete) return null;

  const minDays = 1;
  const maxDays = calc.paymentsRemaining;
  const [earlyDays, setEarlyDays] = useState(Math.floor(maxDays * 0.5));

  // Calculate savings if paying off early
  const earlyPaymentsRemaining = Math.max(0, calc.paymentsRemaining - earlyDays);
  const earlyAmountPaid = calc.amountPaid + (earlyDays * calc.paymentAmount);
  const earlyBuyoutAmount = Math.max(0, calc.remaining - (earlyDays * calc.paymentAmount));
  const savings = calc.remaining - earlyBuyoutAmount;
  const isDaily = deal.paymentFrequency === "daily";

  let earlyPayoffDate: Date;
  if (isDaily) {
    earlyPayoffDate = addBusinessDays(new Date(), earlyDays);
  } else {
    const isBiWeekly = deal.paymentFrequency === "bi-weekly" || deal.paymentFrequency === "biweekly";
    const isMonthly = deal.paymentFrequency === "monthly";
    const msPerPeriod = isMonthly ? 30 * 24 * 60 * 60 * 1000 : isBiWeekly ? 14 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
    earlyPayoffDate = new Date(Date.now() + earlyDays * msPerPeriod);
  }

  const freqLabel = isDaily ? "business days" : deal.paymentFrequency === "monthly" ? "months" : "payments";

  return (
    <div className="payoff-calc">
      <div className="payoff-calc-title">
        <span style={{ fontSize: "18px" }}>&#9889;</span>
        Early Payoff Calculator
      </div>
      <div className="payoff-calc-sub">
        Slide to see how much you save by paying off early. Contact your rep for an exact buyout quote.
      </div>

      <div className="payoff-slider-wrap">
        <div className="payoff-slider-label">
          <span>Pay off in <span className="payoff-slider-val">{earlyDays} {freqLabel}</span></span>
          <span>Instead of {calc.paymentsRemaining} remaining</span>
        </div>
        <input
          className="payoff-slider"
          type="range"
          min={minDays}
          max={maxDays}
          value={earlyDays}
          onChange={e => setEarlyDays(parseInt(e.target.value))}
        />
      </div>

      <div className="payoff-results">
        <div className="payoff-result-card">
          <div className="payoff-result-label">Buyout Amount</div>
          <div className="payoff-result-val teal">{fmt$(earlyBuyoutAmount)}</div>
        </div>
        <div className="payoff-result-card">
          <div className="payoff-result-label">You Save</div>
          <div className="payoff-result-val savings">{fmt$(savings)}</div>
        </div>
        <div className="payoff-result-card">
          <div className="payoff-result-label">Payoff Date</div>
          <div className="payoff-result-val" style={{ fontSize: "15px" }}>{fmtDate(earlyPayoffDate)}</div>
        </div>
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

function MessagingPanel({ merchantEmail, merchantName, assignedRep, autoExpand = false }: { merchantEmail: string; merchantName: string; assignedRep: string | null; autoExpand?: boolean }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [expanded, setExpanded] = useState(autoExpand);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  const fetchMessages = () => {
    setLoading(true);
    fetch("/api/merchant/messages")
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
    fetch("/api/merchant/messages/unread")
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

// ── PLAID LINK BUTTON ─────────────────────────────────────────────────────
function PlaidLinkButton({ onSuccess, label = "Connect Your Bank" }: { onSuccess: () => void; label?: string }) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLinkToken = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/merchant/plaid/create-link-token", { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error("Failed to create link token");
      const data = await res.json();
      setLinkToken(data.link_token);
    } catch (e) {
      setError("Could not initialize bank connection. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  const onPlaidSuccess = useCallback(async (publicToken: string, metadata: any) => {
    try {
      const res = await fetch("/api/merchant/plaid/exchange-token", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicToken, metadata }),
      });
      if (!res.ok) throw new Error("Failed to exchange token");
      onSuccess();
    } catch (e) {
      setError("Bank connection failed. Please try again.");
    }
  }, [onSuccess]);

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: onPlaidSuccess,
  });

  return (
    <div>
      {!linkToken ? (
        <button className="connect-bank-cta" onClick={fetchLinkToken} disabled={loading}>
          {loading ? "Initializing..." : label}
        </button>
      ) : (
        <button className="connect-bank-cta" onClick={() => open()} disabled={!ready}>
          {ready ? label : "Loading..."}
        </button>
      )}
      {error && <p style={{ color: "#f87171", fontSize: 13, marginTop: 8 }}>{error}</p>}
    </div>
  );
}

// ── FINANCIALS TAB ────────────────────────────────────────────────────────
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
}

interface PlaidConnection {
  id: string;
  institutionName: string | null;
  connectedAt: string | null;
  isActive: boolean;
  source: 'portal' | 'intake';
}

function FinancialsTab({ merchantEmail, merchantName, assignedRep, onSwitchToMessages }: {
  merchantEmail: string;
  merchantName: string;
  assignedRep: string | null;
  onSwitchToMessages: () => void;
}) {
  const [insights, setInsights] = useState<FinancialInsights | null>(null);
  const [connections, setConnections] = useState<PlaidConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [insightsRes, connectionsRes] = await Promise.all([
        fetch("/api/merchant/financial-insights", { credentials: "include" }),
        fetch("/api/merchant/plaid/connections", { credentials: "include" }),
      ]);
      if (insightsRes.ok) setInsights(await insightsRes.json());
      if (connectionsRes.ok) setConnections(await connectionsRes.json());
    } catch (e) {
      console.error("Failed to load financial data:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

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

  const handleDisconnect = async (id: string) => {
    try {
      await fetch(`/api/merchant/plaid/connections/${id}`, { method: "DELETE", credentials: "include" });
      await fetchData();
    } catch (e) {
      console.error("Failed to disconnect:", e);
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

  const hasAnyData = insights?.pdfInsights || insights?.plaidInsights;
  const pdf = insights?.pdfInsights;
  const plaid = insights?.plaidInsights;

  // Use Plaid data when available, fall back to PDF
  const monthlyRevenue = plaid?.monthlyRevenue || pdf?.estimatedMonthlyRevenue || 0;
  const avgBalance = plaid?.avgBalance || pdf?.averageDailyBalance || 0;
  const cashFlowHealth = pdf?.cashFlowHealth || (plaid ? 'moderate' : null);

  return (
    <div className="financials-section">
      {/* ── Connected Banks ── */}
      <div className="insight-card">
        <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
          Connected Banks
        </h3>
        {connections.length > 0 ? (
          <>
            {connections.map(conn => (
              <div key={conn.id} className="plaid-connection-row">
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span className="health-indicator health-strong" style={{ width: 8, height: 8 }} />
                  <span style={{ fontWeight: 500 }}>{conn.institutionName || "Connected Bank"}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 13, color: "#94a3b8" }}>
                  {conn.connectedAt && <span>Connected {new Date(conn.connectedAt).toLocaleDateString()}</span>}
                  {conn.source === 'portal' && (
                    <button onClick={() => handleDisconnect(conn.id)} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: 12 }}>
                      Disconnect
                    </button>
                  )}
                </div>
              </div>
            ))}
            <div style={{ marginTop: 12 }}>
              <PlaidLinkButton onSuccess={fetchData} label="Connect Another Bank" />
            </div>
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <p style={{ color: "#94a3b8", marginBottom: 16, fontSize: 14, lineHeight: 1.6 }}>
              Connect your bank to get live financial insights and make future funding faster.
            </p>
            <PlaidLinkButton onSuccess={fetchData} />
          </div>
        )}
      </div>

      {/* ── Uploaded Statements ── */}
      {insights?.hasStatements && (
        <div className="insight-card">
          <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
            Uploaded Statements
          </h3>
          {pdf ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ color: "#94a3b8", fontSize: 13 }}>
                Last analyzed: {new Date(pdf.analyzedAt).toLocaleDateString()}
              </span>
              <button className="analyze-btn" onClick={handleAnalyze} disabled={analyzing}>
                {analyzing ? "Re-analyzing..." : "Re-analyze"}
              </button>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "12px 0" }}>
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
          {/* Cash Flow Health */}
          {cashFlowHealth && (
            <div className="insight-card" style={{ textAlign: "center" }}>
              <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
                Cash Flow Health
              </h3>
              <div className={`health-indicator health-${cashFlowHealth}`} />
              <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 600, marginTop: 8, textTransform: "capitalize" }}>
                {cashFlowHealth === 'needs-attention' ? 'Needs Attention' : cashFlowHealth}
              </p>
            </div>
          )}

          {/* Revenue & Balance Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="insight-card" style={{ textAlign: "center" }}>
              <p style={{ color: "#94a3b8", fontSize: 12, marginBottom: 4 }}>Est. Monthly Revenue</p>
              <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 700, color: "#2dd4bf" }}>
                ${monthlyRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div className="insight-card" style={{ textAlign: "center" }}>
              <p style={{ color: "#94a3b8", fontSize: 12, marginBottom: 4 }}>Avg. Daily Balance</p>
              <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 700, color: "#2dd4bf" }}>
                ${avgBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
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
              {plaid.revenueTrend && (
                <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 8 }}>
                  Revenue trend: <span style={{ color: plaid.revenueTrend === 'growing' ? '#2dd4bf' : plaid.revenueTrend === 'declining' ? '#f87171' : '#94a3b8', fontWeight: 500, textTransform: 'capitalize' }}>{plaid.revenueTrend}</span>
                </p>
              )}
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
            {insights?.hasStatements
              ? "Click 'Analyze' above to generate insights from your bank statements."
              : "Upload bank statements or connect your bank to see financial insights."}
          </p>
        </div>
      )}

      {/* ── Renewal Nudge ── */}
      {insights?.renewalNudge?.eligible && (
        <div className="renewal-nudge" onClick={onSwitchToMessages} role="button" tabIndex={0}>
          <span>{insights.renewalNudge.message}</span>
          <span style={{ color: "#2dd4bf", fontWeight: 600, marginLeft: 8, cursor: "pointer" }}>Talk to your rep →</span>
        </div>
      )}
    </div>
  );
}

// ── ACTIVITY FEED ─────────────────────────────────────────────────────────
function ActivityFeed({ merchantEmail }: { merchantEmail: string }) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/merchant/activity")
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setActivities(data); })
      .catch(err => console.error("Failed to fetch activity:", err))
      .finally(() => setLoading(false));
  }, [merchantEmail]);

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
        {calc.paymentsRemaining} {deal.paymentFrequency} payments &middot; {fmt$(calc.remaining)} left
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
  const [merchantEmail, setMerchantEmail] = useState("");
  const [merchantName, setMerchantName] = useState("");
  const [deals, setDeals] = useState<Deal[]>([]);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [loadingDeals, setLoadingDeals] = useState(false);
  const [statements, setStatements] = useState<BankStatement[]>([]);
  const [loadingStatements, setLoadingStatements] = useState(false);
  const [vaultDocs, setVaultDocs] = useState<VaultDocument[]>([]);
  const [loadingVault, setLoadingVault] = useState(false);
  const [activeTab, setActiveTab] = useState<'positions' | 'messages' | 'documents' | 'financials'>('positions');
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
                        <ActivityFeed merchantEmail={merchantEmail} />
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
                    />
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
