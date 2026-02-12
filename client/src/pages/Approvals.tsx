import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
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
  ThumbsDown,
  Calendar,
  Save,
  X,
  Plus,
  Trash2,
  Landmark,
  Star,
  Upload,
  FileText,
  Download,
  Eye,
  FolderArchive,
  ChevronDown,
  ChevronUp,
  Banknote,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

// Legacy format for migration
interface LegacyAdditionalApproval {
  lender: string;
  amount: string;
  term: string;
  factorRate: string;
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
  });
}

export default function Approvals() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [accessDenied, setAccessDenied] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingApproval, setEditingApproval] = useState<{
    decision: BusinessUnderwritingDecision;
    approvalId?: string; // undefined = adding new
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
  });
  const [saving, setSaving] = useState(false);
  
  // CSV upload state
  const [showCsvUpload, setShowCsvUpload] = useState(false);
  const [csvContent, setCsvContent] = useState('');
  const [csvUploading, setCsvUploading] = useState(false);
  const [csvResults, setCsvResults] = useState<{ imported: number; errors: number; results?: any[] } | null>(null);
  const [expandedAdditionalApprovals, setExpandedAdditionalApprovals] = useState<Set<string>>(new Set());

  // Fund dialog state
  const [fundingDecision, setFundingDecision] = useState<BusinessUnderwritingDecision | null>(null);
  const [fundForm, setFundForm] = useState({
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
    fundedDate: new Date().toISOString().split('T')[0],
  });
  const [fundSaving, setFundSaving] = useState(false);

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

  // Filter to only approved decisions, sorted by most recent approval date first
  const approvedDecisions = (allDecisions || [])
    .filter(d => d.status === "approved")
    .sort((a, b) => getMostRecentApprovalDate(b) - getMostRecentApprovalDate(a));

  // Filter by search
  const filteredDecisions = approvedDecisions.filter(d => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      (d.businessName || "").toLowerCase().includes(q) ||
      (d.businessEmail || "").toLowerCase().includes(q) ||
      (d.lender || "").toLowerCase().includes(q)
    );
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

  // Compute stats from approved decisions
  const stats = {
    totalApproved: approvedDecisions.length,
    totalAmount: approvedDecisions.reduce((sum, d) => sum + (parseFloat(d.advanceAmount?.toString() || "0") || 0), 0),
    totalDeclined: (allDecisions || []).filter(d => d.status === "declined").length,
  };

  // Helper: get all approvals for a decision (migration-aware)
  const getApprovalsForDecision = (decision: BusinessUnderwritingDecision): FullApprovalEntry[] => {
    const raw = decision.additionalApprovals as any[] | null;

    // Check if already in new format (has isPrimary field)
    if (raw && raw.length > 0 && raw[0].isPrimary !== undefined) {
      return raw as FullApprovalEntry[];
    }

    // Migration: convert old format to new
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

  const generateApprovalId = () => `appr-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

  // Update mutation
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
      toast({ title: "Updated", description: "Approval details have been saved." });
      setEditingApproval(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to update approval details.", variant: "destructive" });
    },
  });

  // CSV bulk import handler
  const handleCsvUpload = async () => {
    if (!csvContent.trim()) {
      toast({ title: "Error", description: "Please paste CSV content or upload a file.", variant: "destructive" });
      return;
    }
    
    setCsvUploading(true);
    setCsvResults(null);
    
    try {
      const res = await fetch('/api/underwriting-decisions/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ csvData: csvContent }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to import');
      }
      
      setCsvResults({ imported: data.imported, errors: data.errors, results: data.results });
      queryClient.invalidateQueries({ queryKey: ["/api/underwriting-decisions"] });
      
      if (data.errors === 0) {
        toast({ title: "Success", description: `Imported ${data.imported} approvals successfully.` });
      } else {
        toast({ 
          title: "Partial Success", 
          description: `Imported ${data.imported} approvals with ${data.errors} errors.`,
          variant: "default" 
        });
      }
    } catch (error: any) {
      toast({ title: "Import Failed", description: error.message, variant: "destructive" });
    } finally {
      setCsvUploading(false);
    }
  };
  
  // Handle file upload for CSV
  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCsvContent(content);
    };
    reader.readAsText(file);
  };

  const openEditDialog = (decision: BusinessUnderwritingDecision, approvalId?: string) => {
    if (approvalId) {
      const approvals = getApprovalsForDecision(decision);
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
      });
    }
    setEditingApproval({ decision, approvalId });
  };

  const handleSaveEdit = async () => {
    if (!editingApproval) return;
    setSaving(true);
    try {
      const { decision, approvalId } = editingApproval;
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
        updates: { additionalApprovals: approvals },
      });
    } finally {
      setSaving(false);
    }
  };

  // Set an approval as primary
  const handleSetPrimary = async (decision: BusinessUnderwritingDecision, approvalId: string) => {
    const approvals = getApprovalsForDecision(decision).map(a => ({
      ...a,
      isPrimary: a.id === approvalId,
    }));
    try {
      await updateMutation.mutateAsync({
        id: decision.id,
        updates: { additionalApprovals: approvals },
      });
    } catch (error) {
      console.error('Error setting primary:', error);
    }
  };

  // Delete an individual approval
  const handleDeleteApproval = async (decision: BusinessUnderwritingDecision, approvalId: string) => {
    let approvals = getApprovalsForDecision(decision).filter(a => a.id !== approvalId);

    if (approvals.length > 0 && !approvals.some(a => a.isPrimary)) {
      approvals[0].isPrimary = true;
    }

    try {
      if (approvals.length === 0) {
        const res = await fetch(`/api/underwriting-decisions/${decision.id}`, {
          method: 'DELETE',
          credentials: 'include',
        });
        if (res.ok) {
          queryClient.invalidateQueries({ queryKey: ["/api/underwriting-decisions"] });
          toast({ title: "Removed", description: "All approvals removed" });
        }
      } else {
        await updateMutation.mutateAsync({
          id: decision.id,
          updates: { additionalApprovals: approvals },
        });
      }
    } catch (error) {
      console.error('Error deleting approval:', error);
    }
  };

  // Open Fund dialog with primary approval pre-filled
  const openFundDialog = (decision: BusinessUnderwritingDecision) => {
    const approvals = getApprovalsForDecision(decision);
    const primary = approvals.find(a => a.isPrimary) || approvals[0];
    setFundForm({
      advanceAmount: primary?.advanceAmount || decision.advanceAmount?.toString() || '',
      term: primary?.term || decision.term || '',
      paymentFrequency: primary?.paymentFrequency || decision.paymentFrequency || 'weekly',
      factorRate: primary?.factorRate || decision.factorRate?.toString() || '',
      maxUpsell: primary?.maxUpsell || decision.maxUpsell?.toString() || '',
      totalPayback: primary?.totalPayback || decision.totalPayback?.toString() || '',
      netAfterFees: primary?.netAfterFees || decision.netAfterFees?.toString() || '',
      lender: primary?.lender || decision.lender || '',
      notes: primary?.notes || decision.notes || '',
      approvalDate: primary?.approvalDate || (decision.approvalDate ? new Date(decision.approvalDate).toISOString().split('T')[0] : ''),
      fundedDate: new Date().toISOString().split('T')[0],
    });
    setFundingDecision(decision);
  };

  // Save funded deal
  const handleSaveFund = async () => {
    if (!fundingDecision) return;
    setFundSaving(true);
    try {
      let approvals = getApprovalsForDecision(fundingDecision);
      const primary = approvals.find(a => a.isPrimary) || approvals[0];

      if (primary) {
        primary.advanceAmount = fundForm.advanceAmount;
        primary.term = fundForm.term;
        primary.paymentFrequency = fundForm.paymentFrequency;
        primary.factorRate = fundForm.factorRate;
        primary.maxUpsell = fundForm.maxUpsell;
        primary.totalPayback = fundForm.totalPayback;
        primary.netAfterFees = fundForm.netAfterFees;
        primary.lender = fundForm.lender;
        primary.notes = fundForm.notes;
        primary.approvalDate = fundForm.approvalDate;
        approvals = approvals.map(a => (a.id === primary.id ? primary : a));
      }

      await updateMutation.mutateAsync({
        id: fundingDecision.id,
        updates: {
          status: 'funded',
          fundedDate: fundForm.fundedDate,
          additionalApprovals: approvals,
        },
      });
      setFundingDecision(null);
      toast({ title: "Deal Funded", description: `${fundingDecision.businessName || fundingDecision.businessEmail} has been marked as funded.` });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to mark deal as funded.", variant: "destructive" });
    } finally {
      setFundSaving(false);
    }
  };

  const copyApprovalUrl = (slug: string) => {
    const url = `${window.location.origin}/approved/${slug}`;
    navigator.clipboard.writeText(url);
    toast({ title: "URL Copied", description: "Approval letter URL copied to clipboard" });
  };

  // Export approvals to CSV
  const handleExportCsv = () => {
    if (approvedDecisions.length === 0) {
      toast({ title: "No Data", description: "No approved businesses to export.", variant: "destructive" });
      return;
    }

    // CSV headers
    const headers = [
      "Business Name",
      "Business Email",
      "Lender",
      "Advance Amount",
      "Term",
      "Payment Frequency",
      "Factor Rate",
      "Max Upsell",
      "Total Payback",
      "Net After Fees",
      "Approval Date",
      "Is Primary",
      "Notes",
      "Approval Letter URL",
      "Created At"
    ];

    // Build CSV rows - one row per approval (a business may have multiple approvals)
    const rows: string[][] = [];
    
    approvedDecisions.forEach((decision) => {
      const approvals = getApprovalsForDecision(decision);
      const approvalLetterUrl = decision.approvalSlug 
        ? `${window.location.origin}/approved/${decision.approvalSlug}`
        : "";
      
      if (approvals.length === 0) {
        // Business with no approval details yet
        rows.push([
          decision.businessName || "",
          decision.businessEmail || "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          approvalLetterUrl,
          decision.createdAt ? new Date(decision.createdAt).toLocaleDateString() : ""
        ]);
      } else {
        approvals.forEach((approval) => {
          rows.push([
            decision.businessName || "",
            decision.businessEmail || "",
            approval.lender || "",
            approval.advanceAmount || "",
            approval.term || "",
            approval.paymentFrequency || "",
            approval.factorRate || "",
            approval.maxUpsell || "",
            approval.totalPayback || "",
            approval.netAfterFees || "",
            approval.approvalDate || "",
            approval.isPrimary ? "Yes" : "No",
            approval.notes || "",
            approvalLetterUrl,
            approval.createdAt ? new Date(approval.createdAt).toLocaleDateString() : ""
          ]);
        });
      }
    });

    // Escape CSV values
    const escapeCsvValue = (value: string) => {
      if (value.includes(",") || value.includes('"') || value.includes("\n")) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };

    // Build CSV content
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(escapeCsvValue).join(","))
    ].join("\n");

    // Create and download file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `approved-businesses-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({ title: "Export Complete", description: `Exported ${rows.length} approval records to CSV.` });
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
                <h1 className="text-2xl font-bold" data-testid="heading-approvals">
                  Approved Businesses
                </h1>
                <p className="text-muted-foreground">
                  Businesses approved from the bank statements review
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                onClick={handleExportCsv}
                className="flex items-center gap-2"
                data-testid="button-csv-export"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowCsvUpload(true);
                  setCsvContent('');
                  setCsvResults(null);
                }}
                className="flex items-center gap-2"
                data-testid="button-csv-import"
              >
                <Upload className="w-4 h-4" />
                CSV Import
              </Button>
              <Button
                variant="outline"
                onClick={() => setLocation("/declines")}
                className="flex items-center gap-2"
                data-testid="button-view-declines"
              >
                <ThumbsDown className="w-4 h-4" />
                View Declines ({stats.totalDeclined})
              </Button>
              <Button
                variant="outline"
                onClick={() => setLocation("/funded")}
                className="flex items-center gap-2"
                data-testid="button-view-funded"
              >
                <Banknote className="w-4 h-4" />
                View Funded ({(allDecisions || []).filter(d => d.status === "funded").length})
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg dark:bg-blue-900">
                  <DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold" data-testid="text-total-amount">
                    {formatCurrency(stats.totalAmount)}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Approved Amount</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg dark:bg-red-900">
                  <ThumbsDown className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold" data-testid="text-total-declines">
                    {stats.totalDeclined}
                  </div>
                  <div className="text-sm text-muted-foreground">Declined Businesses</div>
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

        {/* Approvals List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredDecisions.length === 0 ? (
          <Card className="p-12 text-center">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
            <p className="text-muted-foreground">
              {searchQuery ? "No approved businesses match your search" : "No approved businesses yet"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Approvals are managed from the bank statements section of the dashboard
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredDecisions.map((decision) => {
              const approvals = getApprovalsForDecision(decision);
              return (
                <Card key={decision.id} className="p-6 hover-elevate" data-testid={`card-approval-${decision.id}`}>
                  <div className="flex flex-col gap-4">
                    {/* Business header */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                          <Building2 className="w-5 h-5 text-primary" />
                          {decision.businessName || decision.businessEmail}
                        </h3>
                        <Badge className="bg-green-600 hover:bg-green-700 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Approved
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
                        {decision.approvalSlug && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(`/approved/${decision.approvalSlug}`, '_blank')}
                            data-testid={`button-view-letter-${decision.id}`}
                          >
                            <Link2 className="w-3 h-3 mr-1" />
                            View Letter
                          </Button>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(decision)}
                          data-testid={`button-add-approval-${decision.id}`}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add Approval
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => openFundDialog(decision)}
                          className="bg-emerald-600 text-white"
                          data-testid={`button-fund-${decision.id}`}
                        >
                          <Banknote className="w-4 h-4 mr-1" />
                          Fund
                        </Button>
                      </div>
                    </div>

                    <div className="text-sm text-muted-foreground">
                      {decision.businessEmail}
                    </div>

                    {/* Best Approval (Primary) at Top */}
                    {(() => {
                      const sortedApprovals = [...approvals].sort((a, b) => (a.isPrimary ? -1 : b.isPrimary ? 1 : 0));
                      const bestApproval = sortedApprovals[0];
                      const additionalApprovals = sortedApprovals.slice(1);
                      const isAdditionalExpanded = expandedAdditionalApprovals.has(decision.id);

                      const renderApproval = (appr: FullApprovalEntry) => (
                        <div
                          key={appr.id}
                          className={`p-4 rounded-lg border ${
                            appr.isPrimary
                              ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
                              : 'bg-muted/30 border-transparent'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3 mb-3">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleSetPrimary(decision, appr.id)}
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
                              <span className="font-semibold flex items-center gap-1">
                                <Landmark className="w-3 h-3 text-muted-foreground" />
                                {appr.lender || 'No lender'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditDialog(decision, appr.id)}
                                data-testid={`button-edit-approval-${appr.id}`}
                              >
                                <Pencil className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteApproval(decision, appr.id)}
                                className="text-red-500 hover:text-red-700"
                                data-testid={`button-delete-approval-${appr.id}`}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <div className="text-muted-foreground">Advance Amount</div>
                              <div className="font-semibold text-green-600 dark:text-green-400">
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
                      );
                    })()}

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

      {/* Edit/Add Approval Dialog */}
      <Dialog open={!!editingApproval} onOpenChange={(open) => !open && setEditingApproval(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-primary" />
              {editingApproval?.approvalId ? 'Edit' : 'Add'} Approval: {editingApproval?.decision.businessName || editingApproval?.decision.businessEmail}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
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
                <Input
                  id="edit-lender"
                  placeholder="Lender name"
                  value={editForm.lender}
                  onChange={(e) => setEditForm(prev => ({ ...prev, lender: e.target.value }))}
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
                onClick={() => setEditingApproval(null)}
                data-testid="button-cancel-edit"
              >
                <X className="w-4 h-4 mr-1" />
                Cancel
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={saving}
                className="bg-green-600 hover:bg-green-700"
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
                    {editingApproval?.approvalId ? 'Update Approval' : 'Save Approval'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* CSV Import Dialog */}
      <Dialog open={showCsvUpload} onOpenChange={setShowCsvUpload}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Bulk Import Approvals from CSV
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-md text-sm">
              <p className="font-medium mb-2">CSV Format:</p>
              <p className="text-muted-foreground text-xs mb-2">
                Your CSV should include these columns (in any order):
              </p>
              <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
                <li><strong>Business Name</strong> (required)</li>
                <li><strong>Overall Status</strong> (Approved / Declined Only)</li>
                <li><strong>Best Lender, Best Funding Amount, Best Factor Rate, Best Term, Best Payment Freq, Best Commission, Best Date</strong></li>
                <li><strong>Lender 2-5, Funding Amount 2-5, Factor Rate 2-5, Commission 2-5</strong> (for additional offers)</li>
                <li><strong>Declined Lender 1-3, Decline Reason 1-3</strong> (for decline info)</li>
              </ul>
            </div>
            
            {/* File upload */}
            <div>
              <Label htmlFor="csv-file" className="mb-2 block">Upload CSV File</Label>
              <Input
                id="csv-file"
                type="file"
                accept=".csv,text/csv"
                onChange={handleCsvFileChange}
                data-testid="input-csv-file"
              />
            </div>
            
            {/* Or paste CSV */}
            <div>
              <Label htmlFor="csv-text" className="mb-2 block">Or Paste CSV Content</Label>
              <Textarea
                id="csv-text"
                placeholder="Paste your CSV data here..."
                rows={10}
                value={csvContent}
                onChange={(e) => setCsvContent(e.target.value)}
                className="font-mono text-xs"
                data-testid="input-csv-text"
              />
            </div>
            
            {/* Results */}
            {csvResults && (
              <div className={`p-4 rounded-md ${csvResults.errors > 0 ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800' : 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'}`}>
                <p className="font-medium">
                  Import Results: {csvResults.imported} imported, {csvResults.errors} errors
                </p>
                {csvResults.results && csvResults.results.filter(r => r.status === 'error').length > 0 && (
                  <div className="mt-2 text-sm">
                    <p className="text-red-600 dark:text-red-400 font-medium">Errors:</p>
                    <ul className="list-disc list-inside text-xs mt-1">
                      {csvResults.results.filter(r => r.status === 'error').map((r, i) => (
                        <li key={i}>{r.businessName}: {r.error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
            
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowCsvUpload(false)}
                data-testid="button-cancel-csv"
              >
                Close
              </Button>
              <Button
                onClick={handleCsvUpload}
                disabled={csvUploading || !csvContent.trim()}
                className="bg-blue-600 hover:bg-blue-700"
                data-testid="button-import-csv"
              >
                {csvUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-1" />
                    Import CSV
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Fund Deal Dialog */}
      <Dialog open={!!fundingDecision} onOpenChange={(open) => !open && setFundingDecision(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Banknote className="w-5 h-5 text-emerald-600" />
              Fund Deal: {fundingDecision?.businessName || fundingDecision?.businessEmail}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Review and update the approval details below before marking this deal as funded.
          </p>
          <div className="space-y-4 pt-2">
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800">
              <Label htmlFor="fund-fundedDate" className="text-emerald-700 dark:text-emerald-300 font-semibold">Funded Date</Label>
              <Input
                id="fund-fundedDate"
                type="date"
                value={fundForm.fundedDate}
                onChange={(e) => setFundForm(prev => ({ ...prev, fundedDate: e.target.value }))}
                className="mt-1"
                data-testid="input-fund-funded-date"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fund-lender">Lender</Label>
                <Input
                  id="fund-lender"
                  placeholder="Lender name"
                  value={fundForm.lender}
                  onChange={(e) => setFundForm(prev => ({ ...prev, lender: e.target.value }))}
                  data-testid="input-fund-lender"
                />
              </div>
              <div>
                <Label htmlFor="fund-advanceAmount">Advance Amount</Label>
                <Input
                  id="fund-advanceAmount"
                  type="number"
                  placeholder="$50,000"
                  value={fundForm.advanceAmount}
                  onChange={(e) => setFundForm(prev => ({ ...prev, advanceAmount: e.target.value }))}
                  data-testid="input-fund-advance-amount"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fund-term">Term</Label>
                <Input
                  id="fund-term"
                  placeholder="6 months"
                  value={fundForm.term}
                  onChange={(e) => setFundForm(prev => ({ ...prev, term: e.target.value }))}
                  data-testid="input-fund-term"
                />
              </div>
              <div>
                <Label htmlFor="fund-paymentFrequency">Payment Frequency</Label>
                <Select
                  value={fundForm.paymentFrequency}
                  onValueChange={(value) => setFundForm(prev => ({ ...prev, paymentFrequency: value }))}
                >
                  <SelectTrigger data-testid="select-fund-payment-frequency">
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fund-factorRate">Factor Rate</Label>
                <Input
                  id="fund-factorRate"
                  type="number"
                  step="0.01"
                  placeholder="1.25"
                  value={fundForm.factorRate}
                  onChange={(e) => setFundForm(prev => ({ ...prev, factorRate: e.target.value }))}
                  data-testid="input-fund-factor-rate"
                />
              </div>
              <div>
                <Label htmlFor="fund-maxUpsell">Max Upsell</Label>
                <Input
                  id="fund-maxUpsell"
                  type="number"
                  placeholder="$75,000"
                  value={fundForm.maxUpsell}
                  onChange={(e) => setFundForm(prev => ({ ...prev, maxUpsell: e.target.value }))}
                  data-testid="input-fund-max-upsell"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fund-totalPayback">Total Payback</Label>
                <Input
                  id="fund-totalPayback"
                  type="number"
                  placeholder="$62,500"
                  value={fundForm.totalPayback}
                  onChange={(e) => setFundForm(prev => ({ ...prev, totalPayback: e.target.value }))}
                  data-testid="input-fund-total-payback"
                />
              </div>
              <div>
                <Label htmlFor="fund-netAfterFees">Net After Fees</Label>
                <Input
                  id="fund-netAfterFees"
                  type="number"
                  placeholder="$48,500"
                  value={fundForm.netAfterFees}
                  onChange={(e) => setFundForm(prev => ({ ...prev, netAfterFees: e.target.value }))}
                  data-testid="input-fund-net-after-fees"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="fund-approvalDate">Approval Date</Label>
              <Input
                id="fund-approvalDate"
                type="date"
                value={fundForm.approvalDate}
                onChange={(e) => setFundForm(prev => ({ ...prev, approvalDate: e.target.value }))}
                data-testid="input-fund-approval-date"
              />
            </div>
            <div>
              <Label htmlFor="fund-notes">Notes</Label>
              <Textarea
                id="fund-notes"
                placeholder="Additional notes..."
                rows={3}
                value={fundForm.notes}
                onChange={(e) => setFundForm(prev => ({ ...prev, notes: e.target.value }))}
                data-testid="input-fund-notes"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setFundingDecision(null)}
                data-testid="button-cancel-fund"
              >
                <X className="w-4 h-4 mr-1" />
                Cancel
              </Button>
              <Button
                onClick={handleSaveFund}
                disabled={fundSaving}
                className="bg-emerald-600 text-white"
                data-testid="button-confirm-fund"
              >
                {fundSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Banknote className="w-4 h-4 mr-1" />
                    Mark as Funded
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
