import type { LoanApplication } from "@shared/schema";

const GHL_API_KEY = process.env.GHL_API_KEY;
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;
const GHL_API_BASE = "https://rest.gohighlevel.com/v1";

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
  customField?: Record<string, any>;
  tags?: string[];
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
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`GHL API Error: ${response.status} - ${errorText}`);
      throw new Error(`GHL API request failed: ${response.status}`);
    }

    return response.json();
  }

  private buildContactData(application: Partial<LoanApplication>): Partial<GHLContact> {
    const contactData: Partial<GHLContact> = {
      locationId: this.locationId!,
    };

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
    if (application.businessName) {
      contactData.companyName = application.businessName;
    }

    if (application.industry) {
      contactData.industry = application.industry;
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

    // Custom fields - mapped to GHL custom field keys
    const customField: Record<string, any> = {};

    // Business details custom fields
    if (application.ein) {
      customField.ein = application.ein;
    }

    if (application.timeInBusiness) {
      customField.time_in_business_years = application.timeInBusiness;
    }

    if (application.businessType) {
      customField.business_type = application.businessType;
    }

    if (application.ownership) {
      customField.ownership_percentage = application.ownership;
    }

    // Financial information custom fields
    if (application.monthlyRevenue !== undefined && application.monthlyRevenue !== null) {
      customField.monthly_revenue_usd = application.monthlyRevenue.toString();
    }

    if (application.averageMonthlyRevenue !== undefined && application.averageMonthlyRevenue !== null) {
      customField.monthly_revenue_approx = application.averageMonthlyRevenue.toString();
    }

    if (application.creditScore) {
      customField.personal_credit_score = application.creditScore;
    }

    if (application.hasOutstandingLoans !== undefined) {
      customField.has_outstanding_loans = application.hasOutstandingLoans ? "Yes" : "No";
    }

    if (application.outstandingLoansAmount !== undefined && application.outstandingLoansAmount !== null) {
      customField.outstanding_loans_amount = application.outstandingLoansAmount.toString();
    }

    // Funding request custom fields
    if (application.requestedAmount !== undefined && application.requestedAmount !== null) {
      customField.amount_requested = application.requestedAmount.toString();
    }

    if (application.useOfFunds) {
      customField.purpose_of_funds = application.useOfFunds;
    }

    // Application tracking custom fields
    if (application.currentStep) {
      customField.application_current_step = application.currentStep.toString();
    }

    if (application.isCompleted !== undefined) {
      customField.application_status = application.isCompleted ? "Completed" : "In Progress";
    }

    if (Object.keys(customField).length > 0) {
      contactData.customField = customField;
    }

    // Tags
    const tags = ["MCA Application"];
    if (application.isCompleted) {
      tags.push("Application Complete");
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

      // If we already have a contact ID, update it
      if (application.ghlContactId) {
        await this.makeRequest(`/contacts/${application.ghlContactId}`, "PUT", contactData);
        return application.ghlContactId;
      }

      // Otherwise, create a new contact
      const response = await this.makeRequest("/contacts", "POST", contactData);
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
      const updateData = this.buildContactData(application);
      await this.makeRequest(`/contacts/${contactId}`, "PUT", updateData);
    } catch (error) {
      console.error("Error updating GoHighLevel contact:", error);
      throw error;
    }
  }
}

export const ghlService = new GoHighLevelService();
