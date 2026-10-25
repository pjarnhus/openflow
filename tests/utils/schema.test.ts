import { describe, expect, test } from "bun:test"
import {
  boolOpt,
  enumSchema,
  objSchema,
  str,
} from "../../plugins/openflow/utils/schema"

describe("str", () => {
  test("describes a string", () => {
    expect(str("A name")).toEqual({ type: "string", description: "A name" })
  })
})

describe("boolOpt", () => {
  test("describes an optional boolean with a default", () => {
    expect(boolOpt("Force it")).toEqual({
      type: "boolean",
      default: false,
      description: "Force it",
    })
  })
})

describe("enumSchema", () => {
  test("describes an enum", () => {
    expect(enumSchema(["a", "b"], "Pick one")).toEqual({
      type: "string",
      enum: ["a", "b"],
      description: "Pick one",
    })
  })
})

describe("objSchema", () => {
  test("builds a closed object schema", () => {
    expect(objSchema({ name: str("Name") }, ["name"])).toEqual({
      type: "object",
      properties: { name: { type: "string", description: "Name" } },
      required: ["name"],
      additionalProperties: false,
    })
  })
})
