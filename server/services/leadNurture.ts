/**
 * Lead Portal nurture email sequence.
 *
 * Walks /track signups through three onboarding nudges:
 *   - day1 (24h+): add your first position (skipped if they already have one)
 *   - day3 (72h+): connect your bank (skipped if already connected)
 *   - day7 (168h+): qualification check-in with their current signal status
 *
 * Rules:
 *   - At most ONE nurture email per account per sweep (no stacking)
 *   - Steps whose condition no longer applies are marked sent silently
 *   - Sent steps tracked in lead_portal_accounts.nurture_steps_sent (CSV)
 *   - Converted accounts and already-qualified-notified leads get no day7
 */
import { db } from "../db";
import { sql } from "drizzle-orm";
import { storage } from "../storage";
import { gmailService } from "./gmail";
import { computeLeadSignals } from "./leadQualification";
import { isTriggerEnabled, TRIGGER_KEYS } from "../messaging-triggers";

const TRACK_URL = "https://app.todaycapitalgroup.com/track";

function trackLink(campaign: string): string {
  return `${TRACK_URL}?utm_source=nurture&utm_medium=email&utm_campaign=${campaign}`;
}

function nurtureWrapper(headline: string, bodyHtml: string, ctaLabel: string, ctaUrl: string): string {
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:32px 16px;">
      <table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb;">
        <tr>
          <td style="background:#0f1e38;padding:28px;">
            <p style="margin:0 0 6px;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#2dd4bf;font-weight:700;">Today Capital Group</p>
            <p style="margin:0;font-size:24px;font-weight:700;color:#ffffff;">${headline}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px;">
            ${bodyHtml}
            <table cellpadding="0" cellspacing="0" align="center" style="margin-top:22px;"><tr>
              <td style="background:#0d9488;border-radius:50px;">
                <a href="${ctaUrl}" style="display:inline-block;padding:14px 36px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;">${ctaLabel}</a>
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
}

function p(text: string): string {
  return `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#374151;">${text}</p>`;
}

function buildDay1Email(firstName: string | null): { subject: string; html: string } {
  const greeting = firstName ? `Hi ${firstName},` : "Hi there,";
  return {
    subject: "Add your first position to start tracking your payoff",
    html: nurtureWrapper(
      "Your payoff tracker is waiting",
      p(greeting) +
        p("You created your funding tracker, but it's empty so far. Add your current advance or loan and you'll instantly see your payoff progress, daily payment load, and projected payoff date.") +
        p("It takes about a minute — just the funded amount, payback amount, and payment size."),
      "Add My First Position",
      trackLink("day1_add_position"),
    ),
  };
}

function buildDay3Email(firstName: string | null): { subject: string; html: string } {
  const greeting = firstName ? `Hi ${firstName},` : "Hi there,";
  return {
    subject: "Connect your bank to unlock your funding readiness score",
    html: nurtureWrapper(
      "See your real funding readiness",
      p(greeting) +
        p("Positions tell half the story — your bank activity tells the rest. Connect your business bank account (read-only, takes ~2 minutes) and your tracker will show verified monthly revenue, a financial health score, and exactly how close you are to qualifying for better terms.") +
        p("Lenders price offers on verified data. Having it ready puts you in a stronger position."),
      "Connect My Bank",
      trackLink("day3_connect_bank"),
    ),
  };
}

function buildDay7Email(
  firstName: string | null,
  metCount: number,
  total: number,
  missing: string[],
): { subject: string; html: string } {
  const greeting = firstName ? `Hi ${firstName},` : "Hi there,";
  let statusHtml: string;
  if (total === 0) {
    statusHtml = p("We don't have enough data yet to score your funding readiness. Add your positions and connect your bank to see where you stand.");
  } else if (missing.length === 0) {
    statusHtml = p(`You're meeting all ${total} funding-readiness signals we track. That's a strong spot to be in — it may be worth seeing what you qualify for.`);
  } else {
    statusHtml =
      p(`You're currently meeting <strong>${metCount} of ${total}</strong> funding-readiness signals. Here's what would strengthen your profile:`) +
      `<ul style="margin:0 0 14px;padding-left:20px;font-size:14px;line-height:1.8;color:#374151;">` +
      missing.map((m) => `<li>${m}</li>`).join("") +
      `</ul>`;
  }
  return {
    subject: "Your one-week funding readiness check-in",
    html: nurtureWrapper(
      "How your funding readiness looks",
      p(greeting) + p("It's been a week since you set up your tracker — here's a quick check-in.") + statusHtml,
      "View My Tracker",
      trackLink("day7_checkin"),
    ),
  };
}

interface NurtureAccount {
  email: string;
  first_name: string | null;
  created_at: string | Date;
  status: string | null;
  qualified_notified_at: string | Date | null;
  nurture_steps_sent: string | null;
}

/** Run one nurture sweep. Sends at most one email per account. Never throws. */
export async function runLeadNurtureSweep(): Promise<void> {
  try {
    // Toggleable from the /triggers admin page (defaults OFF — seeded at startup)
    if (!(await isTriggerEnabled(TRIGGER_KEYS.LEAD_NURTURE))) return;

    const res = await db.execute(
      sql`SELECT email, first_name, created_at, status, qualified_notified_at, nurture_steps_sent
          FROM lead_portal_accounts
          WHERE created_at > NOW() - INTERVAL '21 days'
            AND COALESCE(status, '') != 'converted'
            AND (nurture_steps_sent IS NULL OR nurture_steps_sent NOT LIKE '%day7%')`,
    );
    const accounts = res.rows as unknown as NurtureAccount[];
    if (accounts.length === 0) return;

    for (const account of accounts) {
      try {
        await processAccount(account);
      } catch (err: any) {
        console.error(`[LEAD-NURTURE] error for ${account.email}:`, err?.message || err);
      }
    }
  } catch (err: any) {
    console.error("[LEAD-NURTURE] sweep failed:", err?.message || err);
  }
}

async function isUnsubscribed(email: string): Promise<boolean> {
  try {
    const res = await db.execute(sql`SELECT 1 FROM email_unsubscribes WHERE email = ${email.toLowerCase()} LIMIT 1`);
    return res.rows.length > 0;
  } catch {
    return false;
  }
}

async function processAccount(account: NurtureAccount): Promise<void> {
  if (await isUnsubscribed(account.email)) {
    console.log(`[LEAD-NURTURE] skipping ${account.email} — unsubscribed`);
    return;
  }

  const sent = new Set((account.nurture_steps_sent || "").split(",").filter(Boolean));
  const ageHours = (Date.now() - new Date(account.created_at).getTime()) / (1000 * 60 * 60);

  const markSent = async (step: string) => {
    sent.add(step);
    await db.execute(
      sql`UPDATE lead_portal_accounts SET nurture_steps_sent = ${[...sent].join(",")} WHERE email = ${account.email}`,
    );
  };

  // day1: add first position
  if (!sent.has("day1") && ageHours >= 24) {
    const posCount = await db.execute(
      sql`SELECT COUNT(*)::int AS c FROM lead_positions WHERE lead_email = ${account.email}`,
    );
    const hasPositions = Number((posCount.rows[0] as any)?.c) > 0;
    if (hasPositions) {
      await markSent("day1"); // condition already satisfied — skip silently
    } else {
      const msg = buildDay1Email(account.first_name);
      if (await gmailService.sendEmail(account.email, msg.subject, msg.html)) {
        await markSent("day1");
        console.log(`[LEAD-NURTURE] day1 sent to ${account.email}`);
      }
      return; // one email per sweep
    }
  }

  // day3: connect bank
  if (!sent.has("day3") && ageHours >= 72) {
    const snapshot = await storage.getMerchantBankSnapshot(account.email);
    if (snapshot?.isAccountConnected) {
      await markSent("day3");
    } else {
      const msg = buildDay3Email(account.first_name);
      if (await gmailService.sendEmail(account.email, msg.subject, msg.html)) {
        await markSent("day3");
        console.log(`[LEAD-NURTURE] day3 sent to ${account.email}`);
      }
      return;
    }
  }

  // day7: qualification check-in (skip if already told they're qualified)
  if (!sent.has("day7") && ageHours >= 168) {
    if (account.qualified_notified_at) {
      await markSent("day7");
      return;
    }
    const posRes = await db.execute(sql`SELECT * FROM lead_positions WHERE lead_email = ${account.email}`);
    const snapshot = await storage.getMerchantBankSnapshot(account.email);
    const signals = computeLeadSignals(posRes.rows as any[], (snapshot?.metrics as any) || {});
    const metCount = signals.filter((s) => s.met).length;
    const missing = signals.filter((s) => !s.met).map((s) => `${s.label}: ${s.detail}`);
    const msg = buildDay7Email(account.first_name, metCount, signals.length, missing);
    if (await gmailService.sendEmail(account.email, msg.subject, msg.html)) {
      await markSent("day7");
      console.log(`[LEAD-NURTURE] day7 sent to ${account.email}`);
    }
  }
}

let nurtureInterval: ReturnType<typeof setInterval> | null = null;

/** Start the recurring nurture scheduler (every 6 hours, first run after 2 minutes). */
export function startLeadNurtureScheduler(): void {
  if (nurtureInterval) return;
  // Seed the toggle as OFF on first boot so nurture emails never send until
  // explicitly enabled on the /triggers admin page.
  storage
    .getSetting(TRIGGER_KEYS.LEAD_NURTURE)
    .then((val) => {
      if (val === null || val === undefined) {
        return storage.setSetting(TRIGGER_KEYS.LEAD_NURTURE, "false", "system");
      }
    })
    .catch((err: any) => console.error("[LEAD-NURTURE] failed to seed toggle default:", err?.message || err));
  const INTERVAL_MS = 6 * 60 * 60 * 1000;
  setTimeout(() => runLeadNurtureSweep(), 2 * 60 * 1000);
  nurtureInterval = setInterval(() => runLeadNurtureSweep(), INTERVAL_MS);
  console.log("[LEAD-NURTURE] scheduler started — sweeping every 6 hours");
}
