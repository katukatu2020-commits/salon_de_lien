import fs from 'node:fs'
import path from 'node:path'

function replaceOnce(source, label, before, after) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${label}: expected exactly one match, found ${count}`)
  return source.replace(before, after)
}

let client = fs.readFileSync('/app/public/customer-appointment-cancel-v370.js', 'utf8')
client = client.split('V370').join('V371').split('v370').join('v371')
client = replaceOnce(
  client,
  'legacy cancellation UI suppression',
  "    card.dataset.lienCancelV371 = '1'\n\n    const section = card.closest('section')",
  "    card.dataset.lienCancelV371 = '1'\n    // The pre-v370 workflow still observes this route. Mark it handled and\n    // remove any legacy controls regardless of which script won the load race.\n    card.dataset.lienCancelEnhanced = '1'\n    card.querySelectorAll('.lien-cancel-v362__detail-button,.lien-cancel-v362__detail,.lien-cancel-v370__button,.lien-cancel-v370__detail').forEach(node => node.remove())\n\n    const section = card.closest('section')",
)
fs.writeFileSync('/app/public/customer-appointment-cancel-v371.js', client)

const layoutDirectory = '/app/.next/static/chunks/app/u/(account)'
const previousLayoutName = 'layout-customer-stability-v370.js'
const currentLayoutName = 'layout-customer-stability-v371.js'
const previousLayoutPath = path.join(layoutDirectory, previousLayoutName)
const currentLayoutPath = path.join(layoutDirectory, currentLayoutName)
let layout = fs.readFileSync(previousLayoutPath, 'utf8')
layout = layout
  .split('/customer-appointment-cancel-v370.js').join('/customer-appointment-cancel-v371.js')
  .split('data-lien-customer-appointment-cancel-v370').join('data-lien-customer-appointment-cancel-v371')
  .split('lienCustomerAppointmentCancelV370').join('lienCustomerAppointmentCancelV371')
fs.writeFileSync(currentLayoutPath, layout)

function replaceManifestChunkReference(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      replaceManifestChunkReference(target)
      continue
    }
    if (!entry.isFile() || !/\.(?:json|js)$/.test(entry.name)) continue
    let source = fs.readFileSync(target, 'utf8')
    if (!source.includes(previousLayoutName)) continue
    source = source.split(previousLayoutName).join(currentLayoutName)
    fs.writeFileSync(target, source)
  }
}

replaceManifestChunkReference('/app/.next')
