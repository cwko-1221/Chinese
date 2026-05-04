import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";

const createSchema = z.object({
  name: z.string().trim().min(1),
});

export async function GET() {
  try {
    const teacher = await requireRole("teacher");
    const { data } = await db()
      .from("ncs_classes")
      .select("*")
      .eq("teacher_id", teacher.id)
      .order("created_at");
    return NextResponse.json({ classes: data ?? [] });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const teacher = await requireRole("teacher");
    const body = createSchema.parse(await request.json());
    const { data, error } = await db()
      .from("ncs_classes")
      .insert({ teacher_id: teacher.id, name: body.name })
      .select("*")
      .single();
    if (error) throw error;
    return NextResponse.json({ classRoom: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create class";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
