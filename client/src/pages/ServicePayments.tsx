import { useState, useEffect } from "react";

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Libre+Franklin:wght@300;400;500;600&display=swap');

  .pay-page * { box-sizing: border-box; margin: 0; padding: 0; }

  .pay-page {
    font-family: 'Libre Franklin', sans-serif;
    background: #060b14;
    color: #e2e6ed;
    min-height: 100vh;
    overflow-x: hidden;
  }

  .pay-page .hero {
    position: relative;
    padding: 56px 24px 64px;
    max-width: 720px;
    margin: 0 auto;
  }

  .pay-page .hero::before {
    content: '';
    position: absolute;
    top: -120px; left: -200px;
    width: 600px; height: 600px;
    background: radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 65%);
    pointer-events: none;
  }

  .pay-page .logo-row {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 56px;
    position: relative;
  }

  .pay-page .logo-mark {
    width: 36px; height: 36px;
    background: linear-gradient(135deg, #10b981, #34d399);
    border-radius: 9px;
    display: flex; align-items: center; justify-content: center;
    font-family: 'Outfit', sans-serif; font-weight: 800; font-size: 14px; color: #060b14;
  }

  .pay-page .logo-text {
    font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 14px;
  }

  .pay-page .logo-sub {
    font-size: 10px; color: #10b981; text-transform: uppercase; letter-spacing: 0.1em;
  }

  .pay-page .tag {
    display: inline-block;
    padding: 6px 14px;
    background: rgba(16,185,129,0.1);
    border: 1px solid rgba(16,185,129,0.25);
    border-radius: 100px;
    font-size: 12px;
    font-weight: 600;
    color: #34d399;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    margin-bottom: 20px;
  }

  .pay-page h1 {
    font-family: 'Outfit', sans-serif;
    font-size: 40px;
    font-weight: 800;
    line-height: 1.1;
    margin-bottom: 20px;
    letter-spacing: -0.02em;
  }

  .pay-page h1 .accent { color: #34d399; }

  .pay-page .hero-sub {
    font-size: 17px;
    color: #8896ab;
    line-height: 1.7;
    margin-bottom: 36px;
    max-width: 540px;
  }

  .pay-page .stat-row {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    margin-bottom: 48px;
  }

  .pay-page .stat-box {
    background: rgba(16,185,129,0.06);
    border: 1px solid rgba(16,185,129,0.12);
    border-radius: 14px;
    padding: 20px 16px;
    text-align: center;
  }

  .pay-page .stat-num {
    font-family: 'Outfit', sans-serif;
    font-size: 28px;
    font-weight: 800;
    color: #34d399;
    margin-bottom: 4px;
  }

  .pay-page .stat-label {
    font-size: 12px;
    color: #6b7a8d;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .pay-page .features {
    max-width: 720px;
    margin: 0 auto;
    padding: 0 24px 64px;
  }

  .pay-page .section-label {
    font-family: 'Outfit', sans-serif;
    font-size: 11px;
    font-weight: 700;
    color: #10b981;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    margin-bottom: 12px;
  }

  .pay-page .section-title {
    font-family: 'Outfit', sans-serif;
    font-size: 26px;
    font-weight: 700;
    margin-bottom: 32px;
    letter-spacing: -0.01em;
  }

  .pay-page .feat-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }

  .pay-page .feat-card {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 14px;
    padding: 24px 20px;
    transition: border-color 0.3s, background 0.3s;
  }

  .pay-page .feat-card:hover {
    border-color: rgba(16,185,129,0.3);
    background: rgba(16,185,129,0.04);
  }

  .pay-page .feat-icon {
    width: 40px; height: 40px;
    border-radius: 10px;
    background: rgba(16,185,129,0.1);
    display: flex; align-items: center; justify-content: center;
    font-size: 18px;
    margin-bottom: 14px;
  }

  .pay-page .feat-name {
    font-family: 'Outfit', sans-serif;
    font-weight: 700;
    font-size: 15px;
    margin-bottom: 6px;
  }

  .pay-page .feat-desc {
    font-size: 13px;
    color: #7b8a9e;
    line-height: 1.6;
  }

  .pay-page .cta-section {
    max-width: 720px;
    margin: 0 auto;
    padding: 0 24px 80px;
  }

  .pay-page .cta-card {
    background: linear-gradient(135deg, rgba(16,185,129,0.08), rgba(16,185,129,0.02));
    border: 1px solid rgba(16,185,129,0.2);
    border-radius: 20px;
    padding: 40px 32px;
  }

  .pay-page .cta-card h2 {
    font-family: 'Outfit', sans-serif;
    font-size: 24px;
    font-weight: 700;
    margin-bottom: 8px;
  }

  .pay-page .cta-card .sub {
    color: #7b8a9e;
    font-size: 15px;
    line-height: 1.6;
    margin-bottom: 28px;
  }

  .pay-page .form-row {
    display: flex;
    gap: 12px;
    margin-bottom: 12px;
  }

  .pay-page .field {
    flex: 1;
    padding: 14px 16px;
    background: rgba(0,0,0,0.3);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 10px;
    color: #e2e6ed;
    font-size: 14px;
    font-family: 'Libre Franklin', sans-serif;
    outline: none;
    transition: border-color 0.2s;
  }

  .pay-page .field:focus { border-color: rgba(16,185,129,0.5); }
  .pay-page .field::placeholder { color: #4a5568; }

  .pay-page .cta-btn {
    width: 100%;
    padding: 15px;
    background: linear-gradient(135deg, #10b981, #059669);
    border: none;
    border-radius: 10px;
    color: #fff;
    font-family: 'Outfit', sans-serif;
    font-weight: 700;
    font-size: 15px;
    cursor: pointer;
    transition: opacity 0.2s, transform 0.1s;
  }

  .pay-page .cta-btn:hover { opacity: 0.9; transform: translateY(-1px); }
  .pay-page .cta-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }

  .pay-page .fine { font-size: 12px; color: #4a5568; margin-top: 12px; text-align: center; }

  .pay-page .success-wrap {
    text-align: center;
    padding: 48px 24px;
  }

  .pay-page .success-icon {
    width: 64px; height: 64px;
    background: rgba(16,185,129,0.12);
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    margin: 0 auto 20px;
    font-size: 28px;
  }

  @media (max-width: 640px) {
    .pay-page h1 { font-size: 28px; }
    .pay-page .stat-row { grid-template-columns: 1fr; }
    .pay-page .feat-grid { grid-template-columns: 1fr; }
    .pay-page .form-row { flex-direction: column; }
    .pay-page .hero { padding: 40px 16px 48px; }
    .pay-page .features, .pay-page .cta-section { padding-left: 16px; padding-right: 16px; }
  }
`;

export default function ServicePayments() {
  const [email, setEmail] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [monthlyVolume, setMonthlyVolume] = useState("");
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
          service: "payments",
          otherDetails: monthlyVolume ? `Monthly volume: ${monthlyVolume}` : undefined,
          source: "landing-page",
        }),
      });
    } catch (_) {}

    setSubmitted(true);
    setSubmitting(false);
  };

  return (
    <div className="pay-page">
      <style>{CSS}</style>

      <div className="hero">
        <div className="logo-row">
          <div className="logo-mark">TCG</div>
          <div>
            <div className="logo-text">Today Capital Group</div>
            <div className="logo-sub">Payment Processing</div>
          </div>
        </div>

        <div className="tag">Stop Overpaying</div>
        <h1>Your processor is <span className="accent">taking too much</span>.</h1>
        <p className="hero-sub">
          Most businesses are paying 30-50% more than they need to in processing fees. We fix that. Lower rates, next-day deposits, zero long-term contracts. Same POS, better margins.
        </p>

        <div className="stat-row">
          <div className="stat-box">
            <div className="stat-num">0.5%</div>
            <div className="stat-label">Avg. Rate Reduction</div>
          </div>
          <div className="stat-box">
            <div className="stat-num">24hr</div>
            <div className="stat-label">Deposit Speed</div>
          </div>
          <div className="stat-box">
            <div className="stat-num">$0</div>
            <div className="stat-label">Cancellation Fees</div>
          </div>
        </div>
      </div>

      <div className="features">
        <div className="section-label">What you get</div>
        <div className="section-title">Processing that actually works for you.</div>
        <div className="feat-grid">
          <div className="feat-card">
            <div className="feat-icon">%</div>
            <div className="feat-name">Lower Interchange Rates</div>
            <div className="feat-desc">We negotiate directly with processors to get you rates that match your volume and industry.</div>
          </div>
          <div className="feat-card">
            <div className="feat-icon">$</div>
            <div className="feat-name">Next-Day Deposits</div>
            <div className="feat-desc">Stop waiting 3-5 days for your money. Get funded the next business day, every time.</div>
          </div>
          <div className="feat-card">
            <div className="feat-icon">#</div>
            <div className="feat-name">No Long-Term Contracts</div>
            <div className="feat-desc">Month-to-month. If we're not saving you money, you can walk. No early termination fees.</div>
          </div>
          <div className="feat-card">
            <div className="feat-icon">+</div>
            <div className="feat-name">Works With Your POS</div>
            <div className="feat-desc">Clover, Square, Toast, custom setups. We integrate with what you already use.</div>
          </div>
        </div>
      </div>

      <div className="cta-section">
        {submitted ? (
          <div className="cta-card">
            <div className="success-wrap">
              <div className="success-icon">&#10003;</div>
              <h2>We'll be in touch.</h2>
              <p style={{ color: "#7b8a9e", fontSize: 15, lineHeight: 1.7, marginTop: 8 }}>
                We're pulling together a rate comparison for your business. Expect to hear from us within 24 hours.
              </p>
            </div>
          </div>
        ) : (
          <div className="cta-card">
            <h2>See how much you could save.</h2>
            <p className="sub">Send us your info and we'll run a free rate comparison against your current processor. No commitment.</p>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <input className="field" type="email" placeholder="Your email *" value={email} onChange={e => setEmail(e.target.value)} required />
                <input className="field" type="tel" placeholder="Phone (optional)" value={phone} onChange={e => setPhone(e.target.value)} />
              </div>
              <div className="form-row">
                <input className="field" placeholder="Business name" value={businessName} onChange={e => setBusinessName(e.target.value)} />
                <input className="field" placeholder="Monthly card volume (approx)" value={monthlyVolume} onChange={e => setMonthlyVolume(e.target.value)} />
              </div>
              <button className="cta-btn" type="submit" disabled={submitting || !email}>
                {submitting ? "Submitting..." : "Get My Free Rate Comparison"}
              </button>
              <p className="fine">No contracts. No pressure. Just a side-by-side comparison.</p>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
