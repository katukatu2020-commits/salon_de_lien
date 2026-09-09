'use strict'

const icons = require('./audience-icons')

const SITE_URL = 'https://salon-de-lien.com'
const ASSETS = '/brand/'
const PHONE = '070-9444-6007'
const EMAIL = 'support@salon-de-lien.com'
const ROUTES = ['/', '/business', '/business/salon', '/business/dealer']

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]))
}

function link(href, label, variant = '') {
  return `<a class="action ${variant}" href="${href}">${label}</a>`
}

function brand(business = false) {
  return `<a class="brand" href="${business ? '/business' : '/'}" aria-label="ORIMIA ${business ? 'ビジネス向けトップ' : 'トップ'}"><img src="${ASSETS}orimia-icon-192.png?v=511" width="42" height="42" alt=""><span><strong>ORIMIA</strong><small>${business ? 'FOR BUSINESS' : 'BEAUTY MEMBERSHIP'}</small></span></a>`
}

function navLinks(route) {
  if (route === '/') return '<a href="#services">できること</a><a href="#start">はじめ方</a><a href="#faq">よくある質問</a>'
  return `<a href="/business/salon"${route === '/business/salon' ? ' aria-current="page"' : ''}>美容室の方</a><a href="/business/dealer"${route === '/business/dealer' ? ' aria-current="page"' : ''}>ディーラーの方</a><a href="#contact">お問い合わせ</a>`
}

function header(route) {
  const business = route !== '/'
  const login = route === '/business/dealer' ? '/dealer/login' : business ? '/admin/login' : '/u/login'
  return `<a class="skip" href="#main">本文へ移動</a><header class="site-header"><div class="wrap header-inner">${brand(business)}<nav class="desktop-nav" aria-label="メインナビゲーション">${navLinks(route)}</nav>${route === '/business' ? link('#solutions', 'サービスを選ぶ', 'header-action') : link(login, 'ログイン', 'header-action')}</div></header>`
}

function footer(route) {
  const business = route !== '/'
  return `<footer class="site-footer"><div class="wrap footer-top">${brand(business)}<p>${business ? '美容に関わる仕事を、もっとなめらかに。' : 'いつものサロンと、これからの私。'}</p><nav aria-label="フッターナビゲーション">${business ? '<a href="/business/salon">美容室向け</a><a href="/business/dealer">ディーラー向け</a>' : '<a href="/u/login">お客様ログイン</a><a href="/u/register">新規登録</a>'}<a href="/privacy">プライバシーポリシー</a><a href="/terms">利用規約</a><a href="#contact">お問い合わせ</a></nav></div><div class="wrap footer-bottom"><span>&copy; ${new Date().getFullYear()} ORIMIA</span><span>${business ? 'ORIMIA FOR BUSINESS' : 'BEAUTY MEMBERSHIP'}</span></div></footer>`
}

function hero({ audience, name, suffix = '', title, description, image, alt, actions, note = '', right = false }) {
  return `<section class="hero ${right ? 'hero-right' : ''}" aria-labelledby="hero-title"><img class="hero-image" src="${ASSETS}${image}" alt="${alt}" fetchpriority="high" width="1600" height="1067"><div class="wrap hero-inner"><div class="hero-copy"><p class="eyebrow">${audience}</p><h1 id="hero-title">${name}${suffix ? `<span>${suffix}</span>` : ''}</h1><p class="hero-title">${title}</p><p class="hero-description">${description}</p><div class="actions">${actions}</div>${note ? `<p class="hero-note">${note}</p>` : ''}</div></div></section>`
}

function strip(items) {
  return `<div class="service-strip"><div class="wrap">${items.map((item, i) => `<a href="${item[0]}"><span>0${i + 1}</span>${item[1]}<span class="strip-arrow" aria-hidden="true">${icons.down}</span></a>`).join('')}</div></div>`
}

function heading(label, title, description = '') {
  return `<div class="section-heading"><p class="eyebrow">${label}</p><h2>${title}</h2>${description ? `<p>${description}</p>` : ''}</div>`
}

function featureList(items) {
  return `<ul class="feature-list">${items.map(item => `<li>${item}</li>`).join('')}</ul>`
}

function feature({ id, number, label, title, description, image, alt, items, reverse = false }) {
  return `<section id="${id}" class="feature-section ${reverse ? 'reverse' : ''}"><div class="wrap feature-layout"><figure class="feature-image"><img src="${ASSETS}${image}" alt="${alt}" loading="lazy" width="1200" height="900"></figure><div class="feature-copy"><p class="eyebrow"><span class="number">${number}</span> ${label}</p><h2>${title}</h2><p>${description}</p>${featureList(items)}</div></div></section>`
}

function steps({ title, introduction, items, action }) {
  return `<section id="start" class="start-section"><div class="wrap">${heading('GET STARTED', title, introduction)}<ol class="steps">${items.map((item, i) => `<li><span class="step-number">0${i + 1}</span><h3>${item[0]}</h3><p>${item[1]}</p></li>`).join('')}</ol><div class="section-action">${action}</div></div></section>`
}

function faq(items) {
  return `<section id="faq" class="faq-section"><div class="wrap faq-layout">${heading('QUESTIONS', 'よくある質問')}<div class="faq-list">${items.map(item => `<details><summary>${item[0]}<span aria-hidden="true">${icons.plus}</span></summary><div><p>${item[1]}</p></div></details>`).join('')}</div></div></section>`
}

function contact(business = false) {
  return `<section id="contact" class="contact-section"><div class="wrap contact-layout"><div><p class="eyebrow">CONTACT</p><h2>${business ? '導入・サービスに関するご相談' : 'お困りのときは'}</h2><p>${business ? '店舗運営やお取引に合わせたご利用について、ORIMIAの窓口へお問い合わせください。' : 'ご予約・施術に関するご相談は、ご利用のサロンへ。ログインなどサービスに関するお問い合わせは、ORIMIAの窓口で承ります。'}</p></div><address><a href="mailto:${EMAIL}">${EMAIL}</a><a href="tel:+817094446007">${PHONE}</a></address></div></section>`
}

function customerPage() {
  const content = hero({
    audience:'BEAUTY MEMBERSHIP', name:'ORIMIA', title:'いつものサロンと、<br>これからの私。',
    description:'次の予約も、髪の相談も、お気に入りの記録も。<br>サロンにいる時間だけでなく、毎日のきれいをつなぐ会員サービス。',
    image:'consultation.webp', alt:'サロンで髪の色や仕上がりについて相談する様子',
    actions:link('/u/register', 'ORIMIAをはじめる', 'primary') + link('/u/login', 'ログイン', 'secondary'),
    note:'ORIMIAを導入しているサロンでご利用いただけます。',
  }) + strip([['#booking','次の予約をする'], ['#consultation','髪のことを相談する'], ['#aftercare','お気に入りを残す']]) +
  `<div id="services"><section class="intro"><div class="wrap">${heading('YOUR SALON, CLOSER', '来店前も、来店後も。<br>サロンがもっと身近になる。', '忙しい日も、少し髪が気になる日も。あなたのペースで、いつものサロンとつながれます。')}</div></section>` +
  feature({ id:'booking', number:'01', label:'RESERVATION', title:'次の予約を、<br>あなたのペースで。', description:'空いている日時を確認して、メニューと担当者を選択。予約内容をあとから見返せるので、次の来店予定もすっきりまとまります。', image:'salon-interior-illustrated.png', alt:'自然光の入る美容室のセット面', items:['空き状況から日時・メニュー・担当者を選択','予約日時や内容をいつでも確認','変更・キャンセルはサロンの受付条件に合わせて'] }) +
  feature({ id:'consultation', number:'02', label:'CONSULTATION', title:'髪の小さな悩みも、<br>気軽に相談。', description:'「このスタイルは似合う？」「家ではどう乾かす？」来店前の希望から、施術後のお手入れまで。チャットでサロンへ相談できます。', image:'customer-hair-care.webp', alt:'ヘアケアをしながら髪の仕上がりを確認する様子', items:['来店前に希望のスタイルを相談','施術後のスタイリング・お手入れを質問','相談のやり取りをあとから確認'], reverse:true }) +
  feature({ id:'aftercare', number:'03', label:'STYLE & CARE', title:'好きなスタイルを、<br>次のきっかけに。', description:'サロンのスタイル投稿を見ながら、次の髪型を探したり、コメントで感想を伝えたり。来店履歴やお得な情報も一緒に確認できます。', image:'customer-visit-history-v2.png', alt:'施術後の髪の仕上がりを記録する様子', items:['スタイル投稿へのいいね・コメント','これまでの来店や施術の記録を確認','サロンのポイント・クーポン・お知らせを確認'] }) + '</div>' +
  steps({ title:'サロンとつながる、3つのステップ。', introduction:'ご利用のサロンから案内された情報をご用意ください。', items:[['アカウントを登録','メールアドレスの確認後、お客様情報を登録します。'],['サロンを登録','店舗コードなど、サロンからの案内に沿って連携します。'],['予約や相談をはじめる','登録したサロンのメニューや空き状況を確認できます。']], action:link('/u/register', 'お客様の新規登録', 'primary') + link('/u/login', '登録済みの方はこちら', 'text-action') }) +
  faq([
    ['どの美容室でも使えますか？','ORIMIAを導入しているサロンでご利用いただけます。ご利用のサロンに、店舗コードや登録方法をご確認ください。'],
    ['予約の変更やキャンセルはできますか？','予約内容の画面から、サロンの受付条件に応じてお手続きいただけます。受付期限を過ぎた場合など、画面から操作できないときはサロンへ直接ご連絡ください。'],
    ['ポイントやクーポンはどこで確認できますか？','ログイン後に、ご利用のサロンのポイントやクーポンを確認できます。内容や利用条件はサロンによって異なります。'],
    ['ログインできなくなったときは？','ログイン画面の再設定案内をご利用ください。解決しない場合は、ORIMIAのお問い合わせ窓口へご連絡ください。'],
    ['お知らせの受け取り方は変更できますか？','ログイン後の設定から確認できます。予約関連SMSは初期状態ではOFFで、認証済みの電話番号について受信を希望して設定した場合に送信対象となります。'],
  ]) + contact()
  return { title:'ORIMIA | いつものサロンと、これからの私。', description:'美容室の予約、髪のチャット相談、スタイルや来店履歴の確認をひとつに。ORIMIAは、いつものサロンとあなたをつなぐ会員サービスです。', image:'consultation.webp', body:content }
}

function businessPage() {
  const body = hero({ audience:'FOR SALONS & DEALERS', name:'ORIMIA', suffix:'for Business', title:'美容に関わる仕事を、<br>もっとなめらかに。', description:'お客様に向き合うサロンと、その現場を支えるディーラー。それぞれの仕事を、それぞれに合ったサービスで。', image:'salon-workflow.webp', alt:'美容室の施術道具と予約ノートが並ぶワークスペース', right:true, actions:link('#solutions', 'サービスを見る', 'primary') }) +
    `<section id="solutions" class="solutions"><div class="wrap">${heading('OUR SERVICES', 'あなたの仕事に合うORIMIAを。')}<div class="solution-grid"><article class="solution"><a class="solution-image" href="/business/salon" tabindex="-1" aria-hidden="true"><img src="${ASSETS}salon-interior-illustrated.png" width="1200" height="800" alt="" loading="lazy"></a><div><p class="eyebrow">美容室向け</p><h2>ORIMIA <span>for Salon</span></h2><p>予約、顧客カルテ、会計、在庫・発注まで。日々の店舗運営と、お客様との継続的なつながりを支えます。</p>${link('/business/salon', '美容室向けサービスを見る', 'primary')}<a class="login-text" href="/admin/login">店舗ログイン</a></div></article><article class="solution"><a class="solution-image" href="/business/dealer" tabindex="-1" aria-hidden="true"><img src="${ASSETS}product-collection.webp" width="1200" height="800" alt="" loading="lazy"></a><div><p class="eyebrow">ディーラー向け</p><h2>ORIMIA <span>Partner</span></h2><p>契約美容室、商品、取引先ごとの割引率、受注・納品を一元管理。サロンとの日々の取引をつなぎます。</p>${link('/business/dealer', 'ディーラー向けサービスを見る', 'primary')}<a class="login-text" href="/dealer/login">ディーラーログイン</a></div></article></div></div></section>` +
    `<section class="connection"><div class="wrap">${heading('CONNECTED WORK', 'サロンとディーラーを、ひとつの流れに。', '固有コードで連携し、契約に合わせた商品・価格を共有。発注から納品までの状況を、双方で確認できます。')}<ol class="connection-flow"><li>取引先と連携</li><li>商品・契約価格を共有</li><li>発注・受注</li><li>出荷・納品</li></ol></div></section>` + contact(true)
  return { title:'ORIMIA for Business | 美容室・ディーラー向けサービス', description:'美容室向けのORIMIA for Salonと、ディーラー向けのORIMIA Partner。店舗運営からサロンとの受発注まで、仕事に合ったサービスをご紹介します。', image:'salon-workflow.webp', body }
}

function salonPage(onboarding) {
  const register = onboarding ? '/admin/register' : 'mailto:support@salon-de-lien.com'
  const registerLabel = onboarding ? '店舗の新規登録' : '導入について相談する'
  const body = hero({ audience:'美容室向けサービス', name:'ORIMIA', suffix:'for Salon', title:'お客様に向き合う時間を、<br>店舗運営の中心に。', description:'予約から顧客カルテ、会計、在庫・発注まで。毎日のサロンワークをひとつにつなぐ、店舗向けサービス。', image:'salon-workflow.webp', alt:'カルテや施術道具を整えたサロンのワークスペース', right:true, actions:link(register, registerLabel, 'primary') + link('/admin/login', '店舗ログイン', 'secondary') }) +
    strip([['#salon-customer','予約・顧客対応'], ['#salon-operation','会計・店舗運営'], ['#salon-order','在庫・発注']]) +
    feature({ id:'salon-customer', number:'01', label:'CUSTOMER EXPERIENCE', title:'予約と接客の記録を、<br>次のご来店へ。', description:'予約カレンダーと顧客カルテで、来店予定とこれまでの施術を確認。お客様との相談やスタイル共有も、接客の流れにつながります。', image:'consultation.webp', alt:'お客様の希望に合わせてヘアカラーを相談する様子', items:['予約カレンダー・顧客カルテ・施術メモ','店舗内だけで閲覧できるカルテファイル','チャット相談・お知らせ配信・スタイル投稿'] }) +
    feature({ id:'salon-operation', number:'02', label:'SALON OPERATIONS', title:'毎日の会計から、<br>これからの経営まで。', description:'会計データや日別の売上を確認し、日々の運営を見渡せます。オーナーと店舗共通アカウントを分けて、業務に合わせて利用できます。', image:'customer-crm.webp', alt:'タブレットと記録を確認するサロンスタッフ', items:['会計・レシート印刷・日別売上集計','経営分析・商品分析・レビュー確認','スタッフの出退勤管理・アカウント権限'], reverse:true }) +
    feature({ id:'salon-order', number:'03', label:'INVENTORY & ORDERS', title:'在庫確認から発注まで、<br>取引先とつながる。', description:'ディーラーの固有コードで連携すると、取引先が設定した商品と契約単価を確認できます。複数のディーラーとの取引にも対応しています。', image:'salon-product-shelf-illustrated.png', alt:'サロンで扱うヘアケア商品の棚', items:['定価・割引率・契約単価を確認して発注','商品ごとの在庫確認・棚卸し','発注履歴と出荷・納品状況を確認'] }) +
    `<section class="billing-note"><div class="wrap">${heading('SUBSCRIPTION', '店舗に合わせて、利用をスタート。', '月額利用制です。登録画面で利用プランと料金をご確認のうえ、クレジットカード決済を設定してご利用いただきます。')}<p>お支払いはStripeを利用します。利用できる機能・条件は契約プランによって異なります。</p></div></section>` +
    steps({ title:'導入までの流れ', introduction:'店舗情報と、お申し込みに使うメールアドレスをご用意ください。', items:[['店舗を登録','メールアドレスを確認し、店舗・オーナー・共通アカウントの情報を登録します。'],['利用プラン・決済を設定','契約内容を確認し、クレジットカード決済を設定します。'],['店舗の運用を設定','メニューやスタッフ、営業時間を設定し、お客様に登録方法をご案内します。']], action:link(register, registerLabel, 'primary') }) +
    faq([
      ['スタッフも利用できますか？','オーナーとは別に店舗共通アカウントを設定できます。管理権限を分けて利用でき、共通アカウントから過去の出退勤記録を修正することはできません。'],
      ['カルテの画像やPDFを保存できますか？','顧客カルテに画像・PDFを添付できます。カルテファイルは店舗内の記録として扱い、お客様アプリには公開されません。'],
      ['複数のディーラーと取引できますか？','はい。取引先ディーラーごとに連携できます。発注画面には、ディーラー側で設定された商品・割引率・契約単価が表示されます。'],
      ['Hotpepperの予約と連携できますか？','店舗作成時に専用の予約受信用メールが自動発行されます。SALON BOARD側の通知先登録、または予約メールの転送設定が別途必要です。'],
    ]) + contact(true)
  return { title:'ORIMIA for Salon | 美容室の予約・顧客・店舗運営', description:'予約、顧客カルテ、チャット、会計、経営分析、在庫・発注をひとつに。美容室の毎日の運営を支えるORIMIA for Salonをご紹介します。', image:'salon-workflow.webp', body }
}

function dealerPage() {
  const body = hero({ audience:'ディーラー向けサービス', name:'ORIMIA', suffix:'Partner', title:'美容室との取引を、<br>もっと見通しよく。', description:'契約美容室、商品、取引条件、受注・納品まで。サロンとのつながりを支える、ディーラーのためのサービス。', image:'product-insights.webp', alt:'サロンで扱うヘアケア用品と商品サンプル', actions:link('/dealer/register', 'ディーラーの新規登録', 'primary') + link('/dealer/login', 'ログイン', 'secondary') }) +
    strip([['#dealer-partners','契約美容室'], ['#dealer-pricing','商品・取引条件'], ['#dealer-orders','受注・納品']]) +
    feature({ id:'dealer-partners', number:'01', label:'SALON PARTNERS', title:'取引先ごとのつながりを、<br>一か所で管理。', description:'自社の固有コードを美容室へ案内して連携を開始。契約美容室を一覧で管理し、複数の美容室との取引を整理できます。', image:'salon-interior-illustrated.png', alt:'ディーラーが商品を届ける美容室の内観', items:['契約美容室の登録・連携解除','美容室との連携に使う固有コードの確認','自社の会社情報・連絡先の管理'] }) +
    `<section id="dealer-pricing" class="pricing-section"><div class="wrap">${heading('02 / CONTRACT PRICING', '同じ商品でも、<br>美容室ごとの取り決めを。', '定価と商品情報を登録し、契約美容室ごとに割引率を一括管理。設定した商品・契約単価が、美容室側の発注画面に反映されます。')}<div class="example-heading"><span>取引条件の例</span><span>金額はすべて税抜・サンプルです</span></div><div class="table-scroll" role="region" aria-label="美容室別の取引条件の例" tabindex="0"><table><thead><tr><th scope="col">契約美容室</th><th scope="col">商品</th><th scope="col">定価</th><th scope="col">割引率</th><th scope="col">契約単価</th></tr></thead><tbody><tr><th scope="row">サロン A</th><td>ケアシャンプー 300mL</td><td>2,000円</td><td><span class="rate">20%</span></td><td class="price">1,600円</td></tr><tr><th scope="row">サロン B</th><td>ケアシャンプー 300mL</td><td>2,000円</td><td><span class="rate">30%</span></td><td class="price">1,400円</td></tr></tbody></table></div><div class="pricing-points"><div><h3>商品情報をまとめて管理</h3><p>メーカー、商品コード、JAN、定価、発注単位を登録。</p></div><div><h3>美容室単位で条件を設定</h3><p>取引先ごとの取り決めに合わせて、商品の割引率を管理。</p></div><div><h3>設定した情報だけを共有</h3><p>連携先の美容室に、対象の商品と契約単価を表示。</p></div></div></div></section>` +
    feature({ id:'dealer-orders', number:'03', label:'ORDER TO DELIVERY', title:'注文を受けてから、<br>納品するまで。', description:'美容室からの注文を一覧で確認。受注・出荷・納品の状況を更新し、納品書の表示・印刷までつなげられます。', image:'product-collection.webp', alt:'サロンに納品するヘアケア商品のイメージ', items:['美容室別の注文内容・発注履歴を確認','受注・出荷・納品のステータス管理','注文ごとの納品書の表示・印刷'], reverse:true }) +
    `<section class="billing-note"><div class="wrap">${heading('SUBSCRIPTION', 'クレジットカードで、月額利用。', 'アカウント登録後、利用料金・契約内容を確認し、Stripeでクレジットカード決済を設定してご利用いただきます。')}<p>システムの利用料と、美容室との商品取引に関する代金は別です。</p></div></section>` +
    steps({ title:'取引をつなぐ、3つのステップ。', introduction:'登録用メールアドレスと会社情報をご用意ください。', items:[['アカウント・会社情報を登録','確認メールから初期設定を行い、自社の情報と連絡先を登録します。'],['利用契約・決済を設定','利用料金を確認し、クレジットカード決済を設定します。'],['美容室と連携する','固有コードを案内し、取引先ごとの商品と割引率を設定します。']], action:link('/dealer/register', 'ディーラーの新規登録', 'primary') }) +
    faq([
      ['一つの美容室に複数のディーラーが連携できますか？','はい。美容室とディーラーは複数対複数で連携できます。各ディーラーが、自社と美容室の間の取引条件を管理します。'],
      ['同じ商品でも、美容室ごとに割引率を変えられますか？','はい。契約美容室単位で商品の割引率を一括管理できます。美容室の発注画面には、その取引先に対して設定した条件が表示されます。'],
      ['美容室側にはどの情報が表示されますか？','連携先に対して設定した商品情報、定価、割引率、契約単価、ディーラー名、発注単位などが表示されます。'],
      ['納品書は印刷できますか？','注文一覧・注文詳細から、該当する注文の納品書を表示して印刷できます。'],
    ]) + contact(true)
  return { title:'ORIMIA Partner | ディーラーの契約美容室・商品・受注管理', description:'契約美容室、商品、美容室別の割引率、受注・出荷・納品書を管理。サロンとの取引を支えるディーラー向けサービス、ORIMIA Partner。', image:'product-insights.webp', body }
}

function renderAudiencePage(route, options = {}) {
  if (!ROUTES.includes(route)) return null
  const page = route === '/' ? customerPage() : route === '/business' ? businessPage() : route === '/business/salon' ? salonPage(options.onboardingEnabled) : dealerPage()
  const canonical = SITE_URL + (route === '/' ? '/' : route)
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>${escapeHtml(page.title)}</title><meta name="description" content="${escapeHtml(page.description)}"><meta name="robots" content="index,follow"><link rel="canonical" href="${canonical}"><meta property="og:type" content="website"><meta property="og:site_name" content="ORIMIA"><meta property="og:locale" content="ja_JP"><meta property="og:title" content="${escapeHtml(page.title)}"><meta property="og:description" content="${escapeHtml(page.description)}"><meta property="og:url" content="${canonical}"><meta property="og:image" content="${SITE_URL + ASSETS + page.image}"><meta name="twitter:card" content="summary_large_image"><meta name="theme-color" content="#ffffff"><link rel="icon" href="${ASSETS}orimia-icon-32.png"><link rel="apple-touch-icon" href="${ASSETS}orimia-icon-180.png"><link rel="stylesheet" href="/orimia-public-v588.css"></head><body data-audience="${route === '/' ? 'customer' : route === '/business/dealer' ? 'dealer' : route === '/business/salon' ? 'salon' : 'business'}">${header(route)}<main id="main">${page.body}</main>${footer(route)}</body></html>`
}

module.exports = { renderAudiencePage, renderAudienceHeader:header, renderAudienceFooter:footer, ROUTES }
