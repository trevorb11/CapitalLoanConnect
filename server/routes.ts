import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import path from "path";
import fs from "fs";
import { randomUUID, scryptSync, randomBytes, timingSafeEqual } from "crypto";
import multer from "multer";
import PDFDocument from "pdfkit";
import archiver from "archiver";
import { storage } from "./storage";
import { ghlService } from "./services/gohighlevel";
import { plaidService } from "./services/plaid";
import { repConsoleService } from "./services/repConsole";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { analyzeBankStatements, isOpenAIConfigured, parseApprovalEmail, parseContactSearchQuery, parseRepConsoleCommand } from "./services/openai";
import { gmailService, type EmailMessage } from "./services/gmail";
import { googleSheetsService, type ApprovalRow } from "./services/googleSheets";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdfParseModule = require("pdf-parse");
const PDFParse = pdfParseModule.PDFParse;
import { AGENTS } from "../shared/agents";
import { z } from "zod";
import type { LoanApplication } from "@shared/schema";

// Initialize Object Storage service for persistent file storage
const objectStorage = new ObjectStorageService();

// Log Object Storage status on startup
if (objectStorage.isConfigured()) {
  console.log("[OBJECT STORAGE] ✓ Configured and ready for bank statement uploads");
} else {
  console.warn("[OBJECT STORAGE] ⚠ NOT CONFIGURED - Files will be saved to local disk (ephemeral - will be lost on restart!)");
}

// Configure multer for bank statement uploads
const UPLOAD_DIR = path.join(process.cwd(), "server/uploads/bank-statements");
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

// Ensure upload directory exists (fallback for when Object Storage is not configured)
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Use memory storage to handle files in memory, then upload to Object Storage or disk
const bankStatementUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  },
});

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Tcg1!tcg";
const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY;

const loginSchema = z.object({
  credential: z.string().min(1, "Credential is required"),
});

async function verifyRecaptcha(token: string): Promise<{ success: boolean; score?: number; error?: string }> {
  // Fail closed: if secret key is not configured, reject submission
  if (!RECAPTCHA_SECRET_KEY) {
    console.error("[RECAPTCHA] Secret key not configured - rejecting submission for security");
    return { success: false, error: "reCAPTCHA configuration error" };
  }

  try {
    const response = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret: RECAPTCHA_SECRET_KEY,
        response: token,
      }),
    });

    const data = await response.json();
    console.log("[RECAPTCHA] Verification response:", data);

    if (data.success) {
      const score = data.score || 0;
      if (score >= 0.5) {
        return { success: true, score };
      } else {
        return { success: false, score, error: "Low reCAPTCHA score - possible bot" };
      }
    } else {
      return { success: false, error: data["error-codes"]?.join(", ") || "Verification failed" };
    }
  } catch (error) {
    // Fail closed: if verification fails due to network/API issues, reject submission
    console.error("[RECAPTCHA] Verification error - rejecting submission for security:", error);
    return { success: false, error: "reCAPTCHA verification service unavailable" };
  }
}

// Validation schema for Plaid token exchange
const plaidExchangeSchema = z.object({
  publicToken: z.string().min(1, "Public token is required"),
  metadata: z.object({
    institution: z.object({
      name: z.string().optional(),
      institution_id: z.string().optional()
    }).optional()
  }).optional(),
  businessName: z.string().min(1, "Business name is required"),
  email: z.string().email("Valid email is required"),
  useAIAnalysis: z.boolean().optional().default(true)
});

// Helper function to generate funding report URL from application data
function generateFundingReportUrl(application: Partial<LoanApplication>): string {
  const params = new URLSearchParams();

  // Map application data to report URL parameters
  if (application.fullName) params.set('name', application.fullName);
  if (application.businessName) params.set('businessName', application.businessName);
  if (application.industry) params.set('industry', application.industry);

  // Convert time in business to months for the report
  if (application.timeInBusiness) {
    const timeMapping: Record<string, string> = {
      'Less than 3 months': '2',
      '3-5 months': '4',
      '6-12 months': '9',
      '1-2 years': '18',
      '2-5 years': '42',
      'More than 5 years': '72',
    };
    params.set('timeInBusiness', timeMapping[application.timeInBusiness] || '12');
  }

  // Monthly revenue (already numeric in database)
  if (application.monthlyRevenue) {
    params.set('monthlyRevenue', application.monthlyRevenue.toString());
  } else if (application.averageMonthlyRevenue) {
    params.set('monthlyRevenue', application.averageMonthlyRevenue.toString());
  }

  // Credit score - extract middle value from range if needed
  if (application.personalCreditScoreRange || application.creditScore) {
    const creditRange = application.personalCreditScoreRange || application.creditScore || '';
    const creditMapping: Record<string, string> = {
      '500 and below': '480',
      '500-549': '525',
      '550-599': '575',
      '600-649': '625',
      '650-719': '685',
      '720 or above': '750',
      'Not sure': '650',
    };
    params.set('creditScore', creditMapping[creditRange] || '650');
  }

  // Requested loan amount
  if (application.requestedAmount) {
    params.set('loanAmount', application.requestedAmount.toString());
  }

  return `/report?${params.toString()}`;
}

// Helper function to sanitize application data for database storage
function sanitizeApplicationData(data: any): { sanitized: any; recaptchaToken?: string; faxNumber?: string } {
  const { recaptchaToken, faxNumber, ...rest } = data;
  const sanitized = { ...rest };
  
  console.log('[SANITIZE] Input data:', JSON.stringify(rest, null, 2));
  console.log('[SANITIZE] timeInBusiness raw:', sanitized.timeInBusiness);
  console.log('[SANITIZE] monthlyRevenue raw:', sanitized.monthlyRevenue);
  
  // Convert string numeric fields to proper numbers or null
  const numericFields = [
    'monthlyRevenue',
    'averageMonthlyRevenue',
    'requestedAmount',
    'outstandingLoansAmount',
    'mcaBalanceAmount' // Add new field
  ];
  
  numericFields.forEach(field => {
    console.log(`[SANITIZE] Processing ${field}:`, sanitized[field], `(type: ${typeof sanitized[field]})`);
    
    if (sanitized[field] === '' || sanitized[field] === undefined || sanitized[field] === null) {
      sanitized[field] = null;
      console.log(`[SANITIZE] ${field} → NULL (empty/undefined)`);
    } else if (typeof sanitized[field] === 'string') {
      // Strip non-digit characters EXCEPT decimal point (like $ and ,) before parsing
      const cleanedValue = sanitized[field].replace(/[^0-9.]/g, '');
      const num = parseFloat(cleanedValue);
      sanitized[field] = (cleanedValue && !isNaN(num)) ? num : null;
      console.log(`[SANITIZE] ${field}: "${sanitized[field]}" → cleaned: "${cleanedValue}" → num: ${num} → final: ${sanitized[field]}`);
    }
  });
  
  // Handle currentStep specifically as an integer
  if (sanitized.currentStep !== undefined) {
    if (sanitized.currentStep === '' || sanitized.currentStep === null) {
      sanitized.currentStep = null;
    } else if (typeof sanitized.currentStep === 'string') {
      const num = parseInt(sanitized.currentStep, 10);
      sanitized.currentStep = isNaN(num) ? null : num;
    }
  }
  
  return { sanitized, recaptchaToken, faxNumber };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // ========================================
  // HEALTH CHECK ENDPOINT (for deployment)
  // ========================================
  app.get("/api/health", (_req, res) => {
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // ========================================
  // AUTHENTICATION ROUTES
  // ========================================
  
  // Login endpoint
  app.post("/api/auth/login", async (req, res) => {
    try {
      const validationResult = loginSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ error: "Credential is required" });
      }
      
      // Trim whitespace from credential (handles copy/paste issues)
      const credential = validationResult.data.credential.trim();
      
      // Check admin password
      if (credential === ADMIN_PASSWORD) {
        req.session.user = {
          isAuthenticated: true,
          role: 'admin',
        };
        return res.json({ 
          success: true, 
          role: 'admin',
          message: 'Logged in as admin'
        });
      }
      
      // Check agent password (format: Tcg[initials], e.g., "Tcgdl" for Dillon LeBlanc)
      const agentPasswordMatch = credential.toLowerCase().match(/^tcg([a-z]{2})$/);
      if (agentPasswordMatch) {
        const initials = agentPasswordMatch[1];
        const agent = AGENTS.find(
          (a) => a.initials.toLowerCase() === initials
        );
        
        if (agent) {
          req.session.user = {
            isAuthenticated: true,
            role: 'agent',
            agentEmail: agent.email,
            agentName: agent.name,
          };
          return res.json({ 
            success: true, 
            role: 'agent',
            agentName: agent.name,
            agentEmail: agent.email,
            message: `Logged in as ${agent.name}`
          });
        }
      }
      
      // Legacy: Also check agent email for backwards compatibility
      const agent = AGENTS.find(
        (a) => a.email.toLowerCase() === credential.toLowerCase()
      );
      
      if (agent) {
        req.session.user = {
          isAuthenticated: true,
          role: 'agent',
          agentEmail: agent.email,
          agentName: agent.name,
        };
        return res.json({ 
          success: true, 
          role: 'agent',
          agentName: agent.name,
          agentEmail: agent.email,
          message: `Logged in as ${agent.name}`
        });
      }
      
      return res.status(401).json({ error: "Invalid credentials" });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });
  
  // Logout endpoint
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.json({ success: true, message: "Logged out" });
    });
  });
  
  // Check auth status
  app.get("/api/auth/check", (req, res) => {
    if (req.session.user?.isAuthenticated) {
      const response: any = {
        isAuthenticated: true,
        role: req.session.user.role,
      };

      // Include role-specific fields
      if (req.session.user.role === 'agent') {
        response.agentEmail = req.session.user.agentEmail;
        response.agentName = req.session.user.agentName;
      } else if (req.session.user.role === 'partner') {
        response.partnerId = req.session.user.partnerId;
        response.partnerEmail = req.session.user.partnerEmail;
        response.partnerName = req.session.user.partnerName;
        response.companyName = req.session.user.companyName;
      }

      return res.json(response);
    }
    res.json({ isAuthenticated: false });
  });

  // Lookup application progress by email or phone
  app.post("/api/applications/progress", async (req, res) => {
    try {
      const { emailOrPhone } = req.body;
      
      if (!emailOrPhone || typeof emailOrPhone !== 'string' || emailOrPhone.trim().length < 3) {
        return res.status(400).json({ error: "Please provide a valid email address or phone number" });
      }
      
      const input = emailOrPhone.trim();
      
      // Find the most recent application by email or phone
      const application = await storage.getLoanApplicationByEmailOrPhone(input);
      
      if (!application) {
        return res.status(404).json({ error: "No application found with that email or phone number" });
      }
      
      // Get bank statement uploads for this email
      const bankStatements = await storage.getBankStatementUploadsByEmail(application.email);
      
      // Get Plaid connection status
      let hasPlaidConnection = false;
      if (application.plaidItemId) {
        const plaidItem = await storage.getPlaidItemById(application.plaidItemId);
        hasPlaidConnection = !!plaidItem;
      }
      
      // Determine progress status
      const progress = {
        intakeCompleted: application.isCompleted || false,
        applicationCompleted: application.isFullApplicationCompleted || false,
        bankStatementsUploaded: bankStatements.length > 0 || hasPlaidConnection,
        bankStatementCount: bankStatements.length,
        hasPlaidConnection,
        applicationId: application.id,
        businessName: application.businessName || application.legalBusinessName || '',
        email: application.email,
      };
      
      res.json(progress);
    } catch (error) {
      console.error("Error looking up application progress:", error);
      res.status(500).json({ error: "Failed to lookup progress" });
    }
  });

  // Get loan application by ID (for intake/application forms - no auth required for own app)
  app.get("/api/applications/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const application = await storage.getLoanApplication(id);
      
      if (!application) {
        return res.status(404).json({ error: "Application not found" });
      }
      
      res.json(application);
    } catch (error) {
      console.error("Error fetching application:", error);
      res.status(500).json({ error: "Failed to fetch application" });
    }
  });

  // Create new loan application
  app.post("/api/applications", async (req, res) => {
    try {
      const { sanitized: applicationData, recaptchaToken, faxNumber } = sanitizeApplicationData(req.body);

      // Honeypot detection - if faxNumber is filled, it's likely a bot
      if (faxNumber && faxNumber.trim() !== "") {
        console.warn("[HONEYPOT] Bot detected! Fax field was filled with:", faxNumber);

        // Log the bot attempt
        try {
          await storage.createBotAttempt({
            email: applicationData.email || null,
            ipAddress: req.ip || req.headers['x-forwarded-for']?.toString() || null,
            userAgent: req.headers['user-agent'] || null,
            honeypotValue: faxNumber,
            formType: 'application',
            additionalData: { businessName: applicationData.businessName, phone: applicationData.phone }
          });
        } catch (botLogError) {
          console.error("[HONEYPOT] Failed to log bot attempt:", botLogError);
        }

        // Return a fake success response to not alert the bot
        return res.json({
          id: "bot-detected-" + Date.now(),
          email: applicationData.email,
          isBotAttempt: true
        });
      }

      // Verify reCAPTCHA if token provided (for final submissions)
      if (recaptchaToken) {
        const recaptchaResult = await verifyRecaptcha(recaptchaToken);
        if (!recaptchaResult.success) {
          console.error("[RECAPTCHA] Verification failed:", recaptchaResult.error);
          return res.status(400).json({ error: "Security verification failed. Please try again." });
        }
        console.log("[RECAPTCHA] Verified successfully, score:", recaptchaResult.score);
      }

      // Validate required email field
      if (!applicationData.email) {
        return res.status(400).json({ error: "Email is required" });
      }

      // Check if user already has an incomplete application
      const existingApp = await storage.getLoanApplicationByEmail(applicationData.email);
      if (existingApp && !existingApp.isCompleted) {
        // Always ensure agent view URL exists for all applications
        if (!existingApp.agentViewUrl) {
          applicationData.agentViewUrl = `/agent/application/${existingApp.id}`;
        }

        // Generate funding report URL if intake is being completed
        if (applicationData.isCompleted && !existingApp.fundingReportUrl) {
          const mergedData = { ...existingApp, ...applicationData };
          applicationData.fundingReportUrl = generateFundingReportUrl(mergedData);
          console.log('[FUNDING REPORT] Generated URL for existing app:', applicationData.fundingReportUrl);
        }

        // Update existing application with new data instead of just returning old data
        const updatedApp = await storage.updateLoanApplication(existingApp.id, applicationData);
        
        // Sync to GoHighLevel and send webhooks
        try {
          if (updatedApp && updatedApp.ghlContactId) {
            await ghlService.updateContact(updatedApp.ghlContactId, applicationData);
            // Only send intake webhook when explicitly completed
            if (applicationData.isCompleted) {
              await ghlService.sendIntakeWebhook(updatedApp).catch(err => 
                console.error("Intake webhook error (non-blocking):", err)
              );
            }
            // Note: Partial webhook is NOT sent on every update to avoid excessive triggers
          } else if (updatedApp) {
            const ghlContactId = await ghlService.createOrUpdateContact(updatedApp);
            const finalApp = await storage.updateLoanApplication(existingApp.id, { ghlContactId });
            // Only send intake webhook when explicitly completed
            if (applicationData.isCompleted) {
              await ghlService.sendIntakeWebhook(finalApp || updatedApp).catch(err => 
                console.error("Intake webhook error (non-blocking):", err)
              );
            }
            // Note: Partial webhook is NOT sent on every update to avoid excessive triggers
            return res.json(finalApp || updatedApp);
          }
        } catch (ghlError) {
          console.error("GHL sync error:", ghlError);
          // Still send intake webhook if completed even if GHL sync failed
          if (applicationData.isCompleted && updatedApp) {
            ghlService.sendIntakeWebhook(updatedApp).catch(err => 
              console.error("Intake webhook error (non-blocking):", err)
            );
          }
        }
        
        return res.json(updatedApp || existingApp);
      }

      // Create new application
      const application = await storage.createLoanApplication(applicationData);

      // Always generate agent view URL for all applications (allows viewing incomplete apps too)
      const agentViewUrl = `/agent/application/${application.id}`;

      // Generate funding report URL if intake is being completed
      let fundingReportUrl: string | undefined;
      if (applicationData.isCompleted) {
        fundingReportUrl = generateFundingReportUrl(application);
        console.log('[FUNDING REPORT] Generated URL for new app:', fundingReportUrl);
      }

      // Sync to GoHighLevel
      try {
        const ghlContactId = await ghlService.createOrUpdateContact(application);
        const updatedApp = await storage.updateLoanApplication(application.id, {
          ghlContactId,
          agentViewUrl,
          ...(fundingReportUrl && { fundingReportUrl }),
        });
        
        // Only send intake webhook when explicitly completed
        if (applicationData.isCompleted) {
          try {
            await ghlService.sendIntakeWebhook(updatedApp || application);
          } catch (webhookError) {
            console.error("Intake webhook error (non-blocking):", webhookError);
          }
        }
        // Note: Partial webhook is NOT sent on every creation to avoid excessive triggers
        
        res.json(updatedApp || application);
      } catch (ghlError) {
        console.error("GHL sync error, but application saved:", ghlError);
        // Still update the agentViewUrl and fundingReportUrl even if GHL sync fails
        const updatedApp = await storage.updateLoanApplication(application.id, {
          agentViewUrl,
          ...(fundingReportUrl && { fundingReportUrl }),
        });
        
        // Only send intake webhook when explicitly completed (even if GHL sync failed)
        if (applicationData.isCompleted) {
          try {
            await ghlService.sendIntakeWebhook(updatedApp || application);
          } catch (webhookError) {
            console.error("Intake webhook error (non-blocking):", webhookError);
          }
        }
        // Note: Partial webhook is NOT sent on every creation to avoid excessive triggers
        
        res.json(updatedApp || application);
      }
    } catch (error) {
      console.error("Error creating application:", error);
      res.status(500).json({ error: "Failed to create application" });
    }
  });

  // Update loan application
  app.patch("/api/applications/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { sanitized: updates, recaptchaToken } = sanitizeApplicationData(req.body);

      // Authorization check for dashboard edits (when user is authenticated)
      // Agents can only edit their own applications, admins can edit any
      if (req.session.user?.isAuthenticated) {
        if (req.session.user.role === 'agent' && req.session.user.agentEmail) {
          const existingApp = await storage.getLoanApplication(id);
          if (existingApp && existingApp.agentEmail &&
              existingApp.agentEmail.toLowerCase() !== req.session.user.agentEmail.toLowerCase()) {
            return res.status(403).json({ error: "You can only edit applications assigned to you" });
          }
        }
      }

      // Verify reCAPTCHA if token provided (for final submissions)
      if (recaptchaToken) {
        const recaptchaResult = await verifyRecaptcha(recaptchaToken);
        if (!recaptchaResult.success) {
          console.error("[RECAPTCHA] Verification failed:", recaptchaResult.error);
          return res.status(400).json({ error: "Security verification failed. Please try again." });
        }
        console.log("[RECAPTCHA] Verified successfully, score:", recaptchaResult.score);
      }

      // Server-side validation for full application completion
      // Reject submissions with missing required fields when marking as complete
      if (updates.isFullApplicationCompleted) {
        // Get existing application to merge with updates for validation
        const existingApp = await storage.getLoanApplication(id);
        const mergedData = { ...existingApp, ...updates };
        
        // Define required fields for full application completion
        const requiredFields: { field: string; label: string }[] = [
          { field: 'fullName', label: 'Full Name' },
          { field: 'email', label: 'Email' },
          { field: 'phone', label: 'Phone' },
          { field: 'dateOfBirth', label: 'Date of Birth' },
          { field: 'socialSecurityNumber', label: 'Social Security Number' },
          { field: 'legalBusinessName', label: 'Legal Business Name' },
          { field: 'ein', label: 'EIN' },
          { field: 'businessStartDate', label: 'Business Start Date' },
          { field: 'stateOfIncorporation', label: 'State of Incorporation' },
          { field: 'ownership', label: 'Ownership Percentage' },
        ];
        
        // Check for business address (could be in businessStreetAddress or businessAddress)
        const hasBusinessAddress = mergedData.businessStreetAddress || mergedData.businessAddress;
        const hasBusinessCity = mergedData.city;
        const hasBusinessState = mergedData.state;
        const hasBusinessZip = mergedData.zipCode;
        
        // Check for owner address
        const hasOwnerAddress = mergedData.ownerAddress1;
        const hasOwnerCity = mergedData.ownerCity;
        const hasOwnerState = mergedData.ownerState;
        const hasOwnerZip = mergedData.ownerZip;
        
        const missingFields: string[] = [];
        
        // Check required text fields
        for (const { field, label } of requiredFields) {
          const value = (mergedData as any)[field];
          if (!value || value.toString().trim() === '') {
            missingFields.push(label);
          }
        }
        
        // Check SSN format (should be XXX-XX-XXXX with 9 digits)
        if (mergedData.socialSecurityNumber) {
          const ssnDigits = mergedData.socialSecurityNumber.replace(/\D/g, '');
          if (ssnDigits.length !== 9) {
            missingFields.push('Valid SSN (9 digits required)');
          }
        }
        
        // Check business address completeness
        if (!hasBusinessAddress) missingFields.push('Business Street Address');
        if (!hasBusinessCity) missingFields.push('Business City');
        if (!hasBusinessState) missingFields.push('Business State');
        if (!hasBusinessZip) missingFields.push('Business Zip Code');
        
        // Check owner address completeness
        if (!hasOwnerAddress) missingFields.push('Owner Street Address');
        if (!hasOwnerCity) missingFields.push('Owner City');
        if (!hasOwnerState) missingFields.push('Owner State');
        if (!hasOwnerZip) missingFields.push('Owner Zip Code');
        
        if (missingFields.length > 0) {
          console.log(`[VALIDATION] Full application rejected - missing fields: ${missingFields.join(', ')}`);
          return res.status(400).json({ 
            error: "Application incomplete. Please fill out all required fields.",
            missingFields 
          });
        }
        
        console.log('[VALIDATION] Full application passed server-side validation');
      }

      // Always ensure agent view URL exists for all applications
      if (!updates.agentViewUrl) {
        updates.agentViewUrl = `/agent/application/${id}`;
      }

      const updatedApp = await storage.updateLoanApplication(id, updates);
      
      if (!updatedApp) {
        return res.status(404).json({ error: "Application not found" });
      }

      // Sync to GoHighLevel
      try {
        if (updatedApp.ghlContactId) {
          await ghlService.updateContact(updatedApp.ghlContactId, updatedApp);
        } else {
          const ghlContactId = await ghlService.createOrUpdateContact(updatedApp);
          const finalApp = await storage.updateLoanApplication(id, { ghlContactId });
          
          // Only send webhook when full application is explicitly completed (not on every auto-save)
          if (updatedApp.isFullApplicationCompleted) {
            ghlService.sendWebhook(finalApp || updatedApp).catch(err => 
              console.error("Webhook error (non-blocking):", err)
            );
          }
          // Note: Partial/abandoned webhook is NOT sent on auto-save to avoid excessive triggers
          
          return res.json(finalApp || updatedApp);
        }
        
        // Only send webhook when full application is explicitly completed (not on every auto-save)
        if (updatedApp.isFullApplicationCompleted) {
          ghlService.sendWebhook(updatedApp).catch(err => 
            console.error("Webhook error (non-blocking):", err)
          );
        }
        // Note: Partial/abandoned webhook is NOT sent on auto-save to avoid excessive triggers
      } catch (ghlError) {
        console.error("GHL sync error, but application updated:", ghlError);
      }

      res.json(updatedApp);
    } catch (error) {
      console.error("Error updating application:", error);
      res.status(500).json({ error: "Failed to update application" });
    }
  });

  // Mark application as abandoned (called when user leaves page without completing)
  app.post("/api/applications/:id/abandon", async (req, res) => {
    try {
      const { id } = req.params;
      
      // Get the application
      const application = await storage.getLoanApplication(id);
      
      if (!application) {
        return res.status(404).json({ error: "Application not found" });
      }
      
      // Only send abandoned webhook if application was NOT completed
      if (!application.isFullApplicationCompleted && !application.isCompleted) {
        console.log(`[ABANDON] Sending abandoned webhook for application ${id}`);
        
        // Send the partial application webhook with "App Started" tag
        ghlService.sendPartialApplicationWebhook(application).catch(err => 
          console.error("Abandoned application webhook error (non-blocking):", err)
        );
        
        return res.json({ success: true, message: "Abandoned webhook sent" });
      }
      
      // Application was already completed, no need to send abandoned webhook
      return res.json({ success: true, message: "Application already completed, no abandoned webhook needed" });
    } catch (error) {
      console.error("Error marking application as abandoned:", error);
      res.status(500).json({ error: "Failed to process abandonment" });
    }
  });

  // Get funding report URL by email (for /see-report page)
  app.post("/api/applications/funding-report", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      // Find application by email
      const application = await storage.getLoanApplicationByEmail(email);

      if (!application) {
        return res.status(404).json({ error: "No application found for this email" });
      }

      if (!application.fundingReportUrl) {
        // Generate the URL if it doesn't exist yet (for older applications)
        const fundingReportUrl = generateFundingReportUrl(application);
        await storage.updateLoanApplication(application.id, { fundingReportUrl });
        return res.json({
          fundingReportUrl,
          name: application.fullName,
          businessName: application.businessName,
        });
      }

      return res.json({
        fundingReportUrl: application.fundingReportUrl,
        name: application.fullName,
        businessName: application.businessName,
      });
    } catch (error) {
      console.error("Error fetching funding report:", error);
      res.status(500).json({ error: "Failed to fetch funding report" });
    }
  });

  // Get all applications (requires authentication)
  app.get("/api/applications", async (req, res) => {
    try {
      // Check authentication
      if (!req.session.user?.isAuthenticated) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const allApplications = await storage.getAllLoanApplications();
      console.log(`[DASHBOARD] Total applications in DB: ${allApplications.length}`);
      console.log(`[DASHBOARD] User role: ${req.session.user.role}, email: ${req.session.user.agentEmail || 'N/A'}`);
      
      // Filter based on role
      if (req.session.user.role === 'admin') {
        // Admin sees all applications
        console.log(`[DASHBOARD] Returning all ${allApplications.length} applications for admin`);
        return res.json(allApplications);
      } else if (req.session.user.role === 'agent' && req.session.user.agentEmail) {
        // Agent sees only their applications
        const agentEmail = req.session.user.agentEmail.toLowerCase();
        const filteredApplications = allApplications.filter(
          (app) => (app.agentEmail || '').toLowerCase() === agentEmail
        );
        console.log(`[DASHBOARD] Returning ${filteredApplications.length} applications for agent ${agentEmail}`);
        return res.json(filteredApplications);
      }
      
      return res.status(403).json({ error: "Access denied" });
    } catch (error) {
      console.error("Error fetching applications:", error);
      res.status(500).json({ error: "Failed to fetch applications" });
    }
  });

  // Agent view endpoints
  // Serve the HTML page for agent view
  app.get("/agent/application/:id", async (req, res) => {
    try {
      const htmlPath = path.join(process.cwd(), "client", "public", "ApplicationView.html");
      res.sendFile(htmlPath);
    } catch (error) {
      console.error("Error serving agent view:", error);
      res.status(500).send("Failed to load application view");
    }
  });

  // API endpoint to fetch application data for agent view (no auth required)
  app.get("/api/applications/:id/view", async (req, res) => {
    try {
      const { id } = req.params;
      const application = await storage.getLoanApplication(id);
      
      if (!application) {
        return res.status(404).json({ error: "Application not found" });
      }
      
      // Return application data (agent view is secure by obscurity via UUID)
      res.json(application);
    } catch (error) {
      console.error("Error fetching application for view:", error);
      res.status(500).json({ error: "Failed to fetch application" });
    }
  });

  // ========================================
  // PLAID INTEGRATION ROUTES
  // ========================================

  // 1. Generate Link Token for Plaid Link widget
  app.post("/api/plaid/create-link-token", async (req, res) => {
    try {
      const tokenData = await plaidService.createLinkToken("user-session-id");
      res.json(tokenData);
    } catch (error) {
      console.error("Plaid Create Token Error:", error);
      res.status(500).json({ error: "Failed to initialize Plaid" });
    }
  });

  // 2. Handle Successful Link & Analyze (with Asset Report + AI Analysis)
  app.post("/api/plaid/exchange-token", async (req, res) => {
    try {
      // Validate request body
      const validationResult = plaidExchangeSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Invalid request data",
          details: validationResult.error.errors 
        });
      }
      
      const { publicToken, metadata, businessName, email, useAIAnalysis } = validationResult.data;

      // A. Exchange Token
      const tokenResponse = await plaidService.exchangePublicToken(publicToken);
      const institutionName = metadata?.institution?.name || 'Unknown Bank';
      
      // B. Save Access Token using storage layer
      await storage.createPlaidItem({
        itemId: tokenResponse.item_id,
        accessToken: tokenResponse.access_token,
        institutionName,
      });

      // C. Auto-link to existing application if email matches
      const applications = await storage.getAllLoanApplications();
      const matchingApp = applications.find((app: LoanApplication) => app.email === email);
      if (matchingApp && !matchingApp.plaidItemId) {
        await storage.updateLoanApplication(matchingApp.id, { 
          plaidItemId: tokenResponse.item_id 
        });
        console.log(`Linked Plaid item ${tokenResponse.item_id} to application ${matchingApp.id}`);
      }

      // D. Run AI-powered Asset Report Analysis if enabled
      if (useAIAnalysis && isOpenAIConfigured()) {
        console.log(`[PLAID EXCHANGE] Running AI-powered Asset Report analysis for ${email}...`);
        
        try {
          // Generate Asset Report for comprehensive financial data
          const assetReport = await plaidService.createAndGetAssetReport(tokenResponse.access_token, 90);
          
          // Format Asset Report data for OpenAI analysis
          let analysisText = "=== PLAID ASSET REPORT ===\n";
          analysisText += `Report Generated: ${assetReport.report?.date_generated || 'N/A'}\n`;
          analysisText += `Days Requested: ${assetReport.report?.days_requested || 90}\n\n`;
          
          // Extract metrics from asset report
          let totalDeposits = 0;
          let totalCurrentBalance = 0;
          let negativeDays = 0;
          
          // Process each item in the report
          if (assetReport.report?.items) {
            for (const item of assetReport.report.items) {
              analysisText += `=== INSTITUTION: ${item.institution_name || 'Unknown'} ===\n\n`;
              
              if (item.accounts) {
                for (const account of item.accounts) {
                  analysisText += `--- ACCOUNT: ${account.name} (${account.subtype || account.type}) ---\n`;
                  analysisText += `Current Balance: $${account.balances?.current?.toFixed(2) || 'N/A'}\n`;
                  analysisText += `Available Balance: $${account.balances?.available?.toFixed(2) || 'N/A'}\n`;
                  
                  totalCurrentBalance += account.balances?.current || 0;
                  
                  // Historical balances
                  if (account.historical_balances && account.historical_balances.length > 0) {
                    analysisText += `\nHistorical Daily Balances (${account.historical_balances.length} days):\n`;
                    const balances = account.historical_balances.slice(0, 90);
                    let totalBalance = 0;
                    let minBalance = Infinity;
                    let maxBalance = -Infinity;
                    
                    for (const bal of balances) {
                      const current = bal.current || 0;
                      totalBalance += current;
                      minBalance = Math.min(minBalance, current);
                      maxBalance = Math.max(maxBalance, current);
                      if (current < 0) negativeDays++;
                    }
                    
                    const avgBalance = balances.length > 0 ? totalBalance / balances.length : 0;
                    analysisText += `  Average Daily Balance: $${avgBalance.toFixed(2)}\n`;
                    analysisText += `  Min/Max Balance: $${minBalance === Infinity ? 'N/A' : minBalance.toFixed(2)} / $${maxBalance === -Infinity ? 'N/A' : maxBalance.toFixed(2)}\n`;
                    analysisText += `  Days with Negative Balance: ${negativeDays}\n`;
                    
                    // Sample recent balances
                    analysisText += `\n  Recent Balance History:\n`;
                    for (const bal of balances.slice(0, 30)) {
                      analysisText += `    ${bal.date}: $${bal.current?.toFixed(2) || '0.00'}\n`;
                    }
                  }
                  
                  // Transactions from asset report
                  if (account.transactions && account.transactions.length > 0) {
                    analysisText += `\nTransactions (${account.transactions.length} total):\n`;
                    
                    let accountDeposits = 0;
                    let accountWithdrawals = 0;
                    let depositCount = 0;
                    let withdrawalCount = 0;
                    
                    for (const txn of account.transactions) {
                      const amount = txn.amount || 0;
                      if (amount < 0) {
                        accountDeposits += Math.abs(amount);
                        depositCount++;
                      } else {
                        accountWithdrawals += amount;
                        withdrawalCount++;
                      }
                    }
                    
                    totalDeposits += accountDeposits;
                    
                    analysisText += `  Total Deposits: $${accountDeposits.toFixed(2)} (${depositCount} transactions)\n`;
                    analysisText += `  Total Withdrawals: $${accountWithdrawals.toFixed(2)} (${withdrawalCount} transactions)\n`;
                    analysisText += `  Estimated Monthly Revenue: $${(accountDeposits / 3).toFixed(2)}\n`;
                    
                    // Recent transactions
                    analysisText += `\n  Recent Transactions:\n`;
                    for (const txn of account.transactions.slice(0, 50)) {
                      const amount = txn.amount < 0 ? `+$${Math.abs(txn.amount).toFixed(2)}` : `-$${txn.amount.toFixed(2)}`;
                      analysisText += `    ${txn.date} | ${amount} | ${txn.original_description || txn.name || 'N/A'}\n`;
                    }
                  }
                  
                  analysisText += `\n`;
                }
              }
            }
          }

          console.log(`[PLAID EXCHANGE] Analyzing ${analysisText.length} chars of Asset Report data with AI...`);

          // Run AI analysis
          const aiAnalysis = await analyzeBankStatements(analysisText, {});
          
          // Calculate metrics for legacy compatibility
          const monthlyRevenue = totalDeposits / 3;
          const avgBalance = totalCurrentBalance;
          
          // Save results with AI analysis
          await storage.createFundingAnalysis({
            businessName,
            email,
            calculatedMonthlyRevenue: monthlyRevenue.toString(),
            calculatedAvgBalance: avgBalance.toString(),
            negativeDaysCount: negativeDays,
            analysisResult: {
              sba: { status: aiAnalysis.overallScore >= 70 ? 'High' : aiAnalysis.overallScore >= 40 ? 'Medium' : 'Low', reason: aiAnalysis.fundingRecommendation?.message || '' },
              loc: { status: aiAnalysis.overallScore >= 60 ? 'High' : aiAnalysis.overallScore >= 35 ? 'Medium' : 'Low', reason: 'Based on balance history and revenue patterns' },
              mca: { status: aiAnalysis.overallScore >= 30 ? 'High' : aiAnalysis.overallScore >= 15 ? 'Medium' : 'Low', reason: 'Working capital based on deposit flow' }
            },
            plaidItemId: tokenResponse.item_id
          });

          // Return comprehensive AI analysis
          res.json({
            type: 'ai_analysis',
            metrics: {
              monthlyRevenue: Math.round(monthlyRevenue),
              avgBalance: Math.round(avgBalance),
              negativeDays
            },
            recommendations: {
              sba: { status: aiAnalysis.overallScore >= 70 ? 'High' : aiAnalysis.overallScore >= 40 ? 'Medium' : 'Low', reason: aiAnalysis.fundingRecommendation?.message || 'Based on financial analysis' },
              loc: { status: aiAnalysis.overallScore >= 60 ? 'High' : aiAnalysis.overallScore >= 35 ? 'Medium' : 'Low', reason: 'Based on balance history' },
              mca: { status: aiAnalysis.overallScore >= 30 ? 'High' : aiAnalysis.overallScore >= 15 ? 'Medium' : 'Low', reason: 'Based on cash flow' }
            },
            aiAnalysis: {
              overallScore: aiAnalysis.overallScore,
              qualificationTier: aiAnalysis.qualificationTier,
              estimatedMonthlyRevenue: aiAnalysis.estimatedMonthlyRevenue,
              averageDailyBalance: aiAnalysis.averageDailyBalance,
              redFlags: aiAnalysis.redFlags,
              positiveIndicators: aiAnalysis.positiveIndicators,
              fundingRecommendation: aiAnalysis.fundingRecommendation,
              improvementSuggestions: aiAnalysis.improvementSuggestions,
              summary: aiAnalysis.summary
            },
            institutionName
          });
          
        } catch (aiError) {
          console.error("[PLAID EXCHANGE] AI analysis failed, falling back to basic analysis:", aiError);
          // Fall back to basic analysis if AI fails
          const basicAnalysis = await plaidService.analyzeFinancials(tokenResponse.access_token);
          
          await storage.createFundingAnalysis({
            businessName,
            email,
            calculatedMonthlyRevenue: basicAnalysis.metrics.monthlyRevenue.toString(),
            calculatedAvgBalance: basicAnalysis.metrics.avgBalance.toString(),
            negativeDaysCount: basicAnalysis.metrics.negativeDays,
            analysisResult: basicAnalysis.recommendations,
            plaidItemId: tokenResponse.item_id
          });
          
          res.json({
            type: 'basic_analysis',
            ...basicAnalysis
          });
        }
      } else {
        // E. Run basic analysis (original flow)
        const analysis = await plaidService.analyzeFinancials(tokenResponse.access_token);

        // F. Save Results using storage layer
        await storage.createFundingAnalysis({
          businessName,
          email,
          calculatedMonthlyRevenue: analysis.metrics.monthlyRevenue.toString(),
          calculatedAvgBalance: analysis.metrics.avgBalance.toString(),
          negativeDaysCount: analysis.metrics.negativeDays,
          analysisResult: analysis.recommendations,
          plaidItemId: tokenResponse.item_id
        });

        // G. Return results to frontend
        res.json({
          type: 'basic_analysis',
          ...analysis
        });
      }

    } catch (error) {
      console.error("Plaid Exchange Error:", error);
      res.status(500).json({ error: "Failed to analyze bank data" });
    }
  });

  // 3. Get existing funding analysis by email
  app.get("/api/plaid/analysis/:email", async (req, res) => {
    try {
      const { email } = req.params;
      const analysis = await storage.getFundingAnalysisByEmail(email);
      
      if (!analysis) {
        return res.status(404).json({ error: "No analysis found for this email" });
      }
      
      res.json(analysis);
    } catch (error) {
      console.error("Error fetching analysis:", error);
      res.status(500).json({ error: "Failed to fetch analysis" });
    }
  });

  // 4. Get bank statements for an application (requires dashboard auth)
  app.get("/api/plaid/statements/:applicationId", async (req, res) => {
    const session = req.session as any;
    if (!session?.isAuthenticated) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const { applicationId } = req.params;
      const months = parseInt(req.query.months as string) || 3;
      
      const application = await storage.getLoanApplication(applicationId);
      if (!application) {
        return res.status(404).json({ error: "Application not found" });
      }

      if (!application.plaidItemId) {
        return res.status(404).json({ error: "No bank connection found for this application" });
      }

      const plaidItem = await storage.getPlaidItem(application.plaidItemId);
      if (!plaidItem) {
        return res.status(404).json({ error: "Bank connection data not found" });
      }

      const statements = await plaidService.getBankStatements(plaidItem.accessToken, months);
      res.json(statements);
    } catch (error) {
      console.error("Error fetching bank statements:", error);
      res.status(500).json({ error: "Failed to fetch bank statements" });
    }
  });

  // 5. Get all bank connections (for dashboard Bank Statements tab)
  app.get("/api/plaid/all", async (req, res) => {
    if (!req.session.user?.isAuthenticated) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const [plaidItems, fundingAnalyses] = await Promise.all([
        storage.getAllPlaidItems(),
        storage.getAllFundingAnalyses()
      ]);

      const bankConnections = fundingAnalyses.map(analysis => {
        const plaidItem = plaidItems.find(item => item.itemId === analysis.plaidItemId);
        return {
          id: analysis.id,
          businessName: analysis.businessName,
          email: analysis.email,
          institutionName: plaidItem?.institutionName || 'Unknown Bank',
          monthlyRevenue: analysis.calculatedMonthlyRevenue,
          avgBalance: analysis.calculatedAvgBalance,
          negativeDays: analysis.negativeDaysCount,
          analysisResult: analysis.analysisResult,
          plaidItemId: analysis.plaidItemId,
          createdAt: analysis.createdAt
        };
      });

      res.json(bankConnections);
    } catch (error) {
      console.error("Error fetching bank connections:", error);
      res.status(500).json({ error: "Failed to fetch bank connections" });
    }
  });

  // 6. Get bank statements by Plaid item ID (for bank statements tab)
  app.get("/api/plaid/statements-by-item/:plaidItemId", async (req, res) => {
    if (!req.session.user?.isAuthenticated) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const { plaidItemId } = req.params;
      const months = parseInt(req.query.months as string) || 3;
      
      const plaidItem = await storage.getPlaidItem(plaidItemId);
      if (!plaidItem) {
        return res.status(404).json({ error: "Bank connection not found" });
      }

      const statements = await plaidService.getBankStatements(plaidItem.accessToken, months);
      res.json(statements);
    } catch (error) {
      console.error("Error fetching bank statements:", error);
      res.status(500).json({ error: "Failed to fetch bank statements" });
    }
  });

  // 6b. Get Asset Report by Plaid item ID (comprehensive financial report)
  app.get("/api/plaid/asset-report/:plaidItemId", async (req, res) => {
    if (!req.session.user?.isAuthenticated) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const { plaidItemId } = req.params;
      const days = parseInt(req.query.days as string) || 90;
      
      const plaidItem = await storage.getPlaidItem(plaidItemId);
      if (!plaidItem) {
        return res.status(404).json({ error: "Bank connection not found" });
      }

      // Look up the funding analysis to get the email, then find the application
      let userInfo: any = undefined;
      const fundingAnalysis = await storage.getFundingAnalysisByPlaidItemId(plaidItemId);
      if (fundingAnalysis?.email) {
        const application = await storage.getApplicationByEmail(fundingAnalysis.email);
        if (application) {
          // Format SSN with dashes if provided (ddd-dd-dddd format required by Plaid)
          let formattedSSN: string | undefined;
          if (application.socialSecurityNumber) {
            const ssnDigits = application.socialSecurityNumber.replace(/\D/g, '');
            if (ssnDigits.length === 9) {
              formattedSSN = `${ssnDigits.slice(0,3)}-${ssnDigits.slice(3,5)}-${ssnDigits.slice(5)}`;
            }
          }
          
          // Format phone number to E.164 if possible
          let formattedPhone: string | undefined;
          if (application.phone) {
            const phoneDigits = application.phone.replace(/\D/g, '');
            if (phoneDigits.length === 10) {
              formattedPhone = `+1${phoneDigits}`;
            } else if (phoneDigits.length === 11 && phoneDigits.startsWith('1')) {
              formattedPhone = `+${phoneDigits}`;
            }
          }

          // Parse full name into first and last name
          let firstName: string | undefined;
          let lastName: string | undefined;
          if (application.fullName) {
            const nameParts = application.fullName.trim().split(/\s+/);
            firstName = nameParts[0];
            lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : undefined;
          }

          userInfo = {
            firstName,
            lastName,
            email: application.email,
            ssn: formattedSSN,
            phoneNumber: formattedPhone,
          };
          console.log(`[ASSET REPORT] Found application for ${application.email}, including borrower info`);
        }
      }

      console.log(`Creating asset report for Plaid item ${plaidItemId} (${days} days)...`);
      const assetReport = await plaidService.createAndGetAssetReport(plaidItem.accessToken, days, userInfo);
      
      res.json(assetReport);
    } catch (error: any) {
      console.error("Error fetching asset report:", error);
      
      // Handle specific Plaid errors
      if (error?.response?.data?.error_code) {
        const plaidError = error.response.data;
        return res.status(400).json({ 
          error: "Plaid error", 
          errorCode: plaidError.error_code,
          message: plaidError.error_message || "Failed to generate asset report"
        });
      }
      
      res.status(500).json({ error: "Failed to generate asset report" });
    }
  });

  // 6c. Get Asset Report PDF by Plaid item ID
  app.get("/api/plaid/asset-report-pdf/:plaidItemId", async (req, res) => {
    if (!req.session.user?.isAuthenticated) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const { plaidItemId } = req.params;
      const days = parseInt(req.query.days as string) || 90;
      
      const plaidItem = await storage.getPlaidItem(plaidItemId);
      if (!plaidItem) {
        return res.status(404).json({ error: "Bank connection not found" });
      }

      // Look up the funding analysis to get the email, then find the application
      let userInfo: any = undefined;
      const fundingAnalysis = await storage.getFundingAnalysisByPlaidItemId(plaidItemId);
      if (fundingAnalysis?.email) {
        const application = await storage.getApplicationByEmail(fundingAnalysis.email);
        if (application) {
          // Format SSN with dashes if provided (ddd-dd-dddd format required by Plaid)
          let formattedSSN: string | undefined;
          if (application.socialSecurityNumber) {
            const ssnDigits = application.socialSecurityNumber.replace(/\D/g, '');
            if (ssnDigits.length === 9) {
              formattedSSN = `${ssnDigits.slice(0,3)}-${ssnDigits.slice(3,5)}-${ssnDigits.slice(5)}`;
            }
          }
          
          // Format phone number to E.164 if possible
          let formattedPhone: string | undefined;
          if (application.phone) {
            const phoneDigits = application.phone.replace(/\D/g, '');
            if (phoneDigits.length === 10) {
              formattedPhone = `+1${phoneDigits}`;
            } else if (phoneDigits.length === 11 && phoneDigits.startsWith('1')) {
              formattedPhone = `+${phoneDigits}`;
            }
          }

          // Parse full name into first and last name
          let firstName: string | undefined;
          let lastName: string | undefined;
          if (application.fullName) {
            const nameParts = application.fullName.trim().split(/\s+/);
            firstName = nameParts[0];
            lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : undefined;
          }

          userInfo = {
            firstName,
            lastName,
            email: application.email,
            ssn: formattedSSN,
            phoneNumber: formattedPhone,
          };
          console.log(`[ASSET REPORT PDF] Found application for ${application.email}, including borrower info`);
        }
      }

      // First create the asset report to get the token
      console.log(`Creating asset report for PDF download...`);
      const { assetReportToken } = await plaidService.createAssetReport(plaidItem.accessToken, days, userInfo);
      
      // Wait for the report to be ready
      await plaidService.getAssetReport(assetReportToken);
      
      // Get the PDF
      console.log(`Downloading asset report PDF...`);
      const pdfBuffer = await plaidService.getAssetReportPdf(assetReportToken);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="asset_report_${plaidItemId}.pdf"`);
      res.send(pdfBuffer);
    } catch (error: any) {
      console.error("Error generating asset report PDF:", error);
      
      if (error?.response?.data?.error_code) {
        const plaidError = error.response.data;
        return res.status(400).json({ 
          error: "Plaid error", 
          errorCode: plaidError.error_code,
          message: plaidError.error_message || "Failed to generate asset report PDF"
        });
      }
      
      res.status(500).json({ error: "Failed to generate asset report PDF" });
    }
  });

  // 7. Link Plaid data to an existing application by email
  app.post("/api/plaid/link-to-application", async (req, res) => {
    try {
      const { email, plaidItemId } = req.body;
      
      if (!email || !plaidItemId) {
        return res.status(400).json({ error: "Email and plaidItemId are required" });
      }

      const applications = await storage.getAllLoanApplications();
      const matchingApp = applications.find((app: LoanApplication) => app.email === email);
      
      if (!matchingApp) {
        return res.status(404).json({ error: "No application found with this email" });
      }

      await storage.updateLoanApplication(matchingApp.id, { plaidItemId });
      res.json({ success: true, applicationId: matchingApp.id });
    } catch (error) {
      console.error("Error linking Plaid to application:", error);
      res.status(500).json({ error: "Failed to link bank data to application" });
    }
  });

  // 8. Analyze Plaid connection for fundability insights (using Asset Report)
  app.post("/api/plaid/analyze/:plaidItemId", async (req, res) => {
    if (!req.session.user?.isAuthenticated) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      if (!isOpenAIConfigured()) {
        return res.status(503).json({
          error: "Analysis service not available",
          message: "OpenAI API is not configured.",
        });
      }

      const { plaidItemId } = req.params;
      const { creditScoreRange, timeInBusiness, industry } = req.body;

      // Get the Plaid item using the correct method
      const plaidItem = await storage.getPlaidItem(plaidItemId);
      if (!plaidItem) {
        return res.status(404).json({ error: "Plaid connection not found" });
      }

      console.log(`[PLAID ANALYZE] Generating Asset Report for analysis...`);
      
      // Generate Asset Report for comprehensive financial data
      const assetReport = await plaidService.createAndGetAssetReport(plaidItem.accessToken, 90);
      
      // Format Asset Report data for OpenAI analysis
      let analysisText = "=== PLAID ASSET REPORT ===\n";
      analysisText += `Report Generated: ${assetReport.report?.date_generated || 'N/A'}\n`;
      analysisText += `Days Requested: ${assetReport.report?.days_requested || 90}\n\n`;
      
      // Process each item in the report
      if (assetReport.report?.items) {
        for (const item of assetReport.report.items) {
          analysisText += `=== INSTITUTION: ${item.institution_name || 'Unknown'} ===\n\n`;
          
          // Process each account
          if (item.accounts) {
            for (const account of item.accounts) {
              analysisText += `--- ACCOUNT: ${account.name} (${account.subtype || account.type}) ---\n`;
              analysisText += `Account Mask: ****${account.mask || 'N/A'}\n`;
              analysisText += `Current Balance: $${account.balances?.current?.toFixed(2) || 'N/A'}\n`;
              analysisText += `Available Balance: $${account.balances?.available?.toFixed(2) || 'N/A'}\n`;
              
              // Historical balances (very valuable for analysis)
              if (account.historical_balances && account.historical_balances.length > 0) {
                analysisText += `\nHistorical Daily Balances (${account.historical_balances.length} days):\n`;
                const balances = account.historical_balances.slice(0, 90); // Last 90 days
                let totalBalance = 0;
                let minBalance = Infinity;
                let maxBalance = -Infinity;
                let negativeDays = 0;
                
                for (const bal of balances) {
                  const current = bal.current || 0;
                  totalBalance += current;
                  minBalance = Math.min(minBalance, current);
                  maxBalance = Math.max(maxBalance, current);
                  if (current < 0) negativeDays++;
                }
                
                const avgBalance = balances.length > 0 ? totalBalance / balances.length : 0;
                analysisText += `  Average Daily Balance: $${avgBalance.toFixed(2)}\n`;
                analysisText += `  Minimum Balance: $${minBalance === Infinity ? 'N/A' : minBalance.toFixed(2)}\n`;
                analysisText += `  Maximum Balance: $${maxBalance === -Infinity ? 'N/A' : maxBalance.toFixed(2)}\n`;
                analysisText += `  Days with Negative Balance: ${negativeDays}\n`;
                
                // Show sample of recent balances
                analysisText += `\n  Recent Balance History:\n`;
                for (const bal of balances.slice(0, 30)) {
                  analysisText += `    ${bal.date}: $${bal.current?.toFixed(2) || '0.00'}\n`;
                }
              }
              
              // Transactions from asset report
              if (account.transactions && account.transactions.length > 0) {
                analysisText += `\nTransactions (${account.transactions.length} total):\n`;
                
                // Calculate deposits and withdrawals
                let totalDeposits = 0;
                let totalWithdrawals = 0;
                let depositCount = 0;
                let withdrawalCount = 0;
                
                for (const txn of account.transactions) {
                  const amount = txn.amount || 0;
                  if (amount < 0) {
                    totalDeposits += Math.abs(amount);
                    depositCount++;
                  } else {
                    totalWithdrawals += amount;
                    withdrawalCount++;
                  }
                }
                
                analysisText += `  Total Deposits: $${totalDeposits.toFixed(2)} (${depositCount} transactions)\n`;
                analysisText += `  Total Withdrawals: $${totalWithdrawals.toFixed(2)} (${withdrawalCount} transactions)\n`;
                analysisText += `  Estimated Monthly Revenue: $${(totalDeposits / 3).toFixed(2)}\n`;
                
                // Show recent transactions
                analysisText += `\n  Recent Transactions:\n`;
                for (const txn of account.transactions.slice(0, 50)) {
                  const amount = txn.amount < 0 ? `+$${Math.abs(txn.amount).toFixed(2)}` : `-$${txn.amount.toFixed(2)}`;
                  analysisText += `    ${txn.date} | ${amount} | ${txn.original_description || txn.name || 'N/A'}\n`;
                }
              }
              
              // Days available (how long account has been open)
              if (account.days_available !== undefined) {
                analysisText += `\nAccount History: ${account.days_available} days of data available\n`;
              }
              
              // Ownership info if available
              if (account.owners && account.owners.length > 0) {
                analysisText += `\nAccount Owners:\n`;
                for (const owner of account.owners) {
                  if (owner.names) {
                    analysisText += `  Name: ${owner.names.join(', ')}\n`;
                  }
                }
              }
              
              analysisText += `\n`;
            }
          }
        }
      }

      console.log(`[PLAID ANALYZE] Analyzing ${analysisText.length} chars of Asset Report data`);

      // Analyze with OpenAI
      const analysis = await analyzeBankStatements(analysisText, {
        creditScoreRange,
        timeInBusiness,
        industry,
      });

      // Get institution name from report
      const institutionName = assetReport.report?.items?.[0]?.institution_name || 'Unknown Bank';

      res.json({
        success: true,
        analysis,
        source: "plaid_asset_report",
        institutionName,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[PLAID ANALYZE] Error:", error);
      res.status(500).json({
        error: "Analysis failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // ========================================
  // BANK STATEMENT UPLOAD ROUTES
  // ========================================

  // 1. Upload bank statement PDF
  app.post("/api/bank-statements/upload", (req, res, next) => {
    bankStatementUpload.single("file")(req, res, (err: any) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: "File size exceeds 25MB limit" });
        }
        if (err.message === 'Only PDF files are allowed') {
          return res.status(400).json({ error: err.message });
        }
        return res.status(400).json({ error: "File upload error: " + err.message });
      }
      next();
    });
  }, async (req, res) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const { email, businessName, applicationId } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      let storedFileName: string;
      let storageType: string = "local";

      // ALWAYS use Object Storage for persistent file storage
      // Files saved to local disk are EPHEMERAL and will be lost on restart!
      if (objectStorage.isConfigured()) {
        try {
          storedFileName = await objectStorage.uploadFile(
            file.buffer,
            file.originalname,
            file.mimetype
          );
          storageType = "object-storage";
          console.log(`[UPLOAD] ✓ Bank statement uploaded to Object Storage: ${storedFileName}`);
        } catch (objError) {
          // FAIL the upload rather than silently falling back to ephemeral local storage
          console.error("[UPLOAD] ✗ Object Storage upload FAILED:", objError);
          return res.status(500).json({ 
            error: "Failed to save file to permanent storage. Please try again or contact support." 
          });
        }
      } else {
        // Object Storage not configured - FAIL the upload rather than using ephemeral storage
        console.error("[UPLOAD] ✗ Object Storage not configured - cannot accept uploads");
        return res.status(500).json({ 
          error: "File storage is not configured. Please contact support." 
        });
      }

      // Save upload record to database
      const upload = await storage.createBankStatementUpload({
        email,
        businessName: businessName || null,
        loanApplicationId: applicationId || null,
        originalFileName: file.originalname,
        storedFileName: storedFileName,
        mimeType: file.mimetype,
        fileSize: file.size,
      });

      // Check if there's a matching application by email
      let linkedApplicationId = applicationId;
      let matchingApp: LoanApplication | undefined;
      if (!linkedApplicationId) {
        const applications = await storage.getAllLoanApplications();
        matchingApp = applications.find((app: LoanApplication) => app.email === email);
        if (matchingApp) {
          linkedApplicationId = matchingApp.id;
          console.log(`Auto-linked bank statement upload ${upload.id} to application ${matchingApp.id}`);
        }
      }

      // Send webhook to GHL with "Statements Uploaded" tag
      const nameParts = (matchingApp?.fullName || '').trim().split(' ');
      ghlService.sendBankStatementUploadedWebhook({
        email,
        businessName: businessName || matchingApp?.businessName || matchingApp?.legalBusinessName || undefined,
        phone: matchingApp?.phone || undefined,
        firstName: nameParts[0] || undefined,
        lastName: nameParts.slice(1).join(' ') || undefined,
      }).catch(err => console.error('[GHL] Bank statement webhook error:', err));

      res.json({
        success: true,
        upload: {
          id: upload.id,
          originalFileName: upload.originalFileName,
          fileSize: upload.fileSize,
          createdAt: upload.createdAt,
          linkedApplicationId: linkedApplicationId || null,
          storageType,
        },
      });
    } catch (error) {
      console.error("Bank statement upload error:", error);
      res.status(500).json({ error: "Failed to upload bank statement" });
    }
  });

  // 2. Get all bank statement uploads (for dashboard) - role-based filtering
  app.get("/api/bank-statements/uploads", async (req, res) => {
    if (!req.session.user?.isAuthenticated) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      let uploads;
      
      // Admin sees all uploads, agents see only uploads from their applications
      if (req.session.user.role === 'admin') {
        uploads = await storage.getAllBankStatementUploads();
        console.log(`[BANK STATEMENTS] Admin fetching all ${uploads.length} uploads`);
      } else if (req.session.user.role === 'agent' && req.session.user.agentEmail) {
        uploads = await storage.getBankStatementUploadsByAgentEmail(req.session.user.agentEmail);
        console.log(`[BANK STATEMENTS] Agent ${req.session.user.agentName} fetching ${uploads.length} uploads`);
      } else {
        // Partners and other roles don't have access to bank statements
        return res.status(403).json({ error: "Access denied" });
      }
      
      res.json(uploads);
    } catch (error) {
      console.error("Error fetching bank statement uploads:", error);
      res.status(500).json({ error: "Failed to fetch uploads" });
    }
  });

  // 3. Download bank statement PDF - role-based access control
  app.get("/api/bank-statements/download/:id", async (req, res) => {
    if (!req.session.user?.isAuthenticated) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const upload = await storage.getBankStatementUpload(req.params.id);
      if (!upload) {
        return res.status(404).json({ error: "Upload not found" });
      }

      // Role-based access check for agents
      if (req.session.user.role === 'agent' && req.session.user.agentEmail) {
        // Verify this agent has access to this bank statement
        const agentUploads = await storage.getBankStatementUploadsByAgentEmail(req.session.user.agentEmail);
        const hasAccess = agentUploads.some(u => u.id === upload.id);
        if (!hasAccess) {
          console.log(`[BANK STATEMENTS] Agent ${req.session.user.agentName} denied access to upload ${upload.id}`);
          return res.status(403).json({ error: "Access denied - this statement is not from your applications" });
        }
      } else if (req.session.user.role !== 'admin') {
        // Only admins and agents can download
        return res.status(403).json({ error: "Access denied" });
      }

      // Check if file is in Object Storage (path contains "bank-statements/")
      if (upload.storedFileName.includes("bank-statements/")) {
        // File is in Object Storage - downloadFile handles all headers
        try {
          await objectStorage.downloadFile(upload.storedFileName, res, upload.originalFileName);
          return;
        } catch (objError) {
          console.error("[DOWNLOAD] Object Storage download failed:", objError);
          if (!res.headersSent) {
            return res.status(404).json({ error: "File not found in storage" });
          }
          return;
        }
      }

      // Fallback: check local disk
      const filePath = path.join(UPLOAD_DIR, upload.storedFileName);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "File not found on disk" });
      }

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${upload.originalFileName}"`);
      res.sendFile(filePath);
    } catch (error) {
      console.error("Error downloading bank statement:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to download file" });
      }
    }
  });

  // 4. Bulk download all bank statements for a business as ZIP
  app.get("/api/bank-statements/download-all/:businessName", async (req, res) => {
    if (!req.session.user?.isAuthenticated) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const businessName = decodeURIComponent(req.params.businessName);
      console.log(`[BULK DOWNLOAD] Requesting all statements for business: "${businessName}"`);

      // Get all uploads for this business
      let uploads;
      if (req.session.user.role === 'admin') {
        uploads = await storage.getAllBankStatementUploads();
      } else if (req.session.user.role === 'agent' && req.session.user.agentEmail) {
        uploads = await storage.getBankStatementUploadsByAgentEmail(req.session.user.agentEmail);
      } else {
        return res.status(403).json({ error: "Access denied" });
      }

      // Filter by business name
      const businessUploads = uploads.filter(u =>
        (u.businessName || 'Unknown Business') === businessName
      );

      if (businessUploads.length === 0) {
        return res.status(404).json({ error: "No statements found for this business" });
      }

      console.log(`[BULK DOWNLOAD] Found ${businessUploads.length} statements for "${businessName}"`);

      // Track filenames to handle duplicates and track success/failures
      const usedFilenames = new Map<string, number>();
      const successfulFiles: string[] = [];
      const failedFiles: { name: string; reason: string }[] = [];
      const fileBuffers: { name: string; buffer: Buffer }[] = [];

      // Helper to get unique filename
      const getUniqueFilename = (originalName: string): string => {
        const count = usedFilenames.get(originalName) || 0;
        usedFilenames.set(originalName, count + 1);

        if (count === 0) {
          return originalName;
        }

        // Add suffix before extension for duplicates
        const lastDot = originalName.lastIndexOf('.');
        if (lastDot > 0) {
          const name = originalName.substring(0, lastDot);
          const ext = originalName.substring(lastDot);
          return `${name}_${count}${ext}`;
        }
        return `${originalName}_${count}`;
      };

      // First, collect all file buffers before creating the archive
      for (const upload of businessUploads) {
        try {
          let fileBuffer: Buffer;

          // Check if file is in Object Storage (has bank-statements/ prefix)
          if (upload.storedFileName && upload.storedFileName.includes("bank-statements/")) {
            console.log(`[BULK DOWNLOAD] Fetching from Object Storage: ${upload.storedFileName}`);
            fileBuffer = await objectStorage.getFileBuffer(upload.storedFileName);
          } else {
            // Fallback: check local disk
            const filePath = path.join(UPLOAD_DIR, upload.storedFileName);
            if (fs.existsSync(filePath)) {
              console.log(`[BULK DOWNLOAD] Reading from local disk: ${filePath}`);
              fileBuffer = fs.readFileSync(filePath);
            } else {
              console.warn(`[BULK DOWNLOAD] File not found: ${upload.storedFileName}`);
              failedFiles.push({ name: upload.originalFileName, reason: 'File not found in storage' });
              continue;
            }
          }

          // Store the buffer for later
          const uniqueFilename = getUniqueFilename(upload.originalFileName);
          fileBuffers.push({ name: uniqueFilename, buffer: fileBuffer });
          successfulFiles.push(uniqueFilename);
          console.log(`[BULK DOWNLOAD] Prepared ${uniqueFilename} (${fileBuffer.length} bytes)`);
        } catch (fileError) {
          const errorMessage = fileError instanceof Error ? fileError.message : 'Unknown error';
          console.error(`[BULK DOWNLOAD] Error fetching file ${upload.originalFileName}:`, fileError);
          failedFiles.push({ name: upload.originalFileName, reason: errorMessage });
        }
      }

      // Create manifest content
      const manifestContent = [
        `Bank Statements Download Manifest`,
        `Business: ${businessName}`,
        `Downloaded: ${new Date().toISOString()}`,
        ``,
        `=== Successfully Included (${successfulFiles.length} files) ===`,
        ...successfulFiles.map(f => `  - ${f}`),
      ];

      if (failedFiles.length > 0) {
        manifestContent.push(
          ``,
          `=== Failed to Include (${failedFiles.length} files) ===`,
          ...failedFiles.map(f => `  x ${f.name}: ${f.reason}`)
        );
      }

      manifestContent.push(
        ``,
        `Total: ${successfulFiles.length} of ${businessUploads.length} files included`
      );

      // Now create the archive with all collected buffers
      const archive = archiver('zip', { zlib: { level: 5 } });

      // Sanitize business name for filename
      const safeBusinessName = businessName.replace(/[^a-zA-Z0-9-_]/g, '_').substring(0, 50);
      const zipFileName = `${safeBusinessName}_Bank_Statements.zip`;

      // Set up error handling for archive
      archive.on('error', (err: Error) => {
        console.error('[BULK DOWNLOAD] Archive error:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Failed to create archive' });
        }
      });

      archive.on('warning', (err: Error) => {
        console.warn('[BULK DOWNLOAD] Archive warning:', err);
      });

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${zipFileName}"`);

      archive.pipe(res);

      // Add all files to archive
      for (const file of fileBuffers) {
        archive.append(file.buffer, { name: file.name });
        console.log(`[BULK DOWNLOAD] Added ${file.name} to archive`);
      }

      // Add manifest
      archive.append(manifestContent.join('\n'), { name: '_manifest.txt' });

      // Finalize the archive
      await archive.finalize();
      console.log(`[BULK DOWNLOAD] Archive created for "${businessName}": ${successfulFiles.length}/${businessUploads.length} files included`);
    } catch (error) {
      console.error("Error creating bulk download:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to create download" });
      }
    }
  });

  // 5. Analyze uploaded PDF statements for a business
  app.post("/api/bank-statements/analyze/:businessName", async (req, res) => {
    if (!req.session.user?.isAuthenticated) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      if (!isOpenAIConfigured()) {
        return res.status(503).json({
          error: "Analysis service not available",
          message: "OpenAI API is not configured.",
        });
      }

      const businessName = decodeURIComponent(req.params.businessName);
      const { creditScoreRange, timeInBusiness, industry } = req.body;

      console.log(`[PDF ANALYZE] Starting analysis for business: "${businessName}"`);

      // Get all uploads for this business
      let uploads;
      if (req.session.user.role === 'admin') {
        uploads = await storage.getAllBankStatementUploads();
      } else if (req.session.user.role === 'agent' && req.session.user.agentEmail) {
        uploads = await storage.getBankStatementUploadsByAgentEmail(req.session.user.agentEmail);
      } else {
        return res.status(403).json({ error: "Access denied" });
      }

      // Filter by business name
      const businessUploads = uploads.filter(u =>
        (u.businessName || 'Unknown Business') === businessName
      );

      if (businessUploads.length === 0) {
        return res.status(404).json({ error: "No statements found for this business" });
      }

      console.log(`[PDF ANALYZE] Found ${businessUploads.length} statements for "${businessName}"`);

      // Extract text from all PDFs
      const extractedTexts: string[] = [];

      for (const upload of businessUploads.slice(0, 6)) { // Limit to 6 files
        try {
          let fileBuffer: Buffer;

          // Get file from Object Storage or local disk
          if (upload.storedFileName && upload.storedFileName.includes("bank-statements/")) {
            fileBuffer = await objectStorage.getFileBuffer(upload.storedFileName);
          } else {
            const filePath = path.join(UPLOAD_DIR, upload.storedFileName);
            if (fs.existsSync(filePath)) {
              fileBuffer = fs.readFileSync(filePath);
            } else {
              console.warn(`[PDF ANALYZE] File not found: ${upload.storedFileName}`);
              continue;
            }
          }

          // Extract text from PDF
          const parser = new PDFParse({ data: fileBuffer });
          const result = await parser.getText();
          const text = result.text || "";
          extractedTexts.push(`--- Statement: ${upload.originalFileName} ---\n${text}\n`);
          console.log(`[PDF ANALYZE] Extracted ${text.length} chars from ${upload.originalFileName}`);
          await parser.destroy();
        } catch (pdfError) {
          console.error(`[PDF ANALYZE] Error parsing ${upload.originalFileName}:`, pdfError);
          extractedTexts.push(`--- Statement: ${upload.originalFileName} ---\n[Error: Could not extract text from this PDF.]\n`);
        }
      }

      if (extractedTexts.length === 0) {
        return res.status(400).json({
          error: "No readable content",
          message: "Could not extract text from any of the uploaded PDFs.",
        });
      }

      const combinedText = extractedTexts.join("\n\n");
      console.log(`[PDF ANALYZE] Total text for analysis: ${combinedText.length} chars`);

      // Analyze with OpenAI
      const analysis = await analyzeBankStatements(combinedText, {
        creditScoreRange,
        timeInBusiness,
        industry,
      });

      console.log(`[PDF ANALYZE] Analysis complete. Score: ${analysis.overallScore}, Tier: ${analysis.qualificationTier}`);

      res.json({
        success: true,
        analysis,
        source: "uploaded",
        businessName,
        filesProcessed: extractedTexts.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[PDF ANALYZE] Error:", error);
      res.status(500).json({
        error: "Analysis failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Download blank application template as PDF (matching completed application style)
  app.get("/api/application-template", async (req, res) => {
    try {
      const doc = new PDFDocument({ margin: 0, size: 'A4' });
      
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", 'attachment; filename="Application-Template.pdf"');
      
      doc.pipe(res);
      
      // Colors (matching the completed application PDF)
      const headerBg = '#E8EEF3'; // Light blue-gray
      const darkNavy = '#1B2E4D'; // Dark navy text
      const teal = '#5FBFB8'; // Teal accent
      const fieldBg = '#FAFAFA'; // Light gray for field boxes
      const fieldBorder = '#E5E7EB'; // Border for fields
      const labelColor = '#6B7280'; // Gray for labels
      
      // Header background
      doc.rect(0, 0, 595, 113).fill(headerBg);
      
      // Add logo image (matching the completed application PDF)
      // Logo dimensions: original 450x138, scaled to ~170x52 for PDF
      const logoPath = path.join(process.cwd(), 'client', 'public', 'assets', 'tcg-logo.png');
      try {
        if (fs.existsSync(logoPath)) {
          doc.image(logoPath, 57, 28, { width: 170 });
        } else {
          // Fallback to text if logo not found
          doc.fillColor(teal).fontSize(24).font('Helvetica-Bold').text('TODAY', 57, 28);
          doc.fillColor(darkNavy).fontSize(24).font('Helvetica-Bold').text('CAPITAL GROUP', 57, 50, { continued: false });
        }
      } catch (logoError) {
        // Fallback to text if logo fails to load
        doc.fillColor(teal).fontSize(24).font('Helvetica-Bold').text('TODAY', 57, 28);
        doc.fillColor(darkNavy).fontSize(24).font('Helvetica-Bold').text('CAPITAL GROUP', 57, 50, { continued: false });
      }
      
      // Date on right
      const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      doc.fillColor(teal).fontSize(10).font('Helvetica').text('Date: ' + today, 425, 35);
      
      let yPos = 140;
      const leftCol = 57;
      const rightCol = 306;
      const fieldWidth = 230;
      const smallFieldWidth = 107;
      const fieldHeight = 24;
      const rowSpacing = 37;
      
      // Helper function for section headers
      const addSectionHeader = (title: string) => {
        doc.fillColor(darkNavy).fontSize(14).font('Helvetica-Bold').text(title, leftCol, yPos);
        doc.strokeColor(teal).lineWidth(2).moveTo(leftCol, yPos + 18).lineTo(leftCol + 160, yPos + 18).stroke();
        yPos += 35;
      };
      
      // Helper function for field with label and box
      const addField = (label: string, x: number, y: number, width: number) => {
        doc.fillColor(labelColor).fontSize(8).font('Helvetica-Bold').text(label, x, y);
        doc.rect(x, y + 10, width, fieldHeight).fillAndStroke(fieldBg, fieldBorder);
        doc.fillColor('#9CA3AF').fontSize(10).font('Helvetica').text('—', x + 8, y + 17);
      };
      
      // Business Information Section
      addSectionHeader('Business Information');
      
      addField('Legal Name:', leftCol, yPos, fieldWidth);
      addField('DBA:', rightCol, yPos, fieldWidth);
      yPos += rowSpacing;
      
      addField('Website:', leftCol, yPos, fieldWidth);
      addField('Start Date:', rightCol, yPos, fieldWidth);
      yPos += rowSpacing;
      
      addField('EIN:', leftCol, yPos, fieldWidth);
      addField('Industry:', rightCol, yPos, fieldWidth);
      yPos += rowSpacing;
      
      addField('Address:', leftCol, yPos, fieldWidth);
      addField('City:', rightCol, yPos, fieldWidth);
      yPos += rowSpacing;
      
      addField('State:', leftCol, yPos, smallFieldWidth);
      addField('ZIP:', leftCol + 120, yPos, smallFieldWidth);
      addField('State of Inc:', rightCol, yPos, fieldWidth);
      yPos += rowSpacing;
      
      addField('Requested Amount:', leftCol, yPos, fieldWidth);
      addField('MCA Balance:', rightCol, yPos, fieldWidth);
      yPos += rowSpacing;
      
      addField('Credit Cards:', leftCol, yPos, fieldWidth);
      addField('MCA Bank:', rightCol, yPos, fieldWidth);
      yPos += 50;
      
      // Owner Information Section
      addSectionHeader('Owner Information');
      
      addField('Full Name:', leftCol, yPos, fieldWidth);
      addField('Email:', rightCol, yPos, fieldWidth);
      yPos += rowSpacing;
      
      addField('Phone:', leftCol, yPos, fieldWidth);
      addField('SSN:', rightCol, yPos, fieldWidth);
      yPos += rowSpacing;
      
      addField('Date of Birth:', leftCol, yPos, fieldWidth);
      addField('FICO Score:', rightCol, yPos, fieldWidth);
      yPos += rowSpacing;
      
      addField('Ownership %:', leftCol, yPos, fieldWidth);
      addField('Home Address:', rightCol, yPos, fieldWidth);
      yPos += rowSpacing;
      
      addField('City:', leftCol, yPos, fieldWidth);
      addField('State:', rightCol, yPos, smallFieldWidth);
      addField('ZIP:', rightCol + 120, yPos, smallFieldWidth);
      
      doc.end();
    } catch (error) {
      console.error("Error generating application template:", error);
      res.status(500).json({ error: "Failed to generate template" });
    }
  });

  // Export all applications as CSV
  app.get("/api/applications/export/csv", async (req, res) => {
    try {
      const applications = await storage.getAllLoanApplications();
      
      // Define CSV headers matching all application fields
      const headers = [
        'ID',
        'Full Name',
        'Email',
        'Phone',
        'Date of Birth',
        'Legal Business Name',
        'DBA',
        'Industry',
        'EIN',
        'Business Start Date',
        'State of Incorporation',
        'Company Email',
        'Website',
        'Business Address',
        'Business City',
        'Business State',
        'Business ZIP',
        'Owner Address',
        'Owner City',
        'Owner State',
        'Owner ZIP',
        'Ownership %',
        'FICO Score',
        'SSN',
        'Process Credit Cards',
        'Requested Amount',
        'Use of Funds',
        'MCA Balance Amount',
        'MCA Balance Bank',
        'Current Step',
        'Is Completed',
        'Is Full Application Completed',
        'Agent',
        'GHL Contact ID',
        'Agent View URL',
        'Plaid Item ID',
        'Created At'
      ];
      
      // Helper to escape CSV values
      const escapeCSV = (value: any): string => {
        if (value === null || value === undefined) return '';
        const str = String(value);
        if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };
      
      // Build CSV rows
      const rows = applications.map(app => [
        escapeCSV(app.id),
        escapeCSV(app.fullName),
        escapeCSV(app.email),
        escapeCSV(app.phone),
        escapeCSV(app.dateOfBirth),
        escapeCSV(app.legalBusinessName),
        escapeCSV(app.doingBusinessAs),
        escapeCSV(app.industry),
        escapeCSV(app.ein),
        escapeCSV(app.businessStartDate),
        escapeCSV(app.stateOfIncorporation),
        escapeCSV(app.companyEmail),
        escapeCSV(app.companyWebsite),
        escapeCSV(app.businessAddress),
        escapeCSV(app.city),
        escapeCSV(app.state),
        escapeCSV(app.zipCode),
        escapeCSV(app.ownerAddress1),
        escapeCSV(app.ownerCity),
        escapeCSV(app.ownerState),
        escapeCSV(app.ownerZip),
        escapeCSV(app.ownership),
        escapeCSV(app.ficoScoreExact),
        escapeCSV(app.socialSecurityNumber),
        escapeCSV(app.doYouProcessCreditCards),
        escapeCSV(app.requestedAmount),
        escapeCSV(app.useOfFunds),
        escapeCSV(app.mcaBalanceAmount),
        escapeCSV(app.mcaBalanceBankName),
        escapeCSV(app.currentStep),
        escapeCSV(app.isCompleted),
        escapeCSV(app.isFullApplicationCompleted),
        escapeCSV(app.agentName),
        escapeCSV(app.ghlContactId),
        escapeCSV(app.agentViewUrl),
        escapeCSV(app.plaidItemId),
        escapeCSV(app.createdAt)
      ].join(','));
      
      const csvContent = [headers.join(','), ...rows].join('\n');
      
      const filename = `Applications_Export_${new Date().toISOString().split('T')[0]}.csv`;
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csvContent);
    } catch (error) {
      console.error("Error exporting applications to CSV:", error);
      res.status(500).json({ error: "Failed to export applications" });
    }
  });

  // ========================================
  // BOT DETECTION ROUTES
  // ========================================

  // Get all bot attempts (admin only)
  app.get("/api/bot-attempts", async (req, res) => {
    try {
      // Check authentication - admin only
      if (!req.session.user?.isAuthenticated || req.session.user.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }

      const attempts = await storage.getAllBotAttempts();
      res.json(attempts);
    } catch (error) {
      console.error("Error fetching bot attempts:", error);
      res.status(500).json({ error: "Failed to fetch bot attempts" });
    }
  });

  // Get bot attempts count (for dashboard badge)
  app.get("/api/bot-attempts/count", async (req, res) => {
    try {
      // Check authentication - admin only
      if (!req.session.user?.isAuthenticated || req.session.user.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }

      const count = await storage.getBotAttemptsCount();
      res.json({ count });
    } catch (error) {
      console.error("Error fetching bot attempts count:", error);
      res.status(500).json({ error: "Failed to fetch count" });
    }
  });

  // ========================================
  // PARTNER PORTAL ROUTES
  // ========================================

  // Helper functions for password hashing
  const hashPassword = (password: string): string => {
    const salt = randomBytes(16).toString("hex");
    const hash = scryptSync(password, salt, 64).toString("hex");
    return `${salt}:${hash}`;
  };

  const verifyPassword = (password: string, storedHash: string): boolean => {
    const [salt, hash] = storedHash.split(":");
    const hashBuffer = Buffer.from(hash, "hex");
    const suppliedHashBuffer = scryptSync(password, salt, 64);
    return timingSafeEqual(hashBuffer, suppliedHashBuffer);
  };

  // Generate unique invite code for partners
  const generateInviteCode = (): string => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  // Partner Registration
  app.post("/api/partner/register", async (req, res) => {
    try {
      const { email, password, companyName, contactName, phone, profession, clientBaseSize } = req.body;

      // Validate required fields
      if (!email || !password || !companyName || !contactName) {
        return res.status(400).json({ error: "Email, password, company name, and contact name are required" });
      }

      // Check if partner already exists
      const existingPartner = await storage.getPartnerByEmail(email.toLowerCase());
      if (existingPartner) {
        return res.status(409).json({ error: "A partner account with this email already exists" });
      }

      // Generate unique invite code
      let inviteCode = generateInviteCode();
      let existingCode = await storage.getPartnerByInviteCode(inviteCode);
      while (existingCode) {
        inviteCode = generateInviteCode();
        existingCode = await storage.getPartnerByInviteCode(inviteCode);
      }

      // Hash password and create partner
      const passwordHash = hashPassword(password);
      const partner = await storage.createPartner({
        email: email.toLowerCase(),
        passwordHash,
        companyName,
        contactName,
        phone: phone || null,
        profession: profession || null,
        clientBaseSize: clientBaseSize || null,
        inviteCode,
        isActive: true,
      });

      // Set session
      req.session.user = {
        isAuthenticated: true,
        role: "partner",
        partnerId: partner.id,
        partnerEmail: partner.email,
        partnerName: partner.contactName,
        companyName: partner.companyName,
      };

      res.json({
        success: true,
        partner: {
          id: partner.id,
          email: partner.email,
          companyName: partner.companyName,
          contactName: partner.contactName,
          inviteCode: partner.inviteCode,
        },
      });
    } catch (error) {
      console.error("Partner registration error:", error);
      res.status(500).json({ error: "Failed to register partner" });
    }
  });

  // Partner Login
  app.post("/api/partner/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      const partner = await storage.getPartnerByEmail(email.toLowerCase());
      if (!partner) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      if (!partner.isActive) {
        return res.status(403).json({ error: "Account is disabled. Please contact support." });
      }

      const isValidPassword = verifyPassword(password, partner.passwordHash);
      if (!isValidPassword) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      // Set session
      req.session.user = {
        isAuthenticated: true,
        role: "partner",
        partnerId: partner.id,
        partnerEmail: partner.email,
        partnerName: partner.contactName,
        companyName: partner.companyName,
      };

      res.json({
        success: true,
        role: "partner",
        partner: {
          id: partner.id,
          email: partner.email,
          companyName: partner.companyName,
          contactName: partner.contactName,
          inviteCode: partner.inviteCode,
          commissionRate: partner.commissionRate,
        },
      });
    } catch (error) {
      console.error("Partner login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // Get partner profile
  app.get("/api/partner/profile", async (req, res) => {
    try {
      if (!req.session.user?.isAuthenticated || req.session.user.role !== "partner" || !req.session.user.partnerId) {
        return res.status(401).json({ error: "Partner authentication required" });
      }

      const partnerId = req.session.user.partnerId;
      const partner = await storage.getPartner(partnerId);
      if (!partner) {
        return res.status(404).json({ error: "Partner not found" });
      }

      res.json({
        id: partner.id,
        email: partner.email,
        companyName: partner.companyName,
        contactName: partner.contactName,
        phone: partner.phone,
        profession: partner.profession,
        clientBaseSize: partner.clientBaseSize,
        logoUrl: partner.logoUrl,
        inviteCode: partner.inviteCode,
        commissionRate: partner.commissionRate,
        createdAt: partner.createdAt,
      });
    } catch (error) {
      console.error("Error fetching partner profile:", error);
      res.status(500).json({ error: "Failed to fetch profile" });
    }
  });

  // Get partner's referred applications (filtered and redacted)
  app.get("/api/partner/applications", async (req, res) => {
    try {
      if (!req.session.user?.isAuthenticated || req.session.user.role !== "partner" || !req.session.user.partnerId) {
        return res.status(401).json({ error: "Partner authentication required" });
      }

      const partnerId = req.session.user.partnerId;
      const applications = await storage.getApplicationsByPartnerId(partnerId);

      // Redact sensitive fields - partners should only see status, not sensitive data
      const redactedApplications = applications.map((app) => ({
        id: app.id,
        businessName: app.businessName || app.legalBusinessName,
        contactName: app.fullName,
        email: app.email, // Partners may need to know which client this is
        phone: app.phone,
        requestedAmount: app.requestedAmount,
        status: getApplicationStatus(app),
        createdAt: app.createdAt,
        updatedAt: app.updatedAt,
        // Business context (non-sensitive)
        industry: app.industry,
        timeInBusiness: app.timeInBusiness,
        // Progress indicators
        isCompleted: app.isCompleted,
        isFullApplicationCompleted: app.isFullApplicationCompleted,
        hasBankConnection: !!app.plaidItemId,
      }));

      res.json(redactedApplications);
    } catch (error) {
      console.error("Error fetching partner applications:", error);
      res.status(500).json({ error: "Failed to fetch applications" });
    }
  });

  // Helper function to determine application status for partners
  function getApplicationStatus(app: LoanApplication): string {
    if (!app.isCompleted) return "Intake Started";
    if (!app.isFullApplicationCompleted) return "Pre-Qualified";
    if (!app.plaidItemId) return "Application Submitted";
    // Could add more statuses based on other fields in the future
    return "Under Review";
  }

  // Get partner stats/dashboard summary
  app.get("/api/partner/stats", async (req, res) => {
    try {
      if (!req.session.user?.isAuthenticated || req.session.user.role !== "partner" || !req.session.user.partnerId) {
        return res.status(401).json({ error: "Partner authentication required" });
      }

      const partnerId = req.session.user.partnerId;
      const applications = await storage.getApplicationsByPartnerId(partnerId);
      const partner = await storage.getPartner(partnerId);

      const totalReferrals = applications.length;
      const intakeCompleted = applications.filter((a) => a.isCompleted).length;
      const fullAppsCompleted = applications.filter((a) => a.isFullApplicationCompleted).length;
      const withBankConnection = applications.filter((a) => a.plaidItemId).length;

      // Calculate total requested volume
      const totalRequestedVolume = applications.reduce((sum, app) => {
        const amount = parseFloat(app.requestedAmount?.toString() || "0");
        return sum + (isNaN(amount) ? 0 : amount);
      }, 0);

      // Estimated commission (based on requested amounts, not funded - placeholder)
      const commissionRate = parseFloat(partner?.commissionRate?.toString() || "3") / 100;
      const estimatedCommission = totalRequestedVolume * commissionRate;

      res.json({
        totalReferrals,
        intakeCompleted,
        fullAppsCompleted,
        withBankConnection,
        totalRequestedVolume,
        estimatedCommission,
        commissionRate: partner?.commissionRate || "3.00",
      });
    } catch (error) {
      console.error("Error fetching partner stats:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // Validate referral code (for /r/:code route)
  app.get("/api/partner/validate-code/:code", async (req, res) => {
    try {
      const { code } = req.params;
      const partner = await storage.getPartnerByInviteCode(code.toUpperCase());

      if (!partner || !partner.isActive) {
        return res.status(404).json({ valid: false, error: "Invalid referral code" });
      }

      res.json({
        valid: true,
        partnerId: partner.id,
        companyName: partner.companyName,
      });
    } catch (error) {
      console.error("Error validating referral code:", error);
      res.status(500).json({ valid: false, error: "Failed to validate code" });
    }
  });

  // Admin: Get all partners (admin only)
  app.get("/api/admin/partners", async (req, res) => {
    try {
      if (!req.session.user?.isAuthenticated || req.session.user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const partners = await storage.getAllPartners();

      // Include application counts for each partner
      const partnersWithStats = await Promise.all(
        partners.map(async (partner) => {
          const applications = await storage.getApplicationsByPartnerId(partner.id);
          return {
            id: partner.id,
            email: partner.email,
            companyName: partner.companyName,
            contactName: partner.contactName,
            phone: partner.phone,
            profession: partner.profession,
            inviteCode: partner.inviteCode,
            commissionRate: partner.commissionRate,
            isActive: partner.isActive,
            totalReferrals: applications.length,
            createdAt: partner.createdAt,
          };
        })
      );

      res.json(partnersWithStats);
    } catch (error) {
      console.error("Error fetching partners:", error);
      res.status(500).json({ error: "Failed to fetch partners" });
    }
  });

  // Admin: Update partner (enable/disable, change commission rate)
  app.patch("/api/admin/partners/:id", async (req, res) => {
    try {
      if (!req.session.user?.isAuthenticated || req.session.user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { id } = req.params;
      const { isActive, commissionRate } = req.body;

      const updates: any = {};
      if (typeof isActive === "boolean") updates.isActive = isActive;
      if (commissionRate !== undefined) updates.commissionRate = commissionRate.toString();

      const partner = await storage.updatePartner(id, updates);
      if (!partner) {
        return res.status(404).json({ error: "Partner not found" });
      }

      res.json({
        success: true,
        partner: {
          id: partner.id,
          email: partner.email,
          companyName: partner.companyName,
          isActive: partner.isActive,
          commissionRate: partner.commissionRate,
        },
      });
    } catch (error) {
      console.error("Error updating partner:", error);
      res.status(500).json({ error: "Failed to update partner" });
    }
  });

  // ========================================
  // FUNDING CHECK / PRE-QUALIFICATION ROUTES
  // ========================================

  // Configure multer for funding check uploads (memory storage for immediate processing)
  const fundingCheckUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
    fileFilter: (_req, file, cb) => {
      if (file.mimetype === "application/pdf") {
        cb(null, true);
      } else {
        cb(new Error("Only PDF files are allowed"));
      }
    },
  });

  // Check if OpenAI is configured
  app.get("/api/funding-check/status", (_req, res) => {
    res.json({
      available: isOpenAIConfigured(),
      message: isOpenAIConfigured()
        ? "Funding check service is available"
        : "Funding check service is not configured. Please set OPENAI_API_KEY.",
    });
  });

  // Analyze bank statements for funding eligibility
  app.post(
    "/api/funding-check/analyze",
    fundingCheckUpload.array("statements", 6), // Allow up to 6 statements
    async (req, res) => {
      try {
        // Check if OpenAI is configured
        if (!isOpenAIConfigured()) {
          return res.status(503).json({
            error: "Funding check service is not available",
            message: "Please contact support to enable this feature.",
          });
        }

        const files = req.files as Express.Multer.File[];

        if (!files || files.length === 0) {
          return res.status(400).json({
            error: "No files uploaded",
            message: "Please upload at least one bank statement PDF.",
          });
        }

        console.log(`[FUNDING CHECK] Processing ${files.length} PDF file(s)`);

        // Get email from request body for saving statements
        const email = req.body.email;

        // Extract text from all PDFs and save them to storage
        const extractedTexts: string[] = [];

        for (const file of files) {
          try {
            const parser = new PDFParse({ data: file.buffer });
            const result = await parser.getText();
            const text = result.text || "";
            extractedTexts.push(
              `--- Statement: ${file.originalname} ---\n${text}\n`
            );
            console.log(
              `[FUNDING CHECK] Extracted ${text.length} characters from ${file.originalname}`
            );
            await parser.destroy();

            // Save to object storage with "Checker" source tag if email provided
            if (email && objectStorage.isConfigured()) {
              try {
                const storedFileName = await objectStorage.uploadFile(
                  file.buffer,
                  file.originalname,
                  file.mimetype
                );
                await storage.createBankStatementUpload({
                  email,
                  businessName: req.body.businessName || null,
                  loanApplicationId: null,
                  originalFileName: file.originalname,
                  storedFileName: storedFileName,
                  mimeType: file.mimetype,
                  fileSize: file.size,
                  source: "Checker",
                });
                console.log(`[FUNDING CHECK] Saved ${file.originalname} to storage with Checker tag`);
              } catch (saveError) {
                console.error(`[FUNDING CHECK] Failed to save ${file.originalname}:`, saveError);
              }
            }
          } catch (pdfError) {
            console.error(
              `[FUNDING CHECK] Error parsing ${file.originalname}:`,
              pdfError
            );
            extractedTexts.push(
              `--- Statement: ${file.originalname} ---\n[Error: Could not extract text from this PDF. It may be scanned/image-based.]\n`
            );
          }
        }

        const combinedText = extractedTexts.join("\n\n");

        // Get additional info from request body
        const additionalInfo = {
          creditScoreRange: req.body.creditScoreRange,
          timeInBusiness: req.body.timeInBusiness,
          industry: req.body.industry,
        };

        console.log("[FUNDING CHECK] Sending to OpenAI for analysis...");

        // Analyze with OpenAI
        const analysis = await analyzeBankStatements(combinedText, additionalInfo);

        console.log(
          `[FUNDING CHECK] Analysis complete. Score: ${analysis.overallScore}, Tier: ${analysis.qualificationTier}`
        );

        res.json({
          success: true,
          analysis,
          filesProcessed: files.length,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error("[FUNDING CHECK] Analysis error:", error);
        res.status(500).json({
          error: "Analysis failed",
          message:
            error instanceof Error
              ? error.message
              : "An unexpected error occurred during analysis.",
        });
      }
    }
  );

  // ========================================
  // APPROVAL EMAIL SCANNING ROUTES
  // ========================================

  // Check Google Sheets connection status (admin only)
  app.get("/api/approvals/gmail-status", async (req, res) => {
    const user = (req.session as any)?.user;
    if (!user?.isAuthenticated) {
      return res.status(401).json({ error: "Authentication required" });
    }
    if (user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    try {
      // Now checking Google Sheets connection instead of Gmail
      const isConfigured = await googleSheetsService.isConfigured();
      res.json({ connected: isConfigured, source: "google_sheets" });
    } catch (error) {
      res.json({ connected: false, error: "Failed to check Google Sheets status" });
    }
  });

  // Get all approvals (admin only)
  app.get("/api/approvals", async (req, res) => {
    const user = (req.session as any)?.user;
    if (!user?.isAuthenticated) {
      return res.status(401).json({ error: "Authentication required" });
    }
    if (user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    try {
      const approvals = await storage.getAllLenderApprovals();
      res.json(approvals);
    } catch (error) {
      console.error("[APPROVALS] Error fetching approvals:", error);
      res.status(500).json({ error: "Failed to fetch approvals" });
    }
  });

  // Get approvals grouped by business (admin only)
  app.get("/api/approvals/by-business", async (req, res) => {
    const user = (req.session as any)?.user;
    if (!user?.isAuthenticated) {
      return res.status(401).json({ error: "Authentication required" });
    }
    if (user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    try {
      const approvals = await storage.getAllLenderApprovals();
      
      // Group by business name
      const grouped: Record<string, typeof approvals> = {};
      for (const approval of approvals) {
        const key = approval.businessName || "Unknown Business";
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(approval);
      }
      
      res.json(grouped);
    } catch (error) {
      console.error("[APPROVALS] Error fetching approvals by business:", error);
      res.status(500).json({ error: "Failed to fetch approvals" });
    }
  });

  // Get approvals grouped by lender (admin only)
  app.get("/api/approvals/by-lender", async (req, res) => {
    const user = (req.session as any)?.user;
    if (!user?.isAuthenticated) {
      return res.status(401).json({ error: "Authentication required" });
    }
    if (user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    try {
      const approvals = await storage.getAllLenderApprovals();
      
      // Group by lender name
      const grouped: Record<string, typeof approvals> = {};
      for (const approval of approvals) {
        const key = approval.lenderName || "Unknown Lender";
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(approval);
      }
      
      res.json(grouped);
    } catch (error) {
      console.error("[APPROVALS] Error fetching approvals by lender:", error);
      res.status(500).json({ error: "Failed to fetch approvals" });
    }
  });

  // Manual scan trigger - sync approvals from Google Sheets (admin only)
  app.post("/api/approvals/scan", async (req, res) => {
    const user = (req.session as any)?.user;
    if (!user?.isAuthenticated) {
      return res.status(401).json({ error: "Authentication required" });
    }
    if (user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    try {
      console.log(`[APPROVAL SYNC] Starting sync from Google Sheets...`);
      
      // Check if Google Sheets is configured
      const isSheetsConfigured = await googleSheetsService.isConfigured();
      if (!isSheetsConfigured) {
        return res.status(400).json({ error: "Google Sheets is not connected. Please connect your Google Sheets account first." });
      }
      
      // Fetch approvals from Google Sheets
      const sheetApprovals = await googleSheetsService.fetchApprovals();
      console.log(`[APPROVAL SYNC] Fetched ${sheetApprovals.length} approvals from Google Sheets`);
      
      const results = {
        scanned: sheetApprovals.length,
        newApprovals: 0,
        updated: 0,
        skipped: 0,
        errors: 0,
        ghlSynced: 0,
        ghlSkipped: 0,
        ghlErrors: 0,
        approvals: [] as any[]
      };
      
      for (const row of sheetApprovals) {
        try {
          // Check if we've already processed this row (using rowId as emailId for deduplication)
          const existing = await storage.getLenderApprovalByEmailId(row.rowId);
          
          if (existing) {
            // Update existing record if data changed
            const updates: any = {};
            if (row.approvedAmount && row.approvedAmount !== existing.approvedAmount?.toString()) {
              updates.approvedAmount = googleSheetsService.parseAmount(row.approvedAmount);
            }
            if (row.status && row.status !== existing.status) {
              updates.status = row.status.toLowerCase();
            }
            if (row.termLength && row.termLength !== existing.termLength) {
              updates.termLength = row.termLength;
            }
            if (row.factorRate && row.factorRate !== existing.factorRate) {
              updates.factorRate = row.factorRate;
            }
            if (row.notes && row.notes !== existing.notes) {
              updates.notes = row.notes;
            }
            
            if (Object.keys(updates).length > 0) {
              await storage.updateLenderApproval(existing.id, updates);
              console.log(`[APPROVAL SYNC] Updated approval: ${row.businessName}`);
              results.updated++;

              // If status changed to approved/denied, sync to GHL
              if (updates.status && (updates.status === 'approved' || updates.status === 'denied' || updates.status === 'declined')) {
                try {
                  const ghlResult = await ghlService.syncApprovalToOpportunity({
                    businessName: row.businessName,
                    lenderName: row.lenderName,
                    status: updates.status,
                    approvedAmount: row.approvedAmount,
                    termLength: row.termLength,
                    factorRate: row.factorRate,
                    paybackAmount: row.paybackAmount,
                    paymentAmount: row.paymentAmount,
                    paymentFrequency: row.paymentFrequency,
                    productType: row.productType
                  });

                  // Save GHL sync status to database
                  await storage.updateLenderApproval(existing.id, {
                    ghlSynced: ghlResult.success,
                    ghlSyncedAt: new Date(),
                    ghlSyncMessage: ghlResult.message,
                    ghlOpportunityId: ghlResult.opportunityId || null
                  });

                  if (ghlResult.success) {
                    console.log(`[APPROVAL SYNC] GHL sync success (update): ${ghlResult.message}`);
                    results.ghlSynced++;
                  } else {
                    console.log(`[APPROVAL SYNC] GHL sync skipped (update): ${ghlResult.message}`);
                    results.ghlSkipped++;
                  }
                } catch (ghlError: any) {
                  console.error(`[APPROVAL SYNC] GHL sync error (update) for ${row.businessName}:`, ghlError);
                  // Save error status to database
                  await storage.updateLenderApproval(existing.id, {
                    ghlSynced: false,
                    ghlSyncedAt: new Date(),
                    ghlSyncMessage: `Error: ${ghlError.message || 'Unknown error'}`
                  });
                  results.ghlErrors++;
                }
              }
            } else {
              results.skipped++;
            }
            continue;
          }
          
          // Create new approval record
          const approval = await storage.createLenderApproval({
            businessName: row.businessName,
            businessEmail: row.businessEmail || null,
            lenderName: row.lenderName,
            lenderEmail: row.lenderEmail || null,
            approvedAmount: googleSheetsService.parseAmount(row.approvedAmount),
            termLength: row.termLength || null,
            factorRate: row.factorRate || null,
            paybackAmount: googleSheetsService.parseAmount(row.paybackAmount),
            paymentFrequency: row.paymentFrequency || null,
            paymentAmount: googleSheetsService.parseAmount(row.paymentAmount),
            interestRate: row.interestRate || null,
            productType: row.productType || null,
            status: row.status?.toLowerCase() || "pending",
            expirationDate: row.expirationDate || null,
            conditions: row.conditions || null,
            notes: row.notes || null,
            emailId: row.rowId, // Use rowId for deduplication
            emailSubject: `Google Sheets Import - Row ${row.rowId}`,
            emailReceivedAt: googleSheetsService.parseDate(row.dateReceived) || new Date(),
            rawEmailContent: null
          });
          
          console.log(`[APPROVAL SYNC] Created approval: ${approval.businessName} - $${approval.approvedAmount} from ${approval.lenderName}`);
          results.newApprovals++;
          results.approvals.push({
            id: approval.id,
            businessName: approval.businessName,
            lenderName: approval.lenderName,
            approvedAmount: approval.approvedAmount
          });

          // Sync to GHL opportunity (if status is approved/denied)
          try {
            const ghlResult = await ghlService.syncApprovalToOpportunity({
              businessName: row.businessName,
              lenderName: row.lenderName,
              status: row.status || 'pending',
              approvedAmount: row.approvedAmount,
              termLength: row.termLength,
              factorRate: row.factorRate,
              paybackAmount: row.paybackAmount,
              paymentAmount: row.paymentAmount,
              paymentFrequency: row.paymentFrequency,
              productType: row.productType
            });

            // Save GHL sync status to database
            await storage.updateLenderApproval(approval.id, {
              ghlSynced: ghlResult.success,
              ghlSyncedAt: new Date(),
              ghlSyncMessage: ghlResult.message,
              ghlOpportunityId: ghlResult.opportunityId || null
            });

            if (ghlResult.success) {
              console.log(`[APPROVAL SYNC] GHL sync success: ${ghlResult.message}`);
              results.ghlSynced++;
            } else {
              console.log(`[APPROVAL SYNC] GHL sync skipped: ${ghlResult.message}`);
              results.ghlSkipped++;
            }
          } catch (ghlError: any) {
            console.error(`[APPROVAL SYNC] GHL sync error for ${row.businessName}:`, ghlError);
            // Save error status to database
            await storage.updateLenderApproval(approval.id, {
              ghlSynced: false,
              ghlSyncedAt: new Date(),
              ghlSyncMessage: `Error: ${ghlError.message || 'Unknown error'}`
            });
            results.ghlErrors++;
          }

        } catch (rowError) {
          console.error(`[APPROVAL SYNC] Error processing row ${row.rowId}:`, rowError);
          results.errors++;
        }
      }

      console.log(`[APPROVAL SYNC] Complete. New: ${results.newApprovals}, Updated: ${results.updated}, Skipped: ${results.skipped}, Errors: ${results.errors}, GHL Synced: ${results.ghlSynced}, GHL Skipped: ${results.ghlSkipped}`);
      
      res.json(results);
      
    } catch (error) {
      console.error("[APPROVAL SYNC] Error during sync:", error);
      res.status(500).json({ error: "Failed to sync approvals from Google Sheets" });
    }
  });

  // Update approval status (admin only)
  app.patch("/api/approvals/:id", async (req, res) => {
    const user = (req.session as any)?.user;
    if (!user?.isAuthenticated) {
      return res.status(401).json({ error: "Authentication required" });
    }
    if (user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    try {
      const { id } = req.params;
      const updates = req.body;
      
      const updated = await storage.updateLenderApproval(id, updates);
      if (!updated) {
        return res.status(404).json({ error: "Approval not found" });
      }
      
      res.json(updated);
    } catch (error) {
      console.error("[APPROVALS] Error updating approval:", error);
      res.status(500).json({ error: "Failed to update approval" });
    }
  });

  // Get approval statistics (admin only)
  app.get("/api/approvals/stats", async (req, res) => {
    const user = (req.session as any)?.user;
    if (!user?.isAuthenticated) {
      return res.status(401).json({ error: "Authentication required" });
    }
    if (user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    try {
      const approvals = await storage.getAllLenderApprovals();
      
      // Calculate stats
      const totalApprovals = approvals.length;
      const pendingApprovals = approvals.filter(a => a.status === "pending").length;
      const acceptedApprovals = approvals.filter(a => a.status === "accepted").length;
      const totalApprovedAmount = approvals.reduce((sum, a) => sum + (parseFloat(a.approvedAmount?.toString() || "0") || 0), 0);
      
      // Unique businesses and lenders
      const uniqueBusinesses = new Set(approvals.map(a => a.businessName)).size;
      const uniqueLenders = new Set(approvals.map(a => a.lenderName)).size;
      
      res.json({
        totalApprovals,
        pendingApprovals,
        acceptedApprovals,
        totalApprovedAmount,
        uniqueBusinesses,
        uniqueLenders
      });
    } catch (error) {
      console.error("[APPROVALS] Error fetching stats:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  const httpServer = createServer(app);

  // Schedule hourly approval syncs from Google Sheets
  const SCAN_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
  
  async function runScheduledSync() {
    console.log("[SCHEDULED SYNC] Running hourly Google Sheets approval sync...");
    
    try {
      const isSheetsConfigured = await googleSheetsService.isConfigured();
      if (!isSheetsConfigured) {
        console.log("[SCHEDULED SYNC] Google Sheets not configured, skipping sync");
        return;
      }
      
      // Fetch all approvals from Google Sheets
      const sheetApprovals = await googleSheetsService.fetchApprovals();
      console.log(`[SCHEDULED SYNC] Found ${sheetApprovals.length} approvals in sheet`);
      
      let newApprovals = 0;
      let updatedApprovals = 0;
      let ghlSynced = 0;
      let ghlSkipped = 0;

      for (const row of sheetApprovals) {
        try {
          // Check if already processed
          const existing = await storage.getLenderApprovalByEmailId(row.rowId);

          if (existing) {
            // Check if any data has changed and update if needed
            const updates: any = {};
            if (row.approvedAmount && row.approvedAmount !== existing.approvedAmount?.toString()) {
              updates.approvedAmount = googleSheetsService.parseAmount(row.approvedAmount);
            }
            if (row.status && row.status.toLowerCase() !== existing.status) {
              updates.status = row.status.toLowerCase();
            }

            if (Object.keys(updates).length > 0) {
              await storage.updateLenderApproval(existing.id, updates);
              updatedApprovals++;

              // If status changed to approved/denied, sync to GHL
              if (updates.status && (updates.status === 'approved' || updates.status === 'denied' || updates.status === 'declined')) {
                try {
                  const ghlResult = await ghlService.syncApprovalToOpportunity({
                    businessName: row.businessName,
                    lenderName: row.lenderName,
                    status: updates.status,
                    approvedAmount: row.approvedAmount,
                    termLength: row.termLength,
                    factorRate: row.factorRate,
                    paybackAmount: row.paybackAmount,
                    paymentAmount: row.paymentAmount,
                    paymentFrequency: row.paymentFrequency,
                    productType: row.productType
                  });
                  // Save GHL sync status
                  await storage.updateLenderApproval(existing.id, {
                    ghlSynced: ghlResult.success,
                    ghlSyncedAt: new Date(),
                    ghlSyncMessage: ghlResult.message,
                    ghlOpportunityId: ghlResult.opportunityId || null
                  });
                  if (ghlResult.success) ghlSynced++;
                  else ghlSkipped++;
                } catch (ghlError: any) {
                  console.error(`[SCHEDULED SYNC] GHL sync error:`, ghlError);
                  await storage.updateLenderApproval(existing.id, {
                    ghlSynced: false,
                    ghlSyncedAt: new Date(),
                    ghlSyncMessage: `Error: ${ghlError.message || 'Unknown error'}`
                  });
                }
              }
            }
            continue;
          }

          // Create new approval
          const newApproval = await storage.createLenderApproval({
            businessName: row.businessName,
            businessEmail: row.businessEmail || null,
            lenderName: row.lenderName,
            lenderEmail: row.lenderEmail || null,
            approvedAmount: googleSheetsService.parseAmount(row.approvedAmount),
            termLength: row.termLength || null,
            factorRate: row.factorRate || null,
            paybackAmount: googleSheetsService.parseAmount(row.paybackAmount),
            paymentFrequency: row.paymentFrequency || null,
            paymentAmount: googleSheetsService.parseAmount(row.paymentAmount),
            interestRate: row.interestRate || null,
            productType: row.productType || null,
            status: row.status?.toLowerCase() || "pending",
            expirationDate: row.expirationDate || null,
            conditions: row.conditions || null,
            notes: row.notes || null,
            emailId: row.rowId,
            emailSubject: `Google Sheets Import - Row ${row.rowId}`,
            emailReceivedAt: googleSheetsService.parseDate(row.dateReceived) || new Date(),
            rawEmailContent: null
          });
          newApprovals++;

          // Sync new approval to GHL opportunity (if status is approved/denied)
          try {
            const ghlResult = await ghlService.syncApprovalToOpportunity({
              businessName: row.businessName,
              lenderName: row.lenderName,
              status: row.status || 'pending',
              approvedAmount: row.approvedAmount,
              termLength: row.termLength,
              factorRate: row.factorRate,
              paybackAmount: row.paybackAmount,
              paymentAmount: row.paymentAmount,
              paymentFrequency: row.paymentFrequency,
              productType: row.productType
            });
            // Save GHL sync status
            await storage.updateLenderApproval(newApproval.id, {
              ghlSynced: ghlResult.success,
              ghlSyncedAt: new Date(),
              ghlSyncMessage: ghlResult.message,
              ghlOpportunityId: ghlResult.opportunityId || null
            });
            if (ghlResult.success) ghlSynced++;
            else ghlSkipped++;
          } catch (ghlError: any) {
            console.error(`[SCHEDULED SYNC] GHL sync error:`, ghlError);
            await storage.updateLenderApproval(newApproval.id, {
              ghlSynced: false,
              ghlSyncedAt: new Date(),
              ghlSyncMessage: `Error: ${ghlError.message || 'Unknown error'}`
            });
          }
        } catch (rowError) {
          console.error(`[SCHEDULED SYNC] Error processing row:`, rowError);
        }
      }

      console.log(`[SCHEDULED SYNC] Complete. New: ${newApprovals}, Updated: ${updatedApprovals}, GHL Synced: ${ghlSynced}, GHL Skipped: ${ghlSkipped}`);
      
    } catch (error) {
      console.error("[SCHEDULED SYNC] Error during scheduled sync:", error);
    }
  }
  
  // Start the scheduled sync (runs every hour)
  setInterval(runScheduledSync, SCAN_INTERVAL_MS);
  console.log("[STARTUP] Hourly Google Sheets approval sync scheduled");

  // ========================================
  // REP CONSOLE ROUTES
  // ========================================

  /**
   * GET /api/rep-console/search
   *
   * Search for contacts by email, phone, or name.
   * Used for quick contact lookup in the Rep Console.
   *
   * IMPORTANT: This route must be defined BEFORE /:contactId to avoid
   * "search" being matched as a contactId parameter.
   */
  app.get("/api/rep-console/search", async (req, res) => {
    try {
      // Check authentication
      const user = req.session?.user;
      if (!user?.isAuthenticated || (user.role !== 'admin' && user.role !== 'agent')) {
        return res.status(401).json({
          success: false,
          error: "Unauthorized"
        });
      }

      const query = req.query.q as string;
      if (!query || query.length < 2) {
        return res.status(400).json({
          success: false,
          error: "Search query must be at least 2 characters"
        });
      }

      // Search in local database first (faster)
      const localResults = await storage.getLoanApplicationByEmailOrPhone(query);

      return res.json({
        success: true,
        data: {
          localMatch: localResults ? {
            id: localResults.id,
            email: localResults.email,
            phone: localResults.phone,
            businessName: localResults.businessName || localResults.legalBusinessName,
            fullName: localResults.fullName,
            ghlContactId: localResults.ghlContactId
          } : null
        }
      });

    } catch (error: any) {
      console.error("[REP CONSOLE SEARCH] Error:", error);
      return res.status(500).json({
        success: false,
        error: "Search failed"
      });
    }
  });

  /**
   * GET /api/rep-console/smart-lists
   *
   * Get all available smart lists with contact counts for the agent call queue.
   * NOTE: This MUST be defined BEFORE the :contactId wildcard route
   */
  app.get("/api/rep-console/smart-lists", async (req, res) => {
    try {
      const user = req.session?.user;
      if (!user?.isAuthenticated || (user.role !== 'admin' && user.role !== 'agent')) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }

      const result = await repConsoleService.getSmartLists();
      return res.json({ success: true, data: result });

    } catch (error: any) {
      console.error("[REP CONSOLE SMART LISTS] Error:", error);
      return res.status(500).json({ success: false, error: error.message || "Failed to fetch smart lists" });
    }
  });

  /**
   * GET /api/rep-console/smart-lists/:listId
   *
   * Get contacts for a specific smart list.
   * NOTE: This MUST be defined BEFORE the :contactId wildcard route
   */
  app.get("/api/rep-console/smart-lists/:listId", async (req, res) => {
    try {
      const user = req.session?.user;
      if (!user?.isAuthenticated || (user.role !== 'admin' && user.role !== 'agent')) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }

      const { listId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;

      const result = await repConsoleService.getSmartListContacts(listId, limit);
      return res.json({ success: true, data: result });

    } catch (error: any) {
      console.error("[REP CONSOLE SMART LIST CONTACTS] Error:", error);
      return res.status(500).json({ success: false, error: error.message || "Failed to fetch list contacts" });
    }
  });

  /**
   * GET /api/rep-console/:contactId
   *
   * Aggregates all contact data from GoHighLevel into a unified Contact360 view.
   * Returns: contact info, active opportunity, tasks, notes, conversations, lender approvals.
   *
   * Query params:
   * - locationId (optional): GHL location ID. Falls back to env var if not provided.
   */
  app.get("/api/rep-console/:contactId", async (req, res) => {
    try {
      // Check authentication (admin or agent role)
      const user = req.session?.user;
      if (!user?.isAuthenticated || (user.role !== 'admin' && user.role !== 'agent')) {
        return res.status(401).json({
          success: false,
          error: "Unauthorized. Must be logged in as admin or agent."
        });
      }

      const { contactId } = req.params;
      const locationId = req.query.locationId as string | undefined;

      if (!contactId) {
        return res.status(400).json({
          success: false,
          error: "Contact ID is required"
        });
      }

      console.log(`[REP CONSOLE] Fetching Contact360 for ${contactId}`);
      const contact360 = await repConsoleService.getContact360(contactId, locationId);

      return res.json({
        success: true,
        data: contact360
      });

    } catch (error: any) {
      console.error("[REP CONSOLE] Error fetching Contact360:", error);

      if (error.message?.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: "Contact not found"
        });
      }

      if (error.message?.includes('not configured')) {
        return res.status(503).json({
          success: false,
          error: "GoHighLevel integration not configured"
        });
      }

      return res.status(500).json({
        success: false,
        error: error.message || "Failed to fetch contact data"
      });
    }
  });

  /**
   * POST /api/rep-console/smart-search
   *
   * Natural language contact search using AI to parse queries.
   * Returns a list of contacts matching the parsed criteria.
   */
  app.post("/api/rep-console/smart-search", async (req, res) => {
    try {
      // Check authentication
      const user = req.session?.user;
      if (!user?.isAuthenticated || (user.role !== 'admin' && user.role !== 'agent')) {
        return res.status(401).json({
          success: false,
          error: "Unauthorized"
        });
      }

      const { query } = req.body;
      if (!query || typeof query !== 'string' || query.length < 2) {
        return res.status(400).json({
          success: false,
          error: "Query must be at least 2 characters"
        });
      }

      console.log(`[REP CONSOLE] Smart search query: "${query}"`);

      // Parse the natural language query using AI
      const parsed = await parseContactSearchQuery(query);
      console.log(`[REP CONSOLE] Parsed query:`, parsed);

      // Execute the search based on parsed criteria
      let searchResults;
      
      if (parsed.searchType === 'tags' && parsed.tags && parsed.tags.length > 0) {
        searchResults = await repConsoleService.searchContactsByTags(
          parsed.tags,
          parsed.limit || 25
        );
      } else {
        searchResults = await repConsoleService.searchContacts({
          query: parsed.query || undefined,
          tags: parsed.tags || undefined,
          limit: parsed.limit || 25
        });
      }

      return res.json({
        success: true,
        data: {
          contacts: searchResults.contacts,
          total: searchResults.total,
          hasMore: searchResults.hasMore,
          parsedQuery: parsed
        }
      });

    } catch (error: any) {
      console.error("[REP CONSOLE SMART SEARCH] Error:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Smart search failed"
      });
    }
  });

  /**
   * GET /api/rep-console/contacts
   *
   * List contacts with optional filters for manual/structured search.
   */
  app.get("/api/rep-console/contacts", async (req, res) => {
    try {
      // Check authentication
      const user = req.session?.user;
      if (!user?.isAuthenticated || (user.role !== 'admin' && user.role !== 'agent')) {
        return res.status(401).json({
          success: false,
          error: "Unauthorized"
        });
      }

      const query = req.query.q as string | undefined;
      const tags = req.query.tags ? (req.query.tags as string).split(',') : undefined;
      const limit = parseInt(req.query.limit as string) || 25;

      const searchResults = await repConsoleService.searchContacts({
        query,
        tags,
        limit: Math.min(limit, 100)
      });

      return res.json({
        success: true,
        data: searchResults
      });

    } catch (error: any) {
      console.error("[REP CONSOLE CONTACTS] Error:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Failed to fetch contacts"
      });
    }
  });

  /**
   * POST /api/rep-console/:contactId/notes
   *
   * Add a note to a contact.
   */
  app.post("/api/rep-console/:contactId/notes", async (req, res) => {
    try {
      const user = req.session?.user;
      if (!user?.isAuthenticated || (user.role !== 'admin' && user.role !== 'agent')) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }

      const { contactId } = req.params;
      const { body } = req.body;

      if (!body || typeof body !== 'string') {
        return res.status(400).json({ success: false, error: "Note body is required" });
      }

      const result = await repConsoleService.addNoteToContact(contactId, body);
      
      if (result.success) {
        return res.json({ success: true, data: { noteId: result.noteId } });
      } else {
        return res.status(500).json({ success: false, error: result.error });
      }

    } catch (error: any) {
      console.error("[REP CONSOLE ADD NOTE] Error:", error);
      return res.status(500).json({ success: false, error: error.message || "Failed to add note" });
    }
  });

  /**
   * POST /api/rep-console/:contactId/tasks
   *
   * Create a task for a contact.
   */
  app.post("/api/rep-console/:contactId/tasks", async (req, res) => {
    try {
      const user = req.session?.user;
      if (!user?.isAuthenticated || (user.role !== 'admin' && user.role !== 'agent')) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }

      const { contactId } = req.params;
      const { title, dueDate, description } = req.body;

      if (!title || typeof title !== 'string') {
        return res.status(400).json({ success: false, error: "Task title is required" });
      }
      if (!dueDate) {
        return res.status(400).json({ success: false, error: "Due date is required" });
      }

      const result = await repConsoleService.createTaskForContact(contactId, title, dueDate, description);
      
      if (result.success) {
        return res.json({ success: true, data: { taskId: result.taskId } });
      } else {
        return res.status(500).json({ success: false, error: result.error });
      }

    } catch (error: any) {
      console.error("[REP CONSOLE CREATE TASK] Error:", error);
      return res.status(500).json({ success: false, error: error.message || "Failed to create task" });
    }
  });

  /**
   * POST /api/rep-console/:contactId/tags
   *
   * Add a tag to a contact.
   */
  app.post("/api/rep-console/:contactId/tags", async (req, res) => {
    try {
      const user = req.session?.user;
      if (!user?.isAuthenticated || (user.role !== 'admin' && user.role !== 'agent')) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }

      const { contactId } = req.params;
      const { tag } = req.body;

      if (!tag || typeof tag !== 'string') {
        return res.status(400).json({ success: false, error: "Tag is required" });
      }

      const result = await repConsoleService.addTagToContact(contactId, tag);
      
      if (result.success) {
        return res.json({ success: true });
      } else {
        return res.status(500).json({ success: false, error: result.error });
      }

    } catch (error: any) {
      console.error("[REP CONSOLE ADD TAG] Error:", error);
      return res.status(500).json({ success: false, error: error.message || "Failed to add tag" });
    }
  });

  /**
   * POST /api/rep-console/command
   *
   * Parse a natural language command and optionally execute it.
   * Supports search, add_note, create_task, add_tag intents.
   */
  app.post("/api/rep-console/command", async (req, res) => {
    try {
      const user = req.session?.user;
      if (!user?.isAuthenticated || (user.role !== 'admin' && user.role !== 'agent')) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }

      const { command, contactId, contactName, execute } = req.body;

      if (!command || typeof command !== 'string' || command.length < 2) {
        return res.status(400).json({ success: false, error: "Command must be at least 2 characters" });
      }

      console.log(`[REP CONSOLE COMMAND] Input: "${command}", Contact: ${contactName || 'none'}`);

      // Parse the command
      const parsed = await parseRepConsoleCommand(command, contactName);
      console.log(`[REP CONSOLE COMMAND] Parsed:`, parsed);

      // If execute is true and we have a contactId, execute the action
      if (execute && contactId && !parsed.requiresConfirmation) {
        let actionResult = null;

        switch (parsed.intent) {
          case 'add_note':
            if (parsed.actionParams?.noteBody) {
              actionResult = await repConsoleService.addNoteToContact(contactId, parsed.actionParams.noteBody);
            }
            break;
          case 'create_task':
            if (parsed.actionParams?.taskTitle && parsed.actionParams?.taskDueDate) {
              actionResult = await repConsoleService.createTaskForContact(
                contactId,
                parsed.actionParams.taskTitle,
                parsed.actionParams.taskDueDate
              );
            }
            break;
          case 'add_tag':
            if (parsed.actionParams?.tagName) {
              actionResult = await repConsoleService.addTagToContact(contactId, parsed.actionParams.tagName);
            }
            break;
        }

        return res.json({
          success: true,
          data: {
            parsed,
            executed: !!actionResult,
            actionResult
          }
        });
      }

      // Just return the parsed command for preview/confirmation
      return res.json({
        success: true,
        data: { parsed, executed: false }
      });

    } catch (error: any) {
      console.error("[REP CONSOLE COMMAND] Error:", error);
      return res.status(500).json({ success: false, error: error.message || "Command processing failed" });
    }
  });

  // ========================================
  // REP CONSOLE - ENHANCED GHL INTEGRATION
  // ========================================

  /**
   * GET /api/rep-console/pipelines
   * Get all pipelines with their stages
   */
  app.get("/api/rep-console/pipelines", async (req, res) => {
    try {
      const user = req.session?.user;
      if (!user?.isAuthenticated || (user.role !== 'admin' && user.role !== 'agent')) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }

      const result = await repConsoleService.getAllPipelines();
      return res.json({ success: true, pipelines: result.pipelines });

    } catch (error: any) {
      console.error("[REP CONSOLE PIPELINES] Error:", error);
      return res.status(500).json({ success: false, error: error.message || "Failed to fetch pipelines" });
    }
  });

  /**
   * PUT /api/rep-console/:contactId/tasks/:taskId
   * Update task (mark complete/incomplete)
   */
  app.put("/api/rep-console/:contactId/tasks/:taskId", async (req, res) => {
    try {
      const user = req.session?.user;
      if (!user?.isAuthenticated || (user.role !== 'admin' && user.role !== 'agent')) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }

      const { contactId, taskId } = req.params;
      const { completed } = req.body;

      if (typeof completed !== 'boolean') {
        return res.status(400).json({ success: false, error: "completed (boolean) is required" });
      }

      const result = await repConsoleService.updateTaskStatus(contactId, taskId, completed);

      if (result.success) {
        return res.json({ success: true });
      } else {
        return res.status(500).json({ success: false, error: result.error });
      }

    } catch (error: any) {
      console.error("[REP CONSOLE UPDATE TASK] Error:", error);
      return res.status(500).json({ success: false, error: error.message || "Failed to update task" });
    }
  });

  /**
   * DELETE /api/rep-console/:contactId/tasks/:taskId
   * Delete a task
   */
  app.delete("/api/rep-console/:contactId/tasks/:taskId", async (req, res) => {
    try {
      const user = req.session?.user;
      if (!user?.isAuthenticated || (user.role !== 'admin' && user.role !== 'agent')) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }

      const { contactId, taskId } = req.params;
      const result = await repConsoleService.deleteTask(contactId, taskId);

      if (result.success) {
        return res.json({ success: true });
      } else {
        return res.status(500).json({ success: false, error: result.error });
      }

    } catch (error: any) {
      console.error("[REP CONSOLE DELETE TASK] Error:", error);
      return res.status(500).json({ success: false, error: error.message || "Failed to delete task" });
    }
  });

  /**
   * PUT /api/rep-console/:contactId/notes/:noteId
   * Update a note
   */
  app.put("/api/rep-console/:contactId/notes/:noteId", async (req, res) => {
    try {
      const user = req.session?.user;
      if (!user?.isAuthenticated || (user.role !== 'admin' && user.role !== 'agent')) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }

      const { contactId, noteId } = req.params;
      const { body } = req.body;

      if (!body || typeof body !== 'string') {
        return res.status(400).json({ success: false, error: "body (string) is required" });
      }

      const result = await repConsoleService.updateNote(contactId, noteId, body);

      if (result.success) {
        return res.json({ success: true });
      } else {
        return res.status(500).json({ success: false, error: result.error });
      }

    } catch (error: any) {
      console.error("[REP CONSOLE UPDATE NOTE] Error:", error);
      return res.status(500).json({ success: false, error: error.message || "Failed to update note" });
    }
  });

  /**
   * DELETE /api/rep-console/:contactId/notes/:noteId
   * Delete a note
   */
  app.delete("/api/rep-console/:contactId/notes/:noteId", async (req, res) => {
    try {
      const user = req.session?.user;
      if (!user?.isAuthenticated || (user.role !== 'admin' && user.role !== 'agent')) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }

      const { contactId, noteId } = req.params;
      const result = await repConsoleService.deleteNote(contactId, noteId);

      if (result.success) {
        return res.json({ success: true });
      } else {
        return res.status(500).json({ success: false, error: result.error });
      }

    } catch (error: any) {
      console.error("[REP CONSOLE DELETE NOTE] Error:", error);
      return res.status(500).json({ success: false, error: error.message || "Failed to delete note" });
    }
  });

  /**
   * DELETE /api/rep-console/:contactId/tags/:tag
   * Remove a tag from contact
   */
  app.delete("/api/rep-console/:contactId/tags/:tag", async (req, res) => {
    try {
      const user = req.session?.user;
      if (!user?.isAuthenticated || (user.role !== 'admin' && user.role !== 'agent')) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }

      const { contactId, tag } = req.params;
      const result = await repConsoleService.removeTagFromContact(contactId, decodeURIComponent(tag));

      if (result.success) {
        return res.json({ success: true });
      } else {
        return res.status(500).json({ success: false, error: result.error });
      }

    } catch (error: any) {
      console.error("[REP CONSOLE REMOVE TAG] Error:", error);
      return res.status(500).json({ success: false, error: error.message || "Failed to remove tag" });
    }
  });

  /**
   * PUT /api/rep-console/:contactId
   * Update contact fields
   */
  app.put("/api/rep-console/:contactId", async (req, res) => {
    try {
      const user = req.session?.user;
      if (!user?.isAuthenticated || (user.role !== 'admin' && user.role !== 'agent')) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }

      const { contactId } = req.params;
      const { firstName, lastName, email, phone, companyName, address1, city, state, postalCode } = req.body;

      const updates: any = {};
      if (firstName !== undefined) updates.firstName = firstName;
      if (lastName !== undefined) updates.lastName = lastName;
      if (email !== undefined) updates.email = email;
      if (phone !== undefined) updates.phone = phone;
      if (companyName !== undefined) updates.companyName = companyName;
      if (address1 !== undefined) updates.address1 = address1;
      if (city !== undefined) updates.city = city;
      if (state !== undefined) updates.state = state;
      if (postalCode !== undefined) updates.postalCode = postalCode;

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ success: false, error: "No fields to update" });
      }

      const result = await repConsoleService.updateContact(contactId, updates);

      if (result.success) {
        return res.json({ success: true });
      } else {
        return res.status(500).json({ success: false, error: result.error });
      }

    } catch (error: any) {
      console.error("[REP CONSOLE UPDATE CONTACT] Error:", error);
      return res.status(500).json({ success: false, error: error.message || "Failed to update contact" });
    }
  });

  /**
   * PUT /api/rep-console/opportunities/:opportunityId/stage
   * Update opportunity pipeline stage
   */
  app.put("/api/rep-console/opportunities/:opportunityId/stage", async (req, res) => {
    try {
      const user = req.session?.user;
      if (!user?.isAuthenticated || (user.role !== 'admin' && user.role !== 'agent')) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }

      const { opportunityId } = req.params;
      const { pipelineStageId } = req.body;

      if (!pipelineStageId || typeof pipelineStageId !== 'string') {
        return res.status(400).json({ success: false, error: "pipelineStageId is required" });
      }

      const result = await repConsoleService.updateOpportunityStage(opportunityId, pipelineStageId);

      if (result.success) {
        return res.json({ success: true });
      } else {
        return res.status(500).json({ success: false, error: result.error });
      }

    } catch (error: any) {
      console.error("[REP CONSOLE UPDATE STAGE] Error:", error);
      return res.status(500).json({ success: false, error: error.message || "Failed to update stage" });
    }
  });

  /**
   * PUT /api/rep-console/opportunities/:opportunityId/status
   * Update opportunity status (open, won, lost, abandoned)
   */
  app.put("/api/rep-console/opportunities/:opportunityId/status", async (req, res) => {
    try {
      const user = req.session?.user;
      if (!user?.isAuthenticated || (user.role !== 'admin' && user.role !== 'agent')) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }

      const { opportunityId } = req.params;
      const { status } = req.body;

      if (!status || !['open', 'won', 'lost', 'abandoned'].includes(status)) {
        return res.status(400).json({ success: false, error: "status must be one of: open, won, lost, abandoned" });
      }

      const result = await repConsoleService.updateOpportunityStatus(opportunityId, status);

      if (result.success) {
        return res.json({ success: true });
      } else {
        return res.status(500).json({ success: false, error: result.error });
      }

    } catch (error: any) {
      console.error("[REP CONSOLE UPDATE STATUS] Error:", error);
      return res.status(500).json({ success: false, error: error.message || "Failed to update status" });
    }
  });

  /**
   * PUT /api/rep-console/opportunities/:opportunityId/value
   * Update opportunity monetary value
   */
  app.put("/api/rep-console/opportunities/:opportunityId/value", async (req, res) => {
    try {
      const user = req.session?.user;
      if (!user?.isAuthenticated || (user.role !== 'admin' && user.role !== 'agent')) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }

      const { opportunityId } = req.params;
      const { monetaryValue } = req.body;

      if (typeof monetaryValue !== 'number' || monetaryValue < 0) {
        return res.status(400).json({ success: false, error: "monetaryValue (number >= 0) is required" });
      }

      const result = await repConsoleService.updateOpportunityValue(opportunityId, monetaryValue);

      if (result.success) {
        return res.json({ success: true });
      } else {
        return res.status(500).json({ success: false, error: result.error });
      }

    } catch (error: any) {
      console.error("[REP CONSOLE UPDATE VALUE] Error:", error);
      return res.status(500).json({ success: false, error: error.message || "Failed to update value" });
    }
  });

  /**
   * PUT /api/rep-console/opportunities/:opportunityId/next-action
   * Update opportunity next action and due date
   */
  app.put("/api/rep-console/opportunities/:opportunityId/next-action", async (req, res) => {
    try {
      const user = req.session?.user;
      if (!user?.isAuthenticated || (user.role !== 'admin' && user.role !== 'agent')) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }

      const { opportunityId } = req.params;
      const { nextAction, nextActionDue } = req.body;

      // Update custom fields on the opportunity
      const result = await repConsoleService.updateOpportunityNextAction(opportunityId, nextAction, nextActionDue);

      if (result.success) {
        return res.json({ success: true });
      } else {
        return res.status(500).json({ success: false, error: result.error });
      }

    } catch (error: any) {
      console.error("[REP CONSOLE UPDATE NEXT ACTION] Error:", error);
      return res.status(500).json({ success: false, error: error.message || "Failed to update next action" });
    }
  });

  /**
   * POST /api/rep-console/:contactId/sms
   * Send SMS to contact
   */
  app.post("/api/rep-console/:contactId/sms", async (req, res) => {
    try {
      const user = req.session?.user;
      if (!user?.isAuthenticated || (user.role !== 'admin' && user.role !== 'agent')) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }

      const { contactId } = req.params;
      const { message } = req.body;

      if (!message || typeof message !== 'string') {
        return res.status(400).json({ success: false, error: "message is required" });
      }

      const result = await repConsoleService.sendSMS(contactId, message);

      if (result.success) {
        return res.json({ success: true, messageId: result.messageId });
      } else {
        return res.status(500).json({ success: false, error: result.error });
      }

    } catch (error: any) {
      console.error("[REP CONSOLE SEND SMS] Error:", error);
      return res.status(500).json({ success: false, error: error.message || "Failed to send SMS" });
    }
  });

  /**
   * POST /api/rep-console/:contactId/email
   * Send Email to contact
   */
  app.post("/api/rep-console/:contactId/email", async (req, res) => {
    try {
      const user = req.session?.user;
      if (!user?.isAuthenticated || (user.role !== 'admin' && user.role !== 'agent')) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }

      const { contactId } = req.params;
      const { subject, body } = req.body;

      if (!subject || typeof subject !== 'string') {
        return res.status(400).json({ success: false, error: "subject is required" });
      }
      if (!body || typeof body !== 'string') {
        return res.status(400).json({ success: false, error: "body is required" });
      }

      const result = await repConsoleService.sendEmail(contactId, subject, body);

      if (result.success) {
        return res.json({ success: true, messageId: result.messageId });
      } else {
        return res.status(500).json({ success: false, error: result.error });
      }

    } catch (error: any) {
      console.error("[REP CONSOLE SEND EMAIL] Error:", error);
      return res.status(500).json({ success: false, error: error.message || "Failed to send email" });
    }
  });

  return httpServer;
}
