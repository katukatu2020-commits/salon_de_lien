(() => {
  'use strict'

  if (window.__orimiaCustomerExperienceV504) return
  window.__orimiaCustomerExperienceV504 = true

  const state = {
    refreshQueued: false,
    pendingSlotKey: '',
    confirmedSlotKey: '',
  }

  const normalize = value => String(value || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\s+/g, '')

  function slotKey(label) {
    return String(label || '').replace(/\s+(予約可能|受付不可|選択済み|予約確定)$/, '')
  }

  function enhanceCustomerBrand() {
    if (!location.pathname.startsWith('/u/') || location.pathname === '/u/login') return
    const brand = document.querySelector('header a[href="/u/home"], .topbar a.brand[href="/u/home"]')
    if (!brand || brand.dataset.cxBrandV504 === '1') return
    brand.dataset.cxBrandV504 = '1'
    brand.setAttribute('aria-label', 'Powered by ORIMIA ホーム')
    brand.replaceChildren()
    const title = document.createElement('span')
    title.className = 'cx-v504-brand-title'
    title.textContent = 'Powered by ORIMIA'
    const sub = document.createElement('span')
    sub.className = 'cx-v504-brand-subtitle'
    sub.textContent = 'Beauty Membership'
    brand.append(title, sub)
  }

  function enhanceLogin() {
    const html = document.documentElement
    const loginForm = document.querySelector('form[action="/api/customer-auth/login"]')
    const active = location.pathname === '/u/login' && Boolean(loginForm)
    html.classList.toggle('cx-v504-login', active)
    if (!active) return

    const panel = loginForm.closest('section')
    const shell = panel?.parentElement
    const main = shell?.closest('main')
    const visual = shell ? Array.from(shell.children).find(child => child.tagName === 'FIGURE') : null
    const footer = shell ? Array.from(shell.children).find(child => child.tagName === 'P') : null
    if (!panel || !shell || !main) return

    main.classList.add('cx-login-main-v504')
    shell.classList.add('cx-login-shell-v504')
    panel.classList.add('cx-login-panel-v504')
    visual?.classList.add('cx-login-visual-v504')
    footer?.classList.add('cx-login-footer-v504')

    if (visual) {
      const visualCopy = visual.querySelectorAll('p')
      if (visualCopy[0]) visualCopy[0].textContent = 'Beauty Membership'
    }

    if (!shell.querySelector('.cx-login-brandbar-v504')) {
      const bar = document.createElement('header')
      bar.className = 'cx-login-brandbar-v504'
      const link = document.createElement('a')
      link.href = 'https://salon-de-lien.com/'
      link.setAttribute('aria-label', 'ORIMIA 公式サイトへ')
      const icon = document.createElement('img')
      icon.src = '/brand/orimia-icon-192.png?v=504'
      icon.alt = ''
      icon.width = 48
      icon.height = 48
      const copy = document.createElement('span')
      const title = document.createElement('strong')
      title.textContent = 'Powered by ORIMIA'
      const subtitle = document.createElement('small')
      subtitle.textContent = 'Beauty Membership'
      copy.append(title, subtitle)
      link.append(icon, copy)
      bar.append(link)
      shell.insertBefore(bar, shell.firstChild)
    }

    const heading = panel.querySelector('h1')
    if (heading) heading.textContent = 'お客様ログイン'
    document.title = 'お客様ログイン | Powered by ORIMIA'

    if (loginForm.dataset.cxLoginSubmitV504 !== '1') {
      loginForm.dataset.cxLoginSubmitV504 = '1'
      loginForm.addEventListener('submit', event => {
        const button = event.submitter || loginForm.querySelector('button[type="submit"]')
        if (!button) return
        button.disabled = true
        button.dataset.cxLoading = '1'
        button.textContent = 'ログインしています…'
      })
    }
  }

  function menuTags(name) {
    const tags = []
    if (/カット|眉/.test(name)) tags.push('カット')
    if (/カラー|マニキュア|ブリーチ|ホイル/.test(name)) tags.push('カラー')
    if (/パーマ|ストレート/.test(name)) tags.push('パーマ')
    if (/トリートメント/.test(name)) tags.push('ケア')
    if (/スパ(?!ー)|頭皮|マッサージ/.test(name)) tags.push('スパ')
    if (/エステ|フェイシャル/.test(name)) tags.push('エステ')
    if (!tags.length) tags.push('その他')
    return tags
  }

  function menuItems(select) {
    return Array.from(select.options).map(option => {
      const text = String(option.textContent || '').trim()
      const match = text.match(/^(.*)（(\d+)分・目安\s*([\d,]+)円）$/)
      const name = match ? match[1].trim() : text
      return {
        value: option.value,
        name,
        duration: match ? `${match[2]}分` : '',
        price: match ? `${match[3]}円` : '',
        tags: menuTags(name),
        search: normalize(text),
      }
    })
  }

  function buildMenuPicker(select) {
    const field = select.closest('label')
    if (!field) return

    const wrapper = document.createElement('div')
    wrapper.className = 'cx-menu-picker-v504'
    const trigger = document.createElement('button')
    trigger.type = 'button'
    trigger.className = 'cx-menu-trigger-v504'
    trigger.setAttribute('aria-haspopup', 'dialog')
    trigger.setAttribute('aria-expanded', 'false')

    const check = document.createElement('span')
    check.className = 'cx-menu-trigger-check-v504'
    check.setAttribute('aria-hidden', 'true')
    check.textContent = '✓'
    const copy = document.createElement('span')
    copy.className = 'cx-menu-trigger-copy-v504'
    const eyebrow = document.createElement('span')
    eyebrow.className = 'cx-menu-trigger-eyebrow-v504'
    eyebrow.textContent = '選択中のメニュー'
    const selectedName = document.createElement('strong')
    const selectedMeta = document.createElement('small')
    copy.append(eyebrow, selectedName, selectedMeta)
    const chevron = document.createElement('span')
    chevron.className = 'cx-menu-trigger-chevron-v504'
    chevron.setAttribute('aria-hidden', 'true')
    chevron.textContent = '⌄'
    trigger.append(check, copy, chevron)
    wrapper.append(trigger)
    field.insertAdjacentElement('afterend', wrapper)
    field.classList.add('cx-menu-native-field-v504')
    select.classList.add('cx-menu-native-select-v504')

    const overlay = document.createElement('div')
    overlay.className = 'cx-menu-overlay-v504'
    overlay.hidden = true
    const backdrop = document.createElement('div')
    backdrop.className = 'cx-menu-backdrop-v504'
    const dialog = document.createElement('section')
    dialog.className = 'cx-menu-dialog-v504'
    dialog.setAttribute('role', 'dialog')
    dialog.setAttribute('aria-modal', 'true')
    dialog.setAttribute('aria-label', 'メニューを選択')

    const header = document.createElement('header')
    header.className = 'cx-menu-dialog-header-v504'
    const headingWrap = document.createElement('div')
    const heading = document.createElement('h2')
    heading.textContent = 'メニューを選択'
    const headingSub = document.createElement('p')
    headingSub.textContent = '検索またはカテゴリから絞り込めます'
    headingWrap.append(heading, headingSub)
    const closeButton = document.createElement('button')
    closeButton.type = 'button'
    closeButton.className = 'cx-menu-close-v504'
    closeButton.setAttribute('aria-label', '閉じる')
    closeButton.textContent = '×'
    header.append(headingWrap, closeButton)

    const searchLabel = document.createElement('label')
    searchLabel.className = 'cx-menu-search-v504'
    const searchCaption = document.createElement('span')
    searchCaption.textContent = 'メニュー名で検索'
    const search = document.createElement('input')
    search.type = 'search'
    search.placeholder = '例：カット、カラー、スパ'
    search.autocomplete = 'off'
    searchLabel.append(searchCaption, search)

    const categories = document.createElement('div')
    categories.className = 'cx-menu-categories-v504'
    categories.setAttribute('role', 'group')
    categories.setAttribute('aria-label', 'メニューカテゴリ')
    const summary = document.createElement('p')
    summary.className = 'cx-menu-result-summary-v504'
    summary.setAttribute('aria-live', 'polite')
    const list = document.createElement('div')
    list.className = 'cx-menu-list-v504'
    list.setAttribute('role', 'listbox')
    list.setAttribute('aria-label', 'メニュー一覧')
    const empty = document.createElement('div')
    empty.className = 'cx-menu-empty-v504'
    empty.textContent = '条件に合うメニューがありません'
    empty.hidden = true

    dialog.append(header, searchLabel, categories, summary, list, empty)
    backdrop.append(dialog)
    overlay.append(backdrop)
    document.body.append(overlay)

    let category = 'すべて'
    let lastFocus = null
    const categoryNames = ['すべて', 'カット', 'カラー', 'パーマ', 'ケア', 'スパ', 'エステ', 'その他']

    function selectedItem() {
      const items = menuItems(select)
      return items.find(item => item.value === select.value) || items[0]
    }

    function syncTrigger() {
      const item = selectedItem()
      if (!item) return
      const meta = [item.duration, item.price].filter(Boolean).join(' ・ ')
      const ariaLabel = `選択中：${item.name}。メニューを変更`
      if (selectedName.textContent !== item.name) selectedName.textContent = item.name
      if (selectedMeta.textContent !== meta) selectedMeta.textContent = meta
      if (trigger.getAttribute('aria-label') !== ariaLabel) trigger.setAttribute('aria-label', ariaLabel)
    }

    function renderCategories(items) {
      categories.replaceChildren()
      for (const name of categoryNames) {
        const count = name === 'すべて' ? items.length : items.filter(item => item.tags.includes(name)).length
        if (name !== 'すべて' && count === 0) continue
        const button = document.createElement('button')
        button.type = 'button'
        button.className = 'cx-menu-category-v504'
        button.dataset.active = String(category === name)
        if (category === name) button.setAttribute('aria-current', 'true')
        button.textContent = `${name} ${count}`
        button.addEventListener('click', () => {
          category = name
          render()
        })
        categories.append(button)
      }
    }

    function choose(value) {
      const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set
      if (setter) setter.call(select, value)
      else select.value = value
      select.dispatchEvent(new Event('input', { bubbles: true }))
      select.dispatchEvent(new Event('change', { bubbles: true }))
      syncTrigger()
      close()
      window.setTimeout(syncTrigger, 0)
    }

    function render() {
      const items = menuItems(select)
      renderCategories(items)
      const query = normalize(search.value)
      const semanticTag = categoryNames.slice(1).find(name => normalize(name) === query)
      const filtered = items.filter(item => {
        const categoryMatch = category === 'すべて' || item.tags.includes(category)
        const searchMatch = !query || (semanticTag ? item.tags.includes(semanticTag) : item.search.includes(query))
        return categoryMatch && searchMatch
      })
      list.replaceChildren()
      summary.textContent = `${filtered.length}件のメニュー`
      empty.hidden = filtered.length > 0
      for (const item of filtered) {
        const button = document.createElement('button')
        button.type = 'button'
        button.className = 'cx-menu-option-v504'
        button.setAttribute('role', 'option')
        const selected = item.value === select.value
        button.dataset.selected = String(selected)
        button.setAttribute('aria-selected', String(selected))
        const mark = document.createElement('span')
        mark.className = 'cx-menu-option-mark-v504'
        mark.setAttribute('aria-hidden', 'true')
        mark.textContent = selected ? '✓' : ''
        const optionCopy = document.createElement('span')
        const title = document.createElement('strong')
        title.textContent = item.name
        const meta = document.createElement('small')
        meta.textContent = [item.duration, item.price].filter(Boolean).join(' ・ ')
        optionCopy.append(title, meta)
        button.append(mark, optionCopy)
        button.addEventListener('click', () => choose(item.value))
        list.append(button)
      }
    }

    function open() {
      lastFocus = document.activeElement
      overlay.hidden = false
      document.body.classList.add('cx-menu-open-v504')
      trigger.setAttribute('aria-expanded', 'true')
      category = 'すべて'
      search.value = ''
      render()
      window.setTimeout(() => search.focus(), 0)
    }

    function close() {
      if (overlay.hidden) return
      overlay.hidden = true
      document.body.classList.remove('cx-menu-open-v504')
      trigger.setAttribute('aria-expanded', 'false')
      if (lastFocus instanceof HTMLElement) lastFocus.focus()
    }

    trigger.addEventListener('click', open)
    closeButton.addEventListener('click', close)
    search.addEventListener('input', render)
    backdrop.addEventListener('click', event => {
      if (event.target === backdrop) close()
    })
    document.addEventListener('keydown', event => {
      if (!overlay.hidden && event.key === 'Escape') close()
    })
    select.addEventListener('change', syncTrigger)

    syncTrigger()
    select._cxMenuPickerV504 = { wrapper, overlay, syncTrigger }
  }

  function enhanceMenuPicker() {
    if (location.pathname !== '/u/appointments') {
      document.body.classList.remove('cx-menu-open-v504')
      document.querySelectorAll('.cx-menu-overlay-v504').forEach(overlay => overlay.remove())
      return
    }
    const select = Array.from(document.querySelectorAll('select')).find(candidate =>
      /ご希望のメニュー/.test(candidate.closest('label')?.textContent || '')
    )
    if (!select) return
    const existing = select._cxMenuPickerV504
    if (existing?.wrapper?.isConnected) {
      existing.syncTrigger()
      return
    }
    existing?.overlay?.remove()
    buildMenuPicker(select)
  }

  function enhanceProfile() {
    if (location.pathname !== '/u/profile') return
    const form = document.querySelector('form[action="/api/customer/profile"]')
    if (!form) return
    form.classList.add('cx-profile-form-v504')
    const nickname = form.querySelector('input[name="nickname"]')
    const label = nickname?.closest('label')
    if (label && label.dataset.cxOptionalV504 !== '1') {
      label.dataset.cxOptionalV504 = '1'
      const heading = label.querySelector('.cx-nickname-heading') || Array.from(label.childNodes).find(node => node.nodeType === Node.TEXT_NODE && String(node.textContent || '').trim())
      if (heading instanceof HTMLElement) heading.textContent = 'ニックネーム（任意）'
      else if (heading) heading.textContent = ' ニックネーム（任意） '
      nickname.removeAttribute('required')
    }
  }

  function refreshBookingSlots() {
    if (location.pathname !== '/u/appointments') return
    const success = Array.from(document.querySelectorAll('[role="status"]')).find(node =>
      /予約を受け付けました/.test(node.textContent || '')
    )
    if (success && state.pendingSlotKey) state.confirmedSlotKey = state.pendingSlotKey

    const buttons = document.querySelectorAll('button[aria-label*="予約可能"], button[aria-label*="受付不可"]')
    for (const button of buttons) {
      const key = slotKey(button.getAttribute('aria-label'))
      const reactSelected = Boolean(button.querySelector('svg')) && /予約可能/.test(button.getAttribute('aria-label') || '')
      const confirmed = Boolean(success) && key === state.confirmedSlotKey
      const desired = reactSelected || confirmed
      if (desired) {
        button.classList.toggle('cx-slot-selected-v504', !confirmed)
        button.classList.toggle('cx-slot-confirmed-v504', confirmed)
        const ariaCurrent = confirmed ? '予約確定' : '選択中'
        if (button.getAttribute('aria-current') !== ariaCurrent) button.setAttribute('aria-current', ariaCurrent)
        if (!button.querySelector('.cx-slot-check-v504')) {
          const mark = document.createElement('span')
          mark.className = 'cx-slot-check-v504'
          mark.setAttribute('aria-hidden', 'true')
          mark.textContent = '✓'
          button.append(mark)
        }
        state.pendingSlotKey = key
      } else {
        button.classList.remove('cx-slot-selected-v504', 'cx-slot-confirmed-v504')
        if (button.hasAttribute('aria-current')) button.removeAttribute('aria-current')
        button.querySelector('.cx-slot-check-v504')?.remove()
      }
    }

    if (success && success.dataset.cxConfirmedV504 !== '1') {
      success.dataset.cxConfirmedV504 = '1'
      success.classList.add('cx-booking-success-v504')
      success.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }

  function refresh() {
    state.refreshQueued = false
    enhanceLogin()
    enhanceCustomerBrand()
    enhanceMenuPicker()
    enhanceProfile()
    refreshBookingSlots()
    document.documentElement.dataset.customerExperience = 'v504'
  }

  function queueRefresh() {
    if (state.refreshQueued) return
    state.refreshQueued = true
    requestAnimationFrame(refresh)
  }

  document.addEventListener('submit', event => {
    const form = event.target
    if (!(form instanceof HTMLFormElement) || form.getAttribute('action') !== '/api/customer/profile') return
    if (form.dataset.cxSubmittingV504 === '1') {
      event.preventDefault()
      event.stopImmediatePropagation()
      return
    }
    event.preventDefault()
    event.stopImmediatePropagation()
    form.dataset.cxSubmittingV504 = '1'
    const button = event.submitter || form.querySelector('button[type="submit"]')
    if (button) {
      button.disabled = true
      button.dataset.cxLoading = '1'
      button.textContent = '保存しています…'
    }
    const output = form.querySelector('.cx-nickname-status')
    if (output) output.textContent = 'プロフィールを保存しています…'
    window.setTimeout(() => HTMLFormElement.prototype.submit.call(form), 30)
  }, true)

  document.addEventListener('click', event => {
    const button = event.target instanceof Element ? event.target.closest('button[aria-label*="予約可能"]') : null
    if (!button || !location.pathname.startsWith('/u/appointments')) return
    state.pendingSlotKey = slotKey(button.getAttribute('aria-label'))
    window.setTimeout(queueRefresh, 0)
  }, true)

  const start = () => {
    const observer = new MutationObserver(queueRefresh)
    window.setTimeout(() => {
      refresh()
      observer.observe(document.body, { childList: true, subtree: true })
      window.addEventListener('pageshow', queueRefresh)
      window.addEventListener('popstate', queueRefresh)
    }, 800)
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true })
  else start()
})()
