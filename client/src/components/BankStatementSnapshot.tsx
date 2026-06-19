import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChevronDown, ChevronUp, BarChart3, AlertTriangle, CheckCircle2, Loader2,
} from "lucide-react";

interface MonthlyData {
  month: string;
  deposits: number;
  avgBalance: number;
  numDeposits: string;
  nsfs: number;
  negativeDays: number;
  endBalance: number | null;
}

interface SnapshotData {
  worthSubmitting: boolean;
  overallScore: number;
  qualificationTier: string;
  avgMonthlyRevenue: number;
  revenueTrend: string;
  avgDailyBalance: number;
  nsfCount: number;
  negativeDays: number;
  existingPositions: Array<{
    funder: string;
    estimatedPayment: string;
    frequency: string;
  }>;
  totalMonthlyDebtPayments: number;
  debtServiceRatio: number;
  summary: string;
  maxRecommendedAdvance: number;
  recommendedProduct: string;
  estimatedFactor: string;
  monthlyData?: MonthlyData[];
  positiveIndicators?: string[];
  redFlags?: Array<{ flag: string; severity: string }>;
}

interface Props {
  email: string;
  compact?: boolean; // If true, show minimal version (just table + key stats)
}

const fmtK = (n: number) => {
  if (!n && n !== 0) return '—';
  if (n >= 1000000) return '$' + (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return '$' + (Math.round(n / 100) / 10) + 'k';
  return '$' + n.toLocaleString();
};

export function BankStatementSnapshot({ email, compact = false }: Props) {
  const [snapshot, setSnapshot] = useState<SnapshotData | null>(null);
  const [ranAt, setRanAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (!expanded || loaded) return;
    setLoading(true);
    fetch(`/api/bank-statements/snapshot/${encodeURIComponent(email)}`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.snapshot) {
          setSnapshot(data.snapshot);
          setRanAt(data.ranAt);
        }
      })
      .catch(() => {})
      .finally(() => { setLoading(false); setLoaded(true); });
  }, [email, expanded, loaded]);

  return (
    <div className="mt-2">
      <button
        onClick={() => setExpanded(prev => !prev)}
        className="text-xs text-blue-600 hover:text-blue-500 font-medium flex items-center gap-1"
      >
        <BarChart3 className="h-3 w-3" />
        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        Bank Statement Analysis
      </button>

      {expanded && (
        <div className="mt-2 rounded-lg border bg-white overflow-hidden">
          {loading && (
            <div className="flex items-center gap-2 text-xs text-gray-400 p-4 justify-center">
              <Loader2 className="h-3 w-3 animate-spin" /> Loading snapshot...
            </div>
          )}

          {loaded && !snapshot && (
            <p className="text-xs text-gray-400 p-4">No AI snapshot available for this file. Run the snapshot from the underwriting portal.</p>
          )}

          {snapshot && (
            <div className="text-sm">
              {/* Score banner */}
              {!compact && (
                <div className={`px-4 py-3 border-b flex items-center justify-between ${snapshot.worthSubmitting ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-lg text-gray-800">{snapshot.overallScore}<span className="text-sm font-normal text-gray-500">/100</span></span>
                    <Badge className={`text-[10px] ${snapshot.worthSubmitting ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
                      {snapshot.worthSubmitting ? "Worth Submitting" : "Do Not Submit"}
                    </Badge>
                  </div>
                  <span className="text-[10px] text-gray-500">{snapshot.qualificationTier}</span>
                </div>
              )}

              {/* Monthly scorecard table */}
              {snapshot.monthlyData && snapshot.monthlyData.length > 0 ? (
                <div className="overflow-x-auto px-4 py-3">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left text-gray-400 pb-1.5 pr-3 font-medium">Statements</th>
                        {snapshot.monthlyData.map((m, i) => (
                          <th key={i} className="text-center text-gray-400 pb-1.5 px-2 font-medium whitespace-nowrap">{m.month}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {([
                        { label: 'Deposits', key: 'deposits', fmt: (v: number) => fmtK(v), redIf: false },
                        { label: 'Avg Balance', key: 'avgBalance', fmt: (v: number) => fmtK(v), redIf: false },
                        { label: '# Deposits', key: 'numDeposits', fmt: (v: string) => String(v), redIf: false },
                        { label: 'NSFs', key: 'nsfs', fmt: (v: number) => String(v), redIf: true },
                        { label: 'Neg Days', key: 'negativeDays', fmt: (v: number) => String(v), redIf: true },
                      ] as const).map(row => (
                        <tr key={row.key} className="border-b border-gray-50 last:border-0">
                          <td className="py-1.5 pr-3 text-gray-400 whitespace-nowrap">{row.label}</td>
                          {snapshot.monthlyData!.map((m, i) => {
                            const val = (m as any)[row.key];
                            const isRed = row.redIf && Number(val) > 0;
                            return (
                              <td key={i} className={`text-center py-1.5 px-2 font-semibold ${isRed ? 'text-red-500' : 'text-gray-800'}`}>
                                {(row.fmt as any)(val)}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* Fallback: key stats grid */
                <div className="grid grid-cols-3 gap-3 px-4 py-3">
                  <div>
                    <p className="text-[10px] text-gray-400">Avg Monthly Revenue</p>
                    <p className="font-semibold text-gray-800">{fmtK(snapshot.avgMonthlyRevenue)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400">Avg Daily Balance</p>
                    <p className="font-semibold text-gray-800">{fmtK(snapshot.avgDailyBalance)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400">NSFs / Neg Days</p>
                    <p className={`font-semibold ${snapshot.nsfCount > 0 ? 'text-red-500' : 'text-gray-800'}`}>
                      {snapshot.nsfCount} / {snapshot.negativeDays}
                    </p>
                  </div>
                </div>
              )}

              {/* Key stats strip */}
              <div className="flex flex-wrap gap-x-4 gap-y-0.5 px-4 py-2 text-xs border-t border-gray-100 bg-gray-50">
                <span>
                  <span className="text-gray-400">Trend: </span>
                  <span className={`font-medium ${snapshot.revenueTrend === 'growing' ? 'text-emerald-600' : snapshot.revenueTrend === 'declining' ? 'text-red-500' : 'text-gray-700'}`} style={{ textTransform: 'capitalize' }}>
                    {snapshot.revenueTrend}
                  </span>
                </span>
                <span>
                  <span className="text-gray-400">Positions: </span>
                  <span className={`font-medium ${snapshot.existingPositions.length > 0 ? 'text-orange-500' : 'text-emerald-600'}`}>
                    {snapshot.existingPositions.length === 0 ? 'None' : snapshot.existingPositions.map(p => p.funder).join(', ')}
                  </span>
                </span>
                {snapshot.maxRecommendedAdvance > 0 && (
                  <span>
                    <span className="text-gray-400">Max Advance: </span>
                    <span className="font-medium text-gray-700">${snapshot.maxRecommendedAdvance.toLocaleString()}</span>
                  </span>
                )}
                <span>
                  <span className="text-gray-400">Product: </span>
                  <span className="font-medium text-gray-700">{snapshot.recommendedProduct}</span>
                </span>
                <span>
                  <span className="text-gray-400">Factor: </span>
                  <span className="font-medium text-gray-700">{snapshot.estimatedFactor}</span>
                </span>
              </div>

              {/* Expandable details */}
              {!compact && (
                <div className="px-4 py-2 border-t border-gray-100">
                  <button
                    onClick={() => setShowDetails(v => !v)}
                    className="text-[10px] text-blue-600 flex items-center gap-1 hover:underline"
                  >
                    {showDetails ? 'Hide details' : 'More details'}
                  </button>
                  {showDetails && (
                    <div className="mt-2 space-y-2 text-xs">
                      {snapshot.summary && (
                        <p className="text-gray-600 leading-relaxed">{snapshot.summary}</p>
                      )}
                      {snapshot.existingPositions.length > 0 && (
                        <div>
                          <p className="font-medium text-gray-700 mb-1">Current Positions:</p>
                          {snapshot.existingPositions.map((pos, i) => (
                            <p key={i} className="text-gray-500">{pos.funder}: {pos.estimatedPayment} ({pos.frequency})</p>
                          ))}
                          {snapshot.totalMonthlyDebtPayments > 0 && (
                            <p className="text-gray-400 mt-0.5">Total: ~${snapshot.totalMonthlyDebtPayments.toLocaleString()}/mo &middot; DSR: {(snapshot.debtServiceRatio * 100).toFixed(0)}%</p>
                          )}
                        </div>
                      )}
                      {snapshot.redFlags && snapshot.redFlags.length > 0 && (
                        <div>
                          <p className="font-medium text-red-700 mb-0.5">Red Flags:</p>
                          {snapshot.redFlags.map((rf, i) => (
                            <div key={i} className="flex items-center gap-1 text-gray-600">
                              <AlertTriangle className={`h-3 w-3 shrink-0 ${rf.severity === 'high' ? 'text-red-500' : rf.severity === 'medium' ? 'text-amber-500' : 'text-gray-400'}`} />
                              <span>{rf.flag}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {snapshot.positiveIndicators && snapshot.positiveIndicators.length > 0 && (
                        <div>
                          <p className="font-medium text-emerald-700 mb-0.5">Positive:</p>
                          {snapshot.positiveIndicators.map((pi, i) => (
                            <div key={i} className="flex items-center gap-1 text-gray-600">
                              <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                              <span>{pi}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Timestamp */}
              {ranAt && (
                <p className="text-[10px] text-gray-400 px-4 pb-2">
                  Analyzed {new Date(ranAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} at {new Date(ranAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
