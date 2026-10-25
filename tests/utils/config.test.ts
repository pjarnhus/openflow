import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import * as fs from "node:fs"
import * as path from "node:path"
import {
  CONFIG_FILE,
  configExists,
  getConfig,
  getConfigPath,
  getRootDir,
  initConfig,
  writeConfig,
} from "../../plugins/openflow/utils/config"
import { DEFAULT_CONFIG, createTempProject, type TempProject } from "../helpers"

let project: TempProject

beforeEach(() => {
  project = createTempProject({ withConfig: false })
})

afterEach(() => {
  project.cleanup()
})

describe("initConfig", () => {
  test("reads the project directory from location.project.directory", () => {
    expect(getRootDir()).toBe(project.root)
  })

  test("ignores a context without a project directory", () => {
    initConfig({})
    expect(getRootDir()).toBe(project.root)

    initConfig(undefined)
    expect(getRootDir()).toBe(project.root)

    initConfig({ location: "/tmp/not-a-project" })
    expect(getRootDir()).toBe(project.root)
  })
})

describe("getConfigPath", () => {
  test("joins the project root and the config file name", () => {
    expect(getConfigPath()).toBe(path.join(project.root, CONFIG_FILE))
    expect(getConfigPath()).toBe(project.configPath)
  })
})

describe("configExists", () => {
  test("reports whether the config file is present", () => {
    expect(configExists()).toBe(false)
    writeConfig(DEFAULT_CONFIG)
    expect(configExists()).toBe(true)
  })
})

describe("writeConfig", () => {
  test("writes formatted JSON with a trailing newline", () => {
    writeConfig(DEFAULT_CONFIG)
    const raw = fs.readFileSync(project.configPath, "utf8")
    expect(raw.endsWith("\n")).toBe(true)
    expect(JSON.parse(raw)).toEqual(DEFAULT_CONFIG)
  })
})

describe("getConfig", () => {
  test("round-trips the written config", () => {
    writeConfig(DEFAULT_CONFIG)
    expect(getConfig()).toEqual(DEFAULT_CONFIG)
  })

  test("throws when the config file is missing", () => {
    expect(() => getConfig()).toThrow("No config at")
  })
})
