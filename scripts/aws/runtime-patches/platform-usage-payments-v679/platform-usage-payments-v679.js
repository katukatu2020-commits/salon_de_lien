'use strict'

const fs = require('node:fs')
const path = require('node:path')
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]))
const yen = v => Number(v).toLocaleString('ja-JP') + '円'
const typeLabel = v => v === 'SALON' ? 'サロン' : 'ディーラー'
const methodLabel = v => ({ TRANSFER:'銀行振込', DEBIT:'口座振替' }[v] || '-')
const labels = { UNCONFIGURED:'請求設定なし', NOT_RECORDED:'未記録', OUTSIDE:'対象期間外', SCHEDULED:'入金予定', UNPAID:'入金待ち', OVERDUE:'期限超過', PAID:'入金済み', PARTIAL:'一部入金', FAILED:'振替不能', EXEMPT:'請求対象外' }
const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }) }
const integer = (v, min, max) => {
  if (!/^\d+$/.test(String(v)) || !Number.isSafeInteger(Number(v)) || Number(v)<min || Number(v)>max) fail('金額・日付・バージョンの入力を確認してください。')
  return Number(v)
}
const monthValue = v => { if (!/^20\d{2}-(0[1-9]|1[0-2])$/.test(String(v))) fail('対象月を確認してください。'); return String(v) }
const dateValue = v => {
  if (!/^20\d{2}-\d{2}-\d{2}$/.test(String(v)) || !Number.isFinite(Date.parse(v)) || new Date(v).toISOString().slice(0,10)!==v) fail('日付を確認してください。')
  return v
}
const textValue = (v, max = 1000) => { const s=String(v || '').trim(); if(s.length>max) fail('入力が長すぎます。'); return s }
const dayText = v => v ? (v instanceof Date ? v.toISOString().slice(0,10) : String(v).slice(0,10)) : ''
const jstToday = now => new Intl.DateTimeFormat('sv-SE', { timeZone:'Asia/Tokyo' }).format(now)
const dueDate = (month, day) => {
  if(day==null)return ''
  const last=new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5)),0)).getUTCDate()
  return month+'-'+String(day===0?last:Math.min(day,last)).padStart(2,'0')
}
const isWithin = (p,m) => p && m>=p.firstMonth && (!p.lastMonth || m<=p.lastMonth)
function paymentState(p, r, month, today) {
  if (r) return r.status==='UNPAID' && r.dueDate ? (dayText(r.dueDate)<today ? 'OVERDUE' : dayText(r.dueDate)>today ? 'SCHEDULED' : 'UNPAID') : r.status
  if (!p) return 'UNCONFIGURED'
  return isWithin(p,month) ? 'NOT_RECORDED' : 'OUTSIDE'
}
function badge(state) { return '<span class="fee-state fee-' + esc(state.toLowerCase()) + '">' + esc(labels[state]) + '</span>' }
const accountPath = (type,id) => '/platform/payments/' + type.toLowerCase() + '/' + encodeURIComponent(id)

function createPlatformUsagePayments({ prisma: db, crypto, operatorSession, renderPage, now = () => new Date() }) {
  let schemaPromise
  const today = () => jstToday(now())
  async function ensureSchema() {
    if (!schemaPromise) schemaPromise=db.$transaction(async tx => {
      await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(679026)')
      for (const sql of fs.readFileSync(path.join(__dirname,'platform-usage-payments-v679.sql'),'utf8').split(';').filter(v=>v.trim())) await tx.$executeRawUnsafe(sql)
    }, { timeout:60000 }).catch(e=>{schemaPromise=null;throw e})
    return schemaPromise
  }
  // Usage fees are separate from account access and dealer-to-salon receivables.
  const accountsSql = `SELECT 'SALON'::text AS "accountType",o."id",o."name",o."createdAt",p."displayName" AS "planName",p."monthlyAmount" AS "planAmount",b."billingRequiredAt",
    CASE WHEN c."status"='SUSPENDED' THEN FALSE ELSE EXISTS(SELECT 1 FROM "AppUser" u WHERE u."organizationId"=o."id" AND u."active"=TRUE AND u."role"::text IN ('ADMIN','STAFF','MANUFACTURER')) END AS active
    FROM "Organization" o LEFT JOIN "OrganizationBilling" b ON b."organizationId"=o."id" LEFT JOIN "BillingPlan" p ON p."planKey"=b."planKey" LEFT JOIN "BusinessAccountControl" c ON c."accountType"='SALON' AND c."targetId"=o."id"
    UNION ALL SELECT 'DEALER',d."id",d."name",d."createdAt",b."displayName",b."monthlyAmount",b."billingRequiredAt",d."active" AND COALESCE(c."status",'ACTIVE')<>'SUSPENDED'
    FROM "WholesaleDealer" d LEFT JOIN "WholesaleDealerBilling" b ON b."dealerId"=d."id" LEFT JOIN "BusinessAccountControl" c ON c."accountType"='DEALER' AND c."targetId"=d."id"`
  async function accounts(tx=db) { return tx.$queryRawUnsafe(accountsSql) }
  async function account(tx,type,id) {
    if (!['SALON','DEALER'].includes(type)) fail('事業者が見つかりません。',404)
    const rows=await tx.$queryRawUnsafe('SELECT * FROM ('+accountsSql+') a WHERE a."accountType"=$1 AND a."id"=$2',type,id)
    if(!rows[0]) fail('事業者が見つかりません。',404)
    return rows[0]
  }
  async function profile(tx,type,id) { return (await tx.$queryRawUnsafe('SELECT * FROM "PlatformFeeProfile" WHERE "accountType"=$1 AND "targetId"=$2',type,id))[0] }
  async function record(tx,type,id,month) { return (await tx.$queryRawUnsafe('SELECT * FROM "PlatformFeeMonth" WHERE "accountType"=$1 AND "targetId"=$2 AND "month"=$3',type,id,month))[0] }
  async function audit(tx,type,id,month,action,operator,before,after,reason) {
    await tx.$executeRawUnsafe('INSERT INTO "PlatformFeeAudit" ("id","accountType","targetId","month","action","operatorEmail","beforeJson","afterJson","reason") VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9)',crypto.randomUUID(),type,id,month,action,operator.subject,JSON.stringify(before || null),JSON.stringify(after),reason)
  }
  async function transaction(fn) {
    return db.$transaction(async tx=>{await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(679027)');return fn(tx)}, {timeout:30000})
  }
  function checkVersion(old,v) { if(integer(v,0,2147483646)!==(old?.version || 0)) fail('別の操作で更新されています。再読み込みして内容を確認してください。',409) }
  async function saveProfile(type,id,input,operator) {
    return transaction(async tx=>{
      await account(tx,type,id)
      const old=await profile(tx,type,id); checkVersion(old,input.get('version'))
      const firstMonth=monthValue(input.get('firstMonth')), lastMonth=input.get('lastMonth') ? monthValue(input.get('lastMonth')) : null
      if(lastMonth && lastMonth<firstMonth) fail('終了月は初回請求月以降にしてください。')
      const monthlyAmount=integer(input.get('monthlyAmount'),0,100000000)
      const dueDay=input.get('dueDay')==='' ? null : integer(input.get('dueDay'),0,31)
      const debitReady=input.get('debitReady')==='on', note=textValue(input.get('note')), reason=textValue(input.get('reason'))
      if(old && old.firstMonth!==firstMonth && (await tx.$queryRawUnsafe('SELECT 1 FROM "PlatformFeeMonth" WHERE "accountType"=$1 AND "targetId"=$2 LIMIT 1',type,id)).length) fail('支払い記録があるため初回請求月は変更できません。',409)
      if(old && !reason) fail('設定の変更理由を入力してください。')
      await tx.$executeRawUnsafe(`INSERT INTO "PlatformFeeProfile" ("accountType","targetId","firstMonth","lastMonth","monthlyAmount","dueDay","debitReady","note") VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        ON CONFLICT ("accountType","targetId") DO UPDATE SET "lastMonth"=EXCLUDED."lastMonth","firstMonth"=EXCLUDED."firstMonth","monthlyAmount"=EXCLUDED."monthlyAmount","dueDay"=EXCLUDED."dueDay","debitReady"=EXCLUDED."debitReady","note"=EXCLUDED."note","version"="PlatformFeeProfile"."version"+1,"updatedAt"=NOW()`,type,id,firstMonth,lastMonth,monthlyAmount,dueDay,debitReady,note)
      await audit(tx,type,id,null,'PROFILE',operator,old,await profile(tx,type,id),reason)
    })
  }
  async function saveMonth(type,id,month,input,operator) {
    monthValue(month)
    return transaction(async tx=>{
      await account(tx,type,id)
      const p=await profile(tx,type,id),old=await record(tx,type,id,month)
      if(!p) fail('初回請求月と月額利用料を先に設定してください。')
      if(!old && !isWithin(p,month)) fail('この月は請求対象期間外です。')
      checkVersion(old,input.get('version'))
      const method=old?.method || (month===p.firstMonth ? 'TRANSFER':'DEBIT')
      const amount=integer(input.get('amount'),0,100000000),status=String(input.get('status')),due=input.get('dueDate') ? dateValue(input.get('dueDate')) : null
      if(!['UNPAID','PAID','PARTIAL','FAILED','EXEMPT'].includes(status)) fail('支払い状況を確認してください。')
      if(status==='FAILED' && method!=='DEBIT') fail('銀行振込の月には振替不能を設定できません。')
      const paidAmount=status==='PAID' ? amount : status==='PARTIAL' ? integer(input.get('paidAmount'),1,amount-1) : 0
      const paid=['PAID','PARTIAL'].includes(status),paidDate=paid ? dateValue(input.get('paidDate')) : null
      if(paidDate && paidDate>today()) fail('入金確認日は本日以前の日付を指定してください。')
      const actualMethod=paid ? String(input.get('actualMethod') || method) : null
      if(paid && !['TRANSFER','DEBIT'].includes(actualMethod)) fail('実際の入金方法を確認してください。')
      const note=textValue(input.get('note')),reason=textValue(input.get('reason'))
      if((old || ['FAILED','EXEMPT'].includes(status)) && !reason) fail('変更理由・確認内容を入力してください。')
      await tx.$executeRawUnsafe(`INSERT INTO "PlatformFeeMonth" ("accountType","targetId","month","amount","dueDate","method","status","paidAmount","paidDate","actualMethod","note","updatedBy") VALUES ($1,$2,$3,$4,$5::date,$6,$7,$8,$9::date,$10,$11,$12)
        ON CONFLICT ("accountType","targetId","month") DO UPDATE SET "amount"=EXCLUDED."amount","dueDate"=EXCLUDED."dueDate","status"=EXCLUDED."status","paidAmount"=EXCLUDED."paidAmount","paidDate"=EXCLUDED."paidDate","actualMethod"=EXCLUDED."actualMethod","note"=EXCLUDED."note","updatedBy"=EXCLUDED."updatedBy","updatedAt"=NOW(),"version"="PlatformFeeMonth"."version"+1`,type,id,month,amount,due,method,status,paidAmount,paidDate,actualMethod,note,operator.subject)
      await audit(tx,type,id,month,'MONTH',operator,old,await record(tx,type,id,month),reason)
    })
  }
  async function generate(month,operator) {
    monthValue(month)
    return transaction(async tx=>{
      let count=0
      const profiles=await tx.$queryRawUnsafe('SELECT * FROM "PlatformFeeProfile" WHERE "firstMonth"<=$1 AND ("lastMonth" IS NULL OR "lastMonth">=$1)',month)
      const live=new Set((await accounts(tx)).filter(a=>a.active).map(a=>a.accountType+':'+a.id))
      for(const p of profiles) {
        if(!live.has(p.accountType+':'+p.targetId)) continue
        const changed=await tx.$executeRawUnsafe(`INSERT INTO "PlatformFeeMonth" ("accountType","targetId","month","amount","dueDate","method","status","updatedBy") VALUES ($1,$2,$3,$4,$5::date,$6,'UNPAID',$7) ON CONFLICT DO NOTHING`,p.accountType,p.targetId,month,p.monthlyAmount,dueDate(month,p.dueDay)||null,month===p.firstMonth?'TRANSFER':'DEBIT',operator.subject)
        if(changed){count++;await audit(tx,p.accountType,p.targetId,month,'GENERATE',operator,null,await record(tx,p.accountType,p.targetId,month),'月次予定作成')}
      }
      return count
    })
  }
  async function load(month) {
    monthValue(month)
    return db.$transaction(async tx=>{
      const as=await accounts(tx), ps=await tx.$queryRawUnsafe('SELECT * FROM "PlatformFeeProfile"'),rs=await tx.$queryRawUnsafe('SELECT * FROM "PlatformFeeMonth" WHERE "month"=$1',month)
      const pm=new Map(ps.map(p=>[p.accountType+':'+p.targetId,p])),rm=new Map(rs.map(r=>[r.accountType+':'+r.targetId,r]))
      return as.map(a=>{const key=a.accountType+':'+a.id,p=pm.get(key),r=rm.get(key);return {...a,p,r,state:paymentState(p,r,month,today()),method:r?.method || (isWithin(p,month) ? (month===p.firstMonth?'TRANSFER':'DEBIT'):null),amount:r?.amount ?? (isWithin(p,month)?p.monthlyAmount:null)}})
    },{isolationLevel:'RepeatableRead'})
  }
  function field(label,html,wide=false){
    const id='fee-'+crypto.createHash('sha256').update(label).digest('hex').slice(0,12)
    return '<div class="fee-field'+(wide?' fee-wide':'')+'"><label for="'+id+'">'+esc(label)+'</label>'+html.replace(/^<(input|select|textarea)/,'<$1 id="'+id+'"')+'</div>'
  }
  const input=(name,value,type='text',extra='')=>'<input name="'+name+'" type="'+type+'" value="'+esc(value)+'" '+extra+'>'
  const options=(values,selected)=>values.map(([v,l])=>'<option value="'+esc(v)+'"'+(String(v)===String(selected)?' selected':'')+'>'+esc(l)+'</option>').join('')
  const hidden=(name,v)=>input(name,v,'hidden')
  const button=(label,primary=false)=>'<button type="submit" class="fee-button'+(primary?' primary':'')+'">'+esc(label)+'</button>'
  const styles=()=>'<style>'+fs.readFileSync(path.join(__dirname,'platform-usage-payments-v679.css'),'utf8')+'</style>'
  const shell=(title,body)=>renderPage(title,styles()+'<main class="main fee-main">'+body+'</main>',true)
  function paymentCell(row) {
    return '<td class="fee-dashboard-payment">'+badge(row?.state || 'UNCONFIGURED')+(row?.amount!=null?'<div class="slug">'+esc(yen(row.amount))+' / '+esc(methodLabel(row.method))+'</div>':'')+'<a class="baaButton" href="'+accountPath(row.accountType,row.id)+'">支払い履歴</a></td>'
  }
  async function decorateAccounts(data) {
    const rows=await load(today().slice(0,7)),map=new Map(rows.map(r=>[r.accountType+':'+r.id,r]))
    for(const [type,list] of [['SALON',data.salons],['DEALER',data.dealers]]) for(const row of list) row.feeHtml=paymentCell(map.get(type+':'+row.id)||{accountType:type,id:row.id})
    return data
  }
  function summary(rows) {
    let billed=0,paid=0,balance=0,missing=0,failed=0
    for(const a of rows) {
      if(['NOT_RECORDED','UNCONFIGURED'].includes(a.state)) missing++
      if(a.state==='FAILED') failed++
      if(a.r && a.r.status!=='EXEMPT'){billed+=a.r.amount;paid+=a.r.paidAmount;balance+=a.r.amount-a.r.paidAmount}
    }
    return '<section class="fee-totals" aria-label="対象月の集計">'+[['請求記録額（税込）',yen(billed)],['入金確認額',yen(paid)],['未収残高',yen(balance)],['未記録・設定なし',missing+'件'],['振替不能',failed+'件']].map(([l,v])=>'<div><span>'+l+'</span><strong>'+v+'</strong></div>').join('')+'</section>'
  }
  async function listPage(url) {
    const month=monthValue(url.searchParams.get('month') || today().slice(0,7)),type=url.searchParams.get('type')||'',state=url.searchParams.get('state')||'',q=textValue(url.searchParams.get('q'),160)
    const normalize=v=>String(v).normalize('NFKC').toLocaleLowerCase('ja-JP')
    const all=await load(month),base=all.filter(a=>(!type||a.accountType===type)&&(!q||normalize(a.name).includes(normalize(q))))
    const filtered=base.filter(a=>!state||a.state===state).sort((a,b)=>a.name.localeCompare(b.name,'ja')||a.id.localeCompare(b.id))
    const pages=Math.max(1,Math.ceil(filtered.length/20)),page=Math.min(pages,integer(url.searchParams.get('page')||1,1,1000000))
    const link=n=>{const p=new URLSearchParams(url.searchParams);p.set('month',month);p.set('page',n);return '/platform/payments?'+p}
    const rows=filtered.slice((page-1)*20,page*20).map(a=>'<tr><td data-label="事業者"><strong>'+esc(a.name)+'</strong><small>'+typeLabel(a.accountType)+' / '+(a.active?'利用中':'利用停止')+'</small></td><td data-label="月額（税込）">'+(a.amount==null?'-':esc(yen(a.amount)))+'</td><td data-label="支払方法">'+esc(methodLabel(a.method))+(a.method==='DEBIT'&&!a.p?.debitReady?'<small class="fee-alert">振替手続き未完了</small>':'')+'</td><td data-label="期日">'+esc((a.r?dayText(a.r.dueDate):(isWithin(a.p,month)?dueDate(month,a.p.dueDay):'')) || '未設定')+'</td><td data-label="支払い状況">'+badge(a.state)+'</td><td data-label="入金 / 残額">'+(a.r?esc(yen(a.r.paidAmount))+' / '+esc(yen(a.r.status==='EXEMPT'?0:a.r.amount-a.r.paidAmount)):'-')+'</td><td data-label="入金日">'+esc(dayText(a.r?.paidDate)||'-')+'</td><td><a class="fee-button" href="'+accountPath(a.accountType,a.id)+'?month='+month+'">確認・記録</a></td></tr>').join('')
    return shell('利用料・支払い状況','<header class="fee-heading"><div><p class="eyebrow">SYSTEM USAGE FEES</p><h1>利用料・支払い状況</h1></div><span class="fee-state">運営による入金確認</span></header>'+(url.searchParams.has('generated')?'<p class="fee-success" role="status">月次予定を '+esc(url.searchParams.get('generated'))+'件作成しました。</p>':'')+'<form class="fee-filters" method="get">'+field('対象月',input('month',month,'month','required'))+field('事業者区分','<select name="type">'+options([['','すべて'],['SALON','サロン'],['DEALER','ディーラー']],type)+'</select>')+field('支払い状況','<select name="state">'+options([['','すべて'],...Object.entries(labels)],state)+'</select>')+field('事業者名',input('q',q,'search'))+button('絞り込む',true)+'</form>'+summary(filtered)+'<div class="fee-toolbar"><span>'+filtered.length+'件 / '+month+'</span><a class="fee-button" href="/platform/payments/generate?month='+month+'">月次予定を作成</a></div><div class="fee-table-wrap"><table class="fee-table"><thead><tr>'+['事業者','月額（税込）','支払方法','期日','支払い状況','入金 / 残額','入金日','操作'].map(s=>'<th>'+s+'</th>').join('')+'</tr></thead><tbody>'+ (rows||'<tr><td colspan="8">該当する事業者はありません。</td></tr>')+'</tbody></table></div><nav class="fee-pager" aria-label="ページ切替">'+(page>1?'<a class="fee-button" href="'+esc(link(page-1))+'">前へ</a>':'<span></span>')+'<span>'+page+' / '+pages+'</span>'+(page<pages?'<a class="fee-button" href="'+esc(link(page+1))+'">次へ</a>':'<span></span>')+'</nav>')
  }
  async function detailPage(type,id,url,error='',submitted) {
    const a=await account(db,type,id),p=await profile(db,type,id),month=monthValue(url.searchParams.get('month')||today().slice(0,7)),r=await record(db,type,id,month)
    const records=await db.$queryRawUnsafe('SELECT * FROM "PlatformFeeMonth" WHERE "accountType"=$1 AND "targetId"=$2 ORDER BY "month" DESC',type,id)
    const historyPage=integer(url.searchParams.get('historyPage')||1,1,1000000)
    const audits=await db.$queryRawUnsafe('SELECT * FROM "PlatformFeeAudit" WHERE "accountType"=$1 AND "targetId"=$2 ORDER BY "createdAt" DESC,"id" LIMIT 21 OFFSET $3',type,id,(historyPage-1)*20)
    const action=accountPath(type,id),api='/api/platform/usage-payments/'+type.toLowerCase()+'/'+encodeURIComponent(id)
    const profileInput=submitted?.kind==='profile'?submitted.input:null,monthInput=submitted?.kind==='month'?submitted.input:null
    const pv=(key,fallback)=>profileInput?.has(key)?profileInput.get(key):fallback
    const mv=(key,fallback)=>monthInput?.has(key)?monthInput.get(key):fallback
    const first=p?.firstMonth || jstToday(new Date(a.billingRequiredAt||a.createdAt)).slice(0,7)
    const method=r?.method || (p && month===p.firstMonth?'TRANSFER':'DEBIT'),state=paymentState(p,r,month,today())
    const profileForm='<details class="fee-section"'+(!p||profileInput?' open':'')+'><summary>請求設定'+(p?' / 初回 '+p.firstMonth:' / 未設定')+'</summary><form method="post" action="'+api+'/profile">'+hidden('month',month)+hidden('version',pv('version',p?.version||0))+'<div class="fee-grid">'+field('初回請求月',input('firstMonth',pv('firstMonth',first),'month','required'+(records.length?' readonly':'')))+field('月額利用料（税込・円）',input('monthlyAmount',pv('monthlyAmount',p?.monthlyAmount??a.planAmount??''),'number','min="0" max="100000000" required'))+field('毎月の支払期日','<select name="dueDay">'+options([['','未定'],['0','月末'],...Array.from({length:31},(_,i)=>[String(i+1),(i+1)+'日'])],pv('dueDay',p?.dueDay??''))+'</select>')+field('請求終了月（任意）',input('lastMonth',pv('lastMonth',p?.lastMonth||''),'month'))+'<label class="fee-check"><input type="checkbox" name="debitReady"'+((profileInput?profileInput.has('debitReady'):p?.debitReady)?' checked':'')+'>口座振替の手続き完了</label>'+field('請求メモ','<textarea name="note" maxlength="1000">'+esc(pv('note',p?.note||''))+'</textarea>',true)+(p?field('設定変更理由',input('reason',pv('reason',''),'text','required maxlength="1000"'),true):'')+'</div>'+button('請求設定を保存',true)+'</form></details>'
    const monthlyForm=p&&(r||isWithin(p,month))?'<form class="fee-section" method="post" action="'+api+'/month/'+month+'">'+hidden('version',mv('version',r?.version||0))+'<h2>'+month+'の支払い記録</h2><div class="fee-meta">'+badge(state)+'<strong>'+methodLabel(method)+'</strong>'+(method==='DEBIT'&&!p.debitReady?'<span class="fee-alert">振替手続き未完了</span>':'')+'</div><div class="fee-grid">'+field('請求額（税込・円）',input('amount',mv('amount',r?.amount??p.monthlyAmount),'number','min="0" max="100000000" required'))+field('振込期日 / 振替予定日',input('dueDate',mv('dueDate',r?dayText(r.dueDate):dueDate(month,p.dueDay)),'date'))+field('支払い状況','<select name="status">'+options([['UNPAID','入金待ち'],['PAID','入金済み'],['PARTIAL','一部入金'],...(method==='DEBIT'?[['FAILED','振替不能']]:[]),['EXEMPT','請求対象外']],mv('status',r?.status||'UNPAID'))+'</select>')+field('累計入金額（一部入金のみ・円）',input('paidAmount',mv('paidAmount',r?.paidAmount||''),'number','min="0" max="100000000"'))+field('入金日（入金済み・一部入金）',input('paidDate',mv('paidDate',dayText(r?.paidDate)),'date','max="'+today()+'"'))+field('実際の入金方法','<select name="actualMethod">'+options([['TRANSFER','銀行振込'],['DEBIT','口座振替']],mv('actualMethod',r?.actualMethod||method))+'</select>')+field('入金照合メモ / 振替不能の理由','<textarea name="note" maxlength="1000">'+esc(mv('note',r?.note||''))+'</textarea>',true)+field('変更理由・確認内容',input('reason',mv('reason',''),'text','maxlength="1000"'+(r?' required':'')),true)+'</div>'+button('支払い状況を保存',true)+'</form>':'<p class="fee-section">'+(!p?'請求設定なし': 'この月は請求対象期間外です。')+'</p>'
    const recordRows=records.map(x=>'<tr><td data-label="対象月"><a href="'+action+'?month='+x.month+'">'+x.month+'</a></td><td data-label="請求額">'+yen(x.amount)+'</td><td data-label="支払方法">'+methodLabel(x.method)+'</td><td data-label="期日">'+esc(dayText(x.dueDate)||'-')+'</td><td data-label="支払い状況">'+badge(paymentState(p,x,x.month,today()))+'</td><td data-label="入金 / 残額">'+yen(x.paidAmount)+' / '+yen(x.status==='EXEMPT'?0:x.amount-x.paidAmount)+'</td><td data-label="入金日">'+esc(dayText(x.paidDate)||'-')+'</td></tr>').join('')
    const historyLink=n=>action+'?month='+month+'&historyPage='+n+'#fee-audit'
    const auditRows=audits.slice(0,20).map(x=>'<li><div class="fee-audit-head"><strong>'+esc(x.month||'請求設定')+'</strong><span>'+esc(new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',dateStyle:'short',timeStyle:'short'}).format(x.createdAt))+'</span><span>'+esc(x.operatorEmail)+'</span></div><p>'+esc(x.reason || '初回登録')+'</p><details><summary>変更内容</summary><div class="fee-audit-change">'+auditSnapshot('変更前',x.beforeJson)+auditSnapshot('変更後',x.afterJson)+'</div></details></li>').join('')
    return shell(a.name+'の利用料','<a class="fee-back" href="/platform/payments?month='+month+'">利用料一覧へ</a><header class="fee-heading"><div><p class="eyebrow">'+typeLabel(type)+'</p><h1>'+esc(a.name)+'</h1></div><span>'+(a.active?'利用中':'利用停止')+'</span></header>'+ (error?'<p class="fee-error" role="alert">'+esc(error)+' <a href="'+action+'?month='+month+'">最新の記録を開く</a></p>':url.searchParams.has('saved')?'<p class="fee-success" role="status">保存しました。</p>':'')+profileForm+'<form class="fee-filters" method="get" action="'+action+'">'+field('対象月',input('month',month,'month','required'))+button('表示')+'</form>'+monthlyForm+'<section class="fee-section"><h2>月別履歴</h2><div class="fee-table-wrap"><table class="fee-table"><thead><tr>'+['対象月','請求額','支払方法','期日','支払い状況','入金 / 残額','入金日'].map(x=>'<th>'+x+'</th>').join('')+'</tr></thead><tbody>'+(recordRows||'<tr><td colspan="7">記録はありません。</td></tr>')+'</tbody></table></div></section><section class="fee-section" id="fee-audit"><h2>変更履歴</h2><ul class="fee-audits">'+(auditRows||'<li>変更履歴はありません。</li>')+'</ul><nav class="fee-pager">'+(historyPage>1?'<a href="'+historyLink(historyPage-1)+'">前へ</a>':'<span></span>')+'<span>'+historyPage+'ページ</span>'+(audits.length>20?'<a href="'+historyLink(historyPage+1)+'">次へ</a>':'')+'</nav></section>')
  }
  function auditSnapshot(label,data) {
    if(!data)return '<div><strong>'+label+'</strong><p>記録なし</p></div>'
    const fields=data.month ? [['対象月',data.month],['請求額',yen(data.amount)],['期日',dayText(data.dueDate)||'-'],['状況',labels[data.status]],['入金額',yen(data.paidAmount)],['入金日',dayText(data.paidDate)||'-'],['入金方法',methodLabel(data.actualMethod)],['メモ',data.note]] : [['初回請求月',data.firstMonth],['終了月',data.lastMonth||'-'],['月額',yen(data.monthlyAmount)],['支払期日',data.dueDay==null?'未定':data.dueDay===0?'月末':data.dueDay+'日'],['振替手続き',data.debitReady?'完了':'未完了'],['メモ',data.note]]
    return '<div><strong>'+label+'</strong><dl>'+fields.map(([k,v])=>'<dt>'+esc(k)+'</dt><dd>'+esc(v)+'</dd>').join('')+'</dl></div>'
  }
  function headers(res) {
    res.setHeader('Cache-Control','private, no-store, max-age=0');res.setHeader('Vary','Cookie');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');res.setHeader('Referrer-Policy','same-origin');res.setHeader('X-Robots-Tag','noindex,nofollow')
    res.setHeader('Content-Security-Policy',"default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:; form-action 'self'; base-uri 'none'; frame-ancestors 'none'")
  }
  function html(res,status,content,head=false){headers(res);res.statusCode=status;res.setHeader('Content-Type','text/html; charset=utf-8');res.end(head?undefined:content)}
  function redirect(res,target,status=303){headers(res);res.statusCode=status;res.setHeader('Location',target);res.end()}
  function validOrigin(req) {
    if(!req.headers.origin)return false
    try {const expected=process.env.APP_URL||process.env.NEXT_PUBLIC_APP_URL||((req.socket?.encrypted?'https':'http')+'://'+req.headers.host);return new URL(req.headers.origin).origin===new URL(expected).origin}catch{return false}
  }
  async function form(req) {
    if(!String(req.headers['content-type']).startsWith('application/x-www-form-urlencoded'))fail('送信形式が正しくありません。',415)
    const chunks=[];let size=0
    for await(const chunk of req){size+=chunk.length;if(size>16384)fail('入力が長すぎます。',413);chunks.push(chunk)}
    return new URLSearchParams(Buffer.concat(chunks).toString('utf8'))
  }
  async function handle(req,res,url) {
    const page=url.pathname==='/platform/payments'||url.pathname.startsWith('/platform/payments/'),api=url.pathname.startsWith('/api/platform/usage-payments/')
    if(!page&&!api)return false
    const operator=await operatorSession(req)
    if(!operator){if(api){headers(res);res.statusCode=401;res.end()}else redirect(res,'/platform/login',302);return true}
    let match,input,selectedMonth
    try {
      await ensureSchema()
      if(api){
        if(req.method!=='POST')fail('POSTのみ利用できます。',405)
        if(!validOrigin(req))fail('送信元を確認できません。',403)
        input=await form(req)
        if(url.pathname==='/api/platform/usage-payments/generate'){
          const m=monthValue(input.get('month'));const count=await generate(m,operator);redirect(res,'/platform/payments?month='+m+'&generated='+count);return true
        }
        match=url.pathname.match(/^\/api\/platform\/usage-payments\/(salon|dealer)\/([^/]+)\/(profile|month\/20\d{2}-\d{2})$/)
        if(!match)fail('ページが見つかりません。',404)
        const type=match[1].toUpperCase(),id=decodeURIComponent(match[2]);selectedMonth=monthValue(match[3]==='profile'?input.get('month'):match[3].slice(6))
        if(match[3]==='profile')await saveProfile(type,id,input,operator);else await saveMonth(type,id,selectedMonth,input,operator)
        redirect(res,accountPath(type,id)+'?month='+selectedMonth+'&saved=1');return true
      }
      if(!['GET','HEAD'].includes(req.method))fail('GETのみ利用できます。',405)
      if(url.pathname==='/platform/payments'){html(res,200,await listPage(url),req.method==='HEAD');return true}
      if(url.pathname==='/platform/payments/generate'){
        const m=monthValue(url.searchParams.get('month')||today().slice(0,7)),rows=(await load(m)).filter(a=>a.active&&a.state==='NOT_RECORDED')
        html(res,200,shell('月次予定の作成','<a class="fee-back" href="/platform/payments?month='+m+'">利用料一覧へ</a><header class="fee-heading"><h1>'+m+' 月次予定</h1><strong>'+rows.length+'件</strong></header><ul class="fee-audits">'+rows.map(a=>'<li>'+esc(a.name)+' / '+yen(a.amount)+' / '+methodLabel(a.method)+'</li>').join('')+'</ul><form method="post" action="/api/platform/usage-payments/generate">'+hidden('month',m)+button('対象月の入金待ち記録を作成',true)+'</form>'),req.method==='HEAD');return true
      }
      match=url.pathname.match(/^\/platform\/payments\/(salon|dealer)\/([^/]+)$/)
      if(!match)fail('ページが見つかりません。',404)
      html(res,200,await detailPage(match[1].toUpperCase(),decodeURIComponent(match[2]),url),req.method==='HEAD')
    }catch(e){
      if(!e.status)console.error('Platform usage payments failed',{code:e.code||'unknown'})
      const status=e.status||500,message=e.status?e.message:'保存・取得できませんでした。時間をおいて再度お試しください。'
      if(api&&match&&input&&selectedMonth&&[400,409].includes(status)){
        const detailUrl=new URL(accountPath(match[1].toUpperCase(),decodeURIComponent(match[2]))+'?month='+selectedMonth,'http://local')
        html(res,status,await detailPage(match[1].toUpperCase(),decodeURIComponent(match[2]),detailUrl,message,{kind:match[3]==='profile'?'profile':'month',input}));return true
      }
      html(res,status,shell('利用料管理','<p class="fee-error" role="alert">'+esc(message)+'</p><a href="/platform/payments">利用料一覧へ</a>'),req.method==='HEAD')
    }
    return true
  }
  return {ensureSchema,handle,decorateAccounts,load,saveProfile,saveMonth,generate}
}
module.exports={createPlatformUsagePayments,paymentState,dueDate,jstToday}
