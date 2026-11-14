import { describe, expect, it, vi } from "vitest";
import type Anthropic from "@anthropic-ai/sdk";
import { ExtractionError, extractPlan, isSupportedFile, type MessagesClient } from "./extract";
import { RAW_PLAN, SAMPLE_TEXT } from "./test-fixtures";

function fakeClient(content: unknown[]): MessagesClient & { create: ReturnType<typeof vi.fn> } {
  const create = vi.fn().mockResolvedValue({ content } as Anthropic.Message);
  return { messages: { create }, create };
}

const toolUse = (input: unknown) => [{ type: "tool_use", id: "t1", name: "submit_plan", input }];

describe("extractPlan", () => {
  it("verifies quotes against the pasted text", async () => {
    const client = fakeClient(toolUse({ plan: RAW_PLAN }));
    const plan = await extractPlan({ kind: "text", text: SAMPLE_TEXT }, client, "test-model");
    expect(plan.medications.every((m) => m.verified)).toBe(true);
    const params = client.create.mock.calls[0][0];
    expect(params.model).toBe("test-model");
    expect(params.tool_choice).toEqual({ type: "tool", name: "submit_plan" });
  });

  it("verifies quotes against the transcription for a file", async () => {
    const client = fakeClient(toolUse({ document_text: SAMPLE_TEXT, plan: RAW_PLAN }));
    const plan = await extractPlan({ kind: "file", mediaType: "application/pdf", base64: "AAAA" }, client);
    expect(plan.appointments.every((a) => a.verified)).toBe(true);
    expect(client.create.mock.calls[0][0].messages[0].content[0].type).toBe("document");
  });

  it("flags items the document does not support", async () => {
    const invented = structuredClone(RAW_PLAN);
    invented.warning_signs[0].source_quote = "Call 911 for any headache";
    const plan = await extractPlan({ kind: "text", text: SAMPLE_TEXT }, fakeClient(toolUse({ plan: invented })));
    expect(plan.warning_signs[0].verified).toBe(false);
  });

  it("rejects documents that are not discharge instructions", async () => {
    const client = fakeClient(toolUse({ plan: { ...RAW_PLAN, is_discharge_document: false } }));
    await expect(extractPlan({ kind: "text", text: SAMPLE_TEXT }, client)).rejects.toMatchObject({
      code: "not_discharge_document",
    });
  });

  it("fails clearly when the model returns no tool call", async () => {
    const client = fakeClient([{ type: "text", text: "Sorry" }]);
    await expect(extractPlan({ kind: "text", text: SAMPLE_TEXT }, client)).rejects.toBeInstanceOf(ExtractionError);
  });

  it("fails clearly when the output has the wrong shape", async () => {
    const client = fakeClient(toolUse({ plan: { summary: "x" } }));
    await expect(extractPlan({ kind: "text", text: SAMPLE_TEXT }, client)).rejects.toMatchObject({
      code: "bad_model_output",
    });
  });

  it("does not call the model for an empty document", async () => {
    const client = fakeClient([]);
    await expect(extractPlan({ kind: "text", text: "  " }, client)).rejects.toMatchObject({ code: "empty_document" });
    expect(client.create).not.toHaveBeenCalled();
  });
});

describe("isSupportedFile", () => {
  it("accepts PDFs and common images only", () => {
    expect(isSupportedFile("application/pdf")).toBe(true);
    expect(isSupportedFile("image/png")).toBe(true);
    expect(isSupportedFile("text/html")).toBe(false);
  });
});
