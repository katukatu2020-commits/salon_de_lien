import fs from "node:fs";

function replaceOnce(source, search, replacement, label) {
  const count = source.split(search).length - 1;
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`);
  return source.replace(search, replacement);
}

function moduleSegment(source, moduleId) {
  const marker = `${moduleId}:`;
  const start = source.indexOf(marker);
  if (start < 0) throw new Error(`module ${moduleId} not found`);
  let quote = null;
  let escaped = false;
  let round = 0;
  let square = 0;
  let curly = 0;
  for (let index = start + marker.length; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === "'" || char === '"' || char === '`') { quote = char; continue; }
    if (char === '(') round += 1;
    else if (char === ')') round -= 1;
    else if (char === '[') square += 1;
    else if (char === ']') square -= 1;
    else if (char === '{') curly += 1;
    else if (char === '}') curly -= 1;
    else if (char === ',' && round === 0 && square === 0 && curly === 0) return source.slice(start, index);
  }
  throw new Error(`module ${moduleId} end not found`);
}

const serverPath = "/app/server.js";
let server = fs.readFileSync(serverPath, "utf8");
server = replaceOnce(server, "require('./community-publishing-v337')", "require('./community-publishing-v348')", "community service import");
server = replaceOnce(server, "/* community-publishing-v337-service */", "/* community-publishing-v348-service */", "community service marker");
server = replaceOnce(server, "/* community-publishing-v337-route */", "/* community-publishing-v348-route */", "community route marker");
server = replaceOnce(
  server,
  "  await attendanceNotificationProduct.ensureSchema() /* attendance-notification-product-v320-schema */",
  "  await attendanceNotificationProduct.ensureSchema() /* attendance-notification-product-v320-schema */\n  await communityPublishing.ensureSchema() /* community-publishing-v348-schema */",
  "community schema initialization",
);
fs.writeFileSync(serverPath, server);

const commercialPath = "/app/commercial-admin-v101.js";
let commercial = fs.readFileSync(commercialPath, "utf8");
commercial = replaceOnce(commercial, "/admin-community-publishing-v337.js?v=337", "/admin-community-publishing-v348.js?v=348", "community client URL");
commercial = replaceOnce(commercial, "data-community-publishing-v337", "data-community-publishing-v348", "community client data attribute");
commercial = replaceOnce(commercial, "communityPublishingV337", "communityPublishingV348", "community client dataset property");
fs.writeFileSync(commercialPath, commercial);

const newChunk = fs.readFileSync("/tmp/community-loader-9195.js", "utf8");
const replacementModule = moduleSegment(newChunk, 49195);
for (const file of ["/app/.next/server/chunks/2616.js", "/app/.next/server/chunks/9542.js"]) {
  let chunk = fs.readFileSync(file, "utf8");
  const oldModule = moduleSegment(chunk, 49195);
  chunk = replaceOnce(chunk, oldModule, replacementModule, `community loader in ${file}`);
  fs.writeFileSync(file, chunk);
}
