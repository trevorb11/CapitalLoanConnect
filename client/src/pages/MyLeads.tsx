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
  Search,
  ChevronDown,
  ChevronRight,
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
  Mail,
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
}

interface Lead {
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
  position_count: string;
  positions: LeadPosition[] | null;
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
  agent_name: string | null;
  agent_email: string | null;
  clc_status: string | null;
  clc_lender: string | null;
  clc_amount: string | null;
  clc_funded_date: string | null;
  clc_additional_fundings: any[] | null;
  clc_approval_date: string | null;
}

type SortField = "score" | "name" | "daily_load" | "created";

function getLatestClcFundingDate(a: Lead): Date | null {
  let latest: Date | null = null;
  if (a.clc_funded_date) {
    const d = new Date(a.clc_funded_date);
    if (!isNaN(d.getTime())) latest = d;
  }
  if (a.clc_additional_fundings && Array.isArray(a.clc_additional_fundings)) {
    for (const f of a.clc_additional_fundings) {
      if (f.fundedDate) {
        const d = new Date(f.fundedDate);
        if (!isNaN(d.getTime()) && (!latest || d > latest)) latest = d;
      }
    }
  }
  return latest;
}

function daysSince(date: Date): number {
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
}

// Does this statement-detected funder match one of OUR CLC funding lenders?
// e.g. clc lender "Fuji Funding" matches statement funder "Fuji"
function isOurFunder(a: Lead, funderName: string | null): boolean {
  if (!funderName) return false;
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const target = norm(funderName);
  if (!target) return false;
  const ourLenders: string[] = [];
  if (a.clc_lender) ourLenders.push(a.clc_lender);
  if (a.clc_additional_fundings && Array.isArray(a.clc_additional_fundings)) {
    for (const f of a.clc_additional_fundings) if (f.lender) ourLenders.push(f.lender);
  }
  return ourLenders.some(l => {
    const ln = norm(l);
    return ln && (ln.includes(target) || target.includes(ln));
  });
}

function computeScore(a: Lead): number {
  let score = 0;
  const tier = a.tier || "EARLY";
  if (tier === "HOT") score += 30;
  else if (tier === "WARM") score += 15;
  else if (tier === "SOON") score += 5;
  score += (a.named_funder_count || 0) * 10;
  const latestFunding = getLatestClcFundingDate(a);
  if (latestFunding) {
    const days = daysSince(latestFunding);
    if (days < 60) score -= 30;
    else if (days < 120) score += 5;
    else score += 20;
  } else if (a.uw_status === "approved" || a.clc_status === "approved") {
    score += 20;
  }
  score += Math.min(a.uw_approval_count || 0, 5) * 5;
  const load = parseFloat(a.daily_load || "0");
  if (load > 2000) score += 15;
  else if (load > 1000) score += 10;
  else if (load > 500) score += 5;
  if (a.monthly_revenue) score += 3;
  if (a.phone) score += 5;
  if ((a.uw_decline_count || 0) > 0 && !(a.uw_approval_count || 0) && !latestFunding) score -= 10;
  const outreach = a.outreach_status || "not_contacted";
  if (outreach === "contacted") score -= 5;
  if (outreach === "in_progress") score -= 10;
  if (outreach === "converted" || outreach === "passed") score -= 50;
  return score;
}

function getPitch(a: Lead): { type: string; label: string; color: string; talk: string } {
  const named = a.named_funder_count || 0;
  const load = parseFloat(a.daily_load || "0");
  const funders = a.funder_names || "their current funder(s)";

  // Recently funded wins over everything — don't pitch consolidation to someone we just funded
  const latestFunding = getLatestClcFundingDate(a);
  if (latestFunding && daysSince(latestFunding) < 60) {
    return {
      type: "recently_funded", label: "Recently Funded",
      color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
      talk: `Recently funded ${daysSince(latestFunding)} days ago — check in on how funding is working out, build the relationship for future renewal.`,
    };
  }
  if (named >= 2) {
    return {
      type: "consolidation", label: "Consolidation",
      color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
      talk: `"I see you're working with ${funders}. A lot of our clients save ~$${Math.round(load * 0.3)}/day by consolidating into a single position with better terms. Would it make sense to see what that looks like?"`,
    };
  }
  if (latestFunding) {
    return {
      type: "renewal", label: "Renewal",
      color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
      talk: `"Since you've been funded through us and have been paying down your balance, you likely qualify for a larger advance at a better rate. Want me to run the numbers?"`,
    };
  }
  if (a.uw_status === "approved" || a.clc_status === "approved") {
    return {
      type: "close", label: "Close Deal",
      color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
      talk: `"You're already approved for ${(a.clc_amount || a.uw_amount) ? "$" + parseFloat((a.clc_amount || a.uw_amount)!).toLocaleString() : "funding"} through ${a.clc_lender || a.uw_lender || "our network"}. We can get you funded in as little as 24 hours. Is there anything holding you back?"`,
    };
  }
  return {
    type: "intro", label: "Introduction",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    talk: `"We work with business owners who already have merchant cash advances and help them get better terms${named > 0 ? ` — I noticed you're working with ${funders}` : ""}. We've helped similar businesses reduce payments by 20-40%. Would you be open to a quick conversation?"`,
  };
}

function fmt$(val: string | number | null) {
  if (val === null || val === undefined) return "—";
  const n = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(n)) return String(val);
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
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

function LeadRow({ lead, isAdmin, onOutreachUpdate }: {
  lead: Lead;
  isAdmin: boolean;
  onOutreachUpdate: (id: number, status: string, notes?: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState(lead.outreach_notes || lead.notes || "");

  const posCount = parseInt(lead.position_count) || 0;
  const fullName = [lead.first_name, lead.last_name].filter(Boolean).join(" ") || null;
  const score = computeScore(lead);
  const pitch = getPitch(lead);
  const dailyLoad = parseFloat(lead.daily_load || "0");
  const tier = lead.tier || (posCount > 0 ? "EARLY" : null);
  const outreach = lead.outreach_status || "not_contacted";

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
              {lead.business_name || fullName || lead.email}
            </span>
            {lead.business_name && fullName && (
              <span className="text-xs text-muted-foreground hidden sm:inline">({fullName})</span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            <span>{lead.email}</span>
            {dailyLoad > 0 && <span className="font-medium text-foreground">{fmt$(dailyLoad)}/day</span>}
            {lead.funder_names && <span className="truncate max-w-[200px]">{lead.funder_names}</span>}
            {isAdmin && lead.agent_name && (
              <span className="text-primary font-medium">{lead.agent_name}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
          {score > 0 && (
            <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${score >= 50 ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" : score >= 30 ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400"}`}>
              {score}
            </span>
          )}
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${pitch.color}`}>{pitch.label}</Badge>
          {posCount > 0 && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{posCount}p</Badge>}
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${outreachColors[outreach]}`}>
            {outreach === "not_contacted" ? "new" : outreach.replace("_", " ")}
          </Badge>
        </div>
      </button>

      {expanded && (
        <div className="border-t bg-muted/30 p-4 space-y-4">
          <div className={`rounded-lg p-3 border ${pitch.type === "consolidation" ? "bg-purple-50/50 border-purple-200 dark:bg-purple-950/20 dark:border-purple-800" : pitch.type === "renewal" ? "bg-amber-50/50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800" : pitch.type === "close" ? "bg-green-50/50 border-green-200 dark:bg-green-950/20 dark:border-green-800" : "bg-blue-50/50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800"}`}>
            <div className="flex items-center gap-2 mb-1.5">
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="text-xs font-semibold uppercase tracking-wide">{pitch.label} Pitch</span>
            </div>
            <p className="text-sm italic leading-relaxed">{pitch.talk}</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="bg-background rounded-md p-2.5 text-center">
              <p className="text-[10px] text-muted-foreground uppercase mb-0.5">Funders</p>
              <p className="text-lg font-bold">{lead.named_funder_count || 0}</p>
            </div>
            <div className="bg-background rounded-md p-2.5 text-center">
              <p className="text-[10px] text-muted-foreground uppercase mb-0.5">Daily Load</p>
              <p className="text-lg font-bold">{dailyLoad > 0 ? fmt$(dailyLoad) : "—"}</p>
            </div>
            <div className="bg-background rounded-md p-2.5 text-center">
              <p className="text-[10px] text-muted-foreground uppercase mb-0.5">Revenue</p>
              <p className="text-lg font-bold">{lead.monthly_revenue ? fmt$(lead.monthly_revenue) : "—"}</p>
            </div>
            <div className="bg-background rounded-md p-2.5 text-center">
              <p className="text-[10px] text-muted-foreground uppercase mb-0.5">Load Ratio</p>
              <p className="text-lg font-bold">
                {(() => {
                  const rev = parseFloat(lead.monthly_revenue || "0");
                  if (rev > 0 && dailyLoad > 0) return `${Math.round((dailyLoad * 22 / rev) * 100)}%`;
                  return "—";
                })()}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-background rounded-md p-3">
              <h4 className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-primary" /> Contact
              </h4>
              <div className="space-y-1 text-sm">
                {fullName && <p><span className="text-muted-foreground text-xs">Name:</span> {fullName}</p>}
                <p><span className="text-muted-foreground text-xs">Email:</span> {lead.email}</p>
                {lead.phone ? (
                  <p><span className="text-muted-foreground text-xs">Phone:</span> <a href={`tel:${lead.phone}`} className="text-primary hover:underline">{lead.phone}</a></p>
                ) : (
                  <p className="text-muted-foreground text-xs italic">No phone on file</p>
                )}
              </div>
            </div>
            <div className="bg-background rounded-md p-3">
              <h4 className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-primary" /> Business
              </h4>
              <div className="space-y-1 text-sm">
                {lead.business_name && <p><span className="text-muted-foreground text-xs">Business:</span> {lead.business_name}</p>}
                {lead.industry && <p><span className="text-muted-foreground text-xs">Industry:</span> {lead.industry}</p>}
                {lead.time_in_business && <p><span className="text-muted-foreground text-xs">In Business:</span> {lead.time_in_business}</p>}
                {lead.monthly_revenue && <p><span className="text-muted-foreground text-xs">Revenue:</span> {fmt$(lead.monthly_revenue)}/mo</p>}
              </div>
            </div>
          </div>

          {(lead.clc_status || lead.uw_status) && (
            <div className="bg-background rounded-md p-3">
              <h4 className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-primary" /> CLC History
              </h4>
              {(() => {
                const latestFunding = getLatestClcFundingDate(lead);
                const recentlyFunded = latestFunding && daysSince(latestFunding) < 60;
                const allFundings: { lender: string; amount: string | null; date: Date }[] = [];
                if (lead.clc_funded_date) {
                  const d = new Date(lead.clc_funded_date);
                  if (!isNaN(d.getTime())) allFundings.push({ lender: lead.clc_lender || "Unknown", amount: lead.clc_amount, date: d });
                }
                if (lead.clc_additional_fundings && Array.isArray(lead.clc_additional_fundings)) {
                  for (const f of lead.clc_additional_fundings) {
                    if (f.fundedDate) {
                      const d = new Date(f.fundedDate);
                      if (!isNaN(d.getTime())) allFundings.push({ lender: f.lender || "Unknown", amount: f.advanceAmount, date: d });
                    }
                  }
                }
                allFundings.sort((a, b) => b.date.getTime() - a.date.getTime());
                return (
                  <div className="space-y-1">
                    {recentlyFunded && (
                      <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 text-xs mb-1">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Recently Funded — {daysSince(latestFunding!)}d ago
                      </Badge>
                    )}
                    {allFundings.length > 0 ? allFundings.map((f, i) => (
                      <div key={i} className="flex flex-wrap items-center gap-2 text-sm">
                        <Badge variant="default" className="text-xs"><CheckCircle2 className="w-3 h-3 mr-1" />FUNDED</Badge>
                        <span>{f.lender}</span>
                        {f.amount && <span className="font-medium">{fmt$(f.amount)}</span>}
                        <span className="text-muted-foreground text-xs">{new Date(f.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                      </div>
                    )) : (
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <Badge variant={(lead.clc_status || lead.uw_status) === "approved" ? "secondary" : "outline"} className="text-xs">
                          {(lead.clc_status || lead.uw_status || "").toUpperCase()}
                        </Badge>
                        {(lead.clc_lender || lead.uw_lender) && <span>by {lead.clc_lender || lead.uw_lender}</span>}
                        {(lead.clc_amount || lead.uw_amount) && <span className="font-medium">{fmt$(lead.clc_amount || lead.uw_amount)}</span>}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2 mt-1">
                      {(lead.uw_approval_count || 0) > 0 && (
                        <span className="text-xs text-green-600 dark:text-green-400">{lead.uw_approval_count} approval{(lead.uw_approval_count || 0) !== 1 ? "s" : ""}</span>
                      )}
                      {(lead.uw_decline_count || 0) > 0 && (
                        <span className="text-xs text-red-500">{lead.uw_decline_count} decline{(lead.uw_decline_count || 0) !== 1 ? "s" : ""}</span>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {posCount > 0 && lead.positions && (
            <div>
              <h4 className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-primary" /> MCA Positions ({posCount})
              </h4>
              <div className="space-y-1.5">
                {lead.positions.map((pos, i) => {
                  const paidPct = pos.paybackAmount && pos.remainingBalance
                    ? Math.round((1 - parseFloat(pos.remainingBalance) / parseFloat(pos.paybackAmount)) * 100)
                    : null;
                  const ours = isOurFunder(lead, pos.funderName);
                  return (
                    <div key={i} className={`rounded-md p-2.5 text-sm ${ours ? "bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800" : "bg-background"}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-xs">
                          {pos.funderName}
                          {ours && <Badge className="ml-1.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 text-[10px] px-1 py-0">Our Funding</Badge>}
                        </span>
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
                        {paidPct !== null && (
                          <span>Progress: <span className="text-foreground font-medium">{paidPct}%</span></span>
                        )}
                        {pos.estimatedPayoffDate && <span>Payoff: {pos.estimatedPayoffDate}</span>}
                      </div>
                      {paidPct !== null && (
                        <div className="mt-1.5 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${paidPct >= 80 ? "bg-green-500" : paidPct >= 50 ? "bg-amber-500" : "bg-blue-500"}`} style={{ width: `${Math.min(100, paidPct)}%` }} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

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
                  onClick={(e) => { e.stopPropagation(); onOutreachUpdate(lead.id, s); }}
                >
                  {s === "not_contacted" ? "New" : s === "in_progress" ? "In Progress" : s.charAt(0).toUpperCase() + s.slice(1)}
                </Button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setShowNotes(!showNotes)}>
                {showNotes ? "Hide" : "Add"} Notes
              </Button>
              {(lead.outreach_notes || lead.notes) && !showNotes && (
                <span className="text-xs text-muted-foreground self-center italic truncate">{lead.outreach_notes || lead.notes}</span>
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
                <Button size="sm" className="self-end h-8" onClick={() => { onOutreachUpdate(lead.id, outreach, notesDraft); setShowNotes(false); }}>
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

export default function MyLeads() {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortField>("score");
  const [filterTier, setFilterTier] = useState("all");
  const [filterOutreach, setFilterOutreach] = useState("all");
  const [filterRep, setFilterRep] = useState("all");

  const { data: authData } = useQuery<{ isAuthenticated: boolean; role: string; agentName?: string; agentEmail?: string }>({
    queryKey: ["/api/auth/check"],
    queryFn: async () => {
      const res = await fetch("/api/auth/check", { credentials: "include" });
      if (!res.ok) return { isAuthenticated: false, role: "" };
      return res.json();
    },
  });

  const isAdmin = authData?.role === "admin" || authData?.role === "underwriting";

  const { data: leads = [], isLoading, refetch } = useQuery<Lead[]>({
    queryKey: ["/api/my-leads"],
    queryFn: async () => {
      const res = await fetch("/api/my-leads", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!authData?.isAuthenticated && authData.role !== "merchant" && authData.role !== "lead",
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/my-leads"] }),
  });

  const reps = useMemo(() => {
    const repSet = new Set<string>();
    leads.forEach(l => { if (l.agent_name) repSet.add(l.agent_name); });
    return [...repSet].sort();
  }, [leads]);

  const processed = useMemo(() => {
    let list = leads.map(l => ({ ...l, _score: computeScore(l) }));

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(l =>
        l.email?.toLowerCase().includes(q) ||
        l.business_name?.toLowerCase().includes(q) ||
        l.first_name?.toLowerCase().includes(q) ||
        l.last_name?.toLowerCase().includes(q) ||
        l.funder_names?.toLowerCase().includes(q) ||
        l.agent_name?.toLowerCase().includes(q)
      );
    }

    if (filterTier !== "all") {
      if (filterTier === "none") list = list.filter(l => !l.tier);
      else list = list.filter(l => l.tier === filterTier);
    }
    if (filterOutreach !== "all") {
      list = list.filter(l => (l.outreach_status || "not_contacted") === filterOutreach);
    }
    if (filterRep !== "all") {
      if (filterRep === "unassigned") list = list.filter(l => !l.agent_name);
      else list = list.filter(l => l.agent_name === filterRep);
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
  }, [leads, search, sortBy, filterTier, filterOutreach, filterRep]);

  if (!authData?.isAuthenticated || authData.role === "merchant" || authData.role === "lead") return null;

  const withPositions = leads.filter(l => (parseInt(l.position_count) || 0) > 0);
  const hotLeads = leads.filter(l => l.tier === "HOT");
  const readyToClose = leads.filter(l => (l.uw_status === "approved" || l.clc_status === "approved") && !getLatestClcFundingDate(l));
  const notContacted = leads.filter(l => (l.outreach_status || "not_contacted") === "not_contacted" && (parseInt(l.position_count) || 0) > 0);
  const totalDailyLoad = leads.reduce((s, l) => s + parseFloat(l.daily_load || "0"), 0);

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
            </Link>
            <div>
              <h1 className="font-bold text-base leading-tight">
                {isAdmin ? "Lead Pipeline" : "My Leads"}
              </h1>
              <p className="text-xs text-muted-foreground">
                {isAdmin
                  ? `All leads with MCA positions (${leads.length})`
                  : `${authData.agentName}'s assigned leads (${leads.length})`}
              </p>
            </div>
          </div>
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <Card className="cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all" onClick={() => { setFilterTier("all"); setFilterOutreach("all"); setFilterRep("all"); }}>
            <CardContent className="pt-3 pb-3 px-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary flex-shrink-0" />
                <div>
                  <p className="text-xl font-bold">{leads.length}</p>
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
                  <p className="text-[10px] text-muted-foreground">Hot</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:ring-1 hover:ring-green-400/30 transition-all" onClick={() => { setFilterTier("all"); setFilterOutreach("all"); }}>
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
          <Card className="cursor-pointer hover:ring-1 hover:ring-blue-400/30 transition-all" onClick={() => { setFilterOutreach("not_contacted"); setFilterTier("all"); }}>
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
                <Briefcase className="w-4 h-4 text-primary flex-shrink-0" />
                <div>
                  <p className="text-xl font-bold">{withPositions.length}</p>
                  <p className="text-[10px] text-muted-foreground">With Positions</p>
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
                  <p className="text-[10px] text-muted-foreground">Daily Load</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                {isAdmin ? "All Leads" : "My Leads"}
                <Badge variant="secondary" className="text-xs">{processed.length}</Badge>
              </CardTitle>
              <div className="flex flex-wrap gap-2 items-center">
                <div className="relative w-full sm:w-48">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-sm" />
                </div>
                <select value={sortBy} onChange={e => setSortBy(e.target.value as SortField)} className="h-8 text-xs border rounded-md px-2 bg-background">
                  <option value="score">Score</option>
                  <option value="daily_load">Daily Load</option>
                  <option value="name">Name</option>
                  <option value="created">Newest</option>
                </select>
                <select value={filterTier} onChange={e => setFilterTier(e.target.value)} className="h-8 text-xs border rounded-md px-2 bg-background">
                  <option value="all">All Tiers</option>
                  <option value="HOT">Hot</option>
                  <option value="WARM">Warm</option>
                  <option value="SOON">Soon</option>
                  <option value="EARLY">Early</option>
                  <option value="none">No Tier</option>
                </select>
                <select value={filterOutreach} onChange={e => setFilterOutreach(e.target.value)} className="h-8 text-xs border rounded-md px-2 bg-background">
                  <option value="all">All Outreach</option>
                  <option value="not_contacted">Not Contacted</option>
                  <option value="contacted">Contacted</option>
                  <option value="in_progress">In Progress</option>
                  <option value="converted">Converted</option>
                  <option value="passed">Passed</option>
                </select>
                {isAdmin && reps.length > 0 && (
                  <select value={filterRep} onChange={e => setFilterRep(e.target.value)} className="h-8 text-xs border rounded-md px-2 bg-background">
                    <option value="all">All Reps</option>
                    {reps.map(r => <option key={r} value={r}>{r}</option>)}
                    <option value="unassigned">Unassigned</option>
                  </select>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground text-sm">Loading leads...</div>
            ) : processed.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                {search || filterTier !== "all" || filterOutreach !== "all" || filterRep !== "all"
                  ? "No leads match your filters."
                  : isAdmin ? "No leads yet." : "No leads assigned to you yet."}
              </div>
            ) : (
              processed.map(lead => (
                <LeadRow
                  key={lead.id}
                  lead={lead}
                  isAdmin={!!isAdmin}
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
