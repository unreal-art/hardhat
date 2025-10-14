import { HardhatRuntimeEnvironment } from "hardhat/types";
import { ethers } from "hardhat";
import { task, types } from "hardhat/config";

/**
 * Advanced OneP Contract Upgrade Script - Standalone Version
 * 
 * This script provides multiple upgrade strategies without requiring deployment files.
 * It works by directly interacting with the blockchain using contract addresses.
 * 
 * Usage:
 * npx hardhat upgrade-onep-advanced --network <network> --proxy <address> --admin <address> --strategy <strategy>
 */
async function upgradeOnePAdvanced(
  hre: HardhatRuntimeEnvironment,
  proxyAddress: string,
  adminAddress: string,
  strategy: string = "standard",
  dryRun: boolean = false
) {
  console.log("🔄 Starting Advanced OneP contract upgrade process...\n");
  console.log(`📍 Proxy Address: ${proxyAddress}`);
  console.log(`👤 Admin Address: ${adminAddress}`);
  console.log(`🎯 Strategy: ${strategy}`);
  console.log(`🌐 Network: ${hre.network.name}`);
  console.log(`🔍 Dry Run: ${dryRun}`);

  switch (strategy) {
    case "standard":
      await performStandardUpgrade(hre, proxyAddress, adminAddress, dryRun);
      break;
    case "init":
      await performUpgradeWithInitialization(hre, proxyAddress, adminAddress, dryRun);
      break;
    case "emergency":
      await performEmergencyUpgrade(hre, proxyAddress, adminAddress, dryRun);
      break;
    case "rollback":
      await performRollback(hre, proxyAddress, adminAddress, dryRun);
      break;
    default:
      console.error(`❌ Unknown strategy: ${strategy}`);
      console.log("Available strategies: standard, init, emergency, rollback");
      process.exit(1);
  }
}

/**
 * Standard upgrade - preserves all state
 */
async function performStandardUpgrade(
  hre: HardhatRuntimeEnvironment,
  proxyAddress: string,
  adminAddress: string,
  dryRun: boolean = false
) {
  console.log("\n🔄 Performing standard upgrade...");

  try {
    const adminSigner = await hre.ethers.getSigner(adminAddress);
    const proxy = await hre.ethers.getContractAt("OneP", proxyAddress);
    
    const currentImplAddress = await proxy.implementation();
    console.log(`📍 Current implementation: ${currentImplAddress}`);

    if (dryRun) {
      console.log("🔍 [DRY RUN] Would deploy new implementation and upgrade proxy");
      return;
    }

    // Deploy new implementation
    console.log("🚀 Deploying new implementation...");
    const OnePFactory = await hre.ethers.getContractFactory("OneP");
    const newImplementation = await OnePFactory.deploy();
    await newImplementation.waitForDeployment();
    
    const newImplAddress = await newImplementation.getAddress();
    console.log(`✅ New implementation deployed at: ${newImplAddress}`);

    // Upgrade proxy
    console.log("🔧 Upgrading proxy...");
    const upgradeTx = await proxy.upgradeTo(newImplAddress);
    await upgradeTx.wait();

    console.log("✅ Standard upgrade completed!");
    await verifyUpgrade(hre, proxyAddress);

  } catch (error: any) {
    console.error("❌ Standard upgrade failed:", error.message);
    throw error;
  }
}

/**
 * Upgrade with new initialization
 */
async function performUpgradeWithInitialization(
  hre: HardhatRuntimeEnvironment,
  proxyAddress: string,
  adminAddress: string,
  dryRun: boolean = false
) {
  console.log("\n🔄 Performing upgrade with initialization...");

  try {
    const adminSigner = await hre.ethers.getSigner(adminAddress);
    const proxy = await hre.ethers.getContractAt("OneP", proxyAddress);
    
    if (dryRun) {
      console.log("🔍 [DRY RUN] Would upgrade and reinitialize contract");
      return;
    }

    // Deploy new implementation
    const OnePFactory = await hre.ethers.getContractFactory("OneP");
    const newImplementation = await OnePFactory.deploy();
    await newImplementation.waitForDeployment();
    
    const newImplAddress = await newImplementation.getAddress();

    // Upgrade proxy
    const upgradeTx = await proxy.upgradeTo(newImplAddress);
    await upgradeTx.wait();

    // Reinitialize if needed (be careful with this!)
    console.log("🔧 Reinitializing contract...");
    
    try {
      // Get verifier address from current contract
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

    console.log("✅ Upgrade with initialization completed!");
    await verifyUpgrade(hre, proxyAddress);

  } catch (error: any) {
    console.error("❌ Upgrade with initialization failed:", error.message);
    throw error;
  }
}

/**
 * Emergency upgrade (for critical fixes)
 */
async function performEmergencyUpgrade(
  hre: HardhatRuntimeEnvironment,
  proxyAddress: string,
  adminAddress: string,
  dryRun: boolean = false
) {
  console.log("\n🚨 Performing emergency upgrade...");
  console.log("⚠️  WARNING: Emergency upgrades should only be used for critical fixes!");

  try {
    const adminSigner = await hre.ethers.getSigner(adminAddress);
    const proxy = await hre.ethers.getContractAt("OneP", proxyAddress);
    
    if (dryRun) {
      console.log("🔍 [DRY RUN] Would perform emergency upgrade");
      return;
    }

    // Deploy emergency implementation
    console.log("🚀 Deploying emergency implementation...");
    const OnePFactory = await hre.ethers.getContractFactory("OneP");
    const emergencyImplementation = await OnePFactory.deploy();
    await emergencyImplementation.waitForDeployment();
    
    const emergencyImplAddress = await emergencyImplementation.getAddress();

    // Emergency upgrade
    console.log("🔧 Performing emergency upgrade...");
    const upgradeTx = await proxy.upgradeTo(emergencyImplAddress);
    await upgradeTx.wait();

    console.log("✅ Emergency upgrade completed!");
    await verifyUpgrade(hre, proxyAddress);

  } catch (error: any) {
    console.error("❌ Emergency upgrade failed:", error.message);
    throw error;
  }
}

/**
 * Rollback to previous implementation
 */
async function performRollback(
  hre: HardhatRuntimeEnvironment,
  proxyAddress: string,
  adminAddress: string,
  dryRun: boolean = false
) {
  console.log("\n↩️  Performing rollback...");

  try {
    const adminSigner = await hre.ethers.getSigner(adminAddress);
    const proxy = await hre.ethers.getContractAt("OneP", proxyAddress);
    
    const currentImplAddress = await proxy.implementation();
    console.log(`📍 Current implementation: ${currentImplAddress}`);
    
    if (dryRun) {
      console.log("🔍 [DRY RUN] Would rollback to previous implementation");
      console.log("⚠️  Note: You need to provide the previous implementation address");
      return;
    }

    // This would require you to have the previous implementation address
    console.log("❌ Rollback requires previous implementation address");
    console.log("💡 Store implementation addresses in a registry for rollback capability");

  } catch (error: any) {
    console.error("❌ Rollback failed:", error.message);
    throw error;
  }
}

/**
 * Verify upgrade was successful
 */
async function verifyUpgrade(hre: HardhatRuntimeEnvironment, proxyAddress: string) {
  console.log("\n🧪 Verifying upgrade...");
  
  try {
    const proxy = await hre.ethers.getContractAt("OneP", proxyAddress);
    
    const verifier = await proxy.verifier();
    const totalSupply = await proxy.totalSupply();
    const maxSupply = await proxy.cap();
    const implementation = await proxy.implementation();

    console.log("✅ Upgrade verification successful!");
    console.log(`   Implementation: ${implementation}`);
    console.log(`   Verifier: ${verifier}`);
    console.log(`   Total Supply: ${ethers.formatEther(totalSupply)} 1P`);
    console.log(`   Max Supply: ${ethers.formatEther(maxSupply)} 1P`);

  } catch (error: any) {
    console.error("❌ Upgrade verification failed:", error.message);
    throw error;
  }
}

/**
 * Check contract compatibility and status
 */
async function checkContractStatus(
  hre: HardhatRuntimeEnvironment,
  proxyAddress: string
) {
  console.log("🔍 Checking OneP contract status...\n");
  console.log(`📍 Proxy Address: ${proxyAddress}`);
  console.log(`🌐 Network: ${hre.network.name}`);

  try {
    const proxy = await hre.ethers.getContractAt("OneP", proxyAddress);
    
    // Get contract state
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

// Hardhat Tasks
task("upgrade-onep-advanced", "Advanced OneP contract upgrade with multiple strategies")
  .addParam("proxy", "Proxy contract address")
  .addParam("admin", "Admin address")
  .addOptionalParam("strategy", "Upgrade strategy", "standard", types.string)
  .addOptionalParam("dryrun", "Dry run mode", false, types.boolean)
  .setAction(async (taskArgs, hre) => {
    await upgradeOnePAdvanced(hre, taskArgs.proxy, taskArgs.admin, taskArgs.strategy, taskArgs.dryrun);
  });

task("check-onep-advanced", "Check OneP contract status")
  .addParam("proxy", "Proxy contract address")
  .setAction(async (taskArgs, hre) => {
    await checkContractStatus(hre, taskArgs.proxy);
  });

// Export functions for programmatic use
export {
  upgradeOnePAdvanced,
  performStandardUpgrade,
  performUpgradeWithInitialization,
  performEmergencyUpgrade,
  performRollback,
  checkContractStatus
};
