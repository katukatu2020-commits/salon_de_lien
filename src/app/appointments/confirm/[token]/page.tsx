import AppointmentConfirmPage from "@/app/appointments/[id]/confirm/page";

type AppointmentConfirmTokenPageProps = {
  params: {
    token: string;
  };
  searchParams?: {
    submitted?: string;
  };
};

export default async function AppointmentConfirmTokenPage({ params, searchParams }: AppointmentConfirmTokenPageProps) {
  return AppointmentConfirmPage({
    params: {
      id: params.token
    },
    searchParams
  });
}

