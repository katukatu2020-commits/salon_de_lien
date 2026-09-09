'use strict'

const { pageUrl, parseList, parseDetail, retrieve, failure } = require('./hotpepper-parser-v596')
const { normalizeMetadata } = require('./style-metadata-v596')
const { randomUUID } = require('node:crypto')
const { sameOrigin } = require('./hotpepper-origin-v600')
const MAX_STYLES = 1000
const endpoint = '/api/lien-hotpepper-styles'
const json = (res, status, body) => { res.statusCode = status; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 'private, no-store'); res.setHeader('X-Content-Type-Options', 'nosniff'); res.end(JSON.stringify(body)) }

async function readJson(req) {
  const chunks = []; let size = 0
  for await (const chunk of req) { size += chunk.length; if (size > 64000) throw failure('送信内容が大きすぎます。', 413); chunks.push(chunk) }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}') } catch { throw failure('送信内容を確認してください。') }
}
function summary(job, offset = 0) {
  if (!job) return null
  const items = job.items || []
  return {
    id: job.id, status: job.status, automatic: job.automatic === true, sourceUrl: job.sourceUrl, salonName: job.salonName || '', error: job.error || '', fatal: Boolean(job.fatal),
    confirmedAt: job.confirmedAt || null,
    total: items.length, discoveredPages: job.visited.length, remainingPages: job.pages.length,
    loaded: items.filter(i => i.data).length, failed: items.filter(i => i.status === 'ERROR').length,
    published: items.filter(i => i.status === 'PUBLISHED').length, duplicate: items.filter(i => i.status === 'DUPLICATE').length,
    ready: items.filter(i => i.status === 'READY').length,
    processed: items.filter(i => ['PUBLISHED', 'DUPLICATE', 'ERROR'].includes(i.status)).length,
    pending: items.filter(i => ['PENDING', 'READY', 'QUEUED'].includes(i.status)).length,
    items: items.slice(offset, offset + 25).map((item, index) => ({ ...item, index: offset + index })), offset,
  }
}

function createHotpepperImportService({ prisma, publishing, sessionProvider, fetchRemote = retrieve }) {
  async function ensureSchema() {
    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "StyleImportJobV596" (
      "organizationId" TEXT PRIMARY KEY, "data" JSONB NOT NULL, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
    )`)
  }
  async function existing(db, organizationId, url) {
    const posts = await db.$queryRawUnsafe('SELECT "id" FROM "VisitCommunityPost" WHERE "organizationId"=$1 AND "sourceUrl"=$2 LIMIT 1', organizationId, url)
    return posts[0]?.id
  }
  async function step(db, job, session) {
    if (!['SCANNING', 'PUBLISHING', 'DISCOVERING', 'IMPORTING'].includes(job.status)) return
    const locks = await db.$queryRawUnsafe('SELECT pg_try_advisory_xact_lock(596, 1) AS "locked"')
    if (!locks[0].locked || (job.nextAt && Date.now() < job.nextAt)) return
    job.error = ''
    if (['SCANNING', 'DISCOVERING'].includes(job.status)) {
      if (job.pages.length) {
        const url = job.pages[0]
        const page = parseList(await fetchRemote(url, 'page', job.salonId), url)
        job.salonName = page.salonName
        job.pages.shift(); job.visited.push(url)
        for (const next of page.pages) if (!job.visited.includes(next) && !job.pages.includes(next)) job.pages.push(next)
        for (const sourceUrl of page.styles) if (!job.items.some(item => item.url === sourceUrl)) {
          if (job.items.length >= MAX_STYLES) throw Object.assign(failure('一度に取得できる上限（1,000スタイル）を超えました。取り込みを中止して店舗へご確認ください。', 422), { fatal: true })
          job.items.push({ url: sourceUrl, status: 'PENDING' })
        }
        if (job.visited.length + job.pages.length > 100) throw Object.assign(failure('取得ページ数の上限を超えました。取り込みを中止してください。', 422), { fatal: true })
      }
      if (job.status === 'DISCOVERING' && !job.pages.length) {
        const rows = await db.$queryRawUnsafe('SELECT "id","sourceUrl" FROM "VisitCommunityPost" WHERE "organizationId"=$1 AND "sourceUrl"=ANY($2::text[])', session.organizationId, job.items.map(i => i.url))
        const matches = new Map(rows.map(row => [row.sourceUrl, row.id]))
        for (const item of job.items) if (matches.has(item.url)) { item.status = 'DUPLICATE'; item.postId = matches.get(item.url) }
        job.status = 'CONFIRMATION'
      } else if (!job.pages.length && job.status === 'SCANNING') {
        const item = job.items.find(i => i.status === 'PENDING')
        if (item) {
          const postId = await existing(db, session.organizationId, item.url)
          if (postId) { item.status = 'DUPLICATE'; item.postId = postId }
          else {
            try { item.data = parseDetail(await fetchRemote(item.url, 'page', job.salonId), item.url); item.status = 'READY'; item.error = '' }
            catch (error) { if (error.status === 429) throw error; item.status = 'ERROR'; item.error = error.status ? error.message : '取得できませんでした。' }
          }
        }
        if (!job.items.some(i => i.status === 'PENDING')) job.status = 'READY'
      }
    } else {
      const item = job.items.find(i => job.status === 'IMPORTING' ? ['PENDING', 'READY', 'QUEUED'].includes(i.status) : i.status === 'QUEUED')
      if (item) {
        const postId = await existing(db, session.organizationId, item.url)
        if (postId) { item.status = 'DUPLICATE'; item.postId = postId }
        else {
          try {
            if (!item.data) item.data = parseDetail(await fetchRemote(item.url, 'page', job.salonId), item.url)
            const photos = []
            for (const photo of item.data.photos) {
              const remote = await fetchRemote(photo.url, 'image')
              photos.push({ direction: photo.direction, dataUrl: `data:${remote.type};base64,${remote.buffer.toString('base64')}` })
            }
            const metadata = { ...normalizeMetadata(item.data), salonName: job.salonName, salonArea: item.data.salonArea || '', stylistUrl: item.data.stylistUrl || '', sourceUrl: item.url }
            let stylistPhoto = null
            if (item.data.stylistPhotoUrl) {
              const remote = await fetchRemote(item.data.stylistPhotoUrl, 'image')
              stylistPhoto = { dataUrl: `data:${remote.type};base64,${remote.buffer.toString('base64')}` }
            }
            const result = await publishing.savePost({ caption: '', photos, stylistPhoto, metadata, rightsConfirmed: true }, session, { db, imported: true, sourceUrl: item.url })
            item.postId = result.postId; item.status = 'PUBLISHED'; item.error = ''
          } catch (error) {
            if (error.status === 429) throw error
            item.status = 'ERROR'; item.error = error.status ? error.message : '写真または投稿を保存できませんでした。'
          }
        }
      }
      if (!job.items.some(i => job.status === 'IMPORTING' ? ['PENDING', 'READY', 'QUEUED'].includes(i.status) : i.status === 'QUEUED')) job.status = 'DONE'
    }
    job.nextAt = Date.now() + 3000
  }

  async function operate(input, session) {
    return prisma.$transaction(async db => {
      await db.$executeRawUnsafe('INSERT INTO "StyleImportJobV596" ("organizationId","data") VALUES ($1,\'null\'::jsonb) ON CONFLICT DO NOTHING', session.organizationId)
      const [row] = await db.$queryRawUnsafe('SELECT "data" FROM "StyleImportJobV596" WHERE "organizationId"=$1 FOR UPDATE', session.organizationId)
      let job = row.data
      if (input.action === 'start') {
        if (input.rightsConfirmed !== true) throw failure('店舗オーナーの許可と、写真・文章の転載に必要な権利・同意を確認してください。')
        const target = pageUrl(String(input.url || '').trim())
        if (job && !['DONE', 'CANCELLED'].includes(job.status)) throw failure('前回の取り込みを再開するか、中止してください。', 409)
        if (job?.startedAt && Date.now() - job.startedAt < 60000) throw failure('次の取り込みは1分後に開始できます。', 429)
        const rootUrl = `https://beauty.hotpepper.jp/sln${target.salonId}/style/`
        job = { id: randomUUID(), status: 'DISCOVERING', automatic: true, sourceUrl: rootUrl, salonId: target.salonId, pages: [rootUrl], visited: [], items: [], startedAt: Date.now(), actorId: session.userId, rightsConfirmedAt: new Date().toISOString() }
      } else {
        if (!job || job.id !== input.jobId) throw failure('取り込み情報が更新されています。画面を開き直してください。', 409)
        if (input.action === 'confirm') {
          if (job.status !== 'CONFIRMATION') throw failure('件数の確認が完了してから取り込んでください。', 409)
          if (input.rightsConfirmed !== true) throw failure('店舗オーナーの許可と掲載権限を確認してください。')
          if (input.total !== job.items.length) throw failure('取り込み件数が更新されています。もう一度確認してください。', 409)
          job.confirmedAt = new Date().toISOString(); job.confirmedBy = session.userId
          job.status = job.items.some(i => i.status !== 'DUPLICATE') ? 'IMPORTING' : 'DONE'
          job.nextAt = 0
        } else if (input.action === 'cancel') { job.status = 'CANCELLED'; job.items = []; job.pages = []; job.error = '' }
        else if (input.action === 'retry') {
          if (job.fatal) throw failure('取り込み上限を超えたため、再試行できません。取り込みを中止してください。', 422)
          if (!['PAUSED', 'READY', 'DONE'].includes(job.status)) throw failure('処理が終了してから再試行してください。', 409)
          if (job.automatic) {
            for (const item of job.items) if (item.status === 'ERROR') { item.status = item.data ? 'READY' : 'PENDING'; item.error = '' }
            job.status = job.confirmedAt ? 'IMPORTING' : job.pages.length ? 'DISCOVERING' : 'CONFIRMATION'
            job.error = ''; job.nextAt = Date.now() + (job.rateLimited ? 60000 : 0); job.rateLimited = false
          } else {
          const wasPublishing = job.resumeStatus === 'PUBLISHING'
          for (const item of job.items) if (item.status === 'ERROR') item.status = item.data ? 'READY' : 'PENDING'
          job.status = wasPublishing && job.items.some(i => i.status === 'QUEUED') ? 'PUBLISHING' : job.pages.length || job.items.some(i => i.status === 'PENDING') ? 'SCANNING' : 'READY'
          job.error = ''; job.nextAt = Date.now() + (job.rateLimited ? 60000 : 0); job.rateLimited = false
          }
        } else if (input.action === 'edit') {
          if (!['READY', 'DONE'].includes(job.status)) throw failure('読み込み完了後に編集してください。', 409)
          const item = job.items[input.index]
          if (!item?.data || item.status !== 'READY') throw failure('編集できるスタイルがありません。', 409)
          item.data = { ...item.data, ...normalizeMetadata(input.metadata) }
          if (!item.data.title) throw failure('スタイル名を入力してください。')
        } else if (input.action === 'publish') {
          if (!['READY', 'DONE'].includes(job.status)) throw failure('読み込みが完了してから公開してください。', 409)
          if (input.rightsConfirmed !== true) throw failure('公開する内容と掲載権限を確認してください。')
          const selected = new Set(Array.isArray(input.indices) ? input.indices : [])
          const excluded = new Set(Array.isArray(input.excluded) ? input.excluded : [])
          let count = 0
          job.items.forEach((item, index) => { if (item.status === 'READY' && (input.allReady === true ? !excluded.has(index) : selected.has(index))) { item.status = 'QUEUED'; count++ } })
          if (!count) throw failure('公開するスタイルを選択してください。')
          job.status = 'PUBLISHING'; job.publishedBy = session.userId
        } else if (input.action === 'step') {
          const previous = job.status
          try { await step(db, job, session) }
          catch (error) { job.status = 'PAUSED'; job.resumeStatus = previous; job.error = error.status ? error.message : '取り込みを一時停止しました。再試行してください。'; job.rateLimited = error.status === 429; job.fatal = Boolean(error.fatal) }
        } else throw failure('操作を確認してください。')
      }
      await db.$executeRawUnsafe('UPDATE "StyleImportJobV596" SET "data"=$1::jsonb,"updatedAt"=NOW() WHERE "organizationId"=$2', JSON.stringify(job), session.organizationId)
      return summary(job, Number(input.offset) >= 0 ? Math.floor(Number(input.offset)) : 0)
    }, { timeout: 120000, maxWait: 10000 })
  }

  async function handle(req, res, url) {
    if (url.pathname !== endpoint) return false
    const session = await sessionProvider(req)
    if (!session?.organizationId || !['ADMIN', 'STAFF', 'OWNER', 'MANAGER'].includes(session.role)) { json(res, 401, { error: '店舗スタッフでログインしてください。' }); return true }
    try {
      if (req.method === 'GET') {
        const rows = await prisma.$queryRawUnsafe('SELECT "data" FROM "StyleImportJobV596" WHERE "organizationId"=$1', session.organizationId)
        json(res, 200, { job: summary(rows[0]?.data, Math.max(0, Math.floor(Number(url.searchParams.get('offset')) || 0))) })
      } else if (req.method === 'POST') {
        if (!sameOrigin(req)) throw failure('操作元を確認できませんでした。', 403)
        json(res, 200, { job: await operate(await readJson(req), session) })
      } else { res.setHeader('Allow', 'GET, POST'); json(res, 405, { error: '対応していない操作です。' }) }
    } catch (error) { json(res, Number(error.status) || 500, { error: error.status ? error.message : '取り込みを保存できませんでした。再試行してください。' }) }
    return true
  }
  return { ensureSchema, handle, operate }
}
module.exports = { createHotpepperImportService, __test: { summary, sameOrigin, readJson } }
