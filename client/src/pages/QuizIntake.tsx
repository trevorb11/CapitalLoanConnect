import { useState, useEffect, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Loader2, CheckCircle } from "lucide-react";
import { useGoogleReCaptcha } from "react-google-recaptcha-v3";
import { trackIntakeFormSubmitted, trackFormStepCompleted, trackPageView } from "@/lib/analytics";

const BUSINESS_AGE_OPTIONS = [
  "Less than 3 months",
  "3-5 months",
  "6-12 months",
  "1-2 years",
  "2-5 years",
  "More than 5 years",
  "I currently don't own a business",
];

const MONTHLY_REVENUE_OPTIONS = [
  "Less than $1,000",
  "$1,000 – $5,000",
  "$5,000 – $15,000",
  "$15,000 – $20,000",
  "$20,000 – $30,000",
  "$30,000 – $50,000",
  "$50,000 – $100,000",
  "$100,000 – $200,000",
  "$200,000+",
];

const CREDIT_SCORE_OPTIONS = [
  "500 and below",
  "500-549",
  "550-599",
  "600-649",
  "650-719",
  "720 or above",
  "Not sure",
];

interface QuizData {
  financingAmount: number;
  businessAge: string;
  monthlyRevenue: string;
  creditScore: string;
  fullName: string;
  businessName: string;
  email: string;
  phone: string;
  consent: boolean;
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

  const [quizData, setQuizData] = useState<QuizData>({
    financingAmount: 25000,
    businessAge: "",
    monthlyRevenue: "",
    creditScore: "",
    fullName: "",
    businessName: "",
    email: "",
    phone: "",
    consent: false,
    faxNumber: "", // Honeypot - should remain empty
  });

  const totalQuestions = 5;
  const progress = (currentQuestion / totalQuestions) * 100;

  // Track page view on mount
  useEffect(() => {
    trackPageView('/intake/quiz', 'Intake Quiz Form');
  }, []);

  const parseRevenueToNumber = (revenueRange: string): string => {
    const rangeMap: Record<string, string> = {
      "Less than $1,000": "500",
      "$1,000 – $5,000": "3000",
      "$5,000 – $15,000": "10000",
      "$15,000 – $20,000": "17500",
      "$20,000 – $30,000": "25000",
      "$30,000 – $50,000": "40000",
      "$50,000 – $100,000": "75000",
      "$100,000 – $200,000": "150000",
      "$200,000+": "250000",
    };
    return rangeMap[revenueRange] || "0";
  };

  const submitMutation = useMutation({
    mutationFn: async (data: QuizData & { recaptchaToken?: string }) => {
      const response = await apiRequest("POST", "/api/applications", {
        email: data.email,
        fullName: data.fullName,
        phone: data.phone,
        businessName: data.businessName,
        requestedAmount: data.financingAmount.toString(),
        timeInBusiness: data.businessAge,
        monthlyRevenue: parseRevenueToNumber(data.monthlyRevenue),
        averageMonthlyRevenue: parseRevenueToNumber(data.monthlyRevenue),
        creditScore: data.creditScore,
        personalCreditScoreRange: data.creditScore,
        isCompleted: true,
        recaptchaToken: data.recaptchaToken,
        faxNumber: data.faxNumber,
      });
      return response.json();
    },
    onSuccess: (data) => {
      // Track intake form submission
      trackIntakeFormSubmitted({
        requestedAmount: quizData.financingAmount.toString(),
        creditScore: quizData.creditScore,
        timeInBusiness: quizData.businessAge,
        monthlyRevenue: quizData.monthlyRevenue,
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
      const stepNames = ['Financing Amount', 'Business Age', 'Monthly Revenue', 'Credit Score', 'Contact Info'];
      trackFormStepCompleted('intake_quiz', currentQuestion, stepNames[currentQuestion - 1]);
      goToQuestion(currentQuestion + 1);
    }
  };

  const handleRadioSelect = (field: keyof QuizData, value: string) => {
    setQuizData((prev) => ({ ...prev, [field]: value }));
    setTimeout(() => nextQuestion(), 400);
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
    if (!quizData.consent) {
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
        {/* Progress Bar */}
        <div className="w-full h-1 bg-white/20 rounded-full mb-8">
          <div
            className="h-full bg-white rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
            data-testid="progress-bar"
          />
        </div>

        {/* Question 1: Financing Amount */}
        <div
          className={`transition-all duration-300 ${currentQuestion === 1 ? "block opacity-100" : "hidden opacity-0"} ${isTransitioning ? "opacity-0" : ""}`}
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
                  max="2000000"
                  step="1000"
                  value={quizData.financingAmount}
                  onChange={(e) => setQuizData((prev) => ({ ...prev, financingAmount: parseInt(e.target.value) }))}
                  className="financing-slider w-full h-3 rounded-full appearance-none cursor-pointer mb-3"
                  style={{
                    background: `linear-gradient(to right, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.9) ${((quizData.financingAmount - 5000) / (2000000 - 5000)) * 100}%, rgba(255,255,255,0.2) ${((quizData.financingAmount - 5000) / (2000000 - 5000)) * 100}%, rgba(255,255,255,0.2) 100%)`,
                  }}
                  data-testid="financing-slider"
                />
              </div>

              <div className="flex justify-between text-white/60 text-sm mb-8">
                <span>$5K</span>
                <span>$2M</span>
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

        {/* Question 2: Business Operating Time */}
        <div
          className={`transition-all duration-300 ${currentQuestion === 2 ? "block opacity-100" : "hidden opacity-0"} ${isTransitioning ? "opacity-0" : ""}`}
          data-testid="question-2"
        >
          <div className="text-center">
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

        {/* Question 3: Monthly Revenue */}
        <div
          className={`transition-all duration-300 ${currentQuestion === 3 ? "block opacity-100" : "hidden opacity-0"} ${isTransitioning ? "opacity-0" : ""}`}
          data-testid="question-3"
        >
          <div className="text-center">
            <h3 className="text-white text-2xl md:text-3xl font-semibold mb-8">
              Gross Monthly Revenue?
            </h3>

            <div className="flex flex-col gap-3 max-w-md mx-auto text-left max-h-[400px] overflow-y-auto pr-2">
              {MONTHLY_REVENUE_OPTIONS.map((option, idx) => (
                <label
                  key={option}
                  className={`flex items-center cursor-pointer p-4 rounded-lg transition-all duration-200 ${
                    quizData.monthlyRevenue === option ? "bg-white/20" : "bg-transparent hover:bg-white/10"
                  }`}
                  data-testid={`label-revenue-${idx}`}
                >
                  <input
                    type="radio"
                    name="monthlyRevenue"
                    value={option}
                    checked={quizData.monthlyRevenue === option}
                    onChange={() => handleRadioSelect("monthlyRevenue", option)}
                    className="w-5 h-5 mr-4 appearance-none border-2 border-white rounded-full grid place-content-center cursor-pointer
                      before:content-[''] before:w-2.5 before:h-2.5 before:rounded-full before:scale-0 before:transition-transform before:bg-white
                      checked:before:scale-100"
                    data-testid={`radio-revenue-${idx}`}
                  />
                  <span className="text-white text-base md:text-lg">{option}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Question 4: Credit Score */}
        <div
          className={`transition-all duration-300 ${currentQuestion === 4 ? "block opacity-100" : "hidden opacity-0"} ${isTransitioning ? "opacity-0" : ""}`}
          data-testid="question-4"
        >
          <div className="text-center">
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

        {/* Question 5: Contact Info */}
        <div
          className={`transition-all duration-300 ${currentQuestion === 5 ? "block opacity-100" : "hidden opacity-0"} ${isTransitioning ? "opacity-0" : ""}`}
          data-testid="question-5"
        >
          <div className="text-center">
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

              {/* Consent Checkbox */}
              <div className="pt-2">
                <div className="flex items-start text-left gap-3">
                  <input
                    type="checkbox"
                    id="consent"
                    checked={quizData.consent}
                    onChange={(e) => {
                      setQuizData((prev) => ({ ...prev, consent: e.target.checked }));
                      setShowConsentError(false);
                    }}
                    className="w-4 h-4 mt-1 cursor-pointer flex-shrink-0"
                    data-testid="checkbox-consent"
                  />
                  <label htmlFor="consent" className="text-white/60 text-[11px] leading-relaxed cursor-pointer">
                    By checking this box, I verify this is my number and I consent to receive automated marketing calls, texts, and emails from Today Capital Group at the phone number provided, even if verified on a state or federal Do Not Call list. Consent is not a condition of purchase. Msg & data rates may apply. Msg frequency varies. Reply HELP for help and STOP to cancel. I agree to the{" "}
                    <a href="https://www.todaycapitalgroup.com/terms-of-service" target="_blank" rel="noopener noreferrer" className="underline text-white/80 hover:text-white">
                      Terms of Service
                    </a>{" "}
                    and{" "}
                    <a href="https://www.todaycapitalgroup.com/privacy-policy" target="_blank" rel="noopener noreferrer" className="underline text-white/80 hover:text-white">
                      Privacy Policy
                    </a>.
                  </label>
                </div>

                {showConsentError && (
                  <div className="mt-2 p-2 bg-red-500/20 border border-red-500/40 rounded" data-testid="consent-error">
                    <p className="text-red-400 text-sm">Please accept the terms to continue</p>
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
