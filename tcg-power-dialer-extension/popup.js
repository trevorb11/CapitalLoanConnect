const DIALER_URL = "https://power-dialer-ten.vercel.app";

// Reuse existing dialer tab or open new one
async function openDialerTab(url) {
  const tabs = await chrome.tabs.query({ url: `${DIALER_URL}/*` });
  if (tabs.length > 0) {
    await chrome.tabs.update(tabs[0].id, { url: url || DIALER_URL, active: true });
    await chrome.windows.update(tabs[0].windowId, { focused: true });
  } else {
    await chrome.tabs.create({ url: url || DIALER_URL });
  }
  window.close();
}

function normalizePhone(phone) {
  let digits = phone.replace(/\D/g, "");
  if (digits.length === 10) digits = "1" + digits;
  if (!digits.startsWith("+")) digits = "+" + digits;
  return digits;
}

// Format relative time
function timeAgo(ts) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

// ── Recent Numbers ────────────────────────────────────────────────

async function loadRecentNumbers() {
  const { recentNumbers = [] } = await chrome.storage.local.get("recentNumbers");
  const list = document.getElementById("recent-list");
  const clearBtn = document.getElementById("clear-recent");

  if (recentNumbers.length === 0) {
    list.innerHTML = '<div class="recent-empty">No recent calls</div>';
    clearBtn.style.display = "none";
    return;
  }

  clearBtn.style.display = "inline";
  list.innerHTML = "";

  recentNumbers.forEach((entry) => {
    const item = document.createElement("button");
    item.className = "recent-item";
    item.title = `Dial ${entry.phone}`;

    const phoneSpan = document.createElement("span");
    phoneSpan.className = "recent-phone";
    phoneSpan.textContent = entry.phone;
    item.appendChild(phoneSpan);

    if (entry.name) {
      const nameSpan = document.createElement("span");
      nameSpan.className = "recent-name";
      nameSpan.textContent = entry.name;
      item.appendChild(nameSpan);
    }

    const timeSpan = document.createElement("span");
    timeSpan.className = "recent-time";
    timeSpan.textContent = timeAgo(entry.dialedAt);
    item.appendChild(timeSpan);

    item.addEventListener("click", () => {
      openDialerTab(`${DIALER_URL}?dialNumber=${encodeURIComponent(entry.phone)}`);
    });

    list.appendChild(item);
  });
}

// ── Event Listeners ───────────────────────────────────────────────

// Open dialer in new tab (home / application page)
document.getElementById("open-dialer").addEventListener("click", (e) => {
  e.preventDefault();
  openDialerTab();
});

// Open side panel
document.getElementById("open-sidepanel").addEventListener("click", async (e) => {
  e.preventDefault();
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await chrome.sidePanel.open({ tabId: tab.id });
    window.close();
  } catch {
    openDialerTab();
  }
});

// Quick access pages
document.getElementById("open-rep-console").addEventListener("click", (e) => {
  e.preventDefault();
  openDialerTab(`${DIALER_URL}/rep-console`);
});

document.getElementById("open-dashboard").addEventListener("click", (e) => {
  e.preventDefault();
  openDialerTab(`${DIALER_URL}/dashboard`);
});

document.getElementById("open-messaging").addEventListener("click", (e) => {
  e.preventDefault();
  openDialerTab(`${DIALER_URL}/sms-inbox`);
});

// Clear recent numbers
document.getElementById("clear-recent").addEventListener("click", async (e) => {
  e.preventDefault();
  e.stopPropagation();
  await chrome.storage.local.set({ recentNumbers: [] });
  loadRecentNumbers();
});

// Quick dial
const dialInput = document.getElementById("quick-dial");
const dialBtn = document.getElementById("dial-btn");

dialBtn.addEventListener("click", () => {
  const phone = dialInput.value.trim();
  if (!phone) return;
  const normalized = normalizePhone(phone);

  // Save to recent via background
  chrome.runtime.sendMessage({
    type: "DIAL_NUMBER",
    phone: normalized,
  }).catch(() => {});

  openDialerTab(`${DIALER_URL}?dialNumber=${encodeURIComponent(normalized)}`);
});

dialInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") dialBtn.click();
});

// Init
dialInput.focus();
loadRecentNumbers();
