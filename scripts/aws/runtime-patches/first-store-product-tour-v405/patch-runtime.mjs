import fs from 'node:fs'

function replaceOnce(source, oldValue, newValue, label) {
  const count = source.split(oldValue).length - 1
  if (count !== 1) throw new Error(`${label}: expected 1 match, found ${count}`)
  return source.replace(oldValue, newValue)
}

const clientPath = '/app/tenant-setup-client.js'
let client = fs.readFileSync(clientPath, 'utf8')

client = replaceOnce(
  client,
  `      if (shouldOpen && !document.querySelector('.ts-overlay')) showSetupWizard(state.setup)`,
  `      if (shouldOpen && !window.__lienProductTourActive && !document.querySelector('.ts-overlay')) showSetupWizard(state.setup)`,
  'legacy setup coexistence',
)

const productTour = fs.readFileSync('/tmp/product-tour-v405.js', 'utf8')
if (client.includes('first-store-product-tour-v405')) throw new Error('product tour is already installed')
client += `\n${productTour}\n`

fs.writeFileSync(clientPath, client)
console.log('first-store product tour v405 runtime patched')
