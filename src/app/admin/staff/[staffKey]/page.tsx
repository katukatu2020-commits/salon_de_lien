import Link from "next/link";
import { ArrowLeft, Clock3, Save, UserRound } from "lucide-react";
import { notFound } from "next/navigation";
import { LienCard, PageHeader } from "@/components/lien/lien-ui";
import { updateStaffBookingSettingAction } from "@/lib/actions/staff-schedule-actions";
import { requireBackofficeSession } from "@/lib/auth/authorization";
import { prisma } from "@/lib/prisma";
import { resolveSalonStaffByKey } from "@/lib/salon/staff";

export const dynamic = "force-dynamic";

function timeValue(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

export default async function StaffBookingSettingPage({
  params,
  searchParams
}: {
  params: { staffKey: string };
  searchParams?: { saved?: string };
}) {
  const session = await requireBackofficeSession(["ADMIN", "STAFF"]);
  if (!session.organizationId) notFound();
  const staff = resolveSalonStaffByKey(params.staffKey);
  if (!staff) notFound();
  const setting = await prisma.staffBookingSetting.findUnique({
    where: {
      organizationId_staffKey: {
        organizationId: session.organizationId,
        staffKey: params.staffKey
      }
    }
  });
  const canEdit = session.role === "ADMIN";
  const maxConcurrentAppointments = setting?.maxConcurrentAppointments ?? (params.staffKey === "tanizaki" ? 2 : 1);
  const workStartMinutes = setting?.workStartMinutes ?? 600;
  const workEndMinutes = setting?.workEndMinutes ?? 1140;

  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <PageHeader
        eyebrow="Staff booking setting"
        title={`${staff.name}の受付設定`}
        description="シフト表で同じ時間帯に受け付けられる予約数と、受付時間を設定します。"
        secondaryAction={
          <Link href="/admin/appointments" className="lien-button-secondary px-4">
            <ArrowLeft className="h-4 w-4" />予約カレンダーへ
          </Link>
        }
      />

      {searchParams?.saved === "1" ? (
        <div role="status" className="rounded-2xl border border-[#bed9ca] bg-[#edf8f1] px-4 py-3 text-sm font-semibold text-[#315d47]">
          受付設定を保存しました。
        </div>
      ) : null}

      <LienCard>
        <div className="flex items-center gap-3 border-b border-[color:var(--lien-border)] pb-5">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-[color:var(--lien-primary-soft)] text-[color:var(--lien-primary-dark)]">
            <UserRound className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-semibold text-[color:var(--lien-ink)]">{staff.name}</h2>
            <p className="mt-1 text-sm text-[color:var(--lien-muted)]">{staff.role}</p>
          </div>
        </div>

        <form action={updateStaffBookingSettingAction.bind(null, params.staffKey)} className="mt-6 grid gap-5">
          <label className="grid gap-2 text-sm font-semibold text-[color:var(--lien-ink)]">
            受付可能数
            <select
              name="maxConcurrentAppointments"
              defaultValue={maxConcurrentAppointments}
              disabled={!canEdit}
              className="h-12 rounded-xl border border-[color:var(--lien-border)] bg-white px-4 text-sm outline-none focus:border-[color:var(--lien-primary)] focus:ring-4 focus:ring-[#e9c9be]/40 disabled:bg-[#f4f0eb]"
            >
              {[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value}件</option>)}
            </select>
            <span className="font-normal text-[color:var(--lien-muted)]">同じ時間帯に重ねて登録できる予約数です。</span>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold text-[color:var(--lien-ink)]">
              受付開始
              <span className="relative">
                <Clock3 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--lien-muted)]" />
                <input name="workStart" type="time" step="900" min="10:00" max="18:45" defaultValue={timeValue(workStartMinutes)} disabled={!canEdit} className="h-12 w-full rounded-xl border border-[color:var(--lien-border)] bg-white pl-11 pr-4 text-sm outline-none focus:border-[color:var(--lien-primary)] focus:ring-4 focus:ring-[#e9c9be]/40 disabled:bg-[#f4f0eb]" />
              </span>
            </label>
            <label className="grid gap-2 text-sm font-semibold text-[color:var(--lien-ink)]">
              受付終了
              <span className="relative">
                <Clock3 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--lien-muted)]" />
                <input name="workEnd" type="time" step="900" min="10:15" max="19:00" defaultValue={timeValue(workEndMinutes)} disabled={!canEdit} className="h-12 w-full rounded-xl border border-[color:var(--lien-border)] bg-white pl-11 pr-4 text-sm outline-none focus:border-[color:var(--lien-primary)] focus:ring-4 focus:ring-[#e9c9be]/40 disabled:bg-[#f4f0eb]" />
              </span>
            </label>
          </div>

          {canEdit ? (
            <button type="submit" className="lien-button-primary justify-self-start px-5">
              <Save className="h-4 w-4" />設定を保存
            </button>
          ) : (
            <p className="rounded-xl bg-[color:var(--lien-surface-soft)] px-4 py-3 text-sm text-[color:var(--lien-muted)]">設定の変更はオーナーアカウントで行えます。</p>
          )}
        </form>
      </LienCard>
    </div>
  );
}
