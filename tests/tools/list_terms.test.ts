import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { listTerms } from "../../plugins/openflow/tools/list_terms"
import { regenerate } from "../../plugins/openflow/utils/term"
import {
  callTool,
  createTempProject,
  makeTerm,
  readJson,
  writeTermFile,
  type TempProject,
} from "../helpers"

let project: TempProject

beforeEach(() => {
  project = createTempProject()
})

afterEach(() => {
  project.cleanup()
})

describe("listTerms", () => {
  test("reports when the index is missing", async () => {
    const content = await callTool(listTerms, {})

    expect(content).toBe(
      "No index. Run regenerateIndex or the sprint-end consolidation first.",
    )
  })

  test("returns the index as formatted JSON", async () => {
    writeTermFile(project, makeTerm({ term: "Checkout", aliases: ["pay"] }))
    regenerate()

    const content = await callTool(listTerms, {})

    expect(JSON.parse(content)).toEqual(readJson(project.indexPath))
    expect(JSON.parse(content)).toEqual([
      {
        term: "Checkout",
        status: "proposed",
        aliases: ["pay"],
        open_proposals: 0,
      },
    ])
  })
})
