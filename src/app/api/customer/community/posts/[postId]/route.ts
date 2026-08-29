import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { getCurrentCustomerSession } from "@/lib/auth/current-customer";
import { hasValidRequestOrigin } from "@/lib/auth/request-security";
import { normalizeCommunityCaption } from "@/lib/community/visit-community";
import { prisma } from "@/lib/prisma";

function revalidateCommunity(postId: string) {
  revalidatePath("/admin/community");
  revalidatePath(`/admin/community/${postId}`);
  revalidatePath("/u/community");
  revalidatePath(`/u/community/${postId}`);
  revalidatePath("/u/history");
}

export async function PATCH(request: NextRequest, { params }: { params: { postId: string } }) {
  if (!hasValidRequestOrigin(request)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const session = await getCurrentCustomerSession();
  if (!session) return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  const input = (await request.json().catch(() => null)) as { caption?: unknown } | null;
  const caption = normalizeCommunityCaption(input?.caption);
  if (caption === null && input?.caption !== "") {
    return NextResponse.json({ error: "投稿文は300文字以内で入力してください。" }, { status: 400 });
  }
  const post = await prisma.visitCommunityPost.findFirst({
    where: {
      id: params.postId,
      organizationId: session.organizationId,
      customerId: session.customerId,
      postKind: "VISIT",
      published: true
    },
    select: { id: true }
  });
  if (!post) return NextResponse.json({ error: "編集できる投稿が見つかりません。" }, { status: 404 });

  const updated = await prisma.visitCommunityPost.update({
    where: { id: post.id },
    data: { caption: caption || null },
    select: { id: true, caption: true, updatedAt: true }
  });
  revalidateCommunity(post.id);
  return NextResponse.json({ ...updated, updatedAt: updated.updatedAt.toISOString() });
}

export async function DELETE(request: NextRequest, { params }: { params: { postId: string } }) {
  if (!hasValidRequestOrigin(request)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const session = await getCurrentCustomerSession();
  if (!session) return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  const post = await prisma.visitCommunityPost.findFirst({
    where: {
      id: params.postId,
      organizationId: session.organizationId,
      customerId: session.customerId,
      postKind: "VISIT",
      published: true
    },
    select: { id: true }
  });
  if (!post) return NextResponse.json({ error: "削除できる投稿が見つかりません。" }, { status: 404 });

  await prisma.visitCommunityPost.update({ where: { id: post.id }, data: { published: false } });
  revalidateCommunity(post.id);
  return NextResponse.json({ success: true });
}
