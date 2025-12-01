import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Calendar,
  Activity,
  Building2,
  CreditCard,
  Briefcase,
  Phone,
  Shield,
  Clock,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { trackEvent } from "@/lib/analytics";

// --- TYPES ---
interface FormData {
  name: string;
  businessName: string;
  industry: string;
  timeInBusiness: string;
  monthlyRevenue: string;
  creditScore: string;
  loanAmount: string;
}

interface AlternativeOption {
  name: string;
  description: string;
  icon: "credit-card" | "trending-up" | "shield" | "clock";
  highlight?: boolean;
}

interface FoundationCTA {
  buttonText: string;
  url: string;
  description: string;
}

interface FundingProfile {
  tier: string;
  product: string;
  maxAmount: number;
  rates: string;
  colorClass: string;
  bgClass: string;
  message: string;
  isFoundationBuilding?: boolean;
  foundationReason?: string;
  alternativeOptions?: AlternativeOption[];
  foundationCTA?: FoundationCTA;
}

// --- INDUSTRY OPTIONS ---
const INDUSTRIES = [
  { value: "Construction", label: "Construction / Trades" },
  { value: "Retail", label: "Retail / E-Commerce" },
  { value: "Medical", label: "Medical / Dental" },
  { value: "Restaurant", label: "Restaurant / Hospitality" },
  { value: "Trucking", label: "Trucking / Logistics" },
  { value: "Consulting", label: "Consulting / Services" },
  { value: "Real Estate", label: "Real Estate Investing" },
  { value: "Manufacturing", label: "Manufacturing" },
  { value: "Technology", label: "Technology / Software" },
  { value: "Gambling", label: "Gambling / Gaming (Restricted)" },
  { value: "Cannabis", label: "Cannabis / CBD (Restricted)" },
  { value: "Non-Profit", label: "Non-Profit (Restricted)" },
  { value: "Financial Services", label: "Financial Services (Restricted)" },
  { value: "Adult", label: "Adult Entertainment (Restricted)" },
];

// --- THE LOGIC ENGINE ---
const calculateFundingProfile = (data: FormData): FundingProfile => {
  const rev = parseInt(data.monthlyRevenue) || 0;
  const credit = parseInt(data.creditScore) || 0;
  const time = parseInt(data.timeInBusiness) || 0; // in months

  // Restricted Industries
  const restricted = [
    "Gambling",
    "Adult",
    "Cannabis",
    "Non-Profit",
    "Financial Services",
  ].includes(data.industry);

  // LOGIC GATES - Order matters (more specific first)

  // 1. SBA / Bank Term (The Gold Standard)
  if (time >= 24 && rev >= 40000 && credit >= 680 && !restricted) {
    return {
      tier: "Prime Borrower",
      product: "SBA 7(a) / Bank Term Loan",
      maxAmount: 5000000,
      rates: "Prime + 2-3%",
      colorClass: "text-green-400",
      bgClass: "from-green-900 to-green-950",
      message:
        "You are in the top 10% of applicants. You qualify for the lowest rates and longest terms (10 years+) available on the market.",
    };
  }

  // 2. Fintech / Line of Credit (Mid-Tier)
  if (time >= 12 && rev >= 25000 && credit >= 650 && !restricted) {
    return {
      tier: "Growth Capital",
      product: "Business Line of Credit",
      maxAmount: rev * 3,
      rates: "12% - 25% APR",
      colorClass: "text-purple-400",
      bgClass: "from-purple-900 to-purple-950",
      message:
        "You've graduated from high-risk lending. You qualify for revolving credit lines that you only pay interest on what you use.",
    };
  }

  // 3. Working Capital (decent credit, established business)
  if (time >= 6 && rev >= 10000 && credit >= 650) {
    return {
      tier: "Working Capital",
      product: "Short-Term Business Loan",
      maxAmount: rev * 2,
      rates: "15% - 35% APR",
      colorClass: "text-orange-400",
      bgClass: "from-orange-900 to-orange-950",
      message:
        "You qualify for working capital financing. These are fast-funding options with flexible terms to boost your business.",
    };
  }

  // 4. MCA / Revenue Based (Cash Flow Logic - lower credit but revenue)
  if (time >= 6 && rev >= 10000 && credit < 650) {
    return {
      tier: "Cash Flow Financing",
      product: "Revenue Based Advance (MCA)",
      maxAmount: rev * 1.5,
      rates: "Factor Rate 1.20+",
      colorClass: "text-yellow-400",
      bgClass: "from-yellow-900 to-yellow-950",
      message:
        "Your consistent revenue is your biggest asset right now. We can lend against your cash flow, regardless of your credit score.",
    };
  }

  // 5. Credit Stacking (Startup Logic - good credit, new business)
  if (credit >= 680 && time < 12) {
    return {
      tier: "Startup Capital",
      product: "0% Interest Credit Stacking",
      maxAmount: 150000,
      rates: "0% (12-21 Month Intro)",
      colorClass: "text-blue-400",
      bgClass: "from-blue-900 to-blue-950",
      message:
        "You are the perfect candidate for Credit Stacking. You can bypass the revenue requirements by leveraging your strong personal credit.",
    };
  }

  // Restricted Industry Overrides
  if (restricted) {
    if (credit >= 700) {
      return {
        tier: "Restricted Niche",
        product: "Unsecured Personal Term Loans",
        maxAmount: 100000,
        rates: "8% - 15% APR",
        colorClass: "text-orange-400",
        bgClass: "from-orange-900 to-orange-950",
        message:
          "Your industry is restricted by most banks. We pivot to Personal Term Loans to get you funded without industry scrutiny.",
      };
    } else {
      return {
        tier: "High Risk",
        product: "High Risk MCA / Private Money",
        maxAmount: Math.max(rev * 0.5, 10000),
        rates: "Factor Rate 1.40+",
        colorClass: "text-red-400",
        bgClass: "from-red-900 to-red-950",
        message:
          "Your industry is tough to fund. We have specific private lenders who will work with you, but the cost of capital will be higher.",
      };
    }
  }

  // --- FOUNDATION BUILDING PROFILES ---
  // These are for users who don't qualify for traditional funding yet

  // Good credit but too new and low revenue - Fund&Grow / Credit Stacking path
  if (credit >= 650 && time < 6) {
    return {
      tier: "Foundation Building",
      product: "Business Credit Cards & Credit Stacking",
      maxAmount: 0,
      rates: "0% Intro APR Available",
      colorClass: "text-blue-400",
      bgClass: "from-blue-900 to-blue-950",
      message:
        "Your credit is solid, but most lenders need to see at least 6 months in business. The good news? Your strong credit opens doors to business credit cards with 0% intro rates.",
      isFoundationBuilding: true,
      foundationReason: "Business is less than 6 months old",
      alternativeOptions: [
        {
          name: "Fund&Grow Business Credit",
          description: "Get $50K-$250K in 0% interest business credit cards based on your personal credit score",
          icon: "credit-card",
          highlight: true,
        },
        {
          name: "Credit Stacking Program",
          description: "Strategically open multiple business credit lines to build capital and business credit history",
          icon: "trending-up",
        },
        {
          name: "Business Credit Building",
          description: "Establish trade lines and vendor credit to build your business credit profile for future funding",
          icon: "clock",
        },
      ],
      foundationCTA: {
        buttonText: "Get 0% Business Credit Cards",
        url: "https://www.fundandgrow.com/partner/todaycapital",
        description: "Fund&Grow specializes in helping entrepreneurs access $50K-$250K in 0% interest business credit.",
      },
    };
  }

  // Moderate credit (550-649) - Credit repair + secured options
  if (credit >= 550 && credit < 650) {
    return {
      tier: "Credit Building",
      product: "Credit Optimization & Secured Funding",
      maxAmount: 0,
      rates: "Varies by Program",
      colorClass: "text-amber-400",
      bgClass: "from-amber-900 to-amber-950",
      message:
        "Your credit score is close to where it needs to be for traditional funding. With some targeted credit optimization, you could qualify for significantly better options in 60-90 days.",
      isFoundationBuilding: true,
      foundationReason: "Credit score below 650",
      alternativeOptions: [
        {
          name: "Credit Repair & Optimization",
          description: "Professional credit repair to remove negative items and optimize your score for funding approval",
          icon: "shield",
          highlight: true,
        },
        {
          name: "Secured Business Credit Card",
          description: "Build business credit with a secured card that reports to business credit bureaus",
          icon: "credit-card",
        },
        {
          name: "Revenue-Based Micro Loans",
          description: "If you have consistent revenue, some lenders will work with lower credit scores",
          icon: "trending-up",
        },
      ],
      foundationCTA: {
        buttonText: "Start Credit Repair",
        url: "https://www.creditsaint.com/?affiliate=todaycapital",
        description: "Credit Saint has helped thousands improve their scores by 40-100+ points in 90 days.",
      },
    };
  }

  // Low credit (below 550) - Credit repair focused
  if (credit < 550 && credit > 0) {
    return {
      tier: "Credit Restoration",
      product: "Credit Repair & Foundation Building",
      maxAmount: 0,
      rates: "N/A - Focus on Credit First",
      colorClass: "text-rose-400",
      bgClass: "from-rose-900 to-rose-950",
      message:
        "Let's be direct: most business funding requires a credit score above 550. The best path forward is to focus on rebuilding your credit first. This typically takes 3-6 months but sets you up for real funding options.",
      isFoundationBuilding: true,
      foundationReason: "Credit score needs improvement",
      alternativeOptions: [
        {
          name: "Professional Credit Repair",
          description: "Work with specialists to dispute errors and negotiate with creditors to boost your score",
          icon: "shield",
          highlight: true,
        },
        {
          name: "Secured Credit Builder",
          description: "Start with a secured card to establish positive payment history",
          icon: "credit-card",
        },
        {
          name: "Credit Monitoring & Coaching",
          description: "Get personalized guidance on the fastest path to improve your credit score",
          icon: "trending-up",
        },
      ],
      foundationCTA: {
        buttonText: "Fix My Credit Now",
        url: "https://www.creditrepair.com/?affiliate=todaycapital",
        description: "CreditRepair.com offers a free consultation and has repaired millions of credit reports.",
      },
    };
  }

  // Low/No revenue but decent credit - Need to build revenue first
  if (rev < 10000 && credit >= 600 && time >= 6) {
    return {
      tier: "Revenue Building",
      product: "Business Credit Cards & Growth Capital",
      maxAmount: 0,
      rates: "0% Intro Available",
      colorClass: "text-cyan-400",
      bgClass: "from-cyan-900 to-cyan-950",
      message:
        "Your credit is in good shape, but most business lenders require at least $10K/month in revenue. Your best option right now is leveraging your personal credit for business credit cards while you grow revenue.",
      isFoundationBuilding: true,
      foundationReason: "Monthly revenue below $10,000",
      alternativeOptions: [
        {
          name: "0% Business Credit Cards",
          description: "Use your personal credit to access $25K-$150K in 0% intro APR business credit cards",
          icon: "credit-card",
          highlight: true,
        },
        {
          name: "Microloans & Grants",
          description: "SBA microloans and small business grants for businesses under $10K/month revenue",
          icon: "trending-up",
        },
        {
          name: "Invoice Factoring",
          description: "If you have outstanding invoices, convert them to immediate cash flow",
          icon: "clock",
        },
      ],
      foundationCTA: {
        buttonText: "Get 0% Business Credit Cards",
        url: "https://www.fundandgrow.com/partner/todaycapital",
        description: "Fund&Grow helps you access $50K-$250K in 0% credit while you build revenue.",
      },
    };
  }

  // Default fallback - very new with low credit
  return {
    tier: "Getting Started",
    product: "Foundation Building Program",
    maxAmount: 0,
    rates: "Focus on Building First",
    colorClass: "text-slate-400",
    bgClass: "from-slate-800 to-slate-900",
    message:
      "Traditional business funding typically requires either established revenue (6+ months, $10K+/month) or strong personal credit (650+). Let's focus on building the foundation that will unlock real funding options.",
    isFoundationBuilding: true,
    foundationReason: "Building business and credit foundation",
    alternativeOptions: [
      {
        name: "Credit Building Program",
        description: "Start building or repairing your personal credit to unlock future funding options",
        icon: "shield",
        highlight: true,
      },
      {
        name: "Business Credit Establishment",
        description: "Set up your business credit profile with starter trade lines and vendor accounts",
        icon: "credit-card",
      },
      {
        name: "Free Credit Score Check",
        description: "Check your credit score for free and get personalized improvement recommendations",
        icon: "trending-up",
      },
    ],
    foundationCTA: {
      buttonText: "Start Building Credit",
      url: "https://www.creditrepair.com/?affiliate=todaycapital",
      description: "The first step is understanding and improving your credit. Get a free consultation.",
    },
  };
};

// --- FORMAT CURRENCY ---
const formatCurrency = (num: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(num);
};

// --- SLIDE COMPONENTS ---
const ProgressIndicator = ({
  current,
  total,
}: {
  current: number;
  total: number;
}) => (
  <div className="absolute top-0 left-0 w-full flex gap-1 p-3 z-50">
    {Array.from({ length: total }).map((_, i) => (
      <div
        key={i}
        className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden"
      >
        <div
          className={`h-full bg-white transition-all duration-300 ${
            i < current ? "w-full" : i === current ? "w-full animate-pulse" : "w-0"
          }`}
        />
      </div>
    ))}
  </div>
);

// --- MAIN COMPONENT ---
export default function FundingReport() {
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<"input" | "presentation">("input");
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showServiceOptions, setShowServiceOptions] = useState(false);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [interestSubmitted, setInterestSubmitted] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    businessName: "",
    industry: "Construction",
    timeInBusiness: "",
    monthlyRevenue: "",
    creditScore: "",
    loanAmount: "",
  });

  // Parse URL params for personalization
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has("creditScore") || params.has("monthlyRevenue")) {
      setFormData({
        name: params.get("name") || "Partner",
        businessName: params.get("businessName") || "Your Business",
        industry: params.get("industry") || "Construction",
        timeInBusiness: params.get("timeInBusiness") || "12",
        monthlyRevenue: params.get("monthlyRevenue") || "0",
        creditScore: params.get("creditScore") || "0",
        loanAmount: params.get("loanAmount") || "0",
      });
      setMode("presentation");
    }
  }, []);

  const profile = useMemo(
    () => calculateFundingProfile(formData),
    [formData]
  );

  const handleNext = () => {
    if (currentSlide < 4) setCurrentSlide((c) => c + 1);
  };

  const handlePrev = () => {
    if (currentSlide > 0) setCurrentSlide((c) => c - 1);
  };

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentSlide(0);
    setMode("presentation");
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // --- INPUT MODE ---
  if (mode === "input") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#192F56] to-[#19112D] text-white p-4 md:p-6 flex flex-col justify-center">
        <div className="max-w-lg mx-auto w-full">
          <div className="mb-8 text-center md:text-left">
            <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-blue-500">
              Funding Outlook
            </h1>
            <p className="text-gray-400 mt-2">
              Generate your personalized lending profile in seconds.
            </p>
          </div>

          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardContent className="p-6">
              <form onSubmit={handleStart} className="space-y-5">
                <div>
                  <Label className="text-xs text-gray-400 uppercase tracking-wide">
                    Your Name
                  </Label>
                  <Input
                    required
                    type="text"
                    className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-gray-500 focus:border-green-500"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <Label className="text-xs text-gray-400 uppercase tracking-wide">
                    Business Name
                  </Label>
                  <Input
                    type="text"
                    className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-gray-500 focus:border-green-500"
                    value={formData.businessName}
                    onChange={(e) =>
                      handleInputChange("businessName", e.target.value)
                    }
                    placeholder="Acme Corp LLC"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-gray-400 uppercase tracking-wide">
                      Monthly Revenue
                    </Label>
                    <Input
                      required
                      type="number"
                      className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-gray-500 focus:border-green-500"
                      value={formData.monthlyRevenue}
                      onChange={(e) =>
                        handleInputChange("monthlyRevenue", e.target.value)
                      }
                      placeholder="25000"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-400 uppercase tracking-wide">
                      Requested Amount
                    </Label>
                    <Input
                      required
                      type="number"
                      className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-gray-500 focus:border-green-500"
                      value={formData.loanAmount}
                      onChange={(e) =>
                        handleInputChange("loanAmount", e.target.value)
                      }
                      placeholder="50000"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-gray-400 uppercase tracking-wide">
                      Credit Score
                    </Label>
                    <Input
                      required
                      type="number"
                      className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-gray-500 focus:border-green-500"
                      value={formData.creditScore}
                      onChange={(e) =>
                        handleInputChange("creditScore", e.target.value)
                      }
                      placeholder="680"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-400 uppercase tracking-wide">
                      Months in Business
                    </Label>
                    <Input
                      required
                      type="number"
                      className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-gray-500 focus:border-green-500"
                      value={formData.timeInBusiness}
                      onChange={(e) =>
                        handleInputChange("timeInBusiness", e.target.value)
                      }
                      placeholder="12"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-gray-400 uppercase tracking-wide">
                    Industry
                  </Label>
                  <Select
                    value={formData.industry}
                    onValueChange={(value) =>
                      handleInputChange("industry", value)
                    }
                  >
                    <SelectTrigger className="mt-1 bg-white/10 border-white/20 text-white">
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent>
                      {INDUSTRIES.map((ind) => (
                        <SelectItem key={ind.value} value={ind.value}>
                          {ind.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-white text-[#192F56] font-bold py-6 text-lg hover:bg-gray-100 transition mt-4"
                >
                  Generate My Profile
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="mt-6 p-4 bg-white/5 border border-white/10 rounded-lg text-xs text-gray-400">
            <strong className="text-gray-300">Broker Tip:</strong> Send
            personalized reports to leads by appending their data to the URL:
            <code className="block mt-2 text-green-400/80 break-all">
              /report?name=Sam&creditScore=720&monthlyRevenue=50000&timeInBusiness=24&industry=Construction&loanAmount=100000
            </code>
          </div>
        </div>
      </div>
    );
  }

  // --- PRESENTATION MODE SLIDES ---
  const slides = [
    // Slide 0: Intro
    <div
      key="intro"
      className="h-full w-full flex flex-col justify-center items-center p-6 text-center bg-gradient-to-br from-indigo-900 to-black"
    >
      <div className="mb-6 animate-pulse">
        <Activity size={64} className="text-indigo-400" />
      </div>
      <h2 className="text-4xl md:text-5xl font-bold mb-2">
        Hello, {formData.name}
      </h2>
      <p className="text-xl text-gray-300">We've analyzed your funding DNA.</p>
      <div className="mt-8 text-sm text-gray-500 uppercase tracking-widest flex items-center gap-2">
        <span>Tap right to continue</span>
        <ArrowRight className="h-4 w-4" />
      </div>
    </div>,

    // Slide 1: Vitals
    <div
      key="vitals"
      className="h-full w-full flex flex-col justify-center items-center p-6 text-center bg-black"
    >
      <h3 className="text-2xl font-bold mb-8 text-gray-400 uppercase tracking-widest">
        Your Vitals
      </h3>

      <div className="w-full max-w-sm space-y-4">
        <div className="bg-gray-900 p-4 rounded-xl border border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <DollarSign className="text-green-400 h-6 w-6" />
            <div className="text-left">
              <div className="text-xs text-gray-500">Revenue</div>
              <div className="font-bold text-lg">
                {formatCurrency(parseInt(formData.monthlyRevenue) || 0)}/mo
              </div>
            </div>
          </div>
          {parseInt(formData.monthlyRevenue) >= 10000 ? (
            <CheckCircle className="text-green-500 h-5 w-5" />
          ) : (
            <AlertTriangle className="text-yellow-500 h-5 w-5" />
          )}
        </div>

        <div className="bg-gray-900 p-4 rounded-xl border border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TrendingUp className="text-blue-400 h-6 w-6" />
            <div className="text-left">
              <div className="text-xs text-gray-500">Credit Score</div>
              <div className="font-bold text-lg">{formData.creditScore} FICO</div>
            </div>
          </div>
          {parseInt(formData.creditScore) >= 650 ? (
            <CheckCircle className="text-green-500 h-5 w-5" />
          ) : (
            <AlertTriangle className="text-yellow-500 h-5 w-5" />
          )}
        </div>

        <div className="bg-gray-900 p-4 rounded-xl border border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="text-purple-400 h-6 w-6" />
            <div className="text-left">
              <div className="text-xs text-gray-500">Time in Business</div>
              <div className="font-bold text-lg">
                {formData.timeInBusiness} Months
              </div>
            </div>
          </div>
          {parseInt(formData.timeInBusiness) >= 12 ? (
            <CheckCircle className="text-green-500 h-5 w-5" />
          ) : (
            <AlertTriangle className="text-yellow-500 h-5 w-5" />
          )}
        </div>

        <div className="bg-gray-900 p-4 rounded-xl border border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Briefcase className="text-orange-400 h-6 w-6" />
            <div className="text-left">
              <div className="text-xs text-gray-500">Industry</div>
              <div className="font-bold text-lg">{formData.industry}</div>
            </div>
          </div>
          {!["Gambling", "Adult", "Cannabis", "Non-Profit", "Financial Services"].includes(formData.industry) ? (
            <CheckCircle className="text-green-500 h-5 w-5" />
          ) : (
            <AlertTriangle className="text-orange-500 h-5 w-5" />
          )}
        </div>
      </div>
    </div>,

    // Slide 2: The Diagnosis
    <div
      key="diagnosis"
      className={`h-full w-full flex flex-col justify-center items-center p-6 text-center bg-gradient-to-br ${profile.bgClass} relative`}
    >
      <div className="absolute inset-0 bg-black/30" />
      <div className="relative z-10 max-w-md">
        <div className="text-sm uppercase tracking-widest mb-4 opacity-80">
          Your Best Fit
        </div>
        <h1
          className={`text-4xl md:text-5xl font-black mb-4 ${profile.colorClass} leading-tight`}
        >
          {profile.product}
        </h1>
        <div className="inline-block px-4 py-2 rounded-full border border-white/20 bg-white/10 text-sm backdrop-blur-md mb-6">
          Tier: {profile.tier}
        </div>
        <p className="text-lg font-medium leading-relaxed opacity-90">
          "{profile.message}"
        </p>
      </div>
    </div>,

    // Slide 3: The Offer (or Alternative Options for Foundation Building)
    profile.isFoundationBuilding ? (
      <div
        key="alternatives"
        className="h-full w-full flex flex-col justify-center items-center p-6 text-center bg-black overflow-y-auto"
      >
        <h3 className="text-gray-500 uppercase text-sm tracking-widest mb-2">
          Your Best Path Forward
        </h3>
        <p className="text-gray-400 text-sm mb-6 max-w-sm">
          {profile.foundationReason}
        </p>

        <div className="w-full max-w-sm space-y-3">
          {profile.alternativeOptions?.map((option, index) => (
            <div
              key={index}
              className={`p-4 rounded-xl border ${
                option.highlight
                  ? `bg-gradient-to-r ${profile.bgClass} border-white/20`
                  : "bg-gray-900 border-gray-800"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${option.highlight ? "bg-white/20" : "bg-gray-800"}`}>
                  {option.icon === "credit-card" && <CreditCard className={`h-5 w-5 ${profile.colorClass}`} />}
                  {option.icon === "trending-up" && <TrendingUp className={`h-5 w-5 ${profile.colorClass}`} />}
                  {option.icon === "shield" && <Shield className={`h-5 w-5 ${profile.colorClass}`} />}
                  {option.icon === "clock" && <Clock className={`h-5 w-5 ${profile.colorClass}`} />}
                </div>
                <div className="text-left flex-1">
                  <div className="font-bold text-white flex items-center gap-2">
                    {option.name}
                    {option.highlight && (
                      <span className="text-xs px-2 py-0.5 bg-white/20 rounded-full">
                        Recommended
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400 mt-1">{option.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    ) : (
      <div
        key="offer"
        className="h-full w-full flex flex-col justify-center items-center p-6 text-center bg-black"
      >
        <h3 className="text-gray-500 uppercase text-sm tracking-widest mb-2">
          Funding Capacity
        </h3>

        <div className="text-5xl md:text-6xl font-black text-white mb-2">
          {formatCurrency(profile.maxAmount)}
        </div>
        <div className="text-gray-400 mb-10 text-sm">Estimated Approval Amount</div>

        <div className="w-full max-w-sm bg-gray-900 rounded-xl p-6 border border-gray-800">
          <div className="flex justify-between items-center mb-4 border-b border-gray-800 pb-4">
            <span className="text-gray-400">Est. Rate</span>
            <span className={`font-bold ${profile.colorClass}`}>
              {profile.rates}
            </span>
          </div>
          <div className="flex justify-between items-center mb-4 border-b border-gray-800 pb-4">
            <span className="text-gray-400">Time to Fund</span>
            <span className="font-bold text-white">24 - 72 Hours</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400">You Requested</span>
            <span
              className={`font-bold ${
                parseInt(formData.loanAmount) > profile.maxAmount
                  ? "text-gray-500 line-through"
                  : "text-white"
              }`}
            >
              {formatCurrency(parseInt(formData.loanAmount) || 0)}
            </span>
          </div>
          {parseInt(formData.loanAmount) > profile.maxAmount && (
            <div className="mt-4 text-xs text-yellow-500 bg-yellow-900/20 p-3 rounded-lg flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>
                Market Reality: Lenders typically cap funding at{" "}
                {profile.product.includes("MCA") ? "1.5x" : "2-3x"} monthly
                revenue for your profile.
              </span>
            </div>
          )}
        </div>
      </div>
    ),

    // Slide 4: CTA (different for Foundation Building - interest capture flow)
    profile.isFoundationBuilding && profile.alternativeOptions ? (
      <div
        key="cta-foundation"
        className={`h-full w-full flex flex-col justify-center items-center p-6 text-center bg-gradient-to-t ${profile.bgClass} overflow-y-auto`}
      >
        {interestSubmitted ? (
          // Thank you state after selecting a service
          <>
            <CheckCircle className="h-16 w-16 text-green-400 mb-6" />
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Thank You!
            </h2>
            <p className="text-gray-300 mb-4 max-w-sm">
              We've noted your interest in <strong className="text-white">{selectedService}</strong>.
            </p>
            <p className="text-gray-400 text-sm mb-8 max-w-sm">
              We'll reach out soon with more information about how this service can help you build your foundation for funding.
            </p>
            <button
              className="text-sm text-gray-500 hover:text-gray-300 underline transition"
              onClick={() => {
                const params = new URLSearchParams({
                  name: formData.name,
                  businessName: formData.businessName,
                  industry: formData.industry,
                  timeInBusiness: formData.timeInBusiness,
                  monthlyRevenue: formData.monthlyRevenue,
                  creditScore: formData.creditScore,
                  loanAmount: formData.loanAmount,
                });
                setLocation(`/update?${params.toString()}`);
              }}
            >
              Update My Information
            </button>
          </>
        ) : showServiceOptions ? (
          // Service selection state
          <>
            <h2 className="text-2xl md:text-3xl font-bold mb-2">
              Which service interests you?
            </h2>
            <p className="text-gray-400 text-sm mb-6 max-w-sm">
              Select the option that best fits your needs
            </p>
            <div className="w-full max-w-sm space-y-3 mb-6">
              {profile.alternativeOptions.map((option, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setSelectedService(option.name);
                    setInterestSubmitted(true);
                    // Here you could also send this to your backend/CRM
                    console.log("Interest captured:", {
                      service: option.name,
                      user: formData.name,
                      email: formData.businessName,
                      tier: profile.tier,
                    });
                  }}
                  className={`w-full p-4 rounded-xl border text-left transition-all hover:scale-[1.02] ${
                    option.highlight
                      ? "bg-white/10 border-white/30 hover:bg-white/20"
                      : "bg-gray-900/50 border-gray-700 hover:bg-gray-800/50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${option.highlight ? "bg-white/20" : "bg-gray-800"}`}>
                      {option.icon === "credit-card" && <CreditCard className={`h-5 w-5 ${profile.colorClass}`} />}
                      {option.icon === "trending-up" && <TrendingUp className={`h-5 w-5 ${profile.colorClass}`} />}
                      {option.icon === "shield" && <Shield className={`h-5 w-5 ${profile.colorClass}`} />}
                      {option.icon === "clock" && <Clock className={`h-5 w-5 ${profile.colorClass}`} />}
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-white flex items-center gap-2">
                        {option.name}
                        {option.highlight && (
                          <span className="text-xs px-2 py-0.5 bg-white/20 rounded-full">
                            Recommended
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-400 mt-1">{option.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <button
              className="text-sm text-gray-500 hover:text-gray-300 underline transition"
              onClick={() => setShowServiceOptions(false)}
            >
              Go Back
            </button>
          </>
        ) : (
          // Initial state with partner CTA
          <>
            <Sparkles className={`h-16 w-16 ${profile.colorClass} mb-6`} />
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Build Your Foundation
            </h2>
            <p className="text-gray-300 mb-4 max-w-sm">
              While traditional funding isn't available yet, we have partner services that can help you build toward your goals.
            </p>
            
            {profile.foundationCTA && (
              <div className="w-full max-w-sm mb-6">
                <p className="text-gray-400 text-sm mb-4 text-center">
                  {profile.foundationCTA.description}
                </p>
                <Button
                  data-testid="button-partner-cta"
                  className="w-full bg-white hover:bg-gray-100 text-gray-900 font-bold py-6 text-lg shadow-lg"
                  onClick={() => {
                    trackEvent("partner_cta_clicked", {
                      partner: profile.foundationCTA?.buttonText,
                      url: profile.foundationCTA?.url,
                      tier: profile.tier,
                      creditScore: formData.creditScore,
                      userName: formData.name,
                    });
                    window.open(profile.foundationCTA?.url, "_blank", "noopener,noreferrer");
                  }}
                >
                  {profile.foundationCTA.buttonText}
                  <ExternalLink className="ml-2 h-5 w-5" />
                </Button>
              </div>
            )}

            <p className="text-gray-500 text-sm mb-4 max-w-sm text-center">
              Or explore more options tailored to your situation
            </p>

            <Button
              data-testid="button-explore-options"
              variant="outline"
              className="w-full max-w-xs border-white/30 text-white hover:bg-white/10 font-medium py-6 text-lg mb-4"
              onClick={() => setShowServiceOptions(true)}
            >
              <CheckCircle className="mr-2 h-5 w-5" />
              Explore More Options
            </Button>

            <button
              data-testid="link-update-info"
              className="text-sm text-gray-500 hover:text-gray-300 underline transition"
              onClick={() => {
                const params = new URLSearchParams({
                  name: formData.name,
                  businessName: formData.businessName,
                  industry: formData.industry,
                  timeInBusiness: formData.timeInBusiness,
                  monthlyRevenue: formData.monthlyRevenue,
                  creditScore: formData.creditScore,
                  loanAmount: formData.loanAmount,
                });
                setLocation(`/update?${params.toString()}`);
              }}
            >
              Update My Information
            </button>
          </>
        )}
      </div>
    ) : (
      <div
        key="cta"
        className="h-full w-full flex flex-col justify-center items-center p-6 text-center bg-gradient-to-t from-green-900 to-black"
      >
        <Building2 className="h-16 w-16 text-green-400 mb-6" />
        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          Unlock This Capital
        </h2>
        <p className="text-gray-400 mb-8 max-w-sm">
          Your profile is pre-qualified for the{" "}
          <strong className="text-white">{profile.product}</strong> program.
        </p>

        <Button
          data-testid="button-start-application"
          className="w-full max-w-xs bg-green-500 hover:bg-green-600 text-black font-bold py-6 text-lg shadow-lg shadow-green-900/50 mb-4"
          onClick={() => {
            trackEvent("funding_report_cta_clicked", {
              action: "start_application",
              tier: profile.tier,
              product: profile.product,
              maxAmount: profile.maxAmount,
              userName: formData.name,
            });
            window.open("https://app.todaycapitalgroup.com/", "_blank", "noopener,noreferrer");
          }}
        >
          <Phone className="mr-2 h-5 w-5" />
          Start My Application
        </Button>

        <button
          className="text-sm text-gray-500 hover:text-gray-300 underline transition"
          onClick={() => {
            const params = new URLSearchParams({
              name: formData.name,
              businessName: formData.businessName,
              industry: formData.industry,
              timeInBusiness: formData.timeInBusiness,
              monthlyRevenue: formData.monthlyRevenue,
              creditScore: formData.creditScore,
              loanAmount: formData.loanAmount,
            });
            setLocation(`/update?${params.toString()}`);
          }}
        >
          Update My Information
        </button>
      </div>
    ),
  ];

  // --- PRESENTATION MODE RENDER ---
  return (
    <div className="fixed inset-0 bg-black flex flex-col text-white overflow-hidden">
      <ProgressIndicator current={currentSlide} total={slides.length} />

      <div className="flex-1 relative">
        {/* Navigation Tap Zones */}
        <div
          className="absolute inset-y-0 left-0 w-1/3 z-20 cursor-pointer"
          onClick={handlePrev}
        />
        <div
          className="absolute inset-y-0 right-0 w-2/3 z-20 cursor-pointer"
          onClick={handleNext}
        />

        {/* Navigation Buttons - Always visible */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            className={`h-12 w-12 rounded-full border-white/30 text-white transition-all ${
              currentSlide === 0
                ? "bg-white/5 opacity-50 cursor-not-allowed"
                : "bg-white/10 hover:bg-white/20 hover:scale-105"
            }`}
            onClick={handlePrev}
            disabled={currentSlide === 0}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <div className="flex items-center gap-2 px-4">
            {Array.from({ length: slides.length }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentSlide(i)}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === currentSlide
                    ? "bg-white w-4"
                    : "bg-white/30 hover:bg-white/50"
                }`}
              />
            ))}
          </div>

          <Button
            variant="outline"
            size="icon"
            className={`h-12 w-12 rounded-full border-white/30 text-white transition-all ${
              currentSlide === slides.length - 1
                ? "bg-white/5 opacity-50 cursor-not-allowed"
                : "bg-white/10 hover:bg-white/20 hover:scale-105"
            }`}
            onClick={handleNext}
            disabled={currentSlide === slides.length - 1}
          >
            <ArrowRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Slide Content */}
        <div className="h-full animate-in fade-in duration-300">
          {slides[currentSlide]}
        </div>
      </div>
    </div>
  );
}
