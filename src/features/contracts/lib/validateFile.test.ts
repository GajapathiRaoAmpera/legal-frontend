import { describe, expect, it } from "vitest";
import { MAX_UPLOAD_BYTES, validateFile } from "./validateFile";

const f = (name: string, type: string, size = 10) =>
  new File([new Uint8Array(size)], name, { type });

describe("validateFile", () => {
  it("accepts docx and pdf", () => {
    expect(
      validateFile(
        f("a.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
      ),
    ).toBeNull();
    expect(validateFile(f("a.pdf", "application/pdf"))).toBeNull();
    expect(validateFile(f("a.pdf", ""))).toBeNull();
  });
  it("rejects other types, mismatched MIME, empty and oversize", () => {
    expect(validateFile(f("a.txt", "text/plain"))).toMatch(/Only/);
    expect(validateFile(f("a.pdf", "image/png"))).toMatch(/doesn't match/);
    expect(validateFile(f("a.pdf", "application/pdf", 0))).toMatch(/empty/);
    const big = f("a.pdf", "application/pdf", 1);
    Object.defineProperty(big, "size", { value: MAX_UPLOAD_BYTES + 1 });
    expect(validateFile(big)).toMatch(/25 MB/);
    expect(validateFile(null)).toMatch(/Choose/);
  });
});
