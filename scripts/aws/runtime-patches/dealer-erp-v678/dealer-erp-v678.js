'use strict'

const fs = require('node:fs')
const path = require('node:path')
const { monthRange } = require('./dealer-sales-team-v671')
const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }) }
const text = (value, label, max = 160, optional = false) => {
  const v = String(value ?? '').trim()
  if ((!optional && !v) || v.length > max) fail(label + 'を正しく入力してください。')
  return v
}
const num = (value, min = 0, max = 1000000000000) => {
  if (!/^-?\d+$/.test(String(value)) || !Number.isSafeInteger(Number(value)) || Number(value) < min || Number(value) > max) fail('数値の範囲を確認してください。')
  return Number(value)
}
const date = value => {
  const v = String(value || '')
  if (!/^20\d{2}-\d{2}-\d{2}$/.test(v) || !Number.isFinite(Date.parse(v)) || new Date(v).toISOString().slice(0, 10) !== v) fail('日付を正しく入力してください。')
  return v
}
const instant = value => {
  const v = String(value || '')
  if (!/T.*(?:Z|[+-]\d{2}:\d{2})$/.test(v) || !Number.isFinite(Date.parse(v))) fail('日時を正しく入力してください。')
  return new Date(v)
}
const clean = v => JSON.parse(JSON.stringify(v, (_, value) => typeof value === 'bigint' ? Number(value) : value))
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const yen = v => Number(v).toLocaleString('ja-JP') + '円'
const csv = rows => '\ufeff' + rows.map(row => row.map(v => '"' + (typeof v === 'number' ? String(v) : String(v ?? '').replace(/^[=+@\-\t\r]/, "'$&")).replace(/"/g, '""') + '"').join(',')).join('\r\n')
const canonical = v => Array.isArray(v) ? v.map(canonical) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canonical(v[k])])) : v

function createDealerErp({ prisma: db, crypto, helpers: h }) {
  const id = () => crypto.randomUUID()
  const doc = prefix => prefix + '-' + new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(new Date()).replaceAll('-', '') + '-' + crypto.randomBytes(6).toString('hex').toUpperCase()
  const admin = s => { if (s.role !== 'ADMIN' || s.salon) fail('管理者のみ操作できます。', 403) }
  const actor = s => s.salon ? 'salon:' + s.userId : s.memberId
  const one = async (tx, sql, ...args) => (await tx.$queryRawUnsafe(sql, ...args))[0]
  const scope = s => s.role === 'ADMIN' ? null : s.memberId
  let schemaPromise
  async function ensureSchema() {
    if (!schemaPromise) schemaPromise = db.$transaction(async tx => {
      await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(678026)')
      for (const sql of fs.readFileSync(path.join(__dirname, 'dealer-erp-v678.sql'), 'utf8').split(';').filter(s => s.trim())) await tx.$executeRawUnsafe(sql)
    }, { timeout: 60000 }).catch(error => { schemaPromise = null; throw error })
    return schemaPromise
  }
  async function contract(tx, s, organizationId) {
    const row = await one(tx, `SELECT c.*,o."name" FROM "WholesaleDealerContract" c JOIN "Organization" o ON o."id"=c."organizationId" WHERE c."dealerId"=$1 AND c."organizationId"=$2 AND ($3::text IS NULL OR c."salesMemberId"=$3)`, s.id, String(organizationId || ''), scope(s))
    if (!row) fail('取引先が見つかりません。', 404)
    return row
  }
  async function order(tx, s, orderId, adopt = false) {
    const row = await one(tx, `SELECT o.*,e."orderId" IS NOT NULL AS tracked FROM "WholesaleOrder" o LEFT JOIN "DealerErpOrder" e ON e."orderId"=o."id" WHERE o."id"=$1 AND o."dealerId"=$2 AND ($3::text IS NULL OR o."salesMemberId"=$3) FOR UPDATE OF o`, String(orderId || ''), s.id, scope(s))
    if (!row) fail('受注が見つかりません。', 404)
    if (adopt && !row.tracked) {
      if (!['ORDERED', 'ACCEPTED'].includes(row.status)) fail('過去の出荷済み伝票は変更できません。', 409)
      await tx.$executeRawUnsafe('INSERT INTO "DealerErpOrder" ("orderId","dealerId") VALUES ($1,$2)', row.id, s.id)
      await tx.$executeRawUnsafe('INSERT INTO "DealerErpOrderLine" ("lineId","orderId") SELECT "id","orderId" FROM "WholesaleOrderLine" WHERE "orderId"=$1', row.id)
      await tx.$executeRawUnsafe('UPDATE "WholesaleOrderLine" SET "deliveredQuantity"=0 WHERE "orderId"=$1', row.id)
      row.tracked = true
    }
    return row
  }
  async function lines(tx, orderId) {
    return tx.$queryRawUnsafe(`SELECT l.*,COALESCE(e."cancelled",0) AS cancelled,
      COALESCE((SELECT SUM(a."quantity") FROM "DealerErpAllocation" a WHERE a."lineId"=l."id"),0)::int AS reserved,
      COALESCE((SELECT SUM(x."quantity") FROM "DealerErpShipmentLine" x JOIN "DealerErpShipment" sh ON sh."id"=x."shipmentId" WHERE x."lineId"=l."id" AND sh."status"<>'REVERSED'),0)::int AS shipped,
      COALESCE((SELECT SUM(x."quantity") FROM "DealerErpShipmentLine" x JOIN "DealerErpShipment" sh ON sh."id"=x."shipmentId" WHERE x."lineId"=l."id" AND sh."status"='DELIVERED'),0)::int AS delivered,
      COALESCE((SELECT SUM(x."returned") FROM "DealerErpShipmentLine" x WHERE x."lineId"=l."id"),0)::int AS returned
      FROM "WholesaleOrderLine" l LEFT JOIN "DealerErpOrderLine" e ON e."lineId"=l."id" WHERE l."orderId"=$1 ORDER BY l."createdAt",l."id"`, orderId)
  }
  async function product(tx, s, productId) {
    const p = await one(tx, 'SELECT * FROM "WholesaleDealerProduct" WHERE "id"=$1 AND "dealerId"=$2', String(productId || ''), s.id)
    if (!p) fail('商品が見つかりません。', 404)
    return p
  }
  async function location(tx, s, locationId) {
    const loc = await one(tx, `SELECT l.*,w."branchId" FROM "DealerErpLocation" l JOIN "DealerErpWarehouse" w ON w."id"=l."warehouseId" WHERE l."id"=$1 AND l."dealerId"=$2`, String(locationId || ''), s.id)
    if (!loc || (s.role !== 'ADMIN' && loc.branchId && loc.branchId !== s.branchId)) fail('保管場所を利用できません。', 403)
    return loc
  }
  async function stock(tx, s, locationId, productId) {
    await location(tx, s, locationId)
    await product(tx, s, productId)
    await tx.$executeRawUnsafe('INSERT INTO "DealerErpStock" ("id","dealerId","locationId","productId") VALUES ($1,$2,$3,$4) ON CONFLICT ("locationId","productId") DO NOTHING', id(), s.id, locationId, productId)
    return one(tx, 'SELECT * FROM "DealerErpStock" WHERE "locationId"=$1 AND "productId"=$2 AND "dealerId"=$3 FOR UPDATE', locationId, productId, s.id)
  }
  async function movement(tx, s, st, delta, reservedDelta, kind, reference, reason) {
    const current = await one(tx, 'SELECT * FROM "DealerErpStock" WHERE "id"=$1 AND "dealerId"=$2 FOR UPDATE', st.id, s.id)
    if (!current) fail('在庫が見つかりません。', 404)
    const onHand = current.onHand + delta, reserved = current.reserved + reservedDelta
    if (onHand < 0 || reserved < 0 || reserved > onHand || onHand > 1000000000) fail('在庫数または引当数が不足しています。', 409)
    await tx.$executeRawUnsafe('UPDATE "DealerErpStock" SET "onHand"=$2,"reserved"=$3,"version"="version"+1 WHERE "id"=$1', st.id, onHand, reserved)
    await tx.$executeRawUnsafe('INSERT INTO "DealerErpStockEvent" ("id","dealerId","stockId","kind","delta","reservedDelta","onHand","reserved","referenceId","reason","actorId") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)', id(), s.id, st.id, kind, delta, reservedDelta, onHand, reserved, reference || null, reason, actor(s))
  }
  async function syncOrder(tx, o) {
    const list = await lines(tx, o.id)
    const qty = list.reduce((n, l) => n + l.quantity - l.cancelled, 0)
    const shipped = list.reduce((n, l) => n + l.shipped, 0), delivered = list.reduce((n, l) => n + l.delivered, 0)
    const status = !qty ? 'CANCELLED' : delivered === qty ? 'DELIVERED' : shipped === qty ? 'SHIPPED' : 'ACCEPTED'
    const subtotal = list.reduce((n, l) => n + (l.quantity - l.cancelled) * l.unitPrice, 0)
    const total = subtotal + Math.round(subtotal * o.taxRate / 100)
    if (total > 2147483647) fail('1伝票の合計上限を超えています。')
    for (const l of list) await tx.$executeRawUnsafe('UPDATE "WholesaleOrderLine" SET "deliveredQuantity"=$2,"lineTotal"=$3,"updatedAt"=NOW() WHERE "id"=$1', l.id, l.delivered - l.returned, (l.quantity - l.cancelled) * l.unitPrice)
    await tx.$executeRawUnsafe(`UPDATE "WholesaleOrder" SET "status"=$2,"subtotalYen"=$3,"taxYen"=$4,"totalYen"=$5,"acceptedAt"=COALESCE("acceptedAt",NOW()),"shippedAt"=CASE WHEN $6>0 THEN COALESCE("shippedAt",NOW()) ELSE NULL END,"deliveredAt"=CASE WHEN $2='DELIVERED' THEN COALESCE("deliveredAt",NOW()) ELSE NULL END,"cancelledAt"=CASE WHEN $2='CANCELLED' THEN NOW() ELSE NULL END,"updatedAt"=NOW() WHERE "id"=$1`, o.id, status, subtotal, total - subtotal, total, shipped)
  }
  async function release(tx, s, lineId, reason) {
    const rows = await tx.$queryRawUnsafe('SELECT a.*,st."locationId" FROM "DealerErpAllocation" a JOIN "DealerErpStock" st ON st."id"=a."stockId" WHERE a."lineId"=$1 AND a."quantity">0', lineId)
    for (const a of rows) {
      await movement(tx, s, { id: a.stockId }, 0, -a.quantity, 'RELEASE', lineId, reason)
      await tx.$executeRawUnsafe('UPDATE "DealerErpAllocation" SET "quantity"=0 WHERE "id"=$1', a.id)
    }
  }
  async function charge(tx, s, o, l, quantity, sourceId) {
    const p = await one(tx, 'SELECT "dealerProductId" FROM "WholesaleOrderLine" WHERE "id"=$1', l.lineId)
    await tx.$executeRawUnsafe(`INSERT INTO "DealerErpCharge" ("id","dealerId","organizationId","orderId","shipmentLineId","sourceId","productId","productName","productCode","category","quantity","unitPrice","listPrice","taxRate","salesMemberId","salesBranchId","closingDay") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`, id(), s.id, o.organizationId, o.id, l.id, sourceId, p.dealerProductId, l.productName, l.productCode, l.category, quantity, l.unitPrice, l.listPrice, l.taxRate, o.salesMemberId, o.salesBranchId, o.billingClosingDay)
  }
  async function shipment(tx, s, shipmentId) {
    const sh = await one(tx, 'SELECT * FROM "DealerErpShipment" WHERE "id"=$1 AND "dealerId"=$2', String(shipmentId || ''), s.id)
    if (!sh) fail('出荷が見つかりません。', 404)
    const o = await order(tx, s, sh.orderId)
    return { sh, o, items: await tx.$queryRawUnsafe('SELECT * FROM "DealerErpShipmentLine" WHERE "shipmentId"=$1 ORDER BY "id"', sh.id) }
  }
  async function warehouseSave(tx, s, p) {
    admin(s)
    let branchId = null
    if (p.branchId) {
      const b = await one(tx, 'SELECT "id" FROM "DealerSalesBranch" WHERE "id"=$1 AND "dealerId"=$2 AND "active"', p.branchId, s.id)
      if (!b) fail('営業所が見つかりません。', 404)
      branchId = b.id
    }
    const wid = id()
    await tx.$executeRawUnsafe('INSERT INTO "DealerErpWarehouse" ("id","dealerId","branchId","name") VALUES ($1,$2,$3,$4)', wid, s.id, branchId, text(p.name, '倉庫名'))
    const lid = id()
    await tx.$executeRawUnsafe('INSERT INTO "DealerErpLocation" ("id","dealerId","warehouseId","name") VALUES ($1,$2,$3,$4)', lid, s.id, wid, text(p.location || '標準棚', '保管場所'))
    return { id: wid, locationId: lid }
  }
  async function locationSave(tx, s, p) {
    admin(s)
    if (!await one(tx, 'SELECT "id" FROM "DealerErpWarehouse" WHERE "id"=$1 AND "dealerId"=$2', String(p.warehouseId), s.id)) fail('倉庫が見つかりません。', 404)
    const lid = id()
    await tx.$executeRawUnsafe('INSERT INTO "DealerErpLocation" ("id","dealerId","warehouseId","name") VALUES ($1,$2,$3,$4)', lid, s.id, p.warehouseId, text(p.name, '保管場所'))
    return { id: lid }
  }
  async function stockChange(tx, s, p) {
    admin(s)
    const reason = text(p.reason, '理由', 1000), st = await stock(tx, s, p.locationId, p.productId)
    if (p.kind === 'COUNT' && num(p.version) !== st.version) fail('在庫が更新されています。再読込して棚卸しをやり直してください。', 409)
    const delta = p.kind === 'COUNT' ? num(p.quantity, 0, 1000000000) - st.onHand : num(p.quantity, 1, 1000000) * (p.kind === 'ISSUE' ? -1 : 1)
    if (!['COUNT', 'RECEIPT', 'ISSUE', 'TRANSFER'].includes(p.kind)) fail('入出庫区分を確認してください。')
    if (p.kind === 'TRANSFER') {
      if (p.destinationId === p.locationId) fail('移動先を変更してください。')
      const to = await stock(tx, s, p.destinationId, p.productId)
      await movement(tx, s, st, -delta, 0, 'TRANSFER_OUT', to.id, reason)
      await movement(tx, s, to, delta, 0, 'TRANSFER_IN', st.id, reason)
    } else await movement(tx, s, st, delta, 0, p.kind, null, reason)
    if (p.minimum !== undefined) await tx.$executeRawUnsafe('UPDATE "DealerErpStock" SET "minimum"=$2 WHERE "id"=$1', st.id, num(p.minimum, 0, 1000000))
    return { id: st.id }
  }
  async function orderEdit(tx, s, p) {
    const o = await order(tx, s, p.orderId, true), list = await lines(tx, o.id)
    const reason = text(p.reason, '変更理由', 1000)
    if (p.kind === 'CANCEL') {
      for (const l of list) {
        await release(tx, s, l.id, reason)
        await tx.$executeRawUnsafe('UPDATE "DealerErpOrderLine" SET "cancelled"=$2 WHERE "lineId"=$1', l.id, l.quantity - l.shipped)
      }
    } else {
      const l = list.find(l => l.id === p.lineId)
      if (!l) fail('明細が見つかりません。', 404)
      const quantity = num(p.quantity, 1, 999), unitPrice = num(p.unitPrice, 0, 10000000)
      if (l.shipped || l.cancelled) fail('出荷後や取消後の明細変更はできません。返品・未出荷分の取消をご利用ください。', 409)
      if (unitPrice > Number(l.listPrice ?? unitPrice)) fail('契約価格が定価を超えています。')
      await release(tx, s, l.id, reason)
      await tx.$executeRawUnsafe('UPDATE "WholesaleOrderLine" SET "quantity"=$2,"unitPrice"=$3 WHERE "id"=$1', l.id, quantity, unitPrice)
    }
    await syncOrder(tx, o)
    await tx.$executeRawUnsafe('INSERT INTO "WholesaleOrderEvent" ("id","orderId","eventType","actorType","actorId","actorName","detailJson") VALUES ($1,$2,\'ERP_AMENDMENT\',\'DEALER\',$3,$4,$5::jsonb)', id(), o.id, actor(s), s.memberName, JSON.stringify({ reason, kind: p.kind, lineId: p.lineId || null, quantity: p.quantity || null, unitPrice: p.unitPrice ?? null }))
    return { id: o.id }
  }
  async function reserve(tx, s, p) {
    const o = await order(tx, s, p.orderId, true), l = (await lines(tx, o.id)).find(l => l.id === p.lineId)
    if (!l) fail('明細が見つかりません。', 404)
    if (p.release === true) { await release(tx, s, l.id, '引当解除'); return { id: l.id } }
    let productId = l.dealerProductId
    if (!productId) {
      const mapped = await product(tx, s, p.productId)
      productId = mapped.id
      await tx.$executeRawUnsafe('UPDATE "WholesaleOrderLine" SET "dealerProductId"=$2 WHERE "id"=$1', l.id, productId)
    }
    const quantity = num(p.quantity, 1, 999)
    if (quantity > l.quantity - l.cancelled - l.shipped - l.reserved) fail('未出荷数量を超えています。', 409)
    const st = await stock(tx, s, p.locationId, productId)
    await movement(tx, s, st, 0, quantity, 'RESERVE', o.id, '受注引当')
    await tx.$executeRawUnsafe('INSERT INTO "DealerErpAllocation" ("id","lineId","stockId","quantity") VALUES ($1,$2,$3,$4) ON CONFLICT ("lineId","stockId") DO UPDATE SET "quantity"="DealerErpAllocation"."quantity"+$4', id(), l.id, st.id, quantity)
    await syncOrder(tx, o)
    return { id: l.id }
  }
  async function ship(tx, s, p) {
    const o = await order(tx, s, p.orderId, true)
    const allocated = await tx.$queryRawUnsafe(`SELECT a.*,st."locationId",l."productName",l."productCode",l."category",l."unitPrice",l."listPrice" FROM "DealerErpAllocation" a JOIN "DealerErpStock" st ON st."id"=a."stockId" JOIN "WholesaleOrderLine" l ON l."id"=a."lineId" WHERE l."orderId"=$1 AND a."quantity">0 ORDER BY a."id"`, o.id)
    if (!allocated.length) fail('出荷する数量を先に引き当ててください。')
    const sid = id(), documentNo = doc('DN')
    await tx.$executeRawUnsafe('INSERT INTO "DealerErpShipment" ("id","dealerId","orderId","documentNo","actorId") VALUES ($1,$2,$3,$4,$5)', sid, s.id, o.id, documentNo, actor(s))
    for (const a of allocated) {
      await location(tx, s, a.locationId)
      await movement(tx, s, { id: a.stockId }, -a.quantity, -a.quantity, 'SHIP', sid, '出荷')
      await tx.$executeRawUnsafe('UPDATE "DealerErpAllocation" SET "quantity"=0 WHERE "id"=$1', a.id)
      await tx.$executeRawUnsafe('INSERT INTO "DealerErpShipmentLine" ("id","shipmentId","lineId","stockId","quantity","productName","productCode","category","unitPrice","listPrice","taxRate") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)', id(), sid, a.lineId, a.stockId, a.quantity, a.productName, a.productCode || '', a.category || '未分類', a.unitPrice, Math.max(a.unitPrice, a.listPrice ?? a.unitPrice), o.taxRate)
    }
    await syncOrder(tx, o)
    return { id: sid, documentNo }
  }
  async function deliver(tx, s, p) {
    const { sh, o, items } = await shipment(tx, s, p.shipmentId)
    if (sh.status !== 'SHIPPED') fail('出荷中の伝票ではありません。', 409)
    await tx.$executeRawUnsafe('UPDATE "DealerErpShipment" SET "status"=\'DELIVERED\',"deliveredAt"=NOW() WHERE "id"=$1', sh.id)
    for (const l of items) await charge(tx, s, o, l, l.quantity, 'delivery:' + l.id)
    await syncOrder(tx, o)
    return { id: sh.id }
  }
  async function reverseShipment(tx, s, p) {
    const { sh, o, items } = await shipment(tx, s, p.shipmentId)
    const reason = text(p.reason, '取消理由', 1000)
    if (sh.status !== 'SHIPPED') fail('納品前の出荷のみ取り消せます。納品後は返品を登録してください。', 409)
    for (const l of items) await movement(tx, s, { id: l.stockId }, l.quantity, 0, 'SHIP_REVERSE', sh.id, reason)
    await tx.$executeRawUnsafe('UPDATE "DealerErpShipment" SET "status"=\'REVERSED\',"reason"=$2 WHERE "id"=$1', sh.id, reason)
    await syncOrder(tx, o)
    return { id: sh.id }
  }
  async function returnGoods(tx, s, p) {
    const { sh, o, items } = await shipment(tx, s, p.shipmentId)
    if (sh.status !== 'DELIVERED') fail('納品済みの伝票ではありません。', 409)
    const l = items.find(l => l.id === p.lineId), quantity = num(p.quantity, 1, 999)
    if (!l || quantity > l.quantity - l.returned) fail('返品可能な数量を超えています。', 409)
    if (typeof p.restock !== 'boolean') fail('在庫へ戻すか選択してください。')
    const reason = text(p.reason, '返品理由', 1000), rid = id()
    await tx.$executeRawUnsafe('INSERT INTO "DealerErpReturn" ("id","shipmentLineId","quantity","restock","reason","actorId") VALUES ($1,$2,$3,$4,$5,$6)', rid, l.id, quantity, p.restock, reason, actor(s))
    await tx.$executeRawUnsafe('UPDATE "DealerErpShipmentLine" SET "returned"="returned"+$2 WHERE "id"=$1', l.id, quantity)
    if (p.restock) await movement(tx, s, { id: l.stockId }, quantity, 0, 'RETURN', rid, reason)
    await charge(tx, s, o, l, -quantity, 'return:' + rid)
    await syncOrder(tx, o)
    return { id: rid }
  }
  async function purchase(tx, s, p) {
    admin(s)
    const purchaseId = id(), documentNo = doc('PO')
    if (!Array.isArray(p.lines) || !p.lines.length || p.lines.length > 100) fail('発注明細を確認してください。')
    await tx.$executeRawUnsafe('INSERT INTO "DealerErpPurchase" ("id","dealerId","supplier","documentNo","expectedDate","actorId") VALUES ($1,$2,$3,$4,$5::date,$6)', purchaseId, s.id, text(p.supplier, '発注先'), documentNo, p.expectedDate ? date(p.expectedDate) : null, actor(s))
    for (const l of p.lines) {
      await product(tx, s, l.productId)
      await tx.$executeRawUnsafe('INSERT INTO "DealerErpPurchaseLine" ("id","purchaseId","productId","quantity","unitCost") VALUES ($1,$2,$3,$4,$5)', id(), purchaseId, l.productId, num(l.quantity, 1, 1000000), num(l.unitCost, 0, 10000000))
    }
    return { id: purchaseId, documentNo }
  }
  async function receivePurchase(tx, s, p) {
    admin(s)
    const po = await one(tx, 'SELECT * FROM "DealerErpPurchase" WHERE "id"=$1 AND "dealerId"=$2', String(p.purchaseId), s.id)
    if (!po || po.status !== 'OPEN') fail('未入荷の発注が見つかりません。', 409)
    if (p.cancel === true) {
      await tx.$executeRawUnsafe('UPDATE "DealerErpPurchase" SET "status"=\'CANCELLED\' WHERE "id"=$1', po.id)
      return { id: po.id }
    }
    const l = await one(tx, 'SELECT * FROM "DealerErpPurchaseLine" WHERE "id"=$1 AND "purchaseId"=$2', String(p.lineId), po.id)
    const quantity = num(p.quantity, 1, 1000000)
    if (!l || quantity > l.quantity - l.received) fail('未入荷数量を超えています。', 409)
    const st = await stock(tx, s, p.locationId, l.productId)
    await movement(tx, s, st, quantity, 0, 'PURCHASE_RECEIPT', po.id, '仕入入荷')
    await tx.$executeRawUnsafe('UPDATE "DealerErpPurchaseLine" SET "received"="received"+$2 WHERE "id"=$1', l.id, quantity)
    await tx.$executeRawUnsafe('UPDATE "DealerErpPurchase" SET "status"=\'CLOSED\' WHERE "id"=$1 AND NOT EXISTS (SELECT 1 FROM "DealerErpPurchaseLine" WHERE "purchaseId"=$1 AND "received"<"quantity")', po.id)
    return { id: po.id }
  }
  async function issueInvoice(tx, s, p) {
    admin(s)
    const c = await contract(tx, s, p.organizationId), closing = date(p.closingDate), due = date(p.dueDate)
    if (due < closing) fail('支払期日は締日以降にしてください。')
    const rows = await tx.$queryRawUnsafe('SELECT * FROM "DealerErpCharge" WHERE "dealerId"=$1 AND "organizationId"=$2 AND "invoiceId" IS NULL AND "occurredAt"<($3::date+1)::timestamp AT TIME ZONE \'Asia/Tokyo\' ORDER BY "occurredAt","id"', s.id, c.organizationId, closing)
    if (!rows.length) fail('締日までの未請求明細がありません。', 409)
    let listYen = 0, subtotalYen = 0
    const taxes = new Map()
    for (const l of rows) {
      listYen += l.listPrice * l.quantity
      subtotalYen += l.unitPrice * l.quantity
      taxes.set(l.taxRate, (taxes.get(l.taxRate) || 0) + l.unitPrice * l.quantity)
    }
    const taxDetails = [...taxes].map(([rate, subtotal]) => ({ rate, subtotal, tax: Math.sign(subtotal) * Math.round(Math.abs(subtotal) * rate / 100) }))
    const taxYen = taxDetails.reduce((n, t) => n + t.tax, 0), iid = id(), documentNo = doc('INV')
    if (![listYen, subtotalYen, taxYen, subtotalYen + taxYen].every(Number.isSafeInteger)) fail('請求金額の上限を超えています。')
    const issuer = await one(tx, 'SELECT "name","address","phone","invoiceRegistrationNumber" FROM "WholesaleDealer" WHERE "id"=$1', s.id)
    const snapshot = { issuer, salon: { name: c.name, customerCode: c.customerCode }, lines: clean(rows), taxes: taxDetails }
    await tx.$executeRawUnsafe('INSERT INTO "DealerErpInvoice" ("id","dealerId","organizationId","documentNo","closingDate","dueDate","listYen","discountYen","subtotalYen","taxYen","totalYen","snapshot","actorId") VALUES ($1,$2,$3,$4,$5::date,$6::date,$7,$8,$9,$10,$11,$12::jsonb,$13)', iid, s.id, c.organizationId, documentNo, closing, due, listYen, listYen - subtotalYen, subtotalYen, taxYen, subtotalYen + taxYen, JSON.stringify(snapshot), actor(s))
    await tx.$executeRawUnsafe('UPDATE "DealerErpCharge" SET "invoiceId"=$1 WHERE "id"=ANY($2::text[])', iid, rows.map(l => l.id))
    return { id: iid, documentNo }
  }
  async function invoice(tx, s, invoiceId) {
    const inv = await one(tx, `SELECT i.*,COALESCE((SELECT SUM(a."amountYen") FROM "DealerErpSettlement" a WHERE a."invoiceId"=i."id"),0)::float8 AS paid FROM "DealerErpInvoice" i WHERE i."id"=$1 AND i."dealerId"=$2`, String(invoiceId || ''), s.id)
    if (!inv) fail('請求書が見つかりません。', 404)
    await contract(tx, s, inv.organizationId)
    return clean(inv)
  }
  async function voidInvoice(tx, s, p) {
    admin(s)
    const inv = await invoice(tx, s, p.invoiceId)
    if (inv.voided || inv.paid) fail('入金を消込解除してから請求を取り消してください。', 409)
    await tx.$executeRawUnsafe('UPDATE "DealerErpInvoice" SET "voided"=TRUE,"voidReason"=$2 WHERE "id"=$1', inv.id, text(p.reason, '取消理由', 1000))
    await tx.$executeRawUnsafe('UPDATE "DealerErpCharge" SET "invoiceId"=NULL WHERE "invoiceId"=$1', inv.id)
    return { id: inv.id }
  }
  async function recordPayment(tx, s, p) {
    admin(s)
    await contract(tx, s, p.organizationId)
    const amount = num(p.amountYen, -1000000000000)
    if (!amount) fail('入金額は0以外を入力してください。')
    const pid = id()
    await tx.$executeRawUnsafe('INSERT INTO "DealerErpPayment" ("id","dealerId","organizationId","reference","paidDate","amountYen","note","actorId") VALUES ($1,$2,$3,$4,$5::date,$6,$7,$8)', pid, s.id, p.organizationId, text(p.reference, '取引番号'), date(p.paidDate), amount, text(p.note, '摘要', 1000, true), actor(s))
    return { id: pid }
  }
  async function settle(tx, s, p) {
    admin(s)
    const inv = await invoice(tx, s, p.invoiceId)
    const pay = clean(await one(tx, 'SELECT p.*,COALESCE((SELECT SUM(a."amountYen") FROM "DealerErpSettlement" a WHERE a."paymentId"=p."id"),0)::float8 AS allocated FROM "DealerErpPayment" p WHERE p."id"=$1 AND p."dealerId"=$2', String(p.paymentId), s.id) || null)
    if (!pay || pay.voided || inv.voided || pay.organizationId !== inv.organizationId) fail('同じサロンの有効な入金と請求書を選んでください。')
    const amount = num(p.amountYen, -1000000000000), due = inv.totalYen - inv.paid, available = pay.amountYen - pay.allocated
    if (!amount || Math.sign(amount) !== Math.sign(due) || Math.sign(amount) !== Math.sign(available) || Math.abs(amount) > Math.min(Math.abs(due), Math.abs(available))) fail('未入金残高または未消込額を超えています。', 409)
    const sid = id()
    await tx.$executeRawUnsafe('INSERT INTO "DealerErpSettlement" ("id","paymentId","invoiceId","amountYen","reason","actorId") VALUES ($1,$2,$3,$4,$5,$6)', sid, pay.id, inv.id, amount, '入金消込', actor(s))
    return { id: sid }
  }
  async function undoSettlement(tx, s, p) {
    admin(s)
    const a = await one(tx, 'SELECT a.* FROM "DealerErpSettlement" a JOIN "DealerErpPayment" p ON p."id"=a."paymentId" WHERE a."id"=$1 AND p."dealerId"=$2 AND a."reversesId" IS NULL AND NOT EXISTS (SELECT 1 FROM "DealerErpSettlement" r WHERE r."reversesId"=a."id")', String(p.settlementId), s.id)
    if (!a) fail('取消可能な消込が見つかりません。', 409)
    const sid = id()
    await tx.$executeRawUnsafe('INSERT INTO "DealerErpSettlement" ("id","paymentId","invoiceId","amountYen","reversesId","reason","actorId") VALUES ($1,$2,$3,$4,$5,$6,$7)', sid, a.paymentId, a.invoiceId, -Number(a.amountYen), a.id, text(p.reason, '取消理由', 1000), actor(s))
    return { id: sid }
  }
  async function voidPayment(tx, s, p) {
    admin(s)
    const pay = await one(tx, 'SELECT p.*,COALESCE((SELECT SUM(a."amountYen") FROM "DealerErpSettlement" a WHERE a."paymentId"=p."id"),0)::float8 AS allocated FROM "DealerErpPayment" p WHERE p."id"=$1 AND p."dealerId"=$2', String(p.paymentId), s.id)
    if (!pay || pay.voided || pay.allocated) fail('消込解除後の入金のみ取り消せます。', 409)
    const reason = text(p.reason, '取消理由', 1000)
    await tx.$executeRawUnsafe('UPDATE "DealerErpPayment" SET "voided"=TRUE,"note"="note" || $2 WHERE "id"=$1', pay.id, '\n取消: ' + reason)
    return { id: pay.id }
  }
  async function terms(tx, s, p) {
    admin(s)
    const c = await contract(tx, s, p.organizationId)
    await tx.$executeRawUnsafe('INSERT INTO "DealerErpSalonTerms" ("contractId","paymentDay","paymentMonths","note") VALUES ($1,$2,$3,$4) ON CONFLICT ("contractId") DO UPDATE SET "paymentDay"=$2,"paymentMonths"=$3,"note"=$4', c.id, num(p.paymentDay, 1, 31), num(p.paymentMonths, 0, 6), text(p.note, '取引条件', 2000, true))
    return { id: c.id }
  }
  async function branchGoal(tx, s, p) {
    admin(s)
    if (!await one(tx, 'SELECT "id" FROM "DealerSalesBranch" WHERE "id"=$1 AND "dealerId"=$2', String(p.branchId), s.id)) fail('営業所が見つかりません。', 404)
    await tx.$executeRawUnsafe('INSERT INTO "DealerErpBranchGoal" ("branchId","month","salesTargetYen","acquisitionTarget") VALUES ($1,$2,$3,$4) ON CONFLICT ("branchId","month") DO UPDATE SET "salesTargetYen"=$3,"acquisitionTarget"=$4', p.branchId, monthRange(p.month).key, num(p.salesTargetYen), num(p.acquisitionTarget, 0, 999999))
    return { id: p.branchId }
  }
  async function saveActivity(tx, s, p) {
    const m = await one(tx, 'SELECT * FROM "DealerSalesMember" WHERE "id"=$1 AND "dealerId"=$2 AND "active"', String(p.memberId || s.memberId), s.id)
    if (!m || (s.role !== 'ADMIN' && m.id !== s.memberId)) fail('担当者を選択できません。', 403)
    if (p.organizationId) await contract(tx, s, p.organizationId)
    if (p.orderId) {
      const o = await order(tx, s, p.orderId)
      if (o.organizationId !== p.organizationId) fail('サロンと受注が一致しません。')
    }
    if (!['PRIVATE', 'BRANCH', 'DEALER'].includes(p.visibility) || !['VISIT', 'DELIVERY', 'SUPPORT', 'INTERNAL'].includes(p.kind) || !['PLANNED', 'DONE', 'CANCELLED'].includes(p.status)) fail('予定区分を選んでください。')
    if (p.visibility === 'BRANCH' && !m.branchId) fail('担当者の営業所を先に設定してください。')
    const starts = instant(p.startsAt), ends = instant(p.endsAt)
    if (ends <= starts) fail('終了は開始より後にしてください。')
    if (p.id) {
      const old = await one(tx, 'SELECT * FROM "DealerErpActivity" WHERE "id"=$1 AND "dealerId"=$2', p.id, s.id)
      if (!old || (s.role !== 'ADMIN' && old.memberId !== s.memberId)) fail('予定を変更できません。', 403)
      if (num(p.version) !== old.version) fail('予定が更新されています。再読込してください。', 409)
    }
    const aid = p.id || id()
    await tx.$executeRawUnsafe('INSERT INTO "DealerErpActivity" ("id","dealerId","memberId","branchId","organizationId","orderId","kind","title","startsAt","endsAt","visibility","status","note","result") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) ON CONFLICT ("id") DO UPDATE SET "memberId"=$3,"branchId"=$4,"organizationId"=$5,"orderId"=$6,"kind"=$7,"title"=$8,"startsAt"=$9,"endsAt"=$10,"visibility"=$11,"status"=$12,"note"=$13,"result"=$14,"version"="DealerErpActivity"."version"+1', aid, s.id, m.id, m.branchId, p.organizationId || null, p.orderId || null, p.kind, text(p.title, '件名'), starts, ends, p.visibility, p.status, text(p.note, 'メモ', 4000, true), text(p.result, '活動結果', 4000, true))
    return { id: aid }
  }
  async function thread(tx, s, threadId) {
    const t = await one(tx, 'SELECT * FROM "DealerErpThread" WHERE "id"=$1 AND "dealerId"=$2', String(threadId || ''), s.id)
    if (!t) fail('会話が見つかりません。', 404)
    if (s.salon) {
      if (t.organizationId !== s.organizationId) fail('会話が見つかりません。', 404)
      const c = await one(tx, 'SELECT "id" FROM "WholesaleDealerContract" WHERE "dealerId"=$1 AND "organizationId"=$2 AND "status"=\'ACTIVE\'', s.id, s.organizationId)
      if (!c) fail('この取引先との連絡は利用できません。', 403)
    } else if (t.organizationId) await contract(tx, s, t.organizationId)
    else if (s.role !== 'ADMIN' && !t.memberIds.includes(s.memberId)) fail('会話が見つかりません。', 404)
    return t
  }
  async function createThread(tx, s, p) {
    const org = s.salon ? s.organizationId : p.organizationId || null
    let members = []
    if (org) {
      const c = s.salon ? await one(tx, 'SELECT * FROM "WholesaleDealerContract" WHERE "dealerId"=$1 AND "organizationId"=$2 AND "status"=\'ACTIVE\'', s.id, org) : await contract(tx, s, org)
      if (!c || c.status !== 'ACTIVE') fail('取引中のサロンを選択してください。')
    } else {
      const requested = [...new Set([s.memberId, ...(Array.isArray(p.memberIds) ? p.memberIds : [])])]
      if (requested.length < 2 || requested.length > 30) fail('連絡先の担当者を選んでください。')
      const rows = await tx.$queryRawUnsafe('SELECT "id" FROM "DealerSalesMember" WHERE "dealerId"=$1 AND "active" AND "id"=ANY($2::text[])', s.id, requested)
      if (rows.length !== requested.length) fail('連絡先を確認してください。')
      members = requested
    }
    if (p.orderId) {
      const o = s.salon ? await one(tx, 'SELECT * FROM "WholesaleOrder" WHERE "id"=$1 AND "dealerId"=$2 AND "organizationId"=$3', p.orderId, s.id, org) : await order(tx, s, p.orderId)
      if (!o || o.organizationId !== org) fail('受注とサロンが一致しません。')
    }
    const tid = id()
    await tx.$executeRawUnsafe('INSERT INTO "DealerErpThread" ("id","dealerId","organizationId","orderId","memberIds","subject") VALUES ($1,$2,$3,$4,$5::text[],$6)', tid, s.id, org, p.orderId || null, members, text(p.subject, '件名'))
    await sendMessage(tx, s, { threadId: tid, body: p.body })
    return { id: tid }
  }
  async function sendMessage(tx, s, p) {
    const t = await thread(tx, s, p.threadId)
    const result = await one(tx, 'INSERT INTO "DealerErpMessage" ("threadId","senderId","senderName","senderType","body") VALUES ($1,$2,$3,$4,$5) RETURNING "id"', t.id, actor(s), s.salon ? s.displayName : s.memberName, s.salon ? 'SALON' : 'DEALER', text(p.body, '本文', 4000))
    return clean(result)
  }
  async function markRead(tx, s, p) {
    const t = await thread(tx, s, p.threadId), messageId = num(p.messageId)
    if (messageId && !await one(tx, 'SELECT "id" FROM "DealerErpMessage" WHERE "id"=$1 AND "threadId"=$2', messageId, t.id)) fail('メッセージが見つかりません。', 404)
    await tx.$executeRawUnsafe('INSERT INTO "DealerErpRead" ("threadId","viewerId","messageId") VALUES ($1,$2,$3) ON CONFLICT ("threadId","viewerId") DO UPDATE SET "messageId"=GREATEST("DealerErpRead"."messageId",$3)', t.id, actor(s), messageId)
    return { read: true }
  }
  const actions = { warehouse: warehouseSave, location: locationSave, stock: stockChange, 'order-edit': orderEdit, reserve, ship, deliver, 'shipment-reverse': reverseShipment, return: returnGoods, purchase, receive: receivePurchase, invoice: issueInvoice, 'invoice-void': voidInvoice, payment: recordPayment, settle, 'settlement-undo': undoSettlement, 'payment-void': voidPayment, terms, 'branch-goal': branchGoal, activity: saveActivity, thread: createThread, message: sendMessage, read: markRead }
  async function command(s, action, p) {
    if (!actions[action] || (s.salon && !['thread', 'message', 'read'].includes(action))) fail('操作が見つかりません。', 404)
    const key = text(p.key, '再送防止キー', 100)
    const hash = crypto.createHash('sha256').update(JSON.stringify(canonical(p))).digest('hex')
    return db.$transaction(async tx => {
      // Serialize each dealer's ledger operations; every mutation and retry shares this lock.
      await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtextextended('dealer-erp:' || $1,0))", s.id)
      const previous = await one(tx, 'SELECT * FROM "DealerErpCommand" WHERE "dealerId"=$1 AND "key"=$2', s.id, key)
      if (previous) {
        if (previous.actorId !== actor(s) || previous.action !== action || previous.hash !== hash) fail('同じ再送キーで異なる操作はできません。', 409)
        return previous.result
      }
      const result = clean(await actions[action](tx, s, p))
      await tx.$executeRawUnsafe('INSERT INTO "DealerErpCommand" ("dealerId","key","actorId","action","hash","result") VALUES ($1,$2,$3,$4,$5,$6::jsonb)', s.id, key, actor(s), action, hash, JSON.stringify(result))
      return result
    }, { timeout: 30000, maxWait: 10000 })
  }

  async function options(s) {
    if (s.salon) return { viewer: { salon: true, name: s.displayName }, salons: [], members: [], branches: [], locations: [] }
    const salons = await db.$queryRawUnsafe(`SELECT c.*,o."name",o."publicCode",COALESCE(t."paymentDay",31) AS "paymentDay",COALESCE(t."paymentMonths",1) AS "paymentMonths",COALESCE(t."note",'') AS terms FROM "WholesaleDealerContract" c JOIN "Organization" o ON o."id"=c."organizationId" LEFT JOIN "DealerErpSalonTerms" t ON t."contractId"=c."id" WHERE c."dealerId"=$1 AND ($2::text IS NULL OR c."salesMemberId"=$2) ORDER BY o."name"`, s.id, scope(s))
    const members = await db.$queryRawUnsafe('SELECT "id","name","branchId","active" FROM "DealerSalesMember" WHERE "dealerId"=$1 AND "active" ORDER BY "name"', s.id)
    const branches = await db.$queryRawUnsafe('SELECT "id","name" FROM "DealerSalesBranch" WHERE "dealerId"=$1 AND "active" ORDER BY "name"', s.id)
    const locations = await db.$queryRawUnsafe('SELECT l.*,w."name" AS warehouse,w."branchId" FROM "DealerErpLocation" l JOIN "DealerErpWarehouse" w ON w."id"=l."warehouseId" WHERE l."dealerId"=$1 AND ($2::boolean OR w."branchId" IS NULL OR w."branchId"=$3) ORDER BY w."name",l."name"', s.id, s.role === 'ADMIN', s.branchId || null)
    return { viewer: { role: s.role, memberId: s.memberId, name: s.memberName }, salons, members, branches, locations }
  }
  function pagination(q) {
    const page = num(q.get('page') || 1, 1, 1000000)
    return { page, offset: (page - 1) * 30 }
  }
  async function paged(sql, params, q, ordering) {
    const { page, offset } = pagination(q)
    const count = await one(db, `SELECT COUNT(*)::int AS total FROM (${sql}) source`, ...params)
    const rows = await db.$queryRawUnsafe(`${sql} ${ordering} LIMIT 30 OFFSET $${params.length + 1}`, ...params, offset)
    return clean({ rows, total: count.total, page, pages: Math.max(1, Math.ceil(count.total / 30)) })
  }
  async function inventory(s, q) {
    const filter = '%' + text(q.get('q') || '', '検索', 160, true).normalize('NFKC') + '%'
    const sql = `SELECT st.*,p."name",p."productCode",p."manufacturerName",p."category",l."name" AS location,w."name" AS warehouse,w."branchId" FROM "DealerErpStock" st JOIN "WholesaleDealerProduct" p ON p."id"=st."productId" JOIN "DealerErpLocation" l ON l."id"=st."locationId" JOIN "DealerErpWarehouse" w ON w."id"=l."warehouseId" WHERE st."dealerId"=$1 AND ($2::boolean OR w."branchId" IS NULL OR w."branchId"=$3) AND normalize(p."name"||' '||p."productCode"||' '||p."manufacturerName",NFKC) ILIKE $4 AND ($5::text IS NULL OR l."id"=$5) AND (NOT $6::boolean OR st."onHand"-st."reserved"<=st."minimum")`
    return paged(sql, [s.id, s.role === 'ADMIN', s.branchId || null, filter, q.get('location') || null, q.get('low') === '1'], q, 'ORDER BY p."name",st."id"')
  }
  async function history(s, q) {
    return paged(`SELECT e.*,p."name",w."name" AS warehouse,l."name" AS location FROM "DealerErpStockEvent" e JOIN "DealerErpStock" st ON st."id"=e."stockId" JOIN "WholesaleDealerProduct" p ON p."id"=st."productId" JOIN "DealerErpLocation" l ON l."id"=st."locationId" JOIN "DealerErpWarehouse" w ON w."id"=l."warehouseId" WHERE e."dealerId"=$1 AND ($2::boolean OR w."branchId" IS NULL OR w."branchId"=$3) AND ($4::text IS NULL OR st."id"=$4)`, [s.id, s.role === 'ADMIN', s.branchId || null, q.get('stock') || null], q, 'ORDER BY e."createdAt" DESC,e."id"')
  }
  async function products(s, q) {
    return paged(`SELECT "id","name","productCode","manufacturerName","category" FROM "WholesaleDealerProduct" WHERE "dealerId"=$1 AND "active" AND normalize("name"||' '||"productCode"||' '||"manufacturerName",NFKC) ILIKE $2`, [s.id, '%' + String(q.get('q') || '').normalize('NFKC').slice(0, 160) + '%'], q, 'ORDER BY "name","id"')
  }
  async function orders(s, q) {
    return paged(`SELECT o.*,org."name" AS salon,e."orderId" IS NOT NULL AS tracked,
      COALESCE((SELECT SUM(l."quantity"-COALESCE(el."cancelled",0)) FROM "WholesaleOrderLine" l LEFT JOIN "DealerErpOrderLine" el ON el."lineId"=l."id" WHERE l."orderId"=o."id"),0)::int AS quantity,
      COALESCE((SELECT SUM(sl."quantity") FROM "DealerErpShipment" sh JOIN "DealerErpShipmentLine" sl ON sl."shipmentId"=sh."id" WHERE sh."orderId"=o."id" AND sh."status"<>'REVERSED'),0)::int AS shipped,
      COALESCE((SELECT SUM(sl."quantity") FROM "DealerErpShipment" sh JOIN "DealerErpShipmentLine" sl ON sl."shipmentId"=sh."id" WHERE sh."orderId"=o."id" AND sh."status"='DELIVERED'),0)::int AS delivered
      FROM "WholesaleOrder" o JOIN "Organization" org ON org."id"=o."organizationId" LEFT JOIN "DealerErpOrder" e ON e."orderId"=o."id" WHERE o."dealerId"=$1 AND ($2::text IS NULL OR o."salesMemberId"=$2) AND ($3::text IS NULL OR o."organizationId"=$3) AND ($4::text IS NULL OR o."salesBranchId"=$4) AND ($5::text IS NULL OR o."status"=$5) AND (o."orderNo"||' '||org."name") ILIKE $6`, [s.id, scope(s) || q.get('member') || null, q.get('salon') || null, q.get('branch') || null, q.get('status') || null, '%' + (q.get('q') || '').slice(0, 160) + '%'], q, 'ORDER BY o."orderedAt" DESC,o."id"')
  }
  async function orderDetail(s, orderId) {
    return db.$transaction(async tx => {
      const o = await order(tx, s, orderId)
      const items = await lines(tx, o.id)
      const shipments = await tx.$queryRawUnsafe('SELECT sh.*,COALESCE((SELECT jsonb_agg(l ORDER BY l."id") FROM "DealerErpShipmentLine" l WHERE l."shipmentId"=sh."id"),\'[]\'::jsonb) AS lines FROM "DealerErpShipment" sh WHERE sh."orderId"=$1 ORDER BY sh."shippedAt" DESC,sh."id"', o.id)
      const allocations = await tx.$queryRawUnsafe('SELECT a.*,st."locationId" FROM "DealerErpAllocation" a JOIN "DealerErpStock" st ON st."id"=a."stockId" JOIN "WholesaleOrderLine" l ON l."id"=a."lineId" WHERE l."orderId"=$1 AND a."quantity">0', o.id)
      return clean({ order: o, lines: items, shipments, allocations })
    })
  }
  async function purchases(s, q) {
    admin(s)
    return paged(`SELECT p.*,COALESCE((SELECT jsonb_agg(jsonb_build_object('id',l."id",'productId',l."productId",'name',pr."name",'productCode',pr."productCode",'quantity',l."quantity",'received',l."received",'unitCost',l."unitCost") ORDER BY l."id") FROM "DealerErpPurchaseLine" l JOIN "WholesaleDealerProduct" pr ON pr."id"=l."productId" WHERE l."purchaseId"=p."id"),'[]'::jsonb) AS lines FROM "DealerErpPurchase" p WHERE p."dealerId"=$1 AND ($2::text IS NULL OR p."status"=$2)`, [s.id, q.get('status') || null], q, 'ORDER BY p."createdAt" DESC,p."id"')
  }
  async function receivables(s, q) {
    const base = `SELECT i.*,o."name" AS salon,COALESCE((SELECT SUM(a."amountYen") FROM "DealerErpSettlement" a WHERE a."invoiceId"=i."id"),0)::float8 AS paid FROM "DealerErpInvoice" i JOIN "Organization" o ON o."id"=i."organizationId" JOIN "WholesaleDealerContract" c ON c."organizationId"=i."organizationId" AND c."dealerId"=i."dealerId" WHERE i."dealerId"=$1 AND ($2::text IS NULL OR c."salesMemberId"=$2) AND ($3::text IS NULL OR i."organizationId"=$3)`
    const args = [s.id, scope(s), q.get('salon') || null]
    const result = await paged(`SELECT x.* FROM (${base}) x WHERE (NOT $4::boolean OR (NOT x."voided" AND x."totalYen"<>x.paid))`, [...args, q.get('open') === '1'], q, 'ORDER BY x."createdAt" DESC,x."id"')
    const unbilled = await db.$queryRawUnsafe(`SELECT ch."organizationId",o."name",SUM(ch."quantity"*ch."unitPrice")::float8 AS amount,COUNT(*)::int AS count FROM "DealerErpCharge" ch JOIN "Organization" o ON o."id"=ch."organizationId" JOIN "WholesaleDealerContract" c ON c."organizationId"=ch."organizationId" AND c."dealerId"=ch."dealerId" WHERE ch."dealerId"=$1 AND ch."invoiceId" IS NULL AND ($2::text IS NULL OR c."salesMemberId"=$2) AND ($3::text IS NULL OR ch."organizationId"=$3) GROUP BY 1,2 ORDER BY o."name"`, ...args)
    const totals = await one(db, `SELECT COALESCE(SUM("totalYen"-paid) FILTER (WHERE NOT voided),0)::float8 AS outstanding,COALESCE(SUM("totalYen"-paid) FILTER (WHERE NOT voided AND "dueDate"<(NOW() AT TIME ZONE 'Asia/Tokyo')::date AND "totalYen">paid),0)::float8 AS overdue FROM (${base}) x`, ...args)
    return { ...result, unbilled, ...totals }
  }
  async function payments(s, q) {
    admin(s)
    return paged(`SELECT p.*,o."name" AS salon,COALESCE((SELECT SUM(a."amountYen") FROM "DealerErpSettlement" a WHERE a."paymentId"=p."id"),0)::float8 AS allocated,COALESCE((SELECT jsonb_agg(jsonb_build_object('id',a."id",'invoiceId',a."invoiceId",'documentNo',i."documentNo",'amountYen',a."amountYen",'reversed',EXISTS(SELECT 1 FROM "DealerErpSettlement" r WHERE r."reversesId"=a."id"))) FROM "DealerErpSettlement" a JOIN "DealerErpInvoice" i ON i."id"=a."invoiceId" WHERE a."paymentId"=p."id" AND a."reversesId" IS NULL),'[]'::jsonb) AS settlements FROM "DealerErpPayment" p JOIN "Organization" o ON o."id"=p."organizationId" WHERE p."dealerId"=$1 AND ($2::text IS NULL OR p."organizationId"=$2)`, [s.id, q.get('salon') || null], q, 'ORDER BY p."paidDate" DESC,p."createdAt" DESC,p."id"')
  }
  async function activities(s, q) {
    const r = monthRange(q.get('month'))
    return paged(`SELECT a.*,m."name" AS member,o."name" AS salon,b."name" AS branch FROM "DealerErpActivity" a JOIN "DealerSalesMember" m ON m."id"=a."memberId" LEFT JOIN "Organization" o ON o."id"=a."organizationId" LEFT JOIN "DealerSalesBranch" b ON b."id"=a."branchId" WHERE a."dealerId"=$1 AND a."endsAt">=$2 AND a."startsAt"<$3 AND ($4::boolean OR a."memberId"=$5 OR a."visibility"='DEALER' OR (a."visibility"='BRANCH' AND a."branchId"=$6)) AND ($7::text IS NULL OR a."memberId"=$7) AND ($8::text IS NULL OR a."branchId"=$8)`, [s.id, r.start, r.end, s.role === 'ADMIN', s.memberId, s.branchId || null, q.get('member') || null, q.get('branch') || null], q, 'ORDER BY a."startsAt",a."id"')
  }
  async function threads(s, q, unreadOnly = false) {
    const sql = `SELECT t.*,o."name" AS salon,COALESCE((SELECT MAX(m."createdAt") FROM "DealerErpMessage" m WHERE m."threadId"=t."id"),t."createdAt") AS updated,
      (SELECT COUNT(*)::int FROM "DealerErpMessage" m WHERE m."threadId"=t."id" AND m."senderId"<>$2 AND m."id">COALESCE((SELECT r."messageId" FROM "DealerErpRead" r WHERE r."threadId"=t."id" AND r."viewerId"=$2),0)) AS unread
      FROM "DealerErpThread" t LEFT JOIN "Organization" o ON o."id"=t."organizationId" WHERE t."dealerId"=$1 AND (CASE WHEN $3::boolean THEN t."organizationId"=$4 AND EXISTS(SELECT 1 FROM "WholesaleDealerContract" c WHERE c."dealerId"=t."dealerId" AND c."organizationId"=t."organizationId" AND c."status"='ACTIVE') ELSE $5::boolean OR (t."organizationId" IS NULL AND $6=ANY(t."memberIds")) OR EXISTS(SELECT 1 FROM "WholesaleDealerContract" c WHERE c."dealerId"=t."dealerId" AND c."organizationId"=t."organizationId" AND c."salesMemberId"=$6) END)`
    const params = [s.id, actor(s), !!s.salon, s.organizationId || null, s.role === 'ADMIN', s.memberId || '']
    if (unreadOnly) return one(db, `SELECT COALESCE(SUM(unread),0)::int AS unread FROM (${sql}) t`, ...params)
    return paged(sql, params, q, 'ORDER BY updated DESC,t."id"')
  }
  async function messages(s, q) {
    const t = await thread(db, s, q.get('thread'))
    const before = q.get('before') ? num(q.get('before'), 1) : null
    const rows = await db.$queryRawUnsafe('SELECT * FROM "DealerErpMessage" WHERE "threadId"=$1 AND ($2::bigint IS NULL OR "id"<$2) ORDER BY "id" DESC LIMIT 51', t.id, before)
    const more = rows.length > 50
    return clean({ thread: t, rows: rows.slice(0, 50).reverse(), more })
  }
  function factsSql() {
    return `WITH facts AS (
      SELECT ch."organizationId",ch."salesMemberId",ch."salesBranchId",ch."closingDay" AS "billingClosingDay",ch."category",ch."productId",ch."productName",ch."productCode",ch."orderId",ch."quantity"::bigint AS quantity,(ch."quantity"::bigint*ch."unitPrice") AS amount,ch."occurredAt" AS at,'actual' AS kind FROM "DealerErpCharge" ch WHERE ch."dealerId"=$1
      UNION ALL SELECT o."organizationId",o."salesMemberId",o."salesBranchId",o."billingClosingDay",COALESCE(NULLIF(l."category",''),'未分類'),l."dealerProductId",l."productName",l."productCode",o."id",l."deliveredQuantity"::bigint,l."lineTotal"::bigint,o."deliveredAt",'actual' FROM "WholesaleOrder" o JOIN "WholesaleOrderLine" l ON l."orderId"=o."id" WHERE o."dealerId"=$1 AND o."status"='DELIVERED' AND NOT EXISTS(SELECT 1 FROM "DealerErpOrder" e WHERE e."orderId"=o."id")
      UNION ALL SELECT o."organizationId",o."salesMemberId",o."salesBranchId",o."billingClosingDay",COALESCE(NULLIF(l."category",''),'未分類'),l."dealerProductId",l."productName",l."productCode",o."id",(l."quantity"-COALESCE(e."cancelled",0))::bigint,l."lineTotal"::bigint,o."orderedAt",'forecast' FROM "WholesaleOrder" o JOIN "WholesaleOrderLine" l ON l."orderId"=o."id" LEFT JOIN "DealerErpOrderLine" e ON e."lineId"=l."id" WHERE o."dealerId"=$1 AND o."status"<>'CANCELLED'
    ),filtered AS (SELECT * FROM facts WHERE at>=$2 AND at<$3 AND ($4::text IS NULL OR "organizationId"=$4) AND ($5::text IS NULL OR "salesMemberId"=$5) AND ($6::text IS NULL OR "salesBranchId"=$6) AND ($7::int IS NULL OR "billingClosingDay"=$7)) `
  }
  async function report(s, q) {
    return db.$transaction(tx => reportSnapshot(s, q, tx), { isolationLevel: 'RepeatableRead', timeout: 30000 })
  }
  async function reportSnapshot(s, q, snapshot) {
    const db = snapshot
    const r = monthRange(q.get('month'))
    const params = [s.id, r.start, r.end, q.get('salon') || null, scope(s) || q.get('member') || null, q.get('branch') || null, q.get('closing') ? num(q.get('closing'), 1, 31) : null]
    const cte = factsSql(), sums = `COALESCE(SUM(amount) FILTER(WHERE kind='actual'),0)::float8 AS "actualYen",COALESCE(SUM(amount) FILTER(WHERE kind='forecast'),0)::float8 AS "forecastYen"`
    const summary = await one(snapshot, cte + `SELECT ${sums},COUNT(DISTINCT "orderId") FILTER(WHERE kind='actual')::int AS "deliveredCount",COUNT(DISTINCT "orderId") FILTER(WHERE kind='forecast')::int AS "orderCount",COUNT(DISTINCT "orderId") FILTER(WHERE "salesMemberId" IS NULL)::int AS "unassignedCount" FROM filtered`, ...params)
    const categories = await snapshot.$queryRawUnsafe(cte + `SELECT category,${sums} FROM filtered GROUP BY category ORDER BY "actualYen" DESC,category`, ...params)
    const salons = await snapshot.$queryRawUnsafe(cte + `SELECT f."organizationId" AS id,o."name",${sums},COUNT(DISTINCT f."orderId") FILTER(WHERE kind='actual')::int AS count FROM filtered f JOIN "Organization" o ON o."id"=f."organizationId" GROUP BY 1,2 ORDER BY "actualYen" DESC,o."name"`, ...params)
    const progress = await db.$queryRawUnsafe(cte + `,totals AS (SELECT "salesMemberId",${sums} FROM filtered GROUP BY 1),acquired AS (SELECT c."acquisitionMemberId",COUNT(*)::int AS count FROM "WholesaleDealerContract" c WHERE c."dealerId"=$1 AND c."approvedAt">=$2 AND c."approvedAt"<$3 AND ($4::text IS NULL OR c."organizationId"=$4) AND ($5::text IS NULL OR c."acquisitionMemberId"=$5) AND ($6::text IS NULL OR c."acquisitionBranchId"=$6) AND ($7::int IS NULL OR c."billingClosingDay"=$7) GROUP BY 1) SELECT m."id",m."name",m."branchId",m."active",COALESCE(t."actualYen",0)::float8 AS "actualYen",COALESCE(t."forecastYen",0)::float8 AS "forecastYen",COALESCE(a.count,0)::int AS "acquisitionCount",COALESCE(g."salesTargetYen",0)::float8 AS "salesTargetYen",COALESCE(g."acquisitionTarget",0)::int AS "acquisitionTarget" FROM "DealerSalesMember" m LEFT JOIN totals t ON t."salesMemberId"=m."id" LEFT JOIN acquired a ON a."acquisitionMemberId"=m."id" LEFT JOIN "DealerSalesGoal" g ON g."memberId"=m."id" AND g."monthKey"=$8 WHERE m."dealerId"=$1 AND ($5::text IS NULL OR m."id"=$5) AND ($6::text IS NULL OR m."branchId"=$6 OR t."actualYen"<>0 OR t."forecastYen"<>0 OR a.count>0) ORDER BY m."name",m."id"`, ...params, r.key)
    const products = await db.$queryRawUnsafe(cte + `SELECT COALESCE("productId","productCode",'') AS id,"productName","productCode",${sums},COALESCE(SUM(quantity) FILTER(WHERE kind='actual'),0)::int AS quantity FROM filtered GROUP BY 1,2,3 ORDER BY "actualYen" DESC,"productName" LIMIT 100`, ...params)
    const branches = await db.$queryRawUnsafe(cte + `,totals AS (SELECT "salesBranchId",${sums} FROM filtered GROUP BY 1),acquired AS (SELECT "acquisitionBranchId",COUNT(*)::int AS count FROM "WholesaleDealerContract" WHERE "dealerId"=$1 AND "approvedAt">=$2 AND "approvedAt"<$3 AND ($4::text IS NULL OR "organizationId"=$4) AND ($5::text IS NULL OR "acquisitionMemberId"=$5) AND ($6::text IS NULL OR "acquisitionBranchId"=$6) AND ($7::int IS NULL OR "billingClosingDay"=$7) GROUP BY 1) SELECT b."id",b."name",COALESCE(t."actualYen",0)::float8 AS "actualYen",COALESCE(t."forecastYen",0)::float8 AS "forecastYen",COALESCE(a.count,0)::int AS "acquisitionCount",COALESCE(g."salesTargetYen",0)::float8 AS "salesTargetYen",COALESCE(g."acquisitionTarget",0)::int AS "acquisitionTarget" FROM "DealerSalesBranch" b LEFT JOIN totals t ON t."salesBranchId"=b."id" LEFT JOIN acquired a ON a."acquisitionBranchId"=b."id" LEFT JOIN "DealerErpBranchGoal" g ON g."branchId"=b."id" AND g."month"=$8 WHERE b."dealerId"=$1 AND ($6::text IS NULL OR b."id"=$6) ORDER BY b."name"`, ...params, r.key)
    return { month: r.key, summary, categories, salons, progress, products, branches }
  }
  async function dashboard(s, q) {
    const sales = await report(s, q)
    const finance = await receivables(s, new URLSearchParams({ ...(q.get('salon') ? { salon: q.get('salon') } : {}) }))
    const logistics = await one(db, `SELECT COUNT(*) FILTER(WHERE o."status" IN ('ORDERED','ACCEPTED'))::int AS open,COUNT(*) FILTER(WHERE o."status"='SHIPPED')::int AS shipping FROM "WholesaleOrder" o WHERE o."dealerId"=$1 AND ($2::text IS NULL OR o."salesMemberId"=$2)`, s.id, scope(s))
    const stock = await one(db, 'SELECT COUNT(*)::int AS locations,COALESCE(SUM(st."onHand"),0)::float8 AS onhand,COUNT(*) FILTER(WHERE st."onHand"-st."reserved"<=st."minimum")::int AS low FROM "DealerErpStock" st JOIN "DealerErpLocation" l ON l."id"=st."locationId" JOIN "DealerErpWarehouse" w ON w."id"=l."warehouseId" WHERE st."dealerId"=$1 AND ($2::boolean OR w."branchId" IS NULL OR w."branchId"=$3)', s.id, s.role === 'ADMIN', s.branchId || null)
    const audits = s.role === 'ADMIN' ? await db.$queryRawUnsafe('SELECT "actorId","action","createdAt","result" FROM "DealerErpCommand" WHERE "dealerId"=$1 AND "action"<>\'read\' ORDER BY "createdAt" DESC LIMIT 30', s.id) : []
    return { ...sales, finance: { outstanding: finance.outstanding, overdue: finance.overdue, unbilled: finance.unbilled.reduce((n, r) => n + r.amount, 0) }, logistics, stock, audits }
  }
  function documentPage(title, number, issuer, salon, rows, footer, watermark = '') {
    return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} ${esc(number)}</title><style>body{font:14px sans-serif;color:#222;margin:32px auto;max-width:980px;padding:0 24px}header,section{display:flex;justify-content:space-between;gap:24px;margin:24px 0}h1{font-size:28px}table{width:100%;border-collapse:collapse}th,td{padding:12px 8px;border-bottom:1px solid #ccc;text-align:right}th:first-child,td:first-child{text-align:left}dl{margin-left:auto;width:340px}dl div{display:flex;justify-content:space-between;padding:8px}dd{margin:0}small{display:block;color:#666}button{padding:12px;font:inherit}a{color:#444}p{white-space:pre-wrap}aside{font-weight:bold;color:#a22}@media print{button,.back{display:none}body{margin:0;padding:0}tr{break-inside:avoid}}</style></head><body><button onclick="window.print()">印刷</button> <a class="back" href="/dealer/${title === '納品書' ? 'fulfillment' : 'receivables'}">一覧へ戻る</a><header><div><h1>${esc(title)}</h1><p>${esc(number)}</p><aside>${esc(watermark)}</aside></div><div><strong>${esc(issuer.name)}</strong><p>${esc(issuer.address || '')}</p><p>${esc(issuer.phone || '')}</p>${issuer.invoiceRegistrationNumber ? `<small>登録番号 ${esc(issuer.invoiceRegistrationNumber)}</small>` : ''}</div></header><section><h2>${esc(salon.name)} 御中</h2></section><table><thead><tr><th>商品名 / コード</th><th>数量</th><th>定価（税抜）</th><th>金額（税抜）</th></tr></thead><tbody>${rows.map(l => `<tr><td>${esc(l.productName)}<small>${esc(l.productCode)}</small></td><td>${l.quantity}</td><td>${yen(l.listPrice)}</td><td>${yen(l.quantity * l.listPrice)}</td></tr>`).join('')}</tbody></table>${footer}</body></html>`
  }
  async function printInvoice(s, iid) {
    const inv = await invoice(db, s, iid), snap = inv.snapshot
    return documentPage('請求書', inv.documentNo, snap.issuer, snap.salon, snap.lines,
      `<p>締日 ${String(inv.closingDate).slice(0, 10)} / 支払期日 ${String(inv.dueDate).slice(0, 10)}</p><dl><div><dt>定価合計</dt><dd>${yen(inv.listYen)}</dd></div><div><dt>合計値引額</dt><dd>${yen(-inv.discountYen)}</dd></div><div><dt>税抜小計</dt><dd>${yen(inv.subtotalYen)}</dd></div>${snap.taxes.map(t => `<div><dt>消費税 ${t.rate}%（対象 ${yen(t.subtotal)}）</dt><dd>${yen(t.tax)}</dd></div>`).join('')}<div><dt><strong>請求合計</strong></dt><dd><strong>${yen(inv.totalYen)}</strong></dd></div></dl>`, inv.voided ? '取消済み: ' + inv.voidReason : inv.totalYen < 0 ? '返金・相殺対象' : '')
  }
  async function printShipment(s, sid) {
    const { sh, o, items } = await shipment(db, s, sid)
    const salon = await one(db, 'SELECT "name" FROM "Organization" WHERE "id"=$1', o.organizationId)
    const issuer = await one(db, 'SELECT "name","address","phone" FROM "WholesaleDealer" WHERE "id"=$1', s.id)
    return documentPage('納品書', sh.documentNo, issuer, salon, items, `<p>受注番号 ${esc(o.orderNo)} / 出荷日 ${esc(sh.shippedAt.toISOString().slice(0, 10))}</p><dl><div><dt>定価合計（税抜）</dt><dd>${yen(items.reduce((n, l) => n + l.quantity * l.listPrice, 0))}</dd></div></dl>`, sh.status === 'REVERSED' ? '取消済み' : '')
  }
  const views = { operations: '業務ダッシュボード', inventory: '倉庫・在庫', fulfillment: '出荷・納品', receivables: '請求・入金', activities: '営業予定・活動', messages: '連絡' }
  function page(s, view) {
    if (s.salon) return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>取引先との連絡 | ORIMIA</title><link rel="stylesheet" href="/wholesale-ordering-v543.css?v=653-password-layout1"><link rel="stylesheet" href="/dealer-erp-v678.css?v=1"></head><body class="wo-body" data-dealer-view="messages" data-erp-salon="${esc(s.id)}"><main class="erp-salon"><a href="/admin/products/orders">発注管理へ戻る</a><h1>取引先との連絡</h1><div id="wholesale-app"></div></main><script src="/dealer-erp-v678-client.js?v=1" defer></script></body></html>`
    return h.portal(s, view).replace('/wholesale-ordering-client-v543.js?v=659-product-search-filters1', '/dealer-erp-v678-client.js?v=1')
  }
  async function legacyGuard(tx, s, orderId, target) {
    await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtextextended('dealer-erp:' || $1,0))", s.id)
    const o = await order(tx, s, orderId)
    if (o.tracked || target === 'SHIPPED') fail('この受注は「出荷・納品」で引当・出荷・納品を操作してください。', 409)
  }
  async function handle(req, res, url) {
    const p = url.pathname.replace(/\/$/, '')
    const assets = { '/dealer-erp-v678-client.js': 'application/javascript', '/dealer-erp-v678-nav.js': 'application/javascript', '/dealer-erp-v678.css': 'text/css' }
    if (assets[p] && req.method === 'GET') { res.setHeader('Content-Type', assets[p] + '; charset=utf-8'); res.setHeader('Cache-Control', 'public,max-age=31536000,immutable'); res.end(fs.readFileSync(path.join(__dirname, p.slice(1)))); return true }
    const view = p.startsWith('/dealer/') && views[p.slice(8)] ? p.slice(8) : null
    const salonPage = p === '/admin/dealer-messages', salonApi = p.startsWith('/api/admin/wholesale/erp/')
    const api = p.startsWith('/api/dealer/erp/') || salonApi
    const document = p.match(/^\/dealer\/erp\/(invoice|shipment)\/([^/]+)$/)
    const oldDocument = p.match(/^\/dealer\/orders\/([^/]+)\/(invoice|delivery-note)$/)
    if (!view && !salonPage && !api && !document && !oldDocument) return false
    let s
    try {
      if (salonPage || salonApi) {
        const salon = await h.adminSession(req)
        if (!salon) { if (api) fail('ログインし直してください。', 401); h.redirect(res, '/admin/login?next=' + encodeURIComponent(req.url), 302); return true }
        const dealerId = String(url.searchParams.get('dealer') || '')
        const allowed = await one(db, 'SELECT c."dealerId" FROM "WholesaleDealerContract" c JOIN "WholesaleDealer" d ON d."id"=c."dealerId" WHERE c."organizationId"=$1 AND c."dealerId"=$2 AND c."status"=\'ACTIVE\' AND d."active"', salon.organizationId, dealerId)
        if (!allowed) fail('取引先を選択してください。', 403)
        s = { ...salon, id: dealerId, salon: true }
      } else s = await h.session(req)
      if (!s) { if (api) fail('ログインし直してください。', 401); h.redirect(res, '/dealer/login', 302); return true }
      if (s.staffUserId && s.mustChangePassword) { if (api) fail('初期パスワードを変更してください。', 428); h.redirect(res, '/dealer/password-change', 302); return true }
      if (oldDocument) {
        const found = await one(db, 'SELECT e."orderId" FROM "DealerErpOrder" e JOIN "WholesaleOrder" o ON o."id"=e."orderId" WHERE e."orderId"=$1 AND e."dealerId"=$2 AND ($3::text IS NULL OR o."salesMemberId"=$3)', decodeURIComponent(oldDocument[1]), s.id, scope(s))
        if (!found) return false
        h.redirect(res, oldDocument[2] === 'invoice' ? '/dealer/receivables' : '/dealer/fulfillment?order=' + encodeURIComponent(found.orderId), 302); return true
      }
      if ((view || salonPage) && req.method === 'GET') { h.html(res, 200, page(s, view || 'messages')); return true }
      if (document && req.method === 'GET') { h.html(res, 200, document[1] === 'invoice' ? await printInvoice(s, decodeURIComponent(document[2])) : await printShipment(s, decodeURIComponent(document[2]))); return true }
      if (!api) fail('この操作は許可されていません。', 405)
      const name = p.split('/').pop(), q = url.searchParams
      if (req.method === 'GET') {
        if (s.salon && !['options', 'threads', 'messages', 'unread'].includes(name)) fail('ページが見つかりません。', 404)
        if (name === 'report.csv') {
          const r = await report(s, q)
          res.setHeader('Content-Type', 'text/csv; charset=utf-8'); res.setHeader('Content-Disposition', 'attachment; filename="dealer-report.csv"'); res.end(csv([['対象月', '集計区分', '名称', '納品売上（税抜）', '受注見込み（税抜）'], ...['categories', 'salons', 'progress', 'branches'].flatMap(group => r[group].map(row => [r.month, { categories: 'カテゴリー', salons: 'サロン', progress: '担当者', branches: '営業所' }[group], row.name || row.category, row.actualYen, row.forecastYen]))])); return true
        }
        const getters = { options, inventory, history, products, orders, purchases, receivables, payments, activities, threads, messages, dashboard, report, unread: (s,q) => threads(s,q,true), order: (s, q) => orderDetail(s, q.get('id')) }
        if (!getters[name]) fail('ページが見つかりません。', 404)
        h.json(res, 200, { ok: true, ...clean(await getters[name](s, q)) }); return true
      }
      if (req.method !== 'POST') fail('この操作は許可されていません。', 405)
      if (!h.sameOrigin(req)) fail('送信元を確認できませんでした。', 403)
      const result = await command(s, name, await h.readPayload(req))
      h.json(res, 200, { ok: true, ...result }); return true
    } catch (error) {
      const conflict = error.code === 'P2010' && error.meta?.code === '23505'
      const status = error.status || (conflict ? 409 : 500)
      if (status === 500) console.error('[dealer-erp-v678]', { path: p, message: error.message })
      h.json(res, status, { ok: false, error: error.status ? error.message : conflict ? '同じ名称・番号が登録済みです。' : '処理できませんでした。入力内容を保持したまま再試行してください。' }); return true
    }
  }
  return { ensureSchema, command, handle, report, legacyGuard, orderDetail }
}
module.exports = { createDealerErp, date, instant, csv, clean }
