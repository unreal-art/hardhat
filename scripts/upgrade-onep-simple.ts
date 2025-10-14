import { HardhatRuntimeEnvironment } from "hardhat/types";
import { ethers } from "hardhat";

/**
 * Simple OneP Contract Upgrade Script
 * 
 * Usage:
 * npx hardhat run scripts/upgrade-onep-simple.ts --network <network>
 * 
 * Set these environment variables:
 * - PROXY_ADDRESS: Proxy contract address
 * - ADMIN_ADDRESS: Admin address
 * - DRY_RUN: true/false (optional)
 */

async function main(hre: HardhatRuntimeEnvironment) {
  console.log("🔄 OneP Contract Upgrade Script\n");

  const proxyAddress = process.env.PROXY_ADDRESS;
  const adminAddress = process.env.ADMIN_ADDRESS;
  const dryRun = process.env.DRY_RUN === "true";

  if (!proxyAddress) {
    console.log("❌ PROXY_ADDRESS environment variable is required");
    console.log("\n💡 Known deployments:");
    console.log("CC Network: 0x15868E3227F91E7457689022DeFd364037F4293C");
    console.log("Etherlink: 0x74490cf620C2CEe6633082dC8F8D07C42FEe6aD3");
    console.log("\nExample:");
    console.log("PROXY_ADDRESS=0x15868E3227F91E7457689022DeFd364037F4293C ADMIN_ADDRESS=<admin> npx hardhat run scripts/upgrade-onep-simple.ts --network cc");
    return;
  }

  if (!adminAddress) {
    console.log("❌ ADMIN_ADDRESS environment variable is required");
    return;
  }

  console.log(`📍 Proxy: ${proxyAddress}`);
  console.log(`👤 Admin: ${adminAddress}`);
  console.log(`🌐 Network: ${hre.network.name}`);
  console.log(`🔍 Dry Run: ${dryRun}`);

  try {
    const adminSigner = await hre.ethers.getSigner(adminAddress);
    const proxy = await hre.ethers.getContractAt("OneP", proxyAddress);
    
    const currentImpl = await proxy.implementation();
    console.log(`📍 Current Implementation: ${currentImpl}`);

    if (dryRun) {
      console.log("🔍 [DRY RUN] Would deploy new implementation and upgrade proxy");
      return;
    }

    console.log("\n🚀 Deploying new implementation...");
    const OnePFactory = await hre.ethers.getContractFactory("OneP");
    const newImpl = await OnePFactory.deploy();
    await newImpl.waitForDeployment();
    
    const newImplAddress = await newImpl.getAddress();
    console.log(`✅ New implementation: ${newImplAddress}`);

    console.log("\n🔧 Upgrading proxy...");
    const upgradeTx = await proxy.upgradeTo(newImplAddress);
    await upgradeTx.wait();

    console.log("✅ Upgrade completed!");

    console.log("\n🧪 Verifying...");
    const verifier = await proxy.verifier();
    const totalSupply = await proxy.totalSupply();
    const maxSupply = await proxy.cap();

    console.log(`✅ Verification successful!`);
    console.log(`   Verifier: ${verifier}`);
    console.log(`   Total Supply: ${ethers.formatEther(totalSupply)} 1P`);
    console.log(`   Max Supply: ${ethers.formatEther(maxSupply)} 1P`);

  } catch (error: any) {
    console.error("❌ Upgrade failed:", error.message);
    throw error;
  }
}

export default main;
