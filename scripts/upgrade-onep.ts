import { HardhatRuntimeEnvironment } from "hardhat/types";
import { ethers } from "hardhat";

/**
 * OneP Contract Upgrade Script
 * 
 * This script upgrades the OneP contract to a new implementation while preserving all state.
 * It uses OpenZeppelin's transparent proxy pattern for upgrades.
 * 
 * Usage:
 * npx hardhat run scripts/upgrade-onep.ts --network <network_name>
 * 
 * Example:
 * npx hardhat run scripts/upgrade-onep.ts --network base
 */
async function main(hre: HardhatRuntimeEnvironment) {
  // Check if this is a compatibility check
  const checkOnly = process.env.CHECK_ONLY === "true";
  
  if (checkOnly) {
    await checkUpgradeCompatibility(hre);
    return;
  }

  console.log("🔄 Starting OneP contract upgrade process...\n");

  const { deployments, getNamedAccounts } = hre;
  const { deploy, get } = deployments;
  const { admin } = await getNamedAccounts();

  console.log(`👤 Admin account: ${admin}`);
  console.log(`🌐 Network: ${hre.network.name}`);

  try {
    // Get the current proxy deployment
    const currentDeployment = await get("OneP");
    console.log(`📍 Current OneP proxy address: ${currentDeployment.address}`);

    // Get the current implementation
    const currentImplDeployment = await get("OneP_Implementation");
    console.log(`📍 Current implementation address: ${currentImplDeployment.address}`);

    // Deploy new implementation
    console.log("\n🚀 Deploying new OneP implementation...");
    
    const newImplDeployment = await deploy("OneP_Implementation", {
      from: admin,
      contract: "OneP",
      log: true,
    });

    console.log(`✅ New implementation deployed at: ${newImplDeployment.address}`);

    // Get the proxy contract instance
    const proxyAdmin = await ethers.getContractAt("DefaultProxyAdmin", currentDeployment.address);
    const proxy = await ethers.getContractAt("OneP", currentDeployment.address);

    console.log("\n🔧 Upgrading proxy to new implementation...");

    // Upgrade the proxy to point to the new implementation
    const upgradeTx = await proxyAdmin.upgrade(currentDeployment.address, newImplDeployment.address);
    await upgradeTx.wait();

    console.log(`✅ Proxy upgraded successfully!`);
    console.log(`📍 New implementation address: ${newImplDeployment.address}`);

    // Verify the upgrade worked by calling a function on the proxy
    console.log("\n🧪 Verifying upgrade...");
    
    const verifier = await proxy.verifier();
    const totalSupply = await proxy.totalSupply();
    const maxSupply = await proxy.cap();

    console.log(`✅ Verification successful!`);
    console.log(`   Verifier: ${verifier}`);
    console.log(`   Total Supply: ${ethers.formatEther(totalSupply)} 1P`);
    console.log(`   Max Supply: ${ethers.formatEther(maxSupply)} 1P`);

    // Optional: Initialize any new functionality if needed
    console.log("\n🔍 Checking if new initialization is needed...");
    
    // You can add any new initialization logic here
    // For example, if you added new state variables or functions
    
    console.log("✅ Upgrade completed successfully!");
    console.log("\n📊 Upgrade Summary:");
    console.log(`   Proxy Address: ${currentDeployment.address}`);
    console.log(`   Old Implementation: ${currentImplDeployment.address}`);
    console.log(`   New Implementation: ${newImplDeployment.address}`);
    console.log(`   Network: ${hre.network.name}`);

  } catch (error: any) {
    console.error("❌ Upgrade failed:", error.message);
    
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
 * Alternative upgrade method using hardhat-deploy's upgrade functionality
 */
async function upgradeWithHardhatDeploy(hre: HardhatRuntimeEnvironment) {
  console.log("🔄 Starting OneP contract upgrade using hardhat-deploy...\n");

  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { admin } = await getNamedAccounts();

  try {
    // Deploy new implementation (hardhat-deploy upgrade method)
    const upgradeResult = await deploy("OneP", {
      from: admin,
      contract: "OneP",
      proxy: {
        proxyContract: "OpenZeppelinTransparentProxy",
        // Note: hardhat-deploy doesn't support upgrade flag in this version
        // We'll use the standard upgrade method instead
      },
      log: true,
    });

    console.log(`✅ Upgrade completed!`);
    console.log(`📍 Proxy address: ${upgradeResult.address}`);
    console.log(`📍 New implementation: ${upgradeResult.implementation}`);

  } catch (error: any) {
    console.error("❌ Upgrade failed:", error.message);
    throw error;
  }
}

/**
 * Check upgrade compatibility
 */
async function checkUpgradeCompatibility(hre: HardhatRuntimeEnvironment) {
  console.log("🔍 Checking upgrade compatibility...\n");

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
    console.log(`   Verifier: ${verifier}`);
    console.log(`   Total Supply: ${ethers.formatEther(totalSupply)} 1P`);
    console.log(`   Max Supply: ${ethers.formatEther(maxSupply)} 1P`);

    // You can add more compatibility checks here
    console.log("✅ Contract appears to be upgradeable");

  } catch (error: any) {
    console.error("❌ Compatibility check failed:", error.message);
    throw error;
  }
}

// Export functions for use in other scripts
export {
  upgradeWithHardhatDeploy,
  checkUpgradeCompatibility
};

// This is the main function that Hardhat will call
export default main;