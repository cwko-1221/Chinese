import { NextResponse } from "next/server";
import { z } from "zod";
import { hashPassword, requireRole } from "@/lib/auth";
import { db } from "@/lib/db";

const createTeacherSchema = z.object({
  loginId: z.string().trim().min(1),
  displayName: z.string().trim().min(1),
  password: z.string().min(4),
});

export async function POST(request: Request) {
  try {
    await requireRole("teacher");
    const body = createTeacherSchema.parse(await request.json());
    const { data, error } = await db()
      .from("ncs_users")
      .insert({
        login_id: body.loginId,
        display_name: body.displayName,
        password_hash: await hashPassword(body.password),
        role: "teacher",
      })
      .select("id,login_id,display_name,role")
      .single();
    if (error) throw error;
    return NextResponse.json({ teacher: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create teacher";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
