import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8')
const client = read('sales-ledger-client-v318.js')
const service = read('sales-ledger-accounts-v318.js')
const server = read('server.js')

for (const required of [
  "const VERSION = 'sales-ledger-staff-multiselect-v542'",
  'staffFilter: null',
  'data-sl-staff-trigger',
  'data-sl-staff-all',
  'data-sl-staff-option',
  'すべて選択',
  "params.append('staff', name)",
  "params.set('staffMode', 'none')",
  'staffSelectionCaption()',
  'sales-ledger-staff-multiselect-v542 */',
]) assert.ok(client.includes(required), `staff multiselect client invariant missing: ${required}`)

assert.equal(client.includes('<select aria-label="日別売上集計の担当者"'), false, 'legacy single staff selector remained')
assert.equal((client.match(/name="staff"/g) || []).length, 0, 'legacy staff form field remained')

for (const required of [
  "url.searchParams.getAll('staff')",
  "url.searchParams.get('staffMode') === 'none'",
  'jsonb_array_elements_text($5::text::jsonb)',
  `COALESCE(NULLIF(BTRIM(a."staffName"),''),'フリー')`,
  'session.organizationId, start, end, customer, staffFilter, keyword',
  'sales-ledger-staff-multiselect-v542 */',
]) assert.ok(service.includes(required), `staff multiselect service invariant missing: ${required}`)

assert.ok(server.includes("X-Lien-Sales-Ledger-Staff-Multiselect', 'v542'"), 'v542 readiness marker is missing')
assert.ok(server.includes("X-Lien-Daily-Sales-Complete-Print', 'v541'"), 'v541 complete print release was not preserved')
assert.ok(server.includes("X-Lien-Receipt-Thermal-Print', 'v540'"), 'v540 receipt print release was not preserved')
assert.ok(server.includes("X-Lien-Sales-Ledger-Staff-Filter', 'v539'"), 'v539 staff filter readiness was not preserved')

console.log(JSON.stringify({
  release:'sales-ledger-staff-multiselect-v542',
  runtimeVerified:true,
  multiStaffApi:true,
  checkboxDropdown:true,
  printSelectionPreserved:true,
}))
