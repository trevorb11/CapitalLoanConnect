import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { BarChart3, Eye, FileText, TrendingUp, RefreshCw, ArrowLeft, ExternalLink } from "lucide-react";

interface SourceMetric {
  source: string;
  label: string;
  shortUrl: string;
  pageViews: number;
  uniqueSessions: number;
  submissions: number;
  conversions: number;
  conversionRate: number;
}

interface AnalyticsSummary {
  sources: SourceMetric[];
  totals: {
    pageViews: number;
    uniqueSessions: number;
    submissions: number;
    conversions: number;
    conversionRate: number;
  };
  recentEvents: Array<{
    id: string;
    eventType: string;
    source: string | null;
    pagePath: string | null;
    createdAt: string;
  }>;
  lastUpdated: string;
}

export default function AnalyticsDashboard() {
  const [, navigate] = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  // Check authentication
  useEffect(() => {
    fetch("/api/auth/check")
      .then((res) => res.json())
      .then((data) => {
        if (data.isAuthenticated && data.role === "admin") {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      })
      .catch(() => setIsAuthenticated(false));
  }, []);

  const { data, isLoading, error, refetch } = useQuery<AnalyticsSummary>({
    queryKey: ["analytics-summary"],
    queryFn: async () => {
      const res = await fetch("/api/analytics/summary");
      if (!res.ok) {
        if (res.status === 403) {
          throw new Error("Admin access required");
        }
        throw new Error("Failed to fetch analytics");
      }
      return res.json();
    },
    enabled: isAuthenticated === true,
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (isAuthenticated === false) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Admin Access Required</h1>
          <p className="text-gray-600 mb-6">
            Please log in as an admin to view the analytics dashboard.
          </p>
          <button
            onClick={() => navigate("/dashboard")}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate("/dashboard")}
                className="text-gray-500 hover:text-gray-700"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <BarChart3 className="w-6 h-6 text-blue-600" />
                  Intake Source Analytics
                </h1>
                <p className="text-sm text-gray-500">
                  Track performance across different intake sources
                </p>
              </div>
            </div>
            <button
              onClick={() => refetch()}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-600">{error.message}</p>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
          </div>
        ) : data ? (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Eye className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Page Views</p>
                    <p className="text-2xl font-bold text-gray-900">{data.totals.pageViews.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <FileText className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Intake Submissions</p>
                    <p className="text-2xl font-bold text-gray-900">{data.totals.submissions.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Full Applications</p>
                    <p className="text-2xl font-bold text-gray-900">{data.totals.conversions.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-orange-100 rounded-lg">
                    <BarChart3 className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Conversion Rate</p>
                    <p className="text-2xl font-bold text-gray-900">{data.totals.conversionRate}%</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Source Metrics Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Performance by Source</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Source
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        URL
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Page Views
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Sessions
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Submissions
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Conversions
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Conv. Rate
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {data.sources.map((source) => (
                      <tr key={source.source} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-medium text-gray-900">{source.label}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <a
                            href={source.shortUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                          >
                            <code className="text-sm bg-gray-100 px-2 py-1 rounded">{source.shortUrl}</code>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-gray-900">
                          {source.pageViews.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-gray-900">
                          {source.uniqueSessions.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-gray-900">
                          {source.submissions.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-gray-900">
                          {source.conversions.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              source.conversionRate >= 50
                                ? "bg-green-100 text-green-800"
                                : source.conversionRate >= 25
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {source.conversionRate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 font-semibold">
                    <tr>
                      <td className="px-6 py-4 text-gray-900">Total</td>
                      <td className="px-6 py-4"></td>
                      <td className="px-6 py-4 text-right text-gray-900">{data.totals.pageViews.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right text-gray-900">{data.totals.uniqueSessions.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right text-gray-900">{data.totals.submissions.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right text-gray-900">{data.totals.conversions.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          {data.totals.conversionRate}%
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* URL Reference Card */}
            <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Quick URL Reference</h2>
                <p className="text-sm text-gray-500">Use these URLs to track leads from different sources</p>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {data.sources.map((source) => (
                  <div key={source.source} className="border border-gray-200 rounded-lg p-4">
                    <p className="font-medium text-gray-900 mb-2">{source.label}</p>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-500">Short URL:</p>
                      <code className="block text-sm bg-gray-100 px-2 py-1 rounded text-blue-600">
                        {source.shortUrl}
                      </code>
                      <p className="text-sm text-gray-500 mt-2">Full URL:</p>
                      <code className="block text-sm bg-gray-100 px-2 py-1 rounded text-blue-600">
                        /intake/{source.source}
                      </code>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            {data.recentEvents.length > 0 && (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
                </div>
                <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                  {data.recentEvents.map((event) => (
                    <div key={event.id} className="px-6 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            event.eventType === "page_view"
                              ? "bg-blue-100 text-blue-700"
                              : event.eventType === "form_submit"
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {event.eventType}
                        </span>
                        <span className="text-gray-900">{event.source || "unknown"}</span>
                        {event.pagePath && (
                          <span className="text-gray-500 text-sm">{event.pagePath}</span>
                        )}
                      </div>
                      <span className="text-sm text-gray-500">
                        {new Date(event.createdAt).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Last Updated */}
            <p className="text-center text-sm text-gray-500 mt-6">
              Last updated: {new Date(data.lastUpdated).toLocaleString()}
            </p>
          </>
        ) : null}
      </main>
    </div>
  );
}
