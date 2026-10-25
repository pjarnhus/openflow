import { describe, expect, test } from "bun:test"
import { err, isRecord, pick, slugify } from "../../plugins/openflow/utils/helper"

describe("slugify", () => {
  test("trims and lowercases", () => {
    expect(slugify("  Checkout ")).toBe("checkout")
  })

  test("replaces runs of non-alphanumeric characters", () => {
    expect(slugify("User Story")).toBe("user_story")
    expect(slugify("C++")).toBe("c")
  })

  test("strips leading and trailing separators", () => {
    expect(slugify("--A--B--")).toBe("a_b")
  })

  test("returns an empty string for an empty input", () => {
    expect(slugify("   ")).toBe("")
  })
})

describe("err", () => {
  test("prefixes the message", () => {
    expect(err("boom")).toBe("ERROR: boom")
  })
})

describe("isRecord", () => {
  test("accepts objects and arrays", () => {
    expect(isRecord({})).toBe(true)
    expect(isRecord([])).toBe(true)
  })

  test("rejects primitives and null", () => {
    expect(isRecord(null)).toBe(false)
    expect(isRecord("x")).toBe(false)
    expect(isRecord(1)).toBe(false)
  })
})

describe("pick", () => {
  const value = { a: { b: { c: 42 } }, list: [{ d: 1 }] }

  test("reads a nested value", () => {
    expect(pick(value, ["a", "b", "c"])).toBe(42)
  })

  test("returns undefined for a missing key", () => {
    expect(pick(value, ["a", "x", "c"])).toBeUndefined()
  })

  test("returns undefined when an intermediate value is not an object", () => {
    expect(pick({ a: "x" }, ["a", "b"])).toBeUndefined()
  })

  test("returns the value for an empty path", () => {
    expect(pick(value, [])).toBe(value)
  })
})
