import Link from "next/link";
import { CalendarDays, Plus, Save, Star, UserRound, UsersRound } from "lucide-react";
import { LienCard, MetricCard, PageHeader, StatusBadge } from "@/components/lien/lien-ui";
import { BrandVisual } from "@/components/lien/brand-visual";
import { ManufacturerProductReportFilters } from "@/components/products/ManufacturerProductReportFilters";
import { ProductWorkspaceTabs } from "@/components/products/product-workspace-tabs";
import {
  getManufacturerNames,
  getManufacturerProductCategories,
  getManufacturerProductNames,
  getManufacturerProductReport,
  getManufacturerReviewEditorOptions
} from "@/lib/products/manufacturer-report";
import {
  createManufacturerReviewAction,
  updateManufacturerReviewAction
} from "@/lib/actions/manufacturer-review-actions";
import { requireManufacturerReportAccess } from "@/lib/auth/authorization";

export const dynamic = "force-dynamic";

type ManufacturerProductReportPageProps = {
  searchParams?: {
    section?: string;
    manufacturer?: string;
    productName?: string;
    category?: string;
    from?: string;
    to?: string;
    notice?: string;
  };
};

type ManufacturerProductReport = Awaited<ReturnType<typeof getManufacturerProductReport>>;
type ProductReport = ManufacturerProductReport["products"][number];
type ProductReview = ProductReport["reviews"][number];
type EditorOptions = Awaited<ReturnType<typeof getManufacturerReviewEditorOptions>>;

type PieSlice = {
  label: string;
  value: number;
  color: string;
};

const ageColors = ["#8F4F42", "#D8B56D", "#8AA58A", "#C69076", "#5B332C", "#B85D55", "#7C7168", "#E8DED2"];

function parseDate(value?: string) {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function average(values: number[]) {
  if (values.length === 0) {
    return null;
  }

  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

function formatAverage(value: number | null) {
  return value === null ? "-" : value.toFixed(1);
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function formatDateInput(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

function pointsText(values: string[]) {
  return values.join(", ");
}

function noticeMessage(notice?: string) {
  if (notice === "product-created") return "商品を追加しました。";
  if (notice === "review-created") return "レビューを追加しました。";
  if (notice === "product-updated") return "商品情報を保存しました。";
  if (notice === "review-updated") return "レビューを保存しました。";
  if (notice === "product-deleted") return "商品を削除しました。";
  return null;
}

function buildReportHref({
  manufacturer,
  productName,
  category,
  from,
  to
}: {
  manufacturer: string;
  productName?: string;
  category?: string;
  from?: string;
  to?: string;
}) {
  const params = new URLSearchParams();

  if (manufacturer) params.set("manufacturer", manufacturer);
  if (productName) params.set("productName", productName);
  if (category) params.set("category", category);
  if (from) params.set("from", from);
  if (to) params.set("to", to);

  params.set("section", "feedback");
  const query = params.toString();
  return `/admin/products?${query}`;
}

function percentage(value: number, total: number) {
  if (total <= 0) {
    return 0;
  }

  return Math.round((value / total) * 100);
}

function pieBackground(slices: PieSlice[]) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);

  if (total <= 0) {
    return "#f6efe6";
  }

  let cursor = 0;
  const stops = slices
    .filter((slice) => slice.value > 0)
    .map((slice) => {
      const start = cursor;
      const end = cursor + (slice.value / total) * 360;
      cursor = end;
      return `${slice.color} ${start}deg ${end}deg`;
    });

  return `conic-gradient(${stops.join(", ")})`;
}

function PieChart({ title, slices }: { title: string; slices: PieSlice[] }) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);

  return (
    <div className="rounded-[24px] border border-lien bg-white p-5 shadow-lien-sm">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-lien-ink">{title}</h3>
        <span className="text-xs font-semibold tabular-nums text-lien-muted">合計 {total}人</span>
      </div>
      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div
          className="grid h-32 w-32 shrink-0 place-items-center rounded-full"
          style={{ background: pieBackground(slices) }}
          aria-hidden="true"
        >
          <div className="h-16 w-16 rounded-full border border-lien bg-white shadow-sm" />
        </div>
        <div className="grid flex-1 gap-2">
          {slices.map((slice) => (
            <div key={slice.label} className="flex items-center justify-between gap-3 text-sm">
              <span className="flex min-w-0 items-center gap-2 text-lien-muted">
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: slice.color }} />
                <span className="truncate">{slice.label}</span>
              </span>
              <span className="shrink-0 font-semibold tabular-nums text-lien-ink">
                {slice.value}人 / {percentage(slice.value, total)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ageSlices(report: ManufacturerProductReport): PieSlice[] {
  return report.ageGroupBreakdown.map((item, index) => ({
    label: item.label,
    value: item.count,
    color: ageColors[index % ageColors.length]
  }));
}

function RatingStars({ rating }: { rating: number | null }) {
  const normalized = typeof rating === "number" ? Math.max(0, Math.min(5, rating)) : 0;

  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`星${normalized}`}>
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          className={`h-4 w-4 ${index < normalized ? "fill-[#D8B56D] text-[#D8B56D]" : "fill-transparent text-[#d8cec3]"}`}
        />
      ))}
    </span>
  );
}

function ReviewCard({ review, returnTo, canEdit }: { review: ProductReview; returnTo: string; canEdit: boolean }) {
  const initial = review.reviewerName.trim().slice(0, 1) || "L";
  const reviewerName = review.reviewerHref ? (
    <Link href={review.reviewerHref} className="font-semibold text-lien-ink transition hover:text-[#8F4F42] hover:underline">
      {review.reviewerName}
    </Link>
  ) : (
    <span className="font-semibold text-lien-ink">{review.reviewerName}</span>
  );

  return (
    <div className="rounded-[22px] border border-lien bg-white p-4 shadow-[0_10px_28px_rgba(47,42,37,0.05)]">
      <div className="flex items-start gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#F6EFE6] text-sm font-semibold text-[#8F4F42]">
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p>{reviewerName}</p>
              <p className="mt-0.5 text-xs text-lien-muted">
                {review.reviewerAgeGroup} / {review.reviewerGender}
              </p>
            </div>
            <span className="text-xs tabular-nums text-lien-muted">{formatDate(review.submittedAt)}</span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <RatingStars rating={review.rating} />
            <span className="text-sm font-semibold tabular-nums text-lien-ink">{review.rating ?? "-"} / 5</span>
          </div>
          {review.comment ? (
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#4f463f]">{review.comment}</p>
          ) : (
            <p className="mt-3 text-sm text-lien-muted">コメントなし</p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {review.goodPoints.slice(0, 4).map((point) => (
              <span key={`good-${point}`} className="rounded-full bg-[#eef5ed] px-3 py-1 text-xs font-semibold text-[#5f7c5f]">
                良かった: {point}
              </span>
            ))}
            {review.badPoints.slice(0, 4).map((point) => (
              <span key={`bad-${point}`} className="rounded-full bg-[#fbefec] px-3 py-1 text-xs font-semibold text-[#9b554d]">
                気になる: {point}
              </span>
            ))}
          </div>
          {canEdit ? <details className="mt-4 rounded-[18px] border border-lien bg-[#fffdf9] p-3">
            <summary className="cursor-pointer text-xs font-semibold text-[#8F4F42]">レビューを編集</summary>
            <form action={updateManufacturerReviewAction} className="mt-3 grid gap-3">
              <input type="hidden" name="reviewId" value={review.reviewId} />
              <input type="hidden" name="returnTo" value={returnTo} />
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1.5 text-xs font-semibold text-lien-ink">
                  星評価
                  <select name="rating" defaultValue={review.rating ?? 5} className="lien-input">
                    {[5, 4, 3, 2, 1].map((rating) => (
                      <option key={rating} value={rating}>
                        {rating}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1.5 text-xs font-semibold text-lien-ink">
                  投稿日
                  <input name="submittedAt" type="date" defaultValue={formatDateInput(review.submittedAt)} className="lien-input" />
                </label>
              </div>
              <label className="grid gap-1.5 text-xs font-semibold text-lien-ink">
                コメント
                <textarea name="comment" defaultValue={review.comment} rows={4} className="lien-input min-h-28 rounded-[18px]" />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1.5 text-xs font-semibold text-lien-ink">
                  良かった点
                  <input name="goodPoints" defaultValue={pointsText(review.goodPoints)} className="lien-input" />
                </label>
                <label className="grid gap-1.5 text-xs font-semibold text-lien-ink">
                  気になった点
                  <input name="badPoints" defaultValue={pointsText(review.badPoints)} className="lien-input" />
                </label>
              </div>
              <button type="submit" className="lien-button-secondary w-fit">
                <Save className="h-4 w-4" />
                保存
              </button>
            </form>
          </details> : null}
        </div>
      </div>
    </div>
  );
}

function NewReviewForm({
  productId,
  customers,
  returnTo
}: {
  productId: string;
  customers: EditorOptions["customers"];
  returnTo: string;
}) {
  const today = new Date().toISOString().slice(0, 10);

  return (
    <details className="rounded-[20px] border border-lien bg-[#fffdf9] p-4">
      <summary className="cursor-pointer text-sm font-semibold text-[#8F4F42]">レビューを新規追加</summary>
      <form action={createManufacturerReviewAction} className="mt-3 grid gap-3">
        <input type="hidden" name="productId" value={productId} />
        <input type="hidden" name="returnTo" value={returnTo} />
        <div className="grid gap-3 md:grid-cols-3">
          <label className="grid gap-1.5 text-xs font-semibold text-lien-ink">
            顧客
            <select name="customerId" className="lien-input" required>
              <option value="">顧客を選択</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-xs font-semibold text-lien-ink">
            星評価
            <select name="rating" defaultValue="5" className="lien-input">
              {[5, 4, 3, 2, 1].map((rating) => (
                <option key={rating} value={rating}>
                  {rating}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-xs font-semibold text-lien-ink">
            投稿日
            <input name="submittedAt" type="date" defaultValue={today} className="lien-input" />
          </label>
        </div>
        <label className="grid gap-1.5 text-xs font-semibold text-lien-ink">
          コメント
          <textarea name="comment" rows={4} className="lien-input min-h-28 rounded-[18px]" placeholder="口コミコメントを入力" required />
        </label>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="grid gap-1.5 text-xs font-semibold text-lien-ink">
            良かった点
            <input name="goodPoints" className="lien-input" placeholder="手触り, 香り, まとまり" />
          </label>
          <label className="grid gap-1.5 text-xs font-semibold text-lien-ink">
            気になった点
            <input name="badPoints" className="lien-input" placeholder="価格, 香り" />
          </label>
          <label className="grid gap-1.5 text-xs font-semibold text-lien-ink">
            リピート意向
            <select name="repeatIntent" defaultValue="yes" className="lien-input">
              <option value="yes">はい</option>
              <option value="maybe">迷う</option>
              <option value="no">いいえ</option>
            </select>
          </label>
        </div>
        <button type="submit" className="lien-button-primary w-fit">
          <Plus className="h-4 w-4" />
          レビューを追加
        </button>
      </form>
    </details>
  );
}

async function ManufacturerProductReportView({ searchParams }: ManufacturerProductReportPageProps) {
  const session = await requireManufacturerReportAccess(searchParams?.manufacturer ?? null);
  const canEdit = session.role !== "MANUFACTURER";
  const manufacturer = session.role === "MANUFACTURER" ? session.manufacturerName ?? "" : searchParams?.manufacturer || "ミルボン";
  const selectedProductName = searchParams?.productName ?? "";
  const selectedCategory = searchParams?.category ?? "";
  const [manufacturerOptions, productNameOptions, categoryOptions, editorOptions] = await Promise.all([
    getManufacturerNames(session.organizationId),
    getManufacturerProductNames(manufacturer, session.organizationId),
    getManufacturerProductCategories(manufacturer, session.organizationId),
    canEdit
      ? getManufacturerReviewEditorOptions(manufacturer, session.organizationId)
      : Promise.resolve({ products: [], customers: [] })
  ]);
  const returnTo = buildReportHref({
    manufacturer,
    productName: selectedProductName,
    category: selectedCategory,
    from: searchParams?.from,
    to: searchParams?.to
  });
  const message = noticeMessage(searchParams?.notice);
  const visibleManufacturerOptions = manufacturerOptions.includes(manufacturer)
    ? manufacturerOptions
    : [manufacturer, ...manufacturerOptions];
  const visibleCategoryOptions = selectedCategory && !categoryOptions.includes(selectedCategory)
    ? [selectedCategory, ...categoryOptions]
    : categoryOptions;
  const report = await getManufacturerProductReport({
    manufacturer,
    organizationId: session.organizationId,
    productName: selectedProductName,
    category: selectedCategory,
    from: parseDate(searchParams?.from),
    to: parseDate(searchParams?.to),
    includeCustomerLinks: session.role !== "MANUFACTURER"
  });
  const allRatings = report.products.flatMap((product) =>
    product.reviews.map((review) => review.rating).filter((rating): rating is number => typeof rating === "number")
  );
  const reviewTotal = report.products.reduce((total, product) => total + product.reviewCount, 0);
  const overallAverage = average(allRatings);

  return (
    <div className="mx-auto grid max-w-7xl gap-6">
      <ProductWorkspaceTabs active="feedback" />

      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-2">
            <Star className="h-4 w-4" />
            Product Reviews
          </span>
        }
        title="メーカー向け商品レビュー"
        description="顧客台帳に紐づいた実レビューを、商品ごとに確認します。表示するのは氏名・年代・性別・星評価・コメントのみで、電話番号や顧客IDは表示しません。"
        visual={
          <BrandVisual
            variant="insights"
            className="h-full min-h-40"
            imageClassName="object-[76%_54%]"
            sizes="(max-width: 1023px) 100vw, 352px"
          />
        }
      />

      {message ? (
        <div className="fixed right-4 top-4 z-50 max-w-sm rounded-[22px] border border-[#cbdcc8] bg-white p-4 shadow-lien">
          <p className="text-sm font-semibold text-lien-ink">{message}</p>
          <p className="mt-1 text-xs leading-5 text-lien-muted">変更内容を保存し、画面を更新しました。</p>
          <Link href={returnTo} className="mt-3 inline-flex text-xs font-semibold text-[#8F4F42]">
            閉じる
          </Link>
        </div>
      ) : null}

      <LienCard as="div" className="p-4">
        <ManufacturerProductReportFilters
          manufacturer={manufacturer}
          manufacturerOptions={visibleManufacturerOptions}
          productName={selectedProductName}
          productNameOptions={productNameOptions}
          category={selectedCategory}
          categoryOptions={visibleCategoryOptions}
          from={searchParams?.from ?? ""}
          to={searchParams?.to ?? ""}
        />
      </LienCard>

      <section className="grid gap-3 md:grid-cols-4">
        <MetricCard icon={UserRound} label="回答者数" value={report.respondentCount} unit="人" tone="soft" />
        <MetricCard icon={Star} label="平均レビュー点数" value={formatAverage(overallAverage)} unit="/ 5.0" tone="premium" />
        <MetricCard icon={CalendarDays} label="レビュー回答数" value={reviewTotal} unit="件" tone="highlight" />
        <MetricCard icon={UsersRound} label="対象商品" value={report.products.length} unit="件" tone="success" />
      </section>

      <PieChart title="回答者の年齢層" slices={ageSlices(report)} />

      <section className="grid gap-5">
        {report.products.map((product) => (
          <article key={product.productId} className="rounded-[28px] border border-lien bg-lien-surface p-5 shadow-lien-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-semibold text-lien-muted">{product.category ?? "カテゴリ未設定"}</p>
                <h2 className="mt-1 text-xl font-semibold text-lien-ink">{product.productName}</h2>
              </div>
              <StatusBadge tone="success">顧客レビュー</StatusBadge>
            </div>

            {canEdit ? <div className="mt-4 grid gap-3">
              <NewReviewForm productId={product.productId} customers={editorOptions.customers} returnTo={returnTo} />
            </div> : null}

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[22px] border border-lien bg-lien-soft p-4">
                <p className="text-xs font-semibold text-lien-muted">平均レビュー点数</p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <span className="text-3xl font-semibold tabular-nums text-lien-ink">{formatAverage(product.averageRating)}</span>
                  <RatingStars rating={product.averageRating === null ? null : Math.round(product.averageRating)} />
                </div>
              </div>
              <div className="rounded-[22px] border border-lien bg-lien-soft p-4">
                <p className="text-xs font-semibold text-lien-muted">回答数</p>
                <p className="mt-2 text-3xl font-semibold tabular-nums text-lien-ink">{product.reviewCount}<span className="ml-1 text-base">件</span></p>
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              {product.reviews.length > 0 ? (
                product.reviews.map((review) => <ReviewCard key={review.reviewId} review={review} returnTo={returnTo} canEdit={canEdit} />)
              ) : (
                <div className="rounded-[22px] border border-dashed border-lien bg-white p-5 text-sm text-lien-muted">
                  まだレビューはありません。
                </div>
              )}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}

export default async function LegacyManufacturerProductReportPage({ searchParams }: ManufacturerProductReportPageProps) {
  return ManufacturerProductReportView({ searchParams });
}
