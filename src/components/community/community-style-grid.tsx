import { ChevronLeft, ChevronRight, Images, Sparkles } from "lucide-react";
import Link from "next/link";
import type { CommunityListResult } from "@/lib/community/visit-community";

function pageHref(basePath: string, result: CommunityListResult, page: number) {
  const params = new URLSearchParams();
  if (result.filters.sort !== "latest") params.set("sort", result.filters.sort);
  if (result.filters.stylist) params.set("stylist", result.filters.stylist);
  if (result.filters.course) params.set("course", result.filters.course);
  if (result.filters.gender) params.set("gender", result.filters.gender);
  if (result.filters.age !== "all") params.set("age", result.filters.age);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function CommunityStyleGrid({
  result,
  detailBasePath
}: {
  result: CommunityListResult;
  detailBasePath: string;
}) {
  if (result.posts.length === 0) {
    return (
      <div className="rounded-[20px] border border-dashed border-[#d8cbbf] bg-white px-5 py-14 text-center">
        <Sparkles className="mx-auto h-7 w-7 text-[#8f4f42]" />
        <p className="mt-3 text-sm font-semibold">条件に合うスタイルはありません</p>
        <p className="mt-2 text-xs leading-5 text-[#7c7168]">絞り込みを変更するか、公開された施術後写真をお待ちください。</p>
      </div>
    );
  }

  const first = (result.page - 1) * 50 + 1;
  const last = Math.min(result.page * 50, result.totalCount);
  return (
    <section className="grid gap-4">
      <div className="flex items-center justify-between gap-3 text-xs text-[#7c7168]">
        <span className="inline-flex items-center gap-1.5"><Images className="h-4 w-4" />{result.totalCount}件</span>
        <span>{first}〜{last}件を表示</span>
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
        {result.posts.map((post) => (
          <Link
            key={post.id}
            href={`${detailBasePath}/${post.id}`}
            className="group relative aspect-[4/5] min-w-0 overflow-hidden rounded-xl bg-[#eee7df] shadow-[0_10px_28px_rgba(47,42,37,0.08)] outline-none transition hover:-translate-y-0.5 hover:shadow-[0_16px_35px_rgba(47,42,37,0.12)] focus-visible:ring-4 focus-visible:ring-[#e9c9be] motion-reduce:transform-none motion-reduce:transition-none sm:rounded-[20px]"
            aria-label="スタイル詳細を開く"
          >
            <span className="absolute inset-0 bg-cover bg-center transition duration-300 group-hover:scale-[1.025] motion-reduce:transition-none" style={{ backgroundImage: `url(${post.coverPhotoUrl})` }} />
            <span className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-white/5" />
          </Link>
        ))}
      </div>
      {result.totalPages > 1 ? (
        <nav className="mt-2 flex items-center justify-center gap-3" aria-label="スタイル一覧のページ">
          {result.page > 1 ? (
            <Link href={pageHref(detailBasePath, result, result.page - 1)} className="inline-flex h-11 items-center gap-1 rounded-full border border-[#e8ded2] bg-white px-4 text-sm font-semibold shadow-sm hover:bg-[#f6efe6]"><ChevronLeft className="h-4 w-4" />前へ</Link>
          ) : <span className="h-11 w-[84px]" />}
          <span className="min-w-20 text-center text-sm font-semibold tabular-nums">{result.page} / {result.totalPages}</span>
          {result.page < result.totalPages ? (
            <Link href={pageHref(detailBasePath, result, result.page + 1)} className="inline-flex h-11 items-center gap-1 rounded-full border border-[#e8ded2] bg-white px-4 text-sm font-semibold shadow-sm hover:bg-[#f6efe6]">次へ<ChevronRight className="h-4 w-4" /></Link>
          ) : <span className="h-11 w-[84px]" />}
        </nav>
      ) : null}
    </section>
  );
}
