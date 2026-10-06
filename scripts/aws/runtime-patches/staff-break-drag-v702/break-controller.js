  function staffLanes() {
    return [...document.querySelectorAll('.shift-lane[data-staff-name]')].filter(lane => lane.getBoundingClientRect().width > 0 && (state.breakData?.staff || []).some(staff => staff.staffKey === lane.dataset.staffKey))
  }

  function nearestLane(y, fallback) {
    return staffLanes().find(lane => { const r = lane.getBoundingClientRect(); return y >= r.top && y <= r.bottom }) || fallback
  }

  function updateBlock(block, item, lane) {
    const data = state.breakData
    const span = data.closeMinutes - data.openMinutes
    block.style.left = `${(item.startMinutes - data.openMinutes) / span * 100}%`
    block.style.width = `${item.durationMinutes / span * 100}%`
    const label = block.querySelector(':scope > span:not([data-break-edge])')
    if (label) label.innerHTML = `休憩<br>${timeLabel(item.startMinutes)}〜<wbr>${timeLabel(item.startMinutes + item.durationMinutes)}`
    block.setAttribute('aria-label', `${item.staffName} ${timeLabel(item.startMinutes)}から${timeLabel(item.startMinutes + item.durationMinutes)}の休憩`)
    if (lane && block.parentElement !== lane) lane.appendChild(block)
  }

  function previewFromPointer(drag, event) {
    const lane = drag.mode === 'move' ? nearestLane(event.clientY, drag.originLane) : drag.originLane
    const rect = lane.getBoundingClientRect(), data = state.breakData
    const staff = data.staff.find(item => item.staffKey === lane.dataset.staffKey)
    if (!staff || !rect.width) return null
    const deltaMinutes = ((event.clientX - rect.left) - drag.originOffset) / rect.width * (data.closeMinutes - data.openMinutes)
    const preview = calculateBreakPreview({ origin: drag.origin, mode: drag.mode, deltaMinutes, ...data, ...staff })
    return preview ? { ...drag.origin, ...preview, staffKey: staff.staffKey, staffName: staff.staffName, lane } : null
  }

  function clearDrag(drag) {
    window.removeEventListener('pointermove', drag.move, true)
    window.removeEventListener('pointerup', drag.up, true)
    window.removeEventListener('pointercancel', drag.cancel, true)
    window.removeEventListener('blur', drag.cancel, true)
    window.removeEventListener('resize', drag.cancel, true)
    window.removeEventListener('popstate', drag.cancel, true)
    document.removeEventListener('keydown', drag.keydown, true)
    try { if (drag.block.hasPointerCapture(drag.pointerId)) drag.block.releasePointerCapture(drag.pointerId) } catch {}
    drag.block.classList.remove('is-dragging-v702')
    state.drag = null
    if (drag.moved) drag.block.dataset.lienBreakSuppressClickUntil = String(Date.now() + 800)
  }

  async function publishBreakData(payload) {
    if (payload.date !== selectedDate() || location.pathname !== '/admin/appointments') return
    state.breakData = payload; state.breakDate = payload.date
    window.dispatchEvent(new CustomEvent('lien:staff-breaks-updated-v702', { detail: payload }))
    await enhanceBreakCards()
  }

  async function persistBreak(block, item, origin, originLane, date) {
    if (state.saving) return
    const snapshot = state.breakData
    state.saving = true
    block.classList.add('is-pending-v461'); block.setAttribute('aria-busy', 'true')
    try {
      const response = await jsonRequest(`/api/admin/staff-breaks/${encodeURIComponent(item.id)}`, {
        method: 'PATCH', body: JSON.stringify({ date, startMinutes: item.startMinutes, durationMinutes: item.durationMinutes, staffKey: item.staffKey, staffName: item.staffName }),
      })
      const payload = { ...snapshot, breaks: snapshot.breaks.map(row => row.id === item.id ? response.break : row) }
      const focused = block.contains(document.activeElement), edge = document.activeElement?.dataset.breakEdge
      if (selectedDate() === date && state.breakData?.date === date) {
        await publishBreakData(payload)
        if (focused) {
          const replacement = [...document.querySelectorAll('.lien-shift-break-v442')].find(node => node.dataset.breakId === item.id)
          const focusTarget = edge ? replacement?.querySelector(`[data-break-edge="${edge}"]`) : replacement
          focusTarget?.focus({ preventScroll: true })
        }
      }
      showToast(`${item.staffName}の休憩を${timeLabel(item.startMinutes)}〜${timeLabel(item.startMinutes + item.durationMinutes)}に変更しました。`)
    } catch (error) {
      if (block.isConnected && selectedDate() === date) updateBlock(block, origin, originLane)
      showToast(error.message, 'error')
    } finally {
      block.classList.remove('is-pending-v461'); block.removeAttribute('aria-busy'); state.saving = false
    }
  }

  function beginBreakDrag(event, block, id, mode) {
    if (event.button !== 0 || event.isPrimary === false || state.drag || state.saving) return
    const item = state.breakData?.breaks.find(row => row.id === id)
    const lane = block.closest('.shift-lane[data-staff-name]')
    if (!item || !lane || state.breakData.date !== selectedDate()) return
    event.stopPropagation()
    if (event.pointerType !== 'touch' || mode !== 'move') event.preventDefault()
    const drag = { block, mode, pointerId: event.pointerId, pointerType: event.pointerType, originX: event.clientX, originY: event.clientY, originOffset: event.clientX - lane.getBoundingClientRect().left, originLane: lane, origin: { ...item }, preview: { ...item, lane }, date: selectedDate(), moved: false }
    drag.cancel = cancelEvent => {
      if (cancelEvent?.pointerId != null && cancelEvent.pointerId !== drag.pointerId) return
      clearDrag(drag)
      if (block.isConnected) updateBlock(block, drag.origin, drag.originLane)
    }
    drag.keydown = keyEvent => { if (keyEvent.key === 'Escape') { keyEvent.preventDefault(); keyEvent.stopImmediatePropagation(); drag.cancel() } }
    drag.move = moveEvent => {
      if (moveEvent.pointerId !== drag.pointerId) return
      if (selectedDate() !== drag.date || !block.isConnected) return drag.cancel()
      const dx = moveEvent.clientX - drag.originX, dy = moveEvent.clientY - drag.originY
      if (!drag.moved) {
        if (Math.hypot(dx, dy) < (drag.pointerType === 'touch' ? 8 : 3)) return
        if (drag.pointerType === 'touch' && drag.mode === 'move' && Math.abs(dy) > Math.abs(dx)) return drag.cancel()
        drag.moved = true; block.classList.add('is-dragging-v702')
        try { block.setPointerCapture(drag.pointerId) } catch {}
      }
      moveEvent.preventDefault(); moveEvent.stopPropagation()
      const preview = previewFromPointer(drag, moveEvent)
      if (preview) { drag.preview = preview; updateBlock(block, preview, preview.lane) }
    }
    drag.up = upEvent => {
      if (upEvent.pointerId !== drag.pointerId) return
      if (selectedDate() !== drag.date || !block.isConnected) return drag.cancel(upEvent)
      clearDrag(drag)
      if (!drag.moved) return
      upEvent.preventDefault(); upEvent.stopPropagation()
      const next = drag.preview
      if (next.startMinutes === item.startMinutes && next.durationMinutes === item.durationMinutes && next.staffKey === item.staffKey) return
      void persistBreak(block, next, drag.origin, drag.originLane, drag.date)
    }
    state.drag = drag
    window.addEventListener('pointermove', drag.move, { capture: true, passive: false })
    window.addEventListener('pointerup', drag.up, true)
    window.addEventListener('pointercancel', drag.cancel, true)
    window.addEventListener('blur', drag.cancel, true)
    window.addEventListener('resize', drag.cancel, true)
    window.addEventListener('popstate', drag.cancel, true)
    document.addEventListener('keydown', drag.keydown, true)
  }

  function nudgeBreak(event, block, id) {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return
    event.preventDefault(); event.stopImmediatePropagation()
    if (state.saving || state.drag) return
    const item = state.breakData?.breaks.find(row => row.id === id)
    const staff = state.breakData?.staff.find(row => row.staffKey === item?.staffKey)
    if (!item || !staff) return
    const mode = event.target.dataset.breakEdge || (event.shiftKey ? 'end' : 'move')
    const next = calculateBreakPreview({ origin: item, mode, deltaMinutes: event.key === 'ArrowLeft' ? -15 : 15, ...state.breakData, ...staff })
    if (!next || (next.startMinutes === item.startMinutes && next.durationMinutes === item.durationMinutes)) return
    const lane = block.closest('.shift-lane')
    const preview = { ...item, ...next }
    updateBlock(block, preview, lane)
    void persistBreak(block, preview, item, lane, selectedDate())
  }

  async function enhanceBreakCards() {
    if (location.pathname !== '/admin/appointments') return
    if (document.querySelector('script[src*="/_next/static/chunks/main-app-"]') && !window.__orimiaHydratedV680) return
    const data = await loadBreakData().catch(() => null)
    if (!data || data.date !== selectedDate()) return
    for (const block of document.querySelectorAll('.lien-shift-break-v442[data-break-id]')) {
      if (block.dataset.lienBreakInteractionV702) continue
      const id = block.dataset.breakId, item = data.breaks.find(row => row.id === id)
      if (!item) continue
      block.dataset.lienBreakInteractionV702 = '1'
      block.title = '休憩を移動 / 両端で開始・終了を変更'
      updateBlock(block, item)
      for (const edge of ['start', 'end']) {
        const handle = document.createElement('span')
        handle.className = 'lien-break-edge-v702'; handle.dataset.breakEdge = edge
        handle.tabIndex = 0; handle.setAttribute('role', 'button')
        handle.setAttribute('aria-label', edge === 'start' ? '休憩の開始時刻を変更' : '休憩の終了時刻を変更')
        handle.title = edge === 'start' ? '開始時刻を変更' : '終了時刻を変更'
        block.appendChild(handle)
      }
      block.addEventListener('pointerdown', event => beginBreakDrag(event, block, id, event.target.closest('[data-break-edge]')?.dataset.breakEdge || 'move'), true)
      block.addEventListener('click', event => {
        if (event.target.closest('[data-break-edge]') || state.saving || Date.now() < Number(block.dataset.lienBreakSuppressClickUntil || 0)) { event.preventDefault(); event.stopImmediatePropagation() }
      }, true)
      block.addEventListener('dblclick', event => { event.preventDefault(); event.stopPropagation() })
      block.addEventListener('keydown', event => {
        if (event.target.closest('[data-break-edge]') && ['Enter', ' '].includes(event.key)) { event.preventDefault(); event.stopImmediatePropagation(); return }
        nudgeBreak(event, block, id)
      }, true)
    }
  }
