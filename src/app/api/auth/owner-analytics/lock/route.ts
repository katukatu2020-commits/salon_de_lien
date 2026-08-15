import { NextResponse } from "next/server";

export function POST() {
  return NextResponse.json({ error: "この認証経路は廃止されました。" }, { status: 410 });
}
