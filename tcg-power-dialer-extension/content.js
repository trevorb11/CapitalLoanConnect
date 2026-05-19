// Content script — detects phone numbers on webpages and adds "Dial" buttons
// Also detects Salesforce and GoHighLevel pages for richer context

(function () {
  "use strict";

  // Phone regex with lookbehind to avoid matching tails of longer numbers (order IDs, zip+4, etc.)
  // Matches: (555) 123-4567, 555-123-4567, 555.123.4567, +1 555 123 4567, +15551234567
  const PHONE_REGEX = /(?<!\d)(?:\+?1[-.\s]?)?\(?[2-9]\d{2}\)?[-.\s]?\d{3}[-.\s]?\d{4}(?!\d)/g;
  const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const PROCESSED_ATTR = "data-tcg-dial";
  let scanTimer = null;
  let scanCount = 0;
  const MAX_SCANS = 50;

  // ── Platform Detection ──────────────────────────────────────────────

  function isSalesforcePage() {
    const host = window.location.hostname;
    return host.includes(".salesforce.com") || host.includes(".force.com") || host.includes(".lightning.force.com");
  }

  function isGHLPage() {
    const host = window.location.hostname;
    return host.includes("app.gohighlevel.com") || host.includes("highlevel.com") || host.includes(".msgsndr.com");
  }

  // ── Salesforce Context ──────────────────────────────────────────────

  // Extract Salesforce record context from the current URL
  function getSalesforceContext() {
    if (!isSalesforcePage()) return {};
    const path = window.location.pathname;
    const context = {};

    // Lightning URL pattern: /lightning/r/Contact/003XXXX/view
    const lightningMatch = path.match(/\/lightning\/r\/(\w+)\/(\w+)/);
    if (lightningMatch) {
      context.sfObjectType = lightningMatch[1];
      context.sfRecordId = lightningMatch[2];
    }

    // Classic URL pattern: /003XXXX
    if (!context.sfRecordId) {
      const classicMatch = path.match(/\/([a-zA-Z0-9]{15,18})$/);
      if (classicMatch) {
        const id = classicMatch[1];
        const prefix = id.substring(0, 3);
        const prefixMap = {
          "003": "Contact",
          "00Q": "Lead",
          "001": "Account",
          "006": "Opportunity",
          "500": "Case",
          "00T": "Task",
          "00U": "Event",
        };
        context.sfRecordId = id;
        context.sfObjectType = prefixMap[prefix] || "Unknown";
      }
    }

    // Scrape contact details from the Lightning record page
    Object.assign(context, scrapeSalesforceDetails());

    return context;
  }

  // Scrape name, email, phone from a Salesforce Lightning record detail page
  function scrapeSalesforceDetails() {
    const details = {};

    try {
      // Lightning record page: name is in the record header / highlights panel
      // Try the main record title first (works for Contact, Lead, Account)
      const headerName =
        document.querySelector(".slds-page-header__title .uiOutputText") ||
        document.querySelector("h1.slds-page-header__title") ||
        document.querySelector("records-entity-label") ||
        document.querySelector("lightning-formatted-name") ||
        document.querySelector("h1[slot='primaryField']") ||
        document.querySelector(".primaryField .uiOutputText") ||
        document.querySelector("records-highlights-details-item lightning-formatted-text");

      if (headerName) {
        const name = headerName.textContent?.trim();
        if (name && name.length > 1 && name.length < 100) {
          details.contactName = name;
        }
      }

      // Look for email fields in the record detail
      const emailLink = document.querySelector(
        "a[href^='mailto:']," +
        "lightning-formatted-email a," +
        ".forceOutputEmail a," +
        "records-record-layout-item lightning-formatted-email a"
      );
      if (emailLink) {
        const email = emailLink.textContent?.trim() || emailLink.href?.replace("mailto:", "");
        if (email && EMAIL_REGEX.test(email)) {
          details.contactEmail = email;
        }
      }

      // Look for phone fields
      const phoneEl = document.querySelector(
        "lightning-formatted-phone a," +
        ".forceOutputPhone a[href^='tel:']," +
        "records-record-layout-item lightning-formatted-phone a"
      );
      if (phoneEl) {
        const phone = phoneEl.textContent?.trim();
        if (phone) {
          details.contactPhone = phone;
        }
      }
    } catch {
      // DOM scraping is best-effort — never break on errors
    }

    return details;
  }

  // ── GoHighLevel Context ─────────────────────────────────────────────

  // Extract GoHighLevel contact context from the current URL
  function getGHLContext() {
    if (!isGHLPage()) return {};
    const context = {};
    const path = window.location.pathname;

    // GHL contact detail: /contacts/detail/<contactId> or /v2/location/.../contacts/detail/<contactId>
    const contactMatch = path.match(/\/contacts\/detail\/([a-zA-Z0-9]+)/);
    if (contactMatch) {
      context.ghlContactId = contactMatch[1];
    }

    // GHL conversation view: /conversations/<id>
    const convMatch = path.match(/\/conversations\/([a-zA-Z0-9]+)/);
    if (convMatch) {
      context.ghlContactId = convMatch[1];
    }

    // Scrape contact details from the GHL page
    Object.assign(context, scrapeGHLDetails());

    return context;
  }

  // Scrape name, email, phone from a GoHighLevel contact detail or conversation page
  function scrapeGHLDetails() {
    const details = {};

    try {
      // Contact detail page — name is typically in the header/profile section
      const nameEl =
        document.querySelector(".contact-details-name") ||
        document.querySelector("[data-testid='contact-name']") ||
        document.querySelector(".contact-header h2") ||
        document.querySelector(".contact-name") ||
        document.querySelector(".hl_contact-details--name") ||
        document.querySelector(".conversation-header .contact-name");

      // Fallback: look for the profile card heading
      if (!nameEl) {
        const profileHeading = document.querySelector(".profile-card h3, .profile-card h2, .contact-card h3");
        if (profileHeading) {
          const name = profileHeading.textContent?.trim();
          if (name && name.length > 1 && name.length < 100) {
            details.contactName = name;
          }
        }
      } else {
        const name = nameEl.textContent?.trim();
        if (name && name.length > 1 && name.length < 100) {
          details.contactName = name;
        }
      }

      // Email — look for mailto links or labeled email fields
      const emailEl =
        document.querySelector(".contact-details a[href^='mailto:']") ||
        document.querySelector(".hl_contact-details a[href^='mailto:']") ||
        document.querySelector(".profile-card a[href^='mailto:']") ||
        document.querySelector("a[href^='mailto:']");

      if (emailEl) {
        const email = emailEl.textContent?.trim() || emailEl.href?.replace("mailto:", "");
        if (email && EMAIL_REGEX.test(email)) {
          details.contactEmail = email;
        }
      }

      // Phone — look for tel links
      const phoneEl =
        document.querySelector(".contact-details a[href^='tel:']") ||
        document.querySelector(".hl_contact-details a[href^='tel:']") ||
        document.querySelector(".profile-card a[href^='tel:']");

      if (phoneEl) {
        const phone = phoneEl.textContent?.trim();
        if (phone) {
          details.contactPhone = phone;
        }
      }
    } catch {
      // Best-effort scraping
    }

    return details;
  }

  // ── Combined Context ────────────────────────────────────────────────

  // Build combined context from all detected platforms
  function getPageContext() {
    return {
      ...getSalesforceContext(),
      ...getGHLContext(),
    };
  }

  // ── Phone Number Scanning ──────────────────────────────────────────

  function scanForPhoneNumbers() {
    // Find all <a href="tel:..."> links
    document.querySelectorAll('a[href^="tel:"]:not([' + PROCESSED_ATTR + '])').forEach((link) => {
      link.setAttribute(PROCESSED_ATTR, "true");
      const phone = link.href.replace("tel:", "").replace(/\s/g, "");
      insertDialButton(link, phone);
    });

    // Find phone numbers in text content
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          const tag = parent.tagName?.toLowerCase();
          if (["script", "style", "input", "textarea", "select", "noscript", "code", "pre"].includes(tag)) {
            return NodeFilter.FILTER_REJECT;
          }
          if (parent.closest("[" + PROCESSED_ATTR + "]")) return NodeFilter.FILTER_REJECT;
          if (parent.isContentEditable) return NodeFilter.FILTER_REJECT;

          PHONE_REGEX.lastIndex = 0;
          return PHONE_REGEX.test(node.textContent) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        },
      }
    );

    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);

    textNodes.forEach((node) => {
      const parent = node.parentElement;
      if (!parent || parent.getAttribute(PROCESSED_ATTR)) return;
      parent.setAttribute(PROCESSED_ATTR, "true");

      PHONE_REGEX.lastIndex = 0;
      const matches = [...node.textContent.matchAll(PHONE_REGEX)];
      if (matches.length === 0) return;

      const phone = matches[0][0];
      const btn = createDialButton(phone);
      try {
        if (parent.lastChild === node) {
          parent.appendChild(btn);
        } else {
          parent.insertBefore(btn, node.nextSibling);
        }
      } catch { /* Can't modify this node */ }
    });
  }

  function createDialButton(phone) {
    const btn = document.createElement("button");
    btn.className = "tcg-dial-btn";
    btn.dataset.phone = phone;
    btn.title = "Dial with TCG Power Dialer";
    btn.textContent = "\u{1F4DE}";
    btn.setAttribute(PROCESSED_ATTR, "true");
    return btn;
  }

  function insertDialButton(element, phone) {
    if (element.nextElementSibling?.classList?.contains("tcg-dial-btn")) return;
    const btn = createDialButton(phone);
    element.parentElement?.insertBefore(btn, element.nextSibling);
  }

  function normalizePhone(phone) {
    let digits = phone.replace(/\D/g, "");
    if (digits.length === 10) digits = "1" + digits;
    if (!digits.startsWith("+")) digits = "+" + digits;
    return digits;
  }

  function showToast(message) {
    const existing = document.getElementById("tcg-dial-toast");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.id = "tcg-dial-toast";
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.add("tcg-toast-visible");
    });
    setTimeout(() => {
      toast.classList.remove("tcg-toast-visible");
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }

  // Safe message sender — handles extension context invalidation after reload/update
  function safeSendMessage(payload) {
    try {
      chrome.runtime.sendMessage(payload).catch(() => {
        showToast("Extension updated — please refresh the page");
      });
    } catch {
      showToast("Extension updated — please refresh the page");
    }
  }

  // ── Event Handling ─────────────────────────────────────────────────

  // Event delegation — handles all dial button clicks
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".tcg-dial-btn");
    if (!btn) return;

    e.preventDefault();
    e.stopPropagation();

    const phone = normalizePhone(btn.dataset.phone);
    const context = getPageContext();

    safeSendMessage({ type: "DIAL_NUMBER", phone, ...context });
    showToast("Opening dialer for " + btn.dataset.phone + "...");
  });

  // ── Lifecycle ──────────────────────────────────────────────────────

  // Initial scan after page loads
  if (document.readyState === "complete") {
    scanForPhoneNumbers();
  } else {
    window.addEventListener("load", scanForPhoneNumbers);
  }

  // Re-scan on DOM changes (throttled, capped)
  const observer = new MutationObserver(() => {
    if (scanCount >= MAX_SCANS) return;
    scanCount++;
    if (scanTimer) clearTimeout(scanTimer);
    scanTimer = setTimeout(scanForPhoneNumbers, 1000);
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // Reset scan counter periodically (allow re-scanning after navigation in SPAs)
  setInterval(() => { scanCount = 0; }, 30000);
})();
