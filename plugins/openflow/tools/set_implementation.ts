import { str, boolOpt, objSchema, type ToolDefinition } from "../utils/schema"
import { applyField } from "../utils/term"

export const setImplementation: ToolDefinition = {
  name: "setImplementation",
  description:
    "Set the IMPLEMENTATION mapping of a glossary term: where in the codebase the term is relevant and how, " +
    "as responsibilities and module names, not file paths. " +
    "Owner: phase reviewer. Fails with the current value if a different implementation exists unless force=true. " +
    "Cannot modify deprecated terms.",
  input: objSchema(
    {
      term: str("Term name"),
      implementation: str(
        "Where the term lives in the code and how, as responsibilities/modules",
      ),
      force: boolOpt(
        "Overwrite a differing existing implementation; the old value is archived in proposals",
      ),
    },
    ["term", "implementation"],
  ),
  options: { namespace: "openflow", codemode: true },
  async execute(input) {
    const { term, implementation, force } = input as {
      term: string
      implementation: string
      force?: boolean
    }
    return {
      content: applyField(term, "implementation", implementation, force ?? false),
    }
  },
}
