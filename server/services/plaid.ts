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

export class PlaidService {
  // 1. Create Link Token (Frontend needs this to open the widget)
  async createLinkToken(userId: string) {
    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: userId },
      client_name: 'Today Capital Group',
      products: [Products.Transactions],
      country_codes: [CountryCode.Us],
      language: 'en',
    });
    return response.data;
  }

  // 2. Exchange Public Token for Access Token (Save this to DB)
  async exchangePublicToken(publicToken: string) {
    const response = await plaidClient.itemPublicTokenExchange({
      public_token: publicToken,
    });
    return response.data;
  }

  // 3. THE MAGIC: Fetch Transactions & Analyze
  async analyzeFinancials(accessToken: string) {
    // Fetch last 12 months of data
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 1);
    const startDateStr = startDate.toISOString().split('T')[0];

    const response = await plaidClient.transactionsGet({
      access_token: accessToken,
      start_date: startDateStr,
      end_date: endDate,
    });

    const transactions = response.data.transactions;
    const accounts = response.data.accounts;

    // --- UNDERWRITING LOGIC ---
    
    // 1. Calculate Total Revenue (Sum of deposits)
    // Plaid: Positive amount = Withdrawal, Negative amount = Deposit (usually)
    let totalDeposits = 0;
    
    // Calculate simplified revenue (Absolute value of negative transactions)
    transactions.forEach((txn) => {
      if (txn.amount < 0) {
        totalDeposits += Math.abs(txn.amount);
      }
    });

    const monthlyRevenue = totalDeposits / 12;

    // 2. Calculate Average Balance (from available current balance data)
    const totalCurrentBalance = accounts.reduce((acc, account) => acc + (account.balances.current || 0), 0);
    
    // 3. Generate Recommendations
    const recommendations = {
      sba: { status: "Low", reason: "Requires higher consistent daily balances." },
      loc: { status: "Low", reason: "Revenue is strong, but cash buffers are low." },
      mca: { status: "High", reason: "You have strong consistent deposits, making you a perfect fit." }
    };

    // Simple Rule Engine
    if (monthlyRevenue > 25000 && totalCurrentBalance > 5000) {
      recommendations.sba.status = "Medium";
      recommendations.sba.reason = "Revenue is strong enough, but we need to verify 2 years of history.";
    }
    if (monthlyRevenue > 50000) {
      recommendations.loc.status = "High";
      recommendations.loc.reason = "Your cash flow supports a healthy Line of Credit.";
    }

    return {
      metrics: {
        monthlyRevenue,
        avgBalance: totalCurrentBalance,
        negativeDays: 0
      },
      recommendations
    };
  }
}

export const plaidService = new PlaidService();
