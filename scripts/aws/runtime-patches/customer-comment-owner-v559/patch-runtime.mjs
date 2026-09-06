import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = process.env.LIEN_RUNTIME_ROOT || "/app";
const patchRoot = path.dirname(fileURLToPath(import.meta.url));
const chunkDirectory = path.join(root, ".next", "server", "chunks");
const clientSource = path.join(patchRoot, "content-edit-delete-client-v559.js");
const clientTarget = path.join(
  root,
  "public",
  "content-edit-delete-client-v559.js",
);
const oldClientPath = "/content-edit-delete-client-v558.js";
const newClientPath = "/content-edit-delete-client-v559.js";
const oldBootstrap = '"data-lien-community-bootstrap": "v558"';
const newBootstrap = '"data-lien-community-bootstrap": "v559"';
const staffRuntimePath = path.join(root, "admin-staff-experience-v276.js");
const serverPath = path.join(root, "server.js");
const marker = "customer-comment-owner-v559";
const pageFiles = [
  path.join(root, ".next", "server", "app", "admin", "community", "page.js"),
  path.join(
    root,
    ".next",
    "server",
    "app",
    "admin",
    "community",
    "[postId]",
    "page.js",
  ),
  path.join(
    root,
    ".next",
    "server",
    "app",
    "u",
    "(account)",
    "community",
    "[postId]",
    "page.js",
  ),
  path.join(
    root,
    ".next",
    "server",
    "app",
    "admin",
    "customers",
    "messages",
    "page.js",
  ),
];

function replaceExactly(source, before, after, expected, label) {
  const count = source.split(before).length - 1;
  if (count !== expected)
    throw new Error(`${label}: expected ${expected} matches, found ${count}`);
  return source.replaceAll(before, after);
}

fs.mkdirSync(path.dirname(clientTarget), { recursive: true });
fs.copyFileSync(clientSource, clientTarget);

let shellPatches = 0;
for (const entry of fs.readdirSync(chunkDirectory, { withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.endsWith(".js")) continue;
  const file = path.join(chunkDirectory, entry.name);
  let source = fs.readFileSync(file, "utf8");
  if (!source.includes(oldBootstrap)) continue;
  source = replaceExactly(
    source,
    oldClientPath,
    newClientPath,
    1,
    `${entry.name} client path`,
  );
  source = replaceExactly(
    source,
    oldBootstrap,
    newBootstrap,
    1,
    `${entry.name} bootstrap marker`,
  );
  fs.writeFileSync(file, source);
  shellPatches += 1;
}
if (shellPatches !== 1)
  throw new Error(
    `${marker}: expected one AppShell chunk, patched ${shellPatches}`,
  );

for (const file of pageFiles) {
  const source = fs.readFileSync(file, "utf8");
  fs.writeFileSync(
    file,
    replaceExactly(
      source,
      oldClientPath,
      newClientPath,
      1,
      `${file} client path`,
    ),
  );
}

let staffRuntime = fs.readFileSync(staffRuntimePath, "utf8");
staffRuntime = replaceExactly(
  staffRuntime,
  oldClientPath,
  newClientPath,
  2,
  "shared loader path",
);
staffRuntime = replaceExactly(
  staffRuntime,
  "V558",
  "V559",
  3,
  "shared loader version",
);
staffRuntime += `\n/* ${marker} */\n`;
fs.writeFileSync(staffRuntimePath, staffRuntime);

let server = fs.readFileSync(serverPath, "utf8");
if (server.includes(marker))
  throw new Error(`${marker}: patch already applied`);
const previousReady = `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Deletion-Confirmation', 'v558') /* deletion-confirmation-checkbox-v558 */`;
server = replaceExactly(
  server,
  previousReady,
  `${previousReady}\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Comment-Ownership', 'v559') /* ${marker} */`,
  1,
  "readiness marker",
);
server += `\n/* ${marker} */\n`;
fs.writeFileSync(serverPath, server);

console.log(
  JSON.stringify({
    release: marker,
    shellPatches,
    pageFiles: pageFiles.length,
  }),
);
