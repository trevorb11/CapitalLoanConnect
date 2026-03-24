import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { format, formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MessageSquare,
  Phone,
  Mail,
  Building2,
  User,
  Send,
  RefreshCw,
  ChevronLeft,
  ExternalLink,
  ArrowDownLeft,
  ArrowUpRight,
} from "lucide-react";

interface Contact {
  id: number;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  businessName: string | null;
  legalBusinessName: string | null;
}

interface SmsMessage {
  sid: string;
  from: string;
  to: string;
  body: string;
  dateSent: string;
  status: string;
  direction: string;
  contact?: Contact | null;
}

interface InboundResponse {
  messages: SmsMessage[];
  hasMore: boolean;
  total: number;
}

interface ConversationResponse {
  messages: SmsMessage[];
  ourNumber: string | null;
}

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    const d = digits.slice(1);
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

// Group inbound messages by sender phone, keeping most recent message per sender
function buildThreadList(messages: SmsMessage[]): { phone: string; latest: SmsMessage; contact: Contact | null }[] {
  const map = new Map<string, { latest: SmsMessage; contact: Contact | null }>();
  for (const msg of messages) {
    const existing = map.get(msg.from);
    if (!existing || new Date(msg.dateSent) > new Date(existing.latest.dateSent)) {
      map.set(msg.from, { latest: msg, contact: msg.contact || null });
    }
  }
  return Array.from(map.entries())
    .map(([phone, val]) => ({ phone, ...val }))
    .sort((a, b) => new Date(b.latest.dateSent).getTime() - new Date(a.latest.dateSent).getTime());
}

export default function SmsInbox() {
  const [, navigate] = useLocation();
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [replyText, setReplyText] = useState("");
  const threadEndRef = useRef<HTMLDivElement>(null);

  // Auth check
  const { data: authData, isLoading: authLoading } = useQuery<{ isAuthenticated: boolean; role?: string }>({
    queryKey: ["/api/auth/check"],
  });

  // Fetch inbound messages list
  const {
    data: inboundData,
    isLoading: inboundLoading,
    refetch: refetchInbound,
    isRefetching,
  } = useQuery<InboundResponse>({
    queryKey: ["/api/admin/sms/inbound"],
    enabled: authData?.role === "admin",
    refetchInterval: 60000, // auto-refresh every minute
  });

  // Fetch conversation thread for selected phone
  const {
    data: conversationData,
    isLoading: threadLoading,
    refetch: refetchThread,
  } = useQuery<ConversationResponse>({
    queryKey: ["/api/admin/sms/conversation", selectedPhone],
    queryFn: () =>
      fetch(`/api/admin/sms/conversation/${encodeURIComponent(selectedPhone!)}`)
        .then((r) => r.json()),
    enabled: !!selectedPhone && authData?.role === "admin",
  });

  // Reply mutation
  const replyMutation = useMutation({
    mutationFn: ({ to, body }: { to: string; body: string }) =>
      apiRequest("POST", "/api/admin/sms/reply", { to, body }),
    onSuccess: () => {
      setReplyText("");
      refetchThread();
      refetchInbound();
    },
  });

  // Scroll to bottom of thread when messages load
  useEffect(() => {
    if (conversationData?.messages) {
      threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [conversationData?.messages]);

  const handleSendReply = () => {
    if (!selectedPhone || !replyText.trim() || replyMutation.isPending) return;
    replyMutation.mutate({ to: selectedPhone, body: replyText.trim() });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      handleSendReply();
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!authData?.isAuthenticated || authData.role !== "admin") {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center space-y-3">
          <p className="text-muted-foreground">Admin access required.</p>
          <Button variant="outline" onClick={() => navigate("/dashboard")}>
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const threads = buildThreadList(inboundData?.messages || []);

  const selectedThread = selectedPhone
    ? threads.find((t) => t.phone === selectedPhone) || null
    : null;

  const displayContact = selectedContact || selectedThread?.contact || null;
  const contactName = displayContact?.fullName || displayContact?.businessName || null;
  const businessName = displayContact?.legalBusinessName || displayContact?.businessName || null;

  return (
    <div className="flex h-screen bg-background">
      {/* Left panel — thread list */}
      <div className="flex flex-col w-80 border-r flex-shrink-0">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/dashboard")}
              data-testid="button-back-dashboard"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="font-semibold text-sm">SMS Inbox</h1>
              {inboundData && (
                <p className="text-xs text-muted-foreground">
                  {threads.length} conversation{threads.length !== 1 ? "s" : ""}
                </p>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetchInbound()}
            disabled={isRefetching || inboundLoading}
            data-testid="button-refresh-inbox"
          >
            <RefreshCw className={`w-4 h-4 ${isRefetching ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {/* Thread list */}
        <ScrollArea className="flex-1">
          {inboundLoading ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Loading messages...
            </div>
          ) : threads.length === 0 ? (
            <div className="p-6 text-center space-y-2">
              <MessageSquare className="w-8 h-8 mx-auto text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No inbound messages yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {threads.map((thread) => {
                const name = thread.contact?.fullName || thread.contact?.businessName || null;
                const isSelected = selectedPhone === thread.phone;
                return (
                  <button
                    key={thread.phone}
                    data-testid={`thread-item-${thread.phone}`}
                    className={`w-full text-left p-4 hover-elevate transition-colors ${
                      isSelected ? "bg-accent" : ""
                    }`}
                    onClick={() => {
                      setSelectedPhone(thread.phone);
                      setSelectedContact(thread.contact);
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="w-9 h-9 flex-shrink-0">
                        <AvatarFallback className="text-xs">
                          {getInitials(name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className="font-medium text-sm truncate">
                            {name || formatPhone(thread.phone)}
                          </span>
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            {formatDistanceToNow(new Date(thread.latest.dateSent), {
                              addSuffix: false,
                            })}
                          </span>
                        </div>
                        {name && (
                          <p className="text-xs text-muted-foreground truncate mb-0.5">
                            {formatPhone(thread.phone)}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground truncate">
                          {thread.latest.body}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Right panel — conversation + reply */}
      {selectedPhone ? (
        <div className="flex flex-col flex-1 min-w-0">
          {/* Conversation header */}
          <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
            <div className="flex items-center gap-3">
              <Avatar className="w-9 h-9">
                <AvatarFallback className="text-xs">
                  {getInitials(contactName)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="font-semibold text-sm">
                  {contactName || formatPhone(selectedPhone)}
                </h2>
                {contactName && (
                  <p className="text-xs text-muted-foreground">
                    {formatPhone(selectedPhone)}
                  </p>
                )}
              </div>
            </div>

            {/* Contact info pills */}
            {displayContact && (
              <div className="flex items-center gap-2 flex-wrap">
                {businessName && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Building2 className="w-3 h-3" />
                    <span>{businessName}</span>
                  </div>
                )}
                {displayContact.email && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Mail className="w-3 h-3" />
                    <span>{displayContact.email}</span>
                  </div>
                )}
                {displayContact.id && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      window.open(`/agent/application/${displayContact.id}`, "_blank")
                    }
                    data-testid="button-view-contact-app"
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    View Application
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => refetchThread()}
                  data-testid="button-refresh-thread"
                >
                  <RefreshCw className={`w-4 h-4 ${threadLoading ? "animate-spin" : ""}`} />
                </Button>
              </div>
            )}
          </div>

          {/* Message thread */}
          <ScrollArea className="flex-1 p-4">
            {threadLoading ? (
              <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
                Loading conversation...
              </div>
            ) : !conversationData?.messages?.length ? (
              <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
                No messages in this conversation
              </div>
            ) : (
              <div className="space-y-3 max-w-2xl mx-auto">
                {conversationData.messages.map((msg) => {
                  const isOutbound =
                    msg.direction === "outbound-api" ||
                    msg.direction === "outbound-reply" ||
                    (conversationData.ourNumber && msg.from === conversationData.ourNumber);
                  return (
                    <div
                      key={msg.sid}
                      data-testid={`message-${msg.sid}`}
                      className={`flex gap-2 ${isOutbound ? "flex-row-reverse" : "flex-row"}`}
                    >
                      {!isOutbound && (
                        <Avatar className="w-8 h-8 flex-shrink-0 mt-1">
                          <AvatarFallback className="text-xs">
                            {getInitials(contactName)}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div
                        className={`max-w-[70%] rounded-md px-3 py-2 text-sm ${
                          isOutbound
                            ? "bg-primary text-primary-foreground ml-auto"
                            : "bg-muted"
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                        <div
                          className={`flex items-center gap-1 mt-1 text-xs ${
                            isOutbound ? "text-primary-foreground/70 justify-end" : "text-muted-foreground"
                          }`}
                        >
                          {isOutbound ? (
                            <ArrowUpRight className="w-3 h-3" />
                          ) : (
                            <ArrowDownLeft className="w-3 h-3" />
                          )}
                          <span>
                            {format(new Date(msg.dateSent), "MMM d, h:mm a")}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={threadEndRef} />
              </div>
            )}
          </ScrollArea>

          <Separator />

          {/* Reply box */}
          <div className="p-4 flex-shrink-0">
            <div className="max-w-2xl mx-auto space-y-2">
              {replyMutation.isError && (
                <p className="text-xs text-destructive">
                  Failed to send. Please try again.
                </p>
              )}
              <div className="flex gap-2 items-end">
                <Textarea
                  placeholder={`Reply to ${formatPhone(selectedPhone)}…`}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="resize-none"
                  rows={3}
                  data-testid="input-sms-reply"
                />
                <Button
                  onClick={handleSendReply}
                  disabled={!replyText.trim() || replyMutation.isPending}
                  size="icon"
                  data-testid="button-send-reply"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Cmd+Enter to send
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Empty state */
        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-3 text-muted-foreground">
          <MessageSquare className="w-12 h-12 opacity-30" />
          <div>
            <p className="font-medium">Select a conversation</p>
            <p className="text-sm">Choose a thread from the left to read and reply</p>
          </div>
        </div>
      )}
    </div>
  );
}
