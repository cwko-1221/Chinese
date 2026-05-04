import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const form = await request.formData();
    const file = form.get("file");
    const assignmentId = String(form.get("assignmentId") ?? "");
    const itemId = String(form.get("itemId") ?? "");
    const phase = String(form.get("phase") ?? "practice");
    if (!(file instanceof File) || !assignmentId || !itemId) {
      throw new Error("File, assignmentId and itemId are required.");
    }

    const ext = file.type.includes("wav") ? "wav" : "webm";
    const path = `${user.id}/${assignmentId}/${itemId}/${phase}.${ext}`;
    const { error } = await db().storage.from("recordings").upload(path, file, {
      contentType: file.type || "audio/webm",
      upsert: true,
    });
    if (error) throw error;

    const { data } = db().storage.from("recordings").getPublicUrl(path);
    return NextResponse.json({ path, publicUrl: data.publicUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to upload recording";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
