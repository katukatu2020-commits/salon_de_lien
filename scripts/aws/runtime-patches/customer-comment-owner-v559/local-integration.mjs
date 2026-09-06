import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { chromium } from "playwright-core";

const baseUrl = String(process.env.TEST_BASE_URL || "http://127.0.0.1:3122").replace(/\/$/, "");
const databaseUrl = process.env.TEST_DATABASE_URL || "postgresql://salon:salon_password@127.0.0.1:5432/salon_de_lien?schema=public";
const customerSecret = process.env.TEST_CUSTOMER_AUTH_SECRET || "local-v503-customer-secret-please-change-123456";
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
const suffix = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
const ids = {
  targetCustomer: `v559-target-${suffix}`,
  sourceCustomer: `v559-source-${suffix}`,
  otherCustomer: `v559-other-${suffix}`,
  targetUser: `v559-target-user-${suffix}`,
  sourceUser: `v559-source-user-${suffix}`,
  otherUser: `v559-other-user-${suffix}`,
  post: `v559-post-${suffix}`,
  ownedComment: `v559-owned-comment-${suffix}`,
  otherComment: `v559-other-comment-${suffix}`,
  merge: `v559-merge-${suffix}`
};
const loginId = `v559.owner.${suffix}`;
const originalBody = `Merged owner comment ${suffix}`;
const editedBody = `${originalBody} edited`;
const otherBody = `Unrelated comment ${suffix}`;
const artifactDirectory = path.resolve(".artifacts", "customer-comment-owner-v559");
fs.mkdirSync(artifactDirectory, { recursive: true });

function customerSessionToken() {
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload = {
    version: 1,
    subject: loginId.toLowerCase(),
    role: "CUSTOMER",
    customerId: ids.targetCustomer,
    organizationId: "org_salon_de_lien",
    userId: ids.targetUser,
    issuedAt,
    expiresAt: issuedAt + 3600,
    sessionId: crypto.randomUUID()
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", customerSecret).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

async function setup() {
  for (const [id, name] of [
    [ids.targetCustomer, "Current Customer"],
    [ids.sourceCustomer, "Legacy Customer"],
    [ids.otherCustomer, "Other Customer"]
  ]) {
    await prisma.customer.create({ data: { id, name, organizationId: "org_salon_de_lien" } });
  }
  await prisma.appUser.createMany({
    data: [
      {
        id: ids.targetUser,
        organizationId: "org_salon_de_lien",
        customerId: ids.targetCustomer,
        email: `${loginId}@example.test`,
        loginId,
        displayName: "Current Customer",
        role: "CUSTOMER",
        active: true
      },
      {
        id: ids.sourceUser,
        organizationId: "org_salon_de_lien",
        customerId: ids.sourceCustomer,
        email: `v559.legacy.${suffix}@example.test`,
        loginId: `v559.legacy.${suffix}`,
        displayName: "Legacy Customer",
        role: "CUSTOMER",
        active: false
      },
      {
        id: ids.otherUser,
        organizationId: "org_salon_de_lien",
        customerId: ids.otherCustomer,
        email: `v559.other.${suffix}@example.test`,
        loginId: `v559.other.${suffix}`,
        displayName: "Other Customer",
        role: "CUSTOMER",
        active: true
      }
    ]
  });
  await prisma.$executeRawUnsafe(
    `INSERT INTO "CustomerMergeHistory"
       ("id","organizationId","sourceCustomerId","targetCustomerId","actorDisplayName","actorRole","sourceSnapshotJson","targetSnapshotJson","resultJson")
     VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9::jsonb)`,
    ids.merge,
    "org_salon_de_lien",
    ids.sourceCustomer,
    ids.targetCustomer,
    "v559 integration",
    "SYSTEM",
    JSON.stringify({ id: ids.sourceCustomer }),
    JSON.stringify({ id: ids.targetCustomer }),
    JSON.stringify({ test: true })
  );
  await prisma.visitCommunityPost.create({
    data: {
      id: ids.post,
      organizationId: "org_salon_de_lien",
      postKind: "STORE",
      caption: "Comment ownership integration fixture",
      photoReferences: ["/brand/orimia-icon-192.png"],
      publishedByName: "ORIMIA",
      published: true
    }
  });
  await prisma.visitCommunityComment.createMany({
    data: [
      {
        id: ids.ownedComment,
        postId: ids.post,
        appUserId: ids.sourceUser,
        authorDisplayName: "Current Customer",
        authorRole: "CUSTOMER",
        body: originalBody
      },
      {
        id: ids.otherComment,
        postId: ids.post,
        appUserId: ids.otherUser,
        authorDisplayName: "Other Customer",
        authorRole: "CUSTOMER",
        body: otherBody
      }
    ]
  });
}

async function cleanup() {
  await prisma.visitCommunityComment.deleteMany({
    where: { id: { in: [ids.ownedComment, ids.otherComment] } }
  }).catch(() => undefined);
  await prisma.visitCommunityPost.deleteMany({ where: { id: ids.post } }).catch(() => undefined);
  await prisma.$executeRawUnsafe('DELETE FROM "CustomerMergeHistory" WHERE "id"=$1', ids.merge).catch(() => undefined);
  await prisma.appUser.deleteMany({
    where: { id: { in: [ids.targetUser, ids.sourceUser, ids.otherUser] } }
  }).catch(() => undefined);
  await prisma.customer.deleteMany({
    where: { id: { in: [ids.targetCustomer, ids.sourceCustomer, ids.otherCustomer] } }
  }).catch(() => undefined);
}

async function verifyViewport(browser, token, name, viewport) {
  const context = await browser.newContext({ viewport });
  await context.addCookies([{
    name: "lien_customer_session",
    value: token,
    url: baseUrl
  }]);
  const page = await context.newPage();
  await page.goto(`${baseUrl}/u/community/${encodeURIComponent(ids.post)}?integration=v559-${name}`, {
    waitUntil: "domcontentloaded"
  });
  await page.waitForFunction(() => window.__lienStyleCommunityControlsV559 === true);
  const ownedCard = page.locator(".mt-4.grid > div").filter({ hasText: originalBody });
  const otherCard = page.locator(".mt-4.grid > div").filter({ hasText: otherBody });
  await ownedCard.waitFor({ state: "visible" });
  const ownedTrigger = ownedCard.locator('[data-lien-customer-comment-menu="v559"] .lien-comment-menu-trigger');
  await ownedTrigger.waitFor({ state: "visible" });
  assert.equal(await otherCard.locator(".lien-comment-menu-trigger").count(), 0, `${name}: unrelated comment has a menu`);
  const triggerBox = await ownedTrigger.boundingBox();
  assert.ok(triggerBox && triggerBox.width >= 40 && triggerBox.height >= 40, `${name}: menu trigger is too small`);
  await ownedTrigger.click();
  await ownedCard.locator(".lien-comment-menu").waitFor({ state: "visible" });
  await page.screenshot({
    path: path.join(artifactDirectory, `merged-owner-menu-${name}.png`),
    fullPage: false
  });
  const overflow = await page.evaluate(() => Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) - innerWidth);
  assert.ok(overflow <= 1, `${name}: horizontal overflow is ${overflow}px`);
  return { context, page, ownedCard };
}

let browser;
try {
  await setup();
  const token = customerSessionToken();
  const apiResponse = await fetch(
    `${baseUrl}/api/lien-content-management?audience=customer&postId=${encodeURIComponent(ids.post)}`,
    { headers: { Cookie: `lien_customer_session=${token}`, "Cache-Control": "no-cache" } }
  );
  assert.equal(apiResponse.status, 200);
  const payload = await apiResponse.json();
  const owned = payload.comments.find((comment) => comment.id === ids.ownedComment);
  const unrelated = payload.comments.find((comment) => comment.id === ids.otherComment);
  assert.equal(owned?.canEdit, true);
  assert.equal(owned?.canDelete, true);
  assert.equal(unrelated?.canEdit, false);
  assert.equal(unrelated?.canDelete, false);

  browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  const desktop = await verifyViewport(browser, token, "desktop", { width: 1280, height: 900 });
  await desktop.context.close();
  const mobile = await verifyViewport(browser, token, "mobile", { width: 390, height: 844 });

  const menu = mobile.ownedCard.locator(".lien-comment-menu");
  await menu.locator(".lien-comment-menu-item").first().click();
  const dialog = mobile.page.locator("[data-lien-content-dialog]");
  await dialog.locator("[data-dialog-input]").fill(editedBody);
  const patchResponse = mobile.page.waitForResponse((response) =>
    response.request().method() === "PATCH" && response.url().includes("/api/lien-content-management")
  );
  await dialog.locator("[data-dialog-confirm]").click();
  assert.equal((await patchResponse).status(), 200);
  await mobile.page.getByText(editedBody, { exact: true }).waitFor({ state: "visible" });

  const editedCard = mobile.page.locator(".mt-4.grid > div").filter({ hasText: editedBody });
  await editedCard.locator(".lien-comment-menu-trigger").click();
  await editedCard.locator(".lien-comment-menu-item").last().click();
  await dialog.locator("[data-dialog-confirmation-input]").check();
  await mobile.page.screenshot({
    path: path.join(artifactDirectory, "merged-owner-delete-confirmation-mobile.png"),
    fullPage: false
  });
  const deleteResponse = mobile.page.waitForResponse((response) =>
    response.request().method() === "DELETE" && response.url().includes("/api/lien-content-management")
  );
  await dialog.locator("[data-dialog-confirm]").click();
  assert.equal((await deleteResponse).status(), 200);
  await editedCard.waitFor({ state: "detached" });
  await mobile.context.close();

  console.log(JSON.stringify({
    release: "customer-comment-owner-v559",
    mergedOwnerMenu: true,
    unrelatedMenuHidden: true,
    edit: true,
    delete: true,
    desktop: true,
    mobile: true,
    artifacts: artifactDirectory
  }));
} finally {
  await browser?.close().catch(() => undefined);
  await cleanup();
  await prisma.$disconnect();
}
