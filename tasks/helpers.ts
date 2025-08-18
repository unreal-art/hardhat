import { ERC20 } from "../typechain-types"
import { ethers, getBigInt } from "ethers"
import { Address } from "hardhat-deploy/types"
import { connectODP, connectToken, connectERC } from "../utils/web3"
import { Account } from "../utils/types"
import { HardhatRuntimeEnvironment } from "hardhat/types"
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers"

// ----- Helpers -----
export const transferEther = async (
  acc: Account,
  amountInWei: bigint,
  hre: HardhatRuntimeEnvironment,
  signer: HardhatEthersSigner,
  nonce?: number
) => {
  if (amountInWei == getBigInt(0)) {
    console.log("ether invalid : 0")
    return
  }
  const tx: any = {
    to: acc.address,
    value: amountInWei,
    nonce,
  }
  if (hre.network.name == "titanAI") {
    tx["gasLimit"] = 100000
  }
  const transactionResponse = await signer.sendTransaction(tx)
  const transactionReceipt = await transactionResponse.wait()
  const { hash: txHash } = transactionReceipt
  console.log(`Transaction successful: ${txHash}`)
}

export const transferToken = async (
  acc: Address,
  tokenContract: ERC20,
  hre: HardhatRuntimeEnvironment,
  amt: string,
  nonce?: number
) => {
  const wei = hre.ethers.parseUnits(amt, await tokenContract.decimals())
  if (wei == getBigInt(0)) {
    console.log("amt invalid : 0")
    return
  }
  const additionalParams: any = {}
  if (nonce) {
    console.log("custom nonce: ", nonce)
    additionalParams["nonce"] = nonce
  }
  if (hre.network.name == "titanAI") {
    additionalParams["gasLimit"] = 100000
  }
  const transferTx = await tokenContract.transfer(acc, wei, additionalParams)
  const transferReceipt = await transferTx.wait()
  const { hash: transferTxHash } = transferReceipt
  console.log(`ERC20 transfer successful: ${transferTxHash}`)
}

export const transferODP = async (
  acc: Account,
  hre: HardhatRuntimeEnvironment,
  signer: HardhatEthersSigner,
  odpTokenAmount: string,
  nonce?: number
) => {
  const token = await connectODP(hre)
  const tokenContract: any = new hre.ethers.Contract(
    await token.getAddress(),
    token.abi,
    signer
  )
  const amountInODPWei = hre.ethers.parseUnits(
    odpTokenAmount,
    await tokenContract.decimals()
  )
  if (amountInODPWei == getBigInt(0)) {
    console.log("odp invalid : 0")
    return
  }
  const additionalParams: any = {}
  if (nonce) {
    console.log("custom nonce: ", nonce)
    additionalParams["nonce"] = nonce
  }
  if (hre.network.name == "titanAI") {
    additionalParams["gasLimit"] = 100000
  }
  const transferTx = await tokenContract.transfer(
    acc.address,
    amountInODPWei,
    additionalParams
  )
  const transferReceipt = await transferTx.wait()
  const { hash: transferTxHash } = transferReceipt
  console.log(`ODP transfer successful: ${transferTxHash}`)
}

export const balanceOfUnreal = async (
  hre: HardhatRuntimeEnvironment,
  signer: HardhatEthersSigner,
  address: string
) => {
  const token = await connectToken(hre)
  return balanceOfToken(token, address)
}

export const balanceOfODP = async (
  hre: HardhatRuntimeEnvironment,
  signer: HardhatEthersSigner,
  address: string
) => {
  const odp = await connectODP(hre)
  return balanceOfToken(odp, address)
}

export const balanceOfToken = async (
  tokenContract: ERC20,
  address: string
): Promise<string> => {
  let tokenBal = await tokenContract.balanceOf(address)
  const tokenDigits = await tokenContract.decimals()
  let tokenBalString = ethers.formatUnits(tokenBal, tokenDigits)
  return tokenBalString
}

export const tokenBal = async (
  tokenContract: ERC20,
  address: string
): Promise<string> => {
  const tokenBal = await balanceOfToken(tokenContract, address)
  const symbol = await tokenContract.symbol()
  return `${tokenBal} ${symbol}`
}
