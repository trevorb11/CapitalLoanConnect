import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Trophy, TrendingUp, Banknote, FileText } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface LeaderboardEntry {
  name: string;
  count: number;
  amount: number;
}

interface LeaderboardData {
  applications: LeaderboardEntry[];
  approvals: LeaderboardEntry[];
  funded: LeaderboardEntry[];
}

type LeaderboardView = "applications" | "approvals" | "funded";

const VIEW_CONFIG: Record<LeaderboardView, { label: string; icon: typeof Trophy; metricLabel: string; showAmount: boolean }> = {
  applications: {
    label: "Applications",
    icon: FileText,
    metricLabel: "Apps",
    showAmount: false,
  },
  approvals: {
    label: "Approvals",
    icon: TrendingUp,
    metricLabel: "Volume",
    showAmount: true,
  },
  funded: {
    label: "Funded Deals",
    icon: Banknote,
    metricLabel: "Volume",
    showAmount: true,
  },
};

function formatCurrency(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(0)}K`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function getFirstName(name: string): string {
  return name.split(" ")[0];
}

const BAR_COLORS = [
  "bg-yellow-500",
  "bg-blue-500",
  "bg-emerald-500",
  "bg-purple-500",
  "bg-orange-500",
  "bg-pink-500",
  "bg-cyan-500",
  "bg-red-400",
  "bg-indigo-500",
  "bg-teal-500",
];

export default function Leaderboard() {
  const [activeView, setActiveView] = useState<LeaderboardView>("applications");
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const { data, isLoading } = useQuery<LeaderboardData>({
    queryKey: ["/api/leaderboard"],
    refetchInterval: 30000,
  });

  const config = VIEW_CONFIG[activeView];
  const entries = data?.[activeView] || [];
  const topEntries = entries.slice(0, 10);

  const maxMetric = topEntries.length > 0
    ? Math.max(...topEntries.map((e) => (config.showAmount ? e.amount : e.count)))
    : 1;

  const Icon = config.icon;

  const yAxisSteps = 5;
  const yAxisMax = maxMetric > 0 ? Math.ceil(maxMetric / Math.pow(10, Math.floor(Math.log10(maxMetric || 1)))) * Math.pow(10, Math.floor(Math.log10(maxMetric || 1))) : 10;
  const niceMax = (() => {
    if (maxMetric <= 0) return 10;
    if (!config.showAmount) {
      const raw = Math.ceil(maxMetric * 1.15);
      if (raw <= 5) return raw;
      if (raw <= 10) return Math.ceil(raw / 2) * 2;
      return Math.ceil(raw / 5) * 5;
    }
    const raw = maxMetric * 1.15;
    const magnitude = Math.pow(10, Math.floor(Math.log10(raw)));
    return Math.ceil(raw / magnitude) * magnitude;
  })();

  const yLabels = Array.from({ length: yAxisSteps + 1 }, (_, i) => {
    const val = (niceMax / yAxisSteps) * (yAxisSteps - i);
    return val;
  });

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
              <Trophy className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold" data-testid="text-leaderboard-title">
                Leaderboard
              </h1>
              <p className="text-muted-foreground text-xs sm:text-sm">
                Past 7 days &middot; {currentTime.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </p>
            </div>
          </div>

          <div className="flex gap-1 bg-muted rounded-lg p-1" data-testid="view-toggle">
            {(Object.keys(VIEW_CONFIG) as LeaderboardView[]).map((view) => {
              const vc = VIEW_CONFIG[view];
              const VIcon = vc.icon;
              const isActive = view === activeView;
              return (
                <Button
                  key={view}
                  variant={isActive ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveView(view)}
                  className="text-xs sm:text-sm gap-1.5"
                  data-testid={`button-view-${view}`}
                >
                  <VIcon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{vc.label}</span>
                  <span className="sm:hidden">{vc.label.split(" ")[0]}</span>
                </Button>
              );
            })}
          </div>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
            <div className="flex items-center gap-2">
              <Icon className="w-5 h-5 text-primary" />
              <h2 className="text-base sm:text-lg font-semibold">
                {config.label}
              </h2>
            </div>
            <Badge variant="secondary" className="text-xs">
              {config.showAmount ? "By Volume" : "By Count"}
            </Badge>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <p className="text-muted-foreground text-sm">Loading leaderboard...</p>
              </div>
            ) : topEntries.length === 0 ? (
              <div className="flex items-center justify-center py-16">
                <p className="text-muted-foreground text-sm">No data yet</p>
              </div>
            ) : (
              <div className="flex" data-testid="bar-chart">
                <div className="flex flex-col justify-between pr-2 sm:pr-3 shrink-0" style={{ height: "280px" }}>
                  {yLabels.map((val, i) => (
                    <span key={i} className="text-[10px] sm:text-xs text-muted-foreground text-right min-w-[32px] sm:min-w-[48px] leading-none">
                      {config.showAmount ? formatCurrency(val) : Math.round(val)}
                    </span>
                  ))}
                </div>

                <div className="flex-1 flex flex-col min-w-0">
                  <div
                    className="flex-1 flex items-end gap-1 sm:gap-2 border-l border-b border-border relative"
                    style={{ height: "280px" }}
                  >
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="absolute left-0 right-0 border-t border-border/30"
                        style={{ bottom: `${(i / yAxisSteps) * 100}%` }}
                      />
                    ))}

                    {topEntries.map((entry, index) => {
                      const metric = config.showAmount ? entry.amount : entry.count;
                      const barHeight = niceMax > 0 ? (metric / niceMax) * 100 : 0;
                      const colorClass = BAR_COLORS[index % BAR_COLORS.length];

                      return (
                        <div
                          key={entry.name}
                          className="flex-1 flex flex-col items-center justify-end h-full relative z-10 group"
                          data-testid={`leaderboard-bar-${index}`}
                        >
                          <div className="invisible group-hover:visible absolute -top-8 bg-foreground text-background text-[10px] sm:text-xs px-2 py-1 rounded whitespace-nowrap font-medium z-20">
                            {entry.name}: {config.showAmount ? formatCurrency(entry.amount) : entry.count}
                            {config.showAmount && entry.count > 0 && ` (${entry.count})`}
                          </div>

                          <div className="text-[10px] sm:text-xs font-bold text-foreground mb-1 leading-none">
                            {config.showAmount ? formatCurrency(entry.amount) : entry.count}
                          </div>

                          <div
                            className={`w-full max-w-[60px] ${colorClass} rounded-t-md transition-all duration-700 ease-out`}
                            style={{ height: `${Math.max(barHeight, 2)}%` }}
                          />
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex gap-1 sm:gap-2 border-l border-border">
                    {topEntries.map((entry, index) => (
                      <div key={entry.name} className="flex-1 flex flex-col items-center pt-2">
                        <span
                          className="text-[9px] sm:text-xs text-muted-foreground font-medium truncate max-w-full text-center leading-tight"
                          data-testid={`text-rep-name-${index}`}
                        >
                          {getFirstName(entry.name)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex items-center justify-between text-muted-foreground text-xs px-1">
          <span>Auto-refreshes every 30 seconds</span>
          <span>
            {currentTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
          </span>
        </div>
      </div>
    </div>
  );
}
