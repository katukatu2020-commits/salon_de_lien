import fs from "node:fs";
import path from "node:path";

const root = process.env.RUNTIME_ROOT || "/app";

function replaceOnce(source, before, after, label) {
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`${label}: patch anchor was not found`);
  if (source.indexOf(before, first + before.length) >= 0) {
    throw new Error(`${label}: patch anchor is not unique`);
  }
  return source.slice(0, first) + after + source.slice(first + before.length);
}

function replaceFirst(source, before, after, label) {
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`${label}: patch anchor was not found`);
  return source.slice(0, first) + after + source.slice(first + before.length);
}

const runtimeStaffParser = `const RESERVATION_STAFF_LABELS = [
  '予約時担当スタイリスト名', '予約時担当スタイリスト', '予約時担当スタッフ名', '予約時担当スタッフ',
  '予約時スタイリスト名', '予約時スタイリスト', '予約時指名スタッフ', '予約時指名',
  'ご指名担当者名', 'ご指名担当者', '指名担当者名', '指名担当者',
  '担当スタイリスト名', '担当スタイリスト', '担当スタッフ名', '担当スタッフ',
  '指名スタイリスト', '指名スタッフ', '施術担当者', '施術担当',
  'スタイリスト名', 'スタイリスト', '予約担当者', '担当者名', '担当者', 'ご指名', 'スタッフ', '担当', '指名',
]

const RESERVATION_STAFF_ALIASES = [
  { name: '谷崎 太二', aliases: ['谷崎太二', '谷崎', '谷崎店長', '店長谷崎'] },
  { name: '渡邊 浩明', aliases: ['渡邊浩明', '渡辺浩明', '渡邊', '渡辺'] },
  { name: '浅野 清美', aliases: ['浅野清美', '浅野'] },
  { name: '小林 美奈子', aliases: ['小林美奈子', '小林'] },
  { name: 'kaori', aliases: ['kaori', 'カオリ'] },
]

function compactReservationStaff(value) {
  return String(value || '').normalize('NFKC').replace(/[\\s　・:：()（）]/g, '').toLowerCase()
}

function cleanReservationStaff(value) {
  return String(value || '')
    .normalize('NFKC')
    .replace(/^指名あり\\s*[:：]?\\s*/, '')
    .replace(/\\s*(?:様|さん|氏)\\s*$/, '')
    .replace(/\\s*[（(](?:指名|担当|スタイリスト)[^）)]*[）)]\\s*$/, '')
    .replace(/\\s+/g, ' ')
    .trim()
}

function knownReservationStaff(value) {
  const compact = compactReservationStaff(value)
  return RESERVATION_STAFF_ALIASES.find(staff => staff.aliases.some(alias => compact.includes(compactReservationStaff(alias)))) || null
}

function parseReservationStaffName(text) {
  const values = RESERVATION_STAFF_LABELS
    .map(label => extractSection(text, [label]))
    .map(cleanReservationStaff)
    .filter(Boolean)
  const freePattern = /^(?:フリー|指名なし|指定なし|希望なし|おまかせ|お任せ|なし)(?:[（(].*[）)])?$/
  const genericPattern = /^(?:-|ー|未定|あり|指名あり|希望あり)$/

  for (const value of values) {
    const known = knownReservationStaff(value)
    if (known) return known.name
  }
  for (const line of normalizeLines(text).filter(line => /担当|指名|スタイリスト|スタッフ/.test(line))) {
    const known = knownReservationStaff(line)
    if (known) return known.name
  }
  for (const value of values) {
    const compact = compactReservationStaff(value)
    if (!freePattern.test(compact) && !genericPattern.test(compact)) return value
  }
  return values.some(value => freePattern.test(compactReservationStaff(value))) ? 'フリー' : null
}

`;

const tenantPath = path.join(root, "tenant-setup.js");
let tenant = fs.readFileSync(tenantPath, "utf8");
tenant = replaceOnce(
  tenant,
  "function parseReservationMail({ subject = '', body = '', sender = '', messageId = '' }) {",
  runtimeStaffParser + "function parseReservationMail({ subject = '', body = '', sender = '', messageId = '' }) {",
  "tenant staff parser insertion"
);
tenant = replaceOnce(
  tenant,
  "  const staffName = extractSection(text, ['担当スタッフ', 'スタイリスト', '指名スタイリスト', '担当者'])",
  "  const staffName = parseReservationStaffName(text)",
  "tenant staff extraction"
);
tenant = replaceOnce(
  tenant,
  "    const note = [parsed.bookingReference ? `予約番号: ${parsed.bookingReference}` : null, parsed.staffName ? `担当: ${parsed.staffName}` : null, parsed.durationMinutes ? `所要時間: ${parsed.durationMinutes}分` : null, parsed.subject ? `メール件名: ${parsed.subject}` : null, `予約元: ${parsed.provider}`, 'Gmail予約メールから抽出。元メール本文は保存していません。'].filter(Boolean).join('\\n')\n    const existing = await prisma.appointment.findUnique({ where: { id: appointmentId }, select: { id: true, estimatedPrice: true } })\n    const estimatedPrice = parsed.status === 'キャンセル' && existing?.estimatedPrice != null ? existing.estimatedPrice : (parsed.estimatedPrice ?? existing?.estimatedPrice ?? null)",
  "    const existing = await prisma.appointment.findUnique({ where: { id: appointmentId }, select: { id: true, estimatedPrice: true, staffName: true } })\n    const estimatedPrice = parsed.status === 'キャンセル' && existing?.estimatedPrice != null ? existing.estimatedPrice : (parsed.estimatedPrice ?? existing?.estimatedPrice ?? null)\n    const mergedStaffName = parsed.staffName ?? existing?.staffName ?? null\n    const note = [parsed.bookingReference ? `予約番号: ${parsed.bookingReference}` : null, mergedStaffName ? `担当: ${mergedStaffName}` : null, parsed.durationMinutes ? `所要時間: ${parsed.durationMinutes}分` : null, parsed.subject ? `メール件名: ${parsed.subject}` : null, `予約元: ${parsed.provider}`, 'Gmail予約メールから抽出。元メール本文は保存していません。'].filter(Boolean).join('\\n')",
  "tenant appointment merge"
);
tenant = replaceFirst(
  tenant,
  "durationMinutes: parsed.durationMinutes, menu: parsed.menu, staffName: parsed.staffName, estimatedPrice",
  "durationMinutes: parsed.durationMinutes, menu: parsed.menu, staffName: mergedStaffName, estimatedPrice",
  "tenant preserve existing staff"
);
tenant = replaceOnce(
  tenant,
  `"status" IN ('imported','ignored')`,
  `"status" IN ('imported:staff-parser-v3','ignored:staff-parser-v3')`,
  "tenant parser-version lookup"
);
tenant = replaceOnce(
  tenant,
  `VALUES ($1,$2,$3,'ignored',$4,CURRENT_TIMESTAMP) ON CONFLICT ("organizationId","gmailMessageId") DO UPDATE SET "status"='ignored'`,
  `VALUES ($1,$2,$3,'ignored:staff-parser-v3',$4,CURRENT_TIMESTAMP) ON CONFLICT ("organizationId","gmailMessageId") DO UPDATE SET "status"='ignored:staff-parser-v3'`,
  "tenant ignored parser version"
);
tenant = replaceOnce(
  tenant,
  `VALUES ($1,$2,$3,'imported',$4,CURRENT_TIMESTAMP) ON CONFLICT ("organizationId","gmailMessageId") DO UPDATE SET "status"='imported'`,
  `VALUES ($1,$2,$3,'imported:staff-parser-v3',$4,CURRENT_TIMESTAMP) ON CONFLICT ("organizationId","gmailMessageId") DO UPDATE SET "status"='imported:staff-parser-v3'`,
  "tenant imported parser version"
);
fs.writeFileSync(tenantPath, tenant, "utf8");

const inboundPath = path.join(root, "inbound-email.js");
let inbound = fs.readFileSync(inboundPath, "utf8");
inbound = replaceOnce(
  inbound,
  "    const existing = byReference || await prisma.appointment.findUnique({ where: { id: appointmentId }, select: { id: true, estimatedPrice: true } })",
  "    const existing = byReference || await prisma.appointment.findUnique({ where: { id: appointmentId }, select: { id: true, estimatedPrice: true, staffName: true } })",
  "inbound existing appointment staff"
);
inbound = replaceOnce(
  inbound,
  "    const note = [\n      parsed.bookingReference ? `予約番号: ${parsed.bookingReference}` : null,\n      parsed.staffName ? `担当: ${parsed.staffName}` : null,",
  "    const mergedStaffName = parsed.staffName ?? existing?.staffName ?? null\n    const note = [\n      parsed.bookingReference ? `予約番号: ${parsed.bookingReference}` : null,\n      mergedStaffName ? `担当: ${mergedStaffName}` : null,",
  "inbound merged staff note"
);
inbound = replaceFirst(
  inbound,
  "durationMinutes: parsed.durationMinutes, menu: parsed.menu, staffName: parsed.staffName, estimatedPrice",
  "durationMinutes: parsed.durationMinutes, menu: parsed.menu, staffName: mergedStaffName, estimatedPrice",
  "inbound preserve existing staff"
);
fs.writeFileSync(inboundPath, inbound, "utf8");

const chunkPath = path.join(root, ".next/server/chunks/3447.js");
let chunk = fs.readFileSync(chunkPath, "utf8");
chunk = replaceOnce(
  chunk,
  `        staff: [\n          "担当スタイリスト",`,
  `        staff: [\n          "予約時担当スタイリスト名",\n          "予約時担当スタイリスト",\n          "予約時担当スタッフ名",\n          "予約時担当スタッフ",\n          "予約時スタイリスト名",\n          "予約時スタイリスト",\n          "予約時指名スタッフ",\n          "予約時指名",\n          "ご指名担当者名",\n          "ご指名担当者",\n          "指名担当者名",\n          "指名担当者",\n          "担当スタイリスト名",\n          "担当スタイリスト",`,
  "legacy compiled staff labels"
);
chunk = replaceOnce(
  chunk,
  `\n      function extractReservationSection(e, t) {`,
  `
      function parseReservationStaffName(e) {
        let t = r(e, u.staff)
            .map((e) => c(e.value)?.replace(/^指名あり\\s*[:：]?\\s*/, "").replace(/\\s*(?:様|さん|氏)\\s*$/, "").trim())
            .filter(Boolean),
          a = [
            ["谷崎 太二", ["谷崎太二", "谷崎", "谷崎店長", "店長谷崎"]],
            ["渡邊 浩明", ["渡邊浩明", "渡辺浩明", "渡邊", "渡辺"]],
            ["浅野 清美", ["浅野清美", "浅野"]],
            ["小林 美奈子", ["小林美奈子", "小林"]],
            ["kaori", ["kaori", "カオリ"]],
          ],
          n = (e) => String(e || "").normalize("NFKC").replace(/[\\s　・:：()（）]/g, "").toLowerCase(),
          l = (e) => a.find((t) => t[1].some((a) => n(e).includes(n(a))))?.[0] ?? null;
        for (let e of t) { let t = l(e); if (t) return t; }
        for (let t of e.split("\\n").filter((e) => /担当|指名|スタイリスト|スタッフ/.test(e))) { let e = l(t); if (e) return e; }
        let i = /^(?:フリー|指名なし|指定なし|希望なし|おまかせ|お任せ|なし)$/,
          o = /^(?:-|ー|未定|あり|指名あり|希望あり)$/;
        for (let e of t) { let t = n(e); if (!i.test(t) && !o.test(t)) return e; }
        return t.some((e) => i.test(n(e))) ? "フリー" : null;
      }

      function extractReservationSection(e, t) {`,
  "legacy compiled staff parser"
);
chunk = replaceOnce(
  chunk,
  "staffName: c(s(t, u.staff)),",
  "staffName: parseReservationStaffName(t),",
  "legacy compiled staff extraction"
);
chunk = replaceOnce(
  chunk,
  "select: { id: !0, estimatedPrice: !0 },",
  "select: { id: !0, estimatedPrice: !0, staffName: !0 },",
  "legacy compiled existing staff select"
);
chunk = replaceFirst(
  chunk,
  "staffName: n.value.staffName,",
  "staffName: n.value.staffName ?? y?.staffName ?? null,",
  "legacy compiled preserve existing staff"
);
chunk = replaceOnce(chunk, "staff-parser-v2", "staff-parser-v3", "legacy import parser version");
fs.writeFileSync(chunkPath, chunk, "utf8");

const routePath = path.join(root, ".next/server/app/api/integrations/gmail/reservations/sync/route.js");
let route = fs.readFileSync(routePath, "utf8");
route = replaceOnce(route, "staff-parser-v2", "staff-parser-v3", "legacy sync parser version");
fs.writeFileSync(routePath, route, "utf8");

if (false) {
const appointmentsPagePath = path.join(root, ".next/server/app/admin/appointments/page.js");
let appointmentsPage = fs.readFileSync(appointmentsPagePath, "utf8");
appointmentsPage = replaceOnce(
  appointmentsPage,
  `              : _.map((e) => ({
                  key: e.staffKey,
                  name: e.staffName,
                  role: "繧ｹ繧ｿ繧､繝ｪ繧ｹ繝・,
                  maxConcurrentAppointments: e.maxConcurrentAppointments,
                  workStartMinutes: e.workStartMinutes,
                  workEndMinutes: e.workEndMinutes,
                }));`,
  `              : [
                  ..._.map((e) => ({
                    key: e.staffKey,
                    name: e.staffName,
                    role: "繧ｹ繧ｿ繧､繝ｪ繧ｹ繝・,
                    maxConcurrentAppointments: e.maxConcurrentAppointments,
                    workStartMinutes: e.workStartMinutes,
                    workEndMinutes: e.workEndMinutes,
                  })),
                  {
                    key: w.jb.key,
                    name: w.jb.name,
                    role: w.jb.role,
                    maxConcurrentAppointments: 1,
                    workStartMinutes: 600,
                    workEndMinutes: 1140,
                  },
                ];`,
  "showcase free staff row"
);
appointmentsPage = replaceOnce(
  appointmentsPage,
  `let t = (0, w.K7)(e.staffName ?? T(e.note, "諡・ｽ・)),
                            r = t && (0, w.Cp)(t) ? t : w.jb.name;`,
  `let t = (0, w.K7)(e.staffName ?? T(e.note, "諡・ｽ・)),
                            r = t && G.some((e) => e.name === t) ? t : w.jb.name;`,
  "tenant staff appointment assignment"
);
fs.writeFileSync(appointmentsPagePath, appointmentsPage, "utf8");
}

console.log(JSON.stringify({ patched: true, tenantPath, inboundPath, chunkPath, routePath }));
