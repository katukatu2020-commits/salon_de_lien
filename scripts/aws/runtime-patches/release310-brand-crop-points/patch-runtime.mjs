import fs from "node:fs";
import path from "node:path";

const root = process.env.RUNTIME_ROOT || "/app";
const commercialAdminPath = path.join(root, "commercial-admin-v101.js");
const staffExperiencePath = path.join(root, "admin-staff-experience-v276.js");
const reservationParserPath = path.join(root, ".next/server/chunks/3447.js");
const appointmentDetailPath = path.join(root, ".next/server/app/admin/appointments/[appointmentId]/page.js");

function replaceExpected(source, before, after, expectedCount, label) {
  const count = source.split(before).length - 1;
  if (count !== expectedCount) {
    throw new Error(`${label}: expected ${expectedCount} occurrence(s), found ${count}`);
  }
  return source.split(before).join(after);
}

let commercialAdmin = fs.readFileSync(commercialAdminPath, "utf8");
let staffExperience = fs.readFileSync(staffExperiencePath, "utf8");
let reservationParser = fs.readFileSync(reservationParserPath, "utf8");
let appointmentDetail = fs.readFileSync(appointmentDetailPath, "utf8");

commercialAdmin = replaceExpected(
  commercialAdmin,
  'background-image:url("/api/lien-store-icon")!important',
  'background-image:url("/brand/salon-customer-service-mark.svg")!important',
  1,
  "tenant-independent service logo",
);

commercialAdmin = replaceExpected(
  commercialAdmin,
  "        const overlay = document.createElement('div')",
  "        const overlayDocument = window.parent !== window ? window.parent.document : document\n        const overlay = overlayDocument.createElement('div')",
  1,
  "crop overlay owner document",
);
commercialAdmin = replaceExpected(
  commercialAdmin,
  "        document.body.appendChild(overlay)",
  "        overlayDocument.body.appendChild(overlay)",
  1,
  "crop overlay parent mount",
);
commercialAdmin = replaceExpected(
  commercialAdmin,
  "        const cleanup = () => { URL.revokeObjectURL(objectUrl); overlay.remove(); document.removeEventListener('keydown', onKey) }",
  "        const cleanup = () => { URL.revokeObjectURL(objectUrl); overlay.remove(); overlayDocument.removeEventListener('keydown', onKey) }",
  1,
  "crop overlay cleanup",
);
commercialAdmin = replaceExpected(
  commercialAdmin,
  "        document.addEventListener('keydown', onKey)",
  "        overlayDocument.addEventListener('keydown', onKey)",
  1,
  "crop overlay keyboard owner",
);

staffExperience = replaceExpected(
  staffExperience,
  "      close: '<path d=\"m6 6 12 12M18 6 6 18\"/>',",
  "      close: '<path d=\"m6 6 12 12M18 6 6 18\"/>',\n      chevronRight: '<path d=\"m9 18 6-6-6-6\"/>',",
  1,
  "staff menu chevron icon",
);
staffExperience = replaceExpected(
  staffExperience,
  '<span class="arrow">›</span>',
  '<span class="arrow">${icon(\'chevronRight\')}</span>',
  1,
  "staff menu chevron markup",
);
staffExperience = replaceExpected(
  staffExperience,
  "    .sm-history-pager{display:flex;",
  "    .ca-store-menu-links a[data-sm-staff-link] .arrow{display:grid!important;width:26px!important;height:26px!important;flex:0 0 26px!important;place-items:center;border-radius:50%;background:#fff1ec;color:#a55747}.ca-store-menu-links a[data-sm-staff-link] .arrow svg{width:18px!important;height:18px!important}\n    .sm-history-pager{display:flex;",
  1,
  "staff menu chevron styles",
);

reservationParser = replaceExpected(
  reservationParser,
  '        reference: ["予約番号", "予約ID", "受付番号", "予約No", "予約NO"],',
  '        usedPoints: ["今回の利用ポイント", "予約時利用ポイント", "ご利用ポイント", "利用ポイント", "ポイント利用"],\n        reference: ["予約番号", "予約ID", "受付番号", "予約No", "予約NO"],',
  1,
  "external point labels",
);

const parserHelpers = `      function extractReservationPoints(e) {
        let t = s(e ?? "", u.usedPoints);
        if (!t) return null;
        if (/利用なし|未利用|なし/.test(t)) return 0;
        let a = t.match(/([\\d,]+)\\s*(?:ポイント|point|pt|p)?/i);
        if (!a) return null;
        let n = Number(a[1].replace(/,/g, ""));
        return Number.isSafeInteger(n) && n >= 0 ? n : null;
      }
      function extractReservationPaymentDue(e) {
        let t = (e ?? "").match(/(?:お支払い予定金額|支払い予定金額|今回のお支払い金額)\\s*[:：]?\\s*(?:\\n\\s*)?(?:[¥￥]\\s*)?([\\d,]+)\\s*円?/i);
        if (!t) return null;
        let a = Number(t[1].replace(/,/g, ""));
        return Number.isSafeInteger(a) && a >= 0 ? a : null;
      }
      function storedReservationAmount(e, t) {
        let a = (e ?? "").match(RegExp("(?:^|\\\\n)" + t + ":\\\\s*([\\\\d,]+)", "i"));
        if (!a) return null;
        let n = Number(a[1].replace(/,/g, ""));
        return Number.isSafeInteger(n) && n >= 0 ? n : null;
      }
`;
reservationParser = replaceExpected(
  reservationParser,
  "      function normalizeReservationMenu(e) {",
  `${parserHelpers}      function normalizeReservationMenu(e) {`,
  1,
  "external point parser helpers",
);
reservationParser = replaceExpected(
  reservationParser,
  "                  estimatedPrice: extractReservationPrice(t),",
  "                  estimatedPrice: extractReservationPrice(t),\n                  usedPoints: extractReservationPoints(t),\n                  paymentDue: extractReservationPaymentDue(t),",
  1,
  "parsed external point values",
);
reservationParser = replaceExpected(
  reservationParser,
  "          x = [",
  `          y = await l._.appointment.findUnique({
            where: { id: k },
            select: { id: !0, estimatedPrice: !0, staffName: !0, note: !0 },
          }),
          externalUsedPoints = n.value.usedPoints ?? storedReservationAmount(y?.note, "利用ポイント"),
          externalPaymentDue = n.value.paymentDue ?? storedReservationAmount(y?.note, "支払予定額"),
          x = [`,
  1,
  "preserve imported point values",
);
reservationParser = replaceExpected(
  reservationParser,
  "            n.value.subject ? `メール件名: ${n.value.subject}` : null,",
  "            n.value.subject ? `メール件名: ${n.value.subject}` : null,\n            externalUsedPoints !== null ? `利用ポイント: ${externalUsedPoints}pt` : null,\n            externalPaymentDue !== null ? `支払予定額: ${externalPaymentDue}円` : null,",
  1,
  "reservation note point values",
);
reservationParser = replaceExpected(
  reservationParser,
  `          y = await l._.appointment.findUnique({
            where: { id: k },
            select: { id: !0, estimatedPrice: !0, staffName: !0 },
          }),
          I = await l._.appointment.upsert({`,
  "          I = await l._.appointment.upsert({",
  1,
  "deduplicate existing appointment lookup",
);
reservationParser = replaceExpected(
  reservationParser,
  "                n.value.bookingReference\n                  ? `予約番号: ${n.value.bookingReference}`\n                  : null,",
  "                n.value.bookingReference\n                  ? `予約番号: ${n.value.bookingReference}`\n                  : null,\n                externalUsedPoints !== null ? `利用ポイント: ${externalUsedPoints}pt` : null,\n                externalPaymentDue !== null ? `支払予定額: ${externalPaymentDue}円` : null,",
  2,
  "contact log point values",
);

appointmentDetail = replaceExpected(
  appointmentDetail,
  "mt-5 rounded-2xl bg-[color:var(--lien-surface-soft)] p-4 text-xs leading-6 text-[color:var(--lien-muted)]",
  "mt-5 whitespace-pre-line rounded-2xl bg-[color:var(--lien-surface-soft)] p-4 text-xs leading-6 text-[color:var(--lien-muted)]",
  1,
  "appointment note line breaks",
);

fs.writeFileSync(commercialAdminPath, commercialAdmin, "utf8");
fs.writeFileSync(staffExperiencePath, staffExperience, "utf8");
fs.writeFileSync(reservationParserPath, reservationParser, "utf8");
fs.writeFileSync(appointmentDetailPath, appointmentDetail, "utf8");

console.log(JSON.stringify({ patched: true, commercialAdminPath, staffExperiencePath, reservationParserPath, appointmentDetailPath }));
