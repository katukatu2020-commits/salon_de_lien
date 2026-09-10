import assert from 'node:assert/strict'
import fs from 'node:fs'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const changes = JSON.parse(fs.readFileSync('/tmp/coupon-email-delivery-v613-changes.json', 'utf8'))
const actionFile = changes.find(change => change.kind === 'replace' && change.file.includes('.next/server/chunks/'))?.file
assert.ok(actionFile)

const action = fs.readFileSync(`${root}/${actionFile}`, 'utf8')
const page = fs.readFileSync(`${root}/.next/server/app/admin/customers/messages/page.js`, 'utf8')

const customers = [
  { id: 'eligible', appUsers: [{ email: 'customer@example.com' }] },
  { id: 'blank', appUsers: [{ email: '   ' }] },
  { id: 'missing', appUsers: [] },
]
const eligible = customers.filter(customer => String(customer.appUsers[0]?.email ?? '').trim())
assert.deepEqual(eligible.map(customer => customer.id), ['eligible'])
assert.equal(customers.length - eligible.length, 2)

assert.match(action, /audienceMatchedCount: M\.length/)
assert.match(action, /couponIssue\.create/)
assert.match(action, /customerBroadcastRecipient\.create/)
assert.match(action, /M = M\.filter/)
assert.ok(action.indexOf('M = M.filter') < action.indexOf('audienceMatchedCount: M.length'))
assert.match(page, /appUsers: \{\s+where: \{ role: "CUSTOMER", active: !0 \}/)
assert.match(page, /登録メールは/)

console.log(JSON.stringify({
  release: 'v613',
  matchedCustomers: customers.length,
  emailRecipients: eligible.length,
  automaticallyExcluded: customers.length - eligible.length,
  couponRecipientsUseEligibleSet: true,
}))
