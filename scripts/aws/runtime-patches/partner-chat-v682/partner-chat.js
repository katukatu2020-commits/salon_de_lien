'use strict'

module.exports.createPartnerChat = ({ db, crypto, actor, scope, fail, text, num, clean }) => {
  const one = async (tx, sql, ...args) => (await tx.$queryRawUnsafe(sql, ...args))[0]
  const side = s => s.salon ? 'SALON' : 'DEALER'
  const subject = 'サロン・ディーラーチャット'
  async function partner(tx, s, partnerId) {
    const row = await one(tx, `SELECT c."dealerId",c."organizationId",c."salesMemberId",
      CASE WHEN $3 THEN d."name" ELSE o."name" END AS name,
      CASE WHEN $3 THEN d."dealerCode" ELSE c."customerCode" END AS code,m."name" AS "memberName"
      FROM "WholesaleDealerContract" c JOIN "WholesaleDealer" d ON d."id"=c."dealerId"
      JOIN "Organization" o ON o."id"=c."organizationId"
      LEFT JOIN "DealerSalesMember" m ON m."id"=c."salesMemberId"
      WHERE c."dealerId"=$1 AND c."organizationId"=$2 AND c."status"='ACTIVE' AND d."active"
      AND ($4::text IS NULL OR c."salesMemberId"=$4)`, s.id, s.salon ? s.organizationId : String(partnerId || ''), !!s.salon, s.salon ? null : scope(s))
    if (!row || (s.salon && partnerId !== s.id)) fail('契約中の取引先が見つかりません。', 404)
    return { ...row, id: s.salon ? row.dealerId : row.organizationId }
  }
  async function partners(s, q) {
    const page = num(q.get('page') || 1, 1, 1000000)
    const search = text(q.get('search'), '検索語', 100, true).normalize('NFKC')
    const params = [s.salon ? s.organizationId : s.id, !!s.salon, s.salon ? null : scope(s), actor(s), side(s), search, q.get('member') || null]
    const sql = `WITH partners AS (
      SELECT CASE WHEN $2 THEN c."dealerId" ELSE c."organizationId" END AS id,
        CASE WHEN $2 THEN d."name" ELSE o."name" END AS name,
        CASE WHEN $2 THEN d."dealerCode" ELSE c."customerCode" END AS code,
        c."salesMemberId" AS "memberId",sm."name" AS "memberName",
        latest.body AS preview,latest."createdAt" AS updated,COALESCE(unread.count,0)::int AS unread
      FROM "WholesaleDealerContract" c JOIN "WholesaleDealer" d ON d."id"=c."dealerId"
      JOIN "Organization" o ON o."id"=c."organizationId"
      LEFT JOIN "DealerSalesMember" sm ON sm."id"=c."salesMemberId"
      LEFT JOIN LATERAL (SELECT m.body,m."createdAt" FROM "DealerErpThread" t
        JOIN "DealerErpMessage" m ON m."threadId"=t.id
        WHERE t."dealerId"=c."dealerId" AND t."organizationId"=c."organizationId" ORDER BY m.id DESC LIMIT 1) latest ON TRUE
      LEFT JOIN LATERAL (SELECT COUNT(*) AS count FROM "DealerErpThread" t
        JOIN "DealerErpMessage" m ON m."threadId"=t.id
        LEFT JOIN "DealerErpRead" r ON r."threadId"=t.id AND r."viewerId"=$4
        WHERE t."dealerId"=c."dealerId" AND t."organizationId"=c."organizationId"
        AND m."senderType"<>$5 AND m.id>COALESCE(r."messageId",0)) unread ON TRUE
      WHERE c."status"='ACTIVE' AND d.active AND (CASE WHEN $2 THEN c."organizationId" ELSE c."dealerId" END)=$1
        AND ($3::text IS NULL OR c."salesMemberId"=$3)
    ), filtered AS (SELECT * FROM partners WHERE ($6='' OR POSITION(LOWER(normalize($6,NFKC)) IN LOWER(normalize(name||' '||COALESCE(code,''),NFKC)))>0)
      AND ($7::text IS NULL OR "memberId"=$7)) `
    const counts = await one(db, sql + `SELECT COUNT(*)::int AS total,COUNT(*) FILTER(WHERE unread>0)::int AS "unreadCount",COALESCE(SUM(unread),0)::int AS "unreadMessages" FROM filtered`, ...params)
    const unreadOnly = q.get('unread') === '1'
    const total = unreadOnly ? counts.unreadCount : counts.total
    const effectivePage = Math.min(page, Math.max(1, Math.ceil(total / 30)))
    const rows = await db.$queryRawUnsafe(sql + `SELECT * FROM filtered WHERE (NOT $8 OR unread>0) ORDER BY updated DESC NULLS LAST,name,id LIMIT 30 OFFSET $9`, ...params, unreadOnly, (effectivePage - 1) * 30)
    const members = s.salon ? [] : await db.$queryRawUnsafe(`SELECT DISTINCT m.id,m.name FROM "DealerSalesMember" m JOIN "WholesaleDealerContract" c ON c."salesMemberId"=m.id WHERE c."dealerId"=$1 AND c.status='ACTIVE' AND ($2::text IS NULL OR m.id=$2) ORDER BY m.name,m.id`, s.id, scope(s))
    return clean({ rows, counts, total, page: effectivePage, members })
  }
  async function messages(s, q) {
    const p = await partner(db, s, q.get('partner'))
    const before = q.get('before') ? num(q.get('before'), 1) : null
    const after = q.get('after') ? num(q.get('after'), 0) : null
    if (before && after !== null) fail('履歴の取得条件を確認してください。')
    const rows = await db.$queryRawUnsafe(`SELECT m.*,t.subject,t."orderId",o."orderNo" FROM "DealerErpMessage" m
      JOIN "DealerErpThread" t ON t.id=m."threadId" LEFT JOIN "WholesaleOrder" o ON o.id=t."orderId"
      WHERE t."dealerId"=$1 AND t."organizationId"=$2 AND ($3::bigint IS NULL OR m.id<$3) AND ($4::bigint IS NULL OR m.id>$4)
      ORDER BY m.id ${after === null ? 'DESC' : 'ASC'} LIMIT 51`, p.dealerId, p.organizationId, before, after)
    return clean({ partner: p, rows: after === null ? rows.slice(0, 50).reverse() : rows.slice(0, 50), more: rows.length > 50 })
  }
  async function send(tx, s, p) {
    const target = await partner(tx, s, p.partner)
    const body = text(p.body, 'メッセージ', 4000)
    // The ERP command transaction already holds the dealer lock, including first-message creation.
    let t = await one(tx, 'SELECT id FROM "DealerErpThread" WHERE "dealerId"=$1 AND "organizationId"=$2 AND "orderId" IS NULL AND subject=$3 ORDER BY "createdAt",id LIMIT 1', target.dealerId, target.organizationId, subject)
    if (!t) {
      t = { id: crypto.randomUUID() }
      await tx.$executeRawUnsafe('INSERT INTO "DealerErpThread" (id,"dealerId","organizationId","memberIds",subject) VALUES ($1,$2,$3,ARRAY[]::text[],$4)', t.id, target.dealerId, target.organizationId, subject)
    }
    const result = await one(tx, 'INSERT INTO "DealerErpMessage" ("threadId","senderId","senderName","senderType",body) VALUES ($1,$2,$3,$4,$5) RETURNING id', t.id, actor(s), (s.salon ? s.displayName : s.memberName) || (s.salon ? 'サロン担当者' : 'ディーラー担当者'), side(s), body)
    return clean(result)
  }
  async function read(tx, s, p) {
    const target = await partner(tx, s, p.partner), messageId = num(p.messageId, 1)
    if (!await one(tx, 'SELECT m.id FROM "DealerErpMessage" m JOIN "DealerErpThread" t ON t.id=m."threadId" WHERE m.id=$1 AND t."dealerId"=$2 AND t."organizationId"=$3', messageId, target.dealerId, target.organizationId)) fail('メッセージが見つかりません。', 404)
    // Do not mark messages arriving after the displayed cursor as read.
    await tx.$executeRawUnsafe(`INSERT INTO "DealerErpRead" ("threadId","viewerId","messageId")
      SELECT t.id,$1,MAX(m.id) FROM "DealerErpThread" t JOIN "DealerErpMessage" m ON m."threadId"=t.id
      WHERE t."dealerId"=$2 AND t."organizationId"=$3 AND m.id<=$4 GROUP BY t.id
      ON CONFLICT ("threadId","viewerId") DO UPDATE SET "messageId"=GREATEST("DealerErpRead"."messageId",EXCLUDED."messageId")`, actor(s), target.dealerId, target.organizationId, messageId)
    return { read: true }
  }
  return { partners, messages, send, read }
}
