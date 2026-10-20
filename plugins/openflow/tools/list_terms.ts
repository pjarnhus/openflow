import * as fs from "node:fs"
import { objSchema } from "../utils/schema"
import { getIndexFile } from "../utils/term"


export const listTerms = {
    name: "listTerms",
    description:
        "List all glossary terms from the generated index (name, status, aliases, open proposal count). " +
        "Suitable for compact injection of the term list into an agent's context.",
    input: objSchema({}, []),
    options: { namespace: "openflow", codemode: true },
    async execute() {
        if (!fs.existsSync(getIndexFile())) {
            return { content: "No index. Run regenerateIndex or the sprint-end consolidation first." }
        }
        const index = JSON.parse(fs.readFileSync(getIndexFile(), "utf8"))
        return { content: JSON.stringify(index, null, 2) }
    },
}
