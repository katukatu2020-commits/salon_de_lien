const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = process.cwd();
const DEMO_DIR = path.join(ROOT, "docs", "demo");
const SCREENSHOT_DIR = path.join(DEMO_DIR, "screenshots");
const DEMO_DATA_PATH = path.join(DEMO_DIR, "demo-data.json");
const MANIFEST_PATH = path.join(DEMO_DIR, "screenshot_manifest.json");
const BASE_URL = (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");

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

function readDemoData() {
  if (!fs.existsSync(DEMO_DATA_PATH)) {
    throw new Error(`デモデータがありません: ${DEMO_DATA_PATH}. 先に npm run ensure:demo-data を実行してください。`);
  }
  return JSON.parse(fs.readFileSync(DEMO_DATA_PATH, "utf8"));
}

function url(route) {
  return `${BASE_URL}${route}`;
}

function capture(chromePath, item) {
  const outPath = path.join(SCREENSHOT_DIR, item.file);
  const userDataDir = path.join(os.tmpdir(), `salon-demo-chrome-${item.id}-${Date.now()}`);
  fs.mkdirSync(userDataDir, { recursive: true });

  const args = [
    "--headless=new",
    "--disable-gpu",
    "--disable-gpu-sandbox",
    "--disable-gpu-compositing",
    "--disable-accelerated-2d-canvas",
    "--disable-accelerated-video-decode",
    "--disable-direct-composition",
    "--in-process-gpu",
    "--use-angle=swiftshader",
    "--disable-features=UseSkiaRenderer,Vulkan,DawnGraphite,CalculateNativeWinOcclusion,VizDisplayCompositor",
    "--hide-scrollbars",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-dev-shm-usage",
    `--user-data-dir=${userDataDir}`,
    `--window-size=${item.width},${item.height}`,
    "--force-device-scale-factor=1",
    "--virtual-time-budget=4500",
    `--screenshot=${outPath}`,
    url(item.route)
  ];

  const result = spawnSync(chromePath, args, { encoding: "utf8" });
  fs.rmSync(userDataDir, { recursive: true, force: true });

  if (result.status !== 0 || !fs.existsSync(outPath)) {
    throw new Error(`スクリーンショット取得に失敗しました: ${item.id}\n${result.stderr || result.stdout}`);
  }

  return outPath;
}

function routes(demo) {
  const reviewPath = `/u/${demo.customerId}/review/product/${encodeURIComponent(demo.productReviewToken)}`;
  return [
    {
      id: "admin-customers-desktop",
      file: "01_admin_customers_desktop.png",
      title: "管理画面 / 顧客一覧",
      route: "/admin/customers",
      width: 1440,
      height: 900,
      purpose: "朝、今日やるべき既存客を確認する"
    },
    {
      id: "admin-customers-mobile",
      file: "02_admin_customers_mobile.png",
      title: "管理画面 / 顧客一覧 mobile",
      route: "/admin/customers",
      width: 390,
      height: 844,
      purpose: "スマホ幅で管理画面UIが崩れていないか確認する"
    },
    {
      id: "customer-search-desktop",
      file: "03_customer_search_desktop.png",
      title: "顧客検索",
      route: "/admin/customers?q=%E5%B1%B1%E7%94%B0",
      width: 1440,
      height: 900,
      purpose: "顧客名で検索してカルテを開く"
    },
    {
      id: "customer-detail-desktop",
      file: "04_customer_detail_desktop.png",
      title: "顧客詳細",
      route: `/admin/customers/${demo.customerId}`,
      width: 1440,
      height: 1500,
      purpose: "顧客情報、次アクション、写真・履歴・メニューを確認する"
    },
    {
      id: "customer-detail-products-desktop",
      file: "05_customer_detail_products_desktop.png",
      title: "商品提案・レビュー依頼",
      route: `/admin/customers/${demo.customerId}`,
      width: 1440,
      height: 2100,
      purpose: "商品提案、レビュー依頼、ポイント欄まで含めて確認する"
    },
    {
      id: "customer-detail-mobile",
      file: "06_customer_detail_mobile.png",
      title: "顧客詳細 mobile",
      route: `/admin/customers/${demo.customerId}`,
      width: 390,
      height: 1200,
      purpose: "スマホ幅で顧客詳細が読めるか確認する"
    },
    {
      id: "coupon-new-desktop",
      file: "07_coupon_new_desktop.png",
      title: "次回クーポン作成",
      route: `/admin/customers/${demo.customerId}/coupons/new`,
      width: 1440,
      height: 1100,
      purpose: "限定クーポン作成と印刷プレビューを確認する"
    },
    {
      id: "coupon-print-desktop",
      file: "08_coupon_print_desktop.png",
      title: "A4クーポン印刷",
      route: `/admin/coupon-issues/${demo.couponIssueId}/print`,
      width: 1440,
      height: 1200,
      purpose: "A4印刷用チラシを確認する"
    },
    {
      id: "customer-portal-mobile",
      file: "09_customer_portal_mobile.png",
      title: "お客様ページ",
      route: `/u/${demo.customerId}`,
      width: 390,
      height: 1200,
      purpose: "保有ポイント、限定クーポン、ホームケア導線を確認する"
    },
    {
      id: "product-review-mobile",
      file: "10_product_review_mobile.png",
      title: "商品レビュー回答",
      route: reviewPath,
      width: 390,
      height: 1200,
      purpose: "お客様が商品レビューを回答する"
    },
    {
      id: "review-thanks-mobile",
      file: "11_review_thanks_mobile.png",
      title: "レビュー回答後トップ",
      route: `/u/${demo.customerId}?reviewPoints=50`,
      width: 390,
      height: 1000,
      purpose: "レビュー回答後にポイント付与が表示される"
    },
    {
      id: "feedback-mobile",
      file: "12_feedback_mobile.png",
      title: "来店後フィードバック",
      route: `/u/${demo.customerId}/feedback`,
      width: 390,
      height: 1200,
      purpose: "施術後アンケートと30pt付与導線を確認する"
    },
    {
      id: "referral-mobile",
      file: "13_referral_mobile.png",
      title: "紹介ページ",
      route: `/referral/${demo.referralCode}`,
      width: 390,
      height: 1000,
      purpose: "紹介コードで新規相談を登録する"
    },
    {
      id: "offers-report-desktop",
      file: "14_offers_report_desktop.png",
      title: "販促CRMレポート",
      route: "/admin/reports/offers",
      width: 1440,
      height: 1100,
      purpose: "既存客施策の動きと未対応タスクを見る"
    },
    {
      id: "manufacturer-report-desktop",
      file: "15_manufacturer_report_desktop.png",
      title: "メーカー向け商品集計",
      route: "/admin/reports/manufacturer-products?manufacturer=%E3%83%9F%E3%83%AB%E3%83%9C%E3%83%B3",
      width: 1440,
      height: 1100,
      purpose: "匿名・商品別集計をメーカー向けに確認する"
    }
  ];
}

function main() {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  const chromePath = findChrome();
  const demo = readDemoData();
  const items = routes(demo);

  const captured = items.map((item) => {
    const filePath = capture(chromePath, item);
    console.log(`${item.id}: ${filePath}`);
    return {
      ...item,
      url: url(item.route),
      path: filePath
    };
  });

  fs.writeFileSync(
    MANIFEST_PATH,
    JSON.stringify(
      {
        baseUrl: BASE_URL,
        generatedAt: new Date().toISOString(),
        chromePath,
        screenshots: captured
      },
      null,
      2
    ),
    "utf8"
  );
  console.log(`manifest: ${MANIFEST_PATH}`);
}

main();
