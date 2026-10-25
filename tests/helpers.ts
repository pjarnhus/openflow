import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import { slugify } from "../plugins/openflow/utils/helper"
import { initConfig, writeConfig } from "../plugins/openflow/utils/config"
import type { Term } from "../plugins/openflow/utils/term"

export const DEFAULT_CONFIG = {
  terms: {
    type: "file" as const,
    location: "docs/terms/",
    index: "docs/terms/_index.json",
  },
}

export interface TempProject {
  root: string
  termsDir: string
  indexPath: string
  configPath: string
  cleanup: () => void
}

/**
 * Creates a temporary project root and points the config module at it.
 * The context shape matches what the promise plugin receives in production:
 * `location.project.directory`.
 */
export function createTempProject(options: { withConfig?: boolean } = {}): TempProject {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "openflow-test-"))
  initConfig({ location: { project: { directory: root } } })

  const project: TempProject = {
    root,
    termsDir: path.join(root, "docs/terms/"),
    indexPath: path.join(root, "docs/terms/_index.json"),
    configPath: path.join(root, ".openflow.json"),
    cleanup: () => fs.rmSync(root, { recursive: true, force: true }),
  }

  if (options.withConfig !== false) writeConfig(DEFAULT_CONFIG)
  return project
}

export function makeTerm(overrides: Partial<Term> = {}): Term {
  return {
    term: "Checkout",
    status: "proposed",
    definition: "",
    implementation: "",
    aliases: [],
    related_terms: [],
    proposals: [],
    ...overrides,
  }
}

export function writeTermFile(project: TempProject, term: Term): void {
  fs.mkdirSync(project.termsDir, { recursive: true })
  const file = path.join(project.termsDir, `${slugify(term.term)}.json`)
  fs.writeFileSync(file, JSON.stringify(term, null, 2) + "\n")
}

export function readJson(file: string): unknown {
  return JSON.parse(fs.readFileSync(file, "utf8"))
}

export function today(): string {
  return new Date().toISOString().slice(0, 10)
}

type Executable = {
  execute: (input: never, context: never) => Promise<{ content?: unknown }>
}

/**
 * Calls a tool definition. Tools ignore the second argument; the plugin
 * runtime supplies it in production.
 */
export async function callTool(tool: Executable, input: unknown): Promise<string> {
  const result = await tool.execute(input as never, {} as never)
  return result.content as string
}

export function readDecisionLog(project: TempProject): Record<string, unknown>[] {
  const file = path.join(project.termsDir, "_decision_log.jsonl")
  return fs
    .readFileSync(file, "utf8")
    .trimEnd()
    .split("\n")
    .map((line) => JSON.parse(line) as Record<string, unknown>)
}
