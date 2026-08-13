const fs = require('fs')
const path = require('path')

const appRoot = process.env.APP_ROOT || '/app'
const pointsChunkFile = path.join(appRoot, '.next', 'server', 'chunks', '3491.js')
const messagesPageFile = path.join(appRoot, '.next', 'server', 'app', 'admin', 'customers', 'messages', 'page.js')

function replaceOnce(source, before, after, label) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`)
  return source.replace(before, after)
}

function replaceRegexOnce(source, pattern, replacement, label) {
  const matches = source.match(new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`)) || []
  if (matches.length !== 1) throw new Error(`${label}: expected one match, found ${matches.length}`)
  return source.replace(pattern, replacement)
}

function patchPointsChunk() {
  let source = fs.readFileSync(pointsChunkFile, 'utf8')
  if (source.includes('point-management-modal-v35')) return

  const moduleStart = source.indexOf('51589:')
  const moduleEnd = source.indexOf('},5051:', moduleStart)
  if (moduleStart < 0 || moduleEnd < 0) throw new Error('point management module 51589 was not found')

  let moduleSource = source.slice(moduleStart, moduleEnd + 1)
  moduleSource = replaceOnce(
    moduleSource,
    'var l=s(19510),a=s(38698)',
    'var l=s(19510),k=s(57371),a=s(38698)',
    'point management Link import',
  )
  moduleSource = replaceOnce(
    moduleSource,
    'async function u(){',
    'async function u({page:E=1,embedded:Q=!1,basePath:K="/admin/customers/messages"}={}){',
    'point management component props',
  )
  moduleSource = replaceOnce(
    moduleSource,
    'u.setDate(u.getDate()+30);let[h,g,f,j]=await Promise.all([',
    'u.setDate(u.getDate()+30);let H=await p._.pointTransaction.count({where:e}),I=Math.max(1,Math.ceil(H/50));E=Math.min(Math.max(1,Number(E)||1),I);let[h,g,f,j]=await Promise.all([',
    'point transaction count and page bounds',
  )
  moduleSource = replaceOnce(
    moduleSource,
    'orderBy:{createdAt:"desc"},take:20,select:',
    'orderBy:{createdAt:"desc"},skip:(E-1)*50,take:50,select:',
    '50 item point history query',
  )
  moduleSource = replaceOnce(
    moduleSource,
    'className:"mx-auto grid max-w-6xl gap-6",children:[l.jsx(m.Z,{active:"points"}),l.jsx(c.mr,{eyebrow:"Point Management"',
    'className:Q?"grid gap-5":"mx-auto grid max-w-6xl gap-6",children:[Q?null:l.jsx(m.Z,{active:"points"}),Q?null:l.jsx(c.mr,{eyebrow:"Point Management"',
    'embedded point layout',
  )
  moduleSource = replaceOnce(
    moduleSource,
    'children:"直近20件"',
    'children:[H,"件中 ",H?(E-1)*50+1:0,"〜",Math.min(E*50,H),"件"]',
    'point history range label',
  )

  const emptyHistory = 'l.jsx("div",{className:"p-5 sm:p-6",children:l.jsx(c.ub,{icon:o.Z,title:"ポイント履歴はまだありません",description:"ポイントを付与または利用すると、ここに履歴が表示されます。"})})'
  const pagination = `(0,l.jsxs)("nav",{className:"flex items-center justify-between gap-3 border-t border-[color:var(--lien-border)] px-5 py-4 sm:px-6","aria-label":"ポイント履歴のページ切替",children:[E>1?(0,l.jsxs)(k.default,{href:\`${'${K}'}?points=1&pointPage=${'${E-1}'}#point-management-dialog\`,className:"inline-flex min-h-10 items-center rounded-full border border-[color:var(--lien-border)] bg-white px-4 text-sm font-semibold text-[color:var(--lien-ink)]",children:["← ","前の50件"]}):l.jsx("span",{}),(0,l.jsxs)("span",{className:"text-xs font-semibold tabular-nums text-[color:var(--lien-muted)]",children:[E," / ",I,"ページ"]}),E<I?(0,l.jsxs)(k.default,{href:\`${'${K}'}?points=1&pointPage=${'${E+1}'}#point-management-dialog\`,className:"inline-flex min-h-10 items-center rounded-full bg-[color:var(--lien-primary)] px-4 text-sm font-semibold text-white",children:["次の50件"," →"]}):l.jsx("span",{})]})`
  moduleSource = replaceOnce(
    moduleSource,
    `${emptyHistory}]})]})}`,
    `${emptyHistory},I>1?${pagination}:null]})]})}`,
    'point history pagination',
  )

  moduleSource += '/* point-management-modal-v35 */'
  source = `${source.slice(0, moduleStart)}${moduleSource}${source.slice(moduleEnd + 1)}`
  source = replaceOnce(
    source,
    'if("points"===e.section)return a.jsx(h.v,{});',
    'if("points"===e.section)(0,r.redirect)("/admin/customers/messages?points=1&pointPage=1#point-management-dialog");',
    'legacy point page redirect',
  )
  fs.writeFileSync(pointsChunkFile, source)
}

function patchMessagesPage() {
  let source = fs.readFileSync(messagesPageFile, 'utf8')
  if (source.includes('point-management-dialog-v35')) return

  source = replaceRegexOnce(
    source,
    /(\bf\s*=\s*t\(13538\))\s*;/,
    '$1,\n          P = t(51589);',
    'messages page point component import',
  )

  const navPattern = /r\.jsx\(u\.Z,\s*\{\s*active:\s*"messages"\s*\}\),/
  const navMatch = source.match(navPattern)
  if (!navMatch) throw new Error('messages navigation render was not found')
  const modal = `
              e?.points === "1"
                ? (0, r.jsxs)("section", {
                    id: "point-management-dialog",
                    role: "dialog",
                    "aria-modal": true,
                    "aria-labelledby": "point-management-title",
                    style: {
                      position: "fixed",
                      inset: 0,
                      zIndex: 90,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "clamp(12px, 3vw, 32px)",
                      background: "rgba(47, 42, 37, 0.52)",
                      backdropFilter: "blur(5px)",
                    },
                    children: [
                      r.jsx(n.default, {
                        href: "/admin/customers/messages",
                        "aria-label": "ポイント管理を閉じる",
                        style: { position: "absolute", inset: 0 },
                      }),
                      (0, r.jsxs)("div", {
                        style: {
                          position: "relative",
                          zIndex: 1,
                          display: "flex",
                          width: "min(1100px, 100%)",
                          maxHeight: "min(90vh, 920px)",
                          flexDirection: "column",
                          overflow: "hidden",
                          border: "1px solid var(--lien-border)",
                          borderRadius: "24px",
                          background: "#fffdfb",
                          boxShadow: "0 28px 80px rgba(47, 42, 37, 0.24)",
                        },
                        children: [
                          (0, r.jsxs)("header", {
                            style: {
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: "16px",
                              padding: "18px 22px",
                              borderBottom: "1px solid var(--lien-border)",
                              background: "#fff",
                            },
                            children: [
                              (0, r.jsxs)("div", {
                                children: [
                                  r.jsx("p", {
                                    style: { color: "var(--lien-primary-dark)", fontSize: "12px", fontWeight: 700 },
                                    children: "Point Management",
                                  }),
                                  r.jsx("h2", {
                                    id: "point-management-title",
                                    style: { marginTop: "3px", color: "var(--lien-ink)", fontSize: "22px", fontWeight: 700 },
                                    children: "ポイント管理",
                                  }),
                                ],
                              }),
                              r.jsx(n.default, {
                                href: "/admin/customers/messages",
                                "aria-label": "ポイント管理を閉じる",
                                style: {
                                  display: "grid",
                                  width: "42px",
                                  height: "42px",
                                  flex: "0 0 auto",
                                  placeItems: "center",
                                  border: "1px solid var(--lien-border)",
                                  borderRadius: "50%",
                                  color: "var(--lien-ink)",
                                  background: "#fff",
                                  fontSize: "24px",
                                  lineHeight: 1,
                                },
                                children: "×",
                              }),
                            ],
                          }),
                          r.jsx("div", {
                            style: { overflowY: "auto", padding: "clamp(14px, 2.4vw, 26px)" },
                            children: r.jsx(P.v, {
                              page: Math.max(1, parseInt(String(e?.pointPage ?? "1"), 10) || 1),
                              embedded: true,
                              basePath: "/admin/customers/messages",
                            }),
                          }),
                        ],
                      }),
                    ],
                  })
                : null,`
  source = source.replace(navPattern, `${navMatch[0]}${modal}`)

  const legacyHref = '/admin/customers?section=points'
  const hrefCount = source.split(legacyHref).length - 1
  if (hrefCount < 1) throw new Error('point management link was not found on messages page')
  source = source.split(legacyHref).join('/admin/customers/messages?points=1&pointPage=1#point-management-dialog')

  source = replaceRegexOnce(
    source,
    /s\.X\(0,\s*\[([^\]]+)\],\s*\(\)\s*=>\s*t\(9296\)\)/,
    (match, chunkList) => {
      const chunks = chunkList.split(',').map(value => value.trim()).filter(Boolean)
      // Module 51589 lives in chunk 3491 and uses helpers/icons from the same
      // dependency set as the customer page. Preload that complete set.
      for (const sharedChunk of ['2564', '7401', '3950', '7295', '2241', '3491']) {
        if (!chunks.includes(sharedChunk)) chunks.push(sharedChunk)
      }
      return `s.X(0, [${chunks.join(',')}], () => t(9296))`
    },
    'messages page shared chunk dependencies',
  )

  source += '\n/* point-management-dialog-v35 */\n'
  fs.writeFileSync(messagesPageFile, source)
}

patchPointsChunk()
patchMessagesPage()

console.log(JSON.stringify({
  patched: [
    'distribution point-management modal',
    '50-item point-history pagination',
    'legacy standalone point route redirect',
  ],
}))
