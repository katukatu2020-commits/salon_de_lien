import fs from 'node:fs'
import path from 'node:path'

const staticDirectory = '/app/.next/static/chunks/app/admin/appointments'
const oldName = 'page-shift-layout-20260812-02.capacity-persist-v44.business-schedule-v294.shift-stable-v341.js'
const newName = 'page-shift-layout-20260812-02.capacity-persist-v44.business-schedule-v294.shift-first-grab-v369.js'
const oldPath = path.join(staticDirectory, oldName)
const newPath = path.join(staticDirectory, newName)
const referenceFiles = [
  '/app/.next/app-build-manifest.json',
  '/app/.next/server/app/admin/appointments/page_client-reference-manifest.js',
]

let source = fs.readFileSync(oldPath, 'utf8')

function replaceOnce(before, after, label) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`)
  source = source.replace(before, after)
}

replaceOnce(
  `          if (!(!j(t) || S.includes(t.id)) && 0 === e.button && !1 !== e.isPrimary) {
            if (D.current) {`,
  `          if (!(!j(t) || S.includes(t.id)) && 0 === e.button && !1 !== e.isPrimary) {
            e.preventDefault();
            if (D.current) {`,
  'prevent native first-pointer default',
)

replaceOnce(
  `              p = (e) => e.preventDefault();
            ((I.current = { ...t }),`,
  `              p = (e) => e.preventDefault();
            if ("touch" !== e.pointerType && "function" == typeof r.setPointerCapture)
              try { r.setPointerCapture(e.pointerId); } catch (e) {}
            ((I.current = { ...t }),`,
  'capture the initial pointer immediately',
)

replaceOnce(
  `          let r = "function" == typeof e.getCoalescedEvents ? e.getCoalescedEvents() : null,
            a = r && r.length ? r[r.length - 1] : e;
          if (!n.moved && "touch" !== n.pointerType && (1 & a.buttons) == 0) return;
          let i = a.clientX - n.originClientX,`,
  `          let r = "function" == typeof e.getCoalescedEvents ? e.getCoalescedEvents() : null,
            a = r && r.length ? r[r.length - 1] : e,
            h = (1 & Number(e.buttons || 0)) !== 0 ||
              (1 & Number(a.buttons || 0)) !== 0 ||
              Number(e.pressure || a.pressure || 0) > 0;
          if (!n.moved && "touch" !== n.pointerType && !h) return;
          let i = a.clientX - n.originClientX,`,
  'reliable pressed-button detection',
)

replaceOnce(
  `            o = a.clientY - n.originClientY;
          if ("touch" !== n.pointerType || n.moved) {
            if (!n.moved && Math.hypot(i, o) <= 5) return;`,
  `            o = a.clientY - n.originClientY;
          if ("touch" !== n.pointerType || n.moved) {
            if (!n.moved && Math.hypot(i, o) <= 3) return;`,
  'responsive first movement threshold',
)

new Function(source)
fs.writeFileSync(newPath, source)

for (const referenceFile of referenceFiles) {
  const manifest = fs.readFileSync(referenceFile, 'utf8')
  const count = manifest.split(oldName).length - 1
  if (count < 1) throw new Error(`missing shift chunk reference: ${referenceFile}`)
  fs.writeFileSync(referenceFile, manifest.replaceAll(oldName, newName))
}
