'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const { transformHydrationGate } = require('./patch-customer-booking-hydration-v132')

test('gates the server booking root without changing hook order', () => {
  const source = 'function Booking({currentDate:e}){let[a,b]=(0,r.useState)(e);(0,r.useEffect)(()=>{},[]);async function save(){await fetch("/api/customer/appointments")}return(0,j.jsxs)("div",{className:"grid gap-6",children:[j.jsx("span",{children:"空き状況を確認しています"})]})}'
  const result = transformHydrationGate(source)
  assert.match(result, /customer-booking-hydration-gate-v132/)
  assert.match(result, /__customerHydrated\?\(0,j\.jsxs\)/)
  assert.match(result, /予約画面を読み込んでいます/)
  assert.doesNotThrow(() => new Function(result))
})

test('gates the browser booking root after its comma-expression effect', () => {
  const source = 'function Booking(){let[a,b]=(0,u.useState)(1);async function save(){await fetch("/api/customer/appointments")}return(0,u.useEffect)(()=>{fetch("/api/customer/appointments/availability")},[]),(0,n.jsxs)("div",{className:"grid gap-6",children:[n.jsx("span",{children:"空き状況を確認しています"})]})}/* business-schedule-v127-customer */'
  const result = transformHydrationGate(source)
  assert.match(result, /return\(0,u\.useEffect\).*__customerHydrated\?/)
  assert.equal((result.match(/__setCustomerHydrated\(true\)/g) || []).length, 1)
  assert.doesNotThrow(() => new Function(result))
})

test('is idempotent', () => {
  const source = 'function Booking(){let[a,b]=(0,u.useState)(1);async function save(){await fetch("/api/customer/appointments")}return(0,n.jsxs)("div",{className:"grid gap-6",children:[n.jsx("span",{children:"空き状況を確認しています"})]})}'
  const once = transformHydrationGate(source)
  assert.equal(transformHydrationGate(once), once)
})

