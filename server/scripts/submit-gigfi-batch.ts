/**
 * One-time batch GigFi submission script.
 * Run with: npx tsx server/scripts/submit-gigfi-batch.ts
 *
 * Queries the database for each of the 11 April 2026 declined businesses,
 * validates required GigFi fields, and submits to the live GigFi API.
 */

import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { ilike, or, desc } from "drizzle-orm";
import ws from "ws";
import { neonConfig } from "@neondatabase/serverless";
import { loanApplications } from "../../shared/schema";
import { submitToGigFi, type GigFiLeadData } from "../services/gigfi";

neonConfig.webSocketConstructor = ws;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL not set");
if (!process.env.GIGFI_API_KEY) throw new Error("GIGFI_API_KEY not set");

const pool = new Pool({ connectionString: DATABASE_URL });
const db = drizzle({ client: pool });

const BATCH_BUSINESSES: Array<{ name: string; knownEmail?: string }> = [
  { name: "ONELLA HOME CARE",          knownEmail: "jtndumbe@gmail.com" },
  { name: "Generations Group Home" },
  { name: "Wormac Group",              knownEmail: "gil@thewormacgroup.com" },
  { name: "Argyle Executive Forum",    knownEmail: "pprice@argyleforum.com" },
  { name: "Bfields Investment",        knownEmail: "tbutter22@icloud.com" },
  { name: "Arco Petroleum Transport",  knownEmail: "gsmall443322@gmail.com" },
  { name: "Top Flight Transportation", knownEmail: "topflightdispatch1@gmail.com" },
  { name: "WESTIN",                    knownEmail: "ramonher71@gmail.com" },
  { name: "pure and healthy hair",     knownEmail: "isaacisaac1972@yahoo.com" },
  { name: "ESCAPADEUSA",               knownEmail: "maxi@escapadeusa.com" },
  { name: "Andromel Estates",          knownEmail: "romelhilaire@yahoo.com" },
];

function isValidEmail(e: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e || "");
}
function normalizePhone(p: string): string {
  return (p || "").replace(/\D/g, "").slice(0, 10);
}
function isValidPhone(p: string): boolean {
  return normalizePhone(p).length === 10;
}
function parseNameParts(fullName: string): { firstName: string; lastName: string } {
  const parts = (fullName || "").trim().split(/\s+/);
  if (parts.length === 0) return { firstName: "Unknown", lastName: "Unknown" };
  if (parts.length === 1) return { firstName: parts[0], lastName: parts[0] };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

async function run() {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`GigFi Batch Submission — ${new Date().toISOString()}`);
  console.log(`Environment: ${process.env.GIGFI_ENVIRONMENT || "sandbox"}`);
  console.log(`${"=".repeat(60)}\n`);

  let submitted = 0, accepted = 0, rejected = 0, skipped = 0;

  for (const biz of BATCH_BUSINESSES) {
    console.log(`\n--- ${biz.name} ---`);
    try {
      const pattern = `%${biz.name}%`;
      const found = await db
        .select()
        .from(loanApplications)
        .where(
          or(
            ilike(loanApplications.businessName, pattern),
            ilike(loanApplications.legalBusinessName, pattern)
          )
        )
        .orderBy(desc(loanApplications.createdAt))
        .limit(5);

      if (found.length === 0) {
        console.log(`  SKIP — not found in database`);
        skipped++;
        continue;
      }

      // Show all matches, use most recent
      if (found.length > 1) {
        console.log(`  Found ${found.length} matches, using most recent:`);
        found.forEach((a, i) => console.log(`    [${i}] ${a.businessName || a.legalBusinessName} | ${a.email} | id=${a.id.slice(0,8)}`));
      }

      const app = found[0];
      const appId = app.id;
      const businessName = app.businessName || app.legalBusinessName || biz.name;
      console.log(`  App ID: ${appId.slice(0,8)}… | Business: ${businessName}`);
      console.log(`  DB email: ${app.email} | Phone: ${app.phone}`);
      console.log(`  SSN: ${app.socialSecurityNumber ? app.socialSecurityNumber.replace(/\d(?=\d{4})/g, "*") : "MISSING"} | DOB: ${app.dateOfBirth || "MISSING"}`);
      console.log(`  Address: ${app.ownerAddress1 || app.businessStreetAddress || app.businessAddress || "MISSING"}, ${app.ownerCity || app.city || "MISSING"}, ${app.ownerState || app.state || "MISSING"} ${app.ownerZip || app.zipCode || "MISSING"}`);

      // Resolve email
      const resolvedEmail = isValidEmail(biz.knownEmail || "") ? biz.knownEmail! :
                            isValidEmail(app.email) ? app.email : "";
      if (!resolvedEmail) {
        console.log(`  SKIP — no valid email (db="${app.email}", known="${biz.knownEmail || ""}")`);
        skipped++;
        continue;
      }
      console.log(`  Using email: ${resolvedEmail}`);

      // Require SSN
      const ssn = (app.socialSecurityNumber || "").replace(/\D/g, "");
      if (ssn.length !== 9) {
        console.log(`  SKIP — SSN missing or invalid (found ${ssn.length} digits)`);
        skipped++;
        continue;
      }

      // Require DOB
      const dob = app.dateOfBirth || "";
      if (!dob) {
        console.log(`  SKIP — date of birth missing`);
        skipped++;
        continue;
      }

      // Address
      const homeAddress = app.ownerAddress1 || app.businessStreetAddress || app.businessAddress || "";
      const homeCity    = app.ownerCity || app.city || "";
      const homeState   = (app.ownerState || app.state || "").toUpperCase().slice(0, 2);
      const homeZip     = (app.ownerZip || app.zipCode || "").replace(/\D/g, "").slice(0, 5);

      if (!homeAddress || !homeCity || homeState.length !== 2 || homeZip.length !== 5) {
        console.log(`  SKIP — incomplete address (addr="${homeAddress}" city="${homeCity}" state="${homeState}" zip="${homeZip}")`);
        skipped++;
        continue;
      }

      // Phone
      const rawPhone = app.phone || "";
      if (!isValidPhone(rawPhone)) {
        console.log(`  SKIP — invalid phone "${rawPhone}"`);
        skipped++;
        continue;
      }

      const { firstName, lastName } = parseNameParts(app.fullName || "");
      const monthlyRevenue = parseFloat(String(app.monthlyRevenue || app.averageMonthlyRevenue || "3000"));

      const leadData: GigFiLeadData = {
        firstName,
        lastName,
        email: resolvedEmail,
        phone: rawPhone,
        businessName,
        monthlyRevenue,
        financingAmount: 10000,
        businessAge: app.timeInBusiness || undefined,
        ssn,
        dob,
        homeAddress,
        homeCity,
        homeState,
        homeZip,
        ...(app.bankName && { bankName: app.bankName }),
        payFrequency: "4",
        nextPayDay: "05/01/2026",
        cellPhone: rawPhone,
      };

      console.log(`  Submitting to GigFi (live)…`);
      const result = await submitToGigFi(leadData, appId);
      submitted++;

      if (result.status === "ACCEPTED") {
        accepted++;
        console.log(`  ✓ ACCEPTED | decisionId=${result.decisionId} | url=${result.redirectUrl}`);
      } else if (result.status === "REJECTED") {
        rejected++;
        console.log(`  ✗ REJECTED | decisionId=${result.decisionId}`);
      } else {
        console.log(`  ⚠ ERROR | ${result.errorMessage}`);
      }

      // Small delay between submissions
      await new Promise(r => setTimeout(r, 1000));

    } catch (err: any) {
      console.log(`  ERROR — ${err.message}`);
      skipped++;
    }
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(`SUMMARY: ${BATCH_BUSINESSES.length} businesses`);
  console.log(`  Submitted: ${submitted} | Accepted: ${accepted} | Rejected: ${rejected} | Skipped: ${skipped}`);
  console.log(`${"=".repeat(60)}\n`);

  await pool.end();
}

run().catch(err => {
  console.error("Script failed:", err);
  process.exit(1);
});
