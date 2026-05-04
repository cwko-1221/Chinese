import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { normalizeAssignmentItems, publishAssignmentSchema } from "@/lib/assignment";

export async function GET() {
  try {
    const teacher = await requireRole("teacher");
    const { data, error } = await db()
      .from("ncs_assignments")
      .select("*,ncs_assignment_items(*)")
      .eq("created_by", teacher.id)
      .order("created_at", { ascending: false })
      .order("order_index", { referencedTable: "ncs_assignment_items" });
    if (error) throw error;
    return NextResponse.json({ assignments: data ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load assignments";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const teacher = await requireRole("teacher");
    const body = publishAssignmentSchema.parse(await request.json());
    const client = db();

    const { data: classRoom } = await client
      .from("ncs_classes")
      .select("id")
      .eq("id", body.classId)
      .eq("teacher_id", teacher.id)
      .maybeSingle();
    if (!classRoom) throw new Error("Class not found.");

    const { data: assignment, error } = await client
      .from("ncs_assignments")
      .insert({
        class_id: body.classId,
        title: body.title,
        status: "published",
        created_by: teacher.id,
      })
      .select("*")
      .single();
    if (error) throw error;

    const rows = normalizeAssignmentItems(body.items).map((item) => ({
      ...item,
      assignment_id: assignment.id,
    }));
    const { error: itemError } = await client.from("ncs_assignment_items").insert(rows);
    if (itemError) throw itemError;

    return NextResponse.json({ assignment });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to publish assignment";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
