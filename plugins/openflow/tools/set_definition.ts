import { str, boolOpt, objSchema, type ToolDefinition } from "../utils/schema"
import { applyField } from "../utils/term"

export const setDefinition: ToolDefinition = {
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
      force: boolOpt(
        "Overwrite a differing existing definition; the old value is archived in proposals",
      ),
    },
    ["term", "definition"],
  ),
  options: { namespace: "openflow", codemode: true },
  async execute(input) {
    const { term, definition, force } = input as {
      term: string
      definition: string
      force?: boolean
    }
    return { content: applyField(term, "definition", definition, force ?? false) }
  },
}
