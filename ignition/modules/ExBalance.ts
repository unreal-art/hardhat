import { buildModule } from "@nomicfoundation/hardhat-ignition/modules"

const ExBalance = buildModule("ExBalance", (m) => {
  let tokenAddress = "0xfbE512Ab342107BeB3036C3aE3548A92e9f34a38"

  // tokenAddress = "0x7E5E623edFc2De910054bC5cBC14d1eF69BA6A20" //amoy
  // tokenAddress = "0x37719927bbf857b4e2c0195aee74e7b3f1161a77" //torus


  let senderAddress = "0x823531B7c7843D8c3821B19D70cbFb6173b9Cb02"

  const ExBalance = m.contract("ExBalance", [])


  const makeCall = (fc: string, args = []) => {
    const res = m.call(ExBalance, fc, args)
    console.log("res", res)
  }


  m.call(ExBalance, "setTokenAddress", [tokenAddress])

  makeCall("checkBalance")

  // const res = m.call(ExBalance, "checkBalanceOf", [])
  // console.log("res", res)


  makeCall("invalidBalance", [])

  return { ExBalance }
})
export default ExBalance
