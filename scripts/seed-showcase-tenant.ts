import { createHash } from "node:crypto";
import { PrismaClient, type AppRole } from "@prisma/client";
import { hashScryptPassword } from "../src/lib/auth/password";
import {
  SHOWCASE_ORGANIZATION_ID,
  SHOWCASE_ORGANIZATION_SLUG
} from "../src/lib/demo/showcase-tenant";

const prisma = new PrismaClient();
const PREFIX = "showcase-yohaku";
const OWNER_LOGIN_ID = "demo.owner";
const OWNER_PASSWORD = "LienDemo2026!";
const CUSTOMER_LOGIN_ID = "demo.hana";
const CUSTOMER_PASSWORD = "Mypage2026!";

function id(kind: string, index?: number) {
  return index === undefined ? `${PREFIX}-${kind}` : `${PREFIX}-${kind}-${String(index).padStart(3, "0")}`;
}

function addDays(value: Date, days: number) {
  return new Date(value.getTime() + days * 86_400_000);
}

function addMonths(value: Date, months: number) {
  const next = new Date(value);
  next.setMonth(next.getMonth() + months);
  return next;
}

function atJst(date: Date, hour: number, minute = 0) {
  const key = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
  return new Date(`${key}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+09:00`);
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

type StaffSeed = {
  key: string;
  name: string;
  role: AppRole;
  title: string;
  loginId: string;
  email: string;
  concurrency: number;
};

const staff: StaffSeed[] = [
  {
    key: "amemiya",
    name: "雨宮 透",
    role: "ADMIN",
    title: "オーナースタイリスト",
    loginId: OWNER_LOGIN_ID,
    email: "owner@yohaku.invalid",
    concurrency: 2
  },
  {
    key: "takase",
    name: "高瀬 美月",
    role: "STAFF",
    title: "トップスタイリスト",
    loginId: "demo.mizuki",
    email: "mizuki@yohaku.invalid",
    concurrency: 1
  },
  {
    key: "manabe",
    name: "真鍋 蓮",
    role: "STAFF",
    title: "スタイリスト",
    loginId: "demo.ren",
    email: "ren@yohaku.invalid",
    concurrency: 1
  },
  {
    key: "shiraishi",
    name: "白石 直子",
    role: "STAFF",
    title: "ケアリスト",
    loginId: "demo.naoko",
    email: "naoko@yohaku.invalid",
    concurrency: 1
  }
];

const menus = [
  ["似合わせカット", "カット", 60, 5500, "前髪の1ミリまで相談できる定番カット"],
  ["前髪メンテナンス", "カット", 20, 1800, "伸びた前髪だけを整えるショートメニュー"],
  ["透明感カラー", "カラー", 100, 8800, "肌映りに合わせたやわらかなカラー"],
  ["カット + 透明感カラー", "セット", 150, 13200, "カットとカラーの人気セット"],
  ["髪質ケアトリートメント", "トリートメント", 45, 5500, "手触りとまとまりを整える集中ケア"],
  ["カット + 髪質ケア", "セット", 105, 9900, "扱いやすさを重視したメンテナンス"],
  ["ニュアンスパーマ", "パーマ", 140, 12100, "乾かすだけで動きが出るやわらかなパーマ"],
  ["頭皮リセットスパ", "ヘッドスパ", 40, 4400, "頭皮の乾燥や疲れをいたわるケア"],
  ["メンズカット + 眉", "メンズ", 70, 6600, "清潔感をまとめて整えるメニュー"],
  ["特別な日のヘアセット", "セット", 60, 6600, "結婚式や撮影前のヘアアレンジ"]
] as const;

const products = [
  ["YOHACK", "余白モイスチャーシャンプー", "シャンプー", 3300, 18, ["乾燥", "広がり"], "泡立ちがやさしく、乾燥しやすい髪をしっとり洗います。", "重く感じる場合は、風通しシャンプーを提案"],
  ["YOHACK", "風通しスカルプシャンプー", "シャンプー", 3080, 12, ["頭皮", "べたつき"], "根元をすっきり洗いながら毛先のきしみを抑えます。", "乾燥が強い場合は、余白モイスチャーを提案"],
  ["mellow lab", "雨音リペアトリートメント", "トリートメント", 3520, 15, ["ダメージ", "カラー後"], "カラー後の毛先をなめらかに整える洗い流すケア。", "細い髪には、月灯りライトマスクを少量で提案"],
  ["mellow lab", "月灯りライトマスク", "トリートメント", 3740, 8, ["絡まり", "細毛"], "重くなりにくく、指通りを整える軽めのマスク。", "ハイダメージには、雨音リペアを提案"],
  ["Nagi", "朝凪ヘアミルク", "アウトバス", 2860, 21, ["乾燥", "まとまり"], "ドライヤー前に使う、やわらかな質感のミルク。", "ツヤを強く出したい場合は、夜更かしオイルを提案"],
  ["Nagi", "夜更かしヘアオイル", "アウトバス", 3190, 10, ["ツヤ", "毛先"], "少量で毛先のツヤと束感を整えるオイル。", "重く感じる場合は、朝凪ヘアミルクを提案"],
  ["comma", "前髪キープバーム", "スタイリング剤", 2420, 6, ["前髪", "束感"], "固めすぎず、前髪の束感を保ちます。", "キープ力が足りない場合は、句読点ワックス7を提案"],
  ["comma", "句読点ワックス4", "スタイリング剤", 2640, 9, ["動き", "再セット"], "自然な動きと再セットのしやすさを両立。", "強い束感には、句読点ワックス7を提案"],
  ["comma", "句読点ワックス7", "スタイリング剤", 2640, 7, ["キープ", "束感"], "ショートやパーマを夕方までしっかりキープ。", "やわらかな仕上がりには、句読点ワックス4を提案"],
  ["YOHACK", "10分だけ頭皮セラム", "その他", 3850, 4, ["頭皮", "乾燥"], "お風呂上がりの頭皮を保湿する美容液。", "べたつきが気になる場合は、風通しシャンプーから提案"],
  ["ミルボン", "オージュア クエンチ シャンプー", "シャンプー", 3080, 14, ["乾燥", "カラー後"], "乾燥しやすい髪をやさしく洗い、毛先の扱いやすさを整えます。", "軽さを優先する場合は、風通しスカルプシャンプーを提案"],
  ["ミルボン", "オージュア クエンチ トリートメント", "トリートメント", 4180, 11, ["パサつき", "ダメージ"], "カラー後のパサつきが気になる毛先へなじませる洗い流すケア。", "重さが気になる場合は、月灯りライトマスクを少量で提案"],
  ["YOHACK", "朝露バランスシャンプー", "シャンプー", 2970, 16, ["細毛", "根元"], "細い髪の根元をつぶしにくく、軽い洗い上がりに整えます。", "乾燥が強い場合は、余白モイスチャーを提案"],
  ["YOHACK", "夕凪ディープクレンズ", "シャンプー", 3190, 7, ["皮脂", "におい"], "スタイリング剤や皮脂をすっきり落とす週末向けシャンプー。", "毎日使う場合は、朝露バランスを提案"],
  ["mellow lab", "木漏れ日スムーストリートメント", "トリートメント", 3410, 13, ["絡まり", "指通り"], "毛先になじませやすく、すすいだ後の指通りを軽く整えます。", "乾燥が強い場合は、深呼吸リペアマスクを提案"],
  ["mellow lab", "深呼吸リペアマスク", "トリートメント", 4290, 6, ["ハイダメージ", "ブリーチ"], "ブリーチ部分のごわつきを集中してケアする週1回のマスク。", "細い髪には、木漏れ日スムースを提案"],
  ["Nagi", "薄明ヘアセラム", "アウトバス", 3300, 17, ["熱ダメージ", "手触り"], "アイロン前にも使える、さらっと伸びる保護セラム。", "ツヤを強く出したい場合は、夜更かしヘアオイルを提案"],
  ["Nagi", "小雨モイスチャーミスト", "アウトバス", 2530, 20, ["寝ぐせ", "乾燥"], "朝の寝ぐせ直しと水分補給を一度にできる軽いミスト。", "毛先の乾燥が強い場合は、朝凪ヘアミルクを重ねて提案"],
  ["comma", "余韻ジェル5", "スタイリング剤", 2750, 11, ["ウェット感", "束感"], "固めすぎず、自然な濡れ感と束感を作るジェル。", "強いキープには、句読点ワックス7を提案"],
  ["YOHACK", "めぐり頭皮ローション", "その他", 3630, 9, ["頭皮", "保湿"], "お風呂上がりに使う、べたつきにくい頭皮用ローション。", "洗浄から見直す場合は、風通しスカルプシャンプーを提案"]
] as const;

const customerSeeds = [
  ["森川 はな", "女性", "1993-04-18", "000-7100-0001", "静かに過ごしたい", "assigned", "高瀬 美月"],
  ["藤野 佳澄", "女性", "1988-11-02", "000-7100-0002", "適度に話したい", "assigned", "雨宮 透"],
  ["小泉 奈央", "女性", "1999-07-27", "000-7100-0003", "適度に話したい", "assigned", "白石 直子"],
  ["青木 遼", "男性", "1990-01-14", "000-7100-0004", "静かに過ごしたい", "assigned", "真鍋 蓮"],
  ["水野 千紘", "女性", "1984-06-09", "000-7100-0005", "適度に話したい", "free", null],
  ["笹原 悠真", "男性", "1996-09-22", "000-7100-0006", "適度に話したい", "assigned", "真鍋 蓮"],
  ["春日井 みのり", "女性", "1978-03-30", "000-7100-0007", "静かに過ごしたい", "assigned", "雨宮 透"],
  ["成瀬 琴葉", "女性", "2001-12-11", "000-7100-0008", "適度に話したい", "assigned", "高瀬 美月"],
  ["大庭 颯太", "男性", "1987-05-05", "000-7100-0009", "静かに過ごしたい", "free", null],
  ["北村 ひより", "女性", "1995-02-19", "000-7100-0010", "適度に話したい", "assigned", "白石 直子"],
  ["岸本 皐月", "女性", "1982-10-08", "000-7100-0011", "静かに過ごしたい", "assigned", "雨宮 透"],
  ["瀬戸口 湊", "男性", "2000-08-16", "000-7100-0012", "適度に話したい", "assigned", "真鍋 蓮"],
  ["間宮 栞", "女性", "1991-04-01", "000-7100-0013", "適度に話したい", "assigned", "高瀬 美月"],
  ["戸川 由依", "女性", "1986-12-25", "000-7100-0014", "静かに過ごしたい", "free", null],
  ["長峰 壮一郎", "男性", "1975-07-12", "000-7100-0015", "適度に話したい", "assigned", "雨宮 透"],
  ["望月 紬", "女性", "2003-05-21", "000-7100-0016", "適度に話したい", "assigned", "白石 直子"],
  ["河合 晴美", "女性", "1969-09-03", "000-7100-0017", "静かに過ごしたい", "assigned", "雨宮 透"],
  ["神谷 朔", "男性", "1998-02-07", "000-7100-0018", "静かに過ごしたい", "assigned", "真鍋 蓮"],
  ["野々村 梨沙", "女性", "1994-06-28", "000-7100-0019", "適度に話したい", "assigned", "高瀬 美月"],
  ["浦田 航平", "男性", "1981-01-31", "000-7100-0020", "適度に話したい", "free", null],
  ["杉浦 こはる", "女性", "2000-11-15", "000-7100-0021", "適度に話したい", "assigned", "白石 直子"],
  ["松永 美緒", "女性", "1989-03-13", "000-7100-0022", "静かに過ごしたい", "assigned", "高瀬 美月"],
  ["滝本 奏多", "男性", "1992-08-04", "000-7100-0023", "適度に話したい", "assigned", "真鍋 蓮"],
  ["村瀬 愛里", "女性", "1979-05-24", "000-7100-0024", "適度に話したい", "assigned", "雨宮 透"],
  ["奥田 芽衣", "女性", "1997-10-29", "000-7100-0025", "静かに過ごしたい", "assigned", "高瀬 美月"],
  ["片桐 謙太", "男性", "1985-12-06", "000-7100-0026", "適度に話したい", "free", null],
  ["榎本 知世", "女性", "1973-04-12", "000-7100-0027", "静かに過ごしたい", "assigned", "雨宮 透"],
  ["立花 結菜", "女性", "2002-01-23", "000-7100-0028", "適度に話したい", "assigned", "白石 直子"],
  ["三宅 亮介", "男性", "1988-06-17", "000-7100-0029", "静かに過ごしたい", "assigned", "真鍋 蓮"],
  ["本多 真帆", "女性", "1990-09-10", "000-7100-0030", "適度に話したい", "assigned", "高瀬 美月"],
  ["平松 沙耶", "女性", "1983-02-26", "000-7100-0031", "静かに過ごしたい", "assigned", "雨宮 透"],
  ["塩谷 直樹", "男性", "1995-07-08", "000-7100-0032", "適度に話したい", "free", null],
  ["石原 咲良", "女性", "1998-12-19", "000-7100-0033", "適度に話したい", "assigned", "白石 直子"],
  ["安西 玲", "女性", "1976-05-01", "000-7100-0034", "静かに過ごしたい", "assigned", "雨宮 透"],
  ["日高 旭", "男性", "2001-03-09", "000-7100-0035", "適度に話したい", "assigned", "真鍋 蓮"],
  ["倉田 まどか", "女性", "1987-08-27", "000-7100-0036", "適度に話したい", "assigned", "高瀬 美月"]
] as const;

type DemoReviewFixture = {
  category: "シャンプー" | "トリートメント" | "アウトバス" | "スタイリング剤" | "その他";
  rating: 1 | 2 | 3 | 4 | 5;
  goodPoints: string[];
  badPoints: string[];
  repeatIntent: "yes" | "maybe" | "no";
  comment: string;
};

const reviewFixtures: DemoReviewFixture[] = [
  { category: "シャンプー", rating: 5, goodPoints: ["泡立ち", "指通り"], badPoints: [], repeatIntent: "yes", comment: "少ない量でも泡がへたらず、耳の後ろまで洗いやすかったです。乾かす途中の引っかかりも減ったので続けます。" },
  { category: "シャンプー", rating: 4, goodPoints: ["洗い上がり"], badPoints: ["香り"], repeatIntent: "yes", comment: "洗ったあとの根元が軽く、夕方のべたつきも前ほど気になりません。香りは最初だけ少し強く感じました。" },
  { category: "シャンプー", rating: 4, goodPoints: ["しっとり感", "すすぎやすさ"], badPoints: [], repeatIntent: "yes", comment: "すすぎに時間がかからないのに、毛先はぱさつきませんでした。冬場に使いやすい洗い上がりです。" },
  { category: "シャンプー", rating: 3, goodPoints: ["泡立ち"], badPoints: ["ボトル"], repeatIntent: "maybe", comment: "泡立ちは十分です。濡れた手だとポンプが少し滑るので、容器はもう少し押しやすいと助かります。" },
  { category: "シャンプー", rating: 5, goodPoints: ["頭皮", "軽さ"], badPoints: [], repeatIntent: "yes", comment: "帽子をかぶった日の夜でも頭皮がさっぱりしました。強く洗った感じはなく、翌朝の根元もふわっとしています。" },
  { category: "シャンプー", rating: 4, goodPoints: ["香り", "泡切れ"], badPoints: ["価格"], repeatIntent: "maybe", comment: "泡切れがよく、朝シャンでも使いやすいです。香りの残り方も好みですが、毎日使う価格としては少し迷います。" },
  { category: "シャンプー", rating: 3, goodPoints: ["洗浄力"], badPoints: ["乾燥"], repeatIntent: "maybe", comment: "スタイリング剤は一度で落ちました。ただ、毛先まで同じように洗うと乾燥するので、週末だけ使っています。" },
  { category: "シャンプー", rating: 5, goodPoints: ["絡まり", "まとまり"], badPoints: [], repeatIntent: "yes", comment: "洗っている最中に髪が絡みにくく、長い髪でも指を通しやすかったです。翌朝の寝ぐせ直しも短く済みました。" },
  { category: "シャンプー", rating: 4, goodPoints: ["低刺激", "香り"], badPoints: [], repeatIntent: "yes", comment: "頭皮が敏感な時期でも刺激を感じませんでした。香りは乾かすと控えめになるので、仕事の前でも使えます。" },
  { category: "シャンプー", rating: 2, goodPoints: ["泡立ち"], badPoints: ["重さ", "相性"], repeatIntent: "no", comment: "泡は作りやすかったのですが、私の細い髪では乾かしたあとに根元がぺたっとしました。量を減らしても合わなかったので再購入はしません。" },
  { category: "シャンプー", rating: 5, goodPoints: ["しっとり感", "香り"], badPoints: [], repeatIntent: "yes", comment: "カラー直後の毛先がきしまず、手ぐしで乾かせました。甘すぎない香りも含めて、今まで使った中で一番好みです。" },
  { category: "シャンプー", rating: 4, goodPoints: ["使用量", "泡立ち"], badPoints: [], repeatIntent: "yes", comment: "肩下の長さでも1プッシュで足りました。予洗いを丁寧にすると泡が細かくなり、コスト面も思ったほど気になりません。" },
  { category: "シャンプー", rating: 3, goodPoints: ["香り"], badPoints: ["変化が分かりにくい"], repeatIntent: "maybe", comment: "香りと洗い心地は好きです。乾かした後の変化はまだ大きく感じないので、一本使ってから判断します。" },
  { category: "シャンプー", rating: 5, goodPoints: ["頭皮", "すすぎやすさ"], badPoints: [], repeatIntent: "yes", comment: "運動した日の汗っぽさが一度の洗髪ですっきりしました。すすいだ後につっぱらないので、家族と一緒に使えそうです。" },
  { category: "シャンプー", rating: 4, goodPoints: ["軽さ", "まとまり"], badPoints: ["使用量"], repeatIntent: "yes", comment: "根元は軽いままで、毛先だけ落ち着く感じでした。最初は出しすぎたので、今は半プッシュずつ足しています。" },
  { category: "シャンプー", rating: 3, goodPoints: ["洗浄力"], badPoints: ["香り"], repeatIntent: "maybe", comment: "ワックスの洗い残しはありませんでした。香りが夕方まで残るので、無香料が好きな自分には休日向きです。" },

  { category: "トリートメント", rating: 5, goodPoints: ["手触り", "まとまり"], badPoints: [], repeatIntent: "yes", comment: "毛先に三分ほど置いた日は、乾かしている途中から指通りが違いました。ブリーチ部分も硬く見えず、また購入します。" },
  { category: "トリートメント", rating: 4, goodPoints: ["なじませやすさ"], badPoints: ["使用量"], repeatIntent: "yes", comment: "やわらかく伸びるので、髪の内側までなじませやすいです。多く使うと重くなるため、毛先中心にしています。" },
  { category: "トリートメント", rating: 4, goodPoints: ["指通り", "香り"], badPoints: [], repeatIntent: "yes", comment: "すすいだ時の指通りがなめらかで、乾かした後も香りがほのかに残ります。毎日使っても重くなりませんでした。" },
  { category: "トリートメント", rating: 3, goodPoints: ["まとまり"], badPoints: ["放置時間"], repeatIntent: "maybe", comment: "時間を置けば毛先は落ち着きますが、すぐ流した日は普段との差が分かりません。余裕のある日に使うケアだと思います。" },
  { category: "トリートメント", rating: 5, goodPoints: ["補修感", "手触り"], badPoints: [], repeatIntent: "yes", comment: "ごわついていたハイライト部分がやわらかくなり、翌朝も絡まりませんでした。週に一度のケアとして続けたいです。" },
  { category: "トリートメント", rating: 4, goodPoints: ["軽さ", "指通り"], badPoints: ["価格"], repeatIntent: "maybe", comment: "細い髪でもぺたっとせず、毛先の指通りだけ整いました。仕上がりは好きですが、容量に対して少し高く感じます。" },
  { category: "トリートメント", rating: 3, goodPoints: ["香り"], badPoints: ["重さ"], repeatIntent: "maybe", comment: "香りは落ち着いていて好みです。根元近くまでつけると重くなったので、耳から下だけに使っています。" },
  { category: "トリートメント", rating: 5, goodPoints: ["まとまり", "ツヤ"], badPoints: [], repeatIntent: "yes", comment: "朝起きた時に毛先が散らばらず、ブラシだけで形が整いました。自然なツヤも出たので満足しています。" },
  { category: "トリートメント", rating: 4, goodPoints: ["すすぎやすさ", "手触り"], badPoints: [], repeatIntent: "yes", comment: "ぬるつきが残らず、すすぎ終わりが分かりやすいです。乾かした後は表面よりも毛先の手触りに変化を感じました。" },
  { category: "トリートメント", rating: 1, goodPoints: [], badPoints: ["べたつき", "相性"], repeatIntent: "no", comment: "少量にしても乾かした後にべたつき、翌朝は髪が束になって見えました。私の髪質には合わないので使用をやめました。" },
  { category: "トリートメント", rating: 5, goodPoints: ["絡まり", "補修感"], badPoints: ["容器"], repeatIntent: "yes", comment: "襟足の絡まりが減って、ドライヤー中に櫛が止まらなくなりました。容器のふたが少し固いですが、中身には満足です。" },
  { category: "トリートメント", rating: 4, goodPoints: ["まとまり"], badPoints: ["香り"], repeatIntent: "yes", comment: "湿度が高い日でも耳の後ろが広がりにくかったです。香りは好みが分かれそうですが、仕上がりを優先して使っています。" },
  { category: "トリートメント", rating: 3, goodPoints: ["手触り"], badPoints: ["持続"], repeatIntent: "maybe", comment: "当日の手触りは良くなりましたが、二日目には元に戻った感じがします。特別な日の前には使いたいです。" },
  { category: "トリートメント", rating: 5, goodPoints: ["使用量", "まとまり"], badPoints: [], repeatIntent: "yes", comment: "硬めの髪でも少量で全体になじみ、毛先が内側へ収まりました。一回分が少なくて済むので長く使えそうです。" },
  { category: "トリートメント", rating: 4, goodPoints: ["ブローしやすさ", "ツヤ"], badPoints: [], repeatIntent: "yes", comment: "乾かす時にブラシが通りやすく、後頭部のツヤがきれいに出ました。朝のブローも以前より簡単です。" },
  { category: "トリートメント", rating: 3, goodPoints: ["しっとり感"], badPoints: ["軽さ"], repeatIntent: "maybe", comment: "乾燥する毛先にはちょうど良いですが、髪全体に使うとボリュームが落ちます。冬だけ使うか検討中です。" },

  { category: "アウトバス", rating: 5, goodPoints: ["まとまり", "使いやすさ"], badPoints: [], repeatIntent: "yes", comment: "タオルドライ後に毛先へなじませるだけで、翌朝の寝ぐせが少なくなりました。急ぐ夜でも続けやすいです。" },
  { category: "アウトバス", rating: 4, goodPoints: ["ツヤ", "伸び"], badPoints: ["使用量"], repeatIntent: "yes", comment: "手のひらでよく伸び、少量でもロングの毛先まで届きます。前髪につくと重いので最後に触る程度にしています。" },
  { category: "アウトバス", rating: 4, goodPoints: ["手触り", "香り"], badPoints: [], repeatIntent: "yes", comment: "ドライヤー後の毛先がさらっとして、服に触れても引っかかりません。香りも寝る頃には穏やかになります。" },
  { category: "アウトバス", rating: 3, goodPoints: ["寝ぐせ直し"], badPoints: ["持続"], repeatIntent: "maybe", comment: "朝の寝ぐせはすぐ直せましたが、午後になると表面の浮き毛が戻りました。短時間の外出には便利です。" },
  { category: "アウトバス", rating: 5, goodPoints: ["熱保護", "まとまり"], badPoints: [], repeatIntent: "yes", comment: "アイロン前に使うと毛先が硬くならず、夕方まで形が保てました。毎朝使いたい仕上がりです。" },
  { category: "アウトバス", rating: 4, goodPoints: ["軽さ"], badPoints: ["容器"], repeatIntent: "yes", comment: "ミストが細かく、細い髪でも重さが出ません。残りが少なくなると噴射が偏る点だけ気になりました。" },
  { category: "アウトバス", rating: 3, goodPoints: ["香り"], badPoints: ["べたつき"], repeatIntent: "maybe", comment: "香りは好きですが、2プッシュだと手と髪に油分が残りました。半分ほどの量なら自然に仕上がります。" },
  { category: "アウトバス", rating: 5, goodPoints: ["ツヤ", "まとまり"], badPoints: [], repeatIntent: "yes", comment: "乾燥して白っぽく見えていた毛先にツヤが戻りました。雨の日でも広がりが目立たず、すでに二本目を使っています。" },
  { category: "アウトバス", rating: 4, goodPoints: ["手触り"], badPoints: ["価格"], repeatIntent: "maybe", comment: "ブリーチした部分だけにつけると、手触りがやわらかくなります。効果は分かりますが、もう少し容量があるとうれしいです。" },
  { category: "アウトバス", rating: 5, goodPoints: ["速乾", "軽さ"], badPoints: [], repeatIntent: "yes", comment: "乾かしている途中で髪がばらけやすく、いつもより早く根元まで乾きました。重いケアが苦手な自分に合っています。" },
  { category: "アウトバス", rating: 4, goodPoints: ["まとまり", "香り"], badPoints: [], repeatIntent: "yes", comment: "寝る前につけると、朝は耳まわりがはねにくいです。香りが枕に残らない点も使いやすいと思います。" },
  { category: "アウトバス", rating: 3, goodPoints: ["伸び"], badPoints: ["相性"], repeatIntent: "maybe", comment: "伸びは良くて使いやすいものの、硬い髪では大きな変化を感じませんでした。乾燥が強い時だけ使っています。" },
  { category: "アウトバス", rating: 5, goodPoints: ["指通り", "使いやすさ"], badPoints: [], repeatIntent: "yes", comment: "子どもの髪にも使える軽さで、朝の絡まりをほどきやすくなりました。手を洗う前でもべたつかないので助かります。" },
  { category: "アウトバス", rating: 4, goodPoints: ["まとまり"], badPoints: ["香り"], repeatIntent: "yes", comment: "毛先が外へ散らず、ブローした形が長く残ります。香りがもう少し控えめなら満点でした。" },

  { category: "スタイリング剤", rating: 5, goodPoints: ["束感", "キープ"], badPoints: [], repeatIntent: "yes", comment: "ショートの束を指先で作りやすく、夕方までトップがつぶれませんでした。仕事の日もこれを使いたいです。" },
  { category: "スタイリング剤", rating: 4, goodPoints: ["ウェット感"], badPoints: ["使用量"], repeatIntent: "yes", comment: "自然な濡れ感が出て、固めた印象になりません。量を増やすと前髪が割れるので少しずつ足しています。" },
  { category: "スタイリング剤", rating: 4, goodPoints: ["再セット", "伸び"], badPoints: [], repeatIntent: "yes", comment: "手のひらで均一に伸び、昼休みに手ぐしで形を戻せました。ワックス初心者でも扱いやすいです。" },
  { category: "スタイリング剤", rating: 3, goodPoints: ["束感"], badPoints: ["洗い落ち"], repeatIntent: "maybe", comment: "束感はきれいですが、一度のシャンプーでは少し残りました。休日のしっかりセット用にしています。" },
  { category: "スタイリング剤", rating: 5, goodPoints: ["キープ", "動き"], badPoints: [], repeatIntent: "yes", comment: "パーマの動きが夕方まで残り、風に当たっても崩れ方が自然でした。セット力と軽さのバランスが良いです。" },
  { category: "スタイリング剤", rating: 4, goodPoints: ["前髪", "べたつきにくさ"], badPoints: ["容器"], repeatIntent: "yes", comment: "前髪の細い束を作ってもべたついて見えません。ふたが小さくて開けにくい点だけ改善してほしいです。" },
  { category: "スタイリング剤", rating: 3, goodPoints: ["軽さ"], badPoints: ["キープ"], repeatIntent: "maybe", comment: "ふんわり動かすにはちょうど良いですが、湿度が高い日は昼頃に形が落ちました。室内で過ごす日に使います。" },
  { category: "スタイリング剤", rating: 5, goodPoints: ["ウェット感", "洗い落ち"], badPoints: [], repeatIntent: "yes", comment: "ツヤのある束が簡単に作れ、固まった後もパリパリしません。お湯で予洗いすると落としやすかったです。" },
  { category: "スタイリング剤", rating: 4, goodPoints: ["キープ"], badPoints: ["硬さ"], repeatIntent: "yes", comment: "襟足までしっかり形を保てます。乾いた後は少し硬いので、柔らかく仕上げたい日は別のものを選びます。" },
  { category: "スタイリング剤", rating: 2, goodPoints: ["ツヤ"], badPoints: ["べたつき", "洗い落ち"], repeatIntent: "no", comment: "ツヤは出ましたが、少量でも髪がべたっとして手にも残りました。洗い落ちにも時間がかかり、自分には使いにくかったです。" },
  { category: "スタイリング剤", rating: 5, goodPoints: ["再セット", "束感"], badPoints: [], repeatIntent: "yes", comment: "帽子を脱いだ後でも指でほぐすと形が戻りました。束が太くなりすぎないので短い髪に使いやすいです。" },
  { category: "スタイリング剤", rating: 4, goodPoints: ["動き", "香り"], badPoints: [], repeatIntent: "yes", comment: "毛先をつまむだけで自然な動きが出ます。香りが控えめで、ほかの整髪料と混ざらないのも良かったです。" },
  { category: "スタイリング剤", rating: 3, goodPoints: ["ウェット感"], badPoints: ["持続"], repeatIntent: "maybe", comment: "朝の濡れ感はきれいでしたが、夕方にはかなり軽くなりました。短時間だけ整えたい日には十分です。" },
  { category: "スタイリング剤", rating: 5, goodPoints: ["使用量", "キープ"], badPoints: ["洗い落ち"], repeatIntent: "yes", comment: "米粒ほどの量でサイドまで収まり、雨の日も形が残りました。落とす時は二度洗いしますが、キープ力を考えると納得できます。" },

  { category: "その他", rating: 5, goodPoints: ["頭皮", "使いやすさ"], badPoints: [], repeatIntent: "yes", comment: "お風呂上がりにつけてもべたつかず、乾燥していた生え際が気にならなくなりました。ノズルで狙った場所につけやすいです。" },
  { category: "その他", rating: 4, goodPoints: ["清涼感"], badPoints: ["香り"], repeatIntent: "yes", comment: "暑い日の頭皮がすっきりして、ドライヤー中も快適でした。香りがやや長く残るので夜だけ使っています。" },
  { category: "その他", rating: 3, goodPoints: ["使いやすさ"], badPoints: ["変化が分かりにくい"], repeatIntent: "maybe", comment: "液だれせず簡単につけられます。まだ大きな変化は分かりませんが、乾燥する季節まで続けてみます。" },
  { category: "その他", rating: 5, goodPoints: ["保湿", "軽さ"], badPoints: [], repeatIntent: "yes", comment: "分け目につけても髪がぺたっとせず、かゆみが出やすい日も落ち着いて過ごせました。毎晩の習慣にしています。" },
  { category: "その他", rating: 4, goodPoints: ["使用量"], badPoints: ["価格"], repeatIntent: "maybe", comment: "一回に使う量が少なく、想像より長持ちしています。使用感は良いので、価格を見ながらリピートを考えます。" },
  { category: "その他", rating: 3, goodPoints: ["香り"], badPoints: ["容器"], repeatIntent: "maybe", comment: "香りはさわやかで好みです。勢いよく出ると額に流れるため、容器をゆっくり押す必要があります。" }
];

const stylePhotoAssignments = [
  { customerIndex: 0, asset: "/demo/showcase/styles/style-01.png" },
  { customerIndex: 1, asset: "/demo/showcase/styles/style-02.png" },
  { customerIndex: 2, asset: "/demo/showcase/styles/style-03.png" },
  { customerIndex: 3, asset: "/demo/showcase/styles/style-09.png" },
  { customerIndex: 4, asset: "/demo/showcase/styles/style-04.png" },
  { customerIndex: 5, asset: "/demo/showcase/styles/style-10.png" },
  { customerIndex: 6, asset: "/demo/showcase/styles/style-05.png" },
  { customerIndex: 7, asset: "/demo/showcase/styles/style-06.png" },
  { customerIndex: 9, asset: "/demo/showcase/styles/style-07.png" },
  { customerIndex: 10, asset: "/demo/showcase/styles/style-08.png" }
] as const;

async function seedOrganization() {
  await prisma.organization.upsert({
    where: { id: SHOWCASE_ORGANIZATION_ID },
    update: {
      slug: SHOWCASE_ORGANIZATION_SLUG,
      name: "ヘアサロン 余白と前髪",
      iconImageUrl: "/brand/yohaku-mark.svg",
      taxRate: 10,
      defaultCouponDiscountRate: 12,
      referralReferrerDiscountRate: 15,
      referralReferredDiscountRate: 20,
      pointDefaultValidDays: 40,
      pointMinimumRedeem: 1,
      pointMaxRedemptionPercent: 50,
      reviewPrizeFirstPoints: 1000,
      reviewPrizeFirstRate: 1,
      reviewPrizeSecondPoints: 200,
      reviewPrizeSecondRate: 9,
      reviewPrizeThirdPoints: 80,
      reviewPrizeThirdRate: 90,
      couponDefaultValidDays: 14,
      couponMaxValidDays: 30,
      couponMinimumDiscountRate: 5,
      couponMaximumDiscountRate: 30
    },
    create: {
      id: SHOWCASE_ORGANIZATION_ID,
      slug: SHOWCASE_ORGANIZATION_SLUG,
      name: "ヘアサロン 余白と前髪",
      iconImageUrl: "/brand/yohaku-mark.svg",
      taxRate: 10,
      defaultCouponDiscountRate: 12,
      referralReferrerDiscountRate: 15,
      referralReferredDiscountRate: 20,
      pointDefaultValidDays: 40,
      pointMinimumRedeem: 1,
      pointMaxRedemptionPercent: 50,
      reviewPrizeFirstPoints: 1000,
      reviewPrizeFirstRate: 1,
      reviewPrizeSecondPoints: 200,
      reviewPrizeSecondRate: 9,
      reviewPrizeThirdPoints: 80,
      reviewPrizeThirdRate: 90,
      couponDefaultValidDays: 14,
      couponMaxValidDays: 30,
      couponMinimumDiscountRate: 5,
      couponMaximumDiscountRate: 30
    }
  });

  await prisma.organizationStoreProfile.upsert({
    where: { organizationId: SHOWCASE_ORGANIZATION_ID },
    update: {
      ownerName: "雨宮 透",
      phone: "000-7100-4649",
      postalCode: "700-0000",
      prefecture: "岡山県",
      city: "岡山市北区",
      addressLine1: "余白町2-8-1",
      addressLine2: "まえがみビル2F",
      businessHours: "10:00〜19:00",
      closedDays: "毎週月曜日・第2火曜日",
      websiteUrl: "https://example.invalid/yohaku",
      businessOpenMinutes: 600,
      businessCloseMinutes: 1140,
      closedWeekdays: "1"
    },
    create: {
      organizationId: SHOWCASE_ORGANIZATION_ID,
      ownerName: "雨宮 透",
      phone: "000-7100-4649",
      postalCode: "700-0000",
      prefecture: "岡山県",
      city: "岡山市北区",
      addressLine1: "余白町2-8-1",
      addressLine2: "まえがみビル2F",
      businessHours: "10:00〜19:00",
      closedDays: "毎週月曜日・第2火曜日",
      websiteUrl: "https://example.invalid/yohaku",
      businessOpenMinutes: 600,
      businessCloseMinutes: 1140,
      closedWeekdays: "1"
    }
  });
}

async function seedStaff() {
  const passwordHash = hashScryptPassword(OWNER_PASSWORD);
  for (const [index, member] of staff.entries()) {
    const userId = id("user-staff", index + 1);
    await prisma.appUser.upsert({
      where: { id: userId },
      update: {
        organizationId: SHOWCASE_ORGANIZATION_ID,
        email: member.email,
        loginId: member.loginId,
        displayName: member.name,
        passwordHash,
        role: member.role,
        active: true
      },
      create: {
        id: userId,
        organizationId: SHOWCASE_ORGANIZATION_ID,
        email: member.email,
        loginId: member.loginId,
        displayName: member.name,
        passwordHash,
        role: member.role,
        active: true
      }
    });
    await prisma.staffProfileSetting.upsert({
      where: { organizationId_userId: { organizationId: SHOWCASE_ORGANIZATION_ID, userId } },
      update: { introduction: `${member.title}。お客様の生活にちょうどよいスタイルを一緒に考えます。` },
      create: {
        id: id("staff-profile", index + 1),
        organizationId: SHOWCASE_ORGANIZATION_ID,
        userId,
        introduction: `${member.title}。お客様の生活にちょうどよいスタイルを一緒に考えます。`
      }
    });
    await prisma.staffBookingSetting.upsert({
      where: { organizationId_staffKey: { organizationId: SHOWCASE_ORGANIZATION_ID, staffKey: member.key } },
      update: {
        staffName: member.name,
        maxConcurrentAppointments: member.concurrency,
        workStartMinutes: index === 3 ? 630 : 600,
        workEndMinutes: index === 3 ? 1080 : 1140
      },
      create: {
        id: id("staff-booking", index + 1),
        organizationId: SHOWCASE_ORGANIZATION_ID,
        staffKey: member.key,
        staffName: member.name,
        maxConcurrentAppointments: member.concurrency,
        workStartMinutes: index === 3 ? 630 : 600,
        workEndMinutes: index === 3 ? 1080 : 1140
      }
    });
  }
}

async function seedMenusAndProducts() {
  for (const [index, menu] of menus.entries()) {
    await prisma.salonMenu.upsert({
      where: { organizationId_name: { organizationId: SHOWCASE_ORGANIZATION_ID, name: menu[0] } },
      update: {
        category: menu[1],
        durationMinutes: menu[2],
        priceYen: menu[3],
        description: menu[4],
        active: true,
        sortOrder: index
      },
      create: {
        id: id("menu", index + 1),
        organizationId: SHOWCASE_ORGANIZATION_ID,
        name: menu[0],
        category: menu[1],
        durationMinutes: menu[2],
        priceYen: menu[3],
        description: menu[4],
        active: true,
        sortOrder: index,
        source: "manual"
      }
    });
  }

  for (const [index, product] of products.entries()) {
    await prisma.product.upsert({
      where: {
        organizationId_manufacturerName_name: {
          organizationId: SHOWCASE_ORGANIZATION_ID,
          manufacturerName: product[0],
          name: product[1]
        }
      },
      update: {
        category: product[2],
        retailPrice: product[3],
        stockQuantity: product[4],
        concernTags: product[5],
        description: product[6],
        alternativeRecommendation: product[7],
        active: true
      },
      create: {
        id: id("product", index + 1),
        organizationId: SHOWCASE_ORGANIZATION_ID,
        manufacturerName: product[0],
        name: product[1],
        category: product[2],
        retailPrice: product[3],
        stockQuantity: product[4],
        concernTags: product[5],
        description: product[6],
        alternativeRecommendation: product[7],
        active: true
      }
    });
  }
}

async function seedCustomers(now: Date) {
  const created: Array<{ id: string; name: string }> = [];
  for (const [index, row] of customerSeeds.entries()) {
    const customerId = id("customer", index + 1);
    const birthDate = new Date(`${row[2]}T12:00:00+09:00`);
    const profileImageUrl = row[1] === "男性" ? "/brand/customer-hair-care-male.png" : "/brand/customer-profile-v2.png";
    const customer = await prisma.customer.upsert({
      where: { id: customerId },
      update: {
        organizationId: SHOWCASE_ORGANIZATION_ID,
        name: row[0],
        gender: row[1],
        birthDate,
        birthYear: birthDate.getFullYear(),
        phone: row[3],
        servicePreference: row[4],
        staffAssignmentType: row[5],
        assignedStaffName: row[6],
        profileImageUrl,
        memo: index === 0
          ? "カラー後の乾燥と前髪の扱いを相談。仕事中はまとめ髪が多い。"
          : `${row[4]}。次回も前回の仕上がりを基準に相談する。`,
        deletedAt: null
      },
      create: {
        id: customerId,
        organizationId: SHOWCASE_ORGANIZATION_ID,
        name: row[0],
        gender: row[1],
        birthDate,
        birthYear: birthDate.getFullYear(),
        phone: row[3],
        servicePreference: row[4],
        staffAssignmentType: row[5],
        assignedStaffName: row[6],
        profileImageUrl,
        memo: index === 0
          ? "カラー後の乾燥と前髪の扱いを相談。仕事中はまとめ髪が多い。"
          : `${row[4]}。次回も前回の仕上がりを基準に相談する。`,
        createdAt: addMonths(now, -(index % 14))
      }
    });
    created.push({ id: customer.id, name: customer.name });

    await prisma.hairProfile.upsert({
      where: { customerId },
      update: {
        hairThickness: index % 3 === 0 ? "細め" : index % 3 === 1 ? "普通" : "太め",
        hairVolume: index % 4 === 0 ? "少なめ" : index % 4 === 1 ? "普通" : "多め",
        hairTexture: index % 3 === 0 ? "やわらかい" : index % 3 === 1 ? "普通" : "硬め",
        hairCurl: index % 4 === 0 ? "ほぼなし" : index % 4 === 1 ? "少しうねる" : "広がりやすい",
        scalpCondition: index % 5 === 0 ? "乾燥しやすい" : "普通",
        lifestyle: index % 2 === 0 ? "朝は10分以内で整えたい" : "休日はアイロンを使う",
        stylingTimeMinutes: index % 2 === 0 ? 10 : 15
      },
      create: {
        customerId,
        hairThickness: index % 3 === 0 ? "細め" : index % 3 === 1 ? "普通" : "太め",
        hairVolume: index % 4 === 0 ? "少なめ" : index % 4 === 1 ? "普通" : "多め",
        hairTexture: index % 3 === 0 ? "やわらかい" : index % 3 === 1 ? "普通" : "硬め",
        hairCurl: index % 4 === 0 ? "ほぼなし" : index % 4 === 1 ? "少しうねる" : "広がりやすい",
        scalpCondition: index % 5 === 0 ? "乾燥しやすい" : "普通",
        lifestyle: index % 2 === 0 ? "朝は10分以内で整えたい" : "休日はアイロンを使う",
        stylingTimeMinutes: index % 2 === 0 ? 10 : 15
      }
    });
    await prisma.preference.upsert({
      where: { customerId },
      update: {
        preferredLength: index % 3 === 0 ? "ショート" : index % 3 === 1 ? "ミディアム" : "ロング",
        preferredStyle: index % 2 === 0 ? "乾かすだけでまとまる自然な形" : "少し動きのあるやわらかな形",
        dislikes: index % 2 === 0 ? "重すぎる仕上がり" : "強すぎる香り",
        colorPreference: index % 2 === 0 ? "肌なじみのよいブラウン" : "透明感のある寒色",
        maintenanceLevel: "自宅で無理なく再現できる範囲"
      },
      create: {
        customerId,
        preferredLength: index % 3 === 0 ? "ショート" : index % 3 === 1 ? "ミディアム" : "ロング",
        preferredStyle: index % 2 === 0 ? "乾かすだけでまとまる自然な形" : "少し動きのあるやわらかな形",
        dislikes: index % 2 === 0 ? "重すぎる仕上がり" : "強すぎる香り",
        colorPreference: index % 2 === 0 ? "肌なじみのよいブラウン" : "透明感のある寒色",
        maintenanceLevel: "自宅で無理なく再現できる範囲"
      }
    });
    await prisma.customerPointAccount.upsert({
      where: { customerId },
      update: {},
      create: { id: id("point-account", index + 1), customerId }
    });
  }

  const customerPasswordHash = hashScryptPassword(CUSTOMER_PASSWORD);
  for (let index = 0; index < 9; index += 1) {
    const customer = created[index];
    await prisma.appUser.upsert({
      where: { id: id("user-customer", index + 1) },
      update: {
        organizationId: SHOWCASE_ORGANIZATION_ID,
        customerId: customer.id,
        email: index === 0 ? "hana@yohaku.invalid" : `member${index + 1}@yohaku.invalid`,
        loginId: index === 0 ? CUSTOMER_LOGIN_ID : `yohaku.member${String(index + 1).padStart(2, "0")}`,
        displayName: customer.name,
        passwordHash: customerPasswordHash,
        role: "CUSTOMER",
        active: true
      },
      create: {
        id: id("user-customer", index + 1),
        organizationId: SHOWCASE_ORGANIZATION_ID,
        customerId: customer.id,
        email: index === 0 ? "hana@yohaku.invalid" : `member${index + 1}@yohaku.invalid`,
        loginId: index === 0 ? CUSTOMER_LOGIN_ID : `yohaku.member${String(index + 1).padStart(2, "0")}`,
        displayName: customer.name,
        passwordHash: customerPasswordHash,
        role: "CUSTOMER",
        active: true
      }
    });
  }
  return created;
}

async function seedOperations(customers: Array<{ id: string; name: string }>, now: Date) {
  const paymentMethods = ["クレジットカード", "現金", "PayPay"];
  const stylePhotoByCustomerIndex = new Map<number, string>(
    stylePhotoAssignments.map((assignment) => [assignment.customerIndex, assignment.asset])
  );

  for (let customerIndex = 0; customerIndex < customers.length; customerIndex += 1) {
    const customer = customers[customerIndex];
    const visitCount = customerIndex < 24 ? 3 : 2;
    for (let visitIndex = 0; visitIndex < visitCount; visitIndex += 1) {
      const sequence = customerIndex * 3 + visitIndex + 1;
      const monthsAgo = ((customerIndex + visitIndex * 4) % 11) + 1;
      const visitDate = atJst(addDays(addMonths(now, -monthsAgo), (customerIndex * 3 + visitIndex * 5) % 23), 10 + ((customerIndex + visitIndex) % 7), visitIndex % 2 === 0 ? 0 : 30);
      const menu = menus[(customerIndex + visitIndex) % menus.length];
      const member = staff[(customerIndex + visitIndex) % staff.length];
      const visitId = id("visit", sequence);
      const appointmentId = id("appointment-past", sequence);
      const saleId = id("sale", sequence);

      await prisma.visit.upsert({
        where: { id: visitId },
        update: {
          customerId: customer.id,
          visitedAt: visitDate,
          stylistName: member.name,
          requestedStyle: `${menu[0]}を中心に、朝の扱いやすさを相談`,
          performedStyle: menu[0],
          cutNotes: "顔まわりと前髪の収まりを確認しながら調整。",
          colorNotes: menu[1] === "カラー" || menu[1] === "セット" ? "褪色後も黄みが出にくい配合。" : null,
          customerReaction: visitIndex === 0 ? "手触りが軽くなり、家でも扱いやすそうとのこと。" : "前回より朝の準備が楽だったとのこと。",
          nextRecommendation: "約45日後を目安に、毛先と前髪のメンテナンス。"
        },
        create: {
          id: visitId,
          customerId: customer.id,
          visitedAt: visitDate,
          stylistName: member.name,
          requestedStyle: `${menu[0]}を中心に、朝の扱いやすさを相談`,
          performedStyle: menu[0],
          cutNotes: "顔まわりと前髪の収まりを確認しながら調整。",
          colorNotes: menu[1] === "カラー" || menu[1] === "セット" ? "褪色後も黄みが出にくい配合。" : null,
          customerReaction: visitIndex === 0 ? "手触りが軽くなり、家でも扱いやすそうとのこと。" : "前回より朝の準備が楽だったとのこと。",
          nextRecommendation: "約45日後を目安に、毛先と前髪のメンテナンス。"
        }
      });
      await prisma.appointment.upsert({
        where: { id: appointmentId },
        update: {
          customerId: customer.id,
          scheduledAt: visitDate,
          menu: menu[0],
          estimatedPrice: menu[3],
          status: "来店済み",
          source: "salon-register",
          staffName: member.name,
          durationMinutes: menu[2],
          bookingProvider: sequence % 3 === 0 ? "hotpepper" : sequence % 3 === 1 ? "kanzashi" : "phone"
        },
        create: {
          id: appointmentId,
          customerId: customer.id,
          scheduledAt: visitDate,
          menu: menu[0],
          estimatedPrice: menu[3],
          status: "来店済み",
          source: "salon-register",
          staffName: member.name,
          durationMinutes: menu[2],
          bookingProvider: sequence % 3 === 0 ? "hotpepper" : sequence % 3 === 1 ? "kanzashi" : "phone",
          note: "来店・会計まで完了"
        }
      });
      const productIndex = (customerIndex + visitIndex) % products.length;
      const productQuantity = sequence % 4 === 0 ? 2 : 1;
      const saleAmount = menu[3] + (sequence % 2 === 0 ? products[productIndex][3] * productQuantity : 0);
      await prisma.serviceSale.upsert({
        where: { id: saleId },
        update: {
          customerId: customer.id,
          appointmentId,
          title: menu[0],
          amount: saleAmount,
          paymentMethod: paymentMethods[sequence % paymentMethods.length],
          paidAt: visitDate,
          source: "salon-register",
          note: "施術と店販を会計済み"
        },
        create: {
          id: saleId,
          customerId: customer.id,
          appointmentId,
          title: menu[0],
          amount: saleAmount,
          paymentMethod: paymentMethods[sequence % paymentMethods.length],
          paidAt: visitDate,
          source: "salon-register",
          note: "施術と店販を会計済み"
        }
      });
      if (sequence % 2 === 0) {
        await prisma.productSaleLine.upsert({
          where: { id: id("sale-line", sequence) },
          update: {
            serviceSaleId: saleId,
            productId: id("product", productIndex + 1),
            productNameSnapshot: products[productIndex][1],
            manufacturerNameSnapshot: products[productIndex][0],
            unitPrice: products[productIndex][3],
            quantity: productQuantity,
            lineTotal: products[productIndex][3] * productQuantity
          },
          create: {
            id: id("sale-line", sequence),
            serviceSaleId: saleId,
            productId: id("product", productIndex + 1),
            productNameSnapshot: products[productIndex][1],
            manufacturerNameSnapshot: products[productIndex][0],
            unitPrice: products[productIndex][3],
            quantity: productQuantity,
            lineTotal: products[productIndex][3] * productQuantity,
            createdAt: visitDate
          }
        });
      }

      const stylePhoto = stylePhotoByCustomerIndex.get(customerIndex);
      if (stylePhoto && visitIndex === 0) {
        await prisma.visitPhoto.upsert({
          where: { id: id("visit-photo", customerIndex + 1) },
          update: {
            customerId: customer.id,
            visitId,
            storageReference: stylePhoto,
            caption: `${menu[0]}後の仕上がり`,
            uploadedByUserId: id("user-staff", (customerIndex % staff.length) + 1),
            uploadedByName: member.name
          },
          create: {
            id: id("visit-photo", customerIndex + 1),
            customerId: customer.id,
            visitId,
            storageReference: stylePhoto,
            caption: `${menu[0]}後の仕上がり`,
            uploadedByUserId: id("user-staff", (customerIndex % staff.length) + 1),
            uploadedByName: member.name,
            createdAt: addDays(visitDate, 1)
          }
        });
      }
    }
  }

  for (let index = 0; index < 22; index += 1) {
    const customer = customers[index % customers.length];
    const member = staff[index % staff.length];
    const menu = menus[index % menus.length];
    const scheduledAt = atJst(addDays(now, 1 + (index % 13)), 10 + (index % 8), index % 2 === 0 ? 0 : 30);
    await prisma.appointment.upsert({
      where: { id: id("appointment-future", index + 1) },
      update: {
        customerId: customer.id,
        scheduledAt,
        menu: menu[0],
        estimatedPrice: menu[3],
        status: index === 20 ? "仮予約" : "予約確定",
        source: index % 3 === 0 ? "gmail:kanzashi" : index % 3 === 1 ? "gmail:hotpepper" : "phone",
        staffName: member.name,
        durationMinutes: menu[2],
        bookingProvider: index % 3 === 0 ? "kanzashi" : index % 3 === 1 ? "hotpepper" : "phone"
      },
      create: {
        id: id("appointment-future", index + 1),
        customerId: customer.id,
        scheduledAt,
        menu: menu[0],
        estimatedPrice: menu[3],
        status: index === 20 ? "仮予約" : "予約確定",
        source: index % 3 === 0 ? "gmail:kanzashi" : index % 3 === 1 ? "gmail:hotpepper" : "phone",
        staffName: member.name,
        durationMinutes: menu[2],
        bookingProvider: index % 3 === 0 ? "kanzashi" : index % 3 === 1 ? "hotpepper" : "phone",
        note: index % 4 === 0 ? "前髪の長さを当日相談" : null
      }
    });
  }

  const todayAppointments = [
    { customerIndex: 0, staffName: staff[0].name, menuIndex: 0, hour: 10, minute: 0, provider: "kanzashi" },
    { customerIndex: 1, staffName: staff[0].name, menuIndex: 3, hour: 11, minute: 30, provider: "hotpepper" },
    { customerIndex: 2, staffName: staff[0].name, menuIndex: 7, hour: 15, minute: 0, provider: "phone" },
    { customerIndex: 4, staffName: staff[1].name, menuIndex: 2, hour: 10, minute: 30, provider: "hotpepper" },
    { customerIndex: 6, staffName: staff[1].name, menuIndex: 0, hour: 13, minute: 0, provider: "kanzashi" },
    { customerIndex: 7, staffName: staff[1].name, menuIndex: 5, hour: 15, minute: 0, provider: "phone" },
    { customerIndex: 3, staffName: staff[2].name, menuIndex: 8, hour: 10, minute: 0, provider: "phone" },
    { customerIndex: 5, staffName: staff[2].name, menuIndex: 6, hour: 12, minute: 0, provider: "kanzashi" },
    { customerIndex: 8, staffName: staff[2].name, menuIndex: 8, hour: 15, minute: 0, provider: "hotpepper" },
    { customerIndex: 9, staffName: staff[3].name, menuIndex: 4, hour: 10, minute: 30, provider: "kanzashi" },
    { customerIndex: 10, staffName: staff[3].name, menuIndex: 7, hour: 12, minute: 0, provider: "phone" },
    { customerIndex: 11, staffName: "フリー", menuIndex: 0, hour: 14, minute: 0, provider: "phone" },
    { customerIndex: 13, staffName: "フリー", menuIndex: 2, hour: 16, minute: 0, provider: "kanzashi" }
  ] as const;

  for (let index = 0; index < todayAppointments.length; index += 1) {
    const fixture = todayAppointments[index];
    const customer = customers[fixture.customerIndex];
    const menu = menus[fixture.menuIndex];
    const scheduledAt = atJst(now, fixture.hour, fixture.minute);
    await prisma.appointment.upsert({
      where: { id: id("appointment-today", index + 1) },
      update: {
        customerId: customer.id,
        scheduledAt,
        menu: menu[0],
        estimatedPrice: menu[3],
        status: "予約確定",
        source: fixture.provider === "phone" ? "phone" : `gmail:${fixture.provider}`,
        staffName: fixture.staffName,
        durationMinutes: menu[2],
        bookingProvider: fixture.provider,
        note: fixture.staffName === "フリー" ? "電話・Web予約（指名なし）" : "デモ当日の予約"
      },
      create: {
        id: id("appointment-today", index + 1),
        customerId: customer.id,
        scheduledAt,
        menu: menu[0],
        estimatedPrice: menu[3],
        status: "予約確定",
        source: fixture.provider === "phone" ? "phone" : `gmail:${fixture.provider}`,
        staffName: fixture.staffName,
        durationMinutes: menu[2],
        bookingProvider: fixture.provider,
        note: fixture.staffName === "フリー" ? "電話・Web予約（指名なし）" : "デモ当日の予約"
      }
    });
  }
}

async function seedProductFeedback(customers: Array<{ id: string; name: string }>, now: Date) {
  const productIndexesByCategory = new Map<string, number[]>();
  for (let productIndex = 0; productIndex < products.length; productIndex += 1) {
    const category = products[productIndex][2];
    const indexes = productIndexesByCategory.get(category) ?? [];
    indexes.push(productIndex);
    productIndexesByCategory.set(category, indexes);
  }
  const categoryUsage = new Map<string, number>();
  const activeCategories: DemoReviewFixture["category"][] = [
    "シャンプー",
    "トリートメント",
    "アウトバス",
    "スタイリング剤",
    "その他",
    "シャンプー"
  ];

  for (let index = 0; index < reviewFixtures.length + activeCategories.length; index += 1) {
    const customer = customers[index % customers.length];
    const fixture = reviewFixtures[index] ?? null;
    const category = fixture?.category ?? activeCategories[index - reviewFixtures.length];
    const categoryProducts = productIndexesByCategory.get(category) ?? [];
    const categoryIndex = categoryUsage.get(category) ?? 0;
    const productIndex = categoryProducts[categoryIndex % categoryProducts.length];
    categoryUsage.set(category, categoryIndex + 1);
    const proposalId = id("proposal", index + 1);
    const requestId = id("review-request", index + 1);
    const product = products[productIndex];
    const answered = fixture !== null;
    const submittedAt = addDays(now, -(index * 10 + (index % 4) * 3 + 3));
    const proposalCreatedAt = answered ? addDays(submittedAt, -7) : addDays(now, -2);
    await prisma.productProposal.upsert({
      where: { id: proposalId },
      update: {
        customerId: customer.id,
        productId: id("product", productIndex + 1),
        visitId: id("visit", (index % 24) * 3 + 1),
        staffId: id("user-staff", (index % staff.length) + 1),
        proposalReason: `${String(product[5][0])}の悩みに合わせ、自宅で続けやすい使い方を案内。`,
        concernTags: product[5],
        status: "purchased",
        reaction: "purchased",
        purchased: true,
        note: "会計で購入済み。レビュー依頼を発行。"
      },
      create: {
        id: proposalId,
        customerId: customer.id,
        productId: id("product", productIndex + 1),
        visitId: id("visit", (index % 24) * 3 + 1),
        staffId: id("user-staff", (index % staff.length) + 1),
        proposalReason: `${String(product[5][0])}の悩みに合わせ、自宅で続けやすい使い方を案内。`,
        concernTags: product[5],
        status: "purchased",
        reaction: "purchased",
        purchased: true,
        note: "会計で購入済み。レビュー依頼を発行。",
        createdAt: proposalCreatedAt
      }
    });
    await prisma.productReviewRequest.upsert({
      where: { id: requestId },
      update: {
        productProposalId: proposalId,
        tokenHash: sha256(`${PREFIX}-review-token-${index + 1}`),
        expiresAt: answered ? addDays(submittedAt, 30) : addDays(now, 30),
        requestedAt: answered ? addDays(submittedAt, -5) : addDays(now, -2),
        answeredAt: answered ? submittedAt : null,
        status: answered ? "answered" : "active"
      },
      create: {
        id: requestId,
        productProposalId: proposalId,
        tokenHash: sha256(`${PREFIX}-review-token-${index + 1}`),
        expiresAt: answered ? addDays(submittedAt, 30) : addDays(now, 30),
        requestedAt: answered ? addDays(submittedAt, -5) : addDays(now, -2),
        answeredAt: answered ? submittedAt : null,
        status: answered ? "answered" : "active"
      }
    });
    if (answered) {
      await prisma.productReview.upsert({
        where: { reviewRequestId: requestId },
        update: {
          productProposalId: proposalId,
          usedStatus: "used",
          rating: fixture.rating,
          goodPoints: fixture.goodPoints,
          badPoints: fixture.badPoints,
          repeatIntent: fixture.repeatIntent,
          freeComment: fixture.comment,
          allowAnonymousShare: true,
          allowAnonymousQuote: true,
          submittedAt
        },
        create: {
          id: id("review", index + 1),
          productProposalId: proposalId,
          reviewRequestId: requestId,
          usedStatus: "used",
          rating: fixture.rating,
          goodPoints: fixture.goodPoints,
          badPoints: fixture.badPoints,
          repeatIntent: fixture.repeatIntent,
          freeComment: fixture.comment,
          allowAnonymousShare: true,
          allowAnonymousQuote: true,
          submittedAt,
          createdAt: submittedAt
        }
      });
      await prisma.consent.upsert({
        where: { id: id("consent", index + 1) },
        update: {
          customerId: customer.id,
          productReviewId: id("review", index + 1),
          consentType: "aggregate_review_share",
          granted: true,
          source: "customer_app"
        },
        create: {
          id: id("consent", index + 1),
          customerId: customer.id,
          productReviewId: id("review", index + 1),
          consentType: "aggregate_review_share",
          granted: true,
          source: "customer_app",
          createdAt: submittedAt
        }
      });
    }
  }
}

async function seedPoints(customers: Array<{ id: string; name: string }>, now: Date) {
  for (let index = 0; index < customers.length; index += 1) {
    const customerId = customers[index].id;
    const accountId = id("point-account", index + 1);
    const earnAmount = index === 0 ? 760 : 120 + (index % 6) * 80;
    const redeemed = index === 0 ? 80 : index % 4 === 0 ? 100 : 0;
    const balance = earnAmount - redeemed;
    const earnId = id("point-earn", index + 1);
    const expiresAt = addDays(now, 18 + (index % 22));
    await prisma.pointTransaction.upsert({
      where: { id: earnId },
      update: {
        customerId,
        accountId,
        type: "earn",
        amount: earnAmount,
        balanceAfter: earnAmount,
        sourceType: index % 2 === 0 ? "product_review" : "checkout",
        sourceId: id("point-source-earn", index + 1),
        reason: index % 2 === 0 ? "商品アンケート回答" : "来店・会計ポイント",
        expiresAt
      },
      create: {
        id: earnId,
        customerId,
        accountId,
        type: "earn",
        amount: earnAmount,
        balanceAfter: earnAmount,
        sourceType: index % 2 === 0 ? "product_review" : "checkout",
        sourceId: id("point-source-earn", index + 1),
        reason: index % 2 === 0 ? "商品アンケート回答" : "来店・会計ポイント",
        expiresAt,
        createdAt: addDays(now, -(index % 18) - 3)
      }
    });
    await prisma.pointLot.upsert({
      where: { id: id("point-lot", index + 1) },
      update: {
        customerId,
        earnTransactionId: earnId,
        originalAmount: earnAmount,
        remainingAmount: balance,
        expiresAt
      },
      create: {
        id: id("point-lot", index + 1),
        customerId,
        earnTransactionId: earnId,
        originalAmount: earnAmount,
        remainingAmount: balance,
        expiresAt,
        createdAt: addDays(now, -(index % 18) - 3)
      }
    });
    if (redeemed > 0) {
      const redeemId = id("point-redeem", index + 1);
      await prisma.pointTransaction.upsert({
        where: { id: redeemId },
        update: {
          customerId,
          accountId,
          type: "redeem",
          amount: -redeemed,
          balanceAfter: balance,
          sourceType: "checkout",
          sourceId: id("point-source-redeem", index + 1),
          reason: "会計時ポイント利用"
        },
        create: {
          id: redeemId,
          customerId,
          accountId,
          type: "redeem",
          amount: -redeemed,
          balanceAfter: balance,
          sourceType: "checkout",
          sourceId: id("point-source-redeem", index + 1),
          reason: "会計時ポイント利用",
          createdAt: addDays(now, -2)
        }
      });
      await prisma.pointRedemptionAllocation.upsert({
        where: { id: id("point-allocation", index + 1) },
        update: { redeemTransactionId: redeemId, pointLotId: id("point-lot", index + 1), amount: redeemed },
        create: {
          id: id("point-allocation", index + 1),
          redeemTransactionId: redeemId,
          pointLotId: id("point-lot", index + 1),
          amount: redeemed
        }
      });
    }
    await prisma.customerPointAccount.update({
      where: { id: accountId },
      data: {
        availablePoints: balance,
        pendingPoints: 0,
        lifetimeEarned: earnAmount,
        lifetimeRedeemed: redeemed,
        lifetimeExpired: 0
      }
    });
  }
}

async function seedOffersAndCommunication(customers: Array<{ id: string; name: string }>, now: Date) {
  for (let index = 0; index < 10; index += 1) {
    const customer = customers[index];
    const couponCode = `YHK-${String(index + 1).padStart(4, "0")}-12OFF`;
    await prisma.coupon.upsert({
      where: { couponCode },
      update: {
        customerId: customer.id,
        title: "次回メンテナンス 12%OFF",
        description: "前回の仕上がりをきれいに保つための個別クーポンです。",
        couponType: "salon",
        targetMenu: "カット + 髪質ケア",
        discountType: "percentage",
        discountValue: "12",
        validFrom: addDays(now, -3),
        validUntil: addDays(now, 24),
        status: "issued"
      },
      create: {
        id: id("coupon", index + 1),
        customerId: customer.id,
        title: "次回メンテナンス 12%OFF",
        description: "前回の仕上がりをきれいに保つための個別クーポンです。",
        couponType: "salon",
        targetMenu: "カット + 髪質ケア",
        discountType: "percentage",
        discountValue: "12",
        validFrom: addDays(now, -3),
        validUntil: addDays(now, 24),
        status: "issued",
        couponCode,
        issuedAt: addDays(now, -3)
      }
    });
  }

  await prisma.couponIssue.upsert({
    where: { couponCode: "YHK-A4-2026-HANA" },
    update: {
      customerId: customers[0].id,
      staffUserId: id("user-staff", 2),
      customerName: customers[0].name,
      discountRate: 12,
      targetMenusJson: ["カット", "髪質ケアトリートメント"],
      issuedAt: addDays(now, -3),
      expiresAt: addDays(now, 24),
      salonMessage: "前髪の扱いやすさを保ちながら、次回も心地よく整えます。",
      status: "issued"
    },
    create: {
      id: id("coupon-issue", 1),
      customerId: customers[0].id,
      staffUserId: id("user-staff", 2),
      couponCode: "YHK-A4-2026-HANA",
      customerName: customers[0].name,
      discountRate: 12,
      targetMenusJson: ["カット", "髪質ケアトリートメント"],
      issuedAt: addDays(now, -3),
      expiresAt: addDays(now, 24),
      salonMessage: "前髪の扱いやすさを保ちながら、次回も心地よく整えます。",
      status: "issued",
      templateVersion: "coupon-v2"
    }
  });

  const broadcasts = [
    ["雨の日の前髪レスキュー", "湿気が気になる季節です。前髪だけのメンテナンスも気軽にご利用ください。", null],
    ["髪質ケアのご案内", "カラー後30日を目安に、毛先の手触りを整えるケアがおすすめです。", "髪質ケアトリートメント 10%OFF"],
    ["今月のお休み", "毎週月曜日と第2火曜日がお休みです。ご予約はお早めにどうぞ。", null]
  ] as const;
  for (const [index, broadcast] of broadcasts.entries()) {
    const broadcastId = id("broadcast", index + 1);
    await prisma.customerBroadcast.upsert({
      where: { id: broadcastId },
      update: {
        organizationId: SHOWCASE_ORGANIZATION_ID,
        createdByStaffId: id("user-staff", 1),
        title: broadcast[0],
        body: broadcast[1],
        status: "sent",
        audienceGender: index === 1 ? "女性" : null,
        audienceMinAge: index === 1 ? 25 : null,
        audienceMaxAge: index === 1 ? 49 : null,
        audienceMatchedCount: index === 1 ? 18 : customers.length,
        couponEnabled: Boolean(broadcast[2]),
        couponTitle: broadcast[2],
        couponTargetMenu: broadcast[2] ? "髪質ケアトリートメント" : null,
        couponDiscountRate: broadcast[2] ? 10 : null,
        couponValidDays: broadcast[2] ? 14 : null,
        sentAt: addDays(now, -(index * 7 + 1))
      },
      create: {
        id: broadcastId,
        organizationId: SHOWCASE_ORGANIZATION_ID,
        createdByStaffId: id("user-staff", 1),
        title: broadcast[0],
        body: broadcast[1],
        status: "sent",
        audienceGender: index === 1 ? "女性" : null,
        audienceMinAge: index === 1 ? 25 : null,
        audienceMaxAge: index === 1 ? 49 : null,
        audienceMatchedCount: index === 1 ? 18 : customers.length,
        couponEnabled: Boolean(broadcast[2]),
        couponTitle: broadcast[2],
        couponTargetMenu: broadcast[2] ? "髪質ケアトリートメント" : null,
        couponDiscountRate: broadcast[2] ? 10 : null,
        couponValidDays: broadcast[2] ? 14 : null,
        sentAt: addDays(now, -(index * 7 + 1))
      }
    });
    for (let customerIndex = 0; customerIndex < (index === 1 ? 18 : customers.length); customerIndex += 1) {
      await prisma.customerBroadcastRecipient.upsert({
        where: { broadcastId_customerId: { broadcastId, customerId: customers[customerIndex].id } },
        update: { deliveredAt: addDays(now, -(index * 7 + 1)), readAt: customerIndex % 4 === 0 ? null : addDays(now, -(index * 7)) },
        create: {
          id: id(`broadcast-recipient-${index + 1}`, customerIndex + 1),
          broadcastId,
          customerId: customers[customerIndex].id,
          deliveredAt: addDays(now, -(index * 7 + 1)),
          readAt: customerIndex % 4 === 0 ? null : addDays(now, -(index * 7))
        }
      });
    }
  }

  const chatBodies = [
    ["次回、前髪だけ少し短くできますか？", "もちろんです。ご来店時に横から見た長さも一緒に確認しましょう。"],
    ["カラー後のシャンプーはいつから普通にして大丈夫ですか？", "当日もやさしく洗って大丈夫です。熱いお湯だけ避けてくださいね。"],
    ["予約を30分遅らせることはできますか？", "空き状況を確認し、17時30分へ変更しました。"],
    ["オイルの量が多い気がします。", "まず半プッシュを手のひらに広げ、毛先からつけてみてください。"],
    ["次はパーマも相談したいです。", "髪の状態を見ながら、強すぎないニュアンスで考えましょう。"],
    ["写真のスタイルに近づけられますか？", "長さは足りています。顔まわりの作り方を当日ご説明します。"]
  ] as const;
  for (let index = 0; index < chatBodies.length; index += 1) {
    const member = staff[index % staff.length];
    const threadId = id("chat-thread", index + 1);
    await prisma.chatThread.upsert({
      where: { id: threadId },
      update: {
        organizationId: SHOWCASE_ORGANIZATION_ID,
        customerId: customers[index].id,
        staffKey: member.key,
        staffName: member.name,
        status: "open",
        customerLastReadAt: addDays(now, -1),
        staffLastReadAt: index % 2 === 0 ? addDays(now, -1) : null,
        updatedAt: addDays(now, -(index % 3))
      },
      create: {
        id: threadId,
        organizationId: SHOWCASE_ORGANIZATION_ID,
        customerId: customers[index].id,
        staffKey: member.key,
        staffName: member.name,
        status: "open",
        customerLastReadAt: addDays(now, -1),
        staffLastReadAt: index % 2 === 0 ? addDays(now, -1) : null,
        createdAt: addDays(now, -(index + 5)),
        updatedAt: addDays(now, -(index % 3))
      }
    });
    await prisma.chatMessage.upsert({
      where: { id: id(`chat-message-${index + 1}`, 1) },
      update: { threadId, senderType: "customer", senderUserId: id("user-customer", Math.min(index + 1, 9)), body: chatBodies[index][0] },
      create: {
        id: id(`chat-message-${index + 1}`, 1),
        threadId,
        senderType: "customer",
        senderUserId: id("user-customer", Math.min(index + 1, 9)),
        body: chatBodies[index][0],
        createdAt: addDays(now, -(index + 2))
      }
    });
    await prisma.chatMessage.upsert({
      where: { id: id(`chat-message-${index + 1}`, 2) },
      update: { threadId, senderType: "staff", senderUserId: id("user-staff", (index % staff.length) + 1), body: chatBodies[index][1] },
      create: {
        id: id(`chat-message-${index + 1}`, 2),
        threadId,
        senderType: "staff",
        senderUserId: id("user-staff", (index % staff.length) + 1),
        body: chatBodies[index][1],
        createdAt: addDays(now, -(index + 1))
      }
    });
  }
}

async function seedCommunityAndExtras(customers: Array<{ id: string; name: string }>, now: Date) {
  const stylistComments = [
    "顔まわりを薄くつなぎ、結んだ時にも自然に後れ毛が出るよう整えました。",
    "丸みを残したボブにして、乾かすだけで襟足が収まる長さにしています。",
    "短くても女性らしいやわらかさが出るよう、トップへ細かな動きを加えました。",
    "耳まわりをすっきりさせ、ワックスを少量なじませるだけで束が出る形です。",
    "くせを生かした長さで、雨の日にも広がりが目立ちにくいバランスにしました。",
    "パーマの動きが一か所に固まらないよう、前後で巻き方を変えています。",
    "暗めの色でも重く見えないよう、表面に細いレイヤーを入れました。",
    "毛先に厚みを残しつつ、顔まわりだけ軽くして横顔がきれいに見える形です。",
    "ミルクティー系の色味に合わせ、肩ではねても形になる長さへ調整しました。",
    "長さは変えすぎず、毛先の乾燥部分を整えて自然なウェーブを残しました。"
  ];

  for (let index = 0; index < stylePhotoAssignments.length; index += 1) {
    const customerIndex = stylePhotoAssignments[index].customerIndex;
    const visitId = id("visit", customerIndex * 3 + 1);
    const postId = id("community-post", index + 1);
    await prisma.visitCommunityPost.upsert({
      where: { visitId },
      update: {
        organizationId: SHOWCASE_ORGANIZATION_ID,
        customerId: customers[customerIndex].id,
        published: true,
        publishedAt: addDays(now, -(index + 2))
      },
      create: {
        id: postId,
        organizationId: SHOWCASE_ORGANIZATION_ID,
        customerId: customers[customerIndex].id,
        visitId,
        published: true,
        publishedAt: addDays(now, -(index + 2))
      }
    });
    const actualPost = await prisma.visitCommunityPost.findUniqueOrThrow({ where: { visitId }, select: { id: true } });
    for (let likeIndex = 0; likeIndex < 4 + (index % 5); likeIndex += 1) {
      const appUserId = id("user-customer", (likeIndex % 9) + 1);
      await prisma.visitCommunityLike.upsert({
        where: { postId_appUserId: { postId: actualPost.id, appUserId } },
        update: {},
        create: { id: id(`community-like-${index + 1}`, likeIndex + 1), postId: actualPost.id, appUserId }
      });
    }
    await prisma.visitCommunityComment.upsert({
      where: { id: id("community-comment", index + 1) },
      update: {
        postId: actualPost.id,
        appUserId: id("user-staff", (index % staff.length) + 1),
        authorDisplayName: staff[index % staff.length].name,
        authorRole: staff[index % staff.length].role,
        isStylistComment: true,
        body: stylistComments[index]
      },
      create: {
        id: id("community-comment", index + 1),
        postId: actualPost.id,
        appUserId: id("user-staff", (index % staff.length) + 1),
        authorDisplayName: staff[index % staff.length].name,
        authorRole: staff[index % staff.length].role,
        isStylistComment: true,
        body: stylistComments[index],
        createdAt: addDays(now, -(index + 1))
      }
    });
  }

  for (let index = 0; index < 6; index += 1) {
    await prisma.styleSuggestion.upsert({
      where: { id: id("style-suggestion", index + 1) },
      update: {
        customerId: customers[index].id,
        visitId: id("visit", index * 3 + 1),
        suggestedStyleName: index % 2 === 0 ? "顔まわりレイヤー" : "やわらかショート",
        reason: "朝のスタイリング時間と髪の動きに合わせた提案。",
        caution: "毛先の乾燥を見ながら長さを調整する。",
        stylingAdvice: "根元を起こして乾かし、毛先だけ少量のミルクを使う。",
        accepted: index % 3 !== 0,
        imageUrls: [stylePhotoAssignments[index % stylePhotoAssignments.length].asset],
        menuSuggestion: index % 2 === 0 ? "カット + 透明感カラー" : "似合わせカット",
        estimatedMinutes: index % 2 === 0 ? 150 : 60,
        maintenanceLevel: "45日"
      },
      create: {
        id: id("style-suggestion", index + 1),
        customerId: customers[index].id,
        visitId: id("visit", index * 3 + 1),
        suggestedStyleName: index % 2 === 0 ? "顔まわりレイヤー" : "やわらかショート",
        reason: "朝のスタイリング時間と髪の動きに合わせた提案。",
        caution: "毛先の乾燥を見ながら長さを調整する。",
        stylingAdvice: "根元を起こして乾かし、毛先だけ少量のミルクを使う。",
        accepted: index % 3 !== 0,
          imageUrls: [stylePhotoAssignments[index % stylePhotoAssignments.length].asset],
        menuSuggestion: index % 2 === 0 ? "カット + 透明感カラー" : "似合わせカット",
        estimatedMinutes: index % 2 === 0 ? 150 : 60,
        maintenanceLevel: "45日",
        createdAt: addDays(now, -(index * 8 + 4))
      }
    });
  }

  await prisma.referral.upsert({
    where: { code: "YOH-A8K3X" },
    update: {
      referrerCustomerId: customers[0].id,
      referredCustomerId: customers[7].id,
      tokenHash: sha256("YOH-A8K3X"),
      status: "rewarded",
      registeredAt: addDays(now, -32),
      firstVisitCompletedAt: addDays(now, -14),
      rewardedAt: addDays(now, -14),
      expiresAt: null
    },
    create: {
      id: id("referral", 1),
      referrerCustomerId: customers[0].id,
      referredCustomerId: customers[7].id,
      tokenHash: sha256("YOH-A8K3X"),
      code: "YOH-A8K3X",
      status: "rewarded",
      registeredAt: addDays(now, -32),
      firstVisitCompletedAt: addDays(now, -14),
      rewardedAt: addDays(now, -14),
      expiresAt: null
    }
  });

  await prisma.partnerCoupon.upsert({
    where: { id: id("partner-coupon", 1) },
    update: {
      customerId: customers[0].id,
      partnerName: "喫茶 余韻",
      industry: "カフェ",
      title: "施術後のコーヒー 100円OFF",
      description: "同じビル1階の架空カフェで使えるご近所特典です。",
      benefit: "ドリンク100円OFF",
      couponCode: "YOIN-COFFEE",
      status: "issued",
      validUntil: addDays(now, 20)
    },
    create: {
      id: id("partner-coupon", 1),
      customerId: customers[0].id,
      partnerName: "喫茶 余韻",
      industry: "カフェ",
      title: "施術後のコーヒー 100円OFF",
      description: "同じビル1階の架空カフェで使えるご近所特典です。",
      benefit: "ドリンク100円OFF",
      couponCode: "YOIN-COFFEE",
      status: "issued",
      validUntil: addDays(now, 20)
    }
  });
}

async function verifyShowcase() {
  const organization = await prisma.organization.findUniqueOrThrow({
    where: { id: SHOWCASE_ORGANIZATION_ID },
    select: {
      id: true,
      name: true,
      _count: {
        select: {
          users: true,
          customers: true,
          products: true,
          customerBroadcasts: true,
          staffBookingSettings: true,
          visitCommunityPosts: true
        }
      }
    }
  });
  const [appointments, visits, sales, proposals, reviews, coupons, chats] = await Promise.all([
    prisma.appointment.count({ where: { customer: { organizationId: SHOWCASE_ORGANIZATION_ID } } }),
    prisma.visit.count({ where: { customer: { organizationId: SHOWCASE_ORGANIZATION_ID } } }),
    prisma.serviceSale.count({ where: { customer: { organizationId: SHOWCASE_ORGANIZATION_ID } } }),
    prisma.productProposal.count({ where: { customer: { organizationId: SHOWCASE_ORGANIZATION_ID } } }),
    prisma.productReview.count({ where: { productProposal: { customer: { organizationId: SHOWCASE_ORGANIZATION_ID } } } }),
    prisma.coupon.count({ where: { customer: { organizationId: SHOWCASE_ORGANIZATION_ID } } }),
    prisma.chatThread.count({ where: { organizationId: SHOWCASE_ORGANIZATION_ID } })
  ]);
  return { organization, appointments, visits, sales, proposals, reviews, coupons, chats };
}

async function main() {
  const now = new Date();
  await seedOrganization();
  await seedStaff();
  await seedMenusAndProducts();
  const customers = await seedCustomers(now);
  await seedOperations(customers, now);
  await seedProductFeedback(customers, now);
  await seedPoints(customers, now);
  await seedOffersAndCommunication(customers, now);
  await seedCommunityAndExtras(customers, now);
  const result = await verifyShowcase();
  console.log(JSON.stringify({
    ...result,
    staffLogin: { url: "/admin/login", loginId: OWNER_LOGIN_ID, password: OWNER_PASSWORD },
    customerLogin: { url: "/u/login", loginId: CUSTOMER_LOGIN_ID, password: CUSTOMER_PASSWORD }
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
