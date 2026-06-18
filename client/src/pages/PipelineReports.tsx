import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoginForm } from "@/components/auth/LoginForm";
import {
  BarChart3, FileText, Loader2, ChevronLeft, Shield, LogOut,
  Calendar, Users, TrendingUp, AlertTriangle,
} from "lucide-react";

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

export default function PipelineReports() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [authRole, setAuthRole] = useState("");
  const [repFilter, setRepFilter] = useState("all");
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

  const { data: reports = [], isLoading } = useQuery<ReportSummary[]>({
    queryKey: ["/api/pipeline-reports", repFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (repFilter !== "all") params.set("rep", repFilter);
      params.set("limit", "100");
      const res = await fetch(`/api/pipeline-reports?${params}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: isAuthenticated,
  });

  const { data: fullReport, isLoading: reportLoading } = useQuery<ReportFull>({
    queryKey: ["/api/pipeline-reports", selectedReport],
    queryFn: async () => {
      const res = await fetch(`/api/pipeline-reports/${selectedReport}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load report");
      return res.json();
    },
    enabled: !!selectedReport,
  });

  // Get unique rep names for the filter
  const repNames = [...new Set(reports.map(r => r.rep_name))].sort();

  // Group reports by date
  const reportsByDate = reports.reduce<Record<string, ReportSummary[]>>((acc, r) => {
    const date = r.report_date?.slice(0, 10) || "Unknown";
    if (!acc[date]) acc[date] = [];
    acc[date].push(r);
    return acc;
  }, {});

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    setIsAuthenticated(false);
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginForm onLoginSuccess={() => {
      fetch("/api/auth/check", { credentials: "include" })
        .then(r => r.json())
        .then(data => {
          if (data.isAuthenticated) { setIsAuthenticated(true); setAuthRole(data.role); }
        });
    }} />;
  }

  // Full report view
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
            <div className="flex items-center gap-3 text-sm text-blue-200">
              <span>{fullReport.deal_count} deals</span>
              <span>&middot;</span>
              <span>${Number(fullReport.total_value).toLocaleString()}</span>
            </div>
          </div>
        </div>
        <div className="max-w-4xl mx-auto p-6">
          <div
            className="bg-white rounded-lg shadow-sm border overflow-hidden"
            dangerouslySetInnerHTML={{ __html: fullReport.html_content }}
          />
        </div>
      </div>
    );
  }

  // Report loading
  if (selectedReport && reportLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
      </div>
    );
  }

  // Report list view
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="bg-[#1e3a5f] px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-6 w-6" />
            <div>
              <h1 className="text-lg font-bold">Pipeline Reports</h1>
              <p className="text-xs text-blue-200">Daily and weekly pipeline updates by rep</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Select value={repFilter} onValueChange={setRepFilter}>
              <SelectTrigger className="w-48 bg-white/10 border-white/20 text-white text-sm">
                <SelectValue placeholder="Filter by rep" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Reps</SelectItem>
                {repNames.map(name => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/10" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        )}

        {!isLoading && reports.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No pipeline reports yet</p>
            <p className="text-sm mt-1">Reports will appear here once the Pipeline Monitor runs.</p>
          </div>
        )}

        {Object.entries(reportsByDate).map(([date, dateReports]) => (
          <div key={date}>
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-blue-400" />
              <h2 className="text-sm font-semibold text-gray-400">
                {new Date(date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
              </h2>
              <Badge variant="secondary" className="text-xs">{dateReports.length} report{dateReports.length !== 1 ? "s" : ""}</Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {dateReports.map(report => (
                <Card
                  key={report.id}
                  className="bg-gray-900 border-gray-800 hover:border-gray-700 cursor-pointer transition-colors"
                  onClick={() => setSelectedReport(report.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-white text-sm">{report.rep_name}</h3>
                      <Badge
                        variant="outline"
                        className={report.report_type === "weekly"
                          ? "border-purple-500/30 text-purple-400 text-[10px]"
                          : "border-blue-500/30 text-blue-400 text-[10px]"
                        }
                      >
                        {report.report_type}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-gray-500" />
                        <span className="text-gray-300">{report.deal_count}</span>
                        <span className="text-gray-500 text-xs">deals</span>
                      </div>
                      {report.high_count > 0 && (
                        <div className="flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                          <span className="text-red-400">{report.high_count}</span>
                          <span className="text-gray-500 text-xs">urgent</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1 ml-auto">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400 text-sm font-medium">
                          ${Number(report.total_value).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
