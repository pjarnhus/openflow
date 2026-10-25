import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rejectProposal } from "../../plugins/openflow/tools/reject_proposal"
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
      proposals: [
        {
          id: "2026-001",
          field: "implementation",
          value: "CheckoutService",
          proposed_by: "technical_architect",
          reason: "drift",
          date: "2026-01-01",
        },
      ],
    }),
  )
}

describe("rejectProposal", () => {
  test("rejects an unknown term", async () => {
    const content = await callTool(rejectProposal, {
      term: "Missing",
      proposal_id: "1",
      rationale: "no",
    })

    expect(content).toStartWith("ERROR:")
  })

  test("marks the proposal resolved and logs the decision", async () => {
    seedTerm()

    const content = await callTool(rejectProposal, {
      term: "Checkout",
      proposal_id: "2026-001",
      rationale: "Not ratified",
    })

    expect(content).toBe('OK: proposal 2026-001 rejected on "Checkout".')
    expect(readTerm("Checkout")?.proposals[0]?.resolved).toBe("rejected: Not ratified")
    expect(readDecisionLog(project)[0]).toMatchObject({
      decision: "rejected",
      rationale: "Not ratified",
    })
  })
})
