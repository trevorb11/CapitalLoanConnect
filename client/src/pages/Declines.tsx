import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocation, Link } from "wouter";
import {
  Building2,
  XCircle,
  Loader2,
  ShieldAlert,
  ArrowLeft,
  Search,
  CheckCircle2,
  Calendar as CalendarIcon,
  Trash2,
  Eye,
  Download,
  FileText,
  FolderArchive,
  ChevronDown,
  ChevronUp,
  Pencil,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { StatusToggle } from "@/components/StatusToggle";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { BusinessUnderwritingDecision } from "@shared/schema";
import { AGENTS } from "@shared/agents";

interface AuthState {
  isAuthenticated: boolean;
  role?: 'admin' | 'agent' | 'underwriting';
  agentName?: string;
  agentEmail?: string;
}

interface BankStatementUpload {
  id: string;
  email: string;
  businessName: string;
  originalFileName: string;
  fileSize: number;
  createdAt: string;
  source?: string;
}

function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "N/A";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default function Declines() {
  const [, setLocation] = useLocation();
  const [accessDenied, setAccessDenied] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authRole, setAuthRole] = useState<string>("");
  const [authAgentName, setAuthAgentName] = useState<string>("");
  const [repFilter, setRepFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  // Edit state
  const [editDialog, setEditDialog] = useState<BusinessUnderwritingDecision | null>(null);
  const [editForm, setEditForm] = useState({
    declineReason: '',
    notes: '',
    followUpWorthy: false,
    followUpDate: '',
  });
  const [editDeclines, setEditDeclines] = useState<Array<{ id: string; lender: string; reason: string; date: string }>>([]);
  const [newDeclineLender, setNewDeclineLender] = useState('');
  const [newDeclineReason, setNewDeclineReason] = useState('');
  const [newDeclineDate, setNewDeclineDate] = useState('');

  const openEditDialog = (decision: BusinessUnderwritingDecision) => {
    const declines = Array.isArray((decision as any).additionalDeclines) ? (decision as any).additionalDeclines : [];
    setEditDeclines(declines.map((d: any) => ({
      id: d.id || `decl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      lender: d.lender || '',
      reason: d.reason || '',
      date: d.date || '',
    })));
    setEditForm({
      declineReason: decision.declineReason || '',
      notes: decision.notes || '',
      followUpWorthy: decision.followUpWorthy || false,
      followUpDate: decision.followUpDate ? new Date(decision.followUpDate).toISOString().split('T')[0] : '',
    });
    setNewDeclineLender('');
    setNewDeclineReason('');
    setNewDeclineDate('');
    setEditDialog(decision);
  };

  // Edit mutation
  const editMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, any> }) => {
      const res = await fetch(`/api/underwriting-decisions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to update');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/underwriting-decisions"] });
      setEditDialog(null);
      toast({
        title: "Updated",
        description: "Decline record has been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update the decline record.",
        variant: "destructive",
      });
    },
  });

  const handleSaveEdit = () => {
    if (!editDialog) return;
    editMutation.mutate({
      id: editDialog.id,
      data: {
        additionalDeclines: editDeclines.length > 0 ? editDeclines.map(d => ({
          ...d,
          createdAt: new Date().toISOString(),
        })) : null,
        declineReason: editForm.declineReason,
        notes: editForm.notes || null,
        followUpWorthy: editForm.followUpWorthy,
        followUpDate: editForm.followUpWorthy && editForm.followUpDate
          ? editForm.followUpDate + 'T12:00:00.000Z'
          : null,
      },
    });
  };

  const addDeclineEntry = () => {
    if (!newDeclineLender.trim()) return;
    setEditDeclines(prev => [...prev, {
      id: `decl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      lender: newDeclineLender.trim(),
      reason: newDeclineReason.trim(),
      date: newDeclineDate || new Date().toISOString().slice(0, 10),
    }]);
    setNewDeclineLender('');
    setNewDeclineReason('');
    setNewDeclineDate('');
  };

  const removeDeclineEntry = (id: string) => {
    setEditDeclines(prev => prev.filter(d => d.id !== id));
  };

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/underwriting-decisions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/underwriting-decisions"] });
      toast({
        title: "Decline deleted",
        description: "The decline record has been removed.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete the decline record.",
        variant: "destructive",
      });
    },
  });

  // Check authentication first
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/check", { credentials: "include" });
        const data: AuthState = await res.json();
        if (data.isAuthenticated && (data.role === "admin" || data.role === "underwriting" || data.role === "agent")) {
          setIsAuthenticated(true);
          setAuthRole(data.role || "");
          if (data.agentName) setAuthAgentName(data.agentName);
          if (data.role === "agent") setRepFilter("mine");
        } else if (data.isAuthenticated) {
          setAccessDenied(true);
        } else {
          setLocation("/dashboard");
        }
      } catch {
        setLocation("/dashboard");
      } finally {
        setAuthChecked(true);
      }
    }
    checkAuth();
  }, [setLocation]);

  // Fetch all underwriting decisions
  const { data: allDecisions, isLoading, error: decisionsError } = useQuery<BusinessUnderwritingDecision[]>({
    queryKey: ["/api/underwriting-decisions"],
    queryFn: async () => {
      const res = await fetch("/api/underwriting-decisions", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch decisions");
      return res.json();
    },
    retry: false,
    enabled: isAuthenticated,
  });

  // Filter to only declined decisions, sorted by decision date first, then createdAt fallback
  const declinedDecisions = (allDecisions || [])
    .filter(d => d.status === "declined")
    .sort((a, b) => {
      const getDecisionDate = (d: any): number => {
        if (d.approvalDate) return new Date(d.approvalDate).getTime();
        if (d.createdAt) return new Date(d.createdAt).getTime();
        return 0;
      };
      return getDecisionDate(b) - getDecisionDate(a);
    });

  // Filter by rep
  const repFilteredDecisions = repFilter === "all" ? declinedDecisions : declinedDecisions.filter(d => {
    const filterName = repFilter === "mine" ? authAgentName : repFilter;
    if (!filterName) return true;
    const nameLC = filterName.toLowerCase();
    if ((d.assignedRep || "").toLowerCase() === nameLC) return true;
    if (Array.isArray(d.repFollowers) && d.repFollowers.some((f: string) => f.toLowerCase() === nameLC)) return true;
    return false;
  });

  // Filter by search
  const filteredDecisions = repFilteredDecisions.filter(d => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const declinesMatch = Array.isArray((d as any).additionalDeclines)
      ? (d as any).additionalDeclines.some((decl: any) =>
          (decl.lender || "").toLowerCase().includes(q) ||
          (decl.reason || "").toLowerCase().includes(q))
      : false;
    return (
      (d.businessName || "").toLowerCase().includes(q) ||
      (d.businessEmail || "").toLowerCase().includes(q) ||
      (d.declineReason || "").toLowerCase().includes(q) ||
      declinesMatch
    );
  });

  const totalApproved = (allDecisions || []).filter(d => d.status === "approved").length;

  const { data: bankUploads } = useQuery<BankStatementUpload[]>({
    queryKey: ['/api/bank-statements/uploads'],
    queryFn: async () => {
      const res = await fetch('/api/bank-statements/uploads', { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: isAuthenticated,
  });

  const [expandedStatements, setExpandedStatements] = useState<Set<string>>(new Set());

  const getUploadsForEmail = (email: string): BankStatementUpload[] => {
    if (!email || !bankUploads) return [];
    return bankUploads.filter(u => u.email.toLowerCase() === email.toLowerCase());
  };

  const handleViewStatement = (uploadId: string) => {
    window.open(`/api/bank-statements/view/${uploadId}`, '_blank');
  };

  const handleDownloadStatement = async (uploadId: string, fileName: string) => {
    try {
      const res = await fetch(`/api/bank-statements/download/${uploadId}`, { credentials: 'include' });
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

  const handleViewAll = async (email: string) => {
    try {
      const res = await fetch(`/api/bank-statements/view-url?email=${encodeURIComponent(email)}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        window.open(data.url, '_blank');
      }
    } catch (err) {
      console.error('Failed to get view URL:', err);
    }
  };

  const handleBulkDownload = async (businessName: string) => {
    try {
      const res = await fetch(`/api/bank-statements/download-all/${encodeURIComponent(businessName)}`, { credentials: 'include' });
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

  const toggleStatements = (id: string) => {
    setExpandedStatements(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleExportCSV = () => {
    const headers = [
      "Business Name",
      "Email",
      "Assigned Rep",
      "Decline Reason",
      "Notes",
      "Reviewed By",
      "Follow Up",
      "Follow Up Date",
      "Decision Date",
    ];

    const escape = (val: any) => {
      const str = String(val ?? "").replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = filteredDecisions.map((d) => {
      // Build decline text from structured data if available, else fall back to legacy
      const declineText = Array.isArray((d as any).additionalDeclines) && (d as any).additionalDeclines.length > 0
        ? (d as any).additionalDeclines.map((decl: any) => `${decl.lender}: ${decl.reason || 'No reason'}${decl.date ? ` (${decl.date})` : ''}`).join('; ')
        : (d.declineReason || "");
      return [
      escape(d.businessName || ""),
      escape(d.businessEmail || ""),
      escape(d.assignedRep || ""),
      escape(declineText),
      escape(d.notes || ""),
      escape(d.reviewedBy || ""),
      escape(d.followUpWorthy ? "Yes" : "No"),
      escape(d.followUpDate ? formatDate(d.followUpDate) : ""),
      escape(formatDate(d.approvalDate || d.updatedAt || d.createdAt)),
    ];
    });

    const csv = [headers.map(h => `"${h}"`).join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const dateStr = new Date().toISOString().split("T")[0];
    a.download = `declines-${dateStr}.csv`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  // Check for 403 errors
  useEffect(() => {
    if (decisionsError && (decisionsError as any).message?.includes("403")) {
      setAccessDenied(true);
    }
  }, [decisionsError]);

  // Show loading while checking auth
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Access denied view
  if (accessDenied) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <ShieldAlert className="w-16 h-16 mx-auto text-red-500 dark:text-red-400 mb-4" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-6">
            This page is only accessible to administrators. Please contact your admin if you need access.
          </p>
          <Button onClick={() => setLocation("/dashboard")} data-testid="button-back-dashboard">
            Return to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLocation("/dashboard")}
                data-testid="button-back"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold" data-testid="heading-declines">
                  Declined Businesses
                </h1>
                <p className="text-muted-foreground">
                  Businesses declined from the bank statements review
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleExportCSV}
                disabled={filteredDecisions.length === 0}
                className="flex items-center gap-2"
                data-testid="button-export-csv"
              >
                <Download className="w-4 h-4" />
                Export CSV{filteredDecisions.length > 0 ? ` (${filteredDecisions.length})` : ""}
              </Button>
              <Button
                variant="outline"
                onClick={() => setLocation("/approvals")}
                className="flex items-center gap-2"
                data-testid="button-view-approvals"
              >
                <CheckCircle2 className="w-4 h-4" />
                View Approvals ({totalApproved})
              </Button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg dark:bg-red-900">
                  <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold" data-testid="text-total-declines">
                    {declinedDecisions.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Declined Businesses</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg dark:bg-green-900">
                  <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold" data-testid="text-total-approvals">
                    {totalApproved}
                  </div>
                  <div className="text-sm text-muted-foreground">Approved Businesses</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="flex gap-2">
            <Button variant={repFilter === "all" ? "default" : "outline"} size="sm" onClick={() => setRepFilter("all")}>
              All ({declinedDecisions.length})
            </Button>
            {authAgentName && (
              <Button variant={repFilter === "mine" ? "default" : "outline"} size="sm" onClick={() => setRepFilter("mine")}>
                My Files
              </Button>
            )}
            {(authRole === "admin" || authRole === "underwriting") && (
              <Select value={repFilter === "all" || repFilter === "mine" ? "" : repFilter} onValueChange={(v) => setRepFilter(v || "all")}>
                <SelectTrigger className="w-[180px] h-9">
                  <SelectValue placeholder="Filter by rep..." />
                </SelectTrigger>
                <SelectContent>
                  {AGENTS.map(agent => (
                    <SelectItem key={agent.email} value={agent.name}>{agent.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by business name, email, or reason..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search"
            />
          </div>
        </div>

        {/* Declines List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredDecisions.length === 0 ? (
          <Card className="p-12 text-center">
            <XCircle className="w-12 h-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
            <p className="text-muted-foreground">
              {searchQuery ? "No declined businesses match your search" : "No declined businesses yet"}
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredDecisions.map((decision) => (
              <Card key={decision.id} className="p-6 hover-elevate" data-testid={`card-decline-${decision.id}`}>
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3 flex-wrap">
                      <h3 className="font-semibold text-lg flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-primary" />
                        {decision.businessName || decision.businessEmail}
                      </h3>
                      <Badge variant="destructive" className="flex items-center gap-1">
                        <XCircle className="w-3 h-3" />
                        Declined
                      </Badge>
                      {decision.followUpWorthy && (
                        <Badge variant="outline" className="flex items-center gap-1 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-400">
                          <CalendarIcon className="w-3 h-3" />
                          Follow Up{decision.followUpDate ? `: ${formatDate(decision.followUpDate)}` : ''}
                        </Badge>
                      )}
                    </div>

                    <div className="text-sm text-muted-foreground mb-3 flex items-center gap-3">
                      <span>{decision.businessEmail}</span>
                      {decision.assignedRep && (
                        <Badge variant="outline" className="text-[10px]">Rep: {decision.assignedRep}</Badge>
                      )}
                    </div>

                    {/* Structured declines (per-lender entries) */}
                    {Array.isArray((decision as any).additionalDeclines) && (decision as any).additionalDeclines.length > 0 ? (
                      <div className="text-sm mb-3">
                        <div className="text-muted-foreground mb-1">Declines ({(decision as any).additionalDeclines.length})</div>
                        <div className="space-y-1.5">
                          {(decision as any).additionalDeclines.map((d: any, i: number) => (
                            <div key={d.id || i} className="flex items-start gap-2 p-2 bg-red-50 dark:bg-red-950/30 rounded border border-red-200 dark:border-red-900">
                              <XCircle className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <span className="font-medium text-foreground">{d.lender || 'Unknown Lender'}</span>
                                {d.reason && <span className="text-muted-foreground"> — {d.reason}</span>}
                                {d.date && <span className="text-xs text-muted-foreground ml-2">({d.date})</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : decision.declineReason ? (
                      <div className="text-sm mb-3">
                        <div className="text-muted-foreground mb-1">Decline Reason</div>
                        <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-md border border-red-200 dark:border-red-900">
                          {decision.declineReason}
                        </div>
                      </div>
                    ) : null}

                    {decision.notes && (
                      <div className="text-sm">
                        <div className="text-muted-foreground mb-1">Notes</div>
                        <div>{decision.notes}</div>
                      </div>
                    )}

                    <div className="mt-3 text-xs text-muted-foreground flex items-center gap-3 flex-wrap">
                      {decision.reviewedBy && (
                        <span>Reviewed by: {decision.reviewedBy}</span>
                      )}
                      <span className="flex items-center gap-1">
                        <CalendarIcon className="w-3 h-3" />
                        {formatDate(decision.updatedAt)}
                      </span>
                    </div>

                    {(() => {
                      const uploads = getUploadsForEmail(decision.businessEmail || '');
                      if (uploads.length === 0) return null;
                      const isExpanded = expandedStatements.has(decision.id);
                      return (
                        <div className="mt-4 pt-4 border-t">
                          <div className="flex flex-wrap gap-2 items-center mb-2">
                            <Badge variant="outline" className="flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              {uploads.length} Statement{uploads.length !== 1 ? 's' : ''}
                            </Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewAll(decision.businessEmail || '')}
                              data-testid={`button-view-all-${decision.id}`}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View All
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleBulkDownload(decision.businessName || decision.businessEmail || '')}
                              data-testid={`button-download-all-${decision.id}`}
                            >
                              <FolderArchive className="w-4 h-4 mr-1" />
                              Download All
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleStatements(decision.id)}
                              data-testid={`button-toggle-statements-${decision.id}`}
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
                              {isExpanded ? 'Hide' : 'Show'} Individual Files
                            </Button>
                          </div>
                          {isExpanded && (
                            <div className="space-y-2 mt-3">
                              {uploads.map((upload) => (
                                <div key={upload.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-muted/50 rounded-lg">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                                    <span className="text-sm font-medium truncate">{upload.originalFileName}</span>
                                    <span className="text-xs text-muted-foreground flex-shrink-0">{formatFileSize(upload.fileSize)}</span>
                                  </div>
                                  <div className="flex gap-2 flex-shrink-0">
                                    <Button variant="outline" size="sm" onClick={() => handleViewStatement(upload.id)} data-testid={`button-view-statement-${upload.id}`}>
                                      <Eye className="w-4 h-4 mr-1" />
                                      View
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => handleDownloadStatement(upload.id, upload.originalFileName)} data-testid={`button-download-statement-${upload.id}`}>
                                      <Download className="w-4 h-4 mr-1" />
                                      Download
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Profile, Edit, Delete, and Status buttons */}
                  <div className="flex items-start gap-1">
                    {decision.businessEmail && (
                      <Link href={`/merchant-profile/${encodeURIComponent(decision.businessEmail)}`}>
                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary" title="Merchant Profile" data-testid={`button-profile-${decision.id}`}>
                          <Building2 className="w-4 h-4" />
                        </Button>
                      </Link>
                    )}
                    <StatusToggle decision={decision} currentStatus="declined" />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-primary"
                      onClick={() => openEditDialog(decision)}
                      data-testid={`button-edit-decline-${decision.id}`}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive"
                          data-testid={`button-delete-decline-${decision.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Decline Record</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete the decline record for{" "}
                            <strong>{decision.businessName || decision.businessEmail}</strong>?
                            This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteMutation.mutate(decision.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            data-testid="button-confirm-delete"
                          >
                            {deleteMutation.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              "Delete"
                            )}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editDialog} onOpenChange={(open) => !open && setEditDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Edit Decline: {editDialog?.businessName || editDialog?.businessEmail}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {/* Structured decline entries */}
            <div>
              <Label className="mb-2 block">Decline Entries</Label>
              {editDeclines.length > 0 && (
                <div className="space-y-1.5 mb-3">
                  {editDeclines.map((d) => (
                    <div key={d.id} className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-950/30 rounded border border-red-200 dark:border-red-900 text-sm">
                      <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="font-medium">{d.lender}</span>
                        {d.reason && <span className="text-muted-foreground"> — {d.reason}</span>}
                        {d.date && <span className="text-xs text-muted-foreground ml-1">({d.date})</span>}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-red-400 hover:text-red-600 shrink-0"
                        onClick={() => removeDeclineEntry(d.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground">Lender</Label>
                  <Input
                    value={newDeclineLender}
                    onChange={(e) => setNewDeclineLender(e.target.value)}
                    placeholder="e.g. Ace Funding"
                    className="h-8 text-sm"
                    data-testid="input-new-decline-lender"
                  />
                </div>
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground">Reason</Label>
                  <Input
                    value={newDeclineReason}
                    onChange={(e) => setNewDeclineReason(e.target.value)}
                    placeholder="e.g. Low balances"
                    className="h-8 text-sm"
                    data-testid="input-new-decline-reason"
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addDeclineEntry(); } }}
                  />
                </div>
                <div className="w-28">
                  <Label className="text-xs text-muted-foreground">Date</Label>
                  <Input
                    type="date"
                    value={newDeclineDate}
                    onChange={(e) => setNewDeclineDate(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <Button type="button" size="sm" variant="outline" className="h-8 shrink-0" onClick={addDeclineEntry} disabled={!newDeclineLender.trim()}>
                  Add
                </Button>
              </div>
            </div>
            <div>
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                value={editForm.notes}
                onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                rows={2}
                data-testid="input-edit-notes"
              />
            </div>
            <div>
              <Label className="mb-2 block">Follow Up?</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={editForm.followUpWorthy ? "default" : "outline"}
                  onClick={() => setEditForm(prev => ({ ...prev, followUpWorthy: true }))}
                  data-testid="button-edit-followup-yes"
                >
                  Yes
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={!editForm.followUpWorthy ? "default" : "outline"}
                  onClick={() => setEditForm(prev => ({ ...prev, followUpWorthy: false, followUpDate: '' }))}
                  data-testid="button-edit-followup-no"
                >
                  No
                </Button>
              </div>
            </div>
            {editForm.followUpWorthy && (
              <div>
                <Label>Follow-Up Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      data-testid="input-edit-followup-date"
                      className={cn("w-full justify-start text-left font-normal", !editForm.followUpDate && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {editForm.followUpDate ? format(new Date(editForm.followUpDate + 'T00:00:00'), "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={editForm.followUpDate ? new Date(editForm.followUpDate + 'T00:00:00') : undefined}
                      onSelect={(day) => setEditForm(prev => ({ ...prev, followUpDate: day ? format(day, "yyyy-MM-dd") : '' }))}
                      fromYear={2024}
                      toYear={new Date().getFullYear() + 1}
                      captionLayout="dropdown-buttons"
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setEditDialog(null)}
                data-testid="button-cancel-edit"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={editMutation.isPending}
                data-testid="button-save-edit"
              >
                {editMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
