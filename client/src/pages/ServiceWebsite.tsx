import { useState, useEffect, useRef } from "react";

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Manrope:wght@300;400;500;600;700;800;900&display=swap');

  .wb * { box-sizing: border-box; margin: 0; padding: 0; }

  .wb {
    font-family: 'Manrope', sans-serif;
    background: #040810;
    color: #dde1ea;
    min-height: 100vh;
    overflow-x: hidden;
  }

  /* ── NAVBAR ── */
  .wb-nav {
    position: sticky; top: 0; z-index: 100;
    background: rgba(4,8,16,0.85);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid rgba(255,255,255,0.06);
    padding: 14px 32px;
    display: flex; align-items: center; justify-content: space-between;
  }
  .wb-nav-logo { display: flex; align-items: center; gap: 10px; text-decoration: none; }
  .wb-nav-mark {
    width: 34px; height: 34px;
    background: linear-gradient(135deg, #06b6d4, #0e7490);
    border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    font-weight: 800; font-size: 13px; color: #040810;
  }
  .wb-nav-name { font-weight: 700; font-size: 14px; color: #dde1ea; }
  .wb-nav-sub { font-size: 10px; color: #06b6d4; text-transform: uppercase; letter-spacing: 0.1em; }
  .wb-nav-cta {
    padding: 9px 22px;
    background: linear-gradient(135deg, #06b6d4, #0891b2);
    border: none; border-radius: 8px;
    color: #fff; font-family: 'Manrope', sans-serif; font-weight: 700; font-size: 13px;
    cursor: pointer; transition: opacity 0.2s;
    text-decoration: none; display: inline-block;
  }
  .wb-nav-cta:hover { opacity: 0.85; }

  /* ── HERO ── */
  .wb-hero {
    position: relative;
    padding: 96px 24px 80px;
    text-align: center;
    overflow: hidden;
  }
  .wb-hero-glow {
    position: absolute; top: -120px; left: 50%; transform: translateX(-50%);
    width: 900px; height: 600px;
    background: radial-gradient(ellipse at center, rgba(6,182,212,0.12) 0%, transparent 65%);
    pointer-events: none;
  }
  .wb-hero-grid {
    position: absolute; inset: 0;
    background-image: linear-gradient(rgba(6,182,212,0.04) 1px, transparent 1px),
                      linear-gradient(90deg, rgba(6,182,212,0.04) 1px, transparent 1px);
    background-size: 50px 50px;
    mask-image: radial-gradient(ellipse at center, black 30%, transparent 75%);
    pointer-events: none;
  }
  .wb-badge {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 6px 14px;
    background: rgba(6,182,212,0.08);
    border: 1px solid rgba(6,182,212,0.25);
    border-radius: 100px;
    font-family: 'Space Mono', monospace; font-size: 11px; color: #22d3ee;
    margin-bottom: 24px;
    position: relative;
  }
  .wb-badge-dot {
    width: 6px; height: 6px; background: #22d3ee; border-radius: 50%;
    animation: pulse 2s infinite;
  }
  @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.3; } }

  .wb-hero h1 {
    font-size: clamp(38px, 5.5vw, 72px);
    font-weight: 900;
    line-height: 1.05;
    letter-spacing: -0.035em;
    margin-bottom: 24px;
    position: relative;
  }
  .wb-hero h1 .accent {
    background: linear-gradient(135deg, #22d3ee, #06b6d4, #0891b2);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .wb-hero-sub {
    font-size: 18px; color: #7a8699; line-height: 1.75;
    max-width: 580px; margin: 0 auto 40px;
    position: relative;
  }
  .wb-hero-actions {
    display: flex; align-items: center; justify-content: center; gap: 14px;
    flex-wrap: wrap; position: relative;
  }
  .wb-btn-primary {
    padding: 16px 36px;
    background: linear-gradient(135deg, #06b6d4, #0891b2);
    border: none; border-radius: 10px;
    color: #fff; font-family: 'Manrope', sans-serif; font-weight: 700; font-size: 15px;
    cursor: pointer; transition: opacity 0.2s, transform 0.15s;
  }
  .wb-btn-primary:hover { opacity: 0.88; transform: translateY(-2px); }
  .wb-btn-ghost {
    padding: 15px 28px;
    background: transparent;
    border: 1px solid rgba(255,255,255,0.12); border-radius: 10px;
    color: #b0b8c8; font-family: 'Manrope', sans-serif; font-weight: 600; font-size: 15px;
    cursor: pointer; transition: border-color 0.2s, color 0.2s;
  }
  .wb-btn-ghost:hover { border-color: rgba(6,182,212,0.4); color: #22d3ee; }

  /* ── STATS BAR ── */
  .wb-stats {
    border-top: 1px solid rgba(255,255,255,0.06);
    border-bottom: 1px solid rgba(255,255,255,0.06);
    background: rgba(255,255,255,0.02);
    padding: 32px 24px;
  }
  .wb-stats-inner {
    max-width: 900px; margin: 0 auto;
    display: grid; grid-template-columns: repeat(4, 1fr);
    gap: 24px;
  }
  .wb-stat {
    text-align: center;
    padding: 0 16px;
  }
  .wb-stat + .wb-stat {
    border-left: 1px solid rgba(255,255,255,0.07);
  }
  .wb-stat-num {
    font-size: 32px; font-weight: 900; color: #22d3ee;
    letter-spacing: -0.03em; line-height: 1;
    margin-bottom: 4px;
  }
  .wb-stat-label { font-size: 13px; color: #5a6a80; font-weight: 500; }

  /* ── SECTION WRAPPER ── */
  .wb-section { max-width: 1060px; margin: 0 auto; padding: 80px 24px; }
  .wb-section-sm { max-width: 760px; margin: 0 auto; padding: 80px 24px; }
  .wb-label {
    font-family: 'Space Mono', monospace; font-size: 11px;
    color: #06b6d4; text-transform: uppercase; letter-spacing: 0.12em;
    margin-bottom: 10px;
  }
  .wb-section-title {
    font-size: clamp(26px, 3vw, 38px); font-weight: 800;
    letter-spacing: -0.02em; line-height: 1.15;
    margin-bottom: 14px;
  }
  .wb-section-sub { font-size: 16px; color: #5a6a80; line-height: 1.7; margin-bottom: 48px; }

  /* ── FEATURES GRID ── */
  .wb-features {
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;
  }
  .wb-feature {
    background: rgba(255,255,255,0.025);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 14px;
    padding: 28px 24px;
    transition: border-color 0.2s, background 0.2s;
  }
  .wb-feature:hover {
    border-color: rgba(6,182,212,0.25);
    background: rgba(6,182,212,0.04);
  }
  .wb-feature-icon {
    width: 44px; height: 44px;
    background: rgba(6,182,212,0.1);
    border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 16px;
    font-size: 20px;
  }
  .wb-feature h3 { font-size: 16px; font-weight: 700; margin-bottom: 8px; }
  .wb-feature p { font-size: 13px; color: #5a6a80; line-height: 1.6; }

  /* ── HOW IT WORKS ── */
  .wb-timeline { display: flex; flex-direction: column; gap: 0; }
  .wb-tl-item {
    display: flex; gap: 24px; position: relative; padding-bottom: 40px;
  }
  .wb-tl-item:last-child { padding-bottom: 0; }
  .wb-tl-left { display: flex; flex-direction: column; align-items: center; flex-shrink: 0; }
  .wb-tl-num {
    width: 44px; height: 44px;
    background: rgba(6,182,212,0.1);
    border: 2px solid rgba(6,182,212,0.3);
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-family: 'Space Mono', monospace; font-size: 13px; color: #22d3ee; font-weight: 700;
    flex-shrink: 0;
  }
  .wb-tl-line {
    width: 1px; flex: 1; margin-top: 6px;
    background: linear-gradient(180deg, rgba(6,182,212,0.25), rgba(6,182,212,0.04));
    min-height: 32px;
  }
  .wb-tl-item:last-child .wb-tl-line { display: none; }
  .wb-tl-content { padding-top: 10px; }
  .wb-tl-tag {
    font-family: 'Space Mono', monospace; font-size: 10px; color: #06b6d4;
    text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 6px;
  }
  .wb-tl-content h3 { font-size: 18px; font-weight: 700; margin-bottom: 6px; }
  .wb-tl-content p { font-size: 14px; color: #5a6a80; line-height: 1.65; }

  /* ── INCLUDED LIST ── */
  .wb-inc-grid {
    display: grid; grid-template-columns: 1fr 1fr; gap: 10px;
  }
  .wb-inc-item {
    display: flex; align-items: center; gap: 10px;
    padding: 14px 18px;
    background: rgba(255,255,255,0.025);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 10px;
    font-size: 14px; font-weight: 500; color: #c0c8d8;
  }
  .wb-inc-check {
    width: 22px; height: 22px; flex-shrink: 0;
    background: rgba(6,182,212,0.12);
    border-radius: 6px;
    display: flex; align-items: center; justify-content: center;
    color: #22d3ee; font-size: 12px; font-weight: 800;
  }

  /* ── PRICING ── */
  .wb-pricing { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
  .wb-plan {
    background: rgba(255,255,255,0.025);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 16px; padding: 32px 28px;
    display: flex; flex-direction: column;
  }
  .wb-plan.featured {
    background: rgba(6,182,212,0.06);
    border-color: rgba(6,182,212,0.35);
    position: relative;
  }
  .wb-plan-badge {
    position: absolute; top: -13px; left: 50%; transform: translateX(-50%);
    background: linear-gradient(135deg, #06b6d4, #0891b2);
    border-radius: 100px; padding: 4px 16px;
    font-size: 11px; font-weight: 700; color: #fff; white-space: nowrap;
    font-family: 'Space Mono', monospace; text-transform: uppercase; letter-spacing: 0.08em;
  }
  .wb-plan-name { font-size: 13px; font-weight: 700; color: #06b6d4; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 10px; }
  .wb-plan-price {
    font-size: 36px; font-weight: 900; letter-spacing: -0.03em; margin-bottom: 4px;
  }
  .wb-plan-per { font-size: 13px; color: #5a6a80; margin-bottom: 20px; }
  .wb-plan-desc { font-size: 13px; color: #5a6a80; line-height: 1.6; margin-bottom: 24px; }
  .wb-plan hr { border: none; border-top: 1px solid rgba(255,255,255,0.07); margin-bottom: 20px; }
  .wb-plan-features { list-style: none; display: flex; flex-direction: column; gap: 10px; flex: 1; }
  .wb-plan-features li { display: flex; align-items: flex-start; gap: 8px; font-size: 13px; color: #9aa4b8; }
  .wb-plan-features li .chk { color: #22d3ee; font-weight: 800; flex-shrink: 0; margin-top: 1px; }
  .wb-plan-cta {
    margin-top: 28px;
    width: 100%; padding: 13px;
    border-radius: 9px; border: 1px solid rgba(6,182,212,0.3);
    background: transparent; color: #22d3ee;
    font-family: 'Manrope', sans-serif; font-weight: 700; font-size: 14px;
    cursor: pointer; transition: background 0.2s, border-color 0.2s;
  }
  .wb-plan.featured .wb-plan-cta {
    background: linear-gradient(135deg, #06b6d4, #0891b2);
    border-color: transparent; color: #fff;
  }
  .wb-plan-cta:hover { background: rgba(6,182,212,0.12); }
  .wb-plan.featured .wb-plan-cta:hover { opacity: 0.88; background: linear-gradient(135deg, #06b6d4, #0891b2); }

  /* ── CTA / FORM ── */
  .wb-cta-wrap {
    max-width: 760px; margin: 0 auto; padding: 0 24px 100px;
  }
  .wb-cta-card {
    background: rgba(6,182,212,0.05);
    border: 1px solid rgba(6,182,212,0.2);
    border-radius: 24px; padding: 52px 48px;
    text-align: center;
  }
  .wb-cta-card h2 {
    font-size: clamp(24px, 3vw, 36px); font-weight: 800;
    letter-spacing: -0.02em; margin-bottom: 10px;
  }
  .wb-cta-card .sub { font-size: 16px; color: #5a6a80; line-height: 1.7; margin-bottom: 36px; }
  .wb-form { text-align: left; }
  .wb-form-row { display: flex; gap: 12px; margin-bottom: 12px; }
  .wb-field {
    flex: 1; padding: 15px 18px;
    background: rgba(0,0,0,0.5);
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 10px;
    color: #dde1ea; font-size: 14px;
    font-family: 'Manrope', sans-serif;
    outline: none; transition: border-color 0.2s;
    width: 100%;
  }
  .wb-field:focus { border-color: rgba(6,182,212,0.5); }
  .wb-field::placeholder { color: #3a4558; }
  select.wb-field { cursor: pointer; }
  .wb-submit {
    width: 100%; padding: 17px;
    background: linear-gradient(135deg, #06b6d4, #0891b2);
    border: none; border-radius: 10px;
    color: #fff; font-family: 'Manrope', sans-serif;
    font-weight: 800; font-size: 16px;
    cursor: pointer; transition: opacity 0.2s, transform 0.15s;
    margin-top: 4px;
  }
  .wb-submit:hover { opacity: 0.88; transform: translateY(-1px); }
  .wb-submit:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
  .wb-fine { font-size: 12px; color: #3a4558; text-align: center; margin-top: 14px; }
  .wb-success {
    text-align: center; padding: 20px;
  }
  .wb-success-icon {
    width: 72px; height: 72px;
    background: rgba(6,182,212,0.12);
    border: 2px solid rgba(6,182,212,0.25);
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    margin: 0 auto 24px; font-size: 32px; color: #22d3ee;
  }
  .wb-success h3 { font-size: 26px; font-weight: 800; margin-bottom: 10px; }
  .wb-success p { font-size: 15px; color: #5a6a80; line-height: 1.7; }

  /* ── FOOTER ── */
  .wb-footer {
    border-top: 1px solid rgba(255,255,255,0.06);
    padding: 32px 24px;
    text-align: center;
    font-size: 13px; color: #3a4558;
  }
  .wb-footer a { color: #22d3ee; text-decoration: none; }

  /* ── RESPONSIVE ── */
  @media (max-width: 768px) {
    .wb-stats-inner { grid-template-columns: repeat(2, 1fr); }
    .wb-stat + .wb-stat { border-left: none; }
    .wb-stat:nth-child(3), .wb-stat:nth-child(4) { border-top: 1px solid rgba(255,255,255,0.07); }
    .wb-features { grid-template-columns: 1fr; }
    .wb-pricing { grid-template-columns: 1fr; }
    .wb-inc-grid { grid-template-columns: 1fr; }
    .wb-form-row { flex-direction: column; }
    .wb-cta-card { padding: 36px 24px; }
    .wb-nav { padding: 12px 16px; }
    .wb-hero-actions { flex-direction: column; }
    .wb-hero { padding: 60px 16px 56px; }
  }
  @media (max-width: 480px) {
    .wb-stats-inner { grid-template-columns: 1fr 1fr; }
  }
`;

const FEATURES = [
  {
    icon: "⚡",
    title: "Built to convert",
    desc: "Every layout decision is driven by one goal: turn your visitors into paying customers.",
  },
  {
    icon: "🔍",
    title: "SEO from day one",
    desc: "Google-indexed structure, fast Core Web Vitals, schema markup, and local SEO baked in automatically.",
  },
  {
    icon: "📱",
    title: "Mobile-first design",
    desc: "Over 60% of traffic is mobile. Your site will look flawless on every screen size.",
  },
  {
    icon: "🚀",
    title: "Live in 2 weeks",
    desc: "Not 3 months of meetings. Discovery call, design approval, launch. That's it.",
  },
  {
    icon: "✍️",
    title: "We write the copy",
    desc: "You don't need to be a writer. We handle all the messaging, headlines, and page content.",
  },
  {
    icon: "🔒",
    title: "Hosting + SSL included",
    desc: "Domain setup, fast hosting, SSL certificate, and Google Analytics. Fully managed.",
  },
];

const PROCESS = [
  {
    tag: "Week 1 — Day 1",
    title: "Discovery Call",
    desc: "30-minute call where we learn your business, your customers, and exactly what the site needs to do for you.",
  },
  {
    tag: "Week 1 — Days 2–5",
    title: "Design + Copywriting",
    desc: "We design the layout and write every word. You review a live mockup, leave feedback, and we refine until it's right.",
  },
  {
    tag: "Week 2 — Days 1–5",
    title: "Build + Test",
    desc: "We develop the approved design, test on all devices, and run speed and SEO checks.",
  },
  {
    tag: "Week 2 — Day 5",
    title: "Launch",
    desc: "Domain connected, SSL live, analytics running, Google submitted. Your site is open for business.",
  },
];

const INCLUDED = [
  "Custom design — no templates",
  "Mobile-responsive on all devices",
  "On-page SEO optimization",
  "Lead capture forms + CRM integration",
  "Fast hosting + SSL certificate",
  "Google Analytics + Search Console",
  "All written copy + content",
  "Domain + DNS setup",
  "1 month of post-launch support",
  "Google Business Profile setup",
];

const PLANS = [
  {
    name: "Starter",
    price: "$1,500",
    per: "one-time",
    desc: "Perfect for new businesses that need a clean, professional web presence fast.",
    features: [
      "Up to 4 pages",
      "Custom design",
      "Mobile responsive",
      "Contact form",
      "SEO setup",
      "SSL + hosting (1 yr)",
    ],
    featured: false,
  },
  {
    name: "Growth",
    price: "$2,800",
    per: "one-time",
    desc: "The most popular option for businesses ready to generate leads and rank on Google.",
    features: [
      "Up to 8 pages",
      "Custom design + copywriting",
      "Lead capture + CRM integration",
      "Full SEO optimization",
      "Blog setup",
      "Google Analytics + Search Console",
      "2 months post-launch support",
    ],
    featured: true,
  },
  {
    name: "Authority",
    price: "Custom",
    per: "let's talk",
    desc: "For established businesses that need a full digital presence built to dominate their market.",
    features: [
      "Unlimited pages",
      "E-commerce or booking integration",
      "Advanced SEO + local strategy",
      "Custom animations + interactions",
      "Monthly maintenance plan",
      "Priority support",
    ],
    featured: false,
  },
];

export default function ServiceWebsite() {
  const [email, setEmail] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [currentSite, setCurrentSite] = useState("");
  const [phone, setPhone] = useState("");
  const [goal, setGoal] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const e = params.get("email");
    if (e) setEmail(e);
  }, []);

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!email) return;
    setSubmitting(true);
    try {
      await fetch("/api/services/interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          phone,
          businessName,
          service: "website",
          otherDetails: [
            currentSite && `Current site: ${currentSite}`,
            goal && `Goal: ${goal}`,
          ].filter(Boolean).join(" | ") || undefined,
          source: "landing-page",
        }),
      });
    } catch (_) {}
    setSubmitted(true);
    setSubmitting(false);
  };

  return (
    <div className="wb">
      <style>{CSS}</style>

      {/* ── NAV ── */}
      <nav className="wb-nav">
        <a className="wb-nav-logo" href="/services/website">
          <div className="wb-nav-mark">TCG</div>
          <div>
            <div className="wb-nav-name">Today Capital Group</div>
            <div className="wb-nav-sub">Web Development</div>
          </div>
        </a>
        <button className="wb-nav-cta" onClick={scrollToForm} data-testid="button-nav-cta">
          Get a Free Quote
        </button>
      </nav>

      {/* ── HERO ── */}
      <section className="wb-hero">
        <div className="wb-hero-glow" />
        <div className="wb-hero-grid" />
        <div className="wb-badge">
          <span className="wb-badge-dot" />
          Now Accepting Projects
        </div>
        <h1>
          A website that<br />
          <span className="accent">actually brings in customers.</span>
        </h1>
        <p className="wb-hero-sub">
          Not a template. Not a drag-and-drop builder. A custom site built to rank on Google, convert visitors into leads, and make your business look as good online as it is in person.
        </p>
        <div className="wb-hero-actions">
          <button className="wb-btn-primary" onClick={scrollToForm} data-testid="button-hero-cta">
            Start My Project — Free Quote
          </button>
          <button className="wb-btn-ghost" onClick={() => document.getElementById('process')?.scrollIntoView({ behavior: 'smooth' })} data-testid="button-hero-how">
            See How It Works
          </button>
        </div>
      </section>

      {/* ── STATS ── */}
      <div className="wb-stats">
        <div className="wb-stats-inner">
          <div className="wb-stat">
            <div className="wb-stat-num">2 wks</div>
            <div className="wb-stat-label">Average launch time</div>
          </div>
          <div className="wb-stat">
            <div className="wb-stat-num">50+</div>
            <div className="wb-stat-label">Sites built & launched</div>
          </div>
          <div className="wb-stat">
            <div className="wb-stat-num">100%</div>
            <div className="wb-stat-label">Satisfaction guaranteed</div>
          </div>
          <div className="wb-stat">
            <div className="wb-stat-num">$0</div>
            <div className="wb-stat-label">Templates used. Ever.</div>
          </div>
        </div>
      </div>

      {/* ── FEATURES ── */}
      <div className="wb-section">
        <div className="wb-label">Why it works</div>
        <div className="wb-section-title">Built for business owners, not designers.</div>
        <p className="wb-section-sub">
          You don't need to learn anything. We handle the design, development, copywriting, and launch — you just show up to the discovery call.
        </p>
        <div className="wb-features">
          {FEATURES.map((f, i) => (
            <div className="wb-feature" key={i} data-testid={`card-feature-${i}`}>
              <div className="wb-feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── PROCESS ── */}
      <div className="wb-section-sm" id="process">
        <div className="wb-label">How it works</div>
        <div className="wb-section-title">Live in 2 weeks. Not 2 months.</div>
        <p className="wb-section-sub">
          Our process is tight, transparent, and built around one thing: getting your site live fast without cutting corners.
        </p>
        <div className="wb-timeline">
          {PROCESS.map((step, i) => (
            <div className="wb-tl-item" key={i}>
              <div className="wb-tl-left">
                <div className="wb-tl-num">{i + 1}</div>
                <div className="wb-tl-line" />
              </div>
              <div className="wb-tl-content">
                <div className="wb-tl-tag">{step.tag}</div>
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── INCLUDED ── */}
      <div className="wb-section-sm" style={{ paddingTop: 0 }}>
        <div className="wb-label">Everything included</div>
        <div className="wb-section-title">No hidden costs. No nickel-and-diming.</div>
        <p className="wb-section-sub">
          One flat price covers everything from design through launch. No surprise invoices for "extras" that should have been included from day one.
        </p>
        <div className="wb-inc-grid">
          {INCLUDED.map((item, i) => (
            <div className="wb-inc-item" key={i} data-testid={`item-included-${i}`}>
              <div className="wb-inc-check">✓</div>
              {item}
            </div>
          ))}
        </div>
      </div>

      {/* ── PRICING ── */}
      <div className="wb-section">
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div className="wb-label">Pricing</div>
          <div className="wb-section-title" style={{ marginBottom: 8 }}>Simple, flat-rate pricing.</div>
          <p style={{ fontSize: 16, color: "#5a6a80", maxWidth: 500, margin: "0 auto" }}>
            No hourly billing, no retainer traps. You know the price before we start.
          </p>
        </div>
        <div className="wb-pricing">
          {PLANS.map((plan, i) => (
            <div className={`wb-plan${plan.featured ? " featured" : ""}`} key={i} data-testid={`card-plan-${i}`}>
              {plan.featured && <div className="wb-plan-badge">Most Popular</div>}
              <div className="wb-plan-name">{plan.name}</div>
              <div className="wb-plan-price">{plan.price}</div>
              <div className="wb-plan-per">{plan.per}</div>
              <div className="wb-plan-desc">{plan.desc}</div>
              <hr />
              <ul className="wb-plan-features">
                {plan.features.map((f, j) => (
                  <li key={j}><span className="chk">✓</span>{f}</li>
                ))}
              </ul>
              <button
                className="wb-plan-cta"
                onClick={scrollToForm}
                data-testid={`button-plan-cta-${i}`}
              >
                {plan.price === "Custom" ? "Let's Talk" : "Get Started"}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── CTA FORM ── */}
      <div className="wb-cta-wrap" ref={formRef} id="contact">
        <div className="wb-cta-card">
          {submitted ? (
            <div className="wb-success">
              <div className="wb-success-icon">✓</div>
              <h3>We'll be in touch within 24 hours.</h3>
              <p>
                Thanks for reaching out. One of our team members will follow up to schedule a free discovery call and scope out your project — no commitment required.
              </p>
            </div>
          ) : (
            <>
              <div className="wb-label" style={{ justifyContent: "center", display: "flex" }}>Let's get started</div>
              <h2>Tell us about your business.</h2>
              <p className="sub">Free consultation. We'll scope your project, answer every question, and send a quote — with no pressure to move forward.</p>
              <form className="wb-form" onSubmit={handleSubmit}>
                <div className="wb-form-row">
                  <input
                    className="wb-field"
                    type="email"
                    placeholder="Your email *"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    data-testid="input-email"
                  />
                  <input
                    className="wb-field"
                    type="tel"
                    placeholder="Phone number"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    data-testid="input-phone"
                  />
                </div>
                <div className="wb-form-row">
                  <input
                    className="wb-field"
                    placeholder="Business name"
                    value={businessName}
                    onChange={e => setBusinessName(e.target.value)}
                    data-testid="input-business"
                  />
                  <input
                    className="wb-field"
                    placeholder="Current website (if any)"
                    value={currentSite}
                    onChange={e => setCurrentSite(e.target.value)}
                    data-testid="input-current-site"
                  />
                </div>
                <div className="wb-form-row">
                  <select
                    className="wb-field"
                    value={goal}
                    onChange={e => setGoal(e.target.value)}
                    data-testid="select-goal"
                  >
                    <option value="">What's your primary goal?</option>
                    <option value="generate-leads">Generate more leads online</option>
                    <option value="look-professional">Look professional + credible</option>
                    <option value="rank-google">Rank higher on Google</option>
                    <option value="replace-old-site">Replace an outdated site</option>
                    <option value="launch-new-business">Launch a new business</option>
                    <option value="ecommerce">Sell products online</option>
                  </select>
                </div>
                <button
                  className="wb-submit"
                  type="submit"
                  disabled={submitting || !email}
                  data-testid="button-submit"
                >
                  {submitting ? "Submitting..." : "Get My Free Quote"}
                </button>
                <p className="wb-fine">No commitment. No spam. We'll respond within 24 hours.</p>
              </form>
            </>
          )}
        </div>
      </div>

      {/* ── FOOTER ── */}
      <footer className="wb-footer">
        &copy; {new Date().getFullYear()} Today Capital Group &nbsp;·&nbsp;
        <a href="/">todaycapitalgroup.com</a>
      </footer>
    </div>
  );
}
