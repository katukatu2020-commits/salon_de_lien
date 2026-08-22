
;(() => {
  if (window.__lienCustomerAppointmentCancelV362) return
  window.__lienCustomerAppointmentCancelV362 = true

  const style = document.createElement('style')
  style.textContent = `
    .lien-cancel-v362__home-link{display:inline-flex;min-height:40px;align-items:center;gap:5px;margin-top:12px;border:1px solid #8eb59a;border-radius:999px;background:#fff;padding:0 16px;color:#315c3c;font-size:12px;font-weight:700;text-decoration:none;transition:.18s ease}
    .lien-cancel-v362__home-link:hover{background:#f7fff8}
    .lien-cancel-v362__detail-button{display:flex;min-height:40px;width:100%;align-items:center;justify-content:space-between;gap:10px;margin-top:9px;border:1px solid #dacdc3;border-radius:999px;background:#fff;padding:0 14px;color:#74483f;font-size:12px;font-weight:700;cursor:pointer}
    .lien-cancel-v362__chevron{width:8px;height:8px;border-right:1.5px solid currentColor;border-bottom:1.5px solid currentColor;transform:rotate(45deg);transition:.18s ease}
    .lien-cancel-v362__detail-button[aria-expanded="true"] .lien-cancel-v362__chevron{transform:rotate(225deg)}
    .lien-cancel-v362__detail{margin-top:12px;border-top:1px solid #dfd4ca;padding-top:12px}
    .lien-cancel-v362__detail[hidden]{display:none}
    .lien-cancel-v362__detail dl{display:grid;grid-template-columns:76px minmax(0,1fr);gap:7px 10px;margin:0;font-size:12px;line-height:1.6}
    .lien-cancel-v362__detail dt{color:#8b8178}.lien-cancel-v362__detail dd{margin:0;color:#433832;font-weight:600}
    .lien-cancel-v362__warning{display:flex;gap:7px;margin:12px 0 0;border:1px solid #efcbc6;border-radius:12px;background:#fff7f5;padding:10px;color:#795047;font-size:11px;line-height:1.7}
    .lien-cancel-v362__cancel{display:flex;min-height:44px;width:100%;align-items:center;justify-content:center;margin-top:10px;border:1px solid #d56b61;border-radius:999px;background:#fff;color:#ad4038;font-size:13px;font-weight:700;cursor:pointer;transition:.18s ease}
    .lien-cancel-v362__cancel:hover{background:#fff0ed}.lien-cancel-v362__cancel:disabled{cursor:wait;opacity:.55}
    .lien-cancel-v362__feedback{margin:10px 0 0;border-radius:12px;padding:9px 10px;font-size:12px;font-weight:700;line-height:1.6}
    .lien-cancel-v362__feedback.success{border:1px solid #b9d9c0;background:#edf7ef;color:#315c3c}.lien-cancel-v362__feedback.error{background:#fff0ef;color:#973b34}
    @media (max-width:639px){.lien-cancel-v362__detail dl{grid-template-columns:68px minmax(0,1fr)}}
  `
  document.head.appendChild(style)

  const esc = value => String(value || '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]))

  function enhanceHome() {
    if (location.pathname !== '/u/home') return
    const section = document.querySelector('[data-customer-next-appointment-id]')
    if (!section || section.querySelector('[data-lien-cancel-home-link]')) return
    const appointmentId = section.getAttribute('data-customer-next-appointment-id')
    if (!appointmentId) return
    const link = document.createElement('a')
    link.dataset.lienCancelHomeLink = '1'
    link.className = 'lien-cancel-v362__home-link'
    link.href = `/u/appointments?detail=${encodeURIComponent(appointmentId)}#current-reservations`
    link.textContent = '予約の詳細を見る  ›'
    const target = section.querySelector('.min-w-0') || section.querySelector('div > div') || section
    target.appendChild(link)
  }

  function feedback(section, message, tone) {
    let node = section.querySelector('[data-lien-cancel-feedback]')
    if (!node) {
      node = document.createElement('p')
      node.dataset.lienCancelFeedback = '1'
      section.querySelector('h2')?.insertAdjacentElement('afterend', node)
    }
    node.className = `lien-cancel-v362__feedback ${tone}`
    node.textContent = message
  }

  function cardDetails(card) {
    const paragraphs = card.querySelectorAll(':scope > p')
    return {
      date: paragraphs[0]?.textContent?.trim() || '日時未設定',
      content: paragraphs[1]?.textContent?.trim() || 'メニュー未設定 / フリー',
    }
  }

  function enhanceAppointments() {
    if (location.pathname !== '/u/appointments') return
    const requestedId = new URLSearchParams(location.search).get('detail')
    document.querySelectorAll('[data-customer-appointment-id]').forEach(card => {
      if (card.dataset.lienCancelEnhanced === '1') return
      const appointmentId = card.getAttribute('data-customer-appointment-id')
      if (!appointmentId) return
      card.dataset.lienCancelEnhanced = '1'
      const section = card.closest('section')
      if (section && !section.id) section.id = 'current-reservations'
      const details = cardDetails(card)
      const parts = details.content.split('/').map(value => value.trim())
      const detailId = `lien-cancel-detail-${appointmentId}`
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'lien-cancel-v362__detail-button'
      button.setAttribute('aria-expanded', 'false')
      button.setAttribute('aria-controls', detailId)
      button.innerHTML = '<span>予約の詳細</span><span class="lien-cancel-v362__chevron" aria-hidden="true"></span>'
      const detail = document.createElement('div')
      detail.id = detailId
      detail.className = 'lien-cancel-v362__detail'
      detail.hidden = true
      detail.innerHTML = `
        <dl><dt>予約日時</dt><dd>${esc(details.date)}</dd><dt>メニュー</dt><dd>${esc(parts[0] || 'メニュー未設定')}</dd><dt>担当</dt><dd>${esc(parts[1] || 'フリー')}</dd></dl>
        <p class="lien-cancel-v362__warning">予約をキャンセルすると元に戻せません。内容をご確認のうえ操作してください。</p>
        <button type="button" class="lien-cancel-v362__cancel">予約をキャンセルする</button>
        <p class="lien-cancel-v362__feedback error" data-lien-cancel-card-error hidden></p>`
      button.addEventListener('click', () => {
        const expanded = button.getAttribute('aria-expanded') === 'true'
        button.setAttribute('aria-expanded', String(!expanded))
        detail.hidden = expanded
      })
      const cancelButton = detail.querySelector('.lien-cancel-v362__cancel')
      const errorNode = detail.querySelector('[data-lien-cancel-card-error]')
      cancelButton.addEventListener('click', async () => {
        if (!window.confirm(`${details.date}の予約をキャンセルしますか？`)) return
        cancelButton.disabled = true
        cancelButton.textContent = 'キャンセルしています…'
        errorNode.hidden = true
        try {
          const response = await fetch('/api/lien-customer-appointment-cancel', {
            method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ appointmentId })
          })
          const payload = await response.json().catch(() => ({}))
          if (!response.ok || !payload.success) throw new Error(payload.error || '予約をキャンセルできませんでした。')
          card.remove()
          if (section) feedback(section, '予約をキャンセルしました。店舗にも通知しました。', 'success')
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
    })
  }

  const boot = () => { enhanceHome(); enhanceAppointments() }
  boot()
  const observer = new MutationObserver(boot)
  observer.observe(document.documentElement, { childList: true, subtree: true })
})()
