(function () {
  'use strict'
  const VERSION = 'sales-ledger-accounts-v324'
  let lastRoute = ''
  let rendering = false
  let accountInjecting = false
  let state = { rows: [], staff: [], selected: new Set() }

  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, char => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[char]))
  const yen = value => `${Number(value || 0).toLocaleString('ja-JP')}円`
  const date = value => value ? new Intl.DateTimeFormat('ja-JP', { timeZone:'Asia/Tokyo', year:'numeric', month:'2-digit', day:'2-digit' }).format(new Date(value)) : '—'
  const datetimeLocal = value => {
    if (!value) return ''
    const parts = new Intl.DateTimeFormat('sv-SE', { timeZone:'Asia/Tokyo', year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' }).format(new Date(value))
    return parts.replace(' ', 'T')
  }
  const icon = name => {
    const paths = {
      receipt:'<path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
      search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
      print:'<path d="M7 8V3h10v5M7 17h10v4H7z"/><path d="M5 17H3v-7h18v7h-2"/>',
      edit:'<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/>',
      users:'<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0M16 4a4 4 0 0 1 0 8M18 14a6 6 0 0 1 4 6"/>',
      check:'<path d="m5 12 4 4L19 6"/>',
      close:'<path d="m6 6 12 12M18 6 6 18"/>',
    }
    return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.receipt}</svg>`
  }

  function installStyles() {
    if (document.getElementById(VERSION)) return
    const style = document.createElement('style')
    style.id = VERSION
    style.textContent = `
      .sl-page{--sl-rose:#c94f72;--sl-rose-soft:#fff0f5;--sl-ink:#241d1a;--sl-muted:#80726b;--sl-line:#eadbd4;--sl-card:#fffdfb;display:grid;gap:20px;color:var(--sl-ink)}
      .sl-page *{box-sizing:border-box}.sl-tabs{display:grid;grid-template-columns:repeat(3,1fr);border:1px solid var(--sl-line);border-radius:18px;background:#fff;padding:5px;box-shadow:0 8px 24px #7c51400a}.sl-tabs a{display:flex;min-height:46px;align-items:center;justify-content:center;border-radius:13px;color:#776a64;text-decoration:none;font-size:13px;font-weight:800}.sl-tabs a.active{background:#fbe7ee;color:#a93659}
      .sl-hero{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;border:1px solid var(--sl-line);border-radius:24px;background:linear-gradient(135deg,#fffdfb,#fff8f5);padding:28px 30px;box-shadow:0 12px 34px #63402f0d}.sl-eyebrow{color:var(--sl-rose);font-size:10px;font-weight:900;letter-spacing:.13em}.sl-hero h1{margin:8px 0 8px;font:700 30px/1.35 Georgia,"Yu Mincho",serif}.sl-hero p{margin:0;color:var(--sl-muted);font-size:12px;line-height:1.8}.sl-hero-mark{display:grid;width:58px;height:58px;place-items:center;border-radius:18px;background:#fff0f4;color:var(--sl-rose)}.sl-hero-mark svg,.sl-button svg,.sl-section-title svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
      .sl-card{border:1px solid var(--sl-line);border-radius:22px;background:var(--sl-card);padding:22px;box-shadow:0 10px 30px #6e4b3c0b}.sl-filter-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:12px}.sl-field{display:grid;gap:6px}.sl-field.wide{grid-column:span 2}.sl-field label{font-size:10px;color:var(--sl-muted);font-weight:800}.sl-field input,.sl-field select,.sl-field textarea{width:100%;min-height:43px;border:1px solid #dfcfc7;border-radius:12px;background:#fff;padding:10px 12px;color:inherit;font:inherit}.sl-field textarea{min-height:86px;resize:vertical}.sl-field input:focus,.sl-field select:focus,.sl-field textarea:focus{outline:3px solid #d85a7b1c;border-color:#d76b88}.sl-actions{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:16px;padding-top:16px;border-top:1px solid var(--sl-line)}.sl-action-group{display:flex;gap:9px;flex-wrap:wrap}.sl-button{display:inline-flex;min-height:42px;align-items:center;justify-content:center;gap:7px;border:1px solid #dfccc3;border-radius:999px;background:#fff;padding:10px 17px;color:#5e4b43;font-size:11px;font-weight:900;cursor:pointer}.sl-button.primary{border-color:var(--sl-rose);background:var(--sl-rose);color:#fff;box-shadow:0 8px 18px #b63d6128}.sl-button:disabled{opacity:.4;cursor:not-allowed}.sl-status{color:var(--sl-muted);font-size:11px}
      .sl-table-card{padding:0;overflow:hidden}.sl-table-head{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:20px 22px;border-bottom:1px solid var(--sl-line)}.sl-section-title{display:flex;align-items:center;gap:9px}.sl-section-title svg{color:var(--sl-rose)}.sl-section-title h2{margin:0;font:700 20px Georgia,"Yu Mincho",serif}.sl-table-wrap{overflow:auto;max-height:650px}.sl-table{width:100%;min-width:1180px;border-collapse:collapse}.sl-table th{position:sticky;z-index:2;top:0;background:#faf5f2;padding:12px 10px;color:#776963;font-size:10px;text-align:left;white-space:nowrap;border-bottom:1px solid var(--sl-line)}.sl-table td{padding:13px 10px;border-bottom:1px solid #f0e7e2;font-size:11px;vertical-align:middle}.sl-table tbody tr:hover{background:#fff8fa}.sl-table tbody tr.selected{background:#fff0f5}.sl-table input[type=checkbox]{width:17px;height:17px;accent-color:var(--sl-rose)}.sl-money{text-align:right;font-weight:900;font-variant-numeric:tabular-nums}.sl-muted{color:var(--sl-muted)}.sl-id{font:10px ui-monospace,SFMono-Regular,Consolas,monospace;color:#927e75}.sl-audit{display:inline-flex;border-radius:99px;background:#f3ece8;padding:4px 7px;color:#7b6258;font-size:9px;font-weight:800}.sl-empty{padding:52px;text-align:center;color:var(--sl-muted)}
      .sl-dialog{width:min(720px,calc(100% - 28px));max-height:calc(100vh - 40px);border:1px solid var(--sl-line);border-radius:24px;background:#fffdfb;padding:0;box-shadow:0 30px 90px #3e2b2460}.sl-dialog::backdrop{background:#2d201c55;backdrop-filter:blur(5px)}.sl-dialog-head{display:flex;align-items:center;justify-content:space-between;padding:21px 24px;border-bottom:1px solid var(--sl-line)}.sl-dialog-head h2{margin:0;font:700 22px Georgia,"Yu Mincho",serif}.sl-close{display:grid;width:40px;height:40px;place-items:center;border:1px solid var(--sl-line);border-radius:50%;background:#fff;cursor:pointer}.sl-close svg{width:18px;height:18px;fill:none;stroke:currentColor}.sl-dialog-body{padding:22px 24px;overflow:auto}.sl-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.sl-dialog-foot{display:flex;justify-content:flex-end;gap:9px;margin-top:20px;padding-top:18px;border-top:1px solid var(--sl-line)}
      .sl-shared-account-card{overflow:hidden}.sl-shared-account-card .ca-theme-card-head{align-items:center}.sl-shared-account-card .sl-eyebrow{display:block;margin-bottom:4px}.sl-shared-account-form{padding:20px 22px 22px}.sl-shared-account-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.sl-shared-account-field{display:grid;gap:7px}.sl-shared-account-field label{color:var(--ca-ink,#493a34);font-size:10px;font-weight:900}.sl-shared-account-field input{width:100%;min-height:46px;border:1px solid var(--ca-line,#dfcfc7);border-radius:13px;background:var(--ca-paper,#fffdfb);padding:0 14px;color:var(--ca-ink,#2f2420);font:inherit;outline:0}.sl-shared-account-field input:focus{border-color:#bf7667;box-shadow:0 0 0 4px #c37c6d1a}.sl-shared-account-actions{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-top:18px;padding-top:17px;border-top:1px solid var(--ca-line,#eadbd4)}.sl-shared-account-status{display:flex;align-items:center;gap:7px;color:var(--ca-muted,#80726b);font-size:10px;font-weight:800}.sl-account-badge{display:inline-flex;min-height:26px;align-items:center;border-radius:999px;background:#edf7f0;padding:0 10px;color:#35684a;font-size:9px;font-weight:900}.sl-shared-save{display:inline-flex!important;min-width:250px!important;min-height:44px!important;align-items:center!important;justify-content:center!important;gap:8px!important;border:0!important;border-radius:999px!important;background:linear-gradient(135deg,#a65747,#bd6d5b)!important;padding:0 20px!important;color:#fff!important;font-size:11px!important;font-weight:900!important;line-height:1!important;opacity:1!important;box-shadow:0 10px 24px #753a2d27!important;cursor:pointer!important;transition:transform .16s,box-shadow .16s,opacity .16s!important}.sl-shared-save:hover{transform:translateY(-1px);box-shadow:0 14px 28px #753a2d32!important}.sl-shared-save:focus-visible{outline:3px solid #cf4f7230!important;outline-offset:2px}.sl-shared-save:disabled{cursor:wait!important;opacity:.62!important}.sl-shared-save svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.8}.sl-shared-feedback{min-height:16px;margin:10px 0 0;color:#3f7659;font-size:10px;font-weight:800}.sl-shared-feedback.error{color:#ae393d}
      @media(max-width:1100px){.sl-filter-grid{grid-template-columns:repeat(3,1fr)}}@media(max-width:700px){.sl-tabs{grid-template-columns:1fr}.sl-hero{align-items:flex-start;padding:22px}.sl-hero-mark{display:none}.sl-filter-grid,.sl-form-grid,.sl-shared-account-grid{grid-template-columns:1fr}.sl-field.wide{grid-column:auto}.sl-actions,.sl-shared-account-actions{align-items:stretch;flex-direction:column}.sl-action-group{width:100%}.sl-button,.sl-shared-save{width:100%;min-width:0!important;flex:1}.sl-table-head{align-items:flex-start;flex-direction:column}.sl-shared-account-form{padding:17px}.sl-shared-account-card .ca-theme-card-head{align-items:flex-start}}
      @media print{body *{visibility:hidden!important}.sl-page,.sl-page *{visibility:visible!important}.sl-page{position:absolute;inset:0;display:block;background:#fff}.sl-tabs,.sl-hero,.sl-card:not(.sl-table-card),.sl-table-head .sl-action-group,.sl-table th:first-child,.sl-table td:first-child,.sl-table th:last-child,.sl-table td:last-child{display:none!important}.sl-table-card{border:0;box-shadow:none}.sl-table-wrap{overflow:visible;max-height:none}.sl-table{min-width:0;font-size:9pt}.sl-table tbody tr:not(.print-row){display:none!important}.sl-table th{position:static;background:#eee!important;color:#000!important}.sl-table td,.sl-table th{padding:6px;border:1px solid #bbb}.sl-table-head{display:block!important;padding:0 0 10px}.sl-section-title h2:after{content:"（会計データ）"}}
    `
    document.head.appendChild(style)
  }

  async function request(url, options) {
    const response = await fetch(url, { credentials:'same-origin', cache:'no-store', ...options })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(payload.error || '処理を完了できませんでした。')
    return payload
  }

  function filters(root) {
    return Object.fromEntries(new FormData(root.querySelector('[data-sl-search]')).entries())
  }

  function renderRows(root) {
    const body = root.querySelector('[data-sl-rows]')
    if (!state.rows.length) {
      body.innerHTML = '<tr><td colspan="12" class="sl-empty">条件に一致する会計データがありません。</td></tr>'
      return
    }
    body.innerHTML = state.rows.map(row => `<tr data-id="${esc(row.id)}" class="${state.selected.has(row.id) ? 'selected print-row' : ''}">
      <td><input type="checkbox" aria-label="${esc(row.displayCustomerName)}の会計を選択" ${state.selected.has(row.id) ? 'checked' : ''}></td>
      <td><strong>${esc(date(row.paidAt))}</strong><div class="sl-id">${esc(row.id.slice(-10))}</div></td>
      <td>${esc(row.displayCustomerName)}</td><td>${esc(row.staffName || 'フリー')}</td>
      <td>${esc(row.title || row.menu || '—')}<div class="sl-muted">${esc(row.bookingProvider || row.source || '')}</div></td>
      <td class="sl-money">${esc(yen(row.amount))}</td><td>${esc(row.paymentMethod || '未設定')}</td>
      <td>${row.productCount ? `${row.productCount}点 / ${yen(row.productTotal)}` : '—'}</td>
      <td><span class="sl-id">${esc(row.appointmentId ? row.appointmentId.slice(-10) : '—')}</span></td>
      <td>${row.auditCount ? `<span class="sl-audit">修正 ${row.auditCount}回</span>` : '—'}</td>
      <td><button class="sl-button" type="button" data-edit>${icon('edit')}修正</button></td></tr>`).join('')
    root.querySelector('[data-sl-count]').textContent = `${state.rows.length.toLocaleString('ja-JP')}件`
    root.querySelector('[data-sl-selected]').textContent = `${state.selected.size}件選択`
    root.querySelector('[data-sl-bulk]').disabled = !state.selected.size
    root.querySelector('[data-sl-print]').disabled = !state.rows.length
    body.querySelectorAll('tr[data-id]').forEach(tr => {
      const id = tr.dataset.id
      tr.querySelector('input').addEventListener('change', event => {
        event.target.checked ? state.selected.add(id) : state.selected.delete(id)
        renderRows(root)
      })
      tr.querySelector('[data-edit]').addEventListener('click', () => openEdit(root, state.rows.find(row => row.id === id)))
    })
  }

  function dialogMarkup(row, bulk) {
    const count = state.selected.size
    return `<form method="dialog" data-sl-edit-form><div class="sl-dialog-head"><div><span class="sl-eyebrow">${bulk ? 'BULK CORRECTION' : 'SALES CORRECTION'}</span><h2>${bulk ? `${count}件を一括修正` : '会計データを修正'}</h2></div><button class="sl-close" type="button" data-close aria-label="閉じる">${icon('close')}</button></div><div class="sl-dialog-body">
      ${bulk ? '<p class="sl-shared-note">入力した項目だけを選択中の会計へ反映します。金額・施術内容・会計日は、誤った一括上書きを防ぐため個別修正のみです。</p>' : `<p class="sl-shared-note">${esc(row.displayCustomerName)} / 売上No. ${esc(row.id)}</p>`}
      <div class="sl-form-grid">
        ${bulk ? '' : `<div class="sl-field"><label>会計日時</label><input name="paidAt" type="datetime-local" value="${esc(datetimeLocal(row.paidAt))}" required></div><div class="sl-field"><label>合計金額</label><input name="amount" type="number" min="0" max="100000000" value="${Number(row.amount)}" required></div><div class="sl-field wide"><label>施術・売上内容</label><input name="title" maxlength="240" value="${esc(row.title || '')}" required></div>`}
        <div class="sl-field"><label>主担当スタッフ${bulk ? '（変更しない場合は空欄）' : ''}</label><select name="staffName"><option value="">${bulk ? '変更しない' : 'フリー'}</option>${state.staff.map(name => `<option value="${esc(name)}" ${!bulk && row.staffName === name ? 'selected' : ''}>${esc(name)}</option>`).join('')}</select></div>
        <div class="sl-field"><label>支払方法${bulk ? '（変更しない場合は空欄）' : ''}</label><select name="paymentMethod"><option value="">${bulk ? '変更しない' : '未設定'}</option>${['現金','クレジットカード','電子マネー','QRコード決済','その他'].map(name => `<option value="${name}" ${!bulk && row.paymentMethod === name ? 'selected' : ''}>${name}</option>`).join('')}</select></div>
        ${bulk ? '' : `<div class="sl-field wide"><label>修正メモ</label><textarea name="note" maxlength="1000">${esc(row.note || '')}</textarea></div>`}
      </div><div class="sl-dialog-foot"><button class="sl-button" type="button" data-close>キャンセル</button><button class="sl-button primary" type="submit">${icon('check')}変更を保存</button></div></div></form>`
  }

  function openEdit(root, row, bulk = false) {
    const dialog = root.querySelector('[data-sl-dialog]')
    dialog.innerHTML = dialogMarkup(row || {}, bulk)
    dialog.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => dialog.close()))
    dialog.querySelector('form').addEventListener('submit', async event => {
      event.preventDefault()
      const button = event.currentTarget.querySelector('[type=submit]')
      button.disabled = true
      try {
        const changes = Object.fromEntries(new FormData(event.currentTarget).entries())
        await request('/api/admin/sales-ledger', { method:'PATCH', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify({ ids: bulk ? [...state.selected] : [row.id], changes }) })
        dialog.close()
        state.selected.clear()
        await load(root)
      } catch (error) { alert(error.message) }
      finally { button.disabled = false }
    })
    dialog.showModal()
  }

  async function load(root) {
    root.querySelector('[data-sl-status]').textContent = '会計データを読み込んでいます…'
    try {
      const params = new URLSearchParams(filters(root))
      const payload = await request(`/api/admin/sales-ledger?${params}`)
      state.rows = payload.rows || []
      state.staff = payload.staff || []
      const staffSelect = root.querySelector('[name=staff]')
      const previous = staffSelect.value
      staffSelect.innerHTML = '<option value="">すべて</option>' + state.staff.map(name => `<option value="${esc(name)}">${esc(name)}</option>`).join('')
      staffSelect.value = previous
      state.selected = new Set([...state.selected].filter(id => state.rows.some(row => row.id === id)))
      root.querySelector('[data-sl-status]').textContent = '会計確定済みデータを表示しています。変更は履歴へ記録されます。'
      renderRows(root)
    } catch (error) {
      root.querySelector('[data-sl-status]').textContent = error.message
      state.rows = []
      renderRows(root)
    }
  }

  function ledgerMarkup() {
    const now = new Date()
    const from = new Date(now.getFullYear() - 1, now.getMonth(), 1)
    const through = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    const fmt = value => `${value.getFullYear()}-${String(value.getMonth()+1).padStart(2,'0')}-${String(value.getDate()).padStart(2,'0')}`
    return `<div class="sl-page"><nav class="sl-tabs" aria-label="経営ページ切替"><a href="/admin/owner-analytics">経営分析</a><a class="active" href="/admin/owner-analytics?salesLedger=1">会計データ管理</a><a href="/admin/owner-analytics?section=billing">システム利用料</a></nav>
      <section class="sl-hero"><div><span class="sl-eyebrow">SALES LEDGER</span><h1>会計データ管理</h1><p>確定後の売上を検索し、個別または複数選択で修正できます。変更前後と操作担当者は監査履歴へ保存されます。</p></div><span class="sl-hero-mark">${icon('receipt')}</span></section>
      <section class="sl-card"><form data-sl-search><div class="sl-filter-grid">
        <div class="sl-field"><label>売上日（開始）</label><input type="date" name="from" value="${fmt(from)}"></div><div class="sl-field"><label>売上日（終了）</label><input type="date" name="to" value="${fmt(through)}"></div>
        <div class="sl-field"><label>顧客名</label><input name="customer" maxlength="100" placeholder="顧客名で検索"></div><div class="sl-field"><label>主担当スタッフ</label><select name="staff"><option value="">すべて</option></select></div>
        <div class="sl-field"><label>売上No.</label><input name="saleNo" maxlength="100" placeholder="IDの一部でも可"></div><div class="sl-field"><label>施術No.</label><input name="appointmentNo" maxlength="100" placeholder="予約IDの一部でも可"></div>
        <div class="sl-field wide"><label>施術・メニュー・メモ</label><input name="keyword" maxlength="120" placeholder="内容を検索"></div>
      </div><div class="sl-actions"><span class="sl-status" data-sl-status></span><div class="sl-action-group"><button class="sl-button primary" type="submit">${icon('search')}検索</button></div></div></form></section>
      <section class="sl-card sl-table-card"><div class="sl-table-head"><div class="sl-section-title">${icon('receipt')}<div><h2>売上一覧</h2><span class="sl-status"><span data-sl-count>0件</span> / <span data-sl-selected>0件選択</span></span></div></div><div class="sl-action-group"><button class="sl-button" type="button" data-sl-bulk disabled>${icon('edit')}選択項目を一括修正</button><button class="sl-button" type="button" data-sl-print disabled>${icon('print')}印刷</button></div></div><div class="sl-table-wrap"><table class="sl-table"><thead><tr><th><input type="checkbox" data-select-all aria-label="表示中をすべて選択"></th><th>売上日 / 売上No.</th><th>顧客名</th><th>主担当</th><th>施術・売上内容</th><th>合計金額</th><th>支払方法</th><th>商品</th><th>施術No.</th><th>履歴</th><th>操作</th></tr></thead><tbody data-sl-rows></tbody></table></div></section><dialog class="sl-dialog" data-sl-dialog></dialog></div>`
  }

  async function renderLedger() {
    if (rendering) return
    const main = document.querySelector('main')
    if (!main) return
    rendering = true
    installStyles()
    main.innerHTML = ledgerMarkup()
    const root = main.querySelector('.sl-page')
    root.querySelector('[data-sl-search]').addEventListener('submit', event => { event.preventDefault(); state.selected.clear(); load(root) })
    root.querySelector('[data-select-all]').addEventListener('change', event => {
      state.selected = event.target.checked ? new Set(state.rows.map(row => row.id)) : new Set()
      renderRows(root)
    })
    root.querySelector('[data-sl-bulk]').addEventListener('click', () => openEdit(root, null, true))
    root.querySelector('[data-sl-print]').addEventListener('click', () => {
      const ids = state.selected.size ? state.selected : new Set(state.rows.map(row => row.id))
      root.querySelectorAll('tr[data-id]').forEach(row => row.classList.toggle('print-row', ids.has(row.dataset.id)))
      window.print()
    })
    await load(root)
    rendering = false
  }

  function addLedgerNavigation() {
    if (!location.pathname.includes('/admin/owner-analytics')) return
    const nav = document.querySelector('nav[aria-label="経営ページ切替"]')
    if (!nav || nav.querySelector('[href*="salesLedger"]')) return
    const link = document.createElement('a')
    link.href = '/admin/owner-analytics?salesLedger=1'
    link.textContent = '会計データ管理'
    link.style.cssText = 'display:flex;align-items:center;justify-content:center;text-decoration:none;font-weight:800;color:#766861'
    nav.style.gridTemplateColumns = 'repeat(3,minmax(0,1fr))'
    nav.insertBefore(link, nav.children[1] || null)
  }

  function isAccountSettingsPage() {
    return location.pathname === '/admin/account' && !new URLSearchParams(location.search).has('panel')
  }

  function removeSharedAccountOutsideSettings() {
    if (isAccountSettingsPage()) return
    document.querySelectorAll('[data-sl-shared-account]').forEach(node => node.remove())
  }

  async function injectSharedAccount() {
    if (!isAccountSettingsPage() || accountInjecting || document.querySelector('[data-sl-shared-account]')) return
    const main = document.querySelector('main')
    if (!main) return
    const accountLayout = [...main.children].find(node => node.matches('div') && node.querySelector(':scope > header'))
    if (!accountLayout) return
    accountInjecting = true
    installStyles()
    try {
      const payload = await request('/api/admin/shared-store-account')
      if (!isAccountSettingsPage() || !accountLayout.isConnected) return
      const account = payload.account || {}
      const section = document.createElement('section')
      section.className = 'ca-theme-card sl-shared-account-card'
      section.dataset.slSharedAccount = '1'
      section.innerHTML = `<header class="ca-theme-card-head"><span class="symbol">${icon('users')}</span><div><span class="sl-eyebrow">STORE SHARED ACCOUNT</span><h2>店舗共通アカウント</h2><p>オーナー個人のアカウントとは別に、店舗スタッフが共通で利用するアカウントです。店舗データは他店舗から完全に分離されます。</p></div></header><form class="sl-shared-account-form" data-shared-form><div class="sl-shared-account-grid"><div class="sl-shared-account-field"><label>店舗共通ログインID</label><input name="loginId" value="${esc(account.loginId || '')}" pattern="[a-z0-9._-]{3,80}" autocomplete="username" required></div><div class="sl-shared-account-field"><label>新しい専用パスワード</label><input name="password" type="password" minlength="10" maxlength="128" placeholder="10文字以上" autocomplete="new-password" required></div></div><div class="sl-shared-account-actions"><span class="sl-shared-account-status">状態：${account.active ? '<span class="sl-account-badge">利用可能</span>' : '<span>初期設定が必要</span>'}</span><button class="sl-shared-save" type="submit">${icon('check')}店舗共通アカウントを保存</button></div><p class="sl-shared-feedback" data-shared-feedback role="status" aria-live="polite"></p></form>`
      accountLayout.appendChild(section)
      section.querySelector('form').addEventListener('submit', async event => {
        event.preventDefault()
        // currentTarget is cleared by the browser after the synchronous event
        // dispatch finishes. Keep the form reference before awaiting the API so
        // the password field can be cleared reliably after a successful save.
        const form = event.currentTarget
        const button = form.querySelector('button')
        const feedback = form.querySelector('[data-shared-feedback]')
        button.disabled = true
        feedback.className = 'sl-shared-feedback'
        feedback.textContent = '保存しています…'
        try {
          const data = Object.fromEntries(new FormData(form).entries())
          await request('/api/admin/shared-store-account', { method:'POST', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify(data) })
          feedback.textContent = '店舗共通アカウントを保存しました。'
          section.querySelector('.sl-shared-account-status').innerHTML = '状態：<span class="sl-account-badge">利用可能</span>'
          const passwordField = form.elements.namedItem('password')
          if (passwordField instanceof HTMLInputElement) passwordField.value = ''
        } catch (error) {
          feedback.className = 'sl-shared-feedback error'
          feedback.textContent = error.message
        }
        finally { button.disabled = false }
      })
    } catch {}
    finally { accountInjecting = false }
  }

  function enhance() {
    const route = location.pathname + location.search
    removeSharedAccountOutsideSettings()
    if (new URLSearchParams(location.search).get('salesLedger') === '1' && location.pathname === '/admin/owner-analytics') {
      if (!document.querySelector('.sl-page')) renderLedger()
      return
    }
    if (route !== lastRoute) lastRoute = route
    addLedgerNavigation()
    injectSharedAccount()
  }
  const observer = new MutationObserver(() => queueMicrotask(enhance))
  observer.observe(document.documentElement, { childList:true, subtree:true })
  addEventListener('popstate', enhance)
  document.addEventListener('click', event => setTimeout(enhance, event.target.closest('a') ? 40 : 0), true)
  enhance()
})()
