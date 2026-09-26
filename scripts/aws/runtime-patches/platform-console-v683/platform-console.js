'use strict'

const fs = require('node:fs')
const css = fs.readFileSync(__dirname + '/platform-console-v683.css', 'utf8')
const icons = JSON.parse(fs.readFileSync(__dirname + '/platform-console-v683-icons.json', 'utf8'))
const e = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
const number = value => Number(value || 0).toLocaleString('ja-JP')
const yen = value => number(value) + '円'
const date = (value, time = false) => value && Number.isFinite(new Date(value).getTime()) ? new Intl.DateTimeFormat('ja-JP', {timeZone:'Asia/Tokyo', year:'numeric',month:'2-digit',day:'2-digit',...(time ? {hour:'2-digit',minute:'2-digit'} : {})}).format(new Date(value)) : '未設定'
const statusName = value => ({none:'未契約',active:'利用中',trialing:'トライアル',past_due:'支払遅延',canceled:'解約済み',unpaid:'未払い',incomplete:'手続き中',incomplete_expired:'期限切れ',paused:'一時停止'}[value] || value || '未契約')
const plan = row => ({梅:'梅プラン',竹:'竹プラン',松:'松プラン'}[row.planName]) || row.planName || ({ume:'梅プラン',take:'竹プラン',matsu:'松プラン'}[row.planKey]) || '未設定'
const icon = name => icons[name] || ''
const basePath = '/platform/businesses'
const detailPath = row => basePath + '/' + row.accountType.toLowerCase() + '/' + encodeURIComponent(row.id)
const paymentPath = row => '/platform/payments/' + row.accountType.toLowerCase() + '/' + encodeURIComponent(row.id)
const normalize = value => String(value || '').normalize('NFKC').toLocaleLowerCase('ja-JP').replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-0x60))
const navItems = [['overview','/platform','LayoutDashboard','概要'],['businesses',basePath,'Building2','事業者管理'],['inquiries','/platform/inquiries','ClipboardList','申請・発行'],['payments','/platform/payments','Wallet','利用料・入金'],['customers','/platform/customers','Users','顧客台帳']]

function modernize(html, title, authenticated) {
  html = html.replace('</head>', '<style>' + css + '</style></head>')
  if (!authenticated) return html
  const current = /事業者/.test(title) ? 'businesses' : /申請|アカウント発行/.test(title) ? 'inquiries' : /利用料|支払い|入金/.test(title) || html.includes('class="main fee-main"') ? 'payments' : /顧客/.test(title) ? 'customers' : 'overview'
  const header = '<header class="ops-nav"><a class="ops-brand" href="/platform" aria-label="ORIMIA 運営ダッシュボード"><img src="/brand/orimia-icon-192.png" alt="" width="36" height="36"><span><strong>ORIMIA</strong><small>運営管理</small></span></a><nav aria-label="運営メニュー">' + navItems.map(([key,href,name,label]) => '<a href="' + href + '"' + (key === current ? ' aria-current="page"' : '') + '>' + icon(name) + '<span>' + label + '</span></a>').join('') + '</nav><form action="/api/platform/logout" method="post"><button type="submit">' + icon('LogOut') + 'ログアウト</button></form></header>'
  return html.replace('<div class="shell">','<div class="shell ops-shell">').replace(/<header class="top">[\s\S]*?<\/header>/,header)
}

function heading(title, aside = '') {
  return '<header class="ops-heading"><h1>' + e(title) + '</h1>' + aside + '</header>'
}
function metric(label, value, sub) {
  return '<article class="ops-metric"><div>' + e(label) + '</div><strong>' + e(value) + '</strong><small>' + e(sub) + '</small></article>'
}
function flatten(accounts, data = {}) {
  const stores = new Map((data.storeRows || []).map(row => [row.id, row]))
  const rows = [...(accounts.salons || []).map(row => ({...row,accountType:'SALON',store:stores.get(row.id)})), ...(accounts.dealers || []).map(row => ({...row,accountType:'DEALER'}))]
  return rows.sort((a,b) => Number(b.status === 'ACTIVE') - Number(a.status === 'ACTIVE') || new Date(b.createdAt) - new Date(a.createdAt) || String(a.id).localeCompare(String(b.id)))
}
function overview(data, renderPage, accounts = {}) {
  const s = data.summary || {}, trends = data.trendRows || []
  const max = Math.max(1, ...trends.map(row => Number(row.amount || 0)))
  const rows = flatten(accounts)
  const chart = trends.length ? '<div class="ops-chart" role="img" aria-label="直近12か月の店舗売上推移">' + trends.map(row => '<div class="ops-bar"><span>' + yen(row.amount) + '</span><i style="height:' + Math.max(2,Math.round(Number(row.amount || 0)/max*170)) + 'px"></i><small>' + e(String(row.month).slice(5)) + '月</small></div>').join('') + '</div>' : '<p class="ops-empty">売上データがありません。</p>'
  const breakdown = (data.planRows || []).map(row => '<div><span>' + e(plan(row)) + '</span><strong>' + number(row.storeCount) + '店舗</strong></div>').join('') || '<p class="ops-muted">プラン情報なし</p>'
  const statuses = (data.statusRows || []).map(row => '<div><span>' + e(statusName(row.subscriptionStatus)) + '</span><strong>' + number(row.storeCount) + '店舗</strong></div>').join('') || '<p class="ops-muted">契約情報なし</p>'
  const body = '<main class="main ops-main">' + heading('運営ダッシュボード','<time class="ops-muted">更新 ' + date(new Date(),true) + '</time>') +
    '<section class="ops-metrics" aria-label="サービス全体の状況">' +
    metric('登録サロン',number(s.storeCount)+'店舗','全店舗') + metric('契約中サロン',number(s.activeStores)+'店舗','利用中・トライアル') + metric('利用中顧客',number(s.customerCount)+'名','退会済み '+number(s.withdrawnCustomerCount)+'名') +
    metric('今月の店舗売上',yen(s.monthRevenue),'会計確定分') + metric('月額利用料 MRR',yen(s.activeMrr),'利用中のサロン契約') + metric('トライアル後見込',yen(s.projectedMrr),'サロン契約・トライアル合計') + '</section>' +
    '<section class="ops-overview-grid"><div class="ops-section"><div class="ops-section-head"><h2>店舗売上の推移</h2><div class="ops-total"><small>累計売上</small><strong>' + yen(s.totalRevenue) + '</strong></div></div>' + chart + '</div><aside class="ops-section"><h2>サロンのプラン・契約</h2><div class="ops-breakdown">' + breakdown + '</div><div class="ops-breakdown ops-divider">' + statuses + '</div></aside></section>' +
    '<section class="ops-section ops-access"><div><h2>事業者の利用状況</h2><div class="ops-access-counts">' + ['SALON','DEALER'].map(type=>{const a=rows.filter(r=>r.accountType===type);return '<span>' + (type==='SALON'?'サロン':'ディーラー') + ' <strong>' + a.filter(r=>r.status==='ACTIVE').length + '</strong><small> / '+a.length+' 利用中</small></span>'}).join('') + '</div></div><a class="ops-button" href="'+basePath+'">事業者管理'+icon('ArrowRight')+'</a></section></main>'
  return renderPage('運営ダッシュボード',body,true)
}

function queryState(url) {
  return {q:String(url.searchParams.get('q') || '').slice(0,160),type:['SALON','DEALER'].includes(url.searchParams.get('type'))?url.searchParams.get('type'):'',state:['ACTIVE','SUSPENDED'].includes(url.searchParams.get('state'))?url.searchParams.get('state'):''}
}
function listPath(state, page = 1) {
  const q = new URLSearchParams()
  for (const key of ['q','type','state']) if (state[key]) q.set(key,state[key])
  if (page > 1) q.set('page',String(page))
  return basePath+(q.size?'?'+q:'')
}
function badge(row) {
  return '<span class="ops-status '+(row.status==='ACTIVE'?'is-active':'is-suspended')+'">'+(row.status==='ACTIVE'?'利用中':'利用停止')+'</span>'
}
function feeCell(row) {
  return row.feeHtml || '<td class="fee-dashboard-payment"><a href="'+paymentPath(row)+'">支払い履歴</a></td>'
}
function notice(url) {
  const state = url.searchParams.get('account')
  const text = {suspended:'利用停止を反映しました。',resumed:'利用再開を反映しました。',failed:'更新できませんでした。時間をおいて再度お試しください。'}[state]
  return text ? '<div class="ops-notice '+(state==='failed'?'is-error':'')+'" role="'+(state==='failed'?'alert':'status')+'">'+text+'</div>' : ''
}
function listPage(data, accounts, url, renderPage) {
  const all=flatten(accounts,data), state=queryState(url), terms=normalize(state.q).split(/\s+/).filter(Boolean)
  const rows=all.filter(row=>(!state.type||row.accountType===state.type)&&(!state.state||row.status===state.state)&&terms.every(term=>normalize([row.name,row.contactName,row.email,row.loginId,row.id,row.store?.slug].join(' ')).includes(term)))
  const pages=Math.max(1,Math.ceil(rows.length/30)), page=Math.min(pages,Math.max(1,Math.floor(Number(url.searchParams.get('page'))||1))), visible=rows.slice((page-1)*30,page*30)
  const option=(value,label,current)=>'<option value="'+e(value)+'"'+(current===value?' selected':'')+'>'+e(label)+'</option>'
  const tabs='<nav class="ops-tabs" aria-label="事業者区分">'+[['','すべて'],['SALON','サロン'],['DEALER','ディーラー']].map(([type,label])=>'<a href="'+e(listPath({...state,type}))+'"'+(state.type===type?' aria-current="page"':'')+'>'+label+'<span>'+all.filter(r=>!type||r.accountType===type).length+'</span></a>').join('')+'</nav>'
  const filters='<form class="ops-filters" action="'+basePath+'" method="get"><input type="hidden" name="type" value="'+e(state.type)+'"><label class="ops-search"><span>事業者を検索</span><input type="search" name="q" value="'+e(state.q)+'" placeholder="事業者名・責任者・メール・ログインID" autocomplete="off"></label><label><span>利用状態</span><select name="state">'+option('','すべて',state.state)+option('ACTIVE','利用中',state.state)+option('SUSPENDED','利用停止',state.state)+'</select></label><button class="ops-button" type="submit">'+icon('Search')+'検索</button>'+(state.q||state.state?'<a class="ops-reset" href="'+e(listPath({type:state.type}))+'">クリア</a>':'')+'</form>'
  const table='<div class="ops-table-wrap"><table class="ops-business-table"><thead><tr><th>事業者</th><th>責任者・連絡先</th><th>ログインID</th><th>利用状態</th><th>プラン・契約</th><th class="ops-num">今月の店舗売上</th><th>今月の利用料</th><th>詳細</th></tr></thead><tbody>'+visible.map(row=>'<tr data-business="'+e(row.accountType+':'+row.id)+'"><td><small class="ops-type">'+(row.accountType==='SALON'?'サロン':'ディーラー')+'</small><a class="ops-business-name" href="'+detailPath(row)+'">'+e(row.name)+'</a></td><td>'+e(row.contactName||'未登録')+'<small class="ops-muted">'+e(row.email||'メール未登録')+'</small></td><td class="ops-login">'+e(row.loginId||'未発行')+'</td><td>'+badge(row)+'</td><td>'+(row.store?e(plan(row.store))+'<small class="ops-muted">'+e(statusName(row.store.subscriptionStatus))+'</small>':'<span class="ops-muted">対象外</span>')+'</td><td class="ops-num">'+(row.store?yen(row.store.monthRevenue):'<span class="ops-muted">対象外</span>')+'</td>'+feeCell(row)+'<td><a class="ops-icon-link" aria-label="'+e(row.name)+'の詳細" title="事業者の詳細" href="'+detailPath(row)+'">'+icon('ChevronRight')+'</a></td></tr>').join('')+(rows.length?'':'<tr><td colspan="8" class="ops-empty">該当する事業者はありません。</td></tr>')+'</tbody></table></div>'
  const pager='<nav class="ops-pagination" aria-label="事業者一覧のページ"><span>'+number(rows.length?(page-1)*30+1:0)+'〜'+number(Math.min(page*30,rows.length))+' / '+number(rows.length)+'件</span><div>'+(page>1?'<a class="ops-icon-link" aria-label="前のページ" href="'+e(listPath(state,page-1))+'">'+icon('ChevronLeft')+'</a>':'<span class="ops-icon-link" aria-disabled="true">'+icon('ChevronLeft')+'</span>')+'<span>'+page+' / '+pages+'</span>'+(page<pages?'<a class="ops-icon-link" aria-label="次のページ" href="'+e(listPath(state,page+1))+'">'+icon('ChevronRight')+'</a>':'<span class="ops-icon-link" aria-disabled="true">'+icon('ChevronRight')+'</span>')+'</div></nav>'
  return renderPage('事業者管理','<main class="main ops-main">'+heading('事業者管理','<span class="ops-muted">全 '+number(all.length)+'件</span>')+notice(url)+tabs+filters+table+pager+'</main>',true)
}
function field(label,value) {return '<div><dt>'+e(label)+'</dt><dd>'+e(value==null||value===''?'未設定':value)+'</dd></div>'}
function detailPage(data, accounts, url, renderPage) {
  const match=url.pathname.match(/^\/platform\/businesses\/(salon|dealer)\/([^/]+)$/)
  const row=match&&flatten(accounts,data).find(row=>row.accountType===match[1].toUpperCase()&&row.id===decodeURIComponent(match[2]))
  if (!row) return {status:404,html:renderPage('事業者が見つかりません','<main class="main ops-main">'+heading('事業者が見つかりません')+'<a class="ops-button" href="'+basePath+'">事業者一覧へ</a></main>',true)}
  const s=row.store, type=row.accountType.toLowerCase(), active=row.status==='ACTIVE', path=detailPath(row)
  const enter=type==='salon'&&active?'<form method="post" action="/api/platform/enter-store"><input type="hidden" name="organizationId" value="'+e(row.id)+'"><button class="ops-button" type="submit">'+icon('ExternalLink')+'店舗管理画面</button></form>':''
  const identity='<section class="ops-section"><h2>基本情報・アカウント</h2><dl class="ops-fields">'+field('区分',type==='salon'?'サロン':'ディーラー')+field('責任者',row.contactName)+field('連絡先メール',row.email)+field('ログインID',row.loginId)+field('登録日時',date(row.createdAt,true))+field('発行区分',row.approvedAt?'運営発行':'既存アカウント')+field('承認日時',row.approvedAt?date(row.approvedAt,true):'対象外')+field('承認メール',row.approvedAt?({SENT:'送信済み',FAILED:'送信失敗',PENDING:'送信待ち'}[row.approvalMailStatus]||row.approvalMailStatus||'未送信'):'対象外')+field('初回パスワード変更',row.approvedAt?(row.mustChangePassword?'変更待ち':'変更済み'):'対象外')+field('事業者ID',row.id)+(s?field('店舗識別名',s.slug)+field('登録者',s.ownerName)+field('登録者メール',s.ownerEmail):'')+'</dl></section>'
  const metrics=s?'<section class="ops-section"><h2>店舗の実績・契約</h2><div class="ops-detail-metrics">'+metric('今月の店舗売上',yen(s.monthRevenue),'会計確定分')+metric('累計売上',yen(s.totalRevenue),'全期間')+metric('顧客',number(s.customerCount)+'名','')+metric('スタッフ',number(s.staffCount)+'名','')+metric('予約',number(s.appointmentCount)+'件','全期間')+'</div><dl class="ops-fields">'+field('プラン',plan(s))+field('契約状態',statusName(s.subscriptionStatus))+field('導入状態',({BANK_DEBIT_MANAGED:'銀行引き落とし管理',COMPLETED:'完了',COMPLETE:'完了'}[s.onboardingStatus]||s.onboardingStatus))+field('トライアル終了',date(s.trialEndsAt))+'</dl></section>':''
  const payment='<section class="ops-section"><h2>今月の利用料</h2><table class="ops-fee-detail"><tbody><tr>'+feeCell(row)+'</tr></tbody></table></section>'
  const access='<section class="ops-section ops-account-access"><div><h2>利用状態</h2>'+badge(row)+'</div><details class="ops-confirm"><summary class="ops-button '+(active?'ops-danger':'')+'">'+(active?'利用停止':'利用再開')+'</summary><div><p>'+e(row.name)+'のログインを'+(active?'停止':'再開')+'します。'+(active?'顧客・売上などのデータは削除されません。':'')+'</p><form method="post" action="/api/platform/business-accounts/'+type+'/'+encodeURIComponent(row.id)+'/'+(active?'suspend':'resume')+'?returnTo='+encodeURIComponent(path)+'"><button class="ops-button '+(active?'ops-danger':'')+'" type="submit">'+(active?'利用停止を確定':'利用再開を確定')+'</button></form></div></details></section>'
  return {status:200,html:renderPage('事業者詳細','<main class="main ops-main"><a class="ops-back" href="'+basePath+'">'+icon('ArrowLeft')+'事業者一覧</a>'+heading(row.name,enter)+notice(url)+identity+metrics+payment+access+'</main>',true)}
}
function accountReturn(url, result) {
  const candidate=url.searchParams.get('returnTo')||basePath
  const target=/^\/platform\/businesses(?:\/(?:salon|dealer)\/[^/?#\\]+)?$/.test(candidate)?candidate:basePath
  return target+'?account='+result
}
module.exports={modernize,overview,listPage,detailPage,flatten,accountReturn,normalize}
