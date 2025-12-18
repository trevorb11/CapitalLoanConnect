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
// Update these with actual field IDs from your GHL account for best reliability
const CUSTOM_FIELD_IDS: Record<string, string> = {
  // Leave empty to use field keys, or populate with actual IDs like:
  // "contact.amount_requested": "bZw2JzNt9t4YVpRXjB52",
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

// Field mapping configuration using exact Unique Keys from CRM_Field_Mapping Excel
// These map application fields to GHL custom field keys
const GHL_FIELD_KEYS = {
  // ===== APPLICATION DETAILS FOLDER =====
  DOING_BUSINESS_AS: "contact.doing_business_as",
  COMPANY_EMAIL: "contact.company_email",
  PRIMARY_BUSINESS_BANK: "contact.primary_business_bank",
  PERSONAL_CREDIT_SCORE_RANGE: "contact.personal_credit_score_range",
  OWNERSHIP_PERCENTAGE: "contact.ownership_percentage",
  OUTSTANDING_LOANS: "contact.outstanding_business_loans_or_cash_advances",
  BUSINESS_STREET_ADDRESS: "contact.business_street_address",
  MCA_BALANCE_AMOUNT: "contact.mca_balance_amount",
  MCA_BALANCE_BANK_NAME: "contact.mca_balance_bank_name",
  DO_YOU_PROCESS_CREDIT_CARDS: "contact.do_you_process_credit_cards",
  APPLICATION_URL: "contact.application_url",
  AGENT_NAME: "contact.agent_name",
  AGENT_EMAIL: "contact.agent_email",
  AGENT_GHL_ID: "contact.agent_ghl_id",
  
  // ===== BUSINESS DETAILS FOLDER =====
  WEBSITE: "contact.website",
  MONTHLY_REVENUE: "contact.monthly_revenue",
  YEARS_IN_BUSINESS: "contact.years_in_business",
  INDUSTRY_DROPDOWN: "contact.industry_dropdown",
  ANNUAL_REVENUE: "contact.annual_revenue",
  EIN: "contact.ein",
  BUSINESS_START_DATE: "contact.business_start_date",
  BUSINESS_TYPE: "contact.business_type",
  
  // ===== SURVEY FOLDER =====
  AMOUNT_REQUESTED: "contact.amount_requested",
  LEGAL_BUSINESS_NAME: "contact.legal_business_name",
  PREFERRED_EMAIL: "contact.preferred_email",
  LOAN_PURPOSE: "contact.loan_purpose",
  TIME_IN_BUSINESS_YEARS: "contact.time_in_business_years",
  MONTHLY_REVENUE_APPROX: "contact.monthly_revenue_approx",
  
  // ===== OWNER INFO =====
  SOCIAL_SECURITY: "contact.social_security_",
  DATE_OF_BIRTH: "contact.date_of_birth",
  OWNER_ADDRESS1: "contact.address1",
  
  // ===== ADDITIONAL MAPPINGS =====
  FUNDING_REPORT_URL: "contact.funding_report_url",
  FUNDING_TIME_FRAME: "contact.funding_time_frame",
  STATE_OF_INCORPORATION: "contact.state_of_incorporation",
  BUSINESS_CSZ: "contact.business_csz",
  OWNER_CSZ: "contact.owner_csz",
  CURRENT_POSITIONS_BALANCES: "contact.current_positions__balances",
  
  // ===== UTM TRACKING =====
  UTM_SOURCE: "contact.utm_source",
  UTM_MEDIUM: "contact.utm_medium",
  UTM_CAMPAIGN: "contact.utm_campaign",
  UTM_TERM: "contact.utm_term",
  UTM_CONTENT: "contact.utm_content",
  REFERRER_URL: "contact.referrer_url",
} as const;

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

    // --- Standard GHL Fields ---
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
    const processedKeys = new Set<string>(); // Prevent duplicate keys

    // Helper to push custom field with proper formatting
    const pushField = (fieldKey: string, value: any) => {
      if (value === undefined || value === null || value === "") return;
      if (processedKeys.has(fieldKey)) return; // Skip duplicates
      
      processedKeys.add(fieldKey);
      
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
    };

    // ========================================
    // APPLICATION DETAILS FOLDER
    // ========================================
    
    // Doing Business As
    pushField(GHL_FIELD_KEYS.DOING_BUSINESS_AS, application.doingBusinessAs);
    
    // Company Email - prioritize companyEmail, fallback to businessEmail
    pushField(GHL_FIELD_KEYS.COMPANY_EMAIL, application.companyEmail || application.businessEmail);
    
    // Primary Business Bank
    pushField(GHL_FIELD_KEYS.PRIMARY_BUSINESS_BANK, application.bankName);
    
    // Personal Credit Score Range - use exact FICO if available, otherwise range from intake
    const ficoValue = application.ficoScoreExact || application.personalCreditScoreRange || application.creditScore;
    pushField(GHL_FIELD_KEYS.PERSONAL_CREDIT_SCORE_RANGE, ficoValue);
    
    // Ownership Percentage - check both fields with priority
    const ownershipValue = application.ownership || application.ownerPercentage;
    pushField(GHL_FIELD_KEYS.OWNERSHIP_PERCENTAGE, ownershipValue);
    
    // Outstanding Business Loans or Cash Advances
    if (application.hasOutstandingLoans !== undefined) {
      pushField(GHL_FIELD_KEYS.OUTSTANDING_LOANS, application.hasOutstandingLoans ? "Yes" : "No");
    }
    
    // Business Street Address - prioritize businessStreetAddress, fallback to businessAddress
    const businessAddrValue = application.businessStreetAddress || application.businessAddress;
    pushField(GHL_FIELD_KEYS.BUSINESS_STREET_ADDRESS, businessAddrValue);
    
    // MCA Balance Amount
    pushField(GHL_FIELD_KEYS.MCA_BALANCE_AMOUNT, application.mcaBalanceAmount);
    
    // MCA Balance Bank Name
    pushField(GHL_FIELD_KEYS.MCA_BALANCE_BANK_NAME, application.mcaBalanceBankName);
    
    // Do You Process Credit Cards
    pushField(GHL_FIELD_KEYS.DO_YOU_PROCESS_CREDIT_CARDS, application.doYouProcessCreditCards);
    
    // Application URL (Agent View URL)
    pushField(GHL_FIELD_KEYS.APPLICATION_URL, application.agentViewUrl);
    
    // Agent Tracking Fields
    pushField(GHL_FIELD_KEYS.AGENT_NAME, application.agentName);
    pushField(GHL_FIELD_KEYS.AGENT_EMAIL, application.agentEmail);
    pushField(GHL_FIELD_KEYS.AGENT_GHL_ID, application.agentGhlId);

    // ========================================
    // BUSINESS DETAILS FOLDER
    // ========================================
    
    // Website
    pushField(GHL_FIELD_KEYS.WEBSITE, application.companyWebsite);
    
    // Monthly Revenue
    pushField(GHL_FIELD_KEYS.MONTHLY_REVENUE, application.monthlyRevenue);
    
    // Time in Business / Years in Business - prioritize timeInBusiness, fallback to calculated years from businessStartDate
    const yearsInBusinessValue = application.timeInBusiness || 
      (application.businessStartDate ? (() => {
        const start = new Date(application.businessStartDate);
        const now = new Date();
        const diff = now.getTime() - start.getTime();
        const ageDate = new Date(diff);
        return Math.abs(ageDate.getUTCFullYear() - 1970) + " years";
      })() : undefined);
    pushField(GHL_FIELD_KEYS.YEARS_IN_BUSINESS, yearsInBusinessValue);
    
    // Industry (using industry_dropdown key)
    pushField(GHL_FIELD_KEYS.INDUSTRY_DROPDOWN, application.industry);
    
    // Average/Annual Revenue
    pushField(GHL_FIELD_KEYS.ANNUAL_REVENUE, application.averageMonthlyRevenue);
    
    // EIN
    pushField(GHL_FIELD_KEYS.EIN, application.ein);
    
    // Business Start Date
    pushField(GHL_FIELD_KEYS.BUSINESS_START_DATE, application.businessStartDate);
    
    // Business Type
    pushField(GHL_FIELD_KEYS.BUSINESS_TYPE, application.businessType);

    // ========================================
    // SURVEY FOLDER
    // ========================================
    
    // Amount Requested
    pushField(GHL_FIELD_KEYS.AMOUNT_REQUESTED, application.requestedAmount);
    
    // Legal Business Name - prioritize legalBusinessName, fallback to businessName
    const legalNameValue = application.legalBusinessName || application.businessName;
    pushField(GHL_FIELD_KEYS.LEGAL_BUSINESS_NAME, legalNameValue);
    
    // Preferred Email (business email)
    pushField(GHL_FIELD_KEYS.PREFERRED_EMAIL, application.businessEmail || application.companyEmail);
    
    // Loan Purpose / Use of Funds
    pushField(GHL_FIELD_KEYS.LOAN_PURPOSE, application.useOfFunds);
    
    // Time in Business (Years) - duplicate mapping for Survey folder
    pushField(GHL_FIELD_KEYS.TIME_IN_BUSINESS_YEARS, application.timeInBusiness);
    
    // Monthly Revenue Approx - map from intake monthly revenue or average
    pushField(GHL_FIELD_KEYS.MONTHLY_REVENUE_APPROX, application.monthlyRevenue || application.averageMonthlyRevenue);

    // ========================================
    // OWNER INFO
    // ========================================
    
    // Social Security Number
    pushField(GHL_FIELD_KEYS.SOCIAL_SECURITY, application.socialSecurityNumber);
    
    // Date of Birth
    pushField(GHL_FIELD_KEYS.DATE_OF_BIRTH, application.dateOfBirth);
    
    // Owner Address Line 1
    pushField(GHL_FIELD_KEYS.OWNER_ADDRESS1, application.ownerAddress1);

    // ========================================
    // FUNDING & ADDITIONAL
    // ========================================
    
    // Funding Report URL
    pushField(GHL_FIELD_KEYS.FUNDING_REPORT_URL, application.fundingReportUrl);
    
    // Funding Urgency / Time Frame
    pushField(GHL_FIELD_KEYS.FUNDING_TIME_FRAME, application.fundingUrgency);
    
    // State of Incorporation
    pushField(GHL_FIELD_KEYS.STATE_OF_INCORPORATION, application.stateOfIncorporation);
    
    // Outstanding Loans Amount / Current Positions
    pushField(GHL_FIELD_KEYS.CURRENT_POSITIONS_BALANCES, application.outstandingLoansAmount);

    // ========================================
    // COMBINED CSZ FIELDS
    // ========================================
    
    // Business CSZ (City, State, Zip combined)
    let businessCszValue = application.businessCsz;
    if (!businessCszValue && application.city && application.state && application.zipCode) {
      businessCszValue = `${application.city}, ${application.state} ${application.zipCode}`;
    }
    pushField(GHL_FIELD_KEYS.BUSINESS_CSZ, businessCszValue);
    
    // Owner CSZ
    let ownerCszValue = application.ownerCsz;
    if (!ownerCszValue && application.ownerCity && application.ownerState && application.ownerZip) {
      ownerCszValue = `${application.ownerCity}, ${application.ownerState} ${application.ownerZip}`;
    }
    pushField(GHL_FIELD_KEYS.OWNER_CSZ, ownerCszValue);

    // ========================================
    // UTM TRACKING PARAMETERS
    // ========================================
    pushField(GHL_FIELD_KEYS.UTM_SOURCE, application.utmSource);
    pushField(GHL_FIELD_KEYS.UTM_MEDIUM, application.utmMedium);
    pushField(GHL_FIELD_KEYS.UTM_CAMPAIGN, application.utmCampaign);
    pushField(GHL_FIELD_KEYS.UTM_TERM, application.utmTerm);
    pushField(GHL_FIELD_KEYS.UTM_CONTENT, application.utmContent);
    pushField(GHL_FIELD_KEYS.REFERRER_URL, application.referrerUrl);

    // Apply custom fields to contact data
    if (customFields.length > 0) {
      contactData.customFields = customFields;
    }

    // ========================================
    // TAGS - Based on Application Status
    // ========================================
    const tags: string[] = [];
    
    if (application.isFullApplicationCompleted) {
      // Full application completed - add "application complete" tag
      tags.push("application complete");
    } else if (application.isCompleted) {
      // Intake form completed - add website lead source tags
      tags.push("lead-source-website");
      tags.push("interest form");
    } else {
      // Application started but not completed
      tags.push("App Started");
    }
    
    if (tags.length > 0) {
      contactData.tags = tags;
    }

    return contactData;
  }

  // Search for existing contact by email
  private async findContactByEmail(email: string): Promise<string | null> {
    if (!this.isEnabled || !email) return null;
    
    try {
      const response = await this.makeRequest(
        `/contacts/lookup?locationId=${this.locationId}&email=${encodeURIComponent(email)}`,
        "GET"
      );
      
      // API returns { contacts: [...] } or { contact: {...} }
      const contacts = response.contacts || (response.contact ? [response.contact] : []);
      if (contacts.length > 0) {
        console.log("[GHL DEBUG] Found existing contact by email:", contacts[0].id);
        return contacts[0].id;
      }
      return null;
    } catch (error) {
      // Contact not found is not an error - just means we need to create
      console.log("[GHL DEBUG] No existing contact found for email:", email);
      return null;
    }
  }

  // Get existing contact's tags by contact ID
  private async getContactTags(contactId: string): Promise<string[]> {
    if (!this.isEnabled || !contactId) return [];
    
    try {
      const response = await this.makeRequest(`/contacts/${contactId}`, "GET");
      const contact = response.contact || response;
      const existingTags = contact?.tags || [];
      console.log("[GHL DEBUG] Existing tags for contact:", contactId, existingTags);
      return existingTags;
    } catch (error) {
      console.error("[GHL DEBUG] Failed to fetch contact tags:", error);
      return [];
    }
  }

  // Merge new tags with existing tags (no duplicates)
  private mergeTags(existingTags: string[], newTags: string[]): string[] {
    const tagSet = new Set([...existingTags, ...newTags]);
    return Array.from(tagSet);
  }

  async createOrUpdateContact(application: LoanApplication): Promise<string> {
    if (!this.isEnabled) {
      console.log("GoHighLevel sync skipped: service not enabled");
      return "";
    }

    try {
      // Log incoming application data for debugging
      console.log("[GHL DEBUG] Application data received:", {
        id: application.id,
        email: application.email,
        businessName: application.businessName || application.legalBusinessName,
        requestedAmount: application.requestedAmount,
        monthlyRevenue: application.monthlyRevenue,
        timeInBusiness: application.timeInBusiness,
        creditScore: application.creditScore,
        isCompleted: application.isCompleted,
        isFullApplicationCompleted: application.isFullApplicationCompleted
      });

      // If we already have a contact ID, update it (do NOT include locationId)
      if (application.ghlContactId) {
        const updateData = this.buildContactData(application, false); // false = exclude locationId
        
        // Fetch existing tags and merge with new tags to preserve them
        const existingTags = await this.getContactTags(application.ghlContactId);
        if (updateData.tags && updateData.tags.length > 0) {
          updateData.tags = this.mergeTags(existingTags, updateData.tags);
          console.log("[GHL DEBUG] Merged tags:", updateData.tags);
        }
        
        console.log("[GHL DEBUG] Updating existing contact by stored ID:", application.ghlContactId);
        console.log("[GHL DEBUG] Custom fields count:", updateData.customFields?.length || 0);
        await this.makeRequest(`/contacts/${application.ghlContactId}`, "PUT", updateData);
        return application.ghlContactId;
      }

      // Search for existing contact by email first (handles duplicate prevention)
      const contactEmail = application.companyEmail || application.businessEmail || application.email;
      const existingContactId = await this.findContactByEmail(contactEmail || "");
      
      if (existingContactId) {
        // Update existing contact instead of creating duplicate
        const updateData = this.buildContactData(application, false);
        
        // Fetch existing tags and merge with new tags to preserve them
        const existingTags = await this.getContactTags(existingContactId);
        if (updateData.tags && updateData.tags.length > 0) {
          updateData.tags = this.mergeTags(existingTags, updateData.tags);
          console.log("[GHL DEBUG] Merged tags:", updateData.tags);
        }
        
        console.log("[GHL DEBUG] Updating existing contact found by email:", existingContactId);
        console.log("[GHL DEBUG] Custom fields count:", updateData.customFields?.length || 0);
        await this.makeRequest(`/contacts/${existingContactId}`, "PUT", updateData);
        return existingContactId;
      }

      // Create a new contact (DO include locationId)
      const createData = this.buildContactData(application, true); // true = include locationId
      console.log("[GHL DEBUG] Creating new contact with email:", createData.email);
      console.log("[GHL DEBUG] Custom fields count:", createData.customFields?.length || 0);
      console.log("[GHL DEBUG] Custom fields being sent:", JSON.stringify(createData.customFields, null, 2));
      
      try {
        const response = await this.makeRequest("/contacts", "POST", createData);
        return response.contact?.id || response.id;
      } catch (createError: any) {
        // Handle duplicate contact error (400 with "duplicated contacts" message)
        if (createError.message?.includes("400")) {
          console.log("[GHL DEBUG] Duplicate contact detected, searching by phone...");
          // Try searching by phone if email search didn't find it
          if (application.phone) {
            try {
              const phoneResponse = await this.makeRequest(
                `/contacts/lookup?locationId=${this.locationId}&phone=${encodeURIComponent(application.phone)}`,
                "GET"
              );
              const phoneContacts = phoneResponse.contacts || (phoneResponse.contact ? [phoneResponse.contact] : []);
              if (phoneContacts.length > 0) {
                const phoneContactId = phoneContacts[0].id;
                console.log("[GHL DEBUG] Found existing contact by phone:", phoneContactId);
                const updateData = this.buildContactData(application, false);
                
                // Fetch existing tags and merge with new tags to preserve them
                const existingTags = await this.getContactTags(phoneContactId);
                if (updateData.tags && updateData.tags.length > 0) {
                  updateData.tags = this.mergeTags(existingTags, updateData.tags);
                  console.log("[GHL DEBUG] Merged tags:", updateData.tags);
                }
                
                await this.makeRequest(`/contacts/${phoneContactId}`, "PUT", updateData);
                return phoneContactId;
              }
            } catch (phoneError) {
              console.error("[GHL DEBUG] Phone lookup failed:", phoneError);
            }
          }
        }
        throw createError;
      }
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
      
      // Fetch existing tags and merge with new tags to preserve them
      const existingTags = await this.getContactTags(contactId);
      if (updateData.tags && updateData.tags.length > 0) {
        updateData.tags = this.mergeTags(existingTags, updateData.tags);
        console.log("[GHL DEBUG] Merged tags:", updateData.tags);
      }
      
      console.log("[GHL DEBUG] Updating contact:", contactId);
      console.log("[GHL DEBUG] Update custom fields count:", updateData.customFields?.length || 0);
      await this.makeRequest(`/contacts/${contactId}`, "PUT", updateData);
    } catch (error) {
      console.error("Error updating GoHighLevel contact:", error);
      throw error;
    }
  }

  async sendWebhook(application: Partial<LoanApplication>): Promise<void> {
    // Application webhook URL - for full and partial application submissions
    const APPLICATION_WEBHOOK_URL = 'https://services.leadconnectorhq.com/hooks/n778xwOps9t8Q34eRPfM/webhook-trigger/MHfzGI1xWl0mUNKjLrJb';
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

    // Build CSZ values with fallback logic
    const businessCszValue = application.businessCsz || 
      (application.city && application.state && application.zipCode 
        ? `${application.city}, ${application.state} ${application.zipCode}` 
        : "");
    
    const ownerCszValue = application.ownerCsz ||
      (application.ownerCity && application.ownerState && application.ownerZip
        ? `${application.ownerCity}, ${application.ownerState} ${application.ownerZip}`
        : "");

    // Prepare webhook payload with ALL fields matching GHL_FIELD_KEYS
    const webhookPayload = {
      // ===== APPLICATION DETAILS FOLDER =====
      doing_business_as: application.doingBusinessAs || application.businessName,
      company_email: application.companyEmail || application.businessEmail || application.email,
      primary_business_bank: application.bankName,
      personal_credit_score_range: application.ficoScoreExact || application.personalCreditScoreRange || application.creditScore,
      ownership_percentage: application.ownership || application.ownerPercentage,
      outstanding_business_loans_or_cash_advances: application.hasOutstandingLoans !== undefined 
        ? (application.hasOutstandingLoans ? "Yes" : "No") 
        : undefined,
      business_street_address: application.businessStreetAddress || application.businessAddress,
      mca_balance_amount: application.mcaBalanceAmount,
      mca_balance_bank_name: application.mcaBalanceBankName,
      do_you_process_credit_cards: application.doYouProcessCreditCards,
      application_url: application.agentViewUrl,
      agent_name: application.agentName,
      agent_email: application.agentEmail,
      agent_ghl_id: application.agentGhlId,
      
      // ===== BUSINESS DETAILS FOLDER =====
      website: application.companyWebsite,
      monthly_revenue: application.monthlyRevenue,
      years_in_business: application.timeInBusiness || getYearsFromDate(application.businessStartDate || undefined),
      industry_dropdown: application.industry,
      annual_revenue: application.averageMonthlyRevenue,
      ein: application.ein,
      business_start_date: application.businessStartDate,
      business_type: application.businessType,
      
      // ===== SURVEY FOLDER =====
      amount_requested: application.requestedAmount,
      legal_business_name: application.legalBusinessName || application.businessName,
      preferred_email: application.businessEmail || application.companyEmail,
      loan_purpose: application.useOfFunds,
      time_in_business_years: application.timeInBusiness,
      monthly_revenue_approx: application.monthlyRevenue || application.averageMonthlyRevenue,
      
      // ===== OWNER INFO =====
      social_security_: application.socialSecurityNumber,
      date_of_birth: application.dateOfBirth,
      address1: application.ownerAddress1,
      
      // ===== ADDITIONAL =====
      funding_report_url: application.fundingReportUrl,
      funding_time_frame: application.fundingUrgency,
      state_of_incorporation: application.stateOfIncorporation,
      business_csz: businessCszValue,
      owner_csz: ownerCszValue,
      current_positions__balances: application.outstandingLoansAmount,
      
      // ===== UTM TRACKING =====
      utm_source: application.utmSource,
      utm_medium: application.utmMedium,
      utm_campaign: application.utmCampaign,
      utm_term: application.utmTerm,
      utm_content: application.utmContent,
      referrer_url: application.referrerUrl,
      
      // ===== LEGACY/COMPATIBILITY FIELDS =====
      full_name: application.fullName,
      email: application.email,
      phone: application.phone,
      company_name: application.legalBusinessName || application.businessName,
      company_website: application.companyWebsite,
      industry: application.industry,
      requested_loan_amount: application.requestedAmount,
      time_in_business: application.timeInBusiness,
      use_of_funds: application.useOfFunds,
      funding_urgency: application.fundingUrgency,
      referral_source: application.referralSource,
      address2: application.ownerAddress2,
      
      // ===== CALCULATED FIELDS =====
      first_name: firstName,
      last_name: lastName,
      submission_date: new Date().toISOString(),
      source: "Full Application Form",
      
      // ===== TAGS FOR GHL =====
      tags: ["application complete"],
    };

    // Send to both webhooks (non-blocking)
    const webhookRequests = [];
    
    try {
      if (APPLICATION_WEBHOOK_URL) {
        webhookRequests.push(
          fetch(APPLICATION_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(webhookPayload),
          }).catch(err => console.error('Application webhook error:', err))
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
      console.log('[GHL] Webhooks sent successfully with', Object.keys(webhookPayload).filter(k => webhookPayload[k as keyof typeof webhookPayload]).length, 'fields');
    } catch (error) {
      console.error('Error sending webhooks:', error);
      // Don't throw - webhooks are nice-to-have, not critical
    }
  }

  // Send partial application data to the application webhook (for incomplete applications)
  async sendPartialApplicationWebhook(application: Partial<LoanApplication>): Promise<void> {
    const APPLICATION_WEBHOOK_URL = 'https://services.leadconnectorhq.com/hooks/n778xwOps9t8Q34eRPfM/webhook-trigger/MHfzGI1xWl0mUNKjLrJb';
    
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

    // Build CSZ values with fallback logic
    const businessCszValue = application.businessCsz || 
      (application.city && application.state && application.zipCode 
        ? `${application.city}, ${application.state} ${application.zipCode}` 
        : "");
    
    const ownerCszValue = application.ownerCsz ||
      (application.ownerCity && application.ownerState && application.ownerZip
        ? `${application.ownerCity}, ${application.ownerState} ${application.ownerZip}`
        : "");

    // Build partial application webhook payload - same structure as full application but marked as partial
    const webhookPayload = {
      // ===== APPLICATION DETAILS FOLDER =====
      doing_business_as: application.doingBusinessAs || application.businessName,
      company_email: application.companyEmail || application.businessEmail || application.email,
      primary_business_bank: application.bankName,
      personal_credit_score_range: application.ficoScoreExact || application.personalCreditScoreRange || application.creditScore,
      ownership_percentage: application.ownership || application.ownerPercentage,
      outstanding_business_loans_or_cash_advances: application.hasOutstandingLoans !== undefined 
        ? (application.hasOutstandingLoans ? "Yes" : "No") 
        : undefined,
      business_street_address: application.businessStreetAddress || application.businessAddress,
      mca_balance_amount: application.mcaBalanceAmount,
      mca_balance_bank_name: application.mcaBalanceBankName,
      do_you_process_credit_cards: application.doYouProcessCreditCards,
      application_url: application.agentViewUrl,
      agent_name: application.agentName,
      agent_email: application.agentEmail,
      agent_ghl_id: application.agentGhlId,
      
      // ===== BUSINESS DETAILS FOLDER =====
      website: application.companyWebsite,
      monthly_revenue: application.monthlyRevenue,
      years_in_business: application.timeInBusiness || getYearsFromDate(application.businessStartDate || undefined),
      industry_dropdown: application.industry,
      annual_revenue: application.averageMonthlyRevenue,
      ein: application.ein,
      business_start_date: application.businessStartDate,
      business_type: application.businessType,
      
      // ===== SURVEY FOLDER =====
      amount_requested: application.requestedAmount,
      legal_business_name: application.legalBusinessName || application.businessName,
      preferred_email: application.businessEmail || application.companyEmail,
      loan_purpose: application.useOfFunds,
      time_in_business_years: application.timeInBusiness,
      monthly_revenue_approx: application.monthlyRevenue || application.averageMonthlyRevenue,
      
      // ===== OWNER INFO =====
      social_security_: application.socialSecurityNumber,
      date_of_birth: application.dateOfBirth,
      address1: application.ownerAddress1,
      
      // ===== ADDITIONAL =====
      funding_report_url: application.fundingReportUrl,
      funding_time_frame: application.fundingUrgency,
      state_of_incorporation: application.stateOfIncorporation,
      business_csz: businessCszValue,
      owner_csz: ownerCszValue,
      current_positions__balances: application.outstandingLoansAmount,
      
      // ===== UTM TRACKING =====
      utm_source: application.utmSource,
      utm_medium: application.utmMedium,
      utm_campaign: application.utmCampaign,
      utm_term: application.utmTerm,
      utm_content: application.utmContent,
      referrer_url: application.referrerUrl,
      
      // ===== LEGACY/COMPATIBILITY FIELDS =====
      full_name: application.fullName,
      email: application.email,
      phone: application.phone,
      company_name: application.legalBusinessName || application.businessName,
      company_website: application.companyWebsite,
      industry: application.industry,
      requested_loan_amount: application.requestedAmount,
      time_in_business: application.timeInBusiness,
      use_of_funds: application.useOfFunds,
      funding_urgency: application.fundingUrgency,
      referral_source: application.referralSource,
      address2: application.ownerAddress2,
      
      // ===== CALCULATED FIELDS =====
      first_name: firstName,
      last_name: lastName,
      submission_date: new Date().toISOString(),
      source: "Partial Application Form",
      is_complete: application.isComplete ? "Yes" : "No",
      current_step: application.currentStep,
      
      // ===== TAGS FOR GHL =====
      tags: ["App Started"],
    };

    try {
      console.log('[GHL] Sending partial application webhook to:', APPLICATION_WEBHOOK_URL);
      console.log('[GHL] Partial application webhook fields count:', Object.keys(webhookPayload).filter(k => webhookPayload[k as keyof typeof webhookPayload]).length);
      
      const response = await fetch(APPLICATION_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookPayload),
      });
      
      if (!response.ok) {
        console.error('[GHL] Partial application webhook failed:', response.status, await response.text());
      } else {
        console.log('[GHL] Partial application webhook sent successfully');
      }
    } catch (error) {
      console.error('[GHL] Partial application webhook error:', error);
      // Don't throw - webhooks are nice-to-have, not critical
    }
  }

  // Specific webhook for intake forms with simplified format
  async sendIntakeWebhook(application: Partial<LoanApplication>, pageUrl?: string): Promise<void> {
    const INTAKE_WEBHOOK_URL = 'https://services.leadconnectorhq.com/hooks/n778xwOps9t8Q34eRPfM/webhook-trigger/2a9dd48e-792a-4bdb-8688-fddaf3141ae4';
    
    // Parse name for first/last
    const nameParts = (application.fullName || '').trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    // Build intake webhook payload - pass data as-is without sanitizing to prevent data loss
    const webhookPayload = {
      first_name: firstName,
      last_name: lastName,
      email: application.email,
      phone: application.phone,
      company_name: application.legalBusinessName || application.businessName,
      requested_loan_amount: application.requestedAmount,
      years_in_business: application.timeInBusiness,
      monthly_revenue: application.monthlyRevenue,
      personal_credit_score_range: application.personalCreditScoreRange || application.creditScore,
      doing_business_as: application.doingBusinessAs || application.businessName,
      company_email: application.companyEmail || application.businessEmail || application.email,
      use_of_funds: application.useOfFunds || null,
      submission_date: new Date().toISOString(),
      source: "Website Lead Form",
      page_url: pageUrl || "https://www.todaycapitalgroup.com/intake/quiz",
      utm_source: application.utmSource || null,
      utm_medium: application.utmMedium || null,
      utm_campaign: application.utmCampaign || null,
      utm_term: application.utmTerm || null,
      utm_content: application.utmContent || null,
      referrer_url: application.referrerUrl || null,
      
      // ===== TAGS FOR GHL =====
      tags: ["lead-source-website", "interest form"],
    };

    try {
      console.log('[GHL] Sending intake webhook to:', INTAKE_WEBHOOK_URL);
      console.log('[GHL] Intake webhook payload:', JSON.stringify(webhookPayload, null, 2));
      
      const response = await fetch(INTAKE_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookPayload),
      });
      
      if (!response.ok) {
        console.error('[GHL] Intake webhook failed:', response.status, await response.text());
      } else {
        console.log('[GHL] Intake webhook sent successfully');
      }
    } catch (error) {
      console.error('[GHL] Intake webhook error:', error);
      // Don't throw - webhooks are nice-to-have, not critical
    }
  }
}

export const ghlService = new GoHighLevelService();
