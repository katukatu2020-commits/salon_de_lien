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

const files = walk(nextRoot).filter(file => file.endsWith('.js')).map(file => ({ file, source: fs.readFileSync(file, 'utf8') }))
const active = files.filter(item => item.source.includes('commercial-sidebar-v135'))
const browser = active.filter(item => item.file.includes(`${path.sep}static${path.sep}`))
const server = active.filter(item => item.file.includes(`${path.sep}server${path.sep}`))
if (browser.length !== 1 || server.length !== 1) throw new Error(`expected one browser and one server v135 shell, found browser=${browser.length}, server=${server.length}`)
if (!browser[0].source.includes('/commercial-admin-v130.js?v=20260815-130') || !browser[0].source.includes('/tenant-setup-client.js?v=20260815-135')) throw new Error('v135 browser helper references are incomplete')
if (browser[0].source.includes('/commercial-admin-v135')) throw new Error('v135 references a non-existent commercial helper')
console.log(JSON.stringify({ marker: 'commercial-sidebar-v135', files: active.map(item => path.relative(appRoot, item.file)) }))

