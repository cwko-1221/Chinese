import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const student = await requireRole("student");
    const client = db();
    const { data: memberships, error: membershipError } = await client
      .from("ncs_class_students")
      .select("class_id,ncs_classes(id,name)")
      .eq("student_id", student.id);
    if (membershipError) throw membershipError;

    const classIds = (memberships ?? []).map((item) => item.class_id);
    if (classIds.length === 0) return NextResponse.json({ assignments: [] });

    const { data: assignments, error } = await client
      .from("ncs_assignments")
      .select("*,ncs_assignment_items(*),ncs_attempts(id,status,score,completed_at)")
      .in("class_id", classIds)
      .eq("status", "published")
      .eq("ncs_attempts.student_id", student.id)
      .order("created_at", { ascending: false })
      .order("order_index", { referencedTable: "ncs_assignment_items" });
    if (error) throw error;

    return NextResponse.json({ assignments: assignments ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load assignments";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
