'use strict'

;(() => {
  if (window.__orimiaStampProgramV603) return
  window.__orimiaStampProgramV603 = true

  const API = '/api/lien-stamp-program'
  const ROOT_SELECTOR = '[data-stamp-settings-v603]'
  let frame = 0

  const escapeHtml = value => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')

  const money = value => `${Number(value || 0).toLocaleString('ja-JP')}円`

  const icon = name => {
    const paths = {
      stamp: '<path d="M5 22h14"/><path d="M19.3 13.3a3.8 3.8 0 0 0-2.6-6.5 5 5 0 1 0-9.4 0 3.8 3.8 0 0 0-2.6 6.5L3 15v3h18v-3Z"/>',
      gift: '<rect x="3" y="8" width="18" height="13" rx="2"/><path d="M12 8v13M3 12h18M7.5 8C5.6 8 5 6.7 5.6 5.5c.8-1.7 3.4-.8 6.4 2.5M16.5 8c1.9 0 2.5-1.3 1.9-2.5-.8-1.7-3.4-.8-6.4 2.5"/>',
      check: '<path d="m5 12 4 4L19 6"/>',
      alert: '<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/>',
    }
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.stamp}</svg>`
  }

  function optionLabel(item, kind) {
    if (kind === 'product') {
      const maker = item.manufacturerName ? `${item.manufacturerName} / ` : ''
      return `${maker}${item.name} (${money(item.priceYen)})`
    }
    const duration = item.durationMinutes ? ` / ${item.durationMinutes}分` : ''
    return `${item.name} (${money(item.priceYen)}${duration})`
  }

  function automaticTitle(root) {
    const type = root.querySelector('[data-sp-field="rewardType"]')?.value
    const discount = Number(root.querySelector('[data-sp-field="discountValue"]')?.value || 0)
    if (type === 'PRODUCT_FREE') {
      const select = root.querySelector('[data-sp-field="rewardProductId"]')
      return select?.selectedOptions[0]?.dataset.name ? `${select.selectedOptions[0].dataset.name} 1点無料` : '店舗指定商品 1点無料'
    }
    if (type === 'MENU_FREE') {
      const select = root.querySelector('[data-sp-field="rewardMenuId"]')
      return select?.selectedOptions[0]?.dataset.name ? `${select.selectedOptions[0].dataset.name} 無料` : '店舗指定メニュー無料'
    }
    if (type === 'DISCOUNT_PERCENT') return discount ? `${discount}%OFFクーポン` : '割引クーポン'
    if (type === 'DISCOUNT_FIXED') return discount ? `${money(discount)}OFFクーポン` : '割引クーポン'
    return '店舗で選べる来店特典'
  }

  function automaticDescription(type) {
    if (type === 'PRODUCT_FREE') return '次回来店時に対象商品を1点お受け取りいただけます。'
    if (type === 'MENU_FREE') return '次回来店時に対象メニューをご利用いただけます。'
    if (type === 'DISCOUNT_PERCENT' || type === 'DISCOUNT_FIXED') return '達成後、次回来店時の会計でご利用いただけます。'
    return '達成後、店舗スタッフへお声がけください。'
  }

  function updateConditionalFields(root) {
    const type = root.querySelector('[data-sp-field="rewardType"]')?.value || 'CUSTOM'
    root.querySelectorAll('[data-sp-for]').forEach(node => {
      node.hidden = node.dataset.spFor !== type
    })
    const discountField = root.querySelector('[data-sp-discount-field]')
    if (discountField) discountField.hidden = type !== 'DISCOUNT_PERCENT' && type !== 'DISCOUNT_FIXED'
    const discountLabel = root.querySelector('[data-sp-discount-label]')
    if (discountLabel) discountLabel.textContent = type === 'DISCOUNT_PERCENT' ? '割引率' : '割引額'
    const discountSuffix = root.querySelector('[data-sp-discount-suffix]')
    if (discountSuffix) discountSuffix.textContent = type === 'DISCOUNT_PERCENT' ? '%' : '円'
    const discountInput = root.querySelector('[data-sp-field="discountValue"]')
    if (discountInput) {
      discountInput.max = type === 'DISCOUNT_PERCENT' ? '90' : '10000000'
      discountInput.placeholder = type === 'DISCOUNT_PERCENT' ? '例：10' : '例：1000'
    }
    updatePreview(root)
  }

  function updatePreview(root) {
    const required = Math.max(1, Number(root.querySelector('[data-sp-field="requiredVisits"]')?.value || 1))
    const type = root.querySelector('[data-sp-field="rewardType"]')?.value || 'CUSTOM'
    const title = root.querySelector('[data-sp-field="rewardTitle"]')?.value.trim() || automaticTitle(root)
    const description = root.querySelector('[data-sp-field="rewardDescription"]')?.value.trim() || automaticDescription(type)
    const count = root.querySelector('[data-sp-preview-count]')
    const reward = root.querySelector('[data-sp-preview-reward]')
    const copy = root.querySelector('[data-sp-preview-description]')
    if (count) count.textContent = `${required}回のご来店で`
    if (reward) reward.textContent = title
    if (copy) copy.textContent = description
  }

  function render(root, payload) {
    const { organization, program, options } = payload
    const products = options.products.map(item => `<option value="${escapeHtml(item.id)}" data-name="${escapeHtml(item.name)}"${item.id === program.rewardProductId ? ' selected' : ''}>${escapeHtml(optionLabel(item, 'product'))}</option>`).join('')
    const menus = options.menus.map(item => `<option value="${escapeHtml(item.id)}" data-name="${escapeHtml(item.name)}"${item.id === program.rewardMenuId ? ' selected' : ''}>${escapeHtml(optionLabel(item, 'menu'))}</option>`).join('')

    root.innerHTML = `
      <header class="sp-settings-head-v603">
        <span class="sp-settings-icon-v603">${icon('stamp')}</span>
        <div>
          <small>STAMP CARD</small>
          <h2>スタンプカード設定</h2>
          <p>${escapeHtml(organization.name)}のお客様アプリに表示する達成条件と特典を管理します。</p>
        </div>
      </header>
      <div class="sp-settings-layout-v603">
        <div class="sp-settings-fields-v603">
          <label class="sp-field-v603">
            <span>特典までの来店回数</span>
            <span class="sp-number-v603"><input data-sp-field="requiredVisits" type="number" inputmode="numeric" min="1" max="50" value="${program.requiredVisits}" required><b>回</b></span>
            <small>1回の来店につき1スタンプが貯まります。</small>
          </label>
          <label class="sp-field-v603 sp-field-wide-v603">
            <span>達成特典</span>
            <select data-sp-field="rewardType">
              <option value="PRODUCT_FREE"${program.rewardType === 'PRODUCT_FREE' ? ' selected' : ''}>商品1点無料</option>
              <option value="MENU_FREE"${program.rewardType === 'MENU_FREE' ? ' selected' : ''}>メニュー無料</option>
              <option value="DISCOUNT_PERCENT"${program.rewardType === 'DISCOUNT_PERCENT' ? ' selected' : ''}>会計から割引（％）</option>
              <option value="DISCOUNT_FIXED"${program.rewardType === 'DISCOUNT_FIXED' ? ' selected' : ''}>会計から割引（円）</option>
              <option value="CUSTOM"${program.rewardType === 'CUSTOM' ? ' selected' : ''}>その他の特典</option>
            </select>
          </label>
          <label class="sp-field-v603 sp-field-wide-v603" data-sp-for="PRODUCT_FREE">
            <span>対象商品</span>
            <select data-sp-field="rewardProductId"${products ? '' : ' disabled'}>
              <option value="">${products ? '商品を選択' : '利用できる商品がありません'}</option>${products}
            </select>
            <small>商品棚に登録された販売中の商品から選べます。</small>
          </label>
          <label class="sp-field-v603 sp-field-wide-v603" data-sp-for="MENU_FREE">
            <span>対象メニュー</span>
            <select data-sp-field="rewardMenuId"${menus ? '' : ' disabled'}>
              <option value="">${menus ? 'メニューを選択' : '利用できるメニューがありません'}</option>${menus}
            </select>
            <small>メニュー管理に登録された提供中のメニューから選べます。</small>
          </label>
          <label class="sp-field-v603" data-sp-discount-field>
            <span data-sp-discount-label>割引率</span>
            <span class="sp-number-v603"><input data-sp-field="discountValue" type="number" inputmode="numeric" min="1" max="90" value="${program.rewardType.startsWith('DISCOUNT_') && program.discountValue ? program.discountValue : ''}"><b data-sp-discount-suffix>%</b></span>
          </label>
          <label class="sp-field-v603 sp-field-wide-v603">
            <span>特典名 <em data-sp-custom-required>${program.rewardType === 'CUSTOM' ? '必須' : '任意'}</em></span>
            <input data-sp-field="rewardTitle" type="text" maxlength="120" value="${escapeHtml(program.rewardTitle)}" placeholder="空欄の場合は選択内容から自動作成">
          </label>
          <label class="sp-field-v603 sp-field-wide-v603">
            <span>お客様への説明 <em>任意</em></span>
            <textarea data-sp-field="rewardDescription" maxlength="320" rows="3" placeholder="特典の利用条件や注意点">${escapeHtml(program.rewardDescription)}</textarea>
          </label>
        </div>
        <aside class="sp-preview-v603" aria-label="お客様アプリの表示プレビュー">
          <small>お客様アプリの表示</small>
          <strong>${escapeHtml(organization.name)}</strong>
          <span data-sp-preview-count></span>
          <div>${icon('gift')}<b data-sp-preview-reward></b></div>
          <p data-sp-preview-description></p>
        </aside>
      </div>
      <div class="sp-settings-actions-v603">
        <p data-sp-feedback role="status" aria-live="polite"></p>
        <button type="button" data-sp-save>${icon('check')}<span>スタンプカード設定を保存</span></button>
      </div>`

    const type = root.querySelector('[data-sp-field="rewardType"]')
    root.querySelectorAll('input,select,textarea').forEach(control => {
      control.addEventListener('input', () => updatePreview(root))
      control.addEventListener('change', () => updatePreview(root))
    })
    type?.addEventListener('change', () => {
      const title = root.querySelector('[data-sp-field="rewardTitle"]')
      const description = root.querySelector('[data-sp-field="rewardDescription"]')
      if (title) title.value = ''
      if (description) description.value = ''
      const customRequired = root.querySelector('[data-sp-custom-required]')
      if (customRequired) customRequired.textContent = type.value === 'CUSTOM' ? '必須' : '任意'
      updateConditionalFields(root)
    })
    root.addEventListener('keydown', event => {
      if (event.key === 'Enter' && event.target.tagName !== 'TEXTAREA') event.preventDefault()
    })
    root.querySelector('[data-sp-save]')?.addEventListener('click', () => save(root))
    updateConditionalFields(root)
  }

  function values(root) {
    const read = key => root.querySelector(`[data-sp-field="${key}"]`)?.value || ''
    return {
      requiredVisits:Number(read('requiredVisits')),
      rewardType:read('rewardType'),
      rewardProductId:read('rewardProductId'),
      rewardMenuId:read('rewardMenuId'),
      discountValue:read('discountValue') ? Number(read('discountValue')) : null,
      rewardTitle:read('rewardTitle'),
      rewardDescription:read('rewardDescription'),
    }
  }

  async function save(root) {
    const button = root.querySelector('[data-sp-save]')
    const feedback = root.querySelector('[data-sp-feedback]')
    button.disabled = true
    feedback.className = ''
    feedback.textContent = '保存しています…'
    try {
      const response = await fetch(API, {
        method:'PATCH',
        credentials:'same-origin',
        headers:{ 'Content-Type':'application/json', Accept:'application/json' },
        body:JSON.stringify(values(root)),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || '設定を保存できませんでした。')
      feedback.className = 'is-success'
      feedback.innerHTML = `${icon('check')}<span>お客様アプリへのスタンプカード設定を保存しました。</span>`
      render(root, data)
      const nextFeedback = root.querySelector('[data-sp-feedback]')
      if (nextFeedback) {
        nextFeedback.className = 'is-success'
        nextFeedback.innerHTML = `${icon('check')}<span>お客様アプリへのスタンプカード設定を保存しました。</span>`
      }
    } catch (error) {
      feedback.className = 'is-error'
      feedback.innerHTML = `${icon('alert')}<span>${escapeHtml(error.message || '設定を保存できませんでした。')}</span>`
    } finally {
      const current = root.querySelector('[data-sp-save]')
      if (current) current.disabled = false
    }
  }

  async function load(root) {
    root.innerHTML = '<div class="sp-settings-loading-v603">スタンプカード設定を読み込んでいます…</div>'
    try {
      const response = await fetch(API, { credentials:'same-origin', headers:{ Accept:'application/json' } })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || '設定を読み込めませんでした。')
      render(root, data)
    } catch (error) {
      root.innerHTML = `<div class="sp-settings-error-v603">${icon('alert')}<div><strong>スタンプカード設定を読み込めませんでした。</strong><p>${escapeHtml(error.message)}</p><button type="button" data-sp-retry>再読み込み</button></div></div>`
      root.querySelector('[data-sp-retry]')?.addEventListener('click', () => load(root))
    }
  }

  function mount() {
    frame = 0
    if (location.pathname !== '/admin/settings') return
    const form = document.querySelector('form[data-settings-panel="business"]')
      || Array.from(document.querySelectorAll('main form')).find(node => node.textContent.includes('ポイント'))
    if (!form || form.querySelector(ROOT_SELECTOR)) return
    const root = document.createElement('section')
    root.className = 'sp-settings-v603'
    root.setAttribute('data-stamp-settings-v603', '')
    root.setAttribute('aria-label', 'スタンプカード設定')
    form.appendChild(root)
    load(root)
  }

  function schedule() {
    if (frame) return
    frame = window.requestAnimationFrame(mount)
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', schedule, { once:true })
  else schedule()
  new MutationObserver(schedule).observe(document.documentElement, { childList:true, subtree:true })
  window.addEventListener('hashchange', schedule)
})()
