import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { setSession, verifyPassword } from "@/lib/auth";

const schema = z.object({
  loginId: z.string().trim().min(1),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  const body = schema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: "請輸入帳號和密碼" }, { status: 400 });
  }

  const { data: user } = await db()
    .from("ncs_users")
    .select("id,login_id,display_name,password_hash,role")
    .eq("login_id", body.data.loginId)
    .maybeSingle();

  if (!user || !(await verifyPassword(body.data.password, user.password_hash))) {
    return NextResponse.json({ error: "帳號或密碼不正確" }, { status: 401 });
  }

  await setSession({
    id: user.id,
    login_id: user.login_id,
    display_name: user.display_name,
    role: user.role,
  });

  return NextResponse.json({
    user: {
      id: user.id,
      loginId: user.login_id,
      displayName: user.display_name,
      role: user.role,
    },
  });
}
