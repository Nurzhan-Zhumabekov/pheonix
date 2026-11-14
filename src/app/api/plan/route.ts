import { NextResponse } from "next/server";
import { ExtractionError, extractPlan, isSupportedFile, type DocumentInput } from "@/lib/extract";
import { allowRequest } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_FILE_BYTES = 4 * 1024 * 1024; // stays under common serverless body limits
const MAX_TEXT_CHARS = 60_000;

function clientKey(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

function fail(status: number, error: string, code?: string) {
  return NextResponse.json({ error, code }, { status });
}

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return fail(503, "The server is not configured: ANTHROPIC_API_KEY is missing.", "not_configured");
  }

  const limit = Number(process.env.RATE_LIMIT_PER_HOUR) || 20;
  if (!allowRequest(clientKey(req), limit)) {
    return fail(429, "Too many requests. Please try again later.", "rate_limited");
  }

  let input: DocumentInput;
  try {
    const form = await req.formData();
    const file = form.get("file");
    const text = form.get("text");

    if (file instanceof File && file.size > 0) {
      if (!isSupportedFile(file.type)) {
        return fail(400, "Upload a PDF or an image (JPG, PNG, WebP).", "unsupported_file");
      }
      if (file.size > MAX_FILE_BYTES) {
        return fail(413, "The file is larger than 4 MB. Try a smaller photo or fewer pages.", "file_too_large");
      }
      const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
      input = { kind: "file", mediaType: file.type, base64 };
    } else if (typeof text === "string" && text.trim()) {
      if (text.length > MAX_TEXT_CHARS) {
        return fail(413, "The text is too long.", "text_too_long");
      }
      input = { kind: "text", text };
    } else {
      return fail(400, "Paste the discharge instructions or upload a file.", "no_input");
    }
  } catch {
    return fail(400, "Could not read the request.", "bad_request");
  }

  try {
    const plan = await extractPlan(input);
    return NextResponse.json({ plan });
  } catch (err) {
    if (err instanceof ExtractionError) {
      const status = err.code === "bad_model_output" ? 502 : 422;
      return fail(status, err.message, err.code);
    }
    console.error("plan request failed", err instanceof Error ? err.message : err);
    return fail(502, "The document could not be processed right now. Please try again.", "upstream_error");
  }
}
