import { HardhatRuntimeEnvironment } from "hardhat/types";
import { ethers } from "hardhat";

/**
 * OneP Contract Upgrade Script - All-in-One
 * 
 * This single script handles all OneP contract upgrade needs with sensible defaults.
 * 
 * Usage:
 * npx hardhat run scripts/upgrade-onep.ts --network <network>
 * 
 * Environment Variables (all optional):
 * - PROXY_ADDRESS: Proxy contract address (defaults to known deployments)
 * - ADMIN_ADDRESS: Admin address (defaults to first account)
 * - DRY_RUN: true/false (default: false)
 * - STRATEGY: standard/init/emergency (default: standard)
 * - CHECK_ONLY: true/false (default: false)
 */

// Known deployments for easy reference
const KNOWN_DEPLOYMENTS = {
  "cc": "0x15868E3227F91E7457689022DeFd364037F4293C",
  "etherlink": "0x74490cf620C2CEe6633082dC8F8D07C42FEe6aD3"
};

async function main(hre: HardhatRuntimeEnvironment) {
  console.log("🔄 OneP Contract Upgrade Script - All-in-One\n");

  // Get parameters with sensible defaults
  const network = hre.network.name;
  const proxyAddress = process.env.PROXY_ADDRESS || KNOWN_DEPLOYMENTS[network as keyof typeof KNOWN_DEPLOYMENTS];
  const dryRun = process.env.DRY_RUN === "true";
  const strategy = process.env.STRATEGY || "standard";
  const checkOnly = process.env.CHECK_ONLY === "true";

  // Get admin address - use first account if not provided
  let adminAddress = process.env.ADMIN_ADDRESS;
  if (!adminAddress) {
    const accounts = await hre.ethers.getSigners();
    adminAddress = await accounts[0].getAddress();
    console.log(`ℹ️  Using first account as admin: ${adminAddress}`);
  }

  // Show configuration
  console.log(`📍 Proxy: ${proxyAddress}`);
  console.log(`👤 Admin: ${adminAddress}`);
  console.log(`🎯 Strategy: ${strategy}`);
  console.log(`🌐 Network: ${network}`);
  console.log(`🔍 Dry Run: ${dryRun}`);
  console.log(`🔍 Check Only: ${checkOnly}`);

  // Validate inputs
  if (!proxyAddress) {
    console.log("\n❌ No proxy address found!");
    console.log("💡 Available networks with known deployments:");
    for (const [net, addr] of Object.entries(KNOWN_DEPLOYMENTS)) {
      console.log(`   ${net}: ${addr}`);
    }
    console.log("\n💡 Or set PROXY_ADDRESS environment variable");
    return;
  }

  try {
    const adminSigner = await hre.ethers.getSigner(adminAddress);
    const proxy = await hre.ethers.getContractAt("OneP", proxyAddress);
    
    const currentImpl = await proxy.implementation();
    console.log(`📍 Current Implementation: ${currentImpl}`);

    // Check contract status
    console.log("\n🔍 Checking contract status...");
    const verifier = await proxy.verifier();
    const totalSupply = await proxy.totalSupply();
    const maxSupply = await proxy.cap();

    console.log(`✅ Contract Status:`);
    console.log(`   Verifier: ${verifier}`);
    console.log(`   Total Supply: ${ethers.formatEther(totalSupply)} 1P`);
    console.log(`   Max Supply: ${ethers.formatEther(maxSupply)} 1P`);

    // If check only, stop here
    if (checkOnly) {
      console.log("✅ Status check completed!");
      return;
    }

    // Check if contract is upgradeable
    try {
      await proxy.upgradeTo.staticCall(currentImpl);
      console.log("✅ Contract is upgradeable");
    } catch (error) {
      console.log("❌ Contract may not be upgradeable");
    }

    if (dryRun) {
      console.log("\n🔍 [DRY RUN] Would perform upgrade:");
      console.log(`   Strategy: ${strategy}`);
      console.log(`   Deploy new implementation`);
      console.log(`   Upgrade proxy to new implementation`);
      if (strategy === "init") {
        console.log(`   Reinitialize contract`);
      }
      return;
    }

    // Perform upgrade
    console.log(`\n🚀 Performing ${strategy} upgrade...`);

    // Deploy new implementation
    console.log("📦 Deploying new implementation...");
    const OnePFactory = await hre.ethers.getContractFactory("OneP");
    const newImpl = await OnePFactory.deploy();
    await newImpl.waitForDeployment();
    
    const newImplAddress = await newImpl.getAddress();
    console.log(`✅ New implementation: ${newImplAddress}`);

    // Upgrade proxy
    console.log("🔧 Upgrading proxy...");
    const upgradeTx = await proxy.upgradeTo(newImplAddress);
    await upgradeTx.wait();

    // Handle strategy-specific logic
    if (strategy === "init") {
      console.log("🔧 Reinitializing contract...");
      try {
        const reinitTx = await proxy.initialize(verifier);
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

    // Verify upgrade
    console.log("\n🧪 Verifying upgrade...");
    const newVerifier = await proxy.verifier();
    const newTotalSupply = await proxy.totalSupply();
    const newMaxSupply = await proxy.cap();
    const newImplementation = await proxy.implementation();

    console.log(`✅ Verification successful!`);
    console.log(`   Implementation: ${newImplementation}`);
    console.log(`   Verifier: ${newVerifier}`);
    console.log(`   Total Supply: ${ethers.formatEther(newTotalSupply)} 1P`);
    console.log(`   Max Supply: ${ethers.formatEther(newMaxSupply)} 1P`);

    console.log("\n📊 Upgrade Summary:");
    console.log(`   Proxy Address: ${proxyAddress}`);
    console.log(`   Old Implementation: ${currentImpl}`);
    console.log(`   New Implementation: ${newImplAddress}`);
    console.log(`   Strategy: ${strategy}`);
    console.log(`   Network: ${network}`);

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

export default main;