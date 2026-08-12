const path = require('path')
const http = require('http')
const crypto = require('crypto')
const { PrismaClient } = require('@prisma/client')

const dir = path.join(__dirname)

process.env.NODE_ENV = 'production'
process.chdir(__dirname)

const currentPort = parseInt(process.env.PORT, 10) || 3000
const hostname = process.env.HOSTNAME || '0.0.0.0'

let keepAliveTimeout = parseInt(process.env.KEEP_ALIVE_TIMEOUT, 10)
const nextConfig = {"env":{},"webpack":null,"eslint":{"ignoreDuringBuilds":false},"typescript":{"ignoreBuildErrors":false,"tsconfigPath":"tsconfig.json"},"distDir":"./.next","cleanDistDir":true,"assetPrefix":"","cacheMaxMemorySize":52428800,"configOrigin":"next.config.mjs","useFileSystemPublicRoutes":true,"generateEtags":true,"pageExtensions":["tsx","ts","jsx","js"],"poweredByHeader":true,"compress":true,"analyticsId":"","images":{"deviceSizes":[640,750,828,1080,1200,1920,2048,3840],"imageSizes":[16,32,48,64,96,128,256,384],"path":"/_next/image","loader":"default","loaderFile":"","domains":[],"disableStaticImages":false,"minimumCacheTTL":60,"formats":["image/webp"],"dangerouslyAllowSVG":false,"contentSecurityPolicy":"script-src 'none'; frame-src 'none'; sandbox;","contentDispositionType":"inline","remotePatterns":[],"unoptimized":false},"devIndicators":{"buildActivity":true,"buildActivityPosition":"bottom-right"},"onDemandEntries":{"maxInactiveAge":60000,"pagesBufferLength":5},"amp":{"canonicalBase":""},"basePath":"","sassOptions":{},"trailingSlash":false,"i18n":null,"productionBrowserSourceMaps":false,"optimizeFonts":true,"excludeDefaultMomentLocales":true,"serverRuntimeConfig":{},"publicRuntimeConfig":{},"reactProductionProfiling":false,"reactStrictMode":null,"httpAgentOptions":{"keepAlive":true},"outputFileTracing":true,"staticPageGenerationTimeout":60,"swcMinify":true,"output":"standalone","modularizeImports":{"@mui/icons-material":{"transform":"@mui/icons-material/{{member}}"},"lodash":{"transform":"lodash/{{member}}"}},"experimental":{"multiZoneDraftMode":false,"prerenderEarlyExit":false,"serverMinification":true,"serverSourceMaps":false,"linkNoTouchStart":false,"caseSensitiveRoutes":false,"clientRouterFilter":true,"clientRouterFilterRedirects":false,"fetchCacheKeyPrefix":"","middlewarePrefetch":"flexible","optimisticClientCache":true,"manualClientBasePath":false,"cpus":31,"memoryBasedWorkersCount":false,"isrFlushToDisk":true,"workerThreads":false,"optimizeCss":false,"nextScriptWorkers":false,"scrollRestoration":false,"externalDir":false,"disableOptimizedLoading":false,"gzipSize":true,"craCompat":false,"esmExternals":true,"fullySpecified":false,"outputFileTracingRoot":"/app","swcTraceProfiling":false,"forceSwcTransforms":false,"largePageDataBytes":128000,"adjustFontFallbacks":false,"adjustFontFallbacksWithSizeAdjust":false,"typedRoutes":false,"instrumentationHook":true,"bundlePagesExternals":false,"parallelServerCompiles":false,"parallelServerBuildTraces":false,"ppr":false,"missingSuspenseWithCSRBailout":true,"optimizeServerReact":true,"useEarlyImport":false,"staleTimes":{"dynamic":30,"static":300},"optimizePackageImports":["lucide-react","date-fns","lodash-es","ramda","antd","react-bootstrap","ahooks","@ant-design/icons","@headlessui/react","@headlessui-float/react","@heroicons/react/20/solid","@heroicons/react/24/solid","@heroicons/react/24/outline","@visx/visx","@tremor/react","rxjs","@mui/material","@mui/icons-material","recharts","react-use","@material-ui/core","@material-ui/icons","@tabler/icons-react","mui-core","react-icons/ai","react-icons/bi","react-icons/bs","react-icons/cg","react-icons/ci","react-icons/di","react-icons/fa","react-icons/fa6","react-icons/fc","react-icons/fi","react-icons/gi","react-icons/go","react-icons/gr","react-icons/hi","react-icons/hi2","react-icons/im","react-icons/io","react-icons/io5","react-icons/lia","react-icons/lib","react-icons/lu","react-icons/md","react-icons/pi","react-icons/ri","react-icons/rx","react-icons/si","react-icons/sl","react-icons/tb","react-icons/tfi","react-icons/ti","react-icons/vsc","react-icons/wi"],"trustHostHeader":false,"isExperimentalCompile":false},"configFileName":"next.config.mjs"}

process.env.__NEXT_PRIVATE_STANDALONE_CONFIG = JSON.stringify(nextConfig)

const next = require('next')

if (
  Number.isNaN(keepAliveTimeout) ||
  !Number.isFinite(keepAliveTimeout) ||
  keepAliveTimeout < 0
) {
  keepAliveTimeout = undefined
}

const prisma = globalThis.__lienChatPrisma || new PrismaClient()
globalThis.__lienChatPrisma = prisma
const staff = [
  { key: 'tanizaki', name: '谷崎 太二' },
  { key: 'watanabe', name: '渡邊 浩明' },
  { key: 'asano', name: '浅野 清美' },
  { key: 'kobayashi', name: '小林 美奈子' },
  { key: 'kaori', name: 'kaori' },
]

function cookies(req) {
  return Object.fromEntries(String(req.headers.cookie || '').split(';').map(v => v.trim()).filter(Boolean).map(v => {
    const i = v.indexOf('='); return [decodeURIComponent(v.slice(0, i)), decodeURIComponent(v.slice(i + 1))]
  }))
}
function verifySession(token, secret, version, roles) {
  if (!token || !secret || secret.length < 32) return null
  const parts = token.split('.'); if (parts.length !== 2) return null
  const signature = crypto.createHmac('sha256', secret).update(parts[0]).digest('base64url')
  if (signature.length !== parts[1].length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(parts[1]))) return null
  try {
    const value = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'))
    if (value.version !== version || !roles.includes(value.role) || value.expiresAt <= Math.floor(Date.now() / 1000)) return null
    return value
  } catch { return null }
}
async function chatSession(req, audience) {
  const jar = cookies(req)
  if (audience === 'customer') {
    const value = verifySession(jar.lien_customer_session, process.env.CUSTOMER_AUTH_SECRET || process.env.ADMIN_AUTH_SECRET, 1, ['CUSTOMER'])
    if (!value) return null
    const users = await prisma.$queryRawUnsafe('SELECT "id" FROM "AppUser" WHERE "id"=$1 AND "customerId"=$2 AND "organizationId"=$3 AND "role"=\'CUSTOMER\' AND "active"=true LIMIT 1', value.userId, value.customerId, value.organizationId)
    return users[0] ? value : null
  }
  const value = verifySession(jar.lien_admin_session, process.env.ADMIN_AUTH_SECRET, 2, ['ADMIN', 'STAFF'])
  if (!value || !value.organizationId) return null
  const users = await prisma.$queryRawUnsafe('SELECT "id", "displayName", "role" FROM "AppUser" WHERE "id"=$1 AND "organizationId"=$2 AND "active"=true LIMIT 1', value.userId, value.organizationId)
  return users[0] ? { ...value, displayName: users[0].displayName, role: users[0].role } : null
}
function canAccessThread(session, thread) {
  if (session.role === 'ADMIN') return true
  const selected = staff.find(s => s.key === thread.staffKey)
  return selected && [selected.name, selected.name.replace(/\s/g, '')].includes(String(session.displayName || '').replace(/\s/g, ''))
}
function json(res, status, value) {
  res.statusCode = status; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify(value))
}
async function body(req) {
  let raw = ''; for await (const chunk of req) { raw += chunk; if (raw.length > 20000) throw Error('too_large') }
  return raw ? JSON.parse(raw) : {}
}
async function chatApi(req, res, url) {
  const audience = url.searchParams.get('audience') === 'staff' ? 'staff' : 'customer'
  const session = await chatSession(req, audience)
  if (!session) return json(res, 401, { error: 'ログインが必要です。' })
  if (req.method === 'GET') {
    let threads
    if (audience === 'customer') {
      threads = await prisma.$queryRawUnsafe('SELECT t.*, c."name" AS "customerName", (SELECT COUNT(*)::int FROM "ChatMessage" m WHERE m."threadId"=t."id" AND m."senderType"=\'staff\' AND (t."customerLastReadAt" IS NULL OR m."createdAt">t."customerLastReadAt")) AS "unreadCount" FROM "ChatThread" t JOIN "Customer" c ON c."id"=t."customerId" WHERE t."customerId"=$1 AND t."organizationId"=$2 ORDER BY t."updatedAt" DESC', session.customerId, session.organizationId)
    } else {
      threads = await prisma.$queryRawUnsafe('SELECT t.*, c."name" AS "customerName", (SELECT COUNT(*)::int FROM "ChatMessage" m WHERE m."threadId"=t."id" AND m."senderType"=\'customer\' AND (t."staffLastReadAt" IS NULL OR m."createdAt">t."staffLastReadAt")) AS "unreadCount" FROM "ChatThread" t JOIN "Customer" c ON c."id"=t."customerId" WHERE t."organizationId"=$1 ORDER BY t."updatedAt" DESC', session.organizationId)
      threads = threads.filter(t => canAccessThread(session, t))
    }
    const requested = url.searchParams.get('threadId')
    const thread = requested ? threads.find(t => t.id === requested) : threads[0]
    const messages = thread ? await prisma.$queryRawUnsafe('SELECT * FROM "ChatMessage" WHERE "threadId"=$1 ORDER BY "createdAt" ASC LIMIT 300', thread.id) : []
    if (thread) await prisma.$executeRawUnsafe(`UPDATE "ChatThread" SET "${audience === 'customer' ? 'customerLastReadAt' : 'staffLastReadAt'}"=CURRENT_TIMESTAMP WHERE "id"=$1`, thread.id)
    return json(res, 200, { threads, thread: thread || null, messages, staff })
  }
  if (req.method !== 'POST' || (req.headers.origin && ![req.headers.origin, `https://${req.headers.host}`, `http://${req.headers.host}`].includes(req.headers.origin))) return json(res, 403, { error: '不正なリクエストです。' })
  const data = await body(req)
  if (data.action === 'create' && audience === 'customer') {
    const target = staff.find(s => s.key === data.staffKey); const text = String(data.body || '').trim()
    if (!target || !text || text.length > 2000) return json(res, 400, { error: '担当者と相談内容を確認してください。' })
    const id = crypto.randomUUID(), messageId = crypto.randomUUID()
    await prisma.$transaction(async tx => {
      await tx.$executeRawUnsafe('INSERT INTO "ChatThread" ("id","organizationId","customerId","staffKey","staffName","customerLastReadAt","updatedAt") VALUES ($1,$2,$3,$4,$5,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT ("customerId","staffKey") DO UPDATE SET "status"=\'open\', "updatedAt"=CURRENT_TIMESTAMP', id, session.organizationId, session.customerId, target.key, target.name)
      const rows = await tx.$queryRawUnsafe('SELECT "id" FROM "ChatThread" WHERE "customerId"=$1 AND "staffKey"=$2', session.customerId, target.key)
      await tx.$executeRawUnsafe('INSERT INTO "ChatMessage" ("id","threadId","senderType","senderUserId","body") VALUES ($1,$2,\'customer\',$3,$4)', messageId, rows[0].id, session.userId, text)
    })
    return json(res, 201, { success: true })
  }
  if (data.action === 'send') {
    const text = String(data.body || '').trim(); if (!text || text.length > 2000) return json(res, 400, { error: 'メッセージは1〜2,000文字で入力してください。' })
    const rows = await prisma.$queryRawUnsafe('SELECT * FROM "ChatThread" WHERE "id"=$1 AND "organizationId"=$2 LIMIT 1', String(data.threadId || ''), session.organizationId)
    const thread = rows[0]
    if (!thread || (audience === 'customer' ? thread.customerId !== session.customerId : !canAccessThread(session, thread))) return json(res, 404, { error: '会話が見つかりません。' })
    await prisma.$transaction([
      prisma.$executeRawUnsafe('INSERT INTO "ChatMessage" ("id","threadId","senderType","senderUserId","body") VALUES ($1,$2,$3,$4,$5)', crypto.randomUUID(), thread.id, audience, session.userId, text),
      prisma.$executeRawUnsafe(`UPDATE "ChatThread" SET "updatedAt"=CURRENT_TIMESTAMP, "${audience === 'customer' ? 'customerLastReadAt' : 'staffLastReadAt'}"=CURRENT_TIMESTAMP WHERE "id"=$1`, thread.id),
    ])
    return json(res, 201, { success: true })
  }
  return json(res, 400, { error: '操作を確認してください。' })
}
function chatHtmlBase(audience) {
  const customer = audience === 'customer'
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${customer ? 'スタッフへ相談' : 'チャット通知'} | Salon de Lien</title><style>*{box-sizing:border-box}body{margin:0;background:#fbf7f0;color:#2f2a25;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}header{position:sticky;top:0;z-index:3;background:#fffdf9eF;border-bottom:1px solid #eadfd4;padding:14px 18px;display:flex;justify-content:space-between;align-items:center}a{color:#8f4f42;font-weight:700;text-decoration:none}.wrap{max-width:1100px;margin:auto;padding:22px 14px}.hero,.panel{background:white;border:1px solid #e8ded2;border-radius:24px;padding:20px;box-shadow:0 8px 24px #6c554314}.hero h1{margin:4px 0}.grid{display:grid;grid-template-columns:300px 1fr;gap:16px;margin-top:16px}.threads{display:grid;gap:8px}.thread{width:100%;text-align:left;border:1px solid #e8ded2;background:#fff;padding:13px;border-radius:15px}.thread.active{background:#8f4f42;color:white}.badge{background:#c3483f;color:white;border-radius:99px;padding:2px 7px;font-size:11px}.messages{height:48vh;overflow:auto;display:flex;flex-direction:column;gap:10px;padding:8px}.msg{max-width:78%;padding:11px 14px;border-radius:16px;background:#f1ebe5;white-space:pre-wrap}.msg.mine{align-self:flex-end;background:#8f4f42;color:white}.send{display:flex;gap:8px;margin-top:12px}textarea,select{width:100%;border:1px solid #d8cbbf;border-radius:13px;padding:12px;font:inherit}button{cursor:pointer}.primary{border:0;border-radius:13px;background:#8f4f42;color:white;font-weight:700;padding:12px 18px}.new{display:grid;gap:10px;margin-bottom:14px}.empty{text-align:center;color:#7c7168;padding:40px 10px}@media(max-width:700px){.grid{grid-template-columns:1fr}.messages{height:42vh}.threads{max-height:220px;overflow:auto}}</style></head><body><header><a href="${customer ? '/u/appointments' : '/admin/appointments'}">← ${customer ? 'サロン予約へ戻る' : '管理画面へ戻る'}</a><strong>${customer ? '通知・チャット' : '顧客チャット通知'}</strong></header><main class="wrap"><section class="hero"><small>Salon de Lien Chat</small><h1>${customer ? 'スタッフへチャット相談' : 'お客様からの相談'}</h1><p>${customer ? '担当スタッフを選び、予約前の相談や髪のお悩みを送れます。' : '未読の相談を確認し、担当スタッフとして返信できます。'}</p></section><div class="grid"><aside class="panel">${customer ? '<div class="new"><select id="staff"></select><textarea id="newBody" rows="3" placeholder="相談内容を入力"></textarea><button class="primary" id="create">相談を送る</button></div>' : ''}<div id="threads" class="threads"></div></aside><section class="panel"><h2 id="title">会話を選択</h2><div id="messages" class="messages empty">メッセージはまだありません</div><div class="send"><textarea id="body" rows="2" placeholder="メッセージを入力"></textarea><button class="primary" id="send">送信</button></div><p id="error" style="color:#a02f28"></p></section></div></main><script>const audience='${audience}';let current=null;const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));async function api(method,data,threadId){const r=await fetch('/api/lien-chat?audience='+audience+(threadId?'&threadId='+encodeURIComponent(threadId):''),{method,headers:{'Content-Type':'application/json'},body:data?JSON.stringify(data):undefined});const j=await r.json();if(!r.ok)throw Error(j.error||'通信に失敗しました');return j}async function load(id){try{const d=await api('GET',null,id);current=d.thread?.id||null;if(document.querySelector('#staff'))document.querySelector('#staff').innerHTML=d.staff.map(s=>'<option value="'+s.key+'">'+esc(s.name)+'</option>').join('');document.querySelector('#threads').innerHTML=d.threads.map(t=>'<button class="thread '+(t.id===current?'active':'')+'" data-id="'+t.id+'"><strong>'+esc(audience==='customer'?t.staffName:t.customerName)+'</strong> '+(t.unreadCount?'<span class="badge">'+t.unreadCount+'</span>':'')+'<br><small>'+esc(t.staffName)+'</small></button>').join('')||'<div class="empty">会話はまだありません</div>';document.querySelectorAll('.thread').forEach(b=>b.onclick=()=>load(b.dataset.id));document.querySelector('#title').textContent=d.thread?(audience==='customer'?d.thread.staffName:d.thread.customerName+' → '+d.thread.staffName):'会話を選択';const box=document.querySelector('#messages');box.className='messages'+(d.messages.length?'':' empty');box.innerHTML=d.messages.map(m=>'<div class="msg '+(m.senderType===audience?'mine':'')+'">'+esc(m.body)+'</div>').join('')||'メッセージはまだありません';box.scrollTop=box.scrollHeight;document.querySelector('#error').textContent=''}catch(e){document.querySelector('#error').textContent=e.message}}document.querySelector('#send').onclick=async()=>{const b=document.querySelector('#body');if(!current||!b.value.trim())return;try{await api('POST',{action:'send',threadId:current,body:b.value});b.value='';await load(current)}catch(e){document.querySelector('#error').textContent=e.message}};if(document.querySelector('#create'))document.querySelector('#create').onclick=async()=>{const b=document.querySelector('#newBody');try{await api('POST',{action:'create',staffKey:document.querySelector('#staff').value,body:b.value});b.value='';await load()}catch(e){document.querySelector('#error').textContent=e.message}};load();setInterval(()=>load(current),15000)</script></body></html>`
}

function chatHtml(audience, session) {
  let html = chatHtmlBase(audience)
  if (audience === 'customer') return html
  const displayName = String(session?.displayName || (session?.role === 'ADMIN' ? '管理者' : 'スタッフ')).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
  const shellCss = `<style>
    body{display:flex;min-height:100vh}.admin-sidebar{position:fixed;inset:0 auto 0 0;width:264px;background:#fffdf9;border-right:1px solid #e6d9cc;padding:20px 14px;z-index:20;display:flex;flex-direction:column}.admin-brand{padding:7px 10px 18px;border-bottom:1px solid #eee2d7;margin-bottom:14px}.admin-brand b{display:block;font-size:17px;color:#4d312a}.admin-brand small{color:#8a7469}.admin-nav{display:grid;gap:6px}.admin-nav a{display:block;padding:12px 14px;border-radius:14px;color:#5d4b43;font-size:14px}.admin-nav a:hover{background:#f6ede7}.admin-nav a.active{background:#985345;color:white}.admin-sidebar-footer{margin-top:auto;padding:12px 10px;color:#8a7469;font-size:12px}.admin-stage{width:100%;min-width:0;margin-left:264px}.admin-topbar{height:72px;background:#fffdf9;border-bottom:1px solid #e6d9cc;display:flex;align-items:center;justify-content:space-between;padding:0 24px;position:sticky;top:0;z-index:10}.admin-topbar-title small{display:block;color:#9a7c6e}.admin-topbar-title b{font-size:17px}.admin-user{display:flex;align-items:center;gap:10px}.admin-user a{display:flex;align-items:center;gap:7px;border:1px solid #e1d2c5;border-radius:999px;padding:8px 12px;background:white;color:#5d4037}.admin-user .gear{width:40px;height:40px;justify-content:center;padding:0;font-size:19px}.chat-local-header{position:static;background:transparent;border:0;padding:18px 24px 0}.admin-stage .wrap{max-width:1180px}.admin-stage .hero{border-radius:20px}.admin-stage .panel{border-radius:20px}@media(max-width:850px){.admin-sidebar{width:210px}.admin-stage{margin-left:210px}}@media(max-width:700px){body{display:block}.admin-sidebar{display:none}.admin-stage{margin-left:0}.admin-topbar{height:62px;padding:0 12px}.admin-topbar-title small{display:none}.admin-user span{display:none}.chat-local-header{padding:12px 14px 0}}
  </style>`
  const shell = `<aside class="admin-sidebar"><div class="admin-brand"><b>Salon de Lien</b><small>既存客を動かす美容室CRM</small></div><nav class="admin-nav" aria-label="管理画面ナビゲーション"><a href="/admin/appointments">予約カレンダー</a><a class="active" href="/admin/chat">チャット</a><a href="/admin/customers">顧客・ポイント・配信</a><a href="/admin/products?section=menus">メニュー・商品棚・集計</a><a href="/admin/community">スタイル共有</a><a href="/admin/owner-analytics">経営分析</a></nav><div class="admin-sidebar-footer">今日の接客を、次の関係へ。</div></aside><div class="admin-stage"><div class="admin-topbar"><div class="admin-topbar-title"><small>Salon de Lien</small><b>顧客チャット</b></div><div class="admin-user"><a href="/admin/account" aria-label="アカウント設定"><span>👤</span><span>${displayName}</span></a><a class="gear" href="/admin/settings" aria-label="設定">⚙</a></div></div>`
  html = html.replace('</head>', `${shellCss}</head>`).replace('<body>', `<body>${shell}`).replace('</body>', '</div></body>')
  return html
}

async function unreadChatCount(req, audience) {
  const session = await chatSession(req, audience)
  if (!session) return 0
  if (audience === 'customer') {
    const rows = await prisma.$queryRawUnsafe('SELECT COUNT(*)::int AS count FROM "ChatMessage" m JOIN "ChatThread" t ON t."id"=m."threadId" WHERE t."customerId"=$1 AND t."organizationId"=$2 AND m."senderType"=\'staff\' AND (t."customerLastReadAt" IS NULL OR m."createdAt">t."customerLastReadAt")', session.customerId, session.organizationId)
    return rows[0]?.count || 0
  }
  let threads = await prisma.$queryRawUnsafe('SELECT t.*, (SELECT COUNT(*)::int FROM "ChatMessage" m WHERE m."threadId"=t."id" AND m."senderType"=\'customer\' AND (t."staffLastReadAt" IS NULL OR m."createdAt">t."staffLastReadAt")) AS "unreadCount" FROM "ChatThread" t WHERE t."organizationId"=$1', session.organizationId)
  threads = threads.filter(t => canAccessThread(session, t))
  return threads.reduce((sum, t) => sum + (t.unreadCount || 0), 0)
}

async function handleWithChatLink(handle, req, res, audience) {
  req.headers['accept-encoding'] = 'identity'
  const count = await unreadChatCount(req, audience).catch(() => 0)
  const originalWrite = res.write.bind(res), originalEnd = res.end.bind(res)
  res.end = (chunk, encoding, callback) => {
    if (typeof encoding === 'function') { callback = encoding; encoding = undefined }
    const type = String(res.getHeader('content-type') || '')
    if (type.includes('text/html')) {
      const href = audience === 'customer' ? '/u/chat' : '/admin/chat'
      const label = audience === 'customer' ? 'スタッフへチャット相談' : '顧客チャット通知'
      const badge = count ? `<span style="margin-left:8px;background:#c3483f;color:white;border-radius:999px;padding:2px 7px;font-size:11px">${count}</span>` : ''
      const link = `<a href="${href}" aria-label="${label}" style="position:fixed;right:18px;bottom:${audience === 'customer' ? '82px' : '22px'};z-index:9999;display:flex;align-items:center;min-height:48px;padding:0 18px;border-radius:999px;background:#8f4f42;color:#fff;text-decoration:none;font:700 13px -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;box-shadow:0 8px 24px #4c302a55">💬 ${label}${badge}</a>`
      res.removeHeader('content-length')
      if (chunk) originalWrite(chunk, encoding)
      originalWrite(link)
      return originalEnd(callback)
    }
    return originalEnd(chunk, encoding, callback)
  }
  await handle(req, res)
}

const app = next({ dev: false, dir, conf: nextConfig })
app.prepare().then(() => {
  const handle = app.getRequestHandler()
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
      if (url.pathname === '/api/lien-chat') return await chatApi(req, res, url)
      if (url.pathname === '/u/chat' || url.pathname === '/admin/chat') {
        const audience = url.pathname.startsWith('/u/') ? 'customer' : 'staff'
        const session = await chatSession(req, audience)
        if (!session) { res.statusCode = 302; res.setHeader('Location', audience === 'customer' ? '/u/login' : '/admin/login'); return res.end() }
        res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.setHeader('Cache-Control', 'no-store'); return res.end(chatHtml(audience, session))
      }
      if (url.pathname === '/u/appointments') return await handleWithChatLink(handle, req, res, 'customer')
      if (url.pathname.startsWith('/admin/') && !url.pathname.startsWith('/admin/login')) return await handleWithChatLink(handle, req, res, 'staff')
      return handle(req, res)
    } catch (err) { console.error('chat server error', err); if (!res.headersSent) json(res, 500, { error: 'チャット処理に失敗しました。' }); else res.end() }
  })
  if (keepAliveTimeout !== undefined) server.keepAliveTimeout = keepAliveTimeout
  server.listen(currentPort, hostname, () => console.log(`Salon de Lien listening on ${hostname}:${currentPort}`))
}).catch(err => { console.error(err); process.exit(1) })
