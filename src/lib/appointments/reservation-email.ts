export type ReservationEmailInput = {
  subject?: string | null;
  content: string;
  messageId?: string | null;
  sender?: string | null;
};

export type ParsedReservationEmail = {
  customerName: string;
  phone: string | null;
  scheduledAt: Date;
  menu: string | null;
  estimatedPrice: number | null;
  staffName: string | null;
  durationMinutes: number | null;
  bookingReference: string | null;
  status: string;
  subject: string | null;
};

const labelGroups = {
  customerName: [
    "ご来店者名",
    "来店者名",
    "ご予約者名",
    "予約者氏名",
    "予約者名",
    "お客様氏名",
    "お客様名",
    "顧客氏名",
    "顧客名",
    "お名前",
    "ご氏名",
    "氏名",
    "名前",
    "ご予約者"
  ],
  phone: [
    "ご連絡先電話番号",
    "連絡先電話番号",
    "携帯電話番号",
    "お電話番号",
    "電話番号",
    "携帯電話",
    "携帯番号",
    "ご連絡先",
    "連絡先",
    "お電話",
    "TEL",
    "電話"
  ],
  scheduledAt: ["予約日時", "ご予約日時", "来店日時", "ご来店日時", "予約日", "来店日", "日時"],
  menu: ["予約時クーポン", "予約時メニュー", "予約メニュー", "ご予約メニュー", "施術メニュー", "メニュー", "コース"],
  price: ["予約時合計金額", "合計金額", "予定金額", "料金", "金額"],
  staff: ["担当スタイリスト", "担当スタッフ", "指名スタッフ", "担当者", "スタッフ", "担当"],
  duration: ["合計施術時間", "合計時間", "所要時間", "施術時間", "予定時間"],
  reference: ["予約番号", "予約ID", "受付番号", "予約No", "予約NO"]
} as const;

function normalizeEmailText(value: string) {
  return value
    .normalize("NFKC")
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/(?:p|div|li|tr|td|th|dt|dd|section)\s*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\r/g, "")
    .replace(/[\t ]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

type LabeledMatch = { index: number; label: string; value: string };

function labeledMatches(text: string, labels: readonly string[]) {
  const found = new Map<string, LabeledMatch>();

  for (const sourceLabel of [...labels].sort((left, right) => right.length - left.length)) {
    const label = sourceLabel.normalize("NFKC");
    const labelPattern = `${escapeRegExp(label)}(?:\\s*[（(][^）)\\n]{1,20}[）)])?`;
    const patterns = [
      new RegExp(`(?:^|\\n|[■●])\\s*[・]?\\s*(${labelPattern})\\s*[:：]?\\s*([^\\n■●]+)`, "gi"),
      new RegExp(`(?:^|\\n|[■●])\\s*[・]?\\s*(${labelPattern})\\s*[:：]?\\s*\\n\\s*([^\\n■●]+)`, "gi")
    ];

    for (const pattern of patterns) {
      for (const match of text.matchAll(pattern)) {
        const index = match.index;
        const value = match[2]?.trim();
        const matchedLabel = match[1]?.trim() || label;
        if (!Number.isInteger(index) || !value) continue;
        const key = `${index}:${value}`;
        if (!found.has(key)) found.set(key, { index, label: matchedLabel, value });
      }
    }
  }

  return [...found.values()].sort((left, right) => left.index - right.index);
}

function labeledValues(text: string, labels: readonly string[]) {
  return labeledMatches(text, labels).map((match) => match.value);
}

function labeledValue(text: string, labels: readonly string[], occurrence: "first" | "last" = "first") {
  const values = labeledValues(text, labels);
  return occurrence === "last" ? values.at(-1) ?? null : values[0] ?? null;
}

export function normalizeReservationPhone(value?: string | null) {
  const digits = (value ?? "").replace(/\D/g, "");
  if (digits.length === 11) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return digits || null;
}

function isServicePhone(value: string | null) {
  const digits = (value ?? "").replace(/\D/g, "");
  return /^(0120|0800|0570)/.test(digits);
}

function parsePhone(text: string) {
  const labeled = labeledMatches(text, labelGroups.phone)
    .map((match) => ({ ...match, phone: normalizeReservationPhone(match.value) }))
    .filter((match): match is LabeledMatch & { phone: string } => Boolean(match.phone));
  const mobile = labeled.filter((match) => /^(070|080|090)/.test(match.phone.replace(/\D/g, "")));
  const direct = labeled.filter((match) => !isServicePhone(match.phone));
  const selected = mobile.at(-1) ?? direct.at(-1);
  if (selected) return { value: selected.phone, index: selected.index };

  const freeTextPhones = Array.from(
    text.matchAll(/(?:^|\D)(0\d{1,4}[-ー‐− ]?\d{1,4}[-ー‐− ]?\d{3,4})(?=\D|$)/g),
    (match) => ({ index: match.index ?? 0, value: normalizeReservationPhone(match[1]) })
  ).filter((match): match is { index: number; value: string } => Boolean(match.value) && !isServicePhone(match.value));
  return freeTextPhones.at(-1) ?? null;
}

function parseDateTime(text: string) {
  const labeled = labeledValue(text, labelGroups.scheduledAt);
  const searchText = `${labeled ?? ""} ${text.replace(/\n/g, " ")}`;
  const slashMatch = searchText.match(
    /(20\d{2})\s*(?:年|[./-])\s*(\d{1,2})\s*(?:月|[./-])\s*(\d{1,2})\s*日?(?:\s*\([^)]*\))?\s*(\d{1,2})\s*(?::|時)\s*(\d{1,2})?\s*分?/
  );
  const compactMatch = searchText.match(/(20\d{2})(\d{2})(\d{2})[^\d]{0,8}(\d{1,2}):(\d{2})/);
  const match = slashMatch ?? compactMatch;

  if (!match) return null;

  const [, yearText, monthText, dayText, hourText, minuteText = "0"] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);

  if (
    !Number.isInteger(year) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  const parsed = new Date(Date.UTC(year, month - 1, day, hour - 9, minute));
  const japanParts = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23"
  }).formatToParts(parsed);
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(japanParts.find((item) => item.type === type)?.value);

  if (part("year") !== year || part("month") !== month || part("day") !== day || part("hour") !== hour || part("minute") !== minute) {
    return null;
  }

  return parsed;
}

function cleanCustomerName(value?: string | null) {
  return (value ?? "")
    .replace(/\s*(?:様|さま)\s*$/, "")
    .replace(/\s*[（(][^）)]*[）)]\s*$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseCustomerName(text: string, phoneIndex?: number | null) {
  const matches = labeledMatches(text, labelGroups.customerName)
    .map((match) => ({ ...match, name: cleanCustomerName(match.value) }))
    .filter((match) => Boolean(match.name));
  if (matches.length === 0) return "";

  const score = (match: (typeof matches)[number]) => {
    const distance = phoneIndex == null ? 0 : Math.abs(match.index - phoneIndex);
    const kanaPenalty = /カナ|かな|ふりがな|フリガナ/.test(match.label) ? 500 : 0;
    return distance + kanaPenalty;
  };
  return [...matches].sort((left, right) => score(left) - score(right))[0]?.name ?? "";
}

function cleanTextValue(value?: string | null) {
  const result = (value ?? "").replace(/^[・\-\s]+/, "").replace(/\s+/g, " ").trim();
  return result || null;
}

function parsePrice(value?: string | null) {
  const match = (value ?? "").match(/(?:¥|￥)?\s*([\d,]+)\s*円?/);
  if (!match) return null;
  const amount = Number(match[1].replace(/,/g, ""));
  return Number.isSafeInteger(amount) && amount >= 0 ? amount : null;
}

function parseDuration(value?: string | null) {
  if (!value) return null;
  const hours = Number(value.match(/(\d+)\s*時間/)?.[1] ?? 0);
  const minutes = Number(value.match(/(\d+)\s*分/)?.[1] ?? 0);
  const total = hours * 60 + minutes;
  return total > 0 && total <= 12 * 60 ? total : null;
}

function inferStatus(subject: string, content: string) {
  const source = `${subject}\n${content}`;
  if (/キャンセル|取消|取り消し/.test(source)) return "キャンセル";
  if (/変更受付|予約変更|予約を変更|ご予約を変更/.test(source)) return "変更受付";
  if (/予約確定|予約が確定|ご予約を承りました|予約完了|受付完了/.test(source)) return "予約確定";
  return "仮予約";
}

export function parseReservationEmail(input: ReservationEmailInput) {
  const content = normalizeEmailText(input.content);
  const subject = cleanTextValue(input.subject);
  const customerPhone = parsePhone(content);
  const customerName = parseCustomerName(content, customerPhone?.index);
  const scheduledAt = parseDateTime(content);
  const errors: string[] = [];

  if (!customerName) errors.push("お客様名を読み取れませんでした。");
  if (!scheduledAt) errors.push("予約日時を読み取れませんでした。西暦を含む日時が必要です。");

  if (errors.length > 0 || !scheduledAt) {
    return { ok: false as const, errors };
  }

  return {
    ok: true as const,
    value: {
      customerName,
      phone: customerPhone?.value ?? null,
      scheduledAt,
      menu: cleanTextValue(labeledValue(content, labelGroups.menu)),
      estimatedPrice: parsePrice(labeledValue(content, labelGroups.price)),
      staffName: cleanTextValue(labeledValue(content, labelGroups.staff)),
      durationMinutes: parseDuration(labeledValue(content, labelGroups.duration)),
      bookingReference:
        cleanTextValue(labeledValue(content, labelGroups.reference)) ??
        content.match(/kanzashi\.com\/reservation\/(\d+)/i)?.[1] ??
        null,
      status: inferStatus(subject ?? "", content),
      subject
    } satisfies ParsedReservationEmail
  };
}
