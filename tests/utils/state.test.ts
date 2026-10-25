import { describe, expect, test } from "bun:test"
import { active, provideState, setActive } from "../../plugins/openflow/utils/state"

describe("state", () => {
  test("provideState wires the accessor and the setter", () => {
    let value = false
    provideState(
      () => value,
      (next) => {
        value = Boolean(next)
        return value
      },
    )

    expect(active()).toBe(false)

    setActive(true)
    expect(active()).toBe(true)
    expect(value).toBe(true)

    setActive(false)
    expect(active()).toBe(false)
  })
})
