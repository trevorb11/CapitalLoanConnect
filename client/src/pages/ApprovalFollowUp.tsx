import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoginForm } from "@/components/auth/LoginForm";
import { Link } from "wouter";
import {
  Phone, PhoneOff, AlertTriangle, Clock, ChevronLeft, Users,
  DollarSign, Loader2, Search, TrendingUp, MessageSquare,
  XCircle, CheckCircle2, Calendar, PhoneCall,
} from "lucide-react";

const fmt$ = (v: number) => "$" + v.toLocaleString(undefined, { maximumFractionDigits: 0 });

const urgencyConfig: Record<string, { label: string; color: string; bg: string; border: string; icon: any }> = {
  stale: { label: "Stale (30d+)", color: "#f59e0b", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.3)", icon: AlertTriangle },
  aging: { label: "Aging (7-30d)", color: "#3b82f6", bg: "rgba(59,130,246,0.1)", border: "rgba(59,130,246,0.3)", icon: Clock },
  recent: { label: "Recent", color: "#10b981", bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.3)", icon: CheckCircle2 },
  no_zoom_record: { label: "No Zoom Record", color: "#94a3b8", bg: "rgba(148,163,184,0.1)", border: "rgba(148,163,184,0.3)", icon: Phone },
  no_phone: { label: "No Phone", color: "#8b5cf6", bg: "rgba(139,92,246,0.1)", border: "rgba(139,92,246,0.3)", icon: PhoneOff },
  ok: { label: "Recent", color: "#10b981", bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.3)", icon: CheckCircle2 },
  dead: { label: "Dead", color: "#64748b", bg: "rgba(100,116,139,0.1)", border: "rgba(100,116,139,0.3)", icon: XCircle },
  critical: { label: "No Zoom Record", color: "#94a3b8", bg: "rgba(148,163,184,0.1)", border: "rgba(148,163,184,0.3)", icon: Phone },
};

export default function ApprovalFollowUp() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [filter, setFilter] = useState("all");
  const [repFilter, setRepFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/auth/check", { credentials: "include" })
      .then(r => r.json())
      .then(data => { if (data.isAuthenticated) setIsAuthenticated(true); setAuthChecked(true); })
      .catch(() => setAuthChecked(true));
  }, []);

  const { data: report, isLoading } = useQuery<any>({
    queryKey: ["/api/admin/approval-followup"],
    queryFn: async () => {
      const res = await fetch("/api/admin/approval-followup", { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: isAuthenticated,
  });

  if (!authChecked) return <div className="min-h-screen bg-gray-950 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-400" /></div>;
  if (!isAuthenticated) return <LoginForm onLoginSuccess={() => { fetch("/api/auth/check", { credentials: "include" }).then(r => r.json()).then(data => { if (data.isAuthenticated) setIsAuthenticated(true); }); }} />;

  const deals: any[] = report?.deals || [];
  const reps = [...new Set(deals.map((d: any) => d.rep).filter(Boolean))].sort();

  const filtered = deals.filter((d: any) => {
    if (filter !== "all" && d.urgency !== filter) return false;
    if (repFilter !== "all" && d.rep !== repFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!(d.name || "").toLowerCase().includes(q) && !(d.lender || "").toLowerCase().includes(q) && !(d.email || "").toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const counts: Record<string, number> = {};
  for (const d of deals) counts[d.urgency] = (counts[d.urgency] || 0) + 1;
  const actionableCount = deals.filter((d: any) => !d.isDead && d.urgency !== "no_phone").length;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="bg-[#1e3a5f] px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard"><Button variant="ghost" size="sm" className="text-white hover:bg-white/10"><ChevronLeft className="w-4 h-4 mr-1" />Dashboard</Button></Link>
            <AlertTriangle className="h-6 w-6 text-amber-400" />
            <div>
              <h1 className="text-lg font-bold">Approval Follow-Up Report</h1>
              <p className="text-xs text-blue-200">
                {report?.total || 0} approved deals | {fmt$(report?.totalValue || 0)} pipeline
                {report?.generatedAt && <span> | Generated {new Date(report.generatedAt).toLocaleDateString()}</span>}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
        ) : !report ? (
          <div className="text-center py-16 text-gray-500"><AlertTriangle className="w-10 h-10 mx-auto mb-3 opacity-30" /><p>No report data available</p></div>
        ) : (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <Card className="bg-gray-900 border-gray-800"><CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1"><Phone className="w-4 h-4 text-emerald-400" /><span className="text-[10px] text-gray-500 uppercase">With Call Data</span></div>
                <p className="text-2xl font-bold text-white">{report.withCallData || 0}</p>
                <p className="text-xs text-gray-500">Zoom call history matched</p>
              </CardContent></Card>
              <Card className="bg-gray-900 border-gray-800"><CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1"><AlertTriangle className="w-4 h-4 text-amber-400" /><span className="text-[10px] text-gray-500 uppercase">Stale (30d+)</span></div>
                <p className="text-2xl font-bold text-white">{report.stale || 0}</p>
                <p className="text-xs text-gray-500">last call 30+ days ago</p>
              </CardContent></Card>
              <Card className="bg-gray-900 border-gray-800"><CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1"><Phone className="w-4 h-4 text-gray-400" /><span className="text-[10px] text-gray-500 uppercase">No Zoom Record</span></div>
                <p className="text-2xl font-bold text-white">{report.noZoomRecord || 0}</p>
                <p className="text-xs text-gray-500">has phone, no Zoom match</p>
              </CardContent></Card>
              <Card className="bg-gray-900 border-gray-800"><CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1"><PhoneOff className="w-4 h-4 text-purple-400" /><span className="text-[10px] text-gray-500 uppercase">No Phone</span></div>
                <p className="text-2xl font-bold text-white">{report.noPhone || 0}</p>
                <p className="text-xs text-gray-500">need contact info</p>
              </CardContent></Card>
              <Card className="bg-gray-900 border-gray-800"><CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1"><DollarSign className="w-4 h-4 text-emerald-400" /><span className="text-[10px] text-gray-500 uppercase">Total Pipeline</span></div>
                <p className="text-2xl font-bold text-white">{fmt$(report.totalValue)}</p>
                <p className="text-xs text-gray-500">{report.total} deals</p>
              </CardContent></Card>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2 items-center">
              {[
                { key: "all", label: "All", count: deals.length },
                { key: "stale", label: "Stale 30d+", count: counts["stale"] || 0 },
                { key: "aging", label: "Aging 7-30d", count: counts["aging"] || 0 },
                { key: "recent", label: "Recent", count: counts["recent"] || 0 },
                { key: "no_zoom_record", label: "No Zoom Record", count: counts["no_zoom_record"] || 0 },
                { key: "no_phone", label: "No Phone", count: counts["no_phone"] || 0 },
                { key: "dead", label: "Dead", count: counts["dead"] || 0 },
              ].map(f => (
                <Button key={f.key} variant={filter === f.key ? "default" : "outline"} size="sm"
                  className={filter !== f.key ? "border-gray-700 text-gray-300" : ""}
                  onClick={() => setFilter(f.key)}>
                  {f.label} <span className="ml-1 text-xs opacity-60">({f.count})</span>
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
              {filtered.map((deal: any, i: number) => {
                const cfg = urgencyConfig[deal.urgency] || urgencyConfig.ok;
                const Icon = cfg.icon;
                return (
                  <Card key={i} className="bg-gray-900 border-gray-800 hover:border-gray-700 transition-colors">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                            <Icon className="w-5 h-5" style={{ color: cfg.color }} />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-semibold text-white text-base truncate">{deal.name}</h3>
                            <p className="text-xs text-gray-500 truncate">{deal.email || "no email"} {deal.phone && `| ${deal.phone}`}</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xl font-bold text-white">{deal.amount > 0 ? fmt$(deal.amount) : "N/A"}</p>
                          <p className="text-xs text-gray-500">{deal.lender}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-3 text-sm">
                        <div><p className="text-xs text-gray-500">Rep</p><p className="text-gray-300 font-medium">{deal.rep || "Unassigned"}</p></div>
                        <div><p className="text-xs text-gray-500">Approved</p><p className="text-gray-300">{deal.approvalDate} <span className="text-gray-600">({deal.daysAppr}d)</span></p></div>
                        <div>
                          <p className="text-xs text-gray-500">Last Called</p>
                          <p className={!deal.callDate && deal.phone ? "text-gray-400" : !deal.phone ? "text-purple-400" : "text-gray-300"}>
                            {deal.callDate ? `${deal.callDate} (${deal.daysSinceCall}d ago)` : deal.phone ? "No Zoom record" : "No phone on file"}
                          </p>
                        </div>
                        <div><p className="text-xs text-gray-500">Call Result</p><p className="text-gray-300">{deal.callResult || "—"} {deal.callDuration > 0 && `(${Math.floor(deal.callDuration/60)}:${String(deal.callDuration%60).padStart(2,"0")})`}</p></div>
                        <div><p className="text-xs text-gray-500">Urgency</p><Badge variant="outline" style={{ borderColor: cfg.border, color: cfg.color }}>{cfg.label}</Badge></div>
                      </div>

                      {/* Insight */}
                      <div className="p-3 rounded-lg" style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                        <p className="text-sm font-medium" style={{ color: cfg.color }}>{deal.insight}</p>
                      </div>

                      {/* GHL Context */}
                      {(deal.ghlNote || deal.ghlSell) && (
                        <div className="mt-3 p-3 bg-gray-800/50 rounded-lg">
                          <div className="flex items-center gap-1.5 mb-1"><MessageSquare className="w-3.5 h-3.5 text-gray-500" /><span className="text-xs text-gray-500 uppercase">GHL Context</span></div>
                          {deal.ghlNote && <p className="text-sm text-gray-400">{deal.ghlNote}</p>}
                          {deal.ghlSell && <p className="text-sm text-gray-500 mt-1 italic">{deal.ghlSell}</p>}
                        </div>
                      )}
                      {deal.ghlTags?.length > 0 && (
                        <div className="flex gap-1.5 mt-2 flex-wrap">
                          {deal.ghlTags.map((t: string) => <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>)}
                        </div>
                      )}

                      {/* Called before approval flag */}
                      {deal.calledAfter === "No" && (
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-400">
                          <PhoneCall className="w-3.5 h-3.5" />
                          Called before approval — merchant may not know they're approved
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {filtered.length === 0 && (
              <div className="text-center py-12 text-gray-500"><Search className="w-10 h-10 mx-auto mb-3 opacity-30" /><p>No deals match your filters</p></div>
            )}

            <p className="text-xs text-gray-600 text-center">
              Data from CLC database, Zoom call logs ({deals.filter((d: any) => d.callDate !== "NEVER" && d.callDate !== "NO PHONE").length} matched), and GHL dialer contacts ({deals.filter((d: any) => d.ghlNote || d.ghlTags?.length).length} matched)
            </p>
          </>
        )}
      </div>
    </div>
  );
}
