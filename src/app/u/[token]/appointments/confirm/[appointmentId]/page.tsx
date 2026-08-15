import { notFound } from "next/navigation";
import AppointmentConfirmPage from "@/app/appointments/[id]/confirm/page";
import { prisma } from "@/lib/prisma";
import { resolveCustomerPortalToken } from "@/lib/auth/customer-portal";

type UserAppointmentConfirmPageProps = {
  params: {
    token: string;
    appointmentId: string;
  };
  searchParams?: {
    submitted?: string;
  };
};

export default async function UserAppointmentConfirmPage({ params, searchParams }: UserAppointmentConfirmPageProps) {
  const portal = await resolveCustomerPortalToken(params.token);
  if (!portal) notFound();
  const appointment = await prisma.appointment.findFirst({
    where: {
      id: params.appointmentId,
      customerId: portal.customerId,
      customer: {
        deletedAt: null
      }
    },
    select: {
      id: true
    }
  });

  if (!appointment) {
    notFound();
  }

  return AppointmentConfirmPage({
    params: {
      id: params.appointmentId
    },
    searchParams: {
      inApp: "1",
      submitted: searchParams?.submitted,
      portalToken: params.token
    }
  });
}
