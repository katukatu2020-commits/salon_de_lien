import fs from 'node:fs'

const pagePath = '/app/.next/server/app/admin/appointments/page.js'

function replaceOnce(source, before, after, label) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`)
  return source.replace(before, after)
}

let page = fs.readFileSync(pagePath, 'utf8')

page = replaceOnce(
  page,
  `                          let t = (0, w.K7)(e.staffName ?? T(e.note, "担当")),
                            r = t && G.some((entry) => entry.name === t) ? t : w.jb.name;`,
  `                          let t = (0, w.K7)(e.staffName ?? T(e.note, "担当")),
                            canonicalStaffName = (value) => String(value || "").normalize("NFKC").replace(/\\s/g, "").replace(/[邊辺]/g, "邉").toLowerCase(),
                            matchedStaff = G.find((entry) => canonicalStaffName(entry.name) === canonicalStaffName(t)),
                            r = matchedStaff?.name ?? w.jb.name;`,
  'tenant staff lane name resolution',
)

page = replaceOnce(
  page,
  `                            staffName: r,
                            status: e.status,`,
  `                            staffKey: matchedStaff?.key ?? w.jb.key,
                            staffName: r,
                            status: e.status,`,
  'tenant staff lane stable key',
)

fs.writeFileSync(pagePath, page)

console.log('shift tenant staff lane v415 runtime patched')
