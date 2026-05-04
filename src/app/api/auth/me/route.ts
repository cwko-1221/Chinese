import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  const user = await getSessionUser();
  return NextResponse.json({
    user: user
      ? {
          id: user.id,
          loginId: user.login_id,
          displayName: user.display_name,
          role: user.role,
        }
      : null,
  });
}
