import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CommunityFeed } from "@/components/community/community-feed";
import { getCurrentCustomerSession } from "@/lib/auth/current-customer";
import { loadVisitCommunityPostDetail } from "@/lib/community/visit-community";

export const dynamic = "force-dynamic";

export default async function CustomerCommunityDetailPage({ params }: { params: { postId: string } }) {
  const session = await getCurrentCustomerSession();
  if (!session) return null;
  const post = await loadVisitCommunityPostDetail({
    organizationId: session.organizationId,
    currentUserId: session.userId,
    postId: params.postId
  });
  if (!post) notFound();

  return (
    <div className="community-detail-page mx-auto flex w-full max-w-3xl flex-col gap-4">
      <Link href="/u/community" className="inline-flex min-h-11 w-fit items-center gap-2 rounded-full border border-[#e8ded2] bg-white px-4 text-sm font-semibold shadow-sm transition hover:bg-[#f6efe6]">
        <ArrowLeft className="h-4 w-4" />スタイル一覧へ
      </Link>
      <CommunityFeed initialPosts={[post]} actor="customer" />
    </div>
  );
}
