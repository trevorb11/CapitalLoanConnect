import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import multer from "multer";
import PDFDocument from "pdfkit";
import { storage } from "./storage";
import { ghlService } from "./services/gohighlevel";
import { plaidService } from "./services/plaid";
import { AGENTS } from "../shared/agents";
import { z } from "zod";
import type { LoanApplication } from "@shared/schema";

// Configure multer for bank statement uploads
const UPLOAD_DIR = path.join(process.cwd(), "server/uploads/bank-statements");
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const bankStatementStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const storedName = `${randomUUID()}${ext}`;
    cb(null, storedName);
  },
});

const bankStatementUpload = multer({
  storage: bankStatementStorage,
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
  if (!RECAPTCHA_SECRET_KEY) {
    console.log("[RECAPTCHA] Secret key not configured, skipping verification");
    return { success: true };
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
    console.error("[RECAPTCHA] Verification error:", error);
    return { success: true };
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
  email: z.string().email("Valid email is required")
});

// Helper function to sanitize application data for database storage
function sanitizeApplicationData(data: any): { sanitized: any; recaptchaToken?: string } {
  const { recaptchaToken, ...rest } = data;
  const sanitized = { ...rest };
  
  console.log('[SANITIZE] Input data:', JSON.stringify(rest, null, 2));
  
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
      // Strip non-digit characters (like $ and ,) before parsing
      const digitsOnly = sanitized[field].replace(/\D/g, '');
      const num = parseFloat(digitsOnly);
      sanitized[field] = (digitsOnly && !isNaN(num)) ? num : null;
      console.log(`[SANITIZE] ${field}: "${sanitized[field]}" → digitsOnly: "${digitsOnly}" → num: ${num} → final: ${sanitized[field]}`);
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
  
  return { sanitized, recaptchaToken };
}

export async function registerRoutes(app: Express): Promise<Server> {
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
      return res.json({
        isAuthenticated: true,
        role: req.session.user.role,
        agentEmail: req.session.user.agentEmail,
        agentName: req.session.user.agentName,
      });
    }
    res.json({ isAuthenticated: false });
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
      const { sanitized: applicationData, recaptchaToken } = sanitizeApplicationData(req.body);
      
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
        
        // Update existing application with new data instead of just returning old data
        const updatedApp = await storage.updateLoanApplication(existingApp.id, applicationData);
        
        // Sync to GoHighLevel
        try {
          if (updatedApp && updatedApp.ghlContactId) {
            await ghlService.updateContact(updatedApp.ghlContactId, applicationData);
          } else if (updatedApp) {
            const ghlContactId = await ghlService.createOrUpdateContact(updatedApp);
            const finalApp = await storage.updateLoanApplication(existingApp.id, { ghlContactId });
            return res.json(finalApp || updatedApp);
          }
        } catch (ghlError) {
          console.error("GHL sync error:", ghlError);
        }
        
        return res.json(updatedApp || existingApp);
      }

      // Create new application
      const application = await storage.createLoanApplication(applicationData);

      // Always generate agent view URL for all applications (allows viewing incomplete apps too)
      const agentViewUrl = `/agent/application/${application.id}`;

      // Sync to GoHighLevel
      try {
        const ghlContactId = await ghlService.createOrUpdateContact(application);
        const updatedApp = await storage.updateLoanApplication(application.id, {
          ghlContactId,
          agentViewUrl,
        });
        res.json(updatedApp || application);
      } catch (ghlError) {
        console.error("GHL sync error, but application saved:", ghlError);
        // Still update the agentViewUrl even if GHL sync fails
        const updatedApp = await storage.updateLoanApplication(application.id, { agentViewUrl });
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
      
      // Verify reCAPTCHA if token provided (for final submissions)
      if (recaptchaToken) {
        const recaptchaResult = await verifyRecaptcha(recaptchaToken);
        if (!recaptchaResult.success) {
          console.error("[RECAPTCHA] Verification failed:", recaptchaResult.error);
          return res.status(400).json({ error: "Security verification failed. Please try again." });
        }
        console.log("[RECAPTCHA] Verified successfully, score:", recaptchaResult.score);
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
          
          // Send webhook if either form completed (fire-and-forget, non-blocking)
          if (updatedApp.isCompleted || updatedApp.isFullApplicationCompleted) {
            ghlService.sendWebhook(finalApp || updatedApp).catch(err => 
              console.error("Webhook error (non-blocking):", err)
            );
          }
          
          return res.json(finalApp || updatedApp);
        }
        
        // Send webhook if either form completed (fire-and-forget, non-blocking)
        if (updatedApp.isCompleted || updatedApp.isFullApplicationCompleted) {
          ghlService.sendWebhook(updatedApp).catch(err => 
            console.error("Webhook error (non-blocking):", err)
          );
        }
      } catch (ghlError) {
        console.error("GHL sync error, but application updated:", ghlError);
      }

      res.json(updatedApp);
    } catch (error) {
      console.error("Error updating application:", error);
      res.status(500).json({ error: "Failed to update application" });
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
      
      // Filter based on role
      if (req.session.user.role === 'admin') {
        // Admin sees all applications
        return res.json(allApplications);
      } else if (req.session.user.role === 'agent' && req.session.user.agentEmail) {
        // Agent sees only their applications
        const agentEmail = req.session.user.agentEmail.toLowerCase();
        const filteredApplications = allApplications.filter(
          (app) => (app.agentEmail || '').toLowerCase() === agentEmail
        );
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

  // 2. Handle Successful Link & Analyze
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
      
      const { publicToken, metadata, businessName, email } = validationResult.data;

      // A. Exchange Token
      const tokenResponse = await plaidService.exchangePublicToken(publicToken);
      
      // B. Save Access Token using storage layer
      await storage.createPlaidItem({
        itemId: tokenResponse.item_id,
        accessToken: tokenResponse.access_token,
        institutionName: metadata?.institution?.name || 'Unknown Bank',
      });

      // C. Run Analysis
      const analysis = await plaidService.analyzeFinancials(tokenResponse.access_token);

      // D. Save Results using storage layer
      await storage.createFundingAnalysis({
        businessName,
        email,
        calculatedMonthlyRevenue: analysis.metrics.monthlyRevenue.toString(),
        calculatedAvgBalance: analysis.metrics.avgBalance.toString(),
        negativeDaysCount: analysis.metrics.negativeDays,
        analysisResult: analysis.recommendations,
        plaidItemId: tokenResponse.item_id
      });

      // E. Auto-link to existing application if email matches
      const applications = await storage.getAllLoanApplications();
      const matchingApp = applications.find((app: LoanApplication) => app.email === email);
      if (matchingApp && !matchingApp.plaidItemId) {
        await storage.updateLoanApplication(matchingApp.id, { 
          plaidItemId: tokenResponse.item_id 
        });
        console.log(`Linked Plaid item ${tokenResponse.item_id} to application ${matchingApp.id}`);
      }

      // F. Return results to frontend
      res.json(analysis);

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
        // Clean up uploaded file
        fs.unlinkSync(file.path);
        return res.status(400).json({ error: "Email is required" });
      }

      // Save upload record to database
      const upload = await storage.createBankStatementUpload({
        email,
        businessName: businessName || null,
        loanApplicationId: applicationId || null,
        originalFileName: file.originalname,
        storedFileName: file.filename,
        mimeType: file.mimetype,
        fileSize: file.size,
      });

      // Check if there's a matching application by email
      let linkedApplicationId = applicationId;
      if (!linkedApplicationId) {
        const applications = await storage.getAllLoanApplications();
        const matchingApp = applications.find((app: LoanApplication) => app.email === email);
        if (matchingApp) {
          linkedApplicationId = matchingApp.id;
          console.log(`Auto-linked bank statement upload ${upload.id} to application ${matchingApp.id}`);
        }
      }

      res.json({
        success: true,
        upload: {
          id: upload.id,
          originalFileName: upload.originalFileName,
          fileSize: upload.fileSize,
          createdAt: upload.createdAt,
          linkedApplicationId: linkedApplicationId || null,
        },
      });
    } catch (error) {
      console.error("Bank statement upload error:", error);
      res.status(500).json({ error: "Failed to upload bank statement" });
    }
  });

  // 2. Get all bank statement uploads (for dashboard)
  app.get("/api/bank-statements/uploads", async (req, res) => {
    if (!req.session.user?.isAuthenticated) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const uploads = await storage.getAllBankStatementUploads();
      res.json(uploads);
    } catch (error) {
      console.error("Error fetching bank statement uploads:", error);
      res.status(500).json({ error: "Failed to fetch uploads" });
    }
  });

  // 3. Download bank statement PDF (admin only)
  app.get("/api/bank-statements/download/:id", async (req, res) => {
    if (!req.session.user?.isAuthenticated) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const upload = await storage.getBankStatementUpload(req.params.id);
      if (!upload) {
        return res.status(404).json({ error: "Upload not found" });
      }

      const filePath = path.join(UPLOAD_DIR, upload.storedFileName);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "File not found on disk" });
      }

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${upload.originalFileName}"`
      );
      res.sendFile(filePath);
    } catch (error) {
      console.error("Error downloading bank statement:", error);
      res.status(500).json({ error: "Failed to download file" });
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

  const httpServer = createServer(app);

  return httpServer;
}
