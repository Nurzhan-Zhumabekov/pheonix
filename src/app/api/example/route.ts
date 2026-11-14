import { NextResponse } from "next/server";

/**
 * Example route handler: validate input, do the work on the server, return JSON.
 * Replace the body of POST with your product's core logic.
 */

export const runtime = "nodejs";

const MAX_CHARS = 500;

function fail(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail(400, "Send a JSON body.");
  }

  const text = typeof body === "object" && body !== null ? (body as { text?: unknown }).text : undefined;
  if (typeof text !== "string" || !text.trim()) {
    return fail(400, "Enter some text.");
  }
  if (text.length > MAX_CHARS) {
    return fail(413, `Keep it under ${MAX_CHARS} characters.`);
  }

  const clean = text.trim();
  return NextResponse.json({
    text: clean,
    characters: clean.length,
    words: clean.split(/\s+/).length,
  });
}
