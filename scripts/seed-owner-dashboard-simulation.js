const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const SOURCE = "owner-dashboard-simulation-v1";
const VISIT_MARKER = "OWNER_DASHBOARD_SIMULATION_V1";
const CUSTOMER_MEMO =
  "店舗状況シミュレーション用の顧客データ。実際の店舗実績には含めない。";
const CUSTOMER_COUNT = 120;
const VISIT_AND_SALE_COUNT = 480;
const APPOINTMENT_COUNT = 36;
const REFERENCE_DATE = new Date("2026-07-22T12:00:00+09:00");

const surnames = [
  "青木",
  "石川",
  "伊藤",
  "井上",
  "上田",
  "遠藤",
  "大西",
  "岡田",
  "小川",
  "加藤",
  "川上",
  "木村",
  "小林",
  "斎藤",
  "佐々木",
  "佐藤",
  "清水",
  "杉本",
  "高木",
  "高橋",
  "田中",
  "中川",
  "中村",
  "西村",
  "橋本",
  "原田",
  "藤井",
  "松本",
  "三浦",
  "宮本",
  "村上",
  "森",
  "山口",
  "山田",
  "山本",
  "吉田",
  "渡辺",
  "和田",
  "前田",
  "福田"
];
const femaleGivenNames = [
  "彩花", "玲奈", "真由", "遥", "優子", "由佳", "奈央", "千尋", "麻衣", "沙織",
  "恵", "絵里", "愛", "理沙", "香織", "明日香", "智子", "舞", "陽子", "美穂",
  "加奈", "葵", "琴音", "結衣", "瑞希", "里奈", "杏奈", "佳奈", "菜々子", "美月",
  "友香", "亜美", "梨花", "知佳", "晴香", "桃子", "紗季", "裕子", "夏美", "真奈",
  "千夏", "和香", "美緒", "春香", "優奈", "直子", "久美子", "祥子", "早紀", "綾"
];
const maleGivenNames = [
  "翔太", "拓也", "大輔", "健太", "直樹", "亮", "悠斗", "和也", "誠", "達也",
  "祐介", "良太", "圭介", "智也", "一樹", "航", "俊介", "大地", "啓太", "裕也",
  "悠真", "隆之", "慎太郎", "健一", "哲也", "陽介", "直人", "匠", "涼太", "悠介",
  "修", "章", "颯太", "海斗", "康平", "雅人"
];
// 谷崎さんを少し多め（2/6）、ほかのスタッフを各1/6で割り当てる。
// 顧客番号と互いに素な係数で巡回させ、最新担当が特定スタッフへ偏るのを防ぐ。
const staffRotation = [
  "谷崎 太二",
  "渡邊 浩明",
  "浅野 清美",
  "谷崎 太二",
  "小林 美奈子",
  "kaori"
];
const paymentMethods = ["カード", "現金", "QR決済", "カード", "電子マネー"];
const menus = [
  { title: "カット", amount: 5500 },
  { title: "カット + カラー", amount: 13200 },
  { title: "カラー + トリートメント", amount: 14500 },
  { title: "カット + パーマ", amount: 15400 },
  { title: "トリートメント", amount: 6600 },
  { title: "ヘッドスパ", amount: 5500 },
  { title: "カット + トリートメント", amount: 11000 }
];
const reactions = [
  "仕上がりを確認し、次回の目安も案内した",
  "扱いやすさを実感され、ホームケアも案内した",
  "希望どおりの仕上がりで、次回予約を検討",
  "気になる点を確認し、次回の施術メモへ反映"
];
const hairThicknesses = ["細い", "普通", "太い", "混在"];
const hairVolumes = ["少ない", "普通", "多い", "広がりやすい"];
const hairTextures = ["直毛", "ゆるいクセ", "強いクセ", "うねり", "乾燥しやすい"];
const scalpConditions = ["普通", "敏感", "乾燥", "脂っぽい", "かゆみが出やすい"];
const faceShapes = ["丸顔", "面長", "卵型", "ベース型", "逆三角"];
const foreheads = ["狭め", "普通", "広め", "前髪で調整したい"];
const preferredLengths = ["ショート", "ボブ", "ミディアム", "セミロング", "ロング"];
const preferredStyles = ["ナチュラル", "上品", "柔らかい", "大人っぽい", "モード", "扱いやすさ重視"];
const colorPreferences = ["地毛に近い", "暗め", "明るめ", "透明感", "白髪ぼかし", "カラーなし"];
const maintenanceLevels = ["低め", "標準", "高めでも可"];
const lifestyles = [
  "平日は朝10分以内で整えたい。アイロンは週2回ほど使い、仕事中は髪を結ぶことが多い。",
  "夜にしっかり乾かすが、朝はブラシだけで整えたい。湿気の多い日は表面が広がりやすい。",
  "運動後に洗うことが多く、頭皮の乾燥も気になる。スタイリング剤は軽い仕上がりが好み。",
  "毎朝ドライヤーとアイロンを使う。毛先の熱ダメージを抑えながらまとまりを保ちたい。",
  "子育て中で乾かす時間を短くしたい。結んでも跡が目立ちにくい長さを希望。",
  "接客の仕事で清潔感を重視。休日は動きのあるスタイルにも挑戦したい。"
];
const dislikes = [
  "前髪を短くしすぎない。毛先が重く見える仕上がりと、強い香りのスタイリング剤は避けたい。",
  "顔まわりを切り込みすぎない。毎朝アイロンが必須になるスタイルは避けたい。",
  "根元がぺたんと見える仕上がりは苦手。暗く沈みすぎるカラーは避けたい。",
  "広がりが強く出る軽すぎるカットは避けたい。頭皮に刺激を感じたら薬剤を調整してほしい。",
  "派手な色味と強いウェット感は苦手。仕事中に崩れにくい自然な形を優先したい。",
  "長さを一度に大きく変えず、相談しながら進めたい。重いオイル仕上げは避けたい。"
];
function addDays(date, days) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function simulationCustomer(index) {
  const female = index < 84;
  const groupIndex = female ? index : index - 84;
  const surnamePool = female ? surnames.slice(0, 28) : surnames.slice(28, 40);
  const givenPool = female ? femaleGivenNames : maleGivenNames;
  const surname = surnamePool[groupIndex % surnamePool.length];
  const givenName = givenPool[(groupIndex * 7 + Math.floor(groupIndex / surnamePool.length)) % givenPool.length];

  return {
    index,
    id: `owner-sim-customer-${String(index + 1).padStart(4, "0")}`,
    name: `${surname} ${givenName}`,
    gender: female ? "女性" : "男性",
    birthYear: 1958 + ((index * 7) % 47),
    phone: `000-1000-${String(index + 1).padStart(4, "0")}`
  };
}

function simulationEvent(index) {
  const customerIndex = (index * 37) % CUSTOMER_COUNT;
  const visitCycle = Math.floor(index / CUSTOMER_COUNT);
  const daysAgo = Math.floor(((VISIT_AND_SALE_COUNT - 1 - index) * 720) / (VISIT_AND_SALE_COUNT - 1));
  const paidAt = addDays(REFERENCE_DATE, -daysAgo);
  paidAt.setUTCHours(1 + ((index * 3) % 9), (index * 17) % 60, 0, 0);
  const menu = menus[(index * 5 + customerIndex) % menus.length];
  const optionAmount = index % 11 === 0 ? 2200 : index % 6 === 0 ? 1100 : 0;

  return {
    index,
    customerIndex,
    paidAt,
    menu,
    amount: menu.amount + optionAmount,
    stylistName: staffRotation[(customerIndex * 5 + visitCycle * 5) % staffRotation.length],
    paymentMethod: paymentMethods[(index * 3 + customerIndex) % paymentMethods.length]
  };
}

function questionnaireData(index) {
  const stylingTimeMinutes = [5, 10, 15, 20][index % 4];
  const preferredLength = preferredLengths[(index * 3) % preferredLengths.length];
  const preferredStyle = preferredStyles[(index * 5 + 1) % preferredStyles.length];
  const colorPreference = colorPreferences[(index * 2 + 1) % colorPreferences.length];
  const lifestyle = lifestyles[index % lifestyles.length];
  const dislike = dislikes[(index * 5) % dislikes.length];

  return {
    hairProfile: {
      hairThickness: hairThicknesses[index % hairThicknesses.length],
      hairVolume: hairVolumes[(index * 3) % hairVolumes.length],
      hairTexture: hairTextures[(index * 2 + 1) % hairTextures.length],
      scalpCondition: scalpConditions[(index * 3 + 2) % scalpConditions.length],
      faceShape: faceShapes[(index * 2) % faceShapes.length],
      forehead: foreheads[(index * 3 + 1) % foreheads.length],
      lifestyle,
      stylingTimeMinutes
    },
    preference: {
      preferredLength,
      preferredStyle,
      dislikes: dislike,
      colorPreference,
      maintenanceLevel: maintenanceLevels[index % maintenanceLevels.length],
      referenceNotes: [
        `一番の悩み: ${["朝のセットを楽にしたい", "ダメージが気になる", "白髪や色味を相談したい", "前髪・顔まわりを変えたい"][index % 4]}`,
        `予算感: ${["提案通りで相談したい", "できれば料金を抑えたい", "必要ならケアも追加したい"][index % 3]}`,
        `連絡しやすい時間帯: ${["平日午前", "平日午後", "平日夕方", "土日午前", "土日午後"][index % 5]}`,
        `変更連絡方法: ${["LINEで連絡", "電話で連絡", "SMSで連絡", "どれでも可"][index % 4]}`
      ].join("\n")
    }
  };
}

function feedbackData(index, menuTitle) {
  const ratings = [5, 4, 4, 3, 5, 4, 2, 4, 5, 3];
  const rating = ratings[index % ratings.length];
  const satisfaction =
    rating >= 5 ? "とても満足" : rating === 4 ? "扱いやすい" : rating === 3 ? "少し気になる" : "手直しを相談したい";
  const isColor = menuTitle.includes("カラー");
  const isPerm = menuTitle.includes("パーマ");
  const isHeadSpa = menuTitle.includes("ヘッドスパ");
  const isTreatment = menuTitle.includes("トリートメント");
  const homeStyling = isColor
    ? ["色味もまとまりも良い", "毛先の乾燥が少し気になる", "家で乾かしても色がきれいに見える", "色持ちのケアを相談したい"][index % 4]
    : isPerm
      ? ["朝のセットが楽になった", "カールの出し方をもう一度聞きたい", "濡らしてから整えると扱いやすい", "顔まわりの動きが少し難しい"][index % 4]
      : isHeadSpa
        ? ["頭皮がすっきりした", "乾燥しにくく感じる", "かゆみが少し残っている", "家での頭皮ケアも知りたい"][index % 4]
        : isTreatment
          ? ["毛先がまとまりやすい", "乾かす途中で絡みにくかった", "翌朝も手触りが良かった", "表面の広がりが少し気になる"][index % 4]
          : ["家でも形を整えやすい", "前髪を流すのが少し難しい", "耳まわりがすっきりした", "伸びた時の整え方を相談したい"][index % 4];
  const homeCareInterest = [
    "おすすめがあれば知りたい",
    "シャンプー・トリートメントを相談したい",
    "乾かし方だけ知りたい",
    "今回は不要"
  ][(index * 3) % 4];
  const rebookTiming = ["4週間以内に相談", "6週間前後で予約相談", "2か月以内に予約相談", "まだ決めない"][index % 4];
  const reviewPermission = rating >= 4 && index % 3 !== 0 ? "口コミ投稿してもよい" : rating >= 3 ? "まずは相談したい" : "今回は控える";
  const rebookReason = isColor
    ? ["色落ちが進む前に整えたい", "根元が気になる頃に相談したい", "次回は色味を少し変えたい", "カラー後のケアも相談したい"][index % 4]
    : isPerm
      ? ["カールが扱いにくくなる前に整えたい", "次回は顔まわりの動きを相談したい", "今の形を保ちたい", "スタイリング方法も確認したい"][index % 4]
      : isHeadSpa
        ? ["頭皮の乾燥が強くなる前に相談したい", "定期的に頭皮をすっきりさせたい", "季節に合う頭皮ケアを知りたい", "次回も状態を確認してほしい"][index % 4]
        : isTreatment
          ? ["手触りが落ちる前にケアしたい", "毛先の乾燥を定期的に整えたい", "次回もまとまりを確認したい", "家で使うケア商品も相談したい"][index % 4]
          : ["形が崩れる前に整えたい", "髪量が増える頃に予約したい", "前髪が伸びる前に調整したい", "季節が変わる前に長さを相談したい"][index % 4];
  const comments = isColor
    ? [
        "室内と外で見ても希望した色味に近く、毛先まできれいに見えました。家で使うカラーケアも相談したいです。",
        "根元はきれいでしたが、数日後に毛先の乾燥が少し気になりました。次回はケアを追加するか相談したいです。",
        "周りから色が自然だと言われました。褪色しやすい時期なので、次の予約目安も知りたいです。",
        "明るさはちょうど良かったです。顔まわりだけもう少し落ち着いた色でもよかったかもしれません。"
      ]
    : isPerm
      ? [
          "朝は軽く濡らしてから整えると形が出しやすかったです。スタイリング剤の量だけ次回確認したいです。",
          "動きが出て雰囲気を変えられました。右側だけカールを出すのが少し難しいです。",
          "乾かし方を教えてもらった通りにすると、家でもまとまりました。今の長さをしばらく楽しみたいです。",
          "仕上がりは好きですが、前髪が思ったより動くので手直しを相談したいです。"
        ]
      : isHeadSpa
        ? [
            "施術後は頭が軽く感じ、翌日もべたつきが気になりませんでした。定期的に受けたいです。",
            "頭皮のつっぱりが少なくなりました。家で使うシャンプーも相談したいです。",
            "すっきりしましたが、耳の後ろに少しかゆみが残っています。次回状態を見てほしいです。",
            "香りも強すぎずリラックスできました。季節の変わり目にまたお願いしたいです。"
          ]
        : isTreatment
          ? [
              "乾かしている途中の引っかかりが減り、毛先まで手ぐしを通しやすくなりました。",
              "翌朝も毛先が広がりにくかったです。どのくらいの間隔で続けるとよいか知りたいです。",
              "手触りは良くなりましたが、表面のうねりは少し残りました。次回また相談します。",
              "まとまりは出ました。細い部分が重くならないよう、次は量を調整してもらいたいです。"
            ]
          : [
              "乾かすだけでも形が整い、朝の準備が楽になりました。前髪の流し方も分かりやすかったです。",
              "耳まわりはすっきりしましたが、後ろの髪量が少し多く感じます。次回はそこを相談したいです。",
              "希望していた長さで、結んだ時も毛先がまとまりました。今の形を保ちたいです。",
              "全体は扱いやすいです。数日たつと前髪が浮きやすかったので、乾かし方をもう一度聞きたいです。"
            ];

  return {
    rating,
    satisfaction,
    homeStyling,
    homeCareInterest,
    rebookTiming,
    reviewPermission,
    rebookReason,
    comment: comments[index % comments.length]
  };
}

async function runInChunks(items, buildOperations, chunkSize = 60) {
  for (let start = 0; start < items.length; start += chunkSize) {
    const chunk = items.slice(start, start + chunkSize);
    await prisma.$transaction(chunk.flatMap(buildOperations));
  }
}

async function main() {
  const customers = Array.from({ length: CUSTOMER_COUNT }, (_, index) =>
    simulationCustomer(index)
  );
  const events = Array.from({ length: VISIT_AND_SALE_COUNT }, (_, index) =>
    simulationEvent(index)
  );
  const firstVisitByCustomer = new Map();
  const latestVisitByCustomer = new Map();

  for (const event of events) {
    const current = firstVisitByCustomer.get(event.customerIndex);
    if (!current || event.paidAt < current) {
      firstVisitByCustomer.set(event.customerIndex, event.paidAt);
    }
    const latest = latestVisitByCustomer.get(event.customerIndex);
    if (!latest || event.paidAt > latest.paidAt) {
      latestVisitByCustomer.set(event.customerIndex, event);
    }
  }

  await runInChunks(
    customers,
    (customer) => {
      const firstVisit = firstVisitByCustomer.get(customer.index) || REFERENCE_DATE;
      const createdAt = addDays(firstVisit, -(30 + (customer.index % 75)));
      const data = {
        name: customer.name,
        gender: customer.gender,
        birthYear: customer.birthYear,
        phone: customer.phone,
        memo: CUSTOMER_MEMO,
        deletedAt: null,
        createdAt
      };

      return [
        prisma.customer.upsert({
          where: { id: customer.id },
          update: data,
          create: {
            id: customer.id,
            ...data
          }
        })
      ];
    },
    30
  );

  await runInChunks(
    events,
    (event) => {
      const customer = customers[event.customerIndex];
      const sequence = String(event.index + 1).padStart(4, "0");
      const commonVisitData = {
        customerId: customer.id,
        visitedAt: event.paidAt,
        stylistName: event.stylistName,
        requestedStyle: `${event.menu.title}の相談`,
        performedStyle: event.menu.title,
        customerReaction: reactions[event.index % reactions.length],
        nextRecommendation: `${VISIT_MARKER} / 45〜60日後に${event.menu.title}を提案`
      };
      const commonSaleData = {
        customerId: customer.id,
        title: event.menu.title,
        amount: event.amount,
        paymentMethod: event.paymentMethod,
        paidAt: event.paidAt,
        source: SOURCE,
        note: "店舗状況の画面確認用。実際の店舗実績には含めない。",
        createdAt: event.paidAt
      };

      return [
        prisma.visit.upsert({
          where: { id: `owner-sim-visit-${sequence}` },
          update: commonVisitData,
          create: {
            id: `owner-sim-visit-${sequence}`,
            ...commonVisitData
          }
        }),
        prisma.serviceSale.upsert({
          where: { id: `owner-sim-sale-${sequence}` },
          update: commonSaleData,
          create: {
            id: `owner-sim-sale-${sequence}`,
            ...commonSaleData
          }
        })
      ];
    },
    30
  );

  await runInChunks(
    customers,
    (customer) => {
      const questionnaire = questionnaireData(customer.index);
      const latestEvent = latestVisitByCustomer.get(customer.index);
      const feedback = feedbackData(customer.index, latestEvent?.menu.title || "カット");
      const firstVisit = firstVisitByCustomer.get(customer.index) || REFERENCE_DATE;
      const latestVisit = latestEvent?.paidAt || REFERENCE_DATE;
      const intakeCreatedAt = addDays(firstVisit, -20);
      const feedbackCreatedAt = new Date(latestVisit.getTime() + 12 * 60 * 60 * 1000);
      const intakeId = `owner-sim-intake-${String(customer.index + 1).padStart(4, "0")}`;
      const feedbackId = `owner-sim-feedback-${String(customer.index + 1).padStart(4, "0")}`;
      const intakeMessage = [
        `一番の悩み: ${questionnaire.preference.referenceNotes.split("\n")[0].replace("一番の悩み: ", "")}`,
        `希望の長さ: ${questionnaire.preference.preferredLength}`,
        `好きな雰囲気: ${questionnaire.preference.preferredStyle}`,
        `カラー希望: ${questionnaire.preference.colorPreference}`,
        `髪質: ${questionnaire.hairProfile.hairTexture}`,
        `頭皮状態: ${questionnaire.hairProfile.scalpCondition}`,
        `朝のセット時間: ${questionnaire.hairProfile.stylingTimeMinutes}分`,
        `生活習慣: ${questionnaire.hairProfile.lifestyle}`,
        `避けたい条件: ${questionnaire.preference.dislikes}`,
        questionnaire.preference.referenceNotes.split("\n").slice(1).join("\n")
      ].join("\n");
      const feedbackMessage = [
        `来店後評価: ${feedback.rating}/5`,
        `仕上がり: ${feedback.satisfaction}`,
        `口コミ: ${feedback.reviewPermission}`,
        `次回希望: ${feedback.rebookTiming}`,
        `家での扱いやすさ: ${feedback.homeStyling}`,
        `ホームケア相談: ${feedback.homeCareInterest}`,
        `次回理由: ${feedback.rebookReason}`,
        `メモ: ${feedback.comment}`
      ].join("\n");
      const needsFollow = feedback.rating <= 3 || feedback.satisfaction.includes("相談");
      const wantsHomeCare = !feedback.homeCareInterest.includes("不要");

      return [
        prisma.hairProfile.upsert({
          where: { customerId: customer.id },
          update: questionnaire.hairProfile,
          create: { customerId: customer.id, ...questionnaire.hairProfile }
        }),
        prisma.preference.upsert({
          where: { customerId: customer.id },
          update: questionnaire.preference,
          create: { customerId: customer.id, ...questionnaire.preference }
        }),
        prisma.contactLog.upsert({
          where: { id: intakeId },
          update: {
            channel: "事前カウンセリング",
            purpose: "初回カウンセリング回答",
            message: intakeMessage,
            outcome: "カウンセリング済み",
            nextAction: "髪質・好み・避けたい条件を施術前に確認する",
            createdAt: intakeCreatedAt
          },
          create: {
            id: intakeId,
            customerId: customer.id,
            channel: "事前カウンセリング",
            purpose: "初回カウンセリング回答",
            message: intakeMessage,
            outcome: "カウンセリング済み",
            nextAction: "髪質・好み・避けたい条件を施術前に確認する",
            createdAt: intakeCreatedAt
          }
        }),
        prisma.contactLog.upsert({
          where: { id: feedbackId },
          update: {
            channel: "フィードバックページ",
            purpose: "来店後フィードバック",
            message: feedbackMessage,
            outcome: needsFollow ? "要フォロー" : wantsHomeCare ? "ホームケア相談候補" : "来店後確認済み",
            nextAction: needsFollow
              ? "気になる点を確認し、24時間以内にフォローする"
              : wantsHomeCare
                ? "希望に合うホームケアと使い方を案内する"
                : "次回来店の目安を案内する",
            scheduledFollowUp: addDays(feedbackCreatedAt, needsFollow ? 1 : 14),
            createdAt: feedbackCreatedAt
          },
          create: {
            id: feedbackId,
            customerId: customer.id,
            channel: "フィードバックページ",
            purpose: "来店後フィードバック",
            message: feedbackMessage,
            outcome: needsFollow ? "要フォロー" : wantsHomeCare ? "ホームケア相談候補" : "来店後確認済み",
            nextAction: needsFollow
              ? "気になる点を確認し、24時間以内にフォローする"
              : wantsHomeCare
                ? "希望に合うホームケアと使い方を案内する"
                : "次回来店の目安を案内する",
            scheduledFollowUp: addDays(feedbackCreatedAt, needsFollow ? 1 : 14),
            createdAt: feedbackCreatedAt
          }
        })
      ];
    },
    15
  );

  const appointments = Array.from({ length: APPOINTMENT_COUNT }, (_, index) => {
    const customer = customers[(index * 13) % customers.length];
    const menu = menus[(index * 2) % menus.length];
    const scheduledAt = addDays(REFERENCE_DATE, 2 + index * 2);
    scheduledAt.setUTCHours(1 + (index % 8), index % 2 === 0 ? 0 : 30, 0, 0);
    return { index, customer, menu, scheduledAt };
  });

  await runInChunks(
    appointments,
    (appointment) => {
      const id = `owner-sim-appointment-${String(appointment.index + 1).padStart(4, "0")}`;
      const data = {
        customerId: appointment.customer.id,
        scheduledAt: appointment.scheduledAt,
        menu: appointment.menu.title,
        estimatedPrice: appointment.menu.amount,
        status: appointment.index % 4 === 0 ? "仮予約" : "予約確定",
        source: SOURCE,
        note: "店舗状況シミュレーション用。実際の予約ではない。"
      };

      return [
        prisma.appointment.upsert({
          where: { id },
          update: data,
          create: {
            id,
            ...data
          }
        })
      ];
    },
    30
  );

  const [customerCount, visitCount, saleCount, appointmentCount, hairProfileCount, preferenceCount, intakeCount, feedbackCount, revenue] =
    await Promise.all([
      prisma.customer.count({ where: { memo: CUSTOMER_MEMO, deletedAt: null } }),
      prisma.visit.count({
        where: { nextRecommendation: { contains: VISIT_MARKER } }
      }),
      prisma.serviceSale.count({ where: { source: SOURCE } }),
      prisma.appointment.count({ where: { source: SOURCE } }),
      prisma.hairProfile.count({
        where: { customer: { memo: CUSTOMER_MEMO, deletedAt: null } }
      }),
      prisma.preference.count({
        where: { customer: { memo: CUSTOMER_MEMO, deletedAt: null } }
      }),
      prisma.contactLog.count({
        where: {
          purpose: "初回カウンセリング回答",
          customer: { memo: CUSTOMER_MEMO, deletedAt: null }
        }
      }),
      prisma.contactLog.count({
        where: {
          purpose: "来店後フィードバック",
          customer: { memo: CUSTOMER_MEMO, deletedAt: null }
        }
      }),
      prisma.serviceSale.aggregate({
        where: { source: SOURCE },
        _sum: { amount: true }
      })
    ]);

  console.log(
    JSON.stringify(
      {
        source: SOURCE,
        customerCount,
        visitCount,
        saleCount,
        appointmentCount,
        hairProfileCount,
        preferenceCount,
        intakeCount,
        feedbackCount,
        totalRecords:
          customerCount +
          visitCount +
          saleCount +
          appointmentCount +
          hairProfileCount +
          preferenceCount +
          intakeCount +
          feedbackCount,
        simulatedRevenue: revenue._sum.amount || 0
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
