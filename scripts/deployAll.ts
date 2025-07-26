import { execSync } from "child_process"
import { getNetworks } from "../utils/network"
import minimist from "minimist"
import { util } from "prettier"
import skip = util.skip
import { HardhatRuntimeEnvironment } from "hardhat/types"
import * as net from "net"

export async function deployToNetwork(networkName: string) {
  console.log(`\n\n\nDeploying to network: ${networkName}`)
  try {
    const output = execSync(`npx hardhat deploy --network ${networkName}`, {
      encoding: "utf-8",
    })
    console.log(output)
  } catch (e) {
    console.error(e)
  }
}

export async function deployToAllNetworks(
  hre: HardhatRuntimeEnvironment,
  skipNetworks?: Array<string>,
  parellel: boolean = false
) {
  let networkNames = getNetworks(hre, skipNetworks)

  console.log("Deploying to networkNames", networkNames)

  if (parellel) {
    const networkJobs = Promise.allSettled(
      networkNames.map((networkName) => deployToNetwork(networkName))
    )
    await networkJobs
  } else {
    for (const name of networkNames) {
      await deployToNetwork(name)
    }
  }
}
// async function main() {
//   await deployToNetwork("sepolia")
// }
// main()

/*import hre from "hardhat"

async function main() {

    // Parse command-line arguments using minimist
    const args = minimist(process.argv.slice(2));

    // Extract the --skipNetworks flag and split network names by comma
    let skipNetworks = args.skipNetworks ? args.skipNetworks.split(',') : [];

    skipNetworks += args.skip ?? [];

    skipNetworks += ['localhost', 'chaos']

    console.log("skipNetworks", skipNetworks)

    // Deploy to all networks, skipping those specified in skipNetworks
    await deployToAllNetworks(hre,skipNetworks).catch(console.error);
}*/

// Call the main function to start deployment
// main();
