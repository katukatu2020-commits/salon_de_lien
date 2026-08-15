import { PasswordResetRequestPage } from "@/components/auth/password-reset-request-page";

export default function AdminPasswordResetPage({ searchParams }: { searchParams?: { sent?: string } }) {
  return <PasswordResetRequestPage audience="admin" sent={searchParams?.sent === "1"} />;
}
