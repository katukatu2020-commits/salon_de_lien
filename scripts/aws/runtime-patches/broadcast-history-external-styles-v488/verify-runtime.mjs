import fs from 'node:fs'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const source = fs.readFileSync(`${root}/.next/server/app/admin/customers/messages/page.js`, 'utf8')
const css = fs.readFileSync(`${root}/public/runtime-patches/broadcast-history-v488.css`, 'utf8')
const detailsIndex = source.indexOf('"data-lien-broadcast-history": "v488"')
const nearbySource = source.slice(Math.max(0, detailsIndex - 1200), detailsIndex + 2200)

const assertions = [
  [detailsIndex >= 0, 'v488 disclosure exists'],
  [(source.match(/data-lien-broadcast-history": "v488/g) || []).length === 1, 'one v488 disclosure exists'],
  [source.includes('href: "/runtime-patches/broadcast-history-v488.css"'), 'v488 stylesheet link exists'],
  [source.includes('"data-lien-broadcast-history-styles": "v488"'), 'v488 stylesheet marker exists'],
  [!nearbySource.includes('r.jsx("style"'), 'invalid inline stylesheet remains removed'],
  [source.includes('id: "broadcast-history-content-v488"'), 'v488 history content id exists'],
  [source.includes('"data-lien-broadcast-history-content": "1"'), 'history content marker exists'],
  [source.includes('b.map((e) => {'), 'broadcast history rows remain'],
  [source.includes('data-lien-history-open-label'), 'closed-state label remains'],
  [source.includes('data-lien-history-close-label'), 'open-state label remains'],
  [!source.includes('v487'), 'obsolete v487 page references are removed'],
  [css.includes(':not([open]) > [data-lien-broadcast-history-content] { display: none !important; }'), 'closed content is explicitly hidden'],
  [css.includes('[open] > [data-lien-broadcast-history-content] { display: block !important; }'), 'open content is explicitly shown'],
  [css.includes('[open] [data-lien-history-close-label] { display: inline; }'), 'open label rule exists'],
  [!css.includes('v487') && !css.includes('&quot;') && !css.includes('&gt;'), 'v488 stylesheet is valid and current'],
]

for (const [condition, message] of assertions) {
  if (!condition) throw new Error(`broadcast-history-external-styles-v488: ${message}`)
}

console.log(`broadcast history external stylesheet v488 verified (${assertions.length} assertions)`)
