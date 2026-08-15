import { getDemoReviewCopyOverride } from "./demo-review-copy-overrides.ts";

type RankingItem = {
  label: string;
  count: number;
};

type RatingBreakdown = {
  star1: number;
  star2: number;
  star3: number;
  star4: number;
  star5: number;
};

type DemoQuote = {
  comment: string;
  rating: number;
  goodPoints: string[];
  badPoints: string[];
  topic: string;
  structureType: string;
  writingStyle: string;
};

type DemoProduct = {
  productId: string;
  productName: string;
  brandName: string;
  seriesName: string;
  productType: ProductType;
  usageTiming: UsageTiming;
  rinseRequired: boolean;
  validUsageMethods: string[];
  invalidUsageMethods: string[];
  category: string;
  proposalCount: number;
  sampleGivenCount: number;
  purchasedCount: number;
  usedInServiceCount: number;
  reviewRequestCount: number;
  reviewCount: number;
  usedCount: number;
  notYetCount: number;
  forgotCount: number;
  averageRating: number;
  ratingBreakdown: RatingBreakdown;
  repeatIntentYesRate: number;
  goodPointRanking: RankingItem[];
  badPointRanking: RankingItem[];
  concernTagBreakdown: RankingItem[];
  anonymousQuoteCount: number;
  anonymousQuotes: string[];
  anonymousQuoteDetails: DemoQuote[];
  commentsHiddenReason: null;
};

type ProductKind = "shampoo" | "treatment" | "leave_in" | "scalp" | "oil" | "wax_light" | "wax_strong" | "gel_light" | "gel_strong";
type ProductType = "shampoo" | "rinse_off_treatment" | "leave_in_treatment" | "oil" | "wax" | "gel" | "other";
type UsageTiming = "during_bath" | "after_bath" | "before_styling" | "after_styling";

type ReviewProductContext = {
  productId: string;
  brandName: string;
  seriesName: string;
  productName: string;
  productType: ProductType;
  usageTiming: UsageTiming;
  rinseRequired: boolean;
  validUsageMethods: string[];
  invalidUsageMethods: string[];
};

type ProductDefinition = {
  id: string;
  name: string;
  brand: string;
  shortName: string;
  category: string;
  genericName: string;
  kind: ProductKind;
  seriesName: string;
  productType: ProductType;
  usageTiming: UsageTiming;
  rinseRequired: boolean;
  validUsageMethods: string[];
  invalidUsageMethods: string[];
  reviewCount: number;
  concerns: string[];
  strengths: string[];
  mildDrawbacks: string[];
  strongDrawbacks: string[];
  scenes: string[];
  amounts: string[];
  comparisons: string[];
  advice: string[];
  containerNotes: string[];
  textureWords: string[];
};

type ReviewExperience = {
  product: ProductDefinition;
  index: number;
  globalIndex: number;
  attempt: number;
  rating: number;
  topic: string;
  structureType: string;
  writingStyle: string;
  sentenceCount: number;
  usageScene?: string;
  hairConcern?: string;
  hairType?: string;
  usagePeriod?: string;
  usageAmount?: string;
  observedEffect?: string;
  drawback?: string;
  comparisonTarget?: string;
  salonAdvice?: string;
  personalPriority?: string;
  futureIntent?: string;
  containerNote?: string;
  productRef: string;
};

type ReviewPhraseStats = {
  normalizedOpening: string;
  usedPhrases: string[];
  sentences: string[];
  topic: string;
  structureType: string;
  writingStyle: string;
  ending: string;
  effectKey: string;
};

const DEMO_RESPONDENT_COUNT = 103;
const MAX_PRODUCT_REVIEW_COMMENTS = 16;
const STAFF_NAMES = ["谷崎店長", "渡辺さん", "浅野さん", "小林さん"];

const WRITING_STYLES = [
  "短く事実だけ",
  "会話に近い",
  "慎重",
  "結果をはっきり",
  "少し厳しめ",
  "使い方具体",
  "コスト重視",
  "香り手触り重視",
  "持続重視"
] as const;

const STRUCTURE_TYPES = [
  "one_sentence",
  "scene_first",
  "effect_first",
  "drawback_first",
  "comparison_first",
  "advice_first",
  "memo_style",
  "question_style",
  "repeat_note",
  "balanced"
] as const;

const TOPICS_BY_KIND: Record<ProductKind, string[]> = {
  shampoo: [
    "泡立ち",
    "すすぎ",
    "頭皮",
    "香り",
    "使用量",
    "乾かした後",
    "絡まり",
    "比較",
    "容器",
    "価格",
    "湿度",
    "使い方",
    "期待未満",
    "合わない",
    "短評"
  ],
  scalp: ["頭皮", "すすぎ", "香り", "使用量", "乾かした後", "比較", "容器", "価格", "季節", "使い方", "期待未満", "合わない", "短評"],
  treatment: [
    "なじませ",
    "放置時間",
    "すすぎ",
    "乾かした後",
    "毛先",
    "重さ",
    "香り",
    "使用量",
    "比較",
    "価格",
    "湿度",
    "容器",
    "期待未満",
    "合わない",
    "短評"
  ],
  leave_in: [
    "毛先",
    "朝夜",
    "使用量",
    "重さ",
    "香り",
    "ツヤ",
    "比較",
    "価格",
    "容器",
    "湿度",
    "使い方",
    "期待未満",
    "合わない",
    "短評"
  ],
  oil: ["ツヤ", "毛先", "使用量", "重さ", "束感", "手残り", "香り", "比較", "価格", "容器", "湿度", "合わない", "短評"],
  wax_light: ["動き", "束感", "キープ", "使用量", "再セット", "洗い落ち", "硬さ", "比較", "価格", "容器", "合わない", "短評"],
  wax_strong: ["束感", "キープ", "硬さ", "使用量", "再セット", "洗い落ち", "ベタつき", "比較", "価格", "容器", "合わない", "短評"],
  gel_light: ["ウェット感", "束感", "キープ", "硬さ", "使用量", "洗い落ち", "手残り", "比較", "価格", "容器", "合わない", "短評"],
  gel_strong: ["ウェット感", "束感", "キープ", "硬さ", "使用量", "洗い落ち", "手残り", "比較", "価格", "容器", "合わない", "短評"]
};

const PRODUCTS: ProductDefinition[] = [
  product("demo-aujua-quench-shampoo", "Aujua クエンチ シャンプー", "Aujua", "クエンチ", "シャンプー", "シャンプー", "shampoo", 47, quenchShampoo()),
  product("demo-aujua-quench-leave-in", "Aujua クエンチ 洗い流さないトリートメント", "Aujua", "クエンチ", "洗い流さないトリートメント", "アウトバス", "leave_in", 50, quenchLeaveIn()),
  product("demo-aujua-quench-treatment", "Aujua クエンチ トリートメント", "Aujua", "クエンチ", "トリートメント", "トリートメント", "treatment", 31, quenchTreatment()),
  product("demo-aujua-fillmellow-shampoo", "Aujua フィルメロウ シャンプー", "Aujua", "フィルメロウ", "シャンプー", "シャンプー", "shampoo", 28, heatCare("シャンプー")),
  product("demo-aujua-fillmellow-treatment", "Aujua フィルメロウ トリートメント", "Aujua", "フィルメロウ", "トリートメント", "トリートメント", "treatment", 22, heatCare("トリートメント")),
  product("demo-aujua-repairlity-shampoo", "Aujua リペアリティ シャンプー", "Aujua", "リペアリティ", "シャンプー", "シャンプー", "shampoo", 33, bleachCare("シャンプー")),
  product("demo-aujua-repairlity-treatment", "Aujua リペアリティ トリートメント", "Aujua", "リペアリティ", "トリートメント", "トリートメント", "treatment", 27, bleachCare("トリートメント")),
  product("demo-aujua-immurise", "Aujua イミュライズ トリートメント", "Aujua", "イミュライズ", "エイジングケア", "トリートメント", "treatment", 26, agingCare("カラーやパーマ後の弱り", "ハリが少し戻る")),
  product("demo-aujua-timesurge", "Aujua タイムサージ トリートメント", "Aujua", "タイムサージ", "エイジングケア", "トリートメント", "treatment", 19, agingCare("年齢による乾燥", "乾かした後のまとまり")),
  product("demo-aujua-diorum", "Aujua ディオーラム トリートメント", "Aujua", "ディオーラム", "エイジングケア", "トリートメント", "treatment", 21, agingCare("ハリとツヤ", "表面が整って見える")),
  product("demo-aujua-aquaveer", "Aujua アクアヴィア トリートメント", "Aujua", "アクアヴィア", "まとまり・くせ", "トリートメント", "treatment", 36, frizzCare()),
  product("demo-aujua-smooth", "Aujua スムース トリートメント", "Aujua", "スムース", "まとまり・くせ", "トリートメント", "treatment", 24, smoothCare()),
  product("demo-aujua-inmetry", "Aujua インメトリィ トリートメント", "Aujua", "インメトリィ", "まとまり・くせ", "トリートメント", "treatment", 29, inmetryCare()),
  product("demo-aujua-aging-spa", "Aujua エイジングスパ シャンプー", "Aujua", "エイジングスパ", "頭皮ケア", "シャンプー", "scalp", 18, scalpCare("頭皮の乾燥", "洗った後の地肌がやわらかく感じる")),
  product("demo-aujua-moistcalm", "Aujua モイストカーム シャンプー", "Aujua", "モイストカーム", "頭皮ケア", "シャンプー", "scalp", 17, scalpCare("乾燥とかゆみ", "つっぱり感が少ない")),
  product("demo-aujua-oathenam", "Aujua オーセナム シャンプー", "Aujua", "オーセナム", "頭皮ケア", "シャンプー", "scalp", 15, scalpCare("頭皮のべたつき", "夕方のにおいが気になりにくい")),
  product("demo-aujua-growcive", "Aujua グロウシブ シャンプー", "Aujua", "グロウシブ", "頭皮ケア", "シャンプー", "scalp", 16, scalpCare("抜け毛とボリューム", "根元を気にして洗いやすい")),
  product("demo-aujua-precedia", "Aujua プレセディア シャンプー", "Aujua", "プレセディア", "頭皮ケア", "シャンプー", "scalp", 14, scalpCare("年齢による髪の変化", "地肌ケアを続けやすい")),
  product(
    "demo-global-milbon-polishing-oil",
    "グローバルミルボン ブリリアント ポリッシング オイル",
    "グローバルミルボン",
    "ポリッシング オイル",
    "スタイリング剤",
    "オイル",
    "oil",
    34,
    oilCare()
  ),
  product("demo-global-milbon-molding-wax-4", "グローバルミルボン モールディング ワックス 4", "グローバルミルボン", "ワックス4", "スタイリング剤", "ワックス", "wax_light", 26, waxCare(4)),
  product("demo-global-milbon-molding-wax-7", "グローバルミルボン モールディング ワックス 7", "グローバルミルボン", "ワックス7", "スタイリング剤", "ワックス", "wax_strong", 23, waxCare(7)),
  product(
    "demo-global-milbon-wet-shine-gel-cream-5",
    "グローバルミルボン ウェット シャイン ジェルクリーム 5",
    "グローバルミルボン",
    "ジェルクリーム5",
    "スタイリング剤",
    "ジェルクリーム",
    "gel_light",
    29,
    gelCare(5)
  ),
  product(
    "demo-global-milbon-wet-shine-gel-cream-8",
    "グローバルミルボン ウェット シャイン ジェルクリーム 8",
    "グローバルミルボン",
    "ジェルクリーム8",
    "スタイリング剤",
    "ジェルクリーム",
    "gel_strong",
    21,
    gelCare(8)
  )
];

function product(
  id: string,
  name: string,
  brand: string,
  shortName: string,
  category: string,
  genericName: string,
  kind: ProductKind,
  reviewCount: number,
  rest: Omit<
    ProductDefinition,
    | "id"
    | "name"
    | "brand"
    | "shortName"
    | "category"
    | "genericName"
    | "kind"
    | "seriesName"
    | "productType"
    | "usageTiming"
    | "rinseRequired"
    | "validUsageMethods"
    | "invalidUsageMethods"
    | "reviewCount"
  >
): ProductDefinition {
  const context = productContextFor({ id, brandName: brand, seriesName: shortName, productName: name, kind });

  return { id, name, brand, shortName, category, genericName, kind, reviewCount, ...context, ...rest };
}

function productContextFor({
  id,
  brandName,
  seriesName,
  productName,
  kind
}: {
  id: string;
  brandName: string;
  seriesName: string;
  productName: string;
  kind: ProductKind;
}): Omit<ReviewProductContext, "productId" | "brandName" | "seriesName" | "productName"> & { seriesName: string } {
  if (kind === "shampoo" || kind === "scalp") {
    return {
      seriesName,
      productType: "shampoo",
      usageTiming: "during_bath",
      rinseRequired: true,
      validUsageMethods: ["泡立てる", "洗う", "すすぐ", "乾かす", "地肌を洗う"],
      invalidUsageMethods: ["朝につける", "乾かす前につける", "スタイリングする", "束感を作る", "流さず残す"]
    };
  }

  if (kind === "treatment") {
    return {
      seriesName,
      productType: "rinse_off_treatment",
      usageTiming: "during_bath",
      rinseRequired: true,
      validUsageMethods: ["なじませる", "時間を置く", "流す", "すすぐ", "乾かす"],
      invalidUsageMethods: ["朝につける", "仕上げにつける", "スタイリングする", "束感を作る", "流さず残す", "アウトバスとして使う"]
    };
  }

  if (kind === "leave_in") {
    return {
      seriesName,
      productType: "leave_in_treatment",
      usageTiming: "after_bath",
      rinseRequired: false,
      validUsageMethods: ["つける", "なじませる", "乾かす", "毛先に使う"],
      invalidUsageMethods: ["流す", "すすぐ", "浴室で流す", "放置して流す", "洗う"]
    };
  }

  if (kind === "oil") {
    return {
      seriesName,
      productType: "oil",
      usageTiming: "after_styling",
      rinseRequired: false,
      validUsageMethods: ["伸ばす", "つける", "仕上げる", "毛先に使う"],
      invalidUsageMethods: ["泡立てる", "洗う", "流す", "すすぐ", "放置する", "補修効果を待つ"]
    };
  }

  if (kind.startsWith("wax")) {
    return {
      seriesName,
      productType: "wax",
      usageTiming: "before_styling",
      rinseRequired: false,
      validUsageMethods: ["手に取る", "伸ばす", "セットする", "動きを出す"],
      invalidUsageMethods: ["泡立てる", "洗う", "流す", "乾かす前につける", "補修する", "数日で変化を見る"]
    };
  }

  if (kind.startsWith("gel")) {
    return {
      seriesName,
      productType: "gel",
      usageTiming: "before_styling",
      rinseRequired: false,
      validUsageMethods: ["手に取る", "伸ばす", "セットする", "束感を作る", "ウェット感を出す"],
      invalidUsageMethods: ["泡立てる", "洗う", "流す", "乾かす前につける", "補修する", "数日で変化を見る"]
    };
  }

  throw new Error(`Review product type is not configured: ${brandName} ${productName} (${id})`);
}

function quenchShampoo() {
  return {
    concerns: ["乾燥", "パサつき", "カラー後", "絡まり"],
    strengths: ["泡がやわらかい", "洗っている時の摩擦が少ない", "乾かすとしっとりする", "香りが強すぎない"],
    mildDrawbacks: ["すすぎを短くすると残る感じがある", "細い髪だと根元が重く見える日がある"],
    strongDrawbacks: ["しっとりしすぎて合わない", "頭皮のさっぱり感が弱い"],
    scenes: ["カラー後の乾燥が気になる日", "冬場に毛先が引っかかる日", "毎朝まとまりにくい時"],
    amounts: ["ワンプッシュ弱", "いつもより少なめ", "肩下で1プッシュ半"],
    comparisons: ["市販の保湿系シャンプー", "家に残っていた軽めのシャンプー", "以前のサロン専売シャンプー"],
    advice: ["泡を毛先に置いてこすらない", "地肌は先に予洗いを長めにする", "すすぎをいつもより丁寧にする"],
    containerNotes: ["ポンプは押しやすい", "濡れた手でも量が調整しやすい"],
    textureWords: ["やわらかい泡", "しっとり", "なめらか"]
  };
}

function quenchLeaveIn() {
  return {
    concerns: ["乾燥", "カラー後", "広がり", "毛先のパサつき"],
    strengths: ["毛先が収まりやすい", "伸びがよい", "ドライヤー後に硬さが出にくい", "香りが残りすぎない"],
    mildDrawbacks: ["前髪につけると少し重い", "量を増やすと束になりやすい"],
    strongDrawbacks: ["油分が強く感じる", "夕方にぺたっと見える"],
    scenes: ["乾かす前の毛先中心", "朝に少しだけ整える時", "カラー直後のホームケア"],
    amounts: ["半プッシュ", "米粒くらいを両手に伸ばして", "毛先だけに少量"],
    comparisons: ["以前使っていたオイル", "ドラッグストアのミルクタイプ", "家にあった重めのアウトバス"],
    advice: ["根元にはつけない", "手のひらで薄く伸ばしてから入れる", "内側から先につける"],
    containerNotes: ["少量ずつ出せる", "キャップ周りは少し汚れやすい"],
    textureWords: ["軽いミルク", "しっとり", "なじみやすい"]
  };
}

function quenchTreatment() {
  return {
    concerns: ["乾燥", "カラー後", "まとまり", "毛先の硬さ"],
    strengths: ["すすいだ時の指通りがよい", "毛先が柔らかく感じる", "乾かすとまとまりが出る"],
    mildDrawbacks: ["放置時間を短くすると普通に感じる", "根元近くは重くなりやすい"],
    strongDrawbacks: ["しっとり感が強すぎる", "軽さが足りない"],
    scenes: ["週に数回の集中ケア", "カラー後のホームケア", "毛先の引っかかりが気になる日"],
    amounts: ["毛先に多め", "中間から毛先", "いつもの半分より少し多め"],
    comparisons: ["以前の軽いトリートメント", "家で使っていた大容量タイプ", "前のしっとり系ケア"],
    advice: ["根元を避けて毛先に置く", "少し時間を置いてから流す", "粗いコームでなじませる"],
    containerNotes: ["チューブは最後の方が少し出しにくい", "浴室に置いても邪魔になりにくい"],
    textureWords: ["こっくり", "なじみやすい", "指通り"]
  };
}

function heatCare(genericName: string) {
  const shampoo = genericName === "シャンプー";

  return {
    concerns: ["熱ダメージ", "硬さ", "アイロン", "パサつき"],
    strengths: shampoo ? ["泡がなめらか", "洗っている時のきしみが少ない", "乾かすと硬さが少し抜ける"] : ["毛先が柔らかく感じる", "すすいだ時に指が通りやすい", "アイロン後のざらつきが減る"],
    mildDrawbacks: ["すぐ大きく変わる感じではない", "香りは好みが分かれそう"],
    strongDrawbacks: ["期待したほど柔らかくならなかった", "重さの方が気になった"],
    scenes: ["アイロンを使う日が続いた時", "毛先が硬く感じる時", "熱でざらつく部分に"],
    amounts: shampoo ? ["少なめ", "肩下で1プッシュ", "いつもの量より少し控えめ"] : ["毛先中心", "硬い部分だけ多め", "少なめから調整"],
    comparisons: ["前のダメージケア用", "市販のしっとり系", "家にあった軽いタイプ"],
    advice: shampoo ? ["毛先をこすらず泡で洗う", "熱を使う日は毛先を丁寧に"] : ["アイロンを使う日は毛先中心にする", "放置時間を短くしすぎない"],
    containerNotes: ["出す量は調整しやすい", "浴室でも扱いやすい"],
    textureWords: shampoo ? ["なめらか", "やわらかい泡"] : ["柔らかい", "しっとりしすぎない"]
  };
}

function bleachCare(genericName: string) {
  const shampoo = genericName === "シャンプー";

  return {
    concerns: ["ブリーチ", "ダメージ", "切れ毛", "乾燥"],
    strengths: shampoo ? ["絡まりが少ない", "泡がすぐ消えにくい", "洗った後の引っかかりが少ない"] : ["ブリーチ部分の手触りが落ち着く", "毛先のざらつきが減る", "乾かした後の広がりが出にくい"],
    mildDrawbacks: ["軽さは少し減る", "値段で迷う"],
    strongDrawbacks: ["細い髪には重く感じる", "補修感より重さが先に出る"],
    scenes: ["ブリーチ後の毛先", "引っかかりが強い日", "カラーを続けた後のケア"],
    amounts: shampoo ? ["少なめ", "肩下で1プッシュ", "半プッシュ程度"] : ["傷んだ部分だけ多め", "中間から毛先に限定して", "少なめから試して"],
    comparisons: ["前のブリーチ用ケア", "市販のダメージケア", "軽いオイルケア"],
    advice: shampoo ? ["予洗いを長めにする", "泡で毛先をこすらない", "すすぎを丁寧にする"] : ["根元にはつけすぎない", "ブリーチ部分を先になじませる", "流す前に手ぐしを通す"],
    containerNotes: ["量の調整は難しくない", "置き場所はいつものケア用品と同じで済む"],
    textureWords: ["しっかり", "しっとり", "補修感"]
  };
}

function agingCare(mainConcern: string, mainStrength: string) {
  return {
    concerns: [mainConcern, "まとまり", "ツヤ", "乾燥"],
    strengths: [mainStrength, "乾かした後のまとまりが出る", "ツヤが見えやすい", "手触りがなめらか"],
    mildDrawbacks: ["変化はゆっくり", "価格は少し気になる"],
    strongDrawbacks: ["自分には違いが分かりにくい", "重さが出て続けにくい"],
    scenes: ["髪の変化が気になった時", "乾燥でまとまりにくい時", "ツヤを出したい日のケア"],
    amounts: ["毛先中心", "少量ずつ", "週に数回"],
    comparisons: ["以前のエイジングケア", "家で使っていた保湿タイプ", "軽めのトリートメント"],
    advice: ["まず毛先からなじませる", "重くなる日は量を減らす", "毎回ではなく様子を見ながら使う"],
    containerNotes: ["出しすぎに注意すれば使いやすい", "香りは残りすぎない"],
    textureWords: ["落ち着く", "なめらか", "ツヤ"]
  };
}

function frizzCare() {
  return {
    concerns: ["くせ", "広がり", "湿気", "まとまり"],
    strengths: [
      "乾かしている途中の絡まりが減る",
      "翌朝の寝ぐせ直しが楽になる",
      "耳の後ろの膨らみが出にくい",
      "雨の日の帰宅時まで毛先の収まりが続きやすい",
      "毛先は落ち着き、表面のうねりは少し残る",
      "ブロー直後の収まりがきれいに見える",
      "硬い髪でも指を通しやすい",
      "内側の広がりが抑えやすい"
    ],
    mildDrawbacks: [
      "湿気が強い日は夕方に戻る",
      "細い髪では量を減らす必要がある",
      "硬い髪では変化が分かりにくい日がある",
      "時間を置かずに流すと普通に感じる",
      "根元近くまでなじませると重さが出る"
    ],
    strongDrawbacks: ["自分のくせには収まりが弱い", "流しても重さが残った", "まとまりよりぺたっと感が先に出た"],
    scenes: ["湿度が高い日の夜", "朝に広がりやすい日の前夜", "表面のうねりが気になる日のケア", "耳後ろが膨らみやすい時"],
    amounts: ["中間から毛先に少量", "毛先中心", "いつもの半分より少し多め", "内側を中心に薄く"],
    comparisons: ["前のくせ毛用トリートメント", "軽めの流すトリートメント", "市販のまとまり系トリートメント", "以前使ったしっとり系ケア"],
    advice: ["中間から毛先になじませる", "粗いコームで通す", "少し時間を置いてから流す", "内側から先になじませる"],
    containerNotes: ["浴室でも取り出しやすい", "適量をつかむまで何度か調整しました", "チューブは濡れた手でも扱えます"],
    textureWords: ["収まり重視", "なめらか", "ほどよいしっとり感"]
  };
}

function smoothCare() {
  return {
    concerns: ["絡まり", "細毛", "指通り", "さらさら感"],
    strengths: ["指通りが軽い", "絡まりが減る", "乾かした後にさらっとする"],
    mildDrawbacks: ["しっとり感は控えめ", "乾燥が強い日は変化が分かりにくい"],
    strongDrawbacks: ["自分には軽すぎる", "まとまりよりさらさら寄りだった"],
    scenes: ["細い髪が絡まる時", "軽い仕上がりにしたい日", "首元で絡まりやすい時"],
    amounts: ["少量", "中間から毛先", "いつも通り"],
    comparisons: ["重めの保湿ケア", "前のさらさらタイプ", "市販の軽いシャンプー"],
    advice: ["毛先に均一になじませる", "乾燥が強い日は別の保湿も足す", "根元は軽く"],
    containerNotes: ["軽く使える", "香りは控えめ"],
    textureWords: ["さらさら", "軽い", "指通り"]
  };
}

function inmetryCare() {
  return {
    concerns: ["うねり", "ゆがみ", "まとまり", "ツヤ"],
    strengths: ["表面が整って見える", "まとまりが続きやすい", "乾かした後にツヤが出る"],
    mildDrawbacks: ["一度で大きく変わる感じではない", "値段は迷う"],
    strongDrawbacks: ["期待ほど収まらなかった", "量を間違えると重い"],
    scenes: ["表面のうねりが出る日", "まとまりを重視したい時", "湿気がある日のケア"],
    amounts: ["中間から毛先", "少量ずつ", "広がる部分だけ"],
    comparisons: ["前のうねり対策", "軽いトリートメント", "オイルだけのケア"],
    advice: ["手ぐしで均一になじませる", "重い日は半量にする", "毛先から先につける"],
    containerNotes: ["量を調整しやすい", "置き場所に困らない"],
    textureWords: ["まとまり寄り", "なめらか", "ツヤ"]
  };
}

function scalpCare(concern: string, strength: string) {
  return {
    concerns: [concern, "頭皮", "地肌", "季節変化"],
    strengths: [strength, "洗った後が軽い", "地肌がすっきりする", "香りが残りすぎない"],
    mildDrawbacks: ["髪のまとまりは別でケアが必要", "続けないと判断しにくい"],
    strongDrawbacks: ["頭皮には合わなかった", "さっぱり感が強すぎた"],
    scenes: ["頭皮が気になる時", "季節の変わり目", "根元の重さが気になる日に"],
    amounts: ["地肌中心", "少なめ", "泡をしっかり立てて"],
    comparisons: ["前のスカルプ系", "家で使っていた普通のシャンプー", "さっぱり系の市販品"],
    advice: ["指の腹で洗う", "すすぎを長めにする", "地肌をこすりすぎない"],
    containerNotes: ["ボトルは持ちやすい", "浴室で見分けやすい"],
    textureWords: ["軽い", "すっきり", "やさしい"]
  };
}

function oilCare() {
  return {
    concerns: ["ツヤ", "まとまり", "乾燥", "仕上げ"],
    strengths: ["少量でツヤが出る", "毛先がまとまる", "伸びがよい", "香りが上品"],
    mildDrawbacks: ["前髪につけると重い", "手に少し残る"],
    strongDrawbacks: ["ベタつきが強い", "夕方に束が重く見える"],
    scenes: ["仕上げの毛先", "乾燥して見える表面", "外出前のツヤ出し"],
    amounts: ["一滴ずつ", "半プッシュ以下", "手のひらに薄く伸ばして"],
    comparisons: ["以前使っていた軽いオイル", "市販のツヤ出しオイル", "クリームタイプのスタイリング剤"],
    advice: ["内側から先につける", "前髪は最後に手に残った分だけ", "乾いた髪に少しずつ足す"],
    containerNotes: ["ポンプの量を調整しやすい", "瓶はきれいだが持ち運びには気を使う"],
    textureWords: ["ツヤ寄り", "なめらか", "少し重め"]
  };
}

function waxCare(level: 4 | 7) {
  const strong = level === 7;

  return {
    concerns: ["キープ力", "束感", "動き", "ショート"],
    strengths: [strong ? "はっきりした束感が出る" : "自然に動きが出る", strong ? "夕方まで形が残る" : "軽く整えやすい", "伸ばしやすい", "再セットしやすい"],
    mildDrawbacks: [strong ? "手に少し残る" : "強いキープには物足りない", strong ? "洗い落ちに少し時間がかかる" : "湿気の日は崩れやすい"],
    strongDrawbacks: [strong ? "硬さが強くて普段使いしにくい" : "キープ力が足りない", "洗い落ちが気になる"],
    scenes: [strong ? "しっかり形を残したい日" : "自然に整えたい日", "ショートの動きを出す時", "休日のセットに"],
    amounts: ["指先に少し", "小豆くらい", "手のひらでよく伸ばして"],
    comparisons: ["前の柔らかいワックス", "ジェルタイプ", "市販のハードワックス"],
    advice: ["最初から多く取らない", "後ろから先につける", "表面は最後に軽く"],
    containerNotes: ["ふたは開けやすい", "持ち運びに大きな不便はない"],
    textureWords: [strong ? "硬め" : "軽め", "束感", "伸び"]
  };
}

function gelCare(level: 5 | 8) {
  const strong = level === 8;

  return {
    concerns: ["ウェット感", "キープ力", "束感", "パーマ"],
    strengths: [strong ? "強めのキープが出る" : "自然な濡れ感が出る", strong ? "束感がはっきりする" : "軽くまとまる", "短時間で形を作れる", "ツヤが出る"],
    mildDrawbacks: [strong ? "パリッと固まりやすい" : "量を増やすと少し硬い", strong ? "洗い落ちに少し時間がかかる" : "強いキープには弱い"],
    strongDrawbacks: [strong ? "固まり方が強すぎる" : "夕方には崩れた", "手に残る感じが苦手"],
    scenes: [strong ? "しっかり固めたい日" : "軽い濡れ感を出したい日", "パーマを出す時", "短時間でセットしたい朝"],
    amounts: ["少量から", "爪の先くらい", "手のひらに薄く伸ばして"],
    comparisons: ["前のジェル", "ワックスだけのセット", "オイル仕上げ"],
    advice: ["水分が少し残った状態で使う", "毛束を割るようにつける", "前髪は最後に少しだけ"],
    containerNotes: ["出す量は調整しやすい", "手を洗えば落ちるが少し時間がいる"],
    textureWords: [strong ? "しっかり固まる" : "やや柔らかい", "ウェット", "束感"]
  };
}

function buildQuoteDetails(product: ProductDefinition, reviewCount: number, globalStats: ReviewPhraseStats[]) {
  const productStats: ReviewPhraseStats[] = [];
  const quotes: DemoQuote[] = [];

  for (let index = 0; index < reviewCount; index += 1) {
    let selected: DemoQuote | null = null;
    let selectedStats: ReviewPhraseStats | null = null;
    let lastRejected: { quote: DemoQuote; stats: ReviewPhraseStats; reasons: string[] } | null = null;

    for (let attempt = 0; attempt < 1200; attempt += 1) {
      const experience = buildExperience(product, index, globalStats.length + index, attempt, productStats);
      const quote = renderReview(experience);
      const stats = phraseStats(quote.comment, experience);
      const reasons = quoteRejectionReasons(quote, stats, globalStats, productStats, product);
      lastRejected = { quote, stats, reasons };

      if (reasons.length === 0) {
        selected = quote;
        selectedStats = stats;
        break;
      }
    }

    if (!selected || !selectedStats) {
      throw new Error(
        `Could not generate distinct review for ${product.name} index ${index}: ${lastRejected?.reasons.join(",") ?? "unknown"} / ${lastRejected?.quote.comment ?? ""}`
      );
    }

    const editedComment = getDemoReviewCopyOverride(product.id, index);
    if (editedComment) {
      selected = {
        ...selected,
        comment: editedComment
      };
    }

    quotes.push(selected);
    productStats.push(selectedStats);
    globalStats.push(selectedStats);
  }

  return quotes;
}

function buildExperience(product: ProductDefinition, index: number, globalIndex: number, attempt: number, productStats: ReviewPhraseStats[]): ReviewExperience {
  const seed = hashNumber(`${product.id}:${index}:${attempt}`);
  const topics = TOPICS_BY_KIND[product.kind];
  const recentTopics = new Set(productStats.slice(-3).map((stats) => stats.topic));
  let topic = topics[(index * 7 + attempt * 5 + seed) % topics.length];

  for (let guard = 0; guard < topics.length && recentTopics.has(topic); guard += 1) {
    topic = topics[(topics.indexOf(topic) + 1 + guard) % topics.length];
  }

  const rating = ratingFor(product, index);
  if (topic === "合わない" && rating >= 3) {
    topic = rating === 3 ? "期待未満" : "短評";
  }

  if (topic === "期待未満" && rating >= 5) {
    topic = "短評";
  }

  const structureType = STRUCTURE_TYPES[(index * 3 + attempt + seed) % STRUCTURE_TYPES.length];
  const writingStyle = WRITING_STYLES[(globalIndex * 5 + attempt + seed) % WRITING_STYLES.length];

  return {
    product,
    index,
    globalIndex,
    attempt,
    rating,
    topic,
    structureType,
    writingStyle,
    sentenceCount: sentenceCountFor(globalIndex, seed),
    usageScene: pick(product.scenes, seed, 1),
    hairConcern: pick(product.concerns, seed, 2),
    hairType: pick(["細め", "硬め", "量が多い", "乾燥しやすい", "普通毛", "くせが出やすい"], seed, 3),
    usagePeriod: isStyling(product.kind) ? undefined : pick(["初日", "3回ほど", "一週間くらい", "週末だけ"], seed, 4),
    usageAmount: pick(product.amounts, seed, 5),
    observedEffect: effectSentenceFor(
      product,
      rating <= 2 ? pick(product.strongDrawbacks, seed, 6) : rating === 3 ? pick([...product.strengths, ...product.mildDrawbacks], seed, 7) : pick(product.strengths, seed, 8),
      seed,
      index,
      rating
    ),
    drawback: drawbackSentenceFor(product, rating <= 2 ? pick(product.strongDrawbacks, seed, 9) : pick(product.mildDrawbacks, seed, 10), seed, index, rating),
    comparisonTarget: pick(product.comparisons, seed, 11),
    salonAdvice: pick(product.advice, seed, 12),
    personalPriority: pick(["軽さ", "まとまり", "香り", "時短", "価格", "キープ力", "地肌の感覚"], seed, 13),
    futureIntent: futureIntentFor(rating, seed, product),
    containerNote: containerNoteFor(product, pick(product.containerNotes, seed, 14), seed, index),
    productRef: productReference(product, seed, index)
  };
}

function effectSentenceFor(product: ProductDefinition, raw: string, seed: number, index: number, rating: number) {
  const variations = specificEffectVariations(product, raw);
  if (variations.length > 0) return pick(variations, seed, index);

  const suffixes =
    rating >= 5
      ? ["ところがはっきり分かりました", "ので、普段のケアに入れやすいです", "点が一番良かったです", "と感じました"]
      : rating === 4
        ? ["点は良いです", "ところは実感できました", "ので、使う場面はあります", "と感じる日がありました"]
        : ["点はあります", "ところもあります", "と感じる日もあります"];

  return `${raw}${pick(suffixes, seed, index)}`;
}

function drawbackSentenceFor(product: ProductDefinition, raw: string, seed: number, index: number, rating: number) {
  const variations = specificDrawbackVariations(product, raw);
  if (variations.length > 0) return pick(variations, seed, index);

  if (rating <= 2) return `${raw}ので、続けるのは難しいです`;
  return `${raw}点は少し気になります`;
}

function containerNoteFor(product: ProductDefinition, raw: string, seed: number, index: number) {
  if (raw.includes("量の調整は難しくない")) {
    return pick([`${product.shortName}は出す量に迷いにくいです`, `${product.shortName}はポンプの押し加減で量を見やすいです`, `${product.shortName}は一回分を出しすぎにくいところが良いです`, `${product.shortName}は慣れれば必要な量を取りやすいです`], seed, index);
  }

  if (raw.includes("出しすぎ")) {
    return pick([`${product.shortName}は最初に少なめで取ると失敗しにくいです`, `${product.shortName}は一度に多く出さなければ扱いやすいです`, `${product.shortName}は量を控えると自然に仕上がります`, `${product.shortName}は少しずつ足す方が自分には合いました`], seed, index);
  }

  if (raw.includes("量を調整しやすい")) {
    return pick([`${product.shortName}は必要な量を見ながら出せます`, `${product.shortName}は一回分を決めやすいです`, `${product.shortName}は少量ずつ使いやすいです`, `${product.shortName}は出しすぎを避けやすいです`], seed, index);
  }

  if (raw.includes("ポンプ")) {
    return pick(["ポンプは片手でも押しやすいです", "濡れた手でもポンプは扱いやすいです", "少量ずつ出せるので失敗しにくいです", "ポンプ周りが汚れにくい点は助かります"], seed, index);
  }

  if (raw.includes("チューブ")) {
    return pick(["チューブは浴室でも持ちやすいです", "最後の方は少し出しにくそうです", "手が濡れていても扱いにくさは少ないです", "置き場所を取らない形です"], seed, index);
  }

  if (raw.includes("調整しました") || raw.includes("適量")) {
    return pick([`${product.shortName}は適量をつかむまで少し慣れが必要です`, `${product.shortName}は一回分を決めるまで何度か調整しました`, `${product.shortName}は多めに出すと重く見えやすいです`, `${product.shortName}は量を控えると自然に使えました`], seed, index);
  }

  if (raw.includes("香り")) {
    return pick(["香りは強く残りすぎません", "香りの印象は控えめです", "乾かした後の香りは近くで分かる程度です", "毎日使っても香りは重く感じません"], seed, index);
  }

  if (raw.includes("見分けやすい")) {
    return pick([`${product.shortName}は浴室で他のボトルと間違えにくいです`, `${product.shortName}は置いていて見つけやすいです`, `${product.shortName}はラベルを確認しやすいです`, `${product.shortName}は毎日手に取りやすい見た目です`], seed, index);
  }

  if (raw.includes("普通") || raw.includes("不便はない")) {
    return pick([`${product.shortName}は容器まわりで大きな不便はありません`, `${product.shortName}は毎日の置き場所に困りにくいです`, `${product.shortName}は持ち運びより自宅用に向いています`, `${product.shortName}は開け閉めで引っかかる感じはありません`], seed, index);
  }

  return pick([`${product.shortName}は${raw}ところがありました`, `${product.shortName}は${raw}点が印象に残りました`, `${product.shortName}は${raw}部分を確認できました`, `${product.shortName}は${raw}ので続けやすいです`], seed, index);
}

function specificEffectVariations(product: ProductDefinition, raw: string) {
  if (raw.includes("香りが残りすぎない")) {
    return ["香りは乾かした後に強く残りません", "近くで分かる程度の香りです", "翌朝まで香りが強く残らないところが良いです", "香りの主張が控えめで使いやすいです"];
  }

  if (raw.includes("毛先が収まりやすい") || raw.includes("毛先がまとまる")) {
    return ["乾かした後の毛先が外へ跳ねにくいです", "耳の後ろの膨らみが抑えやすいです", "毛先だけ見ると収まりが出ました", "内側の広がりが扱いやすくなりました"];
  }

  if (raw.includes("収まりがきれい")) {
    return ["ブロー直後の収まりが整って見えます", "乾かした後の形が乱れて見えにくいです", "毛先の向きがそろいやすくなりました", "仕上げた直後のまとまりが見やすいです"];
  }

  if (raw.includes("指通り") || raw.includes("絡まり")) {
    return ["ブラシを入れる時の引っかかりが軽くなりました", "乾かしている途中で指が止まりにくいです", "首元の絡まりをほどく時間が短く済みました", "流した後の手触りがなめらかです"];
  }

  if (raw.includes("泡")) {
    return ["泡が途中でへたりにくいです", "地肌まで泡を広げやすいです", "毛先をこすらず洗いやすいです", "予洗いをすると泡立ちが安定します"];
  }

  if (raw.includes("ツヤ")) {
    return [
      "光に当たった時の表面が整って見えます",
      "乾燥して見える部分にツヤが出ます",
      "毛先のパサつきが目立ちにくくなります",
      "仕上げ後の見た目がきれいです",
      "ブロー後の表面が粗く見えにくいです",
      "照明の下でも毛先が乾いて見えにくいです",
      "ツヤは出ますが不自然な光り方ではありません",
      "乾かした後の見た目に清潔感があります"
    ];
  }

  if (raw.includes("手触りがなめらか")) {
    return ["流した後の手触りがなめらかです", "乾かした後に指を通しやすいです", "毛先のざらつきが少し落ち着きます", "触った時の引っかかりが軽くなりました"];
  }

  if (raw.includes("まとまりが出る") || raw.includes("まとまり")) {
    return ["乾かした後に毛先が広がりにくいです", "翌朝の形が崩れにくくなりました", "ブロー後の収まりが見やすいです", "内側の膨らみが落ち着きました"];
  }

  if (raw.includes("ハリ")) {
    return ["根元付近がぺたっとしにくく感じました", "乾かした後の表面が弱く見えにくいです", "ふわっと見せたい日の仕上がりに合います", "髪に少し弾力が戻ったように見えます"];
  }

  if (raw.includes("表面が整って見える")) {
    return ["光に当たる表面が乱れて見えにくいです", "ブロー後の表面が均一に見えます", "髪の外側がざらついて見えにくくなりました", "仕上げた直後の面がきれいに見えます"];
  }

  if (raw.includes("キープ") || raw.includes("形が残る")) {
    return ["夕方まで前髪の形が残りやすいです", "外に出た後も毛束が崩れにくいです", "短時間で形を作っても持ちが良いです", "直しの回数が少なく済みました"];
  }

  return [];
}

function specificDrawbackVariations(product: ProductDefinition, raw: string) {
  if (raw.includes("重")) {
    return ["細い髪では量を控えないと重さが出ます", "毛先以外まで広げるとぺたっと見えます", "多めに使った日は軽さが残りません", "夕方には毛先が重く見えました"];
  }

  if (raw.includes("価格") || raw.includes("値段")) {
    return ["仕上がりは良いですが、続けるには価格で迷います", "毎日使うには減り方と価格を見たいです", "もう少し手頃なら続けやすいです", "使用頻度を決めないとコストが気になります"];
  }

  if (raw.includes("香り")) {
    return ["香りの残り方は好みが分かれそうです", "甘さが少し残るところは気になりました", "近くで香りが分かるので、日によって迷います", "無香料に近いものが好きな人には強く感じそうです"];
  }

  if (raw.includes("物足りない") || raw.includes("期待")) {
    return ["期待したほどの変化は感じませんでした", "良い点はありますが、決め手までは弱いです", "自分の悩みには少し足りませんでした", "使った日と使わない日の差が小さめです"];
  }

  return [];
}

function renderReview(exp: ReviewExperience): DemoQuote {
  const candidates = sentencePoolForTopic(exp).filter(Boolean);
  const sentences = shapeSentences(candidates, exp);
  const comment = normalizeComment(sentences.join("。") + "。");
  const { goodPoints, badPoints } = extractTags(comment, exp.product.kind, exp.rating);

  return {
    comment,
    rating: exp.rating,
    goodPoints,
    badPoints,
    topic: exp.topic,
    structureType: exp.structureType,
    writingStyle: exp.writingStyle
  };
}

function scenePhrase(scene: string) {
  if (/[日時]$/.test(scene) || scene.endsWith("前夜") || scene.endsWith("朝") || scene.endsWith("夜") || scene.endsWith("ケア")) {
    return `${scene}に`;
  }

  return `${scene}で`;
}

function productUseSentence(exp: ReviewExperience) {
  const scene = scenePhrase(exp.usageScene ?? pick(exp.product.scenes, exp.product.id));
  const amount = exp.usageAmount ?? "少量";
  const actionAmount = amountActionPhrase(amount);

  if (exp.product.productType === "shampoo") {
    return `${scene}${actionAmount}泡立てて洗いました`;
  }

  if (exp.product.productType === "rinse_off_treatment") {
    const target = actionAmount.includes("毛先") ? actionAmount : `${actionAmount}中間から毛先に`;
    return `${scene}${target}なじませて流しました`;
  }

  if (exp.product.productType === "leave_in_treatment") {
    return `${scene}${actionAmount}毛先になじませてから乾かしました`;
  }

  if (exp.product.productType === "oil") {
    return `${scene}${actionAmount}手のひらに伸ばして仕上げました`;
  }

  if (exp.product.productType === "wax" || exp.product.productType === "gel") {
    return `${scene}${actionAmount}手に伸ばしてセットしました`;
  }

  return `${scene}${amount}で試しました`;
}

function amountActionPhrase(amount: string) {
  if (amount.startsWith("週に")) return `${amount}、`;
  if (amount === "毛先中心") return "毛先を中心に";
  if (amount === "中間から毛先") return "中間から毛先に";
  if (amount.includes("部分だけ多め")) return `${amount}に`;
  if (amount === "薄く") return "薄く";
  if (amount === "少量ずつ") return "少量ずつ、";
  if (amount === "少なめ") return "量を少なめにして";
  if (amount === "いつもより少なめ") return "いつもより量を控えて";
  if (amount.includes("プッシュ") && amount.includes("肩下")) return `${amount}を目安に`;
  if (amount.endsWith("して")) return amount;
  if (amount.endsWith("から調整")) return "少なめから調整して";
  return `${amount}を`;
}

function adviceSentence(exp: ReviewExperience) {
  const advice = exp.salonAdvice ?? pick(exp.product.advice, exp.product.id);
  const staff = staffMention(exp);

  if (staff) return `${staff}${advice}と聞いて、その通りにしました`;
  return `サロンで${advice}と聞き、その通りにしました`;
}

function usageQuestionFollow(exp: ReviewExperience) {
  if (exp.product.productType === "shampoo") return "予洗いとすすぎ時間で印象が変わりそうです";
  if (exp.product.productType === "rinse_off_treatment") return "なじませる範囲をもう少し絞れば使えるかもしれません";
  if (exp.product.productType === "leave_in_treatment" || exp.product.productType === "oil") return "毛先だけに絞れば使えるかもしれません";
  return "量とつける場所を絞れば使えるかもしれません";
}

function sentencePoolForTopic(exp: ReviewExperience) {
  const p = exp.product;
  const ref = exp.productRef;
  const effect = exp.observedEffect ?? pick(p.strengths, hashNumber(p.id));
  const drawback = exp.drawback ?? pick(p.mildDrawbacks, hashNumber(exp.topic));
  const amount = exp.usageAmount ?? "少量";

  switch (exp.topic) {
    case "泡立ち":
      return [
        `${amount}でも泡は十分立ちました`,
        exp.rating >= 4 ? `洗っている時に髪がこすれる感じが少ないです` : `泡は悪くないけれど、洗い上がりは自分には少し重めでした`,
        exp.rating <= 2 ? `頭皮をすっきり洗いたい日は別の方が合いそうです` : `${exp.hairConcern}の日は毛先をこすらず済むのが助かります`,
        exp.futureIntent ?? ""
      ];
    case "すすぎ":
      return [
        exp.rating >= 4
          ? exp.product.productType === "shampoo"
            ? pick([`${p.shortName}はすすぎに時間をかけすぎなくても大丈夫でした`, `${p.shortName}は泡切れが悪くありません`, `${p.shortName}は流す時のぬるつきが少なめでした`], hashNumber(exp.product.id), exp.attempt)
            : pick([`${p.shortName}は流す時のぬるつきが少なめでした`, `${p.shortName}はすすぎ終わりが重く残りにくいです`, `${p.shortName}は流した後の指通りを確認しやすいです`], hashNumber(exp.product.id), exp.attempt)
          : `すすぎは少し時間をかけた方がよさそうです`,
        exp.rating >= 4
          ? pick([`${ref}はすすいだ後の手触りがなめらかです`, `${p.shortName}は洗い終わりに指が通りやすいです`, `${p.shortName}は流した後に毛先がきしみにくいです`], hashNumber(exp.topic), exp.attempt)
          : `すすぎを短くすると、髪に残るように感じました`,
        exp.rating === 3 ? `忙しい朝ではなく、夜に落ち着いて使う方が自分には合います` : ""
      ];
    case "頭皮":
      return [
        productUseSentence(exp),
        exp.rating >= 4 ? `地肌の感覚は軽く、かゆみも出ませんでした` : `${drawback}`,
        exp.rating >= 4 ? `髪のまとまりは別で足す必要がありますが、頭皮用としては使いやすいです` : `頭皮が敏感な日は少し慎重に使いたいです`
      ];
    case "香り":
      return [
        fragranceLeadSentence(exp),
        exp.rating >= 4 ? fragranceFollowSentence(exp) : `${exp.product.shortName}は仕上がり以前に香りの好みで迷いました`,
        rareSocialReaction(exp)
      ];
    case "使用量":
      return [
        amountTrialSentence(amount),
        amountSentence(exp),
        exp.rating >= 4 ? `${effect}` : `${drawback}`,
        exp.futureIntent ?? ""
      ];
    case "乾かした後":
      return [
        `${usagePeriodLead(exp)}、乾かした後の印象が見やすかったです`,
        exp.rating >= 4 ? `${effect}` : `乾かすと${drawback}`,
        exp.rating === 3 ? `日によって差がありそうなので、湿気の少ない日にも試したいです` : ""
      ];
    case "絡まり":
      return [
        exp.rating >= 4 ? pick(["首元の絡まりが少なめでした", "乾かしている途中で指が止まりにくかったです", "毛先をほどく時間が短く済みました"], hashNumber(exp.product.id), exp.attempt) : `絡まりはあまり変わりませんでした`,
        exp.rating >= 4 ? pick(["手ぐしを通す時の引っかかりが減ったのは分かります", "無理にとかさなくても整えやすいです", "ブラシを入れる時の引っかかりが軽くなりました"], hashNumber(exp.topic), exp.attempt) : `${ref}だけで解決するほどではないです`,
        exp.futureIntent ?? ""
      ];
    case "比較":
      return [
        `${exp.comparisonTarget}と比べると、${comparisonResult(exp)}`,
        exp.rating >= 4
          ? pick(
              [
                `${p.genericName}としては違いが分かりやすいです`,
                `${p.shortName}は使う場面を決めやすいです`,
                `仕上がりの方向性がはっきりしています`,
                `普段用と分けて使う理由があります`,
                `同じセット剤でも仕上がりの差が見えました`,
                `自分の髪ではこちらの方が扱いやすいです`
              ],
              hashNumber(exp.product.id),
              exp.attempt
            )
          : `買い替える決め手にはまだ弱いです`,
        exp.futureIntent ?? ""
      ];
    case "容器":
      return [
        `${exp.containerNote}`,
        containerFollow(exp),
        exp.rating <= 2 ? `中身以前に、毎日使うには少し面倒に感じました` : ""
      ];
    case "価格":
      return [
        `値段は少し考えます`,
        exp.rating >= 4 ? costUsageAmountSentence(exp) : `仕上がりとの差を考えると、自分には高めに感じました`,
        exp.rating >= 4 ? `${effect}` : ""
      ];
    case "湿度":
    case "季節":
      return [
        seasonalSentence(exp),
        exp.rating >= 4 ? `${seasonalFollow(exp)}` : `${drawback}`,
        exp.futureIntent ?? ""
      ];
    case "使い方":
      return [
        adviceSentence(exp),
        exp.rating >= 4 ? `教わった手順の方が、${effect}` : `同じようにしても${drawback}`,
        exp.rating === 3 ? usageQuestionFollow(exp) : ""
      ];
    case "期待未満":
      return [
        `期待していたほどの変化はありませんでした`,
        exp.rating >= 3 ? `一方で、${effect}` : `${drawback}`,
        exp.rating <= 2 ? `次は別のものを選ぶと思います` : `条件が合う日だけ使うかもしれません`
      ];
    case "合わない":
      if (exp.rating === 3) {
        return [
          `${ref}は条件が合う日と合わない日があります`,
          `${drawback}`,
          `毎日使うより、場面を決めた方がよさそうです`
        ];
      }

      return [
        `${ref}は自分には合いませんでした`,
        `${drawback}`,
        exp.rating === 1 ? `一度で使用をやめました` : `使う場面をかなり選びます`
      ];
    case "短評":
      return shortReview(exp);
    case "なじませ":
      return [
        pick(
          [
            `毛先にはなじませやすかったです`,
            `濡れた髪でも伸ばす場所を決めやすかったです`,
            `中間から毛先まで均一に入れやすいです`,
            `手ぐしで広げてもムラになりにくいです`,
            `絡みやすい部分にもなじませやすいです`,
            `毛量が多い所にも広げやすかったです`,
            `少し水気を切ってからの方がなじませやすいです`,
            `毛先だけに絞ると扱いやすかったです`
          ],
          hashNumber(exp.product.id),
          exp.attempt
        ),
        exp.rating >= 4 ? `${effect}` : `${drawback}`,
        exp.rating >= 4 ? `手に残る感じも少なめでした` : ""
      ];
    case "放置時間":
      return [
        pick([`${p.shortName}は少し時間を置いた方が違いを見やすいです`, `${p.shortName}はすぐ流す場合と違って、数分なじませる方が合いました`, `${p.shortName}は浴室で少し待てる日に使う方が良さそうです`], hashNumber(exp.product.id), exp.attempt),
        exp.rating >= 4 ? `少し時間を置いてから流した日の方が、${effect}` : `時間を置いても${drawback}`,
        exp.rating === 3 ? `毎回きちんとできるかは微妙です` : ""
      ];
    case "毛先":
      return [
        productUseSentence(exp),
        exp.rating >= 4 ? `${effect}` : `${drawback}`,
        exp.rating >= 4 ? hairEndFollow(exp) : ""
      ];
    case "重さ":
      return [
        exp.rating >= 4 ? `${p.shortName}は重さが強く出ませんでした` : `${p.shortName}は重さが一番気になりました`,
        exp.rating >= 4 ? amountFitSentence(exp) : `量を減らしても夕方にはぺたっと見えます`,
        exp.futureIntent ?? ""
      ];
    case "朝夜":
      return [
        `夜につけた方が朝は楽でした`,
        exp.rating >= 4 ? `${effect}` : `${drawback}`,
        exp.rating === 3 ? `朝だけ使うと少し物足りないです` : ""
      ];
    case "ツヤ":
      return [
        `${amount}でツヤは出ます`,
        exp.rating >= 4 ? `乾燥して見える表面が落ち着きました` : `ただ、光り方が自分には少し強いです`,
        exp.rating >= 4 ? `つける場所を毛先に絞ると自然です` : ""
      ];
    case "手残り":
      return [
        `手に残る感じは${exp.rating >= 4 ? "少なめ" : "気になりました"}`,
        exp.rating >= 4 ? `洗えばすぐ落ちるので、朝でも使えます` : `急いでいる時はそこが面倒です`,
        exp.futureIntent ?? ""
      ];
    case "動き":
      return [
        `自然な動きは作りやすいです`,
        exp.rating >= 4 ? `ショートの毛先が固まりすぎずに動きます` : `夕方には形が弱くなりました`,
        exp.rating >= 4 ? `普段使いならこのくらいがちょうどいいです` : ""
      ];
    case "束感":
      return [
        exp.rating >= 4 ? `束感は出しやすいです` : `束感の出方が自分の髪には合いませんでした`,
        productStrengthSentence(exp),
        exp.rating >= 4 ? `つけすぎなければベタつきも気になりません` : ""
      ];
    case "キープ":
      return [
        keepSentence(exp),
        exp.rating >= 4 ? `夕方まで大きく崩れなかったです` : `昼過ぎには直しが必要でした`,
        exp.futureIntent ?? ""
      ];
    case "硬さ":
      return [
        hardnessSentence(exp),
        exp.rating >= 4 ? `形を優先する日には便利です` : exp.rating === 3 ? `量と場面を選べば使えます` : `普段の仕事用には強すぎました`,
        exp.rating === 3 ? `休みの日だけなら使えそうです` : ""
      ];
    case "再セット":
      return [
        `手ぐしで直す時は${exp.rating >= 4 ? "扱いやすかったです" : "少し難しかったです"}`,
        exp.rating >= 4 ? `${ref}は午後に軽く整え直せます` : `一度崩れると白っぽさが気になります`,
        exp.futureIntent ?? ""
      ];
    case "洗い落ち":
      return [
        `洗い落ちは${exp.rating >= 4 ? "許容範囲です" : "気になりました"}`,
        exp.rating >= 4 ? `セット力を考えると、このくらいなら問題ありません` : `シャンプーを二度した日がありました`,
        exp.rating <= 2 ? `続けるにはそこが厳しいです` : ""
      ];
    case "ベタつき":
      return [
        `ベタつきは${exp.rating >= 4 ? "少なめでした" : "残りやすいです"}`,
        exp.rating >= 4 ? `手を洗えば落ちるので、朝でも困りません` : `手に残る感覚が苦手でした`,
        exp.futureIntent ?? ""
      ];
    case "ウェット感":
      return [
        wetLookSentence(exp),
        exp.rating >= 4 ? `濡れ感が作りやすく、パーマも出しやすいです` : wetDrawbackFollow(exp),
        exp.rating >= 4 ? `少量から足すのが良さそうです` : ""
      ];
    default:
      return shortReview(exp);
  }
}

function shortReview(exp: ReviewExperience) {
  const good = exp.observedEffect ?? pick(exp.product.strengths, hashNumber(exp.product.id));
  const bad = exp.drawback ?? pick(exp.product.mildDrawbacks, hashNumber(exp.topic));

  if (exp.rating >= 5) {
    return [`${good}`, exp.futureIntent ?? `${exp.product.shortName}は次も候補です`];
  }

  if (exp.rating === 4) {
    return [`${good}`, `良い点はありますが、${bad}`];
  }

  if (exp.rating === 3) {
    return [`悪くはないです`, `${good}けれど、${bad}`];
  }

  return [`${bad}`, exp.rating === 1 ? `自分にはかなり合いませんでした` : `良い点もありますが続けるほどではないです`];
}

function shapeSentences(candidates: string[], exp: ReviewExperience) {
  const cleaned = candidates.map((sentence) => sentence.replace(/[。.!！]+$/g, "").trim()).filter(Boolean);
  const target = Math.min(cleaned.length, exp.sentenceCount);
  let picked = cleaned.slice(0, Math.max(1, target));

  if (exp.rating <= 2) {
    const negative = cleaned.filter(isNegativeSentence);
    const neutral = cleaned.filter((sentence) => !negative.includes(sentence) && !isPositiveSentence(sentence));
    picked = [...negative, ...neutral].slice(0, Math.max(1, target));
  }

  if (exp.structureType === "drawback_first" && exp.rating <= 4 && picked.length > 1) {
    picked = [picked[1], picked[0], ...picked.slice(2)];
  }

  if (exp.structureType === "comparison_first" && exp.comparisonTarget) {
    const comparison = `${exp.comparisonTarget}と比べて、${comparisonResult(exp)}`;
    picked = [comparison, ...picked.filter((sentence) => !sentence.includes("比べ"))].slice(0, target);
  }

  if (target === 1) {
    return [withOpeningContext(compactSentence(pickOneSentenceReview(cleaned, picked, exp)), exp)];
  }

  if (exp.writingStyle === "短く事実だけ") {
    return [withOpeningContext(compactSentence(pickOneSentenceReview(cleaned, picked, exp)), exp)];
  }

  if (exp.writingStyle === "少し厳しめ" && exp.rating <= 3) {
    picked = picked.map((sentence, index) => (index === 0 ? sentence.replace("少し", "").replace("許容範囲", "ぎりぎり許容範囲") : sentence));
  }

  if (exp.writingStyle === "慎重" && exp.rating >= 3) {
    picked[picked.length - 1] = cautiousSentence(picked[picked.length - 1]);
  }

  if (exp.writingStyle === "コスト重視" && exp.rating >= 3 && !picked.some((sentence) => sentence.includes("値段") || sentence.includes("価格"))) {
    picked = [...picked.slice(0, Math.max(1, target - 1)), exp.rating >= 4 ? costPositiveSentence(exp) : costHoldSentence(exp)];
  }

  return [withOpeningContext(picked[0], exp), ...picked.slice(1)].slice(0, Math.max(1, target));
}

function usagePeriodLead(exp: ReviewExperience) {
  if (!exp.usagePeriod) return "使った日は";
  if (exp.usagePeriod === "3回ほど") return "3回ほど使ってみると";
  if (exp.usagePeriod === "一週間くらい") return "一週間くらい続けると";
  if (exp.usagePeriod === "週末だけ") return "週末だけ試すと";
  return `${exp.usagePeriod}は`;
}

function withOpeningContext(sentence: string, exp: ReviewExperience) {
  if (!sentence || sentence.length < 10) return sentence;
  if (exp.structureType === "one_sentence" || exp.writingStyle === "短く事実だけ" || exp.attempt % 3 === 0) {
    const context = openingContext(exp);
    if (sentence.startsWith(context)) return sentence;
    return `${context}、${sentence}`;
  }

  return sentence;
}

function openingContext(exp: ReviewExperience) {
  const seed = hashNumber(`${exp.product.id}:opening:${exp.index}:${exp.attempt}:${exp.globalIndex}`);
  const bath = [
    "夜のケアでは",
    "浴室で使った日は",
    "いつもの手順では",
    "丁寧にすすいだ日は",
    "時間に余裕がある日は",
    "乾かした後に見ると",
    "週末に使った時は",
    "カラー後の数日は",
    "湿度が高い日は",
    "毛先をこすらず洗うと",
    "地肌までよく濡らしてからだと",
    "時間を置いて流した日は"
  ];
  const leaveIn = [
    "夜のドライ前は",
    "朝に少し足す日は",
    "乾かす前に使うと",
    "毛先だけに使うと",
    "外出前の直しでは",
    "カラー後のホームケアでは",
    "寝る前に使った日は",
    "内側からなじませると"
  ];
  const styling = [
    "朝のセットでは",
    "短時間で整える日は",
    "休日に使うと",
    "湿気がある日は",
    "夕方まで見ると",
    "手に薄く伸ばすと",
    "前髪を避けて使うと",
    "パーマを出したい日は"
  ];

  if (exp.product.productType === "leave_in_treatment" || exp.product.productType === "oil") return pick(leaveIn, seed);
  if (exp.product.productType === "wax" || exp.product.productType === "gel") return pick(styling, seed);
  return pick(bath, seed);
}

function pickOneSentenceReview(cleaned: string[], picked: string[], exp: ReviewExperience) {
  if (exp.rating <= 2) {
    const negative = cleaned.find(isNegativeSentence) ?? cleaned[1] ?? picked[0] ?? cleaned[0] ?? "";
    const adjusted = negative.startsWith("同じようにしても") ? `${exp.product.genericName}では、${negative}` : negative;
    return adjusted.length < 18 ? `${adjusted}。${shortNegativeTail(exp)}` : adjusted;
  }

  if (exp.rating >= 4) {
    const positive = cleaned.find(isPositiveSentence) ?? cleaned[1] ?? picked[0] ?? cleaned[0] ?? "";
    return positive.length < 18 ? `${productUseSentence(exp)}。${positive}` : positive;
  }

  return cleaned.find((sentence) => isPositiveSentence(sentence) || isNegativeSentence(sentence)) ?? picked[0] ?? cleaned[0] ?? "";
}

function shortNegativeTail(exp: ReviewExperience) {
  if (exp.product.kind === "shampoo" || exp.product.kind === "scalp") {
    return pick(["すすぎを長めにしても印象は変わりませんでした", "地肌のすっきり感を優先する人には弱いと思います", "毎日使うには少し迷います"], hashNumber(exp.product.id), exp.rating);
  }

  if (exp.product.kind === "treatment" || exp.product.kind === "leave_in") {
    return pick(["毛先だけにしても重さが残りました", "乾かした後の見え方が好みではありません", "次は軽いタイプを選びたいです"], hashNumber(exp.product.name), exp.rating);
  }

  if (exp.product.kind === "oil") {
    return pick(["前髪まわりには特に使いにくかったです", "手を洗っても少し残る感じが苦手です", "ツヤより重さが先に出ました"], hashNumber(exp.topic), exp.rating);
  }

  return pick(["普段のセットには強すぎました", "直す時に白っぽさが出やすいです", "洗い落ちまで考えると続けにくいです"], hashNumber(exp.topic), exp.rating);
}

function isPositiveSentence(sentence: string) {
  return /良かった|十分|少ない|軽く仕上|軽い|軽め|重くなりません|しっとり|まとまり|収ま|収まり|伸びがよ|ツヤ|指通り|頼れ|楽|自然|使いやす|落ち着|出ます|残ります|残りすぎない|助か|なじませやす|違いが分か|通りやす|やわらか|柔ら|硬さが出にく|引っかかりが少な|ざらつきが減|広がりが出にく/.test(sentence);
}

function isNegativeSentence(sentence: string) {
  return /合いません|気にな|重|弱|期待|厳しい|低め|別の商品|やめ|続けるのは難しい|強すぎ|強く感じ|物足り|残り|迷|高め|二度|崩れ|苦手|普通|面倒|時間がかか|ぺた|難しか|油分|夕方|さっぱり感が弱|合わな/.test(sentence);
}

function cautiousSentence(sentence: string) {
  return sentence;
}

function compactSentence(sentence: string) {
  return sentence.replace("思ったより", "").replace("という感じです", "").trim();
}

function ratingFor(product: ProductDefinition, index: number) {
  const bucket = Math.abs(hashNumber(`${product.id}:rating:${index}`)) % 100;

  if (bucket < 2) return 1;
  if (bucket < 12) return 2;
  if (bucket < 30) return 3;
  if (bucket < 72) return 4;
  return 5;
}

function sentenceCountFor(index: number, seed: number) {
  const bucket = Math.abs(hashNumber(`sentence:${index}:${seed}`)) % 100;

  if (bucket < 15) return 1;
  if (bucket < 50) return 2;
  if (bucket < 80) return 3;
  return bucket < 95 ? 4 : 5;
}

function futureIntentFor(rating: number, seed: number, product: ProductDefinition) {
  if (rating >= 5)
    return pick(
      [
        `${product.shortName}はまた買う予定です`,
        `${product.genericName}なら次も同じものを選ぶと思います`,
        `なくなったら${product.shortName}を続けたいです`,
        `${product.category}用として残しておきたいです`,
        `${product.shortName}は迷わず候補に入ります`,
        `今の髪には${product.shortName}が合っています`
      ],
      seed,
      1
    );
  if (rating === 4)
    return pick(
      [
        `${product.shortName}はしばらく続けます`,
        `${product.genericName}は使う場面を決めて続けたいです`,
        `${product.shortName}は次回も候補に入ります`,
        `${product.category}が気になる時期だけでも使いたいです`,
        `${product.shortName}は価格を見ながら続けます`,
        `${product.genericName}としては量を守れば使いやすいです`
      ],
      seed,
      2
    );
  if (rating === 3)
    return pick(
      [
        `${product.shortName}のリピートはまだ決めていません`,
        `${product.genericName}は条件を変えて試します`,
        `${product.shortName}を毎日使うかは迷います`,
        `${product.category}が気になる日なら悪くありません`,
        `${product.shortName}は別タイプとも比べたいです`,
        `残りを使って${product.shortName}は判断します`
      ],
      seed,
      3
    );
  if (rating === 2)
    return pick(
      [
        `${product.shortName}の再購入は低めです`,
        `${product.genericName}は別の商品も試したいです`,
        `${product.shortName}を使い切るか迷います`,
        `自分の髪では${product.shortName}の出番が少なそうです`,
        `次は${product.shortName}ではなく軽いものを選びたいです`,
        `${product.shortName}を続ける理由は弱いです`
      ],
      seed,
      4
    );
  return pick(
    [
      `${product.shortName}はリピートしません`,
      `${product.genericName}は次に別のものを選びます`,
      `${product.shortName}を続けるのは難しいです`,
      `${product.shortName}は一度使ってやめました`,
      `自分の髪には${product.shortName}が合いませんでした`,
      `${product.shortName}は無理に使い切らないと思います`
    ],
    seed,
    5
  );
}

function productReference(product: ProductDefinition, seed: number, index: number) {
  const full = product.name;
  const choices = ["これ", "この商品", product.shortName, product.brand, product.genericName, full];
  const slot = Math.abs(seed + index * 11) % 100;

  if (slot < 24) return choices[0];
  if (slot < 44) return choices[1];
  if (slot < 67) return choices[2];
  if (slot < 82) return choices[3];
  if (slot < 94) return choices[4];
  return choices[5];
}

function staffMention(exp: ReviewExperience) {
  const slot = hashNumber(`${exp.product.id}:${exp.topic}:${exp.rating}`) % 100;

  if (slot > 28) return "";
  return `${pick(STAFF_NAMES, slot)}に`;
}

function fragranceTone(exp: ReviewExperience) {
  if (exp.rating <= 2) return pick(["好みより強め", "甘さが少し残る", "自分には合いにくい"], hashNumber(exp.topic));
  if (exp.rating === 3) return pick(["普通", "人によって分かれそう", "強すぎないけれど印象は残る"], hashNumber(exp.product.id));
  return pick(["やわらかい", "清潔感があります", "近くで分かるくらい", "強すぎず使いやすい"], hashNumber(exp.product.name));
}

function fragranceLeadSentence(exp: ReviewExperience) {
  const seed = hashNumber(`${exp.product.id}:fragrance:${exp.index}:${exp.attempt}`);
  const tone = fragranceTone(exp);

  if (exp.rating <= 2) {
    if (tone === "甘さが少し残る") return `${exp.product.shortName}の香りは甘さが少し残ります`;
    if (tone === "自分には合いにくい") return `${exp.product.shortName}の香りは自分には合いにくいです`;
    return `${exp.product.shortName}の香りは${tone}です`;
  }
  if (exp.rating === 3) return pick([`${exp.product.shortName}の香りは${tone}です`, `香りだけ見ると${exp.product.shortName}は好みが分かれそうです`, `${exp.product.genericName}として香りは普通でした`], seed);
  return pick(
    [
      `${exp.product.shortName}の香りは${tone}`,
      `${exp.product.genericName}の中では香りが強く出すぎません`,
      `${exp.product.shortName}は乾かす頃に香りがやわらぎます`,
      `近くで分かる程度に${exp.product.shortName}の香りが残ります`,
      `洗っている時の香りはやわらかめです`,
      `乾かした後は香りが前に出すぎません`,
      `甘さより清潔感の方が残る印象です`,
      `浴室で使う間だけ香りを感じるくらいです`,
      `翌朝に強く残らない香りでした`,
      `香りは近づくと分かる程度です`,
      `毎日使っても香りで疲れにくいです`,
      `同じAujuaの中でも香りは控えめに感じました`
    ],
    seed
  );
}

function fragranceFollowSentence(exp: ReviewExperience) {
  const seed = hashNumber(`${exp.product.id}:fragrance-follow:${exp.index}:${exp.attempt}`);

  return pick(
    [
      `${exp.product.shortName}は乾かした後に強く残らないところが良かったです`,
      `翌朝まで香りが残りすぎないので使いやすいです`,
      `仕事の日でも香りが主張しすぎません`,
      `香りで迷わず使える点は助かります`,
      `近くで少し分かる程度なので、毎日でも使いやすいです`,
      `甘さが残りすぎないので、朝も選びやすいです`,
      `香水と重なりにくいところは実用的でした`,
      `乾かしてしばらくすると香りが落ち着きます`,
      `強い香りが苦手でも使いやすい範囲でした`,
      `家で使っても浴室に香りが残りすぎません`,
      `タオルドライ後にはかなり穏やかになります`,
      `近くで話す距離でも強さは気になりません`,
      `香り目的で選んでも重く感じにくいです`,
      `夜に使っても翌朝まで主張しません`,
      `シャンプー後の香りが長く残りすぎない点は好みです`,
      `家族と同じ浴室でも使いやすい強さです`,
      `甘い香りが苦手な日でも選びやすいです`,
      `仕上がりの邪魔をしない香りです`,
      `香りが残る時間はちょうど良いです`,
      `強い香りが苦手な自分でも続けやすいです`
    ],
    seed
  );
}

function rareSocialReaction(exp: ReviewExperience) {
  const slot = hashNumber(`${exp.product.id}:${exp.topic}:${exp.rating}:social`) % 100;

  if (slot >= 7 || exp.rating < 4) return "";
  return pick(["職場で香りを聞かれました", "家で近くにいた人に髪が落ち着いて見えると言われました"], slot);
}

function amountSentence(exp: ReviewExperience) {
  if (exp.rating >= 4)
    return pick(
      [
        `${exp.product.shortName}は少なめから足すと失敗しにくいです`,
        `${exp.product.genericName}は量を控えると自然に仕上がります`,
        `${exp.product.shortName}は一度に多く使わず、足す方が自分には合いました`,
        `${exp.hairType ?? "自分の髪"}では量を控えた方が扱いやすいです`
      ],
      hashNumber(exp.product.id),
      exp.index
    );
  if (exp.rating === 3) return pick(["多い日は重く、少ない日は物足りないです", "適量を見つけるまで少し迷いました", "慣れれば使えそうですが簡単ではないです"], hashNumber(exp.topic));
  return pick(["量を減らしても重さが残りました", "少量でも自分には強く感じます", "調整しても扱いにくかったです"], hashNumber(exp.product.name));
}

function costPositiveSentence(exp: ReviewExperience) {
  if (exp.product.productType === "shampoo") return `${exp.product.shortName}は使う量が安定すれば、毎日のケアとして続けやすいです`;
  if (exp.product.productType === "rinse_off_treatment")
    return pick(
      [
        `${exp.product.shortName}は週数回の使用なら、仕上がりとのバランスは悪くありません`,
        `${exp.product.shortName}は毛先中心で使うなら、価格も受け入れやすいです`,
        `${exp.product.shortName}は毎日ではなく集中ケアなら続けやすいです`,
        `${exp.product.shortName}は使用頻度を決めれば負担感は少なめです`
      ],
      hashNumber(exp.product.id),
      exp.index
    );
  if (exp.product.productType === "leave_in_treatment") return `${exp.product.shortName}は少量で毛先まで伸びるので、減り方を見ながら続けたいです`;
  if (exp.product.productType === "oil") return `${exp.product.shortName}は一滴ずつで足りる日は、価格も受け入れやすいです`;
  return `${exp.product.shortName}は一回の使用量が少なければ、セット用として続けられそうです`;
}

function costHoldSentence(exp: ReviewExperience) {
  return pick(
    [
      `${exp.product.shortName}は価格まで考えるとリピートは保留です`,
      `${exp.product.shortName}は仕上がりと価格の差で少し迷います`,
      `${exp.product.shortName}は毎日使うには費用面が気になります`,
      `${exp.product.shortName}は使う頻度を決めないと続けにくいです`,
      `${exp.product.shortName}はもう少し試してから判断します`
    ],
    hashNumber(`${exp.product.id}:cost-hold:${exp.index}:${exp.attempt}`)
  );
}

function costUsageAmountSentence(exp: ReviewExperience) {
  if (exp.product.productType === "shampoo") return `${exp.product.shortName}は泡立ちを見ながら使えば、減り方は極端に早くなさそうです`;
  if (exp.product.productType === "rinse_off_treatment") return `${exp.product.shortName}は毛先中心の使用なら、なくなる速度は許容範囲です`;
  if (exp.product.productType === "leave_in_treatment") return `${exp.product.shortName}は半プッシュ前後で足りる日は、続けやすいと思います`;
  if (exp.product.productType === "oil") return `${exp.product.shortName}は一滴ずつ足せば十分なので、コストは見合いやすいです`;
  return `${exp.product.shortName}は一回の使用量が少ない日は、価格も受け入れやすいです`;
}

function amountFitSentence(exp: ReviewExperience) {
  if (exp.product.productType === "rinse_off_treatment") {
    return pick(
      [
        `${exp.product.shortName}は中間から毛先だけなら重くなりにくいです`,
        `${exp.product.shortName}は流した後の重さが強くありません`,
        `${exp.hairType ?? "細い髪"}でも量を控えれば使えました`,
        `${exp.product.shortName}は毛先中心だと軽さが残ります`,
        `${exp.product.shortName}は少なめに使うと自然に収まりました`
      ],
      hashNumber(`${exp.product.id}:amount-fit:${exp.index}:${exp.attempt}`),
      exp.rating
    );
  }

  if (exp.product.productType === "leave_in_treatment" || exp.product.productType === "oil") {
    return pick(["毛先に薄く伸ばすと自然です", "前髪は最後に触る程度がちょうどいいです", "半量から足す方が失敗しにくいです"], hashNumber(exp.product.name), exp.rating);
  }

  if (exp.product.productType === "wax" || exp.product.productType === "gel") {
    return pick(["最初から多く取らなければ硬くなりすぎません", "指先で足すと形を作りやすいです", "表面だけなら重さは出にくいです"], hashNumber(exp.topic), exp.rating);
  }

  return `${exp.usageAmount ?? "少量"}なら重くなりにくいです`;
}

function hairEndFollow(exp: ReviewExperience) {
  if (exp.product.productType === "rinse_off_treatment") {
    return pick(
      ["流した後も毛先の指通りが残ります", "乾かしている途中で絡みにくいです", "翌朝の寝ぐせ直しが少し楽でした"],
      hashNumber(exp.product.id),
      exp.rating
    );
  }

  if (exp.product.productType === "leave_in_treatment") {
    return pick(["乾かした後に毛先が広がりにくいです", "内側からつけると自然に収まります", "朝は少し足すだけで整います"], hashNumber(exp.product.name), exp.rating);
  }

  if (exp.product.productType === "oil") {
    return pick(["ツヤを足す目的なら十分です", "手に残った分を表面につけるくらいが自然です", "毛先の乾燥が目立ちにくくなります"], hashNumber(exp.topic), exp.rating);
  }

  return exp.futureIntent ?? "";
}

function amountTrialSentence(amount: string) {
  if (/して$/.test(amount)) return `${amount}使いました`;
  if (/調整$/.test(amount)) return `${amount}して試しました`;
  if (/に/.test(amount) || /中心|だけ|薄く|多め|少なめ|少量/.test(amount)) return `${amount}を使いました`;
  return `${amount}で試しました`;
}

function comparisonResult(exp: ReviewExperience) {
  if (exp.rating >= 4 && isStyling(exp.product.kind))
    return pick(
      [
        "形の残り方が良いです",
        "束感が作りやすいです",
        "直しやすさがあります",
        "ツヤの出方が自然です",
        "濡れ感を出す時の失敗が少ないです",
        "前髪の毛束を分けやすいです",
        "少量でも動きが見えやすいです",
        "夕方の崩れ方が穏やかです",
        "固めたい部分だけ狙いやすいです",
        "手ぐしで直した時の跡が残りにくいです"
      ],
      hashNumber(`${exp.product.id}:${exp.index}`),
      exp.rating
    );
  if (exp.rating >= 4)
    return pick(
      [
        `${exp.product.shortName}の方が軽く仕上がります`,
        `${exp.hairConcern}への手触りの違いが分かります`,
        `${exp.product.genericName}としてまとまり方が自然です`,
        `${exp.product.shortName}は乾かした後の収まりが良いです`,
        `${exp.product.genericName}後の引っかかりが少ないです`
      ],
      hashNumber(exp.product.id),
      exp.rating
    );
  if (exp.rating === 3) return pick(["良い所はありますが差は小さいです", "場面によっては便利です", "価格まで考えると迷います"], hashNumber(exp.topic), exp.rating);
  return pick(["前の方が自分には合いました", "重さが気になりました", "期待した差は出ませんでした"], hashNumber(exp.product.name), exp.rating);
}

function containerFollow(exp: ReviewExperience) {
  const seed = hashNumber(`${exp.product.id}:container:${exp.index}:${exp.attempt}`);

  if (exp.product.kind === "oil") return pick(["一滴ずつ出せる方が失敗しにくいと思いました", "ポンプの戻りが軽いので朝でも使いやすいです", "瓶はきれいですが、置き場所は少し選びます"], seed);
  if (exp.product.kind.startsWith("wax")) return pick(["朝の短い時間でも開け閉めは気になりません", "ふたの開け閉めは普通で、手についた後でも扱えました", "持ち運び用には少しかさばります"], seed);
  if (exp.product.kind.startsWith("gel")) return pick(["出した後は手を早めに洗えば問題ありません", "チューブから出す量は調整しやすいです", "手に残る感じはありますが、洗えば落ちます"], seed);
  if (exp.product.kind === "treatment") return pick([`${exp.product.shortName}は浴室で使うので、最後まで出しやすいとさらに良いです`, `${exp.product.shortName}は濡れた手でも取りにくさはありません`, `${exp.product.shortName}は置き場所を取らない点は続けやすいです`], seed);
  return pick(["毎日使うものなので、残量が見えると助かります", "ポンプの押し加減で量を調整しやすいです", "浴室で手に取りやすい形だと思いました"], seed);
}

function seasonalSentence(exp: ReviewExperience) {
  if (isStyling(exp.product.kind)) {
    return exp.rating >= 4 ? `湿度が高い日でも形は大きく崩れませんでした` : `汗をかく日は崩れ方が早かったです`;
  }

  if (exp.product.kind === "scalp") {
    return exp.rating >= 4 ? `季節の変わり目でも地肌がつっぱりにくかったです` : `乾燥する日は地肌の違和感が残りました`;
  }

  return exp.rating >= 4 ? pick(["雨の日の帰宅時まで毛先の収まりが続きやすかったです", "耳の後ろの膨らみがいつもより控えめでした", "ブロー直後のまとまりが夕方まで残りました"], hashNumber(exp.product.id), exp.rating) : `湿気の日は広がりが戻りやすいです`;
}

function seasonalFollow(exp: ReviewExperience) {
  if (exp.product.kind === "scalp") {
    return "違和感が完全になくなるわけではないですが、地肌は扱いやすくなりました";
  }

  return `${exp.hairConcern}が完全になくなるわけではないですが、扱いやすくなりました`;
}

function productStrengthSentence(exp: ReviewExperience) {
  if (exp.product.kind === "wax_light") return exp.rating >= 4 ? "軽いセットならちょうどいいです" : "強く動かしたい日は物足りないです";
  if (exp.product.kind === "wax_strong") return exp.rating >= 4 ? "はっきり作りたい日には合います" : "硬さの方が先に気になりました";
  if (exp.product.kind === "gel_light") return exp.rating >= 4 ? "自然な濡れ感なので普段でも使えます" : "濡れ感は出ますが持ちは短めです";
  if (exp.product.kind === "gel_strong") return exp.rating >= 4 ? "束を残したい時はかなり頼れます" : "パリッとした質感が苦手でした";
  return exp.observedEffect ?? "";
}

function keepSentence(exp: ReviewExperience) {
  if (exp.product.kind === "wax_light") return exp.rating >= 4 ? "強すぎないキープで、直しやすいです" : "自然ですがキープ力は弱めでした";
  if (exp.product.kind === "wax_strong") return exp.rating >= 4 ? "キープ力はかなりあります" : "キープはするけれど硬さが目立ちました";
  if (exp.product.kind === "gel_light") return exp.rating >= 4 ? "軽いセットなら夕方まで残ります" : "長時間は少し厳しいです";
  return exp.rating >= 4 ? "固めたい日は安心感があります" : "固まり方が強く、直しにくかったです";
}

function hardnessSentence(exp: ReviewExperience) {
  if (exp.product.kind === "gel_strong" || exp.product.kind === "wax_strong") {
    return exp.rating >= 4 ? "硬さはありますが、狙った形は作れます" : "硬さが強くて手ぐしでは直しにくいです";
  }

  return exp.rating >= 4 ? "固まりすぎないので自然です" : "軽い分、形が残りにくいです";
}

function wetLookSentence(exp: ReviewExperience) {
  if (exp.product.kind === "gel_light") return exp.rating >= 4 ? "濡れ感は自然で、量を増やしてもやりすぎに見えにくいです" : "濡れ感は出ますが、夕方には崩れました";
  if (exp.product.kind === "gel_strong") return exp.rating >= 4 ? "濡れ感とはっきりした束感が一緒に出ます" : "濡れ感より固まり方が先に見えました";
  return exp.rating >= 4 ? "ツヤは出ます" : "ツヤより重さが気になります";
}

function wetDrawbackFollow(exp: ReviewExperience) {
  if (exp.product.kind === "gel_light") return "キープ力を期待すると物足りません";
  if (exp.product.kind === "gel_strong") return "普段使いには固まり方が強いです";
  return "自然に見せるには量が難しいです";
}

function isStyling(kind: ProductKind) {
  return kind === "oil" || kind.startsWith("wax") || kind.startsWith("gel");
}

function extractTags(comment: string, kind: ProductKind, rating: number) {
  const goodRules: Array<[string, RegExp]> = [
    ["泡立ち", /泡/],
    ["すすぎやすさ", /すすぎ|流した|流す|早く終わ/],
    ["頭皮", /頭皮|地肌|かゆみ|つっぱ/],
    ["軽さ", /軽く仕上|軽い|軽め|地肌.*軽|重くなりません|重さは強く出/],
    ["しっとり", /しっとり(?!しすぎ)|保湿感|保湿され/],
    ["指通り", /指通り|引っかかりが少な|手ぐし/],
    ["まとまり", /まとま|収ま|広がり.*(落ち着|抑え)|扱いやす|抑えやす/],
    ["ツヤ", /ツヤ|つや|光/],
    ["香り", /香り/],
    ["使用量", /少量で(足り|十分|自然|ツヤ)|半プッシュ.*(ちょうど|十分|自然)|一滴.*(足り|十分)|量を守ると|量を控えると|少なめから足す|小豆くらい.*(十分|ちょうど)|米粒くらい.*(十分|ちょうど)/],
    ["容器", /ボトル|ポンプ|チューブ|容器|ふた|キャップ/],
    ["キープ力", /キープ力はかなり|夕方まで|形が残る|大きく崩れな/],
    ["束感", /束感(は出しやす|が作りやす|がはっきり|が一緒に出)|はっきりした束感/],
    ["ウェット感", /濡れ感が(自然|出|作りやす)|ウェット感が(自然|出|作りやす)/],
    ["再セット", /再セットしやす|直しやす|整え直せ/],
    ["洗い落ち", /洗い落ち|シャンプーで落ち|洗えば/]
  ];
  const badRules: Array<[string, RegExp]> = [
    ["重さ", /重い|重く|重さ.*気|重さが(出て|先)|ぺた|束になりすぎ/],
    ["価格", /値段|価格|高め|コスト/],
    ["香り", /香り.*迷|香り.*合い|強め|甘さ/],
    ["容器", /容器.*不便|ポンプ.*不便|チューブ.*不便|ふた.*面倒|キャップ.*面倒|取り出し.*面倒|毎日使うには少し面倒|置き場所.*困|開け閉め.*引っかか/],
    ["残り感", /残る感じ|手に残|残りやす/],
    ["洗い落ち", /洗い落ち.*気|二度/],
    ["硬さ", /硬さ|パリ|固まり方|固まりすぎ/],
    ["キープ不足", /キープ.*弱|崩れ(た|方|やす|早)|形が弱|持ちは短/],
    ["量が難しい", /適量|調整しても|量を間違|量が難|量.*迷|多い日|少ない日/],
    ["相性", /合いません|合わな|物足りない|期待した差は出|さっぱり感が弱|強すぎ/]
  ];

  return {
    goodPoints:
      rating <= 2
        ? []
        : trimTags(goodRules.filter(([tag, rule]) => isTagAllowed(tag, kind) && rule.test(comment)).map(([tag]) => tag), comment, "good"),
    badPoints: trimTags(badRules.filter(([tag, rule]) => isTagAllowed(tag, kind) && rule.test(comment)).map(([tag]) => tag), comment, "bad")
  };
}

function isTagAllowed(tag: string, kind: ProductKind) {
  const shampoo = new Set(["泡立ち", "すすぎやすさ", "頭皮", "軽さ", "しっとり", "指通り", "まとまり", "香り", "使用量", "容器", "重さ", "価格", "残り感", "量が難しい", "相性"]);
  const treatment = new Set(["軽さ", "しっとり", "指通り", "まとまり", "ツヤ", "香り", "使用量", "容器", "重さ", "価格", "残り感", "量が難しい", "相性"]);
  const styling = new Set(["ツヤ", "香り", "使用量", "容器", "キープ力", "束感", "ウェット感", "再セット", "洗い落ち", "重さ", "価格", "残り感", "硬さ", "キープ不足", "量が難しい", "相性"]);

  if (kind === "shampoo" || kind === "scalp") return shampoo.has(tag);
  if (kind === "treatment" || kind === "leave_in") return treatment.has(tag);
  return styling.has(tag);
}

function trimTags(tags: string[], comment: string, type: "good" | "bad") {
  const unique = Array.from(new Set(tags));
  const bucket = hashNumber(`${comment}:${type}`) % 100;
  const target = bucket < 5 ? 0 : bucket < 20 ? 1 : bucket < 50 ? 2 : bucket < 80 ? 3 : 4;

  return unique.slice(0, Math.min(target, unique.length));
}

function quoteRejectionReasons(quote: DemoQuote, stats: ReviewPhraseStats, globalStats: ReviewPhraseStats[], productStats: ReviewPhraseStats[], product: ProductDefinition) {
  const reasons: string[] = [];
  const normalized = stats.usedPhrases[0];
  const recent = globalStats.slice(-20);

  if (globalStats.some((item) => item.usedPhrases[0] === normalized)) reasons.push("exact");
  if (recent.some((item) => item.normalizedOpening === stats.normalizedOpening)) reasons.push("opening");
  if (globalStats.some((item) => item.sentences.some((sentence) => sentence.length >= 8 && stats.sentences.includes(sentence)))) reasons.push("sentence");
  if (productStats.slice(-2).some((item) => item.topic === stats.topic)) reasons.push("recent-topic");
  if (productStats.slice(-8).some((item) => item.topic === stats.topic && item.structureType === stats.structureType && item.writingStyle === stats.writingStyle)) reasons.push("topic-structure-style");
  if (globalStats.some((item) => jaccard(ngrams(normalized, 3), ngrams(item.usedPhrases[0], 3)) > 0.45)) reasons.push("similarity");
  if (globalStats.some((item) => overlappingSignificantPhrases(stats.usedPhrases, item.usedPhrases) >= 5)) reasons.push("phrase");
  if (stats.ending.length >= 8 && globalStats.filter((item) => item.ending === stats.ending).length >= 2) reasons.push("ending");
  if (stats.effectKey && productStats.filter((item) => item.effectKey === stats.effectKey).length >= 2) reasons.push("effect");
  if (hasRestrictedPhraseOveruse(quote.comment, globalStats)) reasons.push("restricted");
  if (!japaneseTextLooksValid(quote.comment)) reasons.push("japanese");
  if (!categoryUsageLooksValid(quote.comment, quote.topic, quote.rating, quote.goodPoints, quote.badPoints, product)) reasons.push("usage");
  if (!tagsLookConsistent(quote.comment, quote.rating, quote.goodPoints, quote.badPoints)) reasons.push("tags");
  if (!ratingTextLooksValid(quote.rating, quote.comment)) reasons.push("rating");

  return reasons;
}

function phraseStats(comment: string, exp: ReviewExperience): ReviewPhraseStats {
  const normalized = normalizeForSimilarity(comment);
  const sentences = splitNormalizedSentences(comment);

  return {
    normalizedOpening: normalized.slice(0, 10),
    usedPhrases: [normalized, ...significantPhrases(normalized)],
    sentences,
    topic: exp.topic,
    structureType: exp.structureType,
    writingStyle: exp.writingStyle,
    ending: sentenceEndingKey(comment),
    effectKey: effectKeyFor(comment, exp.product)
  };
}

function hasRestrictedPhraseOveruse(comment: string, stats: ReviewPhraseStats[]) {
  const restricted = [
    "前回来店後に",
    "個人的には",
    "思ったより",
    "家族に褒められました",
    "サロン帰り",
    "もう少し様子を見たい",
    "次回も使い方を聞きたい",
    "量はまだ調整中",
    "価格は安くないですが",
    "ドラッグストアで買っていたものより",
    "前にサロンで買ったものより",
    "仕事の日でも使いやすい",
    "朝のアイロン時間が短くなった",
    "コスパは良い方だと思う",
    "続けてもいいかも"
  ];

  const usedInComment = restricted.filter((phrase) => comment.includes(phrase));
  if (usedInComment.length >= 2) return true;

  const total = stats.length + 1;
  return usedInComment.some((phrase) => {
    const normalized = normalizeForSimilarity(phrase);
    const count = stats.filter((item) => item.usedPhrases[0].includes(normalized)).length + 1;
    return count / total > 0.02;
  });
}

function categoryUsageLooksValid(comment: string, topic: string, rating: number, goodPoints: string[], badPoints: string[], product: ProductDefinition) {
  if (/ワックス.*乾かす前|ジェル.*補修|スタイリング剤.*3回ほど.*変化|シャンプー.*キープ力/.test(comment)) return false;
  if (/トリートメント.*朝のアイロン時間が短くなった/.test(comment)) return false;
  if (rating <= 2 && goodPoints.length > badPoints.length + 1) return false;
  if (rating >= 5 && /合いません|続けるのは難しい|使用をやめ/.test(comment)) return false;
  if ((topic === "キープ" || topic === "硬さ" || topic === "ウェット感") && /効果はこれから/.test(comment)) return false;
  if (product.productType === "rinse_off_treatment" && /朝につけ|朝だけ使|乾かす前|仕上げに|アウトバス|流さず|つけっぱなし|セット|束感を作|泡切れ|泡立て/.test(comment)) return false;
  if (product.productType === "leave_in_treatment" && /流した|流す|すすぎ|すすぐ|放置時間|時間を置いてから流|浴室で使う|泡立て|洗う/.test(comment)) return false;
  if (product.productType === "shampoo" && /束感|キープ|セット|仕上げに|朝につけ|乾かす前につけ/.test(comment)) return false;
  if ((product.productType === "wax" || product.productType === "gel") && /補修|数日|3回ほど|一週間くらい|流した後|すすいだ|浴室|乾かす前/.test(comment)) return false;
  if (product.productType === "oil" && /補修|泡立て|洗う|流した|すすいだ|放置時間/.test(comment)) return false;
  if (!product.validUsageMethods.length || !product.productType || product.productType === "other") return false;
  return true;
}

function japaneseTextLooksValid(comment: string) {
  if (/にだけで|時で使う|寄り感じ|量の慣れが必要|短く流すと残る感じ|急いで流した日より|普通ところ|きれいところ|軽い点|強い日は軽い|残るです|薄くを|中間から毛先だけを使|毛先を中心に中間から毛先|ました点|はで、/.test(comment)) return false;
  if (/^ただ、|。ただ、|、ただ、/.test(comment)) return false;
  if (/より、?。|より$/.test(comment)) return false;
  if (/価格。|ツヤの時|メンズが前より|やや固まるな感じ|シャンプ[^ー]|トリートメン(?!ト)/.test(comment)) return false;

  const sentences = comment
    .split("。")
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  return sentences.every((sentence) => {
    if (sentence.length < 8 && !/[。]/.test(`${sentence}。`)) return false;
    if (/^[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]{1,8}$/u.test(sentence) && !/(良い|悪い|好き|苦手|十分|普通|買う|予定|続け|候補|リピート|使う)/.test(sentence)) return false;
    if (/より/.test(sentence) && !/(比べ|前の|以前|市販|家で使っていた|ドラッグストア|オイル|ワックス|ジェル|シャンプー|トリートメント)/.test(sentence)) return false;
    return true;
  });
}

function tagsLookConsistent(comment: string, rating: number, goodPoints: string[], badPoints: string[]) {
  if (rating >= 5 && badPoints.includes("相性")) return false;
  if (rating <= 2 && goodPoints.length > 0) return false;
  if (/量の調整|適量|量を減ら|多い日|少ない日|量を間違|調整しても/.test(comment) && goodPoints.includes("使用量") && !badPoints.includes("量が難しい")) return false;
  if (/重い|重さ|ぺた/.test(comment) && !/重くなりにくい|重くなりません|重さが強くありません|重さが強く出ません/.test(comment) && goodPoints.includes("軽さ")) return false;
  if (/香り.*合いにくい|香り.*迷|甘さ/.test(comment) && goodPoints.includes("香り") && !badPoints.includes("香り")) return false;
  if (/合いません|合わな|続けるのは難しい|リピートはしません/.test(comment) && rating >= 4) return false;
  return true;
}

function ratingTextLooksValid(rating: number, comment: string) {
  if (rating <= 2 && /また買う予定|次も同じ|満足です|かなり良い|頼れます/.test(comment)) return false;
  if (rating === 1 && /使いやす|取り出しやす|助かります|大丈夫|一番良かった|印象に残りました|良いです/.test(comment)) return false;
  if (rating === 2 && /一番良かった|迷わず|また買う予定/.test(comment)) return false;
  if (rating >= 5 && !/また買|続け|迷わず|合っています|はっきり|一番良かった|普段のケア|頼れ|十分|良かった|使いやす|扱いやす|直しやす|分かりやす|なじませやす|きれい|楽|助か|日常/.test(comment)) return false;
  if (rating >= 4 && /リピートはしません|一度で使用をやめ|かなり合いません|続けるのは難しい/.test(comment)) return false;
  if (rating === 3 && /最高|絶対|かなり合いません/.test(comment)) return false;
  return true;
}

function splitNormalizedSentences(comment: string) {
  return comment
    .split("。")
    .map((sentence) => normalizeForSimilarity(sentence))
    .filter((sentence) => sentence.length >= 8);
}

function sentenceEndingKey(comment: string) {
  const sentences = splitNormalizedSentences(comment);
  const last = sentences.length > 0 ? sentences[sentences.length - 1] : normalizeForSimilarity(comment);
  return stripCommonWords(last).slice(-12);
}

function effectKeyFor(comment: string, product: ProductDefinition) {
  const normalized = normalizeForSimilarity(comment);
  const rules: Array<[string, RegExp]> = [
    ["rinse-after", /流した後|すすいだ後|指通り/],
    ["drying-tangle", /乾か.*絡|引っかかり/],
    ["next-morning", /翌朝|寝ぐせ|朝.*楽/],
    ["humidity", /湿気|雨の日|湿度|膨らみ/],
    ["root-heavy", /根元|ぺた|重/],
    ["amount-control", /少量|半量|適量|量/],
    ["fragrance", /香り|甘さ/],
    ["hold", /キープ|夕方|形/],
    ["bundle", /束感|毛束/],
    ["shine", /ツヤ|光/],
    ["wash-off", /洗い落ち|二度|手に残/],
    ["price", /価格|値段|コスト/]
  ];
  const matched = rules.find(([, rule]) => rule.test(normalized));
  const specificPart = splitNormalizedSentences(comment)
    .map((sentence) => stripCommonWords(sentence))
    .find((sentence) => sentence.length >= 12)
    ?.slice(0, 18);

  return matched ? `${product.id}:${matched[0]}:${specificPart ?? normalized.slice(0, 18)}` : `${product.id}:${normalized.slice(0, 18)}`;
}

function significantPhrases(normalized: string) {
  const clean = stripCommonWords(normalized);
  if (clean.length < 24) return [];

  const phrases = new Set<string>();

  for (let size = 8; size <= 14; size += 2) {
    for (let index = 0; index <= clean.length - size; index += 1) {
      const phrase = clean.slice(index, index + size);
      if (phrase.length >= 8 && !isIgnoredRepeatedPhrase(phrase)) phrases.add(phrase);
    }
  }

  return Array.from(phrases).slice(0, 20);
}

function isIgnoredRepeatedPhrase(phrase: string) {
  if (/家で使っていた|使っていた|比べ|いつもの手順|少し時間|時間を置|違いを見|毛先中心|なくなる速度|許容範囲|次も使う|候補に入|続けたい|続けます/.test(phrase)) return true;
  return /^(良|悪|普通|自分|使|感じ|毛先|香り|価格|髪|少量|今回|前回|商品|トリートメント|シャンプー|ワックス|ジェル|オイル)+$/.test(phrase);
}

function overlappingSignificantPhrases(left: string[], right: string[]) {
  const rightSet = new Set(right.slice(1));
  return left.slice(1).filter((phrase) => rightSet.has(phrase)).length;
}

function ngrams(value: string, size: number) {
  const clean = stripCommonWords(value);
  if (clean.length <= size) return [clean];

  return Array.from({ length: clean.length - size + 1 }, (_, index) => clean.slice(index, index + size));
}

function jaccard(left: string[], right: string[]) {
  const leftSet = new Set(left);
  const rightSet = new Set(right);
  const intersection = Array.from(leftSet).filter((item) => rightSet.has(item)).length;
  const union = new Set([...leftSet, ...rightSet]).size;

  return union === 0 ? 0 : intersection / union;
}

function stripCommonWords(value: string) {
  return value.replace(
    /Aujua|オージュア|グローバルミルボン|クエンチ|フィルメロウ|リペアリティ|イミュライズ|タイムサージ|ディオーラム|アクアヴィア|スムース|インメトリィ|エイジングスパ|モイストカーム|オーセナム|グロウシブ|プレセディア|ポリッシングオイル|ワックス4|ワックス7|ジェルクリーム5|ジェルクリーム8|シャンプー|トリートメント|アウトバス|オイル|ワックス|ジェルクリーム|この商品|これ|自分|髪|毛先|少し|使いやすい|使いました|使う|感じ|ところ|です|ます|ました|なら|ので|けれど|ただ|かなり|前より/g,
    ""
  );
}

function normalizeForSimilarity(value: string) {
  return value
    .normalize("NFKC")
    .replace(/[、。・「」『』（）()!！?？\s]/g, "")
    .replace(/[ァ-ン]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0x60))
    .trim();
}

function normalizeComment(comment: string) {
  return comment
    .replace(/\s+/g, " ")
    .replace(/。。+/g, "。")
    .replace(/、。/g, "。")
    .replace(/です気がします/g, "だと思います")
    .replace(/ます気がします/g, "る気がします")
    .replace(/でした気がします/g, "だった気がします")
    .trim();
}

function rankingFromTags(quotes: DemoQuote[], key: "goodPoints" | "badPoints", fallback: string[]) {
  const counts = new Map<string, number>();

  for (const quote of quotes) {
    for (const tag of quote[key]) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  if (counts.size === 0) {
    return ranking(fallback, quotes.length, 6);
  }

  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "ja"))
    .slice(0, 8);
}

function ranking(labels: string[], total: number, cap = 8): RankingItem[] {
  return labels.slice(0, cap).map((label, index) => ({
    label,
    count: Math.max(1, Math.round(total * (0.43 - index * 0.045)))
  }));
}

function average(values: number[]) {
  return Math.round((values.reduce((total, value) => total + value, 0) / Math.max(1, values.length)) * 10) / 10;
}

function rate(numerator: number, denominator: number) {
  return Math.round((numerator / Math.max(1, denominator)) * 100) / 100;
}

function ratingBreakdown(values: number[]): RatingBreakdown {
  return {
    star1: values.filter((rating) => rating === 1).length,
    star2: values.filter((rating) => rating === 2).length,
    star3: values.filter((rating) => rating === 3).length,
    star4: values.filter((rating) => rating === 4).length,
    star5: values.filter((rating) => rating === 5).length
  };
}

function buildProductReport(definition: ProductDefinition, stats: ReviewPhraseStats[]): DemoProduct {
  const reviewCount = reviewCountFor(definition);
  const quoteDetails = buildQuoteDetails(definition, reviewCount, stats);
  const ratings = quoteDetails.map((quote) => quote.rating);
  const purchasedCount = Math.round(reviewCount * 2.5 + ((reviewCount % 3) - 1));
  const repeatYesCount = ratings.filter((rating) => rating >= 4).length;

  return {
    productId: definition.id,
    productName: definition.name,
    brandName: definition.brand,
    seriesName: definition.seriesName,
    productType: definition.productType,
    usageTiming: definition.usageTiming,
    rinseRequired: definition.rinseRequired,
    validUsageMethods: definition.validUsageMethods,
    invalidUsageMethods: definition.invalidUsageMethods,
    category: definition.category,
    proposalCount: purchasedCount,
    sampleGivenCount: 0,
    purchasedCount,
    usedInServiceCount: 0,
    reviewRequestCount: reviewCount,
    reviewCount,
    usedCount: reviewCount,
    notYetCount: 0,
    forgotCount: 0,
    averageRating: average(ratings),
    ratingBreakdown: ratingBreakdown(ratings),
    repeatIntentYesRate: rate(repeatYesCount, reviewCount),
    goodPointRanking: rankingFromTags(quoteDetails, "goodPoints", definition.strengths),
    badPointRanking: rankingFromTags(quoteDetails, "badPoints", definition.mildDrawbacks),
    concernTagBreakdown: ranking(definition.concerns, reviewCount),
    anonymousQuoteCount: quoteDetails.length,
    anonymousQuotes: quoteDetails.map((quote) => quote.comment),
    anonymousQuoteDetails: quoteDetails,
    commentsHiddenReason: null
  };
}

function reviewCountFor(definition: ProductDefinition) {
  if (definition.id === "demo-aujua-aquaveer") return 36;

  const capped = Math.min(definition.reviewCount, MAX_PRODUCT_REVIEW_COMMENTS);
  if (definition.reviewCount <= MAX_PRODUCT_REVIEW_COMMENTS) return definition.reviewCount;

  return Math.max(14, capped - (hashNumber(definition.id) % 4));
}

function pick<T>(values: readonly T[], seed: string | number, salt = 0) {
  return values[Math.abs(choiceSeed(seed, salt)) % values.length];
}

function choiceSeed(value: string | number, salt = 0) {
  return typeof value === "number" ? value + salt * 101 : hashNumber(`${value}:${salt}`);
}

function hashNumber(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619) >>> 0;
  }

  return hash;
}

export function validateDemoManufacturerReviews(report: { products: Array<{ productName: string; anonymousQuoteDetails: DemoQuote[] }> }) {
  const productByName = new Map(PRODUCTS.map((product) => [product.name, product]));
  const comments = report.products.flatMap((product) =>
    product.anonymousQuoteDetails.map((quote) => ({
      productName: product.productName,
      product: productByName.get(product.productName),
      comment: quote.comment,
      rating: quote.rating,
      goodPoints: quote.goodPoints,
      badPoints: quote.badPoints,
      topic: quote.topic,
      structureType: quote.structureType,
      writingStyle: quote.writingStyle
    }))
  );
  const normalized = comments.map((item) => normalizeForSimilarity(item.comment));
  const duplicateCount = normalized.length - new Set(normalized).size;
  const openingViolations = normalized.filter((comment, index) =>
    normalized.slice(Math.max(0, index - 20), index).some((previous) => previous.slice(0, 10) === comment.slice(0, 10))
  ).length;
  const sentenceCounts = new Map<string, number>();
  const endingCounts = new Map<string, number>();
  const effectCounts = new Map<string, number>();
  let highSimilarityPairs = 0;
  let phraseOverlapPairs = 0;
  let duplicateSentenceCount = 0;
  let duplicatePhrasePairs = 0;
  let ratingTagContradictions = 0;
  let productUsageContradictions = 0;
  let japaneseValidationFailures = 0;
  const highSimilarityExamples: Array<{ left: string; right: string }> = [];
  const phraseOverlapExamples: Array<{ left: string; right: string }> = [];

  for (const item of comments) {
    const product = item.product;
    const sentences = splitNormalizedSentences(item.comment);
    const ending = sentenceEndingKey(item.comment);
    const effect = product ? effectKeyFor(item.comment, product) : "";

    for (const sentence of sentences) {
      sentenceCounts.set(sentence, (sentenceCounts.get(sentence) ?? 0) + 1);
    }

    if (ending) endingCounts.set(ending, (endingCounts.get(ending) ?? 0) + 1);
    if (effect) effectCounts.set(effect, (effectCounts.get(effect) ?? 0) + 1);
    if (!japaneseTextLooksValid(item.comment)) japaneseValidationFailures += 1;
    if (!tagsLookConsistent(item.comment, item.rating, item.goodPoints, item.badPoints)) ratingTagContradictions += 1;
    if (!product || !categoryUsageLooksValid(item.comment, item.topic, item.rating, item.goodPoints, item.badPoints, product)) productUsageContradictions += 1;
  }

  duplicateSentenceCount = Array.from(sentenceCounts.values()).filter((count) => count > 1).reduce((total, count) => total + count - 1, 0);

  for (let index = 0; index < normalized.length; index += 1) {
    for (let otherIndex = index + 1; otherIndex < normalized.length; otherIndex += 1) {
      if (
        stripCommonWords(normalized[index]).length >= 24 &&
        stripCommonWords(normalized[otherIndex]).length >= 24 &&
        jaccard(ngrams(normalized[index], 3), ngrams(normalized[otherIndex], 3)) > 0.45
      ) {
        highSimilarityPairs += 1;
        if (highSimilarityExamples.length < 5) {
          highSimilarityExamples.push({ left: comments[index].comment, right: comments[otherIndex].comment });
        }
      }

      if (overlappingSignificantPhrases(significantPhrases(normalized[index]), significantPhrases(normalized[otherIndex])) >= 5) {
        phraseOverlapPairs += 1;
        duplicatePhrasePairs += 1;
        if (phraseOverlapExamples.length < 5) {
          phraseOverlapExamples.push({ left: comments[index].comment, right: comments[otherIndex].comment });
        }
      }
    }
  }

  return {
    total: comments.length,
    unique: normalized.length - duplicateCount,
    duplicateCount,
    openingViolations,
    highSimilarityPairs,
    phraseOverlapPairs,
    duplicateSentenceCount,
    duplicatePhrasePairs,
    semanticEffectMaxCount: Math.max(0, ...Array.from(effectCounts.values())),
    endingOveruseCount: Array.from(endingCounts.values()).filter((count) => count >= 3).length,
    ratingTagContradictions,
    productUsageContradictions,
    japaneseValidationFailures,
    highSimilarityExamples,
    phraseOverlapExamples
  };
}

export function getDemoManufacturerProductFeedbackReport({
  manufacturer,
  from,
  to
}: {
  manufacturer: string;
  from?: Date;
  to?: Date;
}) {
  const stats: ReviewPhraseStats[] = [];
  const products = PRODUCTS.map((definition) => buildProductReport(definition, stats));

  return {
    manufacturer,
    demo: true,
    respondentCount: DEMO_RESPONDENT_COUNT,
    demoNotice: "このレポートはデモ用の匿名集計レビューです。実在のお客様の口コミではありません。",
    period: {
      from: from?.toISOString() ?? null,
      to: to?.toISOString() ?? null
    },
    products
  };
}
