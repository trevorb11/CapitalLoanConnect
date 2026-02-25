import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

interface ApprovalEntry {
  id: string;
  lender: string;
  advanceAmount: string;
  term: string;
  paymentFrequency: string;
  factorRate: string;
  totalPayback: string;
  netAfterFees: string;
  notes: string;
  approvalDate: string;
  isPrimary: boolean;
}

interface ApprovalData {
  businessName: string | null;
  advanceAmount: string | null;
  term: string | null;
  paymentFrequency: string | null;
  factorRate: string | null;
  totalPayback: string | null;
  netAfterFees: string | null;
  lender: string | null;
  approvalDate: string | null;
  notes: string | null;
  additionalApprovals: ApprovalEntry[] | null;
}

// Color themes: primary (teal), then alternating schemes for additional offers
const COLOR_THEMES = [
  { accent: "#14B8A6", accentRgb: "20, 184, 166", accentLight: "#2DD4BF", label: "Best Offer" },         // teal (primary)
  { accent: "#8B5CF6", accentRgb: "139, 92, 246", accentLight: "#A78BFA", label: "Option 2" },            // violet
  { accent: "#F59E0B", accentRgb: "245, 158, 11", accentLight: "#FBBF24", label: "Option 3" },            // amber
  { accent: "#EC4899", accentRgb: "236, 72, 153", accentLight: "#F472B6", label: "Option 4" },            // pink
  { accent: "#3B82F6", accentRgb: "59, 130, 246", accentLight: "#60A5FA", label: "Option 5" },            // blue
  { accent: "#10B981", accentRgb: "16, 185, 129", accentLight: "#34D399", label: "Option 6" },            // emerald
];

function formatCurrency(value: string | null | undefined): string {
  if (!value) return "$0";
  const num = parseFloat(value);
  if (isNaN(num)) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

function getPaymentTypeLabel(frequency: string | null): string {
  switch (frequency) {
    case 'daily':
      return 'Daily Payments';
    case 'monthly':
      return 'Monthly Payments';
    case 'weekly':
    default:
      return 'Weekly Payments';
  }
}

const SCHEDULING_LINK = "https://bit.ly/3Zxj0Kq";
const PHONE_NUMBER = "(818) 351-0225";
const EMAIL_ADDRESS = "admin@todaycapitalgroup.com";

// Build ordered list of offers: primary first, then others by creation date
function getOrderedOffers(approval: ApprovalData): Array<{
  advanceAmount: string | null;
  term: string | null;
  paymentFrequency: string | null;
  factorRate: string | null;
  totalPayback: string | null;
  netAfterFees: string | null;
  lender: string | null;
  approvalDate: string | null;
  notes: string | null;
  isPrimary: boolean;
}> {
  const raw = approval.additionalApprovals;

  // New format: full approval entries with isPrimary
  if (raw && raw.length > 0 && raw[0].isPrimary !== undefined) {
    const sorted = [...raw].sort((a, b) => {
      if (a.isPrimary && !b.isPrimary) return -1;
      if (!a.isPrimary && b.isPrimary) return 1;
      return 0; // keep admin ordering for non-primary
    });
    return sorted.map(entry => ({
      advanceAmount: entry.advanceAmount || null,
      term: entry.term || null,
      paymentFrequency: entry.paymentFrequency || null,
      factorRate: entry.factorRate || null,
      totalPayback: entry.totalPayback || null,
      netAfterFees: entry.netAfterFees || null,
      lender: entry.lender || null,
      approvalDate: entry.approvalDate || null,
      notes: entry.notes || null,
      isPrimary: entry.isPrimary,
    }));
  }

  // Legacy: just the single top-level approval
  return [{
    advanceAmount: approval.advanceAmount,
    term: approval.term,
    paymentFrequency: approval.paymentFrequency,
    factorRate: approval.factorRate,
    totalPayback: approval.totalPayback,
    netAfterFees: approval.netAfterFees,
    lender: approval.lender,
    approvalDate: approval.approvalDate,
    notes: approval.notes,
    isPrimary: true,
  }];
}

export default function ApprovalLetter() {
  const { slug } = useParams<{ slug: string }>();
  const [selectedIndex, setSelectedIndex] = useState(0);

  const { data: approval, isLoading, error } = useQuery<ApprovalData>({
    queryKey: [`/api/approval-letter/${slug}`],
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0B1120", fontFamily: "'Inter', sans-serif" }}>
        <Loader2 className="w-12 h-12 animate-spin" style={{ color: "#14B8A6" }} />
      </div>
    );
  }

  if (error || !approval) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: "#0B1120", fontFamily: "'Inter', sans-serif", color: "#fff" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "1rem" }}>Approval Not Found</h1>
        <p style={{ color: "#9CA3AF" }}>This approval letter may have expired or doesn't exist.</p>
      </div>
    );
  }

  const offers = getOrderedOffers(approval);
  const hasMultiple = offers.length > 1;
  const current = offers[selectedIndex] || offers[0];
  const theme = COLOR_THEMES[selectedIndex % COLOR_THEMES.length];

  const advanceAmount = formatCurrency(current.advanceAmount);
  const paymentTypeLabel = getPaymentTypeLabel(current.paymentFrequency);
  const businessName = approval.businessName || "Valued Customer";
  const factorRate = current.factorRate || "1.25";
  const lender = current.lender || "Standard Program";
  const approvalDateStr = current.approvalDate ? format(new Date(current.approvalDate), "MMMM d, yyyy") : format(new Date(), "MMMM d, yyyy");

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", background: "#0B1120", color: "#fff", lineHeight: 1.6, minHeight: "100vh" }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
        background: `radial-gradient(ellipse 80% 50% at 50% -20%, rgba(${theme.accentRgb}, 0.15) 0%, transparent 50%), radial-gradient(ellipse 60% 40% at 100% 100%, rgba(${theme.accentRgb}, 0.08) 0%, transparent 50%)`,
        pointerEvents: "none", zIndex: 0,
        transition: "background 0.5s ease",
      }} />

      <header style={{ position: "relative", zIndex: 10, padding: "20px 24px", borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "40px", height: "40px", background: theme.accent, borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.5s ease" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#0B1120" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "24px", height: "24px" }}>
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                <polyline points="17 6 23 6 23 12" />
              </svg>
            </div>
            <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#fff" }}>Today Capital <span style={{ color: theme.accent, transition: "color 0.5s ease" }}>Group</span></div>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: "600px", margin: "0 auto", padding: "48px 24px", position: "relative", zIndex: 1 }}>
        <section style={{ textAlign: "center", marginBottom: "48px" }} data-testid="section-hero">
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "8px",
            background: `rgba(${theme.accentRgb}, 0.25)`, border: `1px solid rgba(${theme.accentRgb}, 0.3)`,
            color: theme.accentLight, padding: "10px 20px", borderRadius: "9999px",
            fontSize: "0.875rem", fontWeight: 600, marginBottom: "32px",
            transition: "all 0.5s ease",
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "18px", height: "18px" }}>
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            Approved
          </div>

          <p style={{ fontSize: "1.125rem", color: "#9CA3AF", marginBottom: "8px" }}>Congratulations,</p>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 600, color: "#fff", marginBottom: "32px" }} data-testid="text-business-name">{businessName}</h1>

          <h2 style={{ fontSize: "2rem", fontWeight: 800, lineHeight: 1.2, marginBottom: "16px" }}>
            {hasMultiple ? "Your Approval Options" : "You've Been Approved For Up To"}
          </h2>

          <div style={{ margin: "32px 0" }}>
            <div style={{ fontSize: "4.5rem", fontWeight: 800, color: theme.accent, letterSpacing: "-0.03em", lineHeight: 1, textShadow: `0 0 60px rgba(${theme.accentRgb}, 0.25)`, transition: "color 0.5s ease, text-shadow 0.5s ease" }} data-testid="text-advance-amount">
              {advanceAmount}
            </div>
          </div>
        </section>

        {/* Offer pagination selector - only shows when multiple offers exist */}
        {hasMultiple && (
          <div style={{ marginBottom: "28px" }} data-testid="section-pagination">
            <div style={{ display: "flex", gap: "8px", justifyContent: "center", flexWrap: "wrap" }}>
              {offers.map((offer, idx) => {
                const t = COLOR_THEMES[idx % COLOR_THEMES.length];
                const isActive = idx === selectedIndex;
                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedIndex(idx)}
                    style={{
                      display: "flex", alignItems: "center", gap: "8px",
                      padding: "10px 18px", borderRadius: "12px",
                      background: isActive ? `rgba(${t.accentRgb}, 0.2)` : "rgba(255,255,255,0.04)",
                      border: isActive ? `2px solid ${t.accent}` : "2px solid rgba(255,255,255,0.08)",
                      color: isActive ? t.accentLight : "#9CA3AF",
                      fontWeight: isActive ? 700 : 500,
                      fontSize: "0.8125rem",
                      cursor: "pointer",
                      transition: "all 0.3s ease",
                    }}
                    data-testid={`button-offer-${idx}`}
                  >
                    <span style={{
                      width: "8px", height: "8px", borderRadius: "50%",
                      background: isActive ? t.accent : "rgba(255,255,255,0.2)",
                      transition: "background 0.3s ease",
                    }} />
                    {idx === 0 ? "Best Offer" : `Option ${idx + 1}`}
                    {offer.lender && (
                      <span style={{ opacity: 0.7, fontWeight: 400 }}>
                        {offer.lender}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <section style={{
          background: "#111827", border: `1px solid rgba(${theme.accentRgb}, 0.15)`,
          borderRadius: "16px", padding: "32px", marginBottom: "24px",
          transition: "border-color 0.5s ease",
        }} data-testid="section-offer">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "32px" }}>
            <span style={{ fontSize: "0.8125rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "#6B7280" }}>
              {hasMultiple ? theme.label : "Your Offer"}
            </span>
            <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: theme.accent, transition: "color 0.5s ease" }} data-testid="text-lender">{lender}</span>
          </div>

          <div style={{ display: "flex", justifyContent: "center", gap: "48px" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "1.5rem", fontWeight: 700, color: theme.accent, marginBottom: "4px", transition: "color 0.5s ease" }} data-testid="text-advance-amount-detail">
                {advanceAmount}
              </div>
              <div style={{ fontSize: "0.75rem", color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em" }}>Approval Amount</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#fff", marginBottom: "4px" }} data-testid="text-frequency-label">
                {current.paymentFrequency ? current.paymentFrequency.charAt(0).toUpperCase() + current.paymentFrequency.slice(1) : "Weekly"}
              </div>
              <div style={{ fontSize: "0.75rem", color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em" }}>Payment Frequency</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#fff", marginBottom: "4px" }} data-testid="text-factor-rate">{factorRate}</div>
              <div style={{ fontSize: "0.75rem", color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em" }}>Factor Rate</div>
            </div>
          </div>
        </section>

        <div style={{ display: "flex", justifyContent: "center", gap: "28px", flexWrap: "wrap", marginBottom: "32px" }} data-testid="section-features">
          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#9CA3AF", fontSize: "0.875rem" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke={theme.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: "18px", height: "18px", transition: "stroke 0.5s ease" }}>
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
              <polyline points="17 6 23 6 23 12" />
            </svg>
            Pre-Pay Option
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#9CA3AF", fontSize: "0.875rem" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke={theme.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: "18px", height: "18px", transition: "stroke 0.5s ease" }}>
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            {paymentTypeLabel}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#9CA3AF", fontSize: "0.875rem" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke={theme.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: "18px", height: "18px", transition: "stroke 0.5s ease" }}>
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            24-48hr Funding
          </div>
        </div>

        {/* Pagination dots (bottom) - only when multiple */}
        {hasMultiple && (
          <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginBottom: "32px" }} data-testid="section-dots">
            {offers.map((_, idx) => {
              const t = COLOR_THEMES[idx % COLOR_THEMES.length];
              return (
                <button
                  key={idx}
                  onClick={() => setSelectedIndex(idx)}
                  style={{
                    width: idx === selectedIndex ? "32px" : "10px",
                    height: "10px",
                    borderRadius: "5px",
                    background: idx === selectedIndex ? t.accent : "rgba(255,255,255,0.15)",
                    border: "none",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    padding: 0,
                  }}
                  data-testid={`dot-offer-${idx}`}
                />
              );
            })}
          </div>
        )}

        <section style={{
          background: `linear-gradient(135deg, ${theme.accent}dd 0%, ${theme.accent} 100%)`,
          borderRadius: "16px", padding: "36px", textAlign: "center",
          position: "relative", overflow: "hidden",
          transition: "background 0.5s ease",
        }} data-testid="section-cta">
          <div style={{ position: "relative", zIndex: 1 }}>
            <h3 style={{ fontSize: "1.375rem", fontWeight: 800, marginBottom: "6px", color: "#0B1120" }}>Ready to Move Forward?</h3>
            <p style={{ color: "rgba(11, 17, 32, 0.7)", marginBottom: "24px", fontSize: "0.9375rem" }}>No obligation — let's get you funded.</p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
              <a href={SCHEDULING_LINK} style={{
                display: "inline-flex", alignItems: "center", gap: "8px",
                padding: "14px 28px", borderRadius: "9999px", fontWeight: 700,
                fontSize: "0.9375rem", textDecoration: "none", background: "#0B1120", color: "#fff",
                transition: "all 0.3s ease"
              }} data-testid="link-schedule">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: "18px", height: "18px" }}>
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                Schedule a Call
              </a>
              <a href={`tel:+${PHONE_NUMBER.replace(/\D/g, "")}`} style={{
                display: "inline-flex", alignItems: "center", gap: "8px",
                padding: "14px 28px", borderRadius: "9999px", fontWeight: 700,
                fontSize: "0.9375rem", textDecoration: "none",
                background: "rgba(11, 17, 32, 0.15)", color: "#0B1120",
                border: "2px solid rgba(11, 17, 32, 0.2)", transition: "all 0.3s ease"
              }} data-testid="link-call">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: "18px", height: "18px" }}>
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                Call Now
              </a>
            </div>
          </div>
        </section>

        <footer style={{ textAlign: "center", padding: "28px 24px", color: "#6B7280", fontSize: "0.8125rem" }}>
          <p style={{ marginBottom: "4px" }}>Offer valid as of {approvalDateStr}</p>
          <p>Subject to final verification and approval</p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "20px", marginTop: "14px", paddingTop: "14px", borderTop: "1px solid rgba(255, 255, 255, 0.08)", flexWrap: "wrap" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "6px", color: "#9CA3AF", fontSize: "0.8125rem" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke={theme.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: "14px", height: "14px", transition: "stroke 0.5s ease" }}>
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              {PHONE_NUMBER}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "6px", color: "#9CA3AF", fontSize: "0.8125rem" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke={theme.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: "14px", height: "14px", transition: "stroke 0.5s ease" }}>
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
