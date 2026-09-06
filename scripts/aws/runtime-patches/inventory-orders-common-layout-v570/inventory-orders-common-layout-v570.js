;(() => {
  'use strict'

  if (window.__orimiaInventoryOrdersCommonLayoutV570) return
  window.__orimiaInventoryOrdersCommonLayoutV570 = true

  const ROUTE = '/admin/products/orders'
  const HOST_ID = 'orimia-inventory-orders-host-v570'
  const HIDDEN_ATTRIBUTE = 'data-orimia-inventory-orders-source-v570'
  let host = null
  let clientRequested = false
  let frame = 0

  const arrowLeft = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/><path d="M21 12H9"/></svg>'

  function onInventoryRoute() {
    return location.pathname.replace(/\/$/, '') === ROUTE
  }

  function pageMarkup() {
    return `
      <section class="wo-page-head wo-common-page-head-v570">
        <div>
          <p class="wo-eyebrow">INVENTORY &amp; ORDERS</p>
          <h1>在庫管理・発注</h1>
          <p>現在庫の棚卸し、ディーラーへの発注、納品状況の確認をこの画面で管理します。</p>
        </div>
        <a class="wo-button wo-button-secondary" href="/admin/products" data-inventory-orders-back-v570>${arrowLeft}<span>商品棚へ戻る</span></a>
      </section>
      <div id="wholesale-app" class="wo-app-root" aria-live="polite">
        <div class="wo-loading"><span></span><p>在庫と発注情報を読み込んでいます</p></div>
      </div>`
  }

  function ensureHost() {
    if (host) return host
    host = document.createElement('div')
    host.id = HOST_ID
    host.className = 'wo-common-host-v570'
    host.innerHTML = pageMarkup()
    return host
  }

  function updateHeader() {
    const labels = document.querySelectorAll('.admin-desktop-header > .min-w-0 > p')
    if (labels[0] && labels[0].textContent !== 'ORIMIA for Salon') labels[0].textContent = 'ORIMIA for Salon'
    if (labels[1] && labels[1].textContent !== '在庫管理・発注') labels[1].textContent = '在庫管理・発注'
    if (document.title !== '在庫管理・発注 | ORIMIA') document.title = '在庫管理・発注 | ORIMIA'
  }

  function loadWholesaleClient() {
    if (clientRequested || document.querySelector('script[data-inventory-orders-client-v570]')) return
    clientRequested = true
    const script = document.createElement('script')
    script.src = '/wholesale-ordering-client-v543.js?v=570-common-layout1'
    script.defer = true
    script.dataset.inventoryOrdersClientV570 = '1'
    script.addEventListener('error', () => {
      clientRequested = false
      const root = document.getElementById('wholesale-app')
      if (root) root.innerHTML = '<div class="wo-empty"><h3>画面を読み込めませんでした</h3><p>通信状態を確認して、ページを再読み込みしてください。</p></div>'
    }, { once: true })
    document.body.appendChild(script)
  }

  function revealRegularPage() {
    document.documentElement.classList.remove('orimia-inventory-orders-pending-v570', 'orimia-inventory-orders-ready-v570')
    document.body.removeAttribute('data-wholesale-page')
    document.querySelectorAll(`[${HIDDEN_ATTRIBUTE}]`).forEach(element => element.removeAttribute(HIDDEN_ATTRIBUTE))
    host?.remove()
  }

  function mount() {
    frame = 0
    if (!onInventoryRoute()) {
      revealRegularPage()
      return
    }

    const main = document.querySelector('.admin-app-shell .admin-main-content')
    if (!main) {
      schedule()
      return
    }

    const pageHost = ensureHost()
    if (pageHost.parentElement !== main) main.appendChild(pageHost)
    Array.from(main.children).forEach(element => {
      if (element !== pageHost) element.setAttribute(HIDDEN_ATTRIBUTE, '1')
    })

    document.body.dataset.wholesalePage = 'salon'
    document.documentElement.classList.add('orimia-inventory-orders-ready-v570')
    document.documentElement.classList.remove('orimia-inventory-orders-pending-v570')
    updateHeader()
    loadWholesaleClient()
  }

  function schedule() {
    if (frame) return
    frame = requestAnimationFrame(mount)
  }

  function start() {
    requestAnimationFrame(() => requestAnimationFrame(schedule))
    new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true })
    window.addEventListener('popstate', schedule)
    window.addEventListener('pageshow', schedule)
    document.addEventListener('click', event => {
      if (event.target.closest('a[href]')) window.setTimeout(schedule, 80)
    }, true)
  }

  if (document.readyState === 'complete') start()
  else window.addEventListener('load', start, { once: true })
})()
