import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Loader2, Info } from "lucide-react";

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

const TEAL = "#10BC97";
const NAVY = "#0F172A";
const TEXT_GRAY = "#6B7280";
const LABEL_GRAY = "#9CA3AF";
const BORDER_GRAY = "#E5E7EB";
const PAGE_BG = "#F8FAFC";

function fmtMoney(n: number, cents = false): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD",
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  }).format(n);
}

function paymentsCount(term: string | null, frequency: string | null): number {
  const t = (term || "").toLowerCase();
  const freq = (frequency || "monthly").toLowerCase();
  const num = parseFloat(t.match(/([\d.]+)/)?.[1] || "");
  if (!num || Number.isNaN(num)) {
    return freq === "daily" ? 132 : freq === "weekly" ? 26 : 6;
  }
  if (t.includes("month")) {
    if (freq === "monthly") return Math.round(num);
    if (freq === "weekly") return Math.round(num * 4.33);
    if (freq === "biweekly") return Math.round(num * 2.17);
    return Math.round(num * 21);
  }
  if (t.includes("week")) {
    if (freq === "weekly") return Math.round(num);
    if (freq === "daily") return Math.round(num * 5);
    if (freq === "biweekly") return Math.max(1, Math.round(num / 2));
    return Math.max(1, Math.round(num / 4.33));
  }
  if (t.includes("day")) {
    if (freq === "daily") return Math.round(num);
    if (freq === "weekly") return Math.max(1, Math.round(num / 7));
    if (freq === "biweekly") return Math.max(1, Math.round(num / 14));
    return Math.max(1, Math.round(num / 30));
  }
  return Math.round(num);
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

function sliderStep(max: number): number {
  if (max >= 500000) return 10000;
  if (max >= 200000) return 5000;
  if (max >= 50000) return 2500;
  if (max >= 20000) return 1000;
  return 500;
}

function calcOfferMetrics(offer: OfferTerms, drawAmount?: number) {
  const approved = parseFloat(offer.advanceAmount || "") || 0;
  const factor = parseFloat(offer.factorRate || "") || 1.25;
  const nPayments = Math.max(1, paymentsCount(offer.term || null, offer.paymentFrequency || null));
  const draw = drawAmount ?? approved;
  const payback = draw * factor;
  const payment = payback / nPayments;
  return { approved, factor, nPayments, draw, payback, payment };
}

export default function OfferExplorer() {
  const { slug } = useParams<{ slug: string }>();
  const [selectedIndex, setSelectedIndex] = useState(0);
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
  // Minimum draw is 40% of the approved amount
  const minDraw = Math.min(approved, Math.max(step, Math.round(approved * 0.40 / step) * step));
  const draw = Math.min(approved, Math.max(minDraw, draws[selectedIndex] ?? approved));

  const payback = draw * factor;
  const payment = payback / nPayments;
  const pctOfApproval = approved > 0 ? Math.round((draw / approved) * 100) : 100;

  const hasMultiple = offers.length > 1;

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
        <Loader2 className="w-12 h-12 animate-spin" style={{ color: TEAL }} />
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
          width: 24px; height: 24px; border-radius: 50%;
          background: #fff; border: 3px solid ${TEAL};
          box-shadow: 0 2px 6px rgba(16, 188, 151, 0.35); cursor: grab;
        }
        input[type="range"].offer-slider::-moz-range-thumb {
          width: 24px; height: 24px; border-radius: 50%;
          background: #fff; border: 3px solid ${TEAL};
          box-shadow: 0 2px 6px rgba(16, 188, 151, 0.35); cursor: grab; border: none;
        }
        .offer-metric-row { display: flex; flex-direction: column; padding: 10px 0; border-bottom: 1px solid rgba(0,0,0,0.07); }
        .offer-metric-row:last-child { border-bottom: none; }
        .offer-metric-row-sel { display: flex; flex-direction: column; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.15); }
        .offer-metric-row-sel:last-child { border-bottom: none; }
      `}</style>

      {/* Header */}
      <header style={{ background: "#fff", borderBottom: `1px solid ${BORDER_GRAY}`, padding: "14px 24px" }}>
        <div style={{ maxWidth: "980px", margin: "0 auto", display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "32px", height: "32px", background: TEAL, borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "18px", height: "18px" }}>
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
              <polyline points="17 6 23 6 23 12" />
            </svg>
          </div>
          <div style={{ fontWeight: 700, color: NAVY, fontSize: "1.05rem", letterSpacing: "-0.01em" }}>
            Today Capital <span style={{ color: TEAL }}>Group</span>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: "980px", margin: "0 auto", padding: "36px 16px 56px" }}>

        {/* Page heading */}
        <h1 style={{
          fontSize: "clamp(1.1rem, 3vw, 1.5rem)", fontWeight: 800, color: NAVY,
          textTransform: "uppercase", letterSpacing: "0.02em", marginBottom: "4px",
        }} data-testid="text-title">
          Understand Your Pricing — {businessName}
        </h1>
        <p style={{ color: TEXT_GRAY, fontSize: "0.9rem", marginBottom: "28px" }}>
          {hasMultiple ? "Select from following options or enter draw amount" : "Adjust your draw amount to see your pricing"}
        </p>

        {/* Option tabs */}
        {hasMultiple && (
          <div style={{ display: "flex", gap: "2px", marginBottom: "0" }} data-testid="section-options">
            {offers.map((_, idx) => {
              const isActive = idx === selectedIndex;
              return (
                <button
                  key={idx}
                  onClick={() => setSelectedIndex(idx)}
                  style={{
                    flex: 1, padding: "13px 8px",
                    border: "none", cursor: "pointer",
                    borderRadius: "8px 8px 0 0",
                    background: isActive ? TEAL : "#E5E7EB",
                    color: isActive ? "#fff" : "#4B5563",
                    fontWeight: 700, fontSize: "0.875rem", fontFamily: fontStack,
                    letterSpacing: "0.01em",
                    transition: "background 0.2s ease, color 0.2s ease",
                  }}
                  data-testid={`button-option-${idx}`}
                >
                  Option {idx + 1}
                </button>
              );
            })}
          </div>
        )}

        {/* Side-by-side option cards */}
        <div style={{
          display: "grid",
          gridTemplateColumns: `repeat(${Math.min(offers.length, 3)}, 1fr)`,
          border: `1px solid ${BORDER_GRAY}`,
          borderRadius: hasMultiple ? "0 0 12px 12px" : "12px",
          overflow: "hidden",
          boxShadow: "0 2px 12px rgba(10, 17, 40, 0.06)",
        }} data-testid="section-cards">
          {offers.map((offer, idx) => {
            const isSelected = idx === selectedIndex;
            const metrics = calcOfferMetrics(offer, isSelected ? draw : undefined);

            return (
              <div
                key={idx}
                onClick={() => setSelectedIndex(idx)}
                style={{
                  background: isSelected ? TEAL : "#fff",
                  color: isSelected ? "#fff" : NAVY,
                  padding: "24px 20px",
                  cursor: "pointer",
                  borderRight: idx < offers.length - 1 ? `1px solid ${isSelected ? "rgba(255,255,255,0.2)" : BORDER_GRAY}` : "none",
                  transition: "background 0.25s ease",
                }}
                data-testid={`card-option-${idx}`}
              >
                {/* Brand mark */}
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "16px" }}>
                  <svg viewBox="0 0 16 16" fill="none" style={{ width: "16px", height: "16px" }}>
                    <circle cx="8" cy="8" r="7" stroke={isSelected ? "rgba(255,255,255,0.7)" : BORDER_GRAY} strokeWidth="1.5" />
                    <polyline points="4,8 6.5,10.5 12,5" stroke={isSelected ? "#fff" : TEAL} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span style={{ fontSize: "0.85rem", fontWeight: 700, color: isSelected ? "#fff" : NAVY }}>Today Capital Group</span>
                </div>

                {/* Amount */}
                <div style={{ fontSize: "0.6875rem", fontWeight: 600, letterSpacing: "0.04em", color: isSelected ? "rgba(255,255,255,0.7)" : LABEL_GRAY, marginBottom: "4px" }}>
                  Available Spending Limit
                </div>
                <div style={{ fontSize: "clamp(1.4rem, 3vw, 1.875rem)", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: "14px" }} data-testid={`text-amount-${idx}`}>
                  {fmtMoney(metrics.draw)}
                </div>

                {/* Info notice */}
                <div style={{
                  background: isSelected ? "rgba(0,0,0,0.12)" : "#F9FAFB",
                  border: `1px solid ${isSelected ? "rgba(255,255,255,0.2)" : BORDER_GRAY}`,
                  borderRadius: "8px", padding: "9px 12px",
                  fontSize: "0.75rem", color: isSelected ? "rgba(255,255,255,0.85)" : TEXT_GRAY,
                  marginBottom: "18px",
                  display: "flex", alignItems: "flex-start", gap: "8px",
                }}>
                  <Info style={{ width: "13px", height: "13px", flexShrink: 0, marginTop: "1px", color: isSelected ? "rgba(255,255,255,0.7)" : LABEL_GRAY }} />
                  <span>Accepting This Offer May Require Additional Financials</span>
                </div>

                {/* Metric rows */}
                <div className={isSelected ? "offer-metric-row-sel" : "offer-metric-row"}>
                  <span style={{ fontSize: "0.6875rem", fontWeight: 600, letterSpacing: "0.03em", color: isSelected ? "rgba(255,255,255,0.65)" : LABEL_GRAY }}>
                    Repayment Per $1
                  </span>
                  <span style={{ fontSize: "1.125rem", fontWeight: 700, color: isSelected ? "#fff" : NAVY }}>
                    ${metrics.factor.toFixed(2)}
                  </span>
                </div>
                <div className={isSelected ? "offer-metric-row-sel" : "offer-metric-row"}>
                  <span style={{ fontSize: "0.6875rem", fontWeight: 600, letterSpacing: "0.03em", color: isSelected ? "rgba(255,255,255,0.65)" : LABEL_GRAY, display: "flex", alignItems: "center", gap: "4px" }}>
                    Estimated Payback Period
                    <Info style={{ width: "11px", height: "11px", color: isSelected ? "rgba(255,255,255,0.5)" : LABEL_GRAY }} />
                  </span>
                  <span style={{ fontSize: "1.125rem", fontWeight: 700, color: isSelected ? "#fff" : NAVY }}>
                    {metrics.nPayments}
                  </span>
                </div>
                <div className={isSelected ? "offer-metric-row-sel" : "offer-metric-row"}>
                  <span style={{ fontSize: "0.6875rem", fontWeight: 600, letterSpacing: "0.03em", color: isSelected ? "rgba(255,255,255,0.65)" : LABEL_GRAY }}>
                    Estimated {freqLabel(offer.paymentFrequency || null)} Payment
                  </span>
                  <span style={{ fontSize: "1.125rem", fontWeight: 700, color: isSelected ? "#fff" : NAVY }}>
                    {fmtMoney(metrics.payment, true)}
                  </span>
                </div>
                <div className={isSelected ? "offer-metric-row-sel" : "offer-metric-row"}>
                  <span style={{ fontSize: "0.6875rem", fontWeight: 600, letterSpacing: "0.03em", color: isSelected ? "rgba(255,255,255,0.65)" : LABEL_GRAY }}>
                    Total Payback
                  </span>
                  <span style={{ fontSize: "1.125rem", fontWeight: 700, color: isSelected ? "#fff" : NAVY }}>
                    {fmtMoney(metrics.payback)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Slider panel (for selected option) */}
        {approved > 0 && (
          <div style={{
            background: "#fff", border: `1px solid ${BORDER_GRAY}`,
            borderRadius: "12px", marginTop: "20px", padding: "24px 28px",
            boxShadow: "0 2px 8px rgba(10,17,40,0.05)",
          }} data-testid="section-slider">
            <div style={{ fontSize: "0.75rem", fontWeight: 600, color: LABEL_GRAY, letterSpacing: "0.04em", marginBottom: "6px" }}>
              ADJUST YOUR DRAW AMOUNT
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "12px", marginBottom: "4px" }}>
              <div style={{ fontSize: "clamp(1.75rem, 5vw, 2.25rem)", fontWeight: 800, color: NAVY, letterSpacing: "-0.02em" }} data-testid="text-draw-amount">
                {fmtMoney(draw)}
              </div>
              <div style={{ fontSize: "0.85rem", color: TEXT_GRAY }}>
                {pctOfApproval}% of your {fmtMoney(approved)} approval
              </div>
            </div>

            <div style={{ margin: "16px 2px 6px" }}>
              <input
                type="range"
                className="offer-slider"
                min={minDraw} max={approved} step={step} value={draw}
                onChange={(e) => setDraws((d) => ({ ...d, [selectedIndex]: Number(e.target.value) }))}
                style={{
                  background: `linear-gradient(to right, ${TEAL} 0%, ${TEAL} ${((draw - minDraw) / Math.max(1, approved - minDraw)) * 100}%, ${BORDER_GRAY} ${((draw - minDraw) / Math.max(1, approved - minDraw)) * 100}%, ${BORDER_GRAY} 100%)`
                }}
                data-testid="input-draw-slider"
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: LABEL_GRAY, marginTop: "8px", fontWeight: 500 }}>
                <span>{fmtMoney(minDraw)} (min 40%)</span>
                <span>{fmtMoney(approved)}</span>
              </div>
            </div>

            {/* Quick % buttons */}
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "14px" }}>
              {[40, 60, 75, 100].map((pct) => {
                const target = Math.max(minDraw, Math.round((approved * pct / 100) / step) * step);
                const active = Math.abs(target - draw) < step / 2;
                return (
                  <button
                    key={pct}
                    onClick={() => setDraws((d) => ({ ...d, [selectedIndex]: target }))}
                    style={{
                      padding: "6px 18px", borderRadius: "9999px", fontSize: "0.8125rem",
                      fontWeight: 600, cursor: "pointer", fontFamily: fontStack,
                      background: active ? "rgba(16, 188, 151, 0.1)" : "#F3F4F6",
                      border: active ? `1.5px solid ${TEAL}` : `1px solid ${BORDER_GRAY}`,
                      color: active ? TEAL : TEXT_GRAY,
                    }}
                    data-testid={`button-pct-${pct}`}
                  >
                    {pct}%
                  </button>
                );
              })}
            </div>

            <div style={{
              display: "flex", alignItems: "flex-start", gap: "8px", marginTop: "16px",
              fontSize: "0.8rem", color: TEXT_GRAY,
            }}>
              <Info style={{ width: "14px", height: "14px", flexShrink: 0, marginTop: "2px", color: LABEL_GRAY }} />
              <span>Enter different draw amounts to see how your estimated {freqLabel(current?.paymentFrequency || null).toLowerCase()} payment changes. Early payoff discounts may be available — ask your rep.</span>
            </div>
          </div>
        )}

        {/* Accept button */}
        <a
          href={acceptUrl}
          style={{
            display: "block", textAlign: "center", marginTop: "20px",
            background: TEAL, color: "#fff", textDecoration: "none",
            padding: "17px 24px", borderRadius: "10px",
            fontWeight: 700, fontSize: "1rem", letterSpacing: "0.01em",
            boxShadow: "0 4px 16px rgba(16, 188, 151, 0.35)",
          }}
          data-testid="link-accept-offer"
        >
          Accept Offer{hasMultiple ? ` – Option ${selectedIndex + 1}` : ""} · {fmtMoney(draw)}
        </a>

        {/* Secondary CTAs */}
        <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap", marginTop: "14px" }} data-testid="section-cta-secondary">
          <a
            href={SCHEDULING_LINK}
            target="_blank" rel="noopener noreferrer"
            style={{
              display: "inline-flex", alignItems: "center", gap: "8px",
              padding: "11px 22px", borderRadius: "8px", fontWeight: 600,
              fontSize: "0.875rem", textDecoration: "none",
              background: "#fff", color: NAVY, border: `1.5px solid ${NAVY}`,
            }}
            data-testid="link-schedule-rep"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: "15px", height: "15px" }}>
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            Talk to a Sales Rep
          </a>
          <a
            href={`tel:+1${PHONE_NUMBER.replace(/\D/g, "")}`}
            style={{
              display: "inline-flex", alignItems: "center", gap: "8px",
              padding: "11px 22px", borderRadius: "8px", fontWeight: 600,
              fontSize: "0.875rem", textDecoration: "none",
              background: "#fff", color: NAVY, border: `1.5px solid ${NAVY}`,
            }}
            data-testid="link-call"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: "15px", height: "15px" }}>
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
            Call {PHONE_NUMBER}
          </a>
        </div>

        {/* Footer */}
        <footer style={{ textAlign: "center", padding: "28px 24px 0", color: LABEL_GRAY, fontSize: "0.8rem" }}>
          <p style={{ marginBottom: "2px" }}>Estimates shown are based on your approved terms; final figures appear on your funding agreement.</p>
          <p>Subject to final verification and approval</p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "20px", marginTop: "10px", flexWrap: "wrap", fontWeight: 500, color: TEXT_GRAY }}>
            <span>{PHONE_NUMBER}</span>
            <span>{EMAIL_ADDRESS}</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
