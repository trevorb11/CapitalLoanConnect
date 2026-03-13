/**
 * Twilio SMS Service
 * Sends SMS notifications through Twilio when messages are exchanged
 * between staff and merchants in the portal messaging system.
 */

// Set these environment variables: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || '';
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || '';
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || '';

const TWILIO_API_BASE = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;

interface SendSmsResult {
  success: boolean;
  sid?: string;
  error?: string;
}

export async function sendSms(to: string, body: string): Promise<SendSmsResult> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    console.log('[TWILIO] Skipping SMS — credentials not configured');
    return { success: false, error: 'Twilio credentials not configured' };
  }
  try {
    const params = new URLSearchParams();
    params.append('To', to);
    params.append('From', TWILIO_PHONE_NUMBER);
    params.append('Body', body);

    const res = await fetch(TWILIO_API_BASE, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error('[TWILIO] SMS send failed:', res.status, errBody);
      return { success: false, error: `Twilio API ${res.status}` };
    }

    const data = await res.json();
    console.log('[TWILIO] SMS sent:', data.sid, 'to', to);
    return { success: true, sid: data.sid };
  } catch (err) {
    console.error('[TWILIO] SMS send error (non-fatal):', err);
    return { success: false, error: String(err) };
  }
}

/**
 * Notify a merchant via SMS that they have a new message from staff.
 * Non-blocking — errors are logged but never thrown.
 */
export async function notifyMerchantNewMessage(phoneNumber: string, senderName: string): Promise<void> {
  if (!phoneNumber) return;
  const body = `You have a new message from ${senderName} on your Today Capital Group portal. Log in to view it.`;
  await sendSms(phoneNumber, body);
}

/**
 * Notify staff via SMS that a merchant sent a message.
 * Non-blocking — errors are logged but never thrown.
 */
export async function notifyStaffNewMerchantMessage(staffPhone: string, merchantName: string): Promise<void> {
  if (!staffPhone) return;
  const body = `New portal message from ${merchantName}. Log in to the dashboard to respond.`;
  await sendSms(staffPhone, body);
}
