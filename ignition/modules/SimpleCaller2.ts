import { buildModule } from "@nomicfoundation/hardhat-ignition/modules"

import SimpleModule from "./Simple"
import { assert } from "console"

import MSimpleCaller from "./SimpleCaller"

const MSimpleCaller2 = buildModule("SimpleCaller2", (m) => {
  const simpleCaller = m.useModule(MSimpleCaller)

  const SimpleCaller2 = m.contract("SimpleCaller2", [simpleCaller.SimpleCaller])

  const res = m.call(SimpleCaller2, "simpleCaller")

  m.call(SimpleCaller2, "emitEventExternal", [502])

  // console.log(res)

  // assert simpleModule.Simple==res.value

  return { SimpleCaller2, Simple: simpleCaller.Simple }
})

export default MSimpleCaller2
