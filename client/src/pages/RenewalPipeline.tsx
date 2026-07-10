import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Flame,
  Sun,
  Clock,
  Snowflake,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Building2,
  Mail,
  Phone,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Banknote,
  AlertCircle,
  Download,
  RefreshCw,
  Loader2,
  ExternalLink,
  MessageSquare,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface MerchantPosition {
  id: string;
  business_email: string;
  business_name: string;
  funder_name: string;
  product_type: string;
  payment_amount: string | null;
  payment_amount_display: string | null;
  payment_frequency: string;
  estimated_funding_amount: string | null;
  estimated_total_payback: string | null;
  estimated_remaining_balance: string | null;
  percent_complete: number | null;
  first_payment_seen: string | null;
  last_payment_seen: string | null;
  estimated_start_date: string | null;
  estimated_payoff_date: string | null;
  renewal_eligible_date: string | null;
  funding_deposit_amount: string | null;
  funding_deposit_date: string | null;
  tier: string;
  outreach_status: string;
  outreach_notes: string | null;
  anomalies: string | null;
  source: string;
  status: string;
  uw_status: string | null;
  uw_lender: string | null;
  uw_amount: string | null;
  uw_approval_count: number;
  uw_decline_count: number;
  uw_funded_date: string | null;
  // Joined from UW decisions
  uw_decision_status?: string;
  uw_decision_lender?: string;
  uw_decision_amount?: string;
  uw_decision_funded_date?: string;
  uw_decision_approval_date?: string;
  uw_decision_decline_reason?: string;
  uw_additional_approvals?: any[];
  uw_additional_fundings?: any[];
  uw_additional_declines?: any[];
  uw_business_phone?: string;
  // Joined from loan_applications
  app_owner_name?: string;
  app_phone?: string;
  app_industry?: string;
  app_monthly_revenue?: string;
  app_time_in_business?: string;
  created_at?: string;
  updated_at?: string;
}

// ── Live progress projection ──────────────────────────────────────
// percent_complete is a snapshot from when the bank statements were
// analyzed. These helpers roll it forward to today so progress bars
// tick up over time and merchants get promoted between tiers.

// Parses "May 2026", "Sep 2025", "2026-05-14", "05/14/2026"
function parseLooseDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }
  const monthYear = s.match(/([A-Za-z]{3,})\s+(\d{4})/);
  if (monthYear) {
    const d = new Date(`${monthYear[1]} 15, ${monthYear[2]}`);
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

// Days a full payoff typically takes, by payment frequency
function typicalTermDays(frequency: string | null): number {
  const f = (frequency || "").toLowerCase();
  if (f === "monthly") return 365;
  return 280; // daily (~200 biz days) and weekly (~40 wks) both ≈ 280 calendar days
}

// Roll the analysis-time percent forward to today. Returns the stored
// value untouched when there's nothing to project from.
function projectedPercent(pos: MerchantPosition): { pct: number | null; isProjected: boolean } {
  const base = pos.percent_complete;
  if (base === null || base === undefined) return { pct: null, isProjected: false };
  if (base >= 100) return { pct: 100, isProjected: false };

  // Anchor: when was `base` true? Statement coverage ends at last_payment_seen;
  // fall back to when the position record was created (extraction time).
  const anchor = parseLooseDate(pos.last_payment_seen) ||
    (pos.created_at ? new Date(pos.created_at) : null);
  if (!anchor || isNaN(anchor.getTime())) return { pct: base, isProjected: false };

  const daysSinceAnchor = Math.floor((Date.now() - anchor.getTime()) / 86400000);
  if (daysSinceAnchor <= 0) return { pct: base, isProjected: false };

  // Progress rate: observed (pct earned between first and last payment seen),
  // else assume a typical MCA term for the frequency
  let ratePerDay: number;
  const firstSeen = parseLooseDate(pos.first_payment_seen);
  const observedDays = firstSeen ? Math.floor((anchor.getTime() - firstSeen.getTime()) / 86400000) : 0;
  if (firstSeen && observedDays >= 14 && base > 0) {
    ratePerDay = base / observedDays;
  } else {
    ratePerDay = 100 / typicalTermDays(pos.payment_frequency);
  }

  // Cap at 99 — we never claim a position is done without seeing it on a statement
  const projected = Math.min(99, Math.round(base + ratePerDay * daysSinceAnchor));
  return { pct: projected, isProjected: projected > base };
}

function tierFromPercent(pct: number): string {
  if (pct >= 75) return "HOT";
  if (pct >= 50) return "WARM";
  if (pct >= 30) return "SOON";
  return "EARLY";
}

const TIER_RANK: Record<string, number> = { HOT: 0, WARM: 1, SOON: 2, EARLY: 3 };

interface MerchantGroup {
  email: string;
  businessName: string;
  tier: string;
  positions: MerchantPosition[];
  uwStatus?: string;
  uwLender?: string;
  uwAmount?: string;
  uwFundedDate?: string;
  uwApprovalCount: number;
  uwDeclineCount: number;
  uwFundingCount: number;
  bestPosition: string;
  bestProjectedPct: number;
  outreachNotes?: string;
  // Action card fields
  ownerName?: string;
  phone?: string;
  industry?: string;
  monthlyRevenue?: string;
  timeInBusiness?: string;
  totalDailyLoad: number;
  totalWeeklyLoad: number;
  namedFunderCount: number;
  uwApprovals: Array<{ lender: string; amount?: string; date?: string }>;
  uwDeclines: Array<{ lender: string; reason?: string }>;
  uwFundings: Array<{ lender: string; amount?: string; date?: string }>;
  talkTrack: string;
  pitchType: "consolidation" | "renewal" | "new_funding" | "stacking_relief";
}

const TIER_CONFIG: Record<string, { label: string; desc: string; icon: React.ElementType; color: string; bg: string; border: string; barColor: string }> = {
  HOT: { label: "HOT", desc: "75%+ paid — outreach ASAP", icon: Flame, color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-950/30", border: "border-red-200 dark:border-red-800", barColor: "bg-red-500" },
  WARM: { label: "WARM", desc: "50-75% — eligible now", icon: Sun, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-amber-200 dark:border-amber-800", barColor: "bg-amber-500" },
  SOON: { label: "SOON", desc: "30-50% — weeks away", icon: Clock, color: "text-sky-600 dark:text-sky-400", bg: "bg-sky-50 dark:bg-sky-950/30", border: "border-sky-200 dark:border-sky-800", barColor: "bg-sky-500" },
  EARLY: { label: "EARLY", desc: "<30% — monitor", icon: Snowflake, color: "text-slate-500 dark:text-slate-400", bg: "bg-slate-50 dark:bg-slate-900/30", border: "border-slate-200 dark:border-slate-700", barColor: "bg-slate-400" },
};

const OUTREACH_STATUSES = [
  { value: "not_contacted", label: "Not Contacted", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  { value: "contacted", label: "Contacted", color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
  { value: "in_progress", label: "In Progress", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300" },
  { value: "converted", label: "Converted", color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" },
  { value: "passed", label: "Passed", color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" },
];

function UwBadges({ group }: { group: MerchantGroup }) {
  const badges: React.ReactNode[] = [];
  const st = group.uwStatus;
  if (st === "funded") {
    badges.push(
      <Badge key="funded" className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 border-purple-200 dark:border-purple-700">
        <Banknote className="w-3 h-3 mr-1" />Funded{group.uwAmount ? ` $${Number(group.uwAmount).toLocaleString()}` : ""}
      </Badge>
    );
  }
  if (st === "approved" || group.uwApprovalCount > 0) {
    badges.push(
      <Badge key="approved" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700">
        <CheckCircle2 className="w-3 h-3 mr-1" />Approved{group.uwApprovalCount > 1 ? ` (${group.uwApprovalCount})` : ""}
      </Badge>
    );
  }
  if (st === "declined" || group.uwDeclineCount > 0) {
    badges.push(
      <Badge key="declined" className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 border-red-200 dark:border-red-700">
        <XCircle className="w-3 h-3 mr-1" />Declined{group.uwDeclineCount > 1 ? ` (${group.uwDeclineCount})` : ""}
      </Badge>
    );
  }
  if (group.uwFundingCount > 0) {
    badges.push(
      <Badge key="fundings" className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 border-indigo-200 dark:border-indigo-700">
        <DollarSign className="w-3 h-3 mr-1" />{group.uwFundingCount} Funding{group.uwFundingCount > 1 ? "s" : ""}
      </Badge>
    );
  }
  if (badges.length === 0) {
    badges.push(
      <Badge key="new" variant="outline" className="text-gray-500 dark:text-gray-400">
        No UW History
      </Badge>
    );
  }
  return <div className="flex flex-wrap gap-1">{badges}</div>;
}

export default function RenewalPipeline() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [activeTier, setActiveTier] = useState<string | null>(null);
  const [expandedMerchants, setExpandedMerchants] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [outreachFilter, setOutreachFilter] = useState<string>("all");

  const { data: positionsData, isLoading } = useQuery<{ positions: MerchantPosition[] }>({
    queryKey: ["/api/merchant-positions/summary"],
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, any> }) => {
      const res = await fetch(`/api/merchant-positions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/merchant-positions"] });
      toast({ title: "Updated", description: "Position updated successfully" });
    },
  });

  // Group positions by merchant email
  const merchantGroups: MerchantGroup[] = [];
  if (positionsData?.positions) {
    const grouped: Record<string, MerchantPosition[]> = {};
    positionsData.positions.forEach((p) => {
      const key = p.business_email.toLowerCase();
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(p);
    });

    for (const [email, positions] of Object.entries(grouped)) {
      const first = positions[0];
      const rawApprovals = first.uw_additional_approvals;
      const rawFundings = first.uw_additional_fundings;
      const rawDeclines = first.uw_additional_declines;

      // Build structured UW lists
      const approvalsList: Array<{ lender: string; amount?: string; date?: string }> = [];
      const declinesList: Array<{ lender: string; reason?: string }> = [];
      const fundingsList: Array<{ lender: string; amount?: string; date?: string }> = [];

      if (first.uw_decision_status === "approved" || first.uw_decision_status === "funded") {
        approvalsList.push({
          lender: first.uw_decision_lender || "Unknown",
          amount: first.uw_decision_amount || undefined,
          date: first.uw_decision_approval_date || undefined,
        });
      }
      if (first.uw_decision_status === "declined") {
        declinesList.push({
          lender: first.uw_decision_lender || "Unknown",
          reason: first.uw_decision_decline_reason || undefined,
        });
      }
      if (first.uw_decision_funded_date) {
        fundingsList.push({
          lender: first.uw_decision_lender || "Unknown",
          amount: first.uw_decision_amount || undefined,
          date: first.uw_decision_funded_date,
        });
      }
      if (Array.isArray(rawApprovals)) {
        rawApprovals.forEach((a: any) => approvalsList.push({
          lender: a.lender || a.funder || "Unknown",
          amount: a.amount || a.advance_amount || undefined,
          date: a.date || a.approval_date || undefined,
        }));
      }
      if (Array.isArray(rawDeclines)) {
        rawDeclines.forEach((d: any) => declinesList.push({
          lender: d.lender || d.funder || "Unknown",
          reason: d.reason || d.decline_reason || undefined,
        }));
      }
      if (Array.isArray(rawFundings)) {
        rawFundings.forEach((f: any) => fundingsList.push({
          lender: f.lender || f.funder || "Unknown",
          amount: f.amount || f.funded_amount || undefined,
          date: f.date || f.funded_date || undefined,
        }));
      }

      const bestPos = positions.reduce((best, p) => {
        const pct = projectedPercent(p).pct ?? 0;
        return pct > (projectedPercent(best).pct ?? 0) ? p : best;
      }, positions[0]);
      const bestProjected = projectedPercent(bestPos);

      // Live tier: promote from projected percent as time passes
      // (SOON -> WARM -> HOT), but never demote below the stored tier —
      // the extraction assigned it with more context than percent alone,
      // and paying down only ever moves a position closer to payoff.
      let liveTier = "EARLY";
      for (const p of positions) {
        const stored = p.tier || "EARLY";
        const proj = projectedPercent(p);
        let t = stored;
        if (proj.pct !== null && proj.isProjected) {
          const projTier = tierFromPercent(proj.pct);
          if ((TIER_RANK[projTier] ?? 3) < (TIER_RANK[stored] ?? 3)) t = projTier;
        }
        if ((TIER_RANK[t] ?? 3) < (TIER_RANK[liveTier] ?? 3)) liveTier = t;
      }

      // Compute daily/weekly payment loads
      let totalDailyLoad = 0;
      let totalWeeklyLoad = 0;
      const namedFunders = positions.filter(p => p.funder_name !== "Unknown Funder");
      for (const p of positions) {
        const amt = Number(p.payment_amount) || 0;
        if (p.payment_frequency === "daily") {
          totalDailyLoad += amt;
          totalWeeklyLoad += amt * 5;
        } else if (p.payment_frequency === "weekly") {
          totalWeeklyLoad += amt;
          totalDailyLoad += amt / 5;
        }
      }

      // Generate talk track
      const pitchType = namedFunders.length >= 2 ? "consolidation"
        : fundingsList.length > 0 ? "renewal"
        : approvalsList.length > 0 ? "new_funding"
        : "stacking_relief";

      let talkTrack = "";
      const bizName = first.business_name || "this business";
      if (pitchType === "consolidation") {
        const funderNames = namedFunders.map(p => p.funder_name).join(" and ");
        talkTrack = `${bizName} has ${namedFunders.length} active positions with ${funderNames}`;
        if (totalDailyLoad > 0) talkTrack += `, paying roughly $${Math.round(totalDailyLoad).toLocaleString()}/day combined`;
        talkTrack += `. Consolidation pitch: "We can roll your ${namedFunders.length} payments into one, lower your daily, and potentially put cash back in your pocket."`;
      } else if (pitchType === "renewal") {
        const lastFunding = fundingsList[fundingsList.length - 1];
        talkTrack = `${bizName} was funded $${Number(lastFunding?.amount || 0).toLocaleString()} through ${lastFunding?.lender || "us"}`;
        if (namedFunders.length > 0) talkTrack += ` and currently has a position with ${namedFunders[0].funder_name}`;
        talkTrack += `. Renewal pitch: "Now that you've paid down your balance, you qualify for a larger advance at better terms."`;
      } else if (pitchType === "new_funding") {
        talkTrack = `${bizName} was previously approved`;
        if (approvalsList.length > 0) talkTrack += ` by ${approvalsList.map(a => `${a.lender}${a.amount ? ` ($${Number(a.amount).toLocaleString()})` : ""}`).join(", ")}`;
        talkTrack += `. They have existing MCA activity on their statements. Pitch: "You've already been approved — let's get you funded and working with better terms."`;
      } else {
        if (namedFunders.length > 0) {
          talkTrack = `${bizName} shows MCA activity with ${namedFunders[0].funder_name}`;
        } else {
          talkTrack = `${bizName} has recurring debit patterns consistent with MCA payments`;
        }
        talkTrack += `. Intro pitch: "We specialize in working with businesses that already have advances — we can find you better rates and terms."`;
      }

      merchantGroups.push({
        email,
        businessName: first.business_name || email,
        tier: liveTier,
        positions,
        uwStatus: first.uw_decision_status || first.uw_status || undefined,
        uwLender: first.uw_decision_lender || first.uw_lender || undefined,
        uwAmount: first.uw_decision_amount || (first.uw_amount ? String(first.uw_amount) : undefined),
        uwFundedDate: first.uw_decision_funded_date || first.uw_funded_date || undefined,
        uwApprovalCount: approvalsList.length,
        uwDeclineCount: declinesList.length,
        uwFundingCount: fundingsList.length,
        bestPosition: `${bestPos.funder_name} — ${bestProjected.pct ?? 0}%${bestProjected.isProjected ? " est." : ""}${bestPos.estimated_payoff_date ? `, payoff ${bestPos.estimated_payoff_date}` : ""}`,
        bestProjectedPct: bestProjected.pct ?? 0,
        outreachNotes: first.outreach_notes || undefined,
        ownerName: first.app_owner_name || undefined,
        phone: first.app_phone || first.uw_business_phone || undefined,
        industry: first.app_industry || undefined,
        monthlyRevenue: first.app_monthly_revenue || undefined,
        timeInBusiness: first.app_time_in_business || undefined,
        totalDailyLoad,
        totalWeeklyLoad,
        namedFunderCount: namedFunders.length,
        uwApprovals: approvalsList,
        uwDeclines: declinesList,
        uwFundings: fundingsList,
        talkTrack,
        pitchType,
      });
    }
  }

  // Apply filters
  const filtered = merchantGroups.filter((g) => {
    if (activeTier && g.tier !== activeTier) return false;
    if (outreachFilter !== "all" && !g.positions.some(p => p.outreach_status === outreachFilter)) return false;
    if (search) {
      const s = search.toLowerCase();
      return g.businessName.toLowerCase().includes(s) || g.email.includes(s) ||
        g.positions.some(p => p.funder_name.toLowerCase().includes(s));
    }
    return true;
  });

  // Tier counts
  const tierCounts: Record<string, number> = { HOT: 0, WARM: 0, SOON: 0, EARLY: 0 };
  merchantGroups.forEach((g) => { tierCounts[g.tier] = (tierCounts[g.tier] || 0) + 1; });

  const toggleExpand = (email: string) => {
    setExpandedMerchants((prev) => {
      const next = new Set(prev);
      next.has(email) ? next.delete(email) : next.add(email);
      return next;
    });
  };

  const handleExportCSV = () => {
    const lines = ["Tier,Business,Email,Best Position,UW Status,# Approvals,# Declines,# Fundings,Outreach Status,Outreach Notes,Positions"];
    merchantGroups.forEach((g) => {
      lines.push(`"${g.tier}","${g.businessName}","${g.email}","${g.bestPosition.replace(/"/g, '""')}","${g.uwStatus || 'N/A'}",${g.uwApprovalCount},${g.uwDeclineCount},${g.uwFundingCount},"${g.positions[0]?.outreach_status || ''}","${(g.outreachNotes || '').replace(/"/g, '""')}",${g.positions.length}`);
    });
    lines.push("", "Tier,Business,Funder,Type,Payment,Frequency,% Complete,First Seen,Last Seen,Est Payoff,Funding Deposit,Anomalies");
    merchantGroups.forEach((g) => {
      g.positions.forEach((p) => {
        lines.push(`"${g.tier}","${g.businessName}","${p.funder_name}","${p.product_type || ''}","${(p.payment_amount_display || p.payment_amount || '').toString().replace(/"/g, '""')}","${p.payment_frequency || ''}",${p.percent_complete ?? ''},"${p.first_payment_seen || ''}","${p.last_payment_seen || ''}","${p.estimated_payoff_date || ''}","${p.funding_deposit_date ? `$${p.funding_deposit_amount} on ${p.funding_deposit_date}` : ''}","${(p.anomalies || '').replace(/"/g, '""')}"`);
      });
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "renewal_pipeline.csv";
    a.click();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-2xl font-bold">Renewal Pipeline</h1>
            </div>
            <p className="text-sm text-muted-foreground ml-11">
              {merchantGroups.length} merchants with active financing positions — ranked by payoff timeline
            </p>
          </div>
          <Button onClick={handleExportCSV} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />Export CSV
          </Button>
        </div>

        {/* Tier Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {(["HOT", "WARM", "SOON", "EARLY"] as const).map((tier) => {
            const cfg = TIER_CONFIG[tier];
            const Icon = cfg.icon;
            const isActive = activeTier === tier;
            return (
              <Card
                key={tier}
                className={`cursor-pointer transition-all hover:shadow-md ${cfg.bg} ${isActive ? `ring-2 ring-offset-1 ${cfg.border}` : cfg.border}`}
                onClick={() => setActiveTier(isActive ? null : tier)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={`w-5 h-5 ${cfg.color}`} />
                    <span className={`text-2xl font-extrabold ${cfg.color}`}>{tierCounts[tier]}</span>
                  </div>
                  <div className={`text-xs font-semibold uppercase tracking-wide ${cfg.color}`}>{cfg.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{cfg.desc}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <Input
            placeholder="Search business, email, or funder..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="sm:max-w-xs"
          />
          <Select value={outreachFilter} onValueChange={setOutreachFilter}>
            <SelectTrigger className="sm:max-w-[180px]">
              <SelectValue placeholder="Outreach status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {OUTREACH_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Pipeline Tiers */}
        {(["HOT", "WARM", "SOON", "EARLY"] as const).map((tier) => {
          if (activeTier && activeTier !== tier) return null;
          const tierMerchants = filtered
            .filter((g) => g.tier === tier)
            .sort((a, b) => b.bestProjectedPct - a.bestProjectedPct);
          if (tierMerchants.length === 0) return null;
          const cfg = TIER_CONFIG[tier];
          const Icon = cfg.icon;

          return (
            <div key={tier} className="mb-8">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b-2 border-gray-200 dark:border-gray-700">
                <Icon className={`w-5 h-5 ${cfg.color}`} />
                <h2 className={`text-lg font-bold ${cfg.color}`}>{cfg.label}</h2>
                <span className="text-sm text-muted-foreground ml-auto">
                  {tierMerchants.length} merchant{tierMerchants.length !== 1 ? "s" : ""}
                </span>
              </div>

              <div className="space-y-3">
                {tierMerchants.map((group) => {
                  const isExpanded = expandedMerchants.has(group.email);
                  const outreachCfg = OUTREACH_STATUSES.find((s) => s.value === group.positions[0]?.outreach_status) || OUTREACH_STATUSES[0];

                  return (
                    <Card key={group.email} className="overflow-hidden">
                      {/* Merchant Header */}
                      <div
                        className="flex items-start justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => toggleExpand(group.email)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-base">{group.businessName}</span>
                            <Badge className={outreachCfg.color} variant="secondary">
                              {outreachCfg.label}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">{group.email}</div>
                          <div className="flex items-center gap-3 text-sm mt-1 flex-wrap">
                            {group.namedFunderCount > 0 && (
                              <span>
                                <span className="text-muted-foreground">{group.namedFunderCount} funder{group.namedFunderCount > 1 ? "s" : ""}: </span>
                                <span className="font-medium">{group.positions.filter(p => p.funder_name !== "Unknown Funder").map(p => p.funder_name).join(", ")}</span>
                              </span>
                            )}
                            {group.totalDailyLoad > 0 && (
                              <span className="text-red-600 dark:text-red-400 font-semibold">
                                ~${Math.round(group.totalDailyLoad).toLocaleString()}/day
                              </span>
                            )}
                          </div>
                          <div className="mt-1.5">
                            <UwBadges group={group} />
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4 shrink-0">
                          <Badge variant="outline" className={cfg.color}>{tier}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {group.positions.length} pos.
                          </span>
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </div>

                      {/* Action Card */}
                      {isExpanded && (
                        <div className="border-t px-4 pb-4 pt-3 space-y-4">
                          {/* Talk Track */}
                          <div className={`rounded-lg p-3 text-sm border-l-4 ${
                            group.pitchType === "consolidation" ? "bg-orange-50 dark:bg-orange-950/20 border-orange-400" :
                            group.pitchType === "renewal" ? "bg-purple-50 dark:bg-purple-950/20 border-purple-400" :
                            group.pitchType === "new_funding" ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-400" :
                            "bg-blue-50 dark:bg-blue-950/20 border-blue-400"
                          }`}>
                            <div className="flex items-center gap-2 mb-1.5">
                              <MessageSquare className="w-4 h-4 shrink-0" />
                              <span className="font-semibold text-xs uppercase tracking-wide">
                                {group.pitchType === "consolidation" ? "Consolidation Pitch" :
                                 group.pitchType === "renewal" ? "Renewal Pitch" :
                                 group.pitchType === "new_funding" ? "Funding Pitch" : "Intro Pitch"}
                              </span>
                            </div>
                            <p className="text-sm leading-relaxed">{group.talkTrack}</p>
                          </div>

                          {/* Quick Stats Row */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="rounded-lg bg-muted/50 p-2.5 text-center">
                              <div className="text-lg font-bold">{group.namedFunderCount}</div>
                              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Active Funders</div>
                            </div>
                            <div className="rounded-lg bg-muted/50 p-2.5 text-center">
                              <div className="text-lg font-bold">
                                {group.totalDailyLoad > 0 ? `$${Math.round(group.totalDailyLoad).toLocaleString()}` : "—"}
                              </div>
                              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Est. Daily Load</div>
                            </div>
                            <div className="rounded-lg bg-muted/50 p-2.5 text-center">
                              <div className="text-lg font-bold">
                                {group.monthlyRevenue ? `$${Number(group.monthlyRevenue).toLocaleString()}` : "—"}
                              </div>
                              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Monthly Revenue</div>
                            </div>
                            <div className="rounded-lg bg-muted/50 p-2.5 text-center">
                              <div className="text-lg font-bold">
                                {group.totalDailyLoad > 0 && group.monthlyRevenue
                                  ? `${Math.round((group.totalDailyLoad * 22 / Number(group.monthlyRevenue)) * 100)}%`
                                  : "—"}
                              </div>
                              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">MCA Load Ratio</div>
                            </div>
                          </div>

                          {/* Contact & Business Info */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="rounded-lg border bg-muted/30 p-3">
                              <div className="font-semibold text-xs uppercase tracking-wide text-muted-foreground mb-2">Contact</div>
                              <div className="space-y-1.5 text-sm">
                                {group.ownerName && (
                                  <div className="flex items-center gap-2">
                                    <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                    <span className="font-medium">{group.ownerName}</span>
                                  </div>
                                )}
                                <div className="flex items-center gap-2">
                                  <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                  <a href={`mailto:${group.email}`} className="text-blue-600 dark:text-blue-400 hover:underline">{group.email}</a>
                                </div>
                                {group.phone && (
                                  <div className="flex items-center gap-2">
                                    <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                    <a href={`tel:${group.phone}`} className="text-blue-600 dark:text-blue-400 hover:underline">{group.phone}</a>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="rounded-lg border bg-muted/30 p-3">
                              <div className="font-semibold text-xs uppercase tracking-wide text-muted-foreground mb-2">Business</div>
                              <div className="space-y-1.5 text-sm">
                                {group.industry && <div><span className="text-muted-foreground">Industry: </span><span className="font-medium">{group.industry}</span></div>}
                                {group.timeInBusiness && <div><span className="text-muted-foreground">Time in Business: </span><span className="font-medium">{group.timeInBusiness}</span></div>}
                                {group.monthlyRevenue && <div><span className="text-muted-foreground">Monthly Revenue: </span><span className="font-medium">${Number(group.monthlyRevenue).toLocaleString()}</span></div>}
                                {group.totalWeeklyLoad > 0 && <div><span className="text-muted-foreground">Weekly MCA Payments: </span><span className="font-medium text-red-600 dark:text-red-400">${Math.round(group.totalWeeklyLoad).toLocaleString()}</span></div>}
                              </div>
                            </div>
                          </div>

                          {/* UW History — Approvals & Fundings */}
                          {(group.uwApprovals.length > 0 || group.uwFundings.length > 0) && (
                            <div className="rounded-lg border bg-emerald-50/50 dark:bg-emerald-950/10 p-3">
                              <div className="font-semibold text-xs uppercase tracking-wide text-emerald-700 dark:text-emerald-400 mb-2 flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5" />Approval & Funding History
                              </div>
                              <div className="space-y-1">
                                {group.uwFundings.map((f, i) => (
                                  <div key={`f-${i}`} className="flex items-center gap-2 text-sm">
                                    <Banknote className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                                    <span className="font-medium">{f.lender}</span>
                                    {f.amount && <span className="text-emerald-700 dark:text-emerald-400 font-semibold">${Number(f.amount).toLocaleString()}</span>}
                                    {f.date && <span className="text-muted-foreground text-xs">({new Date(f.date).toLocaleDateString()})</span>}
                                    <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 text-[10px]">Funded</Badge>
                                  </div>
                                ))}
                                {group.uwApprovals.filter(a => !group.uwFundings.some(f => f.lender === a.lender && f.amount === a.amount)).map((a, i) => (
                                  <div key={`a-${i}`} className="flex items-center gap-2 text-sm">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                    <span className="font-medium">{a.lender}</span>
                                    {a.amount && <span className="text-emerald-700 dark:text-emerald-400 font-semibold">${Number(a.amount).toLocaleString()}</span>}
                                    {a.date && <span className="text-muted-foreground text-xs">({new Date(a.date).toLocaleDateString()})</span>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* UW History — Declines */}
                          {group.uwDeclines.length > 0 && (
                            <div className="rounded-lg border bg-red-50/50 dark:bg-red-950/10 p-3">
                              <div className="font-semibold text-xs uppercase tracking-wide text-red-700 dark:text-red-400 mb-2 flex items-center gap-1.5">
                                <XCircle className="w-3.5 h-3.5" />Decline History ({group.uwDeclines.length})
                              </div>
                              <div className="space-y-1">
                                {group.uwDeclines.map((d, i) => (
                                  <div key={`d-${i}`} className="flex items-center gap-2 text-sm">
                                    <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                                    <span className="font-medium">{d.lender}</span>
                                    {d.reason && <span className="text-muted-foreground text-xs">— {d.reason}</span>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Active Positions */}
                          <div>
                            <div className="font-semibold text-xs uppercase tracking-wide text-muted-foreground mb-2">
                              Active Positions ({group.positions.length})
                            </div>
                            <div className="space-y-2">
                              {group.positions.map((pos) => {
                                const proj = projectedPercent(pos);
                                const pct = proj.pct ?? 0;
                                const barTier = pct >= 75 ? "HOT" : pct >= 50 ? "WARM" : pct >= 30 ? "SOON" : "EARLY";

                                return (
                                  <div key={pos.id} className="rounded-lg border bg-muted/30 p-3">
                                    <div className="flex items-center justify-between mb-1.5">
                                      <div className="flex items-center gap-2">
                                        <span className="font-bold text-sm">{pos.funder_name}</span>
                                        <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                                          {pos.product_type || "MCA"}
                                        </Badge>
                                      </div>
                                      <span className="text-sm font-semibold">
                                        {pos.payment_amount_display || (pos.payment_amount ? `$${Number(pos.payment_amount).toLocaleString()}` : "—")}
                                        {pos.payment_frequency && <span className="text-muted-foreground font-normal text-xs">/{pos.payment_frequency === "daily" ? "day" : "wk"}</span>}
                                      </span>
                                    </div>
                                    <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                      <div
                                        className={`h-full rounded-full transition-all duration-500 ${TIER_CONFIG[barTier].barColor}`}
                                        style={{ width: `${Math.min(pct, 100)}%` }}
                                      />
                                    </div>
                                    <div className="flex justify-between text-[11px] text-muted-foreground mt-1">
                                      <span>
                                        {pct}% complete
                                        {proj.isProjected && (
                                          <span className="text-muted-foreground/70"> (est. today — {pos.percent_complete}% at analysis)</span>
                                        )}
                                      </span>
                                      <span>{pos.estimated_payoff_date || ""}</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Controls */}
                          <div className="flex items-center gap-3 flex-wrap pt-2 border-t">
                            <Select
                              value={group.positions[0]?.outreach_status || "not_contacted"}
                              onValueChange={(val) => {
                                group.positions.forEach((p) => {
                                  updateMutation.mutate({ id: p.id, updates: { outreachStatus: val } });
                                });
                              }}
                            >
                              <SelectTrigger className="w-[160px] h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {OUTREACH_STATUSES.map((s) => (
                                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              variant="outline" size="sm"
                              onClick={() => navigate(`/merchant-profile/${encodeURIComponent(group.email)}`)}
                            >
                              <ExternalLink className="w-3 h-3 mr-1" />Full Profile
                            </Button>
                          </div>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && !isLoading && (
          <div className="text-center py-16 text-muted-foreground">
            <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">No positions found</p>
            <p className="text-sm">Position data will appear here once bank statements are analyzed.</p>
          </div>
        )}
      </div>
    </div>
  );
}
