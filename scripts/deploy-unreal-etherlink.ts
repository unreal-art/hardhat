import { ethers } from "hardhat";
import { UnrealToken, UnrealBridge } from "../typechain-types";

async function main() {
  console.log("🚀 Deploying $UNREAL utility token and Bridge contracts on Etherlink...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));

  // Deploy UnrealToken (utility token)
  console.log("\n💎 Deploying $UNREAL Token...");
  const UnrealTokenFactory = await ethers.getContractFactory("UnrealToken");
  const unrealToken = await UnrealTokenFactory.deploy();
  await unrealToken.waitForDeployment();
  
  const unrealTokenAddress = await unrealToken.getAddress();
  console.log("✅ $UNREAL Token deployed to:", unrealTokenAddress);

  // Deploy UnrealBridge
  console.log("\n🌉 Deploying UnrealBridge...");
  const UnrealBridgeFactory = await ethers.getContractFactory("UnrealBridge");
  const bridge = await UnrealBridgeFactory.deploy();
  await bridge.waitForDeployment();
  
  const bridgeAddress = await bridge.getAddress();
  console.log("✅ UnrealBridge deployed to:", bridgeAddress);

  // Initialize contracts
  console.log("\n⚙️  Initializing contracts...");
  
  // Initialize UnrealToken
  await unrealToken.initialize(
    "UNREAL Token",
    "UNREAL",
    ethers.parseEther("1000000") // 1M initial supply
  );
  console.log("✅ $UNREAL Token initialized");

  // Initialize UnrealBridge (update to use UnrealToken instead of WrappedUnrealToken)
  await bridge.initialize(unrealTokenAddress);
  console.log("✅ UnrealBridge initialized");

  // Verify setup
  console.log("\n🔍 Verifying setup...");
  const tokenName = await unrealToken.name();
  const tokenSymbol = await unrealToken.symbol();
  const totalSupply = await unrealToken.totalSupply();
  const bridgeTokenAddress = await bridge.wrappedToken();
  
  console.log("Token name:", tokenName);
  console.log("Token symbol:", tokenSymbol);
  console.log("Total supply:", ethers.formatEther(totalSupply));
  console.log("Bridge token address:", bridgeTokenAddress);

  console.log("\n🎉 Deployment completed successfully!");
  console.log("📝 Contract addresses:");
  console.log("  $UNREAL Token:", unrealTokenAddress);
  console.log("  UnrealBridge:", bridgeAddress);
  
  // Save deployment info
  const deploymentInfo = {
    network: "etherlink",
    chainId: 42793,
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      UnrealToken: unrealTokenAddress,
      UnrealBridge: bridgeAddress
    }
  };
  
  console.log("\n💾 Deployment info:", JSON.stringify(deploymentInfo, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
