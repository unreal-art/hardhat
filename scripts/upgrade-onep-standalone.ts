import { HardhatRuntimeEnvironment } from "hardhat/types";
import { ethers } from "hardhat";

/**
 * OneP Contract Upgrade Script - Standalone Version
 * 
 * This script upgrades the OneP contract without requiring deployment files.
 * It works by directly interacting with the blockchain using contract addresses.
 * 
 * Usage:
 * npx hardhat run scripts/upgrade-onep-standalone.ts --network <network>
 * 
 * Environment Variables:
 * - PROXY_ADDRESS: Proxy contract address
 * - ADMIN_ADDRESS: Admin address
 * - DRY_RUN: true/false
 * - STRATEGY: standard/init/emergency
 */

// Known deployments for easy reference
const KNOWN_DEPLOYMENTS = {
  "cc": {
    proxy: "0x15868E3227F91E7457689022DeFd364037F4293C",
    implementation: "0x9838B6aFBC0768d1e4B574677E28E01d4C7f5F94"
  },
  "etherlink": {
    proxy: "0x74490cf620C2CEe6633082dC8F8D07C42FEe6aD3",
    implementation: "0x99900EE81f6F94DA41721CBba8a2FBde9C95B4b6"
  }
};

async function main(hre: HardhatRuntimeEnvironment) {
  console.log("🔄 OneP Contract Upgrade Script - Standalone Version\n");

  // Get parameters from environment or use defaults
  const proxyAddress = process.env.PROXY_ADDRESS;
  const adminAddress = process.env.ADMIN_ADDRESS;
  const dryRun = process.env.DRY_RUN === "true";
  const strategy = process.env.STRATEGY || "standard";

  // If no proxy address provided, show known deployments
  if (!proxyAddress) {
    console.log("📋 Known OneP Deployments:\n");
    console.log("| Network   | Proxy Address                                 | Implementation                               |");
    console.log("| --------- | -------------------------------------------- | -------------------------------------------- |");
    
    for (const [network, deployment] of Object.entries(KNOWN_DEPLOYMENTS)) {
      console.log(`| ${network.padEnd(9)} | ${deployment.proxy} | ${deployment.implementation} |`);
    }

    console.log("\n💡 Usage Examples:");
    console.log(`PROXY_ADDRESS=0x15868E3227F91E7457689022DeFd364037F4293C ADMIN_ADDRESS=<admin> npx hardhat run scripts/upgrade-onep-standalone.ts --network cc`);
    console.log(`PROXY_ADDRESS=0x15868E3227F91E7457689022DeFd364037F4293C ADMIN_ADDRESS=<admin> DRY_RUN=true npx hardhat run scripts/upgrade-onep-standalone.ts --network cc`);
    console.log(`PROXY_ADDRESS=0x15868E3227F91E7457689022DeFd364037F4293C ADMIN_ADDRESS=<admin> STRATEGY=init npx hardhat run scripts/upgrade-onep-standalone.ts --network cc`);
    return;
  }

  if (!adminAddress) {
    console.error("❌ ADMIN_ADDRESS environment variable is required");
    console.log("💡 Set ADMIN_ADDRESS=<your-admin-address>");
    return;
  }

  console.log(`📍 Proxy Address: ${proxyAddress}`);
  console.log(`👤 Admin Address: ${adminAddress}`);
  console.log(`🎯 Strategy: ${strategy}`);
  console.log(`🌐 Network: ${hre.network.name}`);
  console.log(`🔍 Dry Run: ${dryRun}`);

  try {
    // Get the admin signer
    const adminSigner = await hre.ethers.getSigner(adminAddress);
    console.log(`✅ Admin signer loaded`);

    // Get the proxy contract
    const proxy = await hre.ethers.getContractAt("OneP", proxyAddress);
    
    // Get current implementation
    const currentImplAddress = await proxy.implementation();
    console.log(`📍 Current Implementation: ${currentImplAddress}`);

    if (dryRun) {
      console.log("🔍 [DRY RUN] Would deploy new implementation and upgrade proxy");
      return;
    }

    // Deploy new implementation
    console.log("\n🚀 Deploying new OneP implementation...");
    const OnePFactory = await hre.ethers.getContractFactory("OneP");
    const newImplementation = await OnePFactory.deploy();
    await newImplementation.waitForDeployment();
    
    const newImplAddress = await newImplementation.getAddress();
    console.log(`✅ New implementation deployed at: ${newImplAddress}`);

    // Perform upgrade based on strategy
    console.log(`\n🔧 Performing ${strategy} upgrade...`);
    const upgradeTx = await proxy.upgradeTo(newImplAddress);
    await upgradeTx.wait();

    // Handle strategy-specific logic
    if (strategy === "init") {
      console.log("🔧 Reinitializing contract...");
      try {
        const currentVerifier = await proxy.verifier();
        const reinitTx = await proxy.initialize(currentVerifier);
        await reinitTx.wait();
        console.log("✅ Reinitialization completed!");
      } catch (reinitError: any) {
        if (reinitError.message.includes("already initialized")) {
          console.log("ℹ️  Contract already initialized, skipping reinitialization");
        } else {
          throw reinitError;
        }
      }
    }

    console.log(`✅ ${strategy} upgrade completed!`);

    // Verify the upgrade worked
    console.log("\n🧪 Verifying upgrade...");
    
    const verifier = await proxy.verifier();
    const totalSupply = await proxy.totalSupply();
    const maxSupply = await proxy.cap();
    const newImplementationAddress = await proxy.implementation();

    console.log(`✅ Verification successful!`);
    console.log(`   Implementation: ${newImplementationAddress}`);
    console.log(`   Verifier: ${verifier}`);
    console.log(`   Total Supply: ${ethers.formatEther(totalSupply)} 1P`);
    console.log(`   Max Supply: ${ethers.formatEther(maxSupply)} 1P`);

    console.log("\n📊 Upgrade Summary:");
    console.log(`   Proxy Address: ${proxyAddress}`);
    console.log(`   Old Implementation: ${currentImplAddress}`);
    console.log(`   New Implementation: ${newImplAddress}`);
    console.log(`   Strategy: ${strategy}`);
    console.log(`   Network: ${hre.network.name}`);

  } catch (error: any) {
    console.error(`❌ ${strategy} upgrade failed:`, error.message);
    
    if (error.message.includes("Contract source code already verified")) {
      console.log("ℹ️  This might be because the implementation is already verified");
    } else if (error.message.includes("Already Verified")) {
      console.log("ℹ️  Contract is already verified");
    } else {
      console.error("💥 Unexpected error during upgrade");
      throw error;
    }
  }
}

/**
 * Check contract status
 */
async function checkStatus(hre: HardhatRuntimeEnvironment, proxyAddress: string) {
  console.log("🔍 Checking OneP contract status...\n");
  console.log(`📍 Proxy Address: ${proxyAddress}`);
  console.log(`🌐 Network: ${hre.network.name}`);

  try {
    const proxy = await hre.ethers.getContractAt("OneP", proxyAddress);
    
    const verifier = await proxy.verifier();
    const totalSupply = await proxy.totalSupply();
    const maxSupply = await proxy.cap();
    const implementation = await proxy.implementation();

    console.log("✅ Contract Status:");
    console.log(`   Proxy Address: ${proxyAddress}`);
    console.log(`   Implementation: ${implementation}`);
    console.log(`   Verifier: ${verifier}`);
    console.log(`   Total Supply: ${ethers.formatEther(totalSupply)} 1P`);
    console.log(`   Max Supply: ${ethers.formatEther(maxSupply)} 1P`);

    // Check if contract is upgradeable
    try {
      await proxy.upgradeTo.staticCall(implementation);
      console.log("✅ Contract is upgradeable");
    } catch (error) {
      console.log("❌ Contract may not be upgradeable");
    }

  } catch (error: any) {
    console.error("❌ Status check failed:", error.message);
    throw error;
  }
}

// Check if this is a status check
if (process.env.CHECK_STATUS === "true" && process.env.PROXY_ADDRESS) {
  const hre = require("hardhat") as HardhatRuntimeEnvironment;
  checkStatus(hre, process.env.PROXY_ADDRESS)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("💥 Status check failed:", error);
      process.exit(1);
    });
} else {
  // This is the main function that Hardhat will call
  export default main;
}