'use strict'

/* browser-month-helpers:start */
const monthValueInTokyo = (value = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(value)
  const year = parts.find(part => part.type === 'year')?.value
  const month = parts.find(part => part.type === 'month')?.value
  return year && month ? `${year}-${month}` : ''
}

const monthRange = value => {
  const match = /^(\d{4})-(\d{2})$/.exec(String(value || ''))
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  if (!Number.isInteger(year) || year < 1 || year > 9999 || month < 1 || month > 12) return null
  const normalized = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}`
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return { from: `${normalized}-01`, to: `${normalized}-${String(lastDay).padStart(2, '0')}` }
}

const shiftMonth = (value, offset) => {
  const match = /^(\d{4})-(\d{2})$/.exec(String(value || ''))
  if (!match || !Number.isInteger(offset)) return ''
  const year = Number(match[1])
  const month = Number(match[2])
  if (month < 1 || month > 12) return ''
  const absoluteMonth = year * 12 + month - 1 + offset
  const nextYear = Math.floor(absoluteMonth / 12)
  const nextMonth = absoluteMonth - nextYear * 12 + 1
  if (nextYear < 1 || nextYear > 9999) return ''
  return `${String(nextYear).padStart(4, '0')}-${String(nextMonth).padStart(2, '0')}`
}

const monthLabel = value => {
  const match = /^(\d{4})-(\d{2})$/.exec(String(value || ''))
  return match ? `${Number(match[1])}年${Number(match[2])}月` : 'カスタム期間'
}
/* browser-month-helpers:end */

module.exports = { monthValueInTokyo, monthRange, shiftMonth, monthLabel }
