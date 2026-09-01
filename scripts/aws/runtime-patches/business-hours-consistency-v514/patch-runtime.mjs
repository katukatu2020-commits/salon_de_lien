import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const serverPath = path.join(root, 'server.js')
const tenantSetupPath = path.join(root, 'tenant-setup.js')
const tenantClientPath = path.join(root, 'tenant-setup-client.js')
const shiftServerPath = path.join(root, '.next', 'server', 'app', 'admin', 'appointments', 'page.js')
const shiftClientPath = path.join(root, '.next', 'static', 'chunks', 'app', 'admin', 'appointments', 'page-shift-line-break-v461.js')

function replaceExact(source, before, after, expected, label) {
  const count = source.split(before).length - 1
  if (count !== expected) throw new Error(`${label}: expected ${expected} matches, found ${count}`)
  return source.split(before).join(after)
}

let server = fs.readFileSync(serverPath, 'utf8')
server = replaceExact(
  server,
  `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Global-Profile-Extended', 'v513')`,
  `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Global-Profile-Extended', 'v513')
      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Business-Hours-Consistency', 'v514')`,
  1,
  'business hours readiness marker',
)
fs.writeFileSync(serverPath, server)

let tenantSetup = fs.readFileSync(tenantSetupPath, 'utf8')
tenantSetup = replaceExact(
  tenantSetup,
  `const closedWeekdays = [...new Set(String(row.closedWeekdays == null ? DEFAULT_CLOSED_WEEKDAYS.join(',') : row.closedWeekdays).split(',').map(Number).filter(day => Number.isInteger(day) && day >= 0 && day <= 6))].sort((left, right) => left - right)`,
  `const closedWeekdays = [...new Set(String(row.closedWeekdays == null ? DEFAULT_CLOSED_WEEKDAYS.join(',') : row.closedWeekdays).split(',').filter(value => value.trim() !== '').map(Number).filter(day => Number.isInteger(day) && day >= 0 && day <= 6))].sort((left, right) => left - right)`,
  1,
  'empty closed weekday normalization',
)
tenantSetup += '\n/* business-hours-consistency-v514 */\n'
fs.writeFileSync(tenantSetupPath, tenantSetup)

let tenantClient = fs.readFileSync(tenantClientPath, 'utf8')
tenantClient = replaceExact(
  tenantClient,
  `.ts-days-hero{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;border:1px solid #ead9d1;border-radius:26px;background:linear-gradient(145deg,#fffdfb,#fff8f4);padding:28px;box-shadow:0 12px 34px rgba(76,43,34,.06)}`,
  `.ts-days-hero{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;border:1px solid #ead9d1;border-radius:26px;background:linear-gradient(145deg,#fffdfb,#fff8f4);padding:28px;box-shadow:0 12px 34px rgba(76,43,34,.06)}.ts-days-heading{display:grid;min-width:0;gap:14px}.ts-days-back{display:inline-flex;width:max-content;max-width:100%;min-height:42px;align-items:center;gap:8px;border:1px solid #e2c9bf;border-radius:12px;background:#fff;padding:0 14px;color:#793f35;font-size:12px;font-weight:800;text-decoration:none;box-shadow:0 6px 18px rgba(84,46,37,.08);transition:.18s}.ts-days-back:hover{border-color:#bd7e70;background:#fff8f4;transform:translateY(-1px)}.ts-days-back svg{width:17px;height:17px;flex:0 0 auto}`,
  1,
  'daily hours back link styles',
)
tenantClient = replaceExact(
  tenantClient,
  `@media(max-width:620px){#ts-business-days-root{padding:14px 12px 50px}.ts-days-grid{grid-template-columns:1fr}.ts-days-hero{padding:21px}.ts-days-nav{width:100%;justify-content:space-between}.ts-day-card{min-height:0}}`,
  `@media(max-width:620px){#ts-business-days-root{padding:14px 12px 50px}.ts-days-grid{grid-template-columns:1fr}.ts-days-hero{padding:21px}.ts-days-back{width:100%;justify-content:flex-start;white-space:normal}.ts-days-nav{width:100%;justify-content:space-between}.ts-day-card{min-height:0}}`,
  1,
  'daily hours mobile back link styles',
)
tenantClient = replaceExact(
  tenantClient,
  `      root.innerHTML = '<div class="ts-days-hero"><div><div class="ts-days-kicker">DAILY BUSINESS HOURS</div><h1>日別の営業時間・休業日</h1><p>複数の日を続けて変更し、最後に一度だけまとめて保存できます。</p></div><div class="ts-days-nav"><a class="ts-button secondary compact" href="/admin/appointments?businessDays=1&month=' + monthShift(month,-1) + '">' + icon('chevronLeft') + '</a><span class="ts-days-month">' + year + '年' + monthNumber + '月</span><a class="ts-button secondary compact" href="/admin/appointments?businessDays=1&month=' + monthShift(month,1) + '">' + icon('chevronRight') + '</a></div></div><div class="ts-days-message" role="status"></div><div class="ts-days-grid">' + week + empty + cards + '</div>' + (payload.role === 'ADMIN' ? '<div class="ts-days-savebar"><div class="ts-days-savecopy"><strong>変更をまとめて保存</strong><span data-dirty-count>変更はありません</span></div><button class="ts-days-saveall" type="button" data-save-all disabled>変更をまとめて保存</button></div>' : '')`,
  `      const returnDate = month === todayInJapan().slice(0, 7) ? todayInJapan() : month + '-01'
      root.innerHTML = '<div class="ts-days-hero"><div class="ts-days-heading"><a class="ts-days-back" href="/admin/appointments?date=' + encodeURIComponent(returnDate) + '">' + icon('chevronLeft') + '<span>シフト表・予約カレンダーへ戻る</span></a><div><div class="ts-days-kicker">DAILY BUSINESS HOURS</div><h1>日別の営業時間・休業日</h1><p>複数の日を続けて変更し、最後に一度だけまとめて保存できます。</p></div></div><div class="ts-days-nav"><a class="ts-button secondary compact" href="/admin/appointments?businessDays=1&month=' + monthShift(month,-1) + '">' + icon('chevronLeft') + '</a><span class="ts-days-month">' + year + '年' + monthNumber + '月</span><a class="ts-button secondary compact" href="/admin/appointments?businessDays=1&month=' + monthShift(month,1) + '">' + icon('chevronRight') + '</a></div></div><div class="ts-days-message" role="status"></div><div class="ts-days-grid">' + week + empty + cards + '</div>' + (payload.role === 'ADMIN' ? '<div class="ts-days-savebar"><div class="ts-days-savecopy"><strong>変更をまとめて保存</strong><span data-dirty-count>変更はありません</span></div><button class="ts-days-saveall" type="button" data-save-all disabled>変更をまとめて保存</button></div>' : '')`,
  1,
  'daily hours back link markup',
)
tenantClient += '\n/* business-hours-consistency-v514 */\n'
fs.writeFileSync(tenantClientPath, tenantClient)

let shiftServer = fs.readFileSync(shiftServerPath, 'utf8')
shiftServer = replaceExact(
  shiftServer,
  `{openMinutes:600,closeMinutes:1140,closedWeekdays:[1]}`,
  `{openMinutes:600,closeMinutes:1140,closedWeekdays:[],isClosed:false,overridden:false}`,
  1,
  'server shift initial business schedule',
)
shiftServer = replaceExact(
  shiftServer,
  `__businessOpen=Number(__businessSchedule.openMinutes)||600,__businessClose=Number(__businessSchedule.closeMinutes)||1140`,
  `__businessOpen=Number.isFinite(Number(__businessSchedule.openMinutes))?Number(__businessSchedule.openMinutes):600,__businessClose=Number.isFinite(Number(__businessSchedule.closeMinutes))?Number(__businessSchedule.closeMinutes):1140`,
  1,
  'server shift minute normalization',
)
shiftServer = replaceExact(
  shiftServer,
  `(!n.isVirtualFree && n.key !== "free" && n.name !== "フリー"`,
  `(!__businessSchedule.isClosed && !n.isVirtualFree && n.key !== "free" && n.name !== "フリー"`,
  1,
  'server closed-day capacity',
)
shiftServer = replaceExact(
  shiftServer,
  `(0,i.useEffect)(()=>{let __cancelled=false;const __apply=e=>{if(__cancelled||!e)return;const t=e.profile?.businessSchedule||e.businessSchedule||e;if(Number.isFinite(Number(t.openMinutes))&&Number.isFinite(Number(t.closeMinutes)))__setBusinessSchedule({openMinutes:Number(t.openMinutes),closeMinutes:Number(t.closeMinutes),closedWeekdays:Array.isArray(t.closedWeekdays)?t.closedWeekdays:[]})};fetch("/api/admin/store-profile",{headers:{Accept:"application/json"},credentials:"same-origin",cache:"no-store"}).then(e=>e.ok?e.json():null).then(__apply).catch(()=>{});const __onSchedule=e=>__apply(e.detail);window.addEventListener("lien:business-schedule-updated",__onSchedule);return()=>{__cancelled=true;window.removeEventListener("lien:business-schedule-updated",__onSchedule)}},[]);`,
  `(0,i.useEffect)(()=>{let __cancelled=false;const __apply=e=>{if(__cancelled||!e)return;const t=e.profile?.businessSchedule||e.businessSchedule||e;if(Number.isFinite(Number(t.openMinutes))&&Number.isFinite(Number(t.closeMinutes)))__setBusinessSchedule({openMinutes:Number(t.openMinutes),closeMinutes:Number(t.closeMinutes),closedWeekdays:Array.isArray(t.closedWeekdays)?t.closedWeekdays:[],isClosed:t.isClosed===true,overridden:t.overridden===true})};const __load=e=>e.ok?e.json():null;Promise.all([fetch("/api/admin/store-profile",{headers:{Accept:"application/json"},credentials:"same-origin",cache:"no-store"}).then(__load).catch(()=>null),fetch("/api/lien-business-days?date="+encodeURIComponent(e),{headers:{Accept:"application/json"},credentials:"same-origin",cache:"no-store"}).then(__load).catch(()=>null)]).then(([t,r])=>__apply(Array.isArray(r?.days)?r.days.find(t=>t.date===e)||t:t));const __onSchedule=e=>__apply(e.detail);window.addEventListener("lien:business-schedule-updated",__onSchedule);return()=>{__cancelled=true;window.removeEventListener("lien:business-schedule-updated",__onSchedule)}},[e]);`,
  1,
  'server shift daily schedule precedence',
)
shiftServer += '\n/* business-hours-consistency-v514 */\n'
fs.writeFileSync(shiftServerPath, shiftServer)

let shiftClient = fs.readFileSync(shiftClientPath, 'utf8')
shiftClient = replaceExact(
  shiftClient,
  `{openMinutes:600,closeMinutes:1140,closedWeekdays:[1]}`,
  `{openMinutes:600,closeMinutes:1140,closedWeekdays:[],isClosed:false,overridden:false}`,
  1,
  'client shift initial business schedule',
)
shiftClient = replaceExact(
  shiftClient,
  `__businessOpen=Number(__businessSchedule.openMinutes)||600,__businessClose=Number(__businessSchedule.closeMinutes)||1140`,
  `__businessOpen=Number.isFinite(Number(__businessSchedule.openMinutes))?Number(__businessSchedule.openMinutes):600,__businessClose=Number.isFinite(Number(__businessSchedule.closeMinutes))?Number(__businessSchedule.closeMinutes):1140`,
  1,
  'client shift minute normalization',
)
shiftClient = replaceExact(
  shiftClient,
  `(!r.isVirtualFree && r.key !== "free" && r.name !== "フリー"`,
  `(!__businessSchedule.isClosed && !r.isVirtualFree && r.key !== "free" && r.name !== "フリー"`,
  1,
  'client closed-day capacity',
)
shiftClient = replaceExact(
  shiftClient,
  `(0,l.useEffect)(()=>{let __cancelled=false;const __apply=e=>{if(__cancelled||!e)return;const t=e.profile?.businessSchedule||e.businessSchedule||e;if(Number.isFinite(Number(t.openMinutes))&&Number.isFinite(Number(t.closeMinutes)))__setBusinessSchedule({openMinutes:Number(t.openMinutes),closeMinutes:Number(t.closeMinutes),closedWeekdays:Array.isArray(t.closedWeekdays)?t.closedWeekdays:[]})};fetch("/api/admin/store-profile",{headers:{Accept:"application/json"},credentials:"same-origin",cache:"no-store"}).then(e=>e.ok?e.json():null).then(__apply).catch(()=>{}).finally(()=>{if(!__cancelled)__setShiftHydrated(true)});const __onSchedule=e=>{__apply(e.detail);__setShiftHydrated(true)};window.addEventListener("lien:business-schedule-updated",__onSchedule);return()=>{__cancelled=true;window.removeEventListener("lien:business-schedule-updated",__onSchedule)}},[]);`,
  `(0,l.useEffect)(()=>{let __cancelled=false;const __apply=e=>{if(__cancelled||!e)return;const n=e.profile?.businessSchedule||e.businessSchedule||e;if(Number.isFinite(Number(n.openMinutes))&&Number.isFinite(Number(n.closeMinutes)))__setBusinessSchedule({openMinutes:Number(n.openMinutes),closeMinutes:Number(n.closeMinutes),closedWeekdays:Array.isArray(n.closedWeekdays)?n.closedWeekdays:[],isClosed:n.isClosed===true,overridden:n.overridden===true})};const __load=e=>e.ok?e.json():null;Promise.all([fetch("/api/admin/store-profile",{headers:{Accept:"application/json"},credentials:"same-origin",cache:"no-store"}).then(__load).catch(()=>null),fetch("/api/lien-business-days?date="+encodeURIComponent(t),{headers:{Accept:"application/json"},credentials:"same-origin",cache:"no-store"}).then(__load).catch(()=>null)]).then(([e,n])=>__apply(Array.isArray(n?.days)?n.days.find(e=>e.date===t)||e:e)).finally(()=>{if(!__cancelled)__setShiftHydrated(true)});const __onSchedule=e=>{__apply(e.detail);__setShiftHydrated(true)};window.addEventListener("lien:business-schedule-updated",__onSchedule);return()=>{__cancelled=true;window.removeEventListener("lien:business-schedule-updated",__onSchedule)}},[t]);`,
  1,
  'client shift daily schedule precedence',
)
shiftClient += '\n/* business-hours-consistency-v514 */\n'
fs.writeFileSync(shiftClientPath, shiftClient)

console.log(JSON.stringify({ release: 'business-hours-consistency-v514' }))
