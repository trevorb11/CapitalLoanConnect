import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { ghlService } from "./services/gohighlevel";
import { z } from "zod";

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
      const applicationData = req.body;
      
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
      const updates = req.body;

      const updatedApp = await storage.updateLoanApplication(id, updates);
      
      if (!updatedApp) {
        return res.status(404).json({ error: "Application not found" });
      }

      // Sync to GoHighLevel
      try {
        if (updatedApp.ghlContactId) {
          await ghlService.updateContact(updatedApp.ghlContactId, updates);
        } else {
          const ghlContactId = await ghlService.createOrUpdateContact(updatedApp);
          const finalApp = await storage.updateLoanApplication(id, { ghlContactId });
          return res.json(finalApp || updatedApp);
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

  const httpServer = createServer(app);

  return httpServer;
}
