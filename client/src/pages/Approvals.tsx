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
  ShieldAlert,
  ArrowLeft,
  History
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
    pending: { className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100", icon: <Clock className="w-3 h-3" /> },
    accepted: { className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100", icon: <CheckCircle2 className="w-3 h-3" /> },
    declined: { className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100", icon: <XCircle className="w-3 h-3" /> },
    expired: { className: "bg-muted text-muted-foreground", icon: <AlertCircle className="w-3 h-3" /> },
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
    <div className="border rounded-lg p-4 bg-card hover-elevate" data-testid={`card-approval-${approval.id}`}>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-3">
        <div>
          {showBusiness && (
            <div className="font-semibold text-lg flex items-center gap-2">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              {approval.businessName}
            </div>
          )}
          {showLender && (
            <div className="text-sm text-muted-foreground flex items-center gap-2">
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
          <div className="text-muted-foreground">Approved Amount</div>
          <div className="font-semibold text-green-600 dark:text-green-400" data-testid={`text-amount-${approval.id}`}>
            {formatCurrency(approval.approvedAmount)}
          </div>
        </div>
        <div>
          <div className="text-muted-foreground">Term</div>
          <div className="font-medium">{approval.termLength || "N/A"}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Product</div>
          <div className="font-medium">{approval.productType || "N/A"}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Rate</div>
          <div className="font-medium">
            {approval.factorRate ? `${approval.factorRate}x` : approval.interestRate || "N/A"}
          </div>
        </div>
      </div>
      
      {(approval.paymentAmount || approval.paybackAmount) && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-3 pt-3 border-t">
          <div>
            <div className="text-muted-foreground">Payment</div>
            <div className="font-medium">
              {formatCurrency(approval.paymentAmount)} {approval.paymentFrequency || ""}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">Payback Amount</div>
            <div className="font-medium">{formatCurrency(approval.paybackAmount)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Expires</div>
            <div className="font-medium">{approval.expirationDate || "N/A"}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Received</div>
            <div className="font-medium">{formatDate(approval.emailReceivedAt)}</div>
          </div>
        </div>
      )}
      
      {approval.conditions && (
        <div className="mt-3 pt-3 border-t text-sm">
          <div className="text-muted-foreground mb-1">Conditions</div>
          <div>{approval.conditions}</div>
        </div>
      )}
      
      {approval.emailSubject && (
        <div className="mt-3 pt-3 border-t text-xs text-muted-foreground flex items-center gap-1">
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
      <div className="text-center py-12 text-muted-foreground">
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
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
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

interface AuthState {
  isAuthenticated: boolean;
  role?: 'admin' | 'agent';
}

export default function Approvals() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("business");
  const [accessDenied, setAccessDenied] = useState(false);
  const [hoursBack, setHoursBack] = useState("24");
  const [lastScanTime, setLastScanTime] = useState<Date | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check authentication first
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/check", { credentials: "include" });
        const data: AuthState = await res.json();
        if (data.isAuthenticated && data.role === "admin") {
          setIsAuthenticated(true);
        } else if (data.isAuthenticated && data.role !== "admin") {
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
  
  // Fetch Gmail status - only after auth is confirmed
  const { data: gmailStatus, error: gmailError } = useQuery<{ connected: boolean }>({
    queryKey: ["/api/approvals/gmail-status"],
    retry: false,
    enabled: isAuthenticated,
  });
  
  // Fetch stats
  const { data: stats, error: statsError } = useQuery<ApprovalStats>({
    queryKey: ["/api/approvals/stats"],
    retry: false,
    enabled: isAuthenticated,
  });
  
  // Fetch approvals by business
  const { data: byBusiness, isLoading: loadingBusiness, error: businessError } = useQuery<Record<string, LenderApproval[]>>({
    queryKey: ["/api/approvals/by-business"],
    retry: false,
    enabled: isAuthenticated,
  });
  
  // Fetch approvals by lender
  const { data: byLender, isLoading: loadingLender, error: lenderError } = useQuery<Record<string, LenderApproval[]>>({
    queryKey: ["/api/approvals/by-lender"],
    retry: false,
    enabled: isAuthenticated,
  });

  // Scan mutation - must be before any conditional returns
  const scanMutation = useMutation({
    mutationFn: async (hours: number) => {
      const res = await apiRequest("POST", "/api/approvals/scan", { hoursBack: hours });
      return res.json();
    },
    onSuccess: (data) => {
      setLastScanTime(new Date());
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
  
  const handleStatusChange = (id: string, status: string) => {
    updateStatusMutation.mutate({ id, status });
  };
  
  const handleScan = () => {
    scanMutation.mutate(parseInt(hoursBack));
  };
  
  const isLoading = loadingBusiness || loadingLender;

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
                Lender Approvals
              </h1>
              <p className="text-muted-foreground">
                Track funding approvals from lender emails
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {gmailStatus?.connected ? (
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 flex items-center gap-1">
                <Mail className="w-3 h-3" />
                Gmail Connected
              </Badge>
            ) : (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Mail className="w-3 h-3" />
                Gmail Not Connected
              </Badge>
            )}
            
            {lastScanTime && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <History className="w-3 h-3" />
                Last scan: {lastScanTime.toLocaleTimeString()}
              </div>
            )}
            
            <div className="flex items-center gap-2 ml-auto">
              <Select value={hoursBack} onValueChange={setHoursBack}>
                <SelectTrigger className="w-32" data-testid="select-hours">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="6">Last 6 hours</SelectItem>
                  <SelectItem value="24">Last 24 hours</SelectItem>
                  <SelectItem value="48">Last 48 hours</SelectItem>
                  <SelectItem value="168">Last 7 days</SelectItem>
                </SelectContent>
              </Select>
              
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
                    <div className="text-sm text-muted-foreground">Total Approvals</div>
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
                    <div className="text-sm text-muted-foreground">Total Approved</div>
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
                    <div className="text-sm text-muted-foreground">Pending</div>
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
                    <div className="text-sm text-muted-foreground">Businesses / Lenders</div>
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
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
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
        <div className="text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
          <CalendarClock className="w-4 h-4" />
          Emails are automatically scanned every hour
        </div>
      </div>
    </div>
  );
}
