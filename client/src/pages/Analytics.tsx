import { useState, useEffect, useRef, useCallback } from "react";

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');

  .analytics * { box-sizing: border-box; margin: 0; padding: 0; }

  .analytics {
    font-family: 'DM Sans', sans-serif;
    background: radial-gradient(ellipse at 20% 0%, rgba(20,184,166,0.06) 0%, transparent 60%),
                #080d18;
    color: #e8eaf0;
    min-height: 100vh;
    padding: 32px 24px 80px;
  }

  .analytics .container { max-width: 1200px; margin: 0 auto; }

  .analytics .header-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 32px;
    flex-wrap: wrap;
    gap: 16px;
  }

  .analytics h1 {
    font-family: 'Syne', sans-serif;
    font-size: 28px;
    font-weight: 700;
    margin-bottom: 4px;
  }

  .analytics .subtitle { color: #7b8499; font-size: 14px; }

  .analytics .date-filter {
    display: flex;
    gap: 4px;
    background: rgba(15,23,41,0.7);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 10px;
    padding: 3px;
  }

  .analytics .date-btn {
    padding: 7px 14px;
    background: none;
    border: none;
    border-radius: 7px;
    color: #7b8499;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
    white-space: nowrap;
  }

  .analytics .date-btn:hover { color: #e8eaf0; }
  .analytics .date-btn.active { background: rgba(45,212,191,0.12); color: #2dd4bf; font-weight: 600; }

  .analytics .kpi-grid {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 12px;
    margin-bottom: 24px;
  }

  .analytics .kpi {
    background: rgba(15,23,41,0.7);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 14px;
    padding: 20px;
    position: relative;
    overflow: hidden;
  }

  .analytics .kpi::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 3px;
    border-radius: 14px 14px 0 0;
  }

  .analytics .kpi.teal::before { background: #14b8a6; }
  .analytics .kpi.blue::before { background: #3b82f6; }
  .analytics .kpi.purple::before { background: #a855f7; }
  .analytics .kpi.amber::before { background: #f59e0b; }
  .analytics .kpi.red::before { background: #ef4444; }
  .analytics .kpi.green::before { background: #22c55e; }

  .analytics .kpi-label { font-size: 11px; color: #7b8499; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px; }
  .analytics .kpi-value { font-family: 'Syne', sans-serif; font-size: 24px; font-weight: 700; }
  .analytics .kpi-sub { font-size: 11px; color: #4b5568; margin-top: 4px; }

  .analytics .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; }

  .analytics .section {
    background: rgba(15,23,41,0.7);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 16px;
    padding: 24px;
    margin-bottom: 24px;
  }

  .analytics .section-title {
    font-family: 'Syne', sans-serif;
    font-size: 15px;
    font-weight: 600;
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 8px;
  }

  .analytics .chart-wrap { position: relative; height: 260px; }

  .analytics .tab-row {
    display: flex;
    gap: 4px;
    background: rgba(255,255,255,0.04);
    border-radius: 8px;
    padding: 3px;
  }

  .analytics .tab-btn {
    padding: 6px 12px;
    background: none;
    border: none;
    border-radius: 6px;
    color: #7b8499;
    font-size: 11px;
    font-weight: 500;
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
    white-space: nowrap;
  }

  .analytics .tab-btn:hover { color: #e8eaf0; }
  .analytics .tab-btn.active { background: rgba(45,212,191,0.1); color: #2dd4bf; font-weight: 600; }

  .analytics .table-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }

  .analytics table { width: 100%; border-collapse: collapse; font-size: 13px; min-width: 600px; }
  .analytics th { text-align: left; padding: 8px 10px; color: #7b8499; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; border-bottom: 1px solid rgba(255,255,255,0.08); white-space: nowrap; }
  .analytics td { padding: 8px 10px; border-bottom: 1px solid rgba(255,255,255,0.04); }
  .analytics tr:hover td { background: rgba(255,255,255,0.02); }

  .analytics .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; }
  .analytics .badge-funded { background: rgba(168,85,247,0.15); color: #a855f7; }
  .analytics .badge-approved { background: rgba(59,130,246,0.15); color: #3b82f6; }
  .analytics .badge-declined { background: rgba(239,68,68,0.15); color: #ef4444; }
  .analytics .badge-unqualified { background: rgba(245,158,11,0.15); color: #f59e0b; }

  .analytics .pipeline-row { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
  .analytics .pipeline-label { min-width: 90px; font-size: 13px; font-weight: 500; }
  .analytics .pipeline-bar { flex: 1; }
  .analytics .bar-bg { height: 28px; background: rgba(255,255,255,0.06); border-radius: 6px; overflow: hidden; position: relative; }
  .analytics .bar-fill { height: 100%; border-radius: 6px; transition: width 0.8s ease; }
  .analytics .bar-label { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); font-size: 11px; font-weight: 600; color: #e8eaf0; }
  .analytics .bar-pct { position: absolute; left: 8px; top: 50%; transform: translateY(-50%); font-size: 10px; font-weight: 500; color: rgba(255,255,255,0.7); }
  .analytics .pipeline-value { min-width: 70px; text-align: right; font-size: 13px; font-weight: 600; }

  .analytics .nav-back {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: #7b8499;
    font-size: 13px;
    text-decoration: none;
    margin-bottom: 16px;
    transition: color 0.2s;
  }

  .analytics .nav-back:hover { color: #2dd4bf; }

  .analytics .loading { text-align: center; padding: 60px 20px; color: #7b8499; }
  .analytics .spinner { width: 28px; height: 28px; border: 3px solid rgba(45,212,191,0.2); border-top-color: #2dd4bf; border-radius: 50%; animation: aspin 0.8s linear infinite; margin: 0 auto 12px; }
  @keyframes aspin { to { transform: rotate(360deg); } }

  @media (max-width: 900px) {
    .analytics .kpi-grid { grid-template-columns: repeat(3, 1fr); }
    .analytics .two-col { grid-template-columns: 1fr; }
  }

  @media (max-width: 640px) {
    .analytics .kpi-grid { grid-template-columns: repeat(2, 1fr); }
    .analytics h1 { font-size: 22px; }
    .analytics { padding: 20px 16px 60px; }
    .analytics .date-filter { overflow-x: auto; }
  }
`;

const fmt$ = (n: number) => `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
const fmtK = (n: number) => n >= 1000000 ? `$${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `$${(n / 1000).toFixed(0)}K` : fmt$(n);

// Canvas bar chart with resize handling and dollar Y-axis option
function BarChart({ data, colors, labels, dollarAxis = false }: { data: number[][]; colors: string[]; labels: string[]; dollarAxis?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);

    const padding = { top: 16, right: 16, bottom: 36, left: dollarAxis ? 65 : 50 };
    const w = rect.width - padding.left - padding.right;
    const h = rect.height - padding.top - padding.bottom;
    const maxVal = Math.max(...data.map(d => d.reduce((s, v) => s + v, 0)), 1);
    const barWidth = Math.min(36, (w / data.length) * 0.6);
    const gap = (w - barWidth * data.length) / (data.length + 1);

    ctx.font = "10px 'DM Sans', sans-serif";
    ctx.fillStyle = "#4b5568";
    ctx.textAlign = "right";
    for (let i = 0; i <= 4; i++) {
      const val = (maxVal / 4) * i;
      const y = padding.top + h - (h * (i / 4));
      const label = dollarAxis ? (val >= 1000000 ? `$${(val/1000000).toFixed(1)}M` : val >= 1000 ? `$${(val/1000).toFixed(0)}K` : `$${val.toFixed(0)}`) : (val >= 1000 ? `${(val/1000).toFixed(0)}K` : val.toFixed(0));
      ctx.fillText(label, padding.left - 8, y + 3);
      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + w, y);
      ctx.stroke();
    }

    data.forEach((stack, i) => {
      const x = padding.left + gap + i * (barWidth + gap);
      let yOffset = 0;
      stack.forEach((val, si) => {
        const barH = (val / maxVal) * h;
        if (barH < 1) return;
        ctx.fillStyle = colors[si] || "#2dd4bf";
        const r = Math.min(4, barH / 2);
        ctx.beginPath();
        ctx.moveTo(x + r, padding.top + h - yOffset - barH);
        ctx.lineTo(x + barWidth - r, padding.top + h - yOffset - barH);
        ctx.quadraticCurveTo(x + barWidth, padding.top + h - yOffset - barH, x + barWidth, padding.top + h - yOffset - barH + r);
        ctx.lineTo(x + barWidth, padding.top + h - yOffset);
        ctx.lineTo(x, padding.top + h - yOffset);
        ctx.lineTo(x, padding.top + h - yOffset - barH + r);
        ctx.quadraticCurveTo(x, padding.top + h - yOffset - barH, x + r, padding.top + h - yOffset - barH);
        ctx.fill();
        yOffset += barH;
      });

      if (labels[i]) {
        ctx.fillStyle = "#4b5568";
        ctx.textAlign = "center";
        ctx.font = "10px 'DM Sans', sans-serif";
        ctx.fillText(labels[i], x + barWidth / 2, padding.top + h + 18);
      }
    });
  }, [data, colors, labels, dollarAxis]);

  useEffect(() => { draw(); }, [draw]);
  useEffect(() => {
    const handler = () => draw();
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [draw]);

  return <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />;
}

type DateRange = "week" | "month" | "quarter" | "ytd" | "all";

export default function Analytics() {
  const [overview, setOverview] = useState<any>(null);
  const [timeline, setTimeline] = useState<any>(null);
  const [reps, setReps] = useState<any[]>([]);
  const [lenders, setLenders] = useState<any[]>([]);
  const [recent, setRecent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timelineView, setTimelineView] = useState<"apps" | "decisions" | "funded">("apps");
  const [repSort, setRepSort] = useState<"funded_value" | "close_rate" | "total_deals">("funded_value");
  const [dateRange, setDateRange] = useState<DateRange>("all");

  useEffect(() => {
    Promise.all([
      fetch("/api/analytics/overview", { credentials: "include" }).then(r => r.json()),
      fetch("/api/analytics/timeline", { credentials: "include" }).then(r => r.json()),
      fetch("/api/analytics/reps", { credentials: "include" }).then(r => r.json()),
      fetch("/api/analytics/lenders", { credentials: "include" }).then(r => r.json()),
      fetch("/api/analytics/recent", { credentials: "include" }).then(r => r.json()),
    ]).then(([ov, tl, rp, ln, rc]) => {
      setOverview(ov);
      setTimeline(tl);
      setReps(rp);
      setLenders(ln);
      setRecent(rc);
      setLoading(false);
    }).catch(err => {
      console.error("Analytics load error:", err);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div className="analytics"><style>{CSS}</style><div className="loading"><div className="spinner" /><p>Loading analytics...</p></div></div>;
  }

  if (!overview) {
    return <div className="analytics"><style>{CSS}</style><div className="loading"><p>Unable to load analytics. Make sure you're logged in as admin.</p></div></div>;
  }

  const p = overview.pipeline;
  const totalDecisions = (p.approved?.count || 0) + (p.funded?.count || 0) + (p.declined?.count || 0) + (p.unqualified?.count || 0);
  const maxPipelineCount = Math.max(p.approved?.count || 0, p.funded?.count || 0, p.declined?.count || 0, p.unqualified?.count || 0, 1);
  const closeRate = totalDecisions > 0 ? ((p.funded?.count || 0) / totalDecisions * 100).toFixed(1) : "0";
  const approvalRate = totalDecisions > 0 ? (((p.approved?.count || 0) + (p.funded?.count || 0)) / totalDecisions * 100).toFixed(1) : "0";

  // Filter timeline data by selected range
  const filterByRange = (items: any[], dateField: string = "week") => {
    if (dateRange === "all") return items;
    const now = new Date();
    const cutoff = new Date();
    if (dateRange === "week") cutoff.setDate(now.getDate() - 7);
    else if (dateRange === "month") cutoff.setDate(now.getDate() - 30);
    else if (dateRange === "quarter") cutoff.setDate(now.getDate() - 90);
    else if (dateRange === "ytd") { cutoff.setMonth(0); cutoff.setDate(1); }
    return items.filter(i => new Date(i[dateField]) >= cutoff);
  };

  const appWeeks = filterByRange(timeline?.applicationsByWeek || [], "week").slice(-16);
  const appChartData = appWeeks.map((w: any) => [Number(w.c)]);
  const appChartLabels = appWeeks.map((w: any) => {
    const d = new Date(w.week);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  });

  // Decisions by week — stacked by status
  const decWeeks = filterByRange(timeline?.decisionsByWeek || [], "week");
  const decWeekMap = new Map<string, { approved: number; funded: number; declined: number; unqualified: number }>();
  for (const r of decWeeks) {
    const key = r.week;
    const entry = decWeekMap.get(key) || { approved: 0, funded: 0, declined: 0, unqualified: 0 };
    entry[r.status as keyof typeof entry] = Number(r.c);
    decWeekMap.set(key, entry);
  }
  const decWeekKeys = [...decWeekMap.keys()].sort().slice(-16);
  const decChartData = decWeekKeys.map(k => {
    const e = decWeekMap.get(k)!;
    return [e.funded, e.approved, e.declined, e.unqualified];
  });
  const decChartLabels = decWeekKeys.map(k => {
    const d = new Date(k);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  });

  const fundedMonths = filterByRange(timeline?.fundedByMonth || [], "month").slice(-12);
  const fundedChartData = fundedMonths.map((m: any) => [Number(m.value)]);
  const fundedChartLabels = fundedMonths.map((m: any) => new Date(m.month).toLocaleDateString("en-US", { month: "short" }));

  const sortedReps = [...reps].sort((a, b) => Number(b[repSort]) - Number(a[repSort]));

  return (
    <div className="analytics">
      <style>{CSS}</style>
      <div className="container">
        <a href="/dashboard" className="nav-back">&larr; Back to Dashboard</a>

        <div className="header-row">
          <div>
            <h1>Deal Flow Analytics</h1>
            <p className="subtitle">Applications, approvals, and funded deals across your team.</p>
          </div>
          <div className="date-filter">
            {([["week", "7D"], ["month", "30D"], ["quarter", "90D"], ["ytd", "YTD"], ["all", "All"]] as const).map(([key, label]) => (
              <button key={key} className={`date-btn ${dateRange === key ? "active" : ""}`} onClick={() => setDateRange(key)}>{label}</button>
            ))}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="kpi-grid">
          <div className="kpi teal">
            <div className="kpi-label">Applications</div>
            <div className="kpi-value">{overview.applications.total.toLocaleString()}</div>
            <div className="kpi-sub">{overview.applications.thisWeek} this week</div>
          </div>
          <div className="kpi blue">
            <div className="kpi-label">Approved</div>
            <div className="kpi-value">{p.approved?.count || 0}</div>
            <div className="kpi-sub">{fmtK(p.approved?.value || 0)}</div>
          </div>
          <div className="kpi purple">
            <div className="kpi-label">Funded</div>
            <div className="kpi-value" style={{ color: "#a855f7" }}>{p.funded?.count || 0}</div>
            <div className="kpi-sub">{fmtK(p.funded?.value || 0)}</div>
          </div>
          <div className="kpi red">
            <div className="kpi-label">Declined</div>
            <div className="kpi-value" style={{ color: "#ef4444" }}>{p.declined?.count || 0}</div>
            <div className="kpi-sub">{approvalRate}% approval rate</div>
          </div>
          <div className="kpi amber">
            <div className="kpi-label">Unqualified</div>
            <div className="kpi-value" style={{ color: "#f59e0b" }}>{p.unqualified?.count || 0}</div>
            <div className="kpi-sub">{closeRate}% close rate</div>
          </div>
          <div className="kpi green">
            <div className="kpi-label">Avg Deal Size</div>
            <div className="kpi-value" style={{ color: "#22c55e" }}>{fmtK(overview.funding.avgDeal)}</div>
            <div className="kpi-sub">{overview.statements.total} statements</div>
          </div>
        </div>

        {/* Pipeline + Chart side by side */}
        <div className="two-col">
          {/* Pipeline Funnel */}
          <div className="section" style={{ marginBottom: 0 }}>
            <div className="section-title">Pipeline</div>
            {[
              { label: "Approved", count: p.approved?.count || 0, value: p.approved?.value || 0, color: "#3b82f6" },
              { label: "Funded", count: p.funded?.count || 0, value: p.funded?.value || 0, color: "#a855f7" },
              { label: "Declined", count: p.declined?.count || 0, value: 0, color: "#ef4444" },
              { label: "Unqualified", count: p.unqualified?.count || 0, value: 0, color: "#f59e0b" },
            ].map(stage => {
              const pct = totalDecisions > 0 ? ((stage.count / totalDecisions) * 100).toFixed(0) : "0";
              return (
                <div key={stage.label} className="pipeline-row">
                  <div className="pipeline-label" style={{ color: stage.color }}>{stage.label}</div>
                  <div className="pipeline-bar">
                    <div className="bar-bg">
                      <div className="bar-fill" style={{ width: `${(stage.count / maxPipelineCount) * 100}%`, background: stage.color }} />
                      {Number(pct) > 8 && <div className="bar-pct">{pct}%</div>}
                      <div className="bar-label">{stage.count}</div>
                    </div>
                  </div>
                  <div className="pipeline-value">{stage.value > 0 ? fmtK(stage.value) : ""}</div>
                </div>
              );
            })}
            <div style={{ marginTop: 16, display: "flex", gap: 24, fontSize: 13 }}>
              <div><span style={{ color: "#7b8499" }}>Close Rate</span> <strong style={{ color: "#2dd4bf" }}>{closeRate}%</strong></div>
              <div><span style={{ color: "#7b8499" }}>Approval Rate</span> <strong style={{ color: "#3b82f6" }}>{approvalRate}%</strong></div>
              <div><span style={{ color: "#7b8499" }}>Total Value</span> <strong style={{ color: "#a855f7" }}>{fmtK((p.approved?.value || 0) + (p.funded?.value || 0))}</strong></div>
            </div>
          </div>

          {/* Volume Chart */}
          <div className="section" style={{ marginBottom: 0 }}>
            <div className="section-title">
              <span>Volume</span>
              <div className="tab-row">
                <button className={`tab-btn ${timelineView === "apps" ? "active" : ""}`} onClick={() => setTimelineView("apps")}>Apps</button>
                <button className={`tab-btn ${timelineView === "decisions" ? "active" : ""}`} onClick={() => setTimelineView("decisions")}>Decisions</button>
                <button className={`tab-btn ${timelineView === "funded" ? "active" : ""}`} onClick={() => setTimelineView("funded")}>Funded $</button>
              </div>
            </div>
            <div className="chart-wrap">
              {timelineView === "apps" ? (
                <BarChart data={appChartData} colors={["#14b8a6"]} labels={appChartLabels} />
              ) : timelineView === "decisions" ? (
                <BarChart data={decChartData} colors={["#a855f7", "#3b82f6", "#ef4444", "#f59e0b"]} labels={decChartLabels} />
              ) : (
                <BarChart data={fundedChartData} colors={["#a855f7"]} labels={fundedChartLabels} dollarAxis />
              )}
            </div>
            {timelineView === "decisions" && (
              <div style={{ display: "flex", gap: 16, marginTop: 8, justifyContent: "center", fontSize: 11 }}>
                {[["Funded", "#a855f7"], ["Approved", "#3b82f6"], ["Declined", "#ef4444"], ["Unqualified", "#f59e0b"]].map(([l, c]) => (
                  <div key={l} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: c, display: "inline-block" }} />
                    <span style={{ color: "#7b8499" }}>{l}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Rep Leaderboard */}
        <div className="section">
          <div className="section-title">
            <span>Rep Performance</span>
            <div className="tab-row">
              <button className={`tab-btn ${repSort === "funded_value" ? "active" : ""}`} onClick={() => setRepSort("funded_value")}>Volume</button>
              <button className={`tab-btn ${repSort === "close_rate" ? "active" : ""}`} onClick={() => setRepSort("close_rate")}>Close Rate</button>
              <button className={`tab-btn ${repSort === "total_deals" ? "active" : ""}`} onClick={() => setRepSort("total_deals")}>Deals</button>
            </div>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>#</th><th>Rep</th><th>Deals</th><th>Approved</th><th>Funded</th><th>Declined</th><th>Unqual.</th><th>Close Rate</th><th>Funded $</th><th>Avg Deal</th>
                </tr>
              </thead>
              <tbody>
                {sortedReps.filter(r => r.rep !== "Unassigned").map((rep, i) => (
                  <tr key={rep.rep}>
                    <td style={{ color: i < 3 ? "#2dd4bf" : "#4b5568", fontWeight: i < 3 ? 700 : 400 }}>{i + 1}</td>
                    <td style={{ fontWeight: 600 }}>{rep.rep}</td>
                    <td>{rep.total_deals}</td>
                    <td style={{ color: "#3b82f6" }}>{rep.approved}</td>
                    <td style={{ color: "#a855f7", fontWeight: 600 }}>{rep.funded}</td>
                    <td style={{ color: "#ef4444" }}>{rep.declined}</td>
                    <td style={{ color: "#f59e0b" }}>{rep.unqualified}</td>
                    <td style={{ color: Number(rep.close_rate) >= 30 ? "#2dd4bf" : Number(rep.close_rate) >= 15 ? "#facc15" : "#ef4444", fontWeight: 600 }}>
                      {rep.close_rate}%
                    </td>
                    <td style={{ fontWeight: 600, color: "#a855f7" }}>{fmtK(Number(rep.funded_value))}</td>
                    <td>{Number(rep.avg_funded_deal) > 0 ? fmtK(Number(rep.avg_funded_deal)) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Lenders + Recent side by side */}
        <div className="two-col">
          <div className="section" style={{ marginBottom: 0 }}>
            <div className="section-title">Top Lenders</div>
            <div className="table-scroll">
              <table>
                <thead><tr><th>Lender</th><th>Appr.</th><th>Funded</th><th>Funded $</th></tr></thead>
                <tbody>
                  {lenders.slice(0, 10).map(l => (
                    <tr key={l.lender}>
                      <td style={{ fontWeight: 500 }}>{l.lender}</td>
                      <td style={{ color: "#3b82f6" }}>{l.approved}</td>
                      <td style={{ color: "#a855f7", fontWeight: 600 }}>{l.funded}</td>
                      <td style={{ fontWeight: 600, color: "#a855f7" }}>{Number(l.funded_value) > 0 ? fmtK(Number(l.funded_value)) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="section" style={{ marginBottom: 0 }}>
            <div className="section-title">Recent Decisions</div>
            <div className="table-scroll">
              <table>
                <thead><tr><th>Business</th><th>Status</th><th>Amount</th><th>Date</th></tr></thead>
                <tbody>
                  {recent.slice(0, 10).map((d: any) => (
                    <tr key={d.id}>
                      <td>
                        <div style={{ fontWeight: 500, fontSize: 12 }}>{d.business_name || "—"}</div>
                        <div style={{ fontSize: 10, color: "#4b5568" }}>{d.assigned_rep || ""}</div>
                      </td>
                      <td><span className={`badge badge-${d.status}`}>{d.status}</span></td>
                      <td style={{ fontSize: 12 }}>{d.advance_amount ? fmtK(Number(d.advance_amount)) : "—"}</td>
                      <td style={{ fontSize: 11, color: "#7b8499" }}>{new Date(d.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
