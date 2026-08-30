import fs from 'node:fs'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const pagePath = `${root}/.next/server/app/admin/customers/messages/page.js`
const marker = 'broadcast-history-collapse-v485'

const disclosureCss = [
  '[data-lien-broadcast-history="v485"] > summary { list-style: none; }',
  '[data-lien-broadcast-history="v485"] > summary::-webkit-details-marker { display: none; }',
  '[data-lien-broadcast-history="v485"][open] > summary { border-bottom: 1px solid var(--lien-border); }',
  '[data-lien-broadcast-history="v485"] [data-lien-history-close-label] { display: none; }',
  '[data-lien-broadcast-history="v485"][open] [data-lien-history-open-label] { display: none; }',
  '[data-lien-broadcast-history="v485"][open] [data-lien-history-close-label] { display: inline; }',
  '[data-lien-broadcast-history="v485"] [data-lien-history-chevron] { transition: transform 160ms ease; }',
  '[data-lien-broadcast-history="v485"][open] [data-lien-history-chevron] { transform: rotate(180deg); }',
].join(' ')

const oldIconAnchor = `        var c = t(97867);`
const newIconAnchor = `        let HISTORY_CHEVRON = (0, l.Z)("chevron-down", [["path", { d: "m6 9 6 6 6-6", key: "1" }]]);\n        var c = t(97867);`

const oldCardStart = `(0, r.jsxs)(p.IP, {
                className: "p-0 sm:p-0",
                children: [
                  (0, r.jsxs)("div", {
                    className:
                      "flex items-center justify-between border-b border-lien p-5 sm:p-6",
                    children: [`
const newCardStart = `(0, r.jsxs)(p.IP, {
                className: "p-0 sm:p-0",
                children: [
                  r.jsx("style", { children: ${JSON.stringify(disclosureCss)} }),
                  (0, r.jsxs)("details", {
                    className: "group",
                    "data-lien-broadcast-history": "v485",
                    children: [
                  (0, r.jsxs)("summary", {
                    className:
                      "flex cursor-pointer list-none items-center justify-between gap-4 p-5 outline-none transition hover:bg-lien-soft focus-visible:ring-2 focus-visible:ring-[color:var(--lien-primary)] focus-visible:ring-inset sm:p-6",
                    children: [`

const oldHeaderEnd = `                      r.jsx(m.Z, { className: "h-5 w-5 text-lien-primary" }),
                    ],
                  }),
                  b.length > 0`
const newHeaderEnd = `                      (0, r.jsxs)("span", {
                        className: "inline-flex min-h-10 shrink-0 items-center gap-2 rounded-[12px] border border-lien bg-white px-3 text-sm font-semibold text-lien-primary",
                        children: [
                          (0, r.jsxs)("span", { "data-lien-history-open-label": "1", children: ["履歴を表示（", b.length, "件）"] }),
                          r.jsx("span", { "data-lien-history-close-label": "1", children: "履歴を閉じる" }),
                          r.jsx(HISTORY_CHEVRON, { className: "h-4 w-4 shrink-0", "data-lien-history-chevron": "1", "aria-hidden": true }),
                        ],
                      }),
                    ],
                  }),
                  r.jsx("div", {
                    id: "broadcast-history-content-v485",
                    "data-lien-broadcast-history-content": "1",
                    children:
                  b.length > 0`

const oldCardEnd = `                    : r.jsx("p", {
                        className: "p-8 text-center text-sm text-lien-muted",
                        children: "配信履歴はまだありません。",
                      }),
                ],
              }),`
const newCardEnd = `                    : r.jsx("p", {
                        className: "p-8 text-center text-sm text-lien-muted",
                        children: "配信履歴はまだありません。",
                      }),
                  }),
                ],
              }),
                ],
              }),`

let source = fs.readFileSync(pagePath, 'utf8')
if (source.includes(marker)) throw new Error(`${marker}: runtime patch already applied`)

for (const [before, after, label] of [
  [oldIconAnchor, newIconAnchor, 'chevron icon anchor'],
  [oldCardStart, newCardStart, 'history card start'],
  [oldHeaderEnd, newHeaderEnd, 'history disclosure header'],
  [oldCardEnd, newCardEnd, 'history card end'],
]) {
  const matches = source.split(before).length - 1
  if (matches !== 1) throw new Error(`${marker}: expected one ${label}, found ${matches}`)
  source = source.replace(before, after)
}

fs.writeFileSync(pagePath, source)
console.log(`${marker} runtime patched`)
