import { CheckCircle2, Clock3, Gift, PackageCheck } from "lucide-react";
import { notFound } from "next/navigation";
import { ProductReviewForm } from "@/components/products/ProductReviewForm";
import { CustomerVisualHeader } from "@/components/lien/brand-visual";
import { getCurrentCustomerSession } from "@/lib/auth/current-customer";
import { parseStringArray } from "@/lib/products/product-review";
import { prisma } from "@/lib/prisma";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "long", day: "numeric" }).format(date);
}

export default async function CustomerReviewDetailPage({ params }: { params: { reviewRequestId: string } }) {
  const session = await getCurrentCustomerSession();
  if (!session) return null;
  const request = await prisma.productReviewRequest.findFirst({
    where: {
      id: params.reviewRequestId,
      productProposal: { customerId: session.customerId, purchased: true }
    },
    include: {
      review: { select: { id: true } },
      productProposal: {
        include: { product: { select: { name: true, manufacturerName: true, category: true } } }
      }
    }
  });
  if (!request) notFound();

  const expired = request.expiresAt < new Date() || request.status === "expired";
  const answered = request.status === "answered" || Boolean(request.review);
  const product = request.productProposal.product;
  const concernTags = parseStringArray(request.productProposal.concernTags);

  return (
    <div className="grid gap-5">
      <CustomerVisualHeader
        variant="reviews"
        eyebrow="Product survey"
        title="商品のご感想"
        description="実際に使って感じたことを、無理のない範囲でお聞かせください。"
        imageClassName="object-[50%_58%]"
      />
      <section className="rounded-[24px] border border-[#e8ded2] bg-white p-5 shadow-sm">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#f6efe6] text-[#8f4f42]"><PackageCheck className="h-6 w-6" /></span>
        <p className="mt-4 text-xs font-semibold text-[#8f4f42]">{product.manufacturerName}</p>
        <h1 className="mt-1 text-xl font-semibold">{product.name}</h1>
        {product.category ? <p className="mt-1 text-sm text-[#7c7168]">{product.category}</p> : null}
        {request.productProposal.proposalReason ? <p className="mt-3 text-sm leading-6 text-[#6f6259]">{request.productProposal.proposalReason}</p> : null}
        {concernTags.length > 0 ? <div className="mt-3 flex flex-wrap gap-2">{concernTags.map((tag) => <span key={tag} className="rounded-full bg-[#edf7ef] px-3 py-1 text-xs font-semibold text-[#46634b]">{tag}</span>)}</div> : null}
        <p className="mt-4 flex items-center gap-2 text-xs text-[#7c7168]"><Clock3 className="h-4 w-4" />回答期限 {formatDate(request.expiresAt)}</p>
        <p className="mt-2 flex items-center gap-2 text-xs font-semibold text-[#7b5d1d]"><Gift className="h-4 w-4" />回答後に3つの宝箱から1つ選べます</p>
      </section>

      {answered ? (
        <section className="rounded-[20px] border border-[#b8d5bf] bg-[#edf7ef] p-5 text-[#315c3c]"><div className="flex gap-3"><CheckCircle2 className="h-5 w-5 shrink-0" /><div><p className="font-semibold">回答済みです</p><p className="mt-2 text-sm">ご協力ありがとうございました。</p></div></div></section>
      ) : expired ? (
        <section className="rounded-[20px] border border-[#ead39c] bg-[#fff9e8] p-5 text-[#6f5215]"><p className="font-semibold">回答期限が過ぎています</p><p className="mt-2 text-sm">このアンケートには回答できません。</p></section>
      ) : (
        <section className="rounded-[24px] border border-[#e8ded2] bg-white p-5 shadow-sm">
          <p className="mb-5 text-sm font-semibold text-[#8f4f42]">回答を送信すると3つの宝箱から1つ選べます</p>
          <ProductReviewForm
            submissionUrl={`/api/customer/reviews/${request.id}`}
            completionUrl="/u/reviews"
          />
        </section>
      )}
    </div>
  );
}
