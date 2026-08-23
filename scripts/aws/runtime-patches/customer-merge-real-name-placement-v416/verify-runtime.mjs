import fs from 'node:fs'

const client = fs.readFileSync('/app/customer-merge-client-v385.js', 'utf8')
const tenantClient = fs.readFileSync('/app/tenant-setup-client.js', 'utf8')

for (const marker of [
  `main.querySelector('form[action="/api/lien-customer-real-name"]')`,
  `realNameSection.classList.add('lcm-real-name-host')`,
  `card.className = 'lcm-card lcm-card--embedded lcm-card--real-name'`,
  `realNameSection.appendChild(card)`,
  `.lcm-real-name-host{display:grid`,
  `.lcm-card.lcm-card--real-name{grid-column:2`,
  `@media(max-width:980px)`,
  `/customer-merge-v385.js?v=416`,
]) {
  if (!client.includes(marker) && !tenantClient.includes(marker)) {
    throw new Error(`missing v416 marker: ${marker}`)
  }
}

for (const stale of [
  `managementPanel.insertBefore(card, dangerSection)`,
  `dangerForm = [...main.querySelectorAll('form')]`,
  `/customer-merge-v385.js?v=408`,
]) {
  if (client.includes(stale) || tenantClient.includes(stale)) {
    throw new Error(`stale merge placement remains: ${stale}`)
  }
}

new Function(client)
new Function(tenantClient)

console.log('customer merge real-name placement v416 runtime verified')
