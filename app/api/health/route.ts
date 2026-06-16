import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    app: "Book Clinic PH",
    status: "ok",
    timezone: "Asia/Manila",
    country: "Philippines"
  });
}
