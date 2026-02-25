import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Trophy, DollarSign, Hash, Building2, TrendingUp } from "lucide-react";

interface LeaderboardEntry {
  name: string;
  count: number;
  amount: number;
}

interface LeaderboardData {
  applications: LeaderboardEntry[];
  approvals: LeaderboardEntry[];
  funded: LeaderboardEntry[];
  fundedByLender: LeaderboardEntry[];
  totalFundedYTD: number;
  totalFundedUnitsYTD: number;
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(1)}K`;
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

function getFirstName(name: string): string {
  return name.split(" ")[0];
}

const RANK_COLORS = [
  "#FFD700", // gold
  "#C0C0C0", // silver
  "#CD7F32", // bronze
];

// Gauge component for YTD total
function FundingGauge({ value, label }: { value: number; label: string }) {
  // Determine the max for gauge scale
  const targets = [100_000, 250_000, 500_000, 1_000_000, 2_500_000, 5_000_000, 10_000_000, 25_000_000, 50_000_000];
  const maxVal = targets.find((t) => value < t * 0.95) || targets[targets.length - 1];
  const pct = Math.min(value / maxVal, 1);
  // Arc from -135deg to +135deg (270 degree sweep)
  const sweepAngle = 270;
  const startAngle = -225;
  const endAngle = startAngle + sweepAngle;
  const currentAngle = startAngle + pct * sweepAngle;

  const r = 80;
  const cx = 100;
  const cy = 100;

  function polarToCartesian(angleDeg: number) {
    const rad = (angleDeg * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  const arcStart = polarToCartesian(startAngle);
  const arcEnd = polarToCartesian(endAngle);
  const needleEnd = polarToCartesian(currentAngle);

  const largeArc = sweepAngle > 180 ? 1 : 0;

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 200 140" className="w-full max-w-[220px]">
        {/* Background arc */}
        <path
          d={`M ${arcStart.x} ${arcStart.y} A ${r} ${r} 0 ${largeArc} 1 ${arcEnd.x} ${arcEnd.y}`}
          fill="none"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth="14"
          strokeLinecap="round"
        />
        {/* Value arc */}
        {pct > 0 && (
          <path
            d={`M ${arcStart.x} ${arcStart.y} A ${r} ${r} 0 ${pct * sweepAngle > 180 ? 1 : 0} 1 ${needleEnd.x} ${needleEnd.y}`}
            fill="none"
            stroke="url(#gaugeGrad)"
            strokeWidth="14"
            strokeLinecap="round"
          />
        )}
        {/* Needle dot */}
        <circle cx={needleEnd.x} cy={needleEnd.y} r="6" fill="#ffffff" />
        <circle cx={needleEnd.x} cy={needleEnd.y} r="3" fill="#3b82f6" />
        {/* Center label */}
        <text x={cx} y={cy - 4} textAnchor="middle" fill="#ffffff" fontSize="18" fontWeight="700">
          {formatCurrency(value)}
        </text>
        <text x={cx} y={cx + 14} textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="10">
          {label}
        </text>
        {/* Gradient */}
        <defs>
          <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="50%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

export default function Leaderboard() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const { data, isLoading } = useQuery<LeaderboardData>({
    queryKey: ["/api/leaderboard"],
    refetchInterval: 30000,
  });

  const funded = data?.funded || [];
  const fundedByLender = data?.fundedByLender || [];
  const totalFundedYTD = data?.totalFundedYTD || 0;
  const totalFundedUnitsYTD = data?.totalFundedUnitsYTD || 0;

  // Compute weekly totals from funded data
  const weeklyTotal = funded.reduce((sum, e) => sum + e.amount, 0);
  const weeklyUnits = funded.reduce((sum, e) => sum + e.count, 0);

  // Max count for horizontal bar sizing
  const maxCount = funded.length > 0 ? Math.max(...funded.map((e) => e.count)) : 1;

  const BAR_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4", "#f97316", "#ec4899", "#14b8a6", "#6366f1"];

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8" style={{ backgroundColor: "#0f1b2d", color: "#ffffff" }}>
      <div className="max-w-7xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "#1e3a5f", border: "1px solid rgba(255,255,255,0.15)" }}>
              <Trophy className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight" data-testid="text-leaderboard-title">
                Funding This Week Dashboard
              </h1>
              <p className="text-xs sm:text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
                Today Capital Group &middot; Week of {currentTime.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
            <span>Auto-refreshes every 30s</span>
            <span className="px-2 py-1 rounded" style={{ backgroundColor: "rgba(255,255,255,0.08)" }}>
              {currentTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Loading dashboard...</p>
          </div>
        ) : (
          <>
            {/* Top row: Funding $ | Funding Units */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

              {/* Panel 1: Funding $ This Week */}
              <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "#162236", borderColor: "rgba(255,255,255,0.08)" }}>
                <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4" style={{ color: "#10b981" }} />
                    <h2 className="text-sm font-semibold">Funding $ This Week</h2>
                  </div>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded" style={{ backgroundColor: "rgba(16,185,129,0.15)", color: "#10b981" }}>
                    {formatCurrency(weeklyTotal)}
                  </span>
                </div>
                <div className="px-5 py-3 space-y-1">
                  {funded.length === 0 ? (
                    <p className="text-sm py-6 text-center" style={{ color: "rgba(255,255,255,0.3)" }}>No funded deals this week</p>
                  ) : (
                    funded.map((entry, i) => (
                      <div
                        key={entry.name}
                        className="flex items-center justify-between py-2 px-3 rounded-lg"
                        style={{
                          backgroundColor: i < 3 ? "rgba(255,255,255,0.04)" : "transparent",
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                            style={{
                              backgroundColor: i < 3 ? RANK_COLORS[i] : "rgba(255,255,255,0.1)",
                              color: i < 3 ? "#000" : "rgba(255,255,255,0.5)",
                            }}
                          >
                            {i + 1}
                          </span>
                          <span className="text-sm font-medium">{getFirstName(entry.name)}</span>
                        </div>
                        <span className="text-sm font-bold" style={{ color: "#10b981" }}>
                          {formatFullCurrency(entry.amount)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Panel 2: Funding Units This Week */}
              <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "#162236", borderColor: "rgba(255,255,255,0.08)" }}>
                <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                  <div className="flex items-center gap-2">
                    <Hash className="w-4 h-4" style={{ color: "#3b82f6" }} />
                    <h2 className="text-sm font-semibold">Funding Units This Week</h2>
                  </div>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded" style={{ backgroundColor: "rgba(59,130,246,0.15)", color: "#3b82f6" }}>
                    {weeklyUnits} deals
                  </span>
                </div>
                <div className="px-5 py-3 space-y-1">
                  {funded.length === 0 ? (
                    <p className="text-sm py-6 text-center" style={{ color: "rgba(255,255,255,0.3)" }}>No funded deals this week</p>
                  ) : (
                    [...funded]
                      .sort((a, b) => b.count - a.count)
                      .map((entry, i) => (
                        <div key={entry.name} className="flex items-center gap-3 py-1.5">
                          <span className="text-xs font-medium w-16 truncate text-right" style={{ color: "rgba(255,255,255,0.6)" }}>
                            {getFirstName(entry.name)}
                          </span>
                          <div className="flex-1 h-7 rounded relative overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.06)" }}>
                            <div
                              className="h-full rounded transition-all duration-700 ease-out flex items-center"
                              style={{
                                width: `${Math.max((entry.count / maxCount) * 100, 8)}%`,
                                backgroundColor: BAR_COLORS[i % BAR_COLORS.length],
                                minWidth: "32px",
                              }}
                            >
                              <span className="text-[11px] font-bold text-white pl-2">{entry.count}</span>
                            </div>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>

            {/* Bottom row: By Lender | Total YTD */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

              {/* Panel 3: Funding By Lender This Week */}
              <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "#162236", borderColor: "rgba(255,255,255,0.08)" }}>
                <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4" style={{ color: "#f59e0b" }} />
                    <h2 className="text-sm font-semibold">Funding By Lender This Week</h2>
                  </div>
                </div>
                <div className="px-5 py-3 space-y-1">
                  {fundedByLender.length === 0 ? (
                    <p className="text-sm py-6 text-center" style={{ color: "rgba(255,255,255,0.3)" }}>No funded deals this week</p>
                  ) : (
                    fundedByLender.map((entry, i) => (
                      <div key={entry.name} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-white/5 transition-colors">
                        <div className="flex items-center gap-3">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }}
                          />
                          <span className="text-sm font-medium truncate max-w-[200px]">{entry.name}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-xs font-medium px-2 py-0.5 rounded" style={{ backgroundColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }}>
                            {entry.count} {entry.count === 1 ? "deal" : "deals"}
                          </span>
                          <span className="text-sm font-bold" style={{ color: "#f59e0b" }}>
                            {formatCurrency(entry.amount)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Panel 4: Total Funding YTD */}
              <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "#162236", borderColor: "rgba(255,255,255,0.08)" }}>
                <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" style={{ color: "#8b5cf6" }} />
                    <h2 className="text-sm font-semibold">Total Funding YTD</h2>
                  </div>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded" style={{ backgroundColor: "rgba(139,92,246,0.15)", color: "#8b5cf6" }}>
                    {new Date().getFullYear()}
                  </span>
                </div>
                <div className="px-5 py-5 flex flex-col items-center justify-center">
                  <FundingGauge value={totalFundedYTD} label="Year-to-Date" />
                  <div className="flex items-center gap-6 mt-2">
                    <div className="text-center">
                      <p className="text-2xl font-bold" style={{ color: "#8b5cf6" }}>{totalFundedUnitsYTD}</p>
                      <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>Total Deals</p>
                    </div>
                    <div className="w-px h-8" style={{ backgroundColor: "rgba(255,255,255,0.1)" }} />
                    <div className="text-center">
                      <p className="text-2xl font-bold" style={{ color: "#10b981" }}>{formatCurrency(totalFundedYTD)}</p>
                      <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>Total Volume</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Footer */}
        <div className="text-center pt-2">
          <p className="text-xs font-medium tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.2)" }}>
            Funding This Week Dashboard &middot; Today Capital Group
          </p>
        </div>
      </div>
    </div>
  );
}
