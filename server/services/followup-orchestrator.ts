import type { LoanApplication } from "@shared/schema";
import { aiAssistant, type LeadEnrichmentResult } from "./ai-assistant";

// GHL Workflow Webhook URLs - Configure these in your environment
const GHL_WEBHOOK_BASE = process.env.GHL_WEBHOOK_BASE || "https://services.leadconnectorhq.com/hooks";
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;

// Webhook URLs for different sequences (configure these in GHL)
const GHL_WEBHOOKS = {
  // Hot lead alert - immediate notification to agent
  HOT_LEAD_ALERT: process.env.GHL_WEBHOOK_HOT_LEAD || `${GHL_WEBHOOK_BASE}/${GHL_LOCATION_ID}/webhook-trigger/hot-lead-alert`,

  // Follow-up sequences
  NEW_LEAD_SEQUENCE: process.env.GHL_WEBHOOK_NEW_LEAD || `${GHL_WEBHOOK_BASE}/${GHL_LOCATION_ID}/webhook-trigger/new-lead-sequence`,
  STALE_LEAD_SEQUENCE: process.env.GHL_WEBHOOK_STALE_LEAD || `${GHL_WEBHOOK_BASE}/${GHL_LOCATION_ID}/webhook-trigger/stale-lead-sequence`,
  INCOMPLETE_APP_SEQUENCE: process.env.GHL_WEBHOOK_INCOMPLETE_APP || `${GHL_WEBHOOK_BASE}/${GHL_LOCATION_ID}/webhook-trigger/incomplete-app-sequence`,
  DOCS_NEEDED_SEQUENCE: process.env.GHL_WEBHOOK_DOCS_NEEDED || `${GHL_WEBHOOK_BASE}/${GHL_LOCATION_ID}/webhook-trigger/docs-needed-sequence`,
  NURTURE_SEQUENCE: process.env.GHL_WEBHOOK_NURTURE || `${GHL_WEBHOOK_BASE}/${GHL_LOCATION_ID}/webhook-trigger/nurture-sequence`,

  // Abandonment recovery
  ABANDONMENT_RECOVERY: process.env.GHL_WEBHOOK_ABANDONMENT || `${GHL_WEBHOOK_BASE}/${GHL_LOCATION_ID}/webhook-trigger/abandonment-recovery`,
};

// Sequence definitions with timing
interface SequenceStage {
  delayHours: number; // Hours after previous stage (or sequence start for stage 0)
  channel: 'sms' | 'email' | 'both';
  purpose: string;
  isLastStage?: boolean;
}

const SEQUENCES: Record<string, SequenceStage[]> = {
  new_lead: [
    { delayHours: 0, channel: 'sms', purpose: 'initial_followup' }, // Immediate
    { delayHours: 2, channel: 'email', purpose: 'initial_followup' }, // 2 hours later
    { delayHours: 24, channel: 'sms', purpose: 'initial_followup' }, // Day 1
    { delayHours: 72, channel: 'email', purpose: 'initial_followup' }, // Day 3
    { delayHours: 168, channel: 'both', purpose: 'stale_lead', isLastStage: true }, // Day 7
  ],
  stale_lead: [
    { delayHours: 0, channel: 'sms', purpose: 'stale_lead' },
    { delayHours: 48, channel: 'email', purpose: 'stale_lead' },
    { delayHours: 120, channel: 'sms', purpose: 'stale_lead' }, // Day 5
    { delayHours: 240, channel: 'email', purpose: 'stale_lead', isLastStage: true }, // Day 10 - break-up
  ],
  incomplete_app: [
    { delayHours: 1, channel: 'sms', purpose: 'application_incomplete' }, // 1 hour after abandon
    { delayHours: 24, channel: 'email', purpose: 'application_incomplete' },
    { delayHours: 72, channel: 'sms', purpose: 'application_incomplete' },
    { delayHours: 168, channel: 'email', purpose: 'application_incomplete', isLastStage: true },
  ],
  docs_needed: [
    { delayHours: 0, channel: 'sms', purpose: 'bank_statement_needed' }, // Immediate
    { delayHours: 24, channel: 'email', purpose: 'bank_statement_needed' },
    { delayHours: 72, channel: 'sms', purpose: 'document_reminder' },
    { delayHours: 120, channel: 'email', purpose: 'document_reminder' },
    { delayHours: 168, channel: 'both', purpose: 'document_reminder', isLastStage: true },
  ],
  nurture: [
    { delayHours: 336, channel: 'email', purpose: 'stale_lead' }, // 2 weeks
    { delayHours: 672, channel: 'email', purpose: 'stale_lead' }, // 4 weeks
    { delayHours: 1344, channel: 'email', purpose: 'stale_lead', isLastStage: true }, // 8 weeks
  ],
};

// Abandonment thresholds (in hours)
const ABANDONMENT_THRESHOLDS = {
  INTAKE_STARTED: 1, // 1 hour without completing intake
  INTAKE_COMPLETED: 24, // 24 hours without starting full application
  FULL_APP_COMPLETED: 48, // 48 hours without uploading bank statements
  STALE_LEAD: 168, // 7 days without any activity after initial contact
};

export interface FollowUpAction {
  sequence: string;
  stage: number;
  channel: 'sms' | 'email' | 'both';
  purpose: string;
  message?: {
    sms?: { body: string };
    email?: { subject: string; body: string };
  };
  enrichment?: LeadEnrichmentResult;
  isHotLead: boolean;
  nextStageIn?: number; // Hours until next stage
}

export interface AbandonmentDetection {
  isAbandoned: boolean;
  abandonmentType?: 'intake_started' | 'intake_completed' | 'full_app_completed' | 'stale';
  hoursSinceActivity: number;
  recommendedAction?: string;
}

class FollowUpOrchestrator {
  /**
   * Process a new or updated application - determine sequence and trigger appropriate actions
   */
  async processApplication(
    application: LoanApplication,
    trigger: 'new_application' | 'intake_completed' | 'full_app_completed' | 'bank_docs_uploaded' | 'activity' | 'scheduled_check'
  ): Promise<{
    enrichment: LeadEnrichmentResult;
    action: FollowUpAction | null;
    ghlPayload: any;
  }> {
    console.log(`[FollowUp] Processing application ${application.id} - trigger: ${trigger}`);

    // Step 1: Run AI enrichment
    const enrichment = await aiAssistant.enrichLead(application);
    const isHotLead = enrichment.leadScore >= 80;

    // Step 2: Determine the appropriate sequence
    const sequence = this.determineSequence(application, trigger);
    console.log(`[FollowUp] Determined sequence: ${sequence}`);

    // Step 3: Build GHL payload with AI data
    const ghlPayload = await this.buildGHLPayload(application, enrichment, sequence, trigger);

    // Step 4: Determine immediate action needed
    let action: FollowUpAction | null = null;

    if (trigger === 'new_application' || trigger === 'intake_completed') {
      // New leads get immediate action
      action = await this.buildFollowUpAction(application, enrichment, sequence, 0);

      // Hot lead alert
      if (isHotLead) {
        await this.sendHotLeadAlert(application, enrichment);
      }
    } else if (trigger === 'scheduled_check') {
      // Check if it's time for the next stage
      action = await this.checkAndAdvanceSequence(application, enrichment);
    }

    return { enrichment, action, ghlPayload };
  }

  /**
   * Determine which follow-up sequence applies to this application
   */
  determineSequence(application: LoanApplication, trigger: string): string {
    // Bank docs uploaded - move to nurture or close
    if (application.plaidItemId || trigger === 'bank_docs_uploaded') {
      return 'nurture'; // They're in the pipeline, just need occasional touches
    }

    // Full application completed but no bank docs
    if (application.isFullApplicationCompleted) {
      return 'docs_needed';
    }

    // Intake completed but no full application
    if (application.isCompleted && !application.isFullApplicationCompleted) {
      // Check if they've been contacted before
      if (application.contactAttempts && application.contactAttempts > 3) {
        return 'stale_lead';
      }
      return 'incomplete_app';
    }

    // New lead or intake in progress
    if (trigger === 'new_application' || trigger === 'intake_completed') {
      return 'new_lead';
    }

    // Default to stale if nothing else matches
    return 'stale_lead';
  }

  /**
   * Build the action for a specific sequence stage
   */
  async buildFollowUpAction(
    application: LoanApplication,
    enrichment: LeadEnrichmentResult,
    sequence: string,
    stage: number
  ): Promise<FollowUpAction> {
    const sequenceStages = SEQUENCES[sequence] || SEQUENCES.new_lead;
    const currentStage = sequenceStages[stage] || sequenceStages[0];
    const nextStage = sequenceStages[stage + 1];

    const action: FollowUpAction = {
      sequence,
      stage,
      channel: currentStage.channel,
      purpose: currentStage.purpose,
      enrichment,
      isHotLead: enrichment.leadScore >= 80,
      nextStageIn: nextStage ? nextStage.delayHours : undefined,
    };

    // Generate personalized messages
    if (currentStage.channel === 'sms' || currentStage.channel === 'both') {
      const smsMessage = await aiAssistant.generateMessage({
        application,
        channel: 'sms',
        purpose: currentStage.purpose as any,
        agentName: application.agentName || undefined,
        companyName: 'Today Capital Group',
      });
      action.message = { ...action.message, sms: { body: smsMessage.body } };
    }

    if (currentStage.channel === 'email' || currentStage.channel === 'both') {
      const emailMessage = await aiAssistant.generateMessage({
        application,
        channel: 'email',
        purpose: currentStage.purpose as any,
        agentName: application.agentName || undefined,
        companyName: 'Today Capital Group',
      });
      action.message = {
        ...action.message,
        email: { subject: emailMessage.subject || '', body: emailMessage.body },
      };
    }

    return action;
  }

  /**
   * Check if application should advance to next sequence stage
   */
  async checkAndAdvanceSequence(
    application: LoanApplication,
    enrichment: LeadEnrichmentResult
  ): Promise<FollowUpAction | null> {
    const sequence = application.followUpSequence || 'new_lead';
    const currentStage = application.followUpStage || 0;
    const sequenceStages = SEQUENCES[sequence];

    if (!sequenceStages || currentStage >= sequenceStages.length) {
      return null; // Sequence complete
    }

    const lastFollowUp = application.lastFollowUpAt
      ? new Date(application.lastFollowUpAt)
      : application.followUpStartedAt
        ? new Date(application.followUpStartedAt)
        : null;

    if (!lastFollowUp) {
      // Start the sequence
      return this.buildFollowUpAction(application, enrichment, sequence, 0);
    }

    const nextStageConfig = sequenceStages[currentStage];
    if (!nextStageConfig) return null;

    const hoursSinceLastFollowUp = (Date.now() - lastFollowUp.getTime()) / (1000 * 60 * 60);

    if (hoursSinceLastFollowUp >= nextStageConfig.delayHours) {
      // Time to advance to next stage
      return this.buildFollowUpAction(application, enrichment, sequence, currentStage);
    }

    return null; // Not time yet
  }

  /**
   * Detect if an application has been abandoned
   */
  detectAbandonment(application: LoanApplication): AbandonmentDetection {
    const now = Date.now();
    const lastActivity = application.lastActivityAt
      ? new Date(application.lastActivityAt).getTime()
      : application.updatedAt
        ? new Date(application.updatedAt).getTime()
        : application.createdAt
          ? new Date(application.createdAt).getTime()
          : now;

    const hoursSinceActivity = (now - lastActivity) / (1000 * 60 * 60);

    // Check abandonment based on application state
    if (!application.isCompleted) {
      // Intake not completed
      if (hoursSinceActivity >= ABANDONMENT_THRESHOLDS.INTAKE_STARTED) {
        return {
          isAbandoned: true,
          abandonmentType: 'intake_started',
          hoursSinceActivity,
          recommendedAction: `User started intake ${Math.round(hoursSinceActivity)} hours ago but didn't complete. Send completion reminder.`,
        };
      }
    } else if (!application.isFullApplicationCompleted) {
      // Intake completed, full app not started
      if (hoursSinceActivity >= ABANDONMENT_THRESHOLDS.INTAKE_COMPLETED) {
        return {
          isAbandoned: true,
          abandonmentType: 'intake_completed',
          hoursSinceActivity,
          recommendedAction: `User completed intake ${Math.round(hoursSinceActivity)} hours ago but hasn't started full application. Send application prompt.`,
        };
      }
    } else if (!application.plaidItemId) {
      // Full app completed, no bank docs
      if (hoursSinceActivity >= ABANDONMENT_THRESHOLDS.FULL_APP_COMPLETED) {
        return {
          isAbandoned: true,
          abandonmentType: 'full_app_completed',
          hoursSinceActivity,
          recommendedAction: `User completed application ${Math.round(hoursSinceActivity)} hours ago but hasn't uploaded bank statements. Send document request.`,
        };
      }
    } else {
      // Everything completed, check for stale
      if (hoursSinceActivity >= ABANDONMENT_THRESHOLDS.STALE_LEAD) {
        return {
          isAbandoned: true,
          abandonmentType: 'stale',
          hoursSinceActivity,
          recommendedAction: `No activity for ${Math.round(hoursSinceActivity)} hours. Consider re-engagement campaign.`,
        };
      }
    }

    return {
      isAbandoned: false,
      hoursSinceActivity,
    };
  }

  /**
   * Process abandoned applications and trigger recovery sequences
   */
  async processAbandonedApplications(applications: LoanApplication[]): Promise<{
    processed: number;
    recovered: Array<{ id: string; type: string; action: string }>;
  }> {
    const recovered: Array<{ id: string; type: string; action: string }> = [];

    for (const app of applications) {
      // Skip if follow-ups are paused
      if (app.followUpPausedUntil && new Date(app.followUpPausedUntil) > new Date()) {
        continue;
      }

      // Skip if opted out
      if (app.lastContactResponse === 'opted_out') {
        continue;
      }

      const abandonment = this.detectAbandonment(app);

      if (abandonment.isAbandoned && abandonment.abandonmentType) {
        // Determine recovery sequence
        let recoverySequence: string;
        switch (abandonment.abandonmentType) {
          case 'intake_started':
            recoverySequence = 'incomplete_app';
            break;
          case 'intake_completed':
            recoverySequence = 'incomplete_app';
            break;
          case 'full_app_completed':
            recoverySequence = 'docs_needed';
            break;
          case 'stale':
            recoverySequence = 'stale_lead';
            break;
          default:
            recoverySequence = 'stale_lead';
        }

        // Trigger recovery webhook
        await this.triggerRecoverySequence(app, recoverySequence, abandonment);

        recovered.push({
          id: app.id,
          type: abandonment.abandonmentType,
          action: `Triggered ${recoverySequence} sequence`,
        });
      }
    }

    return { processed: applications.length, recovered };
  }

  /**
   * Build comprehensive GHL payload with all AI data
   */
  async buildGHLPayload(
    application: LoanApplication,
    enrichment: LeadEnrichmentResult,
    sequence: string,
    trigger: string
  ): Promise<any> {
    const firstName = application.fullName?.split(' ')[0] || 'there';
    const businessName = application.businessName || application.legalBusinessName || 'your business';

    // Generate messages for GHL to use
    const smsMessage = await aiAssistant.generateMessage({
      application,
      channel: 'sms',
      purpose: this.getPurposeFromSequence(sequence),
      agentName: application.agentName || undefined,
      companyName: 'Today Capital Group',
    });

    const emailMessage = await aiAssistant.generateMessage({
      application,
      channel: 'email',
      purpose: this.getPurposeFromSequence(sequence),
      agentName: application.agentName || undefined,
      companyName: 'Today Capital Group',
    });

    return {
      // Contact identifiers
      email: application.email,
      phone: application.phone,
      ghlContactId: application.ghlContactId,
      applicationId: application.id,

      // Contact info
      firstName,
      fullName: application.fullName,
      businessName,

      // Trigger context
      trigger,
      timestamp: new Date().toISOString(),

      // AI Enrichment Data
      ai: {
        leadScore: enrichment.leadScore,
        qualityTier: enrichment.qualityTier,
        urgencyLevel: enrichment.urgencyLevel,
        isHotLead: enrichment.leadScore >= 80,
        insights: enrichment.insights,
        riskFactors: enrichment.riskFactors,
        recommendedProducts: enrichment.recommendedProducts,
        estimatedFundingRange: enrichment.estimatedFundingRange,
        nextBestAction: enrichment.nextBestAction,
      },

      // Follow-up Sequence Data
      sequence: {
        name: sequence,
        stage: application.followUpStage || 0,
        contactAttempts: application.contactAttempts || 0,
      },

      // Pre-generated Messages (GHL can use these directly)
      messages: {
        sms: {
          body: smsMessage.body,
          tone: smsMessage.tone,
        },
        email: {
          subject: emailMessage.subject,
          body: emailMessage.body,
          tone: emailMessage.tone,
        },
      },

      // Application Status
      status: {
        intakeCompleted: application.isCompleted,
        fullAppCompleted: application.isFullApplicationCompleted,
        hasBankDocs: !!application.plaidItemId,
        currentStep: application.currentStep,
      },

      // Business Data for GHL custom fields
      businessData: {
        industry: application.industry,
        timeInBusiness: application.timeInBusiness,
        monthlyRevenue: application.monthlyRevenue || application.averageMonthlyRevenue,
        requestedAmount: application.requestedAmount,
        creditScore: application.creditScore || application.personalCreditScoreRange,
        fundingUrgency: application.fundingUrgency,
        useOfFunds: application.useOfFunds,
      },
    };
  }

  /**
   * Send hot lead alert to GHL
   */
  async sendHotLeadAlert(application: LoanApplication, enrichment: LeadEnrichmentResult): Promise<void> {
    console.log(`[FollowUp] 🔥 HOT LEAD ALERT: ${application.email} (Score: ${enrichment.leadScore})`);

    const smsMessage = await aiAssistant.generateMessage({
      application,
      channel: 'sms',
      purpose: 'initial_followup',
      agentName: application.agentName || undefined,
      companyName: 'Today Capital Group',
    });

    const payload = {
      alertType: 'hot_lead',
      priority: 'immediate',
      email: application.email,
      phone: application.phone,
      ghlContactId: application.ghlContactId,
      applicationId: application.id,
      fullName: application.fullName,
      businessName: application.businessName || application.legalBusinessName,
      leadScore: enrichment.leadScore,
      qualityTier: enrichment.qualityTier,
      urgencyLevel: enrichment.urgencyLevel,
      insights: enrichment.insights,
      recommendedProducts: enrichment.recommendedProducts,
      nextBestAction: enrichment.nextBestAction,
      estimatedFundingRange: enrichment.estimatedFundingRange,
      suggestedSms: smsMessage.body,
      agentName: application.agentName,
      agentEmail: application.agentEmail,
      timestamp: new Date().toISOString(),
    };

    await this.sendWebhook(GHL_WEBHOOKS.HOT_LEAD_ALERT, payload);
  }

  /**
   * Trigger a specific sequence in GHL
   */
  async triggerSequence(application: LoanApplication, sequence: string, payload: any): Promise<void> {
    const webhookUrl = this.getWebhookForSequence(sequence);
    await this.sendWebhook(webhookUrl, payload);
  }

  /**
   * Trigger abandonment recovery sequence
   */
  async triggerRecoverySequence(
    application: LoanApplication,
    sequence: string,
    abandonment: AbandonmentDetection
  ): Promise<void> {
    const enrichment = await aiAssistant.enrichLead(application);

    const payload = await this.buildGHLPayload(application, enrichment, sequence, 'abandonment_recovery');
    payload.abandonment = {
      type: abandonment.abandonmentType,
      hoursSinceActivity: abandonment.hoursSinceActivity,
      recommendedAction: abandonment.recommendedAction,
    };

    await this.sendWebhook(GHL_WEBHOOKS.ABANDONMENT_RECOVERY, payload);
  }

  /**
   * Get webhook URL for a sequence
   */
  private getWebhookForSequence(sequence: string): string {
    switch (sequence) {
      case 'new_lead':
        return GHL_WEBHOOKS.NEW_LEAD_SEQUENCE;
      case 'stale_lead':
        return GHL_WEBHOOKS.STALE_LEAD_SEQUENCE;
      case 'incomplete_app':
        return GHL_WEBHOOKS.INCOMPLETE_APP_SEQUENCE;
      case 'docs_needed':
        return GHL_WEBHOOKS.DOCS_NEEDED_SEQUENCE;
      case 'nurture':
        return GHL_WEBHOOKS.NURTURE_SEQUENCE;
      default:
        return GHL_WEBHOOKS.NEW_LEAD_SEQUENCE;
    }
  }

  /**
   * Get message purpose from sequence name
   */
  private getPurposeFromSequence(sequence: string): any {
    switch (sequence) {
      case 'new_lead':
        return 'initial_followup';
      case 'stale_lead':
        return 'stale_lead';
      case 'incomplete_app':
        return 'application_incomplete';
      case 'docs_needed':
        return 'bank_statement_needed';
      case 'nurture':
        return 'stale_lead';
      default:
        return 'initial_followup';
    }
  }

  /**
   * Send webhook to GHL
   */
  private async sendWebhook(url: string, payload: any): Promise<void> {
    try {
      console.log(`[FollowUp] Sending webhook to: ${url}`);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        console.error(`[FollowUp] Webhook failed: ${response.status} ${response.statusText}`);
      } else {
        console.log(`[FollowUp] Webhook sent successfully`);
      }
    } catch (error) {
      console.error('[FollowUp] Webhook error:', error);
      // Don't throw - webhooks are fire-and-forget
    }
  }

  /**
   * Get data updates to save to the application after processing
   */
  getApplicationUpdates(
    enrichment: LeadEnrichmentResult,
    sequence: string,
    stage: number,
    isNewSequence: boolean
  ): Partial<LoanApplication> {
    const updates: Partial<LoanApplication> = {
      // AI Enrichment
      aiLeadScore: enrichment.leadScore,
      aiQualityTier: enrichment.qualityTier,
      aiInsights: enrichment.insights as any,
      aiRiskFactors: enrichment.riskFactors as any,
      aiRecommendedProducts: enrichment.recommendedProducts as any,
      aiUrgencyLevel: enrichment.urgencyLevel,
      aiNextBestAction: enrichment.nextBestAction,
      aiEnrichedAt: new Date(),

      // Follow-up tracking
      followUpSequence: sequence,
      followUpStage: stage,
      lastFollowUpAt: new Date(),
      lastActivityAt: new Date(),
    };

    if (isNewSequence) {
      updates.followUpStartedAt = new Date();
    }

    return updates;
  }
}

// Export singleton
export const followUpOrchestrator = new FollowUpOrchestrator();

// Export types
export type { FollowUpAction, AbandonmentDetection };
