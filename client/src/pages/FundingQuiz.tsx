import { useState, useEffect, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Loader2, ArrowLeft, CheckCircle, XCircle, AlertCircle, TrendingUp, Building2, CreditCard, Landmark, PiggyBank, FileText, ArrowRight } from "lucide-react";
import { useGoogleReCaptcha } from "react-google-recaptcha-v3";
import { trackIntakeFormSubmitted, trackFormStepCompleted, trackPageView } from "@/lib/analytics";
import { initUTMTracking, getStoredUTMParams } from "@/lib/utm";

// Quiz question types
type QuestionType = "yes_no" | "multiple_choice" | "input" | "contact";

interface QuizQuestion {
  id: string;
  type: QuestionType;
  question: string;
  subtext?: string;
  options?: string[];
  insight: {
    yes?: string;
    no?: string;
    general?: string;
  };
  followUp?: {
    condition: "yes" | "no";
    question: string;
    options: string[];
    insight: string;
  };
  icon: React.ReactNode;
  scoreImpact: {
    yes: number;
    no: number;
  };
}

interface QuizAnswers {
  revenue15k: string;
  revenueAmount: string;
  sixMonthsOld: string;
  businessAge: string;
  onlineBank: string;
  whichOnlineBank: string;
  existingPositions: string;
  positionCount: string;
  creditAbove550: string;
  creditRange: string;
  consistentDeposits: string;
  nsfOverdrafts: string;
  industry: string;
  fundingPurpose: string;
  // Contact info
  fullName: string;
  businessName: string;
  email: string;
  phone: string;
  consentTransactional: boolean;
  consentMarketing: boolean;
  faxNumber: string;
}

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

const ONLINE_BANKS = [
  "Chime",
  "Varo",
  "Dave",
  "Current",
  "PayPal Business",
  "Venmo Business",
  "Cash App Business",
  "Novo",
  "BlueVine",
  "Mercury",
  "Other Online Bank",
];

const POSITION_COUNTS = ["1 position", "2 positions", "3 positions", "4+ positions"];

const CREDIT_RANGES = ["Below 500", "500 - 550", "550 - 600", "600 - 650", "650 - 700", "700 - 750", "750+"];

const REVENUE_RANGES = [
  "Under $10,000",
  "$10,000 - $15,000",
  "$15,000 - $25,000",
  "$25,000 - $50,000",
  "$50,000 - $100,000",
  "$100,000 - $250,000",
  "$250,000+",
];

const BUSINESS_AGE_OPTIONS = [
  "Less than 3 months",
  "3-5 months",
  "6-12 months",
  "1-2 years",
  "2-5 years",
  "More than 5 years",
];

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

// Calculate fundability score based on answers
function calculateFundabilityScore(answers: QuizAnswers): {
  score: number;
  maxScore: number;
  percentage: number;
  rating: "Excellent" | "Good" | "Fair" | "Needs Improvement";
  factors: { name: string; status: "positive" | "negative" | "neutral"; description: string }[];
} {
  let score = 0;
  const maxScore = 100;
  const factors: { name: string; status: "positive" | "negative" | "neutral"; description: string }[] = [];

  // Revenue (25 points max)
  if (answers.revenue15k === "Yes") {
    score += 25;
    factors.push({
      name: "Monthly Revenue",
      status: "positive",
      description: "Your revenue meets the minimum threshold for most funding programs.",
    });
  } else {
    factors.push({
      name: "Monthly Revenue",
      status: "negative",
      description: "Revenue below $15K/month may limit your funding options.",
    });
  }

  // Time in Business (20 points max)
  if (answers.sixMonthsOld === "Yes") {
    score += 20;
    factors.push({
      name: "Time in Business",
      status: "positive",
      description: "Your business has sufficient operating history.",
    });
  } else {
    factors.push({
      name: "Time in Business",
      status: "negative",
      description: "Less than 6 months may limit traditional funding options.",
    });
  }

  // Banking (15 points max)
  if (answers.onlineBank === "No") {
    score += 15;
    factors.push({
      name: "Banking Relationship",
      status: "positive",
      description: "Traditional banking is preferred by most lenders.",
    });
  } else {
    score += 5;
    factors.push({
      name: "Banking Relationship",
      status: "neutral",
      description: "Online banking may limit some funding options but alternatives exist.",
    });
  }

  // Existing Positions (15 points max)
  if (answers.existingPositions === "No") {
    score += 15;
    factors.push({
      name: "Existing Debt",
      status: "positive",
      description: "No existing positions means more funding capacity.",
    });
  } else {
    const posCount = answers.positionCount;
    if (posCount === "1 position") {
      score += 10;
      factors.push({
        name: "Existing Debt",
        status: "neutral",
        description: "One existing position is manageable for most consolidation programs.",
      });
    } else if (posCount === "2 positions") {
      score += 5;
      factors.push({
        name: "Existing Debt",
        status: "neutral",
        description: "Multiple positions may affect terms but options still exist.",
      });
    } else {
      factors.push({
        name: "Existing Debt",
        status: "negative",
        description: "Multiple positions significantly impact funding options.",
      });
    }
  }

  // Credit Score (15 points max)
  if (answers.creditAbove550 === "Yes") {
    score += 15;
    factors.push({
      name: "Personal Credit",
      status: "positive",
      description: "Credit above 550 qualifies for most business funding programs.",
    });
  } else {
    score += 5;
    factors.push({
      name: "Personal Credit",
      status: "neutral",
      description: "Credit below 550 limits options but revenue-based programs are available.",
    });
  }

  // Consistent Deposits (5 points max)
  if (answers.consistentDeposits === "Yes") {
    score += 5;
    factors.push({
      name: "Cash Flow Consistency",
      status: "positive",
      description: "Consistent deposits demonstrate business stability.",
    });
  } else {
    factors.push({
      name: "Cash Flow Consistency",
      status: "negative",
      description: "Inconsistent deposits may raise concerns for lenders.",
    });
  }

  // NSF/Overdrafts (5 points max)
  if (answers.nsfOverdrafts === "No") {
    score += 5;
    factors.push({
      name: "Account Health",
      status: "positive",
      description: "Clean account history with no overdrafts.",
    });
  } else {
    factors.push({
      name: "Account Health",
      status: "negative",
      description: "NSF fees and overdrafts can impact approval chances.",
    });
  }

  const percentage = Math.round((score / maxScore) * 100);

  let rating: "Excellent" | "Good" | "Fair" | "Needs Improvement";
  if (percentage >= 80) rating = "Excellent";
  else if (percentage >= 60) rating = "Good";
  else if (percentage >= 40) rating = "Fair";
  else rating = "Needs Improvement";

  return { score, maxScore, percentage, rating, factors };
}

export default function FundingQuiz() {
  const [, navigate] = useLocation();
  const { executeRecaptcha } = useGoogleReCaptcha();
  const [currentStep, setCurrentStep] = useState(0);
  const [showInsight, setShowInsight] = useState(false);
  const [currentInsight, setCurrentInsight] = useState<{ title: string; content: string; isPositive: boolean | null } | null>(null);
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  const [formError, setFormError] = useState("");
  const [showConsentError, setShowConsentError] = useState(false);
  const [submittedApplicationId, setSubmittedApplicationId] = useState<number | null>(null);

  const [answers, setAnswers] = useState<QuizAnswers>({
    revenue15k: "",
    revenueAmount: "",
    sixMonthsOld: "",
    businessAge: "",
    onlineBank: "",
    whichOnlineBank: "",
    existingPositions: "",
    positionCount: "",
    creditAbove550: "",
    creditRange: "",
    consistentDeposits: "",
    nsfOverdrafts: "",
    industry: "",
    fundingPurpose: "",
    fullName: "",
    businessName: "",
    email: "",
    phone: "",
    consentTransactional: false,
    consentMarketing: false,
    faxNumber: "",
  });

  const questions: QuizQuestion[] = [
    {
      id: "revenue15k",
      type: "yes_no",
      question: "Does your business generate at least $15,000 per month in revenue?",
      subtext: "This includes all business income deposited into your bank account.",
      icon: <TrendingUp className="w-8 h-8" />,
      insight: {
        yes: "Excellent! $15,000+ monthly revenue opens up most business funding programs. Higher revenue typically means better rates and terms.",
        no: "Most traditional business funding requires minimum $15,000/month in revenue. Don't worry - there may still be options available, and we can help you prepare for future funding.",
      },
      followUp: {
        condition: "yes",
        question: "What's your approximate monthly revenue range?",
        options: REVENUE_RANGES.filter((r) => !r.includes("Under")),
        insight: "This helps us match you with the right funding amount.",
      },
      scoreImpact: { yes: 25, no: 0 },
    },
    {
      id: "sixMonthsOld",
      type: "yes_no",
      question: "Has your business been operating for at least 6 months?",
      subtext: "Time since you started accepting payments and making deposits.",
      icon: <Building2 className="w-8 h-8" />,
      insight: {
        yes: "Great! Six months of business history qualifies you for most funding programs. Longer operating history typically leads to better approval odds.",
        no: "Newer businesses have fewer options, but some programs accept businesses as young as 3 months. You're building the foundation for future funding opportunities.",
      },
      followUp: {
        condition: "yes",
        question: "How long has your business been operating?",
        options: BUSINESS_AGE_OPTIONS.filter((a) => !a.includes("Less than")),
        insight: "Longer operating history can qualify you for larger funding amounts.",
      },
      scoreImpact: { yes: 20, no: 0 },
    },
    {
      id: "onlineBank",
      type: "yes_no",
      question: "Do you use an online-only bank for your business?",
      subtext: "Examples: Chime, Varo, Dave, Cash App, PayPal, Venmo",
      icon: <Landmark className="w-8 h-8" />,
      insight: {
        yes: "Online banks can limit funding options as many lenders prefer traditional banks. Some lenders do work with online banks, but terms may vary.",
        no: "Traditional banking is preferred by most lenders. This gives you access to a wider range of funding options with potentially better terms.",
      },
      followUp: {
        condition: "yes",
        question: "Which online bank do you use?",
        options: ONLINE_BANKS,
        insight: "Different online banks have varying acceptance rates with lenders.",
      },
      scoreImpact: { yes: 5, no: 15 },
    },
    {
      id: "existingPositions",
      type: "yes_no",
      question: "Do you currently have any existing business financing?",
      subtext: "MCAs, term loans, lines of credit, or other business debt payments.",
      icon: <FileText className="w-8 h-8" />,
      insight: {
        yes: "Existing positions don't disqualify you, but they affect available options. Many businesses consolidate existing debt into better terms through refinancing.",
        no: "No existing positions means you have full funding capacity available. This typically results in better rates and terms.",
      },
      followUp: {
        condition: "yes",
        question: "How many active positions do you currently have?",
        options: POSITION_COUNTS,
        insight: "Fewer positions generally means more funding capacity and better consolidation options.",
      },
      scoreImpact: { yes: 5, no: 15 },
    },
    {
      id: "creditAbove550",
      type: "yes_no",
      question: "Is your personal credit score above 550?",
      subtext: "An estimate is fine - we won't pull your credit without permission.",
      icon: <CreditCard className="w-8 h-8" />,
      insight: {
        yes: "Credit above 550 qualifies you for most business funding programs. While personal credit matters, business cash flow often weighs more heavily.",
        no: "Credit below 550 limits some options, but revenue-based funding programs focus more on your business performance than personal credit history.",
      },
      followUp: {
        condition: "yes",
        question: "What's your approximate credit score range?",
        options: CREDIT_RANGES.filter((c) => !c.includes("Below")),
        insight: "Higher credit scores can unlock better rates and terms.",
      },
      scoreImpact: { yes: 15, no: 5 },
    },
    {
      id: "consistentDeposits",
      type: "yes_no",
      question: "Does your business have consistent monthly deposits?",
      subtext: "Regular income coming into your business bank account each month.",
      icon: <PiggyBank className="w-8 h-8" />,
      insight: {
        yes: "Consistent deposits demonstrate business stability and reliable cash flow. This is one of the most important factors lenders evaluate.",
        no: "Inconsistent deposits can raise concerns for lenders. Seasonal businesses may need to provide additional documentation showing revenue patterns.",
      },
      scoreImpact: { yes: 5, no: 0 },
    },
    {
      id: "nsfOverdrafts",
      type: "yes_no",
      question: "Has your business account had NSF fees or negative balances in the past 90 days?",
      subtext: "Insufficient funds fees, overdrafts, or negative daily balances.",
      icon: <AlertCircle className="w-8 h-8" />,
      insight: {
        yes: "Frequent NSF fees and overdrafts can impact approval decisions. Lenders view this as a sign of cash flow management challenges.",
        no: "A clean account history with no overdrafts is a positive signal to lenders. It demonstrates good cash flow management.",
      },
      scoreImpact: { yes: 0, no: 5 },
    },
  ];

  const totalQuestions = questions.length;
  const progress = ((currentStep + 1) / (totalQuestions + 2)) * 100; // +2 for industry and funding purpose

  // Track page view on mount
  useEffect(() => {
    trackPageView("/funding-quiz", "Fundability Quiz");
    initUTMTracking();
  }, []);

  const submitMutation = useMutation({
    mutationFn: async (data: QuizAnswers & { recaptchaToken?: string }) => {
      const referralPartnerId = localStorage.getItem("referralPartnerId");
      const utmParams = getStoredUTMParams();

      // Map revenue range to numeric value
      let monthlyRevenue = 0;
      if (data.revenue15k === "Yes" && data.revenueAmount) {
        const revenueMap: Record<string, number> = {
          "$15,000 - $25,000": 20000,
          "$25,000 - $50,000": 37500,
          "$50,000 - $100,000": 75000,
          "$100,000 - $250,000": 175000,
          "$250,000+": 300000,
        };
        monthlyRevenue = revenueMap[data.revenueAmount] || 15000;
      } else {
        monthlyRevenue = 10000; // Below threshold
      }

      // Map business age
      let timeInBusiness = data.businessAge || (data.sixMonthsOld === "Yes" ? "6-12 months" : "Less than 3 months");

      // Map credit score
      let creditScore = data.creditRange || (data.creditAbove550 === "Yes" ? "550 - 650" : "550 and below");

      const response = await apiRequest("POST", "/api/applications", {
        email: data.email,
        fullName: data.fullName,
        phone: data.phone,
        businessName: data.businessName,
        requestedAmount: "50000", // Default, will be adjusted based on report
        timeInBusiness,
        industry: data.industry,
        monthlyRevenue: monthlyRevenue.toString(),
        averageMonthlyRevenue: monthlyRevenue.toString(),
        creditScore,
        personalCreditScoreRange: creditScore,
        useOfFunds: data.fundingPurpose,
        isCompleted: true,
        recaptchaToken: data.recaptchaToken,
        faxNumber: data.faxNumber,
        ...(referralPartnerId && { referralPartnerId }),
        ...utmParams,
        // Store quiz-specific data as metadata
        quizSource: "fundability-quiz",
        quizAnswers: JSON.stringify({
          onlineBank: data.onlineBank,
          whichOnlineBank: data.whichOnlineBank,
          existingPositions: data.existingPositions,
          positionCount: data.positionCount,
          consistentDeposits: data.consistentDeposits,
          nsfOverdrafts: data.nsfOverdrafts,
        }),
      });
      return response.json();
    },
    onSuccess: (data) => {
      trackIntakeFormSubmitted({
        requestedAmount: "50000",
        creditScore: answers.creditRange || (answers.creditAbove550 === "Yes" ? "550 - 650" : "550 and below"),
        timeInBusiness: answers.businessAge || "6-12 months",
        monthlyRevenue: answers.revenueAmount || "15000",
        industry: answers.industry,
        useOfFunds: answers.fundingPurpose,
      });
      setSubmittedApplicationId(data.id);
      setShowResults(true);
    },
    onError: (error: Error) => {
      setFormError(error.message || "There was an error submitting your information. Please try again.");
    },
  });

  const handleYesNoAnswer = useCallback((questionId: string, answer: "Yes" | "No") => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));

    const question = questions.find((q) => q.id === questionId);
    if (question) {
      const insightContent = answer === "Yes" ? question.insight.yes : question.insight.no;
      // Determine if this answer is positive for funding based on score impact
      const answerScore = answer === "Yes" ? question.scoreImpact.yes : question.scoreImpact.no;
      const alternativeScore = answer === "Yes" ? question.scoreImpact.no : question.scoreImpact.yes;
      const isPositive = answerScore >= alternativeScore;

      setCurrentInsight({
        // Show "Great!" when the answer is good for funding, "Good to know" when it's less favorable
        title: isPositive ? "Great!" : "Good to know",
        content: insightContent || "",
        isPositive,
      });
      setShowInsight(true);

      // Check if there's a follow-up question
      if (question.followUp && question.followUp.condition === answer.toLowerCase()) {
        setTimeout(() => {
          setShowInsight(false);
          setShowFollowUp(true);
        }, 2500);
      } else {
        setTimeout(() => {
          setShowInsight(false);
          goToNextStep();
        }, 2500);
      }
    }
  }, [questions]);

  const handleFollowUpAnswer = useCallback((questionId: string, answer: string) => {
    const followUpFieldMap: Record<string, string> = {
      revenue15k: "revenueAmount",
      sixMonthsOld: "businessAge",
      onlineBank: "whichOnlineBank",
      existingPositions: "positionCount",
      creditAbove550: "creditRange",
    };

    const fieldName = followUpFieldMap[questionId];
    if (fieldName) {
      setAnswers((prev) => ({ ...prev, [fieldName]: answer }));
    }

    setShowFollowUp(false);
    setTimeout(() => goToNextStep(), 300);
  }, []);

  const handleMultipleChoiceAnswer = useCallback((field: keyof QuizAnswers, value: string) => {
    setAnswers((prev) => ({ ...prev, [field]: value }));
    setTimeout(() => goToNextStep(), 400);
  }, []);

  const goToNextStep = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentStep((prev) => prev + 1);
      setIsTransitioning(false);
    }, 250);
  };

  const goToPrevStep = () => {
    if (currentStep > 0) {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentStep((prev) => prev - 1);
        setIsTransitioning(false);
      }, 250);
    }
  };

  const handleSubmit = useCallback(async () => {
    setFormError("");
    setShowConsentError(false);

    if (!answers.fullName.trim()) {
      setFormError("Please enter your full name");
      return;
    }
    if (!answers.businessName.trim()) {
      setFormError("Please enter your business name");
      return;
    }
    if (!answers.email.trim() || !answers.email.includes("@")) {
      setFormError("Please enter a valid email address");
      return;
    }
    if (!answers.phone.trim() || answers.phone.replace(/\D/g, "").length < 10) {
      setFormError("Please enter a valid phone number");
      return;
    }
    if (!answers.consentTransactional) {
      setShowConsentError(true);
      return;
    }

    let recaptchaToken: string | undefined;
    if (executeRecaptcha) {
      try {
        recaptchaToken = await executeRecaptcha("funding_quiz_submit");
      } catch (error) {
        console.error("reCAPTCHA error:", error);
      }
    }

    submitMutation.mutate({ ...answers, recaptchaToken });
  }, [answers, executeRecaptcha, submitMutation]);

  const handleApplyForFunding = () => {
    if (submittedApplicationId) {
      navigate(`/?applicationId=${submittedApplicationId}`);
    } else {
      navigate("/");
    }
  };

  const fundabilityResult = calculateFundabilityScore(answers);

  // Render current question
  const renderQuestion = () => {
    // Show results after submission (check FIRST - takes priority over contact form)
    if (showResults) {
      return renderResults();
    }

    // Show contact form after all questions
    if (showContactForm) {
      return renderContactForm();
    }

    // Industry selection (after main questions)
    if (currentStep === totalQuestions) {
      return (
        <div className="text-center">
          <button
            onClick={goToPrevStep}
            className="absolute top-8 left-8 text-white/70 hover:text-white flex items-center gap-2 transition-colors"
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
                  answers.industry === option ? "bg-white/20" : "bg-transparent hover:bg-white/10"
                }`}
              >
                <input
                  type="radio"
                  name="industry"
                  value={option}
                  checked={answers.industry === option}
                  onChange={() => handleMultipleChoiceAnswer("industry", option)}
                  className="w-5 h-5 mr-4 appearance-none border-2 border-white rounded-full grid place-content-center cursor-pointer
                    before:content-[''] before:w-2.5 before:h-2.5 before:rounded-full before:scale-0 before:transition-transform before:bg-white
                    checked:before:scale-100"
                />
                <span className="text-white text-base md:text-lg">{option}</span>
              </label>
            ))}
          </div>
        </div>
      );
    }

    // Funding purpose selection
    if (currentStep === totalQuestions + 1) {
      return (
        <div className="text-center">
          <button
            onClick={goToPrevStep}
            className="absolute top-8 left-8 text-white/70 hover:text-white flex items-center gap-2 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>
          <h3 className="text-white text-2xl md:text-3xl font-semibold mb-8">
            How would you use the funding?
          </h3>
          <div className="flex flex-col gap-3 max-w-md mx-auto text-left">
            {FUNDING_PURPOSE_OPTIONS.map((option) => (
              <label
                key={option}
                className={`flex items-center cursor-pointer p-4 rounded-lg transition-all duration-200 ${
                  answers.fundingPurpose === option ? "bg-white/20" : "bg-transparent hover:bg-white/10"
                }`}
              >
                <input
                  type="radio"
                  name="fundingPurpose"
                  value={option}
                  checked={answers.fundingPurpose === option}
                  onChange={() => {
                    setAnswers((prev) => ({ ...prev, fundingPurpose: option }));
                    setTimeout(() => setShowContactForm(true), 400);
                  }}
                  className="w-5 h-5 mr-4 appearance-none border-2 border-white rounded-full grid place-content-center cursor-pointer
                    before:content-[''] before:w-2.5 before:h-2.5 before:rounded-full before:scale-0 before:transition-transform before:bg-white
                    checked:before:scale-100"
                />
                <span className="text-white text-base md:text-lg">{option}</span>
              </label>
            ))}
          </div>
        </div>
      );
    }

    // Main quiz questions
    const question = questions[currentStep];
    if (!question) return null;

    return (
      <div className="text-center">
        {currentStep > 0 && (
          <button
            onClick={goToPrevStep}
            className="absolute top-8 left-8 text-white/70 hover:text-white flex items-center gap-2 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>
        )}

        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-white/10 flex items-center justify-center text-white">
          {question.icon}
        </div>

        <h3 className="text-white text-2xl md:text-3xl font-semibold mb-4 leading-tight">
          {question.question}
        </h3>

        {question.subtext && (
          <p className="text-white/70 mb-8 text-base md:text-lg">{question.subtext}</p>
        )}

        <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
          <button
            onClick={() => handleYesNoAnswer(question.id, "Yes")}
            className={`flex-1 py-4 px-8 rounded-lg font-semibold text-lg transition-all duration-200 flex items-center justify-center gap-2 ${
              answers[question.id as keyof QuizAnswers] === "Yes"
                ? "bg-green-500 text-white"
                : "bg-white/10 text-white hover:bg-white/20 border-2 border-white/30"
            }`}
          >
            <CheckCircle className="w-5 h-5" />
            Yes
          </button>
          <button
            onClick={() => handleYesNoAnswer(question.id, "No")}
            className={`flex-1 py-4 px-8 rounded-lg font-semibold text-lg transition-all duration-200 flex items-center justify-center gap-2 ${
              answers[question.id as keyof QuizAnswers] === "No"
                ? "bg-orange-500 text-white"
                : "bg-white/10 text-white hover:bg-white/20 border-2 border-white/30"
            }`}
          >
            <XCircle className="w-5 h-5" />
            No
          </button>
        </div>
      </div>
    );
  };

  const renderInsight = () => {
    if (!currentInsight) return null;

    return (
      <div className="text-center animate-fadeIn">
        <div
          className={`w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center ${
            currentInsight.isPositive ? "bg-green-500/20" : "bg-orange-500/20"
          }`}
        >
          {currentInsight.isPositive ? (
            <CheckCircle className="w-8 h-8 text-green-400" />
          ) : (
            <AlertCircle className="w-8 h-8 text-orange-400" />
          )}
        </div>

        <h3
          className={`text-2xl md:text-3xl font-semibold mb-4 ${
            currentInsight.isPositive ? "text-green-400" : "text-orange-400"
          }`}
        >
          {currentInsight.title}
        </h3>

        <p className="text-white/80 text-base md:text-lg max-w-md mx-auto leading-relaxed">
          {currentInsight.content}
        </p>
      </div>
    );
  };

  const renderFollowUp = () => {
    const question = questions[currentStep];
    if (!question?.followUp) return null;

    return (
      <div className="text-center animate-fadeIn">
        <h3 className="text-white text-xl md:text-2xl font-semibold mb-6">
          {question.followUp.question}
        </h3>
        <p className="text-white/60 mb-6 text-sm">{question.followUp.insight}</p>

        <div className="flex flex-col gap-3 max-w-md mx-auto text-left max-h-[350px] overflow-y-auto pr-2">
          {question.followUp.options.map((option) => (
            <label
              key={option}
              className="flex items-center cursor-pointer p-4 rounded-lg transition-all duration-200 bg-transparent hover:bg-white/10"
            >
              <input
                type="radio"
                name="followUp"
                value={option}
                onChange={() => handleFollowUpAnswer(question.id, option)}
                className="w-5 h-5 mr-4 appearance-none border-2 border-white rounded-full grid place-content-center cursor-pointer
                  before:content-[''] before:w-2.5 before:h-2.5 before:rounded-full before:scale-0 before:transition-transform before:bg-white
                  checked:before:scale-100"
              />
              <span className="text-white text-base">{option}</span>
            </label>
          ))}
        </div>
      </div>
    );
  };

  const renderContactForm = () => (
    <div className="text-center">
      <button
        onClick={() => setShowContactForm(false)}
        className="absolute top-8 left-8 text-white/70 hover:text-white flex items-center gap-2 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Back</span>
      </button>

      <h3 className="text-white text-xl md:text-2xl font-semibold mb-2">
        Get Your Fundability Report
      </h3>
      <p className="text-white/70 mb-6 text-sm md:text-base">
        Enter your details to see your personalized fundability score and recommendations.
      </p>

      <div className="max-w-sm mx-auto space-y-4">
        <input
          type="text"
          placeholder="Your Full Name"
          value={answers.fullName}
          onChange={(e) => setAnswers((prev) => ({ ...prev, fullName: e.target.value }))}
          className="w-full p-4 border-2 border-white/30 bg-white/10 text-white rounded-lg text-base placeholder:text-white/60 focus:outline-none focus:border-white focus:bg-white/15 transition-colors"
        />

        <input
          type="text"
          placeholder="Business Name"
          value={answers.businessName}
          onChange={(e) => setAnswers((prev) => ({ ...prev, businessName: e.target.value }))}
          className="w-full p-4 border-2 border-white/30 bg-white/10 text-white rounded-lg text-base placeholder:text-white/60 focus:outline-none focus:border-white focus:bg-white/15 transition-colors"
        />

        <input
          type="email"
          placeholder="Email Address"
          value={answers.email}
          onChange={(e) => setAnswers((prev) => ({ ...prev, email: e.target.value }))}
          className="w-full p-4 border-2 border-white/30 bg-white/10 text-white rounded-lg text-base placeholder:text-white/60 focus:outline-none focus:border-white focus:bg-white/15 transition-colors"
        />

        <input
          type="tel"
          placeholder="Phone Number"
          value={answers.phone}
          onChange={(e) => setAnswers((prev) => ({ ...prev, phone: formatPhone(e.target.value) }))}
          className="w-full p-4 border-2 border-white/30 bg-white/10 text-white rounded-lg text-base placeholder:text-white/60 focus:outline-none focus:border-white focus:bg-white/15 transition-colors"
        />

        {/* Honeypot field */}
        <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", opacity: 0, height: 0, overflow: "hidden" }}>
          <label htmlFor="faxNumber">Fax Number (leave blank)</label>
          <input
            type="text"
            id="faxNumber"
            name="faxNumber"
            autoComplete="off"
            tabIndex={-1}
            value={answers.faxNumber}
            onChange={(e) => setAnswers((prev) => ({ ...prev, faxNumber: e.target.value }))}
          />
        </div>

        {/* Consent Checkboxes */}
        <div className="pt-2 space-y-3">
          <div className="flex items-start text-left gap-3">
            <input
              type="checkbox"
              id="consentTransactional"
              checked={answers.consentTransactional}
              onChange={(e) => {
                setAnswers((prev) => ({ ...prev, consentTransactional: e.target.checked }));
                setShowConsentError(false);
              }}
              className="w-4 h-4 mt-1 cursor-pointer flex-shrink-0"
            />
            <label htmlFor="consentTransactional" className="text-white/60 text-[11px] leading-relaxed cursor-pointer">
              By checking this box, I consent to receive transactional messages from Today Capital Group related to my funding application and services I have requested. Message frequency may vary. Message & Data rates may apply. Reply HELP for help or STOP to opt-out.
            </label>
          </div>

          <div className="flex items-start text-left gap-3">
            <input
              type="checkbox"
              id="consentMarketing"
              checked={answers.consentMarketing}
              onChange={(e) => setAnswers((prev) => ({ ...prev, consentMarketing: e.target.checked }))}
              className="w-4 h-4 mt-1 cursor-pointer flex-shrink-0"
            />
            <label htmlFor="consentMarketing" className="text-white/60 text-[11px] leading-relaxed cursor-pointer">
              By checking this box, I consent to receive marketing and promotional messages from Today Capital Group. Message frequency may vary. Message & Data rates may apply. Reply HELP for help or STOP to opt-out.
            </label>
          </div>

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
            <div className="mt-2 p-2 bg-red-500/20 border border-red-500/40 rounded">
              <p className="text-red-400 text-sm">Please accept the transactional messages consent to continue</p>
            </div>
          )}
        </div>

        {formError && (
          <div className="p-3 bg-red-500/20 border-2 border-red-500/50 rounded-lg text-center">
            <p className="text-red-400 font-medium text-sm">{formError}</p>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={submitMutation.isPending}
          className="w-full bg-white text-[#192F56] py-4 px-8 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg disabled:bg-white/50 disabled:cursor-not-allowed disabled:transform-none"
        >
          {submitMutation.isPending ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              Calculating...
            </span>
          ) : (
            "See My Fundability Score"
          )}
        </button>
      </div>
    </div>
  );

  const renderResults = () => {
    const getScoreColor = () => {
      if (fundabilityResult.percentage >= 80) return "text-green-400";
      if (fundabilityResult.percentage >= 60) return "text-blue-400";
      if (fundabilityResult.percentage >= 40) return "text-yellow-400";
      return "text-orange-400";
    };

    const getScoreGradient = () => {
      if (fundabilityResult.percentage >= 80) return "from-green-500 to-green-600";
      if (fundabilityResult.percentage >= 60) return "from-blue-500 to-blue-600";
      if (fundabilityResult.percentage >= 40) return "from-yellow-500 to-yellow-600";
      return "from-orange-500 to-orange-600";
    };

    return (
      <div className="text-center">
        <h3 className="text-white text-xl md:text-2xl font-semibold mb-2">
          Your Fundability Report
        </h3>
        <p className="text-white/70 mb-6 text-sm">
          for {answers.businessName}
        </p>

        {/* Score Circle */}
        <div className="relative w-40 h-40 mx-auto mb-6">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="80"
              cy="80"
              r="70"
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="12"
            />
            <circle
              cx="80"
              cy="80"
              r="70"
              fill="none"
              stroke="url(#scoreGradient)"
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={`${(fundabilityResult.percentage / 100) * 440} 440`}
              className="transition-all duration-1000 ease-out"
            />
            <defs>
              <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" className={`stop-color-${getScoreGradient().split(" ")[0]}`} style={{ stopColor: fundabilityResult.percentage >= 80 ? "#22c55e" : fundabilityResult.percentage >= 60 ? "#3b82f6" : fundabilityResult.percentage >= 40 ? "#eab308" : "#f97316" }} />
                <stop offset="100%" className={`stop-color-${getScoreGradient().split(" ")[1]}`} style={{ stopColor: fundabilityResult.percentage >= 80 ? "#16a34a" : fundabilityResult.percentage >= 60 ? "#2563eb" : fundabilityResult.percentage >= 40 ? "#ca8a04" : "#ea580c" }} />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-4xl font-bold ${getScoreColor()}`}>
              {fundabilityResult.percentage}
            </span>
            <span className="text-white/60 text-sm">out of 100</span>
          </div>
        </div>

        <div className={`inline-block px-4 py-2 rounded-full mb-6 bg-gradient-to-r ${getScoreGradient()}`}>
          <span className="text-white font-semibold">{fundabilityResult.rating}</span>
        </div>

        {/* Factors Breakdown */}
        <div className="bg-white/5 rounded-xl p-4 mb-6 text-left max-h-[200px] overflow-y-auto">
          <h4 className="text-white font-semibold mb-3 text-sm">Fundability Factors</h4>
          <div className="space-y-2">
            {fundabilityResult.factors.map((factor, idx) => (
              <div key={idx} className="flex items-start gap-3">
                {factor.status === "positive" ? (
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                ) : factor.status === "negative" ? (
                  <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="text-white text-sm font-medium">{factor.name}</p>
                  <p className="text-white/60 text-xs">{factor.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="bg-white/10 rounded-xl p-6 mb-4">
          <h4 className="text-white font-semibold mb-2">
            {fundabilityResult.percentage >= 60
              ? "You're a strong candidate for funding!"
              : "Let's explore your options"}
          </h4>
          <p className="text-white/70 text-sm mb-4">
            {fundabilityResult.percentage >= 60
              ? "Based on your answers, you qualify for multiple funding programs. Apply now to get personalized offers."
              : "While some factors need attention, we may still have options that work for your business."}
          </p>
          <button
            onClick={handleApplyForFunding}
            className="w-full bg-white text-[#192F56] py-4 px-8 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg flex items-center justify-center gap-2"
          >
            Apply for Funding Today
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

        <button
          onClick={() => navigate("/intake")}
          className="text-white/60 hover:text-white text-sm transition-colors"
        >
          Maybe later
        </button>
      </div>
    );
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "linear-gradient(to bottom, #192F56 0%, #19112D 100%)" }}
    >
      <div
        className="w-full max-w-[600px] p-8 md:p-12 rounded-2xl relative overflow-hidden"
        style={{
          background: "linear-gradient(to bottom, #192F56 0%, #19112D 100%)",
          boxShadow: "0 12px 30px rgba(25, 47, 86, 0.3), 0 4px 15px rgba(0, 0, 0, 0.2)",
          minHeight: "500px",
        }}
      >
        {/* Progress Bar - hide on results */}
        {!showResults && (
          <div className="w-full h-1 bg-white/20 rounded-full mb-8">
            <div
              className="h-full bg-white rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* Question Counter - hide on results and contact form */}
        {!showResults && !showContactForm && !showInsight && !showFollowUp && (
          <div className="text-center mb-4">
            <span className="text-white/50 text-sm">
              Question {Math.min(currentStep + 1, totalQuestions + 2)} of {totalQuestions + 2}
            </span>
          </div>
        )}

        {/* Main Content */}
        <div className={`transition-all duration-300 ${isTransitioning ? "opacity-0" : "opacity-100"}`}>
          {showInsight ? renderInsight() : showFollowUp ? renderFollowUp() : renderQuestion()}
        </div>

        {/* Footer */}
        {!showResults && (
          <div className="mt-8 pt-6 border-t border-white/10">
            <p className="text-white/50 text-xs text-center">
              Your information is secure and will only be used to provide funding recommendations.
            </p>
          </div>
        )}
      </div>

      {/* Animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
