import fs from 'node:fs'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const pagePath = `${root}/.next/server/app/admin/customers/messages/page.js`
const cssPath = `${root}/public/runtime-patches/broadcast-history-v487.css`
const source = fs.readFileSync(pagePath, 'utf8')
const css = fs.readFileSync(cssPath, 'utf8')
const detailsIndex = source.indexOf('"data-lien-broadcast-history": "v487"')
const nearbySource = source.slice(Math.max(0, detailsIndex - 1200), detailsIndex + 2200)

const assertions = [
  [detailsIndex >= 0, 'v487 disclosure exists'],
  [(source.match(/data-lien-broadcast-history": "v487/g) || []).length === 1, 'one v487 disclosure exists'],
  [source.includes('href: "/runtime-patches/broadcast-history-v487.css"'), 'external stylesheet link exists'],
  [source.includes('"data-lien-broadcast-history-styles": "v487"'), 'stylesheet marker exists'],
  [!nearbySource.includes('r.jsx("style"'), 'invalid inline stylesheet is removed'],
  [source.includes('id: "broadcast-history-content-v487"'), 'history content id exists'],
  [source.includes('"data-lien-broadcast-history-content": "1"'), 'history content marker exists'],
  [source.includes('b.map((e) => {'), 'broadcast history rows remain'],
  [source.includes('data-lien-history-open-label'), 'closed-state label remains'],
  [source.includes('data-lien-history-close-label'), 'open-state label remains'],
  [!source.includes('v486'), 'obsolete disclosure references are removed'],
  [css.includes(':not([open]) > [data-lien-broadcast-history-content] { display: none !important; }'), 'closed content is explicitly hidden'],
  [css.includes('[open] > [data-lien-broadcast-history-content] { display: block !important; }'), 'open content is explicitly shown'],
  [css.includes('[open] [data-lien-history-close-label] { display: inline; }'), 'open label rule exists'],
  [!css.includes('&quot;') && !css.includes('&gt;'), 'stylesheet contains valid CSS characters'],
]

for (const [condition, message] of assertions) {
  if (!condition) throw new Error(`broadcast-history-external-styles-v487: ${message}`)
}

console.log(`broadcast history external stylesheet v487 verified (${assertions.length} assertions)`)
