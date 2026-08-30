;(() => {
  if (window.__orimiaBrandV500) return
  window.__orimiaBrandV500 = true

  const BRAND = 'ORIMIA'
  const HOME_URL = 'https://salon-de-lien.com/'
  const ICON_192 = '/brand/orimia-icon-192.png?v=500'
  const BRAND_PATTERN = /(?:Salon\s+de\s+Lien|サロン・ド・リアン)/gi
  const pendingRoots = new Set()
  let scheduled = false

  function replaceBrand(value) {
    return String(value || '')
      .replace(BRAND_PATTERN, BRAND)
      .replace(/Salon\s+CRM/gi, 'ORIMIA CRM')
  }

  function setAttributeBrand(element, name) {
    if (!element.hasAttribute?.(name)) return
    const current = element.getAttribute(name) || ''
    const next = replaceBrand(current)
    if (next !== current) element.setAttribute(name, next)
  }

  function applyText(root) {
    if (!root) return
    if (root.nodeType === Node.TEXT_NODE) {
      const parent = root.parentElement
      if (parent && !/^(SCRIPT|STYLE|NOSCRIPT|TEXTAREA)$/.test(parent.tagName)) {
        const next = replaceBrand(root.nodeValue)
        if (next !== root.nodeValue) root.nodeValue = next
      }
      return
    }
    if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE) return

    const element = root.nodeType === Node.ELEMENT_NODE ? root : null
    if (element) {
      for (const name of ['aria-label', 'alt', 'title', 'placeholder']) setAttributeBrand(element, name)
    }

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    let textNode
    while ((textNode = walker.nextNode())) applyText(textNode)
    root.querySelectorAll?.('[aria-label],[alt],[title],[placeholder]').forEach(candidate => {
      for (const name of ['aria-label', 'alt', 'title', 'placeholder']) setAttributeBrand(candidate, name)
    })
  }

  function upsertMeta(name, content) {
    let meta = document.head.querySelector(`meta[name="${name}"]`)
    if (!meta) {
      meta = document.createElement('meta')
      meta.name = name
      document.head.appendChild(meta)
    }
    if (meta.content !== content) meta.content = content
  }

  function upsertLink(id, attributes) {
    let link = document.getElementById(id)
    if (!link) {
      link = document.createElement('link')
      link.id = id
      document.head.appendChild(link)
    }
    for (const [name, value] of Object.entries(attributes)) {
      if (link.getAttribute(name) !== value) link.setAttribute(name, value)
    }
  }

  function applyHead() {
    const title = replaceBrand(document.title)
    if (title !== document.title) document.title = title
    upsertMeta('application-name', BRAND)
    upsertMeta('apple-mobile-web-app-title', BRAND)
    upsertMeta('theme-color', '#ffffff')
    upsertMeta('mobile-web-app-capable', 'yes')
    upsertMeta('apple-mobile-web-app-capable', 'yes')
    upsertMeta('apple-mobile-web-app-status-bar-style', 'default')
    upsertLink('orimia-favicon-32', { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/brand/orimia-icon-32.png?v=500' })
    upsertLink('orimia-favicon-192', { rel: 'icon', type: 'image/png', sizes: '192x192', href: ICON_192 })
    upsertLink('orimia-apple-touch-icon', { rel: 'apple-touch-icon', sizes: '180x180', href: '/brand/orimia-icon-180.png?v=500' })
    upsertLink('orimia-manifest', { rel: 'manifest', href: '/orimia.webmanifest?v=500' })
  }

  function bindIconHomeLink(element) {
    const link = element.closest('a')
    if (link) {
      if (link.href !== HOME_URL) link.href = HOME_URL
      return
    }
    if (element.dataset.orimiaHomeLink === '1') return
    element.dataset.orimiaHomeLink = '1'
    element.setAttribute('role', 'link')
    element.setAttribute('tabindex', '0')
    element.setAttribute('aria-label', 'ORIMIAトップへ')
    element.style.cursor = 'pointer'
    element.addEventListener('click', () => window.location.assign(HOME_URL))
    element.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return
      event.preventDefault()
      window.location.assign(HOME_URL)
    })
  }

  function applyBrandIcons(root) {
    if (!root?.querySelectorAll) return
    const selector = [
      '.mark',
      '.admin-brand .brand-logo',
      '[role="img"][aria-label*="サービスアイコン"]',
      '[style*="salon-customer-service-mark"]',
      'img[src*="salon-customer-service-mark"]',
      'img[src*="orimia-icon"]'
    ].join(',')
    const candidates = [...(root.matches?.(selector) ? [root] : []), ...root.querySelectorAll(selector)]
    for (const candidate of candidates) {
      candidate.classList.add('orimia-brand-icon')
      if (candidate instanceof HTMLImageElement) {
        if (!candidate.src.includes('/brand/orimia-icon-192.png')) candidate.src = ICON_192
      } else if (!String(candidate.style.backgroundImage || '').includes('orimia-icon-192.png') || candidate.style.getPropertyPriority('background-image') !== 'important') {
        candidate.style.setProperty('background-image', `url("${ICON_192}")`, 'important')
      }
      bindIconHomeLink(candidate)
    }

    const spans = [...(root.matches?.('span') ? [root] : []), ...root.querySelectorAll('span')]
    for (const span of spans) {
      if (span.textContent?.trim() !== 'L' || !span.parentElement?.textContent?.includes(BRAND)) continue
      span.textContent = ''
      span.classList.add('orimia-brand-icon')
      span.style.setProperty('background-image', `url("${ICON_192}")`, 'important')
      bindIconHomeLink(span)
    }

    const brandLabels = [...(root.matches?.('p') ? [root] : []), ...root.querySelectorAll('p')]
    for (const label of brandLabels) {
      if (label.textContent?.trim() !== BRAND) continue
      const panel = label.parentElement?.parentElement
      const mark = panel?.firstElementChild
      if (!(mark instanceof HTMLElement) || !mark.querySelector('svg')) continue
      mark.replaceChildren()
      mark.classList.add('orimia-brand-icon')
      mark.style.setProperty('background-image', `url("${ICON_192}")`, 'important')
      bindIconHomeLink(mark)
    }
  }

  function apply(root) {
    applyText(root)
    applyBrandIcons(root)
    applyHead()
  }

  function flush() {
    scheduled = false
    const roots = [...pendingRoots]
    pendingRoots.clear()
    for (const root of roots) apply(root)
  }

  function schedule(root) {
    pendingRoots.add(root?.nodeType ? root : document.documentElement)
    if (scheduled) return
    scheduled = true
    window.requestAnimationFrame(flush)
  }

  function start() {
    let style = document.getElementById('orimia-brand-style-v500')
    if (!style) {
      style = document.createElement('style')
      style.id = 'orimia-brand-style-v500'
      style.textContent = 'html body .orimia-brand-icon{background-color:#fff!important;background-image:url("/brand/orimia-icon-192.png?v=500")!important;background-position:center!important;background-repeat:no-repeat!important;background-size:cover!important;color:transparent!important}.mark.orimia-brand-icon{overflow:hidden!important}.admin-brand img.orimia-brand-icon,img.orimia-brand-icon{object-fit:cover!important}'
      document.head.appendChild(style)
    }
    apply(document)
    new MutationObserver(records => {
      for (const record of records) {
        if (record.type === 'characterData') schedule(record.target)
        else {
          schedule(record.target)
          record.addedNodes.forEach(schedule)
        }
      }
    }).observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['aria-label', 'alt', 'title', 'placeholder', 'src', 'style'] })
    window.addEventListener('pageshow', () => schedule(document.documentElement))
    window.addEventListener('popstate', () => schedule(document.documentElement))
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true })
  else start()
})()
