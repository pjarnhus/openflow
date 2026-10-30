import * as fs from "node:fs"
import * as path from "node:path"
import { getRootDir } from "../utils/config"

export async function loadUserStories() {
  const no_user_stories_response: string = "No user stories found"
  const dir = path.join(getRootDir(), "docs", "user_stories")
  if (!fs.existsSync(dir)) return no_user_stories_response
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .sort()
  const hits: string[] = []
  for (const f of files) {
    const story = fs.readFileSync(path.join(dir, f), "utf8")
    hits.push(`## User story: ${f}\n${story}`)
  }
  if (hits.length > 0) return hits.join("\n")
  return no_user_stories_response
}
