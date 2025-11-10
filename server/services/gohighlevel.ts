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
  customFields?: Record<string, string>;
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

  async createOrUpdateContact(application: LoanApplication): Promise<string> {
    if (!this.isEnabled) {
      console.log("GoHighLevel sync skipped: service not enabled");
      return "";
    }

    try {
      // Split full name into first and last name
      const nameParts = (application.fullName || "").trim().split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      const contactData: GHLContact = {
        locationId: this.locationId!,
        firstName,
        lastName,
        email: application.email,
        phone: application.phone || undefined,
        customFields: {
          business_name: application.businessName || "",
          business_type: application.businessType || "",
          industry: application.industry || "",
          ein: application.ein || "",
          time_in_business: application.timeInBusiness || "",
          ownership: application.ownership || "",
          monthly_revenue: application.monthlyRevenue?.toString() || "",
          average_monthly_revenue: application.averageMonthlyRevenue?.toString() || "",
          credit_score: application.creditScore || "",
          requested_amount: application.requestedAmount?.toString() || "",
          use_of_funds: application.useOfFunds || "",
          has_outstanding_loans: application.hasOutstandingLoans ? "Yes" : "No",
          outstanding_loans_amount: application.outstandingLoansAmount?.toString() || "",
          bank_name: application.bankName || "",
          business_address: application.businessAddress || "",
          city: application.city || "",
          state: application.state || "",
          zip_code: application.zipCode || "",
          application_status: application.isCompleted ? "Completed" : "In Progress",
          current_step: application.currentStep?.toString() || "1",
        },
        tags: ["MCA Application", application.isCompleted ? "Application Complete" : "Application In Progress"],
      };

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
      const nameParts = (application.fullName || "").trim().split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      const updateData: Partial<GHLContact> = {
        locationId: this.locationId!,
      };

      if (application.fullName) {
        updateData.firstName = firstName;
        updateData.lastName = lastName;
      }

      if (application.email) {
        updateData.email = application.email;
      }

      if (application.phone) {
        updateData.phone = application.phone;
      }

      // Build custom fields from application data
      const customFields: Record<string, string> = {};
      
      if (application.businessName) customFields.business_name = application.businessName;
      if (application.businessType) customFields.business_type = application.businessType;
      if (application.industry) customFields.industry = application.industry;
      if (application.ein) customFields.ein = application.ein;
      if (application.timeInBusiness) customFields.time_in_business = application.timeInBusiness;
      if (application.ownership) customFields.ownership = application.ownership;
      if (application.monthlyRevenue) customFields.monthly_revenue = application.monthlyRevenue.toString();
      if (application.averageMonthlyRevenue) customFields.average_monthly_revenue = application.averageMonthlyRevenue.toString();
      if (application.creditScore) customFields.credit_score = application.creditScore;
      if (application.requestedAmount) customFields.requested_amount = application.requestedAmount.toString();
      if (application.useOfFunds) customFields.use_of_funds = application.useOfFunds;
      if (application.hasOutstandingLoans !== undefined) customFields.has_outstanding_loans = application.hasOutstandingLoans ? "Yes" : "No";
      if (application.outstandingLoansAmount) customFields.outstanding_loans_amount = application.outstandingLoansAmount.toString();
      if (application.bankName) customFields.bank_name = application.bankName;
      if (application.businessAddress) customFields.business_address = application.businessAddress;
      if (application.city) customFields.city = application.city;
      if (application.state) customFields.state = application.state;
      if (application.zipCode) customFields.zip_code = application.zipCode;
      if (application.isCompleted !== undefined) customFields.application_status = application.isCompleted ? "Completed" : "In Progress";
      if (application.currentStep) customFields.current_step = application.currentStep.toString();

      if (Object.keys(customFields).length > 0) {
        updateData.customFields = customFields;
      }

      await this.makeRequest(`/contacts/${contactId}`, "PUT", updateData);
    } catch (error) {
      console.error("Error updating GoHighLevel contact:", error);
      throw error;
    }
  }
}

export const ghlService = new GoHighLevelService();
