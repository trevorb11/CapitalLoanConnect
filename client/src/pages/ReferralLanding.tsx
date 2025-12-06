import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

export default function ReferralLanding() {
  const [, params] = useRoute("/r/:code");
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<"loading" | "valid" | "invalid">("loading");
  const [partnerInfo, setPartnerInfo] = useState<{
    partnerId: string;
    companyName: string;
  } | null>(null);

  useEffect(() => {
    const validateCode = async () => {
      if (!params?.code) {
        setStatus("invalid");
        return;
      }

      try {
        const res = await fetch(`/api/partner/validate-code/${params.code}`);
        const data = await res.json();

        if (data.valid) {
          setPartnerInfo({
            partnerId: data.partnerId,
            companyName: data.companyName,
          });
          setStatus("valid");

          // Store partner info in localStorage for form submission
          localStorage.setItem("referralPartnerId", data.partnerId);
          localStorage.setItem("referralPartnerCode", params.code.toUpperCase());
          localStorage.setItem("referralCompanyName", data.companyName);
        } else {
          setStatus("invalid");
        }
      } catch (error) {
        console.error("Error validating referral code:", error);
        setStatus("invalid");
      }
    };

    validateCode();
  }, [params?.code]);

  const handleContinue = () => {
    // Redirect to intake form with referral tracking in place
    setLocation("/intake");
  };

  const handleGoHome = () => {
    setLocation("/");
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#051D49] to-[#0D1B4A] p-4">
        <Card className="w-full max-w-md p-8 bg-white text-center">
          <Loader2 className="w-12 h-12 text-[#46B9B3] animate-spin mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-[#051D49] mb-2">
            Validating Referral Link
          </h1>
          <p className="text-gray-500">Please wait...</p>
        </Card>
      </div>
    );
  }

  if (status === "invalid") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#051D49] to-[#0D1B4A] p-4">
        <Card className="w-full max-w-md p-8 bg-white text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-xl font-semibold text-[#051D49] mb-2">
            Invalid Referral Link
          </h1>
          <p className="text-gray-500 mb-6">
            This referral link is no longer valid or has expired.
            You can still apply for funding directly.
          </p>
          <div className="space-y-3">
            <Button
              onClick={handleGoHome}
              className="w-full bg-[#46B9B3] hover:bg-[#3da8a2] text-[#051D49]"
            >
              Apply for Funding
            </Button>
            <p className="text-xs text-gray-400">
              If you believe this is an error, please contact your referral partner.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#051D49] to-[#0D1B4A] p-4">
      <Card className="w-full max-w-lg p-8 bg-white">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#46B9B3]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-[#46B9B3]" />
          </div>
          <h1 className="text-2xl font-bold text-[#051D49] mb-2">
            Welcome!
          </h1>
          <p className="text-gray-500">
            You've been referred by a trusted partner
          </p>
        </div>

        {/* Partner Info Card */}
        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#051D49] rounded-full flex items-center justify-center">
              <Building2 className="w-6 h-6 text-[#46B9B3]" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Referred by</p>
              <p className="font-semibold text-[#051D49]">{partnerInfo?.companyName}</p>
            </div>
          </div>
        </div>

        {/* Benefits */}
        <div className="space-y-4 mb-8">
          <h2 className="font-semibold text-[#051D49]">What you'll get:</h2>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-[#46B9B3] mt-0.5 flex-shrink-0" />
              <span className="text-gray-600">
                Fast funding decisions - often within 24-48 hours
              </span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-[#46B9B3] mt-0.5 flex-shrink-0" />
              <span className="text-gray-600">
                Personalized funding recommendations based on your business
              </span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-[#46B9B3] mt-0.5 flex-shrink-0" />
              <span className="text-gray-600">
                Your advisor stays informed of your application status
              </span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-[#46B9B3] mt-0.5 flex-shrink-0" />
              <span className="text-gray-600">
                Access to multiple funding options from $10K to $5M+
              </span>
            </li>
          </ul>
        </div>

        <Button
          onClick={handleContinue}
          className="w-full bg-[#46B9B3] hover:bg-[#3da8a2] text-[#051D49] font-semibold py-6 text-lg"
        >
          Start Your Application
        </Button>

        <p className="text-center text-xs text-gray-400 mt-4">
          Takes only 2-3 minutes. No credit check required for pre-qualification.
        </p>
      </Card>
    </div>
  );
}
