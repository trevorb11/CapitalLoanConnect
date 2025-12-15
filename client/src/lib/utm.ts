// UTM Parameter Tracking Utility
// Captures UTM parameters from URL and stores them in localStorage for later use

export interface UTMParams {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  referrerUrl?: string;
}

const UTM_STORAGE_KEY = "tcg_utm_params";

// Capture UTM parameters from the current URL
export function captureUTMParams(): UTMParams {
  const urlParams = new URLSearchParams(window.location.search);
  
  const params: UTMParams = {};
  
  // Standard UTM parameters
  const utmSource = urlParams.get("utm_source");
  const utmMedium = urlParams.get("utm_medium");
  const utmCampaign = urlParams.get("utm_campaign");
  const utmTerm = urlParams.get("utm_term");
  const utmContent = urlParams.get("utm_content");
  
  if (utmSource) params.utmSource = utmSource;
  if (utmMedium) params.utmMedium = utmMedium;
  if (utmCampaign) params.utmCampaign = utmCampaign;
  if (utmTerm) params.utmTerm = utmTerm;
  if (utmContent) params.utmContent = utmContent;
  
  // Capture referrer URL (where user came from)
  if (document.referrer && !document.referrer.includes(window.location.hostname)) {
    params.referrerUrl = document.referrer;
  }
  
  return params;
}

// Store UTM params in localStorage (only if we have new params)
export function storeUTMParams(): void {
  const newParams = captureUTMParams();
  
  // Only store if we have at least one UTM param
  if (Object.keys(newParams).length > 0) {
    // Get existing params and merge (new params take precedence)
    const existingParams = getStoredUTMParams();
    const mergedParams = { ...existingParams, ...newParams };
    
    try {
      localStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(mergedParams));
      console.log("[UTM] Stored params:", mergedParams);
    } catch (e) {
      console.warn("[UTM] Failed to store params:", e);
    }
  }
}

// Get stored UTM params from localStorage
export function getStoredUTMParams(): UTMParams {
  try {
    const stored = localStorage.getItem(UTM_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as UTMParams;
    }
  } catch (e) {
    console.warn("[UTM] Failed to retrieve params:", e);
  }
  return {};
}

// Clear stored UTM params (call after successful form submission if desired)
export function clearStoredUTMParams(): void {
  try {
    localStorage.removeItem(UTM_STORAGE_KEY);
  } catch (e) {
    console.warn("[UTM] Failed to clear params:", e);
  }
}

// Initialize UTM tracking - call this on app load
export function initUTMTracking(): void {
  storeUTMParams();
}
