  function workUrlV704(month, date = '') {
    return '/admin/account?panel=attendance&view=policy&workMonth=' + encodeURIComponent(month) + (date ? '&workDate=' + encodeURIComponent(date) : '')
  }
  function workTimeV704(minutes) {
    return String(Math.floor(minutes / 60) % 24).padStart(2, '0') + ':' + String(minutes % 60).padStart(2, '0')
  }
  function policyMarkup(data) {
    const plan = data.workCalendar
    if (!plan) return '<p role="alert">勤務予定を取得できませんでした。</p>'
    const selected = new URLSearchParams(location.search).get('workDate')
    const day = plan.days.find(day => day.date === selected)
    if (day) {
      const disabled = !plan.canEdit || !day.editable
      return `<section class="work-day-v704"><div class="work-heading-v704"><div><h2>${esc(dateLabel(day.date))}の勤務予定</h2><p>${day.storeClosed ? '店舗休業日' : '店舗営業時間 ' + workTimeV704(day.openMinutes) + '〜' + workTimeV704(day.closeMinutes)}</p></div><a class="ca-icon-button" href="${workUrlV704(plan.month)}" title="カレンダーへ戻る" aria-label="カレンダーへ戻る">${icon('left')}</a></div>
      ${!plan.canEdit ? '<p>勤務予定はオーナーのみ変更できます。</p>' : !day.editable ? '<p>この日付は編集できません。</p>' : ''}
      <form data-work-form-v704 data-work-date="${day.date}">
      <div class="work-staff-list-v704">${day.staff.map(row => `<div class="work-staff-row-v704" data-work-staff="${esc(row.staffKey)}">
        <div><strong>${esc(row.staffName)}</strong><small>${row.isDayOff ? '休日' : workTimeV704(row.workStartMinutes) + '〜' + workTimeV704(row.workEndMinutes)}</small></div>
        <label><span>勤務区分</span><select data-work-mode ${disabled ? 'disabled' : ''} aria-label="${esc(row.staffName)}の勤務区分">${[['default', '標準設定'], ['work', '出勤'], ['off', '休日']].map(([value, label]) => `<option value="${value}" ${value === row.mode ? 'selected' : ''}>${label}</option>`).join('')}</select></label>
        <label><span>開始</span><input type="time" step="300" data-work-start value="${workTimeV704(row.plannedStartMinutes)}" ${disabled || row.mode !== 'work' ? 'disabled' : ''} required aria-label="${esc(row.staffName)}の開始時刻"></label>
        <label><span>終了</span><input type="time" step="300" data-work-end value="${workTimeV704(row.plannedEndMinutes)}" ${disabled || row.mode !== 'work' ? 'disabled' : ''} required aria-label="${esc(row.staffName)}の終了時刻"></label>
      </div>`).join('') || '<p>登録されたスタッフがいません。</p>'}</div>
      <div class="work-actions-v704"><p role="status" data-work-feedback></p>${!disabled && day.staff.length ? `<button type="submit" class="ca-record-save">${icon('save')}勤務予定を保存</button>` : ''}</div></form>
      <div class="work-links-v704"><a href="/admin/appointments?date=${day.date}&month=${plan.month}#staff-schedule">予約・シフト表</a></div></section>`
    }
    const startWeekday = new Date(plan.month + '-01T00:00:00Z').getUTCDay()
    const previous = shiftMonth(plan.month, -1), next = shiftMonth(plan.month, 1)
    return `<section class="work-calendar-v704"><div class="work-heading-v704"><div><h2>勤務予定カレンダー</h2><p>登録可能期間 ${esc(plan.today)}〜${esc(plan.maximumDate)}</p></div><div class="work-month-v704">
      ${previous >= plan.today.slice(0, 7) ? `<a class="ca-icon-button" aria-label="前の月" title="前の月" href="${workUrlV704(previous)}">${icon('left')}</a>` : '<span></span>'}
      <strong>${Number(plan.month.slice(0, 4))}年${Number(plan.month.slice(5))}月</strong>
      ${next <= plan.maximumDate.slice(0, 7) ? `<a class="ca-icon-button" aria-label="次の月" title="次の月" href="${workUrlV704(next)}">${icon('right')}</a>` : '<span></span>'}</div></div>
      <div class="work-grid-v704">${['日', '月', '火', '水', '木', '金', '土'].map(name => `<div class="work-weekday-v704">${name}</div>`).join('')}${'<div class="work-empty-v704"></div>'.repeat(startWeekday)}
      ${plan.days.map(day => `<a href="${workUrlV704(plan.month, day.date)}" class="work-cell-v704 ${day.editable ? '' : 'is-outside'} ${day.storeClosed ? 'is-closed' : ''} ${day.date === plan.today ? 'is-today' : ''}" aria-label="${day.date} 出勤${day.working}人 休日${day.off}人${day.storeClosed ? ' 店舗休業日' : ''}"><time datetime="${day.date}">${Number(day.date.slice(-2))}</time><span>出勤 <b>${day.working}</b></span><small>休日 ${day.off}</small>${day.storeClosed ? '<em>店休日</em>' : ''}</a>`).join('')}</div></section>
      <details class="work-defaults-v704"><summary>基本の勤務時間</summary>${basePolicyMarkupV704(data)}</details>`
  }
  function bindWorkCalendarV704(root, data) {
    const form = root.querySelector('[data-work-form-v704]')
    if (!form) return
    const day = data.workCalendar.days.find(day => day.date === form.dataset.workDate)
    form.querySelectorAll('[data-work-mode]').forEach(select => select.addEventListener('change', () => {
      const row = select.closest('[data-work-staff]')
      row.querySelectorAll('input').forEach(input => { input.disabled = select.value !== 'work' })
    }))
    form.addEventListener('submit', async event => {
      event.preventDefault()
      if (form.dataset.saving) return
      const feedback = form.querySelector('[data-work-feedback]'), button = form.querySelector('button[type=submit]')
      const minutes = value => Number(value.slice(0, 2)) * 60 + Number(value.slice(3))
      const staff = [...form.querySelectorAll('[data-work-staff]')].map(row => ({ staffKey: row.dataset.workStaff, mode: row.querySelector('select').value, startMinutes: minutes(row.querySelector('[data-work-start]').value), endMinutes: minutes(row.querySelector('[data-work-end]').value) || 1440 }))
      form.dataset.saving = '1'; button.disabled = true; feedback.textContent = '保存しています…'
      try {
        const response = await fetch('/api/admin/staff-work-calendar', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date: day.date, revision: day.revision, staff }) })
        const payload = await response.json()
        if (!response.ok) throw new Error(payload.error || '保存できませんでした。')
        await renderAttendance(data.month, 'policy')
        const status = document.querySelector('[data-work-feedback]')
        if (status) status.textContent = '保存しました。'
      } catch (error) { feedback.textContent = error.message; feedback.setAttribute('role', 'alert') }
      finally { delete form.dataset.saving; button.disabled = false }
    })
  }
