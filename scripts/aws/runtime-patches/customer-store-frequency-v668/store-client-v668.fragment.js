  function initStorePage() {
    if (location.pathname !== '/u/stores' || document.documentElement.dataset.lienStoresV668) return
    const form = document.querySelector('#register-store-form')
    const input = document.querySelector('#store-code')
    const output = document.querySelector('#store-result')
    const preview = document.querySelector('#store-preview')
    if (!form || !input || !output || !preview) return
    document.documentElement.dataset.lienStoresV668 = '1'

    const lookup = async codeValue => {
      const code = parsedStoreCode(codeValue)
      input.value = code
      output.textContent = '店舗情報を確認しています…'
      preview.innerHTML = ''
      try {
        const result = await requestJson(`/api/lien-customer-stores?lookup=${encodeURIComponent(code)}`)
        const store = result.store
        const canLink = result.canLink !== false
        output.textContent = canLink ? '' : 'この店舗は現在登録できません。'
        preview.innerHTML = `<article class="lien-store-preview"><div class="lien-store-preview-head"><img src="${escapeHtml(store.iconUrl)}" alt=""><div><strong>${escapeHtml(store.name)}</strong><p>${escapeHtml(store.publicCode)}</p></div></div><button class="lien-v293-button" type="button" ${store.alreadyLinked || !canLink ? 'disabled' : ''}>${store.alreadyLinked ? '登録済みです' : canLink ? 'この店舗を追加する' : '現在登録できません'}</button></article>`
        if (!store.alreadyLinked && canLink) preview.querySelector('button').addEventListener('click', async () => {
          const button = preview.querySelector('button')
          button.disabled = true
          output.textContent = '店舗を追加しています…'
          try {
            const saved = await requestJson('/api/lien-customer-stores', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'link', storeCode: store.publicCode, confirmed: true }) })
            toast(saved.alreadyLinked ? 'この店舗は登録済みです。' : '店舗を登録しました。')
            if (saved.redirect) location.assign(saved.redirect)
            else location.reload()
          } catch (error) { button.disabled = false; output.textContent = error.message }
        })
      } catch (error) { output.textContent = error.message }
    }
    form.addEventListener('submit', event => { event.preventDefault(); lookup(input.value) })
    document.querySelector('#scan-store-qr')?.addEventListener('click', () => openQrScanner(code => lookup(code)))
    document.querySelectorAll('[data-switch-store]').forEach(button => button.addEventListener('click', async () => {
      button.disabled = true
      try {
        const result = await requestJson('/api/lien-customer-stores', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'switch', organizationId: button.dataset.switchStore }) })
        location.assign(result.redirect || '/u/home')
      } catch (error) { button.disabled = false; output.textContent = error.message }
    }))
    document.querySelectorAll('[data-remove-store]').forEach(button => button.addEventListener('click', async () => {
      const storeName = button.dataset.storeName || 'この店舗'
      const finalStoreNote = button.dataset.lastStore === 'true'
        ? '\n解除後は、新しい店舗を登録するまで店舗機能を利用できません。'
        : ''
      if (!window.confirm(`${storeName}の登録を解除しますか？\n来店履歴など店舗側の顧客データは削除されません。${finalStoreNote}`)) return
      button.disabled = true
      try {
        const result = await requestJson('/api/lien-customer-stores', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'unlink', organizationId: button.dataset.removeStore }) })
        toast(`${storeName}の登録を解除しました。`)
        if (result.redirect) location.assign(result.redirect)
        else location.reload()
      } catch (error) { button.disabled = false; output.textContent = error.message }
    }))
    if (input.value) lookup(input.value)
  }
