const fs = require('fs')
const path = require('path')

const appRoot = process.env.APP_ROOT || '/app'
const roots = [`${appRoot}/.next/server`, `${appRoot}/.next/static`]
let count = 0
const changedStaticFiles = []

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(file)
    else if (entry.isFile() && file.endsWith('.js')) patch(file)
  }
}

function patch(file) {
  let source = fs.readFileSync(file, 'utf8')
  const before = source
  source = source.replaceAll('href:"/u/appointments",label:"予約"', 'href:"/u/appointments",label:"予約・チャット相談"')
  source = source.replace(/(href:\s*["']\/u\/appointments["'][\s\S]{0,240}?label:\s*)["'][^"']+["']/g, (_all, prefix) => {
    count += 1
    return `${prefix}"予約・チャット相談"`
  })
  if (source !== before) {
    fs.writeFileSync(file, source)
    count += 1
    if (file.startsWith(`${appRoot}/.next/static/`)) changedStaticFiles.push(file)
  }
}

for (const root of roots) walk(root)
for (const file of changedStaticFiles) {
  const renamed = file.replace(/\.js$/, '.unified-reservation-chat.js')
  fs.renameSync(file, renamed)
  replaceReferences(`${appRoot}/.next`, path.basename(file), path.basename(renamed))
}
console.log(JSON.stringify({ unifiedCustomerNavigation: count }))
if (!count) process.exit(1)

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
