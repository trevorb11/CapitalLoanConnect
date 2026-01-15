/**
 * Rep Console Types - Contact360 Payload Definition
 *
 * This defines the unified "Contact 360" view that aggregates:
 * - Contact info (identity, tags, custom fields)
 * - Active opportunity/deal (pipeline stage, approval status, lender terms)
 * - Tasks and follow-ups
 * - Notes
 * - Conversations (text/email history)
 * - Computed signals (last touch, overdue status)
 */

// ========================================
// CONTACT
// ========================================
export interface RepConsoleContact {
  id: string;
  firstName: string;
  lastName: string;
  name: string; // Computed: firstName + lastName
  email: string;
  phone: string;
  companyName: string;
  tags: string[];
  customFields: Record<string, string>;
  dateAdded: string;
  dateUpdated: string;
  source: string;
}

// ========================================
// OPPORTUNITY / DEAL
// ========================================
export type ApprovalStatus =
  | 'Not Submitted'
  | 'Submitted'
  | 'Pending'
  | 'Approved'
  | 'Counter'
  | 'Declined'
  | 'Funded'
  | 'Expired'
  | 'Unknown';

export interface OfferTerms {
  payback: number | null;
  payment: number | null;
  termDays: number | null;
  frequency: 'daily' | 'weekly' | 'monthly' | 'other' | null;
  expiresAt: string | null; // ISO date
}

export interface RepConsoleOpportunity {
  id: string;
  name: string;
  pipelineId: string;
  pipelineName: string;
  stageId: string;
  stageName: string;
  status: 'open' | 'won' | 'lost' | 'abandoned';
  monetaryValue: number | null;

  // Approval/lender fields from custom fields
  approvalStatus: ApprovalStatus;
  lenderName: string | null;
  offerTerms: OfferTerms;

  // Next action tracking
  nextAction: string | null;
  nextActionDue: string | null; // ISO date

  dateAdded: string;
  dateUpdated: string;
}

// ========================================
// TASKS
// ========================================
export interface RepConsoleTask {
  id: string;
  title: string;
  body: string;
  dueDate: string | null;
  isCompleted: boolean;
  assignedTo: string | null;
  dateAdded: string;
}

// ========================================
// NOTES
// ========================================
export interface RepConsoleNote {
  id: string;
  body: string;
  userId: string | null;
  userName: string | null;
  dateAdded: string;
}

// ========================================
// CONVERSATIONS
// ========================================
export type MessageDirection = 'inbound' | 'outbound';
export type MessageType = 'sms' | 'email' | 'call' | 'voicemail' | 'whatsapp' | 'facebook' | 'instagram' | 'other';

export interface RepConsoleMessage {
  id: string;
  direction: MessageDirection;
  type: MessageType;
  body: string;
  dateAdded: string;
  status: string | null;
}

export interface RepConsoleConversation {
  id: string;
  type: MessageType;
  unreadCount: number;
  lastMessageDate: string | null;
  lastMessageBody: string | null;
  messages: RepConsoleMessage[];
}

// ========================================
// COMPUTED SIGNALS
// ========================================
export interface RepConsoleComputed {
  lastTouchDate: string | null; // ISO date - latest of note time or message time
  lastTouchType: 'note' | 'message' | 'task' | null;
  daysSinceLastTouch: number | null;
  isOverdue: boolean; // nextActionDue < now
  overdueByDays: number | null;
  hasUnreadMessages: boolean;
  totalUnreadCount: number;
}

// ========================================
// LENDER APPROVAL (from local DB)
// ========================================
export interface RepConsoleLenderApproval {
  id: string;
  lenderName: string;
  approvedAmount: number | null;
  paybackAmount: number | null;
  paymentAmount: number | null;
  paymentFrequency: string | null;
  termLength: string | null;
  factorRate: string | null;
  productType: string | null;
  status: string;
  expirationDate: string | null;
  conditions: string | null;
  emailReceivedAt: string | null;
  createdAt: string;
}

// ========================================
// MAIN PAYLOAD: CONTACT360
// ========================================
export interface Contact360 {
  contact: RepConsoleContact;
  activeOpportunity: RepConsoleOpportunity | null;
  tasks: RepConsoleTask[];
  notes: RepConsoleNote[];
  conversations: RepConsoleConversation[];
  lenderApprovals: RepConsoleLenderApproval[]; // From local DB
  computed: RepConsoleComputed;

  // Metadata
  fetchedAt: string; // ISO date
  locationId: string;
}

// ========================================
// API RESPONSE WRAPPER
// ========================================
export interface RepConsoleApiResponse {
  success: boolean;
  data?: Contact360;
  error?: string;
}

// ========================================
// GHL RAW RESPONSE TYPES (for internal mapping)
// ========================================
export interface GHLRawContact {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  companyName?: string;
  tags?: string[];
  customFields?: Array<{ id?: string; key?: string; value?: string; field_value?: string }>;
  dateAdded?: string;
  dateUpdated?: string;
  source?: string;
  [key: string]: any;
}

export interface GHLRawOpportunity {
  id: string;
  name?: string;
  pipelineId?: string;
  pipelineStageId?: string;
  status?: string;
  monetaryValue?: number;
  customFields?: Record<string, any>;
  dateAdded?: string;
  updatedAt?: string;
  contact?: { id: string };
  [key: string]: any;
}

export interface GHLRawTask {
  id: string;
  title?: string;
  body?: string;
  dueDate?: string;
  completed?: boolean;
  assignedTo?: string;
  dateAdded?: string;
  [key: string]: any;
}

export interface GHLRawNote {
  id: string;
  body?: string;
  userId?: string;
  dateAdded?: string;
  [key: string]: any;
}

export interface GHLRawConversation {
  id: string;
  type?: string;
  unreadCount?: number;
  lastMessageDate?: string;
  lastMessageBody?: string;
  [key: string]: any;
}

export interface GHLRawMessage {
  id: string;
  direction?: string;
  type?: string;
  body?: string;
  dateAdded?: string;
  status?: string;
  [key: string]: any;
}

export interface GHLRawPipeline {
  id: string;
  name: string;
  stages?: Array<{ id: string; name: string }>;
}
