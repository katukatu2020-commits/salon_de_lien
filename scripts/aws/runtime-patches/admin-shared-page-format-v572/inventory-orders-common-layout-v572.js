;(() => {
  'use strict'

  if (window.__orimiaInventoryOrdersCommonLayoutV572) return
  window.__orimiaInventoryOrdersCommonLayoutV572 = true

  const ROUTE = '/admin/products/orders'
  const WORKSPACE_KEY = 'inventory-orders'
  let content = null
  let clientRequested = false
  let frame = 0

  const arrowLeft = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/><path d="M21 12H9"/></svg>'

  function onInventoryRoute() {
    return location.pathname.replace(/\/$/, '') === ROUTE
  }

  function pageMarkup() {
    return `
      <header class="lien-glass overflow-hidden rounded-[28px] border p-5 sm:p-6" data-inventory-orders-page-header-v572>
        <div class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)]">
          <div class="flex min-w-0 flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div class="min-w-0">
              <div class="mb-2 inline-flex rounded-full border border-[color:var(--lien-primary-soft)] bg-white/70 px-3 py-1 text-xs font-semibold text-[color:var(--lien-primary-dark)]">在庫管理・発注</div>
              <h1 class="text-balance text-2xl font-semibold tracking-normal text-[color:var(--lien-ink)] sm:text-3xl">在庫管理・発注</h1>
              <p class="mt-2 max-w-3xl text-sm leading-6 text-[color:var(--lien-muted)]">現在庫の棚卸し、ディーラーへの発注、納品状況の確認をこの画面で管理します。</p>
            </div>
            <div class="flex w-full shrink-0 flex-wrap gap-2 sm:w-auto [&>*]:min-h-11 [&>*]:flex-1 sm:[&>*]:flex-none">
              <a class="orimia-workspace-back-v572" href="/admin/products" data-inventory-orders-back-v572>${arrowLeft}<span>商品棚へ戻る</span></a>
            </div>
          </div>
          <div class="orimia-inventory-hero-image-v572 min-h-36 overflow-hidden rounded-[20px] border border-white/70 shadow-sm lg:min-h-40">
            <img src="/brand/salon-product-shelf-illustrated.png" alt="ORIMIA店内の商品棚" decoding="async">
          </div>
        </div>
      </header>
      <div id="wholesale-app" class="wo-app-root" aria-live="polite">
        <div class="wo-loading"><span></span><p>在庫と発注情報を読み込んでいます</p></div>
      </div>`
  }

  function ensureContent() {
    if (content) return content
    content = document.createElement('div')
    content.className = 'orimia-admin-workspace-content-v572 orimia-inventory-orders-content-v572'
    content.innerHTML = pageMarkup()
    return content
  }

  function loadWholesaleClient() {
    if (clientRequested || document.querySelector('script[data-inventory-orders-client-v572]')) return
    clientRequested = true
    const script = document.createElement('script')
    script.src = '/wholesale-ordering-client-v543.js?v=572-shared-page-format1'
    script.defer = true
    script.dataset.inventoryOrdersClientV572 = '1'
    script.addEventListener('error', () => {
      clientRequested = false
      const root = content?.querySelector('#wholesale-app')
      if (root) root.innerHTML = '<div class="wo-empty"><h3>画面を読み込めませんでした</h3><p>通信状態を確認して、ページを再読み込みしてください。</p></div>'
    }, { once:true })
    document.body.appendChild(script)
  }

  function revealRegularPage() {
    document.documentElement.classList.remove('orimia-inventory-orders-pending-v572', 'orimia-inventory-orders-ready-v572')
    document.body.removeAttribute('data-wholesale-page')
    window.__orimiaAdminWorkspaceV572?.unmount(WORKSPACE_KEY)
  }

  function mount() {
    frame = 0
    if (!onInventoryRoute()) {
      revealRegularPage()
      return
    }
    const workspace = window.__orimiaAdminWorkspaceV572
    if (!workspace) {
      schedule()
      return
    }
    const mounted = workspace.mount({
      key:WORKSPACE_KEY,
      preserveSelectors:['nav[aria-label="商品ページ切替"]'],
      activeHref:'/admin/products',
      headerTitle:'在庫管理・発注',
      documentTitle:'在庫管理・発注 | ORIMIA',
    })
    if (!mounted) {
      schedule()
      return
    }

    const pageContent = ensureContent()
    if (pageContent.parentElement !== mounted.host) mounted.host.appendChild(pageContent)
    document.body.dataset.wholesalePage = 'salon'
    document.documentElement.classList.add('orimia-inventory-orders-ready-v572')
    document.documentElement.classList.remove('orimia-inventory-orders-pending-v572')
    loadWholesaleClient()
  }

  function schedule() {
    if (frame) return
    frame = requestAnimationFrame(mount)
  }

  function start() {
    requestAnimationFrame(() => requestAnimationFrame(schedule))
    new MutationObserver(schedule).observe(document.documentElement, { childList:true, subtree:true })
    window.addEventListener('popstate', schedule)
    window.addEventListener('pageshow', schedule)
    document.addEventListener('click', event => {
      if (event.target.closest('a[href]')) window.setTimeout(schedule, 80)
    }, true)
  }

  if (document.readyState === 'complete') start()
  else window.addEventListener('load', start, { once:true })
})()
