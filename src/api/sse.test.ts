import { describe, expect, it } from "vitest";
import { backoffDelay, parseSseEvent } from "./sse";

describe("parseSseEvent", () => {
  it("parses each event type", () => {
    expect(
      parseSseEvent(
        "progress",
        JSON.stringify({ stage: "assessing", node: "risk", done: 3, total: 9, message: "m" }),
      ),
    ).toEqual({
      type: "progress",
      data: { stage: "assessing", node: "risk", done: 3, total: 9, message: "m" },
    });
    expect(parseSseEvent("status", '{"status":"analyzing"}')).toEqual({
      type: "status",
      data: { status: "analyzing" },
    });
    expect(parseSseEvent("done", null)).toEqual({ type: "done" });
    expect(parseSseEvent("error", '{"message":"boom"}')).toEqual({
      type: "error",
      data: { message: "boom" },
    });
  });
  it("returns null on garbage", () => {
    expect(parseSseEvent("progress", "{not json")).toBeNull();
    expect(parseSseEvent("status", '{"status":"weird"}')).toBeNull();
    expect(parseSseEvent("progress", '{"stage":1}')).toBeNull();
    expect(parseSseEvent("nope", "{}")).toBeNull();
  });
});

describe("backoffDelay", () => {
  it("doubles, caps at 30s, and jitters ±20%", () => {
    expect(backoffDelay(0, () => 0.5)).toBe(1000);
    expect(backoffDelay(3, () => 0.5)).toBe(8000);
    expect(backoffDelay(10, () => 0.5)).toBe(30000);
    expect(backoffDelay(0, () => 0)).toBe(800);
    expect(backoffDelay(0, () => 1)).toBe(1200);
  });
});
