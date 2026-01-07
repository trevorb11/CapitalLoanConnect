import { useState, useEffect, useCallback } from "react";
import { usePlaidLink } from "react-plaid-link";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { 
  Loader2, 
  CheckCircle2, 
  TrendingUp, 
  Building2, 
  Lock, 
  AlertCircle,
  AlertTriangle,
  Sparkles,
  DollarSign,
  Target,
  ThumbsUp,
  ArrowRight
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

const formSchema = z.object({
  businessName: z.string().min(2, "Business name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address")
});

type FormData = z.infer<typeof formSchema>;

interface RedFlag {
  issue: string;
  severity: string;
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

interface AIAnalysis {
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

interface AnalysisResults {
  type: 'ai_analysis' | 'basic_analysis';
  metrics: {
    monthlyRevenue: number;
    avgBalance: number;
    negativeDays: number;
  };
  recommendations: {
    sba: { status: string; reason: string };
    loc: { status: string; reason: string };
    mca: { status: string; reason: string };
  };
  aiAnalysis?: AIAnalysis;
  institutionName?: string;
}

function ScoreGauge({ score }: { score: number }) {
  const getColor = () => {
    if (score >= 70) return "text-green-500";
    if (score >= 40) return "text-yellow-500";
    return "text-red-500";
  };
  
  const getLabel = () => {
    if (score >= 70) return "Excellent";
    if (score >= 55) return "Good";
    if (score >= 40) return "Fair";
    return "Needs Improvement";
  };

  return (
    <div className="text-center">
      <div className={`text-6xl font-bold ${getColor()}`} data-testid="text-overall-score">
        {score}
      </div>
      <div className="text-sm text-gray-500 mt-1">{getLabel()}</div>
      <Progress 
        value={score} 
        className="mt-3 h-2"
      />
    </div>
  );
}

function ResultCard({ 
  title, 
  data, 
  icon 
}: { 
  title: string; 
  data: { status: string; reason: string }; 
  icon: React.ReactNode 
}) {
  const colorClass = data.status === "High" 
    ? "bg-green-50 border-green-200 text-green-700" 
    : data.status === "Medium" 
      ? "bg-yellow-50 border-yellow-200 text-yellow-700" 
      : "bg-red-50 border-red-200 text-red-700";
  
  return (
    <div 
      className={`border rounded-xl p-6 ${colorClass}`} 
      data-testid={`card-result-${title.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <div className="flex justify-between items-start mb-4 gap-2">
        <h3 className="font-bold text-lg">{title}</h3>
        {icon}
      </div>
      <div 
        className="text-3xl font-bold mb-2" 
        data-testid={`text-status-${title.toLowerCase().replace(/\s+/g, '-')}`}
      >
        {data.status} Odds
      </div>
      <p className="text-sm opacity-90">{data.reason}</p>
    </div>
  );
}

export default function FundingAnalysis() {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [step, setStep] = useState<'input' | 'analyzing' | 'results'>('input');
  const [results, setResults] = useState<AnalysisResults | null>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      businessName: "",
      email: ""
    }
  });

  const createLinkTokenMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/plaid/create-link-token");
      return res.json();
    },
    onSuccess: (data) => {
      setLinkToken(data.link_token);
    },
    onError: () => {
      toast({
        title: "Connection Error",
        description: "Failed to initialize bank connection. Please try again later.",
        variant: "destructive"
      });
    }
  });

  const exchangeTokenMutation = useMutation({
    mutationFn: async (payload: { publicToken: string; metadata: any }) => {
      const res = await apiRequest("POST", "/api/plaid/exchange-token", {
        publicToken: payload.publicToken,
        metadata: payload.metadata,
        businessName: form.getValues("businessName"),
        email: form.getValues("email"),
        useAIAnalysis: true
      });
      return res.json();
    },
    onSuccess: (data) => {
      setResults(data);
      setStep('results');
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
      toast({
        title: "Analysis Complete",
        description: "Your AI-powered funding eligibility report is ready!"
      });
    },
    onError: () => {
      setStep('input');
      toast({
        title: "Analysis Failed",
        description: "We couldn't analyze your bank data. Please try again.",
        variant: "destructive"
      });
    }
  });

  useEffect(() => {
    createLinkTokenMutation.mutate();
  }, []);

  const onSuccess = useCallback(async (publicToken: string, metadata: any) => {
    setStep('analyzing');
    exchangeTokenMutation.mutate({ publicToken, metadata });
  }, []);

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess,
  });

  const handleConnectBank = () => {
    const isValid = form.trigger();
    isValid.then((valid) => {
      if (valid && ready) {
        open();
      }
    });
  };

  if (step === 'analyzing' || exchangeTokenMutation.isPending) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#192F56] to-[#19112D] flex flex-col items-center justify-center text-white p-4">
        <Loader2 className="w-16 h-16 animate-spin text-[#5FBFB8] mb-4" data-testid="loader-analyzing" />
        <h2 className="text-2xl font-bold mb-2">Analyzing Bank Data with AI...</h2>
        <p className="text-white/70 text-center max-w-md">
          Our AI is reviewing your bank transactions, balance history, and financial patterns to provide personalized funding recommendations.
        </p>
        <p className="text-white/50 text-sm mt-4">This may take up to 30 seconds...</p>
      </div>
    );
  }

  if (step === 'results' && results) {
    const { metrics, recommendations, aiAnalysis, institutionName } = results;
    
    // If we have AI analysis, show the enhanced view
    if (aiAnalysis) {
      return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-8">
          <div className="max-w-5xl mx-auto space-y-6">
            {/* Header with Score */}
            <div className="bg-white rounded-2xl shadow-sm border p-8">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="text-center md:text-left">
                  <div className="flex items-center gap-2 text-[#5FBFB8] mb-2">
                    <Sparkles className="w-5 h-5" />
                    <span className="text-sm font-medium">AI-Powered Analysis</span>
                  </div>
                  <h1 className="text-3xl font-bold text-[#192F56]" data-testid="heading-results">
                    Funding Eligibility Report
                  </h1>
                  {institutionName && (
                    <p className="text-gray-500 mt-1">
                      Based on data from {institutionName}
                    </p>
                  )}
                </div>
                <div className="bg-gray-50 rounded-xl p-6 min-w-[200px]">
                  <div className="text-sm text-gray-500 mb-2 text-center">Fundability Score</div>
                  <ScoreGauge score={aiAnalysis.overallScore} />
                </div>
              </div>
              
              {/* Qualification Tier Badge */}
              <div className="mt-6 flex flex-wrap justify-center gap-4">
                <span 
                  className="px-4 py-2 bg-[#192F56] text-white rounded-full font-medium"
                  data-testid="text-qualification-tier"
                >
                  {aiAnalysis.qualificationTier}
                </span>
                <span className="px-4 py-2 bg-green-100 text-green-700 rounded-full">
                  Est. Revenue: ${aiAnalysis.estimatedMonthlyRevenue?.toLocaleString() || Math.round(metrics.monthlyRevenue).toLocaleString()}/mo
                </span>
                <span className="px-4 py-2 bg-blue-100 text-blue-700 rounded-full">
                  Avg Balance: ${aiAnalysis.averageDailyBalance?.toLocaleString() || Math.round(metrics.avgBalance).toLocaleString()}
                </span>
              </div>
            </div>

            {/* AI Summary */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="w-5 h-5 text-[#5FBFB8]" />
                  Executive Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700" data-testid="text-summary">{aiAnalysis.summary}</p>
              </CardContent>
            </Card>

            {/* Funding Recommendation */}
            {aiAnalysis.fundingRecommendation && (
              <Card className={aiAnalysis.fundingRecommendation.eligible ? "border-green-200 bg-green-50" : "border-yellow-200 bg-yellow-50"}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Funding Recommendation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <div className="text-sm text-gray-600">Recommended Product</div>
                      <div className="font-semibold text-lg">{aiAnalysis.fundingRecommendation.product}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Max Amount</div>
                      <div className="font-semibold text-lg text-green-600">
                        ${aiAnalysis.fundingRecommendation.maxAmount?.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Estimated Rates</div>
                      <div className="font-semibold text-lg">{aiAnalysis.fundingRecommendation.estimatedRates}</div>
                    </div>
                  </div>
                  <p className="text-gray-700">{aiAnalysis.fundingRecommendation.message}</p>
                </CardContent>
              </Card>
            )}

            {/* Product Eligibility */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ResultCard 
                title="SBA Loans" 
                data={recommendations.sba} 
                icon={<Building2 className="w-6 h-6" />} 
              />
              <ResultCard 
                title="Line of Credit" 
                data={recommendations.loc} 
                icon={<TrendingUp className="w-6 h-6" />} 
              />
              <ResultCard 
                title="Working Capital" 
                data={recommendations.mca} 
                icon={<CheckCircle2 className="w-6 h-6" />} 
              />
            </div>

            {/* Positive Indicators & Red Flags */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Positive Indicators */}
              {aiAnalysis.positiveIndicators && aiAnalysis.positiveIndicators.length > 0 && (
                <Card className="border-green-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2 text-green-700">
                      <ThumbsUp className="w-5 h-5" />
                      Positive Indicators
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {aiAnalysis.positiveIndicators.map((indicator, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
                          <div>
                            <div className="font-medium text-green-700">{indicator.indicator}</div>
                            <div className="text-sm text-gray-600">{indicator.details}</div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Red Flags */}
              {aiAnalysis.redFlags && aiAnalysis.redFlags.length > 0 && (
                <Card className="border-red-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2 text-red-700">
                      <AlertTriangle className="w-5 h-5" />
                      Areas of Concern
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {aiAnalysis.redFlags.map((flag, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <AlertCircle className={`w-5 h-5 mt-0.5 shrink-0 ${
                            flag.severity === 'high' ? 'text-red-500' : 
                            flag.severity === 'medium' ? 'text-yellow-500' : 'text-gray-400'
                          }`} />
                          <div>
                            <div className="font-medium">{flag.issue}</div>
                            <div className="text-sm text-gray-600">{flag.details}</div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Improvement Suggestions */}
            {aiAnalysis.improvementSuggestions && aiAnalysis.improvementSuggestions.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-[#5FBFB8]" />
                    How to Improve Your Score
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {aiAnalysis.improvementSuggestions.map((suggestion, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <ArrowRight className="w-4 h-4 text-[#5FBFB8] mt-1 shrink-0" />
                        <span className="text-gray-700">{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* CTA */}
            <div className="bg-white p-8 rounded-xl shadow-sm border text-center">
              <h2 className="text-2xl font-bold text-[#192F56] mb-4">
                Ready to Get Funded?
              </h2>
              <p className="text-gray-600 mb-6">
                Your bank data is already on file. Complete your application to get matched with the best funding options.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  size="lg" 
                  className="bg-[#192F56] hover:bg-[#2a4575] text-white px-8"
                  onClick={() => setLocation("/")}
                  data-testid="button-apply-now"
                >
                  Complete Application
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  onClick={() => window.open("https://www.todaycapitalgroup.com/#contact-us", "_blank")}
                  data-testid="button-contact-us"
                >
                  Speak with an Advisor
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
    }
    
    // Basic results view (fallback)
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 
              className="text-3xl font-bold text-[#192F56]" 
              data-testid="heading-results"
            >
              Funding Eligibility Report
            </h1>
            <div className="flex flex-wrap justify-center gap-4 mt-4 text-sm text-gray-600">
              <span 
                className="px-3 py-1 bg-green-100 text-green-700 rounded-full" 
                data-testid="text-monthly-revenue"
              >
                Verified Revenue: ${Math.round(metrics.monthlyRevenue).toLocaleString()}/mo
              </span>
              <span 
                className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full" 
                data-testid="text-avg-balance"
              >
                Avg Balance: ${Math.round(metrics.avgBalance).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <ResultCard 
              title="SBA Loans" 
              data={recommendations.sba} 
              icon={<Building2 className="w-6 h-6" />} 
            />
            <ResultCard 
              title="Line of Credit" 
              data={recommendations.loc} 
              icon={<TrendingUp className="w-6 h-6" />} 
            />
            <ResultCard 
              title="Working Capital" 
              data={recommendations.mca} 
              icon={<CheckCircle2 className="w-6 h-6" />} 
            />
          </div>

          <div className="bg-white p-8 rounded-xl shadow-sm border text-center">
            <h2 className="text-2xl font-bold text-[#192F56] mb-4">
              We have your data. Ready to fund?
            </h2>
            <p className="text-gray-600 mb-6">
              Since you connected your bank, we can fast-track your application. 
              No need to upload statements manually.
            </p>
            <Button 
              size="lg" 
              className="bg-[#192F56] hover:bg-[#2a4575] text-white px-8 py-6 text-lg"
              onClick={() => setLocation("/")}
              data-testid="button-finalize-application"
            >
              Finalize Application
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#192F56] to-[#19112D] flex items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-xl border-0">
        <CardHeader className="bg-[#192F56] text-white rounded-t-xl p-8 text-center">
          <div className="flex justify-center mb-3">
            <Sparkles className="w-8 h-8 text-[#5FBFB8]" />
          </div>
          <CardTitle className="text-2xl">AI-Powered Funding Analysis</CardTitle>
          <p className="text-white/70 mt-2">
            Connect your business bank account to receive an instant AI-powered fundability assessment.
          </p>
        </CardHeader>
        <CardContent className="p-8 space-y-6 bg-white rounded-b-xl">
          {createLinkTokenMutation.isError && (
            <div 
              className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2" 
              data-testid="text-error"
            >
              <AlertCircle className="w-5 h-5" />
              Failed to initialize. Please refresh the page.
            </div>
          )}
          
          <Form {...form}>
            <form className="space-y-6">
              <FormField
                control={form.control}
                name="businessName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g. Acme Corp" 
                        data-testid="input-business-name"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="you@company.com" 
                        type="email"
                        data-testid="input-email"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
                <div className="flex items-start gap-2">
                  <Sparkles className="w-5 h-5 text-[#5FBFB8] shrink-0 mt-0.5" />
                  <div>
                    <strong>What you'll receive:</strong>
                    <ul className="mt-2 space-y-1 ml-2">
                      <li>• Overall fundability score (0-100)</li>
                      <li>• Qualification tier assessment</li>
                      <li>• Max funding amount estimate</li>
                      <li>• Red flags & positive indicators</li>
                      <li>• Personalized improvement tips</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <Button 
                  type="button"
                  onClick={handleConnectBank}
                  disabled={!ready || !linkToken || createLinkTokenMutation.isPending}
                  className="w-full bg-[#5FBFB8] hover:bg-[#4ca8a1] text-white py-6 text-lg font-semibold flex items-center justify-center gap-2"
                  data-testid="button-connect-bank"
                >
                  {createLinkTokenMutation.isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Lock className="w-5 h-5" />
                  )}
                  Connect Bank & Get AI Analysis
                </Button>
                <p className="text-xs text-center text-gray-400 mt-3">
                  Secure connection via Plaid. We do not store your login credentials.
                </p>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
