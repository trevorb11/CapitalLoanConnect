import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

// OpenAI — used for lighter utility parsers (contact search, commands, email parsing)
const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || undefined,
});

// Anthropic — used for bank statement analysis (deeper financial reasoning)
// Lazy-init to avoid crashing at startup if key is not yet set
let _anthropic: Anthropic | null = null;
function getAnthropic(): Anthropic {
  if (!_anthropic) {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error("ANTHROPIC_API_KEY is not configured");
    _anthropic = new Anthropic({ apiKey: key });
  }
  return _anthropic;
}
const CLAUDE_MODEL = "claude-sonnet-4-6";

// Lender criteria for funding qualification analysis
const LENDER_CRITERIA = `
## FUNDING QUALIFICATION CRITERIA

### Tier 1: Prime Borrower (SBA 7(a) / Bank Term Loan)
- Time in business: 24+ months
- Monthly revenue: $40,000+
- Credit score: 680+
- Not in restricted industry
- Max funding: Up to $5,000,000
- Rates: Prime + 2-3%

### Tier 2: Growth Capital (Business Line of Credit)
- Time in business: 12+ months
- Monthly revenue: $25,000+
- Credit score: 650+
- Not in restricted industry
- Max funding: Up to 3x monthly revenue
- Rates: 12-25% APR

### Tier 3: Working Capital (Short-Term Business Loan)
- Time in business: 6+ months
- Monthly revenue: $10,000+
- Credit score: 650+
- Max funding: Up to 2x monthly revenue
- Rates: 15-35% APR

### Tier 4: Cash Flow Financing (Revenue Based Advance / MCA)
- Time in business: 6+ months
- Monthly revenue: $10,000+
- Credit score: Below 650 OK
- Max funding: Up to 1.5x monthly revenue
- Rates: Factor rate 1.20+

### Tier 5: Startup Capital (0% Interest Credit Stacking)
- Time in business: Less than 12 months
- Credit score: 680+
- Revenue: Not primary factor
- Max funding: Up to $150,000
- Rates: 0% intro (12-21 months)

### RESTRICTED INDUSTRIES (Higher scrutiny)
- Gambling
- Adult Entertainment
- Cannabis
- Non-Profit
- Financial Services

### RED FLAGS IN BANK STATEMENTS (Negative indicators)
- NSF (Non-Sufficient Funds) occurrences
- Negative balance days
- Large unexplained cash withdrawals
- Inconsistent deposit patterns
- High number of returned items
- Garnishments or levies
- Too many cash deposits (structuring concerns)
- Declining revenue trend over months

### POSITIVE INDICATORS
- Consistent recurring deposits (shows stable revenue)
- Steady or growing average daily balance
- Low or zero NSF fees
- Regular payroll deposits (indicates employees)
- Card processing deposits (shows legitimate business)
- Positive end-of-month balances
`;

export interface BankStatementAnalysis {
  overallScore: number; // 0-100
  scoreExplanation: string; // one-line plain-language explanation of the score
  qualificationTier: string;
  estimatedMonthlyRevenue: number;
  estimatedMonthlyExpenses: number;
  netCashFlow: number;
  averageDailyBalance: number;
  currentBalance: number;
  revenueConsistency: "very consistent" | "mostly consistent" | "somewhat variable" | "highly variable";
  cashRunwayDays: number; // estimated days the business can cover expenses from current balance
  monthlyBreakdown: Array<{
    month: string; // e.g. "Jan 2026"
    revenue: number;
    expenses: number;
  }>;
  redFlags: Array<{
    issue: string;
    severity: "low" | "medium" | "high";
    details: string;
    priority: number; // 1 = most urgent
  }>;
  positiveIndicators: Array<{
    indicator: string;
    details: string;
    priority: number; // 1 = most impactful
  }>;
  fundingRecommendation: {
    eligible: boolean;
    maxAmount: number;
    estimatedRates: string;
    product: string;
    message: string;
  };
  improvementSuggestions: string[];
  summary: string;
}

export async function analyzeBankStatements(
  extractedText: string,
  additionalInfo?: {
    creditScoreRange?: string;
    timeInBusiness?: string;
    industry?: string;
  }
): Promise<BankStatementAnalysis> {
  const additionalContext = additionalInfo
    ? `
Additional Information Provided:
- Credit Score Range: ${additionalInfo.creditScoreRange || "Not provided"}
- Time in Business: ${additionalInfo.timeInBusiness || "Not provided"}
- Industry: ${additionalInfo.industry || "Not provided"}
`
    : "";

  const prompt = `Analyze the following bank statement data and provide a comprehensive financial assessment.

${LENDER_CRITERIA}

${additionalContext}

BANK STATEMENT DATA:
${extractedText}

Analyze this bank statement and respond with a JSON object following this exact structure:
{
  "overallScore": <number 0-100>,
  "scoreExplanation": "<one plain-language sentence explaining the score, e.g. 'Solid revenue with room to build up cash reserves'>",
  "qualificationTier": "<one of: Prime Borrower, Growth Capital, Working Capital, Cash Flow Financing, Startup Capital, Foundation Building>",
  "estimatedMonthlyRevenue": <number>,
  "estimatedMonthlyExpenses": <number>,
  "netCashFlow": <number - revenue minus expenses>,
  "averageDailyBalance": <number>,
  "currentBalance": <number - most recent ending balance, or 0 if not visible>,
  "revenueConsistency": "<one of: very consistent, mostly consistent, somewhat variable, highly variable>",
  "cashRunwayDays": <number - how many days the business could cover expenses from current balance alone>,
  "monthlyBreakdown": [
    {"month": "Jan 2026", "revenue": <number>, "expenses": <number>}
  ],
  "redFlags": [
    {
      "issue": "<brief 3-5 word label>",
      "severity": "<low|medium|high>",
      "details": "<1-2 sentence explanation in plain language — no jargon>",
      "priority": <number, 1 = most urgent>
    }
  ],
  "positiveIndicators": [
    {
      "indicator": "<brief 3-5 word label>",
      "details": "<1-2 sentence explanation>",
      "priority": <number, 1 = most impactful>
    }
  ],
  "fundingRecommendation": {
    "eligible": <boolean>,
    "maxAmount": <number>,
    "estimatedRates": "<rate range>",
    "product": "<recommended product>",
    "message": "<2-3 sentence personalized message>"
  },
  "improvementSuggestions": [
    "<short, specific, actionable tip — one sentence each>"
  ],
  "summary": "<2-3 sentence plain-language summary a business owner would understand>"
}

Important:
- Write for a business owner, not an underwriter. Use plain language.
- Keep labels short (3-5 words). Put details in the details field.
- Sort redFlags by priority (most urgent first) and positiveIndicators by priority (strongest first).
- monthlyBreakdown should include each month visible in the statements, most recent first.
- cashRunwayDays = currentBalance / (estimatedMonthlyExpenses / 30). Round to nearest whole number.
- revenueConsistency: look at month-to-month variance in deposits.
- Be realistic and conservative in estimates.
- If statement quality is poor, note it in summary and lower confidence.
- improvement suggestions should be things the merchant can actually do, not generic advice.

Respond ONLY with the JSON object, no additional text.`;

  try {
    const response = await getAnthropic().messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 3000,
      system: `You are a financial analyst on a business finance brokerage platform called Today Capital Group. The platform brokers SBA loans, MCAs (merchant cash advances), lines of credit, revenue-based financing, and other business funding products.

You are analyzing bank statements for merchants who have been funded through the platform. The analysis powers their merchant portal dashboard, which helps them:
- Monitor their cash flow, revenue, and expenses
- Track their financial health over time
- See how their open funding positions relate to their revenue
- Understand when they might be ready for a renewal or additional funding
- Get early warnings if their finances are trending downward
- See actionable tips to strengthen their business finances

Your analysis should be accurate, conservative, and framed in a way that is helpful and encouraging to the merchant. Avoid harsh underwriting language — this is a tool to help merchants succeed, not to judge them. Always respond with valid JSON only.`,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const content = textBlock?.text;

    if (!content) {
      throw new Error("No response from Claude");
    }

    // Strip markdown code blocks if present (```json...```)
    let cleanContent = content.trim();
    if (cleanContent.startsWith("```json")) {
      cleanContent = cleanContent.slice(7);
    } else if (cleanContent.startsWith("```")) {
      cleanContent = cleanContent.slice(3);
    }
    if (cleanContent.endsWith("```")) {
      cleanContent = cleanContent.slice(0, -3);
    }
    cleanContent = cleanContent.trim();

    // Parse the JSON response
    const analysis = JSON.parse(cleanContent) as BankStatementAnalysis;

    return analysis;
  } catch (error) {
    console.error("[CLAUDE] Bank statement analysis error:", error);

    // Log more detail for debugging
    if (error instanceof Error) {
      console.error("[CLAUDE] Error name:", error.name, "| Message:", error.message);
    }

    if (error instanceof SyntaxError) {
      throw new Error(
        "Failed to parse AI analysis response. Please try again."
      );
    }

    throw error;
  }
}

export function isOpenAIConfigured(): boolean {
  return !!(process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY);
}

export function isAnthropicConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

// ========================================
// NATURAL LANGUAGE CONTACT SEARCH PARSER
// ========================================

export interface ParsedContactQuery {
  searchType: 'general' | 'tags' | 'pipeline' | 'recent' | 'all';
  query?: string;           // Free text search term
  tags?: string[];          // Tags to filter by
  pipelineStage?: string;   // Pipeline stage filter
  dateRange?: 'today' | 'week' | 'month' | 'all';
  limit?: number;           // Max results
  explanation: string;      // Human-readable explanation of what was parsed
}

/**
 * Parse a natural language query into structured search filters for GHL contacts
 */
export async function parseContactSearchQuery(naturalLanguageQuery: string): Promise<ParsedContactQuery> {
  const prompt = `You are a CRM search assistant for a sales team. Parse the following natural language query into structured search parameters for finding contacts in GoHighLevel CRM.

USER QUERY: "${naturalLanguageQuery}"

Common tags in this system include:
- "hot lead", "cold lead", "warm lead" (lead temperature)
- "application complete", "App Started" (application status)
- "lead-source-website", "interest form" (source)
- "Statements Uploaded" (bank statements)
- "funded", "declined" (deal outcome)

Parse the query and respond with a JSON object in this exact format:
{
  "searchType": "general" | "tags" | "pipeline" | "recent" | "all",
  "query": "free text search term if user wants to find by name/email/phone, or null",
  "tags": ["array", "of", "tags"] or null if no tags mentioned,
  "pipelineStage": "stage name if mentioned, or null",
  "dateRange": "today" | "week" | "month" | "all" | null,
  "limit": number between 10-100 (default 25),
  "explanation": "Brief explanation of what you understood from the query"
}

Examples:
- "show me all hot leads" → searchType: "tags", tags: ["hot lead"]
- "find contacts tagged application complete" → searchType: "tags", tags: ["application complete"]
- "get everyone from this week" → searchType: "recent", dateRange: "week"
- "search for John" → searchType: "general", query: "John"
- "list all my contacts" → searchType: "all"
- "show funded deals" → searchType: "tags", tags: ["funded"]

Respond ONLY with the JSON object.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You parse natural language CRM queries into structured search parameters. Always respond with valid JSON only."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.2,
      max_tokens: 500
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      throw new Error("No response from OpenAI");
    }

    // Strip markdown code blocks if present
    let cleanContent = content.trim();
    if (cleanContent.startsWith("```json")) {
      cleanContent = cleanContent.slice(7);
    } else if (cleanContent.startsWith("```")) {
      cleanContent = cleanContent.slice(3);
    }
    if (cleanContent.endsWith("```")) {
      cleanContent = cleanContent.slice(0, -3);
    }
    cleanContent = cleanContent.trim();

    const parsed = JSON.parse(cleanContent) as ParsedContactQuery;

    // Ensure reasonable defaults
    if (!parsed.limit || parsed.limit < 1) parsed.limit = 25;
    if (parsed.limit > 100) parsed.limit = 100;

    return parsed;

  } catch (error) {
    console.error("[OPENAI] Contact query parsing error:", error);

    // Return a default search if parsing fails
    return {
      searchType: 'general',
      query: naturalLanguageQuery,
      limit: 25,
      explanation: "Could not parse query - using as direct search term"
    };
  }
}

// ========================================
// NATURAL LANGUAGE COMMAND PARSER (Actions + Search)
// ========================================

export interface ParsedCommand {
  intent: 'search' | 'add_note' | 'create_task' | 'add_tag' | 'update_status' | 'navigate' | 'help';
  // For search intent
  searchParams?: ParsedContactQuery;
  // For action intents
  actionParams?: {
    noteBody?: string;
    taskTitle?: string;
    taskDueDate?: string;
    tagName?: string;
    statusValue?: string;
    targetContactName?: string;
  };
  explanation: string;
  requiresConfirmation: boolean;
}

/**
 * Parse a natural language command to determine if it's a search or an action
 */
export async function parseRepConsoleCommand(
  naturalLanguageInput: string,
  currentContactName?: string
): Promise<ParsedCommand> {
  const prompt = `You are a CRM assistant for a sales team. Parse the following natural language input to determine if the user wants to SEARCH for contacts or PERFORM AN ACTION on a contact.

USER INPUT: "${naturalLanguageInput}"
${currentContactName ? `CURRENT CONTACT BEING VIEWED: "${currentContactName}"` : 'USER IS NOT CURRENTLY VIEWING A SPECIFIC CONTACT'}

INTENTS:
1. "search" - User wants to find/list contacts (e.g., "show me hot leads", "find John Smith")
2. "add_note" - User wants to add a note to a contact (e.g., "add a note saying called today", "note: interested in 50k")
3. "create_task" - User wants to create a task (e.g., "create a follow-up task for tomorrow", "remind me to call in 2 days")
4. "add_tag" - User wants to tag a contact (e.g., "tag as hot lead", "mark as priority")
5. "navigate" - User wants to go somewhere (e.g., "go back", "next contact", "open dashboard")
6. "help" - User needs help (e.g., "what can I do?", "help")

For action intents (add_note, create_task, add_tag), extract the relevant details from the input.
For search intent, extract search parameters like tags, names, etc.

Respond with a JSON object:
{
  "intent": "search" | "add_note" | "create_task" | "add_tag" | "update_status" | "navigate" | "help",
  "searchParams": { only if intent is "search", include: searchType, tags, query, explanation },
  "actionParams": {
    "noteBody": "text of the note if add_note",
    "taskTitle": "task title if create_task",
    "taskDueDate": "YYYY-MM-DD if mentioned, or calculate from relative dates like 'tomorrow', 'in 2 days'",
    "tagName": "tag name if add_tag",
    "targetContactName": "if user mentions a specific contact name for the action"
  },
  "explanation": "Brief explanation of what you understood",
  "requiresConfirmation": true/false (true for destructive actions or if unclear)
}

Today's date: ${new Date().toISOString().split('T')[0]}

Respond ONLY with the JSON object.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You parse natural language CRM commands into structured intents. Always respond with valid JSON only."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.2,
      max_tokens: 600
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      throw new Error("No response from OpenAI");
    }

    // Strip markdown code blocks if present
    let cleanContent = content.trim();
    if (cleanContent.startsWith("```json")) {
      cleanContent = cleanContent.slice(7);
    } else if (cleanContent.startsWith("```")) {
      cleanContent = cleanContent.slice(3);
    }
    if (cleanContent.endsWith("```")) {
      cleanContent = cleanContent.slice(0, -3);
    }
    cleanContent = cleanContent.trim();

    const parsed = JSON.parse(cleanContent) as ParsedCommand;

    return parsed;

  } catch (error) {
    console.error("[OPENAI] Command parsing error:", error);

    // Default to search if parsing fails
    return {
      intent: 'search',
      searchParams: {
        searchType: 'general',
        query: naturalLanguageInput,
        limit: 25,
        explanation: "Could not parse command - treating as search"
      },
      explanation: "Could not parse command - treating as search",
      requiresConfirmation: false
    };
  }
}

// Approval Email Parser Types
export interface ParsedApproval {
  isApproval: boolean;
  confidence: number; // 0-100
  businessName: string | null;
  businessEmail: string | null;
  lenderName: string | null;
  approvedAmount: number | null;
  termLength: string | null;
  factorRate: string | null;
  paybackAmount: number | null;
  paymentFrequency: string | null;
  paymentAmount: number | null;
  interestRate: string | null;
  productType: string | null;
  expirationDate: string | null;
  conditions: string | null;
  notes: string | null;
}

export async function parseApprovalEmail(
  emailSubject: string,
  emailBody: string,
  emailFrom: string
): Promise<ParsedApproval> {
  const prompt = `You are an expert at parsing funding/loan approval emails from lenders. Analyze the following email and extract approval details.

EMAIL FROM: ${emailFrom}
SUBJECT: ${emailSubject}

EMAIL BODY:
${emailBody}

Determine if this is a funding approval email (lender approving a business for financing). If it is, extract all available information.

Respond with a JSON object in this exact format:
{
  "isApproval": true/false,
  "confidence": 0-100,
  "businessName": "extracted business name or null",
  "businessEmail": "extracted business email or null",
  "lenderName": "name of the lender/funding company or null",
  "approvedAmount": numeric amount or null (e.g., 50000 not "$50,000"),
  "termLength": "term in text format or null (e.g., '6 months', '12 months')",
  "factorRate": "factor rate as string or null (e.g., '1.25')",
  "paybackAmount": numeric payback amount or null,
  "paymentFrequency": "Daily/Weekly/Monthly or null",
  "paymentAmount": numeric payment amount or null,
  "interestRate": "interest rate as string or null (e.g., '15% APR')",
  "productType": "MCA/LOC/Term Loan/SBA/Revenue Based or null",
  "expirationDate": "offer expiration date or null",
  "conditions": "any conditions or requirements mentioned or null",
  "notes": "any other relevant details or null"
}

Guidelines:
- isApproval should be TRUE if this is clearly a funding approval, pre-approval, or offer letter
- isApproval should be FALSE for marketing emails, application confirmations, or rejections
- confidence reflects how certain you are this is an approval (100 = definitely approval, 0 = definitely not)
- Extract the BUSINESS name being approved, not the sender's name
- Look for dollar amounts, terms, rates, and payment structures
- Common lenders: OnDeck, BlueVine, Fundbox, Kabbage, Credibly, National Funding, etc.

Respond ONLY with the JSON object.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an expert at parsing business funding approval emails. You extract structured data accurately. Always respond with valid JSON only."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.2,
      max_tokens: 1000
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      throw new Error("No response from OpenAI");
    }

    // Strip markdown code blocks if present
    let cleanContent = content.trim();
    if (cleanContent.startsWith("```json")) {
      cleanContent = cleanContent.slice(7);
    } else if (cleanContent.startsWith("```")) {
      cleanContent = cleanContent.slice(3);
    }
    if (cleanContent.endsWith("```")) {
      cleanContent = cleanContent.slice(0, -3);
    }
    cleanContent = cleanContent.trim();

    return JSON.parse(cleanContent) as ParsedApproval;

  } catch (error) {
    console.error("[OPENAI] Approval parsing error:", error);

    // Return a default non-approval response
    return {
      isApproval: false,
      confidence: 0,
      businessName: null,
      businessEmail: null,
      lenderName: null,
      approvedAmount: null,
      termLength: null,
      factorRate: null,
      paybackAmount: null,
      paymentFrequency: null,
      paymentAmount: null,
      interestRate: null,
      productType: null,
      expirationDate: null,
      conditions: null,
      notes: null
    };
  }
}

// ── Detect Funding Positions from Bank Transactions ──

export interface DetectedPosition {
  funderName: string;
  productType: string; // MCA, Term Loan, Line of Credit, etc.
  estimatedPaymentAmount: number;
  paymentFrequency: string; // daily, weekly, bi-weekly, monthly
  paymentsFound: number; // how many payments were detected
  firstPaymentDate: string;
  lastPaymentDate: string;
  estimatedRemainingBalance: number | null;
  estimatedOriginalAmount: number | null;
  confidence: "high" | "medium" | "low";
  transactionDescriptions: string[]; // sample descriptions that matched
}

export async function detectFundingPositions(
  transactions: Array<{ date: string; name: string; amount: number; type: string }>
): Promise<DetectedPosition[]> {
  if (!transactions || transactions.length === 0) return [];

  // Filter to debits only and format for analysis
  const debits = transactions
    .filter(t => t.amount < 0 || t.type === "DEBIT")
    .map(t => ({
      date: t.date,
      description: t.name,
      amount: Math.abs(t.amount),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  if (debits.length === 0) return [];

  // Limit to 500 most recent debits to stay within token limits
  const recentDebits = debits.slice(-500);

  const prompt = `Analyze these bank account debit transactions and identify any recurring payments to business funding companies (MCA providers, lenders, factors, etc.).

KNOWN MCA / BUSINESS FUNDING COMPANIES (common names that appear in bank transactions):
- Fora Financial, Fox Capital, Fundbox, Libertas, OnDeck, Kabbage, BlueVine, Credibly
- CAN Capital, Rapid Finance, Yellowstone Capital, Everest Business Funding
- Green Capital, Pearl Capital, Vox Funding, Fenix Capital, Clear Fund, Lite Fund
- Smart Business Funder, Super Fast Cap, TVT Capital, Bizpoint, River Advance
- American Financial Center, Fuji, Specialty Capital, Top Choice Financial
- Revenued, Vital Cap, Westwood Funding, I Got Funded, Evolve Capital
- Silverline Funding, GFE, Fintegra, Smarter Merchant
- Square Capital, Stripe Capital, PayPal Working Capital, Shopify Capital
- National Funding, Forward Financing, Reliant Funding, Expansion Capital
- BFS Capital, Mantis Funding, Lendini, United Capital Source, Greenbox Capital
- Any other entity that appears to be a business lender based on payment patterns

TRANSACTION DATA (debits):
${JSON.stringify(recentDebits, null, 1)}

Look for:
1. Recurring payments of the same amount to the same entity (daily, weekly, or monthly)
2. ACH debits with lender-like names
3. Payments labeled as "loan payment", "advance payment", "MCA", etc.

Respond with a JSON array of detected positions. Each position should be:
{
  "funderName": "<clean company name>",
  "productType": "<MCA, Term Loan, Line of Credit, Revenue Based Advance, Equipment Financing, SBA Loan, Unknown>",
  "estimatedPaymentAmount": <number - typical single payment amount>,
  "paymentFrequency": "<daily, weekly, bi-weekly, monthly>",
  "paymentsFound": <number of matching transactions found>,
  "firstPaymentDate": "<YYYY-MM-DD>",
  "lastPaymentDate": "<YYYY-MM-DD>",
  "estimatedRemainingBalance": <number or null - rough estimate based on payment trajectory, null if uncertain>,
  "estimatedOriginalAmount": <number or null - rough estimate, null if uncertain>,
  "confidence": "<high, medium, or low>",
  "transactionDescriptions": ["<1-3 sample descriptions that matched>"]
}

Rules:
- Only include positions where you found at least 2 recurring payments to the same entity.
- Do NOT include normal business expenses (rent, utilities, payroll, subscriptions, insurance).
- Do NOT include credit card payments, mortgage payments, or personal loans.
- Focus on business funding: MCAs, term loans, lines of credit, revenue-based financing.
- If daily debits are found, the product is almost certainly an MCA.
- If no funding positions are detected, return an empty array [].

Respond ONLY with the JSON array, no additional text.`;

  try {
    const response = await getAnthropic().messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 2000,
      system: "You are a financial analyst specializing in identifying business funding repayments in bank transaction data. Be precise and conservative. Only flag transactions you are confident are loan/advance repayments. Respond with valid JSON only.",
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = response.content.find(b => b.type === "text");
    let content = textBlock?.text?.trim() || "[]";

    // Strip markdown code blocks
    if (content.startsWith("```json")) content = content.slice(7);
    else if (content.startsWith("```")) content = content.slice(3);
    if (content.endsWith("```")) content = content.slice(0, -3);
    content = content.trim();

    const positions = JSON.parse(content) as DetectedPosition[];
    console.log(`[AI] Detected ${positions.length} funding position(s) from ${recentDebits.length} debit transactions`);
    return positions;
  } catch (error) {
    console.error("[AI] Position detection error:", error);
    return [];
  }
}

// ── POSITION TERM EXTRACTION FROM DOCUMENTS ──────────────────────────────

export interface ExtractedPositionTerms {
  funderName: string | null;
  productType: string | null;
  fundedAmount: number | null;
  paybackAmount: number | null;
  factorRate: string | null;
  paymentAmount: number | null;
  paymentFrequency: string | null;
  remainingBalance: number | null;
  fundedDate: string | null;
  confidence: "high" | "medium" | "low";
  notes: string | null;
}

const POSITION_SYSTEM_PROMPT = `You are a financial document parser that extracts MCA/business loan position details.
Return ONLY valid JSON, no markdown fences:
{
  "funderName": string or null,
  "productType": one of "MCA"|"LOC"|"Term Loan"|"SBA"|"Revenue Based"|"Other" or null,
  "fundedAmount": number (no commas/symbols) or null,
  "paybackAmount": number or null,
  "factorRate": string e.g. "1.30" or null,
  "paymentAmount": number or null,
  "paymentFrequency": one of "daily"|"weekly"|"bi-weekly"|"monthly" or null,
  "remainingBalance": number or null,
  "fundedDate": "YYYY-MM-DD" or null,
  "confidence": "high"|"medium"|"low",
  "notes": string or null
}
Rules: strip $ and commas from numbers; "advance amount"/"funded amount" = fundedAmount; "payback"/"total remittance" = paybackAmount; "RTR"/"daily ACH" = daily frequency; for bank statements look for recurring ACH debits; confidence "high" if 5+ fields extracted, "medium" if 3-4, "low" otherwise.`;

function parsePositionJson(raw: string): ExtractedPositionTerms {
  let clean = raw.trim();
  if (clean.startsWith("```json")) clean = clean.slice(7);
  else if (clean.startsWith("```")) clean = clean.slice(3);
  if (clean.endsWith("```")) clean = clean.slice(0, -3);
  return JSON.parse(clean.trim()) as ExtractedPositionTerms;
}

const POSITION_EMPTY: ExtractedPositionTerms = {
  funderName: null, productType: null, fundedAmount: null, paybackAmount: null,
  factorRate: null, paymentAmount: null, paymentFrequency: null, remainingBalance: null,
  fundedDate: null, confidence: "low", notes: "Could not parse document."
};

export async function extractPositionTerms(text: string): Promise<ExtractedPositionTerms> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: POSITION_SYSTEM_PROMPT },
        { role: "user", content: `Extract funding position terms from this document:\n\n${text.slice(0, 12000)}` }
      ],
      temperature: 0.1,
      max_tokens: 600
    });
    return parsePositionJson(response.choices[0]?.message?.content || "{}");
  } catch (err) {
    console.error("[OPENAI] extractPositionTerms error:", err);
    return POSITION_EMPTY;
  }
}

export async function extractPositionTermsFromPdfBuffer(pdfBuffer: Buffer): Promise<ExtractedPositionTerms> {
  try {
    const base64Pdf = pdfBuffer.toString("base64");
    const response = await (openai as any).responses.create({
      model: "gpt-4o",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_file",
              filename: "document.pdf",
              file_data: `data:application/pdf;base64,${base64Pdf}`,
            },
            {
              type: "input_text",
              text: `${POSITION_SYSTEM_PROMPT}\n\nExtract all funding/loan position terms from this document and return ONLY the JSON:`
            }
          ]
        }
      ],
      temperature: 0.1,
      max_output_tokens: 600,
    });
    const content = response.output_text || response.output?.[0]?.content?.[0]?.text || "{}";
    return parsePositionJson(content);
  } catch (err) {
    console.error("[OPENAI] extractPositionTermsFromPdfBuffer error:", err);
    return { ...POSITION_EMPTY, notes: "Could not read this PDF. Try pasting the text instead." };
  }
}

// ========================================
// UNDERWRITING SNAPSHOT FOR REPS
// ========================================

export interface UnderwritingSnapshot {
  worthSubmitting: boolean;
  confidence: 'high' | 'medium' | 'low';
  overallScore: number; // 0-100
  qualificationTier: string;
  avgMonthlyRevenue: number;
  revenueTrend: 'growing' | 'stable' | 'declining';
  avgDailyBalance: number;
  lowestBalance: number;
  nsfCount: number;
  negativeDays: number;
  existingPositions: Array<{
    funder: string;
    estimatedPayment: string;
    frequency: string;
  }>;
  totalMonthlyDebtPayments: number;
  debtServiceRatio: number; // 0-1, existing payments / monthly revenue
  redFlags: Array<{ flag: string; severity: 'low' | 'medium' | 'high' }>;
  positiveIndicators: string[];
  maxRecommendedAdvance: number;
  recommendedProduct: string;
  estimatedFactor: string;
  summary: string;
  underwriterNotes: string[];
  // Per-month breakdown for the scorecard view (oldest → newest, up to 6 months)
  monthlyData?: Array<{
    month: string;        // e.g. "Jan 2024" or "4 months ago"
    deposits: number;
    avgBalance: number;
    numDeposits: string;  // e.g. "10+" or "7"
    nsfs: number;
    negativeDays: number;
    endBalance: number | null;
  }>;
}

export async function generateUnderwritingSnapshot(
  extractedText: string,
  additionalInfo?: {
    creditScoreRange?: string;
    timeInBusiness?: string;
    industry?: string;
    businessName?: string;
  }
): Promise<UnderwritingSnapshot> {
  const context = additionalInfo ? `
Additional Context:
- Business Name: ${additionalInfo.businessName || 'Not provided'}
- Credit Score Range: ${additionalInfo.creditScoreRange || 'Not provided'}
- Time in Business: ${additionalInfo.timeInBusiness || 'Not provided'}
- Industry: ${additionalInfo.industry || 'Not provided'}
` : '';

  const prompt = `You are a senior MCA underwriter at Today Capital Group, a business finance brokerage.
A sales rep is asking you to quickly assess whether this merchant's bank statements are worth submitting to underwriting.

${context}

BANK STATEMENT DATA:
${extractedText}

Analyze these statements with an underwriter's eye. Be direct — this is for internal rep use only, not the merchant.

Pay particular attention to:
1. REVENUE: Calculate avg monthly revenue from the last 3-6 months of deposits. Look for the trend.
2. BALANCES: Track average daily balance and flag any negative balance periods.
3. NSFs: Count all NSF / returned item / overdraft fees — these are major red flags.
4. STACKING: Look for daily or weekly recurring ACH debits to known MCA funders (Yellowstone, Libertas, Kapitus, On Deck, Bluevine, Fundbox, Credibly, Rapid Finance, Forward Financing, National Funding, Mulligan Funding, Fora Financial, IOU Financial, Lendini, etc.). If found, list them.
5. DEBIT LOAD: Sum up estimated existing funding payments per month to calculate debt service ratio (payments / revenue).
6. RED FLAGS: NSFs, negative days, garnishments/levies, declining revenue, excessive cash withdrawals, too many positions.
7. POSITIVE INDICATORS: Consistent deposits, payroll activity, card processing, growing balances.

Respond with ONLY this JSON structure (no extra text):
{
  "worthSubmitting": <true or false>,
  "confidence": "<high, medium, or low>",
  "overallScore": <0-100>,
  "qualificationTier": "<Prime Borrower, Growth Capital, Working Capital, Cash Flow Financing, Foundation Building, or Do Not Submit>",
  "avgMonthlyRevenue": <number>,
  "revenueTrend": "<growing, stable, or declining>",
  "avgDailyBalance": <number>,
  "lowestBalance": <number - most negative or lowest balance seen>,
  "nsfCount": <number>,
  "negativeDays": <number - estimated days with negative balance>,
  "existingPositions": [
    { "funder": "<name>", "estimatedPayment": "<e.g. $500/day>", "frequency": "<daily, weekly, monthly>" }
  ],
  "totalMonthlyDebtPayments": <number - sum of all existing position payments per month>,
  "debtServiceRatio": <number 0-1, e.g. 0.35 means 35% of revenue goes to existing debt>,
  "redFlags": [
    { "flag": "<brief label>", "severity": "<low, medium, or high>" }
  ],
  "positiveIndicators": ["<one-line positive observation>"],
  "maxRecommendedAdvance": <number - 0 if do not submit>,
  "recommendedProduct": "<MCA, Term Loan, Line of Credit, Revenue Based Advance, or N/A>",
  "estimatedFactor": "<e.g. 1.25-1.35 or N/A>",
  "summary": "<3-4 sentence underwriter bottom line — direct, factual, actionable for the rep>",
  "underwriterNotes": ["<specific note for the underwriting team>"],
  "monthlyData": [
    {
      "month": "<e.g. 'Jan 2024' — use actual month/year if determinable from statement dates, otherwise '4 months ago'>",
      "deposits": <total deposits for that month as a number — round to nearest hundred>,
      "avgBalance": <estimated average daily balance for that month as a number — round to nearest hundred>,
      "numDeposits": "<e.g. '10+' or '7' — count of individual deposit transactions>",
      "nsfs": <number of NSF/returned items that month>,
      "negativeDays": <estimated number of days with negative balance that month>,
      "endBalance": <ending/closing balance for that month as a number, or null if not available>
    }
  ]
}`;

  try {
    const response = await getAnthropic().messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 3500,
      system: "You are a senior MCA underwriter at Today Capital Group. Your job is to give sales reps a quick, honest assessment of whether a merchant file is worth submitting. Be direct and use underwriting language. Respond only with valid JSON.",
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = response.content.find(b => b.type === "text");
    let content = textBlock?.text?.trim() || "";

    if (content.startsWith("```json")) content = content.slice(7);
    else if (content.startsWith("```")) content = content.slice(3);
    if (content.endsWith("```")) content = content.slice(0, -3);
    content = content.trim();

    return JSON.parse(content) as UnderwritingSnapshot;
  } catch (error) {
    console.error("[CLAUDE] generateUnderwritingSnapshot error:", error);
    if (error instanceof SyntaxError) {
      throw new Error("Failed to parse underwriting analysis. Please try again.");
    }
    throw error;
  }
}
