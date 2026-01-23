import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Search, 
  ExternalLink,
  CheckCircle2,
  FileText,
  Lock,
  LogOut,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Globe,
  Mail,
  MessageSquare,
  Share2
} from "lucide-react";
import { Link } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";

interface LeadSourceData {
  source: string;
  count: number;
  completed: number;
  started: number;
  statements: number;
  conversionRate: string;
  leads: {
    id: string;
    email: string;
    businessName: string | null;
    utmSource: string | null;
    utmMedium: string | null;
    utmCampaign: string | null;
    referrerUrl: string | null;
    isCompleted: boolean;
    hasStatements: boolean;
    createdAt: string | null;
  }[];
}

interface AnalyticsData {
  totalLeads: number;
  sourceStats: LeadSourceData[];
  formTypeBreakdown: Record<string, number>;
  progressionBreakdown: { started: number; completed: number; statements: number };
  timeline: { date: string; count: number }[];
  utmCoverage: {
    withUtmSource: number;
    withReferrer: number;
    withAny: number;
  };
}

interface AuthState {
  isAuthenticated: boolean;
  role?: 'admin' | 'agent';
}

function LoginForm({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  const [credential, setCredential] = useState("");
  const [error, setError] = useState("");

  const loginMutation = useMutation({
    mutationFn: async (cred: string) => {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: cred }),
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Login failed");
      }
      return res.json();
    },
    onSuccess: () => {
      onLoginSuccess();
    },
    onError: (err: any) => {
      setError(err.message || "Invalid credentials");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    loginMutation.mutate(credential);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#192F56] to-[#19112D] p-4">
      <Card className="w-full max-w-md p-8 bg-card/95 backdrop-blur">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Lead Source Analytics</h1>
          <p className="text-muted-foreground text-sm">
            Admin access required
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="password"
            value={credential}
            onChange={(e) => setCredential(e.target.value)}
            placeholder="Enter admin password..."
            className="w-full"
            data-testid="input-login-password"
          />
          {error && <p className="text-destructive text-sm">{error}</p>}
          <Button 
            type="submit" 
            className="w-full"
            disabled={loginMutation.isPending}
            data-testid="button-login-submit"
          >
            {loginMutation.isPending ? "Logging in..." : "Login"}
          </Button>
        </form>
      </Card>
    </div>
  );
}

function getSourceIcon(source: string) {
  const lowerSource = source.toLowerCase();
  if (lowerSource.includes('facebook') || lowerSource.includes('instagram')) {
    return <Share2 className="w-4 h-4" />;
  }
  if (lowerSource.includes('google') || lowerSource.includes('bing')) {
    return <Globe className="w-4 h-4" />;
  }
  if (lowerSource.includes('email') || lowerSource.includes('gmail') || lowerSource.includes('outlook')) {
    return <Mail className="w-4 h-4" />;
  }
  if (lowerSource.includes('sms') || lowerSource.includes('text')) {
    return <MessageSquare className="w-4 h-4" />;
  }
  return <Globe className="w-4 h-4" />;
}

function getSourceColor(source: string): string {
  const lowerSource = source.toLowerCase();
  if (lowerSource.includes('facebook')) return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
  if (lowerSource.includes('instagram')) return 'bg-pink-500/10 text-pink-500 border-pink-500/20';
  if (lowerSource.includes('google')) return 'bg-red-500/10 text-red-500 border-red-500/20';
  if (lowerSource.includes('email') || lowerSource.includes('gmail')) return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
  if (lowerSource.includes('linkedin')) return 'bg-sky-600/10 text-sky-600 border-sky-600/20';
  if (lowerSource.includes('twitter') || lowerSource.includes('x')) return 'bg-slate-600/10 text-slate-600 border-slate-600/20';
  if (lowerSource.includes('ghl') || lowerSource.includes('gohighlevel')) return 'bg-green-500/10 text-green-500 border-green-500/20';
  return 'bg-muted text-muted-foreground';
}

function AnalyticsDashboard() {
  const [expandedSource, setExpandedSource] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: analytics, isLoading, error } = useQuery<AnalyticsData>({
    queryKey: ['/api/analytics/lead-sources'],
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/check'] });
      window.location.reload();
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#192F56] to-[#19112D]">
        <div className="text-white text-center">
          <BarChart3 className="w-12 h-12 mx-auto mb-4 animate-pulse" />
          <p>Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#192F56] to-[#19112D]">
        <Card className="p-8 max-w-md">
          <p className="text-destructive">Failed to load analytics. Please try again.</p>
        </Card>
      </div>
    );
  }

  if (!analytics) return null;

  const filteredSources = analytics.sourceStats.filter(s => 
    s.source.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.leads.some(l => 
      l.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.businessName?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#192F56] to-[#19112D]">
      <header className="bg-[#192F56]/80 backdrop-blur-sm border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="text-white/70 hover:text-white" data-testid="button-back-dashboard">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-primary" />
              <h1 className="text-xl font-bold text-white">Lead Source Analytics</h1>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-white/70 hover:text-white"
            onClick={() => logoutMutation.mutate()}
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 bg-card/95 backdrop-blur">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Leads</p>
                <p className="text-3xl font-bold">{analytics.totalLeads}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
            </div>
          </Card>
          
          <Card className="p-4 bg-card/95 backdrop-blur">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">With UTM Source</p>
                <p className="text-3xl font-bold">{analytics.utmCoverage.withUtmSource}</p>
                <p className="text-xs text-muted-foreground">
                  {((analytics.utmCoverage.withUtmSource / analytics.totalLeads) * 100).toFixed(1)}% coverage
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
            </div>
          </Card>
          
          <Card className="p-4 bg-card/95 backdrop-blur">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">With Referrer URL</p>
                <p className="text-3xl font-bold">{analytics.utmCoverage.withReferrer}</p>
                <p className="text-xs text-muted-foreground">
                  {((analytics.utmCoverage.withReferrer / analytics.totalLeads) * 100).toFixed(1)}% coverage
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Globe className="w-5 h-5 text-blue-500" />
              </div>
            </div>
          </Card>
          
          <Card className="p-4 bg-card/95 backdrop-blur">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Applications Completed</p>
                <p className="text-3xl font-bold">{analytics.progressionBreakdown.completed}</p>
                <p className="text-xs text-muted-foreground">
                  {((analytics.progressionBreakdown.completed / analytics.totalLeads) * 100).toFixed(1)}% completion rate
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-amber-500" />
              </div>
            </div>
          </Card>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by source, email, or business name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-card/95"
            data-testid="input-search-sources"
          />
        </div>

        <Tabs defaultValue="sources" className="space-y-4">
          <TabsList className="bg-card/50">
            <TabsTrigger value="sources" data-testid="tab-sources">By Source</TabsTrigger>
            <TabsTrigger value="formtype" data-testid="tab-formtype">By Form Type</TabsTrigger>
            <TabsTrigger value="timeline" data-testid="tab-timeline">Timeline</TabsTrigger>
          </TabsList>

          <TabsContent value="sources" className="space-y-4">
            {filteredSources.length === 0 ? (
              <Card className="p-8 bg-card/95 text-center">
                <p className="text-muted-foreground">No sources match your search</p>
              </Card>
            ) : (
              filteredSources.map((source) => (
                <Card key={source.source} className="bg-card/95 overflow-hidden">
                  <button
                    onClick={() => setExpandedSource(expandedSource === source.source ? null : source.source)}
                    className="w-full p-4 flex items-center justify-between hover-elevate"
                    data-testid={`button-expand-${source.source.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className={`gap-1 ${getSourceColor(source.source)}`}>
                        {getSourceIcon(source.source)}
                        {source.source}
                      </Badge>
                      <span className="text-2xl font-bold">{source.count}</span>
                      <span className="text-sm text-muted-foreground">leads</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right hidden sm:block">
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-muted-foreground">
                            <span className="text-green-500 font-medium">{source.completed}</span> completed
                          </span>
                          <span className="text-muted-foreground">
                            <span className="text-blue-500 font-medium">{source.statements}</span> statements
                          </span>
                          <span className="text-muted-foreground">
                            <span className="font-medium">{source.conversionRate}%</span> rate
                          </span>
                        </div>
                      </div>
                      {expandedSource === source.source ? (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                  </button>
                  
                  {expandedSource === source.source && (
                    <div className="border-t">
                      <div className="p-4 grid grid-cols-3 gap-4 bg-muted/30 sm:hidden">
                        <div className="text-center">
                          <p className="text-lg font-bold text-green-500">{source.completed}</p>
                          <p className="text-xs text-muted-foreground">Completed</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-blue-500">{source.statements}</p>
                          <p className="text-xs text-muted-foreground">Statements</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold">{source.conversionRate}%</p>
                          <p className="text-xs text-muted-foreground">Conv Rate</p>
                        </div>
                      </div>
                      <div className="max-h-96 overflow-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-muted/50 sticky top-0">
                            <tr>
                              <th className="text-left p-3 font-medium">Email</th>
                              <th className="text-left p-3 font-medium hidden md:table-cell">Business</th>
                              <th className="text-left p-3 font-medium hidden lg:table-cell">UTM Details</th>
                              <th className="text-center p-3 font-medium">Status</th>
                              <th className="text-right p-3 font-medium">Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {source.leads.map((lead) => (
                              <tr key={lead.id} className="border-t hover:bg-muted/20">
                                <td className="p-3">
                                  <Link href={`/dashboard?search=${encodeURIComponent(lead.email)}`}>
                                    <span className="text-primary hover:underline cursor-pointer flex items-center gap-1">
                                      {lead.email}
                                      <ExternalLink className="w-3 h-3" />
                                    </span>
                                  </Link>
                                </td>
                                <td className="p-3 hidden md:table-cell text-muted-foreground">
                                  {lead.businessName || '-'}
                                </td>
                                <td className="p-3 hidden lg:table-cell">
                                  <div className="flex flex-wrap gap-1">
                                    {lead.utmSource && (
                                      <Badge variant="outline" className="text-xs">src: {lead.utmSource}</Badge>
                                    )}
                                    {lead.utmMedium && (
                                      <Badge variant="outline" className="text-xs">med: {lead.utmMedium}</Badge>
                                    )}
                                    {lead.utmCampaign && (
                                      <Badge variant="outline" className="text-xs">cmp: {lead.utmCampaign}</Badge>
                                    )}
                                    {!lead.utmSource && !lead.utmMedium && lead.referrerUrl && (
                                      <span className="text-xs text-muted-foreground truncate max-w-48" title={lead.referrerUrl}>
                                        ref: {lead.referrerUrl}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="p-3 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    {lead.isCompleted && (
                                      <Badge className="bg-green-500/10 text-green-500 text-xs">
                                        <CheckCircle2 className="w-3 h-3 mr-1" />
                                        Complete
                                      </Badge>
                                    )}
                                    {lead.hasStatements && (
                                      <Badge className="bg-blue-500/10 text-blue-500 text-xs">
                                        <FileText className="w-3 h-3 mr-1" />
                                        Stmts
                                      </Badge>
                                    )}
                                    {!lead.isCompleted && !lead.hasStatements && (
                                      <Badge variant="outline" className="text-xs">Started</Badge>
                                    )}
                                  </div>
                                </td>
                                <td className="p-3 text-right text-muted-foreground">
                                  {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="formtype" className="space-y-4">
            <Card className="p-6 bg-card/95">
              <h3 className="text-lg font-semibold mb-4">Leads by Form Type</h3>
              <div className="space-y-3">
                {Object.entries(analytics.formTypeBreakdown)
                  .sort(([, a], [, b]) => b - a)
                  .map(([formType, count]) => {
                    const percentage = (count / analytics.totalLeads) * 100;
                    return (
                      <div key={formType} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span>{formType}</span>
                          <span className="text-muted-foreground">{count} ({percentage.toFixed(1)}%)</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="timeline" className="space-y-4">
            <Card className="p-6 bg-card/95">
              <h3 className="text-lg font-semibold mb-4">Leads Over Time</h3>
              {analytics.timeline.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No timeline data available</p>
              ) : (
                <div className="space-y-2">
                  {analytics.timeline.slice(-30).map(({ date, count }) => {
                    const maxCount = Math.max(...analytics.timeline.map(t => t.count));
                    const percentage = (count / maxCount) * 100;
                    return (
                      <div key={date} className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground w-24 shrink-0">
                          {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                        <div className="flex-1 h-6 bg-muted rounded overflow-hidden">
                          <div 
                            className="h-full bg-primary/70 rounded flex items-center px-2 transition-all"
                            style={{ width: `${Math.max(percentage, 10)}%` }}
                          >
                            <span className="text-xs text-white font-medium">{count}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>

        <Card className="p-6 bg-card/95">
          <h3 className="text-lg font-semibold mb-4">UTM Tracking Coverage</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <p className="text-3xl font-bold text-green-500">{analytics.utmCoverage.withUtmSource}</p>
              <p className="text-sm text-muted-foreground">With explicit UTM source</p>
            </div>
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <p className="text-3xl font-bold text-blue-500">{analytics.utmCoverage.withReferrer}</p>
              <p className="text-sm text-muted-foreground">With referrer URL</p>
            </div>
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <p className="text-3xl font-bold text-amber-500">
                {analytics.totalLeads - analytics.utmCoverage.withAny}
              </p>
              <p className="text-sm text-muted-foreground">No tracking data</p>
            </div>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            To improve tracking coverage, ensure all marketing links include UTM parameters 
            (utm_source, utm_medium, utm_campaign). The system will automatically detect source 
            from referrer URLs when UTM is not available.
          </p>
        </Card>
      </main>
    </div>
  );
}

export default function LeadSourceAnalytics() {
  const { data: authData, isLoading, refetch } = useQuery<AuthState>({
    queryKey: ['/api/auth/check'],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#192F56] to-[#19112D]">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!authData?.isAuthenticated || authData.role !== 'admin') {
    return <LoginForm onLoginSuccess={() => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/check'] });
      refetch();
    }} />;
  }

  return <AnalyticsDashboard />;
}
