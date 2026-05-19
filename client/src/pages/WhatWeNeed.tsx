// ── WHAT WE NEED — Application Requirements Landing Page ─────────────────

const PAGE_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');

  .wwn * { box-sizing: border-box; margin: 0; padding: 0; }

  .wwn {
    font-family: 'DM Sans', sans-serif;
    background:
      radial-gradient(ellipse at 15% 0%, rgba(20,184,166,0.12) 0%, transparent 55%),
      radial-gradient(ellipse at 85% 100%, rgba(15,23,41,0.95) 0%, transparent 55%),
      #080d18;
    color: #e8eaf0;
    min-height: 100vh;
  }

  /* ── HEADER ── */
  .wwn .wwn-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 18px 32px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    background: rgba(8,13,24,0.85);
    backdrop-filter: blur(12px);
    position: sticky; top: 0; z-index: 50;
  }

  .wwn .wwn-logo {
    display: flex; align-items: center; gap: 10px;
  }

  .wwn .wwn-logo-mark {
    width: 34px; height: 34px;
    background: linear-gradient(135deg, #14B8A6, #2dd4bf);
    border-radius: 9px;
    display: flex; align-items: center; justify-content: center;
    font-family: 'Syne', sans-serif; font-weight: 800; font-size: 13px; color: #080d18;
  }

  .wwn .wwn-logo-text { font-family: 'Syne', sans-serif; font-weight: 700; font-size: 14px; }
  .wwn .wwn-logo-sub  { font-size: 10px; color: #2dd4bf; text-transform: uppercase; letter-spacing: 0.08em; }

  .wwn .wwn-apply-btn {
    padding: 9px 20px;
    background: linear-gradient(135deg, #14B8A6, #0d9488);
    border: none; border-radius: 8px;
    color: #080d18; font-family: 'Syne', sans-serif; font-weight: 700; font-size: 13px;
    cursor: pointer; text-decoration: none; display: inline-block;
    transition: opacity 0.2s, transform 0.1s;
  }

  .wwn .wwn-apply-btn:hover { opacity: 0.9; transform: translateY(-1px); }

  /* ── HERO ── */
  .wwn .wwn-hero {
    max-width: 760px; margin: 0 auto;
    padding: 80px 32px 64px;
    text-align: center;
  }

  .wwn .wwn-badge {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 5px 14px;
    background: rgba(45,212,191,0.1);
    border: 1px solid rgba(45,212,191,0.25);
    border-radius: 99px;
    font-size: 12px; font-weight: 600; color: #2dd4bf;
    text-transform: uppercase; letter-spacing: 0.06em;
    margin-bottom: 28px;
  }

  .wwn .wwn-hero-title {
    font-family: 'Syne', sans-serif;
    font-size: clamp(32px, 5vw, 52px);
    font-weight: 800; line-height: 1.14;
    color: #fff; margin-bottom: 20px;
  }

  .wwn .wwn-hero-title span { color: #2dd4bf; }

  .wwn .wwn-hero-sub {
    font-size: 17px; color: #94a3b8; line-height: 1.75; max-width: 580px; margin: 0 auto 40px;
  }

  .wwn .wwn-hero-time {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 10px 22px;
    background: rgba(45,212,191,0.07);
    border: 1px solid rgba(45,212,191,0.2);
    border-radius: 10px;
    font-size: 14px; color: #7dd3c8;
  }

  .wwn .wwn-hero-time strong { color: #2dd4bf; font-weight: 700; }

  /* ── CONTENT ── */
  .wwn .wwn-content {
    max-width: 820px; margin: 0 auto;
    padding: 0 32px 100px;
  }

  .wwn .wwn-section-label {
    font-size: 11px; font-weight: 700; color: #2dd4bf;
    text-transform: uppercase; letter-spacing: 0.1em;
    margin-bottom: 32px; text-align: center;
  }

  /* ── REQUIREMENT CARDS ── */
  .wwn .wwn-req {
    background: rgba(15,23,41,0.75);
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 20px;
    padding: 40px 40px 36px;
    margin-bottom: 24px;
    position: relative; overflow: hidden;
  }

  .wwn .wwn-req::before {
    content: '';
    position: absolute; top: 0; left: 0; right: 0; height: 3px;
    background: linear-gradient(90deg, #14B8A6, #2dd4bf, transparent);
  }

  .wwn .wwn-req-header {
    display: flex; align-items: flex-start; gap: 20px; margin-bottom: 28px;
  }

  .wwn .wwn-req-icon {
    width: 52px; height: 52px; flex-shrink: 0;
    background: rgba(45,212,191,0.1);
    border: 1px solid rgba(45,212,191,0.2);
    border-radius: 14px;
    display: flex; align-items: center; justify-content: center;
  }

  .wwn .wwn-req-num {
    position: absolute; top: -6px; right: -6px;
    width: 20px; height: 20px; border-radius: 50%;
    background: #14B8A6; color: #080d18;
    font-family: 'Syne', sans-serif; font-weight: 800; font-size: 10px;
    display: flex; align-items: center; justify-content: center;
  }

  .wwn .wwn-req-icon-wrap { position: relative; flex-shrink: 0; }

  .wwn .wwn-req-title {
    font-family: 'Syne', sans-serif; font-size: 22px; font-weight: 800;
    color: #fff; margin-bottom: 6px;
  }

  .wwn .wwn-req-tagline {
    font-size: 14px; color: #7b8499; line-height: 1.6;
  }

  .wwn .wwn-divider {
    height: 1px; background: rgba(255,255,255,0.06); margin-bottom: 28px;
  }

  .wwn .wwn-why-label {
    font-size: 11px; font-weight: 700; color: #64748b;
    text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 16px;
  }

  .wwn .wwn-why-grid {
    display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 0;
  }

  .wwn .wwn-why-item {
    display: flex; align-items: flex-start; gap: 11px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 11px; padding: 14px 16px;
  }

  .wwn .wwn-why-dot {
    width: 6px; height: 6px; border-radius: 50%;
    background: #2dd4bf; flex-shrink: 0; margin-top: 7px;
  }

  .wwn .wwn-why-text { font-size: 13px; color: #94a3b8; line-height: 1.55; }
  .wwn .wwn-why-text strong { display: block; color: #cbd5e1; font-weight: 600; font-size: 13px; margin-bottom: 2px; }

  /* ── CALIFORNIA CALLOUT ── */
  .wwn .wwn-ca-note {
    display: flex; align-items: flex-start; gap: 14px;
    background: rgba(251,191,36,0.06);
    border: 1px solid rgba(251,191,36,0.2);
    border-radius: 12px; padding: 18px 20px; margin-top: 20px;
  }

  .wwn .wwn-ca-icon {
    width: 32px; height: 32px; flex-shrink: 0;
    background: rgba(251,191,36,0.1); border-radius: 8px;
    display: flex; align-items: center; justify-content: center; font-size: 16px;
  }

  .wwn .wwn-ca-title {
    font-size: 13px; font-weight: 700; color: #fbbf24; margin-bottom: 4px;
  }

  .wwn .wwn-ca-text {
    font-size: 13px; color: #94a3b8; line-height: 1.6;
  }

  .wwn .wwn-ca-text strong { color: #e8eaf0; font-weight: 600; }

  /* ── CHECKLIST ── */
  .wwn .wwn-checklist {
    margin-top: 24px; padding: 20px 24px;
    background: rgba(45,212,191,0.04);
    border: 1px solid rgba(45,212,191,0.12);
    border-radius: 12px;
  }

  .wwn .wwn-checklist-title {
    font-size: 12px; font-weight: 700; color: #2dd4bf;
    text-transform: uppercase; letter-spacing: 0.07em; margin-bottom: 14px;
  }

  .wwn .wwn-checklist-item {
    display: flex; align-items: center; gap: 10px;
    font-size: 13px; color: #cbd5e1; padding: 5px 0;
  }

  .wwn .wwn-check-circle {
    width: 18px; height: 18px; flex-shrink: 0;
    background: rgba(45,212,191,0.15); border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
  }

  /* ── CLOSING CTA ── */
  .wwn .wwn-cta {
    margin-top: 48px;
    background: linear-gradient(135deg, rgba(20,184,166,0.12) 0%, rgba(15,23,41,0.6) 100%);
    border: 1px solid rgba(45,212,191,0.2);
    border-radius: 24px; padding: 56px 48px;
    text-align: center; position: relative; overflow: hidden;
  }

  .wwn .wwn-cta::before {
    content: '';
    position: absolute; top: 0; left: 0; right: 0; height: 3px;
    background: linear-gradient(90deg, #14B8A6, #2dd4bf);
  }

  .wwn .wwn-cta-icon {
    width: 64px; height: 64px; margin: 0 auto 24px;
    background: rgba(45,212,191,0.1);
    border: 1px solid rgba(45,212,191,0.25);
    border-radius: 18px;
    display: flex; align-items: center; justify-content: center;
  }

  .wwn .wwn-cta-title {
    font-family: 'Syne', sans-serif;
    font-size: clamp(24px, 4vw, 36px); font-weight: 800; line-height: 1.2;
    color: #fff; margin-bottom: 16px;
  }

  .wwn .wwn-cta-title span { color: #2dd4bf; }

  .wwn .wwn-cta-body {
    font-size: 16px; color: #94a3b8; line-height: 1.75;
    max-width: 560px; margin: 0 auto 36px;
  }

  .wwn .wwn-cta-body strong { color: #e8eaf0; font-weight: 600; }

  .wwn .wwn-cta-btns {
    display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;
  }

  .wwn .wwn-btn-primary {
    padding: 14px 32px;
    background: linear-gradient(135deg, #14B8A6, #0d9488);
    border: none; border-radius: 10px;
    color: #080d18; font-family: 'Syne', sans-serif; font-weight: 700; font-size: 15px;
    cursor: pointer; text-decoration: none; display: inline-block;
    transition: opacity 0.2s, transform 0.1s;
  }

  .wwn .wwn-btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }

  .wwn .wwn-btn-ghost {
    padding: 14px 28px;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 10px;
    color: #94a3b8; font-family: 'DM Sans', sans-serif; font-weight: 600; font-size: 15px;
    cursor: pointer; text-decoration: none; display: inline-block;
    transition: all 0.2s;
  }

  .wwn .wwn-btn-ghost:hover { background: rgba(255,255,255,0.09); color: #e8eaf0; }

  .wwn .wwn-disclaimer {
    font-size: 12px; color: #4b5568; margin-top: 20px; line-height: 1.6;
  }

  /* ── FOOTER ── */
  .wwn .wwn-footer {
    text-align: center; padding: 32px;
    border-top: 1px solid rgba(255,255,255,0.06);
    font-size: 12px; color: #4b5568;
  }

  @media (max-width: 640px) {
    .wwn .wwn-hero { padding: 52px 20px 48px; }
    .wwn .wwn-content { padding: 0 16px 72px; }
    .wwn .wwn-req { padding: 28px 20px 24px; }
    .wwn .wwn-why-grid { grid-template-columns: 1fr; }
    .wwn .wwn-cta { padding: 36px 24px; }
    .wwn .wwn-header { padding: 14px 20px; }
    .wwn .wwn-req-header { flex-direction: column; gap: 12px; }
  }
`;

// SVG Icons
const IconClipboard = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#2dd4bf" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 2H15a1 1 0 0 1 1 1v1H8V3a1 1 0 0 1 1-1z"/>
    <path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2"/>
    <line x1="12" y1="11" x2="12" y2="17"/>
    <line x1="9" y1="14" x2="15" y2="14"/>
  </svg>
);

const IconBank = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#2dd4bf" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3,22 21,22"/>
    <polyline points="5,22 5,12"/>
    <polyline points="9,22 9,12"/>
    <polyline points="13,22 13,12"/>
    <polyline points="17,22 17,12"/>
    <polyline points="19,22 19,12"/>
    <polygon points="12,2 3,9 21,9"/>
  </svg>
);

const IconCheck = () => (
  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
    <polyline points="2,6 5,9 10,3" stroke="#2dd4bf" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconClock = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2dd4bf" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12,6 12,12 16,14"/>
  </svg>
);

const IconLightning = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2dd4bf" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13,2 3,14 12,14 11,22 21,10 12,10"/>
  </svg>
);

export default function WhatWeNeed() {
  return (
    <div className="wwn">
      <style>{PAGE_CSS}</style>

      {/* Header */}
      <header className="wwn-header">
        <div className="wwn-logo">
          <div className="wwn-logo-mark">TCG</div>
          <div>
            <div className="wwn-logo-text">Today Capital Group</div>
            <div className="wwn-logo-sub">Merchant Cash Advance</div>
          </div>
        </div>
        <a href="/intake" className="wwn-apply-btn">Start Application</a>
      </header>

      {/* Hero */}
      <section className="wwn-hero">
        <div className="wwn-badge">
          <IconClock />
          Simple &amp; Fast Process
        </div>
        <h1 className="wwn-hero-title">
          Everything you need to <span>get funded.</span>
        </h1>
        <p className="wwn-hero-sub">
          We've made the process as simple as possible. There are only two things we need from you — and we'll walk you through exactly why we need each one.
        </p>
        <div className="wwn-hero-time">
          <IconClock />
          Once we have both items, qualified businesses can receive an offer in as little as&nbsp;<strong>24 hours.</strong>
        </div>
      </section>

      {/* Content */}
      <main className="wwn-content">
        <p className="wwn-section-label">What we need from you</p>

        {/* ── Requirement 1: The Application ── */}
        <div className="wwn-req">
          <div className="wwn-req-header">
            <div className="wwn-req-icon-wrap">
              <div className="wwn-req-icon"><IconClipboard /></div>
              <div className="wwn-req-num">1</div>
            </div>
            <div>
              <h2 className="wwn-req-title">The Application</h2>
              <p className="wwn-req-tagline">Basic information about you and your business — takes about 5 minutes to complete online.</p>
            </div>
          </div>

          <div className="wwn-divider" />

          <p className="wwn-why-label">Why we need this</p>
          <div className="wwn-why-grid">
            <div className="wwn-why-item">
              <div className="wwn-why-dot" />
              <div className="wwn-why-text">
                <strong>Verify your business identity</strong>
                We confirm your business name, address, and how long you've been operating so lenders know they're working with a legitimate, established business.
              </div>
            </div>
            <div className="wwn-why-item">
              <div className="wwn-why-dot" />
              <div className="wwn-why-text">
                <strong>Understand your funding needs</strong>
                The amount you're requesting and what you'll use it for helps us match you with the right lenders and the right product for your situation.
              </div>
            </div>
            <div className="wwn-why-item">
              <div className="wwn-why-dot" />
              <div className="wwn-why-text">
                <strong>Confirm ownership</strong>
                Lenders require the name, ownership percentage, and date of birth of anyone who owns 50% or more of the business — this is standard across every lender we work with.
              </div>
            </div>
            <div className="wwn-why-item">
              <div className="wwn-why-dot" />
              <div className="wwn-why-text">
                <strong>Establish contact for your offer</strong>
                Once approved, we need to be able to reach you quickly. The faster we can connect, the faster you can review your offer and get your funds.
              </div>
            </div>
          </div>

          <div className="wwn-checklist">
            <p className="wwn-checklist-title">What the application covers</p>
            {[
              "Business legal name and address",
              "Industry type and time in business",
              "Estimated monthly revenue",
              "Funding amount requested and intended use",
              "Owner name, date of birth, and ownership %",
              "Contact phone and email",
            ].map((item) => (
              <div key={item} className="wwn-checklist-item">
                <div className="wwn-check-circle"><IconCheck /></div>
                {item}
              </div>
            ))}
          </div>
        </div>

        {/* ── Requirement 2: Bank Statements ── */}
        <div className="wwn-req">
          <div className="wwn-req-header">
            <div className="wwn-req-icon-wrap">
              <div className="wwn-req-icon"><IconBank /></div>
              <div className="wwn-req-num">2</div>
            </div>
            <div>
              <h2 className="wwn-req-title">Bank Statements</h2>
              <p className="wwn-req-tagline">The most recent 3 months of your business bank statements — downloaded directly from your bank's website.</p>
            </div>
          </div>

          <div className="wwn-divider" />

          <p className="wwn-why-label">Why we need this</p>
          <div className="wwn-why-grid">
            <div className="wwn-why-item">
              <div className="wwn-why-dot" />
              <div className="wwn-why-text">
                <strong>Verify your actual revenue</strong>
                Lenders look at your real deposits — not just what you report — to determine how much you qualify for and at what terms. Strong, consistent deposits work in your favor.
              </div>
            </div>
            <div className="wwn-why-item">
              <div className="wwn-why-dot" />
              <div className="wwn-why-text">
                <strong>Assess cash flow health</strong>
                We look at how money moves in and out of your account each month. Healthy cash flow signals to lenders that your business can comfortably handle daily or weekly payments.
              </div>
            </div>
            <div className="wwn-why-item">
              <div className="wwn-why-dot" />
              <div className="wwn-why-text">
                <strong>Check for existing advances</strong>
                Statements let lenders see if you have any active MCA payments already going out. This affects how much additional funding makes sense for your cash flow.
              </div>
            </div>
            <div className="wwn-why-item">
              <div className="wwn-why-dot" />
              <div className="wwn-why-text">
                <strong>Confirm account standing</strong>
                Lenders want to see that your account is in good standing — no excessive overdrafts or negative balances — before extending an offer.
              </div>
            </div>
          </div>

          {/* California callout */}
          <div className="wwn-ca-note">
            <div className="wwn-ca-icon">☀️</div>
            <div>
              <p className="wwn-ca-title">California Businesses — 4 Months Required</p>
              <p className="wwn-ca-text">
                If your business operates in California, lenders require <strong>the last 4 months</strong> of bank statements instead of 3. This is a California-specific lending disclosure requirement and applies regardless of which lender you're matched with. Make sure to include all pages of each monthly statement.
              </p>
            </div>
          </div>

          <div className="wwn-checklist">
            <p className="wwn-checklist-title">Statement tips for the fastest review</p>
            {[
              "Download directly from your bank's website as a PDF",
              "Include all pages — even blank ones at the end",
              "Statements must be for your business account, not personal",
              "Must show your business name and account number",
              "3 months for most states · 4 months if you're in California",
            ].map((item) => (
              <div key={item} className="wwn-checklist-item">
                <div className="wwn-check-circle"><IconCheck /></div>
                {item}
              </div>
            ))}
          </div>
        </div>

        {/* ── Closing CTA ── */}
        <div className="wwn-cta">
          <div className="wwn-cta-icon"><IconLightning /></div>
          <h2 className="wwn-cta-title">
            That's it. Two things, and we take it from there.
          </h2>
          <p className="wwn-cta-body">
            Once we have your completed application and bank statements, our team gets to work right away. <strong>If you qualify, we can potentially have an offer in front of you within 24 hours</strong> — with clear terms, no surprises, and zero obligation to accept.
          </p>
          <div className="wwn-cta-btns">
            <a href="/intake" className="wwn-btn-primary">Start My Application</a>
            <a href="/upload-statements" className="wwn-btn-ghost">Upload Statements</a>
          </div>
          <p className="wwn-disclaimer">
            Approval is not guaranteed and is subject to underwriting review. Offer timing may vary based on application completeness and lender availability.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="wwn-footer">
        &copy; {new Date().getFullYear()} Today Capital Group &nbsp;&middot;&nbsp; All rights reserved
      </footer>
    </div>
  );
}
