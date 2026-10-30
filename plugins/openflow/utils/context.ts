import type { Plugin } from "@opencode/plugin/tui"

export async function createSession(
  ctx: Plugin.Context,
  title: string,
  agent?: string,
) {
  // Get the location of the current session
  const location = ctx.location ?? ctx.data.location.default()

  // Create new session
  const session = await ctx.client.session.create({
    location: location,
    title: title,
    ...(agent === undefined ? {} : { agent }),
  })
  // Ensure that the context data contains the new session
  await ctx.data.session.sync(session.id)
  return session
}
