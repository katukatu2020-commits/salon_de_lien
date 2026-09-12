'use strict'

const VISIBLE_NAME_PART = "[\\p{Script=Han}\\p{Script=Hiragana}々〆ヶヵA-Za-z0-9'’・-]+"
const KANA_NAME_PART = '[\\p{Script=Katakana}ー・]+'
const DUPLICATED_FURIGANA_SUFFIX = new RegExp(
  `^((?:${VISIBLE_NAME_PART}\\s+)+${VISIBLE_NAME_PART})\\s*${KANA_NAME_PART}\\s+${KANA_NAME_PART}$`,
  'u',
)

function normalizeDisplayName(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, ' ')
}

function displayBookingConfirmationNameV635(value) {
  const normalized = normalizeDisplayName(value)
  const duplicatedFurigana = normalized.match(DUPLICATED_FURIGANA_SUFFIX)
  return duplicatedFurigana ? duplicatedFurigana[1].trim() : normalized
}

module.exports = {
  displayBookingConfirmationNameV635,
}
