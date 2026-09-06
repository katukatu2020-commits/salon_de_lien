import assert from "node:assert/strict";

const baseUrl = String(
  process.env.SMOKE_BASE_URL || "https://salon-de-lien.com",
).replace(/\/$/, "");
const headers = {
  "Cache-Control": "no-cache",
  "User-Agent": "ORIMIA-customer-community-comment-menu-v557-smoke/1.0",
};

const ready = await fetch(`${baseUrl}/api/health/ready?smoke=v557`, {
  headers,
  cache: "no-store",
});
assert.equal(ready.status, 200);
assert.equal(ready.headers.get("x-lien-customer-comment-actions"), "v557");
assert.equal(ready.headers.get("x-lien-dealer-auth-mail-content"), "v556");
assert.equal(ready.headers.get("x-lien-customer-navigation-privacy"), "v546");

const login = await fetch(`${baseUrl}/api/customer-auth/login`, {
  method: "POST",
  redirect: "manual",
  headers: {
    ...headers,
    Origin: baseUrl,
    "Content-Type": "application/x-www-form-urlencoded",
  },
  body: new URLSearchParams({
    loginId: "demo.hana",
    password: "Mypage2026!",
    next: "/u/community",
  }),
});
assert.ok(
  [302, 303].includes(login.status),
  `customer login returned ${login.status}`,
);
const cookie = (login.headers.get("set-cookie") || "").split(";")[0];
assert.match(cookie, /^[^=]+=/);

const community = await fetch(`${baseUrl}/u/community?smoke=v557`, {
  headers: { ...headers, Cookie: cookie },
  cache: "no-store",
});
assert.equal(community.status, 200);
const communityHtml = await community.text();
const postIds = [
  ...new Set(
    [...communityHtml.matchAll(/href="\/u\/community\/([^"?]+)["?]/g)].map(
      (match) => decodeURIComponent(match[1]),
    ),
  ),
];
assert.ok(postIds.length > 0, "no published community posts were found");

let ownedPost = null;
for (const postId of postIds.slice(0, 30)) {
  const response = await fetch(
    `${baseUrl}/api/lien-content-management?audience=customer&postId=${encodeURIComponent(postId)}`,
    {
      headers: { ...headers, Cookie: cookie },
      cache: "no-store",
    },
  );
  if (!response.ok) continue;
  const payload = await response.json();
  if (
    payload.comments?.some((comment) => comment.canEdit && comment.canDelete)
  ) {
    ownedPost = { postId, payload };
    break;
  }
}
assert.ok(ownedPost, "the demo customer has no owned comment fixture");

const detail = await fetch(
  `${baseUrl}/u/community/${encodeURIComponent(ownedPost.postId)}?smoke=v557`,
  {
    headers: { ...headers, Cookie: cookie },
    cache: "no-store",
  },
);
assert.equal(detail.status, 200);
const detailHtml = await detail.text();
assert.match(detailHtml, /content-edit-delete-client-v557\.js/);
assert.doesNotMatch(detailHtml, /content-edit-delete-client-v509\.js/);

const client = await fetch(
  `${baseUrl}/content-edit-delete-client-v557.js?smoke=v557`,
  { headers, cache: "no-store" },
);
assert.equal(client.status, 200);
const source = await client.text();
assert.match(source, /__lienStyleCommunityControlsV557/);
assert.match(source, /buildCustomerCommentMenu/);
assert.match(source, /lienCommentSignatureV557/);
assert.match(source, /aria-haspopup', 'menu'/);

console.log(
  JSON.stringify({
    release: "customer-community-comment-menu-v557",
    productionVerified: true,
    ownedCommentAuthorization: true,
    postId: ownedPost.postId,
  }),
);
