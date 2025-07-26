import { buildModule } from "@nomicfoundation/hardhat-ignition/modules"

const Simple = buildModule("Simple", (m) => {
  const Simple = m.contract("Simple", [])
  m.call(Simple, "emitEvent", [1])

  return { Simple }
})
export default Simple
