;(() => {
  if (window.__orimiaBrandV503) return
  window.__orimiaBrandV503 = true
  window.__orimiaBrandV501 = true

  const STORE_BRAND = 'ORIMIA for Salon'
  const CUSTOMER_BRAND = 'Powered by ORIMIA'
  const HOME_URL = 'https://salon-de-lien.com/'
  const ICON_192 = '/brand/orimia-icon-192.png?v=503'
  const pendingRoots = new Set()
  let scheduled = false

  function isCustomerRoute() {
    return /^\/(?:u|app|review|proposals|intake|feedback|care|appointments|referral)(?:\/|$)/.test(location.pathname)
  }

  function routeBrand() {
    return isCustomerRoute() ? CUSTOMER_BRAND : STORE_BRAND
  }

  function replaceServiceBrand(value) {
    const current = String(value || '')
    const normalized = current
      .replaceAll(STORE_BRAND, 'ORIMIA')
      .replaceAll(CUSTOMER_BRAND, 'ORIMIA')
      .replace(/ORIMIA\s+CRM/gi, 'ORIMIA')
      .replace(/ORIMIA\s+Customer\s+Portal/gi, 'ORIMIA')
    return normalized.replace(/ORIMIA/g, routeBrand())
  }

  function applyTextNode(node) {
    const parent = node.parentElement
    if (!parent || /^(SCRIPT|STYLE|NOSCRIPT|TEXTAREA)$/.test(parent.tagName)) return
    const next = replaceServiceBrand(node.nodeValue)
    if (next !== node.nodeValue) node.nodeValue = next
  }

  function setAttributeBrand(element, name) {
    if (!element.hasAttribute?.(name)) return
    const current = element.getAttribute(name) || ''
    const next = replaceServiceBrand(current)
    if (next !== current) element.setAttribute(name, next)
  }

  function applyText(root) {
    if (!root) return
    if (root.nodeType === Node.TEXT_NODE) return applyTextNode(root)
    if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE) return
    if (root.nodeType === Node.ELEMENT_NODE) {
      for (const name of ['aria-label', 'alt', 'title', 'placeholder']) setAttributeBrand(root, name)
    }
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    let textNode
    while ((textNode = walker.nextNode())) applyTextNode(textNode)
    root.querySelectorAll?.('[aria-label],[alt],[title],[placeholder]').forEach(element => {
      for (const name of ['aria-label', 'alt', 'title', 'placeholder']) setAttributeBrand(element, name)
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
    const brand = routeBrand()
    let title = replaceServiceBrand(document.title)
    if (/Salon\s+de\s+Lien\s*$/i.test(title)) {
      title = title.replace(/Salon\s+de\s+Lien\s*$/i, brand)
    }
    if (title !== document.title) document.title = title
    upsertMeta('application-name', brand)
    upsertMeta('apple-mobile-web-app-title', brand)
    upsertMeta('theme-color', '#ffffff')
    upsertMeta('mobile-web-app-capable', 'yes')
    upsertMeta('apple-mobile-web-app-capable', 'yes')
    upsertMeta('apple-mobile-web-app-status-bar-style', 'default')
    upsertLink('orimia-favicon-32', { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/brand/orimia-icon-32.png?v=503' })
    upsertLink('orimia-favicon-192', { rel: 'icon', type: 'image/png', sizes: '192x192', href: ICON_192 })
    upsertLink('orimia-apple-touch-icon', { rel: 'apple-touch-icon', sizes: '180x180', href: '/brand/orimia-icon-180.png?v=503' })
    upsertLink('orimia-manifest', {
      rel: 'manifest',
      href: isCustomerRoute() ? '/powered-by-orimia.webmanifest?v=503' : '/orimia-for-salon.webmanifest?v=503',
    })
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
    element.setAttribute('aria-label', `${routeBrand()}トップへ`)
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
      'span.grid.h-12.w-12.rounded-2xl',
      '[role="img"][aria-label*="店舗アイコン"]',
      '[role="img"][aria-label*="サービスアイコン"]',
      '[style*="salon-customer-service-mark"]',
      '[style*="orimia-icon"]',
      'img[src*="salon-customer-service-mark"]',
      'img[src*="orimia-icon"]',
    ].join(',')
    const candidates = [...(root.matches?.(selector) ? [root] : []), ...root.querySelectorAll(selector)]
    for (const candidate of candidates) {
      if (candidate.classList.contains('lien-route-line-v461')) continue
      candidate.classList.add('orimia-brand-icon')
      const setImportant = (property, value) => {
        if (candidate.style.getPropertyValue(property) === value && candidate.style.getPropertyPriority(property) === 'important') return
        candidate.style.setProperty(property, value, 'important')
      }
      setImportant('border', '0px')
      setImportant('border-radius', '0px')
      setImportant('background-color', 'transparent')
      setImportant('box-shadow', 'none')
      setImportant('padding', '0px')
      if (candidate instanceof HTMLImageElement) {
        if (!candidate.src.includes('/brand/orimia-icon-192.png')) candidate.src = ICON_192
      } else {
        setImportant('background-image', `url("${ICON_192}")`)
        setImportant('background-position', 'center')
        setImportant('background-repeat', 'no-repeat')
        setImportant('background-size', 'contain')
        setImportant('color', 'transparent')
      }
      bindIconHomeLink(candidate)
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
    if (window.__orimiaBrandV503Active) return
    window.__orimiaBrandV503Active = true
    let style = document.getElementById('orimia-brand-style-v503')
    if (!style) {
      style = document.createElement('style')
      style.id = 'orimia-brand-style-v503'
      document.head.appendChild(style)
    }
    style.textContent = `
      html body .orimia-brand-icon{
        overflow:visible!important;
        border:0!important;
        border-radius:0!important;
        background-color:transparent!important;
        background-image:url("${ICON_192}")!important;
        background-position:center!important;
        background-repeat:no-repeat!important;
        background-size:contain!important;
        box-shadow:none!important;
        color:transparent!important;
        padding:0!important;
      }
      html body img.orimia-brand-icon{object-fit:contain!important}
      html body .orimia-brand-icon::before,html body .orimia-brand-icon::after{display:none!important;content:none!important}
    `
    apply(document)
    new MutationObserver(records => {
      for (const record of records) {
        if (record.type === 'characterData') schedule(record.target)
        else {
          schedule(record.target)
          record.addedNodes.forEach(schedule)
        }
      }
    }).observe(document.documentElement, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['aria-label', 'alt', 'title', 'placeholder', 'src'],
    })
    window.addEventListener('pageshow', () => schedule(document.documentElement))
    window.addEventListener('popstate', () => schedule(document.documentElement))
  }

  const startAfterHydration = () => window.setTimeout(start, 700)
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startAfterHydration, { once: true })
  else startAfterHydration()
})()
