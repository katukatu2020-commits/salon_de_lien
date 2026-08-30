'use strict'

const fs = require('node:fs')
const { GetObjectCommand, S3Client } = require('@aws-sdk/client-s3')
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner')

const PRIVATE_S3_PREFIX = 's3-private://'
let privateS3Client = null
let archiveSchemaPromise = null

function ensureArchiveSchema(prisma) {
  if (!archiveSchemaPromise) {
    archiveSchemaPromise = (async () => {
      await prisma.$executeRawUnsafe(
        'ALTER TABLE "VisitCommunityPost" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3)',
      )
      await prisma.$executeRawUnsafe(
        'ALTER TABLE "VisitCommunityPost" ADD COLUMN IF NOT EXISTS "deletedByUserId" TEXT',
      )
      await prisma.$executeRawUnsafe(
        'CREATE INDEX IF NOT EXISTS "VisitCommunityPost_org_deleted_idx" ON "VisitCommunityPost" ("organizationId", "deletedAt", "publishedAt" DESC)',
      )
    })().catch(error => {
      archiveSchemaPromise = null
      throw error
    })
  }
  return archiveSchemaPromise
}

async function resolvePostCoverReference(reference) {
  const value = String(reference || '').trim()
  if (!value) return null
  if (!value.startsWith(PRIVATE_S3_PREFIX)) return value

  const bucket = String(process.env.S3_PRIVATE_ASSETS_BUCKET || '').trim()
  const objectKey = value.slice(PRIVATE_S3_PREFIX.length)
  if (!bucket || !objectKey || objectKey.includes('..')) return null
  if (!privateS3Client) {
    privateS3Client = new S3Client({ region: process.env.AWS_REGION || 'ap-northeast-1' })
  }
  return getSignedUrl(
    privateS3Client,
    new GetObjectCommand({ Bucket: bucket, Key: objectKey }),
    { expiresIn: 300 },
  )
}

function json(res, status, payload) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'private, no-store, max-age=0')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.end(JSON.stringify(payload))
}

function sameOrigin(req) {
  const origin = String(req.headers.origin || '')
  if (!origin) return false
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim()
  const forwardedProtocol = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim()
  const protocol = forwardedProtocol || (req.socket?.encrypted ? 'https' : 'http')
  return origin === `${protocol}://${host}` || origin === 'https://salon-de-lien.com'
}

async function readJson(req, limit = 12 * 1024) {
  let raw = ''
  for await (const chunk of req) {
    raw += chunk
    if (Buffer.byteLength(raw, 'utf8') > limit) {
      throw Object.assign(new Error('送信内容が大きすぎます。'), { status: 413 })
    }
  }
  try {
    return raw ? JSON.parse(raw) : {}
  } catch {
    throw Object.assign(new Error('送信内容を確認してください。'), { status: 400 })
  }
}

function normalizedText(value, maxLength, label, allowEmpty = false) {
  const text = String(value ?? '').replace(/\r\n/g, '\n').trim()
  if ((!allowEmpty && !text) || text.length > maxLength) {
    throw Object.assign(new Error(`${label}は${allowEmpty ? `0〜${maxLength}` : `1〜${maxLength}`}文字で入力してください。`), { status: 400 })
  }
  return text
}

function canManagePost(session, audience, post) {
  if (!session || !post) return false
  if (audience === 'staff') return true
  return post.postKind === 'VISIT' && String(post.customerId || '') === String(session.customerId || '')
}

function canManageComment(session, comment) {
  return Boolean(session && comment && session.userId && String(comment.appUserId || '') === String(session.userId))
}

function canManageChatMessage(session, audience, message, canAccessThread) {
  if (!session || !message || !session.userId) return false
  if (String(message.senderType || '') !== audience || String(message.senderUserId || '') !== String(session.userId)) return false
  if (audience === 'customer') return String(message.customerId || '') === String(session.customerId || '')
  return Boolean(canAccessThread(session, message))
}

function createContentManagementService({ prisma, staffSessionProvider, customerSessionProvider, canAccessThread, resolvePostCover = resolvePostCoverReference }) {
  const sessionFor = (req, audience) => audience === 'staff' ? staffSessionProvider(req) : customerSessionProvider(req)

  async function postList(res, session, audience) {
    await ensureArchiveSchema(prisma)
    if (audience !== 'staff') return json(res, 403, { error: '店舗スタッフのみ利用できます。' })
    const posts = await prisma.$queryRawUnsafe(
      `SELECT p."id",p."postKind",p."caption",p."published",p."publishedAt",p."publishedByName",p."updatedAt",
              COALESCE(NULLIF(p."photoReferences"[1],''),vp."storageReference") AS "coverPhotoReference"
         FROM "VisitCommunityPost" p
         LEFT JOIN LATERAL (
           SELECT "storageReference"
             FROM "VisitPhoto"
            WHERE "visitId"=p."visitId"
            ORDER BY "createdAt" DESC,"id" DESC
            LIMIT 1
         ) vp ON TRUE
        WHERE p."organizationId"=$1 AND p."deletedAt" IS NULL
        ORDER BY p."publishedAt" DESC,p."id" DESC
        LIMIT 300`,
      session.organizationId,
    )
    const resolvedPosts = await Promise.all(posts.map(async post => ({
      id: post.id,
      postKind: post.postKind,
      caption: post.caption || '',
      published: Boolean(post.published),
      publishedAt: post.publishedAt,
      publishedByName: post.publishedByName || '',
      updatedAt: post.updatedAt,
      coverPhotoUrl: await resolvePostCover(post.coverPhotoReference),
      canChangeVisibility: true,
      canDelete: true,
    })))
    return json(res, 200, {
      posts: resolvedPosts,
    })
  }

  async function contentGet(req, res, url, session, audience) {
    await ensureArchiveSchema(prisma)
    if (url.searchParams.get('scope') === 'posts') return postList(res, session, audience)

    const postId = String(url.searchParams.get('postId') || '').trim()
    if (!postId) return json(res, 400, { error: '投稿を指定してください。' })
    const posts = await prisma.$queryRawUnsafe(
      'SELECT "id","organizationId","customerId","postKind","caption","published","updatedAt" FROM "VisitCommunityPost" WHERE "id"=$1 AND "organizationId"=$2 AND "deletedAt" IS NULL LIMIT 1',
      postId,
      session.organizationId,
    )
    const post = posts[0]
    if (!post || (audience !== 'staff' && !post.published)) return json(res, 404, { error: '投稿が見つかりません。' })
    const comments = await prisma.$queryRawUnsafe(
      'SELECT "id","appUserId","authorDisplayName","body","createdAt","updatedAt" FROM "VisitCommunityComment" WHERE "postId"=$1 AND "deletedAt" IS NULL AND "isAiAssistant"=FALSE ORDER BY "createdAt" ASC LIMIT 100',
      post.id,
    )
    return json(res, 200, {
      post: {
        id: post.id,
        caption: post.caption || '',
        published: Boolean(post.published),
        canEdit: canManagePost(session, audience, post),
        canDelete: canManagePost(session, audience, post),
        canChangeVisibility: audience === 'staff',
      },
      comments: comments.map(comment => ({
        id: comment.id,
        authorDisplayName: comment.authorDisplayName,
        body: comment.body,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
        canEdit: canManageComment(session, comment),
        canDelete: canManageComment(session, comment),
      })),
    })
  }

  async function contentMutation(req, res, session, audience) {
    await ensureArchiveSchema(prisma)
    if (!sameOrigin(req)) return json(res, 403, { error: '安全のため操作を完了できませんでした。' })
    const input = await readJson(req)
    const target = String(input.target || '')
    const postId = String(input.postId || '').trim()
    if (!postId) return json(res, 400, { error: '投稿を指定してください。' })
    const posts = await prisma.$queryRawUnsafe(
      'SELECT "id","organizationId","customerId","postKind","published" FROM "VisitCommunityPost" WHERE "id"=$1 AND "organizationId"=$2 AND "deletedAt" IS NULL LIMIT 1',
      postId,
      session.organizationId,
    )
    const post = posts[0]
    if (!post) return json(res, 404, { error: '投稿が見つかりません。' })

    if (target === 'post') {
      if (!canManagePost(session, audience, post)) return json(res, 403, { error: 'この投稿を変更する権限がありません。' })
      if (req.method === 'PATCH') {
        if (input.action === 'visibility') {
          if (audience !== 'staff') return json(res, 403, { error: '公開状態は店舗スタッフのみ変更できます。' })
          if (typeof input.published !== 'boolean') return json(res, 400, { error: '公開状態を確認してください。' })
          await prisma.$executeRawUnsafe(
            'UPDATE "VisitCommunityPost" SET "published"=$1,"updatedAt"=CURRENT_TIMESTAMP WHERE "id"=$2 AND "organizationId"=$3',
            input.published,
            post.id,
            session.organizationId,
          )
          return json(res, 200, { success: true, published: input.published })
        }

        const caption = normalizedText(input.body, 300, '投稿文', true)
        await prisma.$executeRawUnsafe(
          'UPDATE "VisitCommunityPost" SET "caption"=$1,"updatedAt"=CURRENT_TIMESTAMP WHERE "id"=$2 AND "organizationId"=$3',
          caption || null,
          post.id,
          session.organizationId,
        )
        return json(res, 200, { success: true, body: caption })
      }
      if (req.method === 'DELETE') {
        await prisma.$executeRawUnsafe(
          'UPDATE "VisitCommunityPost" SET "published"=FALSE,"deletedAt"=CURRENT_TIMESTAMP,"deletedByUserId"=$1,"updatedAt"=CURRENT_TIMESTAMP WHERE "id"=$2 AND "organizationId"=$3 AND "deletedAt" IS NULL',
          session.userId || null,
          post.id,
          session.organizationId,
        )
        console.info('[style-community-recovery-v482] post archived', {
          organizationId: session.organizationId,
          userId: session.userId || null,
          postId: post.id,
        })
        return json(res, 200, { success: true, archived: true })
      }
    }

    if (target === 'comment') {
      const commentId = String(input.id || '').trim()
      const comments = await prisma.$queryRawUnsafe(
        'SELECT "id","postId","appUserId" FROM "VisitCommunityComment" WHERE "id"=$1 AND "postId"=$2 AND "deletedAt" IS NULL LIMIT 1',
        commentId,
        post.id,
      )
      const comment = comments[0]
      if (!comment) return json(res, 404, { error: 'コメントが見つかりません。' })
      if (!canManageComment(session, comment)) return json(res, 403, { error: 'このコメントを変更する権限がありません。' })
      if (req.method === 'PATCH') {
        const body = normalizedText(input.body, 300, 'コメント')
        await prisma.$executeRawUnsafe(
          'UPDATE "VisitCommunityComment" SET "body"=$1,"updatedAt"=CURRENT_TIMESTAMP WHERE "id"=$2 AND "postId"=$3 AND "deletedAt" IS NULL',
          body,
          comment.id,
          post.id,
        )
        return json(res, 200, { success: true, body })
      }
      if (req.method === 'DELETE') {
        await prisma.$executeRawUnsafe(
          'UPDATE "VisitCommunityComment" SET "deletedAt"=CURRENT_TIMESTAMP,"updatedAt"=CURRENT_TIMESTAMP WHERE "id"=$1 AND "postId"=$2 AND "deletedAt" IS NULL',
          comment.id,
          post.id,
        )
        return json(res, 200, { success: true })
      }
    }

    return json(res, 405, { error: '操作を確認してください。' })
  }

  async function chatMutation(req, res, session, audience) {
    if (!sameOrigin(req)) return json(res, 403, { error: '安全のため操作を完了できませんでした。' })
    const input = await readJson(req)
    const messageId = String(input.messageId || '').trim()
    if (!messageId) return json(res, 400, { error: 'メッセージを指定してください。' })
    const messages = await prisma.$queryRawUnsafe(
      'SELECT m."id",m."threadId",m."senderType",m."senderUserId",t."organizationId",t."customerId",t."staffKey",t."staffName" FROM "ChatMessage" m JOIN "ChatThread" t ON t."id"=m."threadId" WHERE m."id"=$1 AND t."organizationId"=$2 LIMIT 1',
      messageId,
      session.organizationId,
    )
    const message = messages[0]
    if (!message) return json(res, 404, { error: 'メッセージが見つかりません。' })
    if (!canManageChatMessage(session, audience, message, canAccessThread)) return json(res, 403, { error: 'このメッセージを変更する権限がありません。' })

    if (req.method === 'PATCH') {
      const body = normalizedText(input.body, 2000, 'メッセージ')
      await prisma.$transaction([
        prisma.$executeRawUnsafe('UPDATE "ChatMessage" SET "body"=$1 WHERE "id"=$2 AND "senderUserId"=$3', body, message.id, session.userId),
        prisma.$executeRawUnsafe('UPDATE "ChatThread" SET "updatedAt"=CURRENT_TIMESTAMP WHERE "id"=$1', message.threadId),
      ])
      return json(res, 200, { success: true, body })
    }
    if (req.method === 'DELETE') {
      await prisma.$transaction([
        prisma.$executeRawUnsafe('DELETE FROM "ChatMessage" WHERE "id"=$1 AND "senderUserId"=$2', message.id, session.userId),
        prisma.$executeRawUnsafe('UPDATE "ChatThread" SET "updatedAt"=CURRENT_TIMESTAMP WHERE "id"=$1', message.threadId),
      ])
      return json(res, 200, { success: true })
    }
    return json(res, 405, { error: '操作を確認してください。' })
  }

  async function handle(req, res, url) {
    const clientFiles = {
      '/content-edit-delete-client-v465.js': '/app/content-edit-delete-client-v465.js',
      '/content-edit-delete-client-v466.js': '/app/content-edit-delete-client-v466.js',
      '/content-edit-delete-client-v469.js': '/app/content-edit-delete-client-v469.js',
      '/content-edit-delete-client-v470.js': '/app/content-edit-delete-client-v470.js',
      '/content-edit-delete-client-v471.js': '/app/content-edit-delete-client-v471.js',
    }
    if (clientFiles[url.pathname] && req.method === 'GET') {
      res.statusCode = 200
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
      res.setHeader('X-Content-Type-Options', 'nosniff')
      fs.createReadStream(clientFiles[url.pathname]).pipe(res)
      return true
    }
    if (url.pathname !== '/api/lien-content-management' && url.pathname !== '/api/lien-chat-message') return false
    const audience = url.searchParams.get('audience') === 'staff' ? 'staff' : 'customer'
    const session = await sessionFor(req, audience)
    if (!session) {
      json(res, 401, { error: 'ログインが必要です。' })
      return true
    }
    try {
      if (url.pathname === '/api/lien-content-management') {
        if (req.method === 'GET') await contentGet(req, res, url, session, audience)
        else if (req.method === 'PATCH' || req.method === 'DELETE') await contentMutation(req, res, session, audience)
        else json(res, 405, { error: '操作を確認してください。' })
      } else if (req.method === 'PATCH' || req.method === 'DELETE') {
        await chatMutation(req, res, session, audience)
      } else {
        json(res, 405, { error: '操作を確認してください。' })
      }
    } catch (error) {
      const status = Number(error && error.status) || 500
      console.error('[style-community-recovery-v482]', {
        organizationId: session.organizationId,
        audience,
        path: url.pathname,
        error: error && error.message,
      })
      json(res, status, { error: status < 500 ? error.message : '操作を完了できませんでした。時間をおいて再度お試しください。' })
    }
    return true
  }

  return { handle }
}

module.exports = {
  ensureArchiveSchema,
  canManagePost,
  canManageComment,
  canManageChatMessage,
  createContentManagementService,
}
