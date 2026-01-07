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

export class PlaidService {
  async createLinkToken(userId: string) {
    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: userId },
      client_name: 'Today Capital Group',
      products: [Products.Assets],
      country_codes: [CountryCode.Us],
      language: 'en',
    });
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
}

export const plaidService = new PlaidService();
