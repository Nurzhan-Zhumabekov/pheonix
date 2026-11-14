import { describe, expect, it } from "vitest";
import { POST } from "./route";

const post = (body: unknown, raw = false) =>
  POST(
    new Request("http://localhost/api/example", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: raw ? (body as string) : JSON.stringify(body),
    }),
  );

describe("POST /api/example", () => {
  it("counts words and characters", async () => {
    const res = await post({ text: "  hello brave world  " });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ text: "hello brave world", characters: 17, words: 3 });
  });

  it("rejects empty input", async () => {
    expect((await post({ text: "   " })).status).toBe(400);
    expect((await post({})).status).toBe(400);
  });

  it("rejects text that is too long", async () => {
    expect((await post({ text: "a".repeat(501) })).status).toBe(413);
  });

  it("rejects a body that is not JSON", async () => {
    expect((await post("not json", true)).status).toBe(400);
  });
});
