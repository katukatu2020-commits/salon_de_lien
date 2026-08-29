import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const serverRoot = process.env.LIEN_RUNTIME_ROOT || '/app/.next/server'
const expectedModuleCount = 14

function javascriptFiles(root) {
  const result = []
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const target = path.join(root, entry.name)
    if (entry.isDirectory()) result.push(...javascriptFiles(target))
    else if (target.endsWith('.js')) result.push(target)
  }
  return result
}

function moduleEnd(source, markerIndex) {
  const arrowIndex = source.indexOf('=>', markerIndex)
  const openingBrace = source.indexOf('{', arrowIndex + 2)
  let depth = 0
  let quote = null
  let escaped = false
  let lineComment = false
  let blockComment = false

  for (let index = openingBrace; index < source.length; index += 1) {
    const character = source[index]
    const next = source[index + 1]
    if (lineComment) {
      if (character === '\n') lineComment = false
      continue
    }
    if (blockComment) {
      if (character === '*' && next === '/') {
        blockComment = false
        index += 1
      }
      continue
    }
    if (quote) {
      if (escaped) escaped = false
      else if (character === '\\') escaped = true
      else if (character === quote) quote = null
      continue
    }
    if (character === '/' && next === '/') {
      lineComment = true
      index += 1
      continue
    }
    if (character === '/' && next === '*') {
      blockComment = true
      index += 1
      continue
    }
    if (character === "'" || character === '"' || character === '`') {
      quote = character
      continue
    }
    if (character === '{') depth += 1
    if (character === '}' && --depth === 0) return index
  }
  throw new Error(`module 65051 has no closing brace at offset ${markerIndex}`)
}

let moduleCount = 0
const moduleBodies = []
const filesToCheck = []

for (const filePath of javascriptFiles(serverRoot)) {
  const source = fs.readFileSync(filePath, 'utf8')
  const markers = [...source.matchAll(/65051\s*:/g)].map((match) => match.index)
  if (markers.length === 0) continue
  filesToCheck.push(filePath)
  for (const markerIndex of markers) {
    const body = source.slice(markerIndex, moduleEnd(source, markerIndex) + 1)
    moduleCount += 1
    moduleBodies.push(body)
    if (!body.includes('LEFT JOIN "CustomerStoreLink" l')) {
      throw new Error(`${filePath}: linked-store authorization is missing`)
    }
    if (body.includes('.appUser.findFirst')) {
      throw new Error(`${filePath}: direct-store-only authorization remains`)
    }
  }
}

if (moduleCount !== expectedModuleCount) {
  throw new Error(`expected ${expectedModuleCount} customer-session modules, found ${moduleCount}`)
}
if (new Set(moduleBodies).size !== 1) {
  throw new Error('customer-session module 65051 is not identical across route bundles')
}

for (const filePath of filesToCheck) {
  const syntax = spawnSync(process.execPath, ['--check', filePath], { encoding: 'utf8' })
  if (syntax.status !== 0) throw new Error(`${filePath}: ${syntax.stderr || syntax.stdout}`)
}

const appRoot = path.dirname(path.dirname(serverRoot))
const server = fs.readFileSync(path.join(appRoot, 'server.js'), 'utf8')
const links = fs.readFileSync(path.join(appRoot, 'customer-links-v293.js'), 'utf8')
if (!server.includes('LEFT JOIN "CustomerStoreLink" l')) {
  throw new Error('custom server linked-store authorization is missing')
}
if (links.includes('UPDATE "AppUser" SET "organizationId"=$1,"customerId"=$2')) {
  throw new Error('store switching still mutates the canonical AppUser record')
}

console.log(`customer store navigation session v453 verified (${moduleCount} identical modules)`)
