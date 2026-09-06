import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { chromium } from "playwright-core";

const baseUrl = String(
  process.env.VERIFY_BASE_URL || "https://salon-de-lien.com",
).replace(/\/$/, "");
const injectedClient = String(process.env.INJECT_CLIENT_PATH || "").trim();
const screenshotRoot =
  process.env.VERIFY_SCREENSHOT_DIR ||
  path.join(os.tmpdir(), "orimia-delete-confirmation-v559");
fs.mkdirSync(screenshotRoot, { recursive: true });

const chromeCandidates = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter(Boolean);
const executablePath = chromeCandidates.find((candidate) =>
  fs.existsSync(candidate),
);
assert.ok(executablePath, "Chrome or Chromium executable was not found");

const browser = await chromium.launch({ executablePath, headless: true });

async function findPublishedPost(context) {
  const response = await context.request.get(
    `${baseUrl}/u/community?browser=v559`,
    {
      headers: { "Cache-Control": "no-cache" },
    },
  );
  assert.equal(
    response.ok(),
    true,
    `community list returned ${response.status()}`,
  );
  const html = await response.text();
  const ids = [
    ...new Set(
      [...html.matchAll(/href="\/u\/community\/([^"?]+)["?]/g)].map((match) =>
        decodeURIComponent(match[1]),
      ),
    ),
  ];
  assert.ok(ids.length > 0, "no published community post was found");
  return ids[0];
}

async function cleanupComment(context, postId, commentId) {
  if (!commentId) return;
  await context.request.delete(
    `${baseUrl}/api/lien-content-management?audience=customer`,
    {
      headers: { Origin: baseUrl, "Content-Type": "application/json" },
      data: { target: "comment", postId, id: commentId },
      failOnStatusCode: false,
    },
  );
}

async function verifyViewport(name, viewport) {
  const context = await browser.newContext({ viewport });
  let postId = "";
  let createdId = "";
  let removed = false;
  const originalBody = `v559 ${name} 動作確認 ${Date.now()}`;
  const editedBody = `${originalBody} 編集済み`;

  try {
    const login = await context.request.post(
      `${baseUrl}/api/customer-auth/login`,
      {
        form: {
          loginId: "demo.hana",
          password: "Mypage2026!",
          next: "/u/community",
        },
      },
    );
    assert.equal(
      login.ok(),
      true,
      `${name}: customer login returned ${login.status()}`,
    );
    postId = await findPublishedPost(context);

    const page = await context.newPage();
    if (injectedClient) {
      await page.route("**/content-edit-delete-client-v558.js*", (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/javascript; charset=utf-8",
          body: "",
        }),
      );
    }
    await page.goto(
      `${baseUrl}/u/community/${encodeURIComponent(postId)}?browser=v559-${name}`,
      {
        waitUntil: "domcontentloaded",
        timeout: 20_000,
      },
    );
    if (injectedClient)
      await page.addScriptTag({ path: path.resolve(injectedClient) });
    await page.waitForFunction(
      () => window.__lienStyleCommunityControlsV559 === true,
      null,
      { timeout: 12_000 },
    );

    const input = page
      .locator(
        'form textarea[placeholder*="コメント"], form input[placeholder*="コメント"]',
      )
      .last();
    try {
      await input.waitFor({ state: "visible", timeout: 12_000 });
    } catch (error) {
      const diagnosticPath = path.join(
        screenshotRoot,
        `comment-input-missing-${name}.png`,
      );
      await page.screenshot({ path: diagnosticPath, fullPage: true });
      const fields = await page
        .locator("textarea, input")
        .evaluateAll((elements) =>
          elements.map((element) => ({
            tag: element.tagName,
            type: element.getAttribute("type"),
            placeholder: element.getAttribute("placeholder"),
            name: element.getAttribute("name"),
          })),
        );
      const bodyText = (await page.locator("body").innerText())
        .replace(/\s+/g, " ")
        .slice(0, 500);
      throw new Error(
        `${name}: comment input was not found at ${page.url()}; fields=${JSON.stringify(fields)}; body=${bodyText}`,
        { cause: error },
      );
    }
    await input.fill(originalBody);
    const form = input.locator("xpath=ancestor::form");
    const createResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        /\/api\/customer\/community\/posts\/[^/]+\/comments(?:\?|$)/.test(
          response.url(),
        ),
    );
    await form.locator('button[type="submit"]').click();
    const createResponse = await createResponsePromise;
    assert.equal(
      createResponse.status(),
      201,
      `${name}: comment creation returned ${createResponse.status()}`,
    );
    const created = await createResponse.json();
    createdId = String(created.id || "");
    assert.ok(createdId, `${name}: created comment id is missing`);

    let card = page
      .locator(".mt-4.grid > div")
      .filter({ hasText: originalBody })
      .last();
    await card.waitFor({ state: "visible", timeout: 12_000 });
    const trigger = card.locator(
      '[data-lien-customer-comment-menu="v559"] .lien-comment-menu-trigger',
    );
    await trigger.waitFor({ state: "visible", timeout: 12_000 });
    assert.equal(await trigger.getAttribute("aria-expanded"), "false");

    const payloadResponse = await context.request.get(
      `${baseUrl}/api/lien-content-management?audience=customer&postId=${encodeURIComponent(postId)}`,
      { headers: { "Cache-Control": "no-cache" } },
    );
    assert.equal(payloadResponse.ok(), true);
    const payload = await payloadResponse.json();
    const ownedCount = payload.comments.filter(
      (comment) => comment.canEdit || comment.canDelete,
    ).length;
    assert.equal(
      await page.locator('[data-lien-customer-comment-menu="v559"]').count(),
      ownedCount,
    );
    assert.equal(
      await page.getByText("公開中", { exact: true }).count(),
      0,
      `${name}: staff-only status is visible`,
    );

    await trigger.click();
    const menu = card.locator(".lien-comment-menu");
    await menu.waitFor({ state: "visible" });
    assert.equal(await trigger.getAttribute("aria-expanded"), "true");
    assert.equal(await menu.getByRole("menuitem", { name: "編集" }).count(), 1);
    assert.equal(await menu.getByRole("menuitem", { name: "削除" }).count(), 1);
    await page.waitForTimeout(50);
    const menuBox = await menu.boundingBox();
    assert.ok(menuBox, `${name}: comment menu has no visible bounds`);
    assert.ok(
      menuBox.y >= 0,
      `${name}: comment menu is clipped above the viewport`,
    );
    const bottomGuard = name === "mobile" ? 88 : 0;
    assert.ok(
      menuBox.y + menuBox.height <= viewport.height - bottomGuard,
      `${name}: comment menu is obscured below the viewport`,
    );
    await card.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: path.join(screenshotRoot, `comment-menu-${name}.png`),
    });

    await menu.getByRole("menuitem", { name: "編集" }).click();
    const dialog = page.locator("[data-lien-content-dialog]");
    await dialog.waitFor({ state: "visible" });
    await dialog.locator("[data-dialog-input]").fill(editedBody);
    const editResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "PATCH" &&
        response.url().includes("/api/lien-content-management"),
    );
    await dialog.getByRole("button", { name: "保存" }).click();
    const editResponse = await editResponsePromise;
    assert.equal(
      editResponse.status(),
      200,
      `${name}: comment edit returned ${editResponse.status()}`,
    );
    card = page
      .locator(".mt-4.grid > div")
      .filter({ hasText: editedBody })
      .last();
    await card.waitFor({ state: "visible" });

    await card.locator(".lien-comment-menu-trigger").click();
    await card
      .locator(".lien-comment-menu")
      .getByRole("menuitem", { name: "削除" })
      .click();
    await dialog.waitFor({ state: "visible" });
    const confirmation = dialog.getByRole("checkbox", {
      name: "削除する内容を確認しました",
    });
    const deleteButton = dialog.getByRole("button", {
      name: "コメントを削除",
    });
    await confirmation.waitFor({ state: "visible" });
    assert.equal(await confirmation.isChecked(), false);
    assert.equal(await deleteButton.isDisabled(), true);
    assert.equal(
      await dialog.locator('[data-dialog-confirmation-input][type="text"]').count(),
      0,
      `${name}: typed delete confirmation is still present`,
    );
    assert.equal(await dialog.locator("[data-dialog-input]").isHidden(), true);
    await page.screenshot({
      path: path.join(screenshotRoot, `delete-confirmation-${name}.png`),
    });
    await dialog.getByRole("button", { name: "戻る" }).click();
    await dialog.waitFor({ state: "hidden" });
    await card.waitFor({ state: "visible" });

    await card.locator(".lien-comment-menu-trigger").click();
    await card
      .locator(".lien-comment-menu")
      .getByRole("menuitem", { name: "削除" })
      .click();
    await dialog.waitFor({ state: "visible" });
    await confirmation.check();
    assert.equal(await deleteButton.isEnabled(), true);
    const deleteResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "DELETE" &&
        response.url().includes("/api/lien-content-management"),
    );
    await deleteButton.click();
    const deleteResponse = await deleteResponsePromise;
    assert.equal(
      deleteResponse.status(),
      200,
      `${name}: comment delete returned ${deleteResponse.status()}`,
    );
    await card.waitFor({ state: "detached" });
    removed = true;

    const overflow = await page.evaluate(
      () =>
        Math.max(
          document.documentElement.scrollWidth,
          document.body.scrollWidth,
        ) - innerWidth,
    );
    assert.ok(overflow <= 1, `${name}: horizontal overflow is ${overflow}px`);
    return {
      name,
      postId,
      menuItems: 2,
      created: true,
      edited: true,
      cancelPreservedComment: true,
      checkboxRequired: true,
      deleted: true,
      overflow,
    };
  } finally {
    if (!removed && postId) {
      if (!createdId) {
        const response = await context.request.get(
          `${baseUrl}/api/lien-content-management?audience=customer&postId=${encodeURIComponent(postId)}`,
          { headers: { "Cache-Control": "no-cache" }, failOnStatusCode: false },
        );
        if (response.ok()) {
          const payload = await response.json();
          createdId = String(
            payload.comments?.find(
              (comment) =>
                comment.body === originalBody || comment.body === editedBody,
            )?.id || "",
          );
        }
      }
      await cleanupComment(context, postId, createdId);
    }
    await context.close();
  }
}

async function verifyStaffPostDialog() {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  try {
    const login = await context.request.post(`${baseUrl}/api/auth/login`, {
      form: {
        email: "demo.owner",
        password: "LienDemo2026!",
        next: "/admin/community",
      },
    });
    assert.equal(login.ok(), true, `staff login returned ${login.status()}`);

    const page = await context.newPage();
    if (injectedClient) {
      await page.route("**/content-edit-delete-client-v558.js*", (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/javascript; charset=utf-8",
          body: "",
        }),
      );
    }
    await page.goto(`${baseUrl}/admin/community?browser=v559-staff`, {
      waitUntil: "domcontentloaded",
      timeout: 20_000,
    });
    if (injectedClient)
      await page.addScriptTag({ path: path.resolve(injectedClient) });
    await page.waitForFunction(
      () => window.__lienStyleCommunityControlsV559 === true,
      null,
      { timeout: 12_000 },
    );

    const remove = page.locator(".lien-style-delete").first();
    await remove.waitFor({ state: "visible", timeout: 12_000 });
    await remove.click();
    const dialog = page.locator("[data-lien-content-dialog]");
    await dialog.waitFor({ state: "visible" });
    await dialog.getByRole("heading", {
      name: "スタイル投稿を削除しますか？",
    }).waitFor();
    const checkbox = dialog.getByRole("checkbox", {
      name: "削除する内容を確認しました",
    });
    const deleteButton = dialog.getByRole("button", { name: "投稿を削除" });
    assert.equal(await checkbox.isChecked(), false);
    assert.equal(await deleteButton.isDisabled(), true);
    assert.equal(
      await dialog.locator('[data-dialog-confirmation-input][type="text"]').count(),
      0,
    );
    await checkbox.check();
    assert.equal(await deleteButton.isEnabled(), true);
    await checkbox.uncheck();
    assert.equal(await deleteButton.isDisabled(), true);
    await page.screenshot({
      path: path.join(screenshotRoot, "staff-post-delete-confirmation.png"),
    });
    await dialog.getByRole("button", { name: "戻る" }).click();
    await dialog.waitFor({ state: "hidden" });
    await remove.waitFor({ state: "visible" });

    return {
      name: "staff-post",
      checkboxRequired: true,
      cancelPreservedPost: true,
    };
  } finally {
    await context.close();
  }
}

try {
  const results = [];
  results.push(await verifyViewport("mobile", { width: 390, height: 844 }));
  results.push(await verifyViewport("desktop", { width: 1440, height: 1000 }));
  results.push(await verifyStaffPostDialog());
  console.log(
    JSON.stringify(
      {
        release: "customer-comment-owner-v559",
        injectedClient: Boolean(injectedClient),
        results,
        screenshots: screenshotRoot,
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
