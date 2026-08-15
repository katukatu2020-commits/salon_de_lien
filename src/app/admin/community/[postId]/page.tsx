import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CommunityFeed } from "@/components/community/community-feed";
import { requireBackofficeSession } from "@/lib/auth/authorization";
import { loadVisitCommunityPostDetail } from "@/lib/community/visit-community";

export const dynamic = "force-dynamic";

export default async function AdminCommunityDetailPage({ params }: { params: { postId: string } }) {
  const session = await requireBackofficeSession(["ADMIN", "STAFF"]);
  if (!session.organizationId) return null;
  const post = await loadVisitCommunityPostDetail({
    organizationId: session.organizationId,
    currentUserId: session.userId,
    postId: params.postId
  });
  if (!post) notFound();

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-4">
      <Link href="/admin/community" className="inline-flex min-h-11 w-fit items-center gap-2 rounded-full border border-[#e8ded2] bg-white px-4 text-sm font-semibold shadow-sm transition hover:bg-[#f6efe6]">
        <ArrowLeft className="h-4 w-4" />スタイル一覧へ
      </Link>
      <CommunityFeed initialPosts={[post]} actor="staff" />
    </div>
  );
}
