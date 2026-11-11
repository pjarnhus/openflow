import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import * as fs from "node:fs"
import * as path from "node:path"
import type { Plugin } from "@opencode/plugin/tui"
import { stories } from "../../plugins/openflow/commands/stories"
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

describe("stories", () => {
  test("sends term definitions and specs to the writer", async () => {
    writeTermFile(
      project,
      makeTerm({ term: "Checkout", definition: "Paying for goods" }),
    )
    fs.writeFileSync(path.join(project.root, "docs", "specs.md"), "Spec content\n")
    const { context, created, prompted } = fakeContext()

    await stories(context).run()

    expect(created[0]).toMatchObject({
      agent: "User Story Writer",
      title: "User Stories - Sprint 1",
    })
    expect(prompted[0]).toEqual({
      sessionID: "ses_1",
      text:
        "## Checkout\n" +
        "definition: Paying for goods\n" +
        "aliases: (none)\n" +
        "related terms: (none)\n" +
        "\n" +
        "Spec content\n\n",
    })
  })

  test("uses the no-specs sentence when specs.md is missing", async () => {
    writeTermFile(
      project,
      makeTerm({ term: "Checkout", definition: "Paying for goods" }),
    )
    const { context, prompted } = fakeContext()

    await stories(context).run()

    expect(prompted[0]).toEqual({
      sessionID: "ses_1",
      text:
        "## Checkout\n" +
        "definition: Paying for goods\n" +
        "aliases: (none)\n" +
        "related terms: (none)\n" +
        "\nNo specs found\n",
    })
  })

  test("counts existing sprint directories in the title", async () => {
    const sprintsDir = path.join(project.root, "docs", "sprints")
    fs.mkdirSync(path.join(sprintsDir, "sprint_1"), { recursive: true })
    fs.mkdirSync(path.join(sprintsDir, "sprint_2"), { recursive: true })
    const { context, created } = fakeContext()

    await stories(context).run()

    expect(created[0]).toMatchObject({ title: "User Stories - Sprint 3" })
  })

  test("stops when term definitions cannot be loaded", async () => {
    fs.mkdirSync(project.termsDir, { recursive: true })
    fs.writeFileSync(path.join(project.termsDir, "broken.json"), "{")
    const { context, toasts, created, prompted } = fakeContext()

    await stories(context).run()

    expect(created).toHaveLength(0)
    expect(prompted).toHaveLength(0)
    expect(toasts[0]).toMatchObject({ variant: "error" })
  })

  test("keeps the session when the prompt fails", async () => {
    const { context, toasts, created, prompted } = fakeContext({
      promptError: new Error("prompt failed"),
    })

    await stories(context).run()

    expect(created).toHaveLength(1)
    expect(prompted).toHaveLength(1)
    expect(toasts[0]).toMatchObject({
      message: "prompt failed",
      variant: "error",
    })
  })
})
