import assert from 'node:assert/strict'
const base=process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com'
for (const path of ['/business','/business/salon','/business/dealer']) {
  const response=await fetch(base+path)
  assert.equal(response.status,200,path)
  const html=await response.text()
  assert.ok(html.includes('50店舗以上での導入を希望（大口契約）'),path)
  assert.match(html,/<input type="checkbox" name="isEnterprise" value="1">/)
  assert.ok(html.includes('070-8490-9876'),path)
  assert.ok(html.includes('tel:+817084909876'),path)
  assert.ok(!html.includes('070-9444-6007'),path)
}
for (const path of ['/','/privacy','/terms']) {
  const response=await fetch(base+path)
  assert.equal(response.status,200,path)
  const html=await response.text()
  assert.ok(html.includes('070-8490-9876'),path)
  assert.ok(html.includes('tel:+817084909876'),path)
}
const ready=await fetch(base+'/api/health/ready')
assert.equal(ready.status,200)
assert.equal(ready.headers.get('x-lien-enterprise-inquiries'),'v691')
assert.equal(ready.headers.get('x-lien-treatment-reviews'),'v690')
const protectedPage=await fetch(base+'/platform/inquiries?contractType=enterprise',{redirect:'manual'})
assert.equal(protectedPage.status,302)
assert.ok(protectedPage.headers.get('location').includes('/platform/login'))
console.log('PASS public application forms, operator phone links, protected inbox and health (read-only)')
