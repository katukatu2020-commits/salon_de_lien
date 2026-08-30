import fs from 'node:fs'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const pagePath = `${root}/.next/server/app/admin/customers/messages/page.js`
const marker = 'broadcast-history-collapse-v486'
const oldVersion = 'v485'
const newVersion = 'v486'

let source = fs.readFileSync(pagePath, 'utf8')
if (source.includes(marker)) throw new Error(`${marker}: runtime patch already applied`)

const versionMatches = source.split(oldVersion).length - 1
if (versionMatches !== 10) {
  throw new Error(`${marker}: expected ten v485 history references, found ${versionMatches}`)
}
source = source.replaceAll(oldVersion, newVersion)

const oldCssAnchor = `[data-lien-broadcast-history=\\"v486\\"][open] > summary { border-bottom: 1px solid var(--lien-border); } `
const newCssAnchor = `${oldCssAnchor}[data-lien-broadcast-history=\\"v486\\"]:not([open]) > [data-lien-broadcast-history-content] { display: none !important; } [data-lien-broadcast-history=\\"v486\\"][open] > [data-lien-broadcast-history-content] { display: block !important; } `
const cssMatches = source.split(oldCssAnchor).length - 1
if (cssMatches !== 1) {
  throw new Error(`${marker}: expected one disclosure CSS anchor, found ${cssMatches}`)
}
source = source.replace(oldCssAnchor, newCssAnchor)

fs.writeFileSync(pagePath, source)
console.log(`${marker} runtime patched`)
