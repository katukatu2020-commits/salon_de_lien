;(() => {
  /* appointment-datetime-editor-v663 */
  if (window.__orimiaAppointmentDatetimeEditorV663) return
  window.__orimiaAppointmentDatetimeEditorV663 = true

  const RELEASE = 'appointment-datetime-editor-v663'
  const LOCKED_STATUSES = ['会計済み', '会計完了', '来店完了', 'キャンセル', '無断キャンセル']
  let activePath = ''
  let previousFocus = null
  let rerunTimer = 0

  function normalizedText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim()
  }

  function exactText(selector, expected, root = document) {
    return Array.from(root.querySelectorAll(selector)).find(element => normalizedText(element.textContent) === expected) || null
  }

  function appointmentId() {
    const match = location.pathname.match(/^\/admin\/appointments\/([^/]+)\/?$/)
    return match ? decodeURIComponent(match[1]) : ''
  }

  function metricCard(label) {
    const heading = exactText('p', label)
    return heading?.closest('.overflow-hidden') || heading?.parentElement?.parentElement?.parentElement || null
  }

  function metricValue(card) {
    const label = exactText('p', '予約日時', card)
    return label?.parentElement?.querySelector('.tabular-nums') || null
  }

  function definitionValue(label) {
    const term = exactText('dt', label)
    return normalizedText(term?.nextElementSibling?.textContent)
  }

  function parseDateTime(value) {
    const match = normalizedText(value).match(/(20\d{2})年(\d{1,2})月(\d{1,2})日(?:\([^)]*\))?\s*(\d{1,2}):(\d{2})/)
    if (!match) return null
    return {
      date: `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`,
      time: `${match[4].padStart(2, '0')}:${match[5]}`,
    }
  }

  function currentStaffName() {
    const fromDetails = definitionValue('担当')
    if (fromDetails) return fromDetails
    const menuCard = metricCard('本日のメニュー')
    if (!menuCard) return ''
    const candidate = Array.from(menuCard.querySelectorAll('p,span,div'))
      .map(element => normalizedText(element.textContent))
      .filter(value => /^担当:\s*\S/.test(value))
      .sort((left, right) => left.length - right.length)[0]
    return candidate ? candidate.replace(/^担当:\s*/, '').trim() : ''
  }

  function currentDuration() {
    const match = definitionValue('施術時間').match(/(\d+)/)
    return match ? Number(match[1]) : 60
  }

  function isLocked(card) {
    const cardText = normalizedText(card?.textContent)
    const completedElsewhere = ['会計済み', '会計完了', '来店完了']
      .some(status => Boolean(exactText('p,span,div', status)))
    return completedElsewhere || LOCKED_STATUSES.some(status => cardText.includes(status))
  }

  function installStyle() {
    if (document.getElementById('orimia-appointment-datetime-style-v663')) return
    const style = document.createElement('style')
    style.id = 'orimia-appointment-datetime-style-v663'
    style.textContent = `
      .orimia-appointment-datetime-trigger-v663{display:flex;width:100%;min-height:42px;margin-top:14px;align-items:center;justify-content:center;gap:8px;border:1px solid #cf9b91;border-radius:10px;background:#fff;color:#7e4037;font:700 14px/1.3 inherit;cursor:pointer;transition:background-color .16s ease,border-color .16s ease,transform .16s ease}
      .orimia-appointment-datetime-trigger-v663[hidden]{display:none!important}
      .orimia-appointment-datetime-trigger-v663:hover{background:#fff7f4;border-color:#b96d60}.orimia-appointment-datetime-trigger-v663:active{transform:translateY(1px)}
      .orimia-appointment-datetime-trigger-v663:focus-visible,.orimia-appointment-datetime-v663 button:focus-visible,.orimia-appointment-datetime-v663 input:focus-visible{outline:3px solid rgba(185,109,96,.28);outline-offset:2px}
      .orimia-appointment-datetime-v663{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;padding:20px;background:rgba(46,35,31,.44);backdrop-filter:blur(2px)}
      .orimia-appointment-datetime-v663[hidden]{display:none!important}.orimia-appointment-datetime-panel-v663{width:min(500px,100%);max-height:calc(100dvh - 40px);overflow:auto;border:1px solid #e6d4cd;border-radius:16px;background:#fffdfb;box-shadow:0 24px 70px rgba(55,37,31,.24);color:#342824}
      .orimia-appointment-datetime-head-v663{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:22px 22px 16px;border-bottom:1px solid #eaded8}.orimia-appointment-datetime-head-v663 h2{margin:0;font-size:20px;line-height:1.35;font-weight:800;letter-spacing:0}.orimia-appointment-datetime-head-v663 p{margin:5px 0 0;color:#887870;font-size:13px;line-height:1.6}
      .orimia-appointment-datetime-close-v663{display:grid;flex:0 0 40px;width:40px;height:40px;place-items:center;border:1px solid #e4d4cd;border-radius:50%;background:#fff;color:#66564f;font:400 24px/1 inherit;cursor:pointer}
      .orimia-appointment-datetime-form-v663{display:grid;gap:18px;padding:22px}.orimia-appointment-datetime-fields-v663{display:grid;grid-template-columns:1fr 1fr;gap:12px}.orimia-appointment-datetime-form-v663 label{display:grid;gap:7px;color:#4a3c36;font-size:13px;font-weight:800}.orimia-appointment-datetime-form-v663 input{width:100%;min-height:48px;border:1px solid #dcccc5;border-radius:10px;background:#fff;padding:0 13px;color:#342824;font:700 16px/1 inherit;color-scheme:light}
      .orimia-appointment-datetime-summary-v663{margin:0;border-left:3px solid #c56a7e;background:#faf3ef;padding:12px 14px;color:#67564e;font-size:13px;line-height:1.65}.orimia-appointment-datetime-note-v663{margin:0;color:#887870;font-size:12px;line-height:1.7}.orimia-appointment-datetime-error-v663{margin:0;border:1px solid #e7aaa3;border-radius:10px;background:#fff1ef;padding:11px 13px;color:#8b3730;font-size:13px;font-weight:700;line-height:1.55}.orimia-appointment-datetime-error-v663[hidden]{display:none!important}
      .orimia-appointment-datetime-actions-v663{display:flex;justify-content:flex-end;gap:10px;padding-top:2px}.orimia-appointment-datetime-actions-v663 button{min-height:44px;border-radius:10px;padding:0 18px;font:800 14px/1 inherit;cursor:pointer}.orimia-appointment-datetime-cancel-v663{border:1px solid #dbcac2;background:#fff;color:#594942}.orimia-appointment-datetime-save-v663{min-width:142px;border:1px solid #a94c61;background:#bd526c;color:#fff;box-shadow:0 6px 16px rgba(169,76,97,.2)}.orimia-appointment-datetime-save-v663:disabled{cursor:wait;opacity:.68}
      .orimia-appointment-datetime-toast-v663{position:fixed;right:20px;bottom:20px;z-index:2147483001;max-width:min(420px,calc(100vw - 40px));border:1px solid #bed5c0;border-radius:12px;background:#eff7ef;padding:13px 16px;color:#365b3a;box-shadow:0 12px 34px rgba(43,65,45,.18);font-size:13px;font-weight:800;line-height:1.55}
      body.orimia-appointment-datetime-open-v663{overflow:hidden!important}
      @media(max-width:640px){.orimia-appointment-datetime-trigger-v663{min-height:46px}.orimia-appointment-datetime-v663{align-items:end;padding:0}.orimia-appointment-datetime-panel-v663{width:100%;max-height:calc(100dvh - 28px);border-width:1px 0 0;border-radius:16px 16px 0 0}.orimia-appointment-datetime-head-v663{padding:20px 18px 15px}.orimia-appointment-datetime-form-v663{gap:16px;padding:18px}.orimia-appointment-datetime-fields-v663{grid-template-columns:1fr}.orimia-appointment-datetime-actions-v663{position:sticky;bottom:-18px;z-index:2;display:grid;grid-template-columns:1fr 1fr;margin:0 -18px -18px;padding:12px 18px 18px;border-top:1px solid #eaded8;background:#fffdfb}.orimia-appointment-datetime-actions-v663 button{width:100%;padding:0 12px}.orimia-appointment-datetime-toast-v663{right:12px;bottom:12px;max-width:calc(100vw - 24px)}}
    `
    document.head.appendChild(style)
  }

  function formatJapaneseDateTime(dateValue, timeValue) {
    const [year, month, day] = dateValue.split('-').map(Number)
    const [hour, minute] = timeValue.split(':').map(Number)
    const weekday = ['日', '月', '火', '水', '木', '金', '土'][new Date(Date.UTC(year, month - 1, day)).getUTCDay()]
    return `${year}年${month}月${day}日(${weekday}) ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
  }

  function showToast(message) {
    document.querySelector('.orimia-appointment-datetime-toast-v663')?.remove()
    const toast = document.createElement('div')
    toast.className = 'orimia-appointment-datetime-toast-v663'
    toast.setAttribute('role', 'status')
    toast.textContent = message
    document.body.appendChild(toast)
    window.setTimeout(() => toast.remove(), 4500)
  }

  function updateDisplayedDateTime(value) {
    const card = metricCard('予約日時')
    const mainValue = card ? metricValue(card) : null
    if (mainValue) mainValue.textContent = value
    for (const term of document.querySelectorAll('dt')) {
      if (normalizedText(term.textContent) !== '予約日時') continue
      if (term.nextElementSibling) term.nextElementSibling.textContent = value
    }
  }

  function closeDialog(overlay) {
    overlay.hidden = true
    document.body.classList.remove('orimia-appointment-datetime-open-v663')
    if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus()
    previousFocus = null
  }

  function buildDialog({ id, card, dateTime, durationMinutes, staffName }) {
    document.getElementById('orimia-appointment-datetime-v663')?.remove()
    const overlay = document.createElement('div')
    overlay.id = 'orimia-appointment-datetime-v663'
    overlay.className = 'orimia-appointment-datetime-v663'
    overlay.hidden = true
    overlay.setAttribute('role', 'dialog')
    overlay.setAttribute('aria-modal', 'true')
    overlay.setAttribute('aria-labelledby', 'orimia-appointment-datetime-title-v663')
    overlay.innerHTML = `
      <section class="orimia-appointment-datetime-panel-v663">
        <header class="orimia-appointment-datetime-head-v663">
          <div><h2 id="orimia-appointment-datetime-title-v663">予約日時を変更</h2><p>お客様の来店日と開始時刻を変更します。</p></div>
          <button type="button" class="orimia-appointment-datetime-close-v663" aria-label="閉じる">×</button>
        </header>
        <form class="orimia-appointment-datetime-form-v663">
          <p class="orimia-appointment-datetime-summary-v663"></p>
          <div class="orimia-appointment-datetime-fields-v663">
            <label>予約日<input type="date" name="date" required></label>
            <label>開始時刻<input type="time" name="time" step="900" required></label>
          </div>
          <p class="orimia-appointment-datetime-note-v663">担当者・メニュー・施術時間は変更されません。受付時間やほかの予約と重なる場合は保存できません。</p>
          <p class="orimia-appointment-datetime-error-v663" role="alert" hidden></p>
          <div class="orimia-appointment-datetime-actions-v663">
            <button type="button" class="orimia-appointment-datetime-cancel-v663">キャンセル</button>
            <button type="submit" class="orimia-appointment-datetime-save-v663">変更を保存</button>
          </div>
        </form>
      </section>`
    document.body.appendChild(overlay)

    const form = overlay.querySelector('form')
    const dateInput = form.elements.date
    const timeInput = form.elements.time
    const summary = overlay.querySelector('.orimia-appointment-datetime-summary-v663')
    const errorBox = overlay.querySelector('.orimia-appointment-datetime-error-v663')
    const saveButton = overlay.querySelector('.orimia-appointment-datetime-save-v663')

    dateInput.value = dateTime.date
    timeInput.value = dateTime.time
    summary.textContent = `施術時間 ${durationMinutes}分 / 担当 ${staffName}`

    const dismiss = () => closeDialog(overlay)
    overlay.querySelector('.orimia-appointment-datetime-close-v663').addEventListener('click', dismiss)
    overlay.querySelector('.orimia-appointment-datetime-cancel-v663').addEventListener('click', dismiss)
    overlay.addEventListener('mousedown', event => { if (event.target === overlay) dismiss() })
    overlay.addEventListener('keydown', event => { if (event.key === 'Escape') dismiss() })

    form.addEventListener('submit', async event => {
      event.preventDefault()
      errorBox.hidden = true
      errorBox.textContent = ''
      if (!dateInput.value || !/^\d{2}:\d{2}$/.test(timeInput.value)) {
        errorBox.textContent = '予約日と開始時刻を確認してください。'
        errorBox.hidden = false
        return
      }
      const [hours, minutes] = timeInput.value.split(':').map(Number)
      if (minutes % 15 !== 0) {
        errorBox.textContent = '開始時刻は15分単位で入力してください。'
        errorBox.hidden = false
        return
      }
      saveButton.disabled = true
      saveButton.textContent = '保存中...'
      try {
        const response = await fetch(`/api/admin/appointments/${encodeURIComponent(id)}/schedule`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({
            date: dateInput.value,
            startMinutes: hours * 60 + minutes,
            durationMinutes,
            staffName,
          }),
        })
        const payload = await response.json().catch(() => ({}))
        if (!response.ok || !payload.appointment) throw new Error(payload.error || '予約日時を変更できませんでした。')
        const formatted = formatJapaneseDateTime(dateInput.value, timeInput.value)
        updateDisplayedDateTime(formatted)
        card.dataset.orimiaAppointmentDateV663 = dateInput.value
        card.dataset.orimiaAppointmentTimeV663 = timeInput.value
        closeDialog(overlay)
        showToast('予約日時を変更しました。シフト表とお客様アプリにも反映されます。')
      } catch (error) {
        errorBox.textContent = error instanceof Error ? error.message : '予約日時を変更できませんでした。'
        errorBox.hidden = false
        errorBox.focus?.()
      } finally {
        saveButton.disabled = false
        saveButton.textContent = '変更を保存'
      }
    })
    return overlay
  }

  function enhance() {
    const path = location.pathname
    const id = appointmentId()
    if (!id) {
      document.getElementById('orimia-appointment-datetime-v663')?.remove()
      document.body.classList.remove('orimia-appointment-datetime-open-v663')
      activePath = path
      return
    }
    const card = metricCard('予約日時')
    if (!card) return
    if (isLocked(card)) {
      card.querySelector('[data-orimia-appointment-datetime-trigger-v663]')?.remove()
      return
    }
    const value = metricValue(card)
    const dateTime = parseDateTime(value?.textContent)
    const staffName = currentStaffName()
    const durationMinutes = currentDuration()
    if (!dateTime || !staffName || !Number.isFinite(durationMinutes) || durationMinutes < 15) return

    if (activePath !== path) {
      document.getElementById('orimia-appointment-datetime-v663')?.remove()
      document.body.classList.remove('orimia-appointment-datetime-open-v663')
      activePath = path
    }
    if (card.querySelector('[data-orimia-appointment-datetime-trigger-v663]')) return
    installStyle()
    card.dataset.orimiaAppointmentDateV663 = dateTime.date
    card.dataset.orimiaAppointmentTimeV663 = dateTime.time
    const trigger = document.createElement('button')
    trigger.type = 'button'
    trigger.className = 'orimia-appointment-datetime-trigger-v663'
    trigger.dataset.orimiaAppointmentDatetimeTriggerV663 = RELEASE
    trigger.textContent = '日時を変更'
    trigger.disabled = true
    trigger.hidden = true
    card.appendChild(trigger)
    window.setTimeout(() => {
      if (!trigger.isConnected || !card.contains(trigger)) return
      trigger.disabled = false
      trigger.hidden = false
    }, 700)
  }

  function scheduleEnhance() {
    window.clearTimeout(rerunTimer)
    rerunTimer = window.setTimeout(enhance, 80)
  }

  function start() {
    window.setTimeout(() => {
      enhance()
      new MutationObserver(scheduleEnhance).observe(document.documentElement, { childList: true, subtree: true })
      window.addEventListener('popstate', scheduleEnhance)
    }, 500)
  }

  function editorTrigger(event) {
    return event.target instanceof Element
      ? event.target.closest('[data-orimia-appointment-datetime-trigger-v663]')
      : null
  }

  function openEditor(target, event) {
    event.preventDefault()
    event.stopPropagation()
    const id = appointmentId()
    const card = metricCard('予約日時')
    const parsed = parseDateTime(metricValue(card)?.textContent)
    const staffName = currentStaffName()
    const durationMinutes = currentDuration()
    if (!id || !card || !parsed || !staffName || isLocked(card)) return
    document.querySelector('.orimia-appointment-datetime-toast-v663')?.remove()
    const dateTime = {
      date: card.dataset.orimiaAppointmentDateV663 || parsed.date,
      time: card.dataset.orimiaAppointmentTimeV663 || parsed.time,
    }
    const dialog = buildDialog({ id, card, dateTime, durationMinutes, staffName })
    previousFocus = target
    dialog.hidden = false
    document.body.classList.add('orimia-appointment-datetime-open-v663')
    window.setTimeout(() => dialog.querySelector('input[name="date"]')?.focus(), 0)
  }

  document.addEventListener('pointerdown', event => {
    const target = editorTrigger(event)
    if (!target || event.button !== 0) return
    openEditor(target, event)
  }, true)

  document.addEventListener('click', event => {
    const target = editorTrigger(event)
    if (!target) return
    openEditor(target, event)
  }, true)

  if (document.readyState === 'complete') start()
  else window.addEventListener('load', start, { once: true })
})()
