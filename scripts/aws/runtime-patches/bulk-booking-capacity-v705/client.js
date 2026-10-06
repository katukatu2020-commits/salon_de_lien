  function bulkCapacityMarkupV705(payload) {
    if (payload.role !== 'ADMIN') return ''
    const today = todayInJapan(), first = payload.days[0].date, last = payload.days[payload.days.length - 1].date
    const from = today >= first && today <= last ? today : first
    return '<section class="ts-bulk-capacity-v705" aria-labelledby="bulk-capacity-title-v705"><h2 id="bulk-capacity-title-v705">受付可能数の一括設定</h2><form data-bulk-capacity-v705>' +
      '<div class="ts-bulk-fields"><label>開始日<input type="date" name="from" value="' + from + '" required></label><label>終了日<input type="date" name="to" value="' + last + '" required></label><label>同時受付可能数<input type="number" name="capacity" min="1" max="99" step="1" value="' + Math.min(99, payload.defaultSchedule.capacity) + '" required></label></div>' +
      '<fieldset class="ts-bulk-weekdays"><legend>対象曜日</legend>' + ['日','月','火','水','木','金','土'].map((label, index) => '<label><input type="checkbox" name="weekdays" value="' + index + '" checked><span>' + label + '</span></label>').join('') + '</fieldset>' +
      '<div class="ts-bulk-actions"><span data-bulk-count-v705></span><button type="submit">' + icon('calendar') + '受付可能数をまとめて保存</button></div><p data-bulk-status-v705 role="status" aria-live="polite"></p></form></section>'
  }

  function bindBulkCapacityV705(root) {
    const form = root.querySelector('[data-bulk-capacity-v705]')
    if (!form) return
    const status = form.querySelector('[data-bulk-status-v705]'), count = form.querySelector('[data-bulk-count-v705]'), button = form.querySelector('button')
    const values = () => ({ action: 'set-capacity', from: form.elements.from.value, to: form.elements.to.value, capacity: Number(form.elements.capacity.value), weekdays: [...form.querySelectorAll('[name="weekdays"]:checked')].map(input => Number(input.value)) })
    const updateCount = () => {
      const data = values(), start = Date.parse(data.from), end = Date.parse(data.to)
      let total = 0
      if (Number.isFinite(start) && end >= start && end - start < 366 * 86400000) {
        for (let day = start; day <= end; day += 86400000) if (data.weekdays.includes(new Date(day).getUTCDay())) total++
      }
      count.textContent = '対象 ' + total + '日'
      button.disabled = total === 0
    }
    form.addEventListener('input', updateCount)
    updateCount()
    form.addEventListener('submit', async event => {
      event.preventDefault()
      if (form.dataset.saving === '1') return
      status.classList.remove('error')
      if (root.querySelector('.ts-day-card[data-dirty="1"]')) {
        status.classList.add('error')
        status.textContent = '日別設定に未保存の変更があります。先に「変更をまとめて保存」を押してください。'
        return
      }
      const body = values()
      form.dataset.saving = '1'
      const controls = [...form.querySelectorAll('input,button'), ...root.querySelectorAll('.ts-day-card input,.ts-day-card select,[data-save-all],[data-sp-day-reset]')]
      const disabled = controls.map(control => control.disabled)
      controls.forEach(control => { control.disabled = true })
      status.textContent = '保存しています…'
      try {
        const response = await fetch('/api/lien-business-days', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body) })
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(payload.error || '保存できませんでした。')
        for (const date of payload.dates) {
          const card = root.querySelector('.ts-day-card[data-date="' + date + '"]')
          if (!card) continue
          const input = card.querySelector('[name="capacity"]')
          input.value = String(payload.capacity)
          input.defaultValue = String(payload.capacity)
          const badge = card.querySelector('.ts-day-badge')
          badge.textContent = '個別設定'; badge.classList.add('custom')
        }
        state.dailyScheduleDate = ''; state.dailyScheduleLoading = ''
        status.textContent = payload.count + '日分の受付可能数を' + payload.capacity + 'に保存しました。営業時間・休業日は変更していません。'
      } catch (error) { status.classList.add('error'); status.textContent = error.message }
      finally {
        form.dataset.saving = '0'
        controls.forEach((control, index) => { control.disabled = disabled[index] })
        updateCount()
      }
    })
  }
