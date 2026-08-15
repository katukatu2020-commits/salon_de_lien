type CustomerBirthData = {
  birthDate?: Date | null;
  birthYear?: number | null;
};

type TokyoDateParts = {
  year: number;
  month: number;
  day: number;
};

function tokyoDateParts(value: Date): TokyoDateParts {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(value);
  const part = (type: "year" | "month" | "day") =>
    Number(parts.find((item) => item.type === type)?.value ?? 0);

  return {
    year: part("year"),
    month: part("month"),
    day: part("day")
  };
}

export function parseBirthDateInput(value: string): Date | null | undefined {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return undefined;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  const today = tokyoDateParts(new Date());
  const todayNumber = today.year * 10_000 + today.month * 100 + today.day;
  const inputNumber = year * 10_000 + month * 100 + day;

  if (
    year < 1900 ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day ||
    inputNumber > todayNumber
  ) {
    return undefined;
  }

  return date;
}

export function birthYearFromDate(value: Date) {
  return value.getUTCFullYear();
}

export function birthDateInputValue(value?: Date | null) {
  return value ? value.toISOString().slice(0, 10) : "";
}

export function formatBirthDate(value?: Date | null) {
  if (!value) return null;
  return `${value.getUTCFullYear()}年${String(value.getUTCMonth() + 1).padStart(2, "0")}月${String(value.getUTCDate()).padStart(2, "0")}日`;
}

export function customerAge(data: CustomerBirthData, now = new Date()) {
  if (!data.birthDate) return null;

  const today = tokyoDateParts(now);
  const birthMonth = data.birthDate.getUTCMonth() + 1;
  const birthDay = data.birthDate.getUTCDate();
  const birthdayPassed =
    today.month > birthMonth || (today.month === birthMonth && today.day >= birthDay);

  return today.year - data.birthDate.getUTCFullYear() - (birthdayPassed ? 0 : 1);
}

export function customerAgeLabel(data: CustomerBirthData, now = new Date()) {
  const exactAge = customerAge(data, now);
  if (exactAge !== null) return `${exactAge}歳`;
  if (!data.birthYear) return "年齢未登録";

  const currentYear = tokyoDateParts(now).year;
  const upperAge = Math.max(0, currentYear - data.birthYear);
  const lowerAge = Math.max(0, upperAge - 1);
  return lowerAge === upperAge ? `${upperAge}歳前後` : `${lowerAge}〜${upperAge}歳`;
}
