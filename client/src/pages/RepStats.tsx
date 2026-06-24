import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  Trophy,
  TrendingUp,
  Phone,
  FileText,
  DollarSign,
  BarChart3,
  ArrowRight,
  Loader2,
  Download,
  CheckCircle2,
} from "lucide-react";

interface RepStat {
  name: string;
  email: string;
  applications_count: number;
  applications_30d: number;
  approvals_count: number;
  approvals_amount: number;
  funded_count: number;
  funded_amount: number;
  total_funded_amount: number;
  decline_count: number;
  calls_total: number;
  calls_30d: number;
  calls_today: number;
  calls_connected: number;
  calls_duration_total: number;
  calls_avg_duration: number;
  conversion_rate: number;
  connect_rate: number;
  score: number;
}

type SortField = "score" | "applications_count" | "approvals_count" | "funded_amount" | "calls_total" | "connect_rate" | "name";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function getScoreColor(score: number): string {
  if (score >= 80) return "#10b981";
  if (score >= 60) return "#14b8a6";
  if (score >= 40) return "#eab308";
  return "#ef4444";
}

function getScoreBgClass(score: number): string {
  if (score >= 80) return "bg-green-500/10 text-green-400 border-green-500/30";
  if (score >= 60) return "bg-teal-500/10 text-teal-400 border-teal-500/30";
  if (score >= 40) return "bg-yellow-500/10 text-yellow-400 border-yellow-500/30";
  return "bg-red-500/10 text-red-400 border-red-500/30";
}

function ScoreCircle({ score, size = 72 }: { score: number; size?: number }) {
  const strokeWidth = size > 60 ? 5 : 4;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const color = getScoreColor(score);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <span
        className="absolute text-sm font-bold"
        style={{ color, fontSize: size > 60 ? "1rem" : "0.75rem" }}
      >
        {score}
      </span>
    </div>
  );
}

export default function RepStats() {
  const [sortField, setSortField] = useState<SortField>("score");
  const [sortAsc, setSortAsc] = useState(false);
  const [showBackfill, setShowBackfill] = useState(false);
  const [backfillFrom, setBackfillFrom] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 3);
    return d.toISOString().slice(0, 10);
  });
  const [backfillTo, setBackfillTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [backfillLoading, setBackfillLoading] = useState(false);
  const [backfillResult, setBackfillResult] = useState<{ inserted: number; byRep: Record<string, number>; errors?: Record<string, string> } | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: reps, isLoading } = useQuery<RepStat[]>({
    queryKey: ["/api/rep-stats"],
    refetchInterval: 60000,
  });

  const handleBackfill = async () => {
    setBackfillLoading(true);
    setBackfillResult(null);
    try {
      const res = await fetch("/api/admin/backfill-zoom-calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ from: backfillFrom, to: backfillTo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Backfill failed");
      setBackfillResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/rep-stats"] });
      toast({ title: `Backfill complete — ${data.inserted} calls imported` });
    } catch (err: any) {
      toast({ title: "Backfill failed", description: err.message, variant: "destructive" });
    } finally {
      setBackfillLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
      </div>
    );
  }

  const repList = reps || [];

  const totalApps = repList.reduce((s, r) => s + r.applications_count, 0);
  const totalApprovals = repList.reduce((s, r) => s + r.approvals_count, 0);
  const totalFundedCount = repList.reduce((s, r) => s + r.funded_count, 0);
  const totalFundedAmount = repList.reduce((s, r) => s + r.total_funded_amount, 0);
  const totalCalls = repList.reduce((s, r) => s + r.calls_total, 0);
  const avgScore = repList.length > 0 ? Math.round(repList.reduce((s, r) => s + r.score, 0) / repList.length) : 0;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const sortedReps = [...repList].sort((a, b) => {
    let aVal: number | string = a[sortField];
    let bVal: number | string = b[sortField];
    if (typeof aVal === "string") {
      return sortAsc ? aVal.localeCompare(bVal as string) : (bVal as string).localeCompare(aVal);
    }
    return sortAsc ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
  });

  const summaryCards = [
    { label: "Total Applications", value: totalApps.toLocaleString(), icon: FileText, color: "text-blue-400" },
    { label: "Total Approvals", value: totalApprovals.toLocaleString(), icon: TrendingUp, color: "text-green-400" },
    { label: "Total Funded", value: `${totalFundedCount} / ${formatCurrency(totalFundedAmount)}`, icon: DollarSign, color: "text-emerald-400" },
    { label: "Total Calls", value: totalCalls.toLocaleString(), icon: Phone, color: "text-purple-400" },
    { label: "Team Avg Score", value: avgScore.toString(), icon: Trophy, color: "text-yellow-400" },
  ];

  const sortIndicator = (field: SortField) => {
    if (sortField !== field) return "";
    return sortAsc ? " \u2191" : " \u2193";
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-500/10 border border-blue-500/30">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Team Performance</h1>
              <p className="text-sm text-gray-400">Rep scorecards and performance metrics</p>
            </div>
          </div>
          <Button
            variant="outline"
            className="border-gray-700 text-gray-300"
            onClick={() => { setShowBackfill(!showBackfill); setBackfillResult(null); }}
            data-testid="button-backfill-toggle"
          >
            <Download className="w-4 h-4 mr-2" />
            Backfill Call History
          </Button>
        </div>

        {/* Backfill Panel */}
        {showBackfill && (
          <Card className="bg-gray-900 border-gray-700">
            <CardContent className="p-5 space-y-4">
              <div>
                <p className="text-sm font-semibold text-white mb-1">Import Historical Zoom Call Logs</p>
                <p className="text-xs text-gray-400">Pulls call logs from the Zoom Phone API for all reps in the directory and inserts them into the database. Safe to re-run — duplicates are ignored.</p>
              </div>
              <div className="flex flex-wrap gap-3 items-end">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">From</label>
                  <input
                    type="date"
                    value={backfillFrom}
                    onChange={e => setBackfillFrom(e.target.value)}
                    className="bg-gray-800 border border-gray-700 text-white text-sm rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    data-testid="input-backfill-from"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">To</label>
                  <input
                    type="date"
                    value={backfillTo}
                    onChange={e => setBackfillTo(e.target.value)}
                    className="bg-gray-800 border border-gray-700 text-white text-sm rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    data-testid="input-backfill-to"
                  />
                </div>
                <Button
                  onClick={handleBackfill}
                  disabled={backfillLoading}
                  data-testid="button-backfill-run"
                  className="bg-blue-600 hover:bg-blue-500 text-white"
                >
                  {backfillLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Importing...</> : "Run Backfill"}
                </Button>
              </div>
              {backfillResult && (
                <div className="bg-gray-800 rounded-md p-4 text-sm space-y-3">
                  <div className="flex items-center gap-2 text-green-400 font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    {backfillResult.inserted} calls imported
                  </div>
                  {Object.keys(backfillResult.byRep).length > 0 && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Imported per rep</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1 text-gray-300">
                        {Object.entries(backfillResult.byRep)
                          .sort((a, b) => b[1] - a[1])
                          .map(([name, count]) => (
                            <div key={name} className="flex justify-between gap-2">
                              <span className="truncate text-gray-400">{name}</span>
                              <span className="font-mono text-white">{count}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                  {backfillResult.errors && Object.keys(backfillResult.errors).length > 0 && (
                    <div>
                      <p className="text-xs text-yellow-500 mb-1">Skipped (no Zoom Phone account or no calls in range)</p>
                      <div className="space-y-0.5">
                        {Object.entries(backfillResult.errors).map(([name, msg]) => (
                          <div key={name} className="text-xs text-gray-500 truncate">
                            <span className="text-gray-400">{name}:</span> {msg}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {summaryCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card key={card.label} className="bg-gray-900 border-gray-800">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`w-4 h-4 ${card.color}`} />
                    <span className="text-xs text-gray-400">{card.label}</span>
                  </div>
                  <p className="text-lg font-bold text-white">{card.value}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Rep Scorecard Grid */}
        {repList.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No rep data available</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {repList
              .sort((a, b) => b.score - a.score)
              .map((rep) => (
                <Card key={rep.name} className="bg-gray-900 border-gray-800 hover:border-gray-700 transition-colors">
                  <CardContent className="p-5">
                    {/* Rep header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-lg font-bold text-white truncate">{rep.name}</h3>
                        <p className="text-xs text-gray-500 truncate">{rep.email}</p>
                      </div>
                      <ScoreCircle score={rep.score} size={64} />
                    </div>

                    {/* Stats grid */}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-gray-400 text-xs">Applications</p>
                        <p className="font-semibold text-white">
                          {rep.applications_count}
                          <span className="text-xs text-gray-500 ml-1">({rep.applications_30d} 30d)</span>
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs">Approvals</p>
                        <p className="font-semibold text-white">
                          {rep.approvals_count}
                          <span className="text-xs text-gray-500 ml-1">{formatCurrency(rep.approvals_amount)}</span>
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs">Funded</p>
                        <p className="font-semibold text-white">
                          {rep.funded_count}
                          <span className="text-xs text-gray-500 ml-1">{formatCurrency(rep.total_funded_amount)}</span>
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs">Calls</p>
                        <p className="font-semibold text-white">
                          {rep.calls_total}
                          <span className="text-xs text-gray-500 ml-1">({rep.calls_30d} 30d · <span className="text-blue-400">{rep.calls_today} today</span>)</span>
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs">Connect Rate</p>
                        <p className="font-semibold text-white">{formatPercent(rep.connect_rate)}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs">Conversion Rate</p>
                        <p className="font-semibold text-white">{formatPercent(rep.conversion_rate)}</p>
                      </div>
                    </div>

                    {/* View Scorecard link */}
                    <Link href={`/admin/rep-stats/${encodeURIComponent(rep.name)}`}>
                      <Button
                        variant="ghost"
                        className="w-full mt-4 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                      >
                        View Scorecard
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
          </div>
        )}

        {/* Leaderboard Table */}
        {repList.length > 0 && (
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-0">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-800">
                <BarChart3 className="w-5 h-5 text-blue-400" />
                <h2 className="text-lg font-semibold text-white">Leaderboard</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800 text-gray-400 text-xs">
                      <th className="text-left px-4 py-3 font-medium">Rank</th>
                      <th
                        className="text-left px-4 py-3 font-medium cursor-pointer hover:text-white"
                        onClick={() => handleSort("name")}
                      >
                        Name{sortIndicator("name")}
                      </th>
                      <th
                        className="text-center px-4 py-3 font-medium cursor-pointer hover:text-white"
                        onClick={() => handleSort("score")}
                      >
                        Score{sortIndicator("score")}
                      </th>
                      <th
                        className="text-center px-4 py-3 font-medium cursor-pointer hover:text-white"
                        onClick={() => handleSort("applications_count")}
                      >
                        Apps{sortIndicator("applications_count")}
                      </th>
                      <th
                        className="text-center px-4 py-3 font-medium cursor-pointer hover:text-white"
                        onClick={() => handleSort("approvals_count")}
                      >
                        Approvals{sortIndicator("approvals_count")}
                      </th>
                      <th
                        className="text-center px-4 py-3 font-medium cursor-pointer hover:text-white"
                        onClick={() => handleSort("funded_amount")}
                      >
                        Funded ($){sortIndicator("funded_amount")}
                      </th>
                      <th
                        className="text-center px-4 py-3 font-medium cursor-pointer hover:text-white"
                        onClick={() => handleSort("calls_total")}
                      >
                        Calls{sortIndicator("calls_total")}
                      </th>
                      <th
                        className="text-center px-4 py-3 font-medium cursor-pointer hover:text-white"
                        onClick={() => handleSort("connect_rate")}
                      >
                        Connect Rate{sortIndicator("connect_rate")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedReps.map((rep, idx) => (
                      <Link key={rep.name} href={`/admin/rep-stats/${encodeURIComponent(rep.name)}`}>
                        <tr className="border-b border-gray-800/50 hover:bg-gray-800/50 cursor-pointer transition-colors">
                          <td className="px-4 py-3 text-gray-400 font-mono">{idx + 1}</td>
                          <td className="px-4 py-3 font-medium text-white">{rep.name}</td>
                          <td className="px-4 py-3 text-center">
                            <Badge className={`${getScoreBgClass(rep.score)} border`}>
                              {rep.score}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-center text-gray-300">{rep.applications_count}</td>
                          <td className="px-4 py-3 text-center text-gray-300">{rep.approvals_count}</td>
                          <td className="px-4 py-3 text-center text-gray-300">{formatCurrency(rep.total_funded_amount)}</td>
                          <td className="px-4 py-3 text-center text-gray-300">{rep.calls_total}</td>
                          <td className="px-4 py-3 text-center text-gray-300">{formatPercent(rep.connect_rate)}</td>
                        </tr>
                      </Link>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
