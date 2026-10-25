import { str, objSchema, type ToolDefinition } from "../utils/schema"
import { err } from "../utils/helper"
import { readTerm, writeTerm, appendDecisionLog } from "../utils/term"

export const applyProposal: ToolDefinition = {
  name: "applyProposal",
  description:
    "CONSOLIDATION ONLY. Apply a specific proposal to a term's ratified field, with rationale. " +
    "If multiple proposals target the same field, they must be resolved one by one explicitly. " +
    "The applied proposal is recorded in the decision log.",
  input: objSchema(
    {
      term: str("Term name"),
      proposal_id: str("ID of the proposal to apply"),
      rationale: str("Why this proposal was accepted (recorded in the decision log)"),
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
    t[p.field] = p.value
    p.resolved = `accepted: ${rationale}`
    writeTerm(t)
    appendDecisionLog({ term: t.term, proposal_id, decision: "accepted", rationale })
    return { content: `OK: proposal ${proposal_id} applied to "${t.term}.${p.field}".` }
  },
}
