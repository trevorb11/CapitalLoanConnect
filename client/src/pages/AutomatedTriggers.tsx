import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import {
  ArrowLeft,
  Bell,
  Clock,
  MessageSquare,
  CheckCircle2,
  DollarSign,
  FileText,
  AlertTriangle,
  Loader2,
} from "lucide-react";

interface TriggerConfig {
  key: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  category: "instant" | "scheduled";
}

const TRIGGERS: TriggerConfig[] = [
  {
    key: "trigger.app_abandoned",
    label: "Application Abandoned",
    description:
      "SMS + email when a merchant leaves the application before completing (e.g. before uploading bank statements).",
    icon: <AlertTriangle className="w-5 h-5 text-amber-500" />,
    category: "instant",
  },
  {
    key: "trigger.approval_congratulations",
    label: "Approval Congratulations",
    description:
      "SMS + email congratulating the merchant when an approval is issued, with a link to accept their offer.",
    icon: <CheckCircle2 className="w-5 h-5 text-green-500" />,
    category: "instant",
  },
  {
    key: "trigger.funded_congratulations",
    label: "Funded Congratulations",
    description:
      'SMS + email congratulating the merchant when their deal status changes to "funded".',
    icon: <DollarSign className="w-5 h-5 text-emerald-500" />,
    category: "instant",
  },
  {
    key: "trigger.bank_statements_reminder",
    label: "Bank Statements Reminder",
    description:
      "SMS + email reminder sent ~2 hours after application if bank statements haven't been uploaded.",
    icon: <FileText className="w-5 h-5 text-blue-500" />,
    category: "scheduled",
  },
  {
    key: "trigger.approval_stale_reminder",
    label: "Stale Approval Reminders",
    description:
      "Escalating SMS + email reminders at 24h, 48h, and 72h if an approval hasn't been accepted.",
    icon: <Clock className="w-5 h-5 text-orange-500" />,
    category: "scheduled",
  },
  {
    key: "trigger.scheduled_checks",
    label: "Scheduled Checks (Master)",
    description:
      "Master toggle for ALL scheduled/timed checks (bank statement reminders + stale approval reminders). Turning this off stops the 30-minute background scan entirely.",
    icon: <Bell className="w-5 h-5 text-purple-500" />,
    category: "scheduled",
  },
];

export default function AutomatedTriggers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check auth
  const { data: authData, isLoading: authLoading } = useQuery<{
    isAuthenticated: boolean;
    role: string;
  }>({
    queryKey: ["/api/auth/status"],
    queryFn: async () => {
      const res = await fetch("/api/auth/status");
      return res.json();
    },
  });

  // Fetch settings
  const {
    data: settings,
    isLoading: settingsLoading,
  } = useQuery<Record<string, string>>({
    queryKey: ["/api/settings"],
    queryFn: async () => {
      const res = await fetch("/api/settings");
      if (!res.ok) throw new Error("Failed to fetch settings");
      return res.json();
    },
    enabled: authData?.isAuthenticated && authData?.role === "admin",
  });

  // Toggle mutation
  const toggleMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const res = await fetch(`/api/settings/${encodeURIComponent(key)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
      });
      if (!res.ok) throw new Error("Failed to save setting");
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      const trigger = TRIGGERS.find((t) => t.key === variables.key);
      const isOn = variables.value !== "false";
      toast({
        title: `${trigger?.label || variables.key} ${isOn ? "enabled" : "disabled"}`,
        description: isOn
          ? "This trigger is now active."
          : "This trigger is now paused. No messages will be sent.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update setting. Please try again.",
        variant: "destructive",
      });
    },
  });

  function isEnabled(key: string): boolean {
    if (!settings) return true; // default on
    const val = settings[key];
    if (val === undefined || val === null) return true;
    return val !== "false";
  }

  function handleToggle(key: string) {
    const current = isEnabled(key);
    toggleMutation.mutate({ key, value: current ? "false" : "true" });
  }

  // Enable/disable all at once
  function handleToggleAll(enabled: boolean) {
    for (const t of TRIGGERS) {
      toggleMutation.mutate({ key: t.key, value: enabled ? "true" : "false" });
    }
  }

  if (authLoading || settingsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!authData?.isAuthenticated || authData.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8 text-center max-w-md">
          <h2 className="text-xl font-bold mb-2">Admin Access Required</h2>
          <p className="text-muted-foreground mb-4">
            Only admins can manage automated messaging triggers.
          </p>
          <Link href="/dashboard">
            <Button>Back to Dashboard</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const instantTriggers = TRIGGERS.filter((t) => t.category === "instant");
  const scheduledTriggers = TRIGGERS.filter((t) => t.category === "scheduled");
  const allEnabled = TRIGGERS.every((t) => isEnabled(t.key));
  const allDisabled = TRIGGERS.every((t) => !isEnabled(t.key));

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <MessageSquare className="w-6 h-6 text-primary" />
              Automated Follow-ups
            </h1>
            <p className="text-muted-foreground mt-1">
              Toggle automated SMS and email triggers on or off. Changes take
              effect immediately.
            </p>
          </div>
        </div>

        {/* Bulk actions */}
        <div className="flex gap-3 mb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleToggleAll(true)}
            disabled={allEnabled || toggleMutation.isPending}
          >
            Enable All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleToggleAll(false)}
            disabled={allDisabled || toggleMutation.isPending}
          >
            Disable All
          </Button>
        </div>

        {/* Instant Triggers */}
        <h2 className="text-lg font-semibold mb-3 text-muted-foreground uppercase tracking-wide text-sm">
          Instant Triggers
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Fire immediately when the event happens (approval issued, app
          abandoned, etc.)
        </p>
        <div className="space-y-3 mb-8">
          {instantTriggers.map((trigger) => (
            <TriggerCard
              key={trigger.key}
              trigger={trigger}
              enabled={isEnabled(trigger.key)}
              onToggle={() => handleToggle(trigger.key)}
              isPending={toggleMutation.isPending}
            />
          ))}
        </div>

        {/* Scheduled Triggers */}
        <h2 className="text-lg font-semibold mb-3 text-muted-foreground uppercase tracking-wide text-sm">
          Scheduled Triggers
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Checked every 30 minutes by a background process. The "Master" toggle
          stops the entire background scan.
        </p>
        <div className="space-y-3">
          {scheduledTriggers.map((trigger) => (
            <TriggerCard
              key={trigger.key}
              trigger={trigger}
              enabled={isEnabled(trigger.key)}
              onToggle={() => handleToggle(trigger.key)}
              isPending={toggleMutation.isPending}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function TriggerCard({
  trigger,
  enabled,
  onToggle,
  isPending,
}: {
  trigger: TriggerConfig;
  enabled: boolean;
  onToggle: () => void;
  isPending: boolean;
}) {
  return (
    <Card
      className={`p-4 flex items-start gap-4 transition-opacity ${
        !enabled ? "opacity-60" : ""
      }`}
    >
      <div className="mt-0.5">{trigger.icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-medium">{trigger.label}</h3>
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              enabled
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
            }`}
          >
            {enabled ? "Active" : "Paused"}
          </span>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {trigger.description}
        </p>
      </div>
      <Switch
        checked={enabled}
        onCheckedChange={onToggle}
        disabled={isPending}
      />
    </Card>
  );
}
