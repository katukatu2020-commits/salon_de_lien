'use strict'

const fs = require('node:fs')
const path = require('node:path')
const { randomUUID } = require('node:crypto')
const { sameOrigin } = require('./hotpepper-origin-v600')
const {
  failure,
  menuPageUrl,
  parseMenuPage,
  retrieveMenuPage,
} = require('./hotpepper-menu-parser-v612')

const RELEASE = 'hotpepper-menu-import-v612'
const ENDPOINT = '/api/lien-hotpepper-menus-v612'
const JOB_TABLE = 'HotpepperMenuImportJobV612'
const MAX_JSON_BYTES = 256 * 1024
const ACTIVE_STATUSES = new Set(['PREVIEW', 'IMPORTING'])

function json(res, status, payload) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'private, no-store, max-age=0')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.end(JSON.stringify(payload))
}

async function readJson(req) {
  const declared = Number(req.headers['content-length'] || 0)
  if (declared > MAX_JSON_BYTES) throw failure('送信内容が大きすぎます。', 413)
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > MAX_JSON_BYTES) throw failure('送信内容が大きすぎます。', 413)
    chunks.push(chunk)
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
  } catch {
    throw failure('送信内容を確認してください。')
  }
}

function text(value, maxLength, label, required = false) {
  const result = String(value ?? '').replace(/\r\n/g, '\n').trim()
  if ((required && !result) || result.length > maxLength) {
    throw failure(`${label}は${required ? `1〜${maxLength}` : `0〜${maxLength}`}文字で入力してください。`)
  }
  return result
}

function identity(value) {
  return String(value || '')
    .normalize('NFKC')
    .toLocaleLowerCase('ja-JP')
    .replace(/[\s　]/g, '')
}

function integer(value, minimum, maximum, label) {
  const result = Number(value)
  if (!Number.isInteger(result) || result < minimum || result > maximum) {
    throw failure(`${label}は${minimum}〜${maximum}の整数で入力してください。`)
  }
  return result
}

function menuInput(value) {
  return {
    name: text(value?.name, 140, 'メニュー名', true),
    category: text(value?.category, 80, 'カテゴリ', true),
    description: text(value?.description, 1200, '説明'),
    durationMinutes: integer(value?.durationMinutes, 1, 1440, '施術時間'),
    priceYen: integer(value?.priceYen, 0, 10_000_000, '税込価格'),
    priceIsMinimum: value?.priceIsMinimum === true,
  }
}

function itemPublic(item, index) {
  return {
    index,
    status: item.status,
    menuId: item.menuId || null,
    error: item.error || '',
    sourceKey: item.sourceKey,
    name: item.name,
    category: item.category,
    description: item.description || '',
    durationMinutes: Number(item.durationMinutes || 0),
    durationEstimated: item.durationEstimated === true,
    priceYen: Number(item.priceYen || 0),
    priceDisplay: item.priceDisplay || '',
    priceIsMinimum: item.priceIsMinimum === true,
  }
}

function summary(job) {
  if (!job) return null
  const items = Array.isArray(job.items) ? job.items : []
  const selectedIndices = Array.isArray(job.selectedIndices) ? job.selectedIndices : []
  const selected = new Set(selectedIndices)
  const selectedItems = items.filter((_, index) => selected.has(index))
  return {
    id: job.id,
    status: job.status,
    sourceUrl: job.sourceUrl,
    salonName: job.salonName || '',
    startedAt: job.startedAt,
    confirmedAt: job.confirmedAt || null,
    sourceWarnings: Array.isArray(job.sourceWarnings) ? job.sourceWarnings : [],
    total: items.length,
    available: items.filter(item => item.status === 'READY').length,
    duplicate: items.filter(item => item.status === 'DUPLICATE').length,
    skipped: items.filter(item => item.status === 'SKIPPED').length,
    imported: items.filter(item => item.status === 'IMPORTED').length,
    failed: items.filter(item => item.status === 'ERROR').length,
    selected: selectedItems.length,
    processed: selectedItems.filter(item => ['IMPORTED', 'DUPLICATE', 'ERROR', 'SKIPPED'].includes(item.status)).length,
    items: items.map(itemPublic),
  }
}

function createHotpepperMenuImportService({ prisma, sessionProvider, fetchRemote = retrieveMenuPage }) {
  let schemaPromise = null

  async function ensureSchema() {
    if (!schemaPromise) {
      schemaPromise = (async () => {
        await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "SalonMenu" (
          "id" TEXT PRIMARY KEY,
          "organizationId" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "category" TEXT NOT NULL,
          "description" TEXT,
          "durationMinutes" INTEGER NOT NULL,
          "priceYen" INTEGER NOT NULL,
          "source" TEXT NOT NULL DEFAULT 'manual',
          "sourceKey" TEXT,
          "active" BOOLEAN NOT NULL DEFAULT TRUE,
          "sortOrder" INTEGER NOT NULL DEFAULT 0,
          "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE("organizationId","name")
        )`)
        await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "SalonMenu_org_active_idx" ON "SalonMenu"("organizationId","active","sortOrder")`)
        await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "SalonMenu_hotpepper_source_idx_v612" ON "SalonMenu"("organizationId","sourceKey") WHERE "source"='hotpepper'`)
        await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "${JOB_TABLE}" (
          "organizationId" TEXT PRIMARY KEY,
          "data" JSONB NOT NULL,
          "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`)
      })().catch(error => {
        schemaPromise = null
        throw error
      })
    }
    await schemaPromise
  }

  async function jobRow(db, organizationId) {
    await db.$executeRawUnsafe(`INSERT INTO "${JOB_TABLE}" ("organizationId","data") VALUES ($1,'null'::jsonb) ON CONFLICT DO NOTHING`, organizationId)
    const rows = await db.$queryRawUnsafe(`SELECT "data" FROM "${JOB_TABLE}" WHERE "organizationId"=$1 FOR UPDATE`, organizationId)
    return rows[0]?.data || null
  }

  async function persistJob(db, organizationId, job) {
    await db.$executeRawUnsafe(
      `UPDATE "${JOB_TABLE}" SET "data"=$1::jsonb,"updatedAt"=NOW() WHERE "organizationId"=$2`,
      JSON.stringify(job),
      organizationId,
    )
  }

  async function start(input, session) {
    if (input.rightsConfirmed !== true) {
      throw failure('自店舗の掲載内容を取り込む権限を確認してください。')
    }
    const target = menuPageUrl(input.url)
    const parsed = parseMenuPage(await fetchRemote(target.url), target.url)

    return prisma.$transaction(async db => {
      const previous = await jobRow(db, session.organizationId)
      if (previous && ACTIVE_STATUSES.has(previous.status)) {
        throw failure('進行中のメニュー取り込みを再開するか、中止してください。', 409)
      }
      if (previous?.startedAt && Date.now() - Number(previous.startedAt) < 5_000) {
        throw failure('続けて開始する場合は数秒お待ちください。', 429)
      }

      const existing = await db.$queryRawUnsafe(
        `SELECT "id","name","sourceKey" FROM "SalonMenu" WHERE "organizationId"=$1`,
        session.organizationId,
      )
      const bySource = new Map(existing.filter(row => row.sourceKey).map(row => [String(row.sourceKey), String(row.id)]))
      const byName = new Map(existing.map(row => [identity(row.name), String(row.id)]))
      const items = parsed.items.map(item => {
        const existingMenuId = bySource.get(item.sourceKey) || byName.get(identity(item.name)) || null
        return {
          ...item,
          status: existingMenuId ? 'DUPLICATE' : 'READY',
          menuId: existingMenuId,
          error: '',
        }
      })
      const job = {
        id: randomUUID(),
        status: 'PREVIEW',
        sourceUrl: parsed.sourceUrl,
        salonId: parsed.salonId,
        salonName: parsed.salonName,
        sourceWarnings: parsed.sourceWarnings,
        startedAt: Date.now(),
        startedBy: session.userId,
        rightsConfirmedAt: new Date().toISOString(),
        selectedIndices: [],
        items,
      }
      await persistJob(db, session.organizationId, job)
      return summary(job)
    })
  }

  async function mutate(input, session) {
    return prisma.$transaction(async db => {
      const job = await jobRow(db, session.organizationId)
      if (!job || job.id !== input.jobId) {
        throw failure('取り込み情報が更新されています。画面を開き直してください。', 409)
      }

      if (input.action === 'edit') {
        if (job.status !== 'PREVIEW') throw failure('取り込み前の確認中のみ編集できます。', 409)
        const index = integer(input.index, 0, job.items.length - 1, '編集対象')
        const item = job.items[index]
        if (!item || item.status !== 'READY') throw failure('編集できるメニューがありません。', 409)
        const edited = menuInput(input.menu)
        const duplicateInPreview = job.items.some((candidate, candidateIndex) => (
          candidateIndex !== index
          && candidate.status !== 'DUPLICATE'
          && identity(candidate.name) === identity(edited.name)
        ))
        if (duplicateInPreview) throw failure('確認一覧に同じメニュー名があります。名称を変更してください。')
        const existing = await db.$queryRawUnsafe(
          `SELECT "id" FROM "SalonMenu" WHERE "organizationId"=$1 AND ("sourceKey"=$2 OR LOWER(BTRIM("name"))=LOWER(BTRIM($3))) LIMIT 1`,
          session.organizationId,
          item.sourceKey,
          edited.name,
        )
        if (existing[0]?.id) throw failure('同じメニューがすでに登録されています。', 409)
        Object.assign(item, edited, {
          durationEstimated: false,
          priceDisplay: `${edited.priceYen.toLocaleString('ja-JP')}円`,
        })
      } else if (input.action === 'confirm') {
        if (job.status !== 'PREVIEW') throw failure('件数の確認が完了してから取り込んでください。', 409)
        if (input.rightsConfirmed !== true) throw failure('取り込み内容と権限を確認してください。')
        if (Number(input.total) !== job.items.length) throw failure('取り込み件数が更新されています。もう一度確認してください。', 409)
        const selected = [...new Set(Array.isArray(input.indices) ? input.indices.map(Number) : [])]
          .filter(index => Number.isInteger(index) && index >= 0 && index < job.items.length && job.items[index].status === 'READY')
        if (!selected.length) throw failure('取り込むメニューを1件以上選択してください。')
        const selectedSet = new Set(selected)
        job.items.forEach((item, index) => {
          if (item.status === 'READY') item.status = selectedSet.has(index) ? 'QUEUED' : 'SKIPPED'
        })
        job.selectedIndices = selected
        job.status = 'IMPORTING'
        job.confirmedAt = new Date().toISOString()
        job.confirmedBy = session.userId
      } else if (input.action === 'tick') {
        if (job.status === 'IMPORTING') {
          const locks = await db.$queryRawUnsafe('SELECT pg_try_advisory_xact_lock(hashtext($1),612) AS "locked"', session.organizationId)
          if (locks[0]?.locked) {
            const item = job.items.find(candidate => candidate.status === 'QUEUED')
            if (item) {
              const existing = await db.$queryRawUnsafe(
                `SELECT "id" FROM "SalonMenu" WHERE "organizationId"=$1 AND ("sourceKey"=$2 OR LOWER(BTRIM("name"))=LOWER(BTRIM($3))) LIMIT 1`,
                session.organizationId,
                item.sourceKey,
                item.name,
              )
              if (existing[0]?.id) {
                item.status = 'DUPLICATE'
                item.menuId = String(existing[0].id)
              } else {
                try {
                  const inserted = await db.$queryRawUnsafe(
                    `INSERT INTO "SalonMenu" ("id","organizationId","name","category","description","durationMinutes","priceYen","source","sourceKey","sortOrder")
                     VALUES ($1,$2,$3,$4,$5,$6,$7,'hotpepper',$8,$9)
                     ON CONFLICT ("organizationId","name") DO NOTHING
                     RETURNING "id"`,
                    `menu-hotpepper-${randomUUID()}`,
                    session.organizationId,
                    item.name,
                    item.category,
                    item.description || null,
                    item.durationMinutes,
                    item.priceYen,
                    item.sourceKey,
                    9000 + Number(item.sourceOrder || 0),
                  )
                  if (inserted[0]?.id) {
                    item.status = 'IMPORTED'
                    item.menuId = String(inserted[0].id)
                    item.importedAt = new Date().toISOString()
                  } else {
                    const conflict = await db.$queryRawUnsafe(
                      `SELECT "id" FROM "SalonMenu" WHERE "organizationId"=$1 AND "name"=$2 LIMIT 1`,
                      session.organizationId,
                      item.name,
                    )
                    item.status = 'DUPLICATE'
                    item.menuId = conflict[0]?.id ? String(conflict[0].id) : null
                  }
                } catch (error) {
                  item.status = 'ERROR'
                  item.error = 'メニューを保存できませんでした。再試行してください。'
                  console.error(`[${RELEASE}]`, { action: 'insert-menu', name: String(error?.name || 'Error').slice(0, 80) })
                }
              }
            }
            if (!job.items.some(candidate => candidate.status === 'QUEUED')) {
              job.status = 'DONE'
              job.completedAt = new Date().toISOString()
            }
          }
        }
      } else if (input.action === 'retry') {
        if (!['DONE', 'IMPORTING'].includes(job.status)) throw failure('処理が完了してから再試行してください。', 409)
        let count = 0
        job.items.forEach(item => {
          if (item.status === 'ERROR') {
            item.status = 'QUEUED'
            item.error = ''
            count += 1
          }
        })
        if (!count) throw failure('再試行するメニューはありません。')
        job.status = 'IMPORTING'
        job.completedAt = null
      } else if (input.action === 'cancel') {
        if (!['PREVIEW', 'IMPORTING'].includes(job.status)) throw failure('進行中の取り込みはありません。', 409)
        job.items.forEach(item => {
          if (['READY', 'QUEUED'].includes(item.status)) item.status = 'SKIPPED'
        })
        job.status = 'CANCELLED'
        job.cancelledAt = new Date().toISOString()
        job.cancelledBy = session.userId
      } else {
        throw failure('操作内容を確認してください。')
      }

      await persistJob(db, session.organizationId, job)
      return summary(job)
    })
  }

  async function operate(input, session) {
    if (input.action === 'start') return start(input, session)
    return mutate(input, session)
  }

  async function handle(req, res, url) {
    if (url.pathname === '/hotpepper-menu-import-v612.js' && req.method === 'GET') {
      res.statusCode = 200
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
      res.setHeader('X-Content-Type-Options', 'nosniff')
      fs.createReadStream(path.join('/app/public', 'hotpepper-menu-import-v612.js')).pipe(res)
      return true
    }
    if (url.pathname === '/hotpepper-menu-import-v612.css' && req.method === 'GET') {
      res.statusCode = 200
      res.setHeader('Content-Type', 'text/css; charset=utf-8')
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
      res.setHeader('X-Content-Type-Options', 'nosniff')
      fs.createReadStream(path.join('/app/public', 'hotpepper-menu-import-v612.css')).pipe(res)
      return true
    }
    if (url.pathname !== ENDPOINT) return false

    try {
      const session = await sessionProvider(req)
      if (!session?.organizationId || !session?.userId || !['ADMIN', 'STAFF'].includes(String(session.role))) {
        throw failure('店舗アカウントでログインしてください。', 401)
      }
      await ensureSchema()
      if (req.method === 'GET') {
        const rows = await prisma.$queryRawUnsafe(`SELECT "data" FROM "${JOB_TABLE}" WHERE "organizationId"=$1 LIMIT 1`, session.organizationId)
        json(res, 200, { job: summary(rows[0]?.data) })
      } else if (req.method === 'POST') {
        if (!sameOrigin(req)) throw failure('操作元を確認できませんでした。ページを再読み込みして再試行してください。', 403)
        json(res, 200, { job: await operate(await readJson(req), session) })
      } else {
        res.setHeader('Allow', 'GET, POST')
        throw failure('操作内容を確認してください。', 405)
      }
    } catch (error) {
      const status = Number(error?.status) || 500
      console.error(`[${RELEASE}]`, { path: url.pathname, status, name: String(error?.name || 'Error').slice(0, 80) })
      json(res, status, { error: status < 500 ? error.message : 'メニューの取り込み処理を完了できませんでした。再試行してください。' })
    }
    return true
  }

  return { ensureSchema, handle, operate }
}

module.exports = {
  createHotpepperMenuImportService,
  __test: { identity, itemPublic, menuInput, readJson, summary },
}
