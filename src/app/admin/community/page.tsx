import { CommunityFilters } from "@/components/community/community-filters";
import { CommunityStyleGrid } from "@/components/community/community-style-grid";
import { BrandVisual } from "@/components/lien/brand-visual";
import { PageHeader } from "@/components/lien/lien-ui";
import { requireBackofficeSession } from "@/lib/auth/authorization";
import { loadVisitCommunityPostList, parseCommunityListFilters } from "@/lib/community/visit-community";

export const dynamic = "force-dynamic";

export default async function AdminCommunityPage({
  searchParams
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const session = await requireBackofficeSession(["ADMIN", "STAFF"]);
  if (!session.organizationId) return null;
  const filters = parseCommunityListFilters(searchParams);
  const result = await loadVisitCommunityPostList({ organizationId: session.organizationId, filters });

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Style Community"
        title="スタイル共有"
        description="写真からスタイルを探し、詳細画面で反応やコメントを確認します。"
        visual={<BrandVisual variant="insights" className="h-full min-h-40" imageClassName="object-[50%_32%]" sizes="360px" />}
      />
      <CommunityFilters filters={result.filters} {...result.options} />
      <CommunityStyleGrid result={result} detailBasePath="/admin/community" />
    </div>
  );
}
