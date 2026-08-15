'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const { transformHydrationGate } = require('./patch-shift-hydration-v131')

test('shift server and browser bundles render the same stable first frame', () => {
  const source = `function Shift(){let [q,Z]=(0,i.useState)(1180),[__businessSchedule,__setBusinessSchedule]=(0,i.useState)({openMinutes:600,closeMinutes:1140,closedWeekdays:[1]}),__businessOpen=Number(__businessSchedule.openMinutes)||600,__businessClose=Number(__businessSchedule.closeMinutes)||1140,__businessDuration=Math.max(60,__businessClose-__businessOpen),x=(0,i.useMemo)(()=>[],[]);(0,i.useEffect)(()=>{let c=false;const a=e=>e;fetch("/api/admin/store-profile").then(a);window.addEventListener("lien:business-schedule-updated",a);return()=>{c=true;window.removeEventListener("lien:business-schedule-updated",a)}},[]);(0,i.useEffect)(()=>{window.localStorage.getItem("salon-capacity-overrides:x")},[]);return (0,n.jsxs)("div",{className:"lien-reference-shift grid gap-4",children:[(0,n.jsx)("div",{className:"shift-canvas"})]})}`
  const transformed = transformHydrationGate(source)
  assert.match(transformed, /__shiftHydrated,__setShiftHydrated/)
  assert.match(transformed, /useEffect\)\(\(\)=>\{__setShiftHydrated\(true\)\},\[\]\)/)
  assert.match(transformed, /if\(!__shiftHydrated\)return/)
  assert.match(transformed, /aria-busy":"true"/)
  assert.match(transformed, /shift-hydration-gate-v131/)
  assert.doesNotThrow(() => new Function(transformed))
})
