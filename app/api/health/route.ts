import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    app: "ClinicFlow AI PH",
    status: "ok",
    timezone: "Asia/Manila",
    country: "Philippines"
  });
}
