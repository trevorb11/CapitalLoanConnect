import { useState, useEffect, useCallback } from "react";

// ── TYPES ────────────────────────────────────────────────────────────────
interface LeadPosition {
  id: string;
  funderName: string;
  productType: string;
  fundedAmount: number;
  paybackAmount: number;
  factorRate: string;
  paymentAmount: number;
  paymentFrequency: string;
  fundedDate: string;
  estimatedPayoffDate: string;
  remainingBalance: number;
  status: string;
  notes: string;
}

interface BankingInsights {
  connected: boolean;
  hasPendingConnection?: boolean;
  status?: string | null;
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
  const funded = Number(pos.fundedAmount) || 0;
  const payback = Number(pos.paybackAmount) || funded;
  const remaining = Number(pos.remainingBalance) || payback;
  const payment = Number(pos.paymentAmount) || 0;
  const paidSoFar = payback - remaining;
  const progress = payback > 0 ? (paidSoFar / payback) * 100 : 0;

  const freq = pos.paymentFrequency || "daily";
  const paymentsPerMonth = freq === "daily" ? 21 : freq === "weekly" ? 4.33 : freq === "bi-weekly" || freq === "biweekly" ? 2.17 : 1;
  const monthlyLoad = payment * paymentsPerMonth;

  const paymentsLeft = payment > 0 ? Math.ceil(remaining / payment) : 0;
  const businessDaysPerWeek = freq === "daily" ? 5 : freq === "weekly" ? 1 : freq === "bi-weekly" || freq === "biweekly" ? 0.5 : 0.23;
  const weeksLeft = businessDaysPerWeek > 0 ? paymentsLeft / (businessDaysPerWeek * (freq === "daily" ? 5 : 1)) : 0;

  return { funded, payback, remaining, paidSoFar, progress, monthlyLoad, paymentsLeft, weeksLeft: Math.round(weeksLeft) };
}

// ── LEAD LOGIN / SIGNUP ──────────────────────────────────────────────────
function LeadAuth({ onAuth }: { onAuth: () => void }) {
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Signup fields
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

    const endpoint = mode === "signup" ? "/api/lead/signup" : "/api/lead/login";
    const body = mode === "signup"
      ? { email, password, firstName, lastName, phone, businessName }
      : { email, password };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || (mode === "signup" ? "Signup failed" : "Invalid email or password"));
      }

      onAuth();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="merchant-portal-root" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="merchant-login-card" style={{ maxWidth: 440, width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 700, color: "#e8eaf0", marginBottom: 8 }}>
            Financial Command Center
          </h1>
          <p style={{ color: "#94a3b8", fontSize: 14, lineHeight: 1.6 }}>
            {mode === "signup"
              ? "Track your funding positions, monitor cash flow, and get personalized financial insights \u2014 all for free."
              : "Sign in to your financial dashboard."}
          </p>
        </div>

        {error && (
          <div style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: 8, padding: "10px 14px", marginBottom: 16, color: "#f87171", fontSize: 13 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {mode === "signup" && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <label className="login-label">First Name</label>
                  <input className="login-input" value={firstName} onChange={e => setFirstName(e.target.value)} required />
                </div>
                <div>
                  <label className="login-label">Last Name</label>
                  <input className="login-input" value={lastName} onChange={e => setLastName(e.target.value)} required />
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label className="login-label">Business Name</label>
                <input className="login-input" value={businessName} onChange={e => setBusinessName(e.target.value)} required />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label className="login-label">Phone</label>
                <input className="login-input" type="tel" value={phone} onChange={e => setPhone(e.target.value)} />
              </div>
            </>
          )}

          <div style={{ marginBottom: 12 }}>
            <label className="login-label">Email</label>
            <input className="login-input" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label className="login-label">Password</label>
            <input className="login-input" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
          </div>

          <button className="login-btn" type="submit" disabled={loading}>
            {loading ? "Please wait..." : mode === "signup" ? "Create Free Account" : "Sign In"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: 16, color: "#94a3b8", fontSize: 13 }}>
          {mode === "signup" ? (
            <span>Already have an account? <button onClick={() => { setMode("login"); setError(null); }} style={{ background: "none", border: "none", color: "#2dd4bf", cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>Sign in</button></span>
          ) : (
            <span>Don't have an account? <button onClick={() => { setMode("signup"); setError(null); }} style={{ background: "none", border: "none", color: "#2dd4bf", cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>Create one free</button></span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── ADD POSITION FORM ────────────────────────────────────────────────────
function AddPositionForm({ onSave, onCancel }: { onSave: () => void; onCancel: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    funderName: "", productType: "MCA", fundedAmount: "", paybackAmount: "",
    factorRate: "", paymentAmount: "", paymentFrequency: "daily",
    fundedDate: "", remainingBalance: "",
  });

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/lead/positions", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save position");
      }
      onSave();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = { width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#e8eaf0", fontSize: 14, fontFamily: "inherit" };
  const labelStyle = { color: "#94a3b8", fontSize: 12, marginBottom: 4, display: "block" as const };

  return (
    <div className="insight-card">
      <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Add Funding Position</h3>
      {error && <p style={{ color: "#f87171", fontSize: 13, marginBottom: 12 }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div><label style={labelStyle}>Funder / Lender Name *</label><input style={inputStyle} value={form.funderName} onChange={set("funderName")} required /></div>
          <div><label style={labelStyle}>Product Type</label>
            <select style={inputStyle} value={form.productType} onChange={set("productType")}>
              <option value="MCA">MCA</option><option value="LOC">Line of Credit</option><option value="Term Loan">Term Loan</option>
              <option value="SBA">SBA Loan</option><option value="Revenue Based">Revenue Based</option><option value="Other">Other</option>
            </select>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div><label style={labelStyle}>Funded Amount</label><input style={inputStyle} type="number" value={form.fundedAmount} onChange={set("fundedAmount")} placeholder="50000" /></div>
          <div><label style={labelStyle}>Payback Amount</label><input style={inputStyle} type="number" value={form.paybackAmount} onChange={set("paybackAmount")} placeholder="65000" /></div>
          <div><label style={labelStyle}>Factor Rate</label><input style={inputStyle} value={form.factorRate} onChange={set("factorRate")} placeholder="1.30" /></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div><label style={labelStyle}>Payment Amount</label><input style={inputStyle} type="number" value={form.paymentAmount} onChange={set("paymentAmount")} placeholder="500" /></div>
          <div><label style={labelStyle}>Payment Frequency</label>
            <select style={inputStyle} value={form.paymentFrequency} onChange={set("paymentFrequency")}>
              <option value="daily">Daily</option><option value="weekly">Weekly</option><option value="bi-weekly">Bi-Weekly</option><option value="monthly">Monthly</option>
            </select>
          </div>
          <div><label style={labelStyle}>Remaining Balance</label><input style={inputStyle} type="number" value={form.remainingBalance} onChange={set("remainingBalance")} placeholder="32000" /></div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Funded Date</label><input style={{ ...inputStyle, maxWidth: 200 }} type="date" value={form.fundedDate} onChange={set("fundedDate")} />
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button className="login-btn" type="submit" disabled={saving} style={{ flex: 1 }}>{saving ? "Saving..." : "Save Position"}</button>
          <button type="button" onClick={onCancel} style={{ background: "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "10px 20px", color: "#94a3b8", cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
        </div>
      </form>
    </div>
  );
}

// ── POSITIONS TAB ────────────────────────────────────────────────────────
function PositionsTab() {
  const [positions, setPositions] = useState<LeadPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  const fetchPositions = useCallback(async () => {
    try {
      const res = await fetch("/api/lead/positions", { credentials: "include" });
      if (res.ok) setPositions(await res.json());
    } catch (_) {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchPositions(); }, [fetchPositions]);

  const handleDelete = async (id: string) => {
    await fetch(`/api/lead/positions/${id}`, { method: "DELETE", credentials: "include" });
    fetchPositions();
  };

  if (loading) return <div className="insight-card" style={{ textAlign: "center", padding: 40 }}><div className="skeleton-line" style={{ width: "50%", margin: "0 auto" }} /></div>;

  // Totals
  const totalRemaining = positions.reduce((s, p) => s + (Number(p.remainingBalance) || 0), 0);
  const totalMonthlyLoad = positions.reduce((s, p) => s + calcPosition(p).monthlyLoad, 0);

  return (
    <div>
      {showAddForm ? (
        <AddPositionForm onSave={() => { setShowAddForm(false); fetchPositions(); }} onCancel={() => setShowAddForm(false)} />
      ) : (
        <button className="login-btn" onClick={() => setShowAddForm(true)} style={{ marginBottom: 16, width: "100%" }}>
          + Add Funding Position
        </button>
      )}

      {positions.length > 0 && (
        <>
          {/* Summary bar */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div className="insight-card" style={{ textAlign: "center" }}>
              <p style={{ color: "#94a3b8", fontSize: 12, marginBottom: 4 }}>Open Positions</p>
              <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 700, color: "#e8eaf0" }}>{positions.filter(p => p.status === "active").length}</p>
            </div>
            <div className="insight-card" style={{ textAlign: "center" }}>
              <p style={{ color: "#94a3b8", fontSize: 12, marginBottom: 4 }}>Total Remaining</p>
              <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 700, color: "#f87171" }}>{fmt$(totalRemaining)}</p>
            </div>
            <div className="insight-card" style={{ textAlign: "center" }}>
              <p style={{ color: "#94a3b8", fontSize: 12, marginBottom: 4 }}>Monthly Payment Load</p>
              <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 700, color: "#e8eaf0" }}>{fmt$(totalMonthlyLoad)}</p>
            </div>
          </div>

          {/* Position cards */}
          {positions.map(pos => {
            const calc = calcPosition(pos);
            return (
              <div key={pos.id} className="insight-card" style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div>
                    <h4 style={{ fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 600, margin: 0 }}>{pos.funderName}</h4>
                    <span style={{ color: "#94a3b8", fontSize: 12 }}>{pos.productType} {pos.factorRate ? `\u00B7 ${pos.factorRate}x` : ""}</span>
                  </div>
                  <span style={{
                    background: pos.status === "active" ? "rgba(45,212,191,0.15)" : "rgba(148,163,184,0.15)",
                    color: pos.status === "active" ? "#2dd4bf" : "#94a3b8",
                    borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 600,
                  }}>{pos.status === "active" ? "Active" : pos.status}</span>
                </div>

                {/* Progress bar */}
                <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 6, height: 8, marginBottom: 12, overflow: "hidden" }}>
                  <div style={{ width: `${Math.min(100, calc.progress)}%`, height: "100%", background: "linear-gradient(90deg, #2dd4bf, #14b8a6)", borderRadius: 6, transition: "width 0.5s ease" }} />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, fontSize: 12 }}>
                  <div><span style={{ color: "#64748b" }}>Funded</span><br /><strong>{fmt$(calc.funded)}</strong></div>
                  <div><span style={{ color: "#64748b" }}>Payback</span><br /><strong>{fmt$(calc.payback)}</strong></div>
                  <div><span style={{ color: "#64748b" }}>Remaining</span><br /><strong style={{ color: "#f87171" }}>{fmt$(calc.remaining)}</strong></div>
                  <div><span style={{ color: "#64748b" }}>Paid</span><br /><strong style={{ color: "#2dd4bf" }}>{calc.progress.toFixed(0)}%</strong></div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <span style={{ color: "#64748b", fontSize: 12 }}>
                    {fmt$(calc.monthlyLoad)}/mo \u00B7 ~{calc.paymentsLeft} payments left
                  </span>
                  <button onClick={() => handleDelete(pos.id)} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 11 }}>Remove</button>
                </div>
              </div>
            );
          })}
        </>
      )}

      {positions.length === 0 && !showAddForm && (
        <div className="insight-card" style={{ textAlign: "center", padding: "32px 20px" }}>
          <p style={{ color: "#94a3b8", fontSize: 15, marginBottom: 8 }}>No positions added yet.</p>
          <p style={{ color: "#64748b", fontSize: 13 }}>Add your current funding positions to start tracking payoffs and see how they relate to your cash flow.</p>
        </div>
      )}
    </div>
  );
}

// ── FINANCIALS TAB (reuses merchant portal patterns) ─────────────────────
function LeadFinancialsTab() {
  const [banking, setBanking] = useState<BankingInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/lead/banking/insights", { credentials: "include" });
      if (res.ok) setBanking(await res.json());
    } catch (_) {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await fetch("/api/lead/chirp/sync", { method: "POST", credentials: "include" });
      await fetchData();
    } catch (_) {}
    setSyncing(false);
  };

  if (loading) return <div className="insight-card" style={{ textAlign: "center", padding: 40 }}><div className="skeleton-line" style={{ width: "50%", margin: "0 auto" }} /></div>;

  const connected = banking?.connected;
  const metrics = banking?.metrics;

  return (
    <div>
      {/* Bank Connection */}
      <div className="insight-card">
        <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Bank Connection</h3>
        {connected ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#2dd4bf" }} />
              <span style={{ fontWeight: 500 }}>{banking?.institutionName || "Connected Bank"}</span>
              <span style={{ background: "rgba(45,212,191,0.15)", color: "#2dd4bf", borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 600 }}>Connected</span>
            </div>
            {banking?.accounts && banking.accounts.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                {banking.accounts.map((acct, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <span style={{ fontSize: 13 }}>{acct.name} <span style={{ color: "#64748b", fontSize: 11 }}>{acct.type}</span></span>
                    <span style={{ fontWeight: 600, color: "#2dd4bf", fontSize: 13 }}>{fmt$(acct.balance)}</span>
                  </div>
                ))}
              </div>
            )}
            <button className="analyze-btn" onClick={handleSync} disabled={syncing} style={{ fontSize: 12, padding: "8px 14px" }}>
              {syncing ? "Syncing..." : "Sync Now"}
            </button>
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <p style={{ color: "#94a3b8", fontSize: 14, marginBottom: 12 }}>Connect your bank to unlock live cash flow tracking, revenue insights, and personalized recommendations.</p>
            <button className="login-btn" onClick={async () => {
              try {
                const res = await fetch("/api/lead/chirp/connect", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: "{}" });
                if (res.ok) {
                  const data = await res.json();
                  const url = data.widgetUrl || data.verificationUrl;
                  if (url) window.open(url, "chirp-connect", "width=480,height=720");
                }
              } catch (_) {}
            }}>Connect Your Bank</button>
          </div>
        )}
      </div>

      {/* Metrics */}
      {connected && metrics && metrics.monthlyRevenue > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 16 }}>
          <div className="insight-card" style={{ textAlign: "center" }}>
            <p style={{ color: "#94a3b8", fontSize: 12, marginBottom: 4 }}>Monthly Revenue</p>
            <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 700, color: "#2dd4bf" }}>{fmt$(metrics.monthlyRevenue)}</p>
          </div>
          <div className="insight-card" style={{ textAlign: "center" }}>
            <p style={{ color: "#94a3b8", fontSize: 12, marginBottom: 4 }}>Monthly Expenses</p>
            <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 700, color: metrics.monthlyExpenses > 0 ? "#e8eaf0" : "#64748b" }}>
              {metrics.monthlyExpenses > 0 ? fmt$(metrics.monthlyExpenses) : "\u2014"}
            </p>
          </div>
          <div className="insight-card" style={{ textAlign: "center" }}>
            <p style={{ color: "#94a3b8", fontSize: 12, marginBottom: 4 }}>Net Cash Flow</p>
            <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 700, color: metrics.netCashFlow >= 0 ? "#2dd4bf" : "#f87171" }}>
              {metrics.netCashFlow >= 0 ? "+" : "-"}{fmt$(metrics.netCashFlow)}
            </p>
          </div>
          <div className="insight-card" style={{ textAlign: "center" }}>
            <p style={{ color: "#94a3b8", fontSize: 12, marginBottom: 4 }}>Current Balance</p>
            <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 700, color: metrics.currentBalance > 0 ? "#2dd4bf" : "#64748b" }}>
              {metrics.currentBalance > 0 ? fmt$(metrics.currentBalance) : "\u2014"}
            </p>
          </div>
        </div>
      )}

      {/* Upload statements fallback */}
      {!connected && (
        <div className="insight-card" style={{ marginTop: 16, textAlign: "center", padding: "24px 20px" }}>
          <p style={{ color: "#94a3b8", fontSize: 14, marginBottom: 8 }}>Or upload your bank statements for an instant financial analysis.</p>
          <p style={{ color: "#64748b", fontSize: 12 }}>PDF bank statements from the last 3 months work best.</p>
        </div>
      )}
    </div>
  );
}

// ── QUALIFICATION TAB ────────────────────────────────────────────────────
function QualificationTab() {
  const [positions, setPositions] = useState<LeadPosition[]>([]);
  const [banking, setBanking] = useState<BankingInsights | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/lead/positions", { credentials: "include" }).then(r => r.ok ? r.json() : []),
      fetch("/api/lead/banking/insights", { credentials: "include" }).then(r => r.ok ? r.json() : null),
    ]).then(([pos, bank]) => {
      setPositions(pos);
      setBanking(bank);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="insight-card" style={{ textAlign: "center", padding: 40 }}><div className="skeleton-line" style={{ width: "50%", margin: "0 auto" }} /></div>;

  const revenue = banking?.metrics?.monthlyRevenue || 0;
  const totalMonthlyLoad = positions.reduce((s, p) => s + calcPosition(p).monthlyLoad, 0);
  const coverageMultiple = totalMonthlyLoad > 0 ? revenue / totalMonthlyLoad : 0;
  const paymentShare = revenue > 0 ? (totalMonthlyLoad / revenue) * 100 : 0;
  const hasData = revenue > 0 || positions.length > 0;

  // Qualification signals
  const signals: Array<{ label: string; met: boolean; detail: string }> = [];
  if (revenue > 0) {
    signals.push({ label: "Monthly Revenue", met: revenue >= 10000, detail: revenue >= 10000 ? `${fmt$(revenue)}/mo exceeds $10k minimum` : `${fmt$(revenue)}/mo \u2014 most options need $10k+` });
  }
  if (positions.length > 0) {
    const nearing = positions.filter(p => calcPosition(p).progress >= 50);
    signals.push({ label: "Position Paydown", met: nearing.length > 0, detail: nearing.length > 0 ? `${nearing.length} position(s) past 50% paid \u2014 renewal territory` : "No positions past 50% yet" });
  }
  if (revenue > 0 && totalMonthlyLoad > 0) {
    signals.push({ label: "Payment Coverage", met: coverageMultiple >= 5, detail: coverageMultiple >= 5 ? `${coverageMultiple.toFixed(1)}x coverage \u2014 strong position for additional funding` : `${coverageMultiple.toFixed(1)}x coverage \u2014 tighter, but options may still be available` });
  }
  if (banking?.metrics?.healthScore) {
    signals.push({ label: "Financial Health", met: banking.metrics.healthScore >= 60, detail: `Score: ${banking.metrics.healthScore}/100` });
  }

  return (
    <div>
      {hasData ? (
        <>
          {/* Qualification signals */}
          <div className="insight-card">
            <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Funding Readiness</h3>
            {signals.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {signals.map((sig, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <span style={{ width: 24, height: 24, borderRadius: "50%", background: sig.met ? "rgba(45,212,191,0.15)" : "rgba(250,204,21,0.15)", color: sig.met ? "#2dd4bf" : "#facc15", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>
                      {sig.met ? "\u2713" : "\u2022"}
                    </span>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{sig.label}</p>
                      <p style={{ color: "#94a3b8", fontSize: 13 }}>{sig.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: "#94a3b8", fontSize: 14 }}>Add positions and connect your bank to see your funding readiness signals.</p>
            )}
          </div>

          {/* CTA */}
          <div style={{ marginTop: 16, background: "linear-gradient(135deg, rgba(45,212,191,0.1), rgba(20,184,166,0.05))", border: "1px solid rgba(45,212,191,0.2)", borderRadius: 12, padding: "24px 20px", textAlign: "center" }}>
            <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 600, marginBottom: 8, color: "#e8eaf0" }}>
              Ready to explore your options?
            </h3>
            <p style={{ color: "#94a3b8", fontSize: 14, marginBottom: 16, lineHeight: 1.6 }}>
              {paymentShare > 0 && paymentShare < 20
                ? "Your payment load is manageable \u2014 you may have room for additional capital or a refinance at better terms."
                : paymentShare >= 20
                ? "Refinancing could lower your daily payment and free up cash flow for your business."
                : "Based on your profile, we can match you with funding options tailored to your business."}
            </p>
            <a href="/intake/quiz" style={{ display: "inline-block", background: "#2dd4bf", color: "#0f172a", fontWeight: 700, padding: "12px 32px", borderRadius: 8, textDecoration: "none", fontFamily: "'Syne', sans-serif", fontSize: 15 }}>
              See What You Qualify For
            </a>
          </div>
        </>
      ) : (
        <div className="insight-card" style={{ textAlign: "center", padding: "32px 20px" }}>
          <p style={{ color: "#94a3b8", fontSize: 15, lineHeight: 1.7 }}>
            Add your funding positions and connect your bank to see personalized qualification signals and funding options.
          </p>
        </div>
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
        if (data.isAuthenticated) {
          setLoggedIn(true);
          setLeadName(data.name || "");
          setBusinessName(data.businessName || "");
        }
      }
    } catch (_) {}
    setAuthChecked(true);
  }, []);

  useEffect(() => { checkAuth(); }, [checkAuth]);

  const handleLogout = async () => {
    await fetch("/api/lead/auth/logout", { method: "POST", credentials: "include" });
    setLoggedIn(false);
    setLeadName("");
    setBusinessName("");
  };

  if (!authChecked) return null;

  if (!loggedIn) {
    return <LeadAuth onAuth={checkAuth} />;
  }

  const tabs = [
    { key: "positions" as const, label: "My Positions" },
    { key: "financials" as const, label: "Financials" },
    { key: "qualify" as const, label: "Qualify" },
  ];

  return (
    <div className="merchant-portal-root">
      <div className="merchant-portal-container" style={{ maxWidth: 800, margin: "0 auto", padding: "32px 16px" }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 700, color: "#e8eaf0", margin: 0 }}>
                Financial Command Center
              </h1>
              <p style={{ color: "#94a3b8", fontSize: 14, marginTop: 4 }}>
                {leadName ? `Welcome, ${leadName}.` : "Welcome."} {businessName ? `${businessName}` : "Track your positions and finances."}
              </p>
            </div>
            <button onClick={handleLogout} style={{ background: "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "8px 16px", color: "#94a3b8", cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>
              Sign Out
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ display: "flex", background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: 4, marginBottom: 24, border: "1px solid rgba(255,255,255,0.06)" }}>
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                flex: 1, padding: "10px 0", borderRadius: 8, border: "none", cursor: "pointer",
                fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 600,
                background: activeTab === tab.key ? "#2dd4bf" : "transparent",
                color: activeTab === tab.key ? "#0f172a" : "#94a3b8",
                transition: "all 0.2s ease",
              }}
            >{tab.label}</button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === "positions" && <PositionsTab />}
        {activeTab === "financials" && <LeadFinancialsTab />}
        {activeTab === "qualify" && <QualificationTab />}
      </div>
    </div>
  );
}
