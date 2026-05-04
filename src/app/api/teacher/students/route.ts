import { NextResponse } from "next/server";
import { z } from "zod";
import { hashPassword, requireRole } from "@/lib/auth";
import { db } from "@/lib/db";

const createStudentSchema = z.object({
  classId: z.string().uuid(),
  loginId: z.string().trim().min(1),
  displayName: z.string().trim().min(1),
  password: z.string().min(4),
});

export async function GET() {
  try {
    const teacher = await requireRole("teacher");
    const client = db();

    const { data: classes, error: classError } = await client
      .from("ncs_classes")
      .select("id,name")
      .eq("teacher_id", teacher.id);
    if (classError) throw classError;

    const classIds = (classes ?? []).map((item) => item.id);
    if (classIds.length === 0) return NextResponse.json({ students: [] });

    const { data: memberships, error } = await client
      .from("ncs_class_students")
      .select("class_id,student_id,initial_password,ncs_users(id,login_id,display_name)")
      .in("class_id", classIds);
    if (error) throw error;

    const studentIds = (memberships ?? []).map((item) => item.student_id);
    const { data: attempts } = studentIds.length
      ? await client.from("ncs_attempts").select("student_id,score,status").in("student_id", studentIds)
      : { data: [] };

    const students = (memberships ?? []).map((item) => {
      const user = Array.isArray(item.ncs_users) ? item.ncs_users[0] : item.ncs_users;
      const studentAttempts = (attempts ?? []).filter((attempt) => attempt.student_id === item.student_id);
      const completed = studentAttempts.filter((attempt) => attempt.status === "completed");
      const correct = completed.reduce((sum, attempt) => sum + Number(attempt.score ?? 0), 0);
      const total = completed.length * 5;
      return {
        id: item.student_id,
        classId: item.class_id,
        className: classes?.find((classRoom) => classRoom.id === item.class_id)?.name ?? "",
        loginId: user?.login_id ?? "",
        displayName: user?.display_name ?? "",
        initialPassword: item.initial_password ? "••••••" : undefined,
        attempts: completed.length,
        correct,
        accuracy: total ? Math.round((correct / total) * 100) : 0,
      };
    });

    return NextResponse.json({ students });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load students";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const teacher = await requireRole("teacher");
    const body = createStudentSchema.parse(await request.json());
    const client = db();

    const { data: classRoom, error: classError } = await client
      .from("ncs_classes")
      .select("id")
      .eq("id", body.classId)
      .eq("teacher_id", teacher.id)
      .maybeSingle();
    if (classError) throw classError;
    if (!classRoom) throw new Error("Class not found.");

    const { data: user, error: userError } = await client
      .from("ncs_users")
      .insert({
        login_id: body.loginId,
        display_name: body.displayName,
        password_hash: await hashPassword(body.password),
        role: "student",
      })
      .select("id,login_id,display_name,role")
      .single();
    if (userError) throw userError;

    const { error: membershipError } = await client.from("ncs_class_students").insert({
      class_id: body.classId,
      student_id: user.id,
      initial_password: body.password,
    });
    if (membershipError) throw membershipError;

    return NextResponse.json({ student: user, initialPassword: body.password });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create student";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
