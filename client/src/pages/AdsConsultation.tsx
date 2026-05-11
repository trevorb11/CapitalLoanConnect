import { useState } from "react";

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');

  .ads-page * { box-sizing: border-box; margin: 0; padding: 0; }

  .ads-page {
    font-family: 'DM Sans', sans-serif;
    background: radial-gradient(ellipse at 20% 0%, rgba(99,102,241,0.12) 0%, transparent 50%),
                radial-gradient(ellipse at 80% 100%, rgba(20,184,166,0.08) 0%, transparent 50%),
                #080d18;
    color: #e8eaf0;
    min-height: 100vh;
  }

  .ads-page .wrap {
    max-width: 640px;
    margin: 0 auto;
    padding: 60px 24px 80px;
  }

  .ads-page .logo-row {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 48px;
  }

  .ads-page .logo-mark {
    width: 36px; height: 36px;
    background: linear-gradient(135deg, #6366f1, #818cf8);
    border-radius: 9px;
    display: flex; align-items: center; justify-content: center;
    font-family: 'Syne', sans-serif; font-weight: 800; font-size: 15px; color: #fff;
  }

  .ads-page .logo-text {
    font-family: 'Syne', sans-serif; font-weight: 700; font-size: 14px;
  }

  .ads-page .logo-sub {
    font-size: 10px; color: #818cf8; text-transform: uppercase; letter-spacing: 0.08em;
  }

  .ads-page h1 {
    font-family: 'Syne', sans-serif;
    font-size: 28px;
    font-weight: 700;
    line-height: 1.2;
    margin-bottom: 12px;
  }

  .ads-page .subtitle {
    color: #94a3b8;
    font-size: 15px;
    line-height: 1.7;
    margin-bottom: 36px;
  }

  .ads-page .card {
    background: rgba(15,23,41,0.7);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 16px;
    padding: 28px 24px;
    margin-bottom: 16px;
  }

  .ads-page .field-label {
    display: block; font-size: 13px; font-weight: 600; color: #c8cdd8;
    margin-bottom: 8px;
  }

  .ads-page .field-input {
    width: 100%; padding: 13px 16px;
    background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
    border-radius: 10px; color: #e8eaf0; font-size: 15px;
    font-family: 'DM Sans', sans-serif; outline: none; transition: border-color 0.2s;
  }

  .ads-page .field-input:focus {
    border-color: rgba(99,102,241,0.5); background: rgba(99,102,241,0.04);
  }

  .ads-page .field-input::placeholder { color: #4b5568; }

  .ads-page .spend-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .ads-page .spend-option {
    padding: 16px;
    background: rgba(255,255,255,0.03);
    border: 2px solid rgba(255,255,255,0.08);
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s;
    text-align: center;
  }

  .ads-page .spend-option:hover {
    border-color: rgba(99,102,241,0.3);
    background: rgba(99,102,241,0.04);
  }

  .ads-page .spend-option.selected {
    border-color: #6366f1;
    background: rgba(99,102,241,0.1);
  }

  .ads-page .spend-option .letter {
    display: inline-flex; align-items: center; justify-content: center;
    width: 28px; height: 28px; border-radius: 8px;
    background: rgba(99,102,241,0.15); color: #818cf8;
    font-family: 'Syne', sans-serif; font-weight: 700; font-size: 13px;
    margin-bottom: 8px;
  }

  .ads-page .spend-option.selected .letter {
    background: #6366f1; color: #fff;
  }

  .ads-page .spend-option .range {
    font-size: 14px; font-weight: 600; color: #e8eaf0;
  }

  .ads-page .btn-primary {
    width: 100%;
    padding: 15px;
    background: linear-gradient(135deg, #6366f1, #818cf8);
    border: none;
    border-radius: 10px;
    color: #fff;
    font-family: 'Syne', sans-serif;
    font-weight: 700;
    font-size: 16px;
    cursor: pointer;
    transition: opacity 0.2s, transform 0.1s;
    margin-top: 24px;
  }

  .ads-page .btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }
  .ads-page .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

  .ads-page .intent-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-bottom: 24px;
  }

  .ads-page .intent-option {
    padding: 16px 14px;
    background: rgba(255,255,255,0.03);
    border: 2px solid rgba(255,255,255,0.08);
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s;
    text-align: center;
    font-size: 14px;
    font-weight: 500;
    color: #c8cdd8;
    line-height: 1.4;
  }

  .ads-page .intent-option:hover {
    border-color: rgba(99,102,241,0.3);
    background: rgba(99,102,241,0.04);
    color: #e8eaf0;
  }

  .ads-page .intent-option.selected {
    border-color: #6366f1;
    background: rgba(99,102,241,0.1);
    color: #fff;
  }

  .ads-page .result-card {
    text-align: center;
    padding: 40px 24px;
  }

  .ads-page .result-icon {
    width: 56px; height: 56px;
    background: rgba(99,102,241,0.12);
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    margin: 0 auto 20px;
    font-size: 24px;
  }

  .ads-page .book-btn {
    display: inline-block;
    padding: 14px 36px;
    background: linear-gradient(135deg, #6366f1, #818cf8);
    border-radius: 10px;
    color: #fff;
    font-family: 'Syne', sans-serif;
    font-weight: 700;
    font-size: 15px;
    text-decoration: none;
    transition: opacity 0.2s, transform 0.1s;
    margin-top: 20px;
  }

  .ads-page .book-btn:hover { opacity: 0.9; transform: translateY(-1px); }

  @media (max-width: 640px) {
    .ads-page .wrap { padding: 40px 16px 60px; }
    .ads-page h1 { font-size: 22px; }
    .ads-page .spend-grid, .ads-page .intent-grid { grid-template-columns: 1fr; }
  }
`;

const BOOKING_URL = "https://calendar.app.google/YpZYM3y6ezQbcXbm7";

const SPEND_OPTIONS = [
  { key: "10k-50k", label: "$10k - $50k / Month", letter: "A" },
  { key: "50k-100k", label: "$50k - $100k / Month", letter: "B" },
  { key: "100k-250k", label: "$100k - $250k / Month", letter: "C" },
  { key: "250k+", label: "$250k+ / Month", letter: "D" },
];

const INTENT_OPTIONS = [
  "Create New Ads Weekly",
  "Fix Ads That Aren't Performing",
  "Scale Winning Ads Faster",
  "Not Sure Where to Start",
];

export default function AdsConsultation() {
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [spend, setSpend] = useState("");
  const [intent, setIntent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-fill from URL params
  useState(() => {
    const params = new URLSearchParams(window.location.search);
    const e = params.get("email");
    const i = params.get("intent");
    if (e) setEmail(e);
    if (i) {
      const match = INTENT_OPTIONS.find(o => o.toLowerCase().includes(i.toLowerCase()));
      if (match) setIntent(match);
    }
  });

  const isLowSpend = spend === "10k-50k";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !website || !spend) {
      setError("Please fill in all required fields.");
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      await fetch("/api/ads-consultation/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, website, monthlySpend: spend, intent, submittedAt: new Date().toISOString() }),
      });
      setSubmitted(true);
    } catch (_) {
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="ads-page">
        <style>{CSS}</style>
        <div className="wrap">
          <div className="logo-row">
            <div className="logo-mark">TCG</div>
            <div>
              <div className="logo-text">Today Capital Group</div>
              <div className="logo-sub">x AdBlend</div>
            </div>
          </div>
          <div className="card result-card">
            <div className="result-icon">{isLowSpend ? "\uD83D\uDCA1" : "\uD83D\uDE80"}</div>
            {isLowSpend ? (
              <>
                <h1 style={{ fontSize: 22, marginBottom: 12 }}>Thanks for your interest!</h1>
                <p style={{ color: "#94a3b8", fontSize: 15, lineHeight: 1.7, marginBottom: 8 }}>
                  At your current spend level, a full creative partnership may be more than you need right now. But we'd still love to help.
                </p>
                <p style={{ color: "#c8cdd8", fontSize: 15, lineHeight: 1.7 }}>
                  Book a free 15-minute consultation and we'll walk you through the best ways to get the most out of your ad budget, whether that's with us or on your own.
                </p>
                <a href={BOOKING_URL} target="_blank" rel="noopener noreferrer" className="book-btn">
                  Book Your Free Consultation
                </a>
              </>
            ) : (
              <>
                <h1 style={{ fontSize: 22, marginBottom: 12 }}>We can definitely help.</h1>
                <p style={{ color: "#94a3b8", fontSize: 15, lineHeight: 1.7, marginBottom: 8 }}>
                  Based on your ad spend, you're a great fit for our AdBlend creative partnership. Let's set up a quick call to talk about your goals and build a plan.
                </p>
                <p style={{ color: "#c8cdd8", fontSize: 15, lineHeight: 1.7 }}>
                  Pick a time that works for you and we'll take it from there.
                </p>
                <a href={BOOKING_URL} target="_blank" rel="noopener noreferrer" className="book-btn">
                  Book a Strategy Call
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ads-page">
      <style>{CSS}</style>
      <div className="wrap">
        {/* Logo */}
        <div className="logo-row">
          <div className="logo-mark">TCG</div>
          <div>
            <div className="logo-text">Today Capital Group</div>
            <div className="logo-sub">x AdBlend</div>
          </div>
        </div>

        <h1>Turn your ad spend into real growth.</h1>
        <p className="subtitle">
          The brands that scale fastest aren't running one ad. They're testing new creatives every week, learning what works, and doubling down on the winners. Let's figure out where you stand.
        </p>

        <form onSubmit={handleSubmit}>
          {/* Intent Selection */}
          <div style={{ marginBottom: 28 }}>
            <label className="field-label">What are you looking to do?</label>
            <div className="intent-grid">
              {INTENT_OPTIONS.map(opt => (
                <div
                  key={opt}
                  className={`intent-option ${intent === opt ? "selected" : ""}`}
                  onClick={() => setIntent(opt)}
                >
                  {opt}
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            {/* Email */}
            <div style={{ marginBottom: 18 }}>
              <label className="field-label">What's your email? *</label>
              <input
                className="field-input"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
              />
            </div>

            {/* Website */}
            <div style={{ marginBottom: 18 }}>
              <label className="field-label">Your brand's website *</label>
              <input
                className="field-input"
                type="url"
                value={website}
                onChange={e => setWebsite(e.target.value)}
                placeholder="https://yourbrand.com"
                required
              />
            </div>

            {/* Ad Spend */}
            <div>
              <label className="field-label">What is your monthly ad spend? *</label>
              <div className="spend-grid">
                {SPEND_OPTIONS.map(opt => (
                  <div
                    key={opt.key}
                    className={`spend-option ${spend === opt.key ? "selected" : ""}`}
                    onClick={() => setSpend(opt.key)}
                  >
                    <div className="letter">{opt.letter}</div>
                    <div className="range">{opt.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {error && (
            <div style={{ padding: "12px 16px", background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: 8, color: "#f87171", fontSize: 13, marginTop: 8 }}>
              {error}
            </div>
          )}

          <button className="btn-primary" type="submit" disabled={submitting || !spend}>
            {submitting ? "Submitting..." : "See Your Options"}
          </button>
        </form>
      </div>
    </div>
  );
}
