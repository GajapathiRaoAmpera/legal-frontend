import { describe, expect, it } from "vitest";
import { errorMessage, toApiError } from "./errors";

describe("toApiError", () => {
  it("parses problem+json and Retry-After", () => {
    const res = new Response(null, { status: 429, headers: { "Retry-After": "12" } });
    const e = toApiError(
      { type: "rate", title: "Too Many Requests", status: 429, detail: "slow" },
      res,
    );
    expect(e).toMatchObject({ status: 429, title: "Too Many Requests", retryAfter: 12 });
    expect(errorMessage(e)).toBe("Too many requests. Try again in 12 s.");
  });

  it("handles FastAPI validation detail arrays and empty bodies", () => {
    const e = toApiError(
      { detail: [{ msg: "comment required", loc: ["body"] }] },
      new Response(null, { status: 422 }),
    );
    expect(e.detail).toBe("comment required");
    const e2 = toApiError("", new Response(null, { status: 500, statusText: "Server Error" }));
    expect(e2.title).toBe("Server Error");
  });
});
