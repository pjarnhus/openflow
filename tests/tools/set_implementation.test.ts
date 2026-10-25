import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { setImplementation } from "../../plugins/openflow/tools/set_implementation"
import { readTerm } from "../../plugins/openflow/utils/term"
import { callTool, createTempProject, type TempProject } from "../helpers"

let project: TempProject

beforeEach(() => {
  project = createTempProject()
})

afterEach(() => {
  project.cleanup()
})

describe("setImplementation", () => {
  test("sets the implementation of a new term", async () => {
    const content = await callTool(setImplementation, {
      term: "Checkout",
      implementation: "CheckoutService",
    })

    expect(content).toBe('OK: set "Checkout.implementation". Status: proposed.')
    expect(readTerm("Checkout")?.implementation).toBe("CheckoutService")
  })

  test("archives the previous value with force", async () => {
    await callTool(setImplementation, {
      term: "Checkout",
      implementation: "OldService",
    })

    const content = await callTool(setImplementation, {
      term: "Checkout",
      implementation: "NewService",
      force: true,
    })

    expect(content).toContain("forced")
    expect(readTerm("Checkout")?.proposals[0]).toMatchObject({
      field: "implementation",
      value: "OldService",
    })
  })
})
