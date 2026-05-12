import { useState, useEffect, useCallback, useRef } from "react";

// ── EMBEDDED CSS ─────────────────────────────────────────────────────────
const LEAD_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');

  .lead-portal * { box-sizing: border-box; margin: 0; padding: 0; }

  .lead-portal {
    font-family: 'DM Sans', sans-serif;
    background: radial-gradient(ellipse at 20% 0%, rgba(20,184,166,0.10) 0%, transparent 60%),
                radial-gradient(ellipse at 80% 100%, rgba(15,23,41,0.9) 0%, transparent 60%),
                #080d18;
    color: #e8eaf0;
    min-height: 100vh;
  }

  /* ── HEADER ── */
  .lead-portal .lp-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 24px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    background: rgba(8,13,24,0.85);
    backdrop-filter: blur(12px);
    position: sticky;
    top: 0;
    z-index: 100;
  }

  .lead-portal .lp-header-logo {
    display: flex; align-items: center; gap: 10px;
  }

  .lead-portal .lp-header-mark {
    width: 32px; height: 32px;
    background: linear-gradient(135deg, #14B8A6, #2dd4bf);
    border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    font-family: 'Syne', sans-serif; font-weight: 800; font-size: 13px; color: #080d18;
  }

  .lead-portal .lp-header-brand {
    font-family: 'Syne', sans-serif; font-weight: 700; font-size: 13px;
  }

  .lead-portal .lp-header-right {
    display: flex; align-items: center; gap: 14px;
  }

  .lead-portal .lp-header-user {
    font-size: 12px; color: #7b8499;
  }

  .lead-portal .lp-header-out {
    padding: 6px 14px;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 8px;
    color: #9ba3b8; font-size: 12px;
    font-family: 'DM Sans', sans-serif;
    cursor: pointer; transition: all 0.2s;
  }

  .lead-portal .lp-header-out:hover { background: rgba(255,255,255,0.1); color: #e8eaf0; }

  /* ── PAGE WRAP ── */
  .lead-portal .lp-wrap {
    max-width: 900px;
    margin: 0 auto;
    padding: 32px 24px 80px;
  }

  .lead-portal .lp-title {
    font-family: 'Syne', sans-serif;
    font-size: 26px;
    font-weight: 700;
    color: #fff;
    margin-bottom: 4px;
  }

  .lead-portal .lp-subtitle {
    font-size: 14px; color: #7b8499; margin-bottom: 32px;
  }

  /* ── NAV TABS ── */
  .lead-portal .lp-nav {
    display: flex; gap: 4px;
    margin-bottom: 28px;
    background: rgba(15,23,41,0.7);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 12px;
    padding: 4px;
    overflow-x: auto; -webkit-overflow-scrolling: touch;
  }

  .lead-portal .lp-nav-btn {
    flex: 1; padding: 11px 16px;
    background: none; border: none; border-radius: 8px;
    color: #7b8499; font-family: 'DM Sans', sans-serif;
    font-size: 13px; font-weight: 500;
    cursor: pointer; transition: all 0.2s;
    white-space: nowrap; min-width: 0;
    position: relative;
  }

  .lead-portal .lp-nav-btn:hover { color: #e8eaf0; background: rgba(255,255,255,0.04); }
  .lead-portal .lp-nav-btn.active { background: rgba(45,212,191,0.1); color: #2dd4bf; font-weight: 600; }

  /* ── CARDS ── */
  .lead-portal .card {
    background: rgba(15,23,41,0.7);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 16px;
    padding: 24px;
    margin-bottom: 14px;
    transition: border-color 0.2s;
  }

  .lead-portal .card-hover:hover {
    border-color: rgba(45,212,191,0.25);
    cursor: pointer;
  }

  .lead-portal .card-hover::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 2px;
    background: linear-gradient(90deg, #14B8A6, #2dd4bf);
    opacity: 0;
    transition: opacity 0.2s;
    border-radius: 16px 16px 0 0;
  }

  .lead-portal .card-hover:hover::before { opacity: 1; }

  /* ── BUTTONS ── */
  .lead-portal .btn-primary {
    width: 100%;
    padding: 13px;
    background: linear-gradient(135deg, #14B8A6, #0d9488);
    border: none;
    border-radius: 10px;
    color: #080d18;
    font-family: 'Syne', sans-serif;
    font-weight: 700;
    font-size: 15px;
    cursor: pointer;
    transition: opacity 0.2s, transform 0.1s;
  }

  .lead-portal .btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }
  .lead-portal .btn-primary:active { transform: translateY(0); }
  .lead-portal .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

  .lead-portal .btn-secondary {
    padding: 8px 16px;
    background: rgba(45,212,191,0.1);
    border: 1px solid rgba(45,212,191,0.25);
    border-radius: 8px;
    color: #2dd4bf;
    font-family: 'DM Sans', sans-serif;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .lead-portal .btn-secondary:hover { background: rgba(45,212,191,0.2); }
  .lead-portal .btn-secondary:disabled { opacity: 0.5; cursor: not-allowed; }

  .lead-portal .btn-ghost {
    padding: 8px 16px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 8px;
    color: #94a3b8;
    font-family: 'DM Sans', sans-serif;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .lead-portal .btn-ghost:hover { background: rgba(255,255,255,0.08); color: #e8eaf0; }

  /* ── FORM FIELDS ── */
  .lead-portal .field-label {
    display: block; font-size: 12px; font-weight: 600; color: #9ba3b8;
    text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px;
  }

  .lead-portal .field-input, .lead-portal select {
    width: 100%; padding: 11px 14px;
    background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
    border-radius: 8px; color: #e8eaf0; font-size: 14px;
    font-family: 'DM Sans', sans-serif; outline: none; transition: border-color 0.2s;
  }

  .lead-portal .field-input:focus, .lead-portal select:focus {
    border-color: rgba(45,212,191,0.5); background: rgba(45,212,191,0.04);
  }

  /* ── SECTION LABELS ── */
  .lead-portal .section-label {
    font-family: 'Syne', sans-serif;
    font-size: 11px; font-weight: 700;
    color: #2dd4bf;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 12px;
    margin-top: 24px;
  }

  .lead-portal .section-label:first-child { margin-top: 0; }

  /* ── PROGRESS BAR ── */
  .lead-portal .progress-track {
    height: 8px; background: rgba(255,255,255,0.06); border-radius: 6px; overflow: hidden;
  }

  .lead-portal .progress-track.big { height: 12px; border-radius: 8px; }

  .lead-portal .progress-fill {
    height: 100%; background: linear-gradient(90deg, #2dd4bf, #14b8a6);
    border-radius: 6px; transition: width 0.5s ease;
  }

  /* ── BADGES ── */
  .lead-portal .badge {
    display: inline-block; padding: 3px 10px; border-radius: 20px;
    font-size: 11px; font-weight: 600;
  }

  .lead-portal .badge-active { background: rgba(45,212,191,0.15); color: #2dd4bf; }
  .lead-portal .badge-complete { background: rgba(148,163,184,0.15); color: #94a3b8; }
  .lead-portal .badge-alert { background: rgba(250,204,21,0.15); color: #facc15; }

  /* ── STAT CARDS ── */
  .lead-portal .stat-grid {
    display: grid; gap: 12px; margin-bottom: 16px;
  }

  .lead-portal .stat-grid-3 { grid-template-columns: repeat(3, 1fr); }
  .lead-portal .stat-grid-4 { grid-template-columns: repeat(4, 1fr); }

  .lead-portal .stat-card {
    background: rgba(15,23,41,0.7);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 14px;
    padding: 18px 16px;
    text-align: center;
  }

  .lead-portal .stat-label {
    color: #7b8499; font-size: 11px; font-weight: 500;
    text-transform: uppercase; letter-spacing: 0.05em;
    margin-bottom: 6px;
  }

  .lead-portal .stat-val {
    font-family: 'Syne', sans-serif; font-size: 22px; font-weight: 700;
  }

  .lead-portal .stat-sub {
    color: #4b5568; font-size: 11px; margin-top: 2px;
  }

  .lead-portal .teal { color: #2dd4bf; }
  .lead-portal .red { color: #f87171; }

  /* ── POSITION CARD ── */
  .lead-portal .pos-card {
    background: rgba(15,23,41,0.7);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 16px;
    padding: 24px;
    margin-bottom: 14px;
    cursor: pointer;
    transition: all 0.2s;
    position: relative;
    overflow: hidden;
  }

  .lead-portal .pos-card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0; height: 2px;
    background: linear-gradient(90deg, #14B8A6, #2dd4bf);
    opacity: 0; transition: opacity 0.2s;
  }

  .lead-portal .pos-card:hover {
    border-color: rgba(45,212,191,0.3);
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.2);
  }

  .lead-portal .pos-card:hover::before { opacity: 1; }

  /* ── BACK BUTTON ── */
  .lead-portal .back-btn {
    background: none; border: none;
    color: #7b8499; font-size: 14px;
    font-family: 'DM Sans', sans-serif;
    cursor: pointer; margin-bottom: 20px;
    display: flex; align-items: center; gap: 6px;
    transition: color 0.2s;
  }

  .lead-portal .back-btn:hover { color: #2dd4bf; }

  /* ── DETAIL PAGE ── */
  .lead-portal .detail-header {
    display: flex; justify-content: space-between; align-items: center;
    margin-bottom: 28px; padding-bottom: 20px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }

  .lead-portal .detail-title {
    font-family: 'Syne', sans-serif; font-size: 24px; font-weight: 700;
  }

  .lead-portal .detail-sub { color: #7b8499; font-size: 13px; margin-top: 4px; }

  /* ── TRACKER CARD ── */
  .lead-portal .tracker-card {
    background: rgba(15,23,41,0.7);
    border: 1px solid rgba(45,212,191,0.15);
    border-radius: 16px;
    padding: 28px 24px;
    text-align: center;
    margin-bottom: 16px;
  }

  .lead-portal .tracker-pct {
    font-family: 'Syne', sans-serif; font-size: 42px; font-weight: 800;
    color: #2dd4bf; margin-bottom: 4px;
  }

  .lead-portal .tracker-pct-sub { color: #7b8499; font-size: 13px; margin-bottom: 20px; }

  /* ── COUNTDOWN ── */
  .lead-portal .countdown-card {
    background: linear-gradient(135deg, rgba(45,212,191,0.08), rgba(20,184,166,0.03));
    border: 1px solid rgba(45,212,191,0.15);
    border-radius: 16px;
    padding: 24px;
    margin-bottom: 14px;
  }

  .lead-portal .countdown-grid {
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;
    text-align: center;
  }

  .lead-portal .countdown-num {
    font-family: 'Syne', sans-serif; font-size: 28px; font-weight: 800;
    color: #2dd4bf;
  }

  .lead-portal .countdown-label {
    color: #7b8499; font-size: 11px; text-transform: uppercase;
    letter-spacing: 0.06em; margin-top: 2px;
  }

  /* ── CONTACT STRIP ── */
  .lead-portal .contact-strip {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 12px;
    padding: 16px 20px;
    display: flex; align-items: center; justify-content: space-between;
    margin-top: 20px;
  }

  .lead-portal .contact-strip-text {
    font-size: 13px; color: #7b8499;
  }

  .lead-portal .contact-strip-text a {
    color: #2dd4bf; font-weight: 600; text-decoration: none;
  }

  .lead-portal .contact-strip-text a:hover { text-decoration: underline; }

  /* ── RESOURCES ── */
  .lead-portal .res-group-title {
    font-family: 'Syne', sans-serif; font-size: 15px; font-weight: 700;
    margin-bottom: 12px; margin-top: 24px;
  }

  .lead-portal .res-group-title:first-child { margin-top: 0; }

  .lead-portal .res-grid {
    display: grid; grid-template-columns: 1fr 1fr; gap: 12px;
  }

  .lead-portal .res-card {
    background: rgba(15,23,41,0.7);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 14px;
    padding: 20px;
    text-decoration: none;
    color: inherit;
    transition: all 0.2s;
    display: block;
  }

  .lead-portal .res-card:hover {
    border-color: rgba(45,212,191,0.3);
    transform: translateY(-2px);
  }

  .lead-portal .res-card-head {
    display: flex; justify-content: space-between; align-items: flex-start;
    margin-bottom: 8px;
  }

  .lead-portal .res-card-title {
    font-weight: 600; font-size: 14px; line-height: 1.3;
  }

  .lead-portal .res-tag {
    padding: 2px 8px; border-radius: 4px;
    font-size: 10px; font-weight: 600;
    white-space: nowrap; flex-shrink: 0;
  }

  .lead-portal .res-card-desc {
    font-size: 12px; color: #7b8499; line-height: 1.5;
  }

  .lead-portal .res-card-link {
    font-size: 12px; color: #2dd4bf; font-weight: 600;
    margin-top: 10px;
  }

  /* ── MISC ── */
  .lead-portal .spinner {
    width: 28px; height: 28px;
    border: 3px solid rgba(45,212,191,0.2); border-top-color: #2dd4bf;
    border-radius: 50%; animation: lead-spin 0.8s linear infinite;
    margin: 0 auto;
  }

  @keyframes lead-spin { to { transform: rotate(360deg); } }

  .lead-portal .loading { text-align: center; padding: 48px 20px; color: #7b8499; font-size: 14px; }
  .lead-portal .empty { text-align: center; padding: 32px 20px; color: #4b5568; font-size: 14px; line-height: 1.6; }
  .lead-portal .empty strong { color: #94a3b8; display: block; margin-bottom: 6px; font-size: 15px; }

  .lead-portal .popup-fallback {
    margin-top: 12px; padding: 12px 16px;
    background: rgba(250,204,21,0.08); border: 1px solid rgba(250,204,21,0.2);
    border-radius: 8px; font-size: 13px; color: #facc15; text-align: center;
  }

  .lead-portal .popup-fallback a { color: #2dd4bf; font-weight: 600; text-decoration: underline; }

  .lead-portal .divider {
    height: 1px; background: rgba(255,255,255,0.06);
    margin: 16px 0;
  }

  @media (max-width: 640px) {
    .lead-portal .lp-nav-btn { flex: none; padding: 10px 14px; font-size: 12px; }
    .lead-portal .lp-wrap { padding: 24px 16px 60px; }
    .lead-portal .lp-title { font-size: 22px; }
    .lead-portal .stat-grid-3 { grid-template-columns: 1fr; }
    .lead-portal .stat-grid-4 { grid-template-columns: 1fr 1fr; }
    .lead-portal .res-grid { grid-template-columns: 1fr; }
    .lead-portal .countdown-grid { grid-template-columns: repeat(3, 1fr); }
    .lead-portal .pos-card { padding: 18px; }
    .lead-portal .lp-header { padding: 14px 16px; }
    .lead-portal .detail-header { flex-direction: column; align-items: flex-start; gap: 10px; }
    .lead-portal .contact-strip { flex-direction: column; gap: 10px; text-align: center; }
  }
`;

// ── TYPES ────────────────────────────────────────────────────────────────
interface LeadPosition {
  id: string;
  funder_name: string;
  product_type: string;
  funded_amount: number;
  payback_amount: number;
  factor_rate: string;
  payment_amount: number;
  payment_frequency: string;
  funded_date: string;
  estimated_payoff_date: string;
  remaining_balance: number;
  status: string;
  notes: string | null;
}

interface BankingInsights {
  connected: boolean;
  institutionName?: string | null;
  lastSyncedAt?: string | null;
  accounts?: Array<{ name: string; type: string; balance: number }>;
  metrics?: {
    monthlyRevenue: number;
    monthlyExpenses: number;
    netCashFlow: number;
    avgBalance: number;
    currentBalance: number;
    monthsAnalyzed: number;
    revenueTrend?: string | null;
    healthScore?: number;
  };
}

// ── HELPERS ───────────────────────────────────────────────────────────────
const fmt$ = (n: number) => `$${Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
const fmtDate = (d: Date | string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

function calcPosition(pos: LeadPosition) {
  const funded = Number(pos.funded_amount) || 0;
  const payback = Number(pos.payback_amount) || funded;
  const remaining = Number(pos.remaining_balance) || payback;
  const payment = Number(pos.payment_amount) || 0;
  const paidSoFar = payback - remaining;
  const progress = payback > 0 ? (paidSoFar / payback) * 100 : 0;
  const freq = pos.payment_frequency || "daily";
  const paymentsPerMonth = freq === "daily" ? 21 : freq === "weekly" ? 4.33 : freq === "bi-weekly" || freq === "biweekly" ? 2.17 : 1;
  const monthlyLoad = payment * paymentsPerMonth;
  const paymentsLeft = payment > 0 ? Math.ceil(remaining / payment) : 0;

  // Estimate days to payoff
  const daysPerPayment = freq === "daily" ? 1 : freq === "weekly" ? 7 : freq === "bi-weekly" || freq === "biweekly" ? 14 : 30;
  const estDaysLeft = paymentsLeft * daysPerPayment;
  const projectedPayoff = new Date();
  projectedPayoff.setDate(projectedPayoff.getDate() + estDaysLeft);

  // Next payment date
  const nextPayment = new Date();
  if (freq === "daily") {
    nextPayment.setDate(nextPayment.getDate() + 1);
    while (nextPayment.getDay() === 0 || nextPayment.getDay() === 6) nextPayment.setDate(nextPayment.getDate() + 1);
  } else if (freq === "weekly") {
    nextPayment.setDate(nextPayment.getDate() + (7 - nextPayment.getDay() + 1) % 7 || 7);
  } else if (freq === "bi-weekly" || freq === "biweekly") {
    nextPayment.setDate(nextPayment.getDate() + 14);
  } else {
    nextPayment.setMonth(nextPayment.getMonth() + 1, 1);
  }

  return { funded, payback, remaining, paidSoFar, progress, monthlyLoad, paymentsLeft, estDaysLeft, projectedPayoff, nextPayment };
}

// ── LOGIN / SIGNUP ───────────────────────────────────────────────────────
function LeadAuth({ onAuth }: { onAuth: () => void }) {
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const endpoint = mode === "signup" ? "/api/lead/signup" : "/api/lead/login";
      const savedRef = sessionStorage.getItem("lead_referral") || undefined;
      const body = mode === "signup"
        ? { email, firstName, lastName, phone, referralCode: savedRef }
        : { email, password };
      const res = await fetch(endpoint, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        // Auto-switch to login if account already exists
        if (data.error?.includes("already exists")) {
          setMode("login");
          setError("You already have an account. Sign in below.");
          return;
        }
        // Better message when no password has been set yet
        if (data.error === "no_password_set") {
          setError("You haven't set a password yet. Check your dashboard after signing in to set one, or contact us for help.");
          return;
        }
        throw new Error(data.message || data.error || "Something went wrong");
      }
      onAuth();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lead-portal" style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <style>{LEAD_CSS}</style>
      <div style={{ maxWidth: 440, width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
            <div style={{ width: 36, height: 36, background: "linear-gradient(135deg, #14B8A6, #2dd4bf)", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 14, color: "#080d18" }}>TCG</div>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14 }}>Today Capital Group</div>
              <div style={{ fontSize: 10, color: "#14B8A6", textTransform: "uppercase" as const, letterSpacing: "0.08em" }}>Financial Command Center</div>
            </div>
          </div>
        </div>
        <div className="card" style={{ padding: "40px 32px" }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
              {mode === "signup" ? "Start tracking your funding" : "Welcome back"}
            </h1>
            <p style={{ color: "#7b8499", fontSize: 14, lineHeight: 1.6 }}>
              {mode === "signup"
                ? "Monitor your positions, track cash flow, and see when you qualify for better terms. Free to use."
                : "Sign in to your dashboard."}
            </p>
          </div>
          {error && <div style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: 8, padding: "10px 14px", marginBottom: 16, color: "#f87171", fontSize: 13 }}>{error}</div>}
          <form onSubmit={handleSubmit}>
            {mode === "signup" ? (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                  <div><label className="field-label">First Name</label><input className="field-input" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="John" required /></div>
                  <div><label className="field-label">Last Name</label><input className="field-input" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Smith" required /></div>
                </div>
                <div style={{ marginBottom: 14 }}><label className="field-label">Email</label><input className="field-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" required /></div>
                <div style={{ marginBottom: 20 }}><label className="field-label">Phone</label><input className="field-input" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(555) 555-5555" required /></div>
                <button className="btn-primary" type="submit" disabled={loading}>{loading ? "Setting up your dashboard..." : "Get Started — It's Free"}</button>
              </>
            ) : (
              <>
                <div style={{ marginBottom: 14 }}><label className="field-label">Email</label><input className="field-input" type="email" value={email} onChange={e => setEmail(e.target.value)} required /></div>
                <div style={{ marginBottom: 20 }}><label className="field-label">Password</label><input className="field-input" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} /></div>
                <button className="btn-primary" type="submit" disabled={loading}>{loading ? "Please wait..." : "Sign In"}</button>
              </>
            )}
          </form>
          <div style={{ textAlign: "center", marginTop: 16, color: "#7b8499", fontSize: 13 }}>
            {mode === "signup"
              ? <span>Already have an account? <button onClick={() => { setMode("login"); setError(null); }} style={{ background: "none", border: "none", color: "#2dd4bf", cursor: "pointer", fontSize: 13 }}>Sign in</button></span>
              : <span>No account? <button onClick={() => { setMode("signup"); setError(null); }} style={{ background: "none", border: "none", color: "#2dd4bf", cursor: "pointer", fontSize: 13 }}>Create one free</button></span>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── SET PASSWORD BANNER ──────────────────────────────────────────────────
function SetPasswordBanner() {
  const [show, setShow] = useState(true);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  if (!show || done) return null;

  const handleSave = async () => {
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirm) { setError("Passwords don't match."); return; }
    setSaving(true); setError(null);
    try {
      const res = await fetch("/api/lead/set-password", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Failed");
      setDone(true);
    } catch (e: any) { setError(e.message); } finally { setSaving(false); }
  };

  return (
    <div className="card" style={{ marginBottom: 16, background: "rgba(45,212,191,0.06)", border: "1px solid rgba(45,212,191,0.2)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>Secure your account</p>
          <p style={{ color: "#94a3b8", fontSize: 13 }}>Set a password so you can sign in again later.</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {!expanded && <button className="btn-secondary" onClick={() => setExpanded(true)} style={{ fontSize: 12 }}>Set Password</button>}
          <button onClick={() => setShow(false)} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>{"\u00D7"}</button>
        </div>
      </div>
      {expanded && (
        <div style={{ marginTop: 14 }}>
          {error && <div style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: 8, padding: "8px 12px", marginBottom: 10, color: "#f87171", fontSize: 12 }}>{error}</div>}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div><label className="field-label">Password</label><input className="field-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="6+ characters" /></div>
            <div><label className="field-label">Confirm</label><input className="field-input" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Confirm" /></div>
          </div>
          <button className="btn-primary" onClick={handleSave} disabled={saving} style={{ padding: "10px 0" }}>{saving ? "Saving..." : "Save Password"}</button>
        </div>
      )}
    </div>
  );
}

// ── ADD POSITION FORM ────────────────────────────────────────────────────
function AddPositionForm({ onSave, onCancel }: { onSave: () => void; onCancel: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ funderName: "", productType: "MCA", fundedAmount: "", paybackAmount: "", factorRate: "", paymentAmount: "", paymentFrequency: "daily", fundedDate: "", remainingBalance: "" });
  const set = (f: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm(p => ({ ...p, [f]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError(null);
    try {
      const res = await fetch("/api/lead/positions", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Failed to save");
      onSave();
    } catch (e: any) { setError(e.message); } finally { setSaving(false); }
  };

  return (
    <div className="card">
      <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Add Funding Position</h3>
      {error && <p style={{ color: "#f87171", fontSize: 13, marginBottom: 12 }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div><label className="field-label">Funder Name *</label><input className="field-input" value={form.funderName} onChange={set("funderName")} required /></div>
          <div><label className="field-label">Product Type</label>
            <select className="field-input" value={form.productType} onChange={set("productType")}>
              <option value="MCA">MCA</option><option value="LOC">Line of Credit</option><option value="Term Loan">Term Loan</option>
              <option value="SBA">SBA Loan</option><option value="Revenue Based">Revenue Based</option><option value="Other">Other</option>
            </select>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div><label className="field-label">Funded Amount</label><input className="field-input" type="number" value={form.fundedAmount} onChange={set("fundedAmount")} placeholder="50000" /></div>
          <div><label className="field-label">Payback Amount</label><input className="field-input" type="number" value={form.paybackAmount} onChange={set("paybackAmount")} placeholder="65000" /></div>
          <div><label className="field-label">Factor Rate</label><input className="field-input" value={form.factorRate} onChange={set("factorRate")} placeholder="1.30" /></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div><label className="field-label">Payment Amount</label><input className="field-input" type="number" value={form.paymentAmount} onChange={set("paymentAmount")} placeholder="500" /></div>
          <div><label className="field-label">Frequency</label>
            <select className="field-input" value={form.paymentFrequency} onChange={set("paymentFrequency")}>
              <option value="daily">Daily</option><option value="weekly">Weekly</option><option value="bi-weekly">Bi-Weekly</option><option value="monthly">Monthly</option>
            </select>
          </div>
          <div><label className="field-label">Remaining Balance</label><input className="field-input" type="number" value={form.remainingBalance} onChange={set("remainingBalance")} placeholder="32000" /></div>
        </div>
        <div style={{ marginBottom: 16 }}><label className="field-label">Funded Date</label><input className="field-input" type="date" value={form.fundedDate} onChange={set("fundedDate")} style={{ maxWidth: 200 }} /></div>
        <div style={{ display: "flex", gap: 12 }}>
          <button className="btn-primary" type="submit" disabled={saving} style={{ flex: 1 }}>{saving ? "Saving..." : "Save Position"}</button>
          <button type="button" onClick={onCancel} className="btn-ghost">Cancel</button>
        </div>
      </form>
    </div>
  );
}

// ── POSITION DETAIL VIEW ─────────────────────────────────────────────────
function PositionDetail({ pos: initialPos, onBack, onDeleted }: { pos: LeadPosition; onBack: () => void; onDeleted: () => void }) {
  const [pos, setPos] = useState(initialPos);
  const [editingBalance, setEditingBalance] = useState(false);
  const [newBalance, setNewBalance] = useState(String(initialPos.remaining_balance || ""));
  const [savingBalance, setSavingBalance] = useState(false);
  const [balanceMsg, setBalanceMsg] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const c = calcPosition(pos);
  const isRenewalReady = c.progress >= 50 && pos.status === "active";

  const handleUpdateBalance = async () => {
    setSavingBalance(true); setBalanceMsg(null);
    try {
      const res = await fetch(`/api/lead/positions/${pos.id}`, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ remainingBalance: parseFloat(newBalance) }) });
      if (!res.ok) throw new Error("Failed");
      setPos(p => ({ ...p, remaining_balance: parseFloat(newBalance) }));
      setEditingBalance(false);
      setBalanceMsg("Balance updated.");
    } catch { setBalanceMsg("Failed to update."); }
    finally { setSavingBalance(false); }
  };

  const handleMarkPaid = async () => {
    setSavingBalance(true); setBalanceMsg(null);
    try {
      const res = await fetch(`/api/lead/positions/${pos.id}`, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "paid", remainingBalance: 0 }) });
      if (!res.ok) throw new Error("Failed");
      setPos(p => ({ ...p, status: "paid", remaining_balance: 0 }));
      setBalanceMsg("Position marked as paid off.");
    } catch { setBalanceMsg("Failed to update."); }
    finally { setSavingBalance(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await fetch(`/api/lead/positions/${pos.id}`, { method: "DELETE", credentials: "include" });
      onDeleted();
    } catch { setDeleting(false); }
  };

  return (
    <div>
      <button className="back-btn" onClick={onBack}>&larr; Back to my positions</button>

      <div className="detail-header">
        <div>
          <div className="detail-title">{pos.funder_name}</div>
          <div className="detail-sub">
            {pos.product_type}
            {pos.factor_rate ? ` \u00B7 ${pos.factor_rate}x factor` : ""}
            {pos.funded_date ? ` \u00B7 Funded ${fmtDate(pos.funded_date)}` : ""}
            {pos.payment_frequency ? ` \u00B7 ${pos.payment_frequency.charAt(0).toUpperCase() + pos.payment_frequency.slice(1)} payments` : ""}
          </div>
        </div>
        <span className={`badge ${pos.status === "active" ? "badge-active" : "badge-complete"}`}>
          {pos.status === "active" ? "Active" : pos.status === "paid" ? "Paid Off" : pos.status}
        </span>
      </div>

      {/* Payoff Tracker */}
      <div className="tracker-card">
        <div className="tracker-pct">{c.progress.toFixed(1)}%</div>
        <div className="tracker-pct-sub">of total payback complete</div>
        <div className="progress-track big" style={{ marginBottom: 20 }}>
          <div className="progress-fill" style={{ width: `${Math.min(100, c.progress)}%` }} />
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 32, fontSize: 13 }}>
          <div><span style={{ color: "#2dd4bf", fontWeight: 700 }}>{fmt$(c.paidSoFar)}</span> <span style={{ color: "#7b8499" }}>paid</span></div>
          <div><span style={{ color: "#f87171", fontWeight: 700 }}>{fmt$(c.remaining)}</span> <span style={{ color: "#7b8499" }}>remaining</span></div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stat-grid stat-grid-4">
        <div className="stat-card">
          <div className="stat-label">Funded</div>
          <div className="stat-val">{fmt$(c.funded)}</div>
          <div className="stat-sub">original amount</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Payback</div>
          <div className="stat-val">{fmt$(c.payback)}</div>
          <div className="stat-sub">{pos.factor_rate ? `${pos.factor_rate}x factor` : "total owed"}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Per Payment</div>
          <div className="stat-val teal">{fmt$(Number(pos.payment_amount) || 0)}</div>
          <div className="stat-sub">{pos.payment_frequency}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Payments Left</div>
          <div className="stat-val">{c.paymentsLeft}</div>
          <div className="stat-sub">{pos.payment_frequency} payments</div>
        </div>
      </div>

      {/* Countdown */}
      {pos.status === "active" && c.paymentsLeft > 0 && (
        <div className="countdown-card">
          <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700, color: "#2dd4bf", marginBottom: 16, textAlign: "center" }}>Payoff Countdown</p>
          <div className="countdown-grid">
            <div>
              <div className="countdown-num">{c.paymentsLeft}</div>
              <div className="countdown-label">Payments Left</div>
            </div>
            <div>
              <div className="countdown-num">{Math.max(0, c.estDaysLeft)}</div>
              <div className="countdown-label">Est. Days</div>
            </div>
            <div>
              <div className="countdown-num" style={{ fontSize: 16 }}>{fmtDate(c.projectedPayoff)}</div>
              <div className="countdown-label">Projected Payoff</div>
            </div>
          </div>
        </div>
      )}

      {/* Next Payment */}
      {pos.status === "active" && (
        <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ color: "#7b8499", fontSize: 12, marginBottom: 2 }}>Next Payment</p>
            <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 700 }}>{fmtDate(c.nextPayment)}</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ color: "#7b8499", fontSize: 12, marginBottom: 2 }}>Amount</p>
            <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 700, color: "#2dd4bf" }}>{fmt$(Number(pos.payment_amount) || 0)}</p>
          </div>
        </div>
      )}

      {/* Monthly Load */}
      <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <p style={{ fontWeight: 600, fontSize: 14 }}>Monthly Payment Load</p>
          <p style={{ color: "#7b8499", fontSize: 12 }}>What this position costs you per month</p>
        </div>
        <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 700, color: "#f87171" }}>{fmt$(c.monthlyLoad)}</p>
      </div>

      {/* Renewal Eligibility */}
      {isRenewalReady && (
        <div className="card" style={{ background: "linear-gradient(135deg, rgba(250,204,21,0.08), rgba(250,204,21,0.02))", border: "1px solid rgba(250,204,21,0.2)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <span className="badge badge-alert">Renewal Eligible</span>
          </div>
          <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>You may qualify for a renewal at better terms.</p>
          <p style={{ color: "#94a3b8", fontSize: 13, lineHeight: 1.6, marginBottom: 14 }}>
            This position is {c.progress.toFixed(0)}% paid off. Many lenders allow renewals at 50%+, often at a lower factor rate or higher advance amount.
          </p>
          <a href="/intake/quiz" style={{ display: "inline-block", background: "#facc15", color: "#0f172a", fontWeight: 700, padding: "10px 24px", borderRadius: 8, textDecoration: "none", fontFamily: "'Syne', sans-serif", fontSize: 14 }}>
            Check Your Options
          </a>
        </div>
      )}

      {pos.notes && pos.notes.includes("Auto-detected") && (
        <p style={{ fontSize: 12, color: "#64748b", marginTop: 8, fontStyle: "italic", textAlign: "center" }}>This position was auto-detected from your bank transactions</p>
      )}

      {/* Update Balance / Mark Paid */}
      {pos.status === "active" && (
        <div className="card">
          <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>Update Position</p>
          {balanceMsg && <p style={{ fontSize: 13, color: balanceMsg.includes("Failed") ? "#f87171" : "#2dd4bf", marginBottom: 10 }}>{balanceMsg}</p>}
          {editingBalance ? (
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input className="field-input" type="number" value={newBalance} onChange={e => setNewBalance(e.target.value)} placeholder="Remaining balance" style={{ flex: 1 }} />
              <button className="btn-secondary" onClick={handleUpdateBalance} disabled={savingBalance}>{savingBalance ? "Saving..." : "Save"}</button>
              <button className="btn-ghost" onClick={() => setEditingBalance(false)}>Cancel</button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="btn-secondary" onClick={() => { setEditingBalance(true); setBalanceMsg(null); }}>Update Remaining Balance</button>
              <button className="btn-ghost" onClick={handleMarkPaid} disabled={savingBalance}>Mark as Paid Off</button>
            </div>
          )}
        </div>
      )}

      {/* Delete */}
      <div style={{ marginTop: 8 }}>
        {confirmDelete ? (
          <div className="card" style={{ background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.2)" }}>
            <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>Delete this position?</p>
            <p style={{ color: "#94a3b8", fontSize: 13, marginBottom: 14 }}>This cannot be undone.</p>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={handleDelete} disabled={deleting} style={{ padding: "8px 16px", background: "rgba(248,113,113,0.2)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: 8, color: "#f87171", fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{deleting ? "Deleting..." : "Yes, Delete"}</button>
              <button className="btn-ghost" onClick={() => setConfirmDelete(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setConfirmDelete(true)} style={{ background: "none", border: "none", color: "#4b5568", fontSize: 12, cursor: "pointer", padding: "4px 0" }}>Remove this position</button>
        )}
      </div>

      <div className="contact-strip" style={{ marginTop: 16 }}>
        <div className="contact-strip-text">
          Questions about this position? <a href={`mailto:trevor@todaycapitalgroup.com?subject=Question about my ${pos.funder_name} position`}>Reach out to our team</a>
        </div>
      </div>
    </div>
  );
}

// ── POSITION CARD ────────────────────────────────────────────────────────
function PositionCard({ pos, onClick }: { pos: LeadPosition; onClick: () => void }) {
  const c = calcPosition(pos);

  return (
    <div className="pos-card" onClick={onClick}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <h4 style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 700 }}>{pos.funder_name}</h4>
          <span style={{ color: "#7b8499", fontSize: 12 }}>{pos.product_type}{pos.factor_rate ? ` \u00B7 ${pos.factor_rate}x` : ""}{pos.funded_date ? ` \u00B7 Funded ${fmtDate(pos.funded_date)}` : ""}</span>
        </div>
        <span className={`badge ${pos.status === "active" ? "badge-active" : "badge-complete"}`}>
          {pos.status === "active" ? "Active" : pos.status}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14, fontSize: 13 }}>
        <div>
          <span style={{ color: "#64748b", fontSize: 11 }}>Advance</span>
          <div style={{ fontWeight: 600 }}>{fmt$(c.funded)}</div>
        </div>
        <div>
          <span style={{ color: "#64748b", fontSize: 11 }}>Total Payback</span>
          <div style={{ fontWeight: 600 }}>{fmt$(c.payback)}</div>
        </div>
        <div>
          <span style={{ color: "#64748b", fontSize: 11 }}>Remaining</span>
          <div style={{ fontWeight: 600, color: "#f87171" }}>{fmt$(c.remaining)}</div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ color: "#7b8499", fontSize: 12 }}>Paid off</span>
        <span style={{ color: "#2dd4bf", fontSize: 12, fontWeight: 600 }}>{c.progress.toFixed(1)}%</span>
      </div>
      <div className="progress-track"><div className="progress-fill" style={{ width: `${Math.min(100, c.progress)}%` }} /></div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display: "flex", gap: 20, fontSize: 12 }}>
          {pos.status === "active" ? (
            <>
              <div>
                <span style={{ color: "#64748b" }}>Next payment</span>
                <div style={{ fontWeight: 500, color: "#e8eaf0" }}>{fmtDate(c.nextPayment)}</div>
              </div>
              <div>
                <span style={{ color: "#64748b" }}>Est. payoff</span>
                <div style={{ fontWeight: 500, color: "#e8eaf0" }}>{fmtDate(c.projectedPayoff)}</div>
              </div>
            </>
          ) : (
            <span style={{ color: "#64748b" }}>Position fully paid off</span>
          )}
        </div>
        <span style={{ color: "#2dd4bf", fontSize: 12, fontWeight: 600 }}>View details &rarr;</span>
      </div>
    </div>
  );
}

// ── OVERVIEW TAB ─────────────────────────────────────────────────────────
function OverviewTab({ positions, banking, onViewPosition, onSwitchTab }: {
  positions: LeadPosition[];
  banking: BankingInsights | null;
  onViewPosition: (pos: LeadPosition) => void;
  onSwitchTab: (tab: string) => void;
}) {
  const activePositions = positions.filter(p => p.status === "active");
  const totalRemaining = positions.reduce((s, p) => s + (Number(p.remaining_balance) || 0), 0);
  const totalMonthlyLoad = positions.reduce((s, p) => s + calcPosition(p).monthlyLoad, 0);
  const revenue = banking?.metrics?.monthlyRevenue || 0;
  const renewalReady = activePositions.filter(p => calcPosition(p).progress >= 50);

  return (
    <div>
      {/* Summary Stats */}
      <div className="stat-grid stat-grid-4">
        <div className="stat-card">
          <div className="stat-label">Open Positions</div>
          <div className="stat-val">{activePositions.length}</div>
          <div className="stat-sub">active</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Remaining</div>
          <div className="stat-val red">{totalRemaining > 0 ? fmt$(totalRemaining) : "\u2014"}</div>
          <div className="stat-sub">across all positions</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Monthly Load</div>
          <div className="stat-val">{totalMonthlyLoad > 0 ? fmt$(totalMonthlyLoad) : "\u2014"}</div>
          <div className="stat-sub">total payments</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Monthly Revenue</div>
          <div className="stat-val teal">{revenue > 0 ? fmt$(revenue) : "\u2014"}</div>
          <div className="stat-sub">{revenue > 0 && totalMonthlyLoad > 0 ? `${(totalMonthlyLoad / revenue * 100).toFixed(0)}% to payments` : banking?.connected ? "from bank data" : "connect bank"}</div>
        </div>
      </div>

      {/* Payment Coverage Insight */}
      {revenue > 0 && totalMonthlyLoad > 0 && (
        <div className="card">
          <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Payment Coverage</p>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
                <span style={{ color: "#7b8499" }}>Payments as % of revenue</span>
                <span style={{ color: (totalMonthlyLoad / revenue * 100) < 20 ? "#2dd4bf" : "#facc15", fontWeight: 600 }}>{(totalMonthlyLoad / revenue * 100).toFixed(1)}%</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${Math.min(100, totalMonthlyLoad / revenue * 100)}%`, background: (totalMonthlyLoad / revenue * 100) < 20 ? "linear-gradient(90deg, #2dd4bf, #14b8a6)" : "linear-gradient(90deg, #facc15, #f59e0b)" }} />
              </div>
              <p style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>
                {(totalMonthlyLoad / revenue * 100) < 15 ? "Your payment load is very manageable. You have room for additional capital if needed." :
                 (totalMonthlyLoad / revenue * 100) < 25 ? "Your payment load is moderate. Consider refinancing to free up cash flow." :
                 "Your payment load is heavy. Consolidation or refinancing could significantly reduce your monthly burden."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Renewal Opportunities */}
      {renewalReady.length > 0 && (
        <div className="card" style={{ background: "rgba(250,204,21,0.06)", border: "1px solid rgba(250,204,21,0.2)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <p style={{ fontWeight: 700, fontSize: 15, color: "#facc15" }}>Renewal Opportunities</p>
            <span className="badge badge-alert">{renewalReady.length} position{renewalReady.length !== 1 ? "s" : ""}</span>
          </div>
          <p style={{ color: "#94a3b8", fontSize: 13, lineHeight: 1.6, marginBottom: 14 }}>
            {renewalReady.length === 1
              ? `Your position with ${renewalReady[0].funder_name} is past 50% paid. You may qualify for a renewal at better terms.`
              : `${renewalReady.length} positions are past 50% paid. You could be eligible for renewals or consolidation at better terms.`}
          </p>
          <a href="/intake/quiz" style={{ display: "inline-block", background: "#facc15", color: "#0f172a", fontWeight: 700, padding: "10px 24px", borderRadius: 8, textDecoration: "none", fontFamily: "'Syne', sans-serif", fontSize: 14 }}>
            Check Your Options
          </a>
        </div>
      )}

      {/* Quick Actions */}
      {(positions.length === 0 || !banking?.connected) && (
        <div className="card">
          <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Get the most out of your dashboard</p>
          <div style={{ display: "grid", gap: 10 }}>
            {positions.length === 0 && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "rgba(255,255,255,0.03)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)" }}>
                <div><p style={{ fontWeight: 600, fontSize: 13 }}>Add a funding position</p><p style={{ color: "#7b8499", fontSize: 12 }}>Track payoffs, see renewal timing, and monitor your progress.</p></div>
                <button className="btn-secondary" onClick={() => onSwitchTab("positions")} style={{ fontSize: 12, whiteSpace: "nowrap" }}>Add Position</button>
              </div>
            )}
            {!banking?.connected && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "rgba(255,255,255,0.03)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)" }}>
                <div><p style={{ fontWeight: 600, fontSize: 13 }}>Connect your bank</p><p style={{ color: "#7b8499", fontSize: 12 }}>Get live cash flow tracking and auto-detect funding positions.</p></div>
                <button className="btn-secondary" onClick={() => onSwitchTab("financials")} style={{ fontSize: 12, whiteSpace: "nowrap" }}>Connect</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Active Positions Preview */}
      {activePositions.length > 0 && (
        <>
          <div className="section-label">Active Positions</div>
          {activePositions.slice(0, 3).map(pos => (
            <PositionCard key={pos.id} pos={pos} onClick={() => onViewPosition(pos)} />
          ))}
          {activePositions.length > 3 && (
            <button className="btn-ghost" onClick={() => onSwitchTab("positions")} style={{ width: "100%", marginTop: 4 }}>
              View all {activePositions.length} positions
            </button>
          )}
        </>
      )}
    </div>
  );
}

// ── POSITIONS TAB ────────────────────────────────────────────────────────
function PositionsTab({ onViewPosition }: { onViewPosition: (pos: LeadPosition) => void }) {
  const [positions, setPositions] = useState<LeadPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [detectMsg, setDetectMsg] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    try { const r = await fetch("/api/lead/positions", { credentials: "include" }); if (r.ok) setPositions(await r.json()); } catch (_) {}
    setLoading(false);
  }, []);
  useEffect(() => { fetch_(); }, [fetch_]);

  const handleDetect = async () => {
    setDetecting(true); setDetectMsg(null);
    try {
      const r = await fetch("/api/lead/detect-positions", { method: "POST", credentials: "include" });
      const data = await r.json();
      if (r.ok) { setDetectMsg(data.message || `Found ${data.detected} position(s).`); if (data.added > 0) fetch_(); }
      else { setDetectMsg(data.error || "Detection failed."); }
    } catch (_) { setDetectMsg("Failed to scan transactions."); }
    setDetecting(false);
  };

  if (loading) return <div className="loading"><div className="spinner" /><p style={{ marginTop: 12 }}>Loading positions...</p></div>;

  const active = positions.filter(p => p.status === "active");
  const completed = positions.filter(p => p.status !== "active");

  return (
    <div>
      {showAdd ? (
        <AddPositionForm onSave={() => { setShowAdd(false); fetch_(); }} onCancel={() => setShowAdd(false)} />
      ) : (
        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          <button className="btn-primary" onClick={() => setShowAdd(true)} style={{ flex: 1 }}>+ Add Manually</button>
          <button className="btn-secondary" onClick={handleDetect} disabled={detecting} style={{ flex: 1 }}>
            {detecting ? "Scanning..." : "Auto-Detect from Bank"}
          </button>
        </div>
      )}

      {detectMsg && (
        <div className="card" style={{ padding: "12px 16px", fontSize: 13, color: "#2dd4bf", background: "rgba(45,212,191,0.08)", border: "1px solid rgba(45,212,191,0.2)" }}>
          {detectMsg}
        </div>
      )}

      {active.length > 0 && (
        <>
          <div className="section-label">Active</div>
          {active.map(pos => <PositionCard key={pos.id} pos={pos} onClick={() => onViewPosition(pos)} />)}
        </>
      )}

      {completed.length > 0 && (
        <>
          <div className="section-label">Completed</div>
          {completed.map(pos => <PositionCard key={pos.id} pos={pos} onClick={() => onViewPosition(pos)} />)}
        </>
      )}

      {positions.length === 0 && !showAdd && (
        <div className="empty"><strong>No positions yet</strong>Add your current funding positions to start tracking payoffs, see next payment dates, and know when you're eligible for a renewal.</div>
      )}
    </div>
  );
}

// ── FINANCIALS TAB ───────────────────────────────────────────────────────
function LeadFinancialsTab() {
  const [banking, setBanking] = useState<BankingInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [popupBlocked, setPopupBlocked] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try { const r = await fetch("/api/lead/banking/insights", { credentials: "include" }); if (r.ok) setBanking(await r.json()); } catch (_) {}
    setLoading(false);
  }, []);
  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSync = async () => { setSyncing(true); try { await fetch("/api/lead/chirp/sync", { method: "POST", credentials: "include" }); await fetchData(); } catch (_) {} setSyncing(false); };

  const handleConnect = async () => {
    setPopupBlocked(null);
    try {
      const res = await fetch("/api/lead/chirp/connect", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: "{}" });
      if (res.ok) {
        const data = await res.json();
        const url = data.widgetUrl || data.verificationUrl;
        if (url) {
          const popup = window.open(url, "chirp-connect", "width=480,height=720");
          if (!popup || popup.closed) setPopupBlocked(url);
        }
      }
    } catch (_) {}
  };

  if (loading) return <div className="loading"><div className="spinner" /><p style={{ marginTop: 12 }}>Loading financial data...</p></div>;

  const m = banking?.metrics;

  return (
    <div>
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 600 }}>Bank Connection</h3>
          {banking?.connected && <span className="badge badge-active">Connected</span>}
        </div>
        {banking?.connected ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#2dd4bf" }} />
              <span style={{ fontWeight: 500 }}>{banking.institutionName || "Connected Bank"}</span>
              {banking.lastSyncedAt && <span style={{ color: "#64748b", fontSize: 11 }}>Last synced {fmtDate(banking.lastSyncedAt)}</span>}
            </div>
            {banking.accounts && banking.accounts.length > 0 && banking.accounts.map((a, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", fontSize: 13 }}>
                <span>{a.name} <span style={{ color: "#64748b", fontSize: 11 }}>{a.type}</span></span>
                <span style={{ fontWeight: 600, color: "#2dd4bf" }}>{fmt$(a.balance)}</span>
              </div>
            ))}
            <button className="btn-secondary" onClick={handleSync} disabled={syncing} style={{ marginTop: 14 }}>{syncing ? "Syncing..." : "Sync Now"}</button>
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <p style={{ color: "#94a3b8", fontSize: 14, marginBottom: 14, lineHeight: 1.6 }}>Connect your bank to unlock live cash flow tracking, auto-detect funding positions, and get personalized insights.</p>
            <button className="btn-primary" onClick={handleConnect} style={{ maxWidth: 300, margin: "0 auto" }}>Connect Your Bank</button>
            {popupBlocked && <div className="popup-fallback">Your browser blocked the popup. <a href={popupBlocked} target="_blank" rel="noopener noreferrer">Click here to connect</a>, then come back.</div>}
          </div>
        )}
      </div>

      {banking?.connected && m && m.monthlyRevenue > 0 && (
        <>
          <div className="card" style={{ textAlign: "center" }}>
            <p style={{ color: "#7b8499", fontSize: 12, marginBottom: 4 }}>Monthly Revenue</p>
            <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 32, fontWeight: 800, color: "#2dd4bf" }}>{fmt$(m.monthlyRevenue)}</p>
            {m.revenueTrend && <p style={{ color: m.revenueTrend === "growing" ? "#2dd4bf" : m.revenueTrend === "declining" ? "#f87171" : "#94a3b8", fontSize: 12, fontWeight: 600, marginTop: 4 }}>{m.revenueTrend === "growing" ? "\u2197 Growing" : m.revenueTrend === "declining" ? "\u2198 Declining" : "\u2192 Stable"}</p>}
          </div>
          <div className="stat-grid stat-grid-3">
            <div className="stat-card">
              <div className="stat-label">Expenses</div>
              <div className="stat-val">{m.monthlyExpenses > 0 ? fmt$(m.monthlyExpenses) : "\u2014"}</div>
              <div className="stat-sub">per month</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Net Cash Flow</div>
              <div className="stat-val" style={{ color: m.netCashFlow >= 0 ? "#2dd4bf" : "#f87171" }}>
                {m.netCashFlow >= 0 ? "+" : "-"}{fmt$(m.netCashFlow)}
              </div>
              <div className="stat-sub">per month</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Current Balance</div>
              <div className="stat-val">{m.currentBalance > 0 ? fmt$(m.currentBalance) : "\u2014"}</div>
              <div className="stat-sub">in the bank</div>
            </div>
          </div>
          {m.healthScore && (
            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <p style={{ fontWeight: 600, fontSize: 14 }}>Financial Health Score</p>
                <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800, color: m.healthScore >= 70 ? "#2dd4bf" : m.healthScore >= 40 ? "#facc15" : "#f87171" }}>{m.healthScore}/100</p>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${m.healthScore}%`, background: m.healthScore >= 70 ? "linear-gradient(90deg, #2dd4bf, #14b8a6)" : m.healthScore >= 40 ? "linear-gradient(90deg, #facc15, #f59e0b)" : "linear-gradient(90deg, #f87171, #ef4444)" }} />
              </div>
            </div>
          )}
        </>
      )}

      {/* PDF Upload */}
      <div className="card">
        <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 600, marginBottom: 10 }}>Upload Bank Statements</h3>
        <p style={{ color: "#94a3b8", fontSize: 13, marginBottom: 14, lineHeight: 1.6 }}>
          {banking?.connected
            ? "Upload PDF statements for additional months or a different account."
            : "Upload PDF bank statements from the last 3 months for an instant financial snapshot."}
        </p>
        <StatementUploader />
      </div>
    </div>
  );
}

// ── STATEMENT UPLOADER ───────────────────────────────────────────────────
function StatementUploader() {
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf')) { setUploadResult("Only PDF files are accepted."); return; }
    setUploading(true); setUploadResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/lead/upload-statement", { method: "POST", credentials: "include", body: formData });
      if (res.ok) { const data = await res.json(); setUploadResult(`Uploaded: ${data.fileName}`); }
      else { const data = await res.json().catch(() => ({})); setUploadResult(data.error || "Upload failed."); }
    } catch (_) { setUploadResult("Upload failed. Please try again."); }
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  };

  return (
    <div>
      <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleUpload} style={{ display: "none" }} />
      <button className="btn-ghost" onClick={() => fileInputRef.current?.click()} disabled={uploading} style={{ width: "100%" }}>
        {uploading ? "Uploading..." : "Choose PDF File"}
      </button>
      {uploadResult && <p style={{ fontSize: 12, color: uploadResult.startsWith("Uploaded") ? "#2dd4bf" : "#f87171", marginTop: 8 }}>{uploadResult}</p>}
    </div>
  );
}

// ── QUALIFY TAB ──────────────────────────────────────────────────────────
function QualifyTab() {
  const [positions, setPositions] = useState<LeadPosition[]>([]);
  const [banking, setBanking] = useState<BankingInsights | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/lead/positions", { credentials: "include" }).then(r => r.ok ? r.json() : []),
      fetch("/api/lead/banking/insights", { credentials: "include" }).then(r => r.ok ? r.json() : null),
    ]).then(([pos, bank]) => { setPositions(pos); setBanking(bank); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading"><div className="spinner" /><p style={{ marginTop: 12 }}>Checking your readiness...</p></div>;

  const revenue = banking?.metrics?.monthlyRevenue || 0;
  const totalMonthlyLoad = positions.reduce((s, p) => s + calcPosition(p).monthlyLoad, 0);
  const paymentShare = revenue > 0 ? (totalMonthlyLoad / revenue) * 100 : 0;
  const hasData = revenue > 0 || positions.length > 0;

  const signals: Array<{ label: string; met: boolean; detail: string }> = [];
  if (revenue > 0) signals.push({ label: "Monthly Revenue", met: revenue >= 10000, detail: revenue >= 10000 ? `${fmt$(revenue)}/mo exceeds the $10k minimum` : `${fmt$(revenue)}/mo \u2014 most options require $10k+` });
  if (positions.length > 0) {
    const nearing = positions.filter(p => calcPosition(p).progress >= 50);
    signals.push({ label: "Position Paydown", met: nearing.length > 0, detail: nearing.length > 0 ? `${nearing.length} position(s) past 50% paid \u2014 renewal territory` : "No positions past 50% yet" });
  }
  if (revenue > 0 && totalMonthlyLoad > 0) signals.push({ label: "Payment Coverage", met: (revenue / totalMonthlyLoad) >= 5, detail: `${(revenue / totalMonthlyLoad).toFixed(1)}x coverage ratio` });
  if (banking?.metrics?.healthScore) signals.push({ label: "Financial Health", met: banking.metrics.healthScore >= 60, detail: `Score: ${banking.metrics.healthScore}/100` });

  return (
    <div>
      {hasData ? (
        <>
          <div className="card">
            <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Funding Readiness</h3>
            {signals.length > 0 ? signals.map((sig, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
                <span style={{ width: 24, height: 24, borderRadius: "50%", background: sig.met ? "rgba(45,212,191,0.15)" : "rgba(250,204,21,0.15)", color: sig.met ? "#2dd4bf" : "#facc15", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>
                  {sig.met ? "\u2713" : "\u2022"}
                </span>
                <div><p style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{sig.label}</p><p style={{ color: "#94a3b8", fontSize: 13 }}>{sig.detail}</p></div>
              </div>
            )) : <p style={{ color: "#94a3b8" }}>Add positions and connect your bank to see readiness signals.</p>}
          </div>

          <div className="card" style={{ background: "linear-gradient(135deg, rgba(45,212,191,0.08), rgba(20,184,166,0.04))", border: "1px solid rgba(45,212,191,0.2)", textAlign: "center" }}>
            <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Ready to explore your options?</h3>
            <p style={{ color: "#94a3b8", fontSize: 14, marginBottom: 16, lineHeight: 1.6 }}>
              {paymentShare > 0 && paymentShare < 20 ? "Your payment load is manageable. You may have room for additional capital or better terms."
                : paymentShare >= 20 ? "Refinancing could lower your daily payment and free up cash flow."
                : "We can match you with funding options tailored to your business."}
            </p>
            <a href="/intake/quiz" style={{ display: "inline-block", background: "#2dd4bf", color: "#0f172a", fontWeight: 700, padding: "12px 32px", borderRadius: 8, textDecoration: "none", fontFamily: "'Syne', sans-serif", fontSize: 15 }}>See What You Qualify For</a>
          </div>
        </>
      ) : (
        <div className="empty"><strong>Get started</strong>Add your funding positions and connect your bank to see personalized qualification signals.</div>
      )}
    </div>
  );
}

// ── RESOURCES TAB ────────────────────────────────────────────────────────
function ResourcesTab() {
  const resources = [
    {
      category: "Credit Monitoring",
      items: [
        { title: "Nav.com \u2014 Free Business Credit Scores", description: "See your Dun & Bradstreet and Experian business credit scores for free. Understand what lenders see.", url: "https://www.nav.com/business-credit-scores/", tag: "Free", tagColor: "#34d399" },
        { title: "Experian Business Credit", description: "Monitor your Experian business credit profile. Get alerts when your score changes.", url: "https://www.experian.com/business/check-business-credit.html", tag: "Free Report", tagColor: "#60a5fa" },
        { title: "Dun & Bradstreet \u2014 Get Your D-U-N-S Number", description: "A D-U-N-S number is essential for building business credit. Get yours for free.", url: "https://www.dnb.com/duns-number/get-a-duns.html", tag: "Free", tagColor: "#34d399" },
      ],
    },
    {
      category: "SBA & Government Programs",
      items: [
        { title: "SBA Loan Programs Overview", description: "Explore SBA 7(a), 504, and Microloan programs. Government-backed loans with lower rates and longer terms.", url: "https://www.sba.gov/funding-programs/loans", tag: "Gov", tagColor: "#a78bfa" },
        { title: "Grants.gov \u2014 Federal Business Grants", description: "Search for federal grant opportunities. Unlike loans, grants don't need to be repaid.", url: "https://www.grants.gov/", tag: "Grants", tagColor: "#fbbf24" },
      ],
    },
    {
      category: "Financial Tools",
      items: [
        { title: "Wave \u2014 Free Accounting Software", description: "Free invoicing, accounting, and receipt scanning for small businesses. No credit card required.", url: "https://www.waveapps.com/", tag: "Free", tagColor: "#34d399" },
        { title: "IRS Tax Calendar for Businesses", description: "Never miss a tax deadline. See all federal tax due dates for your business type.", url: "https://www.irs.gov/businesses/small-businesses-self-employed/tax-calendars", tag: "IRS", tagColor: "#a78bfa" },
      ],
    },
    {
      category: "Business Growth",
      items: [
        { title: "Google Business Profile", description: "Claim and optimize your free Google Business listing. Show up in local search and Maps.", url: "https://business.google.com/", tag: "Free", tagColor: "#34d399" },
        { title: "NEXT Insurance \u2014 Business Insurance", description: "Get affordable business insurance in minutes. General liability, workers' comp, and more.", url: "https://www.nextinsurance.com/", tag: "Quote", tagColor: "#60a5fa" },
      ],
    },
  ];

  return (
    <div>
      <div className="card" style={{ marginBottom: 20 }}>
        <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Business Resources</p>
        <p style={{ color: "#7b8499", fontSize: 14, lineHeight: 1.6 }}>Free tools and resources to help you monitor credit, find funding programs, and grow your business.</p>
      </div>
      {resources.map(group => (
        <div key={group.category}>
          <div className="res-group-title">{group.category}</div>
          <div className="res-grid" style={{ marginBottom: 20 }}>
            {group.items.map(item => (
              <a key={item.title} href={item.url} target="_blank" rel="noopener noreferrer" className="res-card">
                <div className="res-card-head">
                  <div className="res-card-title">{item.title}</div>
                  <span className="res-tag" style={{ background: `${item.tagColor}20`, color: item.tagColor }}>{item.tag}</span>
                </div>
                <div className="res-card-desc">{item.description}</div>
                <div className="res-card-link">Visit &rarr;</div>
              </a>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── ONBOARDING GUIDE ─────────────────────────────────────────────────────
function OnboardingGuide({ step, onAdvance }: { step: string; onAdvance: (tab: string) => void }) {
  const steps = [
    { key: "add_position", label: "Track a Position", desc: "Add your current funding so we can monitor your payoff progress.", tab: "positions" },
    { key: "connect_bank", label: "Connect Your Bank", desc: "Link your bank account for live cash flow insights and auto-detection.", tab: "financials" },
    { key: "view_qualify", label: "Check Your Options", desc: "See what you qualify for based on your financial profile.", tab: "qualify" },
  ];
  const currentIdx = steps.findIndex(s => s.key === step);
  if (currentIdx < 0) return null;

  return (
    <div className="card" style={{ marginBottom: 16, background: "linear-gradient(135deg, rgba(45,212,191,0.06), rgba(20,184,166,0.02))", border: "1px solid rgba(45,212,191,0.15)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700, color: "#2dd4bf" }}>Getting Started</span>
        <span style={{ fontSize: 12, color: "#64748b" }}>Step {currentIdx + 1} of {steps.length}</span>
      </div>
      <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
        {steps.map((_, i) => (
          <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= currentIdx ? "#2dd4bf" : "rgba(255,255,255,0.08)" }} />
        ))}
      </div>
      {steps.map((s, i) => (
        <div key={s.key} style={{
          display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", marginBottom: 4,
          borderRadius: 8, background: i === currentIdx ? "rgba(45,212,191,0.08)" : "transparent",
          opacity: i < currentIdx ? 0.5 : 1,
        }}>
          <span style={{
            width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 700, flexShrink: 0,
            background: i < currentIdx ? "#2dd4bf" : i === currentIdx ? "rgba(45,212,191,0.2)" : "rgba(255,255,255,0.06)",
            color: i < currentIdx ? "#080d18" : i === currentIdx ? "#2dd4bf" : "#64748b",
          }}>
            {i < currentIdx ? "\u2713" : i + 1}
          </span>
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 600, fontSize: 13, color: i === currentIdx ? "#e8eaf0" : "#94a3b8" }}>{s.label}</p>
            {i === currentIdx && <p style={{ fontSize: 12, color: "#7b8499", marginTop: 2 }}>{s.desc}</p>}
          </div>
          {i === currentIdx && <button className="btn-secondary" onClick={() => onAdvance(s.tab)} style={{ fontSize: 12, whiteSpace: "nowrap" }}>Go</button>}
        </div>
      ))}
      <button onClick={() => {
        fetch("/api/lead/onboarding/advance", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ step: "done" }) });
        onAdvance("__skip__");
      }} style={{ background: "none", border: "none", color: "#4b5568", fontSize: 11, cursor: "pointer", marginTop: 8 }}>
        Skip setup
      </button>
    </div>
  );
}

// ── REFERRAL SECTION ─────────────────────────────────────────────────────
function ReferralSection({ referralCode }: { referralCode: string }) {
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState<{ referralCount: number } | null>(null);

  useEffect(() => {
    fetch("/api/lead/referrals", { credentials: "include" }).then(r => r.ok ? r.json() : null).then(setStats).catch(() => {});
  }, []);

  if (!referralCode) return null;

  const link = `${window.location.origin}/track?ref=${referralCode}`;

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <p style={{ fontWeight: 600, fontSize: 14 }}>Refer a business owner</p>
        {stats && stats.referralCount > 0 && <span className="badge badge-active">{stats.referralCount} referral{stats.referralCount !== 1 ? "s" : ""}</span>}
      </div>
      <p style={{ color: "#7b8499", fontSize: 13, marginBottom: 10, lineHeight: 1.5 }}>
        Know someone paying too much on their MCA? Share your link and help them track their positions too.
      </p>
      <div style={{ display: "flex", gap: 8 }}>
        <input className="field-input" readOnly value={link} style={{ fontSize: 12, flex: 1 }} onClick={e => (e.target as HTMLInputElement).select()} />
        <button className="btn-secondary" onClick={() => { navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); }} style={{ whiteSpace: "nowrap" }}>
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
    </div>
  );
}

// ── MAIN LEAD PORTAL ─────────────────────────────────────────────────────
export default function LeadPortal() {
  const [authChecked, setAuthChecked] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [leadName, setLeadName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [hasPassword, setHasPassword] = useState(true);
  const [referralCode, setReferralCode] = useState("");
  const [onboardingStep, setOnboardingStep] = useState("add_position");
  const [activeTab, setActiveTab] = useState<"overview" | "positions" | "financials" | "qualify" | "resources">(() => {
    const saved = sessionStorage.getItem("lp_tab");
    if (saved && ["overview","positions","financials","qualify","resources"].includes(saved)) return saved as any;
    return "overview";
  });
  const [positions, setPositions] = useState<LeadPosition[]>([]);
  const [banking, setBanking] = useState<BankingInsights | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<LeadPosition | null>(null);

  // Check for referral code in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) sessionStorage.setItem("lead_referral", ref);
  }, []);

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/lead/auth/check", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        if (data.isAuthenticated) {
          setLoggedIn(true);
          setLeadName(data.name || "");
          setLeadEmail(data.email || "");
          setBusinessName(data.businessName || "");
          setHasPassword(data.hasPassword !== false);
          setReferralCode(data.referralCode || "");
          setOnboardingStep(data.onboardingStep || "done");
        }
      }
    } catch (_) {}
    setAuthChecked(true);
  }, []);

  useEffect(() => { checkAuth(); }, [checkAuth]);

  // Fetch positions and banking for overview
  useEffect(() => {
    if (loggedIn) {
      fetch("/api/lead/positions", { credentials: "include" }).then(r => r.ok ? r.json() : []).then(setPositions).catch(() => {});
      fetch("/api/lead/banking/insights", { credentials: "include" }).then(r => r.ok ? r.json() : null).then(setBanking).catch(() => {});
    }
  }, [loggedIn]);

  const handleLogout = async () => {
    await fetch("/api/lead/auth/logout", { method: "POST", credentials: "include" });
    setLoggedIn(false);
  };

  if (!authChecked) return null;
  if (!loggedIn) return <LeadAuth onAuth={checkAuth} />;

  // Position detail view
  if (selectedPosition) {
    return (
      <div className="lead-portal">
        <style>{LEAD_CSS}</style>
        <header className="lp-header">
          <div className="lp-header-logo">
            <div className="lp-header-mark">TCG</div>
            <div className="lp-header-brand">Today Capital Group</div>
          </div>
          <div className="lp-header-right">
            <span className="lp-header-user">{leadEmail}</span>
            <button className="lp-header-out" onClick={handleLogout}>Sign out</button>
          </div>
        </header>
        <div className="lp-wrap">
          <PositionDetail pos={selectedPosition} onBack={() => setSelectedPosition(null)} onDeleted={() => { setSelectedPosition(null); }} />
        </div>
      </div>
    );
  }

  const tabs = [
    ["overview", "Overview"],
    ["positions", "Positions"],
    ["financials", "Financials"],
    ["qualify", "Qualify"],
    ["resources", "Resources"],
  ] as const;

  return (
    <div className="lead-portal">
      <style>{LEAD_CSS}</style>

      <header className="lp-header">
        <div className="lp-header-logo">
          <div className="lp-header-mark">TCG</div>
          <div className="lp-header-brand">Today Capital Group</div>
        </div>
        <div className="lp-header-right">
          <span className="lp-header-user">{leadEmail}</span>
          <button className="lp-header-out" onClick={handleLogout}>Sign out</button>
        </div>
      </header>

      <div className="lp-wrap">
        <div className="lp-title">My Portal</div>
        <div className="lp-subtitle">
          {leadName ? `Welcome, ${leadName.split(" ")[0]}.` : "Welcome."} {businessName || "Track your positions and finances."}
        </div>

        {!hasPassword && <SetPasswordBanner />}

        {onboardingStep !== "done" && (
          <OnboardingGuide step={onboardingStep} onAdvance={(tab) => {
            if (tab === "__skip__") { setOnboardingStep("done"); return; }
            setActiveTab(tab as any);
            sessionStorage.setItem("lp_tab", tab);
            const nextStep = tab === "positions" ? "connect_bank" : tab === "financials" ? "view_qualify" : "done";
            fetch("/api/lead/onboarding/advance", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ step: nextStep }) });
            setOnboardingStep(nextStep);
          }} />
        )}

        {/* Navigation */}
        <div className="lp-nav">
          {tabs.map(([key, label]) => (
            <button key={key} className={`lp-nav-btn ${activeTab === key ? "active" : ""}`} onClick={() => { setActiveTab(key); sessionStorage.setItem("lp_tab", key); }}>
              {label}
            </button>
          ))}
        </div>

        {activeTab === "overview" && (
          <OverviewTab
            positions={positions}
            banking={banking}
            onViewPosition={setSelectedPosition}
            onSwitchTab={(tab) => setActiveTab(tab as any)}
          />
        )}
        {activeTab === "positions" && <PositionsTab onViewPosition={setSelectedPosition} />}
        {activeTab === "financials" && <LeadFinancialsTab />}
        {activeTab === "qualify" && <QualifyTab />}
        {activeTab === "resources" && <ResourcesTab />}

        {/* Referral + Contact */}
        <div style={{ marginTop: 24 }}>
          <ReferralSection referralCode={referralCode} />
          <div className="contact-strip" style={{ marginTop: 14 }}>
            <div className="contact-strip-text">
              Questions? <a href="mailto:trevor@todaycapitalgroup.com">Reach out to our team</a> and we'll get back to you within 24 hours.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
