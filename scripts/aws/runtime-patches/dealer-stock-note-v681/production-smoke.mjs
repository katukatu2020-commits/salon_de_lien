import assert from 'node:assert/strict'
const base=process.env.VERIFY_BASE_URL||'https://salon-de-lien.com'
const ready=await fetch(base+'/api/health/ready')
assert.equal(ready.status,200)
assert.equal(ready.headers.get('x-lien-dealer-stock-note'),'v681')
assert.equal(ready.headers.get('x-lien-three-app-qa'),'v680')
const asset=await fetch(base+'/dealer-erp-v678-client.stock-note-v681.js?v=681-1')
assert.equal(asset.status,200)
assert.ok((await asset.text()).includes("area('reason','備考（任意）','',false,1000)"))
assert.equal((await fetch(base+'/dealer/login')).status,200)
console.log('v681 production read-only smoke passed')
