import type { LoanApplication } from "@shared/schema";

const GHL_API_KEY = process.env.GHL_API_KEY;
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;
const GHL_API_BASE = "https://services.leadconnectorhq.com";

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
  customField?: Record<string, any>; // For v1 API compatibility
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

    // Note: Custom fields are NOT included in initial sync
    // To use custom fields, you need to:
    // 1. Create custom fields in your GHL account
    // 2. Get the custom field IDs
    // 3. Map them using the customFields array format (not supported yet)
    // 
    // Standard fields above (companyName, industry, address, etc.) will sync automatically

    // Source tracking
    contactData.source = "MCA Application Form";

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
}

export const ghlService = new GoHighLevelService();
