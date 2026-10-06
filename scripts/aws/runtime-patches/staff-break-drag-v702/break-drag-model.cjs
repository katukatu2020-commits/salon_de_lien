'use strict'
function calculateBreakPreview({ origin, mode, deltaMinutes, openMinutes, closeMinutes, workStartMinutes, workEndMinutes }) {
  const step = 15, maxDuration = 720
  const lower = Math.ceil(Math.max(openMinutes, workStartMinutes) / step) * step
  const upper = Math.floor(Math.min(closeMinutes, workEndMinutes) / step) * step
  if (![lower, upper, deltaMinutes, origin.startMinutes, origin.durationMinutes].every(Number.isFinite) || upper - lower < step) return null
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value))
  const delta = Math.round(deltaMinutes / step) * step
  const start = origin.startMinutes, end = start + origin.durationMinutes
  if (mode === 'start') {
    if (end > upper || end - lower < step) return null
    const next = clamp(start + delta, Math.max(lower, end - maxDuration), end - step)
    return { startMinutes: next, durationMinutes: end - next }
  }
  if (mode === 'end') {
    if (start < lower || upper - start < step) return null
    return { startMinutes: start, durationMinutes: clamp(end + delta, start + step, Math.min(upper, start + maxDuration)) - start }
  }
  if (mode !== 'move' || origin.durationMinutes > Math.min(maxDuration, upper - lower)) return null
  return { startMinutes: clamp(start + delta, lower, upper - origin.durationMinutes), durationMinutes: origin.durationMinutes }
}
module.exports = { calculateBreakPreview }
