import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoginForm } from "@/components/auth/LoginForm";
import { Link } from "wouter";
import {
  Phone, PhoneOff, AlertTriangle, Clock, ChevronLeft, Users,
  DollarSign, Loader2, Search, Filter, TrendingUp, MessageSquare,
  XCircle, CheckCircle2, Calendar,
} from "lucide-react";

interface ApprovalDeal {
  name: string;
  email: string;
  phone: string;
  rep: string;
  lender: string;
  amount: string;
  approvalDate: string;
  daysSinceApproval: number;
  lastCallDate: string;
  daysSinceCall: number;
  callDuration: string;
  callResult: string;
  calledAfterApproval: string;
  ghlTags: string[];
  ghlNotes: string;
  urgency: "critical" | "high" | "medium" | "low";
  actionable: boolean;
  insight: string;
}

// Static report data — generated from the approval call + GHL analysis
const REPORT_DATA: ApprovalDeal[] = [
  // NEVER CALLED — CRITICAL
  { name: "Kammer Electric", email: "kammerelectric@gmail.com", phone: "+13607724940", rep: "Dennys Cisne", lender: "Fintegra", amount: "165000", approvalDate: "2026-05-11", daysSinceApproval: 44, lastCallDate: "NEVER", daysSinceCall: -1, callDuration: "", callResult: "", calledAfterApproval: "N/A", ghlTags: [], ghlNotes: "Never contacted — no notes, no calls, no activity", urgency: "critical", actionable: true, insight: "$165K approved with Fintegra. Zero contact attempts. Fresh opportunity." },
  { name: "Fad Foods LLC", email: "shan@fad-foods.com", phone: "+19134955577", rep: "Ryan Wilcox", lender: "Revenued", amount: "170000", approvalDate: "2026-01-06", daysSinceApproval: 169, lastCallDate: "NEVER", daysSinceCall: -1, callDuration: "", callResult: "", calledAfterApproval: "N/A", ghlTags: [], ghlNotes: "Never contacted — zero activity in GHL", urgency: "critical", actionable: true, insight: "$170K Revenued LOC approval. 169 days old. Never contacted." },
  { name: "Golden Age Assisted Living", email: "george@serenityrecoveryliving.com", phone: "+13305491237", rep: "Ryan Wilcox", lender: "Vital Cap", amount: "60000", approvalDate: "2026-02-02", daysSinceApproval: 142, lastCallDate: "NEVER", daysSinceCall: -1, callDuration: "", callResult: "", calledAfterApproval: "N/A", ghlTags: ["approved"], ghlNotes: "Tagged 'approved' in GHL but never contacted", urgency: "critical", actionable: true, insight: "$60K Vital Cap approval. Tagged approved but zero outreach." },
  { name: "Dauntless Industries (Dauntless Molds)", email: "gpayton@dauntlessmolds.com", phone: "+16267123874", rep: "Julius Speck", lender: "Kapitus", amount: "300000", approvalDate: "2026-06-09", daysSinceApproval: 15, lastCallDate: "NEVER", daysSinceCall: -1, callDuration: "", callResult: "", calledAfterApproval: "N/A", ghlTags: ["unengaged"], ghlNotes: "GHL: Last note 'Voicemail' from Dec 22. Tagged unengaged.", urgency: "critical", actionable: true, insight: "$300K Kapitus approval from June 9. Massive deal, no follow-up." },
  { name: "Morokot Foods NW", email: "", phone: "", rep: "Dillon LeBlanc", lender: "Kapitus", amount: "280000", approvalDate: "2026-04-09", daysSinceApproval: 76, lastCallDate: "NEVER", daysSinceCall: -1, callDuration: "", callResult: "", calledAfterApproval: "N/A", ghlTags: [], ghlNotes: "Not found in GHL", urgency: "critical", actionable: true, insight: "$280K Kapitus approval. 76 days old. Not in GHL." },
  { name: "SmartScript Pharmacy", email: "", phone: "", rep: "Dominic Kendl", lender: "Kapitus", amount: "250000", approvalDate: "2026-04-15", daysSinceApproval: 70, lastCallDate: "NEVER", daysSinceCall: -1, callDuration: "", callResult: "", calledAfterApproval: "N/A", ghlTags: [], ghlNotes: "Not found in GHL", urgency: "critical", actionable: true, insight: "$250K Kapitus approval. Not tracked anywhere." },
  { name: "Babe Brewing", email: "", phone: "", rep: "Julius Speck", lender: "Kapitus", amount: "200000", approvalDate: "2026-03-20", daysSinceApproval: 96, lastCallDate: "NEVER", daysSinceCall: -1, callDuration: "", callResult: "", calledAfterApproval: "N/A", ghlTags: [], ghlNotes: "Not found in GHL", urgency: "critical", actionable: true, insight: "$200K Kapitus approval. 96 days old. Never called." },
  { name: "Priest Point Wine & Spirits", email: "priestpointws@gmail.com", phone: "+16153000135", rep: "Ryan Wilcox", lender: "Kapitus", amount: "200000", approvalDate: "2026-01-12", daysSinceApproval: 163, lastCallDate: "NEVER", daysSinceCall: -1, callDuration: "", callResult: "", calledAfterApproval: "N/A", ghlTags: ["approved", "unengaged"], ghlNotes: "GHL: Tagged approved + unengaged. Last note: 'Voicemail'", urgency: "critical", actionable: false, insight: "$200K Kapitus. 163 days old — likely expired. Was called, left VM, abandoned." },
  { name: "RRDN INC", email: "", phone: "", rep: "Jonathan Rendon", lender: "Redwood Business", amount: "175000", approvalDate: "2026-05-21", daysSinceApproval: 34, lastCallDate: "NEVER", daysSinceCall: -1, callDuration: "", callResult: "", calledAfterApproval: "N/A", ghlTags: [], ghlNotes: "Not found in GHL", urgency: "critical", actionable: true, insight: "$175K Redwood approval. Only 34 days old — may still be active." },
  { name: "Fowlers Pools", email: "davidfowler99@gmail.com", phone: "+14803901736", rep: "Dillon LeBlanc", lender: "Fuji", amount: "125000", approvalDate: "2026-04-15", daysSinceApproval: 70, lastCallDate: "NEVER", daysSinceCall: -1, callDuration: "", callResult: "", calledAfterApproval: "N/A", ghlTags: ["funded"], ghlNotes: "GHL: Tagged 'funded' (previous round). New approval not pursued.", urgency: "critical", actionable: true, insight: "$125K Fuji approval. Previously funded — strong renewal candidate." },

  // HIGH URGENCY — Was interested but dropped
  { name: "Husky Concrete Removal", email: "jcghusky7@gmail.com", phone: "+17143286585", rep: "Kenny Nwobi", lender: "Revenued", amount: "19000", approvalDate: "2026-04-09", daysSinceApproval: 76, lastCallDate: "02/09/2026", daysSinceCall: 135, callDuration: "0:00", callResult: "unknown", calledAfterApproval: "No", ghlTags: ["approved", "stale - app sent: missing action"], ghlNotes: "GHL Note: 'PUSH BACK TWO WEEKS END OF FEB. HES DOWN FOR 20K LOC AND 40K MCA' — merchant was interested but nobody followed up after the pushback.", urgency: "high", actionable: true, insight: "Was explicitly interested in $20K LOC + $40K MCA. Pushed back to end of Feb, never re-contacted. Call now." },
  { name: "Sunset Machinery", email: "joesunset3@gmail.com", phone: "+12069472366", rep: "Julius Speck", lender: "Vital Cap", amount: "100000", approvalDate: "2026-03-12", daysSinceApproval: 104, lastCallDate: "04/27/2026", daysSinceCall: 58, callDuration: "0:30", callResult: "connected", calledAfterApproval: "Yes", ghlTags: ["application complete"], ghlNotes: "GHL Note: 'Ken said he should be sending over statements right now' — was actively engaged, then went quiet.", urgency: "high", actionable: true, insight: "Was sending statements. Connected call on 4/27 (30 sec). Check if statements arrived." },
  { name: "Vision Forensic Engineering", email: "mross@visionforensicengineering.com", phone: "+16615991064", rep: "Greg Dergevorkian", lender: "Specialty", amount: "120000", approvalDate: "2026-03-09", daysSinceApproval: 107, lastCallDate: "03/27/2026", daysSinceCall: 89, callDuration: "0:14", callResult: "connected", calledAfterApproval: "No", ghlTags: ["approved", "unengaged", "application complete", "statements provided"], ghlNotes: "GHL: '$587K revenue forensic engineering firm with prior $50K advance. Michael Ross is Managing Principal.' Strong lead — app complete, statements in, approved, but tagged unengaged.", urgency: "high", actionable: true, insight: "$587K rev business, prior $50K advance, $120K approved. Everything is ready — just needs a closing call." },
  { name: "Salon Cristina", email: "saloncristina-@hotmail.com", phone: "+15183967522", rep: "Kenny Nwobi", lender: "DLP", amount: "172200", approvalDate: "2026-01-08", daysSinceApproval: 167, lastCallDate: "04/28/2026", daysSinceCall: 57, callDuration: "0:59", callResult: "connected", calledAfterApproval: "Yes", ghlTags: [], ghlNotes: "GHL Note: 'REVERSE OFFER' — Selling note: 'Retail needs inventory capital before busy seasons. We fund fast so you can stock up.'", urgency: "high", actionable: true, insight: "$172K DLP reverse offer. Had a 1-min connected call. Retail needing inventory capital — seasonal angle." },

  // MEDIUM — Stale but some activity
  { name: "Bestone Construction", email: "albertop.arvizu@gmail.com", phone: "+19497283010", rep: "Dillon LeBlanc", lender: "Specialty Capital", amount: "70000", approvalDate: "2026-06-17", daysSinceApproval: 7, lastCallDate: "NEVER", daysSinceCall: -1, callDuration: "", callResult: "", calledAfterApproval: "N/A", ghlTags: [], ghlNotes: "Not in GHL. Very recent approval — only 7 days old.", urgency: "medium", actionable: true, insight: "$70K Specialty approval from June 17. Only 7 days old — needs immediate outreach." },
  { name: "RadiumSpark Inc.", email: "stalwar@radiumspark.com", phone: "", rep: "Dillon LeBlanc", lender: "Lendr", amount: "120800", approvalDate: "2026-06-09", daysSinceApproval: 15, lastCallDate: "NEVER", daysSinceCall: -1, callDuration: "", callResult: "", calledAfterApproval: "N/A", ghlTags: [], ghlNotes: "Not in GHL. Recent approval.", urgency: "medium", actionable: true, insight: "$121K Lendr approval. 15 days old. No outreach." },
  { name: "Central Truck & Oil Supply", email: "sergio@ctosupply.com", phone: "", rep: "Dillon LeBlanc", lender: "Specialty Capital", amount: "40000", approvalDate: "2026-06-03", daysSinceApproval: 21, lastCallDate: "NEVER", daysSinceCall: -1, callDuration: "", callResult: "", calledAfterApproval: "N/A", ghlTags: [], ghlNotes: "Not in GHL.", urgency: "medium", actionable: true, insight: "$40K Specialty approval. 21 days old." },
  { name: "Zimprich Engineering", email: "brandon@zimprichengineering.com", phone: "+17143188237", rep: "Bryce Jennings", lender: "Specialty", amount: "200000", approvalDate: "2026-03-09", daysSinceApproval: 107, lastCallDate: "05/04/2026", daysSinceCall: 51, callDuration: "0:04", callResult: "connected", calledAfterApproval: "Yes", ghlTags: ["approved", "application complete"], ghlNotes: "GHL: Voicemail only. Tagged approved + app complete.", urgency: "medium", actionable: true, insight: "$200K Specialty. App complete, approved. Brief connected call but no progress." },
  { name: "Oakland Park Animal Hospital", email: "", phone: "", rep: "Dillon LeBlanc", lender: "Fenix", amount: "100000", approvalDate: "2026-03-30", daysSinceApproval: 86, lastCallDate: "04/29/2026", daysSinceCall: 56, callDuration: "0:41", callResult: "connected", calledAfterApproval: "Yes", ghlTags: [], ghlNotes: "Had a 41-second connected call. No GHL notes found.", urgency: "medium", actionable: true, insight: "$100K Fenix. Connected for 41 sec on 4/29 but no close." },
  { name: "Burton NDT Rentals", email: "mark@bndtrentals.com", phone: "+12819000834", rep: "Kenny Nwobi", lender: "Specialty", amount: "105000", approvalDate: "2026-01-22", daysSinceApproval: 153, lastCallDate: "05/20/2026", daysSinceCall: 35, callDuration: "0:00", callResult: "cancelled", calledAfterApproval: "Yes", ghlTags: [], ghlNotes: "GHL: 'Voicemail: NA x 1' — single VM attempt.", urgency: "medium", actionable: false, insight: "$105K Specialty. 153 days old — likely expired. One VM attempt." },

  // LOW — Dead or explicitly declined
  { name: "Cherry Bean", email: "simon@cherrybeancoffee.co", phone: "+17208775367", rep: "Greg Dergevorkian", lender: "Fenix", amount: "40000", approvalDate: "2026-05-01", daysSinceApproval: 54, lastCallDate: "04/07/2026", daysSinceCall: 78, callDuration: "0:05", callResult: "connected", calledAfterApproval: "No", ghlTags: ["approved"], ghlNotes: "GHL Note: 'does not want mca' — merchant explicitly rejected the offer.", urgency: "low", actionable: false, insight: "Merchant explicitly said 'does not want MCA'. Dead deal." },
  { name: "Padron Metal Finishing", email: "ipadron@att.net", phone: "+17148848561", rep: "Jonathan Rendon", lender: "Fuji", amount: "32000", approvalDate: "2026-05-12", daysSinceApproval: 43, lastCallDate: "NEVER", daysSinceCall: -1, callDuration: "", callResult: "", calledAfterApproval: "N/A", ghlTags: [], ghlNotes: "GHL Note: 'NA x2 APPEARS LINES OUT OF SERVICE' — bad phone number.", urgency: "low", actionable: false, insight: "Phone lines out of service. Need alternate contact method." },
];

const fmt$ = (v: string | number) => {
  const n = typeof v === "string" ? parseFloat(v) : v;
  return isNaN(n) ? "$0" : "$" + n.toLocaleString();
};

const urgencyConfig = {
  critical: { label: "Critical", color: "#ef4444", bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.3)", icon: XCircle },
  high: { label: "High", color: "#f59e0b", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.3)", icon: AlertTriangle },
  medium: { label: "Medium", color: "#3b82f6", bg: "rgba(59,130,246,0.1)", border: "rgba(59,130,246,0.3)", icon: Clock },
  low: { label: "Low", color: "#64748b", bg: "rgba(100,116,139,0.1)", border: "rgba(100,116,139,0.3)", icon: CheckCircle2 },
};

export default function ApprovalFollowUp() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [filter, setFilter] = useState<"all" | "critical" | "high" | "medium" | "low" | "actionable">("all");
  const [repFilter, setRepFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/auth/check", { credentials: "include" })
      .then(r => r.json())
      .then(data => {
        if (data.isAuthenticated && (data.role === "admin" || data.role === "underwriting")) setIsAuthenticated(true);
        setAuthChecked(true);
      })
      .catch(() => setAuthChecked(true));
  }, []);

  if (!authChecked) return <div className="min-h-screen bg-gray-950 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-400" /></div>;
  if (!isAuthenticated) return <LoginForm onLoginSuccess={() => {
    fetch("/api/auth/check", { credentials: "include" }).then(r => r.json()).then(data => {
      if (data.isAuthenticated) setIsAuthenticated(true);
    });
  }} />;

  const reps = [...new Set(REPORT_DATA.map(d => d.rep))].sort();

  const filtered = REPORT_DATA.filter(d => {
    if (filter === "actionable" && !d.actionable) return false;
    if (filter !== "all" && filter !== "actionable" && d.urgency !== filter) return false;
    if (repFilter !== "all" && d.rep !== repFilter) return false;
    if (search && !d.name.toLowerCase().includes(search.toLowerCase()) && !d.lender.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const stats = {
    total: REPORT_DATA.length,
    critical: REPORT_DATA.filter(d => d.urgency === "critical").length,
    high: REPORT_DATA.filter(d => d.urgency === "high").length,
    actionable: REPORT_DATA.filter(d => d.actionable).length,
    totalValue: REPORT_DATA.reduce((s, d) => s + (parseFloat(d.amount) || 0), 0),
    neverCalled: REPORT_DATA.filter(d => d.lastCallDate === "NEVER").length,
    neverCalledValue: REPORT_DATA.filter(d => d.lastCallDate === "NEVER").reduce((s, d) => s + (parseFloat(d.amount) || 0), 0),
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="bg-[#1e3a5f] px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard"><Button variant="ghost" size="sm" className="text-white hover:bg-white/10"><ChevronLeft className="w-4 h-4 mr-1" />Dashboard</Button></Link>
            <AlertTriangle className="h-6 w-6 text-amber-400" />
            <div>
              <h1 className="text-lg font-bold">Approval Follow-Up Report</h1>
              <p className="text-xs text-blue-200">Approved deals that need attention — call history + GHL notes analysis</p>
            </div>
          </div>
          <Badge variant="outline" className="border-amber-500/30 text-amber-400">
            {stats.actionable} actionable deals
          </Badge>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1"><XCircle className="w-4 h-4 text-red-400" /><span className="text-xs text-gray-500 uppercase">Never Called</span></div>
              <p className="text-2xl font-bold text-white">{stats.neverCalled}</p>
              <p className="text-xs text-red-400">{fmt$(stats.neverCalledValue)} in value</p>
            </CardContent>
          </Card>
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1"><AlertTriangle className="w-4 h-4 text-amber-400" /><span className="text-xs text-gray-500 uppercase">Critical</span></div>
              <p className="text-2xl font-bold text-white">{stats.critical}</p>
              <p className="text-xs text-gray-500">need immediate action</p>
            </CardContent>
          </Card>
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1"><DollarSign className="w-4 h-4 text-emerald-400" /><span className="text-xs text-gray-500 uppercase">Total Value</span></div>
              <p className="text-2xl font-bold text-white">{fmt$(stats.totalValue)}</p>
              <p className="text-xs text-gray-500">{stats.total} approved deals</p>
            </CardContent>
          </Card>
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1"><TrendingUp className="w-4 h-4 text-teal-400" /><span className="text-xs text-gray-500 uppercase">Actionable</span></div>
              <p className="text-2xl font-bold text-white">{stats.actionable}</p>
              <p className="text-xs text-gray-500">worth re-engaging</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          {(["all", "actionable", "critical", "high", "medium", "low"] as const).map(f => (
            <Button key={f} variant={filter === f ? "default" : "outline"} size="sm"
              className={filter !== f ? "border-gray-700 text-gray-300" : ""}
              onClick={() => setFilter(f)}>
              {f === "all" ? "All" : f === "actionable" ? "Actionable" : urgencyConfig[f as keyof typeof urgencyConfig]?.label || f}
              <span className="ml-1 text-xs opacity-70">
                ({f === "all" ? stats.total : f === "actionable" ? stats.actionable : REPORT_DATA.filter(d => d.urgency === f).length})
              </span>
            </Button>
          ))}
          <select value={repFilter} onChange={e => setRepFilter(e.target.value)}
            className="bg-gray-900 border border-gray-700 text-gray-300 text-sm rounded-md px-3 py-1.5 ml-auto">
            <option value="all">All Reps</option>
            {reps.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
              className="bg-gray-900 border border-gray-700 text-white text-sm rounded-md pl-9 pr-3 py-1.5 w-48" />
          </div>
        </div>

        {/* Deal Cards */}
        <div className="space-y-3">
          {filtered.map((deal, i) => {
            const cfg = urgencyConfig[deal.urgency];
            const Icon = cfg.icon;
            return (
              <Card key={i} className="bg-gray-900 border-gray-800 hover:border-gray-700 transition-colors">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                        <Icon className="w-5 h-5" style={{ color: cfg.color }} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white text-base">{deal.name}</h3>
                        <p className="text-xs text-gray-500">{deal.email || "no email"} {deal.phone && `| ${deal.phone}`}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xl font-bold text-white">{fmt$(deal.amount)}</p>
                      <p className="text-xs text-gray-500">{deal.lender}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-3 text-sm">
                    <div>
                      <p className="text-xs text-gray-500">Rep</p>
                      <p className="text-gray-300 font-medium">{deal.rep}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Approved</p>
                      <p className="text-gray-300">{deal.approvalDate} <span className="text-gray-600">({deal.daysSinceApproval}d ago)</span></p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Last Called</p>
                      <p className={deal.lastCallDate === "NEVER" ? "text-red-400 font-bold" : "text-gray-300"}>
                        {deal.lastCallDate === "NEVER" ? "NEVER CALLED" : `${deal.lastCallDate} (${deal.daysSinceCall}d)`}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Call Result</p>
                      <p className="text-gray-300">{deal.callResult || "—"} {deal.callDuration && `(${deal.callDuration})`}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Urgency</p>
                      <Badge variant="outline" style={{ borderColor: cfg.border, color: cfg.color }}>{cfg.label}</Badge>
                    </div>
                  </div>

                  {/* Insight */}
                  <div className="p-3 rounded-lg" style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                    <p className="text-sm font-medium" style={{ color: cfg.color }}>{deal.insight}</p>
                  </div>

                  {/* GHL Notes */}
                  {deal.ghlNotes && (
                    <div className="mt-3 p-3 bg-gray-800/50 rounded-lg">
                      <div className="flex items-center gap-1.5 mb-1">
                        <MessageSquare className="w-3.5 h-3.5 text-gray-500" />
                        <span className="text-xs text-gray-500 uppercase">GHL Context</span>
                      </div>
                      <p className="text-sm text-gray-400">{deal.ghlNotes}</p>
                    </div>
                  )}

                  {deal.ghlTags.length > 0 && (
                    <div className="flex gap-1.5 mt-2 flex-wrap">
                      {deal.ghlTags.map(t => (
                        <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No deals match your filters</p>
          </div>
        )}

        <p className="text-xs text-gray-600 text-center">
          Report generated June 25, 2026 | Data from CLC database, Zoom call logs, and GHL dialer contacts
        </p>
      </div>
    </div>
  );
}
