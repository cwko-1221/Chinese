import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";

const schema = z.object({ attemptId: z.string().uuid() });

export async function POST(request: Request) {
  try {
    const student = await requireRole("student");
    const { attemptId } = schema.parse(await request.json());
    const client = db();

    const { data: attempt } = await client
      .from("ncs_attempts")
      .select("id,student_id")
      .eq("id", attemptId)
      .maybeSingle();
    if (!attempt || attempt.student_id !== student.id) throw new Error("Forbidden.");

    const { data: items } = await client.from("ncs_attempt_items").select("*").eq("attempt_id", attemptId);
    const score = (items ?? []).filter((item) => item.speech_correct && item.assessment_correct).length;

    const { data, error } = await client
      .from("ncs_attempts")
      .update({ status: "completed", score, completed_at: new Date().toISOString() })
      .eq("id", attemptId)
      .select("*")
      .single();
    if (error) throw error;
    return NextResponse.json({ attempt: data, score });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to complete attempt";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
