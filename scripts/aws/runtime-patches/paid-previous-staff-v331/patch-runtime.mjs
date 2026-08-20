import fs from "node:fs";

const customerChunkPath = "/app/.next/server/chunks/3491.js";
const evaluatorPath = "/app/.next/server/app/api/integrations/gmail/reservations/sync/route.js";

function replaceOnce(source, before, after, label) {
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`Missing patch target: ${label}`);
  if (source.indexOf(before, first + before.length) >= 0) {
    throw new Error(`Patch target is not unique: ${label}`);
  }
  return source.slice(0, first) + after + source.slice(first + before.length);
}

let customerChunk = fs.readFileSync(customerChunkPath, "utf8");

customerChunk = replaceOnce(
  customerChunk,
  'serviceSales:{orderBy:{paidAt:"desc"},select:{id:!0,customerId:!0,amount:!0,paidAt:!0,title:!0,source:!0,note:!0},take:20}',
  'serviceSales:{orderBy:{paidAt:"desc"},select:{id:!0,customerId:!0,amount:!0,paidAt:!0,title:!0,source:!0,note:!0,appointment:{select:{staffName:!0}}},take:20}',
  "customer sales appointment relation",
);

customerChunk = replaceOnce(
  customerChunk,
  'function o(e){let t=e.visits[0];if(t)return`前回担当: ${i(t.stylistName)??"フリー"}`;let a=[...(e.appointments??[])].filter(e=>{let t=(e.status??\'\').toLowerCase();return e.staffName&&new Date(e.scheduledAt??0).getTime()<=Date.now()&&!t.includes(\'cancel\')&&!t.includes(\'キャンセル\')}).sort((e,t)=>new Date(t.scheduledAt??0).getTime()-new Date(e.scheduledAt??0).getTime())[0];if(a)return `前回担当: ${i(a.staffName)??"フリー"}`;let s="assigned"===e.staffAssignmentType?i(e.assignedStaffName):null;return`前回担当: ${s??"フリー"}`}',
  'function o(e){let t=e.serviceSales?.[0],a=i(t?.appointment?.staffName);return`前回担当: ${a??"未登録"}`}',
  "paid previous staff label",
);

fs.writeFileSync(customerChunkPath, customerChunk);

let evaluator = fs.readFileSync(evaluatorPath, "utf8");

evaluator = replaceOnce(
  evaluator,
  `              let r = e.visits[0],
                a = e.serviceSales[0],
                o =
                  !r || (a && a.paidAt > r.visitedAt) ? a?.paidAt : r.visitedAt,
                s =
                  !r || (a && a.paidAt > r.visitedAt)
                    ? a?.appointment?.staffName
                    : r.stylistName,
                l = null;`,
  `              let r = e.visits[0],
                a = e.serviceSales[0],
                o =
                  !r || (a && a.paidAt > r.visitedAt) ? a?.paidAt : r.visitedAt,
                s = a?.appointment?.staffName ?? null,
                l = null;`,
  "paid stylist source",
);

evaluator = replaceOnce(
  evaluator,
  `                "stylist" === n.triggerType &&
                o &&
                s?.trim() &&
                n.stylistName?.trim() &&
                String(s).replace(/[\\s　]+/g, " ").trim() === String(n.stylistName).replace(/[\\s　]+/g, " ").trim() &&
                B(C(o, n.offsetDays)) === i
              )
                l = \`stylist:\${B(o)}:\${s}\`;`,
  `                "stylist" === n.triggerType &&
                a?.paidAt &&
                s?.trim() &&
                n.stylistName?.trim() &&
                String(s).replace(/[\\s　]+/g, " ").trim() === String(n.stylistName).replace(/[\\s　]+/g, " ").trim() &&
                B(C(a.paidAt, n.offsetDays)) === i
              )
                l = \`stylist:\${B(a.paidAt)}:\${s}\`;`,
  "stylist rule paid date",
);

fs.writeFileSync(evaluatorPath, evaluator);
