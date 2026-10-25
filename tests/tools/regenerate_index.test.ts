import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import * as fs from "node:fs"
import { regenerateIndex } from "../../plugins/openflow/tools/regenerate_index"
import {
  callTool,
  createTempProject,
  makeTerm,
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

describe("regenerateIndex", () => {
  test("reports when there is no terms directory", async () => {
    const content = await callTool(regenerateIndex, {})

    expect(content).toBe("No terms directory yet.")
  })

  test("writes the index", async () => {
    writeTermFile(project, makeTerm({ term: "Checkout" }))

    const content = await callTool(regenerateIndex, {})

    expect(content).toBe("OK: index regenerated with 1 terms.")
    expect(fs.existsSync(project.indexPath)).toBe(true)
  })
})
