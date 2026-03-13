/**
 * Automated Messaging Triggers
 *
 * SMS  → routed through the SMS middleware (fireSmsStageEvent)
 * Email → sent directly via Gmail API
 *
 * INSTANT TRIGGERS (fired from route handlers)
 * ─────────────────────────────────────────────
 * 1. app_abandoned          – merchant fills out intake but leaves before providing bank statements
 * 2. approval_congratulations – approval is issued → congrats + link to accept
 * 3. funded_congratulations   – deal is funded → congrats + next steps
 * 4. bank_statements_reminder – merchant submitted app but no bank statements after a delay
 *
 * SCHEDULED / CRON TRIGGERS (checked periodically)
 * ─────────────────────────────────────────────────
 * 5. approval_stale_reminder  – approval issued but not accepted after 24h / 48h / 72h
 * 6. app_incomplete_reminder  – application started but not completed after 2h
 */

import { fireSmsStageEvent } from './sms-middleware';
import { storage } from './storage';

// ──────────────────────────────────────────────────────────────────────────────
// GMAIL EMAIL HELPER
// Sends an HTML email via the Gmail API (same auth pattern used elsewhere).
// Non-blocking — errors are logged, never thrown.
// ──────────────────────────────────────────────────────────────────────────────

async function sendTriggerEmail(toEmail: string, subject: string, htmlBody: string): Promise<boolean> {
  try {
    const { google } = await import('googleapis');

    const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
    const xReplitToken = process.env.REPL_IDENTITY
      ? 'repl ' + process.env.REPL_IDENTITY
      : process.env.WEB_REPL_RENEWAL
        ? 'depl ' + process.env.WEB_REPL_RENEWAL
        : null;

    if (!xReplitToken || !hostname) {
      console.log('[TRIGGER EMAIL] Gmail connector not available, skipping email');
      return false;
    }

    const connRes = await fetch(
      'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-mail',
      { headers: { 'Accept': 'application/json', 'X_REPLIT_TOKEN': xReplitToken } }
    ).then(r => r.json());

    const accessToken = connRes.items?.[0]?.settings?.access_token || connRes.items?.[0]?.settings?.oauth?.credentials?.access_token;
    if (!accessToken) {
      console.log('[TRIGGER EMAIL] No Gmail access token available');
      return false;
    }

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const raw = Buffer.from(
      `To: ${toEmail}\r\n` +
      `Subject: ${subject}\r\n` +
      `Content-Type: text/html; charset=utf-8\r\n` +
      `\r\n` +
      htmlBody
    ).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw },
    });

    console.log(`[TRIGGER EMAIL] Sent "${subject}" to ${toEmail}`);
    return true;
  } catch (err) {
    console.error('[TRIGGER EMAIL] Send error (non-fatal):', err);
    return false;
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// SHARED EMAIL TEMPLATE WRAPPER
// ──────────────────────────────────────────────────────────────────────────────

function wrapEmailHtml(bodyContent: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #14B8A6; margin-bottom: 24px;">Today Capital Group</h2>
      ${bodyContent}
      <hr style="margin: 32px 0 16px; border: none; border-top: 1px solid #eee;" />
      <p style="color: #999; font-size: 12px;">Today Capital Group</p>
    </div>
  `;
}

const BANK_STATEMENTS_LINK = 'https://bit.ly/3ZnW1kS';

// ──────────────────────────────────────────────────────────────────────────────
// 1. APPLICATION ABANDONED
// ──────────────────────────────────────────────────────────────────────────────

export async function triggerAppAbandoned(opts: {
  applicationId: string;
  phone?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  businessName?: string;
  lastStep?: number;
  abandonedPage?: string;
}): Promise<void> {
  const { applicationId, phone, email, firstName, businessName, abandonedPage } = opts;

  if (!phone && !email) return;

  const name = firstName || 'there';
  const page = abandonedPage || 'application';

  // SMS → middleware
  if (phone) {
    fireSmsStageEvent({
      stage: 'app_abandoned',
      phone,
      email: email || undefined,
      first_name: opts.firstName || undefined,
      last_name: opts.lastName || undefined,
      business_name: businessName || undefined,
      deal_id: applicationId,
      metadata: { abandonedPage: page, lastStep: opts.lastStep },
    });
  }

  // Email → Gmail
  if (email) {
    const isBankStatements = abandonedPage === 'bank_statements';
    const subject = isBankStatements
      ? "You're almost there — just upload your bank statements!"
      : "Don't forget to finish your funding application!";

    const html = wrapEmailHtml(`
      <p>Hi ${name},</p>
      ${isBankStatements
        ? `<p>We noticed you started your funding application but haven't uploaded your bank statements yet. You're <strong>almost there</strong>!</p>
           <p>You can upload your bank statements here or simply reply to this email with photos of them:</p>`
        : `<p>We noticed you started your funding application but didn't finish. You're <strong>so close</strong>!</p>
           <p>Complete your application and upload your bank statements to get funded:</p>`
      }
      <p style="margin: 24px 0;">
        <a href="${BANK_STATEMENTS_LINK}" style="display: inline-block; padding: 14px 28px; background: #14B8A6; color: #fff; text-decoration: none; border-radius: 8px; font-weight: bold;">
          Upload Bank Statements
        </a>
      </p>
      <p style="color: #666;">If you have any questions, simply reply to this email — we're here to help!</p>
    `);

    sendTriggerEmail(email, subject, html).catch(err => {
      console.error('[TRIGGER] app_abandoned email error (non-fatal):', err);
    });
  }

  console.log(`[TRIGGER] app_abandoned fired for application ${applicationId} (page: ${page})`);
}

// ──────────────────────────────────────────────────────────────────────────────
// 2. APPROVAL CONGRATULATIONS
// ──────────────────────────────────────────────────────────────────────────────

export async function triggerApprovalCongratulations(opts: {
  decisionId: string;
  phone?: string;
  email?: string;
  firstName?: string;
  businessName?: string;
  approvalLink?: string;
  amount?: number;
  lender?: string;
}): Promise<void> {
  const { phone, email, firstName, approvalLink, amount, lender } = opts;

  if (!phone && !email) return;

  const name = firstName || 'there';
  const amountStr = amount
    ? `$${amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
    : 'your funding';

  // SMS → middleware (the existing approval_issued stage event in routes.ts already fires;
  // we add a congratulations-specific one here so the middleware can differentiate)
  if (phone) {
    fireSmsStageEvent({
      stage: 'approval_congratulations',
      phone,
      email: email || undefined,
      first_name: firstName || undefined,
      business_name: opts.businessName || undefined,
      deal_id: opts.decisionId,
      approval_link: approvalLink || undefined,
      amount: amount || undefined,
      lender: lender || undefined,
    });
  }

  // Email → Gmail
  if (email) {
    const subject = `Congratulations! You've been approved for ${amountStr}!`;
    const html = wrapEmailHtml(`
      <p>Hi ${name},</p>
      <p>Great news — <strong>you've been approved for ${amountStr}</strong>${lender ? ` through ${lender}` : ''}!</p>
      ${approvalLink
        ? `<p>View the details of your offer and accept it here:</p>
           <p style="margin: 24px 0;">
             <a href="${approvalLink}" style="display: inline-block; padding: 14px 28px; background: #14B8A6; color: #fff; text-decoration: none; border-radius: 8px; font-weight: bold;">
               View & Accept Your Offer
             </a>
           </p>
           <p style="color: #666; font-size: 13px;">Or copy and paste this link: ${approvalLink}</p>`
        : `<p>Log in to your portal to review and accept your offer.</p>`
      }
      <p style="color: #666;">Questions? Simply reply to this email — we're here to help!</p>
    `);

    sendTriggerEmail(email, subject, html).catch(err => {
      console.error('[TRIGGER] approval_congratulations email error (non-fatal):', err);
    });
  }

  console.log(`[TRIGGER] approval_congratulations fired for decision ${opts.decisionId}`);
}

// ──────────────────────────────────────────────────────────────────────────────
// 3. FUNDED CONGRATULATIONS
// ──────────────────────────────────────────────────────────────────────────────

export async function triggerFundedCongratulations(opts: {
  decisionId: string;
  phone?: string;
  email?: string;
  firstName?: string;
  businessName?: string;
  amount?: number;
  lender?: string;
}): Promise<void> {
  const { phone, email, firstName, amount, lender } = opts;

  if (!phone && !email) return;

  const name = firstName || 'there';
  const amountStr = amount
    ? `$${amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
    : 'your funds';

  // SMS → middleware
  if (phone) {
    fireSmsStageEvent({
      stage: 'funded_congratulations',
      phone,
      email: email || undefined,
      first_name: firstName || undefined,
      business_name: opts.businessName || undefined,
      deal_id: opts.decisionId,
      amount: amount || undefined,
      lender: lender || undefined,
    });
  }

  // Email → Gmail
  if (email) {
    const subject = `Your funding of ${amountStr} is complete!`;
    const html = wrapEmailHtml(`
      <p>Hi ${name},</p>
      <p><strong>Congratulations!</strong> Your funding of ${amountStr}${lender ? ` from ${lender}` : ''} has been completed!</p>
      <p>Your funds should arrive in your account shortly. Here's what to expect next:</p>
      <ul style="color: #444; line-height: 1.8;">
        <li>Funds will be deposited into your business bank account</li>
        <li>You'll receive a portal invite to track your payoff progress</li>
        <li>Your assigned rep is available for any questions</li>
      </ul>
      <p style="color: #666;">If you have any questions at all, simply reply to this email. Thank you for choosing Today Capital Group!</p>
    `);

    sendTriggerEmail(email, subject, html).catch(err => {
      console.error('[TRIGGER] funded_congratulations email error (non-fatal):', err);
    });
  }

  console.log(`[TRIGGER] funded_congratulations fired for decision ${opts.decisionId}`);
}

// ──────────────────────────────────────────────────────────────────────────────
// 4. BANK STATEMENTS REMINDER
// ──────────────────────────────────────────────────────────────────────────────

export async function triggerBankStatementsReminder(opts: {
  applicationId: string;
  phone: string;
  email?: string;
  firstName?: string;
  businessName?: string;
}): Promise<void> {
  const { phone, firstName, applicationId, email } = opts;
  const name = firstName || 'there';

  // SMS → middleware
  fireSmsStageEvent({
    stage: 'bank_statements_reminder',
    phone,
    email: email || undefined,
    first_name: firstName || undefined,
    business_name: opts.businessName || undefined,
    deal_id: applicationId,
  });

  // Email → Gmail
  if (email) {
    const subject = "Reminder: We still need your bank statements";
    const html = wrapEmailHtml(`
      <p>Hi ${name},</p>
      <p>Just a quick reminder — we still need your <strong>bank statements</strong> to move forward with your funding application.</p>
      <p>You can upload them here or simply reply to this email with photos of your last 3 months of business bank statements:</p>
      <p style="margin: 24px 0;">
        <a href="${BANK_STATEMENTS_LINK}" style="display: inline-block; padding: 14px 28px; background: #14B8A6; color: #fff; text-decoration: none; border-radius: 8px; font-weight: bold;">
          Upload Bank Statements
        </a>
      </p>
      <p style="color: #666;">Questions? Reply to this email — we're happy to help!</p>
    `);

    sendTriggerEmail(email, subject, html).catch(err => {
      console.error('[TRIGGER] bank_statements_reminder email error (non-fatal):', err);
    });
  }

  console.log(`[TRIGGER] bank_statements_reminder fired for application ${applicationId}`);
}

// ──────────────────────────────────────────────────────────────────────────────
// 5. STALE APPROVAL REMINDER
// ──────────────────────────────────────────────────────────────────────────────

export async function triggerApprovalStaleReminder(opts: {
  decisionId: string;
  phone: string;
  email?: string;
  firstName?: string;
  businessName?: string;
  approvalLink?: string;
  amount?: number;
  hoursStale: number;
}): Promise<void> {
  const { phone, email, firstName, approvalLink, amount, hoursStale } = opts;
  const name = firstName || 'there';
  const amountStr = amount
    ? `$${amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
    : 'your approved funding';

  // SMS → middleware
  fireSmsStageEvent({
    stage: 'approval_stale_reminder',
    phone,
    email: email || undefined,
    first_name: firstName || undefined,
    business_name: opts.businessName || undefined,
    deal_id: opts.decisionId,
    approval_link: approvalLink || undefined,
    amount: amount || undefined,
    metadata: { hoursStale },
  });

  // Email → Gmail
  if (email) {
    let subject: string;
    let bodyParagraph: string;

    if (hoursStale <= 24) {
      subject = `Reminder: Your ${amountStr} funding offer is waiting!`;
      bodyParagraph = `<p>Just a friendly reminder — your funding approval for <strong>${amountStr}</strong> is waiting for you! Don't miss out on this opportunity.</p>`;
    } else if (hoursStale <= 48) {
      subject = `Your ${amountStr} funding offer won't last forever`;
      bodyParagraph = `<p>Your funding approval for <strong>${amountStr}</strong> is still available, but it won't last forever. We'd hate for you to miss out!</p>`;
    } else {
      subject = `Final reminder: Your ${amountStr} funding approval is expiring soon`;
      bodyParagraph = `<p><strong>Final reminder</strong> — your funding approval for <strong>${amountStr}</strong> is expiring soon. Act now so you don't lose this offer!</p>`;
    }

    const html = wrapEmailHtml(`
      <p>Hi ${name},</p>
      ${bodyParagraph}
      ${approvalLink
        ? `<p style="margin: 24px 0;">
             <a href="${approvalLink}" style="display: inline-block; padding: 14px 28px; background: #14B8A6; color: #fff; text-decoration: none; border-radius: 8px; font-weight: bold;">
               Review & Accept Your Offer
             </a>
           </p>`
        : `<p>Log in to your portal to review and accept your offer.</p>`
      }
      <p style="color: #666;">Have questions? Reply to this email — we're here to help!</p>
    `);

    sendTriggerEmail(email, subject, html).catch(err => {
      console.error('[TRIGGER] approval_stale_reminder email error (non-fatal):', err);
    });
  }

  console.log(`[TRIGGER] approval_stale_reminder (${hoursStale}h) fired for decision ${opts.decisionId}`);
}

// ──────────────────────────────────────────────────────────────────────────────
// SCHEDULED CHECKS
// ──────────────────────────────────────────────────────────────────────────────

const sentReminders = new Set<string>();

export async function runScheduledTriggerChecks(): Promise<void> {
  try {
    await checkStaleApprovals();
  } catch (err) {
    console.error('[TRIGGER CRON] staleApprovals error:', err);
  }

  try {
    await checkIncompleteApplications();
  } catch (err) {
    console.error('[TRIGGER CRON] incompleteApplications error:', err);
  }
}

async function checkStaleApprovals(): Promise<void> {
  const decisions = await storage.getAllBusinessUnderwritingDecisions();
  const now = Date.now();

  for (const d of decisions) {
    if (d.status !== 'approved') continue;
    if (!d.businessPhone) continue;

    const approvedAt = d.approvalDate || d.createdAt;
    if (!approvedAt) continue;

    const hoursElapsed = (now - new Date(approvedAt).getTime()) / (1000 * 60 * 60);

    const buckets = [24, 48, 72];
    for (const bucket of buckets) {
      if (hoursElapsed >= bucket && hoursElapsed < bucket + 1) {
        const key = `${d.id}:${bucket}`;
        if (sentReminders.has(key)) continue;
        sentReminders.add(key);

        const nameParts = (d.businessName || '').split(' ');
        triggerApprovalStaleReminder({
          decisionId: d.id,
          phone: d.businessPhone,
          email: d.businessEmail || undefined,
          firstName: nameParts[0] || undefined,
          businessName: d.businessName || undefined,
          approvalLink: d.approvalSlug ? `https://capitalloanconnect.com/approval-letter/${d.approvalSlug}` : undefined,
          amount: d.advanceAmount ? parseFloat(String(d.advanceAmount)) : undefined,
          hoursStale: bucket,
        });
      }
    }
  }
}

async function checkIncompleteApplications(): Promise<void> {
  const applications = await storage.getAllLoanApplications();
  const now = Date.now();

  for (const app of applications) {
    if (app.isCompleted || app.isFullApplicationCompleted) continue;
    if (!app.phone) continue;

    const createdAt = app.createdAt ? new Date(app.createdAt).getTime() : 0;
    if (!createdAt) continue;

    const hoursElapsed = (now - createdAt) / (1000 * 60 * 60);

    if (hoursElapsed >= 2 && hoursElapsed < 3) {
      const key = `app-incomplete:${app.id}`;
      if (sentReminders.has(key)) continue;
      sentReminders.add(key);

      const uploads = await storage.getBankStatementUploadsByEmail(app.email).catch(() => []);
      if (uploads.length > 0) continue;

      const nameParts = (app.fullName || '').trim().split(' ');
      triggerBankStatementsReminder({
        applicationId: app.id,
        phone: app.phone,
        email: app.email || undefined,
        firstName: nameParts[0] || undefined,
        businessName: app.businessName || undefined,
      });
    }
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// START / STOP the scheduled interval
// ──────────────────────────────────────────────────────────────────────────────

let scheduledInterval: ReturnType<typeof setInterval> | null = null;

const TRIGGER_CHECK_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

export function startScheduledTriggers(): void {
  if (scheduledInterval) return;
  console.log('[TRIGGERS] Starting scheduled trigger checks (every 30 min)');
  setTimeout(() => {
    runScheduledTriggerChecks();
  }, 60_000);
  scheduledInterval = setInterval(runScheduledTriggerChecks, TRIGGER_CHECK_INTERVAL_MS);
}

export function stopScheduledTriggers(): void {
  if (scheduledInterval) {
    clearInterval(scheduledInterval);
    scheduledInterval = null;
    console.log('[TRIGGERS] Stopped scheduled trigger checks');
  }
}
