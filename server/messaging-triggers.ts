/**
 * Automated Messaging Triggers
 *
 * Fires SMS + email (via the SMS middleware) at key moments in the merchant journey:
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
 * 6. app_incomplete_reminder  – application started but not completed after 1h
 */

import { fireSmsStageEvent, type StageEventPayload } from './sms-middleware';
import { sendSms } from './services/twilio';
import { storage } from './storage';

// ──────────────────────────────────────────────────────────────────────────────
// 1. APPLICATION ABANDONED (merchant left before uploading bank statements)
// Called from the client via beacon/API when the merchant navigates away from
// the intake or bank-statement pages without completing the upload step.
// ──────────────────────────────────────────────────────────────────────────────

const BANK_STATEMENTS_LINK = 'https://bit.ly/3ZnW1kS';

export async function triggerAppAbandoned(opts: {
  applicationId: string;
  phone?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  businessName?: string;
  lastStep?: number;
  abandonedPage?: string; // e.g. "intake", "bank_statements", "full_application"
}): Promise<void> {
  const { applicationId, phone, email, firstName, businessName, abandonedPage } = opts;

  if (!phone && !email) return; // nothing to send to

  const name = firstName || 'there';
  const page = abandonedPage || 'application';

  // Fire stage event to SMS middleware
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

    // Also send a direct SMS as an immediate follow-up
    const smsBody = abandonedPage === 'bank_statements'
      ? `Hi ${name}! We noticed you started your funding application but haven't uploaded your bank statements yet. You're almost there! You can reply to this text with photos of your statements or upload them here: ${BANK_STATEMENTS_LINK} — Today Capital Group`
      : `Hi ${name}! We noticed you started your funding application but didn't finish. You're so close! Complete your application and upload your bank statements here: ${BANK_STATEMENTS_LINK} — Today Capital Group`;

    sendSms(phone, smsBody).catch(err => {
      console.error('[TRIGGER] app_abandoned SMS error (non-fatal):', err);
    });
  }

  console.log(`[TRIGGER] app_abandoned fired for application ${applicationId} (page: ${page})`);
}

// ──────────────────────────────────────────────────────────────────────────────
// 2. APPROVAL CONGRATULATIONS
// Fired when a new approval is created for a merchant.
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

  if (!phone) return;

  const name = firstName || 'there';
  const amountStr = amount
    ? `$${amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
    : 'your funding';

  const smsBody = approvalLink
    ? `Congratulations ${name}! 🎉 You've been approved for ${amountStr}${lender ? ` through ${lender}` : ''}! View and accept your offer here: ${approvalLink} — Today Capital Group`
    : `Congratulations ${name}! 🎉 You've been approved for ${amountStr}${lender ? ` through ${lender}` : ''}! Log in to your portal to accept your offer. — Today Capital Group`;

  sendSms(phone, smsBody).catch(err => {
    console.error('[TRIGGER] approval_congratulations SMS error (non-fatal):', err);
  });

  console.log(`[TRIGGER] approval_congratulations fired for decision ${opts.decisionId}`);
}

// ──────────────────────────────────────────────────────────────────────────────
// 3. FUNDED CONGRATULATIONS
// Fired when a deal status changes to "funded".
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
  const { phone, firstName, amount, lender } = opts;

  if (!phone) return;

  const name = firstName || 'there';
  const amountStr = amount
    ? `$${amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
    : 'your funds';

  const smsBody = `Congratulations ${name}! 🎉 Your funding of ${amountStr}${lender ? ` from ${lender}` : ''} has been completed! Your funds should arrive shortly. If you have any questions, reply to this text. Thank you for choosing Today Capital Group!`;

  sendSms(phone, smsBody).catch(err => {
    console.error('[TRIGGER] funded_congratulations SMS error (non-fatal):', err);
  });

  console.log(`[TRIGGER] funded_congratulations fired for decision ${opts.decisionId}`);
}

// ──────────────────────────────────────────────────────────────────────────────
// 4. BANK STATEMENTS REMINDER
// Fired when a merchant submitted an application but hasn't uploaded bank
// statements after a certain period.  Called from the scheduled check.
// ──────────────────────────────────────────────────────────────────────────────

export async function triggerBankStatementsReminder(opts: {
  applicationId: string;
  phone: string;
  email?: string;
  firstName?: string;
  businessName?: string;
}): Promise<void> {
  const { phone, firstName, applicationId } = opts;
  const name = firstName || 'there';

  fireSmsStageEvent({
    stage: 'bank_statements_reminder',
    phone,
    email: opts.email || undefined,
    first_name: firstName || undefined,
    business_name: opts.businessName || undefined,
    deal_id: applicationId,
  });

  const smsBody = `Hi ${name}! Just a quick reminder — we still need your bank statements to move forward with your funding application. You can reply to this text with photos of your statements or upload them here: ${BANK_STATEMENTS_LINK} — Today Capital Group`;

  sendSms(phone, smsBody).catch(err => {
    console.error('[TRIGGER] bank_statements_reminder SMS error (non-fatal):', err);
  });

  console.log(`[TRIGGER] bank_statements_reminder fired for application ${applicationId}`);
}

// ──────────────────────────────────────────────────────────────────────────────
// 5. STALE APPROVAL REMINDER
// Checks for approvals that have been sitting for 24h, 48h, or 72h without
// being accepted/funded. Called from the scheduled interval.
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
  const { phone, firstName, approvalLink, amount, hoursStale } = opts;
  const name = firstName || 'there';
  const amountStr = amount
    ? `$${amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
    : 'your approved funding';

  let smsBody: string;
  if (hoursStale <= 24) {
    smsBody = `Hi ${name}! Just a reminder — your funding approval for ${amountStr} is waiting for you! Don't miss out. ${approvalLink ? `Accept here: ${approvalLink}` : 'Log in to your portal to accept.'} — Today Capital Group`;
  } else if (hoursStale <= 48) {
    smsBody = `Hi ${name}, your funding approval for ${amountStr} is still available but won't last forever. ${approvalLink ? `Review and accept: ${approvalLink}` : 'Log in to your portal to review.'} Questions? Reply to this text! — Today Capital Group`;
  } else {
    smsBody = `Hi ${name}, final reminder! Your ${amountStr} funding approval is expiring soon. ${approvalLink ? `Accept now: ${approvalLink}` : 'Log in to accept.'} Reply to this text if you need help. — Today Capital Group`;
  }

  fireSmsStageEvent({
    stage: 'approval_stale_reminder',
    phone,
    email: opts.email || undefined,
    first_name: firstName || undefined,
    business_name: opts.businessName || undefined,
    deal_id: opts.decisionId,
    approval_link: approvalLink || undefined,
    amount: amount || undefined,
    metadata: { hoursStale },
  });

  sendSms(phone, smsBody).catch(err => {
    console.error('[TRIGGER] approval_stale_reminder SMS error (non-fatal):', err);
  });

  console.log(`[TRIGGER] approval_stale_reminder (${hoursStale}h) fired for decision ${opts.decisionId}`);
}

// ──────────────────────────────────────────────────────────────────────────────
// SCHEDULED CHECKS
// Run on an interval (e.g. every 30 minutes) to find stale approvals and
// incomplete applications that need a nudge.
// ──────────────────────────────────────────────────────────────────────────────

// In-memory set of (decisionId + hourBucket) to avoid duplicate sends per server restart
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

    // Send reminders at ~24h, ~48h, ~72h
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
    // Only target applications that are NOT completed and have a phone number
    if (app.isCompleted || app.isFullApplicationCompleted) continue;
    if (!app.phone) continue;

    const createdAt = app.createdAt ? new Date(app.createdAt).getTime() : 0;
    if (!createdAt) continue;

    const hoursElapsed = (now - createdAt) / (1000 * 60 * 60);

    // Send a reminder ~2 hours after creation if still incomplete
    if (hoursElapsed >= 2 && hoursElapsed < 3) {
      const key = `app-incomplete:${app.id}`;
      if (sentReminders.has(key)) continue;
      sentReminders.add(key);

      // Check if they already uploaded bank statements
      const uploads = await storage.getBankStatementUploadsByEmail(app.email).catch(() => []);
      if (uploads.length > 0) continue; // they uploaded — no need to nag

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
  // Run once at startup after a short delay, then on interval
  setTimeout(() => {
    runScheduledTriggerChecks();
  }, 60_000); // 1 minute after startup
  scheduledInterval = setInterval(runScheduledTriggerChecks, TRIGGER_CHECK_INTERVAL_MS);
}

export function stopScheduledTriggers(): void {
  if (scheduledInterval) {
    clearInterval(scheduledInterval);
    scheduledInterval = null;
    console.log('[TRIGGERS] Stopped scheduled trigger checks');
  }
}
