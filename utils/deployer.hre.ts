import { HardhatRuntimeEnvironment } from "hardhat/types"
import { connectContract } from "./web3.hre"

export async function deployer<T>(
  name: string,
  hre: HardhatRuntimeEnvironment,
): Promise<boolean> {
  let contract: T

  try {
    await connectContract<T>(name)
    return false
  } catch (e) {
    
    const { deployments, getNamedAccounts } = hre
    const { deploy, execute } = deployments
    const { admin, solver } = await getNamedAccounts()

    console.log("Deploying",name, "....⛴️🚢🛳️")
    await deploy(name, {
      from: admin,
      //  proxy: { //FIXME: proxy makes it dangerously complicated for approvals and stuffs
      //   proxyContract: "OpenZeppelinTransparentProxy",
      // },
      args: [],
      log: true,

      
    },)

    return true
  }
  return
}

export async function contractNotFound(  name: string,hre: HardhatRuntimeEnvironment): Promise<boolean> {
   try {
    await hre.deployments.get(name)
    return false
  } catch (e) {
    return true
  }
}