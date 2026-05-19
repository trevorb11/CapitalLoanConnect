// Background service worker — handles messages from content script and popup

const DIALER_URL = "https://power-dialer-ten.vercel.app";
const MAX_RECENT = 10;

// Find an existing dialer tab, or open a new one
async function openDialer(dialUrl) {
  const tabs = await chrome.tabs.query({ url: `${DIALER_URL}/*` });
  if (tabs.length > 0) {
    await chrome.tabs.update(tabs[0].id, { url: dialUrl, active: true });
    await chrome.windows.update(tabs[0].windowId, { focused: true });
  } else {
    await chrome.tabs.create({ url: dialUrl });
  }
}

// Build dialer URL with all available context params
function buildDialUrl(params = {}) {
  const url = new URL(params.path || "/", DIALER_URL);
  if (params.phone) url.searchParams.set("dialNumber", params.phone);
  if (params.sfRecordId) url.searchParams.set("sfId", params.sfRecordId);
  if (params.sfObjectType) url.searchParams.set("sfType", params.sfObjectType);
  if (params.ghlContactId) url.searchParams.set("ghlId", params.ghlContactId);
  if (params.contactEmail) url.searchParams.set("email", params.contactEmail);
  if (params.contactName) url.searchParams.set("name", params.contactName);
  return url.toString();
}

// Save a dialed number to recent history
async function saveRecentNumber(phone, contactName, contactEmail) {
  const { recentNumbers = [] } = await chrome.storage.local.get("recentNumbers");

  // Remove duplicate if exists
  const filtered = recentNumbers.filter((r) => r.phone !== phone);

  // Add to front
  filtered.unshift({
    phone,
    name: contactName || null,
    email: contactEmail || null,
    dialedAt: Date.now(),
  });

  // Keep only the most recent
  await chrome.storage.local.set({ recentNumbers: filtered.slice(0, MAX_RECENT) });
}

// Listen for messages from content script, popup, and side panel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "DIAL_NUMBER") {
    const dialUrl = buildDialUrl(message);

    // Save to recent numbers
    saveRecentNumber(message.phone, message.contactName, message.contactEmail);

    // Try side panel first, fallback to tab reuse
    if (sender.tab?.id) {
      chrome.sidePanel.open({ tabId: sender.tab.id }).then(() => {
        setTimeout(() => {
          chrome.runtime.sendMessage({
            type: "SET_DIAL_NUMBER",
            phone: message.phone,
            sfRecordId: message.sfRecordId,
            sfObjectType: message.sfObjectType,
            ghlContactId: message.ghlContactId,
            contactName: message.contactName,
            contactEmail: message.contactEmail,
          }).catch(() => {});
        }, 500);
      }).catch(() => {
        openDialer(dialUrl);
      });
    } else {
      openDialer(dialUrl);
    }

    sendResponse({ success: true });
  }

  if (message.type === "OPEN_DIALER") {
    openDialer(message.url || DIALER_URL);
    sendResponse({ success: true });
  }

  if (message.type === "OPEN_PAGE") {
    const url = `${DIALER_URL}${message.path || ""}`;
    openDialer(url);
    sendResponse({ success: true });
  }

  if (message.type === "NAVIGATE_SIDEPANEL") {
    chrome.runtime.sendMessage({
      type: "SET_SIDEPANEL_URL",
      path: message.path,
    }).catch(() => {});
    sendResponse({ success: true });
  }

  if (message.type === "GET_RECENT_NUMBERS") {
    chrome.storage.local.get("recentNumbers").then((data) => {
      sendResponse({ recentNumbers: data.recentNumbers || [] });
    });
    return true; // keep channel open for async response
  }

  if (message.type === "CLEAR_RECENT_NUMBERS") {
    chrome.storage.local.set({ recentNumbers: [] }).then(() => {
      sendResponse({ success: true });
    });
    return true;
  }

  return true;
});

// Keyboard shortcut handler (Alt+D)
chrome.commands.onCommand.addListener(async (command) => {
  if (command === "open-side-panel") {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        await chrome.sidePanel.open({ tabId: tab.id });
      }
    } catch {
      await openDialer(DIALER_URL);
    }
  }
});

// Enable side panel behavior
try {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch(() => {});
} catch {}
