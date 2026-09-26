import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const root=process.env.LIEN_RUNTIME_ROOT || '/app'
const source=path.dirname(fileURLToPath(import.meta.url))
const css=fs.readFileSync(path.join(source,'customer-desktop-quality-v674.css'),'utf8')
if (css.includes('`') || css.includes('${')) throw Error('CSS must be a literal template')
function exact(text,before,after,label) {
  if(text.split(before).length!==2) throw Error('Unexpected parent anchor: '+label)
  return text.replace(before,after)
}
for(const file of ['customer-experience-v503.js','customer-experience-v508.js']) {
  const target=path.join(root,file)
  let text=fs.readFileSync(target,'utf8')
  const start=text.indexOf(';/* customer-desktop-frontend-v529-boundary */')
  const end=text.indexOf('/* customer-desktop-frontend-v529 */',start)
  if(start<0 || end<start) throw Error('Missing desktop shell: '+file)
  let shell=text.slice(start,end)
  shell=exact(shell,'  const media = window.matchMedia(MEDIA_QUERY)',`  const media = window.matchMedia(MEDIA_QUERY)
  // Keep the existing single-day wizard state in sync with the desktop week grid.
  document.addEventListener('click', event => {
    if (!media.matches || document.documentElement.dataset.orimiaDesktopQuality !== 'v674' || !(event.target instanceof Element)) return
    const slot = event.target.closest('.cj-slot-row > button[data-cj-day]')
    if (!slot || slot.disabled) return
    const day = Number(slot.dataset.cjDay)
    if (!Number.isInteger(day) || day < 1 || day > 7) return
    const date = slot.closest('main')?.querySelector('.cj-dates [data-cj-date="' + day + '"]')
    if (date && date.getAttribute('aria-current') !== 'date') date.click()
  }, true)`,file+' desktop booking date synchronization')
  shell=exact(shell,'\n  `\n\n  function addStyles()', '\n'+css+'\n  `\n\n  function addStyles()',file+' desktop styles')
  shell=exact(shell,"document.documentElement.dataset.orimiaCustomerDesktop = 'v529'", "document.documentElement.dataset.orimiaCustomerDesktop = 'v529'\n    document.documentElement.dataset.orimiaDesktopQuality = 'v674'",file+' desktop flag')
  shell=exact(shell,'    delete document.documentElement.dataset.orimiaCustomerDesktop','    delete document.documentElement.dataset.orimiaCustomerDesktop\n    delete document.documentElement.dataset.orimiaDesktopQuality\n    delete document.documentElement.dataset.orimiaCustomerView',file+' cleanup')
  shell=exact(shell,'    const details = routeDetails(path)','    const details = routeDetails(path)\n    document.documentElement.dataset.orimiaCustomerView = details.path',file+' current view')
  shell=exact(shell,'<div class="ocd-header-actions">','<div class="ocd-header-actions"><a class="ocd-book" href="/u/appointments">${icon(\'calendar\')}<span>予約する</span></a>',file+' booking action')
  shell=exact(shell,'data-ocd-back aria-label="前の画面へ戻る"','data-ocd-back aria-label="前の画面へ戻る" title="前の画面へ戻る"',file+' back tooltip')
  text=text.slice(0,start)+shell+text.slice(end)
  fs.writeFileSync(target,text)
}
let server=fs.readFileSync(path.join(root,'server.js'),'utf8')
// The native layout also loads v503. Give that immutable chunk a new URL so
// a previously cached desktop shell cannot claim the shared initialization flag.
const chunkDir='.next/static/chunks/app/u/(account)/'
const oldChunk='layout-customer-mobile-nav-v425.notification-badge-v597.js'
const newChunk='layout-customer-mobile-nav-v425.desktop-quality-v674.js'
const oldChunkSource=fs.readFileSync(path.join(root,chunkDir+oldChunk),'utf8')
const newChunkSource=exact(oldChunkSource,'/customer-experience-v503.js?v=597-notification-badge1','/customer-experience-v503.js?v=674-desktop-quality1','native immutable loader')
fs.writeFileSync(path.join(root,chunkDir+newChunk),newChunkSource)
server=exact(server,oldChunk,newChunk,'native chunk URL')
for(const [before,after,count] of [
  ['/customer-experience-v503.js?v=670-orimia-directory1','/customer-experience-v503.js?v=674-desktop-quality1',2],
  ['/customer-experience-v508.js?v=670-orimia-directory1','/customer-experience-v508.js?v=674-desktop-quality1',1],
]) {
  if(server.split(before).length!==count+1) throw Error('Unexpected cache anchors: '+before)
  server=server.split(before).join(after)
}
server=exact(server,"      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Salon-Directory-Ranking', 'v673') /* salon-directory-ranking-v673-ready */", "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Salon-Directory-Ranking', 'v673') /* salon-directory-ranking-v673-ready */\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Desktop-Quality', 'v674') /* customer-desktop-quality-v674-ready */",'health marker')
fs.writeFileSync(path.join(root,'server.js'),server)
console.log('Customer desktop quality v674 patched; mobile CSS unchanged')
