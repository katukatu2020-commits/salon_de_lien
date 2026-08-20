import fs from 'node:fs'

const shiftFile = '/app/.next/static/chunks/app/admin/appointments/page-shift-layout-20260812-02.capacity-persist-v44.business-schedule-v294.js'
const shift = fs.readFileSync(shiftFile, 'utf8')
const commercial = fs.readFileSync('/app/commercial-admin-v101.js', 'utf8')

const requireText = (source, text, label) => {
  if (!source.includes(text)) throw new Error(`Missing ${label}`)
}
const forbidText = (source, text, label) => {
  if (source.includes(text)) throw new Error(`Legacy behavior remains: ${label}`)
}

requireText(shift, `if ("touch" !== n.pointerType && (1 & e.buttons) == 0) {\n            J(e, !0);`, 'buttons=0 cancellation')
requireText(shift, `onLostPointerCapture: (e) => J(e, !0),`, 'lost capture cancellation')
requireText(shift, `r.previewAppointment || a`, 'pointerup-only final preview commit')
requireText(shift, `n.previewAppointment = d;`, 'non-rendering move preview state')
requireText(shift, `Math.hypot(r, a) <= 5`, 'two-dimensional movement threshold')
requireText(shift, `lien:shift-drag-pointer`, 'raw pointer preview event')
forbidText(shift, `e.clientY >= s.rect.top - 18 && e.clientY <= s.rect.bottom + 18`, 'nearby-row-only target restriction')
forbidText(shift, `onLostPointerCapture: (e) => J(e),`, 'lost capture commit')

requireText(commercial, `window.__lienShiftDragUxV325`, 'v325 drag enhancer')
requireText(commercial, `.ca-shift-drag-source{opacity:0!important;visibility:hidden!important}`, 'source range hiding')
requireText(commercial, `window.addEventListener('lien:shift-drag-pointer'`, 'animation-frame pointer following')
requireText(commercial, `guide.dataset.time = formatTime(detail.startMinutes)`, 'landing time guide')

console.log('shift drag v325 runtime verification passed')
