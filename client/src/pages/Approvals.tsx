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
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { BusinessUnderwritingDecision } from "@shared/schema";

interface AuthState {
  isAuthenticated: boolean;
  role?: 'admin' | 'agent' | 'underwriting';
}

interface AdditionalApproval {
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
  const [editingDecision, setEditingDecision] = useState<BusinessUnderwritingDecision | null>(null);
  const [editForm, setEditForm] = useState({
    advanceAmount: '',
    term: '',
    paymentFrequency: 'weekly',
    factorRate: '',
    totalPayback: '',
    netAfterFees: '',
    lender: '',
    notes: '',
    approvalDate: '',
  });
  const [saving, setSaving] = useState(false);
  // Additional approvals editing state
  const [editAdditionalApprovals, setEditAdditionalApprovals] = useState<AdditionalApproval[]>([]);
  const [showEditAddForm, setShowEditAddForm] = useState(false);
  const [newEditApproval, setNewEditApproval] = useState<AdditionalApproval>({ lender: '', amount: '', term: '', factorRate: '' });

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

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, any> }) => {
      const res = await fetch(`/api/underwriting-decisions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/underwriting-decisions"] });
      toast({ title: "Updated", description: "Approval details have been saved." });
      setEditingDecision(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update approval details.", variant: "destructive" });
    },
  });

  const openEditDialog = (decision: BusinessUnderwritingDecision) => {
    setEditForm({
      advanceAmount: decision.advanceAmount?.toString() || '',
      term: decision.term || '',
      paymentFrequency: decision.paymentFrequency || 'weekly',
      factorRate: decision.factorRate?.toString() || '',
      totalPayback: decision.totalPayback?.toString() || '',
      netAfterFees: decision.netAfterFees?.toString() || '',
      lender: decision.lender || '',
      notes: decision.notes || '',
      approvalDate: decision.approvalDate ? new Date(decision.approvalDate).toISOString().split('T')[0] : '',
    });
    const existing = decision.additionalApprovals as AdditionalApproval[] | null;
    setEditAdditionalApprovals(existing || []);
    setShowEditAddForm(false);
    setNewEditApproval({ lender: '', amount: '', term: '', factorRate: '' });
    setEditingDecision(decision);
  };

  const handleSaveEdit = async () => {
    if (!editingDecision) return;
    setSaving(true);
    try {
      await updateMutation.mutateAsync({
        id: editingDecision.id,
        updates: {
          advanceAmount: editForm.advanceAmount ? parseFloat(editForm.advanceAmount) : null,
          term: editForm.term || null,
          paymentFrequency: editForm.paymentFrequency || null,
          factorRate: editForm.factorRate ? parseFloat(editForm.factorRate) : null,
          totalPayback: editForm.totalPayback ? parseFloat(editForm.totalPayback) : null,
          netAfterFees: editForm.netAfterFees ? parseFloat(editForm.netAfterFees) : null,
          lender: editForm.lender || null,
          notes: editForm.notes || null,
          approvalDate: editForm.approvalDate || null,
          additionalApprovals: editAdditionalApprovals.length > 0 ? editAdditionalApprovals : null,
        },
      });
    } finally {
      setSaving(false);
    }
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
              const additionalApprovals = (decision.additionalApprovals as AdditionalApproval[] | null) || [];
              return (
                <Card key={decision.id} className="p-6 hover-elevate" data-testid={`card-approval-${decision.id}`}>
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    {/* Left: Business info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3 flex-wrap">
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                          <Building2 className="w-5 h-5 text-primary" />
                          {decision.businessName || decision.businessEmail}
                        </h3>
                        <Badge className="bg-green-600 hover:bg-green-700 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Approved
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

                      <div className="text-sm text-muted-foreground mb-3">
                        {decision.businessEmail}
                      </div>

                      {/* Primary Approval Details Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="text-muted-foreground">Advance Amount</div>
                          <div className="font-semibold text-green-600 dark:text-green-400">
                            {formatCurrency(decision.advanceAmount)}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Term</div>
                          <div className="font-medium">{decision.term || "N/A"}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Factor Rate</div>
                          <div className="font-medium">
                            {decision.factorRate ? `${decision.factorRate}x` : "N/A"}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Payment Frequency</div>
                          <div className="font-medium capitalize">{decision.paymentFrequency || "N/A"}</div>
                        </div>
                      </div>

                      {(decision.totalPayback || decision.netAfterFees || decision.lender) && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-3 pt-3 border-t">
                          <div>
                            <div className="text-muted-foreground">Total Payback</div>
                            <div className="font-medium">{formatCurrency(decision.totalPayback)}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Net After Fees</div>
                            <div className="font-medium">{formatCurrency(decision.netAfterFees)}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Lender</div>
                            <div className="font-medium">{decision.lender || "N/A"}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Approval Date</div>
                            <div className="font-medium flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDate(decision.approvalDate)}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Additional Approvals */}
                      {additionalApprovals.length > 0 && (
                        <div className="mt-3 pt-3 border-t">
                          <div className="text-sm text-muted-foreground mb-2 font-medium">Additional Approvals</div>
                          <div className="space-y-2">
                            {additionalApprovals.map((appr, idx) => (
                              <div key={idx} className="flex items-center gap-4 p-2 bg-muted/50 rounded-lg text-sm">
                                <div className="flex items-center gap-1">
                                  <Landmark className="w-3 h-3 text-muted-foreground" />
                                  <span className="font-medium">{appr.lender}</span>
                                </div>
                                <div className="font-semibold text-green-600 dark:text-green-400">
                                  {formatCurrency(appr.amount)}
                                </div>
                                {appr.term && (
                                  <div className="text-muted-foreground">{appr.term}</div>
                                )}
                                {appr.factorRate && (
                                  <div className="text-muted-foreground">{appr.factorRate}x</div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {decision.notes && (
                        <div className="mt-3 pt-3 border-t text-sm">
                          <div className="text-muted-foreground mb-1">Notes</div>
                          <div className="whitespace-pre-wrap">{decision.notes}</div>
                        </div>
                      )}

                      {decision.reviewedBy && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          Reviewed by: {decision.reviewedBy} | Updated: {formatDate(decision.updatedAt)}
                        </div>
                      )}
                    </div>

                    {/* Right: Edit button */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(decision)}
                        data-testid={`button-edit-${decision.id}`}
                      >
                        <Pencil className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingDecision} onOpenChange={(open) => !open && setEditingDecision(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-primary" />
              Edit Approval: {editingDecision?.businessName || editingDecision?.businessEmail}
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
                    <SelectItem value="biweekly">Bi-Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
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

            {/* Additional Approvals Section in Edit Dialog */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-base font-semibold">Additional Approvals</Label>
                {!showEditAddForm && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowEditAddForm(true)}
                    data-testid="button-edit-add-additional"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add
                  </Button>
                )}
              </div>

              {editAdditionalApprovals.length > 0 && (
                <div className="space-y-2 mb-3">
                  {editAdditionalApprovals.map((appr, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg text-sm">
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-muted-foreground">Lender: </span>
                          <span className="font-medium">{appr.lender}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Amount: </span>
                          <span className="font-medium text-green-600">${parseFloat(appr.amount).toLocaleString()}</span>
                        </div>
                        {appr.term && (
                          <div>
                            <span className="text-muted-foreground">Term: </span>
                            <span className="font-medium">{appr.term}</span>
                          </div>
                        )}
                        {appr.factorRate && (
                          <div>
                            <span className="text-muted-foreground">Rate: </span>
                            <span className="font-medium">{appr.factorRate}x</span>
                          </div>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditAdditionalApprovals(prev => prev.filter((_, i) => i !== idx))}
                        className="text-red-500 hover:text-red-700 ml-2"
                        data-testid={`button-edit-remove-additional-${idx}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {showEditAddForm && (
                <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="edit-new-appr-lender" className="text-xs">Lender *</Label>
                      <Input
                        id="edit-new-appr-lender"
                        placeholder="Lender name"
                        value={newEditApproval.lender}
                        onChange={(e) => setNewEditApproval(prev => ({ ...prev, lender: e.target.value }))}
                        data-testid="input-edit-new-appr-lender"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-new-appr-amount" className="text-xs">Amount *</Label>
                      <Input
                        id="edit-new-appr-amount"
                        type="number"
                        placeholder="$25,000"
                        value={newEditApproval.amount}
                        onChange={(e) => setNewEditApproval(prev => ({ ...prev, amount: e.target.value }))}
                        data-testid="input-edit-new-appr-amount"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-new-appr-term" className="text-xs">Term Length</Label>
                      <Input
                        id="edit-new-appr-term"
                        placeholder="6 months"
                        value={newEditApproval.term}
                        onChange={(e) => setNewEditApproval(prev => ({ ...prev, term: e.target.value }))}
                        data-testid="input-edit-new-appr-term"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-new-appr-rate" className="text-xs">Factor Rate</Label>
                      <Input
                        id="edit-new-appr-rate"
                        type="number"
                        step="0.01"
                        placeholder="1.25"
                        value={newEditApproval.factorRate}
                        onChange={(e) => setNewEditApproval(prev => ({ ...prev, factorRate: e.target.value }))}
                        data-testid="input-edit-new-appr-rate"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowEditAddForm(false);
                        setNewEditApproval({ lender: '', amount: '', term: '', factorRate: '' });
                      }}
                      data-testid="button-edit-cancel-new-appr"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={!newEditApproval.lender.trim() || !newEditApproval.amount.trim()}
                      onClick={() => {
                        setEditAdditionalApprovals(prev => [...prev, { ...newEditApproval }]);
                        setNewEditApproval({ lender: '', amount: '', term: '', factorRate: '' });
                        setShowEditAddForm(false);
                      }}
                      data-testid="button-edit-save-new-appr"
                    >
                      <Save className="w-3 h-3 mr-1" />
                      Save
                    </Button>
                  </div>
                </div>
              )}

              {editAdditionalApprovals.length === 0 && !showEditAddForm && (
                <p className="text-xs text-muted-foreground">No additional approvals added</p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setEditingDecision(null)}
                data-testid="button-cancel-edit"
              >
                <X className="w-4 h-4 mr-1" />
                Cancel
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={saving}
                className="bg-primary"
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
    </div>
  );
}
