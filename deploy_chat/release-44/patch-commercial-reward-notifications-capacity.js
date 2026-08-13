const fs = require('fs')
const path = require('path')

const appRoot = process.env.APP_ROOT || '/app'
const marker = 'commercial-reward-notifications-capacity-v44'

const read = relative => fs.readFileSync(path.join(appRoot, relative), 'utf8')
const write = (relative, source) => fs.writeFileSync(path.join(appRoot, relative), source, 'utf8')

function replaceOnce(source, before, after, label) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`)
  return source.replace(before, after)
}

function patchTreasureServer() {
  const relative = '.next/server/chunks/8404.js'
  let source = read(relative)
  if (source.includes(marker)) return

  const before = '(0,n.jsxs)("span",{"aria-hidden":"true",className:`mx-auto block w-full max-w-[88px] ${r&&!o?"motion-safe:animate-bounce":""}`,children:[n.jsx("span",{className:`block h-7 rounded-t-xl border-2 border-[#7d5034] bg-[#d8b56d] transition-transform ${r&&o?"-translate-y-2 -rotate-6":""}`}),n.jsx("span",{className:"relative -mt-0.5 block h-16 rounded-b-xl border-2 border-[#7d5034] bg-[#b97350] shadow-[inset_0_8px_0_rgba(255,255,255,0.18)]",children:n.jsx("span",{className:"absolute left-1/2 top-4 h-7 w-5 -translate-x-1/2 rounded-md border-2 border-[#7d5034] bg-[#f1ce78]"})})]})'
  const after = `(0,n.jsxs)("span",{"aria-hidden":"true",className:"relative mx-auto block h-[96px] w-[96px]",children:[n.jsx("span",{className:\`absolute inset-1 rounded-full bg-[radial-gradient(circle,rgba(234,190,102,0.5)_0%,rgba(255,244,214,0.18)_55%,transparent_72%)] blur-md transition-opacity \${r?"opacity-100":"opacity-45"}\`}),n.jsx("img",{src:r&&o?"/rewards/treasure-open-v2.png":"/rewards/treasure-closed-v2.png",alt:"",className:\`relative z-10 h-full w-full object-contain drop-shadow-[0_12px_14px_rgba(91,51,44,0.24)] transition duration-500 \${r&&!o?"motion-safe:animate-bounce":""} \${r&&o?"scale-110":""}\`}),r&&o?(0,n.jsxs)(n.Fragment,{children:[n.jsx("span",{className:"absolute left-1 top-1 z-20 h-2 w-2 rotate-45 rounded-sm bg-[#f5cf72] shadow-[0_0_10px_#f5cf72]"}),n.jsx("span",{className:"absolute right-0 top-6 z-20 h-1.5 w-1.5 rotate-45 rounded-sm bg-white shadow-[0_0_9px_#d8b56d]"}),n.jsx("span",{className:"absolute bottom-4 left-0 z-20 h-1.5 w-1.5 rounded-full bg-[#d99087] shadow-[0_0_8px_#d99087]"})]}):null/* ${marker} */]})`
  source = replaceOnce(source, before, after, 'server treasure artwork')
  write(relative, source)
}

function patchTreasureClient() {
  const relative = '.next/static/chunks/5691-4da1d9e518b3859d.js'
  let source = read(relative)
  if (source.includes(marker)) return

  const before = '(0,l.jsxs)("span",{"aria-hidden":"true",className:"mx-auto block w-full max-w-[88px] ".concat(s&&!d?"motion-safe:animate-bounce":""),children:[(0,l.jsx)("span",{className:"block h-7 rounded-t-xl border-2 border-[#7d5034] bg-[#d8b56d] transition-transform ".concat(s&&d?"-translate-y-2 -rotate-6":"")}),(0,l.jsx)("span",{className:"relative -mt-0.5 block h-16 rounded-b-xl border-2 border-[#7d5034] bg-[#b97350] shadow-[inset_0_8px_0_rgba(255,255,255,0.18)]",children:(0,l.jsx)("span",{className:"absolute left-1/2 top-4 h-7 w-5 -translate-x-1/2 rounded-md border-2 border-[#7d5034] bg-[#f1ce78]"})})]})'
  const after = `(0,l.jsxs)("span",{"aria-hidden":"true",className:"relative mx-auto block h-[96px] w-[96px]",children:[(0,l.jsx)("span",{className:"absolute inset-1 rounded-full bg-[radial-gradient(circle,rgba(234,190,102,0.5)_0%,rgba(255,244,214,0.18)_55%,transparent_72%)] blur-md transition-opacity ".concat(s?"opacity-100":"opacity-45")}),(0,l.jsx)("img",{src:s&&d?"/rewards/treasure-open-v2.png":"/rewards/treasure-closed-v2.png",alt:"",className:"relative z-10 h-full w-full object-contain drop-shadow-[0_12px_14px_rgba(91,51,44,0.24)] transition duration-500 ".concat(s&&!d?"motion-safe:animate-bounce":""," ").concat(s&&d?"scale-110":"")} ),s&&d?(0,l.jsxs)(l.Fragment,{children:[(0,l.jsx)("span",{className:"absolute left-1 top-1 z-20 h-2 w-2 rotate-45 rounded-sm bg-[#f5cf72] shadow-[0_0_10px_#f5cf72]"}),(0,l.jsx)("span",{className:"absolute right-0 top-6 z-20 h-1.5 w-1.5 rotate-45 rounded-sm bg-white shadow-[0_0_9px_#d8b56d]"}),(0,l.jsx)("span",{className:"absolute bottom-4 left-0 z-20 h-1.5 w-1.5 rounded-full bg-[#d99087] shadow-[0_0_8px_#d99087]"})]}):null/* ${marker} */]})`
  source = replaceOnce(source, before, after, 'client treasure artwork')
  write(relative, source)
}

function patchCustomerShellServer() {
  const relative = '.next/server/chunks/1597.js'
  let source = read(relative)
  if (source.includes(`${marker}-shell`)) return

  source = replaceOnce(
    source,
    'function b({customerName:e,children:t}){',
    'function b({customerName:e,unreadCount:N=0,children:t}){',
    'server shell unread prop',
  )

  source = replaceOnce(
    source,
    'a.jsx(r.default,{href:"/u/news",className:"lien-icon-button text-[#8f4f42] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#e9c9be]/50","aria-label":"サロンからのお知らせ",title:"お知らせ",children:a.jsx(u,{className:"h-4 w-4"})})',
    '(0,a.jsxs)(r.default,{href:"/u/news",className:"lien-icon-button relative text-[#8f4f42] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#e9c9be]/50","aria-label":N>0?`サロンからのお知らせ 未読${N}件`:"サロンからのお知らせ",title:"お知らせ",children:[a.jsx(u,{className:"h-4 w-4"}),N>0?a.jsx("span",{className:"absolute -right-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[#c54843] px-1 text-[10px] font-bold leading-none text-white ring-2 ring-[#fffdf9]",children:N>99?"99+":N}):null]})',
    'server mobile notification badge',
  )

  source = replaceOnce(
    source,
    '(0,a.jsx)(r.default,{href:"/u/news",className:"customer-premium-icon-button","aria-label":"お知らせ",children:(0,a.jsx)("span",{className:"customer-premium-bell-icon","aria-hidden":true})})',
    '(0,a.jsxs)(r.default,{href:"/u/news",className:"customer-premium-icon-button relative","aria-label":N>0?`お知らせ 未読${N}件`:"お知らせ",children:[(0,a.jsx)("span",{className:"customer-premium-bell-icon","aria-hidden":true}),N>0?a.jsx("span",{className:"absolute -right-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[#c54843] px-1 text-[10px] font-bold leading-none text-white ring-2 ring-[#fffdf9]",children:N>99?"99+":N}):null]})',
    'server desktop notification badge',
  )

  source = replaceOnce(
    source,
    'var n=s(65051);let i="force-dynamic";async function c({children:e}){let t=await (0,n.j)();return t||(0,r.redirect)("/u/login"),a.jsx(l,{customerName:t.customer.name,children:e})}',
    `var n=s(65051),o=s(13538);let i="force-dynamic";async function c({children:e}){let t=await (0,n.j)();if(!t)return(0,r.redirect)("/u/login");let s=await o._.$queryRawUnsafe('SELECT ((SELECT COUNT(*)::int FROM "CustomerBroadcastRecipient" r JOIN "CustomerBroadcast" b ON b."id"=r."broadcastId" WHERE r."customerId"=$1 AND r."readAt" IS NULL AND b."status"=\\'sent\\') + (SELECT COUNT(*)::int FROM "ChatMessage" m JOIN "ChatThread" th ON th."id"=m."threadId" WHERE th."customerId"=$1 AND th."organizationId"=$2 AND m."senderType"=\\'staff\\' AND (th."customerLastReadAt" IS NULL OR m."createdAt">th."customerLastReadAt")))::int AS "count"',t.customerId,t.organizationId).catch(()=>[]),i=Math.max(0,Number(s[0]?.count??0));return a.jsx(l,{customerName:t.customer.name,unreadCount:i,children:e})}/* ${marker}-shell */`,
    'server layout unread query',
  )

  write(relative, source)
}

function patchCustomerShellClient() {
  const relative = '.next/static/chunks/app/u/(account)/layout-1c1963f4f2eb1b14.unified-reservation-chat.premium-mobile-v29.customer-home-unified-v35.customer-shell-chat-v36.js'
  let source = read(relative)
  if (source.includes(`${marker}-shell`)) return

  source = replaceOnce(
    source,
    'function b(e){let{customerName:t,children:s}=e,',
    'function b(e){let{customerName:t,unreadCount:N=0,children:s}=e,',
    'client shell unread prop',
  )

  source = replaceOnce(
    source,
    '(0,a.jsx)(l.default,{href:"/u/news",className:"lien-icon-button text-[#8f4f42] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#e9c9be]/50","aria-label":"サロンからのお知らせ",title:"お知らせ",children:(0,a.jsx)(x,{className:"h-4 w-4"})})',
    '(0,a.jsxs)(l.default,{href:"/u/news",className:"lien-icon-button relative text-[#8f4f42] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#e9c9be]/50","aria-label":N>0?"サロンからのお知らせ 未読".concat(N,"件"):"サロンからのお知らせ",title:"お知らせ",children:[(0,a.jsx)(x,{className:"h-4 w-4"}),N>0?(0,a.jsx)("span",{className:"absolute -right-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[#c54843] px-1 text-[10px] font-bold leading-none text-white ring-2 ring-[#fffdf9]",children:N>99?"99+":N}):null]})',
    'client mobile notification badge',
  )

  source = replaceOnce(
    source,
    '(0,a.jsx)(l.default,{href:"/u/news",className:"customer-premium-icon-button","aria-label":"お知らせ",children:(0,a.jsx)("span",{className:"customer-premium-bell-icon","aria-hidden":true})})',
    '(0,a.jsxs)(l.default,{href:"/u/news",className:"customer-premium-icon-button relative","aria-label":N>0?"お知らせ 未読".concat(N,"件"):"お知らせ",children:[(0,a.jsx)("span",{className:"customer-premium-bell-icon","aria-hidden":true}),N>0?(0,a.jsx)("span",{className:"absolute -right-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[#c54843] px-1 text-[10px] font-bold leading-none text-white ring-2 ring-[#fffdf9]",children:N>99?"99+":N}):null]})/* commercial-reward-notifications-capacity-v42-shell */',
    'client desktop notification badge',
  )

  write(relative, source)
}

function patchAdminCapacityClient() {
  const relative = '.next/static/chunks/app/admin/appointments/page-shift-layout-20260812-02.js'
  let source = read(relative)
  if (source.includes(`${marker}-admin-capacity`)) return

  const before = `        (0, l.useEffect)(() => {
          try {
            let e = window.localStorage.getItem(
              "salon-capacity-overrides:".concat(t),
            );
            e && setCapacityOverrides(JSON.parse(e));
          } catch (e) {}
        }, [t]);
        function updateCapacityOverride(e, n) {
          setCapacityOverrides((r) => {
            let a = { ...r, [e]: v(Number(n) || 0, 0, 99) };
            try {
              window.localStorage.setItem(
                "salon-capacity-overrides:".concat(t),
                JSON.stringify(a),
              );
            } catch (e) {}
            return a;
          });
        }`

  const after = `        (0, l.useEffect)(() => {
          let e = !1,
            n = "salon-capacity-overrides:".concat(t),
            r = {};
          try {
            let e = window.localStorage.getItem(n);
            e && ((r = JSON.parse(e)), setCapacityOverrides(r));
          } catch (e) {}
          return (
            fetch("/api/lien-capacity?date=".concat(encodeURIComponent(t)), {
              cache: "no-store",
            })
              .then((e) => (e.ok ? e.json() : null))
              .then((a) => {
                if (e || !a || !Array.isArray(a.overrides)) return;
                let i = Object.fromEntries(
                  a.overrides.map((e) => [Number(e.slotStart), Number(e.remaining)]),
                );
                if (Object.keys(i).length) {
                  setCapacityOverrides(i);
                  try {
                    window.localStorage.setItem(n, JSON.stringify(i));
                  } catch (e) {}
                } else
                  Object.entries(r).forEach(([e, n]) => {
                    fetch("/api/lien-capacity", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        date: t,
                        slotStart: Number(e),
                        remaining: Number(n),
                      }),
                    }).catch(() => {});
                  });
              })
              .catch(() => {}),
            () => {
              e = !0;
            }
          );
        }, [t]);
        function updateCapacityOverride(e, n) {
          let r = v(Number(n) || 0, 0, 99);
          setCapacityOverrides((n) => {
            let a = { ...n, [e]: r };
            try {
              window.localStorage.setItem(
                "salon-capacity-overrides:".concat(t),
                JSON.stringify(a),
              );
            } catch (e) {}
            return a;
          });
          fetch("/api/lien-capacity", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ date: t, slotStart: e, remaining: r }),
          }).catch(() => {});
        } /* ${marker}-admin-capacity */`

  source = replaceOnce(source, before, after, 'admin capacity persistence')
  write(relative, source)
}

function patchAvailabilityApi() {
  const relative = '.next/server/app/api/customer/appointments/availability/route.js'
  let source = read(relative)
  if (source.includes(`${marker}-availability`)) return

  source = replaceOnce(
    source,
    'w="free"===n?v:v.filter(e=>e.staffKey===n),k=new Date,A=(0,l.zl)(k),j=c.map(e=>{',
    `w="free"===n?v:v.filter(e=>e.staffKey===n),remainingForSlot=(e,t)=>{let a=capacityOverrides.find(a=>a.date===e&&Number(a.slotStart)===t);if(a)return Math.max(0,Number(a.remaining));let n=t+30,r=v.reduce((e,a)=>e+(a.workStartMinutes<n&&t<a.workEndMinutes?a.maxConcurrentAppointments:0),0),s=h.filter(a=>{if((0,l.Y$)(a.scheduledAt)!==e)return!1;let r=(0,l.zl)(a.scheduledAt);return r<n&&t<r+(a.durationMinutes??60)}).length;return Math.max(0,r-s)},k=new Date,A=(0,l.zl)(k),j=c.map(e=>{/* ${marker}-availability */`,
    'availability aggregate capacity helper',
  )

  source = replaceOnce(
    source,
    ').sort((e,t)=>e-t).filter(slot=>!capacityOverrides.some(o=>o.date===e&&Number(o.remaining)===0&&Number(o.slotStart)>=slot&&Number(o.slotStart)<slot+r.durationMinutes));return{date:e,available:a.length>0,slots:a}});',
    ').sort((e,t)=>e-t).filter(t=>Array.from({length:Math.ceil(r.durationMinutes/30)},(e,a)=>t+30*a).every(t=>remainingForSlot(e,t)>0));return{date:e,available:a.length>0,slots:a}});',
    'availability aggregate capacity filter',
  )

  write(relative, source)
}

function patchAppointmentApi() {
  const relative = '.next/server/app/api/customer/appointments/route.js'
  let source = read(relative)
  if (source.includes(`${marker}-create`)) return

  source = replaceOnce(
    source,
    `let capacityBlocks=await e.$queryRawUnsafe('SELECT "slotStart" FROM "BookingCapacityOverride" WHERE "organizationId"=$1 AND "date"=$2 AND "remaining"=0 AND "slotStart">=$3 AND "slotStart"<$4',t.organizationId,s,o,o+a.durationMinutes);if(capacityBlocks.length)throw Error("この時間は受付を終了しました。別の時間を選んでください。");`,
    `let capacityRows=await e.$queryRawUnsafe('SELECT "slotStart","remaining" FROM "BookingCapacityOverride" WHERE "organizationId"=$1 AND "date"=$2 AND "slotStart">=$3 AND "slotStart"<$4',t.organizationId,s,o,o+a.durationMinutes);if(capacityRows.some(e=>Number(e.remaining)===0))throw Error("この時間は受付を終了しました。別の時間を選んでください。");`,
    'appointment explicit capacity rows',
  )

  source = replaceOnce(
    source,
    'if(h.some(e=>e.customerId===n.id&&(0,l.ep)({startMinutes:o,durationMinutes:a.durationMinutes},{startMinutes:(0,l.zl)(e.scheduledAt),durationMinutes:e.durationMinutes??60})))throw Error("同じ時間帯にすでに予約があります。");let w=p.map(e=>{',
    `if(h.some(e=>e.customerId===n.id&&(0,l.ep)({startMinutes:o,durationMinutes:a.durationMinutes},{startMinutes:(0,l.zl)(e.scheduledAt),durationMinutes:e.durationMinutes??60})))throw Error("同じ時間帯にすでに予約があります。");let aggregateCapacityBlocked=Array.from({length:Math.ceil(a.durationMinutes/30)},(e,t)=>o+30*t).some(t=>{let n=capacityRows.find(e=>Number(e.slotStart)===t);if(n)return Number(n.remaining)<=0;let r=t+30,a=d.reduce((e,n)=>e+(n.workStartMinutes<r&&t<n.workEndMinutes?n.maxConcurrentAppointments:0),0),s=h.filter(e=>{let n=(0,l.zl)(e.scheduledAt);return n<r&&t<n+(e.durationMinutes??60)}).length;return a-s<=0});if(aggregateCapacityBlocked)throw Error("この時間は受付可能数が0です。別の時間を選んでください。");let w=p.map(e=>{/* ${marker}-create */`,
    'appointment aggregate capacity guard',
  )

  write(relative, source)
}

function cacheBustStaticChunk(oldChunk, newChunk, label) {
  const oldAbsolute = path.join(appRoot, '.next', oldChunk)
  const newAbsolute = path.join(appRoot, '.next', newChunk)
  if (!fs.existsSync(oldAbsolute)) throw new Error(`${label}: source chunk not found`)
  fs.copyFileSync(oldAbsolute, newAbsolute)

  const nextRoot = path.join(appRoot, '.next')
  const targets = []
  function collect(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name)
      if (entry.isDirectory()) collect(absolute)
      else if (/\.(?:json|js)$/.test(entry.name)) targets.push(absolute)
    }
  }
  collect(nextRoot)

  let references = 0
  for (const absolute of targets) {
    if (absolute === oldAbsolute || absolute === newAbsolute) continue
    const source = fs.readFileSync(absolute, 'utf8')
    if (!source.includes(oldChunk)) continue
    fs.writeFileSync(absolute, source.split(oldChunk).join(newChunk), 'utf8')
    references += 1
  }
  if (references < 1) throw new Error(`${label}: no manifest references updated`)
}

patchTreasureServer()
patchTreasureClient()
patchCustomerShellServer()
patchCustomerShellClient()
patchAdminCapacityClient()

cacheBustStaticChunk(
  'static/chunks/5691-4da1d9e518b3859d.js',
  'static/chunks/5691-4da1d9e518b3859d.reward-chest-v44.js',
  'treasure client chunk',
)
cacheBustStaticChunk(
  'static/chunks/app/u/(account)/layout-1c1963f4f2eb1b14.unified-reservation-chat.premium-mobile-v29.customer-home-unified-v35.customer-shell-chat-v36.js',
  'static/chunks/app/u/(account)/layout-1c1963f4f2eb1b14.unified-reservation-chat.premium-mobile-v29.customer-home-unified-v35.customer-shell-chat-v36.notification-badge-v44.js',
  'customer shell client chunk',
)

cacheBustStaticChunk(
  'static/chunks/app/admin/appointments/page-shift-layout-20260812-02.js',
  'static/chunks/app/admin/appointments/page-shift-layout-20260812-02.capacity-persist-v44.js',
  'admin capacity client chunk',
)

console.log('patched premium reward chest, customer notification badge, and persisted admin booking capacity')
