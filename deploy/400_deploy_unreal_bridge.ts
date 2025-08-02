import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"
import { deployer } from "../utils/deployer.hre"
import { UnrealBridge } from "../typechain-types"
import { connectUnrealBridge, connectUnrealToken } from "../utils/web3.hre"
import Bluebird from "bluebird"

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deploy, execute } = deployments
  const { admin, solver } = await getNamedAccounts()

  const signer = await hre.ethers.getSigner(admin)
  let nonce = await signer.getNonce("pending")

  // Get UnrealToken
  const unrealToken = await connectUnrealToken()
  const unrealTokenAddress = await unrealToken.getAddress()
  console.log(`UnrealToken deployed at: ${unrealTokenAddress}`)

  let unrealBridge

  if (await deployer("UnrealBridge", hre)) {
    console.log("Deploying UnrealBridge ....⛴️🚢🛳️")
    
    // Deploy the UnrealBridge contract
    await deploy("UnrealBridge", {
      from: admin,
      contract: "UnrealBridge",
      proxy: {
        proxyContract: "OpenZeppelinTransparentProxy",
      },
      log: true,
    })

    // Initialize the UnrealBridge contract with the UnrealToken address
    await execute(
      "UnrealBridge",
      {
        from: admin,
        log: true,
      },
      "initialize",
      unrealTokenAddress
    )
    
    // Connect to the deployed contract
    unrealBridge = await connectUnrealBridge()

    // Grant UNREAL minter role to the bridge if needed
    // Uncomment this if the bridge needs to mint UNREAL tokens
    /*
    const MINTER_ROLE = await unrealToken.MINTER_ROLE()
    if (!(await unrealToken.hasRole(MINTER_ROLE, unrealBridge.address))) {
      console.log("Granting MINTER_ROLE to UnrealBridge...")
      await unrealToken.grantRole(MINTER_ROLE, unrealBridge.address)
    }
    */
  } else {
    unrealBridge = await connectUnrealBridge()
  }

  return true
}

deploy.id = "deployUnrealBridge"
deploy.dependencies = ["deployUnrealToken"] // Make sure UnrealToken is deployed first

export default deploy

module.exports.tags = ["all", "bridge", "cross-chain"]
