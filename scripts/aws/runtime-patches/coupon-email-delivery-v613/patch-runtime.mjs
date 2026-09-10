import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const marker = 'coupon-email-delivery-v613'
const here = path.dirname(fileURLToPath(import.meta.url))
const pageFile = '.next/server/app/admin/customers/messages/page.js'
const chunksPath = path.join(root, '.next', 'server', 'chunks')
const changes = []

function replaceExact(file, before, after, expected, label) {
  const target = path.join(root, file)
  const source = fs.readFileSync(target, 'utf8')
  const count = source.split(before).length - 1
  if (count !== expected) throw new Error(`${label}: expected ${expected} matches, found ${count}`)
  fs.writeFileSync(target, source.split(before).join(after))
  changes.push({ kind: 'replace', file, before, after, count })
}

function addFile(sourceName, targetName) {
  const target = path.join(root, targetName)
  if (fs.existsSync(target)) throw new Error(`${targetName}: target already exists`)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.copyFileSync(path.join(here, sourceName), target)
  changes.push({ kind: 'add', file: targetName })
}

function findActionChunk() {
  const candidates = fs.readdirSync(chunksPath)
    .filter(name => name.endsWith('.js'))
    .map(name => path.join(chunksPath, name))
    .filter(file => {
      const source = fs.readFileSync(file, 'utf8')
      return source.includes('coupon-broadcast-delivery-v525')
        && source.includes('対象者のうち${e}名に登録メールアドレスがありません')
    })

  if (candidates.length !== 1) {
    throw new Error(`customer broadcast action chunk: expected 1 match, found ${candidates.length}`)
  }
  return path.relative(root, candidates[0])
}

addFile('coupon-email-delivery-v613.js', 'public/coupon-email-delivery-v613.js')
addFile('coupon-email-delivery-v613.css', 'public/coupon-email-delivery-v613.css')

const actionFile = findActionChunk()

replaceExact(
  actionFile,
  `        if (0 === M.length)
          throw Error(
            "条件に一致する顧客がいません。配信条件を変更してください。",
          );
        if ("email" === deliveryMethod) {
          let e = M.filter((e) => !e.appUsers[0]?.email).length;
          if (e > 0)
            throw Error(\`対象者のうち\${e}名に登録メールアドレスがありません。対象を選び直してください。\`);
        }`,
  `        let skippedNoEmail = 0;
        if (0 === M.length)
          (0, o.redirect)(
            "/admin/customers/messages?error=no-recipients",
          );
        if ("email" === deliveryMethod) {
          let matchedBeforeEmailFilter = M.length;
          M = M.filter((e) => String(e.appUsers[0]?.email ?? "").trim());
          skippedNoEmail = matchedBeforeEmailFilter - M.length;
          if (0 === M.length)
            (0, o.redirect)(
              \`/admin/customers/messages?error=no-email-recipients&skipped=\${skippedNoEmail}\`,
            );
        } /* ${marker}: email delivery and coupon recipients share the same eligible set */`,
  1,
  'email recipient eligibility',
)

replaceExact(
  actionFile,
  `        if ("app" !== deliveryMethod) {`,
  `        let deliveryFailureCount = 0;
        if ("app" !== deliveryMethod) {`,
  1,
  'delivery failure counter',
)

replaceExact(
  actionFile,
  `            a = t.filter((e) => "rejected" === e.status).length;
          await u._.contactLog.createMany({`,
  `            a = t.filter((e) => "rejected" === e.status).length;
          deliveryFailureCount = a;
          await u._.contactLog.createMany({`,
  1,
  'capture delivery failures',
)

replaceExact(
  actionFile,
  `          if (a > 0)
            throw Error(\`\${M.length - a}名へ送信し、\${a}名への送信に失敗しました。配信履歴を確認してください。\`);`,
  `          /* ${marker}: provider failures are reported in-page after app delivery and coupon issuance */`,
  1,
  'provider failure handling',
)

replaceExact(
  actionFile,
  `            \`/admin/customers/messages?notice=sent&count=\${M.length}\`,`,
  `            deliveryFailureCount > 0
              ? \`/admin/customers/messages?notice=email-partial&count=\${M.length - deliveryFailureCount}&failed=\${deliveryFailureCount}&delivered=\${M.length}&skipped=\${skippedNoEmail}\`
              : \`/admin/customers/messages?notice=sent&count=\${M.length}&skipped=\${skippedNoEmail}&method=\${deliveryMethod}\`,`,
  1,
  'delivery result redirect',
)

replaceExact(
  pageFile,
  `                birthYear: !0,
                appointments: {`,
  `                birthYear: !0,
                appUsers: {
                  where: { role: "CUSTOMER", active: !0 },
                  select: { email: !0 },
                  take: 1,
                },
                appointments: {`,
  1,
  'customer email projection',
)

replaceExact(
  pageFile,
  `            N = l.filter((e) => e.birthDate || e.birthYear).length,
            y = Number(e?.count ?? 0);`,
  `            N = l.filter((e) => e.birthDate || e.birthYear).length,
            q = l.filter((e) => String(e.appUsers[0]?.email ?? "").trim()).length,
            y = Number(e?.count ?? 0);`,
  1,
  'email eligible customer count',
)

replaceExact(
  pageFile,
  `                      "名へ配信しました。",
                    ],`,
  `                      "名へ配信しました。",
                      Number(e?.skipped ?? 0) > 0
                        ? \` メール未登録の\${Number(e.skipped).toLocaleString("ja-JP")}名は対象外です。\`
                        : null,
                    ],`,
  1,
  'successful delivery banner details',
)

replaceExact(
  pageFile,
  `                  })
                : null,
              r.jsx("section", {
                className: "grid gap-3 sm:grid-cols-4",`,
  `                  })
                : null,
              e?.notice === "email-partial"
                ? r.jsx("div", {
                    role: "status",
                    className: "rounded-[18px] border border-[#e5c88f] bg-[#fff8e8] px-4 py-3 text-sm font-semibold leading-6 text-[#75551f]",
                    children: "メールは" + Number(e?.count ?? 0).toLocaleString("ja-JP") + "名へ送信し、" + Number(e?.failed ?? 0).toLocaleString("ja-JP") + "名分が送信失敗です。アプリ内のお知らせとクーポンは" + Number(e?.delivered ?? 0).toLocaleString("ja-JP") + "名分発行済みです。" + (Number(e?.skipped ?? 0) > 0 ? " メール未登録の" + Number(e.skipped).toLocaleString("ja-JP") + "名は対象外です。" : ""),
                  })
                : null,
              e?.error === "no-email-recipients"
                ? r.jsx("div", {
                    role: "alert",
                    className: "rounded-[18px] border border-[#e7b8b8] bg-[#fff1f1] px-4 py-3 text-sm font-semibold leading-6 text-[#8a3f3f]",
                    children: "選択条件に一致するメール登録済みのお客様がいません。" + Number(e?.skipped ?? 0).toLocaleString("ja-JP") + "名はメール未登録のため配信していません。",
                  })
                : null,
              e?.error === "no-recipients"
                ? r.jsx("div", {
                    role: "alert",
                    className: "rounded-[18px] border border-[#e7b8b8] bg-[#fff1f1] px-4 py-3 text-sm font-semibold leading-6 text-[#8a3f3f]",
                    children: "条件に一致するお客様がいません。配信条件を変更してください。",
                  })
                : null,
              r.jsx("section", {
                className: "grid gap-3 sm:grid-cols-2 xl:grid-cols-5",`,
  1,
  'delivery result banners',
)

replaceExact(
  pageFile,
  `                  ["年齢登録済み", N],`,
  `                  ["年齢登録済み", N],
                  ["メール配信可能", q],`,
  1,
  'email eligible KPI',
)

replaceExact(
  pageFile,
  `                                ),
                              }),
                            ],
                          }),
                          (0, r.jsxs)("label", {
                            className: "grid gap-2 text-sm font-semibold",`,
  `                                ),
                              }),
                              r.jsx("p", {
                                id: "broadcast-email-eligibility-v613",
                                "data-email-eligible-count": q,
                                "data-email-unregistered-count": l.length - q,
                                className: "col-span-2 rounded-[12px] border border-[#e7d8cf] bg-[#fffaf6] px-3 py-2 text-xs leading-5 text-[color:var(--lien-muted)]",
                                children: \`登録メールは\${q.toLocaleString("ja-JP")}名に配信可能です。未登録の\${(l.length - q).toLocaleString("ja-JP")}名は「登録メール」選択時に自動で対象外になります。\`,
                              }),
                            ],
                          }),
                          (0, r.jsxs)("label", {
                            className: "grid gap-2 text-sm font-semibold",`,
  1,
  'email eligibility explanation',
)

replaceExact(
  pageFile,
  `                                                  "顧客名または電話番号で検索し、配信する顧客にチェックしてください。",`,
  `                                                  "顧客名・メールアドレス・電話番号で検索できます。",`,
  1,
  'recipient modal help',
)

replaceExact(
  pageFile,
  `                                          placeholder: "顧客名・電話番号で検索",`,
  `                                          placeholder: "顧客名・メール・電話番号で検索",`,
  1,
  'recipient search placeholder',
)

replaceExact(
  pageFile,
  `                                                \`\${e.name} \${e.phone ?? ""}\`.toLowerCase(),
                                              "data-recipient-staff":`,
  `                                                \`\${e.name} \${e.appUsers[0]?.email ?? ""} \${e.phone ?? ""}\`.toLowerCase(),
                                              "data-recipient-email": String(e.appUsers[0]?.email ?? "").trim() ? "1" : "0",
                                              "data-recipient-staff":`,
  1,
  'recipient email metadata',
)

replaceExact(
  pageFile,
  `                                                      children:
                                                        e.phone ||
                                                        "電話番号未登録",`,
  `                                                      children: e.appUsers[0]?.email
                                                        ? e.appUsers[0].email + (e.phone ? " / " + e.phone : "")
                                                        : \`\${e.phone || "電話番号未登録"} / メール未登録\`,`,
  1,
  'recipient contact display',
)

const transformAnchor = "  const hotpepperMenuRouteV612 = pathname === '/admin/products' /* hotpepper-menu-import-v612-asset-route */"
replaceExact(
  'server.js',
  transformAnchor,
  `${transformAnchor}\n  const couponEmailDeliveryRouteV613 = pathname === '/admin/customers/messages' /* ${marker}-asset-route */`,
  1,
  'coupon email asset route',
)

const assetAnchor = "  if (hotpepperMenuRouteV612 && !output.includes('orimia-hotpepper-menu-import-v612')) {"
replaceExact(
  'server.js',
  assetAnchor,
  `  if (couponEmailDeliveryRouteV613 && !output.includes('orimia-coupon-email-delivery-v613')) {
    output = output.replace('</head>', '<link id="orimia-coupon-email-delivery-v613-style" rel="stylesheet" href="/coupon-email-delivery-v613.css?v=613-release1"><script id="orimia-coupon-email-delivery-v613" src="/coupon-email-delivery-v613.js?v=613-release1" defer></script></head>')
  }
${assetAnchor}`,
  1,
  'coupon email assets',
)

const readinessAnchor = "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Hotpepper-Menu-Import', 'v612') /* hotpepper-menu-import-v612-ready */"
replaceExact(
  'server.js',
  readinessAnchor,
  `${readinessAnchor}\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Coupon-Email-Delivery', 'v613') /* ${marker}-ready */`,
  1,
  'coupon email readiness header',
)

fs.writeFileSync('/tmp/coupon-email-delivery-v613-changes.json', JSON.stringify(changes))
console.log(JSON.stringify({
  release: marker,
  actionChunk: actionFile,
  modified: [...new Set(changes.filter(change => change.kind === 'replace').map(change => change.file))],
  added: changes.filter(change => change.kind === 'add').map(change => change.file),
}))
