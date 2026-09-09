import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const marker = 'customer-style-first-paint-v606'
const changes = []

function replaceExact(file, before, after, expected, label) {
  const target = path.join(root, file)
  const source = fs.readFileSync(target, 'utf8')
  const count = source.split(before).length - 1
  if (count !== expected) throw new Error(`${label}: expected ${expected} matches, found ${count}`)
  fs.writeFileSync(target, source.split(before).join(after))
  changes.push({ kind:'replace', file, before, after, count:expected })
}

const client = 'public/style-system-integration-v602.js'

replaceExact(
  client,
  `  if (window.__orimiaStyleSystemV602) return

  const route = location.pathname.match(/^\\/(admin|u)\\/community\\/([^/?#]+)\\/?$/)
  if (!route) return`,
  `  if (window.__orimiaStyleNavigationV606 !== true) {
    window.__orimiaStyleNavigationV606 = true
    document.addEventListener('click', event => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const link = event.target instanceof Element ? event.target.closest('a[href]') : null
      if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return
      const target = new URL(link.href, location.href)
      if (target.origin !== location.origin || !/^\\/u\\/community\\/[^/]+\\/?$/.test(target.pathname)) return
      event.preventDefault()
      event.stopImmediatePropagation()
      location.assign(target.href)
    }, true)
  }

  if (window.__orimiaStyleSystemV602) return

  const route = location.pathname.match(/^\\/(admin|u)\\/community\\/([^/?#]+)\\/?$/)
  if (!route) return`,
  1,
  'customer style detail navigation',
)

replaceExact(
  client,
  `  let payload = null
  let loading = false
  let scheduled = false`,
  `  let payload = null
  let loading = false
  let scheduled = false
  const rootElementV606 = document.documentElement

  function revealStyleV606(state) {
    document.getElementById('orimia-style-first-paint-v606-guard')?.remove()
    rootElementV606.classList.remove('orimia-style-pending-v606')
    rootElementV606.dataset.orimiaStyleStateV606 = state
  }`,
  1,
  'first-paint state helper',
)

replaceExact(
  client,
  `  function render() {
    if (!payload?.post?.style) return
    const article = document.querySelector('.community-detail-page article, .ts-community-detail article, main article')
    if (!article) return`,
  `  function render() {
    if (!payload?.post?.style) return false
    const article = document.querySelector('.community-detail-page article, .ts-community-detail article, main article')
    if (!article) return false`,
  1,
  'render readiness return',
)

replaceExact(
  client,
  `    if (!gallery || !content || !meta) return`,
  `    if (!gallery || !content || !meta) return false`,
  1,
  'incomplete article remains pending',
)

replaceExact(
  client,
  `    suppressLegacy(article)
  }

  function editorMenuRows(style, options) {`,
  `    suppressLegacy(article)
    revealStyleV606('ready')
    return true
  }

  function editorMenuRows(style, options) {`,
  1,
  'reveal completed style',
)

replaceExact(
  client,
  `      payload = await request(\`/api/lien-style-system?audience=\${audience}&postId=\${encodeURIComponent(postId)}\`)
      render()
    } catch (error) {
      console.warn('[style-system-integration-v602]', error instanceof Error ? error.message : error)`,
  `      payload = await request(\`/api/lien-style-system?audience=\${audience}&postId=\${encodeURIComponent(postId)}\`)
      if (!payload?.post?.style) revealStyleV606('fallback')
      else render()
    } catch (error) {
      revealStyleV606('fallback')
      console.warn('[style-system-integration-v602]', error instanceof Error ? error.message : error)`,
  1,
  'failed request fallback',
)

const server = 'server.js'
replaceExact(
  server,
  `  if (styleCommunityRouteV602 && !output.includes('orimia-style-system-v602')) {
    output = output.replace('</head>', '<link id="orimia-style-system-v602-style" rel="stylesheet" href="/style-system-integration-v602.css?v=605-customer-detail1"><script id="orimia-style-system-v602" src="/style-system-integration-v602.js?v=605-customer-detail1" defer></script></head>')
  }`,
  `  if (styleCommunityRouteV602 && !output.includes('orimia-style-system-v602')) {
    const styleDetailPreflightV606 = /^\\/u\\/community\\/[^/]+\\/?$/.test(pathname)
      ? '<style id="orimia-style-first-paint-v606-guard">body .community-detail-page article{position:relative!important;visibility:hidden!important;pointer-events:none!important}body .community-detail-page article::before{content:"";visibility:visible!important;display:block!important;box-sizing:border-box;width:100%;height:clamp(430px,68dvh,680px);border:1px solid #eaded7;border-radius:8px;background:#fff}body .community-detail-page article::after{content:"";visibility:visible!important;position:absolute;top:112px;right:24px;left:24px;height:clamp(250px,42dvh,410px);border-radius:6px;background:#f2ebe6}@media(max-width:767px){body .community-detail-page article::before{height:min(72dvh,620px)}body .community-detail-page article::after{top:92px;right:14px;left:14px;height:min(44dvh,360px)}}</style><script id="orimia-style-first-paint-v606">document.documentElement.classList.add("orimia-style-pending-v606");window.setTimeout(function(){var guard=document.getElementById("orimia-style-first-paint-v606-guard");if(guard)guard.remove();document.documentElement.classList.remove("orimia-style-pending-v606")},10000)</script>'
      : ''
    output = output.replace('</head>', styleDetailPreflightV606 + '<link id="orimia-style-system-v602-style" rel="stylesheet" href="/style-system-integration-v602.css?v=606-first-paint1"><script id="orimia-style-system-v602" src="/style-system-integration-v602.js?v=606-first-paint1" defer></script></head>')
  }`,
  1,
  'synchronous style preflight',
)

const readinessAnchor = `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Style-Detail', 'v605') /* customer-style-detail-v605-ready */`
replaceExact(
  server,
  readinessAnchor,
  `${readinessAnchor}\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Style-First-Paint', 'v606') /* ${marker}-ready */`,
  1,
  'first-paint readiness header',
)

fs.writeFileSync('/tmp/customer-style-first-paint-v606-changes.json', JSON.stringify(changes))
console.log(JSON.stringify({ release:marker, modified:[...new Set(changes.map(change => change.file))] }))
