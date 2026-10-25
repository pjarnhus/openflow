import { describe, expect, mock, test } from "bun:test"
import type { Plugin } from "@opencode/plugin/tui"

// tui.ts calls Plugin.define at import time. Replace the SDK entry point so
// the test does not load the full TUI runtime.
mock.module("@opencode/plugin/tui", () => ({
  Plugin: { define: (definition: unknown) => definition },
}))

const { default: openflowTui } = await import("../plugins/openflow/tui")

interface Layer {
  commands?: { id?: string }[]
}

function fakeContext() {
  let layer: Layer | undefined
  const context = {
    location: undefined,
    keymap: {
      layer: (factory: () => Layer) => {
        layer = factory()
      },
    },
    ui: { toast: { show: () => {} } },
  }
  return { context: context as unknown as Plugin.Context, getLayer: () => layer }
}

describe("openflow tui plugin", () => {
  test("uses the expected plugin id", () => {
    expect(openflowTui.id).toBe("openflow.cli")
  })

  test("registers the start and end commands in a global layer", () => {
    const { context, getLayer } = fakeContext()

    openflowTui.setup(context)

    const ids = (getLayer()?.commands ?? []).map((command) => command.id)
    expect(ids).toEqual(["openflow.start", "openflow.end"])
  })
})
