(() => {
  'use strict'
  if (window.__lienAdminStaffExperienceV276) return
  window.__lienAdminStaffExperienceV276 = true

  const state = { store: null, directory: null, ownProfile: null, timer: 0 }
  const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character])
  const icon = name => {
    const paths = {
      users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
      plus: '<path d="M12 5v14M5 12h14"/>',
      edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/>',
      trash: '<path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13"/>',
      camera: '<path d="M14.5 4 16 7h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h3l1.5-3Z"/><circle cx="12" cy="13" r="3"/>',
      store: '<path d="M3 10h18m-16 0 1-5h12l1 5M5 10v9h14v-9M9 19v-5h6v5"/>',
      copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
      close: '<path d="m6 6 12 12M18 6 6 18"/>',
      chevronRight: '<path d="m9 18 6-6-6-6"/>',
      check: '<path d="m5 12 4 4L19 6"/>',
    }
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.users}</svg>`
  }

  const style = document.createElement('style')
  style.id = 'admin-staff-experience-v276-styles'
  style.textContent = `
    .sm-store-code{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:14px;margin-top:18px;border:1px solid var(--ca-line,#e8ded2);border-radius:20px;background:#fff;padding:18px 20px;box-shadow:0 9px 25px rgba(69,43,34,.06)}.sm-store-code .sm-symbol{display:grid;width:44px;height:44px;place-items:center;border-radius:14px;background:#f8e8e3;color:#9d5546}.sm-store-code svg{width:20px;height:20px}.sm-store-code h3{margin:0;color:#342821;font-size:14px}.sm-store-code p{margin:5px 0 0;color:#806f68;font-size:10px;line-height:1.6}.sm-store-code code{display:inline-block;margin-top:8px;border:1px solid #dfcec6;border-radius:10px;background:#fffaf7;padding:8px 11px;color:#6f3d34;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:13px;font-weight:800;letter-spacing:.06em}.sm-icon-button,.sm-button{display:inline-flex;min-height:42px;align-items:center;justify-content:center;gap:7px;border:1px solid #e3d4cd;border-radius:999px;background:#fff;padding:0 15px;color:#5f4840;font:inherit;font-size:11px;font-weight:800;cursor:pointer}.sm-button.primary{border-color:#9d5546;background:#9d5546;color:#fff}.sm-button.danger{border-color:#efcbc7;color:#a43d38}.sm-button:disabled{cursor:not-allowed;opacity:.55}.sm-button svg,.sm-icon-button svg{width:16px;height:16px}.sm-page{width:min(1180px,calc(100% - 32px));margin:0 auto;padding:24px 0 48px}.sm-page-head{display:flex;align-items:flex-end;justify-content:space-between;gap:18px;margin-bottom:20px}.sm-page-head small{color:#9d5546;font-size:10px;font-weight:900}.sm-page-head h1{margin:5px 0 0;color:#2f2a25;font-size:26px}.sm-page-head p{margin:8px 0 0;color:#7c7168;font-size:12px}.sm-list{display:grid;gap:11px}.sm-staff-card{display:grid;grid-template-columns:64px minmax(180px,1.25fr) minmax(180px,1fr) minmax(140px,.7fr) auto;align-items:center;gap:15px;border:1px solid #e8ded2;border-radius:20px;background:#fff;padding:15px 17px;box-shadow:0 7px 22px rgba(70,48,40,.055)}.sm-staff-card.is-inactive{background:#faf8f6;opacity:.72}.sm-avatar{display:grid;width:56px;height:56px;place-items:center;overflow:hidden;border:1px solid #ead8d1;border-radius:50%;background:#f6e7e1;color:#7f493e;font-size:19px;font-weight:800}.sm-avatar img{width:100%;height:100%;object-fit:cover}.sm-staff-card h2{margin:0;color:#342a25;font-size:14px}.sm-staff-card p{margin:4px 0 0;color:#806f68;font-size:10px;line-height:1.55}.sm-badges{display:flex;flex-wrap:wrap;gap:6px}.sm-badge{display:inline-flex;min-height:26px;align-items:center;border-radius:999px;background:#edf7ef;padding:0 9px;color:#356143;font-size:9px;font-weight:800}.sm-badge.leave{background:#fff2df;color:#8a5b19}.sm-badge.off{background:#f1edeb;color:#71655f}.sm-actions{display:flex;justify-content:flex-end;gap:7px}.sm-empty{border:1px dashed #ddcec6;border-radius:20px;background:#fffaf7;padding:45px;text-align:center;color:#806f68}.sm-account-card{margin-top:18px;border:1px solid #e8ded2;border-radius:22px;background:#fff;padding:20px;box-shadow:0 10px 28px rgba(70,48,40,.06)}.sm-account-head{display:flex;align-items:center;gap:15px}.sm-account-head h2{margin:0;font-size:16px}.sm-account-head p{margin:5px 0 0;color:#7c7168;font-size:10px}.sm-profile-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px;margin-top:17px}.sm-field{display:grid;gap:6px}.sm-field.wide{grid-column:1/-1}.sm-field label{color:#4d3e37;font-size:10px;font-weight:800}.sm-field :is(input,textarea){width:100%;min-height:44px;border:1px solid #e0d2ca;border-radius:12px;background:#fffdfb;padding:10px 12px;color:#2f2a25;font:inherit;font-size:11px;outline:none}.sm-field textarea{min-height:88px;resize:vertical}.sm-field :is(input,textarea):focus{border-color:#a66051;box-shadow:0 0 0 4px rgba(233,201,190,.4)}.sm-avatar-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}.sm-feedback{min-height:18px;margin:9px 0 0;color:#356143;font-size:10px}.sm-overlay{position:fixed;z-index:110000;inset:0;display:grid;place-items:center;padding:18px;background:rgba(38,26,22,.55);backdrop-filter:blur(6px)}.sm-dialog{width:min(680px,100%);max-height:calc(100dvh - 32px);overflow:auto;border:1px solid #ead8d1;border-radius:24px;background:#fffdfb;box-shadow:0 28px 85px rgba(36,24,20,.32)}.sm-dialog-head{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;border-bottom:1px solid #eadfd8;padding:20px 22px}.sm-dialog-head h2{margin:0;font-size:19px}.sm-dialog-head p{margin:5px 0 0;color:#7c7168;font-size:10px}.sm-dialog-body{padding:20px 22px}.sm-dialog-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.sm-check{display:flex;min-height:44px;align-items:center;gap:9px;border:1px solid #e2d5ce;border-radius:12px;background:#fff;padding:10px 12px;font-size:11px;font-weight:700}.sm-check input{width:17px;height:17px;accent-color:#9d5546}.sm-days-off{margin:12px 0 0;border:1px solid #e5d7d0;border-radius:16px;background:#fffaf7;padding:14px}.sm-days-off legend{padding:0 7px;color:#4d3e37;font-size:11px;font-weight:900}.sm-days-off p{margin:0 0 10px;color:#806f68;font-size:10px;line-height:1.6}.sm-weekday-list{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:7px}.sm-weekday{display:grid;min-height:45px;place-items:center;border:1px solid #e4d5ce;border-radius:12px;background:#fff;color:#67544c;font-size:11px;font-weight:900;cursor:pointer}.sm-weekday:has(input:checked){border-color:#a65a4b;background:#a65a4b;color:#fff;box-shadow:0 5px 14px rgba(118,61,49,.18)}.sm-weekday input{position:absolute;width:1px;height:1px;opacity:0}.sm-days-summary{color:#9b5a4d!important;font-weight:800}@media(max-width:600px){.sm-weekday-list{grid-template-columns:repeat(4,minmax(0,1fr))}}.sm-dialog-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:18px}.sm-toast{position:fixed;z-index:120000;right:18px;top:76px;max-width:min(380px,calc(100vw - 32px));border:1px solid #bad9c6;border-radius:15px;background:#f1faf4;padding:12px 16px;color:#356143;font-size:11px;font-weight:800;box-shadow:0 16px 50px rgba(38,28,23,.2)}.sm-current-avatar{width:28px;height:28px;flex:0 0 28px;border-radius:50%;object-fit:cover;border:1px solid #e2d1ca}.sm-staff-route main>*:not(.sm-page){display:none!important}
    @media(max-width:900px){.sm-staff-card{grid-template-columns:56px minmax(0,1fr) auto}.sm-staff-meta,.sm-staff-status{grid-column:2}.sm-actions{grid-column:3;grid-row:1/4;flex-direction:column}.sm-page{width:min(100% - 24px,900px)}}
    @media(max-width:620px){.sm-page-head{align-items:stretch;flex-direction:column}.sm-page-head .sm-button{width:100%}.sm-staff-card{grid-template-columns:48px minmax(0,1fr);padding:14px}.sm-avatar{width:46px;height:46px}.sm-staff-meta,.sm-staff-status,.sm-actions{grid-column:1/-1}.sm-actions{grid-row:auto;flex-direction:row;justify-content:stretch}.sm-actions .sm-button{flex:1}.sm-profile-form,.sm-dialog-grid{grid-template-columns:1fr}.sm-field.wide{grid-column:auto}.sm-store-code{grid-template-columns:44px minmax(0,1fr)}.sm-store-code .sm-button{grid-column:1/-1;width:100%}}
    .sm-history-pager{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:8px;margin-top:18px}.sm-history-pager a,.sm-history-pager span{display:inline-flex;min-width:42px;min-height:42px;align-items:center;justify-content:center;border:1px solid var(--lien-border,#e8ded2);border-radius:999px;background:#fff;padding:0 13px;color:var(--lien-ink,#2f2a25);font-size:12px;font-weight:800;text-decoration:none}.sm-history-pager a:hover{background:var(--lien-surface-soft,#f6efe6)}.sm-history-pager [aria-current="page"]{border-color:var(--lien-primary,#8f4f42);background:var(--lien-primary,#8f4f42);color:#fff}.sm-history-pager .disabled{opacity:.42}.sm-history-summary{text-align:center;color:var(--lien-muted,#7c7168);font-size:11px}
    html[data-ca-theme="dark"] .sm-store-code,html[data-ca-theme="dark"] .sm-staff-card,html[data-ca-theme="dark"] .sm-account-card,html[data-ca-theme="dark"] .sm-dialog{border-color:#483a34;background:#211b18;color:#f4ece7}html[data-ca-theme="dark"] .sm-page-head h1,html[data-ca-theme="dark"] .sm-staff-card h2,html[data-ca-theme="dark"] .sm-account-head h2,html[data-ca-theme="dark"] .sm-dialog h2{color:#f4ece7}html[data-ca-theme="dark"] .sm-field :is(input,textarea),html[data-ca-theme="dark"] .sm-check{border-color:#53433c;background:#191513;color:#f4ece7}html[data-ca-theme="dark"] .sm-history-pager a,html[data-ca-theme="dark"] .sm-history-pager span{border-color:#4f423c;background:#211b18;color:#f4ece7}html[data-ca-theme="dark"] .sm-history-pager [aria-current="page"]{background:#a86152;color:#fff}
  `
  document.head.appendChild(style)

  async function request(url, options = {}) {
    const response = await fetch(url, { cache: 'no-store', credentials: 'same-origin', ...options })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(payload.error || '処理を完了できませんでした。')
    return payload
  }

  function toast(message, error = false) {
    document.querySelector('.sm-toast')?.remove()
    const node = document.createElement('div')
    node.className = 'sm-toast'
    if (error) { node.style.borderColor = '#edbdb8'; node.style.background = '#fff3f2'; node.style.color = '#963b35' }
    node.textContent = message
    document.body.appendChild(node)
    setTimeout(() => node.remove(), 4200)
  }

  const storeProfile = () => state.store ? Promise.resolve(state.store) : request('/api/admin/store-profile').then(payload => (state.store = payload.profile))
  const staffDirectory = (refresh = false) => !refresh && state.directory ? Promise.resolve(state.directory) : request('/api/admin/staff-management').then(payload => (state.directory = payload.staff || []))
  const initials = name => String(name || '人').replace(/[\s　]/g, '').slice(0, 1)
  const avatar = staff => `<span class="sm-avatar">${staff.avatarUrl ? `<img src="${esc(staff.avatarUrl)}" alt="${esc(staff.name)}のプロフィール画像">` : esc(initials(staff.name))}</span>`

async function ensureStoreMenuLink() {
    const nav = document.querySelector('[data-ca-store-menu] .ca-store-menu-links')
    if (!nav) return
    const candidates = [...nav.querySelectorAll('a[href*="staffManagement=1"], [data-sm-staff-link]')]
    candidates.slice(1).forEach(node => node.remove())
    if (candidates[0]) { candidates[0].dataset.smStaffLink = '1'; return }
    let profile
    try { profile = await storeProfile() } catch { return }
    if (profile.role !== 'ADMIN' || !nav.isConnected) return
    const link = document.createElement('a')
    link.href = '/admin/settings?staffManagement=1'
    link.dataset.smStaffLink = '1'
    link.setAttribute('role', 'menuitem')
    link.innerHTML = `${icon('users')}スタッフ管理<span class="arrow">${icon('chevronRight')}</span>`
    const account = nav.querySelector('a[href="/admin/account"]')
    nav.insertBefore(link, account || null)
  }


  let storeCodePending = false
  async function ensureStoreCode() {
    if (location.pathname !== '/admin/settings' || new URLSearchParams(location.search).get('staffManagement') === '1') return
    const host = document.querySelector('[data-ca-store-settings]') || document.querySelector('main .max-w-7xl') || document.querySelector('main>div')
    if (!host || document.querySelector('[data-sm-store-code]') || storeCodePending) return
    storeCodePending = true
    try {
      const profile = await storeProfile()
      if (!profile.storeCode || !host.isConnected || document.querySelector('[data-sm-store-code]')) return
      const card = document.createElement('section')
      card.className = 'sm-store-code'
      card.dataset.smStoreCode = '1'
      card.innerHTML = `<span class="sm-symbol">${icon('store')}</span><div><h3>店舗識別コード</h3><p>お客様が「登録済みの店舗」から初めて店舗を登録するときに使用します。店舗・お客様のどちらからも変更できません。</p><code>${esc(profile.storeCode)}</code></div><button type="button" class="sm-button" data-sm-copy-code>${icon('copy')}コピー</button>`
      host.appendChild(card)
      card.querySelector('[data-sm-copy-code]').addEventListener('click', async () => {
        await navigator.clipboard.writeText(profile.storeCode)
        toast('店舗識別コードをコピーしました。')
      })
    } catch {}
    finally { storeCodePending = false }
  }

function fileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      if (!file || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 3 * 1024 * 1024) return reject(new Error('3MB以下のJPEG・PNG・WebP画像を選択してください。'))
      const reader = new FileReader()
      reader.onerror = () => reject(new Error('画像を読み込めませんでした。'))
      reader.onload = () => {
        const image = new Image()
        image.onerror = () => reject(new Error('画像を読み込めませんでした。'))
        image.onload = () => image.naturalWidth === image.naturalHeight ? resolve(reader.result) : reject(new Error('正方形の画像を選択してください。'))
        image.src = reader.result
      }
      reader.readAsDataURL(file)
    })
  }


  async function saveAvatar(staffKey, file) {
    const imageDataUrl = await fileAsDataUrl(file)
    return request('/api/admin/staff-profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'avatar', staffKey, imageDataUrl }) })
  }

  function profileFormMarkup(profile, includeStaffKey = false) {
    return `<div class="sm-profile-form"><label class="sm-field"><span>表示名</span><input name="displayName" maxlength="80" value="${esc(profile?.name || '')}" required></label><label class="sm-field"><span>役職</span><input name="roleLabel" maxlength="80" value="${esc(profile?.role || '')}" placeholder="例：トップスタイリスト"></label><label class="sm-field wide"><span>得意な施術</span><input name="specialties" maxlength="160" value="${esc(profile?.specialties || '')}" placeholder="例：ショート、透明感カラー、髪質改善"></label><label class="sm-field wide"><span>お客様向け紹介文</span><textarea name="introduction" maxlength="300" placeholder="予約画面に表示する紹介文">${esc(profile?.introduction || '')}</textarea></label>${includeStaffKey ? `<input type="hidden" name="staffKey" value="${esc(profile?.key || '')}">` : ''}</div>`
  }

  const weekdayLabels = ['日','月','火','水','木','金','土']

  function recurringDaysOffMarkup(selected = []) {
    const values = new Set((Array.isArray(selected) ? selected : []).map(Number))
    return '<fieldset class="sm-days-off"><legend>毎週の定休日</legend><p>選択した曜日は、お客様予約と店頭予約の受付対象から除外されます。</p><div class="sm-weekday-list">' + weekdayLabels.map((label, day) => '<label class="sm-weekday"><input type="checkbox" name="closedWeekdays" value="' + day + '" ' + (values.has(day) ? 'checked' : '') + '><span>' + label + '曜</span></label>').join('') + '</div></fieldset>'
  }

  function selectedRecurringDaysOff(form) {
    return new FormData(form).getAll('closedWeekdays').map(Number).filter(day => Number.isInteger(day) && day >= 0 && day <= 6)
  }

  async function ensureAccountProfile() {
    if (location.pathname === '/admin/account') {
      document.querySelectorAll('[data-sm-account-profile]').forEach(node => node.remove())
      return
    }
    if (location.pathname !== '/admin/account') return
    const host = document.querySelector('main .max-w-4xl') || document.querySelector('main>div')
    if (!host || host.querySelector('[data-sm-account-profile]')) return
    const section = document.createElement('section')
    section.className = 'sm-account-card'
    section.dataset.smAccountProfile = 'loading'
    section.innerHTML = '<p>スタッフプロフィールを読み込んでいます…</p>'
    host.appendChild(section)
    try {
      const payload = await request('/api/admin/staff-profile')
      const profile = payload.profile
      if (!profile) { section.innerHTML = '<p>このアカウントは予約担当スタッフに未連携です。オーナーへご確認ください。</p>'; return }
      state.ownProfile = profile
      section.dataset.smAccountProfile = 'ready'
      section.innerHTML = `<div class="sm-account-head">${avatar(profile)}<div><h2>お客様向けプロフィール</h2><p>ここで設定した名前・役職・画像・紹介文が、お客様の予約画面とチャットに表示されます。</p></div></div><form data-sm-own-form>${profileFormMarkup(profile)}<div class="sm-avatar-actions"><label class="sm-button">${icon('camera')}プロフィール画像を変更<input type="file" name="avatar" accept="image/jpeg,image/png,image/webp" hidden></label>${profile.hasAvatar ? '<button type="button" class="sm-button danger" data-sm-remove-avatar>画像を削除</button>' : ''}<button type="submit" class="sm-button primary">${icon('check')}プロフィールを保存</button></div><output class="sm-feedback" aria-live="polite"></output></form>`
      const form = section.querySelector('form')
      form.addEventListener('submit', async event => {
        event.preventDefault()
        const button = form.querySelector('[type="submit"]'); button.disabled = true
        try {
          const data = Object.fromEntries(new FormData(form))
          delete data.avatar
          const result = await request('/api/admin/staff-profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
          state.ownProfile = result.profile
          form.querySelector('output').textContent = 'プロフィールを保存しました。'
          state.directory = null
          updateHeaderAvatar(result.profile)
        } catch (error) { form.querySelector('output').textContent = error.message }
        finally { button.disabled = false }
      })
      form.avatar.addEventListener('change', async () => {
        if (!form.avatar.files[0]) return
        try { await saveAvatar(profile.key, form.avatar.files[0]); state.directory = null; section.remove(); ensureAccountProfile(); toast('プロフィール画像を保存しました。') } catch (error) { toast(error.message, true) }
      })
      form.querySelector('[data-sm-remove-avatar]')?.addEventListener('click', async () => {
        try { await request('/api/admin/staff-profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'remove-avatar', staffKey: profile.key }) }); state.directory = null; section.remove(); ensureAccountProfile(); toast('プロフィール画像を削除しました。') } catch (error) { toast(error.message, true) }
      })
      updateHeaderAvatar(profile)
    } catch (error) { section.innerHTML = `<p>${esc(error.message)}</p>` }
  }

  function updateHeaderAvatar(profile) {
    if (!profile?.avatarUrl) return
    document.querySelectorAll('[data-ca-current-user]').forEach(node => {
      let image = node.querySelector('.sm-current-avatar')
      if (!image) { image = document.createElement('img'); image.className = 'sm-current-avatar'; image.alt = ''; node.prepend(image) }
      image.src = profile.avatarUrl + (profile.avatarUrl.includes('?') ? '&' : '?') + 'v=' + Date.now()
      node.querySelector('svg')?.remove()
    })
  }

  function staffCard(staff) {
    const status = !staff.active ? '<span class="sm-badge off">停止中</span>' : staff.onLeave ? '<span class="sm-badge leave">休暇中</span>' : '<span class="sm-badge">予約受付中</span>'
    const daysOff = (staff.closedWeekdays || []).map(day => weekdayLabels[day]).filter(Boolean)
    return `<article class="sm-staff-card ${staff.active ? '' : 'is-inactive'}" data-sm-staff="${esc(staff.key)}">${avatar(staff)}<div><h2>${esc(staff.name)}</h2><p>${esc(staff.role || 'スタイリスト')}${staff.loginId ? ` / ID: ${esc(staff.loginId)}` : ' / アカウント未発行'}</p></div><div class="sm-staff-meta"><p>${esc(staff.specialties || '得意な施術は未設定')}</p><p>同時受付 ${Number(staff.maxConcurrentAppointments || 1)}件</p><p class="sm-days-summary">定休日：${daysOff.length ? '毎週 ' + daysOff.join('・') : 'なし'}</p></div><div class="sm-staff-status sm-badges">${status}</div><div class="sm-actions"><button type="button" class="sm-button" data-sm-edit>${icon('edit')}編集</button><button type="button" class="sm-button danger" data-sm-delete ${staff.accountRole === 'ADMIN' ? 'disabled title="オーナーアカウントは削除できません"' : ''}>${icon('trash')}削除</button></div></article>`
  }

  async function renderStaffPage(root) {
    const staff = await staffDirectory(true)
    root.querySelector('[data-sm-list]').innerHTML = staff.length ? staff.map(staffCard).join('') : '<div class="sm-empty">スタッフはまだ登録されていません。</div>'
  }

  function dialog(title, description, body) {
    const overlay = document.createElement('div')
    overlay.className = 'sm-overlay'
    overlay.innerHTML = `<section class="sm-dialog" role="dialog" aria-modal="true"><header class="sm-dialog-head"><div><h2>${esc(title)}</h2><p>${esc(description)}</p></div><button type="button" class="sm-icon-button" data-sm-close aria-label="閉じる">${icon('close')}</button></header><div class="sm-dialog-body">${body}</div></section>`
    document.body.appendChild(overlay)
    const close = () => overlay.remove()
    overlay.querySelector('[data-sm-close]').addEventListener('click', close)
    overlay.addEventListener('click', event => { if (event.target === overlay) close() })
    return { overlay, close }
  }

  function openCreateDialog(root, preset = null) {
    const { overlay, close } = dialog('スタッフアカウントを追加', '予約・シフト・お客様画面へ同じスタッフ情報が反映されます。', `<form data-sm-create><div class="sm-dialog-grid"><label class="sm-field"><span>スタッフ名</span><input name="displayName" maxlength="80" value="${esc(preset?.name || '')}" required></label><label class="sm-field"><span>スタッフ識別キー</span><input name="staffKey" maxlength="40" value="${esc(preset?.key || '')}" placeholder="例：sato" required></label><label class="sm-field"><span>メールアドレス</span><input name="email" type="email" required></label><label class="sm-field"><span>ログインID</span><input name="loginId" minlength="3" maxlength="64" required></label><label class="sm-field"><span>初期パスワード</span><input name="password" type="password" minlength="8" required></label><label class="sm-field"><span>同時受付可能数</span><input name="maxConcurrentAppointments" type="number" min="1" max="9" value="${Number(preset?.maxConcurrentAppointments || 1)}" required></label><label class="sm-field"><span>役職</span><input name="roleLabel" maxlength="80" value="${esc(preset?.role || 'スタイリスト')}"></label><label class="sm-field"><span>得意な施術</span><input name="specialties" maxlength="160" value="${esc(preset?.specialties || '')}"></label><label class="sm-field wide"><span>お客様向け紹介文</span><textarea name="introduction" maxlength="300">${esc(preset?.introduction || '')}</textarea></label></div>${recurringDaysOffMarkup(preset?.closedWeekdays)}<div class="sm-dialog-actions"><button type="button" class="sm-button" data-sm-close-secondary>キャンセル</button><button type="submit" class="sm-button primary">${icon('plus')}登録する</button></div></form>`)
    overlay.querySelector('[data-sm-close-secondary]').addEventListener('click', close)
    overlay.querySelector('form').addEventListener('submit', async event => {
      event.preventDefault(); const button = event.submitter; button.disabled = true
      try { const payload = Object.fromEntries(new FormData(event.currentTarget)); payload.closedWeekdays = selectedRecurringDaysOff(event.currentTarget); await request('/api/admin/staff-management', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); state.directory = null; close(); await renderStaffPage(root); toast('スタッフアカウントを登録しました。') } catch (error) { toast(error.message, true); button.disabled = false }
    })
  }

  function openEditDialog(root, staff) {
    if (!staff.userId) return openCreateDialog(root, staff)
    const { overlay, close } = dialog('スタッフ情報を編集', '変更内容は予約画面、チャット、シフト表へ共通反映されます。', `<form data-sm-edit-form>${profileFormMarkup(staff, true)}<div class="sm-dialog-grid" style="margin-top:12px"><label class="sm-field"><span>同時受付可能数</span><input name="maxConcurrentAppointments" type="number" min="1" max="9" value="${Number(staff.maxConcurrentAppointments || 1)}"></label><label class="sm-check"><input name="active" type="checkbox" ${staff.active ? 'checked' : ''}>アカウントを有効にする</label><label class="sm-check"><input name="onLeave" type="checkbox" ${staff.onLeave ? 'checked' : ''}>休暇中（予約候補から除外）</label><label class="sm-field"><span>プロフィール画像</span><input name="avatar" type="file" accept="image/jpeg,image/png,image/webp"></label></div>${recurringDaysOffMarkup(staff.closedWeekdays)}<div class="sm-dialog-actions"><button type="button" class="sm-button" data-sm-close-secondary>キャンセル</button><button type="submit" class="sm-button primary">${icon('check')}保存する</button></div></form>`)
    overlay.querySelector('[data-sm-close-secondary]').addEventListener('click', close)
    overlay.querySelector('form').addEventListener('submit', async event => {
      event.preventDefault(); const form = event.currentTarget; const button = event.submitter; button.disabled = true
      try {
        const fields = Object.fromEntries(new FormData(form)); delete fields.avatar
        fields.active = form.active.checked; fields.onLeave = form.onLeave.checked
        await request('/api/admin/staff-management', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ staffKey: staff.key, displayName: fields.displayName, active: fields.active, onLeave: fields.onLeave, maxConcurrentAppointments: Number(fields.maxConcurrentAppointments), closedWeekdays: selectedRecurringDaysOff(form) }) })
        await request('/api/admin/staff-profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ staffKey: staff.key, displayName: fields.displayName, roleLabel: fields.roleLabel, specialties: fields.specialties, introduction: fields.introduction }) })
        if (form.avatar.files[0]) await saveAvatar(staff.key, form.avatar.files[0])
        state.directory = null; close(); await renderStaffPage(root); toast('スタッフ情報を保存しました。')
      } catch (error) { toast(error.message, true); button.disabled = false }
    })
  }

async function ensureStaffPage() {
    const active = location.pathname === '/admin/settings' && new URLSearchParams(location.search).get('staffManagement') === '1'
    if (!active) {
      document.documentElement.classList.remove('sm-staff-route')
      document.querySelectorAll('[data-sm-page]').forEach(node => node.remove())
      return
    }
    const main = document.querySelector('main')
    if (!main || main.querySelector('[data-sm-page]')) return
    document.documentElement.classList.add('sm-staff-route')
    const root = document.createElement('div')
    root.className = 'sm-page'
    root.dataset.smPage = '1'
    root.innerHTML = `<header class="sm-page-head"><div><small>STAFF DIRECTORY</small><h1>スタッフ管理</h1><p>スタッフのアカウント、予約受付、休暇、プロフィールを一か所で管理します。</p></div><button type="button" class="sm-button primary" data-sm-add>${icon('plus')}スタッフを追加</button></header><section class="sm-list" data-sm-list><div class="sm-empty">スタッフ情報を読み込んでいます…</div></section>`
    main.appendChild(root)
    root.querySelector('[data-sm-add]').addEventListener('click', () => openCreateDialog(root))
    root.addEventListener('click', async event => {
      const card = event.target.closest('[data-sm-staff]'); if (!card) return
      const staff = (state.directory || []).find(item => item.key === card.dataset.smStaff); if (!staff) return
      if (event.target.closest('[data-sm-edit]')) openEditDialog(root, staff)
      if (event.target.closest('[data-sm-delete]')) {
        if (!confirm(`${staff.name}さんのログインと新規予約受付を停止します。過去の予約履歴は残ります。よろしいですか？`)) return
        try { await request('/api/admin/staff-management', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ staffKey: staff.key }) }); state.directory = null; close(); await renderStaffPage(root); toast('スタッフを停止しました。') } catch (error) { toast(error.message, true) }
      }
    })
    try { await renderStaffPage(root) } catch (error) { root.querySelector('[data-sm-list]').innerHTML = `<div class="sm-empty">${esc(error.message)}</div>` }
  }


  async function ensureHeaderAvatar() {
    if (!document.querySelector('[data-ca-current-user]')) return
    try {
      if (!state.ownProfile) state.ownProfile = (await request('/api/admin/staff-profile')).profile
      updateHeaderAvatar(state.ownProfile)
    } catch {}
  }

  function removeStrayStaffButtons() {
    if (new URLSearchParams(location.search).get('staffManagement') === '1') return
    document.querySelectorAll('button,a').forEach(node => {
      if (String(node.textContent || '').replace(/\s+/g, '') === 'スタッフを追加') node.style.display = 'none'
    })
  }

  function formatJapanIsoDates() {
    const pattern = /\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z\b/g
    const formatter = new Intl.DateTimeFormat('ja-JP', {
      timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit',
      weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
    })
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    const nodes = []
    while (walker.nextNode()) nodes.push(walker.currentNode)
    nodes.forEach(node => {
      if (!pattern.test(node.nodeValue || '')) return
      pattern.lastIndex = 0
      if (node.parentElement?.closest('script,style,textarea,input,option,code,pre')) return
      node.nodeValue = String(node.nodeValue).replace(pattern, value => {
        const date = new Date(value)
        return Number.isNaN(date.getTime()) ? value : formatter.format(date)
      })
      pattern.lastIndex = 0
    })
  }

function paginateOperationHistory() {
    const active = location.pathname === '/admin/appointments' && new URLSearchParams(location.search).get('tab') === 'history'
    if (!active) {
      document.querySelectorAll('.sm-history-pager').forEach(node => node.remove())
      document.querySelectorAll('[data-sm-history-ready]').forEach(node => delete node.dataset.smHistoryReady)
      return
    }
    const heading = [...document.querySelectorAll('h2')].find(node => node.textContent?.trim() === '操作履歴')
    const section = heading?.closest('section')
    const list = section?.querySelector(':scope > .mt-4.grid')
    if (!section || !list || list.dataset.smHistoryReady === '1') return
    const articles = [...list.querySelectorAll(':scope > article')].filter(article => !/自動取込|予約メール|Gmail API|受信メール/.test(article.textContent || ''))
    ;[...list.querySelectorAll(':scope > article')].filter(article => !articles.includes(article)).forEach(article => { article.hidden = true })
    const perPage = 50
    const total = articles.length
    const pages = Math.max(1, Math.ceil(total / perPage))
    const requested = Number(new URLSearchParams(location.search).get('historyPage') || 1)
    const page = Math.min(pages, Math.max(1, Number.isInteger(requested) ? requested : 1))
    const start = (page - 1) * perPage
    const end = Math.min(total, start + perPage)
    articles.forEach((article, index) => { article.hidden = index < start || index >= end })
    const description = heading.parentElement?.querySelector('p')
    if (description) description.textContent = total ? `${total}件中 ${start + 1}〜${end}件を表示しています。スタッフが手動で行った操作だけを記録しています。` : '手動の操作履歴はまだありません。'
    const count = heading.parentElement?.parentElement?.querySelector(':scope > span')
    if (count) count.textContent = `${total}件`
    if (pages > 1) {
      const hrefFor = target => { const url = new URL(location.href); url.searchParams.set('historyPage', String(target)); return url.pathname + url.search }
      const pager = document.createElement('nav'); pager.className = 'sm-history-pager'; pager.setAttribute('aria-label', '操作履歴のページ')
      pager.innerHTML = (page > 1 ? `<a href="${esc(hrefFor(page - 1))}">前へ</a>` : '<span class="disabled" aria-disabled="true">前へ</span>') + Array.from({ length: pages }, (_, index) => index + 1).map(number => number === page ? `<span aria-current="page">${number}</span>` : `<a href="${esc(hrefFor(number))}">${number}</a>`).join('') + (page < pages ? `<a href="${esc(hrefFor(page + 1))}">次へ</a>` : '<span class="disabled" aria-disabled="true">次へ</span>')
      list.insertAdjacentElement('afterend', pager)
    }
    list.dataset.smHistoryReady = '1'
  }


  function enhance() {
    ensureStoreMenuLink()
    ensureStoreCode()
    ensureAccountProfile()
    ensureStaffPage()
    ensureHeaderAvatar()
    removeStrayStaffButtons()
    formatJapanIsoDates()
    paginateOperationHistory()
  }

  document.addEventListener('click', event => { const link = event.target.closest?.('a[href*="staffManagement=1"]'); if (!link) return; event.preventDefault(); event.stopImmediatePropagation(); location.assign(link.href) }, true)
  const schedule = () => { clearTimeout(state.timer); state.timer = setTimeout(enhance, 0) }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', enhance, { once: true })
  else enhance()
  new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true })
  window.addEventListener('pageshow', enhance)
})()
