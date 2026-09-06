import assert from 'node:assert/strict'

const baseUrl = String(process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3139').replace(/\/$/, '')
const customerId = process.env.VERIFY_CUSTOMER_ID || 'showcase-yohaku-customer-001'

const ready = await fetch(`${baseUrl}/api/health/ready?verify=v565`, { cache:'no-store' })
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-customer-appointment-history'), 'v565')
assert.equal(ready.headers.get('x-lien-customer-chart-attachments'), 'v564')

const login = await fetch(`${baseUrl}/api/auth/login`, {
  method:'POST',
  redirect:'manual',
  headers:{ Origin:baseUrl, 'Content-Type':'application/x-www-form-urlencoded' },
  body:new URLSearchParams({ email:'demo.owner', password:'LienDemo2026!', next:'/admin/customers' }),
})
assert.ok([302, 303].includes(login.status), `owner login failed: ${login.status}`)
const cookie = (login.headers.get('set-cookie') || '').split(';')[0]
assert.match(cookie, /^lien_admin_session=/)

const historyResponse = await fetch(`${baseUrl}/api/admin/customers/${encodeURIComponent(customerId)}/visit-history`, {
  headers:{ Cookie:cookie, Accept:'application/json', 'Cache-Control':'no-cache' },
})
assert.equal(historyResponse.status, 200)
const history = await historyResponse.json()
assert.equal(history.ok, true)
assert.ok(history.appointments.length > 0, 'local fixture needs a current appointment')
assert.equal(history.totalCount, history.appointments.length + history.completed.length)
const appointment = history.appointments[0]
const originalMemo = appointment.memo?.body || ''
const verificationMemo = `v565 integration ${Date.now()}`

const save = await fetch(`${baseUrl}/api/admin/customers/${encodeURIComponent(customerId)}/visit-history/memo`, {
  method:'PUT',
  headers:{ Cookie:cookie, Origin:baseUrl, 'Content-Type':'application/json' },
  body:JSON.stringify({ subjectKey:appointment.subjectKey, body:verificationMemo }),
})
assert.equal(save.status, 200)
assert.equal((await save.json()).memo.body, verificationMemo)

const persisted = await fetch(`${baseUrl}/api/admin/customers/${encodeURIComponent(customerId)}/visit-history`, {
  headers:{ Cookie:cookie, Accept:'application/json', 'Cache-Control':'no-cache' },
}).then(response => response.json())
assert.equal(persisted.appointments.find(item => item.id === appointment.id)?.memo?.body, verificationMemo)

const restore = await fetch(`${baseUrl}/api/admin/customers/${encodeURIComponent(customerId)}/visit-history/memo`, {
  method:'PUT',
  headers:{ Cookie:cookie, Origin:baseUrl, 'Content-Type':'application/json' },
  body:JSON.stringify({ subjectKey:appointment.subjectKey, body:originalMemo }),
})
assert.equal(restore.status, 200)

console.log(JSON.stringify({
  release:'customer-appointment-history-memos-v565',
  currentAppointments:history.appointments.length,
  completedHistory:history.completed.length,
  memoRoundTrip:true,
}))
