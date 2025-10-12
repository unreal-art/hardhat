import { HardhatRuntimeEnvironment } from "hardhat/types";
import * as fs from "fs";
import * as path from "path";

interface ContractInfo {
  name: string;
  address: string;
  constructorArgs?: any[];
  isProxy?: boolean;
  implementationAddress?: string;
}

interface NetworkContracts {
  [contractName: string]: ContractInfo;
}

interface DeploymentData {
  [networkName: string]: NetworkContracts;
}

/**
 * Comprehensive contract verification script for all deployed contracts across all networks
 * 
 * Usage Examples:
 * 1. Verify all contracts on all networks:
 *    npx hardhat run scripts/verify-all-contracts.ts
 * 
 * 2. Verify contracts on a specific network:
 *    npx hardhat run scripts/verify-all-contracts.ts --network base
 * 
 * 3. Dry run (see what would be verified):
 *    DRY_RUN=true npx hardhat run scripts/verify-all-contracts.ts
 * 
 * 4. Force re-verification:
 *    FORCE=true npx hardhat run scripts/verify-all-contracts.ts
 * 
 * 5. Skip certain networks (only when running all networks):
 *    npx hardhat run scripts/verify-all-contracts.ts --skip cc,etherlink
 * 
 * 6. Only verify specific networks (only when running all networks):
 *    npx hardhat run scripts/verify-all-contracts.ts --only base,amoy
 * 
 * Note: When using --network <name>, only that specific network will be processed.
 * 
 * Note: If you encounter compilation errors, try verifying contracts on specific networks
 * that don't have problematic contracts (like MoneyPot on cc network).
 */
async function main() {
  const hre = require("hardhat") as HardhatRuntimeEnvironment;
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  
  console.log("🔍 Starting comprehensive contract verification...\n");

  // Get all network directories
  const networks = fs.readdirSync(deploymentsDir).filter(item => {
    const itemPath = path.join(deploymentsDir, item);
    return fs.statSync(itemPath).isDirectory();
  });

  console.log(`📡 Found networks: ${networks.join(", ")}\n`);

  // Parse command line arguments
  const args = process.argv.slice(2);
  const targetNetwork = args.find(arg => arg.startsWith("--network"))?.split("=")[1];
  const skipNetworks = args.find(arg => arg.startsWith("--skip"))?.split("=")[1]?.split(",") || [];
  const onlyNetworks = args.find(arg => arg.startsWith("--only"))?.split("=")[1]?.split(",") || [];
  const dryRun = process.env.DRY_RUN === "true" || args.includes("--dry-run");
  const force = process.env.FORCE === "true" || args.includes("--force");

  // Get the current network from Hardhat
  const currentNetwork = hre.network.name;
  
  // Filter networks based on arguments
  let networksToProcess = networks;
  if (targetNetwork) {
    // If a specific network is requested via --network, use only that network
    networksToProcess = [targetNetwork];
  } else if (currentNetwork && currentNetwork !== "hardhat") {
    // If running on a specific network (not hardhat), use only that network
    networksToProcess = [currentNetwork];
  } else if (onlyNetworks.length > 0) {
    networksToProcess = onlyNetworks.filter(network => networks.includes(network));
  } else {
    networksToProcess = networks.filter(network => !skipNetworks.includes(network));
  }

  console.log(`🎯 Processing networks: ${networksToProcess.join(", ")}\n`);

  // Process each network
  for (const network of networksToProcess) {
    await verifyNetworkContracts(network, deploymentsDir, dryRun, force);
  }

  console.log("\n✅ Contract verification process completed!");
  
  // Print final summary
  console.log("\n📊 FINAL SUMMARY");
  console.log("=" .repeat(50));
  console.log(`🌐 Networks processed: ${networksToProcess.length}`);
  console.log(`📋 Total contracts found: ${await getTotalContractCount(deploymentsDir, networksToProcess)}`);
  console.log("\n💡 Tips:");
  console.log("• Use --network <name> to verify specific networks");
  console.log("• Use DRY_RUN=true to see what would be verified");
  console.log("• Use FORCE=true to re-verify already verified contracts");
  console.log("• Check your etherscan API keys in hardhat.config.ts");
}

async function getTotalContractCount(deploymentsDir: string, networks: string[]): Promise<number> {
  let totalCount = 0;
  
  for (const network of networks) {
    const networkDir = path.join(deploymentsDir, network);
    if (fs.existsSync(networkDir)) {
      const deploymentFiles = fs.readdirSync(networkDir)
        .filter(file => file.endsWith(".json") && !file.includes("solcInputs"));
      
      for (const file of deploymentFiles) {
        const filePath = path.join(networkDir, file);
        try {
          const deploymentData = JSON.parse(fs.readFileSync(filePath, "utf8"));
          if (deploymentData.address) {
            totalCount++;
          }
        } catch (error) {
          // Skip invalid files
        }
      }
    }
  }
  
  return totalCount;
}

async function verifyNetworkContracts(
  network: string, 
  deploymentsDir: string, 
  dryRun: boolean, 
  force: boolean
) {
  const hre = require("hardhat") as HardhatRuntimeEnvironment;
  console.log(`\n🌐 Processing network: ${network}`);
  console.log("=" .repeat(50));

  const networkDir = path.join(deploymentsDir, network);
  
  if (!fs.existsSync(networkDir)) {
    console.log(`❌ Network directory not found: ${networkDir}`);
    return;
  }

  // Get all deployment files
  const deploymentFiles = fs.readdirSync(networkDir)
    .filter(file => file.endsWith(".json") && !file.includes("solcInputs"))
    .sort();

  if (deploymentFiles.length === 0) {
    console.log(`⚠️  No deployment files found for network: ${network}`);
    return;
  }

  console.log(`📄 Found ${deploymentFiles.length} deployment files`);

  // Group contracts by type
  const contracts: ContractInfo[] = [];
  
  for (const file of deploymentFiles) {
    const contractName = file.replace(".json", "");
    const filePath = path.join(networkDir, file);
    
    try {
      const deploymentData = JSON.parse(fs.readFileSync(filePath, "utf8"));
      
      if (deploymentData.address) {
        const contractInfo: ContractInfo = {
          name: contractName,
          address: deploymentData.address,
        };

        // Check if it's a proxy contract
        if (contractName.includes("_Proxy")) {
          contractInfo.isProxy = true;
          // Look for corresponding implementation
          const implFile = contractName.replace("_Proxy", "_Implementation");
          const implPath = path.join(networkDir, `${implFile}.json`);
          if (fs.existsSync(implPath)) {
            const implData = JSON.parse(fs.readFileSync(implPath, "utf8"));
            contractInfo.implementationAddress = implData.address;
          }
        }

        contracts.push(contractInfo);
      }
    } catch (error) {
      console.log(`⚠️  Error reading ${file}: ${error}`);
    }
  }

  console.log(`📋 Contracts to verify: ${contracts.length}`);

  // Verify contracts
  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const contract of contracts) {
    try {
      console.log(`\n🔍 Verifying: ${contract.name}`);
      console.log(`📍 Address: ${contract.address}`);

      if (dryRun) {
        console.log(`🔍 [DRY RUN] Would verify ${contract.name} at ${contract.address}`);
        skipCount++;
        continue;
      }

      // Check if already verified
      if (!force) {
        try {
          await hre.run("verify:verify", {
            address: contract.address,
            constructorArguments: [],
          });
          console.log(`✅ Already verified: ${contract.name}`);
          skipCount++;
          continue;
        } catch (error: any) {
          // If verification fails, it might not be verified yet, continue with verification
          if (!error.message?.includes("Already Verified") && !error.message?.includes("Contract source code already verified")) {
            // This is expected for unverified contracts, continue
          }
        }
      }

      // Attempt verification
      const verifyArgs: any = {
        address: contract.address,
      };

      // Add constructor arguments if available
      if (contract.constructorArgs && contract.constructorArgs.length > 0) {
        verifyArgs.constructorArguments = contract.constructorArgs;
      }

      // For proxy contracts, verify implementation separately
      if (contract.isProxy && contract.implementationAddress) {
        console.log(`🔗 Proxy contract detected, verifying implementation first...`);
        
        try {
          await hre.run("verify:verify", {
            address: contract.implementationAddress,
            constructorArguments: [],
          });
          console.log(`✅ Implementation verified: ${contract.implementationAddress}`);
        } catch (implError: any) {
          console.log(`⚠️  Implementation verification failed: ${implError.message || implError}`);
        }
      }

      // Verify the main contract
      await hre.run("verify:verify", verifyArgs);
      console.log(`✅ Successfully verified: ${contract.name}`);
      successCount++;

    } catch (error: any) {
      console.log(`❌ Failed to verify ${contract.name}: ${error.message || error}`);
      errorCount++;
      
      // Log specific error types for debugging
      if (error.message && error.message.includes("Already Verified")) {
        console.log(`ℹ️  Contract already verified`);
        skipCount++;
        successCount++;
      } else if (error.message && error.message.includes("Contract source code already verified")) {
        console.log(`ℹ️  Contract source code already verified`);
        skipCount++;
        successCount++;
      } else if (error.message && error.message.includes("Invalid API Key")) {
        console.log(`🔑 API Key issue - check your etherscan configuration`);
      } else if (error.message && error.message.includes("Rate limit")) {
        console.log(`⏱️  Rate limit exceeded - waiting before retry`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    // Add delay between verifications to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Summary for this network
  console.log(`\n📊 Network ${network} Summary:`);
  console.log(`✅ Successfully verified: ${successCount}`);
  console.log(`⏭️  Skipped (already verified): ${skipCount}`);
  console.log(`❌ Failed: ${errorCount}`);
  console.log(`📈 Total processed: ${contracts.length}`);
}

/**
 * Verify a specific contract with custom parameters
 */
async function verifySpecificContract(
  network: string,
  contractName: string,
  address: string,
  constructorArgs: any[] = []
) {
  const hre = require("hardhat") as HardhatRuntimeEnvironment;
  console.log(`\n🎯 Verifying specific contract: ${contractName}`);
  console.log(`📍 Address: ${address}`);
  console.log(`🌐 Network: ${network}`);

  try {
    await hre.run("verify:verify", {
      address: address,
      constructorArguments: constructorArgs,
    });
    console.log(`✅ Successfully verified: ${contractName}`);
  } catch (error: any) {
    console.log(`❌ Failed to verify ${contractName}: ${error.message || error}`);
    throw error;
  }
}

/**
 * Get verification status for all contracts
 */
async function getVerificationStatus(network: string) {
  const hre = require("hardhat") as HardhatRuntimeEnvironment;
  console.log(`\n📊 Verification Status for ${network}:`);
  
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  const networkDir = path.join(deploymentsDir, network);
  
  if (!fs.existsSync(networkDir)) {
    console.log(`❌ Network directory not found: ${networkDir}`);
    return;
  }

  const deploymentFiles = fs.readdirSync(networkDir)
    .filter(file => file.endsWith(".json") && !file.includes("solcInputs"));

  for (const file of deploymentFiles) {
    const contractName = file.replace(".json", "");
    const filePath = path.join(networkDir, file);
    
    try {
      const deploymentData = JSON.parse(fs.readFileSync(filePath, "utf8"));
      
      if (deploymentData.address) {
        try {
          await hre.run("verify:verify", {
            address: deploymentData.address,
            constructorArguments: [],
          });
          console.log(`✅ ${contractName}: Verified`);
        } catch (error: any) {
          if (error.message && error.message.includes("Already Verified")) {
            console.log(`✅ ${contractName}: Already Verified`);
          } else {
            console.log(`❌ ${contractName}: Not Verified`);
          }
        }
      }
    } catch (error: any) {
      console.log(`⚠️  ${contractName}: Error checking status`);
    }
  }
}

// Handle command line arguments
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("💥 Script failed:", error);
      process.exit(1);
    });
}

export {
  verifySpecificContract,
  getVerificationStatus,
  verifyNetworkContracts
};
