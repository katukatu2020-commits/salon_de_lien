import Link from "next/link";
import { ChevronRight, Clock3, Gift, Inbox, MessageCircleQuestion } from "lucide-react";
import { CustomerVisualHeader } from "@/components/lien/brand-visual";
import { getCurrentCustomerSession } from "@/lib/auth/current-customer";
import { prisma } from "@/lib/prisma";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "long", day: "numeric" }).format(date);
}

export default async function CustomerReviewsPage() {
  const session = await getCurrentCustomerSession();
  if (!session) return null;
  const now = new Date();
  const proposals = await prisma.productProposal.findMany({
    where: { customerId: session.customerId, purchased: true },
    orderBy: { createdAt: "desc" },
    include: {
      product: { select: { name: true, manufacturerName: true, category: true } },
      reviewRequests: {
        orderBy: { requestedAt: "desc" },
        take: 1,
        include: { review: { select: { id: true } } }
      }
    }
  });

  const activeRequests = proposals.flatMap((proposal) => {
    const request = proposal.reviewRequests[0];
    return request && request.status === "active" && !request.review && request.expiresAt >= now
      ? [{ proposal, request }]
      : [];
  }).sort((a, b) => a.request.expiresAt.getTime() - b.request.expiresAt.getTime());

  return (
    <div className="grid gap-5">
      <CustomerVisualHeader
        variant="reviews"
        eyebrow="Survey inbox"
        title="アンケート受信ボックス"
        description="購入した商品のアンケートと回答期限をまとめて確認できます。"
        badge={
          <span className="inline-flex min-w-10 items-center justify-center rounded-full border border-white/40 bg-white/90 px-3 py-1 text-sm font-semibold text-[#8f4f42] shadow-sm">
            {activeRequests.length}
          </span>
        }
        imageClassName="object-[50%_58%]"
      />

      {activeRequests.length > 0 ? (
        <section className="grid gap-4 md:grid-cols-2">
          <div className="flex items-center gap-2 rounded-[18px] border border-[#e8ded2] bg-white px-4 py-3 text-sm font-semibold text-[#5b332c] shadow-sm md:col-span-2">
            <Inbox className="h-4 w-4" />未回答 {activeRequests.length}件
          </div>
          {activeRequests.map(({ proposal, request }) => (
            <Link
              key={request.id}
              href={`/u/reviews/${request.id}`}
              className="flex min-h-28 items-center gap-3 rounded-[20px] border border-[#e8ded2] bg-white p-4 shadow-sm transition hover:bg-[#fdf9f4] active:bg-[#f6efe6]"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#f6efe6] text-[#8f4f42]">
                <MessageCircleQuestion className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-semibold text-[#8f4f42]">{proposal.product.manufacturerName}</span>
                <span className="mt-1 block text-sm font-semibold">{proposal.product.name}</span>
                <span className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#7c7168]">
                  <span className="flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />期限 {formatDate(request.expiresAt)}</span>
                  <span className="flex items-center gap-1 font-semibold text-[#7b5d1d]"><Gift className="h-3.5 w-3.5" />宝箱 80〜1,000pt</span>
                </span>
              </span>
              <ChevronRight className="h-5 w-5 shrink-0 text-[#a69a90]" />
            </Link>
          ))}
        </section>
      ) : (
        <section className="rounded-[20px] border border-[#e8ded2] bg-white p-6 text-center shadow-sm">
          <MessageCircleQuestion className="mx-auto h-8 w-8 text-[#c2b6aa]" />
          <p className="mt-3 font-semibold">受信中のアンケートはありません</p>
        </section>
      )}
    </div>
  );
}
