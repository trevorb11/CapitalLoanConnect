import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
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

    // Parse the JSON response
    const analysis = JSON.parse(content) as BankStatementAnalysis;

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
  return !!process.env.OPENAI_API_KEY;
}
