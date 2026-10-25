import type { PluginContext } from "@opencode/plugin/tui"
import { active, setActive } from "../utils/state"


export function endOpenflow(ctx: PluginContext) {
    return {
        id: "openflow.end",
        title: "Exit openflow",
        group: "Openflow",
        slash: { name: "end_openflow" },
        palette: true,
        enabled: () => active(),
        run: () => {
            setActive(false)
            ctx.ui.toast.show({
                message: "openflow is inactive",
                variant: "info",
                duration: 3000,
            })
            return true
        },
    }
}
