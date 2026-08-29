'use strict'

;(() => {
  if (window.__lienShiftLineBreakInteractionV461) return
  window.__lienShiftLineBreakInteractionV461 = true

  const BREAK_MENU_VALUE = '__lien_staff_break_v461__'
  const SNAP_MINUTES = 15
  const state = {
    breakDate: '',
    breakData: null,
    loading: null,
    drag: null,
    scheduleTimer: 0,
  }

  function addStyles() {
    if (document.getElementById('lien-shift-line-break-v461-styles')) return
    const style = document.createElement('style')
    style.id = 'lien-shift-line-break-v461-styles'
    style.textContent = `
      .lien-route-line-v461{background:#06c755!important;color:#fff!important}
      .lien-break-action-v442{display:none!important}
      .lien-shift-break-v442{cursor:grab!important;touch-action:pan-y pinch-zoom;user-select:none}
      .lien-shift-break-v442:active{cursor:grabbing!important}
      .lien-shift-break-v442.is-pending-v461{opacity:.62;cursor:wait!important}
      .lien-break-resize-v461{position:absolute;z-index:3;inset-block:0;right:0;width:13px;border-left:1px solid rgba(53,83,59,.22);background:rgba(255,255,255,.38);cursor:ew-resize;touch-action:none}
      .lien-break-resize-v461::after{content:"↔";position:absolute;left:50%;top:50%;color:#35533b;font-size:9px;font-weight:900;transform:translate(-50%,-50%)}
      .lien-shift-break-v442:hover .lien-break-resize-v461{background:rgba(255,255,255,.68)}
      .lien-break-mode-v461 [data-lien-break-hide-v461]{display:none!important}
      .lien-break-mode-v461{border-radius:18px;background:#f4f8f1;padding:14px;box-shadow:inset 0 0 0 1px #d6dfcf}
      .lien-break-mode-note-v461{display:flex;align-items:flex-start;gap:10px;margin:0;border:1px solid #d6dfcf;border-radius:14px;background:#fff;padding:11px 13px;color:#405d41;font-size:11px;font-weight:700;line-height:1.65}
      .lien-break-mode-note-v461::before{content:"休";display:grid;width:25px;height:25px;flex:none;place-items:center;border-radius:8px;background:#66806a;color:#fff;font-size:11px;font-weight:900}
    `
    document.head.appendChild(style)
  }

  function normalize(value) {
    return String(value || '').normalize('NFKC').replace(/[\s\u3000]+/g, '').toLowerCase()
  }

  function selectedDate() {
    const query = new URL(location.href).searchParams.get('date')
    if (/^20\d{2}-\d{2}-\d{2}$/.test(query || '')) return query
    const match = document.body.innerText.match(/(20\d{2})年\s*(\d{1,2})月\s*(\d{1,2})日/)
    if (match) return `${match[1]}-${String(match[2]).padStart(2, '0')}-${String(match[3]).padStart(2, '0')}`
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(new Date())
  }

  function timeLabel(minutes) {
    return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
  }

  function snap(value) {
    return Math.round(Number(value) / SNAP_MINUTES) * SNAP_MINUTES
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value))
  }

  async function jsonRequest(path, options = {}) {
    const response = await fetch(path, {
      credentials: 'same-origin', cache: 'no-store', ...options,
      headers: options.body ? { 'Content-Type': 'application/json', ...(options.headers || {}) } : options.headers,
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(payload.error || '処理に失敗しました。')
    return payload
  }

  function showToast(message, tone = 'success') {
    document.querySelector('[data-lien-v461-toast]')?.remove()
    const toast = document.createElement('div')
    toast.dataset.lienV461Toast = '1'
    toast.setAttribute('role', tone === 'error' ? 'alert' : 'status')
    toast.textContent = message
    Object.assign(toast.style, {
      position: 'fixed', zIndex: '10120', top: '78px', right: '18px', maxWidth: 'calc(100vw - 36px)',
      border: `1px solid ${tone === 'error' ? '#edc2bd' : '#b8d9c5'}`, borderRadius: '15px',
      background: tone === 'error' ? '#fff1ef' : '#f1faf4', padding: '13px 16px',
      color: tone === 'error' ? '#884039' : '#356349', fontSize: '12px', fontWeight: '800',
      boxShadow: '0 18px 55px rgba(52,34,29,.16)',
    })
    document.body.appendChild(toast)
    window.setTimeout(() => toast.remove(), 2800)
  }

  async function loadBreakData(force = false) {
    if (location.pathname !== '/admin/appointments') return null
    const date = selectedDate()
    if (!force && state.breakData && state.breakDate === date) return state.breakData
    if (!force && state.loading && state.breakDate === date) return state.loading
    state.breakDate = date
    state.loading = jsonRequest(`/api/admin/staff-breaks?date=${encodeURIComponent(date)}`)
      .then(payload => {
        state.breakData = payload
        return payload
      })
      .finally(() => { state.loading = null })
    return state.loading
  }

  function staffLanes() {
    return Array.from(document.querySelectorAll('.shift-lane[data-staff-name]')).filter(lane => {
      const key = normalize(lane.dataset.staffKey)
      const name = normalize(lane.dataset.staffName)
      const rect = lane.getBoundingClientRect()
      return rect.width > 0 && rect.height > 0 && key !== 'free' && name !== normalize('フリー') && name !== normalize('指名なし')
    })
  }

  function nearestLane(clientY, fallback) {
    return staffLanes().map(lane => {
      const rect = lane.getBoundingClientRect()
      const distance = clientY < rect.top ? rect.top - clientY : clientY > rect.bottom ? clientY - rect.bottom : 0
      return { lane, distance }
    }).sort((a, b) => a.distance - b.distance)[0]?.lane || fallback
  }

  function updateBlock(block, item, lane) {
    const data = state.breakData || {}
    const open = Number(data.openMinutes || 600)
    const close = Number(data.closeMinutes || 1140)
    const span = Math.max(1, close - open)
    block.style.left = `${clamp((item.startMinutes - open) / span * 100, 0, 100)}%`
    block.style.width = `${Math.max(.8, item.durationMinutes / span * 100)}%`
    const label = block.querySelector(':scope > span')
    if (label) label.innerHTML = `休憩<br>${timeLabel(item.startMinutes)}〜${timeLabel(item.startMinutes + item.durationMinutes)}`
    block.setAttribute('aria-label', `${item.staffName} ${timeLabel(item.startMinutes)}から${timeLabel(item.startMinutes + item.durationMinutes)}の休憩。ドラッグで移動、右端で時間を変更できます`)
    block.title = '休憩（ドラッグで移動・右端で時間変更、クリックで削除）'
    if (lane && block.parentElement !== lane) lane.appendChild(block)
  }

  function dragEvent(name, drag, preview, event) {
    window.dispatchEvent(new CustomEvent(name, {
      detail: {
        appointmentId: `break:${drag.item.id}`,
        mode: drag.mode,
        customerName: '休憩',
        staffName: preview.staffName,
        startMinutes: preview.startMinutes,
        durationMinutes: preview.durationMinutes,
        clientX: event.clientX,
        clientY: event.clientY,
        sourceElement: drag.block,
      },
    }))
  }

  function previewFromPointer(drag, event) {
    const data = state.breakData || {}
    const open = Number(data.openMinutes || 600)
    const close = Number(data.closeMinutes || 1140)
    const span = Math.max(1, close - open)
    if (drag.mode === 'resize') {
      const rect = drag.originLane.getBoundingClientRect()
      const delta = (event.clientX - drag.originClientX) / Math.max(1, rect.width) * span
      const durationMinutes = clamp(snap(drag.origin.durationMinutes + delta), SNAP_MINUTES, close - drag.origin.startMinutes)
      return { ...drag.origin, durationMinutes, lane: drag.originLane }
    }
    const lane = nearestLane(event.clientY, drag.originLane)
    const rect = lane.getBoundingClientRect()
    const rawStart = open + (event.clientX - rect.left) / Math.max(1, rect.width) * span - drag.grabOffsetMinutes
    const startMinutes = clamp(snap(rawStart), open, close - drag.origin.durationMinutes)
    return {
      ...drag.origin,
      startMinutes,
      staffKey: String(lane.dataset.staffKey || ''),
      staffName: String(lane.dataset.staffName || ''),
      lane,
    }
  }

  function clearDragListeners(drag) {
    window.removeEventListener('pointermove', drag.move, true)
    window.removeEventListener('pointerup', drag.up, true)
    window.removeEventListener('pointercancel', drag.cancel, true)
    window.removeEventListener('blur', drag.cancel, true)
    document.removeEventListener('selectstart', drag.preventNative, true)
    document.removeEventListener('dragstart', drag.preventNative, true)
  }

  async function persistBreak(block, item, lane) {
    block.classList.add('is-pending-v461')
    try {
      await jsonRequest(`/api/admin/staff-breaks/${encodeURIComponent(item.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({
          date: selectedDate(),
          startMinutes: item.startMinutes,
          durationMinutes: item.durationMinutes,
          staffKey: item.staffKey,
          staffName: item.staffName,
        }),
      })
      showToast(`${item.staffName}の休憩を${timeLabel(item.startMinutes)}〜${timeLabel(item.startMinutes + item.durationMinutes)}へ変更しました。`)
      window.setTimeout(() => location.reload(), 260)
    } catch (error) {
      block.classList.remove('is-pending-v461')
      showToast(error.message, 'error')
      await loadBreakData(true).catch(() => null)
      location.reload()
    }
  }

  function beginBreakDrag(event, block, item, mode) {
    if (event.button !== 0 || event.isPrimary === false || state.drag || block.classList.contains('is-pending-v461')) return
    const originLane = block.closest('.shift-lane[data-staff-name]')
    if (!originLane) return
    if (mode === 'resize') {
      event.preventDefault()
      event.stopPropagation()
    }
    const data = state.breakData || {}
    const open = Number(data.openMinutes || 600)
    const close = Number(data.closeMinutes || 1140)
    const span = Math.max(1, close - open)
    const laneRect = originLane.getBoundingClientRect()
    const pointerMinutes = open + (event.clientX - laneRect.left) / Math.max(1, laneRect.width) * span
    const drag = {
      item,
      block,
      mode,
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      originClientX: event.clientX,
      originClientY: event.clientY,
      originLane,
      origin: { ...item },
      preview: { ...item, lane: originLane },
      grabOffsetMinutes: pointerMinutes - item.startMinutes,
      moved: false,
      preventNative: nativeEvent => nativeEvent.preventDefault(),
    }
    drag.move = moveEvent => {
      if (moveEvent.pointerId !== drag.pointerId || moveEvent.isPrimary === false) return
      const dx = moveEvent.clientX - drag.originClientX
      const dy = moveEvent.clientY - drag.originClientY
      if (!drag.moved && Math.hypot(dx, dy) <= (drag.pointerType === 'touch' ? 8 : 3)) return
      if (!drag.moved && drag.pointerType === 'touch' && Math.abs(dy) > Math.abs(dx)) {
        drag.cancel(moveEvent)
        return
      }
      moveEvent.preventDefault()
      if (!drag.moved) {
        drag.moved = true
        block.classList.add('is-dragging-v461')
        document.addEventListener('selectstart', drag.preventNative, true)
        document.addEventListener('dragstart', drag.preventNative, true)
        dragEvent('lien:shift-drag-start', drag, drag.preview, moveEvent)
      }
      drag.preview = previewFromPointer(drag, moveEvent)
      dragEvent('lien:shift-drag-pointer', drag, drag.preview, moveEvent)
      dragEvent('lien:shift-drag-move', drag, drag.preview, moveEvent)
    }
    drag.up = upEvent => {
      if (upEvent.pointerId !== drag.pointerId) return
      clearDragListeners(drag)
      state.drag = null
      block.classList.remove('is-dragging-v461')
      if (!drag.moved) return
      upEvent.preventDefault()
      block.dataset.lienBreakSuppressClickUntil = String(Date.now() + 700)
      window.dispatchEvent(new CustomEvent('lien:shift-drag-end', { detail: { appointmentId: `break:${item.id}`, cancelled: false } }))
      const preview = { ...drag.preview }
      delete preview.lane
      updateBlock(block, preview, drag.preview.lane)
      persistBreak(block, preview, drag.preview.lane)
    }
    drag.cancel = cancelEvent => {
      if (cancelEvent?.pointerId != null && cancelEvent.pointerId !== drag.pointerId) return
      clearDragListeners(drag)
      state.drag = null
      block.classList.remove('is-dragging-v461')
      if (drag.moved) {
        window.dispatchEvent(new CustomEvent('lien:shift-drag-end', { detail: { appointmentId: `break:${item.id}`, cancelled: true } }))
        updateBlock(block, drag.origin, drag.originLane)
      }
    }
    state.drag = drag
    window.addEventListener('pointermove', drag.move, true)
    window.addEventListener('pointerup', drag.up, true)
    window.addEventListener('pointercancel', drag.cancel, true)
    window.addEventListener('blur', drag.cancel, true)
  }

  async function nudgeBreak(event, block, item) {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key) || block.classList.contains('is-pending-v461')) return
    event.preventDefault()
    event.stopImmediatePropagation()
    const direction = event.key === 'ArrowRight' ? 1 : -1
    const data = state.breakData || {}
    const open = Number(data.openMinutes || 600)
    const close = Number(data.closeMinutes || 1140)
    const next = { ...item }
    if (event.shiftKey) next.durationMinutes = clamp(item.durationMinutes + direction * SNAP_MINUTES, SNAP_MINUTES, close - item.startMinutes)
    else next.startMinutes = clamp(item.startMinutes + direction * SNAP_MINUTES, open, close - item.durationMinutes)
    updateBlock(block, next, block.closest('.shift-lane[data-staff-name]'))
    await persistBreak(block, next, block.closest('.shift-lane[data-staff-name]'))
  }

  async function enhanceBreakCards() {
    if (location.pathname !== '/admin/appointments') return
    const data = await loadBreakData().catch(() => null)
    if (!data) return
    for (const block of document.querySelectorAll('.lien-shift-break-v442[data-break-id]')) {
      if (block.dataset.lienBreakInteractionV461 === '1') continue
      const item = (data.breaks || []).find(candidate => candidate.id === block.dataset.breakId)
      if (!item) continue
      block.dataset.lienBreakInteractionV461 = '1'
      block.title = '休憩（ドラッグで移動・右端で時間変更、クリックで削除）'
      const handle = document.createElement('span')
      handle.className = 'lien-break-resize-v461'
      handle.setAttribute('role', 'separator')
      handle.setAttribute('aria-label', '休憩時間を変更')
      block.appendChild(handle)
      block.addEventListener('pointerdown', event => beginBreakDrag(event, block, item, event.target.closest('.lien-break-resize-v461') ? 'resize' : 'move'), true)
      block.addEventListener('click', event => {
        if (event.target.closest('.lien-break-resize-v461') || Date.now() < Number(block.dataset.lienBreakSuppressClickUntil || 0)) {
          event.preventDefault()
          event.stopImmediatePropagation()
        }
      }, true)
      block.addEventListener('keydown', event => nudgeBreak(event, block, item), true)
    }
  }

  function setHidden(node, hidden) {
    if (!node) return
    node.toggleAttribute('data-lien-break-hide-v461', hidden)
  }

  function setBreakFormMode(form, enabled) {
    const customerSelect = form.querySelector('select[name="customerId"]')
    const customerLabel = customerSelect?.closest('label')
    const customerMode = form.querySelector('.ts-manual-customer-mode')
    const providerLabel = form.querySelector('select[name="bookingProvider"]')?.closest('label')
    const priceLabel = form.querySelector('input[name="estimatedPrice"]')?.closest('label')
    const noteLabel = form.querySelector('input[name="note"]')?.closest('label')
    const submit = form.querySelector('button[type="submit"]')
    const title = form.closest('[role="dialog"]')?.querySelector('#manual-appointment-title')
    const newCheck = form.querySelector('[data-ts-customer-new]')
    const codeCheck = form.querySelector('[data-ts-customer-code]')

    if (enabled && !form.__lienBreakPreviousV461) {
      form.__lienBreakPreviousV461 = {
        newCustomer: Boolean(newCheck?.checked),
        codeCustomer: Boolean(codeCheck?.checked),
        submitHtml: submit?.innerHTML || '',
        title: title?.textContent || '',
      }
    }
    form.classList.toggle('lien-break-mode-v461', enabled)
    for (const node of [customerLabel, customerMode, providerLabel, priceLabel, noteLabel]) setHidden(node, enabled)

    if (enabled) {
      if (newCheck) newCheck.checked = false
      if (codeCheck) codeCheck.checked = false
      for (const input of form.querySelectorAll('[name="customerId"],[name="newCustomerName"],[name="customerPublicCode"]')) {
        input.required = false
        input.disabled = true
      }
      const staff = form.querySelector('select[name="staffName"]')
      if (staff && (normalize(staff.value) === 'free' || normalize(staff.value) === normalize('フリー'))) {
        const available = Array.from(staff.options).find(option => normalize(option.value) !== 'free' && normalize(option.value) !== normalize('フリー'))
        if (available) staff.value = available.value
      }
      const duration = form.querySelector('input[name="durationMinutes"]')
      if (duration) {
        duration.min = String(SNAP_MINUTES)
        duration.step = String(SNAP_MINUTES)
        duration.value = String(Math.max(SNAP_MINUTES, snap(Number(duration.value) || 60)))
      }
      const price = form.querySelector('input[name="estimatedPrice"]')
      if (price) price.value = '0'
      if (submit) submit.textContent = '休憩を登録'
      if (title) title.textContent = '休憩を登録'
      if (!form.querySelector('.lien-break-mode-note-v461')) {
        const note = document.createElement('p')
        note.className = 'lien-break-mode-note-v461'
        note.textContent = '登録中はお客様アプリ・LINE予約・店頭予約の空き時間から自動で除外されます。'
        form.querySelector('div.flex.flex-col-reverse')?.insertAdjacentElement('beforebegin', note)
      }
      return
    }

    form.querySelector('.lien-break-mode-note-v461')?.remove()
    for (const input of form.querySelectorAll('[name="customerId"],[name="newCustomerName"],[name="customerPublicCode"]')) input.disabled = false
    const previous = form.__lienBreakPreviousV461
    if (previous) {
      if (newCheck) newCheck.checked = previous.newCustomer
      if (codeCheck) codeCheck.checked = previous.codeCustomer
      if (submit) submit.innerHTML = previous.submitHtml
      if (title) title.textContent = previous.title
      form.__lienBreakPreviousV461 = null
    }
    if (newCheck?.checked) newCheck.dispatchEvent(new Event('change', { bubbles: true }))
    else if (codeCheck?.checked) codeCheck.dispatchEvent(new Event('change', { bubbles: true }))
    else if (customerSelect) customerSelect.required = true
  }

  function enhanceManualBreakOption() {
    if (location.pathname !== '/admin/appointments') return
    const dialog = document.querySelector('[aria-labelledby="manual-appointment-title"]')
    const form = dialog?.querySelector('form')
    const menu = form?.querySelector('select[name="menu"]')
    if (!form || !menu) return
    form.querySelector('.lien-break-action-v442')?.remove()
    if (!menu.querySelector(`option[value="${BREAK_MENU_VALUE}"]`)) {
      const option = document.createElement('option')
      option.value = BREAK_MENU_VALUE
      option.dataset.price = '0'
      option.dataset.duration = '60'
      option.textContent = '休憩（予約受付を停止）'
      menu.insertBefore(option, menu.options[1] || null)
    }
    if (form.dataset.lienBreakFormV461 === '1') return
    form.dataset.lienBreakFormV461 = '1'
    menu.addEventListener('change', () => setBreakFormMode(form, menu.value === BREAK_MENU_VALUE))
    form.addEventListener('submit', async event => {
      if (menu.value !== BREAK_MENU_VALUE) return
      event.preventDefault()
      event.stopImmediatePropagation()
      if (form.dataset.lienBreakSubmittingV461 === '1' || !form.reportValidity()) return
      const start = String(form.querySelector('input[name="startTime"]')?.value || '')
      const [hour, minute] = start.split(':').map(Number)
      const duration = Number(form.querySelector('input[name="durationMinutes"]')?.value)
      const staff = form.querySelector('select[name="staffName"]')
      if (!Number.isInteger(hour) || !Number.isInteger(minute) || !Number.isInteger(duration) || !staff?.value) {
        showToast('開始時刻・休憩時間・スタッフを確認してください。', 'error')
        return
      }
      if (normalize(staff.value) === 'free' || normalize(staff.value) === normalize('フリー')) {
        showToast('休憩を登録するスタッフを選択してください。', 'error')
        return
      }
      form.dataset.lienBreakSubmittingV461 = '1'
      const submit = form.querySelector('button[type="submit"]')
      if (submit) { submit.disabled = true; submit.textContent = '休憩を登録しています…' }
      try {
        await jsonRequest('/api/admin/staff-breaks', {
          method: 'POST',
          body: JSON.stringify({
            date: selectedDate(),
            startMinutes: hour * 60 + minute,
            durationMinutes: duration,
            staffName: staff.value,
          }),
        })
        dialog.querySelector('button[aria-label="閉じる"]')?.click()
        showToast('休憩をシフト表へ登録しました。')
        window.setTimeout(() => location.reload(), 260)
      } catch (error) {
        form.dataset.lienBreakSubmittingV461 = '0'
        if (submit) { submit.disabled = false; submit.textContent = '休憩を登録' }
        showToast(error.message, 'error')
      }
    }, true)
  }

  function enhance() {
    addStyles()
    if (location.pathname !== '/admin/appointments') return
    enhanceBreakCards().catch(error => console.error('break interaction enhancement failed', error))
    enhanceManualBreakOption()
  }

  function schedule() {
    window.clearTimeout(state.scheduleTimer)
    state.scheduleTimer = window.setTimeout(enhance, 90)
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', schedule, { once: true })
  else schedule()
  new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true })
  window.addEventListener('popstate', schedule)
})()
