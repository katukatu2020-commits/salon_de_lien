import fs from "node:fs";

const expectations = [
  [
    "/app/.next/server/app/admin/customers/messages/page.js",
    [
      "data-automated-coupon-form",
      "対象スタイリスト",
      "担当者を選択",
      "V.map((e) =>",
      "/automated-coupon-fields-v330.js",
      "担当: ${e.stylistName}",
    ],
  ],
  [
    "/app/.next/server/chunks/9845.js",
    [
      "対象スタイリストを選択してください。",
      "選択した担当スタイリストを確認してください。",
      'AND "staffName"=$2',
      "else l = null",
    ],
  ],
  [
    "/app/.next/server/app/api/integrations/gmail/reservations/sync/route.js",
    [
      "n.stylistName?.trim()",
      "String(n.stylistName).replace",
      'slice(-1) === n.phoneLastDigit',
    ],
  ],
  [
    "/app/public/automated-coupon-fields-v330.js",
    ["conditionalFieldsBound", "data-automated-coupon-field", "MutationObserver"],
  ],
];

for (const [file, snippets] of expectations) {
  const source = fs.readFileSync(file, "utf8");
  for (const snippet of snippets) {
    if (!source.includes(snippet)) throw new Error(`${file} is missing ${snippet}`);
  }
}

console.log("stylist-auto-coupon-v330 runtime verification passed");
