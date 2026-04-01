import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useRoute, Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Building2,
  User,
  Mail,
  Phone,
  FileText,
  ThumbsUp,
  ThumbsDown,
  Banknote,
  FolderArchive,
  MessageSquare,
  Clock,
  Search,
  Loader2,
  ShieldAlert,
  ExternalLink,
  DollarSign,
  Calendar,
  Shield,
  Eye,
  Download,
  CheckCircle2,
  XCircle,
  AlertCircle,
  History,
  Landmark,
} from "lucide-react";

interface AuthState {
  isAuthenticated: boolean;
  role?: "admin" | "agent" | "underwriting";
  agentEmail?: string;
}

interface MerchantSearchResult {
  email: string;
  businessName: string;
  contactName: string;
  hasDecision: boolean;
  status: string;
}

interface MerchantProfileData {
  businessInfo: {
    businessName: string;
    contactName: string;
    phone: string;
    email: string;
    industry: string;
    ein: string;
    timeInBusiness: string;
    monthlyRevenue: string;
    creditScore: string;
    businessAddress: string;
    city: string;
    state: string;
    zipCode: string;
    requestedAmount: string;
  };
  applications: Array<{
    id: string;
    fullName: string;
    businessName: string;
    email: string;
    phone: string;
    isCompleted: boolean;
    isFullApplicationCompleted: boolean;
    currentStep: number;
    agentName: string;
    agentEmail: string;
    requestedAmount: string;
    monthlyRevenue: string;
    creditScore: string;
    createdAt: string;
    updatedAt: string;
    matchedVia?: "email" | "business_name";
  }>;
  approvals: Array<{
    id: string;
    lender: string;
    advanceAmount: string;
    term: string;
    factorRate: string;
    paymentFrequency: string;
    totalPayback: string;
    approvalDate: string;
    approvalDeadline: string;
    assignedRep: string;
    notes: string;
    additionalApprovals: any;
    showOnLetter: boolean;
    approvalSlug: string;
    createdAt: string;
    matchedVia?: "email" | "business_name";
  }>;
  declines: Array<{
    id: string;
    declineReason: string;
    followUpWorthy: boolean;
    followUpDate: string;
    notes: string;
    reviewedBy: string;
    createdAt: string;
    matchedVia?: "email" | "business_name";
  }>;
  fundedDeals: Array<{
    id: string;
    lender: string;
    advanceAmount: string;
    factorRate: string;
    totalPayback: string;
    paymentFrequency: string;
    fundedDate: string;
    term: string;
    assignedRep: string;
    notes: string;
    decisionId: string;
  }>;
  lenderApprovals: Array<{
    id: string;
    lenderName: string;
    approvedAmount: string;
    termLength: string;
    factorRate: string;
    paybackAmount: string;
    productType: string;
    status: string;
    createdAt: string;
    matchedVia?: "email" | "business_name";
  }>;
  documents: Array<{
    id: string;
    type: string;
    name: string;
    fileSize: number;
    category: string;
    createdAt: string;
    viewToken?: string;
    approvalStatus?: string;
    lenderName?: string;
    objectName?: string;
  }>;
  messages: Array<{
    id: string;
    merchantEmail: string;
    senderRole: string;
    senderName: string;
    message: string;
    isRead: boolean;
    createdAt: string;
  }>;
  portalStatus: {
    hasAccount: boolean;
    hasPassword: boolean;
    portalLinkSentAt: string | null;
    createdAt: string | null;
  };
  timeline: Array<{
    type: string;
    date: string;
    summary: string;
    id?: string;
  }>;
}

function fmt$(val: string | number | null | undefined): string {
  if (!val) return "N/A";
  const num = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(num)) return "N/A";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(num);
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return "N/A";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    funded: { label: "Funded", variant: "default" },
    approved: { label: "Approved", variant: "default" },
    declined: { label: "Declined", variant: "destructive" },
    full_app: { label: "Full App", variant: "secondary" },
    intake: { label: "Intake", variant: "outline" },
    partial: { label: "Partial", variant: "outline" },
    unknown: { label: "Unknown", variant: "outline" },
  };
  const info = map[status] || map.unknown;
  return <Badge variant={info.variant}>{info.label}</Badge>;
}

function NameMatchBadge({ matchedVia }: { matchedVia?: "email" | "business_name" }) {
  if (matchedVia !== "business_name") return null;
  return (
    <Badge variant="outline" className="text-[10px] border-amber-400/50 text-amber-500 px-1.5 py-0">
      name match
    </Badge>
  );
}

function MerchantSearch({ onSelect }: { onSelect: (email: string) => void }) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: results, isLoading } = useQuery<MerchantSearchResult[]>({
    queryKey: ["/api/admin/merchant-search", debouncedQuery],
    queryFn: async () => {
      if (debouncedQuery.length < 2) return [];
      const res = await fetch(`/api/admin/merchant-search?q=${encodeURIComponent(debouncedQuery)}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Search failed");
      return res.json();
    },
    enabled: debouncedQuery.length >= 2,
  });

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Building2 className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Merchant Profiles</h2>
        <p className="text-muted-foreground">
          Search by business name, contact name, or email to view the full merchant profile.
        </p>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search merchants..."
          className="pl-10 h-12 text-lg"
          autoFocus
        />
      </div>

      {isLoading && (
        <div className="text-center py-8">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
        </div>
      )}

      {results && results.length > 0 && (
        <div className="space-y-2">
          {results.map((r) => (
            <Card
              key={r.email}
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => onSelect(r.email)}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">{r.businessName || r.email}</p>
                    <p className="text-sm text-muted-foreground">
                      {r.contactName && `${r.contactName} · `}{r.email}
                    </p>
                  </div>
                </div>
                <StatusBadge status={r.status} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {results && results.length === 0 && debouncedQuery.length >= 2 && (
        <p className="text-center text-muted-foreground py-8">No merchants found.</p>
      )}
    </div>
  );
}

function ProfileView({ email, onBack }: { email: string; onBack: () => void }) {
  const { toast } = useToast();

  const { data: profile, isLoading, error } = useQuery<MerchantProfileData>({
    queryKey: ["/api/admin/merchant-profile", email],
    queryFn: async () => {
      const res = await fetch(`/api/admin/merchant-profile/${encodeURIComponent(email)}`, {
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to load profile");
      }
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="text-center py-20">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary mb-3" />
        <p className="text-muted-foreground">Loading merchant profile...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="text-center py-20">
        <p className="text-destructive mb-4">{(error as Error)?.message || "Failed to load profile"}</p>
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Search
        </Button>
      </div>
    );
  }

  const { businessInfo, applications, approvals, declines, fundedDeals, lenderApprovals, documents, messages, portalStatus, timeline } = profile;

  const bankStatements = documents.filter((d) => d.type === "bank_statement");
  const closingDocs = documents.filter((d) => d.category === "closing");

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
      </div>

      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="w-6 h-6" />
            {businessInfo.businessName || email}
          </h2>
          <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
            {businessInfo.contactName && (
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5" /> {businessInfo.contactName}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Mail className="w-3.5 h-3.5" /> {businessInfo.email}
            </span>
            {businessInfo.phone && (
              <span className="flex items-center gap-1">
                <Phone className="w-3.5 h-3.5" /> {businessInfo.phone}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {fundedDeals.length > 0 && <Badge className="bg-green-600">Funded ({fundedDeals.length})</Badge>}
          {approvals.length > 0 && <Badge variant="default">Approved ({approvals.length})</Badge>}
          {declines.length > 0 && <Badge variant="destructive">Declined ({declines.length})</Badge>}
          {applications.length > 0 && <Badge variant="secondary">Apps ({applications.length})</Badge>}
          {portalStatus.hasAccount && (
            <Badge variant="outline" className="border-blue-400 text-blue-400">
              <Shield className="w-3 h-3 mr-1" /> Portal Active
            </Badge>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Applications</p>
          <p className="text-2xl font-bold">{applications.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Approvals</p>
          <p className="text-2xl font-bold text-green-600">{approvals.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Funded Deals</p>
          <p className="text-2xl font-bold text-primary">{fundedDeals.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Documents</p>
          <p className="text-2xl font-bold">{documents.length}</p>
        </Card>
      </div>

      {/* Tabbed Content */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="overview">
            <Building2 className="w-4 h-4 mr-1" /> Overview
          </TabsTrigger>
          <TabsTrigger value="applications">
            <FileText className="w-4 h-4 mr-1" /> Applications
          </TabsTrigger>
          <TabsTrigger value="decisions">
            <ThumbsUp className="w-4 h-4 mr-1" /> Decisions
          </TabsTrigger>
          <TabsTrigger value="documents">
            <FolderArchive className="w-4 h-4 mr-1" /> Documents
          </TabsTrigger>
          <TabsTrigger value="messages">
            <MessageSquare className="w-4 h-4 mr-1" /> Messages
            {messages.filter((m) => !m.isRead && m.senderRole === "merchant").length > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-[10px]">
                {messages.filter((m) => !m.isRead && m.senderRole === "merchant").length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="timeline">
            <History className="w-4 h-4 mr-1" /> Timeline
          </TabsTrigger>
        </TabsList>

        {/* ── OVERVIEW TAB ── */}
        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Business Info */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Building2 className="w-4 h-4" /> Business Information
                </h3>
                <dl className="space-y-3 text-sm">
                  {[
                    ["Business Name", businessInfo.businessName],
                    ["Contact", businessInfo.contactName],
                    ["Email", businessInfo.email],
                    ["Phone", businessInfo.phone],
                    ["Industry", businessInfo.industry],
                    ["EIN", businessInfo.ein],
                    ["Time in Business", businessInfo.timeInBusiness],
                    ["Monthly Revenue", businessInfo.monthlyRevenue ? fmt$(businessInfo.monthlyRevenue) : ""],
                    ["Credit Score", businessInfo.creditScore],
                    ["Requested Amount", businessInfo.requestedAmount ? fmt$(businessInfo.requestedAmount) : ""],
                    ["Address", [businessInfo.businessAddress, businessInfo.city, businessInfo.state, businessInfo.zipCode].filter(Boolean).join(", ")],
                  ]
                    .filter(([, val]) => val)
                    .map(([label, val]) => (
                      <div key={label} className="flex justify-between">
                        <dt className="text-muted-foreground">{label}</dt>
                        <dd className="font-medium text-right max-w-[60%] truncate">{val}</dd>
                      </div>
                    ))}
                </dl>
              </CardContent>
            </Card>

            {/* Portal Status */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Shield className="w-4 h-4" /> Portal Status
                </h3>
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Account Created</dt>
                    <dd>{portalStatus.hasAccount ? <Badge variant="default">Yes</Badge> : <Badge variant="outline">No</Badge>}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Password Set</dt>
                    <dd>{portalStatus.hasPassword ? <Badge variant="default">Yes</Badge> : <Badge variant="outline">No</Badge>}</dd>
                  </div>
                  {portalStatus.portalLinkSentAt && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Link Sent</dt>
                      <dd className="font-medium">{fmtDate(portalStatus.portalLinkSentAt)}</dd>
                    </div>
                  )}
                  {portalStatus.createdAt && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Created</dt>
                      <dd className="font-medium">{fmtDate(portalStatus.createdAt)}</dd>
                    </div>
                  )}
                </dl>

                {/* Recent Activity */}
                <h3 className="font-semibold mt-6 mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Recent Activity
                </h3>
                {timeline.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No activity yet.</p>
                ) : (
                  <div className="space-y-2">
                    {timeline.slice(0, 5).map((item, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-sm">
                        <div className="mt-0.5">
                          {item.type === "application" && <FileText className="w-3.5 h-3.5 text-blue-500" />}
                          {item.type === "approval" && <ThumbsUp className="w-3.5 h-3.5 text-green-500" />}
                          {item.type === "decline" && <ThumbsDown className="w-3.5 h-3.5 text-red-500" />}
                          {item.type === "funded" && <Banknote className="w-3.5 h-3.5 text-primary" />}
                          {item.type === "statement" && <Landmark className="w-3.5 h-3.5 text-orange-500" />}
                          {item.type === "document" && <FolderArchive className="w-3.5 h-3.5 text-purple-500" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="truncate">{item.summary}</p>
                          <p className="text-xs text-muted-foreground">{fmtDate(item.date)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Lender Approvals (from email parsing) */}
            {lenderApprovals.length > 0 && (
              <Card className="md:col-span-2">
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Landmark className="w-4 h-4" /> Lender Approvals (Email)
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Lender</th>
                          <th className="text-left p-2">Amount</th>
                          <th className="text-left p-2">Term</th>
                          <th className="text-left p-2">Product</th>
                          <th className="text-left p-2">Status</th>
                          <th className="text-left p-2">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lenderApprovals.map((la) => (
                          <tr key={la.id} className="border-b">
                            <td className="p-2 font-medium">{la.lenderName}</td>
                            <td className="p-2">{fmt$(la.approvedAmount)}</td>
                            <td className="p-2">{la.termLength || "N/A"}</td>
                            <td className="p-2">{la.productType || "N/A"}</td>
                            <td className="p-2"><Badge variant="outline">{la.status}</Badge></td>
                            <td className="p-2">{fmtDate(la.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* ── APPLICATIONS TAB ── */}
        <TabsContent value="applications" className="mt-6">
          {applications.length === 0 ? (
            <Card className="p-12 text-center">
              <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No applications on file.</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {applications.map((app) => (
                <Card key={app.id}>
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                      <div>
                        <h4 className="font-semibold flex items-center gap-2">
                          {app.businessName || app.fullName || "Unnamed"}
                          {app.isFullApplicationCompleted ? (
                            <Badge className="bg-green-600">Full App Complete</Badge>
                          ) : app.isCompleted ? (
                            <Badge variant="secondary">Intake Complete</Badge>
                          ) : (
                            <Badge variant="outline">Step {app.currentStep || 1}</Badge>
                          )}
                          <NameMatchBadge matchedVia={app.matchedVia} />
                        </h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          ID: {app.id} · Submitted {fmtDate(app.createdAt)}
                          {app.agentName && ` · Agent: ${app.agentName}`}
                          {app.matchedVia === "business_name" && app.email && ` · Email: ${app.email}`}
                        </p>
                      </div>
                      <Link href={`/dashboard`}>
                        <Button variant="outline" size="sm">
                          <ExternalLink className="w-3.5 h-3.5 mr-1" /> View in Dashboard
                        </Button>
                      </Link>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Requested</p>
                        <p className="font-medium">{fmt$(app.requestedAmount)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Monthly Rev</p>
                        <p className="font-medium">{fmt$(app.monthlyRevenue)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Credit Score</p>
                        <p className="font-medium">{app.creditScore || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Last Updated</p>
                        <p className="font-medium">{fmtDate(app.updatedAt)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── DECISIONS TAB ── */}
        <TabsContent value="decisions" className="mt-6">
          <div className="space-y-6">
            {/* Funded Deals */}
            {fundedDeals.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Banknote className="w-5 h-5 text-green-600" /> Funded Deals
                </h3>
                <div className="space-y-3">
                  {fundedDeals.map((deal) => (
                    <Card key={deal.id}>
                      <CardContent className="p-5">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-3">
                          <div>
                            <h4 className="font-semibold">{deal.lender}</h4>
                            <p className="text-sm text-muted-foreground">
                              Funded {fmtDate(deal.fundedDate)}
                              {deal.assignedRep && ` · Rep: ${deal.assignedRep}`}
                            </p>
                          </div>
                          <Badge className="bg-green-600 self-start">Funded</Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                          <div>
                            <p className="text-muted-foreground">Advance</p>
                            <p className="font-medium">{fmt$(deal.advanceAmount)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Factor Rate</p>
                            <p className="font-medium">{deal.factorRate || "N/A"}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Payback</p>
                            <p className="font-medium">{fmt$(deal.totalPayback)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Frequency</p>
                            <p className="font-medium capitalize">{deal.paymentFrequency}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Term</p>
                            <p className="font-medium">{deal.term || "N/A"}</p>
                          </div>
                        </div>
                        {deal.notes && (
                          <p className="text-sm text-muted-foreground mt-3 border-t pt-3">{deal.notes}</p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Approvals */}
            {approvals.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <ThumbsUp className="w-5 h-5 text-blue-600" /> Approvals
                </h3>
                <div className="space-y-3">
                  {approvals.map((a) => (
                    <Card key={a.id}>
                      <CardContent className="p-5">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-3">
                          <div>
                            <h4 className="font-semibold">{a.lender || "Pending lender"}</h4>
                            <p className="text-sm text-muted-foreground">
                              Approved {fmtDate(a.approvalDate || a.createdAt)}
                              {a.assignedRep && ` · Rep: ${a.assignedRep}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="default">Approved</Badge>
                            <NameMatchBadge matchedVia={a.matchedVia} />
                            {a.approvalSlug && (
                              <Link href={`/approved/${a.approvalSlug}`}>
                                <Button variant="ghost" size="sm">
                                  <ExternalLink className="w-3.5 h-3.5 mr-1" /> Letter
                                </Button>
                              </Link>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div>
                            <p className="text-muted-foreground">Amount</p>
                            <p className="font-medium">{fmt$(a.advanceAmount)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Factor Rate</p>
                            <p className="font-medium">{a.factorRate || "N/A"}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Term</p>
                            <p className="font-medium">{a.term || "N/A"}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Payback</p>
                            <p className="font-medium">{fmt$(a.totalPayback)}</p>
                          </div>
                        </div>
                        {a.notes && (
                          <p className="text-sm text-muted-foreground mt-3 border-t pt-3">{a.notes}</p>
                        )}
                        {/* Additional approvals */}
                        {Array.isArray(a.additionalApprovals) && a.additionalApprovals.length > 0 && (
                          <div className="mt-3 border-t pt-3">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Additional Offers</p>
                            {(a.additionalApprovals as any[]).map((aa, idx) => (
                              <div key={idx} className="flex items-center gap-4 text-sm py-1">
                                <span className="font-medium">{aa.lender}</span>
                                <span>{fmt$(aa.amount)}</span>
                                {aa.term && <span>{aa.term}</span>}
                                {aa.factorRate && <span>FR: {aa.factorRate}</span>}
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Declines */}
            {declines.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <ThumbsDown className="w-5 h-5 text-red-500" /> Declines
                </h3>
                <div className="space-y-3">
                  {declines.map((d) => (
                    <Card key={d.id} className="border-red-200/30">
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm text-muted-foreground">{fmtDate(d.createdAt)}</p>
                          <div className="flex items-center gap-2">
                            <Badge variant="destructive">Declined</Badge>
                            <NameMatchBadge matchedVia={d.matchedVia} />
                            {d.followUpWorthy && <Badge variant="outline" className="border-yellow-500 text-yellow-500">Follow Up</Badge>}
                          </div>
                        </div>
                        {d.declineReason && <p className="text-sm mb-2"><strong>Reason:</strong> {d.declineReason}</p>}
                        {d.notes && <p className="text-sm text-muted-foreground">{d.notes}</p>}
                        {d.reviewedBy && <p className="text-xs text-muted-foreground mt-2">Reviewed by: {d.reviewedBy}</p>}
                        {d.followUpDate && <p className="text-xs text-muted-foreground">Follow up: {fmtDate(d.followUpDate)}</p>}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {fundedDeals.length === 0 && approvals.length === 0 && declines.length === 0 && (
              <Card className="p-12 text-center">
                <ThumbsUp className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No underwriting decisions on file.</p>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* ── DOCUMENTS TAB ── */}
        <TabsContent value="documents" className="mt-6">
          {documents.length === 0 ? (
            <Card className="p-12 text-center">
              <FolderArchive className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No documents on file.</p>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Bank Statements */}
              {bankStatements.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Landmark className="w-5 h-5" /> Bank Statements ({bankStatements.length})
                  </h3>
                  <div className="space-y-2">
                    {bankStatements.map((doc) => (
                      <Card key={doc.id}>
                        <CardContent className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-blue-500" />
                            <div>
                              <p className="font-medium text-sm">{doc.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {(doc.fileSize / 1024).toFixed(0)} KB · {fmtDate(doc.createdAt)}
                                {doc.lenderName && ` · ${doc.lenderName}`}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {doc.approvalStatus === "approved" && <Badge className="bg-green-600">Approved</Badge>}
                            {doc.approvalStatus === "declined" && <Badge variant="destructive">Declined</Badge>}
                            {doc.viewToken && (
                              <a href={`/api/bank-statements/public/view/${doc.viewToken}`} target="_blank" rel="noreferrer">
                                <Button variant="ghost" size="sm">
                                  <Eye className="w-3.5 h-3.5 mr-1" /> View
                                </Button>
                              </a>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Closing Documents */}
              {closingDocs.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <FolderArchive className="w-5 h-5" /> Closing Documents ({closingDocs.length})
                  </h3>
                  <div className="space-y-2">
                    {closingDocs.map((doc) => (
                      <Card key={doc.id}>
                        <CardContent className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {doc.type === "voided_check" ? (
                              <Banknote className="w-5 h-5 text-green-500" />
                            ) : (
                              <User className="w-5 h-5 text-purple-500" />
                            )}
                            <div>
                              <p className="font-medium text-sm">
                                {doc.type === "voided_check" ? "Voided Check" : "Driver's License"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {doc.name} · {(doc.fileSize / 1024).toFixed(0)} KB · {fmtDate(doc.createdAt)}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* ── MESSAGES TAB ── */}
        <TabsContent value="messages" className="mt-6">
          {messages.length === 0 ? (
            <Card className="p-12 text-center">
              <MessageSquare className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No messages yet.</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {messages.map((msg) => (
                <Card key={msg.id} className={msg.senderRole === "merchant" ? "border-l-4 border-l-primary" : ""}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={msg.senderRole === "merchant" ? "default" : "secondary"}>
                          {msg.senderRole === "merchant" ? "Merchant" : "Rep"}
                        </Badge>
                        <span className="text-sm font-medium">{msg.senderName}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{fmtDate(msg.createdAt)}</span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── TIMELINE TAB ── */}
        <TabsContent value="timeline" className="mt-6">
          {timeline.length === 0 ? (
            <Card className="p-12 text-center">
              <History className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No activity recorded.</p>
            </Card>
          ) : (
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
              <div className="space-y-4">
                {timeline.map((item, idx) => (
                  <div key={idx} className="flex gap-4 items-start relative">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center z-10 shrink-0 bg-card border">
                      {item.type === "application" && <FileText className="w-4 h-4 text-blue-500" />}
                      {item.type === "approval" && <ThumbsUp className="w-4 h-4 text-green-500" />}
                      {item.type === "decline" && <ThumbsDown className="w-4 h-4 text-red-500" />}
                      {item.type === "funded" && <Banknote className="w-4 h-4 text-green-600" />}
                      {item.type === "statement" && <Landmark className="w-4 h-4 text-orange-500" />}
                      {item.type === "document" && <FolderArchive className="w-4 h-4 text-purple-500" />}
                    </div>
                    <Card className="flex-1">
                      <CardContent className="p-4">
                        <p className="text-sm font-medium">{item.summary}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          <Calendar className="w-3 h-3 inline mr-1" />
                          {fmtDate(item.date)}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function MerchantProfile() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/merchant-profile/:email");
  const [selectedEmail, setSelectedEmail] = useState<string | null>(
    match && params?.email ? decodeURIComponent(params.email) : null
  );

  // Auth check
  const { data: authData, isLoading: authLoading } = useQuery<AuthState>({
    queryKey: ["/api/auth/check"],
    queryFn: async () => {
      const res = await fetch("/api/auth/check", { credentials: "include" });
      if (!res.ok) throw new Error("Not authenticated");
      return res.json();
    },
  });

  useEffect(() => {
    if (match && params?.email) {
      setSelectedEmail(decodeURIComponent(params.email));
    }
  }, [match, params?.email]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!authData?.isAuthenticated || (authData.role !== "admin" && authData.role !== "agent" && authData.role !== "underwriting")) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <ShieldAlert className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-4">You need admin or agent access to view merchant profiles.</p>
          <Link href="/dashboard">
            <Button>Go to Dashboard</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-1" /> Dashboard
              </Button>
            </Link>
            <h1 className="text-lg font-bold">Merchant Profiles</h1>
          </div>
          <Badge variant={authData.role === "admin" ? "default" : "secondary"}>
            {authData.role === "admin" ? (
              <><Shield className="w-3 h-3 mr-1" /> Admin</>
            ) : (
              <><User className="w-3 h-3 mr-1" /> {authData.role}</>
            )}
          </Badge>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {selectedEmail ? (
          <ProfileView
            email={selectedEmail}
            onBack={() => {
              setSelectedEmail(null);
              setLocation("/merchant-profile");
            }}
          />
        ) : (
          <MerchantSearch
            onSelect={(email) => {
              setSelectedEmail(email);
              setLocation(`/merchant-profile/${encodeURIComponent(email)}`);
            }}
          />
        )}
      </div>
    </div>
  );
}
