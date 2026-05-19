const DIALER_URL = "https://power-dialer-ten.vercel.app";
const frame = document.getElementById("dialer-frame");
const loading = document.getElementById("loading");
const navButtons = document.querySelectorAll(".nav-btn");

// Track which nav path is currently active
let activePath = "/";

frame.addEventListener("load", () => {
  frame.classList.add("loaded");
  loading.style.display = "none";
});

// Timeout fallback — show iframe even if load event doesn't fire
setTimeout(() => {
  frame.classList.add("loaded");
  loading.style.display = "none";
}, 5000);

// ── Nav Bar ───────────────────────────────────────────────────────

function setActiveNav(path) {
  activePath = path;
  navButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.path === path);
  });
}

navButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const path = btn.dataset.path;
    if (path === activePath) return; // already on this page
    setActiveNav(path);
    frame.src = `${DIALER_URL}${path}`;
  });
});

// ── Messages from Background ──────────────────────────────────────

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "SET_DIAL_NUMBER") {
    const params = new URLSearchParams({ dialNumber: message.phone });
    if (message.sfRecordId) params.set("sfId", message.sfRecordId);
    if (message.sfObjectType) params.set("sfType", message.sfObjectType);
    if (message.ghlContactId) params.set("ghlId", message.ghlContactId);
    if (message.contactName) params.set("name", message.contactName);
    if (message.contactEmail) params.set("email", message.contactEmail);
    frame.src = `${DIALER_URL}?${params.toString()}`;
    setActiveNav("/");
  }

  if (message.type === "SET_SIDEPANEL_URL") {
    const path = message.path || "/";
    frame.src = `${DIALER_URL}${path}`;
    setActiveNav(path);
  }
});
