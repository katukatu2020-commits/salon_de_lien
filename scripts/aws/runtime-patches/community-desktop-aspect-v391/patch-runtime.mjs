import fs from 'node:fs'

const target = '/app/tenant-setup-client.js'
let source = fs.readFileSync(target, 'utf8')

function replaceOnce(before, after, label) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`)
  source = source.replace(before, after)
}

replaceOnce(
  '.ts-community-detail article>header+div{grid-column:1!important;grid-row:2!important;min-height:560px!important}',
  '.ts-community-detail article>header+div{grid-column:1!important;grid-row:2!important;min-height:0!important;align-self:start!important}',
  'desktop community media container'
)

replaceOnce(
  '.ts-community-detail article>header+div>a{display:block!important;height:100%!important;min-height:560px!important;aspect-ratio:auto!important}',
  '.ts-community-detail article>header+div>a{display:block!important;width:100%!important;height:auto!important;min-height:0!important;aspect-ratio:4/5!important}',
  'desktop community photo aspect ratio'
)

replaceOnce(
  '.ts-community-detail article>header+div>a img{height:100%!important;min-height:560px!important;object-fit:cover!important}',
  '.ts-community-detail article>header+div>a img{display:block!important;width:100%!important;height:100%!important;min-height:0!important;object-fit:cover!important}',
  'desktop community image sizing'
)

fs.writeFileSync(target, source)
