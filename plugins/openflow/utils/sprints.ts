import * as fs from "node:fs"
import * as path from "node:path"
import { getRootDir } from "./config"

/**
 * Returns the number of the next sprint: one more than the number of
 * directories in `docs/sprints`, or 1 when the directory does not exist.
 */
export function nextSprintNumber() {
  const sprintsDir = path.join(getRootDir(), "docs", "sprints")
  return fs.existsSync(sprintsDir)
    ? fs
        .readdirSync(sprintsDir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory()).length + 1
    : 1
}
