import { useState, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  Shield,
  X,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { Link } from "wouter";
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
  timestamp: string;
}

export default function FundingCheck() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [creditScoreRange, setCreditScoreRange] = useState<string>("");
  const [timeInBusiness, setTimeInBusiness] = useState<string>("");
  const [industry, setIndustry] = useState<string>("");
  const [analysisResult, setAnalysisResult] =
    useState<BankStatementAnalysis | null>(null);

  // Check if service is available
  const { data: serviceStatus } = useQuery({
    queryKey: ["funding-check-status"],
    queryFn: async () => {
      const response = await fetch("/api/funding-check/status");
      return response.json();
    },
  });

  const analyzeMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append("statements", file);
      });
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
      toast({
        title: "Analysis Complete",
        description: `Analyzed ${data.filesProcessed} statement(s) successfully.`,
      });
    },
    onError: (error: Error) => {
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
    if (score >= 60) return "text-yellow-400";
    if (score >= 40) return "text-orange-400";
    return "text-red-400";
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return "from-green-900 to-green-950";
    if (score >= 60) return "from-yellow-900 to-yellow-950";
    if (score >= 40) return "from-orange-900 to-orange-950";
    return "from-red-900 to-red-950";
  };

  const getSeverityColor = (severity: "low" | "medium" | "high") => {
    switch (severity) {
      case "low":
        return "text-yellow-400 bg-yellow-400/10 border-yellow-400/30";
      case "medium":
        return "text-orange-400 bg-orange-400/10 border-orange-400/30";
      case "high":
        return "text-red-400 bg-red-400/10 border-red-400/30";
    }
  };

  const resetAnalysis = () => {
    setAnalysisResult(null);
    setSelectedFiles([]);
    setCreditScoreRange("");
    setTimeInBusiness("");
    setIndustry("");
  };

  // Show results view
  if (analysisResult) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#192F56] to-[#19112D]">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="text-center mb-8">
            <img
              src={tcgLogo}
              alt="Today Capital Group"
              className="h-16 mx-auto mb-6"
            />
            <h1 className="text-3xl font-bold text-white mb-2">
              Your Funding Analysis
            </h1>
            <p className="text-white/70">
              Based on your bank statement analysis
            </p>
          </div>

          {/* Score Card */}
          <Card
            className={`p-6 mb-6 bg-gradient-to-br ${getScoreBgColor(analysisResult.overallScore)} border-0`}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">
                  Funding Readiness Score
                </h2>
                <p className="text-white/70 text-sm">
                  {analysisResult.qualificationTier}
                </p>
              </div>
              <div
                className={`text-5xl font-bold ${getScoreColor(analysisResult.overallScore)}`}
              >
                {analysisResult.overallScore}
                <span className="text-2xl text-white/50">/100</span>
              </div>
            </div>
            <Progress
              value={analysisResult.overallScore}
              className="h-3 bg-white/20"
            />
          </Card>

          {/* Recommendation Card */}
          <Card className="p-6 mb-6 bg-card/95 backdrop-blur">
            <div className="flex items-start gap-4 mb-4">
              <div
                className={`p-3 rounded-full ${analysisResult.fundingRecommendation.eligible ? "bg-green-500/20" : "bg-orange-500/20"}`}
              >
                {analysisResult.fundingRecommendation.eligible ? (
                  <CheckCircle className="w-6 h-6 text-green-500" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-orange-500" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-1">
                  {analysisResult.fundingRecommendation.product}
                </h3>
                <p className="text-muted-foreground">
                  {analysisResult.fundingRecommendation.message}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div className="text-center p-4 bg-muted/30 rounded-lg">
                <DollarSign className="w-5 h-5 mx-auto mb-2 text-primary" />
                <p className="text-xs text-muted-foreground mb-1">Max Amount</p>
                <p className="font-bold text-lg">
                  {formatCurrency(analysisResult.fundingRecommendation.maxAmount)}
                </p>
              </div>
              <div className="text-center p-4 bg-muted/30 rounded-lg">
                <BarChart3 className="w-5 h-5 mx-auto mb-2 text-primary" />
                <p className="text-xs text-muted-foreground mb-1">Est. Rates</p>
                <p className="font-bold text-lg">
                  {analysisResult.fundingRecommendation.estimatedRates}
                </p>
              </div>
              <div className="text-center p-4 bg-muted/30 rounded-lg">
                <TrendingUp className="w-5 h-5 mx-auto mb-2 text-primary" />
                <p className="text-xs text-muted-foreground mb-1">Monthly Rev</p>
                <p className="font-bold text-lg">
                  {formatCurrency(analysisResult.estimatedMonthlyRevenue)}
                </p>
              </div>
              <div className="text-center p-4 bg-muted/30 rounded-lg">
                <Shield className="w-5 h-5 mx-auto mb-2 text-primary" />
                <p className="text-xs text-muted-foreground mb-1">Avg Balance</p>
                <p className="font-bold text-lg">
                  {formatCurrency(analysisResult.averageDailyBalance)}
                </p>
              </div>
            </div>
          </Card>

          {/* Summary */}
          <Card className="p-6 mb-6 bg-card/95 backdrop-blur">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Executive Summary
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              {analysisResult.summary}
            </p>
          </Card>

          {/* Red Flags & Positive Indicators */}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {/* Red Flags */}
            {analysisResult.redFlags.length > 0 && (
              <Card className="p-6 bg-card/95 backdrop-blur">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-red-400">
                  <AlertCircle className="w-5 h-5" />
                  Areas of Concern ({analysisResult.redFlags.length})
                </h3>
                <ul className="space-y-3">
                  {analysisResult.redFlags.map((flag, i) => (
                    <li
                      key={i}
                      className={`p-3 rounded-lg border ${getSeverityColor(flag.severity)}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{flag.issue}</span>
                        <span className="text-xs uppercase px-2 py-0.5 rounded-full bg-current/10">
                          {flag.severity}
                        </span>
                      </div>
                      <p className="text-sm opacity-80">{flag.details}</p>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {/* Positive Indicators */}
            {analysisResult.positiveIndicators.length > 0 && (
              <Card className="p-6 bg-card/95 backdrop-blur">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-green-400">
                  <TrendingUp className="w-5 h-5" />
                  Strengths ({analysisResult.positiveIndicators.length})
                </h3>
                <ul className="space-y-3">
                  {analysisResult.positiveIndicators.map((indicator, i) => (
                    <li
                      key={i}
                      className="p-3 rounded-lg border border-green-400/30 bg-green-400/10"
                    >
                      <span className="font-medium text-green-400">
                        {indicator.indicator}
                      </span>
                      <p className="text-sm text-muted-foreground mt-1">
                        {indicator.details}
                      </p>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>

          {/* Improvement Suggestions */}
          {analysisResult.improvementSuggestions.length > 0 && (
            <Card className="p-6 mb-6 bg-card/95 backdrop-blur">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-primary rotate-180" />
                How to Improve Your Chances
              </h3>
              <ul className="space-y-2">
                {analysisResult.improvementSuggestions.map((suggestion, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-medium">
                      {i + 1}
                    </span>
                    <span className="text-muted-foreground">{suggestion}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button onClick={resetAnalysis} variant="outline" className="flex-1">
              <RefreshCw className="w-4 h-4 mr-2" />
              Analyze Different Statements
            </Button>
            <Link href="/" className="flex-1">
              <Button className="w-full">
                Apply for Funding Now
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Upload form view
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#192F56] to-[#19112D]">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="text-center mb-8">
          <img
            src={tcgLogo}
            alt="Today Capital Group"
            className="h-16 mx-auto mb-6"
          />
          <h1 className="text-3xl font-bold text-white mb-2">
            Check Your Funding Eligibility
          </h1>
          <p className="text-white/70">
            Upload your bank statements and get instant feedback on your funding
            chances
          </p>
        </div>

        {/* Service unavailable warning */}
        {serviceStatus && !serviceStatus.available && (
          <Card className="p-4 mb-6 bg-orange-500/20 border-orange-500/40">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-400" />
              <p className="text-orange-200 text-sm">
                The funding check service is currently unavailable. Please try
                again later or contact support.
              </p>
            </div>
          </Card>
        )}

        <Card className="p-6 bg-card/95 backdrop-blur">
          <div className="space-y-6">
            {/* Optional Information */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm text-muted-foreground">
                Optional: Provide additional info for more accurate results
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
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging
                  ? "border-primary bg-primary/10"
                  : "border-muted-foreground/30 hover:border-primary/50"
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

              <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />

              <p className="text-lg font-medium mb-2">
                Drag & drop your bank statements here
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Upload 1-6 months of statements (PDF only, max 25MB per file)
              </p>

              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                <FileText className="w-4 h-4 mr-2" />
                Browse Files
              </Button>
            </div>

            {/* Selected Files */}
            {selectedFiles.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-medium">
                  Selected Files ({selectedFiles.length}/6)
                </h3>
                <ul className="space-y-2">
                  {selectedFiles.map((file, index) => (
                    <li
                      key={`${file.name}-${index}`}
                      className="flex items-center justify-between bg-muted/50 rounded-lg p-3"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <FileText className="w-5 h-5 text-primary flex-shrink-0" />
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
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Analyze Button */}
            <div className="flex flex-col gap-3">
              <Button
                onClick={handleAnalyze}
                disabled={
                  analyzeMutation.isPending ||
                  selectedFiles.length === 0 ||
                  !serviceStatus?.available
                }
                className="w-full"
                size="lg"
              >
                {analyzeMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing Your Statements...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Check My Funding Eligibility
                  </>
                )}
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

        {/* Info Section */}
        <div className="mt-6 text-center space-y-4">
          <p className="text-sm text-white/50">
            Your statements are analyzed securely and are not stored after
            analysis.
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-xs text-white/40">
            <span className="flex items-center gap-1">
              <Shield className="w-3 h-3" /> Secure Analysis
            </span>
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> AI-Powered
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> Instant Results
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
