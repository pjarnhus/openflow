import { describe, expect, test } from "bun:test"
import type { Plugin } from "@opencode/plugin/tui"
import { createSession } from "../../plugins/openflow/utils/context"

function fakeContext(location: unknown) {
  const created: unknown[] = []
  const synced: string[] = []
  const context = {
    location,
    client: {
      session: {
        create: async (input: unknown) => {
          created.push(input)
          return { id: "ses_1" }
        },
      },
    },
    data: {
      location: { default: () => ({ directory: "/default" }) },
      session: {
        sync: async (id: string) => {
          synced.push(id)
        },
      },
    },
  }
  return { context: context as unknown as Plugin.Context, created, synced }
}

describe("createSession", () => {
  test("uses the current location when it is set", async () => {
    const { context, created, synced } = fakeContext({ directory: "/work" })

    const session = await createSession(context, "Sprint")

    expect(session.id).toBe("ses_1")
    expect(created[0]).toEqual({
      location: { directory: "/work" },
      title: "Sprint",
    })
    expect(synced).toEqual(["ses_1"])
  })

  test("falls back to the default location", async () => {
    const { context, created } = fakeContext(undefined)

    await createSession(context, "Sprint")

    expect(created[0]).toEqual({
      location: { directory: "/default" },
      title: "Sprint",
    })
  })

  test("passes the agent when it is set", async () => {
    const { context, created } = fakeContext({ directory: "/work" })

    await createSession(context, "Sprint", "Requirement Analyst")

    expect(created[0]).toEqual({
      location: { directory: "/work" },
      title: "Sprint",
      agent: "Requirement Analyst",
    })
  })
})
