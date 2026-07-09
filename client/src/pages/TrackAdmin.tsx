import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Users,
  FileText,
  Upload,
  Search,
  ChevronDown,
  ChevronRight,
  Lock,
  LogOut,
  ArrowLeft,
  Building2,
  Phone,
  DollarSign,
  Briefcase,
  RefreshCw,
  Flame,
  TrendingUp,
  Target,
  MessageSquare,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { Link } from "wouter";

interface LeadPosition {
  id: string;
  funderName: string;
  productType: string | null;
  fundedAmount: string | null;
  paybackAmount: string | null;
  paymentAmount: string | null;
  paymentFrequency: string | null;
  fundedDate: string | null;
  estimatedPayoffDate: string | null;
  remainingBalance: string | null;
  status: string;
  notes: string | null;
}

interface LeadStatement {
  id: number;
  fileName: string;
  uploadedAt: string;
  source: string | null;
}

interface LeadAccount {
  id: number;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  business_name: string | null;
  industry: string | null;
  monthly_revenue: string | null;
  time_in_business: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  last_active_at: string | null;
  position_count: string;
  statement_count: string;
  positions: LeadPosition[] | null;
  statements: LeadStatement[] | null;
  // Sales intelligence from merchant_positions
  tier: string | null;
  funder_count: number | null;
  named_funder_count: number | null;
  daily_load: string | null;
  uw_status: string | null;
  uw_lender: string | null;
  uw_amount: string | null;
  uw_funded_date: string | null;
  uw_approval_count: number | null;
  uw_decline_count: number | null;
  outreach_status: string | null;
  outreach_notes: string | null;
  funder_names: string | null;
}

type SortField = "score" | "name" | "daily_load" | "created";
type FilterTier = "all" | "HOT" | "WARM" | "SOON" | "EARLY" | "none";
type FilterOutreach = "all" | "not_contacted" | "contacted" | "in_progress" | "converted" | "passed";

function computeScore(a: LeadAccount): number {
  let score = 0;
  const tier = a.tier || "EARLY";
  if (tier === "HOT") score += 30;
  else if (tier === "WARM") score += 15;
  else if (tier === "SOON") score += 5;

  score += (a.named_funder_count || 0) * 10;

  if (a.uw_funded_date) score += 25;
  else if (a.uw_status === "approved") score += 20;
  score += Math.min(a.uw_approval_count || 0, 5) * 5;

  const load = parseFloat(a.daily_load || "0");
  if (load > 2000) score += 15;
  else if (load > 1000) score += 10;
  else if (load > 500) score += 5;

  if (a.monthly_revenue) score += 3;
  if (a.phone) score += 5;

  if ((a.uw_decline_count || 0) > 0 && !(a.uw_approval_count || 0) && !a.uw_funded_date) score -= 10;

  const outreach = a.outreach_status || "not_contacted";
  if (outreach === "contacted") score -= 5;
  if (outreach === "in_progress") score -= 10;
  if (outreach === "converted" || outreach === "passed") score -= 50;

  return score;
}

function getPitchType(a: LeadAccount): { type: string; label: string; color: string; talk: string } {
  const named = a.named_funder_count || 0;
  const load = parseFloat(a.daily_load || "0");
  const monthlyLoad = load * 22;
  const revenue = parseFloat(a.monthly_revenue || "0");
  const loadPct = revenue > 0 ? Math.round((monthlyLoad / revenue) * 100) : null;
  const funders = a.funder_names || "their current funder(s)";

  if (named >= 2) {
    return {
      type: "consolidation",
      label: "Consolidation",
      color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
      talk: `"I see you're currently working with ${funders}. A lot of our clients in your situation save $${Math.round(load * 0.3)}/day by consolidating into a single position with better terms. Would it make sense to see what that looks like for your business?"`,
    };
  }
  if (a.uw_funded_date) {
    return {
      type: "renewal",
      label: "Renewal",
      color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
      talk: `"Since you've already been funded through us and have been paying down your balance, you likely qualify for a larger advance at a better rate. We've seen businesses like yours get ${loadPct && loadPct > 20 ? "their payments cut significantly" : "25-40% more capital"}. Want me to run the numbers?"`,
    };
  }
  if (a.uw_status === "approved") {
    return {
      type: "close",
      label: "Close Deal",
      color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
      talk: `"You're already approved for ${a.uw_amount ? "$" + parseFloat(a.uw_amount).toLocaleString() : "funding"} through ${a.uw_lender || "our network"}. If the timing works, we can get you funded in as little as 24 hours. Is there anything holding you back from moving forward?"`,
    };
  }
  return {
    type: "intro",
    label: "Introduction",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    talk: `"We work with business owners who already have merchant cash advances and help them get better terms${named > 0 ? ` — I noticed you're working with ${funders}` : ""}. We've helped similar businesses reduce their daily payments by 20-40%. Would you be open to a quick conversation about your options?"`,
  };
}

function LoginForm({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  const [credential, setCredential] = useState("");
  const [error, setError] = useState("");

  const loginMutation = useMutation({
    mutationFn: async (cred: string) => {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: cred }),
        credentials: "include",
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Invalid credentials");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/check"] });
      onLoginSuccess();
    },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-8">
        <div className="flex items-center justify-center mb-6">
          <div className="bg-primary/10 rounded-full p-3">
            <Lock className="w-6 h-6 text-primary" />
          </div>
        </div>
        <h1 className="text-xl font-bold text-center mb-1">Admin Access Required</h1>
        <p className="text-sm text-muted-foreground text-center mb-6">
          Enter your credentials to view the /track admin panel
        </p>
        {error && (
          <p className="text-sm text-destructive text-center mb-4">{error}</p>
        )}
        <Input
          type="password"
          placeholder="Password"
          value={credential}
          onChange={(e) => setCredential(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && loginMutation.mutate(credential)}
          className="mb-3"
        />
        <Button
          className="w-full"
          onClick={() => loginMutation.mutate(credential)}
          disabled={!credential || loginMutation.isPending}
        >
          {loginMutation.isPending ? "Signing in..." : "Sign In"}
        </Button>
      </Card>
    </div>
  );
}

function fmt$(val: string | number | null) {
  if (val === null || val === undefined) return "—";
  const n = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(n)) return String(val);
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtDate(dateStr: string | null) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const tierColors: Record<string, string> = {
  HOT: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  WARM: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  SOON: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  EARLY: "bg-slate-100 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400",
};

const outreachColors: Record<string, string> = {
  not_contacted: "bg-slate-100 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400",
  contacted: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  in_progress: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  converted: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  passed: "bg-slate-100 text-slate-500 dark:bg-slate-800/50 dark:text-slate-500",
};

function AccountRow({ account, onOutreachUpdate }: { account: LeadAccount; onOutreachUpdate: (id: number, status: string, notes?: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState(account.outreach_notes || account.notes || "");

  const posCount = parseInt(account.position_count) || 0;
  const fullName = [account.first_name, account.last_name].filter(Boolean).join(" ") || null;
  const score = computeScore(account);
  const pitch = getPitchType(account);
  const dailyLoad = parseFloat(account.daily_load || "0");
  const tier = account.tier || (posCount > 0 ? "EARLY" : null);
  const outreach = account.outreach_status || "not_contacted";

  return (
    <div className="border rounded-md overflow-hidden">
      <button
        className="w-full text-left p-3 sm:p-4 hover:bg-muted/50 transition-colors flex items-center gap-2 sm:gap-3"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-shrink-0">
          {expanded
            ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
            : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
            {tier && (
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${tierColors[tier] || tierColors.EARLY}`}>
                {tier === "HOT" && <Flame className="w-3 h-3 mr-0.5" />}
                {tier}
              </span>
            )}
            <span className="font-medium text-sm truncate">
              {account.business_name || fullName || account.email}
            </span>
            {account.business_name && fullName && (
              <span className="text-xs text-muted-foreground hidden sm:inline">({fullName})</span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            <span>{account.email}</span>
            {dailyLoad > 0 && (
              <span className="font-medium text-foreground">{fmt$(dailyLoad)}/day</span>
            )}
            {account.funder_names && (
              <span className="truncate max-w-[200px]">{account.funder_names}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
          {score > 0 && (
            <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${score >= 50 ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" : score >= 30 ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400"}`}>
              {score}
            </span>
          )}
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${pitch.color}`}>
            {pitch.label}
          </Badge>
          {posCount > 0 && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {posCount}p
            </Badge>
          )}
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${outreachColors[outreach]}`}>
            {outreach === "not_contacted" ? "new" : outreach.replace("_", " ")}
          </Badge>
        </div>
      </button>

      {expanded && (
        <div className="border-t bg-muted/30 p-4 space-y-4">
          {/* Talk Track */}
          <div className={`rounded-lg p-3 border ${pitch.type === "consolidation" ? "bg-purple-50/50 border-purple-200 dark:bg-purple-950/20 dark:border-purple-800" : pitch.type === "renewal" ? "bg-amber-50/50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800" : pitch.type === "close" ? "bg-green-50/50 border-green-200 dark:bg-green-950/20 dark:border-green-800" : "bg-blue-50/50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800"}`}>
            <div className="flex items-center gap-2 mb-1.5">
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="text-xs font-semibold uppercase tracking-wide">{pitch.label} Pitch</span>
            </div>
            <p className="text-sm italic leading-relaxed">{pitch.talk}</p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="bg-background rounded-md p-2.5 text-center">
              <p className="text-[10px] text-muted-foreground uppercase mb-0.5">Funders</p>
              <p className="text-lg font-bold">{account.named_funder_count || 0}</p>
            </div>
            <div className="bg-background rounded-md p-2.5 text-center">
              <p className="text-[10px] text-muted-foreground uppercase mb-0.5">Daily Load</p>
              <p className="text-lg font-bold">{dailyLoad > 0 ? fmt$(dailyLoad) : "—"}</p>
            </div>
            <div className="bg-background rounded-md p-2.5 text-center">
              <p className="text-[10px] text-muted-foreground uppercase mb-0.5">Revenue</p>
              <p className="text-lg font-bold">{account.monthly_revenue || "—"}</p>
            </div>
            <div className="bg-background rounded-md p-2.5 text-center">
              <p className="text-[10px] text-muted-foreground uppercase mb-0.5">Load Ratio</p>
              <p className="text-lg font-bold">
                {(() => {
                  const rev = parseFloat(account.monthly_revenue || "0");
                  if (rev > 0 && dailyLoad > 0) return `${Math.round((dailyLoad * 22 / rev) * 100)}%`;
                  return "—";
                })()}
              </p>
            </div>
          </div>

          {/* Contact + Business */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-background rounded-md p-3">
              <h4 className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-primary" /> Contact
              </h4>
              <div className="space-y-1 text-sm">
                {fullName && <p><span className="text-muted-foreground text-xs">Name:</span> {fullName}</p>}
                <p><span className="text-muted-foreground text-xs">Email:</span> {account.email}</p>
                {account.phone && <p><span className="text-muted-foreground text-xs">Phone:</span> <a href={`tel:${account.phone}`} className="text-primary hover:underline">{account.phone}</a></p>}
                {!account.phone && <p className="text-muted-foreground text-xs italic">No phone on file</p>}
              </div>
            </div>
            <div className="bg-background rounded-md p-3">
              <h4 className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-primary" /> Business
              </h4>
              <div className="space-y-1 text-sm">
                {account.business_name && <p><span className="text-muted-foreground text-xs">Business:</span> {account.business_name}</p>}
                {account.industry && <p><span className="text-muted-foreground text-xs">Industry:</span> {account.industry}</p>}
                {account.time_in_business && <p><span className="text-muted-foreground text-xs">In Business:</span> {account.time_in_business}</p>}
                {account.monthly_revenue && <p><span className="text-muted-foreground text-xs">Revenue:</span> {account.monthly_revenue}</p>}
              </div>
            </div>
          </div>

          {/* UW History */}
          {account.uw_status && (
            <div className="bg-background rounded-md p-3">
              <h4 className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-primary" /> Underwriting History
              </h4>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge variant={account.uw_status === "funded" ? "default" : account.uw_status === "approved" ? "secondary" : "outline"} className="text-xs">
                  {account.uw_status === "funded" && <CheckCircle2 className="w-3 h-3 mr-1" />}
                  {account.uw_status.toUpperCase()}
                </Badge>
                {account.uw_lender && <span>by {account.uw_lender}</span>}
                {account.uw_amount && <span className="font-medium">{fmt$(account.uw_amount)}</span>}
                {account.uw_funded_date && <span className="text-muted-foreground text-xs">funded {fmtDate(account.uw_funded_date)}</span>}
                {(account.uw_approval_count || 0) > 0 && (
                  <span className="text-xs text-green-600 dark:text-green-400">{account.uw_approval_count} approval{(account.uw_approval_count || 0) !== 1 ? "s" : ""}</span>
                )}
                {(account.uw_decline_count || 0) > 0 && (
                  <span className="text-xs text-red-500">{account.uw_decline_count} decline{(account.uw_decline_count || 0) !== 1 ? "s" : ""}</span>
                )}
              </div>
            </div>
          )}

          {/* Positions */}
          {posCount > 0 && account.positions && (
            <div>
              <h4 className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-primary" /> MCA Positions ({posCount})
              </h4>
              <div className="space-y-1.5">
                {account.positions.map((pos, i) => (
                  <div key={i} className="bg-background rounded-md p-2.5 text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-xs">{pos.funderName}</span>
                      <div className="flex items-center gap-1.5">
                        {pos.paymentAmount && (
                          <span className="text-xs font-medium">{fmt$(pos.paymentAmount)}{pos.paymentFrequency ? `/${pos.paymentFrequency}` : ""}</span>
                        )}
                        <Badge variant={pos.status === "active" ? "default" : "secondary"} className="text-[10px] px-1 py-0">{pos.status}</Badge>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                      {pos.fundedAmount && <span>Funded: <span className="text-foreground font-medium">{fmt$(pos.fundedAmount)}</span></span>}
                      {pos.remainingBalance && <span>Remaining: <span className="text-foreground font-medium">{fmt$(pos.remainingBalance)}</span></span>}
                      {pos.estimatedPayoffDate && <span>Payoff: {pos.estimatedPayoffDate}</span>}
                      {pos.fundedDate && <span>Since: {pos.fundedDate}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Outreach Controls */}
          <div className="border-t pt-3">
            <h4 className="text-xs font-semibold mb-2 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-primary" /> Outreach
            </h4>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {(["not_contacted", "contacted", "in_progress", "converted", "passed"] as const).map(s => (
                <Button
                  key={s}
                  variant={outreach === s ? "default" : "outline"}
                  size="sm"
                  className="text-xs h-7 px-2.5"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOutreachUpdate(account.id, s);
                  }}
                >
                  {s === "not_contacted" ? "New" : s === "in_progress" ? "In Progress" : s.charAt(0).toUpperCase() + s.slice(1)}
                </Button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setShowNotes(!showNotes)}>
                {showNotes ? "Hide" : "Add"} Notes
              </Button>
              {(account.outreach_notes || account.notes) && !showNotes && (
                <span className="text-xs text-muted-foreground self-center italic truncate">{account.outreach_notes || account.notes}</span>
              )}
            </div>
            {showNotes && (
              <div className="mt-2 flex gap-2">
                <Textarea
                  value={notesDraft}
                  onChange={e => setNotesDraft(e.target.value)}
                  placeholder="Add outreach notes..."
                  className="text-sm min-h-[60px]"
                />
                <Button
                  size="sm"
                  className="self-end h-8"
                  onClick={() => {
                    onOutreachUpdate(account.id, outreach, notesDraft);
                    setShowNotes(false);
                  }}
                >
                  Save
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function TrackAdmin() {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortField>("score");
  const [filterTier, setFilterTier] = useState<FilterTier>("all");
  const [filterOutreach, setFilterOutreach] = useState<FilterOutreach>("all");

  const { data: authData } = useQuery<{ isAuthenticated: boolean; role: string }>({
    queryKey: ["/api/auth/check"],
    queryFn: async () => {
      const res = await fetch("/api/auth/check", { credentials: "include" });
      if (!res.ok) return { isAuthenticated: false, role: "" };
      return res.json();
    },
  });

  const { data: accounts = [], isLoading, refetch } = useQuery<LeadAccount[]>({
    queryKey: ["/api/admin/lead-portal/leads"],
    queryFn: async () => {
      const res = await fetch("/api/admin/lead-portal/leads", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: authData?.isAuthenticated && authData.role !== "merchant" && authData.role !== "lead",
  });

  const outreachMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: number; status: string; notes?: string }) => {
      const res = await fetch(`/api/admin/lead-portal/leads/${id}/outreach`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, notes }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/lead-portal/leads"] });
    },
  });

  const processed = useMemo(() => {
    let list = accounts.map(a => ({ ...a, _score: computeScore(a) }));

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(a =>
        a.email?.toLowerCase().includes(q) ||
        a.business_name?.toLowerCase().includes(q) ||
        a.first_name?.toLowerCase().includes(q) ||
        a.last_name?.toLowerCase().includes(q) ||
        a.funder_names?.toLowerCase().includes(q)
      );
    }

    if (filterTier !== "all") {
      if (filterTier === "none") {
        list = list.filter(a => !a.tier);
      } else {
        list = list.filter(a => a.tier === filterTier);
      }
    }

    if (filterOutreach !== "all") {
      list = list.filter(a => (a.outreach_status || "not_contacted") === filterOutreach);
    }

    list.sort((a, b) => {
      switch (sortBy) {
        case "score": return b._score - a._score;
        case "daily_load": return parseFloat(b.daily_load || "0") - parseFloat(a.daily_load || "0");
        case "name": return (a.business_name || a.email).localeCompare(b.business_name || b.email);
        case "created": return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        default: return 0;
      }
    });

    return list;
  }, [accounts, search, sortBy, filterTier, filterOutreach]);

  if (!authData) return null;

  if (!authData.isAuthenticated || authData.role === "merchant" || authData.role === "lead") {
    return (
      <LoginForm onLoginSuccess={() => queryClient.invalidateQueries({ queryKey: ["/api/auth/check"] })} />
    );
  }

  const withPositions = accounts.filter(a => (parseInt(a.position_count) || 0) > 0);
  const hotLeads = accounts.filter(a => a.tier === "HOT");
  const warmLeads = accounts.filter(a => a.tier === "WARM");
  const readyToClose = accounts.filter(a => a.uw_status === "approved" && !a.uw_funded_date);
  const notContacted = accounts.filter(a => (a.outreach_status || "not_contacted") === "not_contacted" && (parseInt(a.position_count) || 0) > 0);
  const totalDailyLoad = accounts.reduce((s, a) => s + parseFloat(a.daily_load || "0"), 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="font-bold text-base leading-tight">Lead Pipeline</h1>
              <p className="text-xs text-muted-foreground">Sales intelligence for /track profiles</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Link href="/dashboard">
              <Button variant="ghost" size="icon">
                <LogOut className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">
        {/* Pipeline Summary */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <Card className="cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all" onClick={() => { setFilterTier("all"); setFilterOutreach("all"); }}>
            <CardContent className="pt-3 pb-3 px-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary flex-shrink-0" />
                <div>
                  <p className="text-xl font-bold">{accounts.length}</p>
                  <p className="text-[10px] text-muted-foreground">Total Leads</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:ring-1 hover:ring-red-400/30 transition-all" onClick={() => { setFilterTier("HOT"); setFilterOutreach("all"); }}>
            <CardContent className="pt-3 pb-3 px-3">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-red-500 flex-shrink-0" />
                <div>
                  <p className="text-xl font-bold text-red-600 dark:text-red-400">{hotLeads.length}</p>
                  <p className="text-[10px] text-muted-foreground">Hot Leads</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:ring-1 hover:ring-orange-400/30 transition-all" onClick={() => { setFilterTier("WARM"); setFilterOutreach("all"); }}>
            <CardContent className="pt-3 pb-3 px-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-orange-500 flex-shrink-0" />
                <div>
                  <p className="text-xl font-bold text-orange-600 dark:text-orange-400">{warmLeads.length}</p>
                  <p className="text-[10px] text-muted-foreground">Warm Leads</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:ring-1 hover:ring-green-400/30 transition-all" onClick={() => { setFilterTier("all"); setFilterOutreach("not_contacted"); }}>
            <CardContent className="pt-3 pb-3 px-3">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-green-500 flex-shrink-0" />
                <div>
                  <p className="text-xl font-bold text-green-600 dark:text-green-400">{readyToClose.length}</p>
                  <p className="text-[10px] text-muted-foreground">Ready to Close</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:ring-1 hover:ring-blue-400/30 transition-all" onClick={() => { setFilterTier("all"); setFilterOutreach("not_contacted"); }}>
            <CardContent className="pt-3 pb-3 px-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <div>
                  <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{notContacted.length}</p>
                  <p className="text-[10px] text-muted-foreground">Not Contacted</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-3 pb-3 px-3">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-primary flex-shrink-0" />
                <div>
                  <p className="text-xl font-bold">{fmt$(totalDailyLoad)}</p>
                  <p className="text-[10px] text-muted-foreground">Total Daily Load</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Controls */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                Lead Pipeline
                <Badge variant="secondary" className="text-xs">{processed.length} shown</Badge>
              </CardTitle>
              <div className="flex flex-wrap gap-2 items-center">
                <div className="relative w-full sm:w-52">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-8 h-8 text-sm"
                  />
                </div>

                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as SortField)}
                  className="h-8 text-xs border rounded-md px-2 bg-background"
                >
                  <option value="score">Score</option>
                  <option value="daily_load">Daily Load</option>
                  <option value="name">Name</option>
                  <option value="created">Newest</option>
                </select>

                <select
                  value={filterTier}
                  onChange={e => setFilterTier(e.target.value as FilterTier)}
                  className="h-8 text-xs border rounded-md px-2 bg-background"
                >
                  <option value="all">All Tiers</option>
                  <option value="HOT">Hot</option>
                  <option value="WARM">Warm</option>
                  <option value="SOON">Soon</option>
                  <option value="EARLY">Early</option>
                  <option value="none">No Tier</option>
                </select>

                <select
                  value={filterOutreach}
                  onChange={e => setFilterOutreach(e.target.value as FilterOutreach)}
                  className="h-8 text-xs border rounded-md px-2 bg-background"
                >
                  <option value="all">All Outreach</option>
                  <option value="not_contacted">Not Contacted</option>
                  <option value="contacted">Contacted</option>
                  <option value="in_progress">In Progress</option>
                  <option value="converted">Converted</option>
                  <option value="passed">Passed</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground text-sm">Loading pipeline...</div>
            ) : processed.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                {search || filterTier !== "all" || filterOutreach !== "all" ? "No leads match your filters." : "No leads yet."}
              </div>
            ) : (
              processed.map(account => (
                <AccountRow
                  key={account.id}
                  account={account}
                  onOutreachUpdate={(id, status, notes) => outreachMutation.mutate({ id, status, notes })}
                />
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
