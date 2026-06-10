import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Globe, Loader2, LayoutList } from "lucide-react";
import { Link } from "wouter";

export default function RepWebsiteReferral() {
  const [repName, setRepName] = useState("");
  const [repEmail, setRepEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Auto-populate rep name/email from session if logged in
  useEffect(() => {
    fetch("/api/auth/check", { credentials: "include" })
      .then(r => r.json())
      .then(data => {
        if (data.isAuthenticated && data.agentName) {
          setRepName(data.agentName);
          setRepEmail(data.agentEmail || "");
          setIsLoggedIn(true);
        }
      })
      .catch(() => {});
  }, []);

  const resetForm = () => {
    setFirstName(""); setLastName(""); setEmail(""); setPhone("");
    setBusinessName(""); setNotes(""); setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repName.trim()) { setError("Please enter your name."); return; }
    if (!email.trim()) { setError("Lead email is required."); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/services/interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          firstName: firstName.trim() || null,
          lastName: lastName.trim() || null,
          phone: phone.trim() || null,
          businessName: businessName.trim() || null,
          service: "website",
          otherDetails: notes.trim() || null,
          source: "rep-referral",
          utmSource: repName.trim(),
          utmCampaign: "rep-referral",
          repEmail: repEmail.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
        <Card className="bg-gray-900 border-gray-800 max-w-md w-full text-center">
          <CardContent className="p-8 space-y-4">
            <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto" />
            <h2 className="text-xl font-bold text-white">Lead Submitted</h2>
            <p className="text-gray-400 text-sm">
              The website lead has been saved and marketing has been notified.
            </p>
            <div className="flex flex-col gap-2">
              <Button
                onClick={() => { setSubmitted(false); resetForm(); }}
                className="bg-blue-600 text-white"
                data-testid="button-submit-another"
              >
                Submit Another Lead
              </Button>
              {isLoggedIn && (
                <Link href="/rep/website-referral-dashboard">
                  <Button variant="outline" className="w-full border-gray-700 text-gray-300 hover:text-white gap-2" data-testid="button-view-dashboard">
                    <LayoutList className="w-4 h-4" /> View My Referrals
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-lg mx-auto space-y-6 py-8">

        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-cyan-500/10 border border-cyan-500/30 rounded-full flex items-center justify-center mx-auto">
            <Globe className="w-6 h-6 text-cyan-400" />
          </div>
          <h1 className="text-2xl font-bold">Website Lead Referral</h1>
          <p className="text-gray-400 text-sm max-w-sm mx-auto">
            Fill this out for any client interested in a website build. Marketing will be notified and follow up directly.
          </p>
          {isLoggedIn && (
            <Link href="/rep/website-referral-dashboard">
              <button className="text-xs text-cyan-400 hover:text-cyan-300 underline underline-offset-2 transition-colors" data-testid="link-my-referrals">
                View my referral leads
              </button>
            </Link>
          )}
        </div>

        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-5">

              <div className="space-y-1.5">
                <Label className="text-sm text-gray-300">
                  Your Name <span className="text-red-400">*</span>
                </Label>
                <Input
                  value={repName}
                  onChange={e => setRepName(e.target.value)}
                  placeholder="e.g. Jonathan Rendon"
                  className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                  data-testid="input-rep-name"
                  readOnly={isLoggedIn}
                  required
                />
                {isLoggedIn && (
                  <p className="text-xs text-gray-600">Auto-filled from your login session.</p>
                )}
              </div>

              <div className="border-t border-gray-800 pt-4">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-4">Lead Info</p>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-sm text-gray-300">First Name</Label>
                      <Input
                        value={firstName}
                        onChange={e => setFirstName(e.target.value)}
                        placeholder="First"
                        className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                        data-testid="input-first-name"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm text-gray-300">Last Name</Label>
                      <Input
                        value={lastName}
                        onChange={e => setLastName(e.target.value)}
                        placeholder="Last"
                        className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                        data-testid="input-last-name"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm text-gray-300">
                      Email <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="client@example.com"
                      className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                      data-testid="input-email"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm text-gray-300">Phone</Label>
                    <Input
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="(555) 000-0000"
                      className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                      data-testid="input-phone"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm text-gray-300">Business Name</Label>
                    <Input
                      value={businessName}
                      onChange={e => setBusinessName(e.target.value)}
                      placeholder="Acme LLC"
                      className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                      data-testid="input-business-name"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm text-gray-300">Notes</Label>
                    <Textarea
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder="Anything useful for marketing to know about this lead…"
                      className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 min-h-24"
                      data-testid="input-notes"
                    />
                  </div>
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-400" data-testid="text-error">{error}</p>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white"
                data-testid="button-submit"
              >
                {loading
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting…</>
                  : "Submit Lead"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-gray-600">Today Capital Group — Internal Rep Tool</p>
      </div>
    </div>
  );
}
