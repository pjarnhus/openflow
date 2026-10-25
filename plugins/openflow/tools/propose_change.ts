import { err } from "../utils/helper"
import { str, enumSchema, objSchema, type ToolDefinition } from "../utils/schema"
import { readTerm, writeTerm, nextProposalId } from "../utils/term"

export const proposeChange: ToolDefinition = {
  name: "proposeChange",
  description:
    "Propose a change to an existing term's definition or implementation. " +
    "Append-only: the proposal lands in the term's proposals[] buffer and is NOT applied. " +
    "Applied only at sprint-end consolidation. Available to requirements, technical_architect, and phase_reviewer. " +
    "Cannot modify status, aliases, or related_terms; those are consolidation-only.",
  input: objSchema(
    {
      term: str("Term name"),
      field: enumSchema(["definition", "implementation"], "Field being proposed"),
      value: str("Proposed new value"),
      reason: str("Why the change is needed, e.g. observed drift"),
      proposed_by: str("Name of the proposing agent, e.g. 'phase_reviewer'"),
    },
    ["term", "field", "value", "reason", "proposed_by"],
  ),
  options: { namespace: "openflow", codemode: true },
  async execute(input) {
    const { term, field, value, reason, proposed_by } = input as {
      term: string
      field: "definition" | "implementation"
      value: string
      reason: string
      proposed_by: string
    }
    const t = readTerm(term)
    if (!t)
      return {
        content: err(
          `Term "${term}" does not exist. Create it first (requirements agent uses setDefinition).`,
        ),
      }
    const id = nextProposalId(t)
    t.proposals.push({
      id,
      field,
      value,
      proposed_by,
      reason,
      date: new Date().toISOString().slice(0, 10),
    })
    writeTerm(t)
    return {
      content: `OK: proposal ${id} appended to "${t.term}" (field=${field}). Awaiting sprint-end consolidation.`,
    }
  },
}
