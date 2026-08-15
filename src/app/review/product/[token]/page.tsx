import { CheckCircle2, Clock3, PackageCheck, Sparkles } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { ProductReviewForm } from "@/components/products/ProductReviewForm";
import { LienCard, StatusBadge } from "@/components/lien/lien-ui";
import { BrandVisual } from "@/components/lien/brand-visual";
import { prisma } from "@/lib/prisma";
import { hashProductReviewToken, parseStringArray } from "@/lib/products/product-review";
import { issueCustomerPortalAccess } from "@/lib/auth/customer-portal";

export const dynamic = "force-dynamic";

type ProductReviewPageProps = {
  params: {
    token: string;
  };
  searchParams?: {
    inApp?: string;
  };
  portalToken?: string;
};

export default async function ProductReviewPage({ params, searchParams, portalToken }: ProductReviewPageProps) {
  const reviewRequest = await prisma.productReviewRequest.findUnique({
    where: {
      tokenHash: hashProductReviewToken(params.token)
    },
    include: {
      review: {
        select: { id: true }
      },
      productProposal: {
        select: {
          customerId: true,
          customer: { select: { organizationId: true } },
          proposalReason: true,
          concernTags: true,
          product: {
            select: {
              name: true,
              manufacturerName: true,
              category: true
            }
          }
        }
      }
    }
  });

  if (!reviewRequest) {
    notFound();
  }

  if (searchParams?.inApp !== "1" && reviewRequest.status === "active" && reviewRequest.expiresAt.getTime() >= Date.now()) {
    const portal = await issueCustomerPortalAccess({
      customerId: reviewRequest.productProposal.customerId,
      organizationId: reviewRequest.productProposal.customer.organizationId
    });
    redirect(`${portal.urlPath}/review/product/${encodeURIComponent(params.token)}`);
  }

  const isAnswered = reviewRequest.status === "answered" || Boolean(reviewRequest.review);
  const isExpired = reviewRequest.expiresAt.getTime() < Date.now() || reviewRequest.status === "expired";
  const product = reviewRequest.productProposal.product;
  const concernTags = parseStringArray(reviewRequest.productProposal.concernTags);

  return (
    <main className="min-h-screen bg-lien px-4 py-6 text-lien-ink sm:py-10">
      <div className="mx-auto grid max-w-2xl gap-5">
        <LienCard tone="premium" className="relative overflow-hidden">
          <BrandVisual
            variant="products"
            className="-mx-5 -mt-5 mb-5 h-40 sm:-mx-6 sm:-mt-6"
            imageClassName="object-[56%_52%]"
            sizes="(max-width: 672px) 100vw, 672px"
          />
          <div className="relative">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[color:var(--lien-primary)] shadow-sm">
              <PackageCheck className="h-6 w-6" />
            </div>
            <p className="mt-4 text-xs font-semibold text-[color:var(--lien-primary-dark)]">{product.manufacturerName}</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-normal text-lien-ink">先日おすすめした商品の感想を教えてください</h1>
            <p className="mt-2 text-sm leading-6 text-lien-muted">
              お名前などの個人情報はメーカーには共有されません。回答内容は、個人が分からない形で商品改善に活用されます。
            </p>
            <div className="mt-5 rounded-[22px] border border-lien bg-white/86 p-4 shadow-sm">
              <p className="text-xs font-semibold text-lien-muted">対象商品</p>
              <p className="mt-1 text-lg font-semibold text-lien-ink">{product.name}</p>
              {product.category ? <p className="mt-1 text-sm text-lien-muted">{product.category}</p> : null}
              {reviewRequest.productProposal.proposalReason ? (
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-lien-muted">{reviewRequest.productProposal.proposalReason}</p>
              ) : null}
              {concernTags.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {concernTags.map((tag) => (
                    <StatusBadge key={tag} tone="success">
                      {tag}
                    </StatusBadge>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </LienCard>

        {isAnswered ? (
          <LienCard tone="success">
            <div className="flex gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[color:var(--lien-sage)]" />
              <div>
                <p className="font-semibold">このアンケートは回答済みです</p>
                <p className="mt-2 text-sm leading-6 text-lien-muted">ご協力ありがとうございました。</p>
              </div>
            </div>
          </LienCard>
        ) : isExpired ? (
          <LienCard tone="warning">
            <div className="flex gap-3">
              <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-[color:var(--lien-warning)]" />
              <div>
                <p className="font-semibold">回答期限が過ぎています</p>
                <p className="mt-2 text-sm leading-6 text-lien-muted">必要な場合は、サロンスタッフへ新しいURLをご確認ください。</p>
              </div>
            </div>
          </LienCard>
        ) : (
          <LienCard>
            <div className="mb-5 flex items-center gap-2 text-sm font-semibold text-[color:var(--lien-primary-dark)]">
              <Sparkles className="h-4 w-4" />
              回答を送信すると3つの宝箱から1つ選べます（80pt・200pt・1,000pt）
            </div>
            <p className="mb-5 flex items-center gap-2 text-xs text-lien-muted">
              <Clock3 className="h-4 w-4 shrink-0" />
              回答期限: {new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "long", day: "numeric" }).format(reviewRequest.expiresAt)}
            </p>
            <ProductReviewForm token={params.token} customerAppUrl={`/u/${portalToken ?? reviewRequest.productProposal.customerId}`} />
          </LienCard>
        )}
      </div>
    </main>
  );
}
