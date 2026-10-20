// ~/.config/opencode/plugins/glossary.ts
//
// OpenCode V2 plugin for the ubiquitous language glossary.
// Terms live as one JSON file per term under docs/terms/ in the
// session's working directory.
//
// Tool names are now literal: setDefinition, setImplementation,
// proposeChange, getTerms, listTerms,
// applyProposal, rejectProposal, regenerateIndex,
// promoteStatus.
//
// Write authority is NOT enforced here. Restrict per agent in agent frontmatter.

import { Plugin } from "@opencode/plugin"
import * as fs from "node:fs"
import * as path from "node:path"


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

// ---------- helpers (unchanged) ----------


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

function appendDecisionLog(entry: Record<string, string>): void {
  const logFile = path.join(TERMS_DIR, "_decision_log.jsonl")
  fs.mkdirSync(TERMS_DIR, { recursive: true })
  fs.appendFileSync(logFile, JSON.stringify({ date: new Date().toISOString(), ...entry }) + "\n")
}

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

// ---------- JSON Schema builders ----------

function str(description: string): object {
  return { type: "string", description }
}

function boolOpt(description: string): object {
  return { type: "boolean", default: false, description }
}

function enumSchema(values: string[], description: string): object {
  return { type: "string", enum: values, description }
}

function objSchema(properties: Record<string, object>, required: string[]): object {
  return { type: "object", properties, required, additionalProperties: false }
}

// ---------- plugin ----------
let TERMS_DIR: string = ""
let INDEX_FILE: string = ""

export default Plugin.define({
  id: "glossary",
  async setup(ctx) {
      const termsDir = path.join(ctx.location.project.directory, "docs", "terms")
      await ctx.tool.transform((editor) => {
          TERMS_DIR = termsDir
          INDEX_FILE = path.join(TERMS_DIR, "_index.json")
          editor.namespace({ name: "openflow", descriptions: "Process tools for the openflow process."})
          editor.add({
              name: "setDefinition",
              description:
                  "Set the business-language DEFINITION of a glossary term. " +
                  "Owner: requirements agent. Creates new terms (status=proposed). " +
                  "Fails with the current value if a different definition exists unless force=true. " +
                  "Cannot modify deprecated terms.",
              input: objSchema(
                  {
                      term: str("Term name, e.g. 'Checkout'"),
                      definition: str("Business-language definition"),
                      force: boolOpt("Overwrite a differing existing definition; the old value is archived in proposals"),
                  },
                  ["term", "definition"],
              ),
              options: { namespace: "openflow", codemode: true },
              async execute(input) {
                  const { term, definition, force } = input as { term: string; definition: string; force?: boolean }
                  return { content: applyField(term, "definition", definition, force ?? false) }
              },
          })

          editor.add({
              name: "setImplementation",
              description:
                  "Set the IMPLEMENTATION mapping of a glossary term: where in the codebase the term is relevant and how, " +
                  "as responsibilities and module names, not file paths. " +
                  "Owner: phase reviewer. Fails with the current value if a different implementation exists unless force=true. " +
                  "Cannot modify deprecated terms.",
              input: objSchema(
                  {
                      term: str("Term name"),
                      implementation: str("Where the term lives in the code and how, as responsibilities/modules"),
                      force: boolOpt("Overwrite a differing existing implementation; the old value is archived in proposals"),
                  },
                  ["term", "implementation"],
              ),
              options: { namespace: "openflow", codemode: true },
              async execute(input) {
                  const { term, implementation, force } = input as { term: string; implementation: string; force?: boolean }
                  return { content: applyField(term, "implementation", implementation, force ?? false) }
              },
          })

          editor.add({
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
                      term: string; field: "definition" | "implementation"; value: string; reason: string; proposed_by: string
                  }
                  const t = readTerm(term)
                  if (!t) return { content: err(`Term "${term}" does not exist. Create it first (requirements agent uses setDefinition).`) }
                  const id = nextProposalId(t)
                  t.proposals.push({ id, field, value, proposed_by, reason, date: new Date().toISOString().slice(0, 10) })
                  writeTerm(t)
                  return { content: `OK: proposal ${id} appended to "${t.term}" (field=${field}). Awaiting sprint-end consolidation.` }
              },
          })

          editor.add({
              name: "getTerms",
              description:
                  "Free-text search over all term files. Returns matching terms with status, definition, and matching lines. " +
                  "Use this to look up terms by name, alias, or any text in the definition/implementation.",
              input: objSchema({ query: str("Free-text query") }, ["query"]),
              options: { namespace: "openflow", codemode: true },
              async execute(input) {
                  const { query } = input as { query: string }
                  if (!fs.existsSync(TERMS_DIR)) return { content: "No glossary yet (docs/terms/ does not exist)." }
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
                  return { content: hits.length ? hits.join("\n\n") : `No terms matching "${query}".` }
              },
          })

          editor.add({
              name: "listTerms",
              description:
                  "List all glossary terms from the generated index (name, status, aliases, open proposal count). " +
                  "Suitable for compact injection of the term list into an agent's context.",
              input: objSchema({}, []),
              options: { namespace: "openflow", codemode: true },
              async execute() {
                  if (!fs.existsSync(INDEX_FILE)) {
                      return { content: "No index. Run regenerateIndex or the sprint-end consolidation first." }
                  }
                  const index = JSON.parse(fs.readFileSync(INDEX_FILE, "utf8"))
                  return { content: JSON.stringify(index, null, 2) }
              },
          })

          editor.add({
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
                  const { term, proposal_id, rationale } = input as { term: string; proposal_id: string; rationale: string }
                  const t = readTerm(term)
                  if (!t) return { content: err(`Term "${term}" not found.`) }
                  const p = t.proposals.find((x) => x.id === proposal_id && !("resolved" in x))
                  if (!p) return { content: err(`Open proposal ${proposal_id} not found on "${t.term}".`) }
                  t[p.field] = p.value
                  ;(p as any).resolved = `accepted: ${rationale}`
                  writeTerm(t)
                  appendDecisionLog({ term: t.term, proposal_id, decision: "accepted", rationale })
                  return { content: `OK: proposal ${proposal_id} applied to "${t.term}.${p.field}".` }
              },
          })

          editor.add({
              name: "rejectProposal",
              description: "CONSOLIDATION ONLY. Reject a proposal with rationale, recorded in the decision log.",
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
                  const { term, proposal_id, rationale } = input as { term: string; proposal_id: string; rationale: string }
                  const t = readTerm(term)
                  if (!t) return { content: err(`Term "${term}" not found.`) }
                  const p = t.proposals.find((x) => x.id === proposal_id && !("resolved" in x))
                  if (!p) return { content: err(`Open proposal ${proposal_id} not found on "${t.term}".`) }
                  ;(p as any).resolved = `rejected: ${rationale}`
                  writeTerm(t)
                  appendDecisionLog({ term: t.term, proposal_id, decision: "rejected", rationale })
                  return { content: `OK: proposal ${proposal_id} rejected on "${t.term}".` }
              },
          })

          editor.add({
              name: "regenerateIndex",
              description:
                  "Regenerate docs/terms/_index.json from the term files: name, status, aliases, open proposal count. " +
                  "Run at sprint end after consolidation.",
              input: objSchema({}, []),
              options: { namespace: "openflow", codemode: true },
              async execute() {
                  return { content: regenerate() }
              },
          })

          editor.add({
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
          })
      })
  },
})
