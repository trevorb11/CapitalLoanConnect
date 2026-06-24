import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoginForm } from "@/components/auth/LoginForm";
import { Link } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MessageSquare, Send, ArrowDownLeft, BarChart3, Loader2, RefreshCw,
  TrendingUp, AlertTriangle, ChevronLeft, CheckCircle2, XCircle,
  Mail, MousePointer, Eye, Globe,
} from "lucide-react";

interface SmsAnalytics {
  period: { days: number; since: string };
  totals: { outbound: number; inbound: number; replyRate: string };
  deliveryStats: { delivered: number; undelivered: number; failed: number; sent: number; queued: number; sampleSize: number };
  campaigns: Array<{ stage: string; send_count: string; unique_recipients: string; first_sent: string; last_sent: string }>;
  dailyVolume: Array<{ date: string; stage: string; count: string }>;
}

const STAGE_LABELS: Record<string, string> = {
  app_abandoned: "App Abandoned",
  approval_congratulations: "Approval Congrats",
  funded_congratulations: "Funded Congrats",
  bank_statements_reminder: "Bank Stmt Reminder",
  approval_stale_reminder: "Stale Approval",
  portal_notification: "Portal Notification",
  outreach: "Outreach",
  unknown: "Other",
  bank_statements_uploaded: "Stmts Uploaded",
  approval_issued: "Approval Issued",
  funded: "Funded",
};

function fmt(n: number | string) {
  return Number(n).toLocaleString();
}

export default function SmsAnalytics() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [days, setDays] = useState(30);

  useEffect(() => {
    fetch("/api/auth/check", { credentials: "include" })
      .then(r => r.json())
      .then(data => {
        if (data.isAuthenticated && data.role === "admin") setIsAuthenticated(true);
        setAuthChecked(true);
      })
      .catch(() => setAuthChecked(true));
  }, []);

  const { data: analytics, isLoading, refetch } = useQuery<SmsAnalytics>({
    queryKey: ["/api/admin/sms/analytics", days],
    queryFn: async () => {
      const res = await fetch(`/api/admin/sms/analytics?days=${days}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load SMS analytics");
      return res.json();
    },
    enabled: isAuthenticated,
  });

  // GHL email campaign stats (historical)
  const { data: ghlStats } = useQuery<any>({
    queryKey: ["/api/admin/email/ghl-stats"],
    queryFn: async () => {
      const res = await fetch("/api/admin/email/ghl-stats", { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: isAuthenticated,
  });

  // Email analytics from Mailgun
  const { data: emailStats, isLoading: emailLoading } = useQuery<any>({
    queryKey: ["/api/admin/email/analytics", days],
    queryFn: async () => {
      const res = await fetch(`/api/admin/email/analytics?days=${days}`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: isAuthenticated,
  });

  const backfillMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/sms/backfill", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days }),
      });
      if (!res.ok) throw new Error("Backfill failed");
      return res.json();
    },
    onSuccess: () => refetch(),
  });

  if (!authChecked) return <div className="min-h-screen bg-gray-950 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-400" /></div>;
  if (!isAuthenticated) return <LoginForm onLoginSuccess={() => {
    fetch("/api/auth/check", { credentials: "include" }).then(r => r.json()).then(data => {
      if (data.isAuthenticated && data.role === "admin") setIsAuthenticated(true);
    });
  }} />;

  const stats = analytics;
  const deliveryRate = stats?.deliveryStats.sampleSize
    ? ((stats.deliveryStats.delivered / stats.deliveryStats.sampleSize) * 100).toFixed(1)
    : "—";

  // Aggregate daily volume into date totals
  const dailyTotals: Record<string, number> = {};
  for (const row of stats?.dailyVolume || []) {
    dailyTotals[row.date] = (dailyTotals[row.date] || 0) + Number(row.count);
  }
  const dailyEntries = Object.entries(dailyTotals).sort(([a], [b]) => b.localeCompare(a)).slice(0, 14);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="bg-[#1e3a5f] px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard"><Button variant="ghost" size="sm" className="text-white hover:bg-white/10"><ChevronLeft className="w-4 h-4 mr-1" />Dashboard</Button></Link>
            <BarChart3 className="h-6 w-6" />
            <div>
              <h1 className="text-lg font-bold">Messaging Analytics</h1>
              <p className="text-xs text-blue-200">SMS campaigns (Twilio) and email performance (Mailgun)</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {[7, 30, 60, 90].map(d => (
              <Button key={d} variant={days === d ? "default" : "outline"} size="sm"
                className={days === d ? "" : "border-white/20 text-white hover:bg-white/10"}
                onClick={() => setDays(d)}>
                {d}d
              </Button>
            ))}
            <Button variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10 ml-2"
              onClick={() => backfillMutation.mutate()} disabled={backfillMutation.isPending}>
              {backfillMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <RefreshCw className="w-4 h-4 mr-1" />}
              Sync History
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
        ) : stats ? (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card className="bg-gray-900 border-gray-800">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1"><Send className="w-4 h-4 text-blue-400" /><span className="text-xs text-gray-500 uppercase">Sent</span></div>
                  <p className="text-2xl font-bold text-white">{fmt(stats.totals.outbound)}</p>
                  <p className="text-xs text-gray-500">outbound messages</p>
                </CardContent>
              </Card>
              <Card className="bg-gray-900 border-gray-800">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1"><ArrowDownLeft className="w-4 h-4 text-green-400" /><span className="text-xs text-gray-500 uppercase">Replies</span></div>
                  <p className="text-2xl font-bold text-white">{fmt(stats.totals.inbound)}</p>
                  <p className="text-xs text-gray-500">inbound replies</p>
                </CardContent>
              </Card>
              <Card className="bg-gray-900 border-gray-800">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1"><TrendingUp className="w-4 h-4 text-teal-400" /><span className="text-xs text-gray-500 uppercase">Reply Rate</span></div>
                  <p className="text-2xl font-bold text-white">{stats.totals.replyRate}</p>
                  <p className="text-xs text-gray-500">inbound / outbound</p>
                </CardContent>
              </Card>
              <Card className="bg-gray-900 border-gray-800">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1"><CheckCircle2 className="w-4 h-4 text-emerald-400" /><span className="text-xs text-gray-500 uppercase">Delivery</span></div>
                  <p className="text-2xl font-bold text-white">{deliveryRate}%</p>
                  <p className="text-xs text-gray-500">
                    {stats.deliveryStats.delivered} delivered / {stats.deliveryStats.sampleSize} sampled
                    {stats.deliveryStats.failed > 0 && <span className="text-red-400 ml-1">({stats.deliveryStats.failed} failed)</span>}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Campaign Breakdown */}
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="p-6">
                <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-blue-400" /> Campaign Breakdown
                </h3>
                {stats.campaigns.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>No campaign data yet. Click "Sync History" to pull from Twilio.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-800">
                          <th className="text-left p-3 text-gray-500">Campaign</th>
                          <th className="text-right p-3 text-gray-500">Messages Sent</th>
                          <th className="text-right p-3 text-gray-500">Unique Recipients</th>
                          <th className="text-left p-3 text-gray-500">First Sent</th>
                          <th className="text-left p-3 text-gray-500">Last Sent</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.campaigns.map(c => (
                          <tr key={c.stage} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                            <td className="p-3">
                              <Badge variant="outline" className="border-gray-700 text-gray-300">
                                {STAGE_LABELS[c.stage] || c.stage}
                              </Badge>
                            </td>
                            <td className="p-3 text-right font-medium text-white">{fmt(c.send_count)}</td>
                            <td className="p-3 text-right text-gray-400">{fmt(c.unique_recipients)}</td>
                            <td className="p-3 text-gray-400 text-xs">{c.first_sent ? new Date(c.first_sent).toLocaleDateString() : "—"}</td>
                            <td className="p-3 text-gray-400 text-xs">{c.last_sent ? new Date(c.last_sent).toLocaleDateString() : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Daily Volume */}
            {dailyEntries.length > 0 && (
              <Card className="bg-gray-900 border-gray-800">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-teal-400" /> Daily Send Volume (last 14 days)
                  </h3>
                  <div className="space-y-1">
                    {dailyEntries.map(([date, count]) => {
                      const maxCount = Math.max(...dailyEntries.map(([, c]) => c));
                      const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
                      return (
                        <div key={date} className="flex items-center gap-3">
                          <span className="text-xs text-gray-500 w-20 shrink-0">
                            {new Date(date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </span>
                          <div className="flex-1 h-5 bg-gray-800 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-teal-500 transition-all duration-500"
                              style={{ width: `${Math.max(pct, 2)}%` }} />
                          </div>
                          <span className="text-xs text-gray-400 w-10 text-right">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Backfill Result */}
            {backfillMutation.data && (
              <Card className="bg-gray-900 border-gray-800">
                <CardContent className="p-4">
                  <p className="text-sm text-green-400 font-medium">
                    Sync complete: {backfillMutation.data.scanned} messages scanned, {backfillMutation.data.inserted} new records added
                  </p>
                  {Object.entries(backfillMutation.data.byCampaign || {}).length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {Object.entries(backfillMutation.data.byCampaign).map(([stage, count]) => (
                        <Badge key={stage} variant="secondary" className="text-xs">
                          {STAGE_LABELS[stage] || stage}: {String(count)}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Delivery Breakdown */}
            {stats.deliveryStats.sampleSize > 0 && (
              <Card className="bg-gray-900 border-gray-800">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Delivery Status (last {stats.deliveryStats.sampleSize} messages)
                  </h3>
                  <div className="grid grid-cols-5 gap-3 text-center">
                    {[
                      { label: "Delivered", value: stats.deliveryStats.delivered, color: "text-emerald-400" },
                      { label: "Sent", value: stats.deliveryStats.sent, color: "text-blue-400" },
                      { label: "Queued", value: stats.deliveryStats.queued, color: "text-gray-400" },
                      { label: "Undelivered", value: stats.deliveryStats.undelivered, color: "text-yellow-400" },
                      { label: "Failed", value: stats.deliveryStats.failed, color: "text-red-400" },
                    ].map(s => (
                      <div key={s.label}>
                        <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                        <p className="text-[10px] text-gray-500 uppercase">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <div className="text-center py-16 text-gray-500">
            <AlertTriangle className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>Failed to load SMS analytics</p>
          </div>
        )}

        {/* ═══ GHL EMAIL CAMPAIGN STATS ═══ */}
        {ghlStats?.totals && (
          <div className="border-t border-gray-800 pt-6 mt-6">
            <div className="flex items-center gap-2 mb-2">
              <Mail className="w-5 h-5 text-orange-400" />
              <h2 className="text-lg font-bold text-white">Email Campaigns (GHL)</h2>
              <Badge variant="outline" className="border-orange-500/30 text-orange-400 text-xs ml-2">{ghlStats.totals.period}</Badge>
            </div>
            <p className="text-xs text-gray-500 mb-5">{ghlStats.totals.campaigns} campaigns across GoHighLevel — {ghlStats.totals.formFills} form submissions attributed to email</p>

            {/* High-level stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
              {[
                { label: "Sent", value: ghlStats.totals.sent, icon: Send, color: "text-blue-400" },
                { label: "Delivered", value: ghlStats.totals.delivered, icon: CheckCircle2, color: "text-emerald-400" },
                { label: "Delivery Rate", value: ghlStats.totals.deliveryRate + "%", icon: CheckCircle2, color: "text-emerald-400", isText: true },
                { label: "Opened", value: ghlStats.totals.opened, icon: Eye, color: "text-purple-400" },
                { label: "Open Rate", value: ghlStats.totals.openRate + "%", icon: TrendingUp, color: "text-purple-400", isText: true },
                { label: "Click Rate", value: ghlStats.totals.clickRate + "%", icon: MousePointer, color: "text-teal-400", isText: true },
                { label: "Form Fills", value: ghlStats.totals.formFills, icon: TrendingUp, color: "text-orange-400" },
              ].map(s => (
                <Card key={s.label} className="bg-gray-900 border-gray-800">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
                      <span className="text-[10px] text-gray-500 uppercase tracking-wide">{s.label}</span>
                    </div>
                    <p className="text-lg font-bold text-white">
                      {(s as any).isText ? s.value : fmt(s.value || 0)}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Key Takeaways */}
            <Card className="bg-gray-900 border-gray-800 mb-6">
              <CardContent className="p-5">
                <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-400" /> Key Takeaways
                </h3>
                <div className="space-y-2 text-sm text-gray-300">
                  <p>&#8226; <strong className="text-white">SBA refinance messaging is the top converter</strong> — the "Pay off your MCA with an SBA" series drove the most form fills across 6+ variants, consistently performing since May.</p>
                  <p>&#8226; <strong className="text-white">Industry-specific emails convert 5-7x better per send</strong> — "Spring - Trucking" got 5 fills from 10K sends (1:2K) vs mass sends at 1:15K+. Targeted beats volume.</p>
                  <p>&#8226; <strong className="text-white">"Curious what you qualify for?" is the best mass-send subject</strong> — 13 fills across 2 versions at 180K+ combined volume. Simple, curiosity-driven copy wins.</p>
                  <p>&#8226; <strong className="text-white">Automated drips are quietly effective</strong> — Trucking Finance Lead Nurture generated 6 fills from a set-and-forget workflow. Healthcare and Restaurant drips show strong open rates (11-15%).</p>
                  <p>&#8226; <strong className="text-white">6.1% overall open rate with 9.3% click-through</strong> — open rate is typical for cold/warm MCA lists; the CTR of openers is strong, meaning the content resonates with those who engage.</p>
                  <p>&#8226; <strong className="text-white">December EOY push was the highest volume month</strong> — 82 campaign sends. "Last Chance EOY" had 83.8% open rate (small retarget list) and 35% CTR.</p>
                </div>
              </CardContent>
            </Card>

            {/* Top Campaigns by Form Fills */}
            {ghlStats.topByFills?.length > 0 && (
              <Card className="bg-gray-900 border-gray-800 mb-6">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-orange-400" /> Top Campaigns by Conversions
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-800">
                          <th className="text-left p-2 text-gray-500">Campaign</th>
                          <th className="text-right p-2 text-gray-500">Fills</th>
                          <th className="text-right p-2 text-gray-500">Sent</th>
                          <th className="text-right p-2 text-gray-500">Opened</th>
                          <th className="text-right p-2 text-gray-500">Open%</th>
                          <th className="text-right p-2 text-gray-500">Clicked</th>
                          <th className="text-right p-2 text-gray-500">CTR</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ghlStats.topByFills.map((c: any) => (
                          <tr key={c.name} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                            <td className="p-2 text-white font-medium max-w-[250px] truncate">{c.name}</td>
                            <td className="p-2 text-right text-orange-400 font-bold">{c.formFills}</td>
                            <td className="p-2 text-right text-gray-300">{fmt(c.sent)}</td>
                            <td className="p-2 text-right text-purple-400">{fmt(c.opened)}</td>
                            <td className="p-2 text-right text-gray-400">{c.openRate}%</td>
                            <td className="p-2 text-right text-teal-400">{fmt(c.clicked)}</td>
                            <td className="p-2 text-right text-gray-400">{c.clickRate}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Top by Open Rate and Click Rate side by side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {ghlStats.topByOpenRate?.length > 0 && (
                <Card className="bg-gray-900 border-gray-800">
                  <CardContent className="p-5">
                    <h3 className="font-semibold text-white mb-3 text-sm flex items-center gap-2">
                      <Eye className="w-4 h-4 text-purple-400" /> Best Open Rates (5K+ sent)
                    </h3>
                    <div className="space-y-2">
                      {ghlStats.topByOpenRate.slice(0, 7).map((c: any) => (
                        <div key={c.name} className="flex items-center justify-between text-sm">
                          <span className="text-gray-300 truncate max-w-[200px]">{c.name}</span>
                          <span className="text-purple-400 font-bold ml-2 shrink-0">{c.openRate}%</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              {ghlStats.topByClickRate?.length > 0 && (
                <Card className="bg-gray-900 border-gray-800">
                  <CardContent className="p-5">
                    <h3 className="font-semibold text-white mb-3 text-sm flex items-center gap-2">
                      <MousePointer className="w-4 h-4 text-teal-400" /> Best Click Rates (500+ opens)
                    </h3>
                    <div className="space-y-2">
                      {ghlStats.topByClickRate.slice(0, 7).map((c: any) => (
                        <div key={c.name} className="flex items-center justify-between text-sm">
                          <span className="text-gray-300 truncate max-w-[200px]">{c.name}</span>
                          <span className="text-teal-400 font-bold ml-2 shrink-0">{c.clickRate}%</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* ═══ EMAIL ANALYTICS (MAILGUN) ═══ */}
        <div className="border-t border-gray-800 pt-6 mt-6">
          <div className="flex items-center gap-2 mb-6">
            <Mail className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-bold text-white">Email Analytics</h2>
            <Badge variant="outline" className="border-purple-500/30 text-purple-400 text-xs ml-2">Mailgun</Badge>
          </div>

          {emailLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
          ) : emailStats?.totals ? (
            <>
              {/* Email Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
                {[
                  { label: "Sent", value: emailStats.totals.accepted, icon: Send, color: "text-blue-400" },
                  { label: "Delivered", value: emailStats.totals.delivered, icon: CheckCircle2, color: "text-emerald-400" },
                  { label: "Opened", value: emailStats.totals.opened, icon: Eye, color: "text-purple-400" },
                  { label: "Clicked", value: emailStats.totals.clicked, icon: MousePointer, color: "text-teal-400" },
                  { label: "Open Rate", value: emailStats.totals.openRate, icon: TrendingUp, color: "text-purple-400", isText: true },
                  { label: "Click Rate", value: emailStats.totals.clickRate, icon: TrendingUp, color: "text-teal-400", isText: true },
                  { label: "Failed", value: emailStats.totals.failed, icon: XCircle, color: "text-red-400" },
                ].map(s => (
                  <Card key={s.label} className="bg-gray-900 border-gray-800">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
                        <span className="text-[10px] text-gray-500 uppercase tracking-wide">{s.label}</span>
                      </div>
                      <p className={`text-lg font-bold text-white`}>
                        {(s as any).isText ? s.value : fmt(s.value || 0)}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Unsubscribes & Complaints */}
              {(emailStats.totals.unsubscribed > 0 || emailStats.totals.complained > 0) && (
                <div className="flex gap-4 mb-6">
                  {emailStats.totals.unsubscribed > 0 && (
                    <Badge variant="outline" className="border-yellow-500/30 text-yellow-400">
                      {emailStats.totals.unsubscribed} unsubscribed
                    </Badge>
                  )}
                  {emailStats.totals.complained > 0 && (
                    <Badge variant="outline" className="border-red-500/30 text-red-400">
                      {emailStats.totals.complained} spam complaints
                    </Badge>
                  )}
                </div>
              )}

              {/* Per-Domain Breakdown */}
              {emailStats.domains && emailStats.domains.length > 0 && (
                <Card className="bg-gray-900 border-gray-800 mb-6">
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                      <Globe className="w-4 h-4 text-purple-400" /> Domain Breakdown
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-800">
                            <th className="text-left p-3 text-gray-500">Domain</th>
                            <th className="text-right p-3 text-gray-500">Sent</th>
                            <th className="text-right p-3 text-gray-500">Delivered</th>
                            <th className="text-right p-3 text-gray-500">Opened</th>
                            <th className="text-right p-3 text-gray-500">Clicked</th>
                            <th className="text-right p-3 text-gray-500">Failed</th>
                            <th className="text-right p-3 text-gray-500">Open Rate</th>
                          </tr>
                        </thead>
                        <tbody>
                          {emailStats.domains.map((d: any) => {
                            const dr = d.totals.delivered > 0 ? ((d.totals.opened / d.totals.delivered) * 100).toFixed(1) : "—";
                            return (
                              <tr key={d.domain} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                                <td className="p-3 font-medium text-white">{d.domain.replace('.todaycapitalgroup.com', '')}</td>
                                <td className="p-3 text-right text-gray-300">{fmt(d.totals.accepted || 0)}</td>
                                <td className="p-3 text-right text-emerald-400">{fmt(d.totals.delivered || 0)}</td>
                                <td className="p-3 text-right text-purple-400">{fmt(d.totals.opened || 0)}</td>
                                <td className="p-3 text-right text-teal-400">{fmt(d.totals.clicked || 0)}</td>
                                <td className="p-3 text-right text-red-400">{d.totals.failed || 0}</td>
                                <td className="p-3 text-right text-gray-300">{dr}%</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Daily Email Volume */}
              {emailStats.domains?.some((d: any) => d.daily?.length > 0) && (
                <Card className="bg-gray-900 border-gray-800">
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-purple-400" /> Daily Email Volume
                    </h3>
                    <div className="space-y-1">
                      {(() => {
                        // Aggregate daily across all domains
                        const dailyMap: Record<string, { delivered: number; opened: number; clicked: number }> = {};
                        for (const d of emailStats.domains || []) {
                          for (const row of d.daily || []) {
                            if (!dailyMap[row.date]) dailyMap[row.date] = { delivered: 0, opened: 0, clicked: 0 };
                            dailyMap[row.date].delivered += row.delivered;
                            dailyMap[row.date].opened += row.opened;
                            dailyMap[row.date].clicked += row.clicked;
                          }
                        }
                        const entries = Object.entries(dailyMap).sort(([a], [b]) => b.localeCompare(a)).slice(0, 14);
                        const maxVal = Math.max(...entries.map(([, v]) => v.delivered), 1);
                        return entries.map(([date, v]) => (
                          <div key={date} className="flex items-center gap-3">
                            <span className="text-xs text-gray-500 w-20 shrink-0">
                              {new Date(date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </span>
                            <div className="flex-1 h-5 bg-gray-800 rounded-full overflow-hidden">
                              <div className="h-full rounded-full bg-gradient-to-r from-purple-600 to-pink-500 transition-all duration-500"
                                style={{ width: `${Math.max((v.delivered / maxVal) * 100, 2)}%` }} />
                            </div>
                            <span className="text-xs text-gray-400 w-16 text-right">{v.delivered} / {v.opened}o</span>
                          </div>
                        ));
                      })()}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Mail className="w-8 h-8 mx-auto mb-3 opacity-30" />
              <p>No email data available for this period</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
