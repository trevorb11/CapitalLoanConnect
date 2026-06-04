import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Globe, FileText, MousePointerClick, Mail, Users, UserPlus } from "lucide-react";

interface ServiceInterest {
  id: number;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  business_name: string | null;
  service: string;
  other_details: string | null;
  source: string | null;
  utm_campaign: string | null;
  utm_source: string | null;
  created_at: string;
}

interface ServiceInterestsResponse {
  summary: { service: string; clicks: string; unique_contacts: string }[];
  recent: ServiceInterest[];
}

const SERVICE_LABELS: Record<string, string> = {
  website: "Website",
  payments: "Payments",
  crm: "CRM",
  "tax-prep": "Tax Prep",
  bookkeeping: "Bookkeeping",
  other: "Other",
};

const SERVICE_COLORS: Record<string, string> = {
  website: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
  payments: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300",
  crm: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
};

function submissionType(source: string | null): { label: string; className: string; icon: React.ReactNode } {
  if (source === "landing-page") {
    return {
      label: "Form Submission",
      className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
      icon: <FileText className="w-3 h-3" />,
    };
  }
  if (source === "rep-referral") {
    return {
      label: "Rep Referral",
      className: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
      icon: <UserPlus className="w-3 h-3" />,
    };
  }
  if (source === "email") {
    return {
      label: "Email Click",
      className: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
      icon: <Mail className="w-3 h-3" />,
    };
  }
  return {
    label: "Direct Click",
    className: "bg-muted text-muted-foreground",
    icon: <MousePointerClick className="w-3 h-3" />,
  };
}

function formatDate(iso: string) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return iso;
  }
}

function formatPhone(phone: string | null) {
  if (!phone) return "—";
  const d = phone.replace(/\D/g, "");
  if (d.length === 11 && d[0] === "1") return `(${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  return phone;
}

export default function ServiceLeads() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const { data, isLoading, error } = useQuery<ServiceInterestsResponse>({
    queryKey: ["/api/services/interests"],
  });

  const isUnauthorized = error && String(error.message).startsWith("401");
  const leads = data?.recent ?? [];

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return leads.filter(l => {
      const matchSearch =
        !q ||
        (l.email || "").toLowerCase().includes(q) ||
        (l.first_name || "").toLowerCase().includes(q) ||
        (l.last_name || "").toLowerCase().includes(q) ||
        (l.business_name || "").toLowerCase().includes(q) ||
        (l.phone || "").includes(q);
      const matchService = serviceFilter === "all" || l.service === serviceFilter;
      const matchType =
        typeFilter === "all" ||
        (typeFilter === "form" && l.source === "landing-page") ||
        (typeFilter === "rep-referral" && l.source === "rep-referral") ||
        (typeFilter === "click" && l.source !== "landing-page" && l.source !== "rep-referral");
      return matchSearch && matchService && matchType;
    });
  }, [leads, search, serviceFilter, typeFilter]);

  const formCount = leads.filter(l => l.source === "landing-page").length;
  const repReferralCount = leads.filter(l => l.source === "rep-referral").length;
  const clickCount = leads.filter(l => l.source !== "landing-page" && l.source !== "rep-referral").length;
  const serviceCount = useMemo(() => {
    const map: Record<string, number> = {};
    for (const l of leads) map[l.service] = (map[l.service] || 0) + 1;
    return map;
  }, [leads]);

  const serviceOptions = useMemo(() => {
    return Array.from(new Set(leads.map(l => l.service))).sort();
  }, [leads]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" />
              Service Leads
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Visitors and form submissions across all service landing pages
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/ads-leads")} data-testid="link-ads-leads">
              <MousePointerClick className="w-4 h-4 mr-1" />
              Ads Leads
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/leads")} data-testid="link-leads-dashboard">
              <Users className="w-4 h-4 mr-1" />
              Leads Dashboard
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-5">

        {/* Legend */}
        <div className="flex flex-wrap gap-3 items-center text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Lead types:</span>
          <span className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
              <FileText className="w-3 h-3" /> Form Submission
            </span>
            — filled out the quote/interest form on a landing page
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300">
              <UserPlus className="w-3 h-3" /> Rep Referral
            </span>
            — submitted by a sales rep on behalf of a client
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
              <Mail className="w-3 h-3" /> Email Click
            </span>
            — clicked a service from an email link
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-muted text-muted-foreground">
              <MousePointerClick className="w-3 h-3" /> Direct Click
            </span>
            — selected a service from the /services page directly
          </span>
        </div>

        {/* Stats */}
        {!isLoading && leads.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="text-2xl font-bold">{leads.length}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <Users className="w-3 h-3" /> Total Leads
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formCount}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <FileText className="w-3 h-3" /> Form Submissions
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{repReferralCount}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <UserPlus className="w-3 h-3" /> Rep Referrals
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{clickCount}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <MousePointerClick className="w-3 h-3" /> Interest Clicks
                </div>
              </CardContent>
            </Card>
            {Object.entries(serviceCount).map(([svc, count]) => (
              <Card key={svc}>
                <CardContent className="pt-4 pb-4">
                  <div className="text-2xl font-bold">{count}</div>
                  <div className="text-xs text-muted-foreground mt-1">{SERVICE_LABELS[svc] ?? svc}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, business, phone…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
              data-testid="input-search"
            />
          </div>
          <Select value={serviceFilter} onValueChange={setServiceFilter}>
            <SelectTrigger className="w-44" data-testid="select-service">
              <SelectValue placeholder="All Services" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Services</SelectItem>
              {serviceOptions.map(s => (
                <SelectItem key={s} value={s}>{SERVICE_LABELS[s] ?? s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-48" data-testid="select-type">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="form">Form Submissions only</SelectItem>
              <SelectItem value="rep-referral">Rep Referrals only</SelectItem>
              <SelectItem value="click">Interest Clicks only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {!isLoading && (
          <p className="text-sm text-muted-foreground">
            Showing {filtered.length} of {leads.length} leads
          </p>
        )}

        {/* Table */}
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : isUnauthorized ? (
              <div className="p-8 text-center space-y-3">
                <p className="text-muted-foreground">You must be logged in as an admin to view this page.</p>
                <Button variant="default" size="sm" onClick={() => navigate("/")} data-testid="button-go-to-login">
                  Go to Login
                </Button>
              </div>
            ) : error ? (
              <div className="p-8 text-center text-muted-foreground">
                Failed to load service leads. Please try again.
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No leads match your filters.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Contact</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Business</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Phone</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Service</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Referred By</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Details</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((lead, idx) => {
                    const type = submissionType(lead.source);
                    return (
                      <tr
                        key={lead.id}
                        className={`border-b last:border-0 ${idx % 2 === 0 ? "" : "bg-muted/20"}`}
                        data-testid={`row-lead-${lead.id}`}
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium">
                            {[lead.first_name, lead.last_name].filter(Boolean).join(" ") || "—"}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">{lead.email}</div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground max-w-40 truncate" title={lead.business_name ?? ""}>
                          {lead.business_name || "—"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {formatPhone(lead.phone)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            className={`text-xs no-default-active-elevate ${SERVICE_COLORS[lead.service] ?? "bg-muted text-muted-foreground"}`}
                            data-testid={`badge-service-${lead.id}`}
                          >
                            {SERVICE_LABELS[lead.service] ?? lead.service}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            className={`text-xs no-default-active-elevate flex items-center gap-1 w-fit ${type.className}`}
                            data-testid={`badge-type-${lead.id}`}
                          >
                            {type.icon}
                            {type.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {lead.source === "rep-referral" && lead.utm_source
                            ? <span className="text-purple-600 dark:text-purple-400 font-medium">{lead.utm_source}</span>
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs max-w-52 truncate" title={lead.other_details ?? ""}>
                          {lead.other_details || "—"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                          {formatDate(lead.created_at)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
