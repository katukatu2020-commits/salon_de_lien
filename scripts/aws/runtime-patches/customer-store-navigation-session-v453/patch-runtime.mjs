import fs from 'node:fs'
import path from 'node:path'

const serverRoot = '/app/.next/server'
const expectedModuleCount = 14

const linkedStoreModule = `65051:(e,t,r)=>{"use strict";r.d(t,{j:()=>i});var n=r(71615),a=r(13538),o=r(60055);async function i(){let e=await(0,o.ib)(n.cookies().get(o.fh)?.value,(0,o.LD)());if(!e)return null;let[t]=await a._.$queryRawUnsafe(\`SELECT c."id",c."name" FROM "AppUser" u JOIN "Customer" c ON c."id"=$3 AND c."organizationId"=$4 AND c."deletedAt" IS NULL LEFT JOIN "CustomerStoreLink" l ON l."appUserId"=u."id" AND l."organizationId"=c."organizationId" AND l."customerId"=c."id" WHERE u."id"=$1 AND LOWER(COALESCE(NULLIF(u."loginId",''),u."email"))=$2 AND u."role"='CUSTOMER' AND u."active"=TRUE AND ((u."customerId"=c."id" AND u."organizationId"=c."organizationId") OR l."id" IS NOT NULL) LIMIT 1\`,e.userId,e.subject,e.customerId,e.organizationId);return t?{...e,customer:t}:null}}`

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
  if (arrowIndex < 0 || openingBrace < 0 || openingBrace - markerIndex > 120) {
    throw new Error(`module 65051 could not be parsed at offset ${markerIndex}`)
  }

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
    if (character === '}') {
      depth -= 1
      if (depth === 0) return index
    }
  }

  throw new Error(`module 65051 has no closing brace at offset ${markerIndex}`)
}

let moduleCount = 0
let directStoreCount = 0
let linkedStoreCount = 0
const changedFiles = []

for (const filePath of javascriptFiles(serverRoot)) {
  let source = fs.readFileSync(filePath, 'utf8')
  const markers = [...source.matchAll(/65051\s*:/g)].map((match) => match.index)
  if (markers.length === 0) continue

  for (const markerIndex of [...markers].reverse()) {
    const endIndex = moduleEnd(source, markerIndex)
    const currentModule = source.slice(markerIndex, endIndex + 1)
    const isDirect = currentModule.includes('.appUser.findFirst')
    const isLinked = currentModule.includes('LEFT JOIN "CustomerStoreLink" l')
    if (!isDirect && !isLinked) {
      throw new Error(`${filePath}: module 65051 is not the expected customer-session resolver`)
    }
    directStoreCount += Number(isDirect)
    linkedStoreCount += Number(isLinked)
    moduleCount += 1
    source = `${source.slice(0, markerIndex)}${linkedStoreModule}${source.slice(endIndex + 1)}`
  }

  fs.writeFileSync(filePath, source)
  changedFiles.push(filePath)
}

if (moduleCount !== expectedModuleCount) {
  throw new Error(`expected ${expectedModuleCount} customer-session modules, found ${moduleCount}`)
}
if (directStoreCount !== 11 || linkedStoreCount !== 3) {
  throw new Error(`unexpected parent state: direct=${directStoreCount}, linked=${linkedStoreCount}`)
}

console.log(`customer store navigation session v453 patched ${moduleCount} modules in ${changedFiles.length} files`)
