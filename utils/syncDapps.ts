import { getAccount } from "./accounts"
import { HardhatRuntimeEnvironment } from "hardhat/types"
import fs from "fs"

export async function syncDapps(hre: HardhatRuntimeEnvironment) {
  const { deployments, network } = hre

  // @ts-ignore
  const netUrl = hre.network.config.url ?? "http://localhost:8545"
  // @ts-ignore
  let websocketUrl = hre.network.config.ws ?? netUrl.replace("http", "ws")

  const content = `



RPC_URL=${websocketUrl} 
RPC_WS=${websocketUrl} 
RPC_HTTP=${netUrl}
CHAIN_ID=${network.config.chainId}





UPDATED_AT="${new Date()}"

`.trim()

  console.log(content)

  writeToFile(content, `../config/dApps/${network.name}.env`)
}

function writeToFile(data: string, filename: string) {
  fs.writeFileSync(filename, data)

  console.log(`Wrote to ${filename}`)
}
