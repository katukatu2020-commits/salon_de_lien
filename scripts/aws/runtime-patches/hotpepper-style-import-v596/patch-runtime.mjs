import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const patchRoot = path.dirname(fileURLToPath(import.meta.url))
const changes = []
function replace(file, before, after) {
  const target = path.join(root, file)
  const source = fs.readFileSync(target, 'utf8')
  if (source.split(before).length !== 2) throw new Error('Unexpected v595 anchor: ' + file + ' / ' + before.slice(0, 100))
  fs.writeFileSync(target, source.replace(before, after)); changes.push({ file, before, after })
}
const publishing = 'community-publishing-v566.js'
replace(publishing, "const RELEASE = 'style-post-directions-v566'", "const { normalizeMetadata } = require('./style-metadata-v596')\nconst RELEASE = 'hotpepper-style-import-v596'")
replace(publishing, '  async function publish(req, res, session) {\n    if (!sameOrigin(req)) return json(res, 403, { ok: false, error: \'安全のため操作を完了できませんでした。\' })\n    const input = await readJson(req)', `  async function savePost(input, session, { db = prisma, imported = false, sourceUrl = null } = {}) {`)
replace(publishing, '    const photos = normalizePhotos(input.photos)', `    const photos = imported ? input.photos : normalizePhotos(input.photos)
    if (!Array.isArray(photos) || !photos.length || photos.length > 4 || photos.some(p => !LEGACY_DIRECTIONS.includes(p.direction))) throw statusError('写真の方向を確認してください。')
    const metadata = { ...normalizeMetadata(input.metadata), ...(imported ? { salonName: input.metadata.salonName, salonArea: input.metadata.salonArea, stylistUrl: input.metadata.stylistUrl, sourceUrl } : {}) }`)
replace(publishing, '        ADD COLUMN IF NOT EXISTS "publishedByName" TEXT', `        ADD COLUMN IF NOT EXISTS "styleMetadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
        ADD COLUMN IF NOT EXISTS "sourceUrl" TEXT,
        ADD COLUMN IF NOT EXISTS "publishedByName" TEXT`)
const source = fs.readFileSync(path.join(root, publishing), 'utf8')
const schemaEnd = source.indexOf('    `)\n  }\n\n  async function savePost')
if (schemaEnd < 0) throw new Error('Schema boundary missing')
replace(publishing, source.slice(schemaEnd, schemaEnd + '    `)\n  }\n\n  async function savePost'.length), `    \`)
    await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "VisitCommunityPost_source_v596" ON "VisitCommunityPost" ("organizationId","sourceUrl") WHERE "sourceUrl" IS NOT NULL')
  }

  async function savePost`)
replace(publishing, '      await prisma.$executeRawUnsafe(\n        \'INSERT INTO "VisitCommunityPost"', '      await db.$executeRawUnsafe(\n        \'INSERT INTO "VisitCommunityPost"')
replace(publishing, '      for (const photo of photos) {', "      for (const photo of [...photos, ...(imported && input.stylistPhoto ? [{ ...input.stylistPhoto, direction: 'STYLIST' }] : [])]) {")
replace(publishing, '      const displayName = String(session.displayName', "      const media = stored.filter(item => item.direction !== 'STYLIST')\n      const portrait = stored.find(item => item.direction === 'STYLIST')\n      if (portrait) metadata.stylistPhotoReference = portrait.reference\n      const displayName = String(session.displayName")
replace(publishing, 'JSON.stringify(stored.map(item => item.reference))', 'JSON.stringify(media.map(item => item.reference))')
replace(publishing, 'JSON.stringify(stored.map(item => item.direction))', 'JSON.stringify(media.map(item => item.direction))')
replace(publishing, 'photoCount: stored.length', 'photoCount: media.length')
replace(publishing, '"aiCommentDueAt","aiCommentedAt") VALUES', '"aiCommentDueAt","aiCommentedAt","styleMetadata","sourceUrl") VALUES')
replace(publishing, '$6,TRUE,NOW(),NOW(),NOW(),NULL,NULL)\',', '$6,TRUE,NOW(),NOW(),NOW(),NULL,NULL,$7::jsonb,$8)\',')
replace(publishing, '        displayName,\n      )', '        displayName,\n        JSON.stringify(metadata),\n        sourceUrl,\n      )')
replace(publishing, '      return json(res, 201, {\n        ok: true,', '      return {\n        ok: true,')
replace(publishing, '        directions: stored.map(item => item.direction),\n      })', '        directions: media.map(item => item.direction),\n      }')
replace(publishing, '      await publish(req, res, session)', `      if (!sameOrigin(req)) throw statusError('安全のため操作を完了できませんでした。', 403)
      json(res, 201, await savePost(await readJson(req), session))`)
replace(publishing, '  return { ensureSchema, handle }', '  return { ensureSchema, handle, savePost }')
replace(publishing, "['/admin-community-publishing-v348.js', '/admin-community-publishing-v566.js']", "['/admin-community-publishing-v348.js', '/admin-community-publishing-v566.js', '/admin-community-publishing-v596.js']")

const server = 'server.js'
replace(server, 'const contentManagement = createContentManagementService({', `const hotpepperStyles = require('./hotpepper-import-v596').createHotpepperImportService({ prisma, publishing: communityPublishing, sessionProvider: req => chatSession(req, 'staff') })
const contentManagement = createContentManagementService({`)
replace(server, '  await communityPublishing.ensureSchema() /* community-publishing-v348-schema */', '  await communityPublishing.ensureSchema() /* community-publishing-v348-schema */\n  await hotpepperStyles.ensureSchema()')
replace(server, '      if (await communityPublishing.handle(req, res, url)) return', '      if (await hotpepperStyles.handle(req, res, url)) return\n      if (await communityPublishing.handle(req, res, url)) return')
const ready = "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Store-List', 'v595')"
replace(server, ready, ready + "\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Hotpepper-Style-Import', 'v596')")
replace('commercial-admin-v101.js', "script.src = '/admin-community-publishing-v566.js?v=566'", "script.src = '/admin-community-publishing-v596.js?v=596'")
const client = 'community-publishing-client-v566.js'
replace(client, '  function openModal() {', fs.readFileSync(path.join(patchRoot, 'publisher-addon-v596.js'), 'utf8') + '\n  function openModal() {')
replace(client, '    modal.remove()\n    modal = null', '    modal.__hotpepperDispose?.()\n    modal.remove()\n    modal = null')
replace(client, "    document.documentElement.style.overflow = ''", "    document.documentElement.style.overflow = ''\n    document.querySelector('[data-ca-community-publish]')?.focus()")
replace(client, '            caption:modal.querySelector', '            metadata:modal.__styleMetadata?.(),\n            caption:modal.querySelector')
replace(client, '    syncSubmit()\n  }\n\n  function mount()', '    configureHotpepper(modal)\n    syncSubmit()\n  }\n\n  function mount()')

const management = 'content-management-v465.js'
replace(management, 'SELECT "id","organizationId","customerId","postKind","caption","published","updatedAt" FROM "VisitCommunityPost"', 'SELECT "id","organizationId","customerId","postKind","caption","published","updatedAt","styleMetadata" FROM "VisitCommunityPost"')
replace(management, '        caption: post.caption || \'\',', '        caption: post.caption || \'\',\n        metadata: { ...(post.styleMetadata || {}), stylistPhotoUrl: await resolvePostCover(post.styleMetadata?.stylistPhotoReference) },')
replace(management, "        const caption = normalizedText(input.body, 300, '投稿文', true)", `        if (input.action === 'metadata') {
          if (audience !== 'staff' || post.postKind !== 'STORE') return json(res, 403, { error: '店舗スタイルのみ編集できます。' })
          const metadata = require('./style-metadata-v596').normalizeMetadata(input.metadata)
          const rows = await prisma.$queryRawUnsafe('UPDATE "VisitCommunityPost" SET "styleMetadata"=COALESCE("styleMetadata",\\'{}\\'::jsonb) || $1::jsonb,"updatedAt"=NOW() WHERE "id"=$2 AND "organizationId"=$3 RETURNING "styleMetadata"', JSON.stringify(metadata), post.id, session.organizationId)
          return json(res, 200, { success: true, metadata: rows[0].styleMetadata })
        }
        const caption = normalizedText(input.body, 300, '投稿文', true)`)
const managementClient = 'public/content-edit-delete-client-v560.js'
replace(managementClient, '  async function enhanceCommunityDetail() {', fs.readFileSync(path.join(patchRoot, 'metadata-client-v596.js'), 'utf8') + '\n  async function enhanceCommunityDetail() {')
replace(managementClient, '    panel.appendChild(top);', '    panel.appendChild(top);\n    appendStyleMetadataV596(panel, payload.post, meta);')
replace(managementClient, '    top.appendChild(caption);', "    if (payload.post.caption || !payload.post.metadata?.title) top.appendChild(caption);")
function walk(dir) { return fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]) }
let loaders = 0
for (const file of [...walk('.next/server'), ...fs.readdirSync(root).filter(name => name.endsWith('.js'))].filter(name => name.endsWith('.js'))) {
  const source = fs.readFileSync(path.join(root, file), 'utf8')
  const before = '/content-edit-delete-client-v560.js'
  if (!source.includes(before)) continue
  const after = source.replaceAll(before, before + '?v=596')
  replace(file, source, after)
  loaders++
}
if (loaders < 4 || loaders > 12) throw new Error('Unexpected community client loader count: ' + loaders)
fs.writeFileSync('/tmp/hotpepper-v596-changes.json', JSON.stringify(changes))
console.log('v596: importer, shared style metadata and publisher integrated')
