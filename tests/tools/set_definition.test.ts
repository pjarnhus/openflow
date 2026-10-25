import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { setDefinition } from "../../plugins/openflow/tools/set_definition"
import { readTerm } from "../../plugins/openflow/utils/term"
import {
  callTool,
  createTempProject,
  makeTerm,
  writeTermFile,
  type TempProject,
} from "../helpers"

let project: TempProject

beforeEach(() => {
  project = createTempProject()
})

afterEach(() => {
  project.cleanup()
})

describe("setDefinition", () => {
  test("creates a new term", async () => {
    const content = await callTool(setDefinition, {
      term: "Checkout",
      definition: "Paying for goods",
    })

    expect(content).toBe('OK: set "Checkout.definition". Status: proposed.')
    expect(readTerm("Checkout")?.definition).toBe("Paying for goods")
  })

  test("reports a conflicting definition without force", async () => {
    await callTool(setDefinition, {
      term: "Checkout",
      definition: "Old value",
    })

    const content = await callTool(setDefinition, {
      term: "Checkout",
      definition: "New value",
    })

    expect(content).toStartWith("ERROR:")
    expect(readTerm("Checkout")?.definition).toBe("Old value")
  })

  test("overwrites with force", async () => {
    await callTool(setDefinition, { term: "Checkout", definition: "Old value" })

    const content = await callTool(setDefinition, {
      term: "Checkout",
      definition: "New value",
      force: true,
    })

    expect(content).toContain("forced")
    expect(readTerm("Checkout")?.definition).toBe("New value")
  })

  test("rejects a deprecated term", async () => {
    writeTermFile(project, makeTerm({ status: "deprecated" }))

    const content = await callTool(setDefinition, {
      term: "Checkout",
      definition: "New value",
    })

    expect(content).toStartWith("ERROR:")
  })
})
