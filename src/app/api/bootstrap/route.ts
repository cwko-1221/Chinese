import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

const schema = z.object({
  loginId: z.string().trim().min(1),
  displayName: z.string().trim().min(1),
  password: z.string().min(6),
});

export async function POST(request: Request) {
  const body = schema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: "Invalid bootstrap payload" }, { status: 400 });
  }

  const client = db();
  const { data: existing } = await client.from("ncs_users").select("id").eq("role", "teacher").limit(1);
  if (existing?.length) {
    return NextResponse.json({ error: "Teacher already exists" }, { status: 409 });
  }

  const passwordHash = await hashPassword(body.data.password);
  const { data, error } = await client
    .from("ncs_users")
    .insert({
      login_id: body.data.loginId,
      display_name: body.data.displayName,
      password_hash: passwordHash,
      role: "teacher",
    })
    .select("id,login_id,display_name,role")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ user: data });
}
