import { CdpClient } from "@coinbase/cdp-sdk";
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env.solana') });

class SolanaServerWallet {
  constructor() {
    this.cdp = null;
    this.serverWallet = null;
    this.connection = null;
  }

  async initialize() {
    try {
      // Initialize CDP client
      this.cdp = new CdpClient({
        apiKeyId: process.env.CDP_API_KEY_ID,
        apiKeySecret: process.env.CDP_API_KEY_SECRET,
        projectId: process.env.CDP_PROJECT_ID
      });

      // Initialize Solana connection
      const network = process.env.SOLANA_NETWORK || 'devnet';
      const rpcUrl = network === 'mainnet-beta'
        ? 'https://api.mainnet-beta.solana.com'
        : `https://api.${network}.solana.com`;

      this.connection = new Connection(rpcUrl, 'confirmed');
      console.log(`Connected to Solana ${network}`);

      // Get or create the server wallet
      this.serverWallet = await this.cdp.solana.getOrCreateAccount({
        name: "x402-server-wallet"
      });

      console.log(`Server wallet initialized: ${this.serverWallet.address}`);

      // Check balance
      await this.checkBalance();

      return this.serverWallet;
    } catch (error) {
      console.error("Failed to initialize server wallet:", error);
      throw error;
    }
  }

  async checkBalance() {
    try {
      if (!this.serverWallet) {
        throw new Error("Server wallet not initialized");
      }

      const pubKey = new PublicKey(this.serverWallet.address);
      const balance = await this.connection.getBalance(pubKey);
      const solBalance = balance / LAMPORTS_PER_SOL;

      console.log(`Server wallet balance: ${solBalance} SOL`);
      return solBalance;
    } catch (error) {
      console.error("Failed to check balance:", error);
      return 0;
    }
  }

  async createUserAccount(userName) {
    try {
      const userAccount = await this.cdp.solana.getOrCreateAccount({
        name: userName
      });

      console.log(`Created/Retrieved user account: ${userName} - ${userAccount.address}`);
      return userAccount;
    } catch (error) {
      console.error(`Failed to create user account ${userName}:`, error);
      throw error;
    }
  }

  async listAllAccounts() {
    try {
      const accounts = [];
      let response = await this.cdp.solana.listAccounts();

      while (true) {
        accounts.push(...response.accounts);

        if (!response.nextPageToken) break;

        response = await this.cdp.solana.listAccounts({
          pageToken: response.nextPageToken
        });
      }

      return accounts;
    } catch (error) {
      console.error("Failed to list accounts:", error);
      throw error;
    }
  }

  async saveWalletInfo() {
    try {
      if (!this.serverWallet) {
        throw new Error("Server wallet not initialized");
      }

      const walletInfo = {
        address: this.serverWallet.address,
        name: this.serverWallet.name,
        network: process.env.SOLANA_NETWORK || 'devnet',
        createdAt: new Date().toISOString()
      };

      await fs.writeFile(
        join(__dirname, 'solana-wallet-info.json'),
        JSON.stringify(walletInfo, null, 2)
      );

      console.log("Wallet info saved to solana-wallet-info.json");
      return walletInfo;
    } catch (error) {
      console.error("Failed to save wallet info:", error);
      throw error;
    }
  }

  async requestAirdrop() {
    try {
      if (!this.serverWallet) {
        throw new Error("Server wallet not initialized");
      }

      const network = process.env.SOLANA_NETWORK || 'devnet';
      if (network !== 'devnet' && network !== 'testnet') {
        console.log("Airdrop only available on devnet and testnet");
        return false;
      }

      const pubKey = new PublicKey(this.serverWallet.address);
      const signature = await this.connection.requestAirdrop(
        pubKey,
        2 * LAMPORTS_PER_SOL // Request 2 SOL
      );

      await this.connection.confirmTransaction(signature);
      console.log(`Airdrop successful! Transaction: ${signature}`);

      await this.checkBalance();
      return signature;
    } catch (error) {
      console.error("Airdrop failed:", error);
      return null;
    }
  }
}

// Main execution
async function main() {
  console.log("Initializing Solana Server Wallet...\n");

  const wallet = new SolanaServerWallet();

  try {
    // Initialize the wallet
    await wallet.initialize();

    // Create some user accounts
    console.log("\n--- Creating User Accounts ---");
    const user1 = await wallet.createUserAccount("x402-user-1");
    const user2 = await wallet.createUserAccount("x402-user-2");
    const user3 = await wallet.createUserAccount("x402-user-3");

    // List all accounts
    console.log("\n--- All Solana Accounts ---");
    const accounts = await wallet.listAllAccounts();
    accounts.forEach(acc => {
      console.log(`${acc.address}${acc.name ? ` (${acc.name})` : ''}`);
    });

    // Save wallet info
    const walletInfo = await wallet.saveWalletInfo();

    // Try to get some test SOL (only works on devnet/testnet)
    console.log("\n--- Requesting Airdrop (if on devnet/testnet) ---");
    await wallet.requestAirdrop();

    console.log("\n✅ Solana server wallet setup complete!");
    console.log("\n--- Summary ---");
    console.log(`Server Wallet: ${walletInfo.address}`);
    console.log(`Network: ${walletInfo.network}`);
    console.log(`Total accounts created: ${accounts.length}`);

  } catch (error) {
    console.error("\n❌ Setup failed:", error.message);
    process.exit(1);
  }
}

// Run if executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}

export default SolanaServerWallet;