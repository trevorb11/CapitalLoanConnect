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
  minimumDraw: string | null;
}

interface OfferData {
  businessName: string | null;
  offers: OfferTerms[];
}

const SCHEDULING_LINK = "https://bit.ly/3Zxj0Kq";
const PHONE_NUMBER = "(818) 351-0225";
const EMAIL_ADDRESS = "admin@todaycapitalgroup.com";

// Revenued-style palette
const NAVY = "#0A1128";            // header / headings / option-1
const PAGE_BG = "#D9E2F5";         // light periwinkle page background
const TEXT_GRAY = "#6B7280";
const LABEL_GRAY = "#9CA3AF";
const BORDER_GRAY = "#E5E7EB";
const GREEN = "#10BC97";           // Revenued green-teal

// Per-option accent (cycles): navy → blue → green, like the Revenued tabs
const OPTION_COLORS = [
  { grad: "linear-gradient(90deg, #0A1633 0%, #1D4289 100%)", solid: "#12306B", rgb: "18, 48, 107" },
  { grad: "linear-gradient(90deg, #1D4ED8 0%, #3B82F6 100%)", solid: "#2563EB", rgb: "37, 99, 235" },
  { grad: "linear-gradient(90deg, #0CAB85 0%, #17CDA4 100%)", solid: GREEN, rgb: "16, 188, 151" },
];

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
  // Admin-set minimum draw wins; otherwise default the floor to 10% of the approval
  const adminMin = parseFloat(current?.minimumDraw || "");
  const minDraw = Number.isFinite(adminMin) && adminMin > 0
    ? Math.min(approved, adminMin)
    : Math.min(approved, Math.max(step, Math.round(approved * 0.1 / step) * step));
  const draw = Math.min(approved, Math.max(minDraw, draws[selectedIndex] ?? approved));

  const payback = draw * factor;
  const payment = payback / nPayments;
  const pctOfApproval = approved > 0 ? Math.round((draw / approved) * 100) : 100;

  const hasMultiple = offers.length > 1;
  const accent = OPTION_COLORS[selectedIndex % OPTION_COLORS.length];

  const acceptUrl = `/api/offer/${slug}/accept?` + new URLSearchParams({
    approved: String(Math.round(approved)),
    amount: String(Math.round(draw)),
    payment: payment.toFixed(2),
    payback: payback.toFixed(2),
    term: current?.term || "",
    factor: String(factor),
  }).toString();

  const fontStack = "'Montserrat', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif";

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: PAGE_BG, fontFamily: fontStack }}>
        <Loader2 className="w-12 h-12 animate-spin" style={{ color: NAVY }} />
      </div>
    );
  }

  if (error || !data || offers.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: PAGE_BG, fontFamily: fontStack, color: NAVY, padding: "24px", textAlign: "center" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: "1rem" }}>Offer Not Found</h1>
        <p style={{ color: TEXT_GRAY }}>This offer may have expired or doesn't exist. Give us a call at {PHONE_NUMBER}.</p>
      </div>
    );
  }

  const businessName = data.businessName || "Valued Customer";

  const metric = (label: string, value: string, highlight = false) => (
    <div style={{
      background: highlight ? `rgba(${accent.rgb}, 0.08)` : "#F9FAFB",
      border: highlight ? `1.5px solid ${accent.solid}` : `1px solid ${BORDER_GRAY}`,
      borderRadius: "10px", padding: "18px 12px", textAlign: "center", flex: "1 1 140px", minWidth: "140px",
    }}>
      <div style={{ fontSize: "0.6875rem", color: LABEL_GRAY, letterSpacing: "0.02em", fontWeight: 600, marginBottom: "6px" }}>{label}</div>
      <div style={{ fontSize: "1.375rem", fontWeight: 700, color: highlight ? accent.solid : NAVY, letterSpacing: "-0.01em" }}>{value}</div>
    </div>
  );

  return (
    <div style={{ fontFamily: fontStack, background: PAGE_BG, color: NAVY, lineHeight: 1.6, minHeight: "100vh" }}>
      <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
      <style>{`
        input[type="range"].offer-slider {
          -webkit-appearance: none; appearance: none;
          width: 100%; height: 8px; border-radius: 9999px; outline: none; cursor: pointer;
        }
        input[type="range"].offer-slider::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none;
          width: 26px; height: 26px; border-radius: 50%;
          background: #fff; border: 3px solid ${accent.solid};
          box-shadow: 0 2px 8px rgba(10, 17, 40, 0.25); cursor: grab;
        }
        input[type="range"].offer-slider::-moz-range-thumb {
          width: 26px; height: 26px; border-radius: 50%;
          background: #fff; border: 3px solid ${accent.solid};
          box-shadow: 0 2px 8px rgba(10, 17, 40, 0.25); cursor: grab;
        }
      `}</style>

      {/* Dark navy header bar */}
      <header style={{ background: NAVY, padding: "18px 24px" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "36px", height: "36px", background: GREEN, borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke={NAVY} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "22px", height: "22px" }}>
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
              <polyline points="17 6 23 6 23 12" />
            </svg>
          </div>
          <div style={{ fontSize: "1.1875rem", fontWeight: 700, color: "#fff", letterSpacing: "-0.01em" }}>
            Today Capital <span style={{ color: GREEN }}>Group</span>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: "880px", margin: "0 auto", padding: "36px 16px 48px" }}>
        {/* Main white card */}
        <div style={{ background: "#fff", borderRadius: "14px", boxShadow: "0 4px 24px rgba(10, 17, 40, 0.08)", padding: "clamp(24px, 5vw, 44px)" }} data-testid="section-card">
          <h1 style={{
            fontSize: "clamp(1.25rem, 3.5vw, 1.625rem)", fontWeight: 800, color: NAVY,
            textTransform: "uppercase", letterSpacing: "0.01em", lineHeight: 1.25, marginBottom: "6px",
          }} data-testid="text-title">
            Understand Your Pricing — {businessName}
          </h1>
          <p style={{ color: TEXT_GRAY, fontSize: "0.9375rem", marginBottom: "28px" }} data-testid="text-subtitle">
            {hasMultiple ? "Select from the following options or adjust your draw amount" : "Adjust your draw amount to see your pricing"}
          </p>

          {/* Option tabs */}
          {hasMultiple && (
            <div style={{ display: "flex", gap: "4px", marginBottom: "0" }} data-testid="section-options">
              {offers.map((_, idx) => {
                const isActive = idx === selectedIndex;
                const c = OPTION_COLORS[idx % OPTION_COLORS.length];
                return (
                  <button key={idx} onClick={() => setSelectedIndex(idx)} style={{
                    flex: 1, padding: "14px 8px",
                    borderRadius: "10px 10px 0 0", border: "none", cursor: "pointer",
                    background: isActive ? c.grad : "#D1D5DB",
                    color: isActive ? "#fff" : "#4B5563",
                    fontWeight: 700, fontSize: "0.875rem", fontFamily: fontStack,
                    letterSpacing: "0.01em",
                    transition: "all 0.25s ease",
                  }} data-testid={`button-option-${idx}`}>
                    Option {idx + 1}
                  </button>
                );
              })}
            </div>
          )}

          {/* Offer body — bordered panel attached to the tabs */}
          <div style={{
            border: `1px solid ${BORDER_GRAY}`,
            borderRadius: hasMultiple ? "0 0 12px 12px" : "12px",
            padding: "clamp(20px, 4vw, 32px)",
            boxShadow: "0 2px 12px rgba(10, 17, 40, 0.05)",
          }}>
            {/* Draw amount + slider */}
            <div style={{ textAlign: "center", marginBottom: "6px" }} data-testid="section-slider">
              <div style={{ fontSize: "0.75rem", color: LABEL_GRAY, fontWeight: 600, marginBottom: "10px" }}>
                Available Spending Limit
              </div>
              <div style={{ fontSize: "clamp(2.25rem, 7vw, 3rem)", fontWeight: 800, color: NAVY, letterSpacing: "-0.02em", lineHeight: 1 }} data-testid="text-draw-amount">
                {fmtMoney(draw)}
              </div>
              <div style={{ fontSize: "0.8125rem", color: TEXT_GRAY, marginTop: "8px" }}>
                {pctOfApproval}% of your {fmtMoney(approved)} approval
              </div>
            </div>

            <div style={{ margin: "24px 4px 4px" }}>
              <input
                type="range" className="offer-slider"
                min={minDraw} max={approved} step={step} value={draw}
                onChange={(e) => setDraws((d) => ({ ...d, [selectedIndex]: Number(e.target.value) }))}
                style={{ background: `linear-gradient(to right, ${accent.solid} 0%, ${accent.solid} ${((draw - minDraw) / Math.max(1, approved - minDraw)) * 100}%, ${BORDER_GRAY} ${((draw - minDraw) / Math.max(1, approved - minDraw)) * 100}%, ${BORDER_GRAY} 100%)` }}
                data-testid="input-draw-slider"
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: LABEL_GRAY, marginTop: "8px", fontWeight: 500 }}>
                <span>{fmtMoney(minDraw)}</span>
                <span>{fmtMoney(approved)}</span>
              </div>
            </div>

            <div style={{ display: "flex", gap: "8px", justifyContent: "center", margin: "12px 0 26px", flexWrap: "wrap" }}>
              {[25, 50, 75, 100].map((pct) => {
                const target = Math.max(minDraw, Math.round((approved * pct / 100) / step) * step);
                const active = Math.abs(target - draw) < step / 2;
                return (
                  <button key={pct} onClick={() => setDraws((d) => ({ ...d, [selectedIndex]: target }))} style={{
                    padding: "6px 16px", borderRadius: "9999px", fontSize: "0.8125rem", fontWeight: 600, cursor: "pointer", fontFamily: fontStack,
                    background: active ? `rgba(${accent.rgb}, 0.1)` : "#F3F4F6",
                    border: active ? `1.5px solid ${accent.solid}` : `1px solid ${BORDER_GRAY}`,
                    color: active ? accent.solid : TEXT_GRAY,
                  }} data-testid={`button-pct-${pct}`}>
                    {pct}%
                  </button>
                );
              })}
            </div>

            {/* Live metrics */}
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }} data-testid="section-metrics">
              {metric(`Estimated ${freqLabel(current?.paymentFrequency || null)} Payment`, fmtMoney(payment, payment < 10000), true)}
              {metric("Total Payback", fmtMoney(payback))}
              {metric("Number of Payments", String(nPayments))}
              {metric("Term", current?.term || "—")}
            </div>

            <div style={{
              display: "flex", alignItems: "center", gap: "10px", marginTop: "18px",
              border: `1px solid ${BORDER_GRAY}`, borderRadius: "8px", padding: "10px 14px",
              color: TEXT_GRAY, fontSize: "0.8125rem",
            }}>
              <svg viewBox="0 0 24 24" fill="none" stroke={LABEL_GRAY} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: "16px", height: "16px", flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              Enter different draw amounts to see how your estimated {freqLabel(current?.paymentFrequency || null).toLowerCase()} payment changes. Early payoff discounts may be available — ask your rep.
            </div>
          </div>

          {/* Full-width accept bar */}
          <a href={acceptUrl} style={{
            display: "block", textAlign: "center", marginTop: "28px",
            background: accent.grad, color: "#fff", textDecoration: "none",
            padding: "16px 24px", borderRadius: "10px",
            fontWeight: 700, fontSize: "1rem", letterSpacing: "0.01em",
            boxShadow: `0 4px 16px rgba(${accent.rgb}, 0.35)`,
          }} data-testid="link-accept-offer">
            Accept Offer{hasMultiple ? ` – Option ${selectedIndex + 1}` : ""} · {fmtMoney(draw)}
          </a>

          {/* Secondary CTAs */}
          <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap", marginTop: "16px" }} data-testid="section-cta-secondary">
            <a href={SCHEDULING_LINK} target="_blank" rel="noopener noreferrer" style={{
              display: "inline-flex", alignItems: "center", gap: "8px",
              padding: "12px 24px", borderRadius: "10px", fontWeight: 600,
              fontSize: "0.875rem", textDecoration: "none",
              background: "#fff", color: NAVY, border: `1.5px solid ${NAVY}`,
            }} data-testid="link-schedule-rep">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: "16px", height: "16px" }}>
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              Talk to a Sales Rep
            </a>
            <a href={`tel:+1${PHONE_NUMBER.replace(/\D/g, "")}`} style={{
              display: "inline-flex", alignItems: "center", gap: "8px",
              padding: "12px 24px", borderRadius: "10px", fontWeight: 600,
              fontSize: "0.875rem", textDecoration: "none",
              background: "#fff", color: NAVY, border: `1.5px solid ${NAVY}`,
            }} data-testid="link-call">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: "16px", height: "16px" }}>
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              Call {PHONE_NUMBER}
            </a>
          </div>
        </div>

        {/* Footer */}
        <footer style={{ textAlign: "center", padding: "26px 24px 0", color: TEXT_GRAY, fontSize: "0.8125rem" }}>
          <p style={{ marginBottom: "2px" }}>Estimates shown are based on your approved terms; final figures appear on your funding agreement.</p>
          <p>Subject to final verification and approval</p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "20px", marginTop: "12px", flexWrap: "wrap", fontWeight: 500 }}>
            <span>{PHONE_NUMBER}</span>
            <span>{EMAIL_ADDRESS}</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
