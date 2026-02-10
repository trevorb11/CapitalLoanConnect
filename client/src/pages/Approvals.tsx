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
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { BusinessUnderwritingDecision } from "@shared/schema";

interface AuthState {
  isAuthenticated: boolean;
  role?: 'admin' | 'agent' | 'underwriting';
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

  // Filter to only approved decisions, sorted by most recent first
  const approvedDecisions = (allDecisions || [])
    .filter(d => d.status === "approved")
    .sort((a, b) => {
      const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return dateB - dateA;
    });

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
                      </div>
                    </div>

                    <div className="text-sm text-muted-foreground">
                      {decision.businessEmail}
                    </div>

                    {/* All Approvals List */}
                    <div className="space-y-3">
                      {approvals.map((appr) => (
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
                                title={appr.isPrimary ? 'Primary approval' : 'Set as primary'}
                                data-testid={`button-set-primary-${appr.id}`}
                              >
                                <Star className={`w-4 h-4 ${appr.isPrimary ? 'fill-yellow-500' : ''}`} />
                              </button>
                              {appr.isPrimary && (
                                <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300 text-xs">
                                  Primary
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
                      ))}
                    </div>

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
    </div>
  );
}
