import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import {
  CheckCircle2,
  ThumbsDown,
  ShieldAlert,
  Banknote,
  ArrowRightLeft,
  Loader2,
} from "lucide-react";
import type { BusinessUnderwritingDecision } from "@shared/schema";

type DecisionStatus = "approved" | "declined" | "unqualified" | "funded";

const STATUS_CONFIG: Record<DecisionStatus, { label: string; icon: typeof CheckCircle2; color: string }> = {
  approved: { label: "Approved", icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400" },
  declined: { label: "Declined", icon: ThumbsDown, color: "text-red-600 dark:text-red-400" },
  unqualified: { label: "Unqualified", icon: ShieldAlert, color: "text-amber-600 dark:text-amber-400" },
  funded: { label: "Funded", icon: Banknote, color: "text-blue-600 dark:text-blue-400" },
};

interface StatusToggleProps {
  decision: BusinessUnderwritingDecision;
  currentStatus: DecisionStatus;
}

export function StatusToggle({ decision, currentStatus }: StatusToggleProps) {
  const { toast } = useToast();
  const [confirmTarget, setConfirmTarget] = useState<DecisionStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const otherStatuses = (Object.keys(STATUS_CONFIG) as DecisionStatus[]).filter(
    (s) => s !== currentStatus
  );

  const handleStatusChange = async (newStatus: DecisionStatus) => {
    setLoading(true);
    try {
      const updates: Record<string, any> = { status: newStatus };

      if (newStatus === "funded" && !decision.fundedDate) {
        updates.fundedDate = new Date().toISOString();
      }

      if (newStatus !== "funded" && decision.fundedDate) {
        updates.fundedDate = null;
      }

      const res = await fetch(`/api/underwriting-decisions/${decision.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(updates),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update status");
      }

      const targetLabel = STATUS_CONFIG[newStatus].label;
      toast({
        title: "Status Updated",
        description: `${decision.businessName || decision.businessEmail} moved to ${targetLabel}.`,
      });

      queryClient.invalidateQueries({ queryKey: ["/api/underwriting-decisions"] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to change status.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setConfirmTarget(null);
    }
  };

  const CurrentIcon = STATUS_CONFIG[currentStatus].icon;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={loading}
            data-testid={`status-toggle-${decision.id}`}
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <ArrowRightLeft className="w-3.5 h-3.5 mr-1.5" />
            )}
            Move to...
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {otherStatuses.map((status) => {
            const config = STATUS_CONFIG[status];
            const Icon = config.icon;
            return (
              <DropdownMenuItem
                key={status}
                onClick={() => setConfirmTarget(status)}
                data-testid={`move-to-${status}-${decision.id}`}
              >
                <Icon className={`w-4 h-4 mr-2 ${config.color}`} />
                {config.label}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={!!confirmTarget} onOpenChange={(open) => !open && setConfirmTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Move to {confirmTarget ? STATUS_CONFIG[confirmTarget].label : ""}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will change{" "}
              <span className="font-semibold">{decision.businessName || decision.businessEmail}</span>{" "}
              from <span className="font-semibold">{STATUS_CONFIG[currentStatus].label}</span> to{" "}
              <span className="font-semibold">{confirmTarget ? STATUS_CONFIG[confirmTarget].label : ""}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="cancel-status-change">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmTarget && handleStatusChange(confirmTarget)}
              data-testid="confirm-status-change"
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
