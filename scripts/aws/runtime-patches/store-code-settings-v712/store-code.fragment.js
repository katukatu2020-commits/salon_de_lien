  async function ensureStoreCode() {
    if (location.pathname !== '/admin/settings' || new URLSearchParams(location.search).get('embedded') === '1') return
    const host = document.querySelector('#store-profile[data-ca-store-settings], [data-salon-settings-readonly-v689]')
    if (!host || host.querySelector('[data-store-code-v712]')) return
    const card = document.createElement('section')
    card.className = 'sm-store-code'
    card.dataset.storeCodeV712 = '1'
    card.setAttribute('aria-label', '店舗固有コード')
    card.innerHTML = `<span class="sm-symbol">${icon('store')}</span><div><h3>店舗固有コード</h3><code data-store-code-value>読み込み中...</code><p role="status" aria-live="polite" data-store-code-status></p></div><button type="button" class="sm-button" data-store-code-copy disabled aria-label="店舗固有コードをコピー" title="店舗固有コードをコピー">${icon('copy')}<span>コピー</span></button>`
    const header = host.querySelector(':scope > header')
    if (header) header.insertAdjacentElement('afterend', card)
    else host.prepend(card)
    const value = card.querySelector('[data-store-code-value]')
    const status = card.querySelector('[data-store-code-status]')
    const button = card.querySelector('[data-store-code-copy]')
    let code = '', failed = false
    async function loadCode() {
      failed = false
      button.disabled = true
      try {
        const profile = await storeProfile()
        if (!card.isConnected) return
        code = String(profile.storeCode || '').trim()
        value.textContent = code || '未発行'
        status.textContent = code ? '' : '店舗固有コードが未発行です。運営へお問い合わせください。'
        button.innerHTML = `${icon('copy')}<span>コピー</span>`
        button.setAttribute('aria-label', '店舗固有コードをコピー')
        button.title = '店舗固有コードをコピー'
        button.disabled = !code
      } catch {
        if (!card.isConnected) return
        failed = true
        value.textContent = '取得できませんでした'
        status.textContent = '通信状況をご確認ください。'
        button.textContent = '再取得'
        button.setAttribute('aria-label', '店舗固有コードを再取得')
        button.title = '店舗固有コードを再取得'
        button.disabled = false
      }
    }
    button.addEventListener('click', async () => {
      if (failed) { await loadCode(); return }
      if (!code) return
      try {
        await navigator.clipboard.writeText(code)
        status.textContent = 'コピーしました。'
      } catch {
        const range = document.createRange()
        range.selectNodeContents(value)
        const selection = window.getSelection()
        selection?.removeAllRanges()
        selection?.addRange(range)
        status.textContent = 'コピーできませんでした。選択されたコードをコピーしてください。'
      }
    })
    await loadCode()
  }
