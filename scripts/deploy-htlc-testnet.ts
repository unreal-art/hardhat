import { ethers } from "hardhat";
import { formatUnits, parseUnits } from "ethers/lib/utils";
import { upgrades } from "@openzeppelin/hardhat-upgrades";
import fs from "fs";
import path from "path";

async function main() {
  console.log("Deploying UnrealHTLC contract to Etherlink testnet...");
  
  // Get the UnrealToken contract address - either from a deployed instance or deploy a new one
  let unrealTokenAddress: string;
  const deploymentPath = path.join(__dirname, "../deployments/etherlink/UnrealToken.json");
  
  if (fs.existsSync(deploymentPath)) {
    console.log("Using existing UnrealToken deployment...");
    const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
    unrealTokenAddress = deployment.address;
    console.log(`UnrealToken address: ${unrealTokenAddress}`);
  } else {
    console.log("Deploying new UnrealToken...");
    const UnrealToken = await ethers.getContractFactory("UnrealToken");
    const unrealToken = await upgrades.deployProxy(UnrealToken, [
      "Unreal Token",
      "UNREAL",
      parseUnits("1000000", 18) // 1 million tokens
    ]);
    await unrealToken.deployed();
    unrealTokenAddress = unrealToken.address;
    console.log(`UnrealToken deployed to: ${unrealTokenAddress}`);
  }
  
  // Deploy UnrealHTLC
  const UnrealHTLC = await ethers.getContractFactory("UnrealHTLC");
  const htlc = await upgrades.deployProxy(UnrealHTLC, [unrealTokenAddress]);
  await htlc.deployed();
  
  console.log(`UnrealHTLC deployed to: ${htlc.address}`);
  
  // Write deployment info to a file for easy access by our resolver
  const deploymentInfo = {
    unrealToken: unrealTokenAddress,
    unrealHTLC: htlc.address,
    network: "etherlink-testnet",
    chainId: 42793,
    deployedAt: new Date().toISOString()
  };
  
  const deploymentInfoPath = path.join(__dirname, "../solvers/deployment-info.json");
  fs.writeFileSync(
    deploymentInfoPath,
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log(`Deployment info saved to: ${deploymentInfoPath}`);
  console.log("Deployment complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
