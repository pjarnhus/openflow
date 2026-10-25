import { expect, test } from "bun:test"
import * as path from "node:path"

// Runs in a child process so the module starts with no state from other tests.
test("getRootDir throws when initConfig did not receive a project directory", () => {
  const modulePath = path.resolve(
    import.meta.dir,
    "../../plugins/openflow/utils/config.ts",
  )
  const script = `
    import { getRootDir } from ${JSON.stringify(modulePath)}
    try {
      getRootDir()
      console.log("NO_THROW")
    } catch (error) {
      console.log("THREW:" + error.message)
    }
  `
  const result = Bun.spawnSync([process.execPath, "-e", script], {
    stdout: "pipe",
    stderr: "pipe",
  })
  const output = result.stdout.toString()

  expect(output).toContain("THREW:")
  expect(output).toContain("did not get a project directory")
})
