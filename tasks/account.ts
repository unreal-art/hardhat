import "@nomicfoundation/hardhat-toolbox"
import Wallet1 from "ethereumjs-wallet"
import { AlchemyProvider, getBigInt } from "ethers"
import { task } from "hardhat/config"
import {
  getAccount,
  getAddress,
  getBalance,
  getBalanceInEther,
  getPublicAddress,
} from "../utils/accounts"
import { Account } from "../utils/types"
import { connectERC, connectODP, connectUnrealToken } from "../utils/web3"
import { FundOut, Out } from "./account.d"
import {
  balanceOfUnreal,
  tokenBal,
  transferEther,
  transferToken,
} from "./helpers"

// ----- Tasks -----
task("balance", "Prints an account's balance")
  .addPositionalParam("account", "The account's address or private key")
  .setAction(async (args, hre) => {
    await hre.run("bal", args)
  })

task("bal", "Prints an account's balance")
  .addPositionalParam("account", "The account address or pkey")
  .setAction(async ({ account }, hre) => {
    console.log("network", hre.network.name)
    const address = getAddress(account)
    const balance = await getBalance(address, hre)
    const signer = await hre.ethers.getSigner(address)
    const out = [
      {
        account: address,
        balance: hre.ethers.formatEther(balance),
        tokenBal: await balanceOfUnreal(hre, signer, address),
        nonce: await signer.getNonce("pending"),
      },
    ]
    console.table(out)
  })

task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners()
  console.log("Loading accounts")
  for (const account of accounts) {
    const bal = await getBalance(account.address, hre)
    const balString = hre.ethers.formatEther(bal) + " ETH"
    console.log("acc", account.address, balString)
  }
})

task("account", "Prints account address from private key")
  .addPositionalParam("privateKey", "The private key")
  .setAction(async ({ privateKey }, hre) => {
    const address = getPublicAddress(privateKey, hre)
    console.log("account:", address)
  })

task("drip", "Drip any address")
  .addPositionalParam("account", "The address or privateKey to drip to")
  .addOptionalPositionalParam("eth", "The amount to drip", "0.01")
  .addOptionalPositionalParam("amt", "The token amount to drip", "0")
  .addOptionalPositionalParam("nonce", "The starting nonce default value")
  .addOptionalParam("token", "The Token address defaults to Unreal")
  .setAction(async ({ account, eth, amt, nonce: startNonce, token }, hre) => {
    console.log("network", hre.network.name)
    if (!token) {
      token = (await hre.deployments.get("UnrealToken")).address
    }
    const tokenContract = await connectERC(hre, token)
    const fundingAccount = getAccount("admin")
    const address = getAddress(account)
    console.log({ address })
    const signer = await hre.ethers.getSigner(fundingAccount.address)

    let nonce = startNonce
      ? Number.parseInt(startNonce)
      : await signer.getNonce()
    console.log("nonce", nonce)

    const getNonce = (): number => {
      nonce += 1
      return nonce - 1
    }

    const bal = async (address: string): Promise<string> => {
      if (amt == 0) return "0"
      return tokenBal(tokenContract, address)
    }

    const ethBal = async (address: string) =>
      await getBalanceInEther(address, hre)

    const amountInWei = hre.ethers.parseEther(eth)
    if (amountInWei == getBigInt(0)) {
      nonce--
    }

    let out: Out = {
      admin: {
        address: fundingAccount.address,
        balance: await getBalanceInEther(fundingAccount.address, hre),
        tokenBal: await bal(fundingAccount.address),
      },
    }

    const acc: Account = {
      name: "dev",
      address: address,
    }

    const out_: FundOut = {
      address: acc.address,
      balance: await ethBal(acc.address),
      tokenBal: await bal(acc.address),
    }

    out[acc.name] = out_

    const tokenName = await tokenContract.name()

    let promises = [
      transferEther(acc, amountInWei, hre, signer, getNonce()),
      transferToken(acc.address, tokenContract, hre, amt, getNonce()),
    ]

    if (hre.network.name == "titanAI") {
      promises = promises.map(async (p) => await p)
    }

    const results = await Promise.allSettled(promises)
    results.forEach((result, index) => {
      const transferType = index === 0 ? "Ether" : tokenName
      if (result.status === "fulfilled") {
        console.log(`${transferType} successful and returned ${result.value}`)
      } else {
        console.error(
          `${transferType} transfer encountered an error:`,
          result.reason
        )
      }
    })

    out_.newTokenBal = await bal(acc.address)
    out_.newBalance = await ethBal(acc.address)
    out.admin.newBalance = await getBalanceInEther(fundingAccount.address, hre)
    out.admin.newTokenBal = await bal(fundingAccount.address)

    console.log(`NETWORK=${hre.network.name}`)
    console.table(out)
  })

task("odp", "Drip account's balance")
  .addPositionalParam("account", "The address or privateKey to drip to")
  .addPositionalParam("odp", "The amount to drip", "0")
  .setAction(async ({ odp, account }, hre) => {
    const tokenContract = await connectODP(hre)
    await hre.run("drip", {
      account,
      amt: odp,
      token: await tokenContract.getAddress(),
    })
  })

task("unreal", "Drip account's balance")
  .addPositionalParam("account", "The address or privateKey to drip to")
  .addPositionalParam("unreal", "The amount to drip", "0")
  .addOptionalPositionalParam("eth", "The eth to drip", "0")
  .setAction(async ({ unreal, account, eth }, hre) => {
    const tokenContract = await connectUnrealToken(hre)
    await hre.run("drip", {
      account,
      eth,
      amt: unreal,
      token: await tokenContract.getAddress(),
    })
  })

task("new-wallet", "New Wallet, optional drip")
  .addOptionalPositionalParam("eth", "The amount to drip", "0.01")
  .addOptionalPositionalParam("amt", "The amount to drip", "10000")
  .setAction(async ({ eth, amt }, hre) => {
    console.log("network", hre.network.name)
    const wallet = Wallet1.generate()
    const privateKey = wallet.getPrivateKeyString()
    console.log(`export PRIVATE_KEY=${privateKey}`)
    await hre.run("drip", { account: privateKey, eth, amt })
  })

task("tx", "New transaction")
  .addOptionalParam("tx", "Transaction Hex")
  .setAction(async ({ tx }, hre) => {
    if (!tx) {
      tx =
        "0xf87380865af3107a4000865af3107a400094823531b7c7843d8c3821b19d70cbfb6173b9cb0288100000000000000080820a95a01db17e4e787b2f3405c8637a5ad73af5337eb396701bba612d486a79350cd4fea02ac53f3964702ccb34fc5d057ae1599bf8fd83f4368979b059dda7a7ba724622"
    }
    const alche = new AlchemyProvider({})
    const receipt = await alche.broadcastTransaction(tx)
    console.log(receipt)
  })
