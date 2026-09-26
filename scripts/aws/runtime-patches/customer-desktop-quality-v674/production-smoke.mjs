import assert from 'node:assert/strict'
const base=process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com'
const ready=await fetch(base+'/api/health/ready')
assert.equal(ready.status,200)
for(const [header,value] of Object.entries({'x-lien-customer-desktop-quality':'v674','x-lien-salon-directory-ranking':'v673','x-lien-salon-group-master':'v672','x-lien-dealer-sales-team':'v671'})) assert.equal(ready.headers.get(header),value)
for(const name of ['customer-experience-v503.js','customer-experience-v508.js']) {
  const response=await fetch(base+'/'+name+'?v=674-desktop-quality1')
  assert.equal(response.status,200)
  const source=await response.text()
  assert.match(source,/@layer orimiaDesktopQuality/)
  assert.match(source,/dataset.orimiaDesktopQuality = 'v674'/)
  assert.match(source,/delete document.documentElement.dataset.orimiaDesktopQuality/)
}
const chunk=await fetch(base+'/_next/static/chunks/app/u/(account)/layout-customer-mobile-nav-v425.desktop-quality-v674.js')
assert.equal(chunk.status,200)
assert.match(await chunk.text(),/customer-experience-v503.js\?v=674-desktop-quality1/)
console.log('v674 production readiness and both customer client assets verified')
