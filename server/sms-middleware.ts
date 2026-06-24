/**
 * SMS Middleware Integration
 * Fires stage events to our SMS middleware server on key merchant journey moments.
 * Middleware URL: https://specificatively-hygrophytic-jermaine.ngrok-free.dev/sms/webhooks/capitaloan/stage-event
 * Secret: tcg-clc-webhook-2026
 */

const SMS_MIDDLEWARE_URL = process.env.SMS_MIDDLEWARE_URL || 'https://specificatively-hygrophytic-jermaine.ngrok-free.dev/sms/webhooks/capitaloan/stage-event';
const SMS_WEBHOOK_SECRET = process.env.SMS_WEBHOOK_SECRET || 'tcg-clc-webhook-2026';

export interface StageEventPayload {
  stage: string;
  phone: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  business_name?: string;
  deal_id?: string;
  approval_link?: string;
  amount?: number;
  lender?: string;
  agent_slug?: string;
  ghl_contact_id?: string;
  metadata?: Record<string, unknown>;
}

export async function fireSmsStageEvent(payload: StageEventPayload): Promise<void> {
  try {
    const res = await fetch(SMS_MIDDLEWARE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': SMS_WEBHOOK_SECRET,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      console.error('[SMS] Stage event failed:', payload.stage, res.status, await res.text());
    } else {
      console.log('[SMS] Stage event fired:', payload.stage, 'for', payload.phone);
    }
  } catch (err) {
    // Non-blocking — log and continue. Never throw, never block the main flow.
    console.error('[SMS] Stage event error (non-fatal):', payload.stage, err);
  }

  // Log to sms_campaign_log for analytics (non-blocking)
  try {
    const { pool: dbPool } = await import('./db');
    await dbPool.query(
      `INSERT INTO sms_campaign_log (phone, email, stage, message_body, business_name, deal_id, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        payload.phone,
        payload.email || null,
        payload.stage,
        (payload.metadata as any)?.sms_body || null,
        payload.business_name || null,
        payload.deal_id || null,
        payload.metadata ? JSON.stringify(payload.metadata) : null,
      ]
    );
  } catch {
    // Never block main flow for analytics logging
  }
}
