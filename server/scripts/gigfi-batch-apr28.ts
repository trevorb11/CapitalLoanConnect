/**
 * GigFi Batch Submission — April 28, 2026
 *
 * Submits ~35 applications that have all required fields (SSN, DOB, address).
 * Parses city/state/zip from business_csz field when separate fields are empty.
 *
 * Run with: npx tsx server/scripts/gigfi-batch-apr28.ts
 *
 * IMPORTANT: Set these env vars before running:
 *   GIGFI_API_KEY, GIGFI_ENVIRONMENT=live, DATABASE_URL
 */

import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { eq, isNull, isNotNull, and, or, inArray, desc } from "drizzle-orm";
import { sql } from "drizzle-orm";
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

// Parse "City, ST ZIPCODE" into components
function parseCSZ(csz: string | null): { city: string; state: string; zip: string } | null {
  if (!csz) return null;
  const parts = csz.trim().split(",");
  if (parts.length < 2) return null;
  const city = parts[0].trim();
  const rest = parts[1].trim().split(/\s+/);
  if (rest.length < 2) return null;
  const state = rest[0].trim().toUpperCase().slice(0, 2);
  const zip = rest[1].trim().slice(0, 5);
  if (state.length !== 2 || zip.length !== 5 || zip === "00000") return null;
  return { city, state, zip };
}

function parseNameParts(fullName: string): { firstName: string; lastName: string } {
  const parts = (fullName || "").trim().split(/\s+/);
  if (parts.length === 0) return { firstName: "Unknown", lastName: "Unknown" };
  if (parts.length === 1) return { firstName: parts[0], lastName: parts[0] };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function normalizePhone(p: string): string {
  return (p || "").replace(/\D/g, "").slice(-10);
}

async function run() {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`GigFi Batch Submission — ${new Date().toISOString()}`);
  console.log(`Environment: ${process.env.GIGFI_ENVIRONMENT || "sandbox"}`);
  console.log(`${"=".repeat(60)}\n`);

  // Get all applications without GigFi submission that have SSN and DOB
  const candidates = await db
    .select()
    .from(loanApplications)
    .where(
      and(
        isNull(loanApplications.gigfiStatus),
        isNotNull((loanApplications as any).socialSecurityNumber),
        isNotNull((loanApplications as any).dateOfBirth),
      )
    )
    .orderBy(desc(loanApplications.createdAt));

  // Filter to only the emails we want to submit
  const targetEmails = new Set([
    "cynthiadurr61@gmail.com","husseinjadiid@gmail.com","blessswer75@yahoo.com",
    "tamiryeah@yahoo.com","diamondhealthservices@hotmail.com","nolansflowers@aol.com",
    "crsllc46@gmail.com","jsmarth99@hotmail.com","strong1.rs@gmail.com",
    "adrianautodetail@icloud.com","angelaallen.lynn@gmail.com","bk3towing@yahoo.com",
    "nashcamelia241@gmail.com","chelsea13651@gmail.com","dennislaperna32@gmail.com",
    "drs106@yahoo.com","cookgigi85@gmail.com","guydunnthecloser@hotmail.com",
    "jmsholland8@gmail.com","andersonj081976@gmail.com","thomasgorman3599@gmail.com",
    "tammielynnbb@gmail.com","spurginconstruction@gmail.com","litlife_2024@yahoo.com",
    "jadakimbro67@gmail.com","kobashurgaia78@gmail.com","cgable10@yahoo.com",
    "prettylittlebaby2811@gmail.com","albocscourier@gmail.com","rhuckins73@gmail.com",
    "organicsheal@gmail.con","cnzheating@gmail.com","kcasperlokzv3@gmail.com",
    "rlong@hlhomecare.com","kksnow110@gmail.com","candmtransporting@gmail.com",
    "imaginethathp@gmail.com","jamesvalriy@gmail.com",
  ]);

  // Deduplicate by email — keep most recent
  const seen = new Set<string>();
  const toSubmit: typeof candidates = [];
  for (const app of candidates) {
    const email = app.email.toLowerCase().trim();
    if (!targetEmails.has(email)) continue;
    if (seen.has(email)) continue;
    seen.add(email);
    toSubmit.push(app);
  }

  console.log(`Found ${toSubmit.length} unique applications to submit\n`);

  let submitted = 0, accepted = 0, rejected = 0, skipped = 0;

  for (const app of toSubmit) {
    const appId = app.id;
    const email = app.email;
    const businessName = app.businessName || (app as any).legalBusinessName || "Unknown Business";
    console.log(`\n--- ${app.fullName} (${email}) ---`);

    // Resolve SSN
    const ssn = ((app as any).socialSecurityNumber || "").replace(/\D/g, "");
    if (ssn.length !== 9) {
      console.log(`  SKIP — SSN invalid (${ssn.length} digits)`);
      skipped++;
      continue;
    }

    // Resolve DOB
    const dob = (app as any).dateOfBirth || "";
    if (!dob) {
      console.log(`  SKIP — DOB missing`);
      skipped++;
      continue;
    }

    // Resolve address
    const homeAddress = (app as any).ownerAddress1 || (app as any).businessStreetAddress || (app as any).businessAddress || "";
    if (!homeAddress) {
      console.log(`  SKIP — address missing`);
      skipped++;
      continue;
    }

    // Resolve city/state/zip — try direct fields first, fall back to CSZ parsing
    let homeCity = (app as any).ownerCity || (app as any).city || "";
    let homeState = ((app as any).ownerState || (app as any).state || "").toUpperCase().slice(0, 2);
    let homeZip = ((app as any).ownerZip || (app as any).zipCode || "").replace(/\D/g, "").slice(0, 5);

    if (!homeCity || homeState.length !== 2 || homeZip.length !== 5) {
      const csz = (app as any).ownerCsz || (app as any).businessCsz || "";
      const parsed = parseCSZ(csz);
      if (parsed) {
        homeCity = homeCity || parsed.city;
        homeState = homeState.length === 2 ? homeState : parsed.state;
        homeZip = homeZip.length === 5 ? homeZip : parsed.zip;
      }
    }

    if (!homeCity || homeState.length !== 2 || homeZip.length !== 5) {
      console.log(`  SKIP — incomplete address (city="${homeCity}" state="${homeState}" zip="${homeZip}")`);
      skipped++;
      continue;
    }

    // Phone
    const rawPhone = app.phone || "";
    const phone = normalizePhone(rawPhone);
    if (phone.length !== 10) {
      console.log(`  SKIP — invalid phone "${rawPhone}"`);
      skipped++;
      continue;
    }

    const { firstName, lastName } = parseNameParts(app.fullName || "");
    const monthlyRevenue = parseFloat(String((app as any).monthlyRevenue || (app as any).averageMonthlyRevenue || "3000"));

    console.log(`  Name: ${firstName} ${lastName} | Biz: ${businessName}`);
    console.log(`  Addr: ${homeAddress}, ${homeCity}, ${homeState} ${homeZip}`);
    console.log(`  Phone: ${phone} | Revenue: $${monthlyRevenue}`);

    const leadData: GigFiLeadData = {
      firstName,
      lastName,
      email,
      phone: rawPhone,
      businessName,
      monthlyRevenue,
      financingAmount: 10000, // Capped at $10K per requirements
      businessAge: (app as any).timeInBusiness || undefined,
      ssn,
      dob: String(dob).slice(0, 10),
      homeAddress,
      homeCity,
      homeState,
      homeZip,
      ...((app as any).bankName && { bankName: (app as any).bankName }),
      payFrequency: "2", // Bi-weekly per requirements
      nextPayDay: "05/09/2026",
      cellPhone: rawPhone,
    };

    console.log(`  Submitting to GigFi...`);
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

    // Save result to database
    try {
      await db
        .update(loanApplications)
        .set({
          gigfiStatus: result.status,
          gigfiDecisionId: result.decisionId || null,
          gigfiRedirectUrl: result.redirectUrl || null,
          gigfiSubmittedAt: new Date(),
        } as any)
        .where(eq(loanApplications.id, appId));
      console.log(`  Saved to DB`);
    } catch (err: any) {
      console.error(`  DB save error: ${err.message}`);
    }

    // Rate limit delay
    await new Promise(r => setTimeout(r, 1500));
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(`SUMMARY: ${toSubmit.length} unique applications`);
  console.log(`  Submitted: ${submitted} | Accepted: ${accepted} | Rejected: ${rejected} | Skipped: ${skipped}`);
  console.log(`${"=".repeat(60)}\n`);

  await pool.end();
}

run().catch(err => {
  console.error("Script failed:", err);
  process.exit(1);
});
