import fs from 'node:fs'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const withdrawalPath = `${root}/customer-withdrawal-v309.js`

function replaceExact(source, before, after, expectedCount, label) {
  const count = source.split(before).length - 1
  if (count !== expectedCount) throw new Error(`${label}: expected ${expectedCount} matches, found ${count}`)
  return source.split(before).join(after)
}

const escapeHelper = `  function lienEscapeEmailHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character])
  }

`

let withdrawal = fs.readFileSync(withdrawalPath, 'utf8')
if (withdrawal.includes('function lienEscapeEmailHtml(value)')) {
  throw new Error('customer withdrawal HTML escape helper already exists')
}

withdrawal = replaceExact(
  withdrawal,
  '  function lienCommercialEmailHtml(input) {',
  `${escapeHelper}  function lienCommercialEmailHtml(input) {`,
  1,
  'customer withdrawal HTML escape helper insertion',
)

fs.writeFileSync(withdrawalPath, withdrawal)
console.log('customer withdrawal mail v452 patched')
