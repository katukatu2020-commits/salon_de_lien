import fs from "node:fs";

const server = fs.readFileSync("/app/server.js", "utf8");
const commercial = fs.readFileSync("/app/commercial-admin-v101.js", "utf8");
const client = fs.readFileSync("/app/community-publishing-client-v348.js", "utf8");
const chunk2616 = fs.readFileSync("/app/.next/server/chunks/2616.js", "utf8");
const chunk9542 = fs.readFileSync("/app/.next/server/chunks/9542.js", "utf8");

for (const marker of ["community-publishing-v348", "communityPublishing.ensureSchema()"] ) {
  if (!server.includes(marker)) throw new Error(`server marker missing: ${marker}`);
}
if (!commercial.includes("/admin-community-publishing-v348.js?v=348")) throw new Error("new client loader missing");
if (commercial.includes("/admin-community-publishing-v337.js?v=337")) throw new Error("old client loader remains active");
for (const forbidden of ["data-ca-cp-visits", "data-ca-cp-search", "customerId: selected", "visitId: selected"]) {
  if (client.includes(forbidden)) throw new Error(`legacy visit selector remains: ${forbidden}`);
}
for (const expected of ["写真を追加", "rightsConfirmed", "掲載できる権限"] ) {
  if (!client.includes(expected)) throw new Error(`new client marker missing: ${expected}`);
}
for (const [name, chunk] of [["2616", chunk2616], ["9542", chunk9542]]) {
  if (!chunk.includes('postKind:"STORE"') || !chunk.includes("photoReferences")) throw new Error(`standalone community loader missing in ${name}`);
}
