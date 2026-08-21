;(() => {
  if (window.__lienAttendanceProductV349) return
  window.__lienAttendanceProductV349 = true

  const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character])
  const isAttendanceRoute = () => location.pathname === '/admin/account' && new URLSearchParams(location.search).get('panel') === 'attendance'
  const icon = name => {
    const paths = {
      clock: '<circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path>',
      in: '<path d="M12 3v12M7 10l5 5 5-5"></path><path d="M5 21h14"></path>',
      out: '<path d="M12 21V9M7 14l5-5 5 5"></path><path d="M5 3h14"></path>',
      image: '<rect x="3" y="4" width="18" height="16" rx="3"></rect><circle cx="9" cy="10" r="2"></circle><path d="m4 18 5-5 4 4 2-2 5 4"></path>',
    }
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (paths[name] || paths.clock) + '</svg>'
  }
  const style = document.createElement('style')
  style.dataset.lienAttendanceV349 = '1'
  style.textContent = `
    .ca-store-menu-links a[data-ca-attendance-link]{display:flex}
    .ca-attendance-page{width:min(1480px,100%);margin:0 auto;display:grid;gap:20px;color:#342824}.ca-attendance-hero,.ca-attendance-card{border:1px solid #eadbd4;border-radius:22px;background:#fffdfa;box-shadow:0 10px 30px rgba(73,44,35,.045)}.ca-attendance-hero{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:28px 30px;background:linear-gradient(135deg,#fffdfb,#fff6f2)}.ca-attendance-eyebrow{display:block;margin-bottom:8px;color:#b14e66;font-size:10px;font-weight:900;letter-spacing:.14em;text-transform:uppercase}.ca-attendance-hero h1{margin:0;font-family:"Yu Mincho","Hiragino Mincho ProN",serif;font-size:30px}.ca-attendance-hero p{margin:9px 0 0;color:#806f67;font-size:12px}.ca-attendance-now{min-width:210px;text-align:right}.ca-attendance-now strong{display:block;font:700 28px Georgia,serif}.ca-attendance-now span{color:#8c7a72;font-size:11px}.ca-attendance-tabs{display:grid;grid-template-columns:repeat(3,1fr);overflow:hidden;border:1px solid #eadbd4;border-radius:17px;background:#fff}.ca-attendance-tab{min-height:50px;border:0;background:#fff;color:#78675f;font-size:11px;font-weight:900;cursor:pointer}.ca-attendance-tab.is-active{background:#f9e5e9;color:#a44259}.ca-attendance-grid{display:grid;grid-template-columns:minmax(280px,.75fr) minmax(0,1.5fr);gap:18px}.ca-attendance-card{padding:22px}.ca-attendance-card h2{margin:0;font-size:17px}.ca-attendance-card>p{margin:6px 0 18px;color:#87766f;font-size:11px;line-height:1.7}.ca-attendance-status{display:grid;gap:12px;border:1px solid #ead9d1;border-radius:18px;background:#fff;padding:18px}.ca-attendance-status-row{display:flex;align-items:center;justify-content:space-between;gap:16px}.ca-attendance-status strong{font-size:14px}.ca-attendance-status time{color:#a35648;font-size:12px;font-weight:800}.ca-attendance-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}.ca-attendance-action{display:flex;min-height:50px;align-items:center;justify-content:center;gap:9px;border:0;border-radius:15px;background:#a95747;color:#fff;font-size:13px;font-weight:900;box-shadow:0 9px 22px rgba(132,70,57,.18);cursor:pointer}.ca-attendance-action.secondary{background:#715d56}.ca-attendance-action.is-out{background:#584944}.ca-attendance-action svg{width:19px;height:19px}.ca-attendance-action:disabled{opacity:.55;cursor:wait}.ca-attendance-table{width:100%;border-collapse:separate;border-spacing:0;overflow:hidden;border:1px solid #eadbd4;border-radius:16px;background:#fff;font-size:11px}.ca-attendance-table th,.ca-attendance-table td{padding:12px 14px;border-bottom:1px solid #f0e5df;text-align:left}.ca-attendance-table th{background:#fbf6f2;color:#7c6c65;font-size:10px}.ca-attendance-table tr:last-child td{border-bottom:0}.ca-attendance-table .empty{padding:30px;text-align:center;color:#968781}.ca-attendance-pill{display:inline-flex;min-height:28px;align-items:center;border-radius:999px;background:#edf8f1;padding:0 10px;color:#357152;font-size:10px;font-weight:900}.ca-attendance-pill.open{background:#fff1e8;color:#a34d38}.ca-attendance-pill.break{background:#eef2ff;color:#4d5e95}.ca-attendance-month{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}.ca-attendance-month input,.ca-policy-time{min-height:42px;border:1px solid #e5d5cd;border-radius:12px;background:#fff;padding:0 12px;color:#493a34;font-weight:800}.ca-attendance-feedback{min-height:20px;margin-top:10px;color:#9c493e;font-size:11px;font-weight:800}.ca-policy-grid{display:grid;gap:10px}.ca-policy-row{display:grid;grid-template-columns:minmax(160px,1fr) 120px 24px 120px 110px;align-items:center;gap:9px;border-bottom:1px solid #f0e5df;padding:10px 0}.ca-policy-save{min-height:40px;border:1px solid #d6b8ad;border-radius:11px;background:#fff;color:#904a3e;font-size:10px;font-weight:900}.ca-product-image-upload{grid-column:1/-1;display:grid;grid-template-columns:116px minmax(0,1fr);gap:16px;align-items:center;border:1px dashed #dbbbb0;border-radius:18px;background:#fff9f6;padding:16px}.ca-product-image-preview{display:grid;width:116px;height:116px;place-items:center;overflow:hidden;border:1px solid #e7d8d1;border-radius:16px;background:#fff;color:#b69588}.ca-product-image-preview img{width:100%;height:100%;object-fit:contain}.ca-product-image-preview svg{width:34px;height:34px}.ca-product-image-copy strong{display:block;font-size:13px}.ca-product-image-copy p{margin:6px 0 10px;color:#87746c;font-size:10px;line-height:1.7}.ca-product-image-picker{display:inline-flex;min-height:40px;align-items:center;gap:8px;border:1px solid #d7bbb0;border-radius:12px;background:#fff;padding:0 13px;color:#8f493d;font-size:11px;font-weight:900;cursor:pointer}.ca-product-image-picker svg{width:17px;height:17px}.ca-product-image-error{display:block;margin-top:7px;color:#ac3e3e;font-size:10px;font-weight:800}.ca-product-uploaded-thumb{width:58px;height:58px;object-fit:contain;border:1px solid #eaded8;border-radius:12px;background:#fff;padding:4px;margin-right:10px;vertical-align:middle}
    .ca-attendance-person{display:grid;gap:7px;margin:0 0 14px}.ca-attendance-person span{color:#7f6d65;font-size:10px;font-weight:900}.ca-attendance-person select{width:100%;min-height:46px;border:1px solid #ddc9c0;border-radius:13px;background:#fff;padding:0 13px;color:#3e302b;font-size:12px;font-weight:800}
    @media(max-width:800px){.ca-attendance-hero{align-items:flex-start;flex-direction:column;padding:22px}.ca-attendance-now{text-align:left}.ca-attendance-tabs{grid-template-columns:1fr}.ca-attendance-grid{grid-template-columns:1fr}.ca-attendance-card{padding:16px}.ca-attendance-table-wrap{overflow:auto}.ca-policy-row{grid-template-columns:1fr 1fr 18px 1fr}.ca-policy-save{grid-column:1/-1}.ca-product-image-upload{grid-template-columns:84px 1fr}.ca-product-image-preview{width:84px;height:84px}}
  `
  document.head.appendChild(style)

  const formatTime = value => value ? new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit' }).format(new Date(value)) : '—'
  const formatDate = value => value ? new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', month: 'numeric', day: 'numeric', weekday: 'short' }).format(new Date(value)) : '—'
  const minutesLabel = value => { const minutes = Math.max(0, Number(value) || 0); return Math.floor(minutes / 60) + '時間' + (minutes % 60 ? (minutes % 60) + '分' : '') }

  async function attendanceData(month) {
    const response = await fetch('/api/admin/attendance?month=' + encodeURIComponent(month || ''), { credentials: 'same-origin', cache: 'no-store' })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(payload.error || '出退勤情報を取得できませんでした。')
    return payload
  }

  function cleanupAttendancePage() {
    document.querySelectorAll('[data-ca-attendance-page]').forEach(node => node.remove())
    document.querySelectorAll('[data-ca-attendance-hidden="1"]').forEach(node => {
      node.hidden = false
      node.style.removeProperty('display')
      delete node.dataset.caAttendanceHidden
    })
    document.querySelectorAll('[data-ca-attendance-original-text]').forEach(node => {
      node.textContent = node.dataset.caAttendanceOriginalText || ''
      delete node.dataset.caAttendanceOriginalText
    })
  }

  const originalPushState = history.pushState.bind(history)
  const originalReplaceState = history.replaceState.bind(history)
  const afterRouteChange = () => queueMicrotask(() => isAttendanceRoute() ? renderAttendance() : cleanupAttendancePage())
  history.pushState = (...args) => { const result = originalPushState(...args); afterRouteChange(); return result }
  history.replaceState = (...args) => { const result = originalReplaceState(...args); afterRouteChange(); return result }
  addEventListener('popstate', afterRouteChange)

  function attendanceMarkup(data, view = 'clock') {
    const rows = data.summaries || []
    const table = rows.length ? rows.map(row => `<tr><td><strong>${esc(row.displayName || 'スタッフ')}</strong></td><td>${esc(row.workDate)}</td><td>${formatTime(row.clockInAt)}</td><td>${row.isWorking ? '勤務中' : formatTime(row.clockOutAt)}</td><td>${esc(row.shiftCount || 0)}回</td><td><strong>${esc(minutesLabel(row.totalWorkMinutes))}</strong></td><td>${esc(minutesLabel(row.totalBreakMinutes))}</td></tr>`).join('') : '<tr><td colspan="7" class="empty">この月の出退勤記録はまだありません。</td></tr>'
    const selectedStaffKey = window.__lienAttendanceStaffKey || data.people?.[0]?.staffKey || ''
    const selectedStaff = (data.people || []).find(person => person.staffKey === selectedStaffKey) || data.people?.[0]
    window.__lienAttendanceStaffKey = selectedStaff?.staffKey || ''
    const selectedRecord = (data.today || []).find(row => row.staffKey === window.__lienAttendanceStaffKey) || null
    const onBreak = Boolean(selectedRecord?.breakStartedAt && !selectedRecord?.breakEndedAt)
    const working = Boolean(selectedRecord?.clockInAt && !selectedRecord?.clockOutAt)
    const finished = Boolean(selectedRecord?.clockOutAt)
    const todayRows = (data.today || []).map(row => { const status = row.clockInAt ? row.clockOutAt ? '退勤' : row.breakStartedAt && !row.breakEndedAt ? '休憩中' : '出勤' : '未出勤'; return `<tr><td><strong>${esc(row.displayName)}</strong></td><td><span class="ca-attendance-pill ${status === '出勤' ? 'open' : status === '休憩中' ? 'break' : ''}">${status}</span></td><td>${esc(row.shiftCount || 0)}回</td><td>${formatTime(row.clockInAt)}</td><td>${formatTime(row.clockOutAt)}</td><td><strong>${esc(minutesLabel(row.totalWorkMinutes))}</strong></td><td>${esc(minutesLabel(row.totalBreakMinutes))}</td></tr>` }).join('')
    const policies = new Map((data.policies || []).map(row => [row.userId, row]))
    const policyRows = (data.people || []).map(person => { const policy = policies.get(person.id) || { plannedStart: '10:00', plannedEnd: '19:00' }; return `<div class="ca-policy-row"><strong>${esc(person.displayName)}</strong><input class="ca-policy-time" type="time" value="${esc(policy.plannedStart)}" data-policy-start><span>〜</span><input class="ca-policy-time" type="time" value="${esc(policy.plannedEnd)}" data-policy-end><button class="ca-policy-save" type="button" data-policy-save="${esc(person.id)}">保存</button></div>` }).join('')
    const staffOptions = (data.people || []).map(person => `<option value="${esc(person.staffKey)}" ${person.staffKey === window.__lienAttendanceStaffKey ? 'selected' : ''}>${esc(person.displayName)}</option>`).join('')
    const clockView = `<div class="ca-attendance-grid"><section class="ca-attendance-card"><h2>今日の打刻</h2><p>スタッフを選び、店舗端末から出勤・休憩・退勤を記録します。同じ日に何度でも再出勤できます。</p><label class="ca-attendance-person"><span>打刻するスタッフ</span><select data-attendance-person>${staffOptions}</select></label><div class="ca-attendance-status"><div class="ca-attendance-status-row"><strong>${finished ? '退勤済み・再出勤可能' : working ? onBreak ? '休憩中' : '出勤中' : '未出勤'}</strong><time>${selectedRecord?.clockInAt ? formatTime(selectedRecord.clockInAt) + ' 出勤' : '—'}</time></div><div class="ca-attendance-actions">${!working ? `<button type="button" class="ca-attendance-action" data-attendance-action="clock_in" ${!selectedStaff ? 'disabled' : ''}>${icon('in')}出勤する</button>` : onBreak ? `<button type="button" class="ca-attendance-action secondary" data-attendance-action="break_end">${icon('in')}休憩から戻る</button>` : `<button type="button" class="ca-attendance-action secondary" data-attendance-action="break_start">${icon('clock')}休憩に入る</button>`}<button type="button" class="ca-attendance-action is-out" data-attendance-action="clock_out" ${working ? '' : 'disabled'}>${icon('out')}退勤する</button></div></div><div class="ca-attendance-feedback" role="status"></div></section><section class="ca-attendance-card"><h2>スタッフの最新状態</h2><p>今日の勤務回数と実働・休憩の合計を確認できます。</p><div class="ca-attendance-table-wrap"><table class="ca-attendance-table"><thead><tr><th>スタッフ</th><th>状況</th><th>勤務回数</th><th>最新出勤</th><th>最新退勤</th><th>実働合計</th><th>休憩合計</th></tr></thead><tbody>${todayRows || '<tr><td colspan="7" class="empty">スタッフが登録されていません。</td></tr>'}</tbody></table></div></section></div>`
    const listView = `<section class="ca-attendance-card"><div class="ca-attendance-month"><div><h2>${data.canViewAll ? '店舗の出退勤リスト' : '自分の出退勤リスト'}</h2><p style="margin:5px 0 0;color:#87766f;font-size:10px">スタッフ・日付ごとの勤務合計を表示します。</p></div><input type="month" value="${esc(data.month)}" data-attendance-month aria-label="表示月"></div><div class="ca-attendance-table-wrap"><table class="ca-attendance-table"><thead><tr><th>スタッフ</th><th>勤務日</th><th>最初の出勤</th><th>最後の退勤</th><th>勤務回数</th><th>実働合計</th><th>休憩合計</th></tr></thead><tbody>${table}</tbody></table></div></section>`
    const policyView = data.canViewAll ? `<section class="ca-attendance-card"><h2>始業・終業時間設定</h2><p>スタッフごとの標準勤務時間を設定します。</p><div class="ca-policy-grid">${policyRows}</div><div class="ca-attendance-feedback" role="status"></div></section>` : `<section class="ca-attendance-card"><h2>始業・終業時間設定</h2><p>勤務時間の変更はオーナーへ依頼してください。</p></section>`
    return `<section class="ca-attendance-hero"><div><span class="ca-attendance-eyebrow">Staff attendance</span><h1>出退勤管理</h1><p>スタッフの出勤・休憩・退勤を正確に記録します。</p></div><div class="ca-attendance-now"><strong data-attendance-clock>${formatTime(data.serverTime)}</strong><span>${formatDate(data.serverTime)}</span></div></section><nav class="ca-attendance-tabs"><button class="ca-attendance-tab ${view === 'clock' ? 'is-active' : ''}" data-attendance-view="clock">出退勤変更</button><button class="ca-attendance-tab ${view === 'list' ? 'is-active' : ''}" data-attendance-view="list">出退勤リスト</button><button class="ca-attendance-tab ${view === 'policy' ? 'is-active' : ''}" data-attendance-view="policy">始業・終業時間設定</button></nav>${view === 'clock' ? clockView : view === 'list' ? listView : policyView}`
  }

  async function renderAttendance(month, view = window.__lienAttendanceView || 'clock') {
    if (!isAttendanceRoute()) { cleanupAttendancePage(); return }
    const main = document.querySelector('main')
    if (!main) return
    let root = main.querySelector('[data-ca-attendance-page]')
    if (!root) {
      Array.from(main.children).forEach(node => { node.hidden = true; node.style.display = 'none'; node.dataset.caAttendanceHidden = '1' })
      root = document.createElement('div'); root.className = 'ca-attendance-page'; root.dataset.caAttendancePage = '1'; main.appendChild(root)
    }
    document.querySelectorAll('header p').forEach(node => {
      if (node.textContent?.trim() === 'アカウント設定') {
        node.dataset.caAttendanceOriginalText = node.textContent
        node.textContent = '出退勤管理'
      }
    })
    try {
      const data = await attendanceData(month)
      window.__lienAttendanceView = view
      root.innerHTML = attendanceMarkup(data, view)
      root.querySelectorAll('[data-attendance-view]').forEach(button => button.addEventListener('click', () => renderAttendance(month || data.month, button.dataset.attendanceView)))
      root.querySelector('[data-attendance-person]')?.addEventListener('change', event => { window.__lienAttendanceStaffKey = event.currentTarget.value; renderAttendance(month || data.month, view) })
      const input = root.querySelector('[data-attendance-month]')
      input?.addEventListener('change', () => renderAttendance(input.value, view))
      root.querySelectorAll('[data-attendance-action]').forEach(actionButton => actionButton.addEventListener('click', async event => {
        const button = event.currentTarget; const feedback = root.querySelector('.ca-attendance-feedback'); button.disabled = true; feedback.textContent = '記録しています…'
        try {
          const response = await fetch('/api/admin/attendance', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: button.dataset.attendanceAction, staffKey: window.__lienAttendanceStaffKey }) })
          const result = await response.json().catch(() => ({})); if (!response.ok) throw new Error(result.error || '記録できませんでした。')
          await renderAttendance(input?.value, view)
        } catch (error) { feedback.textContent = error.message; button.disabled = false }
      }))
      root.querySelectorAll('[data-policy-save]').forEach(button => button.addEventListener('click', async () => {
        const row = button.closest('.ca-policy-row'), feedback = root.querySelector('.ca-attendance-feedback'); button.disabled = true
        try { const response = await fetch('/api/admin/attendance', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'save_policy', staffKey: button.dataset.policySave, plannedStart: row.querySelector('[data-policy-start]').value, plannedEnd: row.querySelector('[data-policy-end]').value }) }); const result = await response.json().catch(() => ({})); if (!response.ok) throw new Error(result.error || '保存できませんでした。'); feedback.textContent = result.message; button.disabled = false } catch (error) { feedback.textContent = error.message; button.disabled = false }
      }))
    } catch (error) { root.innerHTML = '<section class="ca-attendance-card"><h2>出退勤情報を表示できません</h2><p>' + esc(error.message) + '</p></section>' }
  }

  function setupProductImage(form) {
    if (!form || form.dataset.caProductImageReady) return
    const title = form.closest('[role="dialog"]')?.querySelector('h2')?.textContent || ''
    if (!title.includes('商品')) return
    const grid = form.querySelector('.grid.gap-5') || form.querySelector('.ca-form-columns')
    if (!grid) return
    form.dataset.caProductImageReady = '1'
    const field = document.createElement('section')
    field.className = 'ca-product-image-upload'
    field.innerHTML = `<div class="ca-product-image-preview">${icon('image')}</div><div class="ca-product-image-copy"><strong>商品画像</strong><p>商品棚とお客様向けの商品表示に使用します。JPEG・PNG・WebP、2MBまで。</p><label class="ca-product-image-picker">${icon('image')}画像を選択<input type="file" accept="image/jpeg,image/png,image/webp" hidden></label><input type="hidden" name="imageDataUrl"><span class="ca-product-image-error" role="alert"></span></div>`
    grid.prepend(field)
    const input = field.querySelector('input[type=file]'), hidden = field.querySelector('[name=imageDataUrl]'), preview = field.querySelector('.ca-product-image-preview'), error = field.querySelector('.ca-product-image-error')
    input.addEventListener('change', () => {
      const file = input.files?.[0]; error.textContent = ''; hidden.value = ''
      if (!file) { preview.innerHTML = icon('image'); return }
      if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) { error.textContent = 'JPEG・PNG・WebPの2MB以下の画像を選択してください。'; input.value = ''; return }
      const reader = new FileReader()
      reader.onerror = () => { error.textContent = '画像を読み込めませんでした。' }
      reader.onload = () => { hidden.value = String(reader.result || ''); preview.innerHTML = '<img alt="選択した商品画像" src="' + hidden.value + '">' }
      reader.readAsDataURL(file)
    })
  }

  async function enhanceProductImages() {
    if (location.pathname !== '/admin/products') return
    try {
      const response = await fetch('/api/admin/catalog/product-images', { credentials: 'same-origin', cache: 'no-store' })
      if (!response.ok) return
      const payload = await response.json()
      for (const item of payload.images || []) {
        const row = document.getElementById('product-' + item.id) || document.querySelector('[data-product-id="' + CSS.escape(item.id) + '"]')
        if (!row || row.querySelector('.ca-product-uploaded-thumb')) continue
        const target = row.querySelector('td,article>div,div') || row
        const image = document.createElement('img'); image.className = 'ca-product-uploaded-thumb'; image.src = item.imageUrl; image.alt = ''; target.prepend(image)
      }
    } catch {}
  }

  const observer = new MutationObserver(() => {
    document.querySelectorAll('form').forEach(setupProductImage)
    if (isAttendanceRoute()) {
      const main = document.querySelector('main'), root = main?.querySelector('[data-ca-attendance-page]')
      if (!root) renderAttendance()
      else Array.from(main.children).forEach(node => { if (node !== root) { node.hidden = true; node.style.display = 'none'; node.dataset.caAttendanceHidden = '1' } })
    } else cleanupAttendancePage()
    enhanceProductImages()
  })
  observer.observe(document.documentElement, { childList: true, subtree: true })
  document.addEventListener('DOMContentLoaded', () => { document.querySelectorAll('form').forEach(setupProductImage); isAttendanceRoute() ? renderAttendance() : cleanupAttendancePage(); enhanceProductImages() })
  isAttendanceRoute() ? renderAttendance() : cleanupAttendancePage(); enhanceProductImages()
})()
