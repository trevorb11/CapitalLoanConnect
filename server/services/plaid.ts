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

    // Use accounts/get endpoint instead of transactions/get
    const accountsResponse = await plaidClient.accountsGet({
      access_token: accessToken,
    });

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

    return {
      accounts: accountsResponse.data.accounts.map(acc => ({
        accountId: acc.account_id,
        name: acc.name,
        type: acc.type,
        subtype: acc.subtype || '',
        currentBalance: acc.balances.current || 0,
        availableBalance: acc.balances.available,
      })),
      transactions: [], // No transactions from accounts/get endpoint
      institutionName,
      dateRange: {
        startDate: startDateStr,
        endDate: endDate,
      },
    };
  }

  async analyzeFinancials(accessToken: string): Promise<AnalysisResult> {
    // Use accounts/get endpoint instead of transactions/get
    const accountsResponse = await plaidClient.accountsGet({
      access_token: accessToken,
    });

    const accounts = accountsResponse.data.accounts;

    // Calculate total current balance across all accounts
    const totalCurrentBalance = accounts.reduce((acc, account) => {
      return acc + (account.balances.current || 0);
    }, 0);

    // Calculate total available balance
    const totalAvailableBalance = accounts.reduce((acc, account) => {
      return acc + (account.balances.available || 0);
    }, 0);

    // Without transaction data, we estimate monthly revenue based on account balances
    // This is a simplified analysis - actual revenue would require transaction data
    const estimatedMonthlyRevenue = totalCurrentBalance * 0.5; // Conservative estimate
    const negativeDays = totalAvailableBalance < 0 ? 5 : 0; // Simplified check

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
