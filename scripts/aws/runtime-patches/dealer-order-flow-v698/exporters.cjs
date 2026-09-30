'use strict'
function cell(value) {
  const raw=typeof value==='number'?String(value):String(value??'').replace(/^[=+@\-\t\r]/,"'$&")
  return '"'+raw.replace(/"/g,'""')+'"'
}
class GenericCsvExporter {
  export(purchase, sources) {
    const rows=[['発注日','発注番号','サロン','サロンコード','注文番号','商品コード','メーカー商品コード','仕入先商品コード','商品名','数量','メーカー','仕入先','備考']]
    const day=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Tokyo'}).format(new Date(purchase.createdAt))
    for(const source of sources){
      const s=source.snapshot
      rows.push([day,purchase.documentNo,s.salon,s.salonCode,s.orderNo,s.productCode,s.manufacturerProductCode,s.supplierProductCode,s.productName,source.quantity,s.manufacturerName,purchase.supplier,s.note])
    }
    return {filename:purchase.documentNo.replace(/[^A-Za-z0-9_-]/g,'_')+'.csv',contentType:'text/csv; charset=utf-8',body:'\ufeff'+rows.map(r=>r.map(cell).join(',')).join('\r\n')}
  }
}
const exporters=new Map([['generic',new GenericCsvExporter()]])
function getExporter(key) {
  if(!exporters.has(key))throw Object.assign(new Error('仕入先の発注形式が未対応です。汎用CSVを設定してください。'),{status:409})
  return exporters.get(key)
}
module.exports={GenericCsvExporter,getExporter}
