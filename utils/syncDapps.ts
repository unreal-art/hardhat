import { HardhatRuntimeEnvironment } from "hardhat/types"
import fs from "fs"

export async function syncDapps(hre: HardhatRuntimeEnvironment) {
  const { deployments, network } = hre

  const unrealToken = await deployments.get("UnrealToken")

  // @ts-ignore
  const netUrl = hre.network.config.url ?? "http://localhost:8545"
  // @ts-ignore
  let websocketUrl = hre.network.config.ws ?? netUrl.replace("http", "ws")

  // MEDIATION_CONTRACT=is already in dart_controller
  const content = `

UNREAL_TOKEN=${unrealToken.address}

GENERATED_ON="${new Date()}"
GENERATED_AT="${new Date().toLocaleString()}"

`.trim()

  console.log(content)

  writeToFile(content, `${network.name}.env`)
}

function writeToFile(data: string, filename: string) {
  fs.writeFileSync(filename, data)

  console.log(`Wrote to ${filename}`)
}
