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

const layouts = walk(path.join(nextRoot, 'static', 'chunks', 'app')).filter(file => path.basename(file).includes('tenant-runtime-v128.js'))
if (layouts.length !== 1) throw new Error(`expected one v128 layout, found ${layouts.length}`)
const layout = fs.readFileSync(layouts[0], 'utf8')
for (const expected of ['admin-header-settings-v128', '/commercial-admin-v128.js?v=20260815-128', '/tenant-setup-client.js?v=20260815-128']) {
  if (!layout.includes(expected)) throw new Error(`v128 layout marker missing: ${expected}`)
}
if (layout.includes('/commercial-admin-v127.js?v=20260815-127') || layout.includes('/tenant-setup-client.js?v=20260815-127')) throw new Error('stale v127 helper URL remains')
const serverTargets = walk(path.join(nextRoot, 'server')).filter(file => file.endsWith('.js') && fs.readFileSync(file, 'utf8').includes('admin-header-settings-v128'))
if (serverTargets.length !== 1) throw new Error(`expected one v128 server shell, found ${serverTargets.length}`)
const storeProfile = fs.readFileSync(path.join(appRoot, 'store-profile.js'), 'utf8')
if (!storeProfile.includes("'/commercial-admin-v128.js'")) throw new Error('v128 commercial helper route missing')
console.log(JSON.stringify({ verified: true, layout: path.basename(layouts[0]), server: path.relative(appRoot, serverTargets[0]) }))
