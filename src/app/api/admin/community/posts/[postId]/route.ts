import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { AuthorizationError, requireBackofficeSession } from "@/lib/auth/authorization";
import { hasValidRequestOrigin } from "@/lib/auth/request-security";
import { normalizeCommunityCaption } from "@/lib/community/visit-community";
import { prisma } from "@/lib/prisma";

function revalidateCommunity(postId: string) {
  revalidatePath("/admin/community");
  revalidatePath(`/admin/community/${postId}`);
  revalidatePath("/u/community");
  revalidatePath(`/u/community/${postId}`);
}

async function getOwnedStorePost(postId: string, organizationId: string) {
  return prisma.visitCommunityPost.findFirst({
    where: { id: postId, organizationId, postKind: "STORE", published: true },
    select: { id: true }
  });
}

export async function PATCH(request: NextRequest, { params }: { params: { postId: string } }) {
  try {
    if (!hasValidRequestOrigin(request)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
    const session = await requireBackofficeSession(["ADMIN", "STAFF"]);
    if (!session.organizationId) return NextResponse.json({ error: "店舗所属が設定されていません。" }, { status: 403 });
    const input = (await request.json().catch(() => null)) as { caption?: unknown } | null;
    const caption = normalizeCommunityCaption(input?.caption);
    if (caption === null && input?.caption !== "") {
      return NextResponse.json({ error: "投稿文は300文字以内で入力してください。" }, { status: 400 });
    }
    const post = await getOwnedStorePost(params.postId, session.organizationId);
    if (!post) return NextResponse.json({ error: "編集できる店舗投稿が見つかりません。" }, { status: 404 });

    const updated = await prisma.visitCommunityPost.update({
      where: { id: post.id },
      data: { caption: caption || null },
      select: { id: true, caption: true, updatedAt: true }
    });
    revalidateCommunity(post.id);
    return NextResponse.json({ ...updated, updatedAt: updated.updatedAt.toISOString() });
  } catch (error) {
    const status = error instanceof AuthorizationError ? error.status : 400;
    return NextResponse.json({ error: error instanceof Error ? error.message : "投稿を更新できませんでした。" }, { status });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { postId: string } }) {
  try {
    if (!hasValidRequestOrigin(request)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
    const session = await requireBackofficeSession(["ADMIN", "STAFF"]);
    if (!session.organizationId) return NextResponse.json({ error: "店舗所属が設定されていません。" }, { status: 403 });
    const post = await getOwnedStorePost(params.postId, session.organizationId);
    if (!post) return NextResponse.json({ error: "削除できる店舗投稿が見つかりません。" }, { status: 404 });

    await prisma.visitCommunityPost.update({ where: { id: post.id }, data: { published: false } });
    revalidateCommunity(post.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    const status = error instanceof AuthorizationError ? error.status : 400;
    return NextResponse.json({ error: error instanceof Error ? error.message : "投稿を削除できませんでした。" }, { status });
  }
}
