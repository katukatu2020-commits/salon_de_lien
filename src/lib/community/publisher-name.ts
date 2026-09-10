export function communityPublisherName(organizationName: string | null | undefined) {
  return organizationName?.trim() || "店舗";
}
