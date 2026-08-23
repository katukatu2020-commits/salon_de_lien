export type ScheduleStaffIdentity = {
  key: string;
  name: string;
};

export function canonicalScheduleStaffIdentity(value?: string | null) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/\s/g, "")
    .replace(/[邊辺]/g, "邉")
    .toLowerCase();
}

export function resolveScheduleStaffIdentity(
  requested: { staffKey?: string | null; staffName?: string | null },
  staff: readonly ScheduleStaffIdentity[]
) {
  const keyToken = canonicalScheduleStaffIdentity(requested.staffKey);
  if (keyToken) {
    const keyMatch = staff.find(
      (member) => canonicalScheduleStaffIdentity(member.key) === keyToken
    );
    if (keyMatch) return keyMatch;
  }

  const nameToken = canonicalScheduleStaffIdentity(requested.staffName);
  if (!nameToken) return null;
  return (
    staff.find(
      (member) => canonicalScheduleStaffIdentity(member.name) === nameToken
    ) ?? null
  );
}
