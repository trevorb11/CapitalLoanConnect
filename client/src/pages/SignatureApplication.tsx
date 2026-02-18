import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useGoogleReCaptcha } from "react-google-recaptcha-v3";
import { type LoanApplication } from "@shared/schema";
import { type Agent } from "@shared/agents";
import { trackApplicationSubmitted, trackFormStepCompleted, trackPageView, trackCloseConvertLead } from "@/lib/analytics";
import { initUTMTracking, getStoredUTMParams } from "@/lib/utm";

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
];

const INDUSTRIES = [
  { value: "Automotive", label: "Automotive", desc: "parts and accessories, dealership, car wash, repair and maintenance." },
  { value: "Construction", label: "Construction", desc: "new construction, renovation & remodeling, commercial, residential, general construction." },
  { value: "Transportation", label: "Transportation", desc: "freight trucking, limousine, taxis, travel agencies, other transportation & travel, car rentals, towing." },
  { value: "Health Services", label: "Health Services", desc: "dentists, doctors office, personal care services, pharmacies, optometrists, other health services, biotechnology, fitness heath." },
  { value: "Utilities and Home Services", label: "Utilities and Home Services", desc: "cleaning, plumbing, electricians, Hvac, landscaping services, other home services." },
  { value: "Hospitality", label: "Hospitality", desc: "Hotels, Inns, Bed and Breakfast, Lounge." },
  { value: "Entertainment and Recreation", label: "Entertainment and Recreation", desc: "Sports Club, Art studio, night club, bar, events." },
  { value: "Retail Stores", label: "Retail Stores", desc: "building materials, electronics, fashion, clothing, sports goods, grocery, supermarket, bakeries, garden & florists, liquor store, other retail store, cell phone store, drug store, e-commerce." },
  { value: "Professional Services", label: "Professional Services", desc: "finance, insurance, IT management, Media, Publishing, legal services, accounting, call centers, communication centers, training organizations, direct marketing, staffing & recruiting." },
  { value: "Restaurants & Food Services", label: "Restaurants & Food Services", desc: "restaurants, winery, catering, other food services." },
  { value: "Other", label: "Other", desc: "" }
];

const FORM_STEPS = [
  { label: "Business Name", type: "group", fields: [
    { name: "legal_business_name", label: "Legal Business Name", type: "text", required: true, placeholder: "e.g. Acme Corp LLC", autoComplete: "organization" },
    { name: "doing_business_as", label: "DBA (if applicable)", type: "text", required: false, placeholder: "Doing Business As", autoComplete: "off" }
  ]},
  { label: "Company Contact", type: "group", fields: [
    { name: "company_email", label: "Company Email", type: "email", required: true, placeholder: "company@example.com", autoComplete: "email" },
    { name: "company_website", label: "Website (Optional)", type: "text", required: false, placeholder: "www.example.com", autoComplete: "url" }
  ]},
  { label: "Business Origin", type: "group", fields: [
    { name: "business_start_date", label: "Business Start Date", type: "date", required: true },
    { name: "state_of_incorporation", label: "State of Incorporation", type: "select", options: US_STATES, required: true }
  ]},
  { label: "Business Details", type: "group", fields: [
    { name: "ein", label: "Tax ID (EIN)", type: "text", required: true, placeholder: "XX-XXXXXXX", mask: "ein", mode: "numeric" },
    { name: "do_you_process_credit_cards", label: "Do you process credit cards?", type: "select", options: ["Yes", "No"], required: true }
  ]},
  { name: "industry", label: "Choose your business industry", type: "industry_select", required: true },
  { name: "business_address_group", label: "Business Address", type: "address_group", prefix: "business", required: true },
  { label: "Financing Request", type: "group", fields: [
    { name: "requested_loan_amount", label: "Requested Amount", type: "currency", required: true, placeholder: "$0.00", mode: "numeric" },
    { name: "mca_balance_amount", label: "Current MCA Balance (if any)", type: "currency", required: false, placeholder: "$0.00", mode: "numeric" },
    { name: "mca_balance_bank_name", label: "MCA Bank Name", type: "text", required: false, placeholder: "N/A" }
  ]},
  { label: "Owner Profile", type: "group", fields: [
    { name: "full_name", label: "Full Name", type: "text", required: true, autoComplete: "name" },
    { name: "email", label: "Direct Email", type: "email", required: true, placeholder: "owner@example.com", autoComplete: "email" },
    { name: "phone", label: "Mobile Phone", type: "tel", required: true, placeholder: "XXX-XXX-XXXX", mask: "phone", mode: "tel", autoComplete: "tel" },
    { name: "ownership_percentage", label: "Ownership %", type: "number", required: true, placeholder: "100", mode: "numeric" }
  ]},
  { label: "Identity Verification", type: "group", fields: [
    { name: "social_security_", label: "Social Security Number", type: "text", required: true, placeholder: "XXX-XX-XXXX", mask: "ssn", mode: "numeric" },
    { name: "date_of_birth", label: "Date of Birth", type: "date", required: true, autoComplete: "bday" },
    { name: "personal_credit_score_range", label: "Est. FICO Score", type: "number", required: false, placeholder: "e.g. 720", mode: "numeric" }
  ]},
  { name: "owner_address_group", label: "Home Address", type: "address_group", prefix: "owner", required: true },
  { name: "signature_step", label: "Sign & Get Funded", type: "drawn_signature" }
];

const stripNonNumeric = (val: string) => val.replace(/\D/g, '');

const formatEin = (value: string) => {
  const digits = stripNonNumeric(value).slice(0, 9);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}-${digits.slice(2)}`;
};

const formatSsn = (value: string) => {
  const digits = stripNonNumeric(value).slice(0, 9);
  if (digits.length <= 3) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
};

const formatPhone = (value: string) => {
  const digits = stripNonNumeric(value).slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
};

const formatCurrency = (value: string) => {
  const [integerPart] = value.split('.');
  const digits = stripNonNumeric(integerPart);
  if (!digits) return "";
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(digits));
};

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

function SignatureCanvas({ onSignatureChange }: { onSignatureChange: (dataUrl: string | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#000000';
    ctx.lineTo(x, y);
    ctx.stroke();
    if (!hasDrawn) setHasDrawn(true);
  };

  const stopDrawing = () => {
    if (isDrawing && hasDrawn && canvasRef.current) {
      onSignatureChange(canvasRef.current.toDataURL('image/png'));
    }
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    onSignatureChange(null);
  };

  return (
    <div data-testid="signature-canvas-container">
      <div style={{ position: 'relative', border: '2px solid #d1d5db', borderRadius: '12px', background: '#ffffff', overflow: 'hidden' }}>
        <canvas
          ref={canvasRef}
          width={600}
          height={200}
          style={{ width: '100%', height: '160px', cursor: 'crosshair', touchAction: 'none' }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          data-testid="signature-canvas"
        />
        <div style={{ position: 'absolute', bottom: '32px', left: '20px', right: '20px', borderBottom: '1px dashed #d1d5db', pointerEvents: 'none' }} />
        {!hasDrawn && (
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#9ca3af', fontSize: '15px', pointerEvents: 'none', textAlign: 'center' }}>
            Sign here with your finger or mouse
          </div>
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
        <button
          type="button"
          onClick={clearCanvas}
          style={{ fontSize: '13px', color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
          data-testid="button-clear-signature"
        >
          Clear Signature
        </button>
      </div>
    </div>
  );
}

interface SignatureApplicationProps {
  agent?: Agent;
}

export default function SignatureApplication(props?: SignatureApplicationProps) {
  const { agent } = props || {};
  const { toast } = useToast();
  const { executeRecaptcha } = useGoogleReCaptcha();
  const [, navigate] = useLocation();

  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [formData, setFormData] = useState<any>({ faxNumber: "" });
  const [isCheckingId, setIsCheckingId] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [consentChecked, setConsentChecked] = useState(false);
  const [cameFromIntake, setCameFromIntake] = useState(false);

  useEffect(() => {
    trackPageView('/sig', 'Signature Application');
    initUTMTracking();
    const savedId = localStorage.getItem("applicationId");
    if (savedId) setApplicationId(savedId);
    const urlParams = new URLSearchParams(window.location.search);
    const urlAppId = urlParams.get("applicationId");
    let trafficSource = 'direct';
    const referrer = document.referrer;
    if (urlAppId) {
      setApplicationId(urlAppId);
      localStorage.setItem("applicationId", urlAppId);
      trafficSource = 'intake_quiz';
      setCameFromIntake(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (referrer) {
      if (referrer.includes('/intake/quiz') || referrer.includes('/intake')) trafficSource = 'intake_quiz';
      else if (referrer.includes('todaycapitalgroup.com/get-qualified')) trafficSource = 'get_qualified_page';
      else if (referrer.includes('todaycapitalgroup.com')) trafficSource = 'todaycapitalgroup_website';
    }
    trackCloseConvertLead(trafficSource);
    setIsCheckingId(false);
  }, []);

  const { data: existingData } = useQuery<LoanApplication>({
    queryKey: [`/api/applications/${applicationId}`],
    enabled: !!applicationId,
  });

  useEffect(() => {
    if (existingData) {
      const parseCsz = (csz: string) => {
        if (!csz) return { city: '', state: '', zip: '' };
        try {
          const parts = csz.split(',');
          const city = parts[0].trim();
          const secondPart = parts[1]?.trim().split(' ');
          return { city, state: secondPart?.[0] || '', zip: secondPart?.[1] || '' };
        } catch { return { city: '', state: '', zip: '' }; }
      };
      const businessCsz = existingData.businessCsz || (existingData.city && existingData.state && existingData.zipCode ? `${existingData.city}, ${existingData.state} ${existingData.zipCode}` : "");
      const ownerCsz = existingData.ownerCsz || (existingData.ownerCity && existingData.ownerState && existingData.ownerZip ? `${existingData.ownerCity}, ${existingData.ownerState} ${existingData.ownerZip}` : "");
      const bAddr = parseCsz(businessCsz);
      const oAddr = parseCsz(ownerCsz);
      setFormData({
        legal_business_name: existingData.legalBusinessName || existingData.businessName || "",
        doing_business_as: existingData.doingBusinessAs || existingData.businessName || "",
        company_website: existingData.companyWebsite || "",
        business_start_date: existingData.businessStartDate || "",
        ein: existingData.ein ? formatEin(existingData.ein) : "",
        company_email: existingData.companyEmail || existingData.businessEmail || existingData.email || "",
        state_of_incorporation: existingData.stateOfIncorporation || existingData.state || "",
        do_you_process_credit_cards: existingData.doYouProcessCreditCards || "",
        industry: existingData.industry || "",
        business_street: existingData.businessStreetAddress || existingData.businessAddress || "",
        business_unit: "",
        business_city: bAddr.city,
        business_state: bAddr.state,
        business_zip: bAddr.zip,
        requested_loan_amount: existingData.requestedAmount ? formatCurrency(existingData.requestedAmount.toString()) : "",
        mca_balance_amount: existingData.mcaBalanceAmount ? formatCurrency(existingData.mcaBalanceAmount.toString()) : "",
        mca_balance_bank_name: existingData.mcaBalanceBankName || "",
        full_name: existingData.fullName || "",
        email: existingData.email || "",
        social_security_: existingData.socialSecurityNumber ? formatSsn(existingData.socialSecurityNumber) : "",
        phone: existingData.phone ? formatPhone(existingData.phone) : "",
        personal_credit_score_range: existingData.personalCreditScoreRange || existingData.ficoScoreExact || existingData.creditScore || "",
        owner_address1: existingData.ownerAddress1 || existingData.businessAddress || "",
        owner_address2: existingData.ownerAddress2 || "",
        owner_city: oAddr.city,
        owner_state: oAddr.state,
        owner_zip: oAddr.zip,
        date_of_birth: existingData.dateOfBirth || "",
        ownership_percentage: existingData.ownerPercentage || existingData.ownership || "",
      });
      if (existingData.isFullApplicationCompleted) setConsentChecked(true);
    }
  }, [existingData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    let value = e.target.value;
    const name = e.target.name;
    let step: any = FORM_STEPS.find((s: any) => s.name === name);
    if (!step) {
      for (const s of FORM_STEPS) {
        if (s.type === 'group' && s.fields) {
          const found = s.fields.find((f: any) => f.name === name);
          if (found) { step = found; break; }
        }
      }
    }
    if (step?.mask === 'ssn') value = formatSsn(value);
    if (step?.mask === 'ein') value = formatEin(value);
    if (step?.mask === 'phone') value = formatPhone(value);
    if (step?.type === 'currency') value = formatCurrency(value);
    if (name.includes('zip')) value = stripNonNumeric(value).slice(0, 5);
    if (step?.type === 'number') {
      value = stripNonNumeric(value);
      if (name === 'ownership_percentage' && Number(value) > 100) value = "100";
    }
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && currentStepIndex < FORM_STEPS.length - 1) {
      e.preventDefault();
      handleNext();
    }
  };

  const saveProgress = async (isFinal = false) => {
    const businessStreet = formData.business_unit ? `${formData.business_street} ${formData.business_unit}` : formData.business_street;
    const businessCsz = (formData.business_city && formData.business_state) ? `${formData.business_city}, ${formData.business_state} ${formData.business_zip}` : undefined;
    const ownerCsz = (formData.owner_city && formData.owner_state) ? `${formData.owner_city}, ${formData.owner_state} ${formData.owner_zip}` : undefined;

    let recaptchaToken: string | undefined;
    if (isFinal && executeRecaptcha) {
      try { recaptchaToken = await executeRecaptcha("signature_application_submit"); } catch (error) { console.error("reCAPTCHA error:", error); }
    }

    const payload: any = {
      legalBusinessName: formData.legal_business_name,
      doingBusinessAs: formData.doing_business_as,
      companyWebsite: formData.company_website,
      businessStartDate: formData.business_start_date,
      ein: formData.ein,
      companyEmail: formData.company_email,
      stateOfIncorporation: formData.state_of_incorporation,
      doYouProcessCreditCards: formData.do_you_process_credit_cards,
      industry: formData.industry,
      businessStreetAddress: businessStreet,
      businessCsz,
      requestedAmount: formData.requested_loan_amount ? formData.requested_loan_amount.replace(/[^0-9.]/g, '') : undefined,
      mcaBalanceAmount: formData.mca_balance_amount ? formData.mca_balance_amount.replace(/[^0-9.]/g, '') : undefined,
      mcaBalanceBankName: formData.mca_balance_bank_name,
      fullName: formData.full_name,
      email: formData.email,
      socialSecurityNumber: formData.social_security_,
      phone: formData.phone,
      personalCreditScoreRange: formData.personal_credit_score_range,
      ownerAddress1: formData.owner_address1,
      ownerAddress2: formData.owner_address2,
      ownerCsz,
      dateOfBirth: formData.date_of_birth,
      ownerPercentage: formData.ownership_percentage,
      ownership: formData.ownership_percentage,
      currentStep: currentStepIndex >= 4 ? 2 : 1,
      ...getStoredUTMParams()
    };

    if (isFinal) {
      payload.isFullApplicationCompleted = true;
      payload.applicantSignature = "SIGNED_VIA_DRAWN_SIGNATURE";
      if (signatureDataUrl) payload.applicantSignatureImage = signatureDataUrl;
      if (recaptchaToken) payload.recaptchaToken = recaptchaToken;
    }
    if (agent) {
      payload.agentName = agent.name;
      payload.agentEmail = agent.email;
      payload.agentGhlId = agent.ghlId;
    }
    if (formData.faxNumber) payload.faxNumber = formData.faxNumber;
    const referralPartnerId = localStorage.getItem("referralPartnerId");
    if (referralPartnerId) payload.referralPartnerId = referralPartnerId;

    try {
      if (!applicationId) {
        const response = await apiRequest("POST", "/api/applications", payload);
        const newApp = await response.json();
        if (newApp.id) { localStorage.setItem("applicationId", newApp.id); setApplicationId(newApp.id); }
        if (newApp.validationFailed && newApp.validationErrors?.length > 0) {
          toast({ title: "Required Fields Missing", description: `Please complete: ${newApp.validationErrors.slice(0, 3).join(', ')}${newApp.validationErrors.length > 3 ? '...' : ''}`, variant: "destructive" });
          return false;
        }
      } else {
        const response = await apiRequest("PATCH", `/api/applications/${applicationId}`, payload);
        const responseData = await response.json().catch(() => ({}));
        if (!response.ok) {
          if (responseData.missingFields?.length > 0) {
            toast({ title: "Required Fields Missing", description: `Please complete: ${responseData.missingFields.slice(0, 3).join(', ')}${responseData.missingFields.length > 3 ? '...' : ''}`, variant: "destructive" });
          } else {
            toast({ title: "Cannot Continue", description: responseData.error || "Please complete all required fields.", variant: "destructive" });
          }
          return false;
        }
        if (responseData.validationFailed && responseData.validationErrors?.length > 0) {
          toast({ title: "Required Fields Missing", description: `Please complete: ${responseData.validationErrors.slice(0, 3).join(', ')}${responseData.validationErrors.length > 3 ? '...' : ''}`, variant: "destructive" });
          return false;
        }
      }
      return true;
    } catch (error: any) {
      toast({ title: "Save Error", description: "Could not save your progress. Please try again.", variant: "destructive" });
      return false;
    }
  };

  const handleNext = async () => {
    const currentConfig = FORM_STEPS[currentStepIndex];
    const validateField = (field: any) => {
      const val = formData[field.name];
      if (field.required && (!val || val.toString().trim() === "")) return `Please fill out ${field.label}`;
      if (field.type === 'email' && val && !isValidEmail(val)) return `Invalid email for ${field.label}`;
      if (field.mask === 'ein' && val && val.replace(/\D/g, '').length !== 9) return `EIN must be exactly 9 digits (XX-XXXXXXX)`;
      if (field.mask === 'ssn' && val && val.replace(/\D/g, '').length !== 9) return `Social Security Number must be exactly 9 digits`;
      return null;
    };

    if (currentConfig.type === 'group' && currentConfig.fields) {
      for (const field of currentConfig.fields) {
        const error = validateField(field);
        if (error) { toast({ title: "Missing Information", description: error, variant: "destructive" }); return; }
      }
    } else if (currentConfig.required && !['address_group', 'drawn_signature', 'industry_select', 'group'].includes(currentConfig.type)) {
      const error = validateField(currentConfig);
      if (error) { toast({ title: "Required", description: error, variant: "destructive" }); return; }
    }

    if (currentConfig.type === 'address_group') {
      const prefix = currentConfig.prefix === 'business' ? 'business' : 'owner';
      const zip = formData[`${prefix}_zip`];
      const street = prefix === 'business' ? formData.business_street : formData.owner_address1;
      const city = formData[`${prefix}_city`];
      const state = formData[`${prefix}_state`];
      if (!street || !city || !state || !zip) { toast({ title: "Incomplete Address", description: "Please fill out all address fields.", variant: "destructive" }); return; }
      if (zip.length !== 5) { toast({ title: "Invalid Zip Code", description: "Zip code must be exactly 5 digits.", variant: "destructive" }); return; }
    }
    if (currentConfig.type === 'industry_select' && !formData.industry) {
      toast({ title: "Required", description: "Please select an industry.", variant: "destructive" }); return;
    }

    if (currentConfig.type === 'drawn_signature') {
      if (!signatureDataUrl) {
        toast({ title: "Signature Required", description: "Please draw your signature in the box above.", variant: "destructive" }); return;
      }
      if (!consentChecked) {
        toast({ title: "Agreement Required", description: "Please accept the terms to continue.", variant: "destructive" }); return;
      }
      setIsSubmitting(true);
      const saveSucceeded = await saveProgress(true);
      setIsSubmitting(false);
      if (!saveSucceeded) return;
      trackApplicationSubmitted({
        applicationType: 'signature_application',
        agentCode: agent?.initials || 'direct',
        businessName: formData.legal_business_name,
        requestedAmount: formData.requested_loan_amount,
      });
      const email = encodeURIComponent(formData.company_email || '');
      const businessName = encodeURIComponent(formData.legal_business_name || '');
      navigate(`/upload-statements?email=${email}&businessName=${businessName}&submitted=true`);
      return;
    }

    setIsSubmitting(true);
    const saveSucceeded = await saveProgress(false);
    setIsSubmitting(false);
    if (!saveSucceeded) return;
    trackFormStepCompleted('signature_application', currentStepIndex + 1, currentConfig.label);
    setCurrentStepIndex(prev => prev + 1);
  };

  const handleBack = () => { if (currentStepIndex > 0) setCurrentStepIndex(prev => prev - 1); };

  if (isCheckingId) return <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white" data-testid="sig-loading">Loading...</div>;

  if (showSuccess) {
    return (
      <div style={{ fontFamily: 'Inter, sans-serif', backgroundColor: '#f0f2f5', minHeight: '100vh', padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} data-testid="sig-success">
        <div style={{ background: 'linear-gradient(to bottom, #192F56 0%, #19112D 100%)', color: 'white', padding: '3rem', borderRadius: '15px', textAlign: 'center', maxWidth: '600px', width: '100%' }}>
          <div style={{ width: '80px', height: '80px', background: 'rgba(34, 197, 94, 0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', border: '2px solid #22c55e' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20,6 9,17 4,12"></polyline></svg>
          </div>
          <h3 style={{ fontSize: '2rem', color: 'white', marginBottom: '1rem', fontWeight: 'bold' }}>Application Received</h3>
          <p style={{ fontSize: '1.1rem', lineHeight: 1.6, color: 'rgba(255,255,255,0.8)' }}>Your application has been securely signed and submitted. <br/> Our team is reviewing your details now.</p>
          <a href="https://www.todaycapitalgroup.com" style={{ display: 'inline-block', marginTop: '2rem', background: 'white', color: '#192F56', padding: '1rem 2rem', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold' }} data-testid="link-return-home">Return to Home</a>
        </div>
      </div>
    );
  }

  const currentStep = FORM_STEPS[currentStepIndex] as any;
  const progress = ((currentStepIndex) / (FORM_STEPS.length - 1)) * 100;

  const renderIndustrySelect = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '500px', margin: '0 auto' }}>
      {INDUSTRIES.map((ind) => (
        <button
          key={ind.value}
          onClick={() => { setFormData((prev: any) => ({ ...prev, industry: ind.value })); setTimeout(handleNext, 200); }}
          style={{
            display: 'block', width: '100%', textAlign: 'left', padding: '1rem 1.2rem', borderRadius: '10px',
            border: formData.industry === ind.value ? '2px solid white' : '1px solid rgba(255,255,255,0.2)',
            background: formData.industry === ind.value ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)',
            color: 'white', cursor: 'pointer', transition: 'all 0.2s'
          }}
          data-testid={`button-industry-${ind.value}`}
        >
          <strong>{ind.label}</strong>
          {ind.desc && <span style={{ display: 'block', fontSize: '0.8rem', opacity: 0.7, marginTop: '4px' }}>{ind.desc}</span>}
        </button>
      ))}
    </div>
  );

  const renderAddressGroup = (prefix: 'business' | 'owner') => {
    const streetKey = prefix === 'business' ? 'business_street' : 'owner_address1';
    const unitKey = prefix === 'business' ? 'business_unit' : 'owner_address2';
    const cityKey = `${prefix}_city`;
    const stateKey = `${prefix}_state`;
    const zipKey = `${prefix}_zip`;
    const inputStyle = { width: '100%', padding: '1rem', fontSize: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.1)', color: 'white', outline: 'none' };
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
        <div><label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)' }}>Street Address <span style={{ color: '#ff8888' }}>*</span></label><input name={streetKey} value={formData[streetKey] || ''} onChange={handleInputChange} onKeyDown={handleKeyDown} placeholder="123 Main St" autoComplete="street-address" style={inputStyle} data-testid={`input-${streetKey}`} /></div>
        <div><label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)' }}>Apt / Suite</label><input name={unitKey} value={formData[unitKey] || ''} onChange={handleInputChange} onKeyDown={handleKeyDown} placeholder="Suite 100" style={inputStyle} data-testid={`input-${unitKey}`} /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 100px', gap: '0.75rem' }}>
          <div><label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)' }}>City <span style={{ color: '#ff8888' }}>*</span></label><input name={cityKey} value={formData[cityKey] || ''} onChange={handleInputChange} onKeyDown={handleKeyDown} autoComplete="address-level2" style={inputStyle} data-testid={`input-${cityKey}`} /></div>
          <div><label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)' }}>State <span style={{ color: '#ff8888' }}>*</span></label>
            <select name={stateKey} value={formData[stateKey] || ''} onChange={handleInputChange} autoComplete="address-level1" style={{ ...inputStyle }} data-testid={`select-${stateKey}`}>
              <option value="" disabled>--</option>{US_STATES.map(s => <option key={s} value={s} style={{ color: 'black' }}>{s}</option>)}
            </select>
          </div>
          <div><label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)' }}>Zip <span style={{ color: '#ff8888' }}>*</span></label><input name={zipKey} value={formData[zipKey] || ''} onChange={handleInputChange} onKeyDown={handleKeyDown} inputMode="numeric" autoComplete="postal-code" maxLength={5} style={inputStyle} data-testid={`input-${zipKey}`} /></div>
        </div>
      </div>
    );
  };

  const renderSignatureStep = () => (
    <div style={{ marginTop: '1.5rem', textAlign: 'center' }} data-testid="sig-step-signature">
      <div style={{ background: 'white', borderRadius: '12px', padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
        <p style={{ fontSize: '0.95rem', color: '#374151', marginBottom: '1.5rem', textAlign: 'left', lineHeight: 1.6 }}>
          Draw your signature below to authorize this application.
        </p>
        <SignatureCanvas onSignatureChange={setSignatureDataUrl} />
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', textAlign: 'left', marginTop: '1.5rem', marginBottom: '1.5rem' }}>
          <input
            type="checkbox"
            id="sigConsentCheck"
            checked={consentChecked}
            onChange={(e) => setConsentChecked(e.target.checked)}
            style={{ width: '24px', height: '24px', marginTop: '4px', flexShrink: 0, accentColor: 'black', cursor: 'pointer' }}
            data-testid="checkbox-consent"
          />
          <label htmlFor="sigConsentCheck" style={{ fontSize: '0.85rem', lineHeight: 1.5, color: '#6b7280', cursor: 'pointer' }}>
            I agree to the <strong>Today Capital Group Application Agreement</strong> and <strong>eSign Consent Agreement</strong> and consent to receive SMS text messages from Today Capital Group regarding my application and related updates at the phone number provided. Msg & data rates may apply. Reply STOP to opt out, HELP for help. Consent is not a condition of purchase and may be revoked at any time.
          </label>
        </div>
        <button
          onClick={handleNext}
          disabled={!signatureDataUrl || !consentChecked || isSubmitting}
          style={{
            background: 'black', color: 'white', width: '100%', padding: '1.2rem', borderRadius: '50px',
            fontSize: '1.1rem', fontWeight: 'bold', border: 'none', cursor: 'pointer',
            opacity: (signatureDataUrl && consentChecked) ? 1 : 0.5, transition: 'all 0.2s'
          }}
          data-testid="button-submit-application"
        >
          {isSubmitting ? 'PROCESSING...' : 'GET FUNDED'}
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', backgroundColor: '#f0f2f5', minHeight: '100vh', padding: '20px', display: 'flex', flexDirection: 'column' }} data-testid="sig-application-page">
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
        <img src="https://cdn.prod.website-files.com/6864b4e14db4a4b6864c7968/686c1b87657a831f612b5390_Group%2017%20(1).svg" alt="Today Capital" style={{ height: '50px' }} data-testid="img-logo" />
      </div>

      {currentStep.type === 'drawn_signature' ? (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          {FORM_STEPS.map((_, idx) => (
            <div key={idx} style={{ width: '24px', height: '24px', borderRadius: '50%', border: '1px solid #192F56', color: '#192F56', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', background: 'white' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20,6 9,17 4,12"></polyline></svg>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ width: '100%', maxWidth: '700px', margin: '0 auto 1.5rem', height: '6px', background: 'rgba(0,0,0,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{ width: `${progress}%`, height: '100%', background: '#192F56', transition: 'width 0.4s ease' }} data-testid="progress-bar" />
        </div>
      )}

      <div style={{
        width: '100%', maxWidth: '800px', margin: '0 auto',
        background: currentStep.type === 'drawn_signature' ? 'transparent' : 'linear-gradient(to bottom, #192F56 0%, #19112D 100%)',
        borderRadius: '15px',
        boxShadow: currentStep.type === 'drawn_signature' ? 'none' : '0 12px 30px rgba(25, 47, 86, 0.3)',
        color: currentStep.type === 'drawn_signature' ? '#111' : 'white',
        padding: currentStep.type === 'drawn_signature' ? '0' : '3rem 2rem',
        minHeight: '400px', display: 'flex', flexDirection: 'column'
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ textAlign: 'center', marginBottom: '0.5rem', fontSize: '0.85rem', color: currentStep.type === 'drawn_signature' ? '#6b7280' : 'rgba(255,255,255,0.6)' }}>
            Step {currentStepIndex + 1} of {FORM_STEPS.length}
          </div>
          <h1 style={{
            fontSize: '2.5rem', fontWeight: 'bold', textAlign: 'center', marginBottom: '1.5rem', lineHeight: 1.2,
            color: currentStep.type === 'drawn_signature' ? '#1f2937' : 'white'
          }} data-testid="text-step-title">
            {currentStep.label}
          </h1>
          <div style={{ flex: 1 }}>
            {currentStep.type === 'industry_select' && renderIndustrySelect()}
            {currentStep.type === 'address_group' && renderAddressGroup(currentStep.prefix as any)}
            {currentStep.type === 'drawn_signature' && renderSignatureStep()}

            {currentStep.type === 'group' && currentStep.fields && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {currentStep.fields.map((field: any) => (
                  <div key={field.name}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)' }}>
                      {field.label} {field.required && <span style={{ color: '#ff8888' }}>*</span>}
                    </label>
                    {field.type === 'select' ? (
                      <select name={field.name} value={formData[field.name] || ''} onChange={handleInputChange} autoComplete={field.autoComplete}
                        style={{ width: '100%', padding: '1rem', fontSize: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.1)', color: 'white' }}
                        data-testid={`select-${field.name}`}>
                        <option value="" disabled>Select...</option>
                        {field.options?.map((opt: string) => <option key={opt} value={opt} style={{ color: 'black' }}>{opt}</option>)}
                      </select>
                    ) : (
                      <input name={field.name} type={field.type === 'currency' ? 'text' : field.type} value={formData[field.name] || ''} onChange={handleInputChange} onKeyDown={handleKeyDown}
                        placeholder={field.placeholder} inputMode={field.mode} autoComplete={field.autoComplete}
                        style={{ width: '100%', padding: '1rem', fontSize: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.1)', color: 'white', outline: 'none' }}
                        data-testid={`input-${field.name}`} />
                    )}
                  </div>
                ))}
              </div>
            )}

            {!['industry_select', 'address_group', 'drawn_signature', 'group'].includes(currentStep.type) && 'name' in currentStep && currentStep.name && (
              <div style={{ maxWidth: '500px', margin: '0 auto' }}>
                {currentStep.type === 'select' && 'options' in currentStep ? (
                  <select name={currentStep.name} value={formData[currentStep.name] || ''} onChange={handleInputChange}
                    style={{ width: '100%', padding: '1rem', fontSize: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.1)', color: 'white' }}
                    data-testid={`select-${currentStep.name}`}>
                    <option value="" disabled>Select...</option>
                    {currentStep.options?.map((opt: string) => <option key={opt} value={opt} style={{ color: 'black' }}>{opt}</option>)}
                  </select>
                ) : (
                  <input name={currentStep.name} type={currentStep.type} value={formData[currentStep.name] || ''} onChange={handleInputChange} onKeyDown={handleKeyDown}
                    placeholder={currentStep.placeholder} inputMode={currentStep.mode} autoComplete={currentStep.autoComplete}
                    style={{ width: '100%', padding: '1rem', fontSize: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.1)', color: 'white', outline: 'none' }}
                    data-testid={`input-${currentStep.name}`} />
                )}
              </div>
            )}
          </div>
        </div>

        {currentStep.type !== 'drawn_signature' && (
          <div style={{ padding: '2rem 0 0 0', marginTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button onClick={handleBack} disabled={currentStepIndex === 0}
              style={{ background: 'none', border: 'none', color: currentStepIndex === 0 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.7)', cursor: currentStepIndex === 0 ? 'default' : 'pointer', fontSize: '1rem' }}
              data-testid="button-back">
              Back
            </button>
            <button onClick={handleNext} disabled={isSubmitting}
              style={{ background: 'white', color: '#192F56', fontWeight: 'bold', border: 'none', borderRadius: '50px', padding: '0.8rem 2.5rem', cursor: 'pointer', fontSize: '1rem' }}
              data-testid="button-next">
              {isSubmitting ? 'Saving...' : currentStepIndex === FORM_STEPS.length - 2 ? 'Review & Sign' : 'Next'}
            </button>
          </div>
        )}
      </div>

      <div style={{ display: 'none' }}>
        <input name="faxNumber" value={formData.faxNumber || ''} onChange={handleInputChange} tabIndex={-1} autoComplete="off" />
      </div>
    </div>
  );
}
