import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"
import { deployer } from "../utils/deployer.hre"
import { OneP } from "../typechain-types"
import { ethers } from "hardhat"

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deploy, execute } = deployments
  const { admin,  verifier } = await getNamedAccounts()

  console.log("SET verifier: ", verifier)

  const signer = await hre.ethers.getSigner(admin)
  let nonce = await signer.getNonce("pending")

  // Helper function to connect to OneP contract
  const connectOneP = async (): Promise<OneP> => {
    const deployment = await hre.deployments.get("OneP")
    const factory = await hre.ethers.getContractFactory("OneP")
    const contract = factory.attach(deployment.address) as unknown as OneP
    return contract
  }

  let oneP: OneP

  if (await deployer("OneP", hre)) {
    console.log("Deploying OneP Protocol Contract....🔐🚀")
    
    // Deploy the OneP contract with token initialization
    await deploy("OneP", {
      from: admin,
      contract: "OneP",
      proxy: {
        proxyContract: "OpenZeppelinTransparentProxy",
        execute: {
          init: {
            methodName: "initialize",
            args: [
              verifier,
              // ethers.parseEther("10000000"), // 10M initial supply
              // ethers.parseEther("100000000")  // 100M max supply
            ]
          }
        }
      },
      log: true,
    })

    await execute(
      "OneP",
      {
        from: admin,
        log: true,
      },
      "initialize",
      verifier
    )

    // Connect to the deployed contract
    oneP = await connectOneP()

    console.log(`OneP Protocol deployed at: ${await oneP.getAddress()}`)
    
    // Log some initial state
    const totalSupply = await oneP.totalSupply()
    const maxSupply = await oneP.cap()
    
    console.log(`Total Supply: ${ethers.formatEther(totalSupply)} 1P`)
    console.log(`Max Supply: ${ethers.formatEther(maxSupply)} 1P`)
    console.log(`Verifier: ${await oneP.verifier()}`)
    
  } else {
    oneP = await connectOneP()


    const curVerifier = await oneP.verifier()
    console.log(`Current Verifier: ${curVerifier}`)

    if (curVerifier !== verifier) {
      console.log(`Updating Verifier from ${curVerifier} to ${verifier}`)
      const updateTx = await oneP.updateVerifier(verifier)
      await updateTx.wait()
      console.log(`Verifier updated successfully!`)
    }

    console.log(`OneP Protocol already deployed at: ${await oneP.getAddress()}`)
  }

  return true
}

deploy.id = "deployOneP"

export default deploy

module.exports.tags = ["all", "1p", "protocol"]
