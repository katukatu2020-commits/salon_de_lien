'use strict'

/* render-block:start */
  const summaryDateLabel = value => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''))
    if (!match) return { date: value || '—', weekday: '' }
    const parsed = new Date(`${value}T12:00:00+09:00`)
    return {
      date: `${Number(match[2])}/${Number(match[3])}`,
      weekday: new Intl.DateTimeFormat('ja-JP', { timeZone:'Asia/Tokyo', weekday:'short' }).format(parsed),
    }
  }

  const detailDateLabel = value => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''))
    if (!match) return value || ''
    const label = summaryDateLabel(value)
    return `${Number(match[1])}年${Number(match[2])}月${Number(match[3])}日（${label.weekday}）`
  }

  const summaryMoney = value => Number(value || 0).toLocaleString('ja-JP')

  function detailRows() {
    if (!state.detailDate) return []
    return state.rows.filter(row => row.saleDate === state.detailDate)
  }

  function summaryCell(value, className = '') {
    return `<td class="sl-summary-number ${className}">${esc(summaryMoney(value))}</td>`
  }

  function openDetailDialog(root, saleDate) {
    const dialog = root.querySelector('[data-sl-detail-dialog]')
    if (!dialog || !saleDate) return
    state.detailDate = saleDate
    state.selected.clear()
    renderSummary(root)
    renderRows(root)
    if (!dialog.open) dialog.showModal()
    requestAnimationFrame(() => dialog.querySelector('[data-sl-detail-close]')?.focus({ preventScroll:true }))
  }

  function openDetailEdit(root, row, bulk = false) {
    const detailDialog = root.querySelector('[data-sl-detail-dialog]')
    state.reopenDetailAfterEdit = Boolean(detailDialog?.open)
    if (detailDialog?.open) {
      detailDialog.dataset.preserveState = '1'
      detailDialog.close()
    }
    openEdit(root, row, bulk)
  }

  function renderSummary(root) {
    const summary = state.summary || { days: [], totals: {}, staff: [] }
    const days = Array.isArray(summary.days) ? summary.days : []
    const totals = summary.totals || {}
    const staff = Array.isArray(summary.staff) ? summary.staff : []
    const table = root.querySelector('[data-sl-summary-table]')
    const head = root.querySelector('[data-sl-summary-head]')
    const body = root.querySelector('[data-sl-summary-rows]')
    const foot = root.querySelector('[data-sl-summary-total]')
    const staffHeaders = staff.map(name => `<th class="sl-th-staff sl-staff-col" title="${esc(name)}">${esc(name)}</th>`).join('')
    head.innerHTML = `<tr><th class="sl-th-date">日付</th><th class="sl-th-count">会計</th><th class="sl-th-sales">施術</th><th class="sl-th-sales">店販</th><th class="sl-th-discount">値引</th><th class="sl-th-tax">税抜合計</th><th class="sl-th-tax">消費税</th><th class="sl-th-total">税込合計</th><th class="sl-th-fee">指名料</th><th class="sl-th-fee">送料</th><th class="sl-th-discount">ポイント</th><th class="sl-th-payment">現金</th><th class="sl-th-payment">カード</th><th class="sl-th-payment">電子マネー</th><th class="sl-th-payment">QR決済</th><th class="sl-th-payment">その他</th>${staffHeaders}</tr>`
    table.style.minWidth = `${1540 + staff.length * 112}px`
    root.querySelector('[data-sl-summary-period]').textContent = selectedPeriodLabel(root)
    root.querySelector('[data-sl-kpi-total]').textContent = yen(totals.grossTotal)
    root.querySelector('[data-sl-kpi-service]').textContent = yen(totals.serviceTotal)
    root.querySelector('[data-sl-kpi-product]').textContent = yen(totals.productTotal)
    root.querySelector('[data-sl-kpi-count]').textContent = `${Number(totals.transactions || 0).toLocaleString('ja-JP')}件`
    root.querySelector('[data-sl-print]').disabled = !days.length
    if (!days.length) {
      body.innerHTML = `<tr><td colspan="${16 + staff.length}" class="sl-empty">条件に一致する売上がありません。</td></tr>`
      foot.innerHTML = ''
      return
    }
    body.innerHTML = days.map(day => {
      const label = summaryDateLabel(day.date)
      const staffCells = staff.map(name => summaryCell(day.staffSales?.[name] || 0, 'sl-staff-col')).join('')
      const expanded = state.detailDate === day.date
      return `<tr data-summary-date="${esc(day.date)}" class="${expanded ? 'active' : ''}"><td class="sl-summary-date"><button type="button" data-summary-day aria-label="${esc(day.date)}の決済明細を表示" aria-haspopup="dialog" aria-controls="sl-payment-detail-dialog" aria-expanded="${expanded}"><strong>${esc(label.date)}</strong><span>${esc(label.weekday)}</span></button></td><td class="sl-summary-count">${Number(day.transactions || 0).toLocaleString('ja-JP')}件</td>${summaryCell(day.serviceTotal)}${summaryCell(day.productTotal)}${summaryCell(day.couponDiscount, 'sl-negative')}${summaryCell(day.netTotal)}${summaryCell(day.includedTax)}${summaryCell(day.grossTotal, 'sl-summary-gross')}${summaryCell(day.nominationFee)}${summaryCell(day.shippingFee)}${summaryCell(day.pointDiscount, 'sl-negative')}${summaryCell(day.payments?.cash)}${summaryCell(day.payments?.card)}${summaryCell(day.payments?.electronic)}${summaryCell(day.payments?.qr)}${summaryCell(day.payments?.other)}${staffCells}</tr>`
    }).join('')
    const totalStaffCells = staff.map(name => summaryCell(totals.staffSales?.[name] || 0, 'sl-staff-col')).join('')
    foot.innerHTML = `<tr><th>月間合計</th><td class="sl-summary-count">${Number(totals.transactions || 0).toLocaleString('ja-JP')}件</td>${summaryCell(totals.serviceTotal)}${summaryCell(totals.productTotal)}${summaryCell(totals.couponDiscount, 'sl-negative')}${summaryCell(totals.netTotal)}${summaryCell(totals.includedTax)}${summaryCell(totals.grossTotal, 'sl-summary-gross')}${summaryCell(totals.nominationFee)}${summaryCell(totals.shippingFee)}${summaryCell(totals.pointDiscount, 'sl-negative')}${summaryCell(totals.payments?.cash)}${summaryCell(totals.payments?.card)}${summaryCell(totals.payments?.electronic)}${summaryCell(totals.payments?.qr)}${summaryCell(totals.payments?.other)}${totalStaffCells}</tr>`
    body.querySelectorAll('[data-summary-day]').forEach(button => button.addEventListener('click', () => {
      openDetailDialog(root, button.closest('tr').dataset.summaryDate)
    }))
  }

  function renderRows(root) {
    const rows = detailRows()
    const body = root.querySelector('[data-sl-rows]')
    root.querySelector('[data-sl-count]').textContent = `${rows.length.toLocaleString('ja-JP')}件`
    root.querySelector('[data-sl-selected]').textContent = `${state.selected.size}件選択`
    root.querySelector('[data-sl-bulk]').disabled = !state.selected.size
    const selectAll = root.querySelector('[data-select-all]')
    selectAll.checked = Boolean(rows.length) && rows.every(row => state.selected.has(row.id))
    selectAll.indeterminate = state.selected.size > 0 && !selectAll.checked
    root.querySelector('[data-sl-detail-filter]').textContent = state.detailDate ? detailDateLabel(state.detailDate) : '日付未選択'
    if (!rows.length) {
      body.innerHTML = `<tr><td colspan="11" class="sl-empty">${state.detailDate ? 'この日の会計データはありません。' : '日別売上集計の日付を選択してください。'}</td></tr>`
      return
    }
    body.innerHTML = rows.map(row => `<tr data-id="${esc(row.id)}" class="${state.selected.has(row.id) ? 'selected' : ''}">
      <td><input type="checkbox" aria-label="${esc(row.displayCustomerName)}の会計を選択" ${state.selected.has(row.id) ? 'checked' : ''}></td>
      <td><strong>${esc(date(row.paidAt))}</strong><div class="sl-id">${esc(row.id.slice(-10))}</div></td>
      <td>${esc(row.displayCustomerName)}</td><td>${esc(row.staffName || 'フリー')}</td>
      <td>${esc(row.title || row.menu || '—')}<div class="sl-muted">${esc(row.bookingProvider || row.source || '')}</div></td>
      <td class="sl-money">${esc(yen(row.amount))}</td><td>${esc(row.paymentMethod || '未設定')}</td>
      <td>${row.productCount ? `${Number(row.productCount).toLocaleString('ja-JP')}点 / ${yen(row.productTotal)}` : '—'}</td>
      <td><span class="sl-id">${esc(row.appointmentId ? row.appointmentId.slice(-10) : '—')}</span></td>
      <td>${row.auditCount ? `<span class="sl-audit">修正 ${row.auditCount}回</span>` : '—'}</td>
      <td><button class="sl-button" type="button" data-edit>${icon('edit')}修正</button></td></tr>`).join('')
    body.querySelectorAll('tr[data-id]').forEach(tr => {
      const id = tr.dataset.id
      tr.querySelector('input').addEventListener('change', event => {
        event.target.checked ? state.selected.add(id) : state.selected.delete(id)
        renderRows(root)
      })
      tr.querySelector('[data-edit]').addEventListener('click', () => openDetailEdit(root, state.rows.find(row => row.id === id)))
    })
  }
/* render-block:end */

/* load-block:start */
  async function load(root) {
    const sequence = ++loadSequence
    const period = selectedPeriodLabel(root)
    root.querySelector('[data-sl-status]').textContent = `${period}を読み込んでいます…`
    try {
      const params = new URLSearchParams(filters(root))
      const payload = await request(`/api/admin/sales-ledger?${params}`)
      if (sequence !== loadSequence || !root.isConnected) return
      state.rows = payload.rows || []
      state.staff = payload.staff || []
      state.paymentMethods = payload.paymentMethods || []
      state.summary = payload.summary || { days: [], totals: {}, staff: [] }
      const staffSelect = root.querySelector('[name=staff]')
      const previousStaff = staffSelect.value
      staffSelect.innerHTML = '<option value="">すべてのスタッフ</option>' + state.staff.map(name => `<option value="${esc(name)}">${esc(name)}</option>`).join('')
      staffSelect.value = previousStaff
      const paymentSelect = root.querySelector('[name=payment]')
      const previousPayment = paymentSelect.value
      paymentSelect.innerHTML = '<option value="">すべての支払方法</option>' + state.paymentMethods.map(name => `<option value="${esc(name)}">${esc(name)}</option>`).join('')
      paymentSelect.value = previousPayment
      if (state.detailDate && !state.summary.days.some(day => day.date === state.detailDate)) state.detailDate = ''
      state.selected = new Set([...state.selected].filter(id => state.rows.some(row => row.id === id)))
      root.querySelector('[data-sl-status]').textContent = `${period}を表示しています。変更は履歴へ記録されます。`
      renderSummary(root)
      renderRows(root)
    } catch (error) {
      if (sequence !== loadSequence || !root.isConnected) return
      root.querySelector('[data-sl-status]').textContent = error.message
      state.rows = []
      state.summary = { days: [], totals: {}, staff: [] }
      state.selected.clear()
      renderSummary(root)
      renderRows(root)
    }
  }
/* load-block:end */

/* markup-block:start */
  function ledgerMarkup() {
    const currentMonth = monthValueInTokyo()
    const initialRange = monthRange(currentMonth)
    return `<div class="sl-page"><nav class="sl-tabs" aria-label="経営ページ切替"><a href="/admin/owner-analytics">経営分析</a><a aria-current="page" class="active" href="/admin/owner-analytics?salesLedger=1">会計データ管理</a><a href="/admin/owner-analytics?section=billing">システム利用料</a></nav>
      <header class="sl-hero lien-glass overflow-hidden rounded-[28px] border p-5 sm:p-6"><div class="min-w-0"><div class="sl-hero-eyebrow">${icon('receipt')}<span>Sales ledger</span></div><h1 class="text-balance text-2xl font-semibold tracking-normal text-[color:var(--lien-ink)] sm:text-3xl">会計データ管理</h1><p class="mt-3 max-w-3xl text-sm leading-7 text-lien-muted">月ごとの売上構成と入金内訳を確認し、必要な決済は明細から修正できます。</p></div><span class="sl-hero-mark">${icon('receipt')}</span></header>
      <section class="sl-card sl-report-filter"><form data-sl-search><div class="sl-report-toolbar"><div class="sl-month-filter" role="group" aria-labelledby="sl-month-title"><div class="sl-month-heading"><span class="sl-month-icon">${icon('calendar')}</span><div class="sl-month-copy"><strong id="sl-month-title">集計年月</strong><span data-sl-month-caption aria-live="polite">${monthLabel(currentMonth)}</span></div></div><div class="sl-month-controls"><button class="sl-month-nav" type="button" data-sl-month-shift="-1" aria-label="前月" title="前月">${icon('chevronLeft')}</button><input class="sl-month-input" type="month" data-sl-month value="${currentMonth}" max="${currentMonth}" aria-label="集計年月"><button class="sl-month-nav" type="button" data-sl-month-shift="1" aria-label="翌月" title="翌月">${icon('chevronRight')}</button><button class="sl-button sl-month-current" type="button" data-sl-current-month>今月</button></div></div><div class="sl-field"><label>主担当スタッフ</label><select aria-label="主担当スタッフ" name="staff"><option value="">すべてのスタッフ</option></select></div><div class="sl-field"><label>支払方法</label><select aria-label="支払方法" name="payment"><option value="">すべての支払方法</option></select></div><button class="sl-button primary sl-filter-submit" type="submit">${icon('search')}表示</button></div><details class="sl-advanced-filters"><summary>${icon('sliders')}<span>詳細条件</span>${icon('chevronDown')}</summary><div class="sl-filter-grid">
        <div class="sl-field"><label>売上日（開始）</label><input type="date" aria-label="売上日（開始）" name="from" value="${initialRange.from}"></div><div class="sl-field"><label>売上日（終了）</label><input type="date" aria-label="売上日（終了）" name="to" value="${initialRange.to}"></div>
        <div class="sl-field"><label>顧客名</label><input aria-label="顧客名" name="customer" maxlength="100" placeholder="顧客名で検索"></div><div class="sl-field"><label>売上No.</label><input aria-label="売上番号" name="saleNo" maxlength="100" placeholder="IDの一部でも可"></div><div class="sl-field"><label>施術No.</label><input aria-label="施術番号" name="appointmentNo" maxlength="100" placeholder="予約IDの一部でも可"></div><div class="sl-field"><label>施術・メニュー・メモ</label><input aria-label="施術・メニュー・メモ" name="keyword" maxlength="120" placeholder="内容を検索"></div>
      </div></details><div class="sl-filter-status"><span class="sl-status" data-sl-status></span></div></form></section>
      <section class="sl-card sl-table-card sl-daily-card"><div class="sl-table-head"><div class="sl-section-title">${icon('chart')}<div><h2>日別売上集計</h2><span class="sl-status" data-sl-summary-period></span></div></div><button class="sl-button" type="button" data-sl-print disabled>${icon('print')}印刷</button></div><div class="sl-kpi-strip"><div class="sl-kpi"><span>税込売上</span><strong data-sl-kpi-total>0円</strong></div><div class="sl-kpi"><span>施術売上</span><strong data-sl-kpi-service>0円</strong></div><div class="sl-kpi"><span>店販売上</span><strong data-sl-kpi-product>0円</strong></div><div class="sl-kpi"><span>会計件数</span><strong data-sl-kpi-count>0件</strong></div></div><div class="sl-table-wrap sl-summary-wrap"><table class="sl-table sl-daily-table" data-sl-summary-table><thead data-sl-summary-head></thead><tbody data-sl-summary-rows></tbody><tfoot data-sl-summary-total></tfoot></table></div></section>
      <dialog id="sl-payment-detail-dialog" class="sl-detail-dialog" data-sl-detail-dialog aria-labelledby="sl-detail-title"><div class="sl-detail-dialog-shell"><header class="sl-detail-dialog-head"><div class="sl-detail-heading"><span class="sl-detail-icon">${icon('list')}</span><div class="sl-detail-copy"><span class="sl-eyebrow" data-sl-detail-filter>日付未選択</span><h2 id="sl-detail-title">決済明細</h2><p><span data-sl-count>0件</span><span aria-hidden="true"> / </span><span data-sl-selected>0件選択</span></p></div></div><button class="sl-button sl-detail-bulk" type="button" data-sl-bulk disabled>${icon('edit')}選択項目を一括修正</button><button class="sl-close sl-detail-close" type="button" data-sl-detail-close aria-label="決済明細を閉じる" title="閉じる">${icon('close')}</button></header><div class="sl-detail-dialog-body"><div class="sl-table-wrap sl-detail-table-wrap"><table class="sl-table sl-detail-table"><thead><tr><th><input type="checkbox" data-select-all aria-label="表示中をすべて選択"></th><th>売上日 / 売上No.</th><th>顧客名</th><th>主担当</th><th>施術・売上内容</th><th>合計金額</th><th>支払方法</th><th>商品</th><th>施術No.</th><th>履歴</th><th>操作</th></tr></thead><tbody data-sl-rows></tbody></table></div></div></div></dialog><dialog class="sl-dialog" data-sl-dialog></dialog></div>`
  }
/* markup-block:end */

/* wire-block:start */
    const root = portal.querySelector('.sl-page')
    root.querySelector('[data-sl-search]').addEventListener('submit', event => {
      event.preventDefault()
      syncMonthFromDates(root)
      state.selected.clear()
      state.detailDate = ''
      load(root)
    })
    root.querySelector('[data-sl-month]').addEventListener('change', event => {
      if (event.currentTarget.value) applyMonth(root, event.currentTarget.value)
      else syncMonthControls(root)
    })
    root.querySelectorAll('[data-sl-month-shift]').forEach(button => button.addEventListener('click', () => {
      const value = shiftMonth(root.querySelector('[data-sl-month]').value, Number(button.dataset.slMonthShift))
      if (value) applyMonth(root, value)
    }))
    root.querySelector('[data-sl-current-month]').addEventListener('click', () => applyMonth(root, monthValueInTokyo()))
    root.querySelectorAll('[name=from],[name=to]').forEach(input => input.addEventListener('change', () => syncMonthFromDates(root)))
    syncMonthControls(root)
    root.querySelector('[data-select-all]').addEventListener('change', event => {
      const visible = detailRows()
      if (event.target.checked) visible.forEach(row => state.selected.add(row.id))
      else visible.forEach(row => state.selected.delete(row.id))
      renderRows(root)
    })
    const detailDialog = root.querySelector('[data-sl-detail-dialog]')
    detailDialog.querySelector('[data-sl-detail-close]').addEventListener('click', () => detailDialog.close())
    detailDialog.addEventListener('click', event => { if (event.target === detailDialog) detailDialog.close() })
    detailDialog.addEventListener('close', () => {
      const preserveState = detailDialog.dataset.preserveState === '1'
      delete detailDialog.dataset.preserveState
      if (preserveState) return
      state.detailDate = ''
      state.selected.clear()
      state.reopenDetailAfterEdit = false
      renderSummary(root)
      renderRows(root)
    })
    root.querySelector('[data-sl-bulk]').addEventListener('click', () => openDetailEdit(root, null, true))
    root.querySelector('[data-sl-dialog]').addEventListener('close', () => {
      if (!state.reopenDetailAfterEdit) return
      state.reopenDetailAfterEdit = false
      queueMicrotask(() => {
        if (!root.isConnected || !state.detailDate || detailDialog.open) return
        renderSummary(root)
        renderRows(root)
        detailDialog.showModal()
        detailDialog.querySelector('[data-sl-detail-close]')?.focus({ preventScroll:true })
      })
    })
    root.querySelector('[data-sl-print]').addEventListener('click', () => window.print())
/* wire-block:end */
