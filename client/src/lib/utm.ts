// UTM Parameter Tracking Utility
// Captures UTM parameters from URL and stores them in localStorage for later use
// Also detects source from referrer URL when no UTM params exist

export interface UTMParams {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  referrerUrl?: string;
  detectedSource?: string; // Auto-detected from referrer when no UTM
}

const UTM_STORAGE_KEY = "tcg_utm_params";

// Source detection patterns - maps referrer domain patterns to source names
const SOURCE_PATTERNS: { pattern: RegExp; source: string; medium: string }[] = [
  // Social Media
  { pattern: /facebook\.com|fb\.com|fb\.me/i, source: "facebook", medium: "social" },
  { pattern: /instagram\.com/i, source: "instagram", medium: "social" },
  { pattern: /linkedin\.com|lnkd\.in/i, source: "linkedin", medium: "social" },
  { pattern: /twitter\.com|t\.co|x\.com/i, source: "twitter", medium: "social" },
  { pattern: /tiktok\.com/i, source: "tiktok", medium: "social" },
  { pattern: /pinterest\.com/i, source: "pinterest", medium: "social" },
  { pattern: /reddit\.com/i, source: "reddit", medium: "social" },
  { pattern: /youtube\.com|youtu\.be/i, source: "youtube", medium: "video" },
  
  // Search Engines
  { pattern: /google\.(com|co\.\w{2})/i, source: "google", medium: "organic" },
  { pattern: /bing\.com/i, source: "bing", medium: "organic" },
  { pattern: /yahoo\.com/i, source: "yahoo", medium: "organic" },
  { pattern: /duckduckgo\.com/i, source: "duckduckgo", medium: "organic" },
  
  // Email Providers (indicates email campaigns)
  { pattern: /mail\.google\.com|gmail\.com/i, source: "gmail", medium: "email" },
  { pattern: /outlook\.(com|live\.com)|hotmail\.com/i, source: "outlook", medium: "email" },
  { pattern: /mail\.yahoo\.com/i, source: "yahoo_mail", medium: "email" },
  
  // Marketing/CRM platforms
  { pattern: /mailchimp\.com|list-manage\.com/i, source: "mailchimp", medium: "email" },
  { pattern: /constantcontact\.com/i, source: "constant_contact", medium: "email" },
  { pattern: /hubspot\.com/i, source: "hubspot", medium: "email" },
  { pattern: /gohighlevel\.com|leadconnectorhq\.com|msgsndr\.com/i, source: "ghl", medium: "email" },
  
  // SMS/Messaging
  { pattern: /twilio\.com/i, source: "twilio", medium: "sms" },
];

// Detect source from referrer URL
function detectSourceFromReferrer(referrerUrl: string): { source?: string; medium?: string } {
  for (const { pattern, source, medium } of SOURCE_PATTERNS) {
    if (pattern.test(referrerUrl)) {
      return { source, medium };
    }
  }
  
  // Try to extract domain as source if no pattern matches
  try {
    const url = new URL(referrerUrl);
    const domain = url.hostname.replace(/^www\./, '').split('.')[0];
    if (domain && domain !== window.location.hostname.replace(/^www\./, '').split('.')[0]) {
      return { source: domain, medium: "referral" };
    }
  } catch {
    // Invalid URL, ignore
  }
  
  return {};
}

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
  const referrer = document.referrer;
  if (referrer && !referrer.includes(window.location.hostname)) {
    params.referrerUrl = referrer;
    
    // If no UTM source, try to detect from referrer
    if (!utmSource) {
      const detected = detectSourceFromReferrer(referrer);
      if (detected.source) {
        params.utmSource = detected.source;
        params.detectedSource = detected.source;
        console.log(`[UTM] Auto-detected source from referrer: ${detected.source} (${detected.medium})`);
      }
      if (detected.medium && !utmMedium) {
        params.utmMedium = detected.medium;
      }
    }
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
