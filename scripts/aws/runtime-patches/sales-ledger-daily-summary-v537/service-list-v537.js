'use strict'

/* service-list:start */
  async function listSales(req, res, url, session) {
    const start = localDate(url.searchParams.get('from'))
    const end = localDate(url.searchParams.get('to'), true)
    const customer = cleanText(url.searchParams.get('customer'), 100)
    const staff = cleanText(url.searchParams.get('staff'), 100)
    const keyword = cleanText(url.searchParams.get('keyword'), 120)
    const saleNo = cleanText(url.searchParams.get('saleNo'), 100)
    const appointmentNo = cleanText(url.searchParams.get('appointmentNo'), 100)
    const payment = cleanText(url.searchParams.get('payment'), 40)
    const rows = await prisma.$queryRawUnsafe(`SELECT s."id",s."paidAt",s."title",s."amount",s."paymentMethod",s."source",s."note",
        c."id" AS "customerId",c."name" AS "customerName",COALESCE(r."realName",c."name") AS "displayCustomerName",
        a."id" AS "appointmentId",a."scheduledAt",a."menu",a."staffName",a."bookingProvider",o."taxRate",
        COALESCE(lines."productTotal",0)::int AS "productTotal",COALESCE(lines."productCount",0)::int AS "productCount",COALESCE(lines."productLineCount",0)::int AS "productLineCount",
        COALESCE(points."pointDiscount",0)::int AS "pointDiscount",
        COALESCE(audits."auditCount",0)::int AS "auditCount",audits."lastCorrectedAt"
      FROM "ServiceSale" s
      JOIN "Customer" c ON c."id"=s."customerId"
      JOIN "Organization" o ON o."id"=c."organizationId"
      LEFT JOIN "CustomerRealName" r ON r."customerId"=c."id" AND r."organizationId"=c."organizationId"
      LEFT JOIN "Appointment" a ON a."id"=s."appointmentId"
      LEFT JOIN LATERAL (SELECT COALESCE(SUM(l."lineTotal"),0)::int AS "productTotal",COALESCE(SUM(l."quantity"),0)::int AS "productCount",COUNT(*)::int AS "productLineCount" FROM "ProductSaleLine" l WHERE l."serviceSaleId"=s."id") lines ON TRUE
      LEFT JOIN LATERAL (SELECT COALESCE(SUM(CASE WHEN p."type"='redeem' THEN ABS(p."amount") ELSE 0 END),0)::int AS "pointDiscount" FROM "PointTransaction" p WHERE p."customerId"=c."id" AND p."sourceId"=a."id" AND p."sourceType" IN ('checkout','appointment_checkout')) points ON TRUE
      LEFT JOIN LATERAL (SELECT COUNT(*)::int AS "auditCount",MAX(x."createdAt") AS "lastCorrectedAt" FROM "SalesCorrectionAudit" x WHERE x."organizationId"=c."organizationId" AND x."serviceSaleId"=s."id") audits ON TRUE
      WHERE c."organizationId"=$1 AND c."deletedAt" IS NULL
        AND ($2::timestamptz IS NULL OR s."paidAt">=$2::timestamptz)
        AND ($3::timestamptz IS NULL OR s."paidAt"<=$3::timestamptz)
        AND ($4='' OR COALESCE(r."realName",c."name") ILIKE '%'||$4||'%' OR c."name" ILIKE '%'||$4||'%')
        AND ($5='' OR COALESCE(a."staffName",'')=$5)
        AND ($6='' OR s."title" ILIKE '%'||$6||'%' OR COALESCE(s."note",'') ILIKE '%'||$6||'%' OR COALESCE(a."menu",'') ILIKE '%'||$6||'%')
        AND ($7='' OR s."id" ILIKE '%'||$7||'%')
        AND ($8='' OR COALESCE(a."id",'') ILIKE '%'||$8||'%')
        AND ($9='' OR COALESCE(s."paymentMethod",'')=$9)
      ORDER BY s."paidAt" DESC,s."id" DESC`,
      session.organizationId, start, end, customer, staff, keyword, saleNo, appointmentNo, payment)
    const staffRows = await prisma.$queryRawUnsafe('SELECT DISTINCT "staffName" FROM "Appointment" a JOIN "Customer" c ON c."id"=a."customerId" WHERE c."organizationId"=$1 AND a."staffName" IS NOT NULL AND BTRIM(a."staffName")<>\'\' ORDER BY "staffName"', session.organizationId)
    const paymentRows = await prisma.$queryRawUnsafe('SELECT DISTINCT s."paymentMethod" FROM "ServiceSale" s JOIN "Customer" c ON c."id"=s."customerId" WHERE c."organizationId"=$1 AND c."deletedAt" IS NULL AND s."paymentMethod" IS NOT NULL AND BTRIM(s."paymentMethod")<>\'\' ORDER BY s."paymentMethod"', session.organizationId)
    const numericRows = rows.map(row => ({
      ...row,
      amount: Number(row.amount),
      taxRate: Number(row.taxRate),
      productTotal: Number(row.productTotal),
      productCount: Number(row.productCount),
      productLineCount: Number(row.productLineCount),
      pointDiscount: Number(row.pointDiscount),
      auditCount: Number(row.auditCount),
    }))
    const report = salesSummary.summarizeSales(numericRows)
    json(res, 200, {
      rows: report.rows,
      summary: report.summary,
      staff: staffRows.map(row => row.staffName),
      paymentMethods: paymentRows.map(row => row.paymentMethod),
      count: report.rows.length,
      editable: true,
    })
  }
/* service-list:end */
