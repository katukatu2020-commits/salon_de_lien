import fs from "node:fs";

const pagePath = "/app/.next/server/app/admin/customers/messages/page.js";
const actionsPath = "/app/.next/server/chunks/9845.js";
const evaluatorPath = "/app/.next/server/app/api/integrations/gmail/reservations/sync/route.js";

function replaceOnce(source, before, after, label) {
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`Missing patch target: ${label}`);
  if (source.indexOf(before, first + before.length) >= 0) {
    throw new Error(`Patch target is not unique: ${label}`);
  }
  return source.slice(0, first) + after + source.slice(first + before.length);
}

let page = fs.readFileSync(pagePath, "utf8");

page = replaceOnce(
  page,
  "let [t, l, b, R, U] = await Promise.all([",
  "let [t, l, b, R, U, V] = await Promise.all([",
  "messages page result tuple",
);

page = replaceOnce(
  page,
  `            h.listAutomatedCouponRules(s.organizationId),
            h.listSalonMenus(s.organizationId),
          ]);`,
  `            h.listAutomatedCouponRules(s.organizationId),
            h.listSalonMenus(s.organizationId),
            f._.$queryRawUnsafe('SELECT "staffKey" AS "id","staffName" FROM "StaffBookingSetting" WHERE "organizationId"=$1 AND "active"=TRUE AND "onLeave"=FALSE AND "staffKey"<>\\'free\\' AND "staffName"<>\\'フリー\\' ORDER BY "createdAt","staffName"', s.organizationId),
          ]);`,
  "active stylist query",
);

page = replaceOnce(
  page,
  `                  (0, r.jsxs)("form", {
                    action: h.saveAutomatedCouponRuleAction,
                    className: "mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4",
                    children: [
                      r.jsx("input", { type: "hidden", name: "ruleName", value: "顧客別自動クーポン" }),`,
  `                  (0, r.jsxs)("form", {
                    action: h.saveAutomatedCouponRuleAction,
                    className: "mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4",
                    "data-automated-coupon-form": "true",
                    children: [
                      r.jsx("script", { src: "/automated-coupon-fields-v330.js", defer: !0 }),
                      r.jsx("input", { type: "hidden", name: "ruleName", value: "顧客別自動クーポン" }),`,
  "automated coupon form hook",
);

page = replaceOnce(
  page,
  `                      r.jsx("input", { type: "hidden", name: "stylistName", value: "前回担当者" }),
                      r.jsx("input", { type: "hidden", name: "phoneLastDigit", value: "0" }),`,
  `                      (0, r.jsxs)("label", { className: "grid gap-2 text-sm font-semibold sm:col-span-2", "data-automated-coupon-field": "stylist", hidden: !0, children: ["対象スタイリスト", (0, r.jsxs)("select", { className: "lien-select", name: "stylistName", defaultValue: "", disabled: !0, children: [r.jsx("option", { value: "", disabled: !0, children: "担当者を選択" }), V.map((e) => r.jsx("option", { value: e.staffName, children: e.staffName }, e.id))] })] }),
                      (0, r.jsxs)("label", { className: "grid gap-2 text-sm font-semibold", "data-automated-coupon-field": "phone_last_digit", hidden: !0, children: ["電話番号の下一桁", r.jsx("select", { className: "lien-select", name: "phoneLastDigit", defaultValue: "", disabled: !0, children: [r.jsx("option", { value: "", disabled: !0, children: "数字を選択" }), ...Array.from({ length: 10 }, (_, e) => r.jsx("option", { value: String(e), children: String(e) }, e))] })] }),`,
  "conditional stylist and phone fields",
);

page = replaceOnce(
  page,
  `                        (0, r.jsxs)("p", { className: "mt-1 text-xs leading-5 text-lien-muted", children: [e.couponTitle, " / ", e.discountRate, "%OFF / ", e.targetMenu, " / ", e.validDays, "日間"] }),`,
  `                        (0, r.jsxs)("p", { className: "mt-1 text-xs leading-5 text-lien-muted", children: [e.couponTitle, " / ", e.discountRate, "%OFF / ", e.targetMenu, " / ", e.validDays, "日間", "stylist" === e.triggerType && e.stylistName ? \` / 担当: \${e.stylistName}\` : "", "phone_last_digit" === e.triggerType && e.phoneLastDigit ? \` / 電話番号末尾: \${e.phoneLastDigit}\` : ""] }),`,
  "saved rule condition summary",
);

fs.writeFileSync(pagePath, page);

let actions = fs.readFileSync(actionsPath, "utf8");
actions = replaceOnce(
  actions,
  `        if ("stylist" === n && !l) throw Error("対象スタイリストを入力してください。");
        if ("phone_last_digit" === n && !/^[0-9]$/.test(d ?? "")) throw Error("電話番号の下一桁は0〜9で入力してください。");`,
  `        if ("stylist" === n) {
          if (!l) throw Error("対象スタイリストを選択してください。");
          let z = await u._.$queryRawUnsafe('SELECT "staffName" FROM "StaffBookingSetting" WHERE "organizationId"=$1 AND "staffName"=$2 AND "active"=TRUE AND "onLeave"=FALSE AND "staffKey"<>\\'free\\' LIMIT 1', t.organizationId, l);
          if (!z[0]?.staffName) throw Error("選択した担当スタイリストを確認してください。");
          l = z[0].staffName;
        } else l = null;
        if ("phone_last_digit" === n) {
          if (!/^[0-9]$/.test(d ?? "")) throw Error("電話番号の下一桁は0〜9で選択してください。");
        } else d = null;`,
  "server-side trigger validation",
);
fs.writeFileSync(actionsPath, actions);

let evaluator = fs.readFileSync(evaluatorPath, "utf8");
evaluator = replaceOnce(
  evaluator,
  `                "stylist" === n.triggerType &&
                o &&
                s?.trim() &&
                B(C(o, n.offsetDays)) === i`,
  `                "stylist" === n.triggerType &&
                o &&
                s?.trim() &&
                n.stylistName?.trim() &&
                String(s).replace(/[\\s　]+/g, " ").trim() === String(n.stylistName).replace(/[\\s　]+/g, " ").trim() &&
                B(C(o, n.offsetDays)) === i`,
  "stylist rule match",
);
evaluator = replaceOnce(
  evaluator,
  `                "phone_last_digit" === n.triggerType &&
                e.phone?.replace(/\\D/g, "")
              )
                l = \`phone:\${e.phone.replace(/\\D/g, "").slice(-1)}\`;`,
  `                "phone_last_digit" === n.triggerType &&
                e.phone?.replace(/\\D/g, "") &&
                e.phone.replace(/\\D/g, "").slice(-1) === n.phoneLastDigit
              )
                l = \`phone:\${e.phone.replace(/\\D/g, "").slice(-1)}\`;`,
  "phone digit rule match",
);
fs.writeFileSync(evaluatorPath, evaluator);
