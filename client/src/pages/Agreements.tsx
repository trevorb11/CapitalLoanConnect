import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import {
  FileText,
  ExternalLink,
  Copy,
  Plus,
  Check,
  Clock,
  ArrowLeft,
} from "lucide-react";
import { useState } from "react";

interface Agreement {
  id: number;
  token: string | null;
  name: string | null;
  status: string;
  clientName: string | null;
  projectFee: string | null;
  submittedAt: string | null;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "complete") {
    return (
      <Badge className="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300">
        <Check className="w-3 h-3 mr-1" />
        Signed
      </Badge>
    );
  }
  return (
    <Badge variant="secondary">
      <Clock className="w-3 h-3 mr-1" />
      Draft
    </Badge>
  );
}

function CopyLinkButton({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    const url = `${window.location.origin}/services/website/contract?token=${token}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={handleCopy}
      data-testid={`button-copy-link-${token}`}
      title="Copy shareable link"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
    </Button>
  );
}

export default function Agreements() {
  const { toast } = useToast();

  const { data: agreements, isLoading, error } = useQuery<Agreement[]>({
    queryKey: ["/api/contracts/website/list"],
    retry: false,
  });

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="p-8 text-center max-w-sm w-full">
          <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h2 className="font-semibold mb-2">Access Required</h2>
          <p className="text-sm text-muted-foreground mb-4">
            You must be signed in as an admin or agent to view agreements.
          </p>
          <Link href="/dashboard">
            <Button variant="outline" className="w-full">Go to Dashboard</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const drafts = (agreements || []).filter(a => a.status !== "complete");
  const signed = (agreements || []).filter(a => a.status === "complete");

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-8 flex-wrap">
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon" data-testid="button-back-dashboard">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Agreements</h1>
              <p className="text-sm text-muted-foreground">Website Build Services Agreements</p>
            </div>
          </div>
          <Link href="/services/website/contract">
            <Button data-testid="button-new-agreement">
              <Plus className="w-4 h-4 mr-2" />
              New Agreement
            </Button>
          </Link>
        </div>

        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-muted/40 rounded-md animate-pulse" />
            ))}
          </div>
        )}

        {!isLoading && (!agreements || agreements.length === 0) && (
          <Card className="p-12 text-center">
            <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-semibold mb-1">No agreements yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first agreement to get started.
            </p>
            <Link href="/services/website/contract">
              <Button data-testid="button-create-first-agreement">
                <Plus className="w-4 h-4 mr-2" />
                New Agreement
              </Button>
            </Link>
          </Card>
        )}

        {!isLoading && drafts.length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Drafts ({drafts.length})
            </h2>
            <div className="space-y-2">
              {drafts.map(a => (
                <AgreementRow key={a.id} agreement={a} />
              ))}
            </div>
          </section>
        )}

        {!isLoading && signed.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Signed ({signed.length})
            </h2>
            <div className="space-y-2">
              {signed.map(a => (
                <AgreementRow key={a.id} agreement={a} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function AgreementRow({ agreement: a }: { agreement: Agreement }) {
  const displayName = a.name || a.clientName || `Agreement #${a.id}`;
  const date = a.submittedAt
    ? new Date(a.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;

  return (
    <Card className="p-4" data-testid={`card-agreement-${a.id}`}>
      <div className="flex items-center gap-4 flex-wrap">
        <div className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
          <FileText className="w-4 h-4 text-primary" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate" data-testid={`text-agreement-name-${a.id}`}>
            {displayName}
          </p>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            {a.clientName && a.name && (
              <span className="text-sm text-muted-foreground">{a.clientName}</span>
            )}
            {a.projectFee && (
              <span className="text-sm text-muted-foreground">${Number(a.projectFee).toLocaleString()}</span>
            )}
            {date && (
              <span className="text-xs text-muted-foreground">{date}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <StatusBadge status={a.status} />
          {a.token && <CopyLinkButton token={a.token} />}
          {a.token && (
            <a
              href={`/services/website/contract?token=${a.token}`}
              target="_blank"
              rel="noopener noreferrer"
              data-testid={`button-open-agreement-${a.id}`}
            >
              <Button size="sm" variant="outline">
                <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                Open
              </Button>
            </a>
          )}
        </div>
      </div>
    </Card>
  );
}
