import * as fs from "node:fs"
import * as path from "node:path"
import { getRootDir } from "../utils/config"

export async function loadSpecs() {
  const no_specs_response: string = "No specs found"
  const file = path.join(getRootDir(), "docs", "specs.md")
  if (!fs.existsSync(file)) return no_specs_response
  const specs = fs.readFileSync(file, "utf8")
  if (specs.trim() === "") return no_specs_response
  return specs
}
