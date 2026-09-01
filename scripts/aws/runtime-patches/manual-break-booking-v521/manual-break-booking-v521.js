'use strict'

;(() => {
  if (window.__orimiaManualBreakBookingV521) return
  window.__orimiaManualBreakBookingV521 = true
  document.documentElement.dataset.orimiaManualBreakBooking = 'v521'

  const BREAK_MENU_VALUE = '__lien_staff_break_v461__'
  const SNAP_MINUTES = 15
  const state = { observer: null }

  const copy = {
    toggle: '\u4f11\u61a9\u3068\u3057\u3066\u767b\u9332',
    modeTitle: '\u767b\u9332\u5185\u5bb9',
    dialogTitle: '\u4f11\u61a9\u6642\u9593\u3092\u767b\u9332',
    staff: '\u4f11\u3080\u30b9\u30bf\u30c3\u30d5',
    start: '\u958b\u59cb\u6642\u9593',
    end: '\u7d42\u4e86\u6642\u9593',
    submit: '\u4f11\u61a9\u3092\u767b\u9332',
    submitting: '\u767b\u9332\u4e2d...',
    loading: '\u30b9\u30bf\u30c3\u30d5\u3092\u8aad\u307f\u8fbc\u307f\u4e2d...',
    placeholder: '\u30b9\u30bf\u30c3\u30d5\u3092\u9078\u629e',
    noStaff: '\u767b\u9332\u3067\u304d\u308b\u30b9\u30bf\u30c3\u30d5\u304c\u3044\u307e\u305b\u3093',
    required: '\u4f11\u3080\u30b9\u30bf\u30c3\u30d5\u3068\u958b\u59cb\u30fb\u7d42\u4e86\u6642\u9593\u3092\u5165\u529b\u3057\u3066\u304f\u3060\u3055\u3044\u3002',
    order: '\u7d42\u4e86\u6642\u9593\u306f\u958b\u59cb\u6642\u9593\u3088\u308a\u5f8c\u306b\u3057\u3066\u304f\u3060\u3055\u3044\u3002',
    interval: '\u6642\u9593\u306f15\u5206\u5358\u4f4d\u3067\u9078\u629e\u3057\u3066\u304f\u3060\u3055\u3044\u3002',
    success: '\u4f11\u61a9\u3092\u30b7\u30d5\u30c8\u8868\u3078\u767b\u9332\u3057\u307e\u3057\u305f\u3002',
    requestError: '\u4f11\u61a9\u306e\u767b\u9332\u306b\u5931\u6557\u3057\u307e\u3057\u305f\u3002',
  }

  function addStyles() {
    if (document.getElementById('orimia-manual-break-v521-styles')) return
    const style = document.createElement('style')
    style.id = 'orimia-manual-break-v521-styles'
    style.textContent = `
      .lien-break-toggle-v521{grid-column:1/-1!important;min-height:48px!important;background:#f4f8f1!important;border-color:#ccd9c7!important;color:#36583d!important}
      .lien-break-toggle-v521 input{accent-color:#56755d}
      form[data-lien-break-mode-v521="1"]>[data-lien-break-normal-v521]{display:none!important}
      form[data-lien-break-mode-v521="1"] .ts-manual-customer-option:not(.lien-break-toggle-v521),
      form[data-lien-break-mode-v521="1"] .ts-manual-customer-fields{display:none!important}
      form[data-lien-break-mode-v521="1"] .ts-manual-customer-options{grid-template-columns:minmax(0,1fr)!important}
      form[data-lien-break-mode-v521="1"] .lien-break-toggle-v521{box-shadow:inset 0 0 0 1px #78937d;background:#edf5eb!important}
      .lien-break-panel-v521{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;border:1px solid #d9e3d5;border-radius:16px;background:#f8fbf6;padding:18px}
      .lien-break-panel-v521[hidden]{display:none!important}
      .lien-break-field-v521{display:grid;min-width:0;gap:7px;color:var(--lien-ink,#342824);font-size:12px;font-weight:800}
      .lien-break-field-v521.is-staff{grid-column:1/-1}
      .lien-break-control-v521{width:100%;height:46px;box-sizing:border-box;border:1px solid var(--lien-border,#e5d5cd);border-radius:12px;background:#fff;padding:0 13px;color:var(--lien-ink,#342824);font:inherit;outline:none}
      .lien-break-control-v521:focus{border-color:#77927c;box-shadow:0 0 0 4px rgba(109,142,117,.16)}
      .lien-break-control-v521:disabled{background:#f5f3f1;color:#968982;cursor:wait}
      .lien-break-feedback-v521{grid-column:1/-1;min-height:0;margin:0;color:#a13f3f;font-size:11px;font-weight:750;line-height:1.55}
      .lien-break-feedback-v521:empty{display:none}
      option[value="${BREAK_MENU_VALUE}"]{display:none!important}
      @media(max-width:639px){
        .lien-break-panel-v521{grid-template-columns:minmax(0,1fr);gap:13px;padding:14px}
        .lien-break-field-v521.is-staff{grid-column:auto}
      }
    `
    document.head.appendChild(style)
  }

  function normalize(value) {
    return String(value || '').normalize('NFKC').replace(/[\s\u3000]+/g, '').toLowerCase()
  }

  function isFreeStaff(value) {
    const normalized = normalize(value)
    return !normalized || normalized === 'free' || normalized === normalize('\u30d5\u30ea\u30fc') || normalized === normalize('\u6307\u540d\u306a\u3057')
  }

  function tokyoToday() {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(new Date())
  }

  function selectedDate(form) {
    const query = new URL(location.href).searchParams.get('date')
    if (/^20\d{2}-\d{2}-\d{2}$/.test(query || '')) return query
    const text = form.closest('[role="dialog"]')?.textContent || ''
    const match = text.match(/(20\d{2})\s*\u5e74\s*(\d{1,2})\s*\u6708\s*(\d{1,2})\s*\u65e5/)
    return match ? `${match[1]}-${String(match[2]).padStart(2, '0')}-${String(match[3]).padStart(2, '0')}` : tokyoToday()
  }

  function timeLabel(minutes) {
    const value = Math.max(0, Math.min(1439, Number(minutes) || 0))
    return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`
  }

  function timeMinutes(value) {
    const match = String(value || '').match(/^(\d{2}):(\d{2})$/)
    if (!match) return NaN
    const hour = Number(match[1])
    const minute = Number(match[2])
    return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59 ? hour * 60 + minute : NaN
  }

  function setButton(state, label, busy = false) {
    const button = state.submit
    if (!button) return
    button.replaceChildren()
    if (state.submitIcon) button.appendChild(state.submitIcon.cloneNode(true))
    const span = document.createElement('span')
    span.textContent = label
    button.appendChild(span)
    button.disabled = busy
  }

  function showToast(message, tone = 'success') {
    document.querySelector('[data-orimia-break-toast-v521]')?.remove()
    const toast = document.createElement('div')
    toast.dataset.orimiaBreakToastV521 = '1'
    toast.setAttribute('role', tone === 'error' ? 'alert' : 'status')
    toast.textContent = message
    Object.assign(toast.style, {
      position: 'fixed', zIndex: '10140', top: '78px', right: '18px', maxWidth: 'calc(100vw - 36px)',
      border: `1px solid ${tone === 'error' ? '#edc2bd' : '#b8d9c5'}`, borderRadius: '14px',
      background: tone === 'error' ? '#fff1ef' : '#f1faf4', padding: '12px 15px',
      color: tone === 'error' ? '#884039' : '#356349', fontSize: '12px', fontWeight: '800',
      boxShadow: '0 18px 55px rgba(52,34,29,.16)',
    })
    document.body.appendChild(toast)
    window.setTimeout(() => toast.remove(), 3000)
  }

  async function jsonRequest(path, options = {}) {
    const response = await fetch(path, {
      credentials: 'same-origin', cache: 'no-store', ...options,
      headers: options.body
        ? { Accept: 'application/json', 'Content-Type': 'application/json', ...(options.headers || {}) }
        : { Accept: 'application/json', ...(options.headers || {}) },
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(payload.error || copy.requestError)
    return payload
  }

  function makeField(labelText, control, className = '') {
    const label = document.createElement('label')
    label.className = `lien-break-field-v521 ${className}`.trim()
    const title = document.createElement('span')
    title.textContent = labelText
    label.append(title, control)
    return label
  }

  function makeControl(tag, name) {
    const control = document.createElement(tag)
    control.className = 'lien-break-control-v521'
    control.name = name
    control.required = true
    return control
  }

  function createBreakUi(form, mode, submit) {
    const options = mode.querySelector('.ts-manual-customer-options')
    if (!options) return null

    const toggleLabel = document.createElement('label')
    toggleLabel.className = 'ts-manual-customer-option lien-break-toggle-v521'
    toggleLabel.dataset.lienBreakToggleV521 = '1'
    const toggle = document.createElement('input')
    toggle.type = 'checkbox'
    toggle.dataset.lienBreakCheckboxV521 = '1'
    const toggleText = document.createElement('span')
    toggleText.textContent = copy.toggle
    toggleLabel.append(toggle, toggleText)
    options.appendChild(toggleLabel)

    const panel = document.createElement('section')
    panel.className = 'lien-break-panel-v521'
    panel.dataset.lienBreakPanelV521 = '1'
    panel.hidden = true

    const staff = makeControl('select', 'breakStaffKey')
    staff.dataset.lienBreakStaffV521 = '1'
    const placeholder = document.createElement('option')
    placeholder.value = ''
    placeholder.textContent = copy.placeholder
    staff.appendChild(placeholder)

    const start = makeControl('input', 'breakStartTime')
    start.type = 'time'
    start.step = String(SNAP_MINUTES * 60)
    start.dataset.lienBreakStartV521 = '1'
    const sourceStart = form.querySelector('input[name="startTime"]')?.value
    start.value = /^\d{2}:\d{2}$/.test(sourceStart || '') ? sourceStart : '10:00'

    const end = makeControl('input', 'breakEndTime')
    end.type = 'time'
    end.step = String(SNAP_MINUTES * 60)
    end.dataset.lienBreakEndV521 = '1'
    end.value = timeLabel(Math.min(1439, (timeMinutes(start.value) || 600) + 60))

    const feedback = document.createElement('p')
    feedback.className = 'lien-break-feedback-v521'
    feedback.dataset.lienBreakFeedbackV521 = '1'
    feedback.setAttribute('role', 'alert')

    panel.append(
      makeField(copy.staff, staff, 'is-staff'),
      makeField(copy.start, start),
      makeField(copy.end, end),
      feedback,
    )

    const actions = submit?.parentElement
    form.insertBefore(panel, actions || null)
    return { toggle, toggleLabel, panel, staff, start, end, feedback }
  }

  function selectedStaffRow(state) {
    const option = state.ui.staff.selectedOptions[0]
    return state.staffRows.find(row => normalize(row.staffKey) === normalize(option?.value))
      || state.staffRows.find(row => normalize(row.staffName) === normalize(option?.dataset.staffName))
  }

  function updateTimeBounds(state) {
    const row = selectedStaffRow(state)
    if (!row) return
    const workStart = Number.isFinite(Number(row.workStartMinutes)) ? Number(row.workStartMinutes) : 600
    const workEnd = Number.isFinite(Number(row.workEndMinutes)) ? Number(row.workEndMinutes) : 1200
    const startInput = state.ui.start
    const endInput = state.ui.end
    let start = timeMinutes(startInput.value)
    let end = timeMinutes(endInput.value)

    if (!Number.isInteger(start) || start < workStart || start >= workEnd) start = workStart
    if (!Number.isInteger(end) || end <= start || end > workEnd) end = Math.min(workEnd, start + 60)
    if (end <= start) {
      start = Math.max(workStart, workEnd - SNAP_MINUTES)
      end = workEnd
    }

    startInput.min = timeLabel(workStart)
    startInput.max = timeLabel(Math.max(workStart, workEnd - SNAP_MINUTES))
    endInput.min = timeLabel(Math.min(workEnd, start + SNAP_MINUTES))
    endInput.max = timeLabel(workEnd)
    startInput.value = timeLabel(start)
    endInput.value = timeLabel(end)
  }

  async function loadStaff(state) {
    const token = Symbol('staff-load')
    state.staffLoadToken = token
    const select = state.ui.staff
    select.disabled = true
    select.replaceChildren()
    const loading = document.createElement('option')
    loading.value = ''
    loading.textContent = copy.loading
    select.appendChild(loading)
    state.ui.feedback.textContent = ''

    try {
      const payload = await jsonRequest(`/api/admin/staff-breaks?date=${encodeURIComponent(selectedDate(state.form))}`)
      if (state.staffLoadToken !== token || !state.enabled) return
      state.staffRows = Array.isArray(payload.staff) ? payload.staff : []
      select.replaceChildren()
      const placeholder = document.createElement('option')
      placeholder.value = ''
      placeholder.textContent = state.staffRows.length ? copy.placeholder : copy.noStaff
      select.appendChild(placeholder)
      for (const row of state.staffRows) {
        if (isFreeStaff(row.staffKey) || isFreeStaff(row.staffName)) continue
        const option = document.createElement('option')
        option.value = String(row.staffKey)
        option.dataset.staffName = String(row.staffName)
        option.textContent = String(row.staffName)
        select.appendChild(option)
      }
      const sourceValue = state.form.querySelector('select[name="staffName"]')?.value
      const preferred = Array.from(select.options).find(option => normalize(option.dataset.staffName) === normalize(sourceValue))
      const first = Array.from(select.options).find(option => option.value)
      if (preferred) select.value = preferred.value
      else if (first) select.value = first.value
      select.disabled = !first
      updateTimeBounds(state)
    } catch (error) {
      if (state.staffLoadToken !== token || !state.enabled) return
      select.replaceChildren()
      const unavailable = document.createElement('option')
      unavailable.value = ''
      unavailable.textContent = copy.noStaff
      select.appendChild(unavailable)
      select.disabled = true
      state.ui.feedback.textContent = error instanceof Error ? error.message : copy.requestError
    }
  }

  function saveControlState(state) {
    if (state.controlState) return
    const controls = new Set()
    for (const node of state.normalNodes) {
      for (const control of node.querySelectorAll('input,select,textarea,button')) controls.add(control)
    }
    for (const control of state.mode.querySelectorAll('input,select,textarea')) {
      if (control !== state.ui.toggle) controls.add(control)
    }
    state.controlState = new Map(Array.from(controls, control => [control, {
      disabled: control.disabled,
      required: control.required,
    }]))
  }

  function setNormalControlsDisabled(state, disabled) {
    saveControlState(state)
    for (const [control, original] of state.controlState) {
      control.disabled = disabled ? true : original.disabled
      control.required = disabled ? false : original.required
    }
  }

  function dispatchChange(control) {
    control?.dispatchEvent(new Event('change', { bubbles: true }))
  }

  function setMode(state, enabled) {
    if (state.enabled === enabled) return
    state.enabled = enabled
    if (enabled) state.form.setAttribute('data-lien-break-mode-v521', '1')
    else state.form.removeAttribute('data-lien-break-mode-v521')
    state.ui.panel.hidden = !enabled
    state.ui.feedback.textContent = ''

    const newCustomer = state.form.querySelector('[data-ts-customer-new]')
    const codeCustomer = state.form.querySelector('[data-ts-customer-code]')
    if (enabled) {
      state.savedCustomerMode = {
        isNew: Boolean(newCustomer?.checked),
        isCode: Boolean(codeCustomer?.checked),
      }
      if (newCustomer) { newCustomer.checked = false; dispatchChange(newCustomer) }
      if (codeCustomer) { codeCustomer.checked = false; dispatchChange(codeCustomer) }
      setNormalControlsDisabled(state, true)
      if (state.title) state.title.textContent = copy.dialogTitle
      if (state.modeTitle) state.modeTitle.textContent = copy.modeTitle
      setButton(state, copy.submit)
      loadStaff(state)
      return
    }

    state.staffLoadToken = null
    setNormalControlsDisabled(state, false)
    if (state.title) state.title.textContent = state.originalTitle
    if (state.modeTitle) state.modeTitle.textContent = state.originalModeTitle
    if (state.submit) {
      state.submit.innerHTML = state.originalSubmitHtml
      state.submit.disabled = false
    }
    if (newCustomer) newCustomer.checked = Boolean(state.savedCustomerMode?.isNew)
    if (codeCustomer) codeCustomer.checked = Boolean(state.savedCustomerMode?.isCode)
    if (newCustomer?.checked) dispatchChange(newCustomer)
    else if (codeCustomer?.checked) dispatchChange(codeCustomer)
    state.savedCustomerMode = null
  }

  function secureLegacyMenuOption(form) {
    const menu = form.querySelector('select[name="menu"]')
    const option = menu?.querySelector(`option[value="${BREAK_MENU_VALUE}"]`)
    if (!option) return
    if (menu.value === BREAK_MENU_VALUE) {
      menu.value = ''
      dispatchChange(menu)
    }
    option.hidden = true
    option.disabled = true
    option.setAttribute('aria-hidden', 'true')
  }

  function validateBreak(state) {
    const staffKey = state.ui.staff.value
    const option = state.ui.staff.selectedOptions[0]
    const startMinutes = timeMinutes(state.ui.start.value)
    const endMinutes = timeMinutes(state.ui.end.value)
    if (!staffKey || !Number.isInteger(startMinutes) || !Number.isInteger(endMinutes)) {
      throw new Error(copy.required)
    }
    if (endMinutes <= startMinutes) throw new Error(copy.order)
    if (startMinutes % SNAP_MINUTES !== 0 || endMinutes % SNAP_MINUTES !== 0) throw new Error(copy.interval)
    return {
      date: selectedDate(state.form),
      staffKey,
      staffName: option?.dataset.staffName || option?.textContent || '',
      startMinutes,
      durationMinutes: endMinutes - startMinutes,
    }
  }

  async function submitBreak(event, state) {
    if (!state.ui.toggle.checked) return
    event.preventDefault()
    event.stopImmediatePropagation()
    if (state.submitting) return
    state.ui.feedback.textContent = ''

    let payload
    try {
      payload = validateBreak(state)
    } catch (error) {
      state.ui.feedback.textContent = error instanceof Error ? error.message : copy.required
      state.ui.panel.querySelector(':invalid')?.focus()
      return
    }

    state.submitting = true
    setButton(state, copy.submitting, true)
    try {
      await jsonRequest('/api/admin/staff-breaks', { method: 'POST', body: JSON.stringify(payload) })
      showToast(copy.success)
      const dialog = state.form.closest('[role="dialog"]')
      const close = dialog?.querySelector('button[aria-label="\u9589\u3058\u308b"]')
      close?.click()
      window.setTimeout(() => location.reload(), 220)
    } catch (error) {
      state.submitting = false
      setButton(state, copy.submit)
      state.ui.feedback.textContent = error instanceof Error ? error.message : copy.requestError
      showToast(state.ui.feedback.textContent, 'error')
    }
  }

  function enhanceForm(form) {
    secureLegacyMenuOption(form)
    if (form.dataset.orimiaManualBreakV521 === '1') return
    const mode = form.querySelector('.ts-manual-customer-mode')
    const submit = form.querySelector('button[type="submit"]')
    const title = form.closest('[role="dialog"]')?.querySelector('#manual-appointment-title')
    if (!mode || !submit) return

    form.dataset.orimiaManualBreakV521 = '1'
    const modeTitle = mode.querySelector('.ts-manual-customer-mode-title')
    const actions = submit.parentElement
    const normalNodes = Array.from(form.children).filter(node => node !== mode && node !== actions)
    for (const node of normalNodes) node.dataset.lienBreakNormalV521 = '1'
    const ui = createBreakUi(form, mode, submit)
    if (!ui) return

    const formState = {
      form, mode, modeTitle, submit, title, ui, normalNodes,
      enabled: false,
      submitting: false,
      staffRows: [],
      controlState: null,
      originalTitle: title?.textContent || '',
      originalModeTitle: modeTitle?.textContent || '',
      originalSubmitHtml: submit.innerHTML,
      submitIcon: submit.querySelector('svg')?.cloneNode(true) || null,
    }
    form.__orimiaManualBreakStateV521 = formState

    ui.toggle.addEventListener('change', () => setMode(formState, ui.toggle.checked))
    ui.staff.addEventListener('change', () => updateTimeBounds(formState))
    ui.start.addEventListener('change', () => {
      const start = timeMinutes(ui.start.value)
      const end = timeMinutes(ui.end.value)
      if (Number.isInteger(start) && (!Number.isInteger(end) || end <= start)) ui.end.value = timeLabel(start + 60)
      updateTimeBounds(formState)
    })
    form.addEventListener('submit', event => submitBreak(event, formState), true)

    const dialog = form.closest('[role="dialog"]')
    for (const button of dialog?.querySelectorAll('button[type="button"]') || []) {
      const isClose = button.getAttribute('aria-label') === '\u9589\u3058\u308b'
      const isCancel = normalize(button.textContent) === normalize('\u30ad\u30e3\u30f3\u30bb\u30eb')
      if (!isClose && !isCancel) continue
      button.addEventListener('click', () => {
        if (formState.submitting) return
        ui.toggle.checked = false
        setMode(formState, false)
      })
    }
  }

  function enhance() {
    if (location.pathname !== '/admin/appointments') return
    addStyles()
    for (const form of document.querySelectorAll('[aria-labelledby="manual-appointment-title"] form')) enhanceForm(form)
  }

  addStyles()
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', enhance, { once: true })
  else enhance()
  state.observer = new MutationObserver(enhance)
  state.observer.observe(document.documentElement, { childList: true, subtree: true })
  window.addEventListener('popstate', enhance)
})()
