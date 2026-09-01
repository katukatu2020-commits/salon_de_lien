import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || process.env.APP_ROOT || '/app'
const marker = 'shift-grid-synchronization-v526'
const oldChunkName = 'page-shift-line-break-v461.js'
const newChunkName = 'page-shift-grid-sync-v526.js'
const chunkDir = path.join(root, '.next', 'static', 'chunks', 'app', 'admin', 'appointments')
const oldChunkPath = path.join(chunkDir, oldChunkName)
const newChunkPath = path.join(chunkDir, newChunkName)
const appManifestPath = path.join(root, '.next', 'app-build-manifest.json')
const clientManifestPath = path.join(root, '.next', 'server', 'app', 'admin', 'appointments', 'page_client-reference-manifest.js')
const tenantClientPath = path.join(root, 'tenant-setup-client.js')
const serverPath = path.join(root, 'server.js')

function replaceExact(source, before, after, expected, label) {
  const count = source.split(before).length - 1
  if (count !== expected) throw new Error(`${label}: expected ${expected} matches, found ${count}`)
  return source.split(before).join(after)
}

if (!fs.existsSync(oldChunkPath)) throw new Error(`${marker}: active v461 shift chunk is missing`)
if (fs.existsSync(newChunkPath)) throw new Error(`${marker}: cache-busted shift chunk already exists`)

let server = fs.readFileSync(serverPath, 'utf8')
if (server.includes(marker)) throw new Error(`${marker}: server patch already applied`)
server = replaceExact(
  server,
  `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Coupon-Broadcast-Delivery', 'v525')`,
  `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Coupon-Broadcast-Delivery', 'v525')
      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Shift-Grid-Synchronization', 'v526') /* ${marker} */`,
  1,
  'shift grid readiness marker',
)
fs.writeFileSync(serverPath, server)

let shift = fs.readFileSync(oldChunkPath, 'utf8')
if (shift.includes(marker)) throw new Error(`${marker}: shift patch already applied`)
shift = replaceExact(
  shift,
  `          q = L < 440 ? 60 : 30,`,
  `          q = L < 440 && 0 === __businessDuration % 60 ? 60 : 30, /* ${marker}: buckets divide the full business day */`,
  1,
  'responsive shift bucket duration',
)
shift = replaceExact(
  shift,
  `            let e = E.current;
            if (!e) return;
            let t = () =>
              Z(Math.max(1, Math.floor(e.getBoundingClientRect().width)));
            t();
            let n = new ResizeObserver(t);
            return (n.observe(e), () => n.disconnect());`,
  `            let e = E.current;
            if (!e) return;
            let t = e.querySelector(".shift-canvas") || e,
              n = () => Z(Math.max(1, t.getBoundingClientRect().width));
            n();
            let r = new ResizeObserver(n);
            return (r.observe(t), () => r.disconnect());`,
  1,
  'canonical shift canvas measurement',
)
shift = replaceExact(
  shift,
  `            return (r.observe(t), () => r.disconnect());
          }, []));`,
  `            return (r.observe(t), () => r.disconnect());
          }, [__shiftHydrated])); /* ${marker}: attach after the loading placeholder is replaced */`,
  1,
  'post-hydration shift measurement',
)
shift = replaceExact(
  shift,
  `                className: "shift-canvas w-full",
                children: [`,
  `                className: "shift-canvas w-full",
                style: { "--ts-shift-slots": String(F.length) }, /* ${marker}: one slot source for summary and staff lanes */
                children: [`,
  1,
  'canonical shift slot count',
)
fs.writeFileSync(newChunkPath, shift)

let tenantClient = fs.readFileSync(tenantClientPath, 'utf8')
tenantClient = replaceExact(
  tenantClient,
  `    const slots = Number(canvas.style.getPropertyValue('--ts-shift-slots') || getComputedStyle(canvas).getPropertyValue('--ts-shift-slots'))
    if (!Number.isFinite(slots) || slots < 1) return`,
  `    const summarySlots = canvas.querySelector('.shift-top > div:nth-child(4) > div')?.children.length || 0
    const slots = Number(summarySlots || canvas.style.getPropertyValue('--ts-shift-slots') || getComputedStyle(canvas).getPropertyValue('--ts-shift-slots'))
    if (!Number.isFinite(slots) || slots < 1) return
    canvas.style.setProperty('--ts-shift-slots', String(slots)) /* ${marker}: mirror the rendered summary grid */`,
  1,
  'tenant shift slot reconciliation',
)
tenantClient = replaceExact(
  tenantClient,
  `    canvas.style.setProperty('--ts-shift-slots', String(duration / 30))`,
  `    /* ${marker}: React owns --ts-shift-slots so responsive rows cannot diverge. */`,
  1,
  'legacy fixed 30-minute slot override',
)
fs.writeFileSync(tenantClientPath, tenantClient)

let appManifest = fs.readFileSync(appManifestPath, 'utf8')
appManifest = replaceExact(appManifest, oldChunkName, newChunkName, 1, 'app-build manifest reference')
fs.writeFileSync(appManifestPath, appManifest)

let clientManifest = fs.readFileSync(clientManifestPath, 'utf8')
clientManifest = replaceExact(clientManifest, oldChunkName, newChunkName, 7, 'client-reference manifest references')
fs.writeFileSync(clientManifestPath, clientManifest)

console.log(JSON.stringify({ release: marker, chunk: newChunkName, patched: true }))
