import { useState, useRef, useCallback } from "react";

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:wght@400;500;700&display=swap');

  .pr * { box-sizing: border-box; margin: 0; padding: 0; }

  .pr {
    font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
    background: #0a0f1e;
    color: #dde1ea;
    min-height: 100vh;
    overflow-x: hidden;
  }

  /* ── NAV ── */
  .pr-nav {
    position: sticky; top: 0; z-index: 100;
    background: rgba(10,15,30,0.9);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid rgba(255,255,255,0.06);
    padding: 14px 32px;
    display: flex; align-items: center; justify-content: space-between;
  }
  .pr-nav-logo { display: flex; align-items: center; gap: 10px; text-decoration: none; }
  .pr-nav-mark {
    width: 34px; height: 34px;
    background: linear-gradient(135deg, #2dd4bf, #0d9488);
    border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    font-weight: 800; font-size: 13px; color: #0f1729;
    font-family: 'DM Sans', sans-serif;
  }
  .pr-nav-name { font-weight: 700; font-size: 14px; color: #dde1ea; }
  .pr-nav-sub { font-size: 10px; color: #2dd4bf; text-transform: uppercase; letter-spacing: 0.12em; }
  .pr-nav-cta {
    padding: 9px 22px;
    background: #2dd4bf;
    border: none; border-radius: 8px;
    color: #0f1729; font-family: 'DM Sans', sans-serif; font-weight: 700; font-size: 13px;
    cursor: pointer; transition: opacity 0.2s;
    text-decoration: none;
  }
  .pr-nav-cta:hover { opacity: 0.85; }

  /* ── HERO ── */
  .pr-hero {
    background: linear-gradient(135deg, #0f1729 0%, #16223f 60%, #15313a 100%);
    padding: 80px 24px 72px;
    text-align: center;
    position: relative;
    overflow: hidden;
  }
  .pr-hero-glow {
    position: absolute; top: -100px; left: 50%; transform: translateX(-50%);
    width: 800px; height: 500px;
    background: radial-gradient(ellipse at center, rgba(45,212,191,0.1) 0%, transparent 65%);
    pointer-events: none;
  }
  .pr-eyebrow {
    display: inline-block;
    font-size: 11px; letter-spacing: 2.5px; text-transform: uppercase;
    color: #2dd4bf; font-weight: 700;
    margin-bottom: 18px;
    position: relative;
  }
  .pr-hero h1 {
    font-family: 'Instrument Serif', Georgia, 'Times New Roman', serif;
    font-size: clamp(40px, 5.5vw, 68px);
    font-weight: 400;
    line-height: 1.05;
    color: #ffffff;
    margin-bottom: 20px;
    position: relative;
  }
  .pr-hero-sub {
    font-size: 17px; color: #c7d2e3; line-height: 1.65;
    max-width: 560px; margin: 0 auto 40px;
    position: relative;
  }
  .pr-hero-btn {
    display: inline-block;
    padding: 17px 44px;
    background: #2dd4bf;
    border: none; border-radius: 10px;
    color: #0f1729; font-family: 'DM Sans', sans-serif;
    font-weight: 700; font-size: 16px;
    cursor: pointer; transition: opacity 0.2s, transform 0.15s;
    position: relative;
    text-decoration: none;
  }
  .pr-hero-btn:hover { opacity: 0.88; transform: translateY(-2px); }

  /* ── BENEFIT CARDS ── */
  .pr-cards-section { max-width: 720px; margin: 0 auto; padding: 64px 24px 0; }
  .pr-section-label {
    font-size: 11px; letter-spacing: 2px; text-transform: uppercase;
    color: #2dd4bf; font-weight: 700; margin-bottom: 8px;
  }
  .pr-section-title {
    font-family: 'Instrument Serif', Georgia, serif;
    font-size: clamp(24px, 3vw, 34px);
    font-weight: 400; color: #ffffff;
    line-height: 1.15; margin-bottom: 32px;
  }
  .pr-cards { display: flex; flex-direction: column; gap: 14px; }
  .pr-card {
    display: flex; align-items: flex-start; gap: 20px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 14px;
    padding: 24px 24px;
    transition: border-color 0.2s, background 0.2s;
  }
  .pr-card:hover {
    border-color: rgba(45,212,191,0.25);
    background: rgba(45,212,191,0.04);
  }
  .pr-card-num {
    font-family: 'Instrument Serif', Georgia, serif;
    font-size: 36px; line-height: 1;
    color: #2dd4bf; flex-shrink: 0; min-width: 28px;
  }
  .pr-card-title { font-size: 16px; font-weight: 700; color: #ffffff; margin-bottom: 4px; }
  .pr-card-desc { font-size: 14px; color: #7a8699; line-height: 1.6; }

  /* ── STAT CALLOUT ── */
  .pr-stat-section { max-width: 720px; margin: 0 auto; padding: 32px 24px 0; }
  .pr-stat-box {
    background: #0f1729;
    border: 1px solid rgba(45,212,191,0.2);
    border-radius: 14px;
    padding: 30px 32px;
  }
  .pr-stat-label {
    font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase;
    color: #2dd4bf; font-weight: 700; margin-bottom: 8px;
  }
  .pr-stat-title {
    font-family: 'Instrument Serif', Georgia, serif;
    font-size: clamp(24px, 3vw, 32px);
    color: #ffffff; line-height: 1.1; margin-bottom: 10px;
  }
  .pr-stat-body { font-size: 14px; color: #c7d2e3; line-height: 1.6; }

  /* ── FORM SECTION ── */
  .pr-form-section { max-width: 720px; margin: 0 auto; padding: 48px 24px 80px; }
  .pr-form-card {
    background: rgba(45,212,191,0.04);
    border: 1px solid rgba(45,212,191,0.18);
    border-radius: 20px;
    padding: 44px 44px;
  }
  .pr-form-card h2 {
    font-family: 'Instrument Serif', Georgia, serif;
    font-size: clamp(22px, 2.8vw, 30px);
    font-weight: 400; color: #ffffff;
    margin-bottom: 8px;
  }
  .pr-form-card .sub {
    font-size: 14px; color: #7a8699; line-height: 1.65; margin-bottom: 32px;
  }
  .pr-form-row { display: flex; gap: 12px; margin-bottom: 12px; }
  .pr-field-wrap { flex: 1; display: flex; flex-direction: column; }
  .pr-label { font-size: 12px; font-weight: 600; color: #8ea0bd; margin-bottom: 6px; letter-spacing: 0.02em; }
  .pr-field {
    width: 100%; padding: 14px 16px;
    background: rgba(0,0,0,0.4);
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 10px;
    color: #dde1ea; font-size: 14px;
    font-family: 'DM Sans', sans-serif;
    outline: none; transition: border-color 0.2s;
  }
  .pr-field:focus { border-color: rgba(45,212,191,0.5); }
  .pr-field::placeholder { color: #3a4558; }
  select.pr-field { cursor: pointer; }

  /* ── UPLOAD ZONE ── */
  .pr-upload-wrap { margin-bottom: 12px; }
  .pr-upload-zone {
    border: 2px dashed rgba(45,212,191,0.25);
    border-radius: 12px;
    padding: 32px 20px;
    text-align: center;
    cursor: pointer;
    transition: border-color 0.2s, background 0.2s;
    background: rgba(0,0,0,0.25);
    position: relative;
  }
  .pr-upload-zone:hover, .pr-upload-zone.drag-over {
    border-color: rgba(45,212,191,0.55);
    background: rgba(45,212,191,0.04);
  }
  .pr-upload-icon {
    width: 52px; height: 52px;
    background: rgba(45,212,191,0.1);
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    margin: 0 auto 14px;
    font-size: 22px;
  }
  .pr-upload-title { font-size: 15px; font-weight: 600; color: #c7d2e3; margin-bottom: 4px; }
  .pr-upload-sub { font-size: 12px; color: #3a4558; }
  .pr-upload-zone input[type="file"] {
    position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; height: 100%;
  }
  .pr-file-chip {
    display: flex; align-items: center; gap: 10px;
    background: rgba(45,212,191,0.08);
    border: 1px solid rgba(45,212,191,0.2);
    border-radius: 8px;
    padding: 10px 14px;
    margin-top: 10px;
  }
  .pr-file-chip-name { font-size: 13px; color: #2dd4bf; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .pr-file-chip-remove {
    background: none; border: none; color: #5a6a80; cursor: pointer;
    font-size: 16px; line-height: 1; padding: 0 2px;
  }
  .pr-file-chip-remove:hover { color: #ef4444; }

  /* ── SUBMIT ── */
  .pr-submit {
    width: 100%; padding: 17px;
    background: #2dd4bf;
    border: none; border-radius: 10px;
    color: #0f1729; font-family: 'DM Sans', sans-serif;
    font-weight: 700; font-size: 16px;
    cursor: pointer; transition: opacity 0.2s, transform 0.15s;
    margin-top: 8px;
  }
  .pr-submit:hover { opacity: 0.88; transform: translateY(-1px); }
  .pr-submit:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
  .pr-fine { font-size: 12px; color: #3a4558; text-align: center; margin-top: 12px; }

  /* ── SUCCESS ── */
  .pr-success { text-align: center; padding: 20px 0; }
  .pr-success-icon {
    width: 72px; height: 72px;
    background: rgba(45,212,191,0.12);
    border: 2px solid rgba(45,212,191,0.3);
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    margin: 0 auto 24px;
  }
  .pr-success-check { font-size: 28px; color: #2dd4bf; font-weight: 700; }
  .pr-success h3 {
    font-family: 'Instrument Serif', Georgia, serif;
    font-size: 28px; font-weight: 400; color: #ffffff; margin-bottom: 12px;
  }
  .pr-success p { font-size: 15px; color: #7a8699; line-height: 1.7; max-width: 400px; margin: 0 auto; }

  /* ── FOOTER ── */
  .pr-footer {
    background: #0f1729;
    border-top: 1px solid rgba(255,255,255,0.06);
    padding: 32px 24px;
    text-align: center;
    font-size: 12px; color: #3a4558; line-height: 1.7;
  }
  .pr-footer strong { color: #5a6a85; }
  .pr-footer a { color: #5a6a85; text-decoration: none; }

  /* ── RESPONSIVE ── */
  @media (max-width: 640px) {
    .pr-form-card { padding: 28px 20px; }
    .pr-form-row { flex-direction: column; }
    .pr-nav { padding: 12px 16px; }
    .pr-hero { padding: 56px 16px 52px; }
    .pr-cards-section, .pr-stat-section, .pr-form-section { padding-left: 16px; padding-right: 16px; }
  }
`;

const BENEFITS = [
  {
    num: "1",
    title: "Beat your current rate",
    desc: "Whatever you pay now — Stripe, Square, or a traditional processor — we work to come in under it.",
  },
  {
    num: "2",
    title: "Keep your setup",
    desc: "No new hardware required and minimal disruption to how you take payments.",
  },
  {
    num: "3",
    title: "Free statement review",
    desc: "Send one statement, get a clear side-by-side comparison. No obligation to switch.",
  },
];

const PROCESSORS = [
  "Stripe",
  "Square",
  "PayPal / Braintree",
  "Clover",
  "Toast",
  "Heartland",
  "Worldpay / FIS",
  "Chase Merchant Services",
  "Bank of America Merchant Services",
  "Other / Not sure",
];

const VOLUMES = [
  "Under $10,000/mo",
  "$10,000 – $25,000/mo",
  "$25,000 – $50,000/mo",
  "$50,000 – $100,000/mo",
  "$100,000 – $250,000/mo",
  "$250,000+/mo",
];

export default function ProcessingReview() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState(() => {
    const p = new URLSearchParams(window.location.search);
    return p.get("email") || "";
  });
  const [phone, setPhone] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [currentProcessor, setCurrentProcessor] = useState("");
  const [monthlyVolume, setMonthlyVolume] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const formRef = useRef<HTMLDivElement>(null);

  const scrollToForm = () => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const handleFile = (f: File | null) => {
    if (!f) return;
    const allowed = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
    if (!allowed.includes(f.type)) { setError("Please upload a PDF, PNG, or JPG file."); return; }
    if (f.size > 25 * 1024 * 1024) { setError("File must be under 25 MB."); return; }
    setError("");
    setFile(f);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, []);

  const fileToBase64 = (f: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(f);
    });

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!email) { setError("Email is required."); return; }
    setError("");
    setSubmitting(true);
    try {
      let fileBase64: string | undefined;
      let fileName: string | undefined;
      let fileMimeType: string | undefined;
      if (file) {
        fileBase64 = await fileToBase64(file);
        fileName = file.name;
        fileMimeType = file.type;
      }

      const res = await fetch("/api/processing/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName, lastName, email, phone, businessName,
          currentProcessor, monthlyVolume,
          fileBase64, fileName, fileMimeType,
        }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Submission failed. Please try again.");
      }
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pr">
      <style>{CSS}</style>

      {/* NAV */}
      <nav className="pr-nav">
        <a className="pr-nav-logo" href="/processing-review">
          <div className="pr-nav-mark">TCG</div>
          <div>
            <div className="pr-nav-name">Today Capital Group</div>
            <div className="pr-nav-sub">Payment Processing</div>
          </div>
        </a>
        <button className="pr-nav-cta" onClick={scrollToForm} data-testid="button-nav-cta">
          See My Savings
        </button>
      </nav>

      {/* HERO */}
      <section className="pr-hero">
        <div className="pr-hero-glow" />
        <div className="pr-eyebrow">Card Processing</div>
        <h1>Keep More On Every Sale</h1>
        <p className="pr-hero-sub">
          Have you checked your processing rates in the last year? Send us one statement — we'll show you exactly what you'd save, side by side.
        </p>
        <button className="pr-hero-btn" onClick={scrollToForm} data-testid="button-hero-cta">
          See My Savings — It's Free
        </button>
      </section>

      {/* BENEFIT CARDS */}
      <div className="pr-cards-section">
        <div className="pr-section-label">How it works</div>
        <div className="pr-section-title">Three things we guarantee.</div>
        <div className="pr-cards">
          {BENEFITS.map((b) => (
            <div className="pr-card" key={b.num}>
              <div className="pr-card-num">{b.num}</div>
              <div>
                <div className="pr-card-title">{b.title}</div>
                <div className="pr-card-desc">{b.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* STAT CALLOUT */}
      <div className="pr-stat-section">
        <div className="pr-stat-box">
          <div className="pr-stat-label">The review</div>
          <div className="pr-stat-title">Two minutes, zero cost</div>
          <div className="pr-stat-body">
            Send one statement. We show you exactly what you would save against your current rate.
            No switch required to see the number. Most businesses save between 0.3% and 1.2% per transaction.
          </div>
        </div>
      </div>

      {/* FORM */}
      <div className="pr-form-section" ref={formRef}>
        <div className="pr-form-card">
          {submitted ? (
            <div className="pr-success">
              <div className="pr-success-icon">
                <span className="pr-success-check">✓</span>
              </div>
              <h3>We'll have your analysis ready shortly.</h3>
              <p>
                Thanks for sending over your statement. Our team will review it and reach out with a
                side-by-side comparison — usually within one business day.
              </p>
            </div>
          ) : (
            <>
              <h2>Get your free rate comparison.</h2>
              <p className="sub">
                Fill in your info below and upload a recent processing statement (last 1–3 months).
                We'll do the math and show you what you'd keep.
              </p>

              <form onSubmit={handleSubmit} data-testid="form-processing-review">
                {/* Name row */}
                <div className="pr-form-row">
                  <div className="pr-field-wrap">
                    <label className="pr-label">First Name</label>
                    <input
                      className="pr-field"
                      type="text"
                      placeholder="Jane"
                      value={firstName}
                      onChange={e => setFirstName(e.target.value)}
                      data-testid="input-first-name"
                    />
                  </div>
                  <div className="pr-field-wrap">
                    <label className="pr-label">Last Name</label>
                    <input
                      className="pr-field"
                      type="text"
                      placeholder="Smith"
                      value={lastName}
                      onChange={e => setLastName(e.target.value)}
                      data-testid="input-last-name"
                    />
                  </div>
                </div>

                {/* Email / Phone row */}
                <div className="pr-form-row">
                  <div className="pr-field-wrap">
                    <label className="pr-label">Email Address *</label>
                    <input
                      className="pr-field"
                      type="email"
                      placeholder="jane@yourbusiness.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      data-testid="input-email"
                    />
                  </div>
                  <div className="pr-field-wrap">
                    <label className="pr-label">Phone Number</label>
                    <input
                      className="pr-field"
                      type="tel"
                      placeholder="(555) 000-0000"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      data-testid="input-phone"
                    />
                  </div>
                </div>

                {/* Business / Processor row */}
                <div className="pr-form-row">
                  <div className="pr-field-wrap">
                    <label className="pr-label">Business Name</label>
                    <input
                      className="pr-field"
                      type="text"
                      placeholder="Acme Co."
                      value={businessName}
                      onChange={e => setBusinessName(e.target.value)}
                      data-testid="input-business-name"
                    />
                  </div>
                  <div className="pr-field-wrap">
                    <label className="pr-label">Current Processor</label>
                    <select
                      className="pr-field"
                      value={currentProcessor}
                      onChange={e => setCurrentProcessor(e.target.value)}
                      data-testid="select-processor"
                    >
                      <option value="">Select one…</option>
                      {PROCESSORS.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Monthly volume */}
                <div className="pr-form-row">
                  <div className="pr-field-wrap">
                    <label className="pr-label">Monthly Processing Volume</label>
                    <select
                      className="pr-field"
                      value={monthlyVolume}
                      onChange={e => setMonthlyVolume(e.target.value)}
                      data-testid="select-volume"
                    >
                      <option value="">Select range…</option>
                      {VOLUMES.map(v => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* File upload */}
                <div className="pr-upload-wrap">
                  <label className="pr-label">Processing Statement (optional but recommended)</label>
                  {!file ? (
                    <div
                      className={`pr-upload-zone${dragOver ? " drag-over" : ""}`}
                      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={onDrop}
                      data-testid="upload-zone"
                    >
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        onChange={e => handleFile(e.target.files?.[0] || null)}
                        data-testid="input-file"
                      />
                      <div className="pr-upload-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2dd4bf" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                          <polyline points="17 8 12 3 7 8"/>
                          <line x1="12" y1="3" x2="12" y2="15"/>
                        </svg>
                      </div>
                      <div className="pr-upload-title">Drop your statement here, or click to browse</div>
                      <div className="pr-upload-sub">PDF, PNG, or JPG — up to 25 MB</div>
                    </div>
                  ) : (
                    <div className="pr-file-chip">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2dd4bf" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                      </svg>
                      <span className="pr-file-chip-name">{file.name}</span>
                      <button
                        type="button"
                        className="pr-file-chip-remove"
                        onClick={() => setFile(null)}
                        data-testid="button-remove-file"
                      >×</button>
                    </div>
                  )}
                </div>

                {error && (
                  <p style={{ fontSize: 13, color: "#f87171", marginBottom: 12 }} data-testid="text-error">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  className="pr-submit"
                  disabled={submitting}
                  data-testid="button-submit"
                >
                  {submitting ? "Submitting…" : "See My Savings — Free Review"}
                </button>
                <p className="pr-fine">
                  No commitment required. We'll reach out with your comparison within 1 business day.
                </p>
              </form>
            </>
          )}
        </div>
      </div>

      {/* FOOTER */}
      <div className="pr-footer">
        <p style={{ marginBottom: 6 }}>
          <strong>Today Capital Group, now operating as Guide Funding Group</strong>
        </p>
        <p>Woodland Hills, CA &nbsp;&middot;&nbsp; (818) 351-0225</p>
        <p style={{ marginTop: 12, maxWidth: 560, margin: "12px auto 0" }}>
          We are a broker, not a direct lender or payment processor. Savings estimates are illustrative and depend on your
          processing volume, card mix, and current rate. Actual rates are set by the processing partner.
        </p>
      </div>
    </div>
  );
}
