import { Plugin } from "@opencode/plugin"
import { initConfig } from "./utils/config"
import { setDefinition } from "./tools/set_definition"
import { setImplementation } from "./tools/set_implementation"
import { proposeChange } from "./tools/propose_change"
import { getTerms } from "./tools/get_terms"
import { listTerms } from "./tools/list_terms"
import { applyProposal } from "./tools/apply_proposal"
import { rejectProposal } from "./tools/reject_proposal"
import { regenerateIndex } from "./tools/regenerate_index"
import { promoteStatus } from "./tools/promote_status"

export default Plugin.define({
  id: "openflow",
  async setup(ctx) {
    initConfig(ctx)
    await ctx.tool.transform((editor) => {
      editor.namespace({
        name: "openflow",
        description: "Process tools for the openflow process.",
      })
      editor.add(setDefinition)

      editor.add(setImplementation)

      editor.add(proposeChange)

      editor.add(getTerms)

      editor.add(listTerms)

      editor.add(applyProposal)

      editor.add(rejectProposal)

      editor.add(regenerateIndex)

      editor.add(promoteStatus)
    })
  },
})
