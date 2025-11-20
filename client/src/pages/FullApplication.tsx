import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { type LoanApplication } from "@shared/schema";

export default function FullApplication() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [isCheckingId, setIsCheckingId] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<any>({});
  const [consentChecked, setConsentChecked] = useState(false);
  const [showConsentError, setShowConsentError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Check for Application ID
  useEffect(() => {
    const savedId = localStorage.getItem("applicationId");
    if (!savedId) {
      navigate("/");
    } else {
      setApplicationId(savedId);
    }
    setIsCheckingId(false);
  }, [navigate]);

  // Fetch existing data to pre-fill
  const { data: existingData, isLoading } = useQuery<LoanApplication>({
    queryKey: [`/api/applications/${applicationId}`],
    enabled: !!applicationId,
  });

  // Pre-fill form data from intake
  useEffect(() => {
    if (existingData) {
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
        business_street_address: existingData.businessStreetAddress || existingData.businessAddress || "",
        business_csz: existingData.businessCsz || (existingData.city && existingData.state && existingData.zipCode ? `${existingData.city}, ${existingData.state} ${existingData.zipCode}` : ""),
        requested_loan_amount: existingData.requestedAmount ? existingData.requestedAmount.toString() : "",
        mca_balance_amount: existingData.mcaBalanceAmount ? existingData.mcaBalanceAmount.toString() : "",
        mca_balance_bank_name: existingData.mcaBalanceBankName || "",
        full_name: existingData.fullName || "",
        email: existingData.email || "",
        social_security_: existingData.socialSecurityNumber || "",
        phone: existingData.phone || "",
        personal_credit_score_range: existingData.personalCreditScoreRange || existingData.ficoScoreExact || existingData.creditScore || "",
        address1: existingData.ownerAddress1 || existingData.businessAddress || "",
        address2: existingData.ownerAddress2 || "",
        owner_csz: existingData.ownerCsz || (existingData.ownerCity && existingData.ownerState && existingData.ownerZip ? `${existingData.ownerCity}, ${existingData.ownerState} ${existingData.ownerZip}` : ""),
        date_of_birth: existingData.dateOfBirth || "",
        ownership_percentage: existingData.ownership || "",
      });
    }
  }, [existingData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const goToStep2 = () => {
    // Validate Step 1
    const step1Fields = ['legal_business_name', 'doing_business_as', 'business_start_date', 'ein', 'company_email', 'state_of_incorporation', 'do_you_process_credit_cards', 'industry', 'business_street_address', 'business_csz', 'requested_loan_amount'];
    const isValid = step1Fields.every(field => formData[field] && formData[field].toString().trim() !== '');
    
    if (!isValid) {
      toast({ title: "Missing Information", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }
    
    setCurrentStep(2);
    window.scrollTo(0, 0);
  };

  const submitApplication = async () => {
    setShowConsentError(false);

    // Validate Step 2
    const step2Fields = ['full_name', 'email', 'social_security_', 'phone', 'address1', 'owner_csz', 'date_of_birth', 'ownership_percentage'];
    const isValid = step2Fields.every(field => formData[field] && formData[field].toString().trim() !== '');
    
    if (!isValid) {
      toast({ title: "Missing Information", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }

    if (!consentChecked) {
      setShowConsentError(true);
      return;
    }

    setIsSubmitting(true);

    try {
      // Update database (backend will handle GHL webhooks)
      await apiRequest("PATCH", `/api/applications/${applicationId}`, {
        legalBusinessName: formData.legal_business_name,
        doingBusinessAs: formData.doing_business_as,
        companyWebsite: formData.company_website,
        businessStartDate: formData.business_start_date,
        ein: formData.ein,
        companyEmail: formData.company_email,
        stateOfIncorporation: formData.state_of_incorporation,
        doYouProcessCreditCards: formData.do_you_process_credit_cards,
        industry: formData.industry,
        businessStreetAddress: formData.business_street_address,
        businessCsz: formData.business_csz,
        requestedAmount: formData.requested_loan_amount,
        mcaBalanceAmount: formData.mca_balance_amount,
        mcaBalanceBankName: formData.mca_balance_bank_name,
        fullName: formData.full_name,
        email: formData.email,
        socialSecurityNumber: formData.social_security_,
        phone: formData.phone,
        personalCreditScoreRange: formData.personal_credit_score_range,
        ownerAddress1: formData.address1,
        ownerAddress2: formData.address2,
        ownerCsz: formData.owner_csz,
        dateOfBirth: formData.date_of_birth,
        ownership: formData.ownership_percentage,
        isFullApplicationCompleted: true,
      });

      setIsSubmitting(false);
      setShowSuccess(true);
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
      <div style={{
        fontFamily: 'Inter, sans-serif',
        backgroundColor: '#f0f2f5',
        minHeight: '100vh',
        padding: '20px',
      }}>
        <div style={{
          background: 'linear-gradient(to bottom, #192F56 0%, #19112D 100%)',
          color: 'white',
          padding: '3rem',
          borderRadius: '15px',
          boxShadow: '0 12px 30px rgba(25, 47, 86, 0.3), 0 4px 15px rgba(0, 0, 0, 0.2)',
          minHeight: '600px',
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
            border: '3px solid #22c55e',
          }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20,6 9,17 4,12"></polyline>
            </svg>
          </div>
          <h3 style={{ fontSize: '2.2rem', marginBottom: '1rem', fontWeight: 600, color: '#22c55e' }}>
            Application Received
          </h3>
          <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '1.1rem', lineHeight: 1.6, marginBottom: '1rem' }}>
            Your full funding application has been submitted successfully.
          </p>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '1rem', lineHeight: 1.5, marginBottom: '2.5rem' }}>
            Our underwriting team is reviewing your details. You will receive an update via email within 24-48 hours.
          </p>
          <button
            data-testid="button-return-home"
            onClick={() => navigate("/")}
            style={{
              maxWidth: '300px',
              width: '100%',
              background: 'white',
              color: '#192F56',
              padding: '1rem 2rem',
              borderRadius: '8px',
              border: 'none',
              fontWeight: 600,
              fontSize: '1.1rem',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
            }}
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      fontFamily: 'Inter, sans-serif',
      backgroundColor: '#f0f2f5',
      minHeight: '100vh',
      padding: '20px',
    }}>
      <div style={{
        background: 'linear-gradient(to bottom, #192F56 0%, #19112D 100%)',
        color: 'white',
        padding: '3rem',
        borderRadius: '15px',
        boxShadow: '0 12px 30px rgba(25, 47, 86, 0.3), 0 4px 15px rgba(0, 0, 0, 0.2)',
        minHeight: '600px',
        width: '100%',
        maxWidth: '900px',
        margin: '2rem auto',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
          <img 
            src="https://cdn.prod.website-files.com/6864b4e14db4a4b6864c7968/686c1b87657a831f612b5390_Group%2017%20(1).svg" 
            alt="Today Capital Group" 
            style={{ height: '60px', width: 'auto' }}
            data-testid="img-logo"
          />
        </div>

        {/* Progress Bar */}
        <div style={{
          width: '100%',
          height: '4px',
          background: 'rgba(255,255,255,0.2)',
          borderRadius: '2px',
          marginBottom: '2.5rem',
        }}>
          <div style={{
            width: currentStep === 1 ? '50%' : '100%',
            height: '100%',
            background: 'white',
            borderRadius: '2px',
            transition: 'width 0.5s ease',
          }}></div>
        </div>

        {/* Step 1: Business Information */}
        {currentStep === 1 && (
          <div>
            <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem', fontWeight: 600, textAlign: 'center' }}>
              Business Information
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginBottom: '2.5rem', fontSize: '1rem' }}>
              Please provide details about your business entity.
            </p>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1.5rem',
              marginBottom: '2rem',
            }}>
              <InputGroup label="Legal Company Name" name="legal_business_name" value={formData.legal_business_name || ''} onChange={handleInputChange} required />
              <InputGroup label="Doing Business As (DBA)" name="doing_business_as" value={formData.doing_business_as || ''} onChange={handleInputChange} required />
              <InputGroup label="Company Website" name="company_website" value={formData.company_website || ''} onChange={handleInputChange} />
              <InputGroup label="Business Start Date" name="business_start_date" type="date" value={formData.business_start_date || ''} onChange={handleInputChange} required />
              <InputGroup label="Tax ID or EIN" name="ein" placeholder="XX-XXXXXXX" value={formData.ein || ''} onChange={handleInputChange} required />
              <InputGroup label="Company Email" name="company_email" type="email" value={formData.company_email || ''} onChange={handleInputChange} required />
              <InputGroup label="State of Incorporation" name="state_of_incorporation" placeholder="e.g. CA" maxLength={2} value={formData.state_of_incorporation || ''} onChange={handleInputChange} required />
              <SelectGroup label="Do You Process Credit Cards?" name="do_you_process_credit_cards" value={formData.do_you_process_credit_cards || ''} onChange={handleInputChange} options={["Yes", "No"]} required />
              <InputGroup label="Industry Type" name="industry" value={formData.industry || ''} onChange={handleInputChange} required />
              <InputGroup label="Business Street Address" name="business_street_address" value={formData.business_street_address || ''} onChange={handleInputChange} required />
              <InputGroup label="City, State, Zip" name="business_csz" placeholder="City, ST 12345" value={formData.business_csz || ''} onChange={handleInputChange} required />
              <InputGroup label="Financing Amount ($)" name="requested_loan_amount" type="number" value={formData.requested_loan_amount || ''} onChange={handleInputChange} required />
              <InputGroup label="MCA Balance Amount ($)" name="mca_balance_amount" type="number" placeholder="0 if none" value={formData.mca_balance_amount || ''} onChange={handleInputChange} />
              <InputGroup label="MCA Balances Bank Name" name="mca_balance_bank_name" placeholder="N/A if none" value={formData.mca_balance_bank_name || ''} onChange={handleInputChange} />
            </div>

            <button
              data-testid="button-next-step"
              onClick={goToStep2}
              style={{
                width: '100%',
                background: 'white',
                color: '#192F56',
                padding: '1rem 2rem',
                borderRadius: '8px',
                border: 'none',
                fontWeight: 600,
                fontSize: '1.1rem',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                marginTop: '1rem',
              }}
            >
              Next: Owner Information
            </button>
          </div>
        )}

        {/* Step 2: Owner Information */}
        {currentStep === 2 && (
          <div>
            <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem', fontWeight: 600, textAlign: 'center' }}>
              Owner Information
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginBottom: '2.5rem', fontSize: '1rem' }}>
              Details for the primary business owner (51%+)
            </p>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1.5rem',
              marginBottom: '2rem',
            }}>
              <InputGroup label="Full Name" name="full_name" value={formData.full_name || ''} onChange={handleInputChange} required />
              <InputGroup label="Business Email (Owner)" name="email" type="email" value={formData.email || ''} onChange={handleInputChange} required />
              <InputGroup label="Social Security Number" name="social_security_" placeholder="XXX-XX-XXXX" value={formData.social_security_ || ''} onChange={handleInputChange} required />
              <InputGroup label="Mobile Phone" name="phone" type="tel" value={formData.phone || ''} onChange={handleInputChange} required />
              <InputGroup label="FICO Score (Estimate)" name="personal_credit_score_range" type="number" placeholder="e.g. 700" value={formData.personal_credit_score_range || ''} onChange={handleInputChange} />
              <InputGroup label="Home Address Line 1" name="address1" value={formData.address1 || ''} onChange={handleInputChange} required />
              <InputGroup label="Address Line 2" name="address2" value={formData.address2 || ''} onChange={handleInputChange} />
              <InputGroup label="City, State, Zip (Owner)" name="owner_csz" placeholder="City, ST 12345" value={formData.owner_csz || ''} onChange={handleInputChange} required />
              <InputGroup label="Date of Birth" name="date_of_birth" type="date" value={formData.date_of_birth || ''} onChange={handleInputChange} required />
              <InputGroup label="Ownership %" name="ownership_percentage" type="number" placeholder="100" value={formData.ownership_percentage || ''} onChange={handleInputChange} required />
            </div>

            {/* Consent Checkbox */}
            <div style={{ margin: '2rem 0' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', textAlign: 'left', gap: '0.75rem' }}>
                <input
                  data-testid="checkbox-consent"
                  type="checkbox"
                  id="consentCheck"
                  checked={consentChecked}
                  onChange={(e) => setConsentChecked(e.target.checked)}
                  style={{ width: '16px', height: '16px', marginTop: '3px', cursor: 'pointer', flexShrink: 0 }}
                  required
                />
                <label htmlFor="consentCheck" style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px', lineHeight: 1.4, cursor: 'pointer', fontWeight: 400 }}>
                  By submitting this application, I certify that all information provided is accurate and complete. I authorize Today Capital Group and its partners to obtain credit reports and other information to process my application. I agree to the <a href="https://www.todaycapitalgroup.com/terms-of-service" target="_blank" style={{ textDecoration: 'underline', color: 'rgba(255,255,255,0.8)' }}>Terms of Service</a> and <a href="https://www.todaycapitalgroup.com/privacy-policy" target="_blank" style={{ textDecoration: 'underline', color: 'rgba(255,255,255,0.8)' }}>Privacy Policy</a>.
                </label>
              </div>
              {showConsentError && (
                <div style={{ display: 'block', marginTop: '0.5rem', padding: '0.5rem', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '4px' }}>
                  <p style={{ color: '#ef4444', fontSize: '0.85rem', margin: 0 }}>Please accept the terms to continue</p>
                </div>
              )}
            </div>

            <button
              data-testid="button-submit"
              onClick={submitApplication}
              disabled={isSubmitting}
              style={{
                width: '100%',
                background: 'white',
                color: '#192F56',
                padding: '1rem 2rem',
                borderRadius: '8px',
                border: 'none',
                fontWeight: 600,
                fontSize: '1.1rem',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                marginTop: '1rem',
                opacity: isSubmitting ? 0.7 : 1,
              }}
            >
              {isSubmitting ? 'Submitting application securely...' : 'Submit Full Application'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper Components
function InputGroup({ label, name, type = "text", placeholder = "", maxLength, value, onChange, required = false }: any) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <label style={{ fontSize: '0.9rem', fontWeight: 500, color: 'rgba(255,255,255,0.9)' }}>
        {label}
      </label>
      <input
        data-testid={`input-${name}`}
        type={type}
        name={name}
        placeholder={placeholder}
        maxLength={maxLength}
        value={value}
        onChange={onChange}
        required={required}
        style={{
          width: '100%',
          padding: '0.85rem 1rem',
          border: '2px solid rgba(255,255,255,0.2)',
          background: 'rgba(255,255,255,0.1)',
          color: 'white',
          borderRadius: '8px',
          fontSize: '1rem',
          fontFamily: 'inherit',
          transition: 'all 0.2s ease',
        }}
      />
    </div>
  );
}

function SelectGroup({ label, name, value, onChange, options, required = false }: any) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <label style={{ fontSize: '0.9rem', fontWeight: 500, color: 'rgba(255,255,255,0.9)' }}>
        {label}
      </label>
      <select
        data-testid={`select-${name}`}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        style={{
          width: '100%',
          padding: '0.85rem 1rem',
          border: '2px solid rgba(255,255,255,0.2)',
          background: 'rgba(255,255,255,0.1)',
          color: 'white',
          borderRadius: '8px',
          fontSize: '1rem',
          fontFamily: 'inherit',
          transition: 'all 0.2s ease',
          appearance: 'none',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 1rem center',
          backgroundSize: '1em',
        }}
      >
        <option value="" disabled>Select...</option>
        {options.map((opt: string) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
}
