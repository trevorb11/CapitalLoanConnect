import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Loader2, CheckCircle, AlertCircle, Shield, ArrowLeft, ChevronRight } from "lucide-react";
import tcgLogo from "@assets/tcg_white_logo_1774465809567.png";

type FlowStep = "info" | "details" | "submitting" | "accepted" | "rejected" | "error";

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

const BUSINESS_AGE_OPTIONS = [
  { value: "0", label: "Less than 1 year" },
  { value: "1", label: "1 year" },
  { value: "2", label: "2 years" },
  { value: "3", label: "3 years" },
  { value: "4", label: "4 years" },
  { value: "5", label: "5+ years" },
];

function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function formatRevenue(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString();
}

export default function GigFiStandalone() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState<FlowStep>("info");
  const [redirectUrl, setRedirectUrl] = useState("");

  // Step 1 — basic contact & business info
  const [info, setInfo] = useState({
    fullName: "",
    email: "",
    phone: "",
    businessName: "",
    monthlyRevenue: "",
    financingAmount: "",
    businessAge: "",
  });
  const [infoErrors, setInfoErrors] = useState<Record<string, string>>({});

  // Step 2 — supplemental details
  const [details, setDetails] = useState({
    ssn: "",
    dob: "",
    homeAddress: "",
    homeCity: "",
    homeState: "",
    homeZip: "",
    payFrequency: "4",
    nextPayDay: "",
  });
  const [detailErrors, setDetailErrors] = useState<Record<string, string>>({});
  const [prefillLoading, setPrefillLoading] = useState(false);
  const [prefillApplied, setPrefillApplied] = useState(false);

  // Auto-fill Step 1 from URL query params (e.g. /gig?email=jane@example.com)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get("email") || params.get("e");
    const phoneParam = params.get("phone") || params.get("p");
    if (!emailParam && !phoneParam) return;

    setPrefillLoading(true);
    const qs = emailParam
      ? `email=${encodeURIComponent(emailParam)}`
      : `phone=${encodeURIComponent(phoneParam!)}`;

    fetch(`/api/lead/prefill?${qs}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        setInfo((prev) => ({
          ...prev,
          fullName: data.fullName || prev.fullName,
          email: data.email || prev.email,
          phone: data.phone || prev.phone,
          businessName: data.businessName || prev.businessName,
        }));
        setPrefillApplied(true);
      })
      .catch(() => {})
      .finally(() => setPrefillLoading(false));
  }, []);

  const updateInfo = (field: string, value: string) => {
    setInfo((prev) => ({ ...prev, [field]: value }));
    if (infoErrors[field]) setInfoErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
  };

  const updateDetail = (field: string, value: string) => {
    setDetails((prev) => ({ ...prev, [field]: value }));
    if (detailErrors[field]) setDetailErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
  };

  const validateInfo = (): boolean => {
    const errors: Record<string, string> = {};
    if (!info.fullName.trim() || info.fullName.trim().split(/\s+/).length < 2)
      errors.fullName = "Please enter your first and last name";
    if (!info.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(info.email))
      errors.email = "Valid email address is required";
    const phoneDigits = info.phone.replace(/\D/g, "");
    if (phoneDigits.length < 10) errors.phone = "Valid 10-digit phone number is required";
    if (!info.monthlyRevenue) errors.monthlyRevenue = "Monthly revenue is required";
    setInfoErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateDetails = (): boolean => {
    const errors: Record<string, string> = {};
    if (details.ssn.replace(/\D/g, "").length !== 9) errors.ssn = "SSN must be 9 digits";
    if (!details.dob) errors.dob = "Date of birth is required";
    if (!details.homeAddress.trim()) errors.homeAddress = "Street address is required";
    if (!details.homeCity.trim()) errors.homeCity = "City is required";
    if (!details.homeState) errors.homeState = "State is required";
    if (details.homeZip.replace(/\D/g, "").length !== 5) errors.homeZip = "ZIP must be 5 digits";
    if (!details.nextPayDay) errors.nextPayDay = "Next pay date is required";
    setDetailErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      const { firstName, lastName } = splitFullName(info.fullName);
      const [y, m, d] = details.nextPayDay.split("-");
      const formattedNextPayDay = `${m}/${d}/${y}`;

      const revenueRaw = Number(info.monthlyRevenue.replace(/\D/g, "")) || 0;
      const financingRaw = Number(info.financingAmount.replace(/\D/g, "")) || 500;

      const payload = {
        firstName,
        lastName,
        email: info.email.trim(),
        phone: info.phone.replace(/\D/g, ""),
        businessName: info.businessName.trim(),
        monthlyRevenue: revenueRaw,
        financingAmount: financingRaw,
        businessAge: info.businessAge || undefined,
        ssn: details.ssn.replace(/\D/g, ""),
        dob: details.dob,
        homeAddress: details.homeAddress,
        homeCity: details.homeCity,
        homeState: details.homeState,
        homeZip: details.homeZip.replace(/\D/g, ""),
        payFrequency: details.payFrequency,
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
    onError: () => setStep("error"),
  });

  const handleSubmitDetails = () => {
    if (!validateDetails()) return;
    setStep("submitting");
    submitMutation.mutate();
  };

  // Shared styles
  const card = "w-full max-w-[600px] p-8 md:p-12 rounded-2xl relative";
  const cardStyle = {
    background: "linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 100%)",
    border: "1px solid rgba(255,255,255,0.12)",
    boxShadow: "0 16px 40px rgba(0,0,0,0.3)",
  };
  const bgStyle = { background: "linear-gradient(to bottom, #192F56 0%, #19112D 100%)" };

  const inputClass = (field: string, errors: Record<string, string>) =>
    `w-full bg-white/10 border ${errors[field] ? "border-red-400" : "border-white/20"} rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-white/50 focus:ring-1 focus:ring-white/30 transition-colors`;

  // ─── Loading ─────────────────────────────────────────────────────────────
  if (step === "submitting") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={bgStyle}>
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-white animate-spin mx-auto mb-4" />
          <h3 className="text-white text-xl font-semibold mb-2">Checking Your Options...</h3>
          <p className="text-white/70">This typically takes under 15 seconds.</p>
        </div>
      </div>
    );
  }

  // ─── Accepted ────────────────────────────────────────────────────────────
  if (step === "accepted") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={bgStyle}>
        <div className={card} style={cardStyle}>
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-400/20 to-emerald-500/20 flex items-center justify-center border border-green-400/30">
              <CheckCircle className="w-10 h-10 text-green-400" />
            </div>
            <h3 className="text-white text-2xl md:text-3xl font-bold mb-4">You've Been Approved!</h3>
            <p className="text-white/80 mb-8 text-base md:text-lg max-w-md mx-auto leading-relaxed">
              Your application has been accepted! Click below to complete the final steps on our partner's secure portal and access your funds.
            </p>
            <div className="max-w-md mx-auto">
              <a
                href={redirectUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full bg-green-500 hover:bg-green-400 text-white py-4 px-8 rounded-lg font-semibold text-lg transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg text-center"
              >
                Complete Your Application
              </a>
              <p className="text-white/50 text-sm mt-4">
                You'll be redirected to our partner's secure portal to finalize your funding.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Rejected ────────────────────────────────────────────────────────────
  if (step === "rejected") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={bgStyle}>
        <div className={card} style={cardStyle}>
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-amber-400/20 to-orange-500/20 flex items-center justify-center border border-amber-400/30">
              <AlertCircle className="w-10 h-10 text-amber-400" />
            </div>
            <h3 className="text-white text-2xl md:text-3xl font-bold mb-4">
              We Weren't Able to Match You This Time
            </h3>
            <p className="text-white/80 mb-6 text-base md:text-lg max-w-md mx-auto leading-relaxed">
              Unfortunately, we weren't able to match you with a financing option at this time. Our team has your information and will reach out if new options become available.
            </p>
            <div className="bg-white/10 rounded-xl p-6 max-w-md mx-auto mb-6 text-left">
              <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                What Happens Next
              </h4>
              <ul className="text-white/80 space-y-2 text-sm">
                <li className="flex items-start gap-2"><span className="text-white/60">1.</span><span>Your information has been saved for future follow-up</span></li>
                <li className="flex items-start gap-2"><span className="text-white/60">2.</span><span>Our team will check in as your revenue grows</span></li>
                <li className="flex items-start gap-2"><span className="text-white/60">3.</span><span>You may still qualify for other financing options</span></li>
              </ul>
            </div>
            <div className="flex flex-col gap-3 max-w-md mx-auto">
              <a
                href="/"
                className="block w-full bg-white text-[#192F56] py-4 px-8 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg text-center"
              >
                Explore Other Financing Options
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Error ───────────────────────────────────────────────────────────────
  if (step === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={bgStyle}>
        <div className={card} style={cardStyle}>
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-red-400/20 to-red-500/20 flex items-center justify-center border border-red-400/30">
              <AlertCircle className="w-10 h-10 text-red-400" />
            </div>
            <h3 className="text-white text-2xl md:text-3xl font-bold mb-4">Something Went Wrong</h3>
            <p className="text-white/80 mb-6 max-w-md mx-auto leading-relaxed">
              We ran into an issue connecting with our partner. Please try again or reach out to our team.
            </p>
            <div className="flex flex-col gap-3 max-w-md mx-auto">
              <button
                onClick={() => { setStep("details"); submitMutation.reset(); }}
                className="w-full bg-white text-[#192F56] py-4 px-8 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-all"
              >
                Try Again
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

  // ─── Step 1 — Contact & Business Info ────────────────────────────────────
  if (step === "info") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={bgStyle}>
        <div className={card} style={cardStyle}>
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <img src={tcgLogo} alt="Today Capital Group" style={{ height: "44px" }} />
          </div>

          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-gradient-to-br from-cyan-400/20 to-blue-500/20 flex items-center justify-center border border-cyan-400/30">
              <CheckCircle className="w-8 h-8 text-cyan-400" />
            </div>
            <h2 className="text-white text-2xl md:text-3xl font-bold mb-3">
              Check Your Financing Options
            </h2>
            <p className="text-white/70 text-base max-w-md mx-auto">
              You may qualify for funding with one of our partners. Fill out your info and get a decision in under 15 minutes.
            </p>
          </div>

          {/* Prefill loading state */}
          {prefillLoading && (
            <div className="flex items-center justify-center gap-2 bg-white/10 rounded-lg py-3 px-4 mb-2">
              <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
              <span className="text-white/70 text-sm">Loading your info...</span>
            </div>
          )}

          {/* Prefill success notice */}
          {prefillApplied && !prefillLoading && (
            <div className="flex items-center gap-2 bg-cyan-400/10 border border-cyan-400/30 rounded-lg py-3 px-4 mb-2">
              <CheckCircle className="w-4 h-4 text-cyan-400 flex-shrink-0" />
              <span className="text-cyan-300 text-sm">We've pre-filled your info. Please review and update if needed.</span>
            </div>
          )}

          <div className="space-y-5">
            {/* Name */}
            <div>
              <label className="text-white/70 text-sm mb-1.5 block">Full Name</label>
              <input
                type="text"
                placeholder="First and Last Name"
                value={info.fullName}
                onChange={(e) => updateInfo("fullName", e.target.value)}
                className={inputClass("fullName", infoErrors)}
                data-testid="input-gigfi-fullname"
              />
              {infoErrors.fullName && <p className="text-red-400 text-xs mt-1">{infoErrors.fullName}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="text-white/70 text-sm mb-1.5 block">Email Address</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={info.email}
                onChange={(e) => updateInfo("email", e.target.value)}
                className={inputClass("email", infoErrors)}
                data-testid="input-gigfi-email"
              />
              {infoErrors.email && <p className="text-red-400 text-xs mt-1">{infoErrors.email}</p>}
            </div>

            {/* Phone */}
            <div>
              <label className="text-white/70 text-sm mb-1.5 block">Phone Number</label>
              <input
                type="tel"
                inputMode="numeric"
                placeholder="(555) 000-0000"
                value={info.phone}
                onChange={(e) => updateInfo("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
                className={inputClass("phone", infoErrors)}
                data-testid="input-gigfi-phone"
              />
              {infoErrors.phone && <p className="text-red-400 text-xs mt-1">{infoErrors.phone}</p>}
            </div>

            {/* Business name */}
            <div>
              <label className="text-white/70 text-sm mb-1.5 block">Business Name <span className="text-white/40">(optional)</span></label>
              <input
                type="text"
                placeholder="Your Business Name"
                value={info.businessName}
                onChange={(e) => updateInfo("businessName", e.target.value)}
                className={inputClass("businessName", infoErrors)}
                data-testid="input-gigfi-business"
              />
            </div>

            {/* Revenue + Financing side by side */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-white/70 text-sm mb-1.5 block">Monthly Revenue</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50">$</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="5,000"
                    value={info.monthlyRevenue}
                    onChange={(e) => updateInfo("monthlyRevenue", formatRevenue(e.target.value))}
                    className={`${inputClass("monthlyRevenue", infoErrors)} pl-8`}
                    data-testid="input-gigfi-revenue"
                  />
                </div>
                {infoErrors.monthlyRevenue && <p className="text-red-400 text-xs mt-1">{infoErrors.monthlyRevenue}</p>}
              </div>
              <div>
                <label className="text-white/70 text-sm mb-1.5 block">Amount Needed <span className="text-white/40">(optional)</span></label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50">$</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="2,500"
                    value={info.financingAmount}
                    onChange={(e) => updateInfo("financingAmount", formatRevenue(e.target.value))}
                    className={`${inputClass("financingAmount", infoErrors)} pl-8`}
                    data-testid="input-gigfi-amount"
                  />
                </div>
              </div>
            </div>

            {/* Business age */}
            <div>
              <label className="text-white/70 text-sm mb-1.5 block">Years in Business <span className="text-white/40">(optional)</span></label>
              <select
                value={info.businessAge}
                onChange={(e) => updateInfo("businessAge", e.target.value)}
                className={`${inputClass("businessAge", infoErrors)} ${!info.businessAge ? "text-white/40" : ""}`}
                data-testid="select-gigfi-business-age"
              >
                <option value="" className="bg-[#192F56]">Select...</option>
                {BUSINESS_AGE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value} className="bg-[#192F56]">{o.label}</option>
                ))}
              </select>
            </div>

            {/* Trust signal */}
            <div className="flex items-center justify-center gap-2 text-white/40 text-xs pt-2">
              <Shield className="w-3.5 h-3.5" />
              <span>Your information is encrypted and secure</span>
            </div>

            {/* Continue */}
            <button
              onClick={() => { if (validateInfo()) setStep("details"); }}
              className="w-full bg-white text-[#192F56] py-4 px-8 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg flex items-center justify-center gap-2"
              data-testid="button-gigfi-continue"
            >
              Continue
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Step 2 — Supplemental Details ───────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={bgStyle}>
      <div className={card} style={cardStyle}>
        <button
          onClick={() => setStep("info")}
          className="absolute top-8 left-8 text-white/70 hover:text-white flex items-center gap-2 transition-colors z-10"
          data-testid="button-gigfi-back"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>

        <div className="pt-6">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <img src={tcgLogo} alt="Today Capital Group" style={{ height: "36px" }} />
          </div>

          <h3 className="text-white text-xl md:text-2xl font-bold mb-2 text-center">
            A Few More Details
          </h3>
          <p className="text-white/60 text-sm mb-6 text-center">
            This information is required to check your financing options with our partners.
          </p>

          <div className="space-y-6">
            {/* Personal Info */}
            <div>
              <h4 className="text-white/80 text-sm font-semibold uppercase tracking-wider mb-3">Personal Information</h4>
              <div className="space-y-3">
                <div>
                  <label className="text-white/70 text-sm mb-1 block">Social Security Number</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    placeholder="123456789"
                    maxLength={9}
                    value={details.ssn}
                    onChange={(e) => updateDetail("ssn", e.target.value.replace(/\D/g, "").slice(0, 9))}
                    className={inputClass("ssn", detailErrors)}
                    autoComplete="off"
                    data-testid="input-gigfi-ssn"
                  />
                  {detailErrors.ssn && <p className="text-red-400 text-xs mt-1">{detailErrors.ssn}</p>}
                </div>
                <div>
                  <label className="text-white/70 text-sm mb-1 block">Date of Birth</label>
                  <input
                    type="date"
                    value={details.dob}
                    onChange={(e) => updateDetail("dob", e.target.value)}
                    className={inputClass("dob", detailErrors)}
                    style={{ colorScheme: "dark" }}
                    data-testid="input-gigfi-dob"
                  />
                  {detailErrors.dob && <p className="text-red-400 text-xs mt-1">{detailErrors.dob}</p>}
                </div>
              </div>
            </div>

            {/* Home Address */}
            <div>
              <h4 className="text-white/80 text-sm font-semibold uppercase tracking-wider mb-3">Home Address</h4>
              <div className="space-y-3">
                <div>
                  <input
                    type="text"
                    placeholder="Street Address"
                    value={details.homeAddress}
                    onChange={(e) => updateDetail("homeAddress", e.target.value)}
                    className={inputClass("homeAddress", detailErrors)}
                    data-testid="input-gigfi-address"
                  />
                  {detailErrors.homeAddress && <p className="text-red-400 text-xs mt-1">{detailErrors.homeAddress}</p>}
                </div>
                <div className="grid grid-cols-5 gap-3">
                  <div className="col-span-2">
                    <input
                      type="text"
                      placeholder="City"
                      value={details.homeCity}
                      onChange={(e) => updateDetail("homeCity", e.target.value)}
                      className={inputClass("homeCity", detailErrors)}
                      data-testid="input-gigfi-city"
                    />
                    {detailErrors.homeCity && <p className="text-red-400 text-xs mt-1">{detailErrors.homeCity}</p>}
                  </div>
                  <div className="col-span-1">
                    <select
                      value={details.homeState}
                      onChange={(e) => updateDetail("homeState", e.target.value)}
                      className={`${inputClass("homeState", detailErrors)} ${!details.homeState ? "text-white/40" : ""}`}
                      data-testid="select-gigfi-state"
                    >
                      <option value="" className="bg-[#192F56]">ST</option>
                      {US_STATES.map((s) => (
                        <option key={s} value={s} className="bg-[#192F56]">{s}</option>
                      ))}
                    </select>
                    {detailErrors.homeState && <p className="text-red-400 text-xs mt-1">{detailErrors.homeState}</p>}
                  </div>
                  <div className="col-span-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="ZIP Code"
                      maxLength={5}
                      value={details.homeZip}
                      onChange={(e) => updateDetail("homeZip", e.target.value.replace(/\D/g, "").slice(0, 5))}
                      className={inputClass("homeZip", detailErrors)}
                      data-testid="input-gigfi-zip"
                    />
                    {detailErrors.homeZip && <p className="text-red-400 text-xs mt-1">{detailErrors.homeZip}</p>}
                  </div>
                </div>
              </div>
            </div>

            {/* Pay Schedule */}
            <div>
              <h4 className="text-white/80 text-sm font-semibold uppercase tracking-wider mb-3">Pay Schedule</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-white/70 text-sm mb-1 block">Pay Frequency</label>
                  <select
                    value={details.payFrequency}
                    onChange={(e) => updateDetail("payFrequency", e.target.value)}
                    className={inputClass("payFrequency", detailErrors)}
                    data-testid="select-gigfi-pay-freq"
                  >
                    {PAY_FREQUENCY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value} className="bg-[#192F56]">{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-white/70 text-sm mb-1 block">Next Pay Date</label>
                  <input
                    type="date"
                    value={details.nextPayDay}
                    onChange={(e) => updateDetail("nextPayDay", e.target.value)}
                    className={inputClass("nextPayDay", detailErrors)}
                    style={{ colorScheme: "dark" }}
                    data-testid="input-gigfi-payday"
                  />
                  {detailErrors.nextPayDay && <p className="text-red-400 text-xs mt-1">{detailErrors.nextPayDay}</p>}
                </div>
              </div>
            </div>

            {/* Trust signal */}
            <div className="flex items-center justify-center gap-2 text-white/40 text-xs">
              <Shield className="w-3.5 h-3.5" />
              <span>256-bit encryption — your data is secure</span>
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmitDetails}
              className="w-full bg-green-500 hover:bg-green-400 text-white py-4 px-8 rounded-lg font-semibold text-lg transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
              data-testid="button-gigfi-submit"
            >
              Check My Options
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
