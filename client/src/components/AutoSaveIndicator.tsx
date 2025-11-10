import { Check, Cloud, AlertCircle } from "lucide-react";

interface AutoSaveIndicatorProps {
  status: "idle" | "saving" | "saved" | "error";
  lastSaved?: Date;
}

export function AutoSaveIndicator({ status, lastSaved }: AutoSaveIndicatorProps) {
  if (status === "idle") return null;

  return (
    <div className="flex items-center gap-2 text-sm" data-testid="autosave-indicator">
      {status === "saving" && (
        <>
          <Cloud className="w-4 h-4 text-muted-foreground animate-pulse" />
          <span className="text-muted-foreground">Saving...</span>
        </>
      )}
      {status === "saved" && (
        <>
          <Check className="w-4 h-4 text-primary" />
          <span className="text-muted-foreground">
            All changes saved
            {lastSaved && (
              <span className="ml-1">
                {new Date(lastSaved).toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </span>
            )}
          </span>
        </>
      )}
      {status === "error" && (
        <>
          <AlertCircle className="w-4 h-4 text-destructive" />
          <span className="text-destructive">Error saving</span>
        </>
      )}
    </div>
  );
}
