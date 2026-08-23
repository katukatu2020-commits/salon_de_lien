import fs from 'node:fs'

const path = '/app/ui-workflows-v294.js'
let source = fs.readFileSync(path, 'utf8')

function replaceOnce(pattern, replacement, label) {
  const matches = source.match(pattern)
  if (!matches || matches.length !== 1) throw new Error(`${label}: expected one match`)
  source = source.replace(pattern, () => replacement)
}

replaceOnce(
  /\.lien-chat-v294\{max-width:1180px/,
  '.lien-chat-v294-portal{position:fixed;z-index:25;overflow:auto;background:#fffaf6;overscroll-behavior:contain}.lien-chat-v294{max-width:1180px',
  'customer chat portal styles',
)

replaceOnce(
  /  function initCustomerChat\(\) \{[\s\S]*?    const chatRoot = main\.querySelector\('\.lien-chat-v294'\)/,
  String.raw`  function cleanupCustomerChatPortal() {
    document.querySelectorAll('[data-lien-customer-chat-portal]').forEach(portal => {
      portal.dispatchEvent(new Event('lien:customer-chat-cleanup'))
      portal.remove()
    })
    document.querySelectorAll('main[data-lien-customer-chat-source]').forEach(main => {
      main.style.visibility = main.dataset.lienPreviousVisibility || ''
      main.style.pointerEvents = main.dataset.lienPreviousPointerEvents || ''
      delete main.dataset.lienPreviousVisibility
      delete main.dataset.lienPreviousPointerEvents
      delete main.dataset.lienCustomerChatSource
      delete main.dataset.lienCustomerChatV294
    })
  }

  function syncCustomerChatPortal(portal, main) {
    if (!portal.isConnected || !main.isConnected) return
    const rect = main.getBoundingClientRect()
    portal.style.left = Math.max(0, rect.left) + 'px'
    portal.style.top = Math.max(0, rect.top) + 'px'
    portal.style.width = Math.max(1, rect.width) + 'px'
    portal.style.height = Math.max(1, window.innerHeight - Math.max(0, rect.top)) + 'px'
  }

  function initCustomerChat() {
    if (location.pathname !== '/u/chat') return
    const main = document.querySelector('main')
    if (!main || document.querySelector('[data-lien-customer-chat-portal]')) return
    main.dataset.lienCustomerChatV294 = 'ready'
    chatStyles()
    const portal = document.createElement('div')
    portal.className = 'lien-chat-v294-portal'
    portal.dataset.lienCustomerChatPortal = '1'
    portal.innerHTML = '<section class="lien-chat-v294" aria-label="チャット相談"><header class="lien-chat-v294__hero"><p class="lien-chat-v294__eyebrow">Salon talk</p><h1>チャット相談</h1><p>サロンスタッフへ気軽に相談できます。</p></header><div class="lien-chat-v294__grid"><section class="lien-chat-v294__sidebar" aria-label="相談するスタッフ"><div class="lien-chat-v294__sidebar-head"><strong>スタッフ</strong><span data-chat-staff-count>読込中</span></div><div class="lien-chat-v294__staff" data-chat-staff-list aria-label="相談するスタッフ"></div></section><section class="lien-chat-v294__conversation"><div data-chat-conversation><div class="lien-chat-v294__empty"><div><span class="lien-chat-v294__empty-icon">' + chatIcon + '</span><strong>会話を選択してください</strong><p>左側のスタッフを選ぶと相談内容を確認できます。</p></div></div></div><p class="lien-chat-v294__error" data-chat-error aria-live="polite"></p></section></div></section>'
    main.dataset.lienCustomerChatSource = '1'
    main.dataset.lienPreviousVisibility = main.style.visibility || ''
    main.dataset.lienPreviousPointerEvents = main.style.pointerEvents || ''
    main.style.visibility = 'hidden'
    main.style.pointerEvents = 'none'
    document.body.appendChild(portal)
    const sync = () => syncCustomerChatPortal(portal, main)
    sync()
    const resizeObserver = new ResizeObserver(sync)
    resizeObserver.observe(main)
    addEventListener('resize', sync, { passive: true })
    portal.addEventListener('lien:customer-chat-cleanup', () => {
      resizeObserver.disconnect()
      removeEventListener('resize', sync)
    }, { once: true })

    const staffList = portal.querySelector('[data-chat-staff-list]')
    const staffCount = portal.querySelector('[data-chat-staff-count]')
    const conversation = portal.querySelector('[data-chat-conversation]')
    const error = portal.querySelector('[data-chat-error]')
    const chatRoot = portal.querySelector('.lien-chat-v294')`,
  'customer chat React-safe mount',
)

replaceOnce(
  /      doc\.querySelectorAll\('\[data-store-code\],\[data-organization-code\]'\)\.forEach\(node => node\.remove\(\)\)/,
  "      doc.querySelectorAll('[data-store-code],[data-organization-code]').forEach(node => { node.hidden = true })",
  'store code hiding',
)

const containerRemoval = '            container.remove()'
const containerRemovalCount = source.split(containerRemoval).length - 1
if (containerRemovalCount !== 1) throw new Error(`embedded settings container removal: expected one match, found ${containerRemovalCount}`)
source = source.replace(containerRemoval, '            container.hidden = true')

replaceOnce(/if \(text === '店舗登録用QRコード' && previous\?\.tagName === 'IMG'\) previous\.remove\(\)/, "if (text === '店舗登録用QRコード' && previous?.tagName === 'IMG') previous.hidden = true", 'QR image hiding')
replaceOnce(/            sibling\.remove\(\)/, '            sibling.hidden = true', 'settings sibling hiding')
replaceOnce(/          label\.remove\(\)/, '          label.hidden = true', 'settings label hiding')
replaceOnce(/if \(container && !\['BODY', 'MAIN', 'FORM'\]\.includes\(container\.tagName\)\) container\.remove\(\)/, "if (container && !['BODY', 'MAIN', 'FORM'].includes(container.tagName)) container.hidden = true", 'settings card hiding')
replaceOnce(
  /  function removeSmsPanelFallback\(\) \{\n    document\.querySelector\('\[aria-label="SMS認証・同意状況"\]'\)\?\.remove\(\)\n  \}/,
  `  function removeSmsPanelFallback() {
    const panel = document.querySelector('[aria-label="SMS認証・同意状況"]')
    if (panel) panel.hidden = true
  }`,
  'SMS panel hiding',
)

replaceOnce(
  /  const boot = \(\) => \{\n    removeSmsPanelFallback\(\)/,
  `  const boot = () => {
    if (location.pathname !== '/u/chat') cleanupCustomerChatPortal()
    removeSmsPanelFallback()`,
  'chat route cleanup',
)

replaceOnce(
  /  boot\(\)\n  const observer = new MutationObserver\(boot\)/,
  `  document.addEventListener('click', event => {
    const link = event.target.closest('a[href]')
    if (!link || !document.querySelector('[data-lien-customer-chat-portal]')) return
    const next = new URL(link.href, location.href)
    if (next.pathname !== '/u/chat') cleanupCustomerChatPortal()
  }, true)
  boot()
  const observer = new MutationObserver(boot)`,
  'chat navigation cleanup',
)

fs.writeFileSync(path, source)
