'use strict'

const fields = Object.freeze({ title: 160, stylistName: 100, stylistKana: 100, stylistRole: 160, stylistComment: 4000, menuDescription: 2000 })
function normalizeMetadata(input) {
  const result = {}
  for (const [key, limit] of Object.entries(fields)) {
    const value = String(input?.[key] || '').trim()
    if (value.length > limit) throw Object.assign(new Error(`${key}は${limit}文字以内にしてください。`), { status: 400 })
    result[key] = value
  }
  return result
}
module.exports = { fields, normalizeMetadata }
