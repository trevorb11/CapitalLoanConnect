import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import type { Express, Request, Response } from "express";
import { z } from "zod";
import { storage } from "./storage";
import { ghlService } from "./services/gohighlevel";

const MCP_API_KEY = process.env.MCP_API_KEY;

// Active SSE sessions: sessionId -> transport
const sessions = new Map<string, SSEServerTransport>();

function checkApiKey(req: Request, res: Response): boolean {
  if (!MCP_API_KEY) {
    res.status(500).json({ error: "MCP_API_KEY not configured on server" });
    return false;
  }
  const authHeader = req.headers.authorization || "";
  const key = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : req.query.key as string;
  if (key !== MCP_API_KEY) {
    res.status(401).json({ error: "Unauthorized: invalid or missing API key" });
    return false;
  }
  return true;
}

function buildServer(): McpServer {
  const server = new McpServer({
    name: "today-capital-group",
    version: "1.0.0",
  });

  // ──────────────────────────────────────────────
  // LOAN APPLICATIONS
  // ──────────────────────────────────────────────

  server.tool(
    "list_loan_applications",
    "List all loan applications in the database. Optionally filter by status or search by name/email/business.",
    {
      search: z.string().optional().describe("Filter by name, email, phone, or business name"),
      status: z.string().optional().describe("Filter by application status"),
      limit: z.number().optional().default(50).describe("Max results to return (default 50)"),
    },
    async ({ search, status, limit }) => {
      const apps = await storage.getAllLoanApplications();
      let filtered = apps;

      if (search) {
        const q = search.toLowerCase();
        filtered = filtered.filter((a) =>
          [a.firstName, a.lastName, a.email, a.phone, a.businessName, a.companyEmail]
            .some((f) => f && f.toLowerCase().includes(q))
        );
      }
      if (status) {
        filtered = filtered.filter((a) => a.status === status);
      }

      const results = filtered.slice(0, limit ?? 50).map((a) => ({
        id: a.id,
        name: `${a.firstName ?? ""} ${a.lastName ?? ""}`.trim(),
        email: a.email,
        phone: a.phone,
        businessName: a.businessName,
        status: a.status,
        requestedAmount: a.requestedAmount,
        ghlContactId: a.ghlContactId,
        createdAt: a.createdAt,
        step: a.step,
      }));

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ total: filtered.length, returned: results.length, applications: results }, null, 2),
          },
        ],
      };
    }
  );

  server.tool(
    "get_loan_application",
    "Get a single loan application by ID or email address.",
    {
      id: z.string().optional().describe("Application UUID"),
      email: z.string().optional().describe("Applicant email address"),
    },
    async ({ id, email }) => {
      let app;
      if (id) {
        app = await storage.getLoanApplication(id);
      } else if (email) {
        app = await storage.getLoanApplicationByEmail(email);
      } else {
        return { content: [{ type: "text", text: "Error: provide either id or email" }] };
      }
      if (!app) {
        return { content: [{ type: "text", text: "Application not found" }] };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(app, null, 2) }],
      };
    }
  );

  server.tool(
    "update_loan_application_status",
    "Update the status of a loan application.",
    {
      id: z.string().describe("Application UUID"),
      status: z.string().describe("New status value"),
      notes: z.string().optional().describe("Optional internal notes"),
    },
    async ({ id, status, notes }) => {
      const updates: Record<string, string> = { status };
      if (notes) updates.internalNotes = notes;
      const updated = await storage.updateLoanApplication(id, updates as any);
      if (!updated) return { content: [{ type: "text", text: "Application not found" }] };
      return {
        content: [{ type: "text", text: `Updated application ${id} status to "${status}"` }],
      };
    }
  );

  // ──────────────────────────────────────────────
  // LENDER APPROVALS
  // ──────────────────────────────────────────────

  server.tool(
    "list_lender_approvals",
    "List all lender approvals in the database.",
    {
      businessName: z.string().optional().describe("Filter by business name"),
      lender: z.string().optional().describe("Filter by lender name"),
      status: z.string().optional().describe("Filter by overall status (approved/declined/pending)"),
      limit: z.number().optional().default(50).describe("Max results"),
    },
    async ({ businessName, lender, status, limit }) => {
      let approvals = await storage.getAllLenderApprovals();

      if (businessName) {
        const q = businessName.toLowerCase();
        approvals = approvals.filter((a) => a.businessName?.toLowerCase().includes(q));
      }
      if (lender) {
        const q = lender.toLowerCase();
        approvals = approvals.filter((a) => a.lender?.toLowerCase().includes(q));
      }
      if (status) {
        approvals = approvals.filter((a) => a.overallStatus === status);
      }

      const results = approvals.slice(0, limit ?? 50).map((a) => ({
        id: a.id,
        businessName: a.businessName,
        businessEmail: a.businessEmail,
        lender: a.lender,
        advanceAmount: a.advanceAmount,
        factorRate: a.factorRate,
        term: a.term,
        overallStatus: a.overallStatus,
        approvalDate: a.approvalDate,
        publicUrlToken: a.publicUrlToken,
      }));

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ total: approvals.length, returned: results.length, approvals: results }, null, 2),
          },
        ],
      };
    }
  );

  server.tool(
    "get_lender_approval",
    "Get a specific lender approval record by ID or business name.",
    {
      id: z.string().optional().describe("Approval UUID"),
      businessName: z.string().optional().describe("Exact or partial business name"),
    },
    async ({ id, businessName }) => {
      if (id) {
        const approval = await storage.getLenderApproval(id);
        if (!approval) return { content: [{ type: "text", text: "Not found" }] };
        return { content: [{ type: "text", text: JSON.stringify(approval, null, 2) }] };
      }
      if (businessName) {
        const approvals = await storage.getLenderApprovalsByBusinessName(businessName);
        return {
          content: [{ type: "text", text: JSON.stringify(approvals, null, 2) }],
        };
      }
      return { content: [{ type: "text", text: "Error: provide id or businessName" }] };
    }
  );

  // ──────────────────────────────────────────────
  // BANK STATEMENT UPLOADS
  // ──────────────────────────────────────────────

  server.tool(
    "list_bank_statement_uploads",
    "List all bank statement uploads.",
    {
      email: z.string().optional().describe("Filter by applicant email"),
      limit: z.number().optional().default(50).describe("Max results"),
    },
    async ({ email, limit }) => {
      let uploads;
      if (email) {
        uploads = await storage.getBankStatementUploadsByEmail(email);
      } else {
        uploads = await storage.getAllBankStatementUploads();
      }
      const results = (uploads ?? []).slice(0, limit ?? 50).map((u: any) => ({
        id: u.id,
        email: u.email,
        businessName: u.businessName,
        agentEmail: u.agentEmail,
        approvalStatus: u.approvalStatus,
        createdAt: u.createdAt,
        hasFiles: !!(u.fileKey || u.fileKeys),
      }));
      return {
        content: [{ type: "text", text: JSON.stringify({ total: results.length, uploads: results }, null, 2) }],
      };
    }
  );

  // ──────────────────────────────────────────────
  // DATABASE STATS
  // ──────────────────────────────────────────────

  server.tool(
    "get_database_stats",
    "Get a summary of all key metrics in the database: application counts, approval counts, uploads, etc.",
    {},
    async () => {
      const [apps, approvals, uploads] = await Promise.all([
        storage.getAllLoanApplications(),
        storage.getAllLenderApprovals(),
        storage.getAllBankStatementUploads(),
      ]);

      const statusCounts: Record<string, number> = {};
      for (const a of apps) {
        const s = a.status ?? "unknown";
        statusCounts[s] = (statusCounts[s] ?? 0) + 1;
      }

      const approvalStatusCounts: Record<string, number> = {};
      for (const a of approvals) {
        const s = a.overallStatus ?? "unknown";
        approvalStatusCounts[s] = (approvalStatusCounts[s] ?? 0) + 1;
      }

      const stats = {
        loanApplications: {
          total: apps.length,
          byStatus: statusCounts,
        },
        lenderApprovals: {
          total: approvals.length,
          byStatus: approvalStatusCounts,
        },
        bankStatementUploads: {
          total: uploads.length,
        },
        generatedAt: new Date().toISOString(),
      };

      return {
        content: [{ type: "text", text: JSON.stringify(stats, null, 2) }],
      };
    }
  );

  // ──────────────────────────────────────────────
  // GOHIGHLEVEL TOOLS
  // ──────────────────────────────────────────────

  server.tool(
    "ghl_search_contact",
    "Search for a contact in GoHighLevel by email, phone, or business name.",
    {
      email: z.string().optional().describe("Contact email"),
      phone: z.string().optional().describe("Contact phone number"),
      businessName: z.string().optional().describe("Business name to search"),
    },
    async ({ email, phone, businessName }) => {
      try {
        if (businessName) {
          const contactId = await ghlService.searchContactByBusinessName(businessName);
          if (!contactId) return { content: [{ type: "text", text: "No GHL contact found for that business name" }] };
          return { content: [{ type: "text", text: JSON.stringify({ contactId }, null, 2) }] };
        }
        if (email || phone) {
          // Use repConsoleService if available, otherwise fall back to application lookup
          const app = email
            ? await storage.getLoanApplicationByEmail(email)
            : await storage.getLoanApplicationByEmailOrPhone(phone!);
          if (!app?.ghlContactId) {
            return { content: [{ type: "text", text: "No GHL contact ID linked to that record" }] };
          }
          return {
            content: [{ type: "text", text: JSON.stringify({ contactId: app.ghlContactId, applicationId: app.id }, null, 2) }],
          };
        }
        return { content: [{ type: "text", text: "Error: provide email, phone, or businessName" }] };
      } catch (err: any) {
        return { content: [{ type: "text", text: `GHL error: ${err.message}` }] };
      }
    }
  );

  server.tool(
    "ghl_get_opportunities",
    "Get all open opportunities (deals) for a GHL contact by their contact ID.",
    {
      contactId: z.string().describe("GHL contact ID"),
    },
    async ({ contactId }) => {
      try {
        const opps = await ghlService.searchOpportunitiesByContact(contactId);
        return {
          content: [{ type: "text", text: JSON.stringify({ count: opps.length, opportunities: opps }, null, 2) }],
        };
      } catch (err: any) {
        return { content: [{ type: "text", text: `GHL error: ${err.message}` }] };
      }
    }
  );

  server.tool(
    "ghl_get_opportunity",
    "Get full details for a single GHL opportunity by its ID.",
    {
      opportunityId: z.string().describe("GHL opportunity ID"),
    },
    async ({ opportunityId }) => {
      try {
        const opp = await ghlService.getOpportunity(opportunityId);
        if (!opp) return { content: [{ type: "text", text: "Opportunity not found" }] };
        return { content: [{ type: "text", text: JSON.stringify(opp, null, 2) }] };
      } catch (err: any) {
        return { content: [{ type: "text", text: `GHL error: ${err.message}` }] };
      }
    }
  );

  server.tool(
    "ghl_update_opportunity",
    "Update custom fields on a GHL opportunity.",
    {
      opportunityId: z.string().describe("GHL opportunity ID"),
      fields: z.record(z.any()).describe("Key-value map of field IDs (or names) to new values"),
    },
    async ({ opportunityId, fields }) => {
      try {
        await ghlService.updateOpportunityCustomFields(opportunityId, fields);
        return { content: [{ type: "text", text: `Updated opportunity ${opportunityId}` }] };
      } catch (err: any) {
        return { content: [{ type: "text", text: `GHL error: ${err.message}` }] };
      }
    }
  );

  server.tool(
    "ghl_sync_approval_to_opportunity",
    "Sync a lender approval record from the database into the matching GHL opportunity.",
    {
      approvalId: z.string().describe("Lender approval record ID from the database"),
    },
    async ({ approvalId }) => {
      try {
        const approval = await storage.getLenderApproval(approvalId);
        if (!approval) return { content: [{ type: "text", text: "Approval not found in database" }] };

        await ghlService.syncApprovalToOpportunity({
          businessName: approval.businessName,
          businessEmail: approval.businessEmail ?? undefined,
          lender: approval.lender ?? undefined,
          advanceAmount: approval.advanceAmount ?? undefined,
          factorRate: approval.factorRate ?? undefined,
          term: approval.term ?? undefined,
          paymentFrequency: approval.paymentFrequency ?? undefined,
          commission: approval.commission ?? undefined,
          approvalDate: approval.approvalDate ?? undefined,
          overallStatus: approval.overallStatus ?? undefined,
          publicUrlToken: approval.publicUrlToken ?? undefined,
          additionalApprovals: approval.additionalApprovals ?? undefined,
        });

        return {
          content: [{ type: "text", text: `Synced approval for "${approval.businessName}" to GHL` }],
        };
      } catch (err: any) {
        return { content: [{ type: "text", text: `Sync error: ${err.message}` }] };
      }
    }
  );

  return server;
}

export function registerMcpRoutes(app: Express): void {
  // Health check — no auth required
  app.get("/api/mcp/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", server: "today-capital-group MCP", version: "1.0.0" });
  });

  // SSE endpoint — Claude Desktop connects here via GET /api/mcp
  app.get("/api/mcp", async (req: Request, res: Response) => {
    if (!checkApiKey(req, res)) return;

    const server = buildServer();
    const transport = new SSEServerTransport("/api/mcp/message", res as any);

    sessions.set(transport.sessionId, transport);

    transport.onclose = () => {
      sessions.delete(transport.sessionId);
    };

    await server.connect(transport);

    req.on("close", () => {
      transport.close().catch(() => {});
      sessions.delete(transport.sessionId);
    });
  });

  // Message endpoint — Claude Desktop posts messages here
  app.post("/api/mcp/message", async (req: Request, res: Response) => {
    if (!checkApiKey(req, res)) return;

    const sessionId = req.query.sessionId as string;
    const transport = sessions.get(sessionId);

    if (!transport) {
      res.status(404).json({ error: "Session not found. Connect via GET /api/mcp first." });
      return;
    }

    await transport.handlePostMessage(req as any, res as any, req.body);
  });
}
