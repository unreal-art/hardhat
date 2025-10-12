import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"
import { deployer } from "../utils/deployer.hre"
import { MoneyPot } from "../typechain-types"
import { ethers } from "hardhat"

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deploy, execute } = deployments
  const { admin,  moneypot_oracle } = await getNamedAccounts()

  console.log("SET moneypot_oracle: ", moneypot_oracle)

  const signer = await hre.ethers.getSigner(admin)
  let nonce = await signer.getNonce("pending")

  // Helper function to connect to MoneyPot contract
  const connectMoneyPot = async (): Promise<MoneyPot> => {
    const deployment = await hre.deployments.get("MoneyPot")
    const factory = await hre.ethers.getContractFactory("MoneyPot")
    const contract = factory.attach(deployment.address) as unknown as MoneyPot
    return contract
  }

  let moneyPot: MoneyPot

  // Check if MoneyPot is already deployed
  const existingDeployment = await hre.deployments.getOrNull("MoneyPot")

  if (!existingDeployment) {
    console.log("Deploying MoneyPot Contract....💰🎯")
    
    // Deploy the MoneyPot contract with token initialization
    await deploy("MoneyPot", {
      from: admin,
      contract: "MoneyPot",
      proxy: {
        proxyContract: "OpenZeppelinTransparentProxy",
        execute: {
          init: {
            methodName: "initialize",
            args: [
              moneypot_oracle
            ]
          }
        }
      },
      log: true,
    })

    await execute(
      "MoneyPot",
      {
        from: admin,
        log: true,
      },
      "initialize",
      moneypot_oracle
    )

    // Connect to the deployed contract
    moneyPot = await connectMoneyPot()

    console.log(`MoneyPot deployed at: ${await moneyPot.getAddress()}`)
    
    // Log some initial state
    const totalSupply = await moneyPot.totalSupply()
    const maxSupply = await moneyPot.cap()
    const contractBalance = await moneyPot.getBalance(await moneyPot.getAddress())
    
    console.log(`Total Supply: ${ethers.formatUnits(totalSupply, 6)} USDC`)
    console.log(`Max Supply: ${ethers.formatUnits(maxSupply, 6)} USDC`)
    console.log(`Contract Balance: ${ethers.formatUnits(contractBalance, 6)} USDC`)
    console.log(`Trusted Oracle: ${await moneyPot.trustedOracle()}`)
    
  } else {
    moneyPot = await connectMoneyPot()

    const curVerifier = await moneyPot.trustedOracle()
    console.log(`Current Verifier: ${curVerifier}`)

    if (curVerifier !== moneypot_oracle) {
      console.log(`Updating Verifier from ${curVerifier} to ${moneypot_oracle}`)
      const updateTx = await moneyPot.updateVerifier(moneypot_oracle)
      await updateTx.wait()
      console.log(`Verifier updated successfully!`)
    }

    console.log(`MoneyPot already deployed at: ${await moneyPot.getAddress()}`)
  }

  return true
}

deploy.id = "deployMoneyPot"

export default deploy

module.exports.tags = ["all", "moneypot", "game"]
