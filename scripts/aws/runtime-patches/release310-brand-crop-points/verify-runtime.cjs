const fs = require("node:fs");
const path = require("node:path");

const root = process.env.RUNTIME_ROOT || "/app";
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const commercialAdmin = read("commercial-admin-v101.js");
const staffExperience = read("admin-staff-experience-v276.js");
const reservationParser = read(".next/server/chunks/3447.js");
const appointmentDetail = read(".next/server/app/admin/appointments/[appointmentId]/page.js");

const checks = [
  [commercialAdmin.includes('background-image:url("/brand/salon-customer-service-mark.svg")!important'), "service logo is fixed"],
  [!commercialAdmin.includes('background-image:url("/api/lien-store-icon")!important'), "tenant icon no longer overrides service logo"],
  [commercialAdmin.includes("const overlayDocument = window.parent !== window ? window.parent.document : document"), "crop overlay mounts in top document"],
  [commercialAdmin.includes("overlayDocument.body.appendChild(overlay)"), "crop overlay parent mount"],
  [staffExperience.includes("icon('chevronRight')"), "staff management uses vector chevron"],
  [staffExperience.includes("a[data-sm-staff-link] .arrow"), "staff management chevron has accessible size"],
  [reservationParser.includes("extractReservationPoints"), "reservation point parser"],
  [reservationParser.includes('usedPoints: extractReservationPoints(t)'), "reservation point value"],
  [reservationParser.includes("externalUsedPoints !== null ? `利用ポイント:"), "reservation point persistence"],
  [reservationParser.includes("externalPaymentDue !== null ? `支払予定額:"), "payment due persistence"],
  [appointmentDetail.includes("whitespace-pre-line rounded-2xl"), "appointment note line breaks"],
];

for (const [ok, label] of checks) {
  if (!ok) throw new Error(`runtime verification failed: ${label}`);
}

console.log(JSON.stringify({ verified: true, checks: checks.map(([, label]) => label) }));
