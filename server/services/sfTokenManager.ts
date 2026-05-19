/**
 * Salesforce Token Manager — single source of truth for SF OAuth2 tokens.
 *
 * Both salesforce.ts (outbound sync) and salesforcePoll.ts (inbound poll) use
 * this module instead of maintaining their own token caches.
 *
 * Auth flow:
 *   SF_REFRESH_TOKEN → refresh_token grant → new access_token (cached 90 min)
 *   Falls back to SF_ACCESS_TOKEN env var if no refresh token is configured.
 */

const SF_LOGIN_URL = process.env.SF_LOGIN_URL || "https://test.salesforce.com";
const SF_INSTANCE_URL = process.env.SF_INSTANCE_URL || "";
const SF_REFRESH_TOKEN = process.env.SF_REFRESH_TOKEN || "";

let cachedAccessToken = process.env.SF_ACCESS_TOKEN || "";
let tokenExpiresAt = 0; // epoch ms — 0 = needs refresh on first call

/**
 * Refresh the access token via OAuth2 refresh_token grant.
 * Returns the (possibly stale) cached token if refresh fails.
 */
async function refreshAccessToken(): Promise<string> {
  if (!SF_REFRESH_TOKEN) {
    return cachedAccessToken;
  }

  try {
    const res = await fetch(`${SF_LOGIN_URL}/services/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: SF_REFRESH_TOKEN,
        client_id: "PlatformCLI",
      }),
    });

    const data = (await res.json()) as any;
    if (data.access_token) {
      cachedAccessToken = data.access_token;
      tokenExpiresAt = Date.now() + 90 * 60 * 1000;
      console.log("[SF Auth] Token refreshed successfully");
      return cachedAccessToken;
    }

    console.error("[SF Auth] Refresh failed:", data.error, data.error_description);
    return cachedAccessToken;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[SF Auth] Refresh error:", message);
    return cachedAccessToken;
  }
}

/**
 * Get a valid access token, refreshing if expired or missing.
 */
export async function getAccessToken(): Promise<string> {
  if (!cachedAccessToken || Date.now() > tokenExpiresAt) {
    return refreshAccessToken();
  }
  return cachedAccessToken;
}

/**
 * Force token expiry — call this after receiving a 401 to trigger
 * a refresh on the next getAccessToken() call.
 */
export function invalidateToken(): void {
  tokenExpiresAt = 0;
}

/**
 * Check whether SF credentials are configured at all.
 */
export function isSalesforceConfigured(): boolean {
  return !!(SF_INSTANCE_URL && (cachedAccessToken || SF_REFRESH_TOKEN));
}

/**
 * Build Authorization + Content-Type headers for SF API calls.
 */
export function sfHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

/**
 * Make a SF REST API call with automatic 401 retry.
 */
export async function sfApi(
  method: string,
  path: string,
  body?: object
): Promise<{ success: boolean; id?: string; data?: any; error?: string }> {
  try {
    let token = await getAccessToken();
    let res = await fetch(`${SF_INSTANCE_URL}/services/data/v66.0${path}`, {
      method,
      headers: sfHeaders(token),
      body: body ? JSON.stringify(body) : undefined,
    });

    // Auto-retry on 401 with a fresh token
    if (res.status === 401 && SF_REFRESH_TOKEN) {
      console.log("[SF API] 401 — refreshing token and retrying...");
      invalidateToken();
      token = await getAccessToken();
      res = await fetch(`${SF_INSTANCE_URL}/services/data/v66.0${path}`, {
        method,
        headers: sfHeaders(token),
        body: body ? JSON.stringify(body) : undefined,
      });
    }

    if (res.status === 204) return { success: true };
    const data = await res.json();
    if (res.ok) return { success: true, id: data.id, data };

    const msg = Array.isArray(data)
      ? data.map((e: any) => e.message).join("; ")
      : data.message || JSON.stringify(data);
    return { success: false, error: msg };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}

/**
 * Run a SOQL query against SF with automatic 401 retry.
 * Returns an empty array on failure (logged, not thrown).
 */
export async function sfQuery(soql: string): Promise<any[]> {
  try {
    const token = await getAccessToken();
    const url = `${SF_INSTANCE_URL}/services/data/v66.0/query?q=${encodeURIComponent(soql)}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });

    if (res.status === 401 && SF_REFRESH_TOKEN) {
      invalidateToken();
      const freshToken = await getAccessToken();
      const retry = await fetch(url, { headers: { Authorization: `Bearer ${freshToken}` } });
      const data = (await retry.json()) as any;
      return data.records || [];
    }

    const data = (await res.json()) as any;
    return data.records || [];
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[SF Query] Error:", message);
    return [];
  }
}

/** Re-export for convenience */
export { SF_INSTANCE_URL, SF_REFRESH_TOKEN };
