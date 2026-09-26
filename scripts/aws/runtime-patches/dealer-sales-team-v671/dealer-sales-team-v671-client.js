(() => {
  'use strict'
  const root = document.getElementById('wholesale-app')
  if (!root) return
  const view = document.body.dataset.dealerView
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]))
  const yen = n => Number(n || 0).toLocaleString('ja-JP') + '円'
  const state = { options:null, report:null, team:null, tab:'members', page:1, query:'', filters:new URLSearchParams(location.search) }
  const month = () => new Intl.DateTimeFormat('sv-SE',{ timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit' }).format(new Date())
  if (!state.filters.get('month')) state.filters.set('month',month())
  const isAdmin = () => state.options?.viewer.role === 'ADMIN'
  const branchName = id => state.options?.branches.find(b => b.id === id)?.name || '未設定'
  const memberName = id => state.options?.members.find(m => m.id === id)?.name || '未設定'
  async function api(path, body) {
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(),20000)
    try {
      const res = await fetch(path,{ method:body ? 'POST':'GET', credentials:'same-origin', signal:controller.signal, headers:body ? {'Content-Type':'application/json'} : {}, ...(body ? {body:JSON.stringify(body)}:{}) })
      const data = await res.json()
      if (res.status === 401) { location.assign('/dealer/login'); throw new Error('ログインし直してください。') }
      if (data.redirect) { location.assign(data.redirect); throw new Error(data.error) }
      if (!res.ok) throw new Error(data.error || '読み込みに失敗しました。')
      return data
    } catch (error) { if (error.name === 'AbortError') throw new Error('通信がタイムアウトしました。もう一度お試しください。'); throw error }
    finally { clearTimeout(timer) }
  }
  function notice(message,error = false) {
    const el = document.getElementById('dst-notice')
    if (el) { el.textContent=message; el.className='dst-notice' + (error ? ' error':''); el.hidden=false }
  }
  function option(value,label,current) { return `<option value="${esc(value)}"${String(value) === String(current) ? ' selected':''}>${esc(label)}</option>` }
  function select(name,label,items,current,empty='すべて') { return `<label><span>${label}</span><select name="${name}">${empty !== null ? option('',empty,current):''}${items.map(i => option(i.id,i.name,current)).join('')}</select></label>` }
  const closingOptions = Array.from({length:31},(_,i) => ({id:i+1,name:i === 30 ? '月末締め':`${i+1}日締め`}))
  const input = (name,label,value,type='text',extra='') => `<label><span>${label}</span><input name="${name}" type="${type}" value="${esc(value)}" ${extra}></label>`
  const action = (label,attrs='',primary=false) => `<button class="wo-button${primary ? ' wo-button-primary':''}" ${attrs}>${label}</button>`
  function paginate(rows, render) {
    const pages = Math.max(1,Math.ceil(rows.length/20)); state.page=Math.min(state.page,pages)
    const start=(state.page-1)*20
    return render(rows.slice(start,start+20)) + `<footer class="dst-pager"><span>${rows.length ? start+1:0}〜${Math.min(start+20,rows.length)} / ${rows.length}件</span><div>${action('前へ',`data-page="${state.page-1}" ${state.page === 1 ? 'disabled':''}`)}<span>${state.page} / ${pages}</span>${action('次へ',`data-page="${state.page+1}" ${state.page === pages ? 'disabled':''}`)}</div></footer>`
  }
  function table(head,rows,empty='該当するデータはありません。') { return `<div class="dst-table-wrap"><table class="dst-table"><thead><tr>${head.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows || `<tr><td colspan="${head.length}" class="dst-empty">${empty}</td></tr>`}</tbody></table></div>` }
  function progress(actual,target,unit='円') {
    const rate=target ? Math.round(actual/target*1000)/10 : null
    return `<div class="dst-progress"><div><strong>${unit === '円' ? yen(actual):actual+'件'}</strong><span>${rate === null ? '目標未設定':rate.toLocaleString('ja-JP')+'%'}</span></div><progress max="100" value="${Math.min(rate || 0,100)}" aria-label="達成率">${rate || 0}%</progress><small>目標 ${unit === '円' ? yen(target):target+'件'}${target ? ' ・残り '+(unit === '円' ? yen(Math.max(0,target-actual)):Math.max(0,target-actual)+'件'):''}</small></div>`
  }
  function filters() {
    const f=state.filters, o=state.options
    return `<form id="dst-filters" class="dst-filters">${input('month','対象月',f.get('month'),'month','required min="2000-01" max="2099-12"')}${select('salon','請求先（サロン）',o.salons.map(s=>({id:s.organizationId,name:s.name})),f.get('salon'))}${select('closing','締日',closingOptions,f.get('closing'))}${isAdmin() ? select('member','担当者',o.members,f.get('member')):''}${select('branch','営業所',o.branches,f.get('branch'))}<div class="dst-filter-actions">${action('絞り込む','type="submit"',true)}${action('リセット','type="button" data-reset')}</div></form>`
  }
  function reportBody() {
    const r=state.report
    const sales=r.summary
    if (view === 'targets') {
      const list=r.progress
      const totals=list.reduce((t,m)=>({actual:t.actual+m.actualYen,sales:t.sales+m.salesTargetYen,acquired:t.acquired+m.acquisitionCount,acquisition:t.acquisition+m.acquisitionTarget}),{actual:0,sales:0,acquired:0,acquisition:0})
      return `<div class="dst-metrics"><div><span>売上目標・実績（税抜）</span>${progress(totals.actual,totals.sales)}</div><div><span>新規獲得目標・実績</span>${progress(totals.acquired,totals.acquisition,'件')}</div></div><section class="dst-section"><header><h2>担当者別の進捗</h2><span>${esc(r.month)} ・納品売上 / 税抜</span></header>${paginate(list,items=>table(['担当者 / 営業所','売上目標・実績','新規獲得目標・実績','受注見込み',...(isAdmin()?['操作']:[])],items.map(m=>`<tr><td><strong>${esc(m.name)}</strong><small>${esc(branchName(m.branchId))}${m.active ? '':' ・停止中'}</small></td><td>${progress(m.actualYen,m.salesTargetYen)}</td><td>${progress(m.acquisitionCount,m.acquisitionTarget,'件')}</td><td class="dst-number">${yen(m.forecastYen)}</td>${isAdmin()?`<td>${action('目標を設定',`data-goal="${esc(m.id)}" ${m.active ? '':'disabled'}`)}</td>`:''}</tr>`).join('')))}</section>`
    }
    return `<div class="dst-metrics"><div><span>納品売上（税抜）</span><strong>${yen(sales.actualYen)}</strong><small>${sales.deliveredCount}伝票 / 納品日基準</small></div><div><span>受注見込み（税抜）</span><strong>${yen(sales.forecastYen)}</strong><small>${sales.orderCount}伝票 / 受注日基準</small></div></div>${sales.unassignedCount && isAdmin() ? `<p class="dst-warning">担当未設定の伝票 ${sales.unassignedCount}件 <a href="/dealer/team?tab=salons">担当設定へ</a></p>`:''}<section class="dst-section"><header><h2>カテゴリー別売上</h2><span>税抜・値引き後</span></header>${table(['カテゴリー','納品売上','構成比','受注見込み'],r.categories.map(c=>`<tr><td><strong>${esc(c.category)}</strong></td><td class="dst-number">${yen(c.actualYen)}</td><td><div class="dst-share"><progress max="100" value="${sales.actualYen ? c.actualYen/sales.actualYen*100:0}" aria-label="${esc(c.category)}の構成比"></progress><span>${sales.actualYen ? (c.actualYen/sales.actualYen*100).toFixed(1):'0.0'}%</span></div></td><td class="dst-number">${yen(c.forecastYen)}</td></tr>`).join(''))}</section><section class="dst-section"><header><h2>請求先別売上</h2><span>${r.salons.length}サロン</span></header>${paginate(r.salons,items=>table(['請求先（サロン）','納品売上','納品伝票数','受注見込み'],items.map(s=>`<tr><td><strong>${esc(s.name)}</strong></td><td class="dst-number">${yen(s.actualYen)}</td><td class="dst-number">${s.count}</td><td class="dst-number">${yen(s.forecastYen)}</td></tr>`).join('')))}</section>`
  }
  function teamBody() {
    const t=state.team, tab=state.tab
    let rows=t[tab] || []
    const q=state.query.normalize('NFKC').toLocaleLowerCase()
    rows=rows.filter(r=>(r.name+' '+(r.loginId||'')).normalize('NFKC').toLocaleLowerCase().includes(q))
    const tabs=`<div class="dst-tabs" role="tablist" aria-label="管理対象">${[['members','スタッフ'],['branches','営業所'],['salons','サロン担当・締日']].map(([k,l])=>`<button type="button" role="tab" aria-selected="${tab===k}" data-tab="${k}">${l}</button>`).join('')}</div>`
    const toolbar=`<div class="dst-toolbar"><form id="dst-search">${input('q','検索',state.query,'search','placeholder="名称・ログインID"')}${action('検索','type="submit"')}</form>${tab==='members' ? action('スタッフを追加','data-member=""',true):tab==='branches' ? action('営業所を追加','data-branch=""',true):''}</div>`
    return tabs+toolbar+paginate(rows,items=>tab==='members' ? table(['氏名 / ログインID','区分','営業所','状態','操作'],items.map(m=>`<tr><td><strong>${esc(m.name)}</strong><small>${esc(m.loginId)}</small></td><td>${m.role==='ADMIN'?'管理者':'スタッフ'}${m.legacyOwner?'（代表）':''}</td><td>${esc(branchName(m.branchId))}</td><td><span class="dst-status ${m.active?'active':''}">${m.active?'利用中':'停止中'}</span>${m.mustChangePassword?'<small>初回変更待ち</small>':''}</td><td><div class="dst-row-actions">${action('編集',`data-member="${esc(m.id)}"`)}${!m.legacyOwner&&m.active ? action('パスワード再発行',`data-password-reset="${esc(m.id)}"`):''}</div></td></tr>`).join('')) : tab==='branches' ? table(['営業所名','スタッフ数','操作'],items.map(b=>`<tr><td><strong>${esc(b.name)}</strong></td><td>${t.members.filter(m=>m.branchId===b.id&&m.active).length}名</td><td>${action('編集',`data-branch="${esc(b.id)}"`)}</td></tr>`).join('')) : table(['サロン','担当者','営業所','締日','操作'],items.map(s=>`<tr><td><strong>${esc(s.name)}</strong><small>${s.status==='ACTIVE'?'取引中':s.status==='PENDING'?'承認待ち':'停止中'}</small></td><td>${esc(memberName(s.salesMemberId))}</td><td>${esc(branchName(s.salesBranchId))}</td><td>${s.billingClosingDay===31?'月末':s.billingClosingDay+'日'}</td><td>${action('担当・締日を設定',`data-assignment="${esc(s.id)}"`)}</td></tr>`).join('')))
  }
  function render() {
    root.innerHTML=`<div class="dst-app"><div id="dst-notice" class="dst-notice" role="status" hidden></div>${view==='team' ? teamBody() : filters()+`<div id="dst-report">${reportBody()}</div>`}</div>`
    for (const button of root.querySelectorAll('[data-password-reset]')) {
      if (button.dataset.passwordReset === state.options.viewer.memberId) button.remove()
    }
  }
  function dialog(title,body,onSubmit) {
    const el=document.createElement('dialog'); el.className='dst-dialog'
    el.innerHTML=`<form><header><h2>${esc(title)}</h2></header><div class="dst-dialog-body">${body}<p class="dst-dialog-error" role="alert" hidden></p></div><footer>${action('キャンセル','type="button" data-close')}${action('保存','type="submit"',true)}</footer></form>`
    document.body.append(el); el.addEventListener('close',()=>el.remove()); el.querySelector('[data-close]').onclick=()=>el.close()
    el.querySelector('form').addEventListener('submit',async event=>{
      event.preventDefault(); const button=el.querySelector('[type=submit]'); button.disabled=true
      try { await onSubmit(Object.fromEntries(new FormData(event.target))); el.close() }
      catch(error) { const msg=el.querySelector('[role=alert]'); msg.textContent=error.message; msg.hidden=false }
      finally { button.disabled=false }
    }); el.showModal()
    return el
  }
  function credentials(result) {
    const el=dialog('ログイン情報',`${input('loginId','ログインID',result.loginId,'text','readonly')}${input('initialPassword','初期パスワード',result.initialPassword,'text','readonly')}<p>初回ログイン後にパスワードの変更が必要です。</p>`,async()=>{})
    el.querySelector('[type=submit]').textContent='確認しました'
    el.querySelector('[data-close]').hidden=true
  }
  async function reloadTeam() { state.team=await api('/api/dealer/team/data'); state.options=state.team; render() }
  function memberDialog(id) {
    const m=state.team.members.find(m=>m.id===id) || {name:'',role:'STAFF',branchId:'',active:true}
    const body=input('name','氏名',m.name,'text','required maxlength="80"')+(id ? `<p>ログインID：${esc(m.loginId)}</p>`:input('loginId','ログインID','','text','required minlength="4" maxlength="80" pattern="[a-zA-Z0-9][a-zA-Z0-9._-]{3,79}" autocapitalize="none" autocomplete="off"'))+select('role','区分',[{id:'STAFF',name:'スタッフ'},{id:'ADMIN',name:'管理者'}],m.role,null)+select('branchId','営業所',state.team.branches,m.branchId,'未設定')+(id&&!m.legacyOwner?select('active','利用状態',[{id:'true',name:'利用中'},{id:'false',name:'停止'}],String(m.active),null):'')
    dialog(id?'スタッフを編集':'スタッフを追加',body,async p=>{ const r=await api('/api/dealer/team/member',{...p,id,active:p.active!=='false'}); await reloadTeam(); if(r.initialPassword) credentials(r); else notice('スタッフ情報を保存しました。') })
  }
  function assignmentDialog(id) {
    const s=state.team.salons.find(s=>s.id===id)
    dialog('担当・締日を設定',`<p>${esc(s.name)}</p>${select('memberId','担当者',state.team.members.filter(m=>m.active),s.salesMemberId,'担当者を選択')}${select('branchId','営業所',state.team.branches,s.salesBranchId,'担当者の所属営業所')}${select('closingDay','請求締日',closingOptions,s.billingClosingDay,null)}`,async p=>{ await api('/api/dealer/team/assignment',{...p,id}); await reloadTeam(); notice('担当・締日を保存しました。') })
  }
  function goalDialog(id) {
    const m=state.report.progress.find(m=>m.id===id)
    dialog('月次目標を設定',`<p>${esc(m.name)} / ${esc(state.report.month)}</p>${input('salesTargetYen','売上目標（税抜・円）',m.salesTargetYen,'number','required min="0" max="1000000000000" step="1"')}${input('acquisitionTarget','新規獲得目標（件）',m.acquisitionTarget,'number','required min="0" max="999999" step="1"')}`,async p=>{ await api('/api/dealer/team/goal',{...p,memberId:id,month:state.report.month}); state.report=await api('/api/dealer/sales?'+state.filters); render(); notice('目標を保存しました。') })
  }
  root.addEventListener('click',async e=>{
    const b=e.target.closest('button'); if(!b) return
    try {
      if (b.hasAttribute('data-page')) { state.page=Number(b.dataset.page); render() }
      if (b.hasAttribute('data-tab')) { state.tab=b.dataset.tab;state.page=1;state.query='';render() }
      if (b.hasAttribute('data-member')) memberDialog(b.dataset.member)
      if (b.hasAttribute('data-assignment')) assignmentDialog(b.dataset.assignment)
      if (b.hasAttribute('data-goal')) goalDialog(b.dataset.goal)
      if (b.hasAttribute('data-branch')) {
        const id=b.dataset.branch, branch=state.team.branches.find(x=>x.id===id)
        dialog(id?'営業所を編集':'営業所を追加',input('name','営業所名',branch?.name || '','text','required maxlength="80"'),async p=>{await api('/api/dealer/team/branch',{...p,id});await reloadTeam();notice('営業所を保存しました。')})
      }
      if (b.hasAttribute('data-password-reset')) {
        const m=state.team.members.find(m=>m.id===b.dataset.passwordReset)
        dialog('パスワードを再発行',`<p>${esc(m.name)}さんの現在のパスワードは無効になります。</p>`,async()=>{const r=await api('/api/dealer/team/reset-password',{id:m.id});await reloadTeam();credentials(r)})
      }
      if (b.hasAttribute('data-reset')) { state.filters=new URLSearchParams({month:month()});state.page=1;await loadReport();render() }
    } catch(error) {notice(error.message,true)}
  })
  async function loadReport() {
    state.report=await api('/api/dealer/sales?'+state.filters)
    history.replaceState(null,'',location.pathname+'?'+state.filters)
  }
  root.addEventListener('submit',async e=>{
    if(e.target.id==='dst-search') {e.preventDefault();state.query=new FormData(e.target).get('q') || '';state.page=1;render();return}
    if(e.target.id!=='dst-filters') return
    e.preventDefault();const button=e.target.querySelector('[type=submit]');button.disabled=true
    const previous=state.filters
    try { state.filters=new URLSearchParams(new FormData(e.target));state.page=1;await loadReport();render() }
    catch(error){state.filters=previous;notice(error.message,true)} finally{button.disabled=false}
  })
  function passwordPage() {
    root.innerHTML=`<div class="dst-app dst-password"><h2>パスワード変更</h2><div id="dst-notice" role="status" hidden></div><form id="dst-password">${input('currentPassword','現在のパスワード','','password','required autocomplete="current-password" maxlength="72"')}${input('newPassword','新しいパスワード','','password','required autocomplete="new-password" minlength="10" maxlength="72"')}${input('newPasswordConfirm','新しいパスワード（確認）','','password','required autocomplete="new-password" minlength="10" maxlength="72"')}<p>10〜72文字。変更後は新しいパスワードでログインし直してください。</p>${action('パスワードを変更','type="submit"',true)}</form></div>`
    const script=document.createElement('script');script.src='/password-visibility-v627.js?v=627-release1';document.head.append(script)
    document.getElementById('dst-password').addEventListener('submit',async e=>{e.preventDefault();const button=e.target.querySelector('[type=submit]');button.disabled=true;try{await api('/api/dealer/staff-password-change',Object.fromEntries(new FormData(e.target)));location.assign('/dealer/login?reset=1')}catch(error){notice(error.message,true);button.disabled=false}})
  }
  async function start() {
    if(view==='staff-password'){passwordPage();return}
    try {
      if(view==='team'){if(['members','branches','salons'].includes(state.filters.get('tab')))state.tab=state.filters.get('tab');await reloadTeam()}
      else{state.options=await api('/api/dealer/team/options');await loadReport();render()}
    } catch(error){root.innerHTML=`<div class="dst-app"><p role="alert">${esc(error.message)}</p>${action('再読み込み','id="dst-retry"')}</div>`;document.getElementById('dst-retry').onclick=start}
  }
  start()
})()
