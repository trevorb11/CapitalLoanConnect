import { useState, forwardRef, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Check } from "lucide-react";

// US States list
const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
];

// Validation helper for CSZ format
const validateCsz = (csz: string) => {
  const parts = csz.split(',').map(p => p.trim());
  if (parts.length < 2) return false;
  const statePart = parts[1].trim().split(/\s+/)[0];
  return statePart.length === 2 && /^[A-Z]{2}$/.test(statePart);
};

// Format EIN to XX-XXXXXXX
const formatEin = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 9);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}-${digits.slice(2)}`;
};

// Format SSN to XXX-XX-XXXX
const formatSsn = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 9);
  if (digits.length <= 3) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
};

// Format Phone to XXX-XXX-XXXX
const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
};

// Validation schemas for each step
const step1Schema = z.object({
  email: z.string().email("Invalid email"),
  fullName: z.string().min(1, "Required"),
  phone: z.string().min(1, "Required"),
  legalBusinessName: z.string().min(1, "Required"),
  doingBusinessAs: z.string().min(1, "Required"),
  companyWebsite: z.string().optional(),
  businessStartDate: z.string().min(1, "Required"),
  ein: z.string().min(1, "Required").refine((val) => val.replace(/\D/g, '').length === 9, "EIN must be 9 digits"),
  companyEmail: z.string().email("Invalid email"),
  stateOfIncorporation: z.string().min(1, "Required"),
  doYouProcessCreditCards: z.enum(["Yes", "No"]),
  industry: z.string().min(1, "Required"),
  businessStreetAddress: z.string().min(1, "Required"),
  businessCsz: z.string().min(1, "Required").refine(validateCsz, "Use format: City, ST 12345 (state must be 2 letters)"),
  requestedAmount: z.string().min(1, "Required"),
  mcaBalanceAmount: z.string().optional(),
  mcaBalanceBankName: z.string().optional(),
});

const step2Schema = z.object({
  ownerSsn: z.string().min(1, "Required"),
  personalCreditScoreRange: z.string().optional(),
  address1: z.string().min(1, "Required"),
  address2: z.string().optional(),
  ownerCsz: z.string().min(1, "Required").refine(validateCsz, "Use format: City, ST 12345 (state must be 2 letters)"),
  ownerDob: z.string().min(1, "Required"),
  ownerPercentage: z.string().min(1, "Required"),
  consent: z.boolean().refine((val) => val === true, "You must accept the terms"),
});

type Step1Data = z.infer<typeof step1Schema>;
type Step2Data = z.infer<typeof step2Schema>;

export default function IntakeForm() {
  const [, navigate] = useLocation();
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showConsentError, setShowConsentError] = useState(false);
  const [signature, setSignature] = useState<string>("");
  const [showSignatureError, setShowSignatureError] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Step 1 form
  const form1 = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      email: "",
      fullName: "",
      phone: "",
      legalBusinessName: "",
      doingBusinessAs: "",
      companyWebsite: "",
      businessStartDate: "",
      ein: "",
      companyEmail: "",
      stateOfIncorporation: "",
      doYouProcessCreditCards: "Yes",
      industry: "",
      businessStreetAddress: "",
      businessCsz: "",
      requestedAmount: "",
      mcaBalanceAmount: "",
      mcaBalanceBankName: "",
    },
  });

  // Step 2 form
  const form2 = useForm<Step2Data>({
    resolver: zodResolver(step2Schema),
    defaultValues: {
      ownerSsn: "",
      personalCreditScoreRange: "",
      address1: "",
      address2: "",
      ownerCsz: "",
      ownerDob: "",
      ownerPercentage: "",
      consent: false,
    },
  });

  // Create application mutation
  const createMutation = useMutation({
    mutationFn: async (data: Step1Data) => {
      const response = await apiRequest("POST", "/api/applications", {
        email: data.email,
        fullName: data.fullName,
        phone: data.phone,
        legalBusinessName: data.legalBusinessName,
        doingBusinessAs: data.doingBusinessAs,
        companyWebsite: data.companyWebsite,
        businessStartDate: data.businessStartDate,
        ein: data.ein,
        companyEmail: data.companyEmail,
        stateOfIncorporation: data.stateOfIncorporation,
        doYouProcessCreditCards: data.doYouProcessCreditCards,
        industry: data.industry,
        businessStreetAddress: data.businessStreetAddress,
        businessCsz: data.businessCsz,
        requestedAmount: data.requestedAmount.replace(/\D/g, ""),
        mcaBalanceAmount: data.mcaBalanceAmount?.replace(/\D/g, "") || "",
        mcaBalanceBankName: data.mcaBalanceBankName || "",
        currentStep: 1,
      }) as Response;
      return response.json();
    },
  });

  // Update application mutation
  const updateMutation = useMutation({
    mutationFn: async (data: Step2Data) => {
      if (!applicationId) throw new Error("No application ID");
      const response = await apiRequest("PATCH", `/api/applications/${applicationId}`, {
        socialSecurityNumber: data.ownerSsn,
        personalCreditScoreRange: data.personalCreditScoreRange,
        ownerAddress1: data.address1,
        ownerAddress2: data.address2,
        ownerCsz: data.ownerCsz,
        dateOfBirth: data.ownerDob,
        ownerPercentage: data.ownerPercentage,
        applicantSignature: signature,
        isCompleted: true,
        currentStep: 2,
      }) as Response;
      return response.json();
    },
  });

  // Signature pad functions
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if ('touches' in e) {
      e.preventDefault();
    }
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    setIsDrawing(true);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.nativeEvent.offsetX;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.nativeEvent.offsetY;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    if ('touches' in e) {
      e.preventDefault();
    }
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.nativeEvent.offsetX;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.nativeEvent.offsetY;
    
    ctx.lineTo(x, y);
    ctx.strokeStyle = '#1B2E4D';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  };

  const stopDrawing = (e?: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (e && 'touches' in e) {
      e.preventDefault();
    }
    
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const signatureData = canvas.toDataURL('image/png');
    setSignature(signatureData);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignature("");
    setShowSignatureError(false);
  };

  const handleStep1Submit = async (data: Step1Data) => {
    try {
      const result: any = await createMutation.mutateAsync(data);
      setApplicationId(result.id);
      localStorage.setItem("applicationId", result.id);
      setCurrentStep(2);
      window.scrollTo(0, 0);
    } catch (error) {
      console.error("Error saving Step 1:", error);
    }
  };

  const handleStep2Submit = async (data: Step2Data) => {
    setShowConsentError(false);
    setShowSignatureError(false);
    
    if (!data.consent) {
      setShowConsentError(true);
      return;
    }

    if (!signature) {
      setShowSignatureError(true);
      window.scrollTo(0, document.body.scrollHeight);
      return;
    }

    setIsSubmitting(true);
    try {
      await updateMutation.mutateAsync(data);
      setShowSuccess(true);
      window.scrollTo(0, 0);
    } catch (error) {
      console.error("Error submitting application:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const progressWidth = currentStep === 1 ? "50%" : "100%";

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-[#f0f2f5] p-4 md:p-8">
        <div
          className="w-full max-w-[900px] mx-auto rounded-[15px] p-6 md:p-12 text-white text-center"
          style={{
            background: "linear-gradient(to bottom, #192F56 0%, #19112D 100%)",
            boxShadow: "0 12px 30px rgba(25, 47, 86, 0.3), 0 4px 15px rgba(0, 0, 0, 0.2)",
            minHeight: "600px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div className="w-20 h-20 mx-auto mb-8 rounded-full flex items-center justify-center border-3"
            style={{ background: "rgba(34, 197, 94, 0.2)", borderColor: "#22c55e", borderWidth: "3px" }}>
            <Check className="w-10 h-10" style={{ color: "#22c55e", strokeWidth: 3 }} />
          </div>
          <h3 className="text-4xl md:text-5xl font-semibold mb-4" style={{ color: "#22c55e" }}>
            Application Received
          </h3>
          <p className="text-lg md:text-xl mb-4" style={{ color: "rgba(255,255,255,0.9)", lineHeight: 1.6 }}>
            Your full funding application has been submitted successfully.
          </p>
          <p className="text-base md:text-lg mb-10" style={{ color: "rgba(255,255,255,0.8)", lineHeight: 1.5 }}>
            Our underwriting team is reviewing your details. You will receive an update via email within 24-48 hours.
          </p>
          <button
            onClick={() => navigate("/")}
            className="bg-white text-[#192F56] px-8 py-4 rounded-lg font-semibold text-lg transition-all hover:bg-[#f8f9fa] hover:-translate-y-0.5"
            style={{ maxWidth: "300px", boxShadow: "0 4px 12px rgba(0,0,0,0.2)" }}
            data-testid="button-return-home"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0f2f5] p-4 md:p-8">
      {/* Logo */}
      <div className="flex justify-center mb-8 max-w-[900px] mx-auto">
        <img 
          src="https://cdn.prod.website-files.com/6864b4e14db4a4b6864c7968/686c1b87657a831f612b5390_Group%2017%20(1).svg" 
          alt="Today Capital Group" 
          style={{ height: "60px", width: "auto" }}
          data-testid="img-logo"
        />
      </div>

      <div
        className="w-full max-w-[900px] mx-auto rounded-[15px] p-6 md:p-12 text-white relative overflow-hidden"
        style={{
          background: "linear-gradient(to bottom, #192F56 0%, #19112D 100%)",
          boxShadow: "0 12px 30px rgba(25, 47, 86, 0.3), 0 4px 15px rgba(0, 0, 0, 0.2)",
          minHeight: "600px",
        }}
      >
        {/* Progress Bar */}
        <div className="w-full h-1 rounded-full mb-10" style={{ background: "rgba(255,255,255,0.2)" }}>
          <div
            className="h-full bg-white rounded-full transition-all duration-500"
            style={{ width: progressWidth }}
          />
        </div>

        {/* Step 1: Business Information */}
        {currentStep === 1 && (
          <div className="opacity-100 transition-opacity duration-500" data-testid="step-1">
            <h2 className="text-3xl md:text-4xl font-semibold text-center mb-2">Business Information</h2>
            <p className="text-center mb-10" style={{ color: "rgba(255,255,255,0.7)" }}>
              Please provide details about your business entity.
            </p>

            <form onSubmit={form1.handleSubmit(handleStep1Submit)}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <InputField label="Your Full Name" {...form1.register("fullName")} required data-testid="input-full-name-step1" />
                <InputField label="Your Email" type="email" {...form1.register("email")} required data-testid="input-email-step1" />
                <InputField label="Your Phone" type="tel" {...form1.register("phone", {
                  onChange: (e) => {
                    const formatted = formatPhone(e.target.value);
                    form1.setValue("phone", formatted);
                  }
                })} required data-testid="input-phone-step1" />
                <InputField label="Legal Company Name" {...form1.register("legalBusinessName")} required data-testid="input-legal-business-name" />
                <InputField label="Doing Business As (DBA)" {...form1.register("doingBusinessAs")} required data-testid="input-dba" />
                <InputField label="Company Website" {...form1.register("companyWebsite")} data-testid="input-company-website" />
                <InputField label="Business Start Date" type="date" {...form1.register("businessStartDate")} required data-testid="input-business-start-date" />
                <InputField label="Tax ID or EIN" {...form1.register("ein")} placeholder="XX-XXXXXXX" required data-testid="input-ein" />
                <InputField label="Company Email" type="email" {...form1.register("companyEmail")} required data-testid="input-company-email" />
                <SelectField label="State of Incorporation" {...form1.register("stateOfIncorporation")} required data-testid="select-state-incorporation">
                  <option value="">Select a state...</option>
                  {US_STATES.map(state => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </SelectField>
                <SelectField label="Do You Process Credit Cards?" {...form1.register("doYouProcessCreditCards")} required data-testid="select-credit-cards">
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </SelectField>
                <InputField label="Industry Type" {...form1.register("industry")} required data-testid="input-industry" />
                <InputField label="Business Street Address" {...form1.register("businessStreetAddress")} required data-testid="input-business-street-address" />
                <InputField label="City, State, Zip" {...form1.register("businessCsz")} placeholder="City, ST 12345" required data-testid="input-business-csz" />
                <InputField label="Financing Amount ($)" type="number" {...form1.register("requestedAmount")} required data-testid="input-requested-amount" />
                <InputField label="MCA Balance Amount ($)" type="number" {...form1.register("mcaBalanceAmount")} placeholder="0 if none" data-testid="input-mca-balance-amount" />
                <InputField label="MCA Balances Bank Name" {...form1.register("mcaBalanceBankName")} placeholder="N/A if none" data-testid="input-mca-bank-name" />
              </div>
              <button
                type="submit"
                className="w-full bg-white text-[#192F56] py-4 rounded-lg font-semibold text-lg transition-all hover:bg-[#f8f9fa] hover:-translate-y-0.5 mt-4 disabled:opacity-70 disabled:cursor-not-allowed"
                style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.2)" }}
                disabled={createMutation.isPending}
                data-testid="button-next-step"
              >
                {createMutation.isPending ? "Saving..." : "Next: Owner Information"}
              </button>
            </form>
          </div>
        )}

        {/* Step 2: Owner Information */}
        {currentStep === 2 && (
          <div className="opacity-100 transition-opacity duration-500" data-testid="step-2">
            <h2 className="text-3xl md:text-4xl font-semibold text-center mb-2">Owner Information</h2>
            <p className="text-center mb-10" style={{ color: "rgba(255,255,255,0.7)" }}>
              Details for the primary business owner (51%+)
            </p>

            <form onSubmit={form2.handleSubmit(handleStep2Submit)}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <InputField label="Social Security Number" {...form2.register("ownerSsn")} placeholder="XXX-XX-XXXX" required data-testid="input-ssn" />
                <InputField label="FICO Score (Estimate)" type="number" {...form2.register("personalCreditScoreRange")} placeholder="e.g. 700" data-testid="input-fico-score" />
                <InputField label="Home Address Line 1" {...form2.register("address1")} required data-testid="input-address-1" />
                <InputField label="Address Line 2" {...form2.register("address2")} data-testid="input-address-2" />
                <InputField label="City, State, Zip (Owner)" {...form2.register("ownerCsz")} placeholder="City, ST 12345" required data-testid="input-owner-csz" />
                <InputField label="Date of Birth" type="date" {...form2.register("ownerDob")} maxLength="10" required data-testid="input-dob" />
                <InputField label="Ownership %" type="number" {...form2.register("ownerPercentage")} placeholder="100" required data-testid="input-ownership-percentage" />
              </div>

              {/* Consent Checkbox */}
              <div className="my-8">
                <div className="flex items-start gap-3 text-left">
                  <input
                    type="checkbox"
                    id="consent"
                    {...form2.register("consent")}
                    className="w-4 h-4 mt-1 cursor-pointer flex-shrink-0"
                    style={{ accentColor: "white" }}
                    data-testid="checkbox-consent"
                  />
                  <label htmlFor="consent" className="cursor-pointer text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.6)" }}>
                    By submitting this application, I certify that all information provided is accurate and complete. I authorize Today Capital Group and its partners to obtain credit reports and other information to process my application. I agree to the{" "}
                    <a href="https://www.todaycapitalgroup.com/terms-of-service" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: "rgba(255,255,255,0.8)" }}>
                      Terms of Service
                    </a>{" "}
                    and{" "}
                    <a href="https://www.todaycapitalgroup.com/privacy-policy" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: "rgba(255,255,255,0.8)" }}>
                      Privacy Policy
                    </a>.
                  </label>
                </div>
                {showConsentError && (
                  <div className="mt-2 p-2 rounded" style={{ background: "rgba(239, 68, 68, 0.2)", border: "1px solid rgba(239, 68, 68, 0.4)" }} data-testid="error-consent">
                    <p className="text-sm m-0" style={{ color: "#ef4444" }}>Please accept the terms to continue</p>
                  </div>
                )}
              </div>

              {/* Signature Pad */}
              <div className="my-8">
                <label className="block text-sm font-semibold mb-3" style={{ color: "rgba(255,255,255,0.9)" }}>
                  Applicant Signature *
                </label>
                <div className="relative">
                  <canvas
                    ref={canvasRef}
                    width={800}
                    height={200}
                    data-testid="canvas-signature"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full rounded-lg cursor-crosshair"
                    style={{
                      height: "150px",
                      border: showSignatureError ? "2px solid rgba(239, 68, 68, 0.6)" : "2px solid rgba(255,255,255,0.2)",
                      background: "white",
                      touchAction: "none",
                    }}
                  />
                  <button
                    type="button"
                    onClick={clearSignature}
                    data-testid="button-clear-signature"
                    className="absolute top-2 right-2 px-4 py-2 rounded text-sm font-medium transition-all"
                    style={{
                      background: "rgba(239, 68, 68, 0.8)",
                      color: "white",
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "rgba(239, 68, 68, 1)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "rgba(239, 68, 68, 0.8)"}
                  >
                    Clear
                  </button>
                </div>
                <p className="text-xs mt-2 mb-0" style={{ color: "rgba(255,255,255,0.6)" }}>
                  Please sign above using your mouse or finger
                </p>
                {showSignatureError && (
                  <div className="mt-2 p-2 rounded" style={{ background: "rgba(239, 68, 68, 0.2)", border: "1px solid rgba(239, 68, 68, 0.4)" }} data-testid="error-signature">
                    <p className="text-sm m-0" style={{ color: "#ef4444" }}>Please sign the application before submitting</p>
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full bg-white text-[#192F56] py-4 rounded-lg font-semibold text-lg transition-all hover:bg-[#f8f9fa] hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed"
                style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.2)" }}
                disabled={isSubmitting}
                data-testid="button-submit-application"
              >
                {isSubmitting ? "Submitting application securely..." : "Submit Full Application"}
              </button>

              {updateMutation.isError && (
                <div className="mt-4 p-4 rounded-lg text-center" style={{ background: "rgba(239, 68, 68, 0.2)", border: "1px solid rgba(239, 68, 68, 0.4)" }} data-testid="error-message">
                  <p className="m-0" style={{ color: "#ef4444" }}>There was an error submitting your application. Please try again.</p>
                </div>
              )}
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper component for input fields
const InputField = forwardRef<HTMLInputElement, any>(({ label, required, ...props }, ref) => {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.9)" }}>
        {label}
      </label>
      <input
        {...props}
        ref={ref}
        required={required}
        className="w-full px-4 py-3 rounded-lg text-base font-inherit transition-all focus:outline-none"
        style={{
          border: "2px solid rgba(255,255,255,0.2)",
          background: "rgba(255,255,255,0.1)",
          color: "white",
        }}
        onFocus={(e) => {
          e.target.style.borderColor = "white";
          e.target.style.background = "rgba(255,255,255,0.15)";
        }}
        onBlur={(e) => {
          e.target.style.borderColor = "rgba(255,255,255,0.2)";
          e.target.style.background = "rgba(255,255,255,0.1)";
        }}
      />
    </div>
  );
});
InputField.displayName = "InputField";

// Helper component for select fields
const SelectField = forwardRef<HTMLSelectElement, any>(({ label, required, children, ...props }, ref) => {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.9)" }}>
        {label}
      </label>
      <select
        {...props}
        ref={ref}
        required={required}
        className="w-full px-4 py-3 rounded-lg text-base font-inherit transition-all focus:outline-none appearance-none bg-no-repeat bg-right pr-10"
        style={{
          border: "2px solid rgba(255,255,255,0.2)",
          background: "rgba(255,255,255,0.1) url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E\")",
          backgroundPosition: "right 1rem center",
          backgroundSize: "1em",
          color: "white",
        }}
        onFocus={(e) => {
          e.target.style.borderColor = "white";
          e.target.style.background = "rgba(255,255,255,0.15) url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E\")";
          e.target.style.backgroundPosition = "right 1rem center";
          e.target.style.backgroundSize = "1em";
        }}
        onBlur={(e) => {
          e.target.style.borderColor = "rgba(255,255,255,0.2)";
          e.target.style.background = "rgba(255,255,255,0.1) url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E\")";
          e.target.style.backgroundPosition = "right 1rem center";
          e.target.style.backgroundSize = "1em";
        }}
      >
        {children}
      </select>
    </div>
  );
});
SelectField.displayName = "SelectField";
