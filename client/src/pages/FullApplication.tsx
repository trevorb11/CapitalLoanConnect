import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { type LoanApplication } from "@shared/schema";
import { type Agent } from "@shared/agents";

// --- CONSTANTS & DATA ---

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

// --- FORM CONFIGURATION ---

const FORM_STEPS = [
  // --- SECTION 1: BUSINESS INFO ---
  { name: "legal_business_name", label: "What is the Legal Name of your company?", type: "text", required: true, placeholder: "e.g. Acme Corp LLC" },
  { name: "doing_business_as", label: "Do you have a DBA? If not, re-enter Legal Name.", type: "text", required: true, placeholder: "Doing Business As" },
  { name: "company_email", label: "What is the primary Company Email address?", type: "email", required: true, placeholder: "company@example.com" },
  { name: "business_start_date", label: "When did the business start?", type: "date", required: true },
  { name: "ein", label: "What is the business Tax ID (EIN)?", type: "text", required: true, placeholder: "XX-XXXXXXX", mask: "ein" },

  // UPDATED: Industry Selection Style
  { name: "industry", label: "Choose your business industry", type: "industry_select", required: true },

  { name: "company_website", label: "Company Website (Optional)", type: "text", required: false, placeholder: "www.example.com" },
  { name: "state_of_incorporation", label: "State of Incorporation", type: "select", options: US_STATES, required: true },
  { name: "do_you_process_credit_cards", label: "Does the business process credit cards?", type: "select", options: ["Yes", "No"], required: true },

  // UPDATED: Grouped Address Step (Business)
  { name: "business_address_group", label: "Please enter your business address", type: "address_group", prefix: "business", required: true },

  { name: "requested_loan_amount", label: "How much financing are you requesting?", type: "number", required: true, placeholder: "$" },
  { name: "mca_balance_amount", label: "Current MCA Balance Amount (if any)", type: "number", required: false, placeholder: "$0" },
  { name: "mca_balance_bank_name", label: "MCA Balance Bank Name (if any)", type: "text", required: false, placeholder: "N/A" },

  // --- SECTION 2: OWNER INFO ---
  { name: "full_name", label: "Business Owner Full Name", type: "text", required: true },
  { name: "email", label: "Owner's Direct Email", type: "email", required: true, placeholder: "owner@example.com" },
  { name: "phone", label: "Mobile Phone Number", type: "tel", required: true, placeholder: "XXX-XXX-XXXX", mask: "phone" },
  { name: "social_security_", label: "Social Security Number", type: "text", required: true, placeholder: "XXX-XX-XXXX", mask: "ssn" },
  { name: "personal_credit_score_range", label: "Estimated FICO Score", type: "number", required: false, placeholder: "e.g. 720" },

  // UPDATED: Grouped Address Step (Owner)
  { name: "owner_address_group", label: "Please enter your home address", type: "address_group", prefix: "owner", required: true },

  { name: "date_of_birth", label: "Date of Birth", type: "date", required: true },
  { name: "ownership_percentage", label: "Ownership Percentage (%)", type: "number", required: true, placeholder: "100" },

  // UPDATED: Simplified Signature Step
  { name: "signature_step", label: "Click to Sign & Get Funded", type: "simple_signature" }
];

// --- UTILITIES ---

const formatEin = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 9);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}-${digits.slice(2)}`;
};

const formatSsn = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 9);
  if (digits.length <= 3) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
};

const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
};

const isValidEmail = (email: string) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

interface FullApplicationProps {
  agent?: Agent;
}

export default function FullApplication(props?: FullApplicationProps) {
  const { agent } = props || {};
  const { toast } = useToast();

  // State
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [formData, setFormData] = useState<any>({});
  const [isCheckingId, setIsCheckingId] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);

  // Check for existing ID on mount
  useEffect(() => {
    const savedId = localStorage.getItem("applicationId");
    if (savedId) setApplicationId(savedId);
    setIsCheckingId(false);
  }, []);

  // Fetch existing data
  const { data: existingData } = useQuery<LoanApplication>({
    queryKey: [`/api/applications/${applicationId}`],
    enabled: !!applicationId,
  });

  // Hydrate Form
  useEffect(() => {
    if (existingData) {
      // Helper to parse CSZ string back into components
      const parseCsz = (csz: string) => {
        if (!csz) return { city: '', state: '', zip: '' };
        try {
            const parts = csz.split(',');
            const city = parts[0].trim();
            const secondPart = parts[1]?.trim().split(' ');
            return { 
                city, 
                state: secondPart?.[0] || '', 
                zip: secondPart?.[1] || '' 
            };
        } catch(e) { return { city: '', state: '', zip: '' }; }
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
        ein: existingData.ein || "",
        company_email: existingData.companyEmail || existingData.businessEmail || existingData.email || "",
        state_of_incorporation: existingData.stateOfIncorporation || existingData.state || "",
        do_you_process_credit_cards: existingData.doYouProcessCreditCards || "",
        industry: existingData.industry || "",

        // Breakout Business Address
        business_street: existingData.businessStreetAddress || existingData.businessAddress || "",
        business_unit: "", // Usually not stored separately in old schema, default empty
        business_city: bAddr.city,
        business_state: bAddr.state,
        business_zip: bAddr.zip,

        requested_loan_amount: existingData.requestedAmount ? existingData.requestedAmount.toString() : "",
        mca_balance_amount: existingData.mcaBalanceAmount ? existingData.mcaBalanceAmount.toString() : "",
        mca_balance_bank_name: existingData.mcaBalanceBankName || "",
        full_name: existingData.fullName || "",
        email: existingData.email || "",
        social_security_: existingData.socialSecurityNumber || "",
        phone: existingData.phone || "",
        personal_credit_score_range: existingData.personalCreditScoreRange || existingData.ficoScoreExact || existingData.creditScore || "",

        // Breakout Owner Address
        address1: existingData.ownerAddress1 || existingData.businessAddress || "",
        address2: existingData.ownerAddress2 || "",
        owner_city: oAddr.city,
        owner_state: oAddr.state,
        owner_zip: oAddr.zip,

        date_of_birth: existingData.dateOfBirth || "",
        ownership_percentage: existingData.ownership || "",
      });

      if (existingData.isFullApplicationCompleted) {
          setConsentChecked(true);
      }
    }
  }, [existingData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    let value = e.target.value;
    const name = e.target.name;

    // Check if this name belongs to a step with a mask
    const step = FORM_STEPS.find(s => s.name === name);
    if (step?.mask === 'ssn') value = formatSsn(value);
    if (step?.mask === 'ein') value = formatEin(value);
    if (step?.mask === 'phone') value = formatPhone(value);

    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
        // Prevent default and move next, unless it's a textarea or we are at end
        if (currentStepIndex < FORM_STEPS.length - 1) {
             e.preventDefault();
             handleNext();
        }
    }
  };

  const saveProgress = async (isFinal = false) => {
    // Construct legacy fields from broken-out inputs
    const businessStreet = formData.business_unit 
        ? `${formData.business_street} ${formData.business_unit}` 
        : formData.business_street;
    const businessCsz = (formData.business_city && formData.business_state) 
        ? `${formData.business_city}, ${formData.business_state} ${formData.business_zip}`
        : undefined;

    const ownerCsz = (formData.owner_city && formData.owner_state)
        ? `${formData.owner_city}, ${formData.owner_state} ${formData.owner_zip}`
        : undefined;

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

      // Mapped Address Fields
      businessStreetAddress: businessStreet,
      businessCsz: businessCsz,

      requestedAmount: formData.requested_loan_amount ? formData.requested_loan_amount.replace(/\D/g, "") : undefined,
      mcaBalanceAmount: formData.mca_balance_amount ? formData.mca_balance_amount.replace(/\D/g, "") : undefined,
      mcaBalanceBankName: formData.mca_balance_bank_name,
      fullName: formData.full_name,
      email: formData.email,
      socialSecurityNumber: formData.social_security_,
      phone: formData.phone,
      personalCreditScoreRange: formData.personal_credit_score_range,

      // Mapped Owner Address Fields
      ownerAddress1: formData.address1, // mapped from inputs in render
      ownerAddress2: formData.address2,
      ownerCsz: ownerCsz,

      dateOfBirth: formData.date_of_birth,
      ownership: formData.ownership_percentage,
      currentStep: currentStepIndex > 10 ? 2 : 1 
    };

    if (isFinal) {
        payload.isFullApplicationCompleted = true;
        // We use a placeholder signature for the "Click to Sign" flow
        payload.applicantSignature = "SIGNED_VIA_CHECKBOX_CONSENT"; 
    }

    if (agent) {
      payload.agentName = agent.name;
      payload.agentEmail = agent.email;
      payload.agentGhlId = agent.ghlId;
    }

    try {
      if (!applicationId) {
        const response = await apiRequest("POST", "/api/applications", payload);
        const newApp = await response.json();
        localStorage.setItem("applicationId", newApp.id);
        setApplicationId(newApp.id);
      } else {
        await apiRequest("PATCH", `/api/applications/${applicationId}`, payload);
      }
    } catch (error) {
      console.error("Auto-save failed", error);
    }
  };

  const handleNext = async () => {
    const currentConfig = FORM_STEPS[currentStepIndex];

    // --- Validation ---

    // 1. Standard Fields
    if (currentConfig.required && !['address_group', 'simple_signature', 'industry_select'].includes(currentConfig.type)) {
      const value = formData[currentConfig.name];
      if (!value || value.toString().trim() === "") {
        toast({ title: "Required", description: "Please fill out this field.", variant: "destructive" });
        return;
      }
    }

    // 2. Email Validation
    if (currentConfig.type === 'email' && !isValidEmail(formData[currentConfig.name])) {
      toast({ title: "Invalid Email", description: "Please enter a valid email address.", variant: "destructive" });
      return;
    }

    // 3. Address Group Validation
    if (currentConfig.type === 'address_group') {
        const prefix = currentConfig.prefix === 'business' ? 'business' : 'owner';
        // Owner uses address1/address2 keys, Business uses business_street/unit keys
        const street = prefix === 'business' ? formData.business_street : formData.address1;
        const city = formData[`${prefix}_city`];
        const state = formData[`${prefix}_state`];
        const zip = formData[`${prefix}_zip`];

        if (!street || !city || !state || !zip) {
            toast({ title: "Missing Address", description: "Please complete the full address.", variant: "destructive" });
            return;
        }
    }

    // 4. Industry Validation
    if (currentConfig.type === 'industry_select' && !formData.industry) {
        toast({ title: "Required", description: "Please select an industry.", variant: "destructive" });
        return;
    }

    // 5. Signature/Final Step
    if (currentConfig.type === 'simple_signature') {
        if (!consentChecked) {
            toast({ title: "Required", description: "You must agree to the terms to proceed.", variant: "destructive" });
            return;
        }
        setIsSubmitting(true);
        await saveProgress(true); // Final Save
        setIsSubmitting(false);
        setShowSuccess(true);
        return;
    }

    // --- Save & Proceed ---
    setIsSubmitting(true);
    await saveProgress(false);
    setIsSubmitting(false);
    setCurrentStepIndex(prev => prev + 1);
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  // --- Render Helpers ---

  if (isCheckingId) return <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">Loading...</div>;

  if (showSuccess) {
    return (
      <div style={{ fontFamily: 'Inter, sans-serif', backgroundColor: '#f0f2f5', minHeight: '100vh', padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
         <div style={{ background: 'linear-gradient(to bottom, #192F56 0%, #19112D 100%)', color: 'white', padding: '3rem', borderRadius: '15px', textAlign: 'center', maxWidth: '600px', width: '100%' }}>
            <div style={{ width: '80px', height: '80px', background: 'rgba(34, 197, 94, 0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', border: '2px solid #22c55e' }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20,6 9,17 4,12"></polyline></svg>
            </div>
            <h3 style={{ fontSize: '2rem', color: 'white', marginBottom: '1rem', fontWeight: 'bold' }}>Application Received</h3>
            <p style={{ fontSize: '1.1rem', lineHeight: 1.6, color: 'rgba(255,255,255,0.8)' }}>Your application has been securely signed and submitted. <br/> Our team is reviewing your details now.</p>
            <a href="https://www.todaycapitalgroup.com" style={{ display: 'inline-block', marginTop: '2rem', background: 'white', color: '#192F56', padding: '1rem 2rem', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold' }}>Return to Home</a>
         </div>
      </div>
    );
  }

  const currentStep = FORM_STEPS[currentStepIndex];
  const progress = ((currentStepIndex + 1) / FORM_STEPS.length) * 100;

  // --- Sub-Component Renderers ---

  const renderIndustrySelect = () => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', marginTop: '1rem', maxHeight: '60vh', overflowY: 'auto' }}>
        {INDUSTRIES.map((ind) => (
            <label key={ind.value} style={{ 
                display: 'flex', alignItems: 'flex-start', gap: '1rem', padding: '1rem', 
                background: formData.industry === ind.value ? 'white' : 'rgba(255,255,255,0.05)', 
                color: formData.industry === ind.value ? '#192F56' : 'white',
                borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', transition: 'all 0.2s'
            }}>
                <input 
                    type="radio" 
                    name="industry" 
                    value={ind.value} 
                    checked={formData.industry === ind.value} 
                    onChange={handleInputChange}
                    style={{ width: '20px', height: '20px', marginTop: '3px', accentColor: '#192F56' }} 
                />
                <div>
                    <strong style={{ display: 'block', fontSize: '1.1rem', marginBottom: '0.25rem' }}>{ind.label}</strong>
                    <span style={{ fontSize: '0.9rem', opacity: formData.industry === ind.value ? 0.8 : 0.6 }}>{ind.desc}</span>
                </div>
            </label>
        ))}
    </div>
  );

  const renderAddressGroup = (prefix: 'business' | 'owner') => {
      // Key Mapping for the two different address types in formData
      const isBiz = prefix === 'business';
      const streetKey = isBiz ? 'business_street' : 'address1';
      const unitKey = isBiz ? 'business_unit' : 'address2'; // mapping address2 to unit for owner
      const cityKey = `${prefix}_city`;
      const stateKey = `${prefix}_state`;
      const zipKey = `${prefix}_zip`;

      return (
        <div style={{ background: 'white', borderRadius: '12px', padding: '2rem', marginTop: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '20% 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                     <input name={unitKey} placeholder="Unit" value={formData[unitKey] || ''} onChange={handleInputChange} 
                        style={{ width: '100%', padding: '1rem', borderRadius: '6px', border: '1px solid #e5e7eb', color: '#1f2937', fontSize: '1rem' }} />
                </div>
                <div>
                     <input name={streetKey} placeholder="Street*" value={formData[streetKey] || ''} onChange={handleInputChange} 
                        style={{ width: '100%', padding: '1rem', borderRadius: '6px', border: '1px solid #e5e7eb', color: '#1f2937', fontSize: '1rem' }} />
                </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <input name={cityKey} placeholder="City*" value={formData[cityKey] || ''} onChange={handleInputChange} 
                    style={{ width: '100%', padding: '1rem', borderRadius: '6px', border: '1px solid #e5e7eb', color: '#1f2937', fontSize: '1rem' }} />
                <select name={stateKey} value={formData[stateKey] || ''} onChange={handleInputChange} 
                    style={{ width: '100%', padding: '1rem', borderRadius: '6px', border: '1px solid #e5e7eb', color: '#1f2937', fontSize: '1rem', appearance: 'none', background: 'white' }}>
                    <option value="" disabled>State*</option>
                    {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <input name={zipKey} placeholder="Zip*" value={formData[zipKey] || ''} onChange={handleInputChange} 
                    style={{ width: '100%', padding: '1rem', borderRadius: '6px', border: '1px solid #e5e7eb', color: '#1f2937', fontSize: '1rem' }} />
            </div>
            <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: '#6b7280' }}>*Required</p>
        </div>
      );
  };

  const renderSignatureStep = () => (
      <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '2.5rem', maxWidth: '600px', margin: '0 auto' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', textAlign: 'left', marginBottom: '2rem' }}>
                  <input 
                    type="checkbox" 
                    id="consentCheck" 
                    checked={consentChecked} 
                    onChange={(e) => setConsentChecked(e.target.checked)} 
                    style={{ width: '24px', height: '24px', marginTop: '4px', flexShrink: 0, accentColor: 'black', cursor: 'pointer' }} 
                  />
                  <label htmlFor="consentCheck" style={{ fontSize: '0.95rem', lineHeight: 1.5, color: '#374151', cursor: 'pointer' }}>
                    I agree to the <strong>Today Capital Group Application Agreement</strong> and <strong>eSign Consent Agreement</strong> and understand that I may receive communications to the phone number provided; I agree that this consent applies even if the phone number provided is on any state, federal, or corporate do-not-call registry. Consent may be revoked at any time.
                  </label>
              </div>
              <button 
                onClick={handleNext}
                style={{ 
                    background: 'black', color: 'white', width: '100%', padding: '1.2rem', borderRadius: '50px', 
                    fontSize: '1.1rem', fontWeight: 'bold', border: 'none', cursor: 'pointer', 
                    opacity: consentChecked ? 1 : 0.5, transition: 'all 0.2s'
                }}
              >
                  {isSubmitting ? 'PROCESSING...' : 'GET FUNDED'}
              </button>
          </div>
      </div>
  );

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', backgroundColor: '#f0f2f5', minHeight: '100vh', padding: '20px', display: 'flex', flexDirection: 'column' }}>
        {/* Logo */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
            <img src="https://cdn.prod.website-files.com/6864b4e14db4a4b6864c7968/686c1b87657a831f612b5390_Group%2017%20(1).svg" alt="Today Capital" style={{ height: '50px' }} />
        </div>

        {/* Step Indicator (Top Circles for Signature Page, Bar for others) */}
        {currentStep.type === 'simple_signature' ? (
             <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
                {FORM_STEPS.map((_, idx) => (
                    <div key={idx} style={{ width: '24px', height: '24px', borderRadius: '50%', border: '1px solid #192F56', color: '#192F56', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', background: 'white' }}>✓</div>
                ))}
             </div>
        ) : (
            <div style={{ width: '100%', maxWidth: '700px', margin: '0 auto 1.5rem', height: '6px', background: 'rgba(0,0,0,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${progress}%`, height: '100%', background: '#192F56', transition: 'width 0.4s ease' }}></div>
            </div>
        )}

        {/* Main Content Container */}
        <div style={{ 
            width: '100%', 
            maxWidth: '800px', 
            margin: '0 auto',
            // Conditional Styling: Simple Clean background for signature, Blue Card for inputs
            background: currentStep.type === 'simple_signature' ? 'transparent' : 'linear-gradient(to bottom, #192F56 0%, #19112D 100%)',
            borderRadius: '15px', 
            boxShadow: currentStep.type === 'simple_signature' ? 'none' : '0 12px 30px rgba(25, 47, 86, 0.3)',
            color: currentStep.type === 'simple_signature' ? '#111' : 'white',
            padding: currentStep.type === 'simple_signature' ? '0' : '3rem 2rem',
            minHeight: '400px',
            display: 'flex',
            flexDirection: 'column'
        }}>

            {/* Heading */}
            <h1 style={{ 
                fontSize: '2.5rem', fontWeight: 'bold', textAlign: 'center', marginBottom: '1.5rem', lineHeight: 1.2,
                color: currentStep.type === 'simple_signature' ? '#1f2937' : 'white'
            }}>
                {currentStep.label}
            </h1>

            {/* Input Rendering Logic */}
            <div style={{ flex: 1 }}>
                {currentStep.type === 'industry_select' && renderIndustrySelect()}

                {currentStep.type === 'address_group' && renderAddressGroup(currentStep.prefix as any)}

                {currentStep.type === 'simple_signature' && renderSignatureStep()}

                {/* Standard Inputs */}
                {!['industry_select', 'address_group', 'simple_signature'].includes(currentStep.type) && (
                    <div style={{ maxWidth: '500px', margin: '0 auto' }}>
                         {currentStep.type === 'select' ? (
                            <select
                                name={currentStep.name}
                                value={formData[currentStep.name] || ''}
                                onChange={handleInputChange}
                                style={{ 
                                    width: '100%', padding: '1.2rem', fontSize: '1.1rem', borderRadius: '8px', 
                                    border: '2px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.1)', color: 'white'
                                }}
                            >
                                <option value="" disabled>Select...</option>
                                {currentStep.options?.map((opt: string) => <option key={opt} value={opt} style={{ color: 'black' }}>{opt}</option>)}
                            </select>
                        ) : (
                            <input
                                name={currentStep.name}
                                type={currentStep.type}
                                value={formData[currentStep.name] || ''}
                                onChange={handleInputChange}
                                onKeyDown={handleKeyDown}
                                placeholder={currentStep.placeholder}
                                autoFocus
                                style={{ 
                                    width: '100%', padding: '1.2rem', fontSize: '1.1rem', borderRadius: '8px', 
                                    border: '2px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.1)', color: 'white', outline: 'none'
                                }}
                            />
                        )}
                    </div>
                )}
            </div>

            {/* Footer Navigation (Hidden for Signature Step) */}
            {currentStep.type !== 'simple_signature' && (
                <div style={{ padding: '2rem 0 0 0', marginTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button 
                        onClick={handleBack}
                        disabled={currentStepIndex === 0}
                        style={{ 
                            padding: '0.8rem 1.5rem', borderRadius: '6px', border: 'none', background: 'transparent', color: 'rgba(255,255,255,0.6)', 
                            cursor: currentStepIndex === 0 ? 'not-allowed' : 'pointer', fontSize: '1rem' 
                        }}
                    >
                        Back
                    </button>

                    <div style={{ fontSize: '0.9rem', opacity: 0.5 }}>
                        {currentStepIndex + 1} of {FORM_STEPS.length}
                    </div>

                    <button 
                        onClick={handleNext}
                        disabled={isSubmitting}
                        style={{ 
                            padding: '0.8rem 2rem', borderRadius: '6px', border: 'none', 
                            background: 'white', color: '#192F56', 
                            fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer',
                            opacity: isSubmitting ? 0.7 : 1, minWidth: '120px'
                        }}
                    >
                        {isSubmitting ? 'Saving...' : (currentStep.type === 'address_group' ? 'Save Address' : 'Next →')}
                    </button>
                </div>
            )}
        </div>
        <style>{`
            /* Scrollbar Styling for Industry List */
            ::-webkit-scrollbar { width: 8px; }
            ::-webkit-scrollbar-track { background: rgba(255,255,255,0.1); }
            ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.3); borderRadius: 4px; }
            ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.5); }
        `}</style>
    </div>
  );
}