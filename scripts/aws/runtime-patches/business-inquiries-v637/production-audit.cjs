'use strict'

const crypto = require('node:crypto')
const { PrismaClient } = require('@prisma/client')
const { createBusinessInquiryService } = require('/app/business-inquiries-v637.js')

const prisma = new PrismaClient()

async function main() {
  const service = createBusinessInquiryService({ prisma, crypto })
  await service.ensureSchema()

  const columns = await prisma.$queryRawUnsafe(`
    SELECT column_name
      FROM information_schema.columns
     WHERE table_schema='public' AND table_name='BusinessInquiry'
  `)
  const names = new Set(columns.map(row => row.column_name))
  for (const name of ['id','requestKey','audience','organizationName','contactName','email','phone','preferredContact','message','sourcePath','status','operatorNote','createdAt','updatedAt']) {
    if (!names.has(name)) throw new Error('Missing BusinessInquiry.' + name)
  }

  const indexes = await prisma.$queryRawUnsafe(`
    SELECT indexname FROM pg_indexes
     WHERE schemaname='public' AND tablename='BusinessInquiry'
  `)
  const indexNames = new Set(indexes.map(row => row.indexname))
  for (const name of ['BusinessInquiry_requestKey_key','BusinessInquiry_status_createdAt_idx','BusinessInquiry_audience_createdAt_idx']) {
    if (!indexNames.has(name)) throw new Error('Missing index ' + name)
  }

  const marker = 'v637-audit-' + crypto.randomUUID()
  let rolledBack = false
  try {
    await prisma.$transaction(async tx => {
      const transactionalService = createBusinessInquiryService({ prisma: tx, crypto })
      const created = await transactionalService.createInquiry({
        audience: 'salon', organizationName: marker, contactName: '監査担当', email: marker + '@example.invalid', phone: null,
        preferredContact: 'email', message: '導入相談の保存経路を検証する監査データです。', sourcePath: '/business/salon',
      })
      if (!created.inserted) throw new Error('Audit inquiry was not inserted')
      const rows = await tx.$queryRawUnsafe('SELECT * FROM "BusinessInquiry" WHERE "id"=$1', created.id)
      if (rows.length !== 1 || rows[0].status !== 'new') throw new Error('Audit inquiry could not be read')
      if (!await transactionalService.updateInquiry({ id: created.id, status: 'in_progress', operatorNote: '監査中' })) throw new Error('Audit inquiry could not be updated')
      const updated = await tx.$queryRawUnsafe('SELECT "status","operatorNote" FROM "BusinessInquiry" WHERE "id"=$1', created.id)
      if (updated[0]?.status !== 'in_progress' || updated[0]?.operatorNote !== '監査中') throw new Error('Audit inquiry update was not persisted')
      throw new Error('BUSINESS_INQUIRY_AUDIT_ROLLBACK')
    })
  } catch (error) {
    if (error.message !== 'BUSINESS_INQUIRY_AUDIT_ROLLBACK') throw error
    rolledBack = true
  }
  if (!rolledBack) throw new Error('Audit transaction did not roll back')
  const remnants = await prisma.$queryRawUnsafe('SELECT COUNT(*)::int AS "count" FROM "BusinessInquiry" WHERE "organizationName"=$1', marker)
  if (Number(remnants[0]?.count || 0) !== 0) throw new Error('Audit inquiry was not rolled back')
  const invalid = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int AS "count" FROM "BusinessInquiry" WHERE "audience" NOT IN ('salon','dealer','other') OR "status" NOT IN ('new','in_progress','closed') OR "preferredContact" NOT IN ('email','phone','either')`)
  if (Number(invalid[0]?.count || 0) !== 0) throw new Error('Invalid inquiry state exists')

  const counts = await prisma.$queryRawUnsafe('SELECT COUNT(*)::int AS "total",COUNT(*) FILTER (WHERE "status"=\'new\')::int AS "newCount" FROM "BusinessInquiry"')
  console.log('BUSINESS_INQUIRY_AUDIT_V637 ' + JSON.stringify({ columns: names.size, indexes: indexNames.size, total: Number(counts[0]?.total || 0), newCount: Number(counts[0]?.newCount || 0), transactionalWriteVerified: true, rowsModified: 0 }))
}

main()
  .then(() => prisma.$disconnect())
  .catch(async error => {
    console.error('BUSINESS_INQUIRY_AUDIT_V637_FAILED ' + (error instanceof Error ? error.message : error))
    await prisma.$disconnect().catch(() => undefined)
    process.exit(1)
  })
