import { useState, useEffect, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Loader2, CheckCircle, ArrowLeft } from "lucide-react";
import { useGoogleReCaptcha } from "react-google-recaptcha-v3";
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

const OWN_BUSINESS_OPTIONS = [
  "Yes",
  "No",
];

// Monthly revenue is now a direct numeric input instead of predefined ranges

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
  faxNumber: string; // Honeypot field - should always be empty
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

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export default function QuizIntake() {
  const [, navigate] = useLocation();
  const { executeRecaptcha } = useGoogleReCaptcha();
  const [currentQuestion, setCurrentQuestion] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showConsentError, setShowConsentError] = useState(false);
  const [formError, setFormError] = useState("");
  const [showNotBusinessOwnerMessage, setShowNotBusinessOwnerMessage] = useState(false);
  const [showLowRevenueOutcome, setShowLowRevenueOutcome] = useState(false);

  // Revenue threshold for the main application flow
  const LOW_REVENUE_THRESHOLD = 10000;
  const MINIMUM_REVENUE_REQUIREMENT = 10000;

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
    faxNumber: "", // Honeypot - should remain empty
  });

  const totalQuestions = 8;
  const progress = (currentQuestion / totalQuestions) * 100;

  // Track page view and capture UTM params on mount
  useEffect(() => {
    trackPageView('/intake/quiz', 'Intake Quiz Form');
    initUTMTracking();
  }, []);


  const submitMutation = useMutation({
    mutationFn: async (data: QuizData & { recaptchaToken?: string }) => {
      // Check for referral partner ID from localStorage (set when visiting /r/:code)
      const referralPartnerId = localStorage.getItem("referralPartnerId");
      
      // Get stored UTM parameters
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
        // Include referral partner ID if from partner link
        ...(referralPartnerId && { referralPartnerId }),
        // Include UTM tracking parameters
        ...utmParams,
      });
      return response.json();
    },
    onSuccess: (data) => {
      // Track intake form submission
      trackIntakeFormSubmitted({
        requestedAmount: quizData.financingAmount.toString(),
        creditScore: quizData.creditScore,
        timeInBusiness: quizData.businessAge,
        monthlyRevenue: quizData.monthlyRevenue.toString(),
        industry: quizData.industry,
        useOfFunds: quizData.fundingPurpose,
      });
      
      // Check if user is on the low revenue path
      if (quizData.monthlyRevenue < LOW_REVENUE_THRESHOLD) {
        setShowLowRevenueOutcome(true);
      } else if (data.id) {
        navigate(`/?applicationId=${data.id}`);
      } else {
        navigate("/");
      }
    },
    onError: (error: Error) => {
      setFormError(error.message || "There was an error submitting your information. Please try again.");
    },
  });

  const goToQuestion = (num: number) => {
    if (num === currentQuestion) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentQuestion(num);
      setIsTransitioning(false);
    }, 250);
  };

  const nextQuestion = () => {
    if (currentQuestion < totalQuestions) {
      // Track step completion
      const stepNames = ['Financing Amount', 'Own Business', 'Business Age', 'Industry', 'Monthly Revenue', 'Credit Score', 'Funding Purpose', 'Contact Info'];
      trackFormStepCompleted('intake_quiz', currentQuestion, stepNames[currentQuestion - 1]);
      goToQuestion(currentQuestion + 1);
    }
  };

  const prevQuestion = () => {
    if (currentQuestion > 1) {
      goToQuestion(currentQuestion - 1);
    }
  };

  const handleRadioSelect = (field: keyof QuizData, value: string) => {
    setQuizData((prev) => ({ ...prev, [field]: value }));
    setTimeout(() => nextQuestion(), 400);
  };

  // Special handler for business ownership question
  const handleBusinessOwnershipSelect = (value: string) => {
    setQuizData((prev) => ({ ...prev, ownBusiness: value }));
    if (value === "No") {
      // Show the message screen instead of advancing
      setTimeout(() => setShowNotBusinessOwnerMessage(true), 400);
    } else {
      // Advance to next question normally
      setTimeout(() => nextQuestion(), 400);
    }
  };

  const handleSubmit = useCallback(async () => {
    setFormError("");
    setShowConsentError(false);

    if (!quizData.fullName.trim()) {
      setFormError("Please enter your full name");
      return;
    }
    if (!quizData.businessName.trim()) {
      setFormError("Please enter your business name");
      return;
    }
    if (!quizData.email.trim() || !quizData.email.includes("@")) {
      setFormError("Please enter a valid email address");
      return;
    }
    if (!quizData.phone.trim() || quizData.phone.replace(/\D/g, "").length < 10) {
      setFormError("Please enter a valid phone number");
      return;
    }
    if (!quizData.consentTransactional) {
      setShowConsentError(true);
      return;
    }

    let recaptchaToken: string | undefined;
    if (executeRecaptcha) {
      try {
        recaptchaToken = await executeRecaptcha("quiz_intake_submit");
      } catch (error) {
        console.error("reCAPTCHA error:", error);
      }
    }

    submitMutation.mutate({ ...quizData, recaptchaToken });
  }, [quizData, executeRecaptcha, submitMutation]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "linear-gradient(to bottom, #192F56 0%, #19112D 100%)" }}>
      <div
        className="w-full max-w-[600px] p-8 md:p-12 rounded-2xl relative overflow-hidden"
        style={{
          background: "linear-gradient(to bottom, #192F56 0%, #19112D 100%)",
          boxShadow: "0 12px 30px rgba(25, 47, 86, 0.3), 0 4px 15px rgba(0, 0, 0, 0.2)",
          minHeight: "500px",
        }}
        data-testid="quiz-container"
      >
        {/* Progress Bar - hide on outcome screens */}
        {!showLowRevenueOutcome && (
          <div className="w-full h-1 bg-white/20 rounded-full mb-8">
            <div
              className="h-full bg-white rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
              data-testid="progress-bar"
            />
          </div>
        )}

        {/* Question 1: Financing Amount */}
        <div
          className={`transition-all duration-300 ${currentQuestion === 1 && !showLowRevenueOutcome ? "block opacity-100" : "hidden opacity-0"} ${isTransitioning ? "opacity-0" : ""}`}
          data-testid="question-1"
        >
          <div className="text-center">
            <h3 className="text-white text-2xl md:text-3xl font-semibold mb-4 leading-tight">
              How much are you thinking about financing?
            </h3>
            <p className="text-white/70 mb-8 text-base md:text-lg">
              Drag the slider to select your desired financing amount.
            </p>

            <div className="max-w-md mx-auto px-4">
              <div className="text-white text-4xl md:text-5xl font-bold text-center mb-8" data-testid="amount-display">
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
                  data-testid="financing-slider"
                />
              </div>

              <div className="flex justify-between text-white/60 text-sm mb-8">
                <span>$5K</span>
                <span>$1M+</span>
              </div>

              <button
                onClick={nextQuestion}
                className="w-full bg-white text-[#192F56] py-4 px-8 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
                data-testid="button-get-quote"
              >
                Get Your Quote
              </button>
            </div>
          </div>
        </div>

        {/* Question 2: Do you own a business? */}
        <div
          className={`transition-all duration-300 ${currentQuestion === 2 && !showNotBusinessOwnerMessage && !showLowRevenueOutcome ? "block opacity-100" : "hidden opacity-0"} ${isTransitioning ? "opacity-0" : ""}`}
          data-testid="question-2"
        >
          <div className="text-center">
            <button
              onClick={prevQuestion}
              className="absolute top-8 left-8 text-white/70 hover:text-white flex items-center gap-2 transition-colors"
              data-testid="back-button-2"
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
                  data-testid={`label-own-business-${idx}`}
                >
                  <input
                    type="radio"
                    name="ownBusiness"
                    value={option}
                    checked={quizData.ownBusiness === option}
                    onChange={() => handleBusinessOwnershipSelect(option)}
                    className="w-5 h-5 mr-4 appearance-none border-2 border-white rounded-full grid place-content-center cursor-pointer
                      before:content-[''] before:w-2.5 before:h-2.5 before:rounded-full before:scale-0 before:transition-transform before:bg-white
                      checked:before:scale-100"
                    data-testid={`radio-own-business-${idx}`}
                  />
                  <span className="text-white text-base md:text-lg">{option}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Not a Business Owner Message */}
        <div
          className={`transition-all duration-300 ${currentQuestion === 2 && showNotBusinessOwnerMessage ? "block opacity-100" : "hidden opacity-0"} ${isTransitioning ? "opacity-0" : ""}`}
          data-testid="not-business-owner-message"
        >
          <div className="text-center">
            <button
              onClick={() => {
                setShowNotBusinessOwnerMessage(false);
                setQuizData((prev) => ({ ...prev, ownBusiness: "" }));
              }}
              className="absolute top-8 left-8 text-white/70 hover:text-white flex items-center gap-2 transition-colors"
              data-testid="back-button-message"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back</span>
            </button>
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-white/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-white text-2xl md:text-3xl font-semibold mb-4">
              Business Financing Only
            </h3>
            <p className="text-white/70 mb-8 text-base md:text-lg max-w-md mx-auto">
              We specialize in business financing solutions. Our products are designed specifically for business owners looking to grow or manage their operations.
            </p>

            <div className="flex flex-col gap-3 max-w-md mx-auto">
              <button
                onClick={() => {
                  setShowNotBusinessOwnerMessage(false);
                  nextQuestion();
                }}
                className="w-full bg-white text-[#192F56] py-4 px-8 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
                data-testid="button-continue-anyway"
              >
                Continue Anyway
              </button>
              <button
                onClick={() => navigate("/intake")}
                className="w-full p-4 rounded-lg bg-transparent hover:bg-white/10 border-2 border-white/30 hover:border-white text-white text-lg font-medium transition-all duration-200"
                data-testid="button-exit-quiz"
              >
                Exit
              </button>
            </div>
          </div>
        </div>

        {/* Question 3: Business Operating Time */}
        <div
          className={`transition-all duration-300 ${currentQuestion === 3 && !showLowRevenueOutcome ? "block opacity-100" : "hidden opacity-0"} ${isTransitioning ? "opacity-0" : ""}`}
          data-testid="question-3"
        >
          <div className="text-center">
            <button
              onClick={prevQuestion}
              className="absolute top-8 left-8 text-white/70 hover:text-white flex items-center gap-2 transition-colors"
              data-testid="back-button-3"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back</span>
            </button>
            <h3 className="text-white text-2xl md:text-3xl font-semibold mb-8">
              Business Operating Time
            </h3>

            <div className="flex flex-col gap-3 max-w-md mx-auto text-left">
              {BUSINESS_AGE_OPTIONS.map((option, idx) => (
                <label
                  key={option}
                  className={`flex items-center cursor-pointer p-4 rounded-lg transition-all duration-200 ${
                    quizData.businessAge === option ? "bg-white/20" : "bg-transparent hover:bg-white/10"
                  }`}
                  data-testid={`label-business-age-${idx}`}
                >
                  <input
                    type="radio"
                    name="businessAge"
                    value={option}
                    checked={quizData.businessAge === option}
                    onChange={() => handleRadioSelect("businessAge", option)}
                    className="w-5 h-5 mr-4 appearance-none border-2 border-white rounded-full grid place-content-center cursor-pointer
                      before:content-[''] before:w-2.5 before:h-2.5 before:rounded-full before:scale-0 before:transition-transform before:bg-white
                      checked:before:scale-100"
                    data-testid={`radio-business-age-${idx}`}
                  />
                  <span className="text-white text-base md:text-lg">{option}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Question 4: Industry */}
        <div
          className={`transition-all duration-300 ${currentQuestion === 4 && !showLowRevenueOutcome ? "block opacity-100" : "hidden opacity-0"} ${isTransitioning ? "opacity-0" : ""}`}
          data-testid="question-4"
        >
          <div className="text-center">
            <button
              onClick={prevQuestion}
              className="absolute top-8 left-8 text-white/70 hover:text-white flex items-center gap-2 transition-colors"
              data-testid="back-button-4"
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
                  data-testid={`label-industry-${idx}`}
                >
                  <input
                    type="radio"
                    name="industry"
                    value={option}
                    checked={quizData.industry === option}
                    onChange={() => handleRadioSelect("industry", option)}
                    className="w-5 h-5 mr-4 appearance-none border-2 border-white rounded-full grid place-content-center cursor-pointer
                      before:content-[''] before:w-2.5 before:h-2.5 before:rounded-full before:scale-0 before:transition-transform before:bg-white
                      checked:before:scale-100"
                    data-testid={`radio-industry-${idx}`}
                  />
                  <span className="text-white text-base md:text-lg">{option}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Question 5: Monthly Revenue */}
        <div
          className={`transition-all duration-300 ${currentQuestion === 5 && !showLowRevenueOutcome ? "block opacity-100" : "hidden opacity-0"} ${isTransitioning ? "opacity-0" : ""}`}
          data-testid="question-5"
        >
          <div className="text-center">
            <button
              onClick={prevQuestion}
              className="absolute top-8 left-8 text-white/70 hover:text-white flex items-center gap-2 transition-colors"
              data-testid="back-button-5"
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
                  data-testid="input-monthly-revenue"
                />
              </div>
              
              <button
                onClick={nextQuestion}
                disabled={quizData.monthlyRevenue <= 0}
                className={`w-full py-4 rounded-lg font-semibold text-lg transition-all duration-200 ${
                  quizData.monthlyRevenue > 0
                    ? "bg-white text-[#0a2540] hover:bg-white/90"
                    : "bg-white/30 text-white/50 cursor-not-allowed"
                }`}
                data-testid="button-continue-revenue"
              >
                Continue
              </button>
            </div>
          </div>
        </div>

        {/* Question 6: Credit Score */}
        <div
          className={`transition-all duration-300 ${currentQuestion === 6 && !showLowRevenueOutcome ? "block opacity-100" : "hidden opacity-0"} ${isTransitioning ? "opacity-0" : ""}`}
          data-testid="question-6"
        >
          <div className="text-center">
            <button
              onClick={prevQuestion}
              className="absolute top-8 left-8 text-white/70 hover:text-white flex items-center gap-2 transition-colors"
              data-testid="back-button-6"
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
                  data-testid={`label-credit-${idx}`}
                >
                  <input
                    type="radio"
                    name="creditScore"
                    value={option}
                    checked={quizData.creditScore === option}
                    onChange={() => handleRadioSelect("creditScore", option)}
                    className="w-5 h-5 mr-4 appearance-none border-2 border-white rounded-full grid place-content-center cursor-pointer
                      before:content-[''] before:w-2.5 before:h-2.5 before:rounded-full before:scale-0 before:transition-transform before:bg-white
                      checked:before:scale-100"
                    data-testid={`radio-credit-${idx}`}
                  />
                  <span className="text-white text-base md:text-lg">{option}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Question 7: Funding Purpose */}
        <div
          className={`transition-all duration-300 ${currentQuestion === 7 && !showLowRevenueOutcome ? "block opacity-100" : "hidden opacity-0"} ${isTransitioning ? "opacity-0" : ""}`}
          data-testid="question-7"
        >
          <div className="text-center">
            <button
              onClick={prevQuestion}
              className="absolute top-8 left-8 text-white/70 hover:text-white flex items-center gap-2 transition-colors"
              data-testid="back-button-7"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back</span>
            </button>
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
                  data-testid={`label-funding-purpose-${idx}`}
                >
                  <input
                    type="radio"
                    name="fundingPurpose"
                    value={option}
                    checked={quizData.fundingPurpose === option}
                    onChange={() => handleRadioSelect("fundingPurpose", option)}
                    className="w-5 h-5 mr-4 appearance-none border-2 border-white rounded-full grid place-content-center cursor-pointer
                      before:content-[''] before:w-2.5 before:h-2.5 before:rounded-full before:scale-0 before:transition-transform before:bg-white
                      checked:before:scale-100"
                    data-testid={`radio-funding-purpose-${idx}`}
                  />
                  <span className="text-white text-base md:text-lg">{option}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Question 8: Contact Info */}
        <div
          className={`transition-all duration-300 ${currentQuestion === 8 && !showLowRevenueOutcome ? "block opacity-100" : "hidden opacity-0"} ${isTransitioning ? "opacity-0" : ""}`}
          data-testid="question-8"
        >
          <div className="text-center">
            <button
              onClick={prevQuestion}
              className="absolute top-8 left-8 text-white/70 hover:text-white flex items-center gap-2 transition-colors"
              data-testid="back-button-8"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back</span>
            </button>
            <h3 className="text-white text-xl md:text-2xl font-semibold mb-2">
              Get Your Personalized Financing Quote
            </h3>
            <p className="text-white/70 mb-6 text-sm md:text-base">
              We'll connect you with the best financing options based on your business profile.
            </p>

            <div className="max-w-sm mx-auto space-y-4">
              <input
                type="text"
                placeholder="Your Full Name"
                value={quizData.fullName}
                onChange={(e) => setQuizData((prev) => ({ ...prev, fullName: e.target.value }))}
                className="w-full p-4 border-2 border-white/30 bg-white/10 text-white rounded-lg text-base placeholder:text-white/60 focus:outline-none focus:border-white focus:bg-white/15 transition-colors"
                data-testid="input-full-name"
              />

              <input
                type="text"
                placeholder="Business Name"
                value={quizData.businessName}
                onChange={(e) => setQuizData((prev) => ({ ...prev, businessName: e.target.value }))}
                className="w-full p-4 border-2 border-white/30 bg-white/10 text-white rounded-lg text-base placeholder:text-white/60 focus:outline-none focus:border-white focus:bg-white/15 transition-colors"
                data-testid="input-business-name"
              />

              <input
                type="email"
                placeholder="Email Address"
                value={quizData.email}
                onChange={(e) => setQuizData((prev) => ({ ...prev, email: e.target.value }))}
                className="w-full p-4 border-2 border-white/30 bg-white/10 text-white rounded-lg text-base placeholder:text-white/60 focus:outline-none focus:border-white focus:bg-white/15 transition-colors"
                data-testid="input-email"
              />

              <input
                type="tel"
                placeholder="Phone Number"
                value={quizData.phone}
                onChange={(e) => setQuizData((prev) => ({ ...prev, phone: formatPhone(e.target.value) }))}
                className="w-full p-4 border-2 border-white/30 bg-white/10 text-white rounded-lg text-base placeholder:text-white/60 focus:outline-none focus:border-white focus:bg-white/15 transition-colors"
                data-testid="input-phone"
              />

              {/* Honeypot field - hidden from humans, visible to bots */}
              <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', opacity: 0, height: 0, overflow: 'hidden' }}>
                <label htmlFor="faxNumber">Fax Number (leave blank)</label>
                <input
                  type="text"
                  id="faxNumber"
                  name="faxNumber"
                  autoComplete="off"
                  tabIndex={-1}
                  value={quizData.faxNumber}
                  onChange={(e) => setQuizData((prev) => ({ ...prev, faxNumber: e.target.value }))}
                />
              </div>

              {/* Consent Checkboxes */}
              <div className="pt-2 space-y-3">
                {/* Transactional Consent */}
                <div className="flex items-start text-left gap-3">
                  <input
                    type="checkbox"
                    id="consentTransactional"
                    checked={quizData.consentTransactional}
                    onChange={(e) => {
                      setQuizData((prev) => ({ ...prev, consentTransactional: e.target.checked }));
                      setShowConsentError(false);
                    }}
                    className="w-4 h-4 mt-1 cursor-pointer flex-shrink-0"
                    data-testid="checkbox-consent-transactional"
                  />
                  <label htmlFor="consentTransactional" className="text-white/60 text-[11px] leading-relaxed cursor-pointer">
                    By checking this box, I consent to receive transactional messages from Today Capital Group related to my funding application and services I have requested. These messages may include application updates, document requests, and account notifications. Message frequency may vary. Message & Data rates may apply. Reply HELP for help or STOP to opt-out.
                  </label>
                </div>

                {/* Marketing Consent */}
                <div className="flex items-start text-left gap-3">
                  <input
                    type="checkbox"
                    id="consentMarketing"
                    checked={quizData.consentMarketing}
                    onChange={(e) => {
                      setQuizData((prev) => ({ ...prev, consentMarketing: e.target.checked }));
                    }}
                    className="w-4 h-4 mt-1 cursor-pointer flex-shrink-0"
                    data-testid="checkbox-consent-marketing"
                  />
                  <label htmlFor="consentMarketing" className="text-white/60 text-[11px] leading-relaxed cursor-pointer">
                    By checking this box, I consent to receive marketing and promotional messages from Today Capital Group, including special offers, financing updates, and new product announcements. Message frequency may vary. Message & Data rates may apply. Reply HELP for help or STOP to opt-out.
                  </label>
                </div>

                {/* Terms and Privacy Policy */}
                <p className="text-white/50 text-[10px] leading-relaxed">
                  By submitting, I agree to the{" "}
                  <a href="https://www.todaycapitalgroup.com/terms-of-service" target="_blank" rel="noopener noreferrer" className="underline text-white/70 hover:text-white">
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a href="https://www.todaycapitalgroup.com/privacy-policy" target="_blank" rel="noopener noreferrer" className="underline text-white/70 hover:text-white">
                    Privacy Policy
                  </a>.
                </p>

                {showConsentError && (
                  <div className="mt-2 p-2 bg-red-500/20 border border-red-500/40 rounded" data-testid="consent-error">
                    <p className="text-red-400 text-sm">Please accept the transactional messages consent to continue</p>
                  </div>
                )}
              </div>

              {formError && (
                <div className="p-3 bg-red-500/20 border-2 border-red-500/50 rounded-lg text-center" data-testid="form-error">
                  <p className="text-red-400 font-medium text-sm">{formError}</p>
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={submitMutation.isPending}
                className="w-full bg-white text-[#192F56] py-4 px-8 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg disabled:bg-white/50 disabled:cursor-not-allowed disabled:transform-none"
                data-testid="button-submit"
              >
                {submitMutation.isPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Submitting...
                  </span>
                ) : (
                  "Get My Free Quote"
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Low Revenue Outcome Screen */}
        <div
          className={`transition-all duration-300 ${showLowRevenueOutcome ? "block opacity-100" : "hidden opacity-0"}`}
          data-testid="low-revenue-outcome"
        >
          <div className="text-center">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-amber-400/20 to-orange-500/20 flex items-center justify-center border border-amber-400/30 animate-pulse">
              <svg className="w-12 h-12 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-white text-2xl md:text-3xl font-bold mb-4">
              Thank You for Your Interest!
            </h3>
            <p className="text-white/80 mb-4 text-base md:text-lg max-w-md mx-auto leading-relaxed">
              We appreciate you taking the time to complete our intake form.
            </p>
            <p className="text-white/70 mb-3 text-base max-w-md mx-auto leading-relaxed">
              Based on your revenue of <span className="text-amber-400 font-bold">${quizData.monthlyRevenue.toLocaleString()}/month</span>, our financing programs currently require a minimum of <span className="text-white font-semibold">${MINIMUM_REVENUE_REQUIREMENT.toLocaleString()}/month</span>. While you don't quite meet this threshold right now, we'd love to stay in touch!
            </p>
            
            {/* Update Information Link */}
            <p className="text-white/60 mb-6 text-sm max-w-md mx-auto">
              Is this incorrect?{" "}
              <button
                onClick={() => {
                  setShowLowRevenueOutcome(false);
                  setCurrentQuestion(5);
                }}
                className="text-cyan-400 underline hover:text-cyan-300 transition-colors font-medium"
                data-testid="button-update-info"
              >
                Update your information here
              </button>
            </p>
            
            <div className="bg-white/10 rounded-xl p-6 max-w-md mx-auto mb-6 text-left">
              <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                What Happens Next
              </h4>
              <ul className="text-white/80 space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-white/60">1.</span>
                  <span>We've saved your information for future follow-up</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-white/60">2.</span>
                  <span>Our team will check in with you periodically to see if your revenue has grown</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-white/60">3.</span>
                  <span>You'll receive helpful resources to support your business growth</span>
                </li>
              </ul>
            </div>

            {/* Primary CTA - More Prominent */}
            <div className="max-w-md mx-auto mb-6">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 rounded-xl blur-md opacity-75 group-hover:opacity-100 transition duration-300 animate-pulse"></div>
                <button
                  onClick={() => navigate("/funding-check")}
                  className="relative w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white py-4 px-8 rounded-xl font-bold text-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl flex items-center justify-center gap-3"
                  data-testid="button-funding-check"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Get Your Free Funding Analysis
                </button>
              </div>
              <p className="text-white/60 text-sm mt-3">
                Upload your bank statements to see exactly where you stand
              </p>
            </div>

            <div className="flex flex-col gap-3 max-w-md mx-auto">
              <button
                onClick={() => navigate("/intake")}
                className="w-full bg-white/10 hover:bg-white/20 text-white py-3 px-8 rounded-lg font-medium transition-all duration-300 border border-white/20"
                data-testid="button-back-to-home"
              >
                Back to Home
              </button>
              <p className="text-white/50 text-sm mt-2">
                Questions? Contact us at{" "}
                <a href="mailto:info@todaycapitalgroup.com" className="text-white/70 underline hover:text-white">
                  info@todaycapitalgroup.com
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* Business Loans Disclaimer - hide on outcome screens */}
        {!showLowRevenueOutcome && (
          <div className="mt-8 pt-6 border-t border-white/10">
            <p className="text-white/50 text-xs text-center">
              We specialize in business loans and financing only. We do not offer personal loans or consumer financing.
            </p>
          </div>
        )}
      </div>

      {/* Custom slider styles */}
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
          box-shadow: 0 4px 12px rgba(0,0,0,0.4), 0 0 0 8px rgba(255,255,255,0.25);
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
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        
        .financing-slider::-moz-range-thumb:hover {
          transform: scale(1.1);
          box-shadow: 0 6px 16px rgba(0,0,0,0.4), 0 0 0 6px rgba(255,255,255,0.3);
        }
        
        .financing-slider::-moz-range-thumb:active {
          cursor: grabbing;
          transform: scale(1.05);
        }
      `}</style>
    </div>
  );
}
