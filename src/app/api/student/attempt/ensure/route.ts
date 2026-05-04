import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";

const schema = z.object({ assignmentId: z.string().uuid() });

export async function POST(request: Request) {
  try {
    const student = await requireRole("student");
    const { assignmentId } = schema.parse(await request.json());
    const client = db();

    const { data: assignment } = await client
      .from("ncs_assignments")
      .select("id,class_id,ncs_assignment_items(id)")
      .eq("id", assignmentId)
      .maybeSingle();
    if (!assignment) throw new Error("Assignment not found.");

    const { data: membership } = await client
      .from("ncs_class_students")
      .select("id")
      .eq("class_id", assignment.class_id)
      .eq("student_id", student.id)
      .maybeSingle();
    if (!membership) throw new Error("Forbidden.");

    const { data: attempt, error } = await client
      .from("ncs_attempts")
      .upsert({ assignment_id: assignmentId, student_id: student.id }, { onConflict: "assignment_id,student_id" })
      .select("*")
      .single();
    if (error) throw error;

    const items = (assignment.ncs_assignment_items ?? []).map((item: { id: string }) => ({
      attempt_id: attempt.id,
      assignment_item_id: item.id,
    }));
    if (items.length) {
      await client.from("ncs_attempt_items").upsert(items, { onConflict: "attempt_id,assignment_item_id" });
    }

    const { data: attemptItems } = await client
      .from("ncs_attempt_items")
      .select("*")
      .eq("attempt_id", attempt.id);

    return NextResponse.json({ attempt, attemptItems: attemptItems ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to start attempt";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
