import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { isGoogleConfigured, transcribeCantonese } from "@/lib/google";

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!isGoogleConfigured()) {
      return NextResponse.json({ error: "NOT_CONFIGURED" }, { status: 501 });
    }

    const form = await request.formData();
    const file = form.get("audio");
    const expectedText = String(form.get("expectedText") ?? "");
    if (!(file instanceof File) || !expectedText) {
      throw new Error("Audio and expectedText are required.");
    }

    const audio = Buffer.from(await file.arrayBuffer());
    const result = await transcribeCantonese(audio, expectedText);
    return NextResponse.json(result);
  } catch (error) {
    console.error("STT ERROR CAUGHT:", error);
    const message = error instanceof Error ? error.message : "Unable to transcribe speech";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
