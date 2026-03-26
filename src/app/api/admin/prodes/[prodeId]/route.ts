import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { deleteProde } from "@/lib/supabase/admin-queries";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ prodeId: string }> },
) {
  const cookieStore = await cookies();
  if (!isAdminAuthenticated(cookieStore)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { prodeId } = await params;
  const { error } = await deleteProde(prodeId);
  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json({ ok: true });
}
