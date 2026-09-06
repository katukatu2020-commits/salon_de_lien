import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "orimia-v560-patch-"));
const write = (relative, value) => {
  const target = path.join(root, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, value);
};

try {
  write(
    ".next/server/chunks/app-shell.js",
    'const shell={"data-lien-community-bootstrap": "v559",src:"/content-edit-delete-client-v559.js"}',
  );
  for (const relative of [
    ".next/server/app/admin/community/page.js",
    ".next/server/app/admin/community/[postId]/page.js",
    ".next/server/app/u/(account)/community/[postId]/page.js",
    ".next/server/app/admin/customers/messages/page.js",
  ])
    write(relative, 'const client="/content-edit-delete-client-v559.js"');
  write(
    "admin-staff-experience-v276.js",
    [
      "window.__lienStyleCommunityLoaderV559=true",
      'const first="/content-edit-delete-client-v559.js"',
      "window.__lienStyleCommunityLoaderV559=false",
      'const second="/content-edit-delete-client-v559.js"',
      "window.lienStyleCommunityLoaderV559=1",
    ].join("\n"),
  );
  write(
    "server.js",
    `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Comment-Ownership', 'v559') /* customer-comment-owner-v559 */`,
  );

  const result = spawnSync(
    process.execPath,
    [fileURLToPath(new URL("./patch-runtime.mjs", import.meta.url))],
    {
      env: { ...process.env, LIEN_RUNTIME_ROOT: root },
      encoding: "utf8",
    },
  );
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(
    fs.readFileSync(
      path.join(root, "public/content-edit-delete-client-v560.js"),
      "utf8",
    ),
    /ControlsV560/,
  );
  assert.match(
    fs.readFileSync(
      path.join(root, ".next/server/chunks/app-shell.js"),
      "utf8",
    ),
    /bootstrap": "v560"/,
  );
  assert.match(
    fs.readFileSync(path.join(root, "admin-staff-experience-v276.js"), "utf8"),
    /LoaderV560/,
  );
  assert.match(
    fs.readFileSync(path.join(root, "server.js"), "utf8"),
    /X-Lien-Customer-Comment-Layout', 'v560'/,
  );
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}

console.log(
  JSON.stringify({
    release: "customer-comment-owner-v560",
    patchFixtureVerified: true,
  }),
);
