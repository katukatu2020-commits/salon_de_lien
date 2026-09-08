(function () {
  'use strict'

/* dealer-auth-self-service-v548 */

  const root = document.getElementById('wholesale-app')
  if (!root) return

  const page = document.body.dataset.wholesalePage
  const icons = {
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    package: '<path d="m7.5 4.3 9 5.1M21 8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5M12 22V12"/>',
    boxes: '<path d="M2 10 12 4l10 6-10 6Z"/><path d="m2 14 10 6 10-6M12 16v4"/>',
    history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>',
    truck: '<path d="M10 17h4V5H2v12h3M14 8h4l4 4v5h-3"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1"/><path d="M14 11a5 5 0 0 0-7.1-.1l-2 2A5 5 0 0 0 12 20l1.1-1.1"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    chevron: '<path d="m9 18 6-6-6-6"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    printer: '<path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
    close: '<path d="M18 6 6 18M6 6l12 12"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
    clipboard: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2M9 9h6M9 13h6"/>',
    alert: '<path d="M10.3 2.9 1.8 17a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 2.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/>',
    shop: '<path d="M3 9h18l-2-6H5Z"/><path d="M5 9v11h14V9M9 20v-6h6v6"/><path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 15H6L5 6M10 11v6M14 11v6"/>',
    tag: '<path d="M20.6 13.6 11 4H4v7l9.6 9.6a2 2 0 0 0 2.8 0l4.2-4.2a2 2 0 0 0 0-2.8Z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/>',
    percent: '<path d="M19 5 5 19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
    building: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h2M14 7h2M8 11h2M14 11h2M8 15h2M14 15h2M9 21v-3h6v3"/>',
    card: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',
    external: '<path d="M15 3h6v6M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    refresh: '<path d="M20 12a8 8 0 1 1-2.3-5.7L20 8"/><path d="M20 3v5h-5"/>',
  }

  function icon(name, className) {
    return '<svg class="' + (className || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (icons[name] || icons.package) + '</svg>'
  }

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (character) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]
    })
  }

  function yen(value) {
    return Number(value || 0).toLocaleString('ja-JP') + '円'
  }

  function rate(value) {
    return Number(value || 0).toLocaleString('ja-JP', { maximumFractionDigits:2 }) + '%'
  }

  function date(value, withTime) {
    if (!value) return '未設定'
    const options = { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' }
    if (withTime) Object.assign(options, { hour: '2-digit', minute: '2-digit' })
    return new Intl.DateTimeFormat('ja-JP', options).format(new Date(value))
  }

  const statusLabels = {
    ORDERED: '新規注文', ACCEPTED: '受注済み', SHIPPED: '出荷済み', DELIVERED: '納品済み', CANCELLED: 'キャンセル',
  }

  function statusBadge(status) {
    return '<span class="wo-status wo-status-' + esc(String(status).toLowerCase()) + '">' + esc(statusLabels[status] || status) + '</span>'
  }

  async function api(path, options) {
    const response = await fetch(path, Object.assign({ credentials: 'same-origin', headers: { Accept: 'application/json' } }, options || {}))
    let payload = null
    try { payload = await response.json() } catch { payload = {} }
    if (response.status === 401) {
      location.assign(page === 'dealer' ? '/dealer/login' : '/admin/login')
      throw new Error('ログインが必要です。')
    }
    if (response.status === 402 && page === 'dealer') {
      location.assign(payload.billingUrl || '/dealer/billing')
      throw new Error(payload.error || 'クレジットカードの登録が必要です。')
    }
    if (!response.ok || payload.ok === false) throw new Error(payload.error || '処理を完了できませんでした。')
    return payload
  }

  function post(path, body) {
    return api(path, { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  }

  let toastTimer = null
  function notify(message, type) {
    let toast = document.getElementById('wo-toast')
    if (!toast) {
      toast = document.createElement('div')
      toast.id = 'wo-toast'
      toast.className = 'wo-toast'
      toast.setAttribute('role', 'status')
      document.body.appendChild(toast)
    }
    toast.className = 'wo-toast show ' + (type === 'error' ? 'error' : 'success')
    toast.innerHTML = icon(type === 'error' ? 'alert' : 'check') + '<span>' + esc(message) + '</span>'
    clearTimeout(toastTimer)
    toastTimer = setTimeout(function () { toast.classList.remove('show') }, 4200)
  }

  function emptyState(iconName, title, text) {
    return '<div class="wo-empty">' + icon(iconName) + '<h3>' + esc(title) + '</h3><p>' + esc(text) + '</p></div>'
  }

  const salon = {
    data: null,
    view: new URLSearchParams(location.search).get('view') || 'order',
    query: '',
    manufacturer: '',
    category: '',
    lowStock: false,
    quantities: new Map(),
    stockValues: new Map(),
    requestedDeliveryDate: '',
    salonNote: '',
    inventoryReason: '',
    busy: false,
  }

  function uniqueValues(products, key) {
    return Array.from(new Set(products.map(function (product) { return product[key] }).filter(Boolean))).sort(function (a, b) { return a.localeCompare(b, 'ja') })
  }

  function salonOrderProducts() {
    return salon.data.catalogProducts || []
  }

  function salonFilteredProducts(sourceProducts) {
    const products = sourceProducts || salon.data.products
    const needle = salon.query.trim().toLocaleLowerCase('ja')
    return products.filter(function (product) {
      const searchable = [product.name, product.manufacturerName, product.category, product.productCode, product.janCode].join(' ').toLocaleLowerCase('ja')
      return (!needle || searchable.includes(needle)) &&
        (!salon.manufacturer || product.manufacturerName === salon.manufacturer) &&
        (!salon.category || product.category === salon.category) &&
        (!salon.lowStock || product.stockQuantity != null && Number(product.stockQuantity) <= 3)
    })
  }

  function salonTabs() {
    const tabs = [
      ['order', 'package', '発注'], ['inventory', 'boxes', '棚卸し'], ['history', 'history', '発注履歴'],
    ]
    return '<div class="wo-tabs" role="tablist">' + tabs.map(function (tab) {
      return '<button type="button" role="tab" aria-selected="' + (salon.view === tab[0]) + '" class="' + (salon.view === tab[0] ? 'active' : '') + '" data-action="salon-tab" data-view="' + tab[0] + '">' + icon(tab[1]) + '<span>' + tab[2] + '</span></button>'
    }).join('') + '</div>'
  }

  function contractPanel() {
    const contracts = salon.data.contracts
    const active = contracts.filter(function (contract) { return contract.status === 'ACTIVE' })
    const pending = contracts.filter(function (contract) { return contract.status === 'PENDING' })
    const roleCanInvite = salon.data.actor.role === 'ADMIN'
    return '<section class="wo-contract-band ' + (active.length ? 'connected' : '') + '">' +
      '<div class="wo-contract-copy">' + icon(active.length ? 'link' : 'truck') + '<div><p class="wo-section-label">DEALER CONNECTION</p><h2>' + (active.length ? '連携中のディーラー' : '取引ディーラーを連携') + '</h2><p>' + (active.length ? '発注データは連携先へ即時に届きます。' : '取引先から固有コードを確認し、連携を依頼します。') + '</p></div></div>' +
      (active.length ? '<div class="wo-contract-list">' + active.map(function (contract) { return '<span><strong>' + esc(contract.dealerName) + '</strong><small>得意先コード ' + esc(contract.customerCode) + '</small></span>' }).join('') + '</div>' : '') +
      (pending.length ? '<div class="wo-pending-note">' + icon('alert') + '<span>' + pending.map(function (contract) { return esc(contract.dealerName) }).join('、') + ' の承認待ちです。</span></div>' : '') +
      (roleCanInvite ? '<details class="wo-contract-setup" ' + (!contracts.length ? 'open' : '') + '><summary>' + icon('plus') + 'ディーラーを追加</summary><form id="dealer-code-form" class="wo-code-link-form"><label><span>ディーラー固有コード</span><input name="dealerCode" required maxlength="40" autocomplete="off" autocapitalize="characters" placeholder="例：DLR-12AB34CD56"></label><button class="wo-button wo-button-primary" type="submit">' + icon('link') + '連携を依頼</button></form><p class="wo-form-help">取引先のディーラー画面に表示される固有コードを入力してください。</p></details>' : '') +
      '</section>'
  }

  function productFilters(sourceProducts) {
    const products = sourceProducts || salon.data.products
    const inventoryFilters = !sourceProducts
    const manufacturers = uniqueValues(products, 'manufacturerName')
    const categories = uniqueValues(products, 'category')
    return '<div class="wo-filters ' + (inventoryFilters ? '' : 'wo-catalog-filters') + '"><label class="wo-search">' + icon('search') + '<input id="product-search" value="' + esc(salon.query) + '" placeholder="商品名・メーカー・JANコードで検索"><span class="sr-only">商品を検索</span></label>' +
      '<label><span class="sr-only">メーカー</span><select id="manufacturer-filter"><option value="">すべてのメーカー</option>' + manufacturers.map(function (value) { return '<option value="' + esc(value) + '" ' + (salon.manufacturer === value ? 'selected' : '') + '>' + esc(value) + '</option>' }).join('') + '</select></label>' +
      '<label><span class="sr-only">カテゴリ</span><select id="category-filter"><option value="">すべてのカテゴリ</option>' + categories.map(function (value) { return '<option value="' + esc(value) + '" ' + (salon.category === value ? 'selected' : '') + '>' + esc(value) + '</option>' }).join('') + '</select></label>' +
      (inventoryFilters ? '<label class="wo-check"><input id="low-stock-filter" type="checkbox" ' + (salon.lowStock ? 'checked' : '') + '><span>在庫3点以下</span></label>' : '') + '</div>'
  }

  function productThumb(product) {
    if (product.imageUrl) return '<img src="' + esc(product.imageUrl) + '" alt="" loading="lazy">'
    return '<span class="wo-product-placeholder">' + icon('package') + '</span>'
  }

  function quantityControl(product) {
    const quantity = salon.quantities.get(product.id) || 0
    const unit = Math.max(1, Number(product.orderUnit || 1))
    return '<div class="wo-stepper" data-product-id="' + esc(product.id) + '" data-unit="' + unit + '"><button type="button" data-action="quantity-minus" aria-label="' + esc(product.name) + 'を減らす">' + icon('minus') + '</button><input type="number" data-action="quantity-input" min="0" max="999" step="' + unit + '" value="' + quantity + '" aria-label="' + esc(product.name) + 'の発注数"><button type="button" data-action="quantity-plus" aria-label="' + esc(product.name) + 'を増やす">' + icon('plus') + '</button></div>'
  }

  function orderProductRows(products) {
    if (!products.length) return '<div class="wo-table-empty">条件に一致する商品はありません。</div>'
    return '<div class="wo-contract-product-table"><div class="wo-contract-product-head"><span>商品</span><span>ディーラー</span><span>定価（税抜）</span><span>割引率</span><span>契約単価（税抜）</span><span>発注単位</span><span>発注数</span></div>' + products.map(function (product) {
      return '<article class="wo-contract-product-row">' +
        '<div class="wo-contract-product-main"><small>' + esc(product.manufacturerName || 'メーカー未設定') + '</small><strong>' + esc(product.name) + '</strong><span>' + esc([product.category, product.productCode, product.janCode ? 'JAN ' + product.janCode : ''].filter(Boolean).join(' ・ ')) + '</span></div>' +
        '<span><small class="wo-mobile-label">ディーラー</small><strong>' + esc(product.dealerName) + '</strong></span>' +
        '<span><small class="wo-mobile-label">定価（税抜）</small>' + yen(product.listPrice) + '</span>' +
        '<span class="wo-discount-rate"><small class="wo-mobile-label">割引率</small>' + rate(product.discountRate) + '</span>' +
        '<strong class="wo-contract-unit-price"><small class="wo-mobile-label">契約単価（税抜）</small>' + yen(product.unitPrice) + '</strong>' +
        '<span><small class="wo-mobile-label">発注単位</small>' + Number(product.orderUnit || 1) + '点</span>' +
        '<div class="wo-order-quantity"><span class="sr-only">発注数</span>' + quantityControl(product) + '</div></article>'
    }).join('') + '</div>'
  }

  function selectedOrder() {
    return salonOrderProducts().map(function (product) {
      return { product: product, quantity: salon.quantities.get(product.id) || 0 }
    }).filter(function (item) { return item.quantity > 0 })
  }

  function orderSummary() {
    const selected = selectedOrder()
    const totalQuantity = selected.reduce(function (sum, item) { return sum + item.quantity }, 0)
    const subtotal = selected.reduce(function (sum, item) { return sum + Number(item.product.unitPrice || 0) * item.quantity }, 0)
    return '<aside class="wo-order-summary"><div class="wo-summary-head">' + icon('clipboard') + '<div><span>発注内容</span><strong>' + selected.length + '商品 / ' + totalQuantity + '点</strong></div></div>' +
      (selected.length ? '<ul>' + selected.map(function (item) { return '<li><span><small>' + esc(item.product.manufacturerName) + '</small>' + esc(item.product.name) + '</span><strong>' + item.quantity + '点<small>' + yen(Number(item.product.unitPrice) * item.quantity) + '</small></strong></li>' }).join('') + '</ul><div class="wo-summary-subtotal"><span>税抜小計</span><strong>' + yen(subtotal) + '</strong></div>' : '<p class="wo-summary-empty">商品の発注数を入力してください。</p>') +
      '<label><span>希望納品日（任意）</span><input id="requested-delivery-date" type="date" value="' + esc(salon.requestedDeliveryDate) + '"></label><label><span>発注メモ（任意）</span><textarea id="salon-note" rows="3" maxlength="1200" placeholder="納品時の連絡事項など">' + esc(salon.salonNote) + '</textarea></label>' +
      '<button class="wo-button wo-button-primary wo-submit-order" type="button" data-action="confirm-order" ' + (!selected.length || !salon.data.selectedDealerId ? 'disabled' : '') + '>' + icon('truck') + '発注内容を確認</button><p class="wo-summary-foot">表示価格は税抜です。発注時点の契約条件で注文を確定します。</p></aside>'
  }

  function orderView() {
    const sourceProducts = salonOrderProducts()
    const products = salonFilteredProducts(sourceProducts)
    const activeContracts = salon.data.contracts.filter(function (contract) { return contract.status === 'ACTIVE' })
    return '<section class="wo-workspace"><header class="wo-workspace-head"><div><p class="wo-section-label">PURCHASE ORDER</p><h2>契約商品を発注</h2><p>ディーラーがこの店舗向けに設定した商品と契約価格だけを表示しています。</p></div>' +
      (activeContracts.length > 1 ? '<label class="wo-dealer-select"><span>発注先</span><select id="dealer-select">' + activeContracts.map(function (contract) { return '<option value="' + esc(contract.dealerId) + '" ' + (contract.dealerId === salon.data.selectedDealerId ? 'selected' : '') + '>' + esc(contract.dealerName) + '</option>' }).join('') + '</select></label>' : '') + '</header>' +
      (!activeContracts.length ? emptyState('truck', '発注先がまだ連携されていません', '上の「ディーラーを追加」から固有コードで連携を依頼してください。') : productFilters(sourceProducts) + '<div class="wo-order-layout"><div class="wo-product-list">' + (sourceProducts.length ? orderProductRows(products) : emptyState('package', '取扱商品はまだ設定されていません', 'ディーラー側で、この美容室向けの商品と割引率が設定されると表示されます。')) + '</div>' + orderSummary() + '</div>') + '</section>'
  }

  function inventoryView() {
    const products = salonFilteredProducts(salon.data.products)
    return '<section class="wo-workspace"><header class="wo-workspace-head"><div><p class="wo-section-label">STOCKTAKE</p><h2>現在庫を棚卸し</h2><p>入荷・棚卸し後の実数を入力し、変更した商品だけをまとめて保存します。</p></div><span class="wo-count-chip">' + salon.data.products.length + '商品</span></header>' + productFilters() +
      '<div class="wo-inventory-list">' + (products.length ? products.map(function (product) {
        const current = salon.stockValues.has(product.id) ? salon.stockValues.get(product.id) : product.stockQuantity
        const changed = Number(current) !== Number(product.stockQuantity)
        return '<article class="wo-inventory-row ' + (changed ? 'changed' : '') + '"><div class="wo-product-main"><div class="wo-product-image">' + productThumb(product) + '</div><div><small>' + esc(product.manufacturerName || 'メーカー未設定') + '</small><h3>' + esc(product.name) + '</h3><p>' + esc(product.category || 'カテゴリ未設定') + '</p></div></div><label><span>現在庫数</span><div><input type="number" min="0" max="100000" step="1" value="' + Number(current) + '" data-action="stock-input" data-product-id="' + esc(product.id) + '"><small>点</small></div></label></article>'
      }).join('') : '<div class="wo-table-empty">条件に一致する商品はありません。</div>') + '</div><div class="wo-inventory-save"><label><span>棚卸しメモ（任意）</span><input id="inventory-reason" maxlength="500" value="' + esc(salon.inventoryReason) + '" placeholder="例：9月棚卸し・入荷反映"></label><button class="wo-button wo-button-primary" type="button" data-action="save-inventory" ' + (!salon.stockValues.size ? 'disabled' : '') + '>' + icon('check') + '変更を保存</button></div></section>'
  }

  function historyView() {
    const orders = salon.data.orders
    return '<section class="wo-workspace"><header class="wo-workspace-head"><div><p class="wo-section-label">ORDER HISTORY</p><h2>発注履歴</h2><p>注文後の受注・出荷・納品状況を確認できます。</p></div><span class="wo-count-chip">' + orders.length + '件</span></header>' +
      (orders.length ? '<div class="wo-order-history"><div class="wo-history-header"><span>発注番号 / 発注日</span><span>発注先</span><span>内容</span><span>金額</span><span>状態</span><span>納品書</span></div>' + orders.map(function (order) {
        return '<article><div><strong>' + esc(order.orderNo) + '</strong><small>' + date(order.orderedAt, true) + '</small></div><div><span class="wo-mobile-label">発注先</span>' + esc(order.dealerName) + '</div><div><span class="wo-mobile-label">内容</span>' + Number(order.lineCount) + '商品 / ' + Number(order.totalQuantity) + '点</div><div><span class="wo-mobile-label">金額</span>' + (Number(order.totalYen) > 0 ? yen(order.totalYen) : 'ディーラー確認中') + '</div><div>' + statusBadge(order.status) + '</div><div><a class="wo-icon-link" href="/dealer/orders/' + encodeURIComponent(order.id) + '/delivery-note" target="_blank" rel="noopener" aria-label="' + esc(order.orderNo) + 'の納品書を開く">' + icon('printer') + '</a></div></article>'
      }).join('') + '</div>' : emptyState('history', '発注履歴はまだありません', '発注した注文がここに表示されます。')) + '</section>'
  }

  function renderSalon() {
    root.innerHTML = contractPanel() + salonTabs() + (salon.view === 'inventory' ? inventoryView() : salon.view === 'history' ? historyView() : orderView()) + '<dialog id="wo-dialog" class="wo-dialog"></dialog>'
  }

  async function reloadSalon(dealerId) {
    salon.data = await api('/api/admin/wholesale/bootstrap' + (dealerId ? '?dealerId=' + encodeURIComponent(dealerId) : ''))
    salon.stockValues.clear()
    renderSalon()
  }

  function updateSalonUrl() {
    const url = new URL(location.href)
    if (salon.view === 'order') url.searchParams.delete('view')
    else url.searchParams.set('view', salon.view)
    history.replaceState(null, '', url)
  }

  function showOrderDialog() {
    const selected = selectedOrder()
    if (!selected.length) return
    const dialog = document.getElementById('wo-dialog')
    const total = selected.reduce(function (sum, item) { return sum + item.quantity }, 0)
    const subtotal = selected.reduce(function (sum, item) { return sum + Number(item.product.unitPrice || 0) * item.quantity }, 0)
    const tax = Math.round(subtotal * Number(salon.data.organization.taxRate || 10) / 100)
    dialog.innerHTML = '<form method="dialog" class="wo-dialog-shell"><header><div>' + icon('clipboard') + '<div><p>ORDER CONFIRMATION</p><h2>発注内容を確認</h2></div></div><button value="cancel" aria-label="閉じる">' + icon('close') + '</button></header><div class="wo-dialog-content"><div class="wo-confirm-destination"><span>発注先</span><strong>' + esc(salon.data.contracts.find(function (contract) { return contract.dealerId === salon.data.selectedDealerId }).dealerName) + '</strong></div><ul class="wo-confirm-list">' + selected.map(function (item) { return '<li><span><small>' + esc(item.product.manufacturerName) + ' / ' + rate(item.product.discountRate) + '割引</small>' + esc(item.product.name) + '</span><strong>' + item.quantity + '点<small>' + yen(Number(item.product.unitPrice) * item.quantity) + '</small></strong></li>' }).join('') + '</ul><div class="wo-confirm-total"><span>' + selected.length + '商品 / ' + total + '点</span><strong>' + yen(subtotal + tax) + '<small>税込</small></strong></div><p class="wo-confirm-note">契約単価と割引率は発注時点の内容を注文履歴へ保存します。</p></div><footer><button class="wo-button wo-button-secondary" value="cancel">戻る</button><button class="wo-button wo-button-primary" type="button" data-action="submit-order">' + icon('truck') + 'この内容で注文</button></footer></form>'
    dialog.showModal()
  }

  async function submitOrder(button) {
    if (salon.busy) return
    salon.busy = true
    button.disabled = true
    button.classList.add('loading')
    try {
      const result = await post('/api/admin/wholesale/orders', {
        dealerId: salon.data.selectedDealerId,
        requestedDeliveryDate: salon.requestedDeliveryDate,
        salonNote: salon.salonNote,
        lines: selectedOrder().map(function (item) { return { dealerProductId:item.product.dealerProductId, quantity:item.quantity } }),
      })
      document.getElementById('wo-dialog').close()
      salon.quantities.clear()
      salon.requestedDeliveryDate = ''
      salon.salonNote = ''
      notify('注文 ' + result.order.orderNo + ' を送信しました。')
      await reloadSalon(salon.data.selectedDealerId)
      salon.view = 'history'
      updateSalonUrl()
      renderSalon()
    } catch (error) { notify(error.message, 'error') } finally { salon.busy = false }
  }

  async function saveInventory(button) {
    if (salon.busy || !salon.stockValues.size) return
    salon.busy = true
    button.disabled = true
    try {
      const items = Array.from(salon.stockValues.entries()).map(function (entry) { return { productId: entry[0], quantity: entry[1] } })
      const result = await post('/api/admin/wholesale/inventory', { items: items, reason: salon.inventoryReason })
      notify(result.changed + '商品の在庫数を更新しました。')
      salon.inventoryReason = ''
      await reloadSalon(salon.data.selectedDealerId)
    } catch (error) { notify(error.message, 'error'); button.disabled = false } finally { salon.busy = false }
  }

  function bindSalon() {
    root.addEventListener('click', async function (event) {
      const target = event.target.closest('[data-action]')
      if (!target) return
      const action = target.dataset.action
      if (action === 'salon-tab') {
        salon.view = target.dataset.view
        updateSalonUrl()
        renderSalon()
      } else if (action === 'quantity-minus' || action === 'quantity-plus') {
        const stepper = target.closest('.wo-stepper')
        const id = stepper.dataset.productId
        const unit = Number(stepper.dataset.unit)
        const next = Math.max(0, Math.min(999, (salon.quantities.get(id) || 0) + (action === 'quantity-plus' ? unit : -unit)))
        salon.quantities.set(id, next)
        renderSalon()
      } else if (action === 'confirm-order') showOrderDialog()
      else if (action === 'submit-order') submitOrder(target)
      else if (action === 'save-inventory') saveInventory(target)
      else if (action === 'copy-setup') {
        await navigator.clipboard.writeText(target.dataset.url)
        notify('初期設定URLをコピーしました。')
      }
    })
    root.addEventListener('input', function (event) {
      if (event.target.id === 'product-search') {
        salon.query = event.target.value
        const cursor = event.target.selectionStart
        renderSalon()
        const input = document.getElementById('product-search')
        input.focus(); input.setSelectionRange(cursor, cursor)
      } else if (event.target.dataset.action === 'quantity-input') {
        const stepper = event.target.closest('.wo-stepper')
        const value = Math.max(0, Math.min(999, Number(event.target.value || 0)))
        salon.quantities.set(stepper.dataset.productId, value)
        const summary = root.querySelector('.wo-order-summary')
        if (summary) summary.outerHTML = orderSummary()
      } else if (event.target.dataset.action === 'stock-input') {
        const id = event.target.dataset.productId
        const value = Math.max(0, Math.min(100000, Number(event.target.value || 0)))
        const product = salon.data.products.find(function (item) { return item.id === id })
        if (value === Number(product.stockQuantity)) salon.stockValues.delete(id)
        else salon.stockValues.set(id, value)
        event.target.closest('.wo-inventory-row').classList.toggle('changed', salon.stockValues.has(id))
        const save = root.querySelector('[data-action="save-inventory"]')
        if (save) save.disabled = !salon.stockValues.size
      } else if (event.target.id === 'requested-delivery-date') salon.requestedDeliveryDate = event.target.value
      else if (event.target.id === 'salon-note') salon.salonNote = event.target.value
      else if (event.target.id === 'inventory-reason') salon.inventoryReason = event.target.value
    })
    root.addEventListener('change', async function (event) {
      if (event.target.id === 'manufacturer-filter') { salon.manufacturer = event.target.value; renderSalon() }
      else if (event.target.id === 'category-filter') { salon.category = event.target.value; renderSalon() }
      else if (event.target.id === 'low-stock-filter') { salon.lowStock = event.target.checked; renderSalon() }
      else if (event.target.id === 'dealer-select') {
        salon.data.selectedDealerId = event.target.value
        try { await reloadSalon(event.target.value) } catch (error) { notify(error.message, 'error') }
      }
    })
    root.addEventListener('submit', async function (event) {
      if (event.target.id !== 'dealer-code-form') return
      event.preventDefault()
      const button = event.target.querySelector('button[type="submit"]')
      button.disabled = true
      const values = Object.fromEntries(new FormData(event.target).entries())
      try {
        const result = await post('/api/admin/wholesale/contracts/code', values)
        notify(result.contract.status === 'ACTIVE' ? result.dealer.name + ' と連携済みです。' : result.dealer.name + ' へ連携承認を依頼しました。')
        event.target.reset()
        await reloadSalon(result.dealer.id)
      } catch (error) { notify(error.message, 'error') } finally { button.disabled = false }
    })
  }

  const dealer = {
    data: null,
    profile: null,
    billing: null,
    view: document.body.dataset.dealerView || 'orders',
    status: 'ALL',
    query: '',
    contractQuery: '',
    productQuery: '',
    pricingQuery: '',
    pricingContractId: new URLSearchParams(location.search).get('contractId') || '',
    pricingBulkRate: '20',
    pricingDraft: new Map(),
    detail: null,
    busy: false,
  }

  function profileField(name, label, value, options) {
    const config = options || {}
    return '<label class="' + (config.wide ? 'wide' : '') + '"><span>' + esc(label) + (config.required ? '<b>必須</b>' : '') + '</span><input name="' + esc(name) + '" value="' + esc(value || '') + '" maxlength="' + (config.maxlength || 180) + '" ' + (config.required ? 'required' : '') + ' ' + (config.type ? 'type="' + config.type + '"' : '') + ' ' + (config.autocomplete ? 'autocomplete="' + config.autocomplete + '"' : '') + ' placeholder="' + esc(config.placeholder || '') + '"></label>'
  }

  function dealerCompany() {
    const profile = dealer.profile || {}
    return '<section class="wo-workspace wo-company-workspace"><header class="wo-workspace-head"><div><p class="wo-section-label">COMPANY PROFILE</p><h2>会社・店舗情報</h2><p>取引先への表示と納品書に使用する、自社の正式な情報を管理します。</p></div><span class="wo-private-chip">' + icon('shield') + 'ディーラー専用</span></header>' +
      '<form id="dealer-company-form" class="wo-company-form"><section><header><div>' + icon('building') + '<span><strong>基本情報</strong><small>会社名と営業拠点の情報</small></span></div></header><div class="wo-company-grid">' +
      profileField('companyName', '会社名・法人名', profile.companyName, { required:true, maxlength:140, autocomplete:'organization', placeholder:'例：ORIMIAビューティー株式会社' }) +
      profileField('storeName', '営業所・店舗名', profile.storeName, { maxlength:140, placeholder:'例：岡山営業所' }) +
      profileField('representativeName', '代表者名', profile.representativeName, { maxlength:120, autocomplete:'name', placeholder:'例：山田 太郎' }) +
      profileField('invoiceRegistrationNumber', '適格請求書発行事業者 登録番号', profile.invoiceRegistrationNumber, { maxlength:16, placeholder:'T1234567890123' }) + '</div></section>' +
      '<section><header><div>' + icon('shop') + '<span><strong>所在地・連絡先</strong><small>発注元からの連絡や帳票に使用</small></span></div></header><div class="wo-company-grid">' +
      profileField('email', '登録メールアドレス', profile.email, { required:true, maxlength:200, type:'email', autocomplete:'email', placeholder:'order@example.jp' }) +
      profileField('phone', '電話番号', profile.phone, { maxlength:40, type:'tel', autocomplete:'tel', placeholder:'086-000-0000' }) +
      profileField('postalCode', '郵便番号', profile.postalCode, { maxlength:12, autocomplete:'postal-code', placeholder:'700-0000' }) +
      profileField('prefecture', '都道府県', profile.prefecture, { maxlength:40, autocomplete:'address-level1', placeholder:'岡山県' }) +
      profileField('city', '市区町村', profile.city, { maxlength:100, autocomplete:'address-level2', placeholder:'岡山市北区' }) +
      profileField('addressLine1', '番地', profile.addressLine1, { maxlength:180, autocomplete:'address-line1', placeholder:'駅前町1-1-1' }) +
      profileField('addressLine2', '建物名・部屋番号', profile.addressLine2, { wide:true, maxlength:180, autocomplete:'address-line2', placeholder:'建物名、階数など' }) + '</div></section>' +
      '<section><header><div>' + icon('link') + '<span><strong>公開・営業情報</strong><small>美容室との取引に必要な補足情報</small></span></div></header><div class="wo-company-grid">' +
      profileField('websiteUrl', 'Webサイト', profile.websiteUrl, { wide:true, maxlength:300, type:'url', placeholder:'https://example.jp' }) +
      profileField('businessHours', '営業時間', profile.businessHours, { wide:true, maxlength:200, placeholder:'平日 9:00〜18:00' }) + '</div></section>' +
      '<section class="wo-company-account"><header><div>' + icon('shield') + '<span><strong>アカウント識別情報</strong><small>ログインIDはログイン情報の再設定から変更します</small></span></div></header><dl><div><dt>ログインID</dt><dd><code>' + esc(profile.loginId) + '</code></dd></div><div><dt>ディーラー固有コード</dt><dd><code>' + esc(profile.dealerCode) + '</code><button class="wo-icon-link" type="button" data-action="copy-dealer-code" data-code="' + esc(profile.dealerCode) + '" aria-label="ディーラー固有コードをコピー">' + icon('copy') + '</button></dd></div></dl></section>' +
      '<footer class="wo-company-save"><p>保存した情報は、次回表示する納品書にも反映されます。</p><button class="wo-button wo-button-primary" type="submit">' + icon('check') + '会社・店舗情報を保存</button></footer></form></section>'
  }

  function dealerBilling() {
    const billing = dealer.billing || {}
    const query = new URLSearchParams(location.search)
    const checkout = query.get('checkout')
    const required = query.get('required') === '1'
    const notice = checkout === 'success'
      ? '<div class="wo-billing-notice success">' + icon('check') + '<span><strong>カード登録を確認しています</strong><small>契約状態が反映されると、すべての機能を利用できます。</small></span></div>'
      : checkout === 'cancelled'
        ? '<div class="wo-billing-notice">' + icon('alert') + '<span><strong>カード登録は完了していません</strong><small>内容を確認し、もう一度お手続きください。</small></span></div>'
        : required
          ? '<div class="wo-billing-notice">' + icon('card') + '<span><strong>この機能を利用するにはカード登録が必要です</strong><small>登録後、受注・契約美容室・商品・価格設定を利用できます。</small></span></div>'
          : ''
    const statusClass = String(billing.subscriptionStatus || 'none').replace(/[^a-z_]/g, '')
    const card = billing.card
      ? '<div class="wo-payment-method">' + icon('card') + '<span><small>登録カード</small><strong>' + esc(String(billing.card.brand || '').toUpperCase()) + ' •••• ' + esc(billing.card.last4) + '</strong><small>有効期限 ' + esc(billing.card.expMonth) + ' / ' + esc(billing.card.expYear) + '</small></span></div>'
      : '<div class="wo-payment-method empty">' + icon('card') + '<span><small>お支払い方法</small><strong>カード未登録</strong><small>カード番号はORIMIAに保存されません。</small></span></div>'
    const period = billing.trialEndsAt
      ? '<div><dt>無料期間終了</dt><dd>' + date(billing.trialEndsAt) + (billing.remainingTrialDays != null ? '<small>残り' + Number(billing.remainingTrialDays) + '日</small>' : '') + '</dd></div>'
      : billing.currentPeriodEnd ? '<div><dt>次回更新日</dt><dd>' + date(billing.currentPeriodEnd) + '</dd></div>' : '<div><dt>契約開始</dt><dd>カード登録後</dd></div>'
    const action = billing.accessAllowed
      ? '<button class="wo-button wo-button-secondary" type="button" data-action="open-billing-portal">' + icon('external') + '支払い方法・契約を管理</button>'
      : '<label class="wo-billing-agreement"><input id="dealer-billing-agreement" type="checkbox"><span>料金、無料期間、継続課金の内容を確認しました。</span></label><button class="wo-button wo-button-primary wo-checkout-button" type="button" data-action="start-billing-checkout" disabled>' + icon('card') + 'カードを登録して利用を開始</button>'
    return '<section class="wo-workspace wo-billing-workspace">' + notice + '<header class="wo-workspace-head"><div><p class="wo-section-label">BILLING & PLAN</p><h2>システム利用料</h2><p>Stripeの安全な決済画面でカードを登録し、契約状況を管理します。</p></div><span class="wo-billing-status ' + statusClass + '">' + esc(billing.subscriptionStatusLabel || '確認中') + '</span></header>' +
      '<div class="wo-billing-layout"><section class="wo-plan-summary"><div class="wo-plan-heading"><span>' + icon('building') + '</span><div><small>ORIMIA PARTNER</small><h3>' + esc(billing.planName || 'ディーラープラン') + '</h3></div></div><div class="wo-plan-price"><strong>*****円</strong><span>/ 月</span></div><p>受注、契約美容室、商品、納品書、契約価格を一つの会社アカウントで管理できます。</p><ul><li>' + icon('check') + '契約美容室・商品数に応じた一元管理</li><li>' + icon('check') + 'Stripeによる安全なカード決済</li><li>' + icon('check') + '登録から' + Number(billing.trialDays || 30) + '日間の無料トライアル</li></ul></section>' +
      '<section class="wo-billing-detail"><header><div><small>CONTRACT STATUS</small><h3>ご契約状況</h3></div><button class="wo-icon-link" type="button" data-action="refresh-billing" aria-label="契約状況を更新" title="契約状況を更新">' + icon('refresh') + '</button></header><dl><div><dt>現在の状態</dt><dd>' + esc(billing.subscriptionStatusLabel || '確認中') + '</dd></div>' + period + '<div><dt>解約予約</dt><dd>' + (billing.cancelAtPeriodEnd ? '期間終了時に解約' : 'なし') + '</dd></div></dl>' + card +
      (!billing.configured ? '<div class="wo-billing-config-error">' + icon('alert') + '<span>現在カード登録を受け付けられません。しばらくしてから再度お試しください。</span></div>' : '') +
      '<div class="wo-billing-actions">' + action + '<small>' + icon('shield') + '決済情報はStripeが安全に管理します。</small></div></section></div></section>'
  }

  function dealerCodePanel() {
    return '<section class="wo-dealer-code-band"><div>' + icon('link') + '<span><small>DEALER CONNECTION CODE</small><strong>美容室との連携に使う固有コード</strong></span></div><code>' + esc(dealer.data.dealer.dealerCode) + '</code><button class="wo-button wo-button-secondary" type="button" data-action="copy-dealer-code" data-code="' + esc(dealer.data.dealer.dealerCode) + '">' + icon('copy') + 'コードをコピー</button><p>美容室側の「在庫管理・発注」で、このコードを入力してもらってください。</p></section>'
  }

  function dealerStats() {
    const open = dealer.data.orders.filter(function (order) { return order.status === 'ORDERED' }).length
    const accepted = dealer.data.orders.filter(function (order) { return order.status === 'ACCEPTED' }).length
    const shipping = dealer.data.orders.filter(function (order) { return order.status === 'SHIPPED' }).length
    const activeSalons = dealer.data.contracts.filter(function (contract) { return contract.status === 'ACTIVE' }).length
    return '<div class="wo-kpis"><div><span>新規注文</span><strong>' + open + '<small>件</small></strong></div><div><span>受注済み</span><strong>' + accepted + '<small>件</small></strong></div><div><span>出荷待ち</span><strong>' + shipping + '<small>件</small></strong></div><div><span>契約美容室</span><strong>' + activeSalons + '<small>店舗</small></strong></div></div>'
  }

  function dealerContracts() {
    const visible = dealer.data.contracts.filter(function (contract) {
      if (contract.status === 'SUSPENDED') return false
      const needle = dealer.contractQuery.trim().toLocaleLowerCase('ja')
      return !needle || [contract.organizationName, contract.publicCode, contract.customerCode, contract.phone, contract.prefecture, contract.city].join(' ').toLocaleLowerCase('ja').includes(needle)
    })
    const pendingCount = dealer.data.contracts.filter(function (contract) { return contract.status === 'PENDING' }).length
    return '<section class="wo-workspace wo-contract-management"><header class="wo-workspace-head"><div><p class="wo-section-label">SALON CONTRACTS</p><h2>契約美容室を管理</h2><p>美容室の店舗コードで登録できます。解除後も過去の注文・納品書は保持されます。</p></div><span class="wo-count-chip">' + visible.length + '店舗</span></header>' +
      '<form id="dealer-salon-form" class="wo-dealer-salon-form"><label><span>美容室の店舗コード</span><input name="salonCode" required maxlength="80" autocomplete="off" autocapitalize="characters" placeholder="例：LIEN-YOHAKU"></label><button class="wo-button wo-button-primary" type="submit">' + icon('plus') + '契約美容室を登録</button></form>' +
      (pendingCount ? '<div class="wo-inline-notice">' + icon('alert') + '<span>美容室からの承認待ちが' + pendingCount + '件あります。</span></div>' : '') +
      '<div class="wo-contract-toolbar"><label class="wo-search">' + icon('search') + '<input id="dealer-contract-search" value="' + esc(dealer.contractQuery) + '" placeholder="美容室名・店舗コードで検索"></label></div>' +
      (visible.length ? '<div class="wo-contract-table"><div class="wo-contract-table-head"><span>美容室</span><span>店舗コード</span><span>連絡先</span><span>状態</span><span>操作</span></div>' + visible.map(function (contract) {
        const location = [contract.prefecture, contract.city].filter(Boolean).join(' ')
        const approve = contract.status === 'PENDING' ? '<button class="wo-button wo-button-primary wo-button-compact" type="button" data-action="approve-contract" data-id="' + esc(contract.id) + '">' + icon('check') + '承認</button>' : ''
        const pricing = contract.status === 'ACTIVE' ? '<a class="wo-button wo-button-secondary wo-button-compact" href="/dealer/pricing?contractId=' + encodeURIComponent(contract.id) + '">' + icon('percent') + '価格設定</a>' : ''
        return '<article><div><strong>' + esc(contract.organizationName) + '</strong><small>' + esc(location || '住所未登録') + '</small></div><code>' + esc(contract.publicCode || contract.customerCode) + '</code><span>' + esc(contract.phone || '未登録') + '</span><span class="wo-contract-status ' + (contract.status === 'ACTIVE' ? 'active' : 'pending') + '">' + (contract.status === 'ACTIVE' ? '契約中' : '承認待ち') + '</span><div class="wo-row-actions">' + pricing + approve + '<button class="wo-icon-link wo-icon-danger" type="button" data-action="remove-contract" data-id="' + esc(contract.id) + '" data-label="' + esc(contract.organizationName) + '" aria-label="' + esc(contract.organizationName) + 'を契約一覧から削除">' + icon('trash') + '</button></div></article>'
      }).join('') + '</div>' : emptyState('users', '契約美容室はありません', '店舗コードを入力して、取引先の美容室を登録してください。')) + '</section>'
  }

  function dealerProductFields(product) {
    const value = product || {}
    return '<div class="wo-product-form-grid"><label><span>メーカー名</span><input name="manufacturerName" required maxlength="140" value="' + esc(value.manufacturerName || '') + '" placeholder="例：ORIMIA PROFESSIONAL"></label><label class="wide"><span>商品名</span><input name="name" required maxlength="180" value="' + esc(value.name || '') + '" placeholder="商品名・容量"></label><label><span>カテゴリ</span><input name="category" maxlength="100" value="' + esc(value.category || '') + '" placeholder="例：シャンプー"></label><label><span>商品コード</span><input name="productCode" required maxlength="100" value="' + esc(value.productCode || '') + '" placeholder="例：ORI-SH-001"></label><label><span>JANコード</span><input name="janCode" inputmode="numeric" maxlength="13" value="' + esc(value.janCode || '') + '" placeholder="8桁または13桁"></label><label><span>定価（税抜）</span><input name="suggestedRetailPrice" type="number" min="0" max="10000000" required value="' + esc(value.listPrice == null ? (value.suggestedRetailPrice == null ? '' : value.suggestedRetailPrice) : value.listPrice) + '" placeholder="0"></label><label><span>発注単位</span><input name="orderUnit" type="number" min="1" max="999" required value="' + esc(value.orderUnit || 1) + '"></label><label class="wide"><span>商品メモ</span><textarea name="description" rows="2" maxlength="1000" placeholder="容量、入数、取扱上の注意など">' + esc(value.description || '') + '</textarea></label></div>'
  }

  function dealerProducts() {
    const products = dealer.data.products.filter(function (product) {
      if (!product.active) return false
      const needle = dealer.productQuery.trim().toLocaleLowerCase('ja')
      return !needle || [product.manufacturerName, product.name, product.category, product.productCode, product.janCode].join(' ').toLocaleLowerCase('ja').includes(needle)
    })
    return '<section class="wo-workspace wo-product-management"><header class="wo-workspace-head"><div><p class="wo-section-label">DEALER CATALOG</p><h2>商品を登録</h2><p>登録後、「契約価格」で美容室ごとの取扱と割引率を設定すると発注画面へ公開されます。</p></div><span class="wo-count-chip">' + products.length + '商品</span></header><form id="dealer-product-form" class="wo-dealer-product-form">' + dealerProductFields() + '<div class="wo-form-actions"><button class="wo-button wo-button-primary" type="submit">' + icon('plus') + '商品を登録</button></div></form>' +
      '<div class="wo-product-toolbar"><label class="wo-search">' + icon('search') + '<input id="dealer-product-search" value="' + esc(dealer.productQuery) + '" placeholder="商品名・メーカー・商品コードで検索"></label></div>' +
      (products.length ? '<div class="wo-catalog-table"><div class="wo-catalog-table-head"><span>商品</span><span>商品コード / JAN</span><span>定価（税抜）</span><span>発注単位</span><span>操作</span></div>' + products.map(function (product) {
        return '<article><div><small>' + esc(product.manufacturerName) + '</small><strong>' + esc(product.name) + '</strong><span>' + esc(product.category || 'カテゴリ未設定') + '</span></div><div><code>' + esc(product.productCode) + '</code><small>' + esc(product.janCode || 'JAN未登録') + '</small></div><strong>' + yen(product.listPrice) + '</strong><span>' + Number(product.orderUnit) + '点</span><div class="wo-row-actions"><button class="wo-icon-link" type="button" data-action="edit-product" data-id="' + esc(product.id) + '" title="商品を編集" aria-label="' + esc(product.name) + 'を編集">' + icon('edit') + '</button><button class="wo-icon-link wo-icon-danger" type="button" data-action="remove-product" data-id="' + esc(product.id) + '" data-label="' + esc(product.name) + '" title="商品を削除" aria-label="' + esc(product.name) + 'を削除">' + icon('trash') + '</button></div></article>'
      }).join('') + '</div>' : emptyState('package', '登録商品はありません', '上のフォームから、最初の商品を登録してください。')) + '</section>'
  }

  function activeDealerContracts() {
    return dealer.data.contracts.filter(function (contract) { return contract.status === 'ACTIVE' })
  }

  function currentPricingContract() {
    const contracts = activeDealerContracts()
    return contracts.find(function (contract) { return contract.id === dealer.pricingContractId }) || contracts[0] || null
  }

  function storedPricing(productId) {
    const agreement = dealer.data.contractProductPrices.find(function (price) {
      return price.contractId === dealer.pricingContractId && price.dealerProductId === productId
    })
    return agreement ? { enabled:true, discountRate:Number(agreement.discountRate) } : { enabled:false, discountRate:0 }
  }

  function pricingValue(productId) {
    return dealer.pricingDraft.has(productId) ? dealer.pricingDraft.get(productId) : storedPricing(productId)
  }

  function contractUnitPrice(product, discountRate) {
    return Math.round(Number(product.listPrice || 0) * (100 - Number(discountRate || 0)) / 100)
  }

  function filteredPricingProducts() {
    const needle = dealer.pricingQuery.trim().toLocaleLowerCase('ja')
    return dealer.data.products.filter(function (product) {
      return product.active && (!needle || [product.manufacturerName, product.name, product.category, product.productCode, product.janCode].join(' ').toLocaleLowerCase('ja').includes(needle))
    })
  }

  function dealerPricing() {
    const contracts = activeDealerContracts()
    if (!contracts.length) return '<section class="wo-workspace">' + emptyState('users', '契約中の美容室がありません', '先に「契約美容室」で取引先を登録・承認してください。') + '</section>'
    const contract = currentPricingContract()
    const products = filteredPricingProducts()
    const allProducts = dealer.data.products.filter(function (product) { return product.active })
    const configuredCount = allProducts.filter(function (product) { return pricingValue(product.id).enabled }).length
    const rows = products.map(function (product) {
      const value = pricingValue(product.id)
      return '<article class="wo-pricing-row" data-pricing-row data-product-id="' + esc(product.id) + '">' +
        '<label class="wo-pricing-enabled"><input type="checkbox" data-pricing-enabled ' + (value.enabled ? 'checked' : '') + ' aria-label="' + esc(product.name) + 'を取扱商品に設定"><span></span></label>' +
        '<div class="wo-pricing-product"><small>' + esc(product.manufacturerName) + '</small><strong>' + esc(product.name) + '</strong><span>' + esc([product.category, product.productCode].filter(Boolean).join(' ・ ')) + '</span></div>' +
        '<strong><small class="wo-mobile-label">定価（税抜）</small>' + yen(product.listPrice) + '</strong>' +
        '<label class="wo-rate-input"><span class="wo-mobile-label">割引率</span><input type="number" min="0" max="100" step="0.01" inputmode="decimal" data-pricing-rate value="' + esc(value.discountRate) + '" ' + (!value.enabled ? 'disabled' : '') + '><span>%</span></label>' +
        '<strong class="wo-pricing-unit"><small class="wo-mobile-label">契約単価（税抜）</small>' + yen(contractUnitPrice(product, value.discountRate)) + '</strong>' +
        '<span class="wo-pricing-visibility ' + (value.enabled ? 'active' : '') + '">' + (value.enabled ? '美容室に公開' : '非公開') + '</span></article>'
    }).join('')
    return '<section class="wo-workspace wo-pricing-management"><header class="wo-workspace-head"><div><p class="wo-section-label">SALON-SPECIFIC PRICING</p><h2>美容室別の取扱・割引設定</h2><p>同じ商品でも、美容室との取り決めに合わせて個別の割引率を設定できます。</p></div><label class="wo-pricing-salon"><span>設定する美容室</span><select id="dealer-pricing-salon">' + contracts.map(function (item) { return '<option value="' + esc(item.id) + '" ' + (item.id === contract.id ? 'selected' : '') + '>' + esc(item.organizationName) + '</option>' }).join('') + '</select><small>' + configuredCount + ' / ' + allProducts.length + '商品を公開中</small></label></header>' +
      (allProducts.length ? '<div class="wo-pricing-toolbar"><label class="wo-search">' + icon('search') + '<input id="dealer-pricing-search" value="' + esc(dealer.pricingQuery) + '" placeholder="商品名・メーカー・商品コードで検索"></label><div class="wo-pricing-bulk"><label><span>一括割引率</span><span><input id="dealer-pricing-bulk-rate" type="number" min="0" max="100" step="0.01" inputmode="decimal" value="' + esc(dealer.pricingBulkRate) + '"><b>%</b></span></label><button class="wo-button wo-button-secondary" type="button" data-action="apply-bulk-rate">選択商品へ適用</button></div></div><form id="dealer-pricing-form"><div class="wo-pricing-table"><div class="wo-pricing-head"><label><input type="checkbox" id="dealer-pricing-select-all" aria-label="表示中の商品をすべて選択"><span></span></label><span>商品</span><span>定価（税抜）</span><span>割引率</span><span>契約単価（税抜）</span><span>公開状態</span></div>' + (rows || '<div class="wo-table-empty">条件に一致する商品はありません。</div>') + '</div><footer class="wo-pricing-save"><p>' + esc(contract.organizationName) + ' に公開する商品と価格を保存します。</p><button class="wo-button wo-button-primary" type="button" data-action="save-contract-pricing">' + icon('check') + '取扱・割引設定を保存</button></footer></form>' : emptyState('package', '商品がまだ登録されていません', '先に「商品管理」で商品と定価を登録してください。')) + '</section>'
  }

  function filteredDealerOrders() {
    const needle = dealer.query.trim().toLocaleLowerCase('ja')
    return dealer.data.orders.filter(function (order) {
      return (dealer.status === 'ALL' || order.status === dealer.status) && (!needle || [order.orderNo, order.organizationName, order.deliveryNo].join(' ').toLocaleLowerCase('ja').includes(needle))
    })
  }

  function dealerOrders() {
    const orders = filteredDealerOrders()
    const filters = [['ALL', 'すべて'], ['ORDERED', '新規'], ['ACCEPTED', '受注済み'], ['SHIPPED', '出荷済み'], ['DELIVERED', '納品済み'], ['CANCELLED', 'キャンセル']]
    return dealerStats() + '<section class="wo-workspace"><header class="wo-workspace-head"><div><p class="wo-section-label">PURCHASE ORDERS</p><h2>注文一覧</h2><p>注文明細の更新と、納品書の表示・印刷をこの一覧から行えます。</p></div></header><div class="wo-order-toolbar"><div class="wo-segmented">' + filters.map(function (filter) { return '<button type="button" data-action="dealer-status-filter" data-status="' + filter[0] + '" class="' + (dealer.status === filter[0] ? 'active' : '') + '">' + filter[1] + '</button>' }).join('') + '</div><label class="wo-search">' + icon('search') + '<input id="dealer-order-search" value="' + esc(dealer.query) + '" placeholder="美容室名・発注番号で検索"></label></div>' +
      (orders.length ? '<div class="wo-dealer-orders"><div class="wo-dealer-order-head"><span>発注番号 / 受注日時</span><span>美容室</span><span>商品</span><span>金額</span><span>状態</span><span>納品書</span><span></span></div>' + orders.map(function (order) {
        return '<article class="wo-dealer-order-row"><button type="button" data-action="open-order" data-id="' + esc(order.id) + '"><span><strong>' + esc(order.orderNo) + '</strong><small>' + date(order.orderedAt, true) + '</small></span><span><small class="wo-mobile-label">美容室</small>' + esc(order.organizationName) + '</span><span><small class="wo-mobile-label">商品</small>' + Number(order.lineCount) + '商品 / ' + Number(order.totalQuantity) + '点</span><span><small class="wo-mobile-label">金額</small>' + (Number(order.totalYen) ? yen(order.totalYen) : '未確定') + '</span><span>' + statusBadge(order.status) + '</span><span>' + icon('chevron') + '</span></button><a class="wo-icon-link wo-order-note-link" href="/dealer/orders/' + encodeURIComponent(order.id) + '/delivery-note" target="_blank" rel="noopener" title="納品書を表示・印刷" aria-label="' + esc(order.orderNo) + 'の納品書を表示・印刷">' + icon('printer') + '</a></article>'
      }).join('') + '</div>' : emptyState('clipboard', '該当する注文はありません', '条件を変更して確認してください。')) + '</section>'
  }

  function renderDealer() {
    if (dealer.view === 'company') {
      root.innerHTML = dealerCompany()
      return
    }
    if (dealer.view === 'billing') {
      root.innerHTML = dealerBilling()
      return
    }
    const content = dealer.view === 'salons' ? dealerContracts() : dealer.view === 'products' ? dealerProducts() : dealer.view === 'pricing' ? dealerPricing() : dealerOrders()
    root.innerHTML = dealerCodePanel() + content + '<dialog id="wo-order-dialog" class="wo-dialog wo-order-dialog"></dialog><dialog id="wo-manage-dialog" class="wo-dialog wo-manage-dialog"></dialog>'
  }

  async function reloadDealer(refreshBilling) {
    if (dealer.view === 'company') {
      const result = await api('/api/dealer/profile')
      dealer.profile = result.profile
      renderDealer()
      return
    }
    if (dealer.view === 'billing') {
      const params = new URLSearchParams()
      if (refreshBilling) params.set('refresh', '1')
      const sessionId = new URLSearchParams(location.search).get('session_id')
      if (sessionId) params.set('session_id', sessionId)
      const query = params.toString()
      const result = await api('/api/dealer/billing/status' + (query ? '?' + query : ''))
      dealer.billing = result.billing
      renderDealer()
      return
    }
    dealer.data = await api('/api/dealer/bootstrap')
    const contracts = activeDealerContracts()
    if (!contracts.some(function (contract) { return contract.id === dealer.pricingContractId })) dealer.pricingContractId = contracts[0]?.id || ''
    dealer.pricingDraft.clear()
    renderDealer()
  }

  function orderDetailDialog() {
    const detail = dealer.detail
    const order = detail.order
    const editable = order.status === 'ORDERED' || order.status === 'ACCEPTED'
    const actions = order.status === 'ORDERED'
      ? '<button class="wo-button wo-button-danger" type="button" data-action="update-order" data-status="CANCELLED">注文を取消</button><button class="wo-button wo-button-primary" type="button" data-action="update-order" data-status="ACCEPTED">' + icon('check') + '受注を確定</button>'
      : order.status === 'ACCEPTED'
        ? '<button class="wo-button wo-button-danger" type="button" data-action="update-order" data-status="CANCELLED">注文を取消</button><button class="wo-button wo-button-primary" type="button" data-action="update-order" data-status="SHIPPED">' + icon('truck') + '出荷済みにする</button>'
        : order.status === 'SHIPPED'
          ? '<button class="wo-button wo-button-primary" type="button" data-action="update-order" data-status="DELIVERED">' + icon('check') + '納品を完了</button>'
          : ''
    return '<form method="dialog" class="wo-dialog-shell"><header><div>' + icon('clipboard') + '<div><p>' + esc(order.orderNo) + '</p><h2>' + esc(order.organizationName) + '</h2></div></div><button value="cancel" aria-label="閉じる">' + icon('close') + '</button></header><div class="wo-dialog-content"><div class="wo-detail-meta"><div><span>状態</span>' + statusBadge(order.status) + '</div><div><span>注文日時</span><strong>' + date(order.orderedAt, true) + '</strong></div><div><span>希望納品日</span><strong>' + (order.requestedDeliveryDate ? date(order.requestedDeliveryDate) : '指定なし') + '</strong></div><div><span>発注担当</span><strong>' + esc(order.orderedByName) + '</strong></div></div>' +
      (order.salonNote ? '<div class="wo-salon-note"><strong>美容室からのメモ</strong><p>' + esc(order.salonNote) + '</p></div>' : '') +
      '<div class="wo-detail-lines"><div class="wo-detail-line-head"><span>商品</span><span>商品コード</span><span>JANコード</span><span>受注数</span><span>定価</span><span>割引率</span><span>納品数</span><span>単価</span><span>金額</span></div>' + detail.lines.map(function (line) {
        return '<div class="wo-detail-line" data-line-id="' + esc(line.id) + '"><span><small>' + esc(line.manufacturerName) + '</small><strong>' + esc(line.productName) + '</strong></span><label><small class="wo-mobile-label">商品コード</small><input data-field="productCode" maxlength="100" value="' + esc(line.productCode || '') + '" ' + (!editable ? 'disabled' : '') + '></label><label><small class="wo-mobile-label">JANコード</small><input data-field="janCode" maxlength="32" inputmode="numeric" value="' + esc(line.janCode || '') + '" ' + (!editable ? 'disabled' : '') + '></label><span><small class="wo-mobile-label">受注数</small>' + Number(line.quantity) + '</span><span><small class="wo-mobile-label">定価</small>' + (line.listPrice == null ? '旧明細' : yen(line.listPrice)) + '</span><span><small class="wo-mobile-label">割引率</small>' + (line.discountRate == null ? '－' : rate(line.discountRate)) + '</span><label><small class="wo-mobile-label">納品数</small><input data-field="deliveredQuantity" type="number" min="0" max="' + Number(line.quantity) + '" value="' + Number(line.deliveredQuantity) + '" ' + (!editable ? 'disabled' : '') + '></label><label><small class="wo-mobile-label">単価</small><input data-field="unitPrice" type="number" min="0" max="10000000" value="' + Number(line.unitPrice) + '" ' + (!editable ? 'disabled' : '') + '></label><strong class="wo-line-total">' + yen(line.lineTotal) + '</strong></div>'
      }).join('') + '</div><div class="wo-detail-bottom"><label><span>ディーラーメモ</span><textarea id="dealer-note" rows="3" maxlength="1200" ' + (!editable ? 'disabled' : '') + '>' + esc(order.dealerNote || '') + '</textarea></label><dl><div><dt>税抜合計</dt><dd>' + yen(order.subtotalYen) + '</dd></div><div><dt>消費税</dt><dd>' + yen(order.taxYen) + '</dd></div><div><dt>合計</dt><dd>' + yen(order.totalYen) + '</dd></div></dl></div></div><footer><a class="wo-button wo-button-secondary" href="/dealer/orders/' + encodeURIComponent(order.id) + '/delivery-note" target="_blank" rel="noopener">' + icon('printer') + '納品書</a><span class="wo-dialog-spacer"></span><button class="wo-button wo-button-secondary" value="cancel">閉じる</button>' + actions + '</footer></form>'
  }

  async function openDealerOrder(id) {
    const dialog = document.getElementById('wo-order-dialog')
    dialog.innerHTML = '<div class="wo-dialog-loading"><span></span><p>注文明細を読み込んでいます</p></div>'
    dialog.showModal()
    try {
      dealer.detail = await api('/api/dealer/orders/' + encodeURIComponent(id))
      dialog.innerHTML = orderDetailDialog()
    } catch (error) { dialog.close(); notify(error.message, 'error') }
  }

  function detailLinesPayload() {
    return Array.from(document.querySelectorAll('.wo-detail-line')).map(function (row) {
      return {
        id: row.dataset.lineId,
        productCode: row.querySelector('[data-field="productCode"]').value,
        janCode: row.querySelector('[data-field="janCode"]').value,
        deliveredQuantity: Number(row.querySelector('[data-field="deliveredQuantity"]').value),
        unitPrice: Number(row.querySelector('[data-field="unitPrice"]').value),
      }
    })
  }

  async function updateDealerOrder(button, status) {
    if (dealer.busy) return
    dealer.busy = true
    button.disabled = true
    try {
      await post('/api/dealer/orders/' + encodeURIComponent(dealer.detail.order.id) + '/status', { status: status, dealerNote: document.getElementById('dealer-note') ? document.getElementById('dealer-note').value : '', lines: detailLinesPayload() })
      document.getElementById('wo-order-dialog').close()
      notify(statusLabels[status] + 'へ更新しました。')
      await reloadDealer()
    } catch (error) { notify(error.message, 'error'); button.disabled = false } finally { dealer.busy = false }
  }

  async function copyText(value) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(value)
    const input = document.createElement('textarea')
    input.value = value
    input.style.position = 'fixed'
    input.style.opacity = '0'
    document.body.appendChild(input)
    input.select()
    document.execCommand('copy')
    input.remove()
  }

  function showProductEditor(productId) {
    const product = dealer.data.products.find(function (item) { return item.id === productId && item.active })
    if (!product) return
    const dialog = document.getElementById('wo-manage-dialog')
    dialog.innerHTML = '<form method="dialog" class="wo-dialog-shell wo-product-editor"><header><div>' + icon('edit') + '<div><p>EDIT PRODUCT</p><h2>商品を編集</h2></div></div><button value="cancel" aria-label="閉じる">' + icon('close') + '</button></header><div class="wo-dialog-content">' + dealerProductFields(product) + '</div><footer><button class="wo-button wo-button-secondary" value="cancel">閉じる</button><button class="wo-button wo-button-primary" type="button" data-action="save-product" data-id="' + esc(product.id) + '">' + icon('check') + '変更を保存</button></footer></form>'
    dialog.showModal()
  }

  function showRemoveDialog(kind, id, label) {
    const isSalon = kind === 'contract'
    const dialog = document.getElementById('wo-manage-dialog')
    dialog.innerHTML = '<form method="dialog" class="wo-dialog-shell wo-remove-dialog"><header><div>' + icon('trash') + '<div><p>' + (isSalon ? 'REMOVE CONTRACT' : 'REMOVE PRODUCT') + '</p><h2>' + (isSalon ? '契約美容室を削除' : '商品を削除') + '</h2></div></div><button value="cancel" aria-label="閉じる">' + icon('close') + '</button></header><div class="wo-dialog-content"><p><strong>' + esc(label) + '</strong> を' + (isSalon ? '契約一覧から削除します。過去の注文と納品書は引き続き参照できます。' : '商品一覧と美容室の発注画面から削除します。過去の注文明細には残ります。') + '</p><label class="wo-delete-check"><input type="checkbox" data-remove-confirm><span>内容を確認しました</span></label></div><footer><button class="wo-button wo-button-secondary" value="cancel">キャンセル</button><button class="wo-button wo-button-danger" type="button" data-action="confirm-remove" data-kind="' + kind + '" data-id="' + esc(id) + '" disabled>' + icon('trash') + '削除する</button></footer></form>'
    dialog.showModal()
  }

  async function saveDealerProduct(button) {
    if (dealer.busy) return
    dealer.busy = true
    button.disabled = true
    const form = button.closest('form')
    try {
      await post('/api/dealer/products/' + encodeURIComponent(button.dataset.id) + '/update', Object.fromEntries(new FormData(form).entries()))
      document.getElementById('wo-manage-dialog').close()
      notify('商品情報を更新しました。')
      await reloadDealer()
    } catch (error) { notify(error.message, 'error'); button.disabled = false } finally { dealer.busy = false }
  }

  function setPricingDraft(productId, patch) {
    const current = pricingValue(productId)
    dealer.pricingDraft.set(productId, Object.assign({}, current, patch))
  }

  function applyBulkPricing() {
    const discountRate = Number(dealer.pricingBulkRate)
    if (!Number.isFinite(discountRate) || discountRate < 0 || discountRate > 100) {
      notify('一括割引率は0〜100%で入力してください。', 'error')
      return
    }
    const selectedRows = Array.from(root.querySelectorAll('[data-pricing-row]')).filter(function (row) {
      return row.querySelector('[data-pricing-enabled]').checked
    })
    if (!selectedRows.length) {
      notify('取扱商品にする行をチェックしてください。', 'error')
      return
    }
    selectedRows.forEach(function (row) { setPricingDraft(row.dataset.productId, { enabled:true, discountRate:discountRate }) })
    renderDealer()
  }

  async function saveContractPricing(button) {
    if (dealer.busy || !dealer.pricingContractId) return
    dealer.busy = true
    button.disabled = true
    const items = dealer.data.products.filter(function (product) { return product.active }).map(function (product) {
      const value = pricingValue(product.id)
      return { dealerProductId:product.id, enabled:value.enabled, discountRate:Number(value.discountRate || 0) }
    })
    try {
      const result = await post('/api/dealer/contracts/' + encodeURIComponent(dealer.pricingContractId) + '/product-pricing', { items:items })
      notify(result.configuredCount + '商品の取扱・割引設定を保存しました。')
      await reloadDealer()
    } catch (error) { notify(error.message, 'error'); button.disabled = false } finally { dealer.busy = false }
  }

  async function removeDealerItem(button) {
    if (dealer.busy) return
    dealer.busy = true
    button.disabled = true
    const kind = button.dataset.kind
    const path = kind === 'contract'
      ? '/api/dealer/contracts/' + encodeURIComponent(button.dataset.id) + '/remove'
      : '/api/dealer/products/' + encodeURIComponent(button.dataset.id) + '/remove'
    try {
      await post(path, { confirmed: true })
      document.getElementById('wo-manage-dialog').close()
      notify(kind === 'contract' ? '契約美容室を一覧から削除しました。' : '商品を削除しました。')
      await reloadDealer()
    } catch (error) { notify(error.message, 'error'); button.disabled = false } finally { dealer.busy = false }
  }

  function bindDealer() {
    root.addEventListener('click', async function (event) {
      const target = event.target.closest('[data-action]')
      if (!target) return
      if (target.dataset.action === 'dealer-status-filter') { dealer.status = target.dataset.status; renderDealer() }
      else if (target.dataset.action === 'open-order') openDealerOrder(target.dataset.id)
      else if (target.dataset.action === 'copy-dealer-code') {
        try { await copyText(target.dataset.code); notify('ディーラー固有コードをコピーしました。') } catch { notify('コードをコピーできませんでした。', 'error') }
      }
      else if (target.dataset.action === 'start-billing-checkout') {
        if (dealer.busy) return
        dealer.busy = true
        target.disabled = true
        try {
          const result = await post('/api/dealer/billing/checkout', {})
          if (!result.url) throw new Error('カード登録画面を開けませんでした。')
          location.assign(result.url)
        } catch (error) { notify(error.message, 'error'); target.disabled = false; dealer.busy = false }
      }
      else if (target.dataset.action === 'open-billing-portal') {
        if (dealer.busy) return
        dealer.busy = true
        target.disabled = true
        try {
          const result = await post('/api/dealer/billing/portal', {})
          if (!result.url) throw new Error('お支払い管理を開けませんでした。')
          location.assign(result.url)
        } catch (error) { notify(error.message, 'error'); target.disabled = false; dealer.busy = false }
      }
      else if (target.dataset.action === 'refresh-billing') {
        target.disabled = true
        try { await reloadDealer(true); notify('契約状況を更新しました。') } catch (error) { notify(error.message, 'error'); target.disabled = false }
      }
      else if (target.dataset.action === 'approve-contract') {
        target.disabled = true
        try { await post('/api/dealer/contracts/' + encodeURIComponent(target.dataset.id) + '/approve', {}); notify('美容室との連携を承認しました。'); await reloadDealer() } catch (error) { notify(error.message, 'error'); target.disabled = false }
      } else if (target.dataset.action === 'remove-contract') showRemoveDialog('contract', target.dataset.id, target.dataset.label)
      else if (target.dataset.action === 'edit-product') showProductEditor(target.dataset.id)
      else if (target.dataset.action === 'remove-product') showRemoveDialog('product', target.dataset.id, target.dataset.label)
      else if (target.dataset.action === 'save-product') saveDealerProduct(target)
      else if (target.dataset.action === 'apply-bulk-rate') applyBulkPricing()
      else if (target.dataset.action === 'save-contract-pricing') saveContractPricing(target)
      else if (target.dataset.action === 'confirm-remove') removeDealerItem(target)
      else if (target.dataset.action === 'update-order') updateDealerOrder(target, target.dataset.status)
    })
    root.addEventListener('input', function (event) {
      const searchState = event.target.id === 'dealer-order-search'
        ? ['query', 'dealer-order-search']
        : event.target.id === 'dealer-contract-search'
          ? ['contractQuery', 'dealer-contract-search']
          : event.target.id === 'dealer-product-search'
            ? ['productQuery', 'dealer-product-search']
            : event.target.id === 'dealer-pricing-search'
              ? ['pricingQuery', 'dealer-pricing-search']
            : null
      if (searchState) {
        dealer[searchState[0]] = event.target.value
        const cursor = event.target.selectionStart
        renderDealer()
        const input = document.getElementById(searchState[1])
        if (input) { input.focus(); input.setSelectionRange(cursor, cursor) }
      }
      if (event.target.closest('.wo-detail-line') && (event.target.dataset.field === 'unitPrice' || event.target.dataset.field === 'deliveredQuantity')) {
        const row = event.target.closest('.wo-detail-line')
        const price = Number(row.querySelector('[data-field="unitPrice"]').value || 0)
        const quantity = Number(row.querySelector('[data-field="deliveredQuantity"]').value || 0)
        row.querySelector('.wo-line-total').textContent = yen(price * quantity)
      }
      if (event.target.id === 'dealer-pricing-bulk-rate') dealer.pricingBulkRate = event.target.value
      if (event.target.matches('[data-pricing-rate]')) {
        const row = event.target.closest('[data-pricing-row]')
        const product = dealer.data.products.find(function (item) { return item.id === row.dataset.productId })
        const discountRate = Number(event.target.value || 0)
        setPricingDraft(row.dataset.productId, { discountRate:discountRate })
        const unit = row.querySelector('.wo-pricing-unit')
        if (unit && product) unit.innerHTML = '<small class="wo-mobile-label">契約単価（税抜）</small>' + yen(contractUnitPrice(product, discountRate))
      }
    })
    root.addEventListener('change', function (event) {
      if (event.target.id === 'dealer-billing-agreement') {
        const button = root.querySelector('[data-action="start-billing-checkout"]')
        if (button) button.disabled = !event.target.checked || !dealer.billing || !dealer.billing.configured
        return
      }
      if (event.target.matches('[data-remove-confirm]')) {
        const button = event.target.closest('form').querySelector('[data-action="confirm-remove"]')
        if (button) button.disabled = !event.target.checked
        return
      }
      if (event.target.id === 'dealer-pricing-salon') {
        dealer.pricingContractId = event.target.value
        dealer.pricingDraft.clear()
        const url = new URL(location.href)
        url.searchParams.set('contractId', dealer.pricingContractId)
        history.replaceState(null, '', url)
        renderDealer()
        return
      }
      if (event.target.id === 'dealer-pricing-select-all') {
        root.querySelectorAll('[data-pricing-row]').forEach(function (row) {
          setPricingDraft(row.dataset.productId, { enabled:event.target.checked })
        })
        renderDealer()
        return
      }
      if (event.target.matches('[data-pricing-enabled]')) {
        const row = event.target.closest('[data-pricing-row]')
        setPricingDraft(row.dataset.productId, { enabled:event.target.checked })
        renderDealer()
      }
    })
    root.addEventListener('submit', async function (event) {
      if (event.target.id === 'dealer-company-form') {
        event.preventDefault()
        if (dealer.busy) return
        dealer.busy = true
        const form = event.target
        const button = form.querySelector('button[type="submit"]')
        button.disabled = true
        try {
          const result = await post('/api/dealer/profile', Object.fromEntries(new FormData(form).entries()))
          dealer.profile = result.profile
          renderDealer()
          notify('会社・店舗情報を保存しました。')
        } catch (error) { notify(error.message, 'error'); button.disabled = false } finally { dealer.busy = false }
        return
      }
      if (event.target.id !== 'dealer-salon-form' && event.target.id !== 'dealer-product-form') return
      event.preventDefault()
      if (dealer.busy) return
      dealer.busy = true
      const form = event.target
      const button = form.querySelector('button[type="submit"]')
      button.disabled = true
      const salonForm = form.id === 'dealer-salon-form'
      try {
        const result = await post(salonForm ? '/api/dealer/contracts' : '/api/dealer/products', Object.fromEntries(new FormData(form).entries()))
        notify(salonForm ? result.organization.name + ' を契約美容室に登録しました。' : '商品を登録しました。')
        form.reset()
        await reloadDealer()
      } catch (error) { notify(error.message, 'error'); button.disabled = false } finally { dealer.busy = false }
    })
  }

  async function pollDealerBilling() {
    if (dealer.view !== 'billing' || new URLSearchParams(location.search).get('checkout') !== 'success') return
    for (let attempt = 0; attempt < 12; attempt += 1) {
      if (dealer.billing && dealer.billing.accessAllowed) {
        const requested = new URLSearchParams(location.search).get('next') || '/dealer/orders'
        const destination = /^\/dealer\/(orders|salons|products|pricing)(?:[?/#]|$)/.test(requested) ? requested : '/dealer/orders'
        location.replace(destination)
        return
      }
      await new Promise(function (resolve) { setTimeout(resolve, 1500) })
      try { await reloadDealer(true) } catch {}
    }
  }

  async function start() {
    try {
      if (page === 'salon') {
        bindSalon()
        await reloadSalon()
      } else if (page === 'dealer') {
        bindDealer()
        await reloadDealer()
        pollDealerBilling()
      }
    } catch (error) {
      root.innerHTML = emptyState('alert', '画面を読み込めませんでした', error.message) + '<div class="wo-retry"><button class="wo-button wo-button-primary" type="button" onclick="location.reload()">再読み込み</button></div>'
    }
  }

  start()
})()

/* dealer-operations-v576 */
/* dealer-contract-pricing-v581 */

/* dealer-company-billing-v584 */
