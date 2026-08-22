import fs from 'node:fs'
import path from 'node:path'

const pageDirectory = '/app/.next/static/chunks/app/u/(account)/appointments'
const previousPageName = fs.readdirSync(pageDirectory).find(name => /^page-.*\.js$/.test(name))
if (!previousPageName) throw new Error('appointments client chunk was not found')
const currentPageName = previousPageName.replace(/\.js$/, '.current-cancel-v374.js')
const previousPagePath = path.join(pageDirectory, previousPageName)
const currentPagePath = path.join(pageDirectory, currentPageName)
const page = fs.readFileSync(previousPagePath, 'utf8')
if (!page.includes('data-customer-appointment-id')) throw new Error('appointments client chunk lacks appointment identity')
fs.writeFileSync(currentPagePath, page)

function replaceManifestChunkReference(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      replaceManifestChunkReference(target)
      continue
    }
    if (!entry.isFile() || !/\.(?:json|js)$/.test(entry.name)) continue
    let source = fs.readFileSync(target, 'utf8')
    if (!source.includes(previousPageName)) continue
    source = source.split(previousPageName).join(currentPageName)
    fs.writeFileSync(target, source)
  }
}

replaceManifestChunkReference('/app/.next')
