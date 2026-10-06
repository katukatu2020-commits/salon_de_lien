  function checkoutInputs() {
    return {
      menu: document.querySelector('form input[name="menu"]'),
      subtotal: document.querySelector('form input[name="subtotal"]'),
    }
  }

  function applySelectedMenus() {
    const inputs = checkoutInputs()
    if (!inputs.menu || !inputs.subtotal || inputs.menu.form !== state.checkoutForm) return
    setNativeValue(inputs.menu, state.selectedMenus.map(item => item.name.trim()).filter(Boolean).join(' + '))
    setNativeValue(inputs.subtotal, state.selectedMenus.reduce((sum, item) => sum + item.priceYen, 0))
    renderSelectedMenus()
  }

  function removeCheckoutItem(id) {
    state.selectedMenus = state.selectedMenus.filter(item => item.id !== id)
    applySelectedMenus()
  }

  function renderSelectedMenus() {
    const section = [...(state.checkoutForm?.querySelectorAll('section') || [])].find(node => node.querySelector('h3')?.textContent.trim() === '会計項目')
    const list = section?.querySelector('.divide-y')
    if (!list) return
    const desiredIds = state.selectedMenus.map(item => item.id).join('|')
    const currentIds = [...list.querySelectorAll('[data-checkout-service-item]')].map(node => node.dataset.itemId).join('|')
    const empty = [...list.children].find(node => ['追加項目はありません。', '会計項目はありません。'].includes(node.textContent.trim()))
    if (empty) {
      if (empty.textContent !== '会計項目はありません。') empty.textContent = '会計項目はありません。'
      const display = state.selectedMenus.length ? 'none' : ''
      if (empty.style.display !== display) empty.style.display = display
    }
    if (desiredIds === currentIds) return
    list.querySelectorAll('[data-checkout-service-item]').forEach(node => node.remove())
    for (const [index, item] of state.selectedMenus.entries()) {
      const row = document.createElement('div')
      row.dataset.checkoutServiceItem = '1'; row.dataset.itemId = item.id
      row.className = 'checkout-service-row-v701'
      row.innerHTML = `<label>施術メニュー<input class="lien-input" aria-label="施術メニュー ${index + 1}" maxlength="500" required value="${esc(item.name)}"></label><label>施術料金<input class="lien-input" aria-label="施術料金 ${index + 1}" type="number" min="0" max="10000000" step="1" required value="${item.priceYen}"></label><button type="button" class="lien-icon-button" aria-label="${esc(item.name || '施術メニュー')}を外す" title="施術メニューを削除">${window.CheckoutMenuIconsV701.Trash2}</button>`
      const [name, price] = row.querySelectorAll('input')
      name.addEventListener('input', () => { item.name = name.value; applySelectedMenus() })
      price.addEventListener('input', () => { item.priceYen = Math.min(10000000, Math.max(0, Math.floor(Number(price.value) || 0))); applySelectedMenus() })
      row.querySelector('button').addEventListener('click', () => removeCheckoutItem(item.id))
      if (empty) list.insertBefore(row, empty); else list.appendChild(row)
    }
  }

  async function openMenuPicker() {
    const form = state.checkoutForm
    try { state.menus = (await jsonRequest('/api/admin/checkout-menus')).menus || [] }
    catch (error) { showToast(error.message, 'error'); return }
    if (!form?.isConnected || form !== state.checkoutForm) return
    const overlay = document.createElement('div')
    overlay.className = 'lien-v442-overlay'
    overlay.innerHTML = `<section class="lien-v442-dialog" role="dialog" aria-modal="true" aria-labelledby="lien-menu-picker-title"><header><div><small>会計項目</small><h2 id="lien-menu-picker-title">追加するメニューを選択</h2></div><button type="button" class="lien-v442-close" aria-label="閉じる">${window.CheckoutMenuIconsV701.X}</button></header><div class="lien-v442-body"><div class="lien-v442-menu-list">${state.menus.map(menu => `<button type="button" class="lien-v442-menu" data-menu-id="${esc(menu.id)}"><span><small>${esc(menu.category)} / ${menu.durationMinutes}分</small><strong>${esc(menu.name)}</strong></span><b>${menu.priceYen.toLocaleString('ja-JP')}円</b></button>`).join('')}<button type="button" class="lien-v442-menu" data-manual-menu>施術を手入力</button></div></div></section>`
    const close = () => { overlay.remove(); document.removeEventListener('keydown', keydown) }
    const keydown = event => { if (event.key === 'Escape') close() }
    document.addEventListener('keydown', keydown)
    overlay.addEventListener('mousedown', event => { if (event.target === overlay) close() })
    overlay.querySelector('.lien-v442-close').addEventListener('click', close)
    const add = menu => { state.selectedMenus.push({ ...menu, id: crypto.randomUUID() }); applySelectedMenus(); close() }
    overlay.querySelectorAll('[data-menu-id]').forEach(button => button.addEventListener('click', () => {
      const menu = state.menus.find(item => item.id === button.dataset.menuId)
      if (menu) add(menu)
    }))
    overlay.querySelector('[data-manual-menu]').onclick = () => add({ name: '', priceYen: 0 })
    document.body.appendChild(overlay)
    overlay.querySelector('.lien-v442-close').focus()
  }

  function enhanceCheckout() {
    if (!/^\/admin\/appointments\/[^/]+$/.test(location.pathname)) { state.checkoutForm = null; return }
    if (document.querySelector('script[src*="/_next/static/chunks/main-app-"]') && !window.__orimiaHydratedV680) return
    const inputs = checkoutInputs()
    if (!inputs.menu || !inputs.subtotal) return
    const form = inputs.menu.form
    if (!document.querySelector('link[href="/checkout-menu-v701.css"]')) {
      const style = document.createElement('link'); style.rel = 'stylesheet'; style.href = '/checkout-menu-v701.css'; document.head.appendChild(style)
    }
    if (state.menuPath !== location.pathname || state.checkoutForm !== form) {
      state.menuPath = location.pathname; state.checkoutForm = form; state.menus = null
      const name = inputs.menu.value.trim(), priceYen = Math.max(0, Number(inputs.subtotal.value) || 0)
      state.selectedMenus = name || priceYen ? [{ id: 'reservation', name, priceYen }] : []
      state.checkoutInitialized = true
      for (const input of [inputs.menu, inputs.subtotal]) {
        input.closest('label').hidden = true
        input.closest('label').style.display = 'none'
        input.required = false; input.setAttribute('min', '0')
      }
      if (document.querySelector('main')?.textContent.includes('取込内容要確認:')) {
        const review = document.createElement('label')
        review.className = 'checkout-review-v701'
        review.innerHTML = '<input type="checkbox" name="reservationImportReviewed" value="1" required><span>メール取込のメニュー・料金を確認済み</span>'
        form.prepend(review)
      }
    }
    const section = [...form.querySelectorAll('section')].find(node => node.querySelector('h3')?.textContent.trim() === '会計項目')
    if (!section) return
    for (const span of form.querySelectorAll('section span')) {
      if (span.textContent === '基本施術料金') span.textContent = '施術合計'
    }
    const hint = section.querySelector('h3')?.nextElementSibling
    if (hint?.textContent.includes('追加料金・商品・割引')) hint.hidden = true
    const directGrid = [...section.querySelectorAll('div')].find(node => [...node.children].some(el => el.tagName === 'BUTTON' && el.textContent.trim() === 'ロング料金') && [...node.children].some(el => el.tagName === 'BUTTON' && el.textContent.trim() === 'ポイント'))
    if (directGrid && !directGrid.querySelector('[data-lien-menu-picker-v442]')) {
      directGrid.classList.remove('sm:grid-cols-4'); directGrid.classList.add('sm:grid-cols-5')
      const button = document.createElement('button')
      button.type = 'button'; button.dataset.lienMenuPickerV442 = '1'; button.textContent = 'メニュー'
      button.className = 'min-h-11 bg-[color:var(--lien-surface-soft)] px-3 text-xs font-semibold'
      button.addEventListener('click', openMenuPicker)
      directGrid.prepend(button)
    }
    const addButton = [...section.querySelectorAll('button')].find(button => button.textContent.includes('項目を追加'))
    if (addButton && !addButton.dataset.checkoutMenuV701) {
      addButton.dataset.checkoutMenuV701 = '1'
      addButton.addEventListener('click', event => { event.preventDefault(); event.stopImmediatePropagation(); void openMenuPicker() }, true)
    }
    renderSelectedMenus()
  }
