  function initStorePage() {
    if (location.pathname !== '/u/stores' || document.documentElement.dataset.lienStoresV642) return
    const form = document.querySelector('#register-store-form')
    const input = document.querySelector('#store-code')
    const output = document.querySelector('#store-result')
    const preview = document.querySelector('#store-preview')
    if (!form || !input || !output || !preview) return
    document.documentElement.dataset.lienStoresV642 = '1'
    const limit = Number(form.dataset.storeLimit || 5)
    const initialCount = Number(form.dataset.storeCount || 0)
    const limitMessage = `登録できる美容室は最大${limit}店舗です。新しい店舗を追加するには、登録済みの店舗を1件解除してください。`

    const lookup = async codeValue => {
      if (initialCount >= limit) { output.textContent = limitMessage; return }
      const code = parsedStoreCode(codeValue)
      input.value = code
      output.textContent = '店舗情報を確認しています…'
      preview.innerHTML = ''
      try {
        const result = await requestJson(`/api/lien-customer-stores?lookup=${encodeURIComponent(code)}`)
        const store = result.store
        const canLink = store.alreadyLinked || result.canLink !== false
        output.textContent = canLink ? '' : limitMessage
        preview.innerHTML = `<article class="lien-store-preview"><div class="lien-store-preview-head"><img src="${escapeHtml(store.iconUrl)}" alt=""><div><strong>${escapeHtml(store.name)}</strong><p>${escapeHtml(store.publicCode)}</p></div></div><button class="lien-v293-button" type="button" ${store.alreadyLinked || !canLink ? 'disabled' : ''}>${store.alreadyLinked ? '登録済みです' : canLink ? 'この店舗を追加する' : '登録上限です'}</button></article>`
        if (!store.alreadyLinked && canLink) preview.querySelector('button').addEventListener('click', async () => {
          const button = preview.querySelector('button')
          button.disabled = true
          output.textContent = '店舗を追加しています…'
          try {
            const saved = await requestJson('/api/lien-customer-stores', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'link', storeCode: store.publicCode, confirmed: true }) })
            toast(saved.alreadyLinked ? 'この店舗は登録済みです。' : '店舗を登録しました。')
            location.reload()
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
      if (!window.confirm(`${storeName}の登録を解除しますか？\n来店履歴など店舗側の顧客データは削除されません。`)) return
      button.disabled = true
      try {
        const result = await requestJson('/api/lien-customer-stores', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'unlink', organizationId: button.dataset.removeStore }) })
        toast(`${storeName}の登録を解除しました。`)
        if (result.switched) location.assign(result.redirect || '/u/home')
        else location.reload()
      } catch (error) { button.disabled = false; output.textContent = error.message }
    }))
    if (input.value && initialCount < limit) lookup(input.value)
  }
