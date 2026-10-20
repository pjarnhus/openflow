import * as path from "node:path"
import * as fs from "node:fs"
import { str, objSchema } from "../utils/schema"
import { getTermsDir, Term } from "../utils/term"


export const getTerms = {
    name: "getTerms",
    description:
        "Free-text search over all term files. Returns matching terms with status, definition, and matching lines. " +
        "Use this to look up terms by name, alias, or any text in the definition/implementation.",
    input: objSchema({ query: str("Free-text query") }, ["query"]),
    options: { namespace: "openflow", codemode: true },
    async execute(input) {
        const { query } = input as { query: string }
        if (!fs.existsSync(getTermsDir())) return { content: "No glossary yet (docs/terms/ does not exist)." }
        const q = query.toLowerCase()
        const files = fs.readdirSync(getTermsDir()).filter((f) => f.endsWith(".json") && !f.startsWith("_"))
        const hits: string[] = []
        for (const f of files) {
            const t = JSON.parse(fs.readFileSync(path.join(getTermsDir(), f), "utf8")) as Term
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
}
