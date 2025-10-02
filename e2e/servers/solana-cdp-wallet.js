import { CdpClient } from "@coinbase/cdp-sdk";
import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from express/.env.local
dotenv.config({ path: join(__dirname, 'express', '.env.local') });

// Verify environment variables
const requiredEnvVars = [
  'CDP_API_KEY_ID',
  'CDP_API_KEY_SECRET',
  'CDP_CLIENT_API_KEY',
  'CDP_PROJECT_ID',
  'CDP_WALLET_SECRET'
];

requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    console.error(`Missing required environment variable: ${varName}`);
    process.exit(1);
  }
});

async function createSolanaWallet() {
  try {
    // Initialize CDP client with credentials
    const cdp = new CdpClient({
      apiKeyId: process.env.CDP_API_KEY_ID,
      apiKeySecret: process.env.CDP_API_KEY_SECRET,
      projectId: process.env.CDP_PROJECT_ID
    });

    console.log("CDP Client initialized successfully");

    // Create a new Solana account
    const account = await cdp.solana.createAccount();
    console.log(`Created Solana account. Address: ${account.address}`);

    // Create or get a named Solana account (for server wallet)
    const serverWallet = await cdp.solana.getOrCreateAccount({
      name: "x402-server-wallet"
    });
    console.log(`Created/Retrieved server wallet with name: ${serverWallet.name}`);
    console.log(`Server wallet address: ${serverWallet.address}`);

    // Create additional named accounts for testing
    const userAccount1 = await cdp.solana.getOrCreateAccount({
      name: "x402-user-1"
    });
    console.log(`Created/Retrieved user account 1: ${userAccount1.address}`);

    const userAccount2 = await cdp.solana.getOrCreateAccount({
      name: "x402-user-2"
    });
    console.log(`Created/Retrieved user account 2: ${userAccount2.address}`);

    // List all Solana accounts
    console.log("\n--- All Solana Accounts ---");
    let response = await cdp.solana.listAccounts();

    while (true) {
      for (const acc of response.accounts) {
        console.log(`Solana account: ${acc.address}${acc.name ? ` (${acc.name})` : ''}`);
      }

      if (!response.nextPageToken) break;

      response = await cdp.solana.listAccounts({
        pageToken: response.nextPageToken
      });
    }

    // Return the main accounts for further use
    return {
      mainAccount: account,
      serverWallet,
      userAccount1,
      userAccount2
    };

  } catch (error) {
    console.error("Error creating Solana wallet:", error);
    throw error;
  }
}

// Execute the wallet creation
console.log("Starting Solana wallet creation with CDP SDK...\n");
createSolanaWallet()
  .then((wallets) => {
    console.log("\n✅ Solana wallets created successfully!");
    console.log("\n--- Summary ---");
    console.log(`Main Account: ${wallets.mainAccount.address}`);
    console.log(`Server Wallet: ${wallets.serverWallet.address} (${wallets.serverWallet.name})`);
    console.log(`User Account 1: ${wallets.userAccount1.address} (${wallets.userAccount1.name})`);
    console.log(`User Account 2: ${wallets.userAccount2.address} (${wallets.userAccount2.name})`);
  })
  .catch((error) => {
    console.error("\n❌ Failed to create Solana wallets:", error.message);
    process.exit(1);
  });