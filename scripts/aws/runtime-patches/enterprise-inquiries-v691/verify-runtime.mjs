import assert from 'node:assert/strict'
import fs from 'node:fs'
import {execFileSync} from 'node:child_process'
import {createRequire} from 'node:module'
const require = createRequire('/app/package.json')
for (const file of ['business-inquiries-v637.js', 'business-account-approvals-v643.js', 'audience-sites.js', 'public-site.js', 'server.js']) execFileSync(process.execPath, ['--check', '/app/' + file])
const {parsePublicInquiry, renderBusinessContactForm} = require('/app/business-inquiries-v637.js')
const input = new URLSearchParams({audience:'salon', organizationName:'QA店舗', contactName:'テスト', email:'qa@example.test', phone:'070-1111-2222', preferredContact:'email', message:'50店舗での導入を希望しています。', privacyAccepted:'1'})
assert.equal(parsePublicInquiry(input).valid, true)
assert.equal(parsePublicInquiry(input).isEnterprise, false)
input.set('isEnterprise', '1')
assert.equal(parsePublicInquiry(input).valid, true)
assert.equal(parsePublicInquiry(input).isEnterprise, true)
for (const value of ['false', '0', 'true', '50', '']) {
  input.set('isEnterprise', value)
  assert.equal(parsePublicInquiry(input).valid, false)
}
input.set('isEnterprise', '1'); input.append('isEnterprise', '1')
assert.equal(parsePublicInquiry(input).valid, false)
for (const audience of ['other', 'salon', 'dealer']) {
  const html = renderBusinessContactForm({audience})
  assert.ok(html.includes('50店舗以上での導入を希望（大口契約）'))
  assert.match(html, /<input type="checkbox" name="isEnterprise" value="1">/)
  assert.ok(html.includes('tel:+817084909876'))
  assert.ok(html.includes('070-8490-9876'))
  assert.ok(!html.includes('070-9444-6007'))
}
for (const file of ['audience-sites.js', 'public-site.js']) {
  const source = fs.readFileSync('/app/' + file, 'utf8')
  assert.ok(source.includes('070-8490-9876'))
  assert.ok(source.includes('tel:+817084909876'))
  assert.ok(!source.includes('070-9444-6007'))
}
assert.ok(fs.readFileSync('/app/server.js', 'utf8').includes("res.setHeader('X-Lien-Enterprise-Inquiries','v691')"))
console.log('PASS enterprise inquiry runtime, strict optional checkbox, operator contact links')
