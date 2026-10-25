import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { getTerms } from "../../plugins/openflow/tools/get_terms"
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

function seed(): void {
  writeTermFile(
    project,
    makeTerm({
      term: "Checkout",
      definition: "Paying for goods",
      implementation: "CheckoutService",
      aliases: ["pay"],
    }),
  )
  writeTermFile(project, makeTerm({ term: "Cart", definition: "A set of items" }))
}

describe("getTerms", () => {
  test("reports when the glossary does not exist", async () => {
    const content = await callTool(getTerms, { query: "anything" })
    expect(content).toBe("No glossary yet (docs/terms/ does not exist).")
  })

  test("matches on the term name", async () => {
    seed()
    const content = await callTool(getTerms, { query: "check" })

    expect(content).toContain("## Checkout [proposed]")
    expect(content).not.toContain("## Cart")
  })

  test("matches on an alias", async () => {
    seed()
    const content = await callTool(getTerms, { query: "pay" })

    expect(content).toContain("## Checkout")
    expect(content).toContain("aliases: pay")
  })

  test("matches on the definition", async () => {
    seed()
    const content = await callTool(getTerms, { query: "items" })

    expect(content).toContain("## Cart")
  })

  test("includes the implementation line only for implementation matches", async () => {
    seed()

    const implementationHit = await callTool(getTerms, { query: "service" })
    expect(implementationHit).toContain("implementation: CheckoutService")

    const definitionHit = await callTool(getTerms, { query: "goods" })
    expect(definitionHit).not.toContain("implementation:")
  })

  test("reports when nothing matches", async () => {
    seed()
    const content = await callTool(getTerms, { query: "zzz" })

    expect(content).toBe('No terms matching "zzz".')
  })
})
