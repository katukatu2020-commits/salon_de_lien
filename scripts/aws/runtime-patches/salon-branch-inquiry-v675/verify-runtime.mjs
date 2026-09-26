import fs from 'node:fs'
import assert from 'node:assert/strict'
const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const read = file => fs.readFileSync(root + '/' + file, 'utf8')
const master = read('salon-group-master-v672.js')
assert.match(master, /branchInquiry.submitInquiry/)
assert.doesNotMatch(master, /INSERT INTO "Organization"|initialPassword|const \{ passwordHash/)
const page = read('salon-group-master-v672-page.js')
assert.doesNotMatch(page, /!data.plan.key|monthlyAmount"/)
assert.match(page, /renderInquiryDialog\(data, prefectures\)/)
assert.match(page, /v=675-1/)
const client = read('salon-group-master-v672-client.js')
assert.match(client, /新店舗登録の申請を受け付けました/)
assert.doesNotMatch(client, /initialPassword|result.loginId/)
assert.match(read('business-account-approvals-v643.js'), /attachApprovedStore/)
assert.match(read('server.js'), /X-Lien-Salon-Branch-Inquiry/)
console.log('v675 runtime verified')
