import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const READY_TIMEOUT_MS = 2_000;

async function checkDatabase() {
  await Promise.race([
    prisma.$queryRaw`SELECT 1`,
    new Promise<never>((_, reject) => {
      const timeout = setTimeout(() => reject(new Error("database readiness check timed out")), READY_TIMEOUT_MS);
      timeout.unref?.();
    })
  ]);
}

export async function GET() {
  try {
    await checkDatabase();
    return NextResponse.json(
      {
        ok: true,
        service: "salon-de-lien",
        status: "ready"
      },
      {
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );
  } catch {
    return NextResponse.json(
      {
        ok: false,
        service: "salon-de-lien",
        status: "not_ready"
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );
  }
}
