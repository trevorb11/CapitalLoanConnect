import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { type LoanApplication, type BankStatementUpload, type BusinessUnderwritingDecision } from "@shared/schema";
import { queryClient, getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { usePlaidLink } from "react-plaid-link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, ExternalLink, Filter, CheckCircle2, Clock, Lock, LogOut, User, Shield, Landmark, FileText, X, Loader2, TrendingUp, TrendingDown, Minus, Building2, DollarSign, Calendar as CalendarIcon, Download, Upload, Pencil, Save, Bot, AlertTriangle, Star, FolderArchive, ChevronDown, ChevronRight, Sparkles, AlertCircle, ThumbsUp, ThumbsDown, Target, Mail, Eye, Check, FileEdit, Link2, Copy, Plus, Trash2, Banknote } from "lucide-react";
import { Link } from "wouter";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

interface AuthState {
  isAuthenticated: boolean;
  role?: 'admin' | 'agent' | 'partner' | 'underwriting' | 'user';
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

interface BotAttempt {
  id: string;
  email: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  honeypotValue: string | null;
  formType: string | null;
  additionalData: any;
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

interface PlaidStatementData {
  id: string;
  plaidItemId: string;
  statementId: string;
  accountId: string;
  accountName: string | null;
  accountType: string | null;
  accountMask: string | null;
  month: number;
  year: number;
  institutionId: string | null;
  institutionName: string | null;
}

function PlaidStatementsModal({ 
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
  const { toast } = useToast();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  
  const { data, isLoading, error, refetch } = useQuery<{ statements: PlaidStatementData[] }>({
    queryKey: ['/api/plaid/stored-statements', plaidItemId],
    queryFn: async () => {
      const res = await fetch(`/api/plaid/stored-statements/${plaidItemId}`, {
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

  const handleDownload = async (statementId: string, month: number, year: number) => {
    setDownloadingId(statementId);
    try {
      const res = await fetch(`/api/plaid/statements/${plaidItemId}/download/${statementId}`, {
        credentials: 'include',
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to download statement');
      }
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bank-statement-${year}-${String(month).padStart(2, '0')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({ title: "Success", description: "Statement downloaded successfully" });
    } catch (err: any) {
      toast({ 
        title: "Download Failed", 
        description: err.message || "Could not download statement",
        variant: "destructive"
      });
    } finally {
      setDownloadingId(null);
    }
  };

  const getMonthName = (month: number) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[month - 1] || 'Unknown';
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col" data-testid="dialog-plaid-statements">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Bank Statements - {institutionName}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Download official bank statements from your connected account
          </p>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="text-center py-12 flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Loading statements...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12 flex flex-col items-center gap-3">
              <p className="text-destructive">{(error as Error).message}</p>
              <div className="flex gap-2 mt-4">
                <Button variant="default" onClick={() => refetch()} data-testid="button-retry-plaid-statements">
                  Retry
                </Button>
                <Button variant="outline" onClick={onClose}>Close</Button>
              </div>
            </div>
          ) : data?.statements && data.statements.length > 0 ? (
            <div className="space-y-3">
              {data.statements.map((stmt) => (
                <Card key={stmt.id} className="p-4 hover-elevate" data-testid={`card-statement-${stmt.id}`}>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {getMonthName(stmt.month)} {stmt.year}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {stmt.accountName || 'Account'} {stmt.accountMask ? `••${stmt.accountMask}` : ''}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(stmt.statementId, stmt.month, stmt.year)}
                      disabled={downloadingId === stmt.statementId}
                      data-testid={`button-download-statement-${stmt.id}`}
                    >
                      {downloadingId === stmt.statementId ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </>
                      )}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 flex flex-col items-center gap-3">
              <FileText className="w-12 h-12 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No statements available yet</p>
              <p className="text-sm text-muted-foreground">
                Statements may take a few minutes to become available after connecting your bank.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface AssetReportAccount {
  account_id: string;
  name: string;
  official_name: string | null;
  type: string;
  subtype: string | null;
  balances: {
    current: number | null;
    available: number | null;
  };
  days_available: number;
  historical_balances?: Array<{
    date: string;
    current: number;
  }>;
  transactions?: Array<{
    date: string;
    original_description: string;
    amount: number;
  }>;
}

interface AssetReportItem {
  institution_name: string;
  institution_id: string;
  accounts: AssetReportAccount[];
}

interface AssetReportData {
  report: {
    asset_report_id: string;
    date_generated: string;
    days_requested: number;
    items: AssetReportItem[];
  };
  assetReportToken: string;
}

function AssetReportModal({ 
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
  const [isDownloading, setIsDownloading] = useState(false);

  const { data: assetReport, isLoading, error, refetch } = useQuery<AssetReportData>({
    queryKey: ['/api/plaid/asset-report', plaidItemId],
    queryFn: async () => {
      const res = await fetch(`/api/plaid/asset-report/${plaidItemId}?days=90`, {
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || data.error || 'Failed to generate asset report');
      }
      return res.json();
    },
    enabled: isOpen && !!plaidItemId,
    retry: false,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    try {
      const res = await fetch(`/api/plaid/asset-report-pdf/${plaidItemId}?days=90`, {
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error('Failed to download PDF');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `asset_report_${institutionName.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error downloading PDF:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return 'N/A';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col" data-testid="dialog-asset-report">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Asset Report - {institutionName}
          </DialogTitle>
          {assetReport && (
            <p className="text-sm text-muted-foreground">
              Generated: {format(new Date(assetReport.report.date_generated), 'MMM d, yyyy h:mm a')} | 
              {assetReport.report.days_requested} days of data
            </p>
          )}
        </DialogHeader>
        
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="text-center py-12 flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Generating asset report...</p>
              <p className="text-xs text-muted-foreground">This may take 10-30 seconds</p>
            </div>
          ) : error ? (
            <div className="text-center py-12 flex flex-col items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-destructive" />
              <p className="text-destructive">{(error as Error).message}</p>
              <div className="flex gap-2 mt-4">
                <Button variant="default" onClick={() => refetch()} data-testid="button-retry-asset-report">
                  Retry
                </Button>
                <Button variant="outline" onClick={onClose}>Close</Button>
              </div>
            </div>
          ) : assetReport ? (
            <div className="space-y-6">
              {/* Download PDF Button */}
              <div className="flex justify-end">
                <Button 
                  onClick={handleDownloadPdf} 
                  disabled={isDownloading}
                  data-testid="button-download-asset-pdf"
                >
                  {isDownloading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  Download PDF
                </Button>
              </div>

              {/* Accounts Summary */}
              {assetReport.report.items.map((item, itemIndex) => (
                <div key={itemIndex} className="space-y-4">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Landmark className="w-5 h-5" />
                    {item.institution_name}
                  </h3>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {item.accounts.map((account) => (
                      <Card key={account.account_id} className="p-4" data-testid={`card-asset-account-${account.account_id}`}>
                        <div className="flex justify-between items-start gap-2 mb-3">
                          <div>
                            <p className="font-medium">{account.name}</p>
                            {account.official_name && (
                              <p className="text-xs text-muted-foreground">{account.official_name}</p>
                            )}
                            <p className="text-sm text-muted-foreground capitalize mt-1">
                              {account.type}{account.subtype ? ` - ${account.subtype}` : ''}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-lg">{formatCurrency(account.balances.current)}</p>
                            {account.balances.available !== null && (
                              <p className="text-xs text-muted-foreground">
                                Available: {formatCurrency(account.balances.available)}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="text-xs text-muted-foreground">
                          {account.days_available} days of history available
                        </div>

                        {/* Historical Balances Preview */}
                        {account.historical_balances && account.historical_balances.length > 0 && (
                          <div className="mt-3 pt-3 border-t">
                            <p className="text-xs font-medium mb-2">Recent Balance History</p>
                            <div className="space-y-1">
                              {account.historical_balances.slice(0, 5).map((bal, idx) => (
                                <div key={idx} className="flex justify-between text-xs">
                                  <span className="text-muted-foreground">{bal.date}</span>
                                  <span>{formatCurrency(bal.current)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Recent Transactions Preview */}
                        {account.transactions && account.transactions.length > 0 && (
                          <div className="mt-3 pt-3 border-t">
                            <p className="text-xs font-medium mb-2">Recent Transactions ({account.transactions.length} total)</p>
                            <div className="space-y-1 max-h-32 overflow-y-auto">
                              {account.transactions.slice(0, 10).map((txn, idx) => (
                                <div key={idx} className="flex justify-between text-xs gap-2">
                                  <span className="text-muted-foreground flex-shrink-0">{txn.date}</span>
                                  <span className="truncate flex-1">{txn.original_description}</span>
                                  <span className={`flex-shrink-0 ${txn.amount < 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {txn.amount < 0 ? '+' : '-'}{formatCurrency(Math.abs(txn.amount))}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Analysis Result Interface (matching OpenAI analysis response)
interface AnalysisResult {
  overallScore: number;
  qualificationTier: string;
  estimatedMonthlyRevenue: number;
  averageDailyBalance: number;
  redFlags: Array<{
    issue: string;
    severity: "low" | "medium" | "high";
    details: string;
  }>;
  positiveIndicators: Array<{
    indicator: string;
    details: string;
  }>;
  fundingRecommendation: {
    eligible: boolean;
    maxAmount: number;
    estimatedRates: string;
    product: string;
    message: string;
  };
  improvementSuggestions: string[];
  summary: string;
}

interface AnalysisResponse {
  success: boolean;
  analysis: AnalysisResult;
  source: "plaid" | "uploaded";
  institutionName?: string;
  businessName?: string;
  filesProcessed?: number;
  timestamp: string;
}

function AnalysisModal({ 
  isOpen,
  onClose,
  analysisData,
  isLoading,
  error,
  title
}: { 
  isOpen: boolean;
  onClose: () => void;
  analysisData: AnalysisResponse | null;
  isLoading: boolean;
  error: string | null;
  title: string;
}) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 50) return 'Fair';
    if (score >= 30) return 'Poor';
    return 'Very Poor';
  };

  const getSeverityColor = (severity: string) => {
    if (severity === 'high') return 'text-red-600 bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800';
    if (severity === 'medium') return 'text-yellow-600 bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800';
    return 'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800';
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" data-testid="dialog-analysis">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            AI Fundability Analysis - {title}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="text-center py-12 flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="font-medium">Analyzing bank statements...</p>
              <p className="text-sm text-muted-foreground">This may take 15-30 seconds</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
              <p className="text-destructive font-medium">Analysis Failed</p>
              <p className="text-sm text-muted-foreground mt-2">{error}</p>
              <Button variant="outline" onClick={onClose} className="mt-4">Close</Button>
            </div>
          ) : analysisData?.analysis ? (
            <div className="space-y-6 p-2">
              {/* Score Overview */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-4 text-center col-span-1">
                  <p className="text-sm text-muted-foreground mb-1">Fundability Score</p>
                  <p className={`text-4xl font-bold ${getScoreColor(analysisData.analysis.overallScore)}`}>
                    {analysisData.analysis.overallScore}
                  </p>
                  <p className={`text-sm font-medium ${getScoreColor(analysisData.analysis.overallScore)}`}>
                    {getScoreLabel(analysisData.analysis.overallScore)}
                  </p>
                </Card>
                
                <Card className="p-4 text-center">
                  <p className="text-sm text-muted-foreground mb-1">Qualification Tier</p>
                  <p className="text-lg font-semibold">{analysisData.analysis.qualificationTier}</p>
                </Card>
                
                <Card className="p-4 text-center">
                  <p className="text-sm text-muted-foreground mb-1">Est. Monthly Revenue</p>
                  <p className="text-lg font-semibold text-green-600">
                    {formatCurrency(analysisData.analysis.estimatedMonthlyRevenue)}
                  </p>
                </Card>
                
                <Card className="p-4 text-center">
                  <p className="text-sm text-muted-foreground mb-1">Avg Daily Balance</p>
                  <p className="text-lg font-semibold">
                    {formatCurrency(analysisData.analysis.averageDailyBalance)}
                  </p>
                </Card>
              </div>

              {/* Summary */}
              <Card className="p-4">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Executive Summary
                </h3>
                <p className="text-sm text-muted-foreground">{analysisData.analysis.summary}</p>
              </Card>

              {/* Funding Recommendation */}
              <Card className={`p-4 ${analysisData.analysis.fundingRecommendation.eligible ? 'border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-900/10' : 'border-yellow-200 bg-yellow-50/50 dark:border-yellow-800 dark:bg-yellow-900/10'}`}>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  {analysisData.analysis.fundingRecommendation.eligible ? (
                    <ThumbsUp className="w-4 h-4 text-green-600" />
                  ) : (
                    <ThumbsDown className="w-4 h-4 text-yellow-600" />
                  )}
                  Funding Recommendation
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Product</p>
                    <p className="font-medium">{analysisData.analysis.fundingRecommendation.product}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Max Amount</p>
                    <p className="font-medium text-green-600">{formatCurrency(analysisData.analysis.fundingRecommendation.maxAmount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Est. Rates</p>
                    <p className="font-medium">{analysisData.analysis.fundingRecommendation.estimatedRates}</p>
                  </div>
                </div>
                <p className="text-sm">{analysisData.analysis.fundingRecommendation.message}</p>
              </Card>

              {/* Two Column Layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Red Flags */}
                <Card className="p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    Red Flags ({analysisData.analysis.redFlags.length})
                  </h3>
                  {analysisData.analysis.redFlags.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No red flags detected</p>
                  ) : (
                    <div className="space-y-2">
                      {analysisData.analysis.redFlags.map((flag, idx) => (
                        <div key={idx} className={`p-2 rounded border ${getSeverityColor(flag.severity)}`}>
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-sm">{flag.issue}</span>
                            <Badge variant="outline" className="text-xs">{flag.severity}</Badge>
                          </div>
                          <p className="text-xs mt-1 opacity-80">{flag.details}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>

                {/* Positive Indicators */}
                <Card className="p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    Positive Indicators ({analysisData.analysis.positiveIndicators.length})
                  </h3>
                  {analysisData.analysis.positiveIndicators.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No positive indicators found</p>
                  ) : (
                    <div className="space-y-2">
                      {analysisData.analysis.positiveIndicators.map((indicator, idx) => (
                        <div key={idx} className="p-2 rounded border border-green-200 bg-green-50 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400">
                          <span className="font-medium text-sm">{indicator.indicator}</span>
                          <p className="text-xs mt-1 opacity-80">{indicator.details}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>

              {/* Improvement Suggestions */}
              {analysisData.analysis.improvementSuggestions.length > 0 && (
                <Card className="p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Improvement Suggestions
                  </h3>
                  <ul className="space-y-2">
                    {analysisData.analysis.improvementSuggestions.map((suggestion, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <span className="text-primary mt-0.5">•</span>
                        <span>{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              {/* Timestamp */}
              <p className="text-xs text-muted-foreground text-right">
                Analysis generated: {format(new Date(analysisData.timestamp), 'MMM d, yyyy h:mm a')}
              </p>
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

// BusinessDecisionDialogData removed - approvals and declines now use separate dialogs

function ReconnectPlaidButton({ plaidItemId, onSuccess }: { plaidItemId: string; onSuccess: () => void }) {
  const { toast } = useToast();
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: () => {
      toast({ title: "Bank reconnected", description: "Asset reports are now available for this connection." });
      setLinkToken(null);
      onSuccess();
    },
    onExit: () => {
      setLinkToken(null);
    },
  });

  useEffect(() => {
    if (linkToken && ready) {
      open();
    }
  }, [linkToken, ready, open]);

  const handleReconnect = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/plaid/create-update-link-token/${plaidItemId}`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create update link token");
      const data = await res.json();
      setLinkToken(data.link_token);
    } catch {
      toast({ title: "Error", description: "Failed to initiate reconnect. Try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleReconnect}
      disabled={loading}
      data-testid={`button-reconnect-plaid-${plaidItemId}`}
    >
      {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Link2 className="w-4 h-4 mr-2" />}
      Reconnect
    </Button>
  );
}

function BankStatementsTab() {
  const { toast } = useToast();
  const [expandedBusinesses, setExpandedBusinesses] = useState<Set<string>>(new Set());
  const [analysisModalOpen, setAnalysisModalOpen] = useState(false);
  const [analysisData, setAnalysisData] = useState<AnalysisResponse | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisTitle, setAnalysisTitle] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [generatingTokens, setGeneratingTokens] = useState(false);
  const [tokenGenResult, setTokenGenResult] = useState<{ success: boolean; message: string } | null>(null);
  const [updatingApproval, setUpdatingApproval] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesInput, setNotesInput] = useState("");
  
  // Business-level underwriting decision state
  const [declineDialog, setDeclineDialog] = useState<{ businessEmail: string; businessName: string } | null>(null);
  const [declineReason, setDeclineReason] = useState('');
  const [declineFollowUp, setDeclineFollowUp] = useState(false);
  const [declineFollowUpDate, setDeclineFollowUpDate] = useState('');
  const [unqualifiedDialog, setUnqualifiedDialog] = useState<{ businessEmail: string; businessName: string } | null>(null);
  const [unqualifiedReason, setUnqualifiedReason] = useState('');
  const [unqualifiedFollowUp, setUnqualifiedFollowUp] = useState(false);
  const [unqualifiedFollowUpDate, setUnqualifiedFollowUpDate] = useState('');
  const [savingDecision, setSavingDecision] = useState(false);
  const [expandedAdditionalApprovals, setExpandedAdditionalApprovals] = useState<Set<string>>(new Set());

  // Approval form dialog state (for adding/editing a single approval)
  interface FullApprovalEntry {
    id: string;
    lender: string;
    advanceAmount: string;
    term: string;
    paymentFrequency: string;
    factorRate: string;
    maxUpsell: string;
    totalPayback: string;
    netAfterFees: string;
    notes: string;
    approvalDate: string;
    isPrimary: boolean;
    createdAt: string;
  }
  const [approvalFormDialog, setApprovalFormDialog] = useState<{
    businessEmail: string;
    businessName: string;
    editingApprovalId?: string;
  } | null>(null);
  const [approvalForm, setApprovalForm] = useState({
    advanceAmount: '',
    term: '',
    paymentFrequency: 'weekly',
    factorRate: '',
    maxUpsell: '',
    totalPayback: '',
    netAfterFees: '',
    lender: '',
    notes: '',
    approvalDate: new Date().toISOString().split('T')[0],
  });

  const [selectedConnection, setSelectedConnection] = useState<BankConnection | null>(null);
  const [selectedAssetReport, setSelectedAssetReport] = useState<BankConnection | null>(null);
  const [selectedStatements, setSelectedStatements] = useState<BankConnection | null>(null);

  const { data: authData } = useQuery<AuthState | null>({
    queryKey: ['/api/auth/check'],
  });

  const { data: bankConnections, isLoading: connectionsLoading } = useQuery<BankConnection[]>({
    queryKey: ['/api/plaid/all'],
    queryFn: async () => {
      const res = await fetch('/api/plaid/all', { credentials: 'include' });
      if (!res.ok) return [];
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

  // Fetch business-level underwriting decisions
  const { data: underwritingDecisions } = useQuery<BusinessUnderwritingDecision[]>({
    queryKey: ['/api/underwriting-decisions'],
    queryFn: async () => {
      const res = await fetch('/api/underwriting-decisions', {
        credentials: 'include',
      });
      if (!res.ok) {
        return [];
      }
      return res.json();
    },
    enabled: authData?.role === 'admin' || authData?.role === 'underwriting',
  });

  // Helper to get decision for a business by email
  const getBusinessDecision = (email: string): BusinessUnderwritingDecision | undefined => {
    return underwritingDecisions?.find(d => d.businessEmail === email);
  };

  // Helper: get all approvals for a business from the decision's JSONB (migration-aware)
  const getApprovalsForBusiness = (email: string): FullApprovalEntry[] => {
    const decision = getBusinessDecision(email);
    if (!decision || (decision.status !== 'approved' && decision.status !== 'funded')) return [];

    const raw = decision.additionalApprovals as any[] | null;

    // Check if already in new format (has isPrimary field)
    if (raw && raw.length > 0 && raw[0].isPrimary !== undefined) {
      return raw as FullApprovalEntry[];
    }

    // Migration: convert old format to new
    const result: FullApprovalEntry[] = [];

    // Add the primary (top-level columns) as the first entry
    if (decision.advanceAmount || decision.lender) {
      result.push({
        id: 'primary-' + decision.id,
        lender: decision.lender || '',
        advanceAmount: decision.advanceAmount?.toString() || '',
        term: decision.term || '',
        paymentFrequency: decision.paymentFrequency || 'weekly',
        factorRate: decision.factorRate?.toString() || '',
        maxUpsell: decision.maxUpsell?.toString() || '',
        totalPayback: decision.totalPayback?.toString() || '',
        netAfterFees: decision.netAfterFees?.toString() || '',
        notes: decision.notes || '',
        approvalDate: decision.approvalDate ? new Date(decision.approvalDate).toISOString().split('T')[0] : '',
        isPrimary: true,
        createdAt: decision.createdAt ? new Date(decision.createdAt).toISOString() : new Date().toISOString(),
      });
    }

    // Add old-format additional approvals
    if (raw) {
      raw.forEach((old: any, idx: number) => {
        result.push({
          id: 'migrated-' + idx,
          lender: old.lender || '',
          advanceAmount: old.amount || old.advanceAmount || '',
          term: old.term || '',
          paymentFrequency: old.paymentFrequency || 'weekly',
          factorRate: old.factorRate || '',
          maxUpsell: old.maxUpsell || '',
          totalPayback: old.totalPayback || '',
          netAfterFees: old.netAfterFees || '',
          notes: old.notes || '',
          approvalDate: old.approvalDate || '',
          isPrimary: false,
          createdAt: new Date().toISOString(),
        });
      });
    }

    return result;
  };

  const generateApprovalId = () => `appr-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

  // Open approval form dialog (for adding or editing a single approval)
  const openApprovalForm = (businessEmail: string, businessName: string, editingId?: string) => {
    if (editingId) {
      const approvals = getApprovalsForBusiness(businessEmail);
      const existing = approvals.find(a => a.id === editingId);
      if (existing) {
        setApprovalForm({
          advanceAmount: existing.advanceAmount,
          term: existing.term,
          paymentFrequency: existing.paymentFrequency || 'weekly',
          factorRate: existing.factorRate,
          maxUpsell: existing.maxUpsell || '',
          totalPayback: existing.totalPayback,
          netAfterFees: existing.netAfterFees,
          lender: existing.lender,
          notes: existing.notes,
          approvalDate: existing.approvalDate || new Date().toISOString().split('T')[0],
        });
      }
    } else {
      setApprovalForm({
        advanceAmount: '',
        term: '',
        paymentFrequency: 'weekly',
        factorRate: '',
        maxUpsell: '',
        totalPayback: '',
        netAfterFees: '',
        lender: '',
        notes: '',
        approvalDate: new Date().toISOString().split('T')[0],
      });
    }
    setApprovalFormDialog({ businessEmail, businessName, editingApprovalId: editingId });
  };

  // Open decline dialog
  const openDeclineDialog = (businessEmail: string, businessName: string) => {
    const existing = getBusinessDecision(businessEmail);
    setDeclineReason(existing?.declineReason || '');
    setDeclineFollowUp(existing?.followUpWorthy || false);
    setDeclineFollowUpDate(existing?.followUpDate ? new Date(existing.followUpDate).toISOString().split('T')[0] : '');
    setDeclineDialog({ businessEmail, businessName });
  };

  // Open unqualified dialog (didn't even get sent to lenders)
  const openUnqualifiedDialog = (businessEmail: string, businessName: string) => {
    const existing = getBusinessDecision(businessEmail);
    setUnqualifiedReason(existing?.declineReason || '');
    setUnqualifiedFollowUp(existing?.followUpWorthy || false);
    setUnqualifiedFollowUpDate(existing?.followUpDate ? new Date(existing.followUpDate).toISOString().split('T')[0] : '');
    setUnqualifiedDialog({ businessEmail, businessName });
  };

  // Save a single approval (add new or edit existing)
  const handleSaveApproval = async () => {
    if (!approvalFormDialog) return;
    setSavingDecision(true);
    try {
      const { businessEmail, businessName, editingApprovalId } = approvalFormDialog;
      const decision = getBusinessDecision(businessEmail);
      let approvals = getApprovalsForBusiness(businessEmail);

      const newEntry: FullApprovalEntry = {
        id: editingApprovalId || generateApprovalId(),
        lender: approvalForm.lender,
        advanceAmount: approvalForm.advanceAmount,
        term: approvalForm.term,
        paymentFrequency: approvalForm.paymentFrequency,
        factorRate: approvalForm.factorRate,
        maxUpsell: approvalForm.maxUpsell,
        totalPayback: approvalForm.totalPayback,
        netAfterFees: approvalForm.netAfterFees,
        notes: approvalForm.notes,
        approvalDate: approvalForm.approvalDate,
        isPrimary: approvals.length === 0, // First approval is automatically primary
        createdAt: editingApprovalId
          ? (approvals.find(a => a.id === editingApprovalId)?.createdAt || new Date().toISOString())
          : new Date().toISOString(),
      };

      if (editingApprovalId) {
        // Replace existing
        const wasEdited = approvals.find(a => a.id === editingApprovalId);
        newEntry.isPrimary = wasEdited?.isPrimary || false;
        approvals = approvals.map(a => a.id === editingApprovalId ? newEntry : a);
      } else {
        approvals.push(newEntry);
      }

      if (decision) {
        // Update existing decision
        const res = await fetch(`/api/underwriting-decisions/${decision.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ additionalApprovals: approvals }),
        });
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
          console.error('Failed to update approval:', errorData);
          toast({ title: "Save Failed", description: errorData.error || `Server returned ${res.status}`, variant: "destructive" });
          return;
        }
      } else {
        // Create new decision
        const res = await fetch('/api/underwriting-decisions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            businessEmail,
            businessName,
            status: 'approved',
            additionalApprovals: approvals,
          }),
        });
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
          console.error('Failed to create approval:', errorData);
          toast({ title: "Save Failed", description: errorData.error || `Server returned ${res.status}`, variant: "destructive" });
          return;
        }
      }

      queryClient.invalidateQueries({ queryKey: ['/api/underwriting-decisions'] });
      setApprovalFormDialog(null);
      toast({ title: "Approval Saved", description: `Approval ${editingApprovalId ? 'updated' : 'added'} for ${businessName}` });
    } catch (error: any) {
      console.error('Error saving approval:', error);
      toast({ title: "Save Failed", description: error.message || "An unexpected error occurred", variant: "destructive" });
    } finally {
      setSavingDecision(false);
    }
  };

  // Set an approval as primary
  const handleSetPrimary = async (businessEmail: string, approvalId: string) => {
    const decision = getBusinessDecision(businessEmail);
    if (!decision) return;
    const approvals = getApprovalsForBusiness(businessEmail).map(a => ({
      ...a,
      isPrimary: a.id === approvalId,
    }));
    try {
      const res = await fetch(`/api/underwriting-decisions/${decision.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ additionalApprovals: approvals }),
      });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ['/api/underwriting-decisions'] });
        toast({ title: "Primary Updated", description: "Primary approval has been changed" });
      }
    } catch (error) {
      console.error('Error setting primary:', error);
    }
  };

  // Delete an individual approval
  const handleDeleteApproval = async (businessEmail: string, approvalId: string) => {
    const decision = getBusinessDecision(businessEmail);
    if (!decision) return;
    let approvals = getApprovalsForBusiness(businessEmail).filter(a => a.id !== approvalId);

    // If deleted the primary and others remain, make the first one primary
    if (approvals.length > 0 && !approvals.some(a => a.isPrimary)) {
      approvals[0].isPrimary = true;
    }

    try {
      if (approvals.length === 0) {
        // No approvals left, delete the decision entirely
        const res = await fetch(`/api/underwriting-decisions/${decision.id}`, {
          method: 'DELETE',
          credentials: 'include',
        });
        if (res.ok) {
          queryClient.invalidateQueries({ queryKey: ['/api/underwriting-decisions'] });
          toast({ title: "Approval Removed", description: "All approvals removed" });
        }
      } else {
        const res = await fetch(`/api/underwriting-decisions/${decision.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ additionalApprovals: approvals }),
        });
        if (res.ok) {
          queryClient.invalidateQueries({ queryKey: ['/api/underwriting-decisions'] });
          toast({ title: "Approval Removed", description: "Approval has been removed" });
        }
      }
    } catch (error) {
      console.error('Error deleting approval:', error);
    }
  };

  // Save decline decision
  const handleSaveDecline = async () => {
    if (!declineDialog) return;
    setSavingDecision(true);
    try {
      const res = await fetch('/api/underwriting-decisions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          businessEmail: declineDialog.businessEmail,
          businessName: declineDialog.businessName,
          status: 'declined',
          declineReason: declineReason || null,
          followUpWorthy: declineFollowUp || false,
          followUpDate: declineFollowUp && declineFollowUpDate ? declineFollowUpDate + 'T12:00:00.000Z' : null,
        }),
      });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ['/api/underwriting-decisions'] });
        setDeclineDialog(null);
        toast({ title: "Business Declined", description: `${declineDialog.businessName} has been declined` });
      } else {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        toast({ title: "Save Failed", description: errorData.error || `Server returned ${res.status}`, variant: "destructive" });
      }
    } catch (error: any) {
      console.error('Error saving decline:', error);
      toast({ title: "Save Failed", description: error.message || "An unexpected error occurred", variant: "destructive" });
    } finally {
      setSavingDecision(false);
    }
  };

  // Save unqualified decision (didn't even get sent to lenders)
  const handleSaveUnqualified = async () => {
    if (!unqualifiedDialog) return;
    setSavingDecision(true);
    try {
      const res = await fetch('/api/underwriting-decisions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          businessEmail: unqualifiedDialog.businessEmail,
          businessName: unqualifiedDialog.businessName,
          status: 'unqualified',
          declineReason: unqualifiedReason || null,
          followUpWorthy: unqualifiedFollowUp || false,
          followUpDate: unqualifiedFollowUp && unqualifiedFollowUpDate ? unqualifiedFollowUpDate + 'T12:00:00.000Z' : null,
        }),
      });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ['/api/underwriting-decisions'] });
        setUnqualifiedDialog(null);
        toast({ title: "Marked Unqualified", description: `${unqualifiedDialog.businessName} has been marked as unqualified` });
      } else {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        toast({ title: "Save Failed", description: errorData.error || `Server returned ${res.status}`, variant: "destructive" });
      }
    } catch (error: any) {
      console.error('Error saving unqualified:', error);
      toast({ title: "Save Failed", description: error.message || "An unexpected error occurred", variant: "destructive" });
    } finally {
      setSavingDecision(false);
    }
  };

  // Mark a business as funded (change status from approved to funded)
  const handleMarkFunded = async (businessEmail: string) => {
    const decision = getBusinessDecision(businessEmail);
    if (!decision) return;
    try {
      const res = await fetch(`/api/underwriting-decisions/${decision.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'funded' }),
      });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ['/api/underwriting-decisions'] });
        toast({ title: "Marked as Funded", description: `${decision.businessName || businessEmail} has been marked as funded` });
      }
    } catch (error) {
      console.error('Error marking as funded:', error);
      toast({ title: "Error", description: "Failed to mark as funded", variant: "destructive" });
    }
  };

  // Reset/delete business decision
  const handleResetDecision = async (decisionId: string) => {
    try {
      const res = await fetch(`/api/underwriting-decisions/${decisionId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ['/api/underwriting-decisions'] });
      }
    } catch (error) {
      console.error('Error resetting decision:', error);
    }
  };

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

  const handleView = (uploadId: string) => {
    // Open the PDF in a new browser tab for inline viewing
    window.open(`/api/bank-statements/view/${uploadId}`, '_blank');
  };

  const handleBulkDownload = async (businessName: string) => {
    try {
      const res = await fetch(`/api/bank-statements/download-all/${encodeURIComponent(businessName)}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Bulk download failed');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeBusinessName = businessName.replace(/[^a-zA-Z0-9-_]/g, '_').substring(0, 50);
      a.download = `${safeBusinessName}_Bank_Statements.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Bulk download error:', error);
    }
  };


  const handleAnalyzeUploads = async (businessName: string) => {
    setAnalysisTitle(businessName);
    setAnalysisModalOpen(true);
    setAnalysisLoading(true);
    setAnalysisError(null);
    setAnalysisData(null);

    try {
      const res = await fetch(`/api/bank-statements/analyze/${encodeURIComponent(businessName)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({}),
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || data.error || 'Analysis failed');
      }
      
      const data = await res.json();
      setAnalysisData(data);
    } catch (error: any) {
      console.error('Analysis error:', error);
      setAnalysisError(error.message || 'Analysis failed');
    } finally {
      setAnalysisLoading(false);
    }
  };

  const handleAnalyzePlaid = async (connection: BankConnection) => {
    setAnalysisTitle(connection.institutionName);
    setAnalysisModalOpen(true);
    setAnalysisLoading(true);
    setAnalysisError(null);
    setAnalysisData(null);
    try {
      const res = await fetch(`/api/plaid/analyze/${connection.plaidItemId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || data.error || 'Analysis failed');
      }
      const data = await res.json();
      setAnalysisData(data);
    } catch (error: any) {
      setAnalysisError(error.message || 'Analysis failed');
    } finally {
      setAnalysisLoading(false);
    }
  };

  const toggleBusinessExpanded = (businessName: string) => {
    setExpandedBusinesses(prev => {
      const newSet = new Set(prev);
      if (newSet.has(businessName)) {
        newSet.delete(businessName);
      } else {
        newSet.add(businessName);
      }
      return newSet;
    });
  };

  const handleGenerateViewTokens = async () => {
    setGeneratingTokens(true);
    setTokenGenResult(null);
    try {
      const res = await fetch('/api/admin/bank-statements/generate-view-tokens', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok) {
        setTokenGenResult({ success: true, message: data.message || `Generated tokens for ${data.updated} statements` });
        queryClient.invalidateQueries({ queryKey: ['/api/bank-statements/uploads'] });
      } else {
        setTokenGenResult({ success: false, message: data.error || 'Failed to generate tokens' });
      }
    } catch (error) {
      setTokenGenResult({ success: false, message: 'Network error - please try again' });
    } finally {
      setGeneratingTokens(false);
    }
  };

  const handleUpdateApproval = async (uploadId: string, approvalStatus: 'approved' | 'declined', notes?: string) => {
    setUpdatingApproval(uploadId);
    try {
      const res = await fetch(`/api/bank-statements/${uploadId}/approval`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          approvalStatus,
          approvalNotes: notes || null,
        }),
      });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ['/api/bank-statements/uploads'] });
        setEditingNotes(null);
        setNotesInput("");
      } else {
        const data = await res.json();
        console.error('Failed to update approval:', data.error);
      }
    } catch (error) {
      console.error('Error updating approval:', error);
    } finally {
      setUpdatingApproval(null);
    }
  };

  const handleSaveNotes = async (uploadId: string, currentStatus: string | null, notes: string) => {
    if (!currentStatus || (currentStatus !== 'approved' && currentStatus !== 'declined')) {
      console.error('Cannot save notes on pending items - approve or decline first');
      setEditingNotes(null);
      setNotesInput("");
      return;
    }
    setUpdatingApproval(uploadId);
    try {
      const res = await fetch(`/api/bank-statements/${uploadId}/approval`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          approvalStatus: currentStatus,
          approvalNotes: notes || null,
        }),
      });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ['/api/bank-statements/uploads'] });
        setEditingNotes(null);
        setNotesInput("");
      } else {
        const data = await res.json();
        console.error('Failed to save notes:', data.error);
      }
    } catch (error) {
      console.error('Error saving notes:', error);
    } finally {
      setUpdatingApproval(null);
    }
  };

  const getApprovalBadge = (status: string | null) => {
    if (status === 'approved') {
      return <Badge className="bg-green-600 hover:bg-green-700">Approved</Badge>;
    }
    if (status === 'declined') {
      return <Badge variant="destructive">Declined</Badge>;
    }
    return <Badge variant="secondary">Pending Review</Badge>;
  };

  const canManageApprovals = authData?.role === 'underwriting' || authData?.role === 'admin';

  // Group uploads by business name
  const uploadsByBusiness = bankUploads?.reduce((acc, upload) => {
    const businessName = upload.businessName || 'Unknown Business';
    if (!acc[businessName]) {
      acc[businessName] = [];
    }
    acc[businessName].push(upload);
    return acc;
  }, {} as Record<string, BankStatementUpload[]>) || {};

  // Helper: check if an email has been decided (approved/declined/unqualified)
  const emailHasDecision = (email: string): boolean => {
    if (!email) return false;
    const decision = getBusinessDecision(email);
    return !!decision && ['approved', 'declined', 'unqualified'].includes(decision.status);
  };

  // Filter connections and uploads by search query, excluding decided businesses
  const lowerQuery = searchQuery.toLowerCase().trim();
  const filteredUploadsByBusiness = Object.entries(uploadsByBusiness).filter(
    ([businessName, uploads]) => {
      const matchesSearch = !lowerQuery || businessName.toLowerCase().includes(lowerQuery);
      const notDecided = !emailHasDecision(uploads[0]?.email || '');
      return matchesSearch && notDecided;
    }
  ).sort(([, uploadsA], [, uploadsB]) => {
    const getBestDate = (u: BankStatementUpload): number => {
      if (u.receivedAt) return new Date(u.receivedAt).getTime();
      if (u.createdAt) return new Date(u.createdAt).getTime();
      return 0;
    };
    const mostRecentA = Math.max(...uploadsA.map(getBestDate));
    const mostRecentB = Math.max(...uploadsB.map(getBestDate));
    return mostRecentB - mostRecentA;
  });

  // Filter & sort Plaid connections (newest first, not decided)
  const filteredConnections = (bankConnections || [])
    .filter(conn => {
      const matchesSearch = !lowerQuery || conn.businessName.toLowerCase().includes(lowerQuery) || conn.email.toLowerCase().includes(lowerQuery);
      const notDecided = !emailHasDecision(conn.email);
      return matchesSearch && notDecided;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const isLoading = uploadsLoading || connectionsLoading;
  const hasUploads = filteredUploadsByBusiness.length > 0;
  const hasConnections = filteredConnections.length > 0;
  const isEmpty = !hasUploads && !hasConnections;

  // Check if there's any data at all (before search filtering)
  const hasAnyData = (bankUploads && bankUploads.length > 0) || (bankConnections && bankConnections.length > 0);

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

  if (!hasAnyData) {
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
        {/* Search Bar and Admin Actions */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by business name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-bank-search"
            />
          </div>
          
          
        </div>

        {/* No results message */}
        {isEmpty && searchQuery && (
          <Card className="p-8" data-testid="card-no-results">
            <div className="text-center text-muted-foreground">
              No bank statements match "{searchQuery}"
            </div>
          </Card>
        )}

        {/* PDF Uploads Section - Grouped by Business */}
        {hasUploads && (
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Uploaded Statements
            </h3>
            <div className="space-y-4">
              {filteredUploadsByBusiness.map(([businessName, uploads]) => (
                <Card key={businessName} className="p-6 hover-elevate" data-testid={`card-business-${businessName}`}>
                  {/* Business Header */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3 flex-wrap">
                      <button
                        onClick={() => toggleBusinessExpanded(businessName)}
                        className="flex items-center gap-2 hover:opacity-70 transition-opacity"
                        data-testid={`button-toggle-${businessName}`}
                      >
                        {expandedBusinesses.has(businessName) ? (
                          <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-muted-foreground" />
                        )}
                        <Building2 className="w-5 h-5 text-primary" />
                        <h4 className="font-semibold text-lg">{businessName}</h4>
                      </button>
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        {uploads.length} {uploads.length === 1 ? 'Statement' : 'Statements'}
                      </Badge>
                      
                      {/* Business-level Underwriting Decision Status & Toggle */}
                      {canManageApprovals && (() => {
                        const businessEmail = uploads[0]?.email;
                        if (!businessEmail) return null;
                        const decision = getBusinessDecision(businessEmail);

                        if (decision) {
                          const approvalUrl = decision.approvalSlug
                            ? `${window.location.origin}/approved/${decision.approvalSlug}`
                            : null;

                          const copyApprovalUrl = () => {
                            if (approvalUrl) {
                              navigator.clipboard.writeText(approvalUrl);
                              toast({ title: "URL Copied", description: "Approval letter URL copied to clipboard" });
                            }
                          };

                          return (
                            <div className="flex items-center gap-2 flex-wrap">
                              {decision.status === 'approved' && (
                                <>
                                  <Badge className="bg-green-600 hover:bg-green-700 flex items-center gap-1">
                                    <ThumbsUp className="w-3 h-3" />
                                    Approved
                                  </Badge>
                                  {approvalUrl && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={copyApprovalUrl}
                                      className="text-primary border-primary/30 hover:bg-primary/10"
                                      data-testid={`button-copy-approval-url-${businessEmail}`}
                                    >
                                      <Copy className="w-3 h-3 mr-1" />
                                      Copy Letter URL
                                    </Button>
                                  )}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openApprovalForm(businessEmail, businessName)}
                                    className="text-green-600 border-green-200 hover:bg-green-50 dark:border-green-800 dark:hover:bg-green-900/20"
                                    data-testid={`button-add-approval-${businessEmail}`}
                                  >
                                    <Plus className="w-3 h-3 mr-1" />
                                    Add Approval
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleMarkFunded(businessEmail)}
                                    className="text-purple-600 border-purple-200 hover:bg-purple-50 dark:border-purple-800 dark:hover:bg-purple-900/20"
                                    data-testid={`button-mark-funded-${businessEmail}`}
                                  >
                                    <Banknote className="w-3 h-3 mr-1" />
                                    Mark Funded
                                  </Button>
                                </>
                              )}
                              {decision.status === 'funded' && (
                                <>
                                  <Badge className="bg-purple-600 hover:bg-purple-700 flex items-center gap-1">
                                    <Banknote className="w-3 h-3" />
                                    Funded
                                  </Badge>
                                  {approvalUrl && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={copyApprovalUrl}
                                      className="text-primary border-primary/30 hover:bg-primary/10"
                                      data-testid={`button-copy-funded-url-${businessEmail}`}
                                    >
                                      <Copy className="w-3 h-3 mr-1" />
                                      Copy Letter URL
                                    </Button>
                                  )}
                                </>
                              )}
                              {decision.status === 'declined' && (
                                <>
                                  <Badge variant="destructive" className="flex items-center gap-1">
                                    <ThumbsDown className="w-3 h-3" />
                                    Declined
                                  </Badge>
                                  {decision.followUpWorthy && (
                                    <Badge variant="outline" className="flex items-center gap-1 text-blue-600 border-blue-200 dark:text-blue-400 dark:border-blue-800">
                                      <CalendarIcon className="w-3 h-3" />
                                      Follow Up{decision.followUpDate ? `: ${new Date(decision.followUpDate).toLocaleDateString('en-US', { timeZone: 'UTC' })}` : ''}
                                    </Badge>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openDeclineDialog(businessEmail, businessName)}
                                    data-testid={`button-edit-decision-${businessEmail}`}
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </Button>
                                </>
                              )}
                              {decision.status === 'unqualified' && (
                                <>
                                  <Badge className="bg-orange-600 hover:bg-orange-700 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" />
                                    Unqualified
                                  </Badge>
                                  {decision.followUpWorthy && (
                                    <Badge variant="outline" className="flex items-center gap-1 text-blue-600 border-blue-200 dark:text-blue-400 dark:border-blue-800">
                                      <CalendarIcon className="w-3 h-3" />
                                      Follow Up{decision.followUpDate ? `: ${new Date(decision.followUpDate).toLocaleDateString('en-US', { timeZone: 'UTC' })}` : ''}
                                    </Badge>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openUnqualifiedDialog(businessEmail, businessName)}
                                    data-testid={`button-edit-unqualified-${businessEmail}`}
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </Button>
                                </>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleResetDecision(decision.id)}
                                className="text-muted-foreground"
                                data-testid={`button-reset-decision-${businessEmail}`}
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          );
                        }

                        return (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openApprovalForm(businessEmail, businessName)}
                              className="text-green-600 border-green-200 hover:bg-green-50 dark:border-green-800 dark:hover:bg-green-900/20"
                              data-testid={`button-approve-business-${businessEmail}`}
                            >
                              <ThumbsUp className="w-3 h-3 mr-1" />
                              Approve
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openDeclineDialog(businessEmail, businessName)}
                              className="text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
                              data-testid={`button-decline-business-${businessEmail}`}
                            >
                              <ThumbsDown className="w-3 h-3 mr-1" />
                              Decline
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openUnqualifiedDialog(businessEmail, businessName)}
                              className="text-orange-600 border-orange-200 hover:bg-orange-50 dark:border-orange-800 dark:hover:bg-orange-900/20"
                              data-testid={`button-unqualified-business-${businessEmail}`}
                            >
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Unqualified
                            </Button>
                          </div>
                        );
                      })()}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        variant="outline"
                        onClick={() => handleAnalyzeUploads(businessName)}
                        className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 hover:from-purple-500/20 hover:to-blue-500/20 border-purple-200 dark:border-purple-800"
                        data-testid={`button-analyze-uploads-${businessName}`}
                      >
                        <Sparkles className="w-4 h-4 mr-2 text-purple-500" />
                        Analyze
                      </Button>
                      <Button
                        variant="outline"
                        onClick={async () => {
                          const email = uploads[0]?.email;
                          if (!email) return;
                          try {
                            const res = await fetch(`/api/bank-statements/view-url?email=${encodeURIComponent(email)}`, {
                              credentials: 'include'
                            });
                            if (res.ok) {
                              const data = await res.json();
                              window.open(data.url, '_blank');
                            }
                          } catch (err) {
                            console.error('Failed to get view URL:', err);
                          }
                        }}
                        className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 hover:from-blue-500/20 hover:to-cyan-500/20 border-blue-200 dark:border-blue-800"
                        data-testid={`button-view-all-${businessName}`}
                      >
                        <Eye className="w-4 h-4 mr-2 text-blue-500" />
                        View All
                      </Button>
                      <Button
                        onClick={() => handleBulkDownload(businessName)}
                        className="bg-primary hover:bg-primary/90"
                        data-testid={`button-download-all-${businessName}`}
                      >
                        <FolderArchive className="w-4 h-4 mr-2" />
                        Download All ({uploads.length})
                      </Button>
                    </div>
                  </div>

                  {/* Inline Approvals List - Best at top with dropdown */}
                  {canManageApprovals && (() => {
                    const businessEmail = uploads[0]?.email;
                    if (!businessEmail) return null;
                    const decision = getBusinessDecision(businessEmail);
                    if (!decision || (decision.status !== 'approved' && decision.status !== 'funded')) return null;
                    const approvals = getApprovalsForBusiness(businessEmail);
                    if (approvals.length === 0) return null;

                    const sortedApprovals = [...approvals].sort((a, b) => (a.isPrimary ? -1 : b.isPrimary ? 1 : 0));
                    const bestApproval = sortedApprovals[0];
                    const additionalApprovals = sortedApprovals.slice(1);
                    const isAdditionalExpanded = expandedAdditionalApprovals.has(businessEmail);

                    const renderInlineApproval = (appr: FullApprovalEntry) => (
                      <div
                        key={appr.id}
                        className={`flex items-center justify-between gap-3 p-3 rounded-lg text-sm ${
                          appr.isPrimary
                            ? 'bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800'
                            : 'bg-muted/50 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0 flex-wrap">
                          <button
                            onClick={() => handleSetPrimary(businessEmail, appr.id)}
                            className={`flex-shrink-0 ${appr.isPrimary ? 'text-yellow-500' : 'text-muted-foreground hover:text-yellow-500'}`}
                            title={appr.isPrimary ? 'Best approval' : 'Set as best approval'}
                            data-testid={`button-set-primary-${appr.id}`}
                          >
                            <Star className={`w-4 h-4 ${appr.isPrimary ? 'fill-yellow-500' : ''}`} />
                          </button>
                          {appr.isPrimary && (
                            <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300 text-xs">
                              Best Approval
                            </Badge>
                          )}
                          <span className="font-medium">{appr.lender || 'No lender'}</span>
                          {appr.advanceAmount && (
                            <span className="text-green-600 dark:text-green-400 font-semibold">
                              ${parseFloat(appr.advanceAmount).toLocaleString()}
                                </span>
                              )}
                              {appr.term && <span className="text-muted-foreground">{appr.term}</span>}
                              {appr.factorRate && <span className="text-muted-foreground">{appr.factorRate}x</span>}
                              {appr.paymentFrequency && <span className="text-muted-foreground capitalize">{appr.paymentFrequency}</span>}
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openApprovalForm(businessEmail, businessName, appr.id)}
                                data-testid={`button-edit-approval-${appr.id}`}
                              >
                                <Pencil className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteApproval(businessEmail, appr.id)}
                                className="text-red-500 hover:text-red-700"
                                data-testid={`button-delete-approval-${appr.id}`}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        );

                    return (
                      <div className="mb-4 space-y-2">
                        {bestApproval && renderInlineApproval(bestApproval)}
                        {additionalApprovals.length > 0 && (
                          <div>
                            <button
                              onClick={() => setExpandedAdditionalApprovals(prev => {
                                const next = new Set(prev);
                                if (next.has(businessEmail)) next.delete(businessEmail);
                                else next.add(businessEmail);
                                return next;
                              })}
                              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
                              data-testid={`button-toggle-additional-${businessEmail}`}
                            >
                              {isAdditionalExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                              {isAdditionalExpanded ? 'Hide' : 'View'} {additionalApprovals.length} Additional {additionalApprovals.length === 1 ? 'Approval' : 'Approvals'}
                            </button>
                            {isAdditionalExpanded && (
                              <div className="space-y-2 mt-2">
                                {additionalApprovals.map(renderInlineApproval)}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Individual Files - Collapsible */}
                  {expandedBusinesses.has(businessName) && (
                    <div className="space-y-3 pt-4 border-t">
                      {uploads.map((upload) => (
                        <div key={upload.id} className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3 bg-muted/50 rounded-lg" data-testid={`card-bank-upload-${upload.id}`}>
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2 flex-wrap">
                              <span className="font-medium flex items-center gap-2">
                                <FileText className="w-4 h-4 text-primary" />
                                {upload.originalFileName}
                              </span>
                              {upload.source === "Checker" && (
                                <Badge variant="outline" className="flex items-center gap-1 bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700 text-xs">
                                  <TrendingUp className="w-3 h-3" />
                                  Checker
                                </Badge>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                              <span>{formatFileSize(upload.fileSize)}</span>
                              <span>{upload.createdAt ? format(new Date(upload.createdAt), 'MMM d, yyyy') : 'N/A'}</span>
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {upload.email}
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleView(upload.id)}
                              data-testid={`button-view-statement-${upload.id}`}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownload(upload.id, upload.originalFileName)}
                              data-testid={`button-download-statement-${upload.id}`}
                            >
                              <Download className="w-4 h-4 mr-1" />
                              Download
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Plaid Connected Banks Section */}
        {hasConnections && (
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Landmark className="w-5 h-5 text-emerald-600" />
              Plaid Connected Banks
              <Badge className="bg-emerald-600 text-white text-xs">{filteredConnections.length}</Badge>
            </h3>
            <div className="space-y-4">
              {filteredConnections.map((connection) => (
                <Card key={connection.id} className="p-6 hover-elevate" data-testid={`card-bank-connection-${connection.id}`}>
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3 flex-wrap">
                        <h4 className="font-semibold text-lg flex items-center gap-2">
                          <Building2 className="w-5 h-5 text-primary" />
                          {connection.businessName}
                        </h4>
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Landmark className="w-3 h-3" />
                          {connection.institutionName}
                        </Badge>
                        <Badge className="bg-emerald-600 text-white">Plaid Connected</Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
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
                          <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Connected:</span>
                          <span className="font-medium">{format(new Date(connection.createdAt), 'MMM d, yyyy')}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="w-4 h-4" />
                        {connection.email}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 min-w-[140px]">
                      <Button
                        onClick={() => setSelectedStatements(connection)}
                        data-testid={`button-view-statements-${connection.id}`}
                        size="sm"
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        Bank Statements
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedAssetReport(connection)}
                        data-testid={`button-view-asset-report-${connection.id}`}
                      >
                        <Landmark className="w-4 h-4 mr-2" />
                        Asset Report
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAnalyzePlaid(connection)}
                        data-testid={`button-analyze-plaid-${connection.id}`}
                      >
                        <Sparkles className="w-4 h-4 mr-2 text-purple-500" />
                        Analyze
                      </Button>
                      <ReconnectPlaidButton
                        plaidItemId={connection.plaidItemId}
                        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['/api/plaid/all'] })}
                      />
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

      {selectedAssetReport && (
        <AssetReportModal
          plaidItemId={selectedAssetReport.plaidItemId}
          institutionName={selectedAssetReport.institutionName}
          isOpen={!!selectedAssetReport}
          onClose={() => setSelectedAssetReport(null)}
        />
      )}

      {selectedStatements && (
        <PlaidStatementsModal
          plaidItemId={selectedStatements.plaidItemId}
          institutionName={selectedStatements.institutionName}
          isOpen={!!selectedStatements}
          onClose={() => setSelectedStatements(null)}
        />
      )}

      <AnalysisModal
        isOpen={analysisModalOpen}
        onClose={() => {
          setAnalysisModalOpen(false);
          setAnalysisData(null);
          setAnalysisError(null);
        }}
        analysisData={analysisData}
        isLoading={analysisLoading}
        error={analysisError}
        title={analysisTitle}
      />

      {/* Approval Form Dialog - For adding/editing a single approval */}
      <Dialog open={!!approvalFormDialog} onOpenChange={(open) => !open && setApprovalFormDialog(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ThumbsUp className="w-5 h-5 text-green-600" />
              {approvalFormDialog?.editingApprovalId ? 'Edit' : 'Add'} Approval: {approvalFormDialog?.businessName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="advanceAmount">Advance Amount</Label>
                <Input
                  id="advanceAmount"
                  type="number"
                  placeholder="$50,000"
                  value={approvalForm.advanceAmount}
                  onChange={(e) => setApprovalForm(prev => ({ ...prev, advanceAmount: e.target.value }))}
                  data-testid="input-advance-amount"
                />
              </div>
              <div>
                <Label htmlFor="term">Term</Label>
                <Input
                  id="term"
                  placeholder="6 months"
                  value={approvalForm.term}
                  onChange={(e) => setApprovalForm(prev => ({ ...prev, term: e.target.value }))}
                  data-testid="input-term"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="paymentFrequency">Payment Frequency</Label>
                <Select
                  value={approvalForm.paymentFrequency}
                  onValueChange={(value) => setApprovalForm(prev => ({ ...prev, paymentFrequency: value }))}
                >
                  <SelectTrigger data-testid="select-payment-frequency">
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="lender">Lender</Label>
                <Input
                  id="lender"
                  placeholder="Lender name"
                  value={approvalForm.lender}
                  onChange={(e) => setApprovalForm(prev => ({ ...prev, lender: e.target.value }))}
                  data-testid="input-lender"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="factorRate">Factor Rate</Label>
                <Input
                  id="factorRate"
                  type="number"
                  step="0.01"
                  placeholder="1.25"
                  value={approvalForm.factorRate}
                  onChange={(e) => setApprovalForm(prev => ({ ...prev, factorRate: e.target.value }))}
                  data-testid="input-factor-rate"
                />
              </div>
              <div>
                <Label htmlFor="maxUpsell">Max Upsell</Label>
                <Input
                  id="maxUpsell"
                  type="number"
                  placeholder="$75,000"
                  value={approvalForm.maxUpsell}
                  onChange={(e) => setApprovalForm(prev => ({ ...prev, maxUpsell: e.target.value }))}
                  data-testid="input-max-upsell"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="netAfterFees">Net After Fees</Label>
                <Input
                  id="netAfterFees"
                  type="number"
                  placeholder="$48,500"
                  value={approvalForm.netAfterFees}
                  onChange={(e) => setApprovalForm(prev => ({ ...prev, netAfterFees: e.target.value }))}
                  data-testid="input-net-after-fees"
                />
              </div>
              <div>
                <Label htmlFor="totalPayback">Total Payback</Label>
                <Input
                  id="totalPayback"
                  type="number"
                  placeholder="$62,500"
                  value={approvalForm.totalPayback}
                  onChange={(e) => setApprovalForm(prev => ({ ...prev, totalPayback: e.target.value }))}
                  data-testid="input-total-payback"
                />
              </div>
            </div>
            <div>
              <Label>Approval Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    data-testid="input-approval-date"
                    className={cn("w-full justify-start text-left font-normal", !approvalForm.approvalDate && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {approvalForm.approvalDate ? format(new Date(approvalForm.approvalDate + 'T00:00:00'), "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={approvalForm.approvalDate ? new Date(approvalForm.approvalDate + 'T00:00:00') : undefined}
                    onSelect={(day) => setApprovalForm(prev => ({ ...prev, approvalDate: day ? format(day, "yyyy-MM-dd") : '' }))}
                    fromYear={2024}
                    toYear={new Date().getFullYear()}
                    captionLayout="dropdown-buttons"
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Additional notes..."
                rows={3}
                value={approvalForm.notes}
                onChange={(e) => setApprovalForm(prev => ({ ...prev, notes: e.target.value }))}
                data-testid="input-notes"
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setApprovalFormDialog(null)}
                data-testid="button-cancel-approval"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveApproval}
                disabled={savingDecision}
                className="bg-green-600 hover:bg-green-700"
                data-testid="button-save-approval"
              >
                {savingDecision ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {approvalFormDialog?.editingApprovalId ? 'Update Approval' : 'Save Approval'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Decline Dialog */}
      <Dialog open={!!declineDialog} onOpenChange={(open) => !open && setDeclineDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ThumbsDown className="w-5 h-5 text-red-600" />
              Decline: {declineDialog?.businessName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label htmlFor="declineReason">Reason for Decline</Label>
              <Input
                id="declineReason"
                placeholder="Enter reason for declining..."
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                data-testid="input-decline-reason"
              />
            </div>
            <div>
              <Label>Worth Following Up With?</Label>
              <div className="flex gap-2 mt-1">
                <Button
                  type="button"
                  size="sm"
                  variant={declineFollowUp ? "default" : "outline"}
                  onClick={() => setDeclineFollowUp(true)}
                  data-testid="button-decline-followup-yes"
                >
                  Yes
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={!declineFollowUp ? "default" : "outline"}
                  onClick={() => { setDeclineFollowUp(false); setDeclineFollowUpDate(''); }}
                  data-testid="button-decline-followup-no"
                >
                  No
                </Button>
              </div>
            </div>
            {declineFollowUp && (
              <div>
                <Label>Follow-Up Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      data-testid="input-decline-followup-date"
                      className={cn("w-full justify-start text-left font-normal", !declineFollowUpDate && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {declineFollowUpDate ? format(new Date(declineFollowUpDate + 'T00:00:00'), "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={declineFollowUpDate ? new Date(declineFollowUpDate + 'T00:00:00') : undefined}
                      onSelect={(day) => setDeclineFollowUpDate(day ? format(day, "yyyy-MM-dd") : '')}
                      fromYear={2024}
                      toYear={new Date().getFullYear() + 1}
                      captionLayout="dropdown-buttons"
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setDeclineDialog(null)}
                data-testid="button-cancel-decline"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveDecline}
                disabled={savingDecision}
                className="bg-red-600 hover:bg-red-700"
                data-testid="button-save-decline"
              >
                {savingDecision ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <X className="w-4 h-4 mr-2" />
                    Decline Business
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Unqualified Dialog */}
      <Dialog open={!!unqualifiedDialog} onOpenChange={(open) => !open && setUnqualifiedDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              Unqualified: {unqualifiedDialog?.businessName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <p className="text-sm text-muted-foreground">
              This applicant did not qualify to be sent out to lenders.
            </p>
            <div>
              <Label htmlFor="unqualifiedReason">Reason (Optional)</Label>
              <Input
                id="unqualifiedReason"
                placeholder="Enter reason for not qualifying..."
                value={unqualifiedReason}
                onChange={(e) => setUnqualifiedReason(e.target.value)}
                data-testid="input-unqualified-reason"
              />
            </div>
            <div>
              <Label>Worth Following Up With?</Label>
              <div className="flex gap-2 mt-1">
                <Button
                  type="button"
                  size="sm"
                  variant={unqualifiedFollowUp ? "default" : "outline"}
                  onClick={() => setUnqualifiedFollowUp(true)}
                  data-testid="button-unqualified-followup-yes"
                >
                  Yes
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={!unqualifiedFollowUp ? "default" : "outline"}
                  onClick={() => { setUnqualifiedFollowUp(false); setUnqualifiedFollowUpDate(''); }}
                  data-testid="button-unqualified-followup-no"
                >
                  No
                </Button>
              </div>
            </div>
            {unqualifiedFollowUp && (
              <div>
                <Label>Follow-Up Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      data-testid="input-unqualified-followup-date"
                      className={cn("w-full justify-start text-left font-normal", !unqualifiedFollowUpDate && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {unqualifiedFollowUpDate ? format(new Date(unqualifiedFollowUpDate + 'T00:00:00'), "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={unqualifiedFollowUpDate ? new Date(unqualifiedFollowUpDate + 'T00:00:00') : undefined}
                      onSelect={(day) => setUnqualifiedFollowUpDate(day ? format(day, "yyyy-MM-dd") : '')}
                      fromYear={2024}
                      toYear={new Date().getFullYear() + 1}
                      captionLayout="dropdown-buttons"
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setUnqualifiedDialog(null)}
                data-testid="button-cancel-unqualified"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveUnqualified}
                disabled={savingDecision}
                className="bg-orange-600 hover:bg-orange-700"
                data-testid="button-save-unqualified"
              >
                {savingDecision ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Mark Unqualified
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function BotAttemptsTab() {
  const { data: botAttempts, isLoading } = useQuery<BotAttempt[]>({
    queryKey: ['/api/bot-attempts'],
    queryFn: async () => {
      const res = await fetch('/api/bot-attempts', {
        credentials: 'include',
      });
      if (!res.ok) {
        if (res.status === 403) return [];
        throw new Error('Failed to fetch bot attempts');
      }
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading bot attempts...</span>
        </div>
      </Card>
    );
  }

  if (!botAttempts || botAttempts.length === 0) {
    return (
      <Card className="p-8">
        <div className="text-center text-muted-foreground">
          <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No Bot Attempts Detected</p>
          <p className="text-sm mt-2">
            The honeypot system is active. Any bots that fill out the hidden fax field will appear here.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <AlertTriangle className="w-5 h-5 text-amber-500" />
        <h3 className="text-lg font-semibold">Bot Attempts Detected</h3>
        <Badge variant="destructive">{botAttempts.length}</Badge>
      </div>

      <div className="space-y-4">
        {botAttempts.map((attempt) => (
          <div
            key={attempt.id}
            className="p-4 border rounded-lg bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-muted-foreground">Email:</span>{" "}
                <span className="font-mono">{attempt.email || "N/A"}</span>
              </div>
              <div>
                <span className="font-medium text-muted-foreground">Fax Value:</span>{" "}
                <span className="font-mono text-red-600 dark:text-red-400">"{attempt.honeypotValue}"</span>
              </div>
              <div>
                <span className="font-medium text-muted-foreground">Form Type:</span>{" "}
                <Badge variant="outline">{attempt.formType || "unknown"}</Badge>
              </div>
              <div>
                <span className="font-medium text-muted-foreground">Timestamp:</span>{" "}
                {attempt.createdAt ? format(new Date(attempt.createdAt), "MMM d, yyyy h:mm a") : "N/A"}
              </div>
              <div className="md:col-span-2">
                <span className="font-medium text-muted-foreground">IP Address:</span>{" "}
                <span className="font-mono text-xs">{attempt.ipAddress || "N/A"}</span>
              </div>
              <div className="md:col-span-2">
                <span className="font-medium text-muted-foreground">User Agent:</span>{" "}
                <span className="font-mono text-xs truncate block">{attempt.userAgent || "N/A"}</span>
              </div>
              {attempt.additionalData && Object.keys(attempt.additionalData).length > 0 && (
                <div className="md:col-span-2">
                  <span className="font-medium text-muted-foreground">Additional Data:</span>{" "}
                  <pre className="text-xs mt-1 bg-white/50 dark:bg-black/20 p-2 rounded overflow-x-auto">
                    {JSON.stringify(attempt.additionalData, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function Dashboard() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "intake" | "full" | "partial" | "low-revenue">("all");
  const [selectedAgentFilter, setSelectedAgentFilter] = useState<string>("all");
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

  // Extract unique agent names for the filter dropdown (admin only)
  const uniqueAgentNames = applications
    ? Array.from(new Set(applications.map(app => app.agentName).filter(Boolean)))
        .sort((a, b) => (a || "").localeCompare(b || ""))
    : [];

  const filteredApplications = applications
    ? applications
        .filter((app) => {
          const matchesSearch =
            (app.fullName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
            (app.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
            (app.businessName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
            (app.legalBusinessName || "").toLowerCase().includes(searchTerm.toLowerCase());

          // Parse monthly revenue for low-revenue filter
          const revenueStr = app.monthlyRevenue || app.averageMonthlyRevenue || "0";
          const revenueValue = typeof revenueStr === 'string' 
            ? parseFloat(revenueStr.replace(/[$,]/g, ''))
            : Number(revenueStr);
          const isLowRevenue = !isNaN(revenueValue) && revenueValue > 0 && revenueValue < 10000;

          const matchesFilter =
            (filterStatus === "all") ||
            (filterStatus === "intake" && app.isCompleted && !app.isFullApplicationCompleted && !isLowRevenue) ||
            (filterStatus === "full" && app.isFullApplicationCompleted && !isLowRevenue) ||
            (filterStatus === "partial" && !app.isCompleted && !app.isFullApplicationCompleted && !isLowRevenue) ||
            (filterStatus === "low-revenue" && isLowRevenue);

          // Agent filter (admin only feature)
          const matchesAgentFilter =
            selectedAgentFilter === "all" || app.agentName === selectedAgentFilter;

          return matchesSearch && matchesFilter && matchesAgentFilter;
        })
        .sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        })
    : [];


  // Helper to check if app has low revenue
  const isAppLowRevenue = (app: LoanApplication) => {
    const revenueStr = app.monthlyRevenue || app.averageMonthlyRevenue || "0";
    const revenueValue = typeof revenueStr === 'string' 
      ? parseFloat(revenueStr.replace(/[$,]/g, ''))
      : Number(revenueStr);
    return !isNaN(revenueValue) && revenueValue > 0 && revenueValue < 10000;
  };

  const stats = {
    total: applications?.length || 0,
    intakeOnly: applications?.filter((a) => a.isCompleted && !a.isFullApplicationCompleted).length || 0,
    fullCompleted: applications?.filter((a) => a.isFullApplicationCompleted).length || 0,
    partial: applications?.filter((a) => !a.isCompleted && !a.isFullApplicationCompleted).length || 0,
    lowRevenue: applications?.filter(isAppLowRevenue).length || 0,
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h1 className="text-3xl font-bold">
                  {authData.role === "admin" ? "Admin Dashboard" : authData.role === "user" ? "My Dashboard" : "Agent Dashboard"}
                </h1>
                {authData.role === "admin" ? (
                  <Badge variant="default" className="bg-primary" data-testid="badge-role-admin">
                    <Shield className="w-3 h-3 mr-1" />
                    Admin
                  </Badge>
                ) : authData.role === "user" ? (
                  <Badge variant="outline" data-testid="badge-role-user">
                    <User className="w-3 h-3 mr-1" />
                    User
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
                  : authData.role === "user"
                    ? `Viewing your submissions, ${authData.agentName}`
                    : `Viewing applications for ${authData.agentName}`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Rep Console and Approvals only visible to admin and agents, not users */}
              {(authData.role === "admin" || authData.role === "agent") && (
                <Link href="/rep-console">
                  <Button variant="outline" data-testid="button-rep-console">
                    <User className="w-4 h-4 mr-2" />
                    Rep Console
                  </Button>
                </Link>
              )}
              
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

        </div>

        <Tabs defaultValue="applications" className="w-full">
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
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
                {(authData?.role === 'admin' || authData?.role === 'underwriting') && (
                  <>
                    <Link href="/approvals">
                      <Button
                        variant="outline"
                        data-testid="button-approvals-folder"
                        className="border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400"
                      >
                        <ThumbsUp className="w-4 h-4 mr-2" />
                        Approved
                      </Button>
                    </Link>
                    <Link href="/declines">
                      <Button
                        variant="outline"
                        data-testid="button-declined-folder"
                        className="border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400"
                      >
                        <ThumbsDown className="w-4 h-4 mr-2" />
                        Declined
                      </Button>
                    </Link>
                    <Link href="/unqualified">
                      <Button
                        variant="outline"
                        data-testid="button-unqualified-folder"
                        className="border-orange-300 dark:border-orange-700 bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400"
                      >
                        <AlertCircle className="w-4 h-4 mr-2" />
                        Unqualified
                      </Button>
                    </Link>
                    <Link href="/funded">
                      <Button
                        variant="outline"
                        data-testid="button-funded-folder"
                        className="border-purple-300 dark:border-purple-700 bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400"
                      >
                        <Banknote className="w-4 h-4 mr-2" />
                        Funded
                      </Button>
                    </Link>
                  </>
                )}
              </div>
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
                {(authData?.role === 'admin' || authData?.role === 'underwriting') && (
                  <TabsList>
                    <TabsTrigger value="bot-attempts" data-testid="tab-bot-attempts">
                      <Bot className="w-4 h-4 mr-2" />
                      Bot Attempts
                    </TabsTrigger>
                  </TabsList>
                )}
              </div>
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
            <div className="flex gap-2 flex-wrap items-center">
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
              <Button
                variant={filterStatus === "low-revenue" ? "default" : "outline"}
                onClick={() => setFilterStatus("low-revenue")}
                data-testid="button-filter-low-revenue"
                className={filterStatus === "low-revenue" ? "bg-amber-600 hover:bg-amber-700" : ""}
              >
                <TrendingDown className="w-4 h-4 mr-1" />
                Low Revenue ({stats.lowRevenue})
              </Button>
              {authData.role === "admin" && uniqueAgentNames.length > 0 && (
                <Select
                  value={selectedAgentFilter}
                  onValueChange={setSelectedAgentFilter}
                >
                  <SelectTrigger className="w-[180px]" data-testid="select-agent-filter">
                    <SelectValue placeholder="Filter by Agent" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Agents</SelectItem>
                    {uniqueAgentNames.map((agentName) => (
                      <SelectItem key={agentName} value={agentName || ""}>
                        {agentName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
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
                      <h3 className="font-semibold text-lg flex items-center gap-1" data-testid={`text-business-name-${app.id}`}>
                        {app.legalBusinessName || app.businessName || "No business name"}
                        {Number(app.monthlyRevenue || app.averageMonthlyRevenue) >= 20000 && (
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" data-testid={`icon-high-revenue-${app.id}`} />
                        )}
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
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                      <div>
                        <span className="font-medium">Email:</span>{" "}
                        <span data-testid={`value-email-${app.id}`}>{app.email || "N/A"}</span>
                      </div>
                      <div>
                        <span className="font-medium">Contact:</span>{" "}
                        <span data-testid={`value-contact-${app.id}`}>{app.fullName || "N/A"}</span>
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
                      {(app.monthlyRevenue || app.averageMonthlyRevenue) && Number(app.monthlyRevenue || app.averageMonthlyRevenue) > 0 && (
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Revenue:</span>{" "}
                          <span data-testid={`value-revenue-${app.id}`}>
                            ${Number(app.monthlyRevenue || app.averageMonthlyRevenue).toLocaleString()}/mo
                          </span>
                          {Number(app.monthlyRevenue || app.averageMonthlyRevenue) >= 20000 && (
                            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                          )}
                        </div>
                      )}
                      {app.useOfFunds && (
                        <div>
                          <span className="font-medium">Use of Funds:</span>{" "}
                          <span data-testid={`value-use-of-funds-${app.id}`} className="truncate max-w-[200px] inline-block align-bottom" title={app.useOfFunds}>
                            {app.useOfFunds.length > 30 ? app.useOfFunds.slice(0, 30) + "..." : app.useOfFunds}
                          </span>
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

          {/* Bot Attempts Tab - Admin only */}
          <TabsContent value="bot-attempts">
            <BotAttemptsTab />
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
                  <div><span className="font-medium">Monthly Revenue:</span> {selectedAppDetails.monthlyRevenue || selectedAppDetails.averageMonthlyRevenue ? `$${Number(selectedAppDetails.monthlyRevenue || selectedAppDetails.averageMonthlyRevenue).toLocaleString()}` : "N/A"}</div>
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
