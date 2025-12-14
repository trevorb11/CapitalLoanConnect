import type { LoanApplication } from "@shared/schema";

// AI Provider Configuration
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Determine which AI provider to use (prefer Anthropic/Claude)
const AI_PROVIDER = ANTHROPIC_API_KEY ? 'anthropic' : OPENAI_API_KEY ? 'openai' : null;

interface LeadEnrichmentResult {
  leadScore: number; // 1-100
  qualityTier: 'hot' | 'warm' | 'cold';
  insights: string[];
  riskFactors: string[];
  recommendedProducts: string[];
  urgencyLevel: 'immediate' | 'high' | 'medium' | 'low';
  estimatedFundingRange: {
    min: number;
    max: number;
  };
  nextBestAction: string;
}

interface PersonalizedMessage {
  subject?: string; // For email
  body: string;
  tone: 'professional' | 'friendly' | 'urgent';
  channel: 'sms' | 'email';
  followUpTiming: string;
}

interface MessageGenerationRequest {
  application: Partial<LoanApplication>;
  channel: 'sms' | 'email';
  purpose: 'initial_followup' | 'document_reminder' | 'stale_lead' | 'application_incomplete' | 'bank_statement_needed' | 'approval_notification' | 'custom';
  customContext?: string;
  agentName?: string;
  companyName?: string;
}

// System prompts for AI
const LEAD_ENRICHMENT_SYSTEM_PROMPT = `You are an expert business funding analyst for a commercial lending company called Today Capital Group. Your job is to analyze loan applications and provide actionable insights.

Analyze the provided lead data and return a JSON object with:
- leadScore (1-100): Based on likelihood to fund and deal quality
- qualityTier: "hot" (80-100), "warm" (50-79), or "cold" (1-49)
- insights: Array of 3-5 key observations about this lead
- riskFactors: Array of potential concerns or red flags
- recommendedProducts: Array of funding products that fit (SBA Loan, Business Line of Credit, MCA, Equipment Financing, Invoice Factoring, Revenue-Based Financing)
- urgencyLevel: Based on their stated funding timeline
- estimatedFundingRange: {min, max} realistic funding amounts based on their profile
- nextBestAction: Single most important next step

Scoring factors to consider:
- Time in business (longer = better, 2+ years ideal)
- Monthly revenue (higher = better, $50k+ is strong)
- Credit score (650+ is good, 720+ is excellent)
- Industry risk level
- Requested amount vs revenue ratio
- Whether they have existing MCA/loans
- Completeness of application
- Stated urgency

Return ONLY valid JSON, no markdown or explanation.`;

const MESSAGE_GENERATION_SYSTEM_PROMPT = `You are a skilled sales development representative for Today Capital Group, a business funding company. Your job is to write personalized, warm, and professional messages that feel human - not like templates.

Guidelines:
- Be conversational but professional
- Reference specific details from their application to show you've reviewed it
- Keep SMS messages under 160 characters when possible, max 320
- Keep email bodies concise (2-3 short paragraphs max)
- Always include a clear call-to-action
- Never use generic phrases like "Dear Valued Customer"
- Use their first name
- Mention their business name when natural
- For urgent leads, convey urgency without being pushy
- Avoid using jargon or complex financial terms

Return a JSON object with:
- subject (for email only): Compelling, personalized subject line
- body: The message content
- tone: "professional", "friendly", or "urgent"
- followUpTiming: When to follow up if no response (e.g., "2 days", "1 week")

Return ONLY valid JSON, no markdown or explanation.`;

class AIAssistantService {
  private isEnabled: boolean;
  private provider: 'anthropic' | 'openai' | null;

  constructor() {
    this.provider = AI_PROVIDER;
    this.isEnabled = !!this.provider;

    if (!this.isEnabled) {
      console.warn("[AI Assistant] Disabled: No ANTHROPIC_API_KEY or OPENAI_API_KEY configured");
    } else {
      console.log(`[AI Assistant] Enabled with ${this.provider} provider`);
    }
  }

  /**
   * Call the AI API (supports both Anthropic and OpenAI)
   */
  private async callAI(systemPrompt: string, userMessage: string): Promise<string> {
    if (!this.isEnabled) {
      throw new Error("AI Assistant is not configured. Set ANTHROPIC_API_KEY or OPENAI_API_KEY.");
    }

    if (this.provider === 'anthropic') {
      return this.callAnthropic(systemPrompt, userMessage);
    } else {
      return this.callOpenAI(systemPrompt, userMessage);
    }
  }

  private async callAnthropic(systemPrompt: string, userMessage: string): Promise<string> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307', // Fast and cost-effective for this use case
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userMessage }
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[AI Assistant] Anthropic API error:', error);
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const data = await response.json();
    return data.content[0].text;
  }

  private async callOpenAI(systemPrompt: string, userMessage: string): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Fast and cost-effective
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        max_tokens: 1024,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[AI Assistant] OpenAI API error:', error);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  /**
   * Enrich a lead with AI-powered analysis and scoring
   */
  async enrichLead(application: Partial<LoanApplication>): Promise<LeadEnrichmentResult> {
    // Build a comprehensive lead profile for analysis
    const leadProfile = this.buildLeadProfile(application);

    const userMessage = `Analyze this business funding lead and provide enrichment data:

${JSON.stringify(leadProfile, null, 2)}

Current date: ${new Date().toLocaleDateString()}
Application age: ${this.calculateApplicationAge(application.createdAt)}`;

    try {
      const response = await this.callAI(LEAD_ENRICHMENT_SYSTEM_PROMPT, userMessage);
      const enrichment = JSON.parse(response) as LeadEnrichmentResult;

      console.log(`[AI Assistant] Lead enriched: Score ${enrichment.leadScore} (${enrichment.qualityTier})`);
      return enrichment;
    } catch (error) {
      console.error('[AI Assistant] Lead enrichment error:', error);
      // Return fallback enrichment based on rules
      return this.fallbackEnrichment(application);
    }
  }

  /**
   * Generate a personalized follow-up message
   */
  async generateMessage(request: MessageGenerationRequest): Promise<PersonalizedMessage> {
    const { application, channel, purpose, customContext, agentName, companyName } = request;

    const leadProfile = this.buildLeadProfile(application);
    const purposeDescriptions: Record<string, string> = {
      initial_followup: "This is the first follow-up after they submitted an application. Welcome them and confirm next steps.",
      document_reminder: "They started an application but haven't uploaded bank statements yet. Gently remind them.",
      stale_lead: "They showed interest but haven't responded in a while. Re-engage them.",
      application_incomplete: "They started the intake form but didn't complete it. Encourage them to finish.",
      bank_statement_needed: "Their application is complete but we need bank statements to proceed.",
      approval_notification: "Great news - they've been pre-approved! Share the excitement and next steps.",
      custom: customContext || "Send a personalized message.",
    };

    const userMessage = `Generate a ${channel.toUpperCase()} message for this lead.

PURPOSE: ${purposeDescriptions[purpose]}

LEAD PROFILE:
${JSON.stringify(leadProfile, null, 2)}

SENDER INFO:
- Agent Name: ${agentName || 'The Team at Today Capital Group'}
- Company: ${companyName || 'Today Capital Group'}

${customContext ? `ADDITIONAL CONTEXT: ${customContext}` : ''}

Remember:
- ${channel === 'sms' ? 'Keep it under 320 characters, ideally under 160' : 'Keep email concise, 2-3 short paragraphs'}
- Use their first name: ${this.extractFirstName(application.fullName)}
- Their business: ${application.businessName || application.legalBusinessName || 'their business'}`;

    try {
      const response = await this.callAI(MESSAGE_GENERATION_SYSTEM_PROMPT, userMessage);
      const message = JSON.parse(response) as PersonalizedMessage;
      message.channel = channel;

      console.log(`[AI Assistant] Generated ${channel} message for ${purpose}`);
      return message;
    } catch (error) {
      console.error('[AI Assistant] Message generation error:', error);
      // Return fallback message
      return this.fallbackMessage(request);
    }
  }

  /**
   * Bulk enrich multiple leads (for batch processing)
   */
  async enrichLeads(applications: Partial<LoanApplication>[]): Promise<Map<string, LeadEnrichmentResult>> {
    const results = new Map<string, LeadEnrichmentResult>();

    // Process in parallel with concurrency limit
    const batchSize = 5;
    for (let i = 0; i < applications.length; i += batchSize) {
      const batch = applications.slice(i, i + batchSize);
      const enrichments = await Promise.all(
        batch.map(app => this.enrichLead(app))
      );

      batch.forEach((app, idx) => {
        if (app.id) {
          results.set(app.id, enrichments[idx]);
        }
      });
    }

    return results;
  }

  /**
   * Build a structured lead profile for AI analysis
   */
  private buildLeadProfile(application: Partial<LoanApplication>): Record<string, any> {
    return {
      // Contact Info
      name: application.fullName,
      email: application.email,
      phone: application.phone,

      // Business Info
      businessName: application.businessName || application.legalBusinessName,
      dba: application.doingBusinessAs,
      industry: application.industry,
      businessType: application.businessType,
      timeInBusiness: application.timeInBusiness,
      website: application.companyWebsite,
      stateOfIncorporation: application.stateOfIncorporation,

      // Financial Info
      monthlyRevenue: application.monthlyRevenue || application.averageMonthlyRevenue,
      requestedAmount: application.requestedAmount,
      creditScore: application.creditScore || application.personalCreditScoreRange || application.ficoScoreExact,
      hasOutstandingLoans: application.hasOutstandingLoans,
      outstandingLoansAmount: application.outstandingLoansAmount,
      mcaBalance: application.mcaBalanceAmount,
      processesCreditCards: application.doYouProcessCreditCards,

      // Application Status
      intakeCompleted: application.isCompleted,
      fullApplicationCompleted: application.isFullApplicationCompleted,
      hasBankConnection: !!application.plaidItemId,
      fundingUrgency: application.fundingUrgency,
      useOfFunds: application.useOfFunds,

      // Location
      city: application.city,
      state: application.state,

      // Referral
      referralSource: application.referralSource,
      agentName: application.agentName,
    };
  }

  /**
   * Calculate how old an application is
   */
  private calculateApplicationAge(createdAt: Date | string | null | undefined): string {
    if (!createdAt) return 'Unknown';

    const created = new Date(createdAt);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  }

  /**
   * Extract first name from full name
   */
  private extractFirstName(fullName: string | null | undefined): string {
    if (!fullName) return 'there';
    return fullName.split(' ')[0];
  }

  /**
   * Fallback enrichment when AI is unavailable
   */
  private fallbackEnrichment(application: Partial<LoanApplication>): LeadEnrichmentResult {
    let score = 50; // Base score
    const insights: string[] = [];
    const riskFactors: string[] = [];
    const products: string[] = [];

    // Time in business scoring
    const tib = application.timeInBusiness?.toLowerCase() || '';
    if (tib.includes('5') || tib.includes('more')) {
      score += 15;
      insights.push('Established business with 5+ years of history');
      products.push('SBA Loan', 'Business Line of Credit');
    } else if (tib.includes('2') || tib.includes('3') || tib.includes('4')) {
      score += 10;
      insights.push('Solid operating history');
      products.push('Business Line of Credit', 'Revenue-Based Financing');
    } else if (tib.includes('1')) {
      score += 5;
      products.push('MCA', 'Revenue-Based Financing');
    } else {
      riskFactors.push('Limited business history');
      products.push('MCA');
    }

    // Revenue scoring
    const revenue = parseFloat(application.monthlyRevenue?.toString() || '0');
    if (revenue >= 100000) {
      score += 20;
      insights.push('Strong monthly revenue over $100K');
    } else if (revenue >= 50000) {
      score += 15;
      insights.push('Healthy revenue of $50K+/month');
    } else if (revenue >= 25000) {
      score += 10;
    } else if (revenue > 0) {
      score += 5;
      riskFactors.push('Lower revenue may limit funding options');
    }

    // Credit score
    const credit = application.creditScore || application.personalCreditScoreRange || '';
    if (credit.includes('720') || credit.includes('above')) {
      score += 10;
      insights.push('Excellent personal credit');
    } else if (credit.includes('650') || credit.includes('700')) {
      score += 5;
    } else if (credit.includes('below') || credit.includes('500')) {
      riskFactors.push('Credit challenges may affect terms');
    }

    // Existing debt
    if (application.hasOutstandingLoans || application.mcaBalanceAmount) {
      riskFactors.push('Has existing business debt');
      score -= 5;
    }

    // Application completeness
    if (application.isFullApplicationCompleted) {
      score += 10;
      insights.push('Full application completed - high intent');
    } else if (application.isCompleted) {
      score += 5;
      insights.push('Intake form completed');
    }

    // Urgency
    const urgency = application.fundingUrgency?.toLowerCase() || '';
    let urgencyLevel: 'immediate' | 'high' | 'medium' | 'low' = 'medium';
    if (urgency.includes('asap') || urgency.includes('immediate') || urgency.includes('week')) {
      urgencyLevel = 'immediate';
      insights.push('Urgent funding need - prioritize contact');
    } else if (urgency.includes('month')) {
      urgencyLevel = 'high';
    } else if (urgency.includes('quarter')) {
      urgencyLevel = 'medium';
    } else {
      urgencyLevel = 'low';
    }

    // Calculate tier
    score = Math.min(100, Math.max(1, score));
    const qualityTier = score >= 80 ? 'hot' : score >= 50 ? 'warm' : 'cold';

    // Estimate funding range
    const requestedAmount = parseFloat(application.requestedAmount?.toString() || '50000');
    const estimatedFundingRange = {
      min: Math.round(requestedAmount * 0.5 / 5000) * 5000,
      max: Math.round(Math.min(requestedAmount * 1.5, revenue * 12) / 5000) * 5000 || requestedAmount,
    };

    return {
      leadScore: score,
      qualityTier,
      insights: insights.length ? insights : ['Standard business funding inquiry'],
      riskFactors: riskFactors.length ? riskFactors : ['No major risk factors identified'],
      recommendedProducts: products.length ? products : ['Business Line of Credit', 'MCA'],
      urgencyLevel,
      estimatedFundingRange,
      nextBestAction: application.isFullApplicationCompleted
        ? 'Request bank statements for underwriting'
        : application.isCompleted
          ? 'Follow up to complete full application'
          : 'Encourage completion of intake form',
    };
  }

  /**
   * Fallback message when AI is unavailable
   */
  private fallbackMessage(request: MessageGenerationRequest): PersonalizedMessage {
    const { application, channel, purpose, agentName } = request;
    const firstName = this.extractFirstName(application.fullName);
    const businessName = application.businessName || application.legalBusinessName || 'your business';
    const sender = agentName || 'Today Capital Group';

    const templates: Record<string, { sms: string; email: { subject: string; body: string } }> = {
      initial_followup: {
        sms: `Hi ${firstName}! Thanks for your interest in funding for ${businessName}. I'd love to discuss your options. When's a good time to chat? - ${sender}`,
        email: {
          subject: `${firstName}, let's discuss funding for ${businessName}`,
          body: `Hi ${firstName},\n\nThank you for reaching out about business funding for ${businessName}. I've reviewed your application and would love to discuss the options available to you.\n\nWhen would be a good time for a quick call?\n\nBest regards,\n${sender}`,
        },
      },
      document_reminder: {
        sms: `Hi ${firstName}! Just a quick reminder - we still need your bank statements to move forward with funding for ${businessName}. Reply if you need help! - ${sender}`,
        email: {
          subject: `Quick reminder: Bank statements needed for ${businessName}`,
          body: `Hi ${firstName},\n\nI wanted to follow up on your funding application for ${businessName}. To move forward, we just need your recent bank statements.\n\nYou can easily upload them through our portal, or simply reply to this email with the documents attached.\n\nLet me know if you have any questions!\n\n${sender}`,
        },
      },
      stale_lead: {
        sms: `Hi ${firstName}! Still interested in funding for ${businessName}? Rates are competitive right now. Let me know if you'd like to reconnect! - ${sender}`,
        email: {
          subject: `${firstName}, checking in on your funding needs`,
          body: `Hi ${firstName},\n\nI wanted to check in regarding your interest in business funding for ${businessName}. Circumstances change, and if you're still exploring options, I'd be happy to help.\n\nCurrent rates are quite competitive. Would you like to schedule a quick call to discuss?\n\nBest,\n${sender}`,
        },
      },
      application_incomplete: {
        sms: `Hi ${firstName}! You're almost there - just a few more details needed to complete your ${businessName} funding application. Can I help? - ${sender}`,
        email: {
          subject: `Complete your application for ${businessName} - almost there!`,
          body: `Hi ${firstName},\n\nYou're so close! Your funding application for ${businessName} is partially complete. Just a few more details and we can get you matched with the right funding options.\n\nClick here to finish: [Application Link]\n\nNeed help? Just reply to this email.\n\n${sender}`,
        },
      },
      bank_statement_needed: {
        sms: `Hi ${firstName}! Great news - your application for ${businessName} looks good! We just need bank statements to finalize. Can you send those over? - ${sender}`,
        email: {
          subject: `Last step for ${businessName}: Bank statements needed`,
          body: `Hi ${firstName},\n\nExciting news! Your application for ${businessName} is progressing well. The final step is to provide your recent bank statements so our underwriting team can finalize your funding options.\n\nYou can upload them securely through our portal or attach them to this email.\n\nLooking forward to helping you secure funding!\n\n${sender}`,
        },
      },
      approval_notification: {
        sms: `Great news ${firstName}! ${businessName} has been pre-approved for funding! Let's discuss your options. When can we chat? - ${sender}`,
        email: {
          subject: `Congratulations ${firstName}! ${businessName} is pre-approved!`,
          body: `Hi ${firstName},\n\nI'm thrilled to share that ${businessName} has been pre-approved for business funding!\n\nI'd love to walk you through the available options and next steps. When would be a good time for a brief call?\n\nCongratulations again!\n\n${sender}`,
        },
      },
      custom: {
        sms: `Hi ${firstName}! Following up about funding for ${businessName}. Any questions I can help with? - ${sender}`,
        email: {
          subject: `Following up - ${businessName} funding inquiry`,
          body: `Hi ${firstName},\n\nI wanted to reach out regarding your funding inquiry for ${businessName}. Please let me know if you have any questions or if there's anything I can help with.\n\nBest regards,\n${sender}`,
        },
      },
    };

    const template = templates[purpose] || templates.custom;

    if (channel === 'sms') {
      return {
        body: template.sms,
        tone: 'friendly',
        channel: 'sms',
        followUpTiming: '2 days',
      };
    } else {
      return {
        subject: template.email.subject,
        body: template.email.body,
        tone: 'professional',
        channel: 'email',
        followUpTiming: '3 days',
      };
    }
  }

  /**
   * Check if the AI service is enabled
   */
  isServiceEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Get the current AI provider
   */
  getProvider(): string | null {
    return this.provider;
  }
}

// Export singleton instance
export const aiAssistant = new AIAssistantService();

// Export types for use in routes
export type { LeadEnrichmentResult, PersonalizedMessage, MessageGenerationRequest };
