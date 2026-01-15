import OpenAI from "openai";

// Use Replit AI Integrations env vars if available, otherwise fall back to standard OpenAI
const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || undefined,
});

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
  qualificationTier: string;
  estimatedMonthlyRevenue: number;
  averageDailyBalance: number;
  redFlags: Array<{
    issue: string;
    severity: "low" | "medium" | "high";
    details: string;
  }>;
  positiveIndicators: Array<{
    indicator: string;
    details: string;
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

  const prompt = `You are a business funding analyst. Analyze the following bank statement data and provide a funding eligibility assessment.

${LENDER_CRITERIA}

${additionalContext}

BANK STATEMENT DATA:
${extractedText}

Analyze this bank statement and respond with a JSON object following this exact structure:
{
  "overallScore": <number 0-100 representing funding readiness>,
  "qualificationTier": "<one of: Prime Borrower, Growth Capital, Working Capital, Cash Flow Financing, Startup Capital, Foundation Building>",
  "estimatedMonthlyRevenue": <number - estimated average monthly deposits/revenue>,
  "averageDailyBalance": <number - estimated average daily balance>,
  "redFlags": [
    {
      "issue": "<brief issue name>",
      "severity": "<low|medium|high>",
      "details": "<specific details about this red flag>"
    }
  ],
  "positiveIndicators": [
    {
      "indicator": "<indicator name>",
      "details": "<specific positive observation>"
    }
  ],
  "fundingRecommendation": {
    "eligible": <boolean>,
    "maxAmount": <number - estimated max funding amount>,
    "estimatedRates": "<rate range string>",
    "product": "<recommended funding product>",
    "message": "<2-3 sentence personalized message about their funding prospects>"
  },
  "improvementSuggestions": [
    "<specific actionable suggestion to improve funding chances>"
  ],
  "summary": "<3-4 sentence executive summary of the analysis>"
}

Important:
- Be realistic and conservative in your estimates
- If the statement quality is poor or unreadable, note this in the summary
- Extract actual numbers when visible (deposits, balances, fees)
- Look for patterns across multiple months if visible
- Consider business type indicators from merchant names

Respond ONLY with the JSON object, no additional text.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Cost-effective model good at document analysis
      messages: [
        {
          role: "system",
          content:
            "You are a business funding analyst specializing in bank statement analysis. You provide accurate, conservative assessments of funding eligibility based on bank statement data. Always respond with valid JSON only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3, // Lower temperature for more consistent analysis
      max_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      throw new Error("No response from OpenAI");
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
    console.error("[OPENAI] Analysis error:", error);

    // Return a default analysis if parsing fails
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
