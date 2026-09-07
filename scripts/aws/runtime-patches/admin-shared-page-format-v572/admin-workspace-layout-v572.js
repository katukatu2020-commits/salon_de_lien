;(() => {
  'use strict'

  if (window.__orimiaAdminWorkspaceV572) return

  const SOURCE_ATTRIBUTE = 'data-orimia-admin-workspace-source-v572'
  const HOST_ATTRIBUTE = 'data-orimia-admin-workspace-host-v572'
  const ROOT_ATTRIBUTE = 'data-orimia-admin-workspace-root-v572'
  const MAIN_ATTRIBUTE = 'data-orimia-admin-workspace-main-v572'
  const ACTIVE_CLASSES = ['bg-[color:var(--lien-primary)]', 'text-white', 'shadow-sm']
  const INACTIVE_CLASSES = ['text-lien-muted', 'hover:bg-lien-soft', 'hover:text-lien-ink']
  const records = new Map()

  function routeValue(value) {
    try {
      const url = new URL(value, location.origin)
      return `${url.pathname}${url.search}`
    } catch {
      return String(value || '')
    }
  }

  function locate() {
    const main = document.querySelector('.admin-app-shell main.admin-main-content')
    if (!main) return null
    const root = [...main.children].find(element => (
      element.matches('.mx-auto.grid.max-w-7xl.gap-6')
    ))
    return root ? { main, root } : null
  }

  function isPreserved(element, selectors) {
    return selectors.some(selector => {
      try { return element.matches(selector) } catch { return false }
    })
  }

  function setActiveSegment(record, activeHref) {
    if (!activeHref) return
    const activeRoute = routeValue(activeHref)
    for (const nav of record.preserved) {
      for (const link of nav.querySelectorAll('a[href]')) {
        if (!record.segmentState.has(link)) {
          record.segmentState.set(link, {
            className:link.getAttribute('class'),
            ariaCurrent:link.getAttribute('aria-current'),
          })
        }
        const active = routeValue(link.getAttribute('href')) === activeRoute
        link.classList.remove(...(active ? INACTIVE_CLASSES : ACTIVE_CLASSES))
        link.classList.add(...(active ? ACTIVE_CLASSES : INACTIVE_CLASSES))
        if (active) link.setAttribute('aria-current', 'page')
        else link.removeAttribute('aria-current')
      }
    }
  }

  function syncHeader(record) {
    const labels = document.querySelectorAll('.admin-desktop-header > .min-w-0 > p')
    if (labels[0]) labels[0].textContent = 'ORIMIA for Salon'
    if (labels[1] && record.headerTitle) labels[1].textContent = record.headerTitle
    if (record.documentTitle) document.title = record.documentTitle
  }

  function hideSources(record) {
    record.preserved.clear()
    for (const element of [...record.root.children]) {
      if (element === record.host) continue
      if (isPreserved(element, record.preserveSelectors)) {
        element.removeAttribute(SOURCE_ATTRIBUTE)
        record.preserved.add(element)
      } else {
        element.setAttribute(SOURCE_ATTRIBUTE, record.key)
      }
    }
    setActiveSegment(record, record.activeHref)
  }

  function unmount(key) {
    const record = records.get(key)
    if (!record) return false

    record.host.remove()
    record.root.querySelectorAll(`:scope > [${SOURCE_ATTRIBUTE}="${CSS.escape(key)}"]`).forEach(element => {
      element.removeAttribute(SOURCE_ATTRIBUTE)
    })
    for (const [link, state] of record.segmentState) {
      if (!link.isConnected) continue
      if (state.className === null) link.removeAttribute('class')
      else link.setAttribute('class', state.className)
      if (state.ariaCurrent === null) link.removeAttribute('aria-current')
      else link.setAttribute('aria-current', state.ariaCurrent)
    }
    if (record.root.getAttribute(ROOT_ATTRIBUTE) === key) record.root.removeAttribute(ROOT_ATTRIBUTE)
    if (record.main.getAttribute(MAIN_ATTRIBUTE) === key) record.main.removeAttribute(MAIN_ATTRIBUTE)

    const labels = document.querySelectorAll('.admin-desktop-header > .min-w-0 > p')
    if (labels[1] && labels[1].textContent === record.headerTitle && record.previousHeaderTitle) {
      labels[1].textContent = record.previousHeaderTitle
    }
    if (document.title === record.documentTitle && record.previousDocumentTitle) {
      document.title = record.previousDocumentTitle
    }
    records.delete(key)
    document.dispatchEvent(new CustomEvent('orimia:admin-workspace-unmounted', { detail:{ key } }))
    return true
  }

  function mount(options) {
    const key = String(options?.key || '').trim()
    if (!key) throw new Error('A workspace key is required.')

    const location = locate()
    if (!location) return null
    const current = records.get(key)
    if (current && current.root === location.root && current.host.isConnected) {
      current.preserveSelectors = [...(options.preserveSelectors || current.preserveSelectors)]
      current.activeHref = options.activeHref || current.activeHref
      current.headerTitle = options.headerTitle || current.headerTitle
      current.documentTitle = options.documentTitle || current.documentTitle
      hideSources(current)
      syncHeader(current)
      return current
    }
    if (current) unmount(key)
    for (const mountedKey of [...records.keys()]) unmount(mountedKey)

    const labels = document.querySelectorAll('.admin-desktop-header > .min-w-0 > p')
    const host = document.createElement('div')
    host.className = 'orimia-admin-workspace-host-v572'
    host.setAttribute(HOST_ATTRIBUTE, key)
    const record = {
      key,
      main:location.main,
      root:location.root,
      host,
      preserveSelectors:[...(options.preserveSelectors || [])],
      activeHref:options.activeHref || '',
      headerTitle:options.headerTitle || '',
      documentTitle:options.documentTitle || '',
      previousHeaderTitle:labels[1]?.textContent || '',
      previousDocumentTitle:document.title,
      preserved:new Set(),
      segmentState:new Map(),
    }
    location.root.appendChild(host)
    location.root.setAttribute(ROOT_ATTRIBUTE, key)
    location.main.setAttribute(MAIN_ATTRIBUTE, key)
    records.set(key, record)
    hideSources(record)
    syncHeader(record)
    document.dispatchEvent(new CustomEvent('orimia:admin-workspace-mounted', { detail:{ key } }))
    return record
  }

  let syncFrame = 0
  function scheduleSync() {
    if (syncFrame) return
    syncFrame = requestAnimationFrame(() => {
      syncFrame = 0
      const current = locate()
      if (!current) return
      for (const record of records.values()) {
        if (record.root !== current.root || !record.host.isConnected) continue
        hideSources(record)
        syncHeader(record)
      }
    })
  }

  new MutationObserver(scheduleSync).observe(document.documentElement, { childList:true, subtree:true })
  window.__orimiaAdminWorkspaceV572 = Object.freeze({ version:'v572', locate, mount, unmount })
})()
