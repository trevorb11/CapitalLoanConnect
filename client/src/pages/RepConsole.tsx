import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useRoute, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  ChevronLeft,
  ChevronRight,
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
function NotesCard({ notes }: { notes: RepConsoleNote[] }) {
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
        <ContactHeader contact={contact360.contact} computed={contact360.computed} />

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* Left Column: Deal & Approvals */}
          <div className="space-y-6">
            <ActiveDealCard opportunity={contact360.activeOpportunity} />
            <LenderApprovalsCard approvals={contact360.lenderApprovals} />
          </div>

          {/* Middle Column: Tasks & Notes */}
          <div className="space-y-6">
            <TasksCard tasks={contact360.tasks} />
            <NotesCard notes={contact360.notes} />
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
