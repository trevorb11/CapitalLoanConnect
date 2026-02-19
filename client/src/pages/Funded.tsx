import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { LenderAutocomplete } from "@/components/LenderAutocomplete";
import { StatusToggle } from "@/components/StatusToggle";
import {
  Building2,
  DollarSign,
  CheckCircle2,
  Loader2,
  ShieldAlert,
  ArrowLeft,
  Search,
  Pencil,
  Copy,
  Link2,
  Calendar,
  Save,
  X,
  Plus,
  Trash2,
  Landmark,
  Star,
  Eye,
  FileText,
  Download,
  FolderArchive,
  ChevronDown,
  ChevronUp,
  Banknote,
  Mail,
  UserCheck,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import type { BusinessUnderwritingDecision } from "@shared/schema";

interface AuthState {
  isAuthenticated: boolean;
  role?: 'admin' | 'agent' | 'underwriting';
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

function formatCurrency(value: string | number | null | undefined): string {
  if (!value) return "N/A";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "N/A";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
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

export default function Funded() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [accessDenied, setAccessDenied] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedAdditionalApprovals, setExpandedAdditionalApprovals] = useState<Set<string>>(new Set());
  const [expandedStatements, setExpandedStatements] = useState<Set<string>>(new Set());

  const [editingFunded, setEditingFunded] = useState<{
    decision: BusinessUnderwritingDecision;
    approvalId?: string;
  } | null>(null);
  const [editForm, setEditForm] = useState({
    advanceAmount: '',
    term: '',
    paymentFrequency: 'weekly',
    factorRate: '',
    maxUpsell: '',
    totalPayback: '',
    netAfterFees: '',
    lender: '',
    notes: '',
    approvalDate: '',
    fundedDate: '',
    assignedRep: '',
  });
  const [saving, setSaving] = useState(false);

  const [showAddFunded, setShowAddFunded] = useState(false);
  const [addForm, setAddForm] = useState({
    businessName: '',
    businessEmail: '',
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
    fundedDate: new Date().toISOString().split('T')[0],
    assignedRep: '',
  });
  const [addSaving, setAddSaving] = useState(false);

  // Check authentication first
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/check", { credentials: "include" });
        const data: AuthState = await res.json();
        if (data.isAuthenticated && (data.role === "admin" || data.role === "underwriting")) {
          setIsAuthenticated(true);
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

  const { data: agents } = useQuery<{ name: string; email: string }[]>({
    queryKey: ['/api/agents'],
    queryFn: async () => {
      const res = await fetch('/api/agents', { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: isAuthenticated,
  });

  const { data: bankUploads } = useQuery<BankStatementUpload[]>({
    queryKey: ['/api/bank-statements/uploads'],
    queryFn: async () => {
      const res = await fetch('/api/bank-statements/uploads', { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: isAuthenticated,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/underwriting-decisions/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to delete');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/underwriting-decisions"] });
      toast({
        title: "Record deleted",
        description: "The funded record has been removed.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete the funded record.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, any> }) => {
      const res = await fetch(`/api/underwriting-decisions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Server returned ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/underwriting-decisions"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to update.", variant: "destructive" });
    },
  });

  const addFundedMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const res = await fetch('/api/underwriting-decisions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Server returned ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/underwriting-decisions"] });
    },
  });

  const generateApprovalId = () => `appr-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

  const openEditDialog = (decision: BusinessUnderwritingDecision, approvalId?: string) => {
    const approvals = getApprovalsForDecision(decision);
    if (approvalId) {
      const existing = approvals.find(a => a.id === approvalId);
      if (existing) {
        setEditForm({
          advanceAmount: existing.advanceAmount,
          term: existing.term,
          paymentFrequency: existing.paymentFrequency || 'weekly',
          factorRate: existing.factorRate,
          maxUpsell: existing.maxUpsell || '',
          totalPayback: existing.totalPayback,
          netAfterFees: existing.netAfterFees,
          lender: existing.lender,
          notes: existing.notes,
          approvalDate: existing.approvalDate || '',
          fundedDate: decision.fundedDate ? new Date(decision.fundedDate).toISOString().split('T')[0] : '',
          assignedRep: decision.assignedRep || '',
        });
      }
    } else {
      setEditForm({
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
        fundedDate: decision.fundedDate ? new Date(decision.fundedDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        assignedRep: decision.assignedRep || '',
      });
    }
    setEditingFunded({ decision, approvalId });
  };

  const handleSaveEdit = async () => {
    if (!editingFunded) return;
    setSaving(true);
    try {
      const { decision, approvalId } = editingFunded;
      let approvals = getApprovalsForDecision(decision);

      const newEntry: FullApprovalEntry = {
        id: approvalId || generateApprovalId(),
        lender: editForm.lender,
        advanceAmount: editForm.advanceAmount,
        term: editForm.term,
        paymentFrequency: editForm.paymentFrequency,
        factorRate: editForm.factorRate,
        maxUpsell: editForm.maxUpsell,
        totalPayback: editForm.totalPayback,
        netAfterFees: editForm.netAfterFees,
        notes: editForm.notes,
        approvalDate: editForm.approvalDate,
        isPrimary: approvals.length === 0,
        createdAt: approvalId
          ? (approvals.find(a => a.id === approvalId)?.createdAt || new Date().toISOString())
          : new Date().toISOString(),
      };

      if (approvalId) {
        const wasEdited = approvals.find(a => a.id === approvalId);
        newEntry.isPrimary = wasEdited?.isPrimary || false;
        approvals = approvals.map(a => a.id === approvalId ? newEntry : a);
      } else {
        approvals.push(newEntry);
      }

      await updateMutation.mutateAsync({
        id: decision.id,
        updates: {
          additionalApprovals: approvals,
          fundedDate: editForm.fundedDate,
          assignedRep: editForm.assignedRep || null,
        },
      });
      setEditingFunded(null);
      toast({ title: "Updated", description: "Funded deal details have been saved." });
    } finally {
      setSaving(false);
    }
  };


  const handleAddFundedDeal = async () => {
    if (!addForm.businessEmail.trim()) {
      toast({ title: "Error", description: "Email is required.", variant: "destructive" });
      return;
    }
    setAddSaving(true);
    try {
      const approval: FullApprovalEntry = {
        id: generateApprovalId(),
        lender: addForm.lender,
        advanceAmount: addForm.advanceAmount,
        term: addForm.term,
        paymentFrequency: addForm.paymentFrequency,
        factorRate: addForm.factorRate,
        maxUpsell: addForm.maxUpsell,
        totalPayback: addForm.totalPayback,
        netAfterFees: addForm.netAfterFees,
        notes: addForm.notes,
        approvalDate: addForm.approvalDate,
        isPrimary: true,
        createdAt: new Date().toISOString(),
      };

      await addFundedMutation.mutateAsync({
        businessName: addForm.businessName,
        businessEmail: addForm.businessEmail,
        status: 'funded',
        fundedDate: addForm.fundedDate,
        assignedRep: addForm.assignedRep || null,
        additionalApprovals: [approval],
      });
      setShowAddFunded(false);
      setAddForm({
        businessName: '',
        businessEmail: '',
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
        fundedDate: new Date().toISOString().split('T')[0],
        assignedRep: '',
      });
      toast({ title: "Deal Added", description: `${addForm.businessName || addForm.businessEmail} has been added as funded.` });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to add funded deal.", variant: "destructive" });
    } finally {
      setAddSaving(false);
    }
  };

  // Helper: get all approvals for a decision (migration-aware)
  const getApprovalsForDecision = (decision: BusinessUnderwritingDecision): FullApprovalEntry[] => {
    const raw = decision.additionalApprovals as any[] | null;

    if (raw && raw.length > 0 && raw[0].isPrimary !== undefined) {
      return raw as FullApprovalEntry[];
    }

    const result: FullApprovalEntry[] = [];

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

  // Helper: get the most recent approval date for a decision
  const getMostRecentApprovalDate = (d: BusinessUnderwritingDecision): number => {
    const dates: number[] = [];
    if (d.approvalDate) {
      dates.push(new Date(d.approvalDate).getTime());
    }
    const approvals = d.additionalApprovals as any[] | null;
    if (approvals) {
      approvals.forEach((appr: any) => {
        if (appr.approvalDate) {
          dates.push(new Date(appr.approvalDate).getTime());
        }
      });
    }
    return dates.length > 0 ? Math.max(...dates) : new Date(d.createdAt || 0).getTime();
  };

  // Filter to only funded decisions
  const fundedDecisions = (allDecisions || [])
    .filter(d => d.status === "funded")
    .sort((a, b) => {
      const aDate = a.fundedDate ? new Date(a.fundedDate).getTime() : getMostRecentApprovalDate(a);
      const bDate = b.fundedDate ? new Date(b.fundedDate).getTime() : getMostRecentApprovalDate(b);
      return bDate - aDate;
    });

  // Filter by search
  const filteredDecisions = fundedDecisions.filter(d => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      (d.businessName || "").toLowerCase().includes(q) ||
      (d.businessEmail || "").toLowerCase().includes(q) ||
      (d.lender || "").toLowerCase().includes(q) ||
      (d.assignedRep || "").toLowerCase().includes(q)
    );
  });

  // Compute stats
  const stats = {
    totalFunded: fundedDecisions.length,
    totalAmount: fundedDecisions.reduce((sum, d) => {
      const approvals = getApprovalsForDecision(d);
      const primary = approvals.find(a => a.isPrimary) || approvals[0];
      return sum + (parseFloat(primary?.advanceAmount || "0") || 0);
    }, 0),
    totalApproved: (allDecisions || []).filter(d => d.status === "approved").length,
  };

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

  const handleViewAllStatements = async (email: string) => {
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

  const handleBulkDownloadStatements = async (businessName: string) => {
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

  const copyApprovalUrl = (slug: string) => {
    const url = `${window.location.origin}/approved/${slug}`;
    navigator.clipboard.writeText(url);
    toast({ title: "URL Copied", description: "Approval letter URL copied to clipboard" });
  };

  // Check for 403 errors
  useEffect(() => {
    if (decisionsError && (decisionsError as any).message?.includes("403")) {
      setAccessDenied(true);
    }
  }, [decisionsError]);

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

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
                <h1 className="text-2xl font-bold" data-testid="heading-funded">
                  Funded Businesses
                </h1>
                <p className="text-muted-foreground">
                  Businesses that have been funded
                </p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={() => {
                  setShowAddFunded(true);
                  setAddForm({
                    businessName: '',
                    businessEmail: '',
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
                    fundedDate: new Date().toISOString().split('T')[0],
                  });
                }}
                className="flex items-center gap-2"
                data-testid="button-add-funded"
              >
                <Plus className="w-4 h-4" />
                Add Funded Deal
              </Button>
              <Button
                variant="outline"
                onClick={() => setLocation("/approvals")}
                className="flex items-center gap-2"
                data-testid="button-view-approvals"
              >
                <CheckCircle2 className="w-4 h-4" />
                View Approvals ({stats.totalApproved})
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg dark:bg-purple-900">
                  <Banknote className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold" data-testid="text-total-funded">
                    {stats.totalFunded}
                  </div>
                  <div className="text-sm text-muted-foreground">Funded Businesses</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg dark:bg-blue-900">
                  <DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold" data-testid="text-total-funded-amount">
                    {formatCurrency(stats.totalAmount)}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Funded Amount</div>
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
                    {stats.totalApproved}
                  </div>
                  <div className="text-sm text-muted-foreground">Approved Businesses</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by business name, email, or lender..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search"
          />
        </div>

        {/* Funded List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredDecisions.length === 0 ? (
          <Card className="p-12 text-center">
            <Banknote className="w-12 h-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
            <p className="text-muted-foreground">
              {searchQuery ? "No funded businesses match your search" : "No funded businesses yet"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Mark businesses as funded from the dashboard once they have been funded
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredDecisions.map((decision) => {
              const approvals = getApprovalsForDecision(decision);
              const sortedApprovals = [...approvals].sort((a, b) => (a.isPrimary ? -1 : b.isPrimary ? 1 : 0));
              const bestApproval = sortedApprovals[0];
              const additionalApprovals = sortedApprovals.slice(1);
              const isAdditionalExpanded = expandedAdditionalApprovals.has(decision.id);

              const renderApproval = (appr: FullApprovalEntry) => (
                <div
                  key={appr.id}
                  className={`p-4 rounded-lg border ${
                    appr.isPrimary
                      ? 'bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800'
                      : 'bg-muted/30 border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      {appr.isPrimary && (
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      )}
                      {appr.isPrimary && (
                        <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300 text-xs">
                          Best Approval
                        </Badge>
                      )}
                      <span className="font-semibold flex items-center gap-1">
                        <Landmark className="w-3 h-3 text-muted-foreground" />
                        {appr.lender || 'No lender'}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Advance Amount</div>
                      <div className="font-semibold text-purple-600 dark:text-purple-400">
                        {formatCurrency(appr.advanceAmount)}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Term</div>
                      <div className="font-medium">{appr.term || "N/A"}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Factor Rate</div>
                      <div className="font-medium">
                        {appr.factorRate ? `${appr.factorRate}x` : "N/A"}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Payment Frequency</div>
                      <div className="font-medium capitalize">{appr.paymentFrequency || "N/A"}</div>
                    </div>
                  </div>
                  {(appr.totalPayback || appr.netAfterFees) && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-3 pt-3 border-t">
                      <div>
                        <div className="text-muted-foreground">Total Payback</div>
                        <div className="font-medium">{formatCurrency(appr.totalPayback)}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Net After Fees</div>
                        <div className="font-medium">{formatCurrency(appr.netAfterFees)}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Approval Date</div>
                        <div className="font-medium flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(appr.approvalDate)}
                        </div>
                      </div>
                      {decision.fundedDate && (
                        <div>
                          <div className="text-muted-foreground">Funded Date</div>
                          <div className="font-medium flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                            <Calendar className="w-3 h-3" />
                            {formatDate(decision.fundedDate)}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {appr.notes && (
                    <div className="mt-3 pt-3 border-t text-sm">
                      <div className="text-muted-foreground mb-1">Notes</div>
                      <div className="whitespace-pre-wrap">{appr.notes}</div>
                    </div>
                  )}
                </div>
              );

              return (
                <Card key={decision.id} className="p-6 hover-elevate" data-testid={`card-funded-${decision.id}`}>
                  <div className="flex flex-col gap-4">
                    {/* Business header */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                          <Building2 className="w-5 h-5 text-primary" />
                          {decision.businessName || decision.businessEmail}
                        </h3>
                        <Badge className="bg-purple-600 hover:bg-purple-700 flex items-center gap-1">
                          <Banknote className="w-3 h-3" />
                          Funded
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {approvals.length} {approvals.length === 1 ? 'Approval' : 'Approvals'}
                        </Badge>
                        {decision.approvalSlug && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyApprovalUrl(decision.approvalSlug!)}
                            className="text-primary border-primary/30 hover:bg-primary/10"
                            data-testid={`button-copy-url-${decision.id}`}
                          >
                            <Copy className="w-3 h-3 mr-1" />
                            Copy Letter URL
                          </Button>
                        )}
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const primary = sortedApprovals.find(a => a.isPrimary) || sortedApprovals[0];
                            if (primary) {
                              openEditDialog(decision, primary.id);
                            } else {
                              openEditDialog(decision);
                            }
                          }}
                          data-testid={`button-edit-funded-${decision.id}`}
                        >
                          <Pencil className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                        <StatusToggle decision={decision} currentStatus="funded" />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-muted-foreground"
                              data-testid={`button-delete-funded-${decision.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Funded Record</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete the funded record for{" "}
                                <strong>{decision.businessName || decision.businessEmail}</strong>?
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteMutation.mutate(decision.id)}
                                className="bg-destructive text-destructive-foreground"
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

                    <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                      <span>{decision.businessEmail}</span>
                      {decision.assignedRep && (
                        <Badge variant="outline" className="flex items-center gap-1 text-xs">
                          <UserCheck className="w-3 h-3" />
                          {decision.assignedRep}
                        </Badge>
                      )}
                    </div>

                    {/* Best Approval at top with dropdown for additional */}
                    <div className="space-y-3">
                      {bestApproval && renderApproval(bestApproval)}
                      {additionalApprovals.length > 0 && (
                        <div>
                          <button
                            onClick={() => setExpandedAdditionalApprovals(prev => {
                              const next = new Set(prev);
                              if (next.has(decision.id)) next.delete(decision.id);
                              else next.add(decision.id);
                              return next;
                            })}
                            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
                            data-testid={`button-toggle-additional-${decision.id}`}
                          >
                            {isAdditionalExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            {isAdditionalExpanded ? 'Hide' : 'View'} {additionalApprovals.length} Additional {additionalApprovals.length === 1 ? 'Approval' : 'Approvals'}
                          </button>
                          {isAdditionalExpanded && (
                            <div className="space-y-3">
                              {additionalApprovals.map(renderApproval)}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Bank Statements */}
                    {(() => {
                      const uploads = getUploadsForEmail(decision.businessEmail || '');
                      if (uploads.length === 0) return null;
                      const isExpanded = expandedStatements.has(decision.id);
                      return (
                        <div className="pt-4 border-t">
                          <div className="flex flex-wrap gap-2 items-center mb-2">
                            <Badge variant="outline" className="flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              {uploads.length} Statement{uploads.length !== 1 ? 's' : ''}
                            </Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewAllStatements(decision.businessEmail || '')}
                              data-testid={`button-view-all-${decision.id}`}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View All
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleBulkDownloadStatements(decision.businessName || decision.businessEmail || '')}
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

                    {decision.reviewedBy && (
                      <div className="text-xs text-muted-foreground">
                        Reviewed by: {decision.reviewedBy} | Updated: {formatDate(decision.updatedAt)}
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Funded Deal Dialog */}
      <Dialog open={!!editingFunded} onOpenChange={(open) => !open && setEditingFunded(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-primary" />
              Edit Funded Deal: {editingFunded?.decision.businessName || editingFunded?.decision.businessEmail}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800">
              <Label htmlFor="edit-fundedDate" className="text-emerald-700 dark:text-emerald-300 font-semibold">Funded Date</Label>
              <Input
                id="edit-fundedDate"
                type="date"
                value={editForm.fundedDate}
                onChange={(e) => setEditForm(prev => ({ ...prev, fundedDate: e.target.value }))}
                data-testid="input-edit-funded-date"
              />
            </div>
            <div>
              <Label htmlFor="edit-assignedRep">Assigned Rep</Label>
              <Select
                value={editForm.assignedRep}
                onValueChange={(value) => setEditForm(prev => ({ ...prev, assignedRep: value === '__none__' ? '' : value }))}
              >
                <SelectTrigger data-testid="select-edit-assigned-rep">
                  <SelectValue placeholder="Select a rep" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {(agents || []).map(agent => (
                    <SelectItem key={agent.email} value={agent.name}>{agent.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-advanceAmount">Advance Amount</Label>
                <Input
                  id="edit-advanceAmount"
                  type="number"
                  placeholder="$50,000"
                  value={editForm.advanceAmount}
                  onChange={(e) => setEditForm(prev => ({ ...prev, advanceAmount: e.target.value }))}
                  data-testid="input-edit-advance-amount"
                />
              </div>
              <div>
                <Label htmlFor="edit-term">Term</Label>
                <Input
                  id="edit-term"
                  placeholder="6 months"
                  value={editForm.term}
                  onChange={(e) => setEditForm(prev => ({ ...prev, term: e.target.value }))}
                  data-testid="input-edit-term"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-paymentFrequency">Payment Frequency</Label>
                <Select
                  value={editForm.paymentFrequency}
                  onValueChange={(value) => setEditForm(prev => ({ ...prev, paymentFrequency: value }))}
                >
                  <SelectTrigger data-testid="select-edit-payment-frequency">
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
                <Label htmlFor="edit-lender">Lender</Label>
                <LenderAutocomplete
                  id="edit-lender"
                  placeholder="Search lender..."
                  value={editForm.lender}
                  onChange={(val) => setEditForm(prev => ({ ...prev, lender: val }))}
                  data-testid="input-edit-lender"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-factorRate">Factor Rate</Label>
                <Input
                  id="edit-factorRate"
                  type="number"
                  step="0.01"
                  placeholder="1.25"
                  value={editForm.factorRate}
                  onChange={(e) => setEditForm(prev => ({ ...prev, factorRate: e.target.value }))}
                  data-testid="input-edit-factor-rate"
                />
              </div>
              <div>
                <Label htmlFor="edit-maxUpsell">Max Upsell</Label>
                <Input
                  id="edit-maxUpsell"
                  type="number"
                  placeholder="$75,000"
                  value={editForm.maxUpsell}
                  onChange={(e) => setEditForm(prev => ({ ...prev, maxUpsell: e.target.value }))}
                  data-testid="input-edit-max-upsell"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-netAfterFees">Net After Fees</Label>
                <Input
                  id="edit-netAfterFees"
                  type="number"
                  placeholder="$48,500"
                  value={editForm.netAfterFees}
                  onChange={(e) => setEditForm(prev => ({ ...prev, netAfterFees: e.target.value }))}
                  data-testid="input-edit-net-after-fees"
                />
              </div>
              <div>
                <Label htmlFor="edit-totalPayback">Total Payback</Label>
                <Input
                  id="edit-totalPayback"
                  type="number"
                  placeholder="$62,500"
                  value={editForm.totalPayback}
                  onChange={(e) => setEditForm(prev => ({ ...prev, totalPayback: e.target.value }))}
                  data-testid="input-edit-total-payback"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit-approvalDate">Approval Date</Label>
              <Input
                id="edit-approvalDate"
                type="date"
                value={editForm.approvalDate}
                onChange={(e) => setEditForm(prev => ({ ...prev, approvalDate: e.target.value }))}
                data-testid="input-edit-approval-date"
              />
            </div>
            <div>
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                placeholder="Additional notes..."
                rows={3}
                value={editForm.notes}
                onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                data-testid="input-edit-notes"
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setEditingFunded(null)}
                data-testid="button-cancel-edit"
              >
                <X className="w-4 h-4 mr-1" />
                Cancel
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={saving}
                data-testid="button-save-edit"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-1" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Funded Deal Dialog */}
      <Dialog open={showAddFunded} onOpenChange={setShowAddFunded}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" />
              Add Funded Deal
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Manually add a business that has been funded.
          </p>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="add-businessName">Business Name</Label>
                <Input
                  id="add-businessName"
                  placeholder="Business Name"
                  value={addForm.businessName}
                  onChange={(e) => setAddForm(prev => ({ ...prev, businessName: e.target.value }))}
                  data-testid="input-add-business-name"
                />
              </div>
              <div>
                <Label htmlFor="add-businessEmail">Email *</Label>
                <Input
                  id="add-businessEmail"
                  type="email"
                  placeholder="business@email.com"
                  value={addForm.businessEmail}
                  onChange={(e) => setAddForm(prev => ({ ...prev, businessEmail: e.target.value }))}
                  data-testid="input-add-business-email"
                />
              </div>
            </div>
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800">
              <Label htmlFor="add-fundedDate" className="text-emerald-700 dark:text-emerald-300 font-semibold">Funded Date</Label>
              <Input
                id="add-fundedDate"
                type="date"
                value={addForm.fundedDate}
                onChange={(e) => setAddForm(prev => ({ ...prev, fundedDate: e.target.value }))}
                data-testid="input-add-funded-date"
              />
            </div>
            <div>
              <Label htmlFor="add-assignedRep">Assigned Rep</Label>
              <Select
                value={addForm.assignedRep}
                onValueChange={(value) => setAddForm(prev => ({ ...prev, assignedRep: value === '__none__' ? '' : value }))}
              >
                <SelectTrigger data-testid="select-add-assigned-rep">
                  <SelectValue placeholder="Select a rep" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {(agents || []).map(agent => (
                    <SelectItem key={agent.email} value={agent.name}>{agent.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="add-advanceAmount">Advance Amount</Label>
                <Input
                  id="add-advanceAmount"
                  type="number"
                  placeholder="$50,000"
                  value={addForm.advanceAmount}
                  onChange={(e) => setAddForm(prev => ({ ...prev, advanceAmount: e.target.value }))}
                  data-testid="input-add-advance-amount"
                />
              </div>
              <div>
                <Label htmlFor="add-term">Term</Label>
                <Input
                  id="add-term"
                  placeholder="6 months"
                  value={addForm.term}
                  onChange={(e) => setAddForm(prev => ({ ...prev, term: e.target.value }))}
                  data-testid="input-add-term"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="add-paymentFrequency">Payment Frequency</Label>
                <Select
                  value={addForm.paymentFrequency}
                  onValueChange={(value) => setAddForm(prev => ({ ...prev, paymentFrequency: value }))}
                >
                  <SelectTrigger data-testid="select-add-payment-frequency">
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
                <Label htmlFor="add-lender">Lender</Label>
                <LenderAutocomplete
                  id="add-lender"
                  placeholder="Search lender..."
                  value={addForm.lender}
                  onChange={(val) => setAddForm(prev => ({ ...prev, lender: val }))}
                  data-testid="input-add-lender"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="add-factorRate">Factor Rate</Label>
                <Input
                  id="add-factorRate"
                  type="number"
                  step="0.01"
                  placeholder="1.25"
                  value={addForm.factorRate}
                  onChange={(e) => setAddForm(prev => ({ ...prev, factorRate: e.target.value }))}
                  data-testid="input-add-factor-rate"
                />
              </div>
              <div>
                <Label htmlFor="add-maxUpsell">Max Upsell</Label>
                <Input
                  id="add-maxUpsell"
                  type="number"
                  placeholder="$75,000"
                  value={addForm.maxUpsell}
                  onChange={(e) => setAddForm(prev => ({ ...prev, maxUpsell: e.target.value }))}
                  data-testid="input-add-max-upsell"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="add-netAfterFees">Net After Fees</Label>
                <Input
                  id="add-netAfterFees"
                  type="number"
                  placeholder="$48,500"
                  value={addForm.netAfterFees}
                  onChange={(e) => setAddForm(prev => ({ ...prev, netAfterFees: e.target.value }))}
                  data-testid="input-add-net-after-fees"
                />
              </div>
              <div>
                <Label htmlFor="add-totalPayback">Total Payback</Label>
                <Input
                  id="add-totalPayback"
                  type="number"
                  placeholder="$62,500"
                  value={addForm.totalPayback}
                  onChange={(e) => setAddForm(prev => ({ ...prev, totalPayback: e.target.value }))}
                  data-testid="input-add-total-payback"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="add-approvalDate">Approval Date</Label>
              <Input
                id="add-approvalDate"
                type="date"
                value={addForm.approvalDate}
                onChange={(e) => setAddForm(prev => ({ ...prev, approvalDate: e.target.value }))}
                data-testid="input-add-approval-date"
              />
            </div>
            <div>
              <Label htmlFor="add-notes">Notes</Label>
              <Textarea
                id="add-notes"
                placeholder="Additional notes..."
                rows={3}
                value={addForm.notes}
                onChange={(e) => setAddForm(prev => ({ ...prev, notes: e.target.value }))}
                data-testid="input-add-notes"
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowAddFunded(false)}
                data-testid="button-cancel-add"
              >
                <X className="w-4 h-4 mr-1" />
                Cancel
              </Button>
              <Button
                onClick={handleAddFundedDeal}
                disabled={addSaving || !addForm.businessEmail.trim()}
                data-testid="button-save-add"
              >
                {addSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Banknote className="w-4 h-4 mr-1" />
                    Add Funded Deal
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
