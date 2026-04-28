import { useState, useRef } from "react";
import tcgLogo from "@assets/image_1777403094091.png";

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');

  .ach-form * { box-sizing: border-box; margin: 0; padding: 0; }

  .ach-form {
    font-family: 'DM Sans', sans-serif;
    background: #f8f9fb;
    color: #1a1a2e;
    min-height: 100vh;
    padding: 40px 24px 80px;
  }

  .ach-form .ach-wrapper {
    max-width: 720px;
    margin: 0 auto;
    background: #fff;
    border-radius: 16px;
    box-shadow: 0 4px 24px rgba(0,0,0,0.06);
    padding: 48px 40px;
    overflow: visible;
  }

  .ach-form .logo-row {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
    margin-bottom: 32px;
  }

  .ach-form .logo-sub {
    font-size: 11px; color: #14B8A6; text-transform: uppercase; letter-spacing: 0.08em;
    font-family: 'DM Sans', sans-serif; font-weight: 500;
  }

  .ach-form h1 {
    font-family: 'Syne', sans-serif;
    font-size: 24px;
    font-weight: 700;
    text-align: center;
    margin-bottom: 8px;
    color: #1a1a2e;
  }

  .ach-form .subtitle {
    text-align: center;
    color: #6b7280;
    font-size: 14px;
    line-height: 1.6;
    margin-bottom: 32px;
    max-width: 560px;
    margin-left: auto;
    margin-right: auto;
  }

  .ach-form .section-label {
    font-family: 'Syne', sans-serif;
    font-size: 13px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #14B8A6;
    margin-bottom: 16px;
    margin-top: 32px;
    padding-bottom: 8px;
    border-bottom: 2px solid #e5e7eb;
  }

  .ach-form .field-group {
    margin-bottom: 16px;
  }

  .ach-form .field-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }

  .ach-form .field-row-3 {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 16px;
  }

  .ach-form label {
    display: block;
    font-size: 13px;
    font-weight: 600;
    color: #374151;
    margin-bottom: 6px;
  }

  .ach-form label .required {
    color: #ef4444;
    margin-left: 2px;
  }

  .ach-form input, .ach-form select {
    width: 100%;
    padding: 12px 14px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 15px;
    font-family: 'DM Sans', sans-serif;
    color: #1a1a2e;
    background: #fff;
    transition: border-color 0.2s, box-shadow 0.2s;
    outline: none;
  }

  .ach-form input:focus, .ach-form select:focus {
    border-color: #14B8A6;
    box-shadow: 0 0 0 3px rgba(20,184,166,0.1);
  }

  .ach-form input::placeholder {
    color: #9ca3af;
  }

  .ach-form .radio-group {
    display: flex;
    gap: 24px;
    margin-top: 4px;
  }

  .ach-form .radio-option {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    font-size: 15px;
    color: #374151;
  }

  .ach-form .radio-option input[type="radio"] {
    width: 18px;
    height: 18px;
    accent-color: #14B8A6;
  }

  .ach-form .sig-area {
    margin-top: 24px;
    padding: 24px;
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
  }

  .ach-form .sig-canvas {
    width: 100%;
    height: 120px;
    border: 2px dashed #d1d5db;
    border-radius: 8px;
    cursor: crosshair;
    background: #fff;
    touch-action: none;
  }

  .ach-form .sig-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 8px;
  }

  .ach-form .sig-hint {
    font-size: 12px;
    color: #9ca3af;
  }

  .ach-form .clear-btn {
    padding: 6px 14px;
    background: none;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 12px;
    color: #6b7280;
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
  }

  .ach-form .clear-btn:hover { background: #f3f4f6; }

  .ach-form .submit-btn {
    width: 100%;
    padding: 16px;
    background: linear-gradient(135deg, #14B8A6, #0d9488);
    border: none;
    border-radius: 10px;
    color: #fff;
    font-family: 'Syne', sans-serif;
    font-weight: 700;
    font-size: 16px;
    cursor: pointer;
    margin-top: 32px;
    transition: opacity 0.2s, transform 0.1s;
  }

  .ach-form .submit-btn:hover { opacity: 0.9; transform: translateY(-1px); }
  .ach-form .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

  .ach-form .disclaimer {
    margin-top: 24px;
    padding: 16px;
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    font-size: 12px;
    color: #6b7280;
    line-height: 1.7;
  }

  .ach-form .success-card {
    text-align: center;
    padding: 48px 32px;
  }

  .ach-form .success-icon {
    width: 64px; height: 64px;
    background: rgba(20,184,166,0.1);
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    margin: 0 auto 20px;
    font-size: 28px;
    color: #14B8A6;
  }

  @media (max-width: 640px) {
    .ach-form .container { padding: 32px 20px; }
    .ach-form .field-row, .ach-form .field-row-3 { grid-template-columns: 1fr; }
    .ach-form h1 { font-size: 20px; }
  }
`;

export default function AchForm() {
  const [form, setForm] = useState({
    bankName: "",
    bankAddress: "",
    bankCity: "",
    bankState: "",
    bankZip: "",
    accountType: "checking",
    routingNumber: "",
    accountNumber: "",
    debitDate: "",
    amount: "",
    businessName: "",
    businessAddress: "",
    businessCity: "",
    businessState: "",
    businessZip: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Signature canvas
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  // Canvas drawing
  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;
    setIsDrawing(true);
    setHasSigned(true);
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#1a1a2e";
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDraw = () => setIsDrawing(false);

  const clearSig = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasSigned(false);
    }
  };

  // Pre-fill from URL params
  useState(() => {
    const params = new URLSearchParams(window.location.search);
    const prefill: Record<string, string> = {};
    for (const [key, val] of params.entries()) {
      if (val && key in form) {
        prefill[key] = val;
      }
    }
    if (Object.keys(prefill).length > 0) {
      setForm(prev => ({ ...prev, ...prefill }));
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasSigned) {
      setError("Please sign the form before submitting.");
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      // Get signature as data URL
      const sigData = canvasRef.current?.toDataURL("image/png") || "";

      const payload = {
        ...form,
        signatureData: sigData,
        signedAt: new Date().toISOString(),
      };

      const res = await fetch("/api/ach-form/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Submission failed");
      }

      setSubmitted(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="ach-form">
        <style>{CSS}</style>
        <div className="ach-wrapper">
          <div className="success-card">
            <div className="success-icon">{"\u2713"}</div>
            <h1>ACH Authorization Received</h1>
            <p style={{ color: "#6b7280", fontSize: 15, lineHeight: 1.7, marginTop: 12 }}>
              Thank you, {form.contactName || form.businessName}. Your ACH debit authorization has been submitted successfully.
              You will receive a confirmation email shortly.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ach-form">
      <style>{CSS}</style>
      <div className="ach-wrapper">
        {/* Logo */}
        <div className="logo-row">
          <img src={tcgLogo} alt="Today Capital Group" style={{ height: 48, width: "auto" }} />
          <div className="logo-sub">ACH Authorization</div>
        </div>

        <h1>ACH Debit Authorization Form</h1>
        <p className="subtitle">
          I (We) hereby authorize Today Capital Group to initiate recurring entries to my (our) checking/savings account
          at the financial institution listed below, and, if necessary, to initiate adjustments for any transactions
          credited or debited in error.
        </p>

        <form onSubmit={handleSubmit}>
          {/* Financial Institution */}
          <div className="section-label">Financial Institution</div>

          <div className="field-group">
            <label>Name of Financial Institution <span className="required">*</span></label>
            <input value={form.bankName} onChange={set("bankName")} placeholder="e.g. Bank of America" required />
          </div>

          <div className="field-group">
            <label>Branch Address</label>
            <input value={form.bankAddress} onChange={set("bankAddress")} placeholder="Street address" />
          </div>

          <div className="field-row">
            <div className="field-group">
              <label>City</label>
              <input value={form.bankCity} onChange={set("bankCity")} placeholder="City" />
            </div>
            <div className="field-row" style={{ gap: 12 }}>
              <div className="field-group">
                <label>State</label>
                <input value={form.bankState} onChange={set("bankState")} placeholder="ST" maxLength={2} style={{ textTransform: "uppercase" }} />
              </div>
              <div className="field-group">
                <label>Zip</label>
                <input value={form.bankZip} onChange={set("bankZip")} placeholder="00000" maxLength={5} />
              </div>
            </div>
          </div>

          {/* Account Details */}
          <div className="section-label">Account Details</div>

          <div className="field-group">
            <label>Type of Account <span className="required">*</span></label>
            <div className="radio-group">
              <label className="radio-option">
                <input type="radio" name="accountType" value="checking" checked={form.accountType === "checking"} onChange={set("accountType")} />
                Checking
              </label>
              <label className="radio-option">
                <input type="radio" name="accountType" value="savings" checked={form.accountType === "savings"} onChange={set("accountType")} />
                Savings
              </label>
            </div>
          </div>

          <div className="field-row">
            <div className="field-group">
              <label>Routing Number <span className="required">*</span></label>
              <input value={form.routingNumber} onChange={set("routingNumber")} placeholder="9 digits" maxLength={9} required />
            </div>
            <div className="field-group">
              <label>Account Number <span className="required">*</span></label>
              <input value={form.accountNumber} onChange={set("accountNumber")} placeholder="Account number" required />
            </div>
          </div>

          {/* Debit Details */}
          <div className="section-label">Debit Details</div>

          <div className="field-row">
            <div className="field-group">
              <label>Debit Date (on or after) <span className="required">*</span></label>
              <input type="date" value={form.debitDate} onChange={set("debitDate")} required />
            </div>
            <div className="field-group">
              <label>Amount <span className="required">*</span></label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#6b7280", fontSize: 15 }}>$</span>
                <input value={form.amount} onChange={set("amount")} placeholder="0.00" required style={{ paddingLeft: 28 }} />
              </div>
            </div>
          </div>

          {/* Business / Consumer Info */}
          <div className="section-label">Business / Consumer Information</div>

          <div className="field-group">
            <label>Business / Consumer Name <span className="required">*</span></label>
            <input value={form.businessName} onChange={set("businessName")} placeholder="Legal business name or your full name" required />
          </div>

          <div className="field-group">
            <label>Address</label>
            <input value={form.businessAddress} onChange={set("businessAddress")} placeholder="Street address" />
          </div>

          <div className="field-row-3">
            <div className="field-group">
              <label>City</label>
              <input value={form.businessCity} onChange={set("businessCity")} placeholder="City" />
            </div>
            <div className="field-group">
              <label>State</label>
              <input value={form.businessState} onChange={set("businessState")} placeholder="ST" maxLength={2} style={{ textTransform: "uppercase" }} />
            </div>
            <div className="field-group">
              <label>Zip</label>
              <input value={form.businessZip} onChange={set("businessZip")} placeholder="00000" maxLength={5} />
            </div>
          </div>

          <div className="field-row-3">
            <div className="field-group">
              <label>Contact Name</label>
              <input value={form.contactName} onChange={set("contactName")} placeholder="Full name" />
            </div>
            <div className="field-group">
              <label>Email</label>
              <input type="email" value={form.contactEmail} onChange={set("contactEmail")} placeholder="email@example.com" />
            </div>
            <div className="field-group">
              <label>Phone</label>
              <input type="tel" value={form.contactPhone} onChange={set("contactPhone")} placeholder="(555) 555-5555" />
            </div>
          </div>

          {/* Signature */}
          <div className="section-label">Signature</div>

          <div className="sig-area">
            <label>Account Holder's Signature <span className="required">*</span></label>
            <canvas
              ref={canvasRef}
              className="sig-canvas"
              width={640}
              height={120}
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={stopDraw}
              onMouseLeave={stopDraw}
              onTouchStart={startDraw}
              onTouchMove={draw}
              onTouchEnd={stopDraw}
            />
            <div className="sig-actions">
              <span className="sig-hint">{hasSigned ? "Signature captured" : "Draw your signature above"}</span>
              <button type="button" className="clear-btn" onClick={clearSig}>Clear</button>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="disclaimer">
            If you need to notify us of your intent to cancel and/or revoke this authorization, you must contact us at least
            3 business days prior to the scheduled debit date. You can reach us by calling (818) 351-0225 or emailing
            admin@todaycapitalgroup.com, Monday through Friday from 9:00am to 5:00pm PT.
          </div>

          {error && (
            <div style={{ marginTop: 16, padding: "12px 16px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, color: "#dc2626", fontSize: 14 }}>
              {error}
            </div>
          )}

          <button className="submit-btn" type="submit" disabled={submitting}>
            {submitting ? "Submitting..." : "Submit ACH Authorization"}
          </button>
        </form>
      </div>
    </div>
  );
}
