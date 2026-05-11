import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CheckCircle2,
  XCircle,
  ExternalLink,
  Copy,
  Search,
  Building2,
  Phone,
  Mail,
  Hash,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Submission {
  id: string;
  fullName: string | null;
  businessName: string | null;
  legalBusinessName: string | null;
  email: string;
  phone: string | null;
  gigfiStatus: string | null;
  gigfiDecisionId: string | null;
  gigfiRedirectUrl: string | null;
  gigfiSubmittedAt: string | null;
  gigfiBankConnectedAt: string | null;
  gigfiApprovedAt: string | null;
  updatedAt: string;
  createdAt: string;
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const { toast } = useToast();
  return (
    <button
      data-testid={`button-copy-${label}`}
      onClick={() => {
        navigator.clipboard.writeText(value).then(() =>
          toast({ title: "Copied", description: `${label} copied to clipboard` })
        );
      }}
      className="inline-flex items-center justify-center h-6 w-6 rounded hover-elevate"
      title={`Copy ${label}`}
      style={{ color: "var(--muted-foreground)" }}
    >
      <Copy size={12} />
    </button>
  );
}

export default function GigFiSubmissions() {
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  const { data, isLoading, isError } = useQuery<{ submissions: Submission[] }>({
    queryKey: ["/api/gigfi/submissions"],
  });

  const submissions = data?.submissions ?? [];

  const filtered = submissions.filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (s.fullName ?? "").toLowerCase().includes(q) ||
      (s.businessName ?? "").toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      (s.phone ?? "").includes(q) ||
      (s.gigfiDecisionId ?? "").toLowerCase().includes(q)
    );
  });

  const accepted = submissions.filter((s) => s.gigfiStatus === "ACCEPTED").length;
  const rejected = submissions.filter((s) => s.gigfiStatus === "REJECTED").length;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">GigFi Submissions</h1>
            <p className="text-sm text-muted-foreground mt-1">
              All leads that have been submitted to GigFi for a decision
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm">
              <CheckCircle2 size={14} className="text-green-500" />
              <span className="font-medium">{accepted}</span>
              <span className="text-muted-foreground">Accepted</span>
            </div>
            <div className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm">
              <XCircle size={14} className="text-red-500" />
              <span className="font-medium">{rejected}</span>
              <span className="text-muted-foreground">Rejected</span>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            data-testid="input-gigfi-search"
            placeholder="Search by name, business, email, phone, or decision ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Content */}
        {isLoading && (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="h-4 bg-muted rounded animate-pulse w-1/3 mb-2" />
                  <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {isError && (
          <Card>
            <CardContent className="p-6 text-center text-destructive">
              Failed to load submissions. Make sure you are logged in as an admin or rep.
            </CardContent>
          </Card>
        )}

        {!isLoading && !isError && filtered.length === 0 && (
          <Card>
            <CardContent className="p-10 text-center text-muted-foreground">
              {submissions.length === 0
                ? "No GigFi submissions yet."
                : "No submissions match your search."}
            </CardContent>
          </Card>
        )}

        {!isLoading && !isError && filtered.length > 0 && (
          <div className="space-y-3">
            {filtered.map((sub) => {
              const isAccepted = sub.gigfiStatus === "ACCEPTED";
              const isRejected = sub.gigfiStatus === "REJECTED";
              const name = sub.fullName || "—";
              const biz = sub.legalBusinessName || sub.businessName || "—";

              return (
                <Card key={sub.id} data-testid={`card-gigfi-submission-${sub.id}`}>
                  <CardContent className="p-4">
                    <div className="flex flex-wrap items-start justify-between gap-4">

                      {/* Left: identity */}
                      <div className="flex flex-col gap-2 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm" data-testid={`text-name-${sub.id}`}>
                            {name}
                          </span>
                          {isAccepted && (
                            <Badge
                              data-testid={`status-accepted-${sub.id}`}
                              className="bg-green-500/15 text-green-600 dark:text-green-400 border-0"
                            >
                              <CheckCircle2 size={11} className="mr-1" />
                              Accepted
                            </Badge>
                          )}
                          {isRejected && (
                            <Badge
                              data-testid={`status-rejected-${sub.id}`}
                              className="bg-red-500/15 text-red-600 dark:text-red-400 border-0"
                            >
                              <XCircle size={11} className="mr-1" />
                              Rejected
                            </Badge>
                          )}
                          {!isAccepted && !isRejected && sub.gigfiStatus && (
                            <Badge variant="secondary" data-testid={`status-other-${sub.id}`}>
                              {sub.gigfiStatus}
                            </Badge>
                          )}
                          {sub.gigfiBankConnectedAt && (
                            <Badge
                              className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-0"
                              title={`Bank connected ${new Date(sub.gigfiBankConnectedAt).toLocaleString()}`}
                            >
                              Bank Connected {new Date(sub.gigfiBankConnectedAt).toLocaleDateString()}
                            </Badge>
                          )}
                          {sub.gigfiApprovedAt && (
                            <Badge
                              className="bg-purple-500/15 text-purple-600 dark:text-purple-400 border-0"
                              title={`Approved ${new Date(sub.gigfiApprovedAt).toLocaleString()}`}
                            >
                              Approved {new Date(sub.gigfiApprovedAt).toLocaleDateString()}
                            </Badge>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <Building2 size={12} />
                            <span data-testid={`text-business-${sub.id}`}>{biz}</span>
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Mail size={12} />
                            <span data-testid={`text-email-${sub.id}`}>{sub.email}</span>
                            <CopyButton value={sub.email} label="email" />
                          </span>
                          {sub.phone && (
                            <span className="flex items-center gap-1.5">
                              <Phone size={12} />
                              <span data-testid={`text-phone-${sub.id}`}>{sub.phone}</span>
                              <CopyButton value={sub.phone} label="phone" />
                            </span>
                          )}
                        </div>

                        {sub.gigfiDecisionId && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Hash size={11} />
                            <span>Decision ID:</span>
                            <code
                              className="font-mono bg-muted px-1.5 py-0.5 rounded text-xs"
                              data-testid={`text-decision-id-${sub.id}`}
                            >
                              {sub.gigfiDecisionId}
                            </code>
                            <CopyButton value={sub.gigfiDecisionId} label="decision ID" />
                          </div>
                        )}
                      </div>

                      {/* Right: actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        {isAccepted && sub.gigfiRedirectUrl && (
                          <Button
                            size="sm"
                            asChild
                            data-testid={`button-finish-${sub.id}`}
                          >
                            <a
                              href={sub.gigfiRedirectUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5"
                            >
                              Finish Process
                              <ExternalLink size={12} />
                            </a>
                          </Button>
                        )}
                        <span className="text-xs text-muted-foreground whitespace-nowrap" title={sub.gigfiSubmittedAt ? `Submitted ${new Date(sub.gigfiSubmittedAt).toLocaleString()}` : "Submission date unknown"}>
                          {sub.gigfiSubmittedAt
                            ? new Date(sub.gigfiSubmittedAt).toLocaleDateString()
                            : sub.createdAt
                              ? new Date(sub.createdAt).toLocaleDateString()
                              : ""}
                        </span>
                      </div>

                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
