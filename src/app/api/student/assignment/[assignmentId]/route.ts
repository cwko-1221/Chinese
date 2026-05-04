import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";

type Params = Promise<{ assignmentId: string }>;

export async function GET(_request: Request, { params }: { params: Params }) {
  try {
    const student = await requireRole("student");
    const { assignmentId } = await params;
    const client = db();

    const { data: assignment, error } = await client
      .from("ncs_assignments")
      .select("*,ncs_assignment_items(*)")
      .eq("id", assignmentId)
      .eq("status", "published")
      .order("order_index", { referencedTable: "ncs_assignment_items" })
      .maybeSingle();
    if (error) throw error;
    if (!assignment) throw new Error("Assignment not found.");

    const { data: membership } = await client
      .from("ncs_class_students")
      .select("id")
      .eq("class_id", assignment.class_id)
      .eq("student_id", student.id)
      .maybeSingle();
    if (!membership) throw new Error("Forbidden.");

    return NextResponse.json({ assignment });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load assignment";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
