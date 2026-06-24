import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoginForm } from "@/components/auth/LoginForm";
import { Link } from "wouter";
import {
  BarChart3, FileText, Loader2, ChevronLeft, LogOut,
  Calendar, Users, TrendingUp, AlertTriangle, Phone, DollarSign,
  Trophy, ArrowRight, Target,
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

interface ReportSummary {
  id: number;
  rep_name: string;
  rep_email: string | null;
  report_date: string;
  report_type: string;
  deal_count: number;
  high_count: number;
  total_value: string;
  created_at: string;
}

interface ReportFull extends ReportSummary {
  html_content: string;
  deals_data: any;
}

function getScoreColor(score: number): string {
  if (score >= 80) return "#10b981";
  if (score >= 60) return "#14b8a6";
  if (score >= 40) return "#eab308";
  return "#ef4444";
}

function ScoreCircle({ score, size = 56 }: { score: number; size?: number }) {
  const strokeWidth = 4;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const color = getScoreColor(score);
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={strokeWidth} />
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circumference} strokeDashoffset={circumference - progress} strokeLinecap="round"
          className="transition-all duration-700 ease-out" />
      </svg>
      <span className="absolute font-bold" style={{ color, fontSize: size > 50 ? "0.85rem" : "0.7rem" }}>{score}</span>
    </div>
  );
}

function fmt$(v: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);
}

export default function PipelineReports() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [authRole, setAuthRole] = useState("");
  const [selectedRep, setSelectedRep] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/auth/check", { credentials: "include" })
      .then(r => r.json())
      .then(data => {
        if (data.isAuthenticated && (data.role === "admin" || data.role === "underwriting" || data.role === "agent")) {
          setIsAuthenticated(true);
          setAuthRole(data.role);
        }
        setAuthChecked(true);
      })
      .catch(() => setAuthChecked(true));
  }, []);

  // Rep stats
  const { data: reps = [], isLoading: repsLoading } = useQuery<RepStat[]>({
    queryKey: ["/api/rep-stats"],
    enabled: isAuthenticated,
    refetchInterval: 60000,
  });

  // Approval pipeline reports
  const { data: approvalReports = [] } = useQuery<ReportSummary[]>({
    queryKey: ["/api/pipeline-reports", selectedRep],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "50" });
      if (selectedRep) params.set("rep", selectedRep);
      const res = await fetch(`/api/pipeline-reports?${params}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: isAuthenticated && !!selectedRep,
  });

  // GHL pipeline reports
  const { data: ghlReports = [] } = useQuery<any[]>({
    queryKey: ["/api/ghl-pipeline-reports", selectedRep],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedRep) params.set("rep", selectedRep);
      const res = await fetch(`/api/ghl-pipeline-reports?${params}`, { credentials: "include" });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : data ? [data] : [];
    },
    enabled: isAuthenticated && !!selectedRep,
  });

  // GHL full report view
  const [selectedGhlReport, setSelectedGhlReport] = useState<number | null>(null);
  const { data: fullGhlReport, isLoading: ghlReportLoading } = useQuery<any>({
    queryKey: ["/api/ghl-pipeline-reports", selectedGhlReport],
    queryFn: async () => {
      const res = await fetch(`/api/ghl-pipeline-reports/${selectedGhlReport}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load report");
      return res.json();
    },
    enabled: !!selectedGhlReport,
  });

  // Full report view
  const { data: fullReport, isLoading: reportLoading } = useQuery<ReportFull>({
    queryKey: ["/api/pipeline-reports", selectedReport],
    queryFn: async () => {
      const res = await fetch(`/api/pipeline-reports/${selectedReport}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load report");
      return res.json();
    },
    enabled: !!selectedReport,
  });

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    setIsAuthenticated(false);
  };

  if (!authChecked) return <div className="min-h-screen bg-gray-950 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-400" /></div>;

  if (!isAuthenticated) return <LoginForm onLoginSuccess={() => {
    fetch("/api/auth/check", { credentials: "include" }).then(r => r.json()).then(data => {
      if (data.isAuthenticated) { setIsAuthenticated(true); setAuthRole(data.role); }
    });
  }} />;

  // ── GHL FULL REPORT VIEW ──
  if (selectedGhlReport && fullGhlReport) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-[#1e3a5f] text-white px-6 py-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/10" onClick={() => setSelectedGhlReport(null)}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <div>
                <h1 className="text-lg font-bold">{fullGhlReport.rep_name}</h1>
                <p className="text-sm text-blue-200">
                  {new Date(fullGhlReport.report_date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                  {" "}&middot;{" "}{fullGhlReport.pipeline_name} &middot; {fullGhlReport.report_type}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm text-blue-200">
              <span>{fullGhlReport.deal_count} opps</span>
              {fullGhlReport.health_rating && <Badge variant="outline" className="border-white/30 text-white">{fullGhlReport.health_rating}</Badge>}
            </div>
          </div>
        </div>
        <div className="max-w-4xl mx-auto p-6">
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden" dangerouslySetInnerHTML={{ __html: fullGhlReport.html_content }} />
        </div>
      </div>
    );
  }
  if (selectedGhlReport && ghlReportLoading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-400" /></div>;
  }

  // ── FULL REPORT VIEW ──
  if (selectedReport && fullReport) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-[#1e3a5f] text-white px-6 py-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/10" onClick={() => setSelectedReport(null)}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <div>
                <h1 className="text-lg font-bold">{fullReport.rep_name}</h1>
                <p className="text-sm text-blue-200">
                  {new Date(fullReport.report_date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                  {" "}&middot;{" "}{fullReport.report_type === "weekly" ? "Weekly Report" : "Daily Report"}
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="max-w-4xl mx-auto p-6">
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden" dangerouslySetInnerHTML={{ __html: fullReport.html_content }} />
        </div>
      </div>
    );
  }
  if (selectedReport && reportLoading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-400" /></div>;
  }

  // ── REP PROFILE VIEW ──
  if (selectedRep) {
    const rep = reps.find(r => r.name === selectedRep);
    const repApprovalReports = approvalReports.filter(r => r.rep_name === selectedRep);
    const repGhlReports = Array.isArray(ghlReports) ? ghlReports.filter((r: any) => r.rep_name === selectedRep) : [];

    return (
      <div className="min-h-screen bg-gray-950 text-white">
        <div className="bg-[#1e3a5f] px-6 py-4">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/10" onClick={() => setSelectedRep(null)}>
                <ChevronLeft className="h-4 w-4 mr-1" /> All Reps
              </Button>
              <div className="flex items-center gap-3">
                {rep && <ScoreCircle score={rep.score} size={42} />}
                <div>
                  <h1 className="text-lg font-bold">{selectedRep}</h1>
                  <p className="text-xs text-blue-200">{rep?.email || ""}</p>
                </div>
              </div>
            </div>
            <Link href={`/admin/rep-stats/${encodeURIComponent(selectedRep)}`}>
              <Button variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10">
                <Target className="w-4 h-4 mr-1.5" /> Full Scorecard
              </Button>
            </Link>
          </div>
        </div>

        <div className="max-w-5xl mx-auto p-6 space-y-6">
          {/* Quick Stats */}
          {rep && (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              {[
                { label: "Applications", value: rep.applications_count, sub: `${rep.applications_30d} in 30d`, icon: FileText, color: "text-blue-400" },
                { label: "Approvals", value: rep.approvals_count, sub: fmt$(rep.approvals_amount), icon: TrendingUp, color: "text-green-400" },
                { label: "Funded", value: rep.funded_count, sub: fmt$(rep.total_funded_amount), icon: DollarSign, color: "text-emerald-400" },
                { label: "Declines", value: rep.decline_count, sub: "", icon: AlertTriangle, color: "text-red-400" },
                { label: "Total Calls", value: rep.calls_total, sub: `${rep.calls_30d} in 30d`, icon: Phone, color: "text-purple-400" },
                { label: "Connect Rate", value: `${(rep.connect_rate * 100).toFixed(1)}%`, sub: `${rep.calls_connected} connected`, icon: Phone, color: "text-teal-400" },
              ].map(s => (
                <Card key={s.label} className="bg-gray-900 border-gray-800">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
                      <span className="text-[11px] text-gray-500 uppercase tracking-wide">{s.label}</span>
                    </div>
                    <p className="text-xl font-bold text-white">{typeof s.value === "number" ? s.value.toLocaleString() : s.value}</p>
                    {s.sub && <p className="text-[11px] text-gray-500 mt-0.5">{s.sub}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Reports Tabs */}
          <Tabs defaultValue="approval" className="w-full">
            <TabsList className="bg-gray-900 border border-gray-800">
              <TabsTrigger value="approval" className="data-[state=active]:bg-gray-800">
                <BarChart3 className="w-4 h-4 mr-1.5" /> Approval Reports
              </TabsTrigger>
              <TabsTrigger value="ghl" className="data-[state=active]:bg-gray-800">
                <FileText className="w-4 h-4 mr-1.5" /> GHL Pipeline Reports
              </TabsTrigger>
            </TabsList>

            <TabsContent value="approval" className="mt-4">
              {repApprovalReports.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>No approval pipeline reports for {selectedRep} yet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {repApprovalReports.map(report => (
                    <Card key={report.id} className="bg-gray-900 border-gray-800 hover:border-gray-700 cursor-pointer transition-colors" onClick={() => setSelectedReport(report.id)}>
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          <div>
                            <p className="text-sm font-medium text-white">
                              {new Date(report.report_date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                            </p>
                            <p className="text-xs text-gray-500">{report.report_type === "weekly" ? "Weekly" : "Daily"} report</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-gray-300">{report.deal_count} deals</span>
                          {report.high_count > 0 && <span className="text-red-400">{report.high_count} urgent</span>}
                          <span className="text-emerald-400 font-medium">${Number(report.total_value).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                          <ArrowRight className="w-4 h-4 text-gray-600" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="ghl" className="mt-4">
              {repGhlReports.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>No GHL pipeline reports for {selectedRep} yet.</p>
                  <p className="text-xs mt-1">Reports will appear here once the GHL Pipeline Analysis routine runs.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {repGhlReports.map((report: any) => (
                    <Card key={report.id} className="bg-gray-900 border-gray-800 hover:border-gray-700 cursor-pointer transition-colors" onClick={() => setSelectedGhlReport(report.id)}>
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          <div>
                            <p className="text-sm font-medium text-white">
                              {new Date(report.report_date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                            </p>
                            <p className="text-xs text-gray-500">{report.pipeline_name} &middot; {report.report_type}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-gray-300">{report.deal_count} opps</span>
                          {report.stale_count > 0 && <span className="text-red-400">{report.stale_count} stale</span>}
                          {report.health_rating && (
                            <Badge variant="outline" className={
                              report.health_rating === "Critical" ? "border-red-500/30 text-red-400" :
                              report.health_rating === "Needs Cleanup" ? "border-yellow-500/30 text-yellow-400" :
                              "border-green-500/30 text-green-400"
                            }>{report.health_rating}</Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    );
  }

  // ── REP GRID (main view) ──
  const sortedReps = [...reps].sort((a, b) => b.score - a.score);
  const totalFunded = reps.reduce((s, r) => s + r.total_funded_amount, 0);
  const totalApps = reps.reduce((s, r) => s + r.applications_count, 0);
  const avgScore = reps.length > 0 ? Math.round(reps.reduce((s, r) => s + r.score, 0) / reps.length) : 0;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="bg-[#1e3a5f] px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6" />
            <div>
              <h1 className="text-lg font-bold">Rep Hub</h1>
              <p className="text-xs text-blue-200">Performance, reports, and pipeline analytics by rep</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/admin/rep-stats">
              <Button variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10">
                <BarChart3 className="w-4 h-4 mr-1.5" /> Full Leaderboard
              </Button>
            </Link>
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/10" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        {/* Team Summary */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4 flex items-center gap-3">
              <FileText className="w-5 h-5 text-blue-400" />
              <div>
                <p className="text-2xl font-bold">{totalApps.toLocaleString()}</p>
                <p className="text-xs text-gray-500">Total Applications</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4 flex items-center gap-3">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              <div>
                <p className="text-2xl font-bold">{fmt$(totalFunded)}</p>
                <p className="text-xs text-gray-500">Total Funded</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4 flex items-center gap-3">
              <Trophy className="w-5 h-5 text-yellow-400" />
              <div>
                <p className="text-2xl font-bold">{avgScore}</p>
                <p className="text-xs text-gray-500">Avg Team Score</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Rep Grid */}
        {repsLoading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedReps.map(rep => (
              <Card
                key={rep.name}
                className="bg-gray-900 border-gray-800 hover:border-gray-600 cursor-pointer transition-all hover:shadow-lg hover:shadow-black/20"
                onClick={() => setSelectedRep(rep.name)}
              >
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-white text-base">{rep.name}</h3>
                      <p className="text-xs text-gray-500">{rep.email}</p>
                    </div>
                    <ScoreCircle score={rep.score} size={48} />
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-lg font-bold text-white">{rep.applications_count}</p>
                      <p className="text-[10px] text-gray-500 uppercase">Apps</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-emerald-400">{rep.funded_count}</p>
                      <p className="text-[10px] text-gray-500 uppercase">Funded</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-purple-400">{rep.calls_30d}</p>
                      <p className="text-[10px] text-gray-500 uppercase">Calls (30d)</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-800 flex items-center justify-between text-xs text-gray-500">
                    <span>{fmt$(rep.total_funded_amount)} funded</span>
                    <span className="flex items-center gap-1 text-gray-400">
                      View profile <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
