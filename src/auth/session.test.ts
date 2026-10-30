import { afterEach, describe, expect, it } from "vitest";
import { session } from "./session";

const user = { id: "u1", name: "Rita Reviewer", roles: ["reviewer" as const] };
const jwt = (exp: number) => `h.${btoa(JSON.stringify({ exp })).replace(/=+$/, "")}.s`;

describe("session", () => {
  afterEach(() => session.clear());

  it("stores in memory + sessionStorage, never localStorage", () => {
    session.set({ access_token: jwt(Date.now() / 1000 + 3600), user });
    expect(session.getToken()).toMatch(/^h\./);
    expect(sessionStorage.getItem("auth.session")).toContain("Rita");
    expect(localStorage.length).toBe(0);
  });

  it("drops an expired token", () => {
    session.set({ access_token: jwt(Date.now() / 1000 - 10), user });
    expect(session.getToken()).toBeNull();
    expect(sessionStorage.getItem("auth.session")).toBeNull();
  });
});
