import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: {
    code: string;
  };
};

export async function POST(request: NextRequest, { params }: RouteContext) {
  void request;
  return NextResponse.json(
    {
      error: "紹介からの新規登録はSMS認証が必要です。お客様アプリの新規登録画面をご利用ください。",
      registrationUrl: `/u/register?source=${encodeURIComponent("紹介")}&referrer=${encodeURIComponent(params.code)}`
    },
    { status: 410 }
  );
}
