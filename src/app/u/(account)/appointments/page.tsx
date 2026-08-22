import { redirect } from "next/navigation";
import { CustomerBookingCalendar } from "@/components/customer-app/customer-booking-calendar";
import { getCurrentCustomerSession } from "@/lib/auth/current-customer";
import { customerBookingMenuKeyFromName } from "@/lib/appointments/customer-booking";
import { scheduleDateKey as currentScheduleDateKey } from "@/lib/appointments/schedule";
import { prisma } from "@/lib/prisma";
import { SALON_STAFF, salonStaffKey } from "@/lib/salon/staff";

export const dynamic = "force-dynamic";

function normalizedStaffName(value: string | null | undefined) {
  return value?.normalize("NFKC").replace(/[\s　]/g, "") ?? "";
}

export default async function CustomerAppointmentsPage({ searchParams }: { searchParams?: { detail?: string; repeat?: string; coupon?: string } }) {
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
  const repeatRequested = searchParams?.repeat === "previous" || searchParams?.repeat === "last";
  const [savedStaff, previousSale, selectedCoupon] = await Promise.all([
    prisma.staffBookingSetting.findMany({
      where: { organizationId: session.organizationId },
      orderBy: { createdAt: "asc" },
      select: { staffKey: true, staffName: true }
    }),
    repeatRequested
      ? prisma.serviceSale.findFirst({
          where: {
            customerId: session.customerId,
            appointmentId: { not: null },
            appointment: { customer: { organizationId: session.organizationId } }
          },
          orderBy: { paidAt: "desc" },
          select: { appointment: { select: { menu: true, staffName: true } } }
        })
      : null,
    searchParams?.coupon
      ? prisma.couponIssue.findFirst({
          where: {
            id: searchParams.coupon,
            customerId: session.customerId,
            status: "issued",
            issuedAt: { lte: new Date() },
            expiresAt: { gte: new Date() },
            appointments: { none: { status: { notIn: ["キャンセル", "キャンセル済み", "無断キャンセル"] } } }
          },
          select: { id: true, couponCode: true, discountRate: true, targetMenusJson: true, expiresAt: true }
        })
      : null
  ]);
  const staffOptions = savedStaff.length > 0
    ? savedStaff.map((member) => ({ key: member.staffKey, name: member.staffName, role: "スタイリスト" }))
    : SALON_STAFF.map(({ key, name, role }) => ({ key, name, role }));
  const assignedKey = customer.staffAssignmentType === "assigned"
    ? staffOptions.find((member) => normalizedStaffName(member.name) === normalizedStaffName(customer.assignedStaffName))?.key
      ?? salonStaffKey(customer.assignedStaffName)
    : null;
  const previousAppointment = previousSale?.appointment ?? null;
  const previousStaffKey = previousAppointment?.staffName
    ? staffOptions.find((member) => normalizedStaffName(member.name) === normalizedStaffName(previousAppointment.staffName))?.key ?? "free"
    : null;
  const couponTargetMenus = Array.isArray(selectedCoupon?.targetMenusJson)
    ? selectedCoupon.targetMenusJson.filter((value): value is string => typeof value === "string")
    : [];
  const initialMenuKey = couponTargetMenus.map(customerBookingMenuKeyFromName).find(Boolean)
    ?? customerBookingMenuKeyFromName(previousAppointment?.menu)
    ?? "cut";
  const today = currentScheduleDateKey(new Date());
  const initialDetailAppointmentId = customer.appointments.some((appointment) => appointment.id === searchParams?.detail)
    ? searchParams?.detail ?? null
    : null;

  return (
    <div className="grid gap-5">
      <header className="rounded-[24px] border border-[#e8ded2] bg-gradient-to-r from-[#fffdf9] to-[#f6efe6] px-5 py-5 shadow-sm sm:px-7 sm:py-6">
        <p className="text-xs font-semibold text-[#8f4f42]">Online booking</p>
        <h1 className="mt-1 text-2xl font-semibold text-[#382f2a] sm:text-3xl">サロン予約</h1>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-[#6f6259]">担当者とメニューを選び、実際の予約状況を反映した空き時間からご予約いただけます。</p>
      </header>
      <CustomerBookingCalendar
        currentDate={today}
        defaultStaffKey={previousStaffKey ?? assignedKey ?? "free"}
        initialMenuKey={initialMenuKey}
        previousBookingRequested={repeatRequested}
        previousBookingAvailable={Boolean(previousAppointment)}
        selectedCoupon={selectedCoupon ? {
          id: selectedCoupon.id,
          couponCode: selectedCoupon.couponCode,
          discountRate: selectedCoupon.discountRate,
          expiresAt: selectedCoupon.expiresAt.toISOString()
        } : null}
        staff={staffOptions}
        upcoming={customer.appointments.map((appointment) => ({ ...appointment, scheduledAt: appointment.scheduledAt.toISOString() }))}
        initialDetailAppointmentId={initialDetailAppointmentId}
      />
    </div>
  );
}
