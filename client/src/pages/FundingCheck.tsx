import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Upload,
  FileText,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Loader2,
  ArrowLeft,
  ArrowRight,
  TrendingUp,
  DollarSign,
  BarChart3,
  Shield,
  X,
  Sparkles,
  RefreshCw,
  Building2,
  Mail,
  Clock,
  Target,
  Zap,
  Award,
  Lightbulb,
  ChevronRight,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import tcgLogo from "@assets/TCG_White_logo_1764664150165.png";

interface RedFlag {
  issue: string;
  severity: "low" | "medium" | "high";
  details: string;
}

interface PositiveIndicator {
  indicator: string;
  details: string;
}

interface FundingRecommendation {
  eligible: boolean;
  maxAmount: number;
  estimatedRates: string;
  product: string;
  message: string;
}

interface BankStatementAnalysis {
  overallScore: number;
  qualificationTier: string;
  estimatedMonthlyRevenue: number;
  averageDailyBalance: number;
  redFlags: RedFlag[];
  positiveIndicators: PositiveIndicator[];
  fundingRecommendation: FundingRecommendation;
  improvementSuggestions: string[];
  summary: string;
}

interface AnalysisResponse {
  success: boolean;
  analysis: BankStatementAnalysis;
  filesProcessed: number;
  savedStatements: Array<{ id: string; originalFileName: string }>;
  timestamp: string;
}

type ViewState = "upload" | "analyzing" | "results";

const LOADING_MESSAGES = [
  { message: "Uploading your bank statements...", icon: Upload },
  { message: "Extracting financial data...", icon: FileText },
  { message: "Analyzing deposit patterns...", icon: BarChart3 },
  { message: "Reviewing cash flow trends...", icon: TrendingUp },
  { message: "Checking against lender criteria...", icon: Target },
  { message: "Calculating your funding potential...", icon: DollarSign },
  { message: "Generating your personalized report...", icon: Sparkles },
];

export default function FundingCheck() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [, setLocation] = useLocation();

  const [viewState, setViewState] = useState<ViewState>("upload");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [email, setEmail] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [creditScoreRange, setCreditScoreRange] = useState<string>("");
  const [timeInBusiness, setTimeInBusiness] = useState<string>("");
  const [industry, setIndustry] = useState<string>("");
  const [analysisResult, setAnalysisResult] = useState<BankStatementAnalysis | null>(null);
  const [loadingStage, setLoadingStage] = useState(0);

  // Check if service is available
  const { data: serviceStatus } = useQuery({
    queryKey: ["funding-check-status"],
    queryFn: async () => {
      const response = await fetch("/api/funding-check/status");
      return response.json();
    },
  });

  // Cycle through loading messages
  useEffect(() => {
    if (viewState !== "analyzing") return;

    const interval = setInterval(() => {
      setLoadingStage((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 2500);

    return () => clearInterval(interval);
  }, [viewState]);

  const analyzeMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append("statements", file);
      });
      if (email) formData.append("email", email);
      if (businessName) formData.append("businessName", businessName);
      if (creditScoreRange) formData.append("creditScoreRange", creditScoreRange);
      if (timeInBusiness) formData.append("timeInBusiness", timeInBusiness);
      if (industry) formData.append("industry", industry);

      const response = await fetch("/api/funding-check/analyze", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Analysis failed");
      }

      return response.json() as Promise<AnalysisResponse>;
    },
    onSuccess: (data) => {
      setAnalysisResult(data.analysis);
      setViewState("results");
    },
    onError: (error: Error) => {
      setViewState("upload");
      toast({
        title: "Analysis Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const validateFile = (file: File): string | null => {
    if (file.type !== "application/pdf") {
      return "Only PDF files are allowed";
    }
    if (file.size > 25 * 1024 * 1024) {
      return "File size must be under 25MB";
    }
    return null;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    addFiles(files);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const addFiles = (files: File[]) => {
    const validFiles: File[] = [];

    for (const file of files) {
      const error = validateFile(file);
      if (error) {
        toast({
          title: "Invalid File",
          description: `${file.name}: ${error}`,
          variant: "destructive",
        });
      } else {
        validFiles.push(file);
      }
    }

    setSelectedFiles((prev) => [...prev, ...validFiles].slice(0, 6));
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    addFiles(files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleAnalyze = () => {
    if (selectedFiles.length === 0) {
      toast({
        title: "No Files Selected",
        description: "Please select at least one bank statement PDF to analyze",
        variant: "destructive",
      });
      return;
    }

    setViewState("analyzing");
    setLoadingStage(0);
    analyzeMutation.mutate(selectedFiles);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-400";
    if (score >= 60) return "text-blue-400";
    if (score >= 40) return "text-yellow-400";
    return "text-orange-400";
  };

  const getScoreGradient = (score: number) => {
    if (score >= 80) return "from-green-600 to-emerald-700";
    if (score >= 60) return "from-blue-600 to-indigo-700";
    if (score >= 40) return "from-yellow-600 to-amber-700";
    return "from-orange-600 to-red-700";
  };

  const getTierBadgeColor = (tier: string) => {
    const tierLower = tier.toLowerCase();
    if (tierLower.includes("prime")) return "bg-green-500/20 text-green-400 border-green-500/30";
    if (tierLower.includes("growth")) return "bg-purple-500/20 text-purple-400 border-purple-500/30";
    if (tierLower.includes("working")) return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    if (tierLower.includes("cash flow")) return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    if (tierLower.includes("startup")) return "bg-cyan-500/20 text-cyan-400 border-cyan-500/30";
    return "bg-slate-500/20 text-slate-400 border-slate-500/30";
  };

  const getSeverityIcon = (severity: "low" | "medium" | "high") => {
    switch (severity) {
      case "low":
        return <AlertCircle className="w-4 h-4" />;
      case "medium":
        return <AlertTriangle className="w-4 h-4" />;
      case "high":
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getSeverityColor = (severity: "low" | "medium" | "high") => {
    switch (severity) {
      case "low":
        return "border-yellow-500/30 bg-yellow-500/10";
      case "medium":
        return "border-orange-500/30 bg-orange-500/10";
      case "high":
        return "border-red-500/30 bg-red-500/10";
    }
  };

  const resetAnalysis = () => {
    setAnalysisResult(null);
    setSelectedFiles([]);
    setViewState("upload");
  };

  const continueToApplication = () => {
    // Pass email to the application form if provided
    const params = new URLSearchParams();
    if (email) params.set("email", email);
    if (businessName) params.set("businessName", businessName);
    setLocation(`/?${params.toString()}`);
  };

  // =====================
  // ANALYZING VIEW
  // =====================
  if (viewState === "analyzing") {
    const CurrentIcon = LOADING_MESSAGES[loadingStage].icon;

    return (
      <div className="min-h-screen bg-gradient-to-b from-[#192F56] to-[#19112D] flex items-center justify-center p-4">
        <div className="max-w-lg w-full text-center">
          <img src={tcgLogo} alt="Today Capital Group" className="h-12 mx-auto mb-12 opacity-80" />

          {/* Animated Icon */}
          <div className="relative mb-8">
            <div className="w-24 h-24 mx-auto rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
              <CurrentIcon className="w-12 h-12 text-primary" />
            </div>
            <div className="absolute inset-0 w-24 h-24 mx-auto rounded-full border-2 border-primary/30 animate-ping" />
          </div>

          {/* Loading Message */}
          <h2 className="text-2xl font-bold text-white mb-3 transition-all duration-500">
            {LOADING_MESSAGES[loadingStage].message}
          </h2>

          <p className="text-white/60 mb-8">
            Our AI is analyzing your bank statements to provide personalized funding insights
          </p>

          {/* Progress Bar */}
          <div className="max-w-xs mx-auto">
            <Progress
              value={((loadingStage + 1) / LOADING_MESSAGES.length) * 100}
              className="h-2 bg-white/10"
            />
            <p className="text-xs text-white/40 mt-2">
              Step {loadingStage + 1} of {LOADING_MESSAGES.length}
            </p>
          </div>

          {/* Files being analyzed */}
          <div className="mt-8 text-sm text-white/50">
            <p>Analyzing {selectedFiles.length} statement{selectedFiles.length > 1 ? "s" : ""}</p>
          </div>
        </div>
      </div>
    );
  }

  // =====================
  // RESULTS VIEW
  // =====================
  if (viewState === "results" && analysisResult) {
    const isEligible = analysisResult.fundingRecommendation.eligible;

    return (
      <div className="min-h-screen bg-gradient-to-b from-[#192F56] to-[#19112D]">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          {/* Header */}
          <div className="text-center mb-8">
            <img src={tcgLogo} alt="Today Capital Group" className="h-14 mx-auto mb-6" />
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 text-primary text-sm mb-4">
              <Sparkles className="w-4 h-4" />
              AI-Powered Analysis Complete
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
              Your Funding Insights Report
            </h1>
            <p className="text-white/60">
              Based on analysis of {selectedFiles.length} bank statement{selectedFiles.length > 1 ? "s" : ""}
            </p>
          </div>

          {/* Main Score Card */}
          <Card className={`p-8 mb-6 bg-gradient-to-br ${getScoreGradient(analysisResult.overallScore)} border-0 relative overflow-hidden`}>
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full translate-y-24 -translate-x-24" />

            <div className="relative">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="text-center md:text-left">
                  <p className="text-white/80 text-sm uppercase tracking-wider mb-1">Funding Readiness Score</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-6xl md:text-7xl font-bold text-white">
                      {analysisResult.overallScore}
                    </span>
                    <span className="text-2xl text-white/60">/100</span>
                  </div>
                  <div className={`inline-flex items-center gap-2 mt-3 px-3 py-1.5 rounded-full border ${getTierBadgeColor(analysisResult.qualificationTier)}`}>
                    <Award className="w-4 h-4" />
                    {analysisResult.qualificationTier}
                  </div>
                </div>

                <div className="flex-1 max-w-xs">
                  <Progress value={analysisResult.overallScore} className="h-4 bg-white/20" />
                  <div className="flex justify-between text-xs text-white/60 mt-2">
                    <span>Building</span>
                    <span>Working Capital</span>
                    <span>Prime</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Recommendation Card */}
          <Card className="p-6 mb-6 bg-card/95 backdrop-blur border-0">
            <div className="flex items-start gap-4">
              <div className={`p-4 rounded-2xl ${isEligible ? "bg-green-500/20" : "bg-amber-500/20"}`}>
                {isEligible ? (
                  <CheckCircle className="w-8 h-8 text-green-400" />
                ) : (
                  <Lightbulb className="w-8 h-8 text-amber-400" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold mb-1">{analysisResult.fundingRecommendation.product}</h3>
                <p className="text-muted-foreground leading-relaxed">{analysisResult.fundingRecommendation.message}</p>
              </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div className="p-4 rounded-xl bg-muted/30 text-center">
                <DollarSign className="w-6 h-6 mx-auto mb-2 text-green-400" />
                <p className="text-xs text-muted-foreground mb-1">Potential Funding</p>
                <p className="text-xl font-bold text-green-400">
                  {formatCurrency(analysisResult.fundingRecommendation.maxAmount)}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-muted/30 text-center">
                <BarChart3 className="w-6 h-6 mx-auto mb-2 text-blue-400" />
                <p className="text-xs text-muted-foreground mb-1">Est. Rates</p>
                <p className="text-xl font-bold text-blue-400">
                  {analysisResult.fundingRecommendation.estimatedRates}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-muted/30 text-center">
                <TrendingUp className="w-6 h-6 mx-auto mb-2 text-purple-400" />
                <p className="text-xs text-muted-foreground mb-1">Monthly Revenue</p>
                <p className="text-xl font-bold text-purple-400">
                  {formatCurrency(analysisResult.estimatedMonthlyRevenue)}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-muted/30 text-center">
                <Shield className="w-6 h-6 mx-auto mb-2 text-cyan-400" />
                <p className="text-xs text-muted-foreground mb-1">Avg. Balance</p>
                <p className="text-xl font-bold text-cyan-400">
                  {formatCurrency(analysisResult.averageDailyBalance)}
                </p>
              </div>
            </div>
          </Card>

          {/* Summary */}
          <Card className="p-6 mb-6 bg-card/95 backdrop-blur border-0">
            <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Executive Summary
            </h3>
            <p className="text-muted-foreground leading-relaxed text-lg">
              {analysisResult.summary}
            </p>
          </Card>

          {/* Strengths & Concerns Grid */}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {/* Strengths */}
            {analysisResult.positiveIndicators.length > 0 && (
              <Card className="p-6 bg-card/95 backdrop-blur border-0">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-green-400">
                  <CheckCircle className="w-5 h-5" />
                  Your Strengths
                </h3>
                <ul className="space-y-3">
                  {analysisResult.positiveIndicators.map((indicator, i) => (
                    <li key={i} className="flex items-start gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                      <Zap className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-medium text-green-400">{indicator.indicator}</span>
                        <p className="text-sm text-muted-foreground mt-1">{indicator.details}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {/* Red Flags */}
            {analysisResult.redFlags.length > 0 && (
              <Card className="p-6 bg-card/95 backdrop-blur border-0">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-amber-400">
                  <AlertTriangle className="w-5 h-5" />
                  Areas for Improvement
                </h3>
                <ul className="space-y-3">
                  {analysisResult.redFlags.map((flag, i) => (
                    <li key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${getSeverityColor(flag.severity)}`}>
                      <span className={`flex-shrink-0 mt-0.5 ${
                        flag.severity === "high" ? "text-red-400" :
                        flag.severity === "medium" ? "text-orange-400" : "text-yellow-400"
                      }`}>
                        {getSeverityIcon(flag.severity)}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{flag.issue}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            flag.severity === "high" ? "bg-red-500/20 text-red-400" :
                            flag.severity === "medium" ? "bg-orange-500/20 text-orange-400" :
                            "bg-yellow-500/20 text-yellow-400"
                          }`}>
                            {flag.severity}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{flag.details}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>

          {/* Improvement Suggestions */}
          {analysisResult.improvementSuggestions.length > 0 && (
            <Card className="p-6 mb-6 bg-card/95 backdrop-blur border-0">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-primary" />
                How to Improve Your Funding Chances
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                {analysisResult.improvementSuggestions.map((suggestion, i) => (
                  <div key={i} className="flex items-start gap-3 p-4 rounded-lg bg-muted/30">
                    <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-bold">
                      {i + 1}
                    </span>
                    <span className="text-sm text-muted-foreground">{suggestion}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* CTA Section */}
          <Card className={`p-8 border-0 ${isEligible ? "bg-gradient-to-r from-green-900/50 to-emerald-900/50" : "bg-gradient-to-r from-amber-900/50 to-orange-900/50"}`}>
            <div className="text-center">
              {isEligible ? (
                <>
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-green-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">
                    Great News! You May Qualify for Funding
                  </h3>
                  <p className="text-white/70 mb-6 max-w-md mx-auto">
                    Based on your bank statement analysis, you appear to be a strong candidate.
                    Complete your application to get started.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button size="lg" onClick={continueToApplication} className="bg-green-600 hover:bg-green-700">
                      Continue to Application
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                    <Button size="lg" variant="outline" onClick={resetAnalysis}>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Analyze Different Statements
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-500/20 flex items-center justify-center">
                    <Lightbulb className="w-8 h-8 text-amber-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">
                    Let's Build Your Funding Foundation
                  </h3>
                  <p className="text-white/70 mb-6 max-w-md mx-auto">
                    While traditional funding may not be available right now, we have programs
                    to help you build credit and qualify for funding in the future.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button size="lg" onClick={continueToApplication} className="bg-amber-600 hover:bg-amber-700">
                      Explore Your Options
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                    <Button size="lg" variant="outline" onClick={resetAnalysis}>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Try Different Statements
                    </Button>
                  </div>
                </>
              )}
            </div>
          </Card>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-xs text-white/40">
              This analysis is for informational purposes only and does not guarantee funding approval.
              Final approval is subject to lender review and verification.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // =====================
  // UPLOAD VIEW
  // =====================
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#192F56] to-[#19112D]">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <img src={tcgLogo} alt="Today Capital Group" className="h-16 mx-auto mb-6" />
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 text-primary text-sm mb-4">
            <Sparkles className="w-4 h-4" />
            AI-Powered Analysis
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
            Check Your Funding Eligibility
          </h1>
          <p className="text-white/70 text-lg">
            Upload your bank statements and get instant AI-powered insights on your funding potential
          </p>
        </div>

        {/* Service unavailable warning */}
        {serviceStatus && !serviceStatus.available && (
          <Card className="p-4 mb-6 bg-orange-500/20 border-orange-500/40">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-400" />
              <p className="text-orange-200 text-sm">
                The funding check service is currently unavailable. Please try again later.
              </p>
            </div>
          </Card>
        )}

        <Card className="p-6 bg-card/95 backdrop-blur border-0">
          <div className="space-y-6">
            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary" />
                Your Information
                <span className="text-xs text-muted-foreground font-normal">(to save your results)</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="businessName">Business Name</Label>
                  <Input
                    id="businessName"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="Your Business LLC"
                  />
                </div>
              </div>
            </div>

            {/* Additional Context */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" />
                Business Details
                <span className="text-xs text-muted-foreground font-normal">(optional - improves accuracy)</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Credit Score Range</Label>
                  <Select value={creditScoreRange} onValueChange={setCreditScoreRange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="below-550">Below 550</SelectItem>
                      <SelectItem value="550-599">550-599</SelectItem>
                      <SelectItem value="600-649">600-649</SelectItem>
                      <SelectItem value="650-699">650-699</SelectItem>
                      <SelectItem value="700-749">700-749</SelectItem>
                      <SelectItem value="750+">750+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Time in Business</Label>
                  <Select value={timeInBusiness} onValueChange={setTimeInBusiness}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="less-than-6-months">Less than 6 months</SelectItem>
                      <SelectItem value="6-12-months">6-12 months</SelectItem>
                      <SelectItem value="1-2-years">1-2 years</SelectItem>
                      <SelectItem value="2-5-years">2-5 years</SelectItem>
                      <SelectItem value="5-plus-years">5+ years</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Industry</Label>
                  <Select value={industry} onValueChange={setIndustry}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="retail">Retail</SelectItem>
                      <SelectItem value="restaurant">Restaurant/Food Service</SelectItem>
                      <SelectItem value="construction">Construction</SelectItem>
                      <SelectItem value="healthcare">Healthcare</SelectItem>
                      <SelectItem value="professional-services">Professional Services</SelectItem>
                      <SelectItem value="transportation">Transportation</SelectItem>
                      <SelectItem value="manufacturing">Manufacturing</SelectItem>
                      <SelectItem value="ecommerce">E-commerce</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* File Upload */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Bank Statements
                <span className="text-xs text-destructive font-normal">*required</span>
              </h3>

              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
                  isDragging
                    ? "border-primary bg-primary/10 scale-[1.02]"
                    : "border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/30"
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />

                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center">
                  <Upload className="w-8 h-8 text-primary" />
                </div>

                <p className="text-lg font-semibold mb-2">
                  Drop your bank statements here
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Upload 1-6 months of statements for the most accurate analysis
                </p>

                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Browse Files
                </Button>

                <p className="text-xs text-muted-foreground mt-4">
                  PDF only • Max 25MB per file
                </p>
              </div>
            </div>

            {/* Selected Files */}
            {selectedFiles.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Selected Files</h3>
                  <span className="text-sm text-muted-foreground">
                    {selectedFiles.length}/6 statements
                  </span>
                </div>
                <ul className="space-y-2">
                  {selectedFiles.map((file, index) => (
                    <li
                      key={`${file.name}-${index}`}
                      className="flex items-center justify-between bg-muted/30 rounded-lg p-3 group hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{file.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFile(index)}
                        className="opacity-50 group-hover:opacity-100"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Analyze Button */}
            <div className="flex flex-col gap-3 pt-4">
              <Button
                onClick={handleAnalyze}
                disabled={selectedFiles.length === 0 || !serviceStatus?.available}
                className="w-full h-14 text-lg"
                size="lg"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Analyze My Funding Potential
              </Button>

              <Link href="/">
                <Button variant="ghost" className="w-full text-muted-foreground">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Home
                </Button>
              </Link>
            </div>
          </div>
        </Card>

        {/* Trust Indicators */}
        <div className="mt-8 text-center space-y-6">
          <div className="flex flex-wrap justify-center gap-6 text-sm text-white/50">
            <span className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Bank-Level Security
            </span>
            <span className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              AI-Powered Analysis
            </span>
            <span className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Results in Seconds
            </span>
          </div>
          <p className="text-xs text-white/40 max-w-md mx-auto">
            Your bank statements are analyzed securely. We use advanced AI to provide
            personalized funding insights based on your actual financial data.
          </p>
        </div>
      </div>
    </div>
  );
}
