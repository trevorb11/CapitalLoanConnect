import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { Building2, Loader2, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import FullApplication from "@/pages/FullApplication";

interface PartnerInfo {
  partnerId: string;
  companyName: string;
  contactName: string;
}

export default function PartnerApplication() {
  const [, params] = useRoute("/apply/:slug");
  const [status, setStatus] = useState<"loading" | "valid" | "invalid">("loading");
  const [partnerInfo, setPartnerInfo] = useState<PartnerInfo | null>(null);

  useEffect(() => {
    const validateSlug = async () => {
      if (!params?.slug) {
        setStatus("invalid");
        return;
      }

      try {
        const res = await fetch(`/api/partner/validate-slug/${params.slug}`);
        const data = await res.json();

        if (data.valid) {
          setPartnerInfo({
            partnerId: data.partnerId,
            companyName: data.companyName,
            contactName: data.contactName,
          });

          // Store partner info in localStorage so FullApplication picks it up
          localStorage.setItem("referralPartnerId", data.partnerId);
          localStorage.setItem("referralPartnerCode", params.slug);
          localStorage.setItem("referralCompanyName", data.companyName);
          setStatus("valid");
        } else {
          setStatus("invalid");
        }
      } catch (error) {
        console.error("Error validating partner slug:", error);
        setStatus("invalid");
      }
    };

    validateSlug();
  }, [params?.slug]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#051D49] to-[#0D1B4A] p-4">
        <Card className="w-full max-w-md p-8 bg-white text-center">
          <Loader2 className="w-12 h-12 text-[#46B9B3] animate-spin mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-[#051D49] mb-2">Loading Application</h1>
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
          <h1 className="text-xl font-semibold text-[#051D49] mb-2">Invalid Application Link</h1>
          <p className="text-gray-500 mb-6">
            This application link is no longer valid. You can still apply for funding directly.
          </p>
          <Button
            onClick={() => window.location.href = "/"}
            className="w-full bg-[#46B9B3] hover:bg-[#3da8a2] text-[#051D49]"
          >
            Apply for Funding
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#051D49] to-[#0D1B4A]">
      {/* Partner branded header */}
      <div className="bg-[#051D49] border-b border-white/10 py-3 px-4">
        <div className="max-w-4xl mx-auto flex items-center justify-center gap-3">
          <div className="w-8 h-8 bg-[#46B9B3]/20 rounded-full flex items-center justify-center">
            <Building2 className="w-4 h-4 text-[#46B9B3]" />
          </div>
          <span className="text-white/70 text-sm">
            Referred by <span className="text-white font-medium">{partnerInfo?.companyName}</span>
          </span>
        </div>
      </div>

      {/* Render the full application form */}
      <FullApplication />
    </div>
  );
}
