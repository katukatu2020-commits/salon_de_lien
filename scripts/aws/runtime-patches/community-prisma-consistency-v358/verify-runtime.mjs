import fs from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire('/app/package.json')
const { Prisma } = require('@prisma/client')

function requireText(file, text, label) {
  const source = fs.readFileSync(file, 'utf8')
  if (!source.includes(text)) throw new Error(`${label} is missing from ${file}`)
}

const requiredCommunityFields = [
  'postKind',
  'caption',
  'photoReferences',
  'publishedByName',
]

for (const schemaPath of ['/app/prisma/schema.prisma', '/app/node_modules/.prisma/client/schema.prisma']) {
  for (const field of requiredCommunityFields) {
    requireText(schemaPath, field, `VisitCommunityPost.${field}`)
  }
  requireText(schemaPath, 'storeHiddenAt', 'Customer.storeHiddenAt regression guard')
}

const communityModel = Prisma.dmmf.datamodel.models.find(model => model.name === 'VisitCommunityPost')
if (!communityModel) throw new Error('VisitCommunityPost is missing from generated Prisma DMMF')

const generatedFields = new Map(communityModel.fields.map(field => [field.name, field]))
for (const fieldName of requiredCommunityFields) {
  if (!generatedFields.has(fieldName)) {
    throw new Error(`VisitCommunityPost.${fieldName} is missing from generated Prisma Client`)
  }
}
if (generatedFields.get('customerId')?.isRequired !== false) {
  throw new Error('VisitCommunityPost.customerId must be nullable for store-authored posts')
}
if (generatedFields.get('visitId')?.isRequired !== false) {
  throw new Error('VisitCommunityPost.visitId must be nullable for store-authored posts')
}

const customerModel = Prisma.dmmf.datamodel.models.find(model => model.name === 'Customer')
if (!customerModel?.fields.some(field => field.name === 'storeHiddenAt')) {
  throw new Error('Customer.storeHiddenAt was lost while regenerating Prisma Client')
}

const communityChunk = fs.readFileSync('/app/.next/server/chunks/9542.js', 'utf8')
for (const marker of ['postKind', 'photoReferences', 'publishedByName', 'caption']) {
  if (!communityChunk.includes(marker)) throw new Error(`community page query marker is missing: ${marker}`)
}

const entrypoint = fs.readFileSync('/usr/local/bin/lien-entrypoint', 'utf8')
if (!entrypoint.includes('ensure-community-schema.cjs') || !entrypoint.includes('lien-entrypoint-v357')) {
  throw new Error('community schema initializer is not chained before the existing entrypoint')
}

requireText(
  '/app/ensure-community-schema.cjs',
  'ADD COLUMN IF NOT EXISTS "postKind"',
  'community database schema initializer',
)
