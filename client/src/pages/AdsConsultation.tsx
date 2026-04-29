import { useState, useEffect } from "react";

const CALENDAR_URL = "https://calendar.app.google/YpZYM3y6ezQbcXbm7";

const AD_SPEND_OPTIONS = [
  { id: "A", label: "$10k – $50k / Month" },
  { id: "B", label: "$50k – $100k / Month" },
  { id: "C", label: "$100k – $250k / Month" },
  { id: "D", label: "$250k+ / Month" },
];

const INTEREST_LABELS: Record<string, string> = {
  "create": "Create New Ads Weekly",
  "fix": "Fix Ads That Aren't Performing",
  "scale": "Scale Winning Ads Faster",
  "start": "Not Sure Where to Start",
};

export default function AdsConsultation() {
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [adSpend, setAdSpend] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [interest, setInterest] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const i = params.get("interest");
    if (i && INTEREST_LABELS[i]) setInterest(i);
    document.title = "Paid Ads Consultation | Today Capital Group × AdBlend";
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adSpend) { setError("Please select your monthly ad spend."); return; }
    setSubmitting(true);
    setError(null);
    try {
      // Fire-and-forget: record lead interest (non-blocking)
      fetch("/api/analytics/track-visit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          pagePath: "/ads",
          fullUrl: window.location.href,
          utmSource: new URLSearchParams(window.location.search).get("utm_source"),
          utmCampaign: new URLSearchParams(window.location.search).get("utm_campaign"),
          utmMedium: new URLSearchParams(window.location.search).get("utm_medium"),
          interest: `ads-consultation:${adSpend}:${interest || "direct"}:${website}`,
        }),
      }).catch(() => {});
    } catch (_) {}
    setSubmitting(false);
    setSubmitted(true);
  };

  const isLowSpend = adSpend === "A";

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", backgroundColor: "#0a0f2c", minHeight: "100vh", color: "#fff" }}>
      {/* Header */}
      <header style={{ backgroundColor: "#0a0f2c", padding: "20px 0", borderBottom: "1px solid rgba(255,255,255,0.08)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 700, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <img
            src="https://cdn.prod.website-files.com/6864b4e14db4a4b6864c7968/686c11dae8ddeadf0fc2ffa7_Group%2017.svg"
            alt="Today Capital Group"
            style={{ height: 36, width: "auto" }}
            data-testid="img-logo"
          />
          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", letterSpacing: "0.5px" }}>
            in partnership with <strong style={{ color: "rgba(255,255,255,0.7)" }}>AdBlend</strong>
          </span>
        </div>
      </header>

      {/* Hero */}
      <section style={{ padding: "64px 24px 40px", textAlign: "center" }}>
        <div style={{ maxWidth: 620, margin: "0 auto" }}>
          <div style={{ display: "inline-block", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 20, padding: "6px 16px", fontSize: 12, fontWeight: 600, letterSpacing: "1px", textTransform: "uppercase", color: "rgba(255,255,255,0.6)", marginBottom: 24 }}>
            Paid Ads Consultation
          </div>
          <h1 style={{ fontSize: "clamp(28px, 5vw, 42px)", fontWeight: 700, lineHeight: 1.15, marginBottom: 16, letterSpacing: "-0.5px" }}>
            {interest ? (
              <>Turn capital into growth<br /><span style={{ color: "#60a5fa" }}>by {INTEREST_LABELS[interest].toLowerCase()}</span></>
            ) : (
              <>Turn your ad spend<br /><span style={{ color: "#60a5fa" }}>into consistent growth</span></>
            )}
          </h1>
          <p style={{ fontSize: 17, color: "rgba(255,255,255,0.55)", lineHeight: 1.7, marginBottom: 0 }}>
            The brands growing fastest aren't running one ad — they're testing new creatives every week, learning what works, and scaling winners. Tell us where you're at and we'll show you the path forward.
          </p>
        </div>
      </section>

      {/* Form / Result Card */}
      <section style={{ padding: "0 24px 80px" }}>
        <div style={{ maxWidth: 560, margin: "0 auto" }}>

          {/* ── Form ── */}
          {!submitted ? (
            <form onSubmit={handleSubmit} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: "36px 32px" }} data-testid="form-ads-consultation">
              {/* Email */}
              <div style={{ marginBottom: 22 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 8 }}>
                  What's your email? *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@yourbrand.com"
                  data-testid="input-email"
                  style={{
                    width: "100%", boxSizing: "border-box", padding: "12px 16px",
                    background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: 10, color: "#fff", fontSize: 15, outline: "none",
                  }}
                />
              </div>

              {/* Website */}
              <div style={{ marginBottom: 28 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 8 }}>
                  Your brand's website *
                </label>
                <input
                  type="url"
                  required
                  value={website}
                  onChange={e => setWebsite(e.target.value)}
                  placeholder="https://yourbrand.com"
                  data-testid="input-website"
                  style={{
                    width: "100%", boxSizing: "border-box", padding: "12px 16px",
                    background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: 10, color: "#fff", fontSize: 15, outline: "none",
                  }}
                />
              </div>

              {/* Ad Spend */}
              <div style={{ marginBottom: 28 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 14 }}>
                  What is your monthly ad spend? *
                </label>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {AD_SPEND_OPTIONS.map(opt => {
                    const selected = adSpend === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => { setAdSpend(opt.id); setError(null); }}
                        data-testid={`option-spend-${opt.id.toLowerCase()}`}
                        style={{
                          display: "flex", alignItems: "center", gap: 14,
                          padding: "14px 18px", borderRadius: 10, cursor: "pointer", textAlign: "left",
                          background: selected ? "rgba(96,165,250,0.15)" : "rgba(255,255,255,0.04)",
                          border: selected ? "1.5px solid rgba(96,165,250,0.6)" : "1.5px solid rgba(255,255,255,0.1)",
                          color: "#fff", fontSize: 15, fontWeight: selected ? 600 : 400,
                          transition: "all 0.15s",
                        }}
                      >
                        <span style={{
                          width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 12, fontWeight: 700,
                          background: selected ? "#60a5fa" : "rgba(255,255,255,0.1)",
                          color: selected ? "#0a0f2c" : "rgba(255,255,255,0.5)",
                        }}>
                          {opt.id}
                        </span>
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {error && (
                <p style={{ color: "#f87171", fontSize: 13, marginBottom: 16 }}>{error}</p>
              )}

              <button
                type="submit"
                disabled={submitting}
                data-testid="button-submit"
                style={{
                  width: "100%", padding: "14px", borderRadius: 10, border: "none",
                  background: "#60a5fa", color: "#0a0f2c", fontSize: 16, fontWeight: 700,
                  cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.7 : 1,
                }}
              >
                {submitting ? "Submitting…" : "See Your Options →"}
              </button>
            </form>
          ) : (
            /* ── Result ── */
            <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: "40px 32px", textAlign: "center" }} data-testid="result-card">
              {isLowSpend ? (
                /* Low spend — $10k-$50k */
                <>
                  <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(250,204,21,0.1)", border: "1px solid rgba(250,204,21,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 26 }}>
                    &#9733;
                  </div>
                  <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>You're in a great spot to grow</h2>
                  <p style={{ fontSize: 16, color: "rgba(255,255,255,0.6)", lineHeight: 1.7, marginBottom: 28 }}>
                    At the $10k–$50k range you're building real momentum, and that's exactly when getting your creative strategy right makes the biggest difference. While our full managed ads program is built for higher monthly spends, we'd love to spend 15 minutes with you and share the most impactful moves you can make right now to get the most out of every dollar.
                  </p>
                  <a
                    href={CALENDAR_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid="link-book-consultation"
                    style={{
                      display: "inline-block", padding: "14px 32px",
                      background: "#facc15", color: "#0a0f2c",
                      borderRadius: 10, fontWeight: 700, fontSize: 15,
                      textDecoration: "none",
                    }}
                  >
                    Book Your Free 15-Min Call →
                  </a>
                  <p style={{ marginTop: 16, fontSize: 13, color: "rgba(255,255,255,0.35)" }}>No obligation. No pitch. Just honest advice.</p>
                </>
              ) : (
                /* Higher spend — $50k+ */
                <>
                  <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(96,165,250,0.1)", border: "1px solid rgba(96,165,250,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 26 }}>
                    &#10003;
                  </div>
                  <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>We can help — let's talk</h2>
                  <p style={{ fontSize: 16, color: "rgba(255,255,255,0.6)", lineHeight: 1.7, marginBottom: 28 }}>
                    At your ad spend level, the difference between an average creative strategy and a great one can mean hundreds of thousands in revenue. AdBlend specializes in keeping a steady pipeline of new creatives coming in so you're always testing, always learning, and always scaling the winners. Let's find some time to walk through exactly how this works for your brand.
                  </p>
                  <a
                    href={CALENDAR_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid="link-book-strategy"
                    style={{
                      display: "inline-block", padding: "14px 32px",
                      background: "#60a5fa", color: "#0a0f2c",
                      borderRadius: 10, fontWeight: 700, fontSize: 15,
                      textDecoration: "none",
                    }}
                  >
                    Schedule a Strategy Call →
                  </a>
                  <p style={{ marginTop: 16, fontSize: 13, color: "rgba(255,255,255,0.35)" }}>Pick a time that works for you — usually 20–30 minutes.</p>
                </>
              )}
            </div>
          )}

          {/* Trust line */}
          {!submitted && (
            <p style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "rgba(255,255,255,0.3)" }}>
              Your information is never sold or shared with third parties.
            </p>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.07)", padding: "24px", textAlign: "center" }}>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", margin: 0 }}>
          &copy; {new Date().getFullYear()} Today Capital Group. In partnership with AdBlend.
        </p>
      </footer>
    </div>
  );
}
