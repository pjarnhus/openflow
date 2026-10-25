import type { Plugin } from "@opencode/plugin/tui"
import { active, setActive } from "../utils/state"

export function endOpenflow(ctx: Plugin.Context) {
  return {
    id: "openflow.end",
    title: "Exit openflow",
    group: "Openflow",
    slash: { name: "end_openflow" },
    palette: true as const,
    enabled: () => active(),
    run: () => {
      setActive(false)
      ctx.ui.toast.show({
        message: "openflow is inactive",
        variant: "info",
        duration: 3000,
      })
    },
  }
}
