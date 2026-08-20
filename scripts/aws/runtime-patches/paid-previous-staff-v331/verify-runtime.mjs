import fs from "node:fs";

const expectations = [
  [
    "/app/.next/server/chunks/3491.js",
    [
      "appointment:{select:{staffName:!0}}",
      'function o(e){let t=e.serviceSales?.[0]',
      'a??"未登録"',
    ],
    ["let t=e.visits[0];if(t)return`前回担当", 's??"フリー"'],
  ],
  [
    "/app/.next/server/app/api/integrations/gmail/reservations/sync/route.js",
    [
      "s = a?.appointment?.staffName ?? null",
      "a?.paidAt &&",
      "B(C(a.paidAt, n.offsetDays)) === i",
      "stylist:${B(a.paidAt)}:${s}",
    ],
    [],
  ],
];

for (const [file, required, forbidden] of expectations) {
  const source = fs.readFileSync(file, "utf8");
  for (const snippet of required) {
    if (!source.includes(snippet)) throw new Error(`${file} is missing ${snippet}`);
  }
  for (const snippet of forbidden) {
    if (source.includes(snippet)) throw new Error(`${file} still contains ${snippet}`);
  }
}

console.log("paid-previous-staff-v331 runtime verification passed");
