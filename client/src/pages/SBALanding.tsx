import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Loader2, CheckCircle, ArrowLeft, Shield, Clock, DollarSign, Building2, FileText, Users, Landmark } from "lucide-react";
import { trackIntakeFormSubmitted, trackFormStepCompleted, trackPageView } from "@/lib/analytics";
import { initUTMTracking, getStoredUTMParams } from "@/lib/utm";

const BUSINESS_AGE_OPTIONS = [
  "Less than 3 months",
  "3-5 months",
  "6-12 months",
  "1-2 years",
  "2-5 years",
  "More than 5 years",
];

const OWN_BUSINESS_OPTIONS = ["Yes", "No"];

const CREDIT_SCORE_OPTIONS = [
  "550 and below",
  "550 - 650",
  "650 - 750",
  "750+",
];

const INDUSTRY_OPTIONS = [
  "Automotive",
  "Construction",
  "Transportation",
  "Health Services",
  "Utilities and Home Services",
  "Hospitality",
  "Entertainment and Recreation",
  "Retail Stores",
  "Professional Services",
  "Restaurants & Food Services",
  "Other",
];

const FUNDING_PURPOSE_OPTIONS = [
  "Working Capital",
  "Equipment Purchase",
  "Inventory",
  "Expansion",
  "Payroll",
  "Marketing & Advertising",
  "Debt Consolidation",
  "Emergency Expenses",
  "Other",
];

interface QuizData {
  financingAmount: number;
  ownBusiness: string;
  businessAge: string;
  industry: string;
  monthlyRevenue: number;
  creditScore: string;
  fundingPurpose: string;
  fullName: string;
  businessName: string;
  email: string;
  phone: string;
  consentTransactional: boolean;
  consentMarketing: boolean;
  faxNumber: string;
}

function formatAmount(amount: number): string {
  if (amount >= 1000000) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
      notation: "compact",
      compactDisplay: "short",
    }).format(amount);
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

type SBAPhase = "landing" | "quiz";

export default function SBALanding() {
  const [, navigate] = useLocation();
  const [phase, setPhase] = useState<SBAPhase>("landing");
  const [currentStep, setCurrentStep] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [formError, setFormError] = useState("");
  const [ghlFormLoaded, setGhlFormLoaded] = useState(false);
  const [ghlFormSubmitted, setGhlFormSubmitted] = useState(false);

  const totalSteps = 8;
  const progress = (currentStep / totalSteps) * 100;

  const [quizData, setQuizData] = useState<QuizData>({
    financingAmount: 25000,
    ownBusiness: "",
    businessAge: "",
    industry: "",
    monthlyRevenue: 0,
    creditScore: "",
    fundingPurpose: "",
    fullName: "",
    businessName: "",
    email: "",
    phone: "",
    consentTransactional: false,
    consentMarketing: false,
    faxNumber: "",
  });

  useEffect(() => {
    trackPageView('/sba', 'SBA Landing Page');
    initUTMTracking();
  }, []);

  useEffect(() => {
    if (phase === "quiz" && currentStep === 1 && !ghlFormLoaded) {
      const existingScript = document.querySelector('script[src="https://link.msgsndr.com/js/form_embed.js"]');
      if (!existingScript) {
        const script = document.createElement('script');
        script.src = 'https://link.msgsndr.com/js/form_embed.js';
        script.async = true;
        script.onload = () => setGhlFormLoaded(true);
        document.body.appendChild(script);
      } else {
        setGhlFormLoaded(true);
      }
    }
  }, [phase, currentStep, ghlFormLoaded]);

  const submitMutation = useMutation({
    mutationFn: async (data: QuizData & { recaptchaToken?: string }) => {
      const referralPartnerId = localStorage.getItem("referralPartnerId");
      const utmParams = getStoredUTMParams();
      const response = await apiRequest("POST", "/api/applications", {
        email: data.email,
        fullName: data.fullName,
        phone: data.phone,
        businessName: data.businessName,
        requestedAmount: data.financingAmount.toString(),
        timeInBusiness: data.businessAge,
        industry: data.industry,
        monthlyRevenue: data.monthlyRevenue.toString(),
        averageMonthlyRevenue: data.monthlyRevenue.toString(),
        creditScore: data.creditScore,
        personalCreditScoreRange: data.creditScore,
        useOfFunds: data.fundingPurpose,
        isCompleted: true,
        recaptchaToken: data.recaptchaToken,
        faxNumber: data.faxNumber,
        ...(referralPartnerId && { referralPartnerId }),
        ...utmParams,
      });
      return response.json();
    },
    onSuccess: (data) => {
      trackIntakeFormSubmitted({
        requestedAmount: quizData.financingAmount.toString(),
        creditScore: quizData.creditScore,
        timeInBusiness: quizData.businessAge,
        monthlyRevenue: quizData.monthlyRevenue.toString(),
        industry: quizData.industry,
        useOfFunds: quizData.fundingPurpose,
      });
      if (data.id) {
        navigate(`/?applicationId=${data.id}`);
      } else {
        navigate("/");
      }
    },
    onError: (error: Error) => {
      setFormError(error.message || "There was an error submitting your information. Please try again.");
    },
  });

  useEffect(() => {
    const GHL_ORIGINS = ['https://api.leadconnectorhq.com', 'https://link.msgsndr.com', 'https://backend.leadconnectorhq.com'];

    const extractGhlFormData = (eventData: any): Record<string, any> | null => {
      if (Array.isArray(eventData) && eventData.length >= 3 && typeof eventData[2] === 'string') {
        const jsonStr = eventData[2];
        if (jsonStr.includes('customer_id') || jsonStr.includes('full_address') || jsonStr.includes('email')) {
          return JSON.parse(jsonStr);
        }
      }
      if (eventData && typeof eventData === 'object' && !Array.isArray(eventData)) {
        if (eventData.type === 'form-submit' || eventData.type === 'form-submit-success' || eventData.formId) {
          return eventData.data || eventData;
        }
      }
      return null;
    };

    const handleGhlMessage = (event: MessageEvent) => {
      if (ghlFormSubmitted) return;
      if (event.origin && !GHL_ORIGINS.some(o => event.origin.startsWith(o))) return;
      try {
        const formData = extractGhlFormData(event.data);
        if (!formData) return;
        console.log('[SBA GHL Form] Captured submission data:', formData);
        setGhlFormSubmitted(true);

        const capturedName = formData.full_name || formData.name || formData.first_name || '';
        const capturedEmail = formData.email || '';
        const capturedPhone = formData.phone || formData.full_phone || '';
        const capturedBusiness = formData.company_name || formData.business_name || '';

        setQuizData(prev => ({
          ...prev,
          fullName: capturedName || prev.fullName,
          email: capturedEmail || prev.email,
          phone: capturedPhone || prev.phone,
          businessName: capturedBusiness || prev.businessName,
          consentTransactional: true,
        }));

        setTimeout(() => goToStep(2), 1500);
      } catch (e) {
        // ignore
      }
    };

    window.addEventListener('message', handleGhlMessage);
    return () => window.removeEventListener('message', handleGhlMessage);
  }, [quizData, ghlFormSubmitted]);

  const goToStep = (num: number) => {
    if (num === currentStep) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentStep(num);
      setIsTransitioning(false);
    }, 250);
  };

  const nextStep = () => {
    if (currentStep < totalSteps) {
      const stepNames = ['Contact Info', 'Funding Purpose', 'Credit Score', 'Monthly Revenue', 'Industry', 'Business Age', 'Own Business', 'Financing Amount'];
      trackFormStepCompleted('sba_intake', currentStep, stepNames[currentStep - 1]);
      goToStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      goToStep(currentStep - 1);
    }
  };

  const handleRadioSelect = (field: keyof QuizData, value: string) => {
    setQuizData((prev) => ({ ...prev, [field]: value }));
    setTimeout(() => nextStep(), 400);
  };

  const handleFinalSubmit = () => {
    submitMutation.mutate(quizData);
  };

  const startQuiz = () => {
    setPhase("quiz");
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (phase === "quiz") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "linear-gradient(to bottom, #192F56 0%, #19112D 100%)" }}>
        <div
          className="w-full max-w-[600px] p-8 md:p-12 rounded-2xl relative overflow-hidden"
          style={{
            background: "linear-gradient(to bottom, #192F56 0%, #19112D 100%)",
            boxShadow: "0 12px 30px rgba(25, 47, 86, 0.3), 0 4px 15px rgba(0, 0, 0, 0.2)",
            minHeight: "500px",
          }}
          data-testid="sba-quiz-container"
        >
          {!ghlFormSubmitted || currentStep > 1 ? (
            <div className="w-full h-1 bg-white/20 rounded-full mb-8">
              <div
                className="h-full bg-white rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
                data-testid="sba-progress-bar"
              />
            </div>
          ) : null}

          {/* Step 1: GHL Contact Form */}
          <div
            className={`transition-all duration-300 ${currentStep === 1 ? "block opacity-100" : "hidden opacity-0"} ${isTransitioning ? "opacity-0" : ""}`}
            data-testid="sba-step-1"
          >
            <div className="text-center">
              <h3 className="text-white text-xl md:text-2xl font-semibold mb-2">
                Let's Get Started
              </h3>
              <p className="text-white/70 mb-4 text-sm md:text-base">
                Fill out your contact information below to begin your SBA funding qualification.
              </p>

              <div className="w-full mx-auto relative" style={{ maxWidth: '650px' }}>
                <div className="relative" data-testid="sba-ghl-form-container" style={{ display: ghlFormSubmitted ? 'none' : 'block' }}>
                  <div className="rounded-lg overflow-hidden">
                    <iframe
                      src="https://api.leadconnectorhq.com/widget/form/9lPCXmZ6jBCV2lHiRvM0"
                      style={{ width: '100%', height: '700px', border: 'none', background: 'transparent' }}
                      id="sba-inline-9lPCXmZ6jBCV2lHiRvM0"
                      data-layout="{'id':'INLINE'}"
                      data-trigger-type="alwaysShow"
                      data-trigger-value=""
                      data-activation-type="alwaysActivated"
                      data-activation-value=""
                      data-deactivation-type="neverDeactivate"
                      data-deactivation-value=""
                      data-form-name="Initial Contact Form"
                      data-height="700"
                      data-layout-iframe-id="sba-inline-9lPCXmZ6jBCV2lHiRvM0"
                      data-form-id="9lPCXmZ6jBCV2lHiRvM0"
                      title="Initial Contact Form"
                      allow="clipboard-write"
                      data-testid="sba-ghl-form-iframe"
                    />
                  </div>
                  <p className="text-white/50 text-[10px] leading-relaxed mt-3">
                    By submitting, I agree to the{" "}
                    <a href="https://www.todaycapitalgroup.com/terms-of-service" target="_blank" rel="noopener noreferrer" className="underline text-white/70 hover:text-white">
                      Terms of Service
                    </a>{" "}
                    and{" "}
                    <a href="https://www.todaycapitalgroup.com/privacy-policy" target="_blank" rel="noopener noreferrer" className="underline text-white/70 hover:text-white">
                      Privacy Policy
                    </a>.
                  </p>
                </div>

                {ghlFormSubmitted && (
                  <div className="py-8" data-testid="sba-ghl-submitted">
                    <div className="flex flex-col items-center gap-4">
                      <CheckCircle className="w-10 h-10 text-green-400" />
                      <p className="text-white text-lg font-medium">Great! Now let's qualify your business...</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Step 2: Funding Purpose (was Q7 in original) */}
          <div
            className={`transition-all duration-300 ${currentStep === 2 ? "block opacity-100" : "hidden opacity-0"} ${isTransitioning ? "opacity-0" : ""}`}
            data-testid="sba-step-2"
          >
            <div className="text-center">
              <h3 className="text-white text-2xl md:text-3xl font-semibold mb-8">
                How do you plan to use the funds?
              </h3>
              <div className="flex flex-col gap-3 max-w-md mx-auto text-left">
                {FUNDING_PURPOSE_OPTIONS.map((option, idx) => (
                  <label
                    key={option}
                    className={`flex items-center cursor-pointer p-4 rounded-lg transition-all duration-200 ${
                      quizData.fundingPurpose === option ? "bg-white/20" : "bg-transparent hover:bg-white/10"
                    }`}
                    data-testid={`sba-label-funding-purpose-${idx}`}
                  >
                    <input
                      type="radio"
                      name="sbaFundingPurpose"
                      value={option}
                      checked={quizData.fundingPurpose === option}
                      onChange={() => handleRadioSelect("fundingPurpose", option)}
                      className="w-5 h-5 mr-4 appearance-none border-2 border-white rounded-full grid place-content-center cursor-pointer
                        before:content-[''] before:w-2.5 before:h-2.5 before:rounded-full before:scale-0 before:transition-transform before:bg-white
                        checked:before:scale-100"
                      data-testid={`sba-radio-funding-purpose-${idx}`}
                    />
                    <span className="text-white text-base md:text-lg">{option}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Step 3: Credit Score (was Q6) */}
          <div
            className={`transition-all duration-300 ${currentStep === 3 ? "block opacity-100" : "hidden opacity-0"} ${isTransitioning ? "opacity-0" : ""}`}
            data-testid="sba-step-3"
          >
            <div className="text-center">
              <button
                onClick={prevStep}
                className="absolute top-8 left-8 text-white/70 hover:text-white flex items-center gap-2 transition-colors"
                data-testid="sba-back-3"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back</span>
              </button>
              <h3 className="text-white text-2xl md:text-3xl font-semibold mb-2">
                Personal Credit Score?
              </h3>
              <p className="text-white/70 mb-8">(Provide your best estimate)</p>
              <div className="flex flex-col gap-3 max-w-md mx-auto text-left">
                {CREDIT_SCORE_OPTIONS.map((option, idx) => (
                  <label
                    key={option}
                    className={`flex items-center cursor-pointer p-4 rounded-lg transition-all duration-200 ${
                      quizData.creditScore === option ? "bg-white/20" : "bg-transparent hover:bg-white/10"
                    }`}
                    data-testid={`sba-label-credit-${idx}`}
                  >
                    <input
                      type="radio"
                      name="sbaCreditScore"
                      value={option}
                      checked={quizData.creditScore === option}
                      onChange={() => handleRadioSelect("creditScore", option)}
                      className="w-5 h-5 mr-4 appearance-none border-2 border-white rounded-full grid place-content-center cursor-pointer
                        before:content-[''] before:w-2.5 before:h-2.5 before:rounded-full before:scale-0 before:transition-transform before:bg-white
                        checked:before:scale-100"
                      data-testid={`sba-radio-credit-${idx}`}
                    />
                    <span className="text-white text-base md:text-lg">{option}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Step 4: Monthly Revenue (was Q5) */}
          <div
            className={`transition-all duration-300 ${currentStep === 4 ? "block opacity-100" : "hidden opacity-0"} ${isTransitioning ? "opacity-0" : ""}`}
            data-testid="sba-step-4"
          >
            <div className="text-center">
              <button
                onClick={prevStep}
                className="absolute top-8 left-8 text-white/70 hover:text-white flex items-center gap-2 transition-colors"
                data-testid="sba-back-4"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back</span>
              </button>
              <h3 className="text-white text-2xl md:text-3xl font-semibold mb-2">
                Gross Monthly Revenue?
              </h3>
              <p className="text-white/70 mb-8">(Enter your average monthly revenue)</p>
              <div className="flex flex-col gap-4 max-w-md mx-auto">
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white text-xl font-medium">$</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={quizData.monthlyRevenue > 0 ? quizData.monthlyRevenue.toLocaleString() : ""}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9]/g, "");
                      const numValue = value ? parseInt(value, 10) : 0;
                      setQuizData((prev) => ({ ...prev, monthlyRevenue: numValue }));
                    }}
                    placeholder="25,000"
                    className="w-full pl-10 pr-4 py-4 text-xl text-white bg-white/10 border-2 border-white/30 rounded-lg focus:border-white focus:outline-none placeholder:text-white/40"
                    data-testid="sba-input-monthly-revenue"
                  />
                </div>
                <button
                  onClick={nextStep}
                  disabled={quizData.monthlyRevenue <= 0}
                  className={`w-full py-4 rounded-lg font-semibold text-lg transition-all duration-200 ${
                    quizData.monthlyRevenue > 0
                      ? "bg-white text-[#0a2540] hover:bg-white/90"
                      : "bg-white/30 text-white/50 cursor-not-allowed"
                  }`}
                  data-testid="sba-button-continue-revenue"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>

          {/* Step 5: Industry (was Q4) */}
          <div
            className={`transition-all duration-300 ${currentStep === 5 ? "block opacity-100" : "hidden opacity-0"} ${isTransitioning ? "opacity-0" : ""}`}
            data-testid="sba-step-5"
          >
            <div className="text-center">
              <button
                onClick={prevStep}
                className="absolute top-8 left-8 text-white/70 hover:text-white flex items-center gap-2 transition-colors"
                data-testid="sba-back-5"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back</span>
              </button>
              <h3 className="text-white text-2xl md:text-3xl font-semibold mb-8">
                What industry is your business in?
              </h3>
              <div className="flex flex-col gap-3 max-w-md mx-auto text-left max-h-[400px] overflow-y-auto pr-2">
                {INDUSTRY_OPTIONS.map((option, idx) => (
                  <label
                    key={option}
                    className={`flex items-center cursor-pointer p-4 rounded-lg transition-all duration-200 ${
                      quizData.industry === option ? "bg-white/20" : "bg-transparent hover:bg-white/10"
                    }`}
                    data-testid={`sba-label-industry-${idx}`}
                  >
                    <input
                      type="radio"
                      name="sbaIndustry"
                      value={option}
                      checked={quizData.industry === option}
                      onChange={() => handleRadioSelect("industry", option)}
                      className="w-5 h-5 mr-4 appearance-none border-2 border-white rounded-full grid place-content-center cursor-pointer
                        before:content-[''] before:w-2.5 before:h-2.5 before:rounded-full before:scale-0 before:transition-transform before:bg-white
                        checked:before:scale-100"
                      data-testid={`sba-radio-industry-${idx}`}
                    />
                    <span className="text-white text-base md:text-lg">{option}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Step 6: Business Age (was Q3) */}
          <div
            className={`transition-all duration-300 ${currentStep === 6 ? "block opacity-100" : "hidden opacity-0"} ${isTransitioning ? "opacity-0" : ""}`}
            data-testid="sba-step-6"
          >
            <div className="text-center">
              <button
                onClick={prevStep}
                className="absolute top-8 left-8 text-white/70 hover:text-white flex items-center gap-2 transition-colors"
                data-testid="sba-back-6"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back</span>
              </button>
              <h3 className="text-white text-2xl md:text-3xl font-semibold mb-8">
                How long has your business been operating?
              </h3>
              <div className="flex flex-col gap-3 max-w-md mx-auto text-left">
                {BUSINESS_AGE_OPTIONS.map((option, idx) => (
                  <label
                    key={option}
                    className={`flex items-center cursor-pointer p-4 rounded-lg transition-all duration-200 ${
                      quizData.businessAge === option ? "bg-white/20" : "bg-transparent hover:bg-white/10"
                    }`}
                    data-testid={`sba-label-business-age-${idx}`}
                  >
                    <input
                      type="radio"
                      name="sbaBusinessAge"
                      value={option}
                      checked={quizData.businessAge === option}
                      onChange={() => handleRadioSelect("businessAge", option)}
                      className="w-5 h-5 mr-4 appearance-none border-2 border-white rounded-full grid place-content-center cursor-pointer
                        before:content-[''] before:w-2.5 before:h-2.5 before:rounded-full before:scale-0 before:transition-transform before:bg-white
                        checked:before:scale-100"
                      data-testid={`sba-radio-business-age-${idx}`}
                    />
                    <span className="text-white text-base md:text-lg">{option}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Step 7: Own Business (was Q2) */}
          <div
            className={`transition-all duration-300 ${currentStep === 7 ? "block opacity-100" : "hidden opacity-0"} ${isTransitioning ? "opacity-0" : ""}`}
            data-testid="sba-step-7"
          >
            <div className="text-center">
              <button
                onClick={prevStep}
                className="absolute top-8 left-8 text-white/70 hover:text-white flex items-center gap-2 transition-colors"
                data-testid="sba-back-7"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back</span>
              </button>
              <h3 className="text-white text-2xl md:text-3xl font-semibold mb-8">
                Do you own a business?
              </h3>
              <div className="flex flex-col gap-3 max-w-md mx-auto text-left">
                {OWN_BUSINESS_OPTIONS.map((option, idx) => (
                  <label
                    key={option}
                    className={`flex items-center cursor-pointer p-4 rounded-lg transition-all duration-200 ${
                      quizData.ownBusiness === option ? "bg-white/20" : "bg-transparent hover:bg-white/10"
                    }`}
                    data-testid={`sba-label-own-business-${idx}`}
                  >
                    <input
                      type="radio"
                      name="sbaOwnBusiness"
                      value={option}
                      checked={quizData.ownBusiness === option}
                      onChange={() => handleRadioSelect("ownBusiness", option)}
                      className="w-5 h-5 mr-4 appearance-none border-2 border-white rounded-full grid place-content-center cursor-pointer
                        before:content-[''] before:w-2.5 before:h-2.5 before:rounded-full before:scale-0 before:transition-transform before:bg-white
                        checked:before:scale-100"
                      data-testid={`sba-radio-own-business-${idx}`}
                    />
                    <span className="text-white text-base md:text-lg">{option}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Step 8: Financing Amount (was Q1) - Final step with submit */}
          <div
            className={`transition-all duration-300 ${currentStep === 8 ? "block opacity-100" : "hidden opacity-0"} ${isTransitioning ? "opacity-0" : ""}`}
            data-testid="sba-step-8"
          >
            <div className="text-center">
              <button
                onClick={prevStep}
                className="absolute top-8 left-8 text-white/70 hover:text-white flex items-center gap-2 transition-colors"
                data-testid="sba-back-8"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back</span>
              </button>
              <h3 className="text-white text-2xl md:text-3xl font-semibold mb-4 leading-tight">
                How much are you looking to finance?
              </h3>
              <p className="text-white/70 mb-8 text-base md:text-lg">
                Drag the slider to select your desired financing amount.
              </p>

              <div className="max-w-md mx-auto px-4">
                <div className="text-white text-4xl md:text-5xl font-bold text-center mb-8" data-testid="sba-amount-display">
                  {formatAmount(quizData.financingAmount)}
                </div>

                <div className="relative">
                  <input
                    type="range"
                    min="5000"
                    max="1000000"
                    step="1000"
                    value={quizData.financingAmount}
                    onChange={(e) => setQuizData((prev) => ({ ...prev, financingAmount: parseInt(e.target.value) }))}
                    className="financing-slider w-full h-3 rounded-full appearance-none cursor-pointer mb-3"
                    style={{
                      background: `linear-gradient(to right, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.9) ${((quizData.financingAmount - 5000) / (1000000 - 5000)) * 100}%, rgba(255,255,255,0.2) ${((quizData.financingAmount - 5000) / (1000000 - 5000)) * 100}%, rgba(255,255,255,0.2) 100%)`,
                    }}
                    data-testid="sba-financing-slider"
                  />
                </div>

                <div className="flex justify-between text-white/60 text-sm mb-8">
                  <span>$5K</span>
                  <span>$1M+</span>
                </div>

                <button
                  onClick={handleFinalSubmit}
                  disabled={submitMutation.isPending}
                  className="w-full bg-white text-[#192F56] py-4 px-8 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50"
                  data-testid="sba-button-submit"
                >
                  {submitMutation.isPending ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Processing...
                    </span>
                  ) : (
                    "Submit & Continue to Application"
                  )}
                </button>

                {formError && (
                  <div className="p-3 bg-red-500/20 border-2 border-red-500/50 rounded-lg text-center mt-4">
                    <p className="text-red-400 font-medium text-sm">{formError}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-white/10">
            <p className="text-white/50 text-xs text-center">
              SBA loans provided through our network of approved SBA lenders. All applications subject to lender approval.
            </p>
          </div>
        </div>

        <style>{`
          .financing-slider {
            -webkit-appearance: none;
            appearance: none;
            outline: none;
            transition: background 0.1s ease;
          }
          .financing-slider::-webkit-slider-runnable-track {
            height: 12px;
            border-radius: 9999px;
          }
          .financing-slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: white;
            cursor: grab;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3), 0 0 0 4px rgba(255,255,255,0.2);
            margin-top: -10px;
            transition: transform 0.15s ease, box-shadow 0.15s ease;
          }
          .financing-slider::-webkit-slider-thumb:hover {
            transform: scale(1.1);
            box-shadow: 0 6px 16px rgba(0,0,0,0.4), 0 0 0 6px rgba(255,255,255,0.3);
          }
          .financing-slider::-webkit-slider-thumb:active {
            cursor: grabbing;
            transform: scale(1.05);
          }
          .financing-slider::-moz-range-track {
            height: 12px;
            border-radius: 9999px;
            background: transparent;
          }
          .financing-slider::-moz-range-thumb {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: white;
            cursor: grab;
            border: none;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3), 0 0 0 4px rgba(255,255,255,0.2);
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", backgroundColor: '#f5f5f7', color: '#1d1d1f', lineHeight: 1.6 }}>
      {/* Header */}
      <header style={{ backgroundColor: '#0a0f2c', padding: '20px 0', borderBottom: '1px solid #1a2650', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <img
            src="https://cdn.prod.website-files.com/6864b4e14db4a4b6864c7968/686c11dae8ddeadf0fc2ffa7_Group%2017.svg"
            alt="Today Capital Group"
            style={{ height: '40px', width: 'auto' }}
            data-testid="sba-img-logo"
          />
          <span style={{ color: '#e0e0e0', fontSize: '14px', fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase' }}>SBA Loans</span>
        </div>
      </header>

      {/* Hero Section */}
      <section style={{ background: 'linear-gradient(135deg, #0a0f2c 0%, #1a2650 50%, #192F56 100%)', padding: '80px 20px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'radial-gradient(circle at 30% 50%, rgba(91, 77, 143, 0.15) 0%, transparent 60%)' }} />
        <div style={{ maxWidth: '1000px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(255,255,255,0.1)', padding: '8px 20px', borderRadius: '50px', marginBottom: '24px', border: '1px solid rgba(255,255,255,0.15)' }}>
            <Landmark size={16} color="#ffffff" />
            <span style={{ color: '#ffffff', fontSize: '14px', fontWeight: 500 }}>SBA-Backed Financing</span>
          </div>

          <h1 style={{ fontSize: 'clamp(36px, 5vw, 56px)', fontWeight: 600, color: '#FFFFFF', marginBottom: '20px', letterSpacing: '-2px', lineHeight: 1.1 }}>
            SBA Loans Built for<br />
            <span style={{ fontStyle: 'italic', fontWeight: 300 }}>Growing Businesses</span>
          </h1>

          <p style={{ fontSize: 'clamp(16px, 2vw, 20px)', color: '#e0e0e0', marginBottom: '40px', maxWidth: '700px', marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }} data-testid="sba-text-hero-subtitle">
            Access government-backed loans with competitive rates and longer terms. We connect you with SBA-approved lenders to help your business grow with confidence.
          </p>

          <button
            onClick={startQuiz}
            style={{
              display: 'inline-block', padding: '18px 48px', backgroundColor: '#FFFFFF', color: '#0a0f2c',
              textDecoration: 'none', fontWeight: 600, borderRadius: '50px', fontSize: '16px', border: 'none',
              cursor: 'pointer', boxShadow: '0 4px 20px rgba(255,255,255,0.2)', transition: 'transform 0.3s ease, box-shadow 0.3s ease'
            }}
            data-testid="sba-button-get-started"
          >
            Check Your Eligibility
          </button>

          {/* Stats */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '60px', marginTop: '50px', flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: 'clamp(28px, 3vw, 42px)', fontWeight: 700, color: '#FFFFFF', display: 'block', marginBottom: '8px' }} data-testid="sba-text-stat-rate">6-10%</span>
              <span style={{ fontSize: '13px', color: '#b0b0b0', textTransform: 'uppercase', letterSpacing: '1px' }}>Interest Rates</span>
            </div>
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: 'clamp(28px, 3vw, 42px)', fontWeight: 700, color: '#FFFFFF', display: 'block', marginBottom: '8px' }} data-testid="sba-text-stat-term">Up to 25yrs</span>
              <span style={{ fontSize: '13px', color: '#b0b0b0', textTransform: 'uppercase', letterSpacing: '1px' }}>Loan Terms</span>
            </div>
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: 'clamp(28px, 3vw, 42px)', fontWeight: 700, color: '#FFFFFF', display: 'block', marginBottom: '8px' }} data-testid="sba-text-stat-amount">Up to $5M</span>
              <span style={{ fontSize: '13px', color: '#b0b0b0', textTransform: 'uppercase', letterSpacing: '1px' }}>Loan Amounts</span>
            </div>
          </div>
        </div>
      </section>

      {/* What is an SBA Loan */}
      <section style={{ backgroundColor: '#ffffff', padding: '80px 20px' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', color: '#1d1d1f', marginBottom: '16px', fontWeight: 600 }}>What is an SBA Loan?</h2>
            <p style={{ fontSize: '18px', color: '#6e6e73', maxWidth: '700px', margin: '0 auto', lineHeight: 1.7 }}>
              SBA loans are partially guaranteed by the U.S. Small Business Administration, allowing lenders to offer favorable terms to small businesses that might not qualify for conventional financing.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '32px' }}>
            <div style={{ backgroundColor: '#f5f5f7', padding: '32px 28px', borderRadius: '16px', textAlign: 'center' }} data-testid="sba-card-lower-rates">
              <div style={{ marginBottom: '16px' }}>
                <DollarSign size={40} color="#5b4d8f" />
              </div>
              <h3 style={{ fontSize: '20px', color: '#1d1d1f', marginBottom: '10px', fontWeight: 600 }}>Lower Interest Rates</h3>
              <p style={{ fontSize: '15px', color: '#6e6e73', lineHeight: 1.6 }}>
                Government backing means lenders can offer rates significantly below conventional business loans.
              </p>
            </div>

            <div style={{ backgroundColor: '#f5f5f7', padding: '32px 28px', borderRadius: '16px', textAlign: 'center' }} data-testid="sba-card-longer-terms">
              <div style={{ marginBottom: '16px' }}>
                <Clock size={40} color="#5b4d8f" />
              </div>
              <h3 style={{ fontSize: '20px', color: '#1d1d1f', marginBottom: '10px', fontWeight: 600 }}>Longer Repayment Terms</h3>
              <p style={{ fontSize: '15px', color: '#6e6e73', lineHeight: 1.6 }}>
                Terms up to 25 years mean lower monthly payments and better cash flow for your business.
              </p>
            </div>

            <div style={{ backgroundColor: '#f5f5f7', padding: '32px 28px', borderRadius: '16px', textAlign: 'center' }} data-testid="sba-card-larger-amounts">
              <div style={{ marginBottom: '16px' }}>
                <Building2 size={40} color="#5b4d8f" />
              </div>
              <h3 style={{ fontSize: '20px', color: '#1d1d1f', marginBottom: '10px', fontWeight: 600 }}>Larger Loan Amounts</h3>
              <p style={{ fontSize: '15px', color: '#6e6e73', lineHeight: 1.6 }}>
                Access up to $5 million in funding for expansion, equipment, real estate, and working capital.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SBA Loan Types */}
      <section style={{ backgroundColor: '#f5f5f7', padding: '80px 20px' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', color: '#1d1d1f', marginBottom: '16px', fontWeight: 600 }}>SBA Loan Programs</h2>
            <p style={{ fontSize: '18px', color: '#6e6e73', maxWidth: '600px', margin: '0 auto' }}>
              We help you find the right SBA program for your specific business needs.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
            <div style={{ backgroundColor: '#ffffff', padding: '32px 28px', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }} data-testid="sba-card-7a">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: 'rgba(91,77,143,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileText size={20} color="#5b4d8f" />
                </div>
                <h3 style={{ fontSize: '20px', color: '#1d1d1f', fontWeight: 600 }}>SBA 7(a) Loan</h3>
              </div>
              <p style={{ fontSize: '15px', color: '#6e6e73', lineHeight: 1.6, marginBottom: '12px' }}>
                The most common SBA loan, ideal for working capital, equipment, and business expansion. Up to $5M.
              </p>
              <p style={{ fontSize: '13px', color: '#5b4d8f', fontWeight: 500 }}>Terms: 7-25 years</p>
            </div>

            <div style={{ backgroundColor: '#ffffff', padding: '32px 28px', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }} data-testid="sba-card-504">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: 'rgba(91,77,143,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Building2 size={20} color="#5b4d8f" />
                </div>
                <h3 style={{ fontSize: '20px', color: '#1d1d1f', fontWeight: 600 }}>SBA 504 Loan</h3>
              </div>
              <p style={{ fontSize: '15px', color: '#6e6e73', lineHeight: 1.6, marginBottom: '12px' }}>
                Designed for major fixed asset purchases like real estate and large equipment. Up to $5.5M.
              </p>
              <p style={{ fontSize: '13px', color: '#5b4d8f', fontWeight: 500 }}>Terms: 10-25 years</p>
            </div>

            <div style={{ backgroundColor: '#ffffff', padding: '32px 28px', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }} data-testid="sba-card-microloan">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: 'rgba(91,77,143,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Users size={20} color="#5b4d8f" />
                </div>
                <h3 style={{ fontSize: '20px', color: '#1d1d1f', fontWeight: 600 }}>SBA Microloan</h3>
              </div>
              <p style={{ fontSize: '15px', color: '#6e6e73', lineHeight: 1.6, marginBottom: '12px' }}>
                Smaller loans up to $50K for startups and growing businesses. Ideal for inventory and supplies.
              </p>
              <p style={{ fontSize: '13px', color: '#5b4d8f', fontWeight: 500 }}>Terms: Up to 6 years</p>
            </div>
          </div>
        </div>
      </section>

      {/* Eligibility Requirements */}
      <section style={{ backgroundColor: '#ffffff', padding: '80px 20px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', color: '#1d1d1f', marginBottom: '16px', fontWeight: 600 }}>Basic Eligibility</h2>
            <p style={{ fontSize: '18px', color: '#6e6e73' }}>
              See if your business may qualify for SBA financing.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {[
              "Operate as a for-profit business in the U.S.",
              "Meet SBA size standards for your industry",
              "Have invested equity (time or money) in the business",
              "Have exhausted other financing options",
              "Good personal credit score (typically 650+)",
              "Demonstrate ability to repay the loan",
            ].map((req, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '16px', backgroundColor: '#f5f5f7', borderRadius: '12px' }} data-testid={`sba-eligibility-${idx}`}>
                <CheckCircle size={20} color="#5b4d8f" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span style={{ fontSize: '15px', color: '#1d1d1f', lineHeight: 1.5 }}>{req}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section style={{ background: 'linear-gradient(135deg, #0a0f2c 0%, #1a2650 100%)', padding: '80px 20px', textAlign: 'center' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 38px)', color: '#ffffff', marginBottom: '16px', fontWeight: 600 }}>
            Ready to Get Started?
          </h2>
          <p style={{ fontSize: '18px', color: '#e0e0e0', marginBottom: '32px', lineHeight: 1.6 }}>
            Check your eligibility in just a few minutes. Our team will guide you through the entire SBA loan process.
          </p>
          <button
            onClick={startQuiz}
            style={{
              display: 'inline-block', padding: '18px 48px', backgroundColor: '#FFFFFF', color: '#0a0f2c',
              textDecoration: 'none', fontWeight: 600, borderRadius: '50px', fontSize: '16px', border: 'none',
              cursor: 'pointer', boxShadow: '0 4px 20px rgba(255,255,255,0.2)'
            }}
            data-testid="sba-button-cta-bottom"
          >
            Start Your Application
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ backgroundColor: '#0a0f2c', padding: '40px 20px', borderTop: '1px solid #1a2650' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', textAlign: 'center' }}>
          <img
            src="https://cdn.prod.website-files.com/6864b4e14db4a4b6864c7968/686c11dae8ddeadf0fc2ffa7_Group%2017.svg"
            alt="Today Capital Group"
            style={{ height: '32px', width: 'auto', marginBottom: '16px' }}
          />
          <p style={{ fontSize: '13px', color: '#6e6e73', maxWidth: '600px', margin: '0 auto', lineHeight: 1.6 }}>
            Today Capital Group connects businesses with SBA-approved lenders. We are not a direct lender. All loans are subject to lender approval and SBA guidelines.
          </p>
          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '24px' }}>
            <a href="https://www.todaycapitalgroup.com/terms-of-service" target="_blank" rel="noopener noreferrer" style={{ fontSize: '13px', color: '#6e6e73', textDecoration: 'none' }}>Terms of Service</a>
            <a href="https://www.todaycapitalgroup.com/privacy-policy" target="_blank" rel="noopener noreferrer" style={{ fontSize: '13px', color: '#6e6e73', textDecoration: 'none' }}>Privacy Policy</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
