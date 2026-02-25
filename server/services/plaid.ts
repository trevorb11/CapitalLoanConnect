import { Configuration, PlaidApi, PlaidEnvironments, CountryCode, Products } from 'plaid';

const configuration = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV || 'sandbox'],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SECRET,
    },
  },
});

export const plaidClient = new PlaidApi(configuration);

export interface AnalysisMetrics {
  monthlyRevenue: number;
  avgBalance: number;
  negativeDays: number;
}

export interface Recommendation {
  status: "High" | "Medium" | "Low";
  reason: string;
}

export interface AnalysisResult {
  metrics: AnalysisMetrics;
  recommendations: {
    sba: Recommendation;
    loc: Recommendation;
    mca: Recommendation;
  };
}

export interface BankStatement {
  accounts: Array<{
    accountId: string;
    name: string;
    type: string;
    subtype: string;
    currentBalance: number;
    availableBalance: number | null;
  }>;
  transactions: Array<{
    transactionId: string;
    date: string;
    name: string;
    amount: number;
    category: string[];
    pending: boolean;
  }>;
  institutionName: string;
  dateRange: {
    startDate: string;
    endDate: string;
  };
}

export interface PlaidStatement {
  statementId: string;
  month: number;
  year: number;
  accountId: string;
  accountName: string;
  accountType: string;
  accountMask?: string;
}

export interface PlaidStatementsListResult {
  institutionId: string;
  institutionName: string;
  statements: PlaidStatement[];
}

export class PlaidService {
  async createLinkToken(userId: string) {
    // Calculate date range for statements (last 6 months)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 6);
    
    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: userId },
      client_name: 'Today Capital Group',
      products: [Products.Statements, Products.Assets],
      country_codes: [CountryCode.Us],
      language: 'en',
      statements: {
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
      },
    });
    return response.data;
  }

  async createUpdateLinkToken(userId: string, accessToken: string) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 6);

    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: userId },
      client_name: 'Today Capital Group',
      access_token: accessToken,
      country_codes: [CountryCode.Us],
      language: 'en',
      statements: {
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
      },
    } as any);
    return response.data;
  }

  async exchangePublicToken(publicToken: string) {
    const response = await plaidClient.itemPublicTokenExchange({
      public_token: publicToken,
    });
    return response.data;
  }

  async getBankStatements(accessToken: string, months: number = 3): Promise<BankStatement> {
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);
    const startDateStr = startDate.toISOString().split('T')[0];

    // Get item info for institution name
    const itemResponse = await plaidClient.itemGet({
      access_token: accessToken,
    });

    let institutionName = 'Unknown Bank';
    if (itemResponse.data.item.institution_id) {
      try {
        const instResponse = await plaidClient.institutionsGetById({
          institution_id: itemResponse.data.item.institution_id,
          country_codes: [CountryCode.Us],
        });
        institutionName = instResponse.data.institution.name;
      } catch (e) {
        console.log('Could not fetch institution name');
      }
    }

    // Try to get transactions first, fall back to accounts-only if not available
    try {
      let allTransactions: any[] = [];
      let hasMore = true;

      while (hasMore) {
        const response = await plaidClient.transactionsGet({
          access_token: accessToken,
          start_date: startDateStr,
          end_date: endDate,
          options: { offset: allTransactions.length }
        });

        allTransactions = allTransactions.concat(response.data.transactions);
        hasMore = allTransactions.length < response.data.total_transactions;
      }

      // Get accounts from the transactions response
      const txnResponse = await plaidClient.transactionsGet({
        access_token: accessToken,
        start_date: startDateStr,
        end_date: endDate,
      });

      return {
        accounts: txnResponse.data.accounts.map(acc => ({
          accountId: acc.account_id,
          name: acc.name,
          type: acc.type,
          subtype: acc.subtype || '',
          currentBalance: acc.balances.current || 0,
          availableBalance: acc.balances.available,
        })),
        transactions: allTransactions.map(txn => ({
          transactionId: txn.transaction_id,
          date: txn.date,
          name: txn.name,
          amount: txn.amount,
          category: txn.category || [],
          pending: txn.pending,
        })),
        institutionName,
        dateRange: {
          startDate: startDateStr,
          endDate: endDate,
        },
      };
    } catch (e: any) {
      // If transactions product not available, fall back to accounts-only
      console.log('Transactions not available, falling back to accounts-only:', e.message);
      
      const accountsResponse = await plaidClient.accountsGet({
        access_token: accessToken,
      });

      return {
        accounts: accountsResponse.data.accounts.map(acc => ({
          accountId: acc.account_id,
          name: acc.name,
          type: acc.type,
          subtype: acc.subtype || '',
          currentBalance: acc.balances.current || 0,
          availableBalance: acc.balances.available,
        })),
        transactions: [], // No transactions available
        institutionName,
        dateRange: {
          startDate: startDateStr,
          endDate: endDate,
        },
      };
    }
  }

  async analyzeFinancials(accessToken: string): Promise<AnalysisResult> {
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 1);
    const startDateStr = startDate.toISOString().split('T')[0];

    // Try to get transactions for accurate analysis, fall back to accounts-only
    try {
      let allTransactions: any[] = [];
      let hasMore = true;

      while (hasMore) {
        const response = await plaidClient.transactionsGet({
          access_token: accessToken,
          start_date: startDateStr,
          end_date: endDate,
          options: { offset: allTransactions.length }
        });

        allTransactions = allTransactions.concat(response.data.transactions);
        hasMore = allTransactions.length < response.data.total_transactions;
      }

      const txnResponse = await plaidClient.transactionsGet({
        access_token: accessToken,
        start_date: startDateStr,
        end_date: endDate,
      });
      const accounts = txnResponse.data.accounts;

      let totalDeposits = 0;
      let negativeDays = 0;
      const dailyBalances: Map<string, number> = new Map();

      allTransactions.forEach((txn) => {
        if (txn.amount < 0) {
          totalDeposits += Math.abs(txn.amount);
        }
        
        const date = txn.date;
        const currentBalance = dailyBalances.get(date) || 0;
        dailyBalances.set(date, currentBalance - txn.amount);
      });

      const monthsInData = Math.max(1, allTransactions.length > 0 ? 12 : 1);
      const monthlyRevenue = totalDeposits / monthsInData;

      const totalCurrentBalance = accounts.reduce((acc, account) => {
        return acc + (account.balances.current || 0);
      }, 0);

      let runningBalance = totalCurrentBalance;
      dailyBalances.forEach((change) => {
        runningBalance += change;
        if (runningBalance < 0) {
          negativeDays++;
        }
      });

      const recommendations = this.generateRecommendations(monthlyRevenue, totalCurrentBalance, negativeDays);

      return {
        metrics: {
          monthlyRevenue: Math.round(monthlyRevenue * 100) / 100,
          avgBalance: Math.round(totalCurrentBalance * 100) / 100,
          negativeDays
        },
        recommendations
      };
    } catch (e: any) {
      // If transactions not available, fall back to accounts-only analysis
      console.log('Transactions not available for analysis, using accounts-only:', e.message);
      
      const accountsResponse = await plaidClient.accountsGet({
        access_token: accessToken,
      });

      const accounts = accountsResponse.data.accounts;

      const totalCurrentBalance = accounts.reduce((acc, account) => {
        return acc + (account.balances.current || 0);
      }, 0);

      const totalAvailableBalance = accounts.reduce((acc, account) => {
        return acc + (account.balances.available || 0);
      }, 0);

      // Estimate monthly revenue based on account balances (simplified)
      const estimatedMonthlyRevenue = totalCurrentBalance * 0.5;
      const negativeDays = totalAvailableBalance < 0 ? 5 : 0;

      const recommendations = this.generateRecommendations(estimatedMonthlyRevenue, totalCurrentBalance, negativeDays);

      return {
        metrics: {
          monthlyRevenue: Math.round(estimatedMonthlyRevenue * 100) / 100,
          avgBalance: Math.round(totalCurrentBalance * 100) / 100,
          negativeDays
        },
        recommendations
      };
    }
  }

  private generateRecommendations(
    monthlyRevenue: number, 
    avgBalance: number, 
    negativeDays: number
  ): { sba: Recommendation; loc: Recommendation; mca: Recommendation } {
    let sba: Recommendation = { 
      status: "Low", 
      reason: "Requires higher consistent daily balances and at least 2 years of business history." 
    };
    let loc: Recommendation = { 
      status: "Low", 
      reason: "Revenue is promising, but cash reserves are below typical requirements." 
    };
    let mca: Recommendation = { 
      status: "High", 
      reason: "Your deposit history shows strong consistent cash flow, making you a great candidate." 
    };

    if (monthlyRevenue >= 50000 && avgBalance >= 10000 && negativeDays <= 5) {
      sba = { status: "High", reason: "Strong financials indicate high likelihood of SBA approval." };
      loc = { status: "High", reason: "Your cash flow and reserves support a healthy Line of Credit." };
    } else if (monthlyRevenue >= 25000 && avgBalance >= 5000) {
      sba = { status: "Medium", reason: "Revenue is solid; we'd need to verify 2+ years of business history." };
      loc = { status: "High", reason: "Your monthly deposits support a Line of Credit application." };
    } else if (monthlyRevenue >= 15000) {
      loc = { status: "Medium", reason: "Revenue supports a smaller line; higher deposits would help." };
    }

    if (negativeDays > 15) {
      mca = { 
        status: "Medium", 
        reason: "Your deposit pattern is good, but frequent negative balances may affect terms." 
      };
    }

    return { sba, loc, mca };
  }

  // Asset Report Methods
  async createAssetReport(
    accessToken: string, 
    daysRequested: number = 90,
    userInfo?: {
      firstName?: string;
      middleName?: string;
      lastName?: string;
      ssn?: string;
      phoneNumber?: string;
      email?: string;
    }
  ): Promise<{ assetReportToken: string; assetReportId: string }> {
    // Build request with optional user info for borrower details
    const request: any = {
      access_tokens: [accessToken],
      days_requested: daysRequested,
    };

    // Add user info if provided (this populates the Borrower Information section in the report)
    if (userInfo && (userInfo.firstName || userInfo.lastName || userInfo.email)) {
      request.options = {
        user: {
          ...(userInfo.firstName && { first_name: userInfo.firstName }),
          ...(userInfo.middleName && { middle_name: userInfo.middleName }),
          ...(userInfo.lastName && { last_name: userInfo.lastName }),
          ...(userInfo.ssn && { ssn: userInfo.ssn }), // Format: ddd-dd-dddd
          ...(userInfo.phoneNumber && { phone_number: userInfo.phoneNumber }), // E.164 format preferred
          ...(userInfo.email && { email: userInfo.email }),
        }
      };
      console.log('[PLAID] Creating asset report with borrower info:', {
        firstName: userInfo.firstName,
        lastName: userInfo.lastName,
        email: userInfo.email,
        hasSSN: !!userInfo.ssn,
        hasPhone: !!userInfo.phoneNumber
      });
    }

    try {
      const response = await plaidClient.assetReportCreate(request);
      return {
        assetReportToken: response.data.asset_report_token,
        assetReportId: response.data.asset_report_id
      };
    } catch (err: any) {
      const plaidBody = err?.response?.data;
      console.error('[PLAID ASSET REPORT ERROR]', JSON.stringify(plaidBody || err?.message || err));
      throw err;
    }
  }

  async getAssetReport(assetReportToken: string): Promise<any> {
    // Poll for the asset report - it may take a few seconds to generate
    const maxRetries = 20;
    const retryDelay = 2000; // 2 seconds

    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await plaidClient.assetReportGet({
          asset_report_token: assetReportToken,
          include_insights: true
        });
        
        return response.data;
      } catch (error: any) {
        // Check if the report is still being generated
        if (error?.response?.data?.error_code === 'PRODUCT_NOT_READY') {
          console.log(`Asset report not ready, retrying in ${retryDelay/1000}s... (attempt ${i + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          continue;
        }
        throw error;
      }
    }

    throw new Error('Asset report generation timed out after multiple retries');
  }

  async getAssetReportPdf(assetReportToken: string): Promise<Buffer> {
    const response = await plaidClient.assetReportPdfGet({
      asset_report_token: assetReportToken
    }, {
      responseType: 'arraybuffer'
    });
    
    return Buffer.from(response.data as any);
  }

  // Combined method: Create and fetch asset report
  async createAndGetAssetReport(
    accessToken: string, 
    daysRequested: number = 90,
    userInfo?: {
      firstName?: string;
      middleName?: string;
      lastName?: string;
      ssn?: string;
      phoneNumber?: string;
      email?: string;
    }
  ): Promise<any> {
    console.log('Creating asset report...');
    const { assetReportToken } = await this.createAssetReport(accessToken, daysRequested, userInfo);
    
    console.log('Fetching asset report (this may take a moment)...');
    const report = await this.getAssetReport(assetReportToken);
    
    return {
      ...report,
      assetReportToken // Include token for PDF download
    };
  }

  // Statements API Methods
  async listStatements(accessToken: string): Promise<PlaidStatementsListResult> {
    console.log('[PLAID] Fetching statements list...');
    
    const response = await plaidClient.statementsList({
      access_token: accessToken,
    });
    
    const data = response.data;
    const statements: PlaidStatement[] = [];
    
    // Flatten the accounts and their statements into a single list
    for (const account of data.accounts) {
      for (const stmt of account.statements) {
        statements.push({
          statementId: stmt.statement_id,
          month: stmt.month,
          year: stmt.year,
          accountId: account.account_id,
          accountName: account.account_name || 'Unknown Account',
          accountType: account.account_type || 'depository',
          accountMask: account.account_mask || undefined,
        });
      }
    }
    
    console.log(`[PLAID] Found ${statements.length} statements across ${data.accounts.length} accounts`);
    
    return {
      institutionId: data.institution_id,
      institutionName: data.institution_name,
      statements,
    };
  }

  async downloadStatement(accessToken: string, statementId: string): Promise<Buffer> {
    console.log(`[PLAID] Downloading statement: ${statementId}`);
    
    const response = await plaidClient.statementsDownload({
      access_token: accessToken,
      statement_id: statementId,
    }, {
      responseType: 'arraybuffer'
    });
    
    return Buffer.from(response.data as any);
  }

  async refreshStatements(accessToken: string, startDate?: string, endDate?: string): Promise<void> {
    // Default to last 6 months if no dates provided
    const end = endDate || new Date().toISOString().split('T')[0];
    const start = startDate || (() => {
      const d = new Date();
      d.setMonth(d.getMonth() - 6);
      return d.toISOString().split('T')[0];
    })();
    
    console.log(`[PLAID] Refreshing statements from ${start} to ${end}`);
    
    await plaidClient.statementsRefresh({
      access_token: accessToken,
      start_date: start,
      end_date: end,
    });
    
    console.log('[PLAID] Statements refresh requested');
  }
}

export const plaidService = new PlaidService();
