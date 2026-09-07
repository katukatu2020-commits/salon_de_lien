;(() => {
  'use strict'

  if (window.__orimiaAdminHomeVisualV573) return
  window.__orimiaAdminHomeVisualV573 = { version:'v573' }

  const API = '/api/lien-customer-home-branding?audience=staff'
  const IMAGE_API_PATH = '/api/lien-customer-home-branding/image'
  const DEFAULT_IMAGE = '/brand/salon-interior-illustrated.png'
  const VISUAL_FILENAMES = new Set([
    'salon-interior-illustrated.png',
    'customer-crm.webp',
    'points-management.webp',
    'customer-hair-care.webp',
    'customer-hair-care-male.png',
    'salon-product-shelf-illustrated.png',
    'consultation.webp',
    'salon-style-short-dark.jpg',
    'product-collection.webp',
    'customer-visit-history-v2.png',
    'customer-profile-v2.png',
  ])

  let imageUrl = DEFAULT_IMAGE
  let requestSequence = 0
  let frame = 0
  let refreshTimer = 0

  function normalizedSource(value) {
    try {
      return decodeURIComponent(String(value || ''))
    } catch {
      return String(value || '')
    }
  }

  function configuredImageUrl(value) {
    try {
      const url = new URL(String(value || DEFAULT_IMAGE), location.origin)
      if (url.origin !== location.origin) return DEFAULT_IMAGE
      if (url.pathname === IMAGE_API_PATH || url.pathname === DEFAULT_IMAGE) return `${url.pathname}${url.search}`
    } catch {}
    return DEFAULT_IMAGE
  }

  function isStoreVisual(image) {
    if (!(image instanceof HTMLImageElement) || !image.closest('.admin-app-shell')) return false
    if (image.matches('[data-ohb-preview-image]')) return false
    if (image.dataset.orimiaAdminHomeVisualV573 === '1') return true
    const source = normalizedSource([
      image.getAttribute('src'),
      image.getAttribute('srcset'),
      image.currentSrc,
    ].filter(Boolean).join(' '))
    return [...VISUAL_FILENAMES].some(filename => source.includes(`/brand/${filename}`))
  }

  function desiredUrlFor(image) {
    return image.dataset.orimiaAdminHomeVisualV573Failed === imageUrl ? DEFAULT_IMAGE : imageUrl
  }

  function bindImage(image) {
    if (!isStoreVisual(image)) return
    if (!image.dataset.orimiaAdminHomeVisualV573Original) {
      image.dataset.orimiaAdminHomeVisualV573Original = image.getAttribute('src') || ''
    }
    image.dataset.orimiaAdminHomeVisualV573 = '1'
    image.alt = '店舗ホーム表示画像'
    image.loading = 'eager'
    image.decoding = 'async'
    image.removeAttribute('srcset')
    image.removeAttribute('sizes')

    if (image.dataset.orimiaAdminHomeVisualV573ErrorBound !== '1') {
      image.dataset.orimiaAdminHomeVisualV573ErrorBound = '1'
      image.addEventListener('error', () => {
        if (imageUrl === DEFAULT_IMAGE || image.getAttribute('src') === DEFAULT_IMAGE) return
        image.dataset.orimiaAdminHomeVisualV573Failed = imageUrl
        image.removeAttribute('srcset')
        image.removeAttribute('sizes')
        image.setAttribute('src', DEFAULT_IMAGE)
      })
    }

    const desired = desiredUrlFor(image)
    if (image.getAttribute('src') !== desired) image.setAttribute('src', desired)
  }

  function applyAll(root = document) {
    if (root instanceof HTMLImageElement) bindImage(root)
    root.querySelectorAll?.('img').forEach(bindImage)
  }

  function setConfiguredImage(value) {
    const next = configuredImageUrl(value)
    if (next !== imageUrl) {
      imageUrl = next
      document.querySelectorAll('[data-orimia-admin-home-visual-v573-failed]').forEach(image => {
        delete image.dataset.orimiaAdminHomeVisualV573Failed
      })
    }
    document.documentElement.dataset.orimiaAdminHomeVisualV573 = imageUrl
    applyAll()
  }

  function reveal() {
    document.documentElement.classList.remove('orimia-admin-home-visual-pending-v573')
    document.documentElement.classList.add('orimia-admin-home-visual-ready-v573')
  }

  async function refresh() {
    const sequence = ++requestSequence
    try {
      const response = await fetch(`${API}&v=${Date.now()}`, {
        credentials:'same-origin',
        cache:'no-store',
        headers:{ Accept:'application/json' },
      })
      if (!response.ok) throw new Error(`branding_${response.status}`)
      const payload = await response.json()
      if (sequence !== requestSequence) return
      setConfiguredImage(payload?.branding?.imageUrl || DEFAULT_IMAGE)
    } catch {
      if (sequence === requestSequence) applyAll()
    } finally {
      if (sequence === requestSequence) reveal()
    }
  }

  function scheduleApply() {
    if (frame) return
    frame = requestAnimationFrame(() => {
      frame = 0
      applyAll()
    })
  }

  function scheduleRefresh(delay = 180) {
    window.clearTimeout(refreshTimer)
    refreshTimer = window.setTimeout(refresh, delay)
  }

  function previewChanged(image) {
    const source = image.getAttribute('src') || ''
    if (source.startsWith('blob:') || source.startsWith('data:')) return
    if (normalizedSource(source).includes(IMAGE_API_PATH) || normalizedSource(source).includes(DEFAULT_IMAGE)) {
      setConfiguredImage(source)
      reveal()
    }
  }

  function start() {
    const observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes' && mutation.target.matches?.('[data-ohb-preview-image]')) {
          previewChanged(mutation.target)
        }
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) applyAll(node)
          })
        }
      }
      scheduleApply()
    })
    observer.observe(document.documentElement, {
      childList:true,
      subtree:true,
      attributes:true,
      attributeFilter:['src', 'srcset'],
    })

    document.addEventListener('click', event => {
      const link = event.target.closest?.('a[href]')
      if (!link) return
      try {
        const destination = new URL(link.href, location.href)
        if (destination.origin === location.origin && destination.pathname.startsWith('/admin/')) scheduleRefresh()
      } catch {}
    }, true)
    window.addEventListener('popstate', () => scheduleRefresh(80))
    window.addEventListener('pageshow', () => scheduleRefresh(0))
    window.addEventListener('orimia:customer-home-branding-updated', event => {
      setConfiguredImage(event.detail?.imageUrl || DEFAULT_IMAGE)
      reveal()
    })

    applyAll()
    refresh()
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true })
  else start()
})()
