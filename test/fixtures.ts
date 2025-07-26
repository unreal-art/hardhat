import { ethers } from "hardhat"
import { AddressLike, BigNumberish, Contract, Signer } from "ethers"
import {
  DEFAULT_TOKEN_SUPPLY,

} from "../utils/web3.hre"
import {
  UnrealToken
} from "../typechain-types"

/*

  DEPLOYMENT

*/
export async function deployContract<T extends any>(
  name: string,
  signer: Signer,
  args: any[] = []
): Promise<T> {
  const factory = await ethers.getContractFactory(name, signer)
  const contract = (await factory.deploy(...args)) as unknown as T
  return contract
}

export async function deployToken(
  signer: Signer,
  tokenSupply: BigNumberish = DEFAULT_TOKEN_SUPPLY,
  testMode = false
) {
  return deployContract<UnrealToken>(
    testMode ? "UnrealTokenTestable" : "UnrealToken",
    signer,
    ["Unreal", "UNREAL", tokenSupply]
  )
}


/*

  CONTROLLER

*/

export interface setupDAppOut {
  //   controller: Contract | string
  [key: string]: Contract
}
