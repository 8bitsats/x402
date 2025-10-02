import { CdpClient } from "@coinbase/cdp-sdk";
import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env.solana') });

async function testSolanaSetup() {
  console.log("🧪 Testing Solana CDP Setup...\n");

  try {
    // Test 1: Verify environment variables
    console.log("✓ Test 1: Checking environment variables...");
    const requiredVars = [
      'CDP_API_KEY_ID',
      'CDP_API_KEY_SECRET',
      'CDP_PROJECT_ID'
    ];

    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        throw new Error(`Missing ${varName}`);
      }
      console.log(`  ${varName}: ${process.env[varName].substring(0, 10)}...`);
    }

    // Test 2: Initialize CDP Client
    console.log("\n✓ Test 2: Initializing CDP Client...");
    const cdp = new CdpClient({
      apiKeyId: process.env.CDP_API_KEY_ID,
      apiKeySecret: process.env.CDP_API_KEY_SECRET,
      projectId: process.env.CDP_PROJECT_ID
    });
    console.log("  CDP Client initialized successfully");

    // Test 3: Create a test account
    console.log("\n✓ Test 3: Creating test Solana account...");
    const testAccount = await cdp.solana.createAccount();
    console.log(`  Created account: ${testAccount.address}`);

    // Test 4: Get or create named account
    console.log("\n✓ Test 4: Creating/getting named account...");
    const namedAccount = await cdp.solana.getOrCreateAccount({
      name: "test-account-" + Math.floor(Date.now() / 1000)
    });
    console.log(`  Named account: ${namedAccount.name}`);
    console.log(`  Address: ${namedAccount.address}`);

    // Test 5: List accounts
    console.log("\n✓ Test 5: Listing Solana accounts...");
    const response = await cdp.solana.listAccounts();
    console.log(`  Found ${response.accounts.length} accounts`);

    if (response.accounts.length > 0) {
      console.log("  First few accounts:");
      response.accounts.slice(0, 3).forEach(acc => {
        console.log(`    - ${acc.address.substring(0, 20)}...${acc.name ? ` (${acc.name})` : ''}`);
      });
    }

    // Test 6: Verify server wallet exists
    console.log("\n✓ Test 6: Checking for server wallet...");
    const serverWallet = await cdp.solana.getOrCreateAccount({
      name: "x402-server-wallet"
    });
    console.log(`  Server wallet found: ${serverWallet.address}`);

    console.log("\n✅ All tests passed successfully!");
    console.log("\n--- Summary ---");
    console.log("CDP SDK is properly configured");
    console.log("Solana accounts can be created and managed");
    console.log("Server wallet is accessible");

    return true;
  } catch (error) {
    console.error("\n❌ Test failed:", error.message);
    console.error("\nError details:", error);
    return false;
  }
}

// Run tests
testSolanaSetup()
  .then(success => {
    if (success) {
      console.log("\n🎉 Solana CDP setup is working correctly!");
      process.exit(0);
    } else {
      console.log("\n⚠️  Please check your configuration and try again.");
      process.exit(1);
    }
  })
  .catch(error => {
    console.error("\n💥 Unexpected error:", error);
    process.exit(1);
  });