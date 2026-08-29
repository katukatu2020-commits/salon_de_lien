import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { getCurrentCustomerSession } from "@/lib/auth/current-customer";
import { hasValidRequestOrigin } from "@/lib/auth/request-security";
import { communityDisplayName, normalizeCommunityComment } from "@/lib/community/visit-community";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest, { params }: { params: { postId: string } }) {
  if (!hasValidRequestOrigin(request)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const session = await getCurrentCustomerSession();
  if (!session) return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  const input = (await request.json().catch(() => null)) as { body?: unknown } | null;
  const body = normalizeCommunityComment(input?.body);
  if (!body) return NextResponse.json({ error: "コメントは300文字以内で入力してください。" }, { status: 400 });
  const post = await prisma.visitCommunityPost.findFirst({
    where: { id: params.postId, organizationId: session.organizationId, published: true },
    select: { id: true }
  });
  if (!post) return NextResponse.json({ error: "投稿が見つかりません。" }, { status: 404 });

  const comment = await prisma.visitCommunityComment.create({
    data: {
      postId: post.id,
      appUserId: session.userId,
      authorDisplayName: communityDisplayName(session.customer.name),
      authorRole: "CUSTOMER",
      body
    },
    select: { id: true, authorDisplayName: true, authorRole: true, isStylistComment: true, isAiAssistant: true, body: true, createdAt: true, updatedAt: true }
  });
  revalidatePath("/u/community");
  revalidatePath("/admin/community");
  return NextResponse.json({
    ...comment,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
    canEdit: true,
    canDelete: true
  }, { status: 201 });
}
