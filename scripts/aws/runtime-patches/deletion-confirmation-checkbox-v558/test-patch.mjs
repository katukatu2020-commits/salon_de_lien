import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "orimia-v558-patch-"));
const write = (relative, value) => {
  const target = path.join(root, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, value);
};

try {
  write(
    ".next/server/chunks/app-shell.js",
    'const shell={"data-lien-community-bootstrap": "v557",src:"/content-edit-delete-client-v557.js"}',
  );
  for (const relative of [
    ".next/server/app/admin/community/page.js",
    ".next/server/app/admin/community/[postId]/page.js",
    ".next/server/app/u/(account)/community/[postId]/page.js",
    ".next/server/app/admin/customers/messages/page.js",
  ])
    write(relative, 'const client="/content-edit-delete-client-v557.js"');
  write(
    "admin-staff-experience-v276.js",
    [
      "window.__lienStyleCommunityLoaderV557=true",
      'const first="/content-edit-delete-client-v557.js"',
      "window.__lienStyleCommunityLoaderV557=false",
      'const second="/content-edit-delete-client-v557.js"',
      "window.lienStyleCommunityLoaderV557=1",
    ].join("\n"),
  );
  write(
    "server.js",
    `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Comment-Actions', 'v557') /* customer-community-comment-menu-v557 */`,
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
      path.join(root, "public/content-edit-delete-client-v558.js"),
      "utf8",
    ),
    /ControlsV558/,
  );
  assert.match(
    fs.readFileSync(
      path.join(root, ".next/server/chunks/app-shell.js"),
      "utf8",
    ),
    /bootstrap": "v558"/,
  );
  assert.match(
    fs.readFileSync(path.join(root, "admin-staff-experience-v276.js"), "utf8"),
    /LoaderV558/,
  );
  assert.match(
    fs.readFileSync(path.join(root, "server.js"), "utf8"),
    /X-Lien-Deletion-Confirmation/,
  );
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}

console.log(
  JSON.stringify({
    release: "deletion-confirmation-checkbox-v558",
    patchFixtureVerified: true,
  }),
);
