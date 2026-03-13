import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Search,
  Mail,
  MessageSquare,
  Send,
  Loader2,
  ShieldAlert,
  Users,
  CheckCircle2,
  Phone,
  Building2,
  Filter,
  X,
} from "lucide-react";

interface AuthState {
  isAuthenticated: boolean;
  role?: "admin" | "agent" | "underwriting";
}

interface Merchant {
  email: string;
  businessName: string;
  phone: string;
  sources: string[];
  status: string | null;
  assignedRep: string | null;
}

interface SendResult {
  sent: number;
  emailsSent: number;
  smsSent: number;
  failures: number;
  results: { email: string; emailSent?: boolean; smsSent?: boolean; error?: string }[];
}

export default function Messaging() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [accessDenied, setAccessDenied] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Selection state
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>("all");

  // Compose state
  const [channel, setChannel] = useState<"email" | "sms" | "both">("email");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  // Auth check
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

  // Fetch merchants
  const { data: merchants, isLoading } = useQuery<Merchant[]>({
    queryKey: ["/api/messaging/merchants"],
    queryFn: async () => {
      const res = await fetch("/api/messaging/merchants", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch merchants");
      return res.json();
    },
    enabled: isAuthenticated,
  });

  // Send mutation
  const sendMutation = useMutation({
    mutationFn: async (payload: {
      recipients: { email: string; phone?: string; businessName?: string }[];
      subject: string;
      message: string;
      channel: "email" | "sms" | "both";
    }) => {
      const res = await fetch("/api/messaging/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Send failed" }));
        throw new Error(err.error || "Send failed");
      }
      return res.json() as Promise<SendResult>;
    },
    onSuccess: (data) => {
      const parts: string[] = [];
      if (data.emailsSent > 0) parts.push(`${data.emailsSent} email${data.emailsSent !== 1 ? "s" : ""}`);
      if (data.smsSent > 0) parts.push(`${data.smsSent} SMS`);
      if (data.failures > 0) parts.push(`${data.failures} failed`);
      toast({
        title: "Messages sent",
        description: parts.join(", ") || "Completed",
      });
      setSelectedEmails(new Set());
      setMessage("");
      setSubject("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Filter merchants
  const filteredMerchants = useMemo(() => {
    if (!merchants) return [];
    return merchants.filter((m) => {
      // Source filter
      if (sourceFilter !== "all") {
        if (!m.sources.includes(sourceFilter)) return false;
      }
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          m.email.toLowerCase().includes(q) ||
          (m.businessName || "").toLowerCase().includes(q) ||
          (m.phone || "").includes(q) ||
          (m.assignedRep || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [merchants, searchQuery, sourceFilter]);

  // Selection helpers
  const allVisibleSelected =
    filteredMerchants.length > 0 &&
    filteredMerchants.every((m) => selectedEmails.has(m.email.toLowerCase()));

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      const newSet = new Set(selectedEmails);
      filteredMerchants.forEach((m) => newSet.delete(m.email.toLowerCase()));
      setSelectedEmails(newSet);
    } else {
      const newSet = new Set(selectedEmails);
      filteredMerchants.forEach((m) => newSet.add(m.email.toLowerCase()));
      setSelectedEmails(newSet);
    }
  };

  const toggleSelect = (email: string) => {
    const key = email.toLowerCase();
    const newSet = new Set(selectedEmails);
    if (newSet.has(key)) {
      newSet.delete(key);
    } else {
      newSet.add(key);
    }
    setSelectedEmails(newSet);
  };

  const selectedMerchants = useMemo(() => {
    if (!merchants) return [];
    return merchants.filter((m) => selectedEmails.has(m.email.toLowerCase()));
  }, [merchants, selectedEmails]);

  const handleSend = () => {
    if (selectedMerchants.length === 0) {
      toast({ title: "No recipients", description: "Select at least one merchant.", variant: "destructive" });
      return;
    }
    if (!message.trim()) {
      toast({ title: "No message", description: "Write a message to send.", variant: "destructive" });
      return;
    }
    if ((channel === "email" || channel === "both") && !subject.trim()) {
      toast({ title: "No subject", description: "Add a subject line for the email.", variant: "destructive" });
      return;
    }

    const recipients = selectedMerchants.map((m) => ({
      email: m.email,
      phone: m.phone || undefined,
      businessName: m.businessName || undefined,
    }));

    sendMutation.mutate({ recipients, subject: subject.trim(), message: message.trim(), channel });
  };

  const getSourceBadgeColor = (source: string) => {
    switch (source) {
      case "funded": return "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300";
      case "approved": return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300";
      case "application": return "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300";
      case "statements": return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300";
      case "declined": return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  // Stats
  const withPhone = selectedMerchants.filter((m) => m.phone).length;
  const withoutPhone = selectedMerchants.length - withPhone;

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
            This page is only accessible to administrators.
          </p>
          <Button onClick={() => setLocation("/dashboard")}>Return to Dashboard</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/dashboard")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Messaging Center</h1>
            <p className="text-muted-foreground">
              Send emails and SMS to merchants across all sections
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT: Merchant List */}
          <div className="lg:col-span-2 space-y-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  data-testid="input-search-merchants"
                  placeholder="Search by name, email, phone, or rep..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger data-testid="select-source-filter" className="w-full sm:w-48">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filter by source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="application">Applications</SelectItem>
                  <SelectItem value="statements">Statements</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="funded">Funded</SelectItem>
                  <SelectItem value="declined">Declined</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Select All + Count */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Checkbox
                  data-testid="checkbox-select-all"
                  checked={allVisibleSelected && filteredMerchants.length > 0}
                  onCheckedChange={toggleSelectAll}
                  id="select-all"
                />
                <Label htmlFor="select-all" className="text-sm cursor-pointer">
                  Select all ({filteredMerchants.length})
                </Label>
              </div>
              {selectedEmails.size > 0 && (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {selectedEmails.size} selected
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedEmails(new Set())}
                    className="text-xs text-muted-foreground"
                  >
                    <X className="w-3 h-3 mr-1" />
                    Clear
                  </Button>
                </div>
              )}
            </div>

            {/* Merchant List */}
            <Card>
              <div className="max-h-[600px] overflow-y-auto divide-y">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredMerchants.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    {searchQuery || sourceFilter !== "all"
                      ? "No merchants match your filters"
                      : "No merchants found"}
                  </div>
                ) : (
                  filteredMerchants.map((merchant) => {
                    const isSelected = selectedEmails.has(merchant.email.toLowerCase());
                    return (
                      <div
                        key={merchant.email}
                        className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors ${
                          isSelected ? "bg-primary/5" : ""
                        }`}
                        onClick={() => toggleSelect(merchant.email)}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelect(merchant.email)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm truncate">
                              {merchant.businessName || merchant.email}
                            </span>
                            {merchant.assignedRep && (
                              <Badge variant="outline" className="text-xs flex-shrink-0">
                                {merchant.assignedRep}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                            <span className="truncate">{merchant.email}</span>
                            {merchant.phone && (
                              <span className="flex items-center gap-1 flex-shrink-0">
                                <Phone className="w-3 h-3" />
                                {merchant.phone}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1 flex-shrink-0 flex-wrap justify-end">
                          {merchant.sources.map((src) => (
                            <Badge
                              key={src}
                              className={`text-[10px] px-1.5 py-0 ${getSourceBadgeColor(src)}`}
                            >
                              {src}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>
          </div>

          {/* RIGHT: Compose Panel */}
          <div className="space-y-4">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <h2 className="font-semibold flex items-center gap-2">
                  <Send className="w-4 h-4" />
                  Compose Message
                </h2>

                {/* Channel */}
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Send via</Label>
                  <div className="flex gap-2">
                    <Button
                      data-testid="button-channel-email"
                      variant={channel === "email" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setChannel("email")}
                      className="flex-1"
                    >
                      <Mail className="w-3 h-3 mr-1" />
                      Email
                    </Button>
                    <Button
                      data-testid="button-channel-sms"
                      variant={channel === "sms" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setChannel("sms")}
                      className="flex-1"
                    >
                      <MessageSquare className="w-3 h-3 mr-1" />
                      SMS
                    </Button>
                    <Button
                      data-testid="button-channel-both"
                      variant={channel === "both" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setChannel("both")}
                      className="flex-1"
                    >
                      Both
                    </Button>
                  </div>
                </div>

                {/* Subject (email only) */}
                {(channel === "email" || channel === "both") && (
                  <div>
                    <Label htmlFor="msg-subject" className="text-xs text-muted-foreground">
                      Subject
                    </Label>
                    <Input
                      id="msg-subject"
                      data-testid="input-message-subject"
                      placeholder="Email subject line..."
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                    />
                  </div>
                )}

                {/* Message */}
                <div>
                  <Label htmlFor="msg-body" className="text-xs text-muted-foreground">
                    Message
                  </Label>
                  <Textarea
                    id="msg-body"
                    data-testid="textarea-message-body"
                    placeholder={
                      channel === "sms"
                        ? "Type your SMS message (160 chars recommended)..."
                        : "Type your message..."
                    }
                    rows={6}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    maxLength={5000}
                  />
                  <div className="text-xs text-muted-foreground text-right mt-1">
                    {message.length}/5000
                  </div>
                </div>

                {/* Recipients summary */}
                {selectedEmails.size > 0 && (
                  <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-1">
                    <div className="flex items-center gap-2 font-medium">
                      <Users className="w-4 h-4" />
                      {selectedEmails.size} recipient{selectedEmails.size !== 1 ? "s" : ""}
                    </div>
                    {(channel === "sms" || channel === "both") && (
                      <div className="text-xs text-muted-foreground">
                        <span className="text-green-600 dark:text-green-400">
                          {withPhone} with phone
                        </span>
                        {withoutPhone > 0 && (
                          <span className="text-amber-600 dark:text-amber-400 ml-2">
                            {withoutPhone} missing phone (SMS will be skipped)
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Send button */}
                <Button
                  data-testid="button-send-message"
                  className="w-full"
                  onClick={handleSend}
                  disabled={
                    sendMutation.isPending ||
                    selectedEmails.size === 0 ||
                    !message.trim()
                  }
                >
                  {sendMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send to {selectedEmails.size} merchant{selectedEmails.size !== 1 ? "s" : ""}
                    </>
                  )}
                </Button>

                {/* Last send results */}
                {sendMutation.isSuccess && sendMutation.data && (
                  <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3 text-sm space-y-1">
                    <div className="font-medium text-green-800 dark:text-green-300 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      Messages sent
                    </div>
                    {sendMutation.data.emailsSent > 0 && (
                      <div className="text-green-700 dark:text-green-400 text-xs">
                        {sendMutation.data.emailsSent} email{sendMutation.data.emailsSent !== 1 ? "s" : ""} delivered
                      </div>
                    )}
                    {sendMutation.data.smsSent > 0 && (
                      <div className="text-green-700 dark:text-green-400 text-xs">
                        {sendMutation.data.smsSent} SMS delivered
                      </div>
                    )}
                    {sendMutation.data.failures > 0 && (
                      <div className="text-amber-700 dark:text-amber-400 text-xs">
                        {sendMutation.data.failures} failed
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
