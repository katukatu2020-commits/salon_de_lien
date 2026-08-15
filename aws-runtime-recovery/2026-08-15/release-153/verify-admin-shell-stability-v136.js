'use strict'

const fs = require('fs')
const path = require('path')
const { marker, headerVisibilityOverride, override, firstPaintChrome, collisionProofHeader, firstPaintDark, themeModalCss } = require('./patch-admin-shell-stability-v136')
const appRoot = process.env.APP_ROOT || '/app'
const cssRoot = path.join(appRoot, '.next', 'static', 'css')

function walk(root) {
  if (!fs.existsSync(root)) return []
  return fs.readdirSync(root, { withFileTypes: true }).flatMap(entry => {
    const target = path.join(root, entry.name)
    return entry.isDirectory() ? walk(target) : [target]
  })
}

const matched = walk(cssRoot).filter(file => file.endsWith('.css')).filter(file => {
  const source = fs.readFileSync(file, 'utf8')
  return source.includes(marker) && source.includes(headerVisibilityOverride) && source.includes(override) && source.includes(firstPaintChrome) && source.includes(collisionProofHeader) && source.includes(firstPaintDark) && source.includes(themeModalCss)
})
if (!matched.length) throw new Error('admin shell stability CSS override is missing')
console.log(JSON.stringify({ marker, files: matched.map(file => path.relative(appRoot, file)) }))
