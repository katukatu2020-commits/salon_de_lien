  function dealerCalendarDateKey(now) {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(now || new Date())
    const value = function (type) { return parts.find(function (part) { return part.type === type })?.value || '' }
    return value('year') + '-' + value('month') + '-' + value('day')
  }

  function normalizedDealerCalendarMonth(value) {
    const monthKey = String(value || '')
    return /^\d{4}-(0[1-9]|1[0-2])$/.test(monthKey) ? monthKey : dealerCalendarDateKey().slice(0, 7)
  }

  function shiftedDealerCalendarMonth(monthKey, offset) {
    const normalized = normalizedDealerCalendarMonth(monthKey)
    const parts = normalized.split('-').map(Number)
    const shifted = new Date(Date.UTC(parts[0], parts[1] - 1 + offset, 1))
    return shifted.getUTCFullYear() + '-' + String(shifted.getUTCMonth() + 1).padStart(2, '0')
  }

  function syncDealerCalendarUrl() {
    if (dealer.view !== 'calendar') return
    const url = new URL(location.href)
    const currentMonth = dealerCalendarDateKey().slice(0, 7)
    url.searchParams.delete('month')
    if (dealer.calendarMonth && dealer.calendarMonth !== currentMonth) url.searchParams.set('month', dealer.calendarMonth)
    history.replaceState(null, '', url)
  }

  function compactCalendarYen(value) {
    const amount = Number(value || 0)
    if (amount >= 100000000) return (Math.round(amount / 10000000) / 10).toLocaleString('ja-JP') + '億'
    if (amount >= 10000) return (Math.round(amount / 1000) / 10).toLocaleString('ja-JP') + '万'
    return amount.toLocaleString('ja-JP')
  }

  function dealerCalendarGrid(calendar) {
    const daily = new Map(calendar.days.map(function (day) { return [day.date, day] }))
    const firstWeekday = new Date(Date.UTC(calendar.year, calendar.month - 1, 1)).getUTCDay()
    const daysInMonth = new Date(Date.UTC(calendar.year, calendar.month, 0)).getUTCDate()
    const todayKey = dealerCalendarDateKey()
    const cells = []
    for (let index = 0; index < firstWeekday; index += 1) {
      cells.push('<div class="wo-calendar-day-v658 is-outside" aria-hidden="true"></div>')
    }
    for (let dayNumber = 1; dayNumber <= daysInMonth; dayNumber += 1) {
      const dayKey = calendar.monthKey + '-' + String(dayNumber).padStart(2, '0')
      const item = daily.get(dayKey) || { invoiceCount:0, forecastYen:0 }
      const weekday = (firstWeekday + dayNumber - 1) % 7
      const classes = ['wo-calendar-day-v658']
      if (weekday === 0) classes.push('is-sunday')
      if (weekday === 6) classes.push('is-saturday')
      if (dayKey === todayKey) classes.push('is-today')
      if (item.invoiceCount) classes.push('has-orders')
      const detail = item.invoiceCount
        ? '<div class="wo-calendar-day-metrics-v658"><span>' + Number(item.invoiceCount).toLocaleString('ja-JP') + '<b>伝票</b></span><strong><span class="wo-calendar-full-yen-v658">' + yen(item.forecastYen) + '</span><span class="wo-calendar-compact-yen-v658">' + compactCalendarYen(item.forecastYen) + '</span></strong></div>'
        : '<span class="wo-calendar-no-orders-v658">予定なし</span>'
      cells.push('<article class="' + classes.join(' ') + '" aria-label="' + calendar.month + '月' + dayNumber + '日、' + Number(item.invoiceCount) + '伝票、売上見込み' + yen(item.forecastYen) + '"><time datetime="' + dayKey + '">' + dayNumber + '</time>' + detail + '</article>')
    }
    while (cells.length % 7) cells.push('<div class="wo-calendar-day-v658 is-outside" aria-hidden="true"></div>')
    return cells.join('')
  }

  function dealerCalendar() {
    const calendar = dealer.calendar
    if (!calendar) return '<div class="wo-loading"><span></span><p>売上カレンダーを読み込んでいます</p></div>'
    const previousMonth = shiftedDealerCalendarMonth(calendar.monthKey, -1)
    const nextMonth = shiftedDealerCalendarMonth(calendar.monthKey, 1)
    const progress = calendar.salesTargetYen > 0 ? Math.round(calendar.monthlyForecastYen / calendar.salesTargetYen * 100) : 0
    const progressWidth = Math.max(0, Math.min(100, progress))
    const progressCopy = calendar.salesTargetYen > 0
      ? '目標達成率 ' + progress.toLocaleString('ja-JP') + '%'
      : '目標売上を入力すると達成率を表示します'
    return '<section class="wo-workspace wo-dealer-calendar-v658"><header class="wo-calendar-head-v658"><div><p class="wo-section-label">MONTHLY SALES CALENDAR</p><h2>売上カレンダー</h2><p>受注した伝票を注文日ごとに集計しています。キャンセル済みの注文は見込み額に含みません。</p></div><nav class="wo-calendar-month-nav-v658" aria-label="表示月を変更"><button type="button" data-action="dealer-calendar-month" data-month="' + previousMonth + '" aria-label="前の月を表示">' + icon('chevron') + '</button><strong><small>' + calendar.year + '年</small>' + calendar.month + '月</strong><button type="button" class="is-next" data-action="dealer-calendar-month" data-month="' + nextMonth + '" aria-label="次の月を表示">' + icon('chevron') + '</button></nav></header>' +
      '<div class="wo-calendar-kpis-v658"><article class="is-forecast"><span>' + icon('chart') + '<b>月間売上見込み</b><small>自動集計・税込</small></span><strong>' + yen(calendar.monthlyForecastYen) + '</strong><p>' + Number(calendar.invoiceCount).toLocaleString('ja-JP') + '伝票</p></article><form id="dealer-calendar-plan-form" class="wo-calendar-plan-v658"><input type="hidden" name="monthKey" value="' + esc(calendar.monthKey) + '"><label><span><b>目標売上</b><small>手動</small></span><span class="wo-calendar-input-v658"><b>¥</b><input name="salesTargetYen" type="number" min="0" max="1000000000000" step="1" inputmode="numeric" value="' + Number(calendar.salesTargetYen) + '" aria-label="' + calendar.month + '月の目標売上"></span></label><label><span><b>新規獲得件数</b><small>手動</small></span><span class="wo-calendar-input-v658"><input name="newAcquisitionCount" type="number" min="0" max="999999" step="1" inputmode="numeric" value="' + Number(calendar.newAcquisitionCount) + '" aria-label="' + calendar.month + '月の新規獲得件数"><b>件</b></span></label><button class="wo-button wo-button-primary" type="submit">' + icon('check') + '目標を保存</button></form></div>' +
      '<div class="wo-calendar-progress-v658"><div><span>売上見込み / 目標売上</span><strong>' + esc(progressCopy) + '</strong></div><span class="wo-calendar-progress-track-v658"><i style="width:' + progressWidth + '%"></i></span></div>' +
      '<div class="wo-calendar-scroll-v658"><div class="wo-calendar-grid-v658" role="grid" aria-label="' + calendar.year + '年' + calendar.month + '月の売上見込み"><div class="wo-calendar-week-v658 is-sunday" role="columnheader">日</div><div class="wo-calendar-week-v658" role="columnheader">月</div><div class="wo-calendar-week-v658" role="columnheader">火</div><div class="wo-calendar-week-v658" role="columnheader">水</div><div class="wo-calendar-week-v658" role="columnheader">木</div><div class="wo-calendar-week-v658" role="columnheader">金</div><div class="wo-calendar-week-v658 is-saturday" role="columnheader">土</div>' + dealerCalendarGrid(calendar) + '</div></div></section>'
  }

  async function saveDealerCalendarPlan(form) {
    if (dealer.busy) return
    dealer.busy = true
    const button = form.querySelector('button[type="submit"]')
    button.disabled = true
    try {
      const result = await post('/api/dealer/calendar/targets', Object.fromEntries(new FormData(form).entries()))
      dealer.calendar = result.calendar
      dealer.calendarMonth = result.calendar.monthKey
      syncDealerCalendarUrl()
      renderDealer()
      notify(result.calendar.month + '月の目標を保存しました。')
    } catch (error) {
      notify(error.message, 'error')
      button.disabled = false
    } finally {
      dealer.busy = false
    }
  }
