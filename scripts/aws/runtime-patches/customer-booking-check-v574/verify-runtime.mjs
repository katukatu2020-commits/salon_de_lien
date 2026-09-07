import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8')
const styles = fs.readFileSync(path.join(root, 'customer-experience-v508.css'), 'utf8')

for (const required of [
  "X-Lien-Customer-Booking-Check', 'v574'",
  "X-Lien-Admin-Home-Visual', 'v573'",
  '/customer-experience-v508.css?v=574-booking-check1',
  '/* customer-booking-check-v574 */',
]) assert.ok(server.includes(required) || styles.includes(required), `runtime invariant missing: ${required}`)

for (const required of [
  'button.cx-slot-selected-v508',
  'button.cx-slot-confirmed-v508',
  '> :not(.cx-slot-check-v508)',
  '> .cx-slot-check-v508',
  'position: absolute !important',
  'inset: 0 !important',
  'place-items: center !important',
  'color: transparent !important',
  '-webkit-text-fill-color: transparent !important',
  'line-height: 0 !important',
  'transition-property: background-color, box-shadow !important',
]) assert.ok(styles.includes(required), `booking check style missing: ${required}`)

assert.equal((styles.match(/\/\* customer-booking-check-v574 \*\//g) || []).length, 1)
assert.doesNotMatch(server, /customer-experience-v508\.css\?v=508['"]/)

console.log(JSON.stringify({
  release:'customer-booking-check-v574',
  runtimeVerified:true,
  selectedAndConfirmed:true,
  centeredOverlay:true,
  cacheBusted:true,
}))
