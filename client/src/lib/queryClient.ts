import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

/**
 * Handle 401 responses globally — redirect to login when session expires.
 * Called from both apiRequest and getQueryFn.
 */
function handleUnauthorized() {
  // Only redirect if we're not already on a public page
  const publicPaths = ["/", "/intake", "/funding-quiz", "/sba", "/gig", "/merchant", "/partner", "/apply", "/r/", "/sig", "/congratulations", "/success", "/approved"];
  const currentPath = window.location.pathname;
  const isPublicPage = publicPaths.some((p) => currentPath === p || currentPath.startsWith(p + "/"));

  if (!isPublicPage && !currentPath.startsWith("/dashboard")) {
    // Already on a non-dashboard page, no redirect needed
    return;
  }

  if (currentPath.startsWith("/dashboard") || currentPath.startsWith("/rep-console") ||
      currentPath.startsWith("/approvals") || currentPath.startsWith("/funded") ||
      currentPath.startsWith("/declines") || currentPath.startsWith("/unqualified") ||
      currentPath.startsWith("/messaging") || currentPath.startsWith("/sms-inbox") ||
      currentPath.startsWith("/lead-sources") || currentPath.startsWith("/leaderboard") ||
      currentPath.startsWith("/merchant-profile") || currentPath.startsWith("/gigfi-internal")) {
    window.location.href = "/dashboard";
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  if (res.status === 401) {
    handleUnauthorized();
  }

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (res.status === 401) {
      if (unauthorizedBehavior === "returnNull") return null;
      handleUnauthorized();
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes — data refreshes on re-fetch after this
      retry: (failureCount, error) => {
        // Don't retry on auth errors or client errors
        if (error instanceof Error && error.message.startsWith("401")) return false;
        if (error instanceof Error && error.message.startsWith("403")) return false;
        if (error instanceof Error && error.message.startsWith("404")) return false;
        return failureCount < 2;
      },
    },
    mutations: {
      retry: false,
    },
  },
});
