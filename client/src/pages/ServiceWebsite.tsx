import { useState, useEffect } from "react";

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Manrope:wght@300;400;500;600;700;800&display=swap');

  .web-page * { box-sizing: border-box; margin: 0; padding: 0; }

  .web-page {
    font-family: 'Manrope', sans-serif;
    background: #06090f;
    color: #dde1ea;
    min-height: 100vh;
    overflow-x: hidden;
  }

  .web-page .hero {
    position: relative;
    padding: 56px 24px 72px;
    max-width: 720px;
    margin: 0 auto;
  }

  .web-page .hero::before {
    content: '';
    position: absolute;
    top: -80px; right: -160px;
    width: 500px; height: 500px;
    background: radial-gradient(circle, rgba(6,182,212,0.10) 0%, transparent 60%);
    pointer-events: none;
  }

  .web-page .hero::after {
    content: '';
    position: absolute;
    bottom: 0; left: 0; right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(6,182,212,0.2), transparent);
  }

  .web-page .logo-row {
    display: flex; align-items: center; gap: 10px;
    margin-bottom: 56px; position: relative;
  }

  .web-page .logo-mark {
    width: 36px; height: 36px;
    background: linear-gradient(135deg, #06b6d4, #22d3ee);
    border-radius: 9px;
    display: flex; align-items: center; justify-content: center;
    font-family: 'Manrope', sans-serif; font-weight: 800; font-size: 14px; color: #06090f;
  }

  .web-page .logo-text { font-weight: 700; font-size: 14px; }
  .web-page .logo-sub { font-size: 10px; color: #06b6d4; text-transform: uppercase; letter-spacing: 0.1em; }

  .web-page .badge {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 5px 12px;
    background: rgba(6,182,212,0.08);
    border: 1px solid rgba(6,182,212,0.2);
    border-radius: 6px;
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    color: #22d3ee;
    margin-bottom: 20px;
  }

  .web-page .badge .dot {
    width: 6px; height: 6px;
    background: #22d3ee;
    border-radius: 50%;
    animation: blink 2s infinite;
  }

  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }

  .web-page h1 {
    font-size: 42px;
    font-weight: 800;
    line-height: 1.08;
    margin-bottom: 20px;
    letter-spacing: -0.03em;
  }

  .web-page h1 .accent { color: #22d3ee; }

  .web-page .hero-sub {
    font-size: 16px;
    color: #7a8699;
    line-height: 1.7;
    margin-bottom: 40px;
    max-width: 520px;
  }

  .web-page .preview-bar {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 14px;
    padding: 20px;
    display: flex;
    gap: 20px;
    align-items: center;
  }

  .web-page .preview-mock {
    width: 160px; height: 100px;
    background: linear-gradient(135deg, rgba(6,182,212,0.15), rgba(6,182,212,0.05));
    border: 1px solid rgba(6,182,212,0.15);
    border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    color: #22d3ee;
    flex-shrink: 0;
  }

  .web-page .preview-text h3 {
    font-size: 15px; font-weight: 700; margin-bottom: 6px;
  }

  .web-page .preview-text p {
    font-size: 13px; color: #6b7a8d; line-height: 1.5;
  }

  .web-page .process {
    max-width: 720px;
    margin: 0 auto;
    padding: 64px 24px;
  }

  .web-page .section-label {
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    color: #06b6d4;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    margin-bottom: 12px;
  }

  .web-page .section-title {
    font-size: 26px;
    font-weight: 700;
    margin-bottom: 36px;
    letter-spacing: -0.01em;
  }

  .web-page .timeline {
    position: relative;
    padding-left: 32px;
  }

  .web-page .timeline::before {
    content: '';
    position: absolute;
    left: 11px; top: 8px; bottom: 8px;
    width: 1px;
    background: linear-gradient(180deg, #06b6d4, rgba(6,182,212,0.1));
  }

  .web-page .tl-item {
    position: relative;
    margin-bottom: 32px;
  }

  .web-page .tl-item:last-child { margin-bottom: 0; }

  .web-page .tl-dot {
    position: absolute;
    left: -32px; top: 4px;
    width: 22px; height: 22px;
    background: #06090f;
    border: 2px solid #06b6d4;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-family: 'Space Mono', monospace;
    font-size: 10px; color: #22d3ee; font-weight: 700;
  }

  .web-page .tl-title {
    font-weight: 700;
    font-size: 16px;
    margin-bottom: 4px;
  }

  .web-page .tl-desc {
    font-size: 14px;
    color: #6b7a8d;
    line-height: 1.6;
  }

  .web-page .includes {
    max-width: 720px;
    margin: 0 auto;
    padding: 0 24px 64px;
  }

  .web-page .inc-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .web-page .inc-item {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 16px;
    background: rgba(255,255,255,0.02);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 10px;
  }

  .web-page .inc-check {
    width: 20px; height: 20px;
    background: rgba(6,182,212,0.12);
    border-radius: 5px;
    display: flex; align-items: center; justify-content: center;
    color: #22d3ee;
    font-size: 12px;
    font-weight: 700;
    flex-shrink: 0;
    margin-top: 1px;
  }

  .web-page .inc-text {
    font-size: 14px;
    font-weight: 500;
    color: #b0b8c8;
  }

  .web-page .cta-section {
    max-width: 720px;
    margin: 0 auto;
    padding: 0 24px 80px;
  }

  .web-page .cta-card {
    background: rgba(6,182,212,0.04);
    border: 1px solid rgba(6,182,212,0.15);
    border-radius: 20px;
    padding: 40px 32px;
  }

  .web-page .cta-card h2 {
    font-size: 24px; font-weight: 700; margin-bottom: 8px;
  }

  .web-page .cta-card .sub {
    color: #6b7a8d; font-size: 15px; line-height: 1.6; margin-bottom: 28px;
  }

  .web-page .form-row {
    display: flex; gap: 12px; margin-bottom: 12px;
  }

  .web-page .field {
    flex: 1; padding: 14px 16px;
    background: rgba(0,0,0,0.4);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 10px;
    color: #dde1ea; font-size: 14px;
    font-family: 'Manrope', sans-serif;
    outline: none; transition: border-color 0.2s;
  }

  .web-page .field:focus { border-color: rgba(6,182,212,0.5); }
  .web-page .field::placeholder { color: #3d4a5c; }

  .web-page .cta-btn {
    width: 100%; padding: 15px;
    background: linear-gradient(135deg, #06b6d4, #0891b2);
    border: none; border-radius: 10px;
    color: #fff;
    font-family: 'Manrope', sans-serif;
    font-weight: 700; font-size: 15px;
    cursor: pointer;
    transition: opacity 0.2s, transform 0.1s;
  }

  .web-page .cta-btn:hover { opacity: 0.9; transform: translateY(-1px); }
  .web-page .cta-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }

  .web-page .fine { font-size: 12px; color: #3d4a5c; margin-top: 12px; text-align: center; }

  .web-page .success-wrap { text-align: center; padding: 48px 24px; }

  .web-page .success-icon {
    width: 64px; height: 64px;
    background: rgba(6,182,212,0.12);
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    margin: 0 auto 20px; font-size: 28px;
  }

  @media (max-width: 640px) {
    .web-page h1 { font-size: 28px; }
    .web-page .hero { padding: 40px 16px 48px; }
    .web-page .preview-bar { flex-direction: column; text-align: center; }
    .web-page .preview-mock { width: 100%; height: 80px; }
    .web-page .inc-grid { grid-template-columns: 1fr; }
    .web-page .form-row { flex-direction: column; }
    .web-page .process, .web-page .includes, .web-page .cta-section { padding-left: 16px; padding-right: 16px; }
  }
`;

export default function ServiceWebsite() {
  const [email, setEmail] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [currentSite, setCurrentSite] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const e = params.get("email");
    if (e) setEmail(e);
  }, []);

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
          otherDetails: currentSite ? `Current site: ${currentSite}` : undefined,
          source: "landing-page",
        }),
      });
    } catch (_) {}

    setSubmitted(true);
    setSubmitting(false);
  };

  return (
    <div className="web-page">
      <style>{CSS}</style>

      <div className="hero">
        <div className="logo-row">
          <div className="logo-mark">TCG</div>
          <div>
            <div className="logo-text">Today Capital Group</div>
            <div className="logo-sub">Web Development</div>
          </div>
        </div>

        <div className="badge"><span className="dot" /> Now Accepting Projects</div>
        <h1>A website that <span className="accent">actually works</span> for you.</h1>
        <p className="hero-sub">
          Not a template. Not a DIY drag-and-drop. A custom-built site designed to bring in leads, rank on Google, and make your business look as good online as it is in person.
        </p>

        <div className="preview-bar">
          <div className="preview-mock">&lt;your-brand/&gt;</div>
          <div className="preview-text">
            <h3>Built to convert, not just to look pretty.</h3>
            <p>Every page is designed with one goal: turn visitors into customers. Fast load times, mobile-first, SEO baked in from day one.</p>
          </div>
        </div>
      </div>

      <div className="process">
        <div className="section-label">How it works</div>
        <div className="section-title">Live in 2 weeks. Not 2 months.</div>
        <div className="timeline">
          <div className="tl-item">
            <div className="tl-dot">1</div>
            <div className="tl-title">Discovery Call</div>
            <div className="tl-desc">We learn your business, your customers, and what you need the site to do. 30 minutes.</div>
          </div>
          <div className="tl-item">
            <div className="tl-dot">2</div>
            <div className="tl-title">Design + Copy</div>
            <div className="tl-desc">We handle the design, layout, and all the written content. You review and we refine.</div>
          </div>
          <div className="tl-item">
            <div className="tl-dot">3</div>
            <div className="tl-title">Build + Launch</div>
            <div className="tl-desc">We develop, test, and push it live. Domain, hosting, SSL, analytics. All handled.</div>
          </div>
          <div className="tl-item">
            <div className="tl-dot">4</div>
            <div className="tl-title">Ongoing Support</div>
            <div className="tl-desc">Need changes? New pages? SEO updates? We're here. No hourly billing surprises.</div>
          </div>
        </div>
      </div>

      <div className="includes">
        <div className="section-label">Everything included</div>
        <div className="section-title">No hidden costs. No add-on pricing.</div>
        <div className="inc-grid">
          {[
            "Custom design, not a template",
            "Mobile-first responsive layout",
            "SEO optimization + Google setup",
            "Lead capture forms",
            "Fast hosting + SSL certificate",
            "Google Analytics integration",
            "Content writing + copyediting",
            "Domain setup + configuration",
          ].map((item, i) => (
            <div className="inc-item" key={i}>
              <div className="inc-check">&#10003;</div>
              <div className="inc-text">{item}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="cta-section">
        {submitted ? (
          <div className="cta-card">
            <div className="success-wrap">
              <div className="success-icon">&#10003;</div>
              <h2>We'll reach out soon.</h2>
              <p style={{ color: "#6b7a8d", fontSize: 15, lineHeight: 1.7, marginTop: 8 }}>
                We're reviewing your info and will follow up within 24 hours to schedule a discovery call.
              </p>
            </div>
          </div>
        ) : (
          <div className="cta-card">
            <h2>Let's build something worth visiting.</h2>
            <p className="sub">Tell us about your business and we'll put together a plan. No commitment, no pressure.</p>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <input className="field" type="email" placeholder="Your email *" value={email} onChange={e => setEmail(e.target.value)} required />
                <input className="field" type="tel" placeholder="Phone (optional)" value={phone} onChange={e => setPhone(e.target.value)} />
              </div>
              <div className="form-row">
                <input className="field" placeholder="Business name" value={businessName} onChange={e => setBusinessName(e.target.value)} />
                <input className="field" placeholder="Current website (if any)" value={currentSite} onChange={e => setCurrentSite(e.target.value)} />
              </div>
              <button className="cta-btn" type="submit" disabled={submitting || !email}>
                {submitting ? "Submitting..." : "Start My Project"}
              </button>
              <p className="fine">Free consultation. We'll scope it out before you commit to anything.</p>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
