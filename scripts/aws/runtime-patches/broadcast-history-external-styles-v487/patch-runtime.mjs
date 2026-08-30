import fs from 'node:fs'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const pagePath = `${root}/.next/server/app/admin/customers/messages/page.js`
const cssDirectory = `${root}/public/runtime-patches`
const cssPath = `${cssDirectory}/broadcast-history-v487.css`
const marker = 'data-lien-broadcast-history-styles": "v487'
const oldVersion = 'v486'
const newVersion = 'v487'

let source = fs.readFileSync(pagePath, 'utf8')
if (source.includes(marker)) throw new Error('broadcast-history-external-styles-v487: runtime patch already applied')

const versionMatches = source.split(oldVersion).length - 1
if (versionMatches !== 12) {
  throw new Error(`broadcast-history-external-styles-v487: expected twelve v486 history references, found ${versionMatches}`)
}

const styleStartToken = `r.jsx("style", { children: "[data-lien-broadcast-history=\\"v486\\"]`
const styleEndToken = '" }),' 
const styleStart = source.indexOf(styleStartToken)
const styleEnd = source.indexOf(styleEndToken, styleStart)
if (styleStart < 0 || styleEnd < 0) {
  throw new Error('broadcast-history-external-styles-v487: inline disclosure stylesheet was not found')
}

const stylesheetLink = `r.jsx("link", { rel: "stylesheet", href: "/runtime-patches/broadcast-history-v487.css", "data-lien-broadcast-history-styles": "v487" }),`
source = source.slice(0, styleStart) + stylesheetLink + source.slice(styleEnd + styleEndToken.length)
source = source.replaceAll(oldVersion, newVersion)

const css = `[data-lien-broadcast-history="v487"] > summary { list-style: none; }
[data-lien-broadcast-history="v487"] > summary::-webkit-details-marker { display: none; }
[data-lien-broadcast-history="v487"][open] > summary { border-bottom: 1px solid var(--lien-border); }
[data-lien-broadcast-history="v487"]:not([open]) > [data-lien-broadcast-history-content] { display: none !important; }
[data-lien-broadcast-history="v487"][open] > [data-lien-broadcast-history-content] { display: block !important; }
[data-lien-broadcast-history="v487"] [data-lien-history-close-label] { display: none; }
[data-lien-broadcast-history="v487"][open] [data-lien-history-open-label] { display: none; }
[data-lien-broadcast-history="v487"][open] [data-lien-history-close-label] { display: inline; }
[data-lien-broadcast-history="v487"] [data-lien-history-chevron] { transition: transform 160ms ease; }
[data-lien-broadcast-history="v487"][open] [data-lien-history-chevron] { transform: rotate(180deg); }
`

fs.mkdirSync(cssDirectory, { recursive: true })
fs.writeFileSync(cssPath, css)
fs.writeFileSync(pagePath, source)
console.log('broadcast-history-external-styles-v487 runtime patched')
