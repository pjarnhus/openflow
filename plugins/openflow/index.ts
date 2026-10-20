import { Plugin } from "@opencode/plugin"
import { Term, readTerm, writeTerm, regenerate, nextProposalId, getTermsDir, getIndexFile, initTermsDir, initIndexFile } from "./utils/term"
import { setDefinition } from "./tools/set_definition"
import { setImplementation } from "./tools/set_implementation"
import { proposeChange } from "./tools/propose_change"
import { getTerms } from "./tools/get_terms"
import { listTerms } from "./tools/list_terms"
import { applyProposal } from "./tools/apply_proposal"
import { rejectProposal } from "./tools/reject_proposal"
import { regenerateIndex } from "./tools/regenerate_index"
import { promoteStatus } from "./tools/promote_status"
import * as fs from "node:fs"
import * as path from "node:path"



export default Plugin.define({
  id: "openflow",
  async setup(ctx) {
      const termsDir = path.join(ctx.location.project.directory, "docs", "terms");
      initTermsDir(termsDir);
      initIndexFile("_index.json");
      await ctx.tool.transform((editor) => {
          editor.namespace({ name: "openflow", descriptions: "Process tools for the openflow process."});
          editor.add(setDefinition);

          editor.add(setImplementation);

          editor.add(proposeChange);

          editor.add(getTerms);

          editor.add(listTerms);

          editor.add(applyProposal);

          editor.add(rejectProposal);

          editor.add(regenerateIndex);

          editor.add(promoteStatus);
      })
  },
})
