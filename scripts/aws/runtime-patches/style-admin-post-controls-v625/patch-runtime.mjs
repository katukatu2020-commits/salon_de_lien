import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const marker = 'style-admin-post-controls-v625'
const changes = []

function replaceExact(file, before, after, expected, label) {
  const target = path.join(root, file)
  const source = fs.readFileSync(target, 'utf8')
  const count = source.split(before).length - 1
  if (count !== expected) throw new Error(`${label}: expected ${expected} matches, found ${count}`)
  fs.writeFileSync(target, source.split(before).join(after))
  changes.push({ file, label, count })
}

function normalizeClientBoundary() {
  const file = 'public/style-admin-controls-v618.js'
  const target = path.join(root, file)
  const source = fs.readFileSync(target, 'utf8')
  const broken = `/* ${marker} */\n(() => {`
  const fixed = `/* ${marker} */\n;(() => {`
  const brokenCount = source.split(broken).length - 1
  const fixedCount = source.split(fixed).length - 1

  if (brokenCount === 1 && fixedCount === 0) {
    fs.writeFileSync(target, source.replace(broken, fixed))
  } else if (brokenCount === 0 && fixedCount === 1) {
    fs.writeFileSync(target, source)
  } else {
    throw new Error(`normalize controls boundary: expected one broken or fixed marker, found ${brokenCount}/${fixedCount}`)
  }
  changes.push({ file, label: 'normalize controls boundary', count: 1 })
}

normalizeClientBoundary()
replaceExact(
  'public/style-admin-controls-v618.js',
  '    void enhanceDetail()',
  "    document.querySelectorAll('.orimia-style-detail-controls-v625').forEach(panel => panel.remove())",
  1,
  'preserve the existing detail management controls',
)
replaceExact(
  'server.js',
  '/style-admin-controls-v618.js?v=625-post-controls2',
  '/style-admin-controls-v618.js?v=625-post-controls3',
  1,
  'style controls client hotfix cache key',
)

fs.writeFileSync('/tmp/style-admin-post-controls-v625-changes.json', JSON.stringify(changes))
console.log(JSON.stringify({ release: marker, modified: [...new Set(changes.map(change => change.file))] }))
