import { useState, useEffect } from "react";

interface LeadStatement {
  id: number;
  originalFileName: string;
  fileSize: number;
  viewToken: string | null;
  createdAt: string;
}

interface LeadAccount {
  id: number;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  business_name: string | null;
  industry: string | null;
  monthly_revenue: string | null;
  qualification_score: number | null;
  qualification_tier: string | null;
  is_qualified: boolean;
  status: string;
  last_active_at: string | null;
  created_at: string;
  position_count: number;
  statement_count: number;
  positions: Array<{
    funderName: string;
    productType: string | null;
    fundedAmount: string | null;
    status: string;
  }> | null;
  statements: LeadStatement[] | null;
}

function fmtFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / 1048576).toFixed(1)}MB`;
}

export default function LeadsDashboard() {
  const [leads, setLeads] = useState<LeadAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "hot" | "warm" | "cold">("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/admin/lead-portal/leads")
      .then(r => {
        if (!r.ok) throw new Error("Unauthorized or server error");
        return r.json();
      })
      .then(data => {
        setLeads(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const filtered = filter === "all"
    ? leads
    : leads.filter(l => (l.qualification_tier || "cold") === filter);

  const hotCount = leads.filter(l => l.qualification_tier === "hot").length;
  const warmCount = leads.filter(l => l.qualification_tier === "warm").length;
  const coldCount = leads.filter(l => !l.qualification_tier || l.qualification_tier === "cold").length;
  const withPositions = leads.filter(l => l.position_count > 0).length;
  const withStatements = leads.filter(l => (l.statement_count || 0) > 0).length;

  const tierColor = (tier: string | null) => {
    if (tier === "hot") return "#ef4444";
    if (tier === "warm") return "#f59e0b";
    return "#6b7280";
  };

  const tierLabel = (tier: string | null) => {
    if (tier === "hot") return "HOT";
    if (tier === "warm") return "WARM";
    return "COLD";
  };

  const formatDate = (d: string | null) => {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const timeSince = (d: string | null) => {
    if (!d) return "never";
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: "#f8f9fb", minHeight: "100vh", padding: "32px 24px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 24, fontWeight: 700, color: "#1a1a2e", margin: 0 }}>
              Lead Portal Signups
            </h1>
            <p style={{ color: "#6b7280", fontSize: 14, marginTop: 4 }}>
              Prospective merchants tracking their funding positions
            </p>
          </div>
          <a href="/dashboard" style={{ color: "#14B8A6", fontSize: 14, fontWeight: 600, textDecoration: "none" }}>
            Back to Dashboard
          </a>
        </div>

        {/* Stats Row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16, marginBottom: 24 }}>
          {[
            { label: "Total Leads", value: leads.length, color: "#1a1a2e" },
            { label: "Hot", value: hotCount, color: "#ef4444" },
            { label: "Warm", value: warmCount, color: "#f59e0b" },
            { label: "Tracking Positions", value: withPositions, color: "#14B8A6" },
            { label: "Uploaded Statements", value: withStatements, color: "#6366f1" },
          ].map(s => (
            <div key={s.label} style={{ background: "#fff", borderRadius: 12, padding: "20px 16px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: s.color, fontFamily: "'Syne', sans-serif" }}>{s.value}</div>
              <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filter Bar */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {(["all", "hot", "warm", "cold"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: "8px 18px",
                border: filter === f ? "2px solid #14B8A6" : "1px solid #d1d5db",
                borderRadius: 8,
                background: filter === f ? "rgba(20,184,166,0.08)" : "#fff",
                color: filter === f ? "#0d9488" : "#374151",
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
                textTransform: "capitalize",
              }}
            >
              {f === "all" ? `All (${leads.length})` : `${f} (${f === "hot" ? hotCount : f === "warm" ? warmCount : coldCount})`}
            </button>
          ))}
        </div>

        {/* Loading / Error */}
        {loading && <p style={{ color: "#6b7280", textAlign: "center", padding: 40 }}>Loading leads...</p>}
        {error && <p style={{ color: "#dc2626", textAlign: "center", padding: 40 }}>Error: {error}</p>}

        {/* Leads Table */}
        {!loading && !error && (
          <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.05)", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, color: "#374151" }}>Lead</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, color: "#374151" }}>Business</th>
                  <th style={{ padding: "12px 16px", textAlign: "center", fontWeight: 600, color: "#374151" }}>Tier</th>
                  <th style={{ padding: "12px 16px", textAlign: "center", fontWeight: 600, color: "#374151" }}>Score</th>
                  <th style={{ padding: "12px 16px", textAlign: "center", fontWeight: 600, color: "#374151" }}>Positions</th>
                  <th style={{ padding: "12px 16px", textAlign: "center", fontWeight: 600, color: "#374151" }}>Statements</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, color: "#374151" }}>Signed Up</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, color: "#374151" }}>Last Active</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={8} style={{ padding: 32, textAlign: "center", color: "#9ca3af" }}>No leads found</td></tr>
                )}
                {filtered.map(lead => (
                  <>
                    <tr
                      key={lead.id}
                      onClick={() => setExpandedId(expandedId === lead.id ? null : lead.id)}
                      style={{ borderBottom: "1px solid #f3f4f6", cursor: "pointer", transition: "background 0.15s" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "#f9fafb")}
                      onMouseLeave={e => (e.currentTarget.style.background = "")}
                    >
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ fontWeight: 600, color: "#1a1a2e" }}>
                          {[lead.first_name, lead.last_name].filter(Boolean).join(" ") || "Unknown"}
                        </div>
                        <div style={{ fontSize: 12, color: "#6b7280" }}>{lead.email}</div>
                        {lead.phone && <div style={{ fontSize: 12, color: "#9ca3af" }}>{lead.phone}</div>}
                      </td>
                      <td style={{ padding: "12px 16px", color: "#374151" }}>{lead.business_name || "-"}</td>
                      <td style={{ padding: "12px 16px", textAlign: "center" }}>
                        <span style={{
                          display: "inline-block",
                          padding: "3px 10px",
                          borderRadius: 20,
                          fontSize: 11,
                          fontWeight: 700,
                          letterSpacing: "0.05em",
                          color: "#fff",
                          background: tierColor(lead.qualification_tier),
                        }}>
                          {tierLabel(lead.qualification_tier)}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "center", fontWeight: 600, color: "#374151" }}>
                        {lead.qualification_score ?? 0}
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "center", color: "#374151" }}>
                        {lead.position_count || 0}
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "center" }}>
                        {(lead.statement_count || 0) > 0 ? (
                          <span style={{
                            display: "inline-block",
                            padding: "3px 10px",
                            borderRadius: 20,
                            fontSize: 11,
                            fontWeight: 700,
                            color: "#6366f1",
                            background: "rgba(99,102,241,0.1)",
                          }}>
                            {lead.statement_count} file{lead.statement_count !== 1 ? "s" : ""}
                          </span>
                        ) : (
                          <span style={{ color: "#d1d5db" }}>-</span>
                        )}
                      </td>
                      <td style={{ padding: "12px 16px", color: "#6b7280", fontSize: 13 }}>
                        {formatDate(lead.created_at)}
                      </td>
                      <td style={{ padding: "12px 16px", color: "#6b7280", fontSize: 13 }}>
                        {timeSince(lead.last_active_at)}
                      </td>
                    </tr>
                    {expandedId === lead.id && (
                      <tr key={`${lead.id}-detail`} style={{ background: "#f9fafb" }}>
                        <td colSpan={8} style={{ padding: "16px 24px" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24 }}>
                            {/* Contact Details */}
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 13, color: "#14B8A6", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                                Contact Details
                              </div>
                              <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.8 }}>
                                <strong>Email:</strong> {lead.email}<br />
                                <strong>Phone:</strong> {lead.phone || "Not provided"}<br />
                                <strong>Industry:</strong> {lead.industry || "Not set"}<br />
                                <strong>Revenue:</strong> {lead.monthly_revenue || "Not set"}<br />
                                <strong>Status:</strong> {lead.status}
                              </div>
                            </div>

                            {/* Funding Positions */}
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 13, color: "#14B8A6", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                                Funding Positions ({lead.position_count || 0})
                              </div>
                              {(!lead.positions || lead.positions.length === 0) ? (
                                <div style={{ fontSize: 13, color: "#9ca3af" }}>No positions tracked yet</div>
                              ) : (
                                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                  {lead.positions.map((p, i) => (
                                    <div key={i} style={{
                                      background: "#fff",
                                      border: "1px solid #e5e7eb",
                                      borderRadius: 8,
                                      padding: "8px 12px",
                                      fontSize: 13,
                                    }}>
                                      <strong>{p.funderName}</strong>
                                      {p.fundedAmount && <span style={{ color: "#6b7280" }}> - ${Number(p.fundedAmount).toLocaleString()}</span>}
                                      {p.productType && <span style={{ color: "#9ca3af" }}> ({p.productType})</span>}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Uploaded Statements */}
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 13, color: "#6366f1", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                                Bank Statements ({lead.statement_count || 0})
                              </div>
                              {(!lead.statements || lead.statements.length === 0) ? (
                                <div style={{ fontSize: 13, color: "#9ca3af" }}>No statements uploaded</div>
                              ) : (
                                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                  {lead.statements.map((s, i) => (
                                    <div key={i} style={{
                                      background: "#fff",
                                      border: "1px solid #e5e7eb",
                                      borderRadius: 8,
                                      padding: "8px 12px",
                                      fontSize: 13,
                                      display: "flex",
                                      justifyContent: "space-between",
                                      alignItems: "center",
                                    }}>
                                      <div>
                                        <div style={{ fontWeight: 600, color: "#1a1a2e", display: "flex", alignItems: "center", gap: 6 }}>
                                          <span style={{ color: "#6366f1", fontSize: 14 }}>&#128196;</span>
                                          {s.originalFileName}
                                        </div>
                                        <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
                                          {fmtFileSize(s.fileSize)} &middot; {formatDate(s.createdAt)}
                                        </div>
                                      </div>
                                      {s.viewToken && (
                                        <a
                                          href={`/api/statements/view/${s.viewToken}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          onClick={e => e.stopPropagation()}
                                          style={{
                                            padding: "4px 12px",
                                            background: "rgba(99,102,241,0.08)",
                                            border: "1px solid rgba(99,102,241,0.2)",
                                            borderRadius: 6,
                                            color: "#6366f1",
                                            fontSize: 12,
                                            fontWeight: 600,
                                            textDecoration: "none",
                                            whiteSpace: "nowrap",
                                          }}
                                        >
                                          View
                                        </a>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
