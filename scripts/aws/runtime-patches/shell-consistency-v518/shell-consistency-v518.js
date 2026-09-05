;(() => {
  'use strict'

  if (window.__orimiaShellConsistencyV518) return
  window.__orimiaShellConsistencyV518 = true

  const HOME_URL = 'https://salon-de-lien.com/'
  const BRAND = 'ORIMIA for Salon'
  const ADMIN_STACK_KEY = 'orimia:admin-path-stack:v501'
  const CUSTOMER_STACK_KEY = 'orimia:customer-path-stack:v518'
  let frame = 0

  const icons = {
    back: '<path d="m12 19-7-7 7-7"></path><path d="M19 12H5"></path>',
    calendar: '<path d="M8 2v4M16 2v4"></path><rect x="3" y="4" width="18" height="18" rx="2"></rect><path d="M3 10h18M8 14h.01M12 14h.01M16 14h.01"></path>',
    users: '<path d="M18 21a8 8 0 0 0-16 0"></path><circle cx="10" cy="8" r="5"></circle><path d="M22 20c0-3.37-2-6.5-4-8"></path>',
    package: '<path d="M12 22V12M3.3 7 12 12l8.7-5"></path><path d="M3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8Z"></path>',
    images: '<rect x="3" y="3" width="18" height="18" rx="2"></rect><circle cx="9" cy="9" r="2"></circle><path d="m21 15-5-5L5 21"></path>',
    chart: '<path d="M3 3v18h18"></path><path d="M8 17v-3M13 17V8M18 17V5"></path>',
  }

  function svg(name, className = '') {
    return `<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`
  }

  function currentRoute() {
    return location.pathname + location.search + location.hash
  }

  function routePath(route) {
    try {
      return new URL(route, location.origin).pathname
    } catch {
      return String(route || '').split(/[?#]/, 1)[0] || '/'
    }
  }

  function samePage(left, right) {
    return routePath(left) === routePath(right)
  }

  function readStack(key) {
    try {
      const value = JSON.parse(sessionStorage.getItem(key) || '[]')
      return Array.isArray(value) ? value.filter(item => typeof item === 'string').slice(-30) : []
    } catch {
      return []
    }
  }

  function writeStack(key, routes) {
    try { sessionStorage.setItem(key, JSON.stringify(routes.slice(-30))) } catch {}
  }

  function recordRoute(key) {
    const route = currentRoute()
    const routes = readStack(key)
    if (key === CUSTOMER_STACK_KEY) {
      while (routes.length && samePage(routes.at(-1), route)) routes.pop()
    }
    if (routes.at(-1) !== route) {
      routes.push(route)
      writeStack(key, routes)
    }
  }

  function navigateBack(key, fallback) {
    const current = currentRoute()
    const routes = readStack(key)
    while (routes.length && (
      routes.at(-1) === current
      || (key === CUSTOMER_STACK_KEY && samePage(routes.at(-1), current))
    )) routes.pop()
    const target = routes.pop() || fallback
    writeStack(key, [...routes, target])
    location.assign(target)
  }

  window.__orimiaCustomerNavigateBackV546 = fallback => {
    navigateBack(CUSTOMER_STACK_KEY, fallback || '/u/home')
  }

  function adminFallback() {
    if (location.pathname.startsWith('/admin/customers/messages')) return '/admin/customers'
    if (/^\/admin\/customers\/[^/]+/.test(location.pathname)) return '/admin/customers'
    if (location.pathname.startsWith('/admin/products')) return '/admin/products?section=menus'
    if (location.pathname.startsWith('/admin/community/')) return '/admin/community'
    if (location.pathname !== '/admin/appointments') return '/admin/appointments'
    return '/admin/customers'
  }

  function ensureAdminBack(header) {
    let button = header.querySelector('[data-store-back-v501],[data-shell-admin-back-v518]')
    if (button) {
      button.classList.add('orimia-admin-back-v518')
      return
    }
    button = document.createElement('button')
    button.type = 'button'
    button.className = 'store-mobile-back-v501 orimia-admin-back-v518'
    button.dataset.storeBackV501 = '1'
    button.dataset.shellAdminBackV518 = '1'
    button.setAttribute('aria-label', '\u524d\u306e\u753b\u9762\u3078\u623b\u308b')
    button.title = '\u623b\u308b'
    button.innerHTML = svg('back')
    button.addEventListener('click', () => navigateBack(ADMIN_STACK_KEY, adminFallback()))
    header.prepend(button)
  }

  function normalizeAdminBrand(sidebar, mobileHeader, desktopHeader) {
    const sidebarBrand = sidebar?.querySelector(':scope > div > div:first-child a')
    const sidebarCopy = sidebarBrand?.querySelector('span.min-w-0')
    const sidebarLines = sidebarCopy ? [...sidebarCopy.children] : []
    if (sidebarBrand) sidebarBrand.href = HOME_URL
    if (sidebarLines[0] && sidebarLines[0].textContent !== BRAND) sidebarLines[0].textContent = BRAND
    if (sidebarLines[1] && sidebarLines[1].textContent !== 'Salon management service') {
      sidebarLines[1].textContent = 'Salon management service'
    }

    const mobileBrand = mobileHeader?.querySelector(':scope > a')
    if (mobileBrand) {
      mobileBrand.href = HOME_URL
      const text = [...mobileBrand.children].find(child => child.tagName !== 'SPAN' || child.getAttribute('role') !== 'img')
      if (text && text.textContent !== BRAND) text.textContent = BRAND
      mobileBrand.setAttribute('aria-label', `${BRAND} \u516c\u5f0f\u30b5\u30a4\u30c8\u3078`)
    }

    const desktopBrand = desktopHeader?.querySelector(':scope > div:first-child > p:first-child')
    if (desktopBrand && desktopBrand.textContent !== BRAND) desktopBrand.textContent = BRAND
  }

  function normalizeServiceIcons() {
    const selector = [
      '.mark',
      '.admin-brand .brand-logo',
      '[role="img"][aria-label*="\u5e97\u8217\u30a2\u30a4\u30b3\u30f3"]',
      '[role="img"][aria-label*="\u30b5\u30fc\u30d3\u30b9\u30a2\u30a4\u30b3\u30f3"]',
      '[style*="salon-customer-service-mark"]',
      '[style*="orimia-icon"]',
      'img[src*="salon-customer-service-mark"]',
      'img[src*="orimia-icon"]',
    ].join(',')
    document.querySelectorAll(selector).forEach(icon => {
      if (icon.classList.contains('lien-route-line-v461')) return
      icon.classList.add('orimia-shell-brand-icon-v518')
      if (icon instanceof HTMLImageElement) {
        if (!icon.src.includes('/brand/orimia-icon-192.png?v=518')) icon.src = '/brand/orimia-icon-192.png?v=518'
      } else {
        icon.style.setProperty('background-image', 'url("/brand/orimia-icon-192.png?v=518")', 'important')
        icon.style.setProperty('background-position', 'center', 'important')
        icon.style.setProperty('background-repeat', 'no-repeat', 'important')
        icon.style.setProperty('background-size', 'contain', 'important')
        icon.style.setProperty('color', 'transparent', 'important')
      }
      const link = icon.closest('a')
      if (link && (link.closest('.admin-mobile-header') || link.closest('.admin-desktop-sidebar'))) link.href = HOME_URL
    })
  }

  function adminNavItems() {
    return [
      ['calendar', '\u4e88\u7d04', '/admin/appointments', pathname => pathname === '/admin/appointments'],
      ['users', '\u9867\u5ba2', '/admin/customers', pathname => pathname.startsWith('/admin/customers')],
      ['package', '\u5546\u54c1', '/admin/products?section=menus', pathname => pathname.startsWith('/admin/products')],
      ['images', '\u30b9\u30bf\u30a4\u30eb', '/admin/community', pathname => pathname.startsWith('/admin/community')],
      ['chart', '\u96c6\u8a08', '/admin/owner-analytics', pathname => pathname.startsWith('/admin/owner-analytics')],
    ]
  }

  function ensureAdminBottomNav(shell) {
    if (!shell || location.pathname === '/admin/login') {
      document.getElementById('admin-mobile-bottom-nav-v518')?.remove()
      return
    }
    let nav = document.getElementById('admin-mobile-bottom-nav-v518')
    if (!nav) {
      nav = document.createElement('nav')
      nav.id = 'admin-mobile-bottom-nav-v518'
      nav.className = 'orimia-admin-bottom-nav-v518'
      nav.dataset.adminBottomNavV518 = '1'
      nav.setAttribute('aria-label', '\u5e97\u8217\u30a2\u30d7\u30ea\u30e1\u30cb\u30e5\u30fc')
      document.body.appendChild(nav)
    }
    const signature = location.pathname + location.search
    if (nav.dataset.routeV518 === signature) return
    nav.dataset.routeV518 = signature
    nav.replaceChildren(...adminNavItems().map(([icon, label, href, active]) => {
      const link = document.createElement('a')
      link.href = href
      link.className = 'orimia-admin-bottom-link-v518'
      link.innerHTML = `${svg(icon, 'orimia-admin-bottom-icon-v518')}<span>${label}</span>`
      if (active(location.pathname)) {
        link.classList.add('is-active')
        link.setAttribute('aria-current', 'page')
      }
      return link
    }))
  }

  function syncSidebarState(sidebar, shell) {
    if (!sidebar) return
    const stage = shell?.querySelector(':scope > div.min-w-0')
    const toggle = document.querySelector('.ts-sidebar-toggle,[aria-label="\u30b5\u30a4\u30c9\u30d0\u30fc\u3092\u9589\u3058\u308b"],[aria-label="\u30b5\u30a4\u30c9\u30d0\u30fc\u3092\u958b\u304f"]')
    const collapsed = sidebar.classList.contains('-translate-x-full')
      || toggle?.getAttribute('aria-label') === '\u30b5\u30a4\u30c9\u30d0\u30fc\u3092\u958b\u304f'
    document.documentElement.classList.toggle('orimia-admin-sidebar-collapsed-v518', Boolean(collapsed))
    if (window.matchMedia('(min-width: 768px)').matches) {
      for (const property of ['width', 'min-width', 'max-width']) {
        sidebar.style.setProperty(property, '18rem', 'important')
      }
      stage?.style.setProperty('padding-left', collapsed ? '0px' : '18rem', 'important')
    } else {
      stage?.style.removeProperty('padding-left')
    }
    if (toggle) {
      toggle.classList.add('orimia-admin-sidebar-toggle-v518')
      toggle.style.setProperty('left', collapsed ? '.75rem' : '17rem')
      if (toggle.dataset.shellSidebarV518 !== '1') {
        toggle.dataset.shellSidebarV518 = '1'
        toggle.addEventListener('click', () => window.setTimeout(schedule, 0))
      }
    }
  }

  function enhanceAdminShell() {
    const root = document.documentElement
    const active = location.pathname === '/admin' || location.pathname.startsWith('/admin/')
    root.classList.toggle('orimia-admin-shell-v518', active)
    if (!active || location.pathname === '/admin/login') {
      document.getElementById('admin-mobile-bottom-nav-v518')?.remove()
      root.classList.remove('orimia-admin-sidebar-collapsed-v518')
      return
    }

    recordRoute(ADMIN_STACK_KEY)
    const shell = document.querySelector('.admin-app-shell')
    const sidebar = shell?.querySelector(':scope > aside.admin-desktop-sidebar')
    const mobileHeader = shell?.querySelector('.admin-mobile-header')
    const desktopHeader = shell?.querySelector('.admin-desktop-header')
    if (mobileHeader) {
      mobileHeader.classList.add('orimia-admin-mobile-header-v518')
      ensureAdminBack(mobileHeader)
    }
    normalizeAdminBrand(sidebar, mobileHeader, desktopHeader)
    normalizeServiceIcons()
    syncSidebarState(sidebar, shell)
    ensureAdminBottomNav(shell)
  }

  function customerPrimaryRoute() {
    return location.pathname === '/u/home' || location.pathname === '/u/login' || location.pathname === '/u'
  }

  function ensureCustomerBack(header) {
    const secondary = !customerPrimaryRoute()
    header.classList.toggle('is-secondary-v518', secondary)
    let button = header.querySelector('[data-customer-shell-back-v518]')
    if (!secondary) {
      button?.remove()
      return
    }
    if (!button) {
      button = document.createElement('button')
      button.type = 'button'
      button.className = 'orimia-customer-back-v518'
      button.dataset.customerShellBackV518 = '1'
      button.setAttribute('aria-label', '\u524d\u306e\u753b\u9762\u3078\u623b\u308b')
      button.title = '\u623b\u308b'
      button.innerHTML = svg('back')
      button.addEventListener('click', () => navigateBack(CUSTOMER_STACK_KEY, '/u/home'))
      header.prepend(button)
    }
  }

  function normalizeCustomerBrand(header) {
    const brand = header?.querySelector('a[href="/u/home"].customer-premium-brand,a[href="/u/home"].brand')
      || header?.querySelector('a[href="/u/home"]')
    if (!brand) return
    brand.classList.add('orimia-customer-brand-v518')
    brand.setAttribute('aria-label', `${BRAND} \u30db\u30fc\u30e0`)
    const children = [...brand.children]
    let title = children[0]
    let subtitle = children[1]
    if (!title) {
      title = document.createElement('span')
      brand.appendChild(title)
    }
    if (!subtitle) {
      subtitle = document.createElement('span')
      brand.appendChild(subtitle)
    }
    if (title.className !== 'orimia-customer-brand-title-v518') title.className = 'orimia-customer-brand-title-v518'
    if (subtitle.className !== 'orimia-customer-brand-subtitle-v518') subtitle.className = 'orimia-customer-brand-subtitle-v518'
    if (title.textContent !== BRAND) title.textContent = BRAND
    if (subtitle.textContent !== 'Beauty Membership') subtitle.textContent = 'Beauty Membership'
  }

  function enhanceCustomerHeader() {
    const active = location.pathname === '/u' || location.pathname.startsWith('/u/')
    document.documentElement.classList.toggle('orimia-customer-shell-v518', active)
    if (!active) return
    recordRoute(CUSTOMER_STACK_KEY)

    const header = document.querySelector('.customer-premium-topbar,.topbar,.app-header')
    if (header && location.pathname !== '/u/login') {
      header.classList.add('orimia-customer-header-v518')
      header.querySelector('a[href="/u/menu"]')?.classList.add('orimia-customer-menu-v518')
      header.querySelector('a[href="/u/news"]')?.classList.add('orimia-customer-news-v518')
      ensureCustomerBack(header)
      normalizeCustomerBrand(header)
      document.querySelectorAll('.customer-page-back').forEach(link => link.classList.add('orimia-customer-page-back-v518'))
    }

    document.querySelectorAll('.cx-login-brandbar-v508 strong').forEach(title => { title.textContent = BRAND })
    if (document.title.includes('Powered by ORIMIA')) document.title = document.title.replaceAll('Powered by ORIMIA', BRAND)
  }

  function syncHeadBrand() {
    if (!(location.pathname === '/u' || location.pathname.startsWith('/u/'))) return
    for (const name of ['application-name', 'apple-mobile-web-app-title']) {
      const meta = document.head.querySelector(`meta[name="${name}"]`)
      if (meta) meta.content = BRAND
    }
    const manifest = document.getElementById('orimia-manifest') || document.head.querySelector('link[rel="manifest"]')
    if (manifest) manifest.href = '/orimia-for-salon.webmanifest?v=518'
  }

  function apply() {
    enhanceAdminShell()
    enhanceCustomerHeader()
    syncHeadBrand()
    document.documentElement.dataset.orimiaShellReady = 'v518'
  }

  function schedule() {
    if (frame) return
    frame = window.requestAnimationFrame(() => {
      frame = 0
      apply()
    })
  }

  function start() {
    apply()
    new MutationObserver(schedule).observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'aria-label'],
    })
    window.addEventListener('pageshow', schedule)
    window.addEventListener('popstate', schedule)
    window.addEventListener('resize', schedule, { passive: true })
    window.addEventListener('orimia:ui-runtime-ready', apply)
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true })
  else start()
})()
