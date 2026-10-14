'use strict'

const groups = [
  {id:'home',label:'ホーム',icon:'building',pages:[['operations','業務ダッシュボード']]},
  {id:'orders',label:'受発注・在庫',icon:'clipboard',pages:[['orders','受注管理'],['procurement','仕入発注'],['fulfillment','出荷・納品'],['inventory','倉庫・在庫']]},
  {id:'partners',label:'取引先・商品',icon:'package',pages:[['salons','契約美容室'],['products','商品管理'],['pricing','契約価格']]},
  {id:'sales',label:'売上・請求',icon:'chart',pages:[['sales','月次売上'],['period-sales','期間別売上'],['calendar','売上カレンダー'],['manufacturer-report','メーカー別集計'],['receivables','請求・入金']]},
  {id:'activity',label:'営業・チャット',icon:'users',pages:[['activities','営業予定・活動'],['messages','サロンチャット'],['targets','目標・進捗']]},
  {id:'settings',label:'設定',icon:'settings',pages:[['company','会社・店舗情報'],['team','スタッフ・営業所'],['password-change','パスワード変更']]},
]
function navigation(dealer) {
  return groups.map(group=>({...group,pages:group.pages.filter(([key])=>
    (key!=='team'||dealer.role!=='STAFF') &&
    (key!=='procurement'||dealer.role==='ADMIN'||dealer.canProcure===true))}))
}
module.exports={navigation}
