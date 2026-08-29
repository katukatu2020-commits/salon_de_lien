import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { AuthorizationError, requireBackofficeSession } from "@/lib/auth/authorization";
import { hasValidRequestOrigin } from "@/lib/auth/request-security";
import { normalizeCommunityComment } from "@/lib/community/visit-community";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest, { params }: { params: { postId: string } }) {
  try {
    if (!hasValidRequestOrigin(request)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
    const session = await requireBackofficeSession(["ADMIN", "STAFF"]);
    if (!session.organizationId || !session.userId) {
      return NextResponse.json({ error: "スタッフアカウントでログインしてください。" }, { status: 403 });
    }
    const input = (await request.json().catch(() => null)) as { body?: unknown } | null;
    const body = normalizeCommunityComment(input?.body);
    if (!body) return NextResponse.json({ error: "コメントは300文字以内で入力してください。" }, { status: 400 });
    const [post, appUser] = await Promise.all([
      prisma.visitCommunityPost.findFirst({
        where: { id: params.postId, organizationId: session.organizationId, published: true },
        select: { id: true }
      }),
      prisma.appUser.findFirst({
        where: { id: session.userId, organizationId: session.organizationId, active: true },
        select: { displayName: true }
      })
    ]);
    if (!post) return NextResponse.json({ error: "投稿が見つかりません。" }, { status: 404 });

    const comment = await prisma.visitCommunityComment.create({
      data: {
        postId: post.id,
        appUserId: session.userId,
        authorDisplayName: appUser?.displayName?.trim() || (session.role === "ADMIN" ? "店舗スタッフ" : "スタイリスト"),
        authorRole: session.role,
        isStylistComment: true,
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
  } catch (error) {
    const status = error instanceof AuthorizationError ? error.status : 400;
    return NextResponse.json({ error: error instanceof Error ? error.message : "コメントを保存できませんでした。" }, { status });
  }
}
