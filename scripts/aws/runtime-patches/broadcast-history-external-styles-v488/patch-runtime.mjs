import fs from 'node:fs'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const pagePath = `${root}/.next/server/app/admin/customers/messages/page.js`
const oldCssPath = `${root}/public/runtime-patches/broadcast-history-v487.css`
const newCssPath = `${root}/public/runtime-patches/broadcast-history-v488.css`
const oldVersion = 'v487'
const newVersion = 'v488'

let source = fs.readFileSync(pagePath, 'utf8')
if (source.includes('data-lien-broadcast-history-styles": "v488')) {
  throw new Error('broadcast-history-external-styles-v488: runtime patch already applied')
}

const versionMatches = source.split(oldVersion).length - 1
if (versionMatches !== 4) {
  throw new Error(`broadcast-history-external-styles-v488: expected four v487 page references, found ${versionMatches}`)
}
if (!source.includes('href: "/runtime-patches/broadcast-history-v487.css"')) {
  throw new Error('broadcast-history-external-styles-v488: v487 stylesheet link was not found')
}

const oldCss = fs.readFileSync(oldCssPath, 'utf8')
const cssVersionMatches = oldCss.split(oldVersion).length - 1
if (cssVersionMatches !== 10) {
  throw new Error(`broadcast-history-external-styles-v488: expected ten v487 stylesheet references, found ${cssVersionMatches}`)
}

source = source.replaceAll(oldVersion, newVersion)
const newCss = oldCss.replaceAll(oldVersion, newVersion)
fs.writeFileSync(newCssPath, newCss)
fs.writeFileSync(pagePath, source)
console.log('broadcast-history-external-styles-v488 runtime patched')
