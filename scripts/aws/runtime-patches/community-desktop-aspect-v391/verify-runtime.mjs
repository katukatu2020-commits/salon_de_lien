import fs from 'node:fs'

const target = '/app/tenant-setup-client.js'
const source = fs.readFileSync(target, 'utf8')

const expected = [
  '.ts-community-detail article>header+div{grid-column:1!important;grid-row:2!important;min-height:0!important;align-self:start!important}',
  '.ts-community-detail article>header+div>a{display:block!important;width:100%!important;height:auto!important;min-height:0!important;aspect-ratio:4/5!important}',
  '.ts-community-detail article>header+div>a img{display:block!important;width:100%!important;height:100%!important;min-height:0!important;object-fit:cover!important}',
]

for (const marker of expected) {
  if (!source.includes(marker)) throw new Error(`Missing desktop community aspect marker: ${marker}`)
}

const forbidden = [
  'article>header+div{grid-column:1!important;grid-row:2!important;min-height:560px!important}',
  'article>header+div>a{display:block!important;height:100%!important;min-height:560px!important;aspect-ratio:auto!important}',
]

for (const marker of forbidden) {
  if (source.includes(marker)) throw new Error(`Legacy desktop community sizing remains: ${marker}`)
}

new Function(source)
console.log('community desktop aspect v391 verified')
