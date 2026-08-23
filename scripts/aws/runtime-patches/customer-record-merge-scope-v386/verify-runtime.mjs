import fs from 'node:fs'

const client = fs.readFileSync('/app/customer-merge-client-v385.js', 'utf8')
const tenantClient = fs.readFileSync('/app/tenant-setup-client.js', 'utf8')
for (const marker of [
  `if (!pathMatch())`,
  `document.getElementById('lien-customer-merge-v385-card')?.remove()`,
  `document.querySelectorAll('.lcm-overlay').forEach(overlay => overlay.remove())`,
  `document.body.style.overflow = ''`,
]) if (!client.includes(marker)) throw new Error(`scope cleanup marker missing: ${marker}`)

new Function(client)
if (!tenantClient.includes('/customer-merge-v385.js?v=386')) throw new Error('v386 customer merge cache-bust URL missing')
if (tenantClient.includes('/customer-merge-v385.js?v=385')) throw new Error('stale v385 customer merge URL remains')
new Function(tenantClient)
console.log('customer record merge scope v386 verified')
