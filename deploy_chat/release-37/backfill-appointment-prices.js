const { PrismaClient } = require('@prisma/client')

function ensureDatabaseUrl() {
  if (process.env.DATABASE_URL) return
  const required = ['DB_USER', 'DB_PASSWORD', 'DB_HOST', 'DB_NAME']
  const missing = required.filter((key) => !process.env[key])
  if (missing.length) throw new Error(`database configuration is missing: ${missing.join(', ')}`)
  process.env.DATABASE_URL = `postgresql://${encodeURIComponent(process.env.DB_USER)}:${encodeURIComponent(process.env.DB_PASSWORD)}@${process.env.DB_HOST}:${process.env.DB_PORT || '5432'}/${process.env.DB_NAME}?schema=${process.env.DB_SCHEMA || 'public'}`
}

function normalizeMenu(value) {
  return String(value || '')
    .normalize('NFKC')
    .split(/\s*\/\s*クーポン\s*:/)[0]
    .replace(/^\s*\d+\s*[.．]\s*/, '')
    .replace(/[+＋]/g, '+')
    .replace(/[（]/g, '(')
    .replace(/[）]/g, ')')
    .replace(/\s+/g, '')
    .toLowerCase()
}

function inlinePrice(value) {
  const amounts = Array.from(
    String(value || '').normalize('NFKC').matchAll(/(?:[¥￥]\s*([\d,]+)|([\d,]+)\s*円)/g),
    (match) => Number((match[1] || match[2]).replace(/,/g, '')),
  ).filter((amount) => Number.isSafeInteger(amount) && amount > 0)
  return amounts.at(-1) || null
}

async function main() {
  ensureDatabaseUrl()
  const apply = process.argv.includes('--apply')
  const prisma = new PrismaClient()
  try {
    const organizationId = process.env.GMAIL_SYNC_ORGANIZATION_ID || process.env.DEFAULT_ORGANIZATION_ID || 'org_salon_de_lien'
    const [appointments, menus] = await Promise.all([
      prisma.appointment.findMany({
        where: {
          OR: [{ estimatedPrice: null }, { estimatedPrice: 0 }],
          status: { notIn: ['キャンセル', '無断キャンセル'] },
          customer: { organizationId, deletedAt: null },
        },
        select: { id: true, menu: true, status: true, scheduledAt: true, estimatedPrice: true },
        orderBy: { scheduledAt: 'asc' },
      }),
      prisma.$queryRawUnsafe(
        'SELECT "name","priceYen" FROM "SalonMenu" WHERE "organizationId"=$1 AND "active"=true AND "priceYen">0',
        organizationId,
      ),
    ])

    const catalog = new Map(menus.map((menu) => [normalizeMenu(menu.name), menu.priceYen]))
    const decisions = appointments.map((appointment) => {
      const fromInline = inlinePrice(appointment.menu)
      const fromCatalog = catalog.get(normalizeMenu(appointment.menu)) || null
      const price = fromInline || fromCatalog
      return {
        id: appointment.id,
        scheduledAt: appointment.scheduledAt.toISOString(),
        status: appointment.status,
        menu: appointment.menu,
        price,
        source: fromInline ? 'inline_currency' : fromCatalog ? 'salon_menu_exact' : 'unresolved',
      }
    })

    if (apply) {
      await prisma.$transaction(
        decisions.filter((item) => item.price).map((item) =>
          prisma.appointment.update({
            where: { id: item.id },
            data: { estimatedPrice: item.price },
          }),
        ),
      )
    }

    const unresolved = decisions.filter((item) => !item.price)
    console.log(JSON.stringify({
      mode: apply ? 'apply' : 'dry-run',
      organizationId,
      candidates: decisions.length,
      resolved: decisions.length - unresolved.length,
      unresolved: unresolved.length,
      decisions,
    }, null, 2))
    if (unresolved.length) process.exitCode = 2
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error(error.stack || error)
  process.exitCode = 1
})
