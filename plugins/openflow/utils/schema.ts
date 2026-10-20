export function str(description: string): object {
  return { type: "string", description }
}

export function boolOpt(description: string): object {
  return { type: "boolean", default: false, description }
}

export function enumSchema(values: string[], description: string): object {
  return { type: "string", enum: values, description }
}

export function objSchema(properties: Record<string, object>, required: string[]): object {
  return { type: "object", properties, required, additionalProperties: false }
}


