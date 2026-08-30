;(() => {
  if (window.__lienAttendanceProductV497) return
  window.__lienAttendanceProductV497 = true

  const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character])
  const isAttendanceRoute = () => location.pathname === '/admin/account' && new URLSearchParams(location.search).get('panel') === 'attendance'
  const icon = name => {
    const paths = {
      clock: '<circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path>',
      in: '<path d="M12 3v12M7 10l5 5 5-5"></path><path d="M5 21h14"></path>',
      out: '<path d="M12 21V9M7 14l5-5 5 5"></path><path d="M5 3h14"></path>',
      calendar: '<rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M16 3v4M8 3v4M3 10h18"></path>',
      left: '<path d="m15 18-6-6 6-6"></path>',
      right: '<path d="m9 18 6-6-6-6"></path>',
      plus: '<path d="M12 5v14M5 12h14"></path>',
      save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"></path><path d="M17 21v-8H7v8M7 3v5h8"></path>',
      image: '<rect x="3" y="4" width="18" height="16" rx="3"></rect><circle cx="9" cy="10" r="2"></circle><path d="m4 18 5-5 4 4 2-2 5 4"></path>',
    }
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (paths[name] || paths.clock) + '</svg>'
  }

  const style = document.createElement('style')
  style.dataset.lienAttendanceV497 = '1'
  style.textContent = `
    .ca-store-menu-links a[data-ca-attendance-link]{display:flex}
    .ca-attendance-page{width:min(1480px,100%);margin:0 auto;display:grid;gap:16px;color:#302824;letter-spacing:0}
    .ca-attendance-page *{box-sizing:border-box;letter-spacing:0}
    .ca-attendance-hero,.ca-attendance-card,.ca-attendance-tabs{border:1px solid #e7d8d1;border-radius:8px;background:#fff;box-shadow:0 8px 24px rgba(73,44,35,.045)}
    .ca-attendance-hero{display:flex;min-height:116px;align-items:center;justify-content:space-between;gap:20px;padding:24px 28px;background:#fffaf7}
    .ca-attendance-eyebrow{display:block;margin-bottom:7px;color:#af4861;font-size:10px;font-weight:900;text-transform:uppercase}
    .ca-attendance-hero h1{margin:0;font-family:"Yu Mincho","Hiragino Mincho ProN",serif;font-size:28px;font-weight:700}
    .ca-attendance-now{min-width:190px;text-align:right}.ca-attendance-now strong{display:block;font-size:24px;font-variant-numeric:tabular-nums}.ca-attendance-now span{color:#7f7069;font-size:11px}
    .ca-attendance-tabs{display:grid;grid-template-columns:repeat(3,1fr);overflow:hidden;padding:4px}
    .ca-attendance-tab{display:flex;min-height:44px;align-items:center;justify-content:center;gap:8px;border:0;border-radius:6px;background:#fff;color:#74645d;font-size:12px;font-weight:800;cursor:pointer}
    .ca-attendance-tab svg{width:17px;height:17px}.ca-attendance-tab:hover{background:#fbf6f3}.ca-attendance-tab.is-active{background:#f8e7eb;color:#a23e56}
    .ca-attendance-grid{display:grid;grid-template-columns:minmax(300px,.75fr) minmax(0,1.5fr);gap:16px}
    .ca-attendance-card{min-width:0;padding:22px}.ca-attendance-card h2{margin:0;font-size:17px}.ca-attendance-card>p{margin:6px 0 18px;color:#83736c;font-size:11px;line-height:1.7}
    .ca-attendance-person{display:grid;gap:7px;margin:0 0 14px}.ca-attendance-person span,.ca-field span{color:#75655e;font-size:10px;font-weight:900}
    .ca-attendance-person select,.ca-history-toolbar select,.ca-history-toolbar input,.ca-field input,.ca-policy-time{width:100%;min-height:42px;border:1px solid #ddcbc3;border-radius:6px;background:#fff;padding:0 12px;color:#3e302b;font-size:12px;font-weight:800}
    .ca-attendance-status{display:grid;gap:14px;border-top:1px solid #ede1dc;padding-top:16px}.ca-attendance-status-row{display:flex;align-items:center;justify-content:space-between;gap:16px}.ca-attendance-status strong{font-size:15px}.ca-attendance-status time{color:#9b4d41;font-size:12px;font-weight:800;font-variant-numeric:tabular-nums}
    .ca-attendance-overdue{display:flex;align-items:flex-start;gap:8px;border-left:3px solid #c7644f;background:#fff6f1;padding:10px 12px;color:#8c3f31;font-size:11px;font-weight:800;line-height:1.6}.ca-attendance-overdue svg{width:17px;height:17px;flex:0 0 auto}
    .ca-attendance-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}.ca-attendance-action,.ca-record-save,.ca-policy-save,.ca-add-shift{display:inline-flex;min-height:44px;align-items:center;justify-content:center;gap:8px;border:0;border-radius:6px;background:#a25243;padding:0 14px;color:#fff;font-size:12px;font-weight:900;box-shadow:0 7px 18px rgba(132,70,57,.14);cursor:pointer}
    .ca-attendance-action.secondary{background:#78645d}.ca-attendance-action.is-out{background:#514541}.ca-attendance-action svg,.ca-record-save svg,.ca-add-shift svg{width:17px;height:17px}.ca-attendance-action:disabled,.ca-record-save:disabled,.ca-policy-save:disabled{opacity:.55;cursor:wait}
    .ca-attendance-feedback{min-height:18px;margin-top:10px;color:#9c493e;font-size:11px;font-weight:800}
    .ca-attendance-table-wrap{max-width:100%;overflow:auto}.ca-attendance-table{width:100%;min-width:680px;border-collapse:collapse;background:#fff;font-size:11px}.ca-attendance-table th,.ca-attendance-table td{padding:12px 13px;border-bottom:1px solid #eee3de;text-align:left;vertical-align:middle}.ca-attendance-table th{background:#faf6f3;color:#776860;font-size:10px}.ca-attendance-table tr:last-child td{border-bottom:0}.ca-attendance-table .empty{padding:30px;text-align:center;color:#93847d}
    .ca-attendance-pill{display:inline-flex;min-height:26px;align-items:center;border-radius:999px;background:#eaf5ed;padding:0 9px;color:#397052;font-size:10px;font-weight:900;white-space:nowrap}.ca-attendance-pill.open{background:#fff0e8;color:#a34d38}.ca-attendance-pill.break{background:#eef1fb;color:#4d5e95}.ca-attendance-pill.overdue{background:#fff0e8;color:#9c392a}
    .ca-history-card{padding:0}.ca-history-toolbar{display:grid;grid-template-columns:minmax(190px,1fr) auto;align-items:end;gap:12px;border-bottom:1px solid #eadfd9;padding:18px 20px}.ca-history-toolbar label{display:grid;gap:7px}.ca-history-toolbar label span{color:#74645e;font-size:10px;font-weight:900}.ca-month-control{display:grid;grid-template-columns:42px minmax(140px,170px) 42px;gap:6px}.ca-icon-button{display:grid;width:42px;height:42px;place-items:center;border:1px solid #dfcec6;border-radius:6px;background:#fff;color:#775a50;cursor:pointer}.ca-icon-button:hover{background:#fbf4f0}.ca-icon-button svg{width:18px;height:18px}
    .ca-history-workspace{display:grid;grid-template-columns:minmax(650px,1.65fr) minmax(300px,.8fr);min-height:610px}.ca-calendar-pane{min-width:0;padding:18px 20px}.ca-calendar-scroll{overflow-x:auto}.ca-calendar{display:grid;min-width:650px;grid-template-columns:repeat(7,minmax(82px,1fr));gap:1px;overflow:hidden;border:1px solid #e4d6cf;border-radius:6px;background:#e9ddd7}.ca-calendar-weekday{display:grid;height:34px;place-items:center;background:#faf6f3;color:#75655e;font-size:10px;font-weight:900}.ca-calendar-weekday.weekend{color:#a74e5c}.ca-calendar-blank{height:88px;background:#fbf9f7}.ca-calendar-day{display:grid;height:88px;grid-template-rows:auto 1fr;gap:7px;border:0;background:#fff;padding:9px;text-align:left;cursor:pointer}.ca-calendar-day:hover{background:#fff8f5}.ca-calendar-day.is-selected{outline:2px solid #aa5263;outline-offset:-2px;background:#fff5f6}.ca-calendar-day.is-today time{display:grid;width:24px;height:24px;place-items:center;border-radius:50%;background:#a94e62;color:#fff}.ca-calendar-day.is-weekend:not(.is-today) time{color:#a34f5b}.ca-calendar-day time{font-size:11px;font-weight:900;font-variant-numeric:tabular-nums}.ca-calendar-summary{align-self:end;min-width:0}.ca-calendar-summary strong,.ca-calendar-summary span{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ca-calendar-summary strong{font-size:11px}.ca-calendar-summary span{margin-top:2px;color:#887871;font-size:9px}.ca-calendar-summary.open strong{color:#a13e31}
    .ca-day-editor{min-width:0;border-left:1px solid #eadfd9;background:#fcfaf8;padding:20px}.ca-day-editor-header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding-bottom:14px;border-bottom:1px solid #e8dcd6}.ca-day-editor-header h2{margin:0;font-size:16px}.ca-day-editor-header p{margin:5px 0 0;color:#7f7069;font-size:10px}.ca-day-total{text-align:right}.ca-day-total strong{display:block;font-size:16px}.ca-day-total span{color:#887971;font-size:9px}
    .ca-record-list{display:grid}.ca-record-row{display:grid;gap:10px;border-bottom:1px solid #eadfd9;padding:16px 0}.ca-record-row:last-child{border-bottom:0}.ca-record-heading{display:flex;align-items:center;justify-content:space-between;gap:8px}.ca-record-heading strong{font-size:12px}.ca-record-heading span{color:#84746d;font-size:9px}.ca-record-fields{display:grid;grid-template-columns:1fr 1fr;gap:8px}.ca-field{display:grid;gap:6px;min-width:0}.ca-field input{min-width:0;padding:0 8px;font-size:10px;font-variant-numeric:tabular-nums}.ca-record-meta{display:flex;align-items:center;justify-content:space-between;gap:8px;color:#84756e;font-size:9px}.ca-record-save{min-height:38px;box-shadow:none}.ca-add-shift{width:100%;margin-top:12px;border:1px solid #d7b9ae;background:#fff;color:#944b3f;box-shadow:none}.ca-new-record[hidden]{display:none}.ca-day-empty{padding:40px 0;text-align:center;color:#8b7b74;font-size:11px}
    .ca-policy-grid{display:grid;gap:0}.ca-policy-row{display:grid;grid-template-columns:minmax(160px,1fr) 120px 20px 120px 100px;align-items:center;gap:9px;border-bottom:1px solid #eee3de;padding:12px 0}.ca-policy-row:last-child{border-bottom:0}.ca-policy-save{min-height:40px;border:1px solid #d6b8ad;background:#fff;color:#904a3e;box-shadow:none}
    .ca-product-image-upload{grid-column:1/-1;display:grid;grid-template-columns:116px minmax(0,1fr);gap:16px;align-items:center;border:1px dashed #dbbbb0;border-radius:8px;background:#fff9f6;padding:16px}.ca-product-image-preview{display:grid;width:116px;height:116px;place-items:center;overflow:hidden;border:1px solid #e7d8d1;border-radius:8px;background:#fff;color:#b69588}.ca-product-image-preview img{width:100%;height:100%;object-fit:contain}.ca-product-image-preview svg{width:34px;height:34px}.ca-product-image-copy strong{display:block;font-size:13px}.ca-product-image-copy p{margin:6px 0 10px;color:#87746c;font-size:10px;line-height:1.7}.ca-product-image-picker{display:inline-flex;min-height:40px;align-items:center;gap:8px;border:1px solid #d7bbb0;border-radius:6px;background:#fff;padding:0 13px;color:#8f493d;font-size:11px;font-weight:900;cursor:pointer}.ca-product-image-picker svg{width:17px;height:17px}.ca-product-image-error{display:block;margin-top:7px;color:#ac3e3e;font-size:10px;font-weight:800}.ca-product-uploaded-thumb{width:58px;height:58px;object-fit:contain;border:1px solid #eaded8;border-radius:8px;background:#fff;padding:4px;margin-right:10px;vertical-align:middle}
    @media(max-width:1100px){.ca-history-workspace{grid-template-columns:1fr}.ca-day-editor{border-top:1px solid #eadfd9;border-left:0}.ca-history-toolbar{grid-template-columns:1fr 1fr}.ca-month-control{justify-self:end}}
    @media(max-width:800px){.ca-attendance-page{gap:12px}.ca-attendance-hero{min-height:0;align-items:flex-start;flex-direction:column;padding:18px}.ca-attendance-now{text-align:left}.ca-attendance-tabs{grid-template-columns:repeat(3,minmax(0,1fr))}.ca-attendance-tab{padding:0 5px;font-size:10px}.ca-attendance-grid{grid-template-columns:1fr}.ca-attendance-card{padding:16px}.ca-attendance-actions{grid-template-columns:1fr}.ca-history-toolbar{grid-template-columns:1fr;padding:15px}.ca-month-control{width:100%;grid-template-columns:42px 1fr 42px;justify-self:stretch}.ca-calendar-pane{padding:14px}.ca-day-editor{padding:16px}.ca-record-fields{grid-template-columns:1fr}.ca-policy-row{grid-template-columns:1fr 1fr 18px 1fr}.ca-policy-save{grid-column:1/-1}.ca-product-image-upload{grid-template-columns:84px 1fr}.ca-product-image-preview{width:84px;height:84px}}
  `
  document.head.appendChild(style)

  const formatTime = value => value ? new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit' }).format(new Date(value)) : '—'
  const formatDateTime = value => value ? new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value)) : '—'
  const formatDate = value => new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' }).format(new Date(value))
  const dateLabel = value => new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' }).format(new Date(`${value}T12:00:00+09:00`))
  const monthLabel = value => new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', year: 'numeric', month: 'long' }).format(new Date(`${value}-01T12:00:00+09:00`))
  const minutesLabel = value => {
    const minutes = Math.max(0, Number(value) || 0)
    const hours = Math.floor(minutes / 60)
    const rest = minutes % 60
    if (!hours) return `${rest}分`
    return rest ? `${hours}時間${rest}分` : `${hours}時間`
  }
  const toTokyoInput = value => {
    if (!value) return ''
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(value))
    const part = type => parts.find(item => item.type === type)?.value || ''
    return `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}`
  }
  const shiftMonth = (month, amount) => {
    const date = new Date(`${month}-01T12:00:00+09:00`)
    date.setMonth(date.getMonth() + amount)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
  }

  async function attendanceData(month) {
    const response = await fetch('/api/admin/attendance?month=' + encodeURIComponent(month || ''), { credentials: 'same-origin', cache: 'no-store' })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(payload.error || '出退勤情報を取得できませんでした。')
    return payload
  }

  async function postAttendance(body) {
    const response = await fetch('/api/admin/attendance', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(payload.error || '保存できませんでした。')
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
      node.textContent = node.dataset.caAttendanceOriginalText
      delete node.dataset.caAttendanceOriginalText
    })
  }

  function selectedStaffKey(data, history = false) {
    const people = data.people || []
    const globalKey = history ? window.__lienAttendanceHistoryStaffKey : window.__lienAttendanceStaffKey
    const key = people.some(person => person.staffKey === globalKey) ? globalKey : people[0]?.staffKey || ''
    if (history) window.__lienAttendanceHistoryStaffKey = key
    else window.__lienAttendanceStaffKey = key
    return key
  }

  function clockMarkup(data) {
    const staffKey = selectedStaffKey(data)
    const selectedRecord = (data.today || []).find(row => row.staffKey === staffKey)
    const working = Boolean(selectedRecord?.clockInAt && !selectedRecord?.clockOutAt)
    const onBreak = Boolean(working && selectedRecord?.breakStartedAt && !selectedRecord?.breakEndedAt)
    const finished = Boolean(selectedRecord?.clockOutAt)
    const overdue = Boolean(working && selectedRecord?.workDate && selectedRecord.workDate !== data.todayDate)
    const peopleOptions = (data.people || []).map(person => `<option value="${esc(person.staffKey)}" ${person.staffKey === staffKey ? 'selected' : ''}>${esc(person.displayName)}</option>`).join('')
    const overdueNotice = overdue ? `<div class="ca-attendance-overdue">${icon('clock')}<span>${esc(dateLabel(selectedRecord.workDate))}から未退勤です。退勤後、勤務実績から時刻を補正できます。</span></div>` : ''
    const latestStart = selectedRecord?.clockInAt ? (overdue ? formatDateTime(selectedRecord.clockInAt) : formatTime(selectedRecord.clockInAt)) : '—'
    const rows = (data.today || []).map(row => {
      const isOverdue = row.clockInAt && !row.clockOutAt && row.workDate !== data.todayDate
      const status = !row.clockInAt ? '未出勤' : row.clockOutAt ? '退勤' : row.breakStartedAt && !row.breakEndedAt ? '休憩中' : isOverdue ? '未退勤' : '出勤中'
      const statusClass = status === '出勤中' ? 'open' : status === '休憩中' ? 'break' : status === '未退勤' ? 'overdue' : ''
      return `<tr><td><strong>${esc(row.displayName)}</strong></td><td><span class="ca-attendance-pill ${statusClass}">${status}</span></td><td>${row.clockInAt ? esc(row.workDate || data.todayDate) : '—'}</td><td>${row.clockInAt ? esc(formatTime(row.clockInAt)) : '—'}</td><td>${esc(formatTime(row.clockOutAt))}</td><td><strong>${esc(minutesLabel(row.totalWorkMinutes))}</strong></td><td>${esc(minutesLabel(row.totalBreakMinutes))}</td></tr>`
    }).join('')
    return `<div class="ca-attendance-grid"><section class="ca-attendance-card"><h2>打刻</h2><p>本日の出勤状況</p><label class="ca-attendance-person"><span>スタッフ</span><select data-attendance-person>${peopleOptions}</select></label><div class="ca-attendance-status">${overdueNotice}<div class="ca-attendance-status-row"><strong>${finished ? '退勤済み・再出勤可能' : working ? onBreak ? '休憩中' : overdue ? '前日以前から勤務中' : '出勤中' : '未出勤'}</strong><time>${esc(latestStart)}</time></div><div class="ca-attendance-actions">${!working ? `<button type="button" class="ca-attendance-action" data-attendance-action="clock_in" ${staffKey ? '' : 'disabled'}>${icon('in')}出勤する</button>` : onBreak ? `<button type="button" class="ca-attendance-action secondary" data-attendance-action="break_end">${icon('in')}休憩から戻る</button>` : `<button type="button" class="ca-attendance-action secondary" data-attendance-action="break_start">${icon('clock')}休憩に入る</button>`}<button type="button" class="ca-attendance-action is-out" data-attendance-action="clock_out" ${working ? '' : 'disabled'}>${icon('out')}退勤する</button></div></div><div class="ca-attendance-feedback" data-attendance-clock-feedback role="status"></div></section><section class="ca-attendance-card"><h2>スタッフの最新状態</h2><p>${esc(data.todayDate)}</p><div class="ca-attendance-table-wrap"><table class="ca-attendance-table"><thead><tr><th>スタッフ</th><th>状況</th><th>勤務日</th><th>出勤</th><th>退勤</th><th>実働</th><th>休憩</th></tr></thead><tbody>${rows || '<tr><td colspan="7" class="empty">スタッフが登録されていません。</td></tr>'}</tbody></table></div></section></div>`
  }

  function calendarMarkup(data, staffKey, selectedDay) {
    const records = (data.records || []).filter(row => row.staffKey === staffKey)
    const byDay = new Map()
    for (const record of records) {
      if (!byDay.has(record.workDate)) byDay.set(record.workDate, [])
      byDay.get(record.workDate).push(record)
    }
    const first = new Date(`${data.month}-01T12:00:00+09:00`)
    const startOffset = (first.getDay() + 6) % 7
    const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
    const cells = []
    for (let index = 0; index < 42; index += 1) {
      const day = index - startOffset + 1
      if (day < 1 || day > days) {
        cells.push('<div class="ca-calendar-blank" aria-hidden="true"></div>')
        continue
      }
      const date = `${data.month}-${String(day).padStart(2, '0')}`
      const dayRecords = byDay.get(date) || []
      const total = dayRecords.reduce((sum, record) => sum + (Number(record.workMinutes) || 0), 0)
      const open = dayRecords.some(record => !record.clockOutAt)
      const weekend = index % 7 > 4
      const summary = dayRecords.length ? `<div class="ca-calendar-summary ${open ? 'open' : ''}"><strong>${open ? '勤務中' : esc(minutesLabel(total))}</strong><span>${dayRecords.length}回</span></div>` : '<div class="ca-calendar-summary" aria-hidden="true"></div>'
      cells.push(`<button type="button" class="ca-calendar-day ${date === selectedDay ? 'is-selected' : ''} ${date === data.todayDate ? 'is-today' : ''} ${weekend ? 'is-weekend' : ''}" data-attendance-day="${date}" aria-pressed="${date === selectedDay}"><time datetime="${date}">${day}</time>${summary}</button>`)
    }
    const weekdays = ['月', '火', '水', '木', '金', '土', '日'].map((day, index) => `<div class="ca-calendar-weekday ${index > 4 ? 'weekend' : ''}">${day}</div>`).join('')
    return `<div class="ca-calendar-scroll"><div class="ca-calendar">${weekdays}${cells.join('')}</div></div>`
  }

  function recordEditor(record, index) {
    const status = record.clockOutAt ? '確定' : '未退勤'
    return `<form class="ca-record-row" data-attendance-record-editor data-record-id="${esc(record.id)}"><div class="ca-record-heading"><strong>勤務 ${index + 1}</strong><span class="ca-attendance-pill ${record.clockOutAt ? '' : 'overdue'}">${status}</span></div><div class="ca-record-fields"><label class="ca-field"><span>出勤</span><input type="datetime-local" step="60" value="${esc(toTokyoInput(record.clockInAt))}" data-record-clock-in required></label><label class="ca-field"><span>退勤</span><input type="datetime-local" step="60" value="${esc(toTokyoInput(record.clockOutAt))}" data-record-clock-out required></label></div><div class="ca-record-meta"><span>休憩 ${esc(minutesLabel(record.breakMinutes))}</span><button type="submit" class="ca-record-save" data-attendance-save-record>${icon('save')}保存</button></div><div class="ca-attendance-feedback" role="status"></div></form>`
  }

  function historyMarkup(data) {
    const staffKey = selectedStaffKey(data, true)
    const desiredDay = String(window.__lienAttendanceDay || '')
    const selectedDay = desiredDay.startsWith(data.month + '-') ? desiredDay : (data.todayDate.startsWith(data.month + '-') ? data.todayDate : `${data.month}-01`)
    window.__lienAttendanceDay = selectedDay
    const staff = (data.people || []).find(person => person.staffKey === staffKey)
    const policies = new Map((data.policies || []).map(row => [row.staffKey || row.userId, row]))
    const policy = policies.get(staffKey) || { plannedStart: '10:00', plannedEnd: '19:00' }
    const records = (data.records || []).filter(row => row.staffKey === staffKey && row.workDate === selectedDay).sort((a, b) => new Date(a.clockInAt) - new Date(b.clockInAt))
    const totalWork = records.reduce((sum, row) => sum + (Number(row.workMinutes) || 0), 0)
    const totalBreak = records.reduce((sum, row) => sum + (Number(row.breakMinutes) || 0), 0)
    const peopleOptions = (data.people || []).map(person => `<option value="${esc(person.staffKey)}" ${person.staffKey === staffKey ? 'selected' : ''}>${esc(person.displayName)}</option>`).join('')
    const recordRows = records.length ? records.map(recordEditor).join('') : '<div class="ca-day-empty">勤務記録はありません。</div>'
    const newRecord = `<form class="ca-record-row ca-new-record" data-attendance-record-editor data-record-id="" hidden><div class="ca-record-heading"><strong>勤務を追加</strong><span>手動入力</span></div><div class="ca-record-fields"><label class="ca-field"><span>出勤</span><input type="datetime-local" step="60" value="${esc(`${selectedDay}T${policy.plannedStart}`)}" data-record-clock-in required></label><label class="ca-field"><span>退勤</span><input type="datetime-local" step="60" value="${esc(`${selectedDay}T${policy.plannedEnd}`)}" data-record-clock-out required></label></div><div class="ca-record-meta"><span>休憩なしで追加</span><button type="submit" class="ca-record-save" data-attendance-save-record>${icon('save')}追加</button></div><div class="ca-attendance-feedback" role="status"></div></form>`
    return `<section class="ca-attendance-card ca-history-card"><div class="ca-history-toolbar"><label><span>スタッフ</span><select data-attendance-history-person>${peopleOptions}</select></label><div class="ca-month-control"><button type="button" class="ca-icon-button" data-attendance-month-step="-1" title="前の月" aria-label="前の月">${icon('left')}</button><input type="month" value="${esc(data.month)}" data-attendance-month aria-label="表示月"><button type="button" class="ca-icon-button" data-attendance-month-step="1" title="次の月" aria-label="次の月">${icon('right')}</button></div></div><div class="ca-history-workspace"><div class="ca-calendar-pane">${calendarMarkup(data, staffKey, selectedDay)}</div><aside class="ca-day-editor"><div class="ca-day-editor-header"><div><h2>${esc(dateLabel(selectedDay))}</h2><p>${esc(staff?.displayName || 'スタッフ')}</p></div><div class="ca-day-total"><strong>${esc(minutesLabel(totalWork))}</strong><span>休憩 ${esc(minutesLabel(totalBreak))}</span></div></div><div class="ca-record-list">${recordRows}${newRecord}</div><button type="button" class="ca-add-shift" data-attendance-add-shift>${icon('plus')}勤務を追加</button></aside></div></section>`
  }

  function policyMarkup(data) {
    const policies = new Map((data.policies || []).map(row => [row.staffKey || row.userId, row]))
    const rows = (data.people || []).map(person => {
      const policy = policies.get(person.staffKey) || { plannedStart: '10:00', plannedEnd: '19:00' }
      return `<div class="ca-policy-row"><strong>${esc(person.displayName)}</strong><input class="ca-policy-time" type="time" value="${esc(policy.plannedStart)}" data-policy-start><span>〜</span><input class="ca-policy-time" type="time" value="${esc(policy.plannedEnd)}" data-policy-end><button class="ca-policy-save" type="button" data-policy-save="${esc(person.staffKey)}">保存</button></div>`
    }).join('')
    return data.canViewAll ? `<section class="ca-attendance-card"><h2>標準勤務時間</h2><p>スタッフ別の始業・終業時刻</p><div class="ca-policy-grid">${rows}</div><div class="ca-attendance-feedback" data-policy-feedback role="status"></div></section>` : '<section class="ca-attendance-card"><h2>標準勤務時間</h2><p>変更はオーナーへ依頼してください。</p></section>'
  }

  function attendanceMarkup(data, view) {
    const content = view === 'history' ? historyMarkup(data) : view === 'policy' ? policyMarkup(data) : clockMarkup(data)
    return `<section class="ca-attendance-hero"><div><span class="ca-attendance-eyebrow">Staff attendance</span><h1>出退勤管理</h1></div><div class="ca-attendance-now"><strong data-attendance-clock>${esc(formatTime(data.serverTime))}</strong><span>${esc(formatDate(data.serverTime))}</span></div></section><nav class="ca-attendance-tabs" aria-label="出退勤管理"><button class="ca-attendance-tab ${view === 'clock' ? 'is-active' : ''}" data-attendance-view="clock">${icon('clock')}打刻</button><button class="ca-attendance-tab ${view === 'history' ? 'is-active' : ''}" data-attendance-view="history">${icon('calendar')}勤務実績</button><button class="ca-attendance-tab ${view === 'policy' ? 'is-active' : ''}" data-attendance-view="policy">${icon('save')}標準時間</button></nav>${content}`
  }

  function bindAttendanceEvents(root, data, view) {
    root.querySelectorAll('[data-attendance-view]').forEach(button => button.addEventListener('click', () => renderAttendance(data.month, button.dataset.attendanceView)))
    root.querySelector('[data-attendance-person]')?.addEventListener('change', event => {
      window.__lienAttendanceStaffKey = event.currentTarget.value
      renderAttendance(data.month, view)
    })
    root.querySelector('[data-attendance-history-person]')?.addEventListener('change', event => {
      window.__lienAttendanceHistoryStaffKey = event.currentTarget.value
      renderAttendance(data.month, view)
    })
    root.querySelector('[data-attendance-month]')?.addEventListener('change', event => {
      window.__lienAttendanceDay = `${event.currentTarget.value}-01`
      renderAttendance(event.currentTarget.value, view)
    })
    root.querySelectorAll('[data-attendance-month-step]').forEach(button => button.addEventListener('click', () => {
      const month = shiftMonth(data.month, Number(button.dataset.attendanceMonthStep) || 0)
      window.__lienAttendanceDay = `${month}-01`
      renderAttendance(month, view)
    }))
    root.querySelectorAll('[data-attendance-day]').forEach(button => button.addEventListener('click', () => {
      window.__lienAttendanceDay = button.dataset.attendanceDay
      renderAttendance(data.month, view)
    }))
    root.querySelector('[data-attendance-add-shift]')?.addEventListener('click', event => {
      const form = root.querySelector('.ca-new-record')
      if (!form) return
      form.hidden = !form.hidden
      event.currentTarget.setAttribute('aria-expanded', String(!form.hidden))
      if (!form.hidden) form.querySelector('input')?.focus()
    })
    root.querySelectorAll('[data-attendance-action]').forEach(button => button.addEventListener('click', async () => {
      const feedback = root.querySelector('[data-attendance-clock-feedback]')
      button.disabled = true
      if (feedback) feedback.textContent = '記録しています…'
      try {
        await postAttendance({ action: button.dataset.attendanceAction, staffKey: window.__lienAttendanceStaffKey })
        await renderAttendance(data.month, view)
      } catch (error) {
        if (feedback) feedback.textContent = error.message
        button.disabled = false
      }
    }))
    root.querySelectorAll('[data-attendance-record-editor]').forEach(form => form.addEventListener('submit', async event => {
      event.preventDefault()
      if (!form.reportValidity()) return
      const button = form.querySelector('[data-attendance-save-record]')
      const feedback = form.querySelector('.ca-attendance-feedback')
      button.disabled = true
      feedback.textContent = '保存しています…'
      try {
        const result = await postAttendance({
          action: 'save_record',
          staffKey: window.__lienAttendanceHistoryStaffKey,
          recordId: form.dataset.recordId || '',
          clockInLocal: form.querySelector('[data-record-clock-in]').value,
          clockOutLocal: form.querySelector('[data-record-clock-out]').value,
        })
        window.__lienAttendanceFlash = result.message
        window.__lienAttendanceDay = form.querySelector('[data-record-clock-in]').value.slice(0, 10)
        await renderAttendance(data.month, view)
      } catch (error) {
        feedback.textContent = error.message
        button.disabled = false
      }
    }))
    root.querySelectorAll('[data-policy-save]').forEach(button => button.addEventListener('click', async () => {
      const row = button.closest('.ca-policy-row')
      const feedback = root.querySelector('[data-policy-feedback]')
      button.disabled = true
      if (feedback) feedback.textContent = '保存しています…'
      try {
        const result = await postAttendance({ action: 'save_policy', staffKey: button.dataset.policySave, plannedStart: row.querySelector('[data-policy-start]').value, plannedEnd: row.querySelector('[data-policy-end]').value })
        if (feedback) feedback.textContent = result.message
        button.disabled = false
      } catch (error) {
        if (feedback) feedback.textContent = error.message
        button.disabled = false
      }
    }))
    if (window.__lienAttendanceFlash) {
      const target = root.querySelector('.ca-day-editor .ca-attendance-feedback') || root.querySelector('.ca-attendance-feedback')
      if (target) target.textContent = window.__lienAttendanceFlash
      window.__lienAttendanceFlash = ''
    }
  }

  async function renderAttendance(month, view = window.__lienAttendanceView || 'clock') {
    if (!isAttendanceRoute()) {
      cleanupAttendancePage()
      return
    }
    const main = document.querySelector('main')
    if (!main) return
    let root = main.querySelector('[data-ca-attendance-page]')
    if (!root) {
      Array.from(main.children).forEach(node => {
        node.hidden = true
        node.style.display = 'none'
        node.dataset.caAttendanceHidden = '1'
      })
      root = document.createElement('div')
      root.className = 'ca-attendance-page'
      root.dataset.caAttendancePage = '1'
      main.appendChild(root)
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
      bindAttendanceEvents(root, data, view)
    } catch (error) {
      root.innerHTML = `<section class="ca-attendance-card"><h2>出退勤情報を表示できません</h2><p>${esc(error.message)}</p></section>`
    }
  }

  /* __LIEN_EXISTING_PRODUCT_TAIL__ */
  function setupProductImage() {}
})()
