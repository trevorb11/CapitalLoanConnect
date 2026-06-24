/**
 * Marketing notification email builders + dispatcher.
 * Sends via the existing gmailService.sendEmail() which uses the google-mail connector.
 */
import { gmailService } from "./gmail";

const NOTIFY_TO = "marketing@todaycapitalgroup.com";

export async function sendMarketingNotification(subject: string, htmlBody: string, to?: string): Promise<void> {
  try {
    await gmailService.sendEmail(to ?? NOTIFY_TO, subject, htmlBody);
  } catch (err) {
    console.error("[EMAIL] sendMarketingNotification failed:", err);
  }
}

export function buildAdminAlertEmail(data: {
  title: string;
  event: string;
  merchantEmail?: string | null;
  merchantName?: string | null;
  businessName?: string | null;
  details?: Record<string, string | number | null | undefined>;
}): { subject: string; html: string } {
  const detailsRows = Object.entries(data.details || {})
    .map(([k, v]) => row(k, v == null ? "" : String(v)))
    .join("");
  return {
    subject: `[Merchant Alert] ${data.event}${data.businessName ? ` - ${data.businessName}` : data.merchantEmail ? ` - ${data.merchantEmail}` : ""}`,
    html: emailWrapper(
      data.title,
      "Merchant Alert",
      "#dc2626",
      row("Event", data.event) +
      row("Merchant Email", data.merchantEmail) +
      row("Merchant Name", data.merchantName) +
      row("Business", data.businessName) +
      detailsRows,
    ),
  };
}

// ── Shared template ────────────────────────────────────────────────────────

function row(label: string, value: string | null | undefined): string {
  if (!value) return "";
  return `
    <tr style="border-top:1px solid #f3f4f6;">
      <td style="padding:8px 16px;color:#6b7280;font-size:13px;white-space:nowrap;width:140px;">${label}</td>
      <td style="padding:8px 16px;font-size:13px;font-weight:500;color:#111827;">${value}</td>
    </tr>`;
}

function emailWrapper(
  title: string,
  badge: string,
  badgeColor: string,
  tableRows: string,
): string {
  const timestamp = new Date().toLocaleString("en-US", {
    timeZone: "America/Chicago",
    dateStyle: "full",
    timeStyle: "short",
  });

  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:32px 16px;">
      <table width="580" cellpadding="0" cellspacing="0"
             style="background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;">
        <!-- Header -->
        <tr>
          <td style="background:#1e3a5f;padding:20px 28px;">
            <table width="100%" cellpadding="0" cellspacing="0"><tr>
              <td><span style="color:#ffffff;font-size:18px;font-weight:700;">Today Capital Group</span></td>
              <td align="right">
                <span style="background:${badgeColor};color:#fff;padding:4px 14px;border-radius:20px;font-size:12px;font-weight:600;">${badge}</span>
              </td>
            </tr></table>
          </td>
        </tr>
        <!-- Title -->
        <tr>
          <td style="padding:24px 28px 8px;">
            <p style="margin:0;font-size:20px;font-weight:700;color:#111827;">${title}</p>
            <p style="margin:6px 0 0;font-size:12px;color:#9ca3af;">${timestamp} CT</p>
          </td>
        </tr>
        <!-- Data -->
        <tr>
          <td style="padding:12px 28px 28px;">
            <table width="100%" cellpadding="0" cellspacing="0"
                   style="border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;">
              <tbody>${tableRows}</tbody>
            </table>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Pipeline Report Email ──────────────────────────────────────────────────

export async function sendPipelineReportEmail(opts: {
  to: string;
  repName: string;
  reportDate: string;
  reportType: string;
  htmlContent: string;
}): Promise<{ sent: boolean; error?: string }> {
  if (!opts.to) return { sent: false, error: "No recipient email" };

  const typeLabel = opts.reportType === "weekly" ? "Weekly" : "Daily";
  const dateLabel = opts.reportDate || new Date().toISOString().slice(0, 10);
  const subject = `${typeLabel} Pipeline Report — ${dateLabel}`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:24px 16px;">
      <table width="700" cellpadding="0" cellspacing="0"
             style="background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;">
        <tr>
          <td style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%);padding:22px 30px;">
            <p style="margin:0;color:#fff;font-size:20px;font-weight:700;">Today Capital Group</p>
            <p style="margin:4px 0 0;color:rgba(255,255,255,0.75);font-size:13px;">
              ${typeLabel} Pipeline Report &nbsp;|&nbsp; ${dateLabel} &nbsp;|&nbsp; ${opts.repName}
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:0;">
            ${opts.htmlContent}
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;padding:16px 30px;text-align:center;border-top:1px solid #e5e7eb;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">
              Generated by the TCG Pipeline Monitor &nbsp;|&nbsp;
              <a href="https://app.todaycapitalgroup.com/pipeline-reports"
                 style="color:#0f3460;">View all reports</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    const { gmailService } = await import("./gmail");
    const sent = await gmailService.sendEmail(opts.to, subject, html);
    return sent ? { sent: true } : { sent: false, error: "Gmail send returned false" };
  } catch (err: any) {
    console.error(`[EMAIL] sendPipelineReportEmail error:`, err.message);
    return { sent: false, error: err.message };
  }
}

// ── Per-form builders ──────────────────────────────────────────────────────

export function buildAdsInquiryEmail(data: {
  email: string;
  website?: string | null;
  adSpend?: string | null;
  interest?: string | null;
  utmSource?: string | null;
  utmCampaign?: string | null;
}): { subject: string; html: string } {
  return {
    subject: `New /ads Inquiry - ${data.email}`,
    html: emailWrapper(
      "New Ads Consultation Request",
      "/ads",
      "#7c3aed",
      row("Email", data.email) +
      row("Website", data.website) +
      row("Monthly Ad Spend", data.adSpend) +
      row("Interest", data.interest) +
      row("UTM Source", data.utmSource) +
      row("UTM Campaign", data.utmCampaign),
    ),
  };
}

export function buildServicesInterestEmail(data: {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  businessName?: string | null;
  service?: string | null;
  otherDetails?: string | null;
  source?: string | null;
  utmSource?: string | null;
}): { subject: string; html: string } {
  const name = [data.firstName, data.lastName].filter(Boolean).join(" ") || null;
  const isMemorialDay = data.service === "website-memorial-day";

  if (data.source === "rep-referral") {
    const repName = data.utmSource || "Unknown Rep";
    return {
      subject: `[Rep Referral] Website Lead — ${data.businessName || name || data.email} (via ${repName})`,
      html: emailWrapper(
        "Rep Website Referral",
        "/service-leads",
        "#0891b2",
        row("Referred By", repName) +
        row("Email", data.email) +
        row("Name", name) +
        row("Phone", data.phone) +
        row("Business", data.businessName) +
        row("Notes", data.otherDetails),
      ),
    };
  }

  if (isMemorialDay) {
    return {
      subject: `[Memorial Day Deal] New Website Lead - ${data.businessName || data.email}`,
      html: emailWrapper(
        "Memorial Day Website Promo — New Lead",
        "Memorial Day Sale",
        "#b8243a",
        row("Email", data.email) +
        row("Name", name) +
        row("Phone", data.phone) +
        row("Business", data.businessName) +
        row("Goal", data.otherDetails) +
        row("Source", data.source) +
        row("Promo Price", "$499 (was $1,500)"),
      ),
    };
  }

  return {
    subject: `New Services Inquiry - ${data.service || "General"} - ${data.email}`,
    html: emailWrapper(
      "New Service Interest",
      "/services",
      "#0891b2",
      row("Email", data.email) +
      row("Name", name) +
      row("Phone", data.phone) +
      row("Business", data.businessName) +
      row("Service", data.service) +
      row("Details", data.otherDetails) +
      row("Source", data.source),
    ),
  };
}

export function buildLeadQualifiedAlertEmail(data: {
  email: string;
  name?: string | null;
  businessName?: string | null;
  phone?: string | null;
  monthlyRevenue?: string | null;
  signals?: string | null;
}): { subject: string; html: string } {
  return {
    subject: `[Qualified Lead] ${data.businessName || data.name || data.email} just met all funding signals`,
    html: emailWrapper(
      "Lead Portal Account Fully Qualified",
      "/track",
      "#059669",
      row("Email", data.email) +
      row("Name", data.name) +
      row("Business", data.businessName) +
      row("Phone", data.phone) +
      row("Monthly Revenue", data.monthlyRevenue) +
      row("Signals", data.signals) +
      row("Next Step", "Lead was emailed an apply CTA — follow up within 24h"),
    ),
  };
}

export function buildLeadPortalSignupEmail(data: {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  businessName?: string | null;
}): { subject: string; html: string } {
  const name = [data.firstName, data.lastName].filter(Boolean).join(" ") || null;
  return {
    subject: `New /track Signup - ${data.businessName || data.email}`,
    html: emailWrapper(
      "New Lead Portal Account Created",
      "/track",
      "#059669",
      row("Email", data.email) +
      row("Name", name) +
      row("Phone", data.phone) +
      row("Business", data.businessName),
    ),
  };
}
