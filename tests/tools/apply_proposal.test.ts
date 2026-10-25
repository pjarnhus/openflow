import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { applyProposal } from "../../plugins/openflow/tools/apply_proposal"
import { readTerm } from "../../plugins/openflow/utils/term"
import {
  callTool,
  createTempProject,
  makeTerm,
  readDecisionLog,
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

function seedTerm(): void {
  writeTermFile(
    project,
    makeTerm({
      term: "Checkout",
      definition: "Old value",
      proposals: [
        {
          id: "2026-001",
          field: "definition",
          value: "New value",
          proposed_by: "phase_reviewer",
          reason: "drift",
          date: "2026-01-01",
        },
      ],
    }),
  )
}

describe("applyProposal", () => {
  test("rejects an unknown term", async () => {
    const content = await callTool(applyProposal, {
      term: "Missing",
      proposal_id: "1",
      rationale: "ok",
    })

    expect(content).toStartWith("ERROR:")
    expect(content).toContain('Term "Missing" not found')
  })

  test("rejects an unknown proposal", async () => {
    seedTerm()

    const content = await callTool(applyProposal, {
      term: "Checkout",
      proposal_id: "nope",
      rationale: "ok",
    })

    expect(content).toStartWith("ERROR:")
    expect(content).toContain("Open proposal nope not found")
  })

  test("applies the value, resolves the proposal, and logs the decision", async () => {
    seedTerm()

    const content = await callTool(applyProposal, {
      term: "Checkout",
      proposal_id: "2026-001",
      rationale: "Ratified at consolidation",
    })

    const term = readTerm("Checkout")
    expect(content).toBe('OK: proposal 2026-001 applied to "Checkout.definition".')
    expect(term?.definition).toBe("New value")
    expect(term?.proposals[0]?.resolved).toBe("accepted: Ratified at consolidation")
    expect(readDecisionLog(project)[0]).toMatchObject({
      term: "Checkout",
      proposal_id: "2026-001",
      decision: "accepted",
      rationale: "Ratified at consolidation",
    })
  })

  test("does not apply an already resolved proposal", async () => {
    seedTerm()
    await callTool(applyProposal, {
      term: "Checkout",
      proposal_id: "2026-001",
      rationale: "first",
    })

    const content = await callTool(applyProposal, {
      term: "Checkout",
      proposal_id: "2026-001",
      rationale: "second",
    })

    expect(content).toStartWith("ERROR:")
  })
})
