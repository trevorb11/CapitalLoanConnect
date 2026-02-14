import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Loader2, CheckCircle, ArrowLeft, Shield, Clock, DollarSign, Building2, FileText, Users, Landmark, ArrowRight, Star, TrendingUp, Briefcase } from "lucide-react";
import { trackIntakeFormSubmitted, trackFormStepCompleted, trackPageView } from "@/lib/analytics";
import { initUTMTracking, getStoredUTMParams } from "@/lib/utm";

import sbaRestaurant from "../assets/images/sba-restaurant.jpg";
import sbaConstruction from "../assets/images/sba-construction.jpg";
import sbaMedical from "../assets/images/sba-medical.jpg";
import sbaRetail from "../assets/images/sba-retail.jpg";
import sbaTrucking from "../assets/images/sba-trucking.jpg";
import sbaFranchise from "../assets/images/sba-franchise.jpg";

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

export default function SBALanding() {
  const [, navigate] = useLocation();
  const [showQuiz, setShowQuiz] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [formError, setFormError] = useState("");
  const [ghlFormLoaded, setGhlFormLoaded] = useState(false);
  const [ghlFormSubmitted, setGhlFormSubmitted] = useState(false);

  const totalSteps = 7;
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
  }, []);

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
      try {
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
      } catch {
        return null;
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

        setTimeout(() => {
          setShowQuiz(true);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 1500);
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
      const stepNames = ['Funding Purpose', 'Credit Score', 'Monthly Revenue', 'Industry', 'Business Age', 'Own Business', 'Financing Amount'];
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

  const INDUSTRY_CARDS = [
    { name: "Restaurants & Food Services", img: sbaRestaurant, keywords: "SBA loan for restaurant, food service business financing, restaurant expansion loan" },
    { name: "Construction & Contractors", img: sbaConstruction, keywords: "SBA loan for construction business, contractor equipment financing, construction working capital" },
    { name: "Medical & Dental Practices", img: sbaMedical, keywords: "SBA loan for medical practice, dental practice financing, healthcare business loan" },
    { name: "Retail & E-Commerce", img: sbaRetail, keywords: "SBA loan for retail store, small business retail financing, inventory funding" },
    { name: "Trucking & Transportation", img: sbaTrucking, keywords: "SBA loan for trucking company, transportation business financing, fleet expansion loan" },
    { name: "Franchise & Multi-Location", img: sbaFranchise, keywords: "SBA loan for franchise, franchise startup loan, multi-location business financing" },
  ];

  if (showQuiz) {
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
          <div className="w-full h-1 bg-white/20 rounded-full mb-8">
            <div
              className="h-full bg-white rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
              data-testid="sba-progress-bar"
            />
          </div>

          {/* Step 1: Funding Purpose */}
          <div
            className={`transition-all duration-300 ${currentStep === 1 ? "block opacity-100" : "hidden opacity-0"} ${isTransitioning ? "opacity-0" : ""}`}
            data-testid="sba-step-1"
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

          {/* Step 2: Credit Score */}
          <div
            className={`transition-all duration-300 ${currentStep === 2 ? "block opacity-100" : "hidden opacity-0"} ${isTransitioning ? "opacity-0" : ""}`}
            data-testid="sba-step-2"
          >
            <div className="text-center">
              <button
                onClick={prevStep}
                className="absolute top-8 left-8 text-white/70 hover:text-white flex items-center gap-2 transition-colors"
                data-testid="sba-back-2"
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

          {/* Step 3: Monthly Revenue */}
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

          {/* Step 4: Industry */}
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

          {/* Step 5: Business Age */}
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

          {/* Step 6: Own Business */}
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

          {/* Step 7: Financing Amount - Final step with submit */}
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
              <h3 className="text-white text-2xl md:text-3xl font-semibold mb-4 leading-tight">
                How much SBA funding do you need?
              </h3>
              <p className="text-white/70 mb-8 text-base md:text-lg">
                Drag the slider to select your desired SBA loan amount.
              </p>

              <div className="max-w-md mx-auto px-4">
                <div className="text-white text-4xl md:text-5xl font-bold text-center mb-8" data-testid="sba-amount-display">
                  {formatAmount(quizData.financingAmount)}
                </div>

                <div className="relative">
                  <input
                    type="range"
                    min="5000"
                    max="5000000"
                    step="5000"
                    value={quizData.financingAmount}
                    onChange={(e) => setQuizData((prev) => ({ ...prev, financingAmount: parseInt(e.target.value) }))}
                    className="financing-slider w-full h-3 rounded-full appearance-none cursor-pointer mb-3"
                    style={{
                      background: `linear-gradient(to right, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.9) ${((quizData.financingAmount - 5000) / (5000000 - 5000)) * 100}%, rgba(255,255,255,0.2) ${((quizData.financingAmount - 5000) / (5000000 - 5000)) * 100}%, rgba(255,255,255,0.2) 100%)`,
                    }}
                    data-testid="sba-financing-slider"
                  />
                </div>

                <div className="flex justify-between text-white/60 text-sm mb-8">
                  <span>$5K</span>
                  <span>$5M</span>
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
                    "Submit & Continue to Full Application"
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
              SBA loans provided through our network of 50+ SBA preferred lenders. All applications subject to lender approval and SBA guidelines.
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
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <img
            src="https://cdn.prod.website-files.com/6864b4e14db4a4b6864c7968/686c11dae8ddeadf0fc2ffa7_Group%2017.svg"
            alt="Today Capital Group - SBA Loan Broker"
            style={{ height: '40px', width: 'auto' }}
            data-testid="sba-img-logo"
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ color: '#e0e0e0', fontSize: '14px', fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase' }}>SBA Loan Experts</span>
          </div>
        </div>
      </header>

      {/* Hero Section with Embedded GHL Form */}
      <section style={{ background: 'linear-gradient(135deg, #0a0f2c 0%, #1a2650 50%, #192F56 100%)', padding: '60px 20px 80px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'radial-gradient(circle at 30% 50%, rgba(91, 77, 143, 0.15) 0%, transparent 60%)' }} />
        <div style={{ maxWidth: '1100px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '40px', alignItems: 'start' }} className="md:!grid-cols-2">
            {/* Left: Hero Content */}
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(255,255,255,0.1)', padding: '8px 20px', borderRadius: '50px', marginBottom: '24px', border: '1px solid rgba(255,255,255,0.15)' }}>
                <Shield size={16} color="#ffffff" />
                <span style={{ color: '#ffffff', fontSize: '14px', fontWeight: 500 }}>SBA Preferred Lender Network</span>
              </div>

              <h1 style={{ fontSize: 'clamp(32px, 4.5vw, 52px)', fontWeight: 700, color: '#FFFFFF', marginBottom: '20px', letterSpacing: '-1.5px', lineHeight: 1.1 }} data-testid="sba-text-hero-title">
                Get Matched With the SBA Lender Most Likely to Approve Your Business
              </h1>

              <p style={{ fontSize: 'clamp(16px, 2vw, 19px)', color: '#d0d0d0', marginBottom: '32px', lineHeight: 1.7 }} data-testid="sba-text-hero-subtitle">
                One simple application connects you with 50+ SBA preferred lenders. No bank visits required. Get pre-qualified for an SBA loan today with fast decisions and less hassle.
              </p>

              {/* Trust Bar */}
              <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginBottom: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} data-testid="sba-trust-no-fee">
                  <CheckCircle size={18} color="#4ade80" />
                  <span style={{ color: '#d0d0d0', fontSize: '14px' }}>No Upfront Fees</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} data-testid="sba-trust-pre-qual">
                  <CheckCircle size={18} color="#4ade80" />
                  <span style={{ color: '#d0d0d0', fontSize: '14px' }}>Free Pre-Qualification</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} data-testid="sba-trust-dedicated">
                  <CheckCircle size={18} color="#4ade80" />
                  <span style={{ color: '#d0d0d0', fontSize: '14px' }}>Dedicated Loan Advisor</span>
                </div>
              </div>

              {/* Stats */}
              <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap' }}>
                <div style={{ textAlign: 'center' }}>
                  <span style={{ fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 700, color: '#FFFFFF', display: 'block' }} data-testid="sba-text-stat-amount">$50K-$5M</span>
                  <span style={{ fontSize: '12px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1px' }}>SBA Loan Amounts</span>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <span style={{ fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 700, color: '#FFFFFF', display: 'block' }} data-testid="sba-text-stat-rate">Prime+2.75%</span>
                  <span style={{ fontSize: '12px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1px' }}>Rates From</span>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <span style={{ fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 700, color: '#FFFFFF', display: 'block' }} data-testid="sba-text-stat-term">Up to 25yr</span>
                  <span style={{ fontSize: '12px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1px' }}>Loan Terms</span>
                </div>
              </div>
            </div>

            {/* Right: GHL Form */}
            <div style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '16px', padding: '24px', border: '1px solid rgba(255,255,255,0.1)' }} data-testid="sba-hero-form-container">
              <h3 style={{ color: '#ffffff', fontSize: '20px', fontWeight: 600, textAlign: 'center', marginBottom: '4px' }}>
                See If You Qualify
              </h3>
              <p style={{ color: '#9ca3af', fontSize: '14px', textAlign: 'center', marginBottom: '16px' }}>
                No hard credit pull. No obligation.
              </p>

              <div style={{ display: ghlFormSubmitted ? 'none' : 'block' }} data-testid="sba-ghl-form-container">
                <iframe
                  src="https://api.leadconnectorhq.com/widget/form/9lPCXmZ6jBCV2lHiRvM0"
                  style={{ width: '100%', height: '600px', border: 'none', background: 'transparent' }}
                  id="sba-inline-9lPCXmZ6jBCV2lHiRvM0"
                  data-layout="{'id':'INLINE'}"
                  data-trigger-type="alwaysShow"
                  data-trigger-value=""
                  data-activation-type="alwaysActivated"
                  data-activation-value=""
                  data-deactivation-type="neverDeactivate"
                  data-deactivation-value=""
                  data-form-name="Initial Contact Form"
                  data-height="600"
                  data-layout-iframe-id="sba-inline-9lPCXmZ6jBCV2lHiRvM0"
                  data-form-id="9lPCXmZ6jBCV2lHiRvM0"
                  title="SBA Loan Pre-Qualification Form"
                  allow="clipboard-write"
                  data-testid="sba-ghl-form-iframe"
                />
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', lineHeight: 1.5, marginTop: '12px', textAlign: 'center' }}>
                  By submitting, I agree to the{" "}
                  <a href="https://www.todaycapitalgroup.com/terms-of-service" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'underline' }}>
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a href="https://www.todaycapitalgroup.com/privacy-policy" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'underline' }}>
                    Privacy Policy
                  </a>.
                </p>
              </div>

              {ghlFormSubmitted && (
                <div style={{ padding: '48px 16px', textAlign: 'center' }} data-testid="sba-ghl-submitted">
                  <CheckCircle size={48} color="#4ade80" style={{ margin: '0 auto 16px' }} />
                  <p style={{ color: '#ffffff', fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>Information Received</p>
                  <p style={{ color: '#9ca3af', fontSize: '14px' }}>Qualifying your business now...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section style={{ backgroundColor: '#ffffff', padding: '80px 20px' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', color: '#1d1d1f', marginBottom: '16px', fontWeight: 600 }} data-testid="sba-heading-how-it-works">
              How SBA Loan Pre-Qualification Works
            </h2>
            <p style={{ fontSize: '18px', color: '#6e6e73', maxWidth: '700px', margin: '0 auto', lineHeight: 1.7 }}>
              Skip the bank runaround. Our streamlined SBA loan process connects you with the right lender in three simple steps.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '32px' }}>
            <div style={{ backgroundColor: '#f5f5f7', padding: '32px 28px', borderRadius: '16px', textAlign: 'center', position: 'relative' }} data-testid="sba-step-card-1">
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#0a0f2c', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '20px', fontWeight: 700 }}>1</div>
              <h3 style={{ fontSize: '20px', color: '#1d1d1f', marginBottom: '10px', fontWeight: 600 }}>Tell Us About Your Business</h3>
              <p style={{ fontSize: '15px', color: '#6e6e73', lineHeight: 1.6 }}>
                Complete a quick 2-minute application. We ask about your industry, revenue, credit score, and how much SBA funding you need.
              </p>
            </div>

            <div style={{ backgroundColor: '#f5f5f7', padding: '32px 28px', borderRadius: '16px', textAlign: 'center' }} data-testid="sba-step-card-2">
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#0a0f2c', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '20px', fontWeight: 700 }}>2</div>
              <h3 style={{ fontSize: '20px', color: '#1d1d1f', marginBottom: '10px', fontWeight: 600 }}>Get Matched With SBA Preferred Lenders</h3>
              <p style={{ fontSize: '15px', color: '#6e6e73', lineHeight: 1.6 }}>
                One application, multiple SBA lender matches. We compare 50+ SBA preferred lenders to find the best rates and terms for your business.
              </p>
            </div>

            <div style={{ backgroundColor: '#f5f5f7', padding: '32px 28px', borderRadius: '16px', textAlign: 'center' }} data-testid="sba-step-card-3">
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#0a0f2c', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '20px', fontWeight: 700 }}>3</div>
              <h3 style={{ fontSize: '20px', color: '#1d1d1f', marginBottom: '10px', fontWeight: 600 }}>Receive Your SBA Funding</h3>
              <p style={{ fontSize: '15px', color: '#6e6e73', lineHeight: 1.6 }}>
                Your dedicated SBA loan advisor handles the paperwork from start to close. SBA loans funded in as fast as 45-60 days.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SBA Loan Types Section */}
      <section style={{ backgroundColor: '#f5f5f7', padding: '80px 20px' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', color: '#1d1d1f', marginBottom: '16px', fontWeight: 600 }} data-testid="sba-heading-loan-programs">
              SBA Loan Programs We Offer
            </h2>
            <p style={{ fontSize: '18px', color: '#6e6e73', maxWidth: '700px', margin: '0 auto' }}>
              SBA loans from $50K to $5M for working capital, commercial real estate, equipment purchases, business acquisition, and debt refinancing.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
            <div style={{ backgroundColor: '#ffffff', padding: '32px 28px', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }} data-testid="sba-card-7a">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: 'rgba(91,77,143,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileText size={22} color="#5b4d8f" />
                </div>
                <h3 style={{ fontSize: '20px', color: '#1d1d1f', fontWeight: 600 }}>SBA 7(a) Loan</h3>
              </div>
              <p style={{ fontSize: '15px', color: '#6e6e73', lineHeight: 1.6, marginBottom: '16px' }}>
                The most popular SBA loan program. Ideal for working capital, equipment financing, business expansion, partner buyouts, and debt refinancing. SBA 7(a) loan amounts up to $5 million with competitive rates starting at Prime + 2.75%.
              </p>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '13px', color: '#5b4d8f', fontWeight: 500, backgroundColor: 'rgba(91,77,143,0.08)', padding: '4px 12px', borderRadius: '20px' }}>Up to $5M</span>
                <span style={{ fontSize: '13px', color: '#5b4d8f', fontWeight: 500, backgroundColor: 'rgba(91,77,143,0.08)', padding: '4px 12px', borderRadius: '20px' }}>7-25 Year Terms</span>
              </div>
            </div>

            <div style={{ backgroundColor: '#ffffff', padding: '32px 28px', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }} data-testid="sba-card-504">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: 'rgba(91,77,143,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Building2 size={22} color="#5b4d8f" />
                </div>
                <h3 style={{ fontSize: '20px', color: '#1d1d1f', fontWeight: 600 }}>SBA 504 Loan</h3>
              </div>
              <p style={{ fontSize: '15px', color: '#6e6e73', lineHeight: 1.6, marginBottom: '16px' }}>
                Designed for commercial real estate purchases and major fixed asset acquisitions. SBA 504 loan for commercial real estate offers below-market fixed interest rates, lower down payments, and long-term stability for growing businesses.
              </p>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '13px', color: '#5b4d8f', fontWeight: 500, backgroundColor: 'rgba(91,77,143,0.08)', padding: '4px 12px', borderRadius: '20px' }}>Up to $5.5M</span>
                <span style={{ fontSize: '13px', color: '#5b4d8f', fontWeight: 500, backgroundColor: 'rgba(91,77,143,0.08)', padding: '4px 12px', borderRadius: '20px' }}>10-25 Year Terms</span>
              </div>
            </div>

            <div style={{ backgroundColor: '#ffffff', padding: '32px 28px', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }} data-testid="sba-card-microloan">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: 'rgba(91,77,143,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Users size={22} color="#5b4d8f" />
                </div>
                <h3 style={{ fontSize: '20px', color: '#1d1d1f', fontWeight: 600 }}>SBA Microloan</h3>
              </div>
              <p style={{ fontSize: '15px', color: '#6e6e73', lineHeight: 1.6, marginBottom: '16px' }}>
                SBA startup loans and microloans up to $50K designed for new businesses, franchise startups, and smaller capital needs. Get an SBA loan for a new business with no extensive operating history required.
              </p>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '13px', color: '#5b4d8f', fontWeight: 500, backgroundColor: 'rgba(91,77,143,0.08)', padding: '4px 12px', borderRadius: '20px' }}>Up to $50K</span>
                <span style={{ fontSize: '13px', color: '#5b4d8f', fontWeight: 500, backgroundColor: 'rgba(91,77,143,0.08)', padding: '4px 12px', borderRadius: '20px' }}>Up to 6 Year Terms</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Industry-Specific Section with Stock Photos */}
      <section style={{ backgroundColor: '#ffffff', padding: '80px 20px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', color: '#1d1d1f', marginBottom: '16px', fontWeight: 600 }} data-testid="sba-heading-industries">
              SBA Loans for Every Industry
            </h2>
            <p style={{ fontSize: '18px', color: '#6e6e73', maxWidth: '700px', margin: '0 auto', lineHeight: 1.7 }}>
              Whether you own a restaurant, medical practice, construction company, franchise, or trucking business, our SBA loan experts find the right financing for your specific industry.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
            {INDUSTRY_CARDS.map((industry, idx) => (
              <div key={idx} style={{ borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', backgroundColor: '#ffffff' }} data-testid={`sba-industry-card-${idx}`}>
                <div style={{ height: '200px', overflow: 'hidden', position: 'relative' }}>
                  <img
                    src={industry.img}
                    alt={`SBA loan for ${industry.name} - small business financing`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    loading="lazy"
                  />
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%', background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)' }} />
                  <h3 style={{ position: 'absolute', bottom: '16px', left: '20px', color: '#ffffff', fontSize: '18px', fontWeight: 600, textShadow: '0 1px 3px rgba(0,0,0,0.4)' }}>{industry.name}</h3>
                </div>
                <div style={{ padding: '16px 20px' }}>
                  <p style={{ fontSize: '13px', color: '#6e6e73', lineHeight: 1.5 }}>{industry.keywords}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Table - Going Direct vs. Working With Us */}
      <section style={{ backgroundColor: '#f5f5f7', padding: '80px 20px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', color: '#1d1d1f', marginBottom: '16px', fontWeight: 600 }} data-testid="sba-heading-comparison">
              Going Direct vs. Working With an SBA Loan Broker
            </h2>
            <p style={{ fontSize: '18px', color: '#6e6e73' }}>
              Why business owners choose Today Capital Group over applying to banks directly.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {/* Direct Column */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '28px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }} data-testid="sba-comparison-direct">
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#6e6e73', marginBottom: '20px', textAlign: 'center' }}>Going Direct to a Bank</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {[
                  "1 lender, 1 set of criteria",
                  "90-180 day timeline",
                  "You navigate alone",
                  "Limited loan options",
                  "Multiple applications needed",
                  "No prepayment guidance",
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <span style={{ color: '#ef4444', fontSize: '16px', fontWeight: 700, flexShrink: 0, marginTop: '2px' }}>-</span>
                    <span style={{ fontSize: '14px', color: '#6e6e73', lineHeight: 1.5 }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* With Us Column */}
            <div style={{ backgroundColor: '#0a0f2c', borderRadius: '16px', padding: '28px', boxShadow: '0 4px 16px rgba(10,15,44,0.2)' }} data-testid="sba-comparison-broker">
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#ffffff', marginBottom: '20px', textAlign: 'center' }}>Working With Today Capital</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {[
                  "50+ SBA preferred lenders",
                  "45-60 day average timeline",
                  "Dedicated SBA loan advisor",
                  "Expert lender matching",
                  "One application does it all",
                  "We handle the paperwork",
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <CheckCircle size={16} color="#4ade80" style={{ flexShrink: 0, marginTop: '3px' }} />
                    <span style={{ fontSize: '14px', color: '#d0d0d0', lineHeight: 1.5 }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits / Why SBA Section */}
      <section style={{ backgroundColor: '#ffffff', padding: '80px 20px' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', color: '#1d1d1f', marginBottom: '16px', fontWeight: 600 }} data-testid="sba-heading-benefits">
              Why Choose SBA Loans for Your Small Business?
            </h2>
            <p style={{ fontSize: '18px', color: '#6e6e73', maxWidth: '700px', margin: '0 auto', lineHeight: 1.7 }}>
              SBA loans are partially guaranteed by the U.S. Small Business Administration, allowing lenders to offer the most competitive rates and longest terms available to small businesses.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '32px' }}>
            <div style={{ backgroundColor: '#f5f5f7', padding: '32px 28px', borderRadius: '16px', textAlign: 'center' }} data-testid="sba-benefit-rates">
              <div style={{ marginBottom: '16px' }}>
                <DollarSign size={40} color="#5b4d8f" />
              </div>
              <h3 style={{ fontSize: '20px', color: '#1d1d1f', marginBottom: '10px', fontWeight: 600 }}>Lowest Interest Rates Available</h3>
              <p style={{ fontSize: '15px', color: '#6e6e73', lineHeight: 1.6 }}>
                Current SBA loan rates start at Prime + 2.25%. Government backing means lenders offer rates significantly below conventional business loans. No prepayment penalties on most SBA loans.
              </p>
            </div>

            <div style={{ backgroundColor: '#f5f5f7', padding: '32px 28px', borderRadius: '16px', textAlign: 'center' }} data-testid="sba-benefit-terms">
              <div style={{ marginBottom: '16px' }}>
                <Clock size={40} color="#5b4d8f" />
              </div>
              <h3 style={{ fontSize: '20px', color: '#1d1d1f', marginBottom: '10px', fontWeight: 600 }}>Longer Repayment Terms</h3>
              <p style={{ fontSize: '15px', color: '#6e6e73', lineHeight: 1.6 }}>
                SBA loan terms up to 25 years for real estate and 10 years for working capital. Longer terms mean lower monthly payments and better cash flow management for your business.
              </p>
            </div>

            <div style={{ backgroundColor: '#f5f5f7', padding: '32px 28px', borderRadius: '16px', textAlign: 'center' }} data-testid="sba-benefit-amounts">
              <div style={{ marginBottom: '16px' }}>
                <TrendingUp size={40} color="#5b4d8f" />
              </div>
              <h3 style={{ fontSize: '20px', color: '#1d1d1f', marginBottom: '10px', fontWeight: 600 }}>Up to $5 Million in SBA Funding</h3>
              <p style={{ fontSize: '15px', color: '#6e6e73', lineHeight: 1.6 }}>
                Get $50K to $5M in SBA-backed funding for expansion, equipment, commercial real estate, business acquisition, working capital, or refinancing existing business debt.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SBA Loan Eligibility / FAQ Section */}
      <section style={{ backgroundColor: '#f5f5f7', padding: '80px 20px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', color: '#1d1d1f', marginBottom: '16px', fontWeight: 600 }} data-testid="sba-heading-eligibility">
              SBA Loan Requirements & Eligibility
            </h2>
            <p style={{ fontSize: '18px', color: '#6e6e73' }}>
              Do you qualify for an SBA loan? Here are the basic SBA loan requirements and eligibility criteria.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {[
              { text: "For-profit business operating in the United States", detail: "Required" },
              { text: "Meet SBA size standards for your industry", detail: "Most small businesses qualify" },
              { text: "Personal credit score of 650 or higher", detail: "SBA loan credit score requirement" },
              { text: "Demonstrated ability to repay the loan", detail: "Revenue documentation" },
              { text: "Time in business (2+ years preferred, startups considered)", detail: "SBA startup loan available" },
              { text: "Owner equity investment in the business", detail: "Typically 10-20% down payment" },
            ].map((req, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '20px', backgroundColor: '#ffffff', borderRadius: '12px' }} data-testid={`sba-eligibility-${idx}`}>
                <CheckCircle size={20} color="#5b4d8f" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <span style={{ fontSize: '15px', color: '#1d1d1f', lineHeight: 1.5, display: 'block', fontWeight: 500 }}>{req.text}</span>
                  <span style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px', display: 'block' }}>{req.detail}</span>
                </div>
              </div>
            ))}
          </div>

          {/* FAQ Items */}
          <div style={{ marginTop: '48px' }}>
            <h3 style={{ fontSize: '24px', fontWeight: 600, color: '#1d1d1f', marginBottom: '24px', textAlign: 'center' }} data-testid="sba-heading-faq">
              Frequently Asked SBA Loan Questions
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {[
                { q: "What credit score do I need for an SBA loan?", a: "Most SBA lenders require a minimum credit score of 650, though some SBA loan programs accept scores as low as 620. Higher credit scores qualify for better SBA loan rates and terms." },
                { q: "How long does it take to get an SBA loan?", a: "With our streamlined SBA loan process and 50+ lender network, most SBA loans are funded within 45-60 days. SBA express loans can close even faster." },
                { q: "What documents are required for an SBA loan application?", a: "Typical SBA loan requirements include 2-3 years of tax returns, recent bank statements, a business plan (for startups), and personal financial statements. Your dedicated loan advisor will guide you through every document." },
                { q: "Can I get an SBA loan for a new business or startup?", a: "Yes. SBA startup loans and SBA microloans are available for new businesses and franchise startups. Requirements vary but many SBA lenders work with startups that have strong business plans and owner experience." },
                { q: "What if I don't qualify for an SBA loan?", a: "If you don't meet SBA loan eligibility requirements, we can explore alternative business financing options including conventional term loans, equipment financing, and lines of credit." },
                { q: "How much SBA loan can I get?", a: "SBA 7(a) loans go up to $5 million. SBA 504 loans go up to $5.5 million. SBA microloans go up to $50,000. The amount you qualify for depends on your revenue, credit, and business needs." },
              ].map((faq, idx) => (
                <div key={idx} style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '24px' }} data-testid={`sba-faq-${idx}`}>
                  <h4 style={{ fontSize: '16px', fontWeight: 600, color: '#1d1d1f', marginBottom: '8px' }}>{faq.q}</h4>
                  <p style={{ fontSize: '14px', color: '#6e6e73', lineHeight: 1.6 }}>{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section style={{ background: 'linear-gradient(135deg, #0a0f2c 0%, #1a2650 100%)', padding: '80px 20px', textAlign: 'center' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 38px)', color: '#ffffff', marginBottom: '16px', fontWeight: 600 }} data-testid="sba-heading-final-cta">
            Ready to Apply for an SBA Loan?
          </h2>
          <p style={{ fontSize: '18px', color: '#d0d0d0', marginBottom: '16px', lineHeight: 1.6 }}>
            Get pre-qualified for an SBA loan in minutes. Our SBA loan advisors will match you with the best lender for your business needs. Free pre-qualification, no obligation, no hard credit pull.
          </p>
          <p style={{ fontSize: '16px', color: '#9ca3af', marginBottom: '32px' }}>
            Trusted by 2,000+ business owners across restaurants, medical practices, construction, trucking, franchises, and more.
          </p>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '10px', padding: '18px 48px', backgroundColor: '#FFFFFF', color: '#0a0f2c',
              textDecoration: 'none', fontWeight: 600, borderRadius: '50px', fontSize: '16px', border: 'none',
              cursor: 'pointer', boxShadow: '0 4px 20px rgba(255,255,255,0.2)'
            }}
            data-testid="sba-button-cta-bottom"
          >
            Check SBA Eligibility Now
            <ArrowRight size={18} />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ backgroundColor: '#0a0f2c', padding: '40px 20px', borderTop: '1px solid #1a2650' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', textAlign: 'center' }}>
          <img
            src="https://cdn.prod.website-files.com/6864b4e14db4a4b6864c7968/686c11dae8ddeadf0fc2ffa7_Group%2017.svg"
            alt="Today Capital Group - SBA Loan Broker"
            style={{ height: '32px', width: 'auto', marginBottom: '16px' }}
          />
          <p style={{ fontSize: '13px', color: '#6e6e73', maxWidth: '700px', margin: '0 auto', lineHeight: 1.6 }}>
            Today Capital Group is a business loan broker that connects small businesses with SBA-approved lenders. We are not a direct lender. All SBA loans are subject to lender approval and SBA guidelines. SBA loan rates, terms, and eligibility requirements vary by lender and program.
          </p>
          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '24px', flexWrap: 'wrap' }}>
            <a href="https://www.todaycapitalgroup.com/terms-of-service" target="_blank" rel="noopener noreferrer" style={{ fontSize: '13px', color: '#6e6e73', textDecoration: 'none' }} data-testid="sba-link-terms">Terms of Service</a>
            <a href="https://www.todaycapitalgroup.com/privacy-policy" target="_blank" rel="noopener noreferrer" style={{ fontSize: '13px', color: '#6e6e73', textDecoration: 'none' }} data-testid="sba-link-privacy">Privacy Policy</a>
          </div>
        </div>
      </footer>

      {/* CSS for responsive grid */}
      <style>{`
        @media (min-width: 768px) {
          .md\\:!grid-cols-2 {
            grid-template-columns: 1fr 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
