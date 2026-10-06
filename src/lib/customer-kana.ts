export type CustomerKanaRow = {
  id: string;
  lastNameKana?: string | null;
  firstNameKana?: string | null;
};

export const CUSTOMER_KANA_QUERY = `SELECT "id", "lastNameKana", "firstNameKana"
  FROM "Customer"
  WHERE "organizationId" = $1 AND "deletedAt" IS NULL AND "storeHiddenAt" IS NULL
    AND ("lastNameKana" IS NOT NULL OR "firstNameKana" IS NOT NULL)`;

export function normalizeCustomerKana(value: unknown): string {
  return String(value ?? "").normalize("NFKC").replace(/\s+/g, "")
    .replace(/[ぁ-ゖ]/g, character => String.fromCharCode(character.charCodeAt(0) + 0x60));
}

export function customerKana(row: Pick<CustomerKanaRow, "lastNameKana" | "firstNameKana">): string {
  return normalizeCustomerKana(row.lastNameKana) + normalizeCustomerKana(row.firstNameKana);
}

export function matchingCustomerKanaIds(rows: CustomerKanaRow[], keyword: string): string[] {
  const normalized = normalizeCustomerKana(keyword);
  return normalized ? rows.filter(row => customerKana(row).includes(normalized)).map(row => row.id) : [];
}

export function formatCustomerNameWithKana(name: string, kana: string): string {
  if (!kana || name.endsWith(`（${kana}）`)) return name;
  return `${name}（${kana}）`;
}
