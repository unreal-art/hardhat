import { task } from "hardhat/config"
import "@nomicfoundation/hardhat-toolbox"
import { getAccount } from "../utils/accounts"
import { OneP } from "../typechain-types"

// Helper function to connect to OneP contract
async function connectOneP(hre: any) {
  const deployment = await hre.deployments.get("OneP")
  const factory = await hre.ethers.getContractFactory("OneP")
  const contract = factory.attach(deployment.address) as unknown as OneP
  return contract
}

task("1p", "Register a new username in the 1P Protocol")
  .addPositionalParam("username", "Username to register (e.g., 'alice.1p')")
  .addOptionalPositionalParam("name", "Display name for the user", "hardhat user")
  .addOptionalPositionalParam("img", "Profile image URL", "https://robohash.org/example")
  .setAction(async ({ username, name, img }: { username: string; name: string; img: string; }, hre) => {
    // Validate inputs
    if (!username || !name || !img) {
      throw new Error("Username, name, and img are required")
    }

    // Get the OneP contract
    const oneP = await connectOneP(hre)
    
    // Get the account to use
    const wallet = getAccount( "admin")

    const signer = await hre.ethers.getSigner(wallet.address)
    
    // Check if username already exists
    const exists = await oneP.usernameExists(username)
    if (exists) {
      throw new Error(`Username '${username}' already exists`)
    }

    // Check if user has enough tokens for registration fee
    const registrationFee = hre.ethers.parseEther("100") // 100 1P tokens
    const balance = await oneP.balanceOf(wallet.address)
    
    console.log(`Account: ${wallet.address}`)
    console.log(`Username: ${username}`)
    console.log(`Display Name: ${name}`)
    console.log(`Image URL: ${img}`)
    console.log(`Registration Fee: ${hre.ethers.formatEther(registrationFee)} 1P`)
    console.log(`Current Balance: ${hre.ethers.formatEther(balance)} 1P`)
    

    // Register the username
    console.log(`\nRegistering username '${username}'...`)
    const tx = await oneP.connect(signer).register(username, name, img)
    await tx.wait()

    console.log(`✅ Successfully registered username '${username}'`)
    console.log(`Transaction hash: ${tx.hash}`)
    
    // Verify registration
    const profile = await oneP.getUserProfile(username)
    console.log(`\nProfile Details:`)
    console.log(`- Name: ${profile.name}`)
    console.log(`- Image: ${profile.img}`)
    console.log(`- Account: ${profile.account}`)
  })

task("1p:profile", "Get user profile information")
  .addPositionalParam("username", "Username to look up")
  .setAction(async ({ username }, hre) => {
    const oneP = await connectOneP(hre)
    
    const exists = await oneP.usernameExists(username)
    if (!exists) {
      throw new Error(`Username '${username}' does not exist`)
    }

    const profile = await oneP.getUserProfile(username)
    const state = await oneP.getUserState(username)
    
    console.log(`\nProfile for '${username}':`)
    console.log(`- Name: ${profile.name}`)
    console.log(`- Image: ${profile.img}`)
    console.log(`- Account: ${profile.account}`)
    console.log(`\nUser State:`)
    console.log(`- Difficulty: ${state.d}`)
    console.log(`- Total Attempts: ${state.totalAttempts}`)
    console.log(`- Success Count: ${state.successCount}`)
    console.log(`- Failure Count: ${state.failureCount}`)
    console.log(`- High Abuse Mode: ${state.highAbuse}`)
  })

task("1p:attempt-fee", "Get attempt fee for a username")
  .addPositionalParam("username", "Username to check fee for")
  .setAction(async ({ username }, hre) => {
    const oneP = await connectOneP(hre)
    
    const exists = await oneP.usernameExists(username)
    if (!exists) {
      throw new Error(`Username '${username}' does not exist`)
    }

    const fee = await oneP.getAttemptFee(username)
    console.log(`Attempt fee for '${username}': ${hre.ethers.formatEther(fee)} ETH`)
  })

task("1p:request-attempt", "Request an authentication attempt")
  .addPositionalParam("username", "Username requesting authentication")
  .addOptionalParam("account", "Account to use for the attempt (defaults to admin)", "admin")
  .setAction(async ({ username, account }: { username: string; account?: string }, hre) => {
    const oneP = await connectOneP(hre)
    
    // Get the account to use
    const wallet = getAccount(account || "admin")
    if (!wallet.address) {
      throw new Error(`Account '${account || "admin"}' does not have an address`)
    }
    const signer = await hre.ethers.getSigner(wallet.address)
    
    // Check if username exists
    const exists = await oneP.usernameExists(username)
    if (!exists) {
      throw new Error(`Username '${username}' does not exist`)
    }

    // Get attempt fee
    const fee = await oneP.getAttemptFee(username)
    const balance = await oneP.balanceOf(wallet.address)
    
    console.log(`Account: ${wallet.address}`)
    console.log(`Username: ${username}`)
    console.log(`Attempt Fee: ${hre.ethers.formatEther(fee)} ETH`)
    console.log(`Current Balance: ${hre.ethers.formatEther(balance)} 1P`)
    
    if (balance < fee) {
      throw new Error(`Insufficient balance. Need ${hre.ethers.formatEther(fee)} 1P, have ${hre.ethers.formatEther(balance)} 1P`)
    }

    // Request attempt
    console.log(`\nRequesting authentication attempt for '${username}'...`)
    const tx = await oneP.connect(signer).requestAttempt(username)
    await tx.wait()

    console.log(`✅ Successfully requested attempt for '${username}'`)
    console.log(`Transaction hash: ${tx.hash}`)
  })

task("1p:list-usernames", "List all registered usernames")
  .setAction(async ({}, hre) => {
    const oneP = await connectOneP(hre)
    
    const usernames = await oneP.getAllUsernames()
    
    console.log(`\nRegistered usernames (${usernames.length} total):`)
    if (usernames.length === 0) {
      console.log("No usernames registered yet.")
    } else {
      usernames.forEach((username, index) => {
        console.log(`${index + 1}. ${username}`)
      })
    }
  })
