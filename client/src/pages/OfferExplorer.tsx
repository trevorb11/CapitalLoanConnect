import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Loader2 } from "lucide-react";

interface OfferTerms {
  advanceAmount: string | null;
  term: string | null;
  paymentFrequency: string | null;
  factorRate: string | null;
  totalPayback: string | null;
  netAfterFees: string | null;
  approvalDate: string | null;
  notes: string | null;
}

interface OfferData {
  businessName: string | null;
  offers: OfferTerms[];
}

const SCHEDULING_LINK = "https://bit.ly/3Zxj0Kq";
const PHONE_NUMBER = "(818) 351-0225";
const EMAIL_ADDRESS = "admin@todaycapitalgroup.com";

const ACCENT = "#14B8A6";
const ACCENT_RGB = "20, 184, 166";
const ACCENT_LIGHT = "#2DD4BF";

function fmtMoney(n: number, cents = false): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD",
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  }).format(n);
}

// Number of payments implied by term + frequency, e.g. "12 months" monthly -> 12
function paymentsCount(term: string | null, frequency: string | null): number {
  const t = (term || "").toLowerCase();
  const freq = (frequency || "monthly").toLowerCase();
  const num = parseFloat(t.match(/([\d.]+)/)?.[1] || "");
  if (!num || Number.isNaN(num)) {
    return freq === "daily" ? 132 : freq === "weekly" ? 26 : 6; // sensible defaults
  }
  if (t.includes("month")) {
    if (freq === "monthly") return Math.round(num);
    if (freq === "weekly") return Math.round(num * 4.33);
    if (freq === "biweekly") return Math.round(num * 2.17);
    return Math.round(num * 21); // daily, business days
  }
  if (t.includes("week")) {
    if (freq === "weekly") return Math.round(num);
    if (freq === "daily") return Math.round(num * 5);
    if (freq === "biweekly") return Math.max(1, Math.round(num / 2));
    return Math.max(1, Math.round(num / 4.33)); // monthly
  }
  if (t.includes("day")) {
    if (freq === "daily") return Math.round(num); // "126 days" daily = 126 payments
    if (freq === "weekly") return Math.max(1, Math.round(num / 7));
    if (freq === "biweekly") return Math.max(1, Math.round(num / 14));
    return Math.max(1, Math.round(num / 30));
  }
  return Math.round(num); // bare number: assume it's the payment count
}

function freqLabel(frequency: string | null): string {
  switch ((frequency || "").toLowerCase()) {
    case "daily": return "Daily";
    case "weekly": return "Weekly";
    case "biweekly": return "Bi-Weekly";
    case "monthly": return "Monthly";
    default: return "Monthly";
  }
}

// Round a slider step to a clean increment based on offer size
function sliderStep(max: number): number {
  if (max >= 500000) return 10000;
  if (max >= 200000) return 5000;
  if (max >= 50000) return 2500;
  if (max >= 20000) return 1000;
  return 500;
}

export default function OfferExplorer() {
  const { slug } = useParams<{ slug: string }>();
  const [selectedIndex, setSelectedIndex] = useState(0);
  // Draw amount per option, keyed by option index so switching tabs keeps each slider's position
  const [draws, setDraws] = useState<Record<number, number>>({});

  const { data, isLoading, error } = useQuery<OfferData>({
    queryKey: [`/api/offer/${slug}`],
    enabled: !!slug,
  });

  const offers = data?.offers || [];
  const current = offers[selectedIndex] || offers[0];

  const approved = useMemo(() => {
    const n = parseFloat(current?.advanceAmount || "");
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [current]);

  const factor = useMemo(() => {
    const n = parseFloat(current?.factorRate || "");
    return Number.isFinite(n) && n > 1 ? n : 1.25;
  }, [current]);

  const nPayments = useMemo(
    () => Math.max(1, paymentsCount(current?.term || null, current?.paymentFrequency || null)),
    [current],
  );

  const step = sliderStep(approved);
  const minDraw = Math.min(approved, Math.max(step, Math.round(approved * 0.1 / step) * step));
  const draw = Math.min(approved, Math.max(minDraw, draws[selectedIndex] ?? approved));

  const payback = draw * factor;
  const payment = payback / nPayments;
  const costOfCapital = payback - draw;
  const pctOfApproval = approved > 0 ? Math.round((draw / approved) * 100) : 100;

  const acceptUrl = `/api/offer/${slug}/accept?` + new URLSearchParams({
    approved: String(Math.round(approved)),
    amount: String(Math.round(draw)),
    payment: payment.toFixed(2),
    payback: payback.toFixed(2),
    term: current?.term || "",
    factor: String(factor),
  }).toString();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0B1120", fontFamily: "'Inter', sans-serif" }}>
        <Loader2 className="w-12 h-12 animate-spin" style={{ color: ACCENT }} />
      </div>
    );
  }

  if (error || !data || offers.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: "#0B1120", fontFamily: "'Inter', sans-serif", color: "#fff", padding: "24px", textAlign: "center" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "1rem" }}>Offer Not Found</h1>
        <p style={{ color: "#9CA3AF" }}>This offer may have expired or doesn't exist. Give us a call at {PHONE_NUMBER}.</p>
      </div>
    );
  }

  const businessName = data.businessName || "Valued Customer";
  const hasMultiple = offers.length > 1;

  const metric = (label: string, value: string, highlight = false) => (
    <div style={{
      background: highlight ? `rgba(${ACCENT_RGB}, 0.12)` : "rgba(255,255,255,0.03)",
      border: highlight ? `1px solid rgba(${ACCENT_RGB}, 0.35)` : "1px solid rgba(255,255,255,0.08)",
      borderRadius: "14px", padding: "18px 12px", textAlign: "center", flex: "1 1 130px", minWidth: "130px",
    }}>
      <div style={{ fontSize: "1.375rem", fontWeight: 800, color: highlight ? ACCENT_LIGHT : "#fff", marginBottom: "4px", letterSpacing: "-0.01em" }}>{value}</div>
      <div style={{ fontSize: "0.6875rem", color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>{label}</div>
    </div>
  );

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", background: "#0B1120", color: "#fff", lineHeight: 1.6, minHeight: "100vh" }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`
        input[type="range"].offer-slider {
          -webkit-appearance: none; appearance: none;
          width: 100%; height: 8px; border-radius: 9999px; outline: none; cursor: pointer;
        }
        input[type="range"].offer-slider::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none;
          width: 28px; height: 28px; border-radius: 50%;
          background: #fff; border: 4px solid ${ACCENT};
          box-shadow: 0 0 20px rgba(${ACCENT_RGB}, 0.5); cursor: grab;
        }
        input[type="range"].offer-slider::-moz-range-thumb {
          width: 28px; height: 28px; border-radius: 50%;
          background: #fff; border: 4px solid ${ACCENT};
          box-shadow: 0 0 20px rgba(${ACCENT_RGB}, 0.5); cursor: grab;
        }
      `}</style>

      <div style={{
        position: "fixed", inset: 0,
        background: `radial-gradient(ellipse 80% 50% at 50% -20%, rgba(${ACCENT_RGB}, 0.15) 0%, transparent 50%), radial-gradient(ellipse 60% 40% at 100% 100%, rgba(${ACCENT_RGB}, 0.08) 0%, transparent 50%)`,
        pointerEvents: "none", zIndex: 0,
      }} />

      <header style={{ position: "relative", zIndex: 10, padding: "20px 24px", borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "40px", height: "40px", background: ACCENT, borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#0B1120" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "24px", height: "24px" }}>
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
              <polyline points="17 6 23 6 23 12" />
            </svg>
          </div>
          <div style={{ fontSize: "1.25rem", fontWeight: 700 }}>Today Capital <span style={{ color: ACCENT }}>Group</span></div>
        </div>
      </header>

      <div style={{ maxWidth: "680px", margin: "0 auto", padding: "40px 24px", position: "relative", zIndex: 1 }}>
        <section style={{ textAlign: "center", marginBottom: "36px" }} data-testid="section-hero">
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "8px",
            background: `rgba(${ACCENT_RGB}, 0.25)`, border: `1px solid rgba(${ACCENT_RGB}, 0.3)`,
            color: ACCENT_LIGHT, padding: "10px 20px", borderRadius: "9999px",
            fontSize: "0.875rem", fontWeight: 600, marginBottom: "24px",
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "18px", height: "18px" }}>
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            Approved by Today Capital Group
          </div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, lineHeight: 1.2, marginBottom: "8px" }} data-testid="text-title">
            Explore Your Offer
          </h1>
          <p style={{ color: "#9CA3AF", fontSize: "1rem" }} data-testid="text-business-name">{businessName}</p>
        </section>

        {hasMultiple && (
          <div style={{ display: "flex", gap: "8px", justifyContent: "center", flexWrap: "wrap", marginBottom: "24px" }} data-testid="section-options">
            {offers.map((o, idx) => {
              const isActive = idx === selectedIndex;
              const amt = parseFloat(o.advanceAmount || "0");
              return (
                <button key={idx} onClick={() => setSelectedIndex(idx)} style={{
                  padding: "10px 18px", borderRadius: "12px",
                  background: isActive ? `rgba(${ACCENT_RGB}, 0.2)` : "rgba(255,255,255,0.04)",
                  border: isActive ? `2px solid ${ACCENT}` : "2px solid rgba(255,255,255,0.08)",
                  color: isActive ? ACCENT_LIGHT : "#9CA3AF",
                  fontWeight: isActive ? 700 : 500, fontSize: "0.8125rem", cursor: "pointer",
                }} data-testid={`button-option-${idx}`}>
                  Option {idx + 1}{amt > 0 ? ` — ${fmtMoney(amt)}` : ""}
                </button>
              );
            })}
          </div>
        )}

        {/* Slider card */}
        <section style={{
          background: "#111827", border: `1px solid rgba(${ACCENT_RGB}, 0.2)`,
          borderRadius: "16px", padding: "32px 28px", marginBottom: "20px",
        }} data-testid="section-slider">
          <div style={{ textAlign: "center", marginBottom: "8px" }}>
            <div style={{ fontSize: "0.8125rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "#6B7280", marginBottom: "12px" }}>
              How much would you like to take?
            </div>
            <div style={{ fontSize: "3.25rem", fontWeight: 800, color: ACCENT, letterSpacing: "-0.03em", lineHeight: 1, textShadow: `0 0 60px rgba(${ACCENT_RGB}, 0.25)` }} data-testid="text-draw-amount">
              {fmtMoney(draw)}
            </div>
            <div style={{ fontSize: "0.875rem", color: "#6B7280", marginTop: "10px" }}>
              {pctOfApproval}% of your {fmtMoney(approved)} approval
            </div>
          </div>

          <div style={{ margin: "26px 4px 6px" }}>
            <input
              type="range" className="offer-slider"
              min={minDraw} max={approved} step={step} value={draw}
              onChange={(e) => setDraws((d) => ({ ...d, [selectedIndex]: Number(e.target.value) }))}
              style={{ background: `linear-gradient(to right, ${ACCENT} 0%, ${ACCENT} ${((draw - minDraw) / Math.max(1, approved - minDraw)) * 100}%, rgba(255,255,255,0.1) ${((draw - minDraw) / Math.max(1, approved - minDraw)) * 100}%, rgba(255,255,255,0.1) 100%)` }}
              data-testid="input-draw-slider"
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#6B7280", marginTop: "8px" }}>
              <span>{fmtMoney(minDraw)}</span>
              <span>{fmtMoney(approved)}</span>
            </div>
          </div>

          <div style={{ display: "flex", gap: "8px", justifyContent: "center", marginTop: "14px", flexWrap: "wrap" }}>
            {[25, 50, 75, 100].map((pct) => {
              const target = Math.max(minDraw, Math.round((approved * pct / 100) / step) * step);
              const active = Math.abs(target - draw) < step / 2;
              return (
                <button key={pct} onClick={() => setDraws((d) => ({ ...d, [selectedIndex]: target }))} style={{
                  padding: "6px 14px", borderRadius: "9999px", fontSize: "0.8125rem", fontWeight: 600, cursor: "pointer",
                  background: active ? `rgba(${ACCENT_RGB}, 0.25)` : "rgba(255,255,255,0.05)",
                  border: active ? `1px solid ${ACCENT}` : "1px solid rgba(255,255,255,0.1)",
                  color: active ? ACCENT_LIGHT : "#9CA3AF",
                }} data-testid={`button-pct-${pct}`}>
                  {pct}%
                </button>
              );
            })}
          </div>
        </section>

        {/* Live metrics */}
        <section style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "20px" }} data-testid="section-metrics">
          {metric(`${freqLabel(current?.paymentFrequency || null)} Payment`, fmtMoney(payment, payment < 10000), true)}
          {metric("Total Payback", fmtMoney(payback))}
          {metric("Number of Payments", String(nPayments))}
        </section>
        <section style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "28px" }}>
          {metric("Term", current?.term || "—")}
          {metric("Cost of Capital", fmtMoney(costOfCapital))}
        </section>

        <p style={{ textAlign: "center", color: "#6B7280", fontSize: "0.8125rem", marginBottom: "28px" }}>
          Drag the slider to see how taking a different amount changes your {freqLabel(current?.paymentFrequency || null).toLowerCase()} payment and total payback.
          Early payoff discounts may be available — ask your rep.
        </p>

        {/* CTA */}
        <section style={{
          background: `linear-gradient(135deg, ${ACCENT}dd 0%, ${ACCENT} 100%)`,
          borderRadius: "16px", padding: "32px 28px", textAlign: "center",
        }} data-testid="section-cta">
          <h3 style={{ fontSize: "1.375rem", fontWeight: 800, marginBottom: "6px", color: "#0B1120" }}>Ready to Move Forward?</h3>
          <p style={{ color: "rgba(11, 17, 32, 0.7)", marginBottom: "22px", fontSize: "0.9375rem" }}>
            Lock in {fmtMoney(draw)} — no obligation until docs are signed.
          </p>
          <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
            <a href={acceptUrl} style={{
              display: "inline-flex", alignItems: "center", gap: "8px",
              padding: "14px 28px", borderRadius: "9999px", fontWeight: 700,
              fontSize: "0.9375rem", textDecoration: "none", background: "#0B1120", color: "#fff",
            }} data-testid="link-accept-offer">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: "18px", height: "18px" }}>
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Accept Offer
            </a>
            <a href={SCHEDULING_LINK} target="_blank" rel="noopener noreferrer" style={{
              display: "inline-flex", alignItems: "center", gap: "8px",
              padding: "14px 28px", borderRadius: "9999px", fontWeight: 700,
              fontSize: "0.9375rem", textDecoration: "none",
              background: "rgba(11, 17, 32, 0.15)", color: "#0B1120",
              border: "2px solid rgba(11, 17, 32, 0.2)",
            }} data-testid="link-schedule-rep">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: "18px", height: "18px" }}>
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              Talk to a Rep
            </a>
            <a href={`tel:+1${PHONE_NUMBER.replace(/\D/g, "")}`} style={{
              display: "inline-flex", alignItems: "center", gap: "8px",
              padding: "14px 28px", borderRadius: "9999px", fontWeight: 700,
              fontSize: "0.9375rem", textDecoration: "none",
              background: "rgba(11, 17, 32, 0.15)", color: "#0B1120",
              border: "2px solid rgba(11, 17, 32, 0.2)",
            }} data-testid="link-call">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: "18px", height: "18px" }}>
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              Call Now
            </a>
          </div>
        </section>

        <footer style={{ textAlign: "center", padding: "28px 24px", color: "#6B7280", fontSize: "0.8125rem" }}>
          <p style={{ marginBottom: "4px" }}>Estimates shown are based on your approved terms; final figures appear on your funding agreement.</p>
          <p>Subject to final verification and approval</p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "20px", marginTop: "14px", paddingTop: "14px", borderTop: "1px solid rgba(255, 255, 255, 0.08)", flexWrap: "wrap" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "6px", color: "#9CA3AF" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: "14px", height: "14px" }}>
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              {PHONE_NUMBER}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "6px", color: "#9CA3AF" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: "14px", height: "14px" }}>
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              {EMAIL_ADDRESS}
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}
