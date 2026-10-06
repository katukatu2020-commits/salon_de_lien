export function checkoutDisplay(completed: boolean) {
  return completed
    ? { label: "会計済み", style: { backgroundColor: "#fce7f0", borderColor: "#d86b8d", color: "#802947" } }
    : { label: "未会計", style: { backgroundColor: "#fff4bd", borderColor: "#d7b550", color: "#655018" } };
}

export function appointmentShiftHref(scheduledAt: Date) {
  const day = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(scheduledAt);
  return `/admin/appointments?month=${day.slice(0, 7)}&date=${day}#staff-schedule`;
}
