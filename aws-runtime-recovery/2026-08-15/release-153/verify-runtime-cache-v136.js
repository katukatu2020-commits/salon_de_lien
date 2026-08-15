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
const active = files.filter(item => item.source.includes('admin-theme-and-modal-v153'))
const browser = active.filter(item => item.file.includes(`${path.sep}static${path.sep}`))
const server = active.filter(item => item.file.includes(`${path.sep}server${path.sep}`))
if (browser.length !== 1 || server.length !== 1) throw new Error(`expected one browser and one server v153 shell, found browser=${browser.length}, server=${server.length}`)
if (!browser[0].source.includes('/commercial-admin-v136.js?v=20260815-153') || !browser[0].source.includes('/tenant-setup-client.js?v=20260815-153')) throw new Error('v153 browser helper references are incomplete')
if (!browser[0].source.includes('salon-lien:admin-theme')) throw new Error('v153 browser shell does not apply the saved theme before paint')
if (!browser[0].source.includes("document.addEventListener('DOMContentLoaded',schedule") || browser[0].source.includes('setTimeout(loadAdminRuntime,1800)')) throw new Error('v153 browser runtime loader still waits after load')
console.log(JSON.stringify({ marker: 'admin-theme-and-modal-v153', files: active.map(item => path.relative(appRoot, item.file)) }))
