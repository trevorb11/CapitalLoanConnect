import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  MessageSquare,
  Lock,
  ArrowLeft,
  Building2,
  RefreshCw,
  Send,
  User,
} from "lucide-react";
import { Link } from "wouter";

interface MessageThread {
  merchantEmail: string;
  lastAt: string;
  lastMessage: string;
  lastSenderRole: string;
  unreadCount: number;
  messageCount: number;
  businessName: string | null;
  assignedRep: string | null;
}

interface MerchantMessage {
  id: string;
  merchantEmail: string;
  dealId: string | null;
  senderRole: string;
  senderName: string | null;
  message: string;
  isRead: boolean;
  createdAt: string;
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
        const d = await res.json();
        throw new Error(d.error || "Invalid credentials");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/check"] });
      onLoginSuccess();
    },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-8">
        <div className="flex items-center justify-center mb-6">
          <div className="bg-primary/10 rounded-full p-3">
            <Lock className="w-6 h-6 text-primary" />
          </div>
        </div>
        <h1 className="text-xl font-bold text-center mb-1">Staff Access Required</h1>
        <p className="text-sm text-muted-foreground text-center mb-6">
          Enter your credentials to view merchant portal messages
        </p>
        {error && <p className="text-sm text-destructive text-center mb-4">{error}</p>}
        <Input
          type="password"
          placeholder="Password"
          value={credential}
          onChange={(e) => setCredential(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && loginMutation.mutate(credential)}
          className="mb-3"
          data-testid="input-password"
        />
        <Button
          className="w-full"
          onClick={() => loginMutation.mutate(credential)}
          disabled={!credential || loginMutation.isPending}
          data-testid="button-login"
        >
          {loginMutation.isPending ? "Signing in…" : "Sign In"}
        </Button>
      </Card>
    </div>
  );
}

function formatTime(dateStr: string | null) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function ThreadView({ email, businessName, onReplied }: { email: string; businessName: string | null; onReplied: () => void }) {
  const [reply, setReply] = useState("");
  const [senderName, setSenderName] = useState(() => localStorage.getItem("portal_msg_sender") || "Today Capital Group");
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: messages, isLoading, refetch } = useQuery<MerchantMessage[]>({
    queryKey: ["/api/merchant/messages/staff", email],
    queryFn: async () => {
      const res = await fetch(`/api/merchant/messages/staff/${encodeURIComponent(email)}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load messages");
      return res.json();
    },
    refetchInterval: 30000,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    // Opening the thread marks merchant messages read server-side — refresh the list badges
    if (messages) onReplied();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages?.length]);

  const sendMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/merchant/messages/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ merchantEmail: email, message: reply.trim(), senderName: senderName.trim() || "Today Capital Group" }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Failed to send");
      }
      return res.json();
    },
    onSuccess: () => {
      setReply("");
      localStorage.setItem("portal_msg_sender", senderName.trim() || "Today Capital Group");
      refetch();
      onReplied();
    },
  });

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between gap-2 border-b p-4">
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate">{businessName || email}</p>
          {businessName && <p className="text-xs text-muted-foreground truncate">{email}</p>}
        </div>
        <Button variant="ghost" size="icon" onClick={() => refetch()} data-testid="button-refresh-thread">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground text-center py-8">Loading messages…</p>}
        {!isLoading && (!messages || messages.length === 0) && (
          <p className="text-sm text-muted-foreground text-center py-8">No messages yet. Send the first one below.</p>
        )}
        {messages?.map((m) => (
          <div key={m.id} className={`flex ${m.senderRole === "merchant" ? "justify-start" : "justify-end"}`}>
            <div
              className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                m.senderRole === "merchant"
                  ? "bg-muted text-foreground"
                  : "bg-primary text-primary-foreground"
              }`}
            >
              <p className="whitespace-pre-wrap break-words">{m.message}</p>
              <p className={`mt-1 text-[10px] ${m.senderRole === "merchant" ? "text-muted-foreground" : "text-primary-foreground/70"}`}>
                {m.senderName || (m.senderRole === "merchant" ? "Merchant" : "Team")} · {formatTime(m.createdAt)}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="border-t p-4 space-y-2">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-muted-foreground shrink-0" />
          <Input
            value={senderName}
            onChange={(e) => setSenderName(e.target.value)}
            placeholder="Your name (shown to merchant)"
            className="h-8 text-xs"
            data-testid="input-sender-name"
          />
        </div>
        <div className="flex gap-2">
          <Textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (reply.trim() && !sendMutation.isPending) sendMutation.mutate();
              }
            }}
            placeholder="Type a reply… (merchant gets an SMS + email notification)"
            className="min-h-[60px] resize-none"
            maxLength={2000}
            data-testid="input-reply"
          />
          <Button
            onClick={() => sendMutation.mutate()}
            disabled={!reply.trim() || sendMutation.isPending}
            className="self-end"
            data-testid="button-send-reply"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        {sendMutation.isError && (
          <p className="text-xs text-destructive">{(sendMutation.error as Error)?.message || "Failed to send. Try again."}</p>
        )}
      </div>
    </div>
  );
}

export default function PortalMessages() {
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);

  const { data: authData, isLoading: authLoading, refetch: refetchAuth } = useQuery<{ isAuthenticated: boolean; role?: string }>({
    queryKey: ["/api/auth/check"],
    queryFn: async () => {
      const res = await fetch("/api/auth/check", { credentials: "include" });
      return res.json();
    },
  });

  const isStaff = authData?.isAuthenticated && authData.role !== "merchant" && authData.role !== "lead";

  const { data: threads, isLoading: threadsLoading, refetch: refetchThreads } = useQuery<MessageThread[]>({
    queryKey: ["/api/admin/merchant-messages/threads"],
    queryFn: async () => {
      const res = await fetch("/api/admin/merchant-messages/threads", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load threads");
      return res.json();
    },
    enabled: !!isStaff,
    refetchInterval: 30000,
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isStaff) {
    return <LoginForm onLoginSuccess={() => refetchAuth()} />;
  }

  const selectedThread = threads?.find((t) => t.merchantEmail === selectedEmail) || null;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <MessageSquare className="w-5 h-5 text-primary" />
          <div>
            <h1 className="text-lg font-bold leading-tight">Portal Messages</h1>
            <p className="text-xs text-muted-foreground">Merchant portal conversations — replies notify the merchant by SMS + email</p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4">
        <div className="grid md:grid-cols-[320px_1fr] gap-4" style={{ height: "calc(100vh - 120px)" }}>
          {/* Thread list */}
          <Card className="overflow-y-auto">
            <div className="p-3 border-b flex items-center justify-between">
              <p className="text-sm font-semibold">
                Conversations {threads && threads.length > 0 && <span className="text-muted-foreground font-normal">({threads.length})</span>}
              </p>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => refetchThreads()} data-testid="button-refresh-threads">
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
            </div>
            {threadsLoading && <p className="text-sm text-muted-foreground p-4">Loading…</p>}
            {!threadsLoading && (!threads || threads.length === 0) && (
              <div className="p-6 text-center">
                <MessageSquare className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No merchant messages yet.</p>
                <p className="text-xs text-muted-foreground mt-1">When a merchant messages from their portal, the thread appears here.</p>
              </div>
            )}
            {threads?.map((t) => (
              <button
                key={t.merchantEmail}
                onClick={() => setSelectedEmail(t.merchantEmail)}
                className={`w-full text-left p-3 border-b hover-elevate ${selectedEmail === t.merchantEmail ? "bg-muted" : ""}`}
                data-testid={`thread-${t.merchantEmail}`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-medium text-sm truncate flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    {t.businessName || t.merchantEmail}
                  </span>
                  <span className="text-[10px] text-muted-foreground shrink-0">{formatTime(t.lastAt)}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground truncate">
                    {t.lastSenderRole === "merchant" ? "" : "You: "}
                    {t.lastMessage}
                  </p>
                  {t.unreadCount > 0 && (
                    <Badge className="shrink-0 h-5 min-w-5 justify-center px-1.5" data-testid={`badge-unread-${t.merchantEmail}`}>
                      {t.unreadCount}
                    </Badge>
                  )}
                </div>
                {t.assignedRep && <p className="text-[10px] text-muted-foreground mt-0.5">Rep: {t.assignedRep}</p>}
              </button>
            ))}
          </Card>

          {/* Thread view */}
          <Card className="overflow-hidden">
            {selectedThread ? (
              <ThreadView
                email={selectedThread.merchantEmail}
                businessName={selectedThread.businessName}
                onReplied={() => refetchThreads()}
              />
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <MessageSquare className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Select a conversation to view and reply</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
