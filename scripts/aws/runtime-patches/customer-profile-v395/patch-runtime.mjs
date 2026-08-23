import fs from 'node:fs'
import path from 'node:path'

const serverPath = '/app/server.js'
const customerStorePath = '/app/customer-store-staff-v276.js'
const oldAsset = '/customer-experience-v278.js'
const newAsset = '/customer-experience-v395.js'
const customerChunkDirectory = '/app/.next/static/chunks/app/u/(account)'
const oldLayoutChunkName = 'layout-customer-chat-v393.js'
const newLayoutChunkName = 'layout-customer-profile-v395.js'

function replaceAllChecked(filePath, before, after, minimum, label) {
  let source = fs.readFileSync(filePath, 'utf8')
  const count = source.split(before).length - 1
  if (count < minimum) throw new Error(`${label}: expected at least ${minimum} matches, found ${count}`)
  source = source.split(before).join(after)
  fs.writeFileSync(filePath, source)
  return count
}

replaceAllChecked(serverPath, oldAsset, newAsset, 2, 'customer script references')
replaceAllChecked(customerStorePath, oldAsset, newAsset, 2, 'customer script route')
replaceAllChecked(customerStorePath, 'customer-experience-v278.js', 'customer-experience-v395.js', 1, 'customer script file')

const oldLayoutChunkPath = path.join(customerChunkDirectory, oldLayoutChunkName)
const newLayoutChunkPath = path.join(customerChunkDirectory, newLayoutChunkName)
let layoutChunk = fs.readFileSync(oldLayoutChunkPath, 'utf8')
const experienceCount = layoutChunk.split('customer-experience-v278.js').length - 1
if (experienceCount < 1) throw new Error(`customer layout experience reference: expected a match, found ${experienceCount}`)
layoutChunk = layoutChunk.split('customer-experience-v278.js').join('customer-experience-v395.js')
fs.writeFileSync(newLayoutChunkPath, layoutChunk)

function replaceGeneratedReferences(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      replaceGeneratedReferences(target)
      continue
    }
    if (!entry.isFile() || !/\.(?:json|js)$/.test(entry.name)) continue
    let source = fs.readFileSync(target, 'utf8')
    if (!source.includes(oldLayoutChunkName)) continue
    source = source.split(oldLayoutChunkName).join(newLayoutChunkName)
    fs.writeFileSync(target, source)
  }
}

replaceGeneratedReferences('/app/.next')
