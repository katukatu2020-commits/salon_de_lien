import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.env.LIEN_RUNTIME_ROOT || "/app";
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const client = read("public/content-edit-delete-client-v557.js");
const server = read("server.js");
const service = read("content-management-v465.js");
const staffRuntime = read("admin-staff-experience-v276.js");
const appShellChunks = fs
  .readdirSync(path.join(root, ".next", "server", "chunks"))
  .filter((name) => name.endsWith(".js"))
  .map((name) => read(path.join(".next", "server", "chunks", name)))
  .filter((source) =>
    source.includes('"data-lien-community-bootstrap": "v557"'),
  );
const pageFiles = [
  ".next/server/app/admin/community/page.js",
  ".next/server/app/admin/community/[postId]/page.js",
  ".next/server/app/u/(account)/community/[postId]/page.js",
  ".next/server/app/admin/customers/messages/page.js",
];

assert.equal(appShellChunks.length, 1);
assert.match(appShellChunks[0], /content-edit-delete-client-v557\.js/);
assert.doesNotMatch(appShellChunks[0], /content-edit-delete-client-v509\.js/);
assert.match(staffRuntime, /__lienStyleCommunityLoaderV557/);
assert.match(staffRuntime, /content-edit-delete-client-v557\.js/);
assert.doesNotMatch(staffRuntime, /content-edit-delete-client-v509\.js/);

for (const file of pageFiles) {
  const source = read(file);
  assert.match(
    source,
    /content-edit-delete-client-v557\.js/,
    `${file} does not load v557`,
  );
  assert.doesNotMatch(
    source,
    /content-edit-delete-client-v509\.js/,
    `${file} still loads v509`,
  );
}

assert.match(client, /window\.__lienStyleCommunityControlsV557 = true/);
assert.match(client, /dataset\.lienCustomerCommentMenu = ["']v557["']/);
assert.match(client, /["']aria-haspopup["'], ["']menu["']/);
assert.match(
  client,
  /buildCustomerCommentMenu\(comment, editComment, deleteComment\)/,
);
assert.match(client, /visibleCommentSignature\(initialContent\)/);
assert.match(
  client,
  /initialContent\.dataset\.lienCommentSignatureV557 === initialSignature/,
);
assert.match(
  client,
  /content\.dataset\.lienCommentSignatureV557 = visibleCommentSignature\(content\)/,
);
assert.match(client, /if \(audience === ["']staff["']\) \{\s+const status/);
assert.match(client, /max-width:66\.666667%!important/);
assert.match(client, /bubble\.addEventListener\(["']dblclick["']/);

assert.match(service, /function canManageComment\(session, comment\)/);
assert.match(
  service,
  /String\(comment\.appUserId \|\| ''\) === String\(session\.userId\)/,
);
assert.match(service, /target === 'comment'/);
assert.match(service, /UPDATE "VisitCommunityComment" SET "body"/);
assert.match(service, /UPDATE "VisitCommunityComment" SET "deletedAt"/);
assert.match(server, /X-Lien-Customer-Comment-Actions', 'v557'/);
assert.match(server, /X-Lien-Dealer-Auth-Mail-Content', 'v556'/);

console.log(
  JSON.stringify({
    release: "customer-community-comment-menu-v557",
    verified: true,
  }),
);
