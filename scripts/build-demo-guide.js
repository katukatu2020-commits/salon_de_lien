const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const sharp = require("sharp");

const ROOT = process.cwd();
const DEMO_DIR = path.join(ROOT, "docs", "demo");
const SCREENSHOT_DIR = path.join(DEMO_DIR, "screenshots");
const MANIFEST_PATH = path.join(DEMO_DIR, "screenshot_manifest.json");
const HTML_PATH = path.join(DEMO_DIR, "salon_de_lien_real_screen_operation_guide.html");
const PDF_PATH = path.join(DEMO_DIR, "salon_de_lien_real_screen_operation_guide.pdf");
const SCRIPT_PATH = path.join(DEMO_DIR, "salon_de_lien_demo_script.md");
const ROUTES_PATH = path.join(DEMO_DIR, "screenshot_routes.md");
const DEMO_DATA_PATH = path.join(DEMO_DIR, "demo-data.json");

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
].filter(Boolean);

function findChrome() {
  const chrome = CHROME_CANDIDATES.find((candidate) => fs.existsSync(candidate));
  if (!chrome) {
    throw new Error("Chrome または Edge が見つかりません。CHROME_PATH を指定してください。");
  }
  return chrome;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function xml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function rel(file) {
  return `screenshots/${file}`;
}

function shot(manifest, id) {
  const item = manifest.screenshots.find((screenshot) => screenshot.id === id);
  if (!item) {
    throw new Error(`スクリーンショットが見つかりません: ${id}`);
  }
  return item;
}

function page({
  no,
  chapter,
  title,
  screenshot,
  secondScreenshot,
  imageMode = "desktop",
  steps,
  talk,
  data,
  next,
  note,
  callouts = []
}) {
  const imageClass = imageMode === "mobile" ? "phone" : imageMode === "wide" ? "shot wide" : "shot";
  const imageBlock = screenshot
    ? `<div class="screen ${imageMode === "mobile" ? "screen-phone" : ""}">
        <img class="${imageClass}" src="${esc(rel(screenshot.file))}" alt="${esc(screenshot.title)}" />
        ${callouts
          .map(
            (callout, index) =>
              `<span class="callout" style="left:${callout.x}%;top:${callout.y}%">${index + 1}</span>`
          )
          .join("")}
      </div>`
    : "";
  const secondBlock = secondScreenshot
    ? `<div class="screen compact">
        <img class="${secondScreenshot.width < 600 ? "phone" : "shot"}" src="${esc(rel(secondScreenshot.file))}" alt="${esc(secondScreenshot.title)}" />
      </div>`
    : "";

  return `<section class="slide">
    <div class="slide-head">
      <div>
        <p class="eyebrow">${esc(chapter)}</p>
        <h1>${esc(title)}</h1>
      </div>
      <span class="page-no">${no}</span>
    </div>
    <div class="slide-grid ${secondScreenshot ? "two-shot" : ""}">
      <div class="visual-stack">${imageBlock}${secondBlock}</div>
      <aside class="story-panel">
        <div class="story-section">
          <h2>操作手順</h2>
          <ol>${steps.map((step) => `<li>${esc(step)}</li>`).join("")}</ol>
        </div>
        <div class="story-section talk">
          <h2>接客トーク例</h2>
          <p>${esc(talk)}</p>
        </div>
        <div class="story-section">
          <h2>この操作で残るデータ</h2>
          <p>${esc(data)}</p>
        </div>
        <div class="story-section next">
          <h2>次につながること</h2>
          <p>${esc(next)}</p>
        </div>
        ${note ? `<p class="note">${esc(note)}</p>` : ""}
      </aside>
    </div>
  </section>`;
}

function cover(manifest) {
  const customers = shot(manifest, "admin-customers-desktop");
  return `<section class="slide cover">
    <div class="cover-copy">
      <p class="eyebrow">ORIMIA 操作説明資料</p>
      <h1>実機画面で見る ORIMIA の使い方</h1>
      <p>既存客の再来店・店販・レビュー・紹介を、接客の流れに組み込む操作デモ</p>
      <div class="cover-meta">
        <span>対象: オーナー・スタッフ向け</span>
        <span>HTML + PDF版</span>
      </div>
    </div>
    <div class="cover-shot">
      <img src="${esc(rel(customers.file))}" alt="管理画面" />
    </div>
    <span class="page-no">1</span>
  </section>`;
}

function overview() {
  const steps = ["受付", "カウンセリング", "施術", "商品提案", "会計", "レビュー", "ポイント", "紹介", "レポート", "メーカー集計"];
  return `<section class="slide overview">
    <div class="slide-head">
      <div>
        <p class="eyebrow">全体像</p>
        <h1>この資料で見る接客の流れ</h1>
      </div>
      <span class="page-no">2</span>
    </div>
    <div class="overview-body">
      <div class="overview-copy">
        <p>参照PDFで説明した「既存客を動かす美容室CRM」を、実際の接客画面でどう操作するかに落とし込みます。</p>
        <p>顧客詳細を起点に、商品提案、レビュー依頼、ポイント、クーポン、紹介、レポートまでを一連の流れとして確認します。</p>
      </div>
      <div class="flow">
        ${steps.map((step, index) => `<div class="flow-item"><span>${index + 1}</span><strong>${esc(step)}</strong></div>`).join("")}
      </div>
    </div>
  </section>`;
}

function slides(manifest) {
  const s = (id) => shot(manifest, id);
  return [
    cover(manifest),
    overview(),
    page({
      no: 3,
      chapter: "朝",
      title: "今日のCRM視点を見る",
      screenshot: s("admin-customers-desktop"),
      steps: ["管理画面を開く", "今日のCRM視点を見る", "再来店候補・レビュー未回答・ポイント失効間近を確認する", "山田 美咲さんを選ぶ"],
      talk: "今日は山田さんが来店予定。前回カラー後のパサつきが気になっていたので、商品感想と次回ケアを確認します。",
      data: "顧客一覧、未対応アクション、来店予定、ポイント、商品提案状況。",
      next: "優先して声をかける既存客を決め、顧客詳細へ進みます。",
      callouts: [{ x: 17, y: 20 }, { x: 36, y: 35 }, { x: 72, y: 58 }]
    }),
    page({
      no: 4,
      chapter: "受付",
      title: "顧客検索からカルテを開く",
      screenshot: s("customer-search-desktop"),
      steps: ["検索欄に「山田」と入力", "顧客一覧から山田 美咲さんを選択", "顧客詳細を開く"],
      talk: "山田さん、前回から1か月半くらいですね。前回の内容を確認しながら今日のご提案をしますね。",
      data: "検索条件、顧客プロフィール、来店候補の確認。",
      next: "来店前の状態把握とカウンセリングへ進みます。",
      callouts: [{ x: 37, y: 13 }, { x: 24, y: 55 }]
    }),
    page({
      no: 5,
      chapter: "顧客詳細",
      title: "次に何をするかを見る",
      screenshot: s("customer-detail-desktop"),
      steps: ["最終来店日を見る", "保有ポイントを見る", "前回メニューを見る", "未対応アクションを見る", "おすすめアクションを確認する"],
      talk: "山田さんは前回カラーとトリートメント。今日は仕上がり確認と、乾燥対策のホームケアを提案します。",
      data: "顧客プロフィール、来店履歴、ポイント口座、次アクション候補。",
      next: "写真・履歴・メニューを見ながら接客内容を決めます。"
    }),
    page({
      no: 6,
      chapter: "カウンセリング",
      title: "写真・履歴・メニューを見ながら接客する",
      screenshot: s("customer-detail-desktop"),
      steps: ["写真タブを開く", "前回仕上がりを見る", "履歴タブで悩みを確認", "今回メニューを提案する"],
      talk: "前回より毛先に少し乾燥が出ているので、今日はまとまりを重視して整えますね。",
      data: "写真、前回来店、悩み、施術メモ、次回提案理由。",
      next: "今日のメニュー提案を記録します。"
    }),
    page({
      no: 7,
      chapter: "施術前",
      title: "メニュー提案を記録する",
      screenshot: s("customer-detail-products-desktop"),
      steps: ["今日のメニューを選ぶ", "提案理由を入力", "次回目安を入力", "保存する"],
      talk: "45日くらいでケアするときれいに保てるので、次回も同じ流れで見ていきましょう。",
      data: "提案メニュー、提案理由、次回目安、スタッフメモ。",
      next: "施術中または仕上げ時の商品提案につながります。"
    }),
    page({
      no: 8,
      chapter: "仕上げ",
      title: "商品提案を記録する",
      screenshot: s("customer-detail-products-desktop"),
      steps: ["商品を選択", "提案理由を入力", "悩みタグを選ぶ", "状態を「サンプルを渡した」にする", "反応を「興味あり」にする", "保存する"],
      talk: "ドライヤー前に毛先中心につけると、広がりが落ち着きやすいです。サンプルをお渡しするので使ってみてください。",
      data: "ProductProposal、商品、悩みタグ、状態、反応、メモ。",
      next: "この商品提案に紐づくレビュー依頼を発行できます。"
    }),
    page({
      no: 9,
      chapter: "レビュー依頼",
      title: "商品レビュー依頼QRを発行する",
      screenshot: s("customer-detail-products-desktop"),
      steps: ["商品提案カードからレビュー依頼を押す", "QRまたはURLを表示", "お客様に案内する", "必要ならURLをコピーする"],
      talk: "使ってみた頃にこのQRから感想を教えてください。回答いただくとポイントも付きます。お名前はメーカーには共有されません。",
      data: "ProductReviewRequest、期限付きトークン、レビュー依頼状況。",
      next: "後日、お客様が商品レビューに回答します。"
    }),
    page({
      no: 10,
      chapter: "会計",
      title: "会計時にポイントを案内する",
      screenshot: s("customer-detail-products-desktop"),
      steps: ["保有ポイントを確認", "利用可能ポイントを確認", "今回使うポイントを入力", "会計時ポイント利用を記録する"],
      talk: "山田さん、今480ポイントあります。今日400ポイント使われますか？",
      data: "PointTransaction、PointLot消費、利用後残高。",
      next: "ポイント利用履歴が台帳に残り、次回接客でも確認できます。"
    }),
    page({
      no: 11,
      chapter: "次回来店",
      title: "次回クーポンを作成する",
      screenshot: s("coupon-new-desktop"),
      secondScreenshot: s("coupon-print-desktop"),
      steps: ["顧客名を確認", "対象メニューを選ぶ", "割引率を設定", "有効期限を設定", "印刷プレビューを確認", "印刷または共有する"],
      talk: "45日くらいでケアするときれいに保てるので、次回トリートメントに使える限定クーポンをお渡ししますね。",
      data: "CouponIssue、識別コード、発行日、有効期限、印刷履歴。",
      next: "次回来店の理由を紙またはお客様ページで渡します。",
      imageMode: "wide"
    }),
    page({
      no: 12,
      chapter: "お客様ページ",
      title: "ホームケア・提案共有を案内する",
      screenshot: s("customer-portal-mobile"),
      imageMode: "mobile",
      steps: ["お客様ページを開く", "ホームケア内容を確認", "提案共有ページを案内", "LINE等で共有する"],
      talk: "今日お話しした乾かし方とサンプルの使い方をまとめています。家で見返せます。",
      data: "お客様ページ、ホームケア、限定クーポン、ポイント表示。",
      next: "お客様が後日、レビューやフィードバックへ進めます。"
    }),
    page({
      no: 13,
      chapter: "後日",
      title: "お客様が商品レビューに回答する",
      screenshot: s("product-review-mobile"),
      imageMode: "mobile",
      steps: ["QRからレビュー画面を開く", "使ったかどうかを選ぶ", "満足度を選ぶ", "良かった点・気になった点を選ぶ", "同意して送信する"],
      talk: "商品名はお客様が選びません。サロン側が記録した商品提案に紐づくため、正確な商品レビューになります。",
      data: "ProductReview、匿名共有同意、商品別の評価・コメント。",
      next: "回答内容はポイント付与とメーカー向け匿名集計へつながります。"
    }),
    page({
      no: 14,
      chapter: "ポイント付与",
      title: "回答でポイントが付く",
      screenshot: s("review-thanks-mobile"),
      imageMode: "mobile",
      steps: ["回答完了", "50pt付与を確認", "お客様トップに戻る", "次回来店時に利用する"],
      talk: "レビュー評価の良し悪しではなく、回答へのお礼としてポイントを付与します。",
      data: "PointTransaction、ProductReview、ProductReviewRequest answered。",
      next: "次回来店時の会計利用や再来店理由になります。"
    }),
    page({
      no: 15,
      chapter: "紹介",
      title: "フィードバック・紹介につなげる",
      screenshot: s("feedback-mobile"),
      secondScreenshot: s("referral-mobile"),
      imageMode: "mobile",
      steps: ["接客後のフィードバックを依頼", "回答で30pt付与", "満足度が高いお客様に紹介コードを案内", "紹介された方の初回来店後に紹介元へポイント付与"],
      talk: "もし周りで美容室を探している方がいたら、この紹介リンクを送っていただけます。",
      data: "ContactLog、Referral、紹介ステータス、紹介ポイント候補。",
      next: "既存客から新規相談が生まれます。"
    }),
    page({
      no: 16,
      chapter: "オーナー",
      title: "販促CRMレポートを見る",
      screenshot: s("offers-report-desktop"),
      steps: ["レポートを開く", "クーポン・レビュー・ポイント・紹介の状況を見る", "未対応タスクを確認する", "次に動かすお客様を決める"],
      talk: "売上だけでなく、既存客施策が回っているかを毎週確認します。",
      data: "クーポン発行数、レビュー回答数、ポイント付与数、紹介成立数、未対応タスク。",
      next: "次に動かす既存客を選び、顧客詳細へ戻ります。"
    }),
    page({
      no: 17,
      chapter: "メーカー集計",
      title: "メーカー向け商品集計を見る",
      screenshot: s("manufacturer-report-desktop"),
      steps: ["メーカーを選ぶ", "期間を選ぶ", "商品別の提案数・レビュー数を見る", "良かった点・気になった点を見る", "匿名コメントを確認する"],
      talk: "顧客個人情報を出さず、美容室現場の商品反応をメーカーに返せます。",
      data: "商品別の匿名・集計データ。顧客名、電話番号、メール、customerId、スタッフ名、来店日時の個票は出ません。",
      next: "商品改善やメーカー連携の提案材料になります。"
    }),
    `<section class="slide summary">
      <div class="slide-head">
        <div>
          <p class="eyebrow">まとめ</p>
          <h1>ORIMIA は、接客の流れの中で既存客を動かす</h1>
        </div>
        <span class="page-no">18</span>
      </div>
      <div class="summary-grid">
        ${[
          "顧客詳細で状態を把握",
          "商品提案で店販につなげる",
          "レビュー依頼で声を集める",
          "ポイントで再来店の理由を作る",
          "クーポンで次回予約につなげる",
          "紹介で新規客を生む",
          "レポートで未対応を見える化",
          "メーカー集計で商品反応を収益化"
        ]
          .map((item, index) => `<div class="summary-card"><span>${index + 1}</span><strong>${esc(item)}</strong></div>`)
          .join("")}
      </div>
      <p class="closing">顧客を登録するシステムではなく、既存客との関係を動かすCRMです。</p>
    </section>`
  ];
}

function html(manifest) {
  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>実機画面で見る ORIMIA の使い方</title>
  <style>
    @page { size: 16in 9in; margin: 0; }
    :root {
      --bg: #FBF7F0;
      --surface: #FFFFFF;
      --soft: #F6EFE6;
      --ink: #2F2A25;
      --muted: #7C7168;
      --primary: #8F4F42;
      --primary-dark: #5B332C;
      --accent: #D8B56D;
      --sage: #8AA58A;
      --border: #E8DED2;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--ink);
      font-family: "Noto Sans JP", "Yu Gothic UI", system-ui, sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    .slide {
      position: relative;
      width: 1440px;
      height: 810px;
      overflow: hidden;
      padding: 42px 46px;
      page-break-after: always;
      background:
        radial-gradient(circle at 90% 8%, rgba(216,181,109,.22), transparent 220px),
        linear-gradient(135deg, #FBF7F0 0%, #F7EFE6 100%);
    }
    .slide::after {
      content: "";
      position: absolute;
      inset: 22px;
      border: 1px solid rgba(143,79,66,.18);
      border-radius: 28px;
      pointer-events: none;
    }
    .slide-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 24px;
      margin-bottom: 24px;
    }
    .eyebrow {
      margin: 0 0 8px;
      color: var(--primary);
      font-size: 17px;
      font-weight: 700;
      letter-spacing: .03em;
    }
    h1 {
      margin: 0;
      color: var(--ink);
      font-size: 36px;
      line-height: 1.22;
      letter-spacing: .01em;
    }
    .page-no {
      display: grid;
      place-items: center;
      width: 46px;
      height: 46px;
      border-radius: 999px;
      background: var(--primary);
      color: white;
      font-size: 18px;
      font-weight: 700;
      z-index: 2;
    }
    .slide-grid {
      display: grid;
      grid-template-columns: minmax(0, 1.12fr) 420px;
      gap: 26px;
      height: 650px;
    }
    .visual-stack {
      display: grid;
      min-width: 0;
      gap: 16px;
    }
    .two-shot .visual-stack {
      grid-template-columns: 1fr 1fr;
    }
    .screen {
      position: relative;
      display: grid;
      place-items: center;
      min-width: 0;
      height: 100%;
      overflow: hidden;
      border: 1px solid var(--border);
      border-radius: 28px;
      background: white;
      box-shadow: 0 18px 50px rgba(47,42,37,.10);
    }
    .screen.compact {
      height: 100%;
    }
    .screen-phone {
      width: 390px;
      justify-self: center;
      border-radius: 34px;
    }
    .shot {
      width: 100%;
      height: 100%;
      object-fit: contain;
      object-position: top center;
      background: white;
    }
    .shot.wide {
      object-fit: contain;
    }
    .phone {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: top center;
    }
    .story-panel {
      display: grid;
      gap: 12px;
      align-content: start;
      min-width: 0;
      height: 100%;
      padding: 20px;
      border: 1px solid var(--border);
      border-radius: 28px;
      background: rgba(255,255,255,.92);
      box-shadow: 0 14px 36px rgba(47,42,37,.08);
    }
    .story-section {
      padding-bottom: 10px;
      border-bottom: 1px solid var(--border);
    }
    .story-section:last-child {
      border-bottom: none;
    }
    .story-section h2 {
      margin: 0 0 8px;
      color: var(--primary-dark);
      font-size: 16px;
      line-height: 1.3;
    }
    ol {
      margin: 0;
      padding-left: 22px;
      font-size: 14px;
      line-height: 1.62;
    }
    .story-section p,
    .note {
      margin: 0;
      font-size: 14px;
      line-height: 1.7;
      color: var(--muted);
    }
    .talk {
      padding: 13px;
      border: 1px solid rgba(143,79,66,.18);
      border-radius: 18px;
      background: #fff7f3;
    }
    .next {
      padding: 13px;
      border: 1px solid rgba(138,165,138,.35);
      border-radius: 18px;
      background: #f1f7ef;
    }
    .callout {
      position: absolute;
      z-index: 4;
      display: grid;
      place-items: center;
      width: 34px;
      height: 34px;
      border-radius: 999px;
      background: var(--primary);
      color: white;
      font-weight: 700;
      box-shadow: 0 10px 24px rgba(143,79,66,.28);
    }
    .cover {
      display: grid;
      grid-template-columns: .78fr 1fr;
      gap: 42px;
      align-items: center;
      padding: 60px;
    }
    .cover h1 {
      font-size: 58px;
      line-height: 1.14;
    }
    .cover-copy p:not(.eyebrow) {
      margin: 20px 0 0;
      color: var(--muted);
      font-size: 22px;
      line-height: 1.7;
    }
    .cover-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-top: 32px;
    }
    .cover-meta span {
      border: 1px solid var(--border);
      border-radius: 999px;
      background: white;
      padding: 10px 16px;
      font-size: 15px;
      font-weight: 700;
      color: var(--primary-dark);
    }
    .cover-shot {
      overflow: hidden;
      border: 1px solid var(--border);
      border-radius: 34px;
      background: white;
      box-shadow: 0 20px 60px rgba(47,42,37,.14);
    }
    .cover-shot img {
      display: block;
      width: 100%;
    }
    .overview-body {
      display: grid;
      grid-template-columns: 440px 1fr;
      gap: 34px;
      align-items: start;
    }
    .overview-copy {
      border: 1px solid var(--border);
      border-radius: 28px;
      background: white;
      padding: 30px;
      box-shadow: 0 14px 40px rgba(47,42,37,.08);
    }
    .overview-copy p {
      margin: 0 0 18px;
      color: var(--muted);
      font-size: 22px;
      line-height: 1.72;
    }
    .flow {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 14px;
    }
    .flow-item, .summary-card {
      display: flex;
      align-items: center;
      gap: 14px;
      min-height: 72px;
      border: 1px solid var(--border);
      border-radius: 22px;
      background: white;
      padding: 16px;
      box-shadow: 0 10px 28px rgba(47,42,37,.07);
    }
    .flow-item span, .summary-card span {
      display: grid;
      place-items: center;
      width: 38px;
      height: 38px;
      border-radius: 999px;
      background: var(--primary);
      color: white;
      font-weight: 700;
    }
    .flow-item strong, .summary-card strong {
      font-size: 20px;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 18px;
      margin-top: 44px;
    }
    .summary-card {
      min-height: 120px;
      flex-direction: column;
      align-items: flex-start;
      justify-content: center;
    }
    .closing {
      position: absolute;
      left: 70px;
      right: 70px;
      bottom: 72px;
      margin: 0;
      border-radius: 30px;
      background: linear-gradient(135deg, var(--primary), var(--primary-dark));
      color: white;
      padding: 22px 28px;
      font-size: 28px;
      font-weight: 700;
      text-align: center;
    }
    @media print {
      body { background: white; }
      .slide { break-after: page; }
    }
  </style>
</head>
<body>
  ${slides(manifest).join("\n")}
</body>
</html>`;
}

function buildScriptMarkdown() {
  const chapters = [
    ["3. 朝: 今日のCRM視点を見る", "/admin/customers", "今日のCRM視点から山田 美咲さんを選択。", "ここでは、今日スタッフが動くべき既存客が分かります。レビュー未回答、ポイント失効間近、商品提案後フォローなどを見ます。", "山田さんは前回カラー後のパサつきが気になるとおっしゃっていたので、今日は仕上がり確認と商品感想を聞きます。", "顧客詳細へ進む。"],
    ["4. 受付: 顧客検索からカルテを開く", "/admin/customers?q=山田", "検索欄に山田と入力し、顧客詳細を開く。", "顧客名でカルテを素早く開きます。", "山田さん、前回から1か月半くらいですね。前回の内容を確認しながら今日のご提案をしますね。", "顧客詳細へ進む。"],
    ["5. 顧客詳細: 次に何をするかを見る", "/admin/customers/[customerId]", "最終来店、保有ポイント、未対応アクションを確認。", "顧客詳細は情報を見るだけでなく、次の接客アクションを決める画面です。", "今日は仕上がり確認と、乾燥対策のホームケアを提案します。", "写真・履歴・メニュー確認へ進む。"],
    ["6. 写真・履歴: 前回の状態を見ながら接客する", "/admin/customers/[customerId]", "前回写真、履歴、悩み、施術内容を確認。", "前回の仕上がりと悩みを見ながら、今回の提案理由を明確にします。", "前回より毛先に少し乾燥が出ているので、今日はまとまりを重視して整えますね。", "メニュー提案を記録する。"],
    ["7. メニュー提案を記録する", "/admin/customers/[customerId]", "今日のメニュー、提案理由、次回目安を保存。", "なぜそのメニューを提案したかを残すことで、次回の接客につながります。", "45日くらいでケアするときれいに保てます。", "商品提案を記録する。"],
    ["8. 商品提案を記録する", "/admin/customers/[customerId]", "商品、提案理由、悩みタグ、状態、反応を保存。", "商品提案はレビュー依頼の起点です。お客様に商品名を自由入力させません。", "サンプルをお渡しするので、ドライヤー前に毛先中心で使ってみてください。", "レビュー依頼QRを発行する。"],
    ["9. レビュー依頼QRを発行する", "/admin/customers/[customerId]", "商品提案カードからレビュー依頼URLを発行。", "期限付きトークンで、商品提案に紐づくレビューだけを受け付けます。", "使ってみた頃にこのQRから感想を教えてください。お名前はメーカーには共有されません。", "会計時のポイント案内へ進む。"],
    ["10. 会計時にポイントを案内する", "/admin/customers/[customerId]", "保有ポイントを確認し、利用ポイントを記録。", "ポイントは台帳に残り、1pt=1円として会計時に使えます。", "今480ポイントあります。今日400ポイント使われますか？", "次回クーポン作成へ進む。"],
    ["11. 次回クーポンを作成する", "/admin/customers/[customerId]/coupons/new", "割引率、対象メニュー、有効期限を入力し、印刷プレビューを見る。", "識別コード付きで、散髪後に紙で渡せる次回来店の理由を作ります。", "次回トリートメントに使える限定クーポンをお渡ししますね。", "お客様ページを案内する。"],
    ["12. ホームケア・提案共有を案内する", "/u/[token]", "お客様ページ、ホームケア、クーポン、ポイントを見せる。", "接客で話した内容をお客様があとから見返せます。", "今日お話しした乾かし方とサンプルの使い方をまとめています。", "後日のレビュー回答へつなげる。"],
    ["13. お客様が商品レビューに回答する", "/u/[token]/review/product/[reviewToken]", "商品レビュー画面で使用状況、満足度、良かった点を入力。", "商品はサロン側の提案に紐づくため、商品選択ミスが起きません。", "使ってみた感想だけ教えてください。", "回答後ポイント付与へ進む。"],
    ["14. 回答でポイントが付く", "/u/[token]?reviewPoints=50", "回答後、お客様トップで50pt付与を確認。", "評価の良し悪しではなく、回答へのお礼としてポイントを付与します。", "ポイントは次回会計時にご利用いただけます。", "フィードバック・紹介へつなげる。"],
    ["15. フィードバック・紹介につなげる", "/u/[token]/feedback / /referral/[code]", "施術後アンケートと紹介コードを案内。", "満足度が高いお客様から、次回予約や紹介につながる流れを作ります。", "周りで美容室を探している方がいたら、この紹介リンクを送っていただけます。", "オーナー向けレポートへ進む。"],
    ["16. 販促CRMレポートを見る", "/admin/reports/offers", "クーポン、レビュー、ポイント、紹介、未対応タスクを確認。", "オーナーは既存客施策が回っているかを確認できます。", "今週はレビュー未回答とポイント失効予定のお客様を先に動かします。", "メーカー向け集計へ進む。"],
    ["17. メーカー向け商品集計を見る", "/admin/reports/manufacturer-products", "メーカー、期間を選び、商品別集計を見る。", "顧客個人情報を出さず、現場の商品反応をメーカーに返せます。", "この商品は手触り評価が高く、価格面の声が出ています。", "全体の流れをまとめる。"],
    ["18. まとめ: 既存客との関係を動かす", "資料まとめページ", "顧客詳細、商品提案、レビュー、ポイント、クーポン、紹介、レポートの一連の流れを振り返る。", "ORIMIAは顧客を登録するだけでなく、既存客の再来店・店販・レビュー・紹介が回る状態を見える化します。", "顧客を登録するシステムではなく、既存客との関係を動かすCRMです。", "必要に応じて実機デモに戻る。"]
  ];

  return `# ORIMIA 操作デモ台本\n\n対象: オーナー・スタッフ向け\n\n${chapters
    .map(
      ([title, route, operation, explanation, talk, next]) => `## ${title}\n\n見せる画面:\n${route}\n\n操作:\n${operation}\n\n説明トーク:\n${explanation}\n\n接客トーク:\n${talk}\n\n次の画面:\n${next}\n`
    )
    .join("\n")}`;
}

function buildRoutesMarkdown(manifest) {
  const demoData = readJson(DEMO_DATA_PATH);
  const currentUrl = (item) => {
    if (item.id === "product-review-mobile") {
      return `${manifest.baseUrl}/u/${demoData.customerId}/review/product/${demoData.productReviewToken}`;
    }
    if (item.id === "review-thanks-mobile") {
      return `${manifest.baseUrl}/u/${demoData.customerId}?reviewPoints=50`;
    }
    return item.url;
  };
  return `# スクリーンショット撮影ルート一覧\n\nBASE_URL: ${manifest.baseUrl}\n\n| No | 画面 | URL | viewport | 目的 |\n|---:|---|---|---|---|\n${manifest.screenshots
    .map((item, index) => `| ${index + 1} | ${item.title} | ${currentUrl(item)} | ${item.width}x${item.height} | ${item.purpose} |`)
    .join("\n")}\n`;
}

function wrapText(text, maxChars, maxLines = 8) {
  const source = String(text ?? "");
  const lines = [];
  let current = "";
  for (const char of source) {
    if (char === "\n" || current.length >= maxChars) {
      lines.push(current);
      current = char === "\n" ? "" : char;
      if (lines.length >= maxLines) break;
    } else {
      current += char;
    }
  }
  if (current && lines.length < maxLines) lines.push(current);
  return lines.length ? lines : [""];
}

function svgText(lines, x, y, options = {}) {
  const {
    size = 24,
    weight = 500,
    fill = "#2F2A25",
    lineHeight = 1.45,
    anchor = "start",
    family = "Noto Sans JP, Yu Gothic UI, Arial, sans-serif"
  } = options;
  return `<text x="${x}" y="${y}" font-family="${family}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}">
    ${lines
      .map((line, index) => `<tspan x="${x}" dy="${index === 0 ? 0 : size * lineHeight}">${xml(line)}</tspan>`)
      .join("")}
  </text>`;
}

function imageDataUri(file) {
  const bytes = fs.readFileSync(path.join(SCREENSHOT_DIR, file));
  return `data:image/png;base64,${bytes.toString("base64")}`;
}

function fitImageTag(file, x, y, w, h, mode = "contain") {
  return `<clipPath id="clip-${file.replace(/[^a-zA-Z0-9]/g, "")}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="28"/></clipPath>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="28" fill="#fff" stroke="#E8DED2"/>`;
}

function pdfSpecs(manifest) {
  const s = (id) => shot(manifest, id);
  const shared = [
    {
      no: 3,
      chapter: "朝",
      title: "今日のCRM視点を見る",
      shots: [s("admin-customers-desktop")],
      steps: ["管理画面を開く", "今日のCRM視点を見る", "未対応を確認", "山田 美咲さんを選ぶ"],
      talk: "今日は山田さんが来店予定。商品感想と次回ケアを確認します。",
      data: "顧客一覧、未対応アクション、来店予定。",
      next: "顧客詳細へ進む。"
    },
    {
      no: 4,
      chapter: "受付",
      title: "顧客検索からカルテを開く",
      shots: [s("customer-search-desktop")],
      steps: ["検索欄に山田と入力", "検索結果を確認", "顧客詳細を開く"],
      talk: "前回の内容を確認しながら今日のご提案をしますね。",
      data: "検索条件、顧客プロフィール。",
      next: "接客前の状態把握へ。"
    },
    {
      no: 5,
      chapter: "顧客詳細",
      title: "次に何をするかを見る",
      shots: [s("customer-detail-desktop")],
      steps: ["最終来店を見る", "ポイントを見る", "前回メニューを見る", "未対応を見る"],
      talk: "今日は乾燥対策のホームケアを提案します。",
      data: "来店履歴、ポイント、次アクション。",
      next: "写真・履歴確認へ。"
    },
    {
      no: 6,
      chapter: "カウンセリング",
      title: "写真・履歴・メニューを見ながら接客する",
      shots: [s("customer-detail-desktop")],
      steps: ["写真を確認", "前回履歴を見る", "悩みを確認", "今回メニューを提案"],
      talk: "毛先の乾燥が出ているので、まとまり重視で整えます。",
      data: "写真、履歴、施術メモ。",
      next: "メニュー提案を記録。"
    },
    {
      no: 7,
      chapter: "施術前",
      title: "メニュー提案を記録する",
      shots: [s("customer-detail-products-desktop")],
      steps: ["メニューを選ぶ", "提案理由を入力", "次回目安を入力", "保存"],
      talk: "45日くらいでケアするときれいに保てます。",
      data: "提案メニュー、理由、次回目安。",
      next: "商品提案へ。"
    },
    {
      no: 8,
      chapter: "仕上げ",
      title: "商品提案を記録する",
      shots: [s("customer-detail-products-desktop")],
      steps: ["商品を選択", "悩みタグを選ぶ", "サンプルを渡したにする", "興味ありで保存"],
      talk: "毛先中心につけると、広がりが落ち着きやすいです。",
      data: "ProductProposal、状態、反応。",
      next: "レビュー依頼へ。"
    },
    {
      no: 9,
      chapter: "レビュー依頼",
      title: "商品レビュー依頼QRを発行する",
      shots: [s("customer-detail-products-desktop")],
      steps: ["商品提案カードを確認", "レビュー依頼を押す", "URL/QRを案内", "期限を確認"],
      talk: "感想は個人が分からない形で商品改善に活用されます。",
      data: "期限付きレビュー依頼トークン。",
      next: "会計時ポイント案内へ。"
    },
    {
      no: 10,
      chapter: "会計",
      title: "会計時にポイントを案内する",
      shots: [s("customer-detail-products-desktop")],
      steps: ["保有ポイントを確認", "利用ポイントを入力", "会計利用を記録"],
      talk: "今480ポイントあります。今日400ポイント使われますか？",
      data: "PointTransaction、利用後残高。",
      next: "次回クーポンへ。"
    },
    {
      no: 11,
      chapter: "次回来店",
      title: "次回クーポンを作成する",
      shots: [s("coupon-new-desktop"), s("coupon-print-desktop")],
      steps: ["割引率を設定", "対象メニューを選択", "期限を設定", "印刷プレビュー確認"],
      talk: "次回トリートメントに使える限定クーポンをお渡しします。",
      data: "CouponIssue、識別コード、印刷履歴。",
      next: "お客様ページを案内。"
    },
    {
      no: 12,
      chapter: "お客様ページ",
      title: "ホームケア・提案共有を案内する",
      shots: [s("customer-portal-mobile")],
      steps: ["お客様ページを開く", "ホームケアを見る", "クーポンを確認", "LINE等で共有"],
      talk: "家で見返せるようにまとめています。",
      data: "ホームケア、クーポン、ポイント。",
      next: "後日のレビューへ。"
    },
    {
      no: 13,
      chapter: "後日",
      title: "お客様が商品レビューに回答する",
      shots: [s("product-review-mobile")],
      steps: ["QRから開く", "使用状況を選ぶ", "満足度を選ぶ", "同意して送信"],
      talk: "商品名を選ばず、提案商品に紐づいて回答します。",
      data: "ProductReview、匿名同意。",
      next: "ポイント付与へ。"
    },
    {
      no: 14,
      chapter: "ポイント付与",
      title: "回答でポイントが付く",
      shots: [s("review-thanks-mobile")],
      steps: ["回答完了", "50pt付与を確認", "お客様トップへ戻る"],
      talk: "回答へのお礼としてポイントを付与します。",
      data: "PointTransaction、レビュー回答済み。",
      next: "再来店理由になる。"
    },
    {
      no: 15,
      chapter: "紹介",
      title: "フィードバック・紹介につなげる",
      shots: [s("feedback-mobile"), s("referral-mobile")],
      steps: ["フィードバックを依頼", "30pt付与", "紹介コードを案内", "初回来店後に紹介ポイント"],
      talk: "美容室を探している方に、この紹介リンクを送っていただけます。",
      data: "ContactLog、Referral。",
      next: "新規相談につながる。"
    },
    {
      no: 16,
      chapter: "オーナー",
      title: "販促CRMレポートを見る",
      shots: [s("offers-report-desktop")],
      steps: ["レポートを開く", "施策状況を見る", "未対応タスクを確認", "次に動かす顧客を決める"],
      talk: "既存客施策が回っているかを確認します。",
      data: "クーポン、レビュー、ポイント、紹介。",
      next: "施策改善へ。"
    },
    {
      no: 17,
      chapter: "メーカー集計",
      title: "メーカー向け商品集計を見る",
      shots: [s("manufacturer-report-desktop")],
      steps: ["メーカーを選ぶ", "期間を選ぶ", "商品別集計を見る", "匿名コメントを確認"],
      talk: "個人情報を出さず、商品反応をメーカーに返せます。",
      data: "匿名・商品別集計。",
      next: "商品改善や連携提案へ。"
    }
  ];
  return shared;
}

function renderStandardSvg(spec) {
  const primaryShot = spec.shots[0];
  const secondShot = spec.shots[1];
  const imageW = secondShot ? 390 : 810;
  const imageH = 560;
  const imageY = 170;
  const sideX = 930;
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1440" height="810" viewBox="0 0 1440 810">
    <rect width="1440" height="810" fill="#FBF7F0"/>
    <circle cx="1280" cy="20" r="230" fill="#F4E7C7" opacity=".55"/>
    <rect x="24" y="24" width="1392" height="762" rx="30" fill="none" stroke="#E8DED2"/>
    <circle cx="1338" cy="62" r="25" fill="#8F4F42"/>
    ${svgText([String(spec.no)], 1338, 71, { size: 22, fill: "#fff", weight: 700, anchor: "middle" })}
    ${svgText([spec.chapter], 58, 72, { size: 18, fill: "#8F4F42", weight: 700 })}
    ${svgText(wrapText(spec.title, 28, 2), 58, 118, { size: 37, fill: "#2F2A25", weight: 700, lineHeight: 1.22 })}
    <g>
      ${fitImageTag(primaryShot.file, 58, imageY, imageW, imageH, "cover")}
      ${secondShot ? fitImageTag(secondShot.file, 482, imageY, imageW, imageH, "cover") : ""}
    </g>
    <rect x="${sideX}" y="${imageY}" width="440" height="${imageH}" rx="28" fill="#FFFFFF" stroke="#E8DED2"/>
    ${svgText(["操作手順"], sideX + 28, imageY + 44, { size: 18, fill: "#5B332C", weight: 700 })}
    ${spec.steps
      .map((step, index) => {
        const y = imageY + 82 + index * 34;
        return `<circle cx="${sideX + 34}" cy="${y - 7}" r="13" fill="#8F4F42"/>${svgText([String(index + 1)], sideX + 34, y - 1, { size: 13, fill: "#fff", weight: 700, anchor: "middle" })}${svgText(wrapText(step, 24, 2), sideX + 56, y, { size: 15, fill: "#2F2A25", weight: 500, lineHeight: 1.22 })}`;
      })
      .join("")}
    <rect x="${sideX + 22}" y="${imageY + 300}" width="396" height="88" rx="18" fill="#FFF7F3" stroke="#E9C9BE"/>
    ${svgText(["接客トーク例"], sideX + 42, imageY + 328, { size: 16, fill: "#5B332C", weight: 700 })}
    ${svgText(wrapText(spec.talk, 28, 2), sideX + 42, imageY + 354, { size: 14, fill: "#7C7168", weight: 500, lineHeight: 1.35 })}
    <rect x="${sideX + 22}" y="${imageY + 404}" width="396" height="62" rx="18" fill="#F6EFE6" stroke="#E8DED2"/>
    ${svgText(["残るデータ"], sideX + 42, imageY + 430, { size: 15, fill: "#5B332C", weight: 700 })}
    ${svgText(wrapText(spec.data, 31, 1), sideX + 42, imageY + 454, { size: 13, fill: "#7C7168", weight: 500 })}
    <rect x="${sideX + 22}" y="${imageY + 482}" width="396" height="56" rx="18" fill="#F1F7EF" stroke="#C8D9C6"/>
    ${svgText(["次につながること"], sideX + 42, imageY + 506, { size: 15, fill: "#405D41", weight: 700 })}
    ${svgText(wrapText(spec.next, 31, 1), sideX + 42, imageY + 530, { size: 13, fill: "#5F735E", weight: 500 })}
  </svg>`;
}

function renderCoverSvg(manifest) {
  const screenshot = shot(manifest, "admin-customers-desktop");
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1440" height="810" viewBox="0 0 1440 810">
    <rect width="1440" height="810" fill="#FBF7F0"/>
    <circle cx="1160" cy="60" r="260" fill="#F4E7C7" opacity=".7"/>
    <rect x="40" y="40" width="1360" height="730" rx="34" fill="none" stroke="#E8DED2"/>
    ${svgText(["ORIMIA 操作説明資料"], 76, 108, { size: 22, fill: "#8F4F42", weight: 700 })}
    ${svgText(["実機画面で見る", "ORIMIA の使い方"], 76, 190, { size: 48, fill: "#2F2A25", weight: 700, lineHeight: 1.2 })}
    ${svgText(["既存客の再来店・店販・レビュー・紹介を、", "接客の流れに組み込む操作デモ"], 76, 420, { size: 25, fill: "#7C7168", weight: 500, lineHeight: 1.5 })}
    <rect x="76" y="590" width="250" height="46" rx="23" fill="#fff" stroke="#E8DED2"/>
    ${svgText(["対象: オーナー・スタッフ向け"], 100, 620, { size: 16, fill: "#5B332C", weight: 700 })}
    ${fitImageTag(screenshot.file, 750, 120, 580, 520, "cover")}
    <circle cx="1338" cy="62" r="25" fill="#8F4F42"/>
    ${svgText(["1"], 1338, 71, { size: 22, fill: "#fff", weight: 700, anchor: "middle" })}
  </svg>`;
}

function renderOverviewSvg() {
  const flow = ["受付", "カウンセリング", "施術", "商品提案", "会計", "レビュー", "ポイント", "紹介", "レポート", "メーカー集計"];
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1440" height="810" viewBox="0 0 1440 810">
    <rect width="1440" height="810" fill="#FBF7F0"/>
    <rect x="24" y="24" width="1392" height="762" rx="30" fill="none" stroke="#E8DED2"/>
    ${svgText(["全体像"], 58, 72, { size: 18, fill: "#8F4F42", weight: 700 })}
    ${svgText(["この資料で見る接客の流れ"], 58, 124, { size: 42, fill: "#2F2A25", weight: 700 })}
    <rect x="58" y="190" width="420" height="410" rx="28" fill="#fff" stroke="#E8DED2"/>
    ${svgText(wrapText("参照PDFで説明した「既存客を動かす美容室CRM」を、実際の接客画面でどう操作するかに落とし込みます。", 19, 6), 88, 250, { size: 23, fill: "#7C7168", weight: 500, lineHeight: 1.55 })}
    ${flow
      .map((item, index) => {
        const col = index % 2;
        const row = Math.floor(index / 2);
        const x = 540 + col * 380;
        const y = 188 + row * 92;
        return `<rect x="${x}" y="${y}" width="330" height="68" rx="20" fill="#fff" stroke="#E8DED2"/>
          <circle cx="${x + 38}" cy="${y + 34}" r="20" fill="#8F4F42"/>
          ${svgText([String(index + 1)], x + 38, y + 42, { size: 16, fill: "#fff", weight: 700, anchor: "middle" })}
          ${svgText([item], x + 76, y + 42, { size: 24, fill: "#2F2A25", weight: 700 })}`;
      })
      .join("")}
    <circle cx="1338" cy="62" r="25" fill="#8F4F42"/>
    ${svgText(["2"], 1338, 71, { size: 22, fill: "#fff", weight: 700, anchor: "middle" })}
  </svg>`;
}

function renderSummarySvg() {
  const items = ["顧客詳細で状態を把握", "商品提案で店販につなげる", "レビュー依頼で声を集める", "ポイントで再来店の理由を作る", "クーポンで次回予約につなげる", "紹介で新規客を生む", "レポートで未対応を見える化", "メーカー集計で商品反応を収益化"];
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1440" height="810" viewBox="0 0 1440 810">
    <rect width="1440" height="810" fill="#FBF7F0"/>
    <rect x="24" y="24" width="1392" height="762" rx="30" fill="none" stroke="#E8DED2"/>
    ${svgText(["まとめ"], 58, 72, { size: 18, fill: "#8F4F42", weight: 700 })}
    ${svgText(wrapText("ORIMIA は、接客の流れの中で既存客を動かす", 31, 2), 58, 124, { size: 40, fill: "#2F2A25", weight: 700, lineHeight: 1.2 })}
    ${items
      .map((item, index) => {
        const col = index % 4;
        const row = Math.floor(index / 4);
        const x = 70 + col * 330;
        const y = 230 + row * 150;
        return `<rect x="${x}" y="${y}" width="290" height="118" rx="24" fill="#fff" stroke="#E8DED2"/>
          <circle cx="${x + 42}" cy="${y + 44}" r="22" fill="#8F4F42"/>
          ${svgText([String(index + 1)], x + 42, y + 52, { size: 16, fill: "#fff", weight: 700, anchor: "middle" })}
          ${svgText(wrapText(item, 11, 2), x + 28, y + 88, { size: 20, fill: "#2F2A25", weight: 700, lineHeight: 1.2 })}`;
      })
      .join("")}
    <rect x="90" y="638" width="1260" height="68" rx="34" fill="#8F4F42"/>
    ${svgText(["顧客を登録するシステムではなく、既存客との関係を動かすCRMです。"], 720, 681, { size: 28, fill: "#fff", weight: 700, anchor: "middle" })}
    <circle cx="1338" cy="62" r="25" fill="#8F4F42"/>
    ${svgText(["18"], 1338, 71, { size: 22, fill: "#fff", weight: 700, anchor: "middle" })}
  </svg>`;
}

async function renderPdfFromSvg(manifest) {
  const specs = pdfSpecs(manifest);
  const pageDefs = [
    {
      svg: renderCoverSvg(manifest),
      composites: [{ file: shot(manifest, "admin-customers-desktop").file, x: 754, y: 124, w: 572, h: 512 }]
    },
    { svg: renderOverviewSvg(), composites: [] },
    ...specs.map((spec) => {
      const primary = spec.shots[0];
      const second = spec.shots[1];
      const imageW = second ? 382 : 802;
      const imageH = 552;
      const y = 174;
      const composites = [{ file: primary.file, x: 62, y, w: imageW, h: imageH }];
      if (second) {
        composites.push({ file: second.file, x: 486, y, w: imageW, h: imageH });
      }
      return { svg: renderStandardSvg(spec), composites };
    }),
    { svg: renderSummarySvg(), composites: [] }
  ];

  const jpegBuffers = [];
  for (const pageDef of pageDefs) {
    const base = await sharp(Buffer.from(pageDef.svg)).png().toBuffer();
    const overlays = [];
    for (const item of pageDef.composites) {
      const overlay = await sharp(path.join(SCREENSHOT_DIR, item.file))
        .resize(item.w, item.h, {
          fit: "contain",
          position: "top",
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .png()
        .toBuffer();
      overlays.push({ input: overlay, left: item.x, top: item.y });
    }
    const jpeg = await sharp(base).composite(overlays).jpeg({ quality: 88 }).toBuffer();
    jpegBuffers.push(jpeg);
  }
  fs.writeFileSync(PDF_PATH, buildImagePdf(jpegBuffers, 1440, 810));
}

function buildImagePdf(images, width, height) {
  const objects = [];
  const imageRefs = [];
  const contentRefs = [];
  const pageRefs = [];

  function addObject(content) {
    objects.push(Buffer.isBuffer(content) ? content : Buffer.from(content, "binary"));
    return objects.length;
  }

  const pagesRef = addObject("");

  for (const image of images) {
    const imageRef = addObject(`<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.length} >>\nstream\n`);
    objects[imageRef - 1] = Buffer.concat([objects[imageRef - 1], image, Buffer.from("\nendstream")]);
    imageRefs.push(imageRef);
    const content = `q\n${width} 0 0 ${height} 0 0 cm\n/Im${imageRefs.length} Do\nQ`;
    const contentRef = addObject(`<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`);
    contentRefs.push(contentRef);
  }

  for (let index = 0; index < images.length; index += 1) {
    pageRefs.push(
      addObject(
        `<< /Type /Page /Parent ${pagesRef} 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /XObject << /Im${index + 1} ${imageRefs[index]} 0 R >> >> /Contents ${contentRefs[index]} 0 R >>`
      )
    );
  }

  objects[pagesRef - 1] = Buffer.from(
    `<< /Type /Pages /Kids [${pageRefs.map((ref) => `${ref} 0 R`).join(" ")}] /Count ${pageRefs.length} >>`,
    "binary"
  );
  const catalogRef = addObject(`<< /Type /Catalog /Pages ${pagesRef} 0 R >>`);

  const chunks = [Buffer.from("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n", "binary")];
  const offsets = [0];
  for (let index = 0; index < objects.length; index += 1) {
    offsets.push(Buffer.concat(chunks).length);
    chunks.push(Buffer.from(`${index + 1} 0 obj\n`, "binary"));
    chunks.push(objects[index]);
    chunks.push(Buffer.from("\nendobj\n", "binary"));
  }
  const xrefOffset = Buffer.concat(chunks).length;
  chunks.push(Buffer.from(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`, "binary"));
  for (let index = 1; index < offsets.length; index += 1) {
    chunks.push(Buffer.from(`${String(offsets[index]).padStart(10, "0")} 00000 n \n`, "binary"));
  }
  chunks.push(Buffer.from(`trailer\n<< /Size ${objects.length + 1} /Root ${catalogRef} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`, "binary"));
  return Buffer.concat(chunks);
}

async function main() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    throw new Error(`スクリーンショットmanifestがありません: ${MANIFEST_PATH}. 先に npm run capture:demo-screenshots を実行してください。`);
  }
  if (!fs.existsSync(DEMO_DATA_PATH)) {
    throw new Error(`デモデータがありません: ${DEMO_DATA_PATH}`);
  }

  const manifest = readJson(MANIFEST_PATH);

  fs.mkdirSync(DEMO_DIR, { recursive: true });
  fs.writeFileSync(HTML_PATH, html(manifest), "utf8");
  fs.writeFileSync(SCRIPT_PATH, buildScriptMarkdown(), "utf8");
  fs.writeFileSync(ROUTES_PATH, buildRoutesMarkdown(manifest), "utf8");
  await renderPdfFromSvg(manifest);

  console.log(`html: ${HTML_PATH}`);
  console.log(`pdf: ${PDF_PATH}`);
  console.log(`script: ${SCRIPT_PATH}`);
  console.log(`routes: ${ROUTES_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
