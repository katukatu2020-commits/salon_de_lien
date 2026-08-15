import { Camera, ShieldCheck } from "lucide-react";
import { VisitAfterPhotoUploader, type VisitAfterPhoto } from "@/components/customers/visit-after-photo-uploader";
import { prisma } from "@/lib/prisma";
import { resolveCustomerPhotoReference } from "@/lib/storage/customer-photo";
import { historyDateKey, historyDateRange } from "@/lib/visits/history-visit";

export async function AppointmentVisitPhotoManager({
  customerId,
  scheduledAt
}: {
  customerId: string;
  scheduledAt: Date;
}) {
  const historyDate = historyDateKey(scheduledAt);
  const range = historyDateRange(historyDate);
  const visit = range
    ? await prisma.visit.findFirst({
        where: {
          customerId,
          visitedAt: { gte: range.start, lt: range.end }
        },
        orderBy: { visitedAt: "desc" },
        include: { photos: { orderBy: { createdAt: "asc" } } }
      })
    : null;

  const photos: VisitAfterPhoto[] = visit
    ? (await Promise.all(
        visit.photos.map(async (photo) => {
          const url = await resolveCustomerPhotoReference(photo.storageReference);
          return url
            ? {
                id: photo.id,
                url,
                caption: photo.caption,
                uploadedByName: photo.uploadedByName,
                createdAt: photo.createdAt.toISOString()
              }
            : null;
        })
      )).filter((photo): photo is VisitAfterPhoto => photo !== null)
    : [];

  return (
    <section className="rounded-[24px] border border-[#e8ded2] bg-white p-5 shadow-lien sm:p-6" aria-labelledby="appointment-photo-heading">
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#f1dfd7] text-[#6e4037]">
          <Camera className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 id="appointment-photo-heading" className="text-lg font-semibold text-[#2f2a25]">施術後の仕上がり写真</h2>
          <p className="mt-1 text-sm leading-6 text-[#7c7168]">
            会計が完了した来店履歴へ保存します。お客様アプリでは閲覧とスタイル共有の公開設定ができます。
          </p>
        </div>
      </div>

      <VisitAfterPhotoUploader
        customerId={customerId}
        visitId={visit?.id ?? null}
        historyDate={historyDate}
        photos={photos}
      />

      <p className="mt-4 flex items-center gap-2 text-xs font-medium text-[#6f6259]">
        <ShieldCheck className="h-4 w-4 shrink-0 text-[#718b72]" aria-hidden="true" />
        写真の追加と削除は、ログインした店舗スタッフだけが行えます。
      </p>
    </section>
  );
}
