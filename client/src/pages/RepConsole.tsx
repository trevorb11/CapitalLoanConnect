import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useRoute, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  User,
  Building2,
  Phone,
  Mail,
  Tag,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  MessageSquare,
  FileText,
  ListTodo,
  DollarSign,
  Calendar,
  ArrowLeft,
  Search,
  RefreshCw,
  Loader2,
  Lock,
  LogOut,
  ExternalLink,
  Send,
  MessageCircle,
  Inbox,
  Banknote,
  Timer,
  TrendingUp,
  Activity,
  ChevronLeft,
  ChevronRight,
  Flame,
  PhoneCall,
  FileWarning,
  FileX,
  UserPlus,
  List,
  Plus,
  StickyNote,
  Pencil,
  Save,
  X,
  Reply,
  Star,
  Trophy,
  PhoneOff,
  Copy,
  FileCheck,
  Target,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import type {
  Contact360,
  RepConsoleContact,
  RepConsoleOpportunity,
  RepConsoleTask,
  RepConsoleNote,
  RepConsoleConversation,
  RepConsoleLenderApproval,
  ApprovalStatus,
} from "@shared/repConsoleTypes";

// ========================================
// AUTH STATE & LOGIN
// ========================================
interface AuthState {
  isAuthenticated: boolean;
  role?: "admin" | "agent";
  agentEmail?: string;
  agentName?: string;
}

function LoginForm({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  const [credential, setCredential] = useState("");
  const [error, setError] = useState("");

  const loginMutation = useMutation({
    mutationFn: async (cred: string) => {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: cred }),
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
      setError(err.message || "Invalid credentials");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    loginMutation.mutate(credential);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#192F56] to-[#19112D] p-4">
      <Card className="w-full max-w-md p-8 bg-card/95 backdrop-blur">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Rep Console</h1>
          <p className="text-muted-foreground text-sm">
            Enter your credentials to access the rep console
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Password or Agent Email
            </label>
            <Input
              type="password"
              value={credential}
              onChange={(e) => setCredential(e.target.value)}
              placeholder="Enter password or email..."
              className="w-full"
              autoComplete="off"
            />
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={!credential || loginMutation.isPending}
          >
            {loginMutation.isPending ? "Logging in..." : "Login"}
          </Button>
        </form>
      </Card>
    </div>
  );
}

// ========================================
// HELPER FUNCTIONS
// ========================================
function getApprovalStatusColor(status: ApprovalStatus): string {
  switch (status) {
    case "Approved":
    case "Funded":
      return "bg-emerald-500";
    case "Counter":
      return "bg-amber-500";
    case "Declined":
    case "Expired":
      return "bg-red-500";
    case "Pending":
    case "Submitted":
      return "bg-blue-500";
    default:
      return "bg-gray-500";
  }
}

function getApprovalStatusVariant(status: ApprovalStatus): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "Approved":
    case "Funded":
      return "default";
    case "Counter":
    case "Pending":
    case "Submitted":
      return "secondary";
    case "Declined":
    case "Expired":
      return "destructive";
    default:
      return "outline";
  }
}

function formatCurrency(value: number | null): string {
  if (value === null) return "N/A";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(dateString: string | null): string {
  if (!dateString) return "N/A";
  try {
    return format(new Date(dateString), "MMM d, yyyy");
  } catch {
    return dateString;
  }
}

function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return "N/A";
  try {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  } catch {
    return dateString;
  }
}

// ========================================
// SMS TEMPLATES
// ========================================
const SMS_TEMPLATES = [
  { label: "Follow-up", text: "Hi {name}, just following up on your application. Do you have a few minutes to chat today?" },
  { label: "Docs Needed", text: "Hi {name}, we're missing some documents to move forward. Can you send your latest bank statements?" },
  { label: "Approval Ready", text: "Great news {name}! We have an approval ready for you. When's a good time to discuss the terms?" },
  { label: "Quick Check-in", text: "Hi {name}, just checking in to see how things are going. Let me know if you have any questions!" },
];

const EMAIL_TEMPLATES = [
  { label: "Follow-up", subject: "Following Up on Your Application", body: "Hi {name},\n\nI wanted to follow up on your recent application. Please let me know if you have any questions or if there's anything I can help with.\n\nBest regards" },
  { label: "Approval", subject: "Great News - You're Approved!", body: "Hi {name},\n\nI'm excited to let you know that we have an approval for you! Please review the attached terms and let me know when you'd like to discuss.\n\nBest regards" },
  { label: "Docs Request", subject: "Additional Documents Needed", body: "Hi {name},\n\nTo continue processing your application, we need the following documents:\n- Last 3 months bank statements\n- Photo ID\n\nPlease send these at your earliest convenience.\n\nBest regards" },
];

// ========================================
// CONTACT HEADER CARD (with SMS/Email modals, tag management, and inline editing)
// ========================================
function ContactHeader({
  contact,
  computed,
  contactId,
  onRefresh,
}: {
  contact: RepConsoleContact;
  computed: Contact360["computed"];
  contactId: string;
  onRefresh: () => void;
}) {
  const { toast } = useToast();
  const [smsOpen, setSmsOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [smsMessage, setSmsMessage] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");

  // Inline editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: contact.firstName,
    lastName: contact.lastName,
    email: contact.email,
    phone: contact.phone,
    companyName: contact.companyName,
  });

  // Add tag state
  const [newTag, setNewTag] = useState("");
  const [showAddTag, setShowAddTag] = useState(false);

  // Call log state
  const [callLogOpen, setCallLogOpen] = useState(false);
  const [callNotes, setCallNotes] = useState("");
  const [callOutcome, setCallOutcome] = useState<"answered" | "voicemail" | "no-answer" | "busy">("answered");

  // Send SMS mutation
  const sendSmsMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await fetch(`/api/rep-console/${contactId}/sms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to send SMS");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "SMS sent", description: "Your message has been sent." });
      setSmsMessage("");
      setSmsOpen(false);
      onRefresh();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Send Email mutation
  const sendEmailMutation = useMutation({
    mutationFn: async ({ subject, body }: { subject: string; body: string }) => {
      const res = await fetch(`/api/rep-console/${contactId}/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ subject, body }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to send email");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Email sent", description: "Your email has been sent." });
      setEmailSubject("");
      setEmailBody("");
      setEmailOpen(false);
      onRefresh();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Remove tag mutation
  const removeTagMutation = useMutation({
    mutationFn: async (tag: string) => {
      const res = await fetch(`/api/rep-console/${contactId}/tags/${encodeURIComponent(tag)}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to remove tag");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Tag removed" });
      onRefresh();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Add tag mutation
  const addTagMutation = useMutation({
    mutationFn: async (tag: string) => {
      const res = await fetch(`/api/rep-console/${contactId}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ tag }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add tag");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Tag added" });
      setNewTag("");
      setShowAddTag(false);
      onRefresh();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Update contact mutation
  const updateContactMutation = useMutation({
    mutationFn: async (updates: typeof editForm) => {
      const res = await fetch(`/api/rep-console/${contactId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update contact");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Contact updated" });
      setIsEditing(false);
      onRefresh();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Log call mutation (adds a note with call details)
  const logCallMutation = useMutation({
    mutationFn: async ({ outcome, notes }: { outcome: string; notes: string }) => {
      const callLog = `📞 Call Log - ${outcome.toUpperCase()}\n${notes ? `Notes: ${notes}` : "No notes"}`;
      const res = await fetch(`/api/rep-console/${contactId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ body: callLog }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to log call");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Call logged" });
      setCallNotes("");
      setCallOutcome("answered");
      setCallLogOpen(false);
      onRefresh();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Helper to copy to clipboard
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copied` });
  };

  // Apply template with name replacement
  const applyTemplate = (template: { text?: string; subject?: string; body?: string }, type: "sms" | "email") => {
    const name = contact.firstName || contact.name.split(" ")[0] || "there";
    if (type === "sms" && template.text) {
      setSmsMessage(template.text.replace("{name}", name));
    } else if (type === "email" && template.subject && template.body) {
      setEmailSubject(template.subject);
      setEmailBody(template.body.replace("{name}", name));
    }
  };

  return (
    <Card className="border-l-4 border-l-primary">
      <CardContent className="pt-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          {/* Left: Contact Info */}
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <User className="w-7 h-7 text-primary" />
            </div>
            <div className="flex-1">
              {isEditing ? (
                /* Edit Mode */
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      placeholder="First name"
                      value={editForm.firstName}
                      onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                      className="h-8"
                    />
                    <Input
                      placeholder="Last name"
                      value={editForm.lastName}
                      onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                      className="h-8"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <Input
                      placeholder="Company name"
                      value={editForm.companyName}
                      onChange={(e) => setEditForm({ ...editForm, companyName: e.target.value })}
                      className="h-8"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <Input
                      placeholder="Phone"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      className="h-8"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <Input
                      placeholder="Email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      className="h-8"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => updateContactMutation.mutate(editForm)}
                      disabled={updateContactMutation.isPending}
                    >
                      {updateContactMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setIsEditing(false);
                        setEditForm({
                          firstName: contact.firstName,
                          lastName: contact.lastName,
                          email: contact.email,
                          phone: contact.phone,
                          companyName: contact.companyName,
                        });
                      }}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                /* View Mode */
                <>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold">{contact.name}</h1>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="p-1 hover:bg-muted rounded-md transition-colors"
                      title="Edit contact"
                    >
                      <Pencil className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                    </button>
                  </div>
                  {contact.companyName && (
                    <div className="flex items-center gap-2 text-muted-foreground mt-1">
                      <Building2 className="w-4 h-4" />
                      <span>{contact.companyName}</span>
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-4 mt-3">
                    {contact.phone && (
                      <div className="flex items-center gap-1">
                        <a
                          href={`tel:${contact.phone}`}
                          className="flex items-center gap-1 text-sm hover:text-primary transition-colors"
                        >
                          <Phone className="w-4 h-4" />
                          {contact.phone}
                        </a>
                        <button
                          onClick={() => copyToClipboard(contact.phone, "Phone")}
                          className="p-0.5 hover:bg-muted rounded transition-colors"
                          title="Copy phone"
                        >
                          <Copy className="w-3 h-3 text-muted-foreground" />
                        </button>
                      </div>
                    )}
                    {contact.email && (
                      <div className="flex items-center gap-1">
                        <a
                          href={`mailto:${contact.email}`}
                          className="flex items-center gap-1 text-sm hover:text-primary transition-colors"
                        >
                          <Mail className="w-4 h-4" />
                          {contact.email}
                        </a>
                        <button
                          onClick={() => copyToClipboard(contact.email, "Email")}
                          className="p-0.5 hover:bg-muted rounded transition-colors"
                          title="Copy email"
                        >
                          <Copy className="w-3 h-3 text-muted-foreground" />
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Quick Action Buttons */}
              <div className="flex flex-wrap gap-2 mt-4">
                {contact.phone && (
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="gap-1"
                  >
                    <a href={`tel:${contact.phone}`}>
                      <Phone className="w-4 h-4" />
                      Call
                    </a>
                  </Button>
                )}
                {/* Log Call Dialog */}
                {contact.phone && (
                  <Dialog open={callLogOpen} onOpenChange={setCallLogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-1">
                        <FileCheck className="w-4 h-4" />
                        Log Call
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Log Call with {contact.name}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Call Outcome</Label>
                          <div className="flex flex-wrap gap-2">
                            {(["answered", "voicemail", "no-answer", "busy"] as const).map((outcome) => (
                              <Button
                                key={outcome}
                                type="button"
                                variant={callOutcome === outcome ? "default" : "outline"}
                                size="sm"
                                onClick={() => setCallOutcome(outcome)}
                                className="capitalize"
                              >
                                {outcome === "no-answer" ? "No Answer" : outcome}
                              </Button>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Notes (optional)</Label>
                          <Textarea
                            placeholder="What was discussed..."
                            value={callNotes}
                            onChange={(e) => setCallNotes(e.target.value)}
                            className="min-h-[100px]"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setCallLogOpen(false)}>Cancel</Button>
                        <Button
                          onClick={() => logCallMutation.mutate({ outcome: callOutcome, notes: callNotes })}
                          disabled={logCallMutation.isPending}
                        >
                          {logCallMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileCheck className="w-4 h-4 mr-2" />}
                          Log Call
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
                {/* SMS Dialog with Templates */}
                {contact.phone && (
                  <Dialog open={smsOpen} onOpenChange={setSmsOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-1">
                        <MessageSquare className="w-4 h-4" />
                        Send SMS
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Send SMS to {contact.name}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="text-sm text-muted-foreground">
                          To: {contact.phone}
                        </div>
                        {/* SMS Templates */}
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Quick Templates</Label>
                          <div className="flex flex-wrap gap-1">
                            {SMS_TEMPLATES.map((template) => (
                              <Button
                                key={template.label}
                                type="button"
                                variant="outline"
                                size="sm"
                                className="text-xs h-7"
                                onClick={() => applyTemplate(template, "sms")}
                              >
                                {template.label}
                              </Button>
                            ))}
                          </div>
                        </div>
                        <Textarea
                          placeholder="Type your message..."
                          value={smsMessage}
                          onChange={(e) => setSmsMessage(e.target.value)}
                          className="min-h-[120px]"
                        />
                        <div className="text-xs text-muted-foreground text-right">
                          {smsMessage.length} characters
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setSmsOpen(false)}>Cancel</Button>
                        <Button
                          onClick={() => sendSmsMutation.mutate(smsMessage)}
                          disabled={!smsMessage.trim() || sendSmsMutation.isPending}
                        >
                          {sendSmsMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                          Send
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
                {/* Email Dialog with Templates */}
                {contact.email && (
                  <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-1">
                        <Mail className="w-4 h-4" />
                        Send Email
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                      <DialogHeader>
                        <DialogTitle>Send Email to {contact.name}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="text-sm text-muted-foreground">
                          To: {contact.email}
                        </div>
                        {/* Email Templates */}
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Quick Templates</Label>
                          <div className="flex flex-wrap gap-1">
                            {EMAIL_TEMPLATES.map((template) => (
                              <Button
                                key={template.label}
                                type="button"
                                variant="outline"
                                size="sm"
                                className="text-xs h-7"
                                onClick={() => applyTemplate(template, "email")}
                              >
                                {template.label}
                              </Button>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Subject</Label>
                          <Input
                            placeholder="Email subject..."
                            value={emailSubject}
                            onChange={(e) => setEmailSubject(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Message</Label>
                          <Textarea
                            placeholder="Type your message..."
                            value={emailBody}
                            onChange={(e) => setEmailBody(e.target.value)}
                            className="min-h-[150px]"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setEmailOpen(false)}>Cancel</Button>
                        <Button
                          onClick={() => sendEmailMutation.mutate({ subject: emailSubject, body: emailBody })}
                          disabled={!emailSubject.trim() || !emailBody.trim() || sendEmailMutation.isPending}
                        >
                          {sendEmailMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                          Send
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </div>
          </div>

          {/* Right: Status Indicators */}
          <div className="flex flex-col gap-3">
            {/* Last Touch */}
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Last touch:</span>
              <span className={computed.daysSinceLastTouch && computed.daysSinceLastTouch > 7 ? "text-amber-500 font-medium" : ""}>
                {computed.lastTouchDate
                  ? formatRelativeTime(computed.lastTouchDate)
                  : "No activity"}
              </span>
            </div>

            {/* Overdue Warning */}
            {computed.isOverdue && (
              <div className="flex items-center gap-2 text-sm text-red-500">
                <AlertTriangle className="w-4 h-4" />
                <span>
                  Follow-up overdue by {computed.overdueByDays}{" "}
                  {computed.overdueByDays === 1 ? "day" : "days"}
                </span>
              </div>
            )}

            {/* Unread Messages */}
            {computed.hasUnreadMessages && (
              <div className="flex items-center gap-2 text-sm text-blue-500">
                <Inbox className="w-4 h-4" />
                <span>{computed.totalUnreadCount} unread message(s)</span>
              </div>
            )}
          </div>
        </div>

        {/* Tags with add/remove functionality */}
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t">
          {contact.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="flex items-center gap-1 pr-1">
              <Tag className="w-3 h-3" />
              {tag}
              <button
                onClick={() => removeTagMutation.mutate(tag)}
                disabled={removeTagMutation.isPending}
                className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                title="Remove tag"
              >
                <XCircle className="w-3 h-3 text-muted-foreground hover:text-destructive" />
              </button>
            </Badge>
          ))}
          {/* Add Tag */}
          {showAddTag ? (
            <div className="flex items-center gap-1">
              <Input
                placeholder="New tag..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newTag.trim()) {
                    addTagMutation.mutate(newTag.trim());
                  } else if (e.key === "Escape") {
                    setShowAddTag(false);
                    setNewTag("");
                  }
                }}
                className="h-7 w-32 text-sm"
                autoFocus
              />
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={() => {
                  if (newTag.trim()) {
                    addTagMutation.mutate(newTag.trim());
                  }
                }}
                disabled={!newTag.trim() || addTagMutation.isPending}
              >
                {addTagMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={() => {
                  setShowAddTag(false);
                  setNewTag("");
                }}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-xs gap-1"
              onClick={() => setShowAddTag(true)}
            >
              <Plus className="w-3 h-3" />
              Add Tag
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ========================================
// ACTIVE DEAL CARD (with pipeline stage selector and status buttons)
// ========================================
interface PipelineStage {
  id: string;
  name: string;
}

interface Pipeline {
  id: string;
  name: string;
  stages: PipelineStage[];
}

function ActiveDealCard({
  opportunity,
  onRefresh
}: {
  opportunity: RepConsoleOpportunity | null;
  onRefresh: () => void;
}) {
  const { toast } = useToast();
  const [selectedStage, setSelectedStage] = useState<string>("");

  // Inline editing state
  const [isEditingValue, setIsEditingValue] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [isEditingNextAction, setIsEditingNextAction] = useState(false);
  const [editNextAction, setEditNextAction] = useState("");
  const [editNextActionDue, setEditNextActionDue] = useState("");

  // Fetch pipelines for stage dropdown
  const pipelinesQuery = useQuery<{ success: boolean; data: { pipelines: Pipeline[] } }>({
    queryKey: ["/api/rep-console/pipelines"],
    queryFn: async () => {
      const res = await fetch("/api/rep-console/pipelines", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch pipelines");
      return res.json();
    },
    enabled: !!opportunity,
  });

  // Get stages for the current opportunity's pipeline
  const currentPipeline = pipelinesQuery.data?.data?.pipelines?.find(
    (p) => p.id === opportunity?.pipelineId
  );
  const stages = currentPipeline?.stages || [];

  // Update stage mutation
  const updateStageMutation = useMutation({
    mutationFn: async (stageId: string) => {
      const res = await fetch(`/api/rep-console/opportunities/${opportunity?.id}/stage`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ pipelineStageId: stageId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update stage");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Stage updated" });
      onRefresh();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Update status mutation (won/lost/abandoned)
  const updateStatusMutation = useMutation({
    mutationFn: async (status: "won" | "lost" | "abandoned" | "open") => {
      const res = await fetch(`/api/rep-console/opportunities/${opportunity?.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update status");
      }
      return res.json();
    },
    onSuccess: (_, status) => {
      toast({ title: `Deal marked as ${status}` });
      onRefresh();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Update value mutation
  const updateValueMutation = useMutation({
    mutationFn: async (value: number) => {
      const res = await fetch(`/api/rep-console/opportunities/${opportunity?.id}/value`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ monetaryValue: value }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update value");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Deal value updated" });
      setIsEditingValue(false);
      onRefresh();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Update next action mutation (uses custom fields update)
  const updateNextActionMutation = useMutation({
    mutationFn: async ({ action, dueDate }: { action: string; dueDate: string }) => {
      const res = await fetch(`/api/rep-console/opportunities/${opportunity?.id}/next-action`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ nextAction: action, nextActionDue: dueDate }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update next action");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Next action updated" });
      setIsEditingNextAction(false);
      onRefresh();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Handle stage change
  const handleStageChange = (stageId: string) => {
    setSelectedStage(stageId);
    if (stageId && stageId !== opportunity?.stageId) {
      updateStageMutation.mutate(stageId);
    }
  };

  // Handle value save
  const handleValueSave = () => {
    const numValue = parseFloat(editValue.replace(/[$,]/g, ""));
    if (!isNaN(numValue) && numValue >= 0) {
      updateValueMutation.mutate(numValue);
    } else {
      toast({ title: "Invalid value", description: "Please enter a valid number", variant: "destructive" });
    }
  };

  // Handle next action save
  const handleNextActionSave = () => {
    updateNextActionMutation.mutate({ action: editNextAction, dueDate: editNextActionDue });
  };

  if (!opportunity) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Active Deal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <DollarSign className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>No active deal found</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Active Deal
          </div>
          <Badge variant={getApprovalStatusVariant(opportunity.approvalStatus)}>
            {opportunity.approvalStatus}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Pipeline & Stage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Pipeline</span>
            <span className="font-medium">{opportunity.pipelineName}</span>
          </div>

          {/* Stage Selector */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Stage</span>
            {stages.length > 0 ? (
              <select
                value={selectedStage || opportunity.stageId || ""}
                onChange={(e) => handleStageChange(e.target.value)}
                disabled={updateStageMutation.isPending}
                className="text-sm border rounded px-2 py-1 bg-background"
              >
                {stages.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.name}
                  </option>
                ))}
              </select>
            ) : (
              <Badge variant="outline">{opportunity.stageName}</Badge>
            )}
          </div>

          {/* Editable Deal Value */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Value</span>
            {isEditingValue ? (
              <div className="flex items-center gap-1">
                <Input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleValueSave();
                    if (e.key === "Escape") setIsEditingValue(false);
                  }}
                  className="h-7 w-28 text-sm text-right"
                  placeholder="$0.00"
                  autoFocus
                />
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0"
                  onClick={handleValueSave}
                  disabled={updateValueMutation.isPending}
                >
                  {updateValueMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0"
                  onClick={() => setIsEditingValue(false)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setEditValue(opportunity.monetaryValue?.toString() || "");
                  setIsEditingValue(true);
                }}
                className="font-bold text-primary hover:underline flex items-center gap-1"
                title="Click to edit"
              >
                {opportunity.monetaryValue ? formatCurrency(opportunity.monetaryValue) : "Set value"}
                <Pencil className="w-3 h-3 opacity-50" />
              </button>
            )}
          </div>
        </div>

        <Separator />

        {/* Deal Status Actions */}
        <div className="space-y-2">
          <div className="text-sm font-medium">Deal Status</div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={opportunity.status === "won" ? "default" : "outline"}
              size="sm"
              onClick={() => updateStatusMutation.mutate("won")}
              disabled={updateStatusMutation.isPending || opportunity.status === "won"}
              className={opportunity.status === "won" ? "bg-emerald-600 hover:bg-emerald-700" : ""}
            >
              <CheckCircle2 className="w-4 h-4 mr-1" />
              Won
            </Button>
            <Button
              variant={opportunity.status === "lost" ? "default" : "outline"}
              size="sm"
              onClick={() => updateStatusMutation.mutate("lost")}
              disabled={updateStatusMutation.isPending || opportunity.status === "lost"}
              className={opportunity.status === "lost" ? "bg-red-600 hover:bg-red-700" : ""}
            >
              <XCircle className="w-4 h-4 mr-1" />
              Lost
            </Button>
            <Button
              variant={opportunity.status === "abandoned" ? "default" : "outline"}
              size="sm"
              onClick={() => updateStatusMutation.mutate("abandoned")}
              disabled={updateStatusMutation.isPending || opportunity.status === "abandoned"}
              className={opportunity.status === "abandoned" ? "bg-gray-600 hover:bg-gray-700" : ""}
            >
              <AlertTriangle className="w-4 h-4 mr-1" />
              Abandoned
            </Button>
            {(opportunity.status === "won" || opportunity.status === "lost" || opportunity.status === "abandoned") && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateStatusMutation.mutate("open")}
                disabled={updateStatusMutation.isPending}
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Reopen
              </Button>
            )}
          </div>
        </div>

        <Separator />

        {/* Lender & Terms */}
        {(opportunity.lenderName || opportunity.offerTerms.payback) && (
          <>
            <div className="space-y-2">
              {opportunity.lenderName && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Lender</span>
                  <span className="font-medium">{opportunity.lenderName}</span>
                </div>
              )}
              {opportunity.offerTerms.payback && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Payback</span>
                  <span>{formatCurrency(opportunity.offerTerms.payback)}</span>
                </div>
              )}
              {opportunity.offerTerms.payment && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Payment ({opportunity.offerTerms.frequency || "N/A"})
                  </span>
                  <span>{formatCurrency(opportunity.offerTerms.payment)}</span>
                </div>
              )}
              {opportunity.offerTerms.termDays && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Term</span>
                  <span>{opportunity.offerTerms.termDays} days</span>
                </div>
              )}
              {opportunity.offerTerms.expiresAt && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Expires</span>
                  <span className="text-amber-500">
                    {formatDate(opportunity.offerTerms.expiresAt)}
                  </span>
                </div>
              )}
            </div>
            <Separator />
          </>
        )}

        {/* Next Action - Editable */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Target className="w-4 h-4" />
              Next Action
            </div>
            {!isEditingNextAction && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs"
                onClick={() => {
                  setEditNextAction(opportunity.nextAction || "");
                  setEditNextActionDue(opportunity.nextActionDue || "");
                  setIsEditingNextAction(true);
                }}
              >
                <Pencil className="w-3 h-3 mr-1" />
                {opportunity.nextAction ? "Edit" : "Set"}
              </Button>
            )}
          </div>
          {isEditingNextAction ? (
            <div className="space-y-2 p-3 bg-muted rounded-lg">
              <Input
                placeholder="What's the next step?"
                value={editNextAction}
                onChange={(e) => setEditNextAction(e.target.value)}
                className="text-sm"
                autoFocus
              />
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">Due:</Label>
                <Input
                  type="date"
                  value={editNextActionDue ? editNextActionDue.split("T")[0] : ""}
                  onChange={(e) => setEditNextActionDue(e.target.value)}
                  className="text-sm flex-1"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleNextActionSave}
                  disabled={updateNextActionMutation.isPending}
                >
                  {updateNextActionMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditingNextAction(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : opportunity.nextAction ? (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm">{opportunity.nextAction}</p>
              {opportunity.nextActionDue && (
                <p className="text-xs text-muted-foreground mt-1">
                  Due: {formatDate(opportunity.nextActionDue)}
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">No next action set</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ========================================
// LENDER APPROVALS CARD (with best offer indicator and selection)
// ========================================
function LenderApprovalsCard({
  approvals,
  onRefresh
}: {
  approvals: RepConsoleLenderApproval[];
  onRefresh?: () => void;
}) {
  const { toast } = useToast();

  // Find the best offer (highest approved amount among approved offers)
  const approvedOffers = approvals.filter(a => a.status?.toLowerCase() === "approved" || a.status?.toLowerCase() === "accepted");
  const bestOffer = approvedOffers.length > 0
    ? approvedOffers.reduce((best, curr) =>
        (curr.approvedAmount || 0) > (best.approvedAmount || 0) ? curr : best
      )
    : null;

  // Calculate factor rate if we have amounts
  const calculateFactor = (approved: number | null, payback: number | null) => {
    if (!approved || !payback || approved === 0) return null;
    return (payback / approved).toFixed(2);
  };

  if (approvals.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Banknote className="w-5 h-5" />
            Lender Approvals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <Banknote className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>No lender approvals found</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Sort: Approved offers first (by amount desc), then others
  const sortedApprovals = [...approvals].sort((a, b) => {
    const aApproved = a.status?.toLowerCase() === "approved" || a.status?.toLowerCase() === "accepted";
    const bApproved = b.status?.toLowerCase() === "approved" || b.status?.toLowerCase() === "accepted";
    if (aApproved && !bApproved) return -1;
    if (!aApproved && bApproved) return 1;
    return (b.approvedAmount || 0) - (a.approvedAmount || 0);
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Banknote className="w-5 h-5" />
          Lender Approvals
          <Badge variant="secondary">{approvals.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Best Offer Summary */}
        {bestOffer && (
          <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Best Offer</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-700 dark:text-emerald-400">{bestOffer.lenderName}</span>
              <span className="font-bold text-lg text-emerald-700 dark:text-emerald-400">
                {formatCurrency(bestOffer.approvedAmount || 0)}
              </span>
            </div>
            {bestOffer.paybackAmount && (
              <div className="text-xs text-emerald-600 dark:text-emerald-500 mt-1">
                Payback: {formatCurrency(bestOffer.paybackAmount)} | Factor: {calculateFactor(bestOffer.approvedAmount, bestOffer.paybackAmount)}x
              </div>
            )}
          </div>
        )}

        <ScrollArea className="h-[250px]">
          <div className="space-y-3">
            {sortedApprovals.map((approval) => {
              const isApproved = approval.status?.toLowerCase() === "approved" || approval.status?.toLowerCase() === "accepted";
              const isBest = bestOffer?.id === approval.id;
              const isDeclined = approval.status?.toLowerCase() === "declined" || approval.status?.toLowerCase() === "denied";

              return (
                <div
                  key={approval.id}
                  className={`p-3 border rounded-lg transition-colors ${
                    isBest
                      ? "border-emerald-300 bg-emerald-50/50 dark:border-emerald-700 dark:bg-emerald-950/20"
                      : isDeclined
                      ? "border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20"
                      : isApproved
                      ? "hover:bg-muted/50"
                      : "opacity-60"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {isBest && <Star className="w-4 h-4 text-amber-500 fill-amber-500" />}
                      <span className="font-medium">{approval.lenderName}</span>
                    </div>
                    <Badge
                      variant={isApproved ? "default" : isDeclined ? "destructive" : "secondary"}
                      className={isApproved ? "bg-emerald-600" : ""}
                    >
                      {approval.status}
                    </Badge>
                  </div>

                  {/* Approval Details */}
                  <div className="grid grid-cols-2 gap-1 text-sm">
                    {approval.approvedAmount && (
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">Amount:</span>
                        <span className="font-medium">{formatCurrency(approval.approvedAmount)}</span>
                      </div>
                    )}
                    {approval.paybackAmount && (
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">Payback:</span>
                        <span>{formatCurrency(approval.paybackAmount)}</span>
                      </div>
                    )}
                    {approval.paymentAmount && (
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">Payment:</span>
                        <span>
                          {formatCurrency(approval.paymentAmount)}
                          {approval.paymentFrequency && <span className="text-xs text-muted-foreground ml-1">/{approval.paymentFrequency}</span>}
                        </span>
                      </div>
                    )}
                    {approval.factorRate && (
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">Factor:</span>
                        <span>{approval.factorRate}x</span>
                      </div>
                    )}
                    {approval.termLength && (
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">Term:</span>
                        <span>{approval.termLength}</span>
                      </div>
                    )}
                    {approval.productType && (
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">Type:</span>
                        <span>{approval.productType}</span>
                      </div>
                    )}
                  </div>

                  {/* Conditions if any */}
                  {approval.conditions && (
                    <div className="mt-2 text-xs text-amber-600 dark:text-amber-400 p-2 bg-amber-50 dark:bg-amber-950/30 rounded">
                      <span className="font-medium">Conditions:</span> {approval.conditions}
                    </div>
                  )}

                  {/* Timestamp */}
                  <div className="flex items-center justify-between mt-2">
                    {approval.createdAt && (
                      <p className="text-xs text-muted-foreground">
                        {formatRelativeTime(approval.createdAt)}
                      </p>
                    )}
                    {approval.expirationDate && (
                      <p className="text-xs text-amber-600">
                        Expires: {formatDate(approval.expirationDate)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// ========================================
// TASKS CARD (with completion toggle)
// ========================================
function TasksCard({
  tasks,
  contactId,
  onRefresh
}: {
  tasks: RepConsoleTask[];
  contactId: string;
  onRefresh: () => void;
}) {
  const { toast } = useToast();
  const pendingTasks = tasks.filter((t) => !t.isCompleted);
  const completedTasks = tasks.filter((t) => t.isCompleted);

  const toggleTaskMutation = useMutation({
    mutationFn: async ({ taskId, completed }: { taskId: string; completed: boolean }) => {
      const res = await fetch(`/api/rep-console/${contactId}/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ completed }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update task");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Task updated" });
      onRefresh();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const res = await fetch(`/api/rep-console/${contactId}/tasks/${taskId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete task");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Task deleted" });
      onRefresh();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ListTodo className="w-5 h-5" />
          Follow-ups
          {pendingTasks.length > 0 && (
            <Badge variant="default">{pendingTasks.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <ListTodo className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>No tasks found</p>
          </div>
        ) : (
          <ScrollArea className="h-[300px]">
            <div className="space-y-3">
              {/* Pending Tasks First */}
              {pendingTasks.map((task) => (
                <div
                  key={task.id}
                  className="p-3 border rounded-lg hover:bg-muted/50 transition-colors group"
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => toggleTaskMutation.mutate({ taskId: task.id, completed: true })}
                      disabled={toggleTaskMutation.isPending}
                      className="mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 border-amber-500 hover:bg-amber-100 transition-colors disabled:opacity-50"
                      title="Mark as complete"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{task.title}</p>
                      {task.body && (
                        <p className="text-sm text-muted-foreground mt-1 truncate">
                          {task.body}
                        </p>
                      )}
                      {task.dueDate && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Due: {formatDate(task.dueDate)}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => deleteTaskMutation.mutate(task.id)}
                      disabled={deleteTaskMutation.isPending}
                      className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive/80 transition-opacity"
                      title="Delete task"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Completed Tasks */}
              {completedTasks.length > 0 && (
                <>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider pt-2">
                    Completed
                  </div>
                  {completedTasks.slice(0, 5).map((task) => (
                    <div
                      key={task.id}
                      className="p-3 border rounded-lg opacity-60 group"
                    >
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => toggleTaskMutation.mutate({ taskId: task.id, completed: false })}
                          disabled={toggleTaskMutation.isPending}
                          className="mt-0.5 flex-shrink-0"
                          title="Mark as incomplete"
                        >
                          <CheckCircle2 className="w-5 h-5 text-emerald-500 hover:text-emerald-600" />
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className="line-through">{task.title}</p>
                        </div>
                        <button
                          onClick={() => deleteTaskMutation.mutate(task.id)}
                          disabled={deleteTaskMutation.isPending}
                          className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive/80 transition-opacity"
                          title="Delete task"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

// ========================================
// NOTES CARD (with edit/delete)
// ========================================
function NotesCard({
  notes,
  contactId,
  onRefresh
}: {
  notes: RepConsoleNote[];
  contactId: string;
  onRefresh: () => void;
}) {
  const { toast } = useToast();
  const [editingNote, setEditingNote] = useState<{ id: string; body: string } | null>(null);

  const updateNoteMutation = useMutation({
    mutationFn: async ({ noteId, body }: { noteId: string; body: string }) => {
      const res = await fetch(`/api/rep-console/${contactId}/notes/${noteId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ body }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update note");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Note updated" });
      setEditingNote(null);
      onRefresh();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      const res = await fetch(`/api/rep-console/${contactId}/notes/${noteId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete note");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Note deleted" });
      onRefresh();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Notes
          {notes.length > 0 && <Badge variant="secondary">{notes.length}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {notes.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>No notes found</p>
          </div>
        ) : (
          <ScrollArea className="h-[300px]">
            <div className="space-y-3">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className="p-3 border rounded-lg hover:bg-muted/50 transition-colors group"
                >
                  {editingNote?.id === note.id ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editingNote.body}
                        onChange={(e) => setEditingNote({ ...editingNote, body: e.target.value })}
                        className="text-sm min-h-[80px]"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => updateNoteMutation.mutate({ noteId: note.id, body: editingNote.body })}
                          disabled={updateNoteMutation.isPending}
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingNote(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm whitespace-pre-wrap flex-1">{note.body}</p>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setEditingNote({ id: note.id, body: note.body })}
                            className="text-muted-foreground hover:text-foreground"
                            title="Edit note"
                          >
                            <StickyNote className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteNoteMutation.mutate(note.id)}
                            disabled={deleteNoteMutation.isPending}
                            className="text-destructive hover:text-destructive/80"
                            title="Delete note"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        {note.userName && <span>By {note.userName}</span>}
                        {note.dateAdded && (
                          <span>{formatRelativeTime(note.dateAdded)}</span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

// ========================================
// CONVERSATIONS CARD
// ========================================
function ConversationsCard({
  conversations,
  contactId,
  onRefresh
}: {
  conversations: RepConsoleConversation[];
  contactId: string;
  onRefresh: () => void;
}) {
  const { toast } = useToast();
  const [selectedConv, setSelectedConv] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState("");

  const getMessageIcon = (type: string) => {
    switch (type) {
      case "sms":
        return <MessageSquare className="w-4 h-4" />;
      case "email":
        return <Mail className="w-4 h-4" />;
      case "call":
        return <Phone className="w-4 h-4" />;
      default:
        return <MessageCircle className="w-4 h-4" />;
    }
  };

  const selectedConversation = conversations.find((c) => c.id === selectedConv);

  // Quick reply mutation
  const replyMutation = useMutation({
    mutationFn: async (message: string) => {
      const type = selectedConversation?.type === "email" ? "email" : "sms";
      const endpoint = type === "email"
        ? `/api/rep-console/${contactId}/email`
        : `/api/rep-console/${contactId}/sms`;

      const body = type === "email"
        ? { subject: "Re: " + (selectedConversation?.lastMessageBody?.slice(0, 30) || "Your message"), body: message }
        : { message };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to send reply");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Reply sent" });
      setReplyMessage("");
      onRefresh();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Conversations
          {conversations.length > 0 && (
            <Badge variant="secondary">{conversations.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {conversations.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>No conversations found</p>
          </div>
        ) : selectedConversation ? (
          // Show messages for selected conversation
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedConv(null)}
              className="mb-3"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to list
            </Button>
            <ScrollArea className="h-[200px]">
              <div className="space-y-3">
                {selectedConversation.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-3 rounded-lg ${
                      msg.direction === "outbound"
                        ? "bg-primary/10 ml-4"
                        : "bg-muted mr-4"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {msg.direction === "outbound" ? (
                        <Send className="w-3 h-3 text-primary" />
                      ) : (
                        <Inbox className="w-3 h-3" />
                      )}
                      <span className="text-xs text-muted-foreground">
                        {msg.direction === "outbound" ? "Sent" : "Received"} -{" "}
                        {formatRelativeTime(msg.dateAdded)}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
            {/* Quick Reply */}
            <div className="mt-3 pt-3 border-t">
              <div className="flex gap-2">
                <Input
                  placeholder={`Quick reply via ${selectedConversation.type}...`}
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && replyMessage.trim()) {
                      replyMutation.mutate(replyMessage);
                    }
                  }}
                  className="flex-1"
                />
                <Button
                  size="sm"
                  onClick={() => replyMutation.mutate(replyMessage)}
                  disabled={!replyMessage.trim() || replyMutation.isPending}
                >
                  {replyMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Reply className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          // Show conversation list
          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConv(conv.id)}
                  className="w-full p-3 border rounded-lg hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      {getMessageIcon(conv.type)}
                      <span className="font-medium capitalize">{conv.type}</span>
                    </div>
                    {conv.unreadCount > 0 && (
                      <Badge variant="default">{conv.unreadCount}</Badge>
                    )}
                  </div>
                  {conv.lastMessageBody && (
                    <p className="text-sm text-muted-foreground truncate">
                      {conv.lastMessageBody}
                    </p>
                  )}
                  {conv.lastMessageDate && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatRelativeTime(conv.lastMessageDate)}
                    </p>
                  )}
                </button>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

// ========================================
// CONTACT SEARCH (Simple)
// ========================================
function ContactSearch({
  onSelectContact,
}: {
  onSelectContact: (contactId: string) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");

  const searchMutation = useMutation({
    mutationFn: async (query: string) => {
      const res = await fetch(`/api/rep-console/search?q=${encodeURIComponent(query)}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Search failed");
      return res.json();
    },
  });

  const handleSearch = () => {
    if (searchQuery.length < 2) return;
    searchMutation.mutate(searchQuery);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by email, phone, or business name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="pl-9"
            data-testid="input-contact-search"
          />
        </div>
        <Button onClick={handleSearch} disabled={searchQuery.length < 2 || searchMutation.isPending} data-testid="button-search">
          {searchMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            "Search"
          )}
        </Button>
      </div>

      {searchMutation.data?.data?.localMatch && (
        <Card
          className={`p-4 ${searchMutation.data.data.localMatch.ghlContactId ? 'hover:bg-muted/50 cursor-pointer' : ''}`}
          onClick={() => {
            if (searchMutation.data.data.localMatch.ghlContactId) {
              onSelectContact(searchMutation.data.data.localMatch.ghlContactId);
            }
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium">{searchMutation.data.data.localMatch.fullName || "Unknown"}</p>
              <p className="text-sm text-muted-foreground truncate">
                {searchMutation.data.data.localMatch.businessName || searchMutation.data.data.localMatch.email}
              </p>
              {searchMutation.data.data.localMatch.phone && (
                <p className="text-xs text-muted-foreground">
                  {searchMutation.data.data.localMatch.phone}
                </p>
              )}
            </div>
            {searchMutation.data.data.localMatch.ghlContactId ? (
              <div className="flex flex-col items-end gap-1">
                <Badge className="bg-emerald-500">GHL Connected</Badge>
                <span className="text-xs text-muted-foreground">Click to view</span>
              </div>
            ) : (
              <div className="flex flex-col items-end gap-1">
                <Badge variant="outline" className="text-amber-600 border-amber-300">Local Only</Badge>
                <span className="text-xs text-muted-foreground">Not synced to GHL</span>
              </div>
            )}
          </div>
          {!searchMutation.data.data.localMatch.ghlContactId && (
            <div className="mt-3 pt-3 border-t">
              <p className="text-xs text-muted-foreground">
                This contact exists in the local database but hasn't been synced to GoHighLevel yet.
                The Rep Console requires a GHL Contact ID to display full details.
              </p>
            </div>
          )}
        </Card>
      )}

      {searchMutation.data && !searchMutation.data.data?.localMatch && (
        <div className="text-center py-6 text-muted-foreground">
          No contacts found for "{searchQuery}"
        </div>
      )}
    </div>
  );
}

// ========================================
// SMART SEARCH (Natural Language)
// ========================================
interface SmartSearchContact {
  id: string;
  name: string;
  email: string;
  phone: string;
  companyName: string;
  tags: string[];
  dateAdded: string;
}

interface SmartSearchResult {
  contacts: SmartSearchContact[];
  total: number;
  hasMore: boolean;
  parsedQuery: {
    searchType: string;
    query?: string;
    tags?: string[];
    explanation: string;
  };
}

function SmartSearch({
  onSelectContact,
  onContactListUpdate,
}: {
  onSelectContact: (contactId: string) => void;
  onContactListUpdate: (contacts: SmartSearchContact[], currentIndex: number) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SmartSearchResult | null>(null);

  const searchMutation = useMutation({
    mutationFn: async (q: string) => {
      const res = await fetch("/api/rep-console/smart-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ query: q }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Search failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success && data.data) {
        setResults(data.data);
      }
    },
  });

  // Handle contact selection - set list state only when a contact is clicked
  const handleSelectContact = (contact: SmartSearchContact, index: number) => {
    if (results) {
      onContactListUpdate(results.contacts, index);
    }
    onSelectContact(contact.id);
  };

  const handleSearch = () => {
    if (query.length < 2) return;
    searchMutation.mutate(query);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">
          AI-Powered Search
        </label>
        <p className="text-xs text-muted-foreground mb-3">
          Describe the contacts you're looking for in plain English. Examples: "show me all hot leads", 
          "find contacts tagged application complete", "list everyone from this week"
        </p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Describe what contacts you want to find..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pl-9"
              data-testid="input-smart-search"
            />
          </div>
          <Button 
            onClick={handleSearch} 
            disabled={query.length < 2 || searchMutation.isPending}
            data-testid="button-smart-search"
          >
            {searchMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Search className="w-4 h-4 mr-1" />
                Search
              </>
            )}
          </Button>
        </div>
      </div>

      {searchMutation.error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{(searchMutation.error as Error).message}</AlertDescription>
        </Alert>
      )}

      {results && (
        <div className="space-y-3">
          {/* AI Interpretation */}
          <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
            <p className="text-sm">
              <span className="font-medium">AI understood:</span>{" "}
              {results.parsedQuery.explanation}
            </p>
            {results.parsedQuery.tags && results.parsedQuery.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {results.parsedQuery.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Results Count */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Found <span className="font-medium text-foreground">{results.total}</span> contact(s)
              {results.hasMore && " (showing first results)"}
            </p>
          </div>

          {/* Contact List */}
          {results.contacts.length > 0 ? (
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {results.contacts.map((contact, index) => (
                  <Card
                    key={contact.id}
                    className="p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => handleSelectContact(contact, index)}
                    data-testid={`card-contact-${index}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{contact.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {contact.companyName || contact.email || contact.phone}
                        </p>
                      </div>
                      {contact.tags.length > 0 && (
                        <div className="flex gap-1">
                          {contact.tags.slice(0, 2).map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {contact.tags.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{contact.tags.length - 2}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              No contacts match your search criteria
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ========================================
// SMART CALL LISTS
// ========================================
interface SmartList {
  id: string;
  name: string;
  description: string;
  icon: string;
  count: number;
  priority: number;
}

const ICON_MAP: Record<string, typeof Flame> = {
  'Flame': Flame,
  'PhoneCallback': PhoneCall,
  'FileWarning': FileWarning,
  'FileX': FileX,
  'UserPlus': UserPlus,
  'CheckCircle': CheckCircle2,
};

function SmartCallLists({
  onSelectContact,
  onContactListUpdate,
}: {
  onSelectContact: (contactId: string) => void;
  onContactListUpdate: (contacts: SmartSearchContact[], currentIndex: number) => void;
}) {
  const [selectedList, setSelectedList] = useState<string | null>(null);

  // Fetch available smart lists
  const listsQuery = useQuery<{ success: boolean; data: { lists: SmartList[] } }>({
    queryKey: ["/api/rep-console/smart-lists"],
    queryFn: async () => {
      const res = await fetch("/api/rep-console/smart-lists", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch lists");
      return res.json();
    },
  });

  // Fetch contacts for selected list
  const listContactsQuery = useQuery<{ success: boolean; data: { contacts: SmartSearchContact[]; total: number; listName: string } }>({
    queryKey: ["/api/rep-console/smart-lists", selectedList],
    queryFn: async () => {
      const res = await fetch(`/api/rep-console/smart-lists/${selectedList}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch list contacts");
      return res.json();
    },
    enabled: !!selectedList,
  });

  const handleSelectContact = (contact: SmartSearchContact, index: number) => {
    if (listContactsQuery.data?.data?.contacts) {
      onContactListUpdate(listContactsQuery.data.data.contacts, index);
    }
    onSelectContact(contact.id);
  };

  const lists = listsQuery.data?.data?.lists || [];

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-muted-foreground mb-3">
          Click a call list to view contacts. Lists are based on GHL tags.
        </p>
      </div>

      {/* List Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {listsQuery.isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))
        ) : (
          lists.map((list) => {
            const IconComponent = ICON_MAP[list.icon] || List;
            const isSelected = selectedList === list.id;
            return (
              <Card
                key={list.id}
                className={`p-3 cursor-pointer transition-all hover-elevate ${
                  isSelected ? 'ring-2 ring-primary bg-primary/5' : ''
                }`}
                onClick={() => setSelectedList(list.id)}
                data-testid={`card-list-${list.id}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <IconComponent className={`w-4 h-4 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className="font-medium text-sm">{list.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{list.description}</span>
                  <Badge variant={list.count > 0 ? "default" : "secondary"} className="text-xs">
                    {list.count}
                  </Badge>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Selected List Contacts */}
      {selectedList && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium">
              {listContactsQuery.data?.data?.listName || 'Loading...'}
            </h3>
            <Button variant="ghost" size="sm" onClick={() => setSelectedList(null)}>
              <XCircle className="w-4 h-4 mr-1" />
              Close
            </Button>
          </div>

          {listContactsQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          ) : listContactsQuery.data?.data?.contacts.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              No contacts in this list
            </div>
          ) : (
            <ScrollArea className="h-[250px]">
              <div className="space-y-2">
                {listContactsQuery.data?.data?.contacts.map((contact, index) => (
                  <Card
                    key={contact.id}
                    className="p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => handleSelectContact(contact, index)}
                    data-testid={`card-list-contact-${index}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{contact.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {contact.companyName || contact.email || contact.phone}
                        </p>
                      </div>
                      <div className="flex gap-1 flex-wrap justify-end">
                        {contact.tags.slice(0, 2).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      )}
    </div>
  );
}

// ========================================
// QUICK ACTIONS TOOLBAR
// ========================================
function QuickActionsToolbar({ 
  contactId, 
  contactName,
  onActionComplete 
}: { 
  contactId: string; 
  contactName: string;
  onActionComplete: () => void;
}) {
  const { toast } = useToast();
  const [addNoteOpen, setAddNoteOpen] = useState(false);
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [noteBody, setNoteBody] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");

  // Add note mutation
  const addNoteMutation = useMutation({
    mutationFn: async (body: string) => {
      const res = await fetch(`/api/rep-console/${contactId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ body }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add note");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Note added", description: "Your note has been saved." });
      setNoteBody("");
      setAddNoteOpen(false);
      onActionComplete();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async ({ title, dueDate }: { title: string; dueDate: string }) => {
      const res = await fetch(`/api/rep-console/${contactId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title, dueDate }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create task");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Task created", description: "Your task has been scheduled." });
      setTaskTitle("");
      setTaskDueDate("");
      setAddTaskOpen(false);
      onActionComplete();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Natural language command
  const [commandInput, setCommandInput] = useState("");
  const [commandResult, setCommandResult] = useState<{
    intent: string;
    explanation: string;
    executed: boolean;
  } | null>(null);

  const commandMutation = useMutation({
    mutationFn: async (command: string) => {
      const res = await fetch("/api/rep-console/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ 
          command, 
          contactId, 
          contactName,
          execute: true 
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Command failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      const parsed = data.data?.parsed;
      setCommandResult({
        intent: parsed?.intent || 'unknown',
        explanation: parsed?.explanation || '',
        executed: data.data?.executed || false,
      });
      if (data.data?.executed) {
        toast({ 
          title: "Action completed", 
          description: parsed?.explanation || "Command executed successfully" 
        });
        setCommandInput("");
        onActionComplete();
      }
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleCommand = () => {
    if (commandInput.trim().length < 2) return;
    commandMutation.mutate(commandInput);
  };

  return (
    <Card className="mb-4">
      <CardContent className="py-3 space-y-3">
        {/* Natural Language Command Bar */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder='Try: "add note saying called today" or "create follow-up task for tomorrow"'
              value={commandInput}
              onChange={(e) => setCommandInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCommand()}
              className="pl-9"
              data-testid="input-command"
            />
          </div>
          <Button 
            onClick={handleCommand}
            disabled={commandInput.trim().length < 2 || commandMutation.isPending}
            data-testid="button-execute-command"
          >
            {commandMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Run"
            )}
          </Button>
        </div>

        {/* Command Result Feedback */}
        {commandResult && !commandResult.executed && (
          <Alert>
            <AlertDescription>
              <span className="font-medium">Understood:</span> {commandResult.explanation}
              {commandResult.intent !== 'search' && (
                <span className="text-muted-foreground ml-2">(needs confirmation)</span>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Quick Action Buttons */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Quick Actions</span>
          <div className="flex items-center gap-2">
            {/* Add Note Dialog */}
            <Dialog open={addNoteOpen} onOpenChange={setAddNoteOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" data-testid="button-add-note">
                  <StickyNote className="w-4 h-4 mr-1" />
                  Add Note
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Note for {contactName}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="note-body">Note</Label>
                    <Textarea
                      id="note-body"
                      placeholder="Enter your note..."
                      value={noteBody}
                      onChange={(e) => setNoteBody(e.target.value)}
                      className="min-h-[100px]"
                      data-testid="textarea-note-body"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAddNoteOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={() => addNoteMutation.mutate(noteBody)}
                    disabled={!noteBody.trim() || addNoteMutation.isPending}
                    data-testid="button-save-note"
                  >
                    {addNoteMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-1" />
                    ) : (
                      <Plus className="w-4 h-4 mr-1" />
                    )}
                    Save Note
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Create Task Dialog */}
            <Dialog open={addTaskOpen} onOpenChange={setAddTaskOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" data-testid="button-add-task">
                  <ListTodo className="w-4 h-4 mr-1" />
                  Create Task
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Task for {contactName}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="task-title">Task Title</Label>
                    <Input
                      id="task-title"
                      placeholder="e.g., Follow up call"
                      value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)}
                      data-testid="input-task-title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="task-due">Due Date</Label>
                    <Input
                      id="task-due"
                      type="date"
                      value={taskDueDate}
                      onChange={(e) => setTaskDueDate(e.target.value)}
                      data-testid="input-task-due-date"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAddTaskOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={() => createTaskMutation.mutate({ title: taskTitle, dueDate: taskDueDate })}
                    disabled={!taskTitle.trim() || !taskDueDate || createTaskMutation.isPending}
                    data-testid="button-save-task"
                  >
                    {createTaskMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-1" />
                    ) : (
                      <Plus className="w-4 h-4 mr-1" />
                    )}
                    Create Task
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Quick Call */}
            <Button
              variant="outline"
              size="sm"
              asChild
              data-testid="button-quick-call"
            >
              <a href={`tel:${contactId}`}>
                <PhoneCall className="w-4 h-4 mr-1" />
                Call
              </a>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ========================================
// MAIN COMPONENT
// ========================================
export default function RepConsole() {
  const [, navigate] = useLocation();
  const [match, params] = useRoute("/rep-console/:contactId");
  const contactId = params?.contactId;

  // Auth state
  const [auth, setAuth] = useState<AuthState>({ isAuthenticated: false });
  const [authChecked, setAuthChecked] = useState(false);

  // Contact list navigation state
  const [contactList, setContactList] = useState<SmartSearchContact[]>([]);
  const [currentListIndex, setCurrentListIndex] = useState(0);

  // Handle contact list updates from smart search
  const handleContactListUpdate = (contacts: SmartSearchContact[], index: number) => {
    setContactList(contacts);
    setCurrentListIndex(index);
  };

  // Clear the contact list navigation
  const clearContactList = () => {
    setContactList([]);
    setCurrentListIndex(0);
  };

  // Check if the current contact is in the list (for showing navigation bar)
  const isContactInList = contactId && contactList.length > 0 && 
    contactList[currentListIndex]?.id === contactId;

  // Navigate to previous contact in list
  const goToPreviousContact = () => {
    if (contactList.length === 0 || currentListIndex <= 0) return;
    const prevIndex = currentListIndex - 1;
    setCurrentListIndex(prevIndex);
    navigate(`/rep-console/${contactList[prevIndex].id}`);
  };

  // Navigate to next contact in list
  const goToNextContact = () => {
    if (contactList.length === 0 || currentListIndex >= contactList.length - 1) return;
    const nextIndex = currentListIndex + 1;
    setCurrentListIndex(nextIndex);
    navigate(`/rep-console/${contactList[nextIndex].id}`);
  };

  // Check auth on mount
  useEffect(() => {
    fetch("/api/auth/check", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        setAuth({
          isAuthenticated: data.isAuthenticated,
          role: data.role,
          agentEmail: data.agentEmail,
          agentName: data.agentName,
        });
        setAuthChecked(true);
      })
      .catch(() => {
        setAuth({ isAuthenticated: false });
        setAuthChecked(true);
      });
  }, []);

  // Fetch Contact360 data
  const {
    data: contact360Response,
    isLoading,
    error,
    refetch,
  } = useQuery<{ success: boolean; data: Contact360; error?: string }>({
    queryKey: ["/api/rep-console", contactId],
    queryFn: async () => {
      const res = await fetch(`/api/rep-console/${contactId}`, {
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch contact data");
      }
      return res.json();
    },
    enabled: authChecked && auth.isAuthenticated && !!contactId,
    retry: false,
  });

  const contact360 = contact360Response?.data;

  // Logout handler
  const handleLogout = async () => {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    setAuth({ isAuthenticated: false });
  };

  // Not auth checked yet
  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#192F56] to-[#19112D]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not authenticated
  if (!auth.isAuthenticated) {
    return (
      <LoginForm
        onLoginSuccess={() => {
          fetch("/api/auth/check", { credentials: "include" })
            .then((res) => res.json())
            .then((data) => {
              setAuth({
                isAuthenticated: data.isAuthenticated,
                role: data.role,
                agentEmail: data.agentEmail,
                agentName: data.agentName,
              });
            });
        }}
      />
    );
  }

  // No contact selected - show search
  if (!contactId) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#192F56] to-[#19112D]">
        <div className="container mx-auto p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Rep Console</h1>
                <p className="text-sm text-muted-foreground">
                  {auth.agentName || "Admin"} - Contact 360 View
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/dashboard">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Dashboard
                </Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-1" />
                Logout
              </Button>
            </div>
          </div>

          {/* Smart Search Card */}
          <Card className="max-w-3xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                Find Contacts with AI
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SmartSearch
                onSelectContact={(id) => navigate(`/rep-console/${id}`)}
                onContactListUpdate={handleContactListUpdate}
              />
            </CardContent>
          </Card>

          {/* Call Lists Card */}
          <Card className="max-w-3xl mx-auto mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <List className="w-5 h-5" />
                Call Lists
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SmartCallLists
                onSelectContact={(id) => navigate(`/rep-console/${id}`)}
                onContactListUpdate={handleContactListUpdate}
              />
            </CardContent>
          </Card>

          {/* Simple Search Card */}
          <Card className="max-w-3xl mx-auto mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5" />
                Direct Search
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ContactSearch
                onSelectContact={(id) => navigate(`/rep-console/${id}`)}
              />
              <div className="mt-6 pt-6 border-t">
                <p className="text-sm text-muted-foreground text-center">
                  Or enter a GHL Contact ID directly:
                </p>
                <div className="flex gap-2 mt-2">
                  <Input
                    placeholder="Contact ID..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const value = (e.target as HTMLInputElement).value;
                        if (value) navigate(`/rep-console/${value}`);
                      }
                    }}
                    data-testid="input-contact-id"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="container mx-auto p-6">
          <div className="flex items-center gap-4 mb-8">
            <Skeleton className="w-14 h-14 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="w-48 h-6" />
              <Skeleton className="w-32 h-4" />
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-48 rounded-lg" />
              <Skeleton className="h-64 rounded-lg" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-48 rounded-lg" />
              <Skeleton className="h-48 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !contact360) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="container mx-auto p-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/rep-console")}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to search
          </Button>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error loading contact</AlertTitle>
            <AlertDescription>
              {(error as Error)?.message || "Contact not found or GHL not configured"}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  // Main view
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto p-6">
        {/* Top Bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/rep-console")}>
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <span className="text-sm text-muted-foreground">
              {auth.agentName || "Admin"} - Rep Console
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-1" />
              Refresh
            </Button>
            <Link href="/dashboard">
              <Button variant="outline" size="sm">
                <ExternalLink className="w-4 h-4 mr-1" />
                Dashboard
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* List Navigation Controls - only show when current contact is in the list */}
        {isContactInList && (
          <div className="flex items-center justify-between mb-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
            <div className="text-sm">
              Viewing contact <span className="font-medium">{currentListIndex + 1}</span> of{" "}
              <span className="font-medium">{contactList.length}</span> from your search
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={goToPreviousContact}
                disabled={currentListIndex <= 0}
                data-testid="button-previous-contact"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={goToNextContact}
                disabled={currentListIndex >= contactList.length - 1}
                data-testid="button-next-contact"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearContactList}
                data-testid="button-clear-list"
                title="Clear search results"
              >
                <XCircle className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Contact Header */}
        <ContactHeader
          contact={contact360.contact}
          computed={contact360.computed}
          contactId={contactId}
          onRefresh={() => refetch()}
        />

        {/* Quick Actions Toolbar */}
        <div className="mt-4">
          <QuickActionsToolbar 
            contactId={contactId}
            contactName={`${contact360.contact.firstName || ''} ${contact360.contact.lastName || ''}`.trim() || 'Contact'}
            onActionComplete={() => refetch()}
          />
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* Left Column: Deal & Approvals */}
          <div className="space-y-6">
            <ActiveDealCard
              opportunity={contact360.activeOpportunity}
              onRefresh={() => refetch()}
            />
            <LenderApprovalsCard approvals={contact360.lenderApprovals} />
          </div>

          {/* Middle Column: Tasks & Notes */}
          <div className="space-y-6">
            <TasksCard
              tasks={contact360.tasks}
              contactId={contactId}
              onRefresh={() => refetch()}
            />
            <NotesCard
              notes={contact360.notes}
              contactId={contactId}
              onRefresh={() => refetch()}
            />
          </div>

          {/* Right Column: Conversations */}
          <div className="space-y-6">
            <ConversationsCard
              conversations={contact360.conversations}
              contactId={contactId}
              onRefresh={() => refetch()}
            />

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Quick Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Contact Added</span>
                  <span>{formatDate(contact360.contact.dateAdded)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Last Updated</span>
                  <span>{formatDate(contact360.contact.dateUpdated)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Source</span>
                  <span>{contact360.contact.source || "Unknown"}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total Tasks</span>
                  <span>{contact360.tasks.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total Notes</span>
                  <span>{contact360.notes.length}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground mt-8">
          Data fetched at {formatDate(contact360.fetchedAt)} | Location: {contact360.locationId}
        </div>
      </div>
    </div>
  );
}
