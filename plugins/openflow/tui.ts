import { Plugin } from "@opencode/plugin/tui"
import { createSignal } from "solid-js"

import {
  initConfig,
  getRootDir,
  getConfig,
  configExists,
  writeConfig,
} from "./utils/config"
import type { OpenflowConfig } from "./utils/config"
import { active, setActive, provideState } from "./utils/state"
import { endOpenflow } from "./commands/end"

export default Plugin.define({
  id: "openflow.cli",
  setup(context) {
    provideState(...createSignal(false))

    context.keymap.layer(() => ({
      mode: "global",
      commands: [
        {
          id: "openflow.start",
          title: "Start openflow",
          group: "Openflow",
          slash: { name: "openflow" },
          palette: true,
          enabled: () => !active(),
          run: async () => {
            // Set project root directory
            let root: string
            try {
              initConfig(context)
              root = getRootDir()
            } catch (e) {
              context.ui.toast.show({
                message: e instanceof Error ? e.message : String(e),
                variant: "error",
                duration: 3000,
              })
              return
            }

            // Check if an openflow config file exists
            if (configExists()) {
              // Parse the existing config so a malformed file stops the start
              try {
                getConfig()
              } catch (e) {
                context.ui.toast.show({
                  message: e instanceof Error ? e.message : String(e),
                  variant: "error",
                  duration: 3000,
                })
                return
              }
            } else {
              // Ask the user which config to create
              const kind = await context.ui.dialog.select({
                title: "Openflow configuration",
                options: [
                  { title: "Standard", value: "standard" },
                  { title: "Custom", value: "custom" },
                ],
              })
              if (kind === undefined) {
                context.ui.toast.show({
                  message: "Configuration cancelled",
                  variant: "warning",
                  duration: 3000,
                })
                return
              }

              let config: OpenflowConfig
              if (kind === "standard") {
                config = {
                  terms: {
                    type: "file",
                    location: "docs/terms/",
                    index: "docs/terms/_index.json",
                  },
                }
              } else {
                const location = await context.ui.dialog.prompt({
                  title: "Terms directory",
                  placeholder: "docs/terms/",
                })
                if (location === undefined || location.trim() === "") {
                  context.ui.toast.show({
                    message:
                      location === undefined
                        ? "Configuration cancelled"
                        : "Terms directory is required",
                    variant: location === undefined ? "warning" : "error",
                    duration: 3000,
                  })
                  return
                }

                const index = await context.ui.dialog.prompt({
                  title: "Terms index",
                  placeholder: "docs/terms/_index.json",
                })
                if (index === undefined || index.trim() === "") {
                  context.ui.toast.show({
                    message:
                      index === undefined
                        ? "Configuration cancelled"
                        : "Terms index is required",
                    variant: index === undefined ? "warning" : "error",
                    duration: 3000,
                  })
                  return
                }

                config = {
                  terms: {
                    type: "file",
                    location: location.trim(),
                    index: index.trim(),
                  },
                }
              }

              try {
                writeConfig(config)
              } catch (e) {
                context.ui.toast.show({
                  message: e instanceof Error ? e.message : String(e),
                  variant: "error",
                  duration: 3000,
                })
                return
              }
            }

            // Signal success to the user
            setActive(true)
            context.ui.toast.show({
              message: `openflow is active in ${root}`,
              variant: "success",
              duration: 3000,
            })
          },
        },
        endOpenflow(context),
      ],
    }))
  },
})
