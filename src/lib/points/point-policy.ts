export const POINT_VALID_DAYS = 40;

export function pointExpiresAt(awardedAt = new Date(), validDays = POINT_VALID_DAYS) {
  const expiresAt = new Date(awardedAt);
  expiresAt.setDate(expiresAt.getDate() + validDays);
  return expiresAt;
}
