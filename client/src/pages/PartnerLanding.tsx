import { useEffect } from "react";
import { Link } from "wouter";
import {
  DollarSign,
  Users,
  Zap,
  ShieldCheck,
  TrendingUp,
  Clock,
  CheckCircle,
  ArrowRight,
  Star,
  Briefcase,
  HandshakeIcon,
  BarChart3,
  HeadphonesIcon,
} from "lucide-react";

const NAV_HEIGHT = 72;

const styles: Record<string, React.CSSProperties> = {
  page: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    backgroundColor: "#f5f5f7",
    color: "#1d1d1f",
    lineHeight: 1.6,
  },
  nav: {
    backgroundColor: "#0a0f2c",
    height: NAV_HEIGHT,
    display: "flex",
    alignItems: "center",
    borderBottom: "1px solid #1a2650",
    position: "sticky" as const,
    top: 0,
    zIndex: 100,
  },
  navInner: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "0 24px",
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  navCta: {
    display: "inline-block",
    padding: "10px 24px",
    backgroundColor: "#FFFFFF",
    color: "#0a0f2c",
    fontWeight: 600,
    borderRadius: 50,
    fontSize: 14,
    border: "none",
    cursor: "pointer",
    textDecoration: "none",
  },
  section: (bg: string): React.CSSProperties => ({
    backgroundColor: bg,
    padding: "88px 24px",
  }),
  inner: {
    maxWidth: 1200,
    margin: "0 auto",
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "2px",
    textTransform: "uppercase" as const,
    color: "#1e56a0",
    marginBottom: 12,
  },
  h2: (color = "#1d1d1f"): React.CSSProperties => ({
    fontSize: "clamp(28px, 4vw, 44px)",
    fontWeight: 700,
    color,
    marginBottom: 16,
    letterSpacing: "-1px",
    lineHeight: 1.15,
  }),
  subtext: (color = "#555"): React.CSSProperties => ({
    fontSize: "clamp(16px, 2vw, 19px)",
    color,
    maxWidth: 600,
    lineHeight: 1.65,
  }),
  primaryBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "16px 36px",
    backgroundColor: "#1e56a0",
    color: "#fff",
    fontWeight: 700,
    borderRadius: 50,
    fontSize: 16,
    border: "none",
    cursor: "pointer",
    textDecoration: "none",
  },
  ghostBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "16px 36px",
    backgroundColor: "transparent",
    color: "#FFFFFF",
    fontWeight: 600,
    borderRadius: 50,
    fontSize: 16,
    border: "2px solid rgba(255,255,255,0.4)",
    cursor: "pointer",
    textDecoration: "none",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 32,
    border: "1px solid #e8e8ea",
  },
  stepNumber: {
    width: 48,
    height: 48,
    borderRadius: "50%",
    backgroundColor: "#0a0f2c",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: 18,
    marginBottom: 20,
    flexShrink: 0,
  },
};

const BENEFITS = [
  {
    icon: DollarSign,
    title: "Generous Commissions",
    desc: "Earn competitive commissions on every deal that funds — paid promptly with full transparency on your dashboard.",
  },
  {
    icon: Zap,
    title: "Fast Decisions",
    desc: "Our underwriting moves in 24–48 hours so your clients get answers quickly and you close deals faster.",
  },
  {
    icon: ShieldCheck,
    title: "No Risk to You or Your Clients",
    desc: "Submitting a referral doesn't affect your client's credit or obligate them to anything. Zero pressure.",
  },
  {
    icon: TrendingUp,
    title: "Real-Time Dashboard",
    desc: "Track every referral you've sent — status, funding stage, and commission — all in one place, 24/7.",
  },
  {
    icon: HeadphonesIcon,
    title: "Dedicated Support",
    desc: "You get a direct line to our partner team. We communicate every step of the way so you're never in the dark.",
  },
  {
    icon: BarChart3,
    title: "High Approval Rates",
    desc: "Our broad lender network means we can fund businesses that banks regularly turn away — more wins for your clients.",
  },
];

const STEPS = [
  {
    num: "1",
    title: "Sign Up in Minutes",
    desc: "Create your free partner account and get your unique referral link instantly. No complicated onboarding.",
  },
  {
    num: "2",
    title: "Refer Your Network",
    desc: "Share your link or submit applications directly on behalf of businesses that could use working capital.",
  },
  {
    num: "3",
    title: "We Handle Everything",
    desc: "Our team underwrites, communicates with your referral, and gets the deal done — you don't lift another finger.",
  },
  {
    num: "4",
    title: "Collect Your Commission",
    desc: "When the deal funds, your commission is logged to your dashboard. We pay promptly, every time.",
  },
];

const WHO_ITS_FOR = [
  "Accountants & CPAs",
  "Bookkeepers",
  "Insurance Agents",
  "Business Consultants",
  "Financial Advisors",
  "Commercial Real Estate Brokers",
  "Attorneys",
  "Payroll Professionals",
  "Marketing Agencies",
  "Any professional with a small-business client base",
];

const STATS = [
  { value: "$500M+", label: "Funded to Date" },
  { value: "1,000+", label: "Businesses Served" },
  { value: "24–48hrs", label: "Average Decision Time" },
  { value: "Flexible", label: "Commission Structure" },
];

export default function PartnerLanding() {
  useEffect(() => {
    document.title = "Become a Referral Partner | Today Capital Group";
  }, []);

  return (
    <div style={styles.page}>

      {/* ── Nav ── */}
      <nav style={styles.nav}>
        <div style={styles.navInner}>
          <img
            src="https://cdn.prod.website-files.com/6864b4e14db4a4b6864c7968/686c11dae8ddeadf0fc2ffa7_Group%2017.svg"
            alt="Today Capital Group"
            style={{ height: 38, width: "auto" }}
            data-testid="img-logo"
          />
          <Link href="/partner">
            <span style={styles.navCta} data-testid="button-nav-signup">
              Partner Sign In / Sign Up
            </span>
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{ background: "linear-gradient(140deg, #0a0f2c 0%, #1a2a6c 60%, #1e56a0 100%)", padding: "100px 24px 88px" }}>
        <div style={{ ...styles.inner, textAlign: "center" }}>
          <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: "3px", textTransform: "uppercase", color: "#7eb3f0", marginBottom: 20 }}>
            Referral Partner Program
          </p>
          <h1 style={{ fontSize: "clamp(38px, 6vw, 68px)", fontWeight: 700, color: "#fff", marginBottom: 24, letterSpacing: "-2px", lineHeight: 1.1 }}>
            Turn Your Network Into
            <br />
            <span style={{ fontStyle: "italic", fontWeight: 300 }}>Passive Income</span>
          </h1>
          <p style={{ fontSize: "clamp(17px, 2.5vw, 22px)", color: "#c8d8f0", marginBottom: 48, maxWidth: 680, margin: "0 auto 48px" }}>
            Refer small businesses that need funding. We close the deal. You earn commissions — with no extra work and full visibility every step of the way.
          </p>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/partner">
              <span style={styles.primaryBtn} data-testid="button-hero-signup">
                Become a Partner <ArrowRight size={18} />
              </span>
            </Link>
            <a href="#how-it-works" style={styles.ghostBtn} data-testid="button-hero-learn">
              See How It Works
            </a>
          </div>

          {/* Stats */}
          <div style={{ display: "flex", justifyContent: "center", gap: 48, marginTop: 72, flexWrap: "wrap", borderTop: "1px solid rgba(255,255,255,0.12)", paddingTop: 48 }}>
            {STATS.map((s) => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <span style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 700, color: "#fff", display: "block", marginBottom: 6 }} data-testid={`text-stat-${s.label.replace(/\s+/g, "-").toLowerCase()}`}>
                  {s.value}
                </span>
                <span style={{ fontSize: 13, color: "#9ab8e0", textTransform: "uppercase", letterSpacing: "1.5px" }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" style={styles.section("#fff")}>
        <div style={styles.inner}>
          <div style={{ textAlign: "center", marginBottom: 60 }}>
            <p style={styles.sectionLabel}>The Process</p>
            <h2 style={styles.h2()}>Simple from day one</h2>
            <p style={{ ...styles.subtext(), margin: "0 auto" }}>
              No complicated contracts. No chasing payments. Just a clean, straightforward referral process built around your time.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 24 }}>
            {STEPS.map((step) => (
              <div key={step.num} style={styles.card} data-testid={`card-step-${step.num}`}>
                <div style={styles.stepNumber}>{step.num}</div>
                <h3 style={{ fontSize: 20, fontWeight: 700, color: "#1d1d1f", marginBottom: 10 }}>{step.title}</h3>
                <p style={{ fontSize: 15, color: "#666", lineHeight: 1.65 }}>{step.desc}</p>
              </div>
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: 52 }}>
            <Link href="/partner">
              <span style={styles.primaryBtn} data-testid="button-steps-signup">
                Start Earning — It's Free <ArrowRight size={18} />
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Benefits ── */}
      <section style={styles.section("#f0f4f9")}>
        <div style={styles.inner}>
          <div style={{ marginBottom: 56 }}>
            <p style={styles.sectionLabel}>Why Us</p>
            <h2 style={styles.h2()}>Everything you need to refer with confidence</h2>
            <p style={styles.subtext()}>
              We've built the partner program around what professionals actually care about: transparency, speed, and reliability.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
            {BENEFITS.map((b) => (
              <div key={b.title} style={{ ...styles.card, display: "flex", flexDirection: "column", gap: 14 }} data-testid={`card-benefit-${b.title.replace(/\s+/g, "-").toLowerCase()}`}>
                <div style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: "#e8f0fb", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <b.icon size={22} color="#1e56a0" />
                </div>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: "#1d1d1f", marginBottom: 8 }}>{b.title}</h3>
                  <p style={{ fontSize: 15, color: "#666", lineHeight: 1.65 }}>{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Who It's For ── */}
      <section style={styles.section("#fff")}>
        <div style={{ ...styles.inner, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 64, alignItems: "center" }}>
          <div>
            <p style={styles.sectionLabel}>Who It's For</p>
            <h2 style={styles.h2()}>If you know business owners, you're a fit</h2>
            <p style={{ ...styles.subtext(), marginBottom: 32 }}>
              Our best partners are professionals who already interact with small business owners and want to add a revenue stream without adding more work to their plate.
            </p>
            <Link href="/partner">
              <span style={styles.primaryBtn} data-testid="button-whofor-signup">
                Join the Program <ArrowRight size={18} />
              </span>
            </Link>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {WHO_ITS_FOR.map((item) => (
              <div key={item} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 20px", backgroundColor: "#f5f5f7", borderRadius: 12 }} data-testid={`item-whofor-${item.replace(/[^a-z0-9]/gi, "-").toLowerCase()}`}>
                <CheckCircle size={20} color="#1e56a0" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 16, fontWeight: 500, color: "#1d1d1f" }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Commission Highlight ── */}
      <section style={{ background: "linear-gradient(135deg, #0a0f2c 0%, #1a2650 100%)", padding: "88px 24px" }}>
        <div style={{ ...styles.inner, textAlign: "center" }}>
          <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: "3px", textTransform: "uppercase", color: "#7eb3f0", marginBottom: 20 }}>
            Earnings
          </p>
          <h2 style={{ ...styles.h2("#fff"), maxWidth: 700, margin: "0 auto 20px" }}>
            Real commissions on real deals
          </h2>
          <p style={{ fontSize: "clamp(17px, 2vw, 20px)", color: "#c8d8f0", maxWidth: 620, margin: "0 auto 56px", lineHeight: 1.65 }}>
            When a business you refer gets funded, you earn a commission based on the funded amount. We offer competitive rates, paid promptly — no surprises, no delays.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20, maxWidth: 900, margin: "0 auto 52px" }}>
            {[
              { icon: TrendingUp, label: "Competitive Rates", desc: "Among the highest in the industry for referral commissions" },
              { icon: Clock, label: "Prompt Payment", desc: "Commissions issued as soon as deals fund — no waiting games" },
              { icon: BarChart3, label: "Full Transparency", desc: "See every deal's status and projected earnings in your dashboard" },
              { icon: Star, label: "No Cap", desc: "Refer as many businesses as you like. Your earning potential is unlimited" },
            ].map((item) => (
              <div key={item.label} style={{ backgroundColor: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 16, padding: 28, textAlign: "left" }} data-testid={`card-commission-${item.label.replace(/\s+/g, "-").toLowerCase()}`}>
                <item.icon size={22} color="#7eb3f0" style={{ marginBottom: 14 }} />
                <p style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 8 }}>{item.label}</p>
                <p style={{ fontSize: 14, color: "#9ab8e0", lineHeight: 1.6 }}>{item.desc}</p>
              </div>
            ))}
          </div>
          <Link href="/partner">
            <span style={{ ...styles.primaryBtn, backgroundColor: "#fff", color: "#0a0f2c" }} data-testid="button-commission-signup">
              Sign Up and Start Earning <ArrowRight size={18} />
            </span>
          </Link>
        </div>
      </section>

      {/* ── Looking for Funding Yourself? ── */}
      <section style={{ backgroundColor: "#f0f4f9", padding: "72px 24px" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <div style={{ backgroundColor: "#fff", borderRadius: 20, padding: "52px 48px", border: "1px solid #dde6f0", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 20 }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", backgroundColor: "#e8f0fb", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Briefcase size={26} color="#1e56a0" />
            </div>
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: "#1e56a0", marginBottom: 10 }}>
                Not Here to Refer — Here to Fund?
              </p>
              <h3 style={{ fontSize: "clamp(22px, 3vw, 32px)", fontWeight: 700, color: "#1d1d1f", marginBottom: 14, letterSpacing: "-0.5px" }}>
                Is your own business looking for capital?
              </h3>
              <p style={{ fontSize: 17, color: "#555", lineHeight: 1.65, maxWidth: 560, margin: "0 auto" }}>
                We fund businesses directly too. If you need working capital for your own company, check if you qualify — no obligation, no hard credit pull to apply.
              </p>
            </div>
            <Link href="/intake">
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "14px 32px", backgroundColor: "#f0f4f9", color: "#0a0f2c", fontWeight: 700, borderRadius: 50, fontSize: 15, border: "1px solid #dde6f0", cursor: "pointer", textDecoration: "none" }} data-testid="button-funding-self">
                Check If I Qualify for Funding <ArrowRight size={16} />
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section style={{ background: "linear-gradient(140deg, #0a0f2c 0%, #1a2a6c 100%)", padding: "96px 24px" }}>
        <div style={{ ...styles.inner, textAlign: "center" }}>
          <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: "3px", textTransform: "uppercase", color: "#7eb3f0", marginBottom: 20 }}>
            Ready to Get Started?
          </p>
          <h2 style={{ ...styles.h2("#fff"), maxWidth: 660, margin: "0 auto 20px" }}>
            Join our partner network today
          </h2>
          <p style={{ fontSize: "clamp(16px, 2vw, 19px)", color: "#c8d8f0", maxWidth: 560, margin: "0 auto 48px", lineHeight: 1.65 }}>
            Sign up in minutes. Refer your first business. Start earning — with full support from our team at every step.
          </p>
          <Link href="/partner">
            <span style={{ ...styles.primaryBtn, fontSize: 18, padding: "18px 48px" }} data-testid="button-final-signup">
              Create Your Free Partner Account <ArrowRight size={20} />
            </span>
          </Link>
          <p style={{ marginTop: 20, fontSize: 14, color: "#6a88a8" }}>
            No fees. No minimum referrals. Cancel anytime.
          </p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ backgroundColor: "#060a1c", padding: "36px 24px", borderTop: "1px solid #1a2650" }}>
        <div style={{ ...styles.inner, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <img
            src="https://cdn.prod.website-files.com/6864b4e14db4a4b6864c7968/686c11dae8ddeadf0fc2ffa7_Group%2017.svg"
            alt="Today Capital Group"
            style={{ height: 30, width: "auto", opacity: 0.8 }}
          />
          <p style={{ fontSize: 13, color: "#4a5a7a", margin: 0 }}>
            &copy; {new Date().getFullYear()} Today Capital Group. All rights reserved.
          </p>
          <Link href="/partner">
            <span style={{ fontSize: 13, color: "#7eb3f0", textDecoration: "none", cursor: "pointer" }} data-testid="link-footer-signin">
              Partner Sign In
            </span>
          </Link>
        </div>
      </footer>

    </div>
  );
}
