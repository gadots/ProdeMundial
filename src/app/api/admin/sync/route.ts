import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { headers } from "next/headers";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { syncMatches } from "@/lib/sync-matches";

export async function POST() {
  // Accept either admin cookie (manual button) or CRON_SECRET Bearer token (GitHub Actions)
  const headerStore = await headers();
  const auth = headerStore.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const validBearer = cronSecret && auth === `Bearer ${cronSecret}`;

  if (!validBearer) {
    const cookieStore = await cookies();
    if (!isAdminAuthenticated(cookieStore)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const result = await syncMatches();
    if (result.error) {
      return NextResponse.json(result, { status: 500 });
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error("admin/sync exception:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
