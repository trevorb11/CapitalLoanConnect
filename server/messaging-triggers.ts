/**
 * Automated Messaging Triggers
 *
 * SMS  → routed through the SMS middleware (fireSmsStageEvent) with sms_body in metadata
 * Email → sent directly via Gmail API
 *
 * ALL SMS messages are kept under 160 characters and use bit.ly short links.
 * Emails use the full URLs.
 *
 * Links (SMS bit.ly / Email full):
 *   Upload Statements : bit.ly/4sqQzuR  / https://app.todaycapitalgroup.com/upload-statements
 *   Application       : bit.ly/49KSVfH  / http://app.todaycapitalgroup.com/
 *   Interest Form     : bit.ly/4qbbqAP  / https://app.todaycapitalgroup.com/intake/quiz
 *   Book Appointment  : bit.ly/4aLcV3i  / https://api.leadconnectorhq.com/widget/bookings/tcg-financing-appointment
 */

import { fireSmsStageEvent } from './sms-middleware';
import { storage } from './storage';

// ── LINK CONSTANTS ──────────────────────────────────────────────────────────

// SMS (bit.ly short links — keep SMS under 160 chars)
const SMS_LINK_UPLOAD    = 'bit.ly/4sqQzuR';
const SMS_LINK_APP       = 'bit.ly/49KSVfH';
const SMS_LINK_QUIZ      = 'bit.ly/4qbbqAP';
const SMS_LINK_BOOKING   = 'bit.ly/4aLcV3i';

// Email (full URLs)
const EMAIL_LINK_UPLOAD  = 'https://app.todaycapitalgroup.com/upload-statements';
const EMAIL_LINK_APP     = 'http://app.todaycapitalgroup.com/';
const EMAIL_LINK_QUIZ    = 'https://app.todaycapitalgroup.com/intake/quiz';
const EMAIL_LINK_BOOKING = 'https://api.leadconnectorhq.com/widget/bookings/tcg-financing-appointment';

// ── GMAIL EMAIL HELPER ──────────────────────────────────────────────────────

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

// ── EMAIL TEMPLATE WRAPPER ──────────────────────────────────────────────────

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

function ctaButton(href: string, label: string): string {
  return `<a href="${href}" style="display: inline-block; padding: 14px 28px; background: #14B8A6; color: #fff; text-decoration: none; border-radius: 8px; font-weight: bold;">${label}</a>`;
}

// ══════════════════════════════════════════════════════════════════════════════
// 1. APPLICATION ABANDONED
// ══════════════════════════════════════════════════════════════════════════════

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
  const isBankStatements = page === 'bank_statements';

  // SMS → middleware (<160 chars)
  if (phone) {
    const smsBody = isBankStatements
      ? `Almost there! Upload your bank statements to get funded: ${SMS_LINK_UPLOAD} -Today Capital Group`
      : `Finish your funding app & upload bank statements here: ${SMS_LINK_UPLOAD} -Today Capital Group`;

    fireSmsStageEvent({
      stage: 'app_abandoned',
      phone,
      email: email || undefined,
      first_name: opts.firstName || undefined,
      last_name: opts.lastName || undefined,
      business_name: businessName || undefined,
      deal_id: applicationId,
      metadata: { abandonedPage: page, lastStep: opts.lastStep, sms_body: smsBody },
    });
  }

  // Email → Gmail
  if (email) {
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
        ${ctaButton(EMAIL_LINK_UPLOAD, 'Upload Bank Statements')}
      </p>
      <p>Or, if you'd prefer to finish your application first:</p>
      <p style="margin: 16px 0;">
        ${ctaButton(EMAIL_LINK_APP, 'Complete Your Application')}
      </p>
      <p style="color: #666;">If you have any questions, simply reply to this email or <a href="${EMAIL_LINK_BOOKING}">book a call with us</a>.</p>
    `);

    sendTriggerEmail(email, subject, html).catch(err => {
      console.error('[TRIGGER] app_abandoned email error (non-fatal):', err);
    });
  }

  console.log(`[TRIGGER] app_abandoned fired for application ${applicationId} (page: ${page})`);
}

// ══════════════════════════════════════════════════════════════════════════════
// 2. APPROVAL CONGRATULATIONS
// ══════════════════════════════════════════════════════════════════════════════

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

  // SMS → middleware (<160 chars)
  // "Congrats! Approved for $50,000! Accept your offer: bit.ly/4aLcV3i -Today Capital Group" = ~86 chars
  if (phone) {
    const smsBody = `Congrats! Approved for ${amountStr}! Accept your offer: ${SMS_LINK_BOOKING} -Today Capital Group`;

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
      metadata: { sms_body: smsBody },
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
             ${ctaButton(approvalLink, 'View & Accept Your Offer')}
           </p>
           <p style="color: #666; font-size: 13px;">Or copy and paste this link: ${approvalLink}</p>`
        : `<p>Log in to your portal to review and accept your offer.</p>`
      }
      <p>Want to discuss your options? <a href="${EMAIL_LINK_BOOKING}">Book a call with our team</a>.</p>
      <p style="color: #666;">Questions? Simply reply to this email — we're here to help!</p>
    `);

    sendTriggerEmail(email, subject, html).catch(err => {
      console.error('[TRIGGER] approval_congratulations email error (non-fatal):', err);
    });
  }

  console.log(`[TRIGGER] approval_congratulations fired for decision ${opts.decisionId}`);
}

// ══════════════════════════════════════════════════════════════════════════════
// 3. FUNDED CONGRATULATIONS
// ══════════════════════════════════════════════════════════════════════════════

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

  // SMS → middleware (<160 chars)
  // "Congrats! Your $50,000 funding is complete! Funds arriving shortly. Reply w/ questions -TCG" = ~91 chars
  if (phone) {
    const smsBody = `Congrats! Your ${amountStr} funding is complete! Funds arriving shortly. Reply w/ questions -TCG`;

    fireSmsStageEvent({
      stage: 'funded_congratulations',
      phone,
      email: email || undefined,
      first_name: firstName || undefined,
      business_name: opts.businessName || undefined,
      deal_id: opts.decisionId,
      amount: amount || undefined,
      lender: lender || undefined,
      metadata: { sms_body: smsBody },
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
      <p>Need anything? <a href="${EMAIL_LINK_BOOKING}">Book a call</a> or simply reply to this email.</p>
      <p style="color: #666;">Thank you for choosing Today Capital Group!</p>
    `);

    sendTriggerEmail(email, subject, html).catch(err => {
      console.error('[TRIGGER] funded_congratulations email error (non-fatal):', err);
    });
  }

  console.log(`[TRIGGER] funded_congratulations fired for decision ${opts.decisionId}`);
}

// ══════════════════════════════════════════════════════════════════════════════
// 4. BANK STATEMENTS REMINDER
// ══════════════════════════════════════════════════════════════════════════════

export async function triggerBankStatementsReminder(opts: {
  applicationId: string;
  phone: string;
  email?: string;
  firstName?: string;
  businessName?: string;
}): Promise<void> {
  const { phone, firstName, applicationId, email } = opts;
  const name = firstName || 'there';

  // SMS → middleware (<160 chars)
  // "Reminder: Upload your bank statements to move forward with funding: bit.ly/4sqQzuR -TCG" = ~87 chars
  const smsBody = `Reminder: Upload your bank statements to move forward with funding: ${SMS_LINK_UPLOAD} -TCG`;

  fireSmsStageEvent({
    stage: 'bank_statements_reminder',
    phone,
    email: email || undefined,
    first_name: firstName || undefined,
    business_name: opts.businessName || undefined,
    deal_id: applicationId,
    metadata: { sms_body: smsBody },
  });

  // Email → Gmail
  if (email) {
    const subject = "Reminder: We still need your bank statements";
    const html = wrapEmailHtml(`
      <p>Hi ${name},</p>
      <p>Just a quick reminder — we still need your <strong>bank statements</strong> to move forward with your funding application.</p>
      <p>You can upload them here or simply reply to this email with photos of your last 3 months of business bank statements:</p>
      <p style="margin: 24px 0;">
        ${ctaButton(EMAIL_LINK_UPLOAD, 'Upload Bank Statements')}
      </p>
      <p>Prefer to talk it through? <a href="${EMAIL_LINK_BOOKING}">Book a call with our team</a>.</p>
      <p style="color: #666;">Questions? Reply to this email — we're happy to help!</p>
    `);

    sendTriggerEmail(email, subject, html).catch(err => {
      console.error('[TRIGGER] bank_statements_reminder email error (non-fatal):', err);
    });
  }

  console.log(`[TRIGGER] bank_statements_reminder fired for application ${applicationId}`);
}

// ══════════════════════════════════════════════════════════════════════════════
// 5. STALE APPROVAL REMINDER (24h / 48h / 72h)
// ══════════════════════════════════════════════════════════════════════════════

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

  // SMS → middleware (<160 chars each)
  let smsBody: string;
  if (hoursStale <= 24) {
    // "Your funding approval is waiting! Accept your offer: bit.ly/4aLcV3i -Today Capital Group" = ~88 chars
    smsBody = `Your funding approval is waiting! Accept your offer: ${SMS_LINK_BOOKING} -Today Capital Group`;
  } else if (hoursStale <= 48) {
    // "Your funding offer won't last forever. Accept now: bit.ly/4aLcV3i -Today Capital Group" = ~85 chars
    smsBody = `Your funding offer won't last forever. Accept now: ${SMS_LINK_BOOKING} -Today Capital Group`;
  } else {
    // "Final reminder: Your funding approval expires soon! Accept: bit.ly/4aLcV3i -Today Capital Group" = ~95 chars
    smsBody = `Final reminder: Your funding approval expires soon! Accept: ${SMS_LINK_BOOKING} -Today Capital Group`;
  }

  fireSmsStageEvent({
    stage: 'approval_stale_reminder',
    phone,
    email: email || undefined,
    first_name: firstName || undefined,
    business_name: opts.businessName || undefined,
    deal_id: opts.decisionId,
    approval_link: approvalLink || undefined,
    amount: amount || undefined,
    metadata: { hoursStale, sms_body: smsBody },
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
             ${ctaButton(approvalLink, 'Review & Accept Your Offer')}
           </p>`
        : `<p>Log in to your portal to review and accept your offer.</p>`
      }
      <p>Want to discuss? <a href="${EMAIL_LINK_BOOKING}">Book a call</a> or reply to this email.</p>
      <p style="color: #666;">We're here to help!</p>
    `);

    sendTriggerEmail(email, subject, html).catch(err => {
      console.error('[TRIGGER] approval_stale_reminder email error (non-fatal):', err);
    });
  }

  console.log(`[TRIGGER] approval_stale_reminder (${hoursStale}h) fired for decision ${opts.decisionId}`);
}

// ══════════════════════════════════════════════════════════════════════════════
// SCHEDULED CHECKS
// ══════════════════════════════════════════════════════════════════════════════

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

// ══════════════════════════════════════════════════════════════════════════════
// START / STOP
// ══════════════════════════════════════════════════════════════════════════════

let scheduledInterval: ReturnType<typeof setInterval> | null = null;
const TRIGGER_CHECK_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

export function startScheduledTriggers(): void {
  if (scheduledInterval) return;
  console.log('[TRIGGERS] Starting scheduled trigger checks (every 30 min)');
  setTimeout(() => { runScheduledTriggerChecks(); }, 60_000);
  scheduledInterval = setInterval(runScheduledTriggerChecks, TRIGGER_CHECK_INTERVAL_MS);
}

export function stopScheduledTriggers(): void {
  if (scheduledInterval) {
    clearInterval(scheduledInterval);
    scheduledInterval = null;
    console.log('[TRIGGERS] Stopped scheduled trigger checks');
  }
}
