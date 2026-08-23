import assert from "node:assert/strict";
import test from "node:test";
import { renderTransactionalEmail } from "../src/lib/mail/transactional-email";

test("transactional email renders the commercial layout and fallback URL", () => {
  const html = renderTransactionalEmail({
    preheader: "手続きのご案内",
    eyebrow: "お客様アプリ",
    title: "登録手続きを完了してください",
    lead: "登録手続きを受け付けました。",
    details: [{ label: "有効期限", value: "30分" }],
    actionLabel: "登録手続きを続ける",
    actionUrl: "https://salon-de-lien.com/u/register/example?from=mail&step=1",
    notice: "URLには有効期限があります。",
    securityMessage: "心当たりがない場合は削除してください。"
  });

  assert.match(html, /max-width:600px/);
  assert.match(html, /background:#f7f3ef/);
  assert.match(html, /登録手続きを続ける/);
  assert.match(html, /ボタンを押せない場合/);
  assert.match(html, /from=mail&amp;step=1/);
});

test("transactional email escapes recipient-controlled values", () => {
  const html = renderTransactionalEmail({
    preheader: "確認",
    eyebrow: "お客様アプリ",
    title: "退会手続きの確認",
    greeting: '<script>alert("name")</script> 様',
    lead: "内容をご確認ください。",
    actionLabel: "確認する",
    actionUrl: 'https://example.com/?next="><script>alert(1)</script>',
    notice: "確認画面を開いただけでは完了しません。",
    securityMessage: "心当たりがない場合は削除してください。"
  });

  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /&quot;&gt;&lt;script&gt;/);
});
