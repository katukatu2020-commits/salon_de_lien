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
const serverPageSuffix = `${path.sep}server${path.sep}app${path.sep}admin${path.sep}appointments${path.sep}page.js`
const server = sources.filter(item => item.file.endsWith(serverPageSuffix) && item.source.includes('shift-hydration-gate-v131'))
const browser = sources.filter(item => item.file.includes(`${path.sep}static${path.sep}`) && item.source.includes('shift-hydration-gate-v131'))
if (server.length !== 1) throw new Error(`expected one v131 server shift bundle, found ${server.length}`)
if (browser.length !== 1) throw new Error(`expected one v131 browser shift bundle, found ${browser.length}`)
for (const item of [...server, ...browser]) {
  if (!item.source.includes('__shiftHydrated') || !item.source.includes('aria-busy')) throw new Error(`hydration gate missing from ${item.file}`)
  new Function(item.source)
}
const manifest = fs.readFileSync(path.join(nextRoot, 'app-build-manifest.json'), 'utf8')
if (!manifest.includes(path.basename(browser[0].file))) throw new Error('active appointment manifest does not reference v131 shift bundle')
console.log(JSON.stringify({ marker: 'shift-hydration-gate-v131', server: path.relative(appRoot, server[0].file), browser: path.relative(appRoot, browser[0].file) }))
