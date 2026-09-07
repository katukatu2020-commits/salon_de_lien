import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = process.env.LIEN_RUNTIME_ROOT || path.dirname(fileURLToPath(import.meta.url))
const service = fs.readFileSync(path.join(root, 'wholesale-ordering-v543.js'), 'utf8')
const client = fs.readFileSync(path.join(root, 'wholesale-ordering-client-v543.js'), 'utf8')
const css = fs.readFileSync(path.join(root, 'wholesale-ordering-v543.css'), 'utf8')

assert.match(service, /UNIQUE\("contractId", "dealerProductId"\)/)
assert.match(service, /CHECK \("discountRate" BETWEEN 0 AND 100\)/)
assert.match(service, /SELECT "id" FROM "WholesaleDealerContract" WHERE "id"=\$1 AND "dealerId"=\$2 AND "status"=.*ACTIVE/)
assert.match(service, /p\."dealerId"=\$2/)
assert.match(service, /"listPrice","discountRate","unitPrice"/)
assert.doesNotMatch(service, /"wholesalePrice"=\$5,"updatedAt"=NOW\(\) WHERE "id"=\$1 AND "dealerId"=\$2/)
assert.match(client, /return salon\.data\.catalogProducts \|\| \[\]/)
assert.doesNotMatch(client, /return local\.concat\(catalog\)/)
assert.match(client, /dealer\.view === 'pricing' \? dealerPricing\(\)/)
assert.match(client, /selectedOrder\(\)\.map\(function \(item\) \{ return \{ dealerProductId:item\.product\.dealerProductId/)
assert.match(css, /grid-template-columns: repeat\(4, 1fr\)/)

console.log(JSON.stringify({
  release:'dealer-contract-pricing-v581',
  sourceChecks:true,
  tenantScope:true,
  configuredOnly:true,
  serverCalculatedPricing:true,
  historicalSnapshots:true,
}))
