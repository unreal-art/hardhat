import { HardhatRuntimeEnvironment } from "hardhat/types"
import { ERC20, UnrealToken } from "typechain-types"

// connect odp: if address not provided, hre
export async function connectERC(
  hre: HardhatRuntimeEnvironment,
  address: string
) {
  return connectContractAddress<ERC20>(hre, "ERC20", address)
}

export async function connectToken(hre: HardhatRuntimeEnvironment) {
  const deployment = await hre.deployments.get("UnrealToken")
  return connectContractAddress<UnrealToken>(
    hre,
    "UnrealToken",
    deployment.address
  )
}

export async function connectUnrealToken(
  hre: HardhatRuntimeEnvironment,
  address?: string
) {
  if (!address) {
    const deployment = await hre.deployments.get("UnrealToken")
    address = deployment.address
  }
  return connectContractAddress<UnrealToken>(hre, "UnrealToken", address)
}

export async function connectODP(
  hre: HardhatRuntimeEnvironment,
  address?: string
) {
  let odp = address ?? hre.network.config.odp
  return connectERC(hre, odp)
}

export async function connectContractAddress<T extends any>(
  hre,
  name,
  address: string
): Promise<T> {
  const factory = await hre.ethers.getContractFactory(name)
  const contract = factory.attach(address) as unknown as T
  return contract
}
