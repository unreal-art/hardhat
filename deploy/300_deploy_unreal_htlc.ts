import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"
import { deployer } from "../utils/deployer.hre"
import { UnrealHTLC } from "../typechain-types"
import { connectUnrealHTLC, connectUnrealToken } from "../utils/web3.hre"
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

  let unrealHTLC

  if (await deployer("UnrealHTLC", hre)) {
    console.log("Deploying UnrealHTLC ....⛴️🚢🛳️")

    // Deploy the UnrealHTLC contract
    await deploy("UnrealHTLC", {
      from: admin,
      contract: "UnrealHTLC",
      proxy: {
        proxyContract: "OpenZeppelinTransparentProxy",
      },
      log: true,
    })

    // Initialize the UnrealHTLC contract with the UnrealToken address
    await execute(
      "UnrealHTLC",
      {
        from: admin,
        log: true,
      },
      "initialize",
      unrealTokenAddress
    )

    // Connect to the deployed contract
    unrealHTLC = await connectUnrealHTLC()
  } else {
    unrealHTLC = await connectUnrealHTLC()
  }

  return true
}

deploy.id = "deployUnrealHTLC"
deploy.dependencies = ["deployUnrealToken"] // Make sure UnrealToken is deployed first

export default deploy

module.exports.tags = ["all", "htlc", "cross-chain"]
