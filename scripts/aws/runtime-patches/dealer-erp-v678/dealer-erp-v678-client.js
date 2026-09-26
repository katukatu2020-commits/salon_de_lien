(() => {
  'use strict'
  const root = document.getElementById('wholesale-app')
  if (!root) return
  const view = document.body.dataset.dealerView
  const salonDealer = document.body.dataset.erpSalon
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]))
  const yen = v => Number(v || 0).toLocaleString('ja-JP') + '円'
  const icon = name => window.DealerErpIcons?.[name] || ''
  const stamp = v => v ? new Intl.DateTimeFormat('ja-JP', { timeZone:'Asia/Tokyo', dateStyle:'short', timeStyle:'short' }).format(new Date(v)) : ''
  const today = () => new Intl.DateTimeFormat('sv-SE', { timeZone:'Asia/Tokyo' }).format(new Date())
  const labels = { ORDERED:'未受注', ACCEPTED:'受注・分納中', SHIPPED:'出荷中', DELIVERED:'納品済み', CANCELLED:'取消', REVERSED:'出荷取消', OPEN:'未入荷', CLOSED:'入荷済み', PLANNED:'予定', DONE:'完了', VISIT:'訪問', DELIVERY:'納品', SUPPORT:'サロン対応', INTERNAL:'社内', PRIVATE:'担当者・管理者', BRANCH:'営業所内', DEALER:'全社', RECEIPT:'入庫', ISSUE:'出庫', COUNT:'棚卸し', RESERVE:'引当', RELEASE:'引当解除', SHIP:'出荷', SHIP_REVERSE:'出荷取消', RETURN:'返品', TRANSFER_IN:'移動入庫', TRANSFER_OUT:'移動出庫', PURCHASE_RECEIPT:'仕入入荷' }
  const state = { options:null, tab:'', data:null, page:1, query:new URLSearchParams(location.search), request:0, dialog:null, thread:null }
  const isAdmin = () => state.options.viewer.role === 'ADMIN'
  const apiBase = salonDealer ? '/api/admin/wholesale/erp/' : '/api/dealer/erp/'
  const apiUrl = (name, params = {}) => {
    const q = new URLSearchParams(params)
    if (salonDealer) q.set('dealer', salonDealer)
    return apiBase + name + (q.size ? '?' + q : '')
  }
  async function api(name, params, body) {
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 25000)
    try {
      const res = await fetch(apiUrl(name, params), { method:body ? 'POST':'GET', credentials:'same-origin', signal:controller.signal, headers:body ? { 'Content-Type':'application/json' } : {}, ...(body ? { body:JSON.stringify(body) } : {}) })
      const data = await res.json()
      if (res.status === 401) { location.assign(salonDealer ? '/admin/login' : '/dealer/login'); throw new Error('ログインし直してください。') }
      if (res.status === 428) { location.assign('/dealer/password-change'); throw new Error(data.error) }
      if (!res.ok) throw new Error(data.error || '処理に失敗しました。')
      return data
    } catch (error) { if (error.name === 'AbortError') throw new Error('通信がタイムアウトしました。同じ内容のまま再試行できます。'); throw error }
    finally { clearTimeout(timer) }
  }
  const command = (name, body, key = crypto.randomUUID()) => api(name, {}, { ...body, key })
  const button = (label, attrs = '', glyph = '', primary = false) => `<button type="button" class="wo-button${primary ? ' wo-button-primary' : ''}" ${attrs}>${icon(glyph)}${esc(label)}</button>`
  const input = (name, label, value = '', type = 'text', extra = '') => `<label><span>${esc(label)}</span><input name="${name}" type="${type}" value="${esc(value)}" ${extra}></label>`
  const area = (name, label, value = '', required = false) => `<label class="erp-wide"><span>${esc(label)}</span><textarea name="${name}" rows="3" maxlength="4000" ${required ? 'required' : ''}>${esc(value)}</textarea></label>`
  const select = (name, label, rows, current = '', empty = 'すべて') => `<label><span>${esc(label)}</span><select name="${name}">${empty !== null ? `<option value="">${esc(empty)}</option>` : ''}${rows.map(r => `<option value="${esc(r.id)}" ${String(current) === String(r.id) ? 'selected' : ''}>${esc(r.name)}</option>`).join('')}</select></label>`
  const enumSelect = (name, label, values, current) => select(name, label, values.map(id => ({ id, name:labels[id] || id })), current, null)
  const locSelect = (current = '', name = 'locationId') => select(name, name === 'destinationId' ? '移動先' : '倉庫・保管場所', state.options.locations.map(l => ({ id:l.id, name:l.warehouse + ' / ' + l.name })), current, null)
  const salonSelect = (name = 'organizationId', current = '', empty = '選択してください') => select(name, 'サロン', state.options.salons.map(s => ({ id:s.organizationId, name:s.name + ' / ' + (s.publicCode || '') })), current, empty)
  const hidden = (name, value) => `<input type="hidden" name="${name}" value="${esc(value)}">`
  const badge = value => `<span class="erp-badge ${['DELIVERED','DONE','CLOSED'].includes(value) ? 'done' : ''}">${esc(labels[value] || value)}</span>`
  const table = (heads, rows) => `<div class="erp-table-wrap"><table class="erp-table"><thead><tr>${heads.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.length ? rows.map(cells => `<tr>${cells.map((c, i) => `<td data-label="${esc(heads[i])}"><div class="erp-cell">${c}</div></td>`).join('')}</tr>`).join('') : `<tr><td colspan="${heads.length}" class="erp-empty">該当するデータはありません。</td></tr>`}</tbody></table></div>`
  const section = (title, content, action = '') => `<section class="erp-section"><header><h2>${esc(title)}</h2>${action}</header>${content}</section>`
  const metric = (name, value, href = '') => `<${href ? 'a href="' + href + '"' : 'div'} class="erp-metric"><span>${esc(name)}</span><strong>${esc(value)}</strong></${href ? 'a' : 'div'}>`
  const progress = (actual, target) => `<strong>${yen(actual)}</strong><small>目標 ${yen(target)} / 残り ${yen(Math.max(0, target - actual))}</small><progress max="100" value="${target ? Math.max(0, Math.min(100, actual / target * 100)) : 0}" aria-label="目標達成率"></progress><small>${target ? (actual / target * 100).toFixed(1) + '%' : '目標未設定'}</small>`
  function notice(message, error = false) {
    const el = root.querySelector('.erp-notice')
    el.textContent = message; el.hidden = false; el.classList.toggle('error', error)
  }
  function tabs() {
    if (view === 'inventory') return [['stock','在庫一覧'],['history','入出庫履歴'],...(isAdmin() ? [['purchases','仕入発注']] : [])]
    if (view === 'receivables') return [['invoices','請求一覧'],...(isAdmin() ? [['payments','入金・消込']] : []),['terms','サロン取引条件']]
    return []
  }
  function filters() {
    const q = state.query, parts = []
    if (['operations','activities'].includes(view)) parts.push(input('month','対象月',q.get('month') || today().slice(0,7),'month','required'))
    if (['inventory','fulfillment'].includes(view) && state.tab !== 'history' && state.tab !== 'purchases') parts.push(input('q','検索',q.get('q') || '','search','placeholder="名称・商品コード"'))
    if (view === 'inventory' && state.tab === 'stock') {
      parts.push(select('location','保管場所',state.options.locations.map(l => ({ id:l.id,name:l.warehouse + ' / ' + l.name })),q.get('location')))
      parts.push(`<label class="erp-check"><input name="low" type="checkbox" value="1" ${q.get('low') === '1' ? 'checked' : ''}>在庫不足のみ</label>`)
    }
    if (['operations','fulfillment','receivables'].includes(view)) parts.push(salonSelect('salon',q.get('salon'),'すべて'))
    if (['operations','fulfillment','activities'].includes(view)) {
      parts.push(select('branch','営業所',state.options.branches,q.get('branch')))
      if (isAdmin() || view === 'activities') parts.push(select('member','担当者',state.options.members,q.get('member')))
    }
    if (view === 'operations') parts.push(select('closing','締日',Array.from({ length:31 },(_,i) => ({ id:i+1,name:i === 30 ? '月末' : `${i+1}日` })),q.get('closing')))
    if (view === 'fulfillment') parts.push(select('status','受注状態',['ORDERED','ACCEPTED','SHIPPED','DELIVERED','CANCELLED'].map(id => ({ id,name:labels[id] })),q.get('status')))
    if (view === 'receivables' && state.tab === 'invoices') parts.push(`<label class="erp-check"><input name="open" type="checkbox" value="1" ${q.get('open') === '1' ? 'checked' : ''}>未入金のみ</label>`)
    return parts.length ? `<form id="erp-filter" class="erp-filters">${parts.join('')}<button class="wo-button" type="submit">${icon('Search')}絞り込む</button>${button('リセット','data-reset','Undo2')}</form>` : ''
  }
  function toolbar() {
    const buttons = []
    if (view === 'inventory' && isAdmin()) buttons.push(button('倉庫を追加','data-create="warehouse"','Plus'),button('保管場所を追加','data-create="location"','Plus'),button('入出庫・棚卸し','data-create="stock"','Package',true),button('仕入発注','data-create="purchase"','Plus'))
    if (view === 'receivables' && isAdmin()) buttons.push(button('締め・請求書発行','data-create="invoice"','Plus',true),button('入金を記録','data-create="payment"','Plus'),button('入金CSV取込','data-create="payment-import"','Plus'))
    if (view === 'activities') buttons.push(button('予定を追加','data-create="activity"','Plus',true))
    if (view === 'messages') buttons.push(button('新しい連絡','data-create="thread"','MessageSquare',true))
    if (view === 'operations') buttons.push(`<a class="wo-button" href="${apiUrl('report.csv',state.query)}">${icon('Download')}月次CSV</a>`)
    buttons.push(button('更新','data-refresh','RefreshCw'))
    return `<div class="erp-toolbar">${buttons.join('')}</div>`
  }
  function shell() {
    const list = tabs()
    if (!state.tab && list.length) state.tab = list[0][0]
    root.innerHTML = `<div class="erp-app"><p class="erp-notice" role="status" hidden></p>${list.length ? `<nav class="erp-tabs" aria-label="表示切替">${list.map(([k,l]) => `<button type="button" data-tab="${k}" aria-current="${state.tab === k ? 'page' : 'false'}">${l}</button>`).join('')}</nav>` : ''}${filters()}${toolbar()}<div id="erp-body" aria-live="polite"></div><footer id="erp-pager"></footer></div>`
    const form = root.querySelector('#erp-filter')
    form?.addEventListener('submit',event => { event.preventDefault(); state.query = new URLSearchParams(new FormData(form)); state.page = 1; load() })
    form?.addEventListener('keydown',event => { if (event.key === 'Enter' && (event.isComposing || event.keyCode === 229)) event.preventDefault() })
  }
  function pager(data) {
    root.querySelector('#erp-pager').innerHTML = data.pages ? `<span>${data.total ? (data.page-1)*30+1 : 0}〜${Math.min(data.page*30,data.total)} / ${data.total}件</span><div>${button('前へ',`data-page="${data.page-1}" ${data.page<=1 ? 'disabled' : ''}`,'ChevronLeft')}<span>${data.page} / ${data.pages}</span>${button('次へ',`data-page="${data.page+1}" ${data.page>=data.pages ? 'disabled' : ''}`,'ChevronRight')}</div>` : ''
  }
  function dashboardBody(d) {
    return `<div class="erp-metrics">${metric('納品売上（税抜）',yen(d.summary.actualYen))}${metric('受注見込み（税抜）',yen(d.summary.forecastYen),'/dealer/fulfillment')}${metric('未請求（税抜）',yen(d.finance.unbilled),'/dealer/receivables')}${metric('売掛残高（税込）',yen(d.finance.outstanding),'/dealer/receivables?open=1')}${metric('期日超過（税込）',yen(d.finance.overdue),'/dealer/receivables?open=1')}${metric('在庫不足',`${d.stock.low}商品・保管場所`,'/dealer/inventory?low=1')}</div><div class="erp-dashboard-grid">${section('カテゴリー別売上',table(['カテゴリー','納品売上','受注見込み'],d.categories.map(c => [esc(c.category),yen(c.actualYen),yen(c.forecastYen)])))}${section('営業所別の目標・実績',table(['営業所','売上目標・実績','新規獲得','操作'],d.branches.map(b => [esc(b.name),progress(b.actualYen,b.salesTargetYen),`${b.acquisitionCount} / ${b.acquisitionTarget}件<small>残り ${Math.max(0,b.acquisitionTarget-b.acquisitionCount)}件 / ${b.acquisitionTarget ? (b.acquisitionCount/b.acquisitionTarget*100).toFixed(1)+'%' : '目標未設定'}</small>`,isAdmin() ? button('目標設定',`data-goal="${esc(b.id)}"`,'Pencil') : ''])))}</div>${section('担当者別の進捗',table(['担当者','売上目標・実績','新規獲得','受注見込み'],d.progress.map(m => [esc(m.name),progress(m.actualYen,m.salesTargetYen),`${m.acquisitionCount} / ${m.acquisitionTarget}件<small>残り ${Math.max(0,m.acquisitionTarget-m.acquisitionCount)}件</small>`,yen(m.forecastYen)])),`<a href="/dealer/targets">担当者の目標設定</a>`)}${section('サロン別売上',table(['サロン','納品売上','受注見込み','取引履歴'],d.salons.map(s => [esc(s.name),yen(s.actualYen),yen(s.forecastYen),`<a href="/dealer/fulfillment?salon=${encodeURIComponent(s.id)}">受注・納品</a> / <a href="/dealer/receivables?salon=${encodeURIComponent(s.id)}">請求・入金</a>`])))}${section('商品別売上・上位100商品',table(['商品','商品コード','納品数量（返品控除）','納品売上'],d.products.map(p => [esc(p.productName),esc(p.productCode),String(p.quantity),yen(p.actualYen)])))}${isAdmin() ? section('操作履歴',table(['日時','担当者','操作'],d.audits.map(a => [stamp(a.createdAt),esc(state.options.members.find(m => m.id===a.actorId)?.name || a.actorId),esc(actionLabel(a.action))]))) : ''}`
  }
  function actionLabel(a) { return ({ warehouse:'倉庫登録',location:'保管場所登録',stock:'在庫更新',reserve:'引当',ship:'出荷',deliver:'納品','shipment-reverse':'出荷取消',return:'返品',invoice:'請求発行','invoice-void':'請求取消',payment:'入金記録','payment-import':'CSV取込',settle:'入金消込','settlement-undo':'消込解除','payment-void':'入金取消',purchase:'仕入発注',receive:'仕入更新',terms:'取引条件更新','branch-goal':'営業所目標設定',activity:'活動更新',thread:'連絡作成',message:'メッセージ送信','order-edit':'受注変更' })[a] || a }
  function body(d) {
    if (view === 'operations') return dashboardBody(d)
    if (view === 'fulfillment') return table(['受注番号 / サロン','受注日','状態','出荷 / 納品','受注金額（税込）','操作'],d.rows.map(o => [`<strong>${esc(o.orderNo)}</strong><small>${esc(o.salon)}</small>`,stamp(o.orderedAt),badge(o.status),o.tracked ? `出荷 ${o.shipped} / ${o.quantity}点<small>納品 ${o.delivered}点 / 未出荷 ${Math.max(0,o.quantity-o.shipped)}点</small>` : ['SHIPPED','DELIVERED'].includes(o.status) ? '旧伝票' : `${o.quantity}点`,yen(o.totalYen),button('明細・処理',`data-order="${esc(o.id)}"`,'Truck')]))
    if (view === 'inventory' && state.tab === 'stock') return table(['商品 / コード','倉庫・保管場所','現在庫','引当','利用可能 / 下限','操作'],d.rows.map(st => [`<strong>${esc(st.name)}</strong><small>${esc(st.manufacturerName)} / ${esc(st.productCode)}</small>`,`${esc(st.warehouse)}<small>${esc(st.location)}</small>`,String(st.onHand),String(st.reserved),`<strong class="${st.onHand-st.reserved<=st.minimum ? 'erp-danger' : ''}">${st.onHand-st.reserved}</strong> / ${st.minimum}`,`${isAdmin() ? button('在庫操作',`data-stock="${esc(st.id)}"`,'Package') : ''}${button('履歴',`data-history="${esc(st.id)}"`,'Search')}`]))
    if (view === 'inventory' && state.tab === 'history') return table(['日時','商品 / 保管場所','区分','増減','引当増減','更新後','理由'],d.rows.map(e => [stamp(e.createdAt),`${esc(e.name)}<small>${esc(e.warehouse)} / ${esc(e.location)}</small>`,esc(labels[e.kind] || e.kind),String(e.delta),String(e.reservedDelta),`${e.onHand}点<small>引当 ${e.reserved}点</small>`,esc(e.reason)]))
    if (view === 'inventory' && state.tab === 'purchases') return table(['発注番号 / 仕入先','入荷予定','状態','明細','操作'],d.rows.map(p => [`<strong>${esc(p.documentNo)}</strong><small>${esc(p.supplier)}</small>`,esc(p.expectedDate?.slice(0,10) || ''),badge(p.status),p.lines.map(l => `${esc(l.name)} ${l.received} / ${l.quantity}点`).join('<br>'),`${p.status === 'OPEN' ? button('入荷登録',`data-receive="${esc(p.id)}"`,'Package') + button('残数を取消',`data-purchase-cancel="${esc(p.id)}"`,'Undo2') : ''}`]))
    if (view === 'receivables' && state.tab === 'invoices') return `<div class="erp-metrics">${metric('売掛残高（税込）',yen(d.outstanding))}${metric('期日超過（税込）',yen(d.overdue))}${metric('未請求（税抜）',yen(d.unbilled.reduce((n,r) => n+r.amount,0)))}</div>${section('未請求の納品・返品',table(['サロン','税抜金額','明細数','操作'],d.unbilled.map(r => [esc(r.name),yen(r.amount),String(r.count),isAdmin() ? button('締め・発行',`data-invoice-salon="${esc(r.organizationId)}"`,'Plus') : ''])))}${table(['請求番号 / サロン','締日 / 期日','請求額（税込）','入金済み','残高','操作'],d.rows.map(i => [`<strong>${esc(i.documentNo)}</strong><small>${esc(i.salon)} ${i.voided ? '取消済み' : ''}</small>`,`${esc(i.closingDate.slice(0,10))}<small>${esc(i.dueDate.slice(0,10))}</small>`,yen(i.totalYen),yen(i.paid),yen(i.voided ? 0 : i.totalYen-i.paid),`<a class="wo-button" target="_blank" rel="noopener" href="/dealer/erp/invoice/${encodeURIComponent(i.id)}">${icon('Printer')}請求書</a>${isAdmin() && !i.voided ? button('取消',`data-invoice-void="${esc(i.id)}"`,'Undo2') : ''}`]))}`
    if (view === 'receivables' && state.tab === 'payments') return table(['入金日 / 取引番号','サロン','金額','未消込','消込履歴','操作'],d.rows.map(p => [`${esc(p.paidDate.slice(0,10))}<small>${esc(p.reference)}${p.voided ? ' / 取消済み' : ''}</small>`,esc(p.salon),yen(p.amountYen),yen(p.voided ? 0 : p.amountYen-p.allocated),p.settlements.map(a => `<div>${esc(a.documentNo)} ${yen(a.amountYen)} ${a.reversed ? '解除済み' : button('解除',`data-undo="${esc(a.id)}"`,'Undo2')}</div>`).join(''),p.voided ? '' : `${p.amountYen !== p.allocated ? button('消込',`data-settle="${esc(p.id)}"`,'Check') : ''}${button('取消',`data-payment-void="${esc(p.id)}"`,'Undo2')}`]))
    if (view === 'receivables' && state.tab === 'terms') return table(['サロン / コード','締日','入金期日','取引条件','履歴 / 操作'],state.options.salons.filter(s => !state.query.get('salon') || state.query.get('salon')===s.organizationId).map(s => [`${esc(s.name)}<small>${esc(s.publicCode)}</small>`,s.billingClosingDay === 31 ? '月末' : `${s.billingClosingDay}日`,`${s.paymentMonths}か月後 / ${s.paymentDay === 31 ? '月末' : s.paymentDay+'日'}`,esc(s.terms),`<a href="/dealer/fulfillment?salon=${encodeURIComponent(s.organizationId)}">購入・納品履歴</a>${isAdmin() ? button('条件変更',`data-terms="${esc(s.organizationId)}"`,'Pencil') : ''}`]))
    if (view === 'activities') return table(['開始 / 終了','件名 / 種別','担当者 / 営業所','サロン','公開範囲 / 状態','活動結果','操作'],d.rows.map(a => [`${stamp(a.startsAt)}<small>${stamp(a.endsAt)}</small>`,`<strong>${esc(a.title)}</strong><small>${esc(labels[a.kind])}</small>`,`${esc(a.member)}<small>${esc(a.branch || '')}</small>`,esc(a.salon || ''),`${badge(a.status)}<small>${esc(labels[a.visibility])}</small>`,esc(a.result),isAdmin() || a.memberId===state.options.viewer.memberId ? button('編集・記録',`data-activity="${esc(a.id)}"`,'Pencil') : '']))
    if (view === 'messages') return table(['件名','相手','更新日時','未読','操作'],d.rows.map(t => [`<strong>${esc(t.subject)}</strong>`,esc(t.salon || (salonDealer ? 'ディーラー' : t.memberIds.map(id => state.options.members.find(m => m.id===id)?.name || '担当者').join('・'))),stamp(t.updated),t.unread ? `<strong class="erp-danger">${t.unread}件</strong>` : '0',button('開く',`data-thread="${esc(t.id)}"`,'MessageSquare')]))
    return ''
  }
  async function load() {
    const serial = ++state.request
    const name = { operations:'dashboard',fulfillment:'orders',inventory:state.tab==='stock' ? 'inventory':state.tab,receivables:state.tab==='invoices' ? 'receivables':state.tab,activities:'activities',messages:'threads' }[view]
    root.querySelector('#erp-body').setAttribute('aria-busy','true')
    try {
      const d = name==='terms' ? {} : await api(name,{ ...Object.fromEntries(state.query),page:state.page })
      if (serial !== state.request) return
      state.data = d
      root.querySelector('#erp-body').innerHTML = body(d)
      pager(d)
    } catch (e) { notice(e.message,true) }
    finally { if (serial===state.request) root.querySelector('#erp-body').setAttribute('aria-busy','false') }
  }
  function dialog(title, content) {
    const el = document.createElement('dialog'); el.className = 'erp-dialog'
    el.innerHTML = `<header><h2>${esc(title)}</h2>${button('閉じる','data-close','X')}</header><div class="erp-dialog-content">${content}</div>`
    document.body.append(el)
    el.querySelector('[data-close]').onclick = () => el.close()
    el.addEventListener('close',() => el.remove(),{ once:true })
    el.showModal()
    return el
  }
  function form(title, fields, save, onDone) {
    const el = dialog(title,`<form class="erp-form">${fields}<p class="erp-error erp-wide" role="alert" hidden></p><footer class="erp-wide"><button class="wo-button wo-button-primary" type="submit">${icon('Check')}保存</button></footer></form>`)
    const f = el.querySelector('form')
    let key = crypto.randomUUID()
    f.addEventListener('input',() => { key = crypto.randomUUID() })
    f.addEventListener('keydown',e => { if (e.key==='Enter' && (e.isComposing || e.keyCode===229)) e.preventDefault() })
    f.addEventListener('submit',async e => {
      e.preventDefault()
      const submit = f.querySelector('[type=submit]'), err = f.querySelector('[role=alert]')
      if (submit.disabled) return
      submit.disabled = true; err.hidden = true
      try {
        const result = await save(Object.fromEntries(new FormData(f)),key,f)
        el.close(); await onDone?.(result)
        state.options = await api('options'); await load(); notice('保存しました。')
      } catch (error) { err.textContent=error.message; err.hidden=false }
      finally { submit.disabled=false }
    })
    bindProductPickers(el)
    return el
  }
  function productField(product = null) {
    return `<div class="erp-product-picker erp-wide">${hidden('productId',product?.id || '')}<span>商品</span><strong data-product-name>${esc(product?.name || '未選択')}</strong>${button('商品を選択','data-pick-product','Search')}</div>`
  }
  function bindProductPickers(el) {
    el.querySelectorAll('[data-pick-product]').forEach(btn => btn.onclick = () => {
      const target = btn.closest('.erp-product-picker')
      const picker = dialog('商品を選択',`<form class="erp-product-search">${input('q','商品名・メーカー・商品コード','','search')}<button type="submit" class="wo-button">${icon('Search')}検索</button></form><div data-results></div><div data-product-pager></div><p role="alert"></p>`)
      const search = picker.querySelector('form'); let page = 1, current = [], seq = 0
      async function find() {
        const request = ++seq
        try {
          const result = await api('products',{ q:new FormData(search).get('q'),page })
          if (request !== seq || !picker.open) return
          current = result.rows
          picker.querySelector('[data-results]').innerHTML = result.rows.map(p => `<button type="button" class="erp-product-result" data-product="${esc(p.id)}"><strong>${esc(p.name)}</strong><small>${esc(p.manufacturerName)} / ${esc(p.productCode)}</small></button>`).join('') || '<p>該当する商品はありません。</p>'
          picker.querySelector('[data-product-pager]').innerHTML = button('前へ',`data-products-page="${page-1}" ${page===1 ? 'disabled':''}`,'ChevronLeft') + `${page} / ${result.pages}` + button('次へ',`data-products-page="${page+1}" ${page>=result.pages ? 'disabled':''}`,'ChevronRight')
        } catch (e) { picker.querySelector('[role=alert]').textContent=e.message }
      }
      search.addEventListener('submit',e => { e.preventDefault(); page=1; find() })
      search.addEventListener('keydown',e => { if (e.key==='Enter' && (e.isComposing || e.keyCode===229)) e.preventDefault() })
      picker.addEventListener('click',e => {
        const p = e.target.closest('[data-product]'), pageBtn = e.target.closest('[data-products-page]')
        if (pageBtn) { page=Number(pageBtn.dataset.productsPage); find() }
        if (p) {
          const selected = current.find(r => r.id===p.dataset.product)
          target.querySelector('[name=productId]').value=selected.id
          target.querySelector('[data-product-name]').textContent=selected.name
          target.querySelector('input').dispatchEvent(new Event('input',{ bubbles:true }))
          picker.close()
        }
      })
      find()
    })
  }
  function confirmation(title, action, payload, done) {
    return form(title,area('reason','理由','',true), (data,key) => command(action,{ ...payload,...data },key),done)
  }
  function create(kind, preset = {}) {
    if (kind==='warehouse') return form('倉庫を追加',input('name','倉庫名','','text','required maxlength="160"')+select('branchId','営業所',state.options.branches,'','全社共通')+input('location','最初の保管場所','標準棚','text','required'),(p,k) => command(kind,p,k))
    if (kind==='location') return form('保管場所を追加',select('warehouseId','倉庫',[...new Map(state.options.locations.map(l => [l.warehouseId,{ id:l.warehouseId,name:l.warehouse }])).values()],'',null)+input('name','保管場所名','','text','required'),(p,k) => command(kind,p,k))
    if (kind==='stock') {
      const st=preset.stock
      return form('入出庫・棚卸し',productField(st ? { id:st.productId,name:st.name } : null)+locSelect(st?.locationId)+enumSelect('kind','操作',['RECEIPT','ISSUE','COUNT','TRANSFER'],st ? 'COUNT':'RECEIPT')+input('quantity','数量 / 棚卸し実数',st?.onHand || 0,'number','required min="0" max="1000000000"')+locSelect('','destinationId')+input('minimum','在庫下限',st?.minimum || 0,'number','required min="0"')+hidden('version',st?.version || 0)+area('reason','理由','',true),(p,k) => command('stock',p,k))
    }
    if (kind==='purchase') {
      const field = () => `<fieldset class="erp-purchase-line erp-wide"><legend>発注明細</legend>${productField()}<div class="erp-fields">${input('quantity','数量',1,'number','required min="1"')}${input('unitCost','仕入単価（税抜）',0,'number','required min="0"')}</div>${button('明細を削除','data-remove-line','X')}</fieldset>`
      const el=form('仕入発注',input('supplier','メーカー・仕入先','','text','required')+input('expectedDate','入荷予定日','','date')+`<div class="erp-purchase-lines erp-wide">${field()}</div>${button('明細を追加','data-add-line','Plus')}`,(p,k,f) => command('purchase',{ supplier:p.supplier,expectedDate:p.expectedDate,lines:[...f.querySelectorAll('.erp-purchase-line')].map(row => Object.fromEntries([...row.querySelectorAll('input')].map(i => [i.name,i.value]))) },k))
      el.addEventListener('click',e => {
        if (e.target.closest('[data-add-line]')) { const wrap=el.querySelector('.erp-purchase-lines'); wrap.insertAdjacentHTML('beforeend',field()); bindProductPickers(wrap.lastElementChild) }
        if (e.target.closest('[data-remove-line]')) e.target.closest('fieldset').remove()
      })
      return el
    }
    if (kind==='invoice') {
      const due = organizationId => {
        const c=state.options.salons.find(s => s.organizationId===organizationId), now=new Date(today()+'T00:00:00Z')
        now.setUTCMonth(now.getUTCMonth()+(c?.paymentMonths ?? 1),1)
        const last=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()+1,0)).getUTCDate()
        now.setUTCDate(Math.min(c?.paymentDay || 31,last)); return now.toISOString().slice(0,10)
      }
      const el=form('締め・請求書発行',salonSelect('organizationId',preset.organizationId)+input('closingDate','今回の締日',today(),'date','required')+input('dueDate','支払期日',due(preset.organizationId),'date','required'),(p,k) => command('invoice',p,k))
      el.querySelector('[name=organizationId]').onchange=e => { el.querySelector('[name=dueDate]').value=due(e.target.value) }
      return el
    }
    if (kind==='payment') return form('入金・返金を記録',salonSelect()+input('reference','取引番号','','text','required')+input('paidDate','入金日',today(),'date','required')+input('amountYen','金額（返金はマイナス）','','number','required')+area('note','摘要'),(p,k) => command('payment',p,k))
    if (kind==='payment-import') return form('入金CSV取込',`<a href="${apiUrl('payment-template.csv')}">${icon('Download')}CSVテンプレート</a><label class="erp-wide"><span>銀行明細（テンプレート形式・UTF-8）</span><input name="file" type="file" accept=".csv,text/csv" required></label>`,async(p,k,f) => {
      const file=f.querySelector('[name=file]').files[0]
      if (!file || file.size>400000) throw new Error('CSVは400KB以内で選択してください。')
      return command('payment-import',{ csv:await file.text() },k)
    },r => notice(`取込 ${r.imported}件 / 重複スキップ ${r.skipped}件`))
    if (kind==='activity') {
      const a=preset.activity || {}, local=v => v ? new Date(new Date(v).getTime()+9*3600000).toISOString().slice(0,16) : today()+'T09:00'
      return form(a.id ? '予定・活動記録':'予定を追加',hidden('id',a.id || '')+hidden('version',a.version || 0)+input('title','件名',a.title || '','text','required')+enumSelect('kind','種別',['VISIT','DELIVERY','SUPPORT','INTERNAL'],a.kind || 'VISIT')+select('memberId','担当者',isAdmin() ? state.options.members : state.options.members.filter(m => m.id===state.options.viewer.memberId),a.memberId || state.options.viewer.memberId,null)+salonSelect('organizationId',a.organizationId,'指定なし')+input('startsAt','開始日時（日本時間）',local(a.startsAt),'datetime-local','required')+input('endsAt','終了日時（日本時間）',a.endsAt ? local(a.endsAt) : today()+'T10:00','datetime-local','required')+enumSelect('visibility','共有範囲',['PRIVATE','BRANCH','DEALER'],a.visibility || 'BRANCH')+enumSelect('status','状態',['PLANNED','DONE','CANCELLED'],a.status || 'PLANNED')+area('note','予定メモ',a.note)+area('result','活動結果',a.result),(p,k) => command('activity',{ ...p,orderId:a.orderId || null,startsAt:p.startsAt+':00+09:00',endsAt:p.endsAt+':00+09:00' },k))
    }
    if (kind==='thread') return form('新しい連絡',salonDealer ? input('subject','件名','','text','required')+area('body','本文','',true) : salonSelect('organizationId','','社内連絡')+select('memberId','社内の連絡先',state.options.members.filter(m => m.id!==state.options.viewer.memberId),'','サロン宛の場合は不要')+input('subject','件名','','text','required')+area('body','本文','',true),(p,k) => command('thread',{ ...p,memberIds:p.memberId ? [p.memberId]:[] },k),r => openThread(r.id))
  }
  async function openOrder(orderId) {
    const el = dialog('受注・出荷・納品','<p role="status">読み込み中</p>')
    let detail
    async function update() {
      try {
        detail = await api('order',{ id:orderId })
        if (!el.open) return
        const o=detail.order, editable=o.tracked || ['ORDERED','ACCEPTED'].includes(o.status)
        el.querySelector('.erp-dialog-content').innerHTML = `<h3>${esc(o.orderNo)} ${badge(o.status)}</h3>${table(['商品','受注 / 取消','引当 / 未出荷','納品 / 返品','単価（税抜）','操作'],detail.lines.map(l => [`<strong>${esc(l.productName)}</strong><small>${esc(l.productCode)}</small>`,`${l.quantity} / ${l.cancelled}`,`${l.reserved} / ${Math.max(0,l.quantity-l.cancelled-l.shipped)}`,`${l.delivered} / ${l.returned}`,yen(l.unitPrice),editable ? `${l.quantity>l.cancelled+l.shipped+l.reserved ? button('引当',`data-reserve="${esc(l.id)}"`,'Package') : ''}${l.reserved ? button('引当解除',`data-release="${esc(l.id)}"`,'Undo2') : ''}${!l.shipped&&!l.cancelled ? button('明細変更',`data-line-edit="${esc(l.id)}"`,'Pencil') : ''}` : '']))}<div class="erp-toolbar">${editable ? button('引当分を出荷','data-ship','Truck',true)+button('未出荷分を取消','data-cancel-remainder','Undo2') : ''}<a class="wo-button" href="/dealer/orders/${encodeURIComponent(orderId)}/export.csv">${icon('Download')}受注CSV</a>${button('この受注について連絡','data-order-message','MessageSquare')}</div>${section('出荷・納品履歴',detail.shipments.map(sh => `<article class="erp-shipment"><header><strong>${esc(sh.documentNo)}</strong>${badge(sh.status)}<span>${stamp(sh.shippedAt)}</span></header>${table(['商品','出荷数量','返品済み','操作'],sh.lines.map(l => [esc(l.productName),String(l.quantity),String(l.returned),sh.status==='DELIVERED' && l.returned<l.quantity ? button('返品',`data-return="${esc(l.id)}" data-shipment="${esc(sh.id)}"`,'Undo2') : '']))}<div class="erp-toolbar"><a class="wo-button" target="_blank" rel="noopener" href="/dealer/erp/shipment/${encodeURIComponent(sh.id)}">${icon('Printer')}納品書</a>${sh.status==='SHIPPED' ? button('納品完了',`data-deliver="${esc(sh.id)}"`,'Check',true)+button('出荷取消',`data-reverse="${esc(sh.id)}"`,'Undo2') : ''}</div></article>`).join('') || '<p class="erp-empty">出荷履歴はありません。</p>')}`
      } catch (e) { el.querySelector('.erp-dialog-content').textContent=e.message }
    }
    el.addEventListener('click',e => {
      const b=e.target.closest('button'); if (!b || !detail) return
      const l=detail.lines.find(l => l.id===(b.dataset.reserve || b.dataset.release || b.dataset.lineEdit))
      if (b.hasAttribute('data-reserve')) form('在庫を引き当てる',`<p class="erp-wide">${esc(l.productName)}</p>${!l.dealerProductId ? productField() : ''}${locSelect()}${input('quantity','引当数量',Math.max(1,l.quantity-l.cancelled-l.shipped-l.reserved),'number',`required min="1" max="${l.quantity-l.cancelled-l.shipped-l.reserved}"`)}`,(p,k) => command('reserve',{ ...p,orderId,lineId:l.id },k),update)
      if (b.hasAttribute('data-release')) form('引当を解除',`<p>${esc(l.productName)} / ${l.reserved}点</p>`,(p,k) => command('reserve',{ orderId,lineId:l.id,release:true },k),update)
      if (b.hasAttribute('data-line-edit')) form('受注明細を変更',input('quantity','数量',l.quantity,'number','required min="1" max="999"')+input('unitPrice','契約単価（税抜）',l.unitPrice,'number','required min="0"')+area('reason','変更理由','',true),(p,k) => command('order-edit',{ ...p,orderId,lineId:l.id,kind:'EDIT' },k),update)
      if (b.hasAttribute('data-ship')) form('引当分を出荷',`<p>${esc(detail.order.orderNo)} / ${detail.lines.reduce((n,l) => n+l.reserved,0)}点</p>`,(p,k) => command('ship',{ orderId },k),update)
      if (b.hasAttribute('data-cancel-remainder')) confirmation('未出荷分を取消','order-edit',{ orderId,kind:'CANCEL' },update)
      if (b.hasAttribute('data-deliver')) form('納品完了',`<p>${esc(detail.shipments.find(sh => sh.id===b.dataset.deliver).documentNo)}</p>`,(p,k) => command('deliver',{ shipmentId:b.dataset.deliver },k),update)
      if (b.hasAttribute('data-reverse')) confirmation('出荷を取消','shipment-reverse',{ shipmentId:b.dataset.reverse },update)
      if (b.hasAttribute('data-return')) {
        const item=detail.shipments.find(sh => sh.id===b.dataset.shipment).lines.find(l => l.id===b.dataset.return)
        form('返品を登録',`<p class="erp-wide">${esc(item.productName)}</p>${input('quantity','返品数量',1,'number',`required min="1" max="${item.quantity-item.returned}"`)}<label class="erp-check"><input name="restock" type="checkbox" checked>倉庫在庫に戻す</label>${area('reason','返品理由','',true)}`,(p,k) => command('return',{ ...p,restock:p.restock==='on',shipmentId:b.dataset.shipment,lineId:item.id },k),update)
      }
      if (b.hasAttribute('data-order-message')) form('サロンへ連絡',input('subject','件名',detail.order.orderNo+'について','text','required')+area('body','本文','',true),(p,k) => command('thread',{ ...p,orderId,organizationId:detail.order.organizationId },k),r => openThread(r.id))
    })
    await update()
  }
  async function openThread(threadId) {
    const el=dialog('連絡',`<div class="erp-chat"><div class="erp-chat-controls">${button('以前のメッセージ','data-earlier','ChevronLeft')}${button('更新','data-chat-refresh','RefreshCw')}</div><div class="erp-chat-log" role="log" aria-live="polite"></div><form class="erp-composer"><label><span>メッセージ</span><textarea name="body" rows="3" maxlength="4000" required></textarea></label><button type="submit" class="wo-button wo-button-primary">${icon('Send')}送信</button></form><p class="erp-error" role="alert"></p></div>`)
    let all=[], busy=false, key=crypto.randomUUID(), stopped=false, readThrough=0
    const log=el.querySelector('.erp-chat-log'), f=el.querySelector('form'), err=el.querySelector('[role=alert]')
    async function refresh(before) {
      if (busy || stopped) return
      busy=true
      try {
        const result=await api('messages',{ thread:threadId,...(before ? { before } : {}) })
        if (stopped) return
        el.querySelector('h2').textContent=result.thread.subject
        const wasBottom=log.scrollHeight-log.scrollTop-log.clientHeight<40
        const previousHeight=log.scrollHeight
        const merged=[...new Map([...all,...result.rows].map(m => [m.id,m])).values()].sort((a,b) => a.id-b.id)
        if (merged.length!==all.length) {
          all=merged
          log.innerHTML=all.map(m => `<article class="erp-chat-message ${m.senderType===(salonDealer ? 'SALON':'DEALER') ? 'outgoing':''}"><header><strong>${esc(m.senderName)}</strong><time>${stamp(m.createdAt)}</time></header><p>${esc(m.body)}</p></article>`).join('')
          if (before) log.scrollTop=log.scrollHeight-previousHeight
          else if (wasBottom || !previousHeight) log.scrollTop=log.scrollHeight
        }
        if (before || !el.dataset.loaded) el.querySelector('[data-earlier]').disabled=!result.more
        el.dataset.loaded='1'
        if (all.length && document.visibilityState==='visible' && all.at(-1).id>readThrough) {
          await command('read',{ threadId,messageId:all.at(-1).id })
          readThrough=all.at(-1).id
        }
      } catch (e) { err.textContent=e.message }
      finally { busy=false }
    }
    f.addEventListener('input',() => { key=crypto.randomUUID() })
    f.addEventListener('submit',async e => {
      e.preventDefault(); const submit=f.querySelector('button')
      if (submit.disabled) return
      submit.disabled=true; err.textContent=''
      const draft=new FormData(f).get('body')
      try { await command('message',{ threadId,body:draft },key); if (f.querySelector('textarea').value===draft) { f.reset();key=crypto.randomUUID() } await refresh() }
      catch (e) { err.textContent=e.message }
      finally { submit.disabled=false }
    })
    el.querySelector('[data-earlier]').onclick=() => refresh(all[0]?.id)
    el.querySelector('[data-chat-refresh]').onclick=() => refresh()
    const timer=setInterval(() => { if (document.visibilityState==='visible') refresh() },15000)
    el.addEventListener('close',() => { stopped=true; clearInterval(timer); load() },{ once:true })
    await refresh()
  }
  root.addEventListener('click',async e => {
    const b=e.target.closest('button'); if (!b) return
    try {
      if (b.hasAttribute('data-tab')) { state.tab=b.dataset.tab; state.page=1; state.query.delete('stock'); shell(); await load() }
      if (b.hasAttribute('data-page')) { state.page=Number(b.dataset.page); await load() }
      if (b.hasAttribute('data-refresh')) await load()
      if (b.hasAttribute('data-reset')) { state.query=new URLSearchParams(); state.page=1; shell(); await load() }
      if (b.hasAttribute('data-create')) create(b.dataset.create)
      if (b.hasAttribute('data-order')) await openOrder(b.dataset.order)
      if (b.hasAttribute('data-thread')) await openThread(b.dataset.thread)
      if (b.hasAttribute('data-stock')) create('stock',{ stock:state.data.rows.find(r => r.id===b.dataset.stock) })
      if (b.hasAttribute('data-history')) { state.query.set('stock',b.dataset.history); state.tab='history'; state.page=1; shell(); await load() }
      if (b.hasAttribute('data-invoice-salon')) create('invoice',{ organizationId:b.dataset.invoiceSalon })
      if (b.hasAttribute('data-invoice-void')) confirmation('請求書を取消','invoice-void',{ invoiceId:b.dataset.invoiceVoid })
      if (b.hasAttribute('data-payment-void')) confirmation('入金を取消','payment-void',{ paymentId:b.dataset.paymentVoid })
      if (b.hasAttribute('data-undo')) confirmation('消込を解除','settlement-undo',{ settlementId:b.dataset.undo })
      if (b.hasAttribute('data-purchase-cancel')) confirmation('未入荷分を取消','receive',{ purchaseId:b.dataset.purchaseCancel,cancel:true })
      if (b.hasAttribute('data-receive')) {
        const po=state.data.rows.find(r => r.id===b.dataset.receive)
        form('仕入入荷を登録',select('lineId','発注明細',po.lines.filter(l => l.quantity>l.received).map(l => ({ id:l.id,name:`${l.name} / 未入荷 ${l.quantity-l.received}点` })),'',null)+locSelect()+input('quantity','今回の入荷数量',1,'number','required min="1"'),(p,k) => command('receive',{ ...p,purchaseId:po.id },k))
      }
      if (b.hasAttribute('data-settle')) {
        const pay=state.data.rows.find(r => r.id===b.dataset.settle)
        // Fetch all outstanding pages for this salon without silently dropping older invoices.
        let rows=[],page=1
        do { const r=await api('receivables',{ salon:pay.organizationId,open:1,page }); rows.push(...r.rows); if (page++>=r.pages) break } while(page<1000)
        rows=rows.filter(i => !i.voided && Math.sign(i.totalYen-i.paid)===Math.sign(pay.amountYen-pay.allocated))
        form('入金を請求書へ消込',`<p class="erp-wide">${esc(pay.reference)} / 未消込 ${yen(pay.amountYen-pay.allocated)}</p>${select('invoiceId','請求書',rows.map(i => ({ id:i.id,name:`${i.documentNo} / 残高 ${yen(i.totalYen-i.paid)}` })),'',null)}${input('amountYen','消込額',pay.amountYen-pay.allocated,'number','required')}`,(p,k) => command('settle',{ ...p,paymentId:pay.id },k))
      }
      if (b.hasAttribute('data-terms')) {
        const s=state.options.salons.find(s => s.organizationId===b.dataset.terms)
        form(s.name+'の取引条件',input('paymentMonths','支払い月（締月からの月数）',s.paymentMonths,'number','required min="0" max="6"')+input('paymentDay','支払日（31は月末）',s.paymentDay,'number','required min="1" max="31"')+area('note','取引条件',s.terms),(p,k) => command('terms',{ ...p,organizationId:s.organizationId },k))
      }
      if (b.hasAttribute('data-goal')) {
        const g=state.data.branches.find(r => r.id===b.dataset.goal)
        form(g.name+'の月次目標',input('month','対象月',state.data.month,'month','required')+input('salesTargetYen','売上目標（税抜）',g.salesTargetYen,'number','required min="0"')+input('acquisitionTarget','新規獲得目標',g.acquisitionTarget,'number','required min="0"'),(p,k) => command('branch-goal',{ ...p,branchId:g.id },k))
      }
      if (b.hasAttribute('data-activity')) create('activity',{ activity:state.data.rows.find(a => a.id===b.dataset.activity) })
    } catch (e) { notice(e.message,true) }
  })
  async function boot() {
    try {
      state.options=await api('options')
      shell(); await load()
      if (view==='fulfillment' && state.query.get('order')) await openOrder(state.query.get('order'))
    } catch(e) { root.innerHTML=`<div class="erp-app"><p role="alert">${esc(e.message)}</p>${button('再試行','data-boot','RefreshCw')}</div>`; root.querySelector('[data-boot]').onclick=boot }
  }
  boot()
})()
