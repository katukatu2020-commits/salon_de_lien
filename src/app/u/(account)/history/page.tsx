import { Camera, Clock3, Scissors, UserRound } from "lucide-react";
import { CustomerVisualHeader } from "@/components/lien/brand-visual";
import { VisitShareToggle } from "@/components/community/visit-share-toggle";
import { getCurrentCustomerSession } from "@/lib/auth/current-customer";
import { prisma } from "@/lib/prisma";
import { normalizeSalonStaffName } from "@/lib/salon/staff";
import { resolveCustomerPhotoReference } from "@/lib/storage/customer-photo";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "long", day: "numeric", weekday: "short" }).format(date);
}

export default async function CustomerHistoryPage() {
  const session = await getCurrentCustomerSession();
  if (!session) return null;
  const visits = await prisma.visit.findMany({
    where: {
      customerId: session.customerId,
      customer: {
        organizationId: session.organizationId,
        deletedAt: null
      }
    },
    orderBy: { visitedAt: "desc" },
    take: 30,
    include: {
      photos: { orderBy: { createdAt: "asc" } },
      communityPost: { select: { published: true } }
    }
  });
  const photoEntries = await Promise.all(
    visits.flatMap((visit) =>
      visit.photos.map(async (photo) => [photo.id, await resolveCustomerPhotoReference(photo.storageReference)] as const)
    )
  );
  const photoUrlById = new Map(
    photoEntries.filter((entry): entry is readonly [string, string] => Boolean(entry[1]))
  );

  return (
    <div className="grid gap-5">
      <CustomerVisualHeader
        variant="history"
        eyebrow="Visit history"
        title="来店履歴"
        description="これまでの施術と仕上がり写真を振り返れます。"
        imageClassName="object-[50%_34%]"
      />
      <p className="rounded-2xl border border-[#e8ded2] bg-white px-4 py-3 text-xs leading-5 text-[#6f6259]">
        施術後写真は店舗スタッフが来店履歴へ登録します。お客様は写真の閲覧と、スタイル共有への公開設定を行えます。
      </p>
      {visits.length > 0 ? (
        <div className="relative grid gap-4 before:absolute before:bottom-8 before:left-5 before:top-8 before:w-px before:bg-[#dfd2c6] lg:grid-cols-2 lg:before:hidden">
          {visits.map((visit) => {
            const photos = visit.photos.flatMap((photo) => {
              const url = photoUrlById.get(photo.id);
              return url ? [{ ...photo, url }] : [];
            });
            return (
              <article
                key={visit.id}
                className="relative ml-8 min-w-0 rounded-[20px] border border-[#e8ded2] bg-white p-4 shadow-sm before:absolute before:-left-[1.8rem] before:top-6 before:h-3 before:w-3 before:rounded-full before:border-[3px] before:border-[#fbf7f0] before:bg-[#8f4f42] sm:ml-10 sm:p-5 sm:before:-left-[2.05rem] lg:ml-0 lg:before:hidden"
              >
                <p className="flex items-center gap-2 text-xs font-semibold text-[#8f4f42]">
                  <Clock3 className="h-4 w-4" />
                  {formatDate(visit.visitedAt)}
                </p>
                <h2 className="mt-3 flex items-center gap-2 text-base font-semibold">
                  <Scissors className="h-4 w-4 text-[#8aa58a]" />
                  {visit.performedStyle ?? visit.requestedStyle ?? "施術記録"}
                </h2>
                <p className="mt-3 flex items-center gap-2 text-sm text-[#6f6259]">
                  <UserRound className="h-4 w-4" />
                  担当: {normalizeSalonStaffName(visit.stylistName) ?? "フリー"}
                </p>
                {visit.customerReaction ? (
                  <p className="mt-3 rounded-xl bg-[#f6efe6] px-4 py-3 text-sm leading-6 text-[#5b5149]">
                    {visit.customerReaction}
                  </p>
                ) : null}
                {photos.length > 0 ? (
                  <section className="mt-4 border-t border-[#eee4da] pt-4" aria-label="施術後写真">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-[#5b5149]">
                      <Camera className="h-4 w-4 text-[#8f4f42]" />
                      施術後の仕上がり
                    </h3>
                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {photos.map((photo) => (
                        <a
                          key={photo.id}
                          href={photo.url}
                          target="_blank"
                          rel="noreferrer"
                          className="group relative aspect-[4/3] min-w-0 overflow-hidden rounded-xl border border-[#e8ded2] bg-[#eee7df] shadow-sm focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#e9c9be]"
                          aria-label={`施術後写真を拡大表示${photo.caption ? `: ${photo.caption}` : ""}`}
                        >
                          <span
                            className="absolute inset-0 bg-cover bg-center transition duration-200 group-hover:scale-[1.02] motion-reduce:transition-none"
                            style={{ backgroundImage: `url(${photo.url})` }}
                          />
                          {photo.caption ? (
                            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent px-2 pb-2 pt-7 text-[10px] leading-4 text-white">
                              {photo.caption}
                            </span>
                          ) : null}
                        </a>
                      ))}
                    </div>
                  </section>
                ) : null}
                <VisitShareToggle
                  visitId={visit.id}
                  initialPublished={visit.communityPost?.published ?? false}
                  canShare={photos.length > 0}
                />
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-[20px] border border-dashed border-[#d8cbbf] bg-white px-5 py-12 text-center text-sm text-[#7c7168]">
          来店履歴はまだありません。
        </div>
      )}
    </div>
  );
}
