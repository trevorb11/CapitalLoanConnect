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

  .lead-portal .card {
    background: rgba(15,23,41,0.7);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 16px;
    padding: 20px;
    margin-bottom: 12px;
  }

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

  .lead-portal .tab-bar {
    display: flex; gap: 4px; margin-bottom: 24px;
    background: rgba(15,23,41,0.7); border: 1px solid rgba(255,255,255,0.06);
    border-radius: 12px; padding: 4px; overflow-x: auto; -webkit-overflow-scrolling: touch;
  }

  .lead-portal .tab-btn {
    flex: 1; padding: 10px 16px; background: none; border: none; border-radius: 8px;
    color: #7b8499; font-family: 'DM Sans', sans-serif; font-size: 13px;
    font-weight: 500; cursor: pointer; transition: all 0.2s;
    white-space: nowrap; min-width: 0;
  }

  .lead-portal .tab-btn:hover { color: #e8eaf0; background: rgba(255,255,255,0.04); }
  .lead-portal .tab-btn.active { background: rgba(45,212,191,0.1); color: #2dd4bf; font-weight: 600; }

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

  .lead-portal .badge {
    display: inline-block; padding: 2px 10px; border-radius: 20px;
    font-size: 11px; font-weight: 600;
  }

  .lead-portal .popup-fallback {
    margin-top: 12px; padding: 12px 16px;
    background: rgba(250,204,21,0.08); border: 1px solid rgba(250,204,21,0.2);
    border-radius: 8px; font-size: 13px; color: #facc15; text-align: center;
  }

  .lead-portal .popup-fallback a { color: #2dd4bf; font-weight: 600; text-decoration: underline; }

  .lead-portal .progress-track {
    height: 8px; background: rgba(255,255,255,0.06); border-radius: 6px; overflow: hidden;
  }

  .lead-portal .progress-fill {
    height: 100%; background: linear-gradient(90deg, #2dd4bf, #14b8a6);
    border-radius: 6px; transition: width 0.5s ease;
  }

  @media (max-width: 640px) {
    .lead-portal .tab-btn { flex: none; padding: 10px 14px; font-size: 12px; }
    .lead-portal .card { padding: 16px; }
    .lead-portal h1 { font-size: 22px !important; }
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
  return { funded, payback, remaining, paidSoFar, progress, monthlyLoad, paymentsLeft };
}

// ── LEAD AUTH ─────────────────────────────────────────────────────────────
function LeadAuth({ onAuth }: { onAuth: () => void }) {
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [businessName, setBusinessName] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const endpoint = mode === "signup" ? "/api/lead/signup" : "/api/lead/login";
      const body = mode === "signup" ? { email, password, firstName, lastName, phone, businessName } : { email, password };
      const res = await fetch(endpoint, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Something went wrong");
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
      <div className="card" style={{ maxWidth: 440, width: "100%", padding: "40px 32px" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 26, fontWeight: 700, marginBottom: 8 }}>Financial Command Center</h1>
          <p style={{ color: "#7b8499", fontSize: 14, lineHeight: 1.6 }}>
            {mode === "signup" ? "Track your funding positions, monitor cash flow, and get personalized insights \u2014 free." : "Sign in to your dashboard."}
          </p>
        </div>
        {error && <div style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: 8, padding: "10px 14px", marginBottom: 16, color: "#f87171", fontSize: 13 }}>{error}</div>}
        <form onSubmit={handleSubmit}>
          {mode === "signup" && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                <div><label className="field-label">First Name</label><input className="field-input" value={firstName} onChange={e => setFirstName(e.target.value)} required /></div>
                <div><label className="field-label">Last Name</label><input className="field-input" value={lastName} onChange={e => setLastName(e.target.value)} required /></div>
              </div>
              <div style={{ marginBottom: 14 }}><label className="field-label">Business Name</label><input className="field-input" value={businessName} onChange={e => setBusinessName(e.target.value)} required /></div>
              <div style={{ marginBottom: 14 }}><label className="field-label">Phone</label><input className="field-input" type="tel" value={phone} onChange={e => setPhone(e.target.value)} /></div>
            </>
          )}
          <div style={{ marginBottom: 14 }}><label className="field-label">Email</label><input className="field-input" type="email" value={email} onChange={e => setEmail(e.target.value)} required /></div>
          <div style={{ marginBottom: 20 }}><label className="field-label">Password</label><input className="field-input" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} /></div>
          <button className="btn-primary" type="submit" disabled={loading}>{loading ? "Please wait..." : mode === "signup" ? "Create Free Account" : "Sign In"}</button>
        </form>
        <div style={{ textAlign: "center", marginTop: 16, color: "#7b8499", fontSize: 13 }}>
          {mode === "signup"
            ? <span>Already have an account? <button onClick={() => { setMode("login"); setError(null); }} style={{ background: "none", border: "none", color: "#2dd4bf", cursor: "pointer", fontSize: 13 }}>Sign in</button></span>
            : <span>No account? <button onClick={() => { setMode("signup"); setError(null); }} style={{ background: "none", border: "none", color: "#2dd4bf", cursor: "pointer", fontSize: 13 }}>Create one free</button></span>}
        </div>
      </div>
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
          <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
        </div>
      </form>
    </div>
  );
}

// ── POSITIONS TAB ────────────────────────────────────────────────────────
function PositionsTab() {
  const [positions, setPositions] = useState<LeadPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  const fetch_ = useCallback(async () => {
    try { const r = await fetch("/api/lead/positions", { credentials: "include" }); if (r.ok) setPositions(await r.json()); } catch (_) {}
    setLoading(false);
  }, []);
  useEffect(() => { fetch_(); }, [fetch_]);

  const handleDelete = async (id: string) => { await fetch(`/api/lead/positions/${id}`, { method: "DELETE", credentials: "include" }); fetch_(); };

  if (loading) return <div className="loading"><div className="spinner" /><p style={{ marginTop: 12 }}>Loading positions...</p></div>;

  const totalRemaining = positions.reduce((s, p) => s + (Number(p.remaining_balance) || 0), 0);
  const totalMonthlyLoad = positions.reduce((s, p) => s + calcPosition(p).monthlyLoad, 0);

  return (
    <div>
      {showAdd ? (
        <AddPositionForm onSave={() => { setShowAdd(false); fetch_(); }} onCancel={() => setShowAdd(false)} />
      ) : (
        <button className="btn-primary" onClick={() => setShowAdd(true)} style={{ marginBottom: 16 }}>+ Add Funding Position</button>
      )}

      {positions.length > 0 && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div className="card" style={{ textAlign: "center" }}>
              <p style={{ color: "#94a3b8", fontSize: 11, marginBottom: 4 }}>Open Positions</p>
              <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 700 }}>{positions.filter(p => p.status === "active").length}</p>
            </div>
            <div className="card" style={{ textAlign: "center" }}>
              <p style={{ color: "#94a3b8", fontSize: 11, marginBottom: 4 }}>Total Remaining</p>
              <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 700, color: "#f87171" }}>{fmt$(totalRemaining)}</p>
            </div>
            <div className="card" style={{ textAlign: "center" }}>
              <p style={{ color: "#94a3b8", fontSize: 11, marginBottom: 4 }}>Monthly Payments</p>
              <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 700 }}>{fmt$(totalMonthlyLoad)}</p>
            </div>
          </div>

          {positions.map(pos => {
            const c = calcPosition(pos);
            return (
              <div key={pos.id} className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div>
                    <h4 style={{ fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 600 }}>{pos.funder_name}</h4>
                    <span style={{ color: "#7b8499", fontSize: 12 }}>{pos.product_type}{pos.factor_rate ? ` \u00B7 ${pos.factor_rate}x` : ""}</span>
                  </div>
                  <span className="badge" style={{ background: pos.status === "active" ? "rgba(45,212,191,0.15)" : "rgba(148,163,184,0.15)", color: pos.status === "active" ? "#2dd4bf" : "#94a3b8" }}>
                    {pos.status === "active" ? "Active" : pos.status}
                  </span>
                </div>
                <div className="progress-track" style={{ marginBottom: 12 }}><div className="progress-fill" style={{ width: `${Math.min(100, c.progress)}%` }} /></div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, fontSize: 12 }}>
                  <div><span style={{ color: "#64748b" }}>Funded</span><br /><strong>{fmt$(c.funded)}</strong></div>
                  <div><span style={{ color: "#64748b" }}>Payback</span><br /><strong>{fmt$(c.payback)}</strong></div>
                  <div><span style={{ color: "#64748b" }}>Remaining</span><br /><strong style={{ color: "#f87171" }}>{fmt$(c.remaining)}</strong></div>
                  <div><span style={{ color: "#64748b" }}>Paid</span><br /><strong style={{ color: "#2dd4bf" }}>{c.progress.toFixed(0)}%</strong></div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <span style={{ color: "#64748b", fontSize: 12 }}>{fmt$(c.monthlyLoad)}/mo \u00B7 ~{c.paymentsLeft} payments left</span>
                  <button onClick={() => handleDelete(pos.id)} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 11 }}>Remove</button>
                </div>
              </div>
            );
          })}
        </>
      )}

      {positions.length === 0 && !showAdd && (
        <div className="empty"><strong>No positions yet</strong>Add your current funding positions to start tracking payoffs and see how they relate to your cash flow.</div>
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
        <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Bank Connection</h3>
        {banking?.connected ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#2dd4bf" }} />
              <span style={{ fontWeight: 500 }}>{banking.institutionName || "Connected Bank"}</span>
              <span className="badge" style={{ background: "rgba(45,212,191,0.15)", color: "#2dd4bf" }}>Connected</span>
            </div>
            {banking.accounts && banking.accounts.length > 0 && banking.accounts.map((a, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", fontSize: 13 }}>
                <span>{a.name} <span style={{ color: "#64748b", fontSize: 11 }}>{a.type}</span></span>
                <span style={{ fontWeight: 600, color: "#2dd4bf" }}>{fmt$(a.balance)}</span>
              </div>
            ))}
            <button className="btn-secondary" onClick={handleSync} disabled={syncing} style={{ marginTop: 12 }}>{syncing ? "Syncing..." : "Sync Now"}</button>
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "12px 0" }}>
            <p style={{ color: "#94a3b8", fontSize: 14, marginBottom: 12 }}>Connect your bank to unlock live cash flow tracking and personalized recommendations.</p>
            <button className="btn-primary" onClick={handleConnect}>Connect Your Bank</button>
            {popupBlocked && (
              <div className="popup-fallback">Your browser blocked the popup. <a href={popupBlocked} target="_blank" rel="noopener noreferrer">Click here to connect</a>, then come back.</div>
            )}
          </div>
        )}
      </div>

      {banking?.connected && m && m.monthlyRevenue > 0 && (
        <>
          <div className="card" style={{ textAlign: "center" }}>
            <p style={{ color: "#94a3b8", fontSize: 13, marginBottom: 4 }}>What You're Bringing In</p>
            <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 30, fontWeight: 700, color: "#2dd4bf" }}>{fmt$(m.monthlyRevenue)}</p>
            <p style={{ color: "#64748b", fontSize: 11 }}>per month</p>
            {m.revenueTrend && <p style={{ color: m.revenueTrend === "growing" ? "#2dd4bf" : m.revenueTrend === "declining" ? "#f87171" : "#94a3b8", fontSize: 12, fontWeight: 600, marginTop: 6 }}>{m.revenueTrend === "growing" ? "\u2197" : m.revenueTrend === "declining" ? "\u2198" : "\u2192"} {m.revenueTrend}</p>}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div className="card" style={{ textAlign: "center" }}>
              <p style={{ color: "#94a3b8", fontSize: 11, marginBottom: 4 }}>Going Out</p>
              <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 700 }}>{m.monthlyExpenses > 0 ? fmt$(m.monthlyExpenses) : "\u2014"}</p>
            </div>
            <div className="card" style={{ textAlign: "center" }}>
              <p style={{ color: "#94a3b8", fontSize: 11, marginBottom: 4 }}>What's Left</p>
              <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 700, color: m.netCashFlow >= 0 ? "#2dd4bf" : "#f87171" }}>
                {m.netCashFlow >= 0 ? "+" : "-"}{fmt$(m.netCashFlow)}
              </p>
            </div>
            <div className="card" style={{ textAlign: "center" }}>
              <p style={{ color: "#94a3b8", fontSize: 11, marginBottom: 4 }}>In the Bank</p>
              <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 700, color: m.currentBalance > 0 ? "#2dd4bf" : "#64748b" }}>
                {m.currentBalance > 0 ? fmt$(m.currentBalance) : "\u2014"}
              </p>
            </div>
          </div>
        </>
      )}

      {!banking?.connected && (
        <div className="empty" style={{ marginTop: 4 }}><strong>Or upload bank statements</strong>PDF bank statements from the last 3 months work best for an instant financial analysis.</div>
      )}
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
  const coverageMultiple = totalMonthlyLoad > 0 ? revenue / totalMonthlyLoad : 0;
  const paymentShare = revenue > 0 ? (totalMonthlyLoad / revenue) * 100 : 0;
  const hasData = revenue > 0 || positions.length > 0;

  const signals: Array<{ label: string; met: boolean; detail: string }> = [];
  if (revenue > 0) signals.push({ label: "Monthly Revenue", met: revenue >= 10000, detail: revenue >= 10000 ? `${fmt$(revenue)}/mo exceeds the $10k minimum` : `${fmt$(revenue)}/mo — most options require $10k+` });
  if (positions.length > 0) {
    const nearing = positions.filter(p => calcPosition(p).progress >= 50);
    signals.push({ label: "Position Paydown", met: nearing.length > 0, detail: nearing.length > 0 ? `${nearing.length} position(s) past 50% paid — renewal territory` : "No positions past 50% yet" });
  }
  if (revenue > 0 && totalMonthlyLoad > 0) signals.push({ label: "Payment Coverage", met: coverageMultiple >= 5, detail: `${coverageMultiple.toFixed(1)}x coverage` });
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
              {paymentShare > 0 && paymentShare < 20 ? "Your payment load is manageable — you may have room for additional capital or better terms."
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

// ── MAIN LEAD PORTAL ─────────────────────────────────────────────────────
export default function LeadPortal() {
  const [authChecked, setAuthChecked] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [leadName, setLeadName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [activeTab, setActiveTab] = useState<"positions" | "financials" | "qualify">("positions");

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/lead/auth/check", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        if (data.isAuthenticated) { setLoggedIn(true); setLeadName(data.name || ""); setBusinessName(data.businessName || ""); }
      }
    } catch (_) {}
    setAuthChecked(true);
  }, []);

  useEffect(() => { checkAuth(); }, [checkAuth]);

  if (!authChecked) return null;
  if (!loggedIn) return <LeadAuth onAuth={checkAuth} />;

  return (
    <div className="lead-portal">
      <style>{LEAD_CSS}</style>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "32px 16px 80px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <div>
            <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 26, fontWeight: 700, margin: 0 }}>Financial Command Center</h1>
            <p style={{ color: "#7b8499", fontSize: 14, marginTop: 4 }}>
              {leadName ? `Welcome, ${leadName.split(" ")[0]}.` : "Welcome."} {businessName || "Track your positions and finances."}
            </p>
          </div>
          <button className="btn-secondary" onClick={async () => { await fetch("/api/lead/auth/logout", { method: "POST", credentials: "include" }); setLoggedIn(false); }}>Sign Out</button>
        </div>

        <div className="tab-bar">
          {([["positions", "My Positions"], ["financials", "Financials"], ["qualify", "Qualify"]] as const).map(([key, label]) => (
            <button key={key} className={`tab-btn ${activeTab === key ? "active" : ""}`} onClick={() => setActiveTab(key)}>{label}</button>
          ))}
        </div>

        {activeTab === "positions" && <PositionsTab />}
        {activeTab === "financials" && <LeadFinancialsTab />}
        {activeTab === "qualify" && <QualifyTab />}
      </div>
    </div>
  );
}
