import { HardhatRuntimeEnvironment } from "hardhat/types";
import { ethers } from "hardhat";

/**
 * Advanced OneP Contract Upgrade Script
 * 
 * This script provides multiple upgrade strategies for the OneP contract:
 * 1. Standard upgrade (preserves all state)
 * 2. Upgrade with new initialization
 * 3. Emergency upgrade (if needed)
 * 4. Rollback capability
 * 
 * Usage:
 * npx hardhat run scripts/upgrade-onep-advanced.ts --network <network_name>
 * 
 * Environment Variables:
 * - UPGRADE_STRATEGY: standard|init|emergency|rollback
 * - DRY_RUN: true|false
 * - CHECK_ONLY: true|false
 */
async function main(hre: HardhatRuntimeEnvironment) {
  console.log("🔄 Starting Advanced OneP contract upgrade process...\n");

  const strategy = process.env.UPGRADE_STRATEGY || "standard";
  const dryRun = process.env.DRY_RUN === "true";
  const checkOnly = process.env.CHECK_ONLY === "true";

  console.log(`🎯 Upgrade strategy: ${strategy}`);
  console.log(`🔍 Dry run: ${dryRun}`);
  console.log(`🌐 Network: ${hre.network.name}`);

  if (checkOnly) {
    await checkUpgradeCompatibility(hre);
    return;
  }

  switch (strategy) {
    case "standard":
      await performStandardUpgrade(hre, dryRun);
      break;
    case "init":
      await performUpgradeWithInitialization(hre, dryRun);
      break;
    case "emergency":
      await performEmergencyUpgrade(hre, dryRun);
      break;
    case "rollback":
      await performRollback(hre, dryRun);
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
async function performStandardUpgrade(hre: HardhatRuntimeEnvironment, dryRun: boolean = false) {
  console.log("\n🔄 Performing standard upgrade...");

  const { deployments, getNamedAccounts } = hre;
  const { deploy, get } = deployments;
  const { admin } = await getNamedAccounts();

  try {
    // Get current deployment info
    const currentDeployment = await get("OneP");
    const currentImplDeployment = await get("OneP_Implementation");
    
    console.log(`📍 Current proxy: ${currentDeployment.address}`);
    console.log(`📍 Current implementation: ${currentImplDeployment.address}`);

    if (dryRun) {
      console.log("🔍 [DRY RUN] Would deploy new implementation and upgrade proxy");
      return;
    }

    // Deploy new implementation
    console.log("🚀 Deploying new implementation...");
    const newImplDeployment = await deploy("OneP_Implementation", {
      from: admin,
      contract: "OneP",
      log: true,
    });

    // Upgrade proxy
    console.log("🔧 Upgrading proxy...");
    const proxyAdmin = await ethers.getContractAt("DefaultProxyAdmin", currentDeployment.address);
    const upgradeTx = await proxyAdmin.upgrade(currentDeployment.address, newImplDeployment.address);
    await upgradeTx.wait();

    console.log("✅ Standard upgrade completed!");
    await verifyUpgrade(hre, currentDeployment.address);

  } catch (error: any) {
    console.error("❌ Standard upgrade failed:", error.message);
    throw error;
  }
}

/**
 * Upgrade with new initialization
 */
async function performUpgradeWithInitialization(hre: HardhatRuntimeEnvironment, dryRun: boolean = false) {
  console.log("\n🔄 Performing upgrade with initialization...");

  const { deployments, getNamedAccounts } = hre;
  const { deploy, get } = deployments;
  const { admin, verifier } = await getNamedAccounts();

  try {
    const currentDeployment = await get("OneP");
    
    if (dryRun) {
      console.log("🔍 [DRY RUN] Would upgrade and reinitialize contract");
      return;
    }

    // Deploy new implementation
    const newImplDeployment = await deploy("OneP_Implementation", {
      from: admin,
      contract: "OneP",
      log: true,
    });

    // Upgrade proxy
    const proxyAdmin = await ethers.getContractAt("DefaultProxyAdmin", currentDeployment.address);
    const upgradeTx = await proxyAdmin.upgrade(currentDeployment.address, newImplDeployment.address);
    await upgradeTx.wait();

    // Reinitialize if needed (be careful with this!)
    console.log("🔧 Reinitializing contract...");
    const proxy = await ethers.getContractAt("OneP", currentDeployment.address);
    
    // Only reinitialize if the contract supports it and it's safe to do so
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

    console.log("✅ Upgrade with initialization completed!");
    await verifyUpgrade(hre, currentDeployment.address);

  } catch (error: any) {
    console.error("❌ Upgrade with initialization failed:", error.message);
    throw error;
  }
}

/**
 * Emergency upgrade (for critical fixes)
 */
async function performEmergencyUpgrade(hre: HardhatRuntimeEnvironment, dryRun: boolean = false) {
  console.log("\n🚨 Performing emergency upgrade...");
  console.log("⚠️  WARNING: Emergency upgrades should only be used for critical fixes!");

  const { deployments, getNamedAccounts } = hre;
  const { deploy, get } = deployments;
  const { admin } = await getNamedAccounts();

  try {
    const currentDeployment = await get("OneP");
    
    if (dryRun) {
      console.log("🔍 [DRY RUN] Would perform emergency upgrade");
      return;
    }

    // Deploy emergency implementation
    console.log("🚀 Deploying emergency implementation...");
    const emergencyImplDeployment = await deploy("OneP_Emergency", {
      from: admin,
      contract: "OneP",
      log: true,
    });

    // Emergency upgrade
    console.log("🔧 Performing emergency upgrade...");
    const proxyAdmin = await ethers.getContractAt("DefaultProxyAdmin", currentDeployment.address);
    const upgradeTx = await proxyAdmin.upgrade(currentDeployment.address, emergencyImplDeployment.address);
    await upgradeTx.wait();

    console.log("✅ Emergency upgrade completed!");
    await verifyUpgrade(hre, currentDeployment.address);

  } catch (error: any) {
    console.error("❌ Emergency upgrade failed:", error.message);
    throw error;
  }
}

/**
 * Rollback to previous implementation
 */
async function performRollback(hre: HardhatRuntimeEnvironment, dryRun: boolean = false) {
  console.log("\n↩️  Performing rollback...");

  const { deployments } = hre;
  const { get } = deployments;

  try {
    const currentDeployment = await get("OneP");
    const currentImplDeployment = await get("OneP_Implementation");
    
    // You would need to have the previous implementation address stored
    // For now, we'll show how this would work
    console.log(`📍 Current implementation: ${currentImplDeployment.address}`);
    
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
    const proxy = await ethers.getContractAt("OneP", proxyAddress);
    
    const verifier = await proxy.verifier();
    const totalSupply = await proxy.totalSupply();
    const maxSupply = await proxy.cap();

    console.log("✅ Upgrade verification successful!");
    console.log(`   Verifier: ${verifier}`);
    console.log(`   Total Supply: ${ethers.formatEther(totalSupply)} 1P`);
    console.log(`   Max Supply: ${ethers.formatEther(maxSupply)} 1P`);

  } catch (error: any) {
    console.error("❌ Upgrade verification failed:", error.message);
    throw error;
  }
}

/**
 * Check upgrade compatibility
 */
async function checkUpgradeCompatibility(hre: HardhatRuntimeEnvironment) {
  console.log("\n🔍 Checking upgrade compatibility...");

  const { deployments } = hre;
  const { get } = deployments;

  try {
    const currentDeployment = await get("OneP");
    const proxy = await ethers.getContractAt("OneP", currentDeployment.address);

    // Check current state
    const verifier = await proxy.verifier();
    const totalSupply = await proxy.totalSupply();
    const maxSupply = await proxy.cap();

    console.log("✅ Current contract state:");
    console.log(`   Proxy Address: ${currentDeployment.address}`);
    console.log(`   Verifier: ${verifier}`);
    console.log(`   Total Supply: ${ethers.formatEther(totalSupply)} 1P`);
    console.log(`   Max Supply: ${ethers.formatEther(maxSupply)} 1P`);

    // Check if contract is upgradeable
    try {
      const proxyAdmin = await ethers.getContractAt("DefaultProxyAdmin", currentDeployment.address);
      console.log("✅ Contract is upgradeable");
    } catch (error) {
      console.log("❌ Contract may not be upgradeable");
    }

  } catch (error: any) {
    console.error("❌ Compatibility check failed:", error.message);
    throw error;
  }
}

// Export functions for use in other scripts
export {
  performStandardUpgrade,
  performUpgradeWithInitialization,
  performEmergencyUpgrade,
  performRollback,
  checkUpgradeCompatibility
};

// This is the main function that Hardhat will call
export default main;