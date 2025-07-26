import { buildModule } from "@nomicfoundation/hardhat-ignition/modules"

import { assert } from "console"

const MExchange = buildModule("Exchange", (m) => {
  const DartExchange = m.contract("DartExchange", [])

  const res = m.call(DartExchange, "simpleAddress")

  m.call(SimpleCaller, "emitEventExternal", [50])

  // console.log(res)

  // assert simpleModule.Simple==res.value

  return { SimpleCaller, Simple: simpleModule.Simple }
})

export default MExchange
