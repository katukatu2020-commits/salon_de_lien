import assert from 'node:assert/strict'
import fs from 'node:fs'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const links = fs.readFileSync(`${root}/customer-links-v293.js`, 'utf8')
const ui = fs.readFileSync(`${root}/customer-link-ui-v424.js`, 'utf8')

assert.doesNotThrow(() => new Function(links))
assert.doesNotThrow(() => new Function(ui))

const ensureSchema = links.match(/  async function ensureSchema\(\) \{[\s\S]*?\n  \}/)?.[0] || ''
assert.ok(ensureSchema.includes('SELECT 1 FROM "CustomerStoreLink" LIMIT 0'))
assert.ok(!ensureSchema.includes('ALTER TABLE'))
assert.ok(!ensureSchema.includes('CREATE INDEX'))
assert.ok(!ensureSchema.includes('DELETE FROM "CustomerStoreLink"'))

const requestJson = ui.match(/  async function requestJson\(url, options = \{\}\) \{[\s\S]*?\n  \}/)?.[0] || ''
assert.ok(requestJson.includes('new AbortController()'))
assert.ok(requestJson.includes('setTimeout(() => controller.abort(), 12000)'))
assert.ok(requestJson.includes('clearTimeout(timeoutId)'))

console.log('customer code link v474 runtime tests passed')
