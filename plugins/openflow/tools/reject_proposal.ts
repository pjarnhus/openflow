import { err } from "../utils/helper"
import { str, objSchema, type ToolDefinition } from "../utils/schema"
import { readTerm, writeTerm, appendDecisionLog } from "../utils/term"

export const rejectProposal: ToolDefinition = {
  name: "rejectProposal",
  description:
    "CONSOLIDATION ONLY. Reject a proposal with rationale, recorded in the decision log.",
  input: objSchema(
    {
      term: str("Term name"),
      proposal_id: str("ID of the proposal to reject"),
      rationale: str("Why this proposal was rejected"),
    },
    ["term", "proposal_id", "rationale"],
  ),
  options: { namespace: "openflow", codemode: true },
  async execute(input) {
    const { term, proposal_id, rationale } = input as {
      term: string
      proposal_id: string
      rationale: string
    }
    const t = readTerm(term)
    if (!t) return { content: err(`Term "${term}" not found.`) }
    const p = t.proposals.find((x) => x.id === proposal_id && !x.resolved)
    if (!p)
      return { content: err(`Open proposal ${proposal_id} not found on "${t.term}".`) }
    p.resolved = `rejected: ${rationale}`
    writeTerm(t)
    appendDecisionLog({ term: t.term, proposal_id, decision: "rejected", rationale })
    return { content: `OK: proposal ${proposal_id} rejected on "${t.term}".` }
  },
}
