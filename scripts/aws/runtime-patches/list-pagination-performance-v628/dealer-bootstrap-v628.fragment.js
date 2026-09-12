  async function dealerBootstrap(session, url) {
    const productPageMode = Boolean(url && url.searchParams.get('view') === 'products')
    const requestedProductPage = Math.max(1, Math.min(10000, Number.parseInt(String(url?.searchParams.get('productPage') || '1'), 10) || 1))
    const productSearch = String(url?.searchParams.get('productSearch') || '').normalize('NFKC').trim().slice(0, 180)
    const productResultPromise = productPageMode
      ? (async () => {
          const totals = await prisma.$queryRawUnsafe(
            `SELECT COUNT(*)::int AS "count"
               FROM "WholesaleDealerProduct"
              WHERE "dealerId"=$1 AND "active"=TRUE
                AND ($2='' OR CONCAT_WS(' ',"manufacturerName","name",COALESCE("category",''),"productCode",COALESCE("janCode",'')) ILIKE '%' || $2 || '%')`,
            session.id,
            productSearch,
          )
          const totalCount = Number(totals[0]?.count || 0)
          const totalPages = Math.max(1, Math.ceil(totalCount / DEALER_PRODUCT_PAGE_SIZE))
          const page = Math.min(requestedProductPage, totalPages)
          const products = await prisma.$queryRawUnsafe(
            `SELECT "id","manufacturerName","name","category","productCode","janCode","wholesalePrice","suggestedRetailPrice","orderUnit","description","active","createdAt","updatedAt"
               FROM "WholesaleDealerProduct"
              WHERE "dealerId"=$1 AND "active"=TRUE
                AND ($2='' OR CONCAT_WS(' ',"manufacturerName","name",COALESCE("category",''),"productCode",COALESCE("janCode",'')) ILIKE '%' || $2 || '%')
              ORDER BY "manufacturerName","name","id"
              LIMIT $3 OFFSET $4`,
            session.id,
            productSearch,
            DEALER_PRODUCT_PAGE_SIZE,
            (page - 1) * DEALER_PRODUCT_PAGE_SIZE,
          )
          return {
            products,
            pagination: { page, pageSize: DEALER_PRODUCT_PAGE_SIZE, totalCount, totalPages, query: productSearch },
          }
        })()
      : (async () => ({
          products: await prisma.$queryRawUnsafe(`SELECT "id","manufacturerName","name","category","productCode","janCode","wholesalePrice","suggestedRetailPrice","orderUnit","description","active","createdAt","updatedAt" FROM "WholesaleDealerProduct" WHERE "dealerId"=$1 ORDER BY "active" DESC,"manufacturerName","name"`, session.id),
          pagination: null,
        }))()

    const [contracts, orders, productResult, contractProductPrices] = await Promise.all([
      prisma.$queryRawUnsafe(`SELECT c."id",c."status",c."customerCode",c."createdAt",c."approvedAt",c."updatedAt",o."id" AS "organizationId",o."name" AS "organizationName",o."publicCode",p."phone",p."postalCode",p."prefecture",p."city",p."addressLine1",p."addressLine2" FROM "WholesaleDealerContract" c JOIN "Organization" o ON o."id"=c."organizationId" LEFT JOIN "OrganizationStoreProfile" p ON p."organizationId"=o."id" WHERE c."dealerId"=$1 ORDER BY CASE c."status" WHEN 'PENDING' THEN 0 WHEN 'ACTIVE' THEN 1 ELSE 2 END,c."updatedAt" DESC`, session.id),
      productPageMode
        ? Promise.resolve([])
        : prisma.$queryRawUnsafe(`SELECT o."id",o."orderNo",o."status",o."requestedDeliveryDate",o."orderedAt",o."acceptedAt",o."shippedAt",o."deliveredAt",o."deliveryNo",o."totalYen",org."name" AS "organizationName",COUNT(l."id")::int AS "lineCount",COALESCE(SUM(l."quantity"),0)::int AS "totalQuantity" FROM "WholesaleOrder" o JOIN "Organization" org ON org."id"=o."organizationId" LEFT JOIN "WholesaleOrderLine" l ON l."orderId"=o."id" WHERE o."dealerId"=$1 GROUP BY o."id",org."name" ORDER BY CASE o."status" WHEN 'ORDERED' THEN 0 WHEN 'ACCEPTED' THEN 1 WHEN 'SHIPPED' THEN 2 WHEN 'DELIVERED' THEN 3 ELSE 4 END,o."orderedAt" DESC LIMIT 200`, session.id),
      productResultPromise,
      productPageMode
        ? Promise.resolve([])
        : prisma.$queryRawUnsafe(`SELECT a."id",a."contractId",a."dealerProductId",a."discountRate",a."createdAt",a."updatedAt"
            FROM "WholesaleContractProductPrice" a
            JOIN "WholesaleDealerContract" c ON c."id"=a."contractId" AND c."dealerId"=$1
            JOIN "WholesaleDealerProduct" p ON p."id"=a."dealerProductId" AND p."dealerId"=$1
            WHERE a."active"=TRUE ORDER BY a."contractId",a."dealerProductId"`, session.id),
    ])
    return {
      dealer: { id: session.id, name: session.name, loginId: session.loginId, email: session.email || '', dealerCode: session.dealerCode },
      contracts,
      products: productResult.products.map(product => {
        const wholesalePrice = Number(product.wholesalePrice)
        const suggestedRetailPrice = product.suggestedRetailPrice == null ? null : Number(product.suggestedRetailPrice)
        return { ...product, wholesalePrice, suggestedRetailPrice, listPrice: suggestedRetailPrice == null ? wholesalePrice : suggestedRetailPrice, orderUnit: Number(product.orderUnit) }
      }),
      productPagination: productResult.pagination,
      contractProductPrices: contractProductPrices.map(price => ({ ...price, discountRate: Number(price.discountRate) })),
      orders: orders.map(order => ({ ...order, totalYen: Number(order.totalYen), lineCount: Number(order.lineCount), totalQuantity: Number(order.totalQuantity) })),
    }
  }
