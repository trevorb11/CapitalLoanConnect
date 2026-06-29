import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoginForm } from "@/components/auth/LoginForm";
import { Link } from "wouter";
import {
  ChevronLeft, Loader2, Search, DollarSign, TrendingUp, Users,
  Building2, Calendar, BarChart3, PieChart, AlertTriangle,
  CheckCircle2, ArrowUpDown, ChevronDown, ChevronUp, Database, Globe,
} from "lucide-react";

const fmt$ = (v: number) => "$" + v.toLocaleString(undefined, { maximumFractionDigits: 0 });
const fmtK = (v: number) => v >= 1000000 ? `$${(v/1000000).toFixed(1)}M` : v >= 1000 ? `$${(v/1000).toFixed(0)}K` : `$${v}`;

// Reps listed individually in the overview breakdown — everyone else rolls into "Other"
const NAMED_REPS = new Set(["Dillon", "Kenny", "Ryan", "Greg", "Julius", "Jonathan", "Dominic", "Trevor", "Cade", "Bryce"]);

type SortField = "name" | "amount" | "lender" | "funded_date" | "rep";
type SortDir = "asc" | "desc";

export default function FundedDealsAudit() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "deals" | "gaps">("overview");
  const [search, setSearch] = useState("");
  const [repFilter, setRepFilter] = useState("all");
  const [lenderFilter, setLenderFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [sortField, setSortField] = useState<SortField>("funded_date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  useEffect(() => {
    fetch("/api/auth/check", { credentials: "include" })
      .then(r => r.json())
      .then(data => { if (data.isAuthenticated) setIsAuthenticated(true); setAuthChecked(true); })
      .catch(() => setAuthChecked(true));
  }, []);

  const { data: report, isLoading } = useQuery<any>({
    queryKey: ["/api/admin/funded-deals-audit"],
    queryFn: async () => {
      const res = await fetch("/api/admin/funded-deals-audit", { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: isAuthenticated,
  });

  const sortedDeals = useMemo(() => {
    if (!report?.deals) return [];
    let list = [...report.deals];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((d: any) =>
        (d.name || "").toLowerCase().includes(q) ||
        (d.lender || "").toLowerCase().includes(q) ||
        (d.rep || "").toLowerCase().includes(q)
      );
    }
    if (repFilter !== "all") list = list.filter((d: any) => d.rep === repFilter);
    if (lenderFilter !== "all") list = list.filter((d: any) => d.lender === lenderFilter);
    if (sourceFilter !== "all") list = list.filter((d: any) => d.source === sourceFilter);
    list.sort((a: any, b: any) => {
      let va = a[sortField] ?? "", vb = b[sortField] ?? "";
      if (sortField === "amount") { va = Number(va); vb = Number(vb); }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [report, search, repFilter, lenderFilter, sourceFilter, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("desc"); }
  };

  if (!authChecked) return <div className="min-h-screen bg-gray-950 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-400" /></div>;
  if (!isAuthenticated) return <LoginForm onLoginSuccess={() => { fetch("/api/auth/check", { credentials: "include" }).then(r => r.json()).then(data => { if (data.isAuthenticated) setIsAuthenticated(true); }); }} />;
  if (isLoading) return <div className="min-h-screen bg-gray-950 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-400" /><span className="ml-3 text-white">Loading audit report...</span></div>;
  if (!report) return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-400">No audit report data available.</div>;

  const s = report.summary;
  const reps = [...new Set((report.deals || []).map((d: any) => d.rep).filter(Boolean))].sort() as string[];
  const lenders = [...new Set((report.deals || []).map((d: any) => d.lender).filter(Boolean))].sort() as string[];
  const sources = [...new Set((report.deals || []).map((d: any) => d.source).filter(Boolean))].sort() as string[];

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2d1b4e] px-6 py-4 border-b border-white/10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard"><Button variant="ghost" size="sm" className="text-white hover:bg-white/10"><ChevronLeft className="w-4 h-4 mr-1" />Dashboard</Button></Link>
            <BarChart3 className="h-6 w-6 text-emerald-400" />
            <div>
              <h1 className="text-lg font-bold">Funded Deals Audit</h1>
              <p className="text-xs text-blue-200">
                {s.total_deals} deals | {fmt$(s.total_amount)} total | {s.date_range[0]} to {s.date_range[1]}
              </p>
            </div>
          </div>
          <div className="text-xs text-gray-400">
            Generated {new Date(report.generated_at).toLocaleDateString()}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="max-w-7xl mx-auto px-6 pt-4">
        <div className="flex gap-1 bg-gray-900 rounded-lg p-1 w-fit">
          {(["overview", "deals", "gaps"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`}
            >
              {tab === "overview" ? "Overview" : tab === "deals" ? "All Deals" : "Data Gaps"}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {activeTab === "overview" && <OverviewTab report={report} />}
        {activeTab === "deals" && (
          <DealsTab
            deals={sortedDeals}
            totalDeals={report.deals?.length || 0}
            search={search}
            setSearch={setSearch}
            repFilter={repFilter}
            setRepFilter={setRepFilter}
            lenderFilter={lenderFilter}
            setLenderFilter={setLenderFilter}
            sourceFilter={sourceFilter}
            setSourceFilter={setSourceFilter}
            reps={reps}
            lenders={lenders}
            sources={sources}
            sortField={sortField}
            sortDir={sortDir}
            toggleSort={toggleSort}
          />
        )}
        {activeTab === "gaps" && <GapsTab report={report} />}
      </div>
    </div>
  );
}

/* ─── OVERVIEW TAB ──────────────────────────────────────────────────────── */

function OverviewTab({ report }: { report: any }) {
  const s = report.summary;

  // Group by_rep: named reps get their own row, everyone else folds into "Other"
  const groupedByRep = (() => {
    const named: any[] = [];
    let otherCount = 0, otherTotal = 0;
    for (const r of (report.by_rep || [])) {
      if (NAMED_REPS.has(r.rep)) {
        named.push(r);
      } else {
        otherCount += r.count;
        otherTotal += r.total;
      }
    }
    if (otherCount > 0) named.push({ rep: "Other", count: otherCount, total: otherTotal, avg: Math.round(otherTotal / otherCount) });
    return named;
  })();

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <StatCard icon={DollarSign} label="Total Volume" value={fmtK(s.total_amount)} color="emerald" />
        <StatCard icon={TrendingUp} label="Total Deals" value={s.total_deals} color="blue" />
        <StatCard icon={Building2} label="Avg Deal Size" value={fmtK(s.avg_deal_size)} color="purple" />
        <StatCard icon={CheckCircle2} label="CLC Match Rate" value={`${s.clc_match_rate}%`} color="amber" sub={`${s.clc_match_count}/${s.total_deals}`} />
        {(s.db_only_count ?? 0) > 0 && (
          <StatCard icon={Database} label="DB-Only Deals" value={s.db_only_count} color="blue" sub="Not in CLC export" />
        )}
      </div>

      {/* Rep Breakdown + Month Trend side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Rep */}
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400" /> By Rep
            </h3>
            <div className="space-y-3">
              {groupedByRep.map((r: any) => {
                const pct = (r.total / s.total_amount) * 100;
                return (
                  <div key={r.rep}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className={r.rep === "Other" ? "text-gray-400 font-medium" : "text-white font-medium"}>{r.rep}</span>
                      <span className="text-gray-400">{r.count} deals | {fmt$(r.total)}</span>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${r.rep === "Other" ? "bg-gray-600" : "bg-gradient-to-r from-blue-500 to-blue-400"}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* By Month */}
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-400" /> Monthly Trend
            </h3>
            <div className="space-y-2">
              {report.by_month.map((m: any) => {
                const maxTotal = Math.max(...report.by_month.map((x: any) => x.total));
                const pct = (m.total / maxTotal) * 100;
                return (
                  <div key={m.month} className="flex items-center gap-3 text-sm">
                    <span className="text-gray-400 w-16 shrink-0">{m.month}</span>
                    <div className="flex-1 h-4 bg-gray-800 rounded overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-gray-300 w-20 text-right shrink-0">{fmtK(m.total)}</span>
                    <span className="text-gray-500 w-8 text-right shrink-0">{m.count}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Source Breakdown - full width */}
      {report.by_source && report.by_source.length > 0 && (
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
              <Globe className="w-4 h-4 text-cyan-400" /> Lead Source Breakdown
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Source derived from GHL tags, lead batch, then contact source. {s.ghl_match_count ? `${s.ghl_match_count}/${s.total_deals} deals matched in GHL (${s.ghl_match_rate}%).` : ""}
            </p>
            <div className="space-y-3">
              {report.by_source.map((src: any) => {
                const pct = (src.total / s.total_amount) * 100;
                const sourceColors: Record<string, string> = {
                  "KDLT": "from-orange-500 to-orange-400",
                  "EGTML": "from-rose-500 to-rose-400",
                  "L4C (Leads4Cash)": "from-blue-500 to-blue-400",
                  "BL (Business Leads)": "from-indigo-500 to-indigo-400",
                  "Full Application Form": "from-emerald-500 to-emerald-400",
                  "Partial Application Form": "from-teal-500 to-teal-400",
                  "Website Lead": "from-green-500 to-green-400",
                  "UCC (Filed Leads)": "from-yellow-500 to-yellow-400",
                  "Manual Dial": "from-violet-500 to-violet-400",
                  "OD (Outbound Dial)": "from-pink-500 to-pink-400",
                  "Fresh Data": "from-lime-500 to-lime-400",
                  "Fox": "from-red-500 to-red-400",
                  "Not in GHL": "from-gray-600 to-gray-500",
                  "Unknown": "from-gray-500 to-gray-400",
                };
                const gradient = sourceColors[src.source] || "from-sky-500 to-sky-400";
                return (
                  <div key={src.source}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-white font-medium">{src.source}</span>
                      <span className="text-gray-400">
                        {src.count} deals | {fmt$(src.total)} | avg {fmtK(src.avg)} | {pct.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r ${gradient} rounded-full transition-all`}
                        style={{ width: `${Math.max(pct, 0.5)}%` }}
                      />
                    </div>
                    {src.deals && src.deals.length > 0 && (
                      <div className="mt-1 ml-2 space-y-0.5">
                        {src.deals.slice(0, 3).map((d: any, i: number) => (
                          <div key={i} className="text-xs text-gray-500">
                            {d.name.slice(0, 30)} — {fmt$(d.amount)} ({d.lender})
                          </div>
                        ))}
                        {src.count > 3 && (
                          <div className="text-xs text-gray-600">+ {src.count - 3} more</div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lender + Deal Size side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Lender - Top 15 */}
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-purple-400" /> Top Lenders
            </h3>
            <div className="space-y-2">
              {report.by_lender.slice(0, 15).map((l: any, i: number) => {
                const maxTotal = report.by_lender[0]?.total || 1;
                const pct = (l.total / maxTotal) * 100;
                return (
                  <div key={l.lender} className="flex items-center gap-3 text-sm">
                    <span className="text-gray-500 w-5 text-right shrink-0">{i + 1}</span>
                    <span className="text-white w-28 shrink-0 truncate">{l.lender}</span>
                    <div className="flex-1 h-3 bg-gray-800 rounded overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-600 to-purple-400 rounded transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-gray-300 w-20 text-right shrink-0">{fmtK(l.total)}</span>
                    <span className="text-gray-500 w-8 text-right shrink-0">{l.count}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Deal Size Distribution */}
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-amber-400" /> Deal Size Distribution
            </h3>
            <div className="space-y-3">
              {report.size_distribution.map((b: any) => {
                const maxCount = Math.max(...report.size_distribution.map((x: any) => x.count));
                const pct = (b.count / maxCount) * 100;
                const colors: Record<string, string> = {
                  "Under $10K": "from-gray-500 to-gray-400",
                  "$10K-$25K": "from-blue-500 to-blue-400",
                  "$25K-$50K": "from-emerald-500 to-emerald-400",
                  "$50K-$100K": "from-purple-500 to-purple-400",
                  "$100K-$250K": "from-amber-500 to-amber-400",
                  "$250K+": "from-red-500 to-red-400",
                };
                return (
                  <div key={b.bracket}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-300">{b.bracket}</span>
                      <span className="text-white font-medium">{b.count} deals</span>
                    </div>
                    <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r ${colors[b.bracket] || "from-blue-500 to-blue-400"} rounded-full transition-all`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ─── DEALS TAB ─────────────────────────────────────────────────────────── */

function DealsTab({
  deals, totalDeals, search, setSearch, repFilter, setRepFilter,
  lenderFilter, setLenderFilter, sourceFilter, setSourceFilter,
  reps, lenders, sources, sortField, sortDir, toggleSort,
}: {
  deals: any[]; totalDeals: number;
  search: string; setSearch: (s: string) => void;
  repFilter: string; setRepFilter: (s: string) => void;
  lenderFilter: string; setLenderFilter: (s: string) => void;
  sourceFilter: string; setSourceFilter: (s: string) => void;
  reps: string[]; lenders: string[]; sources: string[];
  sortField: SortField; sortDir: SortDir; toggleSort: (f: SortField) => void;
}) {
  const [page, setPage] = useState(0);
  const perPage = 30;
  const pages = Math.ceil(deals.length / perPage);
  const visible = deals.slice(page * perPage, (page + 1) * perPage);

  // Reset page on filter change
  useEffect(() => { setPage(0); }, [search, repFilter, lenderFilter, sourceFilter]);

  const SortHeader = ({ field, label, className = "" }: { field: SortField; label: string; className?: string }) => (
    <th
      className={`py-2 px-3 text-left text-xs font-medium text-gray-400 cursor-pointer hover:text-white select-none ${className}`}
      onClick={() => toggleSort(field)}
    >
      <span className="flex items-center gap-1">
        {label}
        {sortField === field ? (
          sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
        ) : (
          <ArrowUpDown className="w-3 h-3 opacity-30" />
        )}
      </span>
    </th>
  );

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search business, lender, or rep..."
            className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
          />
        </div>
        <select
          value={repFilter}
          onChange={e => setRepFilter(e.target.value)}
          className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
        >
          <option value="all">All Reps</option>
          {reps.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select
          value={lenderFilter}
          onChange={e => setLenderFilter(e.target.value)}
          className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
        >
          <option value="all">All Lenders</option>
          {lenders.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
        <select
          value={sourceFilter}
          onChange={e => setSourceFilter(e.target.value)}
          className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
        >
          <option value="all">All Sources</option>
          {sources.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <span className="text-xs text-gray-400">{deals.length} of {totalDeals} deals</span>
      </div>

      {/* Table */}
      <Card className="bg-gray-900 border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-800/50 border-b border-gray-700">
              <tr>
                <SortHeader field="name" label="Business" className="min-w-[200px]" />
                <SortHeader field="amount" label="Amount" />
                <SortHeader field="lender" label="Lender" />
                <SortHeader field="funded_date" label="Funded Date" />
                <SortHeader field="rep" label="Rep" />
                <th className="py-2 px-3 text-left text-xs font-medium text-gray-400">Points</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((d: any, i: number) => (
                <tr key={`${d.name}-${d.funded_date}-${i}`} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                  <td className="py-2.5 px-3 text-white font-medium">
                    <span className="flex items-center gap-1.5">
                      {d.name}
                      {d.source === "db" && (
                        <span title="From database (not in CLC export)">
                          <Database className="w-3 h-3 text-blue-400 shrink-0" />
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-emerald-400 font-mono">{fmt$(d.amount)}</td>
                  <td className="py-2.5 px-3 text-gray-300">{d.lender}</td>
                  <td className="py-2.5 px-3 text-gray-400">{d.funded_date}</td>
                  <td className="py-2.5 px-3">
                    <Badge variant="outline" className="text-xs border-blue-500/30 text-blue-300">{d.rep}</Badge>
                  </td>
                  <td className="py-2.5 px-3 text-gray-400">{d.points ? `${d.points}%` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 bg-gray-800/30 border-t border-gray-700">
            <Button variant="ghost" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)} className="text-gray-300 hover:text-white">Previous</Button>
            <span className="text-xs text-gray-400">Page {page + 1} of {pages}</span>
            <Button variant="ghost" size="sm" disabled={page >= pages - 1} onClick={() => setPage(p => p + 1)} className="text-gray-300 hover:text-white">Next</Button>
          </div>
        )}
      </Card>
    </div>
  );
}

/* ─── GAPS TAB ──────────────────────────────────────────────────────────── */

function GapsTab({ report }: { report: any }) {
  const s = report.summary;
  const notInClc = report.not_in_clc || [];
  const inDbOther = notInClc.filter((d: any) => d.db_status);
  const trulyMissing = notInClc.filter((d: any) => !d.db_status);

  return (
    <div className="space-y-6">
      {/* Gap Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={CheckCircle2} label="In CLC (Funded)" value={s.clc_match_count} color="emerald" sub={`${s.clc_match_rate}% match`} />
        <StatCard icon={AlertTriangle} label="Not in CLC Funded" value={s.not_in_clc_count} color="amber" sub={fmtK(s.not_in_clc_amount)} />
        <StatCard icon={Building2} label="In DB (Other Status)" value={s.in_db_other_status} color="blue" sub="Approval/decline records exist" />
        <StatCard icon={AlertTriangle} label="Truly Missing" value={trulyMissing.length} color="red" sub="No DB record at all" />
      </div>

      {/* In DB as other status */}
      {inDbOther.length > 0 && (
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold text-blue-300 mb-1 flex items-center gap-2">
              <Building2 className="w-4 h-4" /> In Database But Not Marked Funded ({inDbOther.length})
            </h3>
            <p className="text-xs text-gray-500 mb-4">These deals have a CLC record (approval/decline) but the funding entry is missing amounts or the record status is not "funded".</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-700">
                  <tr>
                    <th className="py-2 px-3 text-left text-xs text-gray-400">Business</th>
                    <th className="py-2 px-3 text-left text-xs text-gray-400">Funded Amount</th>
                    <th className="py-2 px-3 text-left text-xs text-gray-400">Lender</th>
                    <th className="py-2 px-3 text-left text-xs text-gray-400">Funded Date</th>
                    <th className="py-2 px-3 text-left text-xs text-gray-400">Rep</th>
                    <th className="py-2 px-3 text-left text-xs text-gray-400">DB Status</th>
                  </tr>
                </thead>
                <tbody>
                  {inDbOther.map((d: any, i: number) => (
                    <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="py-2 px-3 text-white">{d.name}</td>
                      <td className="py-2 px-3 text-emerald-400 font-mono">{fmt$(d.amount)}</td>
                      <td className="py-2 px-3 text-gray-300">{d.lender}</td>
                      <td className="py-2 px-3 text-gray-400">{d.funded_date}</td>
                      <td className="py-2 px-3 text-gray-300">{d.rep}</td>
                      <td className="py-2 px-3">
                        <Badge variant="outline" className={`text-xs ${
                          d.db_status === "approved" ? "border-green-500/30 text-green-300" :
                          d.db_status === "declined" ? "border-red-500/30 text-red-300" :
                          "border-gray-500/30 text-gray-300"
                        }`}>{d.db_status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Truly missing */}
      {trulyMissing.length > 0 && (
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold text-red-300 mb-1 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Not in CLC Database at All ({trulyMissing.length})
            </h3>
            <p className="text-xs text-gray-500 mb-4">These funded deals have no matching record in the CLC database by name or email.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-700">
                  <tr>
                    <th className="py-2 px-3 text-left text-xs text-gray-400">Business</th>
                    <th className="py-2 px-3 text-left text-xs text-gray-400">Funded Amount</th>
                    <th className="py-2 px-3 text-left text-xs text-gray-400">Lender</th>
                    <th className="py-2 px-3 text-left text-xs text-gray-400">Funded Date</th>
                    <th className="py-2 px-3 text-left text-xs text-gray-400">Rep</th>
                  </tr>
                </thead>
                <tbody>
                  {trulyMissing.map((d: any, i: number) => (
                    <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="py-2 px-3 text-white">{d.name}</td>
                      <td className="py-2 px-3 text-emerald-400 font-mono">{fmt$(d.amount)}</td>
                      <td className="py-2 px-3 text-gray-300">{d.lender}</td>
                      <td className="py-2 px-3 text-gray-400">{d.funded_date}</td>
                      <td className="py-2 px-3 text-gray-300">{d.rep}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ─── STAT CARD ─────────────────────────────────────────────────────────── */

function StatCard({ icon: Icon, label, value, color, sub }: {
  icon: any; label: string; value: string | number; color: string; sub?: string;
}) {
  const colors: Record<string, { bg: string; icon: string; border: string }> = {
    emerald: { bg: "rgba(16,185,129,0.08)", icon: "text-emerald-400", border: "border-emerald-500/20" },
    blue: { bg: "rgba(59,130,246,0.08)", icon: "text-blue-400", border: "border-blue-500/20" },
    purple: { bg: "rgba(139,92,246,0.08)", icon: "text-purple-400", border: "border-purple-500/20" },
    amber: { bg: "rgba(245,158,11,0.08)", icon: "text-amber-400", border: "border-amber-500/20" },
    red: { bg: "rgba(239,68,68,0.08)", icon: "text-red-400", border: "border-red-500/20" },
  };
  const c = colors[color] || colors.blue;
  return (
    <Card className={`bg-gray-900 ${c.border} border`} style={{ background: c.bg }}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Icon className={`w-4 h-4 ${c.icon}`} />
          <span className="text-xs text-gray-400">{label}</span>
        </div>
        <div className="text-2xl font-bold text-white">{value}</div>
        {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
      </CardContent>
    </Card>
  );
}
