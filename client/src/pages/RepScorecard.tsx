import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  Trophy,
  TrendingUp,
  Phone,
  FileText,
  DollarSign,
  ArrowLeft,
  Target,
  Loader2,
  BarChart3,
  Clock,
  PhoneCall,
  XCircle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface RecentApplication {
  businessName: string;
  email: string;
  createdAt: string;
}

interface RecentApproval {
  businessName: string;
  amount: number;
  lender: string;
  approvalDate: string;
}

interface RecentFunded {
  businessName: string;
  amount: number;
  lender: string;
  fundedDate: string;
}

interface RecentCall {
  calleeNumber: string;
  callerNumber: string;
  duration: number;
  result: string;
  startTime: string;
}

interface MonthlyBreakdown {
  month: string;
  applications: number;
  approvals: number;
  funded: number;
  calls: number;
}

interface RepDetail {
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
  calls_connected: number;
  calls_duration_total: number;
  calls_avg_duration: number;
  conversion_rate: number;
  connect_rate: number;
  score: number;
  recent_applications: RecentApplication[];
  recent_approvals: RecentApproval[];
  recent_funded: RecentFunded[];
  recent_calls: RecentCall[];
  monthly_breakdown: MonthlyBreakdown[];
}

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

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getScoreColor(score: number): string {
  if (score >= 80) return "#10b981";
  if (score >= 60) return "#14b8a6";
  if (score >= 40) return "#eab308";
  return "#ef4444";
}

function ScoreCircle({ score, size = 96 }: { score: number; size?: number }) {
  const strokeWidth = 6;
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
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-bold" style={{ color }}>{score}</span>
        <span className="text-[10px] text-gray-500">/ 100</span>
      </div>
    </div>
  );
}

function ScoreBreakdownBar({ label, earned, max, color }: { label: string; earned: number; max: number; color: string }) {
  const pct = max > 0 ? (earned / max) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-400">{label}</span>
        <span className="text-white font-medium">{earned.toFixed(1)} / {max}</span>
      </div>
      <div className="h-2 rounded-full bg-gray-800 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

// Compute score breakdown from rep stats
function computeScoreBreakdown(rep: RepDetail) {
  const appScore = Math.min((rep.applications_count / 50) * 15, 15);
  const approvalScore = Math.min((rep.approvals_count / 30) * 20, 20);
  const fundedDealsScore = Math.min((rep.funded_count / 20) * 25, 25);
  const fundedVolumeScore = Math.min((rep.total_funded_amount / 500000) * 15, 15);
  const callsScore = Math.min((rep.calls_total / 500) * 15, 15);
  const connectScore = Math.min((rep.connect_rate / 0.5) * 10, 10);

  return [
    { label: "Applications", earned: appScore, max: 15, color: "#3b82f6" },
    { label: "Approvals", earned: approvalScore, max: 20, color: "#10b981" },
    { label: "Funded Deals", earned: fundedDealsScore, max: 25, color: "#14b8a6" },
    { label: "Funded Volume", earned: fundedVolumeScore, max: 15, color: "#8b5cf6" },
    { label: "Calls Made", earned: callsScore, max: 15, color: "#f59e0b" },
    { label: "Connect Rate", earned: connectScore, max: 10, color: "#ec4899" },
  ];
}

export default function RepScorecard() {
  const params = useParams<{ repName: string }>();
  const repName = decodeURIComponent(params.repName || "");

  const { data: rep, isLoading } = useQuery<RepDetail>({
    queryKey: [`/api/rep-stats/${encodeURIComponent(repName)}`],
    enabled: !!repName,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
      </div>
    );
  }

  if (!rep) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center text-white gap-4">
        <p className="text-gray-400">Rep not found</p>
        <Link href="/admin/rep-stats">
          <Button variant="outline" className="border-gray-700 text-gray-300">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Team
          </Button>
        </Link>
      </div>
    );
  }

  const breakdown = computeScoreBreakdown(rep);
  const monthlyData = (rep.monthly_breakdown || []).slice(-6);

  const statCards = [
    { label: "Applications", value: rep.applications_count, sub: `${rep.applications_30d} last 30d`, icon: FileText, color: "text-blue-400" },
    { label: "Approvals", value: rep.approvals_count, sub: formatCurrency(rep.approvals_amount), icon: TrendingUp, color: "text-green-400" },
    { label: "Funded Deals", value: rep.funded_count, sub: formatCurrency(rep.total_funded_amount), icon: DollarSign, color: "text-emerald-400" },
    { label: "Declines", value: rep.decline_count, sub: null, icon: XCircle, color: "text-red-400" },
    { label: "Total Calls", value: rep.calls_total, sub: `${rep.calls_30d} last 30d`, icon: Phone, color: "text-purple-400" },
    { label: "Connected Calls", value: rep.calls_connected, sub: null, icon: PhoneCall, color: "text-indigo-400" },
    { label: "Connect Rate", value: formatPercent(rep.connect_rate), sub: null, icon: Target, color: "text-pink-400" },
    { label: "Total Minutes", value: `${Math.round(rep.calls_duration_total / 60).toLocaleString()} min`, sub: `${(rep.calls_duration_total / 3600).toFixed(1)} hrs`, icon: Clock, color: "text-cyan-400" },
    { label: "Avg Call Duration", value: formatDuration(rep.calls_avg_duration), sub: null, icon: Clock, color: "text-amber-400" },
    { label: "Conversion Rate", value: formatPercent(rep.conversion_rate), sub: null, icon: Trophy, color: "text-yellow-400" },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Back button */}
        <Link href="/admin/rep-stats">
          <Button variant="ghost" className="text-gray-400 hover:text-white -ml-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Team
          </Button>
        </Link>

        {/* Header */}
        <div className="flex items-center gap-5">
          <ScoreCircle score={rep.score} size={96} />
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{rep.name}</h1>
            <p className="text-sm text-gray-400">{rep.email}</p>
          </div>
        </div>

        {/* Score Breakdown */}
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-blue-400" />
              <h2 className="text-lg font-semibold">Score Breakdown</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {breakdown.map((b) => (
                <ScoreBreakdownBar key={b.label} {...b} />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card key={card.label} className="bg-gray-900 border-gray-800">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={`w-4 h-4 ${card.color}`} />
                    <span className="text-xs text-gray-400">{card.label}</span>
                  </div>
                  <p className="text-lg font-bold text-white">{card.value}</p>
                  {card.sub && <p className="text-xs text-gray-500">{card.sub}</p>}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Monthly Performance Chart */}
        {monthlyData.length > 0 && (
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-5">
              <h2 className="text-lg font-semibold mb-4">Monthly Performance</h2>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                    <XAxis dataKey="month" tick={{ fill: "#9ca3af", fontSize: 12 }} />
                    <YAxis tick={{ fill: "#9ca3af", fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1f2937",
                        border: "1px solid #374151",
                        borderRadius: "8px",
                        color: "#fff",
                      }}
                    />
                    <Legend />
                    <Bar dataKey="applications" fill="#3b82f6" name="Applications" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="approvals" fill="#10b981" name="Approvals" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="funded" fill="#14b8a6" name="Funded" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="calls" fill="#8b5cf6" name="Calls" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Activity Tabs */}
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-5">
            <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
            <Tabs defaultValue="applications">
              <TabsList className="bg-gray-800 border-gray-700">
                <TabsTrigger value="applications">Applications</TabsTrigger>
                <TabsTrigger value="approvals">Approvals</TabsTrigger>
                <TabsTrigger value="funded">Funded</TabsTrigger>
                <TabsTrigger value="calls">Calls</TabsTrigger>
              </TabsList>

              <TabsContent value="applications">
                {(!rep.recent_applications || rep.recent_applications.length === 0) ? (
                  <p className="text-sm text-gray-500 py-6 text-center">No recent applications</p>
                ) : (
                  <div className="overflow-x-auto mt-3">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-800 text-gray-400 text-xs">
                          <th className="text-left px-3 py-2 font-medium">Business</th>
                          <th className="text-left px-3 py-2 font-medium">Email</th>
                          <th className="text-left px-3 py-2 font-medium">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rep.recent_applications.map((app, i) => (
                          <tr key={i} className="border-b border-gray-800/50">
                            <td className="px-3 py-2 text-white">{app.businessName}</td>
                            <td className="px-3 py-2 text-gray-400">{app.email}</td>
                            <td className="px-3 py-2 text-gray-400">{formatDate(app.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="approvals">
                {(!rep.recent_approvals || rep.recent_approvals.length === 0) ? (
                  <p className="text-sm text-gray-500 py-6 text-center">No recent approvals</p>
                ) : (
                  <div className="overflow-x-auto mt-3">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-800 text-gray-400 text-xs">
                          <th className="text-left px-3 py-2 font-medium">Business</th>
                          <th className="text-left px-3 py-2 font-medium">Amount</th>
                          <th className="text-left px-3 py-2 font-medium">Lender</th>
                          <th className="text-left px-3 py-2 font-medium">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rep.recent_approvals.map((a, i) => (
                          <tr key={i} className="border-b border-gray-800/50">
                            <td className="px-3 py-2 text-white">{a.businessName}</td>
                            <td className="px-3 py-2 text-green-400">{formatCurrency(a.amount)}</td>
                            <td className="px-3 py-2 text-gray-400">{a.lender}</td>
                            <td className="px-3 py-2 text-gray-400">{formatDate(a.approvalDate)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="funded">
                {(!rep.recent_funded || rep.recent_funded.length === 0) ? (
                  <p className="text-sm text-gray-500 py-6 text-center">No recent funded deals</p>
                ) : (
                  <div className="overflow-x-auto mt-3">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-800 text-gray-400 text-xs">
                          <th className="text-left px-3 py-2 font-medium">Business</th>
                          <th className="text-left px-3 py-2 font-medium">Amount</th>
                          <th className="text-left px-3 py-2 font-medium">Lender</th>
                          <th className="text-left px-3 py-2 font-medium">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rep.recent_funded.map((f, i) => (
                          <tr key={i} className="border-b border-gray-800/50">
                            <td className="px-3 py-2 text-white">{f.businessName}</td>
                            <td className="px-3 py-2 text-emerald-400">{formatCurrency(f.amount)}</td>
                            <td className="px-3 py-2 text-gray-400">{f.lender}</td>
                            <td className="px-3 py-2 text-gray-400">{formatDate(f.fundedDate)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="calls">
                {(!rep.recent_calls || rep.recent_calls.length === 0) ? (
                  <p className="text-sm text-gray-500 py-6 text-center">No recent calls</p>
                ) : (
                  <div className="overflow-x-auto mt-3">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-800 text-gray-400 text-xs">
                          <th className="text-left px-3 py-2 font-medium">To</th>
                          <th className="text-left px-3 py-2 font-medium">From</th>
                          <th className="text-left px-3 py-2 font-medium">Duration</th>
                          <th className="text-left px-3 py-2 font-medium">Result</th>
                          <th className="text-left px-3 py-2 font-medium">Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rep.recent_calls.map((c, i) => (
                          <tr key={i} className="border-b border-gray-800/50">
                            <td className="px-3 py-2 text-white font-mono text-xs">{c.calleeNumber}</td>
                            <td className="px-3 py-2 text-gray-400 font-mono text-xs">{c.callerNumber}</td>
                            <td className="px-3 py-2 text-gray-400">{formatDuration(c.duration)}</td>
                            <td className="px-3 py-2">
                              <Badge
                                variant="outline"
                                className={
                                  c.result === "connected" || c.result === "answered"
                                    ? "border-green-500/30 text-green-400"
                                    : "border-gray-600 text-gray-400"
                                }
                              >
                                {c.result}
                              </Badge>
                            </td>
                            <td className="px-3 py-2 text-gray-400 text-xs">
                              {new Date(c.startTime).toLocaleString("en-US", {
                                month: "short",
                                day: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
