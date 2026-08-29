import fs from 'node:fs'
import { spawnSync } from 'node:child_process'

const customerPageFile = '/app/.next/server/chunks/3244.js'
const source = fs.readFileSync(customerPageFile, 'utf8')

const assertions = [
  ['array registration-state check', 'el.appUsers.length === 0'],
  ['array email read', 'el.appUsers[0]?.email'],
]

for (const [label, marker] of assertions) {
  const matches = source.split(marker).length - 1
  if (matches !== 1) throw new Error(`${label}: expected one match, found ${matches}`)
}

const appUserInclude = /appUsers:\s*{\s*where:\s*{\s*role:\s*"CUSTOMER",\s*active:\s*!0\s*},\s*select:\s*{\s*id:\s*!0,\s*email:\s*!0\s*},?\s*}/m
if (!appUserInclude.test(source)) {
  throw new Error('active customer AppUser array include is missing')
}

for (const staleMarker of ['!el.appUsers', 'el.appUsers?.email']) {
  if (source.includes(staleMarker)) {
    throw new Error(`stale singular-relation access remains: ${staleMarker}`)
  }
}

const syntax = spawnSync(process.execPath, ['--check', customerPageFile], { encoding: 'utf8' })
if (syntax.status !== 0) {
  throw new Error(`${customerPageFile}: ${syntax.stderr || syntax.stdout}`)
}

console.log('customer registration email display v454 verified')
