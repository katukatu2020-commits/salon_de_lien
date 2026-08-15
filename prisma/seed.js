const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const products = [
  {
    manufacturerName: "ミルボン",
    name: "Aujua クエンチ シャンプー",
    category: "シャンプー",
    concernTags: ["乾燥", "ダメージ", "カラー後", "まとまり"],
    description: "乾燥・パサつきが気になる髪をしっとり洗い上げるAujuaのシャンプー。"
  },
  {
    manufacturerName: "ミルボン",
    name: "Aujua クエンチ 洗い流さないトリートメント",
    category: "洗い流さないトリートメント",
    concernTags: ["乾燥", "カラー後", "広がり", "まとまり"],
    description: "ドライヤー前のホームケアで、乾燥しやすい毛先をまとまりやすく整えるAujuaのアウトバス。"
  },
  {
    manufacturerName: "ミルボン",
    name: "Aujua リペアリティ トリートメント",
    category: "トリートメント",
    concernTags: ["ブリーチ", "ダメージ", "切れ毛", "手触り"],
    description: "ブリーチやカラーで弱くなった髪の内側を補修するAujuaの集中ケア。"
  },
  {
    manufacturerName: "ミルボン",
    name: "Aujua アクアヴィア",
    category: "ヘアケア",
    concernTags: ["くせ", "広がり", "まとまり", "うねり"],
    description: "くせや広がりを抑え、扱いやすい髪に整えるAujuaのヘアケア。"
  },
  {
    manufacturerName: "ミルボン",
    name: "Aujua エイジングスパ",
    category: "頭皮ケア",
    concernTags: ["頭皮", "乾燥", "ボリューム", "年齢変化"],
    description: "頭皮の保湿とやわらかさを意識したAujuaのスカルプケア。"
  },
  {
    manufacturerName: "ミルボン",
    name: "グローバルミルボン ブリリアント ポリッシング オイル",
    category: "スタイリング",
    concernTags: ["広がり", "ツヤ", "まとまり"],
    description: "ツヤとまとまりを出したい仕上げ向けのグローバルミルボンのオイル。"
  },
  {
    manufacturerName: "ミルボン",
    name: "グローバルミルボン モールディング ワックス 4",
    category: "スタイリング",
    concernTags: ["セット力", "動き", "使いやすさ"],
    description: "自然な動きと軽いまとまりを作りたい方向けのスタイリングワックス。"
  },
  {
    manufacturerName: "ミルボン",
    name: "グローバルミルボン モールディング ワックス 7",
    category: "スタイリング",
    concernTags: ["セット力", "キープ", "動き"],
    description: "しっかりした動きとキープ力が欲しい方向けのスタイリングワックス。"
  },
  {
    manufacturerName: "ミルボン",
    name: "グローバルミルボン ウェット シャイン ジェルクリーム 5",
    category: "スタイリング",
    concernTags: ["ツヤ", "ウェット感", "まとまり"],
    description: "ほどよいウェット感とツヤを出したい方向けのジェルクリーム。"
  },
  {
    manufacturerName: "ミルボン",
    name: "グローバルミルボン ウェット シャイン ジェルクリーム 8",
    category: "スタイリング",
    concernTags: ["ツヤ", "ウェット感", "キープ"],
    description: "強めのウェット感とホールド感が欲しい方向けのジェルクリーム。"
  }
];

const pointRules = [
  {
    key: "product_review_submitted",
    label: "商品レビュー回答",
    eventType: "product_review_submitted",
    points: 30,
    validDays: 40
  },
  {
    key: "product_review_used_submitted",
    label: "商品使用感レビュー回答",
    eventType: "product_review_used_submitted",
    points: 20,
    validDays: 40
  },
  {
    key: "feedback_submitted",
    label: "来店後フィードバック回答",
    eventType: "feedback_submitted",
    points: 30,
    validDays: 40
  },
  {
    key: "appointment_checkout_completed",
    label: "オンライン予約・会計完了",
    eventType: "appointment_checkout_completed",
    points: 100,
    validDays: 40
  }
];

async function main() {
  for (const product of products) {
    const retailPrice = product.name.includes("ポリッシング オイル")
      ? 2640
      : product.name.includes("ワックス") || product.name.includes("ジェルクリーム")
        ? 2200
        : product.name.includes("洗い流さないトリートメント")
          ? 2860
          : product.name.includes("シャンプー")
            ? 3080
            : product.name.includes("トリートメント")
              ? 4180
              : 3300;
    await prisma.product.upsert({
      where: {
        organizationId_manufacturerName_name: {
          organizationId: "org_salon_de_lien",
          manufacturerName: product.manufacturerName,
          name: product.name
        }
      },
      update: {
        category: product.category,
        concernTags: product.concernTags,
        description: product.description,
        retailPrice,
        active: true
      },
      create: {
        ...product,
        organizationId: "org_salon_de_lien",
        retailPrice,
        stockQuantity: 10,
        active: true
      }
    });
  }

  for (const rule of pointRules) {
    await prisma.pointRule.upsert({
      where: { key: rule.key },
      update: {
        label: rule.label,
        eventType: rule.eventType,
        points: rule.points,
        validDays: rule.validDays,
        active: true
      },
      create: {
        ...rule,
        active: true
      }
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
