'use strict'

function dayRange(value) {
  const date = String(value || '')
  if (!/^20\d{2}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) {
    throw Object.assign(new Error('日付を正しく選択してください。'), { status: 400 })
  }
  const start = new Date(date + 'T00:00:00+09:00')
  return { date, start, end: new Date(start.getTime() + 86400000) }
}

function createCalendarDay(db) {
  return async (session, query) => {
    const { date, start, end } = dayRange(query.get('date'))
    // Orders use the dealer cutoff business date; activities use their real JST interval.
    const orderWhere = `FROM "WholesaleOrder" o
      WHERE o."dealerId"=$1 AND o."status"<>'CANCELLED'
      AND COALESCE(o."businessDate",(o."orderedAt" AT TIME ZONE 'Asia/Tokyo')::date)=$2::date
      AND ($3::text IS NULL OR o."salesMemberId"=$3)`
    const orderArgs = [session.id, date, session.role === 'ADMIN' ? null : session.memberId]
    const activityWhere = `FROM "DealerErpActivity" a
      WHERE a."dealerId"=$1 AND a."endsAt">$2 AND a."startsAt"<$3
      AND ($4::boolean OR a."memberId"=$5 OR a."visibility"='DEALER'
        OR (a."visibility"='BRANCH' AND a."branchId"=$6))`
    const activityArgs = [session.id, start, end, session.role === 'ADMIN', session.memberId, session.branchId || null]
    // One snapshot keeps summary totals and paginated rows consistent during concurrent orders.
    return db.$transaction(async tx => {
      const [totals] = await tx.$queryRawUnsafe(`SELECT COUNT(*)::int AS total,COALESCE(SUM(o."totalYen"),0)::bigint AS "forecastYen" ${orderWhere}`, ...orderArgs)
      const [schedule] = await tx.$queryRawUnsafe(`SELECT COUNT(*)::int AS total,COUNT(*) FILTER (WHERE a."status"<>'CANCELLED')::int AS "activeCount" ${activityWhere}`, ...activityArgs)
      const paging = (key, total) => {
        const pages = Math.max(1, Math.ceil(total / 30))
        const page = Math.min(pages, Math.max(1, Number.parseInt(query.get(key), 10) || 1))
        return { total, page, pages }
      }
      const orders = paging('orderPage', totals.total), activities = paging('activityPage', schedule.total)
      orders.forecastYen = Number(totals.forecastYen)
      activities.activeCount = schedule.activeCount
      orders.rows = await tx.$queryRawUnsafe(`SELECT o."id",o."orderNo",o."orderedAt",o."totalYen",o."status",
        org."name" AS salon,m."name" AS member,b."name" AS branch
        FROM (${`SELECT o.* ${orderWhere}`}) o
        JOIN "Organization" org ON org."id"=o."organizationId"
        LEFT JOIN "DealerSalesMember" m ON m."id"=o."salesMemberId" AND m."dealerId"=o."dealerId"
        LEFT JOIN "DealerSalesBranch" b ON b."id"=o."salesBranchId" AND b."dealerId"=o."dealerId"
        ORDER BY o."orderedAt",o."id" LIMIT 30 OFFSET $4`, ...orderArgs, (orders.page - 1) * 30)
      activities.rows = await tx.$queryRawUnsafe(`SELECT a."id",a."title",a."kind",a."status",a."startsAt",a."endsAt",a."note",a."result",
        m."name" AS member,org."name" AS salon,b."name" AS branch
        FROM (${`SELECT a.* ${activityWhere}`}) a
        JOIN "DealerSalesMember" m ON m."id"=a."memberId" AND m."dealerId"=a."dealerId"
        LEFT JOIN "Organization" org ON org."id"=a."organizationId"
        LEFT JOIN "DealerSalesBranch" b ON b."id"=a."branchId" AND b."dealerId"=a."dealerId"
        ORDER BY a."startsAt",a."id" LIMIT 30 OFFSET $7`, ...activityArgs, (activities.page - 1) * 30)
      return { date, orders, activities }
    }, { isolationLevel: 'RepeatableRead' })
  }
}
module.exports = { dayRange, createCalendarDay }
