import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Users, ExternalLink, TrendingUp, Mail, MousePointerClick } from "lucide-react";

interface AdsLeadContact {
  id: string;
  name: string;
  businessName: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  monthlyRevenue: string | null;
  source: string;
  tags: string[];
  leadType: string;
  lastActivity: string;
}

interface AdsLeadsResponse {
  contacts: AdsLeadContact[];
  total: number;
}

const LEAD_TYPE_COLORS: Record<string, string> = {
  "Clicked through Email": "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  "Interest Email": "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  "Custom Email": "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  "PF Email": "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
};

function formatRevenue(value: string | null): string {
  if (!value) return "—";
  const num = parseFloat(value.toString().replace(/[^0-9.]/g, ""));
  if (isNaN(num)) return value;
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(0)}K`;
  return `$${num.toFixed(0)}`;
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return iso;
  }
}

function formatPhone(phone: string): string {
  if (!phone) return "—";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits[0] === "1") {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

export default function AdsLeads() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [leadTypeFilter, setLeadTypeFilter] = useState("all");

  const { data, isLoading, error } = useQuery<AdsLeadsResponse>({
    queryKey: ["/api/ads-leads"],
  });

  const contacts = data?.contacts || [];

  const leadTypeOptions = useMemo(() => {
    const types = new Set(contacts.map(c => c.leadType));
    return Array.from(types).sort();
  }, [contacts]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return contacts.filter(c => {
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.businessName.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.city.toLowerCase().includes(q) ||
        c.state.toLowerCase().includes(q);
      const matchesType = leadTypeFilter === "all" || c.leadType === leadTypeFilter;
      return matchesSearch && matchesType;
    });
  }, [contacts, search, leadTypeFilter]);

  const stats = useMemo(() => {
    const byType: Record<string, number> = {};
    for (const c of contacts) {
      byType[c.leadType] = (byType[c.leadType] || 0) + 1;
    }
    return byType;
  }, [contacts]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <MousePointerClick className="w-5 h-5 text-primary" />
              Ads Leads
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              GHL contacts who clicked through ads &amp; email campaigns
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate("/leads")} data-testid="link-leads-dashboard">
            <TrendingUp className="w-4 h-4 mr-1" />
            Leads Dashboard
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-5">
        {/* Stats row */}
        {!isLoading && contacts.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="text-2xl font-bold">{contacts.length}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <Users className="w-3 h-3" /> Total Contacts
                </div>
              </CardContent>
            </Card>
            {Object.entries(stats).map(([type, count]) => (
              <Card key={type}>
                <CardContent className="pt-4 pb-4">
                  <div className="text-2xl font-bold">{count}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <Mail className="w-3 h-3" /> {type}
                  </div>
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
              placeholder="Search by name, business, email, phone…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
              data-testid="input-search"
            />
          </div>
          <Select value={leadTypeFilter} onValueChange={setLeadTypeFilter}>
            <SelectTrigger className="w-52" data-testid="select-lead-type">
              <SelectValue placeholder="All Lead Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Lead Types</SelectItem>
              {leadTypeOptions.map(t => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Result count */}
        {!isLoading && (
          <p className="text-sm text-muted-foreground">
            Showing {filtered.length} of {contacts.length} contacts
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
            ) : error ? (
              <div className="p-8 text-center text-muted-foreground">
                Failed to load contacts. Please try again.
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No contacts match your search.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Business</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Contact</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Monthly Revenue</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Location</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Lead Type</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Source</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Last Activity</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((contact, idx) => (
                    <tr
                      key={contact.id}
                      className={`border-b last:border-0 hover-elevate ${idx % 2 === 0 ? "" : "bg-muted/20"}`}
                      data-testid={`row-contact-${contact.id}`}
                    >
                      <td className="px-4 py-3 font-medium">{contact.name}</td>
                      <td className="px-4 py-3 text-muted-foreground max-w-48 truncate" title={contact.businessName}>
                        {contact.businessName || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div>{contact.email || "—"}</div>
                        <div className="text-muted-foreground text-xs mt-0.5">{formatPhone(contact.phone)}</div>
                      </td>
                      <td className="px-4 py-3 text-green-600 dark:text-green-400 font-medium">
                        {formatRevenue(contact.monthlyRevenue)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {[contact.city, contact.state].filter(Boolean).join(", ") || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          className={`text-xs no-default-active-elevate ${LEAD_TYPE_COLORS[contact.leadType] || "bg-muted text-muted-foreground"}`}
                          data-testid={`badge-lead-type-${contact.id}`}
                        >
                          {contact.leadType}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {contact.source || "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {formatDate(contact.lastActivity)}
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/rep-console/${contact.id}`)}
                          data-testid={`button-open-contact-${contact.id}`}
                        >
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
