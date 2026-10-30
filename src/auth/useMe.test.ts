import { describe, expect, it } from "vitest";
import { can } from "./useMe";

describe("can (role gating)", () => {
  it("only lawyers approve; admin cannot", () => {
    expect(can(["lawyer", "reviewer"], "approve")).toBe(true);
    expect(can(["reviewer"], "approve")).toBe(false);
    expect(can(["admin", "reviewer"], "approve")).toBe(false);
  });
  it("reviewer+ decides redlines and uploads; admin edits playbook", () => {
    expect(can(["reviewer"], "decideRedline")).toBe(true);
    expect(can(["reviewer"], "upload")).toBe(true);
    expect(can(["reviewer"], "editPlaybook")).toBe(false);
    expect(can(["admin", "reviewer"], "editPlaybook")).toBe(true);
    expect(can(undefined, "upload")).toBe(false);
  });
});
