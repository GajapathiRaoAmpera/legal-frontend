import { describe, expect, it } from "vitest";
import { makePackage } from "@/test/fixtures";
import { exportGate } from "./exportGate";

describe("exportGate", () => {
  it("allows export only when approved with an approver", () => {
    expect(exportGate(makePackage({ status: "approved", approver_id: "user-larry" }))).toEqual({
      allowed: true,
    });
    expect(exportGate(makePackage({ status: "approved", approver_id: null }))).toEqual({
      allowed: false,
      reason: "no_approver",
    });
    for (const status of ["draft", "ready_for_lawyer", "changes_requested", "rejected"] as const)
      expect(exportGate(makePackage({ status, approver_id: "user-larry" }))).toEqual({
        allowed: false,
        reason: "not_approved",
      });
    expect(exportGate(undefined)).toEqual({ allowed: false, reason: "loading" });
  });
});
