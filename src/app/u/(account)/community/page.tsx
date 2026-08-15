import { CommunityFilters } from "@/components/community/community-filters";
import { CommunityStyleGrid } from "@/components/community/community-style-grid";
import { CustomerVisualHeader } from "@/components/lien/brand-visual";
import { getCurrentCustomerSession } from "@/lib/auth/current-customer";
import { loadVisitCommunityPostList, parseCommunityListFilters } from "@/lib/community/visit-community";

export const dynamic = "force-dynamic";

export default async function CustomerCommunityPage({
  searchParams
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const session = await getCurrentCustomerSession();
  if (!session) return null;
  const filters = parseCommunityListFilters(searchParams);
  const result = await loadVisitCommunityPostList({ organizationId: session.organizationId, filters });

  return (
    <div className="grid gap-5">
      <CustomerVisualHeader
        variant="history"
        eyebrow="Style community"
        title="みんなのスタイル"
        description="気になる写真を選ぶと、施術内容やコメントをご覧いただけます。"
        imageClassName="object-[50%_38%]"
      />
      <CommunityFilters filters={result.filters} {...result.options} />
      <CommunityStyleGrid result={result} detailBasePath="/u/community" />
    </div>
  );
}
