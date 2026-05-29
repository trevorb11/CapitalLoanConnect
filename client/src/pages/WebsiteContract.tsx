import { useState, useRef, useEffect, useCallback } from "react";

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,700;1,400&family=Inter:wght@300;400;500;600;700&display=swap');

  .wc * { box-sizing: border-box; margin: 0; padding: 0; }

  .wc {
    font-family: 'Inter', sans-serif;
    background: #0c1a2e;
    min-height: 100vh;
    color: #1a1a1a;
  }

  /* ── NAV ── */
  .wc-nav {
    position: sticky; top: 0; z-index: 100;
    background: rgba(12,26,46,0.95);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid rgba(255,255,255,0.07);
    padding: 14px 32px;
    display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;
  }
  .wc-nav-logo { display: flex; align-items: center; gap: 10px; text-decoration: none; }
  .wc-nav-mark {
    width: 34px; height: 34px;
    background: linear-gradient(135deg, #1e40af, #0f1f3d);
    border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    font-weight: 800; font-size: 13px; color: #fff;
  }
  .wc-nav-name { font-weight: 700; font-size: 14px; color: #e8ecf2; }
  .wc-nav-sub { font-size: 10px; color: #60a5fa; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 600; }
  .wc-nav-badge {
    padding: 5px 14px;
    background: rgba(30,64,175,0.2);
    border: 1px solid rgba(96,165,250,0.3);
    border-radius: 100px;
    font-size: 11px; font-weight: 700; color: #93c5fd;
    text-transform: uppercase; letter-spacing: 0.09em;
  }

  /* ── WRAPPER ── */
  .wc-outer {
    max-width: 860px; margin: 0 auto; padding: 48px 24px 80px;
  }

  /* ── PAPER ── */
  .wc-paper {
    background: #ffffff;
    border-radius: 4px;
    box-shadow: 0 8px 48px rgba(0,0,0,0.35), 0 2px 8px rgba(0,0,0,0.2);
    padding: 64px 72px;
    font-family: 'EB Garamond', Georgia, serif;
    font-size: 15px;
    line-height: 1.75;
    color: #1a1a1a;
  }

  /* ── DOCUMENT HEADER ── */
  .wc-doc-header {
    text-align: center;
    margin-bottom: 40px;
    padding-bottom: 24px;
    border-bottom: 2px solid #1a1a1a;
  }
  .wc-doc-title {
    font-size: 22px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: 6px;
  }
  .wc-doc-org {
    font-size: 15px;
    font-style: italic;
    color: #444;
  }

  /* ── INTRO BLOCK ── */
  .wc-intro { margin-bottom: 28px; }
  .wc-intro p { margin-bottom: 10px; }

  /* ── SECTION ── */
  .wc-section { margin-bottom: 24px; }
  .wc-section-title {
    font-size: 15px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin-bottom: 10px;
    margin-top: 32px;
    border-bottom: 1px solid #e0e0e0;
    padding-bottom: 4px;
  }
  .wc-sub { margin-bottom: 12px; }
  .wc-sub-num { font-weight: 700; }
  .wc-para { margin-bottom: 10px; }
  .wc-list { list-style: disc; padding-left: 28px; margin: 8px 0 12px; }
  .wc-list li { margin-bottom: 6px; }

  /* ── FILLABLE FIELDS ── */
  .wc-field {
    display: inline-block;
    border: none;
    border-bottom: 1.5px solid #1a3a8f;
    background: #f0f5ff;
    border-radius: 2px;
    font-family: 'EB Garamond', Georgia, serif;
    font-size: 15px;
    color: #1a3a8f;
    padding: 2px 6px;
    outline: none;
    transition: background 0.15s, border-color 0.15s;
    vertical-align: baseline;
    min-width: 60px;
  }
  .wc-field:focus {
    background: #dbeafe;
    border-bottom-color: #1e40af;
  }
  .wc-field::placeholder { color: #93c5fd; font-style: italic; }
  .wc-field-sm { width: 100px; }
  .wc-field-md { width: 200px; }
  .wc-field-lg { width: 300px; }
  .wc-field-xl { width: 100%; display: block; margin-top: 6px; padding: 6px 10px; }
  .wc-field-money { width: 120px; }

  /* ── RADIO HOSTING ── */
  .wc-hosting-options { margin: 12px 0; }
  .wc-hosting-option {
    display: flex; align-items: flex-start; gap: 10px;
    margin-bottom: 14px;
    padding: 12px 16px;
    border: 1.5px solid #e0e0e0;
    border-radius: 6px;
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s;
  }
  .wc-hosting-option.selected {
    border-color: #1e40af;
    background: #f0f5ff;
  }
  .wc-hosting-option input[type=radio] { margin-top: 3px; flex-shrink: 0; cursor: pointer; accent-color: #1e40af; }
  .wc-hosting-option-body { flex: 1; }
  .wc-hosting-option-label { font-weight: 700; margin-bottom: 4px; }
  .wc-hosting-option-desc { font-size: 14px; color: #444; line-height: 1.6; }

  /* ── CAPS TEXT ── */
  .wc-caps {
    font-size: 13px;
    font-family: 'Inter', sans-serif;
    line-height: 1.55;
    color: #1a1a1a;
    margin-bottom: 10px;
  }

  /* ── SIGNATURES SECTION ── */
  .wc-sig-section {
    margin-top: 48px;
    padding-top: 32px;
    border-top: 2px solid #1a1a1a;
  }
  .wc-sig-title {
    font-size: 15px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    text-align: center;
    margin-bottom: 36px;
  }
  .wc-sig-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 40px;
  }
  .wc-sig-party-label {
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-size: 13px;
    margin-bottom: 16px;
    color: #444;
  }
  .wc-sig-canvas-wrap {
    border: 1.5px solid #d0d0d0;
    border-radius: 4px;
    background: #fafafa;
    margin-bottom: 12px;
    position: relative;
    cursor: crosshair;
  }
  .wc-sig-canvas-wrap canvas {
    display: block;
    width: 100%;
    height: 110px;
    touch-action: none;
  }
  .wc-sig-canvas-hint {
    position: absolute; bottom: 6px; left: 0; right: 0;
    text-align: center;
    font-family: 'Inter', sans-serif;
    font-size: 11px; color: #bbb; pointer-events: none;
  }
  .wc-sig-clear {
    font-family: 'Inter', sans-serif;
    font-size: 11px; color: #888;
    background: none; border: none; cursor: pointer;
    padding: 0; text-decoration: underline;
    margin-bottom: 14px; display: block;
  }
  .wc-sig-clear:hover { color: #1e40af; }
  .wc-sig-row {
    margin-bottom: 10px;
  }
  .wc-sig-label {
    font-family: 'Inter', sans-serif;
    font-size: 11px; font-weight: 600;
    text-transform: uppercase; letter-spacing: 0.07em;
    color: #888; margin-bottom: 3px;
  }
  .wc-sig-input {
    width: 100%;
    border: none;
    border-bottom: 1.5px solid #d0d0d0;
    background: transparent;
    font-family: 'EB Garamond', Georgia, serif;
    font-size: 15px;
    padding: 3px 0;
    outline: none;
    color: #1a1a1a;
    transition: border-color 0.15s;
  }
  .wc-sig-input:focus { border-bottom-color: #1e40af; }
  .wc-sig-input::placeholder { color: #ccc; font-style: italic; }

  /* ── SUBMIT ── */
  .wc-submit-wrap {
    margin-top: 48px;
    text-align: center;
  }
  .wc-submit {
    padding: 16px 48px;
    background: #1e40af;
    border: none; border-radius: 8px;
    color: #fff; font-family: 'Inter', sans-serif;
    font-weight: 700; font-size: 15px;
    cursor: pointer; transition: background 0.2s, transform 0.15s;
    box-shadow: 0 4px 16px rgba(30,64,175,0.3);
  }
  .wc-submit:hover { background: #1d4ed8; transform: translateY(-1px); }
  .wc-submit:disabled { opacity: 0.45; cursor: not-allowed; transform: none; }
  .wc-submit-note {
    font-family: 'Inter', sans-serif;
    font-size: 12px; color: #888; margin-top: 12px;
  }

  /* ── SUCCESS ── */
  .wc-success {
    text-align: center; padding: 48px 32px;
    font-family: 'Inter', sans-serif;
  }
  .wc-success-icon {
    width: 72px; height: 72px;
    background: #dcfce7;
    border: 2px solid #16a34a;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    margin: 0 auto 24px; font-size: 32px; color: #16a34a;
  }
  .wc-success h3 {
    font-family: 'EB Garamond', Georgia, serif;
    font-size: 28px; font-weight: 700; color: #1a1a1a; margin-bottom: 10px;
  }
  .wc-success p { font-size: 15px; color: #555; line-height: 1.7; }

  @media (max-width: 700px) {
    .wc-paper { padding: 36px 24px; }
    .wc-sig-grid { grid-template-columns: 1fr; }
    .wc-outer { padding: 24px 12px 60px; }
  }
`;

function useSignaturePad(canvasRef: React.RefObject<HTMLCanvasElement>) {
  const drawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const hasSig = useRef(false);

  const getPos = (e: MouseEvent | TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Set actual pixel dimensions
    canvas.width = canvas.offsetWidth * window.devicePixelRatio || 400;
    canvas.height = 110 * window.devicePixelRatio || 110;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const start = (e: MouseEvent | TouchEvent) => {
      drawing.current = true;
      lastPos.current = getPos(e, canvas);
      hasSig.current = true;
    };
    const move = (e: MouseEvent | TouchEvent) => {
      if (!drawing.current || !lastPos.current) return;
      e.preventDefault();
      const pos = getPos(e, canvas);
      ctx.beginPath();
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.strokeStyle = "#1a1a1a";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
      lastPos.current = pos;
    };
    const end = () => { drawing.current = false; lastPos.current = null; };

    canvas.addEventListener("mousedown", start);
    canvas.addEventListener("mousemove", move);
    canvas.addEventListener("mouseup", end);
    canvas.addEventListener("mouseleave", end);
    canvas.addEventListener("touchstart", start, { passive: false });
    canvas.addEventListener("touchmove", move, { passive: false });
    canvas.addEventListener("touchend", end);

    return () => {
      canvas.removeEventListener("mousedown", start);
      canvas.removeEventListener("mousemove", move);
      canvas.removeEventListener("mouseup", end);
      canvas.removeEventListener("mouseleave", end);
      canvas.removeEventListener("touchstart", start);
      canvas.removeEventListener("touchmove", move);
      canvas.removeEventListener("touchend", end);
    };
  }, [canvasRef]);

  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasSig.current = false;
  }, [canvasRef]);

  const getDataURL = useCallback(() => {
    return canvasRef.current?.toDataURL("image/png") || "";
  }, [canvasRef]);

  return { clear, getDataURL, hasSig };
}

export default function WebsiteContract() {
  // Header fields
  const [effectiveDate, setEffectiveDate] = useState("");
  const [effectiveYear, setEffectiveYear] = useState(new Date().getFullYear().toString());
  const [clientName, setClientName] = useState("");
  const [clientAddress, setClientAddress] = useState("");

  // Section 4
  const [projectFee, setProjectFee] = useState("");

  // Section 5 hosting
  const [hostingOption, setHostingOption] = useState<"A" | "B" | "">("");

  // TCG signature block
  const [tcgPrintedName, setTcgPrintedName] = useState("Trevor");
  const [tcgTitle, setTcgTitle] = useState("Founder, Today Capital Group");
  const [tcgDate, setTcgDate] = useState(new Date().toLocaleDateString("en-US"));
  const tcgCanvasRef = useRef<HTMLCanvasElement>(null);
  const tcgSig = useSignaturePad(tcgCanvasRef);

  // Client signature block
  const [clientPrintedName, setClientPrintedName] = useState("");
  const [clientTitle, setClientTitle] = useState("");
  const [clientCompany, setClientCompany] = useState("");
  const [clientDate, setClientDate] = useState("");
  const clientCanvasRef = useRef<HTMLCanvasElement>(null);
  const clientSig = useSignaturePad(clientCanvasRef);

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!clientName || !projectFee || !clientPrintedName) {
      setError("Please fill in Client name, Project Fee, and Client printed name before submitting.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await fetch("/api/contracts/website", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          effectiveDate: `${effectiveDate}, ${effectiveYear}`,
          clientName,
          clientAddress,
          projectFee,
          hostingOption,
          tcgPrintedName,
          tcgTitle,
          tcgDate,
          tcgSignature: tcgSig.getDataURL(),
          clientPrintedName,
          clientTitle,
          clientCompany,
          clientDate,
          clientSignature: clientSig.getDataURL(),
        }),
      });
      setSubmitted(true);
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="wc">
      <style>{CSS}</style>

      {/* NAV */}
      <nav className="wc-nav">
        <a className="wc-nav-logo" href="/services/website">
          <div className="wc-nav-mark">TCG</div>
          <div>
            <div className="wc-nav-name">Today Capital Group</div>
            <div className="wc-nav-sub">Web Development</div>
          </div>
        </a>
        <div className="wc-nav-badge">Website Build Services Agreement</div>
      </nav>

      <div className="wc-outer">
        <div className="wc-paper">
          {submitted ? (
            <div className="wc-success">
              <div className="wc-success-icon">&#10003;</div>
              <h3>Agreement Submitted</h3>
              <p>
                The signed Website Build Services Agreement for <strong>{clientName}</strong> has been recorded.<br />
                A copy will be sent to the team shortly.
              </p>
            </div>
          ) : (
            <>
              {/* ── DOCUMENT HEADER ── */}
              <div className="wc-doc-header">
                <div className="wc-doc-title">Website Build Services Agreement</div>
                <div className="wc-doc-org">Today Capital Group</div>
              </div>

              {/* ── INTRO ── */}
              <div className="wc-intro">
                <p>
                  This Website Build Services Agreement (the <strong>"Agreement"</strong>) is entered into as of{" "}
                  <input
                    className="wc-field wc-field-md"
                    placeholder="Month Day"
                    value={effectiveDate}
                    onChange={e => setEffectiveDate(e.target.value)}
                    data-testid="input-effective-date"
                  />{", "}
                  <input
                    className="wc-field wc-field-sm"
                    placeholder="Year"
                    value={effectiveYear}
                    onChange={e => setEffectiveYear(e.target.value)}
                    data-testid="input-effective-year"
                  />{" "}
                  (the <strong>"Effective Date"</strong>) by and between:
                </p>

                <p style={{ marginTop: 16 }}>
                  <strong>Service Provider:</strong> Today Capital Group, a California business entity now operating as Guide Funding Group, located at Woodland Hills, California (<strong>"TCG," "we," "us," or "our"</strong>).
                </p>

                <p style={{ marginTop: 12 }}>
                  <strong>Client:</strong>{" "}
                  <input
                    className="wc-field wc-field-lg"
                    placeholder="Client / Company Name"
                    value={clientName}
                    onChange={e => setClientName(e.target.value)}
                    data-testid="input-client-name"
                  />{", located at "}
                  <input
                    className="wc-field wc-field-lg"
                    placeholder="Client address"
                    value={clientAddress}
                    onChange={e => setClientAddress(e.target.value)}
                    data-testid="input-client-address"
                  />{" "}(<strong>"Client," "you," or "your"</strong>).
                </p>

                <p style={{ marginTop: 12 }}>TCG and Client are each a <strong>"Party"</strong> and together the <strong>"Parties."</strong></p>
              </div>

              {/* ── SECTION 1 ── */}
              <div className="wc-section-title">1. Services</div>

              <div className="wc-sub">
                <p><span className="wc-sub-num">1.1 Scope.</span> TCG will design, build, and deliver a custom website for Client (the <strong>"Website"</strong>) based on the scope of work, design preferences, content, and functionality discussed during a discovery call between the Parties and documented in a separate scope summary or written correspondence between the Parties (the <strong>"Scope"</strong>). The Scope may include, without limitation, page layout, copy, basic visual design, navigation structure, and standard functionality typical of a small-business website.</p>
              </div>

              <div className="wc-sub">
                <p><span className="wc-sub-num">1.2 Discovery Call.</span> Prior to building, TCG will conduct a discovery call with Client and any team members Client chooses to include, to confirm goals, content requirements, and design direction. The Scope is intended to reflect what is discussed during this call.</p>
              </div>

              <div className="wc-sub">
                <p><span className="wc-sub-num">1.3 Revisions.</span> The fees set forth in Section 4 include two (2) rounds of revisions following Client's review of the initial build. A <strong>"round of revisions"</strong> means a single, consolidated set of change requests delivered by Client to TCG in writing. Additional rounds of revisions, scope changes, or new feature requests beyond the agreed Scope are not included and may be quoted separately as additional services.</p>
              </div>

              <div className="wc-sub">
                <p><span className="wc-sub-num">1.4 Out of Scope.</span> Unless expressly included in the Scope, the following are not included and may be quoted separately: e-commerce setup beyond basic checkout, custom integrations with third-party software, ongoing SEO services, paid advertising, email marketing setup, copywriting beyond standard page copy, photography and videography, translation, accessibility audits, and ongoing maintenance after delivery.</p>
              </div>

              {/* ── SECTION 2 ── */}
              <div className="wc-section-title">2. Client Responsibilities</div>
              <p className="wc-para">To allow TCG to deliver on schedule, Client agrees to:</p>
              <ul className="wc-list">
                <li>Provide all required content (text, images, branding assets, logos, contact information) within the timeframes agreed during the discovery call.</li>
                <li>Provide timely feedback during the revision rounds described in Section 1.3. Client feedback that is delayed by more than fourteen (14) calendar days from TCG's delivery may, at TCG's discretion, result in the project being placed on hold.</li>
                <li>Confirm in writing (email is sufficient) that Client has the legal right to use any content, images, logos, or other materials provided to TCG.</li>
                <li>Register and maintain the domain name in Client's own account (see Section 5).</li>
                <li>Maintain reasonable communication with TCG throughout the project.</li>
              </ul>

              {/* ── SECTION 3 ── */}
              <div className="wc-section-title">3. Ownership of the Website</div>

              <div className="wc-sub">
                <p><span className="wc-sub-num">3.1 Transfer of Ownership.</span> Upon Client's payment in full of the fees set forth in Section 4, TCG hereby assigns and transfers to Client all of TCG's right, title, and interest in and to the final, delivered Website, including the design, code, layout, page content authored by TCG specifically for Client, and all custom assets created by TCG for the Website (collectively, the <strong>"Deliverables"</strong>).</p>
              </div>

              <div className="wc-sub">
                <p><span className="wc-sub-num">3.2 What Client Owns.</span> Client will own:</p>
                <ul className="wc-list">
                  <li>The final, delivered design and layout of the Website.</li>
                  <li>All copy and content written by TCG specifically for Client as part of the build.</li>
                  <li>All custom graphics and visual assets created by TCG specifically for Client as part of the build.</li>
                  <li>A full export or copy of the Website files, deliverable in a portable format upon Client request.</li>
                </ul>
              </div>

              <div className="wc-sub">
                <p><span className="wc-sub-num">3.3 Exclusions.</span> Client's ownership does not extend to:</p>
                <ul className="wc-list">
                  <li>Third-party software, plugins, themes, frameworks, fonts, stock photography, or libraries used in the Website. These remain subject to their respective owners' licenses, and Client agrees to comply with those licenses.</li>
                  <li>TCG's general tools, internal workflows, processes, templates, and know-how used to build the Website, which TCG retains and may reuse on future projects, provided TCG does not use Client's confidential information or branded materials.</li>
                </ul>
              </div>

              <div className="wc-sub">
                <p><span className="wc-sub-num">3.4 Portfolio Use.</span> TCG may display screenshots or references to the Website, and may identify Client as a TCG client, in TCG's portfolio, marketing materials, and case studies, unless Client requests otherwise in writing.</p>
              </div>

              {/* ── SECTION 4 ── */}
              <div className="wc-section-title">4. Fees and Payment</div>

              <div className="wc-sub">
                <p>
                  <span className="wc-sub-num">4.1 Project Fee.</span> The total project fee is{" "}
                  <strong>$</strong>
                  <input
                    className="wc-field wc-field-money"
                    placeholder="Amount"
                    value={projectFee}
                    onChange={e => setProjectFee(e.target.value)}
                    data-testid="input-project-fee"
                  />{" "}
                  USD (the <strong>"Project Fee"</strong>), inclusive of the discovery call, build, and two (2) rounds of revisions described in Section 1.
                </p>
              </div>

              <div className="wc-sub">
                <p><span className="wc-sub-num">4.2 Payment Terms.</span> The Project Fee is due in full prior to TCG beginning work, unless otherwise agreed in writing between the Parties.</p>
              </div>

              <div className="wc-sub">
                <p><span className="wc-sub-num">4.3 Additional Work.</span> Any work outside the Scope, additional revision rounds beyond those included, or new features requested after the build begins will be quoted separately and require Client's written approval before TCG begins the additional work.</p>
              </div>

              <div className="wc-sub">
                <p><span className="wc-sub-num">4.4 Refunds.</span> Once work has begun, the Project Fee is non-refundable. If Client cancels the project before TCG has begun substantive work, TCG will refund the Project Fee less a reasonable administrative fee to cover discovery and onboarding time.</p>
              </div>

              {/* ── SECTION 5 ── */}
              <div className="wc-section-title">5. Hosting and Domain</div>

              <div className="wc-sub">
                <p style={{ marginBottom: 12 }}><span className="wc-sub-num">5.1 Hosting Options.</span> Client may choose between the following hosting options:</p>
                <div className="wc-hosting-options">
                  <label
                    className={`wc-hosting-option${hostingOption === "A" ? " selected" : ""}`}
                    onClick={() => setHostingOption("A")}
                  >
                    <input
                      type="radio"
                      name="hosting"
                      checked={hostingOption === "A"}
                      onChange={() => setHostingOption("A")}
                      data-testid="radio-hosting-a"
                    />
                    <div className="wc-hosting-option-body">
                      <div className="wc-hosting-option-label">Option A — Hosting via SiteGround through TCG</div>
                      <div className="wc-hosting-option-desc">TCG will set up hosting for the Website with SiteGround on Client's behalf. Standard SiteGround hosting fees and renewal terms apply and are set by SiteGround, not by TCG. Hosting fees are billed separately from the Project Fee. Client will own the hosting account or, if the account is held under TCG, TCG will transfer ownership to Client upon written request at no additional charge.</div>
                    </div>
                  </label>
                  <label
                    className={`wc-hosting-option${hostingOption === "B" ? " selected" : ""}`}
                    onClick={() => setHostingOption("B")}
                  >
                    <input
                      type="radio"
                      name="hosting"
                      checked={hostingOption === "B"}
                      onChange={() => setHostingOption("B")}
                      data-testid="radio-hosting-b"
                    />
                    <div className="wc-hosting-option-body">
                      <div className="wc-hosting-option-label">Option B — Client-Provided Hosting</div>
                      <div className="wc-hosting-option-desc">Client may host the Website on any platform of their choosing (for example, WordPress.com, Webflow, SiteGround, GoDaddy, Bluehost, or other). TCG will deliver the Website files in a portable format suitable for the chosen platform. Client is responsible for setting up, maintaining, and paying for the hosting environment.</div>
                    </div>
                  </label>
                </div>
              </div>

              <div className="wc-sub">
                <p><span className="wc-sub-num">5.2 Domain Name.</span> Registration, renewal, and ongoing payment for the domain name are the sole responsibility of Client. Client should register the domain in Client's own name and account so that Client maintains continuous control. TCG may, as a courtesy, assist Client in connecting the domain to the chosen hosting environment, but TCG does not register, hold, or maintain Client's domain.</p>
              </div>

              <div className="wc-sub">
                <p><span className="wc-sub-num">5.3 Third-Party Services.</span> Hosting providers, domain registrars, and other third-party services used in connection with the Website are independent of TCG. TCG is not responsible for outages, billing disputes, account suspensions, or other issues arising from third-party services.</p>
              </div>

              {/* ── SECTION 6 ── */}
              <div className="wc-section-title">6. Timeline</div>

              <div className="wc-sub">
                <p><span className="wc-sub-num">6.1 Target Delivery.</span> TCG will aim to deliver an initial build of the Website within the timeframe discussed during the discovery call and documented in the Scope. Target delivery times are estimates, not guarantees, and depend on the timeliness of Client's content delivery and feedback.</p>
              </div>

              <div className="wc-sub">
                <p><span className="wc-sub-num">6.2 Delays Caused by Client.</span> If Client's delays in providing content, feedback, or approvals extend the project, TCG's delivery timeline will be extended accordingly. Repeated or extended delays (more than thirty (30) calendar days of inactivity from Client) may result in the project being closed, with delivery of the Website in its then-current state and no refund of the Project Fee.</p>
              </div>

              {/* ── SECTION 7 ── */}
              <div className="wc-section-title">7. Warranties and Disclaimers</div>

              <div className="wc-sub">
                <p><span className="wc-sub-num">7.1 TCG's Warranty.</span> TCG warrants that the services will be performed in a professional and workmanlike manner, consistent with industry standards for small-business website builds.</p>
              </div>

              <div className="wc-sub">
                <p className="wc-caps"><span className="wc-sub-num">7.2 Disclaimers.</span> EXCEPT AS EXPRESSLY STATED IN THIS AGREEMENT, THE WEBSITE AND ALL SERVICES ARE PROVIDED "AS IS." TCG MAKES NO OTHER WARRANTIES, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO ANY IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, OR THAT THE WEBSITE WILL ACHIEVE ANY SPECIFIC BUSINESS RESULT, SEARCH RANKING, TRAFFIC LEVEL, OR REVENUE OUTCOME.</p>
              </div>

              <div className="wc-sub">
                <p><span className="wc-sub-num">7.3 Client Content.</span> Client warrants that all content, images, logos, and other materials provided to TCG are owned by Client or properly licensed, and that TCG's use of such materials will not infringe the rights of any third party. Client will indemnify and hold TCG harmless from any third-party claim arising from Client-provided content.</p>
              </div>

              {/* ── SECTION 8 ── */}
              <div className="wc-section-title">8. Limitation of Liability</div>
              <p className="wc-caps">TO THE MAXIMUM EXTENT PERMITTED BY LAW, TCG'S TOTAL LIABILITY UNDER OR IN CONNECTION WITH THIS AGREEMENT WILL NOT EXCEED THE TOTAL PROJECT FEE ACTUALLY PAID BY CLIENT TO TCG. IN NO EVENT WILL TCG BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOST PROFITS OR LOST BUSINESS, EVEN IF TCG HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.</p>

              {/* ── SECTION 9 ── */}
              <div className="wc-section-title">9. Confidentiality</div>
              <p className="wc-para">Each Party agrees to keep confidential any non-public business information shared by the other Party during the project, and to use such information only for purposes of performing this Agreement. This obligation does not apply to information that is publicly available, independently developed, or required to be disclosed by law.</p>

              {/* ── SECTION 10 ── */}
              <div className="wc-section-title">10. Term and Termination</div>

              <div className="wc-sub">
                <p><span className="wc-sub-num">10.1 Term.</span> This Agreement begins on the Effective Date and continues until the Website is delivered and the revision rounds described in Section 1 are completed, unless terminated earlier as provided below.</p>
              </div>

              <div className="wc-sub">
                <p><span className="wc-sub-num">10.2 Termination for Cause.</span> Either Party may terminate this Agreement upon written notice if the other Party materially breaches this Agreement and fails to cure the breach within fifteen (15) calendar days of receiving written notice of the breach.</p>
              </div>

              <div className="wc-sub">
                <p><span className="wc-sub-num">10.3 Effect of Termination.</span> Upon termination, TCG will deliver the Website in its then-current state to Client, and ownership of the delivered portion will transfer to Client provided the Project Fee has been paid in full. If the Project Fee has not been paid, TCG retains all rights in the Deliverables until payment is received.</p>
              </div>

              {/* ── SECTION 11 ── */}
              <div className="wc-section-title">11. General Terms</div>

              <div className="wc-sub">
                <p><span className="wc-sub-num">11.1 Independent Contractor.</span> TCG is an independent contractor. Nothing in this Agreement creates an employment, partnership, joint venture, or agency relationship between the Parties.</p>
              </div>

              <div className="wc-sub">
                <p><span className="wc-sub-num">11.2 Governing Law.</span> This Agreement is governed by the laws of the State of California, without regard to its conflict-of-laws principles. The Parties consent to the exclusive jurisdiction of the state and federal courts located in Los Angeles County, California, for any dispute arising out of or relating to this Agreement.</p>
              </div>

              <div className="wc-sub">
                <p><span className="wc-sub-num">11.3 Entire Agreement.</span> This Agreement, together with the Scope, represents the entire agreement between the Parties regarding the subject matter and supersedes all prior discussions, proposals, or agreements, written or oral.</p>
              </div>

              <div className="wc-sub">
                <p><span className="wc-sub-num">11.4 Amendments.</span> Any amendment to this Agreement must be in writing and signed by both Parties. Email confirmation by both Parties is sufficient for amendments related to Scope adjustments.</p>
              </div>

              <div className="wc-sub">
                <p><span className="wc-sub-num">11.5 Severability.</span> If any provision of this Agreement is held to be unenforceable, the remaining provisions will remain in full force and effect.</p>
              </div>

              <div className="wc-sub">
                <p><span className="wc-sub-num">11.6 Notices.</span> Notices under this Agreement may be delivered by email to the addresses the Parties use to communicate during the project, and will be deemed received on the next business day after sending.</p>
              </div>

              <div className="wc-sub">
                <p><span className="wc-sub-num">11.7 Counterparts and Electronic Signatures.</span> This Agreement may be signed in counterparts and by electronic signature, each of which will be deemed an original.</p>
              </div>

              {/* ── SIGNATURES ── */}
              <div className="wc-sig-section">
                <div className="wc-sig-title">Signatures</div>
                <p className="wc-para" style={{ textAlign: "center", marginBottom: 32, fontStyle: "italic" }}>
                  By signing below, each Party acknowledges that they have read, understood, and agree to be bound by this Agreement.
                </p>

                <div className="wc-sig-grid">
                  {/* TCG */}
                  <div>
                    <div className="wc-sig-party-label">Today Capital Group</div>

                    <div style={{ marginBottom: 6, fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#888" }}>Signature</div>
                    <div className="wc-sig-canvas-wrap">
                      <canvas ref={tcgCanvasRef} data-testid="canvas-tcg-sig" />
                      <span className="wc-sig-canvas-hint">Draw signature here</span>
                    </div>
                    <button className="wc-sig-clear" onClick={tcgSig.clear} data-testid="button-clear-tcg-sig">Clear</button>

                    <div className="wc-sig-row">
                      <div className="wc-sig-label">Printed Name</div>
                      <input className="wc-sig-input" value={tcgPrintedName} onChange={e => setTcgPrintedName(e.target.value)} placeholder="Printed name" data-testid="input-tcg-name" />
                    </div>
                    <div className="wc-sig-row">
                      <div className="wc-sig-label">Title</div>
                      <input className="wc-sig-input" value={tcgTitle} onChange={e => setTcgTitle(e.target.value)} placeholder="Title" data-testid="input-tcg-title" />
                    </div>
                    <div className="wc-sig-row">
                      <div className="wc-sig-label">Date</div>
                      <input className="wc-sig-input" value={tcgDate} onChange={e => setTcgDate(e.target.value)} placeholder="Date" data-testid="input-tcg-date" />
                    </div>
                  </div>

                  {/* CLIENT */}
                  <div>
                    <div className="wc-sig-party-label">Client</div>

                    <div style={{ marginBottom: 6, fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#888" }}>Signature</div>
                    <div className="wc-sig-canvas-wrap">
                      <canvas ref={clientCanvasRef} data-testid="canvas-client-sig" />
                      <span className="wc-sig-canvas-hint">Draw signature here</span>
                    </div>
                    <button className="wc-sig-clear" onClick={clientSig.clear} data-testid="button-clear-client-sig">Clear</button>

                    <div className="wc-sig-row">
                      <div className="wc-sig-label">Printed Name</div>
                      <input className="wc-sig-input" value={clientPrintedName} onChange={e => setClientPrintedName(e.target.value)} placeholder="Printed name" data-testid="input-client-printed-name" />
                    </div>
                    <div className="wc-sig-row">
                      <div className="wc-sig-label">Title</div>
                      <input className="wc-sig-input" value={clientTitle} onChange={e => setClientTitle(e.target.value)} placeholder="Title" data-testid="input-client-title" />
                    </div>
                    <div className="wc-sig-row">
                      <div className="wc-sig-label">Company Name</div>
                      <input className="wc-sig-input" value={clientCompany} onChange={e => setClientCompany(e.target.value)} placeholder="Company name" data-testid="input-client-company" />
                    </div>
                    <div className="wc-sig-row">
                      <div className="wc-sig-label">Date</div>
                      <input className="wc-sig-input" value={clientDate} onChange={e => setClientDate(e.target.value)} placeholder="Date" data-testid="input-client-date" />
                    </div>
                  </div>
                </div>

                {error && (
                  <p style={{ color: "#dc2626", fontFamily: "'Inter', sans-serif", fontSize: 13, marginTop: 24, textAlign: "center" }}>
                    {error}
                  </p>
                )}

                <div className="wc-submit-wrap">
                  <button
                    className="wc-submit"
                    onClick={handleSubmit}
                    disabled={submitting}
                    data-testid="button-submit-contract"
                  >
                    {submitting ? "Submitting Agreement…" : "Submit Signed Agreement"}
                  </button>
                  <p className="wc-submit-note">
                    Electronic signatures are legally binding per Section 11.7 of this Agreement.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
