export type CustomerRegistrationName = {
  lastName: string;
  firstName: string;
  lastNameKana: string;
  firstNameKana: string;
  fullName: string;
  fullNameKana: string;
};

export type CustomerProfileName = Pick<
  CustomerRegistrationName,
  "lastName" | "firstName" | "lastNameKana" | "firstNameKana"
>;

const NAME_PART_MAX_LENGTH = 50;
const NAME_PART_PATTERN = /^[\p{L}\p{M}\p{N}々〆ヵヶ・'’\- ]+$/u;
const KANA_PART_PATTERN = /^[\p{Script=Katakana}ー・ ]+$/u;
const VISIBLE_NAME_PART = "[\\p{Script=Han}\\p{Script=Hiragana}々〆ヶヵA-Za-z0-9'’・-]+";
const KANA_NAME_PART = "[\\p{Script=Katakana}ー・]+";
const DUPLICATED_FURIGANA_SUFFIX = new RegExp(
  `^((?:${VISIBLE_NAME_PART}\\s+)+${VISIBLE_NAME_PART})\\s*${KANA_NAME_PART}\\s+${KANA_NAME_PART}$`,
  "u"
);

function normalizePart(value: string | null | undefined) {
  return String(value ?? "")
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ");
}

function hiraganaToKatakana(value: string) {
  return value.replace(/[ぁ-ゖ]/g, (character) =>
    String.fromCharCode(character.charCodeAt(0) + 0x60)
  );
}

function validNamePart(value: string) {
  return value.length > 0 && value.length <= NAME_PART_MAX_LENGTH && NAME_PART_PATTERN.test(value);
}

function normalizeKanaPart(value: string | null | undefined) {
  return hiraganaToKatakana(normalizePart(value));
}

function validKanaPart(value: string) {
  return value.length > 0 && value.length <= NAME_PART_MAX_LENGTH && KANA_PART_PATTERN.test(value);
}

export function parseCustomerRegistrationName(input: {
  lastName?: string | null;
  firstName?: string | null;
  lastNameKana?: string | null;
  firstNameKana?: string | null;
}): CustomerRegistrationName | null {
  const lastName = normalizePart(input.lastName);
  const firstName = normalizePart(input.firstName);
  const lastNameKana = normalizeKanaPart(input.lastNameKana);
  const firstNameKana = normalizeKanaPart(input.firstNameKana);

  if (
    !validNamePart(lastName) ||
    !validNamePart(firstName) ||
    !validKanaPart(lastNameKana) ||
    !validKanaPart(firstNameKana)
  ) {
    return null;
  }

  return {
    lastName,
    firstName,
    lastNameKana,
    firstNameKana,
    fullName: `${lastName} ${firstName}`,
    fullNameKana: `${lastNameKana} ${firstNameKana}`
  };
}

export function resolveCustomerProfileName(input: {
  fullName?: string | null;
  lastName?: string | null;
  firstName?: string | null;
  lastNameKana?: string | null;
  firstNameKana?: string | null;
}): CustomerProfileName {
  const normalizedFullName = normalizePart(input.fullName);
  const duplicatedFurigana = normalizedFullName.match(DUPLICATED_FURIGANA_SUFFIX);
  const fullNameParts = (duplicatedFurigana?.[1] ?? normalizedFullName).split(" ").filter(Boolean);
  const fallbackLastName = fullNameParts.shift() ?? "";
  const fallbackFirstName = fullNameParts.join(" ");

  return {
    lastName: normalizePart(input.lastName) || fallbackLastName,
    firstName: normalizePart(input.firstName) || fallbackFirstName,
    lastNameKana: normalizeKanaPart(input.lastNameKana),
    firstNameKana: normalizeKanaPart(input.firstNameKana)
  };
}
