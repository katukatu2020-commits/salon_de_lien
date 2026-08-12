const fs = require('fs')
const path = require('path')

const roots = ['/app/.next/server', '/app/.next/static']
const routes = [
  { from: '/admin/appointments', to: '/admin/chat', label: 'チャット' },
  { from: '/u/appointments', to: '/u/chat', label: 'チャット相談' },
]
const totals = Object.fromEntries(routes.map(route => [route.to, 0]))
const changedFiles = []

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(file)
    else if (entry.isFile() && file.endsWith('.js')) patch(file)
  }
}

function patch(file) {
  let source = fs.readFileSync(file, 'utf8')
  let changed = false
  for (const route of routes) {
    if (!source.includes(route.from)) continue
    const escaped = route.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const pattern = new RegExp(`(\\{\\s*href:\\s*["']${escaped}["'][\\s\\S]{0,500}?icon:\\s*([^,}\\n]+)[\\s\\S]{0,100}?\\})`)
    const match = source.match(pattern)
    if (!match) continue
    const item = `{href:"${route.to}",label:"${route.label}",icon:${match[2].trim()}}`
    source = source.replace(pattern, `$1,${item}`)
    totals[route.to] += 1
    changed = true
  }
  if (changed) { fs.writeFileSync(file, source); changedFiles.push(file) }
}

for (const root of roots) walk(root)
for (const file of changedFiles.filter(file => file.startsWith('/app/.next/static/'))) {
  const renamed = file.replace(/\.js$/, '.chatnav.js')
  fs.renameSync(file, renamed)
  const oldName = path.basename(file), newName = path.basename(renamed)
  for (const root of ['/app/.next']) replaceReferences(root, oldName, newName)
}
console.log(JSON.stringify(totals))
if (!totals['/admin/chat'] || !totals['/u/chat']) process.exit(1)

function replaceReferences(dir, oldName, newName) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name)
    if (entry.isDirectory()) replaceReferences(file, oldName, newName)
    else if (entry.isFile() && /\.(js|json|html)$/.test(file)) {
      const source = fs.readFileSync(file, 'utf8')
      if (source.includes(oldName)) fs.writeFileSync(file, source.split(oldName).join(newName))
    }
  }
}
