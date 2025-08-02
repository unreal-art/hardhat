import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"

import {
  connectUnrealToken,
  DEFAULT_TOKEN_SUPPLY,
  UNREAL_SUPPLY,
} from "../utils/web3.hre"
import { UnrealToken } from "typechain-types"
import { ethers } from "hardhat"
import { deployer } from "../utils/deployer.hre"
import Bluebird from "bluebird"

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deploy, execute } = deployments
  const { admin, solver } = await getNamedAccounts()

  const signer = await hre.ethers.getSigner(admin)

  let nonce = await signer.getNonce("pending")

  let unrealToken: UnrealToken

  if (await deployer("UnrealToken", hre)) {
    unrealToken = await connectUnrealToken()

    await execute(
      "UnrealToken",
      {
        from: admin,
        log: true,
      },
      "initialize",
      "Unreal",
      "UNREAL",
      UNREAL_SUPPLY
    )

    // inits.push(unrealToken.initialize(
    //   "Unreal Token",
    //   "UNREAL",
    //   UNREAL_SUPPLY
    // ))
  } else {
    unrealToken = await connectUnrealToken()
    // await unrealToken.initialize("Unreal", "UNREAL", UNREAL_SUPPLY)
  }
  return true
}

deploy.id = "deployUnrealToken"

export default deploy

module.exports.tags = ["all", "unreal"]
