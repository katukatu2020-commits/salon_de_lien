import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { AuthorizationError, requireBackofficeSession } from "@/lib/auth/authorization";
import { hasValidRequestOrigin } from "@/lib/auth/request-security";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest, { params }: { params: { postId: string } }) {
  try {
    if (!hasValidRequestOrigin(request)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
    const session = await requireBackofficeSession(["ADMIN", "STAFF"]);
    if (!session.organizationId || !session.userId) {
      return NextResponse.json({ error: "スタッフアカウントでログインしてください。" }, { status: 403 });
    }
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
  } catch (error) {
    const status = error instanceof AuthorizationError ? error.status : 400;
    return NextResponse.json({ error: error instanceof Error ? error.message : "操作できませんでした。" }, { status });
  }
}
