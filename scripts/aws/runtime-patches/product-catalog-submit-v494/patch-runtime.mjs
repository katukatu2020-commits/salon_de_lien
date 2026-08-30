import fs from 'node:fs'

const root = process.env.LIEN_APP_ROOT || '/app'
const commercialPath = `${root}/commercial-admin-v101.js`
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

commercial = replaceBetween(
  commercial,
  '  async function handleCatalogCreateSubmit(event) {',
  '  const jsonArray = value => {',
  `  function catalogCreateSubmit(form) { /* product-catalog-submit-v494 */
    if (!form || form.closest('.ca-overlay')) return null
    if (form.matches('[data-menu-delete-form],[data-product-delete-form]')) return null
    const submit = form.querySelector('[type="submit"]')
    if (String(submit?.textContent || '').replace(/\\s+/g, '') !== '商品を登録') return null
    const isProductCreate = form.querySelector('[name="manufacturerName"]')
      && form.querySelector('[name="name"]')
      && form.querySelector('[name="retailPrice"]')
      && form.querySelector('[name="stockQuantity"]')
      && !form.querySelector('[name="productId"]')
    return isProductCreate ? submit : null
  }

  function stopCatalogCreateEvent(event) {
    event.preventDefault()
    event.stopPropagation()
    event.stopImmediatePropagation()
  }

  async function submitCatalogCreateForm(form, submit) {
    if (form.dataset.caCatalogCreating === '1') return
    form.dataset.caCatalogCreating = '1'
    const original = submit.innerHTML
    submit.disabled = true
    submit.setAttribute('aria-busy', 'true')
    submit.textContent = '登録しています…'
    try {
      const data = new URLSearchParams(new FormData(form))
      data.set('kind', 'product')
      data.set('action', 'create')
      const payload = await postCatalog(data)
      const id = String(payload?.result?.id || '')
      const target = \`/admin/products?notice=product-created\${id ? \`&focus=\${encodeURIComponent(id)}#product-\${encodeURIComponent(id)}\` : '#product-catalog'}\`
      window.location.assign(target)
    } catch (error) {
      form.dataset.caCatalogCreating = '0'
      submit.disabled = false
      submit.removeAttribute('aria-busy')
      submit.innerHTML = original
      toast(error?.message || '商品を登録できませんでした。', 'error')
    }
  }

  async function handleCatalogCreateSubmit(event) {
    const form = event.target?.closest?.('form')
    const submit = catalogCreateSubmit(form)
    if (!submit) return
    stopCatalogCreateEvent(event)
    if (!form.reportValidity()) return
    await submitCatalogCreateForm(form, submit)
  }

  function handleCatalogCreateClick(event) {
    const clicked = event.target?.closest?.('button[type="submit"],input[type="submit"]')
    const form = clicked?.form
    const submit = catalogCreateSubmit(form)
    if (!submit || clicked !== submit) return
    stopCatalogCreateEvent(event)
    if (!form.reportValidity()) return
    void submitCatalogCreateForm(form, submit)
  }

`,
  'catalog create submission',
)

commercial = replaceOnce(
  commercial,
  `      if (!badge) { badge = document.createElement('span'); badge.className = 'ca-notification-badge'; button.appendChild(badge) }
      badge.textContent = count > 99 ? '99+' : String(count)
      button.setAttribute('aria-label', \`お知らせ \${count}件\`)`,
  `      if (!badge) { badge = document.createElement('span'); badge.className = 'ca-notification-badge'; button.appendChild(badge) }
      const badgeText = count > 99 ? '99+' : String(count)
      if (badge.textContent !== badgeText) badge.textContent = badgeText
      const ariaLabel = \`お知らせ \${count}件\`
      if (button.getAttribute('aria-label') !== ariaLabel) button.setAttribute('aria-label', ariaLabel)`,
  'notification badge idempotency',
)

commercial = replaceOnce(
  commercial,
  `      state.notificationData = { staff, billing, profile }
      document.querySelectorAll('[data-ca-notification-panel]').forEach(panel => { panel.innerHTML = notificationMarkup(state.notificationData) })
      updateNotificationBadge(state.notificationData)`,
  `      state.notificationData = { staff, billing, profile }
      const markup = notificationMarkup(state.notificationData)
      document.querySelectorAll('[data-ca-notification-panel]').forEach(panel => {
        if (panel._caNotificationMarkup === markup) return
        panel._caNotificationMarkup = markup
        panel.innerHTML = markup
      })
      updateNotificationBadge(state.notificationData)`,
  'notification panel idempotency',
)

commercial = replaceOnce(
  commercial,
  `    document.addEventListener('submit', handleCatalogCreateSubmit, true)
    document.addEventListener('submit', handleCatalogDeleteSubmit, true)`,
  `    document.addEventListener('click', handleCatalogCreateClick, true)
    document.addEventListener('submit', handleCatalogCreateSubmit, true)
    document.addEventListener('submit', handleCatalogDeleteSubmit, true)`,
  'catalog click binding',
)

fs.writeFileSync(commercialPath, commercial)

let server = fs.readFileSync(serverPath, 'utf8')
server = replaceOnce(
  server,
  "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Line-Booking-Customer-Recovery', 'v493')",
  "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Line-Booking-Customer-Recovery', 'v493')\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Product-Catalog-Submit', 'v494')",
  'production release marker',
)
fs.writeFileSync(serverPath, server)

console.log('product catalog submit v494 runtime patched')
