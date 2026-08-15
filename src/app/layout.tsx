import type { Metadata, Viewport } from "next";
import { AppShell } from "@/components/layout/app-shell";
import { getBackofficeSession } from "@/lib/auth/authorization";
import { prisma } from "@/lib/prisma";
import { resolveCustomerPhotoReferences } from "@/lib/storage/customer-photo";
import "./globals.css";

export const metadata: Metadata = {
  title: "Salon de Lien",
  description: "美容室の顧客カルテから再来店、商品提案、ポイント、紹介までつなげるCRM"
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

async function currentShellData() {
  try {
    const session = await getBackofficeSession();
    if (!session?.organizationId) {
      return { storeIconUrl: null, backofficeRole: session?.role ?? null, backofficeDisplayName: null };
    }
    const [organization, appUser] = await Promise.all([
      prisma.organization.findUnique({
        where: { id: session.organizationId },
        select: { iconImageUrl: true }
      }),
      session.userId
        ? prisma.appUser.findUnique({
            where: { id: session.userId },
            select: { displayName: true }
          })
        : null
    ]);
    const backofficeDisplayName =
      appUser?.displayName?.trim() ||
      (session.role === "ADMIN" ? "管理者" : session.role === "STAFF" ? "スタッフ" : "メーカー担当者");
    return {
      storeIconUrl: organization?.iconImageUrl
        ? (await resolveCustomerPhotoReferences([organization.iconImageUrl]))[0] ?? null
        : null,
      backofficeRole: session.role,
      backofficeDisplayName
    };
  } catch {
    return { storeIconUrl: null, backofficeRole: null, backofficeDisplayName: null };
  }
}

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { storeIconUrl, backofficeRole, backofficeDisplayName } = await currentShellData();
  return (
    <html lang="ja">
      <body>
        <AppShell
          storeIconUrl={storeIconUrl}
          backofficeRole={backofficeRole}
          backofficeDisplayName={backofficeDisplayName}
        >
          {children}
        </AppShell>
      </body>
    </html>
  );
}
