import type { LoanApplication } from "@shared/schema";

const GHL_API_KEY = process.env.GHL_API_KEY;
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;
const GHL_API_BASE = "https://services.leadconnectorhq.com";

interface GHLCustomField {
  key: string;
  value: string;
}

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

    // Standard contact fields
    if (application.fullName) {
      const nameParts = application.fullName.trim().split(" ");
      contactData.firstName = nameParts[0] || "";
      contactData.lastName = nameParts.slice(1).join(" ") || "";
    }

    if (application.email) {
      contactData.email = application.email;
    }

    if (application.phone) {
      contactData.phone = application.phone;
    }

    // Business information - top-level contact fields
    if (application.businessName || application.legalBusinessName) {
      contactData.companyName = application.legalBusinessName || application.businessName || "";
    }

    // Address - top-level contact fields
    if (application.businessAddress) {
      contactData.address1 = application.businessAddress;
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

    // Custom fields for detailed application data
    const customFields: GHLCustomField[] = [];

    // Map application data to custom fields
    // NOTE: You must create these custom fields in your GoHighLevel account
    // with the exact keys specified below for them to sync properly
    
    if (application.industry) {
      customFields.push({ key: "industry", value: application.industry });
    }
    
    if (application.ein) {
      customFields.push({ key: "ein", value: application.ein });
    }

    if (application.timeInBusiness) {
      customFields.push({ key: "time_in_business_years", value: application.timeInBusiness });
    }

    if (application.businessType) {
      customFields.push({ key: "business_type", value: application.businessType });
    }

    if (application.ownership) {
      customFields.push({ key: "ownership_percentage", value: application.ownership });
    }

    if (application.monthlyRevenue) {
      customFields.push({ key: "monthly_revenue_usd", value: application.monthlyRevenue.toString() });
    }

    if (application.averageMonthlyRevenue) {
      customFields.push({ key: "monthly_revenue_approx", value: application.averageMonthlyRevenue.toString() });
    }

    if (application.creditScore) {
      customFields.push({ key: "personal_credit_score", value: application.creditScore });
    }

    if (application.hasOutstandingLoans !== undefined) {
      customFields.push({ key: "has_outstanding_loans", value: application.hasOutstandingLoans ? "Yes" : "No" });
    }

    if (application.outstandingLoansAmount) {
      customFields.push({ key: "outstanding_loans_amount", value: application.outstandingLoansAmount.toString() });
    }

    if (application.requestedAmount) {
      customFields.push({ key: "amount_requested", value: application.requestedAmount.toString() });
    }

    if (application.useOfFunds) {
      customFields.push({ key: "purpose_of_funds", value: application.useOfFunds });
    }

    if (application.fundingUrgency) {
      customFields.push({ key: "funding_urgency", value: application.fundingUrgency });
    }

    if (application.referralSource) {
      customFields.push({ key: "referral_source", value: application.referralSource });
    }

    if (application.currentStep) {
      customFields.push({ key: "application_current_step", value: application.currentStep.toString() });
    }

    if (application.isFullApplicationCompleted !== undefined) {
      customFields.push({ key: "application_status", value: application.isFullApplicationCompleted ? "Full Application Complete" : "Intake Complete" });
    }

    // CRITICAL: Include agent view URL for broker access
    if (application.agentViewUrl) {
      customFields.push({ key: "application_view_link", value: application.agentViewUrl });
    }

    // Full application fields
    if (application.socialSecurityNumber) {
      customFields.push({ key: "ssn", value: application.socialSecurityNumber });
    }

    if (application.dateOfBirth) {
      customFields.push({ key: "date_of_birth", value: application.dateOfBirth });
    }

    if (application.ficoScoreExact) {
      customFields.push({ key: "fico_score_exact", value: application.ficoScoreExact });
    }

    if (application.doingBusinessAs) {
      customFields.push({ key: "dba", value: application.doingBusinessAs });
    }

    if (application.stateOfIncorporation) {
      customFields.push({ key: "state_of_incorporation", value: application.stateOfIncorporation });
    }

    if (application.doYouProcessCreditCards) {
      customFields.push({ key: "processes_credit_cards", value: application.doYouProcessCreditCards });
    }

    if (application.mcaBalanceAmount) {
      customFields.push({ key: "current_mca_balance", value: application.mcaBalanceAmount.toString() });
    }

    if (application.mcaBalanceBankName) {
      customFields.push({ key: "mca_bank_name", value: application.mcaBalanceBankName });
    }

    if (customFields.length > 0) {
      contactData.customFields = customFields;
    }

    // Source tracking
    contactData.source = "MCA Application Form";

    // Tags
    const tags = ["MCA Application"];
    if (application.isFullApplicationCompleted) {
      tags.push("Full Application Complete");
    } else if (application.isCompleted) {
      tags.push("Intake Complete");
    } else {
      tags.push("Application In Progress");
    }
    contactData.tags = tags;

    return contactData;
  }

  async createOrUpdateContact(application: LoanApplication): Promise<string> {
    if (!this.isEnabled) {
      console.log("GoHighLevel sync skipped: service not enabled");
      return "";
    }

    try {
      const contactData = this.buildContactData(application);

      // If we already have a contact ID, update it (do NOT include locationId)
      if (application.ghlContactId) {
        const updateData = this.buildContactData(application, false); // false = exclude locationId
        await this.makeRequest(`/contacts/${application.ghlContactId}`, "PUT", updateData);
        return application.ghlContactId;
      }

      // Otherwise, create a new contact (DO include locationId)
      const createData = this.buildContactData(application, true); // true = include locationId
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
