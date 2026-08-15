import { PasswordResetConfirmPage } from "@/components/auth/password-reset-confirm-page";

export default function AdminPasswordResetConfirmPage({ params, searchParams }: { params: { token: string }; searchParams?: { error?: string } }) {
  return <PasswordResetConfirmPage audience="admin" token={params.token} error={searchParams?.error} />;
}
