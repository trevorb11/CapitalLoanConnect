import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { type LoanApplication } from "@shared/schema";
import { queryClient, getQueryFn } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, ExternalLink, Filter, CheckCircle2, Clock, Lock, LogOut, User, Shield, Landmark, FileText } from "lucide-react";
import { format } from "date-fns";

interface AuthState {
  isAuthenticated: boolean;
  role?: 'admin' | 'agent';
  agentEmail?: string;
  agentName?: string;
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
        const data = await res.json();
        throw new Error(data.error || "Login failed");
      }
      return res.json();
    },
    onSuccess: () => {
      onLoginSuccess();
    },
    onError: (err: any) => {
      setError(err.message || "Invalid credentials. Please try again.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    loginMutation.mutate(credential);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#192F56] to-[#19112D] p-4">
      <Card className="w-full max-w-md p-8 bg-card/95 backdrop-blur">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Dashboard Login</h1>
          <p className="text-muted-foreground text-sm">
            Enter your credentials to access the dashboard
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Password or Agent Email
            </label>
            <Input
              type="password"
              value={credential}
              onChange={(e) => setCredential(e.target.value)}
              placeholder="Enter password or email..."
              className="w-full"
              data-testid="input-login-password"
              autoComplete="off"
            />
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md" data-testid="text-login-error">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={!credential || loginMutation.isPending}
            data-testid="button-login"
          >
            {loginMutation.isPending ? "Logging in..." : "Login"}
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t">
          <p className="text-xs text-muted-foreground text-center">
            Admin users use the admin password.
            <br />
            Agents login with their email address.
          </p>
        </div>
      </Card>
    </div>
  );
}

interface BankStatement {
  accounts: Array<{
    accountId: string;
    name: string;
    type: string;
    subtype: string;
    currentBalance: number;
    availableBalance: number | null;
  }>;
  transactions: Array<{
    transactionId: string;
    date: string;
    name: string;
    amount: number;
    category: string[];
    pending: boolean;
  }>;
  institutionName: string;
  dateRange: {
    startDate: string;
    endDate: string;
  };
}

function StatementsModal({ 
  applicationId, 
  onClose 
}: { 
  applicationId: string; 
  onClose: () => void;
}) {
  const { data: statements, isLoading, error } = useQuery<BankStatement>({
    queryKey: ['/api/plaid/statements', applicationId],
    queryFn: async () => {
      const res = await fetch(`/api/plaid/statements/${applicationId}?months=3`, {
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to fetch statements');
      }
      return res.json();
    },
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Bank Statements</h2>
            {statements && (
              <p className="text-sm text-muted-foreground">
                {statements.institutionName} | {statements.dateRange.startDate} to {statements.dateRange.endDate}
              </p>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <span className="sr-only">Close</span>
            &times;
          </Button>
        </div>
        
        <div className="flex-1 overflow-auto p-6">
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading bank statements...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-destructive">{(error as Error).message}</p>
            </div>
          ) : statements ? (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-3">Accounts</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {statements.accounts.map((account) => (
                    <Card key={account.accountId} className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{account.name}</p>
                          <p className="text-sm text-muted-foreground capitalize">{account.type} - {account.subtype}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg">${account.currentBalance.toLocaleString()}</p>
                          {account.availableBalance !== null && (
                            <p className="text-xs text-muted-foreground">Available: ${account.availableBalance.toLocaleString()}</p>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold mb-3">Recent Transactions ({statements.transactions.length})</h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-3">Date</th>
                        <th className="text-left p-3">Description</th>
                        <th className="text-left p-3">Category</th>
                        <th className="text-right p-3">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statements.transactions.slice(0, 50).map((txn) => (
                        <tr key={txn.transactionId} className="border-t">
                          <td className="p-3">{txn.date}</td>
                          <td className="p-3">
                            {txn.name}
                            {txn.pending && <Badge variant="outline" className="ml-2 text-xs">Pending</Badge>}
                          </td>
                          <td className="p-3 text-muted-foreground">{txn.category.join(', ') || 'N/A'}</td>
                          <td className={`p-3 text-right font-medium ${txn.amount < 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {txn.amount < 0 ? '+' : '-'}${Math.abs(txn.amount).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {statements.transactions.length > 50 && (
                    <div className="p-3 text-center text-sm text-muted-foreground bg-muted">
                      Showing 50 of {statements.transactions.length} transactions
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}

export default function Dashboard() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "intake" | "full">("all");
  const [selectedAppForStatements, setSelectedAppForStatements] = useState<string | null>(null);

  const { data: authData, isLoading: authLoading, refetch: refetchAuth } = useQuery<AuthState | null>({
    queryKey: ["/api/auth/check"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const { data: applications, isLoading: appsLoading } = useQuery<LoanApplication[]>({
    queryKey: ["/api/applications"],
    enabled: authData?.isAuthenticated === true,
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/check"] });
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
    },
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const handleLoginSuccess = () => {
    refetchAuth();
    queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#192F56] to-[#19112D]">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  if (!authData?.isAuthenticated) {
    return <LoginForm onLoginSuccess={handleLoginSuccess} />;
  }

  const filteredApplications = applications
    ? applications
        .filter((app) => {
          const matchesSearch =
            (app.fullName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
            (app.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
            (app.businessName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
            (app.legalBusinessName || "").toLowerCase().includes(searchTerm.toLowerCase());

          const matchesFilter =
            filterStatus === "all" ||
            (filterStatus === "intake" && app.isCompleted && !app.isFullApplicationCompleted) ||
            (filterStatus === "full" && app.isFullApplicationCompleted);

          return matchesSearch && matchesFilter;
        })
        .sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        })
    : [];

  const stats = {
    total: applications?.length || 0,
    intakeOnly: applications?.filter((a) => a.isCompleted && !a.isFullApplicationCompleted).length || 0,
    fullCompleted: applications?.filter((a) => a.isFullApplicationCompleted).length || 0,
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h1 className="text-3xl font-bold">
                  {authData.role === "admin" ? "Admin Dashboard" : "Agent Dashboard"}
                </h1>
                {authData.role === "admin" ? (
                  <Badge variant="default" className="bg-primary" data-testid="badge-role-admin">
                    <Shield className="w-3 h-3 mr-1" />
                    Admin
                  </Badge>
                ) : (
                  <Badge variant="secondary" data-testid="badge-role-agent">
                    <User className="w-3 h-3 mr-1" />
                    Agent
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground">
                {authData.role === "admin" 
                  ? "Viewing all loan applications" 
                  : `Viewing applications for ${authData.agentName}`}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4 mr-2" />
              {logoutMutation.isPending ? "Logging out..." : "Logout"}
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6" data-testid="card-stat-total">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  {authData.role === "admin" ? "Total Applications" : "Your Applications"}
                </p>
                <p className="text-3xl font-bold" data-testid="text-total-count">{stats.total}</p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-primary" />
              </div>
            </div>
          </Card>

          <Card className="p-6" data-testid="card-stat-intake">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Intake Only</p>
                <p className="text-3xl font-bold" data-testid="text-intake-count">{stats.intakeOnly}</p>
              </div>
              <div className="w-12 h-12 bg-orange-500/10 rounded-lg flex items-center justify-center">
                <Filter className="w-6 h-6 text-orange-500" />
              </div>
            </div>
          </Card>

          <Card className="p-6" data-testid="card-stat-full">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Full Applications</p>
                <p className="text-3xl font-bold" data-testid="text-full-count">{stats.fullCompleted}</p>
              </div>
              <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </Card>
        </div>

        <Card className="p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search by name, email, or business..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-applications"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={filterStatus === "all" ? "default" : "outline"}
                onClick={() => setFilterStatus("all")}
                data-testid="button-filter-all"
              >
                All
              </Button>
              <Button
                variant={filterStatus === "intake" ? "default" : "outline"}
                onClick={() => setFilterStatus("intake")}
                data-testid="button-filter-intake"
              >
                Intake Only
              </Button>
              <Button
                variant={filterStatus === "full" ? "default" : "outline"}
                onClick={() => setFilterStatus("full")}
                data-testid="button-filter-full"
              >
                Full App
              </Button>
            </div>
          </div>
        </Card>

        {appsLoading ? (
          <Card className="p-12" data-testid="card-loading-state">
            <p className="text-center text-muted-foreground" data-testid="text-loading-message">Loading applications...</p>
          </Card>
        ) : filteredApplications && filteredApplications.length > 0 ? (
          <div className="space-y-4">
            {filteredApplications.map((app) => (
              <Card key={app.id} className="p-6 hover-elevate" data-testid={`card-application-${app.id}`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h3 className="font-semibold text-lg" data-testid={`text-applicant-name-${app.id}`}>
                        {app.fullName || "No name"}
                      </h3>
                      {app.isFullApplicationCompleted ? (
                        <Badge variant="default" className="bg-green-600 hover:bg-green-700" data-testid={`badge-status-full-${app.id}`}>
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Full App
                        </Badge>
                      ) : app.isCompleted ? (
                        <Badge variant="secondary" data-testid={`badge-status-intake-${app.id}`}>
                          <Clock className="w-3 h-3 mr-1" />
                          Intake Only
                        </Badge>
                      ) : (
                        <Badge variant="outline" data-testid={`badge-status-incomplete-${app.id}`}>Incomplete</Badge>
                      )}
                      {authData.role === "admin" && app.agentName && (
                        <Badge variant="outline" className="text-xs" data-testid={`badge-agent-${app.id}`}>
                          <User className="w-3 h-3 mr-1" />
                          {app.agentName}
                        </Badge>
                      )}
                      {app.plaidItemId && (
                        <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-700" data-testid={`badge-plaid-${app.id}`}>
                          <Landmark className="w-3 h-3 mr-1" />
                          Bank Connected
                        </Badge>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                      <div>
                        <span className="font-medium">Email:</span>{" "}
                        <span data-testid={`value-email-${app.id}`}>{app.email || "N/A"}</span>
                      </div>
                      <div>
                        <span className="font-medium">Business:</span>{" "}
                        <span data-testid={`value-business-${app.id}`}>{app.legalBusinessName || app.businessName || "N/A"}</span>
                      </div>
                      <div>
                        <span className="font-medium">Phone:</span>{" "}
                        <span data-testid={`value-phone-${app.id}`}>{app.phone || "N/A"}</span>
                      </div>
                      <div>
                        <span className="font-medium">Submitted:</span>{" "}
                        <span data-testid={`value-submitted-${app.id}`}>{app.createdAt ? format(new Date(app.createdAt), "MMM d, yyyy h:mm a") : "N/A"}</span>
                      </div>
                      {app.requestedAmount && (
                        <div>
                          <span className="font-medium">Amount:</span>{" "}
                          <span data-testid={`value-amount-${app.id}`}>${Number(app.requestedAmount).toLocaleString()}</span>
                        </div>
                      )}
                      {app.industry && (
                        <div>
                          <span className="font-medium">Industry:</span>{" "}
                          <span data-testid={`value-industry-${app.id}`}>{app.industry}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    {app.agentViewUrl ? (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => window.open(app.agentViewUrl!, "_blank")}
                        data-testid={`button-view-application-${app.id}`}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View Application
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" disabled data-testid={`button-no-view-${app.id}`}>
                        No Agent View
                      </Button>
                    )}
                    {app.plaidItemId && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedAppForStatements(app.id)}
                        data-testid={`button-view-statements-${app.id}`}
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        View Statements
                      </Button>
                    )}
                    <p className="text-xs text-muted-foreground text-center" data-testid={`text-app-id-${app.id}`}>ID: {app.id?.slice(0, 8)}...</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12" data-testid="card-empty-state">
            <p className="text-center text-muted-foreground" data-testid="text-empty-message">
              {searchTerm || filterStatus !== "all" 
                ? "No applications match your filters" 
                : authData.role === "agent" 
                  ? "No applications submitted through your link yet"
                  : "No applications yet"}
            </p>
          </Card>
        )}
      </div>

      {selectedAppForStatements && (
        <StatementsModal
          applicationId={selectedAppForStatements}
          onClose={() => setSelectedAppForStatements(null)}
        />
      )}
    </div>
  );
}
