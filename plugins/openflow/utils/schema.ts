import type { Info } from "@opencode/plugin/promise/tool"

type Schema = Info["input"]

export function str(description: string): Schema {
  return { type: "string", description }
}

export function boolOpt(description: string): Schema {
  return { type: "boolean", default: false, description }
}

export function enumSchema(values: string[], description: string): Schema {
  return { type: "string", enum: values, description }
}

export function objSchema(
  properties: Record<string, Schema>,
  required: string[],
): Schema {
  return { type: "object", properties, required, additionalProperties: false }
}

export type ToolDefinition = Info
