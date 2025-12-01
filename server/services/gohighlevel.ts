import type { LoanApplication } from "@shared/schema";

const GHL_API_KEY = process.env.GHL_API_KEY;
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;
const GHL_API_BASE = "https://services.leadconnectorhq.com";

interface GHLCustomField {
  id?: string;  // Custom field ID (preferred for V2 API)
  key?: string; // Field key fallback (contact.field_name format)
  value: string;
}

// Mapping of field keys to GHL custom field IDs
// These IDs can be found in GHL Settings > Custom Fields
// Update these with actual field IDs from your GHL account
const CUSTOM_FIELD_IDS: Record<string, string> = {
  // Leave empty to use field keys, or populate with actual IDs like:
  // "contact.amount_requested": "bZw2JzNt9t4YVpRXjB52",
  // "contact.monthly_revenue": "cXy3KlMn7opQr8st9uvW",
};

interface GHLContact {
  locationId: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  companyName?: string;
  industry?: string;
  address1?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  customFields?: GHLCustomField[]; // V2 API format
  tags?: string[];
  source?: string;
}

export class GoHighLevelService {
  private apiKey: string | null;
  private locationId: string | null;
  private isEnabled: boolean;

  constructor() {
    this.apiKey = GHL_API_KEY || null;
    this.locationId = GHL_LOCATION_ID || null;
    this.isEnabled = !!(this.apiKey && this.locationId);
    
    if (!this.isEnabled) {
      console.warn("GoHighLevel integration disabled: GHL_API_KEY or GHL_LOCATION_ID not configured");
    }
  }

  isServiceEnabled(): boolean {
    return this.isEnabled;
  }

  private async makeRequest(endpoint: string, method: string = "GET", body?: any) {
    if (!this.isEnabled || !this.apiKey) {
      throw new Error("GoHighLevel service is not enabled");
    }

    const url = `${GHL_API_BASE}${endpoint}`;
    
    const response = await fetch(url, {
      method,
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        "Version": "2021-07-28", // Required for Private Integration Tokens
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`GHL API Error (${method} ${url}): ${response.status} - ${errorText}`);
      throw new Error(`GHL API request failed: ${response.status}`);
    }

    return response.json();
  }

  private buildContactData(application: Partial<LoanApplication>, includeLocationId: boolean = true): Partial<GHLContact> {
    const contactData: Partial<GHLContact> = {};
    
    // Only include locationId for POST requests (creating contacts)
    // Do NOT include for PUT requests (updating contacts) - API will return 422
    if (includeLocationId) {
      contactData.locationId = this.locationId!;
    }

    // --- Standard Fields ---
    if (application.fullName) {
      const nameParts = application.fullName.trim().split(" ");
      contactData.firstName = nameParts[0] || "";
      contactData.lastName = nameParts.slice(1).join(" ") || "";
    }

    // Prioritize business email for contact record if available, otherwise fallback to intake email
    contactData.email = application.companyEmail || application.businessEmail || application.email || "";
    
    if (application.phone) {
      contactData.phone = application.phone;
    }
    
    // Map Legal Business Name to standard Company Name field
    if (application.businessName || application.legalBusinessName) {
      contactData.companyName = application.legalBusinessName || application.businessName || "";
    }
    
    // Map Business Address to standard address fields
    const businessAddr = application.businessAddress || application.businessStreetAddress;
    if (businessAddr) {
      contactData.address1 = businessAddr;
    }

    if (application.city) {
      contactData.city = application.city;
    }

    if (application.state) {
      contactData.state = application.state;
    }

    if (application.zipCode) {
      contactData.postalCode = application.zipCode;
    }
    
    contactData.source = application.referralSource || "Full Application Form";

    // --- Custom Fields Mapping ---
    const customFields: GHLCustomField[] = [];

    // Helper to push only if value exists
    // Uses custom field ID if available, otherwise uses field key
    const pushField = (fieldKey: string, value: any) => {
      if (value !== undefined && value !== null && value !== "") {
        // Convert booleans to "Yes"/"No" for text fields
        let finalValue = value;
        if (typeof value === 'boolean') {
            finalValue = value ? "Yes" : "No";
        }
        
        // Check if we have a custom field ID mapping for this key
        const fieldId = CUSTOM_FIELD_IDS[fieldKey];
        if (fieldId) {
          // Use ID format (preferred for V2 API)
          customFields.push({ id: fieldId, value: finalValue.toString() });
        } else {
          // Fall back to key format
          customFields.push({ key: fieldKey, value: finalValue.toString() });
        }
      }
    };

    // 1. Business Information
    pushField("contact.legal_business_name", application.legalBusinessName || application.businessName);
    pushField("contact.doing_business_as", application.doingBusinessAs);
    pushField("contact.company_email", application.companyEmail || application.businessEmail);
    pushField("contact.primary_business_bank", application.bankName);
    pushField("contact.website", application.companyWebsite);
    pushField("contact.business_start_date", application.businessStartDate);
    pushField("contact.ein", application.ein);
    pushField("contact.state_of_incorporation", application.stateOfIncorporation);
    pushField("contact.do_you_process_credit_cards", application.doYouProcessCreditCards);
    pushField("contact.industry_dropdown", application.industry);
    pushField("contact.business_street_address", application.businessAddress || application.businessStreetAddress);
    
    // 2. Financials & Loan Info
    pushField("contact.amount_requested", application.requestedAmount);
    pushField("contact.mca_balance_amount", application.mcaBalanceAmount);
    pushField("contact.mca_balance_bank_name", application.mcaBalanceBankName);
    pushField("contact.monthly_revenue", application.monthlyRevenue);
    
    // Outstanding Loans (Yes/No)
    if (application.hasOutstandingLoans !== undefined) {
        pushField("contact.outstanding_business_loans_or_cash_advances", application.hasOutstandingLoans ? "Yes" : "No");
    }

    // 3. Owner Information
    pushField("contact.social_security_", application.socialSecurityNumber);
    
    // FICO Score (Estimate) -> personal_credit_score_range
    // Use exact FICO from full app if available, otherwise the range from intake
    const ficoValue = application.ficoScoreExact || application.personalCreditScoreRange || application.creditScore;
    pushField("contact.personal_credit_score_range", ficoValue);
    
    pushField("contact.date_of_birth", application.dateOfBirth);
    pushField("contact.ownership_percentage", application.ownership);
    
    // Owner Address (separate from business address)
    pushField("contact.address1", application.ownerAddress1);

    // 4. Agent Tracking - Track which agent processed the application
    if (application.agentName) {
      pushField("contact.agent_name", application.agentName);
    }
    if (application.agentEmail) {
      pushField("contact.agent_email", application.agentEmail);
    }
    if (application.agentGhlId) {
      pushField("contact.agent_ghl_id", application.agentGhlId);
    }

    // 5. Application URL - Maps to GHL custom field for agent access
    if (application.agentViewUrl) {
       pushField("contact.application_url", application.agentViewUrl);
    }

    // 6. Funding Report URL - Custom report link for this lead
    if (application.fundingReportUrl) {
       pushField("contact.funding_report_url", application.fundingReportUrl);
    }

    if (customFields.length > 0) {
      contactData.customFields = customFields;
    }

    // Tags - based on application completion status
    const tags: string[] = [];
    
    if (application.isFullApplicationCompleted) {
      // Full application completed - add "application complete" tag
      tags.push("application complete");
    } else if (application.isCompleted) {
      // Intake form completed - add website lead source tags
      tags.push("lead-source-website");
      tags.push("interest form");
    }
    
    if (tags.length > 0) {
      contactData.tags = tags;
    }

    return contactData;
  }

  async createOrUpdateContact(application: LoanApplication): Promise<string> {
    if (!this.isEnabled) {
      console.log("GoHighLevel sync skipped: service not enabled");
      return "";
    }

    try {
      // Log incoming application data for debugging
      console.log("[GHL DEBUG] Application data received:", {
        requestedAmount: application.requestedAmount,
        monthlyRevenue: application.monthlyRevenue,
        averageMonthlyRevenue: application.averageMonthlyRevenue,
        email: application.email,
        isCompleted: application.isCompleted
      });

      const contactData = this.buildContactData(application);
      
      // Log the custom fields being sent
      console.log("[GHL DEBUG] Custom fields being sent:", JSON.stringify(contactData.customFields, null, 2));

      // If we already have a contact ID, update it (do NOT include locationId)
      if (application.ghlContactId) {
        const updateData = this.buildContactData(application, false); // false = exclude locationId
        console.log("[GHL DEBUG] Updating existing contact:", application.ghlContactId);
        await this.makeRequest(`/contacts/${application.ghlContactId}`, "PUT", updateData);
        return application.ghlContactId;
      }

      // Otherwise, create a new contact (DO include locationId)
      const createData = this.buildContactData(application, true); // true = include locationId
      console.log("[GHL DEBUG] Creating new contact with data:", JSON.stringify(createData, null, 2));
      const response = await this.makeRequest("/contacts", "POST", createData);
      return response.contact?.id || response.id;
    } catch (error) {
      console.error("Error syncing to GoHighLevel:", error);
      throw error;
    }
  }

  async updateContact(contactId: string, application: Partial<LoanApplication>): Promise<void> {
    if (!this.isEnabled || !contactId) {
      console.log("GoHighLevel sync skipped: service not enabled or no contact ID");
      return;
    }

    try {
      const updateData = this.buildContactData(application, false); // false = exclude locationId for PUT
      await this.makeRequest(`/contacts/${contactId}`, "PUT", updateData);
    } catch (error) {
      console.error("Error updating GoHighLevel contact:", error);
      throw error;
    }
  }

  async sendWebhook(application: Partial<LoanApplication>): Promise<void> {
    // Webhook URLs (from user-provided HTML form)
    const GHL_WEBHOOK_URL = 'https://services.leadconnectorhq.com/hooks/n778xwOps9t8Q34eRPfM/webhook-trigger/b21b2392-b82b-49c9-a697-fa2d0c8bddd5';
    const BACKUP_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbynygRwYHpg4joyMLY-IC_B_7cqrNlNl92HjHduc5OvUtrUgig7_aHG69CdSTKZ562w/exec';
    
    // Parse name for first/last
    const nameParts = (application.fullName || '').trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    // Calculate years in business
    const getYearsFromDate = (dateString?: string) => {
      if (!dateString) return "";
      const start = new Date(dateString);
      const now = new Date();
      const diff = now.getTime() - start.getTime();
      const ageDate = new Date(diff);
      return Math.abs(ageDate.getUTCFullYear() - 1970) + " years";
    };

    // Prepare webhook payload
    const webhookPayload = {
      // Use snake_case fields to match HTML form
      legal_business_name: application.legalBusinessName || application.businessName,
      doing_business_as: application.doingBusinessAs || application.businessName,
      company_website: application.companyWebsite,
      business_start_date: application.businessStartDate,
      ein: application.ein,
      company_email: application.companyEmail || application.businessEmail || application.email,
      state_of_incorporation: application.stateOfIncorporation,
      do_you_process_credit_cards: application.doYouProcessCreditCards,
      industry: application.industry,
      business_street_address: application.businessStreetAddress || application.businessAddress,
      business_csz: application.businessCsz,
      requested_loan_amount: application.requestedAmount,
      mca_balance_amount: application.mcaBalanceAmount,
      mca_balance_bank_name: application.mcaBalanceBankName,
      full_name: application.fullName,
      email: application.email,
      social_security_: application.socialSecurityNumber,
      phone: application.phone,
      personal_credit_score_range: application.personalCreditScoreRange || application.ficoScoreExact || application.creditScore,
      address1: application.ownerAddress1,
      address2: application.ownerAddress2,
      owner_csz: application.ownerCsz,
      date_of_birth: application.dateOfBirth,
      ownership_percentage: application.ownership,
      // Calculated fields
      first_name: firstName,
      last_name: lastName,
      submission_date: new Date().toISOString(),
      source: "Full Application Form",
      company_name: application.legalBusinessName || application.businessName,
      years_in_business: getYearsFromDate(application.businessStartDate || undefined),
      // Custom funding report URL
      funding_report_url: application.fundingReportUrl,
    };

    // Send to both webhooks (non-blocking)
    const webhookRequests = [];
    
    try {
      if (GHL_WEBHOOK_URL) {
        webhookRequests.push(
          fetch(GHL_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(webhookPayload),
          }).catch(err => console.error('GHL webhook error:', err))
        );
      }
      
      if (BACKUP_WEBHOOK_URL) {
        webhookRequests.push(
          fetch(BACKUP_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(webhookPayload),
          }).catch(err => console.error('Backup webhook error:', err))
        );
      }

      // Wait for webhooks (but don't fail if they error)
      await Promise.allSettled(webhookRequests);
      console.log('Webhooks sent successfully');
    } catch (error) {
      console.error('Error sending webhooks:', error);
      // Don't throw - webhooks are nice-to-have, not critical
    }
  }
}

export const ghlService = new GoHighLevelService();
