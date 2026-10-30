import { describe, expect, it } from "vitest";
import { parseContentDisposition, sanitizeFilename, slug } from "./download";

describe("parseContentDisposition", () => {
  it("prefers filename* over filename", () => {
    expect(
      parseContentDisposition(
        `attachment; filename="plain.docx"; filename*=UTF-8''Acme%20MSA%20%E2%80%93%20redlined.docx`,
        "x",
      ),
    ).toBe("Acme MSA – redlined.docx");
  });
  it("reads quoted and bare filename", () => {
    expect(parseContentDisposition(`attachment; filename="acme.docx"`, "x")).toBe("acme.docx");
    expect(parseContentDisposition(`attachment; filename=acme.pdf`, "x")).toBe("acme.pdf");
  });
  it("falls back and sanitizes", () => {
    expect(parseContentDisposition(null, "a/b:c.docx")).toBe("a_b_c.docx");
    expect(parseContentDisposition(`attachment; filename="../../etc/passwd"`, "x")).toBe(
      "__.._etc_passwd",
    );
  });
});

describe("sanitizeFilename / slug", () => {
  it("caps length at 120 and strips control chars", () => {
    expect(sanitizeFilename("a".repeat(200))).toHaveLength(120);
    expect(sanitizeFilename("a\u0001b")).toBe("a_b");
  });
  it("slugifies titles", () => expect(slug("Acme MSA (2026)")).toBe("acme-msa-2026"));
});
