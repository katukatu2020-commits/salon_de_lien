import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = process.env.LIEN_RUNTIME_ROOT || path.dirname(fileURLToPath(import.meta.url))
const service = fs.readFileSync(path.join(root, 'wholesale-ordering-v543.js'), 'utf8')
const client = fs.readFileSync(path.join(root, 'wholesale-ordering-client-v543.js'), 'utf8')
const css = fs.readFileSync(path.join(root, 'wholesale-ordering-v543.css'), 'utf8')

for (const route of [
  '/api/admin/wholesale/contracts/code',
  '/api/dealer/contracts',
  '/api/dealer/products',
]) assert.ok(service.includes(route), `${route} is missing`)

assert.match(service, /payload\.confirmed !== true/)
assert.match(service, /WHERE "dealerId"=\$1 AND "active"=TRUE/)
assert.match(service, /WHERE "id"=\$1 AND "dealerId"=\$2/)
assert.match(client, /data-remove-confirm/)
assert.match(client, /target="_blank" rel="noopener"/)
assert.match(client, /item\.product\.source === 'DEALER'/)
const releaseCss = css.slice(css.indexOf('/* dealer-operations-v576 */'))
const letterSpacingValues = [...releaseCss.matchAll(/letter-spacing:\s*([^;}]+)/g)].map(match => match[1].trim())
assert.deepEqual(letterSpacingValues, ['0', '0'])

console.log(JSON.stringify({
  release:'dealer-operations-v576',
  sourceChecks:true,
  tenantScope:true,
  confirmedDeletion:true,
  catalogOrdering:true,
}))
