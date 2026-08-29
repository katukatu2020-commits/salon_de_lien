import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { AuthorizationError, requireBackofficeSession } from "@/lib/auth/authorization";
import { hasValidRequestOrigin } from "@/lib/auth/request-security";
import { normalizeCommunityComment } from "@/lib/community/visit-community";
import { prisma } from "@/lib/prisma";

function revalidateCommunity(postId: string) {
  revalidatePath("/admin/community");
  revalidatePath(`/admin/community/${postId}`);
  revalidatePath("/u/community");
  revalidatePath(`/u/community/${postId}`);
}

async function getOwnedComment(postId: string, commentId: string, organizationId: string, userId: string) {
  return prisma.visitCommunityComment.findFirst({
    where: {
      id: commentId,
      postId,
      appUserId: userId,
      deletedAt: null,
      post: { organizationId, published: true }
    },
    select: { id: true, postId: true }
  });
}

export async function PATCH(request: NextRequest, { params }: { params: { postId: string; commentId: string } }) {
  try {
    if (!hasValidRequestOrigin(request)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
    const session = await requireBackofficeSession(["ADMIN", "STAFF"]);
    if (!session.organizationId || !session.userId) return NextResponse.json({ error: "スタッフアカウントでログインしてください。" }, { status: 403 });
    const input = (await request.json().catch(() => null)) as { body?: unknown } | null;
    const body = normalizeCommunityComment(input?.body);
    if (!body) return NextResponse.json({ error: "コメントは300文字以内で入力してください。" }, { status: 400 });
    const comment = await getOwnedComment(params.postId, params.commentId, session.organizationId, session.userId);
    if (!comment) return NextResponse.json({ error: "編集できるコメントが見つかりません。" }, { status: 404 });

    const updated = await prisma.visitCommunityComment.update({
      where: { id: comment.id },
      data: { body },
      select: { id: true, body: true, updatedAt: true }
    });
    revalidateCommunity(comment.postId);
    return NextResponse.json({ ...updated, updatedAt: updated.updatedAt.toISOString() });
  } catch (error) {
    const status = error instanceof AuthorizationError ? error.status : 400;
    return NextResponse.json({ error: error instanceof Error ? error.message : "コメントを更新できませんでした。" }, { status });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { postId: string; commentId: string } }) {
  try {
    if (!hasValidRequestOrigin(request)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
    const session = await requireBackofficeSession(["ADMIN", "STAFF"]);
    if (!session.organizationId || !session.userId) return NextResponse.json({ error: "スタッフアカウントでログインしてください。" }, { status: 403 });
    const comment = await getOwnedComment(params.postId, params.commentId, session.organizationId, session.userId);
    if (!comment) return NextResponse.json({ error: "削除できるコメントが見つかりません。" }, { status: 404 });

    await prisma.visitCommunityComment.update({ where: { id: comment.id }, data: { deletedAt: new Date() } });
    revalidateCommunity(comment.postId);
    return NextResponse.json({ success: true });
  } catch (error) {
    const status = error instanceof AuthorizationError ? error.status : 400;
    return NextResponse.json({ error: error instanceof Error ? error.message : "コメントを削除できませんでした。" }, { status });
  }
}
