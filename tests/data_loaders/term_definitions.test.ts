import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import * as fs from "node:fs"
import * as path from "node:path"
import { loadTermDefinitions } from "../../plugins/openflow/data_loaders/term_definitions"
import {
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

describe("loadTermDefinitions", () => {
  test("reports when there is no terms directory", async () => {
    expect(await loadTermDefinitions()).toBe("No Terms defined yet.")
  })

  test("renders every term file", async () => {
    writeTermFile(
      project,
      makeTerm({
        term: "Checkout",
        definition: "Paying for goods",
        aliases: ["pay"],
        related_terms: ["Cart"],
      }),
    )
    writeTermFile(project, makeTerm({ term: "Cart", definition: "Items" }))

    const content = await loadTermDefinitions()

    expect(content).toContain("## Checkout")
    expect(content).toContain("definition: Paying for goods")
    expect(content).toContain("aliases: pay")
    expect(content).toContain("related terms: Cart")
    expect(content).toContain("## Cart")
    expect(content).toContain("aliases: (none)")
  })

  test("skips index and decision log files", async () => {
    writeTermFile(project, makeTerm({ term: "Checkout" }))
    fs.writeFileSync(path.join(project.termsDir, "_index.json"), "[]")
    fs.writeFileSync(path.join(project.termsDir, "_decision_log.jsonl"), "")

    const content = await loadTermDefinitions()

    expect(content.match(/^## /gm)).toHaveLength(1)
  })
})
