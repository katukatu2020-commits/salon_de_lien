import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const root=process.env.LIEN_RUNTIME_ROOT || '/app'
const dir=path.dirname(fileURLToPath(import.meta.url))
const css=fs.readFileSync(path.join(dir,'customer-desktop-quality-v674.css'),'utf8')
assert.match(css,/@layer orimiaDesktopQuality/)
assert.equal((css.match(/@media/g)||[]).length,2)
assert.equal((css.match(/@media \(min-width:1024px\)/g)||[]).length,2)
for(const file of ['customer-experience-v503.js','customer-experience-v508.js']) {
  const text=fs.readFileSync(path.join(root,file),'utf8')
  assert.equal(text.split(css).length,2)
  assert.match(text,/delete document.documentElement.dataset.orimiaDesktopQuality/)
  assert.match(text,/dataset.orimiaDesktopQuality = 'v674'/)
  assert.match(text,/<a class="ocd-book" href="\/u\/appointments">/)
}
const server=fs.readFileSync(path.join(root,'server.js'),'utf8')
assert.equal((server.match(/674-desktop-quality1/g)||[]).length,3)
assert.match(server,/X-Lien-Customer-Desktop-Quality/)
assert.match(server,/layout-customer-mobile-nav-v425.desktop-quality-v674.js/)
const chunk=fs.readFileSync(path.join(root,'.next/static/chunks/app/u/(account)/layout-customer-mobile-nav-v425.desktop-quality-v674.js'),'utf8')
assert.match(chunk,/customer-experience-v503.js\?v=674-desktop-quality1/)
assert.ok(!chunk.includes('customer-experience-v503.js?v=597-notification-badge1'))
for(const marker of ['X-Lien-Salon-Directory-Ranking','X-Lien-Salon-Group-Master','X-Lien-Dealer-Sales-Team','X-Lien-Admin-Chat-Reply']) assert.ok(server.includes(marker),marker)
console.log('v674 runtime verified: desktop-only CSS, both renderers, inherited releases')
