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
}

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
  outreachNotes?: string;
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
      const uwApprovals = first.uw_additional_approvals;
      const uwFundings = first.uw_additional_fundings;
      const uwDeclines = first.uw_additional_declines;

      const approvalCount = (first.uw_decision_status === "approved" || first.uw_decision_status === "funded" ? 1 : 0)
        + (Array.isArray(uwApprovals) ? uwApprovals.length : 0);
      const declineCount = (first.uw_decision_status === "declined" ? 1 : 0)
        + (Array.isArray(uwDeclines) ? uwDeclines.length : 0);
      const fundingCount = (first.uw_decision_funded_date ? 1 : 0)
        + (Array.isArray(uwFundings) ? uwFundings.length : 0);

      const bestPos = positions.reduce((best, p) => {
        const pct = p.percent_complete ?? 0;
        return pct > (best.percent_complete ?? 0) ? p : best;
      }, positions[0]);

      merchantGroups.push({
        email,
        businessName: first.business_name || email,
        tier: first.tier || "EARLY",
        positions,
        uwStatus: first.uw_decision_status || first.uw_status || undefined,
        uwLender: first.uw_decision_lender || first.uw_lender || undefined,
        uwAmount: first.uw_decision_amount || (first.uw_amount ? String(first.uw_amount) : undefined),
        uwFundedDate: first.uw_decision_funded_date || first.uw_funded_date || undefined,
        uwApprovalCount: approvalCount,
        uwDeclineCount: declineCount,
        uwFundingCount: fundingCount,
        bestPosition: `${bestPos.funder_name} — ${bestPos.percent_complete ?? 0}%${bestPos.estimated_payoff_date ? `, payoff ${bestPos.estimated_payoff_date}` : ""}`,
        outreachNotes: first.outreach_notes || undefined,
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
          const tierMerchants = filtered.filter((g) => g.tier === tier);
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
                          <div className="text-sm mt-1">
                            <span className="text-muted-foreground">Best: </span>
                            <span className="font-medium">{group.bestPosition}</span>
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

                      {/* Expanded Detail */}
                      {isExpanded && (
                        <div className="border-t px-4 pb-4 pt-3 space-y-3">
                          {/* UW Decision Summary */}
                          {group.uwStatus && (
                            <div className="rounded-md bg-muted/50 p-3 text-sm">
                              <div className="font-semibold mb-1 flex items-center gap-2">
                                <Building2 className="w-4 h-4" /> Underwriting History
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                                <div><span className="text-muted-foreground">Status: </span><span className="font-medium capitalize">{group.uwStatus}</span></div>
                                {group.uwLender && <div><span className="text-muted-foreground">Lender: </span><span className="font-medium">{group.uwLender}</span></div>}
                                {group.uwAmount && <div><span className="text-muted-foreground">Amount: </span><span className="font-medium">${Number(group.uwAmount).toLocaleString()}</span></div>}
                                {group.uwFundedDate && <div><span className="text-muted-foreground">Funded: </span><span className="font-medium">{new Date(group.uwFundedDate).toLocaleDateString()}</span></div>}
                              </div>
                            </div>
                          )}

                          {/* Outreach Controls */}
                          <div className="flex items-center gap-3 flex-wrap">
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
                              <ExternalLink className="w-3 h-3 mr-1" />Profile
                            </Button>
                          </div>

                          {/* Positions */}
                          {group.positions.map((pos) => {
                            const pct = pos.percent_complete ?? 0;
                            const barTier = pct >= 75 ? "HOT" : pct >= 50 ? "WARM" : pct >= 30 ? "SOON" : "EARLY";

                            return (
                              <div key={pos.id} className="rounded-lg border bg-muted/30 p-3">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                                    {pos.product_type || "Unknown"}
                                  </Badge>
                                  <span className="font-bold text-sm">{pos.funder_name}</span>
                                  {pos.status === "paid_off" && (
                                    <Badge className="bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300">Paid Off</Badge>
                                  )}
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1 text-xs mb-2">
                                  <div>
                                    <span className="text-muted-foreground">Payment: </span>
                                    <span className="font-medium">{pos.payment_amount_display || (pos.payment_amount ? `$${Number(pos.payment_amount).toLocaleString()}` : "Unknown")}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Frequency: </span>
                                    <span className="font-medium capitalize">{pos.payment_frequency || "Unknown"}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Est. Payoff: </span>
                                    <span className="font-medium">{pos.estimated_payoff_date || "Unknown"}</span>
                                  </div>
                                  {pos.funding_deposit_date && (
                                    <div>
                                      <span className="text-muted-foreground">Funding Deposit: </span>
                                      <span className="font-medium text-red-600 dark:text-red-400">
                                        ${Number(pos.funding_deposit_amount || 0).toLocaleString()} on {pos.funding_deposit_date}
                                      </span>
                                    </div>
                                  )}
                                  <div>
                                    <span className="text-muted-foreground">First / Last Seen: </span>
                                    <span className="font-medium">{pos.first_payment_seen || "?"} — {pos.last_payment_seen || "?"}</span>
                                  </div>
                                </div>
                                {/* Progress Bar */}
                                <div className="mt-2">
                                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all duration-500 ${TIER_CONFIG[barTier].barColor}`}
                                      style={{ width: `${Math.min(pct, 100)}%` }}
                                    />
                                  </div>
                                  <div className="flex justify-between text-[11px] text-muted-foreground mt-1">
                                    <span>{pct}% complete</span>
                                    <span className="font-medium text-foreground">{pos.estimated_payoff_date || ""}</span>
                                  </div>
                                </div>
                                {pos.anomalies && (
                                  <p className="text-[11px] text-muted-foreground italic mt-1.5 pt-1.5 border-t border-dashed">
                                    {pos.anomalies}
                                  </p>
                                )}
                              </div>
                            );
                          })}
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
