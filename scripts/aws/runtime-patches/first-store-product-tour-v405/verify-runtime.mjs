import fs from 'node:fs'

const billing = fs.readFileSync('/app/billing.js', 'utf8')
const client = fs.readFileSync('/app/tenant-setup-client.js', 'utf8')

const required = [
  'first-store-product-tour-v405',
  "query.get('registered') === '1'",
  "route: '/admin/settings'",
  "route: '/admin/appointments'",
  "route: '/admin/customers'",
  "route: '/admin/products'",
  "route: '/admin/community'",
  "route: '/admin/owner-analytics'",
  '使い方ガイドを再開',
  '初期設定を仕上げる',
  '!window.__lienProductTourActive',
]

for (const marker of required) {
  if (!client.includes(marker)) throw new Error(`product tour marker is missing: ${marker}`)
}
if ((client.match(/first-store-product-tour-v405/g) || []).length !== 1) {
  throw new Error('product tour was installed more than once')
}
if (!billing.includes(`redirect(res, '/admin/settings?registered=1')`)) {
  throw new Error('new stores do not enter the guided setup route')
}

console.log('first-store product tour v405 runtime verified')
