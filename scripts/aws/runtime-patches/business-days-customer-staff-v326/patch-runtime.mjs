import fs from 'node:fs'
import path from 'node:path'

function read(file) {
  return fs.readFileSync(file, 'utf8')
}

function write(file, content) {
  fs.writeFileSync(file, content)
}

function replaceOnce(source, oldValue, newValue, label) {
  const count = source.split(oldValue).length - 1
  if (count !== 1) throw new Error(`${label}: expected 1 match, found ${count}`)
  return source.replace(oldValue, newValue)
}

function replaceSection(source, start, end, replacement, label) {
  const startIndex = source.indexOf(start)
  if (startIndex < 0) throw new Error(`${label}: start marker not found`)
  const endIndex = source.indexOf(end, startIndex)
  if (endIndex < 0) throw new Error(`${label}: end marker not found`)
  return source.slice(0, startIndex) + replacement + source.slice(endIndex)
}

const serverFile = '/app/tenant-setup.js'
let server = read(serverFile)
server = replaceSection(
  server,
  '    const data = await readJson(req)\n    const date = String(data.date || \'\')',
  '  }\n\n  async function connectionRow',
  `    const input = await readJson(req)
    const requestedDays = Array.isArray(input.days) ? input.days : [input]
    if (!requestedDays.length || requestedDays.length > 31) return json(res, 400, { error: '保存する日別設定を確認してください。' })
    const normalizedDays = []
    const seenDates = new Set()
    for (const data of requestedDays) {
      const date = String(data.date || '')
      if (!/^20\\d{2}-(0[1-9]|1[0-2])-([0-2]\\d|3[01])$/.test(date) || weekdayForDate(date) < 0) return json(res, 400, { error: '日付を確認してください。' })
      if (seenDates.has(date)) return json(res, 400, { error: '同じ日付が重複しています。' })
      seenDates.add(date)
      if (data.reset === true) {
        normalizedDays.push({ date, reset: true })
        continue
      }
      const isClosed = data.isClosed === true
      const openMinutes = Number(data.openMinutes)
      const closeMinutes = Number(data.closeMinutes)
      const capacity = Number(data.capacity)
      if (![openMinutes, closeMinutes].every(value => Number.isInteger(value) && value >= 0 && value <= 1440 && value % 30 === 0) || closeMinutes - openMinutes < 60) return json(res, 400, { error: date + 'の営業時間は30分単位で、1時間以上になるよう設定してください。' })
      if (!Number.isInteger(capacity) || capacity < 1 || capacity > 99) return json(res, 400, { error: date + 'の受付可能数は1〜99で設定してください。' })
      normalizedDays.push({ date, isClosed, openMinutes, closeMinutes, capacity, reset: false })
    }
    await prisma.$transaction(async database => {
      for (const day of normalizedDays) {
        if (day.reset) {
          await database.$executeRawUnsafe('DELETE FROM "OrganizationDailySchedule" WHERE "organizationId"=$1 AND "date"=$2', session.organizationId, day.date)
          continue
        }
        await database.$executeRawUnsafe('INSERT INTO "OrganizationDailySchedule" ("organizationId","date","isClosed","openMinutes","closeMinutes","capacity","updatedByUserId","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW()) ON CONFLICT ("organizationId","date") DO UPDATE SET "isClosed"=EXCLUDED."isClosed","openMinutes"=EXCLUDED."openMinutes","closeMinutes"=EXCLUDED."closeMinutes","capacity"=EXCLUDED."capacity","updatedByUserId"=EXCLUDED."updatedByUserId","updatedAt"=NOW()', session.organizationId, day.date, day.isClosed, day.openMinutes, day.closeMinutes, day.capacity, session.userId || null)
      }
    })
    return json(res, 200, { success: true, count: normalizedDays.length, dates: normalizedDays.map(day => day.date) })
`,
  'batch business-day API',
)
write(serverFile, server)

const clientFile = '/app/tenant-setup-client.js'
let client = read(clientFile)
client = replaceSection(
  client,
  '  async function saveBusinessDay(card, reset = false) {',
  '  async function renderBusinessDaysPage(force = false) {',
  `  function businessDayPayload(card) {
    return {
      date: card.dataset.date,
      isClosed: card.querySelector('[name="isClosed"]').checked,
      openMinutes: Number(card.querySelector('[name="openMinutes"]').value),
      closeMinutes: Number(card.querySelector('[name="closeMinutes"]').value),
      capacity: Number(card.querySelector('[name="capacity"]').value),
    }
  }

  function updateBusinessDaysDirtyState(root) {
    const count = root.querySelectorAll('.ts-day-card[data-dirty="1"]').length
    const countNode = root.querySelector('[data-dirty-count]')
    const button = root.querySelector('[data-save-all]')
    if (countNode) countNode.textContent = count ? count + '日分の変更があります' : '変更はありません'
    if (button) button.disabled = count === 0
  }

  function markBusinessDayDirty(card) {
    card.dataset.dirty = '1'
    card.classList.add('dirty')
    updateBusinessDaysDirtyState(card.closest('#ts-business-days-root'))
  }

  async function saveBusinessDays(root) {
    const cards = Array.from(root.querySelectorAll('.ts-day-card[data-dirty="1"]'))
    if (!cards.length) return
    const button = root.querySelector('[data-save-all]')
    const message = root.querySelector('.ts-days-message')
    button.disabled = true
    button.textContent = '保存しています…'
    try {
      const response = await fetch('/api/lien-business-days', { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ days: cards.map(businessDayPayload) }) })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || '保存できませんでした。')
      state.dailyScheduleDate = ''
      state.dailyScheduleLoading = ''
      await renderBusinessDaysPage(true)
      const refreshed = document.getElementById('ts-business-days-root')
      refreshed.querySelector('.ts-days-message').textContent = payload.count + '日分の営業時間・休業日を保存しました。シフト表にも反映されています。'
    } catch (error) {
      message.textContent = error.message
      button.disabled = false
      button.textContent = '変更をまとめて保存'
    }
  }

`,
  'business-day bulk-save client',
)

client = replaceOnce(
  client,
  '.ts-day-actions{display:flex;justify-content:flex-end;gap:6px;margin-top:13px}.ts-day-action{min-height:31px;border:1px solid #e1cec6;border-radius:999px;background:#fff;padding:0 10px;color:#70483e;font-size:10px;font-weight:800;cursor:pointer}.ts-day-action.primary{border-color:#a75547;background:#a75547;color:#fff}.ts-day-action:disabled{opacity:.5;cursor:wait}.ts-days-message{min-height:20px;margin:12px 4px 0;color:#4d7964;font-size:11px;font-weight:800}',
  '.ts-day-card.dirty{box-shadow:inset 0 0 0 2px #d96b88;background:#fff8fa}.ts-days-savebar{position:sticky;z-index:20;bottom:16px;display:flex;align-items:center;justify-content:space-between;gap:16px;margin:18px auto 0;border:1px solid #e2c9bf;border-radius:18px;background:rgba(255,253,251,.96);padding:14px 16px;box-shadow:0 14px 38px rgba(76,43,34,.16);backdrop-filter:blur(12px)}.ts-days-savecopy{display:grid;gap:3px;color:#342620;font-size:12px}.ts-days-savecopy strong{font-size:13px}.ts-days-savecopy span{color:#89736b;font-size:10px}.ts-days-saveall{min-height:42px;border:0;border-radius:999px;background:#a75547;padding:0 22px;color:#fff;font-size:12px;font-weight:900;cursor:pointer;box-shadow:0 8px 20px rgba(167,85,71,.22)}.ts-days-saveall:disabled{background:#d8cbc5;color:#fff;cursor:not-allowed;box-shadow:none}.ts-days-message{min-height:20px;margin:12px 4px 0;color:#4d7964;font-size:11px;font-weight:800}',
  'business-day bulk-save CSS',
)

client = replaceOnce(
  client,
  `          (payload.role === 'ADMIN' ? '<div class="ts-day-actions">' + (day.overridden ? '<button class="ts-day-action" type="button" data-reset>通常設定に戻す</button>' : '') + '<button class="ts-day-action primary" type="button" data-save>保存</button></div>' : '') + '</article>'`,
  `          '</article>'`,
  'remove per-day buttons',
)

client = replaceOnce(
  client,
  `      root.innerHTML = '<div class="ts-days-hero"><div><div class="ts-days-kicker">DAILY BUSINESS HOURS</div><h1>日別の営業時間・休業日</h1><p>通常の営業時間を基準に、日ごとの休業・営業時間・受付可能数を上書きできます。</p></div><div class="ts-days-nav"><a class="ts-button secondary compact" href="/admin/appointments?businessDays=1&month=' + monthShift(month,-1) + '">' + icon('chevronLeft') + '</a><span class="ts-days-month">' + year + '年' + monthNumber + '月</span><a class="ts-button secondary compact" href="/admin/appointments?businessDays=1&month=' + monthShift(month,1) + '">' + icon('chevronRight') + '</a></div></div><div class="ts-days-message" role="status"></div><div class="ts-days-grid">' + week + empty + cards + '</div>'`,
  `      root.innerHTML = '<div class="ts-days-hero"><div><div class="ts-days-kicker">DAILY BUSINESS HOURS</div><h1>日別の営業時間・休業日</h1><p>複数の日を続けて変更し、最後に一度だけまとめて保存できます。</p></div><div class="ts-days-nav"><a class="ts-button secondary compact" href="/admin/appointments?businessDays=1&month=' + monthShift(month,-1) + '">' + icon('chevronLeft') + '</a><span class="ts-days-month">' + year + '年' + monthNumber + '月</span><a class="ts-button secondary compact" href="/admin/appointments?businessDays=1&month=' + monthShift(month,1) + '">' + icon('chevronRight') + '</a></div></div><div class="ts-days-message" role="status"></div><div class="ts-days-grid">' + week + empty + cards + '</div>' + (payload.role === 'ADMIN' ? '<div class="ts-days-savebar"><div class="ts-days-savecopy"><strong>変更をまとめて保存</strong><span data-dirty-count>変更はありません</span></div><button class="ts-days-saveall" type="button" data-save-all disabled>変更をまとめて保存</button></div>' : '')`,
  'business-day save toolbar',
)

client = replaceOnce(
  client,
  `      root.querySelectorAll('[name="isClosed"]').forEach(input => input.addEventListener('change', () => input.closest('.ts-day-card').classList.toggle('closed', input.checked)))
      root.querySelectorAll('[data-save]').forEach(button => button.addEventListener('click', () => saveBusinessDay(button.closest('.ts-day-card'))))
      root.querySelectorAll('[data-reset]').forEach(button => button.addEventListener('click', () => saveBusinessDay(button.closest('.ts-day-card'), true)))`,
  `      root.querySelectorAll('.ts-day-card:not(.empty) input,.ts-day-card:not(.empty) select').forEach(input => input.addEventListener('change', () => {
        const card = input.closest('.ts-day-card')
        if (input.name === 'isClosed') card.classList.toggle('closed', input.checked)
        markBusinessDayDirty(card)
      }))
      root.querySelector('[data-save-all]')?.addEventListener('click', () => saveBusinessDays(root))`,
  'business-day listeners',
)
write(clientFile, client)

const serverRoot = '/app/.next/server'
let helperFilesPatched = 0
for (const directory of [path.join(serverRoot, 'chunks')]) {
  for (const name of fs.readdirSync(directory)) {
    if (!name.endsWith('.js')) continue
    const file = path.join(directory, name)
    let source = read(file)
    if (!source.includes('来店履歴なし / 指名')) continue
    const regex = /(if\s*\(t\)\s*return\s*`前回の対応者:\s*\$\{([A-Za-z_$][\w$]*)\(t\.stylistName\)\s*\?\?\s*"フリー"\}`;\s*)(let\s+[A-Za-z_$][\w$]*\s*=)/g
    let count = 0
    source = source.replace(regex, (_match, prefix, normalizer, suffix) => {
      count += 1
      return prefix.replace('前回の対応者:', '前回担当:') + `let a=[...(e.appointments??[])].filter(e=>{let t=(e.status??'').toLowerCase();return e.staffName&&new Date(e.scheduledAt??0).getTime()<=Date.now()&&!t.includes('cancel')&&!t.includes('キャンセル')}).sort((e,t)=>new Date(t.scheduledAt??0).getTime()-new Date(e.scheduledAt??0).getTime())[0];if(a)return \`前回担当: \${${normalizer}(a.staffName)??"フリー"}\`;` + suffix
    })
    source = source.replace(/`来店履歴なし \/ 指名: \$\{([^}]+)\}`/g, '`前回担当: ${$1}`')
    if (count) {
      write(file, source)
      helperFilesPatched += 1
    }
  }
}
if (!helperFilesPatched) throw new Error('customer attendant helper was not patched')

const customerListChunk = '/app/.next/server/chunks/3491.js'
let customerList = read(customerListChunk)
customerList = replaceOnce(
  customerList,
  'contactLogs:{orderBy:{createdAt:"desc"},take:8},appointments:{orderBy:{scheduledAt:"asc"},take:20},serviceSales:',
  'contactLogs:{orderBy:{createdAt:"desc"},take:8},appointments:{orderBy:{scheduledAt:"desc"},take:20},serviceSales:',
  'customer appointment order',
)
write(customerListChunk, customerList)

const messagesPageFile = '/app/.next/server/app/admin/customers/messages/page.js'
let messagesPage = read(messagesPageFile)
messagesPage = replaceOnce(
  messagesPage,
  `                birthDate: !0,
                birthYear: !0,
              },`,
  `                birthDate: !0,
                birthYear: !0,
                appointments: {
                  where: {
                    scheduledAt: { lte: new Date() },
                    status: { notIn: ["CANCELLED", "CANCELED", "キャンセル"] },
                  },
                  orderBy: { scheduledAt: "desc" },
                  take: 1,
                  select: { staffName: !0 },
                },
              },`,
  'broadcast recipient appointment query',
)
messagesPage = replaceOnce(
  messagesPage,
  `                                              "data-recipient-search":
                                                \`${'${e.name} ${e.phone ?? ""}'}\`.toLowerCase(),
                                              className:`,
  `                                              "data-recipient-search":
                                                \`${'${e.name} ${e.phone ?? ""}'}\`.toLowerCase(),
                                              "data-recipient-staff":
                                                (e.appointments[0]?.staffName ?? "フリー").replace(/\\s+/g, " ").trim().toLowerCase(),
                                              className:`,
  'broadcast recipient staff attribute',
)
messagesPage = replaceOnce(
  messagesPage,
  'src: "/broadcast-recipient-modal.js"',
  'src: "/broadcast-recipient-modal.js?v=328"',
  'broadcast recipient modal cache bust',
)
write(messagesPageFile, messagesPage)

const modalFile = '/app/public/broadcast-recipient-modal.js'
let modal = read(modalFile)
modal = replaceOnce(
  modal,
  `  function openModal() {
    var modal = element("broadcast-recipient-modal");`,
  `  function applyFilters() {
    var search = element("broadcast-recipient-search");
    var staff = element("broadcast-recipient-staff");
    var query = search ? search.value.trim().toLowerCase() : "";
    var selectedStaff = staff ? staff.value : "";
    document.querySelectorAll(".broadcast-recipient-row").forEach(function (row) {
      var matchesSearch = !query || row.dataset.recipientSearch.includes(query);
      var matchesStaff = !selectedStaff || row.dataset.recipientStaff === selectedStaff;
      row.hidden = !(matchesSearch && matchesStaff);
    });
  }

  function ensureStaffFilter() {
    var search = element("broadcast-recipient-search");
    if (!search || element("broadcast-recipient-staff")) return;
    var values = Array.from(document.querySelectorAll(".broadcast-recipient-row"))
      .map(function (row) { return row.dataset.recipientStaff || "フリー"; })
      .filter(function (value, index, values) { return values.indexOf(value) === index; })
      .sort();
    var wrap = document.createElement("label");
    wrap.className = "grid gap-1 text-xs font-semibold text-[color:var(--lien-muted)]";
    wrap.innerHTML = '<span>前回担当者で絞り込み</span><select id="broadcast-recipient-staff" class="lien-input"><option value="">すべての担当者</option>' + values.map(function (value) { return '<option value="' + value.replace(/&/g, '&amp;').replace(/"/g, '&quot;') + '">' + value + '</option>'; }).join('') + '</select>';
    search.parentElement.style.display = "grid";
    search.parentElement.style.gap = "10px";
    search.insertAdjacentElement("afterend", wrap);
  }

  function openModal() {
    var modal = element("broadcast-recipient-modal");`,
  'broadcast staff filter functions',
)
modal = replaceOnce(
  modal,
  `    modal.hidden = false;
    document.body.style.overflow = "hidden";`,
  `    modal.hidden = false;
    ensureStaffFilter();
    applyFilters();
    setTimeout(function () {
      ensureStaffFilter();
      applyFilters();
    }, 150);
    document.body.style.overflow = "hidden";`,
  'initialize broadcast staff filter',
)
modal = replaceOnce(
  modal,
  `  document.addEventListener("input", function (event) {
    if (event.target.id !== "broadcast-recipient-search") return;
    var query = event.target.value.trim().toLowerCase();
    document.querySelectorAll(".broadcast-recipient-row").forEach(function (row) {
      row.hidden =
        Boolean(query) && !row.dataset.recipientSearch.includes(query);
    });
  });`,
  `  document.addEventListener("input", function (event) {
    if (event.target.id === "broadcast-recipient-search") applyFilters();
  });

  document.addEventListener("change", function (event) {
    if (event.target.id === "broadcast-recipient-staff") applyFilters();
  });`,
  'broadcast combined filters',
)
modal = replaceOnce(
  modal,
  '  setTimeout(updateCount, 100);',
  '  setTimeout(function () { ensureStaffFilter(); updateCount(); }, 600);',
  'broadcast filter hydration guard',
)
write(modalFile, modal)

console.log(JSON.stringify({ helperFilesPatched }, null, 2))
