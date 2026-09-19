export function serializeForAudit(obj: any) {
  if (!obj) return obj
  return JSON.parse(JSON.stringify(obj, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  ))
}
