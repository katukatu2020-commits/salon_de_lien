import fs from 'node:fs'
import path from 'node:path'

function replaceOnce(source, label, before, after) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${label}: expected exactly one match, found ${count}`)
  return source.replace(before, after)
}

const serverPath = '/app/server.js'
let server = fs.readFileSync(serverPath, 'utf8')
server = replaceOnce(
  server,
  'customer home appointment detail links',
  '<a href="/u/appointments">詳細</a></div><a class="status-card" href="/u/appointments">',
  '<a href="/u/appointments?detail=${encodeURIComponent(data.appointment.id)}#current-reservations">詳細・キャンセル</a></div><a class="status-card" href="/u/appointments?detail=${encodeURIComponent(data.appointment.id)}#current-reservations">',
)
fs.writeFileSync(serverPath, server)

const publicClient = '/app/public/customer-appointment-cancel-v370.js'
fs.copyFileSync('/tmp/customer-appointment-cancel-v370.js', publicClient)

const layoutDirectory = '/app/.next/static/chunks/app/u/(account)'
const previousLayoutName = 'layout-customer-stability-v366.js'
const currentLayoutName = 'layout-customer-stability-v370.js'
const previousLayoutPath = path.join(layoutDirectory, previousLayoutName)
const currentLayoutPath = path.join(layoutDirectory, currentLayoutName)
let layout = fs.readFileSync(previousLayoutPath, 'utf8')
layout += `
;(()=>{
  if(location.pathname!=='/u/appointments'||document.querySelector('script[data-lien-customer-appointment-cancel-v370]'))return;
  const script=document.createElement('script');
  script.src='/customer-appointment-cancel-v370.js';
  script.async=true;
  script.dataset.lienCustomerAppointmentCancelV370='1';
  document.head.appendChild(script);
})()
`
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
