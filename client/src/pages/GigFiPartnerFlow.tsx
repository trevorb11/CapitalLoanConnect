import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Loader2, ArrowLeft, CheckCircle, AlertCircle, Shield } from "lucide-react";

// Revenue tier boundaries
const GIGFI_MIN_REVENUE = 2000;
const GIGFI_MID_REVENUE = 5000;

type FlowStep = "interstitial" | "form" | "submitting" | "accepted" | "rejected" | "error";

interface GigFiPartnerFlowProps {
  quizData: {
    fullName: string;
    email: string;
    phone: string;
    businessName: string;
    monthlyRevenue: number;
    financingAmount: number;
    businessAge?: string;
    applicationId?: string;
  };
  onBack: () => void;
}

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
];

const PAY_FREQUENCY_OPTIONS = [
  { value: "1", label: "Weekly" },
  { value: "2", label: "Bi-weekly" },
  { value: "3", label: "Semi-monthly" },
  { value: "4", label: "Monthly" },
];

function formatPhoneDisplay(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

export default function GigFiPartnerFlow({ quizData, onBack }: GigFiPartnerFlowProps) {
  const [, navigate] = useLocation();
  const [step, setStep] = useState<FlowStep>("interstitial");
  const [redirectUrl, setRedirectUrl] = useState<string>("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const isTier2 = quizData.monthlyRevenue >= GIGFI_MID_REVENUE;

  // Supplemental form fields (what GigFi needs beyond the quiz)
  const [formData, setFormData] = useState({
    ssn: "",
    dob: "",
    homeAddress: "",
    homeCity: "",
    homeState: "",
    homeZip: "",
    bankName: "",
    abaNumber: "",
    accountNumber: "",
    accountType: "C" as "C" | "S",
    payFrequency: "4",
    nextPayDay: "",
  });

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    const ssnDigits = formData.ssn.replace(/\D/g, "");
    if (ssnDigits.length !== 9) errors.ssn = "SSN must be 9 digits";
    if (!formData.dob) errors.dob = "Date of birth is required";
    if (!formData.homeAddress.trim()) errors.homeAddress = "Street address is required";
    if (!formData.homeCity.trim()) errors.homeCity = "City is required";
    if (!formData.homeState) errors.homeState = "State is required";
    const zipDigits = formData.homeZip.replace(/\D/g, "");
    if (zipDigits.length !== 5) errors.homeZip = "ZIP must be 5 digits";
    if (!formData.bankName.trim()) errors.bankName = "Bank name is required";
    const abaDigits = formData.abaNumber.replace(/\D/g, "");
    if (abaDigits.length !== 9) errors.abaNumber = "Routing number must be 9 digits";
    if (!formData.accountNumber.trim()) errors.accountNumber = "Account number is required";
    if (!formData.nextPayDay) errors.nextPayDay = "Next pay date is required";

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      const { firstName, lastName } = splitFullName(quizData.fullName);

      // Format nextPayDay to mm/dd/yyyy
      const [y, m, d] = formData.nextPayDay.split("-");
      const formattedNextPayDay = `${m}/${d}/${y}`;

      const payload = {
        applicationId: quizData.applicationId,
        firstName,
        lastName,
        email: quizData.email,
        phone: quizData.phone,
        businessName: quizData.businessName,
        monthlyRevenue: quizData.monthlyRevenue,
        financingAmount: quizData.financingAmount,
        businessAge: quizData.businessAge,
        ssn: formData.ssn.replace(/\D/g, ""),
        dob: formData.dob,
        homeAddress: formData.homeAddress,
        homeCity: formData.homeCity,
        homeState: formData.homeState,
        homeZip: formData.homeZip.replace(/\D/g, ""),
        bankName: formData.bankName,
        abaNumber: formData.abaNumber.replace(/\D/g, ""),
        accountNumber: formData.accountNumber,
        accountType: formData.accountType,
        payFrequency: formData.payFrequency,
        nextPayDay: formattedNextPayDay,
      };

      const response = await apiRequest("POST", "/api/gigfi/submit", payload);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.status === "ACCEPTED" && data.redirectUrl) {
        setRedirectUrl(data.redirectUrl);
        setStep("accepted");
      } else if (data.status === "REJECTED") {
        setStep("rejected");
      } else {
        setStep("error");
      }
    },
    onError: () => {
      setStep("error");
    },
  });

  const handleSubmit = () => {
    if (!validateForm()) return;
    setStep("submitting");
    submitMutation.mutate();
  };

  // ─── Interstitial Screen ──────────────────────────────────────────
  if (step === "interstitial") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "linear-gradient(to bottom, #192F56 0%, #19112D 100%)" }}>
        <div
          className="w-full max-w-[600px] p-8 md:p-12 rounded-2xl relative overflow-hidden"
          style={{
            background: "linear-gradient(to bottom, #192F56 0%, #19112D 100%)",
            boxShadow: "0 12px 30px rgba(25, 47, 86, 0.3), 0 4px 15px rgba(0, 0, 0, 0.2)",
          }}
        >
          <button
            onClick={onBack}
            className="absolute top-8 left-8 text-white/70 hover:text-white flex items-center gap-2 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>

          <div className="text-center pt-6">
            {/* Tier-appropriate icon */}
            <div className={`w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center border ${
              isTier2
                ? "bg-gradient-to-br from-green-400/20 to-emerald-500/20 border-green-400/30"
                : "bg-gradient-to-br from-cyan-400/20 to-blue-500/20 border-cyan-400/30"
            }`}>
              {isTier2 ? (
                <CheckCircle className="w-10 h-10 text-green-400" />
              ) : (
                <svg className="w-10 h-10 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>

            {/* Tier-based messaging */}
            {isTier2 ? (
              <>
                <h3 className="text-white text-2xl md:text-3xl font-bold mb-4">
                  Great News — You're Pre-Qualified!
                </h3>
                <p className="text-white/80 mb-6 text-base md:text-lg max-w-md mx-auto leading-relaxed">
                  Based on your revenue, you're pre-qualified for financing through our partner <span className="text-green-400 font-semibold">GigFi</span>. Complete a few final details and you could be approved in as little as 15 minutes.
                </p>
              </>
            ) : (
              <>
                <h3 className="text-white text-2xl md:text-3xl font-bold mb-4">
                  Good News — You May Qualify!
                </h3>
                <p className="text-white/80 mb-6 text-base md:text-lg max-w-md mx-auto leading-relaxed">
                  You may qualify for financing through our partner <span className="text-cyan-400 font-semibold">GigFi</span>. We just need a few more details to check your options. Most applicants get a decision in under 15 minutes.
                </p>
              </>
            )}

            {/* Trust signals */}
            <div className="flex items-center justify-center gap-2 mb-8 text-white/50 text-sm">
              <Shield className="w-4 h-4" />
              <span>Your information is encrypted and secure</span>
            </div>

            <div className="max-w-md mx-auto flex flex-col gap-3">
              <button
                onClick={() => setStep("form")}
                className={`w-full py-4 px-8 rounded-lg font-semibold text-lg transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg ${
                  isTier2
                    ? "bg-green-500 hover:bg-green-400 text-white"
                    : "bg-white text-[#192F56] hover:bg-gray-100"
                }`}
              >
                Continue
              </button>
              <button
                onClick={onBack}
                className="w-full p-3 rounded-lg bg-transparent hover:bg-white/10 border border-white/20 text-white/70 hover:text-white text-base font-medium transition-all duration-200"
              >
                No Thanks
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Submitting State ─────────────────────────────────────────────
  if (step === "submitting") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "linear-gradient(to bottom, #192F56 0%, #19112D 100%)" }}>
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-white animate-spin mx-auto mb-4" />
          <h3 className="text-white text-xl font-semibold mb-2">Checking Your Options...</h3>
          <p className="text-white/70">This typically takes under 15 seconds.</p>
        </div>
      </div>
    );
  }

  // ─── Accepted Screen ──────────────────────────────────────────────
  if (step === "accepted") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "linear-gradient(to bottom, #192F56 0%, #19112D 100%)" }}>
        <div
          className="w-full max-w-[600px] p-8 md:p-12 rounded-2xl relative overflow-hidden"
          style={{
            background: "linear-gradient(to bottom, #192F56 0%, #19112D 100%)",
            boxShadow: "0 12px 30px rgba(25, 47, 86, 0.3), 0 4px 15px rgba(0, 0, 0, 0.2)",
          }}
        >
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-400/20 to-emerald-500/20 flex items-center justify-center border border-green-400/30">
              <CheckCircle className="w-10 h-10 text-green-400" />
            </div>
            <h3 className="text-white text-2xl md:text-3xl font-bold mb-4">
              You've Been Approved!
            </h3>
            <p className="text-white/80 mb-8 text-base md:text-lg max-w-md mx-auto leading-relaxed">
              GigFi has accepted your application. Click below to complete the final steps on their secure portal and access your funds.
            </p>
            <div className="max-w-md mx-auto">
              <a
                href={redirectUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full bg-green-500 hover:bg-green-400 text-white py-4 px-8 rounded-lg font-semibold text-lg transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg text-center"
              >
                Complete Your Application with GigFi
              </a>
              <p className="text-white/50 text-sm mt-4">
                You'll be redirected to GigFi's secure portal to finalize your funding.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Rejected Screen ──────────────────────────────────────────────
  if (step === "rejected") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "linear-gradient(to bottom, #192F56 0%, #19112D 100%)" }}>
        <div
          className="w-full max-w-[600px] p-8 md:p-12 rounded-2xl relative overflow-hidden"
          style={{
            background: "linear-gradient(to bottom, #192F56 0%, #19112D 100%)",
            boxShadow: "0 12px 30px rgba(25, 47, 86, 0.3), 0 4px 15px rgba(0, 0, 0, 0.2)",
          }}
        >
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-amber-400/20 to-orange-500/20 flex items-center justify-center border border-amber-400/30">
              <AlertCircle className="w-10 h-10 text-amber-400" />
            </div>
            <h3 className="text-white text-2xl md:text-3xl font-bold mb-4">
              We Weren't Able to Match You This Time
            </h3>
            <p className="text-white/80 mb-6 text-base md:text-lg max-w-md mx-auto leading-relaxed">
              Unfortunately, GigFi wasn't able to offer financing at this time. But don't worry — we've saved your information and our team will reach out if new options become available.
            </p>
            <div className="bg-white/10 rounded-xl p-6 max-w-md mx-auto mb-6 text-left">
              <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                What Happens Next
              </h4>
              <ul className="text-white/80 space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-white/60">1.</span>
                  <span>Your information has been saved for future follow-up</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-white/60">2.</span>
                  <span>Our team will check in periodically as your revenue grows</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-white/60">3.</span>
                  <span>You'll receive resources to help grow your business</span>
                </li>
              </ul>
            </div>
            <div className="flex flex-col gap-3 max-w-md mx-auto">
              <button
                onClick={() => navigate("/funding-check")}
                className="w-full bg-white text-[#192F56] py-4 px-8 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
              >
                Get Your Free Funding Analysis
              </button>
              <button
                onClick={() => navigate("/intake")}
                className="w-full p-3 rounded-lg bg-transparent hover:bg-white/10 border border-white/20 text-white/70 hover:text-white text-base font-medium transition-all duration-200"
              >
                Back to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Error Screen ─────────────────────────────────────────────────
  if (step === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "linear-gradient(to bottom, #192F56 0%, #19112D 100%)" }}>
        <div
          className="w-full max-w-[600px] p-8 md:p-12 rounded-2xl relative overflow-hidden"
          style={{
            background: "linear-gradient(to bottom, #192F56 0%, #19112D 100%)",
            boxShadow: "0 12px 30px rgba(25, 47, 86, 0.3), 0 4px 15px rgba(0, 0, 0, 0.2)",
          }}
        >
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-red-400/20 to-red-500/20 flex items-center justify-center border border-red-400/30">
              <AlertCircle className="w-10 h-10 text-red-400" />
            </div>
            <h3 className="text-white text-2xl md:text-3xl font-bold mb-4">
              Something Went Wrong
            </h3>
            <p className="text-white/80 mb-6 text-base md:text-lg max-w-md mx-auto leading-relaxed">
              We ran into an issue connecting with our partner. Please try again or reach out to our team for help.
            </p>
            <div className="flex flex-col gap-3 max-w-md mx-auto">
              <button
                onClick={() => {
                  setStep("form");
                  submitMutation.reset();
                }}
                className="w-full bg-white text-[#192F56] py-4 px-8 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
              >
                Try Again
              </button>
              <button
                onClick={() => navigate("/intake")}
                className="w-full p-3 rounded-lg bg-transparent hover:bg-white/10 border border-white/20 text-white/70 hover:text-white text-base font-medium transition-all duration-200"
              >
                Back to Home
              </button>
              <p className="text-white/50 text-sm mt-2">
                Need help?{" "}
                <a href="mailto:info@todaycapitalgroup.com" className="text-white/70 underline hover:text-white">
                  info@todaycapitalgroup.com
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Supplemental Form ────────────────────────────────────────────
  const inputClass = (field: string) =>
    `w-full bg-white/10 border ${formErrors[field] ? "border-red-400" : "border-white/20"} rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-white/50 focus:ring-1 focus:ring-white/30 transition-colors`;

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "linear-gradient(to bottom, #192F56 0%, #19112D 100%)" }}>
      <div
        className="w-full max-w-[600px] p-8 md:p-12 rounded-2xl relative overflow-hidden"
        style={{
          background: "linear-gradient(to bottom, #192F56 0%, #19112D 100%)",
          boxShadow: "0 12px 30px rgba(25, 47, 86, 0.3), 0 4px 15px rgba(0, 0, 0, 0.2)",
        }}
      >
        <button
          onClick={() => setStep("interstitial")}
          className="absolute top-8 left-8 text-white/70 hover:text-white flex items-center gap-2 transition-colors z-10"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>

        <div className="pt-6">
          <h3 className="text-white text-xl md:text-2xl font-bold mb-2 text-center">
            A Few More Details
          </h3>
          <p className="text-white/60 text-sm mb-6 text-center">
            This information is required to check your financing options with GigFi.
          </p>

          <div className="space-y-6">
            {/* Personal Info Section */}
            <div>
              <h4 className="text-white/80 text-sm font-semibold uppercase tracking-wider mb-3">Personal Information</h4>
              <div className="space-y-3">
                {/* SSN */}
                <div>
                  <label className="text-white/70 text-sm mb-1 block">Social Security Number</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    placeholder="123456789"
                    maxLength={9}
                    value={formData.ssn}
                    onChange={(e) => updateField("ssn", e.target.value.replace(/\D/g, "").slice(0, 9))}
                    className={inputClass("ssn")}
                    autoComplete="off"
                  />
                  {formErrors.ssn && <p className="text-red-400 text-xs mt-1">{formErrors.ssn}</p>}
                </div>

                {/* DOB */}
                <div>
                  <label className="text-white/70 text-sm mb-1 block">Date of Birth</label>
                  <input
                    type="date"
                    value={formData.dob}
                    onChange={(e) => updateField("dob", e.target.value)}
                    className={inputClass("dob")}
                    style={{ colorScheme: "dark" }}
                  />
                  {formErrors.dob && <p className="text-red-400 text-xs mt-1">{formErrors.dob}</p>}
                </div>
              </div>
            </div>

            {/* Home Address Section */}
            <div>
              <h4 className="text-white/80 text-sm font-semibold uppercase tracking-wider mb-3">Home Address</h4>
              <div className="space-y-3">
                <div>
                  <input
                    type="text"
                    placeholder="Street Address"
                    value={formData.homeAddress}
                    onChange={(e) => updateField("homeAddress", e.target.value)}
                    className={inputClass("homeAddress")}
                  />
                  {formErrors.homeAddress && <p className="text-red-400 text-xs mt-1">{formErrors.homeAddress}</p>}
                </div>
                <div className="grid grid-cols-5 gap-3">
                  <div className="col-span-2">
                    <input
                      type="text"
                      placeholder="City"
                      value={formData.homeCity}
                      onChange={(e) => updateField("homeCity", e.target.value)}
                      className={inputClass("homeCity")}
                    />
                    {formErrors.homeCity && <p className="text-red-400 text-xs mt-1">{formErrors.homeCity}</p>}
                  </div>
                  <div className="col-span-1">
                    <select
                      value={formData.homeState}
                      onChange={(e) => updateField("homeState", e.target.value)}
                      className={`${inputClass("homeState")} ${!formData.homeState ? "text-white/40" : ""}`}
                    >
                      <option value="" className="bg-[#192F56]">State</option>
                      {US_STATES.map((s) => (
                        <option key={s} value={s} className="bg-[#192F56]">{s}</option>
                      ))}
                    </select>
                    {formErrors.homeState && <p className="text-red-400 text-xs mt-1">{formErrors.homeState}</p>}
                  </div>
                  <div className="col-span-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="ZIP Code"
                      maxLength={5}
                      value={formData.homeZip}
                      onChange={(e) => updateField("homeZip", e.target.value.replace(/\D/g, "").slice(0, 5))}
                      className={inputClass("homeZip")}
                    />
                    {formErrors.homeZip && <p className="text-red-400 text-xs mt-1">{formErrors.homeZip}</p>}
                  </div>
                </div>
              </div>
            </div>

            {/* Bank Info Section */}
            <div>
              <h4 className="text-white/80 text-sm font-semibold uppercase tracking-wider mb-3">Bank Information</h4>
              <div className="space-y-3">
                <div>
                  <input
                    type="text"
                    placeholder="Bank Name"
                    value={formData.bankName}
                    onChange={(e) => updateField("bankName", e.target.value)}
                    className={inputClass("bankName")}
                  />
                  {formErrors.bankName && <p className="text-red-400 text-xs mt-1">{formErrors.bankName}</p>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="Routing Number"
                      maxLength={9}
                      value={formData.abaNumber}
                      onChange={(e) => updateField("abaNumber", e.target.value.replace(/\D/g, "").slice(0, 9))}
                      className={inputClass("abaNumber")}
                    />
                    {formErrors.abaNumber && <p className="text-red-400 text-xs mt-1">{formErrors.abaNumber}</p>}
                  </div>
                  <div>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="Account Number"
                      value={formData.accountNumber}
                      onChange={(e) => updateField("accountNumber", e.target.value.replace(/\D/g, ""))}
                      className={inputClass("accountNumber")}
                    />
                    {formErrors.accountNumber && <p className="text-red-400 text-xs mt-1">{formErrors.accountNumber}</p>}
                  </div>
                </div>
                <div>
                  <label className="text-white/70 text-sm mb-2 block">Account Type</label>
                  <div className="flex gap-4">
                    {(["C", "S"] as const).map((type) => (
                      <label
                        key={type}
                        className={`flex items-center cursor-pointer px-4 py-2 rounded-lg transition-all duration-200 ${
                          formData.accountType === type ? "bg-white/20 border border-white/40" : "bg-white/5 border border-white/10 hover:bg-white/10"
                        }`}
                      >
                        <input
                          type="radio"
                          name="accountType"
                          value={type}
                          checked={formData.accountType === type}
                          onChange={() => updateField("accountType", type)}
                          className="sr-only"
                        />
                        <span className="text-white text-sm">{type === "C" ? "Checking" : "Savings"}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Info Section */}
            <div>
              <h4 className="text-white/80 text-sm font-semibold uppercase tracking-wider mb-3">Payment Schedule</h4>
              <div className="space-y-3">
                <div>
                  <label className="text-white/70 text-sm mb-1 block">How often do you receive revenue?</label>
                  <select
                    value={formData.payFrequency}
                    onChange={(e) => updateField("payFrequency", e.target.value)}
                    className={inputClass("payFrequency")}
                  >
                    {PAY_FREQUENCY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value} className="bg-[#192F56]">{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-white/70 text-sm mb-1 block">Next expected deposit date</label>
                  <input
                    type="date"
                    value={formData.nextPayDay}
                    onChange={(e) => updateField("nextPayDay", e.target.value)}
                    className={inputClass("nextPayDay")}
                    style={{ colorScheme: "dark" }}
                  />
                  {formErrors.nextPayDay && <p className="text-red-400 text-xs mt-1">{formErrors.nextPayDay}</p>}
                </div>
              </div>
            </div>

            {/* Security Note */}
            <div className="flex items-center gap-2 text-white/40 text-xs">
              <Shield className="w-4 h-4 flex-shrink-0" />
              <span>Your data is encrypted with 256-bit SSL and transmitted securely to our lending partner.</span>
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={submitMutation.isPending}
              className="w-full bg-white text-[#192F56] py-4 px-8 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitMutation.isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Submitting...
                </span>
              ) : (
                "Check My Options"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
