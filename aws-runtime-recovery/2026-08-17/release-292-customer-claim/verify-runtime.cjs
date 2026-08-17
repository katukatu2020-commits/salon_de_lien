'use strict'

const fs = require('fs')
const path = require('path')

const root = process.argv[2] ? path.resolve(process.argv[2]) : '/app'
const actionChunkPath = path.join(root, '.next/server/chunks/2241.js')
const source = fs.readFileSync(actionChunkPath, 'utf8')

const required = [
  'provisionalCandidates=await t.customer.findMany',
  'sourceCustomerId="string"==typeof ea&&ea.startsWith("customer:")',
  'normalizeClaimName(e.name)===normalizeClaimName(f)',
  'await t.appUser.updateMany({where:{customerId:duplicateCustomerId}',
  'await t.customer.delete({where:{id:duplicateCustomerId}})',
]

for (const marker of required) {
  if (!source.includes(marker)) throw new Error(`Missing runtime marker: ${marker}`)
}

if (source.split('provisionalCandidates=await t.customer.findMany').length - 1 !== 1) {
  throw new Error('Customer claim patch must exist exactly once.')
}

new Function(source)
console.log('Release 292 runtime verification passed.')
