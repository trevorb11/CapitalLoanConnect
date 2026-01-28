import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

interface ApprovalData {
  businessName: string | null;
  advanceAmount: string | null;
  term: string | null;
  factorRate: string | null;
  totalPayback: string | null;
  netAfterFees: string | null;
  lender: string | null;
  approvalDate: string | null;
  notes: string | null;
}

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

function formatCurrencyWithCents(value: string | null | undefined): string {
  if (!value) return "$0.00";
  const num = parseFloat(value);
  if (isNaN(num)) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

function calculateWeeklyPayment(totalPayback: string | null, term: string | null): string {
  if (!totalPayback || !term) return "$0";
  const total = parseFloat(totalPayback);
  if (isNaN(total)) return "$0";
  const termMonths = parseInt(term.match(/\d+/)?.[0] || "12");
  const weeks = termMonths * 4.33;
  const weekly = total / weeks;
  return formatCurrency(weekly.toString());
}

function calculateTotalFees(advanceAmount: string | null, netAfterFees: string | null): string {
  if (!advanceAmount || !netAfterFees) return "$0.00";
  const advance = parseFloat(advanceAmount);
  const net = parseFloat(netAfterFees);
  if (isNaN(advance) || isNaN(net)) return "$0.00";
  return formatCurrencyWithCents((advance - net).toString());
}

const SCHEDULING_LINK = "https://bit.ly/3Zxj0Kq";
const PHONE_NUMBER = "1-800-555-FUND";

export default function ApprovalLetter() {
  const { slug } = useParams<{ slug: string }>();

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

  const advanceAmount = formatCurrency(approval.advanceAmount);
  const netAfterFees = formatCurrency(approval.netAfterFees);
  const totalPayback = formatCurrency(approval.totalPayback);
  const weeklyPayment = calculateWeeklyPayment(approval.totalPayback, approval.term);
  const totalFees = calculateTotalFees(approval.advanceAmount, approval.netAfterFees);
  const businessName = approval.businessName || "Valued Customer";
  const term = approval.term || "12 mo";
  const factorRate = approval.factorRate || "1.25";
  const lender = approval.lender || "Standard Program";
  const approvalDateStr = approval.approvalDate ? format(new Date(approval.approvalDate), "MMMM d, yyyy") : format(new Date(), "MMMM d, yyyy");

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", background: "#0B1120", color: "#fff", lineHeight: 1.6, minHeight: "100vh" }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      
      <div style={{ 
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0, 
        background: "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(20, 184, 166, 0.15) 0%, transparent 50%), radial-gradient(ellipse 60% 40% at 100% 100%, rgba(20, 184, 166, 0.08) 0%, transparent 50%)",
        pointerEvents: "none", zIndex: 0 
      }} />

      <header style={{ position: "relative", zIndex: 10, padding: "20px 24px", borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "40px", height: "40px", background: "#14B8A6", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#0B1120" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "24px", height: "24px" }}>
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                <polyline points="17 6 23 6 23 12" />
              </svg>
            </div>
            <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#fff" }}>Today Capital <span style={{ color: "#14B8A6" }}>Group</span></div>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: "600px", margin: "0 auto", padding: "48px 24px", position: "relative", zIndex: 1 }}>
        <section style={{ textAlign: "center", marginBottom: "48px" }} data-testid="section-hero">
          <div style={{ 
            display: "inline-flex", alignItems: "center", gap: "8px",
            background: "rgba(20, 184, 166, 0.25)", border: "1px solid rgba(20, 184, 166, 0.3)",
            color: "#2DD4BF", padding: "10px 20px", borderRadius: "9999px",
            fontSize: "0.875rem", fontWeight: 600, marginBottom: "32px"
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
            You've Been Approved For Up To
          </h2>

          <div style={{ margin: "32px 0" }}>
            <div style={{ fontSize: "4.5rem", fontWeight: 800, color: "#14B8A6", letterSpacing: "-0.03em", lineHeight: 1, textShadow: "0 0 60px rgba(20, 184, 166, 0.25)" }} data-testid="text-advance-amount">
              {advanceAmount}
            </div>
            <p style={{ marginTop: "12px", fontSize: "1.125rem", color: "#9CA3AF" }}>
              <strong style={{ color: "#fff", fontWeight: 600 }} data-testid="text-net-amount">{netAfterFees}</strong> net after fees
            </p>
          </div>
        </section>

        <section style={{ 
          background: "#111827", border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "16px", padding: "32px", marginBottom: "24px"
        }} data-testid="section-offer">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "32px" }}>
            <span style={{ fontSize: "0.8125rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "#6B7280" }}>Your Offer</span>
            <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#14B8A6" }} data-testid="text-lender">{lender}</span>
          </div>

          <div style={{ textAlign: "center", paddingBottom: "32px", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", marginBottom: "28px" }}>
            <div style={{ fontSize: "3.5rem", fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", lineHeight: 1 }} data-testid="text-weekly-payment">
              {weeklyPayment}
            </div>
            <div style={{ marginTop: "8px", fontSize: "0.9375rem", color: "#14B8A6", fontWeight: 600 }}>per week</div>
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

        <div style={{ 
          background: "#111827", border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "16px", padding: "28px", marginBottom: "24px"
        }} data-testid="section-breakdown">
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
            <div style={{ width: "36px", height: "36px", background: "rgba(20, 184, 166, 0.25)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#14B8A6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: "18px", height: "18px" }}>
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
              </svg>
            </div>
            <h3 style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#fff" }}>Funding Breakdown</h3>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
            <span style={{ color: "#9CA3AF", fontSize: "0.875rem" }}>Advance Amount</span>
            <span style={{ fontWeight: 600, fontSize: "0.875rem", color: "#14B8A6" }}>+ {formatCurrencyWithCents(approval.advanceAmount)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
            <span style={{ color: "#9CA3AF", fontSize: "0.875rem" }}>Origination and Application Fees</span>
            <span style={{ fontWeight: 600, fontSize: "0.875rem", color: "#6B7280" }}>- {totalFees}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 0 12px", marginTop: "4px", borderTop: "2px solid #374151" }}>
            <span style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#fff" }}>You Receive</span>
            <span style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#fff" }}>{formatCurrencyWithCents(approval.netAfterFees)}</span>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "center", gap: "28px", flexWrap: "wrap", marginBottom: "32px" }} data-testid="section-features">
          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#9CA3AF", fontSize: "0.875rem" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#14B8A6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: "18px", height: "18px" }}>
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
              <polyline points="17 6 23 6 23 12" />
            </svg>
            Pre-Pay Option
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#9CA3AF", fontSize: "0.875rem" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#14B8A6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: "18px", height: "18px" }}>
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            Weekly Payments
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#9CA3AF", fontSize: "0.875rem" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#14B8A6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: "18px", height: "18px" }}>
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            24-48hr Funding
          </div>
        </div>

        <section style={{ 
          background: "linear-gradient(135deg, #0D9488 0%, #14B8A6 100%)",
          borderRadius: "16px", padding: "36px", textAlign: "center",
          position: "relative", overflow: "hidden"
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
              <svg viewBox="0 0 24 24" fill="none" stroke="#14B8A6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: "14px", height: "14px" }}>
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              {PHONE_NUMBER}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "6px", color: "#9CA3AF", fontSize: "0.8125rem" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#14B8A6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: "14px", height: "14px" }}>
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              info@todaycapitalgroup.com
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}
