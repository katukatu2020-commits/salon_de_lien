import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Factory,
  PackageCheck,
  PackagePlus,
  Boxes,
  Tags
} from "lucide-react";
import { EmptyState, MetricCard, PageHeader } from "@/components/lien/lien-ui";
import { BrandVisual } from "@/components/lien/brand-visual";
import { ProductDeleteButton } from "@/components/products/product-delete-button";
import { ProductCreateDialog } from "@/components/products/product-create-dialog";
import { ProductEditDialog } from "@/components/products/product-edit-dialog";
import { ProductSalesAlert } from "@/components/products/product-sales-alert";
import { ProductWorkspaceTabs } from "@/components/products/product-workspace-tabs";
import ManufacturerProductReportView from "@/app/admin/reports/manufacturer-products/page";
import { createProductMasterAction, updateProductMasterAction } from "@/lib/actions/product-actions";
import { requireBackofficeSession } from "@/lib/auth/authorization";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type AdminProductsPageProps = {
  searchParams?: {
    section?: string;
    notice?: string;
    error?: string;
    edit?: string;
    manufacturer?: string;
    productName?: string;
    category?: string;
    from?: string;
    to?: string;
    focus?: string;
  };
};

const DEFAULT_CATEGORIES = [
  "シャンプー",
  "トリートメント",
  "スタイリング剤",
  "アウトバス",
  "その他"
];

const DEFAULT_TAGS = [
  "乾燥",
  "ダメージ",
  "カラー後",
  "ブリーチ",
  "広がり",
  "まとまり",
  "ツヤ",
  "うねり",
  "くせ",
  "頭皮",
  "敏感",
  "ボリューム",
  "香り",
  "セット力",
  "キープ",
  "ウェット感"
];

function uniqueSorted(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))).sort(
    (left, right) => left.localeCompare(right, "ja")
  );
}

function toStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item).trim()).filter(Boolean);
}

function noticeMessage(notice?: string, error?: string, focusedProductName?: string) {
  if (error === "product-not-found") {
    return {
      tone: "error" as const,
      title: "商品が見つかりませんでした。",
      description: "すでに削除された可能性があります。商品一覧を再読み込みしてください。"
    };
  }
  if (notice === "product-archived") {
    return {
      tone: "success" as const,
      title: "商品を提案候補から削除しました。",
      description: "過去の商品提案・レビュー履歴はそのまま保持されています。"
    };
  }
  if (notice === "product-deleted") {
    return {
      tone: "success" as const,
      title: "商品を削除しました。",
      description: "提案履歴のない商品を登録商品から完全に削除しました。"
    };
  }
  if (error === "product-exists") {
    return {
      tone: "error" as const,
      title: "同じメーカー・商品名がすでに登録されています。",
      description: "一覧で既存商品を確認してください。"
    };
  }
  if (notice === "product-reactivated") {
    return {
      tone: "success" as const,
      title: "同名商品を商品棚へ戻しました。",
      description: "価格と在庫を更新し、会計から選択できるようにしました。"
    };
  }
  if (notice === "product-created") {
    return {
      tone: "success" as const,
      title: focusedProductName ? `「${focusedProductName}」を追加しました。` : "商品を追加しました。",
      description: "商品棚へ登録し、会計の商品選択へ反映しました。追加した行を下で強調表示しています。"
    };
  }
  if (notice === "product-updated") {
    return {
      tone: "success" as const,
      title: "商品情報を更新しました。",
      description: "価格と在庫は会計の商品選択にも反映されています。"
    };
  }
  return null;
}

export default async function AdminProductsPage({ searchParams }: AdminProductsPageProps) {
  if (searchParams?.section === "feedback") {
    return <ManufacturerProductReportView searchParams={searchParams} />;
  }

  const session = await requireBackofficeSession(["ADMIN", "STAFF"]);
  if (!session.organizationId) throw new Error("店舗所属が設定されていません。");
  const salesWindowStart = new Date();
  salesWindowStart.setDate(salesWindowStart.getDate() - 90);
  const [productRows, purchaseTotals, recentPurchaseTotals] = await Promise.all([
    prisma.product.findMany({
      where: { organizationId: session.organizationId, active: true },
      orderBy: [{ manufacturerName: "asc" }, { name: "asc" }],
      select: {
        id: true,
        manufacturerName: true,
        name: true,
        category: true,
        retailPrice: true,
        stockQuantity: true,
        concernTags: true,
        description: true,
        alternativeRecommendation: true,
        _count: {
          select: {
            proposals: true
          }
        }
      }
    }),
    prisma.productSaleLine.groupBy({
      by: ["productId"],
      where: {
        product: {
          organizationId: session.organizationId,
          active: true
        }
      },
      _sum: { quantity: true }
    }),
    prisma.productSaleLine.groupBy({
      by: ["productId"],
      where: {
        createdAt: { gte: salesWindowStart },
        product: {
          organizationId: session.organizationId,
          active: true
        }
      },
      _sum: { quantity: true }
    })
  ]);
  const purchasedQuantityByProduct = new Map(
    purchaseTotals.map((row) => [row.productId, row._sum.quantity ?? 0])
  );
  const recentPurchasedQuantityByProduct = new Map(
    recentPurchaseTotals.map((row) => [row.productId, row._sum.quantity ?? 0])
  );
  const products = productRows.map((product) => ({
    ...product,
    purchaseCount: purchasedQuantityByProduct.get(product.id) ?? 0,
    recentPurchaseCount: recentPurchasedQuantityByProduct.get(product.id) ?? 0
  }));
  const manufacturerOptions = uniqueSorted(products.map((product) => product.manufacturerName));
  const tagOptions = uniqueSorted([
    ...DEFAULT_TAGS,
    ...products.flatMap((product) => toStringArray(product.concernTags))
  ]).slice(0, 24);
  const allTags = uniqueSorted(products.flatMap((product) => toStringArray(product.concernTags)));
  const totalStock = products.reduce((sum, product) => sum + product.stockQuantity, 0);
  const lowStockCount = products.filter((product) => product.stockQuantity <= 3).length;
  const slowSellerCount = products.filter((product) => product.recentPurchaseCount === 0).length;
  const focusedProduct = products.find((product) => product.id === searchParams?.focus);
  const message = noticeMessage(searchParams?.notice, searchParams?.error, focusedProduct?.name);

  return (
    <div className="mx-auto grid max-w-7xl gap-6">
      <ProductWorkspaceTabs active="catalog" />

      <PageHeader
        eyebrow="商品棚"
        title="商品・価格・在庫を管理"
        description="商品棚の価格と在庫を正本として管理します。会計では商品と個数を選ぶだけで金額へ反映されます。"
        primaryAction={
          <ProductCreateDialog
            action={createProductMasterAction}
            categories={DEFAULT_CATEGORIES}
            tagOptions={tagOptions}
          />
        }
        visual={
          <BrandVisual
            variant="products"
            className="h-full min-h-40"
            imageClassName="object-[58%_52%]"
            sizes="(max-width: 1023px) 100vw, 352px"
          />
        }
      />

      {message ? (
        <div
          className={`fixed inset-x-4 top-4 z-50 mx-auto max-w-md rounded-[22px] border bg-white p-4 shadow-[0_20px_60px_rgba(47,42,37,0.18)] sm:left-auto sm:right-6 sm:mx-0 ${
            message.tone === "error" ? "border-[#edc2bd]" : "border-[#cbdcc8]"
          }`}
          role="status"
        >
          <div className="flex gap-3">
            {message.tone === "error" ? (
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#884039]" />
            ) : (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#466349]" />
            )}
            <div>
              <p className="text-sm font-semibold text-lien-ink">{message.title}</p>
              <p className="mt-1 text-xs leading-5 text-lien-muted">{message.description}</p>
              <Link href="/admin/products#product-catalog" className="mt-3 inline-flex text-xs font-semibold text-lien-primary">
                閉じる
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={PackageCheck} label="商品数" value={products.length} unit="件" tone="success" />
        <MetricCard icon={Boxes} label="在庫合計" value={totalStock} unit="点" tone="soft" />
        <MetricCard icon={Factory} label="メーカー" value={manufacturerOptions.length} unit="社" tone="premium" />
        <MetricCard icon={Tags} label="在庫3点以下" value={lowStockCount} unit="商品" tone="highlight" helper={`登録タグ ${allTags.length}種類`} />
      </section>

      {slowSellerCount > 0 ? (
        <section
          className="flex flex-col gap-4 rounded-[22px] border border-[#e8a7a1] bg-[#fff3f1] p-4 shadow-[0_14px_34px_rgba(159,45,37,0.09)] sm:flex-row sm:items-center sm:justify-between sm:p-5"
          role="alert"
        >
          <div className="flex items-start gap-3">
            <span className="lien-sales-alert-lamp mt-0.5 h-9 w-9 shrink-0">
              <AlertTriangle className="h-5 w-5" strokeWidth={2.5} />
            </span>
            <div>
              <p className="font-semibold text-[#80231d]">販売フォローが必要な商品が {slowSellerCount} 件あります</p>
              <p className="mt-1 text-sm leading-6 text-[#7a4540]">
                赤い警告灯は直近90日の購入が0件の商品です。陳列場所、提案先、代替候補を見直してください。
              </p>
            </div>
          </div>
          <a href="#product-catalog" className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-[#9f2d25] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#80231d]">
            対象商品を確認
          </a>
        </section>
      ) : null}

      <section id="product-catalog" className="scroll-mt-24">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-lien-primary">商品カタログ</p>
            <h2 className="mt-1 text-xl font-semibold text-lien-ink">登録済みの商品</h2>
          </div>
          <p className="text-sm font-semibold tabular-nums text-lien-muted">{products.length}件</p>
        </div>

        {products.length > 0 ? (
          <>
            <div className="grid gap-3 md:hidden">
              {products.map((product) => {
                const tags = toStringArray(product.concernTags);
                const isSlowSeller = product.recentPurchaseCount === 0;
                return (
                  <article
                    key={product.id}
                    id={`product-${product.id}`}
                    className={`scroll-mt-28 rounded-[22px] border bg-white p-4 shadow-lien-sm transition ${
                      focusedProduct?.id === product.id
                        ? "border-[#8aa58a] bg-[#f7fbf5] ring-4 ring-[#dce8d9]"
                        : isSlowSeller
                          ? "border-[#e8a7a1] bg-[#fffafa]"
                          : "border-lien"
                    }`}
                  >
                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-lien-primary">{product.manufacturerName}</p>
                        <h3 className="mt-1 break-words text-base font-semibold text-lien-ink">{product.name}</h3>
                        <p className="mt-1 text-xs text-lien-muted">{product.category ?? "カテゴリ未設定"}</p>
                        <div className="mt-2 flex flex-wrap gap-2 text-sm font-semibold tabular-nums text-lien-ink">
                          <span>{product.retailPrice.toLocaleString("ja-JP")}円</span>
                          <span className={product.stockQuantity <= 3 ? "text-[#884039]" : "text-[#466349]"}>在庫 {product.stockQuantity}点</span>
                        </div>
                      </div>
                      <ProductSalesAlert recentPurchaseCount={product.recentPurchaseCount} compact />
                    </div>
                    {product.description ? <p className="mt-3 text-sm leading-6 text-lien-muted">{product.description}</p> : null}
                    {product.alternativeRecommendation ? (
                      <div className="mt-3 rounded-2xl bg-[#f6efe6] px-3 py-2.5">
                        <p className="text-[11px] font-semibold text-lien-primary">合わない場合の次候補</p>
                        <p className="mt-1 text-sm leading-6 text-lien-ink">{product.alternativeRecommendation}</p>
                      </div>
                    ) : null}
                    {tags.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {tags.map((tag) => (
                          <span key={tag} className="rounded-full bg-lien-soft px-2.5 py-1 text-xs font-semibold text-lien-muted">
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <div className="mt-4 flex min-h-12 flex-wrap items-center justify-between gap-3 border-t border-lien pt-3">
                      <div>
                        <p className="text-xs font-semibold text-lien-muted">購入数 {product.purchaseCount}点</p>
                        <p className={`mt-1 text-[11px] font-semibold ${isSlowSeller ? "text-[#9f2d25]" : "text-lien-muted"}`}>
                          直近90日 {product.recentPurchaseCount}点
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <ProductEditDialog
                          action={updateProductMasterAction}
                          product={{ ...product, concernTags: tags }}
                          categories={DEFAULT_CATEGORIES}
                          tagOptions={tagOptions}
                        />
                        <ProductDeleteButton
                          productId={product.id}
                          productName={product.name}
                          proposalCount={product._count.proposals}
                        />
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="hidden overflow-hidden rounded-[22px] border border-lien bg-white shadow-lien-sm md:block">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-lien text-sm">
                  <thead className="bg-lien-soft text-left text-xs font-semibold text-lien-muted">
                    <tr>
                      <th className="px-4 py-3">メーカー / 商品名</th>
                      <th className="px-4 py-3">カテゴリ</th>
                      <th className="px-4 py-3 text-right">店頭価格</th>
                      <th className="px-4 py-3 text-right">在庫</th>
                      <th className="px-4 py-3">悩み・効果タグ</th>
                      <th className="px-4 py-3 text-right">購入数</th>
                      <th className="px-4 py-3">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-lien">
                    {products.map((product) => {
                      const tags = toStringArray(product.concernTags);
                      const isSlowSeller = product.recentPurchaseCount === 0;
                      return (
                        <tr
                          key={product.id}
                          id={`product-${product.id}`}
                          className={`scroll-mt-28 align-top text-lien-muted transition hover:bg-[#fffaf6] ${
                            focusedProduct?.id === product.id
                              ? "bg-[#f2f8ef] ring-2 ring-inset ring-[#8aa58a]"
                              : isSlowSeller
                                ? "bg-[#fffafa] shadow-[inset_4px_0_0_#c3483f]"
                                : ""
                          }`}
                        >
                          <td className="max-w-md px-4 py-4">
                            <p className="text-xs font-semibold text-lien-primary">{product.manufacturerName}</p>
                            <p className="mt-1 font-semibold text-lien-ink">{product.name}</p>
                            <div className="mt-2">
                              <ProductSalesAlert recentPurchaseCount={product.recentPurchaseCount} compact />
                            </div>
                            {product.description ? <p className="mt-1 line-clamp-2 text-xs leading-5">{product.description}</p> : null}
                            {product.alternativeRecommendation ? (
                              <p className="mt-2 rounded-xl bg-[#f6efe6] px-2.5 py-2 text-xs leading-5 text-lien-ink">
                                <span className="font-semibold text-lien-primary">次候補: </span>
                                {product.alternativeRecommendation}
                              </p>
                            ) : null}
                          </td>
                          <td className="whitespace-nowrap px-4 py-4">{product.category ?? "-"}</td>
                          <td className="whitespace-nowrap px-4 py-4 text-right font-semibold tabular-nums text-lien-ink">
                            {product.retailPrice.toLocaleString("ja-JP")}円
                          </td>
                          <td className={`whitespace-nowrap px-4 py-4 text-right font-semibold tabular-nums ${product.stockQuantity <= 3 ? "text-[#884039]" : "text-[#466349]"}`}>{product.stockQuantity}点</td>
                          <td className="max-w-md px-4 py-4">
                            <div className="flex flex-wrap gap-1.5">
                              {tags.length > 0 ? (
                                tags.map((tag) => (
                                  <span key={tag} className="rounded-full bg-lien-soft px-2.5 py-1 text-xs font-semibold text-lien-muted">
                                    {tag}
                                  </span>
                                ))
                              ) : (
                                <span className="text-xs">未設定</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-right font-semibold tabular-nums text-lien-ink">
                            <p>{product.purchaseCount}<span className="ml-1 text-xs text-lien-muted">点</span></p>
                            <p className={`mt-1 whitespace-nowrap text-[11px] ${isSlowSeller ? "text-[#9f2d25]" : "text-lien-muted"}`}>
                              90日 {product.recentPurchaseCount}点
                            </p>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex gap-2">
                              <ProductEditDialog
                                action={updateProductMasterAction}
                                product={{ ...product, concernTags: tags }}
                                categories={DEFAULT_CATEGORIES}
                                tagOptions={tagOptions}
                              />
                              <ProductDeleteButton
                                productId={product.id}
                                productName={product.name}
                                proposalCount={product._count.proposals}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <EmptyState
            icon={PackagePlus}
            title="商品がまだ登録されていません"
            description="上の商品登録から、最初の商品を追加してください。"
            action={
              <ProductCreateDialog
                action={createProductMasterAction}
                categories={DEFAULT_CATEGORIES}
                tagOptions={tagOptions}
                buttonLabel="商品を追加"
              />
            }
          />
        )}
      </section>
    </div>
  );
}
