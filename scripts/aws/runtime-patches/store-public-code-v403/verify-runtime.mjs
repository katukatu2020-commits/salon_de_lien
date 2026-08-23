import fs from 'node:fs'
import { execFileSync } from 'node:child_process'

for (const file of ['/app/billing.js', '/app/customer-links-v293.js', '/app/ui-workflows-v294.js']) {
  execFileSync(process.execPath, ['--check', file], { stdio: 'inherit' })
}

const billing = fs.readFileSync('/app/billing.js', 'utf8')
const customerLinks = fs.readFileSync('/app/customer-links-v293.js', 'utf8')
const workflows = fs.readFileSync('/app/ui-workflows-v294.js', 'utf8')
const server = fs.readFileSync('/app/server.js', 'utf8')
const profileChunk = fs.readFileSync('/app/.next/static/chunks/app/u/(account)/profile/page-profile-code-v267.js', 'utf8')

if (!billing.includes(`const publicCode = 'STORE-' + crypto.createHash('md5').update(organizationId).digest('hex').slice(0, 8).toUpperCase()`)) {
  throw new Error('store registration does not generate a public code')
}
if (!billing.includes('("id","slug","name","publicCode","createdAt","updatedAt") VALUES ($1,$2,$3,$4,NOW(),NOW())')) {
  throw new Error('store registration does not persist the public code')
}
if ((customerLinks.match(/WHERE "id"=\$1 AND "publicCode" IS NULL/g) || []).length !== 2) {
  throw new Error('store QR endpoints are not self healing')
}
if (workflows.includes('data-lien-store-identity-v402')) {
  throw new Error('duplicate v402 settings card remains')
}
if (!profileChunk.includes('data-lien-profile-image-runtime="401"')) {
  throw new Error('v401 profile image runtime was lost')
}
if (!server.includes('LEFT JOIN "CustomerStoreLink" l ON l."appUserId"=u."id"')) {
  throw new Error('v400 customer store session isolation was lost')
}

console.log('store public code v403 verified')
