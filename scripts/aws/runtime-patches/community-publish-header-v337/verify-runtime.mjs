import fs from "node:fs";

const server = fs.readFileSync("/app/server.js", "utf8");
const commercial = fs.readFileSync("/app/commercial-admin-v101.js", "utf8");
const service = fs.readFileSync("/app/community-publishing-v337.js", "utf8");
const client = fs.readFileSync("/app/community-publishing-client-v337.js", "utf8");

for (const snippet of [
  "createCommunityPublishingService",
  "community-publishing-v337-service",
  "community-publishing-v337-route",
]) {
  if (!server.includes(snippet)) throw new Error(`server is missing ${snippet}`);
}
if (!commercial.includes("/admin-community-publishing-v337.js?v=337")) throw new Error("commercial loader is missing");
for (const snippet of [
  "/api/lien-community-publish-options",
  "/api/lien-community-publish",
  "VisitCommunityPost",
  "ServerSideEncryption: 'AES256'",
]) {
  if (!service.includes(snippet)) throw new Error(`service is missing ${snippet}`);
}
for (const snippet of [
  "ca-community-publish-open",
  "新しいスタイルを投稿",
  "data-ca-cp-consent",
  "setAttribute('data-ca-cp-visits'",
  "decoratePageLabel",
  "location.assign(pageHref())",
]) {
  if (!client.includes(snippet)) throw new Error(`client is missing ${snippet}`);
}

console.log("community-publish-header-v337 runtime verification passed");
