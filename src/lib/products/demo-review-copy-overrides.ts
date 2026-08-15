/**
 * One-time editorial corrections for the generated Milbon demo reviews.
 *
 * Keys match the stable suffix used by the demo seed:
 *   MILBON_REVIEW_SEED:<productId>:<reviewIndex>
 *
 * Ratings, tags, products, customers, and usage metadata intentionally remain
 * owned by the existing demo generator. This table only corrects Japanese copy
 * that was already registered in the local demo database.
 */
export const DEMO_REVIEW_COPY_OVERRIDES: Readonly<Record<string, string>> = {
  "demo-aujua-aquaveer:2":
    "自分のくせには合いませんでした。期待していたほど髪が収まらず、使い続けるのは難しいと感じました。",
  "demo-aujua-aquaveer:3":
    "髪の内側が広がりにくくなり、乾かした後のまとまりを実感できました。",
  "demo-aujua-aquaveer:5":
    "以前使っていたくせ毛用トリートメントと比べると、仕上がりの差は小さく感じました。価格も考えると、リピートは迷います。",
  "demo-aujua-aquaveer:11":
    "3回ほど使ったところ、翌朝の寝ぐせを直しやすくなりました。",
  "demo-aujua-aquaveer:14":
    "中身の使用感ではなく、容器の扱いにくさが気になりました。毎日使うには少し面倒です。",
  "demo-aujua-aquaveer:16":
    "絡みやすい部分にも、むらなくなじませやすかったです。",
  "demo-aujua-aquaveer:17":
    "毛先の向きがそろいやすくなりました。一方で、多めに使うと少し重く感じます。",
  "demo-aujua-aquaveer:18":
    "耳の後ろが膨らみにくくなり、乾かした後の収まりをはっきり実感できました。",
  "demo-aujua-aquaveer:20":
    "朝に広がりやすい髪なので、前夜に中間から毛先へなじませてから流しました。毛先は落ち着きましたが、表面のうねりは少し残ります。すすいだ後の指通りは良かったです。",
  "demo-aujua-aquaveer:24":
    "タオルドライをした後は、髪の広がりがかなり落ち着きました。",
  "demo-aujua-aquaveer:28":
    "使用量を守れば重くなりにくく、普段のトリートメントとして使いやすいです。",
  "demo-aujua-aquaveer:33":
    "硬い髪でも、乾かした後は指を通しやすく感じました。",
  "demo-aujua-aquaveer:34":
    "表面のうねりは少し残りましたが、毛先が落ち着いた点は良かったです。",

  "demo-aujua-immurise:9":
    "中間から毛先まで均一になじませやすく、ブロー後の収まりも良かったです。一方で、手に少し残る感じは気になりました。",
  "demo-aujua-immurise:11":
    "仕上がりには満足していますが、続けて使うには価格が少し気になります。",

  "demo-aujua-inmetry:4":
    "仕上がりに大きな不満はありませんが、使用頻度と価格のバランスを考えると迷います。",

  "demo-aujua-aging-spa:1":
    "地肌をこすりすぎないよう渡辺さんに教わり、その通りに洗いました。洗い上がりはすっきりしました。",
  "demo-aujua-aging-spa:2":
    "洗った後は髪が軽く感じられました。",
  "demo-aujua-aging-spa:8":
    "洗った後に地肌がやわらかく感じられ、頭皮用のケアとして続けたいと思いました。",

  "demo-aujua-oathenam:0":
    "すすいだ後は、髪と地肌が軽く感じられました。",
  "demo-aujua-oathenam:2":
    "力を入れすぎずに地肌を洗うと、夕方のにおいが気になりにくくなりました。",
  "demo-aujua-oathenam:6":
    "教わったように指の腹で洗うと、洗い上がりがすっきりしました。",
  "demo-aujua-oathenam:7":
    "洗った後の軽さをはっきり感じられました。",
  "demo-aujua-oathenam:8":
    "地肌がすっきりする点が特に良かったです。",
  "demo-aujua-oathenam:11":
    "洗い上がりは、地肌がすっきりしていました。",
  "demo-aujua-oathenam:12":
    "自分にはさっぱり感が強すぎました。洗い方を変えても印象は変わらず、続けるのは難しいです。",

  "demo-aujua-quench-shampoo:0":
    "地肌までしっかり予洗いしてから、ワンプッシュ弱を泡立てて洗いました。毛先が引っかかりやすい日でも地肌は軽く、かゆみも出ませんでした。髪のまとまりには別のケアが必要ですが、頭皮は洗いやすかったです。",

  "demo-aujua-quench-treatment:4":
    "毛先に多めになじませましたが、くせが出やすい自分の髪には量を控えた方が扱いやすかったです。",
  "demo-aujua-quench-treatment:5":
    "気になっていた状態が完全に改善したわけではありませんが、髪は扱いやすくなりました。",
  "demo-aujua-quench-treatment:7":
    "毛先がやわらかく感じられ、乾燥が気になる日に使いやすいです。",
  "demo-aujua-quench-treatment:12":
    "時間を置いてから流しても、自分にはしっとり感が強すぎました。仕上がりが重く感じるため、使い続けるのは難しいです。",
  "demo-aujua-quench-treatment:13":
    "毛先だけになじませると扱いやすく、やわらかい手触りになった点が良かったです。",

  "demo-aujua-quench-leave-in:0":
    "米粒ほどを毛先になじませて乾かしましたが、夕方には髪がぺたっと見えました。朝に足して使うには重く、続けるのは難しいです。",
  "demo-aujua-quench-leave-in:5":
    "乾かす前に毛先へなじませると収まりは出ますが、広い範囲につけると髪がぺたっと見えました。",
  "demo-aujua-quench-leave-in:9":
    "少量ずつ出せるので、使う量を調整しやすい容器だと思いました。",
  "demo-aujua-quench-leave-in:10":
    "教わった通りに毛先へなじませると、ドライヤー後も髪が硬くなりにくいと感じました。",
  "demo-aujua-quench-leave-in:13":
    "毛先だけなら重くなりませんが、前髪につけると少し重く感じました。乾燥が気になる時期は、量を調整しながら使いたいです。",
  "demo-aujua-quench-leave-in:15":
    "寝る前に毛先へなじませましたが、つける範囲を広げると髪がぺたっと見えました。",

  "demo-aujua-growcive:0":
    "週末に使ってみたところ、洗い上がりは地肌がすっきりしました。",
  "demo-aujua-growcive:2":
    "根元を意識して洗いやすく、普段の頭皮ケアに取り入れたいと思いました。",
  "demo-aujua-growcive:3":
    "教わった手順で洗うと、地肌のすっきり感を実感できました。",
  "demo-aujua-growcive:7":
    "根元を意識しながら洗いやすいシャンプーでした。",
  "demo-aujua-growcive:11":
    "地肌がすっきりし、普段のケアにも取り入れやすかったです。次も同じものを選びたいと思います。",

  "demo-aujua-smooth:11":
    "以前のさらさらタイプより、乾かした後の収まりが良かったです。軽い仕上がりにしたい日に使いやすく、なくなったらまた購入したいと思います。",

  "demo-aujua-timesurge:5":
    "使っても違いが分かりにくく、自分の髪には合いませんでした。続けて使うのは難しいです。",

  "demo-aujua-diorum:9":
    "毛先だけになじませても重さが残りました。仕上がりを考えると、買い替える決め手にはなりませんでした。",
  "demo-aujua-diorum:11":
    "一週間ほど使うと、乾燥して見えていた部分にツヤが出ました。",
  "demo-aujua-diorum:13":
    "自分の髪には合わず、使い続けたいとは思いませんでした。",

  "demo-aujua-fillmellow-shampoo:1":
    "浴室でも容器を扱いやすく、洗った後は髪がまとまりやすくなりました。毎日のケアとして続けたいです。",
  "demo-aujua-fillmellow-shampoo:10":
    "無香料に近いものが好みなので、香りは少し強く感じました。",
  "demo-aujua-fillmellow-shampoo:13":
    "以前のダメージケア用シャンプーより、自然にまとまりました。初めて使った日から、乾かした後の違いが分かりました。",

  "demo-aujua-fillmellow-treatment:1":
    "丁寧にすすぐと、毛先がやわらかく感じられました。",
  "demo-aujua-fillmellow-treatment:3":
    "少なめから量を調整しました。普通の太さの髪でも、量を控えた方が自然に仕上がりました。",
  "demo-aujua-fillmellow-treatment:6":
    "市販のしっとり系トリートメントより、熱で傷んだ部分の手触りが良くなりました。一週間ほど使うと、乾かした後の違いも分かりました。",
  "demo-aujua-fillmellow-treatment:11":
    "濡れた髪にもむらなく伸ばしやすく、すすいだ後の指通りも良かったです。",
  "demo-aujua-fillmellow-treatment:12":
    "使っている間は香りを感じますが、乾かす頃にはかなり穏やかになります。毎日でも使いやすい香りです。",
  "demo-aujua-fillmellow-treatment:13":
    "硬さが気になる部分には少し多めになじませました。全体の量を控えると、重くならず自然に仕上がりました。",

  "demo-aujua-precedia:3":
    "以前使っていたスカルプ系シャンプーより少し良く感じましたが、差は小さめです。地肌を中心に洗いました。",
  "demo-aujua-precedia:8":
    "教わった手順で洗うと、香りが強く残らず使いやすかったです。",

  "demo-aujua-moistcalm:2":
    "自分の頭皮には合わず、使い続けるのは難しいと感じました。",
  "demo-aujua-moistcalm:4":
    "洗った後は髪と地肌が軽く感じられ、普段のケアに取り入れやすかったです。",
  "demo-aujua-moistcalm:9":
    "カラー後の数日に使うと、洗った後は髪が軽く感じられました。",
  "demo-aujua-moistcalm:11":
    "指の腹で洗うように教わり、その通りにすると洗い上がりが軽く感じられました。",

  "demo-aujua-repairlity-treatment:5":
    "ブリーチで傷んだ毛先に少量をなじませてから流しました。乾かした後は、髪が広がりにくくなりました。",
  "demo-aujua-repairlity-treatment:14":
    "ブリーチした部分の手触りが、以前より落ち着きました。",
  "demo-aujua-repairlity-treatment:15":
    "乾かした後の広がりが抑えられた点が、特に良かったです。",

  "demo-global-milbon-wet-shine-gel-cream-5:5":
    "軽い濡れ感を出したい日に、手のひらへ薄く伸ばしてセットしました。軽い仕上がりなら夕方まで形が残ります。",
  "demo-global-milbon-wet-shine-gel-cream-5:10":
    "手に残る感じが気になりました。急いでいる朝は、洗い落とす手間が少し面倒です。",

  "demo-global-milbon-wet-shine-gel-cream-8:6":
    "濡れ感と、はっきりした束感を一度に作れる点が良かったです。",
  "demo-global-milbon-wet-shine-gel-cream-8:11":
    "手についた分は、洗えばすぐに落とせました。",
  "demo-global-milbon-wet-shine-gel-cream-8:12":
    "夕方まで形は残りましたが、普段使いするかは迷います。",
  "demo-global-milbon-wet-shine-gel-cream-8:15":
    "髪が硬めなので、量を控えてセットしました。形が長く残り、直す回数も少なく済みました。",

  "demo-global-milbon-polishing-oil:0":
    "一滴ずつ毛先になじませました。毛量が多い自分の髪でも、量を控えると扱いやすく、香りも上品でした。",
  "demo-global-milbon-polishing-oil:5":
    "湿度が高い日でも、仕上げた形が大きく崩れませんでした。完全に広がらなくなるわけではありませんが、髪は扱いやすくなりました。",
  "demo-global-milbon-polishing-oil:10":
    "手に残る感じは少なく、洗えばすぐに落とせました。朝の仕上げにも使いやすいです。",

  "demo-global-milbon-molding-wax-4:6":
    "軽く仕上げる日は動きを作りやすいですが、しっかり形を出したい時には少し物足りませんでした。",
  "demo-global-milbon-molding-wax-4:8":
    "パーマを出したい日に、手のひらでよく伸ばして使いました。量を控えると自然に仕上がり、毛先の動きもはっきり分かりました。普段のセット用として続けたいです。",

  "demo-global-milbon-molding-wax-7:0":
    "ショートの毛先に少量を伸ばしてセットしました。束感をはっきり出したい日には合っています。",
  "demo-global-milbon-molding-wax-7:3":
    "以前使っていたやわらかいワックスより硬めですが、しっかり形を出したい場面では便利です。",
  "demo-global-milbon-molding-wax-7:5":
    "前髪を避けて少量ずつ使うと、硬くなりすぎず扱いやすかったです。"
};

export function getDemoReviewCopyOverride(productId: string, reviewIndex: number) {
  return DEMO_REVIEW_COPY_OVERRIDES[`${productId}:${reviewIndex}`];
}
