// .opencode/tools/glossary.ts
//
// Opencode custom tools for the ubiquitous language glossary.
// Terms live as one JSON file per term under docs/terms/.
// Tool names in Opencode are prefixed with the filename:
//   glossary_setDefinition, glossary_setImplementation, glossary_proposeChange,
//   glossary_getTerms, glossary_listTerms, glossary_applyProposal,
//   glossary_rejectProposal, glossary_regenerateIndex
//
// Write authority is NOT enforced here. Restrict tool access per agent in the
// agent frontmatter, e.g. in .opencode/agents/requirements.md:
//   tools:
//     add:
//       - glossary_setDefinition
//       - glossary_proposeChange
// and correspondingly for technical_architect (proposeChange only),
// phase_reviewer (setImplementation, proposeChange),
// and the consolidation agent (applyProposal, rejectProposal, regenerateIndex).

import { tool } from "@opencode-ai/plugin"
import * as fs from "node:fs"
import * as path from "node:path"

const TERMS_DIR = path.join(process.cwd(), "docs", "terms")
const INDEX_FILE = path.join(TERMS_DIR, "_index.json")

type Status = "proposed" | "active" | "deprecated"

interface Proposal {
  id: string
  field: "definition" | "implementation"
  value: string
  proposed_by: string
  reason: string
  date: string
}

interface Term {
  term: string
  status: Status
  definition: string
  implementation: string
  aliases: string[]
  related_terms: string[]
  proposals: Proposal[]
}

// ---------- helpers ----------

function slugify(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")
}

function termFile(name: string): string {
  return path.join(TERMS_DIR, `${slugify(name)}.json`)
}

function readTerm(name: string): Term | null {
  const file = termFile(name)
  if (!fs.existsSync(file)) return null
  return JSON.parse(fs.readFileSync(file, "utf8")) as Term
}

function writeTerm(term: Term): void {
  fs.mkdirSync(TERMS_DIR, { recursive: true })
  fs.writeFileSync(termFile(term.term), JSON.stringify(term, null, 2) + "\n")
}

function emptyTerm(name: string): Term {
  return {
    term: name.trim(),
    status: "proposed",
    definition: "",
    implementation: "",
    aliases: [],
    related_terms: [],
    proposals: [],
  }
}

function archiveSuperseded(term: Term, field: "definition" | "implementation", oldValue: string): void {
  term.proposals.push({
    id: `superseded-${new Date().toISOString()}`,
    field,
    value: oldValue,
    proposed_by: "system",
    reason: "Superseded via force overwrite; previous value archived",
    date: new Date().toISOString().slice(0, 10),
  })
}

function nextProposalId(term: Term): string {
  const n = term.proposals.length + 1
  return `${new Date().getFullYear()}-${String(n).padStart(3, "0")}`
}

function err(message: string): string {
  return `ERROR: ${message}`
}

// Core write semantics shared by setDefinition / setImplementation:
// - field empty           -> create (success)
// - value identical       -> idempotent no-op (success)
// - value different       -> ERROR with current value, unless force
// - force with difference -> overwrite, archive old value into proposals
// - deprecated term       -> ERROR regardless (only consolidation may touch)
function applyField(
  name: string,
  field: "definition" | "implementation",
  value: string,
  force: boolean,
): string {
  let term = readTerm(name)
  if (!term) term = emptyTerm(name)
  if (term.status === "deprecated") {
    return err(`Term "${term.term}" is deprecated. Deprecated terms can only be changed by consolidation (reactivate via proposals).`)
  }
  if (term[field] === value) {
    return `OK: "${term.term}.${field}" unchanged (value already set, no-op).`
  }
  if (term[field] !== "") {
    if (!force) {
      return err(
        `"${term.term}.${field}" already exists with a different value. Use force=true to overwrite, or propose a change instead.\n` +
        `Current value:\n${term[field]}\n\nProposed value:\n${value}`,
      )
    }
    archiveSuperseded(term, field, term[field])
  }
  term[field] = value
  writeTerm(term)
  return `OK: set "${term.term}.${field}"${force ? " (forced; previous value archived in proposals)" : ""}. Status: ${term.status}.`
}

// ---------- tools ----------

export const setDefinition = tool({
  description:
    "Set the business-language DEFINITION of a glossary term. " +
    "Owner: requirements agent. Creates new terms (status=proposed). " +
    "Fails with the current value if a different definition exists unless force=true. " +
    "Cannot modify deprecated terms.",
  args: {
    term: tool.schema.string().describe("Term name, e.g. 'Checkout'"),
    definition: tool.schema.string().describe("Business-language definition"),
    force: tool.schema.boolean().default(false).describe("Overwrite a differing existing definition; the old value is archived in proposals"),
  },
  async execute({ term, definition, force }) {
    return applyField(term, "definition", definition, force)
  },
})

export const setImplementation = tool({
  description:
    "Set the IMPLEMENTATION mapping of a glossary term: where in the codebase the term is relevant and how, " +
    "as responsibilities and module names, not file paths. " +
    "Owner: phase reviewer. Fails with the current value if a different implementation exists unless force=true. " +
    "Cannot modify deprecated terms.",
  args: {
    term: tool.schema.string().describe("Term name"),
    implementation: tool.schema.string().describe("Where the term lives in the code and how, as responsibilities/modules"),
    force: tool.schema.boolean().default(false).describe("Overwrite a differing existing implementation; the old value is archived in proposals"),
  },
  async execute({ term, implementation, force }) {
    return applyField(term, "implementation", implementation, force)
  },
})

export const proposeChange = tool({
  description:
    "Propose a change to an existing term's definition or implementation. " +
    "Append-only: the proposal lands in the term's proposals[] buffer and is NOT applied. " +
    "Applied only at sprint-end consolidation. Available to requirements, technical_architect, and phase_reviewer. " +
    "Cannot modify status, aliases, or related_terms; those are consolidation-only.",
  args: {
    term: tool.schema.string().describe("Term name"),
    field: tool.schema.enum(["definition", "implementation"]).describe("Field being proposed"),
    value: tool.schema.string().describe("Proposed new value"),
    reason: tool.schema.string().describe("Why the change is needed, e.g. observed drift"),
    proposed_by: tool.schema.string().describe("Name of the proposing agent, e.g. 'phase_reviewer'"),
  },
  async execute({ term, field, value, reason, proposed_by }) {
    const t = readTerm(term)
    if (!t) return err(`Term "${term}" does not exist. Create it first (requirements agent uses setDefinition).`)
    const id = nextProposalId(t)
    t.proposals.push({ id, field, value, proposed_by, reason, date: new Date().toISOString().slice(0, 10) })
    writeTerm(t)
    return `OK: proposal ${id} appended to "${t.term}" (field=${field}). Awaiting sprint-end consolidation.`
  },
})

export const getTerms = tool({
  description:
    "Free-text search over all term files. Returns matching terms with status, definition, and matching lines. " +
    "Use this to look up terms by name, alias, or any text in the definition/implementation.",
  args: {
    query: tool.schema.string().describe("Free-text query"),
  },
  async execute({ query }) {
    if (!fs.existsSync(TERMS_DIR)) return "No glossary yet (docs/terms/ does not exist)."
    const q = query.toLowerCase()
    const files = fs.readdirSync(TERMS_DIR).filter((f) => f.endsWith(".json") && !f.startsWith("_"))
    const hits: string[] = []
    for (const f of files) {
      const t = JSON.parse(fs.readFileSync(path.join(TERMS_DIR, f), "utf8")) as Term
      const inName = t.term.toLowerCase().includes(q)
      const inAliases = t.aliases.some((a) => a.toLowerCase().includes(q))
      const inDef = t.definition.toLowerCase().includes(q)
      const inImpl = t.implementation.toLowerCase().includes(q)
      if (inName || inAliases || inDef || inImpl) {
        hits.push(
          `## ${t.term} [${t.status}]\n` +
          `definition: ${t.definition || "(empty)"}\n` +
          (inImpl ? `implementation: ${t.implementation || "(empty)"}\n` : "") +
          `aliases: ${t.aliases.join(", ") || "(none)"}`,
        )
      }
    }
    return hits.length ? hits.join("\n\n") : `No terms matching "${query}".`
  },
})

export const listTerms = tool({
  description:
    "List all glossary terms from the generated index (name, status, aliases, open proposal count). " +
    "Suitable for compact injection of the term list into an agent's context.",
  args: {},
  async execute() {
    if (!fs.existsSync(INDEX_FILE)) {
      return "No index. Run glossary_regenerateIndex or the sprint-end consolidation first."
    }
    const index = JSON.parse(fs.readFileSync(INDEX_FILE, "utf8"))
    return JSON.stringify(index, null, 2)
  },
})

export const applyProposal = tool({
  description:
    "CONSOLIDATION ONLY. Apply a specific proposal to a term's ratified field, with rationale. " +
    "If multiple proposals target the same field, they must be resolved one by one explicitly. " +
    "The applied proposal is recorded in the decision log.",
  args: {
    term: tool.schema.string().describe("Term name"),
    proposal_id: tool.schema.string().describe("ID of the proposal to apply"),
    rationale: tool.schema.string().describe("Why this proposal was accepted (recorded in the decision log)"),
  },
  async execute({ term, proposal_id, rationale }) {
    const t = readTerm(term)
    if (!t) return err(`Term "${term}" not found.`)
    const p = t.proposals.find((x) => x.id === proposal_id && !("resolved" in x))
    if (!p) return err(`Open proposal ${proposal_id} not found on "${t.term}".`)
    t[p.field] = p.value
    ;(p as any).resolved = `accepted: ${rationale}`
    writeTerm(t)
    appendDecisionLog({ term: t.term, proposal_id, decision: "accepted", rationale })
    return `OK: proposal ${proposal_id} applied to "${t.term}.${p.field}".`
  },
})

export const rejectProposal = tool({
  description: "CONSOLIDATION ONLY. Reject a proposal with rationale, recorded in the decision log.",
  args: {
    term: tool.schema.string().describe("Term name"),
    proposal_id: tool.schema.string().describe("ID of the proposal to reject"),
    rationale: tool.schema.string().describe("Why this proposal was rejected"),
  },
  async execute({ term, proposal_id, rationale }) {
    const t = readTerm(term)
    if (!t) return err(`Term "${term}" not found.`)
    const p = t.proposals.find((x) => x.id === proposal_id && !("resolved" in x))
    if (!p) return err(`Open proposal ${proposal_id} not found on "${t.term}".`)
    ;(p as any).resolved = `rejected: ${rationale}`
    writeTerm(t)
    appendDecisionLog({ term: t.term, proposal_id, decision: "rejected", rationale })
    return `OK: proposal ${proposal_id} rejected on "${t.term}".`
  },
})

function appendDecisionLog(entry: Record<string, string>): void {
  const logFile = path.join(TERMS_DIR, "_decision_log.jsonl")
  fs.mkdirSync(TERMS_DIR, { recursive: true })
  fs.appendFileSync(logFile, JSON.stringify({ date: new Date().toISOString(), ...entry }) + "\n")
}

export const regenerateIndex = tool({
  description:
    "Regenerate docs/terms/_index.json from the term files: name, status, aliases, open proposal count. " +
    "Run at sprint end after consolidation. Also used to change status (active/deprecated) via promoteStatus.",
  args: {},
  async execute() {
    return regenerate()
  },
})

function regenerate(): string {
  if (!fs.existsSync(TERMS_DIR)) return "No terms directory yet."
  const index: unknown[] = []
  const files = fs.readdirSync(TERMS_DIR).filter((f) => f.endsWith(".json") && !f.startsWith("_"))
  for (const f of files) {
    const t = JSON.parse(fs.readFileSync(path.join(TERMS_DIR, f), "utf8")) as Term
    index.push({
      term: t.term,
      status: t.status,
      aliases: t.aliases,
      open_proposals: t.proposals.filter((p) => !("resolved" in (p as any))).length,
    })
  }
  fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2) + "\n")
  return `OK: index regenerated with ${index.length} terms.`
}

export const promoteStatus = tool({
  description:
    "CONSOLIDATION ONLY. Change a term's status: proposed->active, active->deprecated, or deprecated->active (reactivation). " +
    "Deprecation requires a rationale. Regenerates the index automatically.",
  args: {
    term: tool.schema.string().describe("Term name"),
    status: tool.schema.enum(["proposed", "active", "deprecated"]).describe("New status"),
    rationale: tool.schema.string().optional().describe("Required when deprecating"),
  },
  async execute({ term, status, rationale }) {
    const t = readTerm(term)
    if (!t) return err(`Term "${term}" not found.`)
    if (status === "deprecated" && !rationale) {
      return err("Deprecation requires a rationale (e.g. absent from all current docs).")
    }
    t.status = status
    writeTerm(t)
    appendDecisionLog({ term: t.term, decision: `status -> ${status}`, rationale: rationale ?? "" })
    regenerate()
    return `OK: "${t.term}" status set to ${status}. Index regenerated.`
  },
})
