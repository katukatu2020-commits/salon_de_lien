import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { getCurrentCustomerSession } from "@/lib/auth/current-customer";
import { hasValidRequestOrigin } from "@/lib/auth/request-security";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest, { params }: { params: { postId: string } }) {
  if (!hasValidRequestOrigin(request)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const session = await getCurrentCustomerSession();
  if (!session) return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  const post = await prisma.visitCommunityPost.findFirst({
    where: { id: params.postId, organizationId: session.organizationId, published: true },
    select: { id: true }
  });
  if (!post) return NextResponse.json({ error: "投稿が見つかりません。" }, { status: 404 });

  const existing = await prisma.visitCommunityLike.findUnique({
    where: { postId_appUserId: { postId: post.id, appUserId: session.userId } },
    select: { id: true }
  });
  if (existing) {
    await prisma.visitCommunityLike.delete({ where: { id: existing.id } });
  } else {
    await prisma.visitCommunityLike.create({ data: { postId: post.id, appUserId: session.userId } });
  }
  const likeCount = await prisma.visitCommunityLike.count({ where: { postId: post.id } });
  revalidatePath("/u/community");
  revalidatePath("/admin/community");
  return NextResponse.json({ liked: !existing, likeCount });
}
