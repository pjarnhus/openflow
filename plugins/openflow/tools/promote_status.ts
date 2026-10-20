import { str, enumSchema, objSchema } from "../utils/schema"
import { Status, readTerm, writeTerm, appendDecisionLog, regenerate } from "../utils/term"
import { err } from "../utils/helper"

export const promoteStatus = {
    name: "promoteStatus",
    description:
        "CONSOLIDATION ONLY. Change a term's status: proposed->active, active->deprecated, or deprecated->active (reactivation). " +
        "Deprecation requires a rationale. Regenerates the index automatically.",
    input: objSchema(
        {
            term: str("Term name"),
            status: enumSchema(["proposed", "active", "deprecated"], "New status"),
            rationale: str("Required when deprecating"),
        },
        ["term", "status"],
    ),
    options: { namespace: "openflow", codemode: true },
    async execute(input) {
        const { term, status, rationale } = input as { term: string; status: Status; rationale?: string }
        const t = readTerm(term)
        if (!t) return { content: err(`Term "${term}" not found.`) }
        if (status === "deprecated" && !rationale) {
            return { content: err("Deprecation requires a rationale (e.g. absent from all current docs).") }
        }
        t.status = status
        writeTerm(t)
        appendDecisionLog({ term: t.term, decision: `status -> ${status}`, rationale: rationale ?? "" })
        regenerate()
        return { content: `OK: "${t.term}" status set to ${status}. Index regenerated.` }
    },
}
