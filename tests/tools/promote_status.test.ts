import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import * as fs from "node:fs"
import { promoteStatus } from "../../plugins/openflow/tools/promote_status"
import { readTerm } from "../../plugins/openflow/utils/term"
import {
  callTool,
  createTempProject,
  makeTerm,
  readDecisionLog,
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

describe("promoteStatus", () => {
  test("rejects an unknown term", async () => {
    const content = await callTool(promoteStatus, {
      term: "Missing",
      status: "active",
    })

    expect(content).toStartWith("ERROR:")
    expect(content).toContain('Term "Missing" not found')
  })

  test("requires a rationale for deprecation", async () => {
    writeTermFile(project, makeTerm({ term: "Checkout", status: "active" }))

    const content = await callTool(promoteStatus, {
      term: "Checkout",
      status: "deprecated",
    })

    expect(content).toStartWith("ERROR:")
    expect(content).toContain("requires a rationale")
  })

  test("promotes proposed to active", async () => {
    writeTermFile(project, makeTerm({ term: "Checkout", status: "proposed" }))

    const content = await callTool(promoteStatus, {
      term: "Checkout",
      status: "active",
    })

    expect(content).toBe('OK: "Checkout" status set to active. Index regenerated.')
    expect(readTerm("Checkout")?.status).toBe("active")
    expect(fs.existsSync(project.indexPath)).toBe(true)
  })

  test("deprecates with a rationale and logs the decision", async () => {
    writeTermFile(project, makeTerm({ term: "Checkout", status: "active" }))

    await callTool(promoteStatus, {
      term: "Checkout",
      status: "deprecated",
      rationale: "Absent from all current docs",
    })

    expect(readTerm("Checkout")?.status).toBe("deprecated")
    expect(readDecisionLog(project)[0]).toMatchObject({
      term: "Checkout",
      decision: "status -> deprecated",
      rationale: "Absent from all current docs",
    })
  })

  test("reactivates a deprecated term", async () => {
    writeTermFile(project, makeTerm({ term: "Checkout", status: "deprecated" }))

    const content = await callTool(promoteStatus, {
      term: "Checkout",
      status: "active",
    })

    expect(content).toContain("status set to active")
    expect(readTerm("Checkout")?.status).toBe("active")
  })
})
