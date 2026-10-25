import { describe, expect, test } from "bun:test"
import type { Plugin } from "@opencode/plugin/tui"
import { endOpenflow } from "../../plugins/openflow/commands/end"
import { provideState } from "../../plugins/openflow/utils/state"

function fakeContext() {
  const toasts: { message: string; variant?: string }[] = []
  const context = {
    ui: {
      toast: {
        show: (options: { message: string; variant?: string }) => toasts.push(options),
      },
    },
  }
  return { context: context as unknown as Plugin.Context, toasts }
}

describe("endOpenflow", () => {
  test("describes the command", () => {
    const { context } = fakeContext()
    const command = endOpenflow(context)

    expect(command.id).toBe("openflow.end")
    expect(command.title).toBe("Exit openflow")
    expect(command.slash).toEqual({ name: "end_openflow" })
  })

  test("is enabled only while openflow is active", () => {
    const { context } = fakeContext()
    let active = true
    provideState(
      () => active,
      (next) => {
        active = Boolean(next)
        return active
      },
    )

    const command = endOpenflow(context)
    const enabled =
      typeof command.enabled === "function" ? command.enabled() : command.enabled
    expect(enabled).toBe(true)
  })

  test("deactivates openflow and shows a toast", async () => {
    const { context, toasts } = fakeContext()
    let active = true
    provideState(
      () => active,
      (next) => {
        active = Boolean(next)
        return active
      },
    )

    const command = endOpenflow(context)
    await command.run()

    expect(active).toBe(false)
    expect(toasts).toHaveLength(1)
    expect(toasts[0]).toMatchObject({
      message: "openflow is inactive",
      variant: "info",
    })
  })
})
