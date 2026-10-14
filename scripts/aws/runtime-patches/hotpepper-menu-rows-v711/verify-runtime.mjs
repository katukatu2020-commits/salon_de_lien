import assert from 'node:assert/strict'
import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
assert.match(fs.readFileSync('/app/hotpepper-menu-parser-v612.js', 'utf8'), /hotpepper-menu-rows-v711\.cjs/)
assert.equal(fs.readFileSync('/app/hotpepper-menu-rows-v711.cjs', 'utf8'), fs.readFileSync('/tmp/lien-v711/parse-menu-rows.cjs', 'utf8'))
assert.equal(fs.readFileSync('/app/hotpepper-menu-import-v612.js', 'utf8'), fs.readFileSync('/tmp/lien-v612/hotpepper-menu-import-v612.js', 'utf8'))
assert.match(fs.readFileSync('/app/server.js', 'utf8'), /X-Lien-Hotpepper-Menu-Rows/)
execFileSync(process.execPath, ['/tmp/lien-v612/integration.mjs'], { stdio: 'inherit' })
console.log('v711 runtime PASS: row parser installed; authenticated service, selection, transactions and duplicate checks unchanged')
