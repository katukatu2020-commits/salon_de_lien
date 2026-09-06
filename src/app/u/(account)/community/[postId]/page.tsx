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
    currentCustomerId: session.customerId,
    actor: "customer",
    postId: params.postId
  });
  if (!post) notFound();

  return (
    <div className="community-detail-page mx-auto flex w-full max-w-3xl flex-col gap-4">
      <CommunityFeed initialPosts={[post]} actor="customer" />
    </div>
  );
}
