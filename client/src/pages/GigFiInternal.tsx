import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Send, CheckCircle2, XCircle, AlertTriangle, ChevronRight, LogOut, Loader2, ExternalLink, Copy, X, DollarSign, User, Building2, Phone, Mail, CalendarDays, ShieldCheck } from "lucide-react";

interface AuthState {
  isAuthenticated: boolean;
  role?: string;
  agentEmail?: string;
  agentName?: string;
}

interface AppResult {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  businessName: string;
  legalBusinessName: string;
  monthlyRevenue: string | null;
  averageMonthlyRevenue: string | null;
  requestedAmount: string | null;
  timeInBusiness: string | null;
  socialSecurityNumber: string | null;
  dateOfBirth: string | null;
  ownerAddress1: string | null;
  ownerCity: string | null;
  ownerState: string | null;
  ownerZip: string | null;
  businessStreetAddress: string | null;
  businessCsz: string | null;
  personalCreditScoreRange: string | null;
  creditScore: string | null;
  createdAt: string;
}

interface GigFiResult {
  success: boolean;
  status: "ACCEPTED" | "REJECTED" | "ERROR";
  decisionId?: string;
  redirectUrl?: string;
  bidAmount?: number;
  errorMessage?: string;
}

function parseName(fullName: string): { firstName: string; lastName: string } {
  const parts = (fullName || "").trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  const lastName = parts[parts.length - 1];
  const firstName = parts.slice(0, -1).join(" ");
  return { firstName, lastName };
}

function parseCsz(csz: string | null): { city: string; state: string; zip: string } {
  if (!csz) return { city: "", state: "", zip: "" };
  const match = csz.match(/^(.+),\s*([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/);
  if (match) return { city: match[1].trim(), state: match[2], zip: match[3] };
  return { city: "", state: "", zip: "" };
}

function getNextPayDate(frequency: string): string {
  const today = new Date();
  const month = today.getMonth();
  const year = today.getFullYear();

  if (frequency === "4") {
    // Monthly: first of next month
    const next = new Date(year, month + 1, 1);
    return `${String(next.getMonth() + 1).padStart(2, "0")}/${String(next.getDate()).padStart(2, "0")}/${next.getFullYear()}`;
  }
  // Bi-weekly / semi-monthly: next 15th or 1st
  const day15 = new Date(year, month, 15);
  const next1 = new Date(year, month + 1, 1);
  const target = today < day15 ? day15 : next1;
  return `${String(target.getMonth() + 1).padStart(2, "0")}/${String(target.getDate()).padStart(2, "0")}/${target.getFullYear()}`;
}

function isDobSuspicious(dob: string | null): boolean {
  if (!dob) return false;
  const year = parseInt((dob || "").substring(0, 4));
  return year >= 2020;
}

function LoginForm({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  const [credential, setCredential] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential }),
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Login failed");
      }
      onLoginSuccess();
    } catch (err: any) {
      setError(err.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-sm p-8 space-y-6">
        <div className="text-center space-y-1">
          <div className="flex justify-center mb-3">
            <div className="w-10 h-10 rounded-md bg-primary flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-xl font-semibold">Internal Access</h1>
          <p className="text-sm text-muted-foreground">GigFi Submission Tool — TCG Staff Only</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="credential">Credential</Label>
            <Input
              id="credential"
              type="password"
              value={credential}
              onChange={(e) => setCredential(e.target.value)}
              placeholder="Enter your credential"
              data-testid="input-credential"
              autoFocus
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading} data-testid="button-login">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Sign In
          </Button>
        </form>
      </Card>
    </div>
  );
}

interface SubmitPanelProps {
  app: AppResult;
  onClose: () => void;
}

function SubmitPanel({ app, onClose }: SubmitPanelProps) {
  const { toast } = useToast();
  const { firstName, lastName } = parseName(app.fullName || "");

  const city = app.ownerCity || parseCsz(app.businessCsz).city;
  const state = app.ownerState || parseCsz(app.businessCsz).state;
  const zip = app.ownerZip || parseCsz(app.businessCsz).zip;
  const street = app.ownerAddress1 || app.businessStreetAddress || "";
  const ssn = (app.socialSecurityNumber || "").replace(/\D/g, "");
  const revenue = parseFloat(String(app.averageMonthlyRevenue || app.monthlyRevenue || "0")) || 0;

  const [payFrequency, setPayFrequency] = useState("2");
  const [nextPayDay, setNextPayDay] = useState(getNextPayDate("2"));
  const [monthlyRevenue, setMonthlyRevenue] = useState(String(revenue || ""));
  const [financingAmount, setFinancingAmount] = useState(String(parseFloat(String(app.requestedAmount || "5000")) || 5000));
  const [result, setResult] = useState<GigFiResult | null>(null);

  const missingSSN = ssn.length !== 9;
  const missingDOB = !app.dateOfBirth;
  const suspiciousDOB = isDobSuspicious(app.dateOfBirth);
  const missingAddress = !street;
  const canSubmit = !missingSSN && !missingDOB && !suspiciousDOB;

  const submitMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        applicationId: app.id,
        firstName,
        lastName,
        email: app.email,
        phone: (app.phone || "").replace(/\D/g, ""),
        businessName: app.businessName || app.legalBusinessName || `${app.fullName} LLC`,
        monthlyRevenue: parseFloat(monthlyRevenue) || 3000,
        financingAmount: parseFloat(financingAmount) || 5000,
        businessAge: app.timeInBusiness || "1-2 years",
        ssn,
        dob: app.dateOfBirth,
        homeAddress: street,
        homeCity: city,
        homeState: state,
        homeZip: zip,
        payFrequency,
        nextPayDay,
      };
      const res = await fetch("/api/gigfi/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      return res.json() as Promise<GigFiResult>;
    },
    onSuccess: (data) => {
      setResult(data);
      if (data.status === "ACCEPTED") {
        toast({ title: "GigFi: Accepted", description: `Decision ID: ${data.decisionId}` });
      } else if (data.status === "REJECTED") {
        toast({ title: "GigFi: Rejected", description: `Decision ID: ${data.decisionId}`, variant: "destructive" });
      }
    },
    onError: () => {
      toast({ title: "Submission failed", description: "Could not reach GigFi. Try again.", variant: "destructive" });
    },
  });

  const handleFreqChange = (val: string) => {
    setPayFrequency(val);
    setNextPayDay(getNextPayDate(val));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b">
        <div>
          <h2 className="font-semibold text-base">{app.fullName?.trim()}</h2>
          <p className="text-sm text-muted-foreground">{app.businessName?.trim() || app.legalBusinessName?.trim() || "No business name"}</p>
        </div>
        <Button size="icon" variant="ghost" onClick={onClose} data-testid="button-close-panel">
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Applicant snapshot */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Mail className="w-3.5 h-3.5" /><span>{app.email}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Phone className="w-3.5 h-3.5" /><span>{app.phone}</span>
          </div>
          {street && (
            <div className="flex items-start gap-2 text-muted-foreground">
              <Building2 className="w-3.5 h-3.5 mt-0.5" />
              <span>{street}{city ? `, ${city}, ${state} ${zip}` : ""}</span>
            </div>
          )}
        </div>

        {/* Field warnings */}
        {(missingSSN || missingDOB || suspiciousDOB || missingAddress) && (
          <div className="space-y-1.5">
            {missingSSN && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <XCircle className="w-4 h-4" /><span>SSN missing or invalid — cannot submit</span>
              </div>
            )}
            {missingDOB && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <XCircle className="w-4 h-4" /><span>Date of birth missing — cannot submit</span>
              </div>
            )}
            {suspiciousDOB && (
              <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                <AlertTriangle className="w-4 h-4" /><span>DOB looks invalid ({app.dateOfBirth}) — likely data entry error</span>
              </div>
            )}
            {missingAddress && (
              <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                <AlertTriangle className="w-4 h-4" /><span>Home address missing — GigFi may reject</span>
              </div>
            )}
          </div>
        )}

        {/* Editable fields */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Monthly Revenue ($)</Label>
              <Input
                value={monthlyRevenue}
                onChange={(e) => setMonthlyRevenue(e.target.value)}
                placeholder="e.g. 7000"
                type="number"
                data-testid="input-monthly-revenue"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Financing Amount ($)</Label>
              <Input
                value={financingAmount}
                onChange={(e) => setFinancingAmount(e.target.value)}
                placeholder="e.g. 5000"
                type="number"
                data-testid="input-financing-amount"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Pay Frequency</Label>
              <Select value={payFrequency} onValueChange={handleFreqChange}>
                <SelectTrigger data-testid="select-pay-frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Weekly</SelectItem>
                  <SelectItem value="2">Bi-weekly</SelectItem>
                  <SelectItem value="3">Semi-monthly</SelectItem>
                  <SelectItem value="4">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Next Pay Date</Label>
              <Input
                value={nextPayDay}
                onChange={(e) => setNextPayDay(e.target.value)}
                placeholder="MM/DD/YYYY"
                data-testid="input-next-payday"
              />
            </div>
          </div>

          <div className="rounded-md border p-3 bg-muted/40 space-y-1.5 text-sm">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Identity (read-only)</p>
            <div className="flex justify-between">
              <span className="text-muted-foreground">SSN</span>
              <span className={missingSSN ? "text-destructive" : ""}>
                {ssn.length === 9 ? `***-**-${ssn.slice(-4)}` : "Missing"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">DOB</span>
              <span className={suspiciousDOB ? "text-amber-600 dark:text-amber-400" : ""}>
                {app.dateOfBirth || "Missing"}
                {suspiciousDOB && " ⚠"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Business Age</span>
              <span>{app.timeInBusiness || "Unknown"}</span>
            </div>
          </div>
        </div>

        {/* Result */}
        {result && (
          <div className={`rounded-md border p-4 space-y-3 ${result.status === "ACCEPTED" ? "border-green-500/30 bg-green-500/5" : result.status === "REJECTED" ? "border-destructive/30 bg-destructive/5" : "border-border"}`}>
            <div className="flex items-center gap-2">
              {result.status === "ACCEPTED" ? (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              ) : result.status === "REJECTED" ? (
                <XCircle className="w-5 h-5 text-destructive" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-500" />
              )}
              <span className="font-semibold">
                {result.status === "ACCEPTED" ? "Accepted by GigFi" : result.status === "REJECTED" ? "Rejected by GigFi" : "Submission Error"}
              </span>
            </div>

            {result.decisionId && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Decision ID</p>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-muted px-2 py-1 rounded flex-1 truncate">{result.decisionId}</code>
                  <Button size="icon" variant="ghost" onClick={() => copyToClipboard(result.decisionId!)} data-testid="button-copy-decision-id">
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )}

            {result.redirectUrl && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">GigFi Portal Link (send to applicant)</p>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-muted px-2 py-1 rounded flex-1 truncate">{result.redirectUrl}</code>
                  <Button size="icon" variant="ghost" onClick={() => copyToClipboard(result.redirectUrl!)} data-testid="button-copy-redirect">
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-1"
                  onClick={() => window.open(result.redirectUrl!, "_blank")}
                  data-testid="button-open-gigfi"
                >
                  <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                  Open GigFi Portal
                </Button>
              </div>
            )}

            {result.errorMessage && (
              <p className="text-sm text-destructive">{result.errorMessage}</p>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      {!result && (
        <div className="p-5 border-t">
          <Button
            className="w-full"
            disabled={!canSubmit || submitMutation.isPending}
            onClick={() => submitMutation.mutate()}
            data-testid="button-submit-gigfi"
          >
            {submitMutation.isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-2" />Submitting...</>
            ) : (
              <><Send className="w-4 h-4 mr-2" />Submit to GigFi</>
            )}
          </Button>
          {!canSubmit && (
            <p className="text-xs text-muted-foreground text-center mt-2">
              Fix the issues above before submitting
            </p>
          )}
        </div>
      )}
      {result && (
        <div className="p-5 border-t">
          <Button variant="outline" className="w-full" onClick={() => setResult(null)} data-testid="button-submit-another">
            Submit Again / Adjust
          </Button>
        </div>
      )}
    </div>
  );
}

function AppCard({ app, selected, onSelect }: { app: AppResult; selected: boolean; onSelect: () => void }) {
  const ssn = (app.socialSecurityNumber || "").replace(/\D/g, "");
  const hasSSN = ssn.length === 9;
  const hasDOB = !!app.dateOfBirth && !isDobSuspicious(app.dateOfBirth);
  const hasBadDOB = !!app.dateOfBirth && isDobSuspicious(app.dateOfBirth);
  const revenue = parseFloat(String(app.averageMonthlyRevenue || app.monthlyRevenue || "0")) || 0;
  const amount = parseFloat(String(app.requestedAmount || "0")) || 0;

  return (
    <button
      onClick={onSelect}
      data-testid={`card-app-${app.id}`}
      className={`w-full text-left rounded-md border p-4 transition-colors hover-elevate ${selected ? "border-primary/50 bg-primary/5" : "hover:bg-muted/30"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm truncate">{app.fullName?.trim()}</span>
          </div>
          <p className="text-xs text-muted-foreground truncate mt-0.5">{app.businessName?.trim() || app.legalBusinessName?.trim() || app.email}</p>
          <p className="text-xs text-muted-foreground">{app.email}</p>

          <div className="flex flex-wrap gap-1.5 mt-2">
            <Badge variant={hasSSN ? "secondary" : "destructive"} className="text-xs">
              {hasSSN ? "SSN ✓" : "SSN ✗"}
            </Badge>
            <Badge variant={hasDOB ? "secondary" : hasBadDOB ? "outline" : "destructive"} className={`text-xs ${hasBadDOB ? "border-amber-500/50 text-amber-600 dark:text-amber-400" : ""}`}>
              {hasDOB ? "DOB ✓" : hasBadDOB ? "DOB ⚠" : "DOB ✗"}
            </Badge>
            {revenue > 0 && (
              <Badge variant="secondary" className="text-xs">
                ${revenue.toLocaleString()}/mo
              </Badge>
            )}
            {amount > 0 && (
              <Badge variant="outline" className="text-xs">
                ${amount.toLocaleString()} requested
              </Badge>
            )}
          </div>
        </div>
        <ChevronRight className={`w-4 h-4 mt-1 flex-shrink-0 transition-transform ${selected ? "text-primary rotate-90" : "text-muted-foreground"}`} />
      </div>
    </button>
  );
}

export default function GigFiInternal() {
  const [auth, setAuth] = useState<AuthState>({ isAuthenticated: false });
  const [authChecked, setAuthChecked] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedApp, setSelectedApp] = useState<AppResult | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/api/auth/check", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data.isAuthenticated) setAuth({ isAuthenticated: true, ...data });
        setAuthChecked(true);
      })
      .catch(() => setAuthChecked(true));
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQuery(searchQuery), 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery]);

  const { data: searchData, isFetching } = useQuery<{ results: AppResult[] }>({
    queryKey: ["/api/gigfi/search", debouncedQuery],
    queryFn: async () => {
      if (debouncedQuery.length < 2) return { results: [] };
      const res = await fetch(`/api/gigfi/search?q=${encodeURIComponent(debouncedQuery)}`, { credentials: "include" });
      if (!res.ok) return { results: [] };
      return res.json();
    },
    enabled: auth.isAuthenticated && debouncedQuery.length >= 2,
  });

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    setAuth({ isAuthenticated: false });
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!auth.isAuthenticated) {
    return <LoginForm onLoginSuccess={() => setAuth({ isAuthenticated: true })} />;
  }

  const results = searchData?.results || [];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded bg-primary flex items-center justify-center">
            <Send className="w-3.5 h-3.5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-semibold text-sm">GigFi Submission Tool</h1>
            <p className="text-xs text-muted-foreground">Internal — TCG Staff Only</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {auth.agentName && (
            <span className="text-sm text-muted-foreground hidden sm:block">{auth.agentName}</span>
          )}
          <Button variant="ghost" size="sm" onClick={handleLogout} data-testid="button-logout">
            <LogOut className="w-4 h-4 mr-1.5" />
            Sign Out
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Search + Results */}
        <div className={`flex flex-col border-r transition-all ${selectedApp ? "w-full sm:w-96 hidden sm:flex" : "w-full max-w-2xl mx-auto"}`}>
          <div className="p-4 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search by name, email, phone, or business..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                data-testid="input-search"
              />
              {isFetching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {debouncedQuery.length < 2 && (
              <div className="text-center py-16 text-muted-foreground">
                <Search className="w-8 h-8 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Search for a completed application to send to GigFi</p>
                <p className="text-xs mt-1 opacity-60">Only full applications with SSN &amp; DOB are eligible</p>
              </div>
            )}

            {debouncedQuery.length >= 2 && !isFetching && results.length === 0 && (
              <div className="text-center py-16 text-muted-foreground">
                <p className="text-sm">No full applications found for "{debouncedQuery}"</p>
              </div>
            )}

            {results.map((app) => (
              <AppCard
                key={app.id}
                app={app}
                selected={selectedApp?.id === app.id}
                onSelect={() => setSelectedApp(app)}
              />
            ))}
          </div>
        </div>

        {/* Right: Submit Panel */}
        {selectedApp && (
          <div className="flex-1 flex flex-col overflow-hidden sm:max-w-lg">
            <SubmitPanel key={selectedApp.id} app={selectedApp} onClose={() => setSelectedApp(null)} />
          </div>
        )}

        {!selectedApp && (
          <div className="hidden sm:flex flex-1 items-center justify-center text-muted-foreground">
            <div className="text-center space-y-2">
              <ChevronRight className="w-8 h-8 mx-auto opacity-20" />
              <p className="text-sm">Select an applicant to review and submit</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
