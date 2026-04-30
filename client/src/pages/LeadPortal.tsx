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

  .lead-portal .upload-zone {
    border: 1.5px dashed rgba(45,212,191,0.3);
    border-radius: 10px;
    padding: 24px 20px;
    text-align: center;
    cursor: pointer;
    transition: border-color 0.2s, background 0.2s;
    background: rgba(45,212,191,0.03);
  }
  .lead-portal .upload-zone:hover, .lead-portal .upload-zone.dragging {
    border-color: rgba(45,212,191,0.6);
    background: rgba(45,212,191,0.06);
  }
  .lead-portal .upload-zone p { color: #7b8499; font-size: 13px; margin-top: 6px; line-height: 1.5; }
  .lead-portal .upload-zone strong { color: #94a3b8; font-size: 14px; }

  .lead-portal .upload-list { margin-top: 12px; display: flex; flex-direction: column; gap: 6px; }
  .lead-portal .upload-item {
    display: flex; align-items: center; justify-content: space-between;
    padding: 8px 12px; border-radius: 8px;
    background: rgba(45,212,191,0.06); border: 1px solid rgba(45,212,191,0.15);
    font-size: 13px;
  }
  .lead-portal .upload-item .file-name { color: #e8eaf0; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .lead-portal .upload-item .file-status { color: #2dd4bf; font-size: 11px; flex-shrink: 0; margin-left: 8px; }
  .lead-portal .upload-item.error { background: rgba(248,113,113,0.06); border-color: rgba(248,113,113,0.2); }
  .lead-portal .upload-item.error .file-status { color: #f87171; }
  .lead-portal .upload-item.existing { background: rgba(255,255,255,0.03); border-color: rgba(255,255,255,0.08); }
  .lead-portal .upload-item.existing .file-status { color: #64748b; }

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
    revenueTrend?: string | null;
    healthScore?: number;
  };
}

interface SavedStatement {
  id: string;
  fileName: string;
  fileSize: number;
  uploadedAt: string | null;
  viewToken: string | null;
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
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [showOptional, setShowOptional] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const endpoint = mode === "signup" ? "/api/lead/signup" : "/api/lead/login";
      const body = mode === "signup"
        ? { email, password, businessName, phone: phone || undefined, firstName: "", lastName: "" }
        : { email, password };
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
    <div className="lead-portal" style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 24, minHeight: "100vh" }}>
      <style>{LEAD_CSS}</style>
      <div style={{ maxWidth: 420, width: "100%" }}>
        {/* Logo / Brand */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <img
            src="https://cdn.prod.website-files.com/6864b4e14db4a4b6864c7968/686c11dae8ddeadf0fc2ffa7_Group%2017.svg"
            alt="Today Capital Group"
            style={{ height: 40, width: "auto", marginBottom: 20 }}
          />
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 26, fontWeight: 700, marginBottom: 8 }}>
            {mode === "signup" ? "Track your funding" : "Welcome back"}
          </h1>
          <p style={{ color: "#7b8499", fontSize: 14, lineHeight: 1.6 }}>
            {mode === "signup"
              ? "Monitor your positions, cash flow, and renewal readiness — free."
              : "Sign in to your financial dashboard."}
          </p>
        </div>

        <div className="card" style={{ padding: "28px 24px" }}>
          {error && (
            <div style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: 8, padding: "10px 14px", marginBottom: 16, color: "#f87171", fontSize: 13 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {mode === "signup" && (
              <div style={{ marginBottom: 14 }}>
                <label className="field-label">Business Name *</label>
                <input
                  className="field-input"
                  value={businessName}
                  onChange={e => setBusinessName(e.target.value)}
                  placeholder="Acme LLC"
                  required
                  data-testid="input-business-name"
                />
              </div>
            )}

            <div style={{ marginBottom: 14 }}>
              <label className="field-label">Email *</label>
              <input
                className="field-input"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@business.com"
                required
                data-testid="input-email"
              />
            </div>

            <div style={{ marginBottom: mode === "signup" ? 10 : 20 }}>
              <label className="field-label">Password *</label>
              <input
                className="field-input"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder={mode === "signup" ? "At least 6 characters" : ""}
                data-testid="input-password"
              />
            </div>

            {/* Optional fields — hidden by default on signup to reduce friction */}
            {mode === "signup" && (
              <>
                {!showOptional ? (
                  <button
                    type="button"
                    onClick={() => setShowOptional(true)}
                    style={{ background: "none", border: "none", color: "#64748b", fontSize: 12, cursor: "pointer", marginBottom: 16, padding: 0 }}
                  >
                    + Add phone number (used for bank verification)
                  </button>
                ) : (
                  <div style={{ marginBottom: 16 }}>
                    <label className="field-label">Phone <span style={{ color: "#4b5568", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optional — needed for bank connection)</span></label>
                    <input
                      className="field-input"
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="(555) 000-0000"
                      data-testid="input-phone"
                    />
                  </div>
                )}
              </>
            )}

            <button
              className="btn-primary"
              type="submit"
              disabled={loading}
              data-testid="button-submit"
              style={{ marginTop: 4 }}
            >
              {loading ? "Please wait…" : mode === "signup" ? "Create Free Account" : "Sign In"}
            </button>
          </form>

          <div style={{ textAlign: "center", marginTop: 16, color: "#7b8499", fontSize: 13 }}>
            {mode === "signup"
              ? <span>Already have an account?{" "}<button onClick={() => { setMode("login"); setError(null); }} style={{ background: "none", border: "none", color: "#2dd4bf", cursor: "pointer", fontSize: 13 }}>Sign in</button></span>
              : <span>No account?{" "}<button onClick={() => { setMode("signup"); setError(null); }} style={{ background: "none", border: "none", color: "#2dd4bf", cursor: "pointer", fontSize: 13 }}>Create one free</button></span>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── ADD POSITION FORM ────────────────────────────────────────────────────
function AddPositionForm({ onSave, onCancel }: { onSave: () => void; onCancel: () => void }) {
  const [mode, setMode] = useState<"choose" | "extract" | "manual">("choose");
  const [extractTab, setExtractTab] = useState<"paste" | "termsheet" | "statement">("paste");
  const [pasteText, setPasteText] = useState("");
  const [extractFile, setExtractFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [extractNotes, setExtractNotes] = useState<string | null>(null);
  const [wasExtracted, setWasExtracted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    funderName: "", productType: "MCA", fundedAmount: "", paybackAmount: "",
    factorRate: "", paymentAmount: "", paymentFrequency: "daily", fundedDate: "", remainingBalance: ""
  });
  const set = (f: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [f]: e.target.value }));

  const handleExtract = async () => {
    setExtracting(true); setExtractError(null); setExtractNotes(null);
    try {
      const fd = new FormData();
      if ((extractTab === "termsheet" || extractTab === "statement") && extractFile) {
        fd.append("file", extractFile);
      } else {
        fd.append("text", pasteText);
      }
      const res = await fetch("/api/lead/positions/extract", { method: "POST", credentials: "include", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Extraction failed");
      setForm({
        funderName: data.funderName || "",
        productType: data.productType || "MCA",
        fundedAmount: data.fundedAmount != null ? String(data.fundedAmount) : "",
        paybackAmount: data.paybackAmount != null ? String(data.paybackAmount) : "",
        factorRate: data.factorRate || "",
        paymentAmount: data.paymentAmount != null ? String(data.paymentAmount) : "",
        paymentFrequency: data.paymentFrequency || "daily",
        fundedDate: data.fundedDate || "",
        remainingBalance: data.remainingBalance != null ? String(data.remainingBalance) : "",
      });
      if (data.notes) setExtractNotes(data.notes);
      setWasExtracted(true);
      setMode("manual");
    } catch (e: any) { setExtractError(e.message); } finally { setExtracting(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError(null);
    try {
      const res = await fetch("/api/lead/positions", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Failed to save");
      onSave();
    } catch (e: any) { setError(e.message); } finally { setSaving(false); }
  };

  if (mode === "choose") return (
    <div className="card">
      <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 600, marginBottom: 6 }}>Add Funding Position</h3>
      <p style={{ color: "#7b8499", fontSize: 13, marginBottom: 20 }}>How would you like to add this position?</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        <button type="button" onClick={() => setMode("extract")} style={{
          background: "rgba(45,212,191,0.07)", border: "1.5px solid rgba(45,212,191,0.3)", borderRadius: 10,
          padding: "20px 16px", cursor: "pointer", textAlign: "center", color: "inherit"
        }} data-testid="btn-use-document">
          <div style={{ fontSize: 22, marginBottom: 8 }}>✦</div>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4, color: "#2dd4bf" }}>Smart Extract</div>
          <div style={{ color: "#7b8499", fontSize: 12, lineHeight: 1.5 }}>Upload a term sheet, bank statement, or paste copied terms &mdash; AI fills in the details</div>
        </button>
        <button type="button" onClick={() => setMode("manual")} style={{
          background: "rgba(255,255,255,0.03)", border: "1.5px solid rgba(255,255,255,0.08)", borderRadius: 10,
          padding: "20px 16px", cursor: "pointer", textAlign: "center", color: "inherit"
        }} data-testid="btn-manual-entry">
          <div style={{ fontSize: 22, marginBottom: 8 }}>&#9998;</div>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4, color: "#e8eaf0" }}>Enter Manually</div>
          <div style={{ color: "#7b8499", fontSize: 12, lineHeight: 1.5 }}>Fill in the funding details yourself</div>
        </button>
      </div>
      <button type="button" onClick={onCancel} className="btn-secondary" style={{ width: "100%" }}>Cancel</button>
    </div>
  );

  if (mode === "extract") return (
    <div className="card">
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <button type="button" onClick={() => setMode("choose")} style={{ background: "none", border: "none", color: "#7b8499", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>&#8592;</button>
        <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 600 }}>Smart Extract</h3>
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: 16, background: "rgba(15,23,41,0.7)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: 4 }}>
        {([["paste", "Paste Text"], ["termsheet", "Term Sheet PDF"], ["statement", "Bank Statement PDF"]] as const).map(([key, label]) => (
          <button key={key} type="button" onClick={() => { setExtractTab(key); setExtractFile(null); setExtractError(null); }}
            style={{ flex: 1, padding: "8px 4px", border: "none", borderRadius: 7, cursor: "pointer", fontSize: 12, fontWeight: extractTab === key ? 600 : 400,
              background: extractTab === key ? "rgba(45,212,191,0.1)" : "none", color: extractTab === key ? "#2dd4bf" : "#7b8499" }}>
            {label}
          </button>
        ))}
      </div>

      {extractTab === "paste" && (
        <div>
          <label className="field-label">Paste your term sheet text, approval email, or loan details below</label>
          <textarea
            className="field-input"
            value={pasteText}
            onChange={e => setPasteText(e.target.value)}
            rows={8}
            placeholder={"Funder: ABC Capital\nAdvance Amount: $50,000\nPayback Amount: $65,000\nFactor Rate: 1.30\nDaily Payment: $595\nStart Date: Jan 15, 2025\n..."}
            style={{ resize: "vertical", fontFamily: "monospace", fontSize: 12 }}
            data-testid="textarea-paste-terms"
          />
        </div>
      )}

      {(extractTab === "termsheet" || extractTab === "statement") && (
        <div>
          <input ref={fileInputRef} type="file" accept=".pdf" style={{ display: "none" }}
            onChange={e => { setExtractFile(e.target.files?.[0] || null); setExtractError(null); }} />
          <div
            className={`upload-zone${extractFile ? " dragging" : ""}`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f?.type === "application/pdf") { setExtractFile(f); setExtractError(null); } }}
            data-testid={`upload-zone-${extractTab}`}
          >
            {extractFile ? (
              <><strong style={{ color: "#2dd4bf" }}>{extractFile.name}</strong><p>Click to change file</p></>
            ) : (
              <><strong>{extractTab === "termsheet" ? "Drop your term sheet PDF here" : "Drop a bank statement PDF here"}</strong><p>PDF files only &mdash; up to 25 MB</p></>
            )}
          </div>
          {extractTab === "statement" && (
            <p style={{ color: "#64748b", fontSize: 12, marginTop: 8, lineHeight: 1.5 }}>
              The AI will look for recurring ACH debits that match MCA payment patterns and extract funder details from transaction descriptions.
            </p>
          )}
        </div>
      )}

      {extractError && <div style={{ marginTop: 12, padding: "10px 14px", background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: 8, color: "#f87171", fontSize: 13 }}>{extractError}</div>}

      <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
        <button
          type="button"
          className="btn-primary"
          style={{ flex: 1 }}
          disabled={extracting || (extractTab === "paste" ? pasteText.trim().length < 10 : !extractFile)}
          onClick={handleExtract}
          data-testid="btn-extract-terms"
        >
          {extracting ? "Extracting…" : "Extract & Fill Form"}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
      </div>
    </div>
  );

  return (
    <div className="card">
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: extractNotes ? 12 : 16 }}>
        <button type="button" onClick={() => setMode("choose")} style={{ background: "none", border: "none", color: "#7b8499", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>&#8592;</button>
        <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 600 }}>
          {wasExtracted ? "Review Extracted Terms" : "Add Funding Position"}
        </h3>
      </div>

      {extractNotes && (
        <div style={{ marginBottom: 14, padding: "10px 14px", background: "rgba(45,212,191,0.06)", border: "1px solid rgba(45,212,191,0.2)", borderRadius: 8, fontSize: 12, color: "#94a3b8", lineHeight: 1.5 }}>
          <span style={{ color: "#2dd4bf", fontWeight: 600 }}>AI note: </span>{extractNotes}
        </div>
      )}

      {error && <p style={{ color: "#f87171", fontSize: 13, marginBottom: 12 }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div><label className="field-label">Funder Name *</label><input className="field-input" value={form.funderName} onChange={set("funderName")} required data-testid="input-funder-name" /></div>
          <div><label className="field-label">Product Type</label>
            <select className="field-input" value={form.productType} onChange={set("productType")} data-testid="select-product-type">
              <option value="MCA">MCA</option><option value="LOC">Line of Credit</option><option value="Term Loan">Term Loan</option>
              <option value="SBA">SBA Loan</option><option value="Revenue Based">Revenue Based</option><option value="Other">Other</option>
            </select>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div><label className="field-label">Funded Amount</label><input className="field-input" type="number" value={form.fundedAmount} onChange={set("fundedAmount")} placeholder="50000" data-testid="input-funded-amount" /></div>
          <div><label className="field-label">Payback Amount</label><input className="field-input" type="number" value={form.paybackAmount} onChange={set("paybackAmount")} placeholder="65000" data-testid="input-payback-amount" /></div>
          <div><label className="field-label">Factor Rate</label><input className="field-input" value={form.factorRate} onChange={set("factorRate")} placeholder="1.30" data-testid="input-factor-rate" /></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div><label className="field-label">Payment Amount</label><input className="field-input" type="number" value={form.paymentAmount} onChange={set("paymentAmount")} placeholder="500" data-testid="input-payment-amount" /></div>
          <div><label className="field-label">Frequency</label>
            <select className="field-input" value={form.paymentFrequency} onChange={set("paymentFrequency")} data-testid="select-payment-frequency">
              <option value="daily">Daily</option><option value="weekly">Weekly</option><option value="bi-weekly">Bi-Weekly</option><option value="monthly">Monthly</option>
            </select>
          </div>
          <div><label className="field-label">Remaining Balance</label><input className="field-input" type="number" value={form.remainingBalance} onChange={set("remainingBalance")} placeholder="32000" data-testid="input-remaining-balance" /></div>
        </div>
        <div style={{ marginBottom: 16 }}><label className="field-label">Funded Date</label><input className="field-input" type="date" value={form.fundedDate} onChange={set("fundedDate")} style={{ maxWidth: 200 }} data-testid="input-funded-date" /></div>
        <div style={{ display: "flex", gap: 12 }}>
          <button className="btn-primary" type="submit" disabled={saving} style={{ flex: 1 }} data-testid="btn-save-position">{saving ? "Saving…" : "Save Position"}</button>
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

  if (loading) return <div className="loading"><div className="spinner" /><p style={{ marginTop: 12 }}>Loading positions…</p></div>;

  const totalRemaining = positions.reduce((s, p) => s + (Number(p.remaining_balance) || 0), 0);
  const totalMonthlyLoad = positions.reduce((s, p) => s + calcPosition(p).monthlyLoad, 0);

  return (
    <div>
      {showAdd ? (
        <AddPositionForm onSave={() => { setShowAdd(false); fetch_(); }} onCancel={() => setShowAdd(false)} />
      ) : (
        <button className="btn-primary" onClick={() => setShowAdd(true)} style={{ marginBottom: 16 }} data-testid="button-add-position">+ Add Funding Position</button>
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
                  <span style={{ color: "#64748b", fontSize: 12 }}>{fmt$(c.monthlyLoad)}/mo &middot; ~{c.paymentsLeft} payments left</span>
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

// ── CHIRP CONNECT BUTTON (full-featured, mirrors merchant portal) ──────────
function LeadChirpConnectButton({ onSuccess, label = "Connect Your Bank" }: { onSuccess: () => void; label?: string }) {
  const [starting, setStarting] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsPhone, setNeedsPhone] = useState(false);
  const [phone, setPhone] = useState("");
  const [popupBlocked, setPopupBlocked] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);
  const popupRef = useRef<Window | null>(null);

  useEffect(() => () => { if (pollRef.current) window.clearInterval(pollRef.current); }, []);

  const startPolling = useCallback(() => {
    setWaiting(true);
    let attempts = 0;
    const MAX = 60;
    pollRef.current = window.setInterval(async () => {
      attempts += 1;
      try {
        const res = await fetch("/api/lead/banking/insights", { credentials: "include" });
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
      } catch (_) {}
      if (popupRef.current && popupRef.current.closed && attempts > 2) {
        try { await fetch("/api/lead/chirp/sync", { method: "POST", credentials: "include" }); } catch (_) {}
        const finalRes = await fetch("/api/lead/banking/insights", { credentials: "include" });
        if (finalRes.ok) {
          const data = await finalRes.json();
          if (data.connected) { onSuccess(); }
        }
        if (pollRef.current) window.clearInterval(pollRef.current);
        pollRef.current = null;
        setWaiting(false);
        return;
      }
      if (attempts >= MAX) {
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
      const res = await fetch("/api/lead/chirp/connect", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(phoneOverride ? { phone: phoneOverride } : {}),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (res.status === 400 && err.error?.toLowerCase().includes("phone")) {
          setNeedsPhone(true);
          setStarting(false);
          return;
        }
        throw new Error(err.error || "Could not start bank connection.");
      }
      const data = await res.json();
      const url = data.widgetUrl || data.verificationUrl;
      if (!url) throw new Error("Could not get connection URL.");
      setNeedsPhone(false);
      setPopupBlocked(null);
      popupRef.current = window.open(url, "chirp-connect", "width=480,height=720,menubar=no,toolbar=no");
      if (!popupRef.current || popupRef.current.closed) setPopupBlocked(url);
      startPolling();
    } catch (e: any) {
      setError(e.message || "Could not start bank connection.");
    } finally {
      setStarting(false);
    }
  }, [startPolling]);

  const handlePhoneSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) { setError("Please enter a valid 10-digit phone number."); return; }
    setError(null);
    doConnect(digits.length === 10 ? `+1${digits}` : `+${digits}`);
  }, [phone, doConnect]);

  if (needsPhone) return (
    <div>
      <p style={{ color: "#94a3b8", fontSize: 13, marginBottom: 10, lineHeight: 1.6 }}>
        We need your phone number to verify your identity with Chirp. This won't be shared with anyone else.
      </p>
      <form onSubmit={handlePhoneSubmit} style={{ display: "flex", gap: 8 }}>
        <input
          type="tel"
          placeholder="(555) 000-0000"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          className="field-input"
          style={{ flex: 1 }}
          autoFocus
          data-testid="input-chirp-phone"
        />
        <button type="submit" className="btn-secondary" disabled={starting} style={{ whiteSpace: "nowrap" }} data-testid="button-chirp-phone-submit">
          {starting ? "Connecting…" : "Continue →"}
        </button>
      </form>
      {error && <p style={{ color: "#f87171", fontSize: 12, marginTop: 8 }}>{error}</p>}
    </div>
  );

  return (
    <div>
      <button
        className="btn-primary"
        onClick={() => doConnect()}
        disabled={starting || waiting}
        data-testid="button-chirp-connect"
      >
        {starting ? "Initializing…" : waiting ? "Waiting for Chirp…" : label}
      </button>
      {waiting && !popupBlocked && (
        <p style={{ color: "#94a3b8", fontSize: 12, marginTop: 8 }}>
          Complete the verification in the Chirp window — this page will update automatically.
        </p>
      )}
      {popupBlocked && (
        <div className="popup-fallback">
          Your browser blocked the popup.{" "}
          <a href={popupBlocked} target="_blank" rel="noopener noreferrer">Click here to connect your bank</a>, then come back to this page.
        </div>
      )}
      {error && <p style={{ color: "#f87171", fontSize: 13, marginTop: 8 }}>{error}</p>}
    </div>
  );
}

// ── STATEMENT UPLOAD ZONE ─────────────────────────────────────────────────
interface UploadEntry { id?: string; name: string; status: "uploading" | "done" | "error" | "existing"; message?: string; viewToken?: string | null; uploadedAt?: string | null; }

function LeadUploadZone({ email, businessName, savedStatements, onUploaded }: {
  email: string;
  businessName: string;
  savedStatements: SavedStatement[];
  onUploaded: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploads, setUploads] = useState<UploadEntry[]>([]);

  const uploadFile = async (file: File) => {
    const entryName = file.name;
    setUploads(prev => [...prev, { name: entryName, status: "uploading" }]);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("email", email);
      fd.append("businessName", businessName);
      const res = await fetch("/api/bank-statements/upload", { method: "POST", credentials: "include", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setUploads(prev => prev.map(u => u.name === entryName && u.status === "uploading" ? { ...u, status: "done" } : u));
      onUploaded();
    } catch (e: any) {
      setUploads(prev => prev.map(u => u.name === entryName && u.status === "uploading" ? { ...u, status: "error", message: e.message } : u));
    }
  };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach(f => { if (f.type === "application/pdf") uploadFile(f); });
  };

  const allEntries: UploadEntry[] = [
    ...savedStatements.map(s => ({ id: s.id, name: s.fileName, status: "existing" as const, viewToken: s.viewToken, uploadedAt: s.uploadedAt })),
    ...uploads,
  ];

  return (
    <div>
      <div
        className={`upload-zone${dragging ? " dragging" : ""}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
        data-testid="upload-zone-statements"
      >
        <input ref={inputRef} type="file" accept=".pdf" multiple style={{ display: "none" }} onChange={e => handleFiles(e.target.files)} />
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(45,212,191,0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 10px", display: "block" }}>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
        <strong>Drop PDF statements here, or click to browse</strong>
        <p>Last 3 months of business bank statements &mdash; PDF format, up to 25 MB each</p>
      </div>

      {allEntries.length > 0 && (
        <div className="upload-list">
          {allEntries.map((u, i) => (
            <div key={u.id || i} className={`upload-item${u.status === "error" ? " error" : u.status === "existing" ? " existing" : ""}`}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                <svg width="12" height="14" viewBox="0 0 12 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, color: u.status === "error" ? "#f87171" : u.status === "existing" ? "#64748b" : "#2dd4bf" }}>
                  <rect x="1" y="1" width="10" height="12" rx="1.5"/><line x1="3.5" y1="4.5" x2="8.5" y2="4.5"/><line x1="3.5" y1="7" x2="8.5" y2="7"/><line x1="3.5" y1="9.5" x2="6.5" y2="9.5"/>
                </svg>
                <span className="file-name">{u.name}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                {u.status === "existing" && u.viewToken && (
                  <a href={`/api/bank-statements/public/view/${u.viewToken}`} target="_blank" rel="noopener noreferrer"
                    style={{ color: "#2dd4bf", fontSize: 11, textDecoration: "none" }}>View</a>
                )}
                <span className="file-status">
                  {u.status === "uploading" ? "Uploading…"
                    : u.status === "done" ? "✓ Uploaded"
                    : u.status === "existing" ? (u.uploadedAt ? new Date(u.uploadedAt).toLocaleDateString() : "Uploaded")
                    : u.message || "Error"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── FINANCIALS TAB ───────────────────────────────────────────────────────
function LeadFinancialsTab({ email, businessName }: { email: string; businessName: string }) {
  const [banking, setBanking] = useState<BankingInsights | null>(null);
  const [savedStatements, setSavedStatements] = useState<SavedStatement[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showBanks, setShowBanks] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [bankRes, stmtRes] = await Promise.all([
        fetch("/api/lead/banking/insights", { credentials: "include" }),
        fetch("/api/lead/bank-statements", { credentials: "include" }),
      ]);
      if (bankRes.ok) setBanking(await bankRes.json());
      if (stmtRes.ok) setSavedStatements(await stmtRes.json());
    } catch (_) {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto-register webhook when a pending connection exists
  useEffect(() => {
    if (banking?.hasPendingConnection) {
      fetch("/api/lead/chirp/register-webhook", { method: "POST", credentials: "include" }).catch(() => {});
    }
  }, [banking?.hasPendingConnection]);

  const handleSync = async () => {
    setSyncing(true); setSyncError(null);
    try {
      const res = await fetch("/api/lead/chirp/sync", { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Sync failed");
      await fetchData();
    } catch (e: any) { setSyncError(e.message); }
    setSyncing(false);
  };

  const handleDisconnect = async () => {
    await fetch("/api/lead/chirp/connection", { method: "DELETE", credentials: "include" });
    await fetchData();
  };

  if (loading) return <div className="loading"><div className="spinner" /><p style={{ marginTop: 12 }}>Loading financial data…</p></div>;

  const m = banking?.metrics;
  const chirpConnected = Boolean(banking?.connected);
  const hasPending = Boolean(banking?.hasPendingConnection);

  return (
    <div>
      {/* ── Bank Connection Card ── */}
      <div className="card" style={{ padding: 0 }}>
        <button
          onClick={() => setShowBanks(p => !p)}
          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", background: "none", border: "none", cursor: "pointer", padding: "16px 20px", textAlign: "left" }}
          data-testid="button-toggle-bank-section"
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 600, margin: 0 }}>Bank Connection</h3>
            {chirpConnected && (
              <span className="badge" style={{ background: "rgba(45,212,191,0.15)", color: "#2dd4bf" }}>Connected</span>
            )}
            {!chirpConnected && hasPending && (
              <span className="badge" style={{ background: "rgba(251,191,36,0.15)", color: "#fbbf24" }}>Pending</span>
            )}
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: showBanks ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease", flexShrink: 0 }}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {showBanks && (
          <div style={{ padding: "0 20px 20px" }}>
            {chirpConnected ? (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#2dd4bf", flexShrink: 0 }} />
                  <span style={{ fontWeight: 500, fontSize: 14 }}>{banking?.institutionName || "Connected Bank"}</span>
                  {banking?.lastSyncedAt && (
                    <span style={{ color: "#64748b", fontSize: 12 }}>· Updated {new Date(banking.lastSyncedAt).toLocaleDateString()}</span>
                  )}
                </div>

                {banking?.accounts && banking.accounts.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    {banking.accounts.map((acct, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", fontSize: 13 }}>
                        <span>{acct.name} <span style={{ color: "#64748b", fontSize: 11 }}>{acct.type}</span></span>
                        <span style={{ fontWeight: 600, color: "#2dd4bf" }}>{fmt$(acct.balance)}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <button className="btn-secondary" onClick={handleSync} disabled={syncing} data-testid="button-sync-bank">
                    {syncing ? "Syncing…" : "Sync Now"}
                  </button>
                  <button onClick={handleDisconnect} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: 13 }} data-testid="button-disconnect-bank">
                    Disconnect
                  </button>
                </div>
                {syncError && <p style={{ color: "#f87171", fontSize: 12, marginTop: 8 }}>{syncError}</p>}
              </>
            ) : hasPending ? (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 12px", display: "block" }}>
                  <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                </svg>
                <p style={{ color: "#e8eaf0", fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Awaiting Bank Verification</p>
                <p style={{ color: "#94a3b8", fontSize: 13, lineHeight: 1.7, marginBottom: 16 }}>
                  Your bank connection is being verified. Once Chirp confirms it, your live financial data will appear here automatically.
                </p>
                <p style={{ color: "#64748b", fontSize: 12, marginBottom: 14 }}>
                  Status: <span style={{ color: "#fbbf24" }}>{banking?.status || "Unverified"}</span>
                </p>
                <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
                  <LeadChirpConnectButton onSuccess={fetchData} label="Reconnect Bank" />
                  <button className="btn-secondary" onClick={handleSync} disabled={syncing}>
                    {syncing ? "Checking…" : "Check Status"}
                  </button>
                </div>
                {syncError && <p style={{ color: "#f87171", fontSize: 12, marginTop: 8 }}>{syncError}</p>}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "12px 0" }}>
                <p style={{ color: "#94a3b8", fontSize: 14, marginBottom: 16, lineHeight: 1.6 }}>
                  Connect your bank for live cash flow tracking, real-time balances, and personalized funding readiness scores.
                </p>
                <LeadChirpConnectButton onSuccess={fetchData} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Live Metrics (when connected) ── */}
      {chirpConnected && m && m.monthlyRevenue > 0 && (
        <>
          <div className="card" style={{ textAlign: "center", padding: "20px" }}>
            <p style={{ color: "#94a3b8", fontSize: 13, marginBottom: 4 }}>What You're Bringing In</p>
            <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 30, fontWeight: 700, color: "#2dd4bf" }}>{fmt$(m.monthlyRevenue)}</p>
            <p style={{ color: "#64748b", fontSize: 11 }}>per month</p>
            {m.revenueTrend && (
              <p style={{ color: m.revenueTrend === "growing" ? "#2dd4bf" : m.revenueTrend === "declining" ? "#f87171" : "#94a3b8", fontSize: 12, fontWeight: 600, marginTop: 6 }}>
                {m.revenueTrend === "growing" ? "\u2197" : m.revenueTrend === "declining" ? "\u2198" : "\u2192"} {m.revenueTrend}
              </p>
            )}
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

      {/* ── Statement Upload ── */}
      <div className="card" style={{ marginTop: 4 }}>
        <div style={{ marginBottom: 14 }}>
          <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Bank Statements</h3>
          <p style={{ color: "#7b8499", fontSize: 13 }}>
            {chirpConnected
              ? "Supplement your live data with PDF statements if needed."
              : "No bank connection? Upload your last 3 months of statements instead."}
          </p>
        </div>
        <LeadUploadZone
          email={email}
          businessName={businessName}
          savedStatements={savedStatements}
          onUploaded={fetchData}
        />
      </div>
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

  if (loading) return <div className="loading"><div className="spinner" /><p style={{ marginTop: 12 }}>Checking your readiness…</p></div>;

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
  const [leadEmail, setLeadEmail] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [activeTab, setActiveTab] = useState<"positions" | "financials" | "qualify">("positions");

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/lead/auth/check", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        if (data.isAuthenticated) { setLoggedIn(true); setLeadName(data.name || ""); setLeadEmail(data.email || ""); setBusinessName(data.businessName || ""); }
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 26, fontWeight: 700, margin: 0 }}>Financial Command Center</h1>
            <p style={{ color: "#7b8499", fontSize: 14, marginTop: 4 }}>
              {leadName ? `Welcome, ${leadName.split(" ")[0]}.` : "Welcome."}{" "}{businessName || "Track your positions and finances."}
            </p>
          </div>
          <button className="btn-secondary" onClick={async () => { await fetch("/api/lead/auth/logout", { method: "POST", credentials: "include" }); setLoggedIn(false); }} data-testid="button-sign-out">
            Sign Out
          </button>
        </div>

        <div className="tab-bar">
          {([["positions", "My Positions"], ["financials", "Financials"], ["qualify", "Qualify"]] as const).map(([key, label]) => (
            <button key={key} className={`tab-btn ${activeTab === key ? "active" : ""}`} onClick={() => setActiveTab(key)} data-testid={`tab-${key}`}>{label}</button>
          ))}
        </div>

        {activeTab === "positions" && <PositionsTab />}
        {activeTab === "financials" && <LeadFinancialsTab email={leadEmail} businessName={businessName} />}
        {activeTab === "qualify" && <QualifyTab />}
      </div>
    </div>
  );
}
