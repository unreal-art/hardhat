import { task } from "hardhat/config"
import "@nomicfoundation/hardhat-toolbox"
import { connectUnrealToken } from "../utils/web3"
import { getAccount, getAddress } from "../utils/accounts"

task("token:burn", "Burn a token")
  .addPositionalParam("tokenAddress", "token address")
  .addOptionalPositionalParam(
    "amt",
    "Token amt in ether, defaults to entire balance"
  )
  .setAction(async ({ tokenAddress, amt }, hre) => {
    if (!hre.ethers.isAddress(tokenAddress)) {
      throw new Error("invalid token address: " + tokenAddress)
    }

    const token = await connectUnrealToken(hre, tokenAddress)

    const wallet = getAccount("admin")

    if (amt) {
      amt = hre.ethers.parseEther(amt)
    } else {
      amt = await token.balanceOf(wallet.address)
    }
    console.log(
      `${wallet.address} is about to burn ${amt}${await token.symbol()}`
    )

    const tx = await token.burn(wallet.address, amt)
    await tx.wait()

    console.log(`Successful burn - ${tx.hash}`)
  })
task("token:approve", "Approve a spender")
  .addPositionalParam("spenderAddress", "spender address/privateKey")
  .addOptionalPositionalParam("amt", "Token amt in ether, defaults to max int")
  .addOptionalParam("tokenAddress", "token address defaults to $UNREAL")
  .setAction(async ({ tokenAddress, spenderAddress, amt }, hre) => {
    spenderAddress = getAddress(spenderAddress)

    if (!tokenAddress) {
      tokenAddress = (await hre.deployments.get("UnrealToken")).address
    }

    if (!hre.ethers.isAddress(tokenAddress)) {
      throw new Error("invalid token address: " + tokenAddress)
    }

    let amtInEther: bigint

    if (amt) {
      amtInEther = hre.ethers.parseEther(amt)
    } else {
      amtInEther = hre.ethers.MaxUint256
    }

    const token = await connectUnrealToken(hre, tokenAddress)

    const wallet = getAccount("admin")

    console.log(
      `${wallet.address} is about to approve ${spenderAddress} for ${amtInEther}${await token.symbol()}`
    )

    const tx = await token.approve(spenderAddress, amtInEther)
    await tx.wait()

    console.log(`Successful approval - ${tx.hash}`)
  })
