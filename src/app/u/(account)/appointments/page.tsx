import { redirect } from "next/navigation";
import { CustomerBookingCalendar } from "@/components/customer-app/customer-booking-calendar";
import { getCurrentCustomerSession } from "@/lib/auth/current-customer";
import { scheduleDateKey } from "@/lib/appointments/schedule";
import { prisma } from "@/lib/prisma";
import { SALON_STAFF, salonStaffKey } from "@/lib/salon/staff";

export const dynamic = "force-dynamic";

export default async function CustomerAppointmentsPage() {
  const session = await getCurrentCustomerSession();
  if (!session) redirect("/u/login");
  const customer = await prisma.customer.findFirst({
    where: { id: session.customerId, organizationId: session.organizationId, deletedAt: null },
    select: {
      staffAssignmentType: true,
      assignedStaffName: true,
      appointments: {
        where: { scheduledAt: { gte: new Date() }, status: { notIn: ["キャンセル", "無断キャンセル"] } },
        orderBy: { scheduledAt: "asc" },
        take: 3,
        select: { id: true, scheduledAt: true, menu: true, staffName: true, status: true }
      }
    }
  });
  if (!customer) redirect("/u/login");
  const assignedKey = customer.staffAssignmentType === "assigned" ? salonStaffKey(customer.assignedStaffName) : null;
  const today = scheduleDateKey(new Date());

  return (
    <div className="grid gap-5">
      <header className="rounded-[24px] border border-[#e8ded2] bg-gradient-to-r from-[#fffdf9] to-[#f6efe6] px-5 py-5 shadow-sm sm:px-7 sm:py-6">
        <p className="text-xs font-semibold text-[#8f4f42]">Online booking</p>
        <h1 className="mt-1 text-2xl font-semibold text-[#382f2a] sm:text-3xl">サロン予約</h1>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-[#6f6259]">担当者とメニューを選び、実際の予約状況を反映した空き時間からご予約いただけます。</p>
      </header>
      <CustomerBookingCalendar
        currentDate={today}
        defaultStaffKey={assignedKey ?? "free"}
        staff={SALON_STAFF.map(({ key, name, role }) => ({ key, name, role }))}
        upcoming={customer.appointments.map((appointment) => ({ ...appointment, scheduledAt: appointment.scheduledAt.toISOString() }))}
      />
    </div>
  );
}
