;(() => {
  if (window.__salonGroupMasterV672) return
  window.__salonGroupMasterV672 = true
  const API = '/api/admin/salon-master'
  async function request(path, body) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 45000)
    try {
      const response = await fetch(API + path, { signal: controller.signal, credentials: 'same-origin', cache: 'no-store', headers: { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { method: 'POST', body: JSON.stringify(body) } : {}) })
      const value = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(value.error || '通信に失敗しました。再度お試しください。')
      return value
    } catch (error) {
      if (error.name === 'AbortError') throw new Error('通信に時間がかかっています。再度お試しください。')
      throw error
    } finally { clearTimeout(timer) }
  }
  // This settings link installs once per mounted settings section, without replacing any inputs.
  if (location.pathname === '/admin/settings') {
    let allowed, loading = false, scheduled = false, failed = false
    async function install() {
      scheduled = false
      const store = document.querySelector('#store-profile[data-ca-store-settings]')
      if (!store || store.querySelector('[data-salon-master-link]') || loading || failed || allowed === false) return
      if (allowed == null) {
        loading = true
        try { allowed = (await request('/access')).canAccess === true } catch { failed = true } finally { loading = false }
      }
      if (!allowed || !store.isConnected) return
      const band = document.createElement('div')
      band.dataset.salonMasterLink = 'v672'
      band.className = 'sg-settings-link'
      const title = document.createElement('strong'); title.textContent = '系列店マスタ'
      const anchor = document.createElement('a'); anchor.href = '/admin/salon-master'; anchor.textContent = 'マスタを開く'; anchor.className = 'sg-button'
      band.append(title, anchor)
      const header = store.querySelector('.ca-setup-hero')
      if (header) header.insertAdjacentElement('afterend', band)
      else store.prepend(band)
    }
    function schedule() { if (!scheduled) { scheduled = true; requestAnimationFrame(install) } }
    new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true })
    schedule()
    return
  }
  if (location.pathname !== '/admin/salon-master') return
  let busy = false
  document.querySelectorAll('[data-open]').forEach(button => button.addEventListener('click', () => document.getElementById(button.dataset.open).showModal()))
  document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => { if (!busy) button.closest('dialog').close() }))
  document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('cancel', event => { if (busy) event.preventDefault() }))
  document.querySelectorAll('[data-store-filter]').forEach(button => button.addEventListener('click', () => {
    const form = document.getElementById('sg-filter'); form.elements.store.value = button.dataset.storeFilter; form.requestSubmit()
  }))
  const create = document.getElementById('sg-create-form')
  if (!create) return
  let requestKey = crypto.randomUUID()
  function state(form, pending) {
    busy = pending
    form.querySelectorAll('button').forEach(button => { button.disabled = pending })
    form.setAttribute('aria-busy', String(pending))
  }
  create.addEventListener('submit', async event => {
    event.preventDefault()
    if (busy || !create.reportValidity()) return
    const body = Object.fromEntries(new FormData(create))
    body.confirmed = create.elements.confirmed.checked
    body.requestKey = requestKey
    const feedback = create.querySelector('.sg-feedback')
    feedback.textContent = '登録しています…'
    state(create, true)
    try {
      const result = await request('/stores', body)
      const section = document.getElementById('sg-created')
      section.replaceChildren()
      const title = document.createElement('h2'); title.textContent = result.alreadyCreated ? '登録済みの店舗です' : '新店舗を登録しました'
      const message = document.createElement('p'); message.textContent = result.alreadyCreated ? '同じ操作による重複登録は行っていません。' : result.emailSent ? '初期情報を連絡先メールへ送信しました。' : 'メールを送信できませんでした。下の初期情報を店舗管理者にお伝えください。'
      section.append(title, message)
      for (const [label, value] of [['店舗名', result.name], ['ログインID', result.loginId], ['初期パスワード', result.initialPassword]]) {
        if (!value) continue
        const row = document.createElement('label'); row.className = 'sg-field'
        const caption = document.createElement('span'); caption.textContent = label
        const input = document.createElement('input'); input.readOnly = true; input.value = value; input.setAttribute('aria-label', label)
        row.append(caption, input); section.append(row)
      }
      const note = document.createElement('p'); note.textContent = '系列店マスタは登録元の管理者アカウントから利用できます。新店舗の初回ログイン時にはパスワード変更が必要です。'
      const done = document.createElement('a'); done.className = 'sg-button primary'; done.href = '/admin/salon-master'; done.textContent = '店舗一覧へ戻る'
      section.append(note, done)
      create.hidden = true; section.hidden = false; title.tabIndex = -1; title.focus()
      requestKey = crypto.randomUUID()
    } catch (error) { feedback.textContent = error.message } finally { state(create, false) }
  })
  const link = document.getElementById('sg-link-form')
  link.addEventListener('submit', async event => {
    event.preventDefault()
    if (busy || !link.reportValidity()) return
    const feedback = link.querySelector('.sg-feedback'); feedback.textContent = '認証しています…'
    state(link, true)
    try {
      await request('/link', Object.fromEntries(new FormData(link)))
      link.elements.password.value = ''
      location.assign('/admin/salon-master')
    } catch (error) { feedback.textContent = error.message; state(link, false) }
  })
})()
