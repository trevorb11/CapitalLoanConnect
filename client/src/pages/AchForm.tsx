import { useState } from "react";
import tcgLogo from "@assets/image_1777403094091.png";

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');

  .ach-form * { box-sizing: border-box; margin: 0; padding: 0; }

  .ach-form {
    font-family: 'DM Sans', sans-serif;
    background: #f8f9fb;
    color: #1a1a2e;
    min-height: 100vh;
    padding: 20px 24px 40px;
  }

  .ach-form .ach-wrapper {
    max-width: 720px;
    margin: 0 auto;
    background: #fff;
    border-radius: 16px;
    box-shadow: 0 4px 24px rgba(0,0,0,0.06);
    padding: 28px 36px 32px;
    overflow: visible;
  }

  .ach-form .logo-row {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
    margin-bottom: 16px;
  }

  .ach-form .logo-sub {
    font-size: 10px; color: #14B8A6; text-transform: uppercase; letter-spacing: 0.08em;
    font-family: 'DM Sans', sans-serif; font-weight: 500;
  }

  .ach-form h1 {
    font-family: 'Syne', sans-serif;
    font-size: 20px;
    font-weight: 700;
    text-align: center;
    margin-bottom: 6px;
    color: #1a1a2e;
  }

  .ach-form .subtitle {
    text-align: center;
    color: #6b7280;
    font-size: 13px;
    line-height: 1.5;
    margin-bottom: 18px;
    max-width: 560px;
    margin-left: auto;
    margin-right: auto;
  }

  .ach-form .section-label {
    font-family: 'Syne', sans-serif;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #14B8A6;
    margin-bottom: 10px;
    margin-top: 18px;
    padding-bottom: 6px;
    border-bottom: 1.5px solid #e5e7eb;
  }

  .ach-form .field-group {
    margin-bottom: 10px;
  }

  .ach-form .field-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .ach-form .field-row-3 {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 12px;
  }

  .ach-form label {
    display: block;
    font-size: 11px;
    font-weight: 600;
    color: #374151;
    margin-bottom: 4px;
  }

  .ach-form label .required {
    color: #ef4444;
    margin-left: 2px;
  }

  .ach-form input, .ach-form select {
    width: 100%;
    padding: 8px 11px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 13px;
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
    margin-top: 8px;
  }

  .ach-form .sig-line-row {
    display: flex;
    align-items: flex-end;
    gap: 24px;
    margin-top: 6px;
  }

  .ach-form .sig-line-wrap {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .ach-form .sig-date-wrap {
    width: 160px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
  }

  .ach-form .sig-input {
    width: 100%;
    border: none !important;
    border-bottom: 1.5px solid #1a1a2e !important;
    border-radius: 0 !important;
    padding: 4px 0 !important;
    font-size: 15px;
    font-family: 'DM Sans', sans-serif;
    color: #1a1a2e;
    background: transparent;
    box-shadow: none !important;
    outline: none;
  }

  .ach-form .sig-input:focus {
    border-bottom-color: #14B8A6 !important;
  }

  .ach-form .sig-sub-label {
    font-size: 11px;
    color: #9ca3af;
    margin-top: 4px;
    letter-spacing: 0.02em;
  }

  .ach-form .submit-btn {
    width: 100%;
    padding: 12px;
    background: linear-gradient(135deg, #14B8A6, #0d9488);
    border: none;
    border-radius: 8px;
    color: #fff;
    font-family: 'Syne', sans-serif;
    font-weight: 700;
    font-size: 14px;
    cursor: pointer;
    margin-top: 16px;
    transition: opacity 0.2s, transform 0.1s;
  }

  .ach-form .submit-btn:hover { opacity: 0.9; transform: translateY(-1px); }
  .ach-form .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

  .ach-form .disclaimer {
    margin-top: 14px;
    padding: 10px 12px;
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    font-size: 11px;
    color: #6b7280;
    line-height: 1.6;
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

  .ach-form .top-bar {
    max-width: 720px;
    margin: 0 auto 16px;
    display: flex;
    justify-content: flex-end;
    gap: 10px;
  }

  .ach-form .pdf-btn {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 9px 18px;
    background: #fff;
    border: 1.5px solid #d1d5db;
    border-radius: 8px;
    font-family: 'DM Sans', sans-serif;
    font-size: 13px;
    font-weight: 600;
    color: #374151;
    cursor: pointer;
    transition: border-color 0.2s, box-shadow 0.2s;
    text-decoration: none;
  }

  .ach-form .pdf-btn:hover {
    border-color: #14B8A6;
    color: #14B8A6;
    box-shadow: 0 0 0 3px rgba(20,184,166,0.08);
  }

  .ach-form .pdf-btn svg {
    flex-shrink: 0;
  }

  @media (max-width: 640px) {
    .ach-form .ach-wrapper { padding: 32px 20px; }
    .ach-form .field-row, .ach-form .field-row-3 { grid-template-columns: 1fr; }
    .ach-form h1 { font-size: 20px; }
  }

  @media print {
    @page { margin: 18mm 16mm; size: A4; }

    body, html { background: #fff !important; }

    .ach-form {
      background: #fff !important;
      padding: 0 !important;
    }

    .ach-form .top-bar { display: none !important; }
    .ach-form .submit-btn { display: none !important; }

    .ach-form .ach-wrapper {
      box-shadow: none !important;
      border-radius: 0 !important;
      padding: 0 !important;
      max-width: 100% !important;
    }

    .ach-form .logo-row { margin-bottom: 20px; }

    .ach-form h1 { font-size: 20px !important; margin-bottom: 6px !important; }
    .ach-form .subtitle { font-size: 12px !important; margin-bottom: 20px !important; }

    .ach-form .section-label {
      font-size: 11px !important;
      margin-top: 18px !important;
      margin-bottom: 10px !important;
      padding-bottom: 5px !important;
    }

    .ach-form .field-group { margin-bottom: 10px !important; }

    .ach-form label {
      font-size: 11px !important;
      margin-bottom: 3px !important;
      color: #555 !important;
    }

    .ach-form input,
    .ach-form select {
      border: none !important;
      border-bottom: 1px solid #aaa !important;
      border-radius: 0 !important;
      padding: 3px 0 !important;
      font-size: 13px !important;
      box-shadow: none !important;
      background: transparent !important;
      color: #000 !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .ach-form input::placeholder,
    .ach-form select option[value=""] { color: transparent !important; }

    .ach-form .radio-group { gap: 16px !important; margin-top: 3px !important; }
    .ach-form .radio-option { font-size: 12px !important; }

    .ach-form .sig-input {
      border-bottom: 1px solid #aaa !important;
      font-size: 14px !important;
    }

    .ach-form .sig-sub-label {
      font-size: 10px !important;
      color: #888 !important;
    }

    .ach-form .disclaimer {
      font-size: 10px !important;
      padding: 10px !important;
      background: #f9f9f9 !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
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
    signature: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

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
    if (!form.signature.trim()) {
      setError("Please sign the form before submitting.");
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        ...form,
        signatureData: form.signature,
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

      {/* Top action bar */}
      <div className="top-bar">
        <button className="pdf-btn" onClick={() => window.print()} type="button">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 16V4"/><path d="M8 12l4 4 4-4"/><rect x="3" y="17" width="18" height="4" rx="1"/>
          </svg>
          Download PDF Template
        </button>
      </div>

      <div className="ach-wrapper">
        {/* Logo */}
        <div className="logo-row">
          <img src={tcgLogo} alt="Today Capital Group" style={{ height: 36, width: "auto" }} />
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
              <input type="text" value={form.debitDate} onChange={set("debitDate")} required />
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

          <div className="field-row">
            <div className="field-group">
              <label>Business Name <span className="required">*</span></label>
              <input value={form.businessName} onChange={set("businessName")} placeholder="Legal business name" required />
            </div>
            <div className="field-group">
              <label>Contact Name</label>
              <input value={form.contactName} onChange={set("contactName")} placeholder="Full name" />
            </div>
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

          <div className="field-row">
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
          <div className="section-label">Authorization &amp; Signature</div>

          <div className="sig-area">
            <div className="sig-line-row">
              <div className="sig-line-wrap">
                <input
                  className="sig-input"
                  type="text"
                  value={form.signature}
                  onChange={set("signature")}
                  placeholder=" "
                  required
                  data-testid="input-signature"
                />
                <span className="sig-sub-label">Authorized Signature <span style={{ color: "#ef4444" }}>*</span></span>
              </div>
              <div className="sig-date-wrap">
                <input
                  className="sig-input"
                  type="text"
                  value={form.debitDate}
                  readOnly
                  placeholder=" "
                  tabIndex={-1}
                />
                <span className="sig-sub-label">Date</span>
              </div>
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
