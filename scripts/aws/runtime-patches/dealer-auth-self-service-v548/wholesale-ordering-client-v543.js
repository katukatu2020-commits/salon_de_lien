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

  function salonFilteredProducts() {
    const needle = salon.query.trim().toLocaleLowerCase('ja')
    return salon.data.products.filter(function (product) {
      const searchable = [product.name, product.manufacturerName, product.category, product.productCode, product.janCode].join(' ').toLocaleLowerCase('ja')
      return (!needle || searchable.includes(needle)) &&
        (!salon.manufacturer || product.manufacturerName === salon.manufacturer) &&
        (!salon.category || product.category === salon.category) &&
        (!salon.lowStock || Number(product.stockQuantity) <= 3)
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
      '<div class="wo-contract-copy">' + icon(active.length ? 'link' : 'truck') + '<div><p class="wo-section-label">DEALER CONNECTION</p><h2>' + (active.length ? '連携中のディーラー' : '取引ディーラーを連携') + '</h2><p>' + (active.length ? '発注データは連携先へ即時に届きます。' : '最初に取引先の専用アカウントを作成します。') + '</p></div></div>' +
      (active.length ? '<div class="wo-contract-list">' + active.map(function (contract) { return '<span><strong>' + esc(contract.dealerName) + '</strong><small>得意先コード ' + esc(contract.customerCode) + '</small></span>' }).join('') + '</div>' : '') +
      (pending.length ? '<div class="wo-pending-note">' + icon('alert') + '<span>' + pending.map(function (contract) { return esc(contract.dealerName) }).join('、') + ' の承認待ちです。</span></div>' : '') +
      (roleCanInvite ? '<details class="wo-contract-setup" ' + (!contracts.length ? 'open' : '') + '><summary>' + icon('plus') + 'ディーラーを追加</summary><form id="dealer-invite-form" class="wo-inline-form"><label><span>ディーラー名</span><input name="dealerName" required maxlength="140" placeholder="例：きくや美粧堂"></label><label><span>ログインID</span><input name="loginId" required maxlength="100" autocomplete="off" placeholder="dealer@example.jp"></label><label><span>メールアドレス</span><input name="email" type="email" required maxlength="200" autocomplete="email" placeholder="order@example.jp"></label><label><span>電話番号（任意）</span><input name="phone" maxlength="40" inputmode="tel"></label><button class="wo-button wo-button-primary" type="submit">' + icon('link') + '連携を依頼</button></form><div id="dealer-invite-result"></div></details>' : '') +
      '</section>'
  }

  function productFilters() {
    const manufacturers = uniqueValues(salon.data.products, 'manufacturerName')
    const categories = uniqueValues(salon.data.products, 'category')
    return '<div class="wo-filters"><label class="wo-search">' + icon('search') + '<input id="product-search" value="' + esc(salon.query) + '" placeholder="商品名・メーカー・JANコードで検索"><span class="sr-only">商品を検索</span></label>' +
      '<label><span class="sr-only">メーカー</span><select id="manufacturer-filter"><option value="">すべてのメーカー</option>' + manufacturers.map(function (value) { return '<option value="' + esc(value) + '" ' + (salon.manufacturer === value ? 'selected' : '') + '>' + esc(value) + '</option>' }).join('') + '</select></label>' +
      '<label><span class="sr-only">カテゴリ</span><select id="category-filter"><option value="">すべてのカテゴリ</option>' + categories.map(function (value) { return '<option value="' + esc(value) + '" ' + (salon.category === value ? 'selected' : '') + '>' + esc(value) + '</option>' }).join('') + '</select></label>' +
      '<label class="wo-check"><input id="low-stock-filter" type="checkbox" ' + (salon.lowStock ? 'checked' : '') + '><span>在庫3点以下</span></label></div>'
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
    return products.map(function (product) {
      const low = Number(product.stockQuantity) <= 3
      return '<article class="wo-product-row">' +
        '<div class="wo-product-main"><div class="wo-product-image">' + productThumb(product) + '</div><div><small>' + esc(product.manufacturerName || 'メーカー未設定') + '</small><h3>' + esc(product.name) + '</h3><p>' + esc(product.category || 'カテゴリ未設定') + (product.janCode ? ' ・ JAN ' + esc(product.janCode) : '') + '</p></div></div>' +
        '<dl class="wo-product-data"><div><dt>現在庫</dt><dd class="' + (low ? 'low' : '') + '">' + Number(product.stockQuantity).toLocaleString('ja-JP') + '<small>点</small></dd></div><div><dt>前回発注</dt><dd>' + (product.lastOrderQuantity == null ? 'なし' : Number(product.lastOrderQuantity).toLocaleString('ja-JP') + '<small>点</small>') + '<small class="wo-subdate">' + (product.lastOrderedAt ? date(product.lastOrderedAt) : '') + '</small></dd></div><div><dt>発注単位</dt><dd>' + Number(product.orderUnit || 1) + '<small>点</small></dd></div></dl>' +
        '<div class="wo-order-quantity"><span>発注数</span>' + quantityControl(product) + '</div></article>'
    }).join('')
  }

  function selectedOrder() {
    return salon.data.products.map(function (product) {
      return { product: product, quantity: salon.quantities.get(product.id) || 0 }
    }).filter(function (item) { return item.quantity > 0 })
  }

  function orderSummary() {
    const selected = selectedOrder()
    const totalQuantity = selected.reduce(function (sum, item) { return sum + item.quantity }, 0)
    return '<aside class="wo-order-summary"><div class="wo-summary-head">' + icon('clipboard') + '<div><span>発注内容</span><strong>' + selected.length + '商品 / ' + totalQuantity + '点</strong></div></div>' +
      (selected.length ? '<ul>' + selected.map(function (item) { return '<li><span><small>' + esc(item.product.manufacturerName) + '</small>' + esc(item.product.name) + '</span><strong>' + item.quantity + '点</strong></li>' }).join('') + '</ul>' : '<p class="wo-summary-empty">商品の発注数を入力してください。</p>') +
      '<label><span>希望納品日（任意）</span><input id="requested-delivery-date" type="date" value="' + esc(salon.requestedDeliveryDate) + '"></label><label><span>発注メモ（任意）</span><textarea id="salon-note" rows="3" maxlength="1200" placeholder="納品時の連絡事項など">' + esc(salon.salonNote) + '</textarea></label>' +
      '<button class="wo-button wo-button-primary wo-submit-order" type="button" data-action="confirm-order" ' + (!selected.length || !salon.data.selectedDealerId ? 'disabled' : '') + '>' + icon('truck') + '発注内容を確認</button><p class="wo-summary-foot">決済は発生しません。送信後、ディーラーへ注文情報が届きます。</p></aside>'
  }

  function orderView() {
    const products = salonFilteredProducts()
    const activeContracts = salon.data.contracts.filter(function (contract) { return contract.status === 'ACTIVE' })
    return '<section class="wo-workspace"><header class="wo-workspace-head"><div><p class="wo-section-label">PURCHASE ORDER</p><h2>商品を発注</h2><p>在庫を確認しながら、必要な商品の発注数を入力してください。</p></div>' +
      (activeContracts.length > 1 ? '<label class="wo-dealer-select"><span>発注先</span><select id="dealer-select">' + activeContracts.map(function (contract) { return '<option value="' + esc(contract.dealerId) + '" ' + (contract.dealerId === salon.data.selectedDealerId ? 'selected' : '') + '>' + esc(contract.dealerName) + '</option>' }).join('') + '</select></label>' : '') + '</header>' +
      (!activeContracts.length ? emptyState('truck', '発注先がまだ連携されていません', '上の「ディーラーを追加」から取引先へ連携を依頼してください。') : productFilters() + '<div class="wo-order-layout"><div class="wo-product-list">' + orderProductRows(products) + '</div>' + orderSummary() + '</div>') + '</section>'
  }

  function inventoryView() {
    const products = salonFilteredProducts()
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
    dialog.innerHTML = '<form method="dialog" class="wo-dialog-shell"><header><div>' + icon('clipboard') + '<div><p>ORDER CONFIRMATION</p><h2>発注内容を確認</h2></div></div><button value="cancel" aria-label="閉じる">' + icon('close') + '</button></header><div class="wo-dialog-content"><div class="wo-confirm-destination"><span>発注先</span><strong>' + esc(salon.data.contracts.find(function (contract) { return contract.dealerId === salon.data.selectedDealerId }).dealerName) + '</strong></div><ul class="wo-confirm-list">' + selected.map(function (item) { return '<li><span><small>' + esc(item.product.manufacturerName) + '</small>' + esc(item.product.name) + '</span><strong>' + item.quantity + '点</strong></li>' }).join('') + '</ul><div class="wo-confirm-total"><span>合計</span><strong>' + selected.length + '商品 / ' + total + '点</strong></div><p class="wo-confirm-note">注文後の金額と納品数量は、ディーラーの受注内容に応じて確定します。</p></div><footer><button class="wo-button wo-button-secondary" value="cancel">戻る</button><button class="wo-button wo-button-primary" type="button" data-action="submit-order">' + icon('truck') + 'この内容で注文</button></footer></form>'
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
        lines: selectedOrder().map(function (item) { return { productId: item.product.id, quantity: item.quantity } }),
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
      if (event.target.id !== 'dealer-invite-form') return
      event.preventDefault()
      const button = event.target.querySelector('button[type="submit"]')
      button.disabled = true
      const values = Object.fromEntries(new FormData(event.target).entries())
      try {
        const result = await post('/api/admin/wholesale/invites', values)
        const destination = document.getElementById('dealer-invite-result')
        if (result.setupUrl) {
          destination.innerHTML = '<div class="wo-setup-result"><span>初期設定URL（72時間有効）</span><code>' + esc(result.setupUrl) + '</code><button class="wo-button wo-button-secondary" type="button" data-action="copy-setup" data-url="' + esc(result.setupUrl) + '">' + icon('copy') + 'コピー</button></div>'
          notify('ディーラー連携用URLを発行しました。')
        } else {
          notify('既存ディーラーへ連携承認を依頼しました。')
          await reloadSalon(salon.data.selectedDealerId)
        }
        event.target.reset()
      } catch (error) { notify(error.message, 'error') } finally { button.disabled = false }
    })
  }

  const dealer = { data: null, status: 'ALL', query: '', detail: null, busy: false }

  function dealerStats() {
    const open = dealer.data.orders.filter(function (order) { return order.status === 'ORDERED' }).length
    const accepted = dealer.data.orders.filter(function (order) { return order.status === 'ACCEPTED' }).length
    const shipping = dealer.data.orders.filter(function (order) { return order.status === 'SHIPPED' }).length
    const activeSalons = dealer.data.contracts.filter(function (contract) { return contract.status === 'ACTIVE' }).length
    return '<div class="wo-kpis"><div><span>新規注文</span><strong>' + open + '<small>件</small></strong></div><div><span>受注済み</span><strong>' + accepted + '<small>件</small></strong></div><div><span>出荷待ち</span><strong>' + shipping + '<small>件</small></strong></div><div><span>契約美容室</span><strong>' + activeSalons + '<small>店舗</small></strong></div></div>'
  }

  function dealerContracts() {
    const pending = dealer.data.contracts.filter(function (contract) { return contract.status === 'PENDING' })
    if (!pending.length) return ''
    return '<section class="wo-approval-band"><header>' + icon('link') + '<div><p class="wo-section-label">CONNECTION REQUESTS</p><h2>新しい連携依頼</h2></div><span>' + pending.length + '件</span></header><div>' + pending.map(function (contract) {
      return '<article><div><strong>' + esc(contract.organizationName) + '</strong><span>' + esc([contract.prefecture, contract.city].filter(Boolean).join(' ')) + (contract.phone ? ' ・ ' + esc(contract.phone) : '') + '</span><small>得意先コード ' + esc(contract.customerCode) + '</small></div><button class="wo-button wo-button-primary" type="button" data-action="approve-contract" data-id="' + esc(contract.id) + '">' + icon('check') + '連携を承認</button></article>'
    }).join('') + '</div></section>'
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
    return '<section class="wo-workspace"><header class="wo-workspace-head"><div><p class="wo-section-label">PURCHASE ORDERS</p><h2>注文一覧</h2><p>注文を開いて、納品数・単価・出荷状況を更新します。</p></div></header><div class="wo-order-toolbar"><div class="wo-segmented">' + filters.map(function (filter) { return '<button type="button" data-action="dealer-status-filter" data-status="' + filter[0] + '" class="' + (dealer.status === filter[0] ? 'active' : '') + '">' + filter[1] + '</button>' }).join('') + '</div><label class="wo-search">' + icon('search') + '<input id="dealer-order-search" value="' + esc(dealer.query) + '" placeholder="美容室名・発注番号で検索"></label></div>' +
      (orders.length ? '<div class="wo-dealer-orders"><div class="wo-dealer-order-head"><span>発注番号 / 受注日時</span><span>美容室</span><span>商品</span><span>金額</span><span>状態</span><span></span></div>' + orders.map(function (order) {
        return '<button type="button" data-action="open-order" data-id="' + esc(order.id) + '"><span><strong>' + esc(order.orderNo) + '</strong><small>' + date(order.orderedAt, true) + '</small></span><span><small class="wo-mobile-label">美容室</small>' + esc(order.organizationName) + '</span><span><small class="wo-mobile-label">商品</small>' + Number(order.lineCount) + '商品 / ' + Number(order.totalQuantity) + '点</span><span><small class="wo-mobile-label">金額</small>' + (Number(order.totalYen) ? yen(order.totalYen) : '未確定') + '</span><span>' + statusBadge(order.status) + '</span><span>' + icon('chevron') + '</span></button>'
      }).join('') + '</div>' : emptyState('clipboard', '該当する注文はありません', '条件を変更して確認してください。')) + '</section>'
  }

  function renderDealer() {
    root.innerHTML = dealerContracts() + dealerStats() + dealerOrders() + '<dialog id="wo-order-dialog" class="wo-dialog wo-order-dialog"></dialog>'
  }

  async function reloadDealer() {
    dealer.data = await api('/api/dealer/bootstrap')
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
      '<div class="wo-detail-lines"><div class="wo-detail-line-head"><span>商品</span><span>商品コード</span><span>JANコード</span><span>受注数</span><span>納品数</span><span>単価</span><span>金額</span></div>' + detail.lines.map(function (line) {
        return '<div class="wo-detail-line" data-line-id="' + esc(line.id) + '"><span><small>' + esc(line.manufacturerName) + '</small><strong>' + esc(line.productName) + '</strong></span><label><small class="wo-mobile-label">商品コード</small><input data-field="productCode" maxlength="100" value="' + esc(line.productCode || '') + '" ' + (!editable ? 'disabled' : '') + '></label><label><small class="wo-mobile-label">JANコード</small><input data-field="janCode" maxlength="32" inputmode="numeric" value="' + esc(line.janCode || '') + '" ' + (!editable ? 'disabled' : '') + '></label><span><small class="wo-mobile-label">受注数</small>' + Number(line.quantity) + '</span><label><small class="wo-mobile-label">納品数</small><input data-field="deliveredQuantity" type="number" min="0" max="' + Number(line.quantity) + '" value="' + Number(line.deliveredQuantity) + '" ' + (!editable ? 'disabled' : '') + '></label><label><small class="wo-mobile-label">単価</small><input data-field="unitPrice" type="number" min="0" max="10000000" value="' + Number(line.unitPrice) + '" ' + (!editable ? 'disabled' : '') + '></label><strong class="wo-line-total">' + yen(line.lineTotal) + '</strong></div>'
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

  function bindDealer() {
    root.addEventListener('click', async function (event) {
      const target = event.target.closest('[data-action]')
      if (!target) return
      if (target.dataset.action === 'dealer-status-filter') { dealer.status = target.dataset.status; renderDealer() }
      else if (target.dataset.action === 'open-order') openDealerOrder(target.dataset.id)
      else if (target.dataset.action === 'approve-contract') {
        target.disabled = true
        try { await post('/api/dealer/contracts/' + encodeURIComponent(target.dataset.id) + '/approve', {}); notify('美容室との連携を承認しました。'); await reloadDealer() } catch (error) { notify(error.message, 'error'); target.disabled = false }
      } else if (target.dataset.action === 'update-order') updateDealerOrder(target, target.dataset.status)
    })
    root.addEventListener('input', function (event) {
      if (event.target.id === 'dealer-order-search') {
        dealer.query = event.target.value
        const cursor = event.target.selectionStart
        renderDealer()
        const input = document.getElementById('dealer-order-search')
        input.focus(); input.setSelectionRange(cursor, cursor)
      }
      if (event.target.closest('.wo-detail-line') && (event.target.dataset.field === 'unitPrice' || event.target.dataset.field === 'deliveredQuantity')) {
        const row = event.target.closest('.wo-detail-line')
        const price = Number(row.querySelector('[data-field="unitPrice"]').value || 0)
        const quantity = Number(row.querySelector('[data-field="deliveredQuantity"]').value || 0)
        row.querySelector('.wo-line-total').textContent = yen(price * quantity)
      }
    })
  }

  async function start() {
    try {
      if (page === 'salon') {
        bindSalon()
        await reloadSalon()
      } else if (page === 'dealer') {
        bindDealer()
        await reloadDealer()
      }
    } catch (error) {
      root.innerHTML = emptyState('alert', '画面を読み込めませんでした', error.message) + '<div class="wo-retry"><button class="wo-button wo-button-primary" type="button" onclick="location.reload()">再読み込み</button></div>'
    }
  }

  start()
})()
