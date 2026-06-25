import { useState, useEffect, useRef } from "react";

// ── QUALIFICATION LOGIC ──────────────────────────────────────────────────
interface QualResult {
  qualified: boolean;
  estimatedAmount: [number, number]; // [low, high]
  estimatedFactor: [number, number];
  estimatedDaily: [number, number];
  estimatedTerm: [number, number]; // months
  tier: string;
  products: string[];
  notes: string[];
}

function calculateQualification(
  revenue: number,
  tib: number,
  credit: number,
  positions: number,
  hasOutstanding: boolean
): QualResult {
  const notes: string[] = [];
  const products: string[] = [];

  // Base qualification
  if (revenue < 10000) {
    return { qualified: false, estimatedAmount: [0,0], estimatedFactor: [0,0], estimatedDaily: [0,0], estimatedTerm: [0,0], tier: "Below Minimum", products: [], notes: ["Most lenders require at least $10,000/month in revenue."] };
  }
  if (tib < 3) {
    return { qualified: false, estimatedAmount: [0,0], estimatedFactor: [0,0], estimatedDaily: [0,0], estimatedTerm: [0,0], tier: "Too New", products: [], notes: ["Most lenders require at least 3 months in business."] };
  }

  // Tier calculation
  let tier = "D";
  if (credit >= 680 && tib >= 24 && revenue >= 40000 && positions <= 1) { tier = "A"; }
  else if (credit >= 600 && tib >= 12 && revenue >= 25000 && positions <= 2) { tier = "B"; }
  else if (credit >= 500 && tib >= 6 && revenue >= 15000 && positions <= 4) { tier = "C"; }

  // Amount estimation (based on revenue multiple)
  let lowMult = 0.5, highMult = 1.2;
  if (tier === "A") { lowMult = 1.0; highMult = 2.5; }
  else if (tier === "B") { lowMult = 0.7; highMult = 1.8; }
  else if (tier === "C") { lowMult = 0.5; highMult = 1.2; }
  else { lowMult = 0.3; highMult = 0.8; }

  // Reduce for stacking
  if (positions >= 3) { lowMult *= 0.6; highMult *= 0.6; notes.push("Multiple existing positions may limit advance amount."); }
  else if (positions >= 1) { lowMult *= 0.8; highMult *= 0.8; }

  const estLow = Math.round(revenue * lowMult / 1000) * 1000;
  const estHigh = Math.round(revenue * highMult / 1000) * 1000;

  // Factor rate
  let factorLow = 1.15, factorHigh = 1.50;
  if (tier === "A") { factorLow = 1.10; factorHigh = 1.25; }
  else if (tier === "B") { factorLow = 1.20; factorHigh = 1.35; }
  else if (tier === "C") { factorLow = 1.30; factorHigh = 1.45; }
  else { factorLow = 1.35; factorHigh = 1.55; }

  // Term
  let termLow = 3, termHigh = 6;
  if (tier === "A") { termLow = 6; termHigh = 24; }
  else if (tier === "B") { termLow = 6; termHigh = 15; }
  else if (tier === "C") { termLow = 4; termHigh = 12; }
  else { termLow = 2; termHigh = 6; }

  // Daily payment estimate (using midpoint)
  const midAmount = (estLow + estHigh) / 2;
  const midFactor = (factorLow + factorHigh) / 2;
  const midTerm = (termLow + termHigh) / 2;
  const totalPayback = midAmount * midFactor;
  const dailyLow = Math.round(estLow * factorLow / (termHigh * 22)); // 22 business days/month
  const dailyHigh = Math.round(estHigh * factorHigh / (termLow * 22));

  // Products
  if (tier === "A") { products.push("SBA 7(a)", "Term Loan", "Line of Credit", "MCA"); notes.push("Strong profile — you may qualify for SBA or traditional financing at lower rates."); }
  else if (tier === "B") { products.push("Term Loan", "Line of Credit", "MCA"); notes.push("Solid qualifications. Multiple product types available."); }
  else if (tier === "C") { products.push("MCA", "Revenue-Based Financing"); notes.push("Standard MCA qualification. Factor rates depend on bank statement review."); }
  else { products.push("MCA", "Short-Term Advance"); notes.push("Limited options at current profile. Improving revenue or credit could unlock better terms."); }

  if (hasOutstanding) notes.push("Existing balances will be factored into the final offer.");
  if (credit < 550) notes.push("Credit score is below most lender minimums. Some D-tier lenders may still approve.");
  if (revenue >= 100000) notes.push("High revenue businesses often qualify for premium terms and higher advances.");

  return {
    qualified: true,
    estimatedAmount: [Math.max(5000, estLow), Math.max(10000, estHigh)],
    estimatedFactor: [factorLow, factorHigh],
    estimatedDaily: [Math.max(50, dailyLow), Math.max(100, dailyHigh)],
    estimatedTerm: [termLow, termHigh],
    tier: tier === "A" ? "Premium" : tier === "B" ? "Strong" : tier === "C" ? "Standard" : "Basic",
    products,
    notes,
  };
}

// ── COMPONENTS ────────────────────────────────────────────────────────────

function SliderInput({ label, value, onChange, min, max, step, format, helpText }: {
  label: string; value: number; onChange: (v: number) => void;
  min: number; max: number; step: number; format: (v: number) => string; helpText?: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>{label}</label>
        <span style={{ fontSize: 22, fontWeight: 700, color: "#fff", fontFamily: "'DM Sans', sans-serif" }}>{format(value)}</span>
      </div>
      <div style={{ position: "relative" as const, height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 3 }}>
        <div style={{ position: "absolute" as const, left: 0, top: 0, height: "100%", width: `${pct}%`, background: "linear-gradient(90deg, #0d9488, #14b8a6)", borderRadius: 3, transition: "width 0.1s ease" }} />
        <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))}
          style={{ position: "absolute" as const, top: -8, left: 0, width: "100%", height: 22, WebkitAppearance: "none" as any, appearance: "none" as any, background: "transparent", cursor: "pointer", margin: 0 }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
        <span style={{ fontSize: 11, color: "#475569" }}>{format(min)}</span>
        <span style={{ fontSize: 11, color: "#475569" }}>{format(max)}</span>
      </div>
      {helpText && <p style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>{helpText}</p>}
    </div>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────

export default function FundingCalculator() {
  const [revenue, setRevenue] = useState(30000);
  const [tib, setTib] = useState(18);
  const [credit, setCredit] = useState(650);
  const [positions, setPositions] = useState(0);
  const [hasOutstanding, setHasOutstanding] = useState(false);
  const [email, setEmail] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  const result = calculateQualification(revenue, tib, credit, positions, hasOutstanding);

  useEffect(() => {
    if (showResults && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [showResults]);

  const handleSaveResults = async () => {
    if (!email || !email.includes("@")) return;
    setSaving(true);
    try {
      await fetch("/api/services/interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          service: "funding-calculator",
          otherDetails: JSON.stringify({
            revenue, tib, credit, positions, hasOutstanding,
            result: { tier: result.tier, estimatedAmount: result.estimatedAmount, products: result.products },
          }),
          source: "calculator",
        }),
      });
      setSaved(true);
    } catch {}
    setSaving(false);
  };

  const fmt$ = (n: number) => "$" + n.toLocaleString();
  const tierColors: Record<string, string> = { Premium: "#10b981", Strong: "#14b8a6", Standard: "#eab308", Basic: "#f97316" };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&family=Instrument+Serif:ital@0;1&display=swap');
        .calc-page { font-family: 'DM Sans', sans-serif; background: #0a0e17; color: #e2e8f0; min-height: 100vh; }
        .calc-page input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; width: 20px; height: 20px; border-radius: 50%; background: #fff; border: 3px solid #0d9488; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.3); }
        .calc-page input[type="range"]::-moz-range-thumb { width: 20px; height: 20px; border-radius: 50%; background: #fff; border: 3px solid #0d9488; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.3); }
        .calc-result-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; padding: 24px; }
        .calc-result-card:hover { border-color: rgba(13,148,136,0.3); }
        .calc-cta { display: inline-block; background: linear-gradient(135deg, #0d9488, #0f766e); color: #fff; font-weight: 700; padding: 14px 32px; border-radius: 50px; text-decoration: none; font-family: 'DM Sans', sans-serif; font-size: 15px; border: none; cursor: pointer; transition: all 0.3s ease; }
        .calc-cta:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(13,148,136,0.3); }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .fade-up { animation: fadeUp 0.6s ease forwards; }
        .fade-up-1 { animation-delay: 0.1s; opacity: 0; }
        .fade-up-2 { animation-delay: 0.2s; opacity: 0; }
        .fade-up-3 { animation-delay: 0.3s; opacity: 0; }
        .fade-up-4 { animation-delay: 0.4s; opacity: 0; }
      `}</style>
      <div className="calc-page">
        {/* Hero */}
        <div style={{ background: "linear-gradient(180deg, rgba(13,148,136,0.08) 0%, transparent 60%)", paddingTop: 48, paddingBottom: 32 }}>
          <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 24px", textAlign: "center" as const }}>
            <a href="/" style={{ display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none", marginBottom: 32 }}>
              <div style={{ width: 28, height: 28, background: "linear-gradient(135deg, #0d9488, #14b8a6)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Instrument Serif', serif", fontWeight: 700, fontSize: 12, color: "#0a0e17" }}>T</div>
              <span style={{ fontFamily: "'Instrument Serif', serif", fontWeight: 700, fontSize: 14, color: "#94a3b8" }}>Today Capital Group</span>
            </a>
            <h1 style={{ fontFamily: "'Instrument Serif', serif", fontSize: "clamp(32px, 5vw, 48px)", fontWeight: 400, lineHeight: 1.1, color: "#fff", marginBottom: 12, letterSpacing: "-0.02em" }}>
              Business Funding<br /><em style={{ color: "#14b8a6" }}>Calculator</em>
            </h1>
            <p style={{ fontSize: 16, color: "#94a3b8", lineHeight: 1.6, maxWidth: 480, margin: "0 auto" }}>
              See what you could qualify for in under 60 seconds. No application required.
            </p>
          </div>
        </div>

        {/* Calculator */}
        <div style={{ maxWidth: 600, margin: "0 auto", padding: "0 24px 80px" }}>
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 20, padding: "32px 28px" }}>
            <SliderInput label="Monthly Revenue" value={revenue} onChange={setRevenue}
              min={5000} max={500000} step={5000}
              format={v => "$" + v.toLocaleString()} />

            <SliderInput label="Time in Business" value={tib} onChange={setTib}
              min={1} max={120} step={1}
              format={v => v < 12 ? `${v} month${v !== 1 ? "s" : ""}` : v % 12 === 0 ? `${v/12} year${v/12 !== 1 ? "s" : ""}` : `${Math.floor(v/12)}yr ${v%12}mo`} />

            <SliderInput label="Estimated Credit Score" value={credit} onChange={setCredit}
              min={400} max={800} step={10}
              format={v => v.toString()}
              helpText={credit >= 680 ? "Excellent — qualifies for premium products" : credit >= 600 ? "Good — most lenders will consider" : credit >= 500 ? "Fair — limited lender options" : "Below most minimums"} />

            <SliderInput label="Current Funding Positions" value={positions} onChange={v => { setPositions(v); setHasOutstanding(v > 0); }}
              min={0} max={8} step={1}
              format={v => v === 0 ? "None" : v.toString()}
              helpText={positions === 0 ? "No existing MCA or advances" : positions <= 2 ? "Manageable — most lenders accept 1st-3rd position" : "Heavy stacking — limited options"} />

            <button className="calc-cta" onClick={() => setShowResults(true)}
              style={{ width: "100%", marginTop: 8, fontSize: 16, padding: "16px 32px" }}>
              See What You Qualify For
            </button>
          </div>

          {/* Results */}
          {showResults && (
            <div ref={resultsRef} style={{ marginTop: 32 }}>
              {result.qualified ? (
                <div>
                  {/* Qualification Badge */}
                  <div className="fade-up" style={{ textAlign: "center" as const, marginBottom: 28 }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 20px", borderRadius: 50, background: `${tierColors[result.tier] || "#14b8a6"}15`, border: `1px solid ${tierColors[result.tier] || "#14b8a6"}40` }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: tierColors[result.tier] || "#14b8a6" }} />
                      <span style={{ fontSize: 13, fontWeight: 700, color: tierColors[result.tier] || "#14b8a6", textTransform: "uppercase" as const, letterSpacing: "0.08em" }}>{result.tier} Qualification</span>
                    </div>
                  </div>

                  {/* Main Estimate */}
                  <div className="calc-result-card fade-up fade-up-1" style={{ textAlign: "center" as const, marginBottom: 16, background: "linear-gradient(135deg, rgba(13,148,136,0.06), rgba(13,148,136,0.02))", border: "1px solid rgba(13,148,136,0.15)" }}>
                    <p style={{ fontSize: 12, color: "#64748b", textTransform: "uppercase" as const, letterSpacing: "0.1em", marginBottom: 8 }}>Estimated Advance Amount</p>
                    <p style={{ fontFamily: "'Instrument Serif', serif", fontSize: "clamp(36px, 6vw, 52px)", fontWeight: 400, color: "#fff", lineHeight: 1 }}>
                      {fmt$(result.estimatedAmount[0])} <span style={{ color: "#475569", fontSize: "0.5em" }}>to</span> {fmt$(result.estimatedAmount[1])}
                    </p>
                  </div>

                  {/* Detail Cards */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
                    <div className="calc-result-card fade-up fade-up-2" style={{ textAlign: "center" as const }}>
                      <p style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>Factor Rate</p>
                      <p style={{ fontSize: 20, fontWeight: 700, color: "#fff" }}>{result.estimatedFactor[0].toFixed(2)} <span style={{ color: "#475569", fontSize: 12 }}>-</span> {result.estimatedFactor[1].toFixed(2)}</p>
                    </div>
                    <div className="calc-result-card fade-up fade-up-3" style={{ textAlign: "center" as const }}>
                      <p style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>Est. Daily Payment</p>
                      <p style={{ fontSize: 20, fontWeight: 700, color: "#fff" }}>{fmt$(result.estimatedDaily[0])} <span style={{ color: "#475569", fontSize: 12 }}>-</span> {fmt$(result.estimatedDaily[1])}</p>
                    </div>
                    <div className="calc-result-card fade-up fade-up-4" style={{ textAlign: "center" as const }}>
                      <p style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>Term Length</p>
                      <p style={{ fontSize: 20, fontWeight: 700, color: "#fff" }}>{result.estimatedTerm[0]} <span style={{ color: "#475569", fontSize: 12 }}>-</span> {result.estimatedTerm[1]} <span style={{ fontSize: 12, color: "#64748b" }}>mo</span></p>
                    </div>
                  </div>

                  {/* Products */}
                  <div className="calc-result-card fade-up fade-up-3" style={{ marginBottom: 16 }}>
                    <p style={{ fontSize: 12, color: "#64748b", textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 10 }}>Products You May Qualify For</p>
                    <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 8 }}>
                      {result.products.map(p => (
                        <span key={p} style={{ fontSize: 13, padding: "6px 14px", borderRadius: 50, background: "rgba(13,148,136,0.1)", color: "#14b8a6", fontWeight: 600 }}>{p}</span>
                      ))}
                    </div>
                  </div>

                  {/* Notes */}
                  {result.notes.length > 0 && (
                    <div className="calc-result-card fade-up fade-up-4" style={{ marginBottom: 24 }}>
                      <p style={{ fontSize: 12, color: "#64748b", textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 10 }}>What This Means</p>
                      {result.notes.map((n, i) => (
                        <p key={i} style={{ fontSize: 14, color: "#cbd5e1", lineHeight: 1.6, marginBottom: 6 }}>{n}</p>
                      ))}
                    </div>
                  )}

                  {/* Email Capture + CTA */}
                  <div className="calc-result-card fade-up fade-up-4" style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))" }}>
                    {!saved ? (
                      <>
                        <p style={{ fontFamily: "'Instrument Serif', serif", fontSize: 20, color: "#fff", marginBottom: 4 }}>Want to see your actual offers?</p>
                        <p style={{ fontSize: 13, color: "#94a3b8", marginBottom: 16 }}>Save your results and we'll match you with lenders who fit your profile. No obligation.</p>
                        <div style={{ display: "flex", gap: 10 }}>
                          <input type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)}
                            style={{ flex: 1, padding: "12px 16px", borderRadius: 50, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "#fff", fontSize: 14, fontFamily: "'DM Sans', sans-serif", outline: "none" }} />
                          <button className="calc-cta" onClick={handleSaveResults} disabled={saving || !email.includes("@")}
                            style={{ opacity: email.includes("@") ? 1 : 0.5, padding: "12px 24px" }}>
                            {saving ? "Saving..." : "Save Results"}
                          </button>
                        </div>
                        <div style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>
                          <a href="/intake/quiz" className="calc-cta" style={{ background: "transparent", border: "1px solid rgba(13,148,136,0.4)", fontSize: 13, padding: "10px 24px" }}>
                            Skip to Full Application
                          </a>
                        </div>
                      </>
                    ) : (
                      <div style={{ textAlign: "center" as const }}>
                        <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(13,148,136,0.15)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        </div>
                        <p style={{ fontFamily: "'Instrument Serif', serif", fontSize: 20, color: "#fff", marginBottom: 4 }}>Results saved!</p>
                        <p style={{ fontSize: 13, color: "#94a3b8", marginBottom: 16 }}>A funding specialist will review your profile and reach out with personalized options.</p>
                        <a href="/intake/quiz" className="calc-cta">Start Your Application</a>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Not Qualified */
                <div className="calc-result-card fade-up" style={{ textAlign: "center" as const }}>
                  <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(249,115,22,0.15)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  </div>
                  <p style={{ fontFamily: "'Instrument Serif', serif", fontSize: 22, color: "#fff", marginBottom: 6 }}>{result.tier}</p>
                  {result.notes.map((n, i) => (
                    <p key={i} style={{ fontSize: 14, color: "#94a3b8", lineHeight: 1.6, marginBottom: 4 }}>{n}</p>
                  ))}
                  <p style={{ fontSize: 13, color: "#64748b", marginTop: 16, marginBottom: 16 }}>Adjust the sliders above to see what would change your qualification, or talk to a specialist who can review your full profile.</p>
                  <a href="/intake/quiz" className="calc-cta">Talk to a Specialist</a>
                </div>
              )}

              {/* Disclaimer */}
              <p style={{ fontSize: 11, color: "#334155", textAlign: "center" as const, marginTop: 24, lineHeight: 1.5 }}>
                These estimates are based on general lender criteria and are not a guaranteed offer. Actual terms depend on bank statement review, credit check, and lender underwriting. Today Capital Group is a business finance brokerage, not a direct lender.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
