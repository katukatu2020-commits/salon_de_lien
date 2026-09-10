  async function createSplitOrders(session, payload) {
    const rawOrders = Array.isArray(payload.orders) ? payload.orders : []
    if (!rawOrders.length) throw new WholesaleError('発注する商品と数量を入力してください。')
    if (rawOrders.length > 50) throw new WholesaleError('一度に確定できる発注先は50件までです。')
    const requestedDeliveryDate = optionalDate(payload.requestedDeliveryDate, '希望納品日')
    const salonNote = cleanText(payload.salonNote, '発注メモ', 1200, false)
    let totalLineCount = 0
    const normalizedOrders = rawOrders.map(rawOrder => {
      const dealerId = cleanText(rawOrder && rawOrder.dealerId, 'ディーラー', 180, true)
      const rawLines = Array.isArray(rawOrder && rawOrder.lines) ? rawOrder.lines : []
      if (!rawLines.length) throw new WholesaleError('発注する商品と数量を入力してください。')
      if (rawLines.length > 300) throw new WholesaleError('一度に発注できる商品は300件までです。')
      const unique = new Map()
      for (const rawLine of rawLines) {
        const dealerProductId = cleanText(rawLine.dealerProductId, 'ディーラー商品', 180, true)
        const quantity = integer(rawLine.quantity, '発注数', 1, 999)
        const current = unique.get(dealerProductId)
        unique.set(dealerProductId, { dealerProductId, quantity: (current?.quantity || 0) + quantity })
      }
      for (const line of unique.values()) if (line.quantity > 999) throw new WholesaleError('1商品の発注数は999個以下にしてください。')
      totalLineCount += unique.size
      return { dealerId, unique, dealerProductIds: [...unique.keys()] }
    })
    if (totalLineCount > 300) throw new WholesaleError('一度に発注できる商品は合計300件までです。')
    const dealerIds = new Set(normalizedOrders.map(order => order.dealerId))
    if (dealerIds.size !== normalizedOrders.length) throw new WholesaleError('同じ発注先が重複しています。画面を更新して再度お試しください。')
    normalizedOrders.sort((left, right) => left.dealerId.localeCompare(right.dealerId))
    const datePrefix = new Date().toISOString().slice(0, 10).replaceAll('-', '')

    return prisma.$transaction(async tx => {
      const organizationRows = await tx.$queryRawUnsafe('SELECT "taxRate" FROM "Organization" WHERE "id"=$1 LIMIT 1 FOR SHARE', session.organizationId)
      if (!organizationRows[0]) throw new WholesaleError('店舗情報を確認できませんでした。', 404)
      const taxRate = Number(organizationRows[0].taxRate || 10)
      const createdOrders = []

      for (const normalized of normalizedOrders) {
        const contractRows = await tx.$queryRawUnsafe(`SELECT c."id",d."id" AS "dealerId",d."name" AS "dealerName"
          FROM "WholesaleDealerContract" c
          JOIN "WholesaleDealer" d ON d."id"=c."dealerId" AND d."active"=TRUE
          WHERE c."organizationId"=$1 AND c."dealerId"=$2 AND c."status"='ACTIVE'
          LIMIT 1 FOR SHARE OF c,d`, session.organizationId, normalized.dealerId)
        if (!contractRows[0]) throw new WholesaleError('有効なディーラー契約を確認できませんでした。', 409)
        const dealerProducts = await tx.$queryRawUnsafe(`SELECT p."id",p."manufacturerName",p."name",p."category",p."productCode",p."janCode",p."orderUnit",
          COALESCE(p."suggestedRetailPrice",p."wholesalePrice")::int AS "listPrice",a."discountRate"
          FROM "WholesaleContractProductPrice" a
          JOIN "WholesaleDealerProduct" p ON p."id"=a."dealerProductId" AND p."active"=TRUE
          WHERE a."contractId"=$1 AND a."active"=TRUE AND p."dealerId"=$2
            AND p."id" IN (SELECT jsonb_array_elements_text($3::jsonb))
          FOR SHARE OF a,p`, contractRows[0].id, normalized.dealerId, JSON.stringify(normalized.dealerProductIds))
        if (dealerProducts.length !== normalized.dealerProductIds.length) throw new WholesaleError('ディーラーが取扱設定した商品のみ発注できます。商品一覧を更新してください。', 409)
        const orderLines = dealerProducts.map(product => {
          const quantity = normalized.unique.get(product.id).quantity
          const orderUnit = Number(product.orderUnit || 1)
          if (quantity % orderUnit !== 0) throw new WholesaleError(product.name + 'は' + orderUnit + '個単位で入力してください。')
          const listPrice = Number(product.listPrice)
          const discountRate = Number(product.discountRate)
          const unitPrice = Math.round(listPrice * (100 - discountRate) / 100)
          return { ...product, productId: null, dealerProductId: product.id, listPrice, discountRate, quantity, deliveredQuantity: quantity, unitPrice, lineTotal: unitPrice * quantity }
        })
        const subtotalYen = orderLines.reduce((sum, line) => sum + line.lineTotal, 0)
        const taxYen = Math.round(subtotalYen * taxRate / 100)
        const totalYen = subtotalYen + taxYen
        const orderNo = 'PO-' + datePrefix + '-' + crypto.randomBytes(3).toString('hex').toUpperCase()
        const orderId = 'order_' + crypto.randomUUID()
        await tx.$executeRawUnsafe(`INSERT INTO "WholesaleOrder" ("id","orderNo","dealerId","organizationId","status","requestedDeliveryDate","salonNote","orderedByUserId","orderedByName","taxRate","subtotalYen","taxYen","totalYen","orderedAt","createdAt","updatedAt") VALUES ($1,$2,$3,$4,'ORDERED',$5::date,NULLIF($6,''),$7,$8,$9,$10,$11,$12,NOW(),NOW(),NOW())`, orderId, orderNo, normalized.dealerId, session.organizationId, requestedDeliveryDate, salonNote, session.userId, session.displayName, taxRate, subtotalYen, taxYen, totalYen)
        for (const line of orderLines) {
          await tx.$executeRawUnsafe(`INSERT INTO "WholesaleOrderLine" ("id","orderId","productId","dealerProductId","manufacturerName","productName","category","productCode","janCode","listPrice","discountRate","unitPrice","quantity","deliveredQuantity","lineTotal","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,NOW(),NOW())`, 'line_' + crypto.randomUUID(), orderId, line.productId, line.dealerProductId, line.manufacturerName, line.name, line.category, line.productCode, line.janCode, line.listPrice, line.discountRate, line.unitPrice, line.quantity, line.deliveredQuantity, line.lineTotal)
        }
        await tx.$executeRawUnsafe('INSERT INTO "WholesaleOrderEvent" ("id","orderId","eventType","actorType","actorId","actorName","detailJson","createdAt") VALUES ($1,$2,\'ORDERED\',\'SALON\',$3,$4,$5::jsonb,NOW())', 'event_' + crypto.randomUUID(), orderId, session.userId, session.displayName, JSON.stringify({ lineCount: orderLines.length, totalQuantity: orderLines.reduce((sum, line) => sum + line.quantity, 0), splitOrderCount: normalizedOrders.length }))
        createdOrders.push({ id: orderId, orderNo, status: 'ORDERED', dealerId: normalized.dealerId, dealerName: contractRows[0].dealerName, totalYen })
      }
      return createdOrders
    }, { maxWait: 5000, timeout: 30000 })
  }
