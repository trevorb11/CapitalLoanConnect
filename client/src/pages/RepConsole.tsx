import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useRoute, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Plus,
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
// CONTACT HEADER CARD
// ========================================
function ContactHeader({
  contact,
  computed,
}: {
  contact: RepConsoleContact;
  computed: Contact360["computed"];
}) {
  return (
    <Card className="border-l-4 border-l-primary">
      <CardContent className="pt-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          {/* Left: Contact Info */}
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <User className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{contact.name}</h1>
              {contact.companyName && (
                <div className="flex items-center gap-2 text-muted-foreground mt-1">
                  <Building2 className="w-4 h-4" />
                  <span>{contact.companyName}</span>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-4 mt-3">
                {contact.phone && (
                  <a
                    href={`tel:${contact.phone}`}
                    className="flex items-center gap-1 text-sm hover:text-primary transition-colors"
                  >
                    <Phone className="w-4 h-4" />
                    {contact.phone}
                  </a>
                )}
                {contact.email && (
                  <a
                    href={`mailto:${contact.email}`}
                    className="flex items-center gap-1 text-sm hover:text-primary transition-colors"
                  >
                    <Mail className="w-4 h-4" />
                    {contact.email}
                  </a>
                )}
              </div>

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
                {contact.phone && (
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="gap-1"
                  >
                    <a href={`sms:${contact.phone}`}>
                      <MessageSquare className="w-4 h-4" />
                      Text
                    </a>
                  </Button>
                )}
                {contact.email && (
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="gap-1"
                  >
                    <a href={`mailto:${contact.email}`}>
                      <Mail className="w-4 h-4" />
                      Email
                    </a>
                  </Button>
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

        {/* Tags */}
        {contact.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
            {contact.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                <Tag className="w-3 h-3" />
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ========================================
// ACTIVE DEAL CARD
// ========================================
function ActiveDealCard({ opportunity }: { opportunity: RepConsoleOpportunity | null }) {
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
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Stage</span>
            <Badge variant="outline">{opportunity.stageName}</Badge>
          </div>
          {opportunity.monetaryValue && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Value</span>
              <span className="font-bold text-primary">
                {formatCurrency(opportunity.monetaryValue)}
              </span>
            </div>
          )}
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

        {/* Next Action */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Activity className="w-4 h-4" />
            Next Action
          </div>
          {opportunity.nextAction ? (
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
// LENDER APPROVALS CARD
// ========================================
function LenderApprovalsCard({ approvals }: { approvals: RepConsoleLenderApproval[] }) {
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
        <ScrollArea className="h-[300px]">
          <div className="space-y-3">
            {approvals.map((approval) => (
              <div
                key={approval.id}
                className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{approval.lenderName}</span>
                  <Badge variant={approval.status === "accepted" ? "default" : "secondary"}>
                    {approval.status}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                  {approval.approvedAmount && (
                    <span>Amount: {formatCurrency(approval.approvedAmount)}</span>
                  )}
                  {approval.paybackAmount && (
                    <span>Payback: {formatCurrency(approval.paybackAmount)}</span>
                  )}
                  {approval.paymentAmount && (
                    <span>
                      Payment: {formatCurrency(approval.paymentAmount)}
                      {approval.paymentFrequency && ` (${approval.paymentFrequency})`}
                    </span>
                  )}
                  {approval.productType && <span>Type: {approval.productType}</span>}
                </div>
                {approval.createdAt && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Received: {formatRelativeTime(approval.createdAt)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// ========================================
// TASKS CARD
// ========================================
function TasksCard({ tasks }: { tasks: RepConsoleTask[] }) {
  const pendingTasks = tasks.filter((t) => !t.isCompleted);
  const completedTasks = tasks.filter((t) => t.isCompleted);

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
                  className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <Clock className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
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
                      className="p-3 border rounded-lg opacity-60"
                    >
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="line-through">{task.title}</p>
                        </div>
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
// NOTES CARD
// ========================================
function NotesCard({
  notes,
  contactId,
  onNoteCreated,
}: {
  notes: RepConsoleNote[];
  contactId: string;
  onNoteCreated: () => void;
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [noteBody, setNoteBody] = useState("");

  const createNoteMutation = useMutation({
    mutationFn: async (body: string) => {
      const res = await fetch(`/api/rep-console/${contactId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ body }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create note");
      }
      return res.json();
    },
    onSuccess: () => {
      setNoteBody("");
      setIsAdding(false);
      onNoteCreated();
    },
  });

  const handleSubmit = () => {
    if (noteBody.trim()) {
      createNoteMutation.mutate(noteBody.trim());
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Notes
            {notes.length > 0 && <Badge variant="secondary">{notes.length}</Badge>}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsAdding(!isAdding)}
            className="h-8 w-8 p-0"
          >
            <Plus className={`w-4 h-4 transition-transform ${isAdding ? 'rotate-45' : ''}`} />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Add Note Form */}
        {isAdding && (
          <div className="mb-4 space-y-2">
            <Textarea
              placeholder="Add a note..."
              value={noteBody}
              onChange={(e) => setNoteBody(e.target.value)}
              className="min-h-[80px] resize-none"
              disabled={createNoteMutation.isPending}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsAdding(false);
                  setNoteBody("");
                }}
                disabled={createNoteMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={!noteBody.trim() || createNoteMutation.isPending}
              >
                {createNoteMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                ) : (
                  <Plus className="w-4 h-4 mr-1" />
                )}
                Add Note
              </Button>
            </div>
            {createNoteMutation.isError && (
              <p className="text-xs text-destructive">
                {(createNoteMutation.error as Error)?.message || "Failed to create note"}
              </p>
            )}
          </div>
        )}

        {notes.length === 0 && !isAdding ? (
          <div className="text-center py-6 text-muted-foreground">
            <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>No notes found</p>
            <Button
              variant="link"
              size="sm"
              onClick={() => setIsAdding(true)}
              className="mt-2"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add the first note
            </Button>
          </div>
        ) : (
          <ScrollArea className="h-[250px]">
            <div className="space-y-3">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <p className="text-sm whitespace-pre-wrap">{note.body}</p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                    {note.userName && <span>By {note.userName}</span>}
                    {note.dateAdded && (
                      <span>{formatRelativeTime(note.dateAdded)}</span>
                    )}
                  </div>
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
function ConversationsCard({ conversations }: { conversations: RepConsoleConversation[] }) {
  const [selectedConv, setSelectedConv] = useState<string | null>(null);

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
            <ScrollArea className="h-[250px]">
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
// OPPORTUNITY FLOW PROGRESS BAR
// ========================================
interface PipelineStage {
  id: string;
  name: string;
  position: number;
}

interface StagesData {
  pipelineId: string;
  pipelineName: string;
  stages: PipelineStage[];
  currentStageId: string | null;
}

function OpportunityFlowBar({
  opportunity,
  onStageUpdated,
}: {
  opportunity: RepConsoleOpportunity | null;
  onStageUpdated: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [stagesData, setStagesData] = useState<StagesData | null>(null);
  const [isLoadingStages, setIsLoadingStages] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStages = async () => {
    if (!opportunity?.id) return;

    setIsLoadingStages(true);
    setError(null);

    try {
      const res = await fetch(`/api/rep-console/opportunity/${opportunity.id}/stages`, {
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch stages");
      }
      const data = await res.json();
      setStagesData(data.data);
    } catch (err: any) {
      setError(err.message || "Failed to load stages");
    } finally {
      setIsLoadingStages(false);
    }
  };

  const handleClick = () => {
    if (!opportunity?.id) {
      // Scroll to deal card if no opportunity
      document.querySelector('[data-deal-card]')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    if (!isExpanded) {
      fetchStages();
    }
    setIsExpanded(!isExpanded);
  };

  const updateStage = async (stageId: string) => {
    if (!opportunity?.id || isUpdating) return;

    setIsUpdating(true);
    setError(null);

    try {
      const res = await fetch(`/api/rep-console/opportunity/${opportunity.id}/stage`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ stageId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update stage");
      }

      // Refresh the contact data
      onStageUpdated();
      setIsExpanded(false);
    } catch (err: any) {
      setError(err.message || "Failed to update stage");
    } finally {
      setIsUpdating(false);
    }
  };

  // Find current stage index for progress visualization
  const currentStageIndex = stagesData?.stages.findIndex(
    (s) => s.id === (stagesData?.currentStageId || opportunity?.stageId)
  ) ?? -1;

  return (
    <div className="my-4">
      {/* Main clickable bar */}
      <div
        className={`w-full py-2 px-4 border rounded-lg transition-colors flex items-center justify-center gap-2 text-sm cursor-pointer ${
          isExpanded
            ? "bg-primary/10 border-primary/30"
            : "bg-muted/50 hover:bg-muted text-muted-foreground"
        }`}
        onClick={handleClick}
      >
        {isLoadingStages ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Activity className="w-4 h-4" />
        )}
        <span>
          {opportunity
            ? `Click to view Opportunity Flow Progress - Current: ${opportunity.stageName}`
            : "Click to view Opportunity Flow Progress"}
        </span>
        {opportunity && (
          <Badge variant="outline" className="ml-2">
            {opportunity.pipelineName}
          </Badge>
        )}
      </div>

      {/* Expanded stage selector */}
      {isExpanded && (
        <div className="mt-3 p-4 border rounded-lg bg-card">
          {error && (
            <div className="mb-3 p-2 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive">
              {error}
            </div>
          )}

          {isLoadingStages ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : stagesData ? (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium">{stagesData.pipelineName} Pipeline</h4>
                <span className="text-xs text-muted-foreground">
                  Click a stage to update
                </span>
              </div>

              {/* Visual progress bar */}
              <div className="flex items-center gap-1 mb-4">
                {stagesData.stages.map((stage, index) => {
                  const isCurrent = stage.id === (stagesData.currentStageId || opportunity?.stageId);
                  const isPast = index < currentStageIndex;
                  const isFuture = index > currentStageIndex;

                  return (
                    <div
                      key={stage.id}
                      className="flex-1 flex flex-col items-center"
                    >
                      <button
                        onClick={() => updateStage(stage.id)}
                        disabled={isUpdating || isCurrent}
                        className={`w-full h-2 rounded-full transition-all ${
                          isCurrent
                            ? "bg-primary"
                            : isPast
                            ? "bg-primary/60 hover:bg-primary/80"
                            : "bg-muted hover:bg-muted-foreground/30"
                        } ${!isCurrent && !isUpdating ? "cursor-pointer" : ""}`}
                        title={`Move to: ${stage.name}`}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Stage buttons */}
              <div className="flex flex-wrap gap-2">
                {stagesData.stages.map((stage) => {
                  const isCurrent = stage.id === (stagesData.currentStageId || opportunity?.stageId);

                  return (
                    <Button
                      key={stage.id}
                      variant={isCurrent ? "default" : "outline"}
                      size="sm"
                      onClick={() => updateStage(stage.id)}
                      disabled={isUpdating || isCurrent}
                      className="text-xs"
                    >
                      {isUpdating && stage.id === stagesData.currentStageId ? (
                        <Loader2 className="w-3 h-3 animate-spin mr-1" />
                      ) : isCurrent ? (
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                      ) : null}
                      {stage.name}
                    </Button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              <p>No pipeline stages available</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ========================================
// CONTACT SEARCH
// ========================================
interface GHLSearchContact {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  phone: string;
  companyName: string;
  dateAdded: string;
}

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

  const localMatch = searchMutation.data?.data?.localMatch;
  const ghlContacts: GHLSearchContact[] = searchMutation.data?.data?.ghlContacts || [];
  const hasResults = localMatch || ghlContacts.length > 0;

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
          />
        </div>
        <Button onClick={handleSearch} disabled={searchQuery.length < 2 || searchMutation.isPending}>
          {searchMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            "Search"
          )}
        </Button>
      </div>

      {/* Local Database Match */}
      {localMatch && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Local Database
          </p>
          <Card
            className={`p-4 ${localMatch.ghlContactId ? 'hover:bg-muted/50 cursor-pointer' : ''}`}
            onClick={() => {
              if (localMatch.ghlContactId) {
                onSelectContact(localMatch.ghlContactId);
              }
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium">{localMatch.fullName || "Unknown"}</p>
                <p className="text-sm text-muted-foreground truncate">
                  {localMatch.businessName || localMatch.email}
                </p>
                {localMatch.phone && (
                  <p className="text-xs text-muted-foreground">
                    {localMatch.phone}
                  </p>
                )}
              </div>
              {localMatch.ghlContactId ? (
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
          </Card>
        </div>
      )}

      {/* GHL Contacts */}
      {ghlContacts.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            GoHighLevel Contacts ({ghlContacts.length})
          </p>
          <div className="space-y-2">
            {ghlContacts.map((contact) => (
              <Card
                key={contact.id}
                className="p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => onSelectContact(contact.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{contact.name}</p>
                    {contact.companyName && (
                      <p className="text-sm text-muted-foreground truncate flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        {contact.companyName}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-1">
                      {contact.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {contact.email}
                        </span>
                      )}
                      {contact.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {contact.phone}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant="outline" className="text-blue-600 border-blue-300">GHL</Badge>
                    <span className="text-xs text-muted-foreground">Click to view</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* No Results */}
      {searchMutation.data && !hasResults && (
        <div className="text-center py-6 text-muted-foreground">
          <Search className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p>No contacts found for "{searchQuery}"</p>
          <p className="text-xs mt-1">Try searching by email, phone, or name</p>
        </div>
      )}
    </div>
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

  // Check auth on mount
  useEffect(() => {
    fetch("/api/auth/check", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        setAuth({
          isAuthenticated: data.authenticated,
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
                isAuthenticated: data.authenticated,
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

          {/* Search Card */}
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Find a Contact</CardTitle>
            </CardHeader>
            <CardContent>
              <ContactSearch
                onSelectContact={(id) => navigate(`/rep-console/${id}`)}
              />
              <div className="mt-6 pt-6 border-t">
                <p className="text-sm text-muted-foreground text-center">
                  Enter a GHL Contact ID directly:
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

        {/* Contact Header */}
        <ContactHeader contact={contact360.contact} computed={contact360.computed} />

        {/* Opportunity Flow Progress Bar */}
        <OpportunityFlowBar
          opportunity={contact360.activeOpportunity}
          onStageUpdated={() => refetch()}
        />

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* Left Column: Deal & Approvals */}
          <div className="space-y-6" data-deal-card>
            <ActiveDealCard opportunity={contact360.activeOpportunity} />
            <LenderApprovalsCard approvals={contact360.lenderApprovals} />
          </div>

          {/* Middle Column: Tasks & Notes */}
          <div className="space-y-6">
            <TasksCard tasks={contact360.tasks} />
            <NotesCard
              notes={contact360.notes}
              contactId={contactId!}
              onNoteCreated={() => refetch()}
            />
          </div>

          {/* Right Column: Conversations */}
          <div className="space-y-6">
            <ConversationsCard conversations={contact360.conversations} />

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
