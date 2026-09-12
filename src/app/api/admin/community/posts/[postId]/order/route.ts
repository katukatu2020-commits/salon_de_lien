import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { AuthorizationError, requireBackofficeSession } from "@/lib/auth/authorization";
import { hasValidRequestOrigin } from "@/lib/auth/request-security";
import { CommunityOrderError, moveCommunityPost } from "@/lib/community/style-post-order";

export async function PATCH(request: NextRequest, { params }: { params: { postId: string } }) {
  try {
    if (!hasValidRequestOrigin(request)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
    const session = await requireBackofficeSession(["ADMIN", "STAFF"]);
    if (!session.organizationId) return NextResponse.json({ error: "店舗所属を確認できません。" }, { status: 403 });
    const input = await request.json().catch(() => null) as { displayOrder?: unknown } | null;
    const result = await moveCommunityPost(session.organizationId, params.postId, Number(input?.displayOrder));
    revalidatePath("/admin/community");
    revalidatePath("/u/community");
    return NextResponse.json(result);
  } catch (error) {
    const status = error instanceof CommunityOrderError || error instanceof AuthorizationError ? error.status : 400;
    return NextResponse.json({ error: error instanceof Error ? error.message : "表示順を変更できませんでした。" }, { status });
  }
}
