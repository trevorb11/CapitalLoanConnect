import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { type LoanApplication, type BankStatementUpload } from "@shared/schema";
import { queryClient, getQueryFn } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, ExternalLink, Filter, CheckCircle2, Clock, Lock, LogOut, User, Shield, Landmark, FileText, X, Loader2, TrendingUp, TrendingDown, Minus, Building2, DollarSign, Calendar, Download, Upload, Pencil, Save } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

interface BankConnection {
  id: string;
  businessName: string;
  email: string;
  institutionName: string;
  monthlyRevenue: string;
  avgBalance: string;
  negativeDays: number;
  analysisResult: {
    sba: { status: string; reason: string };
    loc: { status: string; reason: string };
    mca: { status: string; reason: string };
  };
  plaidItemId: string;
  createdAt: string;
}

function StatementsModal({ 
  applicationId, 
  isOpen,
  onClose 
}: { 
  applicationId: string;
  isOpen: boolean;
  onClose: () => void;
}) {
  const { data: statements, isLoading, error, refetch } = useQuery<BankStatement>({
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
    enabled: isOpen && !!applicationId,
    retry: 1,
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" data-testid="dialog-statements">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Landmark className="w-5 h-5" />
            Bank Statements
          </DialogTitle>
          {statements && (
            <p className="text-sm text-muted-foreground">
              {statements.institutionName} | {statements.dateRange.startDate} to {statements.dateRange.endDate}
            </p>
          )}
        </DialogHeader>
        
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="text-center py-12 flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Loading bank statements...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12 flex flex-col items-center gap-3">
              <p className="text-destructive">{(error as Error).message}</p>
              <div className="flex gap-2 mt-4">
                <Button variant="default" onClick={() => refetch()} data-testid="button-retry-statements">
                  Retry
                </Button>
                <Button variant="outline" onClick={onClose}>Close</Button>
              </div>
            </div>
          ) : statements ? (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-3">Accounts</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {statements.accounts.map((account) => (
                    <Card key={account.accountId} className="p-4" data-testid={`card-account-${account.accountId}`}>
                      <div className="flex justify-between items-start gap-2">
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
                        <tr key={txn.transactionId} className="border-t" data-testid={`row-transaction-${txn.transactionId}`}>
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
      </DialogContent>
    </Dialog>
  );
}

function ItemStatementsModal({ 
  plaidItemId, 
  institutionName,
  isOpen,
  onClose 
}: { 
  plaidItemId: string;
  institutionName: string;
  isOpen: boolean;
  onClose: () => void;
}) {
  const { data: statements, isLoading, error, refetch } = useQuery<BankStatement>({
    queryKey: ['/api/plaid/statements-by-item', plaidItemId],
    queryFn: async () => {
      const res = await fetch(`/api/plaid/statements-by-item/${plaidItemId}?months=3`, {
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to fetch statements');
      }
      return res.json();
    },
    enabled: isOpen && !!plaidItemId,
    retry: 1,
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" data-testid="dialog-item-statements">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Landmark className="w-5 h-5" />
            Bank Statements - {institutionName}
          </DialogTitle>
          {statements && (
            <p className="text-sm text-muted-foreground">
              {statements.dateRange.startDate} to {statements.dateRange.endDate}
            </p>
          )}
        </DialogHeader>
        
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="text-center py-12 flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Loading bank statements...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12 flex flex-col items-center gap-3">
              <p className="text-destructive">{(error as Error).message}</p>
              <div className="flex gap-2 mt-4">
                <Button variant="default" onClick={() => refetch()} data-testid="button-retry-item-statements">
                  Retry
                </Button>
                <Button variant="outline" onClick={onClose}>Close</Button>
              </div>
            </div>
          ) : statements ? (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-3">Accounts</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {statements.accounts.map((account) => (
                    <Card key={account.accountId} className="p-4" data-testid={`card-item-account-${account.accountId}`}>
                      <div className="flex justify-between items-start gap-2">
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
                        <tr key={txn.transactionId} className="border-t" data-testid={`row-item-transaction-${txn.transactionId}`}>
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
      </DialogContent>
    </Dialog>
  );
}

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
];

const INDUSTRIES = [
  "Automotive", "Construction", "Transportation", "Health Services",
  "Utilities and Home Services", "Hospitality", "Entertainment and Recreation",
  "Retail Stores", "Professional Services", "Restaurants & Food Services", "Other"
];

function BankStatementsTab() {
  const [selectedConnection, setSelectedConnection] = useState<BankConnection | null>(null);

  const { data: bankConnections, isLoading: connectionsLoading } = useQuery<BankConnection[]>({
    queryKey: ['/api/plaid/all'],
    queryFn: async () => {
      const res = await fetch('/api/plaid/all', {
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error('Failed to fetch bank connections');
      }
      return res.json();
    },
  });

  const { data: bankUploads, isLoading: uploadsLoading } = useQuery<BankStatementUpload[]>({
    queryKey: ['/api/bank-statements/uploads'],
    queryFn: async () => {
      const res = await fetch('/api/bank-statements/uploads', {
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error('Failed to fetch bank statement uploads');
      }
      return res.json();
    },
  });

  const getStatusIcon = (status: string) => {
    if (status === 'High') return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (status === 'Low') return <TrendingDown className="w-4 h-4 text-red-600" />;
    return <Minus className="w-4 h-4 text-yellow-600" />;
  };

  const getStatusBadge = (status: string) => {
    if (status === 'High') return <Badge className="bg-green-600 hover:bg-green-700">High</Badge>;
    if (status === 'Low') return <Badge variant="destructive">Low</Badge>;
    return <Badge variant="secondary">Medium</Badge>;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDownload = async (uploadId: string, fileName: string) => {
    try {
      const res = await fetch(`/api/bank-statements/download/${uploadId}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Download failed');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download error:', error);
    }
  };

  const isLoading = connectionsLoading || uploadsLoading;
  const hasConnections = bankConnections && bankConnections.length > 0;
  const hasUploads = bankUploads && bankUploads.length > 0;
  const isEmpty = !hasConnections && !hasUploads;

  if (isLoading) {
    return (
      <Card className="p-12" data-testid="card-bank-loading">
        <div className="text-center flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading bank statements...</p>
        </div>
      </Card>
    );
  }

  if (isEmpty) {
    return (
      <Card className="p-12" data-testid="card-bank-empty">
        <div className="text-center">
          <Landmark className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Bank Statements</h3>
          <p className="text-muted-foreground">
            Bank connections and uploaded statements will appear here.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Plaid Connections Section */}
        {hasConnections && (
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Landmark className="w-5 h-5" />
              Connected Banks
            </h3>
            <div className="space-y-4">
              {bankConnections.map((connection) => (
                <Card key={connection.id} className="p-6 hover-elevate" data-testid={`card-bank-connection-${connection.id}`}>
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3 flex-wrap">
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                          <Building2 className="w-5 h-5 text-primary" />
                          {connection.businessName}
                        </h3>
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Landmark className="w-3 h-3" />
                          {connection.institutionName}
                        </Badge>
                        <Badge className="bg-emerald-600">Plaid Connected</Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="flex items-center gap-2 text-sm">
                          <DollarSign className="w-4 h-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Monthly Revenue:</span>
                          <span className="font-medium">${parseFloat(connection.monthlyRevenue).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Landmark className="w-4 h-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Avg Balance:</span>
                          <span className="font-medium">${parseFloat(connection.avgBalance).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Connected:</span>
                          <span className="font-medium">{format(new Date(connection.createdAt), 'MMM d, yyyy')}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-sm mb-4">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">{connection.email}</span>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                          {getStatusIcon(connection.analysisResult.sba.status)}
                          <span className="text-sm font-medium">SBA:</span>
                          {getStatusBadge(connection.analysisResult.sba.status)}
                        </div>
                        <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                          {getStatusIcon(connection.analysisResult.loc.status)}
                          <span className="text-sm font-medium">LOC:</span>
                          {getStatusBadge(connection.analysisResult.loc.status)}
                        </div>
                        <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                          {getStatusIcon(connection.analysisResult.mca.status)}
                          <span className="text-sm font-medium">MCA:</span>
                          {getStatusBadge(connection.analysisResult.mca.status)}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button
                        onClick={() => setSelectedConnection(connection)}
                        data-testid={`button-view-bank-statements-${connection.id}`}
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        View Statements
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* PDF Uploads Section */}
        {hasUploads && (
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Uploaded Statements
            </h3>
            <div className="space-y-4">
              {bankUploads.map((upload) => (
                <Card key={upload.id} className="p-6 hover-elevate" data-testid={`card-bank-upload-${upload.id}`}>
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3 flex-wrap">
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                          <FileText className="w-5 h-5 text-primary" />
                          {upload.businessName || 'Unknown Business'}
                        </h3>
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Upload className="w-3 h-3" />
                          PDF Upload
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="flex items-center gap-2 text-sm">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          <span className="text-muted-foreground">File:</span>
                          <span className="font-medium truncate max-w-[200px]">{upload.originalFileName}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <DollarSign className="w-4 h-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Size:</span>
                          <span className="font-medium">{formatFileSize(upload.fileSize)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Uploaded:</span>
                          <span className="font-medium">{upload.createdAt ? format(new Date(upload.createdAt), 'MMM d, yyyy') : 'N/A'}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">{upload.email}</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button
                        onClick={() => handleDownload(upload.id, upload.originalFileName)}
                        data-testid={`button-download-statement-${upload.id}`}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download PDF
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {selectedConnection && (
        <ItemStatementsModal
          plaidItemId={selectedConnection.plaidItemId}
          institutionName={selectedConnection.institutionName}
          isOpen={!!selectedConnection}
          onClose={() => setSelectedConnection(null)}
        />
      )}
    </>
  );
}

export default function Dashboard() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "intake" | "full" | "partial">("all");
  const [selectedAppDetails, setSelectedAppDetails] = useState<LoanApplication | null>(null);
  const [selectedAppForStatements, setSelectedAppForStatements] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<LoanApplication>>({});

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

  const { data: bankConnections } = useQuery<BankConnection[]>({
    queryKey: ['/api/plaid/all'],
    enabled: authData?.isAuthenticated === true,
    queryFn: async () => {
      const res = await fetch('/api/plaid/all', {
        credentials: 'include',
      });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: bankUploads } = useQuery<BankStatementUpload[]>({
    queryKey: ['/api/bank-statements/uploads'],
    enabled: authData?.isAuthenticated === true,
    queryFn: async () => {
      const res = await fetch('/api/bank-statements/uploads', {
        credentials: 'include',
      });
      if (!res.ok) return [];
      return res.json();
    },
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

  const saveApplicationMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<LoanApplication> }) => {
      const res = await fetch(`/api/applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to save changes");
      }
      return res.json();
    },
    onSuccess: (updatedApp) => {
      // Update the selected app details with new data
      setSelectedAppDetails(updatedApp);
      setIsEditMode(false);
      // Refresh the applications list
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
    },
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const handleEditClick = () => {
    if (selectedAppDetails) {
      setEditFormData({
        fullName: selectedAppDetails.fullName || "",
        email: selectedAppDetails.email || "",
        phone: selectedAppDetails.phone || "",
        dateOfBirth: selectedAppDetails.dateOfBirth || "",
        legalBusinessName: selectedAppDetails.legalBusinessName || selectedAppDetails.businessName || "",
        doingBusinessAs: selectedAppDetails.doingBusinessAs || "",
        industry: selectedAppDetails.industry || "",
        ein: selectedAppDetails.ein || "",
        businessStartDate: selectedAppDetails.businessStartDate || "",
        stateOfIncorporation: selectedAppDetails.stateOfIncorporation || "",
        companyEmail: selectedAppDetails.companyEmail || "",
        companyWebsite: selectedAppDetails.companyWebsite || "",
        businessAddress: selectedAppDetails.businessStreetAddress || selectedAppDetails.businessAddress || "",
        city: selectedAppDetails.city || "",
        state: selectedAppDetails.state || "",
        zipCode: selectedAppDetails.zipCode || "",
        ownerAddress1: selectedAppDetails.ownerAddress1 || "",
        ownerAddress2: selectedAppDetails.ownerAddress2 || "",
        ownerCity: selectedAppDetails.ownerCity || "",
        ownerState: selectedAppDetails.ownerState || "",
        ownerZip: selectedAppDetails.ownerZip || "",
        requestedAmount: selectedAppDetails.requestedAmount || "",
        doYouProcessCreditCards: selectedAppDetails.doYouProcessCreditCards || "",
        ownership: selectedAppDetails.ownership || "",
        mcaBalanceAmount: selectedAppDetails.mcaBalanceAmount || "",
        mcaBalanceBankName: selectedAppDetails.mcaBalanceBankName || "",
        ficoScoreExact: selectedAppDetails.ficoScoreExact || selectedAppDetails.personalCreditScoreRange || "",
        socialSecurityNumber: selectedAppDetails.socialSecurityNumber || "",
      });
      setIsEditMode(true);
    }
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setEditFormData({});
  };

  const handleSaveEdit = () => {
    if (selectedAppDetails?.id) {
      saveApplicationMutation.mutate({
        id: selectedAppDetails.id,
        data: editFormData,
      });
    }
  };

  const handleEditFieldChange = (field: string, value: string) => {
    setEditFormData(prev => ({ ...prev, [field]: value }));
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
            (filterStatus === "full" && app.isFullApplicationCompleted) ||
            (filterStatus === "partial" && !app.isCompleted && !app.isFullApplicationCompleted);

          return matchesSearch && matchesFilter;
        })
        .sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        })
    : [];

  const emailsWithBankData = new Set<string>();
  bankConnections?.forEach((c) => c.email && emailsWithBankData.add(c.email.toLowerCase()));
  bankUploads?.forEach((u) => u.email && emailsWithBankData.add(u.email.toLowerCase()));
  
  const appsWithBankData = applications?.filter((a) => 
    a.plaidItemId || (a.email && emailsWithBankData.has(a.email.toLowerCase()))
  ).length || 0;

  const stats = {
    total: applications?.length || 0,
    intakeOnly: applications?.filter((a) => a.isCompleted && !a.isFullApplicationCompleted).length || 0,
    fullCompleted: applications?.filter((a) => a.isFullApplicationCompleted).length || 0,
    partial: applications?.filter((a) => !a.isCompleted && !a.isFullApplicationCompleted).length || 0,
    bankConnected: appsWithBankData,
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="p-6" data-testid="card-stat-total">
            <div className="flex items-center justify-between gap-2">
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
            <div className="flex items-center justify-between gap-2">
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
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Full Applications</p>
                <p className="text-3xl font-bold" data-testid="text-full-count">{stats.fullCompleted}</p>
              </div>
              <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </Card>

          <Card className="p-6" data-testid="card-stat-bank">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Bank Connected</p>
                <p className="text-3xl font-bold" data-testid="text-bank-count">{stats.bankConnected}</p>
              </div>
              <div className="w-12 h-12 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                <Landmark className="w-6 h-6 text-emerald-500" />
              </div>
            </div>
          </Card>
        </div>

        <Tabs defaultValue="applications" className="w-full">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <TabsList data-testid="tabs-dashboard">
              <TabsTrigger value="applications" data-testid="tab-applications">
                <FileText className="w-4 h-4 mr-2" />
                Applications
              </TabsTrigger>
              <TabsTrigger value="bank-statements" data-testid="tab-bank-statements">
                <Landmark className="w-4 h-4 mr-2" />
                Bank Statements
              </TabsTrigger>
            </TabsList>
            <div className="flex gap-2 w-full md:w-auto">
              <Button
                variant="outline"
                onClick={() => window.open("/api/application-template", "_blank")}
                data-testid="button-download-template"
                className="flex-1 md:flex-none"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Template
              </Button>
              <Button
                variant="outline"
                onClick={() => window.open("/api/applications/export/csv", "_blank")}
                data-testid="button-export-csv"
                className="flex-1 md:flex-none"
              >
                <FileText className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>

          <TabsContent value="applications">
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
              <Button
                variant={filterStatus === "partial" ? "default" : "outline"}
                onClick={() => setFilterStatus("partial")}
                data-testid="button-filter-partial"
              >
                Partial
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedAppDetails(app)}
                      data-testid={`button-view-details-${app.id}`}
                    >
                      <Search className="w-4 h-4 mr-2" />
                      View Details
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => window.open(`/agent/application/${app.id}`, "_blank")}
                      data-testid={`button-view-application-${app.id}`}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View Application
                    </Button>
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
          </TabsContent>

          <TabsContent value="bank-statements">
            <BankStatementsTab />
          </TabsContent>
        </Tabs>
      </div>

      <StatementsModal
        applicationId={selectedAppForStatements || ''}
        isOpen={!!selectedAppForStatements}
        onClose={() => setSelectedAppForStatements(null)}
      />

      {/* Application Details Dialog */}
      <Dialog open={!!selectedAppDetails} onOpenChange={(open) => { if (!open) { setSelectedAppDetails(null); setIsEditMode(false); setEditFormData({}); } }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 flex-wrap">
              {isEditMode ? "Edit Application" : "Application Details"}
              {selectedAppDetails?.isFullApplicationCompleted ? (
                <Badge variant="default" className="bg-green-600">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Full App
                </Badge>
              ) : selectedAppDetails?.isCompleted ? (
                <Badge variant="secondary">
                  <Clock className="w-3 h-3 mr-1" />
                  Intake Only
                </Badge>
              ) : (
                <Badge variant="outline">Incomplete</Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedAppDetails && !isEditMode && (
            <div className="space-y-6">
              {/* Contact Information */}
              <div>
                <h4 className="font-semibold text-sm text-muted-foreground mb-3 uppercase tracking-wide">Contact Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div><span className="font-medium">Full Name:</span> {selectedAppDetails.fullName || "N/A"}</div>
                  <div><span className="font-medium">Email:</span> {selectedAppDetails.email || "N/A"}</div>
                  <div><span className="font-medium">Phone:</span> {selectedAppDetails.phone || "N/A"}</div>
                  {selectedAppDetails.dateOfBirth && (
                    <div><span className="font-medium">DOB:</span> {selectedAppDetails.dateOfBirth}</div>
                  )}
                </div>
              </div>

              {/* Business Information */}
              <div>
                <h4 className="font-semibold text-sm text-muted-foreground mb-3 uppercase tracking-wide">Business Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div><span className="font-medium">Legal Name:</span> {selectedAppDetails.legalBusinessName || selectedAppDetails.businessName || "N/A"}</div>
                  <div><span className="font-medium">DBA:</span> {selectedAppDetails.doingBusinessAs || "N/A"}</div>
                  <div><span className="font-medium">Industry:</span> {selectedAppDetails.industry || "N/A"}</div>
                  <div><span className="font-medium">EIN:</span> {selectedAppDetails.ein || "N/A"}</div>
                  <div><span className="font-medium">Start Date:</span> {selectedAppDetails.businessStartDate || "N/A"}</div>
                  <div><span className="font-medium">State of Inc:</span> {selectedAppDetails.stateOfIncorporation || "N/A"}</div>
                  <div><span className="font-medium">Company Email:</span> {selectedAppDetails.companyEmail || "N/A"}</div>
                  <div><span className="font-medium">Website:</span> {selectedAppDetails.companyWebsite || "N/A"}</div>
                </div>
              </div>

              {/* Business Address */}
              {(selectedAppDetails.businessStreetAddress || selectedAppDetails.businessAddress || selectedAppDetails.city) && (
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground mb-3 uppercase tracking-wide">Business Address</h4>
                  <div className="text-sm">
                    <p>{selectedAppDetails.businessStreetAddress || selectedAppDetails.businessAddress || "N/A"}</p>
                    <p>{selectedAppDetails.businessCsz || `${selectedAppDetails.city || ""} ${selectedAppDetails.state || ""} ${selectedAppDetails.zipCode || ""}`.trim() || "N/A"}</p>
                  </div>
                </div>
              )}

              {/* Owner Address (for full applications) */}
              {selectedAppDetails.ownerAddress1 && (
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground mb-3 uppercase tracking-wide">Owner Address</h4>
                  <div className="text-sm">
                    <p>{selectedAppDetails.ownerAddress1} {selectedAppDetails.ownerAddress2 || ""}</p>
                    <p>{selectedAppDetails.ownerCsz || `${selectedAppDetails.ownerCity || ""} ${selectedAppDetails.ownerState || ""} ${selectedAppDetails.ownerZip || ""}`.trim() || "N/A"}</p>
                  </div>
                </div>
              )}

              {/* Financial Information */}
              <div>
                <h4 className="font-semibold text-sm text-muted-foreground mb-3 uppercase tracking-wide">Financial Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div><span className="font-medium">Requested Amount:</span> {selectedAppDetails.requestedAmount ? `$${Number(selectedAppDetails.requestedAmount).toLocaleString()}` : "N/A"}</div>
                  <div><span className="font-medium">Credit Cards:</span> {selectedAppDetails.doYouProcessCreditCards || "N/A"}</div>
                  {(selectedAppDetails.personalCreditScoreRange || selectedAppDetails.ficoScoreExact) && (
                    <div><span className="font-medium">Credit Score:</span> {selectedAppDetails.ficoScoreExact || selectedAppDetails.personalCreditScoreRange}</div>
                  )}
                  {selectedAppDetails.ownership && (
                    <div><span className="font-medium">Ownership %:</span> {selectedAppDetails.ownership}%</div>
                  )}
                  {selectedAppDetails.mcaBalanceAmount && (
                    <div><span className="font-medium">MCA Balance:</span> ${Number(selectedAppDetails.mcaBalanceAmount).toLocaleString()}</div>
                  )}
                  {selectedAppDetails.mcaBalanceBankName && (
                    <div><span className="font-medium">MCA Bank:</span> {selectedAppDetails.mcaBalanceBankName}</div>
                  )}
                </div>
              </div>

              {/* Agent Information */}
              {selectedAppDetails.agentName && (
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground mb-3 uppercase tracking-wide">Agent Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div><span className="font-medium">Agent:</span> {selectedAppDetails.agentName}</div>
                    <div><span className="font-medium">Agent Email:</span> {selectedAppDetails.agentEmail || "N/A"}</div>
                  </div>
                </div>
              )}

              {/* Progress Information for Partial Applications */}
              {!selectedAppDetails.isCompleted && !selectedAppDetails.isFullApplicationCompleted && (
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                  <h4 className="font-semibold text-sm text-amber-800 dark:text-amber-200 mb-2">Application Progress</h4>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    This application is incomplete. The user stopped at step {selectedAppDetails.currentStep || 1} of the intake process.
                    Consider following up with the applicant to help them complete their application.
                  </p>
                </div>
              )}

              {/* Metadata */}
              <div className="pt-4 border-t">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-muted-foreground">
                  <div>Created: {selectedAppDetails.createdAt ? format(new Date(selectedAppDetails.createdAt), "MMM d, yyyy h:mm a") : "N/A"}</div>
                  <div>Updated: {selectedAppDetails.updatedAt ? format(new Date(selectedAppDetails.updatedAt), "MMM d, yyyy h:mm a") : "N/A"}</div>
                  <div>ID: {selectedAppDetails.id}</div>
                  {selectedAppDetails.ghlContactId && <div>GHL ID: {selectedAppDetails.ghlContactId}</div>}
                </div>
              </div>

              {/* Action Buttons - View Application available for all apps */}
              <div className="flex gap-3 pt-4 border-t flex-wrap">
                <Button
                  variant="outline"
                  onClick={handleEditClick}
                  data-testid="button-edit-application"
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit Application
                </Button>
                <Button
                  onClick={() => window.open(`/agent/application/${selectedAppDetails.id}`, "_blank")}
                  data-testid="button-view-application"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View Application
                </Button>
              </div>
            </div>
          )}

          {/* Edit Mode Form */}
          {selectedAppDetails && isEditMode && (
            <div className="space-y-6">
              {/* Error Display */}
              {saveApplicationMutation.isError && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                  <p className="text-sm text-destructive">{(saveApplicationMutation.error as Error).message}</p>
                </div>
              )}

              {/* Contact Information */}
              <div>
                <h4 className="font-semibold text-sm text-muted-foreground mb-3 uppercase tracking-wide">Contact Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-fullName">Full Name</Label>
                    <Input
                      id="edit-fullName"
                      value={editFormData.fullName || ""}
                      onChange={(e) => handleEditFieldChange("fullName", e.target.value)}
                      placeholder="Full Name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-email">Email</Label>
                    <Input
                      id="edit-email"
                      type="email"
                      value={editFormData.email || ""}
                      onChange={(e) => handleEditFieldChange("email", e.target.value)}
                      placeholder="Email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-phone">Phone</Label>
                    <Input
                      id="edit-phone"
                      value={editFormData.phone || ""}
                      onChange={(e) => handleEditFieldChange("phone", e.target.value)}
                      placeholder="Phone"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-dateOfBirth">Date of Birth</Label>
                    <Input
                      id="edit-dateOfBirth"
                      type="date"
                      value={editFormData.dateOfBirth || ""}
                      onChange={(e) => handleEditFieldChange("dateOfBirth", e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Business Information */}
              <div>
                <h4 className="font-semibold text-sm text-muted-foreground mb-3 uppercase tracking-wide">Business Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-legalBusinessName">Legal Business Name</Label>
                    <Input
                      id="edit-legalBusinessName"
                      value={editFormData.legalBusinessName || ""}
                      onChange={(e) => handleEditFieldChange("legalBusinessName", e.target.value)}
                      placeholder="Legal Business Name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-doingBusinessAs">DBA</Label>
                    <Input
                      id="edit-doingBusinessAs"
                      value={editFormData.doingBusinessAs || ""}
                      onChange={(e) => handleEditFieldChange("doingBusinessAs", e.target.value)}
                      placeholder="Doing Business As"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-industry">Industry</Label>
                    <Select
                      value={editFormData.industry || ""}
                      onValueChange={(value) => handleEditFieldChange("industry", value)}
                    >
                      <SelectTrigger id="edit-industry">
                        <SelectValue placeholder="Select Industry" />
                      </SelectTrigger>
                      <SelectContent>
                        {INDUSTRIES.map((ind) => (
                          <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-ein">EIN</Label>
                    <Input
                      id="edit-ein"
                      value={editFormData.ein || ""}
                      onChange={(e) => handleEditFieldChange("ein", e.target.value)}
                      placeholder="XX-XXXXXXX"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-businessStartDate">Business Start Date</Label>
                    <Input
                      id="edit-businessStartDate"
                      type="date"
                      value={editFormData.businessStartDate || ""}
                      onChange={(e) => handleEditFieldChange("businessStartDate", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-stateOfIncorporation">State of Incorporation</Label>
                    <Select
                      value={editFormData.stateOfIncorporation || ""}
                      onValueChange={(value) => handleEditFieldChange("stateOfIncorporation", value)}
                    >
                      <SelectTrigger id="edit-stateOfIncorporation">
                        <SelectValue placeholder="Select State" />
                      </SelectTrigger>
                      <SelectContent>
                        {US_STATES.map((state) => (
                          <SelectItem key={state} value={state}>{state}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-companyEmail">Company Email</Label>
                    <Input
                      id="edit-companyEmail"
                      type="email"
                      value={editFormData.companyEmail || ""}
                      onChange={(e) => handleEditFieldChange("companyEmail", e.target.value)}
                      placeholder="Company Email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-companyWebsite">Website</Label>
                    <Input
                      id="edit-companyWebsite"
                      value={editFormData.companyWebsite || ""}
                      onChange={(e) => handleEditFieldChange("companyWebsite", e.target.value)}
                      placeholder="www.example.com"
                    />
                  </div>
                </div>
              </div>

              {/* Business Address */}
              <div>
                <h4 className="font-semibold text-sm text-muted-foreground mb-3 uppercase tracking-wide">Business Address</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="edit-businessAddress">Street Address</Label>
                    <Input
                      id="edit-businessAddress"
                      value={editFormData.businessAddress || ""}
                      onChange={(e) => handleEditFieldChange("businessAddress", e.target.value)}
                      placeholder="Street Address"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-city">City</Label>
                    <Input
                      id="edit-city"
                      value={editFormData.city || ""}
                      onChange={(e) => handleEditFieldChange("city", e.target.value)}
                      placeholder="City"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-state">State</Label>
                      <Select
                        value={editFormData.state || ""}
                        onValueChange={(value) => handleEditFieldChange("state", value)}
                      >
                        <SelectTrigger id="edit-state">
                          <SelectValue placeholder="State" />
                        </SelectTrigger>
                        <SelectContent>
                          {US_STATES.map((state) => (
                            <SelectItem key={state} value={state}>{state}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-zipCode">ZIP Code</Label>
                      <Input
                        id="edit-zipCode"
                        value={editFormData.zipCode || ""}
                        onChange={(e) => handleEditFieldChange("zipCode", e.target.value)}
                        placeholder="ZIP"
                        maxLength={5}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Owner Address */}
              <div>
                <h4 className="font-semibold text-sm text-muted-foreground mb-3 uppercase tracking-wide">Owner Address</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-ownerAddress1">Address Line 1</Label>
                    <Input
                      id="edit-ownerAddress1"
                      value={editFormData.ownerAddress1 || ""}
                      onChange={(e) => handleEditFieldChange("ownerAddress1", e.target.value)}
                      placeholder="Street Address"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-ownerAddress2">Address Line 2</Label>
                    <Input
                      id="edit-ownerAddress2"
                      value={editFormData.ownerAddress2 || ""}
                      onChange={(e) => handleEditFieldChange("ownerAddress2", e.target.value)}
                      placeholder="Apt, Suite, etc."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-ownerCity">City</Label>
                    <Input
                      id="edit-ownerCity"
                      value={editFormData.ownerCity || ""}
                      onChange={(e) => handleEditFieldChange("ownerCity", e.target.value)}
                      placeholder="City"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-ownerState">State</Label>
                      <Select
                        value={editFormData.ownerState || ""}
                        onValueChange={(value) => handleEditFieldChange("ownerState", value)}
                      >
                        <SelectTrigger id="edit-ownerState">
                          <SelectValue placeholder="State" />
                        </SelectTrigger>
                        <SelectContent>
                          {US_STATES.map((state) => (
                            <SelectItem key={state} value={state}>{state}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-ownerZip">ZIP Code</Label>
                      <Input
                        id="edit-ownerZip"
                        value={editFormData.ownerZip || ""}
                        onChange={(e) => handleEditFieldChange("ownerZip", e.target.value)}
                        placeholder="ZIP"
                        maxLength={5}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Financial Information */}
              <div>
                <h4 className="font-semibold text-sm text-muted-foreground mb-3 uppercase tracking-wide">Financial Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-requestedAmount">Requested Amount</Label>
                    <Input
                      id="edit-requestedAmount"
                      value={editFormData.requestedAmount || ""}
                      onChange={(e) => handleEditFieldChange("requestedAmount", e.target.value)}
                      placeholder="$0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-doYouProcessCreditCards">Process Credit Cards?</Label>
                    <Select
                      value={editFormData.doYouProcessCreditCards || ""}
                      onValueChange={(value) => handleEditFieldChange("doYouProcessCreditCards", value)}
                    >
                      <SelectTrigger id="edit-doYouProcessCreditCards">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Yes">Yes</SelectItem>
                        <SelectItem value="No">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-ficoScoreExact">FICO Score</Label>
                    <Input
                      id="edit-ficoScoreExact"
                      value={editFormData.ficoScoreExact || ""}
                      onChange={(e) => handleEditFieldChange("ficoScoreExact", e.target.value)}
                      placeholder="e.g. 720"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-ownership">Ownership %</Label>
                    <Input
                      id="edit-ownership"
                      value={editFormData.ownership || ""}
                      onChange={(e) => handleEditFieldChange("ownership", e.target.value)}
                      placeholder="100"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-mcaBalanceAmount">MCA Balance</Label>
                    <Input
                      id="edit-mcaBalanceAmount"
                      value={editFormData.mcaBalanceAmount || ""}
                      onChange={(e) => handleEditFieldChange("mcaBalanceAmount", e.target.value)}
                      placeholder="$0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-mcaBalanceBankName">MCA Bank Name</Label>
                    <Input
                      id="edit-mcaBalanceBankName"
                      value={editFormData.mcaBalanceBankName || ""}
                      onChange={(e) => handleEditFieldChange("mcaBalanceBankName", e.target.value)}
                      placeholder="Bank Name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-socialSecurityNumber">SSN</Label>
                    <Input
                      id="edit-socialSecurityNumber"
                      value={editFormData.socialSecurityNumber || ""}
                      onChange={(e) => handleEditFieldChange("socialSecurityNumber", e.target.value)}
                      placeholder="XXX-XX-XXXX"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  onClick={handleSaveEdit}
                  disabled={saveApplicationMutation.isPending}
                  data-testid="button-save-application"
                >
                  {saveApplicationMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCancelEdit}
                  disabled={saveApplicationMutation.isPending}
                  data-testid="button-cancel-edit"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
