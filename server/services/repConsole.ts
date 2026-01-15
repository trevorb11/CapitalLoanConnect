/**
 * Rep Console Service
 *
 * Aggregates data from GoHighLevel into a unified Contact360 view.
 * Handles:
 * - Authenticated GHL API calls with retry on rate limits
 * - Fetching contact, notes, tasks, conversations, opportunities
 * - Mapping raw GHL responses to clean Contact360 format
 * - Computing derived signals (last touch, overdue status)
 */

import type {
  Contact360,
  RepConsoleContact,
  RepConsoleOpportunity,
  RepConsoleTask,
  RepConsoleNote,
  RepConsoleConversation,
  RepConsoleMessage,
  RepConsoleLenderApproval,
  RepConsoleComputed,
  ApprovalStatus,
  MessageType,
  MessageDirection,
  GHLRawContact,
  GHLRawOpportunity,
  GHLRawTask,
  GHLRawNote,
  GHLRawConversation,
  GHLRawMessage,
  GHLRawPipeline,
} from '@shared/repConsoleTypes';
import { storage } from '../storage';

const GHL_API_BASE = 'https://services.leadconnectorhq.com';
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 1000;

// ========================================
// TOKEN STORE (MVP: env var, future: DB per location)
// ========================================
function getAccessToken(locationId: string): string {
  // MVP: Single location, use env var
  // Future: Look up token from DB by locationId
  const token = process.env.GHL_API_KEY;
  if (!token) {
    throw new Error('GHL_API_KEY not configured');
  }
  return token;
}

function getLocationId(): string {
  const locationId = process.env.GHL_LOCATION_ID;
  if (!locationId) {
    throw new Error('GHL_LOCATION_ID not configured');
  }
  return locationId;
}

// ========================================
// GHL API CLIENT WITH RETRY
// ========================================
async function ghlFetch<T>(
  endpoint: string,
  token: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${GHL_API_BASE}${endpoint}`;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Version: '2021-07-28',
          ...options.headers,
        },
      });

      // Handle rate limiting with retry
      if (response.status === 429) {
        if (attempt < MAX_RETRIES) {
          const delayMs = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
          console.log(`[RepConsole] Rate limited, retrying in ${delayMs}ms (attempt ${attempt}/${MAX_RETRIES})`);
          await sleep(delayMs);
          continue;
        }
        throw new Error('GHL rate limit exceeded after retries');
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`GHL API error ${response.status}: ${errorText}`);
      }

      return response.json();
    } catch (error) {
      if (attempt === MAX_RETRIES) {
        throw error;
      }
      // Retry on network errors
      const delayMs = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
      console.log(`[RepConsole] Request failed, retrying in ${delayMs}ms (attempt ${attempt}/${MAX_RETRIES})`);
      await sleep(delayMs);
    }
  }

  throw new Error('GHL request failed after max retries');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ========================================
// GHL DATA FETCHERS
// ========================================
async function fetchContact(token: string, contactId: string): Promise<GHLRawContact | null> {
  try {
    const response = await ghlFetch<{ contact: GHLRawContact }>(
      `/contacts/${contactId}`,
      token
    );
    return response.contact || null;
  } catch (error) {
    console.error('[RepConsole] Error fetching contact:', error);
    return null;
  }
}

async function fetchNotes(token: string, contactId: string): Promise<GHLRawNote[]> {
  try {
    const response = await ghlFetch<{ notes: GHLRawNote[] }>(
      `/contacts/${contactId}/notes`,
      token
    );
    return response.notes || [];
  } catch (error) {
    console.error('[RepConsole] Error fetching notes:', error);
    return [];
  }
}

async function fetchTasks(token: string, contactId: string): Promise<GHLRawTask[]> {
  try {
    const response = await ghlFetch<{ tasks: GHLRawTask[] }>(
      `/contacts/${contactId}/tasks`,
      token
    );
    return response.tasks || [];
  } catch (error) {
    console.error('[RepConsole] Error fetching tasks:', error);
    return [];
  }
}

async function fetchConversations(
  token: string,
  contactId: string,
  locationId: string
): Promise<{ conversations: GHLRawConversation[]; messages: Map<string, GHLRawMessage[]> }> {
  try {
    const response = await ghlFetch<{ conversations: GHLRawConversation[] }>(
      `/conversations/search?locationId=${locationId}&contactId=${contactId}`,
      token
    );
    const conversations = response.conversations || [];

    // Fetch messages for each conversation (parallel, limited to first 5)
    const messagesMap = new Map<string, GHLRawMessage[]>();
    const conversationsToFetch = conversations.slice(0, 5);

    await Promise.all(
      conversationsToFetch.map(async (conv) => {
        try {
          const msgResponse = await ghlFetch<{ messages: { messages: GHLRawMessage[] } }>(
            `/conversations/${conv.id}/messages`,
            token
          );
          messagesMap.set(conv.id, msgResponse.messages?.messages || []);
        } catch {
          messagesMap.set(conv.id, []);
        }
      })
    );

    return { conversations, messages: messagesMap };
  } catch (error) {
    console.error('[RepConsole] Error fetching conversations:', error);
    return { conversations: [], messages: new Map() };
  }
}

async function fetchOpportunity(
  token: string,
  opportunityId: string
): Promise<GHLRawOpportunity | null> {
  try {
    const response = await ghlFetch<{ opportunity: GHLRawOpportunity }>(
      `/opportunities/${opportunityId}`,
      token
    );
    return response.opportunity || null;
  } catch (error) {
    console.error('[RepConsole] Error fetching opportunity:', error);
    return null;
  }
}

async function fetchOpportunitiesByContact(
  token: string,
  contactId: string,
  locationId: string
): Promise<GHLRawOpportunity[]> {
  try {
    const response = await ghlFetch<{ opportunities: GHLRawOpportunity[] }>(
      `/opportunities/search?location_id=${locationId}&contact_id=${contactId}`,
      token
    );
    return response.opportunities || [];
  } catch (error) {
    console.error('[RepConsole] Error searching opportunities:', error);
    return [];
  }
}

async function fetchPipelines(token: string, locationId: string): Promise<GHLRawPipeline[]> {
  try {
    const response = await ghlFetch<{ pipelines: GHLRawPipeline[] }>(
      `/opportunities/pipelines?locationId=${locationId}`,
      token
    );
    return response.pipelines || [];
  } catch (error) {
    console.error('[RepConsole] Error fetching pipelines:', error);
    return [];
  }
}

// ========================================
// LOCAL DB: LENDER APPROVALS
// ========================================
async function fetchLenderApprovals(contactId: string, businessName: string | null): Promise<RepConsoleLenderApproval[]> {
  try {
    // Query by loanApplicationId or businessName
    const approvals = await storage.getLenderApprovalsByBusinessName(businessName || '');
    return approvals.map((a) => ({
      id: a.id,
      lenderName: a.lenderName,
      approvedAmount: a.approvedAmount ? parseFloat(a.approvedAmount) : null,
      paybackAmount: a.paybackAmount ? parseFloat(a.paybackAmount) : null,
      paymentAmount: a.paymentAmount ? parseFloat(a.paymentAmount) : null,
      paymentFrequency: a.paymentFrequency,
      termLength: a.termLength,
      factorRate: a.factorRate,
      productType: a.productType,
      status: a.status || 'pending',
      expirationDate: a.expirationDate,
      conditions: a.conditions,
      emailReceivedAt: a.emailReceivedAt?.toISOString() || null,
      createdAt: a.createdAt?.toISOString() || new Date().toISOString(),
    }));
  } catch (error) {
    console.error('[RepConsole] Error fetching lender approvals:', error);
    return [];
  }
}

// ========================================
// MAPPERS: GHL RAW -> CLEAN TYPES
// ========================================
function mapContact(raw: GHLRawContact): RepConsoleContact {
  const firstName = raw.firstName || '';
  const lastName = raw.lastName || '';

  // Parse custom fields into a flat object
  const customFields: Record<string, string> = {};
  if (raw.customFields) {
    for (const cf of raw.customFields) {
      const key = cf.key || cf.id || '';
      const value = cf.value || cf.field_value || '';
      if (key) {
        customFields[key] = value;
      }
    }
  }

  return {
    id: raw.id,
    firstName,
    lastName,
    name: `${firstName} ${lastName}`.trim() || 'Unknown',
    email: raw.email || '',
    phone: raw.phone || '',
    companyName: raw.companyName || '',
    tags: raw.tags || [],
    customFields,
    dateAdded: raw.dateAdded || '',
    dateUpdated: raw.dateUpdated || '',
    source: raw.source || '',
  };
}

function mapOpportunity(
  raw: GHLRawOpportunity,
  pipelines: GHLRawPipeline[]
): RepConsoleOpportunity {
  // Find pipeline and stage names
  const pipeline = pipelines.find((p) => p.id === raw.pipelineId);
  const stage = pipeline?.stages?.find((s) => s.id === raw.pipelineStageId);

  // Extract approval data from custom fields
  const cf = raw.customFields || {};

  const parseApprovalStatus = (val: string | undefined): ApprovalStatus => {
    if (!val) return 'Unknown';
    const normalized = val.toLowerCase().trim();
    if (normalized.includes('approved')) return 'Approved';
    if (normalized.includes('counter')) return 'Counter';
    if (normalized.includes('declined')) return 'Declined';
    if (normalized.includes('pending')) return 'Pending';
    if (normalized.includes('submitted')) return 'Submitted';
    if (normalized.includes('funded')) return 'Funded';
    if (normalized.includes('expired')) return 'Expired';
    if (normalized.includes('not submitted')) return 'Not Submitted';
    return 'Unknown';
  };

  const parseNumber = (val: any): number | null => {
    if (val === undefined || val === null || val === '') return null;
    const num = parseFloat(String(val).replace(/[$,]/g, ''));
    return isNaN(num) ? null : num;
  };

  const parseFrequency = (val: string | undefined): 'daily' | 'weekly' | 'monthly' | 'other' | null => {
    if (!val) return null;
    const normalized = val.toLowerCase();
    if (normalized.includes('daily')) return 'daily';
    if (normalized.includes('weekly')) return 'weekly';
    if (normalized.includes('monthly')) return 'monthly';
    return 'other';
  };

  const parseStatus = (val: string | undefined): 'open' | 'won' | 'lost' | 'abandoned' => {
    if (!val) return 'open';
    const normalized = val.toLowerCase();
    if (normalized === 'won') return 'won';
    if (normalized === 'lost') return 'lost';
    if (normalized === 'abandoned') return 'abandoned';
    return 'open';
  };

  return {
    id: raw.id,
    name: raw.name || 'Untitled Deal',
    pipelineId: raw.pipelineId || '',
    pipelineName: pipeline?.name || 'Unknown Pipeline',
    stageId: raw.pipelineStageId || '',
    stageName: stage?.name || 'Unknown Stage',
    status: parseStatus(raw.status),
    monetaryValue: parseNumber(raw.monetaryValue),

    approvalStatus: parseApprovalStatus(
      cf.approvalStatus || cf.approval_status || cf['contact.approval_status']
    ),
    lenderName:
      cf.lenderName || cf.lender_name || cf['contact.lender_name'] || null,
    offerTerms: {
      payback: parseNumber(cf.offerPayback || cf.offer_payback || cf['contact.offer_payback']),
      payment: parseNumber(cf.offerPayment || cf.offer_payment || cf['contact.offer_payment']),
      termDays: parseNumber(cf.offerTermDays || cf.offer_term_days || cf['contact.offer_term_days']),
      frequency: parseFrequency(cf.offerFrequency || cf.offer_frequency || cf['contact.offer_frequency']),
      expiresAt: cf.offerExpiresAt || cf.offer_expires_at || cf['contact.offer_expires_at'] || null,
    },

    nextAction: cf.nextAction || cf.next_action || cf['contact.next_action'] || null,
    nextActionDue:
      cf.nextActionDue || cf.next_action_due || cf['contact.next_action_due'] || null,

    dateAdded: raw.dateAdded || '',
    dateUpdated: raw.updatedAt || '',
  };
}

function mapTask(raw: GHLRawTask): RepConsoleTask {
  return {
    id: raw.id,
    title: raw.title || 'Untitled Task',
    body: raw.body || '',
    dueDate: raw.dueDate || null,
    isCompleted: !!raw.completed,
    assignedTo: raw.assignedTo || null,
    dateAdded: raw.dateAdded || '',
  };
}

function mapNote(raw: GHLRawNote): RepConsoleNote {
  return {
    id: raw.id,
    body: raw.body || '',
    userId: raw.userId || null,
    userName: null, // Would need user lookup to resolve
    dateAdded: raw.dateAdded || '',
  };
}

function mapMessageType(val: string | undefined): MessageType {
  if (!val) return 'other';
  const normalized = val.toLowerCase();
  if (normalized === 'sms' || normalized === 'text') return 'sms';
  if (normalized === 'email') return 'email';
  if (normalized === 'call' || normalized === 'phone') return 'call';
  if (normalized === 'voicemail' || normalized === 'vm') return 'voicemail';
  if (normalized === 'whatsapp') return 'whatsapp';
  if (normalized === 'facebook' || normalized === 'fb') return 'facebook';
  if (normalized === 'instagram' || normalized === 'ig') return 'instagram';
  return 'other';
}

function mapMessageDirection(val: string | undefined): MessageDirection {
  if (!val) return 'inbound';
  return val.toLowerCase() === 'outbound' ? 'outbound' : 'inbound';
}

function mapConversation(
  raw: GHLRawConversation,
  messages: GHLRawMessage[]
): RepConsoleConversation {
  return {
    id: raw.id,
    type: mapMessageType(raw.type),
    unreadCount: raw.unreadCount || 0,
    lastMessageDate: raw.lastMessageDate || null,
    lastMessageBody: raw.lastMessageBody || null,
    messages: messages.slice(0, 20).map((m) => ({
      id: m.id,
      direction: mapMessageDirection(m.direction),
      type: mapMessageType(m.type),
      body: m.body || '',
      dateAdded: m.dateAdded || '',
      status: m.status || null,
    })),
  };
}

// ========================================
// COMPUTED SIGNALS
// ========================================
function computeSignals(
  notes: RepConsoleNote[],
  conversations: RepConsoleConversation[],
  opportunity: RepConsoleOpportunity | null
): RepConsoleComputed {
  const now = new Date();

  // Find last touch across notes and conversations
  let lastTouchDate: Date | null = null;
  let lastTouchType: 'note' | 'message' | 'task' | null = null;

  // Check notes
  for (const note of notes) {
    if (note.dateAdded) {
      const noteDate = new Date(note.dateAdded);
      if (!lastTouchDate || noteDate > lastTouchDate) {
        lastTouchDate = noteDate;
        lastTouchType = 'note';
      }
    }
  }

  // Check messages
  for (const conv of conversations) {
    for (const msg of conv.messages) {
      if (msg.dateAdded) {
        const msgDate = new Date(msg.dateAdded);
        if (!lastTouchDate || msgDate > lastTouchDate) {
          lastTouchDate = msgDate;
          lastTouchType = 'message';
        }
      }
    }
  }

  // Calculate days since last touch
  let daysSinceLastTouch: number | null = null;
  if (lastTouchDate) {
    const diffMs = now.getTime() - lastTouchDate.getTime();
    daysSinceLastTouch = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  // Check overdue status
  let isOverdue = false;
  let overdueByDays: number | null = null;
  if (opportunity?.nextActionDue) {
    const dueDate = new Date(opportunity.nextActionDue);
    if (dueDate < now) {
      isOverdue = true;
      const diffMs = now.getTime() - dueDate.getTime();
      overdueByDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    }
  }

  // Calculate unread counts
  let totalUnreadCount = 0;
  let hasUnreadMessages = false;
  for (const conv of conversations) {
    totalUnreadCount += conv.unreadCount;
    if (conv.unreadCount > 0) {
      hasUnreadMessages = true;
    }
  }

  return {
    lastTouchDate: lastTouchDate?.toISOString() || null,
    lastTouchType,
    daysSinceLastTouch,
    isOverdue,
    overdueByDays,
    hasUnreadMessages,
    totalUnreadCount,
  };
}

// ========================================
// FIND ACTIVE OPPORTUNITY
// ========================================
async function findActiveOpportunity(
  token: string,
  contact: RepConsoleContact,
  locationId: string,
  pipelines: GHLRawPipeline[]
): Promise<RepConsoleOpportunity | null> {
  // Strategy 1: Check for activeOpportunityId in custom fields
  const activeOppId =
    contact.customFields['activeOpportunityId'] ||
    contact.customFields['contact.active_opportunity_id'] ||
    contact.customFields['active_opportunity_id'];

  if (activeOppId) {
    const opp = await fetchOpportunity(token, activeOppId);
    if (opp) {
      return mapOpportunity(opp, pipelines);
    }
  }

  // Strategy 2: Search for opportunities by contact and find the most recent open one
  const opportunities = await fetchOpportunitiesByContact(token, contact.id, locationId);

  if (opportunities.length === 0) {
    return null;
  }

  // Filter to open opportunities and sort by most recent
  const openOpps = opportunities.filter(
    (o) => o.status?.toLowerCase() !== 'won' && o.status?.toLowerCase() !== 'lost'
  );

  if (openOpps.length === 0) {
    // No open opportunities, return the most recent one
    const sorted = opportunities.sort((a, b) => {
      const dateA = new Date(a.updatedAt || a.dateAdded || 0).getTime();
      const dateB = new Date(b.updatedAt || b.dateAdded || 0).getTime();
      return dateB - dateA;
    });
    return mapOpportunity(sorted[0], pipelines);
  }

  // Return the most recently updated open opportunity
  const sorted = openOpps.sort((a, b) => {
    const dateA = new Date(a.updatedAt || a.dateAdded || 0).getTime();
    const dateB = new Date(b.updatedAt || b.dateAdded || 0).getTime();
    return dateB - dateA;
  });

  return mapOpportunity(sorted[0], pipelines);
}

// ========================================
// MAIN AGGREGATOR FUNCTION
// ========================================
export async function getContact360(
  contactId: string,
  locationIdOverride?: string
): Promise<Contact360> {
  const locationId = locationIdOverride || getLocationId();
  const token = getAccessToken(locationId);

  console.log(`[RepConsole] Fetching Contact360 for ${contactId} in location ${locationId}`);

  // Fetch all data in parallel where possible
  const [rawContact, rawNotes, rawTasks, pipelinesData] = await Promise.all([
    fetchContact(token, contactId),
    fetchNotes(token, contactId),
    fetchTasks(token, contactId),
    fetchPipelines(token, locationId),
  ]);

  if (!rawContact) {
    throw new Error(`Contact ${contactId} not found`);
  }

  const contact = mapContact(rawContact);

  // Fetch conversations (depends on locationId)
  const { conversations: rawConversations, messages: messagesMap } = await fetchConversations(
    token,
    contactId,
    locationId
  );

  // Find active opportunity (depends on contact for custom field lookup)
  const activeOpportunity = await findActiveOpportunity(
    token,
    contact,
    locationId,
    pipelinesData
  );

  // Fetch local lender approvals
  const lenderApprovals = await fetchLenderApprovals(contactId, contact.companyName);

  // Map all data
  const tasks = rawTasks.map(mapTask);
  const notes = rawNotes.map(mapNote);
  const conversations = rawConversations.map((c) =>
    mapConversation(c, messagesMap.get(c.id) || [])
  );

  // Compute signals
  const computed = computeSignals(notes, conversations, activeOpportunity);

  return {
    contact,
    activeOpportunity,
    tasks,
    notes,
    conversations,
    lenderApprovals,
    computed,
    fetchedAt: new Date().toISOString(),
    locationId,
  };
}

// ========================================
// EXPORT SERVICE OBJECT
// ========================================
export const repConsoleService = {
  getContact360,
  getAccessToken,
  getLocationId,
};
