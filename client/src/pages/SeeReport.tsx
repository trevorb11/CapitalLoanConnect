import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, FileText, AlertCircle } from "lucide-react";

interface FundingReportResponse {
  fundingReportUrl: string;
  name: string;
  businessName: string;
}

export default function SeeReport() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const fetchReportMutation = useMutation({
    mutationFn: async (email: string): Promise<FundingReportResponse> => {
      const response = await apiRequest("POST", "/api/applications/funding-report", { email });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to find your report");
      }
      return response.json();
    },
    onSuccess: (data) => {
      // Navigate to the funding report with the stored URL
      navigate(data.fundingReportUrl);
    },
    onError: (error: Error) => {
      setError(error.message || "No funding report found for this email. Please check your email or submit a new application.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }

    if (!email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }

    fetchReportMutation.mutate(email.trim().toLowerCase());
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: "linear-gradient(to bottom, #192F56 0%, #19112D 100%)",
      }}
    >
      <div
        className="w-full max-w-md p-8 rounded-2xl"
        style={{
          background: "linear-gradient(to bottom, #192F56 0%, #19112D 100%)",
          boxShadow:
            "0 12px 30px rgba(25, 47, 86, 0.3), 0 4px 15px rgba(0, 0, 0, 0.2)",
        }}
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-white/10 rounded-full flex items-center justify-center">
            <FileText className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
            View Your Funding Report
          </h1>
          <p className="text-white/70 text-sm md:text-base">
            Enter the email you used when you applied to see your personalized funding report.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-white/80 text-sm">
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
              className="w-full p-4 border-2 border-white/30 bg-white/10 text-white rounded-lg placeholder:text-white/50 focus:border-white focus:bg-white/15 transition-colors"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500/40 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={fetchReportMutation.isPending}
            className="w-full bg-white hover:bg-gray-100 text-[#192F56] font-bold py-4 text-lg transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {fetchReportMutation.isPending ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Finding Your Report...
              </span>
            ) : (
              "View My Report"
            )}
          </Button>
        </form>

        {/* Footer Links */}
        <div className="mt-8 text-center space-y-3">
          <p className="text-white/50 text-sm">
            Don't have a report yet?
          </p>
          <button
            onClick={() => navigate("/intake/quiz")}
            className="text-white/80 hover:text-white text-sm underline transition-colors"
          >
            Start Your Free Assessment
          </button>
        </div>
      </div>
    </div>
  );
}
