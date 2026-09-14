import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const here = path.dirname(fileURLToPath(import.meta.url))
const nextRoot = path.join(root, '.next')
const publicRoot = path.join(root, 'public')
const marker = 'style-list-performance-v640'
const changes = []
const requireFromRuntime = createRequire(path.join(root, 'server.js'))
const sharp = requireFromRuntime('sharp')

function replaceExact(file, before, after, expected, label) {
  const target = path.join(root, file)
  const source = fs.readFileSync(target, 'utf8')
  const count = source.split(before).length - 1
  if (count !== expected) throw new Error(`${label}: expected ${expected} matches, found ${count}`)
  fs.writeFileSync(target, source.split(before).join(after))
  changes.push({ file, label, count })
}

function replaceOne(source, before, after, label) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${label}: expected 1 match, found ${count}`)
  changes.push({ label, count })
  return source.replace(before, after)
}

function addFile(sourceName, destination) {
  const target = path.join(root, destination)
  if (fs.existsSync(target)) throw new Error(`${destination}: destination already exists`)
  fs.copyFileSync(path.join(here, sourceName), target)
  changes.push({ file: destination, label: 'add release file', count: 1 })
}

function collectFiles(directory, output = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) collectFiles(fullPath, output)
    else if (entry.name.endsWith('.js') || entry.name.endsWith('.json')) output.push(fullPath)
  }
  return output
}

function replaceNextReferences(before, after, label) {
  let files = 0
  let references = 0
  for (const filePath of collectFiles(nextRoot)) {
    const source = fs.readFileSync(filePath, 'utf8')
    const count = source.split(before).length - 1
    if (!count) continue
    fs.writeFileSync(filePath, source.split(before).join(after))
    files += 1
    references += count
  }
  if (!files || !references) throw new Error(`${label}: no active references were updated`)
  changes.push({ label, files, references })
}

async function generateLocalThumbnails() {
  const sourceRoot = path.join(publicRoot, 'demo', 'showcase', 'styles')
  const outputRoot = path.join(publicRoot, 'generated', 'style-thumbnails-v640')
  const manifest = {}
  if (fs.existsSync(sourceRoot)) {
    fs.mkdirSync(outputRoot, { recursive: true })
    const sourceFiles = fs.readdirSync(sourceRoot, { withFileTypes: true })
      .filter(entry => entry.isFile() && /\.(?:jpe?g|png|webp)$/i.test(entry.name))
      .map(entry => path.join(sourceRoot, entry.name))
      .sort()
    for (const sourcePath of sourceFiles) {
      const publicPath = '/' + path.relative(publicRoot, sourcePath).replaceAll(path.sep, '/')
      const digest = crypto.createHash('sha256').update(publicPath).digest('hex').slice(0, 24)
      const outputName = `${digest}.webp`
      const outputPath = path.join(outputRoot, outputName)
      await sharp(sourcePath, { failOn: 'none', limitInputPixels: 80_000_000 })
        .rotate()
        .resize(560, 700, { fit: 'cover', position: 'centre' })
        .webp({ quality: 72, effort: 3 })
        .toFile(outputPath)
      manifest[publicPath] = `/generated/style-thumbnails-v640/${outputName}`
    }
  }
  fs.writeFileSync(path.join(root, 'style-list-thumbnails-v640.json'), JSON.stringify(manifest))
  changes.push({ file: 'style-list-thumbnails-v640.json', label: 'generate local style thumbnail manifest', count: Object.keys(manifest).length })
  changes.push({ file: 'public/generated/style-thumbnails-v640', label: 'generate local style thumbnails', count: Object.keys(manifest).length })
  return Object.keys(manifest).length
}

function recoverNavigationLoader(source) {
  let output = replaceOne(
    source,
    `  if (window.__orimiaUiTransitionV639) return
  window.__orimiaUiTransitionV639 = true
  window.__orimiaUiTransitionV623 = true
  window.__orimiaUiTransitionV536 = true
  document.documentElement.dataset.orimiaNavigationLoaderScope = 'v639'`,
    `  if (window.__orimiaUiTransitionV640) return
  window.__orimiaUiTransitionV640 = true
  window.__orimiaUiTransitionV639 = true
  window.__orimiaUiTransitionV623 = true
  window.__orimiaUiTransitionV536 = true
  document.documentElement.dataset.orimiaNavigationLoaderScope = 'v640'`,
    'navigation loader release guard',
  )
  output = replaceOne(
    output,
    `  const runtimeEvent = 'orimia:ui-runtime-ready'
  const finishedEvent = 'orimia:ui-transition-finished'
  const styleDetailEvent = 'orimia:style-detail-state-v639'`,
    `  const runtimeEvent = 'orimia:ui-runtime-ready'
  const finishedEvent = 'orimia:ui-transition-finished'
  const styleDetailEvent = 'orimia:style-detail-state-v639'
  const styleListEvent = 'orimia:style-list-state-v640'`,
    'style list readiness event',
  )
  output = replaceOne(
    output,
    `  const normalizePathname = pathname => pathname.length > 1 ? pathname.replace(/\\/+$/, '') : pathname
  const isStyleDetailPath = pathname => /^\\/(?:admin|u)\\/community\\/[^/]+\\/?$/.test(pathname)`,
    `  const normalizePathname = pathname => pathname.length > 1 ? pathname.replace(/\\/+$/, '') : pathname
  const isStyleDetailPath = pathname => /^\\/(?:admin|u)\\/community\\/[^/]+\\/?$/.test(pathname)
  const isStyleListPath = pathname => /^\\/(?:admin|u)\\/community\\/?$/.test(pathname)`,
    'style list route detector',
  )
  output = replaceOne(
    output,
    `    armHardFallback(isStyleDetailPath(location.pathname) ? 3600 : 4800)
    scheduleStyleDetailReveal('style-detail-initial')`,
    `    armHardFallback(isStyleDetailPath(location.pathname) || isStyleListPath(location.pathname) ? 3600 : 4800)
    scheduleStyleDetailReveal('style-detail-initial')`,
    'bounded style list initial loader',
  )
  output = replaceOne(
    output,
    `  window.addEventListener(styleDetailEvent, () => {
    if (!isStyleDetailPath(location.pathname)) return`,
    `  window.addEventListener(styleListEvent, event => {
    if (!isStyleListPath(location.pathname)) return
    if (state.mode === 'navigation' && !state.committed) return
    reveal(String(event.detail?.state || '') === 'error' ? 'style-list-error' : 'style-list-ready')
  })

  window.addEventListener(styleDetailEvent, () => {
    if (!isStyleDetailPath(location.pathname)) return`,
    'consume style list readiness',
  )
  return output
}

addFile('style-list-thumbnail-v640.js', 'style-list-thumbnail-v640.js')
const generatedThumbnailCount = await generateLocalThumbnails()

replaceExact(
  'style-community-controls-v610.js',
  "const { normalizeStylePostOrder } = require('./style-post-order-v634')\n",
  "const { createStyleListThumbnailUrl } = require('./style-list-thumbnail-v640')\n",
  1,
  'customer list thumbnail helper',
)
replaceExact(
  'style-community-controls-v610.js',
  'const PAGE_SIZE = 50\n',
  'const PAGE_SIZE = 12 /* style-list-performance-v640 */\n',
  1,
  'customer style page size',
)
replaceExact(
  'style-community-controls-v610.js',
  'let s3Client = null\n',
  'let s3Client = null\nconst stylistOptionsCacheV640 = new Map()\n',
  1,
  'customer stylist option cache',
)
replaceExact(
  'style-community-controls-v610.js',
  `  return options
}

function listSql(sort) {`,
  `  return options
}

function cachedStylistOptionsV640(prisma, organizationId) {
  const now = Date.now()
  const cached = stylistOptionsCacheV640.get(organizationId)
  if (cached && cached.expiresAt > now) return cached.promise
  const promise = listStylistOptions(prisma, organizationId)
  stylistOptionsCacheV640.set(organizationId, { expiresAt: now + 120_000, promise })
  promise.catch(() => stylistOptionsCacheV640.delete(organizationId))
  while (stylistOptionsCacheV640.size > 64) stylistOptionsCacheV640.delete(stylistOptionsCacheV640.keys().next().value)
  return promise
}

function listSql(sort) {`,
  1,
  'cache customer stylist options',
)
replaceExact(
  'style-community-controls-v610.js',
  '    SELECT p."id",p."displayOrder",p."publishedAt",p."postKind",\n',
  '    SELECT p."id",p."displayOrder",p."publishedAt",p."updatedAt",p."postKind",\n',
  1,
  'customer list image version',
)
replaceExact(
  'style-community-controls-v610.js',
  '  SELECT "id","displayOrder","publishedAt","title","stylistName","gender","coverReference","likeCount","liked",\n',
  '  SELECT "id","displayOrder","publishedAt","updatedAt","title","stylistName","gender","coverReference","likeCount","liked",\n',
  1,
  'return customer list image version',
)
replaceExact(
  'style-community-controls-v610.js',
  `  let page = parsePage(url.searchParams.get('page'))
  const query = listSql(sort)`,
  `  let page = parsePage(url.searchParams.get('page'))
  const stylistOptionsPromise = cachedStylistOptionsV640(prisma, session.organizationId)
  const query = listSql(sort)`,
  1,
  'parallelize customer list options',
)
replaceExact(
  'style-community-controls-v610.js',
  '    coverPhotoUrl: await resolveReference(row.coverReference),\n',
  `    coverPhotoUrl: createStyleListThumbnailUrl({
      organizationId: session.organizationId,
      postId: row.id,
      audience: 'customer',
      version: row.updatedAt,
      reference: row.coverReference,
    }) || await resolveReference(row.coverReference),
`,
  1,
  'customer list thumbnail URLs',
)
replaceExact(
  'style-community-controls-v610.js',
  '    options: { stylists: await listStylistOptions(prisma, session.organizationId) },\n',
  '    options: { stylists: await stylistOptionsPromise },\n',
  1,
  'reuse cached customer options',
)
replaceExact(
  'style-community-controls-v610.js',
  '    await normalizeStylePostOrder(prisma, session.organizationId)\n',
  '',
  1,
  'remove customer order normalization from reads',
)

replaceExact(
  'style-admin-controls-v618.js',
  "} = require('./style-post-order-v634')\n",
  "} = require('./style-post-order-v634')\nconst { createStyleListThumbnailUrl } = require('./style-list-thumbnail-v640')\n",
  1,
  'admin list thumbnail helper',
)
replaceExact(
  'style-admin-controls-v618.js',
  'const PAGE_SIZE = 20 /* list-pagination-performance-v628 */\n',
  'const PAGE_SIZE = 12 /* style-list-performance-v640 */\n',
  1,
  'admin style page size',
)
replaceExact(
  'style-admin-controls-v618.js',
  'let s3Client = null\n',
  'let s3Client = null\nconst adminListOptionsCacheV640 = new Map()\n',
  1,
  'admin list option cache',
)
replaceExact(
  'style-admin-controls-v618.js',
  `  return rows.map(row => ({ value: String(row.value), label: String(row.value) }))
}

function listSql(sort) {`,
  `  return rows.map(row => ({ value: String(row.value), label: String(row.value) }))
}

function cachedAdminListOptionsV640(prisma, organizationId) {
  const now = Date.now()
  const cached = adminListOptionsCacheV640.get(organizationId)
  if (cached && cached.expiresAt > now) return cached.promise
  const promise = Promise.all([
    loadReferenceOptions(prisma, organizationId),
    loadCourseOptions(prisma, organizationId),
  ]).then(([references, courses]) => ({
    staff: references.staff.map(row => ({
      key: String(row.key),
      name: String(row.name || '').trim(),
      role: String(row.role || '').trim(),
    })),
    courses,
  }))
  adminListOptionsCacheV640.set(organizationId, { expiresAt: now + 60_000, promise })
  promise.catch(() => adminListOptionsCacheV640.delete(organizationId))
  while (adminListOptionsCacheV640.size > 64) adminListOptionsCacheV640.delete(adminListOptionsCacheV640.keys().next().value)
  return promise
}

function listSql(sort) {`,
  1,
  'cache admin list options',
)
replaceExact(
  'style-admin-controls-v618.js',
  '    SELECT p."id",p."displayOrder",p."published",p."publishedAt",p."postKind",p."styleStaffKey",\n',
  '    SELECT p."id",p."displayOrder",p."published",p."publishedAt",p."updatedAt",p."postKind",p."styleStaffKey",\n',
  1,
  'admin list image version',
)
replaceExact(
  'style-admin-controls-v618.js',
  '  SELECT "id","displayOrder","published","publishedAt","postKind","styleStaffKey","title","stylistName","gender","courseName","coverReference","likeCount","commentCount",\n',
  '  SELECT "id","displayOrder","published","publishedAt","updatedAt","postKind","styleStaffKey","title","stylistName","gender","courseName","coverReference","likeCount","commentCount",\n',
  1,
  'return admin list image version',
)
replaceExact(
  'style-admin-controls-v618.js',
  `  const references = await loadReferenceOptions(prisma, organizationId)
  const staff = references.staff.map(row => ({ key: String(row.key), name: String(row.name || '').trim(), role: String(row.role || '').trim() }))`,
  `  const listOptions = await cachedAdminListOptionsV640(prisma, organizationId)
  const staff = listOptions.staff`,
  1,
  'reuse cached admin list options',
)
replaceExact(
  'style-admin-controls-v618.js',
  '    coverPhotoUrl: await resolveReference(row.coverReference),\n',
  `    coverPhotoUrl: createStyleListThumbnailUrl({
      organizationId,
      postId: row.id,
      audience: 'staff',
      version: row.updatedAt,
      reference: row.coverReference,
    }) || await resolveReference(row.coverReference),
`,
  1,
  'admin list thumbnail URLs',
)
replaceExact(
  'style-admin-controls-v618.js',
  '      courses: await loadCourseOptions(prisma, organizationId),\n',
  '      courses: listOptions.courses,\n',
  1,
  'reuse cached admin courses',
)
replaceExact(
  'style-admin-controls-v618.js',
  '    await normalizeStylePostOrder(prisma, current.organizationId)\n    return json(res, 200, await loadAdminPage(prisma, current.organizationId, url))',
  '    return json(res, 200, await loadAdminPage(prisma, current.organizationId, url))',
  1,
  'remove admin order normalization from reads',
)

replaceExact(
  'public/style-community-controls-v610.js',
  '  let listRequest = 0\n  let scanQueued = false\n',
  '  let listRequest = 0\n  let listAbortControllerV640 = null\n  let listSnapshotV640 = null\n  let scanQueued = false\n  let listHydrationReadyV640 = false\n',
  1,
  'customer list request state',
)
replaceExact(
  'public/style-community-controls-v610.js',
  `  function mountList() {
    if (normalizedPath() !== LIST_PATH) return
    const legacyFilter = suppressLegacyLists()
    if (listRoot && listRoot.isConnected) return
    if (!legacyFilter || !legacyFilter.nextElementSibling) return
    listRoot = document.createElement('section')
    listRoot.className = 'orimia-style-community-v610'
    listRoot.setAttribute('aria-label', 'スタイル一覧')
    listRoot.innerHTML = '<div class="orimia-style-list-loading-v610" role="status">スタイルを読み込んでいます。</div>'
    legacyFilter.before(listRoot)
    loadList()
  }`,
  `  function mountList() {
    if (normalizedPath() !== LIST_PATH) return
    const legacyFilter = suppressLegacyLists()
    if (!listRoot || !listRoot.isConnected) {
      listRoot = document.querySelector('.orimia-style-community-v610')
    }
    if (!listRoot && legacyFilter?.nextElementSibling) {
      listRoot = document.createElement('section')
      listRoot.className = 'orimia-style-community-v610'
      listRoot.setAttribute('aria-label', 'スタイル一覧')
      legacyFilter.before(listRoot)
    }
    if (!listRoot || listRoot.dataset.orimiaStyleListMountedV640 === 'true') return
    listRoot.dataset.orimiaStyleListMountedV640 = 'true'
    listRoot.setAttribute('aria-label', 'スタイル一覧')
    listRoot.innerHTML = '<div class="orimia-style-list-loading-v610" role="status">スタイルを読み込んでいます。</div>'
    loadList()
  }`,
  1,
  'mount customer list into lightweight shell',
)
replaceExact(
  'public/style-community-controls-v610.js',
  "    const lazy = index > 5 ? ' loading=\"lazy\"' : ''",
  "    const lazy = index > 1 ? ' loading=\"lazy\" fetchpriority=\"low\"' : ' fetchpriority=\"high\"'",
  1,
  'defer customer list images',
)
replaceExact(
  'public/style-community-controls-v610.js',
  `    loadList()
  }

  function includeSelectedOption`,
  `    if (listSnapshotV640) renderList(listSnapshotV640)
    else if (!listAbortControllerV640) loadList()
  }

  function includeSelectedOption`,
  1,
  'reuse customer request across shell hydration',
)
replaceExact(
  'public/style-community-controls-v610.js',
  `  function renderList(payload) {
    if (!listRoot || !listRoot.isConnected) return`,
  `  function announceListStateV640(state) {
    window.dispatchEvent(new CustomEvent('orimia:style-list-state-v640', {
      detail: { audience: 'customer', state },
    }))
  }

  function renderList(payload) {
    listSnapshotV640 = payload
    if (!listRoot || !listRoot.isConnected) listRoot = document.querySelector('.orimia-style-community-v610')
    if (!listRoot || !listRoot.isConnected) return
    listRoot.dataset.orimiaStyleListMountedV640 = 'true'`,
  1,
  'customer list readiness event',
)
replaceExact(
  'public/style-community-controls-v610.js',
  `    listRoot.querySelectorAll('[data-page-v610]').forEach(button => button.addEventListener('click', () => {`,
  `    announceListStateV640('ready')
    listRoot.querySelectorAll('[data-page-v610]').forEach(button => button.addEventListener('click', () => {`,
  1,
  'announce rendered customer list',
)
replaceExact(
  'public/style-community-controls-v610.js',
  `    const requestId = ++listRequest
    const filters = readListFilters()
    listRoot.classList.add('is-loading-v610')`,
  `    const requestId = ++listRequest
    if (listAbortControllerV640) listAbortControllerV640.abort()
    const controller = new AbortController()
    let timedOut = false
    const timeoutId = window.setTimeout(() => {
      timedOut = true
      controller.abort()
    }, 8000)
    listAbortControllerV640 = controller
    const filters = readListFilters()
    listRoot.classList.add('is-loading-v610')`,
  1,
  'bound customer list requests',
)
replaceExact(
  'public/style-community-controls-v610.js',
  "      const payload = await request('/api/lien-style-community-v610?' + params)",
  "      const payload = await request('/api/lien-style-community-v610?' + params, { signal: controller.signal })",
  1,
  'cancel customer list request',
)
replaceExact(
  'public/style-community-controls-v610.js',
  `    } catch (error) {
      if (requestId !== listRequest || !listRoot || !listRoot.isConnected) return
      listRoot.innerHTML = '<div class="orimia-style-list-error-v610" role="alert">' +`,
  `    } catch (error) {
      if (error?.name === 'AbortError' && !timedOut) return
      if (requestId !== listRequest || !listRoot || !listRoot.isConnected) return
      listRoot.innerHTML = '<div class="orimia-style-list-error-v610" role="alert">' +`,
  1,
  'handle customer list timeout',
)
replaceExact(
  'public/style-community-controls-v610.js',
  `      const retry = listRoot.querySelector('button')
      if (retry) retry.addEventListener('click', loadList)
    } finally {
      if (requestId === listRequest && listRoot) listRoot.classList.remove('is-loading-v610')`,
  `      const retry = listRoot.querySelector('button')
      if (retry) retry.addEventListener('click', loadList)
      announceListStateV640('error')
    } finally {
      window.clearTimeout(timeoutId)
      if (controller === listAbortControllerV640) listAbortControllerV640 = null
      if (requestId === listRequest && listRoot) listRoot.classList.remove('is-loading-v610')`,
  1,
  'complete customer list request',
)
replaceExact(
  'public/style-community-controls-v610.js',
  '    if (normalizedPath() === LIST_PATH) mountList()\n',
  '    if (normalizedPath() === LIST_PATH && listHydrationReadyV640) mountList()\n',
  1,
  'defer customer list until hydration',
)
replaceExact(
  'public/style-community-controls-v610.js',
  `  scan()
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scheduleScan, { once: true })`,
  `  const activateListV640 = () => {
    listHydrationReadyV640 = true
    scheduleScan()
  }
  const activateAfterHydrationV640 = () => requestAnimationFrame(() => requestAnimationFrame(activateListV640))
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', activateAfterHydrationV640, { once: true })
  else activateAfterHydrationV640()`,
  1,
  'single customer list activation',
)

replaceExact(
  'public/style-admin-controls-v618.js',
  `    loadList()
  }

  function mountList`,
  `    if (!listAbortController) loadList()
  }

  function mountList`,
  1,
  'reuse admin request across shell hydration',
)
replaceExact(
  'public/style-admin-controls-v618.js',
  `    writeListFilters(filters, false)
    loadList()
  }

  function formatDate`,
  `    writeListFilters(filters, false)
    if (listSnapshot) renderList(listSnapshot)
    else if (!listAbortController) loadList()
  }

  function formatDate`,
  1,
  'reuse admin snapshot after shell replacement',
)
replaceExact(
  'public/style-admin-controls-v618.js',
  `  function renderList(payload) {
    listSnapshot = payload`,
  `  function announceListStateV640(state) {
    window.dispatchEvent(new CustomEvent('orimia:style-list-state-v640', {
      detail: { audience: 'staff', state },
    }))
  }

  function renderList(payload) {
    listSnapshot = payload
    if (!listRoot || !listRoot.isConnected) listRoot = document.querySelector('.orimia-style-admin-v618')`,
  1,
  'admin list readiness event',
)
replaceExact(
  'public/style-admin-controls-v618.js',
  `    listRoot.querySelectorAll('[data-page-v618]').forEach(button => button.addEventListener('click', () => {`,
  `    announceListStateV640('ready')
    listRoot.querySelectorAll('[data-page-v618]').forEach(button => button.addEventListener('click', () => {`,
  1,
  'announce rendered admin list',
)
replaceExact(
  'public/style-admin-controls-v618.js',
  `    const controller = new AbortController()
    listAbortController = controller
    const filters = readListFilters()`,
  `    const controller = new AbortController()
    let timedOut = false
    const timeoutId = window.setTimeout(() => {
      timedOut = true
      controller.abort()
    }, 8000)
    listAbortController = controller
    const filters = readListFilters()`,
  1,
  'bound admin list requests',
)
replaceExact(
  'public/style-admin-controls-v618.js',
  `    } catch (error) {
      if (error && error.name === 'AbortError') return`,
  `    } catch (error) {
      if (error && error.name === 'AbortError' && !timedOut) return`,
  1,
  'handle admin list timeout',
)
replaceExact(
  'public/style-admin-controls-v618.js',
  `      listRoot.querySelector('button')?.addEventListener('click', loadList)
    } finally {
      if (controller === listAbortController) listAbortController = null`,
  `      listRoot.querySelector('button')?.addEventListener('click', loadList)
      announceListStateV640('error')
    } finally {
      window.clearTimeout(timeoutId)
      if (controller === listAbortController) listAbortController = null`,
  1,
  'complete admin list request',
)

const adminPageBefore = `async function x({searchParams:e}){let r=await (0,d.Os)(["ADMIN","STAFF"]);if(!r.organizationId)return null;let t=(0,c.JA)(e),s=await (0,c.ex)({organizationId:r.organizationId,filters:t});return(0,n.jsxs)("div",{className:"grid gap-6",children:[n.jsx("script",{src:"/content-edit-delete-client-v615.js?v=596"}),n.jsx(a.mr,{eyebrow:"Style Community",title:"スタイル共有",description:"写真からスタイルを探し、詳細画面で反応やコメントを確認します。",visual:n.jsx(l.n8,{variant:"insights",className:"h-full min-h-40",imageClassName:"object-[50%_32%]",sizes:"360px"})}),n.jsx(o.u,{filters:s.filters,...s.options}),n.jsx(i.c,{result:s,detailBasePath:"/admin/community"})]})}`
const adminPageAfter = `async function x(){let e=await (0,d.Os)(["ADMIN","STAFF"]);if(!e.organizationId)return null;return(0,n.jsxs)("div",{className:"grid gap-6",children:[n.jsx(a.mr,{eyebrow:"Style Community",title:"スタイル共有",description:"写真からスタイルを探し、詳細画面で反応やコメントを確認します。",visual:n.jsx(l.n8,{variant:"insights",className:"h-full min-h-40",imageClassName:"object-[50%_32%]",sizes:"360px"})}),n.jsx("section",{className:"orimia-style-admin-v618","aria-label":"スタイル一覧","data-orimia-style-list-shell-v640":"true"})]})}`
replaceExact('.next/server/app/admin/community/page.js', adminPageBefore, adminPageAfter, 1, 'lightweight admin style page shell')

const customerPageBefore = `async function l({searchParams:e}){let t=await (0,s.j)();if(!t)return null;let r=(0,d.JA)(e),o=await (0,d.ex)({organizationId:t.organizationId,filters:r});return(0,n.jsxs)("div",{className:"grid gap-5",children:[n.jsx(a.xt,{variant:"history",eyebrow:"Style community",title:"みんなのスタイル",description:"気になる写真を選ぶと、施術内容やコメントをご覧いただけます。",imageClassName:"object-[50%_38%]"}),n.jsx(i.u,{filters:o.filters,...o.options}),n.jsx(u.c,{result:o,detailBasePath:"/u/community"})]})}`
const customerPageAfter = `async function l(){let e=await (0,s.j)();if(!e)return null;return(0,n.jsxs)("div",{className:"grid gap-5",children:[n.jsx(a.xt,{variant:"history",eyebrow:"Style community",title:"みんなのスタイル",description:"気になる写真を選ぶと、施術内容やコメントをご覧いただけます。",imageClassName:"object-[50%_38%]"}),n.jsx("section",{className:"orimia-style-community-v610","aria-label":"スタイル一覧","data-orimia-style-list-shell-v640":"true"})]})}`
replaceExact('.next/server/app/u/(account)/community/page.js', customerPageBefore, customerPageAfter, 1, 'lightweight customer style page shell')

const oldLoaderName = 'ui-transition-v639.js'
const newLoaderName = 'ui-transition-v640.js'
const oldLoader = fs.readFileSync(path.join(publicRoot, oldLoaderName), 'utf8')
const oldLoaderCore = oldLoader.replace(/\n\/\* style-detail-loading-recovery-v639 \*\/\s*$/, '')
const newLoaderCore = recoverNavigationLoader(oldLoaderCore)
fs.writeFileSync(path.join(publicRoot, newLoaderName), `${newLoaderCore}\n\n/* ${marker} */\n`)

const oldAdminLayout = 'layout-runtime-v518-release1.navigation-loading-v536-release1.admin-sidebar-labels-v578.navigation-loader-scope-v623.style-loader-v639.js'
const oldCustomerLayout = 'layout-d1470003e928b0b1.customertabs-v503.ui-transition-v516-release5.navigation-loading-v536-release1.navigation-loader-scope-v623.style-loader-v639.js'

function writeLayout(oldName, label) {
  const newName = oldName.replace(/\.js$/, '.style-list-v640.js')
  const source = fs.readFileSync(path.join(nextRoot, 'static', 'chunks', 'app', oldName), 'utf8')
  const patched = replaceOne(source, oldLoaderCore, newLoaderCore, `${label} embedded loader`)
  fs.writeFileSync(path.join(nextRoot, 'static', 'chunks', 'app', newName), `${patched}\n/* ${marker} */\n`)
  replaceNextReferences(oldName, newName, `${label} asset activation`)
  return newName
}

const newAdminLayout = writeLayout(oldAdminLayout, 'admin layout')
const newCustomerLayout = writeLayout(oldCustomerLayout, 'customer layout')

replaceExact(
  'server.js',
  `const styleAdminControlsV618 = require('./style-admin-controls-v618').createStyleAdminControlsService({
  prisma,
  staffSessionProvider: req => chatSession(req, 'staff'),
}) /* style-admin-controls-v618-service */`,
  `const styleAdminControlsV618 = require('./style-admin-controls-v618').createStyleAdminControlsService({
  prisma,
  staffSessionProvider: req => chatSession(req, 'staff'),
}) /* style-admin-controls-v618-service */
const styleListThumbnailsV640 = require('./style-list-thumbnail-v640').createStyleListThumbnailService({ prisma }) /* ${marker}-service */`,
  1,
  'register style thumbnail service',
)
replaceExact(
  'server.js',
  '      if (await styleAdminControlsV618.handle(req,res,url)) return /* style-admin-controls-v618-route */',
  `      if (await styleListThumbnailsV640.handle(req,res,url)) return /* ${marker}-thumbnail-route */
      if (await styleAdminControlsV618.handle(req,res,url)) return /* style-admin-controls-v618-route */`,
  1,
  'route style thumbnails',
)
replaceExact('server.js', '/style-community-controls-v610.js?v=634-order1', '/style-community-controls-v610.js?v=640-performance1', 1, 'customer client cache key')
replaceExact('server.js', '/style-admin-controls-v618.js?v=634-order1', '/style-admin-controls-v618.js?v=640-performance1', 1, 'admin client cache key')
replaceExact('server.js', '/ui-transition-v639.js?v=639-style-detail-recovery1', '/ui-transition-v640.js?v=640-style-list-performance1', 2, 'standalone loader cache key')

const readinessAnchor = "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Style-Detail-Loading-Recovery', 'v639') /* style-detail-loading-recovery-v639-ready */"
replaceExact(
  'server.js',
  readinessAnchor,
  `${readinessAnchor}\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Style-List-Performance', 'v640') /* ${marker}-ready */`,
  1,
  'publish style list performance readiness',
)

fs.writeFileSync('/tmp/style-list-performance-v640-changes.json', JSON.stringify(changes))
console.log(JSON.stringify({
  release: marker,
  generatedThumbnailCount,
  newLoaderName,
  newAdminLayout,
  newCustomerLayout,
  changes: changes.length,
}))
