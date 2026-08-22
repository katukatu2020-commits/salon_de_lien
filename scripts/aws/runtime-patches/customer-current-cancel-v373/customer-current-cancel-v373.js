;(() => {
  if (window.__lienCustomerCurrentCancelV373) return
  window.__lienCustomerCurrentCancelV373 = true

  const style = document.createElement('style')
  style.textContent = `
    [data-customer-appointment-id].lien-current-cancel-v373__card{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:12px}
    .lien-current-cancel-v373__content{min-width:0}
    .lien-current-cancel-v373__button{display:inline-flex;min-height:40px;align-items:center;justify-content:center;white-space:nowrap;border:1px solid #d87a72;border-radius:999px;background:#fff;padding:0 16px;color:#a9443c;font:inherit;font-size:12px;font-weight:700;cursor:pointer;transition:background-color .18s ease,border-color .18s ease,box-shadow .18s ease,transform .18s ease}
    .lien-current-cancel-v373__button:hover{border-color:#c45d55;background:#fff7f5;box-shadow:0 7px 18px rgba(143,79,66,.12);transform:translateY(-1px)}
    .lien-current-cancel-v373__button:focus-visible,.lien-current-cancel-v373__dialog button:focus-visible{outline:3px solid rgba(207,102,126,.25);outline-offset:2px}
    .lien-current-cancel-v373__backdrop{position:fixed;inset:0;z-index:10000;display:grid;place-items:center;background:rgba(48,39,35,.38);padding:20px;backdrop-filter:blur(3px)}
    .lien-current-cancel-v373__dialog{width:min(100%,440px);border:1px solid #ead8d1;border-radius:24px;background:#fffdfa;padding:24px;box-shadow:0 24px 70px rgba(60,43,36,.22);color:#302824}
    .lien-current-cancel-v373__eyebrow{margin:0 0 6px;color:#bd5369;font-size:11px;font-weight:700;letter-spacing:.08em}
    .lien-current-cancel-v373__title{margin:0;font-family:inherit;font-size:21px;font-weight:700;line-height:1.45}
    .lien-current-cancel-v373__description{margin:9px 0 0;color:#74675f;font-size:13px;line-height:1.75}
    .lien-current-cancel-v373__summary{margin:18px 0 0;border:1px solid #eadfd6;border-radius:16px;background:#f8f2eb;padding:14px 16px}
    .lien-current-cancel-v373__summary p{margin:0;color:#4d413b;font-size:13px;line-height:1.7}
    .lien-current-cancel-v373__summary p+p{margin-top:2px;color:#7b6f67;font-size:12px}
    .lien-current-cancel-v373__actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:20px}
    .lien-current-cancel-v373__actions button{min-height:44px;border-radius:999px;padding:0 14px;font:inherit;font-size:13px;font-weight:700;cursor:pointer}
    .lien-current-cancel-v373__close{border:1px solid #d9cbc1;background:#fff;color:#5f514a}
    .lien-current-cancel-v373__confirm{border:1px solid #b94d45;background:#b94d45;color:#fff;box-shadow:0 8px 20px rgba(185,77,69,.18)}
    .lien-current-cancel-v373__confirm:disabled{cursor:wait;opacity:.55}
    .lien-current-cancel-v373__error{margin:12px 0 0;border:1px solid #efcbc6;border-radius:12px;background:#fff0ef;padding:10px 12px;color:#973b34;font-size:12px;font-weight:700;line-height:1.6}
    .lien-current-cancel-v373__feedback{margin:10px 0 0;border:1px solid #b9d9c0;border-radius:12px;background:#edf7ef;padding:10px 12px;color:#315c3c;font-size:12px;font-weight:700;line-height:1.6}
    @media(max-width:639px){[data-customer-appointment-id].lien-current-cancel-v373__card{grid-template-columns:1fr}.lien-current-cancel-v373__button{width:100%}.lien-current-cancel-v373__dialog{padding:20px}.lien-current-cancel-v373__actions{grid-template-columns:1fr}}
  `
  document.head.appendChild(style)

  const detailsFor = card => {
    const paragraphs = card.querySelectorAll(':scope > p, :scope > .lien-current-cancel-v373__content > p')
    const date = paragraphs[0]?.textContent?.trim() || '日時未設定'
    const content = paragraphs[1]?.textContent?.trim() || 'メニュー未設定 / フリー'
    return { date, content }
  }

  function showFeedback(section, message) {
    let node = section?.querySelector('[data-lien-current-cancel-feedback]')
    if (!node && section) {
      node = document.createElement('p')
      node.dataset.lienCurrentCancelFeedback = '1'
      node.className = 'lien-current-cancel-v373__feedback'
      section.querySelector('h2')?.insertAdjacentElement('afterend', node)
    }
    if (node) node.textContent = message
  }

  function openDialog(card, appointmentId) {
    document.querySelector('[data-lien-current-cancel-dialog]')?.remove()
    const details = detailsFor(card)
    const backdrop = document.createElement('div')
    backdrop.className = 'lien-current-cancel-v373__backdrop'
    backdrop.dataset.lienCurrentCancelDialog = '1'
    backdrop.innerHTML = `
      <div class="lien-current-cancel-v373__dialog" role="dialog" aria-modal="true" aria-labelledby="lien-current-cancel-title">
        <p class="lien-current-cancel-v373__eyebrow">RESERVATION CANCELLATION</p>
        <h2 class="lien-current-cancel-v373__title" id="lien-current-cancel-title">予約をキャンセルしますか？</h2>
        <p class="lien-current-cancel-v373__description">キャンセル後は元に戻せません。店舗にもキャンセル通知が届きます。</p>
        <div class="lien-current-cancel-v373__summary"><p></p><p></p></div>
        <p class="lien-current-cancel-v373__error" data-lien-current-cancel-error hidden></p>
        <div class="lien-current-cancel-v373__actions">
          <button type="button" class="lien-current-cancel-v373__close">戻る</button>
          <button type="button" class="lien-current-cancel-v373__confirm">予約をキャンセル</button>
        </div>
      </div>`
    const summary = backdrop.querySelectorAll('.lien-current-cancel-v373__summary p')
    summary[0].textContent = details.date
    summary[1].textContent = details.content
    const closeButton = backdrop.querySelector('.lien-current-cancel-v373__close')
    const confirmButton = backdrop.querySelector('.lien-current-cancel-v373__confirm')
    const errorNode = backdrop.querySelector('[data-lien-current-cancel-error]')
    const close = () => backdrop.remove()
    closeButton.addEventListener('click', close)
    backdrop.addEventListener('click', event => { if (event.target === backdrop) close() })
    backdrop.addEventListener('keydown', event => { if (event.key === 'Escape') close() })
    confirmButton.addEventListener('click', async () => {
      confirmButton.disabled = true
      confirmButton.textContent = 'キャンセルしています…'
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
        const section = card.closest('section')
        card.remove()
        close()
        showFeedback(section, '予約をキャンセルしました。店舗にも通知しました。')
      } catch (error) {
        errorNode.textContent = error instanceof Error ? error.message : '予約をキャンセルできませんでした。'
        errorNode.hidden = false
        confirmButton.disabled = false
        confirmButton.textContent = '予約をキャンセル'
      }
    })
    document.body.appendChild(backdrop)
    closeButton.focus()
  }

  function enhanceCard(card) {
    if (card.dataset.lienCurrentCancelV373 === '1') return
    const appointmentId = card.getAttribute('data-customer-appointment-id')
    if (!appointmentId) return
    card.dataset.lienCurrentCancelV373 = '1'
    card.dataset.lienCancelEnhanced = '1'
    card.classList.add('lien-current-cancel-v373__card')
    card.querySelectorAll('[class*="lien-cancel-v"], [data-lien-cancel-card-error]').forEach(node => node.remove())

    const content = document.createElement('div')
    content.className = 'lien-current-cancel-v373__content'
    Array.from(card.children).filter(node => node.tagName === 'P').forEach(node => content.appendChild(node))
    card.prepend(content)

    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'lien-current-cancel-v373__button'
    button.textContent = '予約をキャンセル'
    button.addEventListener('click', () => openDialog(card, appointmentId))
    card.appendChild(button)
  }

  function enhanceAppointments() {
    if (location.pathname !== '/u/appointments') return
    document.querySelectorAll('[data-customer-appointment-id]').forEach(enhanceCard)
  }

  enhanceAppointments()
  new MutationObserver(enhanceAppointments).observe(document.documentElement, { childList: true, subtree: true })
  window.addEventListener('popstate', enhanceAppointments)
})()
