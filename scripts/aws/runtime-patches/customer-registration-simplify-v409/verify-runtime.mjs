import fs from "node:fs";

const serverPath = "/app/.next/server/app/u/register/[token]/page.js";
const clientPath = "/app/.next/static/chunks/app/u/register/[token]/page-36454af0277c0f75.js";
const server = fs.readFileSync(serverPath, "utf8");
const client = fs.readFileSync(clientPath, "utf8");

for (const marker of [
  "担当者・指名",
  "assignedStaffSelection",
  "この電話番号を本人確認に使用します。",
  "SMS認証は現在一時停止中です。",
  "1つの携帯番号につき、お客様アカウントは1つだけ作成できます。",
]) {
  if (server.includes(marker)) throw new Error(`server marker remains: ${marker}`);
}

for (const marker of [
  "この電話番号を本人確認に使用します。",
  "1つの携帯番号につき、お客様アカウントは1つだけ作成できます。",
]) {
  if (client.includes(marker)) throw new Error(`client marker remains: ${marker}`);
}

new Function(server);
new Function(client);
console.log("customer registration simplify v409 verified");
