import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Users,
  FileText,
  Upload,
  Search,
  ChevronDown,
  ChevronRight,
  Lock,
  LogOut,
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  Calendar,
  DollarSign,
  Briefcase,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { Link } from "wouter";

interface LeadPosition {
  id: string;
  funderName: string;
  productType: string | null;
  fundedAmount: string | null;
  paybackAmount: string | null;
  factorRate: string | null;
  paymentAmount: string | null;
  paymentFrequency: string | null;
  fundedDate: string | null;
  estimatedPayoffDate: string | null;
  remainingBalance: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
}

interface LeadStatement {
  id: number;
  fileName: string;
  uploadedAt: string;
  source: string | null;
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
  time_in_business: string | null;
  status: string;
  created_at: string;
  last_active_at: string | null;
  position_count: string;
  statement_count: string;
  positions: LeadPosition[] | null;
  statements: LeadStatement[] | null;
}

function LoginForm({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  const [credential, setCredential] = useState("");
  const [error, setError] = useState("");

  const loginMutation = useMutation({
    mutationFn: async (cred: string) => {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: cred }),
        credentials: "include",
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Invalid credentials");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/check"] });
      onLoginSuccess();
    },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-8">
        <div className="flex items-center justify-center mb-6">
          <div className="bg-primary/10 rounded-full p-3">
            <Lock className="w-6 h-6 text-primary" />
          </div>
        </div>
        <h1 className="text-xl font-bold text-center mb-1">Admin Access Required</h1>
        <p className="text-sm text-muted-foreground text-center mb-6">
          Enter your credentials to view the /track admin panel
        </p>
        {error && (
          <p className="text-sm text-destructive text-center mb-4">{error}</p>
        )}
        <Input
          type="password"
          placeholder="Password"
          value={credential}
          onChange={(e) => setCredential(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && loginMutation.mutate(credential)}
          className="mb-3"
          data-testid="input-password"
        />
        <Button
          className="w-full"
          onClick={() => loginMutation.mutate(credential)}
          disabled={!credential || loginMutation.isPending}
          data-testid="button-login"
        >
          {loginMutation.isPending ? "Signing in…" : "Sign In"}
        </Button>
      </Card>
    </div>
  );
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function formatCurrency(val: string | null) {
  if (!val) return "—";
  const n = parseFloat(val);
  if (isNaN(n)) return val;
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function AccountRow({ account }: { account: LeadAccount }) {
  const [expanded, setExpanded] = useState(false);

  const posCount = parseInt(account.position_count) || 0;
  const stmtCount = parseInt(account.statement_count) || 0;
  const fullName = [account.first_name, account.last_name].filter(Boolean).join(" ") || null;

  return (
    <div className="border rounded-md overflow-hidden" data-testid={`card-account-${account.id}`}>
      {/* Row header */}
      <button
        className="w-full text-left p-4 hover-elevate flex items-center gap-3"
        onClick={() => setExpanded(!expanded)}
        data-testid={`button-expand-${account.id}`}
      >
        <div className="flex-shrink-0">
          {expanded
            ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
            : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="font-medium text-sm" data-testid={`text-email-${account.id}`}>
              {account.email}
            </span>
            {fullName && (
              <span className="text-muted-foreground text-sm">— {fullName}</span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {account.business_name && (
              <span className="flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                {account.business_name}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Joined {formatDate(account.created_at)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {posCount > 0 && (
            <Badge variant="secondary" data-testid={`badge-positions-${account.id}`}>
              <Briefcase className="w-3 h-3 mr-1" />
              {posCount} position{posCount !== 1 ? "s" : ""}
            </Badge>
          )}
          {stmtCount > 0 && (
            <Badge variant="secondary" data-testid={`badge-statements-${account.id}`}>
              <Upload className="w-3 h-3 mr-1" />
              {stmtCount} doc{stmtCount !== 1 ? "s" : ""}
            </Badge>
          )}
          {posCount === 0 && stmtCount === 0 && (
            <Badge variant="outline" className="text-muted-foreground">No data</Badge>
          )}
          <Badge
            variant={account.status === "active" ? "default" : "secondary"}
            data-testid={`badge-status-${account.id}`}
          >
            {account.status}
          </Badge>
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t bg-muted/30 p-4 space-y-4">
          {/* Profile info */}
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            {account.phone && (
              <div>
                <p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1">
                  <Phone className="w-3 h-3" /> Phone
                </p>
                <p data-testid={`text-phone-${account.id}`}>{account.phone}</p>
              </div>
            )}
            {account.industry && (
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Industry</p>
                <p>{account.industry}</p>
              </div>
            )}
            {account.monthly_revenue && (
              <div>
                <p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1">
                  <DollarSign className="w-3 h-3" /> Monthly Revenue
                </p>
                <p>{account.monthly_revenue}</p>
              </div>
            )}
            {account.time_in_business && (
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Time in Business</p>
                <p>{account.time_in_business}</p>
              </div>
            )}
            {account.last_active_at && (
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Last Active</p>
                <p>{formatDate(account.last_active_at)}</p>
              </div>
            )}
          </div>

          {/* Positions */}
          {posCount > 0 && account.positions && (
            <div>
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-primary" />
                MCA Positions ({posCount})
              </h4>
              <div className="space-y-2">
                {account.positions.map((pos, i) => (
                  <div
                    key={i}
                    className="bg-background rounded-md p-3 text-sm"
                    data-testid={`card-position-${account.id}-${i}`}
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                      <span className="font-medium">{pos.funderName}</span>
                      <div className="flex items-center gap-2">
                        {pos.productType && (
                          <Badge variant="outline" className="text-xs">{pos.productType}</Badge>
                        )}
                        <Badge
                          variant={pos.status === "active" ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {pos.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:grid-cols-4">
                      {pos.fundedAmount && (
                        <div>
                          <span className="block">Funded</span>
                          <span className="font-medium text-foreground">
                            {formatCurrency(pos.fundedAmount)}
                          </span>
                        </div>
                      )}
                      {pos.paybackAmount && (
                        <div>
                          <span className="block">Payback</span>
                          <span className="font-medium text-foreground">
                            {formatCurrency(pos.paybackAmount)}
                          </span>
                        </div>
                      )}
                      {pos.remainingBalance && (
                        <div>
                          <span className="block">Remaining</span>
                          <span className="font-medium text-foreground">
                            {formatCurrency(pos.remainingBalance)}
                          </span>
                        </div>
                      )}
                      {pos.paymentAmount && (
                        <div>
                          <span className="block">Payment</span>
                          <span className="font-medium text-foreground">
                            {formatCurrency(pos.paymentAmount)}
                            {pos.paymentFrequency ? ` / ${pos.paymentFrequency}` : ""}
                          </span>
                        </div>
                      )}
                      {pos.fundedDate && (
                        <div>
                          <span className="block">Funded Date</span>
                          <span className="font-medium text-foreground">{pos.fundedDate}</span>
                        </div>
                      )}
                      {pos.estimatedPayoffDate && (
                        <div>
                          <span className="block">Est. Payoff</span>
                          <span className="font-medium text-foreground">{pos.estimatedPayoffDate}</span>
                        </div>
                      )}
                    </div>
                    {pos.notes && (
                      <p className="text-xs text-muted-foreground mt-2 border-t pt-2">{pos.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bank Statements */}
          {stmtCount > 0 && account.statements && (
            <div>
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Upload className="w-4 h-4 text-primary" />
                Uploaded Documents ({stmtCount})
              </h4>
              <div className="space-y-1.5">
                {account.statements.map((stmt, i) => (
                  <div
                    key={i}
                    className="bg-background rounded-md px-3 py-2 text-sm flex items-center gap-3"
                    data-testid={`row-statement-${account.id}-${i}`}
                  >
                    <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="flex-1 truncate">{stmt.fileName}</span>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {formatDate(stmt.uploadedAt)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {posCount === 0 && stmtCount === 0 && (
            <p className="text-sm text-muted-foreground text-center py-2">
              This account has not added any positions or uploaded any documents yet.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function TrackAdmin() {
  const [search, setSearch] = useState("");

  const { data: authData } = useQuery<{ isAuthenticated: boolean; role: string }>({
    queryKey: ["/api/auth/check"],
    queryFn: async () => {
      const res = await fetch("/api/auth/check", { credentials: "include" });
      if (!res.ok) return { isAuthenticated: false, role: "" };
      return res.json();
    },
  });

  const { data: accounts = [], isLoading, refetch } = useQuery<LeadAccount[]>({
    queryKey: ["/api/admin/lead-portal/leads"],
    queryFn: async () => {
      const res = await fetch("/api/admin/lead-portal/leads", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: authData?.isAuthenticated && authData.role !== "merchant" && authData.role !== "lead",
  });

  if (!authData) return null;

  if (!authData.isAuthenticated || authData.role === "merchant" || authData.role === "lead") {
    return (
      <LoginForm onLoginSuccess={() => queryClient.invalidateQueries({ queryKey: ["/api/auth/check"] })} />
    );
  }

  const filtered = accounts.filter((a) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      a.email?.toLowerCase().includes(q) ||
      a.business_name?.toLowerCase().includes(q) ||
      a.first_name?.toLowerCase().includes(q) ||
      a.last_name?.toLowerCase().includes(q)
    );
  });

  const totalPositions = accounts.reduce((sum, a) => sum + (parseInt(a.position_count) || 0), 0);
  const totalStatements = accounts.reduce((sum, a) => sum + (parseInt(a.statement_count) || 0), 0);
  const withData = accounts.filter(
    (a) => parseInt(a.position_count) > 0 || parseInt(a.statement_count) > 0,
  ).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="font-bold text-base leading-tight">/track Portal — Admin View</h1>
              <p className="text-xs text-muted-foreground">All merchant accounts created via /track</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => refetch()}
              data-testid="button-refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Link href="/dashboard">
              <Button variant="ghost" size="icon" data-testid="button-logout">
                <LogOut className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Summary stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 rounded-full p-2">
                  <Users className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="text-total-accounts">{accounts.length}</p>
                  <p className="text-xs text-muted-foreground">Total Accounts</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 rounded-full p-2">
                  <Briefcase className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="text-total-positions">{totalPositions}</p>
                  <p className="text-xs text-muted-foreground">Positions Entered</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 rounded-full p-2">
                  <Upload className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="text-total-statements">{totalStatements}</p>
                  <p className="text-xs text-muted-foreground">Docs Uploaded</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 rounded-full p-2">
                  <FileText className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="text-accounts-with-data">{withData}</p>
                  <p className="text-xs text-muted-foreground">With Data</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search + list */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2 flex-wrap">
            <CardTitle className="text-base">All Accounts</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by email or business…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                data-testid="input-search"
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground text-sm">Loading accounts…</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                {search ? "No accounts match your search." : "No accounts created yet."}
              </div>
            ) : (
              filtered.map((account) => (
                <AccountRow key={account.id} account={account} />
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
