'use strict'

;(() => {
  if (window.__orimiaShiftCustomerSearchV662) return
  window.__orimiaShiftCustomerSearchV662 = true
  document.documentElement.dataset.orimiaShiftCustomerSearch = 'v662'

  const MAX_RESULTS = 20
  const states = new WeakMap()
  const activeStates = new Set()

  const copy = {
    label: '\u304a\u5ba2\u69d8',
    placeholder: '\u9867\u5ba2\u540d\u30fb\u96fb\u8a71\u756a\u53f7\u3067\u691c\u7d22',
    hint: '\u540d\u524d\u306e\u4e00\u90e8\u3092\u5165\u529b\u3059\u308b\u3068\u5019\u88dc\u3092\u7d5e\u308a\u8fbc\u3081\u307e\u3059\u3002',
    required: '\u9867\u5ba2\u540d\u3092\u5165\u529b\u3057\u3001\u5019\u88dc\u304b\u3089\u9078\u629e\u3057\u3066\u304f\u3060\u3055\u3044\u3002',
    choose: '\u5019\u88dc\u304b\u3089\u9867\u5ba2\u3092\u9078\u629e\u3057\u3066\u304f\u3060\u3055\u3044\u3002',
    noResults: '\u4e00\u81f4\u3059\u308b\u9867\u5ba2\u304c\u898b\u3064\u304b\u308a\u307e\u305b\u3093\u3002',
    clear: '\u691c\u7d22\u5185\u5bb9\u3092\u6d88\u53bb',
  }

  function normalize(value) {
    return String(value || '')
      .normalize('NFKC')
      .toLowerCase()
      .replace(/[\u30a1-\u30f6]/g, character => String.fromCharCode(character.charCodeAt(0) - 0x60))
      .replace(/[\s\u3000]+/g, '')
  }

  function addStyles() {
    if (document.getElementById('orimia-shift-customer-search-v662-styles')) return
    const style = document.createElement('style')
    style.id = 'orimia-shift-customer-search-v662-styles'
    style.textContent = `
      .orimia-customer-native-label-v662{display:none!important}
      .orimia-customer-search-field-v662{display:grid;min-width:0;gap:7px;color:var(--lien-ink,#342824);font-size:14px;font-weight:700}
      .orimia-customer-search-field-v662[hidden]{display:none!important}
      .orimia-customer-search-label-v662{font-size:14px;font-weight:700}
      .orimia-customer-search-v662{position:relative;min-width:0}
      .orimia-customer-search-control-v662{display:grid;grid-template-columns:22px minmax(0,1fr) 34px;align-items:center;min-height:48px;border:1px solid var(--lien-border,#e5d5cd);border-radius:12px;background:#fff;padding:0 8px 0 13px;transition:border-color .16s,box-shadow .16s}
      .orimia-customer-search-control-v662:focus-within{border-color:var(--lien-primary,#a75547);box-shadow:0 0 0 4px rgba(233,201,190,.35)}
      .orimia-customer-search-icon-v662{width:18px;height:18px;color:#8c7a72;stroke:currentColor;stroke-width:2;fill:none;pointer-events:none}
      .orimia-customer-search-control-v662 .orimia-customer-search-input-v662{width:100%;min-width:0;height:46px;border:0!important;border-radius:0!important;background:transparent!important;padding:0 9px!important;color:var(--lien-ink,#342824)!important;font:inherit!important;font-size:14px!important;font-weight:600!important;outline:0!important;box-shadow:none!important;-webkit-appearance:none!important;appearance:none!important}
      html body .orimia-customer-search-control-v662 .orimia-customer-search-input-v662:focus-visible{border:0!important;border-radius:0!important;background:transparent!important;outline:0!important;outline-offset:0!important;box-shadow:none!important}
      .orimia-customer-search-input-v662::-webkit-search-cancel-button{display:none}
      .orimia-customer-search-input-v662::placeholder{color:#a99a93;font-weight:500}
      .orimia-customer-search-clear-v662{display:grid;width:32px;height:32px;place-items:center;border:0;border-radius:9px;background:transparent;color:#84736b;cursor:pointer}
      .orimia-customer-search-clear-v662:hover{background:#f8efeb;color:#6f463c}
      .orimia-customer-search-clear-v662[hidden]{display:none!important}
      .orimia-customer-search-clear-v662 svg{width:16px;height:16px;stroke:currentColor;stroke-width:2;fill:none}
      .orimia-customer-search-results-v662{position:absolute;z-index:120;top:calc(100% + 7px);right:0;left:0;max-height:min(320px,42dvh);overflow:auto;border:1px solid #dec9c0;border-radius:12px;background:#fff;padding:6px;box-shadow:0 18px 46px rgba(62,40,32,.2);overscroll-behavior:contain}
      .orimia-customer-search-results-v662[hidden]{display:none!important}
      .orimia-customer-search-option-v662{display:grid;width:100%;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;min-height:46px;border:0;border-radius:8px;background:transparent;padding:9px 11px;color:#342824;text-align:left;cursor:pointer}
      .orimia-customer-search-option-v662:hover,.orimia-customer-search-option-v662.is-active{background:#f8efeb;color:#713d33}
      .orimia-customer-search-option-name-v662{min-width:0;overflow-wrap:anywhere;font-size:13px;font-weight:800;line-height:1.45}
      .orimia-customer-search-option-phone-v662{color:#88766f;font-size:11px;font-weight:600;white-space:nowrap}
      .orimia-customer-search-status-v662{min-height:18px;margin:0;padding:1px 2px 0;color:#806f68;font-size:11px;font-weight:500;line-height:1.55}
      .orimia-customer-search-status-v662.is-error{color:#a3453e;font-weight:700}
      @media(max-width:639px){
        .orimia-customer-search-control-v662{min-height:52px;border-radius:12px}
        .orimia-customer-search-input-v662{height:50px!important;font-size:16px!important}
        .orimia-customer-search-results-v662{max-height:min(300px,38dvh)}
        .orimia-customer-search-option-v662{grid-template-columns:minmax(0,1fr);gap:2px;min-height:52px}
        .orimia-customer-search-option-phone-v662{white-space:normal}
      }
    `
    document.head.appendChild(style)
  }

  function optionDetails(option) {
    const label = String(option.textContent || '').replace(/\s+/g, ' ').trim()
    const match = label.match(/^(.*?)\s*[\uff08(]([^\uff09)]+)[\uff09)]\s*$/)
    const name = (match?.[1] || label).trim()
    const phone = (match?.[2] || '').trim()
    return {
      id: option.value,
      label,
      name,
      phone,
      search: normalize(`${name} ${phone}`),
    }
  }

  function closeResults(state) {
    state.results.hidden = true
    state.input.setAttribute('aria-expanded', 'false')
    state.input.removeAttribute('aria-activedescendant')
    state.activeIndex = -1
  }

  function setActive(state, index) {
    const buttons = Array.from(state.results.querySelectorAll('[role="option"]'))
    if (!buttons.length) {
      state.activeIndex = -1
      state.input.removeAttribute('aria-activedescendant')
      return
    }
    state.activeIndex = Math.max(0, Math.min(index, buttons.length - 1))
    for (const [buttonIndex, button] of buttons.entries()) {
      const active = buttonIndex === state.activeIndex
      button.classList.toggle('is-active', active)
      button.setAttribute('aria-selected', active ? 'true' : 'false')
      if (active) {
        state.input.setAttribute('aria-activedescendant', button.id)
        button.scrollIntoView({ block: 'nearest' })
      }
    }
  }

  function validationMessage(state) {
    if (state.selectedId && state.select.value === state.selectedId) return ''
    return state.input.value.trim() ? copy.choose : copy.required
  }

  function updateValidation(state) {
    const unavailable = state.input.disabled || state.field.hidden
    state.input.setCustomValidity(unavailable ? '' : validationMessage(state))
    state.status.classList.toggle('is-error', !unavailable && Boolean(state.input.validationMessage) && document.activeElement !== state.input)
  }

  function choose(state, item) {
    state.select.value = item.id
    state.selectedId = item.id
    state.selectedText = item.label
    state.input.value = item.label
    state.clear.hidden = false
    state.input.setCustomValidity('')
    state.status.classList.remove('is-error')
    state.status.textContent = `${item.name}\u3092\u9078\u629e\u3057\u307e\u3057\u305f\u3002`
    state.select.dispatchEvent(new Event('input', { bubbles: true }))
    state.select.dispatchEvent(new Event('change', { bubbles: true }))
    closeResults(state)
  }

  function renderResults(state) {
    if (state.field.hidden || state.input.disabled) return closeResults(state)
    const query = normalize(state.input.value)
    const matches = query
      ? state.options.filter(item => item.search.includes(query))
      : state.options
    const visible = matches.slice(0, MAX_RESULTS)
    state.results.replaceChildren()

    if (!visible.length) {
      state.results.hidden = true
      state.input.setAttribute('aria-expanded', 'false')
      state.status.textContent = copy.noResults
      state.status.classList.add('is-error')
      state.activeIndex = -1
      return
    }

    const fragment = document.createDocumentFragment()
    for (const [index, item] of visible.entries()) {
      const button = document.createElement('button')
      button.type = 'button'
      button.id = `${state.listId}-option-${index}`
      button.className = 'orimia-customer-search-option-v662'
      button.dataset.customerId = item.id
      button.setAttribute('role', 'option')
      button.setAttribute('aria-selected', 'false')

      const name = document.createElement('span')
      name.className = 'orimia-customer-search-option-name-v662'
      name.textContent = item.name
      button.appendChild(name)
      if (item.phone) {
        const phone = document.createElement('span')
        phone.className = 'orimia-customer-search-option-phone-v662'
        phone.textContent = item.phone
        button.appendChild(phone)
      }
      button.addEventListener('pointermove', () => setActive(state, index))
      button.addEventListener('mousedown', event => event.preventDefault())
      button.addEventListener('click', () => choose(state, item))
      fragment.appendChild(button)
    }
    state.results.appendChild(fragment)
    state.results.hidden = false
    state.input.setAttribute('aria-expanded', 'true')
    state.status.classList.remove('is-error')
    state.status.textContent = matches.length > MAX_RESULTS
      ? `${matches.length}\u4ef6\u4e2d\u3001\u5148\u982d${MAX_RESULTS}\u4ef6\u3092\u8868\u793a\u3057\u3066\u3044\u307e\u3059\u3002`
      : query
        ? `${matches.length}\u4ef6\u898b\u3064\u304b\u308a\u307e\u3057\u305f\u3002`
        : copy.hint
    setActive(state, 0)
  }

  function clearSelection(state, preserveQuery = false) {
    state.select.value = ''
    state.selectedId = ''
    state.selectedText = ''
    if (!preserveQuery) state.input.value = ''
    state.clear.hidden = !state.input.value
    updateValidation(state)
  }

  function handleQuery(state) {
    if (state.composing) return
    if (state.input.value !== state.selectedText) clearSelection(state, true)
    state.clear.hidden = !state.input.value
    updateValidation(state)
    renderResults(state)
  }

  function syncFromNative(state) {
    const selected = state.options.find(item => item.id === state.select.value)
    if (selected) {
      state.selectedId = selected.id
      state.selectedText = selected.label
      state.input.value = selected.label
      state.clear.hidden = false
      state.input.setCustomValidity('')
      return
    }
    state.selectedId = ''
    state.selectedText = ''
    if (document.activeElement !== state.input) state.input.value = ''
    state.clear.hidden = !state.input.value
    updateValidation(state)
  }

  function syncAvailability(state) {
    const breakMode = state.form.dataset.lienBreakModeV521 === '1' || state.form.classList.contains('lien-break-mode-v461')
    const unavailable = state.select.disabled || state.nativeLabel.hidden || state.nativeLabel.hasAttribute('data-lien-break-hide-v461') || breakMode
    state.field.hidden = unavailable
    state.input.disabled = unavailable
    state.input.required = !unavailable
    if (state.select.required) state.select.required = false
    if (unavailable) closeResults(state)
    updateValidation(state)
  }

  function createSearch(select) {
    const form = select.closest('form')
    const nativeLabel = select.closest('label')
    if (!form || !nativeLabel || states.has(select)) return

    const options = Array.from(select.options)
      .filter(option => option.value && !option.disabled)
      .map(optionDetails)
    if (!options.length) return

    const id = `orimia-customer-search-v662-${Math.random().toString(36).slice(2, 9)}`
    const listId = `${id}-list`
    const field = document.createElement('div')
    field.className = 'orimia-customer-search-field-v662'
    field.dataset.orimiaCustomerSearchV662 = '1'

    const label = document.createElement('label')
    label.className = 'orimia-customer-search-label-v662'
    label.htmlFor = id
    label.textContent = copy.label

    const shell = document.createElement('div')
    shell.className = 'orimia-customer-search-v662'
    const control = document.createElement('div')
    control.className = 'orimia-customer-search-control-v662'
    control.innerHTML = '<svg class="orimia-customer-search-icon-v662" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path></svg>'

    const input = document.createElement('input')
    input.id = id
    input.type = 'search'
    input.className = 'orimia-customer-search-input-v662'
    input.placeholder = copy.placeholder
    input.autocomplete = 'off'
    input.spellcheck = false
    input.setAttribute('role', 'combobox')
    input.setAttribute('aria-autocomplete', 'list')
    input.setAttribute('aria-controls', listId)
    input.setAttribute('aria-expanded', 'false')

    const clear = document.createElement('button')
    clear.type = 'button'
    clear.className = 'orimia-customer-search-clear-v662'
    clear.hidden = true
    clear.setAttribute('aria-label', copy.clear)
    clear.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"></path></svg>'

    const results = document.createElement('div')
    results.id = listId
    results.className = 'orimia-customer-search-results-v662'
    results.setAttribute('role', 'listbox')
    results.hidden = true

    const status = document.createElement('p')
    status.className = 'orimia-customer-search-status-v662'
    status.setAttribute('aria-live', 'polite')
    status.textContent = copy.hint

    control.append(input, clear)
    shell.append(control, results)
    field.append(label, shell, status)
    nativeLabel.insertAdjacentElement('beforebegin', field)
    nativeLabel.classList.add('orimia-customer-native-label-v662')
    nativeLabel.dataset.orimiaCustomerNativeV662 = '1'
    select.tabIndex = -1
    select.setAttribute('aria-hidden', 'true')
    select.required = false

    const state = {
      form,
      select,
      nativeLabel,
      field,
      input,
      clear,
      results,
      status,
      options,
      listId,
      selectedId: '',
      selectedText: '',
      activeIndex: -1,
      composing: false,
    }
    states.set(select, state)
    activeStates.add(state)
    form.dataset.orimiaCustomerSearchReadyV662 = '1'

    input.addEventListener('compositionstart', () => { state.composing = true })
    input.addEventListener('compositionend', () => {
      state.composing = false
      handleQuery(state)
    })
    input.addEventListener('input', () => handleQuery(state))
    input.addEventListener('focus', () => renderResults(state))
    input.addEventListener('blur', () => window.setTimeout(() => closeResults(state), 120))
    input.addEventListener('keydown', event => {
      const resultCount = state.results.querySelectorAll('[role="option"]').length
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault()
        if (state.results.hidden) renderResults(state)
        const direction = event.key === 'ArrowDown' ? 1 : -1
        const start = state.activeIndex < 0 ? (direction > 0 ? -1 : resultCount) : state.activeIndex
        setActive(state, start + direction)
        return
      }
      if (event.key === 'Enter' && !state.results.hidden && state.activeIndex >= 0) {
        event.preventDefault()
        state.results.querySelectorAll('[role="option"]')[state.activeIndex]?.click()
        return
      }
      if (event.key === 'Escape') {
        event.preventDefault()
        closeResults(state)
      }
    })
    clear.addEventListener('click', () => {
      clearSelection(state)
      input.focus()
      renderResults(state)
    })
    select.addEventListener('change', () => syncFromNative(state))
    form.addEventListener('change', () => queueMicrotask(() => syncAvailability(state)))
    form.addEventListener('reset', () => window.setTimeout(() => {
      clearSelection(state)
      syncAvailability(state)
    }))
    form.addEventListener('invalid', event => {
      if (event.target !== input) return
      status.textContent = validationMessage(state)
      status.classList.add('is-error')
    }, true)

    const availabilityObserver = new MutationObserver(() => syncAvailability(state))
    availabilityObserver.observe(select, { attributes: true, attributeFilter: ['disabled', 'required'] })
    availabilityObserver.observe(nativeLabel, { attributes: true, attributeFilter: ['hidden', 'data-lien-break-hide-v461'] })
    availabilityObserver.observe(form, { attributes: true, attributeFilter: ['class', 'data-lien-break-mode-v521'] })
    state.availabilityObserver = availabilityObserver

    syncFromNative(state)
    syncAvailability(state)
  }

  function enhance() {
    for (const state of activeStates) {
      if (!state.form.isConnected) {
        state.availabilityObserver?.disconnect()
        activeStates.delete(state)
      } else {
        syncAvailability(state)
      }
    }
    if (location.pathname !== '/admin/appointments') return
    addStyles()
    for (const select of document.querySelectorAll('[aria-labelledby="manual-appointment-title"] form select[name="customerId"]')) {
      createSearch(select)
    }
  }

  addStyles()
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', enhance, { once: true })
  else enhance()
  new MutationObserver(enhance).observe(document.documentElement, { childList: true, subtree: true })
  window.addEventListener('popstate', enhance)
})()

/* shift-customer-search-v662 */
