'use strict'

const NAME_PART_MAX_LENGTH = 50
const NAME_PART_PATTERN = /^[\p{L}\p{M}\p{N}々〆ヵヶ・'’\- ]+$/u
const KANA_PART_PATTERN = /^[\p{Script=Katakana}ー・ ]+$/u

function normalizePart(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, ' ')
}

function hiraganaToKatakana(value) {
  return value.replace(/[ぁ-ゖ]/g, character =>
    String.fromCharCode(character.charCodeAt(0) + 0x60),
  )
}

function parseCustomerRegistrationNameV633(input) {
  const lastName = normalizePart(input?.lastName)
  const firstName = normalizePart(input?.firstName)
  const lastNameKana = hiraganaToKatakana(normalizePart(input?.lastNameKana))
  const firstNameKana = hiraganaToKatakana(normalizePart(input?.firstNameKana))

  if (
    !lastName ||
    lastName.length > NAME_PART_MAX_LENGTH ||
    !NAME_PART_PATTERN.test(lastName) ||
    !firstName ||
    firstName.length > NAME_PART_MAX_LENGTH ||
    !NAME_PART_PATTERN.test(firstName) ||
    !lastNameKana ||
    lastNameKana.length > NAME_PART_MAX_LENGTH ||
    !KANA_PART_PATTERN.test(lastNameKana) ||
    !firstNameKana ||
    firstNameKana.length > NAME_PART_MAX_LENGTH ||
    !KANA_PART_PATTERN.test(firstNameKana)
  ) {
    return null
  }

  return {
    lastName,
    firstName,
    lastNameKana,
    firstNameKana,
    fullName: `${lastName} ${firstName}`,
    fullNameKana: `${lastNameKana} ${firstNameKana}`,
  }
}

module.exports = { parseCustomerRegistrationNameV633 }
