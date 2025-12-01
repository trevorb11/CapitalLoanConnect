import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import {
  ArrowRight,
  RefreshCw,
  User,
  Building2,
  Mail,
  Phone,
  DollarSign,
  TrendingUp,
  Calendar,
  Briefcase,
} from "lucide-react";

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

// --- CREDIT SCORE OPTIONS ---
const CREDIT_SCORE_RANGES = [
  { value: "500", label: "500 and below" },
  { value: "525", label: "500-549" },
  { value: "575", label: "550-599" },
  { value: "625", label: "600-649" },
  { value: "685", label: "650-719" },
  { value: "750", label: "720 or above" },
];

// --- TIME IN BUSINESS OPTIONS ---
const TIME_IN_BUSINESS_OPTIONS = [
  { value: "2", label: "Less than 3 months" },
  { value: "4", label: "3-5 months" },
  { value: "9", label: "6-12 months" },
  { value: "18", label: "1-2 years" },
  { value: "42", label: "2-5 years" },
  { value: "72", label: "More than 5 years" },
];

// --- MONTHLY REVENUE OPTIONS ---
const MONTHLY_REVENUE_OPTIONS = [
  { value: "500", label: "Less than $1,000" },
  { value: "3000", label: "$1,000 – $5,000" },
  { value: "10000", label: "$5,000 – $15,000" },
  { value: "17500", label: "$15,000 – $20,000" },
  { value: "25000", label: "$20,000 – $30,000" },
  { value: "40000", label: "$30,000 – $50,000" },
  { value: "75000", label: "$50,000 – $100,000" },
  { value: "150000", label: "$100,000 – $200,000" },
  { value: "250000", label: "$200,000+" },
];

interface FormData {
  name: string;
  businessName: string;
  email: string;
  phone: string;
  industry: string;
  timeInBusiness: string;
  monthlyRevenue: string;
  creditScore: string;
  loanAmount: string;
}

// Format phone number as user types
function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export default function UpdateInfo() {
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState<FormData>({
    name: "",
    businessName: "",
    email: "",
    phone: "",
    industry: "Construction",
    timeInBusiness: "",
    monthlyRevenue: "",
    creditScore: "",
    loanAmount: "",
  });

  // Parse URL params to pre-fill the form
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setFormData({
      name: params.get("name") || "",
      businessName: params.get("businessName") || "",
      email: params.get("email") || "",
      phone: params.get("phone") || "",
      industry: params.get("industry") || "Construction",
      timeInBusiness: params.get("timeInBusiness") || "",
      monthlyRevenue: params.get("monthlyRevenue") || "",
      creditScore: params.get("creditScore") || "",
      loanAmount: params.get("loanAmount") || "",
    });
  }, []);

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handlePhoneChange = (value: string) => {
    setFormData((prev) => ({ ...prev, phone: formatPhone(value) }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Build URL params for the report page
    const params = new URLSearchParams({
      name: formData.name,
      businessName: formData.businessName,
      industry: formData.industry,
      timeInBusiness: formData.timeInBusiness,
      monthlyRevenue: formData.monthlyRevenue,
      creditScore: formData.creditScore,
      loanAmount: formData.loanAmount,
    });

    // Navigate to report page with updated parameters
    setLocation(`/report?${params.toString()}`);
  };

  // Find the closest matching option for select fields
  const findClosestOption = (value: string, options: { value: string }[]): string => {
    if (!value) return "";
    const numValue = parseInt(value);
    if (isNaN(numValue)) return value;

    // Find exact match first
    const exactMatch = options.find(opt => opt.value === value);
    if (exactMatch) return exactMatch.value;

    // Find closest match
    let closest = options[0].value;
    let closestDiff = Math.abs(parseInt(options[0].value) - numValue);

    for (const opt of options) {
      const diff = Math.abs(parseInt(opt.value) - numValue);
      if (diff < closestDiff) {
        closestDiff = diff;
        closest = opt.value;
      }
    }
    return closest;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#192F56] to-[#19112D] text-white p-4 md:p-6 flex flex-col justify-center">
      <div className="max-w-2xl mx-auto w-full">
        <div className="mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-blue-500">
            Update Your Information
          </h1>
          <p className="text-gray-400 mt-2">
            Review and update your details to get an accurate funding profile.
          </p>
        </div>

        <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-white text-lg">Your Details</CardTitle>
            <CardDescription className="text-gray-400">
              Make any changes needed and regenerate your report
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Information Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-300 uppercase tracking-wide border-b border-white/10 pb-2">
                  Contact Information
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-gray-400 uppercase tracking-wide flex items-center gap-2">
                      <User className="h-3 w-3" />
                      Full Name
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
                    <Label className="text-xs text-gray-400 uppercase tracking-wide flex items-center gap-2">
                      <Building2 className="h-3 w-3" />
                      Business Name
                    </Label>
                    <Input
                      type="text"
                      className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-gray-500 focus:border-green-500"
                      value={formData.businessName}
                      onChange={(e) => handleInputChange("businessName", e.target.value)}
                      placeholder="Acme Corp LLC"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-gray-400 uppercase tracking-wide flex items-center gap-2">
                      <Mail className="h-3 w-3" />
                      Email Address
                    </Label>
                    <Input
                      type="email"
                      className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-gray-500 focus:border-green-500"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      placeholder="john@acmecorp.com"
                    />
                  </div>

                  <div>
                    <Label className="text-xs text-gray-400 uppercase tracking-wide flex items-center gap-2">
                      <Phone className="h-3 w-3" />
                      Phone Number
                    </Label>
                    <Input
                      type="tel"
                      className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-gray-500 focus:border-green-500"
                      value={formData.phone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      placeholder="555-123-4567"
                    />
                  </div>
                </div>
              </div>

              {/* Business Information Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-300 uppercase tracking-wide border-b border-white/10 pb-2">
                  Business Information
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-gray-400 uppercase tracking-wide flex items-center gap-2">
                      <Briefcase className="h-3 w-3" />
                      Industry
                    </Label>
                    <Select
                      value={formData.industry}
                      onValueChange={(value) => handleInputChange("industry", value)}
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

                  <div>
                    <Label className="text-xs text-gray-400 uppercase tracking-wide flex items-center gap-2">
                      <Calendar className="h-3 w-3" />
                      Time in Business
                    </Label>
                    <Select
                      value={findClosestOption(formData.timeInBusiness, TIME_IN_BUSINESS_OPTIONS)}
                      onValueChange={(value) => handleInputChange("timeInBusiness", value)}
                    >
                      <SelectTrigger className="mt-1 bg-white/10 border-white/20 text-white">
                        <SelectValue placeholder="Select time in business" />
                      </SelectTrigger>
                      <SelectContent>
                        {TIME_IN_BUSINESS_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Financial Information Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-300 uppercase tracking-wide border-b border-white/10 pb-2">
                  Financial Information
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-gray-400 uppercase tracking-wide flex items-center gap-2">
                      <DollarSign className="h-3 w-3" />
                      Monthly Revenue
                    </Label>
                    <Select
                      value={findClosestOption(formData.monthlyRevenue, MONTHLY_REVENUE_OPTIONS)}
                      onValueChange={(value) => handleInputChange("monthlyRevenue", value)}
                    >
                      <SelectTrigger className="mt-1 bg-white/10 border-white/20 text-white">
                        <SelectValue placeholder="Select monthly revenue" />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTHLY_REVENUE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs text-gray-400 uppercase tracking-wide flex items-center gap-2">
                      <TrendingUp className="h-3 w-3" />
                      Credit Score
                    </Label>
                    <Select
                      value={findClosestOption(formData.creditScore, CREDIT_SCORE_RANGES)}
                      onValueChange={(value) => handleInputChange("creditScore", value)}
                    >
                      <SelectTrigger className="mt-1 bg-white/10 border-white/20 text-white">
                        <SelectValue placeholder="Select credit score range" />
                      </SelectTrigger>
                      <SelectContent>
                        {CREDIT_SCORE_RANGES.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-gray-400 uppercase tracking-wide flex items-center gap-2">
                    <DollarSign className="h-3 w-3" />
                    Requested Funding Amount
                  </Label>
                  <Input
                    required
                    type="number"
                    className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-gray-500 focus:border-green-500"
                    value={formData.loanAmount}
                    onChange={(e) => handleInputChange("loanAmount", e.target.value)}
                    placeholder="50000"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 space-y-3">
                <Button
                  type="submit"
                  className="w-full bg-green-500 hover:bg-green-600 text-black font-bold py-6 text-lg transition"
                >
                  <RefreshCw className="mr-2 h-5 w-5" />
                  Regenerate My Report
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full bg-transparent border-white/20 text-white hover:bg-white/10 py-6"
                  onClick={() => window.open("https://app.todaycapitalgroup.com/", "_blank")}
                >
                  <ArrowRight className="mr-2 h-5 w-5" />
                  Skip to Application
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-gray-500 text-sm mt-6">
          Your information is used only to generate your funding profile and is not stored.
        </p>
      </div>
    </div>
  );
}
