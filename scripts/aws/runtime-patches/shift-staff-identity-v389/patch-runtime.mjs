import fs from 'node:fs'

const servicePath = '/app/appointment-operations-v267.js'
const shiftChunkPath = '/app/.next/static/chunks/app/admin/appointments/page-shift-layout-20260812-02.capacity-persist-v44.business-schedule-v294.shift-day-nav-v382.js'

function replaceOnce(source, before, after, label) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`)
  return source.replace(before, after)
}

let service = fs.readFileSync(servicePath, 'utf8')

service = replaceOnce(
  service,
  `function normalizeStaff(value) {
  return String(value || '').normalize('NFKC').replace(/[\\s　]+/g, '').toLowerCase()
}`,
  `function normalizeStaff(value) {
  return String(value || '').normalize('NFKC').replace(/[\\s　]+/g, '').replace(/[邊辺]/g, '邉').toLowerCase()
}`,
  'staff name variant normalization',
)

service = replaceOnce(
  service,
  `  async function resolveStaff(db, organizationId, requestedName) {
    const requested = cleanText(requestedName, 80, true)`,
  `  async function resolveStaff(db, organizationId, requestedName, requestedStaffKey = null) {
    const requested = cleanText(requestedName, 80, true)
    const requestedKey = cleanText(requestedStaffKey, 120)`,
  'resolve staff accepts stable key',
)

service = replaceOnce(
  service,
  `    if (normalizeStaff(requested) === normalizeStaff('フリー')) {`,
  `    if (normalizeStaff(requestedKey) === 'free' || normalizeStaff(requested) === normalizeStaff('フリー')) {`,
  'free staff key handling',
)

service = replaceOnce(
  service,
  `    const token = normalizeStaff(requested)
    const row = settings.find(item => normalizeStaff(item.staffName) === token || normalizeStaff(item.staffKey) === token)`,
  `    const keyToken = normalizeStaff(requestedKey)
    const token = normalizeStaff(requested)
    const row = settings.find(item => keyToken && normalizeStaff(item.staffKey) === keyToken)
      || settings.find(item => normalizeStaff(item.staffName) === token || normalizeStaff(item.staffKey) === token)`,
  'stable key first staff resolution',
)

service = replaceOnce(
  service,
  `      if (expectedUpdatedAt && current.updatedAt.getTime() !== expectedUpdatedAt.getTime()) throw new RequestError('別の端末で予約が更新されました。画面を再読み込みしてください。', 409)
      const staff = await resolveStaff(tx, session.organizationId, body.staffName)`,
  `      if (expectedUpdatedAt && current.updatedAt.getTime() !== expectedUpdatedAt.getTime()) throw new RequestError('別の端末で予約が更新されました。画面を再読み込みしてください。', 409)
      const staff = await resolveStaff(tx, session.organizationId, body.staffName, body.staffKey)`,
  'schedule staff key resolution',
)

service = replaceOnce(
  service,
  `      const customer = await resolveManualCustomer(tx, session.organizationId, body)
      const staff = await resolveStaff(tx, session.organizationId, body.staffName)`,
  `      const customer = await resolveManualCustomer(tx, session.organizationId, body)
      const staff = await resolveStaff(tx, session.organizationId, body.staffName, body.staffKey)`,
  'manual booking staff key resolution',
)

fs.writeFileSync(servicePath, service)

let shiftChunk = fs.readFileSync(shiftChunkPath, 'utf8')

shiftChunk = replaceOnce(
  shiftChunk,
  `                    durationMinutes: e.durationMinutes,
                    staffName: e.staffName,
                    updatedAt: e.updatedAt,`,
  `                    durationMinutes: e.durationMinutes,
                    staffName: e.staffName,
                    staffKey: (m.find((member) => member.name === e.staffName) || {}).key || e.staffKey || "",
                    updatedAt: e.updatedAt,`,
  'schedule request sends stable staff key',
)

shiftChunk = replaceOnce(
  shiftChunk,
  `            c = (null == r ? void 0 : r.element.dataset.staffName) || n.originStaffName,
            u = {`,
  `            c = (null == r ? void 0 : r.element.dataset.staffName) || n.originStaffName,
            d = (null == r ? void 0 : r.element.dataset.staffKey) || "",
            u = {`,
  'drag target captures staff key',
)

shiftChunk = replaceOnce(
  shiftChunk,
  `              staffName: c,
            };
          return { appointment: u, staffName: c, startMinutes: s };`,
  `              staffName: c,
              staffKey: d,
            };
          return { appointment: u, staffName: c, staffKey: d, startMinutes: s };`,
  'drag preview carries staff key',
)

shiftChunk = replaceOnce(
  shiftChunk,
  `            (X(e.id, r.appointment),`,
  `            (X(e.id, { ...r.appointment, staffName: e.staffName, staffKey: e.staffKey }),`,
  'preserve selected lane after response',
)

shiftChunk = replaceOnce(
  shiftChunk,
  `        let H = (0, l.useMemo)(() => {
            let e = new Map();
            for (let t of m) e.set(t.name, []);
            for (let n of k) {
              var t;
              let r = e.has(n.staffName) ? n.staffName : "フリー";
              e.set(r, [
                ...(null !== (t = e.get(r)) && void 0 !== t ? t : []),
                n,
              ]);
            }
            return e;
          }, [k, m]),`,
  `        let H = (0, l.useMemo)(() => {
            const canonicalStaffName = (value) => String(value || "").normalize("NFKC").replace(/\\s/g, "").replace(/[邊辺]/g, "邉").toLowerCase();
            const laneNameByToken = new Map(m.map((member) => [canonicalStaffName(member.name), member.name]));
            let e = new Map();
            for (let member of m) e.set(member.name, []);
            for (let appointment of k) {
              const laneName = laneNameByToken.get(canonicalStaffName(appointment.staffName)) || "フリー";
              e.set(laneName, [...(e.get(laneName) || []), appointment]);
            }
            return e;
          }, [k, m]),`,
  'appointment lane name variant mapping',
)

fs.writeFileSync(shiftChunkPath, shiftChunk)
