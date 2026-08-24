import fs from 'node:fs'
import path from 'node:path'

const appRoot = '/app'
const serverPath = path.join(appRoot, 'server.js')
const serverChunkPath = path.join(appRoot, '.next/server/chunks/1597.js')
const clientChunkDirectory = path.join(appRoot, '.next/static/chunks/app/u/(account)')
const oldClientChunkName = 'layout-customer-profile-v395.js'
const newClientChunkName = 'layout-customer-experience-v424.js'
const oldClientChunkPath = path.join(clientChunkDirectory, oldClientChunkName)
const newClientChunkPath = path.join(clientChunkDirectory, newClientChunkName)
const oldCustomerLinkPath = path.join(appRoot, 'customer-link-ui-v293.js')
const newCustomerLinkPath = path.join(appRoot, 'customer-link-ui-v424.js')

function replaceOnce(source, before, after, label) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`)
  return source.replace(before, after)
}

function walk(directory) {
  const files = []
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filePath = path.join(directory, entry.name)
    if (entry.isDirectory()) files.push(...walk(filePath))
    else files.push(filePath)
  }
  return files
}

let server = fs.readFileSync(serverPath, 'utf8')
server = replaceOnce(
  server,
  "const { createCommunityPublishingService } = require('./community-publishing-v348') /* community-publishing-v337 */",
  "const { createCommunityPublishingService } = require('./community-publishing-v348') /* community-publishing-v337 */\nconst { createCustomerProfileImageService } = require('./customer-profile-image-service-v424') /* customer-app-experience-v424 */",
  'profile image service import',
)
server = replaceOnce(
  server,
  'let customerStoreStaff = null\nlet customerLinks = null',
  "let customerStoreStaff = null\nlet customerLinks = null\nconst customerProfileImage = createCustomerProfileImageService({ prisma, customerSession: req => chatSession(req, 'customer'), json })",
  'profile image service initialization',
)
server = replaceOnce(
  server,
  "      if (url.pathname === '/api/lien-sms-consent' && req.method === 'POST') return await customerSmsConsent(req, res)",
  "      if (await customerProfileImage.handle(req, res, url)) return /* customer-app-experience-v424-profile */\n      if (url.pathname === '/api/lien-sms-consent' && req.method === 'POST') return await customerSmsConsent(req, res)",
  'profile image route',
)
server = replaceOnce(
  server,
  "    home: '<path d=\"M3 10.5 12 3l9 7.5\"></path><path d=\"M5 9.5V21h14V9.5\"></path><path d=\"M9 21v-7h6v7\"></path>',",
  "    home: '<path d=\"M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z\"></path>',",
  'native home icon',
)
server = replaceOnce(
  server,
  "    mail: '<rect x=\"3\" y=\"5\" width=\"18\" height=\"14\" rx=\"2\"></rect><path d=\"m3 7 9 6 9-6\"></path>',",
  "    mail: '<rect x=\"3\" y=\"5\" width=\"18\" height=\"14\" rx=\"2\"></rect><path d=\"m3 7 9 6 9-6\"></path>',\n    chat: '<path d=\"M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z\"></path>',",
  'native chat icon',
)
server = replaceOnce(
  server,
  "  const items = [['home','ホーム','/u/home'],['calendar','予約','/u/appointments'],['clock','履歴','/u/history'],['mail','チャット相談','/u/chat']]",
  "  const items = [['home','ホーム','/u/home'],['calendar','予約','/u/appointments'],['clock','履歴','/u/history'],['chat','チャット相談','/u/chat']]",
  'native bottom navigation icons',
)
server = replaceOnce(
  server,
  "<a class=\"bottom-link ${active === label ? 'active' : ''}\" href=\"${href}\"",
  "<a class=\"bottom-link cx-customer-nav-link ${active === label ? 'active cx-customer-nav-active' : ''}\" href=\"${href}\"",
  'native bottom navigation classes',
)
server = replaceOnce(
  server,
  "    ['repeat','前回と同じ予約','QUICK RESERVE','/u/appointments?repeat=last'],",
  "    ['news','店舗からのお知らせ','NEWS & EVENTS','/u/news'],",
  'home announcement shortcut',
)
server = replaceOnce(
  server,
  "    ['heart','お客様の声','IMPRESSION','/u/reviews'],\n  ]\n  const body = `<section class=\"welcome\">",
  "    ['heart','お客様の声','IMPRESSION','/u/reviews'],\n  ]\n  const announcementSection = `<section class=\"section\"><div class=\"section-head\"><div><h2>店舗からのお知らせ</h2><p>イベント・キャンペーン・店舗からのご案内</p></div><a href=\"/u/news\">すべて見る</a></div>${data.broadcasts.length ? data.broadcasts.slice(0, 3).map(item => `<a class=\"notice\" href=\"/u/news\"><span>${customerIcon(item.couponEnabled ? 'ticket' : 'news')}</span><div><strong>${htmlEscape(item.title || '店舗からのお知らせ')}</strong><p>${htmlEscape(item.body || '詳しくはお知らせをご確認ください。')}</p></div>${customerIcon('chevron')}</a>`).join('') : `<div class=\"notice\"><span>${customerIcon('news')}</span><div><strong>現在、新しいお知らせはありません</strong><p>イベントやキャンペーンが届くと、こちらに表示されます。</p></div></div>`}</section>`\n  const body = `<section class=\"welcome\">",
  'home announcement section',
)
server = replaceOnce(
  server,
  '</section>${data.appointment ? `<section class="section">',
  '</section>${announcementSection}${data.appointment ? `<section class="section">',
  'home announcement placement',
)
server = replaceOnce(
  server,
  '<a class="primary" href="/u/appointments">次回来店時に取り置きを相談</a><a class="secondary" href="/u/chat">スタッフにチャットで相談</a>',
  '<a class="primary" href="/u/chat?productId=${encodeURIComponent(product.id)}">次回来店時に取り置きを相談</a>',
  'item detail consultation action',
)
server = replaceOnce(
  server,
  "      if (url.pathname.startsWith('/u/community')) {",
  "      if (url.pathname === '/customer-experience-v424.js' && req.method === 'GET') {\n        res.statusCode = 200\n        res.setHeader('Content-Type', 'application/javascript; charset=utf-8')\n        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')\n        res.setHeader('X-Content-Type-Options', 'nosniff')\n        res.end(fs.readFileSync(path.join(dir, 'customer-experience-v424.js')))\n        return\n      } /* customer-app-experience-v424-runtime */\n      if (url.pathname === '/customer-link-ui-v424.js' && req.method === 'GET') {\n        res.statusCode = 200\n        res.setHeader('Content-Type', 'application/javascript; charset=utf-8')\n        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')\n        res.setHeader('X-Content-Type-Options', 'nosniff')\n        res.end(fs.readFileSync(path.join(dir, 'customer-link-ui-v424.js')))\n        return\n      } /* customer-link-ui-v424-runtime */\n      if (url.pathname.startsWith('/u/community')) {",
  'customer experience static route',
)
server = server.split('/customer-experience-v395.js').join('/customer-experience-v424.js')
server = server.split('<script src="/customer-link-ui-v293.js?v=293-4" defer></script>').join('<script src="/customer-link-ui-v424.js?v=424-1" data-lien-customer-link-v293="1" defer></script>')
fs.writeFileSync(serverPath, server)

let customerLink = fs.readFileSync(oldCustomerLinkPath, 'utf8')
customerLink = customerLink.split('window.__lienCustomerLinkV293_4').join('window.__lienCustomerLinkV424')
customerLink = replaceOnce(
  customerLink,
  "      const finish = value => { URL.revokeObjectURL(source); dialog.close(); resolve(value) }",
  "      let settled = false\n      const finish = value => {\n        if (settled) return\n        settled = true\n        URL.revokeObjectURL(source)\n        resolve(value)\n        dialog.close()\n      }",
  'crop result settlement',
)
customerLink = replaceOnce(
  customerLink,
  "      dialog.overlay.addEventListener('lien:close', () => { URL.revokeObjectURL(source); resolve(null) }, { once: true })",
  "      dialog.overlay.addEventListener('lien:close', () => {\n        if (settled) return\n        settled = true\n        URL.revokeObjectURL(source)\n        resolve(null)\n      }, { once: true })",
  'crop cancellation settlement',
)
customerLink = replaceOnce(
  customerLink,
  "        input.dataset.lienCropped = '1'\n        input.dispatchEvent(new Event('change', { bubbles: true }))",
  "        input.dataset.lienCropped = '1'\n        input.dataset.lienCroppedV401 = '1'\n        input.dispatchEvent(new Event('change', { bubbles: true }))",
  'single profile crop dispatch',
)
fs.writeFileSync(newCustomerLinkPath, customerLink)

const oldHomeIcon = 'let customerNativeHomeIcon=(0,n.Z)("customer-home",[["path",{d:"M3 10.5 12 3l9 7.5",key:"customer-home-1"}],["path",{d:"M5 9.5V21h14V9.5",key:"customer-home-2"}],["path",{d:"M9 21v-7h6v7",key:"customer-home-3"}]])'
const newHomeIcon = 'let customerNativeHomeIcon=(0,n.Z)("customer-home",[["path",{d:"M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z",key:"customer-home-1"}]])'
const oldChatIcon = 'customerNativeChatIcon=(0,n.Z)("customer-mail",[["rect",{x:"3",y:"5",width:"18",height:"14",rx:"2",key:"customer-mail-1"}],["path",{d:"m3 7 9 6 9-6",key:"customer-mail-2"}]])'
const newChatIcon = 'customerNativeChatIcon=(0,n.Z)("customer-chat",[["path",{d:"M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z",key:"customer-chat-1"}]])'

let clientChunk = fs.readFileSync(oldClientChunkPath, 'utf8')
clientChunk = clientChunk.split('/customer-experience-v395.js').join('/customer-experience-v424.js')
clientChunk = clientChunk.split('data-lien-customer-experience="278"').join('data-lien-customer-experience="424"')
clientChunk = clientChunk.split("dataset.lienCustomerExperience = '278'").join("dataset.lienCustomerExperience = '424'")
clientChunk = replaceOnce(clientChunk, oldHomeIcon, newHomeIcon, 'client home icon')
clientChunk = replaceOnce(clientChunk, oldChatIcon, newChatIcon, 'client chat icon')
fs.writeFileSync(newClientChunkPath, clientChunk)

let serverChunk = fs.readFileSync(serverChunkPath, 'utf8')
serverChunk = replaceOnce(serverChunk, oldHomeIcon, newHomeIcon, 'server home icon')
serverChunk = replaceOnce(serverChunk, oldChatIcon, newChatIcon, 'server chat icon')
fs.writeFileSync(serverChunkPath, serverChunk)

const manifestFiles = [
  path.join(appRoot, '.next/app-build-manifest.json'),
  ...walk(path.join(appRoot, '.next/server/app')).filter(filePath => filePath.endsWith('_client-reference-manifest.js')),
]
let manifestCount = 0
for (const manifestPath of manifestFiles) {
  const source = fs.readFileSync(manifestPath, 'utf8')
  if (!source.includes(oldClientChunkName)) continue
  fs.writeFileSync(manifestPath, source.split(oldClientChunkName).join(newClientChunkName))
  manifestCount += 1
}
if (manifestCount < 2) throw new Error(`customer layout manifest references were not fully found: ${manifestCount}`)

const experiencePath = path.join(appRoot, 'customer-experience-v424.js')
let experience = fs.readFileSync(path.join(appRoot, 'customer-experience-v395.js'), 'utf8')
experience = replaceOnce(
  experience,
  '    @media(max-width:470px){form[action="/api/customer/profile"] input[type="date"]{inline-size:100%;min-inline-size:0;max-inline-size:100%}}',
  '    @media(max-width:470px){form[action="/api/customer/profile"] label:has(input[type="date"]){min-width:0;max-width:100%;overflow:hidden}form[action="/api/customer/profile"] input[type="date"]{display:block!important;inline-size:100%!important;width:100%!important;min-inline-size:0!important;max-inline-size:100%!important;box-sizing:border-box!important;-webkit-appearance:none;appearance:none;font-size:16px!important}}',
  'mobile Safari birth date sizing',
)
experience = experience.replace('window.__lienCustomerExperienceV278', 'window.__lienCustomerExperienceV424')
experience += `
;(() => {
  'use strict'
  if (!document.querySelector('script[data-lien-customer-link-v293]')) {
    const customerLink = document.createElement('script')
    customerLink.src = '/customer-link-ui-v424.js?v=424-1'
    customerLink.defer = true
    customerLink.dataset.lienCustomerLinkV293 = '1'
    document.head.appendChild(customerLink)
  }
  if (window.__lienCustomerProfileUploadV424) return
  window.__lienCustomerProfileUploadV424 = true

  function bindProfileImageUpload() {
    if (location.pathname !== '/u/profile') return
    const input = document.querySelector('input[type="file"][name="profileImage"]')
    const form = input?.closest('form')
    if (!input || !form || form.dataset.lienProfileUploadApiV424) return
    form.dataset.lienProfileUploadApiV424 = '1'
    const uploadButton = form.querySelector('button[type="submit"]')
    if (uploadButton) {
      uploadButton.type = 'button'
      uploadButton.dataset.profileUploadButtonV424 = '1'
      uploadButton.addEventListener('click', (event) => {
        event.preventDefault()
        event.stopImmediatePropagation()
        form.dispatchEvent(new SubmitEvent('submit', { bubbles: false, cancelable: true }))
      })
    }
    form.addEventListener('submit', async (event) => {
      event.preventDefault()
      event.stopImmediatePropagation()
      const file = input.files?.[0]
      if (!file) return
      const submit = form.querySelector('[data-profile-upload-button-v424]')
      const originalLabel = submit?.textContent || 'アップロード'
      let status = form.querySelector('[data-profile-upload-status-v424]')
      if (!status) {
        status = document.createElement('p')
        status.dataset.profileUploadStatusV424 = '1'
        status.setAttribute('role', 'status')
        status.style.cssText = 'margin:10px 0 0;font-size:13px;font-weight:700;line-height:1.6;text-align:center'
        form.appendChild(status)
      }
      if (submit) { submit.disabled = true; submit.textContent = '保存中...' }
      status.textContent = ''
      try {
        const body = new FormData()
        body.append('profileImage', file, file.name)
        const response = await fetch('/api/customer/profile-image', { method: 'POST', body, credentials: 'same-origin' })
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(payload.error || 'ファイルを保存できませんでした。')
        status.style.color = '#50745a'
        status.textContent = payload.message || 'プロフィール画像を更新しました。'
        input.value = ''
        if (payload.imageUrl) {
          document.querySelectorAll('img[alt$="のプロフィール画像"]').forEach((image) => { image.src = payload.imageUrl })
        }
      } catch (error) {
        status.style.color = '#a23c32'
        status.textContent = error instanceof Error ? error.message : 'ファイルを保存できませんでした。'
      } finally {
        if (submit) { submit.disabled = false; submit.textContent = originalLabel }
      }
    }, true)
  }

  bindProfileImageUpload()
  window.addEventListener('click', (event) => {
    if (location.pathname !== '/u/profile') return
    const submit = event.target instanceof Element ? event.target.closest('button[type="submit"]') : null
    const form = submit?.closest('form')
    const input = form?.querySelector('input[type="file"][name="profileImage"]')
    if (!submit || !form || !input?.files?.[0]) return
    event.preventDefault()
    event.stopImmediatePropagation()
    delete form.dataset.lienProfileUploadApiV424
    bindProfileImageUpload()
    form.dispatchEvent(new SubmitEvent('submit', { bubbles: false, cancelable: true, submitter: submit }))
  }, true)
  new MutationObserver(bindProfileImageUpload).observe(document.documentElement, { childList: true, subtree: true })
  window.addEventListener('popstate', () => setTimeout(bindProfileImageUpload, 0))
})()
`
fs.writeFileSync(experiencePath, experience)

console.log(`customer app experience v424 patched (${manifestCount} manifests)`)
