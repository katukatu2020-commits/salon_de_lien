import assert from 'node:assert/strict'

const baseUrl = String(process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3115').replace(/\/$/, '')
let cookie = ''
let restore = null

function japanDate() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date())
}

function nextSunday(dateText) {
  const date = new Date(`${dateText}T00:00:00Z`)
  const offset = (7 - date.getUTCDay()) % 7 || 7
  date.setUTCDate(date.getUTCDate() + offset)
  return date.toISOString().slice(0, 10)
}

function profileUpdate(profile, closedWeekdays) {
  return {
    action: 'update-store',
    storeName: profile.storeName || '',
    ownerName: profile.ownerName || '',
    phone: profile.phone || '',
    postalCode: profile.postalCode || '',
    prefecture: profile.prefecture || '',
    city: profile.city || '',
    addressLine1: profile.addressLine1 || '',
    addressLine2: profile.addressLine2 || '',
    websiteUrl: profile.websiteUrl || '',
    businessOpen: profile.businessSchedule.openTime,
    businessClose: profile.businessSchedule.closeTime,
    closedWeekdays,
  }
}

async function jsonRequest(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      cookie,
      Origin: baseUrl,
      Accept: 'application/json',
      'Cache-Control': 'no-cache',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  })
  const payload = await response.json().catch(() => ({}))
  assert.equal(response.status, options.expectedStatus || 200, `${path}: ${JSON.stringify(payload)}`)
  return payload
}

try {
  const login = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    redirect: 'manual',
    headers: { Origin: baseUrl, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ email: 'demo.owner', password: 'LienDemo2026!', next: '/admin/appointments' }),
  })
  assert.equal(login.status, 303)
  cookie = (login.headers.get('set-cookie') || '').split(';')[0]
  assert.match(cookie, /^[^=]+=/)

  const originalProfile = (await jsonRequest('/api/admin/store-profile')).profile
  const date = nextSunday(japanDate())
  const month = date.slice(0, 7)
  const originalDays = await jsonRequest(`/api/lien-business-days?month=${month}`)
  const originalDay = originalDays.days.find(day => day.date === date)
  assert.ok(originalDay)
  restore = { originalProfile, originalDay, date }

  await jsonRequest('/api/admin/store-profile', {
    method: 'POST',
    body: JSON.stringify(profileUpdate(originalProfile, [])),
  })
  await jsonRequest('/api/lien-business-days', {
    method: 'POST',
    body: JSON.stringify({ days: [{ date, reset: true }] }),
  })

  const noHolidayPayload = await jsonRequest(`/api/lien-business-days?date=${date}`)
  const noHoliday = noHolidayPayload.days.find(day => day.date === date)
  assert.deepEqual(noHolidayPayload.defaultSchedule.closedWeekdays, [])
  assert.equal(noHoliday.isClosed, false)
  assert.equal(noHoliday.overridden, false)

  const customDay = {
    date,
    isClosed: false,
    openMinutes: 510,
    closeMinutes: 990,
    capacity: Math.max(1, Number(originalDay.capacity || 1)),
  }
  await jsonRequest('/api/lien-business-days', {
    method: 'POST',
    body: JSON.stringify({ days: [customDay] }),
  })
  const dailyPayload = await jsonRequest(`/api/lien-business-days?date=${date}`)
  const daily = dailyPayload.days.find(day => day.date === date)
  assert.equal(daily.overridden, true)
  assert.equal(daily.openMinutes, customDay.openMinutes)
  assert.equal(daily.closeMinutes, customDay.closeMinutes)

  const tenantAsset = await fetch(`${baseUrl}/tenant-setup-client.js?smoke=v514`, { headers: { 'Cache-Control': 'no-cache' } })
  assert.equal(tenantAsset.status, 200)
  const tenantSource = await tenantAsset.text()
  assert.match(tenantSource, /シフト表・予約カレンダーへ戻る/)
  assert.match(tenantSource, /business-hours-consistency-v514/)

  const shiftAsset = await fetch(`${baseUrl}/_next/static/chunks/app/admin/appointments/page-shift-line-break-v461.js?smoke=v514`, { headers: { 'Cache-Control': 'no-cache' } })
  assert.equal(shiftAsset.status, 200)
  const shiftSource = await shiftAsset.text()
  assert.match(shiftSource, /\/api\/lien-business-days\?date=/)
  assert.match(shiftSource, /business-hours-consistency-v514/)

  console.log(JSON.stringify({
    release: 'business-hours-consistency-v514',
    emptyClosedWeekdaysRemainEmpty: true,
    dailyHours: { date, openMinutes: daily.openMinutes, closeMinutes: daily.closeMinutes },
    backLink: true,
  }, null, 2))
} finally {
  if (restore && cookie) {
    const { originalProfile, originalDay, date } = restore
    await jsonRequest('/api/admin/store-profile', {
      method: 'POST',
      body: JSON.stringify(profileUpdate(originalProfile, originalProfile.businessSchedule.closedWeekdays)),
    })
    await jsonRequest('/api/lien-business-days', {
      method: 'POST',
      body: JSON.stringify({ days: [originalDay.overridden ? {
        date,
        isClosed: originalDay.isClosed,
        openMinutes: originalDay.openMinutes,
        closeMinutes: originalDay.closeMinutes,
        capacity: originalDay.capacity,
      } : { date, reset: true }] }),
    })
  }
}
