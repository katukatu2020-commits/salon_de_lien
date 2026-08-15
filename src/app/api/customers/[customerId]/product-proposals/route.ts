import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createProductReviewRequestRecord,
  parseStringArray,
  PRODUCT_PROPOSAL_REACTIONS,
  PRODUCT_PROPOSAL_STATUSES
} from "@/lib/products/product-review";
import { requireCustomerAccess } from "@/lib/auth/authorization";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: {
    customerId: string;
  };
};

function normalizeStatus(value: unknown) {
  return typeof value === "string" && (PRODUCT_PROPOSAL_STATUSES as readonly string[]).includes(value)
    ? value
    : "proposed";
}

function normalizeReaction(value: unknown) {
  return typeof value === "string" && (PRODUCT_PROPOSAL_REACTIONS as readonly string[]).includes(value)
    ? value
    : null;
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const { session } = await requireCustomerAccess(params.customerId);
  const body = (await request.json()) as Record<string, unknown>;
  const productId = typeof body.productId === "string" ? body.productId : "";

  if (!productId) {
    return NextResponse.json({ error: "productId is required" }, { status: 400 });
  }

  const [customer, product] = await Promise.all([
    prisma.customer.findFirst({
      where: {
        id: params.customerId,
        organizationId: session.organizationId ?? undefined,
        deletedAt: null
      },
      select: { id: true }
    }),
    prisma.product.findFirst({
      where: {
        id: productId,
        organizationId: session.organizationId ?? undefined,
        active: true
      },
      select: { id: true }
    })
  ]);

  if (!customer) {
    return NextResponse.json({ error: "customer not found" }, { status: 404 });
  }

  if (!product) {
    return NextResponse.json({ error: "product not found" }, { status: 404 });
  }

  const status = normalizeStatus(body.status);
  const reaction = normalizeReaction(body.reaction);
  const purchased = status === "purchased" || reaction === "purchased";
  const { proposal, reviewRequest } = await prisma.$transaction(async (tx) => {
    const createdProposal = await tx.productProposal.create({
      data: {
        customerId: customer.id,
        productId: product.id,
        visitId: typeof body.visitId === "string" && body.visitId ? body.visitId : null,
        staffId: typeof body.staffId === "string" && body.staffId ? body.staffId : null,
        proposalReason: typeof body.proposalReason === "string" && body.proposalReason.trim() ? body.proposalReason.trim() : null,
        concernTags: parseStringArray(body.concernTags).slice(0, 8),
        status,
        reaction,
        purchased,
        note: typeof body.note === "string" && body.note.trim() ? body.note.trim() : null
      },
      select: {
        id: true,
        productId: true,
        proposalReason: true,
        concernTags: true,
        status: true,
        reaction: true,
        purchased: true,
        note: true,
        createdAt: true,
        visit: { select: { visitedAt: true } }
      }
    });
    const createdReviewRequest = purchased
      ? await createProductReviewRequestRecord({
          db: tx,
          proposal: createdProposal,
          visitAt: createdProposal.visit?.visitedAt ?? createdProposal.createdAt
        })
      : null;

    return { proposal: createdProposal, reviewRequest: createdReviewRequest };
  });

  return NextResponse.json({ proposal, reviewRequest }, { status: 201 });
}
