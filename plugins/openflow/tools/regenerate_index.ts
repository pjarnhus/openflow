import { objSchema, type ToolDefinition } from "../utils/schema"
import { regenerate } from "../utils/term"

export const regenerateIndex: ToolDefinition = {
  name: "regenerateIndex",
  description:
    "Regenerate docs/terms/_index.json from the term files: name, status, aliases, open proposal count. " +
    "Run at sprint end after consolidation.",
  input: objSchema({}, []),
  options: { namespace: "openflow", codemode: true },
  async execute() {
    return { content: regenerate() }
  },
}
