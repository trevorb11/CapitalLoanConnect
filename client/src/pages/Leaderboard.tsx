import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Trophy, TrendingUp, Banknote, FileText, Crown, Medal, Award } from "lucide-react";

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

const VIEW_CONFIG: Record<LeaderboardView, { label: string; icon: typeof Trophy; gradient: string; accentColor: string; metricLabel: string; showAmount: boolean }> = {
  applications: {
    label: "Applications",
    icon: FileText,
    gradient: "from-violet-600 via-purple-600 to-indigo-700",
    accentColor: "text-violet-300",
    metricLabel: "Apps",
    showAmount: false,
  },
  approvals: {
    label: "Approvals",
    icon: TrendingUp,
    gradient: "from-emerald-600 via-green-600 to-teal-700",
    accentColor: "text-emerald-300",
    metricLabel: "Volume",
    showAmount: true,
  },
  funded: {
    label: "Funded Deals",
    icon: Banknote,
    gradient: "from-amber-500 via-orange-600 to-red-600",
    accentColor: "text-amber-300",
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

const RANK_STYLES = [
  { bg: "bg-yellow-500/20", border: "border-yellow-500/50", text: "text-yellow-400", ring: "ring-yellow-500/30" },
  { bg: "bg-slate-300/15", border: "border-slate-400/40", text: "text-slate-300", ring: "ring-slate-400/20" },
  { bg: "bg-amber-700/20", border: "border-amber-600/40", text: "text-amber-500", ring: "ring-amber-600/20" },
];

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Crown className="w-7 h-7 text-yellow-400 drop-shadow-lg" />;
  if (rank === 2) return <Medal className="w-6 h-6 text-slate-300" />;
  if (rank === 3) return <Award className="w-6 h-6 text-amber-600" />;
  return <span className="text-lg font-bold text-white/40 w-7 text-center">{rank}</span>;
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

  return (
    <div className={`min-h-screen bg-gradient-to-br ${config.gradient} transition-all duration-700 flex flex-col`}>
      {/* Header */}
      <header className="px-8 pt-6 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
            <Trophy className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight" data-testid="text-leaderboard-title">
              Today Capital Group
            </h1>
            <p className="text-white/60 text-sm font-medium">
              {currentTime.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            </p>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex bg-black/20 backdrop-blur-sm rounded-xl p-1 gap-1" data-testid="view-toggle">
          {(Object.keys(VIEW_CONFIG) as LeaderboardView[]).map((view) => {
            const vc = VIEW_CONFIG[view];
            const Icon = vc.icon;
            const isActive = view === activeView;
            return (
              <button
                key={view}
                onClick={() => setActiveView(view)}
                className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 flex items-center gap-2 ${
                  isActive
                    ? "bg-white/20 text-white shadow-lg"
                    : "text-white/50 hover:text-white/80"
                }`}
                data-testid={`button-view-${view}`}
              >
                <Icon className="w-4 h-4" />
                {vc.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* Category Label */}
      <div className="px-8 pb-2">
        <div className="flex items-center gap-3">
          {(() => {
            const Icon = config.icon;
            return <Icon className={`w-6 h-6 ${config.accentColor}`} />;
          })()}
          <h2 className="text-xl font-bold text-white/90">
            {config.label} Leaderboard
          </h2>
          <span className="text-white/40 text-sm">
            Ranked by {config.showAmount ? "total dollar volume" : "total count"}
          </span>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 px-8 pb-6 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-pulse text-white/50 text-xl font-semibold">Loading leaderboard...</div>
          </div>
        ) : topEntries.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-white/40 text-xl font-semibold">No data yet</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 h-full auto-rows-fr">
            {topEntries.map((entry, index) => {
              const rank = index + 1;
              const metric = config.showAmount ? entry.amount : entry.count;
              const barWidth = maxMetric > 0 ? (metric / maxMetric) * 100 : 0;
              const isTop3 = rank <= 3;
              const style = RANK_STYLES[index] || { bg: "bg-white/5", border: "border-white/10", text: "text-white/60", ring: "" };

              return (
                <div
                  key={entry.name}
                  className={`relative flex items-center gap-4 px-5 py-3 rounded-xl border backdrop-blur-sm transition-all duration-500 ${
                    isTop3
                      ? `${style.bg} ${style.border} ring-1 ${style.ring}`
                      : "bg-white/5 border-white/10"
                  }`}
                  style={{ animationDelay: `${index * 80}ms` }}
                  data-testid={`leaderboard-row-${index}`}
                >
                  {/* Rank */}
                  <div className="flex items-center justify-center w-10 shrink-0">
                    <RankIcon rank={rank} />
                  </div>

                  {/* Avatar */}
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                      isTop3
                        ? `bg-white/20 ${style.text}`
                        : "bg-white/10 text-white/60"
                    }`}
                  >
                    {getInitials(entry.name)}
                  </div>

                  {/* Name & Bar */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-3 mb-1">
                      <span
                        className={`font-bold truncate ${
                          isTop3 ? "text-white text-lg" : "text-white/80 text-base"
                        }`}
                        data-testid={`text-rep-name-${index}`}
                      >
                        {entry.name}
                      </span>
                      {config.showAmount && entry.count > 0 && (
                        <span className="text-white/30 text-xs font-medium shrink-0">
                          {entry.count} {entry.count === 1 ? "deal" : "deals"}
                        </span>
                      )}
                    </div>
                    {/* Progress Bar */}
                    <div className="h-2 bg-black/20 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ease-out ${
                          rank === 1
                            ? "bg-gradient-to-r from-yellow-400 to-yellow-300"
                            : rank === 2
                            ? "bg-gradient-to-r from-slate-300 to-slate-200"
                            : rank === 3
                            ? "bg-gradient-to-r from-amber-600 to-amber-500"
                            : "bg-white/30"
                        }`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>

                  {/* Metric */}
                  <div className="text-right shrink-0 min-w-[100px]">
                    <div
                      className={`font-extrabold ${
                        isTop3 ? "text-white text-2xl" : "text-white/80 text-xl"
                      }`}
                      data-testid={`text-metric-${index}`}
                    >
                      {config.showAmount ? formatCurrency(entry.amount) : entry.count}
                    </div>
                    {config.showAmount && (
                      <div className="text-white/30 text-xs">
                        {formatFullCurrency(entry.amount)}
                      </div>
                    )}
                    {!config.showAmount && (
                      <div className="text-white/30 text-xs">
                        {config.metricLabel}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="px-8 py-3 flex items-center justify-between border-t border-white/10">
        <span className="text-white/30 text-xs">Auto-refreshes every 30 seconds</span>
        <span className="text-white/30 text-xs">
          {currentTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
        </span>
      </footer>
    </div>
  );
}
