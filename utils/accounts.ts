// IMPORTANT: we cannot import hardhat directly here
// because it will cause a circular dependency
import { Account } from "./types"
import { ethers, Wallet } from "ethers"
import * as process from "process"
import { HardhatRuntimeEnvironment } from "hardhat/types"

let useDefaultValue = true

export function setDefauultValue(flag: boolean) {
  useDefaultValue = flag
  // console.debug("set default value to ", flag)
}
export const loadEnv = (name: string, defaultValue: string) => {
  const pKey = process.env[name]
  if (pKey) {
    return pKey
  }
  console.error(
    `Environment variable ${name} not found, using default value ${defaultValue}`
  )
  console.debug("hardhat value be careful!!")
  if (useDefaultValue) {
    return defaultValue
  }

  return ""
}

export const loadPrivateKey = (name: string, defaultValue: string) => {
  return loadEnv(`${name.toUpperCase()}_PRIVATE_KEY`, defaultValue).trim()
}

export const loadAddress = (name: string, privateKey: string) => {
  // let address = loadEnv(`${name.toUpperCase()}_ADDRESS`, "").trim();
  //
  // if (!address) {
  //   ``
  //   try {
  //     const wallet = new Wallet(privateKey);
  //     address = wallet.address;
  //     console.debug(name + ": " + address);
  //   } catch (error: any) {
  //     console.error(
  //       `Error deriving address from private key for ${name}: ${error.message}`,
  //     );
  //   }
  let address: string

  try {
    const wallet = new Wallet(privateKey)
    address = wallet.address
    console.debug(name + ": " + address)
  } catch (error: any) {
    console.error(
      `Error deriving address from private key for ${name}: ${error.message}`
    )
    process.exit(1)
  }

  return address
}

// the default values here are the hardhat defualt insecure accounts
// this means that we get a reproducable dev environment between hardhat and geth
export const ACCOUNTS: Account[] = [
  {
    name: "admin",
    privateKey: loadPrivateKey(
      "admin",
      "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
    ),
    metadata: {},
  },  
  {
    name: "verifier",
    privateKey: loadPrivateKey(
      "verifier",
      "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
    ),
    metadata: {},
  },
  {
    name: "",
    privateKey: loadEnv(
      "PRIVATE_KEY",
      "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
    ),
    metadata: {},
  },
].map((account: Account) => {
  // Check if the address is not already present
  if (!account.address) {
    // Derive the address using the loadAddress function
    account.address = loadAddress(account.name, account.privateKey)
  }
  return account
})

// map of account name -> account
export const NAMED_ACCOUNTS = ACCOUNTS.reduce<Record<string, Account>>(
  (all, acc) => {
    all[acc.name] = acc
    return all
  },
  {}
)

// map of account name -> account address
export const ACCOUNT_ADDRESSES = ACCOUNTS.reduce<Record<string, string>>(
  (all, acc) => {
    all[acc.name] = acc.address
    return all
  },
  {}
)

// flat list of private keys in order
export const PRIVATE_KEYS = ACCOUNTS.map((acc) => acc.privateKey)

export const getAccount = (name: string) => {
  const account = NAMED_ACCOUNTS[name]
  if (!account) {
    throw new Error(`Unknown account ${name}`)
  }
  return account
}

export async function getBalance(
  account: string,
  hre: HardhatRuntimeEnvironment
) {
  const balance = await hre.ethers.provider.getBalance(account)

  // console.debug("getBal", account, hre.ethers.formatEther(balance), "ETH");

  return balance
}

export function formatEther(balance: bigint) {
  return ethers.formatEther(balance)
}

export async function getBalanceInEther(
  account: string,
  hre: HardhatRuntimeEnvironment
) {
  return formatEther(await getBalance(account, hre))
}

export type Crypto = "ETH" | "DART"

async function getDartBalance(account: string, hre: HardhatRuntimeEnvironment) {
  const adminAcc = getAccount("admin")

  const signer = await hre.ethers.getSigner(adminAcc.address)

  const token = await hre.deployments.get("DartToken")

  // @ts-ignore
  const tokenContract: DartToken = new hre.ethers.Contract(
    token.address,
    token.abi,
    signer
  )

  return tokenContract.balanceOf(account)
}

export async function getBalanceOf(
  crypto: Crypto,
  account: string,
  hre: HardhatRuntimeEnvironment
): Promise<bigint | string> {
  if (crypto === "ETH") {
    return await getBalance(account, hre)
  } else if (crypto === "DART") {
    return await getDartBalance(account, hre)
  }

  throw new Error("Unsupported cryptocurrency type")
}

/*export async function getBalanceOfInEther(crypto:Crypto, account: string, hre: HardhatRuntimeEnvironment) {
  return formatEther(await getBalanceOf(crypto,account, hre)) + "ETH";
}*/

export function getPublicAddress(
  privateKey: string,
  hre?: HardhatRuntimeEnvironment
): string {
  let Wallet = hre?.ethers?.Wallet ?? ethers.Wallet

  const wallet = new Wallet(privateKey)
  let address = wallet.address

  return address
}

export function getAddress(addressOrPrivateKey: string): string {
  let address: string

  if (ethers.isAddress(addressOrPrivateKey)) {
    address = addressOrPrivateKey
  } else {
    try {
      const wallet = new ethers.Wallet(addressOrPrivateKey)
      address = wallet.address
    } catch (error) {
      console.error(error)
      throw new Error(
        "Invalid input: not a valid Ethereum address or private key"
      )
    }
  }

  return address
}
