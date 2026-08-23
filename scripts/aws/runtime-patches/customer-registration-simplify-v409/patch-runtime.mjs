import fs from "node:fs";

const serverPath = "/app/.next/server/app/u/register/[token]/page.js";
const clientPath = "/app/.next/static/chunks/app/u/register/[token]/page-36454af0277c0f75.js";

function replacePatternOnce(source, pattern, replacement, label) {
  const matches = source.match(pattern) ?? [];
  if (matches.length !== 1) {
    throw new Error(`${label}: expected 1 match, found ${matches.length}`);
  }
  return source.replace(pattern, replacement);
}

const phoneHelpText = "この電話番号を本人確認に使用します。SMSは、あなたが「認証コードを送信」を押した時だけ送信され、ページ表示や電話番号入力だけでは送信されません。予約通知への同意とは別です。1つの携帯番号につき、お客様アカウントは1つだけ作成できます。";
const smsPausedHelpText = "SMS認証は現在一時停止中です。電話番号は、お客様アプリの重複登録防止に使用します。1つの携帯番号につき1アカウントまでです。";

let server = fs.readFileSync(serverPath, "utf8");
let client = fs.readFileSync(clientPath, "utf8");

server = replacePatternOnce(
  server,
  /,\(0,s\.jsxs\)\("label",\{className:"grid gap-1\.5 text-sm font-semibold sm:col-span-2",children:\["担当者・指名",\(0,s\.jsxs\)\("select",\{name:"assignedStaffSelection",defaultValue:"free",className:"lien-input",children:\[s\.jsx\("option",\{value:"free",children:"フリー（指名なし）"\}\),v\.map\(e=>s\.jsx\("option",\{value:e,children:e\},e\)\)\]\}\)\]\}\)/g,
  "",
  "customer registration staff preference field",
);

server = replacePatternOnce(
  server,
  new RegExp(`,r\\.jsx\\("p",\\{className:"text-xs leading-5 text-lien-muted",children:${JSON.stringify(phoneHelpText)}\\}\\)`, "g"),
  "",
  "server phone help text",
);

server = replacePatternOnce(
  server,
  new RegExp(`,s\\.jsx\\("span",\\{className:"text-xs font-normal leading-5 text-lien-muted",children:${JSON.stringify(smsPausedHelpText)}\\}\\)`, "g"),
  "",
  "SMS paused help text",
);

client = replacePatternOnce(
  client,
  new RegExp(`,\\(0,a\\.jsx\\)\\("p",\\{className:"text-xs leading-5 text-lien-muted",children:${JSON.stringify(phoneHelpText)}\\}\\)`, "g"),
  "",
  "client phone help text",
);

fs.writeFileSync(serverPath, server);
fs.writeFileSync(clientPath, client);
console.log("customer registration simplify v409 patched");
