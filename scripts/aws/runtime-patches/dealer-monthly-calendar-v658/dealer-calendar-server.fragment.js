  function currentDealerMonthKey(now = new Date()) {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: '2-digit',
    }).formatToParts(now)
    const year = parts.find(part => part.type === 'year')?.value
    const month = parts.find(part => part.type === 'month')?.value
    return `${year}-${month}`
  }
  function normalizeDealerMonthKey(value) {
    const monthKey = String(value || '').trim() || currentDealerMonthKey()
    const match = monthKey.match(/^(\d{4})-(0[1-9]|1[0-2])$/)
    if (!match) throw new WholesaleError('対象月を確認してください。')
    const year = Number(match[1])
    if (year < 2000 || year > 2100) throw new WholesaleError('対象月を確認してください。')
    return monthKey
  }

  function dealerMonthRange(monthKey) {
    const [year, month] = monthKey.split('-').map(Number)
    const startUtc = new Date(Date.UTC(year, month - 1, 1, -9)).toISOString()
    const endUtc = new Date(Date.UTC(year, month, 1, -9)).toISOString()
    return { year, month, startUtc, endUtc }
  }

  function dealerCalendarInteger(value, label, maximum) {
    const text = String(value == null ? '' : value).replace(/[,\s]/g, '')
    const number = text === '' ? 0 : Number(text)
    if (!Number.isSafeInteger(number) || number < 0 || number > maximum) {
      throw new WholesaleError(`${label}を0〜${maximum.toLocaleString('ja-JP')}の整数で入力してください。`)
    }
    return number
  }

  async function dealerCalendarPayload(session, requestedMonth) {
    const monthKey = normalizeDealerMonthKey(requestedMonth)
    const range = dealerMonthRange(monthKey)
    const [dailyRows, planRows] = await Promise.all([
      prisma.$queryRawUnsafe(
        `SELECT TO_CHAR(o."orderedAt" AT TIME ZONE 'Asia/Tokyo','YYYY-MM-DD') AS "dayKey",
                COUNT(*)::int AS "invoiceCount",
                COALESCE(SUM(o."totalYen"),0)::bigint AS "forecastYen"
           FROM "WholesaleOrder" o
          WHERE o."dealerId"=$1
            AND o."status"<>'CANCELLED'
            AND o."orderedAt">=$2::timestamptz
            AND o."orderedAt"<$3::timestamptz
          GROUP BY 1
          ORDER BY 1`,
        session.id,
        range.startUtc,
        range.endUtc,
      ),
      prisma.$queryRawUnsafe(
        `SELECT "salesTargetYen","newAcquisitionCount","updatedAt"
           FROM "WholesaleDealerMonthlyPlan"
          WHERE "dealerId"=$1 AND "monthKey"=$2
          LIMIT 1`,
        session.id,
        monthKey,
      ),
    ])
    const days = dailyRows.map(row => ({
      date: String(row.dayKey),
      invoiceCount: Number(row.invoiceCount || 0),
      forecastYen: Number(row.forecastYen || 0),
    }))
    const plan = planRows[0] || {}
    return {
      calendar: {
        monthKey,
        year: range.year,
        month: range.month,
        invoiceCount: days.reduce((sum, day) => sum + day.invoiceCount, 0),
        monthlyForecastYen: days.reduce((sum, day) => sum + day.forecastYen, 0),
        salesTargetYen: Number(plan.salesTargetYen || 0),
        newAcquisitionCount: Number(plan.newAcquisitionCount || 0),
        updatedAt: plan.updatedAt || null,
        days,
      },
    }
  }

  async function saveDealerCalendarPlan(session, payload) {
    const monthKey = normalizeDealerMonthKey(payload.monthKey)
    const salesTargetYen = dealerCalendarInteger(payload.salesTargetYen, '目標売上', 1000000000000)
    const newAcquisitionCount = dealerCalendarInteger(payload.newAcquisitionCount, '新規獲得件数', 999999)
    await prisma.$executeRawUnsafe(
      `INSERT INTO "WholesaleDealerMonthlyPlan" ("dealerId","monthKey","salesTargetYen","newAcquisitionCount","createdAt","updatedAt")
       VALUES ($1,$2,$3,$4,NOW(),NOW())
       ON CONFLICT ("dealerId","monthKey") DO UPDATE
       SET "salesTargetYen"=EXCLUDED."salesTargetYen",
           "newAcquisitionCount"=EXCLUDED."newAcquisitionCount",
           "updatedAt"=NOW()`,
      session.id,
      monthKey,
      salesTargetYen,
      newAcquisitionCount,
    )
    return dealerCalendarPayload(session, monthKey)
  }
