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
  const icon = (name, content, className = '') => `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-${name} ${className}" aria-hidden="true">${content}</svg>`
  const icons = {
    calendar: icon('calendar-days', '<path d="M8 2v4"></path><path d="M16 2v4"></path><rect width="18" height="18" x="3" y="4" rx="2"></rect><path d="M3 10h18"></path><path d="M8 14h.01"></path><path d="M12 14h.01"></path><path d="M16 14h.01"></path><path d="M8 18h.01"></path><path d="M12 18h.01"></path><path d="M16 18h.01"></path>'),
    users: icon('users-round', '<path d="M18 21a8 8 0 0 0-16 0"></path><circle cx="10" cy="8" r="5"></circle><path d="M22 20c0-3.37-2-6.5-4-8a5 5 0 0 0-.45-8.3"></path>'),
    package: icon('package-search', '<path d="M12 22V12"></path><path d="M20.27 18.27 22 20"></path><path d="M21 10.498V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.729l7 4a2 2 0 0 0 2 .001l.98-.559"></path><path d="M3.29 7 12 12l8.71-5"></path><path d="m7.5 4.27 8.997 5.148"></path><circle cx="18.5" cy="16.5" r="2.5"></circle>'),
    images: icon('images', '<path d="m22 11-1.296-1.296a2.4 2.4 0 0 0-3.408 0L11 16"></path><path d="M4 8a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2"></path><circle cx="13" cy="7" r="1" fill="currentColor"></circle><rect x="8" y="2" width="14" height="14" rx="2"></rect>'),
    chart: icon('chart-column', '<path d="M3 3v16a2 2 0 0 0 2 2h16"></path><path d="M18 17V9"></path><path d="M13 17V5"></path><path d="M8 17v-3"></path>'),
    search: icon('search', '<circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path>'),
    command: icon('command', '<path d="M18 9a3 3 0 1 0-3-3v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3Z"></path>'),
    settings: icon('settings', '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2Z"></path><circle cx="12" cy="12" r="3"></circle>'),
    user: icon('user-round', '<circle cx="12" cy="8" r="5"></circle><path d="M20 21a8 8 0 0 0-16 0"></path>'),
    message: icon('message-square', '<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"></path>'),
    megaphone: icon('megaphone', '<path d="m3 11 18-5v12L3 14v-3z"></path><path d="M11.6 16.8 13 21H7l-1.8-6"></path>')
  }
  const shellCss = `<style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;600;700&display=swap');body{display:flex;min-height:100vh;background:#faf6ef;font-family:"Noto Sans JP","Zen Kaku Gothic New","Hiragino Sans","Yu Gothic UI",system-ui,sans-serif}.admin-sidebar{position:fixed;inset:0 auto 0 0;width:255px;background:#fffdf9;border-right:1px solid #e5d8cb;z-index:20;display:flex;flex-direction:column}.admin-brand{height:77px;padding:15px 16px;display:flex;align-items:center;gap:11px;border-bottom:1px solid #eadfd4}.brand-logo{width:42px;height:42px;border-radius:50%;object-fit:cover;border:1px solid #dfcdbd}.admin-brand b{display:block;font-size:17px;font-weight:700;color:#2d201b}.admin-brand small{display:block;color:#806e64;font-size:11px;margin-top:2px}.admin-nav{display:grid;gap:5px;padding:17px 10px}.admin-nav a{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:16px;color:#66544b;font-size:14px}.admin-nav a:hover{background:#f6ede7}.admin-nav a.active{background:#9c5344;color:#fff;box-shadow:0 2px 5px #6b39262b}.nav-icon{width:18px;height:18px;display:inline-flex;opacity:.8}.nav-icon svg,.customer-tabs svg,.top-search svg,.shortcut svg,.admin-user svg{width:16px;height:16px;flex:0 0 auto}.admin-sidebar-footer{margin:auto 12px 14px;border-radius:18px;overflow:hidden;background:#e9ded2;padding:70px 12px 12px;color:#fff;font-size:12px;font-weight:700;background:linear-gradient(0deg,#5d4037aa,#ffffff05),url('/brand/salon-interior.jpg') center/cover}.admin-stage{width:100%;min-width:0;margin-left:255px}.admin-topbar{height:70px;background:#fffdf9;border-bottom:1px solid #e6d9cc;display:flex;align-items:center;gap:18px;padding:0 26px;position:sticky;top:0;z-index:10}.admin-topbar-title{min-width:145px}.admin-topbar-title small{display:block;color:#9a7c6e;font-size:11px}.admin-topbar-title b{font-size:14px}.top-search{height:44px;flex:1;max-width:580px;border:1px solid #e3d4c7;border-radius:999px;background:white;color:#aa9a91;padding:0 18px;display:flex;align-items:center;gap:10px}.admin-user{margin-left:auto;display:flex;align-items:center;gap:10px}.admin-user a,.shortcut{display:flex;align-items:center;gap:7px;border:1px solid #e1d2c5;border-radius:999px;padding:9px 13px;background:white;color:#5d4037;font-size:13px}.admin-user .gear{width:42px;height:42px;justify-content:center;padding:0}.customer-tabs{max-width:1216px;margin:20px auto 0;display:grid;grid-template-columns:repeat(3,1fr);gap:4px;padding:4px;border:1px solid #e3d4c7;border-radius:18px;background:white}.customer-tabs a{min-height:46px;display:flex;align-items:center;justify-content:center;gap:8px;border-radius:14px;color:#6f5d54;font-size:14px}.customer-tabs a.active{background:#9c5344;color:white}.chat-local-header{display:none!important}.admin-stage .wrap{max-width:1216px;padding:24px 0 36px}.admin-stage .hero{border-radius:22px;background:linear-gradient(135deg,#fffdf9,#f7efe7);padding:25px 28px}.admin-stage .hero h1{font-family:inherit;font-size:30px;font-weight:700}.admin-stage .panel{border-radius:20px;box-shadow:0 8px 24px #5c403414}.admin-stage .grid{grid-template-columns:310px minmax(0,1fr);gap:16px}.admin-stage .messages{height:54vh}.admin-stage .send textarea{min-height:58px}.admin-stage .primary{background:#9c5344}@media(max-width:900px){.admin-sidebar{width:220px}.admin-stage{margin-left:220px}.top-search{display:none}}@media(max-width:700px){body{display:block}.admin-sidebar{display:none}.admin-stage{margin-left:0}.admin-topbar{height:62px;padding:0 12px}.admin-topbar-title small,.shortcut{display:none}.admin-user span{display:none}.customer-tabs{margin:10px 10px 0}.admin-stage .wrap{padding:14px 10px}.admin-stage .grid{grid-template-columns:1fr}}
  </style>`
  const shell = `<aside class="admin-sidebar"><div class="admin-brand"><img class="brand-logo" src="/_next/image?url=%2Fbrand%2Fsalon-interior-illustrated.png&w=3840&q=75" alt="Salon de Lien"><div><b>Salon de Lien</b><small>既存客を動かす美容室CRM</small></div></div><nav class="admin-nav" aria-label="管理画面ナビゲーション"><a href="/admin/appointments"><span class="nav-icon">${icons.calendar}</span>予約カレンダー</a><a class="active" href="/admin/customers"><span class="nav-icon">${icons.users}</span>顧客・チャット・配信</a><a href="/admin/products?section=menus"><span class="nav-icon">${icons.package}</span>メニュー・商品棚・集計</a><a href="/admin/community"><span class="nav-icon">${icons.images}</span>スタイル共有</a><a href="/admin/owner-analytics"><span class="nav-icon">${icons.chart}</span>経営分析</a></nav><div class="admin-sidebar-footer">今日の接客を、次の関係へ。</div></aside><div class="admin-stage"><div class="admin-topbar"><div class="admin-topbar-title"><small>Salon de Lien</small><b>顧客・チャット・配信</b></div><div class="top-search">${icons.search}<span>顧客名・電話・メモで検索</span></div><span class="shortcut">${icons.command}<span>Ctrl K</span></span><div class="admin-user"><a href="/admin/account" aria-label="アカウント設定">${icons.user}<span>${displayName}</span></a><a class="gear" href="/admin/settings" aria-label="設定">${icons.settings}</a></div></div><nav class="customer-tabs" aria-label="顧客ページ切替"><a href="/admin/customers">${icons.users}<span>顧客管理</span></a><a class="active" href="/admin/customers/messages/chat">${icons.message}<span>チャット</span></a><a href="/admin/customers/messages">${icons.megaphone}<span>配信</span></a></nav>`
  html = html.replace('</head>', `${shellCss}</head>`).replace('<body>', `<body>${shell}`).replace('<header>', '<header class="chat-local-header">').replace('</body>', '</div></body>')
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
      if (url.pathname === '/admin/chat') { res.statusCode = 308; res.setHeader('Location', '/admin/customers/messages/chat'); return res.end() }
      if (url.pathname === '/u/chat' || url.pathname === '/admin/customers/messages/chat') {
        const audience = url.pathname.startsWith('/u/') ? 'customer' : 'staff'
        const session = await chatSession(req, audience)
        if (!session) { res.statusCode = 302; res.setHeader('Location', audience === 'customer' ? '/u/login' : '/admin/login'); return res.end() }
        res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.setHeader('Cache-Control', 'no-store'); return res.end(chatHtml(audience, session))
      }
      if (url.pathname === '/u/appointments') return handle(req, res)
      if (url.pathname.startsWith('/admin/') && !url.pathname.startsWith('/admin/login')) return handle(req, res)
      return handle(req, res)
    } catch (err) { console.error('chat server error', err); if (!res.headersSent) json(res, 500, { error: 'チャット処理に失敗しました。' }); else res.end() }
  })
  if (keepAliveTimeout !== undefined) server.keepAliveTimeout = keepAliveTimeout
  server.listen(currentPort, hostname, () => console.log(`Salon de Lien listening on ${hostname}:${currentPort}`))
}).catch(err => { console.error(err); process.exit(1) })
