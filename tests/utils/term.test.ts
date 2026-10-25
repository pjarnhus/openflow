import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import * as fs from "node:fs"
import * as path from "node:path"
import {
  appendDecisionLog,
  applyField,
  getIndexFile,
  getTermsDir,
  nextProposalId,
  readTerm,
  regenerate,
  writeTerm,
} from "../../plugins/openflow/utils/term"
import {
  createTempProject,
  makeTerm,
  readJson,
  today,
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

describe("paths", () => {
  test("getTermsDir joins the project root and the configured location", () => {
    expect(getTermsDir()).toBe(project.termsDir)
  })

  test("getIndexFile joins the project root and the configured index", () => {
    expect(getIndexFile()).toBe(project.indexPath)
  })
})

describe("readTerm and writeTerm", () => {
  test("readTerm returns null when the term file is missing", () => {
    expect(readTerm("Checkout")).toBeNull()
  })

  test("writeTerm creates the directory and a slugified file", () => {
    writeTerm(makeTerm({ term: "User Story", definition: "A need" }))

    const file = path.join(project.termsDir, "user_story.json")
    expect(fs.existsSync(file)).toBe(true)
    expect(readTerm("User Story")).toEqual(
      makeTerm({ term: "User Story", definition: "A need" }),
    )
  })
})

describe("applyField", () => {
  test("creates a new term with status proposed", () => {
    const message = applyField("Checkout", "definition", "Paying for goods", false)

    expect(message).toBe('OK: set "Checkout.definition". Status: proposed.')
    expect(readTerm("Checkout")).toMatchObject({
      term: "Checkout",
      status: "proposed",
      definition: "Paying for goods",
    })
  })

  test("is a no-op when the value is already set", () => {
    applyField("Checkout", "definition", "Paying for goods", false)
    const message = applyField("Checkout", "definition", "Paying for goods", false)

    expect(message).toBe(
      'OK: "Checkout.definition" unchanged (value already set, no-op).',
    )
  })

  test("rejects a different value without force", () => {
    applyField("Checkout", "definition", "Old value", false)
    const message = applyField("Checkout", "definition", "New value", false)

    expect(message).toStartWith("ERROR:")
    expect(message).toContain("Current value:\nOld value")
    expect(message).toContain("Proposed value:\nNew value")
    expect(readTerm("Checkout")?.definition).toBe("Old value")
  })

  test("overwrites with force and archives the old value", () => {
    applyField("Checkout", "definition", "Old value", false)
    const message = applyField("Checkout", "definition", "New value", true)
    const term = readTerm("Checkout")

    expect(message).toBe(
      'OK: set "Checkout.definition" (forced; previous value archived in proposals). Status: proposed.',
    )
    expect(term?.definition).toBe("New value")
    expect(term?.proposals).toHaveLength(1)
    expect(term?.proposals[0]).toMatchObject({
      field: "definition",
      value: "Old value",
      proposed_by: "system",
    })
  })

  test("rejects changes to a deprecated term", () => {
    writeTermFile(project, makeTerm({ status: "deprecated" }))
    const message = applyField("Checkout", "definition", "New value", false)

    expect(message).toStartWith("ERROR:")
    expect(message).toContain("is deprecated")
  })
})

describe("nextProposalId", () => {
  test("numbers proposals from one", () => {
    expect(nextProposalId(makeTerm())).toBe(`${new Date().getFullYear()}-001`)
  })

  test("continues the sequence", () => {
    const term = makeTerm({
      proposals: [
        {
          id: "x",
          field: "definition",
          value: "a",
          proposed_by: "a",
          reason: "r",
          date: "2026-01-01",
        },
        {
          id: "y",
          field: "definition",
          value: "b",
          proposed_by: "b",
          reason: "r",
          date: "2026-01-01",
        },
      ],
    })

    expect(nextProposalId(term)).toBe(`${new Date().getFullYear()}-003`)
  })
})

describe("appendDecisionLog", () => {
  test("appends one JSON object per line", () => {
    appendDecisionLog({ term: "Checkout", decision: "accepted" })
    appendDecisionLog({ term: "Cart", decision: "rejected" })

    const file = path.join(project.termsDir, "_decision_log.jsonl")
    const lines = fs.readFileSync(file, "utf8").trimEnd().split("\n")

    expect(lines).toHaveLength(2)
    expect(JSON.parse(lines[0])).toMatchObject({
      term: "Checkout",
      decision: "accepted",
    })
    expect(JSON.parse(lines[0]).date).toStartWith(today())
  })
})

describe("regenerate", () => {
  test("reports when there is no terms directory", () => {
    expect(regenerate()).toBe("No terms directory yet.")
  })

  test("writes the index and counts open proposals", () => {
    writeTermFile(
      project,
      makeTerm({
        term: "Checkout",
        aliases: ["pay"],
        proposals: [
          {
            id: "1",
            field: "definition",
            value: "a",
            proposed_by: "a",
            reason: "r",
            date: "2026-01-01",
          },
          {
            id: "2",
            field: "definition",
            value: "b",
            proposed_by: "b",
            reason: "r",
            date: "2026-01-01",
            resolved: "accepted",
          },
        ],
      }),
    )

    expect(regenerate()).toBe("OK: index regenerated with 1 terms.")
    expect(readJson(project.indexPath)).toEqual([
      {
        term: "Checkout",
        status: "proposed",
        aliases: ["pay"],
        open_proposals: 1,
      },
    ])
  })

  test("skips index and decision log files", () => {
    writeTermFile(project, makeTerm({ term: "Checkout" }))
    writeTermFile(project, makeTerm({ term: "Cart" }))
    fs.writeFileSync(path.join(project.termsDir, "_index.json"), "[]")

    regenerate()

    expect(readJson(project.indexPath)).toHaveLength(2)
  })
})
