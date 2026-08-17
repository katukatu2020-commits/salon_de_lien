const fs = require('fs')

const source = fs.readFileSync('/app/customer-experience-v278.js', 'utf8')
const required = [
  'function ensureMobileCustomerStoreIcon()',
  'dataset.cxMobileStoreIcon',
  "control.setAttribute('aria-label', 'ホーム')",
  "location.assign('/u/home')",
  'ensureMobileCustomerStoreIcon(); replaceNewsLinks()',
]

for (const marker of required) {
  if (!source.includes(marker)) throw new Error(`customer-experience-v278.js: missing ${marker}`)
}

if (!source.includes("a[href=\"/u/news\"]") && source.includes("link.setAttribute('href', '/u/stores')")) {
  throw new Error('The notification bell must not be rewritten to the store page.')
}

console.log('Customer mobile header verification passed.')
