import { buildModule } from "@nomicfoundation/hardhat-ignition/modules"

import SimpleModule from "./Simple"
import { assert } from "console"

const MSimpleCaller = buildModule("SimpleCaller", (m) => {
  const simpleModule = m.useModule(SimpleModule)

  const SimpleCaller = m.contract("SimpleCaller", [simpleModule.Simple])

  const res = m.call(SimpleCaller, "simpleAddress")

  m.call(SimpleCaller, "emitEventExternal", [50])

  // console.log(res)

  // assert simpleModule.Simple==res.value

  return { SimpleCaller, Simple: simpleModule.Simple }
})

export default MSimpleCaller
