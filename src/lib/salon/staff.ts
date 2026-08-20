export type SalonStaff = {
  key: string;
  name: string;
  role: string;
  aliases: readonly string[];
};

export const SALON_STAFF: readonly SalonStaff[] = [
  {
    key: "tanizaki",
    name: "谷崎 太二",
    role: "オーナースタイリスト",
    aliases: ["谷崎", "店長（谷崎）", "谷崎店長"]
  },
  {
    key: "watanabe",
    name: "渡邊 浩明",
    role: "トップスタイリスト",
    aliases: ["渡辺", "渡邊", "渡辺 浩明"]
  },
  {
    key: "asano",
    name: "浅野 清美",
    role: "トップスタイリスト",
    aliases: ["浅野"]
  },
  {
    key: "kobayashi",
    name: "小林 美奈子",
    role: "トップスタイリスト",
    aliases: ["小林"]
  },
  {
    key: "kaori",
    name: "kaori",
    role: "スタイリスト",
    aliases: ["Kaori", "カオリ"]
  }
];

export const SALON_STAFF_NAMES = SALON_STAFF.map((staff) => staff.name);

export const FREE_STAFF = {
  key: "free",
  name: "フリー",
  role: "指名なし"
} as const;

export function resolveSalonStaffByKey(key: string) {
  if (key === FREE_STAFF.key) return FREE_STAFF;
  return SALON_STAFF.find((staff) => staff.key === key) ?? null;
}

export function salonStaffKey(value?: string | null) {
  const normalized = normalizeSalonStaffName(value) ?? FREE_STAFF.name;
  if (normalized === FREE_STAFF.name) return FREE_STAFF.key;
  return SALON_STAFF.find((staff) => staff.name === normalized)?.key ?? null;
}

export function normalizeSalonStaffName(value?: string | null) {
  const candidate = value?.trim();
  if (!candidate) {
    return null;
  }

  const staff = SALON_STAFF.find(
    (entry) => entry.name === candidate || entry.aliases.includes(candidate)
  );

  // Unknown historic names are kept rather than silently assigning another person.
  return staff?.name ?? candidate;
}

export function customerPaidAttendantSummary(customer: {
  serviceSales?: ReadonlyArray<{
    appointment?: { staffName?: string | null } | null;
  }>;
}) {
  const latestPaidSale = customer.serviceSales?.[0];
  const staffName = normalizeSalonStaffName(latestPaidSale?.appointment?.staffName);

  return `前回担当: ${staffName ?? "未登録"}`;
}

export function customerAttendantSummary(customer: {
  visits: ReadonlyArray<{ stylistName?: string | null }>;
  appointments?: ReadonlyArray<{
    staffName?: string | null;
    scheduledAt?: Date | string | null;
    status?: string | null;
  }>;
  staffAssignmentType?: string | null;
  assignedStaffName?: string | null;
}) {
  const latestVisit = customer.visits[0];
  if (latestVisit) {
    return `前回担当: ${normalizeSalonStaffName(latestVisit.stylistName) ?? "フリー"}`;
  }

  const latestAppointment = [...(customer.appointments ?? [])]
    .filter((appointment) => {
      const status = appointment.status?.toLowerCase() ?? "";
      const scheduledAt = appointment.scheduledAt ? new Date(appointment.scheduledAt).getTime() : 0;
      return appointment.staffName && scheduledAt <= Date.now() && !status.includes("cancel") && !status.includes("キャンセル");
    })
    .sort((left, right) => {
      const leftTime = left.scheduledAt ? new Date(left.scheduledAt).getTime() : 0;
      const rightTime = right.scheduledAt ? new Date(right.scheduledAt).getTime() : 0;
      return rightTime - leftTime;
    })[0];

  if (latestAppointment) {
    return `前回担当: ${normalizeSalonStaffName(latestAppointment.staffName) ?? "フリー"}`;
  }

  const assignedStaff =
    customer.staffAssignmentType === "assigned"
      ? normalizeSalonStaffName(customer.assignedStaffName)
      : null;

  return `前回担当: ${assignedStaff ?? "フリー"}`;
}
