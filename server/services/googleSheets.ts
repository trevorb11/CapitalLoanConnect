// Google Sheets Service for Approval Data
// Integration: google-sheet connector

import { google } from 'googleapis';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-sheet',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Google Sheet not connected');
  }
  return accessToken;
}

async function getUncachableGoogleSheetClient() {
  const accessToken = await getAccessToken();

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return google.sheets({ version: 'v4', auth: oauth2Client });
}

export interface ApprovalRow {
  businessName: string;
  businessEmail?: string;
  lenderName: string;
  lenderEmail?: string;
  approvedAmount?: string;
  termLength?: string;
  factorRate?: string;
  paybackAmount?: string;
  paymentFrequency?: string;
  paymentAmount?: string;
  interestRate?: string;
  productType?: string;
  status?: string;
  expirationDate?: string;
  conditions?: string;
  notes?: string;
  dateReceived?: string;
  rowId: string;
}

// The spreadsheet ID extracted from the URL
const SPREADSHEET_ID = '1GnprPZE1spZsn1CzM-6lrby_5BQx_07fEOk5-ESPgec';

export class GoogleSheetsService {
  
  async isConfigured(): Promise<boolean> {
    try {
      await getAccessToken();
      return true;
    } catch {
      return false;
    }
  }

  async fetchApprovals(): Promise<ApprovalRow[]> {
    const sheets = await getUncachableGoogleSheetClient();
    const approvals: ApprovalRow[] = [];
    
    try {
      // First, get the spreadsheet metadata to find available sheets
      const spreadsheet = await sheets.spreadsheets.get({
        spreadsheetId: SPREADSHEET_ID
      });
      
      const sheetNames = spreadsheet.data.sheets?.map(s => s.properties?.title) || [];
      console.log('[GOOGLE SHEETS] Available sheets:', sheetNames);
      
      // Use the first sheet or 'Sheet1' as default
      const sheetName = sheetNames[0] || 'Sheet1';
      
      // Fetch all data from the sheet
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${sheetName}!A:Z`, // Get all columns
      });
      
      const rows = response.data.values || [];
      console.log(`[GOOGLE SHEETS] Found ${rows.length} rows (including header)`);
      
      if (rows.length < 2) {
        console.log('[GOOGLE SHEETS] No data rows found');
        return [];
      }
      
      // First row is the header
      const headers = rows[0].map((h: string) => h?.toLowerCase().trim() || '');
      console.log('[GOOGLE SHEETS] Headers:', headers);
      
      // Map column indices
      const colIndex = (name: string): number => {
        const variations = [
          name,
          name.replace(/\s+/g, '_'),
          name.replace(/\s+/g, ''),
          name.replace(/_/g, ' '),
        ];
        for (const v of variations) {
          const idx = headers.findIndex((h: string) => 
            h === v.toLowerCase() || 
            h.includes(v.toLowerCase()) ||
            v.toLowerCase().includes(h)
          );
          if (idx !== -1) return idx;
        }
        return -1;
      };
      
      // Process data rows
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;
        
        // Try to extract business name - this is required
        const businessNameIdx = colIndex('business name') !== -1 ? colIndex('business name') : 
                                colIndex('business') !== -1 ? colIndex('business') : 
                                colIndex('merchant') !== -1 ? colIndex('merchant') : 0;
        
        const businessName = row[businessNameIdx]?.trim();
        if (!businessName) continue;
        
        // Try to extract lender name
        const lenderNameIdx = colIndex('lender name') !== -1 ? colIndex('lender name') : 
                              colIndex('lender') !== -1 ? colIndex('lender') : 
                              colIndex('funder') !== -1 ? colIndex('funder') : 1;
        
        const lenderName = row[lenderNameIdx]?.trim() || 'Unknown Lender';
        
        // Extract other fields
        const getValue = (fieldName: string): string | undefined => {
          const idx = colIndex(fieldName);
          return idx !== -1 && row[idx] ? row[idx].trim() : undefined;
        };
        
        const approval: ApprovalRow = {
          businessName,
          businessEmail: getValue('business email') || getValue('email') || getValue('merchant email'),
          lenderName,
          lenderEmail: getValue('lender email') || getValue('funder email'),
          approvedAmount: getValue('approved amount') || getValue('amount') || getValue('approval amount'),
          termLength: getValue('term length') || getValue('term') || getValue('terms'),
          factorRate: getValue('factor rate') || getValue('factor') || getValue('rate'),
          paybackAmount: getValue('payback amount') || getValue('payback') || getValue('total payback'),
          paymentFrequency: getValue('payment frequency') || getValue('frequency') || getValue('payment schedule'),
          paymentAmount: getValue('payment amount') || getValue('payment') || getValue('daily payment') || getValue('weekly payment'),
          interestRate: getValue('interest rate') || getValue('interest') || getValue('apr'),
          productType: getValue('product type') || getValue('product') || getValue('type') || getValue('loan type'),
          status: getValue('status') || 'pending',
          expirationDate: getValue('expiration date') || getValue('expiration') || getValue('expires'),
          conditions: getValue('conditions') || getValue('requirements'),
          notes: getValue('notes') || getValue('comments'),
          dateReceived: getValue('date received') || getValue('date') || getValue('received date') || getValue('approval date'),
          rowId: `sheet-row-${i}` // Use row number as ID for deduplication
        };
        
        approvals.push(approval);
      }
      
      console.log(`[GOOGLE SHEETS] Parsed ${approvals.length} approvals`);
      return approvals;
      
    } catch (error) {
      console.error('[GOOGLE SHEETS] Error fetching approvals:', error);
      throw error;
    }
  }
  
  // Convert sheet row to database format
  parseAmount(value?: string): string | null {
    if (!value) return null;
    // Remove currency symbols, commas, etc.
    const cleaned = value.replace(/[$,\s]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num.toFixed(2);
  }
  
  parseDate(value?: string): Date | null {
    if (!value) return null;
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }
}

export const googleSheetsService = new GoogleSheetsService();
