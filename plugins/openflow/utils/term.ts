import * as fs from "node:fs"
import * as path from "node:path"
import { err, slugify } from "../utils/helper"
import { getConfig, getRootDir } from "../utils/config"

export type Status = "proposed" | "active" | "deprecated"

interface Proposal {
  id: string
  field: "definition" | "implementation"
  value: string
  proposed_by: string
  reason: string
  date: string
  resolved?: string
}

export interface Term {
  term: string
  status: Status
  definition: string
  implementation: string
  aliases: string[]
  related_terms: string[]
  proposals: Proposal[]
}

export function getTermsDir(): string {
  const config = getConfig()
  const term_info = config.terms
  const root_dir = getRootDir()
  return path.join(root_dir, term_info.location)
}

export function getIndexFile(): string {
  const config = getConfig()
  const term_info = config.terms
  const root_dir = getRootDir()
  return path.join(root_dir, term_info.index)
}

function termFile(name: string): string {
  return path.join(getTermsDir(), `${slugify(name)}.json`)
}

export function readTerm(name: string): Term | null {
  const file = termFile(name)
  if (!fs.existsSync(file)) return null
  return JSON.parse(fs.readFileSync(file, "utf8")) as Term
}

export function writeTerm(term: Term): void {
  fs.mkdirSync(getTermsDir(), { recursive: true })
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

export function regenerate(): string {
  if (!fs.existsSync(getTermsDir())) return "No terms directory yet."
  const index: unknown[] = []
  const files = fs
    .readdirSync(getTermsDir())
    .filter((f: string) => f.endsWith(".json") && !f.startsWith("_"))
  for (const f of files) {
    const t = JSON.parse(fs.readFileSync(path.join(getTermsDir(), f), "utf8")) as Term
    index.push({
      term: t.term,
      status: t.status,
      aliases: t.aliases,
      open_proposals: t.proposals.filter((p) => !p.resolved).length,
    })
  }
  fs.writeFileSync(getIndexFile(), JSON.stringify(index, null, 2) + "\n")
  return `OK: index regenerated with ${index.length} terms.`
}

function archiveSuperseded(
  term: Term,
  field: "definition" | "implementation",
  oldValue: string,
): void {
  term.proposals.push({
    id: `superseded-${new Date().toISOString()}`,
    field,
    value: oldValue,
    proposed_by: "system",
    reason: "Superseded via force overwrite; previous value archived",
    date: new Date().toISOString().slice(0, 10),
  })
}

export function applyField(
  name: string,
  field: "definition" | "implementation",
  value: string,
  force: boolean,
): string {
  let term = readTerm(name)
  if (!term) term = emptyTerm(name)
  if (term.status === "deprecated") {
    return err(
      `Term "${term.term}" is deprecated. Deprecated terms can only be changed by consolidation (reactivate via proposals).`,
    )
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

export function nextProposalId(term: Term): string {
  const n = term.proposals.length + 1
  return `${new Date().getFullYear()}-${String(n).padStart(3, "0")}`
}

export function appendDecisionLog(entry: Record<string, string>): void {
  const logFile = path.join(getTermsDir(), "_decision_log.jsonl")
  fs.mkdirSync(getTermsDir(), { recursive: true })
  fs.appendFileSync(
    logFile,
    JSON.stringify({ date: new Date().toISOString(), ...entry }) + "\n",
  )
}
