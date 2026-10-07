'use strict'

function workTimeShading(member, open, close, closed = false) {
  if (closed) return { before: 100, after: 0 }
  if (member.isVirtualFree || member.key === 'free') return { before: 0, after: 0 }
  const start = member.workStartMinutes, end = member.workEndMinutes
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || end <= open || start >= close) return { before: 100, after: 0 }
  const duration = Math.max(1, close - open)
  return {
    before: Math.min(100, Math.max(0, (start - open) / duration * 100)),
    after: Math.min(100, Math.max(0, (close - end) / duration * 100))
  }
}

module.exports = { workTimeShading }
