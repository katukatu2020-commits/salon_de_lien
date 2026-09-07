import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const serverPath = path.join(root, 'server.js')
const commercialPath = path.join(root, 'commercial-admin-v101.js')
const marker = 'customer-chart-route-scope-v571'

function replaceOnce(source, before, after, label) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`)
  return source.replace(before, after)
}

function replaceBlock(source, start, end, replacement, label) {
  const startIndex = source.indexOf(start)
  const duplicateStart = source.indexOf(start, startIndex + start.length)
  if (startIndex < 0 || duplicateStart >= 0) throw new Error(`${label}: block start was not unique`)
  const endIndex = source.indexOf(end, startIndex + start.length)
  if (endIndex < 0) throw new Error(`${label}: block end was not found`)
  return `${source.slice(0, startIndex)}${replacement}${source.slice(endIndex)}`
}

function browserSource(fn) {
  return fn.toString().split('\n').map(line => `  ${line}`).join('\n')
}

function browserSourceNamed(fn, name) {
  return browserSource(fn).replace(`function ${fn.name}`, `function ${name}`)
}

function route() {
  const pathname = location.pathname.replace(/\/+$/, '') || '/'
  const match = /^\/admin\/customers\/([^/]+)$/.exec(pathname)
  if (!match) return null
  try {
    const customerId = decodeURIComponent(match[1]).trim()
    if (!customerId || customerId.includes('/') || RESERVED_CUSTOMER_IDS.has(customerId.toLowerCase())) return null
    const historyMode = new URLSearchParams(location.search).get(HISTORY_PARAM) === 'history'
    return { customerId, history:historyMode }
  } catch {
    return null
  }
}

function findCustomerDetailMount(current) {
  if (!current) return null
  const mains = [...document.querySelectorAll('.admin-app-shell .admin-main-content')]
  for (const main of mains) {
    if (!main.isConnected) continue
    const identityMatches = [...main.querySelectorAll('input[name="customerId"]')]
      .some(input => String(input.value || '') === current.customerId)
    if (!identityMatches) continue

    const headings = [...main.querySelectorAll('h2,h3')]
    const nameHeading = headings.find(node => node.textContent?.trim() === '実際のお名前')
    const profileHeading = headings.find(node => node.textContent?.trim() === '髪・接客情報')
    const nameSection = nameHeading?.closest('section')
    const profileSection = profileHeading?.closest('section')
    const container = nameSection?.parentElement
    if (!container || container !== profileSection?.parentElement || !main.contains(container)) continue

    const hasCustomerBackLink = [...main.querySelectorAll('a[href]')].some(link => {
      try {
        const destination = new URL(link.getAttribute('href'), location.origin)
        return destination.origin === location.origin && destination.pathname === '/admin/customers'
      } catch {
        return false
      }
    })
    if (!hasCustomerBackLink) continue
    return { main, container, nameSection, profileSection }
  }
  return null
}

function chartRootIsCurrent(root, customerId, historyMode) {
  if (!root?.isConnected || root.dataset.chartCustomerV571 !== customerId) return false
  const current = route()
  if (!current || current.customerId !== customerId || current.history !== historyMode) return false
  const mount = findCustomerDetailMount(current)
  return Boolean(mount && mount.container.contains(root))
}

function closeChartDialogs() {
  document.querySelectorAll('[data-chart-preview-v561],[data-chart-delete-dialog-v567]').forEach(dialog => {
    try { if (dialog.open) dialog.close() } catch {}
    dialog.remove()
  })
}

function clearChartUi() {
  restoreMain()
  document.querySelectorAll('[data-chart-latest-card-v561]').forEach(node => node.remove())
  closeChartDialogs()
}

async function refreshLatest(card, customerId) {
  const data = await payload(await fetch(api(customerId, 1), { credentials:'same-origin', cache:'no-store' }), 'カルテファイルを取得できませんでした。')
  if (!chartRootIsCurrent(card, customerId, false)) return
  const preview = card.querySelector('[data-chart-latest]')
  if (!preview) return
  const item = data.items?.[0]
  preview.innerHTML = latestMarkup(item, data.count)
  preview.querySelector('[data-chart-open]')?.addEventListener('click', () => openItem(item))
  preview.querySelector('[data-chart-delete]')?.addEventListener('click', () => {
    confirmDelete(customerId, item, card.querySelector('[data-chart-status]'), () => refreshLatest(card, customerId))
  })
  const historyButton = card.querySelector('[data-chart-history]')
  if (historyButton) historyButton.querySelector('span').textContent = `履歴を見る（${Number(data.count || 0)}件）`
}

async function renderLatest(current, mount) {
  const { container, nameSection } = mount
  restoreMain()

  const cards = [...document.querySelectorAll('[data-chart-latest-card-v561]')]
  const existing = cards.find(card => (
    card.dataset.chartCustomerV571 === current.customerId
    && card.parentElement === container
  ))
  cards.filter(card => card !== existing).forEach(card => card.remove())
  if (existing) {
    if (nameSection.nextElementSibling !== existing) nameSection.after(existing)
    return
  }

  const card = document.createElement('section')
  card.className = 'lien-chart-card'
  card.dataset.chartLatestCardV561 = '1'
  card.dataset.chartCustomerV571 = current.customerId
  card.innerHTML = `<header class="lien-chart-card-header"><div class="lien-chart-heading"><span>${icon('paperclip')}</span><div class="lien-chart-heading-copy"><div class="lien-chart-heading-line"><h2>カルテファイル</h2><span class="lien-chart-private">${icon('shield')}店舗内限定</span></div><p>JPG・PNG・WebP・PDF、20MBまで</p></div></div><div class="lien-chart-actions"><button type="button" class="lien-chart-button" data-chart-history>${icon('history')}<span>履歴を見る</span></button><button type="button" class="lien-chart-button primary" data-chart-upload>${icon('upload')}ファイルを添付</button></div><input class="lien-chart-file" type="file" accept="${ACCEPT}" data-chart-file data-chart-attachment></header><div class="lien-chart-status" data-chart-status role="status" aria-live="polite"></div><div class="lien-chart-latest" data-chart-latest><div class="lien-chart-empty">カルテファイルを読み込んでいます…</div></div>`
  nameSection.after(card)
  bindUpload(card, current.customerId, () => refreshLatest(card, current.customerId))
  card.querySelector('[data-chart-history]').addEventListener('click', () => {
    if (!chartRootIsCurrent(card, current.customerId, false)) return
    const url = new URL(location.href)
    url.searchParams.set(HISTORY_PARAM, 'history')
    history.pushState({ ...(history.state || {}), lienChartHistoryV561:true }, '', url)
    scheduleSync()
  })
  try {
    await refreshLatest(card, current.customerId)
  } catch (error) {
    if (chartRootIsCurrent(card, current.customerId, false)) {
      card.querySelector('[data-chart-latest]').innerHTML = `<div class="lien-chart-empty"><span>${esc(error.message)}</span></div>`
    }
  }
}

function restoreMain() {
  document.querySelectorAll('[data-chart-hidden-v561]').forEach(node => {
    node.hidden = false
    node.style.removeProperty('display')
    delete node.dataset.chartHiddenV561
    delete node.dataset.chartHiddenOwnerV571
  })
  document.querySelectorAll('[data-chart-history-page-v561]').forEach(node => node.remove())
}

async function refreshHistory(root, customerId) {
  const data = await payload(await fetch(api(customerId, 100, 0), { credentials:'same-origin', cache:'no-store' }), '過去のカルテを取得できませんでした。')
  if (!chartRootIsCurrent(root, customerId, true)) return
  const items = [...(data.items || [])]
  while (items.length < Number(data.count || 0)) {
    const page = await payload(await fetch(api(customerId, 100, items.length), { credentials:'same-origin', cache:'no-store' }), '過去のカルテを取得できませんでした。')
    if (!chartRootIsCurrent(root, customerId, true)) return
    if (!page.items?.length) break
    items.push(...page.items)
  }
  if (!chartRootIsCurrent(root, customerId, true)) return
  data.items = items
  const count = root.querySelector('[data-chart-history-count]')
  const grid = root.querySelector('[data-chart-grid]')
  if (!count || !grid) return
  count.textContent = `${Number(data.count || 0).toLocaleString('ja-JP')}件`
  if (!data.items.length) {
    grid.innerHTML = '<div class="lien-chart-history-empty">カルテファイルはまだ登録されていません。</div>'
    return
  }
  grid.innerHTML = data.items.map(historyItemMarkup).join('')
  grid.querySelectorAll('[data-chart-item]').forEach(button => button.addEventListener('click', () => {
    const item = data.items.find(value => value.id === button.dataset.chartItem)
    if (item) openItem(item)
  }))
  grid.querySelectorAll('[data-chart-delete]').forEach(button => button.addEventListener('click', () => {
    const item = data.items.find(value => value.id === button.dataset.chartDelete)
    if (item) confirmDelete(customerId, item, root.querySelector('[data-chart-status]'), () => refreshHistory(root, customerId))
  }))
}

async function renderHistory(current, mount) {
  const { container } = mount
  document.querySelectorAll('[data-chart-latest-card-v561]').forEach(node => node.remove())

  const roots = [...document.querySelectorAll('[data-chart-history-page-v561]')]
  const existing = roots.find(root => (
    root.dataset.chartCustomerV571 === current.customerId
    && root.parentElement === container
  ))
  roots.filter(root => root !== existing).forEach(root => root.remove())
  if (existing) return

  Array.from(container.children).forEach(child => {
    child.hidden = true
    child.style.display = 'none'
    child.dataset.chartHiddenV561 = '1'
    child.dataset.chartHiddenOwnerV571 = current.customerId
  })
  const root = document.createElement('section')
  root.className = 'lien-chart-history'
  root.dataset.chartHistoryPageV561 = '1'
  root.dataset.chartCustomerV571 = current.customerId
  root.innerHTML = `<header class="lien-chart-history-head"><div class="lien-chart-history-title"><span>${icon('history')}</span><div><h1>カルテファイル履歴</h1><p>新しい記録から順に表示しています。</p></div></div><button type="button" class="lien-chart-button" data-chart-back disabled>${icon('arrow')}顧客カルテへ戻る</button></header><div class="lien-chart-history-toolbar"><span class="lien-chart-history-count" data-chart-history-count>読み込み中…</span><div><button type="button" class="lien-chart-button primary" data-chart-upload>${icon('upload')}ファイルを添付</button><input class="lien-chart-file" type="file" accept="${ACCEPT}" data-chart-file data-chart-attachment><div class="lien-chart-status" data-chart-status role="status" aria-live="polite"></div></div></div><div class="lien-chart-grid" data-chart-grid><div class="lien-chart-history-empty">カルテファイルを読み込んでいます…</div></div>`
  container.appendChild(root)
  requestAnimationFrame(() => window.scrollTo({ top:0, behavior:'auto' }))
  root.querySelector('[data-chart-back]').addEventListener('click', () => {
    const finish = () => scheduleSync()
    if (history.state?.lienChartHistoryV561) {
      let settled = false
      const onPop = () => {
        settled = true
        setTimeout(finish, 0)
      }
      addEventListener('popstate', onPop, { once:true })
      history.back()
      setTimeout(() => {
        if (!settled && route()?.history) {
          removeEventListener('popstate', onPop)
          const url = new URL(location.href)
          url.searchParams.delete(HISTORY_PARAM)
          history.replaceState({}, '', url)
          finish()
        }
      }, 400)
    } else {
      const url = new URL(location.href)
      url.searchParams.delete(HISTORY_PARAM)
      history.replaceState({}, '', url)
      finish()
    }
  })
  bindUpload(root, current.customerId, () => refreshHistory(root, current.customerId))
  try {
    await refreshHistory(root, current.customerId)
  } catch (error) {
    if (chartRootIsCurrent(root, current.customerId, true)) {
      root.querySelector('[data-chart-grid]').innerHTML = `<div class="lien-chart-history-empty">${esc(error.message)}</div>`
    }
  } finally {
    root.querySelector('[data-chart-back]')?.removeAttribute('disabled')
  }
}

function scheduleSync() {
  if (syncTimer) return
  syncTimer = setTimeout(() => {
    syncTimer = 0
    sync()
  }, 32)
}

function sync() {
  const current = route()
  const mount = current ? findCustomerDetailMount(current) : null
  if (!current || !mount) {
    activeRouteKey = ''
    clearChartUi()
    return
  }

  const nextRouteKey = `${current.customerId}:${current.history ? 'history' : 'latest'}`
  if (activeRouteKey && activeRouteKey !== nextRouteKey) clearChartUi()
  activeRouteKey = nextRouteKey
  installStyles()
  if (current.history) void renderHistory(current, mount)
  else void renderLatest(current, mount)
}

function wrapHistoryMethod(method) {
  const original = history[method]
  if (original?.__lienChartRouteScopeV571) return
  const wrapped = function (...args) {
    const result = Reflect.apply(original, this, args)
    scheduleSync()
    return result
  }
  Object.defineProperty(wrapped, '__lienChartRouteScopeV571', { value:true })
  try { history[method] = wrapped } catch {}
}

function appointmentRoute() {
  const pathname = location.pathname.replace(/\/+$/, '') || '/'
  const match = /^\/admin\/customers\/([^/]+)$/.exec(pathname)
  if (!match) return null
  try {
    const customerId = decodeURIComponent(match[1]).trim()
    if (!customerId || customerId.includes('/') || CUSTOMER_HISTORY_RESERVED_IDS.has(customerId.toLowerCase())) return null
    return { customerId }
  } catch {
    return null
  }
}

function findCustomerHistoryMain(current) {
  if (!current) return null
  return [...document.querySelectorAll('.admin-app-shell .admin-main-content')].find(main => {
    if (!main.isConnected) return false
    const identityMatches = [...main.querySelectorAll('input[name="customerId"]')]
      .some(input => String(input.value || '') === current.customerId)
    const historyHeading = [...main.querySelectorAll('h2')]
      .some(node => node.textContent?.trim() === '来店・会計履歴')
    return identityMatches && historyHeading
  }) || null
}

function appointmentHistorySection(customerId) {
  const current = route()
  if (!current || current.customerId !== customerId) return null
  const main = findCustomerHistoryMain(current)
  if (!main) return null
  const heading = [...main.querySelectorAll('h2')].find(node => node.textContent?.trim() === '来店・会計履歴')
  return heading?.closest('section') || null
}

function appointmentScheduleSync() {
  if (syncTimer) return
  syncTimer = setTimeout(() => {
    syncTimer = 0
    sync()
  }, 60)
}

async function appointmentSync() {
  const current = route()
  const main = current ? findCustomerHistoryMain(current) : null
  if (!current || !main) {
    if (cachedCustomerId || cachedData || loading) {
      requestSerial += 1
      cachedCustomerId = ''
      cachedData = null
    }
    return
  }
  installStyles()
  if (cachedCustomerId === current.customerId && cachedData) {
    applyHistory(cachedData, current.customerId)
    return
  }
  if (loading) return
  loading = true
  const serial = ++requestSerial
  try {
    const data = await payload(await fetch(historyApi(current.customerId), {
      credentials:'same-origin', cache:'no-store', headers:{ Accept:'application/json' },
    }), '予約・来店履歴を取得できませんでした。')
    const next = route()
    if (serial !== requestSerial || next?.customerId !== current.customerId || !findCustomerHistoryMain(next)) return
    cachedCustomerId = current.customerId
    cachedData = data
    if (!applyHistory(data, current.customerId)) scheduleSync()
  } catch (error) {
    const next = route()
    if (serial === requestSerial && next?.customerId === current.customerId && findCustomerHistoryMain(next)) {
      console.error(`[${RELEASE}]`, error)
    }
  } finally {
    loading = false
  }
}

let server = fs.readFileSync(serverPath, 'utf8')
if (server.includes(`/* ${marker} */`)) throw new Error(`${marker}: patch already applied`)
const previousReady = `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Inventory-Orders-Common-Layout', 'v570') /* inventory-orders-common-layout-v570 */`
server = replaceOnce(
  server,
  previousReady,
  `${previousReady}\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Chart-Route-Scope', 'v571') /* ${marker} */`,
  'readiness header',
)
server += `\n/* ${marker} */\n`

let commercial = fs.readFileSync(commercialPath, 'utf8')
if (commercial.includes('__lienCustomerChartRouteScopeV571')) throw new Error(`${marker}: client already applied`)
const chartMarker = '/* salon-records-controls-v561-customer-chart */'
const chartMarkerIndex = commercial.indexOf(chartMarker)
const chartStart = commercial.lastIndexOf(';(() => {', chartMarkerIndex)
if (chartMarkerIndex < 0 || chartStart < 0 || !commercial.slice(chartStart, chartMarkerIndex).includes('__lienCustomerChartAttachmentDeleteV567')) {
  throw new Error('customer chart client boundary was not found')
}

let chartClient = commercial.slice(chartStart, chartMarkerIndex)
chartClient = replaceOnce(
  chartClient,
  `  window.__lienCustomerChartAttachmentDeleteV567 = true\n\n  const RELEASE = 'customer-chart-attachment-delete-v567'`,
  `  window.__lienCustomerChartAttachmentDeleteV567 = true\n  window.__lienCustomerChartRouteScopeV571 = true\n\n  const RELEASE = '${marker}'`,
  'client release marker',
)

const routeBlock = [
  `  const RESERVED_CUSTOMER_IDS = new Set(['messages'])`,
  browserSource(route),
  browserSource(findCustomerDetailMount),
  browserSource(chartRootIsCurrent),
  browserSource(closeChartDialogs),
  browserSource(clearChartUi),
].join('\n\n')
chartClient = replaceBlock(chartClient, '  function route() {', '\n\n  function api(', routeBlock, 'route ownership')
chartClient = replaceBlock(chartClient, '  async function refreshLatest(', '\n\n  async function renderLatest(', browserSource(refreshLatest), 'latest refresh')
chartClient = replaceBlock(chartClient, '  async function renderLatest(', '\n\n  function restoreMain(', browserSource(renderLatest), 'latest render')
chartClient = replaceBlock(chartClient, '  function restoreMain() {', '\n\n  function historyItemMarkup(', browserSource(restoreMain), 'main restore')
chartClient = replaceBlock(chartClient, '  async function refreshHistory(', '\n\n  async function renderHistory(', browserSource(refreshHistory), 'history refresh')
chartClient = replaceBlock(chartClient, '  async function renderHistory(', '\n\n  let syncTimer = 0', browserSource(renderHistory), 'history render')

const schedulerBlock = [
  '  let syncTimer = 0',
  "  let activeRouteKey = ''",
  browserSource(scheduleSync),
  browserSource(sync),
  browserSource(wrapHistoryMethod),
  "  wrapHistoryMethod('pushState')",
  "  wrapHistoryMethod('replaceState')",
  "  addEventListener('popstate', scheduleSync)",
  "  addEventListener('pageshow', scheduleSync)",
  "  addEventListener('hashchange', scheduleSync)",
  '  new MutationObserver(scheduleSync).observe(document.documentElement, { childList:true, subtree:true })',
  '  scheduleSync()',
].join('\n\n')
chartClient = replaceBlock(
  chartClient,
  '  let syncTimer = 0',
  '\n  console.info(`[${RELEASE}] customer chart attachments ready`)',
  schedulerBlock,
  'route scheduler',
)

commercial = `${commercial.slice(0, chartStart)}${chartClient}${commercial.slice(chartMarkerIndex)}`

const appointmentMarker = '/* customer-appointment-history-memos-v565 */'
const appointmentMarkerIndex = commercial.indexOf(appointmentMarker)
const appointmentStart = commercial.lastIndexOf(';(() => {', appointmentMarkerIndex)
if (appointmentMarkerIndex < 0 || appointmentStart < 0 || !commercial.slice(appointmentStart, appointmentMarkerIndex).includes('__lienCustomerAppointmentHistoryV565')) {
  throw new Error('customer appointment history client boundary was not found')
}
let appointmentClient = commercial.slice(appointmentStart, appointmentMarkerIndex)
const appointmentRouteBlock = [
  `  const CUSTOMER_HISTORY_RESERVED_IDS = new Set(['messages'])`,
  browserSourceNamed(appointmentRoute, 'route'),
  browserSource(findCustomerHistoryMain),
].join('\n\n')
appointmentClient = replaceBlock(appointmentClient, '  function route() {', '\n\n  function historyApi(', appointmentRouteBlock, 'appointment route ownership')
appointmentClient = replaceBlock(
  appointmentClient,
  '  function historySection() {',
  '\n\n  function historyGrid(',
  browserSourceNamed(appointmentHistorySection, 'historySection'),
  'appointment history section ownership',
)
appointmentClient = replaceBlock(
  appointmentClient,
  '  function scheduleSync() {',
  '\n\n  async function sync()',
  browserSourceNamed(appointmentScheduleSync, 'scheduleSync'),
  'appointment scheduler',
)
appointmentClient = replaceBlock(
  appointmentClient,
  '  async function sync() {',
  "\n\n  addEventListener('popstate'",
  browserSourceNamed(appointmentSync, 'sync'),
  'appointment synchronization',
)
commercial = `${commercial.slice(0, appointmentStart)}${appointmentClient}${commercial.slice(appointmentMarkerIndex)}`
commercial += `\n/* ${marker} */\n`

fs.writeFileSync(serverPath, server)
fs.writeFileSync(commercialPath, commercial)

console.log(JSON.stringify({ release:marker, server:true, routeOwnership:true, appointmentRouteOwnership:true, staleResponseGuard:true, cleanup:true }))
