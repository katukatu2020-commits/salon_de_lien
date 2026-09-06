import assert from "node:assert/strict";
import fs from "node:fs";

const clientPath =
  process.env.LIEN_DELETE_CONFIRMATION_CLIENT ||
  new URL("./content-edit-delete-client-v560.js", import.meta.url);
const source = fs.readFileSync(clientPath, "utf8");
const postDelete = source.slice(
  source.indexOf("function confirmDeletePost("),
  source.indexOf("function postIdFromHref("),
);
const detailEnhancer = source.slice(
  source.indexOf("async function enhanceCommunityDetail()"),
  source.indexOf("function enhanceChatMessages()"),
);
const chatEnhancer = source.slice(
  source.indexOf("function enhanceChatMessages()"),
  source.indexOf("function useStableCommunityNavigation("),
);

assert.match(source, /window\.__lienStyleCommunityControlsV560 = true/);
assert.match(source, /type=\"checkbox\" data-dialog-confirmation-input/);
assert.match(source, /削除する内容を確認しました/);
assert.doesNotMatch(source, /確認のため「削除する」と入力してください/);
assert.doesNotMatch(source, /confirmationText/);
assert.match(source, /requireConfirmation = false/);
assert.match(source, /confirmationInput\.checked = false/);
assert.match(source, /confirm\.disabled = requireConfirmation/);
assert.match(source, /requireConfirmation && !confirmationInput\.checked/);
assert.match(source, /確認欄にチェックを入れてください/);
assert.match(
  source,
  /\.lien-content-dialog__confirmation label\{[^}]*min-height:52px[^}]*cursor:pointer/,
);
assert.match(
  source,
  /input\[type=\"checkbox\"\]\{width:22px;height:22px[^}]*accent-color:#9d443c/,
);
assert.match(postDelete, /title: "スタイル投稿を削除しますか？"/);
assert.match(postDelete, /input: false,\s+requireConfirmation: true/);
assert.match(detailEnhancer, /title: "コメントを削除しますか？"/);
assert.match(detailEnhancer, /input: false,\s+requireConfirmation: true/);
assert.match(chatEnhancer, /title: "メッセージを削除しますか？"/);
assert.match(chatEnhancer, /input: false,\s+requireConfirmation: true/);
assert.equal(
  [...source.matchAll(/requireConfirmation: true/g)].length,
  3,
  "all three destructive dialogs must require the checkbox",
);

assert.match(
  source,
  /\.lien-comment-menu-trigger\{[^}]*width:40px;height:40px/,
);
assert.match(
  source,
  /@media\(max-width:639px\)\{[^\n]*\.lien-comment-menu-trigger\{width:44px;height:44px\}/,
);
assert.match(
  source,
  /\.lien-comment-menu-shell\{position:absolute;top:-10px;right:-8px;z-index:2/,
);
assert.doesNotMatch(
  source,
  /\.lien-comment-menu-shell\{position:relative/,
);
assert.match(source, /heading\.style\.position = "relative"/);
assert.match(source, /heading\.style\.paddingRight = "44px"/);
assert.match(source, /dataset\.lienCustomerCommentMenu = "v560"/);
assert.match(
  detailEnhancer,
  /buildCustomerCommentMenu\(comment, editComment, deleteComment\)/,
);
assert.match(detailEnhancer, /method: "DELETE"/);
assert.match(detailEnhancer, /updateVisibleCommentCount\(content\)/);

console.log(
  JSON.stringify({
    release: "customer-comment-owner-v560",
    sourceChecks: 29,
  }),
);
