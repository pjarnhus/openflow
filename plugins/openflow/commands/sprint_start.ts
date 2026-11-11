import type { Plugin } from "@opencode/plugin/tui"
import { createSession } from "../utils/context"
import { nextSprintNumber } from "../utils/sprints"
import { loadTermDefinitions } from "../data_loaders/term_definitions"
import { active } from "../utils/state"

const REQUIREMENT_ANALYST_AGENT = "Requirement Analyst"
const MAX_TITLE_GOAL_LENGTH = 60

function showError(ctx: Plugin.Context, error: unknown) {
  ctx.ui.toast.show({
    message: error instanceof Error ? error.message : String(error),
    variant: "error",
    duration: 3000,
  })
}

function truncateGoal(goal: string) {
  if (goal.length <= MAX_TITLE_GOAL_LENGTH) return goal
  return `${goal.slice(0, MAX_TITLE_GOAL_LENGTH - 3)}...`
}

export function sprintStart(ctx: Plugin.Context) {
  return {
    id: "openflow.startSprint",
    title: "Start Openflow sprint",
    group: "Openflow",
    slash: { name: "sprint_start", arguments: true as const },
    palette: true as const,
    enabled: () => active(),
    run: async (input?: string) => {
      const goal = input?.trim()
      if (!goal) {
        ctx.ui.toast.show({
          message: "A sprint goal is required",
          variant: "error",
          duration: 3000,
        })
        return
      }

      let termDefinitions: string
      try {
        termDefinitions = await loadTermDefinitions()
      } catch (error) {
        showError(ctx, error)
        return
      }

      const title = `Sprint ${nextSprintNumber()} - ${truncateGoal(goal)}`
      const prompt = `${termDefinitions}\n\n## Sprint Goal\n${goal}\n`

      const session = await createSession(ctx, title, REQUIREMENT_ANALYST_AGENT).catch(
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
