import { useState, useEffect, useRef } from "react";

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');

  .analytics * { box-sizing: border-box; margin: 0; padding: 0; }

  .analytics {
    font-family: 'DM Sans', sans-serif;
    background: #080d18;
    color: #e8eaf0;
    min-height: 100vh;
    padding: 32px 24px 80px;
  }

  .analytics .container { max-width: 1200px; margin: 0 auto; }

  .analytics h1 {
    font-family: 'Syne', sans-serif;
    font-size: 28px;
    font-weight: 700;
    margin-bottom: 8px;
  }

  .analytics .subtitle { color: #7b8499; font-size: 14px; margin-bottom: 32px; }

  .analytics .kpi-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    margin-bottom: 32px;
  }

  .analytics .kpi {
    background: rgba(15,23,41,0.7);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 16px;
    padding: 24px;
    position: relative;
    overflow: hidden;
  }

  .analytics .kpi::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 3px;
    border-radius: 16px 16px 0 0;
  }

  .analytics .kpi.teal::before { background: #14b8a6; }
  .analytics .kpi.blue::before { background: #3b82f6; }
  .analytics .kpi.purple::before { background: #a855f7; }
  .analytics .kpi.amber::before { background: #f59e0b; }
  .analytics .kpi.red::before { background: #ef4444; }
  .analytics .kpi.green::before { background: #22c55e; }

  .analytics .kpi-label { font-size: 12px; color: #7b8499; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 8px; }
  .analytics .kpi-value { font-family: 'Syne', sans-serif; font-size: 28px; font-weight: 700; }
  .analytics .kpi-sub { font-size: 12px; color: #4b5568; margin-top: 6px; }

  .analytics .section {
    background: rgba(15,23,41,0.7);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 16px;
    padding: 24px;
    margin-bottom: 24px;
  }

  .analytics .section-title {
    font-family: 'Syne', sans-serif;
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .analytics .chart-wrap { position: relative; height: 280px; }

  .analytics .tab-row {
    display: flex;
    gap: 4px;
    margin-bottom: 20px;
    background: rgba(255,255,255,0.04);
    border-radius: 8px;
    padding: 3px;
  }

  .analytics .tab-btn {
    padding: 7px 16px;
    background: none;
    border: none;
    border-radius: 6px;
    color: #7b8499;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
  }

  .analytics .tab-btn.active { background: rgba(45,212,191,0.1); color: #2dd4bf; font-weight: 600; }

  .analytics table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .analytics th { text-align: left; padding: 10px 12px; color: #7b8499; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; border-bottom: 1px solid rgba(255,255,255,0.08); }
  .analytics td { padding: 10px 12px; border-bottom: 1px solid rgba(255,255,255,0.04); }
  .analytics tr:hover td { background: rgba(255,255,255,0.02); }

  .analytics .badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 600;
  }

  .analytics .badge-funded { background: rgba(168,85,247,0.15); color: #a855f7; }
  .analytics .badge-approved { background: rgba(59,130,246,0.15); color: #3b82f6; }
  .analytics .badge-declined { background: rgba(239,68,68,0.15); color: #ef4444; }
  .analytics .badge-unqualified { background: rgba(245,158,11,0.15); color: #f59e0b; }

  .analytics .bar-bg { height: 24px; background: rgba(255,255,255,0.06); border-radius: 4px; overflow: hidden; position: relative; }
  .analytics .bar-fill { height: 100%; border-radius: 4px; transition: width 0.8s ease; }
  .analytics .bar-label { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); font-size: 11px; font-weight: 600; color: #e8eaf0; }

  .analytics .pipeline-row { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
  .analytics .pipeline-label { min-width: 100px; font-size: 13px; font-weight: 500; }
  .analytics .pipeline-bar { flex: 1; }
  .analytics .pipeline-value { min-width: 80px; text-align: right; font-size: 13px; font-weight: 600; }

  .analytics .loading { text-align: center; padding: 60px 20px; color: #7b8499; }
  .analytics .spinner { width: 28px; height: 28px; border: 3px solid rgba(45,212,191,0.2); border-top-color: #2dd4bf; border-radius: 50%; animation: aspin 0.8s linear infinite; margin: 0 auto 12px; }
  @keyframes aspin { to { transform: rotate(360deg); } }

  @media (max-width: 768px) {
    .analytics .kpi-grid { grid-template-columns: repeat(2, 1fr); }
    .analytics h1 { font-size: 22px; }
    .analytics { padding: 20px 16px 60px; }
  }

  @media (max-width: 480px) {
    .analytics .kpi-grid { grid-template-columns: 1fr; }
  }
`;

const fmt$ = (n: number) => `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
const fmtK = (n: number) => n >= 1000000 ? `$${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `$${(n / 1000).toFixed(0)}K` : fmt$(n);

// Simple canvas bar chart
function BarChart({ data, colors, labels }: { data: number[][]; colors: string[]; labels: string[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
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

    const padding = { top: 20, right: 20, bottom: 40, left: 60 };
    const w = rect.width - padding.left - padding.right;
    const h = rect.height - padding.top - padding.bottom;

    // Find max stacked value
    const maxVal = Math.max(...data.map(d => d.reduce((s, v) => s + v, 0)), 1);

    const barWidth = Math.min(40, (w / data.length) * 0.6);
    const gap = (w - barWidth * data.length) / (data.length + 1);

    // Y-axis labels
    ctx.font = "11px 'DM Sans', sans-serif";
    ctx.fillStyle = "#4b5568";
    ctx.textAlign = "right";
    for (let i = 0; i <= 4; i++) {
      const val = (maxVal / 4) * i;
      const y = padding.top + h - (h * (i / 4));
      ctx.fillText(val >= 1000 ? `${(val / 1000).toFixed(0)}K` : val.toFixed(0), padding.left - 8, y + 4);
      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + w, y);
      ctx.stroke();
    }

    // Bars
    data.forEach((stack, i) => {
      const x = padding.left + gap + i * (barWidth + gap);
      let yOffset = 0;
      stack.forEach((val, si) => {
        const barH = (val / maxVal) * h;
        ctx.fillStyle = colors[si] || "#2dd4bf";
        ctx.beginPath();
        ctx.roundRect(x, padding.top + h - yOffset - barH, barWidth, barH, 3);
        ctx.fill();
        yOffset += barH;
      });

      // X label
      if (labels[i]) {
        ctx.fillStyle = "#4b5568";
        ctx.textAlign = "center";
        ctx.font = "10px 'DM Sans', sans-serif";
        ctx.fillText(labels[i], x + barWidth / 2, padding.top + h + 20);
      }
    });
  }, [data, colors, labels]);

  return <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />;
}

export default function Analytics() {
  const [overview, setOverview] = useState<any>(null);
  const [timeline, setTimeline] = useState<any>(null);
  const [reps, setReps] = useState<any[]>([]);
  const [lenders, setLenders] = useState<any[]>([]);
  const [recent, setRecent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timelineView, setTimelineView] = useState<"apps" | "funded">("apps");
  const [repSort, setRepSort] = useState<"funded_value" | "close_rate" | "total_deals">("funded_value");

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
    return (
      <div className="analytics">
        <style>{CSS}</style>
        <div className="loading"><div className="spinner" /><p>Loading analytics...</p></div>
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="analytics">
        <style>{CSS}</style>
        <div className="loading"><p>Unable to load analytics. Make sure you're logged in as admin.</p></div>
      </div>
    );
  }

  const p = overview.pipeline;
  const totalDecisions = (p.approved?.count || 0) + (p.funded?.count || 0) + (p.declined?.count || 0) + (p.unqualified?.count || 0);
  const maxPipelineCount = Math.max(p.approved?.count || 0, p.funded?.count || 0, p.declined?.count || 0, p.unqualified?.count || 0, 1);

  // Timeline chart data
  const appWeeks = (timeline?.applicationsByWeek || []).slice(-12);
  const appChartData = appWeeks.map((w: any) => [Number(w.c)]);
  const appChartLabels = appWeeks.map((w: any) => {
    const d = new Date(w.week);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  });

  const fundedMonths = (timeline?.fundedByMonth || []).slice(-12);
  const fundedChartData = fundedMonths.map((m: any) => [Number(m.value)]);
  const fundedChartLabels = fundedMonths.map((m: any) => {
    const d = new Date(m.month);
    return d.toLocaleDateString("en-US", { month: "short" });
  });

  // Sort reps
  const sortedReps = [...reps].sort((a, b) => Number(b[repSort]) - Number(a[repSort]));

  return (
    <div className="analytics">
      <style>{CSS}</style>
      <div className="container">
        <h1>Deal Flow Analytics</h1>
        <p className="subtitle">Track applications, approvals, and funded deals across your team.</p>

        {/* KPI Cards */}
        <div className="kpi-grid">
          <div className="kpi teal">
            <div className="kpi-label">Total Applications</div>
            <div className="kpi-value">{overview.applications.total.toLocaleString()}</div>
            <div className="kpi-sub">{overview.applications.thisWeek} this week &middot; {overview.applications.thisMonth} this month</div>
          </div>
          <div className="kpi blue">
            <div className="kpi-label">Approved</div>
            <div className="kpi-value">{p.approved?.count || 0}</div>
            <div className="kpi-sub">{fmtK(p.approved?.value || 0)} total value</div>
          </div>
          <div className="kpi purple">
            <div className="kpi-label">Funded</div>
            <div className="kpi-value" style={{ color: "#a855f7" }}>{p.funded?.count || 0}</div>
            <div className="kpi-sub">{fmtK(p.funded?.value || 0)} funded &middot; {fmtK(overview.funding.avgDeal)} avg deal</div>
          </div>
          <div className="kpi amber">
            <div className="kpi-label">Statements Uploaded</div>
            <div className="kpi-value">{overview.statements.total.toLocaleString()}</div>
            <div className="kpi-sub">{overview.statements.thisWeek} this week</div>
          </div>
        </div>

        {/* Pipeline Funnel */}
        <div className="section">
          <div className="section-title">Pipeline Breakdown</div>
          {[
            { label: "Approved", count: p.approved?.count || 0, value: p.approved?.value || 0, color: "#3b82f6" },
            { label: "Funded", count: p.funded?.count || 0, value: p.funded?.value || 0, color: "#a855f7" },
            { label: "Declined", count: p.declined?.count || 0, value: 0, color: "#ef4444" },
            { label: "Unqualified", count: p.unqualified?.count || 0, value: 0, color: "#f59e0b" },
          ].map(stage => (
            <div key={stage.label} className="pipeline-row">
              <div className="pipeline-label" style={{ color: stage.color }}>{stage.label}</div>
              <div className="pipeline-bar">
                <div className="bar-bg">
                  <div className="bar-fill" style={{ width: `${(stage.count / maxPipelineCount) * 100}%`, background: stage.color }} />
                  <div className="bar-label">{stage.count}</div>
                </div>
              </div>
              <div className="pipeline-value">{stage.value > 0 ? fmtK(stage.value) : "—"}</div>
            </div>
          ))}
          <div style={{ marginTop: 12, fontSize: 12, color: "#4b5568" }}>
            Close rate: {totalDecisions > 0 ? ((p.funded?.count || 0) / totalDecisions * 100).toFixed(1) : 0}% &middot; Approval rate: {totalDecisions > 0 ? (((p.approved?.count || 0) + (p.funded?.count || 0)) / totalDecisions * 100).toFixed(1) : 0}%
          </div>
        </div>

        {/* Timeline Charts */}
        <div className="section">
          <div className="section-title">
            <span>Volume Over Time</span>
            <div className="tab-row" style={{ marginBottom: 0 }}>
              <button className={`tab-btn ${timelineView === "apps" ? "active" : ""}`} onClick={() => setTimelineView("apps")}>Applications / Week</button>
              <button className={`tab-btn ${timelineView === "funded" ? "active" : ""}`} onClick={() => setTimelineView("funded")}>Funded / Month</button>
            </div>
          </div>
          <div className="chart-wrap">
            {timelineView === "apps" ? (
              <BarChart data={appChartData} colors={["#14b8a6"]} labels={appChartLabels} />
            ) : (
              <BarChart data={fundedChartData} colors={["#a855f7"]} labels={fundedChartLabels} />
            )}
          </div>
        </div>

        {/* Rep Leaderboard */}
        <div className="section">
          <div className="section-title">
            <span>Rep Performance</span>
            <div className="tab-row" style={{ marginBottom: 0 }}>
              <button className={`tab-btn ${repSort === "funded_value" ? "active" : ""}`} onClick={() => setRepSort("funded_value")}>By Volume</button>
              <button className={`tab-btn ${repSort === "close_rate" ? "active" : ""}`} onClick={() => setRepSort("close_rate")}>By Close Rate</button>
              <button className={`tab-btn ${repSort === "total_deals" ? "active" : ""}`} onClick={() => setRepSort("total_deals")}>By Deals</button>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Rep</th>
                <th>Deals</th>
                <th>Approved</th>
                <th>Funded</th>
                <th>Declined</th>
                <th>Close Rate</th>
                <th>Funded Volume</th>
                <th>Avg Deal</th>
              </tr>
            </thead>
            <tbody>
              {sortedReps.map((rep, i) => (
                <tr key={rep.rep}>
                  <td style={{ color: "#4b5568" }}>{i + 1}</td>
                  <td style={{ fontWeight: 600 }}>{rep.rep}</td>
                  <td>{rep.total_deals}</td>
                  <td style={{ color: "#3b82f6" }}>{rep.approved}</td>
                  <td style={{ color: "#a855f7", fontWeight: 600 }}>{rep.funded}</td>
                  <td style={{ color: "#ef4444" }}>{rep.declined}</td>
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

        {/* Lender Breakdown */}
        <div className="section">
          <div className="section-title">Top Lenders</div>
          <table>
            <thead>
              <tr><th>Lender</th><th>Approved</th><th>Funded</th><th>Approved Value</th><th>Funded Value</th></tr>
            </thead>
            <tbody>
              {lenders.slice(0, 15).map(l => (
                <tr key={l.lender}>
                  <td style={{ fontWeight: 500 }}>{l.lender}</td>
                  <td style={{ color: "#3b82f6" }}>{l.approved}</td>
                  <td style={{ color: "#a855f7", fontWeight: 600 }}>{l.funded}</td>
                  <td>{Number(l.approved_value) > 0 ? fmtK(Number(l.approved_value)) : "—"}</td>
                  <td style={{ fontWeight: 600, color: "#a855f7" }}>{Number(l.funded_value) > 0 ? fmtK(Number(l.funded_value)) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Recent Activity */}
        <div className="section">
          <div className="section-title">Recent Decisions</div>
          <table>
            <thead>
              <tr><th>Business</th><th>Status</th><th>Amount</th><th>Lender</th><th>Rep</th><th>Date</th></tr>
            </thead>
            <tbody>
              {recent.map((d: any) => (
                <tr key={d.id}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{d.business_name || "—"}</div>
                    <div style={{ fontSize: 11, color: "#4b5568" }}>{d.business_email}</div>
                  </td>
                  <td>
                    <span className={`badge badge-${d.status}`}>
                      {d.status === "funded" ? "Funded" : d.status === "approved" ? "Approved" : d.status === "declined" ? "Declined" : "Unqualified"}
                    </span>
                  </td>
                  <td>{d.advance_amount ? fmtK(Number(d.advance_amount)) : "—"}</td>
                  <td style={{ fontSize: 12 }}>{d.lender || "—"}</td>
                  <td style={{ fontSize: 12 }}>{d.assigned_rep || "—"}</td>
                  <td style={{ fontSize: 12, color: "#7b8499" }}>{new Date(d.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
