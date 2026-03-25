import { NextRequest, NextResponse } from "next/server";

export function GET(request: NextRequest) {
  const url = new URL("/dashboard", request.url);
  const response = NextResponse.redirect(url);
  response.cookies.set("demo_mode", "1", {
    path: "/",
    maxAge: 60 * 60 * 24, // 1 día
    httpOnly: false,
    sameSite: "lax",
  });
  return response;
}
