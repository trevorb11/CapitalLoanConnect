import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  LogOut,
  User,
  Building2,
  DollarSign,
  Calendar,
  Copy,
  Check,
  TrendingUp,
  Users,
  FileText,
  Link as LinkIcon,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { format } from "date-fns";

interface PartnerAuth {
  isAuthenticated: boolean;
  role?: string;
  partnerId?: string;
  partnerEmail?: string;
  partnerName?: string;
  companyName?: string;
}

interface PartnerProfile {
  id: string;
  email: string;
  companyName: string;
  contactName: string;
  phone: string | null;
  profession: string | null;
  clientBaseSize: string | null;
  logoUrl: string | null;
  inviteCode: string;
  commissionRate: string;
  createdAt: string;
}

interface PartnerStats {
  totalReferrals: number;
  intakeCompleted: number;
  fullAppsCompleted: number;
  withBankConnection: number;
  totalRequestedVolume: number;
  estimatedCommission: number;
  commissionRate: string;
}

interface PartnerApplication {
  id: string;
  businessName: string | null;
  contactName: string | null;
  email: string;
  phone: string | null;
  requestedAmount: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  industry: string | null;
  timeInBusiness: string | null;
  isCompleted: boolean;
  isFullApplicationCompleted: boolean;
  hasBankConnection: boolean;
}

function PartnerLoginForm({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerData, setRegisterData] = useState({
    companyName: "",
    contactName: "",
    phone: "",
    profession: "cpa",
    clientBaseSize: "1-10",
  });

  const loginMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/partner/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
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

  const registerMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/partner/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          ...registerData,
        }),
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Registration failed");
      }
      return res.json();
    },
    onSuccess: () => {
      onLoginSuccess();
    },
    onError: (err: any) => {
      setError(err.message || "Registration failed. Please try again.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (isRegistering) {
      registerMutation.mutate();
    } else {
      loginMutation.mutate();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#051D49] to-[#0D1B4A] p-4">
      <Card className="w-full max-w-md p-8 bg-white">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#46B9B3]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-[#46B9B3]" />
          </div>
          <h1 className="text-2xl font-bold mb-2 text-[#051D49]">
            {isRegistering ? "Join Partner Program" : "Partner Portal"}
          </h1>
          <p className="text-gray-500 text-sm">
            {isRegistering
              ? "Create your partner account to start earning"
              : "Sign in to track your referrals and commissions"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="partner@company.com"
              className="w-full"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">Password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password..."
              className="w-full"
              required
              minLength={6}
            />
          </div>

          {isRegistering && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">
                  Company Name
                </label>
                <Input
                  type="text"
                  value={registerData.companyName}
                  onChange={(e) =>
                    setRegisterData({ ...registerData, companyName: e.target.value })
                  }
                  placeholder="Your Company LLC"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">Your Name</label>
                <Input
                  type="text"
                  value={registerData.contactName}
                  onChange={(e) =>
                    setRegisterData({ ...registerData, contactName: e.target.value })
                  }
                  placeholder="John Smith"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">Phone</label>
                <Input
                  type="text"
                  inputMode="tel"
                  value={registerData.phone}
                  onChange={(e) =>
                    setRegisterData({ ...registerData, phone: e.target.value })
                  }
                  placeholder="555-123-4567"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">Profession</label>
                <select
                  value={registerData.profession}
                  onChange={(e) =>
                    setRegisterData({ ...registerData, profession: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-md text-sm"
                >
                  <option value="cpa">CPA / Accountant</option>
                  <option value="realtor">Commercial Realtor</option>
                  <option value="vendor">Equipment Vendor</option>
                  <option value="consultant">Business Consultant</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">
                  Client Base Size
                </label>
                <select
                  value={registerData.clientBaseSize}
                  onChange={(e) =>
                    setRegisterData({ ...registerData, clientBaseSize: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-md text-sm"
                >
                  <option value="1-10">1 - 10 Clients</option>
                  <option value="10-50">10 - 50 Clients</option>
                  <option value="50+">50+ Clients</option>
                </select>
              </div>
            </>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <Button
            type="submit"
            className="w-full bg-[#46B9B3] hover:bg-[#3da8a2] text-[#051D49] font-semibold"
            disabled={loginMutation.isPending || registerMutation.isPending}
          >
            {(loginMutation.isPending || registerMutation.isPending)
              ? "Please wait..."
              : isRegistering
              ? "Create Account"
              : "Sign In"}
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t text-center">
          <button
            type="button"
            onClick={() => {
              setIsRegistering(!isRegistering);
              setError("");
            }}
            className="text-sm text-[#46B9B3] hover:underline"
          >
            {isRegistering
              ? "Already have an account? Sign in"
              : "New partner? Create an account"}
          </button>
        </div>
      </Card>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  subtitle,
  highlight,
}: {
  title: string;
  value: string | number;
  icon: any;
  subtitle?: string;
  highlight?: boolean;
}) {
  return (
    <Card className={`p-6 ${highlight ? "bg-[#46B9B3]/5 border-[#46B9B3]/30" : ""}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-1">{title}</p>
          <p className={`text-2xl font-bold ${highlight ? "text-[#46B9B3]" : "text-[#051D49]"}`}>
            {value}
          </p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-lg ${highlight ? "bg-[#46B9B3]/10" : "bg-gray-100"}`}>
          <Icon className={`w-5 h-5 ${highlight ? "text-[#46B9B3]" : "text-gray-500"}`} />
        </div>
      </div>
    </Card>
  );
}

function getStatusBadge(status: string) {
  const statusConfig: Record<string, { color: string; icon: any }> = {
    "Intake Started": { color: "bg-yellow-100 text-yellow-700", icon: Clock },
    "Pre-Qualified": { color: "bg-blue-100 text-blue-700", icon: CheckCircle2 },
    "Application Submitted": { color: "bg-purple-100 text-purple-700", icon: FileText },
    "Under Review": { color: "bg-green-100 text-green-700", icon: TrendingUp },
  };

  const config = statusConfig[status] || { color: "bg-gray-100 text-gray-700", icon: AlertCircle };
  const Icon = config.icon;

  return (
    <Badge className={`${config.color} flex items-center gap-1`}>
      <Icon className="w-3 h-3" />
      {status}
    </Badge>
  );
}

export default function PartnerDashboard() {
  const [searchTerm, setSearchTerm] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);

  // Check auth status
  const { data: auth, isLoading: authLoading, refetch: refetchAuth } = useQuery<PartnerAuth>({
    queryKey: ["/api/auth/check"],
    queryFn: async () => {
      const res = await fetch("/api/auth/check", { credentials: "include" });
      return res.json();
    },
  });

  // Fetch partner profile
  const { data: profile } = useQuery<PartnerProfile>({
    queryKey: ["/api/partner/profile"],
    queryFn: async () => {
      const res = await fetch("/api/partner/profile", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch profile");
      return res.json();
    },
    enabled: auth?.isAuthenticated && auth?.role === "partner",
  });

  // Fetch partner stats
  const { data: stats } = useQuery<PartnerStats>({
    queryKey: ["/api/partner/stats"],
    queryFn: async () => {
      const res = await fetch("/api/partner/stats", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
    enabled: auth?.isAuthenticated && auth?.role === "partner",
  });

  // Fetch applications
  const { data: applications, isLoading: applicationsLoading } = useQuery<PartnerApplication[]>({
    queryKey: ["/api/partner/applications"],
    queryFn: async () => {
      const res = await fetch("/api/partner/applications", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch applications");
      return res.json();
    },
    enabled: auth?.isAuthenticated && auth?.role === "partner",
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Logout failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/check"] });
    },
  });

  const handleLoginSuccess = () => {
    refetchAuth();
    queryClient.invalidateQueries({ queryKey: ["/api/partner/profile"] });
    queryClient.invalidateQueries({ queryKey: ["/api/partner/stats"] });
    queryClient.invalidateQueries({ queryKey: ["/api/partner/applications"] });
  };

  const referralLink = profile
    ? `${window.location.origin}/r/${profile.inviteCode}`
    : "";

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const filteredApplications = applications?.filter(
    (app) =>
      app.businessName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.contactName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (value: number | string) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(num || 0);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#051D49] to-[#0D1B4A]">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!auth?.isAuthenticated || auth.role !== "partner") {
    return <PartnerLoginForm onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#051D49] text-white py-4 px-6 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 border-2 border-[#46B9B3] rounded-full flex items-center justify-center text-[#46B9B3] font-bold">
              G
            </div>
            <div>
              <h1 className="font-bold">TODAY CAPITAL GROUP</h1>
              <p className="text-sm text-gray-300">Partner Portal</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="font-medium">{auth.companyName}</p>
              <p className="text-sm text-gray-300">{auth.partnerName}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => logoutMutation.mutate()}
              className="text-white hover:bg-white/10"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        {/* Referral Link Card */}
        <Card className="p-6 mb-6 bg-gradient-to-r from-[#051D49] to-[#0D1B4A] text-white">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-lg font-semibold mb-1">Your Referral Link</h2>
              <p className="text-sm text-gray-300">
                Share this link with clients to track referrals automatically
              </p>
            </div>
            <div className="flex items-center gap-2">
              <code className="bg-white/10 px-4 py-2 rounded-lg text-sm font-mono">
                {referralLink || "Loading..."}
              </code>
              <Button
                onClick={copyReferralLink}
                className="bg-[#46B9B3] hover:bg-[#3da8a2] text-[#051D49]"
              >
                {copiedLink ? (
                  <Check className="w-4 h-4 mr-2" />
                ) : (
                  <Copy className="w-4 h-4 mr-2" />
                )}
                {copiedLink ? "Copied!" : "Copy"}
              </Button>
            </div>
          </div>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            title="Total Referrals"
            value={stats?.totalReferrals || 0}
            icon={Users}
          />
          <StatCard
            title="Pre-Qualified"
            value={stats?.intakeCompleted || 0}
            icon={CheckCircle2}
            subtitle="Completed intake"
          />
          <StatCard
            title="Requested Volume"
            value={formatCurrency(stats?.totalRequestedVolume || 0)}
            icon={TrendingUp}
          />
          <StatCard
            title="Est. Commission"
            value={formatCurrency(stats?.estimatedCommission || 0)}
            icon={DollarSign}
            subtitle={`${stats?.commissionRate || "3.00"}% rate`}
            highlight
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="referrals" className="space-y-4">
          <TabsList className="bg-white border">
            <TabsTrigger value="referrals" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Referrals
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Profile
            </TabsTrigger>
          </TabsList>

          {/* Referrals Tab */}
          <TabsContent value="referrals">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-[#051D49]">Your Referrals</h3>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search referrals..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {applicationsLoading ? (
                <div className="text-center py-12 text-gray-500">Loading referrals...</div>
              ) : filteredApplications && filteredApplications.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b text-left text-sm text-gray-500">
                        <th className="pb-3 font-medium">Business</th>
                        <th className="pb-3 font-medium">Contact</th>
                        <th className="pb-3 font-medium">Amount</th>
                        <th className="pb-3 font-medium">Status</th>
                        <th className="pb-3 font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredApplications.map((app) => (
                        <tr key={app.id} className="border-b last:border-b-0 hover:bg-gray-50">
                          <td className="py-4">
                            <div>
                              <p className="font-medium text-[#051D49]">
                                {app.businessName || "Not provided"}
                              </p>
                              <p className="text-sm text-gray-500">{app.industry || "—"}</p>
                            </div>
                          </td>
                          <td className="py-4">
                            <div>
                              <p className="font-medium">{app.contactName || "—"}</p>
                              <p className="text-sm text-gray-500">{app.email}</p>
                            </div>
                          </td>
                          <td className="py-4 font-medium">
                            {app.requestedAmount
                              ? formatCurrency(app.requestedAmount)
                              : "—"}
                          </td>
                          <td className="py-4">{getStatusBadge(app.status)}</td>
                          <td className="py-4 text-sm text-gray-500">
                            {format(new Date(app.createdAt), "MMM d, yyyy")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">No referrals yet</h4>
                  <p className="text-gray-500 mb-4">
                    Share your referral link to start tracking leads
                  </p>
                  <Button
                    onClick={copyReferralLink}
                    className="bg-[#46B9B3] hover:bg-[#3da8a2] text-[#051D49]"
                  >
                    <LinkIcon className="w-4 h-4 mr-2" />
                    Copy Referral Link
                  </Button>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-[#051D49] mb-6">Partner Profile</h3>

              {profile ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm text-gray-500">Company Name</label>
                      <p className="font-medium text-[#051D49]">{profile.companyName}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">Contact Name</label>
                      <p className="font-medium">{profile.contactName}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">Email</label>
                      <p className="font-medium">{profile.email}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">Phone</label>
                      <p className="font-medium">{profile.phone || "Not provided"}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-sm text-gray-500">Profession</label>
                      <p className="font-medium capitalize">
                        {profile.profession?.replace(/_/g, " ") || "Not specified"}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">Client Base Size</label>
                      <p className="font-medium">{profile.clientBaseSize || "Not specified"}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">Commission Rate</label>
                      <p className="font-medium text-[#46B9B3]">{profile.commissionRate}%</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">Invite Code</label>
                      <p className="font-mono font-medium">{profile.inviteCode}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">Member Since</label>
                      <p className="font-medium">
                        {format(new Date(profile.createdAt), "MMMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">Loading profile...</div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
