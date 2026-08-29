import assert from 'node:assert/strict'
import fs from 'node:fs'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const source = fs.readFileSync(`${root}/customer-link-ui-v293.js`, 'utf8')
const marker = source.indexOf('staff-image-selection-v467')
const end = source.indexOf('\n    })\n  }', marker)
const block = source.slice(marker, end)

assert.ok(marker >= 0)
assert.equal((block.match(/resolve\(value\)/g) || []).length, 1)
assert.equal((block.match(/let settled = false/g) || []).length, 1)
assert.equal((block.match(/dialog\.overlay\.remove\(\)/g) || []).length, 1)
assert.equal((block.match(/dialog\.close\(\)/g) || []).length, 0)
assert.ok(block.indexOf('settle(value)') < block.indexOf('dialog.overlay.remove()'))

console.log('staff image selection v467 tests passed')
