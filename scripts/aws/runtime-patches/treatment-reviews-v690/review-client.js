(() => {
  const form=document.querySelector('#treatment-review-form')
  if(!form||form.dataset.bound==='true')return
  form.dataset.bound='true'
  const result=document.querySelector('#treatment-review-result'),done=document.querySelector('#treatment-review-done')
  const body=form.querySelector('textarea'),counter=form.querySelector('[data-char-count]')
  body?.addEventListener('input',()=>{counter.textContent=String(body.value.length)})
  let pending=false
  async function submit(method) {
    if(pending)return
    if(method==='DELETE'&&!confirm('レビューを削除しますか？公開が取り消されます。再投稿してもポイントは追加されません。'))return
    pending=true
    form.querySelectorAll('button').forEach(button=>{button.disabled=true})
    result.textContent=method==='DELETE'?'削除しています…':'保存しています…'
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000)
    try {
      const response=await fetch('/api/customer/treatment-reviews',{method,headers:{'Content-Type':'application/json'},signal:controller.signal,body:JSON.stringify({appointmentId:form.dataset.appointment,version:Number(form.dataset.version),rating:Number(new FormData(form).get('rating')),body:body?.value||'',publish:form.querySelector('[name="publish"]')?.checked===true})})
      const value=await response.json()
      if(!response.ok)throw Error(value.error||'保存できませんでした。')
      result.textContent=value.deleted?'レビューを削除しました。':value.awardedPoints>0?`レビューを公開しました。${value.awardedPoints}ptを付与しました。`:'レビューを保存しました。'
      form.hidden=true
      done.href=value.deleted?'/u/reviews':'/u/reviews?state=answered'
      done.textContent=value.deleted?'アンケート受信ボックスへ戻る':'投稿済みレビューへ戻る'
      done.hidden=false
    } catch(error) {
      result.textContent=error.name==='AbortError'?'通信に時間がかかっています。投稿済みレビューで保存状況を確認してください。':error.message
      form.querySelectorAll('button').forEach(button=>{button.disabled=false})
    } finally {clearTimeout(timer);pending=false}
  }
  form.addEventListener('submit',event=>{event.preventDefault();if(form.reportValidity())submit(form.dataset.method)})
  form.querySelector('[data-delete-review]')?.addEventListener('click',()=>submit('DELETE'))
})()
