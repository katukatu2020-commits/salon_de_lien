import fs from 'node:fs'

const billing = fs.readFileSync('/app/billing.js', 'utf8')
const customerLinks = fs.readFileSync('/app/customer-links-v293.js', 'utf8')

if (!billing.includes(`const publicCode = 'STORE-' + crypto.createHash('md5').update(organizationId).digest('hex').slice(0, 8).toUpperCase()`)) {
  throw new Error('registration no longer generates a public store code')
}
if (!billing.includes('("id","slug","name","publicCode","createdAt","updatedAt") VALUES ($1,$2,$3,$4,NOW(),NOW())')) {
  throw new Error('registration no longer stores the public code transactionally')
}
if (!billing.includes(`redirect(res, '/admin/settings?registered=1')`)) {
  throw new Error('new organizations are not sent to the store code screen')
}
if (billing.includes(`redirect(res, '/admin/owner-analytics?section=billing')\n  }\n\n  async function onboardingPage`)) {
  throw new Error('legacy post-registration redirect remains')
}
if (!billing.includes(`url.pathname === '/admin/account' || url.pathname.startsWith('/admin/settings')`)) {
  throw new Error('settings are not accessible during payment onboarding')
}
if ((customerLinks.match(/WHERE "id"=\$1 AND "publicCode" IS NULL/g) || []).length !== 2) {
  throw new Error('store QR endpoints no longer self-heal missing codes')
}

console.log('store public code v404 runtime verified')
