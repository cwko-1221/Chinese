import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { isGoogleConfigured, synthesizeCantonese } from "@/lib/google";

const schema = z.object({ text: z.string().trim().min(1) });

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!isGoogleConfigured()) {
      return NextResponse.json({ error: "NOT_CONFIGURED" }, { status: 501 });
    }

    const { text } = schema.parse(await request.json());
    const audio = await synthesizeCantonese(text);
    return new NextResponse(audio, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to synthesize speech";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
