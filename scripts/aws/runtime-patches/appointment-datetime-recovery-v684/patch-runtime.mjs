import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {createRequire} from 'node:module'
const root=process.env.LIEN_RUNTIME_ROOT||'/app', source=path.dirname(fileURLToPath(import.meta.url))
const read=file=>fs.readFileSync(path.join(root,file),'utf8'), write=(file,value)=>fs.writeFileSync(path.join(root,file),value)
function replace(value,before,after,count=1){if(value.split(before).length-1!==count)throw Error('Unexpected parent anchor: '+before);return value.replaceAll(before,after)}
const require=createRequire(path.join(root,'package.json')), React=require('react'), {renderToStaticMarkup}=require('react-dom/server'),icons=require('lucide-react')
const markup=Object.fromEntries(['CalendarClock','Check','X'].map(name=>[name,renderToStaticMarkup(React.createElement(icons[name],{size:18,'aria-hidden':true}))]))
let client=read('staff-breaks-checkout-menu-client-v442.js')
const start=client.indexOf(';(() => {\n  /* appointment-datetime-editor-v663 */')
if(start<0||client.indexOf('/* appointment-datetime-editor-v663 */',start+20)!==-1)throw Error('Previous editor boundary missing')
// Retain the shift/customer/checkout helpers, replace only the legacy datetime add-on.
client=client.slice(0,start)+';window.AppointmentDatetimeIconsV684='+JSON.stringify(markup)+';\n'
const css=fs.readFileSync(path.join(source,'appointment-datetime.css'),'utf8')
client+=';(()=>{if(document.getElementById("ad684-style"))return;const style=document.createElement("style");style.id="ad684-style";style.textContent='+JSON.stringify(css)+';document.head.appendChild(style)})();\n'
client+=fs.readFileSync(path.join(source,'appointment-datetime.js'),'utf8')
write('staff-breaks-checkout-menu-client-v442.js',client)
write('public/appointment-datetime-v684.js',client)
let operations=read('appointment-operations-v267.js')
operations=replace(operations,"const CLOSED_STATUSES = ['会計完了', '来店完了', 'キャンセル', '無断キャンセル']","const CLOSED_STATUSES = ['会計完了', '来店完了', 'キャンセル', '無断キャンセル', '会計済み', '来店済み']")
const reader=`  async function getSchedule(req, res, url) {
    const session = await sessionProvider(req)
    if (!session || !['ADMIN', 'STAFF'].includes(session.role) || !session.organizationId) throw new RequestError('ログインが必要です。', 401)
    const match = url.pathname.match(/^\\/api\\/admin\\/appointments\\/([^/]+)\\/schedule$/)
    const appointmentId = decodeURIComponent(match[1])
    const appointment = await prisma.appointment.findFirst({
      where: { id: appointmentId, customer: { organizationId: session.organizationId, deletedAt: null } },
      select: { id: true, scheduledAt: true, durationMinutes: true, staffName: true, menu: true, status: true, updatedAt: true },
    })
    if (!appointment) throw new RequestError('予約が見つかりません。', 404)
    sendJson(res, 200, { appointment, editable: !CLOSED_STATUSES.includes(appointment.status) && !['会計済み','来店済み'].includes(appointment.status) })
    return true
  }

`
operations=replace(operations,'  async function patchSchedule(req, res, url) {',reader+'  async function patchSchedule(req, res, url) {')
// The detail editor changes only the date/time. Resolve staff/duration under the
// existing row lock so unrelated checkout fields and legacy nulls stay intact.
const patchStart=operations.indexOf('  async function patchSchedule('),patchEnd=operations.indexOf('  async function createManual(',patchStart)
let patch=operations.slice(patchStart,patchEnd)
patch=replace(patch,'    const durationMinutes = Number(body.durationMinutes)','    const dateTimeOnly = body.dateTimeOnly === true\n    let durationMinutes = dateTimeOnly ? 60 : Number(body.durationMinutes)')
patch=replace(patch,'status: true, updatedAt: true','status: true, updatedAt: true, durationMinutes: true, staffName: true')
patch=replace(patch,'      const staff = await resolveStaff(tx, session.organizationId, body.staffName, body.staffKey)',`      if (dateTimeOnly) {
        durationMinutes = current.durationMinutes ?? 60
        validateTime(startMinutes, durationMinutes)
        if (!expectedUpdatedAt) throw new RequestError('予約情報を再読み込みしてください。', 409)
      }
      const staff = await resolveStaff(tx, session.organizationId, dateTimeOnly ? (current.staffName || 'フリー') : body.staffName, dateTimeOnly ? null : body.staffKey)`)
patch=replace(patch,'data: { scheduledAt, durationMinutes, staffName: staff.staffName }','data: dateTimeOnly ? { scheduledAt } : { scheduledAt, durationMinutes, staffName: staff.staffName }')
operations=operations.slice(0,patchStart)+patch+operations.slice(patchEnd)
const route="      if (/^\\/api\\/admin\\/appointments\\/[^/]+\\/schedule$/.test(url.pathname) && req.method === 'PATCH') return await patchSchedule(req, res, url)"
operations=replace(operations,route,route+"\n      if (/^\\/api\\/admin\\/appointments\\/[^/]+\\/schedule$/.test(url.pathname) && req.method === 'GET') return await getSchedule(req, res, url)")
// Invalid calendar dates must not be normalized into a different month by Date.
operations=replace(operations,"    const scheduledAt = appointmentDate(date, startMinutes)\n    const expectedUpdatedAt", "    const scheduledAt = appointmentDate(date, startMinutes)\n    if (jstDateKey(scheduledAt) !== date) throw new RequestError('予約日を確認してください。')\n    const expectedUpdatedAt")
write('appointment-operations-v267.js',operations)
let server=read('server.js')
const marker="      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Platform-Console', 'v683') /* platform-console-v683 */"
server=replace(server,marker,marker+"\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Appointment-Datetime-Recovery', 'v684') /* appointment-datetime-recovery-v684 */")
write('server.js',server)
// This loader is served private/no-store; immutable parent assets remain unchanged.
write('ui-workflows-v294.js',replace(read('ui-workflows-v294.js'),'/staff-breaks-checkout-menu-client-v442.js?v=442','/appointment-datetime-v684.js?v=684-1'))
console.log('v684: hydration-gated reservation editor, scoped live metadata, retained schedule validation, versioned loader')
