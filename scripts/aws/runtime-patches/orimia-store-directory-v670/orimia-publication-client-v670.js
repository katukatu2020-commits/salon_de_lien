
;(() => {
  if (window.__orimiaPublicationSettingsV670) return
  window.__orimiaPublicationSettingsV670 = true

  const CARD_ID = 'orimia-publication-v670'
  const STYLE_ID = 'orimia-publication-style-v670'
  let loading = false
  let frame = 0

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = `
      #${CARD_ID}{display:flex;align-items:center;justify-content:space-between;gap:22px;margin:0 24px 18px;border:1px solid #e8ded2;border-radius:16px;background:#fff;padding:19px 20px;box-shadow:0 8px 22px rgba(62,44,37,.045);box-sizing:border-box}
      .orimia-publication-copy-v670{display:flex;min-width:0;align-items:flex-start;gap:14px}.orimia-publication-icon-v670{display:grid;width:42px;height:42px;flex:none;place-items:center;border-radius:11px;background:#edf7f1;color:#39775c}.orimia-publication-icon-v670 svg{width:21px;height:21px}.orimia-publication-copy-v670 h3{margin:0;color:#302824;font-size:16px;line-height:1.45;letter-spacing:0}.orimia-publication-copy-v670 p{margin:5px 0 0;color:#786b64;font-size:11px;line-height:1.7}.orimia-publication-control-v670{display:flex;flex:none;align-items:center;gap:12px}.orimia-publication-status-v670{color:#39775c;font-size:11px;font-weight:900;white-space:nowrap}.orimia-publication-status-v670.off{color:#81756e}.orimia-publication-switch-v670{position:relative;width:50px;height:30px;flex:none;border:0;border-radius:999px;background:#c9c3bf;padding:0;cursor:pointer;transition:background-color .16s ease}.orimia-publication-switch-v670::after{position:absolute;top:4px;left:4px;width:22px;height:22px;border-radius:50%;background:#fff;box-shadow:0 2px 7px rgba(42,32,28,.22);content:'';transition:transform .16s ease}.orimia-publication-switch-v670[aria-checked="true"]{background:#4f956e}.orimia-publication-switch-v670[aria-checked="true"]::after{transform:translateX(20px)}.orimia-publication-switch-v670:focus-visible{outline:3px solid rgba(79,149,110,.25);outline-offset:3px}.orimia-publication-switch-v670:disabled{cursor:wait;opacity:.55}.orimia-publication-feedback-v670{min-height:16px;margin:5px 0 0;color:#39775c;font-size:10px;font-weight:700}.orimia-publication-feedback-v670.error{color:#a43831}
      @media(max-width:680px){#${CARD_ID}{align-items:stretch;flex-direction:column;margin:0 14px 16px;padding:17px}.orimia-publication-control-v670{justify-content:space-between;border-top:1px solid #eee4de;padding-top:14px}.orimia-publication-copy-v670 p{font-size:10px}}
      @media(prefers-reduced-motion:reduce){.orimia-publication-switch-v670,.orimia-publication-switch-v670::after{transition:none}}
    `
    document.head.appendChild(style)
  }

  function icon() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/></svg>'
  }

  function applyState(card, published) {
    const button = card.querySelector('.orimia-publication-switch-v670')
    const status = card.querySelector('.orimia-publication-status-v670')
    button.setAttribute('aria-checked', String(published))
    button.setAttribute('aria-label', published ? 'ORIMIA上で非公開にする' : 'ORIMIA上で公開する')
    status.textContent = published ? '公開中' : '非公開'
    status.classList.toggle('off', !published)
  }

  function render(store, profile) {
    const published = profile.orimiaPublished !== false
    store.querySelector(`#${CARD_ID}`)?.remove()
    ensureStyle()
    const card = document.createElement('article')
    card.id = CARD_ID
    card.dataset.orimiaPublicationSettings = 'v670'
    card.innerHTML = `<div class="orimia-publication-copy-v670"><span class="orimia-publication-icon-v670">${icon()}</span><div><h3>ORIMIA店舗一覧への掲載</h3><p>公開中は、お客様アプリの「サロンを探す」に店舗名と所在地が表示されます。</p><div class="orimia-publication-feedback-v670" role="status" aria-live="polite"></div></div></div><div class="orimia-publication-control-v670"><span class="orimia-publication-status-v670"></span><button class="orimia-publication-switch-v670" type="button" role="switch"></button></div>`
    applyState(card, published)
    const button = card.querySelector('.orimia-publication-switch-v670')
    const feedback = card.querySelector('.orimia-publication-feedback-v670')
    if (!profile.canEdit) button.disabled = true
    button.addEventListener('click', async () => {
      const next = button.getAttribute('aria-checked') !== 'true'
      button.disabled = true
      feedback.className = 'orimia-publication-feedback-v670'
      feedback.textContent = '更新しています…'
      try {
        const response = await fetch('/api/admin/store-profile', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'update-orimia-publication', published: next }),
        })
        const payload = await response.json().catch(() => ({}))
        if (!response.ok || !payload.profile) throw new Error(payload.error || '公開設定を更新できませんでした。')
        applyState(card, payload.profile.orimiaPublished !== false)
        feedback.textContent = next ? 'ORIMIA上で公開しました。' : 'ORIMIA上で非公開にしました。'
      } catch (error) {
        feedback.className = 'orimia-publication-feedback-v670 error'
        feedback.textContent = error.message || '公開設定を更新できませんでした。'
      } finally {
        button.disabled = !profile.canEdit
      }
    })
    const hero = store.querySelector('.ca-setup-hero')
    if (hero) hero.insertAdjacentElement('afterend', card)
    else store.prepend(card)
  }

  async function install() {
    frame = 0
    if (location.pathname !== '/admin/settings' || new URLSearchParams(location.search).get('embedded') === '1') return
    const store = document.querySelector('#store-profile[data-ca-store-settings]')
    if (!store || store.querySelector(`#${CARD_ID}`) || loading) return
    loading = true
    try {
      const response = await fetch('/api/admin/store-profile', { credentials: 'same-origin', headers: { Accept: 'application/json' }, cache: 'no-store' })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || !payload.profile) throw new Error(payload.error || '店舗情報を読み込めませんでした。')
      if (store.isConnected) render(store, payload.profile)
    } catch (error) {
      console.error('[orimia-publication-v670]', error)
    } finally {
      loading = false
    }
  }

  function schedule() {
    if (frame) return
    frame = requestAnimationFrame(install)
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', schedule, { once: true })
  else schedule()
  new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true })
  window.addEventListener('popstate', schedule)
})()
