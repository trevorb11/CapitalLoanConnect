/**
 * Lead Portal qualification engine.
 *
 * Evaluates the same four funding-readiness signals shown on the /track
 * Qualify tab (LeadPortal.tsx QualifyTab) on the backend. When a lead first
 * meets all computed signals, we:
 *   1. Mark the account qualified (is_qualified, qualified_at, qualification_score)
 *   2. Email the lead a "you're pre-qualified" message with a CTA to apply
 *   3. Alert the assigned rep (or the admin alert inbox) so sales can follow up
 *
 * Re-notification is prevented via qualified_notified_at.
 */
import { db } from "../db";
import { sql } from "drizzle-orm";
import { storage } from "../storage";
import { gmailService } from "./gmail";
import { sendMarketingNotification, buildLeadQualifiedAlertEmail } from "./email";
import { isTriggerEnabled, TRIGGER_KEYS } from "../messaging-triggers";

const APPLY_URL =
  "https://app.todaycapitalgroup.com/intake/quiz?utm_source=track&utm_medium=email&utm_campaign=qualified_trigger";

interface Signal {
  label: string;
  met: boolean;
  detail: string;
}

// Mirrors calcPosition() in client/src/pages/LeadPortal.tsx
function calcPosition(pos: any) {
  const funded = Number(pos.funded_amount) || 0;
  const payback = Number(pos.payback_amount) || funded;
  const remaining = Number(pos.remaining_balance) || payback;
  const payment = Number(pos.payment_amount) || 0;
  const paidSoFar = payback - remaining;
  const progress = payback > 0 ? (paidSoFar / payback) * 100 : 0;
  const freq = pos.payment_frequency || "daily";
  const paymentsPerMonth =
    freq === "daily" ? 21 : freq === "weekly" ? 4.33 : freq === "bi-weekly" || freq === "biweekly" ? 2.17 : 1;
  const monthlyLoad = payment * paymentsPerMonth;
  return { progress, monthlyLoad };
}

function fmt$(n: number): string {
  return `$${Math.abs(n).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export function computeLeadSignals(positions: any[], metrics: any): Signal[] {
  const revenue = Number(metrics?.monthlyRevenue) || 0;
  const healthScore = Number(metrics?.healthScore) || 0;
  const totalMonthlyLoad = positions.reduce((s, p) => s + calcPosition(p).monthlyLoad, 0);

  const signals: Signal[] = [];
  if (revenue > 0) {
    signals.push({
      label: "Monthly Revenue",
      met: revenue >= 10000,
      detail: `${fmt$(revenue)}/mo verified through your bank connection`,
    });
  }
  if (positions.length > 0) {
    const nearing = positions.filter((p) => calcPosition(p).progress >= 50);
    signals.push({
      label: "Position Paydown",
      met: nearing.length > 0,
      detail:
        nearing.length > 0
          ? `${nearing.length} position(s) past 50% paid — renewal territory`
          : "No positions past 50% yet",
    });
  }
  if (revenue > 0 && totalMonthlyLoad > 0) {
    signals.push({
      label: "Payment Coverage",
      met: revenue / totalMonthlyLoad >= 5,
      detail: `${(revenue / totalMonthlyLoad).toFixed(1)}x coverage ratio`,
    });
  }
  if (healthScore) {
    signals.push({
      label: "Financial Health",
      met: healthScore >= 60,
      detail: `Score: ${healthScore}/100`,
    });
  }
  return signals;
}

function buildLeadQualifiedEmail(firstName: string | null, signals: Signal[]): { subject: string; html: string } {
  const greeting = firstName ? `Hi ${firstName},` : "Hi there,";
  const signalRows = signals
    .map(
      (s) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;vertical-align:top;width:28px;">
          <span style="display:inline-block;width:20px;height:20px;border-radius:50%;background:#d1fae5;color:#059669;text-align:center;line-height:20px;font-size:13px;font-weight:700;">&#10003;</span>
        </td>
        <td style="padding:10px 0 10px 10px;border-bottom:1px solid #e5e7eb;">
          <span style="font-size:14px;font-weight:700;color:#111827;">${s.label}</span><br>
          <span style="font-size:13px;color:#6b7280;">${s.detail}</span>
        </td>
      </tr>`,
    )
    .join("");

  const html = `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:32px 16px;">
      <table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb;">
        <tr>
          <td style="background:#0f1e38;padding:28px;">
            <p style="margin:0 0 6px;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#2dd4bf;font-weight:700;">Funding Readiness Update</p>
            <p style="margin:0;font-size:26px;font-weight:700;color:#ffffff;">You're showing pre-qualified signals</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px;">
            <p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#111827;">${greeting}</p>
            <p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#374151;">Based on the positions and bank data in your tracking dashboard, your business now meets every funding-readiness signal we look for:</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 18px;">${signalRows}</table>
            <p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:#374151;">That means you're in a strong spot to qualify for better terms, a renewal, or additional capital. Seeing your options takes about two minutes and won't affect your credit.</p>
            <table cellpadding="0" cellspacing="0" align="center"><tr>
              <td style="background:#0d9488;border-radius:50px;">
                <a href="${APPLY_URL}" style="display:inline-block;padding:14px 36px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;">See What You Qualify For</a>
              </td>
            </tr></table>
            <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#6b7280;">Questions? Just reply to this email and our team will help.</p>
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;padding:18px 28px;border-top:1px solid #e5e7eb;">
            <p style="margin:0 0 6px;font-size:12px;color:#9ca3af;">Today Capital Group &middot; 6303 Owensmouth Ave, Woodland Hills, CA 91367 &middot; (818) 351-0225</p>
            <p style="margin:0;font-size:11px;color:#c0c6cf;">You received this email because you signed up at app.todaycapitalgroup.com. To stop receiving these emails, reply with &ldquo;Unsubscribe&rdquo; or email <a href="mailto:marketing@todaycapitalgroup.com?subject=Unsubscribe" style="color:#9ca3af;">marketing@todaycapitalgroup.com</a>.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject: "Your business is showing pre-qualified signals", html };
}

/**
 * Evaluate a lead's qualification signals and fire notifications if they just
 * became fully qualified. Safe to call often — exits early when already
 * notified. Never throws.
 */
export async function evaluateLeadQualification(email: string): Promise<void> {
  try {
    const accountRes = await db.execute(
      sql`SELECT email, first_name, last_name, business_name, phone, assigned_rep, status, qualified_notified_at FROM lead_portal_accounts WHERE email = ${email}`,
    );
    const account: any = accountRes.rows[0];
    if (!account) return;
    if (account.qualified_notified_at) return; // already notified once
    if (account.status === "converted") return;

    const posRes = await db.execute(sql`SELECT * FROM lead_positions WHERE lead_email = ${email}`);
    const positions = posRes.rows as any[];
    const snapshot = await storage.getMerchantBankSnapshot(email);
    const metrics = (snapshot?.metrics as any) || {};

    const signals = computeLeadSignals(positions, metrics);
    const metCount = signals.filter((s) => s.met).length;
    const score = signals.length > 0 ? Math.round((metCount / signals.length) * 100) : 0;

    // Always keep the score fresh for admin visibility
    await db.execute(sql`UPDATE lead_portal_accounts SET qualification_score = ${score} WHERE email = ${email}`);

    // Fully qualified = verified revenue >= $10k plus every computed signal met
    // (requires at least 2 signals so a single data point can't trigger it)
    const revenue = Number(metrics?.monthlyRevenue) || 0;
    const qualified = signals.length >= 2 && metCount === signals.length && revenue >= 10000;
    if (!qualified) return;

    await db.execute(
      sql`UPDATE lead_portal_accounts SET is_qualified = true, qualified_at = NOW() WHERE email = ${email}`,
    );

    // Emails are toggleable from the /triggers admin page. Qualification is
    // still recorded above for admin visibility; skipping here (without
    // stamping qualified_notified_at) means the email fires on the next
    // trigger after the toggle is re-enabled.
    if (!(await isTriggerEnabled(TRIGGER_KEYS.LEAD_QUALIFIED))) {
      console.log(`[LEAD-QUALIFY] ${email} qualified (score ${score}) — notifications disabled via toggle`);
      return;
    }

    // 1) Email the lead
    const leadEmail = buildLeadQualifiedEmail(account.first_name, signals);
    const sent = await gmailService.sendEmail(email, leadEmail.subject, leadEmail.html);

    // 2) Alert the assigned rep (or the admin alert inbox)
    const alertTo = account.assigned_rep || process.env.ADMIN_ALERT_EMAIL || "marketing@todaycapitalgroup.com";
    const alert = buildLeadQualifiedAlertEmail({
      email,
      name: [account.first_name, account.last_name].filter(Boolean).join(" ") || null,
      businessName: account.business_name,
      phone: account.phone,
      monthlyRevenue: revenue > 0 ? fmt$(revenue) + "/mo" : null,
      signals: signals.map((s) => `${s.label}: ${s.detail}`).join(" | "),
    });
    await sendMarketingNotification(alert.subject, alert.html, alertTo);

    // Only stamp notified when the lead email actually went out, so a
    // transient Gmail failure retries on the next trigger.
    if (sent) {
      await db.execute(sql`UPDATE lead_portal_accounts SET qualified_notified_at = NOW() WHERE email = ${email}`);
      console.log(`[LEAD-QUALIFY] ${email} qualified (score ${score}) — lead emailed, alert sent to ${alertTo}`);
    } else {
      console.warn(`[LEAD-QUALIFY] ${email} qualified but lead email failed — will retry on next trigger`);
    }
  } catch (err: any) {
    console.error(`[LEAD-QUALIFY] evaluation error for ${email}:`, err?.message || err);
  }
}
