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
  .wc-doc-org { font-size: 15px; font-style: italic; color: #444; }

  /* ── INTRO BLOCK ── */
  .wc-intro { margin-bottom: 28px; }
  .wc-intro p { margin-bottom: 10px; }

  /* ── SECTION ── */
  .wc-section-title {
    font-size: 15px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.04em;
    margin-bottom: 10px; margin-top: 32px;
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
    font-size: 15px; color: #1a3a8f;
    padding: 2px 6px; outline: none;
    transition: background 0.15s, border-color 0.15s;
    vertical-align: baseline;
    min-width: 60px;
  }
  .wc-field:focus { background: #dbeafe; border-bottom-color: #1e40af; }
  .wc-field::placeholder { color: #93c5fd; font-style: italic; }
  .wc-field-sm { width: 100px; }
  .wc-field-md { width: 200px; }
  .wc-field-lg { width: 300px; }
  .wc-field-money { width: 120px; }

  /* ── RADIO HOSTING ── */
  .wc-hosting-options { margin: 12px 0; }
  .wc-hosting-option {
    display: flex; align-items: flex-start; gap: 10px;
    margin-bottom: 14px; padding: 12px 16px;
    border: 1.5px solid #e0e0e0; border-radius: 6px;
    cursor: pointer; transition: border-color 0.15s, background 0.15s;
  }
  .wc-hosting-option.selected { border-color: #1e40af; background: #f0f5ff; }
  .wc-hosting-option input[type=radio] { margin-top: 3px; flex-shrink: 0; cursor: pointer; accent-color: #1e40af; }
  .wc-hosting-option-body { flex: 1; }
  .wc-hosting-option-label { font-weight: 700; margin-bottom: 4px; }
  .wc-hosting-option-desc { font-size: 14px; color: #444; line-height: 1.6; }

  /* ── CAPS TEXT ── */
  .wc-caps {
    font-size: 13px; font-family: 'Inter', sans-serif;
    line-height: 1.55; color: #1a1a1a; margin-bottom: 10px;
  }

  /* ── SIGNATURES SECTION ── */
  .wc-sig-section {
    margin-top: 48px; padding-top: 32px;
    border-top: 2px solid #1a1a1a;
  }
  .wc-sig-title {
    font-size: 15px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.06em;
    text-align: center; margin-bottom: 36px;
  }
  .wc-sig-grid {
    display: grid; grid-template-columns: 1fr 1fr; gap: 40px;
  }
  .wc-sig-party-label {
    font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;
    font-size: 13px; margin-bottom: 16px; color: #444;
  }
  .wc-sig-click-box {
    border: 1.5px dashed #c0c8d8; border-radius: 4px;
    background: #fafafa; margin-bottom: 10px;
    height: 72px; display: flex; align-items: center; justify-content: center;
    cursor: pointer; transition: border-color 0.15s, background 0.15s;
  }
  .wc-sig-click-box:hover { border-color: #1e40af; background: #f0f5ff; }
  .wc-sig-click-box.signed {
    border-style: solid; border-color: #16a34a; background: #f0fdf4; cursor: default;
  }
  .wc-sig-click-box.disabled { opacity: 0.6; cursor: not-allowed; }
  .wc-sig-click-prompt {
    font-size: 12px; color: #bbb; text-align: center;
    display: flex; flex-direction: column; align-items: center; gap: 3px;
    pointer-events: none;
  }
  .wc-sig-click-icon { font-size: 18px; color: #d0d5de; }
  .wc-sig-signed-name {
    font-family: 'EB Garamond', Georgia, serif; font-style: italic;
    font-size: 30px; color: #1a3a8f; pointer-events: none;
    letter-spacing: 0.02em;
  }
  .wc-sig-unsign {
    font-family: 'Inter', sans-serif; font-size: 11px; color: #888;
    background: none; border: none; cursor: pointer;
    padding: 0; text-decoration: underline;
    margin-bottom: 14px; display: block;
  }
  .wc-sig-unsign:hover { color: #dc2626; }
  .wc-sig-row { margin-bottom: 10px; }
  .wc-sig-label {
    font-family: 'Inter', sans-serif; font-size: 11px; font-weight: 600;
    text-transform: uppercase; letter-spacing: 0.07em;
    color: #888; margin-bottom: 3px;
  }
  .wc-sig-input {
    width: 100%; border: none;
    border-bottom: 1.5px solid #d0d0d0; background: transparent;
    font-family: 'EB Garamond', Georgia, serif; font-size: 15px;
    padding: 3px 0; outline: none; color: #1a1a1a;
    transition: border-color 0.15s;
  }
  .wc-sig-input:focus { border-bottom-color: #1e40af; }
  .wc-sig-input::placeholder { color: #ccc; font-style: italic; }
  .wc-sig-input:disabled { color: #555; opacity: 1; }

  /* ── LOCKED BADGE ── */
  .wc-locked-badge {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 3px 10px; border-radius: 100px;
    background: #dcfce7; border: 1px solid #16a34a;
    color: #15803d; font-family: 'Inter', sans-serif;
    font-size: 11px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.07em;
    margin-bottom: 12px;
  }

  /* ── DRAFT BANNER ── */
  .wc-draft-banner {
    background: #f0f9ff; border: 1.5px solid #7dd3fc;
    border-radius: 8px; padding: 16px 20px;
    margin-bottom: 32px; font-family: 'Inter', sans-serif;
  }
  .wc-draft-banner-title { font-size: 13px; font-weight: 700; color: #0369a1; margin-bottom: 6px; }
  .wc-draft-banner-body { font-size: 12px; color: #555; line-height: 1.6; }
  .wc-draft-banner-url {
    display: flex; align-items: center; gap: 8px; margin-top: 10px;
  }
  .wc-draft-url-input {
    flex: 1; padding: 6px 10px; border: 1px solid #bae6fd;
    border-radius: 6px; background: #fff; font-size: 12px;
    color: #0369a1; font-family: 'Inter', sans-serif; outline: none;
  }
  .wc-copy-btn {
    padding: 6px 14px; background: #0284c7; border: none;
    border-radius: 6px; color: #fff; font-size: 12px; font-weight: 600;
    cursor: pointer; font-family: 'Inter', sans-serif;
    white-space: nowrap; transition: background 0.15s;
  }
  .wc-copy-btn:hover { background: #0369a1; }
  .wc-copy-btn.copied { background: #16a34a; }

  /* ── ACTION BUTTONS ── */
  .wc-actions {
    margin-top: 40px; display: flex; flex-direction: column;
    align-items: center; gap: 12px;
  }
  .wc-btn-row { display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; }
  .wc-btn-save {
    padding: 13px 32px; background: #fff; border: 2px solid #1e40af;
    border-radius: 8px; color: #1e40af;
    font-family: 'Inter', sans-serif; font-weight: 700; font-size: 14px;
    cursor: pointer; transition: background 0.2s; white-space: nowrap;
  }
  .wc-btn-save:hover { background: #f0f5ff; }
  .wc-btn-save:disabled { opacity: 0.45; cursor: not-allowed; }
  .wc-btn-submit {
    padding: 14px 40px; background: #1e40af; border: none;
    border-radius: 8px; color: #fff;
    font-family: 'Inter', sans-serif; font-weight: 700; font-size: 15px;
    cursor: pointer; transition: background 0.2s, transform 0.15s;
    box-shadow: 0 4px 16px rgba(30,64,175,0.3);
  }
  .wc-btn-submit:hover { background: #1d4ed8; transform: translateY(-1px); }
  .wc-btn-submit:disabled { opacity: 0.45; cursor: not-allowed; transform: none; }
  .wc-action-note {
    font-family: 'Inter', sans-serif; font-size: 12px; color: #888; text-align: center;
  }
  .wc-error {
    color: #dc2626; font-family: 'Inter', sans-serif; font-size: 13px;
    text-align: center; margin-top: 8px;
  }

  /* ── NAME DIALOG ── */
  .wc-overlay {
    position: fixed; inset: 0; z-index: 200;
    background: rgba(0,0,0,0.55); backdrop-filter: blur(4px);
    display: flex; align-items: center; justify-content: center; padding: 24px;
  }
  .wc-dialog {
    background: #fff; border-radius: 12px;
    padding: 32px 28px; width: 100%; max-width: 420px;
    font-family: 'Inter', sans-serif; box-shadow: 0 20px 60px rgba(0,0,0,0.35);
  }
  .wc-dialog h3 {
    font-size: 18px; font-weight: 700; color: #0c1a2e; margin-bottom: 8px;
  }
  .wc-dialog p {
    font-size: 13px; color: #666; margin-bottom: 20px; line-height: 1.55;
  }
  .wc-dialog-input {
    width: 100%; padding: 10px 14px; border: 1.5px solid #cbd5e1;
    border-radius: 8px; font-size: 14px; font-family: 'Inter', sans-serif;
    color: #1a1a1a; outline: none; transition: border-color 0.15s; margin-bottom: 16px;
  }
  .wc-dialog-input:focus { border-color: #1e40af; }
  .wc-dialog-input::placeholder { color: #aab; }
  .wc-dialog-actions { display: flex; gap: 10px; justify-content: flex-end; }
  .wc-dialog-cancel {
    padding: 9px 18px; background: transparent; border: 1.5px solid #cbd5e1;
    border-radius: 7px; color: #555; font-size: 13px; font-weight: 600;
    font-family: 'Inter', sans-serif; cursor: pointer;
  }
  .wc-dialog-confirm {
    padding: 9px 20px; background: #1e40af; border: none;
    border-radius: 7px; color: #fff; font-size: 13px; font-weight: 700;
    font-family: 'Inter', sans-serif; cursor: pointer; transition: background 0.15s;
  }
  .wc-dialog-confirm:hover { background: #1d4ed8; }
  .wc-dialog-confirm:disabled { opacity: 0.45; cursor: not-allowed; }

  /* ── SUCCESS ── */
  .wc-success {
    text-align: center; padding: 48px 32px;
    font-family: 'Inter', sans-serif;
  }
  .wc-success-icon {
    width: 72px; height: 72px; background: #dcfce7;
    border: 2px solid #16a34a; border-radius: 50%;
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

// ── (signature pad hook removed — using click-to-sign) ─────────────────────────

function _unused_useSignaturePad(canvasRef: React.RefObject<HTMLCanvasElement>) {
  const drawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const hasSig = useRef(false);
  const hintRef = useRef<HTMLSpanElement | null>(null);

  // Get cursor position relative to canvas, without any DPR scaling
  const getPos = (e: MouseEvent | TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: (e as MouseEvent).clientX - rect.left, y: (e as MouseEvent).clientY - rect.top };
  };

  const syncSize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Save existing content
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    tempCanvas.getContext("2d")?.drawImage(canvas, 0, 0);
    // Resize to match CSS display size exactly (1:1 pixel ratio, no DPR)
    const w = canvas.offsetWidth || canvas.parentElement?.offsetWidth || 380;
    const h = canvas.offsetHeight || 110;
    canvas.width = w;
    canvas.height = h;
    // Restore
    canvas.getContext("2d")?.drawImage(tempCanvas, 0, 0);
  }, [canvasRef]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    syncSize();

    const ctx = canvas.getContext("2d")!;
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const start = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      drawing.current = true;
      lastPos.current = getPos(e, canvas);
      hasSig.current = true;
      if (hintRef.current) hintRef.current.classList.add("hidden");
    };

    const move = (e: MouseEvent | TouchEvent) => {
      if (!drawing.current || !lastPos.current) return;
      e.preventDefault();
      const pos = getPos(e, canvas);
      ctx.beginPath();
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.lineTo(pos.x, pos.y);
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

    // Re-sync on resize
    const ro = new ResizeObserver(() => syncSize());
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    return () => {
      canvas.removeEventListener("mousedown", start);
      canvas.removeEventListener("mousemove", move);
      canvas.removeEventListener("mouseup", end);
      canvas.removeEventListener("mouseleave", end);
      canvas.removeEventListener("touchstart", start);
      canvas.removeEventListener("touchmove", move);
      canvas.removeEventListener("touchend", end);
      ro.disconnect();
    };
  }, [canvasRef, syncSize]);

  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
    hasSig.current = false;
    if (hintRef.current) hintRef.current.classList.remove("hidden");
  }, [canvasRef]);

  const getDataURL = useCallback(() => canvasRef.current?.toDataURL("image/png") || "", [canvasRef]);
  const isEmpty = () => !hasSig.current;

  return { clear, getDataURL, isEmpty, hintRef };
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function WebsiteContract() {
  // Read token from URL query string
  const urlToken = new URLSearchParams(window.location.search).get("token") || "";

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
  const [tcgSigned, setTcgSigned] = useState(false); // locked from backend
  const [tcgClickSigned, setTcgClickSigned] = useState(false);

  // Client signature block
  const [clientPrintedName, setClientPrintedName] = useState("");
  const [clientTitle, setClientTitle] = useState("");
  const [clientCompany, setClientCompany] = useState("");
  const [clientDate, setClientDate] = useState("");
  const [clientClickSigned, setClientClickSigned] = useState(false);

  // Draft / share state
  const [token, setToken] = useState(urlToken);
  const [agreementName, setAgreementName] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [loadingDraft, setLoadingDraft] = useState(!!urlToken);
  const [showNameDialog, setShowNameDialog] = useState(false);
  const [pendingNameValue, setPendingNameValue] = useState("");

  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  // Load existing draft on mount if token present
  useEffect(() => {
    if (!urlToken) return;
    (async () => {
      try {
        const res = await fetch(`/api/contracts/website/draft/${urlToken}`);
        if (!res.ok) { setLoadingDraft(false); return; }
        const d = await res.json();
        if (d.effectiveDate) {
          const parts = d.effectiveDate.split(", ");
          if (parts.length === 2) { setEffectiveDate(parts[0]); setEffectiveYear(parts[1]); }
          else setEffectiveDate(d.effectiveDate);
        }
        if (d.clientName) setClientName(d.clientName);
        if (d.clientAddress) setClientAddress(d.clientAddress);
        if (d.projectFee) setProjectFee(d.projectFee);
        if (d.hostingOption) setHostingOption(d.hostingOption as "A" | "B");
        if (d.tcgPrintedName) setTcgPrintedName(d.tcgPrintedName);
        if (d.tcgTitle) setTcgTitle(d.tcgTitle);
        if (d.tcgDate) setTcgDate(d.tcgDate);
        if (d.clientPrintedName) setClientPrintedName(d.clientPrintedName);
        if (d.clientTitle) setClientTitle(d.clientTitle);
        if (d.clientCompany) setClientCompany(d.clientCompany);
        if (d.clientDate) setClientDate(d.clientDate);
        if (d.name) setAgreementName(d.name);
        // If TCG already signed (has tcg_signature stored), mark it locked
        if (d.tcgSignedAt) setTcgSigned(true);
        if (d.status === "complete") setSubmitted(true);
        // Build share URL from loaded token
        setShareUrl(`${window.location.origin}/services/website/contract?token=${urlToken}`);
      } catch {}
      setLoadingDraft(false);
    })();
  }, [urlToken]);

  const buildShareUrl = (t: string) =>
    `${window.location.origin}/services/website/contract?token=${t}`;

  const doSaveDraft = async (nameToUse: string) => {
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/contracts/website/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: token || undefined,
          name: nameToUse || undefined,
          effectiveDate: effectiveDate ? `${effectiveDate}, ${effectiveYear}` : null,
          clientName: clientName || null,
          clientAddress: clientAddress || null,
          projectFee: projectFee || null,
          hostingOption: hostingOption || null,
          tcgPrintedName,
          tcgTitle,
          tcgDate,
          // Signatures are NOT sent on draft saves — they're large blobs that
          // can exceed proxy limits. The server uses COALESCE to preserve any
          // previously-saved signature. Signatures are saved on final submission only.
          tcgSignature: null,
          clientPrintedName: clientPrintedName || null,
          clientTitle: clientTitle || null,
          clientCompany: clientCompany || null,
          clientDate: clientDate || null,
          clientSignature: null,
        }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody?.error || `Server error ${res.status}`);
      }
      const data = await res.json();
      setToken(data.token);
      const url = buildShareUrl(data.token);
      setShareUrl(url);
      window.history.replaceState({}, "", `/services/website/contract?token=${data.token}`);
    } catch (err: any) {
      setError(err?.message || "Could not save draft. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDraft = () => {
    // On first save (no token yet), prompt for a name
    if (!token) {
      const suggested = clientName || "";
      setPendingNameValue(suggested);
      setShowNameDialog(true);
    } else {
      doSaveDraft(agreementName);
    }
  };

  const handleNameDialogConfirm = () => {
    const name = pendingNameValue.trim();
    setAgreementName(name);
    setShowNameDialog(false);
    doSaveDraft(name);
  };

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(shareUrl); } catch { }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSubmit = async () => {
    if (!clientName) { setError("Please fill in the Client name before submitting."); return; }
    if (!clientPrintedName) { setError("Please fill in the Client printed name before submitting."); return; }
    if (!clientClickSigned) { setError("Please click to sign before submitting."); return; }
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/contracts/website", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: token || undefined,
          name: agreementName || clientName || undefined,
          effectiveDate: effectiveDate ? `${effectiveDate}, ${effectiveYear}` : null,
          clientName,
          clientAddress,
          projectFee,
          hostingOption,
          tcgPrintedName,
          tcgTitle,
          tcgDate,
          tcgSignature: tcgClickSigned ? `click-signed:${tcgPrintedName}` : null,
          clientPrintedName,
          clientTitle,
          clientCompany,
          clientDate,
          clientSignature: clientClickSigned ? `click-signed:${clientPrintedName}` : null,
        }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || "Submit failed"); }
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingDraft) {
    return (
      <div className="wc">
        <style>{CSS}</style>
        <nav className="wc-nav">
          <div className="wc-nav-logo">
            <div className="wc-nav-mark">TCG</div>
            <div><div className="wc-nav-name">Today Capital Group</div><div className="wc-nav-sub">Web Development</div></div>
          </div>
        </nav>
        <div className="wc-outer">
          <div className="wc-paper" style={{ textAlign: "center", padding: "80px 40px", fontFamily: "'Inter',sans-serif", color: "#555" }}>
            Loading contract…
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="wc">
      <style>{CSS}</style>

      {/* NAME DIALOG */}
      {showNameDialog && (
        <div className="wc-overlay" onClick={() => setShowNameDialog(false)}>
          <div className="wc-dialog" onClick={e => e.stopPropagation()}>
            <h3>Name this agreement</h3>
            <p>Give this agreement a name so you can find it later at <strong>/agreements</strong>. You can use the client's name or project name.</p>
            <input
              className="wc-dialog-input"
              placeholder="e.g. Acme Corp — Website Build"
              value={pendingNameValue}
              onChange={e => setPendingNameValue(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleNameDialogConfirm(); if (e.key === "Escape") setShowNameDialog(false); }}
              autoFocus
              data-testid="input-agreement-name"
            />
            <div className="wc-dialog-actions">
              <button className="wc-dialog-cancel" onClick={() => setShowNameDialog(false)}>Cancel</button>
              <button className="wc-dialog-confirm" onClick={handleNameDialogConfirm} disabled={saving} data-testid="button-confirm-name">
                {saving ? "Saving…" : "Save Draft"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NAV */}
      <nav className="wc-nav">
        <a className="wc-nav-logo" href="/services/website">
          <div className="wc-nav-mark">TCG</div>
          <div>
            <div className="wc-nav-name">Today Capital Group</div>
            <div className="wc-nav-sub">Web Development</div>
          </div>
        </a>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" as const }}>
          {agreementName && (
            <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 13, color: "#93c5fd", fontStyle: "italic", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
              {agreementName}
            </span>
          )}
          <a href="/agreements" style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, color: "#60a5fa", textDecoration: "none", fontWeight: 600, opacity: 0.8 }}>
            All Agreements
          </a>
          <div className="wc-nav-badge">Website Build Services Agreement</div>
        </div>
      </nav>

      <div className="wc-outer">
        <div className="wc-paper">
          {submitted ? (
            <div className="wc-success">
              <div className="wc-success-icon">&#10003;</div>
              <h3>Agreement Submitted</h3>
              <p>
                The signed Website Build Services Agreement for <strong>{clientName}</strong> has been recorded.<br />
                A copy has been sent to the team.
              </p>
            </div>
          ) : (
            <>
              {/* ── DOCUMENT HEADER ── */}
              <div className="wc-doc-header">
                <div className="wc-doc-title">Website Build Services Agreement</div>
                <div className="wc-doc-org">Today Capital Group</div>
              </div>

              {/* Shareable link banner — only visible to TCG side (not when opened via shared token) */}
              {shareUrl && !urlToken && (
                <div className="wc-draft-banner">
                  <div className="wc-draft-banner-title">Draft Saved — Shareable Link</div>
                  <div className="wc-draft-banner-body">
                    Share this link with the other party to collect their signature. Anyone with the link can view and sign.
                  </div>
                  <div className="wc-draft-banner-url">
                    <input className="wc-draft-url-input" readOnly value={shareUrl} onClick={e => (e.target as HTMLInputElement).select()} />
                    <button className={`wc-copy-btn${copied ? " copied" : ""}`} onClick={handleCopy} data-testid="button-copy-link">
                      {copied ? "Copied!" : "Copy Link"}
                    </button>
                  </div>
                </div>
              )}

              {/* ── INTRO ── */}
              <div className="wc-intro">
                <p>
                  This Website Build Services Agreement (the <strong>"Agreement"</strong>) is entered into as of{" "}
                  <input className="wc-field wc-field-md" placeholder="Month Day" value={effectiveDate} onChange={e => setEffectiveDate(e.target.value)} data-testid="input-effective-date" />{", "}
                  <input className="wc-field wc-field-sm" placeholder="Year" value={effectiveYear} onChange={e => setEffectiveYear(e.target.value)} data-testid="input-effective-year" />{" "}
                  (the <strong>"Effective Date"</strong>) by and between:
                </p>
                <p style={{ marginTop: 16 }}>
                  <strong>Service Provider:</strong> Today Capital Group, a California business entity now operating as Guide Funding Group, located at Woodland Hills, California (<strong>"TCG," "we," "us," or "our"</strong>).
                </p>
                <p style={{ marginTop: 12 }}>
                  <strong>Client:</strong>{" "}
                  <input className="wc-field wc-field-lg" placeholder="Client / Company Name" value={clientName} onChange={e => setClientName(e.target.value)} data-testid="input-client-name" />{", located at "}
                  <input className="wc-field wc-field-lg" placeholder="Client address" value={clientAddress} onChange={e => setClientAddress(e.target.value)} data-testid="input-client-address" />{" "}(<strong>"Client," "you," or "your"</strong>).
                </p>
                <p style={{ marginTop: 12 }}>TCG and Client are each a <strong>"Party"</strong> and together the <strong>"Parties."</strong></p>
              </div>

              {/* ── SECTION 1 ── */}
              <div className="wc-section-title">1. Services</div>
              <div className="wc-sub"><p><span className="wc-sub-num">1.1 Scope.</span> TCG will design, build, and deliver a custom website for Client (the <strong>"Website"</strong>) based on the scope of work, design preferences, content, and functionality discussed during a discovery call between the Parties and documented in a separate scope summary or written correspondence between the Parties (the <strong>"Scope"</strong>). The Scope may include, without limitation, page layout, copy, basic visual design, navigation structure, and standard functionality typical of a small-business website.</p></div>
              <div className="wc-sub"><p><span className="wc-sub-num">1.2 Discovery Call.</span> Prior to building, TCG will conduct a discovery call with Client and any team members Client chooses to include, to confirm goals, content requirements, and design direction. The Scope is intended to reflect what is discussed during this call.</p></div>
              <div className="wc-sub"><p><span className="wc-sub-num">1.3 Revisions.</span> The fees set forth in Section 4 include two (2) rounds of revisions following Client's review of the initial build. A <strong>"round of revisions"</strong> means a single, consolidated set of change requests delivered by Client to TCG in writing. Additional rounds of revisions, scope changes, or new feature requests beyond the agreed Scope are not included and may be quoted separately as additional services.</p></div>
              <div className="wc-sub"><p><span className="wc-sub-num">1.4 Out of Scope.</span> Unless expressly included in the Scope, the following are not included and may be quoted separately: e-commerce setup beyond basic checkout, custom integrations with third-party software, ongoing SEO services, paid advertising, email marketing setup, copywriting beyond standard page copy, photography and videography, translation, accessibility audits, and ongoing maintenance after delivery.</p></div>

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
              <div className="wc-sub"><p><span className="wc-sub-num">3.1 Transfer of Ownership.</span> Upon Client's payment in full of the fees set forth in Section 4, TCG hereby assigns and transfers to Client all of TCG's right, title, and interest in and to the final, delivered Website, including the design, code, layout, page content authored by TCG specifically for Client, and all custom assets created by TCG for the Website (collectively, the <strong>"Deliverables"</strong>).</p></div>
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
              <div className="wc-sub"><p><span className="wc-sub-num">3.4 Portfolio Use.</span> TCG may display screenshots or references to the Website, and may identify Client as a TCG client, in TCG's portfolio, marketing materials, and case studies, unless Client requests otherwise in writing.</p></div>

              {/* ── SECTION 4 ── */}
              <div className="wc-section-title">4. Fees and Payment</div>
              <div className="wc-sub">
                <p>
                  <span className="wc-sub-num">4.1 Project Fee.</span> The total project fee is{" "}
                  <strong>$</strong>
                  <input className="wc-field wc-field-money" placeholder="Amount" value={projectFee} onChange={e => setProjectFee(e.target.value)} data-testid="input-project-fee" />{" "}
                  USD (the <strong>"Project Fee"</strong>), inclusive of the discovery call, build, and two (2) rounds of revisions described in Section 1.
                </p>
              </div>
              <div className="wc-sub"><p><span className="wc-sub-num">4.2 Payment Terms.</span> The Project Fee is due in full prior to TCG beginning work, unless otherwise agreed in writing between the Parties.</p></div>
              <div className="wc-sub"><p><span className="wc-sub-num">4.3 Additional Work.</span> Any work outside the Scope, additional revision rounds beyond those included, or new features requested after the build begins will be quoted separately and require Client's written approval before TCG begins the additional work.</p></div>
              <div className="wc-sub"><p><span className="wc-sub-num">4.4 Refunds.</span> Once work has begun, the Project Fee is non-refundable. If Client cancels the project before TCG has begun substantive work, TCG will refund the Project Fee less a reasonable administrative fee to cover discovery and onboarding time.</p></div>

              {/* ── SECTION 5 ── */}
              <div className="wc-section-title">5. Hosting and Domain</div>
              <div className="wc-sub">
                <p style={{ marginBottom: 12 }}><span className="wc-sub-num">5.1 Hosting Options.</span> Client may choose between the following hosting options:</p>
                <div className="wc-hosting-options">
                  <label className={`wc-hosting-option${hostingOption === "A" ? " selected" : ""}`} onClick={() => setHostingOption("A")}>
                    <input type="radio" name="hosting" checked={hostingOption === "A"} onChange={() => setHostingOption("A")} data-testid="radio-hosting-a" />
                    <div className="wc-hosting-option-body">
                      <div className="wc-hosting-option-label">Option A — Hosting via SiteGround through TCG</div>
                      <div className="wc-hosting-option-desc">TCG will set up hosting for the Website with SiteGround on Client's behalf. Standard SiteGround hosting fees and renewal terms apply and are set by SiteGround, not by TCG. Hosting fees are billed separately from the Project Fee. Client will own the hosting account or, if the account is held under TCG, TCG will transfer ownership to Client upon written request at no additional charge.</div>
                    </div>
                  </label>
                  <label className={`wc-hosting-option${hostingOption === "B" ? " selected" : ""}`} onClick={() => setHostingOption("B")}>
                    <input type="radio" name="hosting" checked={hostingOption === "B"} onChange={() => setHostingOption("B")} data-testid="radio-hosting-b" />
                    <div className="wc-hosting-option-body">
                      <div className="wc-hosting-option-label">Option B — Client-Provided Hosting</div>
                      <div className="wc-hosting-option-desc">Client may host the Website on any platform of their choosing (for example, WordPress.com, Webflow, SiteGround, GoDaddy, Bluehost, or other). TCG will deliver the Website files in a portable format suitable for the chosen platform. Client is responsible for setting up, maintaining, and paying for the hosting environment.</div>
                    </div>
                  </label>
                </div>
              </div>
              <div className="wc-sub"><p><span className="wc-sub-num">5.2 Domain Name.</span> Registration, renewal, and ongoing payment for the domain name are the sole responsibility of Client. Client should register the domain in Client's own name and account so that Client maintains continuous control. TCG may, as a courtesy, assist Client in connecting the domain to the chosen hosting environment, but TCG does not register, hold, or maintain Client's domain.</p></div>
              <div className="wc-sub"><p><span className="wc-sub-num">5.3 Third-Party Services.</span> Hosting providers, domain registrars, and other third-party services used in connection with the Website are independent of TCG. TCG is not responsible for outages, billing disputes, account suspensions, or other issues arising from third-party services.</p></div>

              {/* ── SECTION 6 ── */}
              <div className="wc-section-title">6. Timeline</div>
              <div className="wc-sub"><p><span className="wc-sub-num">6.1 Target Delivery.</span> TCG will aim to deliver an initial build of the Website within the timeframe discussed during the discovery call and documented in the Scope. Target delivery times are estimates, not guarantees, and depend on the timeliness of Client's content delivery and feedback.</p></div>
              <div className="wc-sub"><p><span className="wc-sub-num">6.2 Delays Caused by Client.</span> If Client's delays in providing content, feedback, or approvals extend the project, TCG's delivery timeline will be extended accordingly. Repeated or extended delays (more than thirty (30) calendar days of inactivity from Client) may result in the project being closed, with delivery of the Website in its then-current state and no refund of the Project Fee.</p></div>

              {/* ── SECTION 7 ── */}
              <div className="wc-section-title">7. Warranties and Disclaimers</div>
              <div className="wc-sub"><p><span className="wc-sub-num">7.1 TCG's Warranty.</span> TCG warrants that the services will be performed in a professional and workmanlike manner, consistent with industry standards for small-business website builds.</p></div>
              <div className="wc-sub"><p className="wc-caps"><span className="wc-sub-num">7.2 Disclaimers.</span> EXCEPT AS EXPRESSLY STATED IN THIS AGREEMENT, THE WEBSITE AND ALL SERVICES ARE PROVIDED "AS IS." TCG MAKES NO OTHER WARRANTIES, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO ANY IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, OR THAT THE WEBSITE WILL ACHIEVE ANY SPECIFIC BUSINESS RESULT, SEARCH RANKING, TRAFFIC LEVEL, OR REVENUE OUTCOME.</p></div>
              <div className="wc-sub"><p><span className="wc-sub-num">7.3 Client Content.</span> Client warrants that all content, images, logos, and other materials provided to TCG are owned by Client or properly licensed, and that TCG's use of such materials will not infringe the rights of any third party. Client will indemnify and hold TCG harmless from any third-party claim arising from Client-provided content.</p></div>

              {/* ── SECTION 8 ── */}
              <div className="wc-section-title">8. Limitation of Liability</div>
              <p className="wc-caps">TO THE MAXIMUM EXTENT PERMITTED BY LAW, TCG'S TOTAL LIABILITY UNDER OR IN CONNECTION WITH THIS AGREEMENT WILL NOT EXCEED THE TOTAL PROJECT FEE ACTUALLY PAID BY CLIENT TO TCG. IN NO EVENT WILL TCG BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOST PROFITS OR LOST BUSINESS, EVEN IF TCG HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.</p>

              {/* ── SECTION 9 ── */}
              <div className="wc-section-title">9. Confidentiality</div>
              <p className="wc-para">Each Party agrees to keep confidential any non-public business information shared by the other Party during the project, and to use such information only for purposes of performing this Agreement. This obligation does not apply to information that is publicly available, independently developed, or required to be disclosed by law.</p>

              {/* ── SECTION 10 ── */}
              <div className="wc-section-title">10. Term and Termination</div>
              <div className="wc-sub"><p><span className="wc-sub-num">10.1 Term.</span> This Agreement begins on the Effective Date and continues until the Website is delivered and the revision rounds described in Section 1 are completed, unless terminated earlier as provided below.</p></div>
              <div className="wc-sub"><p><span className="wc-sub-num">10.2 Termination for Cause.</span> Either Party may terminate this Agreement upon written notice if the other Party materially breaches this Agreement and fails to cure the breach within fifteen (15) calendar days of receiving written notice of the breach.</p></div>
              <div className="wc-sub"><p><span className="wc-sub-num">10.3 Effect of Termination.</span> Upon termination, TCG will deliver the Website in its then-current state to Client, and ownership of the delivered portion will transfer to Client provided the Project Fee has been paid in full. If the Project Fee has not been paid, TCG retains all rights in the Deliverables until payment is received.</p></div>

              {/* ── SECTION 11 ── */}
              <div className="wc-section-title">11. General Terms</div>
              <div className="wc-sub"><p><span className="wc-sub-num">11.1 Independent Contractor.</span> TCG is an independent contractor. Nothing in this Agreement creates an employment, partnership, joint venture, or agency relationship between the Parties.</p></div>
              <div className="wc-sub"><p><span className="wc-sub-num">11.2 Governing Law.</span> This Agreement is governed by the laws of the State of California, without regard to its conflict-of-laws principles. The Parties consent to the exclusive jurisdiction of the state and federal courts located in Los Angeles County, California, for any dispute arising out of or relating to this Agreement.</p></div>
              <div className="wc-sub"><p><span className="wc-sub-num">11.3 Entire Agreement.</span> This Agreement, together with the Scope, represents the entire agreement between the Parties regarding the subject matter and supersedes all prior discussions, proposals, or agreements, written or oral.</p></div>
              <div className="wc-sub"><p><span className="wc-sub-num">11.4 Amendments.</span> Any amendment to this Agreement must be in writing and signed by both Parties. Email confirmation by both Parties is sufficient for amendments related to Scope adjustments.</p></div>
              <div className="wc-sub"><p><span className="wc-sub-num">11.5 Severability.</span> If any provision of this Agreement is held to be unenforceable, the remaining provisions will remain in full force and effect.</p></div>
              <div className="wc-sub"><p><span className="wc-sub-num">11.6 Notices.</span> Notices under this Agreement may be delivered by email to the addresses the Parties use to communicate during the project, and will be deemed received on the next business day after sending.</p></div>
              <div className="wc-sub"><p><span className="wc-sub-num">11.7 Counterparts and Electronic Signatures.</span> This Agreement may be signed in counterparts and by electronic signature, each of which will be deemed an original.</p></div>

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
                    {(tcgSigned || tcgClickSigned) && <div className="wc-locked-badge">&#10003; Signed</div>}

                    <div style={{ marginBottom: 6, fontFamily: "'Inter',sans-serif", fontSize: 12, color: "#888" }}>Signature</div>
                    <div
                      className={`wc-sig-click-box${tcgSigned || tcgClickSigned ? " signed" : ""}${tcgSigned ? " disabled" : ""}`}
                      onClick={() => { if (!tcgSigned && tcgPrintedName) setTcgClickSigned(true); }}
                      data-testid="button-tcg-click-sign"
                    >
                      {tcgClickSigned || tcgSigned ? (
                        <span className="wc-sig-signed-name">{tcgPrintedName}</span>
                      ) : (
                        <div className="wc-sig-click-prompt">
                          <span className="wc-sig-click-icon">✍</span>
                          <span>Click to sign</span>
                        </div>
                      )}
                    </div>
                    {tcgClickSigned && !tcgSigned && (
                      <button className="wc-sig-unsign" onClick={() => setTcgClickSigned(false)} data-testid="button-tcg-unsign">Clear signature</button>
                    )}

                    <div className="wc-sig-row">
                      <div className="wc-sig-label">Printed Name</div>
                      <input className="wc-sig-input" value={tcgPrintedName} onChange={e => { setTcgPrintedName(e.target.value); setTcgClickSigned(false); }} placeholder="Printed name" disabled={tcgSigned} data-testid="input-tcg-name" />
                    </div>
                    <div className="wc-sig-row">
                      <div className="wc-sig-label">Title</div>
                      <input className="wc-sig-input" value={tcgTitle} onChange={e => setTcgTitle(e.target.value)} placeholder="Title" disabled={tcgSigned} data-testid="input-tcg-title" />
                    </div>
                    <div className="wc-sig-row">
                      <div className="wc-sig-label">Date</div>
                      <input className="wc-sig-input" value={tcgDate} onChange={e => setTcgDate(e.target.value)} placeholder="Date" disabled={tcgSigned} data-testid="input-tcg-date" />
                    </div>
                  </div>

                  {/* CLIENT */}
                  <div>
                    <div className="wc-sig-party-label">Client</div>
                    {clientClickSigned && <div className="wc-locked-badge">&#10003; Signed</div>}

                    <div style={{ marginBottom: 6, fontFamily: "'Inter',sans-serif", fontSize: 12, color: "#888" }}>Signature</div>
                    <div
                      className={`wc-sig-click-box${clientClickSigned ? " signed" : ""}`}
                      onClick={() => { if (clientPrintedName) setClientClickSigned(true); }}
                      data-testid="button-client-click-sign"
                      title={!clientPrintedName ? "Fill in your printed name first" : ""}
                    >
                      {clientClickSigned ? (
                        <span className="wc-sig-signed-name">{clientPrintedName}</span>
                      ) : (
                        <div className="wc-sig-click-prompt">
                          <span className="wc-sig-click-icon">✍</span>
                          <span>{clientPrintedName ? "Click to sign" : "Fill in your name below first"}</span>
                        </div>
                      )}
                    </div>
                    {clientClickSigned && (
                      <button className="wc-sig-unsign" onClick={() => setClientClickSigned(false)} data-testid="button-client-unsign">Clear signature</button>
                    )}

                    <div className="wc-sig-row">
                      <div className="wc-sig-label">Printed Name</div>
                      <input className="wc-sig-input" value={clientPrintedName} onChange={e => { setClientPrintedName(e.target.value); setClientClickSigned(false); }} placeholder="Printed name" data-testid="input-client-printed-name" />
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

                {error && <p className="wc-error">{error}</p>}

                <div className="wc-actions">
                  <div className="wc-btn-row">
                    <button className="wc-btn-save" onClick={handleSaveDraft} disabled={saving || submitting} data-testid="button-save-draft">
                      {saving ? "Saving…" : token ? "Update & Share Link" : "Save Draft & Share Link"}
                    </button>
                    <button className="wc-btn-submit" onClick={handleSubmit} disabled={submitting || saving} data-testid="button-submit-contract">
                      {submitting ? "Submitting…" : "Submit Signed Agreement"}
                    </button>
                  </div>
                  <p className="wc-action-note">
                    Save a draft to get a shareable link — share it with the other party to collect their signature.
                    Submit when both parties have signed.
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
