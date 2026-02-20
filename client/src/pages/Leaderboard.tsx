import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Trophy, TrendingUp, Banknote, FileText, Crown, Medal, Award } from "lucide-react";
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

function formatFullCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Crown className="w-6 h-6 text-yellow-500" />;
  if (rank === 2) return <Medal className="w-5 h-5 text-muted-foreground" />;
  if (rank === 3) return <Award className="w-5 h-5 text-amber-600" />;
  return <span className="text-sm font-bold text-muted-foreground w-6 text-center">{rank}</span>;
}

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

  const leader = topEntries[0];
  const maxMetric = leader
    ? config.showAmount
      ? leader.amount
      : leader.count
    : 1;

  const Icon = config.icon;

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
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
                {config.label} Leaderboard
              </h2>
            </div>
            <Badge variant="secondary" className="text-xs">
              {config.showAmount ? "By Volume" : "By Count"}
            </Badge>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <p className="text-muted-foreground text-sm">Loading leaderboard...</p>
              </div>
            ) : topEntries.length === 0 ? (
              <div className="flex items-center justify-center py-16">
                <p className="text-muted-foreground text-sm">No data yet</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {topEntries.map((entry, index) => {
                  const rank = index + 1;
                  const metric = config.showAmount ? entry.amount : entry.count;
                  const barWidth = maxMetric > 0 ? (metric / maxMetric) * 100 : 0;
                  const isTop3 = rank <= 3;

                  return (
                    <div
                      key={entry.name}
                      className={`flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-3 sm:py-4 transition-colors ${
                        isTop3 ? "bg-primary/[0.03]" : ""
                      }`}
                      data-testid={`leaderboard-row-${index}`}
                    >
                      <div className="flex items-center justify-center w-8 shrink-0">
                        <RankIcon rank={rank} />
                      </div>

                      <div
                        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-semibold text-xs sm:text-sm shrink-0 ${
                          rank === 1
                            ? "bg-yellow-500/15 text-yellow-600"
                            : rank === 2
                            ? "bg-muted text-muted-foreground"
                            : rank === 3
                            ? "bg-amber-500/15 text-amber-700"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {getInitials(entry.name)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 mb-1.5">
                          <span
                            className={`font-semibold truncate ${
                              isTop3 ? "text-foreground text-sm sm:text-base" : "text-foreground/80 text-sm"
                            }`}
                            data-testid={`text-rep-name-${index}`}
                          >
                            {entry.name}
                          </span>
                          {config.showAmount && entry.count > 0 && (
                            <span className="text-muted-foreground text-xs shrink-0 hidden sm:inline">
                              {entry.count} {entry.count === 1 ? "deal" : "deals"}
                            </span>
                          )}
                        </div>
                        <div className="h-1.5 bg-black rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ease-out ${
                              rank === 1
                                ? "bg-yellow-500"
                                : rank === 2
                                ? "bg-muted-foreground/40"
                                : rank === 3
                                ? "bg-amber-500"
                                : "bg-primary/30"
                            }`}
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                      </div>

                      <div className="text-right shrink-0 min-w-[60px] sm:min-w-[90px]">
                        <div
                          className={`font-bold ${
                            isTop3 ? "text-foreground text-base sm:text-xl" : "text-foreground/80 text-sm sm:text-lg"
                          }`}
                          data-testid={`text-metric-${index}`}
                        >
                          {config.showAmount ? formatCurrency(entry.amount) : entry.count}
                        </div>
                        {config.showAmount && (
                          <div className="text-muted-foreground text-[10px] sm:text-xs hidden sm:block">
                            {formatFullCurrency(entry.amount)}
                          </div>
                        )}
                        {!config.showAmount && (
                          <div className="text-muted-foreground text-[10px] sm:text-xs">
                            {config.metricLabel}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
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
