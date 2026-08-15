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

const sources = walk(nextRoot).filter(file => file.endsWith('.js')).map(file => ({ file, source: fs.readFileSync(file, 'utf8') }))
const serverSuffix = path.join('server', 'app', 'u', '(account)', 'appointments', 'page.js')
const server = sources.filter(item => item.file.endsWith(serverSuffix) && item.source.includes('customer-booking-hydration-gate-v132'))
const browser = sources.filter(item => item.file.includes(`${path.sep}static${path.sep}`) && item.source.includes('customer-booking-hydration-gate-v132'))
if (server.length !== 1) throw new Error(`expected one patched customer server page, found ${server.length}`)
if (browser.length !== 1) throw new Error(`expected one patched customer browser chunk, found ${browser.length}`)
for (const item of [...server, ...browser]) {
  if (!item.source.includes('__customerHydrated') || !item.source.includes('予約画面を読み込んでいます')) throw new Error(`incomplete hydration gate in ${item.file}`)
  new Function(item.source)
}
console.log(JSON.stringify({ marker: 'customer-booking-hydration-gate-v132', server: path.relative(appRoot, server[0].file), browser: path.relative(appRoot, browser[0].file) }))

