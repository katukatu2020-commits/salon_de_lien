import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { getCurrentCustomerSession } from "@/lib/auth/current-customer";
import { hasValidRequestOrigin } from "@/lib/auth/request-security";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: { visitId: string } }) {
  if (!hasValidRequestOrigin(request)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const session = await getCurrentCustomerSession();
  if (!session) return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });

  const input = (await request.json().catch(() => null)) as { published?: unknown } | null;
  if (typeof input?.published !== "boolean") {
    return NextResponse.json({ error: "公開設定が正しくありません。" }, { status: 400 });
  }

  const visit = await prisma.visit.findFirst({
    where: {
      id: params.visitId,
      customerId: session.customerId,
      customer: { organizationId: session.organizationId, deletedAt: null }
    },
    select: { id: true, customerId: true, photos: { select: { id: true }, take: 1 } }
  });
  if (!visit) return NextResponse.json({ error: "来店履歴が見つかりません。" }, { status: 404 });
  if (input.published && visit.photos.length === 0) {
    return NextResponse.json({ error: "施術後写真がある履歴のみ共有できます。" }, { status: 400 });
  }

  const publishedAt = new Date();
  const post = await prisma.visitCommunityPost.upsert({
    where: { visitId: visit.id },
    update: {
      published: input.published,
      ...(input.published ? { publishedAt } : {}),
      aiCommentDueAt: null,
      aiCommentedAt: null
    },
    create: {
      organizationId: session.organizationId,
      customerId: session.customerId,
      visitId: visit.id,
      published: input.published,
      aiCommentDueAt: null,
      aiCommentedAt: null
    },
    select: { id: true, published: true }
  });

  revalidatePath("/u/history");
  revalidatePath("/u/community");
  revalidatePath("/admin/community");
  return NextResponse.json({ success: true, ...post });
}
