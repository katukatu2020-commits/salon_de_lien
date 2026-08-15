'use strict'

const fs = require('fs')
const path = require('path')
const appRoot = process.env.APP_ROOT || '/app'
const nextRoot = path.join(appRoot, '.next')

function walk(root) {
  if (!fs.existsSync(root)) return []
  return fs.readdirSync(root, { withFileTypes: true }).flatMap(entry => {
    const target = path.join(root, entry.name)
    return entry.isDirectory() ? walk(target) : [target]
  })
}

const layouts = walk(path.join(nextRoot, 'static', 'chunks', 'app')).filter(file => path.basename(file).includes('tenant-runtime-v130.js'))
if (layouts.length !== 1) throw new Error(`expected one v130 layout, found ${layouts.length}`)
const layout = fs.readFileSync(layouts[0], 'utf8')
for (const expected of ['admin-header-settings-v130', '/commercial-admin-v130.js?v=20260815-130', '/tenant-setup-client.js?v=20260815-130']) if (!layout.includes(expected)) throw new Error(`v130 layout marker missing: ${expected}`)
if (layout.includes('/commercial-admin-v129.js?v=20260815-129') || layout.includes('/tenant-setup-client.js?v=20260815-129')) throw new Error('stale v129 helper URL remains')
const helper = fs.readFileSync(path.join(appRoot, 'commercial-admin-v101.js'), 'utf8')
if (!helper.includes("window.addEventListener('DOMContentLoaded', start") || helper.includes('window.setTimeout(boot, 250)')) throw new Error('commercial helper first-paint bootstrap missing')
console.log(JSON.stringify({ verified: true, layout: path.basename(layouts[0]) }))
