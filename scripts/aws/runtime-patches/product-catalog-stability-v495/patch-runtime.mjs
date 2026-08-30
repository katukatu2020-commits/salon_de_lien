import fs from 'node:fs'

const root = process.env.LIEN_APP_ROOT || '/app'
const commercialPath = `${root}/commercial-admin-v101.js`
const staffExperiencePath = `${root}/admin-staff-experience-v276.js`
const serverPath = `${root}/server.js`

function replaceOnce(source, before, after, label) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`)
  return source.replace(before, after)
}

function replaceBetween(source, start, end, replacement, label) {
  const startIndex = source.indexOf(start)
  if (startIndex < 0) throw new Error(`${label}: start marker was not found`)
  const endIndex = source.indexOf(end, startIndex + start.length)
  if (endIndex < 0) throw new Error(`${label}: end marker was not found`)
  if (source.indexOf(start, startIndex + start.length) >= 0) throw new Error(`${label}: start marker was not unique`)
  return source.slice(0, startIndex) + replacement + source.slice(endIndex)
}

let commercial = fs.readFileSync(commercialPath, 'utf8')

commercial = replaceOnce(
  commercial,
  '  const state = { profile: null, profilePromise: null, menus: [], frame: 0, timers: [], storeMenuEventsBound: false, commandGuardBound: false, notificationData: null, notificationPromise: null, notificationTimer: 0, notificationAppointmentsRead: false }',
  '  const state = { profile: null, profilePromise: null, menus: [], frame: 0, timers: [], storeMenuEventsBound: false, commandGuardBound: false, notificationData: null, notificationPromise: null, notificationFetchedAt: 0, notificationTimer: 0, notificationAppointmentsRead: false } /* product-catalog-stability-v495 */',
  'notification request state',
)

commercial = replaceOnce(
  commercial,
  `  async function refreshNotifications(force = false) {
    if (state.notificationPromise && !force) return state.notificationPromise
    state.notificationPromise = Promise.all([`,
  `  async function refreshNotifications(force = false) {
    if (state.notificationPromise) return state.notificationPromise
    if (!force && state.notificationData && Date.now() - state.notificationFetchedAt < 25000) return state.notificationData
    state.notificationPromise = Promise.all([`,
  'notification request throttle',
)

commercial = replaceOnce(
  commercial,
  '      state.notificationData = { staff, billing, profile }\n      const markup = notificationMarkup(state.notificationData)',
  '      state.notificationData = { staff, billing, profile }\n      state.notificationFetchedAt = Date.now()\n      const markup = notificationMarkup(state.notificationData)',
  'notification fetch timestamp',
)

commercial = replaceBetween(
  commercial,
  '  async function enhanceProductImages() {',
  '  const observer = new MutationObserver(() => {',
  `  let productImagesPromise = null
  let productImages = []
  let productImagesFrame = 0
  let productImagesRouteActive = false

  function applyProductImages() {
    if (location.pathname !== '/admin/products') return
    for (const item of productImages) {
      const row = document.getElementById('product-' + item.id) || document.querySelector('[data-product-id="' + CSS.escape(item.id) + '"]')
      if (!row || row.querySelector('.ca-product-uploaded-thumb')) continue
      const target = row.querySelector('td,article>div,div') || row
      const image = document.createElement('img')
      image.className = 'ca-product-uploaded-thumb'
      image.src = item.imageUrl
      image.alt = ''
      target.prepend(image)
    }
  }

  async function enhanceProductImages() { /* product-catalog-stability-v495 */
    if (location.pathname !== '/admin/products') return
    if (!productImagesPromise) {
      window.__lienProductImageFetchCountV495 = Number(window.__lienProductImageFetchCountV495 || 0) + 1
      productImagesPromise = fetch('/api/admin/catalog/product-images', { credentials: 'same-origin', cache: 'no-store' })
        .then(async response => {
          if (!response.ok) return []
          const payload = await response.json()
          productImages = Array.isArray(payload.images) ? payload.images : []
          return productImages
        })
        .catch(error => {
          productImagesPromise = null
          throw error
        })
    }
    try {
      await productImagesPromise
      applyProductImages()
    } catch {}
  }

  function scheduleProductImages() {
    if (location.pathname !== '/admin/products') {
      productImagesRouteActive = false
      return
    }
    if (!productImagesRouteActive) {
      productImagesRouteActive = true
      productImagesPromise = null
      productImages = []
    }
    if (productImagesFrame) return
    productImagesFrame = requestAnimationFrame(() => {
      productImagesFrame = 0
      void enhanceProductImages()
    })
  }

`,
  'product image fetch stability',
)

commercial = replaceOnce(
  commercial,
  `    enhanceProductImages()
  })
  observer.observe(document.documentElement, { childList: true, subtree: true })
  document.addEventListener('DOMContentLoaded', () => { document.querySelectorAll('form').forEach(setupProductImage); isAttendanceRoute() ? renderAttendance() : cleanupAttendancePage(); enhanceProductImages() })
  isAttendanceRoute() ? renderAttendance() : cleanupAttendancePage(); enhanceProductImages()`,
  `    scheduleProductImages()
  })
  observer.observe(document.documentElement, { childList: true, subtree: true })
  document.addEventListener('DOMContentLoaded', () => { document.querySelectorAll('form').forEach(setupProductImage); isAttendanceRoute() ? renderAttendance() : cleanupAttendancePage(); scheduleProductImages() })
  isAttendanceRoute() ? renderAttendance() : cleanupAttendancePage(); scheduleProductImages()`,
  'product image scheduling',
)

fs.writeFileSync(commercialPath, commercial)

let staffExperience = fs.readFileSync(staffExperiencePath, 'utf8')

staffExperience = replaceOnce(
  staffExperience,
  '  const state = { store: null, directory: null, ownProfile: null, timer: 0 }',
  '  const state = { store: null, storePromise: null, directory: null, ownProfile: null, ownProfilePromise: null, timer: 0 } /* product-catalog-stability-v495 */',
  'staff experience request state',
)

staffExperience = replaceOnce(
  staffExperience,
  "  const storeProfile = () => state.store ? Promise.resolve(state.store) : request('/api/admin/store-profile').then(payload => (state.store = payload.profile))",
  `  const storeProfile = () => {
    if (state.store) return Promise.resolve(state.store)
    if (!state.storePromise) state.storePromise = request('/api/admin/store-profile')
      .then(payload => (state.store = payload.profile))
      .catch(error => { state.storePromise = null; throw error })
    return state.storePromise
  }`,
  'store profile in-flight sharing',
)

staffExperience = replaceOnce(
  staffExperience,
  `    try {
      if (!state.ownProfile) state.ownProfile = (await request('/api/admin/staff-profile')).profile
      updateHeaderAvatar(state.ownProfile)
    } catch {}`,
  `    try {
      if (!state.ownProfile) {
        if (!state.ownProfilePromise) state.ownProfilePromise = request('/api/admin/staff-profile')
          .then(payload => (state.ownProfile = payload.profile))
          .catch(error => { state.ownProfilePromise = null; throw error })
        await state.ownProfilePromise
      }
      updateHeaderAvatar(state.ownProfile)
    } catch {}`,
  'staff profile in-flight sharing',
)

fs.writeFileSync(staffExperiencePath, staffExperience)

let server = fs.readFileSync(serverPath, 'utf8')
server = replaceOnce(
  server,
  "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Product-Catalog-Submit', 'v494')",
  "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Product-Catalog-Submit', 'v494')\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Product-Catalog-Stability', 'v495')",
  'production release marker',
)
fs.writeFileSync(serverPath, server)

console.log('product catalog stability v495 runtime patched')
