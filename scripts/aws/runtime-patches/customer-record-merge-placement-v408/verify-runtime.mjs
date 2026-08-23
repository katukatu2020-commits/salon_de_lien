import fs from 'node:fs'

const client = fs.readFileSync('/app/customer-merge-client-v385.js', 'utf8')
const tenantClient = fs.readFileSync('/app/tenant-setup-client.js', 'utf8')

for (const marker of [
  `card.className = 'lcm-card lcm-card--embedded'`,
  `customer's management tab`,
  `if (!dangerSection || !managementPanel) return`,
  `managementPanel.insertBefore(card, dangerSection)`,
  `<h3>顧客カルテを統合</h3>`,
  `.lcm-card.lcm-card--embedded`,
]) if (!client.includes(marker)) throw new Error(`v408 marker missing: ${marker}`)

if (client.includes('else main.appendChild(card)')) {
  throw new Error('detached page-root merge card fallback remains')
}
if (client.includes('<h3>重複した顧客カルテを統合</h3>')) {
  throw new Error('old merge card title remains')
}
if (!tenantClient.includes('/customer-merge-v385.js?v=408')) {
  throw new Error('v408 customer merge cache-bust URL missing')
}
if (tenantClient.includes('/customer-merge-v385.js?v=386')) {
  throw new Error('stale v386 customer merge cache-bust URL remains')
}

new Function(client)
new Function(tenantClient)
console.log('customer record merge placement v408 verified')
