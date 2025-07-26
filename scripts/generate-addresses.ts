import Wallet from "ethereumjs-wallet"

const generate = (name: string) => {
  let envPrefix = process.env.ENV_PREFIX || "export "
  // envPrefix="export "
  if (envPrefix.trim() == "") {
    envPrefix = ""
  }
  const wallet = Wallet.generate()
  let publicKey = wallet.getPublicKeyString()
  let primaryKey = wallet.getPrivateKeyString()
  let walletAddress = wallet.getAddressString()
  primaryKey = `\$${name}_PRIVATE_KEY` //${} doesn't work
  console.log(`${envPrefix}${name}_PRIVATE_KEY=${wallet.getPrivateKeyString()}`)
  console.log(`${name}_ADDRESS=${walletAddress}`)
  if (name == "ADMIN") {
    console.log(`${envPrefix}PRIVATE_KEY=${primaryKey}`)
    console.log(`${envPrefix}WEB3_PRIVATE_KEY=${primaryKey}`)
    console.log('')
  }


  console.log("\n")

  // console.log(`${envPrefix}${name}_ADDRESS=${wallet.getAddressString()}`);
}

async function main() {
  generate("ADMIN")
  generate("FAUCET")
  generate("SOLVER")
  generate("MEDIATOR")
  generate("RESOURCE_PROVIDER")
  generate("JOB_CREATOR")
  // generate("DIRECTORY");

  // console.log("\n\n")

  console.log(`GENERATED_ON="${new Date()}"`)
  console.log(`GENERATION_COMPLETED_AT="${new Date().toLocaleString()}"`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
