import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import * as fs from "node:fs"
import * as path from "node:path"
import type { Plugin } from "@opencode/plugin/tui"
import { sprintStart } from "../../plugins/openflow/commands/sprint_start"
import {
  createTempProject,
  makeTerm,
  writeTermFile,
  type TempProject,
} from "../helpers"

type Toast = { message: string; variant?: string }

function fakeContext(options: { promptError?: Error } = {}) {
  const toasts: Toast[] = []
  const created: unknown[] = []
  const prompted: unknown[] = []

  const context = {
    location: { directory: "/work" },
    client: {
      session: {
        create: async (input: unknown) => {
          created.push(input)
          return { id: "ses_1" }
        },
        prompt: async (input: unknown) => {
          prompted.push(input)
          if (options.promptError) throw options.promptError
          return {}
        },
      },
    },
    data: {
      location: { default: () => ({ directory: "/default" }) },
      session: { sync: async () => {} },
    },
    ui: {
      toast: { show: (toast: Toast) => toasts.push(toast) },
      tabs: { focus: () => true },
      router: { navigate: () => {} },
    },
  }

  return {
    context: context as unknown as Plugin.Context,
    toasts,
    created,
    prompted,
  }
}

let project: TempProject

beforeEach(() => {
  project = createTempProject()
})

afterEach(() => {
  project.cleanup()
})

describe("sprintStart", () => {
  test("sends term definitions and the sprint goal to the analyst", async () => {
    writeTermFile(
      project,
      makeTerm({ term: "Checkout", definition: "Paying for goods" }),
    )
    const { context, created, prompted } = fakeContext()

    await sprintStart(context).run("  Build the checkout  ")

    expect(created[0]).toMatchObject({
      agent: "Requirement Analyst",
      title: "Sprint 1 - Build the checkout",
    })
    expect(prompted[0]).toEqual({
      sessionID: "ses_1",
      text:
        "## Checkout\n" +
        "definition: Paying for goods\n" +
        "aliases: (none)\n" +
        "related terms: (none)\n" +
        "\n## Sprint Goal\n" +
        "Build the checkout\n",
    })
  })

  test("uses the no-terms sentence when the glossary is empty", async () => {
    const { context, prompted } = fakeContext()

    await sprintStart(context).run("Goal")

    expect(prompted[0]).toEqual({
      sessionID: "ses_1",
      text: "No Terms defined.\n\n## Sprint Goal\nGoal\n",
    })
  })

  test("rejects empty input", async () => {
    const { context, toasts, created, prompted } = fakeContext()

    await sprintStart(context).run("   ")

    expect(created).toHaveLength(0)
    expect(prompted).toHaveLength(0)
    expect(toasts[0]).toMatchObject({
      message: "A sprint goal is required",
      variant: "error",
    })
  })

  test("stops when term definitions cannot be loaded", async () => {
    fs.mkdirSync(project.termsDir, { recursive: true })
    fs.writeFileSync(path.join(project.termsDir, "broken.json"), "{")
    const { context, toasts, created, prompted } = fakeContext()

    await sprintStart(context).run("Goal")

    expect(created).toHaveLength(0)
    expect(prompted).toHaveLength(0)
    expect(toasts[0]).toMatchObject({ variant: "error" })
  })

  test("keeps the session when the prompt fails", async () => {
    const { context, toasts, created, prompted } = fakeContext({
      promptError: new Error("prompt failed"),
    })

    await sprintStart(context).run("Goal")

    expect(created).toHaveLength(1)
    expect(prompted).toHaveLength(1)
    expect(toasts[0]).toMatchObject({
      message: "prompt failed",
      variant: "error",
    })
  })

  test("truncates long goals in the title only", async () => {
    const goal = "a".repeat(70)
    const { context, created, prompted } = fakeContext()

    await sprintStart(context).run(goal)

    expect(created[0]).toMatchObject({
      title: `Sprint 1 - ${"a".repeat(57)}...`,
    })
    expect(prompted[0]).toMatchObject({
      text: `No Terms defined.\n\n## Sprint Goal\n${goal}\n`,
    })
  })
})
