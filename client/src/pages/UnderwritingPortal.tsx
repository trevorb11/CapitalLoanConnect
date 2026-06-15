import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { LoginForm } from "@/components/auth/LoginForm";
import {
  Search, FileText, Send, Ban, MessageSquare, Bot, Loader2,
  ChevronLeft, Building2, DollarSign, Clock, User, Phone, Mail,
  AlertTriangle, CheckCircle2, XCircle, Eye, Download, Shield,
  Sparkles, ExternalLink, LogOut,
} from "lucide-react";

interface AuthState {
  isAuthenticated: boolean;
  role?: string;
  agentEmail?: string;
  agentName?: string;
}

interface QueueItem {
  email: string;
  businessName: string;
  fullName: string | null;
  phone: string | null;
  state: string | null;
  industry: string | null;
  requestedAmount: string | null;
  creditScore: string | null;
  timeInBusiness: string | null;
  monthlyRevenue: string | null;
  agentName: string | null;
  agentEmail: string | null;
  applicationId: string | null;
  statementCount: number;
  latestUploadAt: number;
  hasDecision: boolean;
  decisionStatus: string | null;
  decisionId: string | null;
  uwSubmittedAt: string | null;
}

interface LenderContact {
  name: string;
  emails: string[];
  ccEmails?: string[];
  contactName?: string;
  contactPhone?: string;
  notes?: string;
}

interface FileDetail {
  application: any;
  bankStatements: any[];
  underwritingDecisions: any[];
  lenderApprovals: any[];
  savedSnapshot: {
    snapshot: UnderwritingSnapshot;
    ranAt: string;
    ranBy: string | null;
    filesProcessed: number;
  } | null;
}

interface UnderwritingSnapshot {
  worthSubmitting: boolean;
  confidence: string;
  overallScore: number;
  qualificationTier: string;
  avgMonthlyRevenue: number;
  revenueTrend: string;
  avgDailyBalance: number;
  lowestBalance: number;
  nsfCount: number;
  negativeDays: number;
  existingPositions: Array<{
    funder: string;
    estimatedPayment: string;
    frequency: string;
    estimatedOriginalAmount: string | null;
    estimatedTerm: string | null;
    paymentsLowered: boolean;
    anomalies: string | null;
  }>;
  totalMonthlyDebtPayments: number;
  debtServiceRatio: number;
  redFlags: Array<{ flag: string; severity: string }>;
  positiveIndicators: string[];
  maxRecommendedAdvance: number;
  recommendedProduct: string;
  estimatedFactor: string;
  summary: string;
  underwriterNotes: string[];
  monthlyData?: Array<{
    month: string;
    deposits: number;
    avgBalance: number;
    numDeposits: string;
    nsfs: number;
    negativeDays: number;
    endBalance: number | null;
  }>;
}

export default function UnderwritingPortal() {
  const { toast } = useToast();
  const [auth, setAuth] = useState<AuthState>({ isAuthenticated: false });
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Shop dialog state
  const [shopDialogOpen, setShopDialogOpen] = useState(false);
  const [selectedLenders, setSelectedLenders] = useState<Set<string>>(new Set());
  const [selectedStatements, setSelectedStatements] = useState<Set<string>>(new Set());
  const [dealOverview, setDealOverview] = useState({
    state: "", industry: "", amountSeeking: "", positionSeeking: "",
    outstandingBalance: "", creditScore: "", additionalNotes: "",
  });
  const [ccReps, setCcReps] = useState<string[]>([]);
  const [ccRepInput, setCcRepInput] = useState("");

  // Unqualified dialog
  const [unqualifiedDialogOpen, setUnqualifiedDialogOpen] = useState(false);
  const [unqualifiedNote, setUnqualifiedNote] = useState("");

  // Request info dialog
  const [requestInfoDialogOpen, setRequestInfoDialogOpen] = useState(false);
  const [requestInfoNote, setRequestInfoNote] = useState("");

  // AI Snapshot state
  const [snapshot, setSnapshot] = useState<UnderwritingSnapshot | null>(null);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [snapshotRanAt, setSnapshotRanAt] = useState<string | null>(null);
  const [showDeepDive, setShowDeepDive] = useState(false);

  // Auth check
  useEffect(() => {
    fetch("/api/auth/check", { credentials: "include" })
      .then(r => r.json())
      .then(data => {
        if (data.isAuthenticated && (data.role === 'underwriting' || data.role === 'admin')) {
          setAuth(data);
        }
      })
      .catch(() => {});
  }, []);

  // Queue query
  const { data: queue = [], isLoading: queueLoading } = useQuery<QueueItem[]>({
    queryKey: ["/api/underwriting/queue"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: auth.isAuthenticated,
    refetchInterval: 30000,
  });

  // File detail query
  const { data: fileDetail, isLoading: fileLoading } = useQuery<FileDetail>({
    queryKey: ["/api/underwriting/file/" + encodeURIComponent(selectedEmail || "")],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!selectedEmail && auth.isAuthenticated,
  });

  // Pre-load saved snapshot when file detail arrives
  useEffect(() => {
    if (fileDetail?.savedSnapshot) {
      setSnapshot(fileDetail.savedSnapshot.snapshot);
      setSnapshotRanAt(fileDetail.savedSnapshot.ranAt);
    } else if (fileDetail && !fileDetail.savedSnapshot) {
      // File opened with no saved snapshot — clear any previous file's snapshot
      setSnapshot(null);
      setSnapshotRanAt(null);
    }
  }, [fileDetail]);

  // Lender network
  const { data: lenderNetwork = [] } = useQuery<LenderContact[]>({
    queryKey: ["/api/underwriting/lender-network"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: auth.isAuthenticated,
  });

  // Shop mutation
  const shopMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/underwriting/shop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to shop deal");
      return res.json();
    },
    onSuccess: (data) => {
      const succeeded = data.results?.filter((r: any) => r.success).length || 0;
      const failed = data.results?.filter((r: any) => !r.success).length || 0;
      toast({
        title: `Deal sent to ${succeeded} lender${succeeded !== 1 ? 's' : ''}`,
        description: failed > 0 ? `${failed} failed to send` : `${data.attachmentCount} files attached`,
      });
      setShopDialogOpen(false);
      setSelectedLenders(new Set());
    },
    onError: (err: any) => {
      toast({ title: "Failed to shop deal", description: err.message, variant: "destructive" });
    },
  });

  // Unqualified mutation
  const unqualifiedMutation = useMutation({
    mutationFn: async (payload: { email: string; note: string }) => {
      const res = await fetch("/api/underwriting/mark-unqualified", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "File marked as unqualified" });
      setUnqualifiedDialogOpen(false);
      setUnqualifiedNote("");
      queryClient.invalidateQueries({ queryKey: ["/api/underwriting/queue"] });
      if (selectedEmail) queryClient.invalidateQueries({ queryKey: ["/api/underwriting/file/" + encodeURIComponent(selectedEmail)] });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // Request info mutation
  const requestInfoMutation = useMutation({
    mutationFn: async (payload: { email: string; note: string }) => {
      const res = await fetch("/api/underwriting/request-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Info request sent", description: `Sent to ${data.sentTo}` });
      setRequestInfoDialogOpen(false);
      setRequestInfoNote("");
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // Run AI Snapshot
  const runSnapshot = async () => {
    if (!selectedEmail) return;
    setSnapshotLoading(true);
    setSnapshot(null);
    try {
      const app = fileDetail?.application;
      const res = await fetch("/api/bank-statements/analyze-for-rep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: selectedEmail,
          businessName: app?.legalBusinessName || app?.businessName,
          creditScoreRange: app?.creditScore || app?.ficoScoreExact,
          timeInBusiness: app?.timeInBusiness,
          industry: app?.industry,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Analysis failed");
      const data = await res.json();
      setSnapshot(data.snapshot);
      setSnapshotRanAt(new Date().toISOString());
    } catch (err: any) {
      toast({ title: "AI Snapshot Failed", description: err.message, variant: "destructive" });
    } finally {
      setSnapshotLoading(false);
    }
  };

  // Open shop dialog and pre-fill from application
  const openShopDialog = () => {
    const app = fileDetail?.application;
    const stmts = fileDetail?.bankStatements || [];
    // Pre-select all statements
    setSelectedStatements(new Set(stmts.map((s: any) => s.id)));
    // Pre-fill deal overview from app data
    setDealOverview({
      state: app?.state || "",
      industry: app?.industry || "",
      amountSeeking: app?.requestedAmount ? "$" + Number(app.requestedAmount).toLocaleString() : "MAX",
      positionSeeking: "",
      outstandingBalance: "",
      creditScore: app?.ficoScoreExact || app?.creditScore || "",
      additionalNotes: "",
    });
    setSelectedLenders(new Set());
    setCcReps([]);
    setCcRepInput("");
    setShopDialogOpen(true);
  };

  const handleShop = () => {
    if (!selectedEmail || selectedLenders.size === 0) return;
    const lenderEmails = Array.from(selectedLenders).map(name => {
      const lender = lenderNetwork.find(l => l.name === name);
      return {
        to: lender?.emails || [],
        cc: lender?.ccEmails || [],
        lenderName: name,
      };
    }).filter(l => l.to.length > 0);

    if (lenderEmails.length === 0) {
      toast({ title: "No valid lender emails", description: "Selected lenders have no email addresses", variant: "destructive" });
      return;
    }

    shopMutation.mutate({
      email: selectedEmail,
      lenderEmails,
      statementIds: Array.from(selectedStatements),
      dealOverview,
      ccReps: ccReps.filter(e => e.trim()),
    });
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    setAuth({ isAuthenticated: false });
  };

  // Login screen — LoginForm renders its own full-screen layout
  if (!auth.isAuthenticated) {
    return (
      <LoginForm onLoginSuccess={() => {
        fetch("/api/auth/check", { credentials: "include" })
          .then(r => r.json())
          .then(data => {
            if (data.isAuthenticated && (data.role === 'underwriting' || data.role === 'admin')) {
              setAuth(data);
            } else {
              setAuth({ isAuthenticated: false });
            }
          });
      }} />
    );
  }

  const TERMINAL_STATUSES = new Set(['approved', 'declined', 'unqualified']);

  // Filtered queue
  const filteredQueue = queue.filter(item => {
    const matchesSearch = !searchQuery ||
      item.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.fullName || "").toLowerCase().includes(searchQuery.toLowerCase());

    const isTerminal = TERMINAL_STATUSES.has(item.decisionStatus || '');
    const matchesFilter =
      filterStatus === "all" ||
      (filterStatus === "not-submitted" && !item.uwSubmittedAt && !isTerminal) ||
      (filterStatus === "submitted" && !!item.uwSubmittedAt && !isTerminal) ||
      (filterStatus === "approved" && item.decisionStatus === "approved") ||
      (filterStatus === "declined" && item.decisionStatus === "declined") ||
      (filterStatus === "unqualified" && item.decisionStatus === "unqualified");

    return matchesSearch && matchesFilter;
  });

  // ── FILE DETAIL VIEW ──
  if (selectedEmail && fileDetail) {
    const app = fileDetail.application;
    const stmts = fileDetail.bankStatements;
    const decisions = fileDetail.underwritingDecisions;
    const approvals = fileDetail.lenderApprovals;
    const businessName = app?.legalBusinessName || app?.businessName || selectedEmail;

    return (
      <div className="min-h-screen bg-slate-50">
        {/* Header */}
        <div className="bg-[#1e3a5f] text-white px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/10" onClick={() => { setSelectedEmail(null); setSnapshot(null); }}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Back to Queue
              </Button>
              <div>
                <h1 className="text-lg font-bold">{businessName}</h1>
                <p className="text-sm text-blue-200">{selectedEmail}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {app?.id && (
                <a href={`/api/applications/${app.id}/view`} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" variant="outline" className="text-white border-white/30 hover:bg-white/10">
                    <ExternalLink className="h-4 w-4 mr-1" /> View Application
                  </Button>
                </a>
              )}
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={openShopDialog}>
                <Send className="h-4 w-4 mr-1" /> Shop File
              </Button>
              <Button size="sm" variant="outline" className="text-white border-white/30 hover:bg-white/10" onClick={() => setRequestInfoDialogOpen(true)}>
                <MessageSquare className="h-4 w-4 mr-1" /> Request Info
              </Button>
              <Button size="sm" variant="outline" className="text-red-300 border-red-400/40 hover:bg-red-500/20" onClick={() => setUnqualifiedDialogOpen(true)}>
                <Ban className="h-4 w-4 mr-1" /> Unqualified
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column — Application + Bank Statements */}
          <div className="lg:col-span-2 space-y-6">
            {/* Application Details */}
            <Card className="p-6">
              <h2 className="text-lg font-bold text-[#1e3a5f] mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5" /> Application Details
              </h2>
              {app ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <InfoField label="Legal Name" value={app.legalBusinessName || app.businessName} />
                  <InfoField label="DBA" value={app.doingBusinessAs} />
                  <InfoField label="Contact" value={app.fullName} />
                  <InfoField label="Phone" value={app.phone} />
                  <InfoField label="Email" value={app.email} />
                  <InfoField label="State" value={app.state} />
                  <InfoField label="Industry" value={app.industry} />
                  <InfoField label="Time in Business" value={app.timeInBusiness} />
                  <InfoField label="Monthly Revenue" value={app.monthlyRevenue ? "$" + Number(app.monthlyRevenue).toLocaleString() : app.averageMonthlyRevenue ? "$" + Number(app.averageMonthlyRevenue).toLocaleString() : null} />
                  <InfoField label="Requested Amount" value={app.requestedAmount ? "$" + Number(app.requestedAmount).toLocaleString() : null} />
                  <InfoField label="Credit Score" value={app.ficoScoreExact || app.creditScore} />
                  <InfoField label="EIN" value={app.ein} />
                  <InfoField label="Outstanding Loans" value={app.hasOutstandingLoans ? "Yes" + (app.outstandingLoansAmount ? " — $" + Number(app.outstandingLoansAmount).toLocaleString() : "") : "No"} />
                  <InfoField label="MCA Balance" value={app.mcaBalanceAmount ? "$" + Number(app.mcaBalanceAmount).toLocaleString() + (app.mcaBalanceBankName ? " (" + app.mcaBalanceBankName + ")" : "") : null} />
                  <InfoField label="Sales Rep" value={app.agentName} />
                  {app.id && (
                    <div className="col-span-full pt-1">
                      <a href={`/api/applications/${app.id}/view`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs flex items-center gap-1">
                        <ExternalLink className="h-3 w-3" /> View Full Application
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No application on file for this email.</p>
              )}
            </Card>

            {/* Bank Statements */}
            <Card className="p-6">
              <h2 className="text-lg font-bold text-[#1e3a5f] mb-4 flex items-center gap-2">
                <Download className="h-5 w-5" /> Bank Statements ({stmts.length})
              </h2>
              {stmts.length > 0 ? (
                <div className="space-y-2">
                  {stmts.map((stmt: any) => (
                    <div key={stmt.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-blue-500" />
                        <div>
                          <p className="text-sm font-medium">{stmt.originalFileName}</p>
                          <p className="text-xs text-gray-500">
                            {stmt.fileSize ? (stmt.fileSize / 1024 / 1024).toFixed(1) + " MB" : ""}
                            {stmt.createdAt ? " — " + new Date(stmt.createdAt).toLocaleDateString() : ""}
                          </p>
                        </div>
                      </div>
                      <a href={`/api/bank-statements/view/${stmt.id}`} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm"><Eye className="h-3 w-3 mr-1" /> View</Button>
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No bank statements uploaded.</p>
              )}
            </Card>

            {/* Previous Approvals & Declines */}
            {(decisions.length > 0 || approvals.length > 0) && (
              <Card className="p-6">
                <h2 className="text-lg font-bold text-[#1e3a5f] mb-4">Previous Decisions & Approvals</h2>
                {decisions.map((d: any) => (
                  <div key={d.id} className="mb-3 p-3 bg-gray-50 rounded-lg border">
                    <div className="flex items-center gap-2 mb-1">
                      <StatusBadge status={d.status} />
                      {d.lender && <span className="text-sm font-medium">{d.lender}</span>}
                      {d.createdAt && <span className="text-xs text-gray-400">{new Date(d.createdAt).toLocaleDateString()}</span>}
                    </div>
                    {d.advanceAmount && <p className="text-sm">Amount: ${Number(d.advanceAmount).toLocaleString()}</p>}
                    {d.factorRate && <p className="text-sm">Factor: {d.factorRate}</p>}
                    {d.declineReason && <p className="text-sm text-red-600">Reason: {d.declineReason}</p>}
                    {d.notes && <p className="text-sm text-gray-600">{d.notes}</p>}
                  </div>
                ))}
                {approvals.map((a: any) => (
                  <div key={a.id} className="mb-3 p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className="bg-green-600 text-white text-xs">Lender Approval</Badge>
                      <span className="text-sm font-medium">{a.lenderName}</span>
                      {a.createdAt && <span className="text-xs text-gray-400">{new Date(a.createdAt).toLocaleDateString()}</span>}
                    </div>
                    {a.approvedAmount && <p className="text-sm">Approved: ${Number(a.approvedAmount).toLocaleString()}</p>}
                    {a.termLength && <p className="text-sm">Term: {a.termLength}</p>}
                    {a.factorRate && <p className="text-sm">Factor: {a.factorRate}</p>}
                  </div>
                ))}
              </Card>
            )}
          </div>

          {/* Right column — AI Snapshot */}
          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-[#1e3a5f] flex items-center gap-2">
                    <Sparkles className="h-5 w-5" /> AI Underwriting Snapshot
                  </h2>
                  {snapshotRanAt && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      Last run {new Date(snapshotRanAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} at {new Date(snapshotRanAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                    </p>
                  )}
                </div>
                <Button size="sm" onClick={runSnapshot} disabled={snapshotLoading || stmts.length === 0}>
                  {snapshotLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Bot className="h-4 w-4 mr-1" />}
                  {snapshot ? "Re-run" : "Run Snapshot"}
                </Button>
              </div>

              {stmts.length === 0 && !snapshot && (
                <p className="text-sm text-gray-500">Upload bank statements first to run the AI snapshot.</p>
              )}

              {snapshotLoading && (
                <div className="flex items-center gap-2 text-sm text-gray-500 py-8 justify-center">
                  <Loader2 className="h-5 w-5 animate-spin" /> Analyzing bank statements...
                </div>
              )}

              {snapshot && !snapshotLoading && (() => {
                const fmtK = (n: number) => {
                  if (!n && n !== 0) return '—';
                  if (n >= 1000000) return '$' + (n / 1000000).toFixed(1) + 'M';
                  if (n >= 1000) return '$' + (Math.round(n / 100) / 10) + 'k';
                  return '$' + n.toLocaleString();
                };
                return (
                <div className="space-y-0 text-sm -mx-6 -mb-6">
                  {/* ── Verdict banner ── */}
                  <div className={`px-6 py-4 border-b ${snapshot.worthSubmitting ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-2xl text-gray-800">{snapshot.overallScore}<span className="text-base font-normal text-gray-500">/100</span></span>
                        <Badge className={snapshot.worthSubmitting ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}>
                          {snapshot.worthSubmitting ? "Worth Submitting" : "Do Not Submit"}
                        </Badge>
                      </div>
                      <span className="text-xs text-gray-500 font-medium">{snapshot.qualificationTier}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2 leading-relaxed">{snapshot.summary}</p>
                  </div>

                  {/* ── Monthly scorecard table ── */}
                  {snapshot.monthlyData && snapshot.monthlyData.length > 0 ? (
                    <div className="overflow-x-auto px-6 pt-4 pb-2">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left text-xs text-gray-400 pb-2 pr-4 font-medium">Statements</th>
                            {snapshot.monthlyData.map((m, i) => (
                              <th key={i} className="text-center text-xs text-gray-400 pb-2 px-3 font-medium whitespace-nowrap min-w-16">{m.month}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {([
                            { label: 'Deposits', key: 'deposits', fmt: (v: number) => fmtK(v), redIf: false },
                            { label: 'Avg Balance', key: 'avgBalance', fmt: (v: number) => fmtK(v), redIf: false },
                            { label: '# Deposits', key: 'numDeposits', fmt: (v: string) => String(v), redIf: false },
                            { label: 'NSFs', key: 'nsfs', fmt: (v: number) => String(v), redIf: true },
                            { label: 'Neg Days', key: 'negativeDays', fmt: (v: number) => String(v), redIf: true },
                          ] as const).map(row => (
                            <tr key={row.key} className="border-b border-gray-100 last:border-0">
                              <td className="py-2 pr-4 text-xs text-gray-400 whitespace-nowrap">{row.label}</td>
                              {snapshot.monthlyData!.map((m, i) => {
                                const val = (m as any)[row.key];
                                const isRed = row.redIf && Number(val) > 0;
                                return (
                                  <td key={i} className={`text-center py-2 px-3 font-semibold text-sm ${isRed ? 'text-red-500' : 'text-gray-800'}`}>
                                    {(row.fmt as any)(val)}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    /* Fallback for snapshots without monthly data */
                    <div className="grid grid-cols-2 gap-3 px-6 pt-4 pb-2">
                      <MetricCard label="Avg Monthly Revenue" value={fmtK(snapshot.avgMonthlyRevenue)} />
                      <MetricCard label="Revenue Trend" value={snapshot.revenueTrend} />
                      <MetricCard label="Avg Daily Balance" value={fmtK(snapshot.avgDailyBalance)} />
                      <MetricCard label="NSF Count" value={String(snapshot.nsfCount)} alert={snapshot.nsfCount > 0} />
                      <MetricCard label="Negative Days" value={String(snapshot.negativeDays)} alert={snapshot.negativeDays > 0} />
                      <MetricCard label="Debt Service Ratio" value={(snapshot.debtServiceRatio * 100).toFixed(0) + "%"} alert={snapshot.debtServiceRatio > 0.5} />
                    </div>
                  )}

                  {/* ── Key stats strip ── */}
                  <div className="flex flex-wrap gap-x-5 gap-y-1 px-6 py-3 text-sm border-t border-gray-100 bg-gray-50">
                    <span>
                      <span className="text-gray-400">Positions: </span>
                      <span className={`font-medium ${snapshot.existingPositions.length > 0 ? 'text-orange-500' : 'text-emerald-600'}`}>
                        {snapshot.existingPositions.length === 0 ? 'None' : snapshot.existingPositions.map(p => p.funder).join(', ')}
                      </span>
                    </span>
                    {snapshot.maxRecommendedAdvance > 0 && (
                      <span>
                        <span className="text-gray-400">Max Advance: </span>
                        <span className="font-medium text-gray-800">${snapshot.maxRecommendedAdvance.toLocaleString()}</span>
                      </span>
                    )}
                    <span>
                      <span className="text-gray-400">Factor: </span>
                      <span className="font-medium text-gray-800">{snapshot.estimatedFactor}</span>
                    </span>
                    <span>
                      <span className="text-gray-400">Product: </span>
                      <span className="font-medium text-gray-800">{snapshot.recommendedProduct}</span>
                    </span>
                  </div>

                  {/* ── More info toggle ── */}
                  <div className="px-6 pb-6 border-t border-gray-100 pt-3">
                    <button
                      onClick={() => setShowDeepDive(v => !v)}
                      className="text-xs text-blue-600 flex items-center gap-1 hover:underline"
                      data-testid="button-toggle-deep-dive"
                    >
                      {showDeepDive
                        ? <><CheckCircle2 className="h-3 w-3" /> Hide detailed analysis</>
                        : <><AlertTriangle className="h-3 w-3" /> More info</>}
                    </button>

                    {showDeepDive && (
                      <div className="mt-4 space-y-4">
                        {snapshot.existingPositions.length > 0 && (
                          <div>
                            <p className="font-semibold mb-2 text-gray-700">Current Financing Positions:</p>
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
                                <thead>
                                  <tr className="bg-gray-100 text-gray-600">
                                    <th className="text-left py-2 px-2 font-semibold">Funder</th>
                                    <th className="text-left py-2 px-2 font-semibold">Payment</th>
                                    <th className="text-left py-2 px-2 font-semibold">Freq</th>
                                    <th className="text-left py-2 px-2 font-semibold">Est. Amount</th>
                                    <th className="text-left py-2 px-2 font-semibold">Est. Term</th>
                                    <th className="text-left py-2 px-2 font-semibold">Notes</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {snapshot.existingPositions.map((pos, i) => (
                                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                      <td className="py-1.5 px-2 font-medium text-gray-900">{pos.funder}</td>
                                      <td className="py-1.5 px-2 text-gray-700">{pos.estimatedPayment}</td>
                                      <td className="py-1.5 px-2 text-gray-700">{pos.frequency}</td>
                                      <td className="py-1.5 px-2 text-gray-700">{pos.estimatedOriginalAmount || '—'}</td>
                                      <td className="py-1.5 px-2 text-gray-700">{pos.estimatedTerm || '—'}</td>
                                      <td className="py-1.5 px-2 text-gray-600">
                                        {pos.paymentsLowered && <span className="text-amber-600 font-medium">Payments lowered. </span>}
                                        {pos.anomalies || (pos.paymentsLowered ? '' : '—')}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            {snapshot.totalMonthlyDebtPayments > 0 && (
                              <p className="text-gray-500 text-xs mt-1.5">Total: ~${snapshot.totalMonthlyDebtPayments.toLocaleString()}/mo · DSR: {(snapshot.debtServiceRatio * 100).toFixed(0)}%</p>
                            )}
                          </div>
                        )}
                        {snapshot.redFlags.length > 0 && (
                          <div>
                            <p className="font-semibold mb-1 text-red-700">Red Flags:</p>
                            {snapshot.redFlags.map((rf, i) => (
                              <div key={i} className="flex items-center gap-2 text-sm">
                                <AlertTriangle className={`h-3 w-3 flex-shrink-0 ${rf.severity === 'high' ? 'text-red-600' : rf.severity === 'medium' ? 'text-amber-500' : 'text-gray-400'}`} />
                                <span>{rf.flag}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {snapshot.positiveIndicators.length > 0 && (
                          <div>
                            <p className="font-semibold mb-1 text-emerald-700">Positive Indicators:</p>
                            {snapshot.positiveIndicators.map((pi, i) => (
                              <div key={i} className="flex items-center gap-2 text-sm">
                                <CheckCircle2 className="h-3 w-3 text-emerald-500 flex-shrink-0" /><span>{pi}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {snapshot.underwriterNotes.length > 0 && (
                          <div>
                            <p className="font-semibold mb-1 text-gray-700">Notes:</p>
                            <ul className="list-disc list-inside text-gray-600 space-y-1 text-sm">
                              {snapshot.underwriterNotes.map((n, i) => <li key={i}>{n}</li>)}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                );
              })()}
            </Card>
          </div>
        </div>

        {/* ── SHOP FILE DIALOG ── */}
        <Dialog open={shopDialogOpen} onOpenChange={setShopDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-[#1e3a5f]">Shop File — {businessName}</DialogTitle>
            </DialogHeader>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
              {/* Left: Deal Overview Form */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide">Deal Overview</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">State</Label>
                    <Input value={dealOverview.state} onChange={e => setDealOverview(p => ({ ...p, state: e.target.value }))} placeholder="CA" />
                  </div>
                  <div>
                    <Label className="text-xs">Industry</Label>
                    <Input value={dealOverview.industry} onChange={e => setDealOverview(p => ({ ...p, industry: e.target.value }))} placeholder="Restaurant" />
                  </div>
                  <div>
                    <Label className="text-xs">Amount Seeking</Label>
                    <Input value={dealOverview.amountSeeking} onChange={e => setDealOverview(p => ({ ...p, amountSeeking: e.target.value }))} placeholder="MAX" />
                  </div>
                  <div>
                    <Label className="text-xs">Position Seeking</Label>
                    <Input value={dealOverview.positionSeeking} onChange={e => setDealOverview(p => ({ ...p, positionSeeking: e.target.value }))} placeholder="1st / reverse" />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Outstanding Balance</Label>
                    <Input value={dealOverview.outstandingBalance} onChange={e => setDealOverview(p => ({ ...p, outstandingBalance: e.target.value }))} placeholder="Vital 45k, Specialty 65k" />
                  </div>
                  <div>
                    <Label className="text-xs">Credit Score</Label>
                    <Input value={dealOverview.creditScore} onChange={e => setDealOverview(p => ({ ...p, creditScore: e.target.value }))} placeholder="800" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Additional Notes</Label>
                  <Textarea value={dealOverview.additionalNotes} onChange={e => setDealOverview(p => ({ ...p, additionalNotes: e.target.value }))} placeholder="Any additional notes..." rows={3} />
                </div>

                {/* CC Reps */}
                <div>
                  <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide mb-2">CC Reps on Emails</h3>
                  <p className="text-xs text-gray-500 mb-2">dillon@ and admin@ are always CC'd automatically.</p>
                  <div className="flex gap-2">
                    <Input
                      value={ccRepInput}
                      onChange={e => setCcRepInput(e.target.value)}
                      placeholder="rep@todaycapitalgroup.com"
                      className="text-sm"
                      onKeyDown={e => {
                        if (e.key === 'Enter' && ccRepInput.trim()) {
                          e.preventDefault();
                          if (!ccReps.includes(ccRepInput.trim())) {
                            setCcReps(prev => [...prev, ccRepInput.trim()]);
                          }
                          setCcRepInput("");
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (ccRepInput.trim() && !ccReps.includes(ccRepInput.trim())) {
                          setCcReps(prev => [...prev, ccRepInput.trim()]);
                        }
                        setCcRepInput("");
                      }}
                    >
                      Add
                    </Button>
                  </div>
                  {ccReps.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {ccReps.map((rep, i) => (
                        <Badge key={i} variant="secondary" className="text-xs cursor-pointer" onClick={() => setCcReps(prev => prev.filter((_, idx) => idx !== i))}>
                          {rep} &times;
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Statement Selection */}
                <div>
                  <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide mb-2">Attach Statements</h3>
                  {stmts.length === 0 ? (
                    <p className="text-sm text-gray-500">No statements on file.</p>
                  ) : (
                    <div className="space-y-2">
                      {stmts.map((stmt: any) => (
                        <label key={stmt.id} className="flex items-center gap-2 p-2 rounded border hover:bg-gray-50 cursor-pointer">
                          <Checkbox
                            checked={selectedStatements.has(stmt.id)}
                            onCheckedChange={(checked) => {
                              setSelectedStatements(prev => {
                                const next = new Set(prev);
                                if (checked) next.add(stmt.id); else next.delete(stmt.id);
                                return next;
                              });
                            }}
                          />
                          <FileText className="h-4 w-4 text-blue-500" />
                          <span className="text-sm">{stmt.originalFileName}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Lender Selection */}
              <div>
                <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide mb-2">Select Lenders</h3>
                <div className="space-y-1 max-h-[500px] overflow-y-auto pr-2">
                  {lenderNetwork.filter(l => l.emails.length > 0).map(lender => (
                    <label key={lender.name} className={`flex items-center justify-between p-2.5 rounded border cursor-pointer transition-colors ${selectedLenders.has(lender.name) ? 'bg-emerald-50 border-emerald-300' : 'hover:bg-gray-50'}`}>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedLenders.has(lender.name)}
                          onCheckedChange={(checked) => {
                            setSelectedLenders(prev => {
                              const next = new Set(prev);
                              if (checked) next.add(lender.name); else next.delete(lender.name);
                              return next;
                            });
                          }}
                        />
                        <div>
                          <p className="text-sm font-medium">{lender.name}</p>
                          <p className="text-xs text-gray-500">{lender.emails.join(", ")}</p>
                        </div>
                      </div>
                      {selectedLenders.has(lender.name) && (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      )}
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">{selectedLenders.size} lender{selectedLenders.size !== 1 ? 's' : ''} selected</p>
              </div>
            </div>

            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setShopDialogOpen(false)}>Cancel</Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={handleShop}
                disabled={shopMutation.isPending || selectedLenders.size === 0}
              >
                {shopMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
                Send to {selectedLenders.size} Lender{selectedLenders.size !== 1 ? 's' : ''}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── UNQUALIFIED DIALOG ── */}
        <Dialog open={unqualifiedDialogOpen} onOpenChange={setUnqualifiedDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-red-700">Mark as Unqualified — {businessName}</DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              <Label>Reason / Notes</Label>
              <Textarea
                value={unqualifiedNote}
                onChange={e => setUnqualifiedNote(e.target.value)}
                placeholder="Explain why this file is unqualified..."
                rows={4}
                className="mt-1"
              />
            </div>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setUnqualifiedDialogOpen(false)}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={() => unqualifiedMutation.mutate({ email: selectedEmail!, note: unqualifiedNote })}
                disabled={unqualifiedMutation.isPending || !unqualifiedNote.trim()}
              >
                {unqualifiedMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Ban className="h-4 w-4 mr-1" />}
                Mark Unqualified
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── REQUEST INFO DIALOG ── */}
        <Dialog open={requestInfoDialogOpen} onOpenChange={setRequestInfoDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-[#1e3a5f]">Request More Info — {businessName}</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-gray-600">
              This will email the sales rep on file ({app?.agentName || 'Unknown'} — {app?.agentEmail || 'no email'}) requesting additional information.
            </p>
            <div className="mt-4">
              <Label>What do you need?</Label>
              <Textarea
                value={requestInfoNote}
                onChange={e => setRequestInfoNote(e.target.value)}
                placeholder="e.g., Need 3 most recent months of bank statements, need updated application with SSN..."
                rows={4}
                className="mt-1"
              />
            </div>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setRequestInfoDialogOpen(false)}>Cancel</Button>
              <Button
                onClick={() => requestInfoMutation.mutate({ email: selectedEmail!, note: requestInfoNote })}
                disabled={requestInfoMutation.isPending || !requestInfoNote.trim() || !app?.agentEmail}
              >
                {requestInfoMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <MessageSquare className="h-4 w-4 mr-1" />}
                Send Request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  const TAB_DEFS = [
    { value: "all",           label: "All" },
    { value: "not-submitted", label: "Not Yet Submitted" },
    { value: "submitted",     label: "Submitted" },
    { value: "approved",      label: "Approved" },
    { value: "declined",      label: "Declined" },
    { value: "unqualified",   label: "Unqualified" },
  ] as const;

  // Count per tab (unaffected by search so the numbers are always stable)
  const tabCounts = TAB_DEFS.reduce((acc, tab) => {
    const isTerminal = (s: string | null) => TERMINAL_STATUSES.has(s || '');
    acc[tab.value] = queue.filter(item => {
      if (tab.value === "all") return true;
      if (tab.value === "not-submitted") return !item.uwSubmittedAt && !isTerminal(item.decisionStatus);
      if (tab.value === "submitted")     return !!item.uwSubmittedAt && !isTerminal(item.decisionStatus);
      if (tab.value === "approved")      return item.decisionStatus === "approved";
      if (tab.value === "declined")      return item.decisionStatus === "declined";
      if (tab.value === "unqualified")   return item.decisionStatus === "unqualified";
      return false;
    }).length;
    return acc;
  }, {} as Record<string, number>);

  // ── QUEUE VIEW ──
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-[#1e3a5f] text-white px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6" />
            <div>
              <h1 className="text-lg font-bold">Underwriting Portal</h1>
              <p className="text-xs text-blue-200">All files with bank statements uploaded in the past 30 days</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-blue-200">{auth.agentName || auth.agentEmail}</span>
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/10" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Tabs */}
        <Tabs value={filterStatus} onValueChange={setFilterStatus} className="mb-0">
          <div className="flex items-center gap-4 mb-4 flex-wrap gap-y-2">
            <TabsList className="bg-white border h-auto p-1 flex-wrap gap-1">
              {TAB_DEFS.map(tab => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  data-testid={`tab-uw-${tab.value}`}
                  className="text-xs px-3 py-1.5 gap-1.5"
                >
                  {tab.label}
                  <span className={`inline-flex items-center justify-center rounded-full text-xs font-semibold min-w-[18px] px-1 ${
                    filterStatus === tab.value
                      ? "bg-[#1e3a5f] text-white"
                      : "bg-gray-100 text-gray-600"
                  }`}>
                    {tabCounts[tab.value] ?? 0}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Search */}
            <div className="relative flex-1 min-w-48 max-w-sm ml-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by business, email, or contact..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-uw-search"
              />
            </div>
          </div>

          {TAB_DEFS.map(tab => (
            <TabsContent key={tab.value} value={tab.value} className="mt-0">
              {/* Queue Loading */}
              {queueLoading && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              )}

              {/* Empty state */}
              {!queueLoading && filteredQueue.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="font-medium">
                    {searchQuery
                      ? "No files match your search in this tab."
                      : tab.value === "all"
                        ? "No files with bank statements in the past 30 days."
                        : `No files in "${tab.label}" right now.`}
                  </p>
                </div>
              )}

              {/* Table */}
              {!queueLoading && filteredQueue.length > 0 && (
                <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b">
                        <th className="text-left py-3 px-4 font-semibold text-gray-600">Business</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-600">Contact</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-600">State</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-600">Revenue</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-600">Stmts</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-600">Status</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-600">Rep</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-600">Uploaded</th>
                        <th className="text-right py-3 px-4"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredQueue.map(item => (
                        <tr
                          key={item.email}
                          data-testid={`row-uw-${item.email}`}
                          className="border-b hover:bg-blue-50/50 cursor-pointer transition-colors"
                          onClick={() => setSelectedEmail(item.email)}
                        >
                          <td className="py-3 px-4">
                            <p className="font-medium text-[#1e3a5f]">{item.businessName}</p>
                            <p className="text-xs text-gray-500">{item.email}</p>
                          </td>
                          <td className="py-3 px-4 text-gray-700">{item.fullName || "—"}</td>
                          <td className="py-3 px-4 text-gray-700">{item.state || "—"}</td>
                          <td className="py-3 px-4 text-gray-700">
                            {item.monthlyRevenue ? "$" + Number(item.monthlyRevenue).toLocaleString() : "—"}
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant="secondary">{item.statementCount}</Badge>
                          </td>
                          <td className="py-3 px-4">
                            <QueueStatusBadge item={item} />
                          </td>
                          <td className="py-3 px-4 text-gray-700 text-xs">{item.agentName || "—"}</td>
                          <td className="py-3 px-4 text-gray-500 text-xs">
                            {item.latestUploadAt ? new Date(item.latestUploadAt).toLocaleDateString() : "—"}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {item.applicationId && (
                                <a
                                  href={`/api/applications/${item.applicationId}/view`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={e => e.stopPropagation()}
                                >
                                  <Button variant="ghost" size="sm" className="text-gray-500 hover:text-blue-600" title="View Application">
                                    <ExternalLink className="h-3.5 w-3.5" />
                                  </Button>
                                </a>
                              )}
                              <Button variant="ghost" size="sm" className="text-blue-600">
                                Review <ChevronLeft className="h-3 w-3 ml-1 rotate-180" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}

// ── Helper Components ──

function InfoField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs text-gray-500 font-medium">{label}</p>
      <p className="text-sm text-gray-900">{value || "—"}</p>
    </div>
  );
}

function MetricCard({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <div className={`p-3 rounded-lg border ${alert ? 'bg-red-50 border-red-200' : 'bg-gray-50'}`}>
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-sm font-semibold ${alert ? 'text-red-700' : 'text-gray-900'}`}>{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <Badge variant="outline" className="text-gray-500 border-gray-300">Pending Review</Badge>;
  switch (status) {
    case 'approved': return <Badge className="bg-emerald-600 text-white">Approved</Badge>;
    case 'funded': return <Badge className="bg-blue-600 text-white">Funded</Badge>;
    case 'declined': return <Badge className="bg-red-600 text-white">Declined</Badge>;
    case 'unqualified': return <Badge className="bg-orange-500 text-white">Unqualified</Badge>;
    default: return <Badge variant="outline">{status}</Badge>;
  }
}

function QueueStatusBadge({ item }: { item: QueueItem }) {
  const TERMINAL = new Set(['approved', 'declined', 'unqualified', 'funded']);
  if (item.decisionStatus && TERMINAL.has(item.decisionStatus)) {
    return <StatusBadge status={item.decisionStatus} />;
  }
  if (item.uwSubmittedAt) {
    return <Badge className="bg-indigo-600 text-white">Submitted</Badge>;
  }
  return <Badge variant="outline" className="text-gray-500 border-gray-300">Not Submitted</Badge>;
}
