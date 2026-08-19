export const SHOWCASE_ORGANIZATION_ID = "org_showcase_yohaku";
export const SHOWCASE_ORGANIZATION_SLUG = "yohaku-to-maegami";

export function isShowcaseOrganization(organizationId?: string | null) {
  return organizationId === SHOWCASE_ORGANIZATION_ID;
}

export const SHOWCASE_READ_ONLY_MESSAGE =
  "デモ店舗では、ログイン情報と店舗の基本設定は変更できません。";
