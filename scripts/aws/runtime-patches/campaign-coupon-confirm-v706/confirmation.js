;(() => {
  if (window.__broadcastConfirmV706) return
  window.__broadcastConfirmV706 = true
  let busy = false
  const permitted = new WeakSet()
  const eligible = form => location.pathname === '/admin/customers/messages' && form instanceof HTMLFormElement && form.elements.namedItem('couponEnabled') && form.elements.namedItem('title') && form.elements.namedItem('body')
  const escape = value => String(value || '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]))
  async function preview(entries, token) {
    const response = await fetch('/api/admin/broadcast-preview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ entries, token }), cache: 'no-store' })
    const result = await response.json()
    if (!response.ok) throw new Error(result.error || '配信対象を確認できませんでした。')
    return result
  }
  async function open(form, submitter) {
    if (busy || !form.reportValidity()) return
    busy = true
    const previous = document.activeElement, dialog = document.createElement('dialog')
    dialog.className = 'broadcast-confirm-v706'
    dialog.setAttribute('aria-labelledby', 'broadcast-confirm-title-v706')
    dialog.innerHTML = '<header><h2 id="broadcast-confirm-title-v706">配信の最終確認</h2><button type="button" class="bc-close" aria-label="閉じる">×</button></header><div class="bc-content" aria-live="polite">配信対象を確認しています…</div><footer><button type="button" data-cancel>戻る</button><button type="button" data-send disabled>確認して配信する</button></footer>'
    document.body.appendChild(dialog)
    let sending = false
    const close = () => { if (sending) return; dialog.close(); dialog.remove(); busy = false; previous?.focus() }
    dialog.addEventListener('cancel', event => { event.preventDefault(); close() })
    dialog.querySelector('.bc-close').addEventListener('click', close)
    dialog.querySelector('[data-cancel]').addEventListener('click', close)
    dialog.showModal()
    const content = dialog.querySelector('.bc-content'), send = dialog.querySelector('[data-send]')
    const entries = [...new FormData(form)].filter(([key, value]) => typeof value === 'string' && !key.startsWith('$ACTION') && key !== 'broadcastConfirmationV706')
    const values = new URLSearchParams(entries)
    try {
      const result = await preview(entries)
      if (!dialog.isConnected) return
      const coupon = values.get('couponEnabled')
      content.innerHTML = '<div class="bc-summary"><strong>' + escape(values.get('title')) + '</strong><p>' + escape(values.get('body')) + '</p>' + (coupon ? '<p class="bc-coupon">' + escape(values.get('couponTitle') || 'クーポン') + ' / ' + escape(values.get('couponTargetMenu')) + ' / ' + escape(values.get('couponDiscountRate')) + '%OFF / ' + escape(values.get('couponValidDays')) + '日間</p>' : '') + '</div><h3>' + (result.method === 'email' ? 'メール' : 'アプリ') + '配信先 <strong>' + result.recipients.length + '名</strong></h3>' + (result.skipped.length ? '<p class="bc-warning">メールアドレス未登録の' + result.skipped.length + '名は配信対象外です。</p>' : '') + '<div class="bc-list" tabindex="0"><table><thead><tr><th scope="col">お客様</th><th scope="col">' + (result.method === 'email' ? 'メールアドレス' : '電話番号（下4桁）') + '</th></tr></thead><tbody>' + result.recipients.map(row => '<tr><td>' + escape(row.name) + '</td><td>' + escape(result.method === 'email' ? row.email : row.phone ? '…' + row.phone : '未登録') + '</td></tr>').join('') + '</tbody></table></div><p class="bc-error" role="alert"></p>'
      const error = content.querySelector('.bc-error')
      send.disabled = !result.recipients.length
      if (!result.recipients.length) error.textContent = '配信対象のお客様がいません。条件を変更してください。'
      send.addEventListener('click', async () => {
        if (send.disabled) return
        send.disabled = true; send.textContent = '配信対象を再確認中…'
        try {
          const current = [...new FormData(form)].filter(([key, value]) => typeof value === 'string' && !key.startsWith('$ACTION') && key !== 'broadcastConfirmationV706')
          if (JSON.stringify(current) !== JSON.stringify(entries)) throw new Error('入力内容が変更されました。戻って再確認してください。')
          await preview(current, result.token)
          if (!dialog.isConnected) return
          let field = form.querySelector('[name="broadcastConfirmationV706"]')
          if (!field) { field = document.createElement('input'); field.type = 'hidden'; field.name = 'broadcastConfirmationV706'; form.appendChild(field) }
          field.value = result.token
          permitted.add(form)
          sending = true
          form.requestSubmit(submitter)
          // Keep the form locked until the existing Server Action navigates away.
          dialog.querySelectorAll('button').forEach(button => { button.disabled = true })
          dialog.addEventListener('cancel', event => event.preventDefault())
          send.textContent = '配信中…'
        } catch (failure) {
          sending = false
          permitted.delete(form)
          error.textContent = failure.message
          send.textContent = '確認して配信する'
        }
      })
    } catch (error) {
      if (dialog.isConnected) content.textContent = error.message
    }
  }
  document.addEventListener('click', event => {
    const button = event.target.closest?.('button, input[type="submit"]')
    if (!button || button.type !== 'submit' || !eligible(button.form)) return
    if (!button.textContent.includes('対象顧客へ配信する')) { event.preventDefault(); return }
    event.preventDefault(); event.stopImmediatePropagation(); open(button.form, button)
  }, true)
  document.addEventListener('submit', event => {
    if (!eligible(event.target)) return
    if (event.submitter && !event.submitter.textContent.includes('対象顧客へ配信する')) { event.preventDefault(); return }
    if (permitted.has(event.target)) { permitted.delete(event.target); return }
    event.preventDefault(); event.stopImmediatePropagation(); open(event.target, event.submitter || undefined)
  }, true)
})()
