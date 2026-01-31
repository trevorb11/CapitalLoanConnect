import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";

interface OfferData {
  advanceAmount: number;
  term: string;
  paymentFrequency: string;
  factorRate: string;
  totalPayback: number;
  netAfterFees: number;
  lender: string;
  approvalDate?: string;
  notes?: string;
}

interface ApprovalData {
  businessName: string;
  advanceAmount: number;
  term: string;
  paymentFrequency: string;
  factorRate: string;
  totalPayback: number;
  netAfterFees: number;
  lender: string;
  approvalDate: string;
  notes: string;
  offers?: OfferData[];
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatCurrencyWithCents = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
};

const calculatePaymentAmount = (totalPayback: number, term: string, frequency: string) => {
  const months = parseInt(term) || 12;
  let totalPayments = months;
  
  if (frequency === "weekly") totalPayments = months * 4;
  else if (frequency === "daily") totalPayments = months * 22;
  else if (frequency === "biweekly") totalPayments = months * 2;
  
  return formatCurrency(totalPayback / totalPayments);
};

const getFrequencyLabel = (frequency: string) => {
  switch (frequency) {
    case "weekly": return "per week";
    case "daily": return "per day";
    case "biweekly": return "every 2 weeks";
    case "monthly": return "per month";
    default: return "per payment";
  }
};

const getPaymentTypeLabel = (frequency: string) => {
  switch (frequency) {
    case "weekly": return "Weekly Payments";
    case "daily": return "Daily Payments";
    case "biweekly": return "Bi-Weekly Payments";
    case "monthly": return "Monthly Payments";
    default: return "Flexible Payments";
  }
};

const calculateTotalFees = (advance: number, net: number) => {
  return formatCurrencyWithCents(advance - net);
};

const colorSchemes = [
  { primary: "#14B8A6", secondary: "rgba(20, 184, 166, 0.25)", accent: "#2DD4BF", gradient: "linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)" }, // Teal
  { primary: "#8B5CF6", secondary: "rgba(139, 92, 246, 0.25)", accent: "#A78BFA", gradient: "linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)" }, // Purple
  { primary: "#F59E0B", secondary: "rgba(245, 158, 11, 0.25)", accent: "#FBBF24", gradient: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)" }, // Amber
  { primary: "#3B82F6", secondary: "rgba(59, 130, 246, 0.25)", accent: "#60A5FA", gradient: "linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)" }, // Blue
  { primary: "#EC4899", secondary: "rgba(236, 72, 153, 0.25)", accent: "#F472B6", gradient: "linear-gradient(135deg, #EC4899 0%, #DB2777 100%)" }, // Pink
];

const SCHEDULING_LINK = "https://bit.ly/3Zxj0Kq";
const PHONE_NUMBER = "(818) 351-0225";
const EMAIL_ADDRESS = "admin@todaycapitalgroup.com";

export default function ApprovalLetter() {
  const { slug } = useParams<{ slug: string }>();
  const [currentOfferIndex, setCurrentOfferIndex] = useState(0);

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

  const rawOffers: OfferData[] = approval.offers && approval.offers.length > 0 
    ? approval.offers 
    : [{
        advanceAmount: approval.advanceAmount,
        term: approval.term,
        paymentFrequency: approval.paymentFrequency,
        factorRate: approval.factorRate,
        totalPayback: approval.totalPayback,
        netAfterFees: approval.netAfterFees,
        lender: approval.lender,
        approvalDate: approval.approvalDate,
        notes: approval.notes,
      }];
  
  const offers = rawOffers.filter(o => o.advanceAmount || o.lender);
  
  if (offers.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: "#0B1120", fontFamily: "'Inter', sans-serif", color: "#fff" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "1rem" }}>No Offers Available</h1>
        <p style={{ color: "#9CA3AF" }}>There are no visible offers for this approval at this time.</p>
      </div>
    );
  }

  const totalOffers = offers.length;
  const hasMultipleOffers = totalOffers > 1;
  const safeCurrentIndex = Math.min(currentOfferIndex, totalOffers - 1);
  const currentOffer = offers[safeCurrentIndex];
  const colorScheme = colorSchemes[safeCurrentIndex % colorSchemes.length];

  const handlePrevOffer = () => {
    setCurrentOfferIndex((prev) => (prev > 0 ? prev - 1 : totalOffers - 1));
  };

  const handleNextOffer = () => {
    setCurrentOfferIndex((prev) => (prev < totalOffers - 1 ? prev + 1 : 0));
  };

  const advanceAmount = formatCurrency(currentOffer.advanceAmount);
  const netAfterFees = formatCurrency(currentOffer.netAfterFees);
  const totalPayback = formatCurrency(currentOffer.totalPayback);
  const paymentAmount = calculatePaymentAmount(currentOffer.totalPayback, currentOffer.term, currentOffer.paymentFrequency);
  const frequencyLabel = getFrequencyLabel(currentOffer.paymentFrequency);
  const paymentTypeLabel = getPaymentTypeLabel(currentOffer.paymentFrequency);
  const totalFees = calculateTotalFees(currentOffer.advanceAmount, currentOffer.netAfterFees);
  const businessName = approval.businessName || "Valued Customer";
  const term = currentOffer.term || "12 mo";
  const factorRate = currentOffer.factorRate || "1.25";
  const lender = currentOffer.lender || "Standard Program";
  const approvalDateStr = currentOffer.approvalDate ? format(new Date(currentOffer.approvalDate), "MMMM d, yyyy") : format(new Date(), "MMMM d, yyyy");

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", background: "#0B1120", color: "#fff", lineHeight: 1.6, minHeight: "100vh" }}>
      <div style={{ 
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0, 
        background: `radial-gradient(ellipse 80% 50% at 50% -20%, ${colorScheme.secondary} 0%, transparent 50%), radial-gradient(ellipse 60% 40% at 100% 100%, ${colorScheme.secondary.replace('0.25', '0.08')} 0%, transparent 50%)`,
        pointerEvents: "none", zIndex: 0,
        transition: "background 0.5s ease"
      }} />

      <header style={{ position: "relative", zIndex: 10, padding: "20px 24px", borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "40px", height: "40px", background: colorScheme.primary, borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.5s ease" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#0B1120" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "24px", height: "24px" }}>
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                <polyline points="17 6 23 6 23 12" />
              </svg>
            </div>
            <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#fff" }}>Today Capital <span style={{ color: colorScheme.primary, transition: "color 0.5s ease" }}>Group</span></div>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "48px 24px", position: "relative", zIndex: 1 }}>
        <section style={{ textAlign: "center", marginBottom: "48px", maxWidth: "600px", margin: "0 auto 48px" }} data-testid="section-hero">
          <div style={{ 
            display: "inline-flex", alignItems: "center", gap: "8px",
            background: colorScheme.secondary, border: `1px solid ${colorScheme.secondary.replace('0.25', '0.3')}`,
            color: colorScheme.accent, padding: "10px 20px", borderRadius: "9999px",
            fontSize: "0.875rem", fontWeight: 600, marginBottom: "32px",
            transition: "all 0.5s ease"
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "18px", height: "18px" }}>
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            {hasMultipleOffers ? `${totalOffers} Offers Available` : "Approved"}
          </div>

          <p style={{ fontSize: "1.125rem", color: "#9CA3AF", marginBottom: "8px" }}>Congratulations,</p>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 600, color: "#fff", marginBottom: "32px" }} data-testid="text-business-name">{businessName}</h1>

          <h2 style={{ fontSize: "2rem", fontWeight: 800, lineHeight: 1.2, marginBottom: "16px" }}>
            {hasMultipleOffers ? "Your Funding Options" : "You've Been Approved For Up To"}
          </h2>

          <div style={{ margin: "32px 0" }}>
            <div style={{ fontSize: "4.5rem", fontWeight: 800, color: colorScheme.primary, letterSpacing: "-0.03em", lineHeight: 1, textShadow: `0 0 60px ${colorScheme.secondary}`, transition: "color 0.5s ease" }} data-testid="text-advance-amount">
              {advanceAmount}
            </div>
            <p style={{ marginTop: "12px", fontSize: "1.125rem", color: "#9CA3AF" }}>
              <strong style={{ color: "#fff", fontWeight: 600 }} data-testid="text-net-amount">{netAfterFees}</strong> net after fees
            </p>
          </div>
        </section>

        {hasMultipleOffers && (
          <div style={{ textAlign: "center", marginBottom: "24px" }}>
            <span style={{ 
              display: "inline-block", 
              padding: "6px 16px", 
              borderRadius: "9999px", 
              background: colorScheme.secondary,
              color: colorScheme.accent,
              fontSize: "0.75rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              transition: "all 0.5s ease"
            }} data-testid="text-offer-indicator">
              Offer {safeCurrentIndex + 1} of {totalOffers}
            </span>
          </div>
        )}

        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center",
          gap: "100px", 
          marginBottom: "24px",
          width: "100%",
          position: "relative"
        }} data-testid="section-offer-container">
          {hasMultipleOffers && (
            <button 
              onClick={handlePrevOffer}
              style={{ 
                width: "48px", height: "48px", borderRadius: "50%", 
                background: "rgba(255, 255, 255, 0.1)", border: "1px solid rgba(255, 255, 255, 0.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", color: "#fff", transition: "all 0.3s ease",
                flexShrink: 0,
                position: "absolute",
                left: "-80px"
              }}
              data-testid="button-prev-offer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          
          <div style={{ width: "100%", maxWidth: "600px" }}>
            <section style={{ 
              background: "#111827", border: `1px solid ${colorScheme.secondary.replace('0.25', '0.15')}`,
              borderRadius: "16px", padding: "32px", width: "100%",
              transition: "border-color 0.5s ease"
            }} data-testid="section-offer">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "32px" }}>
                <span style={{ fontSize: "0.8125rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "#6B7280" }}>Your Offer</span>
                <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: colorScheme.primary, transition: "color 0.5s ease" }} data-testid="text-lender">{lender}</span>
              </div>

              <div style={{ textAlign: "center", paddingBottom: "32px", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", marginBottom: "28px" }}>
                <div style={{ fontSize: "3.5rem", fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", lineHeight: 1 }} data-testid="text-payment-amount">
                  {paymentAmount}
                </div>
                <div style={{ marginTop: "8px", fontSize: "0.9375rem", color: colorScheme.primary, fontWeight: 600, transition: "color 0.5s ease" }} data-testid="text-frequency-label">{frequencyLabel}</div>
              </div>

              <div style={{ display: "flex", justifyContent: "center", gap: "48px" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#fff", marginBottom: "4px" }} data-testid="text-term">{term}</div>
                  <div style={{ fontSize: "0.75rem", color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em" }}>Term</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#fff", marginBottom: "4px" }} data-testid="text-factor-rate">{factorRate}</div>
                  <div style={{ fontSize: "0.75rem", color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em" }}>Factor Rate</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#fff", marginBottom: "4px" }} data-testid="text-total-payback">{totalPayback}</div>
                  <div style={{ fontSize: "0.75rem", color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em" }}>Total Payback</div>
                </div>
              </div>
            </section>
          </div>
          
          {hasMultipleOffers && (
            <button 
              onClick={handleNextOffer}
              style={{ 
                width: "48px", height: "48px", borderRadius: "50%", 
                background: "rgba(255, 255, 255, 0.1)", border: "1px solid rgba(255, 255, 255, 0.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", color: "#fff", transition: "all 0.3s ease",
                flexShrink: 0,
                position: "absolute",
                right: "-80px"
              }}
              data-testid="button-next-offer"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>
        
        {hasMultipleOffers && (
          <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginBottom: "24px" }} data-testid="section-pagination">
            {offers.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentOfferIndex(idx)}
                style={{
                  width: idx === safeCurrentIndex ? "24px" : "8px",
                  height: "8px",
                  borderRadius: "4px",
                  background: idx === safeCurrentIndex ? colorScheme.primary : "rgba(255, 255, 255, 0.3)",
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.3s ease"
                }}
                data-testid={`button-offer-dot-${idx}`}
              />
            ))}
          </div>
        )}

        <div style={{ maxWidth: "600px", margin: "0 auto" }}>
          <div style={{ 
            background: "#111827", border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "16px", padding: "28px", marginBottom: "24px"
          }} data-testid="section-breakdown">
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
              <div style={{ width: "36px", height: "36px", background: colorScheme.secondary, borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.5s ease" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke={colorScheme.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: "18px", height: "18px", transition: "stroke 0.5s ease" }}>
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                  <line x1="2" y1="10" x2="22" y2="10" />
                </svg>
              </div>
              <h3 style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#fff" }}>Funding Breakdown</h3>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
              <span style={{ color: "#9CA3AF", fontSize: "0.875rem" }}>Advance Amount</span>
              <span style={{ fontWeight: 600, fontSize: "0.875rem", color: colorScheme.primary, transition: "color 0.5s ease" }}>+ {formatCurrencyWithCents(currentOffer.advanceAmount)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
              <span style={{ color: "#9CA3AF", fontSize: "0.875rem" }}>Origination and Application Fees</span>
              <span style={{ fontWeight: 600, fontSize: "0.875rem", color: "#6B7280" }}>- {totalFees}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 0 12px", marginTop: "4px", borderTop: "2px solid #374151" }}>
              <span style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#fff" }}>You Receive</span>
              <span style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#fff" }}>{formatCurrencyWithCents(currentOffer.netAfterFees)}</span>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "center", gap: "28px", flexWrap: "wrap", marginBottom: "32px" }} data-testid="section-features">
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#9CA3AF", fontSize: "0.875rem" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke={colorScheme.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: "18px", height: "18px", transition: "stroke 0.5s ease" }}>
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                <polyline points="17 6 23 6 23 12" />
              </svg>
              Pre-Pay Option
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#9CA3AF", fontSize: "0.875rem" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke={colorScheme.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: "18px", height: "18px", transition: "stroke 0.5s ease" }}>
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              {paymentTypeLabel}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#9CA3AF", fontSize: "0.875rem" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke={colorScheme.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: "18px", height: "18px", transition: "stroke 0.5s ease" }}>
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              24-48hr Funding
            </div>
          </div>

          <section style={{ 
            background: colorScheme.gradient,
            borderRadius: "16px", padding: "36px", textAlign: "center",
            position: "relative", overflow: "hidden",
            transition: "background 0.5s ease"
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
                <svg viewBox="0 0 24 24" fill="none" stroke={colorScheme.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: "14px", height: "14px", transition: "stroke 0.5s ease" }}>
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                {PHONE_NUMBER}
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "6px", color: "#9CA3AF", fontSize: "0.8125rem" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke={colorScheme.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: "14px", height: "14px", transition: "stroke 0.5s ease" }}>
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                {EMAIL_ADDRESS}
              </span>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
