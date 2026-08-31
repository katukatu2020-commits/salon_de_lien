import fs from 'node:fs'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const serverPath = `${root}/server.js`
const commercialPath = `${root}/commercial-admin-v101.js`

function replaceExact(source, before, after, expected, label) {
  const count = source.split(before).length - 1
  if (count !== expected) throw new Error(`${label}: expected ${expected} matches, found ${count}`)
  return source.split(before).join(after)
}

function replaceBetween(source, start, end, replacement, label) {
  const startIndex = source.indexOf(start)
  if (startIndex < 0) throw new Error(`${label}: start marker was not found`)
  const endIndex = source.indexOf(end, startIndex + start.length)
  if (endIndex < 0) throw new Error(`${label}: end marker was not found`)
  if (source.indexOf(start, startIndex + start.length) >= 0) throw new Error(`${label}: start marker was not unique`)
  return source.slice(0, startIndex) + replacement + source.slice(endIndex)
}

let server = fs.readFileSync(serverPath, 'utf8')
server = replaceExact(
  server,
  '<script src="/orimia-brand-v500.js?v=500" defer></script>',
  '<script src="/orimia-brand-v501.js?v=501" defer></script><script src="/store-app-stability-v501.js?v=501" defer></script>',
  1,
  'cache-busted client runtimes',
)
server = replaceExact(
  server,
  "if (!output.includes('/orimia-brand-v500.js'))",
  "if (!output.includes('/orimia-brand-v501.js'))",
  1,
  'HTML runtime guard',
)
server = replaceExact(
  server,
  "    .replace(/Salon\\s+de\\s+Lien/gi, 'ORIMIA')\n    .replace(/Salon\\s+CRM/gi, 'ORIMIA CRM')\n    .replace(/サロン・ド・リアン/g, 'ORIMIA')\n    .replaceAll('/brand/salon-customer-service-mark.svg', '/brand/orimia-icon-192.png?v=500')\n    .replaceAll('<span class=\"mark\">L</span>', '<span class=\"mark orimia-brand-icon\" aria-hidden=\"true\"></span>')",
  "    /* store-app-stability-v501: React-owned body markup is left byte-identical for hydration. */",
  1,
  'remove pre-hydration body mutations',
)
server = replaceExact(
  server,
  "      if (url.pathname === '/api/health/ready') res.setHeader('X-Orimia-Branding', 'v500')",
  "      if (url.pathname === '/api/health/ready') res.setHeader('X-Orimia-Branding', 'v500')\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Store-App-Stability', 'v501')",
  1,
  'readiness marker',
)
server = replaceBetween(
  server,
  'function transformOrimiaHtmlV500(html) {',
  'function installOrimiaHtmlBrandingV500(req, res) {',
  `function transformOrimiaHtmlV500(html) { /* store-app-stability-v501 */
  return String(html || '')
}

`,
  'hydration-safe HTML response',
)
fs.writeFileSync(serverPath, server)

const layoutRuntimePath = `${root}/.next/static/chunks/app/layout-runtime-v450.js`
let layoutRuntime = fs.readFileSync(layoutRuntimePath, 'utf8')
if (layoutRuntime.includes('store-app-stability-v501-loader')) throw new Error('store runtime loader already exists')
layoutRuntime += `
;(() => { /* store-app-stability-v501-loader */
  const load = (id, src) => {
    if (document.getElementById(id)) return
    const script = document.createElement('script')
    script.id = id
    script.src = src
    script.async = true
    document.head.appendChild(script)
  }
  const start = () => window.setTimeout(() => {
    load('orimia-brand-v501-loader', '/orimia-brand-v501.js?v=501')
    load('store-app-stability-v501-loader', '/store-app-stability-v501.js?v=501')
  }, 1200)
  if (document.readyState === 'complete') start()
  else window.addEventListener('load', start, { once: true })
})()
`
fs.writeFileSync(layoutRuntimePath, layoutRuntime)

let commercial = fs.readFileSync(commercialPath, 'utf8')

const mobileShell = `  function enforceAdminDesktopShell() { /* store-app-stability-v501 */
    if (!location.pathname.startsWith('/admin') || !document.querySelector('.admin-app-shell')) return
    const shell = document.querySelector('.admin-app-shell')
    const sidebar = shell?.querySelector(':scope > aside.admin-desktop-sidebar')
    const nav = sidebar?.querySelector('nav')
    const isMobile = window.matchMedia('(max-width: 767px)').matches
    const campaignMobile = isMobile && location.pathname === '/admin/customers/messages/campaigns'

    if (isMobile) {
      document.documentElement.classList.remove('ca-admin-pc-shell', 'ca-settings-embedded')
      document.documentElement.classList.add('ca-admin-mobile-shell')
      document.documentElement.classList.toggle('ca-campaign-mobile', campaignMobile)
      for (const property of ['display','position','inset','width','min-width','max-width','height','min-height']) sidebar?.style.removeProperty(property)
      for (const property of ['position','inset','display','grid-template-columns','width','height']) nav?.style.removeProperty(property)
      sidebar?.querySelectorAll(':scope > div > div.border-b,:scope > div > div.mx-3,:scope > div > div.mt-auto,button[aria-label="メニューを閉じる"],button.touch-manipulation').forEach(node => node.style.removeProperty('display'))
      shell?.querySelectorAll('.admin-mobile-header,.admin-mobile-sidebar,.admin-desktop-header').forEach(node => node.style.removeProperty('display'))
      shell?.querySelector(':scope > div.min-w-0')?.style.removeProperty('padding-left')
      return
    }

    document.documentElement.classList.remove('ca-admin-mobile-shell', 'ca-campaign-mobile')
    const embeddedSettings = location.pathname === '/admin/settings' && new URLSearchParams(location.search).get('embedded') === '1'
    if (embeddedSettings) {
      document.documentElement.classList.remove('ca-admin-pc-shell')
      document.documentElement.classList.add('ca-settings-embedded')
      return
    }
    document.documentElement.classList.remove('ca-settings-embedded')
    document.documentElement.classList.add('ca-admin-pc-shell')
    if (sidebar) {
      sidebar.style.setProperty('display', 'block', 'important')
      sidebar.style.setProperty('position', 'fixed', 'important')
      sidebar.style.setProperty('inset', '0 auto 0 0', 'important')
      sidebar.style.setProperty('width', '16rem', 'important')
      sidebar.style.setProperty('min-width', '16rem', 'important')
      sidebar.style.setProperty('max-width', '16rem', 'important')
      sidebar.style.setProperty('height', '100dvh', 'important')
    }
    if (nav) {
      nav.style.setProperty('position', 'static', 'important')
      nav.style.setProperty('inset', 'auto', 'important')
      nav.style.setProperty('display', 'grid', 'important')
      nav.style.setProperty('grid-template-columns', 'minmax(0, 1fr)', 'important')
      nav.style.setProperty('width', '100%', 'important')
      nav.style.setProperty('height', 'auto', 'important')
    }
    sidebar?.querySelectorAll(':scope > div > div.border-b,:scope > div > div.mx-3,:scope > div > div.mt-auto').forEach(node => node.style.setProperty('display', 'block', 'important'))
    sidebar?.querySelectorAll('button[aria-label="メニューを閉じる"],button.touch-manipulation').forEach(node => {
      node.style.setProperty('display', 'none', 'important')
      if (node.classList.contains('touch-manipulation')) node.closest('form')?.style.setProperty('display', 'none', 'important')
    })
    shell?.querySelectorAll('.admin-mobile-header,.admin-mobile-sidebar').forEach(node => node.style.setProperty('display', 'none', 'important'))
    shell?.querySelectorAll('.admin-desktop-header').forEach(node => node.style.setProperty('display', 'flex', 'important'))
  }

`
commercial = replaceBetween(
  commercial,
  '  function enforceAdminDesktopShell() {',
  '  function enhance() {',
  mobileShell,
  'responsive admin shell',
)

commercial = replaceExact(
  commercial,
  "  const start = () => boot()\n  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', start, { once: true })\n  else start()",
  "  const start = () => window.setTimeout(boot, 500) /* store-app-stability-v501: hydrate first */\n  if (document.readyState === 'complete') start()\n  else window.addEventListener('load', start, { once: true })",
  1,
  'post-hydration commercial runtime',
)
commercial = replaceExact(
  commercial,
  "    window.addEventListener('pageshow', schedule)",
  "    window.addEventListener('pageshow', schedule)\n    window.addEventListener('resize', schedule, { passive: true })",
  1,
  'responsive shell resize handling',
)

const submitStart = commercial.indexOf('  async function submitCatalogCreateForm(form, submit) {')
const submitEnd = commercial.indexOf('  async function handleCatalogCreateSubmit(event) {', submitStart)
if (submitStart < 0 || submitEnd < 0) throw new Error('product create submit block was not found')
let submitBlock = commercial.slice(submitStart, submitEnd)
submitBlock = replaceExact(
  submitBlock,
  '      const data = new URLSearchParams(new FormData(form))',
  `      const data = new URLSearchParams() /* store-app-stability-v501 */
      for (const [key, value] of new FormData(form).entries()) {
        if (typeof value === 'string') data.append(key, value)
      }`,
  1,
  'string-only product payload',
)
commercial = commercial.slice(0, submitStart) + submitBlock + commercial.slice(submitEnd)

commercial = replaceExact(
  commercial,
  "    if (!title.includes('商品')) return\n    const grid = form.querySelector('.grid.gap-5') || form.querySelector('.ca-form-columns')",
  "    if (!title.includes('商品')) return\n    if (form.querySelector('[name=\"imageDataUrl\"]')) { form.dataset.caProductImageReady = 'native'; return }\n    const grid = form.querySelector('.grid.gap-5') || form.querySelector('.ca-form-columns')",
  1,
  'native product image guard',
)

fs.writeFileSync(commercialPath, commercial)
console.log('store app stability v501 patched')
