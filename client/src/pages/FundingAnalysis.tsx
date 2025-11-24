import { useState, useEffect, useCallback } from "react";
import { usePlaidLink } from "react-plaid-link";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
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
import { Loader2, CheckCircle2, TrendingUp, Building2, Lock, AlertCircle } from "lucide-react";

const formSchema = z.object({
  businessName: z.string().min(2, "Business name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address")
});

type FormData = z.infer<typeof formSchema>;

interface AnalysisResults {
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
        email: form.getValues("email")
      });
      return res.json();
    },
    onSuccess: (data) => {
      setResults(data);
      setStep('results');
      toast({
        title: "Analysis Complete",
        description: "Your funding eligibility report is ready!"
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
        <h2 className="text-2xl font-bold mb-2">Analyzing Bank Data...</h2>
        <p className="text-white/70">Calculating revenue, daily balances, and approval odds.</p>
      </div>
    );
  }

  if (step === 'results' && results) {
    const { metrics, recommendations } = results;
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
          <CardTitle className="text-2xl">Analyze My Business</CardTitle>
          <p className="text-white/70 mt-2">
            Connect your primary business account to see instant funding offers.
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
                  Connect Bank & Analyze
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
