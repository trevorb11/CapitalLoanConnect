import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Globe, Search, Plus, Phone, Mail, Building2, CalendarDays, MessageSquare, Loader2, ExternalLink } from "lucide-react";
import { Link } from "wouter";

interface AuthState {
  isAuthenticated: boolean;
  role?: string;
  agentEmail?: string;
  agentName?: string;
}

interface Referral {
  id: number;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  business_name: string | null;
  service: string;
  other_details: string | null;
  source: string | null;
  utm_source: string | null;
  rep_email: string | null;
  status: string | null;
  created_at: string;
}

const STATUS_OPTIONS = ["new", "contacted", "in-progress", "closed-won", "closed-lost"] as const;

function statusColor(s: string | null) {
  switch (s) {
    case "contacted":   return "bg-blue-600 text-white";
    case "in-progress": return "bg-indigo-600 text-white";
    case "closed-won":  return "bg-emerald-600 text-white";
    case "closed-lost": return "bg-red-600 text-white";
    default:            return "bg-gray-600 text-white";
  }
}

function statusLabel(s: string | null) {
  if (!s || s === "new") return "New";
  return s.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

export default function RepWebsiteReferralDashboard() {
  const [auth, setAuth] = useState<AuthState>({ isAuthenticated: false });
  const [authLoading, setAuthLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/auth/check", { credentials: "include" })
      .then(r => r.json())
      .then(data => { setAuth(data); setAuthLoading(false); })
      .catch(() => setAuthLoading(false));
  }, []);

  const { data: referrals = [], isLoading } = useQuery<Referral[]>({
    queryKey: ["/api/rep/website-referrals"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: auth.isAuthenticated,
    refetchInterval: 30000,
  });

  const isAdmin = auth.role === "admin" || auth.role === "underwriting";

  const filtered = referrals.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (r.email || "").toLowerCase().includes(q) ||
      (r.business_name || "").toLowerCase().includes(q) ||
      (r.first_name || "").toLowerCase().includes(q) ||
      (r.last_name || "").toLowerCase().includes(q) ||
      (r.utm_source || "").toLowerCase().includes(q)
    );
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-gray-500 animate-spin" />
      </div>
    );
  }

  if (!auth.isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
        <Card className="bg-gray-900 border-gray-800 max-w-sm w-full text-center">
          <CardContent className="p-8 space-y-4">
            <Globe className="w-10 h-10 text-cyan-400 mx-auto" />
            <h2 className="text-xl font-bold text-white">Sign In Required</h2>
            <p className="text-gray-400 text-sm">Log in to view your website referral leads.</p>
            <a href="/dashboard">
              <Button className="w-full bg-blue-600 text-white">Go to Dashboard Login</Button>
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-cyan-500/10 border border-cyan-500/30 rounded-full flex items-center justify-center shrink-0">
              <Globe className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-base font-bold">Website Referral Leads</h1>
              <p className="text-xs text-gray-400">
                {isAdmin ? "All rep referrals" : `Leads submitted by ${auth.agentName || auth.agentEmail}`}
              </p>
            </div>
          </div>
          <Link href="/rep/website-referral">
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5" data-testid="button-new-referral">
              <Plus className="w-3.5 h-3.5" /> Submit New Lead
            </Button>
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-4">
        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total", value: referrals.length, color: "text-white" },
            { label: "New", value: referrals.filter(r => !r.status || r.status === "new").length, color: "text-gray-300" },
            { label: "In Progress", value: referrals.filter(r => r.status === "in-progress" || r.status === "contacted").length, color: "text-indigo-400" },
            { label: "Closed Won", value: referrals.filter(r => r.status === "closed-won").length, color: "text-emerald-400" },
          ].map(s => (
            <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3">
              <p className="text-xs text-gray-500 mb-0.5">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email, business..."
            className="pl-10 bg-gray-900 border-gray-700 text-white placeholder:text-gray-600"
            data-testid="input-search"
          />
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
          </div>
        )}

        {/* Empty */}
        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-16 text-gray-500">
            <Globe className="w-12 h-12 mx-auto mb-3 text-gray-700" />
            <p className="font-medium text-gray-400">
              {search ? "No leads match your search." : "No website referrals yet."}
            </p>
            {!search && (
              <p className="text-sm mt-1">Submit your first lead using the button above.</p>
            )}
          </div>
        )}

        {/* Lead cards */}
        {!isLoading && filtered.length > 0 && (
          <div className="space-y-3">
            {filtered.map(r => {
              const name = [r.first_name, r.last_name].filter(Boolean).join(" ") || null;
              const submittedDate = new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
              return (
                <div
                  key={r.id}
                  data-testid={`card-referral-${r.id}`}
                  className="bg-gray-900 border border-gray-800 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="space-y-2 min-w-0">
                      {/* Name + status */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-white text-sm">
                          {name || r.email}
                        </p>
                        <Badge className={`text-xs ${statusColor(r.status)}`}>
                          {statusLabel(r.status)}
                        </Badge>
                        {isAdmin && r.utm_source && (
                          <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">
                            by {r.utm_source}
                          </span>
                        )}
                      </div>

                      {/* Contact details */}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
                        {r.email && (
                          <a href={`mailto:${r.email}`} className="flex items-center gap-1 hover:text-cyan-400 transition-colors">
                            <Mail className="w-3 h-3" /> {r.email}
                          </a>
                        )}
                        {r.phone && (
                          <a href={`tel:${r.phone}`} className="flex items-center gap-1 hover:text-cyan-400 transition-colors">
                            <Phone className="w-3 h-3" /> {r.phone}
                          </a>
                        )}
                        {r.business_name && (
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" /> {r.business_name}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-gray-600">
                          <CalendarDays className="w-3 h-3" /> {submittedDate}
                        </span>
                      </div>

                      {/* Notes */}
                      {r.other_details && (
                        <div className="flex items-start gap-1.5 text-xs text-gray-400 bg-gray-800/60 rounded px-2.5 py-1.5 max-w-lg">
                          <MessageSquare className="w-3 h-3 mt-0.5 shrink-0 text-gray-500" />
                          <span>{r.other_details}</span>
                        </div>
                      )}
                    </div>

                    {/* Status updater — admin only */}
                    {isAdmin && (
                      <StatusDropdown id={r.id} current={r.status} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusDropdown({ id, current }: { id: number; current: string | null }) {
  const [saving, setSaving] = useState(false);
  const [val, setVal] = useState(current || "new");

  const update = async (newStatus: string) => {
    setVal(newStatus);
    setSaving(true);
    try {
      await fetch(`/api/rep/website-referrals/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: newStatus }),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-2 shrink-0">
      {saving && <Loader2 className="w-3 h-3 animate-spin text-gray-500" />}
      <select
        value={val}
        onChange={e => update(e.target.value)}
        className="bg-gray-800 border border-gray-700 text-white text-xs rounded px-2 py-1.5 focus:outline-none focus:border-cyan-500"
        data-testid={`select-status-${id}`}
      >
        {STATUS_OPTIONS.map(s => (
          <option key={s} value={s}>{statusLabel(s)}</option>
        ))}
      </select>
    </div>
  );
}
