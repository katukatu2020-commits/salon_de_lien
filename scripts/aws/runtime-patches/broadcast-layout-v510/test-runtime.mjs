import assert from 'node:assert/strict'
import fs from 'node:fs'

const clientPath = process.env.LIEN_BROADCAST_LAYOUT_CLIENT || '/tmp/lien-v510/broadcast-layout-v510.js'
const source = fs.readFileSync(clientPath, 'utf8')

assert.match(source, /location\.pathname !== '\/admin\/customers\/messages'/)
assert.match(source, /form\.classList\.add\('broadcast-layout-v510'\)/)
assert.match(source, /section\.dataset\.lienBroadcastStep = String\(index \+ 1\)/)
assert.match(source, /\[data-store-broadcast-step="1"\]/)
assert.match(source, /\[data-store-broadcast-step="2"\]/)
assert.match(source, /\[data-store-broadcast-step="3"\]/)
assert.match(source, /:not\(\.is-coupon-enabled\)/)
assert.match(source, /grid-column: 1 \/ -1 !important/)
assert.match(source, /new MutationObserver\(schedule\)/)
assert.match(source, /window\.setTimeout\(start, 1100\)/)
assert.match(source, /\}, 180\)/)

const desktopStart = source.indexOf('@media (min-width: 1180px)')
const mobileStart = source.indexOf('@media (max-width: 767.98px)')
assert.ok(desktopStart > 0, 'desktop breakpoint is missing')
assert.ok(mobileStart > desktopStart, 'mobile fallback must remain after desktop rules')

console.log('broadcast-layout-v510 source regression checks passed')
