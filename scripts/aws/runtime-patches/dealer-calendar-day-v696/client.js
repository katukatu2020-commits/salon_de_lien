  const calendarDayV696 = { dialog: null, date: '', orderPage: 1, activityPage: 1, request: 0, controller: null }
  const dayLabelsV696 = { VISIT:'営業訪問', DELIVERY:'納品', SUPPORT:'サロン対応', INTERNAL:'社内', PLANNED:'予定', DONE:'完了', CANCELLED:'取消', ORDERED:'未受注', ACCEPTED:'受注・分納中', SHIPPED:'出荷中', DELIVERED:'納品済み' }
  function dayStampV696(value, date) {
    const instant = new Date(value)
    const sameDay = dealerCalendarDateKey(instant) === date
    return new Intl.DateTimeFormat('ja-JP', Object.assign({ timeZone:'Asia/Tokyo', hour:'2-digit', minute:'2-digit' }, sameDay ? {} : { month:'numeric', day:'numeric' })).format(instant)
  }
  function dayPagerV696(data, key, label) {
    if (data.pages <= 1) return ''
    return '<nav class="cd-pager" aria-label="' + label + 'のページ"><button type="button" data-cd-page="' + key + '" data-number="' + (data.page - 1) + '" aria-label="' + label + 'の前ページ" ' + (data.page === 1 ? 'disabled' : '') + '>' + icon('chevron') + '</button><span>' + data.page + ' / ' + data.pages + '</span><button type="button" data-cd-page="' + key + '" data-number="' + (data.page + 1) + '" aria-label="' + label + 'の次ページ" ' + (data.page === data.pages ? 'disabled' : '') + '>' + icon('chevron') + '</button></nav>'
  }
  function dayContentV696(data) {
    const activities = data.activities, orders = data.orders
    const status = value => '<span class="cd-status' + (value === 'CANCELLED' ? ' is-cancelled' : '') + '">' + esc(dayLabelsV696[value] || value) + '</span>'
    const activitiesHtml = activities.rows.map(row => '<li class="cd-activity"><div class="cd-time"><time>' + esc(dayStampV696(row.startsAt, data.date)) + '</time><small>' + esc(dayStampV696(row.endsAt, data.date)) + ' 終了</small></div><div><div class="cd-row-title"><strong>' + esc(row.title) + '</strong>' + status(row.status) + '</div><p class="cd-destination">' + icon('shop') + esc(row.salon || '営業先指定なし') + '</p><p>' + icon('users') + esc(row.member || '担当者未設定') + (row.branch ? ' / ' + esc(row.branch) : '') + '<span class="cd-kind">' + esc(dayLabelsV696[row.kind] || row.kind) + '</span></p>' + (row.note ? '<p class="cd-note">' + esc(row.note) + '</p>' : '') + (row.result ? '<p class="cd-note"><b>活動結果</b> ' + esc(row.result) + '</p>' : '') + '</div></li>').join('')
    const ordersHtml = orders.rows.map(row => '<li class="cd-order"><div><div class="cd-row-title"><strong>' + esc(row.salon) + '</strong>' + status(row.status) + '</div><p>' + icon('users') + esc(row.member || '担当者未設定') + (row.branch ? ' / ' + esc(row.branch) : '') + '</p><small>' + esc(row.orderNo) + ' / 受付 ' + esc(dayStampV696(row.orderedAt, data.date)) + '</small></div><strong class="cd-amount">' + yen(row.totalYen) + '</strong></li>').join('')
    return '<div class="cd-summary"><div><span>予定・活動（取消除く）</span><strong>' + activities.activeCount + '<small>件</small></strong></div><div><span>受注伝票</span><strong>' + orders.total + '<small>件</small></strong></div><div><span>売上見込み（税込）</span><strong>' + yen(orders.forecastYen) + '</strong></div></div>' +
      '<section aria-labelledby="cd-activities-title"><header class="cd-section-head"><h3 id="cd-activities-title">営業予定・活動 <small>' + activities.total + '件</small></h3><a href="/dealer/activities?month=' + data.date.slice(0, 7) + '">' + icon('calendar') + '営業予定へ</a></header>' + (activities.total ? '<ul class="cd-list">' + activitiesHtml + '</ul>' : '<p class="cd-empty">この日の営業予定・活動はありません。</p>') + dayPagerV696(activities, 'activityPage', '営業予定') + '</section>' +
      '<section aria-labelledby="cd-orders-title"><header class="cd-section-head"><h3 id="cd-orders-title">受注 <small>' + orders.total + '件</small></h3><a href="/dealer/orders">' + icon('clipboard') + '受注管理へ</a></header><p class="cd-caption">締め切り時刻に基づく発注日で集計・キャンセルを除く</p>' + (orders.total ? '<ul class="cd-list">' + ordersHtml + '</ul>' : '<p class="cd-empty">この日の受注はありません。</p>') + dayPagerV696(orders, 'orderPage', '受注') + '</section>'
  }
  async function loadCalendarDayV696() {
    const state = calendarDayV696, dialog = state.dialog, request = ++state.request
    state.controller?.abort()
    const controller = new AbortController()
    state.controller = controller
    const body = dialog.querySelector('.cd-content')
    dialog.querySelector('#cd-title').textContent = new Intl.DateTimeFormat('ja-JP', { timeZone:'Asia/Tokyo', year:'numeric', month:'long', day:'numeric', weekday:'short' }).format(new Date(state.date + 'T00:00:00+09:00'))
    dialog.querySelector('[data-cd-day="-1"]').disabled = state.date === '2000-01-01'
    dialog.querySelector('[data-cd-day="1"]').disabled = state.date === '2099-12-31'
    body.setAttribute('aria-busy', 'true')
    body.innerHTML = '<p class="cd-empty" role="status">日別の予定と受注を読み込んでいます</p>'
    body.scrollTop = 0
    const timer = setTimeout(() => controller.abort(), 20000)
    try {
      const data = await api('/api/dealer/erp/calendar-day?' + new URLSearchParams({ date:state.date, orderPage:state.orderPage, activityPage:state.activityPage }), { signal:controller.signal })
      if (request !== state.request || !dialog.open) return
      body.innerHTML = dayContentV696(data)
    } catch (error) {
      if (request !== state.request || !dialog.open) return
      body.innerHTML = '<div class="cd-empty" role="alert"><p>' + esc(error.name === 'AbortError' ? '読み込みに時間がかかっています。再試行してください。' : error.message) + '</p><button type="button" class="wo-button wo-button-secondary" data-cd-retry>' + icon('history') + '再試行</button></div>'
    } finally {
      clearTimeout(timer)
      if (request === state.request) body.removeAttribute('aria-busy')
    }
  }
  function openCalendarDayV696(date) {
    const state = calendarDayV696
    if (!state.dialog) {
      const dialog = document.createElement('dialog')
      dialog.className = 'cd-dialog'
      dialog.setAttribute('aria-labelledby', 'cd-title')
      dialog.innerHTML = '<header class="cd-header"><div><span>日別の営業・受注</span><h2 id="cd-title"></h2></div><button type="button" data-cd-close aria-label="日別詳細を閉じる" title="閉じる" autofocus>' + icon('close') + '</button></header><nav class="cd-day-nav" aria-label="詳細の日付"><button type="button" data-cd-day="-1" aria-label="前日" title="前日">' + icon('chevron') + '</button><span>担当者・営業先・受注状況</span><button type="button" data-cd-day="1" aria-label="翌日" title="翌日">' + icon('chevron') + '</button></nav><div class="cd-content" tabindex="-1"></div>'
      document.body.appendChild(dialog)
      state.dialog = dialog
      dialog.addEventListener('close', () => { state.request++; state.controller?.abort(); document.body.classList.remove('cd-open') })
      dialog.addEventListener('click', event => {
        const button = event.target.closest('button')
        if (!button) return
        if (button.hasAttribute('data-cd-close')) return dialog.close()
        if (button.dataset.cdDay) {
          const next = new Date(state.date + 'T00:00:00Z')
          next.setUTCDate(next.getUTCDate() + Number(button.dataset.cdDay))
          state.date = next.toISOString().slice(0, 10)
          state.orderPage = state.activityPage = 1
        } else if (button.dataset.cdPage) {
          state[button.dataset.cdPage] = Number(button.dataset.number)
          dialog.querySelector('.cd-content').focus({ preventScroll:true })
        } else if (!button.hasAttribute('data-cd-retry')) return
        loadCalendarDayV696()
      })
    }
    state.date = date
    state.orderPage = state.activityPage = 1
    state.dialog.showModal()
    document.body.classList.add('cd-open')
    loadCalendarDayV696()
  }
  if (page === 'dealer') root.addEventListener('click', event => {
    const button = event.target.closest('[data-calendar-date]')
    if (button) openCalendarDayV696(button.dataset.calendarDate)
  })
