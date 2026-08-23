;(() => {
  if (window.__lienCustomerAppointmentCancelV371) return
  window.__lienCustomerAppointmentCancelV371 = true

  const style = document.createElement('style')
  style.textContent = `
    .lien-cancel-v371__button{display:flex;min-height:44px;width:100%;align-items:center;justify-content:space-between;gap:12px;margin-top:12px;border:1px solid #d9cbc1;border-radius:14px;background:#fff;padding:0 16px;color:#69443c;font:inherit;font-size:13px;font-weight:700;cursor:pointer;transition:background-color .18s ease,border-color .18s ease,box-shadow .18s ease}
    .lien-cancel-v371__button:hover{border-color:#cba99f;background:#fffaf8;box-shadow:0 8px 22px rgba(93,62,52,.08)}
    .lien-cancel-v371__chevron{width:8px;height:8px;border-right:1.5px solid currentColor;border-bottom:1.5px solid currentColor;transform:rotate(45deg);transition:transform .18s ease}
    .lien-cancel-v371__button[aria-expanded="true"] .lien-cancel-v371__chevron{transform:rotate(225deg)}
    .lien-cancel-v371__detail{margin-top:12px;border-top:1px solid #e4d8cf;padding-top:14px}
    .lien-cancel-v371__detail[hidden]{display:none}
    .lien-cancel-v371__detail dl{display:grid;grid-template-columns:78px minmax(0,1fr);gap:7px 12px;margin:0;font-size:12px;line-height:1.7}
    .lien-cancel-v371__detail dt{color:#8b8178}.lien-cancel-v371__detail dd{margin:0;color:#433832;font-weight:600}
    .lien-cancel-v371__warning{margin:14px 0 0;border:1px solid #efcbc6;border-radius:12px;background:#fff7f5;padding:11px 12px;color:#795047;font-size:11px;line-height:1.7}
    .lien-cancel-v371__cancel{display:flex;min-height:46px;width:100%;align-items:center;justify-content:center;margin-top:10px;border:1px solid #cf6158;border-radius:999px;background:#fff;color:#ad4038;font:inherit;font-size:13px;font-weight:700;cursor:pointer;transition:background-color .18s ease,box-shadow .18s ease}
    .lien-cancel-v371__cancel:hover{background:#fff0ed;box-shadow:0 8px 20px rgba(173,64,56,.1)}
    .lien-cancel-v371__cancel:disabled{cursor:wait;opacity:.55}
    .lien-cancel-v371__feedback{margin:12px 0 0;border-radius:12px;padding:10px 12px;font-size:12px;font-weight:700;line-height:1.6}
    .lien-cancel-v371__feedback.success{border:1px solid #b9d9c0;background:#edf7ef;color:#315c3c}
    .lien-cancel-v371__feedback.error{border:1px solid #efcbc6;background:#fff0ef;color:#973b34}
    @media (max-width:639px){.lien-cancel-v371__detail dl{grid-template-columns:68px minmax(0,1fr)}}
  `
  document.head.appendChild(style)

  const escapeHtml = value => String(value || '').replace(/[&<>'"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[char]))

  function detailsFor(card) {
    const paragraphs = card.querySelectorAll(':scope > p')
    const date = paragraphs[0]?.textContent?.trim() || '日時未設定'
    const content = paragraphs[1]?.textContent?.trim() || 'メニュー未設定 / 担当フリー'
    const [menu, staff] = content.split('/').map(value => value.trim())
    return { date, menu: menu || 'メニュー未設定', staff: staff || '担当フリー' }
  }

  function showSectionFeedback(section, message, tone) {
    let node = section?.querySelector('[data-lien-cancel-feedback]')
    if (!node && section) {
      node = document.createElement('p')
      node.dataset.lienCancelFeedback = '1'
      section.querySelector('h2')?.insertAdjacentElement('afterend', node)
    }
    if (!node) return
    node.className = `lien-cancel-v371__feedback ${tone}`
    node.textContent = message
  }

  function enhanceCard(card, requestedId) {
    if (card.dataset.lienCancelV371 === '1') return
    const appointmentId = card.getAttribute('data-customer-appointment-id')
    if (!appointmentId) return
    card.dataset.lienCancelV371 = '1'
    // The pre-v370 workflow still observes this route. Mark it handled and
    // remove any legacy controls regardless of which script won the load race.
    card.dataset.lienCancelEnhanced = '1'
    card.querySelectorAll('.lien-cancel-v362__detail-button,.lien-cancel-v362__detail,.lien-cancel-v370__button,.lien-cancel-v370__detail').forEach(node => node.remove())

    const section = card.closest('section')
    if (section && !section.id) section.id = 'current-reservations'
    const details = detailsFor(card)
    const detailId = `lien-cancel-v371-${appointmentId}`

    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'lien-cancel-v371__button'
    button.setAttribute('aria-expanded', 'false')
    button.setAttribute('aria-controls', detailId)
    button.innerHTML = '<span>予約の詳細・キャンセル</span><span class="lien-cancel-v371__chevron" aria-hidden="true"></span>'

    const detail = document.createElement('div')
    detail.id = detailId
    detail.className = 'lien-cancel-v371__detail'
    detail.hidden = true
    detail.innerHTML = `
      <dl>
        <dt>予約日時</dt><dd>${escapeHtml(details.date)}</dd>
        <dt>メニュー</dt><dd>${escapeHtml(details.menu)}</dd>
        <dt>担当</dt><dd>${escapeHtml(details.staff)}</dd>
      </dl>
      <p class="lien-cancel-v371__warning">予約をキャンセルすると元に戻せません。内容をご確認のうえ操作してください。</p>
      <button type="button" class="lien-cancel-v371__cancel">予約をキャンセルする</button>
      <p class="lien-cancel-v371__feedback error" data-lien-cancel-card-error hidden></p>`

    button.addEventListener('click', () => {
      const expanded = button.getAttribute('aria-expanded') === 'true'
      button.setAttribute('aria-expanded', String(!expanded))
      detail.hidden = expanded
    })

    const cancelButton = detail.querySelector('.lien-cancel-v371__cancel')
    const errorNode = detail.querySelector('[data-lien-cancel-card-error]')
    cancelButton.addEventListener('click', async () => {
      if (!window.confirm(`${details.date}の予約をキャンセルしますか？`)) return
      cancelButton.disabled = true
      cancelButton.textContent = 'キャンセルしています…'
      errorNode.hidden = true
      try {
        const response = await fetch('/api/lien-customer-appointment-cancel', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ appointmentId }),
        })
        const payload = await response.json().catch(() => ({}))
        if (!response.ok || !payload.success) throw new Error(payload.error || '予約をキャンセルできませんでした。')
        card.remove()
        showSectionFeedback(section, '予約をキャンセルしました。店舗にも通知しました。', 'success')
      } catch (error) {
        errorNode.textContent = error instanceof Error ? error.message : '予約をキャンセルできませんでした。'
        errorNode.hidden = false
        cancelButton.disabled = false
        cancelButton.textContent = '予約をキャンセルする'
      }
    })

    card.append(button, detail)
    if (requestedId === appointmentId) {
      button.setAttribute('aria-expanded', 'true')
      detail.hidden = false
      window.requestAnimationFrame(() => card.scrollIntoView({ block: 'center', behavior: 'smooth' }))
    }
  }

  function enhanceAppointments() {
    if (location.pathname !== '/u/appointments') return
    const requestedId = new URLSearchParams(location.search).get('detail')
    document.querySelectorAll('[data-customer-appointment-id]').forEach(card => enhanceCard(card, requestedId))
  }

  enhanceAppointments()
  const observer = new MutationObserver(enhanceAppointments)
  observer.observe(document.documentElement, { childList: true, subtree: true })
})()
