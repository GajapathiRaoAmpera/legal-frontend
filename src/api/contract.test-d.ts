import { describe, expectTypeOf, it } from "vitest";
import type {
  ApprovalDecision,
  ClauseType,
  ContractStatus,
  PlaybookPosition,
  RedlineStatus,
  ReviewPackage,
  RiskAssessment,
  RiskLevel,
} from "./types";

describe("API contract enums (API_CONTRACT.md)", () => {
  it("matches the documented unions", () => {
    expectTypeOf<ClauseType>().toEqualTypeOf<
      | "liability"
      | "indemnity"
      | "termination"
      | "auto_renewal"
      | "payment"
      | "ip"
      | "confidentiality"
      | "data_protection"
      | "governing_law"
      | "other"
    >();
    expectTypeOf<RiskLevel>().toEqualTypeOf<"High" | "Medium" | "Low">();
    expectTypeOf<ContractStatus>().toEqualTypeOf<
      | "uploaded"
      | "parsing"
      | "analyzing"
      | "awaiting_lawyer"
      | "changes_requested"
      | "approved"
      | "rejected"
      | "failed"
    >();
    expectTypeOf<RedlineStatus>().toEqualTypeOf<"proposed" | "accepted" | "rejected" | "edited">();
    expectTypeOf<ApprovalDecision>().toEqualTypeOf<"approve" | "request_changes" | "reject">();
    expectTypeOf<PlaybookPosition>().toEqualTypeOf<"preferred" | "fallback" | "unacceptable">();
  });

  it("has the key field types", () => {
    expectTypeOf<RiskAssessment["span_start"]>().toEqualTypeOf<number>();
    expectTypeOf<ReviewPackage["approver_id"]>().toEqualTypeOf<string | null>();
  });
});
