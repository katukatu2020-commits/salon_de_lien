import fs from 'node:fs'

const schemaPath = '/app/prisma/schema.prisma'
const source = fs.readFileSync(schemaPath, 'utf8')
const modelPattern = /model VisitCommunityPost \{[\s\S]*?\n\}/
const match = source.match(modelPattern)

if (!match) throw new Error('VisitCommunityPost model was not found in the runtime Prisma schema')

let model = match[0]

model = model
  .replace(/^(\s*customerId\s+)String(\s*)$/m, '$1String?$2')
  .replace(/^(\s*visitId\s+)String(\s+@unique\s*)$/m, '$1String?$2')
  .replace(/^(\s*customer\s+)Customer(\s+@relation\()/m, '$1Customer?$2')
  .replace(/^(\s*visit\s+)Visit(\s+@relation\()/m, '$1Visit?$2')

if (!model.includes('postKind')) {
  const visitLine = /^(\s*visitId\s+String\?\s+@unique\s*)$/m
  if (!visitLine.test(model)) throw new Error('VisitCommunityPost.visitId insertion point was not found')
  model = model.replace(
    visitLine,
    `$1\n  postKind            String    @default("VISIT")\n  caption             String?\n  photoReferences     String[]  @default([])\n  publishedByName     String?`,
  )
}

const requiredMarkers = [
  'customerId           String?',
  'visitId              String',
  'postKind',
  'caption',
  'photoReferences',
  'publishedByName',
  'customer     Customer?',
  'visit        Visit?',
]

for (const marker of requiredMarkers) {
  if (!model.includes(marker)) throw new Error(`VisitCommunityPost schema marker is missing: ${marker}`)
}

fs.writeFileSync(schemaPath, source.replace(modelPattern, model))
