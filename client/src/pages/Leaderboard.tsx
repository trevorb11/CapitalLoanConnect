import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Trophy, TrendingUp, Banknote, FileText } from "lucide-react";

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

const VIEW_CONFIG: Record<LeaderboardView, { label: string; icon: typeof Trophy; showAmount: boolean }> = {
  applications: {
    label: "Applications",
    icon: FileText,
    showAmount: false,
  },
  approvals: {
    label: "Approvals",
    icon: TrendingUp,
    showAmount: true,
  },
  funded: {
    label: "Funded Deals",
    icon: Banknote,
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
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ef4444",
  "#06b6d4",
  "#f97316",
  "#ec4899",
  "#14b8a6",
  "#6366f1",
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
    <div className="min-h-screen p-4 sm:p-6 lg:p-8" style={{ backgroundColor: "#000000", color: "#ffffff" }}>
      <div className="max-w-6xl mx-auto space-y-5 sm:space-y-6">

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 border border-white/20" style={{ backgroundColor: "#1e293b" }}>
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight" data-testid="text-leaderboard-title" style={{ color: "#ffffff" }}>
                  TODAY
                </h1>
                <span className="text-xs sm:text-sm font-medium tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.5)" }}>
                  Capital Group
                </span>
              </div>
              <p className="text-xs sm:text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
                Leaderboard &middot; Past 7 days &middot; {currentTime.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </p>
            </div>
          </div>

          <div className="flex gap-1 rounded-lg p-1" style={{ backgroundColor: "rgba(255,255,255,0.08)" }} data-testid="view-toggle">
            {(Object.keys(VIEW_CONFIG) as LeaderboardView[]).map((view) => {
              const vc = VIEW_CONFIG[view];
              const VIcon = vc.icon;
              const isActive = view === activeView;
              return (
                <button
                  key={view}
                  onClick={() => setActiveView(view)}
                  className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-all"
                  style={{
                    backgroundColor: isActive ? "#1e3a5f" : "transparent",
                    color: isActive ? "#ffffff" : "rgba(255,255,255,0.5)",
                    border: isActive ? "1px solid rgba(255,255,255,0.15)" : "1px solid transparent",
                  }}
                  data-testid={`button-view-${view}`}
                >
                  <VIcon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{vc.label}</span>
                  <span className="sm:hidden">{vc.label.split(" ")[0]}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border" style={{ backgroundColor: "#0a0a0a", borderColor: "rgba(255,255,255,0.1)" }}>
          <div className="flex items-center justify-between gap-2 px-5 sm:px-6 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
            <div className="flex items-center gap-2">
              <Icon className="w-5 h-5" style={{ color: "#60a5fa" }} />
              <h2 className="text-base sm:text-lg font-semibold" style={{ color: "#ffffff" }}>
                {config.label}
              </h2>
            </div>
            <span className="text-[10px] sm:text-xs font-medium px-2.5 py-1 rounded-md" style={{ backgroundColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}>
              {config.showAmount ? "By Volume" : "By Count"}
            </span>
          </div>

          <div className="px-4 sm:px-6 py-5 sm:py-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Loading leaderboard...</p>
              </div>
            ) : topEntries.length === 0 ? (
              <div className="flex items-center justify-center py-16">
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>No data yet</p>
              </div>
            ) : (
              <div className="flex" data-testid="bar-chart">
                <div className="flex flex-col justify-between pr-2 sm:pr-3 shrink-0 h-[280px] sm:h-[400px] lg:h-[520px]">
                  {yLabels.map((val, i) => (
                    <span key={i} className="text-[10px] sm:text-xs text-right min-w-[32px] sm:min-w-[48px] leading-none" style={{ color: "rgba(255,255,255,0.35)" }}>
                      {config.showAmount ? formatCurrency(val) : Math.round(val)}
                    </span>
                  ))}
                </div>

                <div className="flex-1 flex flex-col min-w-0">
                  <div
                    className="flex-1 flex items-end gap-1 sm:gap-3 lg:gap-4 relative h-[280px] sm:h-[400px] lg:h-[520px]"
                    style={{ borderLeft: "1px solid rgba(255,255,255,0.1)", borderBottom: "1px solid rgba(255,255,255,0.1)" }}
                  >
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="absolute left-0 right-0"
                        style={{ bottom: `${(i / yAxisSteps) * 100}%`, borderTop: "1px solid rgba(255,255,255,0.06)" }}
                      />
                    ))}

                    {topEntries.map((entry, index) => {
                      const metric = config.showAmount ? entry.amount : entry.count;
                      const barHeight = niceMax > 0 ? (metric / niceMax) * 100 : 0;
                      const barColor = BAR_COLORS[index % BAR_COLORS.length];

                      return (
                        <div
                          key={entry.name}
                          className="flex-1 flex flex-col items-center justify-end h-full relative z-10 group"
                          data-testid={`leaderboard-bar-${index}`}
                        >
                          <div
                            className="invisible group-hover:visible absolute -top-8 text-[10px] sm:text-xs px-2 py-1 rounded whitespace-nowrap font-medium z-20"
                            style={{ backgroundColor: "#ffffff", color: "#000000" }}
                          >
                            {entry.name}: {config.showAmount ? formatCurrency(entry.amount) : entry.count}
                            {config.showAmount && entry.count > 0 && ` (${entry.count})`}
                          </div>

                          <div className="text-[10px] sm:text-xs font-bold mb-1 leading-none" style={{ color: "#ffffff" }}>
                            {config.showAmount ? formatCurrency(entry.amount) : entry.count}
                          </div>

                          <div
                            className="w-full max-w-[60px] sm:max-w-[72px] lg:max-w-[80px] rounded-t-md transition-all duration-700 ease-out"
                            style={{
                              height: `${Math.max(barHeight, 2)}%`,
                              backgroundColor: barColor,
                              boxShadow: `0 0 20px ${barColor}40`,
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex gap-1 sm:gap-2" style={{ borderLeft: "1px solid rgba(255,255,255,0.1)" }}>
                    {topEntries.map((entry, index) => (
                      <div key={entry.name} className="flex-1 flex flex-col items-center pt-2">
                        <span
                          className="text-[9px] sm:text-xs font-medium truncate max-w-full text-center leading-tight"
                          style={{ color: "rgba(255,255,255,0.5)" }}
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
          </div>
        </div>

        <div className="flex items-center justify-between text-xs px-1" style={{ color: "rgba(255,255,255,0.3)" }}>
          <span>Auto-refreshes every 30 seconds</span>
          <span>
            {currentTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
          </span>
        </div>
      </div>
    </div>
  );
}
