const fs = require('fs')
const path = require('path')

const root = process.env.APP_ROOT || '/app'
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const server = read('server.js')
const menu = read('.next/server/chunks/9845.js')
const products = read('.next/server/app/admin/products/page.js')
const appointments = read('.next/server/app/u/(account)/appointments/page.js')

const checks = [
  ['staff profile API', server.includes("'/api/lien-staff-profiles'")],
  ['legacy owner profile mapping', server.includes("lien: 'tanizaki'")],
  ['custom customer desktop CSS', server.includes('.app{max-width:1440px')],
  ['idempotent menu seed', menu.includes('SalonMenu seed skipped; catalog already initialized')],
  ['product aggregate fallback', products.includes('product sales aggregate unavailable')],
  ['server booking profile fetch', appointments.includes('/api/lien-staff-profiles')],
]

const staticAppointments = path.join(root, '.next/static/chunks/app/u/(account)/appointments')
const staticFile = fs.readdirSync(staticAppointments).find(name => name.includes('.staff-live-v32.js'))
checks.push(['versioned static booking chunk', Boolean(staticFile)])
if (staticFile) checks.push(['static booking profile fetch', fs.readFileSync(path.join(staticAppointments, staticFile), 'utf8').includes('/api/lien-staff-profiles')])

const cssRoot = path.join(root, '.next/static/css')
const cssFiles = fs.readdirSync(cssRoot).filter(name => name.includes('.responsive-desktop-v32.css'))
checks.push(['versioned responsive CSS', cssFiles.length > 0])
checks.push(['desktop authenticated layout CSS', cssFiles.some(name => fs.readFileSync(path.join(cssRoot, name), 'utf8').includes('grid-template-columns:250px minmax(0,1fr)!important'))])

for (const [label, ok] of checks) {
  if (!ok) throw new Error(`verification failed: ${label}`)
}

console.log(JSON.stringify({ verified: checks.map(([label]) => label), staticFile, cssFiles }))
