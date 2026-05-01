import { useState, useEffect } from "react";

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap');

  .crm-page * { box-sizing: border-box; margin: 0; padding: 0; }

  .crm-page {
    font-family: 'Plus Jakarta Sans', sans-serif;
    background: #070a12;
    color: #e0e4ec;
    min-height: 100vh;
    overflow-x: hidden;
  }

  .crm-page .hero {
    position: relative;
    padding: 56px 24px 72px;
    max-width: 720px;
    margin: 0 auto;
  }

  .crm-page .hero::before {
    content: '';
    position: absolute;
    top: -60px; left: 50%;
    transform: translateX(-50%);
    width: 700px; height: 400px;
    background: radial-gradient(ellipse, rgba(245,158,11,0.08) 0%, transparent 60%);
    pointer-events: none;
  }

  .crm-page .logo-row {
    display: flex; align-items: center; gap: 10px;
    margin-bottom: 56px; position: relative;
  }

  .crm-page .logo-mark {
    width: 36px; height: 36px;
    background: linear-gradient(135deg, #f59e0b, #fbbf24);
    border-radius: 9px;
    display: flex; align-items: center; justify-content: center;
    font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 800; font-size: 14px; color: #070a12;
  }

  .crm-page .logo-text { font-weight: 700; font-size: 14px; }
  .crm-page .logo-sub { font-size: 10px; color: #f59e0b; text-transform: uppercase; letter-spacing: 0.1em; }

  .crm-page .price-tag {
    display: inline-flex; align-items: baseline; gap: 6px;
    margin-bottom: 20px;
  }

  .crm-page .price-tag .amount {
    font-family: 'JetBrains Mono', monospace;
    font-size: 32px;
    font-weight: 700;
    color: #fbbf24;
  }

  .crm-page .price-tag .period {
    font-size: 14px;
    color: #92854a;
    font-weight: 500;
  }

  .crm-page .price-tag .all-in {
    font-size: 11px;
    padding: 3px 8px;
    background: rgba(245,158,11,0.12);
    border: 1px solid rgba(245,158,11,0.2);
    border-radius: 4px;
    color: #fbbf24;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .crm-page h1 {
    font-size: 40px;
    font-weight: 800;
    line-height: 1.1;
    margin-bottom: 20px;
    letter-spacing: -0.025em;
  }

  .crm-page h1 .accent { color: #fbbf24; }

  .crm-page .hero-sub {
    font-size: 16px;
    color: #7a8494;
    line-height: 1.7;
    margin-bottom: 40px;
    max-width: 540px;
  }

  .crm-page .tool-strip {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 48px;
  }

  .crm-page .tool-chip {
    padding: 8px 14px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    color: #b0b8c8;
    transition: all 0.2s;
  }

  .crm-page .tool-chip:hover {
    border-color: rgba(245,158,11,0.3);
    color: #fbbf24;
  }

  .crm-page .compare {
    max-width: 720px;
    margin: 0 auto;
    padding: 0 24px 64px;
  }

  .crm-page .section-label {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    color: #f59e0b;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    margin-bottom: 12px;
  }

  .crm-page .section-title {
    font-size: 26px;
    font-weight: 700;
    margin-bottom: 32px;
    letter-spacing: -0.01em;
  }

  .crm-page .compare-table {
    width: 100%;
    border-collapse: collapse;
  }

  .crm-page .compare-table th {
    text-align: left;
    padding: 12px 16px;
    font-size: 12px;
    font-weight: 700;
    color: #6b7a8d;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }

  .crm-page .compare-table th:nth-child(2),
  .crm-page .compare-table th:nth-child(3) { text-align: center; }

  .crm-page .compare-table td {
    padding: 14px 16px;
    font-size: 14px;
    border-bottom: 1px solid rgba(255,255,255,0.04);
    color: #9aa3b2;
  }

  .crm-page .compare-table td:nth-child(2),
  .crm-page .compare-table td:nth-child(3) { text-align: center; font-weight: 600; }

  .crm-page .compare-table .yes { color: #fbbf24; }
  .crm-page .compare-table .no { color: #3d4655; }
  .crm-page .compare-table .extra { color: #ef4444; font-size: 12px; }

  .crm-page .compare-table .ours {
    background: rgba(245,158,11,0.04);
  }

  .crm-page .feat-section {
    max-width: 720px;
    margin: 0 auto;
    padding: 0 24px 64px;
  }

  .crm-page .feat-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }

  .crm-page .feat-card {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 14px;
    padding: 24px 20px;
    transition: border-color 0.3s;
  }

  .crm-page .feat-card:hover {
    border-color: rgba(245,158,11,0.25);
  }

  .crm-page .feat-icon {
    font-family: 'JetBrains Mono', monospace;
    font-size: 13px;
    font-weight: 700;
    color: #fbbf24;
    margin-bottom: 10px;
    opacity: 0.7;
  }

  .crm-page .feat-name {
    font-weight: 700;
    font-size: 15px;
    margin-bottom: 6px;
  }

  .crm-page .feat-desc {
    font-size: 13px;
    color: #6b7a8d;
    line-height: 1.6;
  }

  .crm-page .cta-section {
    max-width: 720px;
    margin: 0 auto;
    padding: 0 24px 80px;
  }

  .crm-page .cta-card {
    background: linear-gradient(135deg, rgba(245,158,11,0.06), rgba(245,158,11,0.02));
    border: 1px solid rgba(245,158,11,0.18);
    border-radius: 20px;
    padding: 40px 32px;
  }

  .crm-page .cta-card h2 {
    font-size: 24px; font-weight: 700; margin-bottom: 8px;
  }

  .crm-page .cta-card .sub {
    color: #6b7a8d; font-size: 15px; line-height: 1.6; margin-bottom: 28px;
  }

  .crm-page .form-row { display: flex; gap: 12px; margin-bottom: 12px; }

  .crm-page .field {
    flex: 1; padding: 14px 16px;
    background: rgba(0,0,0,0.35);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 10px;
    color: #e0e4ec; font-size: 14px;
    font-family: 'Plus Jakarta Sans', sans-serif;
    outline: none; transition: border-color 0.2s;
  }

  .crm-page .field:focus { border-color: rgba(245,158,11,0.5); }
  .crm-page .field::placeholder { color: #3d4655; }

  .crm-page .cta-btn {
    width: 100%; padding: 15px;
    background: linear-gradient(135deg, #f59e0b, #d97706);
    border: none; border-radius: 10px;
    color: #fff;
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-weight: 700; font-size: 15px;
    cursor: pointer;
    transition: opacity 0.2s, transform 0.1s;
  }

  .crm-page .cta-btn:hover { opacity: 0.9; transform: translateY(-1px); }
  .crm-page .cta-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }

  .crm-page .fine { font-size: 12px; color: #3d4655; margin-top: 12px; text-align: center; }

  .crm-page .success-wrap { text-align: center; padding: 48px 24px; }

  .crm-page .success-icon {
    width: 64px; height: 64px;
    background: rgba(245,158,11,0.12);
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    margin: 0 auto 20px; font-size: 28px;
  }

  @media (max-width: 640px) {
    .crm-page h1 { font-size: 28px; }
    .crm-page .hero { padding: 40px 16px 48px; }
    .crm-page .feat-grid { grid-template-columns: 1fr; }
    .crm-page .form-row { flex-direction: column; }
    .crm-page .compare-table { font-size: 12px; }
    .crm-page .compare-table th, .crm-page .compare-table td { padding: 10px 8px; }
    .crm-page .compare, .crm-page .feat-section, .crm-page .cta-section { padding-left: 16px; padding-right: 16px; }
  }
`;

const COMPARE_ROWS = [
  { feature: "Contact Database", ours: true, others: "Extra $/seat" },
  { feature: "Deal Pipeline", ours: true, others: "Extra $/seat" },
  { feature: "Email Messaging", ours: true, others: "Add-on" },
  { feature: "SMS / Text Messaging", ours: true, others: "Add-on" },
  { feature: "Website Builder", ours: true, others: "Separate tool" },
  { feature: "AI Tools (writing, chat, analytics)", ours: true, others: "Premium tier" },
  { feature: "Automations + Workflows", ours: true, others: "Premium tier" },
  { feature: "Reputation Management", ours: true, others: "Add-on" },
];

export default function ServiceCRM() {
  const [email, setEmail] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [currentCRM, setCurrentCRM] = useState("");
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
          service: "crm",
          otherDetails: currentCRM ? `Current CRM: ${currentCRM}` : undefined,
          source: "landing-page",
        }),
      });
    } catch (_) {}

    setSubmitted(true);
    setSubmitting(false);
  };

  return (
    <div className="crm-page">
      <style>{CSS}</style>

      <div className="hero">
        <div className="logo-row">
          <div className="logo-mark">TCG</div>
          <div>
            <div className="logo-text">Today Capital Group</div>
            <div className="logo-sub">CRM Platform</div>
          </div>
        </div>

        <div className="price-tag">
          <span className="amount">$250</span>
          <span className="period">/month</span>
          <span className="all-in">All Inclusive</span>
        </div>

        <h1>One platform. <span className="accent">Everything</span> you need.</h1>
        <p className="hero-sub">
          Contact database, deal flow, email and SMS messaging, website management, a full suite of AI tools, automations, and more. No per-seat pricing. No add-ons. $250/month for all of it.
        </p>

        <div className="tool-strip">
          {["Contacts", "Deals", "Email", "SMS", "Websites", "AI Tools", "Automations", "Forms", "Calendars", "Analytics", "Reputation"].map(t => (
            <div className="tool-chip" key={t}>{t}</div>
          ))}
        </div>
      </div>

      <div className="compare">
        <div className="section-label">Why switch</div>
        <div className="section-title">What $250/mo gets you vs. the competition.</div>
        <table className="compare-table">
          <thead>
            <tr>
              <th>Feature</th>
              <th>TCG CRM</th>
              <th>Others</th>
            </tr>
          </thead>
          <tbody>
            {COMPARE_ROWS.map((row, i) => (
              <tr key={i}>
                <td>{row.feature}</td>
                <td className="ours"><span className="yes">Included</span></td>
                <td><span className="extra">{row.others}</span></td>
              </tr>
            ))}
            <tr style={{ borderTop: "1px solid rgba(245,158,11,0.15)" }}>
              <td style={{ fontWeight: 700, color: "#e0e4ec" }}>Monthly Cost</td>
              <td className="ours"><span className="yes" style={{ fontSize: 16 }}>$250</span></td>
              <td><span className="extra">$500-2,000+</span></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="feat-section">
        <div className="section-label">Highlights</div>
        <div className="section-title">Built for businesses that want to grow.</div>
        <div className="feat-grid">
          <div className="feat-card">
            <div className="feat-icon">// contacts</div>
            <div className="feat-name">Unlimited Contacts</div>
            <div className="feat-desc">Import your entire list. No caps, no per-contact pricing. Tag, segment, and organize however you want.</div>
          </div>
          <div className="feat-card">
            <div className="feat-icon">// pipeline</div>
            <div className="feat-name">Visual Deal Pipeline</div>
            <div className="feat-desc">Drag-and-drop deal stages. See where every opportunity stands at a glance. Custom stages for your workflow.</div>
          </div>
          <div className="feat-card">
            <div className="feat-icon">// messaging</div>
            <div className="feat-name">Email + SMS Built In</div>
            <div className="feat-desc">Send emails, texts, and automated sequences from the same platform. No Mailchimp. No Twilio. It's all here.</div>
          </div>
          <div className="feat-card">
            <div className="feat-icon">// ai</div>
            <div className="feat-name">AI That Actually Helps</div>
            <div className="feat-desc">Write emails, summarize conversations, score leads, and automate responses. AI tools built into every corner.</div>
          </div>
          <div className="feat-card">
            <div className="feat-icon">// websites</div>
            <div className="feat-name">Website + Funnel Builder</div>
            <div className="feat-desc">Build landing pages, full websites, and funnels without a separate tool. Drag-and-drop, mobile-ready.</div>
          </div>
          <div className="feat-card">
            <div className="feat-icon">// automate</div>
            <div className="feat-name">Workflow Automations</div>
            <div className="feat-desc">Trigger actions based on events. Auto-assign leads, send follow-ups, update tags. Set it once, let it run.</div>
          </div>
        </div>
      </div>

      <div className="cta-section">
        {submitted ? (
          <div className="cta-card">
            <div className="success-wrap">
              <div className="success-icon">&#10003;</div>
              <h2>We'll get you set up.</h2>
              <p style={{ color: "#6b7a8d", fontSize: 15, lineHeight: 1.7, marginTop: 8 }}>
                We'll reach out within 24 hours to walk you through the platform and get your account configured.
              </p>
            </div>
          </div>
        ) : (
          <div className="cta-card">
            <h2>Ready to consolidate?</h2>
            <p className="sub">Drop your info and we'll set up a walkthrough. See the full platform before you commit.</p>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <input className="field" type="email" placeholder="Your email *" value={email} onChange={e => setEmail(e.target.value)} required />
                <input className="field" type="tel" placeholder="Phone (optional)" value={phone} onChange={e => setPhone(e.target.value)} />
              </div>
              <div className="form-row">
                <input className="field" placeholder="Business name" value={businessName} onChange={e => setBusinessName(e.target.value)} />
                <input className="field" placeholder="Current CRM (if any)" value={currentCRM} onChange={e => setCurrentCRM(e.target.value)} />
              </div>
              <button className="cta-btn" type="submit" disabled={submitting || !email}>
                {submitting ? "Submitting..." : "Get a Free Walkthrough"}
              </button>
              <p className="fine">No contracts. Cancel anytime. See it first, decide later.</p>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
