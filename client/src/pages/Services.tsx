import { useState, useEffect } from "react";

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');

  .services-page * { box-sizing: border-box; margin: 0; padding: 0; }

  .services-page {
    font-family: 'DM Sans', sans-serif;
    background: radial-gradient(ellipse at 30% 0%, rgba(20,184,166,0.10) 0%, transparent 50%),
                radial-gradient(ellipse at 70% 100%, rgba(99,102,241,0.08) 0%, transparent 50%),
                #080d18;
    color: #e8eaf0;
    min-height: 100vh;
  }

  .services-page .wrap {
    max-width: 860px;
    margin: 0 auto;
    padding: 60px 24px 80px;
  }

  .services-page .logo-row {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 48px;
  }

  .services-page .logo-mark {
    width: 36px; height: 36px;
    background: linear-gradient(135deg, #14B8A6, #2dd4bf);
    border-radius: 9px;
    display: flex; align-items: center; justify-content: center;
    font-family: 'Syne', sans-serif; font-weight: 800; font-size: 15px; color: #080d18;
  }

  .services-page .logo-text {
    font-family: 'Syne', sans-serif; font-weight: 700; font-size: 14px;
  }

  .services-page .logo-sub {
    font-size: 10px; color: #14B8A6; text-transform: uppercase; letter-spacing: 0.08em;
  }

  .services-page h1 {
    font-family: 'Syne', sans-serif;
    font-size: 32px;
    font-weight: 700;
    line-height: 1.2;
    margin-bottom: 16px;
  }

  .services-page h1 span { color: #14B8A6; }

  .services-page .intro {
    font-size: 16px;
    color: #94a3b8;
    line-height: 1.7;
    margin-bottom: 40px;
    max-width: 640px;
  }

  .services-page .cards {
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px;
    margin-bottom: 32px;
  }

  .services-page .card {
    background: rgba(15,23,41,0.7);
    border: 2px solid rgba(255,255,255,0.08);
    border-radius: 16px;
    padding: 28px 24px;
    cursor: pointer;
    transition: all 0.25s ease;
    position: relative;
    overflow: hidden;
  }

  .services-page .card:hover {
    border-color: rgba(45,212,191,0.4);
    transform: translateY(-3px);
    box-shadow: 0 16px 40px rgba(0,0,0,0.3);
  }

  .services-page .card.selected {
    border-color: #14B8A6;
    background: rgba(20,184,166,0.08);
  }

  .services-page .select-circle {
    position: absolute;
    top: 16px; right: 16px;
    width: 26px; height: 26px;
    border-radius: 50%;
    border: 2px solid rgba(255,255,255,0.15);
    display: flex; align-items: center; justify-content: center;
    transition: all 0.2s;
    font-size: 14px;
    color: transparent;
  }

  .services-page .card:hover .select-circle {
    border-color: rgba(45,212,191,0.5);
  }

  .services-page .card.selected .select-circle {
    background: #14B8A6;
    border-color: #14B8A6;
    color: #080d18;
  }

  .services-page .click-hint {
    font-size: 11px;
    color: #4b5568;
    margin-top: 14px;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .services-page .card.selected .click-hint { display: none; }

  .services-page .card-icon {
    font-size: 28px;
    margin-bottom: 14px;
  }

  .services-page .card-title {
    font-family: 'Syne', sans-serif;
    font-size: 18px;
    font-weight: 700;
    margin-bottom: 8px;
  }

  .services-page .card-desc {
    font-size: 14px;
    color: #94a3b8;
    line-height: 1.6;
  }

  .services-page .card-bullets {
    margin-top: 12px;
    padding-left: 0;
    list-style: none;
  }

  .services-page .card-bullets li {
    font-size: 13px;
    color: #7b8499;
    padding: 3px 0;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .services-page .card-bullets li::before {
    content: '';
    width: 4px; height: 4px;
    border-radius: 50%;
    background: #14B8A6;
    flex-shrink: 0;
  }

  .services-page .other-card {
    /* same width as other cards in single-column layout */
  }

  .services-page .other-input {
    width: 100%;
    margin-top: 12px;
    padding: 12px 14px;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 8px;
    color: #e8eaf0;
    font-size: 14px;
    font-family: 'DM Sans', sans-serif;
    outline: none;
    transition: border-color 0.2s;
  }

  .services-page .other-input:focus {
    border-color: rgba(45,212,191,0.5);
  }

  .services-page .submit-section {
    text-align: center;
    margin-top: 32px;
  }

  .services-page .submit-btn {
    padding: 16px 48px;
    background: linear-gradient(135deg, #14B8A6, #0d9488);
    border: none;
    border-radius: 12px;
    color: #080d18;
    font-family: 'Syne', sans-serif;
    font-weight: 700;
    font-size: 16px;
    cursor: pointer;
    transition: all 0.2s;
    letter-spacing: 0.02em;
  }

  .services-page .submit-btn:hover { opacity: 0.9; transform: translateY(-2px); box-shadow: 0 8px 24px rgba(20,184,166,0.3); }
  .services-page .submit-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; box-shadow: none; }

  .services-page .success-card {
    text-align: center;
    background: rgba(15,23,41,0.7);
    border: 1px solid rgba(45,212,191,0.3);
    border-radius: 20px;
    padding: 48px 32px;
    max-width: 520px;
    margin: 0 auto;
  }

  .services-page .success-icon {
    width: 64px; height: 64px;
    background: rgba(45,212,191,0.15);
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    margin: 0 auto 20px;
    font-size: 28px;
  }

  .services-page .phone-row {
    display: flex;
    gap: 12px;
    margin-top: 24px;
    max-width: 400px;
    margin-left: auto;
    margin-right: auto;
  }

  .services-page .phone-input {
    flex: 1;
    padding: 12px 14px;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 8px;
    color: #e8eaf0;
    font-size: 14px;
    font-family: 'DM Sans', sans-serif;
    outline: none;
  }

  .services-page .phone-input:focus { border-color: rgba(45,212,191,0.5); }

  .services-page .footer-note {
    text-align: center;
    margin-top: 48px;
    font-size: 13px;
    color: #4b5568;
    line-height: 1.6;
  }

  @media (max-width: 640px) {
    .services-page h1 { font-size: 24px; }
    .services-page .wrap { padding: 40px 16px 60px; }
  }
`;

const SERVICES = [
  {
    id: "payments",
    icon: "\uD83D\uDCB3",
    title: "Payment Processing",
    desc: "Lower your processing fees and get faster deposits. We work with processors built for small businesses.",
    bullets: ["Lower rates than standard processors", "Next-day deposits", "No long-term contracts", "Works with your existing POS"],
  },
  {
    id: "website",
    icon: "\uD83C\uDF10",
    title: "Website Build",
    desc: "A professional site that actually brings in customers. Mobile-ready, SEO-optimized, built to convert.",
    bullets: ["Custom design, not a template", "Mobile-first, fast loading", "SEO + Google Business setup", "Lead capture forms built in"],
  },
  {
    id: "crm",
    icon: "\uD83D\uDCCA",
    title: "CRM Setup",
    desc: "Stop losing leads. Get a CRM that tracks your pipeline, automates follow-ups, and keeps your team organized.",
    bullets: ["Pipeline tracking & automation", "Text + email follow-up sequences", "Lead scoring & tagging", "Integrates with your existing tools"],
  },
];

export default function Services() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [otherText, setOtherText] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [contactInfo, setContactInfo] = useState<{ firstName?: string; lastName?: string; phone?: string; businessName?: string }>({});

  // Parse email + interest from URL params (from email CTA clicks)
  const params = new URLSearchParams(window.location.search);
  const emailFromUrl = params.get("email") || params.get("e") || "";
  const interestFromUrl = params.get("interest") || params.get("i") || "";
  const utmCampaign = params.get("utm_campaign") || "";
  const utmSource = params.get("utm_source") || "";
  const firstName = params.get("firstName") || params.get("fn") || "";

  // Auto-select the service from the email link
  useEffect(() => {
    if (interestFromUrl && !selected.has(interestFromUrl)) {
      setSelected(new Set([interestFromUrl]));
    }
  }, [interestFromUrl]);

  // Lookup contact info if we have an email
  useEffect(() => {
    if (!emailFromUrl) return;
    fetch(`/api/services/lookup?email=${encodeURIComponent(emailFromUrl)}`)
      .then(r => r.json())
      .then(data => {
        setContactInfo(data);
        if (data.phone && !phone) setPhone(data.phone);
      })
      .catch(() => {});
  }, [emailFromUrl]);

  // If they came from an email with an interest param, auto-submit that click
  useEffect(() => {
    if (emailFromUrl && interestFromUrl) {
      fetch("/api/services/interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailFromUrl,
          firstName: firstName || contactInfo.firstName,
          lastName: contactInfo.lastName,
          phone: contactInfo.phone,
          businessName: contactInfo.businessName,
          service: interestFromUrl,
          source: "email",
          utmCampaign,
          utmSource,
        }),
      }).catch(() => {});
    }
  }, [emailFromUrl, interestFromUrl, contactInfo]);

  const toggleService = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (selected.size === 0) return;
    setSubmitting(true);

    const email = emailFromUrl || "";
    const promises = [...selected].map(service =>
      fetch("/api/services/interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          firstName: firstName || contactInfo.firstName,
          lastName: contactInfo.lastName,
          phone: phone || contactInfo.phone,
          businessName: contactInfo.businessName,
          service,
          otherDetails: service === "other" ? otherText : undefined,
          source: emailFromUrl ? "email" : "direct",
          utmCampaign,
          utmSource,
        }),
      }).catch(() => {})
    );

    await Promise.all(promises);
    setSubmitted(true);
    setSubmitting(false);
  };

  const displayName = firstName || contactInfo.firstName || "";

  return (
    <div className="services-page">
      <style>{CSS}</style>
      <div className="wrap">
        {/* Logo */}
        <div className="logo-row">
          <div className="logo-mark">GF</div>
          <div>
            <div className="logo-text">Guide Funding Group</div>
            <div className="logo-sub">Business Services</div>
          </div>
        </div>

        {submitted ? (
          /* Success State */
          <div className="success-card">
            <div className="success-icon">{"\u2713"}</div>
            <h1 style={{ fontSize: 24, marginBottom: 12 }}>
              Got it{displayName ? `, ${displayName}` : ""}!
            </h1>
            <p style={{ color: "#94a3b8", fontSize: 15, lineHeight: 1.7, marginBottom: 24 }}>
              We've noted your interest in{" "}
              <strong style={{ color: "#2dd4bf" }}>
                {[...selected].map(s => {
                  if (s === "payments") return "Payment Processing";
                  if (s === "website") return "Website Build";
                  if (s === "crm") return "CRM Setup";
                  return "Other";
                }).join(", ")}
              </strong>.
              {" "}We'll reach out with more details soon.
            </p>
            <p style={{ color: "#64748b", fontSize: 13 }}>
              In the meantime, if you need funding —{" "}
              <a href="/intake/quiz" style={{ color: "#14B8A6", textDecoration: "none", fontWeight: 600 }}>see what you qualify for</a>.
            </p>
          </div>
        ) : (
          /* Main Content */
          <>
            <h1>
              {displayName ? `${displayName}, we` : "We"}'re expanding <span>beyond funding</span>.
            </h1>
            <p className="intro">
              We've spent years helping businesses get funded. Along the way, the same gaps keep coming up — payment processing eating into margins, websites that aren't pulling their weight, CRMs that never got set up right.
              <br /><br />
              Which of these would matter most for your business right now? Click any that fit.
            </p>

            {/* Service Cards */}
            <div className="cards">
              {SERVICES.map(svc => (
                <div
                  key={svc.id}
                  className={`card ${selected.has(svc.id) ? "selected" : ""}`}
                  onClick={() => toggleService(svc.id)}
                >
                  <div className="select-circle">{selected.has(svc.id) ? "\u2713" : ""}</div>
                  <div className="card-icon">{svc.icon}</div>
                  <div className="card-title">{svc.title}</div>
                  <div className="card-desc">{svc.desc}</div>
                  <ul className="card-bullets">
                    {svc.bullets.map((b, i) => <li key={i}>{b}</li>)}
                  </ul>
                  <div className="click-hint">Click to select</div>
                </div>
              ))}

              {/* Other Option */}
              <div
                className={`card other-card ${selected.has("other") ? "selected" : ""}`}
                onClick={() => toggleService("other")}
              >
                <div className="select-circle">{selected.has("other") ? "\u2713" : ""}</div>
                <div className="card-icon">{"\uD83D\uDCA1"}</div>
                <div className="card-title">Something Else</div>
                <div className="card-desc">None of the above, but there's something your business needs. Tell us what it is.</div>
                {selected.has("other") && (
                  <input
                    className="other-input"
                    placeholder="What does your business need most right now?"
                    value={otherText}
                    onChange={e => setOtherText(e.target.value)}
                    onClick={e => e.stopPropagation()}
                  />
                )}
              </div>
            </div>

            {/* Phone capture (optional) */}
            {selected.size > 0 && !emailFromUrl && (
              <div className="phone-row">
                <input
                  className="phone-input"
                  type="email"
                  placeholder="Your email"
                  id="services-email"
                />
                <input
                  className="phone-input"
                  type="tel"
                  placeholder="Phone (optional)"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                />
              </div>
            )}

            {/* Submit */}
            <div className="submit-section">
              <button
                className="submit-btn"
                disabled={selected.size === 0 || submitting}
                onClick={() => {
                  // If no email from URL, grab it from the input
                  if (!emailFromUrl) {
                    const emailInput = document.getElementById("services-email") as HTMLInputElement;
                    if (emailInput && emailInput.value) {
                      const url = new URL(window.location.href);
                      url.searchParams.set("email", emailInput.value);
                      window.history.replaceState({}, "", url.toString());
                    }
                  }
                  handleSubmit();
                }}
              >
                {submitting ? "Submitting..." : selected.size > 1 ? `I'm interested in ${selected.size} services` : "I'm interested"}
              </button>
            </div>

            <div className="footer-note">
              No commitment. We're just figuring out what matters most to the businesses we work with.
              <br />
              Your info is never shared or sold.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
