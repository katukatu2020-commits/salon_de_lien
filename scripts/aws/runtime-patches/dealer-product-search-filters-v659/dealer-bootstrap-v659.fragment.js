  const dealerHalfKanaTokensV659 = [
    '｡','｢','｣','､','･','ｦ','ｧ','ｨ','ｩ','ｪ','ｫ','ｬ','ｭ','ｮ','ｯ','ｰ',
    'ｱ','ｲ','ｳ','ｴ','ｵ','ｶ','ｷ','ｸ','ｹ','ｺ','ｻ','ｼ','ｽ','ｾ','ｿ','ﾀ','ﾁ','ﾂ','ﾃ','ﾄ',
    'ﾅ','ﾆ','ﾇ','ﾈ','ﾉ','ﾊ','ﾋ','ﾌ','ﾍ','ﾎ','ﾏ','ﾐ','ﾑ','ﾒ','ﾓ','ﾔ','ﾕ','ﾖ','ﾗ','ﾘ',
    'ﾙ','ﾚ','ﾛ','ﾜ','ﾝ','ﾞ','ﾟ','ｳﾞ','ｶﾞ','ｷﾞ','ｸﾞ','ｹﾞ','ｺﾞ','ｻﾞ','ｼﾞ','ｽﾞ','ｾﾞ',
    'ｿﾞ','ﾀﾞ','ﾁﾞ','ﾂﾞ','ﾃﾞ','ﾄﾞ','ﾊﾞ','ﾋﾞ','ﾌﾞ','ﾍﾞ','ﾎﾞ','ﾊﾟ','ﾋﾟ','ﾌﾟ','ﾍﾟ','ﾎﾟ',
  ]
  const dealerHalfKanaMapV659 = new Map(dealerHalfKanaTokensV659.map(token => [token.normalize('NFKC'), token]))

  function dealerSearchVariantsV659(value) {
    const normalized = String(value || '').normalize('NFKC').replace(/[\s　]+/g, ' ').trim().slice(0, 180)
    if (!normalized) return []
    const katakana = normalized.replace(/[\u3041-\u3096]/g, char => String.fromCharCode(char.charCodeAt(0) + 0x60))
    const hiragana = katakana.replace(/[\u30a1-\u30f6]/g, char => String.fromCharCode(char.charCodeAt(0) - 0x60))
    const halfwidth = Array.from(katakana).map(char => dealerHalfKanaMapV659.get(char) || char).join('')
    const variants = [normalized, katakana, hiragana, halfwidth]
    for (const item of [...variants]) variants.push(item.replace(/[\s　]+/g, ''))
    return [...new Set(variants.filter(Boolean))]
  }

  function dealerFilterValueV659(value) {
    return String(value || '').replace(/[\r\n\t]/g, ' ').trim().slice(0, 140)
  }

  async function dealerBootstrap(session, url) {
    const requestedView = String(url?.searchParams.get('view') || '')
    const productPageMode = requestedView === 'products'
    const pricingPageMode = requestedView === 'pricing'
    const requestedProductPage = Math.max(1, Math.min(10000, Number.parseInt(String(url?.searchParams.get('productPage') || '1'), 10) || 1))
    const productSearch = String(url?.searchParams.get('productSearch') || '').trim().slice(0, 180)
    const productSearchTerms = JSON.stringify(dealerSearchVariantsV659(productSearch))
    const productManufacturer = dealerFilterValueV659(url?.searchParams.get('productManufacturer'))
    const productCategory = dealerFilterValueV659(url?.searchParams.get('productCategory'))
    const requestedPricingPage = Math.max(1, Math.min(10000, Number.parseInt(String(url?.searchParams.get('pricingPage') || '1'), 10) || 1))
    const pricingSearch = String(url?.searchParams.get('pricingSearch') || '').trim().slice(0, 180)
    const pricingSearchTerms = JSON.stringify(dealerSearchVariantsV659(pricingSearch))
    const pricingManufacturer = dealerFilterValueV659(url?.searchParams.get('pricingManufacturer'))
    const pricingCategory = dealerFilterValueV659(url?.searchParams.get('pricingCategory'))
    const requestedPricingContractId = String(url?.searchParams.get('contractId') || '').trim().slice(0, 180)

    const contracts = await prisma.$queryRawUnsafe(`SELECT c."id",c."status",c."customerCode",c."createdAt",c."approvedAt",c."updatedAt",o."id" AS "organizationId",o."name" AS "organizationName",o."publicCode",p."phone",p."postalCode",p."prefecture",p."city",p."addressLine1",p."addressLine2" FROM "WholesaleDealerContract" c JOIN "Organization" o ON o."id"=c."organizationId" LEFT JOIN "OrganizationStoreProfile" p ON p."organizationId"=o."id" WHERE c."dealerId"=$1 ORDER BY CASE c."status" WHEN 'PENDING' THEN 0 WHEN 'ACTIVE' THEN 1 ELSE 2 END,c."updatedAt" DESC`, session.id)
    const activeContracts = contracts.filter(contract => contract.status === 'ACTIVE')
    const pricingContract = pricingPageMode
      ? activeContracts.find(contract => contract.id === requestedPricingContractId) || activeContracts[0] || null
      : null

    const productResultPromise = productPageMode
      ? (async () => {
          const totals = await prisma.$queryRawUnsafe(
            `SELECT COUNT(*)::int AS "count"
               FROM "WholesaleDealerProduct"
              WHERE "dealerId"=$1 AND "active"=TRUE
                AND ($2::jsonb='[]'::jsonb OR EXISTS (
                  SELECT 1 FROM jsonb_array_elements_text($2::jsonb) AS terms("term")
                   WHERE CONCAT_WS(' ',"manufacturerName","name",COALESCE("category",''),"productCode",COALESCE("janCode",'')) ILIKE '%' || terms."term" || '%'
                ))
                AND ($3='' OR "manufacturerName"=$3)
                AND ($4='' OR COALESCE("category",'')=$4)`,
            session.id,
            productSearchTerms,
            productManufacturer,
            productCategory,
          )
          const totalCount = Number(totals[0]?.count || 0)
          const totalPages = Math.max(1, Math.ceil(totalCount / DEALER_PRODUCT_PAGE_SIZE))
          const page = Math.min(requestedProductPage, totalPages)
          const products = await prisma.$queryRawUnsafe(
            `SELECT "id","manufacturerName","name","category","productCode","janCode","wholesalePrice","suggestedRetailPrice","orderUnit","description","active","createdAt","updatedAt"
              FROM "WholesaleDealerProduct"
              WHERE "dealerId"=$1 AND "active"=TRUE
                AND ($2::jsonb='[]'::jsonb OR EXISTS (
                  SELECT 1 FROM jsonb_array_elements_text($2::jsonb) AS terms("term")
                   WHERE CONCAT_WS(' ',"manufacturerName","name",COALESCE("category",''),"productCode",COALESCE("janCode",'')) ILIKE '%' || terms."term" || '%'
                ))
                AND ($3='' OR "manufacturerName"=$3)
                AND ($4='' OR COALESCE("category",'')=$4)
              ORDER BY "manufacturerName","name","id"
              LIMIT $5 OFFSET $6`,
            session.id,
            productSearchTerms,
            productManufacturer,
            productCategory,
            DEALER_PRODUCT_PAGE_SIZE,
            (page - 1) * DEALER_PRODUCT_PAGE_SIZE,
          )
          return {
            products,
            productPagination: {
              page,
              pageSize: DEALER_PRODUCT_PAGE_SIZE,
              totalCount,
              totalPages,
              query: productSearch,
              manufacturer: productManufacturer,
              category: productCategory,
            },
            pricingPagination: null,
          }
        })()
      : pricingPageMode
        ? (async () => {
            const [totals, configuredTotals] = await Promise.all([
              prisma.$queryRawUnsafe(
                `SELECT COUNT(*)::int AS "totalProductCount",
                        (COUNT(*) FILTER (WHERE
                          ($2::jsonb='[]'::jsonb OR EXISTS (
                            SELECT 1 FROM jsonb_array_elements_text($2::jsonb) AS terms("term")
                             WHERE CONCAT_WS(' ',"manufacturerName","name",COALESCE("category",''),"productCode",COALESCE("janCode",'')) ILIKE '%' || terms."term" || '%'
                          ))
                          AND ($3='' OR "manufacturerName"=$3)
                          AND ($4='' OR COALESCE("category",'')=$4)
                        ))::int AS "count"
                   FROM "WholesaleDealerProduct"
                  WHERE "dealerId"=$1 AND "active"=TRUE`,
                session.id,
                pricingSearchTerms,
                pricingManufacturer,
                pricingCategory,
              ),
              pricingContract
                ? prisma.$queryRawUnsafe(
                    `SELECT COUNT(*)::int AS "count"
                       FROM "WholesaleContractProductPrice" a
                       JOIN "WholesaleDealerProduct" p ON p."id"=a."dealerProductId" AND p."dealerId"=$2 AND p."active"=TRUE
                      WHERE a."contractId"=$1 AND a."active"=TRUE`,
                    pricingContract.id,
                    session.id,
                  )
                : Promise.resolve([{ count: 0 }]),
            ])
            const totalCount = Number(totals[0]?.count || 0)
            const totalProductCount = Number(totals[0]?.totalProductCount || 0)
            const totalPages = Math.max(1, Math.ceil(totalCount / DEALER_PRICING_PAGE_SIZE))
            const page = Math.min(requestedPricingPage, totalPages)
            const products = await prisma.$queryRawUnsafe(
              `SELECT "id","manufacturerName","name","category","productCode","janCode","wholesalePrice","suggestedRetailPrice","orderUnit","description","active","createdAt","updatedAt"
                 FROM "WholesaleDealerProduct"
                WHERE "dealerId"=$1 AND "active"=TRUE
                  AND ($2::jsonb='[]'::jsonb OR EXISTS (
                    SELECT 1 FROM jsonb_array_elements_text($2::jsonb) AS terms("term")
                     WHERE CONCAT_WS(' ',"manufacturerName","name",COALESCE("category",''),"productCode",COALESCE("janCode",'')) ILIKE '%' || terms."term" || '%'
                  ))
                  AND ($3='' OR "manufacturerName"=$3)
                  AND ($4='' OR COALESCE("category",'')=$4)
                ORDER BY "manufacturerName","name","id"
                LIMIT $5 OFFSET $6`,
              session.id,
              pricingSearchTerms,
              pricingManufacturer,
              pricingCategory,
              DEALER_PRICING_PAGE_SIZE,
              (page - 1) * DEALER_PRICING_PAGE_SIZE,
            )
            return {
              products,
              productPagination: null,
              pricingPagination: {
                page,
                pageSize: DEALER_PRICING_PAGE_SIZE,
                totalCount,
                totalPages,
                totalProductCount,
                configuredCount: Number(configuredTotals[0]?.count || 0),
                query: pricingSearch,
                contractId: pricingContract?.id || '',
                manufacturer: pricingManufacturer,
                category: pricingCategory,
              },
            }
          })()
        : (async () => ({
            products: await prisma.$queryRawUnsafe(`SELECT "id","manufacturerName","name","category","productCode","janCode","wholesalePrice","suggestedRetailPrice","orderUnit","description","active","createdAt","updatedAt" FROM "WholesaleDealerProduct" WHERE "dealerId"=$1 ORDER BY "active" DESC,"manufacturerName","name"`, session.id),
            productPagination: null,
            pricingPagination: null,
          }))()

    const productFilterRowsPromise = productPageMode || pricingPageMode
      ? prisma.$queryRawUnsafe(
          `SELECT DISTINCT "manufacturerName",COALESCE("category",'') AS "category"
             FROM "WholesaleDealerProduct"
            WHERE "dealerId"=$1 AND "active"=TRUE
            ORDER BY "manufacturerName","category"`,
          session.id,
        )
      : Promise.resolve([])

    const [orders, productResult, productFilterRows] = await Promise.all([
      productPageMode || pricingPageMode
        ? Promise.resolve([])
        : prisma.$queryRawUnsafe(`SELECT o."id",o."orderNo",o."status",o."requestedDeliveryDate",o."orderedAt",o."acceptedAt",o."shippedAt",o."deliveredAt",o."deliveryNo",o."totalYen",org."name" AS "organizationName",COUNT(l."id")::int AS "lineCount",COALESCE(SUM(l."quantity"),0)::int AS "totalQuantity" FROM "WholesaleOrder" o JOIN "Organization" org ON org."id"=o."organizationId" LEFT JOIN "WholesaleOrderLine" l ON l."orderId"=o."id" WHERE o."dealerId"=$1 GROUP BY o."id",org."name" ORDER BY CASE o."status" WHEN 'ORDERED' THEN 0 WHEN 'ACCEPTED' THEN 1 WHEN 'SHIPPED' THEN 2 WHEN 'DELIVERED' THEN 3 ELSE 4 END,o."orderedAt" DESC LIMIT 200`, session.id),
      productResultPromise,
      productFilterRowsPromise,
    ])

    let contractProductPrices = []
    if (pricingPageMode && pricingContract && productResult.products.length) {
      contractProductPrices = await prisma.$queryRawUnsafe(
        `SELECT a."id",a."contractId",a."dealerProductId",a."discountRate",a."createdAt",a."updatedAt"
           FROM "WholesaleContractProductPrice" a
           JOIN "WholesaleDealerProduct" p ON p."id"=a."dealerProductId" AND p."dealerId"=$1 AND p."active"=TRUE
          WHERE a."contractId"=$2 AND a."active"=TRUE
            AND a."dealerProductId" IN (SELECT jsonb_array_elements_text($3::jsonb))
          ORDER BY a."dealerProductId"`,
        session.id,
        pricingContract.id,
        JSON.stringify(productResult.products.map(product => product.id)),
      )
    } else if (!productPageMode && !pricingPageMode) {
      contractProductPrices = await prisma.$queryRawUnsafe(`SELECT a."id",a."contractId",a."dealerProductId",a."discountRate",a."createdAt",a."updatedAt"
        FROM "WholesaleContractProductPrice" a
        JOIN "WholesaleDealerContract" c ON c."id"=a."contractId" AND c."dealerId"=$1
        JOIN "WholesaleDealerProduct" p ON p."id"=a."dealerProductId" AND p."dealerId"=$1
        WHERE a."active"=TRUE ORDER BY a."contractId",a."dealerProductId"`, session.id)
    }

    return {
      dealer: { id: session.id, name: session.name, loginId: session.loginId, email: session.email || '', dealerCode: session.dealerCode },
      contracts,
      products: productResult.products.map(product => {
        const wholesalePrice = Number(product.wholesalePrice)
        const suggestedRetailPrice = product.suggestedRetailPrice == null ? null : Number(product.suggestedRetailPrice)
        return { ...product, wholesalePrice, suggestedRetailPrice, listPrice: suggestedRetailPrice == null ? wholesalePrice : suggestedRetailPrice, orderUnit: Number(product.orderUnit) }
      }),
      productPagination: productResult.productPagination,
      pricingPagination: productResult.pricingPagination,
      productFilters: {
        manufacturers: [...new Set(productFilterRows.map(row => String(row.manufacturerName || '')).filter(Boolean))],
        categories: [...new Set(productFilterRows.map(row => String(row.category || '')).filter(Boolean))].sort((left, right) => left.localeCompare(right, 'ja')),
      },
      contractProductPrices: contractProductPrices.map(price => ({ ...price, discountRate: Number(price.discountRate) })),
      orders: orders.map(order => ({ ...order, totalYen: Number(order.totalYen), lineCount: Number(order.lineCount), totalQuantity: Number(order.totalQuantity) })),
    }
  }
