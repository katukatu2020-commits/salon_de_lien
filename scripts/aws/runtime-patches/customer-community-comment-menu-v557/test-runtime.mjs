import assert from "node:assert/strict";
import fs from "node:fs";

const clientPath =
  process.env.LIEN_COMMENT_MENU_CLIENT ||
  new URL("./content-edit-delete-client-v557.js", import.meta.url);
const source = fs.readFileSync(clientPath, "utf8");
const detailEnhancer = source.slice(
  source.indexOf("async function enhanceCommunityDetail()"),
  source.indexOf("function enhanceChatMessages()"),
);

assert.ok(
  detailEnhancer.length > 4_000,
  "community detail enhancer was not found",
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
  /\.lien-comment-menu\{[^}]*z-index:90[^}]*min-width:144px/,
);
assert.match(
  source,
  /\.lien-comment-menu-shell\.opens-up \.lien-comment-menu\{top:auto;bottom:calc\(100% \+ 5px\)\}/,
);
assert.match(source, /\.lien-comment-menu-item\{[^}]*min-height:44px/);
assert.match(
  source,
  /trigger\.setAttribute\(["']aria-label["'], ["']コメントの操作["']\)/,
);
assert.match(source, /menu\.setAttribute\(["']role["'], ["']menu["']\)/);
assert.match(source, /commentMenuItem\(["']編集["'], pencilIcon, onEdit\)/);
assert.match(
  source,
  /commentMenuItem\(["']削除["'], trashIcon, onDelete, true\)/,
);
assert.match(detailEnhancer, /if \(audience === ["']customer["']\)/);
assert.match(
  detailEnhancer,
  /buildCustomerCommentMenu\(comment, editComment, deleteComment\)/,
);
assert.match(detailEnhancer, /method: ["']PATCH["']/);
assert.match(detailEnhancer, /method: ["']DELETE["']/);
assert.match(detailEnhancer, /card\.remove\(\)/);
assert.match(detailEnhancer, /updateVisibleCommentCount\(content\)/);
assert.match(detailEnhancer, /visibleCommentSignature\(initialContent\)/);
assert.match(detailEnhancer, /const assignedCommentCards = new Set\(\)/);
assert.match(
  detailEnhancer,
  /findCommentCard\(content, comment, assignedCommentCards\)/,
);
assert.doesNotMatch(
  detailEnhancer,
  /lienCommunityOwnerEnhancedV471 === match\[2\]\) return/,
);

console.log(
  JSON.stringify({
    release: "customer-community-comment-menu-v557",
    sourceChecks: 20,
  }),
);
