import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";

const schema = z.object({
  attemptItemId: z.string().uuid(),
  patch: z.object({
    handwriting_correct: z.boolean().optional(),
    speech_transcript: z.string().optional(),
    speech_correct: z.boolean().optional(),
    speech_recording_url: z.string().nullable().optional(),
    assessment_transcript: z.string().optional(),
    assessment_correct: z.boolean().optional(),
    assessment_recording_url: z.string().nullable().optional(),
  }),
});

export async function POST(request: Request) {
  try {
    const student = await requireRole("student");
    const body = schema.parse(await request.json());
    const client = db();
    const { data: existing } = await client
      .from("ncs_attempt_items")
      .select("id,ncs_attempts(student_id)")
      .eq("id", body.attemptItemId)
      .maybeSingle();

    const attempt = Array.isArray(existing?.ncs_attempts) ? existing?.ncs_attempts[0] : existing?.ncs_attempts;
    if (!existing || attempt?.student_id !== student.id) throw new Error("Forbidden.");

    const { data, error } = await client
      .from("ncs_attempt_items")
      .update(body.patch)
      .eq("id", body.attemptItemId)
      .select("*")
      .single();
    if (error) throw error;
    return NextResponse.json({ attemptItem: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update attempt";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
