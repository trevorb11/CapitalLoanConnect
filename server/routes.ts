import type { Express } from "express";
import { createServer, type Server } from "http";
import path from "path";
import { storage } from "./storage";
import { ghlService } from "./services/gohighlevel";
import { plaidService } from "./services/plaid";
import { z } from "zod";
import { db } from "./db";
import { plaidItems, fundingAnalyses } from "@shared/schema";

// Helper function to sanitize application data for database storage
function sanitizeApplicationData(data: any): any {
  const sanitized = { ...data };
  
  console.log('[SANITIZE] Input data:', JSON.stringify(data, null, 2));
  
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
  
  return sanitized;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Get loan application by ID
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
      const applicationData = sanitizeApplicationData(req.body);
      
      // Validate required email field
      if (!applicationData.email) {
        return res.status(400).json({ error: "Email is required" });
      }

      // Check if user already has an incomplete application
      const existingApp = await storage.getLoanApplicationByEmail(applicationData.email);
      if (existingApp && !existingApp.isCompleted) {
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

      // Sync to GoHighLevel
      try {
        const ghlContactId = await ghlService.createOrUpdateContact(application);
        const updatedApp = await storage.updateLoanApplication(application.id, {
          ghlContactId,
        });
        res.json(updatedApp || application);
      } catch (ghlError) {
        console.error("GHL sync error, but application saved:", ghlError);
        res.json(application);
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
      const updates = sanitizeApplicationData(req.body);

      // If either form is being completed, generate agent view URL
      if ((updates.isCompleted || updates.isFullApplicationCompleted) && !updates.agentViewUrl) {
        // Use relative path for agent view URL - works in all environments
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

  // Get all applications (for admin/debugging)
  app.get("/api/applications", async (req, res) => {
    try {
      const applications = await storage.getAllLoanApplications();
      res.json(applications);
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
      // In a real app, use the actual user ID from session
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
      const { publicToken, metadata, businessName, email } = req.body;

      // A. Exchange Token
      const tokenResponse = await plaidService.exchangePublicToken(publicToken);
      
      // B. Save Access Token (CRITICAL: This allows you to pull statements later for lenders)
      await db.insert(plaidItems).values({
        itemId: tokenResponse.item_id,
        accessToken: tokenResponse.access_token,
        institutionName: metadata?.institution?.name || 'Unknown Bank',
      });

      // C. Run Analysis immediately
      const analysis = await plaidService.analyzeFinancials(tokenResponse.access_token);

      // D. Save Lead & Results
      await db.insert(fundingAnalyses).values({
        businessName,
        email,
        calculatedMonthlyRevenue: analysis.metrics.monthlyRevenue.toString(),
        calculatedAvgBalance: analysis.metrics.avgBalance.toString(),
        negativeDaysCount: analysis.metrics.negativeDays,
        analysisResult: analysis.recommendations,
        plaidItemId: tokenResponse.item_id
      });

      // E. Return results to frontend
      res.json(analysis);

    } catch (error) {
      console.error("Plaid Exchange Error:", error);
      res.status(500).json({ error: "Failed to analyze bank data" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
