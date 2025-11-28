import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { type LoanApplication } from "@shared/schema";
import { type Agent } from "@shared/agents";
import { useGoogleReCaptcha } from "react-google-recaptcha-v3";

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
];

const INDUSTRIES = [
  { value: "Automotive", label: "Automotive" },
  { value: "Construction", label: "Construction" },
  { value: "Transportation", label: "Transportation" },
  { value: "Health Services", label: "Health Services" },
  { value: "Utilities and Home Services", label: "Utilities and Home Services" },
  { value: "Hospitality", label: "Hospitality" },
  { value: "Entertainment and Recreation", label: "Entertainment and Recreation" },
  { value: "Retail Stores", label: "Retail Stores" },
  { value: "Professional Services", label: "Professional Services" },
  { value: "Restaurants & Food Services", label: "Restaurants & Food Services" },
  { value: "Other", label: "Other" }
];

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

const formatCurrency = (value: string) => {
  const digits = value.replace(/\D/g, '');
  if (!digits) return "";
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(Number(digits));
};

interface AgentApplicationProps {
  agent: Agent;
}

export default function AgentApplication({ agent }: AgentApplicationProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { executeRecaptcha } = useGoogleReCaptcha();
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [isCheckingId, setIsCheckingId] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<any>({});
  const [consentChecked, setConsentChecked] = useState(false);
  const [showConsentError, setShowConsentError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [agentViewUrl, setAgentViewUrl] = useState<string | null>(null);
  const [existingSignature, setExistingSignature] = useState<string | null>(null);

  useEffect(() => {
    const savedId = localStorage.getItem("applicationId");
    if (savedId) {
      setApplicationId(savedId);
    }
    setIsCheckingId(false);
  }, []);

  const { data: existingData, isLoading } = useQuery<LoanApplication>({
    queryKey: [`/api/applications/${applicationId}`],
    enabled: !!applicationId,
  });

  useEffect(() => {
    if (existingData) {
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
        business_street_address: existingData.businessStreetAddress || existingData.businessAddress || "",
        business_city: existingData.city || "",
        business_state: existingData.state || "",
        business_zip: existingData.zipCode || "",
        requested_loan_amount: existingData.requestedAmount ? formatCurrency(existingData.requestedAmount.toString()) : "",
        mca_balance_amount: existingData.mcaBalanceAmount ? formatCurrency(existingData.mcaBalanceAmount.toString()) : "",
        mca_balance_bank_name: existingData.mcaBalanceBankName || "",
        full_name: existingData.fullName || "",
        email: existingData.email || "",
        phone: existingData.phone ? formatPhone(existingData.phone) : "",
        social_security_: existingData.socialSecurityNumber ? formatSsn(existingData.socialSecurityNumber) : "",
        personal_credit_score_range: existingData.personalCreditScoreRange || existingData.ficoScoreExact || "",
        owner_address1: existingData.ownerAddress1 || "",
        owner_address2: existingData.ownerAddress2 || "",
        owner_city: existingData.ownerCity || "",
        owner_state: existingData.ownerState || "",
        owner_zip: existingData.ownerZip || "",
        date_of_birth: existingData.dateOfBirth || "",
        ownership_percentage: existingData.ownership || "",
      });
      if (existingData.applicantSignature) {
        setExistingSignature(existingData.applicantSignature);
      }
    }
  }, [existingData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    let value = e.target.value;
    const name = e.target.name;
    
    if (name === 'ein') value = formatEin(value);
    if (name === 'social_security_') value = formatSsn(value);
    if (name === 'phone') value = formatPhone(value);
    if (name === 'requested_loan_amount' || name === 'mca_balance_amount') {
      value = formatCurrency(value);
    }
    
    setFormData({ ...formData, [name]: value });
  };

  const goToStep2 = () => {
    const requiredStep1 = [
      'legal_business_name', 'doing_business_as', 'company_email', 
      'business_start_date', 'ein', 'industry', 'state_of_incorporation',
      'do_you_process_credit_cards', 'business_street_address', 
      'business_city', 'business_state', 'business_zip', 'requested_loan_amount'
    ];
    
    for (const field of requiredStep1) {
      if (!formData[field]) {
        toast({ title: "Missing Information", description: "Please fill in all required fields.", variant: "destructive" });
        return;
      }
    }

    // Validate EIN format (must have 9 digits)
    const einDigits = formData.ein.replace(/\D/g, '');
    if (einDigits.length !== 9) {
      toast({ title: "Invalid EIN", description: "EIN must be exactly 9 digits (XX-XXXXXXX)", variant: "destructive" });
      return;
    }
    
    setCurrentStep(2);
    window.scrollTo(0, 0);
  };

  const submitApplication = async () => {
    const requiredStep2 = [
      'full_name', 'email', 'phone', 'social_security_', 
      'owner_address1', 'owner_city', 'owner_state', 'owner_zip',
      'date_of_birth', 'ownership_percentage'
    ];
    
    for (const field of requiredStep2) {
      if (!formData[field]) {
        toast({ title: "Missing Information", description: "Please fill in all required fields.", variant: "destructive" });
        return;
      }
    }

    // Validate SSN format (must have 9 digits)
    const ssnDigits = formData.social_security_.replace(/\D/g, '');
    if (ssnDigits.length !== 9) {
      toast({ title: "Invalid SSN", description: "Social Security Number must be exactly 9 digits", variant: "destructive" });
      return;
    }

    if (!consentChecked) {
      setShowConsentError(true);
      toast({ title: "Consent Required", description: "Please agree to the terms to continue.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);

    try {
      let recaptchaToken: string | undefined;
      if (executeRecaptcha) {
        try {
          recaptchaToken = await executeRecaptcha("agent_application_submit");
        } catch (error) {
          console.error("reCAPTCHA error:", error);
        }
      }
      
      const signatureToUse = existingSignature || new Date().toISOString();
      
      const payload: any = {
        legalBusinessName: formData.legal_business_name,
        doingBusinessAs: formData.doing_business_as,
        companyWebsite: formData.company_website,
        businessStartDate: formData.business_start_date,
        ein: formData.ein.replace(/\D/g, ''),
        companyEmail: formData.company_email,
        stateOfIncorporation: formData.state_of_incorporation,
        doYouProcessCreditCards: formData.do_you_process_credit_cards,
        industry: formData.industry,
        businessStreetAddress: formData.business_street_address,
        businessAddress: formData.business_street_address,
        city: formData.business_city,
        state: formData.business_state,
        zipCode: formData.business_zip,
        businessCsz: `${formData.business_city}, ${formData.business_state} ${formData.business_zip}`,
        requestedAmount: formData.requested_loan_amount.replace(/\D/g, ""),
        mcaBalanceAmount: formData.mca_balance_amount ? formData.mca_balance_amount.replace(/\D/g, "") : "",
        mcaBalanceBankName: formData.mca_balance_bank_name,
        fullName: formData.full_name,
        email: formData.email,
        socialSecurityNumber: formData.social_security_.replace(/\D/g, ''),
        phone: formData.phone.replace(/\D/g, ''),
        personalCreditScoreRange: formData.personal_credit_score_range,
        ownerAddress1: formData.owner_address1,
        ownerAddress2: formData.owner_address2,
        ownerCity: formData.owner_city,
        ownerState: formData.owner_state,
        ownerZip: formData.owner_zip,
        ownerCsz: `${formData.owner_city}, ${formData.owner_state} ${formData.owner_zip}`,
        dateOfBirth: formData.date_of_birth,
        ownership: formData.ownership_percentage,
        applicantSignature: signatureToUse,
        isFullApplicationCompleted: true,
        agentName: agent.name,
        agentEmail: agent.email,
        agentGhlId: agent.ghlId,
        ...(recaptchaToken && { recaptchaToken }),
      };

      let data: any;
      if (applicationId) {
        data = await apiRequest("PATCH", `/api/applications/${applicationId}`, payload);
      } else {
        data = await apiRequest("POST", "/api/applications", payload);
        if (data.id) {
          localStorage.setItem("applicationId", data.id.toString());
          setApplicationId(data.id.toString());
        }
      }
      
      if (data && data.agentViewUrl) {
        setAgentViewUrl(data.agentViewUrl);
      }

      setIsSubmitting(false);
      setShowSuccess(true);
      localStorage.removeItem("applicationId");
      window.scrollTo(0, 0);
    } catch (error) {
      console.error('Submit error:', error);
      setIsSubmitting(false);
      toast({ title: "Error", description: "Failed to submit application. Please try again.", variant: "destructive" });
    }
  };

  if (isCheckingId || isLoading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(to bottom, #192F56 0%, #19112D 100%)' }}>
        <div style={{ color: 'white', fontSize: '1.1rem' }}>Loading...</div>
      </div>
    );
  }

  if (showSuccess) {
    return (
      <div style={{ fontFamily: 'Inter, sans-serif', backgroundColor: '#f0f2f5', minHeight: '100vh', padding: '20px' }}>
        <div style={{
          background: 'linear-gradient(to bottom, #192F56 0%, #19112D 100%)',
          color: 'white',
          padding: '3rem',
          borderRadius: '15px',
          boxShadow: '0 12px 30px rgba(25, 47, 86, 0.3)',
          minHeight: '500px',
          width: '100%',
          maxWidth: '900px',
          margin: '2rem auto',
          textAlign: 'center',
          paddingTop: '4rem',
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            margin: '0 auto 2rem',
            background: 'rgba(34, 197, 94, 0.2)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <h1 style={{ fontSize: '2.2rem', marginBottom: '1rem', fontWeight: 700 }}>Application Received!</h1>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '1.1rem', maxWidth: '500px', margin: '0 auto 2rem' }}>
            Thank you for submitting your application. Our team will review it and contact you shortly.
          </p>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', marginBottom: '2rem' }}>
            Agent: {agent.name}
          </p>
          {agentViewUrl && (
            <button
              onClick={() => window.open(agentViewUrl, '_blank')}
              data-testid="button-view-application"
              style={{
                background: 'rgba(255,255,255,0.15)',
                color: 'white',
                border: '2px solid rgba(255,255,255,0.3)',
                padding: '1rem 2rem',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: 'pointer',
                marginBottom: '1rem',
              }}
            >
              View Application
            </button>
          )}
          <br />
          <a 
            href="https://todaycapitalgroup.com" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', textDecoration: 'underline' }}
          >
            Return to Website
          </a>
        </div>
      </div>
    );
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.85rem 1rem',
    border: '2px solid rgba(255,255,255,0.2)',
    background: 'rgba(255,255,255,0.1)',
    color: 'white',
    borderRadius: '8px',
    fontSize: '1rem',
    fontFamily: 'inherit',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '0.9rem',
    fontWeight: 500,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: '0.5rem',
    display: 'block',
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    appearance: 'none' as const,
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 1rem center',
    backgroundSize: '1em',
  };

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', backgroundColor: '#f0f2f5', minHeight: '100vh', padding: '20px' }}>
      <div style={{
        background: 'linear-gradient(to bottom, #192F56 0%, #19112D 100%)',
        color: 'white',
        padding: '2.5rem',
        borderRadius: '15px',
        boxShadow: '0 12px 30px rgba(25, 47, 86, 0.3)',
        width: '100%',
        maxWidth: '900px',
        margin: '2rem auto',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            Business Funding Application
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem' }}>
            Agent: {agent.name}
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1.5rem' }}>
            <div style={{
              width: currentStep === 1 ? '50%' : '50%',
              height: '4px',
              background: currentStep >= 1 ? '#5FBFB8' : 'rgba(255,255,255,0.2)',
              borderRadius: '2px',
            }} />
            <div style={{
              width: '50%',
              height: '4px',
              background: currentStep >= 2 ? '#5FBFB8' : 'rgba(255,255,255,0.2)',
              borderRadius: '2px',
            }} />
          </div>
        </div>

        {currentStep === 1 && (
          <div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 600, marginBottom: '1.5rem', color: '#5FBFB8' }}>
              Step 1: Business Information
            </h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
              <div>
                <label style={labelStyle}>Legal Business Name *</label>
                <input 
                  name="legal_business_name" 
                  value={formData.legal_business_name || ''} 
                  onChange={handleInputChange}
                  style={inputStyle}
                  data-testid="input-legal_business_name"
                />
              </div>
              
              <div>
                <label style={labelStyle}>DBA (Doing Business As) *</label>
                <input 
                  name="doing_business_as" 
                  value={formData.doing_business_as || ''} 
                  onChange={handleInputChange}
                  style={inputStyle}
                  data-testid="input-doing_business_as"
                />
              </div>

              <div>
                <label style={labelStyle}>Company Email *</label>
                <input 
                  type="email"
                  name="company_email" 
                  value={formData.company_email || ''} 
                  onChange={handleInputChange}
                  style={inputStyle}
                  data-testid="input-company_email"
                />
              </div>

              <div>
                <label style={labelStyle}>Business Start Date *</label>
                <input 
                  type="date"
                  name="business_start_date" 
                  value={formData.business_start_date || ''} 
                  onChange={handleInputChange}
                  style={inputStyle}
                  data-testid="input-business_start_date"
                />
              </div>

              <div>
                <label style={labelStyle}>EIN (Tax ID) *</label>
                <input 
                  name="ein" 
                  value={formData.ein || ''} 
                  onChange={handleInputChange}
                  placeholder="XX-XXXXXXX"
                  style={inputStyle}
                  data-testid="input-ein"
                />
              </div>

              <div>
                <label style={labelStyle}>Industry *</label>
                <select 
                  name="industry" 
                  value={formData.industry || ''} 
                  onChange={handleInputChange}
                  style={selectStyle}
                  data-testid="select-industry"
                >
                  <option value="" style={{ color: 'black' }}>Select...</option>
                  {INDUSTRIES.map(ind => (
                    <option key={ind.value} value={ind.value} style={{ color: 'black' }}>{ind.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>State of Incorporation *</label>
                <select 
                  name="state_of_incorporation" 
                  value={formData.state_of_incorporation || ''} 
                  onChange={handleInputChange}
                  style={selectStyle}
                  data-testid="select-state_of_incorporation"
                >
                  <option value="" style={{ color: 'black' }}>Select...</option>
                  {US_STATES.map(st => (
                    <option key={st} value={st} style={{ color: 'black' }}>{st}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Process Credit Cards? *</label>
                <select 
                  name="do_you_process_credit_cards" 
                  value={formData.do_you_process_credit_cards || ''} 
                  onChange={handleInputChange}
                  style={selectStyle}
                  data-testid="select-do_you_process_credit_cards"
                >
                  <option value="" style={{ color: 'black' }}>Select...</option>
                  <option value="Yes" style={{ color: 'black' }}>Yes</option>
                  <option value="No" style={{ color: 'black' }}>No</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>Company Website</label>
                <input 
                  name="company_website" 
                  value={formData.company_website || ''} 
                  onChange={handleInputChange}
                  placeholder="www.example.com"
                  style={inputStyle}
                  data-testid="input-company_website"
                />
              </div>
            </div>

            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: '2rem 0 1rem', color: 'rgba(255,255,255,0.9)' }}>
              Business Address
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Street Address *</label>
                <input 
                  name="business_street_address" 
                  value={formData.business_street_address || ''} 
                  onChange={handleInputChange}
                  style={inputStyle}
                  data-testid="input-business_street_address"
                />
              </div>
              
              <div>
                <label style={labelStyle}>City *</label>
                <input 
                  name="business_city" 
                  value={formData.business_city || ''} 
                  onChange={handleInputChange}
                  style={inputStyle}
                  data-testid="input-business_city"
                />
              </div>

              <div>
                <label style={labelStyle}>State *</label>
                <select 
                  name="business_state" 
                  value={formData.business_state || ''} 
                  onChange={handleInputChange}
                  style={selectStyle}
                  data-testid="select-business_state"
                >
                  <option value="" style={{ color: 'black' }}>Select...</option>
                  {US_STATES.map(st => (
                    <option key={st} value={st} style={{ color: 'black' }}>{st}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>ZIP Code *</label>
                <input 
                  name="business_zip" 
                  value={formData.business_zip || ''} 
                  onChange={handleInputChange}
                  style={inputStyle}
                  data-testid="input-business_zip"
                />
              </div>
            </div>

            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: '2rem 0 1rem', color: 'rgba(255,255,255,0.9)' }}>
              Funding Request
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
              <div>
                <label style={labelStyle}>Requested Amount *</label>
                <input 
                  name="requested_loan_amount" 
                  value={formData.requested_loan_amount || ''} 
                  onChange={handleInputChange}
                  placeholder="$0"
                  style={inputStyle}
                  data-testid="input-requested_loan_amount"
                />
              </div>

              <div>
                <label style={labelStyle}>Current MCA Balance</label>
                <input 
                  name="mca_balance_amount" 
                  value={formData.mca_balance_amount || ''} 
                  onChange={handleInputChange}
                  placeholder="$0"
                  style={inputStyle}
                  data-testid="input-mca_balance_amount"
                />
              </div>

              <div>
                <label style={labelStyle}>MCA Lender Name</label>
                <input 
                  name="mca_balance_bank_name" 
                  value={formData.mca_balance_bank_name || ''} 
                  onChange={handleInputChange}
                  placeholder="N/A"
                  style={inputStyle}
                  data-testid="input-mca_balance_bank_name"
                />
              </div>
            </div>

            <div style={{ marginTop: '2.5rem', textAlign: 'center' }}>
              <button
                onClick={goToStep2}
                data-testid="button-next"
                style={{
                  background: '#5FBFB8',
                  color: 'white',
                  border: 'none',
                  padding: '1rem 3rem',
                  borderRadius: '8px',
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                Continue to Owner Info →
              </button>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 600, marginBottom: '1.5rem', color: '#5FBFB8' }}>
              Step 2: Owner Information
            </h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
              <div>
                <label style={labelStyle}>Full Name *</label>
                <input 
                  name="full_name" 
                  value={formData.full_name || ''} 
                  onChange={handleInputChange}
                  style={inputStyle}
                  data-testid="input-full_name"
                />
              </div>

              <div>
                <label style={labelStyle}>Email *</label>
                <input 
                  type="email"
                  name="email" 
                  value={formData.email || ''} 
                  onChange={handleInputChange}
                  style={inputStyle}
                  data-testid="input-email"
                />
              </div>

              <div>
                <label style={labelStyle}>Phone *</label>
                <input 
                  name="phone" 
                  value={formData.phone || ''} 
                  onChange={handleInputChange}
                  placeholder="XXX-XXX-XXXX"
                  style={inputStyle}
                  data-testid="input-phone"
                />
              </div>

              <div>
                <label style={labelStyle}>Social Security Number *</label>
                <input 
                  name="social_security_" 
                  value={formData.social_security_ || ''} 
                  onChange={handleInputChange}
                  placeholder="XXX-XX-XXXX"
                  style={inputStyle}
                  data-testid="input-social_security_"
                />
              </div>

              <div>
                <label style={labelStyle}>Date of Birth *</label>
                <input 
                  type="date"
                  name="date_of_birth" 
                  value={formData.date_of_birth || ''} 
                  onChange={handleInputChange}
                  style={inputStyle}
                  data-testid="input-date_of_birth"
                />
              </div>

              <div>
                <label style={labelStyle}>Ownership Percentage *</label>
                <input 
                  type="number"
                  name="ownership_percentage" 
                  value={formData.ownership_percentage || ''} 
                  onChange={handleInputChange}
                  placeholder="100"
                  style={inputStyle}
                  data-testid="input-ownership_percentage"
                />
              </div>

              <div>
                <label style={labelStyle}>Estimated FICO Score</label>
                <input 
                  type="number"
                  name="personal_credit_score_range" 
                  value={formData.personal_credit_score_range || ''} 
                  onChange={handleInputChange}
                  placeholder="e.g. 720"
                  style={inputStyle}
                  data-testid="input-personal_credit_score_range"
                />
              </div>
            </div>

            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: '2rem 0 1rem', color: 'rgba(255,255,255,0.9)' }}>
              Home Address
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Street Address *</label>
                <input 
                  name="owner_address1" 
                  value={formData.owner_address1 || ''} 
                  onChange={handleInputChange}
                  style={inputStyle}
                  data-testid="input-owner_address1"
                />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Apt/Suite/Unit</label>
                <input 
                  name="owner_address2" 
                  value={formData.owner_address2 || ''} 
                  onChange={handleInputChange}
                  style={inputStyle}
                  data-testid="input-owner_address2"
                />
              </div>

              <div>
                <label style={labelStyle}>City *</label>
                <input 
                  name="owner_city" 
                  value={formData.owner_city || ''} 
                  onChange={handleInputChange}
                  style={inputStyle}
                  data-testid="input-owner_city"
                />
              </div>

              <div>
                <label style={labelStyle}>State *</label>
                <select 
                  name="owner_state" 
                  value={formData.owner_state || ''} 
                  onChange={handleInputChange}
                  style={selectStyle}
                  data-testid="select-owner_state"
                >
                  <option value="" style={{ color: 'black' }}>Select...</option>
                  {US_STATES.map(st => (
                    <option key={st} value={st} style={{ color: 'black' }}>{st}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>ZIP Code *</label>
                <input 
                  name="owner_zip" 
                  value={formData.owner_zip || ''} 
                  onChange={handleInputChange}
                  style={inputStyle}
                  data-testid="input-owner_zip"
                />
              </div>
            </div>

            <div style={{ marginTop: '2.5rem', padding: '1.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '10px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', color: 'rgba(255,255,255,0.9)' }}>
                Authorization & Consent
              </h3>
              
              <label style={{ 
                display: 'flex', 
                alignItems: 'flex-start', 
                gap: '0.75rem', 
                cursor: 'pointer',
                padding: '1rem',
                background: showConsentError ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
                border: showConsentError ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid transparent',
                borderRadius: '8px',
              }}>
                <input
                  type="checkbox"
                  checked={consentChecked}
                  onChange={(e) => {
                    setConsentChecked(e.target.checked);
                    setShowConsentError(false);
                  }}
                  data-testid="checkbox-consent"
                  style={{ 
                    width: '20px', 
                    height: '20px', 
                    marginTop: '2px',
                    accentColor: '#5FBFB8',
                  }}
                />
                <span style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)', lineHeight: 1.5 }}>
                  By checking this box, I authorize Today Capital Group to submit my application to lending partners 
                  and consent to a soft credit inquiry. I certify that all information provided is accurate and complete.
                  This serves as my electronic signature.
                </span>
              </label>
            </div>

            <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => setCurrentStep(1)}
                data-testid="button-back"
                style={{
                  background: 'transparent',
                  color: 'white',
                  border: '2px solid rgba(255,255,255,0.3)',
                  padding: '1rem 2rem',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                ← Back
              </button>
              
              <button
                onClick={submitApplication}
                disabled={isSubmitting}
                data-testid="button-submit"
                style={{
                  background: isSubmitting ? 'rgba(95, 191, 184, 0.5)' : '#5FBFB8',
                  color: 'white',
                  border: 'none',
                  padding: '1rem 3rem',
                  borderRadius: '8px',
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                {isSubmitting ? (
                  <>
                    <span style={{ 
                      width: '20px', 
                      height: '20px', 
                      border: '2px solid white', 
                      borderTopColor: 'transparent', 
                      borderRadius: '50%', 
                      animation: 'spin 1s linear infinite' 
                    }} />
                    Submitting...
                  </>
                ) : (
                  'Submit Application'
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
