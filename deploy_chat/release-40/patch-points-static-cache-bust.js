const fs = require('fs')
const path = require('path')

const appRoot = process.env.APP_ROOT || '/app'
const oldChunk = 'static/chunks/app/u/(account)/points/page-d5be485caa1e3acb.js'
const newChunk = 'static/chunks/app/u/(account)/points/page-d5be485caa1e3acb-sms-off-v39.js'
const oldAbsolute = path.join(appRoot, '.next', oldChunk)
const newAbsolute = path.join(appRoot, '.next', newChunk)

if (!fs.existsSync(oldAbsolute)) {
  throw new Error(`points chunk not found: ${oldAbsolute}`)
}

fs.copyFileSync(oldAbsolute, newAbsolute)

for (const relative of [
  '.next/app-build-manifest.json',
  '.next/server/app/u/(account)/points/page_client-reference-manifest.js',
]) {
  const absolute = path.join(appRoot, relative)
  const source = fs.readFileSync(absolute, 'utf8')
  if (!source.includes(oldChunk)) {
    throw new Error(`points chunk reference not found: ${relative}`)
  }
  fs.writeFileSync(absolute, source.split(oldChunk).join(newChunk), 'utf8')
}

console.log(`cache-busted customer points asset: ${newChunk}`)
