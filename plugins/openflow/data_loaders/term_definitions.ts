import * as path from "node:path"
import * as fs from "node:fs"
import { getTermsDir, type Term } from "../utils/term"

export async function loadTermDefinitions() {
  const no_terms_response: string = "No Terms defined."
  if (!fs.existsSync(getTermsDir())) return no_terms_response
  const files = fs
    .readdirSync(getTermsDir())
    .filter((f) => f.endsWith(".json") && !f.startsWith("_"))
  const hits: string[] = []
  for (const f of files) {
    const term = JSON.parse(
      fs.readFileSync(path.join(getTermsDir(), f), "utf8"),
    ) as Term
    hits.push(
      `## ${term.term}\n` +
        `definition: ${term.definition || ""}\n` +
        `aliases: ${term.aliases.join(", ") || "(none)"}\n` +
        `related terms: ${term.related_terms.join(", ") || "(none)"}`,
    )
  }
  if (hits.length > 0) return hits.join("\n")
  return no_terms_response
}
