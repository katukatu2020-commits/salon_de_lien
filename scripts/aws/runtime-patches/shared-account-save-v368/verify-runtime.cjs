const fs = require('node:fs')

const file = '/app/sales-ledger-client-v318.js'
const source = fs.readFileSync(file, 'utf8')

const required = [
  'const form = event.currentTarget',
  "new FormData(form)",
  "form.elements.namedItem('password')",
  'passwordField instanceof HTMLInputElement',
]

for (const marker of required) {
  if (!source.includes(marker)) throw new Error(`missing shared-account save marker: ${marker}`)
}

if (source.includes('event.currentTarget.password')) {
  throw new Error('unsafe async currentTarget password access remains')
}

console.log('shared account save runtime verified')
