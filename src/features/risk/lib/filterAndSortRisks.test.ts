import { describe, expect, it } from "vitest";
import { makeDocument } from "@/test/fixtures";
import { filterAndSortRisks, type RiskFilters } from "./filterAndSortRisks";

const items = makeDocument().clauses;
const none: RiskFilters = { levels: [], types: [], needsHuman: false, q: "" };
const ids = (rows: ReturnType<typeof filterAndSortRisks>) => rows.map((r) => r.clause.heading);

describe("filterAndSortRisks", () => {
  it("default sort: level desc then score desc, not-assessed last", () => {
    const rows = filterAndSortRisks(items, none, "level", "desc");
    expect(rows.map((r) => r.level)).toEqual([
      "High",
      "High",
      "High",
      "High",
      "Medium",
      "Low",
      "Low",
      null,
    ]);
    expect(rows.slice(0, 4).map((r) => r.score)).toEqual([92, 88, 81, 79]);
  });

  it("nulls stay last when ascending", () => {
    const rows = filterAndSortRisks(items, none, "score", "asc");
    expect(rows.at(-1)?.level).toBeNull();
    expect(rows[0]?.score).toBe(10);
  });

  it("filters by level, type, needs-review and text, combined", () => {
    expect(filterAndSortRisks(items, { ...none, levels: ["High"] }, "order", "asc")).toHaveLength(
      4,
    );
    expect(filterAndSortRisks(items, { ...none, levels: ["none"] }, "order", "asc")).toHaveLength(
      1,
    );
    expect(
      ids(filterAndSortRisks(items, { ...none, types: ["liability", "ip"] }, "order", "asc")),
    ).toEqual(["8. Limitation of Liability", "9. Intellectual Property"]);
    expect(ids(filterAndSortRisks(items, { ...none, needsHuman: true }, "order", "asc"))).toEqual([
      "11. Data Protection",
    ]);
    expect(
      filterAndSortRisks(items, { ...none, levels: ["High"], q: "UNLIMITED" }, "order", "asc"),
    ).toHaveLength(1);
    expect(
      filterAndSortRisks(items, { ...none, levels: ["Low"], types: ["liability"] }, "order", "asc"),
    ).toHaveLength(0);
  });

  it("sorts by clause type and order", () => {
    const rows = filterAndSortRisks(items, none, "clause_type", "asc");
    expect(rows[0]?.clause.clause_type).toBe("auto_renewal");
    expect(filterAndSortRisks(items, none, "order", "desc")[0]?.clause.order).toBe(7);
  });
});
