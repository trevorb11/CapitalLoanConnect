import { useState, useEffect, useRef } from "react";

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;700;900&family=Inter:wght@300;400;500;600;700;800&display=swap');

  .md * { box-sizing: border-box; margin: 0; padding: 0; }

  .md {
    font-family: 'Inter', sans-serif;
    background: #05090f;
    color: #e8ecf2;
    min-height: 100vh;
    overflow-x: hidden;
  }

  /* ── NAV ── */
  .md-nav {
    position: sticky; top: 0; z-index: 100;
    background: rgba(5,9,15,0.92);
    backdrop-filter: blur(14px);
    border-bottom: 1px solid rgba(255,255,255,0.07);
    padding: 14px 32px;
    display: flex; align-items: center; justify-content: space-between;
    gap: 16px; flex-wrap: wrap;
  }
  .md-nav-logo { display: flex; align-items: center; gap: 10px; text-decoration: none; }
  .md-nav-mark {
    width: 34px; height: 34px;
    background: linear-gradient(135deg, #b8243a, #0f1f3d);
    border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    font-weight: 800; font-size: 13px; color: #fff;
  }
  .md-nav-name { font-weight: 700; font-size: 14px; color: #e8ecf2; }
  .md-nav-sub { font-size: 10px; color: #b8243a; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 600; }
  .md-nav-pill {
    display: flex; align-items: center; gap: 7px;
    padding: 5px 13px;
    background: rgba(184,36,58,0.12);
    border: 1px solid rgba(184,36,58,0.3);
    border-radius: 100px;
    font-size: 11px; font-weight: 700; color: #e05068;
    text-transform: uppercase; letter-spacing: 0.09em;
    flex-shrink: 0;
  }
  .md-nav-pill-dot {
    width: 6px; height: 6px; background: #e05068; border-radius: 50%;
    animation: blink 1.6s infinite;
  }
  @keyframes blink { 0%,100% { opacity:1; } 50% { opacity:0.25; } }

  .md-nav-cta {
    padding: 9px 22px;
    background: #b8243a;
    border: none; border-radius: 8px;
    color: #fff; font-family: 'Inter', sans-serif; font-weight: 700; font-size: 13px;
    cursor: pointer; transition: background 0.2s, transform 0.15s;
    text-decoration: none; display: inline-block;
  }
  .md-nav-cta:hover { background: #d4294a; transform: translateY(-1px); }

  /* ── HERO ── */
  .md-hero {
    position: relative;
    padding: 80px 24px 72px;
    text-align: center;
    overflow: hidden;
    background: linear-gradient(160deg, #0f1f3d 0%, #14102a 50%, #2a0d15 100%);
  }
  .md-hero-glow {
    position: absolute; top: -100px; left: 50%; transform: translateX(-50%);
    width: 800px; height: 560px;
    background: radial-gradient(ellipse at center, rgba(184,36,58,0.18) 0%, transparent 65%);
    pointer-events: none;
  }
  .md-hero-stars {
    position: absolute; inset: 0; pointer-events: none;
    background-image:
      radial-gradient(1px 1px at 15% 20%, rgba(255,255,255,0.6) 0%, transparent 100%),
      radial-gradient(1px 1px at 42% 8%, rgba(255,255,255,0.4) 0%, transparent 100%),
      radial-gradient(1.5px 1.5px at 68% 14%, rgba(255,255,255,0.5) 0%, transparent 100%),
      radial-gradient(1px 1px at 82% 30%, rgba(255,255,255,0.35) 0%, transparent 100%),
      radial-gradient(1px 1px at 25% 55%, rgba(255,255,255,0.3) 0%, transparent 100%),
      radial-gradient(1px 1px at 78% 65%, rgba(255,255,255,0.4) 0%, transparent 100%),
      radial-gradient(1.5px 1.5px at 55% 40%, rgba(255,255,255,0.45) 0%, transparent 100%),
      radial-gradient(1px 1px at 90% 12%, rgba(255,255,255,0.35) 0%, transparent 100%);
  }

  .md-hero-badge {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 7px 18px;
    background: rgba(255,255,255,0.08);
    border: 1px solid rgba(255,255,255,0.18);
    border-radius: 100px;
    font-size: 11px; font-weight: 700; color: #f5d5db;
    text-transform: uppercase; letter-spacing: 0.12em;
    margin-bottom: 28px;
    position: relative;
  }
  .md-star { color: #e05068; font-size: 10px; }

  .md-hero h1 {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: clamp(36px, 5.5vw, 66px);
    font-weight: 700;
    line-height: 1.1;
    letter-spacing: -0.025em;
    color: #ffffff;
    margin-bottom: 28px;
    position: relative;
  }

  .md-price-row {
    display: flex; align-items: flex-end; justify-content: center;
    gap: 16px; margin-bottom: 20px; flex-wrap: wrap;
    position: relative;
  }
  .md-price-was {
    font-size: 28px; font-weight: 500; color: #f5d5db;
    text-decoration: line-through; opacity: 0.7;
    padding-bottom: 6px;
  }
  .md-price-now {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: clamp(72px, 10vw, 96px);
    font-weight: 700; color: #ffffff;
    line-height: 1; letter-spacing: -0.03em;
  }

  .md-hero-sub {
    font-size: 17px; color: #c8d4e4; line-height: 1.7;
    max-width: 520px; margin: 0 auto 36px;
    position: relative;
  }

  .md-hero-cta {
    display: inline-flex; align-items: center; gap: 10px;
    padding: 18px 42px;
    background: #b8243a;
    border: none; border-radius: 12px;
    color: #fff; font-family: 'Inter', sans-serif;
    font-weight: 700; font-size: 16px;
    cursor: pointer; transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
    box-shadow: 0 8px 32px rgba(184,36,58,0.35);
    text-decoration: none;
    position: relative;
  }
  .md-hero-cta:hover {
    background: #d4294a;
    transform: translateY(-3px);
    box-shadow: 0 12px 40px rgba(184,36,58,0.45);
  }
  .md-hero-fine {
    font-size: 13px; color: #7a8699; margin-top: 16px;
    position: relative;
  }

  /* ── SAVINGS CALLOUT ── */
  .md-savings {
    background: linear-gradient(135deg, rgba(184,36,58,0.12), rgba(15,31,61,0.2));
    border-top: 1px solid rgba(184,36,58,0.2);
    border-bottom: 1px solid rgba(184,36,58,0.2);
    padding: 28px 24px;
    text-align: center;
  }
  .md-savings-inner {
    max-width: 700px; margin: 0 auto;
    display: flex; align-items: center; justify-content: center; gap: 32px;
    flex-wrap: wrap;
  }
  .md-savings-item { text-align: center; }
  .md-savings-num {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 36px; font-weight: 700; color: #e05068;
    letter-spacing: -0.02em; line-height: 1;
  }
  .md-savings-label { font-size: 12px; color: #7a8699; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600; }
  .md-savings-divider { width: 1px; height: 48px; background: rgba(255,255,255,0.1); }

  /* ── INTRO SECTION ── */
  .md-intro {
    max-width: 760px; margin: 0 auto; padding: 72px 24px 56px;
    text-align: center;
  }
  .md-intro-eyebrow {
    font-size: 11px; font-weight: 700; color: #b8243a;
    text-transform: uppercase; letter-spacing: 0.12em;
    margin-bottom: 16px;
  }
  .md-intro h2 {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: clamp(26px, 3vw, 38px);
    font-weight: 700; color: #f0f4f9;
    letter-spacing: -0.02em; line-height: 1.25;
    margin-bottom: 20px;
  }
  .md-intro p {
    font-size: 16px; color: #7a8699; line-height: 1.75; margin-bottom: 14px;
  }

  /* ── PROCESS STEPS ── */
  .md-process { max-width: 720px; margin: 0 auto; padding: 16px 24px 72px; }
  .md-section-head {
    margin-bottom: 40px;
  }
  .md-section-rule {
    display: flex; align-items: center; gap: 14px; margin-bottom: 20px;
  }
  .md-rule-line { flex: 1; height: 1px; background: rgba(255,255,255,0.07); }
  .md-rule-label {
    font-size: 11px; font-weight: 700; color: #b8243a;
    text-transform: uppercase; letter-spacing: 0.12em;
    white-space: nowrap;
  }
  .md-process-title {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: clamp(24px, 2.8vw, 34px);
    font-weight: 700; letter-spacing: -0.02em;
    color: #f0f4f9; line-height: 1.2;
  }

  .md-steps { display: flex; flex-direction: column; gap: 0; }
  .md-step {
    display: flex; gap: 24px; position: relative; padding-bottom: 36px;
  }
  .md-step:last-child { padding-bottom: 0; }
  .md-step-left { display: flex; flex-direction: column; align-items: center; flex-shrink: 0; }
  .md-step-num {
    width: 44px; height: 44px;
    background: #0f1f3d;
    border: 2px solid rgba(184,36,58,0.4);
    border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    font-weight: 800; font-size: 14px; color: #e05068;
    flex-shrink: 0;
  }
  .md-step-line {
    width: 2px; flex: 1; margin-top: 6px;
    background: linear-gradient(180deg, rgba(184,36,58,0.3), rgba(184,36,58,0.04));
    min-height: 28px;
  }
  .md-step:last-child .md-step-line { display: none; }
  .md-step-body { padding-top: 10px; }
  .md-step-title { font-size: 18px; font-weight: 700; color: #f0f4f9; margin-bottom: 6px; }
  .md-step-desc { font-size: 14px; color: #7a8699; line-height: 1.65; }

  /* ── INCLUDED ── */
  .md-included { max-width: 860px; margin: 0 auto; padding: 0 24px 72px; }
  .md-inc-grid {
    display: grid; grid-template-columns: 1fr 1fr; gap: 10px;
    margin-top: 32px;
  }
  .md-inc-item {
    display: flex; align-items: center; gap: 12px;
    padding: 14px 18px;
    background: rgba(255,255,255,0.025);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 10px;
    font-size: 14px; font-weight: 500; color: #c0c8d8;
  }
  .md-inc-check {
    width: 22px; height: 22px; flex-shrink: 0;
    background: rgba(184,36,58,0.15);
    border-radius: 6px;
    display: flex; align-items: center; justify-content: center;
    color: #e05068; font-size: 12px; font-weight: 800;
  }

  /* ── PRICING CALLOUT ── */
  .md-pricing-wrap {
    max-width: 760px; margin: 0 auto; padding: 0 24px 72px;
  }
  .md-pricing-card {
    background: linear-gradient(135deg, rgba(15,31,61,0.8) 0%, rgba(42,13,21,0.8) 100%);
    border: 1px solid rgba(184,36,58,0.3);
    border-radius: 24px;
    padding: 48px 40px;
    text-align: center;
    position: relative;
    overflow: hidden;
  }
  .md-pricing-card::before {
    content: '';
    position: absolute; top: -80px; right: -80px;
    width: 300px; height: 300px;
    background: radial-gradient(circle, rgba(184,36,58,0.12) 0%, transparent 70%);
    pointer-events: none;
  }
  .md-pricing-banner {
    position: absolute; top: 0; left: 50%; transform: translateX(-50%);
    background: #b8243a;
    padding: 6px 24px;
    border-radius: 0 0 12px 12px;
    font-size: 11px; font-weight: 700; color: #fff;
    text-transform: uppercase; letter-spacing: 0.1em;
    white-space: nowrap;
  }
  .md-pricing-eyebrow {
    font-size: 11px; font-weight: 700; color: #e05068;
    text-transform: uppercase; letter-spacing: 0.12em;
    margin-bottom: 16px; margin-top: 16px;
  }
  .md-pricing-head {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: clamp(26px, 3vw, 36px);
    font-weight: 700; color: #f0f4f9;
    letter-spacing: -0.02em; margin-bottom: 8px;
  }
  .md-pricing-sub { font-size: 15px; color: #7a8699; margin-bottom: 32px; line-height: 1.6; }
  .md-pricing-row {
    display: flex; align-items: flex-end; justify-content: center; gap: 14px; flex-wrap: wrap;
    margin-bottom: 10px;
  }
  .md-pricing-was {
    font-size: 22px; font-weight: 500; color: #c8a0a8;
    text-decoration: line-through; padding-bottom: 8px;
  }
  .md-pricing-now {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: clamp(60px, 8vw, 80px);
    font-weight: 700; color: #ffffff;
    line-height: 1; letter-spacing: -0.03em;
  }
  .md-pricing-note { font-size: 14px; color: #7a8699; margin-bottom: 32px; }
  .md-pricing-list {
    display: grid; grid-template-columns: 1fr 1fr;
    gap: 8px; text-align: left; margin-bottom: 36px;
  }
  .md-pricing-feat {
    display: flex; align-items: center; gap: 8px;
    font-size: 13px; color: #9aa4b8;
  }
  .md-pricing-feat .chk { color: #e05068; font-size: 13px; font-weight: 800; flex-shrink: 0; }

  /* ── FORM SECTION ── */
  .md-form-wrap {
    max-width: 680px; margin: 0 auto; padding: 0 24px 80px;
  }
  .md-form-card {
    background: rgba(255,255,255,0.025);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 20px;
    padding: 44px 40px;
  }
  .md-form-head { text-align: center; margin-bottom: 32px; }
  .md-form-head h2 {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: clamp(22px, 2.5vw, 30px);
    font-weight: 700; letter-spacing: -0.02em;
    color: #f0f4f9; margin-bottom: 8px;
  }
  .md-form-head p { font-size: 14px; color: #7a8699; line-height: 1.65; }
  .md-field {
    width: 100%; padding: 15px 18px;
    background: rgba(0,0,0,0.4);
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 10px;
    color: #e8ecf2; font-size: 14px;
    font-family: 'Inter', sans-serif;
    outline: none; transition: border-color 0.2s;
  }
  .md-field:focus { border-color: rgba(184,36,58,0.5); }
  .md-field::placeholder { color: #3a4558; }
  select.md-field { cursor: pointer; }
  .md-form-row { display: flex; gap: 12px; margin-bottom: 12px; }
  .md-submit {
    width: 100%; padding: 17px;
    background: #b8243a;
    border: none; border-radius: 10px;
    color: #fff; font-family: 'Inter', sans-serif;
    font-weight: 800; font-size: 16px;
    cursor: pointer; transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
    margin-top: 4px;
    box-shadow: 0 4px 20px rgba(184,36,58,0.3);
  }
  .md-submit:hover { background: #d4294a; transform: translateY(-1px); box-shadow: 0 8px 28px rgba(184,36,58,0.4); }
  .md-submit:disabled { opacity: 0.4; cursor: not-allowed; transform: none; box-shadow: none; }
  .md-fine { font-size: 12px; color: #3a4558; text-align: center; margin-top: 14px; line-height: 1.6; }

  .md-success {
    text-align: center; padding: 16px 0;
  }
  .md-success-icon {
    width: 72px; height: 72px;
    background: rgba(184,36,58,0.12);
    border: 2px solid rgba(184,36,58,0.3);
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    margin: 0 auto 24px; font-size: 32px; color: #e05068;
  }
  .md-success h3 {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 26px; font-weight: 700;
    color: #f0f4f9; margin-bottom: 10px;
  }
  .md-success p { font-size: 15px; color: #7a8699; line-height: 1.7; }

  /* ── PS BOX ── */
  .md-ps {
    max-width: 680px; margin: 0 auto; padding: 0 24px 72px;
  }
  .md-ps-card {
    background: rgba(184,36,58,0.06);
    border: 1px solid rgba(184,36,58,0.18);
    border-radius: 14px;
    padding: 22px 24px;
    display: flex; gap: 14px; align-items: flex-start;
  }
  .md-ps-tag {
    width: 36px; height: 36px; flex-shrink: 0;
    background: #b8243a;
    border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 13px; color: #fff; font-weight: 700;
  }
  .md-ps-text { font-size: 14px; color: #c0c8d8; line-height: 1.7; }
  .md-ps-text strong { color: #f0f4f9; }

  /* ── FOOTER ── */
  .md-footer {
    border-top: 1px solid rgba(255,255,255,0.06);
    padding: 32px 24px;
    text-align: center;
    font-size: 13px; color: #3a4558;
  }
  .md-footer a { color: #e05068; text-decoration: none; }
  .md-footer-brand {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 17px; color: #e8ecf2;
    display: block; margin-bottom: 6px;
  }

  /* ── RESPONSIVE ── */
  @media (max-width: 640px) {
    .md-pricing-list { grid-template-columns: 1fr; }
    .md-form-card { padding: 30px 22px; }
    .md-form-row { flex-direction: column; }
    .md-inc-grid { grid-template-columns: 1fr; }
    .md-pricing-card { padding: 40px 24px 36px; }
    .md-nav { padding: 12px 16px; }
    .md-hero { padding: 60px 16px 56px; }
    .md-savings-divider { display: none; }
  }
`;

const STEPS = [
  {
    num: "01",
    title: "Discovery call with your team",
    desc: "We meet with you, walk through what you need, what you want it to look like, and what it has to do. 30 minutes — we'll come prepared.",
  },
  {
    num: "02",
    title: "We build the site to spec",
    desc: "Full custom build. Designed, written, and structured around your business — not a generic template with your logo dropped in.",
  },
  {
    num: "03",
    title: "Two rounds of revisions included",
    desc: "You review, we revise. Twice. Both rounds are included in the $499 promo price — no upcharges, no hidden fees.",
  },
];

const INCLUDED = [
  "Custom design — no templates",
  "Mobile-responsive on all devices",
  "On-page SEO optimization",
  "Lead capture forms built in",
  "Fast hosting + SSL certificate",
  "Google Analytics + Search Console",
  "All written copy + content",
  "Domain + DNS setup",
  "Two full rounds of revisions",
  "Google Business Profile setup",
];

const FEATURES = [
  "Custom design — not a template",
  "Copy written by us",
  "Mobile-first & fast loading",
  "Full SEO setup",
  "Two rounds of revisions",
  "SSL + hosting included",
];

export default function MemorialDayWebsite() {
  const [email, setEmail] = useState("");
  const [businessName, setBusinessName] = useState("");
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
          service: "website-memorial-day",
          otherDetails: goal ? `Goal: ${goal} | Memorial Day promo` : "Memorial Day promo",
          source: "memorial-day-landing",
        }),
      });
    } catch (_) {}
    setSubmitted(true);
    setSubmitting(false);
  };

  return (
    <div className="md">
      <style>{CSS}</style>

      {/* ── NAV ── */}
      <nav className="md-nav">
        <a className="md-nav-logo" href="/services/website">
          <div className="md-nav-mark">TCG</div>
          <div>
            <div className="md-nav-name">Today Capital Group</div>
            <div className="md-nav-sub">Web Development</div>
          </div>
        </a>
        <div className="md-nav-pill">
          <span className="md-nav-pill-dot" />
          Memorial Day Sale
        </div>
        <button className="md-nav-cta" onClick={scrollToForm} data-testid="button-nav-cta">
          Claim $499 Deal
        </button>
      </nav>

      {/* ── HERO ── */}
      <section className="md-hero">
        <div className="md-hero-glow" />
        <div className="md-hero-stars" />

        <div className="md-hero-badge">
          <span className="md-star">&#9733;</span>
          Memorial Day Sale
          <span className="md-star">&#9733;</span>
        </div>

        <h1>
          A custom website for<br />your business.
        </h1>

        <div className="md-price-row">
          <div className="md-price-was">$1,500</div>
          <div className="md-price-now">$499</div>
        </div>

        <p className="md-hero-sub">
          Fully custom, built to spec, two rounds of edits included.
          Not a template. Not a drag-and-drop builder we hand you and disappear.
        </p>

        <button className="md-hero-cta" onClick={scrollToForm} data-testid="button-hero-cta">
          Claim the $499 deal &rarr;
        </button>
        <p className="md-hero-fine">Memorial Day weekend only &middot; Lock in the rate, build kicks off any time after</p>
      </section>

      {/* ── SAVINGS BAR ── */}
      <div className="md-savings">
        <div className="md-savings-inner">
          <div className="md-savings-item">
            <div className="md-savings-num">$1,001</div>
            <div className="md-savings-label">You save</div>
          </div>
          <div className="md-savings-divider" />
          <div className="md-savings-item">
            <div className="md-savings-num">$499</div>
            <div className="md-savings-label">Promo price</div>
          </div>
          <div className="md-savings-divider" />
          <div className="md-savings-item">
            <div className="md-savings-num">2 wks</div>
            <div className="md-savings-label">Avg. launch time</div>
          </div>
          <div className="md-savings-divider" />
          <div className="md-savings-item">
            <div className="md-savings-num">0</div>
            <div className="md-savings-label">Templates used. Ever.</div>
          </div>
        </div>
      </div>

      {/* ── INTRO ── */}
      <div className="md-intro">
        <div className="md-intro-eyebrow">Why we're doing this</div>
        <h2>Real site. Real team. No templates.</h2>
        <p>
          For Memorial Day weekend, we're running a one-time promo on our website build package — $499 for a fully custom site, built to your specs from scratch.
        </p>
        <p>
          Not a template. Not a drag-and-drop builder we hand you and disappear. A real site, built by us, around what your business actually does.
        </p>
      </div>

      {/* ── HOW IT WORKS ── */}
      <div className="md-process">
        <div className="md-section-head">
          <div className="md-section-rule">
            <div className="md-rule-line" />
            <div className="md-rule-label">How it works</div>
            <div className="md-rule-line" />
          </div>
          <div className="md-process-title">Three steps, start to launch.</div>
        </div>
        <div className="md-steps">
          {STEPS.map(s => (
            <div className="md-step" key={s.num}>
              <div className="md-step-left">
                <div className="md-step-num">{s.num}</div>
                <div className="md-step-line" />
              </div>
              <div className="md-step-body">
                <div className="md-step-title">{s.title}</div>
                <div className="md-step-desc">{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── WHAT'S INCLUDED ── */}
      <div className="md-included">
        <div className="md-section-rule" style={{ marginBottom: 8 }}>
          <div className="md-rule-line" />
          <div className="md-rule-label">Everything included</div>
          <div className="md-rule-line" />
        </div>
        <div className="md-inc-grid">
          {INCLUDED.map(item => (
            <div className="md-inc-item" key={item}>
              <div className="md-inc-check">&#10003;</div>
              {item}
            </div>
          ))}
        </div>
      </div>

      {/* ── PRICING CALLOUT ── */}
      <div className="md-pricing-wrap">
        <div className="md-pricing-card">
          <div className="md-pricing-banner">Memorial Day Special</div>
          <div className="md-pricing-eyebrow">Limited-time offer</div>
          <div className="md-pricing-head">Lock in the promo price before the long weekend ends.</div>
          <div className="md-pricing-sub">
            Promo pricing applies to projects booked over Memorial Day weekend.
            Builds can kick off any time after — no rush, just lock in the rate.
          </div>
          <div className="md-pricing-row">
            <div className="md-pricing-was">$1,500</div>
            <div className="md-pricing-now">$499</div>
          </div>
          <div className="md-pricing-note">one-time &middot; fully custom &middot; two rounds of edits included</div>
          <div className="md-pricing-list">
            {FEATURES.map(f => (
              <div className="md-pricing-feat" key={f}>
                <span className="chk">&#10003;</span>
                {f}
              </div>
            ))}
          </div>
          <button
            className="md-hero-cta"
            onClick={scrollToForm}
            data-testid="button-pricing-cta"
            style={{ display: "inline-flex" }}
          >
            Claim the $499 deal &rarr;
          </button>
        </div>
      </div>

      {/* ── CLAIM FORM ── */}
      <div className="md-form-wrap" ref={formRef}>
        <div className="md-form-card">
          {submitted ? (
            <div className="md-success">
              <div className="md-success-icon">&#10003;</div>
              <h3>You're locked in.</h3>
              <p>
                We'll be in touch within 24 hours to confirm your spot and schedule your discovery call.
                The $499 rate is yours — no rush on the build start date.
              </p>
            </div>
          ) : (
            <>
              <div className="md-form-head">
                <div className="md-section-rule" style={{ marginBottom: 16 }}>
                  <div className="md-rule-line" />
                  <div className="md-rule-label">Claim your spot</div>
                  <div className="md-rule-line" />
                </div>
                <h2>Tell us about your business.</h2>
                <p>Drop your info below and we'll reach out within 24 hours to confirm your promo spot and schedule a discovery call.</p>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="md-form-row">
                  <input
                    className="md-field"
                    type="email"
                    placeholder="Your email *"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    data-testid="input-email"
                  />
                  <input
                    className="md-field"
                    type="tel"
                    placeholder="Phone number"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    data-testid="input-phone"
                  />
                </div>
                <div className="md-form-row">
                  <input
                    className="md-field"
                    placeholder="Business name"
                    value={businessName}
                    onChange={e => setBusinessName(e.target.value)}
                    data-testid="input-business"
                  />
                </div>
                <div className="md-form-row">
                  <select
                    className="md-field"
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
                  className="md-submit"
                  type="submit"
                  disabled={submitting || !email}
                  data-testid="button-submit"
                >
                  {submitting ? "Submitting..." : "Claim the $499 Memorial Day deal \u2192"}
                </button>
                <p className="md-fine">
                  No commitment. No spam. We'll reach out within 24 hours to confirm your spot.
                  Promo pricing applies to projects booked Memorial Day weekend.
                </p>
              </form>
            </>
          )}
        </div>
      </div>

      {/* ── P.S. ── */}
      <div className="md-ps">
        <div className="md-ps-card">
          <div className="md-ps-tag">P.S.</div>
          <div className="md-ps-text">
            <strong>Promo pricing applies to projects booked over Memorial Day weekend.</strong>{" "}
            Builds can kick off any time after — no rush, just lock in the rate now while it's available.
          </div>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <footer className="md-footer">
        <span className="md-footer-brand">Today Capital Group</span>
        Woodland Hills, CA &middot;{" "}
        <a href="https://www.todaycapitalgroup.com">todaycapitalgroup.com</a>
        <div style={{ marginTop: 8 }}>
          <a href="/services/website" style={{ color: "#3a4558" }}>View standard website plans</a>
          {" "}&middot;{" "}
          <a href="/services" style={{ color: "#3a4558" }}>All services</a>
        </div>
      </footer>
    </div>
  );
}
