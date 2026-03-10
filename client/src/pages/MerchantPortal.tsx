import { useState, useEffect } from "react";

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

  if (isDaily) {
    totalPayments = businessDaysBetween(funded, new Date(funded.getTime() + 180 * 24 * 60 * 60 * 1000));
    paymentAmount = totalPayback / totalPayments;
    paymentsMade = businessDaysBetween(funded, today);
  } else {
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const termMonths = deal.term ? parseInt(deal.term) : 6;
    const isWeekly = deal.paymentFrequency === "weekly";
    totalPayments = termMonths * (isWeekly ? 4.33 : 2);
    totalPayments = Math.round(totalPayments);
    paymentAmount = totalPayback / totalPayments;
    paymentsMade = Math.floor((today.getTime() - funded.getTime()) / msPerWeek);
  }

  paymentsMade = Math.min(paymentsMade, totalPayments);
  const amountPaid = Math.min(paymentsMade * paymentAmount, totalPayback);
  const remaining = Math.max(totalPayback - amountPaid, 0);
  const pctComplete = (amountPaid / totalPayback) * 100;
  const paymentsRemaining = Math.max(totalPayments - paymentsMade, 0);

  let projectedPayoff: Date;
  if (isDaily) {
    projectedPayoff = addBusinessDays(today, paymentsRemaining);
  } else {
    projectedPayoff = new Date(today.getTime() + paymentsRemaining * 7 * 24 * 60 * 60 * 1000);
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
    font-weight: 700;
    font-size: 18px;
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
    font-family: 'Syne', sans-serif;
    font-weight: 700;
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
    font-family: 'Syne', sans-serif;
    font-weight: 700;
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
    font-weight: 800;
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
    font-family: 'Syne', sans-serif;
    font-weight: 700;
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
    font-family: 'Syne', sans-serif;
    font-size: 64px;
    font-weight: 800;
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
    font-family: 'Syne', sans-serif;
    color: #2dd4bf;
    font-weight: 700;
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
    font-family: 'Syne', sans-serif;
    font-weight: 700;
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
    font-family: 'Syne', sans-serif;
    font-size: 36px;
    font-weight: 800;
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
    font-family: 'Syne', sans-serif;
    font-size: 22px;
    font-weight: 700;
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

      <div className="contact-strip">
        <div className="contact-strip-text">
          Questions about your position? <strong>Your rep at Today Capital Group is here to help.</strong>
        </div>
        <button className="contact-cta">Contact My Rep</button>
      </div>
    </div>
  );
}

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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

        <div className="login-hint">
          Don't have an account? Your login is created automatically<br />when your deal is funded. Contact your rep for help.
        </div>
      </div>
    </div>
  );
}

// ── MAIN APP ─────────────────────────────────────────────────────────────
export default function MerchantPortal() {
  const [authChecked, setAuthChecked] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [merchantEmail, setMerchantEmail] = useState("");
  const [merchantName, setMerchantName] = useState("");
  const [deals, setDeals] = useState<Deal[]>([]);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [loadingDeals, setLoadingDeals] = useState(false);

  // Check auth on mount
  useEffect(() => {
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

  // Fetch deals when logged in
  useEffect(() => {
    if (!loggedIn) return;
    setLoadingDeals(true);
    fetch("/api/merchant/deals")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setDeals(data);
        }
      })
      .catch(err => console.error("Failed to fetch deals:", err))
      .finally(() => setLoadingDeals(false));
  }, [loggedIn]);

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
      setMerchantEmail("");
      setMerchantName("");
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
            <header className="header">
              <div className="header-logo">
                <div className="header-logo-mark">TCG</div>
                <div className="header-brand">Today Capital Group</div>
              </div>
              <div className="header-right">
                <span className="header-user">{merchantEmail}</span>
                <button className="logout-btn" onClick={handleLogout}>
                  Sign out
                </button>
              </div>
            </header>

            <div className="page-wrap">
              {selectedDeal ? (
                <DealDetail deal={selectedDeal} onBack={() => setSelectedDeal(null)} />
              ) : loadingDeals ? (
                <div className="loading-wrap">Loading your positions...</div>
              ) : deals.length === 0 ? (
                <div>
                  <div className="page-title">My Positions</div>
                  <div className="page-subtitle">No funded deals found for your account yet.</div>
                </div>
              ) : (
                <>
                  <div className="page-title">My Positions</div>
                  <div className="page-subtitle">
                    Hello, {merchantName ? merchantName.split(" ")[0] : "there"}. Here's the current status of your funded deals.
                  </div>

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
            </div>
          </>
        )}
      </div>
    </div>
  );
}
