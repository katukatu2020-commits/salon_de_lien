import fs from 'node:fs'
import vm from 'node:vm'

const service = fs.readFileSync('/app/customer-store-staff-v276.js', 'utf8')
const adminClient = fs.readFileSync('/app/commercial-admin-v101.js', 'utf8')

for (const marker of [
  'async function sendStoreIcon(res, organizationId)',
  'async function adminStoreIcon(req, res)',
  'const session = await currentStaff(req)',
  "url.pathname === '/api/admin/store-icon' && req.method === 'GET'",
  'iconUrl: `/api/admin/store-icon?v=${Date.now()}`',
]) {
  if (!service.includes(marker)) throw new Error(`service marker missing: ${marker}`)
}

if (!adminClient.includes('<img src="/api/admin/store-icon?v=${Date.now()}"')) {
  throw new Error('admin settings preview is not using the staff-scoped endpoint')
}
if (adminClient.includes('<img src="/api/lien-store-icon?v=${Date.now()}"')) {
  throw new Error('admin settings preview still uses the audience-ambiguous endpoint')
}
if (!service.includes('WHERE "id"=$1 LIMIT 1\', organizationId')) {
  throw new Error('organization-scoped icon lookup is missing')
}
if (!service.includes('private/store-icons/${session.organizationId}/')) {
  throw new Error('organization-scoped S3 key is missing')
}
if (!service.includes("WHERE \"id\"=$2', objectKey, session.organizationId")) {
  throw new Error('organization-scoped icon update is missing')
}

new vm.Script(service)
new vm.Script(adminClient)
console.log('store icon tenant isolation v397 verified')
