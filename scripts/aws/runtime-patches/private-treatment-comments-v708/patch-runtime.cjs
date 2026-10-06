'use strict'
const fs = require('node:fs'), path = require('node:path')
const root = process.env.LIEN_RUNTIME_ROOT || '/app'
function exact(source, before, after, count = 1) {
  const found = source.split(before).length - 1
  if (found !== count) throw Error(`Expected ${count}, found ${found}: ${before.slice(0,100)}`)
  return source.split(before).join(after)
}
function edit(file, transform) {
  const target = path.join(root,file)
  fs.writeFileSync(target,transform(fs.readFileSync(target,'utf8')))
}
edit('commercial-admin-v101.js', source => {
  source = exact(source, 'const section = historySection()', 'const section = historySection(customerId)')
  source = exact(source, `    const queues = new Map()
    for (const item of completed) queues.set(item.displayDate, [...(queues.get(item.displayDate) || []), item])`, `    const byId = new Map(completed.map(item => [item.id, item]))`)
  source = exact(source, `      const queue = queues.get(cardDate(card)) || []
      const item = queue.shift()
      queues.set(cardDate(card), queue)`, `      const item = byId.get(card.dataset.historyRecordId)`)
  source = exact(source, '<strong>施術メモ</strong><small>施術内容・使用薬剤・次回への申し送り</small>', '<strong>スタッフコメント</strong><small>顧客非公開・店舗スタッフ専用</small>')
  source = exact(source, '<span class="sr-only">施術メモ</span>', '<span class="sr-only">スタッフコメント（顧客非公開）</span>')
  source = exact(source, '>店舗内のみ</span>', '>顧客非公開</span>')
  source = exact(source, '.lien-treatment-memo-private{display:none}', '.lien-treatment-memo-private{display:inline-flex}')
  // Keep drafts attached to their original subject if a response arrives after navigation.
  source = exact(source, `      if (button.disabled) return
      button.disabled = true`, `      if (button.disabled || route()?.customerId !== customerId) return
      button.disabled = true`)
  source += '\n/* private-treatment-comments-v708 */\n'
  return source
})
edit('.next/server/chunks/3244.js', source => exact(source,
  `"article",
                                  {
                                    className:
                                      "rounded-xl border border-[color:var(--lien-border)] bg-[color:var(--lien-surface-soft)] p-4",`,
  `"article",
                                  {
                                    "data-history-record-id": e.id,
                                    className:
                                      "rounded-xl border border-[color:var(--lien-border)] bg-[color:var(--lien-surface-soft)] p-4",`))
edit('customer-appointment-history-v565.js', source => {
  source = exact(source, 'subjectKey: item.subjectKeys[0],', 'subjectKey: memoRow?.subjectKey || item.subjectKeys[0],')
  source = exact(source, 'const table = tableByType[type]', 'const table = Object.hasOwn(tableByType, type) ? tableByType[type] : null')
  source = exact(source, `      await ensureSchema()
      const session = await requireStaff(req, res)
      if (!session) return true`, `      const session = await requireStaff(req, res)
      if (!session) return true
      await ensureSchema()`)
  source = exact(source, `    const subjectKey = cleanText(input.subjectKey, 240)
    const rawBody = String(input.body == null ? '' : input.body)`, `    if (!input || typeof input.subjectKey !== 'string' || input.subjectKey.length > 240 || typeof input.body !== 'string') return json(res, 400, { ok:false, error:'コメントの入力内容を確認してください。' })
    const subjectKey = input.subjectKey.trim()
    const rawBody = input.body`)
  return source
})
// Serve the existing shared client at a new cache key, including client navigation loaders.
function walk(dir) {
  for (const entry of fs.readdirSync(dir,{withFileTypes:true})) {
    const target=path.join(dir,entry.name)
    if (entry.isDirectory()) walk(target)
    else if (/\.(js|html)$/.test(entry.name)) {
      const source=fs.readFileSync(target,'utf8')
      const next=source.replaceAll('/commercial-admin-v136.js?v=20260901-517-release1','/commercial-admin-v136.js?v=708-private-treatment-comments')
      if (next!==source) fs.writeFileSync(target,next)
    }
  }
}
for (const entry of fs.readdirSync(root)) if (entry.endsWith('.js')) edit(entry, source=>source.replaceAll('/commercial-admin-v136.js?v=20260901-517-release1','/commercial-admin-v136.js?v=708-private-treatment-comments'))
walk(path.join(root,'.next'))
edit('server.js', source=>exact(source,
  "if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Kana-Search', 'v707')",
  "if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Kana-Search', 'v707')\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Private-Treatment-Comments', 'v708')"))
console.log('v708 restored private treatment comments using existing CustomerHistoryMemo storage and staff-only API')
