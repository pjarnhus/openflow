import type { Plugin } from "@opencode/plugin/tui"
import { createSession } from "../utils/context"
import { nextSprintNumber } from "../utils/sprints"
import { loadTermDefinitions } from "../data_loaders/term_definitions"
import { loadSpecs } from "../data_loaders/specs"
import { active } from "../utils/state"

const USER_STORY_WRITER_AGENT = "User Story Writer"

function showError(ctx: Plugin.Context, error: unknown) {
  ctx.ui.toast.show({
    message: error instanceof Error ? error.message : String(error),
    variant: "error",
    duration: 3000,
  })
}

export function stories(ctx: Plugin.Context) {
  return {
    id: "openflow.stories",
    title: "Write Openflow user stories",
    group: "Openflow",
    slash: { name: "stories" },
    palette: true as const,
    enabled: () => active(),
    run: async () => {
      let termDefinitions: string
      try {
        termDefinitions = await loadTermDefinitions()
      } catch (error) {
        showError(ctx, error)
        return
      }

      let specs: string
      try {
        specs = await loadSpecs()
      } catch (error) {
        showError(ctx, error)
        return
      }

      const title = `User Stories - Sprint ${nextSprintNumber()}`
      const prompt = `${termDefinitions}\n\n${specs}\n`

      const session = await createSession(ctx, title, USER_STORY_WRITER_AGENT).catch(
        (error: unknown) => {
          showError(ctx, error)
          return undefined
        },
      )
      if (!session) return

      if (!ctx.ui.tabs.focus(session.id)) {
        ctx.ui.router.navigate({ type: "session", sessionID: session.id })
      }

      await ctx.client.session
        .prompt({
          sessionID: session.id,
          text: prompt,
        })
        .catch((error: unknown) => {
          showError(ctx, error)
        })
    },
  }
}
