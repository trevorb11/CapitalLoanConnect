import { useState, useEffect, useCallback } from "react";
import { usePlaidLink } from "react-plaid-link";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, TrendingUp, Building2, Lock } from "lucide-react";

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

function ResultCard({ title, data, icon }: { title: string; data: { status: string; reason: string }; icon: React.ReactNode }) {
  const colorClass = data.status === "High" 
    ? "bg-green-50 border-green-200 text-green-700" 
    : data.status === "Medium" 
      ? "bg-yellow-50 border-yellow-200 text-yellow-700" 
      : "bg-red-50 border-red-200 text-red-700";
  
  return (
    <div className={`border rounded-xl p-6 ${colorClass}`} data-testid={`card-result-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="flex justify-between items-start mb-4">
        <h3 className="font-bold text-lg">{title}</h3>
        {icon}
      </div>
      <div className="text-3xl font-bold mb-2" data-testid={`text-status-${title.toLowerCase().replace(/\s+/g, '-')}`}>
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
  const [formData, setFormData] = useState({ businessName: "", email: "" });
  const [error, setError] = useState<string | null>(null);

  // 1. Fetch Link Token on mount
  useEffect(() => {
    const createToken = async () => {
      try {
        const res = await apiRequest("POST", "/api/plaid/create-link-token");
        const data = await res.json();
        setLinkToken(data.link_token);
      } catch (err) {
        console.error("Failed to get Plaid link token:", err);
        setError("Failed to initialize bank connection. Please try again later.");
      }
    };
    createToken();
  }, []);

  // 2. Handle Plaid Success
  const onSuccess = useCallback(async (publicToken: string, metadata: any) => {
    setStep('analyzing');
    setError(null);
    
    try {
      const res = await apiRequest("POST", "/api/plaid/exchange-token", {
        publicToken,
        metadata,
        ...formData
      });
      const data = await res.json();
      setResults(data);
      setStep('results');
    } catch (err) {
      console.error("Analysis failed:", err);
      setError("Analysis failed. Please try again.");
      setStep('input');
    }
  }, [formData]);

  // 3. Initialize Plaid Hook
  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess,
  });

  // --- RENDER LOGIC ---

  if (step === 'analyzing') {
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
            <h1 className="text-3xl font-bold text-[#192F56]" data-testid="heading-results">
              Funding Eligibility Report
            </h1>
            <div className="flex flex-wrap justify-center gap-4 mt-4 text-sm text-gray-600">
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full" data-testid="text-monthly-revenue">
                Verified Revenue: ${Math.round(metrics.monthlyRevenue).toLocaleString()}/mo
              </span>
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full" data-testid="text-avg-balance">
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
              onClick={() => window.location.href = "/"}
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
        <CardContent className="p-8 space-y-6 bg-white">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg" data-testid="text-error">
              {error}
            </div>
          )}
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Business Name</label>
            <Input 
              value={formData.businessName}
              onChange={(e) => setFormData(prev => ({...prev, businessName: e.target.value}))}
              placeholder="e.g. Acme Corp"
              data-testid="input-business-name"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Email Address</label>
            <Input 
              value={formData.email}
              onChange={(e) => setFormData(prev => ({...prev, email: e.target.value}))}
              placeholder="you@company.com"
              type="email"
              data-testid="input-email"
            />
          </div>

          <div className="pt-4">
            <Button 
              onClick={() => open()} 
              disabled={!ready || !formData.businessName || !formData.email || !linkToken}
              className="w-full bg-[#5FBFB8] hover:bg-[#4ca8a1] text-white py-6 text-lg font-semibold flex items-center justify-center gap-2"
              data-testid="button-connect-bank"
            >
              <Lock className="w-5 h-5" />
              Connect Bank & Analyze
            </Button>
            <p className="text-xs text-center text-gray-400 mt-3">
              Secure connection via Plaid. We do not store your login credentials.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
