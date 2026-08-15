import { PasswordResetRequestPage } from "@/components/auth/password-reset-request-page";

export default function CustomerPasswordResetPage({ searchParams }: { searchParams?: { sent?: string } }) {
  return <PasswordResetRequestPage audience="customer" sent={searchParams?.sent === "1"} />;
}
