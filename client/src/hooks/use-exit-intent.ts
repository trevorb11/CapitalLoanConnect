import { useEffect, useRef } from 'react';

/**
 * Hook that fires an abandonment beacon when the user leaves the page
 * (tab close, navigation away, or visibility change) while an application
 * is in progress but not yet completed.
 *
 * Uses navigator.sendBeacon for reliable delivery even during page unload.
 */
export function useExitIntent(opts: {
  applicationId: string | null;
  isCompleted: boolean;
  abandonedPage: string;
  currentStep?: number;
}) {
  const { applicationId, isCompleted, abandonedPage, currentStep } = opts;
  const hasFiredRef = useRef(false);

  useEffect(() => {
    // Reset fire state when applicationId changes
    hasFiredRef.current = false;
  }, [applicationId]);

  useEffect(() => {
    if (!applicationId || isCompleted) return;

    function fireAbandon() {
      if (hasFiredRef.current) return;
      hasFiredRef.current = true;

      const payload = JSON.stringify({
        abandonedPage,
        lastStep: currentStep,
      });

      // sendBeacon is the most reliable way to deliver data during unload
      if (navigator.sendBeacon) {
        navigator.sendBeacon(
          `/api/applications/${applicationId}/abandon`,
          new Blob([payload], { type: 'application/json' }),
        );
      } else {
        // Fallback: fire-and-forget fetch
        fetch(`/api/applications/${applicationId}/abandon`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true,
        }).catch(() => {});
      }
    }

    function handleBeforeUnload() {
      fireAbandon();
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'hidden') {
        fireAbandon();
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [applicationId, isCompleted, abandonedPage, currentStep]);
}
