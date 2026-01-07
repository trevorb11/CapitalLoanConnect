import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Mail,
  RefreshCw,
  Building2,
  Landmark,
  DollarSign,
  ChevronDown,
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  CalendarClock,
  ShieldAlert
} from "lucide-react";

interface LenderApproval {
  id: string;
  businessName: string;
  businessEmail: string | null;
  loanApplicationId: string | null;
  lenderName: string;
  lenderEmail: string | null;
  approvedAmount: string | null;
  termLength: string | null;
  factorRate: string | null;
  paybackAmount: string | null;
  paymentFrequency: string | null;
  paymentAmount: string | null;
  interestRate: string | null;
  productType: string | null;
  status: string;
  expirationDate: string | null;
  conditions: string | null;
  notes: string | null;
  emailId: string | null;
  emailSubject: string | null;
  emailReceivedAt: string | null;
  createdAt: string;
}

interface ApprovalStats {
  totalApprovals: number;
  pendingApprovals: number;
  acceptedApprovals: number;
  totalApprovedAmount: number;
  uniqueBusinesses: number;
  uniqueLenders: number;
}

function formatCurrency(value: string | number | null): string {
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

function formatDate(date: string | null): string {
  if (!date) return "N/A";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, { className: string; icon: React.ReactNode }> = {
    pending: { className: "bg-yellow-100 text-yellow-800", icon: <Clock className="w-3 h-3" /> },
    accepted: { className: "bg-green-100 text-green-800", icon: <CheckCircle2 className="w-3 h-3" /> },
    declined: { className: "bg-red-100 text-red-800", icon: <XCircle className="w-3 h-3" /> },
    expired: { className: "bg-gray-100 text-gray-800", icon: <AlertCircle className="w-3 h-3" /> },
  };
  
  const variant = variants[status] || variants.pending;
  
  return (
    <Badge className={`${variant.className} flex items-center gap-1`}>
      {variant.icon}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

function ApprovalCard({ 
  approval, 
  showBusiness = true,
  showLender = true,
  onStatusChange 
}: { 
  approval: LenderApproval; 
  showBusiness?: boolean;
  showLender?: boolean;
  onStatusChange: (id: string, status: string) => void;
}) {
  return (
    <div className="border rounded-lg p-4 bg-white hover-elevate" data-testid={`card-approval-${approval.id}`}>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-3">
        <div>
          {showBusiness && (
            <div className="font-semibold text-lg flex items-center gap-2">
              <Building2 className="w-4 h-4 text-gray-500" />
              {approval.businessName}
            </div>
          )}
          {showLender && (
            <div className="text-sm text-gray-600 flex items-center gap-2">
              <Landmark className="w-4 h-4" />
              {approval.lenderName}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={approval.status} />
          <Select
            value={approval.status}
            onValueChange={(value) => onStatusChange(approval.id, value)}
          >
            <SelectTrigger className="w-[120px] h-8" data-testid={`select-status-${approval.id}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="declined">Declined</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <div className="text-gray-500">Approved Amount</div>
          <div className="font-semibold text-green-600" data-testid={`text-amount-${approval.id}`}>
            {formatCurrency(approval.approvedAmount)}
          </div>
        </div>
        <div>
          <div className="text-gray-500">Term</div>
          <div className="font-medium">{approval.termLength || "N/A"}</div>
        </div>
        <div>
          <div className="text-gray-500">Product</div>
          <div className="font-medium">{approval.productType || "N/A"}</div>
        </div>
        <div>
          <div className="text-gray-500">Rate</div>
          <div className="font-medium">
            {approval.factorRate ? `${approval.factorRate}x` : approval.interestRate || "N/A"}
          </div>
        </div>
      </div>
      
      {(approval.paymentAmount || approval.paybackAmount) && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-3 pt-3 border-t">
          <div>
            <div className="text-gray-500">Payment</div>
            <div className="font-medium">
              {formatCurrency(approval.paymentAmount)} {approval.paymentFrequency || ""}
            </div>
          </div>
          <div>
            <div className="text-gray-500">Payback Amount</div>
            <div className="font-medium">{formatCurrency(approval.paybackAmount)}</div>
          </div>
          <div>
            <div className="text-gray-500">Expires</div>
            <div className="font-medium">{approval.expirationDate || "N/A"}</div>
          </div>
          <div>
            <div className="text-gray-500">Received</div>
            <div className="font-medium">{formatDate(approval.emailReceivedAt)}</div>
          </div>
        </div>
      )}
      
      {approval.conditions && (
        <div className="mt-3 pt-3 border-t text-sm">
          <div className="text-gray-500 mb-1">Conditions</div>
          <div className="text-gray-700">{approval.conditions}</div>
        </div>
      )}
      
      {approval.emailSubject && (
        <div className="mt-3 pt-3 border-t text-xs text-gray-400 flex items-center gap-1">
          <Mail className="w-3 h-3" />
          {approval.emailSubject}
        </div>
      )}
    </div>
  );
}

function GroupedApprovals({
  grouped,
  groupKey,
  icon,
  showBusiness,
  showLender,
  onStatusChange
}: {
  grouped: Record<string, LenderApproval[]>;
  groupKey: "business" | "lender";
  icon: React.ReactNode;
  showBusiness: boolean;
  showLender: boolean;
  onStatusChange: (id: string, status: string) => void;
}) {
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set(Object.keys(grouped)));
  
  const toggleGroup = (key: string) => {
    setOpenGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };
  
  const sortedKeys = Object.keys(grouped).sort();
  
  if (sortedKeys.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No approvals found</p>
        <p className="text-sm">Click "Scan for Approvals" to check your email</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {sortedKeys.map(key => {
        const approvals = grouped[key];
        const totalAmount = approvals.reduce((sum, a) => sum + (parseFloat(a.approvedAmount || "0") || 0), 0);
        const isOpen = openGroups.has(key);
        
        return (
          <Collapsible key={key} open={isOpen} onOpenChange={() => toggleGroup(key)}>
            <CollapsibleTrigger className="w-full" data-testid={`trigger-group-${key}`}>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-3">
                  {isOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                  <div className="flex items-center gap-2">
                    {icon}
                    <span className="font-semibold">{key}</span>
                  </div>
                  <Badge variant="secondary">{approvals.length} approval{approvals.length !== 1 ? "s" : ""}</Badge>
                </div>
                <div className="text-green-600 font-semibold">
                  {formatCurrency(totalAmount)}
                </div>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="space-y-3 mt-3 pl-8">
                {approvals.map(approval => (
                  <ApprovalCard
                    key={approval.id}
                    approval={approval}
                    showBusiness={showBusiness}
                    showLender={showLender}
                    onStatusChange={onStatusChange}
                  />
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </div>
  );
}

export default function Approvals() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("business");
  const [accessDenied, setAccessDenied] = useState(false);
  
  // Fetch Gmail status
  const { data: gmailStatus, error: gmailError } = useQuery<{ connected: boolean }>({
    queryKey: ["/api/approvals/gmail-status"],
    retry: false,
  });
  
  // Fetch stats
  const { data: stats, error: statsError } = useQuery<ApprovalStats>({
    queryKey: ["/api/approvals/stats"],
    retry: false,
  });
  
  // Fetch approvals by business
  const { data: byBusiness, isLoading: loadingBusiness, error: businessError } = useQuery<Record<string, LenderApproval[]>>({
    queryKey: ["/api/approvals/by-business"],
    retry: false,
  });
  
  // Fetch approvals by lender
  const { data: byLender, isLoading: loadingLender, error: lenderError } = useQuery<Record<string, LenderApproval[]>>({
    queryKey: ["/api/approvals/by-lender"],
    retry: false,
  });

  // Check for 403 errors (non-admin access)
  useEffect(() => {
    const errors = [gmailError, statsError, businessError, lenderError];
    for (const error of errors) {
      if (error && (error as any).message?.includes("403")) {
        setAccessDenied(true);
        break;
      }
    }
  }, [gmailError, statsError, businessError, lenderError]);

  // Access denied view
  if (accessDenied) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <ShieldAlert className="w-16 h-16 mx-auto text-red-500 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-500 mb-6">
            This page is only accessible to administrators. Please contact your admin if you need access.
          </p>
          <Button onClick={() => setLocation("/dashboard")} data-testid="button-back-dashboard">
            Return to Dashboard
          </Button>
        </Card>
      </div>
    );
  }
  
  // Scan mutation
  const scanMutation = useMutation({
    mutationFn: async (hoursBack: number) => {
      const res = await apiRequest("POST", "/api/approvals/scan", { hoursBack });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/approvals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/approvals/by-business"] });
      queryClient.invalidateQueries({ queryKey: ["/api/approvals/by-lender"] });
      queryClient.invalidateQueries({ queryKey: ["/api/approvals/stats"] });
      
      toast({
        title: "Scan Complete",
        description: `Scanned ${data.scanned} emails. Found ${data.newApprovals} new approval${data.newApprovals !== 1 ? "s" : ""}.`
      });
    },
    onError: (error: any) => {
      toast({
        title: "Scan Failed",
        description: error.message || "Failed to scan for approvals",
        variant: "destructive"
      });
    }
  });
  
  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/approvals/${id}`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/approvals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/approvals/by-business"] });
      queryClient.invalidateQueries({ queryKey: ["/api/approvals/by-lender"] });
      queryClient.invalidateQueries({ queryKey: ["/api/approvals/stats"] });
      toast({
        title: "Status Updated",
        description: "Approval status has been updated."
      });
    }
  });
  
  const handleStatusChange = (id: string, status: string) => {
    updateStatusMutation.mutate({ id, status });
  };
  
  const handleScan = () => {
    scanMutation.mutate(24);
  };
  
  const isLoading = loadingBusiness || loadingLender;
  
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900" data-testid="heading-approvals">
              Lender Approvals
            </h1>
            <p className="text-gray-500">
              Track funding approvals from lender emails
            </p>
          </div>
          <div className="flex items-center gap-3">
            {gmailStatus?.connected ? (
              <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
                <Mail className="w-3 h-3" />
                Gmail Connected
              </Badge>
            ) : (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Mail className="w-3 h-3" />
                Gmail Not Connected
              </Badge>
            )}
            <Button 
              onClick={handleScan}
              disabled={scanMutation.isPending || !gmailStatus?.connected}
              className="flex items-center gap-2"
              data-testid="button-scan"
            >
              {scanMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Scan for Approvals
            </Button>
          </div>
        </div>
        
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Mail className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold" data-testid="text-total-approvals">
                      {stats.totalApprovals}
                    </div>
                    <div className="text-sm text-gray-500">Total Approvals</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <DollarSign className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold" data-testid="text-total-amount">
                      {formatCurrency(stats.totalApprovedAmount)}
                    </div>
                    <div className="text-sm text-gray-500">Total Approved</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <Clock className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold" data-testid="text-pending-approvals">
                      {stats.pendingApprovals}
                    </div>
                    <div className="text-sm text-gray-500">Pending</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Building2 className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">
                      {stats.uniqueBusinesses} / {stats.uniqueLenders}
                    </div>
                    <div className="text-sm text-gray-500">Businesses / Lenders</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* Tabs */}
        <Card>
          <CardHeader className="pb-2">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="business" className="flex items-center gap-2" data-testid="tab-business">
                  <Building2 className="w-4 h-4" />
                  By Business
                </TabsTrigger>
                <TabsTrigger value="lender" className="flex items-center gap-2" data-testid="tab-lender">
                  <Landmark className="w-4 h-4" />
                  By Lender
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : (
              <>
                {activeTab === "business" && byBusiness && (
                  <GroupedApprovals
                    grouped={byBusiness}
                    groupKey="business"
                    icon={<Building2 className="w-5 h-5 text-blue-600" />}
                    showBusiness={false}
                    showLender={true}
                    onStatusChange={handleStatusChange}
                  />
                )}
                {activeTab === "lender" && byLender && (
                  <GroupedApprovals
                    grouped={byLender}
                    groupKey="lender"
                    icon={<Landmark className="w-5 h-5 text-purple-600" />}
                    showBusiness={true}
                    showLender={false}
                    onStatusChange={handleStatusChange}
                  />
                )}
              </>
            )}
          </CardContent>
        </Card>
        
        {/* Scan info */}
        <div className="text-center text-sm text-gray-400 flex items-center justify-center gap-2">
          <CalendarClock className="w-4 h-4" />
          Emails are automatically scanned every hour
        </div>
      </div>
    </div>
  );
}
