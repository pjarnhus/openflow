import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { proposeChange } from "../../plugins/openflow/tools/propose_change"
import { readTerm } from "../../plugins/openflow/utils/term"
import {
  callTool,
  createTempProject,
  makeTerm,
  today,
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

describe("proposeChange", () => {
  test("rejects an unknown term", async () => {
    const content = await callTool(proposeChange, {
      term: "Missing",
      field: "definition",
      value: "x",
      reason: "drift",
      proposed_by: "phase_reviewer",
    })

    expect(content).toStartWith("ERROR:")
    expect(content).toContain("does not exist")
  })

  test("appends a proposal without changing the ratified value", async () => {
    writeTermFile(project, makeTerm({ term: "Checkout", definition: "Old value" }))

    const content = await callTool(proposeChange, {
      term: "Checkout",
      field: "definition",
      value: "New value",
      reason: "Observed drift",
      proposed_by: "phase_reviewer",
    })

    const term = readTerm("Checkout")
    expect(content).toContain("proposal")
    expect(content).toContain("field=definition")
    expect(term?.definition).toBe("Old value")
    expect(term?.proposals).toHaveLength(1)
    expect(term?.proposals[0]).toMatchObject({
      id: `${new Date().getFullYear()}-001`,
      field: "definition",
      value: "New value",
      reason: "Observed drift",
      proposed_by: "phase_reviewer",
      date: today(),
    })
  })

  test("continues the proposal sequence", async () => {
    writeTermFile(
      project,
      makeTerm({
        term: "Checkout",
        proposals: [
          {
            id: "old",
            field: "definition",
            value: "a",
            proposed_by: "a",
            reason: "r",
            date: "2026-01-01",
          },
        ],
      }),
    )

    await callTool(proposeChange, {
      term: "Checkout",
      field: "implementation",
      value: "CheckoutService",
      reason: "drift",
      proposed_by: "technical_architect",
    })

    expect(readTerm("Checkout")?.proposals[1]?.id).toBe(
      `${new Date().getFullYear()}-002`,
    )
  })
})
